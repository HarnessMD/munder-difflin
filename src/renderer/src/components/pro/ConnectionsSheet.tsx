/**
 * Connections in the kit (v0.4.9 phase 5a, rebuilt in phase 6b): the
 * integrations registry the Capabilities screen used to open through the
 * Classic IntegrationsRegistry, over the same client
 * (integrations/registryClient.ts, the renderer's one door to the registry and
 * the secret broker).
 *
 *   list      integrationsClient.list()          secrets redacted to hasSecret
 *   add/edit  integrationsClient.save(rec, key)  upsert, then setSecret when a key was typed
 *   remove    integrationsClient.remove(id)      after a confirm
 *   test      integrationsClient.test(id)        saved records only; the broker probes by id
 *
 * A secret flows one way: from the field into save() and on to the encrypted
 * store. It is never read back, so an edit shows "saved" and a Replace button.
 *
 * WHAT PHASE 6B FIXED (founder, 3 Sep 2026: "the connections modal is broken").
 *
 *   1. THE HEADER OVERFLOWED THE SHEET. The header mapped every template to
 *      its own "Add X" button. That was written when the registry shipped two
 *      templates; it now ships nine, so roughly 930px of buttons that cannot
 *      shrink (each one nowrap) sat in a 720px sheet whose only flexible child
 *      was the title. The title collapsed to nothing, the last buttons were
 *      clipped by the sheet's overflow:hidden, and the close control went with
 *      them. Adding a connection is now ONE button, and choosing the service
 *      is a step of its own, which is also where the provider's own help fits.
 *
 *   2. EVERY CUSTOM API CALLED ITSELF "CUSTOM REST API". The template behind a
 *      record was looked up by KIND, and seven of the nine templates share the
 *      custom-rest kind, so the lookup always answered the second one. Stripe's
 *      "dashboard.stripe.com, Developers, API keys" never reached the screen;
 *      the person got "Point baseUrl at any REST API" instead, and every row
 *      in the list wore the same chip. A record now remembers the template it
 *      came from (shared/integrations resolveTemplate).
 *
 *   3. A SECOND CONNECTION SILENTLY REPLACED THE FIRST. Both "Add Jira"
 *      presses seeded the id `jira`, upsert is by id, and the toast said
 *      "Added Jira" twice while the count stayed at one. Worse, the secretRef
 *      is derived from the id, so the second record inherited the first one's
 *      stored key. A new connection now takes the first free id and a
 *      colliding one is refused before it is written.
 *
 * The auth shapes are ./../../../../shared/apiAuth: the editor draws
 * `apiAuthPreview`, which takes NO secret, so what is on screen cannot be a
 * key even by accident.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_AUTH_MODES, apiAuthPreview, validateApiAuth, type ApiAuth, type ApiAuthMode } from '@shared/apiAuth';
import { apiAuthOf, authTypeNeedsSecret as needsSecret, resolveTemplate } from '@shared/integrations';
import { integrationsClient, slugify, type IntegrationAuthType, type IntegrationKind, type IntegrationRecord, type IntegrationRecordView, type IntegrationTemplate, type TestResult } from '@/integrations/registryClient';
import { Btn, Card, Chip, CloseX, CodeBox, ConfirmDialog, Field, SelectBox, SetupEmpty, Sheet, Switch, inputStyle, monoInputStyle, proToast } from './ui';
import { ProIcon } from './icons';
import { useTechnical } from './depth';

interface Draft {
  isNew: boolean; id: string; label: string; kind: IntegrationKind; baseUrl: string; authType: IntegrationAuthType;
  authHeader: string; authPrefix: string; authQuery: string; authUser: string;
  templateId?: string; enabled: boolean; hasSecret: boolean; createdAt: number; secret: string;
}

/** The shapes a person may choose for a custom REST API. `github` is not here:
 *  it is the GitHub preset's shape, set by the template, not a choice. */
const CUSTOM_AUTH: readonly ApiAuthMode[] = API_AUTH_MODES;

const authOf = (d: Draft): ApiAuth => apiAuthOf(d);

export function ConnectionsSheet({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const [templates, setTemplates] = useState<IntegrationTemplate[]>([]);
  const [records, setRecords] = useState<IntegrationRecordView[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removeAsk, setRemoveAsk] = useState<IntegrationRecordView | null>(null);
  const [tests, setTests] = useState<Record<string, TestResult>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const refresh = async () => { try { setRecords(await integrationsClient.list()); } catch { setRecords([]); } };
  useEffect(() => {
    let alive = true;
    Promise.all([integrationsClient.listTemplates(), integrationsClient.list()])
      .then(([tpls, recs]) => { if (alive) { setTemplates(tpls); setRecords(recs); } })
      .catch(() => { if (alive) setRecords([]); });
    return () => { alive = false; };
  }, []);

  const usable = (r: { enabled: boolean; authType: IntegrationAuthType; hasSecret: boolean }) => r.enabled && (!needsSecret(r.authType) || r.hasSecret);

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

  const startAdd = (tpl: IntegrationTemplate) => {
    setErr('');
    setPicking(false);
    setDraft({
      isNew: true, id: freeId(tpl.idSuggestion || tpl.label), label: tpl.label, kind: tpl.kind, baseUrl: tpl.baseUrl,
      authType: tpl.authType, authHeader: tpl.authHeader ?? '', authPrefix: tpl.authPrefix ?? '', authQuery: tpl.authQuery ?? '', authUser: tpl.authUser ?? '',
      templateId: tpl.idSuggestion, enabled: true, hasSecret: false, createdAt: Date.now(), secret: ''
    });
  };
  const startEdit = (r: IntegrationRecordView) => {
    setErr('');
    setPicking(false);
    setDraft({
      isNew: false, id: r.id, label: r.label, kind: r.kind, baseUrl: r.baseUrl, authType: r.authType,
      authHeader: r.authHeader ?? '', authPrefix: r.authPrefix ?? '', authQuery: r.authQuery ?? '', authUser: r.authUser ?? '',
      templateId: r.templateId, enabled: r.enabled, hasSecret: r.hasSecret, createdAt: r.createdAt, secret: ''
    });
  };
  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  /** An existing record keeps the id it was written under: re-slugging one
   *  would write a SECOND record and leave the first behind with the key. */
  const idOf = (d: Draft) => (d.isNew ? slugify(d.id || d.label) : d.id);

  const validate = (d: Draft): string | null => {
    if (!d.label.trim()) return t('pro.conn.errLabel');
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

  const save = async () => {
    if (!draft) return;
    const v = validate(draft);
    if (v) { setErr(v); return; }
    const now = Date.now();
    const id = idOf(draft);
    const at = draft.authType;
    const record: IntegrationRecord = {
      id, label: draft.label.trim(), kind: draft.kind, baseUrl: draft.baseUrl.trim(), authType: at,
      authHeader: at === 'header' || at === 'prefix' ? draft.authHeader.trim() : undefined,
      authPrefix: at === 'prefix' ? draft.authPrefix.trim() : undefined,
      authQuery: at === 'query' ? draft.authQuery.trim() : undefined,
      authUser: at === 'basic' ? draft.authUser.trim() : undefined,
      secretRef: needsSecret(at) ? `int:${id}` : undefined,
      templateId: draft.templateId,
      enabled: draft.enabled, createdAt: draft.isNew ? now : draft.createdAt, updatedAt: now
    };
    setBusy('save'); setErr('');
    try {
      const res = await integrationsClient.save(record, draft.secret.trim() ? draft.secret : undefined);
      if (!res.ok) { setErr(res.error || t('pro.conn.saveFailed')); return; }
      proToast(draft.isNew ? t('pro.conn.added', { label: record.label }) : t('pro.conn.updated', { label: record.label }), { tone: 'ok' });
      setDraft(null);
      await refresh();
      onChanged?.();
    } catch { setErr(t('pro.conn.saveFailed')); }
    finally { setBusy(null); }
  };
  const remove = async (r: IntegrationRecordView) => {
    setRemoveAsk(null);
    setBusy(r.id);
    try { await integrationsClient.remove(r.id); proToast(t('pro.conn.removed', { label: r.label })); await refresh(); onChanged?.(); }
    catch { proToast(t('pro.conn.removeFailed'), { tone: 'bad' }); }
    finally { setBusy(null); }
  };
  const test = async (id: string) => {
    setBusy(`test:${id}`);
    // Clear the old verdict rather than parking an empty object under the id:
    // a result that is neither pass nor fail would be drawn as one.
    setTests((m) => { const next = { ...m }; delete next[id]; return next; });
    try { const res = await integrationsClient.test(id); setTests((m) => ({ ...m, [id]: res })); }
    catch { setTests((m) => ({ ...m, [id]: { ok: false, error: t('pro.conn.testFailed') } })); }
    finally { setBusy(null); }
  };
  const fmtTest = (r: TestResult) => r.ok ? (r.status ? t('pro.conn.okStatus', { status: r.status }) : t('pro.conn.ok')) : t('pro.conn.fail', { error: [r.error, r.status].filter(Boolean).join(' ') });

  const tpl = draft ? resolveTemplate(templates, draft) : undefined;
  const labelOf = (r: IntegrationRecordView) => resolveTemplate(templates, r)?.label ?? t(`pro.conn.kind.${r.kind}`);

  const title = draft ? (draft.isNew ? t('pro.conn.add') : draft.label) : picking ? t('pro.conn.pickTitle') : t('pro.caps.connections');
  const sub = draft ? (tpl?.label ?? t(`pro.conn.kind.${draft.kind}`)) : picking ? t('pro.conn.pickSub') : t('pro.conn.sub');

  return (
    <Sheet onClose={onClose} width={720}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h2>
          <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
        </div>
        <CloseX onClick={onClose} title={t('common.close')} />
      </div>

      {draft ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('pro.conn.label')} hint={technical ? `${t('pro.conn.id')}: ${idOf(draft)}` : undefined}>
            <input aria-label={t('pro.conn.label')} value={draft.label} onChange={(e) => patch({ label: e.target.value, ...(draft.isNew ? { id: slugify(e.target.value) } : {}) })} style={inputStyle} />
          </Field>
          <Field label={t('pro.conn.baseUrl')} hint={draft.kind !== 'custom-rest' ? t('pro.conn.baseUrlFixed', { kind: tpl?.label ?? draft.kind }) : undefined}>
            <input aria-label={t('pro.conn.baseUrl')} value={draft.baseUrl} readOnly={draft.kind !== 'custom-rest'} placeholder="https://api.example.com" onChange={(e) => patch({ baseUrl: e.target.value })} style={{ ...monoInputStyle, opacity: draft.kind !== 'custom-rest' ? 0.7 : 1 }} />
          </Field>

          <Field label={t('pro.conn.auth')} hint={draft.kind === 'custom-rest' ? t(`pro.conn.authWhy.${draft.authType}`) : t('pro.conn.authFixed')}>
            {draft.kind === 'custom-rest'
              ? <SelectBox ariaLabel={t('pro.conn.auth')} value={draft.authType as ApiAuthMode} onChange={(v) => patch({ authType: v })} options={CUSTOM_AUTH.map((a) => ({ value: a, label: t(`pro.conn.authKind.${a}`) }))} style={{ maxWidth: 300 }} />
              : <span style={{ fontSize: 12.5, color: 'var(--cth-ink-700)' }}>{t(`pro.conn.authKind.${draft.authType}`)}</span>}
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
          {draft.authType === 'basic' && (
            <Field label={t('pro.conn.user')} hint={t('pro.conn.userHint')}>
              <input aria-label={t('pro.conn.user')} value={draft.authUser} placeholder="you@example.com" onChange={(e) => patch({ authUser: e.target.value })} style={{ ...monoInputStyle, maxWidth: 320 }} />
            </Field>
          )}

          {needsSecret(draft.authType) && (
            <Field label={tpl?.secretLabel ?? t('pro.conn.secret')} hint={[!draft.isNew && draft.hasSecret ? t('pro.conn.secretKeep') : t('pro.conn.secretNote'), tpl?.secretHelp].filter(Boolean).join(' ')}>
              <input aria-label={tpl?.secretLabel ?? t('pro.conn.secret')} type="password" autoComplete="off" value={draft.secret} onChange={(e) => patch({ secret: e.target.value })} style={monoInputStyle} />
            </Field>
          )}

          {/* The shape, never the value: apiAuthPreview takes no secret at all. */}
          <Field label={t('pro.conn.sends')} hint={draft.authType === 'none' ? undefined : t('pro.conn.sendsMasked')}>
            <CodeBox style={{ maxHeight: 'none' }}>{apiAuthPreview(authOf(draft)) || t('pro.conn.sendsNothing')}</CodeBox>
          </Field>

          <Field label={t('pro.conn.enabled')} hint={t('pro.conn.enabledHint')}>
            <div><Switch on={draft.enabled} onChange={(v) => patch({ enabled: v })} label={t('pro.conn.enabled')} /></div>
          </Field>

          {tpl?.docsUrl && (
            <Btn size="sm" kind="ghost" style={{ alignSelf: 'flex-start' }} onClick={() => { void window.cth.openExternal(tpl.docsUrl as string); }}>
              <ProIcon name="external" size={13} />{t('pro.conn.docs', { kind: tpl.label })}
            </Btn>
          )}
        </div>
      ) : picking ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', alignContent: 'start' }}>
          {templates.map((x) => (
            <Card key={x.idSuggestion} onClick={() => startAdd(x)} ariaLabel={t('pro.conn.addKind', { kind: x.label })} style={{ padding: '12px 14px', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <b style={{ fontWeight: 600, fontSize: 13, color: 'var(--cth-ink-900)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.label}</b>
                <Chip tone="muted">{t(`pro.conn.authKind.${x.authType}`)}</Chip>
              </div>
              <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, color: 'var(--cth-ink-500)', overflowWrap: 'anywhere' }}>{x.baseUrl || t('pro.conn.youChooseUrl')}</code>
              {x.secretHelp && <small style={{ fontSize: 11.5, color: 'var(--cth-ink-700)', lineHeight: 1.45 }}>{x.secretHelp}</small>}
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records === null ? <Muted>{t('pro.conn.loading')}</Muted>
          : records.length === 0 ? (
            <SetupEmpty icon="capabilities" title={t('pro.conn.emptyTitle')} lead={t('pro.conn.empty')}
              steps={[t('pro.conn.step1'), t('pro.conn.step2'), t('pro.conn.step3')]} />
          )
          : records.map((r) => {
            const ok = usable(r);
            const tr = tests[r.id];
            return (
              <div key={r.id} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <b style={{ fontWeight: 600, fontSize: 13, color: 'var(--cth-ink-900)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</b>
                  <Chip tone="muted">{labelOf(r)}</Chip>
                  {!r.enabled ? <Chip tone="outline">{t('common.off')}</Chip> : ok ? <Chip tone="ok">{t('common.on')}</Chip> : <Chip tone="warn">{t('pro.caps.needsKey')}</Chip>}
                </div>
                <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, color: 'var(--cth-ink-500)', overflowWrap: 'anywhere' }}>{r.baseUrl}{technical ? `  ${r.id}` : ''}</code>
                <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, color: 'var(--cth-ink-500)', overflowWrap: 'anywhere' }}>{apiAuthPreview(apiAuthOf(r)) || t('pro.conn.sendsNothing')}</code>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Btn size="sm" disabled={busy === `test:${r.id}`} onClick={() => { void test(r.id); }}>{t('pro.conn.test')}</Btn>
                  <Btn size="sm" kind="ghost" onClick={() => startEdit(r)}>{t('pro.conn.edit')}</Btn>
                  <Btn size="sm" kind="ghost" disabled={busy === r.id} onClick={() => setRemoveAsk(r)}>{t('pro.conn.remove')}</Btn>
                  {tr && <span style={{ fontSize: 12, color: tr.ok ? 'var(--cth-status-success)' : 'var(--cth-status-blocked)' }}>{fmtTest(tr)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)' }}>
        {draft ? (
          <>
            {err && <span style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }}>{err}</span>}
            {!draft.isNew && tests[draft.id] && <span style={{ fontSize: 12, color: tests[draft.id].ok ? 'var(--cth-status-success)' : 'var(--cth-status-blocked)' }}>{fmtTest(tests[draft.id])}</span>}
            <span style={{ flex: 1 }} />
            {!draft.isNew && <Btn size="sm" disabled={busy === `test:${draft.id}`} onClick={() => { void test(draft.id); }}>{t('pro.conn.test')}</Btn>}
            <Btn size="sm" onClick={() => { setDraft(null); setErr(''); }}>{t('pro.dialog.cancel')}</Btn>
            <Btn size="sm" kind="primary" disabled={busy === 'save'} onClick={() => { void save(); }}>{t('common.save')}</Btn>
          </>
        ) : picking ? (
          <>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.conn.pickFoot')}</span>
            <Btn size="sm" onClick={() => setPicking(false)}>{t('pro.dialog.cancel')}</Btn>
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--cth-ink-500)' }}>
              {records && records.length > 0 ? t('pro.conn.countLine', { count: records.length, usable: records.filter(usable).length }) : ''}
            </span>
            <Btn size="sm" kind="primary" disabled={templates.length === 0} onClick={() => setPicking(true)}>
              <ProIcon name="plus" size={13} />{t('pro.conn.add')}
            </Btn>
          </>
        )}
      </div>

      {removeAsk && (
        <ConfirmDialog danger title={t('pro.conn.removeTitle', { label: removeAsk.label })} body={t('pro.conn.removeBody')} confirmLabel={t('pro.conn.remove')}
          onConfirm={() => { void remove(removeAsk); }} onClose={() => setRemoveAsk(null)} />
      )}
    </Sheet>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{children}</span>;
}
