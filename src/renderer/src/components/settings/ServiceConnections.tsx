/**
 * ONE SERVICE CONNECTION, AS THE INTEGRATIONS SCREEN DRAWS IT. Each
 * connection agents reach through the broker is one item of Integrations,
 * and its pane draws this, over the client
 * (integrations/registryClient.ts, the renderer's one door to the registry
 * and the secret broker):
 *
 *   add/edit  integrationsClient.save(rec, key)  upsert, then setSecret when a key was typed
 *   remove    integrationsClient.remove(id)      marked, and done on Save
 *   test      integrationsClient.test(id)        a saved record; the broker probes by id
 *             integrationsClient.testDraft(r, key)  before Connect, or a key not saved yet; nothing kept
 *
 * NOTHING SAVES AS IT IS TYPED. Every
 * change is the task `conn:<id>` in the screen's draft, and the footer Save
 * runs it; Remove is the task `conn-remove:<id>`. Test is not a setting: it
 * reads the saved record, or the form with the token typed on it, and runs at
 * once. On or off (`enabled`, the consent
 * gate) is the switch in the pane's header, staged the same way.
 *
 * A secret flows one way: from the field into save() and on to the encrypted
 * store. It is never read back, so an edit shows "saved" and takes a new one.
 * The auth shapes are ../../../../shared/apiAuth: the editor draws
 * `apiAuthPreview`, which takes NO secret, so what is on screen cannot be a
 * key even by accident.
 *
 * The template behind a record is the one it remembers (shared/integrations
 * resolveTemplate), never the first of its kind, and a new connection takes
 * the first free id, because the id is also the secret's handle and a
 * collision hands the new record the old one's key.
 *
 * A git credential (shared/gitConnection.ts) has its own form: the host, a
 * user name and a token, and no choice of how the key is sent.
 */
import { GIT_HOST_START, gitAddressProblem, gitHostTaken, isGitConnection, templateNameKey } from '@shared/gitConnection';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { API_AUTH_MODES, apiAuthPreview, validateApiAuth, type ApiAuth, type ApiAuthMode } from './apiAuthForm';
import { apiAuthOf, authTypeNeedsSecret as needsSecret, resolveTemplate, testVerdict } from '@shared/integrations';
import { integrationsClient, slugify, type IntegrationAuthType, type IntegrationKind, type IntegrationRecord, type IntegrationRecordView, type IntegrationTemplate, type TestResult } from '@/integrations/registryClient';
import { PixelButton } from '../PixelButton';
import { classicCodeBox, classicInput as inputStyle, classicLabel, classicMonoInput as monoInputStyle } from './classicBits';
import { recordConnTest, useConnTests } from '../integrations/integrationsStore';
import { connectNeeds, keepsTokenWord } from '../integrations/integrationsHub';
import { useSettingsDraft } from './SettingsFrame';

interface Draft {
  isNew: boolean; id: string; label: string; kind: IntegrationKind; baseUrl: string; authType: IntegrationAuthType;
  authHeader: string; authPrefix: string; authQuery: string; authUser: string;
  templateId?: string; probePath: string; enabled: boolean; hasSecret: boolean; createdAt: number; secret: string;
}

/** The shapes a person may choose for a custom REST API. `github` is not here:
 *  it is the GitHub preset's shape, set by the template, not a choice. */
const CUSTOM_AUTH: readonly ApiAuthMode[] = API_AUTH_MODES;

const authOf = (d: Draft): ApiAuth => apiAuthOf(d);
/** The auth shapes offered for a connection: the custom ones, with a
 *  preset's own shape first when it is not one of them (GitHub's). */
const authChoices = (tpl: IntegrationTemplate | undefined): IntegrationAuthType[] =>
  tpl && !(CUSTOM_AUTH as readonly string[]).includes(tpl.authType) ? [tpl.authType, ...CUSTOM_AUTH] : [...CUSTOM_AUTH];

export const connTaskId = (id: string): string => `conn:${id}`;
export const connRemoveTaskId = (id: string): string => `conn-remove:${id}`;

/** A connection's state as the list says it: on, off, or waiting for a key. */
export const connUsable = (r: { enabled: boolean; authType: IntegrationAuthType; hasSecret: boolean }): boolean => r.enabled && (!needsSecret(r.authType) || r.hasSecret);

/** The template a git credential is made from. */
export const isGitTemplate = (x: IntegrationTemplate): boolean => isGitConnection({ templateId: x.idSuggestion });
/** The blank Custom API template (no address of its own): its name and help are the locale's. */
const blankCustom = (x: IntegrationTemplate): boolean => x.kind === 'custom-rest' && !x.baseUrl;

/** A template's name as the screens say it. The git one and GitHub's are the
 *  locale's ("Git repositories", "GitHub API"), so the two do not read as one;
 *  every other template is named by its own label. */
export const templateName = (t: TFunction, x: IntegrationTemplate): string => { const key = templateNameKey(x); return key ? t(key) : x.label; };

/** A field: its Classic label, the control, and a hint under it. */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={classicLabel}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 'var(--cth-text-body-sm)', lineHeight: 'var(--cth-lh-body-sm)', color: 'var(--cth-ink-500)' }}>{hint}</span>}
    </div>
  );
}

/** A rejected key and a missing probe path say different things. */
export function useFmtTest(): (r: TestResult) => string {
  const { t } = useTranslation();
  return (r: TestResult) => {
    if (r.ok) return r.status ? t('pro.conn.okStatus', { status: r.status }) : t('pro.conn.ok');
    const verdict = testVerdict(r.status);
    if (verdict === 'key_rejected') return t('pro.conn.keyRejected', { status: r.status });
    if (verdict === 'not_found') return t('pro.conn.pathNotFound');
    return t('pro.conn.fail', { error: [r.error, r.status].filter(Boolean).join(' ') });
  };
}

export type ConnectionDraft = ReturnType<typeof useConnectionDraft>;

/**
 * One connection being edited: `record` to edit a saved one, or `template` to
 * add one from a preset. The pane holds it once, so its header switch and its
 * Setup change the same draft. `onSaved` hears the id after Save wrote it;
 * `onRemoved` after Save removed it.
 */
export function useConnectionDraft({ record, template, templates, records, onSaved, onRemoved, stageOnOpen = true }: {
  record?: IntegrationRecordView; template?: IntegrationTemplate; templates: IntegrationTemplate[]; records: IntegrationRecordView[];
  onSaved: (id: string) => void; onRemoved: (id: string) => void;
  /** False: opening one is only looking at it, and the first thing typed stages it. */
  stageOnOpen?: boolean;
}) {
  const { t } = useTranslation();
  const settings = useSettingsDraft();
  const [busy, setBusy] = useState(false);
  /** The verdict on the form as it stands: not a saved connection's, so it stays out of the list's. */
  const [typedTest, setTypedTest] = useState<TestResult | null>(null);

  /** The first id nothing has taken. Two Atlassian sites, two Stripe accounts
   *  and two of anything else are ordinary, and the id is also the secret's
   *  handle, so a collision hands the new record the old record's key. */
  const freeId = (seed: string): string => {
    const taken = new Set((records ?? []).map((r) => r.id));
    const base = slugify(seed);
    let id = base;
    for (let n = 2; taken.has(id); n += 1) id = slugify(`${base}-${n}`);
    return id;
  };
  const fromTemplate = (tpl: IntegrationTemplate): Draft => ({
    isNew: true, id: freeId(tpl.idSuggestion || tpl.label), label: isGitTemplate(tpl) ? t('pro.conn.kind.git') : blankCustom(tpl) ? t('integrations.screen.addSheet.customApi') : tpl.label, kind: tpl.kind,
    baseUrl: isGitTemplate(tpl) ? GIT_HOST_START : tpl.baseUrl,
    authType: tpl.authType, authHeader: tpl.authHeader ?? '', authPrefix: tpl.authPrefix ?? '', authQuery: tpl.authQuery ?? '', authUser: tpl.authUser ?? '',
    templateId: tpl.idSuggestion, probePath: tpl.probePath ?? '', enabled: true, hasSecret: false, createdAt: Date.now(), secret: ''
  });
  const fromRecord = (r: IntegrationRecordView): Draft => ({
    isNew: false, id: r.id, label: r.label, kind: r.kind, baseUrl: r.baseUrl, authType: r.authType,
    authHeader: r.authHeader ?? '', authPrefix: r.authPrefix ?? '', authQuery: r.authQuery ?? '', authUser: r.authUser ?? '',
    templateId: r.templateId, probePath: r.probePath ?? '', enabled: r.enabled, hasSecret: r.hasSecret, createdAt: r.createdAt, secret: ''
  });
  const [start] = useState<Draft | null>(() => (record ? fromRecord(record) : template ? fromTemplate(template) : null));
  const [draft, setDraft] = useState<Draft | null>(start);

  /** An existing record keeps the id it was written under: re-slugging one
   *  would write a SECOND record and leave the first behind with the key. */
  const idOf = (d: Draft) => (d.isNew ? slugify(d.id || d.label) : d.id);

  const validate = (d: Draft): string | null => {
    if (!d.label.trim()) return t('pro.conn.errLabel');
    // A git credential: https, the host and nothing after it, and one per host.
    if (isGitConnection(d)) {
      const address = gitAddressProblem(d.baseUrl.trim());
      if (address) return t(address === 'host-only' ? 'office.conn.git.host.hostOnly' : 'office.conn.git.host.notHttps');
      const taken = gitHostTaken({ id: idOf(d), templateId: d.templateId, baseUrl: d.baseUrl.trim() }, records ?? []);
      if (taken) return t('integrations.git.hostTaken', { host: taken, defaultValue: 'There is already a Git repositories connection for {{host}}. Change that one, or remove it first.' });
    }
    if (d.kind === 'custom-rest') {
      const u = d.baseUrl.trim();
      if (!/^https:\/\//.test(u) && !/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/.test(u)) return t('pro.conn.errUrl');
    }
    const bad = validateApiAuth(authOf(d));
    if (bad === 'header') return t('pro.conn.errHeader');
    if (bad === 'prefix') return t('pro.conn.errPrefix');
    if (bad === 'param') return t('pro.conn.errParam');
    if (bad === 'user') return t('pro.conn.errUser');
    if (d.isNew && (records ?? []).some((r) => r.id === idOf(d))) return t('pro.conn.errDuplicate');
    return null;
  };

  /** The record this draft stands for. */
  const recordOf = (d: Draft): IntegrationRecord => {
    const now = Date.now();
    const id = idOf(d);
    const at = d.authType;
    return {
      id, label: d.label.trim(), kind: d.kind, baseUrl: d.baseUrl.trim(), authType: at,
      authHeader: at === 'header' || at === 'prefix' ? d.authHeader.trim() : undefined,
      authPrefix: at === 'prefix' ? d.authPrefix.trim() : undefined,
      authQuery: at === 'query' ? d.authQuery.trim() : undefined,
      authUser: at === 'basic' ? d.authUser.trim() : undefined,
      secretRef: needsSecret(at) ? `int:${id}` : undefined,
      templateId: d.templateId,
      probePath: d.probePath.trim() || undefined,
      enabled: d.enabled, createdAt: d.isNew ? now : d.createdAt, updatedAt: now
    };
  };

  /** What Save does for this draft: validate, write, then say which id. */
  const saveTask = (d: Draft) => async (): Promise<void> => {
    const v = validate(d);
    if (v) throw new Error(v);
    const id = idOf(d);
    const record = recordOf(d);
    const res = await integrationsClient.save(record, d.secret.trim() ? d.secret : undefined);
    if (!res.ok) throw new Error(res.error || t('pro.conn.saveFailed'));
    // A new key has not been tested; the old verdict was for the old key.
    if (d.secret.trim()) recordConnTest(id, null);
    setDraft((x) => (x ? { ...x, secret: '', hasSecret: x.hasSecret || !!d.secret.trim(), isNew: false } : x));
    onSaved(id);
  };

  const sameAsStart = (d: Draft) => !d.isNew && !d.secret && JSON.stringify({ ...d, secret: '' }) === JSON.stringify({ ...start, secret: '' });
  const patch = (p: Partial<Draft>) => {
    if (!draft) return;
    const next = { ...draft, ...p };
    setDraft(next);
    setTypedTest(null);
    settings?.setTask(connTaskId(start?.id ?? next.id), sameAsStart(next) ? null : saveTask(next));
  };
  // A connection being added is the change itself: Save writes it as it is.
  useEffect(() => {
    if (stageOnOpen && start?.isNew && settings && !settings.hasTask(connTaskId(start.id))) settings.setTask(connTaskId(start.id), saveTask(start));
    // Once, for the draft this pane opened with; every edit restages it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removing = !!record && !!settings?.hasTask(connRemoveTaskId(record.id));
  const remove = () => {
    if (!record || !settings) return;
    settings.setTask(connTaskId(record.id), null);
    settings.setTask(connRemoveTaskId(record.id), async () => {
      // The answer is read: a remove that was not done never says it was.
      const r = await integrationsClient.remove(record.id);
      if (!r.ok) throw new Error(t('pro.conn.removeFailed'));
      recordConnTest(record.id, null);
      onRemoved(record.id);
    });
  };
  const undoRemove = () => { if (record) settings?.setTask(connRemoveTaskId(record.id), null); };

  const test = async (id: string) => {
    setBusy(true);
    // Clear the old verdict rather than parking an empty object under the id:
    // a result that is neither pass nor fail would be drawn as one.
    recordConnTest(id, null);
    try { recordConnTest(id, await integrationsClient.test(id)); }
    catch { recordConnTest(id, { ok: false, error: t('pro.conn.testFailed') }); }
    finally { setBusy(false); }
  };

  /** Test connection beside the token: the token typed there when there is one, else the saved one. */
  const canTest = !!draft && (!draft.isNew || !needsSecret(draft.authType) || !!draft.secret.trim());
  const testNow = async () => {
    if (!draft) return;
    if (!draft.isNew && !draft.secret.trim()) { await test(draft.id); return; }
    const bad = validate(draft);
    if (bad) { setTypedTest({ ok: false, error: bad }); return; }
    setBusy(true);
    setTypedTest(null);
    try { setTypedTest(await integrationsClient.testDraft(recordOf(draft), draft.secret)); }
    catch { setTypedTest({ ok: false, error: t('pro.conn.testFailed') }); }
    finally { setBusy(false); }
  };

  const tpl = draft ? resolveTemplate(templates, draft) : undefined;
  return { draft, patch, idOf, tpl, record, removing, remove, undoRemove, test, testNow, canTest, typedTest, busy };
}


/** The Setup of one connection. On or off is the pane header's switch. */
export function ConnectionSetup({ c }: { c: ConnectionDraft }) {
  const { t } = useTranslation();
  const tests = useConnTests();
  const fmtTest = useFmtTest();
  const { draft, patch, idOf, tpl, record, removing, remove, undoRemove, testNow, canTest, typedTest, busy } = c;
  // Read once, so a field does not jump into the fold while it is being typed in.
  const [needs] = useState(() => (draft ? connectNeeds(draft) : { baseUrl: false, user: false }));
  if (!draft) return null;
  const tr = typedTest ?? (draft.isNew ? undefined : tests[draft.id]);
  /** The form of a git credential: its own labels and help, and no choice of how the key is sent. */
  const git = isGitConnection(draft);
  const quietLine: CSSProperties = { fontSize: 12, lineHeight: '18px', color: 'var(--cth-ink-500)' };

  const labelField = (
    <Field label={t('pro.conn.label')} hint={`${t('pro.conn.id')}: ${idOf(draft)}`}>
      <input aria-label={t('pro.conn.label')} value={draft.label} onChange={(e) => patch({ label: e.target.value, ...(draft.isNew ? { id: slugify(e.target.value) } : {}) })} style={{ ...inputStyle, maxWidth: 420 }} />
    </Field>
  );
  const urlField = (
    <Field label={git ? t('office.conn.git.host.label') : t('pro.conn.baseUrl')} hint={git ? t('office.conn.git.host.help') : draft.kind !== 'custom-rest' ? t('pro.conn.baseUrlFixed', { kind: tpl ? templateName(t, tpl) : draft.kind }) : undefined}>
      <input aria-label={git ? t('office.conn.git.host.label') : t('pro.conn.baseUrl')} value={draft.baseUrl} readOnly={draft.kind !== 'custom-rest'} placeholder="https://api.example.com" onChange={(e) => patch({ baseUrl: e.target.value })} style={{ ...monoInputStyle, maxWidth: 520, opacity: draft.kind !== 'custom-rest' ? 0.7 : 1 }} />
    </Field>
  );
  const userField = draft.authType === 'basic' ? (
    <Field label={git ? t('office.conn.git.user.label') : t('pro.conn.user')} hint={git ? t('office.conn.git.user.help') : t('pro.conn.userHint')}>
      <input aria-label={git ? t('office.conn.git.user.label') : t('pro.conn.user')} value={draft.authUser} placeholder="you@example.com" onChange={(e) => patch({ authUser: e.target.value })} style={{ ...monoInputStyle, maxWidth: 320 }} />
    </Field>
  ) : null;
  /* The shape, never the value: apiAuthPreview takes no secret at all. */
  const sendsField = (
    <Field label={t('pro.conn.sends')} hint={draft.authType === 'none' ? undefined : t('pro.conn.sendsMasked')}>
      <pre style={{ ...classicCodeBox, maxHeight: 'none', maxWidth: 520 }}>{apiAuthPreview(authOf(draft)) || t('pro.conn.sendsNothing')}</pre>
    </Field>
  );
  const ownWord = keepsTokenWord(draft.templateId);
  const tokenWord = ownWord && tpl?.secretLabel ? tpl.secretLabel : t('integrations.hub.use.token');
  const tokenHint = [
    !draft.isNew && draft.hasSecret ? t('pro.conn.secretKeep') : '',
    t('integrations.hub.use.tokenSave'),
    ownWord ? tpl?.secretHelp : ''
  ].filter(Boolean).join(' ');
  const actions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <PixelButton variant="secondary" size="sm" disabled={busy || removing || !canTest} onClick={() => { void testNow(); }} dataAttrs={{ 'data-connection-test': draft.id }}>{t('integrations.hub.use.test')}</PixelButton>
      {tpl?.docsUrl && (
        <PixelButton size="sm" variant="ghost" onClick={() => { void window.cth.openExternal(tpl.docsUrl as string); }}>
          {t('pro.conn.docs', { kind: tpl.label })}
        </PixelButton>
      )}
      <span style={{ flex: 1 }} />
      {record && (removing
        ? <PixelButton variant="secondary" size="sm" onClick={undoRemove} dataAttrs={{ 'data-connection-undo': record.id }}>{t('settings.keys.undo')}</PixelButton>
        : <PixelButton size="sm" variant="ghost" onClick={remove} dataAttrs={{ 'data-connection-remove': record.id }}>{t('pro.conn.remove')}</PixelButton>)}
    </div>
  );
  const verdict = tr ? <span style={{ fontSize: 12, color: tr.ok ? 'var(--cth-status-success)' : 'var(--cth-status-blocked)' }} data-connection-verdict={tr.ok ? 'ok' : 'fail'}>{fmtTest(tr)}</span> : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, ...(removing ? { opacity: 0.75 } : {}) }} data-connection-setup={draft.id}>
      {removing && <span style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }} data-connection-removing>{t('integrations.screen.conn.removeOnSave')}</span>}
      {/* A failed Test is why the row needs a look: say it first. */}
      {tr && !tr.ok && (
        <div role="note" style={{ padding: '8px 12px 6px', background: 'var(--cth-cream-100)', boxShadow: 'inset 0 0 0 1px var(--cth-status-blocked)', fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-900)' }} data-connection-failed>
          {fmtTest(tr)}
        </div>
      )}
      {git ? (
        <>
          {labelField}
          {urlField}
          {userField}
          {needsSecret(draft.authType) && (
            <Field
              label={t('office.conn.git.token.label')}
              // A git credential says what agents can do with the token, and no line about how it is kept.
              hint={[!draft.isNew && draft.hasSecret ? t('pro.conn.secretKeep') : '', t('integrations.git.tokenHelp', 'Make a token on this host that can read and write repositories, and limit it to the repositories your agents need. A new token reaches an agent when it is next started.')].filter(Boolean).join(' ')}
            >
              <input aria-label={t('office.conn.git.token.label')} type="password" autoComplete="off" value={draft.secret} onChange={(e) => patch({ secret: e.target.value })} style={{ ...monoInputStyle, maxWidth: 520 }} />
            </Field>
          )}
          {sendsField}
          {actions}
          {verdict}
        </>
      ) : (
        <>
          {needs.baseUrl && urlField}
          {needs.user && userField}
          {needsSecret(draft.authType) && (
            <label style={{ display: 'block', fontSize: 12, color: 'var(--cth-ink-500)' }} data-connection-token>
              {tokenWord}
              <input aria-label={tokenWord} type="password" autoComplete="off" spellCheck={false} value={draft.secret} onChange={(e) => patch({ secret: e.target.value })} style={{ ...inputStyle, display: 'block', maxWidth: 420, margin: '3px 0 6px' }} />
              <span style={{ display: 'block', lineHeight: '18px' }}>{tokenHint}</span>
            </label>
          )}
          {actions}
          {verdict}
          {/* What a preset fills in for itself, folded away. */}
          <details data-connection-more>
            <summary style={{ fontSize: 13, color: 'var(--cth-ink-900)', cursor: 'pointer' }}>{t('integrations.hub.use.moreFields')}</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              {!keepsTokenWord(draft.templateId) && tpl?.secretHelp && <span style={quietLine}>{blankCustom(tpl) ? t('integrations.hub.use.customHelp') : tpl.secretHelp}</span>}
              {labelField}
              {!needs.baseUrl && urlField}
              {/* Every connection's auth is a choice, a preset's included; the
                  preset's own shape (GitHub's) stays first. */}
              <Field label={t('pro.conn.auth')} hint={t(`pro.conn.authWhy.${draft.authType}`)}>
                <select aria-label={t('pro.conn.auth')} value={draft.authType} onChange={(e) => patch({ authType: e.target.value as IntegrationAuthType })} style={{ ...inputStyle, maxWidth: 300 }}>
                  {authChoices(tpl).map((a) => <option key={a} value={a}>{t(`pro.conn.authKind.${a}`)}</option>)}
                </select>
              </Field>
              {(draft.authType === 'header' || draft.authType === 'prefix') && (
                <Field label={t('pro.conn.header')} hint={t('pro.conn.headerHint')}>
                  <input aria-label={t('pro.conn.header')} value={draft.authHeader} placeholder="X-Api-Key" onChange={(e) => patch({ authHeader: e.target.value })} style={{ ...monoInputStyle, maxWidth: 320 }} />
                </Field>
              )}
              {draft.authType === 'prefix' && (
                <Field label={t('pro.conn.prefix')} hint={t('pro.conn.prefixHint')}>
                  <input aria-label={t('pro.conn.prefix')} value={draft.authPrefix} placeholder="Token" onChange={(e) => patch({ authPrefix: e.target.value })} style={{ ...monoInputStyle, maxWidth: 200 }} />
                </Field>
              )}
              {draft.authType === 'query' && (
                <Field label={t('pro.conn.param')} hint={t('pro.conn.paramHint')}>
                  <input aria-label={t('pro.conn.param')} value={draft.authQuery} placeholder="api_key" onChange={(e) => patch({ authQuery: e.target.value })} style={{ ...monoInputStyle, maxWidth: 320 }} />
                </Field>
              )}
              {!needs.user && userField}
              {draft.kind === 'custom-rest' && (
                <Field label={t('pro.conn.probe')} hint={t('pro.conn.probeHint')}>
                  <input aria-label={t('pro.conn.probe')} value={draft.probePath} placeholder={tpl?.probePath ?? 'me'} onChange={(e) => patch({ probePath: e.target.value })} style={{ ...monoInputStyle, maxWidth: 320 }} />
                </Field>
              )}
              {sendsField}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
