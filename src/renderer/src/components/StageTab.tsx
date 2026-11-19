import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { SpritePortrait } from './SpritePortrait';
import { useStore, type Agent } from '@/store/store';

type Dundie = { id: string; title: string; winner: string; detail: string };

type DrillState = {
  active: boolean;
  interimId: string | null;
  startedAt: string | null;
  note: string | null;
};

const emptyDrill: DrillState = { active: false, interimId: null, startedAt: null, note: null };

/**
 * STAGE — the crazy floor shows in one Command Center tab:
 * Dundie Awards, Fire Drill, Camera tour, Annex wing, Schrute Farms mode.
 * Each section is a v1 that reuses hive mail / holds / directory — no new IPC.
 */
export function StageTab() {
  const { t } = useTranslation();
  const agents = useStore((s) => s.agents);
  const god = agents.find((a) => a.isGod) ?? null;
  const godName = god?.name ?? 'Michael';
  const workers = useMemo(
    () => agents.filter((a) => !a.isGod && !a.isAssistant && !a.id.startsWith('worker-')),
    [agents]
  );

  const [schrute, setSchrute] = useState(false);
  const [schruteBusy, setSchruteBusy] = useState(false);
  const [dundies, setDundies] = useState<Dundie[]>([]);
  const [dundieAt, setDundieAt] = useState<string | null>(null);
  const [dundieBusy, setDundieBusy] = useState(false);
  const [drill, setDrill] = useState<DrillState>(emptyDrill);
  const [interimPick, setInterimPick] = useState('');
  const [drillBusy, setDrillBusy] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [cameraOn, setCameraOn] = useState(true);
  const [annexNote, setAnnexNote] = useState<string | null>(null);
  const [annexBusy, setAnnexBusy] = useState(false);

  useEffect(() => {
    window.cth.getConfig().then((c) => {
      setSchrute(!!(c as { schruteFarmsMode?: boolean }).schruteFarmsMode);
    }).catch(() => { /* noop */ });
    try {
      const raw = localStorage.getItem('cth.fireDrill');
      if (raw) setDrill({ ...emptyDrill, ...JSON.parse(raw) });
    } catch { /* noop */ }
  }, []);

  const persistDrill = (next: DrillState) => {
    setDrill(next);
    try { localStorage.setItem('cth.fireDrill', JSON.stringify(next)); } catch { /* noop */ }
  };

  const toggleSchrute = async () => {
    if (schruteBusy) return;
    setSchruteBusy(true);
    const next = !schrute;
    try {
      await window.cth.updateConfig({ schruteFarmsMode: next });
      setSchrute(next);
    } catch { /* noop */ }
    setSchruteBusy(false);
  };

  const handOutDundies = async () => {
    setDundieBusy(true);
    try {
      const [dir, tasksRaw] = await Promise.all([
        window.cth.hiveAgentDirectory(),
        window.cth.hiveTasks()
      ]);
      const taskList = (tasksRaw as { tasks?: Array<{ assignee?: string; status?: string }> } | null)?.tasks ?? [];
      const live = (dir.agents ?? []).filter((a) => !a.archived && !a.isAssistant);
      const byId = new Map(live.map((a) => [a.id, a]));
      const nameOf = (id: string) => byId.get(id)?.name ?? agents.find((a) => a.id === id)?.name ?? id;

      const tokenKing = [...live].sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0))[0];
      const stall = [...live]
        .filter((a) => a.lastActiveSecAgo != null)
        .sort((a, b) => (b.lastActiveSecAgo ?? 0) - (a.lastActiveSecAgo ?? 0))[0];
      const doneCount = new Map<string, number>();
      const blockedCount = new Map<string, number>();
      for (const task of taskList) {
        if (!task.assignee) continue;
        if (task.status === 'done') doneCount.set(task.assignee, (doneCount.get(task.assignee) ?? 0) + 1);
        if (task.status === 'blocked') blockedCount.set(task.assignee, (blockedCount.get(task.assignee) ?? 0) + 1);
      }
      const finisher = [...doneCount.entries()].sort((a, b) => b[1] - a[1])[0];
      const blocked = [...blockedCount.entries()].sort((a, b) => b[1] - a[1])[0];
      const inbox = [...live].sort((a, b) => (b.inboxBacklog ?? 0) - (a.inboxBacklog ?? 0))[0];

      const awards: Dundie[] = [];
      if (tokenKing && (tokenKing.tokens ?? 0) > 0) {
        awards.push({
          id: 'tokens',
          title: t('stage.dundieTokens'),
          winner: tokenKing.name,
          detail: t('stage.dundieTokensDetail', { n: tokenKing.tokens })
        });
      }
      if (stall && (stall.lastActiveSecAgo ?? 0) > 30) {
        awards.push({
          id: 'stall',
          title: t('stage.dundieStall'),
          winner: stall.name,
          detail: t('stage.dundieStallDetail', { sec: stall.lastActiveSecAgo })
        });
      }
      if (finisher) {
        awards.push({
          id: 'done',
          title: t('stage.dundieDone'),
          winner: nameOf(finisher[0]),
          detail: t('stage.dundieDoneDetail', { n: finisher[1] })
        });
      }
      if (blocked) {
        awards.push({
          id: 'blocked',
          title: t('stage.dundieBlocked'),
          winner: nameOf(blocked[0]),
          detail: t('stage.dundieBlockedDetail', { n: blocked[1] })
        });
      }
      if (inbox && (inbox.inboxBacklog ?? 0) > 0) {
        awards.push({
          id: 'inbox',
          title: t('stage.dundieInbox'),
          winner: inbox.name,
          detail: t('stage.dundieInboxDetail', { n: inbox.inboxBacklog })
        });
      }
      if (!awards.length) {
        awards.push({
          id: 'empty',
          title: t('stage.dundieEmpty'),
          winner: godName,
          detail: t('stage.dundieEmptyDetail')
        });
      }
      setDundies(awards);
      setDundieAt(new Date().toLocaleString());
    } catch {
      setDundies([{
        id: 'err',
        title: t('stage.dundieEmpty'),
        winner: godName,
        detail: t('stage.dundieFailed')
      }]);
    }
    setDundieBusy(false);
  };

  const startDrill = async () => {
    if (!god || drillBusy) return;
    const interim = workers.find((a) => a.id === interimPick) ?? workers[0];
    if (!interim) {
      persistDrill({ ...emptyDrill, note: t('stage.drillNeedWorker') });
      return;
    }
    setDrillBusy(true);
    try {
      await window.cth.hiveSetAgentHold(god.id, true);
      const tasksRaw = await window.cth.hiveTasks();
      const taskList = (tasksRaw as { tasks?: Array<{ id: string; assignee?: string; status?: string }> } | null)?.tasks ?? [];
      const reassigned: string[] = [];
      for (const task of taskList) {
        if (task.status === 'doing' && (task.assignee === god.id || !task.assignee)) {
          await window.cth.hivePatchTask(task.id, { assignee: interim.id });
          reassigned.push(task.id);
        }
      }
      await window.cth.hiveSend(
        {
          to: interim.id,
          act: 'request',
          subject: t('stage.drillMailSubject'),
          body: t('stage.drillMailBody', {
            godName,
            interim: interim.name,
            count: reassigned.length
          })
        },
        'human'
      );
      await window.cth.hiveSend(
        {
          to: 'god',
          act: 'inform',
          subject: t('stage.drillGodSubject'),
          body: t('stage.drillGodBody', { interim: interim.name })
        },
        'human'
      );
      persistDrill({
        active: true,
        interimId: interim.id,
        startedAt: new Date().toISOString(),
        note: t('stage.drillStarted', { interim: interim.name, godName })
      });
    } catch (e) {
      persistDrill({
        ...drill,
        note: t('stage.drillFailed', { error: e instanceof Error ? e.message : String(e) })
      });
    }
    setDrillBusy(false);
  };

  const endDrill = async () => {
    if (!god || drillBusy) return;
    setDrillBusy(true);
    try {
      await window.cth.hiveSetAgentHold(god.id, false);
      const interim = workers.find((a) => a.id === drill.interimId);
      await window.cth.hiveSend(
        {
          to: 'god',
          act: 'inform',
          subject: t('stage.drillClearSubject'),
          body: t('stage.drillClearBody', {
            interim: interim?.name ?? t('stage.drillInterimFallback'),
            godName
          })
        },
        'human'
      );
      persistDrill({
        active: false,
        interimId: null,
        startedAt: null,
        note: t('stage.drillCleared', { godName })
      });
    } catch (e) {
      persistDrill({
        ...drill,
        note: t('stage.drillFailed', { error: e instanceof Error ? e.message : String(e) })
      });
    }
    setDrillBusy(false);
  };

  const narrate = useCallback(async () => {
    try {
      const dir = await window.cth.hiveAgentDirectory();
      const stamp = new Date().toLocaleTimeString();
      const next: string[] = [`[${stamp}] ${t('stage.cameraOpen')}`];
      for (const a of dir.agents.filter((x) => !x.archived).slice(0, 8)) {
        const where = a.isGod ? t('stage.cameraGodDesk') : t('stage.cameraDesk');
        const age = a.lastActiveSecAgo == null
          ? t('stage.cameraQuiet')
          : t('stage.cameraAge', { sec: a.lastActiveSecAgo });
        next.push(
          t('stage.cameraLine', {
            name: a.name,
            status: a.status,
            where,
            age,
            tool: a.lastTool || t('stage.cameraNoTool'),
            tokens: a.tokens ?? 0
          })
        );
      }
      if (dir.agents.every((a) => a.archived || a.status === 'idle')) {
        next.push(t('stage.cameraAllIdle'));
      }
      setLines((prev) => [...next, ...prev].slice(0, 40));
    } catch {
      setLines((prev) => [t('stage.cameraFailed'), ...prev].slice(0, 40));
    }
  }, [t]);

  useEffect(() => {
    if (!cameraOn) return;
    void narrate();
    const iv = setInterval(() => { void narrate(); }, 8000);
    return () => clearInterval(iv);
  }, [cameraOn, narrate]);

  const pingAnnex = async () => {
    setAnnexBusy(true);
    setAnnexNote(null);
    try {
      const res = await window.cth.hiveSend(
        {
          to: 'god',
          act: 'request',
          subject: t('stage.annexMailSubject'),
          body: t('stage.annexMailBody', { godName })
        },
        'human'
      );
      setAnnexNote(res.ok
        ? t('stage.annexSent', { godName })
        : t('stage.annexFailed', { error: res.error ?? '?' }));
    } catch (e) {
      setAnnexNote(t('stage.annexFailed', { error: e instanceof Error ? e.message : String(e) }));
    }
    setAnnexBusy(false);
  };

  const section: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '10px 0',
    borderTop: '1px solid var(--cth-ink-100)'
  };
  const head: CSSProperties = {
    fontFamily: 'var(--cth-font-ui)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    color: 'var(--cth-ink-900)',
    margin: 0
  };
  const body: CSSProperties = {
    margin: 0,
    fontFamily: 'var(--cth-font-ui)',
    fontSize: 12,
    color: 'var(--cth-ink-700)',
    lineHeight: 1.45
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '8px 12px 20px',
      overflow: 'auto',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--cth-ink-900)'
        }}>{t('stage.title')}</div>
        <p style={body}>{t('stage.lead', { godName })}</p>
      </div>

      {/* Schrute Farms */}
      <div style={section}>
        <h3 style={head}>{t('stage.schruteTitle')}</h3>
        <p style={body}>{t('stage.schruteLead')}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <PixelButton onClick={toggleSchrute} disabled={schruteBusy}>
            {schrute ? t('stage.schruteOn') : t('stage.schruteOff')}
          </PixelButton>
          <span style={body}>{schrute ? t('stage.schruteOnHint') : t('stage.schruteOffHint')}</span>
        </div>
      </div>

      {/* Dundies */}
      <div style={section}>
        <h3 style={head}>{t('stage.dundieTitle')}</h3>
        <p style={body}>{t('stage.dundieLead')}</p>
        <PixelButton onClick={handOutDundies} disabled={dundieBusy}>
          {dundieBusy ? t('stage.dundieBusy') : t('stage.dundieHandOut')}
        </PixelButton>
        {dundieAt && <p style={body}>{t('stage.dundieAt', { when: dundieAt })}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dundies.map((d) => (
            <div key={d.id} style={{
              padding: '8px 10px',
              background: 'var(--cth-paper-100)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)'
            }}>
              <div style={{ fontFamily: 'var(--cth-font-ui)', fontWeight: 700, fontSize: 12, color: 'var(--cth-ink-900)' }}>
                {d.title}
              </div>
              <div style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-900)' }}>
                {d.winner}
              </div>
              <div style={body}>{d.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fire Drill */}
      <div style={section}>
        <h3 style={head}>{t('stage.drillTitle')}</h3>
        <p style={body}>{t('stage.drillLead', { godName })}</p>
        {!drill.active ? (
          <>
            <label style={{ ...body, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {t('stage.drillInterim')}
              <select
                value={interimPick}
                onChange={(e) => setInterimPick(e.target.value)}
                style={{
                  fontFamily: 'var(--cth-font-mono)',
                  fontSize: 12,
                  padding: '4px 6px',
                  background: 'var(--cth-paper-100)',
                  color: 'var(--cth-ink-900)',
                  border: '1px solid var(--cth-ink-300)'
                }}
              >
                <option value="">{t('stage.drillPickFirst')}</option>
                {workers.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <PixelButton onClick={startDrill} disabled={drillBusy || workers.length === 0}>
              {drillBusy ? t('stage.drillBusy') : t('stage.drillStart')}
            </PixelButton>
          </>
        ) : (
          <PixelButton onClick={endDrill} disabled={drillBusy}>
            {drillBusy ? t('stage.drillBusy') : t('stage.drillClear')}
          </PixelButton>
        )}
        {drill.note && <p style={body}>{drill.note}</p>}
        {drill.active && drill.interimId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(() => {
              const a = workers.find((w) => w.id === drill.interimId) as Agent | undefined;
              return a ? <SpritePortrait character={a.character} scale={1} /> : null;
            })()}
            <span style={body}>{t('stage.drillRunning', {
              interim: workers.find((w) => w.id === drill.interimId)?.name ?? '—',
              godName
            })}</span>
          </div>
        )}
      </div>

      {/* Camera */}
      <div style={section}>
        <h3 style={head}>{t('stage.cameraTitle')}</h3>
        <p style={body}>{t('stage.cameraLead')}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <PixelButton onClick={() => setCameraOn((v) => !v)}>
            {cameraOn ? t('stage.cameraStop') : t('stage.cameraStart')}
          </PixelButton>
          <PixelButton onClick={() => { void narrate(); }}>{t('stage.cameraNow')}</PixelButton>
        </div>
        <div style={{
          fontFamily: 'var(--cth-font-mono)',
          fontSize: 11,
          color: 'var(--cth-ink-900)',
          background: 'var(--cth-paper-100)',
          boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
          padding: 8,
          maxHeight: 180,
          overflow: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {lines.length ? lines.join('\n') : t('stage.cameraEmpty')}
        </div>
      </div>

      {/* Annex */}
      <div style={section}>
        <h3 style={head}>{t('stage.annexTitle')}</h3>
        <p style={body}>{t('stage.annexLead')}</p>
        <PixelButton onClick={pingAnnex} disabled={annexBusy}>
          {annexBusy ? t('stage.annexBusy') : t('stage.annexPing')}
        </PixelButton>
        {annexNote && <p style={body}>{annexNote}</p>}
      </div>
    </div>
  );
}
