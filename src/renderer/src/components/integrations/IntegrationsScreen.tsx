/**
 * INTEGRATIONS: Slack, the inbound webhooks, the services agents call and
 * every key and secret, as one section of Settings.
 *
 * Three tabs at the head:
 *
 *   Apps and services  Slack, each inbound webhook, the one GitHub row, each
 *                      service connection, then every preset not added yet
 *   AI providers       the provider keys, a list and the picked key's page
 *   Keys and secrets   a grid of custom secrets; a pick opens one, with a
 *                      way back to the grid
 *
 * Apps and services is a list on the left and the picked item on the right.
 * Two cards above the list say the two kinds, events coming in and agents
 * using a service, and filter it. Each row: the service's logo, its name, one
 * plain line and a badge. An app not connected is just the rest of the list.
 *
 * The right pane is one page for every kind: Events coming in, What agents
 * can do, and Activity folded at the end (integrationActivity.ts, read from
 * main). A part that does not apply says so rather than hiding.
 *
 * NOTHING SAVES AS YOU TYPE OR CLICK. The pane edits stage into one draft
 * (settings/draftStore.ts) and the footer's Save commits it: config fields in
 * one write, then the tasks (Slack's restart, the webhook list, a key for the
 * broker, a connection). Discard drops it. Leaving the item or the screen with
 * something unsaved asks Save, Discard or Cancel (settings/leaveGuard.ts).
 */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { integrationsClient, type IntegrationRecordView, type IntegrationTemplate } from '@/integrations/registryClient';
import { authTypeNeedsSecret, resolveTemplate } from '@shared/integrations';
import type { SlackStatus } from '@shared/slackMode';
import { blankInboundForm, type InboundWebhookForm } from '@shared/inboundWebhook';
import { GITHUB_WEBHOOK_EVENTS, type WebhookSource, type WebhookTrigger } from '@shared/triggers';
import { secretTaskId } from '@shared/customSecrets';
import { PixelButton } from '../PixelButton';
import { PixelBadge, type StatusKind } from '../PixelBadge';
import { Icon, type IconName } from '../Icon';
import { receiverLabel, receiverOptions, receiverWords } from '../triggers/receiverOptions';
import { createSettingsDraft, type SettingsDraft } from '../settings/draftStore';
import { SettingsFrameProvider } from '../settings/SettingsFrame';
import { setLeaveGuard } from '../settings/leaveGuard';
import { ClassicNotice, ClassicSheet, CloseButton, OnOff, ToneDot, classicInput, classicLabel } from '../settings/classicBits';
import { SlackPostSwitch, SlackSetup, SlackSwitch, SlackWhoAnswers, useSlackView } from '../settings/ConnectionsSection';
import { AddInboundSheet, WebhookSetup, WebhookSwitch, WebhookWhoAnswers, sourceOf, useInboundHooks, type InboundHooks } from '../settings/InboundIntegrations';
import { ConnectionSetup, connRemoveTaskId, isGitTemplate, templateName, useConnectionDraft, useFmtTest } from '../settings/ServiceConnections';
import { AddSecretSetup, CustomSecretSetup, ProviderKeySetup } from '../settings/KeysSecretsSection';
import { PROVIDER_KEY_BACKENDS, keyTaskId } from '../settings/providerKeys';
import { ServiceLogo, logoIdFor, type ServiceLogoId } from './ServiceLogo';
import {
  CONN_TONE, GITHUB_ITEM, HOOK_TONE, KEYS_ITEM, KEY_TONE, NEW_SECRET_ITEM, PROVIDERS_ITEM, SLACK_ITEM, SLACK_TONE,
  connCode, connItem, connNeedsLook, hookNeedsLook, itemRef, matchesQuery, newConnItem, pickItem, secretItem, slackCode,
  slackNeedsLook, webhookItem, type HookCode, type IntegrationGroup, type LookTone
} from './integrationsModel';
import {
  GITHUB_EVENT_WORD, githubEventsAfter, githubEventsOn, githubRecords, kindShown, serviceKind, workingFirst,
  type HubTab, type KindFilter, type ServiceKind
} from './integrationsHub';
import { INTEGRATIONS_EVENT, peekWantedIntegration, takeWantedIntegration } from './integrationsNav';
import { useConnTests } from './integrationsStore';
import { IntegrationActivity } from './IntegrationActivity';

/** Which tab an item is on: a door may name any of them. */
function hubTabOf(key: string | null): HubTab {
  const r = key ? itemRef(key) : null;
  if (r?.kind === 'providers') return 'providers';
  if (r?.kind === 'secret') return PROVIDER_KEY_BACKENDS.some((b) => b.envVar === r.name) ? 'providers' : 'keys';
  return r?.kind === 'keys' || r?.kind === 'newSecret' ? 'keys' : 'apps';
}

/** The two parts of Apps and services, in this order. */
type AppPart = 'custom' | 'preset';

/** One row of the list. */
interface Row {
  key: string;
  group: IntegrationGroup;
  /** Which of the two kinds it is: what the two cards filter by. */
  kind?: ServiceKind;
  /** Keys and secrets come in two runs: the provider keys and your own. */
  run?: 'providers' | 'custom';
  name: string;
  logo: ServiceLogoId;
  line: string;
  tone: LookTone;
  /** Empty: no badge. */
  chip: string;
  /** Its part of Apps and services: a custom API or a preset. */
  part?: AppPart;
  attn: boolean;
  /** A key row: a smaller logo, and the name in the mono face when it is an env var name. */
  compact?: boolean;
  mono?: boolean;
}

/** A row's tone as a Classic badge's status. */
const BADGE: Record<LookTone, StatusKind> = { ok: 'success', warn: 'waiting', bad: 'blocked', off: 'idle' };

export function IntegrationsScreen({ config }: { config: HarnessConfig | null }) {
  // One draft for the screen: every pane stages into it, the footer commits it.
  const [draft] = useState(createSettingsDraft);
  useSyncExternalStore(draft.subscribe, draft.version);
  // Leaving the screen already asked; what is left is dropped with it.
  useEffect(() => () => { draft.reset(); }, [draft]);
  return (
    <SettingsFrameProvider draft={draft}>
      {config ? <Body config={config} draft={draft} /> : null}
    </SettingsFrameProvider>
  );
}

function Body({ config, draft }: { config: HarnessConfig; draft: SettingsDraft }) {
  const { t } = useTranslation();
  const agents = useStore((s) => s.agents);
  const godName = agents.find((a) => a.isGod)?.name ?? t('integrations.screen.orchestrator');
  const tests = useConnTests();
  const inbound = useInboundHooks(config);

  /* ---- what the list is made of ----------------------------------------- */
  const [live, setLive] = useState<SlackStatus | null>(null);
  const readSlack = () => { window.cth.slackStatus().then(setLive).catch(() => { /* keep the last */ }); };
  useEffect(() => {
    readSlack();
    const id = window.setInterval(readSlack, 5000);
    return () => window.clearInterval(id);
  }, []);
  const [gen, setGen] = useState(0);
  const reload = () => setGen((g) => g + 1);
  const [records, setRecords] = useState<IntegrationRecordView[]>([]);
  const [templates, setTemplates] = useState<IntegrationTemplate[]>([]);
  const [hasKey, setHasKey] = useState<Record<string, boolean>>({});
  const [secrets, setSecrets] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void Promise.all([integrationsClient.list().catch(() => []), integrationsClient.listTemplates().catch(() => [])])
      .then(([r, tp]) => { if (alive) { setRecords(Array.isArray(r) ? r : []); setTemplates(Array.isArray(tp) ? tp : []); } });
    void Promise.all(PROVIDER_KEY_BACKENDS.map((b) => window.cth.providerKeyHas(b.id).then((h) => [b.id, h === true] as const).catch(() => [b.id, false] as const)))
      .then((pairs) => { if (alive) setHasKey(Object.fromEntries(pairs)); });
    window.cth.customSecretList().then((n) => { if (alive && Array.isArray(n)) setSecrets([...n].sort()); }).catch(() => undefined);
    return () => { alive = false; };
  }, [gen]);
  /** The templates of the list. GitHub and its git credential are the one GitHub row. */
  const offered = templates.filter((x) => !isGitTemplate(x) && x.kind !== 'github');

  /* ---- the picked item --------------------------------------------------- */
  const [selected, setPicked] = useState<string | null>(() => peekWantedIntegration());
  const [hubTab, setHubTab] = useState<HubTab>(() => hubTabOf(peekWantedIntegration()));
  /** A pick opens the tab it is on. */
  const setSelected = (key: string | null) => { setPicked(key); if (key) setHubTab(hubTabOf(key)); };
  // Taken once the screen is up, so a second open of it starts on its own.
  useEffect(() => { takeWantedIntegration(); }, []);
  /** Bumped by Discard, so the pane's own fields forget what was typed. */
  const [paneGen, setPaneGen] = useState(0);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>(null);
  const [addingHook, setAddingHook] = useState(false);
  const [hookForm, setHookForm] = useState<InboundWebhookForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ bad: boolean; text: string } | null>(null);

  /* ---- the rows ---------------------------------------------------------- */
  const slack = useSlackView(config, live);
  const answerOptions = receiverOptions(agents, { value: '', label: godName }, receiverWords(t));
  const answeredBy = (value: string | undefined) => receiverLabel(value ?? '', answerOptions);
  const slackAnswerer = answeredBy(draft.value('responder', config.responder ?? '') as string);
  const hookAnswerer = (w: WebhookTrigger) => (w.to ? answeredBy(w.to) : answeredBy(inbound.responder));

  const sCode = slackCode({ on: slack.on, missing: slack.missing, status: live });
  // Slack is a connected app once it is on or holds a token; until then it is
  // one of the apps to add. By what is saved, so typing a token does not move
  // the row or the page under the person.
  const slackListed = config.slackEnabled === true || !!config.slackBotToken;
  const gh = githubRecords(records);
  const ghRecord = gh.api ?? gh.git;
  const ghHook = inbound.hooks.find((w) => sourceOf(w) === 'github' && !inbound.isRemoved(w.id) && w.enabled);
  const kindWord = (k: ServiceKind) => t(`integrations.hub.line.${k}`);
  const broughtIn = (name: string) => `${kindWord('in')}, ${t('integrations.hub.line.answered', { name })}`;

  const rows: Row[] = [];
  const otherRows: Row[] = [];
  {
    const slackLine = sCode === 'off' ? kindWord('in')
      : sCode === 'needs' ? slack.stateText
      : sCode === 'down' ? (live?.lastError || live?.configError || slack.stateText)
      : sCode === 'starting' ? t('integrations.screen.line.starting')
      : broughtIn(slackAnswerer);
    const slackRow: Row = { key: SLACK_ITEM, group: 'chat', kind: 'in', part: 'preset', name: t('integrations.hub.name.slackApp'), logo: 'slack', line: kindWord('in'), tone: 'off', chip: '', attn: false };
    if (slackListed) rows.push({ ...slackRow, line: slackLine, tone: SLACK_TONE[sCode], chip: t(`integrations.screen.chip.slack.${sCode}`), attn: slackNeedsLook(sCode) });
    else otherRows.push(slackRow);

    for (const w of inbound.hooks) {
      const s = sourceOf(w);
      // The address state is the row's own, timed (useInboundHooks).
      const c: HookCode = inbound.isRemoved(w.id) ? 'removing' : inbound.addressState(w);
      const line = c === 'unsaved' ? t('integrations.screen.line.addedOnSave')
        : c === 'removing' ? t('integrations.screen.line.removedOnSave')
        : c === 'off' ? t('integrations.screen.line.offAnsweredBy', { name: hookAnswerer(w) })
        : c === 'failed' ? t('integrations.screen.line.hookFailed')
        : c === 'creating' ? t('integrations.screen.line.hookCreating')
        : broughtIn(hookAnswerer(w));
      rows.push({
        key: webhookItem(w.id), group: 'webhooks', kind: 'in', name: w.name || t(`settings.integ.sourceName.${s}`),
        logo: logoIdFor({ kind: 'webhook', templateId: s === 'custom' ? undefined : s, label: w.name }),
        line, tone: HOOK_TONE[c], chip: t(`integrations.screen.chip.hook.${c}`), attn: hookNeedsLook(c)
      });
    }

    const ghBase: Row = { key: GITHUB_ITEM, group: 'apps', kind: 'use', part: 'preset', name: t('integrations.hub.name.githubGit'), logo: 'github', line: kindWord('both'), tone: 'off', chip: '', attn: false };
    if (ghRecord) {
      const code = connCode({ enabled: ghRecord.enabled, needsSecret: authTypeNeedsSecret(ghRecord.authType), hasSecret: ghRecord.hasSecret, test: tests[ghRecord.id] });
      const ok = code === 'ready' || code === 'passed';
      const kind: ServiceKind = ghHook ? 'both' : 'use';
      rows.push({
        ...ghBase, kind,
        line: code === 'failed' ? `${kindWord('use')}, ${t('integrations.hub.line.keyFailed')}` : ok ? kindWord(kind) : t(`integrations.screen.line.conn.${code}`),
        tone: CONN_TONE[code], chip: ok ? t('integrations.hub.chip.connected') : t(`integrations.screen.chip.conn.${code}`), attn: connNeedsLook(code)
      });
    } else otherRows.push(ghBase);

    // One made from the blank form (or from no preset) is a custom API; the rest are presets.
    const customApi = (r: IntegrationRecordView) => { const id = resolveTemplate(templates, r)?.idSuggestion; return !id || id === 'my-api'; };
    for (const r of records) {
      if (r === gh.api || r === gh.git) continue;
      const removing = draft.hasTask(connRemoveTaskId(r.id));
      const code = connCode({ enabled: r.enabled, needsSecret: authTypeNeedsSecret(r.authType), hasSecret: r.hasSecret, test: tests[r.id] });
      const kind = serviceKind(r.templateId);
      const ok = code === 'ready' || code === 'passed';
      rows.push({
        key: connItem(r.id), group: 'apps', kind, part: customApi(r) ? 'custom' : 'preset', name: r.label,
        logo: logoIdFor({ kind: r.kind, templateId: r.templateId, label: r.label, baseUrl: r.baseUrl }),
        line: removing ? t('integrations.screen.line.removedOnSave')
          : code === 'failed' ? `${kindWord('use')}, ${t('integrations.hub.line.keyFailed')}` : ok ? kindWord(kind) : t(`integrations.screen.line.conn.${code}`),
        tone: removing ? 'warn' : CONN_TONE[code], chip: t(`integrations.screen.chip.conn.${removing ? 'removing' : code}`), attn: !removing && connNeedsLook(code)
      });
    }

    for (const b of PROVIDER_KEY_BACKENDS) {
      const pending = draft.hasTask(keyTaskId(b.id));
      const code = hasKey[b.id] ? 'saved' : 'unset';
      rows.push({
        key: secretItem(b.envVar), group: 'keys', run: 'providers', name: b.label,
        logo: logoIdFor({ kind: 'key', envVar: b.envVar, label: b.label }),
        line: t(`integrations.hub.key.${code}`), tone: pending ? 'warn' : KEY_TONE[code],
        // A badge only for what is there: "Not set" is the line already.
        chip: pending ? t('integrations.screen.chip.key.pending') : code === 'saved' ? t('integrations.hub.key.saved') : '', attn: false
      });
    }
    const providerEnv = new Set(PROVIDER_KEY_BACKENDS.map((b) => b.envVar));
    for (const n of secrets) {
      // A provider's name is a provider key, listed above.
      if (providerEnv.has(n)) continue;
      const pending = draft.hasTask(secretTaskId(n));
      rows.push({
        key: secretItem(n), group: 'keys', run: 'custom', name: n, logo: logoIdFor({ kind: 'key', envVar: n }),
        line: t('integrations.hub.key.saved'), tone: pending ? 'warn' : 'ok', chip: pending ? t('integrations.screen.chip.key.pending') : '', attn: false, mono: true
      });
    }
    // A secret being added is a row while it is open, so the pane can show it.
    if (selected === NEW_SECRET_ITEM) {
      rows.push({ key: NEW_SECRET_ITEM, group: 'keys', run: 'custom', name: t('integrations.screen.newSecret'), logo: 'key', line: t('integrations.screen.line.addedOnSave'), tone: 'warn', chip: t('integrations.screen.chip.key.pending'), attn: false, compact: true });
    }

    // Added already: not here too. The blank form is the last of the apps.
    const addedTemplates = new Set(records.map((r) => resolveTemplate(templates, r)?.idSuggestion).filter(Boolean));
    const blankApi = (x: IntegrationTemplate) => x.idSuggestion === 'my-api';
    const notAdded = offered.filter((x) => !addedTemplates.has(x.idSuggestion));
    for (const x of [...notAdded.filter((y) => !blankApi(y)), ...notAdded.filter(blankApi)]) {
      const kind = serviceKind(x.idSuggestion);
      otherRows.push({
        key: newConnItem(x.idSuggestion), group: 'apps', kind, part: blankApi(x) ? 'custom' : 'preset',
        name: blankApi(x) ? t('integrations.screen.addSheet.customApi') : templateName(t, x),
        logo: logoIdFor({ kind: x.kind, templateId: x.idSuggestion, label: x.label, baseUrl: x.baseUrl }), line: kindWord(kind), tone: 'off', chip: '', attn: false
      });
    }
  }

  const connected = rows.filter((r) => r.group !== 'keys' && r.group !== 'webhooks');
  const hookRows = rows.filter((r) => r.group === 'webhooks');
  const keyRows = rows.filter((r) => r.group === 'keys');
  const providerRows = keyRows.filter((r) => r.run === 'providers');
  const customRows = keyRows.filter((r) => r.run === 'custom');
  const savedProviders = PROVIDER_KEY_BACKENDS.filter((b) => hasKey[b.id]).length;
  const customCount = customRows.filter((r) => r.key !== NEW_SECRET_ITEM).length;
  const keysRow: Row = {
    key: KEYS_ITEM, group: 'keys', name: t('integrations.screen.keysPage.title'), logo: 'key',
    line: t('integrations.screen.keysPage.line', { set: savedProviders, total: PROVIDER_KEY_BACKENDS.length, custom: customCount }),
    tone: savedProviders + customCount ? 'ok' : 'off', chip: t('integrations.screen.keysPage.chip', { n: savedProviders + customCount }), attn: false
  };
  const providersRow: Row = { key: PROVIDERS_ITEM, group: 'keys', name: t('integrations.hub.tab.providers'), logo: 'key', line: '', tone: 'off', chip: '', attn: false };

  // Apps and services: Custom API integration, then the presets. In each part
  // what is set up comes first, then what can be added; the way to add a
  // custom API leads its part.
  const BLANK_API = newConnItem('my-api');
  const setUpIn = (part: AppPart) => connected.filter((r) => (r.part ?? 'preset') === part);
  const toAddIn = (part: AppPart) => workingFirst(otherRows.filter((r) => (r.part ?? 'preset') === part && r.key !== BLANK_API));
  const appParts: { part: AppPart; rows: Row[] }[] = [
    { part: 'custom', rows: [...otherRows.filter((r) => r.key === BLANK_API), ...setUpIn('custom'), ...toAddIn('custom')] },
    { part: 'preset', rows: [...setUpIn('preset'), ...toAddIn('preset')] }
  ];
  const keys = hubTab === 'providers' ? (providerRows.length ? providerRows.map((r) => r.key) : [PROVIDERS_ITEM])
    : hubTab === 'keys' ? [KEYS_ITEM, ...customRows.map((r) => r.key)]
    // A first visit opens on something set up: those come first here.
    : [...setUpIn('custom'), ...setUpIn('preset'), ...hookRows, ...appParts.flatMap((g) => g.rows)].map((r) => r.key);
  const attnKeys = rows.filter((r) => r.attn).map((r) => r.key);
  // A door that names the AI providers page opens its first key.
  const wanted = selected === PROVIDERS_ITEM ? (providerRows[0]?.key ?? PROVIDERS_ITEM) : selected;
  const shownKey = pickItem(wanted, null, keys, attnKeys);

  /* ---- leaving, here and from the screen --------------------------------- */
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const released = useRef(false);
  const dirty = draft.dirty();
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  /** Do `proceed` now, or once the person has answered the question. */
  const ask = (proceed: () => void) => {
    if (!dirtyRef.current || released.current) { proceed(); return; }
    setLeaving(() => proceed);
  };
  useEffect(() => setLeaveGuard((proceed) => {
    if (!dirtyRef.current || released.current) return false;
    setLeaving(() => proceed);
    return true;
  }), []);
  const go = (proceed: () => void) => {
    setLeaving(null);
    released.current = true;
    try { proceed(); } finally { released.current = false; }
  };

  const select = (key: string) => {
    if (key === shownKey) return;
    ask(() => { setSelected(key); setNote(null); });
  };
  // A tab is a pick like any other: what waits to save asks first.
  const pickHub = (next: HubTab) => {
    if (next === hubTab) return;
    ask(() => { setHubTab(next); setPicked(null); setNote(null); });
  };
  // A door asked for an item while the screen is already on show.
  useEffect(() => {
    const onOpen = () => { const item = takeWantedIntegration(); if (item) select(item); };
    window.addEventListener(INTEGRATIONS_EVENT, onOpen);
    return () => window.removeEventListener(INTEGRATIONS_EVENT, onOpen);
  });

  const save = async (): Promise<boolean> => {
    setSaving(true); setNote(null);
    try {
      const r = await draft.commit({}, (patch) => (Object.keys(patch).length ? window.cth.updateConfig(patch) : Promise.resolve()));
      reload();
      if (!r.ok) {
        setNote({ bad: true, text: t('settings.frame.partlySaved', { error: r.errors[0]?.message ?? '' }) });
        return false;
      }
      setNote({ bad: false, text: t('pro.saveBar.saved') });
      return true;
    } catch (e) {
      setNote({ bad: true, text: e instanceof Error ? e.message : String(e) });
      return false;
    } finally { setSaving(false); }
  };
  const discard = () => {
    draft.reset();
    setPaneGen((g) => g + 1);
    setNote(null);
    // Something being added goes with its draft.
    if (selected?.startsWith('new:') || (selected?.startsWith('webhook:') && !inbound.stored.some((w) => webhookItem(w.id) === selected))) setSelected(null);
  };

  /* ---- adding ------------------------------------------------------------ */
  const openHookForm = (source: WebhookSource) => {
    setAddingHook(false);
    setHookForm(blankInboundForm(source, source === 'custom' ? '' : t(`settings.integ.${source}.title`)));
  };

  /* ---- the list, filtered ------------------------------------------------ */
  // The search and the two cards are Apps and services' own.
  const shows = (r: Row) => kindShown(r.kind ?? 'use', kindFilter) && matchesQuery(query, [r.name, r.line, r.chip]);
  const partsShown = appParts.map((g) => ({ ...g, rows: g.rows.filter(shows) })).filter((g) => g.rows.length > 0);
  const hooksShown = hookRows.filter(shows);
  // Webhooks only ever bring work in.
  const hookPart = kindFilter !== 'use';
  const nothing = partsShown.length === 0 && hooksShown.length === 0 && !hookPart;
  const onCount = (k: 'in' | 'use') => [...connected, ...hookRows].filter((r) => r.tone !== 'off' && (r.kind === k || r.kind === 'both')).length;

  /* ---- the frame --------------------------------------------------------- */
  const root = useRef<HTMLDivElement>(null);
  const width = useWidth(root);
  const narrow = width > 0 && width < 980;
  // The list gives way first; the pane keeps the room its fields need.
  const listWidth = !narrow ? 300 : width < 720 ? 220 : 256;

  const shown = shownKey === KEYS_ITEM ? keysRow : shownKey === PROVIDERS_ITEM ? providersRow
    : rows.find((r) => r.key === shownKey) ?? otherRows.find((r) => r.key === shownKey) ?? null;
  const foot: Foot = { dirty, saving, note, save, discard };

  const pane = shownKey && shown ? (
    <Pane
      key={`${shownKey}:${paneGen}`}
      itemKey={shownKey} row={shown} foot={foot} narrow={narrow}
      config={config} godName={godName} live={live} onRecheck={readSlack}
      inbound={inbound} records={records} templates={templates} hasKey={hasKey} secrets={secrets}
      keyRows={keyRows} onPick={select}
      onSaved={(key) => setSelected(key)} onGone={() => setSelected(null)} onChanged={reload} onAddHook={() => setAddingHook(true)}
      onKeySettled={(id, has) => setHasKey((m) => ({ ...m, [id]: has }))}
    />
  ) : (
    <div style={{ margin: 'auto', fontSize: 13, color: 'var(--cth-ink-500)' }}>{t('integrations.screen.pickOne')}</div>
  );

  return (
    <div ref={root} style={{ height: 'min(680px, 72vh)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }} data-integrations-screen="settings">
      <HubTabs value={hubTab} onChange={pickHub} />
      {hubTab === 'apps' && (
        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, paddingTop: 10 }} data-integrations-kinds>
          <KindCard kind="in" icon="arrow-right" count={onCount('in')} on={kindFilter === 'in'} onPress={() => setKindFilter(kindFilter === 'in' ? null : 'in')} />
          <KindCard kind="use" icon="terminal" count={onCount('use')} on={kindFilter === 'use'} onPress={() => setKindFilter(kindFilter === 'use' ? null : 'use')} />
        </div>
      )}
      {hubTab === 'keys' || shownKey === PROVIDERS_ITEM ? (
        // Keys and secrets has no list: its grid takes the whole width, and a
        // secret's page leads back to it.
        <div style={{ flex: 1, minHeight: 0, display: 'flex', paddingTop: 10 }} data-integrations-keys-only={hubTab}>
          <section aria-label={shown?.name ?? t(`integrations.hub.tab.${hubTab}`)} style={{ ...CARD, flex: 1 }} data-integrations-pane={shownKey ?? ''}>
            {shownKey === KEYS_ITEM || shownKey === PROVIDERS_ITEM
              ? <div className="cth-scroll-hidden" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: narrow ? 16 : 20 }}>{pane}</div>
              : pane}
          </section>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: `${listWidth}px minmax(0, 1fr)`, gap: narrow ? 10 : 14, paddingTop: 10 }}>
          {/* LEFT: the list */}
          <aside aria-label={t('integrations.screen.listLabel')} style={CARD}>
            {hubTab === 'apps' && (
              <div style={{ flexShrink: 0, padding: '10px 10px 8px' }}>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('integrations.hub.list.search')} aria-label={t('integrations.hub.list.search')} style={classicInput} />
              </div>
            )}
            <div className="cth-scroll-hidden" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: hubTab === 'apps' ? '0 6px 14px' : '8px 6px 14px' }} data-integrations-list={hubTab}>
              {hubTab === 'providers' && (
                <section aria-label={t('integrations.hub.tab.providers')} data-integrations-group="providers">
                  {providerRows.map((r) => <ItemRow key={r.key} row={r} selected={r.key === shownKey} onPick={select} />)}
                </section>
              )}
              {hubTab === 'apps' && partsShown.map((g) => (
                <section key={g.part} aria-label={t(`integrations.hub.list.${g.part}`)} data-integrations-group={g.part}>
                  <h3 style={GROUP_HEAD}><span>{t(`integrations.hub.list.${g.part}`)}</span><span>{g.rows.filter((r) => r.tone !== 'off').length}</span></h3>
                  {g.rows.map((r) => <ItemRow key={r.key} row={r} selected={r.key === shownKey} onPick={select} />)}
                </section>
              ))}
              {hubTab === 'apps' && (hookPart || hooksShown.length > 0) && (
                <section aria-label={t('integrations.hub.list.webhooks')} data-integrations-group="webhooks">
                  <h3 style={GROUP_HEAD}><span>{t('integrations.hub.list.webhooks')}</span><span>{hooksShown.length}</span></h3>
                  {hooksShown.map((r) => <ItemRow key={r.key} row={r} selected={r.key === shownKey} onPick={select} />)}
                  {hookPart && <AddRow label={t('integrations.hub.list.addHook')} onClick={() => setAddingHook(true)} data="webhook" />}
                </section>
              )}
              {hubTab === 'apps' && nothing && <p style={{ padding: '24px 10px', margin: 0, fontSize: 12, color: 'var(--cth-ink-500)', textAlign: 'center' }} data-integrations-empty>{t('integrations.hub.list.none')}</p>}
            </div>
          </aside>

          {/* RIGHT: the picked item. */}
          <section aria-label={shown?.name ?? t('integrations.screen.title')} style={CARD} data-integrations-pane={shownKey ?? ''}>{pane}</section>
        </div>
      )}

      {addingHook && <AddHookSheet onClose={() => setAddingHook(false)} onWebhook={openHookForm} />}
      {hookForm && (
        <AddInboundSheet initial={hookForm} godName={godName} onClose={() => setHookForm(null)}
          onAdd={(f, tok) => { void inbound.add(f, tok).then((w) => { setHookForm(null); setSelected(webhookItem(w.id)); }); }} />
      )}
      {leaving && (
        <ClassicSheet onClose={() => setLeaving(null)} width={420} zIndex={1300} title={t('pro.saveBar.leaveTitle')}>
          <div data-leave-dialog style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={SHEET_TITLE}>{t('pro.saveBar.leaveTitle')}</h2>
            <p style={{ margin: 0, fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-700)' }}>{t('pro.saveBar.leaveBody')}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <PixelButton variant="ghost" onClick={() => setLeaving(null)}>{t('pro.dialog.cancel')}</PixelButton>
              <PixelButton variant="secondary" onClick={() => { discard(); go(leaving); }} disabled={saving}>{t('pro.saveBar.discard')}</PixelButton>
              <PixelButton variant="primary" onClick={() => { const proceed = leaving; void save().then((ok) => { if (ok) go(proceed); else setLeaving(null); }); }} disabled={saving}>
                {saving ? t('pro.saveBar.saving') : t('pro.saveBar.save')}
              </PixelButton>
            </div>
          </div>
        </ClassicSheet>
      )}
    </div>
  );
}

/* ---- the list's pieces ------------------------------------------------------ */

const CARD: CSSProperties = {
  minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', background: 'var(--cth-cream-100)'
};
const GROUP_HEAD: CSSProperties = {
  ...classicLabel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0, padding: '12px 10px 6px', color: 'var(--cth-ink-500)'
};
const SHEET_TITLE: CSSProperties = {
  margin: 0, fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '14px', textTransform: 'uppercase', color: 'var(--cth-ink-900)'
};
const QUIET_LINE: CSSProperties = { margin: 0, fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-500)' };
const BODY_LINE: CSSProperties = { margin: '0 0 8px', fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-700)' };
const TILES: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: 8 };
const FOLD_PART: CSSProperties = { paddingTop: 14, boxShadow: 'inset 0 1px 0 var(--cth-ink-300)' };
const FOLD_HEAD: CSSProperties = { fontSize: 13, color: 'var(--cth-ink-900)', cursor: 'pointer' };

/** The three tabs, drawn the way the sidebar's tabs are. */
function HubTabs({ value, onChange }: { value: HubTab; onChange: (v: HubTab) => void }) {
  const { t } = useTranslation();
  const tabs: HubTab[] = ['apps', 'providers', 'keys'];
  return (
    <div role="tablist" aria-label={t('integrations.hub.head.title')} data-integrations-tabs={value}
      style={{ display: 'flex', flexShrink: 0, background: 'var(--cth-cream-200)', boxShadow: 'inset 0 -1px 0 var(--cth-ink-900)' }}>
      {tabs.map((v) => {
        const active = v === value;
        return (
          <button key={v} type="button" role="tab" aria-selected={active} onClick={() => onChange(v)} style={{
            flex: 1, height: 32, padding: '0 10px', border: 'none', cursor: 'pointer',
            background: active ? 'var(--cth-cream-100)' : 'transparent',
            boxShadow: active ? 'inset 0 0 0 1px var(--cth-ink-900)' : 'none',
            fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '14px', textTransform: 'uppercase',
            color: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)'
          }}>{t(`integrations.hub.tab.${v}`)}</button>
        );
      })}
    </div>
  );
}

/** One of the two kinds: what it means, how many are on, and pressed, the filter on the list. */
function KindCard({ kind, icon, count, on, onPress }: { kind: 'in' | 'use'; icon: IconName; count: number; on: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onPress} aria-pressed={on} data-integrations-kind={kind} style={{
      display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto', gap: '2px 10px', alignItems: 'start', padding: '8px 10px', textAlign: 'start', cursor: 'pointer',
      font: 'inherit', color: 'var(--cth-ink-900)', border: 'none',
      boxShadow: `inset 0 0 0 1px ${on ? 'var(--cth-ink-900)' : 'var(--cth-ink-300)'}`, background: on ? 'var(--cth-cream-200)' : 'var(--cth-cream-100)'
    }}>
      <span style={{ gridRow: '1 / 3', width: 28, height: 28, background: 'var(--cth-cream-50)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', display: 'grid', placeItems: 'center', color: 'var(--cth-ink-700)' }}><Icon name={icon} size={1} /></span>
      <b style={{ fontSize: 13 }}>{t(`integrations.hub.kind.${kind}`)}</b>
      <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>{t('integrations.hub.kind.count', { n: count })}</span>
      <small style={{ gridColumn: '2 / 4', fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)' }}>{t(`integrations.hub.kind.${kind}Body`)}</small>
    </button>
  );
}

/** A row: logo, name, badge, and one plain line. Picked is a fill with the lemon bar. */
function ItemRow({ row: r, selected, onPick, tile = false }: { row: Row; selected: boolean; onPick: (key: string) => void; tile?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onPick(r.key)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-current={selected || undefined}
      data-integration-row={r.key}
      data-integration-attn={r.attn ? 'true' : undefined}
      style={{
        width: '100%', display: 'grid', gridTemplateColumns: `${r.compact ? 24 : 32}px minmax(0, 1fr) auto`, gap: '0 9px', alignItems: 'center', margin: 0, padding: 6,
        border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'start', color: 'var(--cth-ink-900)',
        boxShadow: selected ? 'inset 3px 0 0 var(--cth-lemon)' : tile ? 'inset 0 0 0 1px var(--cth-ink-300)' : 'none',
        background: selected ? 'var(--cth-cream-200)' : hover ? 'var(--cth-cream-50)' : tile ? 'var(--cth-cream-100)' : 'transparent'
      }}
    >
      <ServiceLogo id={r.logo} size={r.compact ? 24 : 32} title={r.name} />
      <span style={{ minWidth: 0, display: 'block' }}>
        <span style={{
          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: r.mono ? 12 : 13, lineHeight: '17px', fontFamily: r.mono ? 'var(--cth-font-mono)' : undefined
        }}>{r.name}</span>
        <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.line}</span>
      </span>
      <RowChip row={r} />
    </button>
  );
}

function RowChip({ row: r }: { row: Row }) {
  return r.chip ? <PixelBadge status={BADGE[r.tone]} label={r.chip} /> : <span />;
}

function AddRow({ label, onClick, data }: { label: string; onClick: () => void; data: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-integrations-add-row={data}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 2, padding: '6px 10px', border: 'none',
        background: hover ? 'var(--cth-cream-50)' : 'transparent', color: 'var(--cth-ink-700)', font: 'inherit', fontSize: 12, cursor: 'pointer'
      }}>
      <Icon name="plus" size={1} />{label}
    </button>
  );
}

/* ---- the pane --------------------------------------------------------------- */

interface Foot { dirty: boolean; saving: boolean; note: { bad: boolean; text: string } | null; save: () => Promise<boolean>; discard: () => void }

interface PaneProps {
  itemKey: string; row: Row; foot: Foot; narrow: boolean;
  config: HarnessConfig; godName: string; live: SlackStatus | null; onRecheck: () => void;
  inbound: InboundHooks;
  records: IntegrationRecordView[]; templates: IntegrationTemplate[]; hasKey: Record<string, boolean>; secrets: string[];
  /** The key pages' rows, and a pick. */
  keyRows: Row[]; onPick: (key: string) => void;
  onSaved: (key: string) => void; onGone: () => void; onKeySettled: (backend: string, has: boolean) => void;
  /** The list is read again: something changed at once, outside the draft. */
  onChanged: () => void;
  onAddHook: () => void;
}

/** The picked item, by kind. Each kind is its own component, so each one's
 *  hooks run on every render of it and never under a condition. */
function Pane(p: PaneProps) {
  const ref = itemRef(p.itemKey);
  if (!ref) return null;
  switch (ref.kind) {
    case 'slack': return <SlackPane {...p} />;
    case 'webhook': return <WebhookPane {...p} id={ref.id} />;
    case 'conn': return <ConnPane {...p} id={ref.id} />;
    case 'newConn': return <ConnPane {...p} templateId={ref.templateId} />;
    case 'secret': return <KeyPane {...p} name={ref.name} />;
    case 'newSecret': return <NewSecretPane {...p} />;
    case 'keys': return <KeysPane {...p} />;
    case 'providers': return <ProvidersPane {...p} />;
    case 'github': return <GitHubPane {...p} />;
  }
}

/** One part of the page: Events coming in, or What agents can do. A rule goes between parts and never under the last. */
function PaneSection({ part, children }: { part: 'in' | 'use'; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section data-integrations-part={part} style={part === 'in' ? { paddingBottom: 14, marginBottom: 14, boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)' } : { paddingBottom: 14 }}>
      <h3 style={{ ...classicLabel, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
        <Icon name={part === 'in' ? 'arrow-right' : 'terminal'} size={1} />{t(part === 'in' ? 'integrations.hub.sec.in' : 'integrations.hub.sec.use')}
      </h3>
      {children}
    </section>
  );
}

/** Events coming in, for a service that brings none by itself or has none switched on. It says so rather than hiding. */
function EventsPart({ p }: { p: PaneProps }) {
  const { t } = useTranslation();
  if (p.row.kind === 'both') return <p style={QUIET_LINE}>{t('integrations.hub.in.off')}</p>;
  return (
    <>
      <p style={BODY_LINE}>{t('integrations.hub.in.noEvents', { app: p.row.name })}</p>
      <PixelButton size="sm" variant="secondary" onClick={p.onAddHook} dataAttrs={{ 'data-integrations-add-hook': '' }}>
        <Icon name="plus" size={1} /> {t('integrations.hub.list.addHook')}
      </PixelButton>
    </>
  );
}

/** A switch with its words beside it. */
function ToggleLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      {children}
      <span style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>{label}</span>
    </div>
  );
}

/** Keys and secrets: every custom secret, as a grid. A pick opens that one, with a way back to this page. */
function KeysPane(p: PaneProps) {
  const { t } = useTranslation();
  const inRun = p.keyRows.filter((r) => r.run === 'custom');
  return (
    <div data-integrations-keys>
      <p style={BODY_LINE}>{t('integrations.hub.keys.line')}</p>
      <div style={TILES} data-integrations-run="custom">
        {inRun.map((r) => <ItemRow key={r.key} row={r} selected={false} onPick={p.onPick} tile />)}
      </div>
      {inRun.length === 0 && <p style={{ ...QUIET_LINE, padding: '0 0 6px' }}>{t('integrations.screen.keysPage.noSecrets')}</p>}
      <div style={{ marginTop: 6, maxWidth: 260 }}><AddRow label={t('integrations.screen.addSecret')} onClick={() => p.onPick(NEW_SECRET_ITEM)} data="secret" /></div>
    </div>
  );
}

/** AI providers: the keys the agents' engines run on, each opening its own page. */
function ProvidersPane(p: PaneProps) {
  const { t } = useTranslation();
  return (
    <div data-integrations-providers>
      <p style={BODY_LINE}>{t('integrations.hub.prov.line')}</p>
      <div style={TILES}>
        {p.keyRows.filter((r) => r.run === 'providers').map((r) => <ItemRow key={r.key} row={r} selected={false} onPick={p.onPick} tile />)}
      </div>
    </div>
  );
}

/** GitHub's events: the webhook from GitHub, with its address and secret. Off until the switch, and connecting does not turn it on. */
function GitHubEvents({ p, connected }: { p: PaneProps; connected: boolean }) {
  const { t } = useTranslation();
  const api = p.inbound;
  if (!connected) return <p style={QUIET_LINE}>{t('integrations.hub.in.off')}</p>;
  const hook = api.hooks.find((w) => sourceOf(w) === 'github' && !api.isRemoved(w.id));
  const label = t('integrations.hub.in.switch');
  if (!hook) {
    return (
      <>
        <ToggleLine label={label}><OnOff on={false} label={label} onChange={() => { void api.add(blankInboundForm('github', t('settings.integ.github.title')), ''); }} /></ToggleLine>
        <p style={QUIET_LINE}>{t('integrations.hub.in.off')}</p>
      </>
    );
  }
  return (
    <>
      <ToggleLine label={label}><WebhookSwitch api={api} hook={hook} /></ToggleLine>
      {hook.enabled
        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><GitHubEventBoxes api={api} hook={hook} /><WebhookWhoAnswers api={api} hook={hook} godName={p.godName} /><WebhookSetup api={api} hook={hook} /></div>
        : <p style={QUIET_LINE}>{t('integrations.hub.in.off')}</p>}
    </>
  );
}

/** Which deliveries go on to an agent. Waits for Save, as the rest of a webhook does. */
function GitHubEventBoxes({ api, hook }: { api: InboundHooks; hook: WebhookTrigger }) {
  const { t } = useTranslation();
  const on = githubEventsOn(hook.events);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }} data-github-events>
      {GITHUB_WEBHOOK_EVENTS.map((e) => (
        <label key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--cth-ink-900)' }}>
          <input type="checkbox" checked={on.includes(e)} data-github-event={e} onChange={(x) => api.patchHook(hook.id, { events: githubEventsAfter(hook.events, e, x.target.checked) })} />
          {t(`integrations.hub.in.${GITHUB_EVENT_WORD[e]}`)}
        </label>
      ))}
    </div>
  );
}

/** One GitHub, with a token. What the token reaches is the token's to say, so no choice of repositories is drawn. */
function GitHubPane(p: PaneProps) {
  const { t } = useTranslation();
  const gh = githubRecords(p.records);
  const kept = gh.api ?? gh.git;
  const template = p.templates.find((x) => x.idSuggestion === 'github');
  const [notRemoved, setNotRemoved] = useState(false);
  // Happens at once, as Connect does; both tokens from before go together. A remove that failed is said.
  const disconnect = async () => {
    setNotRemoved(false);
    const done = await Promise.all([gh.api, gh.git].filter((r) => r !== null).map((r) => integrationsClient.remove(r.id).catch(() => ({ ok: false }))));
    if (done.some((r) => !r.ok)) setNotRemoved(true);
    p.onChanged();
  };
  const control = kept ? <PixelButton size="sm" variant="secondary" onClick={() => { void disconnect(); }} dataAttrs={{ 'data-github-disconnect': '' }}>{t('integrations.hub.use.disconnect')}</PixelButton> : undefined;
  return (
    <PaneFrame {...p} meta={p.row.line} control={control} activityKey={kept ? connItem(kept.id) : null}
      setup={(
        <>
          <PaneSection part="in"><GitHubEvents p={p} connected={!!kept} /></PaneSection>
          <PaneSection part="use">
            {notRemoved && <p style={{ ...BODY_LINE, color: 'var(--cth-status-blocked)' }} data-github-not-removed>{t('pro.conn.removeFailed')}</p>}
            {kept ? <GitHubTokened p={p} record={kept} /> : template ? <GitHubTokenForm p={p} template={template} /> : null}
          </PaneSection>
        </>
      )} />
  );
}

/** Not connected: paste a token. Connect is the footer's Save, as every token here is. */
function GitHubTokenForm({ p, template }: { p: PaneProps; template: IntegrationTemplate }) {
  const { t } = useTranslation();
  const c = useConnectionDraft({ template, templates: p.templates, records: p.records, stageOnOpen: false, onSaved: () => { p.onChanged(); p.onSaved(GITHUB_ITEM); }, onRemoved: () => undefined });
  const fmtTest = useFmtTest();
  if (!c.draft) return null;
  const label = t('integrations.hub.use.token');
  return (
    <div data-github-token>
      <p style={BODY_LINE}>{t('integrations.hub.use.gh.tokenOnly')}</p>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: '10px 0' }}>
        <span style={classicLabel}>{label}</span>
        <input type="password" autoComplete="off" spellCheck={false} value={c.draft.secret} aria-label={label} onChange={(e) => c.patch({ secret: e.target.value })} style={{ ...classicInput, maxWidth: 420 }} />
      </label>
      <p style={{ ...QUIET_LINE, marginBottom: 8 }}>{t('integrations.hub.use.gh.restart')}</p>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <PixelButton size="sm" variant="secondary" disabled={c.busy || !c.canTest} onClick={() => { void c.testNow(); }} dataAttrs={{ 'data-github-test': '' }}>{t('integrations.hub.use.test')}</PixelButton>
        {c.typedTest && <span style={{ fontSize: 12, color: c.typedTest.ok ? 'var(--cth-status-success)' : 'var(--cth-status-blocked)' }}>{fmtTest(c.typedTest)}</span>}
      </span>
      <PixelButton variant="primary" disabled={!c.draft.secret.trim() || p.foot.saving} onClick={() => { void p.foot.save(); }} dataAttrs={{ 'data-github-connect': '' }}>{t('integrations.hub.use.connect')}</PixelButton>
    </div>
  );
}

/** Connected with a token, this one or one from before. */
function GitHubTokened({ p, record }: { p: PaneProps; record: IntegrationRecordView }) {
  const { t } = useTranslation();
  const c = useConnectionDraft({ record, templates: p.templates, records: p.records, onSaved: () => p.onChanged(), onRemoved: () => undefined });
  const tests = useConnTests();
  const fmtTest = useFmtTest();
  const result = tests[record.id];
  return (
    <div data-github-tokened>
      <p style={BODY_LINE}>{t('integrations.hub.use.gh.tokened')}</p>
      {result?.ok === false && <div style={{ marginBottom: 8 }}><ClassicNotice tone="blocked">{t('integrations.hub.use.keyFailed', { app: p.row.name })}</ClassicNotice></div>}
      <p style={{ ...QUIET_LINE, marginBottom: 8 }}>{t('integrations.hub.use.gh.restart')}</p>
      {c.draft && !c.draft.enabled && <ToggleLine label={t('pro.conn.enabled')}><OnOff on={false} onChange={(v) => c.patch({ enabled: v })} label={t('pro.conn.enabled')} /></ToggleLine>}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <PixelButton size="sm" variant="secondary" disabled={c.busy} onClick={() => { void c.test(record.id); }} dataAttrs={{ 'data-github-test': '' }}>{t('integrations.hub.use.test')}</PixelButton>
        {result && <span style={{ fontSize: 12, color: result.ok ? 'var(--cth-status-success)' : 'var(--cth-status-blocked)' }}>{fmtTest(result)}</span>}
      </span>
    </div>
  );
}

/**
 * Slack. Off comes in two kinds, split by whether a bot token is saved. No
 * token yet: Setup first and open, with the switch greyed under it until the
 * fields it needs are in, and no Who answers yet. A token saved: the same
 * page as when it is live, Setup closed. Switched on with a field missing:
 * that page, with Setup open.
 */
function SlackPane(p: PaneProps) {
  const { t } = useTranslation();
  const { live } = p;
  const { on, missing, missingIfOn, fieldName } = useSlackView(p.config, live);
  const firstVisit = p.config.slackEnabled !== true && !p.config.slackBotToken;
  const meta = [live?.team ? t('integrations.screen.slack.workspace', { team: live.team }) : '', live?.botName ? `@${live.botName}` : ''].filter(Boolean).join(' · ') || p.row.line;
  const setup = (
    <details open={firstVisit || (on && missing.length > 0)} data-slack-setup-fold>
      <summary style={FOLD_HEAD}>{t('integrations.hub.sl.setup')}</summary>
      <div style={{ marginTop: 10 }}><SlackSetup config={p.config} live={live} onRecheck={p.onRecheck} /></div>
    </details>
  );
  const waiting = !on && missingIfOn.length > 0;
  return (
    <PaneFrame {...p} meta={meta} activityKey="slack"
      setup={(
        <>
          {firstVisit && <div style={{ marginBottom: 14 }}>{setup}</div>}
          <PaneSection part="in">
            <p style={BODY_LINE}>{t('integrations.hub.sl.what')}</p>
            <ToggleLine label={t('integrations.hub.sl.line')}><SlackSwitch config={p.config} disabled={waiting} /></ToggleLine>
            {waiting && <p style={QUIET_LINE} data-slack-needs>{t('settings.conn.state.needs', { fields: missingIfOn.map(fieldName).join(', ') })}</p>}
            {!firstVisit && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <SlackWhoAnswers config={p.config} godName={p.godName} />
                {setup}
              </div>
            )}
          </PaneSection>
          <PaneSection part="use">
            <p style={BODY_LINE}>{t('integrations.hub.sl.useLine')}</p>
            <SlackPostSwitch config={p.config} label={t('integrations.hub.sl.post')} line={t('integrations.where.slack.postLine')} />
          </PaneSection>
        </>
      )} />
  );
}

function WebhookPane(p: PaneProps & { id: string }) {
  const { t } = useTranslation();
  const api = p.inbound;
  const w = api.hooks.find((x) => x.id === p.id);
  if (!w) return null;
  const saved = api.stored.some((x) => x.id === w.id);
  const meta = [t(`settings.integ.sourceName.${sourceOf(w)}`), w.description ?? ''].filter(Boolean).join(' · ');
  return (
    <PaneFrame {...p} meta={meta} control={<WebhookSwitch api={api} hook={w} />}
      setup={(
        <>
          <PaneSection part="in">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><WebhookWhoAnswers api={api} hook={w} godName={p.godName} /><WebhookSetup api={api} hook={w} /></div>
          </PaneSection>
          <PaneSection part="use"><p style={QUIET_LINE}>{t('integrations.hub.use.noAct')}</p></PaneSection>
        </>
      )}
      activityKey={saved ? webhookItem(w.id) : null} />
  );
}

function ConnPane(p: PaneProps & { id?: string; templateId?: string }) {
  const { t } = useTranslation();
  const record = p.id ? p.records.find((r) => r.id === p.id) : undefined;
  const template = p.templateId ? p.templates.find((x) => x.idSuggestion === p.templateId) : undefined;
  const c = useConnectionDraft({
    record, template, templates: p.templates, records: p.records, stageOnOpen: false,
    onSaved: (id) => p.onSaved(connItem(id)), onRemoved: () => p.onGone()
  });
  const tests = useConnTests();
  if (!c.draft) return null;
  const control = <OnOff on={c.draft.enabled} onChange={(v) => c.patch({ enabled: v })} label={t('pro.conn.enabled')} />;
  return (
    <PaneFrame {...p} meta={p.row.line} control={record ? control : undefined} activityKey={record ? connItem(record.id) : null}
      setup={(
        <>
          <PaneSection part="in"><EventsPart p={p} /></PaneSection>
          <PaneSection part="use">
            {record && tests[record.id]?.ok === false && <div style={{ marginBottom: 10 }}><ClassicNotice tone="blocked">{t('integrations.hub.use.keyFailed', { app: p.row.name })}</ClassicNotice></div>}
            <ConnectionSetup c={c} />
            {/* Connect is the footer's Save, for one that is not there yet. */}
            {!record && <div style={{ marginTop: 10 }}><PixelButton variant="primary" disabled={!p.foot.dirty || p.foot.saving} onClick={() => { void p.foot.save(); }} dataAttrs={{ 'data-conn-connect': '' }}>{t('integrations.hub.use.connect')}</PixelButton></div>}
          </PaneSection>
        </>
      )} />
  );
}

function KeyPane(p: PaneProps & { name: string }) {
  const { t } = useTranslation();
  const b = PROVIDER_KEY_BACKENDS.find((x) => x.envVar === p.name);
  if (b) {
    return (
      <PaneFrame {...p} meta={b.envVar}
        setup={<ProviderKeySetup backend={b.id} hasKey={p.hasKey[b.id] === true} onSettled={(has) => p.onKeySettled(b.id, has)} />}
        activityKey={secretItem(b.envVar)} />
    );
  }
  if (!p.secrets.includes(p.name)) return null;
  // A secret of your own is on Keys and secrets, which has no list: its page leads back to the grid.
  return (
    <PaneFrame {...p} meta={p.row.line} back={{ label: t('integrations.screen.keysPage.back'), onClick: () => p.onPick(KEYS_ITEM) }}
      setup={<CustomSecretSetup name={p.name} connections={p.records.map((r) => ({ id: r.id, label: r.label }))} onSettled={() => undefined} />}
      activityKey={secretItem(p.name)} />
  );
}

function NewSecretPane(p: PaneProps) {
  const { t } = useTranslation();
  return (
    <PaneFrame {...p} meta={t('integrations.screen.line.customSecret')} back={{ label: t('integrations.screen.keysPage.back'), onClick: () => p.onPick(KEYS_ITEM) }}
      setup={<AddSecretSetup taken={p.secrets} onAdded={(name) => p.onSaved(secretItem(name))} />}
      activityKey={null} />
  );
}

/** The pane's frame: header, the one page, Activity folded at its end, and the
 *  footer with Discard and Save, which is the only thing that writes. */
function PaneFrame({ row, foot, narrow, meta, control, setup, activityKey, back }: PaneProps & {
  meta: string; control?: ReactNode; setup: ReactNode; activityKey: string | null;
  /** A way back to the page this item was opened from. */
  back?: { label: string; onClick: () => void };
}) {
  const { t } = useTranslation();
  const side = narrow ? 16 : 20;
  const { dirty, saving, note, save, discard } = foot;
  return (
    <>
      {back && (
        <div style={{ padding: `10px ${side - 6}px 0` }}>
          <PixelButton size="sm" variant="ghost" onClick={back.onClick} dataAttrs={{ 'data-integrations-back': '' }}>◂ {back.label}</PixelButton>
        </div>
      )}
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: `14px ${side}px 12px`, boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)' }} data-integrations-head>
        <ServiceLogo id={row.logo} size={40} title={row.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 16, lineHeight: '22px', fontWeight: 600, fontFamily: row.mono ? 'var(--cth-font-mono)' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{row.name}</h2>
            {row.chip && <RowChip row={row} />}
          </div>
          {meta && <p style={{ margin: '3px 0 0', fontSize: 12, lineHeight: '18px', color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</p>}
        </div>
        {control && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }} data-integrations-switch>{control}</div>}
      </header>
      <div className="cth-scroll-hidden" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `14px ${side}px 18px` }} data-integrations-page>
        {setup}
        {activityKey !== null && (
          <details data-integrations-activity style={FOLD_PART}>
            <summary style={FOLD_HEAD}>{t('integrations.hub.sec.activity')}</summary>
            <div style={{ marginTop: 10 }}><IntegrationActivity activityKey={activityKey} /></div>
          </details>
        )}
      </div>
      <footer style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: `10px ${side}px`, background: 'var(--cth-cream-50)', boxShadow: 'inset 0 1px 0 var(--cth-ink-300)' }} data-integrations-foot={dirty ? 'dirty' : 'clean'}>
        <p style={{ flex: 1, minWidth: 160, margin: 0, fontSize: 13, lineHeight: '18px', display: 'flex', alignItems: 'center', gap: 8, color: dirty ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)' }}>
          {dirty && !note?.bad && <ToneDot tone="waiting" />}
          {note && (note.bad || !dirty)
            ? <span style={{ color: note.bad ? 'var(--cth-status-blocked)' : 'var(--cth-status-success)' }} data-save-note={note.bad ? 'bad' : 'ok'}>{note.text}</span>
            : <span>{dirty ? t('pro.saveBar.unsaved') : t('integrations.screen.foot.idle')}</span>}
        </p>
        <PixelButton variant="secondary" onClick={discard} disabled={!dirty || saving} dataAttrs={{ 'data-discard': '' }}>{t('pro.saveBar.discard')}</PixelButton>
        <PixelButton variant="primary" onClick={() => { void save(); }} disabled={!dirty || saving} dataAttrs={{ 'data-save': '' }}>
          {saving ? t('pro.saveBar.saving') : t('pro.saveBar.save')}
        </PixelButton>
      </footer>
    </>
  );
}

/** Add a webhook: where it comes from opens its form. Nothing is saved until Save. */
function AddHookSheet({ onClose, onWebhook }: { onClose: () => void; onWebhook: (s: WebhookSource) => void }) {
  const { t } = useTranslation();
  const sources: WebhookSource[] = ['github', 'linear', 'telegram', 'custom'];
  return (
    <ClassicSheet onClose={onClose} width={560} zIndex={1300} title={t('integrations.hub.list.addHook')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 10px', boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)' }}>
        <h2 style={{ ...SHEET_TITLE, flex: 1 }}>{t('integrations.hub.list.addHook')}</h2>
        <CloseButton onClick={onClose} title={t('common.close')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(210px, 100%), 1fr))', gap: 8, padding: 18 }} data-add-sheet>
        {sources.map((x) => {
          const name = t(`settings.integ.sourceName.${x}`);
          return (
            <button key={x} type="button" onClick={() => onWebhook(x)} data-add-pick={`webhook:${x}`} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', minWidth: 0, textAlign: 'start', cursor: 'pointer', font: 'inherit',
              border: 'none', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', background: 'var(--cth-cream-100)', color: 'var(--cth-ink-900)'
            }}>
              <ServiceLogo id={x === 'custom' ? 'webhook' : logoIdFor({ kind: 'webhook', templateId: x })} size={28} title={name} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`integrations.screen.addSheet.webhook.${x}`)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </ClassicSheet>
  );
}

/** The width of an element, kept as it resizes. */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.getBoundingClientRect?.().width ?? 0);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => { for (const e of entries) setW(e.contentRect.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}
