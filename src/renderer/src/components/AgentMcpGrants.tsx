/**
 * Each agent's own MCP grants (shared/agentMcp.ts): pick an agent, then set a
 * server on or off for it alone, or let it follow the floor's default above.
 * Saved at once through updateConfig, like the defaults beside it; the agent
 * gets the change the next time it starts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { MCP_CATALOG } from '@shared/mcpCatalog';
import { hasOwnMcpRow, mcpEnabledFor, withAgentMcp } from '@shared/agentMcp';

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--cth-font-display)',
  fontSize: 8,
  lineHeight: '12px',
  color: 'var(--cth-ink-500)',
  textTransform: 'uppercase'
};

const inputStyle: React.CSSProperties = {
  padding: '6px 8px 4px',
  background: 'var(--cth-paper-100)',
  border: 'none',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
  fontFamily: 'var(--cth-font-ui)',
  fontSize: 13,
  color: 'var(--cth-ink-900)',
  outline: 'none'
};

type Choice = 'floor' | 'on' | 'off';

export function AgentMcpGrants({ config }: { config: HarnessConfig }) {
  const { t } = useTranslation();
  const agents = useStore((s) => s.agents);
  const [agentId, setAgentId] = useState<string>(() => agents[0]?.id ?? '');
  // The map as saved last, so two changes in a row build on each other.
  const [perAgent, setPerAgent] = useState(config.agentMcp);
  const [note, setNote] = useState('');

  const choiceFor = (mcpId: string): Choice => {
    if (!hasOwnMcpRow(perAgent, agentId, mcpId)) return 'floor';
    return perAgent?.[agentId]?.[mcpId]?.enabled ? 'on' : 'off';
  };

  const pick = async (mcpId: string, choice: Choice) => {
    const next = withAgentMcp(perAgent, agentId, mcpId, choice === 'floor' ? null : choice === 'on');
    try {
      await window.cth.updateConfig({ agentMcp: next });
      setPerAgent(next);
      setNote(t('mcpGrants.saved', 'Saved. The agent gets it the next time it starts.'));
    } catch {
      setNote(t('mcpDefaults.couldNotSave'));
    }
    setTimeout(() => setNote(''), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-agent-mcp-grants>
      <div>
        <div style={{ ...labelStyle, marginBottom: 6 }}>{t('mcpGrants.title', 'Per agent')}</div>
        <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
          {t('mcpGrants.desc', 'Give one agent a server the floor does not have, or take one away from it. Follow floor uses the default above.')}
        </span>
      </div>
      {agents.length === 0 ? (
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('mcpGrants.noAgents', 'No agents on the floor yet.')}</span>
      ) : (
        <>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            aria-label={t('mcpGrants.agent', 'Agent')}
            style={{ ...inputStyle, width: 260 }}
          >
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MCP_CATALOG.map((entry) => {
              const choice = choiceFor(entry.id);
              const floorOn = mcpEnabledFor(entry, config.mcpDefaults, undefined, agentId);
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    padding: '7px 10px', background: 'var(--cth-paper-100)',
                    boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
                  }}
                >
                  <span style={{ fontSize: 12, lineHeight: '18px', color: 'var(--cth-ink-900)', minWidth: 0 }}>
                    {entry.label}
                    <code style={{ marginLeft: 6, fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{entry.id}</code>
                  </span>
                  <select
                    value={choice}
                    onChange={(e) => { void pick(entry.id, e.target.value as Choice); }}
                    aria-label={entry.label}
                    style={{ ...inputStyle, width: 170, flexShrink: 0 }}
                  >
                    <option value="floor">
                      {t('mcpGrants.followFloor', { state: floorOn ? t('common.on') : t('common.off'), defaultValue: 'Follow floor ({{state}})' })}
                    </option>
                    <option value="on">{t('common.on')}</option>
                    <option value="off">{t('common.off')}</option>
                  </select>
                </div>
              );
            })}
          </div>
        </>
      )}
      {note && <span style={{ fontSize: 12, color: 'var(--cth-ink-700)' }}>{note}</span>}
    </div>
  );
}
