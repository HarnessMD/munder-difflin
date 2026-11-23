/**
 * INBOUND WEBHOOKS, AS THE INTEGRATIONS SCREEN DRAWS THEM: a public,
 * authenticated webhook that tools on the internet can hit, with the add
 * form for the webhook type, the request it accepts, the authentication, the
 * agent and the prompt.
 *
 * Every webhook is a WebhookTrigger, the same list the Automations screen
 * shows, so an endpoint made on either screen is the same thing. GitHub,
 * Linear and Telegram carry a `source`, which makes main check that service's
 * own signature and read its own payload (main/serviceWebhooks.ts); a blank
 * one carries `auth` (header, bearer or a signed body); `to` is the agent that
 * takes the message.
 *
 * The screen holds the list once (`useInboundHooks`) and each webhook is one
 * item of it: WebhookSetup, WebhookWhoAnswers and the switch in the header.
 *
 * Edits wait for the screen's Save. The list is not a plain config field
 * (main sanitises it and re-points the live server), so the edited copy is
 * held in `pending` below, outside React so it outlives a click to another
 * item, and the draft task 'webhooks:save' writes it. The task goes with
 * Discard (the draft's reset), and the held copy is then dropped too. Save
 * also points a Telegram bot at its endpoint when a bot token was typed; the
 * token is used for that one call and never stored.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { HarnessConfig } from '@/store/config';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { TRIGGER_MODES, WEBHOOK_AUTHS, WEBHOOK_SOURCES, type TriggerMode, type WebhookAuth, type WebhookSource, type WebhookTrigger } from '@shared/triggers';
import { authHeaderExample, inboundFormProblem, rowAddressState, webhookFromForm, type InboundWebhookForm, type RowAddressState } from '@shared/inboundWebhook';
import { PixelButton } from '../PixelButton';
import { receiverWords, tempReceiverLabel } from '../triggers/receiverOptions';
import { BoundPortNote } from '../BoundPortNote';
import { generateWebhookSecret, listWebhooks, newWebhook, saveWebhooks, webhooksStatus, type WebhooksStatus } from '../triggers/api';
import { JsonEditor } from '../triggers/JsonEditor';
import { useSettingsDraft } from './SettingsFrame';
import { settingsKit } from './classicChrome';
import { ClassicSheet, CloseButton, OnOff, classicInput as inputStyle, classicTextarea as textareaStyle } from './classicBits';
import { AgentPicker, Disclosure, FieldRow, monoInput } from './primitives';

export const sourceOf = (w: WebhookTrigger): WebhookSource => w.source ?? 'custom';

export const WEBHOOKS_TASK = 'webhooks:save';

/** The edited list and typed Telegram tokens, until Save or Discard. `stale`:
 *  an agent changed the list while this copy was being edited
 *  (webhooks:changed), so Save must not write the copy over it. */
const pending: { hooks: WebhookTrigger[] | null; tokens: Record<string, string>; stale: boolean; removed: string[] } = { hooks: null, tokens: {}, stale: false, removed: [] };

export type InboundHooks = ReturnType<typeof useInboundHooks>;

/** The webhook list as the screen shows it, and every change to it, staged. */
export function useInboundHooks(config: HarnessConfig) {
  const { t } = useTranslation();
  const draft = useSettingsDraft();
  const agents = useStore((s) => s.agents);
  const stored = useStore((s) => s.webhookTriggers);
  const setStored = useStore((s) => s.setWebhookTriggers);
  const [, bump] = useState(0);
  const [status, setStatus] = useState<WebhooksStatus | null>(null);

  // Discard dropped the task: drop what it would have written.
  if ((pending.hooks || Object.keys(pending.tokens).length) && draft && !draft.hasTask(WEBHOOKS_TASK)) {
    pending.hooks = null; pending.tokens = {}; pending.stale = false; pending.removed = [];
  }
  const hooks = pending.hooks ?? stored;
  const telegramTokens = pending.tokens;

  // The list as main has it now (another window, the Automations screen, an agent).
  useEffect(() => {
    const load = () => { void listWebhooks().then((list) => { if (Array.isArray(list)) setStored(list); }); };
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
    void listWebhooks().then((list) => { if (Array.isArray(list)) setStored(list); });
    bump((v) => v + 1);
  };
  const setToken = (id: string, v: string) => { pending.tokens = { ...pending.tokens, [id]: v }; touch(); };

  const urlOf = (id: string) => status?.endpoints?.find((e) => e.id === id)?.url ?? '';
  const patchHook = (id: string, p: Partial<WebhookTrigger>) => setHooks(hooks.map((w) => (w.id === id ? { ...w, ...p } : w)));
  /** Delete stages like every other change: the row stays, marked, until Save. */
  const removeHook = (id: string) => { pending.removed = [...pending.removed.filter((x) => x !== id), id]; setHooks(pending.hooks ?? hooks); };
  const undoRemove = (id: string) => { pending.removed = pending.removed.filter((x) => x !== id); setHooks(pending.hooks ?? hooks); };
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
   *  256 bit one, so adding cannot fail on the secret. */
  const add = async (f: InboundWebhookForm, telegramToken: string): Promise<WebhookTrigger> => {
    const secret = await generateWebhookSecret();
    const w = webhookFromForm(f, newWebhook(secret, hooks.length));
    pending.hooks = [...hooks, w];
    if (f.source === 'telegram' && telegramToken.trim()) pending.tokens = { ...pending.tokens, [w.id]: telegramToken.trim() };
    touch();
    return w;
  };

  // An endpoint that goes to a temp says so, never "the default agent".
  const agentName = (id?: string) => tempReceiverLabel(id, agents, receiverWords(t)) ?? ((id && agents.find((a) => a.id === id && !a.archived)?.name) || t('settings.integ.defaultAgent'));
  const responder = draft ? draft.value('webhookResponder', config.webhookResponder ?? '') as string : (config.webhookResponder ?? '');
  const running = status?.running === true;
  return {
    hooks, stored, status, running, telegramTokens, stale: pending.stale && !!pending.hooks,
    urlOf, patchHook, removeHook, undoRemove, isRemoved, addressState, retrying, retry, reload, setToken, add, agentName, responder
  };
}

/** Setup of one webhook: its address, what it takes and how it signs, and
 *  Delete, which waits for Save like everything else. */
export function WebhookSetup({ api, hook: w }: { api: InboundHooks; hook: WebhookTrigger }) {
  const { t } = useTranslation();
  const { codeBox } = settingsKit;
  const { status, running, urlOf, addressState, retrying, retry, patchHook, isRemoved, telegramTokens, setToken, stale, reload } = api;
  const s = sourceOf(w);
  const gone = isRemoved(w.id);
  const addr = addressState(w);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...(gone ? { opacity: 0.75 } : {}) }} data-integ-row={w.id} data-integ-source={s} data-integ-address={addr} {...(gone ? { 'data-integ-removed': 'true' } : {})}>
      {stale && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, color: 'var(--cth-status-blocked)' }} data-inbound-stale>
          <span style={{ flex: 1, minWidth: 200 }}>{t('settings.conn.inbound.changedByAgent')}</span>
          <PixelButton variant="secondary" size="sm" onClick={reload} dataAttrs={{ 'data-inbound-reload': 'true' }}>{t('settings.conn.inbound.reload')}</PixelButton>
        </div>
      )}
      {gone
        ? <span style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }} data-integ-removed-note>{t('settings.conn.inbound.deleteOnSave')}</span>
        : <AddressLine state={addr} url={urlOf(w.id)} error={status?.error} retrying={retrying} onRetry={retry} />}
      {running && <BoundPortNote bound={status} />}
      {s !== 'custom' && <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }} data-integ-inbound>{t(`settings.integ.${s}.inboundOnly`)}</span>}
      <EndpointEditor
        hook={w}
        url={urlOf(w.id)}
        onPatch={(p) => patchHook(w.id, p)}
        telegramToken={s === 'telegram' ? (telegramTokens[w.id] ?? '') : undefined}
        onTelegramToken={(v) => setToken(w.id, v)}
      />
      {s !== 'custom' && (
        <Disclosure title={t('settings.integ.howTo')} dataAttr={`integ-howto-${s}`}>
          <pre style={codeBox}>{t(`settings.integ.${s}.steps`)}</pre>
        </Disclosure>
      )}
      {/* The same list the Automations screen shows. */}
      <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.integ.list.same')}</span>
    </div>
  );
}

/** The toggle in the header of a webhook, and Delete directly below it,
 *  visible without opening anything. Both staged. */
export function WebhookSwitch({ api, hook: w }: { api: InboundHooks; hook: WebhookTrigger }) {
  const { t } = useTranslation();
  const gone = api.isRemoved(w.id);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }} data-webhook-controls>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <OnOff on={w.enabled} onChange={(enabled) => api.patchHook(w.id, { enabled })} label={t('settings.integ.enabled', { name: w.name })} />
      </span>
      <DeleteControl gone={gone} name={w.name} onDelete={() => api.removeHook(w.id)} onUndo={() => api.undoRemove(w.id)} />
    </div>
  );
}

/** Who answers one webhook, and the default every webhook without its own
 *  agent goes to. */
export function WebhookWhoAnswers({ api, hook: w, godName }: { api: InboundHooks; hook: WebhookTrigger; godName: string }) {
  const { t } = useTranslation();
  const draft = useSettingsDraft();
  const { responder, patchHook } = api;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} data-webhook-who>
      <p style={{ margin: 0, fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-700)', maxWidth: 560 }}>{t('integrations.screen.who.webhookLead', { godName })}</p>
      <FieldRow label={t('integrations.screen.who.thisWebhook')}>
        <AgentPicker value={w.to ?? ''} onChange={(to) => patchHook(w.id, { to })} label={t('settings.conn.answeredBy')} godName={godName} />
      </FieldRow>
      <FieldRow label={t('settings.conn.inbound.defaultAgent')} info={t('settings.conn.webhook.answeredByInfo', { godName })}>
        <AgentPicker value={responder} onChange={(id) => draft?.stage({ webhookResponder: id })} label={t('settings.conn.inbound.defaultAgent')} godName={godName} />
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('integrations.screen.who.defaultShared')}</span>
      </FieldRow>
    </div>
  );
}

/** The "Add new inbound webhook" form, a sheet over the screen (the
 *  Automations drawer's webhook fields, asked up front). */
export function AddInboundSheet({ initial, godName, onClose, onAdd }: {
  initial: InboundWebhookForm;
  godName: string;
  onClose: () => void;
  onAdd: (f: InboundWebhookForm, telegramToken: string) => void;
}) {
  const { t } = useTranslation();
  const { codeBox } = settingsKit;
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
    <ClassicSheet onClose={onClose} width={600} zIndex={1300} title={t('settings.conn.inbound.form.title')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px 10px', boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '14px', textTransform: 'uppercase', color: 'var(--cth-ink-900)', flex: 1 }}>{t('settings.conn.inbound.form.title')}</h2>
        <CloseButton onClick={onClose} title={t('common.cancel')} />
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
            <div style={{ boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', padding: 1, overflow: 'hidden' }} data-inbound-schema>
              <JsonEditor value={f.schema} onChange={(schema) => set({ schema })} />
            </div>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--cth-ink-700)' }} data-inbound-accepts={f.source}>{t(`settings.conn.inbound.form.acceptsService.${f.source}`)}</span>
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
            <span style={{ fontSize: 13, color: 'var(--cth-ink-700)' }}>{t(`settings.conn.inbound.form.authService.${f.source}`)}</span>
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 18px', boxShadow: 'inset 0 1px 0 var(--cth-ink-300)' }}>
        <PixelButton variant="secondary" onClick={onClose}>{t('common.cancel')}</PixelButton>
        <PixelButton variant="primary" disabled={problem !== null} onClick={() => onAdd(f, telegramToken)} dataAttrs={{ 'data-inbound-confirm': 'true' }}>{t('settings.conn.inbound.form.confirm')}</PixelButton>
      </div>
    </ClassicSheet>
  );
}

function EndpointEditor({ hook: w, url, onPatch, telegramToken, onTelegramToken }: {
  hook: WebhookTrigger;
  url: string;
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
          <PixelButton variant="secondary" size="sm" disabled={!url} onClick={() => { void window.cth.copyToClipboard(url); }}>{t('common.copy')}</PixelButton>
        </div>
      </FieldRow>
      {custom && (
        <FieldRow label={t('settings.conn.inbound.form.auth')}>
          <select aria-label={t('settings.conn.inbound.form.auth')} value={auth} onChange={(e) => onPatch({ auth: e.target.value as WebhookAuth })} style={{ ...inputStyle, maxWidth: 320 }} data-integ-auth>
            {WEBHOOK_AUTHS.map((a) => <option key={a} value={a}>{t(`settings.conn.inbound.form.authChoice.${a}`)}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>{authHeaderExample(auth)}</span>
        </FieldRow>
      )}
      {w.source !== 'telegram' && (
        <FieldRow label={t('settings.integ.field.secret')} info={t(`settings.integ.secretInfo.${w.source ?? 'custom'}`)}>
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Linear makes its own signing secret and shows it once the
                webhook exists there: it is pasted in here, over the one this
                app minted. GitHub and a plain webhook take ours. */}
            <input type={showSecret ? 'text' : 'password'} readOnly={w.source !== 'linear'} value={w.secret} onChange={(e) => onPatch({ secret: e.target.value.trim() })} onFocus={(e) => e.currentTarget.select()} style={monoInput} data-integ-secret={w.source ?? 'custom'} />
            <PixelButton variant="secondary" size="sm" onClick={() => setShowSecret((v) => !v)}>{showSecret ? t('common.hide') : t('common.show')}</PixelButton>
            <PixelButton variant="secondary" size="sm" onClick={() => { void window.cth.copyToClipboard(w.secret); }}>{t('common.copy')}</PixelButton>
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
      <Disclosure title={t('settings.integ.more')}>
        <FieldRow label={t('settings.connections.mode')} info={modes.find((m) => m.value === w.mode)?.blurb}>
          <select aria-label={t('settings.connections.mode')} value={w.mode} onChange={(e) => onPatch({ mode: e.target.value as TriggerMode })} style={{ ...inputStyle, maxWidth: 240 }}>
            {modes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </FieldRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <OnOff on={w.guardrails === true} onChange={(guardrails) => onPatch({ guardrails })} label={t('settings.integ.guardrails')} />
          <span style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>{t('settings.integ.guardrails')}</span>
        </div>
      </Disclosure>
    </div>
  );
}

/** Delete, then an in-app confirm in the same place (never a browser
 *  dialog). Confirmed, the row is marked and goes on Save; Undo brings it back. */
export function DeleteControl({ gone, name, onDelete, onUndo }: { gone: boolean; name: string; onDelete: () => void; onUndo: () => void }) {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  if (gone) return <PixelButton variant="secondary" size="sm" onClick={onUndo} dataAttrs={{ 'data-integ-undo': 'true' }}>{t('settings.conn.inbound.undo')}</PixelButton>;
  if (!asking) return <PixelButton size="sm" variant="ghost" onClick={() => setAsking(true)} title={t('settings.conn.inbound.deleteNamed', { name })} dataAttrs={{ 'data-integ-delete': 'true' }}>{t('settings.conn.inbound.delete')}</PixelButton>;
  return (
    <div style={{ display: 'flex', gap: 6 }} role="group" aria-label={t('settings.conn.inbound.deleteNamed', { name })}>
      <PixelButton variant="secondary" size="sm" onClick={() => setAsking(false)}>{t('settings.conn.inbound.keep')}</PixelButton>
      <PixelButton size="sm" variant="destructive" onClick={() => { setAsking(false); onDelete(); }} dataAttrs={{ 'data-integ-delete-confirm': 'true' }}>{t('settings.conn.inbound.deleteConfirm')}</PixelButton>
    </div>
  );
}

/** The row's address line: after Save "Creating address" until the address
 *  exists, red with Retry when the start failed. */
function AddressLine({ state, url, error, retrying, onRetry }: { state: RowAddressState; url: string; error?: string; retrying: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  if (state === 'unsaved') return <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }} data-integ-address-line="unsaved">{t('settings.integ.urlAfterSave')}</span>;
  if (state === 'off') return null;
  if (state === 'ready') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }} data-integ-address-line="ready">
        <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{url}</code>
        <PixelButton size="sm" variant="ghost" onClick={() => { void window.cth.copyToClipboard(url); }}>{t('common.copy')}</PixelButton>
      </div>
    );
  }
  if (state === 'creating' || retrying) {
    return (
      <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--cth-ink-700)' }} data-integ-address-line="creating">
        <span aria-hidden>…</span>
        {t('settings.conn.inbound.creatingAddress')}
      </span>
    );
  }
  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--cth-status-blocked)' }} data-integ-address-line="failed">
      <span style={{ flex: 1, minWidth: 160 }}>{error ? t('settings.conn.inbound.addressFailed', { error }) : t('settings.conn.inbound.addressTimedOut')}</span>
      <PixelButton variant="secondary" size="sm" onClick={onRetry} dataAttrs={{ 'data-integ-retry': 'true' }}>{t('settings.conn.inbound.retry')}</PixelButton>
    </div>
  );
}
