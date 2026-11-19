/**
 * SLACK, AS THE INTEGRATIONS SCREEN DRAWS IT. Add the keys and the channel
 * and it starts working. Every field is a config field, staged in the
 * screen's draft:
 *
 *   SlackSwitch      the on/off switch in the pane's header
 *   SlackSetup       the connection type, only the fields that type uses
 *                    (shared/slackSetup.ts slackFieldsShown), Test, the live
 *                    lines (what Slack is not sending, why the catch up check
 *                    is off) and one fold: how to make the app from the
 *                    manifest
 *   SlackWhoAnswers  "Who answers": `responder`
 *
 * Nothing writes as it is typed or clicked. Every change is a staged field,
 * and the task 'slack:apply' restarts or stops the bridge after Save writes
 * them. Inbound webhooks are InboundIntegrations.tsx.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import type { HarnessConfig } from '@/store/config';
import { SLACK_BOT_SCOPES, SLACK_CATCHUP_CHOICES, SLACK_MODES, SLACK_POLL_CHOICES, joinSlackChannels, resolveCatchupSeconds, resolvePollSeconds, resolveSlackChannels, resolveSlackMode, type SlackChannel, type SlackMode, type SlackStatus } from '@shared/slackMode';
import { slackFieldsShown, slackMissingFields, slackModeFor, slackSaveAction, type SlackFields, type SlackWay } from '@shared/slackSetup';
import { SLACK_BOT_EVENTS, SLACK_BOT_HANDLE, slackAppManifestText } from '@shared/slackManifest';
import { PixelButton } from '../PixelButton';
import { BoundPortNote } from '../BoundPortNote';
import { useSettingsDraft } from './SettingsFrame';
import { settingsKit } from './classicChrome';
import { OnOff, Tag, ToneDot, classicInput as inputStyle } from './classicBits';
import type { SettingsDraft } from './draftStore';
import { AgentPicker, Disclosure, FieldRow, monoInput } from './primitives';

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

/** Stage Slack fields and make sure Save applies them to the bridge. */
export function stageSlack(draft: SettingsDraft | null, p: Partial<HarnessConfig>): void {
  if (!draft) return;
  draft.stage(p as Record<string, unknown>);
  draft.setTask('slack:apply', applySlack);
}

/** Slack as the page shows it: the staged fields over the saved ones, what
 *  the chosen way still lacks, and the bridge's own state. */
export function useSlackView(config: HarnessConfig, live: SlackStatus | null) {
  const { t } = useTranslation();
  const { draft, get } = useField(config);
  const on = get('slackEnabled', false);
  const botToken = get('slackBotToken', '');
  const appToken = get('slackAppToken', '');
  const channelId = get('slackChannelId', '');
  const signingSecret = get('slackSigningSecret', '');
  const mode: SlackMode = get('slackMode', resolveSlackMode(config)) as SlackMode;
  const fields: SlackFields = { on, way: mode, botToken, appToken, channelId, signingSecret };
  const missing = slackMissingFields(fields);
  // What the switch waits for, before it is on: the page greys it until these are in.
  const missingIfOn = slackMissingFields({ ...fields, on: true });
  const running = live?.running === true;
  const fieldName = (k: string) => t(`settings.conn.slack.field.${k}`);
  const stateText = running
    ? t('settings.conn.state.connected')
    : on && missing.length ? t('settings.conn.state.needs', { fields: missing.map(fieldName).join(', ') }) : on ? t('settings.conn.state.notConnected') : t('settings.conn.state.off');
  return { draft, get, on, botToken, appToken, channelId, signingSecret, mode, missing, missingIfOn, running, stateText, fieldName };
}

/** The on/off switch, for the pane's header. Staged like every field. */
export function SlackSwitch({ config, disabled }: { config: HarnessConfig; disabled?: boolean }) {
  const { t } = useTranslation();
  const { draft, get } = useField(config);
  const on = get('slackEnabled', false);
  const stage = (p: Partial<HarnessConfig>) => stageSlack(draft, p);
  return <OnOff on={on} disabled={disabled} onChange={(v) => stage({ slackEnabled: v })} label={t('settings.conn.slack.switch')} />;
}

/** Post in Slack on its own: what agents do in Slack, so it sits apart from the setup. */
export function SlackPostSwitch({ config, label, line }: { config: HarnessConfig; label: string; line: string }) {
  const { draft, get, on } = useSlackView(config, null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} data-slack-proactive>
      {/* Off and greyed with the line off: nothing posts then (slack:reply in main). What it was set to is kept. */}
      <OnOff on={on && get('slackProactivePosting', false)} disabled={!on} onChange={(v) => stageSlack(draft, { slackProactivePosting: v })} label={label} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{line}</span>
      </span>
    </div>
  );
}

/** Setup: everything about how Slack reaches the office. `onRecheck` reads
 *  the bridge's state again at once (the "Check again" on a live warning). */
export function SlackSetup({ config, live, onRecheck }: { config: HarnessConfig; live: SlackStatus | null; onRecheck?: () => void }) {
  const { t } = useTranslation();
  const { draft, get, on, appToken, botToken, channelId, signingSecret, mode, running, stateText, fieldName } = useSlackView(config, live);
  const { codeBox } = settingsKit;
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [testNote, setTestNote] = useState('');
  const [testing, setTesting] = useState(false);
  const [manifestCopied, setManifestCopied] = useState(false);

  const pickedChannels = resolveSlackChannels(channelId);
  // 'auto' is not stored: it is "the mode is what the tokens would pick".
  const autoMode = slackModeFor({ way: 'auto', appToken });
  const way: SlackWay = mode === autoMode ? 'auto' : mode;
  const shown = slackFieldsShown(way, mode);

  const stage = (p: Partial<HarnessConfig>) => stageSlack(draft, p);
  const setAppToken = (v: string) => stage(way === 'auto' ? { slackAppToken: v, slackMode: slackModeFor({ way: 'auto', appToken: v }) } : { slackAppToken: v });
  const setWay = (w: SlackWay) => stage({ slackMode: w === 'auto' ? autoMode : w });

  const test = async () => {
    setTesting(true); setTestNote('');
    try {
      const r = await window.cth.slackTest({ mode, botToken, appToken, signingSecret });
      if (r.channels) {
        // Nothing is ticked for the person. No channel named means
        // every channel the bot is in, so adding the bot to one more needs no
        // visit here; filling in the only channel found would pin it to that one.
        setChannels(r.channels);
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

  const pending = !!draft?.hasTask('slack:apply');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} data-slack-card>
      {/* The live way is connected but Slack sends it none of these; the
          minute check brings them, and this says what to add. A notice,
          1px all round, above the fields it is about. */}
      {running && !!live?.liveMissing?.length && (
        <div role="note" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px 6px', background: 'var(--cth-cream-100)', boxShadow: 'inset 0 0 0 1px var(--cth-status-waiting)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <ToneDot tone="waiting" />
            <b style={{ flex: 1, minWidth: 160, fontSize: 13, color: 'var(--cth-ink-900)' }}>{t('integrations.screen.slack.needsEvents', { events: live.liveMissing.join(', ') })}</b>
            {onRecheck && <PixelButton variant="secondary" size="sm" onClick={onRecheck}>{t('integrations.screen.slack.checkAgain')}</PixelButton>}
          </div>
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--cth-ink-700)' }} data-slack-live-missing>{t('settings.conn.slack.liveMissing', { events: live.liveMissing.join(', ') })}</span>
        </div>
      )}

      {/* Slack off has its switch to say so, and no tag here. */}
      {(on || running) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Tag>{running && <ToneDot tone="success" />}<span data-slack-state={running ? 'on' : 'off'}>{stateText}</span></Tag>
        </div>
      )}

      {/* No Advanced fold: the connection type sits with the rest, and only
          the fields that type uses are drawn. */}
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
            <SlackChannelPicker
              label={fieldName('channelId')}
              channels={channels}
              picked={pickedChannels}
              typed={channelId}
              onPick={(ids) => stage({ slackChannelId: joinSlackChannels(ids) })}
              onType={(raw) => stage({ slackChannelId: raw })}
            />
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
            <PixelButton variant="secondary" size="sm" onClick={() => { void window.cth.copyToClipboard(live.url ?? ''); }}>{t('common.copy')}</PixelButton>
          </div>
          {running && <BoundPortNote bound={live} />}
        </FieldRow>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <PixelButton variant="secondary" size="sm" onClick={() => { void test(); }} disabled={testing} dataAttrs={{ 'data-slack-test-btn': 'true' }}>
          {testing ? t('settings.connections.diag.testing') : t('settings.connections.diag.test')}
        </PixelButton>
        {/* The app comes from a manifest: scopes, bot events, socket mode and
            the Messages tab in one paste (shared/slackManifest). */}
        <PixelButton variant="secondary"
          size="sm"
          onClick={() => { void window.cth.copyToClipboard(slackAppManifestText()); setManifestCopied(true); window.setTimeout(() => setManifestCopied(false), 2000); }}
          dataAttrs={{ 'data-slack-copy-manifest': 'true' }}
        >
          {manifestCopied ? t('settings.conn.slack.manifestCopied') : t('settings.conn.slack.copyManifest')}
        </PixelButton>
      </div>
      {testNote && <span style={{ fontSize: 12, color: 'var(--cth-ink-700)' }} data-slack-test>{testNote}</span>}
      {live?.lastError && <span style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }} data-slack-error>{live.lastError}</span>}
      {running && live?.catchupError && <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }} data-slack-catchup-off>{t('settings.conn.slack.catchupOff', { error: live.catchupError })}</span>}
      {pending && <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }} data-slack-pending>{t('settings.conn.appliesOnSave')}</span>}

      <Disclosure title={t('settings.conn.slack.howTo')} dataAttr="slack-howto">
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.conn.slack.manifestInfo')}</span>
        <pre style={codeBox} data-slack-steps>{t('settings.conn.slack.steps', { scopes: SLACK_BOT_SCOPES.socket.join(', '), events: SLACK_BOT_EVENTS.join(', '), handle: SLACK_BOT_HANDLE })}</pre>
      </Disclosure>
    </div>
  );
}

/**
 * The channels as one dropdown. "All channels" is the
 * first row and the default, and while it is ticked every channel row is
 * greyed out. Untick it to tick one or more channels. No channel saved means
 * every channel the bot is in, so closing the dropdown with none ticked is
 * "All channels" again. Rows: each channel Test connection found, then each
 * saved id the bot is no longer in, so nothing saved is hidden. Before Test
 * connection has listed any, ids can still be typed.
 */
function SlackChannelPicker({ label, channels, picked, typed, onPick, onType }: {
  label: string; channels: SlackChannel[]; picked: string[]; typed: string;
  onPick: (ids: string[]) => void; onType: (raw: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Unticked "All channels" with nothing ticked yet: the person is choosing.
  const [choosing, setChoosing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const all = picked.length === 0 && !choosing;
  const close = () => { setOpen(false); setChoosing(false); };
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) close(); };
    window.addEventListener('mousedown', down);
    return () => window.removeEventListener('mousedown', down);
  }, [open]);

  const rows = [...channels.map((c) => ({ id: c.id, label: `#${c.name}` })), ...picked.filter((id) => !channels.some((c) => c.id === id)).map((id) => ({ id, label: id }))];
  const nameOf = (id: string) => rows.find((r) => r.id === id)?.label ?? id;
  const summary = all ? t('settings.conn.slack.allChannels')
    : picked.length === 0 ? t('settings.conn.slack.pickChannels')
      : picked.length <= 2 ? picked.map(nameOf).join(', ') : t('settings.conn.slack.channelsCount', { n: picked.length });
  const row = { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 12 } as const;
  const hint = { fontSize: 12, color: 'var(--cth-ink-500)', padding: '4px 6px' } as const;

  return (
    <div ref={boxRef} style={{ position: 'relative' }} data-slack-channels>
      <button
        type="button" aria-haspopup="true" aria-expanded={open} aria-label={label}
        onClick={() => (open ? close() : setOpen(true))}
        style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer', textAlign: 'left' }}
        data-slack-channels-button
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
        <span aria-hidden style={{ flexShrink: 0 }}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div
          role="group" aria-label={label}
          style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 2, padding: 6, maxHeight: 240, overflowY: 'auto', background: 'var(--cth-cream-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300), var(--cth-shadow-hard)' }}
          data-slack-channels-menu
        >
          <label style={row}>
            <input type="checkbox" checked={all} onChange={(e) => { if (e.target.checked) { setChoosing(false); onPick([]); } else setChoosing(true); }} data-slack-all-channels />
            <span><b>{t('settings.conn.slack.allChannels')}</b> <span style={{ color: 'var(--cth-ink-500)' }}>{t('settings.conn.slack.anyChannel')}</span></span>
          </label>
          <div style={{ height: 1, background: 'var(--cth-ink-300)', margin: '4px 0' }} />
          {channels.length > 0 ? rows.map((c) => (
            <label key={c.id} style={{ ...row, opacity: all ? 0.5 : 1, cursor: all ? 'not-allowed' : 'pointer' }}>
              <input
                type="checkbox" disabled={all}
                checked={picked.includes(c.id)}
                onChange={(e) => { setChoosing(true); onPick(e.target.checked ? [...picked, c.id] : picked.filter((x) => x !== c.id)); }}
              />
              {c.label}
            </label>
          )) : (
            <>
              {!all && <input value={typed} onChange={(e) => onType(e.target.value)} placeholder="C0123ABCD, C0456EFGH" aria-label={label} style={monoInput} data-slack-channel />}
              <span style={hint}>{t('settings.conn.slack.listChannels')}</span>
            </>
          )}
          {!all && picked.length === 0 && <span style={hint}>{t('settings.conn.slack.noneMeansAll')}</span>}
        </div>
      )}
    </div>
  );
}

/** Who answers: the agent a Slack message lands with. */
export function SlackWhoAnswers({ config, godName }: { config: HarnessConfig; godName: string }) {
  const { t } = useTranslation();
  const { draft, get } = useField(config);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-slack-who>
      <FieldRow label={t('integrations.hub.in.who')} info={t('settings.conn.slack.answeredByInfo', { godName })}>
        <AgentPicker value={get('responder', '')} onChange={(id) => draft?.stage({ responder: id })} label={t('integrations.hub.in.who')} godName={godName} />
      </FieldRow>
    </div>
  );
}

function everyLabel(t: (k: string, o?: Record<string, unknown>) => string, s: number): string {
  if (s === 0) return t('settings.connections.slackWay.off');
  if (s < 60) return t('settings.connections.slackWay.everySeconds', { n: s });
  if (s === 60) return t('settings.connections.slackWay.everyMinute');
  if (s < 3600) return t('settings.connections.slackWay.everyMinutes', { n: Math.round(s / 60) });
  return t('settings.connections.slackWay.everyHour');
}
