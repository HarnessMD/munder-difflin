/**
 * Configuration: the orchestrator's own settings, in the shape the agent
 * screen's config panel uses, through the doors it already calls:
 *
 *   name               store.renameAgent  (registry + identity, no respawn)
 *   role               store.updateAgent  (the same patch the agent screen sends)
 *   provider / model   window.cth.updateConfig({ godProvider, godModel }),
 *                      the fact main reads when it starts him; it applies
 *                      the next time he starts, and the hint says so
 *   token cap          window.cth.setAgentTokenCap
 *   may start agents   window.cth.updateConfig({ orchestratorMaySpawn })
 *   restart            the agent screen's restart steps against HIS pty (kill,
 *                      reset the xterm in place, spawn into the same id), with
 *                      the command SHOWN above the button first (founder,
 *                      5 Sep 2026: "show the command that will run when they
 *                      click on restart"). The command on screen is built by
 *                      the same function from the same picks the button
 *                      applies, so the two cannot disagree; a pending pick is
 *                      applied before the restart, which is what the hint
 *                      beside the button says while one is pending. His last
 *                      conversation comes along when the provider is
 *                      unchanged (main attaches the resume flag; it is not
 *                      part of the command as written).
 *
 * The workspace and reach cards are read: the folder and the workspace home
 * (behind copy controls in the technical rendering), what he runs on right
 * now, Slack and the webhooks, and the doors to Automations and Team.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import { buildSpawnCommand, modelWord, modelsForProvider, providerPreset, tokenizeCommand, type AgentProvider, type HarnessConfig } from '@/store/config';
import { roleForHiveSpawn } from '@shared/agentRole';
import { resolveSlackMode } from '@shared/slackMode';
import { acquireTerminal, resetTerminal } from '../../terminalPool';
import { usePaneNav } from '../../professional/paneNav';
import { Btn, Chip, Draft, Field, Kv, SelectBox, Switch, proToast } from '../ui';
import { useTechnical } from '../depth';
import { CHORD_HINT } from '../proKeys';
import { countText, parseCount } from './godData';
import { CardH, CopyBtn, GodCard, GodGrid, Muted, monoText } from './pieces';
import { CommandField } from '../CommandField';
import { commandEngineConflict, effectiveGodCommand, godCommandToStore } from '@shared/godCommand';
import { orchestratorEngineOptions } from '@shared/engineOptions';

export function ConfigTab({ agent, config }: { agent: Agent; config: HarnessConfig | null }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const nav = usePaneNav();
  const renameAgent = useStore((s) => s.renameAgent);
  const updateAgent = useStore((s) => s.updateAgent);

  // The engine he will start on next: the config's fact, falling back to
  // what he runs on now. Local until Apply, so a half-picked pair is never
  // written.
  const cfgProvider = (config?.godProvider ?? agent.provider ?? 'claude') as AgentProvider;
  const cfgModel = config?.godModel ?? agent.model;
  const [provider, setProvider] = useState<AgentProvider>(cfgProvider);
  const [model, setModel] = useState<string | undefined>(cfgModel);
  useEffect(() => { setProvider(cfgProvider); setModel(cfgModel); }, [cfgProvider, cfgModel]);
  const engineDirty = provider !== cfgProvider || (model ?? '') !== (cfgModel ?? '');

  const ok = () => proToast(t('pro.god.saved'), { tone: 'ok' });
  const bad = () => proToast(t('pro.god.saveFailed'), { tone: 'bad' });

  // THE COMMAND THAT RUNS ON RESTART, from the picks on screen. The boot path
  // in useHive builds his command with this same function from the config's
  // godProvider and godModel; the restart below applies the picks and then
  // builds from the config it reads back, so what is shown is what runs.
  const restartCommand = config ? buildSpawnCommand(config, model, provider) : '';
  // 0.5.3 bug 20: the line is EDITABLE. `config.godCommand` holds a hand edit and
  // wins over the derived line at boot and at restart (shared/godCommand.ts). The
  // draft follows the picks: a provider or model pick writes the derived line
  // fresh, the agent sheet's rule, so a person never restarts on a line that
  // belongs to the engine they just left.
  const savedCommand = config ? effectiveGodCommand(config.godCommand, restartCommand, provider) : '';
  const [commandDraft, setCommandDraft] = useState(savedCommand);
  useEffect(() => { setCommandDraft(savedCommand); }, [savedCommand]);
  const commandDirty = commandDraft.trim() !== savedCommand.trim();
  // A line typed for another engine is SAID, and Restart stays off. Boot falls
  // back to the derived line on a conflict (T85), so pressing Restart on it
  // used to start a different line than the one on screen, without a word.
  const conflict = commandEngineConflict(commandDraft, provider);
  const conflictText = conflict ? t('pro.sheet.commandOtherEngine', { engine: providerPreset(conflict).label, picked: providerPreset(provider).label }) : null;
  const [restarting, setRestarting] = useState(false);
  const restart = async () => {
    if (!agent.ptyId || restarting || !config || conflict) return;
    setRestarting(true);
    try {
      if (engineDirty || commandDirty) await window.cth.updateConfig({ godProvider: provider, godModel: model, godCommand: godCommandToStore(commandDraft, restartCommand) });
      const cfg = await window.cth.getConfig();
      const nextProvider = (cfg.godProvider ?? 'claude') as AgentProvider;
      const command = effectiveGodCommand(cfg.godCommand, buildSpawnCommand(cfg, cfg.godModel, nextProvider), nextProvider);
      // Resume is opportunistic, the agent screen's rule: a recorded session on
      // the SAME provider comes along; anything else starts fresh rather than
      // refusing the restart.
      const resume = nextProvider === ((agent.provider ?? 'claude') as AgentProvider);
      // 0.5.3 bug 1: the renderer used to check the ONE recorded session id here
      // and quietly turn the resume off when it had no transcript. That id is not
      // always the agent's conversation (shared/resumeKey.ts), so main now walks
      // every session on record and says whether anything resumed.
      // Capture the live grid before replacing anything so the new process
      // paints at the right size.
      const entry = acquireTerminal(agent.ptyId);
      const cols = entry.term.cols || 100;
      const rows = entry.term.rows || 30;
      // 'restart': the person chose to restart, not to discard. Main keeps the
      // worktree and keeps tracking it, and the agent comes back IN it.
      const killed = await window.cth.killPty(agent.ptyId, 'restart');
      // A pty that is already gone is the state the kill was trying to reach.
      if (!killed.ok && !/^no pty:/.test(killed.error ?? '')) throw new Error(killed.error ?? 'kill failed');
      resetTerminal(agent.ptyId, { preserveScrollback: resume });
      const [exe, ...args] = tokenizeCommand(command.trim());
      const res = await window.cth.spawnPty({
        id: agent.ptyId,
        cwd: agent.cwd,
        command: exe,
        args,
        provider: nextProvider,
        cols,
        rows,
        hive: { id: agent.id, name: agent.name, cwd: agent.cwd, provider: nextProvider, isGod: true, role: roleForHiveSpawn(agent) },
        resume
      });
      if (!res.ok) throw new Error(res.error ?? 'restart failed');
      updateAgent(agent.id, { provider: nextProvider, model: cfg.godModel, command: command.trim(), status: 'idle', action: resume && res.resumed ? 'continuing…' : 'restarting…' });
      // Asked to continue and nothing came back: say so, in the place the person
      // is looking, instead of a plain "restarted" over an empty agent.
      if (res.resumeNotFound) proToast(t('pro.room.restartedFresh', { name: agent.name }), { tone: 'bad' });
      else proToast(t('pro.room.restartedToast', { name: agent.name }));
    } catch (error) {
      console.warn('[pro] orchestrator restart failed', error);
      proToast(t('pro.room.restartFailed'), { tone: 'bad' });
    } finally {
      setRestarting(false);
    }
  };

  // Every engine is listed; the ones that cannot run him are disabled and say
  // why (0.5.3 feature 17, shared/engineOptions.ts).
  const providers = orchestratorEngineOptions(t('onboarding.orchestrator.workersOnly'));
  const models = modelsForProvider(provider).map((m) => ({ value: m.id ?? '', label: m.label }));
  // A model the catalog does not list still gets WORDS, never the raw slug
  // (founder, 24 Sep: the tab read "claude-opus-5-5" beside "Opus 5").
  if (model && !models.some((m) => m.value === model)) models.unshift({ value: model, label: modelWord(provider, model) ?? model });

  const webhooks = config?.webhookTriggers ?? [];
  const webhooksOn = webhooks.filter((w) => w.enabled).length;
  const home = config?.harnessHome ?? null;

  return (
    <GodGrid>
      <GodCard>
        <CardH right={<Chip tone="muted" title={t('pro.god.config.chordTitle')}>{CHORD_HINT.agentConfig}</Chip>}>{t('pro.god.config.title')}</CardH>
        <Field label={t('pro.god.config.name')}>
          <Draft ariaLabel={t('pro.god.config.name')} value={agent.name} onCommit={(v) => { const name = v.trim(); if (!name || name === agent.name) return; void renameAgent(agent.id, name).then((r) => (r.ok ? ok() : bad())).catch(bad); }} />
        </Field>
        <Field label={t('pro.god.config.role')} hint={t('pro.god.config.roleHint')}>
          <Draft multiline ariaLabel={t('pro.god.config.role')} value={agent.description} onCommit={(v) => { const role = v.trim(); if (!role || role === agent.description) return; updateAgent(agent.id, { description: role }); ok(); }} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <Field label={t('pro.god.config.provider')}>
            <SelectBox
              ariaLabel={t('pro.god.config.provider')} value={provider} options={providers}
              onChange={(p) => { const m = providerPreset(p).recommendedOrchestratorModel; setProvider(p); setModel(m); if (config) setCommandDraft(buildSpawnCommand(config, m, p)); }}
            />
          </Field>
          <Field label={t('pro.god.config.model')}>
            <SelectBox ariaLabel={t('pro.god.config.model')} value={model ?? ''} options={models} onChange={(m) => { setModel(m || undefined); if (config) setCommandDraft(buildSpawnCommand(config, m || undefined, provider)); }} />
          </Field>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Btn size="sm" kind={engineDirty || commandDirty ? 'primary' : 'default'} disabled={(!engineDirty && !commandDirty) || !!conflict} onClick={() => { void window.cth.updateConfig({ godProvider: provider, godModel: model, godCommand: godCommandToStore(commandDraft, restartCommand) }).then(ok).catch(bad); }}>
            {t('pro.god.config.apply')}
          </Btn>
          <Muted>{t('pro.god.config.engineHint', { name: agent.name })}</Muted>
        </div>
        {/* Why some engines in the list above cannot be picked. */}
        <div>
          <Muted>{t('onboarding.orchestrator.workersOnlyHint')}</Muted>
        </div>
        {/* The command first, the button under it: a person reads what will
            run before they run it. */}
        <Field label={t('pro.god.config.restartCommand')} hint={t('pro.god.config.restartCommandHint')}>
          {/* Top aligned: an engine conflict adds a line under the box, and the
              copy control belongs beside the box, not beside that line. */}
          <div data-restart-command style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CommandField ariaLabel={t('pro.god.config.restartCommand')} value={commandDraft} resolved={restartCommand} onChange={setCommandDraft} placeholder={t('pro.god.config.cliDefault')} disabled={restarting} testId="god" error={conflictText} />
            </div>
            {commandDraft.trim() && <span style={{ paddingTop: 5, flexShrink: 0 }}><CopyBtn value={commandDraft.trim()} title={t('pro.god.config.copyCommand')} size={22} /></span>}
          </div>
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Btn size="sm" kind="primary" disabled={!agent.ptyId || restarting || !commandDraft.trim() || !!conflict} onClick={() => { void restart(); }}>
            {restarting ? t('pro.god.config.restarting') : t('pro.god.config.restart', { name: agent.name })}
          </Btn>
          <Muted>{engineDirty || commandDirty ? t('pro.god.config.restartApplies') : t('pro.god.config.restartHint')}</Muted>
        </div>
        <Field label={t('pro.god.config.tokenCap')} hint={t('pro.god.config.tokenCapHint')}>
          <Draft mono ariaLabel={t('pro.god.config.tokenCap')} value={countText(config?.agentTokenCaps?.[agent.id])} placeholder={countText(config?.costCapTokens) || t('pro.god.budget.default')} onCommit={(v) => { void window.cth.setAgentTokenCap(agent.id, parseCount(v)).then(ok).catch(bad); }} style={{ maxWidth: 200 }} />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--cth-ink-900)', fontWeight: 500 }}>{t('pro.god.config.mayStart')}</div>
            <Muted>{t('pro.god.config.mayStartHint')}</Muted>
          </div>
          <Switch on={config?.orchestratorMaySpawn !== false} label={t('pro.god.config.mayStart')} onChange={(next) => { void window.cth.updateConfig({ orchestratorMaySpawn: next }).then(ok).catch(bad); }} />
        </div>
      </GodCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <GodCard>
          <CardH>{t('pro.god.config.workspace')}</CardH>
          <Kv rows={[
            { k: t('pro.god.config.folder'), v: <PathRow value={agent.cwd} technical={technical} copyTitle={t('pro.god.config.copyPath')} />, mono: true },
            { k: t('pro.god.config.home'), v: home ? <PathRow value={home} technical={technical} copyTitle={t('pro.god.config.copyPath')} /> : t('pro.god.config.noHome'), mono: true },
            ...(technical ? [
              { k: t('pro.god.config.runningNow'), v: `${providerPreset((agent.provider ?? 'claude') as AgentProvider).label} · ${modelWord(agent.provider as AgentProvider | undefined, agent.model) ?? t('pro.god.config.cliDefault')}`, mono: true },
              { k: t('pro.god.session'), v: agent.ptyId ? <PathRow value={agent.ptyId} technical copyTitle={t('pro.god.copySession')} /> : t('pro.god.config.noSessionYet'), mono: true }
            ] : [])
          ]} />
        </GodCard>
        <GodCard>
          <CardH>{t('pro.god.config.reach')}</CardH>
          <Kv rows={[
            // 0.4.11: the line names the way Slack reaches the office (polling,
            // socket or webhook), the same word the Settings radio wears.
            { k: t('pro.god.config.slack'), v: config?.slackEnabled
              ? (config.slackChannelId
                ? t('pro.god.config.slackOn', { channel: config.slackChannelId, way: t(`settings.connections.slackWay.${resolveSlackMode(config)}.label`) })
                : t('pro.god.config.slackOnAny', { way: t(`settings.connections.slackWay.${resolveSlackMode(config)}.label`) }))
              : t('pro.god.config.slackOff') },
            { k: t('pro.god.config.webhooks'), v: t('pro.god.config.webhooksCount', { count: webhooks.length, on: webhooksOn }) }
          ]} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn size="sm" onClick={() => nav.go('automations')}>{t('pro.god.config.automations')}</Btn>
            <Btn size="sm" onClick={() => nav.go('team')}>{t('pro.god.config.team')}</Btn>
            <Btn size="sm" kind="ghost" onClick={() => window.dispatchEvent(new CustomEvent('cth:open-settings', { detail: { section: 'Connections' } }))}>{t('pro.god.config.connections')}</Btn>
          </div>
        </GodCard>
      </div>
    </GodGrid>
  );
}

/** A path or an id, with its copy control in the technical rendering. */
function PathRow({ value, technical, copyTitle }: { value: string; technical: boolean; copyTitle: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0, maxWidth: '100%' }}>
      <span style={monoText} title={value}>{value}</span>
      {technical && <CopyBtn value={value} title={copyTitle} size={22} />}
    </span>
  );
}
