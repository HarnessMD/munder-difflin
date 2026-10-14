/**
 * Settings > Rules: the one place the guardrail is turned on and its rules change.
 *
 * A rule is a principle (the sentence every targeted agent is given) and may have a
 * backstop (what the hook checks on every tool call). Both live in hive/policy/
 * guardrail.json. Main reads, checks, writes and reloads it (guardrailEditor.ts); this
 * screen only edits a draft and sends the whole file back with the fingerprint of the
 * file it showed, so a file changed elsewhere is never overwritten or approved unseen.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useStore } from '@/store/store';
import { PixelButton } from './PixelButton';
import type { BackstopDoes, GuardrailFile, GuardrailResult, GuardrailRule, GuardrailView } from '../../../shared/guardrail';
import { DOES, describeBackstop, emptyDraft, fromDraft, statusLine, toDraft, type Draft } from './rulesView';

const row: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' };
const label: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
  color: 'var(--cth-ink-500)', textTransform: 'uppercase',
};
const box: CSSProperties = { border: '2px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', padding: 10 };
const input: CSSProperties = {
  width: '100%', padding: '6px 8px', fontFamily: 'var(--cth-font-mono)', fontSize: 12,
  border: '2px solid var(--cth-ink-300)', background: 'var(--cth-paper-100)', color: 'var(--cth-ink-900)',
};
const text: CSSProperties = { fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: 1.5 };
const bad: CSSProperties = { color: 'var(--cth-coral)', fontWeight: 600 };
const small: CSSProperties = { fontSize: 11, color: 'var(--cth-ink-500)' };

export function RulesPanel() {
  const agents = useStore((s) => s.agents);
  const [view, setView] = useState<GuardrailView | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const targetable = useMemo(
    () => agents.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name })),
    [agents]
  );

  const load = useCallback(async () => {
    try {
      setView(await window.cth.guardrailRead());
      setLoadErr(null);
    } catch (e) { setView(null); setLoadErr(`Could not read the rules: ${e instanceof Error ? e.message : String(e)}`); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const rules = view?.file?.rules ?? [];
  const status = statusLine(view);
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
    if (!draft.allAgents && !draft.picked.length) { setErrors(['Pick at least one agent, or choose all agents.']); return; }
    if (draft.isNew && rules.some((r) => r.id === rule.id)) { setErrors([`A rule with the id "${rule.id}" already exists.`]); return; }
    save(draft.isNew ? [...rules, rule] : rules.map((r) => (r.id === draft.id ? rule : r)), draft.isNew ? 'Rule added.' : 'Rule saved.');
  };

  const setDoes = (r: GuardrailRule, does: BackstopDoes) => {
    const b = r.backstop;
    if (!b || b.does === does) return;
    save(rules.map((x) => (x.id === r.id ? { ...x, backstop: { ...b, does } } : x)), `${r.id}: now ${DOES.find((d) => d.v === does)?.label ?? does}.`);
  };

  const toggle = (r: GuardrailRule) => {
    const b = r.backstop;
    if (!b) return;
    save(rules.map((x) => (x.id === r.id ? { ...x, backstop: { ...b, on: !b.on } } : x)), b.on ? 'Backstop turned off.' : 'Backstop turned on.');
  };

  const remove = (r: GuardrailRule) => {
    if (!window.confirm(`Delete the rule "${r.principle}"?`)) return;
    save(rules.filter((x) => x.id !== r.id), 'Rule deleted.');
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const nameOf = (id: string) => targetable.find((a) => a.id === id)?.name ?? id;
  const startEdit = (d: Draft) => { setDraft(d); setErrors([]); setNote(null); };
  const canEdit = !!view && !busy && !draft && !locked;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={label}>Guardrail</div>
      <div style={{ ...box, ...row, justifyContent: 'space-between' }}>
        <div style={{ ...text, ...(status.bad || loadErr ? bad : {}) }}>{loadErr ?? status.text}</div>
        {view && (
          <div style={row}>
            {(!view.on || !view.exists) && (
              <PixelButton variant="primary" size="sm" disabled={busy || locked} onClick={() => void run(() => window.cth.guardrailTurnOn(view.stamp), 'Guardrail on.')}>
                {view.on ? 'Add the starter rules' : 'Turn on guardrail'}
              </PixelButton>
            )}
            {view.on && (
              <PixelButton variant="secondary" size="sm" disabled={busy} onClick={() => void run(() => window.cth.guardrailTurnOff(), 'Guardrail off. Agents are told their rules were removed.')}>Turn off</PixelButton>
            )}
          </div>
        )}
      </div>
      {view && !view.exists && (
        <div style={small}>
          Turning it on adds three starter rules, all set to Log only: agents write only in their own folder;
          no mempalace sync or repair; pushing is your call. Make one Block or Ask me when you are ready.
        </div>
      )}
      {view && !view.on && view.exists && !locked && (
        <div style={small}>
          A rules file is already there. Read the rules below: turning the guardrail on uses exactly these.
        </div>
      )}
      {view?.on && view.exists && !view.approved && !locked && view.stamp && (
        <div style={{ ...box, ...row, justifyContent: 'space-between' }}>
          <div style={text}>
            Someone changed the rules file outside this screen. If nobody did it by hand, an agent did. Read the
            rules below before you accept them.
          </div>
          <PixelButton variant="primary" size="sm" disabled={busy} onClick={() => void run(() => window.cth.guardrailAccept(view.stamp as string), 'Accepted. These rules are in effect now.')}>Accept these rules</PixelButton>
        </div>
      )}
      {view?.text && !locked && (!view.on || !view.approved) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={label}>The whole file, exactly as it will be used</div>
          <pre style={{ ...input, margin: 0, maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{view.text}</pre>
        </div>
      )}
      {note && <div style={text}>{note}</div>}
      {errors.length > 0 && !draft && <div style={{ ...box, ...bad, fontSize: 12 }}>{errors.map((e) => <div key={e}>{e}</div>)}</div>}

      {(rules.length > 0 || view?.exists) && (
        <div style={{ ...row, justifyContent: 'space-between' }}>
          <div style={label}>Rules</div>
          <PixelButton variant="secondary" size="sm" disabled={!canEdit} onClick={() => startEdit(emptyDraft())}>+ Add rule</PixelButton>
        </div>
      )}

      {view?.file?.defaults?.on_error === 'deny' && (
        <div style={{ ...text, ...bad }}>A backstop that cannot be checked counts as a match (defaults.on_error: deny).</div>
      )}
      {rules.map((r) => (
        <div key={r.id} style={{ ...box, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ ...row, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>{r.principle}</div>
            <div style={{ ...small, whiteSpace: 'nowrap' }}>{r.agents === 'all' ? 'all agents' : r.agents.map(nameOf).join(', ')}</div>
          </div>
          <div style={{ ...small, fontFamily: 'var(--cth-font-mono)', overflowWrap: 'anywhere' }}>{describeBackstop(r)}</div>
          {r.backstop?.message && <div style={{ ...small, overflowWrap: 'anywhere' }}>Agents are told when stopped: &quot;{r.backstop.message}&quot;</div>}
          {r.why && <div style={{ ...small, overflowWrap: 'anywhere' }}>Why: {r.why}</div>}
          <div style={{ ...row, flexWrap: 'wrap' }}>
            {r.backstop && (
              <>
                <select aria-label={`What ${r.id} does`} value={r.backstop.does} disabled={!canEdit}
                  onChange={(e) => setDoes(r, e.target.value as BackstopDoes)} style={{ fontSize: 12 }}>
                  {DOES.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
                </select>
                <PixelButton variant="secondary" size="sm" disabled={!canEdit} onClick={() => toggle(r)}>
                  {r.backstop.on ? 'Backstop off' : 'Backstop on'}
                </PixelButton>
              </>
            )}
            <PixelButton variant="secondary" size="sm" disabled={!canEdit} onClick={() => startEdit(toDraft(r))}>Edit</PixelButton>
            <PixelButton variant="destructive" size="sm" disabled={!canEdit} onClick={() => remove(r)}>Delete</PixelButton>
          </div>
        </div>
      ))}

      {draft && (
        <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={label}>{draft.isNew ? 'New rule' : `Edit rule ${draft.id}`}</div>
          <div style={label}>Principle: what your agents are told</div>
          <textarea style={{ ...input, minHeight: 48 }} value={draft.principle}
            onChange={(e) => set({ principle: e.target.value })} placeholder="Do not push without my approval." />
          <div style={label}>Applies to</div>
          <div style={{ ...row, flexWrap: 'wrap', ...text }}>
            <label><input type="checkbox" checked={draft.allAgents} onChange={(e) => set({ allAgents: e.target.checked })} /> All agents</label>
            {!draft.allAgents && targetable.map((a) => (
              <label key={a.id}>
                <input type="checkbox" checked={draft.picked.includes(a.id)}
                  onChange={(e) => set({ picked: e.target.checked ? [...draft.picked, a.id] : draft.picked.filter((x) => x !== a.id) })} /> {a.name}
              </label>
            ))}
          </div>
          <label style={text}>
            <input type="checkbox" checked={draft.hasBackstop} onChange={(e) => set({ hasBackstop: e.target.checked })} />{' '}
            Add a backstop: the hook checks every tool call
          </label>
          {draft.hasBackstop && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
              <div style={{ ...row, ...text }}>
                <span>What it does</span>
                <select value={draft.does} onChange={(e) => set({ does: e.target.value as BackstopDoes })}>
                  {DOES.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
                </select>
                <label><input type="checkbox" checked={draft.on} onChange={(e) => set({ on: e.target.checked })} /> On</label>
              </div>
              {draft.does === 'log' && <div style={small}>Log only records what it would have done and lets the call run.</div>}
              <div style={label}>Tool (comma separated)</div>
              <input style={input} value={draft.tool} onChange={(e) => set({ tool: e.target.value })} placeholder="Bash" />
              <div style={label}>Command pattern (regular expression)</div>
              <input style={input} value={draft.commandMatches} onChange={(e) => set({ commandMatches: e.target.value })} placeholder="^git\s+push\b" />
              <div style={label}>Or a path pattern</div>
              <input style={input} value={draft.pathGlob} onChange={(e) => set({ pathGlob: e.target.value })} placeholder="**/secrets/**" />
              <div style={label}>Message to the agent when stopped (optional)</div>
              <input style={input} value={draft.message} onChange={(e) => set({ message: e.target.value })} placeholder="Defaults to the principle" />
            </div>
          )}
          {errors.length > 0 && <div style={{ ...bad, fontSize: 12 }}>{errors.map((e) => <div key={e}>{e}</div>)}</div>}
          <div style={row}>
            <PixelButton variant="primary" size="sm" disabled={busy || !draft.principle.trim()} onClick={saveDraft}>{busy ? 'Saving...' : 'Save'}</PixelButton>
            <PixelButton variant="secondary" size="sm" disabled={busy} onClick={() => { setDraft(null); setErrors([]); }}>Cancel</PixelButton>
          </div>
        </div>
      )}
      <div style={small}>
        Saved to hive/policy/guardrail.json. A save takes effect at once, and agents are given changed rules on their next prompt.
        Agents cannot change this file while the guardrail is on.
      </div>
    </div>
  );
}
