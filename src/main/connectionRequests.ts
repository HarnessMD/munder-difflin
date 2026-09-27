/**
 * AGENTS SET UP CONNECTIONS THEMSELVES (0.5.3 batch 3 #6, founder 25 Sep
 * 2026: "agents must be able to add and edit these webhooks (and the other
 * connection settings) on their own").
 *
 * An agent writes one JSON request into its own folder,
 *   <hive>/agents/<its id>/connections/requests/<name>.json
 * and main applies it on its next pass through the same sanitiser Settings
 * uses. The outcome lands in
 *   <hive>/agents/<its id>/connections/results/<request id>.json
 * and the current picture, with no secret and no token in it, in
 *   <hive>/connections/state.json
 * next to a README that says all of this to the agents.
 *
 * The rules (Kevin, 25 Sep):
 *   - every request is checked against a strict shape: an unknown op or field
 *     is an error result and nothing is applied;
 *   - a result holding a secret is written 0600, and every result is removed
 *     after 24 hours; state.json never holds a secret or a Slack token;
 *   - the requesting agent's id (the folder the request was found in, never a
 *     field the request claims) is in the log line and the result;
 *   - a hostile request (a bad id, a symlink, an oversized file, bad JSON) is
 *     refused, answered with an error, and the file is removed.
 * The request file is always removed once read, because it may hold a token.
 */
import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isWebhookAuth, isWebhookSource, type TriggerMode, type WebhookTrigger } from '../shared/triggers';
import { SLACK_MODES } from '../shared/slackMode';

export const REQUEST_MAX_BYTES = 16 * 1024;
export const RESULT_TTL_MS = 24 * 60 * 60 * 1000;
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;
const AGENT_ID = /^[A-Za-z0-9._-]{1,80}$/;

export const OPS = ['webhook.add', 'webhook.edit', 'webhook.remove', 'webhook.rotateSecret', 'slack.set', 'defaults.set'] as const;
export type ConnOp = (typeof OPS)[number];

/** The webhook fields an agent may set, and each one's type check. */
const WEBHOOK_FIELDS: Record<string, (v: unknown) => boolean> = {
  name: (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 120,
  description: (v) => typeof v === 'string' && v.length <= 200,
  source: isWebhookSource,
  auth: isWebhookAuth,
  to: (v) => typeof v === 'string' && (v === '' || AGENT_ID.test(v)),
  prompt: (v) => typeof v === 'string' && v.length <= 2000,
  schema: (v) => { if (typeof v !== 'string' || v.length > 8000) return false; try { JSON.parse(v); return true; } catch { return false; } },
  mode: (v) => v === 'strict' || v === 'allow-all' || v === 'communication-only',
  guardrails: (v) => typeof v === 'boolean',
  enabled: (v) => typeof v === 'boolean'
};

/** The Slack fields an agent may set. Tokens are write only. */
const SLACK_FIELDS: Record<string, (v: unknown) => boolean> = {
  enabled: (v) => typeof v === 'boolean',
  mode: (v) => typeof v === 'string' && (SLACK_MODES as readonly string[]).includes(v),
  botToken: (v) => typeof v === 'string' && v.length <= 300,
  appToken: (v) => typeof v === 'string' && v.length <= 300,
  signingSecret: (v) => typeof v === 'string' && v.length <= 300,
  channelId: (v) => typeof v === 'string' && v.length <= 40,
  proactivePosting: (v) => typeof v === 'boolean',
  pollSeconds: (v) => typeof v === 'number' && Number.isFinite(v),
  catchupSeconds: (v) => typeof v === 'number' && Number.isFinite(v)
};

const DEFAULT_FIELDS: Record<string, (v: unknown) => boolean> = {
  webhookResponder: (v) => typeof v === 'string' && (v === '' || AGENT_ID.test(v)),
  responder: (v) => typeof v === 'string' && (v === '' || AGENT_ID.test(v))
};

/** Which top level keys each op takes, beside `id` and `op`. */
const OP_KEYS: Record<ConnOp, { required: string[]; optional: string[] }> = {
  'webhook.add': { required: ['webhook'], optional: [] },
  'webhook.edit': { required: ['webhookId', 'webhook'], optional: [] },
  'webhook.remove': { required: ['webhookId'], optional: [] },
  'webhook.rotateSecret': { required: ['webhookId'], optional: [] },
  'slack.set': { required: ['slack'], optional: [] },
  'defaults.set': { required: ['defaults'], optional: [] }
};

export type ConnRequest =
  | { id: string; op: 'webhook.add'; webhook: Record<string, unknown> }
  | { id: string; op: 'webhook.edit'; webhookId: string; webhook: Record<string, unknown> }
  | { id: string; op: 'webhook.remove' | 'webhook.rotateSecret'; webhookId: string }
  | { id: string; op: 'slack.set'; slack: Record<string, unknown> }
  | { id: string; op: 'defaults.set'; defaults: Record<string, unknown> };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function checkFields(o: unknown, allowed: Record<string, (v: unknown) => boolean>, what: string): string | null {
  if (!isObj(o)) return `${what} must be an object`;
  const keys = Object.keys(o);
  if (keys.length === 0) return `${what} is empty`;
  for (const k of keys) {
    if (!(k in allowed)) return `unknown field ${what}.${k}`;
    if (!allowed[k](o[k])) return `bad value for ${what}.${k}`;
  }
  return null;
}

/** Check one parsed request against the strict shape. */
export function validateRequest(raw: unknown): { ok: true; req: ConnRequest } | { ok: false; error: string } {
  if (!isObj(raw)) return { ok: false, error: 'the request must be a JSON object' };
  if (typeof raw.id !== 'string' || !SAFE_ID.test(raw.id)) return { ok: false, error: 'id must match ^[A-Za-z0-9._-]{1,64}$' };
  if (typeof raw.op !== 'string' || !(OPS as readonly string[]).includes(raw.op)) return { ok: false, error: `unknown op; one of ${OPS.join(', ')}` };
  const op = raw.op as ConnOp;
  const spec = OP_KEYS[op];
  for (const k of Object.keys(raw)) {
    if (k === 'id' || k === 'op') continue;
    if (!spec.required.includes(k) && !spec.optional.includes(k)) return { ok: false, error: `unknown field ${k} for ${op}` };
  }
  for (const k of spec.required) if (!(k in raw)) return { ok: false, error: `${op} needs ${k}` };
  if ('webhookId' in raw && (typeof raw.webhookId !== 'string' || !SAFE_ID.test(raw.webhookId))) return { ok: false, error: 'bad webhookId' };
  let err: string | null = null;
  if (op === 'webhook.add') {
    err = checkFields(raw.webhook, WEBHOOK_FIELDS, 'webhook');
    if (!err && !('name' in (raw.webhook as object))) err = 'webhook.add needs webhook.name';
  }
  if (op === 'webhook.edit') err = checkFields(raw.webhook, { ...WEBHOOK_FIELDS, secret: (v) => typeof v === 'string' && /^\S{16,256}$/.test(v) }, 'webhook');
  if (op === 'slack.set') err = checkFields(raw.slack, SLACK_FIELDS, 'slack');
  if (op === 'defaults.set') err = checkFields(raw.defaults, DEFAULT_FIELDS, 'defaults');
  if (err) return { ok: false, error: err };
  return { ok: true, req: raw as unknown as ConnRequest };
}

export interface ConnResult {
  id: string;
  op: string;
  from: string;
  at: string;
  ok: boolean;
  error?: string;
  webhookId?: string;
  /** The public address, once the webhook server has one ('' before). */
  url?: string;
  /** Only on add and rotateSecret, and then the file is 0600. */
  secret?: string;
  /** What the caller of a blank webhook sends, for the agent to pass on. */
  sends?: string;
}

/** What main does for a request. Injected so a test drives it without Electron. */
export interface ConnDeps {
  hiveRoot: () => string | null;
  listWebhooks: () => WebhookTrigger[];
  /** Sanitise, store and re-point the server (the webhooks:save path). */
  saveWebhooks: (list: WebhookTrigger[]) => WebhookTrigger[];
  mintSecret: () => string;
  newWebhookId: () => string;
  endpointUrl: (id: string) => string;
  applySlack: (patch: Record<string, unknown>) => void;
  setDefaults: (patch: { webhookResponder?: string; responder?: string }) => void;
  /** The state.json body (already free of secrets). */
  snapshot: () => Record<string, unknown>;
  log: (event: Record<string, unknown>) => void;
  now: () => number;
  /** Something was applied: tell the open windows. */
  onChanged?: () => void;
}

export function authExample(auth: WebhookTrigger['auth']): string {
  if (auth === 'bearer') return 'Authorization: Bearer <secret>';
  if (auth === 'hmac') return 'x-md-signature: sha256=<hex HMAC-SHA256 of the body, keyed with the secret>';
  return 'x-md-webhook-secret: <secret>';
}

/** Apply one valid request. Throws with a short reason when it cannot. */
export function applyRequest(req: ConnRequest, deps: ConnDeps): Omit<ConnResult, 'id' | 'op' | 'from' | 'at' | 'ok'> {
  const list = deps.listWebhooks();
  const find = (id: string): WebhookTrigger => {
    const w = list.find((x) => x.id === id);
    if (!w) throw new Error(`no webhook ${id}`);
    return w;
  };
  switch (req.op) {
    case 'webhook.add': {
      const w: WebhookTrigger = {
        id: deps.newWebhookId(),
        name: '',
        secret: deps.mintSecret(),
        enabled: true,
        mode: 'strict',
        schema: '',
        createdAt: deps.now(),
        guardrails: true
      };
      Object.assign(w, req.webhook);
      w.name = w.name.trim();
      const saved = deps.saveWebhooks([...list, w]).find((x) => x.id === w.id);
      if (!saved) throw new Error('the webhook was not stored');
      return { webhookId: saved.id, url: deps.endpointUrl(saved.id), secret: saved.secret, ...(saved.source ? {} : { sends: authExample(saved.auth) }) };
    }
    case 'webhook.edit': {
      const prior = find(req.webhookId);
      // Linear makes its own signing secret: the one field an agent may set.
      if ('secret' in req.webhook && prior.source !== 'linear') throw new Error('only a Linear webhook takes a secret; use webhook.rotateSecret');
      // '' for `to` is the default agent; the sanitiser keeps a stored value
      // when the field is absent, so it is passed through as given.
      const next = { ...prior, ...req.webhook, id: prior.id } as WebhookTrigger;
      if (!('secret' in req.webhook)) next.secret = prior.secret;
      const saved = deps.saveWebhooks(list.map((x) => (x.id === prior.id ? next : x))).find((x) => x.id === prior.id);
      if (!saved) throw new Error('the webhook was not stored');
      return { webhookId: saved.id, url: deps.endpointUrl(saved.id) };
    }
    case 'webhook.remove': {
      find(req.webhookId);
      deps.saveWebhooks(list.filter((x) => x.id !== req.webhookId));
      return { webhookId: req.webhookId };
    }
    case 'webhook.rotateSecret': {
      const prior = find(req.webhookId);
      if (prior.source === 'linear') throw new Error('Linear makes its own signing secret; set it in Settings');
      const secret = deps.mintSecret();
      deps.saveWebhooks(list.map((x) => (x.id === prior.id ? { ...x, secret } : x)));
      return { webhookId: prior.id, url: deps.endpointUrl(prior.id), secret };
    }
    case 'slack.set':
      deps.applySlack(req.slack);
      return {};
    case 'defaults.set':
      deps.setDefaults(req.defaults as { webhookResponder?: string; responder?: string });
      return {};
  }
}

function writeResult(dir: string, r: ConnResult): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, `${r.id}.json`);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(r, null, 2) + '\n', { mode: r.secret ? 0o600 : 0o644 });
  if (r.secret) chmodSync(tmp, 0o600);
  renameSync(tmp, file);
}

/** Drop results older than the TTL. */
function sweepResults(dir: string, now: number): void {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    try { if (now - statSync(p).mtimeMs > RESULT_TTL_MS) unlinkSync(p); } catch { /* gone */ }
  }
}

const README = `# Connections: set them up yourself

Munder Difflin applies connection requests that an agent writes into its OWN folder:

    $AGENT_DIR/connections/requests/<anything>.json

One request per file, at most 16 KB. The app reads it within a few seconds,
removes it (it may hold a token), and writes the outcome to

    $AGENT_DIR/connections/results/<request id>.json

Results are removed after 24 hours. A result that holds a secret is readable by
you only. Never copy a secret into a message, a card or a log.

The current picture, with no secret or token in it, is in
connections/state.json next to this file.

Every request has "id" (letters, digits, dot, dash, underscore; up to 64) and
"op". Any other field, or an unknown op, is refused and nothing is applied.

  {"id":"r1","op":"webhook.add","webhook":{"name":"Support desk","to":"<agent id>","prompt":"Draft a reply.","auth":"bearer"}}
      webhook fields: name (required), description, source (custom|github|linear|telegram),
      auth (header|bearer|hmac, blank webhooks only), to (agent id, "" = default agent),
      prompt, schema (JSON Schema as a string), mode (strict|allow-all|communication-only),
      guardrails (bool), enabled (bool, default true)
      result: webhookId, url (empty until the server has a public address), secret, sends
  {"id":"r2","op":"webhook.edit","webhookId":"wh-...","webhook":{"to":"<agent id>"}}
      the same fields, plus secret for a Linear webhook (the signing secret Linear shows)
  {"id":"r3","op":"webhook.remove","webhookId":"wh-..."}
  {"id":"r4","op":"webhook.rotateSecret","webhookId":"wh-..."}
  {"id":"r5","op":"slack.set","slack":{"enabled":true,"botToken":"xoxb-...","appToken":"xapp-...","channelId":"C0123"}}
      slack fields: enabled, mode (socket|polling|webhook), botToken, appToken,
      signingSecret, channelId, proactivePosting, pollSeconds, catchupSeconds
  {"id":"r6","op":"defaults.set","defaults":{"webhookResponder":"<agent id>","responder":"<agent id>"}}
      webhookResponder: who takes a webhook that names no agent; responder: who answers Slack

Everything you do here is logged with your agent id, and shows in Settings >
Connections and in Automations.
`;

function writeIfChanged(file: string, body: string): void {
  try { if (existsSync(file) && readFileSync(file, 'utf8') === body) return; } catch { /* rewrite */ }
  mkdirSync(join(file, '..'), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, body);
  renameSync(tmp, file);
}

/** Write connections/README.md and state.json. Safe to call often. */
export function publishConnectionState(deps: ConnDeps): void {
  const root = deps.hiveRoot();
  if (!root) return;
  const dir = join(root, 'connections');
  writeIfChanged(join(dir, 'README.md'), README);
  writeIfChanged(join(dir, 'state.json'), JSON.stringify(deps.snapshot(), null, 2) + '\n');
}

/** One pass over every agent's requests folder. Returns how many it handled. */
export function processConnectionRequests(deps: ConnDeps): number {
  const root = deps.hiveRoot();
  if (!root) return 0;
  const agentsDir = join(root, 'agents');
  if (!existsSync(agentsDir)) return 0;
  let handled = 0;
  let changed = false;
  for (const from of readdirSync(agentsDir)) {
    if (!AGENT_ID.test(from)) continue;
    const base = join(agentsDir, from, 'connections');
    const reqDir = join(base, 'requests');
    const resDir = join(base, 'results');
    sweepResults(resDir, deps.now());
    if (!existsSync(reqDir)) continue;
    for (const f of readdirSync(reqDir)) {
      if (!f.endsWith('.json')) continue;
      const p = join(reqDir, f);
      const stem = f.slice(0, -5);
      const fallbackId = SAFE_ID.test(stem) ? stem : `bad-${deps.now()}`;
      const at = new Date(deps.now()).toISOString();
      let result: ConnResult;
      // What the request says about itself, once it is known to be a small
      // plain file that parses; a refusal before that names the file only.
      let claimed: { id?: unknown; op?: unknown } = {};
      try {
        const st = lstatSync(p);
        if (!st.isFile()) throw new Error('not a plain file');
        if (st.size > REQUEST_MAX_BYTES) throw new Error(`larger than ${REQUEST_MAX_BYTES} bytes`);
        let parsed: unknown;
        try { parsed = JSON.parse(readFileSync(p, 'utf8')); } catch { throw new Error('not valid JSON'); }
        if (isObj(parsed)) claimed = parsed;
        const v = validateRequest(parsed);
        if (!v.ok) throw new Error(v.error);
        const out = applyRequest(v.req, deps);
        result = { id: v.req.id, op: v.req.op, from, at, ok: true, ...out };
        changed = true;
      } catch (e) {
        const id = typeof claimed.id === 'string' && SAFE_ID.test(claimed.id) ? claimed.id : fallbackId;
        const op = typeof claimed.op === 'string' && (OPS as readonly string[]).includes(claimed.op) ? claimed.op : '';
        result = { id, op, from, at, ok: false, error: e instanceof Error ? e.message : String(e) };
      }
      try { unlinkSync(p); } catch { /* already gone */ }
      try { writeResult(resDir, result); } catch { /* the log still says it */ }
      deps.log({ kind: 'connections', from, request: result.id, op: result.op, ok: result.ok, ...(result.error ? { error: result.error } : {}), ...(result.webhookId ? { webhookId: result.webhookId } : {}) });
      handled++;
    }
  }
  if (changed) deps.onChanged?.();
  publishConnectionState(deps);
  return handled;
}
