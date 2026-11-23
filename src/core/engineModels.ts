/**
 * `md-models`: THE ENGINES AND THEIR MODELS, AS AN AGENT CAN LOOK THEM UP (hire-defaults-058, the founder's hire
 * test, 9 Nov 2026: agents should know which providers and models exist, and which are installed and signed in
 * here, above all when writing a hire request).
 *
 * The broker answers it at `GET /models` (main/integrationBroker.ts) and `md-models` prints it
 * (shared/mdLimitsScript.ts). Each engine is a row: its name, its id (the "provider" of a hire or spawn request),
 * whether its command is installed here, whether it is signed in here, and its models (the "model" of a request),
 * from the catalog the pickers read: this build's, with the remote copy merged over it where there is one.
 *
 * Signed in is what the host can tell without a guess and without a key: this computer runs the engine's own
 * status command (main/cliReadiness.ts, three engines have one). Anything else is "not known", never "signed out". No key, token or account is read
 * into the answer. A status command is run at most once in `SIGN_IN_KEEP_MS` per engine.
 */
import { AGENT_PROVIDER_PRESETS, type AgentProvider } from '../shared/agentProvider';
import { ENGINE_NAME } from '../shared/engine';
import bakedCatalog from '../shared/modelCatalog.json';
import { mergeCatalogModels, offeredAtVersion, type CatalogModel, type ModelCatalog } from '../shared/modelCatalogPayload';

export type EngineSignIn = 'signed-in' | 'signed-out' | 'unknown';

export interface EngineModel {
  /** The id a request names as "model"; null for the engine's own default (leave "model" out). */
  id: string | null;
  label: string;
}

export interface EngineModelsRow {
  /** The id a request names as "provider". */
  provider: AgentProvider;
  name: string;
  /** The command a start of this engine runs here. */
  command: string;
  installed: boolean;
  signedIn: EngineSignIn;
  models: EngineModel[];
}

export interface EngineModelsAnswer {
  engines: EngineModelsRow[];
  where: string;
  readAt: number;
  text: string;
}

/** How long a status command's answer is kept before it is asked again. */
export const SIGN_IN_KEEP_MS = 5 * 60_000;

/** The catalog's providers: this build's lists, with a remote copy merged over each, per model (as the pickers do). */
export function catalogProvidersWith(remote: ModelCatalog | null): Record<string, CatalogModel[]> {
  const baked = (bakedCatalog as ModelCatalog).providers;
  const out: Record<string, CatalogModel[]> = { ...baked };
  if (remote) for (const [name, list] of Object.entries(remote.providers)) out[name] = mergeCatalogModels(baked[name] ?? [], list);
  return out;
}

/** The models of one engine offered on this build, the default row (no id) first when there is one. */
export function modelsOf(provider: AgentProvider, providers: Record<string, CatalogModel[]>, appVersion: string): EngineModel[] {
  const list = (providers[provider] ?? []).filter((m) => offeredAtVersion(m, appVersion)).map((m) => ({ id: m.id ?? null, label: m.label }));
  return [...list.filter((m) => m.id === null), ...list.filter((m) => m.id !== null)];
}

const ORDER: Record<string, number> = { ready: 0, unknown: 1, out: 2, missing: 3 };
const standing = (r: EngineModelsRow): string => (!r.installed ? 'missing' : r.signedIn === 'signed-in' ? 'ready' : r.signedIn === 'signed-out' ? 'out' : 'unknown');

const modelWords = (r: EngineModelsRow): string => r.models.length === 0
  ? 'no models listed: leave "model" out'
  : r.models.map((m) => (m.id === null ? `default (leave "model" out)` : `${m.id} (${m.label})`)).join(', ');

/** The words `md-models` prints: the engines that can run here first, each with its models, then the rest by name. */
export function engineModelsText(rows: EngineModelsRow[], where: string, readAt: number): string {
  const at = new Date(readAt).toISOString().slice(11, 16);
  const sorted = [...rows].sort((a, b) => ORDER[standing(a)] - ORDER[standing(b)]);
  const head: Record<string, string> = {
    ready: 'Installed and signed in:',
    unknown: 'Installed, sign in not known (the engine has no status this app can read):',
    out: 'Installed, signed out (the human signs it in before an agent can start on it):'
  };
  const out: string[] = [`Engines and models on ${where}, read ${at} UTC.`];
  for (const k of ['ready', 'unknown', 'out']) {
    const group = sorted.filter((r) => standing(r) === k);
    if (!group.length) continue;
    out.push('', head[k]);
    for (const r of group) out.push(`- ${r.name}, "provider": "${r.provider}". Models: ${modelWords(r)}.`);
  }
  const missing = sorted.filter((r) => standing(r) === 'missing');
  if (missing.length) out.push('', `Not installed here: ${missing.map((r) => `${r.name} ("${r.provider}")`).join(', ')}.`);
  out.push('',
    'In a hire request or a temp\'s spawn request, "provider" is the id in quotes and "model" one of its model ids;'
    + ' leave "model" out for the engine\'s default. Pick an engine that is installed and signed in.'
    + ' `md-models --json` gives every engine with its models as JSON.');
  return out.join('\n');
}

export interface EngineModelsDeps {
  /** Where the engines are, in words: "this computer". */
  where: string;
  /** This build's version, for the catalog's version bounds ('' keeps every model). */
  appVersion: string;
  /** The remote catalog this host keeps, or null; absent: this build's catalog only. */
  remote?: () => Promise<ModelCatalog | null>;
  /** The command a start of this engine runs here. */
  command(provider: AgentProvider): string;
  /** Is this program on the PATH an agent starts with? */
  installed(program: string): boolean;
  /** Is this engine signed in here? Asked only for an installed engine. */
  signedIn(provider: AgentProvider, program: string): Promise<EngineSignIn>;
  now?(): number;
}

export function createEngineModels(d: EngineModelsDeps): { read(): Promise<EngineModelsAnswer> } {
  const now = d.now ?? Date.now;
  const kept = new Map<AgentProvider, { at: number; state: Promise<EngineSignIn> }>();
  const signIn = (provider: AgentProvider, program: string): Promise<EngineSignIn> => {
    const k = kept.get(provider);
    if (k && now() - k.at < SIGN_IN_KEEP_MS) return k.state;
    const state = d.signedIn(provider, program).catch((): EngineSignIn => 'unknown');
    kept.set(provider, { at: now(), state });
    return state;
  };
  return {
    async read() {
      let remote: ModelCatalog | null = null;
      try { remote = d.remote ? await d.remote() : null; } catch { remote = null; }
      const providers = catalogProvidersWith(remote);
      const rows = await Promise.all(AGENT_PROVIDER_PRESETS.filter((p) => p.id !== 'custom').map(async (p): Promise<EngineModelsRow> => {
        const command = d.command(p.id).trim() || p.defaultCommand;
        const program = command.split(/\s+/)[0] ?? '';
        let installed = false;
        try { installed = program !== '' && d.installed(program); } catch { installed = false; }
        const signedIn = installed ? await signIn(p.id, program) : 'unknown';
        return { provider: p.id, name: ENGINE_NAME[p.id], command, installed, signedIn, models: modelsOf(p.id, providers, d.appVersion) };
      }));
      const readAt = now();
      return { engines: rows, where: d.where, readAt, text: engineModelsText(rows, d.where, readAt) };
    }
  };
}
