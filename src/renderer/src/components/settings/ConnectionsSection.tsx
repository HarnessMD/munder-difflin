/**
 * SETTINGS > CONNECTIONS (0.5.3 settings redesign; founder 24 Sep 2026:
 * "Connections and Integrations should have agent selector for each type of
 * connection we support which is only (slack and custom webhook) slack
 * configuration at the top, simplify the slack configuration ... they just
 * add the keys and channel ID and it should start working").
 *
 *   Slack            a switch, the connection type, only the fields that
 *                    type uses (shared/slackSetup.ts slackFieldsShown),
 *                    "Answered by", Test, and one fold: how to get the tokens.
 *                    No Advanced fold (batch 3 #9, founder 25 Sep). Every field is a config field
 *                    staged in the page's draft; the task 'slack:apply' then
 *                    restarts or stops the bridge after Save writes them. The
 *                    answering agent is `responder`, which teammates' messages
 *                    follow too (0.5.2 Option A).
 *   Inbound          the webhook server's state and public address, the
 *   integrations     default agent (`webhookResponder`), the samples, the add
 *                    form and every endpoint (InboundIntegrations.tsx). It
 *                    replaced both Custom webhook and the Integrations
 *                    section (batch 3 #10 to #14).
 *
 * Organisation settings moved to the Team window, and MCP servers and API
 * tokens to Keys & Secrets.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import type { HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { SLACK_BOT_SCOPES, SLACK_CATCHUP_CHOICES, SLACK_MODES, SLACK_POLL_CHOICES, resolveCatchupSeconds, resolvePollSeconds, resolveSlackMode, type SlackChannel, type SlackMode, type SlackStatus } from '@shared/slackMode';
import { slackFieldsShown, slackMissingFields, slackModeFor, slackSaveAction, type SlackFields, type SlackWay } from '@shared/slackSetup';
import { Btn, Chip, Switch, inputStyle } from '../pro/ui';
import { settingsChrome } from '../pro/settings/chrome';
import { BoundPortNote } from '../BoundPortNote';
import { CollapsibleSection, useSettingsChrome, useSettingsDraft } from './SettingsFrame';
import { AgentPicker, Disclosure, FieldRow, monoInput } from './primitives';
import { InboundIntegrationsCard } from './InboundIntegrations';

/** Read a field as the page shows it: staged in the draft, else on disk. */
function useField(config: HarnessConfig) {
  const draft = useSettingsDraft();
  return {
    draft,
    get: <K extends keyof HarnessConfig>(k: K, fallback: NonNullable<HarnessConfig[K]>): NonNullable<HarnessConfig[K]> =>
      (draft ? draft.value(k as string, config[k] ?? fallback) : (config[k] ?? fallback)) as NonNullable<HarnessConfig[K]>
  };
}

/** The Slack fields as Save will see them, from a config (after the write). */
function slackFieldsOf(c: HarnessConfig): SlackFields {
  return {
    on: c.slackEnabled ?? false,
    way: resolveSlackMode(c),
    botToken: c.slackBotToken ?? '',
    appToken: c.slackAppToken ?? '',
    channelId: c.slackChannelId ?? '',
    signingSecret: c.slackSigningSecret ?? ''
  };
}

/**
 * The task behind Slack's part of Save. Runs after the config write, so the
 * config on disk already holds what the person set: stop a running bridge
 * (its stop clears the saved flag), write the flag this Save means through
 * slack:setConfig, then start it when the switch is on and nothing is missing.
 */
export async function applySlack(): Promise<void> {
  const c = await window.cth.getConfig();
  const f = slackFieldsOf(c);
  const running = (await window.cth.slackStatus().catch(() => null))?.running === true;
  if (running || !f.on) await window.cth.slackStop().catch(() => undefined);
  await window.cth.slackSetConfig({
    enabled: f.on,
    mode: resolveSlackMode(c),
    signingSecret: f.signingSecret,
    botToken: f.botToken,
    appToken: f.appToken,
    channelId: f.channelId,
    port: c.slackPort ?? 3847,
    proactivePosting: c.slackProactivePosting ?? false,
    pollSeconds: resolvePollSeconds(c.slackPollSeconds),
    catchupSeconds: resolveCatchupSeconds(c.slackSocketCatchupSeconds),
    tempCwd: c.slackTempCwd ?? ''
  });
  const action = slackSaveAction(f);
  if (action === 'start') {
    const r = await window.cth.slackStart();
    if (!r.ok) throw new Error(`Slack: ${r.error ?? i18n.t('settings.connections.slackWay.startFailed')}`);
  }
  // Switched on but something is missing: the fields are saved, and Save says
  // what is missing instead of a happy Saved (slack-bridge-never-starts). The
  // task stays, so pressing Save again after the fix starts it.
  if (action === 'none') {
    const missing = slackMissingFields(f).map((k) => i18n.t(`settings.conn.slack.field.${k}`).toLowerCase());
    throw new Error(`Slack: ${i18n.t('settings.connections.diag.missing', { fields: missing.join(', ') })}`);
  }
}

export function ConnectionsSection({ config }: { config: HarnessConfig }) {
  const godName = useStore((s) => s.agents.find((a) => a.isGod)?.name) ?? 'the orchestrator';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-connections-section>
      <SlackCard config={config} godName={godName} />
      <InboundIntegrationsCard config={config} godName={godName} />
    </div>
  );
}

function SlackCard({ config, godName }: { config: HarnessConfig; godName: string }) {
  const { t } = useTranslation();
  const { draft, get } = useField(config);
  const { codeBox } = settingsChrome(useSettingsChrome());
  const [live, setLive] = useState<SlackStatus | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [testNote, setTestNote] = useState('');
  const [testing, setTesting] = useState(false);

  const on = get('slackEnabled', false);
  const botToken = get('slackBotToken', '');
  const appToken = get('slackAppToken', '');
  const channelId = get('slackChannelId', '');
  const signingSecret = get('slackSigningSecret', '');
  const mode: SlackMode = get('slackMode', resolveSlackMode(config)) as SlackMode;
  // 'auto' is not stored: it is "the mode is what the tokens would pick".
  const autoMode = slackModeFor({ way: 'auto', appToken });
  const way: SlackWay = mode === autoMode ? 'auto' : mode;
  const fields: SlackFields = { on, way: mode, botToken, appToken, channelId, signingSecret };
  const missing = slackMissingFields(fields);
  const shown = slackFieldsShown(way, mode);
  const running = live?.running === true;

  /** Stage Slack fields and make sure Save applies them to the bridge. */
  const stage = (p: Partial<HarnessConfig>) => {
    if (!draft) return;
    draft.stage(p as Record<string, unknown>);
    draft.setTask('slack:apply', applySlack);
  };
  const setAppToken = (v: string) => stage(way === 'auto' ? { slackAppToken: v, slackMode: slackModeFor({ way: 'auto', appToken: v }) } : { slackAppToken: v });
  const setWay = (w: SlackWay) => stage({ slackMode: w === 'auto' ? autoMode : w });

  useEffect(() => {
    let alive = true;
    const tick = () => { window.cth.slackStatus().then((s) => { if (alive) setLive(s); }).catch(() => { /* keep the last */ }); };
    tick();
    const id = window.setInterval(tick, 5000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  const test = async () => {
    setTesting(true); setTestNote('');
    try {
      const r = await window.cth.slackTest({ mode, botToken, appToken, signingSecret });
      if (r.channels) {
        setChannels(r.channels);
        if (r.channels.length === 1 && !channelId.trim()) stage({ slackChannelId: r.channels[0].id });
      }
      const parts: string[] = [];
      if (r.team) parts.push(t('settings.connections.diag.ok', { team: r.team, bot: r.botName ?? '?' }));
      else if (r.error) parts.push(t('settings.connections.diag.authFail', { error: r.error }));
      if (r.socket) parts.push(r.socket.ok ? t('settings.connections.diag.socketOk') : t('settings.connections.diag.socketFail', { error: r.socket.error ?? '?' }));
      if (r.missingScopes?.length) parts.push(t('settings.connections.scopes.missing', { scopes: r.missingScopes.join(', ') }));
      setTestNote(parts.join(' ') || t('settings.connections.diag.noToken'));
    } catch (e) {
      setTestNote(e instanceof Error ? e.message : String(e));
    } finally { setTesting(false); }
  };

  const fieldName = (k: string) => t(`settings.conn.slack.field.${k}`);
  const stateText = running
    ? t('settings.conn.state.connected')
    : on && missing.length ? t('settings.conn.state.needs', { fields: missing.map(fieldName).join(', ') }) : on ? t('settings.conn.state.notConnected') : t('settings.conn.state.off');
  const pending = !!draft?.hasTask('slack:apply');

  return (
    <CollapsibleSection id="conn-slack" title={t('settings.conn.slack.title')} info={t('settings.conn.slack.info', { godName })} summary={stateText} defaultOpen>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-slack-card>
        <Switch on={on} onChange={(v) => stage({ slackEnabled: v })} label={t('settings.conn.slack.switch')} />
        <span style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>{t('settings.conn.slack.switch')}</span>
        <Chip tone={running ? 'ok' : 'outline'} style={{ fontSize: 11 }}><span data-slack-state={running ? 'on' : 'off'}>{stateText}</span></Chip>
      </div>

      {/* Batch 3 #9 (founder 25 Sep): no Advanced fold. The connection type
          sits with the rest, and only the fields that type uses are drawn. */}
      <FieldRow label={t('settings.conn.slack.wayLabel')} info={t('settings.conn.slack.wayInfo')}>
        <select aria-label={t('settings.conn.slack.wayLabel')} value={way} onChange={(e) => setWay(e.target.value as SlackWay)} style={{ ...inputStyle, maxWidth: 280 }} data-slack-way>
          {(['auto', ...SLACK_MODES] as const).map((w) => <option key={w} value={w}>{t(`settings.conn.slack.wayChoice.${w}`)}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }} data-slack-mode={mode}>{t(`settings.conn.slack.way.${mode}`)}</span>
      </FieldRow>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }} data-slack-fields={shown.join(' ')}>
        {shown.includes('botToken') && (
          <FieldRow label={fieldName('botToken')} info={t('settings.conn.slack.botTokenInfo')}>
            <input type="password" autoComplete="off" value={botToken} onChange={(e) => stage({ slackBotToken: e.target.value })} placeholder="xoxb-..." style={monoInput} data-slack-bot-token />
          </FieldRow>
        )}
        {shown.includes('appToken') && (
          <FieldRow label={fieldName('appToken')} info={t('settings.conn.slack.appTokenInfo')}>
            <input type="password" autoComplete="off" value={appToken} onChange={(e) => setAppToken(e.target.value)} placeholder="xapp-..." style={monoInput} data-slack-app-token />
          </FieldRow>
        )}
        {shown.includes('signingSecret') && (
          <FieldRow label={fieldName('signingSecret')} info={t('settings.conn.slack.signingSecretInfo')}>
            <input type="password" autoComplete="off" value={signingSecret} onChange={(e) => stage({ slackSigningSecret: e.target.value })} style={monoInput} data-slack-signing-secret />
          </FieldRow>
        )}
        {shown.includes('channelId') && (
          <FieldRow label={fieldName('channelId')} info={t('settings.conn.slack.channelInfo')}>
            {channels.length > 1 ? (
              <select aria-label={fieldName('channelId')} value={channelId} onChange={(e) => stage({ slackChannelId: e.target.value })} style={inputStyle}>
                <option value="">{t('settings.conn.slack.anyChannel')}</option>
                {channels.map((c) => <option key={c.id} value={c.id}>{`#${c.name}`}</option>)}
              </select>
            ) : (
              <input value={channelId} onChange={(e) => stage({ slackChannelId: e.target.value })} placeholder="C0123ABCD" style={monoInput} data-slack-channel />
            )}
          </FieldRow>
        )}
        {mode === 'polling' && (
          <FieldRow label={t('settings.connections.slackWay.checkEvery')}>
            <select aria-label={t('settings.connections.slackWay.checkEvery')} value={resolvePollSeconds(get('slackPollSeconds', 60))} onChange={(e) => stage({ slackPollSeconds: Number(e.target.value) })} style={inputStyle}>
              {SLACK_POLL_CHOICES.map((s) => <option key={s} value={s}>{everyLabel(t, s)}</option>)}
            </select>
          </FieldRow>
        )}
        {mode === 'socket' && (
          <FieldRow label={t('settings.connections.slackWay.catchupEvery')} info={t('settings.connections.slackWay.catchupEveryHint')}>
            <select aria-label={t('settings.connections.slackWay.catchupEvery')} value={resolveCatchupSeconds(get('slackSocketCatchupSeconds', 300))} onChange={(e) => stage({ slackSocketCatchupSeconds: Number(e.target.value) })} style={inputStyle}>
              {SLACK_CATCHUP_CHOICES.map((s) => <option key={s} value={s}>{everyLabel(t, s)}</option>)}
            </select>
          </FieldRow>
        )}
        {mode === 'webhook' && (
          <FieldRow label={t('settings.connections.port')}>
            <input type="number" value={String(get('slackPort', 3847))} onChange={(e) => stage({ slackPort: Number(e.target.value) || 3847 })} style={{ ...monoInput, maxWidth: 110 }} />
          </FieldRow>
        )}
      </div>
      {mode === 'webhook' && live?.url && (
        <FieldRow label={t('settings.connections.requestUrl')}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input readOnly value={live.url} onFocus={(e) => e.currentTarget.select()} style={monoInput} />
            <Btn size="sm" onClick={() => { void window.cth.copyToClipboard(live.url ?? ''); }}>{t('common.copy')}</Btn>
          </div>
          {running && <BoundPortNote bound={live} />}
        </FieldRow>
      )}

      <FieldRow label={t('settings.conn.answeredBy')} info={t('settings.conn.slack.answeredByInfo', { godName })}>
        <AgentPicker value={get('responder', '')} onChange={(id) => draft?.stage({ responder: id })} label={t('settings.conn.answeredBy')} godName={godName} />
      </FieldRow>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} data-slack-proactive>
        <Switch on={get('slackProactivePosting', false)} onChange={(v) => stage({ slackProactivePosting: v })} label={t('settings.connections.proactive.label')} />
        <span style={{ fontSize: 12.5, color: 'var(--cth-ink-900)' }}>{t('settings.connections.proactive.label')}</span>
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.conn.slack.proactiveShort')}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Btn size="sm" onClick={() => { void test(); }} disabled={testing} dataAttrs={{ 'data-slack-test-btn': 'true' }}>
          {testing ? t('settings.connections.diag.testing') : t('settings.connections.diag.test')}
        </Btn>
      </div>
      {testNote && <span style={{ fontSize: 12, color: 'var(--cth-ink-700)' }} data-slack-test>{testNote}</span>}
      {live?.lastError && <span style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }} data-slack-error>{live.lastError}</span>}
      {pending && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }} data-slack-pending>{t('settings.conn.appliesOnSave')}</span>}

      <Disclosure title={t('settings.conn.slack.howTo')} dataAttr="slack-howto">
        <pre style={codeBox} data-slack-steps>{t('settings.conn.slack.steps', { scopes: SLACK_BOT_SCOPES.socket.join(', ') })}</pre>
      </Disclosure>
    </CollapsibleSection>
  );
}

function everyLabel(t: (k: string, o?: Record<string, unknown>) => string, s: number): string {
  if (s === 0) return t('settings.connections.slackWay.off');
  if (s < 60) return t('settings.connections.slackWay.everySeconds', { n: s });
  if (s === 60) return t('settings.connections.slackWay.everyMinute');
  if (s < 3600) return t('settings.connections.slackWay.everyMinutes', { n: Math.round(s / 60) });
  return t('settings.connections.slackWay.everyHour');
}
