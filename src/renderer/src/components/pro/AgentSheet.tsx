/**
 * THE AGENT SHEET (PRO). One door for adding and editing an agent (decision
 * D3; plan Part 4 section 2). Prototype of record: agentSheet() in
 * hive/shared/design/app-v2/prototype.html. Classic keeps AddAgentModal and
 * EditAgentModal; nothing under pro/ reaches either.
 *
 * ADD writes what the Classic modal writes, in the same order:
 *   window.cth.spawnPty({...})     the session, provisioned in the registry
 *   store.addAgent(agent)          the card
 *   window.cth.updateConfig        the folder promoted to the front of the quick picks
 *   window.cth.setAgentTokenCap    the per agent budget, when one was chosen
 * EDIT writes through the doors the agent room already uses:
 *   store.renameAgent              the name (registry + identity, no restart)
 *   store.updateAgent              character, colour, role, goal, and the
 *                                  engine patch EditAgentModal sent (provider,
 *                                  model, command), applied on the next start
 *   window.cth.setAgentTokenCap    the budget
 *
 * The preview card is bound to the form state directly and follows every
 * keystroke. The kit's Draft (commit on blur) belongs to autosave surfaces;
 * here nothing is written until the button, so the fields are plain inputs.
 *
 * D1 (amended 5 Sep 2026): the spawn command is visible and editable in BOTH
 * renderings, directly under the provider it resolves from; picking a
 * provider or model rewrites it, and a ghost button restores the resolved
 * line after a hand edit. The custom engine keeps its own field, because
 * there the command IS the whole interface.
 */
import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import { AGENT_PROVIDER_PRESETS, type AgentProvider, buildSpawnCommand, type HarnessConfig, inferAgentProvider, isClaudeProvider, modelsForProvider, modelWord, providerPreset, tokenizeCommand } from '@/store/config';
import type { AccentColorName } from '@/design/tokens';
import { OFFICE_CAST, DEFAULT_CHARACTER, type OfficeCharacterName } from '@/scene/office/castRoster';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import type { HireManifest } from '@shared/hire';
import { hireQueueProgress } from '@shared/hireQueue';
import { MCP_CATALOG } from '@shared/mcpCatalog';
import { OSS_BLOG_LINKS, OSS_LOCAL_PICKS, OSS_PROVIDER_PICKS, hasOssQuickPicks, localSlugFor } from '@shared/ossModels';
import { AvatarGallery } from './AvatarGallery';
import { SpritePortrait } from '../SpritePortrait';
import { closeAgentSheet, useAgentSheet } from './agentSheetStore';
import { useTechnical } from './depth';
import {
  Btn, Chip, CloseX, CodeBox, Field, Kv, Seg, SelectBox, Sheet, StatusChip,
  inputStyle, monoInputStyle, textareaStyle, proToast
} from './ui';
import { CommandField } from './CommandField';

const ACCENTS: AccentColorName[] = ['coral', 'mint', 'sky', 'lemon', 'lilac', 'peach'];
/** The role the store treats as "no role yet" (shared/agentRole.ts): the
 *  registry's real role replaces it, so a blank Role field lands on it. */
const PLACEHOLDER_ROLE = 'a fresh harness';
const SHEET_WIDTH = 900;

type CapChoice = 'workspace' | '200k' | '800k' | '2M' | 'other';
const CAP_PRESETS: { choice: Exclude<CapChoice, 'workspace' | 'other'>; tokens: number }[] = [
  { choice: '200k', tokens: 200_000 },
  { choice: '800k', tokens: 800_000 },
  { choice: '2M', tokens: 2_000_000 }
];
function capChoiceFor(n: number | undefined): CapChoice {
  if (n === undefined) return 'workspace';
  return CAP_PRESETS.find((p) => p.tokens === n)?.choice ?? 'other';
}

type Isolation = 'worktree' | 'direct';

function basename(p: string): string { return p.split('/').filter(Boolean).pop() ?? p; }
function uniqueId(name: string): string { return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`; }
function knownCharacter(c?: string): OfficeCharacterName { return OFFICE_CAST.some((m) => m.name === c) ? (c as OfficeCharacterName) : DEFAULT_CHARACTER; }
function knownAccent(a?: string): AccentColorName { return ACCENTS.includes(a as AccentColorName) ? (a as AccentColorName) : 'sky'; }
/** The cast member a typed name refers to, so typing "Meredith" wears Meredith;
 *  null on no match, and a deliberate pick is left alone. */
function characterForName(n: string): OfficeCharacterName | null {
  const q = n.trim().toLowerCase();
  if (!q) return null;
  const hit = OFFICE_CAST.find((c) => c.displayName.toLowerCase() === q || c.name === q);
  return hit ? hit.name : null;
}
function firstSentence(s: string): string { return s.split('.')[0].trim(); }

/** Mounted once in ProShell. Draws the sheet for whoever called openAgentSheet.
 *  The config prop is App's live copy; before it has loaded the sheet asks
 *  main once, the way EditAgentModal did. */
export function AgentSheetHost({ config }: { config: HarnessConfig | null }) {
  const target = useAgentSheet();
  const agents = useStore((s) => s.agents);
  const [fetched, setFetched] = useState<HarnessConfig | null>(null);
  useEffect(() => {
    if (!target || config || fetched) return;
    void window.cth.getConfig().then(setFetched).catch(() => { /* the prop arrives with the next config broadcast */ });
  }, [target, config, fetched]);
  const agent = target?.mode === 'edit' ? agents.find((a) => a.id === target.agentId) : undefined;
  // An agent removed under an open sheet closes it: there is nothing left to edit.
  useEffect(() => { if (target?.mode === 'edit' && !agent) closeAgentSheet(); }, [target, agent]);
  const cfg = config ?? fetched;
  if (!target || !cfg) return null;
  if (target.mode === 'edit') return agent ? <AgentSheet key={agent.id} config={cfg} agent={agent} /> : null;
  return <AgentSheet key="add" config={cfg} />;
}

export function AgentSheet({ config, agent }: { config: HarnessConfig; agent?: Agent }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const edit = agent !== undefined;
  const godName = useResolvedGodName();
  const addAgent = useStore((s) => s.addAgent);
  const updateAgent = useStore((s) => s.updateAgent);
  const renameAgent = useStore((s) => s.renameAgent);
  const hireQueue = useStore((s) => s.hireQueue);
  const finishPendingHire = useStore((s) => s.finishPendingHire);
  const clearPendingHires = useStore((s) => s.clearPendingHires);
  // Deep links and file batches share one queue; the head seeds the form and
  // every item still needs an explicit Add or Skip. Edit never reads it.
  const pendingHire = edit ? undefined : hireQueue.pending[0];
  const progress = edit ? null : hireQueueProgress(hireQueue);

  const initialProvider = edit ? inferAgentProvider(agent.command, agent.provider) : inferAgentProvider(config.defaultCommand);
  const initialModel = edit ? agent.model : (isClaudeProvider(initialProvider) ? config.defaultModel : undefined);
  /** A manifest's command is built locally from the provider preset plus its
   *  validated flags; a manifest can never name the binary itself. */
  const hireCommand = (m: HireManifest): string => {
    const prov: AgentProvider = m.provider ?? inferAgentProvider(config.defaultCommand);
    const base = buildSpawnCommand(config, m.model, prov);
    return m.commandFlags?.length ? `${base} ${m.commandFlags.join(' ')}` : base;
  };

  // A fresh sheet opens with the default face already picked, so the name
  // starts as that face's name too (founder, 5 Sep 2026): the preview says
  // Jim, and Add works without typing. Picking another face still replaces it.
  const initialCharacter = edit ? agent.character : knownCharacter(pendingHire?.character);
  const [name, setName] = useState(edit ? agent.name : (pendingHire?.name ?? OFFICE_CAST.find((m) => m.name === initialCharacter)?.displayName ?? ''));
  const [character, setCharacter] = useState<OfficeCharacterName>(initialCharacter);
  const [accent, setAccent] = useState<AccentColorName>(edit ? agent.accent : knownAccent(pendingHire?.accent));
  const [description, setDescription] = useState(edit ? (agent.description === PLACEHOLDER_ROLE ? '' : agent.description) : (pendingHire?.description ?? ''));
  const [goal, setGoal] = useState(edit ? (agent.goal ?? '') : (pendingHire?.goal ?? ''));
  const [cwd, setCwd] = useState<string>(edit ? agent.cwd : (config.registeredRepos[0] ?? ''));
  // Local mirror of the registered folders so one remembered here is a quick
  // pick at once (the config prop is a snapshot until main broadcasts).
  const [repos, setRepos] = useState<string[]>(config.registeredRepos);
  const [isolation, setIsolation] = useState<Isolation>(edit ? (agent.worktreePath ? 'worktree' : 'direct') : ((pendingHire?.isolate ?? true) ? 'worktree' : 'direct'));
  const [resumeSessionId, setResumeSessionId] = useState('');
  const [folderNote, setFolderNote] = useState<string | undefined>();
  const [provider, setProvider] = useState<AgentProvider>(pendingHire?.provider ?? initialProvider);
  const [model, setModel] = useState<string | undefined>(pendingHire ? pendingHire.model : initialModel);
  const [command, setCommand] = useState(
    pendingHire ? hireCommand(pendingHire) : (edit && agent.command ? agent.command : buildSpawnCommand(config, initialModel, initialProvider))
  );
  const initialCap = edit ? config.agentTokenCaps?.[agent.id] : pendingHire?.tokenCap;
  const [capChoice, setCapChoice] = useState<CapChoice>(capChoiceFor(initialCap));
  const [capOther, setCapOther] = useState(capChoiceFor(initialCap) === 'other' ? String(initialCap) : '');
  const [hireMeta, setHireMeta] = useState<HireManifest | null>(pendingHire ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preset = providerPreset(provider);
  const resuming = resumeSessionId.trim().length > 0;
  const customEngine = provider === 'custom';
  const isolate = isolation === 'worktree';

  const seedCap = (n?: number) => {
    const choice = capChoiceFor(n);
    setCapChoice(choice);
    setCapOther(choice === 'other' ? String(n) : '');
  };
  const capTokens = (): number | undefined => {
    if (capChoice === 'workspace') return undefined;
    if (capChoice === 'other') {
      const n = Number(capOther.replace(/[,_\s]/g, ''));
      return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
    }
    return CAP_PRESETS.find((p) => p.choice === capChoice)?.tokens;
  };

  // Picking a model rebuilds the command; switching provider resets the model
  // to that engine's default (Settings, AI Engines) and rebuilds from its own
  // binary. The custom engine keeps whatever was typed.
  const pickModel = (id?: string) => {
    setModel(id);
    setCommand(buildSpawnCommand(config, id, provider));
  };
  const pickProvider = (id: AgentProvider) => {
    setProvider(id);
    const nextModel = isClaudeProvider(id) ? config.defaultModel : config.providerDefaultModels?.[id];
    setModel(nextModel);
    const nextPreset = providerPreset(id);
    if (!isClaudeProvider(id) && !nextPreset.resumeFlag && !nextPreset.resumeSubcommand) {
      setResumeSessionId('');
      setFolderNote(undefined);
    }
    if (id === 'custom') { setCommand(command.trim() || config.defaultCommand || ''); return; }
    setCommand(buildSpawnCommand(config, nextModel, id));
  };

  /** Apply an imported manifest to every field (add mode). Import never starts anything. */
  const applyManifest = (m: HireManifest) => {
    setHireMeta(m);
    setName(m.name);
    setCharacter(m.character ? knownCharacter(m.character) : (characterForName(m.name ?? '') ?? knownCharacter(undefined)));
    setAccent(knownAccent(m.accent));
    setProvider(m.provider ?? initialProvider);
    setModel(m.model);
    setCommand(hireCommand(m));
    setDescription(m.description ?? '');
    setGoal(m.goal ?? '');
    setIsolation((m.isolate ?? true) ? 'worktree' : 'direct');
    setResumeSessionId('');
    setFolderNote(undefined);
    seedCap(m.tokenCap);
  };
  // Advancing a batch keeps this sheet mounted: re-seed every field when the
  // queue head changes so edits made while reviewing one never leak into the next.
  useLayoutEffect(() => {
    if (pendingHire) applyManifest(pendingHire);
  // applyManifest closes over the config snapshot of this open sheet.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHire]);

  const close = () => {
    if (!edit) clearPendingHires();
    closeAgentSheet();
  };
  const advanceHireReview = () => {
    const next = hireQueue.pending[1];
    finishPendingHire();
    if (!next) closeAgentSheet();
  };
  const skipHire = () => { if (pendingHire) { setError(null); advanceHireReview(); } };

  const pickFolder = async () => {
    setError(null);
    const res = await window.cth.chooseFolder();
    if (res.ok) setCwd(res.path);
    else if (res.error !== 'cancelled') setError(res.error);
  };
  /** Remember a folder as a quick pick: dedupe, prepend, persist. Main expands
   *  `~`, so the stored list is adopted back. */
  const registerProject = async (path: string) => {
    const p = path.trim();
    if (!p) return;
    const next = [p, ...repos.filter((r) => r !== p)];
    setRepos(next);
    setCwd(p);
    try {
      const updated = await window.cth.updateConfig({ registeredRepos: next });
      const stored = updated.registeredRepos ?? next;
      setRepos(stored);
      if (stored[0]) setCwd(stored[0]);
    } catch { /* best effort */ }
  };
  /** Drop a folder from the quick picks. The folder on disk is never touched. */
  const unregisterProject = async (path: string) => {
    const next = repos.filter((r) => r !== path);
    setRepos(next);
    try {
      const updated = await window.cth.updateConfig({ registeredRepos: next });
      setRepos(updated.registeredRepos ?? next);
    } catch { /* best effort */ }
  };
  /** A pasted session id fills the folder it ran in (on blur, not per key). */
  const resolveFolderFromSession = async () => {
    const sid = resumeSessionId.trim();
    if (!sid) { setFolderNote(undefined); return; }
    const resolved = await window.cth.resolveSessionCwd(sid);
    if (resolved) { setCwd(resolved); setFolderNote(t('pro.sheet.folderFromSession', { path: resolved })); }
    else setFolderNote(undefined);
  };

  /* ---- add: the modal's sequence, spawnPty then addAgent --------------- */
  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError(t('pro.sheet.errName')); return; }
    if (!cwd.trim()) { setError(t('pro.sheet.errFolder')); return; }
    if (!command.trim()) { setError(t('pro.sheet.errCommand')); return; }
    setBusy(true);
    const id = uniqueId(name);
    const ptyId = `pty-${id}`;
    // Quote aware, so an agy label like "Gemini 3.1 Pro (High)" stays one argument.
    const [exe, ...args] = tokenizeCommand(command.trim());
    const wantIsolate = resuming ? false : isolate;
    let spawnRes: Awaited<ReturnType<typeof window.cth.spawnPty>>;
    try {
      spawnRes = await window.cth.spawnPty({
        id: ptyId,
        cwd,
        command: exe,
        provider,
        args,
        cols: 100,
        rows: 30,
        // Own worktree, unless continuing a session, which needs the real folder's transcript.
        isolate: wantIsolate,
        resumeSessionId: resuming ? resumeSessionId.trim() : undefined,
        // Provision the agent in the registry (memory, mailbox, identity).
        hive: {
          id,
          name: name.trim(),
          provider,
          cwd,
          role: description.trim() || undefined,
          capabilities: hireMeta?.capabilities
        }
      });
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : t('pro.sheet.errStart'));
      return;
    }
    if (!spawnRes.ok) {
      setBusy(false);
      setError(spawnRes.error ?? t('pro.sheet.errStart'));
      return;
    }
    if (resuming && spawnRes.resumeNotFound) {
      console.warn(`[agent-sheet] session "${resumeSessionId.trim()}" not found; started a fresh session`);
    }
    // Main echoes the absolute folder it actually used; record that. With
    // isolation the agent RUNS in a worktree but its project is the folder picked.
    const spawnedCwd = spawnRes.cwd || cwd;
    const projectCwd = wantIsolate ? cwd.trim() : spawnedCwd;
    const record: Agent = {
      id,
      name: name.trim(),
      character,
      accent,
      description: description.trim() || PLACEHOLDER_ROLE,
      project: basename(projectCwd),
      tmuxTarget: '',
      cwd: spawnedCwd,
      goal: goal.trim() || undefined,
      status: 'idle',
      action: resuming && spawnRes.resumeNotFound ? 'session not found, fresh start' : 'starting up',
      progress: 0,
      currentStation: 'desk',
      ptyId,
      command: command.trim(),
      provider,
      model,
      worktreePath: spawnRes.worktreePath,
      seedPrompt: spawnRes.seedPrompt,
      recentTextTs: Date.now()
    };
    addAgent(record);
    // Remember the folder for the next one: front of the quick picks.
    if (projectCwd && repos[0] !== projectCwd) {
      const nextRepos = [projectCwd, ...repos.filter((r) => r !== projectCwd && r !== cwd)];
      try { await window.cth.updateConfig({ registeredRepos: nextRepos }); } catch { /* best effort */ }
    }
    // The per agent budget, when one was chosen (or carried by the file).
    // Awaited before a batch advances so the next review cannot race it.
    const cap = capTokens();
    if (cap !== undefined) {
      try { await window.cth.setAgentTokenCap(id, cap); } catch { /* best effort */ }
    }
    setBusy(false);
    proToast(t('pro.sheet.toastAdded'), { tone: 'ok' });
    if (pendingHire) advanceHireReview();
    else closeAgentSheet();
  };

  /* ---- edit: rename, then the same patch EditAgentModal sent ------------ */
  const save = async () => {
    if (!agent) return;
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) { setError(t('pro.sheet.errName')); return; }
    setBusy(true);
    if (trimmedName !== agent.name) {
      const r = await renameAgent(agent.id, trimmedName);
      if (!r.ok) { setBusy(false); setError(r.error ?? t('pro.sheet.errRename')); return; }
    }
    // 0.5.3 bug 2(a): the field below is editable for EVERY engine, and a provider
    // or model pick rewrites it, so what is in it is what the person means to run.
    // Saving used to rebuild the line for every engine but custom, which threw a
    // hand edit away without a word.
    const nextCommand = command.trim() || (customEngine ? '' : buildSpawnCommand(config, model, provider));
    const engineChanged = provider !== initialProvider || (model ?? '') !== (agent.model ?? '') || nextCommand !== (agent.command ?? '');
    const patch: Partial<Agent> = {};
    if (character !== agent.character) patch.character = character;
    if (accent !== agent.accent) patch.accent = accent;
    const nextRole = description.trim() || PLACEHOLDER_ROLE;
    if (nextRole !== agent.description) patch.description = nextRole;
    const nextGoal = goal.trim() || undefined;
    if (nextGoal !== agent.goal) patch.goal = nextGoal;
    if (engineChanged) { patch.provider = provider; patch.model = model; patch.command = nextCommand; }
    if (Object.keys(patch).length > 0) updateAgent(agent.id, patch);
    const cap = capTokens();
    if (cap !== config.agentTokenCaps?.[agent.id]) {
      try { await window.cth.setAgentTokenCap(agent.id, cap); }
      catch { setBusy(false); setError(t('pro.sheet.errCap')); return; }
    }
    setBusy(false);
    proToast(engineChanged ? t('pro.sheet.toastSavedEngine') : t('pro.sheet.toastSaved'), { tone: 'ok' });
    closeAgentSheet();
  };

  /* ---- options ----------------------------------------------------------- */
  const providerOptions = AGENT_PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.label }));
  const modelOptions = (() => {
    const known = modelsForProvider(provider).map((m) => ({ value: m.id ?? '', label: m.label }));
    if (hasOssQuickPicks(provider)) {
      for (const p of OSS_LOCAL_PICKS) known.push({ value: localSlugFor(provider, p.tag), label: t('pro.sheet.ossLocal', { label: p.label, ram: p.minRam }) });
      for (const p of OSS_PROVIDER_PICKS) known.push({ value: p.slug, label: t('pro.sheet.ossKey', { label: p.label }) });
    }
    // A model the picker does not list (a newer id from a file, or the one the
    // agent already runs) is shown as a real, selected option. No model at all
    // (the command carries no model flag) gets its own row too, so the select
    // never displays a model the command does not carry.
    if (!known.some((m) => m.value === (model ?? ''))) {
      if (model) { const word = modelWord(provider, model) ?? model; known.push({ value: model, label: edit ? t('pro.sheet.modelCurrent', { model: word }) : t('pro.sheet.modelFromFile', { model: word }) }); }
      else known.unshift({ value: '', label: t('pro.sheet.modelDefault') });
    }
    return known;
  })();
  const byok = provider === 'opencode' || provider === 'crush' || provider === 'pi' || provider === 'qwen';
  const canResume = !edit && !!(preset.resumeFlag || preset.resumeSubcommand);

  return (
    <Sheet onClose={close} width={SHEET_WIDTH}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
          {edit ? t('pro.sheet.titleEdit', { name: agent.name }) : t('pro.sheet.titleAdd')}
        </h2>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {edit ? t('pro.sheet.subEdit') : t('pro.sheet.subAdd')}
        </span>
        <CloseX onClick={close} title={t('pro.sheet.close')} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 22, padding: 18, alignContent: 'start' }}>
        {/* LEFT: the form, six titled groups */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {hireMeta && !edit && <HireReview m={hireMeta} progress={progress} />}

          {/* Founder item 14b: the sections read Name, Avatar, Providers,
              Workspace, Isolation, then the rest in their old order. */}
          <Group title={t('pro.sheet.name')}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Field label={t('pro.sheet.name')}>
                  <input
                    aria-label={t('pro.sheet.name')}
                    value={name}
                    autoFocus={!edit}
                    onChange={(e) => {
                      const next = e.target.value;
                      setName(next);
                      const match = characterForName(next);
                      if (match) setCharacter(match);
                    }}
                    placeholder={t('pro.sheet.namePlaceholder')}
                    style={inputStyle}
                  />
                </Field>
              </div>
              <div style={{ flexShrink: 0 }}>
                <Field label={t('pro.sheet.color')}>
                  <div role="radiogroup" aria-label={t('pro.sheet.color')} style={{ display: 'flex', gap: 8, height: 32, alignItems: 'center' }}>
                    {ACCENTS.map((a) => {
                      const on = accent === a;
                      return (
                        <button
                          key={a}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={t(`pro.sheet.swatch.${a}`)}
                          title={t(`pro.sheet.swatch.${a}`)}
                          onClick={() => setAccent(a)}
                          style={{
                            width: 24, height: 24, borderRadius: 7, padding: 0, cursor: 'pointer',
                            background: `var(--cth-${a})`, border: '1px solid var(--cth-ink-300)',
                            boxShadow: on ? '0 0 0 2px var(--cth-cream-50), 0 0 0 3.5px var(--cth-ink-900)' : 'none'
                          }}
                        />
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          </Group>

          <Group title={t('pro.sheet.avatar')}>
            <AvatarGallery
              value={character}
              accent={accent}
              onPick={(c, displayName) => { setCharacter(c); if (displayName) setName(displayName); }}
            />
          </Group>

          <Group title={t('pro.sheet.providers')}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label={t('pro.sheet.provider')}>
                <SelectBox<AgentProvider> ariaLabel={t('pro.sheet.provider')} value={provider} onChange={pickProvider} options={providerOptions} />
              </Field>
              {preset.supportsModel && (
                <Field label={t('pro.sheet.model')}>
                  <SelectBox<string> ariaLabel={t('pro.sheet.model')} value={model ?? ''} onChange={(v) => pickModel(v || undefined)} options={modelOptions} />
                </Field>
              )}
            </div>
            {/* The spawn command, always visible and always editable (founder,
                5 Sep 2026), directly under the provider it resolves from. A
                hand edit sticks until the next provider or model pick rewrites
                it; the ghost button appears only while the text differs from
                the resolved line. The custom engine keeps its own field: there
                the command IS the whole interface. */}
            {customEngine ? (
              <Field label={t('pro.sheet.command')} hint={t('pro.sheet.commandHint')}>
                <input aria-label={t('pro.sheet.command')} value={command} onChange={(e) => setCommand(e.target.value)} placeholder="your-agent-cli" style={monoInputStyle} />
              </Field>
            ) : (
              <Field label={t('pro.sheet.command')} hint={t('pro.sheet.spawnHint')}>
                <CommandField ariaLabel={t('pro.sheet.command')} value={command} resolved={buildSpawnCommand(config, model, provider)} onChange={setCommand} testId="sheet" />
              </Field>
            )}
            {byok && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Hint>{t('pro.sheet.byokNote')}</Hint>
                <LinkBtn onClick={() => { void window.cth.openExternal(OSS_BLOG_LINKS.openModels); }}>{t('pro.sheet.openModels')}</LinkBtn>
                <LinkBtn onClick={() => { void window.cth.openExternal(OSS_BLOG_LINKS.macMini); }}>{t('pro.sheet.macMini')}</LinkBtn>
              </div>
            )}
            <Field label={t('pro.sheet.tokenCap')} hint={t('pro.sheet.capHint')}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Seg<CapChoice>
                  ariaLabel={t('pro.sheet.tokenCap')}
                  value={capChoice}
                  onChange={setCapChoice}
                  options={[
                    { value: 'workspace', label: t('pro.sheet.capWorkspace') },
                    ...CAP_PRESETS.map((p) => ({ value: p.choice, label: p.choice })),
                    { value: 'other', label: t('pro.sheet.capOther') }
                  ]}
                />
                {capChoice === 'other' && (
                  <input
                    aria-label={t('pro.sheet.capOther')}
                    value={capOther}
                    onChange={(e) => setCapOther(e.target.value)}
                    placeholder={t('pro.sheet.capOtherPlaceholder')}
                    inputMode="numeric"
                    style={{ ...monoInputStyle, width: 160 }}
                  />
                )}
              </div>
            </Field>
            {edit && <Hint>{t('pro.sheet.engineNextStart')}</Hint>}
          </Group>

          <Group title={t('pro.sheet.workspace')}>
            {edit ? (
              <>
                <Kv rows={[{ k: t('pro.sheet.folder'), v: agent.cwd || '', mono: true }]} />
                <Hint>{t('pro.sheet.workspaceFixed')}</Hint>
              </>
            ) : (
              <Field label={t('pro.sheet.folder')}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    aria-label={t('pro.sheet.folder')}
                    value={cwd}
                    onChange={(e) => setCwd(e.target.value)}
                    placeholder={t('pro.sheet.folderPlaceholder')}
                    style={{ ...monoInputStyle, flex: 1 }}
                  />
                  <Btn onClick={() => { void pickFolder(); }}>{t('pro.sheet.browse')}</Btn>
                </div>
                {repos.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    {repos.map((r) => <FolderChip key={r} path={r} on={cwd === r} onPick={() => setCwd(r)} onRemove={() => { void unregisterProject(r); }} />)}
                  </div>
                )}
                {cwd.trim() && !repos.includes(cwd.trim()) && (
                  <div>
                    <Btn size="sm" kind="ghost" onClick={() => { void registerProject(cwd); }}>{t('pro.sheet.rememberFolder')}</Btn>
                  </div>
                )}
                {folderNote && <Hint>{folderNote}</Hint>}
              </Field>
            )}
          </Group>

          <Group title={t('pro.sheet.isolation')}>
            {edit ? (
              <Kv rows={[
                { k: t('pro.sheet.isolation'), v: agent.worktreePath ? t('pro.sheet.isolationOn') : t('pro.sheet.isolationOff') },
                ...(technical && agent.worktreePath ? [{ k: t('pro.sheet.worktree'), v: agent.worktreePath, mono: true }] : [])
              ]} />
            ) : (
              <>
                <SelectBox<Isolation>
                  ariaLabel={t('pro.sheet.isolation')}
                  value={resuming ? 'direct' : isolation}
                  onChange={setIsolation}
                  disabled={resuming}
                  options={[
                    { value: 'worktree', label: t('pro.sheet.isolationWorktree') },
                    { value: 'direct', label: t('pro.sheet.isolationDirect') }
                  ]}
                />
                {resuming && <Hint>{t('pro.sheet.isolationLocked')}</Hint>}
                {canResume && (
                  <Field label={t('pro.sheet.resume')} hint={resuming ? t('pro.sheet.resumeNote') : undefined}>
                    <input
                      aria-label={t('pro.sheet.resume')}
                      value={resumeSessionId}
                      onChange={(e) => { setResumeSessionId(e.target.value); setFolderNote(undefined); }}
                      onBlur={() => { void resolveFolderFromSession(); }}
                      placeholder={t('pro.sheet.resumePlaceholder')}
                      style={monoInputStyle}
                    />
                  </Field>
                )}
              </>
            )}
          </Group>

          <Group title={t('pro.sheet.briefing')}>
            <Field label={t('pro.sheet.role')}>
              <textarea
                aria-label={t('pro.sheet.role')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('pro.sheet.rolePlaceholder')}
                style={{ ...textareaStyle, minHeight: 56 }}
              />
            </Field>
            <Field label={t('pro.sheet.goal')}>
              <input
                aria-label={t('pro.sheet.goal')}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder={t('pro.sheet.goalPlaceholder')}
                style={inputStyle}
              />
            </Field>
          </Group>
        </div>

        {/* RIGHT: the live preview and what follows */}
        <div style={{ minWidth: 0 }}>
          <Group title={t('pro.sheet.onGrid')}>
            <div style={{ border: '1px solid var(--cth-ink-300)', borderRadius: 10, padding: 12, background: 'var(--cth-cream-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `var(--cth-${accent}-light)` }}>
                  <SpritePortrait character={character} scale={1} description={description} forceSprite />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ display: 'block', fontSize: 12.5, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name.trim() || t('pro.sheet.newAgent')}</b>
                  <small style={{ display: 'block', fontSize: 11, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstSentence(description) || t('pro.sheet.rolePreview')}</small>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusChip status={edit ? agent.status : 'idle'} raw={edit ? agent.action : undefined} />
              </div>
              {!edit && <div style={{ marginTop: 10, color: 'var(--cth-ink-500)', fontSize: 11.5, lineHeight: 1.5 }}>{t('pro.sheet.previewHint')}</div>}
            </div>
          </Group>

          <Next title={t('pro.sheet.whatNext')}>
            <div>{t('pro.sheet.nextDispatch', { name: godName })}</div>
            <div>{(edit ? !!agent.worktreePath : isolate && !resuming) ? t('pro.sheet.nextBranch') : t('pro.sheet.nextDirect')}</div>
            <div>{t('pro.sheet.nextPrompt')}</div>
          </Next>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)' }}>
        {pendingHire && <Btn size="sm" onClick={skipHire} disabled={busy}>{t('pro.sheet.skipFile')}</Btn>}
        {error && <span role="alert" style={{ fontSize: 12, color: 'var(--cth-status-blocked)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{error}</span>}
        <span style={{ flex: 1 }} />
        <Btn size="sm" onClick={close} disabled={busy}>{t('pro.dialog.cancel')}</Btn>
        <Btn size="sm" kind="primary" onClick={() => { void (edit ? save() : submit()); }} disabled={busy}>
          {edit ? t('pro.sheet.done') : busy ? t('pro.sheet.adding') : t('pro.sheet.add')}
        </Btn>
      </div>
    </Sheet>
  );
}

/* ---- pieces ---------------------------------------------------------------- */

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h4 style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{title}</h4>
      {children}
    </section>
  );
}

function Next({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 16, fontSize: 11.5, color: 'var(--cth-ink-700)', lineHeight: 1.7 }}>
      <b style={{ display: 'block', fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cth-ink-500)', fontWeight: 600, marginBottom: 2 }}>{title}</b>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <span style={{ display: 'block', fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.4 }}>{children}</span>;
}

/** A button that reads as a link, in the accent ink (the two model guides
 *  under the Providers group). */
function LinkBtn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'none', border: 'none', padding: 0, font: 'inherit', fontSize: 12, fontWeight: 500, textAlign: 'start',
      color: 'var(--cth-accent-text)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1
    }}>
      {children}
    </button>
  );
}

/** A remembered folder: pick it, or drop it from the list. Two buttons in a
 *  span, never a button inside a button. The folder on disk is untouched. */
function FolderChip({ path, on, onPick, onRemove }: { path: string; on: boolean; onPick: () => void; onRemove: () => void }) {
  const { t } = useTranslation();
  const label = basename(path);
  const shared: CSSProperties = { border: 'none', background: 'transparent', font: 'inherit', fontSize: 12, cursor: 'pointer', color: 'inherit', height: 22 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 24, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${on ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`,
      background: on ? 'var(--cth-accent-soft)' : 'transparent', color: on ? 'var(--cth-accent-text)' : 'var(--cth-ink-700)'
    }}>
      <button type="button" aria-pressed={on} title={path} onClick={onPick} style={{ ...shared, padding: '0 4px 0 9px', fontWeight: 500 }}>{label}</button>
      <button type="button" aria-label={t('pro.sheet.forgetFolder', { name: label })} title={t('pro.sheet.forgetFolder', { name: label })} onClick={onRemove} style={{ ...shared, padding: '0 8px 0 3px', opacity: 0.7, lineHeight: 1 }}>×</button>
    </span>
  );
}

/** The review banner for a hire that came from a file: who it is, what it
 *  appends to the command, which skills and tools it asks for. Tools that are
 *  not read only are shown for consent and never turned on here. */
function HireReview({ m, progress }: { m: HireManifest; progress: { current: number; total: number } | null }) {
  const { t } = useTranslation();
  const entry = (id: string) => MCP_CATALOG.find((e) => e.id === id);
  const labelOf = (id: string) => entry(id)?.label ?? id;
  const safe = (m.mcpServers ?? []).filter((id) => entry(id)?.tier === 'safe-readonly');
  const consent = (m.mcpServers ?? []).filter((id) => entry(id)?.tier !== 'safe-readonly');
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--cth-accent-line)', background: 'var(--cth-accent-soft)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--cth-ink-900)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <b>{t('pro.sheet.fromFile', { name: m.name })}</b>
        {m.author && <span style={{ color: 'var(--cth-ink-700)' }}>{t('pro.sheet.byAuthor', { author: m.author })}</span>}
        {progress && <Chip>{t('pro.sheet.fileProgress', { current: progress.current, total: progress.total })}</Chip>}
      </div>
      <span style={{ color: 'var(--cth-ink-700)' }}>{t('pro.sheet.reviewFields')}</span>
      {m.commandFlags && m.commandFlags.length > 0 && <ChipLine label={t('pro.sheet.fileFlags')} items={m.commandFlags} tone="warn" mono />}
      {m.skills && m.skills.length > 0 && <ChipLine label={t('pro.sheet.fileSkills')} items={m.skills} />}
      {safe.length > 0 && <ChipLine label={t('pro.sheet.fileMcpSafe')} items={safe.map(labelOf)} tone="ok" />}
      {consent.length > 0 && <ChipLine label={t('pro.sheet.fileMcpConsent')} items={consent.map(labelOf)} tone="warn" />}
    </div>
  );
}

function ChipLine({ label, items, tone, mono }: { label: string; items: string[]; tone?: 'ok' | 'warn'; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--cth-ink-700)' }}>{label}</span>
      {items.map((x, i) => <Chip key={`${x}-${i}`} tone={tone} style={mono ? { fontFamily: 'var(--cth-font-mono)' } : undefined}>{x}</Chip>)}
    </div>
  );
}
