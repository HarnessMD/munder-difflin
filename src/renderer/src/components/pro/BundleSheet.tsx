/**
 * Grant a role bundle (v0.4.9 W-B, laid out in phase 6b): pick a role, pick an
 * agent (sprites, never initials), press Grant. The technical rendering adds
 * the catalog id and the MCP tier to every server chip.
 *
 * WHAT GRANT WRITES. Each MCP server the agent does not already resolve to
 * goes through window.cth.setAgentMcp, the same per agent row the launch
 * path honours (shared/agentMcp.ts), one write per server so main merges
 * against the file rather than a stale snapshot. Skills in a bundle ship
 * with the app and are copied into every agent at start (there is no per
 * agent skills door), and tools are facts about this machine, so those two
 * halves are shown, said plainly, and not written. The toast names what was
 * granted and opens the agent's room, where the grants show and Manage
 * leads back to Capabilities to trim.
 *
 * THE LAYOUT, AND WHY IT IS THIS ONE (founder, 3 Sep 2026: the sheet was
 * undesigned). The old sheet drew all eleven bundles as full cards, each one
 * carrying its own MCP, skills and tools chips: around two hundred chips at
 * once, in which the selected card was a one pixel border change and the only
 * question the sheet exists to answer, "what does pressing this button do to
 * this agent", was nowhere on the screen.
 *
 * So it splits the way TaskSheet splits, with the same header, the same
 * 18px body, the same 24px column gap and the same footer:
 *
 *   main    the eleven roles as compact cards, then the ONE chosen role
 *           opened up: its servers, its skills, its tools, each group saying
 *           whether granting writes it or not
 *   rail    who is receiving it, and the arithmetic of this grant, so the
 *           count in the footer is never the first time you see it
 *   footer  the sentence, then Cancel, then the action, on the right
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import type { HarnessConfig } from '@/store/config';
import { MCP_CATALOG, type McpTier } from '@shared/mcpCatalog';
import { toolCatalog } from '@shared/toolCatalog';
import { ROLE_BUNDLES, bundleGrantPlan, type RoleBundle } from '@shared/roleBundles';
import { usePaneNav } from '../professional/paneNav';
import { Btn, Card, Chip, CloseX, Portrait, Sheet, proToast, type ChipTone } from './ui';
import { ProIcon } from './icons';
import { useTechnical } from './depth';
import { providerOf } from './capData';
import { closeBundleSheet, useBundleSheet } from './bundleSheetStore';

const TIER_TONE: Record<McpTier, ChipTone> = { 'safe-readonly': 'ok', write: 'warn', secret: 'bad' };
const PROVIDER_LABEL: Record<string, string> = { claude: 'Claude Code', opencode: 'OpenCode', codex: 'Codex' };

export function BundleSheetHost({ config }: { config: HarnessConfig | null }) {
  const target = useBundleSheet();
  if (!target) return null;
  return <BundleSheet config={config} preselect={target.agentId} onClose={closeBundleSheet} />;
}

export function BundleSheet({ config, preselect, onClose }: { config: HarnessConfig | null; preselect?: string; onClose: () => void }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const nav = usePaneNav();
  const agents = useStore((s) => s.agents);
  const [agentId, setAgentId] = useState<string | undefined>(preselect ?? agents[0]?.id);
  const [bundleId, setBundleId] = useState<string>(ROLE_BUNDLES[0].id);
  const [busy, setBusy] = useState(false);

  const agent = agents.find((a) => a.id === agentId);
  const chosen = ROLE_BUNDLES.find((b) => b.id === bundleId) ?? ROLE_BUNDLES[0];
  const plan = agent ? bundleGrantPlan(chosen, agent.id, config?.mcpDefaults, config?.agentMcp, providerOf(agent)) : null;
  const tools = useMemo(() => toolCatalog(), []);
  const toolLabel = (id: string) => tools.find((x) => x.id === id)?.label ?? id;
  const already = plan?.already ?? [];

  const grant = async () => {
    if (!agent || !plan) return;
    setBusy(true);
    const done: string[] = [];
    try {
      for (const id of plan.grant) {
        await window.cth.setAgentMcp(agent.id, id, true);
        done.push(id);
      }
    } catch {
      proToast(t('pro.bundles.failed', { name: agent.name }), { tone: 'bad' });
    } finally {
      setBusy(false);
    }
    if (done.length === plan.grant.length) {
      const labels = done.map((id) => MCP_CATALOG.find((e) => e.id === id)?.label ?? id).join(', ');
      const text = done.length ? t('pro.bundles.granted', { name: agent.name, list: labels }) : t('pro.bundles.nothingNew', { name: agent.name });
      proToast(text, { tone: 'ok', ms: 7000, action: { label: t('pro.bundles.openAgent'), run: () => nav.go(`agent:${agent.id}`) } });
      onClose();
    }
  };

  return (
    <Sheet onClose={onClose} width={900}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <span aria-hidden style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--cth-cream-200)', color: 'var(--cth-ink-700)', flexShrink: 0 }}>
          <ProIcon name="capabilities" size={17} />
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('pro.bundles.title')}</h2>
          <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.bundles.sub')}</span>
        </div>
        <CloseX onClick={onClose} title={t('common.close')} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 24, padding: 18, alignContent: 'start' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title={t('pro.bundles.pickBundle')}>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {ROLE_BUNDLES.map((b) => <RolePick key={b.id} b={b} on={b.id === chosen.id} onClick={() => setBundleId(b.id)} />)}
            </div>
          </Section>

          <Section title={t('pro.bundles.includes', { role: t(chosen.labelKey) })}>
            <Card style={{ padding: '12px 14px', gap: 12 }}>
              <Group title={t('pro.caps.mcp')} note={t('pro.bundles.mcpNote')}>
                {chosen.mcp.map((id) => {
                  const e = MCP_CATALOG.find((x) => x.id === id);
                  const has = already.includes(id);
                  return (
                    <Chip key={id} tone={has ? 'muted' : 'accent'} title={has ? t('pro.bundles.alreadyHas') : e?.description}>
                      {e?.label ?? id}
                      {technical && e && <><Code>{e.id}</Code><Chip tone={TIER_TONE[e.tier]} style={{ height: 16, padding: '0 5px', fontSize: 10 }}>{t(`pro.caps.tier.${e.tier}`)}</Chip></>}
                    </Chip>
                  );
                })}
              </Group>
              <Group title={t('pro.caps.skills')} note={t('pro.bundles.skillsNote')}>
                {chosen.skills.map((name) => <Chip key={name} tone="outline">{name}</Chip>)}
              </Group>
              <Group title={t('pro.caps.tools')} note={t('pro.bundles.toolsNote')}>
                {chosen.tools.map((id) => <Chip key={id} tone="outline">{toolLabel(id)}{technical && <Code>{id}</Code>}</Chip>)}
              </Group>
            </Card>
          </Section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title={t('pro.bundles.pickAgent')}>
            {agents.length === 0 ? <Muted>{t('pro.bundles.noAgents')}</Muted> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {agents.map((a) => <AgentPick key={a.id} agent={a} on={a.id === agentId} onClick={() => setAgentId(a.id)} />)}
              </div>
            )}
          </Section>

          <Section title={t('pro.bundles.thisGrant')}>
            <Card style={{ padding: '10px 12px', gap: 7 }}>
              <Tally label={t('pro.bundles.toAdd')} count={plan?.grant.length ?? 0} tone={plan && plan.grant.length > 0 ? 'accent' : 'muted'} />
              <Tally label={t('pro.bundles.alreadyOn')} count={already.length} tone="muted" />
              {agent && plan && !plan.mcpReaches && (
                <Muted>{t('pro.caps.notForEngine', { engine: PROVIDER_LABEL[providerOf(agent)] ?? providerOf(agent) })}</Muted>
              )}
            </Card>
          </Section>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)' }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--cth-ink-500)' }}>
          {agent && plan && (plan.mcpReaches
            ? t('pro.bundles.willGrant', { count: plan.grant.length, already: plan.already.length })
            : t('pro.bundles.nothingToGrant'))}
        </span>
        <Btn size="sm" onClick={onClose}>{t('pro.dialog.cancel')}</Btn>
        <Btn size="sm" kind="primary" disabled={!agent || !plan || busy || !plan.mcpReaches} onClick={() => { void grant(); }}>
          {agent ? t('pro.bundles.grantTo', { name: agent.name }) : t('pro.bundles.grant')}
        </Btn>
      </div>
    </Sheet>
  );
}

/* ───────────────────────────── pieces ─────────────────────────────────── */

/** One of the eleven roles: the name, the founder's line about it, and how
 *  much is in it. The contents open up once, below, for the chosen one. */
function RolePick({ b, on, onClick }: { b: RoleBundle; on: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Card onClick={onClick} selected={on} ariaLabel={t(b.labelKey)} style={{ padding: '10px 12px', gap: 4, background: on ? 'var(--cth-accent-soft)' : 'var(--cth-cream-50)' }}>
      <b style={{ fontSize: 12.5, fontWeight: 600, color: on ? 'var(--cth-accent-text)' : 'var(--cth-ink-900)' }}>{t(b.labelKey)}</b>
      <small style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.4 }}>{t(b.blurbKey)}</small>
      <small style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>
        {t('pro.bundles.counts', { mcp: b.mcp.length, skills: b.skills.length, tools: b.tools.length })}
      </small>
    </Card>
  );
}

function AgentPick({ agent, on, onClick }: { agent: Agent; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: 36, padding: '0 9px 0 5px', borderRadius: 10, cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 500, textAlign: 'start',
      border: `1px solid ${on ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`, background: on ? 'var(--cth-accent-soft)' : 'var(--cth-cream-100)', color: on ? 'var(--cth-accent-text)' : 'var(--cth-ink-900)'
    }}>
      <Portrait agent={agent} size={24} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</span>
      {on && <ProIcon name="check" size={14} />}
    </button>
  );
}

/** One line of the grant's arithmetic: what it is, and how many. */
function Tally({ label, count, tone }: { label: string; count: number; tone: ChipTone }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--cth-ink-700)' }}>{label}</span>
      <Chip tone={tone}>{count}</Chip>
    </div>
  );
}

/** A half of the bundle, with the sentence about whether Grant writes it
 *  attached to the chips themselves rather than left at the foot of the sheet. */
function Group({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{title}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{children}</div>
      <small style={{ fontSize: 11, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{note}</small>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10.5, color: 'var(--cth-ink-500)' }}>{children}</code>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <h4 style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{title}</h4>
      {children}
    </section>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{children}</span>;
}
