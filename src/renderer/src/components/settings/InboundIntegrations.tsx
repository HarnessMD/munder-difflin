/**
 * SETTINGS > CONNECTIONS > INBOUND INTEGRATIONS (0.5.3 batch 3, founder 25 Sep
 * 2026: remove the Integrations section, rename Custom webhook to "Inbound
 * integrations" ("get a public, authenticated webhook that tools on the
 * internet can hit"), move the samples in there, and add an "Add new inbound
 * webhook" button with a form for the webhook type, the request it accepts,
 * the authentication, the agent and the prompt).
 *
 * Every row here is a webhook endpoint (WebhookTrigger), the same list the
 * Automations screen shows, so an endpoint made on either screen is the same
 * thing. GitHub, Linear and Telegram carry a `source`, which makes main check
 * that service's own signature and read its own payload
 * (main/serviceWebhooks.ts); a blank one carries `auth` (header, bearer or a
 * signed body); `to` is the agent that takes the message.
 *
 * Edits wait for the page's one Save. The list is not a plain config field
 * (main sanitises it and re-points the live server), so the edited copy is
 * held in `pending` below, outside React so it outlives a tab switch, and the
 * draft task 'webhooks:save' writes it. The task goes with Close without
 * saving (the draft's reset), and the held copy is then dropped too. Save also
 * points a Telegram bot at its endpoint when a bot token was typed; the token
 * is used for that one call and never stored.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { HarnessConfig } from '@/store/config';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { TRIGGER_MODES, WEBHOOK_AUTHS, WEBHOOK_SOURCES, type TriggerMode, type WebhookAuth, type WebhookSource, type WebhookTrigger } from '@shared/triggers';
import { authHeaderExample, blankInboundForm, inboundFormProblem, rowAddressState, webhookFromForm, type InboundWebhookForm, type RowAddressState } from '@shared/inboundWebhook';
import { Btn, Chip, CloseX, Sheet, Switch, inputStyle, textareaStyle } from '../pro/ui';
import { settingsChrome } from '../pro/settings/chrome';
import { BoundPortNote } from '../BoundPortNote';
import { generateWebhookSecret, listWebhooks, newWebhook, saveWebhooks, webhooksStatus, type WebhooksStatus } from '../triggers/api';
import { JsonEditor } from '../triggers/JsonEditor';
import { useOptionalPaneNav } from '../professional/paneNav';
import { CollapsibleSection, useSettingsChrome, useSettingsDraft } from './SettingsFrame';
import { AgentPicker, Disclosure, FieldRow, monoInput } from './primitives';

const sourceOf = (w: WebhookTrigger): WebhookSource => w.source ?? 'custom';

export const WEBHOOKS_TASK = 'webhooks:save';

/** The edited list and typed Telegram tokens, until Save or Close. `stale`:
 *  an agent changed the list while this copy was being edited (batch 3,
 *  webhooks:changed), so Save must not write the copy over it. */
const pending: { hooks: WebhookTrigger[] | null; tokens: Record<string, string>; stale: boolean; removed: string[] } = { hooks: null, tokens: {}, stale: false, removed: [] };

export function InboundIntegrationsCard({ config, godName }: { config: HarnessConfig; godName: string }) {
  const { t } = useTranslation();
  const draft = useSettingsDraft();
  const { card, codeBox } = settingsChrome(useSettingsChrome());
  const agents = useStore((s) => s.agents);
  const stored = useStore((s) => s.webhookTriggers);
  const setStored = useStore((s) => s.setWebhookTriggers);
  const nav = useOptionalPaneNav();
  const [, bump] = useState(0);
  const [status, setStatus] = useState<WebhooksStatus | null>(null);
  const [form, setForm] = useState<InboundWebhookForm | null>(null);

  // Close without saving dropped the task: drop what it would have written.
  if ((pending.hooks || Object.keys(pending.tokens).length) && draft && !draft.hasTask(WEBHOOKS_TASK)) {
    pending.hooks = null; pending.tokens = {}; pending.stale = false; pending.removed = [];
  }
  const hooks = pending.hooks ?? stored;
  const telegramTokens = pending.tokens;

  // The list as main has it now (another window, the Automations screen, an agent).
  useEffect(() => {
    const load = () => { void listWebhooks().then((list) => { if (list) setStored(list); }); };
    load();
    return window.cth.onWebhooksChanged?.(() => {
      if (pending.hooks) { pending.stale = true; bump((v) => v + 1); }
      load();
    });
  }, [setStored]);
  useEffect(() => {
    let alive = true;
    const tick = () => { void webhooksStatus().then((s) => { if (alive) setStatus(s); }); };
    tick();
    // Every 2 s, so "Creating address" turns into the address soon after it exists.
    const id = window.setInterval(tick, 2000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  const save = async (): Promise<void> => {
    if (pending.hooks && pending.stale) throw new Error(t('settings.conn.inbound.changedByAgent'));
    if (pending.hooks) {
      // A row marked Delete is left out: the same write as the agents'
      // webhook.remove (storeWebhooks in main), so the server stops serving it.
      const removed = new Set(pending.removed);
      const saved = await saveWebhooks(pending.hooks.filter((w) => !removed.has(w.id)));
      if (!saved) throw new Error(t('settings.integ.saveFailed'));
      useStore.getState().setWebhookTriggers(saved);
      pending.hooks = null; pending.removed = [];
    }
    // Telegram: point the bot at its endpoint once the public address exists.
    const errors: string[] = [];
    for (const [id, token] of Object.entries(pending.tokens)) {
      if (!token.trim()) { delete pending.tokens[id]; continue; }
      let r = await window.cth.telegramSetWebhook(id, token);
      for (let i = 0; i < 5 && !r.ok && r.error === 'no-public-url'; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        r = await window.cth.telegramSetWebhook(id, token);
      }
      if (r.ok) delete pending.tokens[id];
      else errors.push(t('settings.integ.telegram.registerFailed', { error: r.error ?? '?' }));
    }
    if (errors.length) throw new Error(errors.join(' '));
  };
  const touch = () => { draft?.setTask(WEBHOOKS_TASK, save); bump((v) => v + 1); };
  const setHooks = (next: WebhookTrigger[]) => { pending.hooks = next; touch(); };
  /** Drop this page's copy and show the list as it is now. */
  const reload = () => {
    pending.hooks = null; pending.stale = false; pending.removed = [];
    if (!Object.keys(pending.tokens).length) draft?.setTask(WEBHOOKS_TASK, null);
    void listWebhooks().then((list) => { if (list) setStored(list); });
    bump((v) => v + 1);
  };
  const setToken = (id: string, v: string) => { pending.tokens = { ...pending.tokens, [id]: v }; touch(); };

  const urlOf = (id: string) => status?.endpoints.find((e) => e.id === id)?.url ?? '';
  const patchHook = (id: string, p: Partial<WebhookTrigger>) => setHooks(hooks.map((w) => (w.id === id ? { ...w, ...p } : w)));
  /** Delete stages like every other change: the row stays, marked, until Save
   *  (founder 25 Sep: "Delete stages like everything else and applies on Save"). */
  const removeHook = (id: string) => { pending.removed = [...pending.removed.filter((x) => x !== id), id]; setHooks(hooks); };
  const undoRemove = (id: string) => { pending.removed = pending.removed.filter((x) => x !== id); setHooks(hooks); };
  const isRemoved = (id: string) => pending.removed.includes(id);

  /** When each saved, switched on row first showed no address, for the timeout. */
  const creatingSince = useRef<Record<string, number>>({});
  const addressState = (w: WebhookTrigger): RowAddressState => {
    const saved = stored.find((x) => x.id === w.id);
    const url = urlOf(w.id);
    const waiting = !!saved && saved.enabled && !url;
    if (!waiting) delete creatingSince.current[w.id];
    else if (creatingSince.current[w.id] === undefined) creatingSince.current[w.id] = Date.now();
    return rowAddressState({
      saved: !!saved, enabled: !!saved?.enabled, url,
      starting: status?.starting === true, error: status?.error,
      creatingForMs: waiting ? Date.now() - (creatingSince.current[w.id] ?? Date.now()) : 0
    });
  };
  const [retrying, setRetrying] = useState(false);
  const retry = () => {
    setRetrying(true);
    creatingSince.current = {};
    void window.cth.webhooksRetry().catch(() => undefined).then(() => webhooksStatus()).then((st) => { setStatus(st); setRetrying(false); });
  };

  /** The form's endpoint joins the list; it and its address exist after Save.
   *  generateWebhookSecret never fails: a failed mint falls back to a local
   *  256 bit one, so adding cannot fail on the secret (batch 3 #12). */
  const add = async (f: InboundWebhookForm, telegramToken: string): Promise<void> => {
    const secret = await generateWebhookSecret();
    const w = webhookFromForm(f, newWebhook(secret, hooks.length));
    pending.hooks = [...hooks, w];
    if (f.source === 'telegram' && telegramToken.trim()) pending.tokens = { ...pending.tokens, [w.id]: telegramToken.trim() };
    touch();
  };
  const openForm = (source: WebhookSource) => setForm(blankInboundForm(source, source === 'custom' ? '' : t(`settings.integ.${source}.title`)));

  const agentName = (id?: string) => (id && agents.find((a) => a.id === id && !a.archived)?.name) || t('settings.integ.defaultAgent');
  const responder = draft ? draft.value('webhookResponder', config.webhookResponder ?? '') as string : (config.webhookResponder ?? '');
  const running = status?.running === true;
  const stateText = running ? t('settings.conn.state.listening') : t('settings.conn.state.notListening');

  return (
    <CollapsibleSection id="conn-inbound" title={t('settings.conn.inbound.title')} info={t('settings.conn.inbound.info')} summary={stateText} defaultOpen>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-inbound-card>
        <span style={{ fontSize: 12.5, color: 'var(--cth-ink-700)', flex: 1, minWidth: 200 }}>{t('settings.conn.inbound.lead')}</span>
        <Chip tone={running ? 'ok' : 'outline'} style={{ fontSize: 11 }}>{stateText}</Chip>
      </div>
      {status?.url && (
        <FieldRow label={t('settings.conn.webhook.address')} info={t('settings.conn.webhook.addressInfo')}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input readOnly value={status.url} onFocus={(e) => e.currentTarget.select()} style={monoInput} data-webhook-base />
            <Btn size="sm" onClick={() => { void window.cth.copyToClipboard(status.url ?? ''); }}>{t('common.copy')}</Btn>
          </div>
          {running && <BoundPortNote bound={status} />}
        </FieldRow>
      )}
      <FieldRow label={t('settings.conn.inbound.defaultAgent')} info={t('settings.conn.webhook.answeredByInfo', { godName })}>
        <AgentPicker value={responder} onChange={(id) => draft?.stage({ webhookResponder: id })} label={t('settings.conn.inbound.defaultAgent')} godName={godName} />
      </FieldRow>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Btn size="sm" kind="primary" onClick={() => openForm('custom')} dataAttrs={{ 'data-inbound-add': 'true' }}>{t('settings.conn.inbound.add')}</Btn>
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', marginInlineStart: 6 }}>{t('settings.conn.inbound.samples')}</span>
        {(['github', 'linear', 'telegram', 'custom'] as const).map((s) => (
          <Btn key={s} size="sm" onClick={() => openForm(s)} dataAttrs={{ 'data-inbound-sample': s }}>
            {s === 'custom' ? t('settings.conn.inbound.sampleBlank') : t(`settings.integ.${s}.title`)}
          </Btn>
        ))}
      </div>

      {pending.stale && pending.hooks && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--cth-status-blocked)' }} data-inbound-stale>
          <span style={{ flex: 1, minWidth: 200 }}>{t('settings.conn.inbound.changedByAgent')}</span>
          <Btn size="sm" onClick={reload} dataAttrs={{ 'data-inbound-reload': 'true' }}>{t('settings.conn.inbound.reload')}</Btn>
        </div>
      )}

      {/* The same list the Automations screen shows (founder 24 Sep: "list the
          webhook automations"). */}
      <section aria-label={t('settings.conn.inbound.list')} data-integ-automations style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('settings.conn.inbound.list')}</span>
          <span style={{ flex: 1 }} />
          {nav && <Btn size="sm" kind="ghost" onClick={() => nav.go('automations')}>{t('settings.integ.list.open')}</Btn>}
        </div>
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.integ.list.same')}</span>
        {hooks.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.integ.list.none')}</span>
        ) : hooks.map((w) => {
          const s = sourceOf(w);
          const gone = isRemoved(w.id);
          const addr = addressState(w);
          return (
            <div key={w.id} style={{ ...card(w.enabled && !gone), display: 'flex', flexDirection: 'column', gap: 8, ...(gone ? { opacity: 0.7 } : {}) }} data-integ-row={w.id} data-integ-source={s} data-integ-address={addr} {...(gone ? { 'data-integ-removed': 'true' } : {})}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: 'var(--cth-ink-900)', fontWeight: 500, ...(gone ? { textDecoration: 'line-through' } : {}) }}>{w.name}</span>
                  <Chip style={{ fontSize: 10.5 }}>{t(`settings.integ.sourceName.${s}`)}</Chip>
                  <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.integ.list.to', { name: agentName(w.to) })}</span>
                </div>
                {/* The toggle, and Delete directly below it, visible without
                    opening anything (founder 25 Sep). */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <Switch on={w.enabled} onChange={(enabled) => patchHook(w.id, { enabled })} label={t('settings.integ.enabled', { name: w.name })} />
                  <DeleteControl gone={gone} name={w.name} onDelete={() => removeHook(w.id)} onUndo={() => undoRemove(w.id)} />
                </div>
              </div>
              {gone
                ? <span style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }} data-integ-removed-note>{t('settings.conn.inbound.deleteOnSave')}</span>
                : <AddressLine state={addr} url={urlOf(w.id)} error={status?.error} retrying={retrying} onRetry={retry} />}
              {w.description && <span style={{ fontSize: 12, color: 'var(--cth-ink-700)' }}>{w.description}</span>}
              {s !== 'custom' && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }} data-integ-inbound>{t(`settings.integ.${s}.inboundOnly`)}</span>}
              <Disclosure title={t('settings.integ.list.edit')} dataAttr={`integ-edit-${w.id}`}>
                <EndpointEditor
                  hook={w}
                  url={urlOf(w.id)}
                  godName={godName}
                  onPatch={(p) => patchHook(w.id, p)}
                  telegramToken={s === 'telegram' ? (telegramTokens[w.id] ?? '') : undefined}
                  onTelegramToken={(v) => setToken(w.id, v)}
                />
                {s !== 'custom' && (
                  <Disclosure title={t('settings.integ.howTo')} dataAttr={`integ-howto-${s}`}>
                    <pre style={codeBox}>{t(`settings.integ.${s}.steps`)}</pre>
                  </Disclosure>
                )}
              </Disclosure>
            </div>
          );
        })}
      </section>

      {form && <AddInboundSheet initial={form} godName={godName} onClose={() => setForm(null)} onAdd={(f, tok) => { void add(f, tok).then(() => setForm(null)); }} />}
    </CollapsibleSection>
  );
}

/** The "Add new inbound webhook" form, a sheet over Settings (the Automations
 *  drawer's webhook fields, asked up front). */
function AddInboundSheet({ initial, godName, onClose, onAdd }: {
  initial: InboundWebhookForm;
  godName: string;
  onClose: () => void;
  onAdd: (f: InboundWebhookForm, telegramToken: string) => void;
}) {
  const { t } = useTranslation();
  const { codeBox } = settingsChrome(useSettingsChrome());
  const [f, setF] = useState<InboundWebhookForm>(initial);
  const [telegramToken, setTelegramToken] = useState('');
  const set = (p: Partial<InboundWebhookForm>) => setF((x) => ({ ...x, ...p }));
  const custom = f.source === 'custom';
  const problem = inboundFormProblem(f);
  const changeType = (source: WebhookSource) => {
    // A name that is still the old type's sample name follows the type.
    const sampleName = (s: WebhookSource) => (s === 'custom' ? '' : t(`settings.integ.${s}.title`));
    set({ source, name: f.name === sampleName(f.source) ? sampleName(source) : f.name });
  };
  return (
    <Sheet onClose={onClose} width={600} zIndex={320}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)', flex: 1 }}>{t('settings.conn.inbound.form.title')}</h2>
        <CloseX onClick={onClose} title={t('common.cancel')} />
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', minHeight: 0 }} data-inbound-form>
        <FieldRow label={t('settings.conn.inbound.form.type')}>
          <select aria-label={t('settings.conn.inbound.form.type')} value={f.source} onChange={(e) => changeType(e.target.value as WebhookSource)} style={{ ...inputStyle, maxWidth: 280 }} data-inbound-type>
            {WEBHOOK_SOURCES.map((s) => <option key={s} value={s}>{t(`settings.conn.inbound.form.typeChoice.${s}`)}</option>)}
          </select>
        </FieldRow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <FieldRow label={t('settings.integ.field.name')}>
            <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('settings.integ.custom.namePlaceholder')} style={inputStyle} data-inbound-name />
          </FieldRow>
          <FieldRow label={t('settings.integ.field.description')}>
            <input value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder={t('settings.integ.custom.descriptionPlaceholder')} style={inputStyle} />
          </FieldRow>
        </div>
        <FieldRow label={t('settings.conn.inbound.form.accepts')} info={custom ? t('settings.conn.inbound.form.acceptsInfo') : undefined}>
          {custom ? (
            <div style={{ borderRadius: 8, border: '1px solid var(--cth-ink-300)', overflow: 'hidden' }} data-inbound-schema>
              <JsonEditor value={f.schema} onChange={(schema) => set({ schema })} />
            </div>
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--cth-ink-700)' }} data-inbound-accepts={f.source}>{t(`settings.conn.inbound.form.acceptsService.${f.source}`)}</span>
          )}
        </FieldRow>
        {problem === 'schema' && <span style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }}>{t('settings.conn.inbound.form.badSchema')}</span>}
        <FieldRow label={t('settings.conn.inbound.form.auth')}>
          {custom ? (
            <>
              <select aria-label={t('settings.conn.inbound.form.auth')} value={f.auth} onChange={(e) => set({ auth: e.target.value as WebhookAuth })} style={{ ...inputStyle, maxWidth: 320 }} data-inbound-auth>
                {WEBHOOK_AUTHS.map((a) => <option key={a} value={a}>{t(`settings.conn.inbound.form.authChoice.${a}`)}</option>)}
              </select>
              <pre style={{ ...codeBox, margin: 0 }} data-inbound-auth-example>{authHeaderExample(f.auth)}</pre>
            </>
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--cth-ink-700)' }}>{t(`settings.conn.inbound.form.authService.${f.source}`)}</span>
          )}
        </FieldRow>
        {f.source === 'telegram' && (
          <FieldRow label={t('settings.integ.telegram.botToken')} info={t('settings.integ.telegram.botTokenInfo')}>
            <input type="password" autoComplete="off" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder="123456789:AA..." style={monoInput} />
          </FieldRow>
        )}
        <FieldRow label={t('settings.conn.inbound.form.goesTo')}>
          <AgentPicker value={f.to} onChange={(to) => set({ to })} label={t('settings.conn.inbound.form.goesTo')} godName={godName} />
        </FieldRow>
        <FieldRow label={t('settings.conn.inbound.form.prompt')} info={t('settings.integ.promptInfo')}>
          <textarea value={f.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder={t(`settings.integ.promptPlaceholder.${f.source}`)} style={{ ...textareaStyle, minHeight: 64 }} data-inbound-prompt />
        </FieldRow>
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.conn.inbound.form.afterSave')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--cth-ink-300)' }}>
        <Btn onClick={onClose}>{t('common.cancel')}</Btn>
        <Btn kind="primary" disabled={problem !== null} onClick={() => onAdd(f, telegramToken)} dataAttrs={{ 'data-inbound-confirm': 'true' }}>{t('settings.conn.inbound.form.confirm')}</Btn>
      </div>
    </Sheet>
  );
}

function EndpointEditor({ hook: w, url, godName, onPatch, telegramToken, onTelegramToken }: {
  hook: WebhookTrigger;
  url: string;
  godName: string;
  onPatch: (p: Partial<WebhookTrigger>) => void;
  telegramToken?: string;
  onTelegramToken?: (v: string) => void;
}) {
  const { t } = useTranslation();
  const [showSecret, setShowSecret] = useState(false);
  const modes = useMemo(() => TRIGGER_MODES, []);
  const custom = (w.source ?? 'custom') === 'custom';
  const auth: WebhookAuth = w.auth ?? 'header';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-integ-endpoint={w.id}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <FieldRow label={t('settings.integ.field.name')}>
          <input value={w.name} onChange={(e) => onPatch({ name: e.target.value })} style={inputStyle} />
        </FieldRow>
        <FieldRow label={t('settings.integ.field.description')}>
          <input value={w.description ?? ''} onChange={(e) => onPatch({ description: e.target.value })} style={inputStyle} />
        </FieldRow>
      </div>
      <FieldRow label={t('settings.integ.field.url')} info={t('settings.integ.urlInfo')}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input readOnly value={url || t('settings.integ.urlAfterSave')} onFocus={(e) => e.currentTarget.select()} style={{ ...monoInput, color: url ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)' }} data-integ-url />
          <Btn size="sm" disabled={!url} onClick={() => { void window.cth.copyToClipboard(url); }}>{t('common.copy')}</Btn>
        </div>
      </FieldRow>
      {custom && (
        <FieldRow label={t('settings.conn.inbound.form.auth')}>
          <select aria-label={t('settings.conn.inbound.form.auth')} value={auth} onChange={(e) => onPatch({ auth: e.target.value as WebhookAuth })} style={{ ...inputStyle, maxWidth: 320 }} data-integ-auth>
            {WEBHOOK_AUTHS.map((a) => <option key={a} value={a}>{t(`settings.conn.inbound.form.authChoice.${a}`)}</option>)}
          </select>
          <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>{authHeaderExample(auth)}</span>
        </FieldRow>
      )}
      {w.source !== 'telegram' && (
        <FieldRow label={t('settings.integ.field.secret')} info={t(`settings.integ.secretInfo.${w.source ?? 'custom'}`)}>
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Linear makes its own signing secret and shows it once the
                webhook exists there: it is pasted in here, over the one this
                app minted. GitHub and a plain webhook take ours. */}
            <input type={showSecret ? 'text' : 'password'} readOnly={w.source !== 'linear'} value={w.secret} onChange={(e) => onPatch({ secret: e.target.value.trim() })} onFocus={(e) => e.currentTarget.select()} style={monoInput} data-integ-secret={w.source ?? 'custom'} />
            <Btn size="sm" onClick={() => setShowSecret((v) => !v)}>{showSecret ? t('common.hide') : t('common.show')}</Btn>
            <Btn size="sm" onClick={() => { void window.cth.copyToClipboard(w.secret); }}>{t('common.copy')}</Btn>
          </div>
        </FieldRow>
      )}
      {telegramToken !== undefined && onTelegramToken && (
        <FieldRow label={t('settings.integ.telegram.botToken')} info={t('settings.integ.telegram.botTokenInfo')}>
          <input type="password" autoComplete="off" value={telegramToken} onChange={(e) => onTelegramToken(e.target.value)} placeholder="123456789:AA..." style={monoInput} data-integ-telegram-token />
        </FieldRow>
      )}
      <FieldRow label={t('settings.integ.field.prompt')} info={t('settings.integ.promptInfo')}>
        <textarea value={w.prompt ?? ''} onChange={(e) => onPatch({ prompt: e.target.value })} placeholder={t(`settings.integ.promptPlaceholder.${w.source ?? 'custom'}`)} style={{ ...textareaStyle, minHeight: 56 }} />
      </FieldRow>
      <FieldRow label={t('settings.conn.answeredBy')}>
        <AgentPicker value={w.to ?? ''} onChange={(to) => onPatch({ to })} label={t('settings.conn.answeredBy')} godName={godName} />
      </FieldRow>
      <Disclosure title={t('settings.integ.more')}>
        <FieldRow label={t('settings.connections.mode')} info={modes.find((m) => m.value === w.mode)?.blurb}>
          <select aria-label={t('settings.connections.mode')} value={w.mode} onChange={(e) => onPatch({ mode: e.target.value as TriggerMode })} style={{ ...inputStyle, maxWidth: 240 }}>
            {modes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </FieldRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch on={w.guardrails === true} onChange={(guardrails) => onPatch({ guardrails })} label={t('settings.integ.guardrails')} />
          <span style={{ fontSize: 12.5, color: 'var(--cth-ink-900)' }}>{t('settings.integ.guardrails')}</span>
        </div>
      </Disclosure>
    </div>
  );
}

/** Delete, then an in-app confirm in the same place (never a browser
 *  dialog). Confirmed, the row is marked and goes on Save; Undo brings it back. */
function DeleteControl({ gone, name, onDelete, onUndo }: { gone: boolean; name: string; onDelete: () => void; onUndo: () => void }) {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  if (gone) return <Btn size="sm" onClick={onUndo} dataAttrs={{ 'data-integ-undo': 'true' }}>{t('settings.conn.inbound.undo')}</Btn>;
  if (!asking) return <Btn size="sm" kind="ghost" onClick={() => setAsking(true)} title={t('settings.conn.inbound.deleteNamed', { name })} dataAttrs={{ 'data-integ-delete': 'true' }}>{t('settings.conn.inbound.delete')}</Btn>;
  return (
    <div style={{ display: 'flex', gap: 6 }} role="group" aria-label={t('settings.conn.inbound.deleteNamed', { name })}>
      <Btn size="sm" onClick={() => setAsking(false)}>{t('settings.conn.inbound.keep')}</Btn>
      <Btn size="sm" kind="danger" onClick={() => { setAsking(false); onDelete(); }} dataAttrs={{ 'data-integ-delete-confirm': 'true' }}>{t('settings.conn.inbound.deleteConfirm')}</Btn>
    </div>
  );
}

/** The row's address line: after Save a spinner and "Creating address" until
 *  the address exists, red with Retry when the start failed. */
function AddressLine({ state, url, error, retrying, onRetry }: { state: RowAddressState; url: string; error?: string; retrying: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  if (state === 'unsaved') return <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }} data-integ-address-line="unsaved">{t('settings.integ.urlAfterSave')}</span>;
  if (state === 'off') return null;
  if (state === 'ready') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }} data-integ-address-line="ready">
        <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, color: 'var(--cth-ink-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{url}</code>
        <Btn size="sm" kind="ghost" onClick={() => { void window.cth.copyToClipboard(url); }}>{t('common.copy')}</Btn>
      </div>
    );
  }
  if (state === 'creating' || retrying) {
    return (
      <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--cth-ink-700)' }} data-integ-address-line="creating">
        <style>{'@keyframes md-inbound-spin { to { transform: rotate(360deg); } }'}</style>
        <span aria-hidden style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--cth-ink-300)', borderTopColor: 'var(--cth-ink-700)', animation: 'md-inbound-spin 0.8s linear infinite' }} />
        {t('settings.conn.inbound.creatingAddress')}
      </span>
    );
  }
  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--cth-status-blocked)' }} data-integ-address-line="failed">
      <span style={{ flex: 1, minWidth: 160 }}>{error ? t('settings.conn.inbound.addressFailed', { error }) : t('settings.conn.inbound.addressTimedOut')}</span>
      <Btn size="sm" onClick={onRetry} dataAttrs={{ 'data-integ-retry': 'true' }}>{t('settings.conn.inbound.retry')}</Btn>
    </div>
  );
}
