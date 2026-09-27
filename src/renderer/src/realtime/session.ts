/**
 * Realtime Michael — renderer voice session (card rt-2, Phase 1 = READ-ONLY voice).
 *
 * The voice orchestrator runs IN THE RENDERER over WebRTC, talking speech-to-speech
 * to OpenAI `gpt-realtime-2`. The renderer never holds the real OpenAI key: it asks
 * MAIN to mint a short-lived EPHEMERAL client secret (`realtime:mintToken`, see
 * src/main/realtime.ts) and connects with THAT.
 *
 * We drive a CUSTOM `OpenAIRealtimeWebRTC` transport (not the bare `'webrtc'` string)
 * so we can: (a) open the mic ourselves with echo-cancellation + noise-suppression +
 * auto-gain (and honor the device the user picked — Oscar's rt-8 seam), and (b) own
 * the <audio> sink for playback. Turn-taking uses semantic VAD with barge-in (the
 * model truncates when the user talks over it).
 *
 * Phase 1 is a read-only connect→listen→respond round-trip. The agent runs Kevin's
 * rt-4 READ-ONLY tools (get_fleet_status / get_tasks / get_cost / get_triggers /
 * get_config / get_memory / get_activity) and god's rt-6 "Michael" persona, so the
 * agent_tool_start/agent_tool_end lifecycle fires and the mic goes idle during a tool
 * call and resumes — a Phase-1 acceptance criterion. NO hive action-tools yet (rt-5, held).
 *
 * Shape mirrors freeflow/recorder.ts: a single module-level session (only ONE voice
 * loop at a time) exposed through a `useRealtimeMichael()` hook via useSyncExternalStore.
 *
 * Branch feat/realtime-michael. See board.md "🎙 REALTIME MICHAEL".
 */
import { useSyncExternalStore } from 'react';
import { RealtimeAgent, RealtimeSession, OpenAIRealtimeWebRTC } from '@openai/agents-realtime';
import { realtimeReadTools, realtimeSessionSummary } from './tools';
import { neutralizeHostile } from '@shared/voiceText';
import { realtimeActionTools } from './actions';
import { resetRealtimeCost, recordRealtimeUsage, endRealtimeCost, isRealtimeIdle, getRealtimeCostSnapshot } from './costStore';

/**
 * Voice-loop state machine:
 *   off        — no session (initial / after disconnect / fatal error)
 *   connecting — minting token + opening the WebRTC connection
 *   listening  — connected, mic live, waiting for / hearing the user
 *   responding — the model is generating / speaking audio back
 *   working    — a tool call is in flight; mic is muted until it returns
 */
export type RealtimeStatus = 'off' | 'connecting' | 'listening' | 'responding' | 'working';

export interface RealtimeMichaelState {
  status: RealtimeStatus;
  /** Last error (no key, mint failure, mic denied, transport error…). Cleared on connect. */
  error: string | null;
  /** Whether the mic is currently muted (true while `working`). */
  muted: boolean;
  /** The realtime model actually in use (from the mint's sessionConfig). */
  model: string | null;
  /** Unix-seconds expiry of the ephemeral token, if main reported one. */
  expiresAt: number | null;
  /** Selected input device (Oscar's device picker, rt-8). null = system default. */
  deviceId: string | null;
  /** Selected output/speaker device (Oscar's speaker picker, rt-8). null = system default. */
  outputDeviceId: string | null;
}

/** Voices for gpt-realtime-2 (board: Cedar / Marin). god finalizes in rt-6. */
const REALTIME_VOICE = 'cedar';

/** Warm openers Michael leads with the moment a voice session connects, so he
 *  greets the user instead of sitting in silence waiting for them to speak. One
 *  is picked at random per connect so the greeting varies. Hardcoded constants
 *  (never user/external text) — safe to speak verbatim, no sanitization needed. */
const GREETINGS = [
  "Hi, what's up?",
  "Hey, how's it going?",
  "Hello, how can I help you?",
  "Hey there, Michael here — what can I do for you?",
  "Hi! What are we working on today?",
  "Hey, good to hear you. What's on your mind?",
  "Hello! What do you need?",
  "Hey, I'm all ears — what's going on?"
];

/** Michael's voice persona. The first one (rt-6) was authored by god; this one
 *  is the founder's rewrite of 9 Sep 2026 (0.5.2, card
 *  v052-voice-michael-persona-rewrite): short, casual, human; one question at
 *  most; "I don't know" and stop; the snapshot first, then the terminal tool
 *  for "what is this guy doing", then memory for the past; and a yes only
 *  before something destructive, something that sends words to an agent, or
 *  something that spends. The gate that enforces the last part lives in
 *  src/main/realtimeActions.ts (VERBS, SETTING_POLICY); this text describes
 *  it and must not disagree with it (test/voice-persona.test.cjs).
 *
 *  BYTE-STABLE ON PURPOSE. Nothing live is interpolated here: the persona and
 *  the tool schemas are the cached prompt prefix (about one percent of the
 *  cost of fresh input), and the floor goes in as conversation items. */
const MICHAEL_PERSONA =
  `You are Michael, the voice of the orchestrator of a hive of coding agents. You are talking to the person who runs it. Talk like a sharp colleague on a call, not an assistant reading a manual.

HOW YOU TALK. Short. One or two sentences is usually the whole answer. Casual, plain words, no formality, no filler, no restating the question, no summing up what you just said. Never read markdown, paths or code aloud unless asked. Say numbers and names plainly. Do not ask a question unless you truly cannot act without the answer; then ask exactly one, once. Never repeat yourself. If you do not know, say "I don't know" and stop. Do not offer a menu of things you could do next.

WHERE ANSWERS COME FROM, in this order. First, what you already have: the floor snapshot from connect and the "(Floor update: ...)" notes since; trust those and answer straight from them. Second, if the question is about what one agent is doing right now, call get_agent_terminal. Third, if it is about anything before this call, a decision, a note, something the team learned, call get_memory; that is the tool for the past, lean on it. The rest: get_floor_state, get_fleet_status, list_agents, get_agent_detail, get_tasks, get_board, get_messages, get_activity, get_triggers, get_config, get_cost, get_app_info. Call a tool before saying you cannot see something. If a tool returns nothing, say so in one sentence.

A SLOW TOOL, ONLY. Memory and terminal look-ups can take several seconds. When you are about to call one of those, say a short aside first so the line is not dead, "let me look" or "checking", then call it and answer. That is cover for a wait, not a way of talking: never say it when no tool is needed, and never on an answer you already have.

WHAT YOU CAN DO. You act on the hive by voice: message an agent (ping, dispatch a work order, steer), edit task cards, hire, pause, resume, halt, kill, archive, unarchive, clear context, pause or resume delivery, gate a tool, create or edit schedules, change the allowed settings. Most of it you just do, then say what you did in one line: task edits, pause, resume, delivery, gating, unarchive, enabling or disabling a schedule, most settings.

WHAT NEEDS A YES FIRST. Anything destructive: kill, halt, archive, clear context, delete a task, delete a schedule. Anything that sends words to an agent: ping, dispatch, steer, and a new schedule, which sends on a timer. Anything that spends or widens the floor: hiring, the autonomy switch, and the cost cap, worker count and turn limit settings. For those the tool hands you a one line read back; say it and wait. They confirm by saying "confirm" or the action word, never a bare "yes"; then call confirm_action with their words. Anything else, or silence, means cancel_action. Never confirm for them. Kill, pause, halt or archive on the orchestrator, and anything on all agents at once, are refused; say so in one line.

SHARED FLOOR. The typing orchestrator also acts on this hive, and your actions are announced to it as michael-voice. Before you dispatch, hire or create cards, glance at recent activity so you do not repeat what it just did. Never claim to have done something you did not.

HIVE WORDS. Agents have an id like "creed-mqp3l5wn" and a name like "Creed"; use the name. Card status is todo, doing, blocked or done. The circuit breaker is healthy or steering. Blocked usually means waiting on the human.`;

let state: RealtimeMichaelState = {
  status: 'off',
  error: null,
  muted: false,
  model: null,
  expiresAt: null,
  deviceId: null,
  outputDeviceId: null
};
const listeners = new Set<() => void>();

/** The single live session (only one voice loop at a time, like freeflow's recorder). */
let session: RealtimeSession | null = null;
/** The mic stream we opened (so we can stop its tracks on teardown). */
let stream: MediaStream | null = null;
/** The <audio> sink for Michael's voice. */
let audioEl: HTMLAudioElement | null = null;
/** Guards against overlapping connect() calls racing the async mint/connect. */
let connecting = false;
/** rt-12: unsubscribe handle for the completion push, active only while a session is live. */
let offCompletion: (() => void) | null = null;
let offFloorDelta: (() => void) | null = null;
/** rt-9 cost guard: periodic tick that auto-disconnects on hard cost cap or after an
 *  idle open mic (curbs runaway audio spend on a forgotten session). */
let costGuardTimer: ReturnType<typeof setInterval> | null = null;
/** Default idle auto-disconnect window (ms) when config has none. Raised from the
 *  original 45s to 3 min so a normal thinking/reading pause no longer drops the
 *  call; the user tunes it (or turns it off) via config.realtimeIdleDisconnectMs. */
const DEFAULT_IDLE_DISCONNECT_MS = 180_000;
const COST_GUARD_TICK_MS = 10_000;

/** N3-seam (rt-10 hardening): a completion summary carries dispatch objective text.
 *  It CANNOT escalate — MAIN independently gates every destructive/forbidden op
 *  (Pam confirmed) — but neutralize it before injecting into the model as a system
 *  notification (defense in depth): collapse newlines, strip the parens that frame
 *  my notification, drop role markers + classic prompt-injection lead-ins, and cap
 *  length. Jim does the matching watcher-side half on the summary it emits. */
function sanitizeForVoice(s: string): string {
  // 0.5.2: the regex battery moved to @shared/voiceText so the terminal read
  // tool scrubs with the same rule; this keeps the 300 character cap that
  // fits a spoken aside.
  return neutralizeHostile(s).slice(0, 300);
}

function setState(patch: Partial<RealtimeMichaelState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

/** Wire the session lifecycle events onto our state machine. */
function wire(s: RealtimeSession): void {
  // Model started / stopped speaking audio back to the user.
  s.on('audio_start', () => {
    if (state.status !== 'working') setState({ status: 'responding' });
  });
  s.on('audio_stopped', () => {
    // Only fall back to listening if we aren't mid tool-call.
    if (state.status !== 'working') setState({ status: 'listening' });
  });
  // User talked over the model (barge-in) — semantic_vad with interruptResponse
  // truncates the assistant turn automatically; we just reflect it.
  s.on('audio_interrupted', () => {
    if (state.status !== 'working') setState({ status: 'listening' });
  });
  // A turn fully ended — safety reset to listening (no-op if already there).
  s.on('agent_end', () => {
    if (state.status !== 'working') setState({ status: 'listening' });
  });

  // Tool-call lifecycle: mute the mic while a tool runs so the user doesn't talk over
  // a side effect, then resume. (Phase 1 runs the rt-4 read-tools; rt-5 action-tools
  // inherit this for free.)
  s.on('agent_tool_start', () => {
    try {
      s.mute(true);
    } catch {
      /* mute is best-effort */
    }
    setState({ status: 'working', muted: true });
  });
  s.on('agent_tool_end', () => {
    try {
      s.mute(false);
    } catch {
      /* best-effort */
    }
    setState({ status: 'listening', muted: false });
  });

  // Transport / model errors. Surface the message; stay connected (the session can
  // recover from a transient error). A hard transport drop is handled by disconnect().
  s.on('error', (err) => {
    const e = (err as { error?: unknown })?.error;
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'realtime session error';
    setState({ error: msg });
  });

  // rt-9 cost meter: each completed response reports token usage on the raw transport
  // `response.done` event. Hand it straight to Oscar's cost store (its normalizer
  // tolerates camel/snake-case + missing fields). Best-effort — never break the loop.
  s.on('transport_event', (event) => {
    try {
      const ev = event as { type?: string; response?: { usage?: unknown } };
      if (ev.type === 'response.done' && ev.response?.usage) {
        recordRealtimeUsage(ev.response.usage as Parameters<typeof recordRealtimeUsage>[0], Date.now());
      }
    } catch {
      /* metering is best-effort */
    }
  });
}

/** Stop the mic + release the audio sink. Safe to call repeatedly. */
function teardownMedia(): void {
  if (stream) {
    for (const t of stream.getTracks()) {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    }
  }
  stream = null;
  if (audioEl) {
    try {
      audioEl.pause();
      audioEl.srcObject = null;
    } catch {
      /* ignore */
    }
  }
  audioEl = null;
}

/** Make a getUserMedia failure legible. */
function micFriendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('permission') || m.includes('notallowed') || m.includes('denied'))
    return 'microphone permission denied — allow mic access to talk to Michael';
  if (m.includes('notfound') || m.includes('device'))
    return 'no microphone found — check your input device';
  return msg;
}

/**
 * Open/close the main-process mic permission gate for the realtime session (Oscar's
 * rt-8 gate, src/main/index.ts). Since 0.5.3 batch 3 that gate is always open (Free
 * Flow has no off switch), but the session still flips `realtimeVoiceEnabled`, which
 * the app reads as "a voice session is live", and the check is SYNCHRONOUS — so
 * we flip `realtimeVoiceEnabled` true and let it settle BEFORE opening the mic, then
 * false again on teardown/error. (We deliberately do NOT gate on key-presence: the
 * OpenAI key is shared with the CLI engines, so that would open the mic for CLI-only
 * users — a guardrail regression.)
 */
async function setMicGate(on: boolean): Promise<void> {
  try {
    await window.cth.updateConfig({ realtimeVoiceEnabled: on });
  } catch {
    /* if the config write fails, getUserMedia will surface the denial below */
  }
}

/**
 * Apply the chosen output device to our <audio> sink (Oscar's speaker picker, rt-8).
 * `setSinkId` is Chromium/Electron-only and not in every lib.dom, so we feature-detect +
 * cast narrowly. Best-effort: if the device is gone or unsupported we stay on the default
 * sink (passing '' selects the system default).
 */
async function applyOutputSink(el: HTMLAudioElement, deviceId: string | null): Promise<void> {
  const sink = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
  if (typeof sink.setSinkId !== 'function') return;
  try {
    await sink.setSinkId(deviceId ?? '');
  } catch {
    /* device unavailable / unsupported — fall back to the default sink */
  }
}

/**
 * Connect the voice loop: mint an ephemeral token, open the mic (EC/NS/AGC), open a
 * WebRTC RealtimeSession with semantic-VAD turn-taking, and start listening.
 * Idempotent — a no-op if already connecting/connected.
 */
export async function connect(): Promise<void> {
  if (connecting || (session && state.status !== 'off')) return;
  connecting = true;
  setState({ status: 'connecting', error: null });
  try {
    const mint = await window.cth.realtimeMintToken();
    if (!mint.ok) {
      setState({ status: 'off', error: mint.error });
      return;
    }

    // Open the main-process mic gate BEFORE getUserMedia. Oscar's rt-8 permission check
    // is synchronous, so `realtimeVoiceEnabled` must already be true when the mic opens;
    // we close it again on teardown/error.
    await setMicGate(true);

    // Mic with echo-cancellation + noise-suppression + auto-gain, honoring the device
    // the user picked (Oscar's rt-8 picker). getUserMedia surfaces permission denials.
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };
    if (state.deviceId) audioConstraints.deviceId = { exact: state.deviceId };
    stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

    // Our own <audio> sink for Michael's voice, routed to the chosen speaker (rt-8).
    audioEl = new Audio();
    audioEl.autoplay = true;
    await applyOutputSink(audioEl, state.outputDeviceId);

    const transport = new OpenAIRealtimeWebRTC({ mediaStream: stream, audioElement: audioEl });
    // Warm-start: a short, best-effort hive snapshot so Michael's first answer is grounded
    // without a tool round-trip (rt-4 realtimeSessionSummary). Returns '' on failure / never throws.
    let warmStart = await realtimeSessionSummary().catch(() => '');
    // rt-12: catch up on completions that finished while no session was open, so Michael
    // can mention them as a "since we last talked" warm-start (the closed-session queue).
    try {
      const queued = await window.cth.realtimeDrainCompletions();
      if (Array.isArray(queued) && queued.length) {
        const lines = queued.map((c) => c.summary).filter(Boolean).join(' ');
        if (lines) warmStart = `${warmStart}\nCompletions since you last spoke: ${lines} Mention these to the user when it's natural.`.trim();
      }
    } catch {
      /* warm-start catch-up is best-effort */
    }
    // v0.3.4: the snapshot is NOT baked into instructions any more — a byte-stable
    // persona+tools prefix stays fully prompt-cached across turns and sessions
    // (cached input is ~99% cheaper). The snapshot goes in as the FIRST
    // conversation item below, and the floor watcher appends deltas mid-call.
    const agent = new RealtimeAgent({
      name: 'Michael',
      instructions: MICHAEL_PERSONA,
      tools: [...realtimeReadTools(), ...realtimeActionTools()]
    });
    const s = new RealtimeSession(agent, {
      transport,
      model: mint.sessionConfig.model,
      config: {
        outputModalities: ['audio'],
        voice: REALTIME_VOICE,
        audio: {
          input: {
            // Natural turn boundaries + automatic barge-in (truncate on interrupt).
            turnDetection: {
              type: 'semantic_vad',
              eagerness: 'medium',
              createResponse: true,
              interruptResponse: true
            }
          },
          output: { voice: REALTIME_VOICE }
        }
      }
    });
    wire(s);

    // The ephemeral client secret is the apiKey for this connect; the real OpenAI key
    // never reaches the renderer.
    await s.connect({ apiKey: mint.token, model: mint.sessionConfig.model });

    session = s;
    resetRealtimeCost(Date.now()); // rt-9: start the live session cost meter
    // v0.3.4: SILENT context injection — a raw conversation.item.create with no
    // response.create, so the model absorbs the item without speaking. (This SDK
    // version's sendMessage always triggers a response, so we go one level down
    // to the transport for the silent path.)
    const injectSilent = (text: string): void => {
      try {
        s.transport.sendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text }]
          }
        } as never);
      } catch { /* injection is best-effort */ }
    };
    // The connect snapshot goes in as the FIRST conversation item (the greeting
    // below opens the conversation; this just grounds it).
    if (warmStart) {
      injectSilent(`(Floor snapshot at connect — orientation only, call your tools for detail: ${sanitizeForVoice(warmStart)})`);
    }
    // Floor deltas — silent appends that keep Michael's picture live without
    // touching the cached instructions prefix.
    offFloorDelta = window.cth.onRealtimeFloorDelta?.((d) => {
      if (session !== s) return;
      injectSilent(`(Floor update: ${sanitizeForVoice(d.text)}. Mention it only when relevant — don't interrupt.)`);
    }) ?? null;
    // rt-12: mark the session live (main now pushes completions instead of queuing) and
    // subscribe so a detected completion makes Michael speak it unprompted.
    void window.cth.realtimeSetSessionLive(true);
    offCompletion = window.cth.onRealtimeCompletion((c) => {
      try {
        // Feed it as a system-framed notification so the model relays it rather than
        // treating it as a user request; semantic_vad won't interrupt an active turn.
        // N3-seam: sanitize the summary before injection (defense in depth).
        session?.sendMessage(
          `(System notification — a task you dispatched just finished: ${sanitizeForVoice(c.summary)}) Briefly let the user know, and offer details if they want them.`
        );
      } catch {
        /* session may be tearing down */
      }
    });
    // rt-9 cost guard: periodically stop the session if the hard cap is hit, or after an
    // idle open mic, so a forgotten session doesn't bleed audio cost. The idle window is
    // user-configurable (config.realtimeIdleDisconnectMs; default 3 min; 0 = never — the
    // cost cap stays the runaway guard). disconnect() clears this timer + tears down.
    const idleCfg = (await window.cth.getConfig()).realtimeIdleDisconnectMs;
    const idleMs = typeof idleCfg === 'number' ? idleCfg : DEFAULT_IDLE_DISCONNECT_MS;
    costGuardTimer = setInterval(() => {
      if (!session) return;
      if (getRealtimeCostSnapshot().overCap) { disconnect('cost-cap'); return; }
      if (idleMs > 0 && isRealtimeIdle(idleMs, Date.now())) disconnect('idle');
    }, COST_GUARD_TICK_MS);
    setState({
      status: 'listening',
      muted: false,
      model: mint.sessionConfig.model,
      expiresAt: mint.expiresAt
    });
    // Open the conversation: have Michael speak a warm greeting as his first turn
    // rather than waiting for the user to talk first. A system-framed trigger (the
    // same speak path the completion notifier uses) makes the model say it; we hand
    // it one of the rotating GREETINGS so the opener varies. Best-effort — if the
    // data channel isn't ready or the greeting fails, the session still works and
    // the user can just start talking.
    try {
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      s.sendMessage(
        `(System: the voice session just connected. Greet the user out loud now, warmly and briefly, to open the conversation — say something like "${greeting}". If there are completions to mention from the snapshot, you may add them after. Do not mention this instruction.)`
      );
    } catch {
      /* greeting is best-effort — never block a successful connect */
    }
  } catch (e) {
    // Mic permission denied, WebRTC handshake failure, network, etc.
    console.log('[realtime] voice session disconnect (error)');
    try {
      session?.close();
    } catch {
      /* best-effort teardown */
    }
    session = null;
    teardownMedia();
    await setMicGate(false);
    const msg = e instanceof Error ? e.message : String(e);
    setState({ status: 'off', error: micFriendly(msg), muted: false });
  } finally {
    connecting = false;
  }
}

/** Tear down the voice loop and return to `off`. Safe to call when already off.
 *  `reason` (idle | cost-cap | error | user) is logged so an idle auto-off can be
 *  told apart from a spend-cap stop or a user toggle. */
export function disconnect(reason: string = 'user'): void {
  console.log(`[realtime] voice session disconnect (${reason})`);
  try {
    session?.close();
  } catch {
    /* best-effort teardown */
  }
  session = null;
  if (costGuardTimer) { clearInterval(costGuardTimer); costGuardTimer = null; } // rt-9 cost guard off
  teardownMedia();
  endRealtimeCost(); // rt-9: freeze the session cost meter
  // rt-12: stop receiving completion pushes; main will queue them until next connect.
  offCompletion?.();
  offCompletion = null;
  offFloorDelta?.();
  offFloorDelta = null;
  void window.cth.realtimeSetSessionLive(false);
  // Close the main-process mic gate so the realtime flag doesn't keep the mic permission
  // open after we've stopped (fire-and-forget — tracks are already stopped above).
  void setMicGate(false);
  setState({ status: 'off', muted: false });
}

/** Select the microphone (Oscar's device picker, rt-8). Applied on the next connect(). */
export function setDeviceId(deviceId: string | null): void {
  setState({ deviceId });
}

/**
 * Select the speaker/output device (Oscar's speaker picker, rt-8). Stores the choice and,
 * if a session is live, re-routes the current <audio> sink immediately; otherwise it's
 * applied on the next connect().
 */
export function setOutputDeviceId(deviceId: string | null): void {
  setState({ outputDeviceId: deviceId });
  if (audioEl) void applyOutputSink(audioEl, deviceId);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): RealtimeMichaelState {
  return state;
}

/**
 * React binding for the Realtime Michael voice loop. Returns the current state plus
 * `connect()` / `disconnect()` / `setDeviceId()`. A single session is shared across the
 * whole renderer, so every consumer sees the same status.
 */
export function useRealtimeMichael(): RealtimeMichaelState & {
  connect: () => Promise<void>;
  disconnect: () => void;
  setDeviceId: (deviceId: string | null) => void;
  setOutputDeviceId: (deviceId: string | null) => void;
} {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  return { ...snap, connect, disconnect, setDeviceId, setOutputDeviceId };
}
