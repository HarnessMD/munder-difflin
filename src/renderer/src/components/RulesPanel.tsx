/**
 * Settings > Rules: the one place the guardrail is turned on and its rules change.
 *
 * A rule is a principle (the sentence every targeted agent is given) and may have a
 * backstop (what the hook checks on every tool call). Both live in hive/policy/
 * guardrail.json. Main reads, checks, writes and reloads it (guardrailEditor.ts); this
 * screen only edits a draft and sends the whole file back with the fingerprint of the
 * file it showed, so a file changed elsewhere is never overwritten or approved unseen.
 *
 * The look is the Settings form's own (settings/classicChrome.ts), and every word is a
 * `rulesPanel.` key in the locale files. Errors that main sends back are shown as main
 * wrote them, as on the other Settings sections.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { PixelButton } from './PixelButton';
import { setLeaveGuard } from './settings/leaveGuard';
import { settingsKit } from './settings/classicChrome';
import type { BackstopDoes, GuardrailFile, GuardrailResult, GuardrailRule, GuardrailView } from '../../../shared/guardrail';
import { DOES, describeBackstop, doesLabel, emptyDraft, fromDraft, statusLine, toDraft, type Draft, type Tr } from './rulesView';

const kit = settingsKit;
const row: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' };
const field: CSSProperties = { ...kit.input, height: 'auto', fontFamily: 'var(--cth-font-mono)', fontSize: 12 };
const text: CSSProperties = { fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: 1.5 };
const small: CSSProperties = { fontSize: 11, color: 'var(--cth-ink-500)', lineHeight: 1.5 };
const bad: CSSProperties = { ...kit.errorText, fontSize: 12 };

export function RulesPanel() {
  const { t: i18nT } = useTranslation();
  const t: Tr = (key, vars) => i18nT(key, vars);
  const agents = useStore((s) => s.agents);
  const [view, setView] = useState<GuardrailView | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A rule being edited is not dropped without a word when Settings closes or another
  // section is picked (settings/leaveGuard.ts). The effect returns the guard's remover.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const tRef = useRef(t);
  tRef.current = t;
  useEffect(() => setLeaveGuard((proceed) => {
    if (!draftRef.current) return false;
    if (window.confirm(tRef.current('rulesPanel.confirmDrop'))) { setDraft(null); proceed(); }
    return true;
  }), []);

  const targetable = useMemo(
    () => agents.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name })),
    [agents]
  );

  const load = useCallback(async () => {
    try {
      setView(await window.cth.guardrailRead());
      setLoadErr(null);
    } catch (e) {
      setView(null);
      setLoadErr(tRef.current('rulesPanel.loadFailed', { error: e instanceof Error ? e.message : String(e) }));
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const rules = view?.file?.rules ?? [];
  const status = statusLine(view, t);
  /** A broken file is not edited here (main refuses too): it may hold rules this screen
   *  never saw. Fix it by hand or delete it. */
  const locked = !!view?.error;

  /** Run one main-side change, then show what main says the state is now. */
  const run = useCallback(async (act: () => Promise<GuardrailResult>, done: string) => {
    setBusy(true); setErrors([]); setNote(null);
    try {
      const out = await act();
      if (out.ok) { setDraft(null); setView(out.view); setNote(done); }
      else setErrors(out.errors);
    } catch (e) { setErrors([e instanceof Error ? e.message : String(e)]); }
    setBusy(false);
    if (!view) await load();
  }, [view, load]);

  const save = (nextRules: GuardrailRule[], done: string) => {
    if (!view) return;
    const base: GuardrailFile = view.file ?? { version: 1, rev: 0, rules: [] };
    void run(() => window.cth.guardrailSave({ ...base, rules: nextRules }, view.stamp), done);
  };

  const saveDraft = () => {
    if (!draft) return;
    const prev = rules.find((r) => r.id === draft.id);
    const rule = fromDraft(draft, prev);
    if (!draft.allAgents && !draft.picked.length) { setErrors([t('rulesPanel.pickAgent')]); return; }
    if (draft.isNew && rules.some((r) => r.id === rule.id)) { setErrors([t('rulesPanel.idExists', { id: rule.id })]); return; }
    save(draft.isNew ? [...rules, rule] : rules.map((r) => (r.id === draft.id ? rule : r)),
      draft.isNew ? t('rulesPanel.ruleAdded') : t('rulesPanel.ruleSaved'));
  };

  const setDoes = (r: GuardrailRule, does: BackstopDoes) => {
    const b = r.backstop;
    if (!b || b.does === does) return;
    save(rules.map((x) => (x.id === r.id ? { ...x, backstop: { ...b, does } } : x)),
      t('rulesPanel.nowDoes', { id: r.id, does: doesLabel(does, t) }));
  };

  const toggle = (r: GuardrailRule) => {
    const b = r.backstop;
    if (!b) return;
    save(rules.map((x) => (x.id === r.id ? { ...x, backstop: { ...b, on: !b.on } } : x)),
      b.on ? t('rulesPanel.backstopTurnedOff') : t('rulesPanel.backstopTurnedOn'));
  };

  const remove = (r: GuardrailRule) => {
    if (!window.confirm(t('rulesPanel.confirmDelete', { principle: r.principle }))) return;
    save(rules.filter((x) => x.id !== r.id), t('rulesPanel.ruleDeleted'));
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const nameOf = (id: string) => targetable.find((a) => a.id === id)?.name ?? id;
  const startEdit = (d: Draft) => { setDraft(d); setErrors([]); setNote(null); };
  const canEdit = !!view && !busy && !draft && !locked;
  const doesOptions = DOES.map((d) => <option key={d.v} value={d.v}>{doesLabel(d.v, t)}</option>);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={kit.sectionHeadFlush}>{t('rulesPanel.heading')}</div>
      <div style={{ ...kit.panel, flexDirection: 'row', ...row, justifyContent: 'space-between' }}>
        <div style={status.bad || loadErr ? bad : text}>{loadErr ?? status.text}</div>
        {view && (
          <div style={row}>
            {(!view.on || !view.exists) && (
              <PixelButton variant="primary" size="sm" disabled={busy || locked} onClick={() => void run(() => window.cth.guardrailTurnOn(view.stamp), t('rulesPanel.turnedOn'))}>
                {view.on ? t('rulesPanel.addStarter') : t('rulesPanel.turnOn')}
              </PixelButton>
            )}
            {(view.on || view.engine.rulesLoaded > 0) && (
              <PixelButton variant="secondary" size="sm" disabled={busy} onClick={() => void run(() => window.cth.guardrailTurnOff(), t('rulesPanel.turnedOff'))}>{t('rulesPanel.turnOff')}</PixelButton>
            )}
          </div>
        )}
      </div>
      {view && !view.exists && <div style={small}>{t('rulesPanel.starterNote')}</div>}
      {view && !view.on && view.exists && !locked && <div style={small}>{t('rulesPanel.fileThere')}</div>}
      {view?.on && view.exists && !view.approved && !locked && view.stamp && (
        <div style={{ ...kit.panel, flexDirection: 'row', ...row, justifyContent: 'space-between' }}>
          <div style={text}>{t('rulesPanel.changedOutside')}</div>
          <PixelButton variant="primary" size="sm" disabled={busy} onClick={() => void run(() => window.cth.guardrailAccept(view.stamp as string), t('rulesPanel.accepted'))}>{t('rulesPanel.accept')}</PixelButton>
        </div>
      )}
      {view?.text && !locked && (!view.on || !view.approved) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={kit.label}>{t('rulesPanel.wholeFile')}</div>
          <pre style={{ ...kit.codeBox, margin: 0, maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{view.text}</pre>
        </div>
      )}
      {note && <div style={text}>{note}</div>}
      {errors.length > 0 && !draft && <div style={{ ...kit.panel, ...bad }}>{errors.map((e) => <div key={e}>{e}</div>)}</div>}

      {(rules.length > 0 || view?.exists) && (
        <div style={{ ...row, justifyContent: 'space-between' }}>
          <div style={kit.label}>{t('rulesPanel.rulesHead')}</div>
          <PixelButton variant="secondary" size="sm" disabled={!canEdit} onClick={() => startEdit(emptyDraft())}>{t('rulesPanel.addRule')}</PixelButton>
        </div>
      )}

      {view?.file?.defaults?.on_error === 'deny' && <div style={bad}>{t('rulesPanel.onErrorDeny')}</div>}
      {rules.map((r) => (
        <div key={r.id} style={{ ...kit.panel, gap: 6 }}>
          <div style={{ ...row, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>{r.principle}</div>
            <div style={{ ...small, whiteSpace: 'nowrap' }}>{r.agents === 'all' ? t('rulesPanel.allAgentsShort') : r.agents.map(nameOf).join(', ')}</div>
          </div>
          <div style={{ ...small, fontFamily: 'var(--cth-font-mono)', overflowWrap: 'anywhere' }}>{describeBackstop(r, t)}</div>
          {r.backstop?.message && <div style={{ ...small, overflowWrap: 'anywhere' }}>{t('rulesPanel.toldWhenStopped', { message: r.backstop.message })}</div>}
          {r.why && <div style={{ ...small, overflowWrap: 'anywhere' }}>{t('rulesPanel.why', { why: r.why })}</div>}
          <div style={{ ...row, flexWrap: 'wrap' }}>
            {r.backstop && (
              <>
                <select aria-label={t('rulesPanel.whatDoes', { id: r.id })} value={r.backstop.does} disabled={!canEdit}
                  onChange={(e) => setDoes(r, e.target.value as BackstopDoes)} style={{ ...kit.input, width: 'auto' }}>
                  {doesOptions}
                </select>
                <PixelButton variant="secondary" size="sm" disabled={!canEdit} onClick={() => toggle(r)}>
                  {r.backstop.on ? t('rulesPanel.backstopOff') : t('rulesPanel.backstopOn')}
                </PixelButton>
              </>
            )}
            <PixelButton variant="secondary" size="sm" disabled={!canEdit} onClick={() => startEdit(toDraft(r))}>{t('rulesPanel.edit')}</PixelButton>
            <PixelButton variant="destructive" size="sm" disabled={!canEdit} onClick={() => remove(r)}>{t('rulesPanel.delete')}</PixelButton>
          </div>
        </div>
      ))}

      {draft && (
        <div style={kit.panel}>
          <div style={kit.label}>{draft.isNew ? t('rulesPanel.newRule') : t('rulesPanel.editRule', { id: draft.id })}</div>
          <div style={kit.label}>{t('rulesPanel.principleLabel')}</div>
          <textarea style={{ ...field, minHeight: 48, resize: 'vertical' }} value={draft.principle}
            onChange={(e) => set({ principle: e.target.value })} placeholder={t('rulesPanel.principlePh')} />
          <div style={kit.label}>{t('rulesPanel.appliesTo')}</div>
          <div style={{ ...row, flexWrap: 'wrap', ...text }}>
            <label><input type="checkbox" checked={draft.allAgents} onChange={(e) => set({ allAgents: e.target.checked })} /> {t('rulesPanel.allAgents')}</label>
            {!draft.allAgents && targetable.map((a) => (
              <label key={a.id}>
                <input type="checkbox" checked={draft.picked.includes(a.id)}
                  onChange={(e) => set({ picked: e.target.checked ? [...draft.picked, a.id] : draft.picked.filter((x) => x !== a.id) })} /> {a.name}
              </label>
            ))}
          </div>
          <label style={text}>
            <input type="checkbox" checked={draft.hasBackstop} onChange={(e) => set({ hasBackstop: e.target.checked })} />{' '}
            {t('rulesPanel.addBackstop')}
          </label>
          {draft.hasBackstop && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingInlineStart: 12 }}>
              <div style={{ ...row, ...text }}>
                <span>{t('rulesPanel.whatItDoes')}</span>
                <select value={draft.does} onChange={(e) => set({ does: e.target.value as BackstopDoes })} style={{ ...kit.input, width: 'auto' }}>
                  {doesOptions}
                </select>
                <label><input type="checkbox" checked={draft.on} onChange={(e) => set({ on: e.target.checked })} /> {t('rulesPanel.on')}</label>
              </div>
              {draft.does === 'log' && <div style={small}>{t('rulesPanel.logNote')}</div>}
              {draft.does === 'ask' && <div style={small}>{t('rulesPanel.askNote')}</div>}
              <div style={kit.label}>{t('rulesPanel.toolLabel')}</div>
              <input style={field} value={draft.tool} onChange={(e) => set({ tool: e.target.value })} placeholder="Bash" />
              <div style={kit.label}>{t('rulesPanel.commandLabel')}</div>
              <input style={field} value={draft.commandMatches} onChange={(e) => set({ commandMatches: e.target.value })} placeholder="^git\s+push\b" />
              <div style={kit.label}>{t('rulesPanel.pathLabel')}</div>
              <input style={field} value={draft.pathGlob} onChange={(e) => set({ pathGlob: e.target.value })} placeholder="**/secrets/**" />
              <div style={kit.label}>{t('rulesPanel.messageLabel')}</div>
              <input style={field} value={draft.message} onChange={(e) => set({ message: e.target.value })} placeholder={t('rulesPanel.messagePh')} />
            </div>
          )}
          {errors.length > 0 && <div style={bad}>{errors.map((e) => <div key={e}>{e}</div>)}</div>}
          <div style={row}>
            <PixelButton variant="primary" size="sm" disabled={busy || !draft.principle.trim()} onClick={saveDraft}>{busy ? t('rulesPanel.saving') : t('rulesPanel.save')}</PixelButton>
            <PixelButton variant="secondary" size="sm" disabled={busy} onClick={() => { setDraft(null); setErrors([]); }}>{t('rulesPanel.cancel')}</PixelButton>
          </div>
        </div>
      )}
      <div style={small}>{t('rulesPanel.footerNote')}</div>
    </div>
  );
}
