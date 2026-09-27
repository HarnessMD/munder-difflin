/**
 * The puck on screen: the disc, the ring, the note card, the recording pulse.
 *
 * MAIN OWNS THE STATE (shared/puck PuckState) and this page draws it. The
 * only state kept here is what only this page can know: whether the cursor
 * is over the disc, a drag in flight, the text of a note being written.
 *
 * CLICK THROUGH. The window is a square much larger than the disc. #root
 * ignores the mouse and every element that wants a click says `data-hit`;
 * main is told to stop ignoring the mouse while the cursor is over one of
 * those, or while the ring or the card is open (then the whole window is
 * ours, and a click on the empty part closes the ring).
 *
 * A CLICK IS NOT A DRAG. A press that travels past a 4px dead zone is a
 * drag; a press and release inside it is a click, which opens the ring. The
 * page never works out where the window goes: it tells main where on the disc
 * it was grabbed, and main keeps the disc under the system pointer until the
 * release (main/puck THE DRAG). No screen coordinates are read here: in a
 * window that moves, they are measured from where the window used to be.
 *
 * THE CARD AND THE RING TOGETHER. While a recording runs the card is open
 * (the words of a message arriving as they are spoken, a meeting's
 * transcript growing part by part) and a click on the disc still opens the
 * ring, with Stop and Leave invisible on it (founder, 7 Sep 2026). The card
 * moves clear of the open ring (shared/puck placeCard).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CARD, cardHeight, DEFAULT_PUCK_STATE, LABEL_GAP, cardSpace, onScreen, placeCard, placePair, puckProblem, RING, ringExtent, ringFootprint, ringLayout, roomIn, shotsLayout, PUCK_MAX_SHOTS,
  type PuckAction, type PuckConfig, type PuckState, placeFlash, FLASH,
} from '@shared/puck';
import { DICTATION_SOUND_GAIN, DICTATION_SOUNDS, dictationStep, IDLE_VIEW, levelOf, METER_BARS, type DictationView, type PuckDictationEvent } from '@shared/dictationFeedback';
import { dictationExpired, takeExpired, takePhase } from '@shared/puckTake';
import { PuckFace } from '@/components/pro/puck/PuckFace';
import { PUCK_ACTION_GLYPH, PuckGlyph as Glyph } from './glyph';
import * as rec from './recorder';
import { openSystemStream, watchMonitor } from './systemAudio';
import { speakersAreBuiltIn } from '@shared/meetingEcho';

type Shot = { path: string; preview: string; width: number; height: number };

type Compose =
  /** `attached`: the pictures were added to a message being written (the
   *  card's screenshot button), so the card stays a message with them as
   *  chips under its text; a screenshot from the ring shows its picture whole. */
  | { kind: 'screenshot'; shots: Shot[]; attached?: boolean }
  | { kind: 'message'; text: string }
  | { kind: 'meeting'; meetingId: string };

type Flash = { text: string; bad?: boolean; action?: { label: string; run: () => void } } | null;

const DEAD_ZONE = 4;
/** The dictation pill: a 16px meter and 3px padding, top and bottom. */
const DICTATE_PILL_H = 22;

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Words that arrived join what is already there, one space apart. */
function join(prev: string, more: string): string {
  const t = more.trim();
  if (!t) return prev;
  return prev.trim() ? `${prev.trimEnd()} ${t}` : t;
}

/** The preview harness (tools/preview) draws the puck from props, with no
 *  main process behind it. Nothing in the app passes this. */
export interface PuckPreview {
  config: PuckConfig;
  state: PuckState;
  compose?: Compose;
  /** A notice already up. */
  flash?: Flash;
  /** Dictation from anywhere, mid take (0.5.3). */
  dictation?: DictationView;
  /** A take from the ring (Record message) on screen, with its meter. */
  take?: boolean;
  takeLevels?: number[];
}

/** The start and stop nudges (0.5.3): two short sine notes, quiet, made here,
 *  so nothing is bundled or fetched. One context for the window's life. */
let nudgeCtx: AudioContext | null = null;
function playNudge(kind: 'start' | 'stop'): void {
  try {
    nudgeCtx ??= new AudioContext();
    const ctx = nudgeCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.01;
    for (const n of DICTATION_SOUNDS[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0, t0 + n.at);
      gain.gain.linearRampToValueAtTime(DICTATION_SOUND_GAIN, t0 + n.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.02);
    }
  } catch { /* no audio device: the eyes still say it */ }
}

export function PuckApp({ preview }: { preview?: PuckPreview } = {}) {
  const { t } = useTranslation();
  const [cfg, setCfg] = useState<PuckConfig | null>(preview?.config ?? null);
  const [st, setSt] = useState<PuckState>(preview?.state ?? DEFAULT_PUCK_STATE);
  const [compose, setCompose] = useState<Compose | null>(preview?.compose ?? null);
  const [note, setNote] = useState('');
  const [transcript, setTranscript] = useState('');
  // A recording started from the ring keeps its card out of the way until
  // the creature is clicked again (founder, 7 Sep 2026); one started from
  // an open card, or a card the person reached for, stays in view.
  const [quiet, setQuiet] = useState(false);
  const [busy, setBusy] = useState<'send' | 'transcribe' | 'starting' | 'stopping' | null>(null);
  const [flash, setFlash] = useState<Flash>(preview?.flash ?? null);
  // Dictation from anywhere (0.5.3, founder 24 Sep): the eyes, the meter.
  const [dict, setDict] = useState<DictationView>(preview?.dictation ?? IDLE_VIEW);
  // Record message from the ring (founder, 25 Sep 2026): a take with its own
  // screen, the eyes, a live level and exactly Done and Cancel, and the card
  // only after Done (shared/puckTake.ts). `takeLevels` is the meter.
  const [ringTake, setRingTake] = useState(preview?.take ?? false);
  const [takeLevels, setTakeLevels] = useState<number[]>(preview?.takeLevels ?? []);
  // The take's last sign of life the recorder cannot see: its start, and Done.
  const takeMark = useRef(0);
  // When main last said anything about dictation from anywhere.
  const lastDictAt = useRef(0);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [now, setNow] = useState(Date.now());
  const drag = useRef<{ x0: number; y0: number; grab: { x: number; y: number }; started: boolean } | null>(null);
  const pending = useRef({ dx: 0, dy: 0, raf: 0 });
  const transcriptBox = useRef<HTMLTextAreaElement | null>(null);
  // The note card's drawn height, read off the page (I3).
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardDrawn, setCardDrawn] = useState(0);
  const [cardDrawnW, setCardDrawnW] = useState(0);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const [flashDrawn, setFlashDrawn] = useState(0);
  // The card the clip callbacks read, since they fire after the card may
  // have closed or changed.
  const composeRef = useRef<Compose | null>(null);
  // The meeting chord (0.5.3, F16): main's press lands here and runs the
  // same start or stop a click on the recorder runs; the ref keeps the
  // handler current without re-subscribing.
  const toggleRef = useRef<(() => void) | null>(null);
  composeRef.current = compose;

  // The theme token block in tokens.css and the --puck-* set in puck.css both
  // key off this attribute. This window has its own <html>, so the app's
  // theme module stamping ITS document does nothing here.
  useEffect(() => {
    if (preview) return;
    document.documentElement.dataset.cthTheme = st.theme === 'dark' ? 'dark' : 'light';
    // The Stapler is PRO only: its card takes the PRO kit's tokens (founder,
    // 25 Sep: "make sure that input card's design is as per our pro theme").
    document.documentElement.dataset.cthSkin = 'professional';
  }, [preview, st.theme]);

  useEffect(() => {
    if (preview) return;
    void window.cth.puckConfig().then(setCfg);
    void window.cth.puckState().then(setSt);
    const offCfg = window.cth.onPuckConfig(setCfg);
    const offSt = window.cth.onPuckState(setSt);
    const offShot = window.cth.onPuckCaptured((shot) => {
      // A picture joins the note being written, if there is one, and the
      // pictures already on the card (I6: several per send, up to the cap).
      const prev = composeRef.current;
      const had = prev?.kind === 'screenshot' ? prev.shots.filter((s) => s.path !== shot.path) : [];
      const attached = prev?.kind === 'message' || (prev?.kind === 'screenshot' && prev.attached === true);
      const card: Compose = { kind: 'screenshot', shots: [...had, shot].slice(0, PUCK_MAX_SHOTS), ...(attached ? { attached: true } : {}) };
      composeRef.current = card;
      setCompose(card);
      if (prev?.kind !== 'message' && prev?.kind !== 'screenshot') setNote('');
      setQuiet(false);
    });
    // Linux: main learns whether a monitor of the output is listed (F16, PR 4).
    const offMonitor = watchMonitor();
    const offToggle = window.cth.onPuckMeetingToggle ? window.cth.onPuckMeetingToggle(() => toggleRef.current?.()) : () => {};
    const offDict = window.cth.onPuckDictation ? window.cth.onPuckDictation((e) => dictRef.current?.(e)) : () => {};
    // A capture that failed after Capture: the overlay that asked is gone, so
    // main tells this window, and the card (or the notice) says why.
    const offShotFail = window.cth.onPuckCaptureFailed ? window.cth.onPuckCaptureFailed((e) => captureFailRef.current?.(e.error)) : () => {};
    return () => { offCfg(); offSt(); offShot(); offMonitor(); offToggle(); offDict(); offShotFail(); };
  }, [preview]);

  // A recording that ended leaves nothing quiet.
  useEffect(() => { if (!st.recording) setQuiet(false); }, [st.recording]);

  // A clock for the recording pulse, only while something is recording.
  useEffect(() => {
    if (!st.recording) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [st.recording]);

  // Batch 2 #9: recording both sides through the machine's own speakers puts
  // the other side into the microphone. One quiet line says headphones are
  // cleaner; read from the output device, again when devices change.
  const twoTrack = st.recording?.kind === 'meeting' && st.recording.tracks === 2;
  const [onSpeakers, setOnSpeakers] = useState(false);
  useEffect(() => {
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!twoTrack || !md?.enumerateDevices) { setOnSpeakers(false); return; }
    let live = true;
    const read = () => {
      void md.enumerateDevices().then((all) => {
        const outs = all.filter((d) => d.kind === 'audiooutput');
        const out = outs.find((d) => d.deviceId === 'default') ?? outs[0];
        if (live) setOnSpeakers(!!out && speakersAreBuiltIn(out.label));
      }).catch(() => { if (live) setOnSpeakers(false); });
    };
    read();
    md.addEventListener('devicechange', read);
    return () => { live = false; md.removeEventListener('devicechange', read); };
  }, [twoTrack]);

  // The meeting card shows the transcript so far: read when the card opens
  // and again each time main has written another part down.
  const meetingId = compose?.kind === 'meeting' ? compose.meetingId : null;
  const written = st.recording?.kind === 'meeting' ? st.recording.transcribed : 0;
  useEffect(() => {
    if (!meetingId) { setTranscript(''); return; }
    let live = true;
    void window.cth.puckMeetingTranscript({ id: meetingId }).then((r) => { if (live && r.ok) setTranscript(r.text); });
    return () => { live = false; };
  }, [meetingId, written]);
  useEffect(() => {
    const box = transcriptBox.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [transcript, note]);

  // The card is on screen unless the recording it belongs to started
  // quietly from the ring; then only while the ring is open.
  const cardVisible = compose !== null && !ringTake && (!quiet || !st.recording || st.menuOpen);

  // Watch the card's height while it is up: it changes as words arrive, a
  // problem wraps, or the field is dragged taller.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !cardVisible) { setCardDrawn(0); setCardDrawnW(0); return; }
    const read = () => { setCardDrawn(el.offsetHeight); setCardDrawnW(el.offsetWidth); };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cardVisible, compose?.kind]);
  // The notice likewise: a long reason wraps to more lines than guessed.
  useEffect(() => {
    const el = flashRef.current;
    setFlashDrawn(el ? el.offsetHeight : 0);
  }, [flash, cardVisible]);

  // Tell main when the mouse is ours. The ring and the card claim the whole
  // window; otherwise only a cursor over the disc does.
  // While the selector is up the Capture and Cancel buttons live here, so the
  // window is ours for the whole of a capture. A ring take's Done and Cancel
  // sit off the disc the same way: without `ringTake` here the window went
  // back to ignoring the mouse the moment the cursor left the disc for them,
  // and both clicks fell through to the app below (founder, 25 Sep 2026).
  const wantMouse = hover || dragging || st.menuOpen || cardVisible || flash !== null || st.capturing || ringTake;
  useEffect(() => { if (!preview) void window.cth.puckIgnoreMouse(!wantMouse); }, [wantMouse, preview]);

  const showFlash = useCallback((f: Flash, ms = 2600) => {
    setFlash(f);
    if (f && !f.action) setTimeout(() => setFlash((cur) => (cur === f ? null : cur)), ms);
  }, []);

  // One step of dictation from anywhere: the view, the nudge, and an error
  // as the usual notice (a missing permission gets its one fix button).
  const dictRef = useRef<((e: PuckDictationEvent) => void) | null>(null);
  const captureFailRef = useRef<((error: string) => void) | null>(null);
  // The view the next event steps from; kept outside the state updater so a
  // sound plays once per event, never twice under React's strict checks.
  const dictView = useRef<DictationView>(dict);
  dictRef.current = (e: PuckDictationEvent) => {
    lastDictAt.current = Date.now();
    const { view, sound } = dictationStep(dictView.current, e);
    dictView.current = view;
    setDict(view);
    if (sound) playNudge(sound);
    if (e.type === 'error') {
      if (e.error === 'permission') {
        const pane = e.detail === 'microphone' ? 'microphone' : 'accessibility';
        showFlash({ text: t(`pro.puck.dictation.needs.${pane}`), bad: true, action: { label: t('pro.puck.dictation.fix'), run: () => { void window.cth.anyAppOpenSettings(pane); setFlash(null); } } });
      } else {
        showFlash({ text: t('pro.puck.dictation.failed'), bad: true }, 3200);
      }
      setTimeout(() => { if (dictView.current.phase === 'error') { dictView.current = IDLE_VIEW; setDict(IDLE_VIEW); } }, 3200);
    }
  };

  const closeMenu = useCallback(() => { void window.cth.puckMenu(false); }, []);

  /* ---- what went wrong, and what to do about it -------------------------- */

  // The last part of a spoken message, kept until its words arrived, so a
  // failed transcription can be tried again without speaking it again.
  const lastClip = useRef<rec.ClipBytes | null>(null);
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  /** A failure as a notice with the fix on it, from the error string main
   *  or the recorder returned (shared/puck puckProblem): a missing or
   *  refused Groq key opens Voice settings, a refused microphone opens
   *  System Settings, a service that is busy or unreachable offers another
   *  try on the words kept, and the office not set up opens the app. */
  const problem = (error: string | undefined, ctx: 'start' | 'part' | 'final' | 'send' | 'capture' = 'start'): Flash => {
    const kind = puckProblem(error);
    const openVoice = { label: t('pro.puck.flash.openVoice'), run: () => { void window.cth.puckOpenSettings('Voice'); setFlash(null); } };
    const openDictation = { label: t('pro.puck.flash.openDictation'), run: () => { void window.cth.puckOpenSettings('Dictation & Meetings'); setFlash(null); } };
    const retry = ctx === 'final' && lastClip.current ? { label: t('pro.puck.flash.tryAgain'), run: () => { void retryFinal(); } } : undefined;
    switch (kind) {
      case 'noKey': return { text: t('pro.puck.flash.noKey'), bad: true, action: openVoice };
      case 'noEngine': return { text: t('pro.puck.flash.noEngine'), bad: true, action: openDictation };
      case 'badKey': return { text: t('pro.puck.flash.badKey'), bad: true, action: openVoice };
      case 'busy': return { text: t('pro.puck.flash.busyService'), bad: true, action: retry };
      case 'network': return { text: t('pro.puck.flash.network'), bad: true, action: retry };
      case 'noHive': return { text: t('pro.puck.flash.noHive'), bad: true, action: { label: t('pro.puck.flash.openApp'), run: () => { void window.cth.puckOpenSettings(); setFlash(null); } } };
      case 'micDenied': return { text: t('pro.puck.flash.micDenied'), bad: true, action: isMac ? { label: t('pro.puck.flash.openSettings'), run: () => { void window.cth.puckOpenMicAccess(); setFlash(null); } } : undefined };
      case 'micFailed': return { text: t('pro.puck.flash.micFailed'), bad: true };
      default: {
        const reason = error ?? '';
        if (ctx === 'part') return { text: t('pro.puck.flash.partLost', { reason }), bad: true };
        if (ctx === 'capture') return { text: t('pro.puck.flash.captureFailed', { reason }), bad: true };
        return { text: reason, bad: true, action: retry };
      }
    }
  };

  /** The last part again, from the bytes kept. */
  const retryFinal = async () => {
    const clip = lastClip.current;
    if (!clip) return;
    setFlash(null);
    setBusy('transcribe');
    const out = await window.cth.puckMessageStop(clip);
    setBusy(null);
    if (out.ok) { lastClip.current = null; setNote((n) => join(n, out.text)); }
    else showFlash(problem(out.error, 'final'));
  };

  /* ---- drag and click ---------------------------------------------------- */

  const flushDrag = useCallback(() => {
    pending.current.raf = 0;
    const { dx, dy } = pending.current;
    pending.current.dx = 0;
    pending.current.dy = 0;
    void window.cth.puckDrag({ dx, dy });
  }, []);

  // While a note is being written the disc has no job; while a recording
  // runs it has one, the ring with Stop on it, card or no card.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (compose && !st.recording)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x0: e.clientX, y0: e.clientY, grab: { x: e.clientX - cx, y: e.clientY - cy }, started: false };
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.started) return false;
    setDragging(false);
    if (pending.current.raf) { cancelAnimationFrame(pending.current.raf); pending.current.raf = 0; }
    void window.cth.puckDragEnd();
    return true;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // The button came up somewhere this page did not hear it.
    if ((e.buttons & 1) === 0) { endDrag(); return; }
    if (!d.started) {
      // Client coordinates are safe here: the window has not moved yet.
      if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) <= DEAD_ZONE) return;
      d.started = true;
      setDragging(true);
      if (st.menuOpen) closeMenu();
      void window.cth.puckDragStart(d.grab);
      return;
    }
    pending.current.dx += e.movementX;
    pending.current.dy += e.movementY;
    if (!pending.current.raf) pending.current.raf = requestAnimationFrame(flushDrag);
  };
  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    if (endDrag()) return;
    // A click. The ring toggles; while a capture overlay is up, nothing.
    // While a take from the ring runs, nothing either: Done and Cancel are
    // the only ways out (founder, 25 Sep: a click here opened a half written
    // card, and that screen is what he could not leave).
    if (st.capturing || ringTake) return;
    setFlash(null);
    void window.cth.puckMenu(!st.menuOpen);
  };

  /* ---- actions ---------------------------------------------------------- */

  /** Capture and Cancel, on the disc while the selector is up (0.5.2). The
   *  overlay owns the box; main relays the request to it and the overlay
   *  confirms with its own region. Both buttons go quiet once one is pressed,
   *  until main says the capture is over. */
  const [shotBusy, setShotBusy] = useState(false);
  useEffect(() => { if (!st.capturing) setShotBusy(false); }, [st.capturing]);
  const requestCapture = async () => {
    if (shotBusy) return;
    setShotBusy(true);
    const r = await window.cth.puckCaptureRequest();
    if (!r.ok) { setShotBusy(false); showFlash(problem(r.error, 'capture')); }
  };
  const cancelCapture = () => { if (shotBusy) return; void window.cth.puckCaptureCancel(); };

  const captureProblem = (error: string) => {
    if (error === 'screen-denied' || error === 'screen-empty') {
      const text = error === 'screen-empty' ? t('pro.puck.flash.screenEmpty') : t('pro.puck.flash.screenDenied');
      showFlash({ text, bad: true, action: { label: t('pro.puck.flash.openSettings'), run: () => { void window.cth.puckOpenScreenAccess(); setFlash(null); } } }, 12000);
    } else {
      showFlash(problem(error, 'capture'));
    }
  };
  captureFailRef.current = captureProblem;

  const screenshot = async () => {
    const r = await window.cth.puckCaptureStart();
    if (r.ok) return;
    captureProblem(r.error);
  };

  const startMeeting = async () => {
    setBusy('starting');
    const r = await window.cth.puckMeetingStart();
    if (!r.ok) { setBusy(null); showFlash(problem(r.error)); return; }
    const { meetingId, segmentMinutes, systemAudio } = r;
    // The other side of the call (0.5.3, F16): a second stream when this
    // platform gives the renderer one; the Mac's helper hands main its own.
    const them = systemAudio === 'renderer' ? await openSystemStream() : null;
    const started = await rec.start({ kind: 'meeting', meetingId, segmentMs: segmentMinutes * 60_000 }, async (clip, final, track) => {
      const info = rec.segmentInfo();
      if (clip.audio.byteLength > 0) await window.cth.puckMeetingSegment({ meetingId, seq: info.seq, audio: clip.audio, mimeType: clip.mimeType, startMs: info.startMs, durationMs: info.durationMs, track });
      if (final && track === 'you') await window.cth.puckMeetingStop({ meetingId });
    }, { them });
    setBusy(null);
    if (!started.ok) {
      await window.cth.puckMeetingStop({ meetingId });
      showFlash(problem(started.error));
      return;
    }
    // The transcript card, for the whole meeting, shown while the ring is
    // open; Hide puts it away without stopping anything.
    const card: Compose = { kind: 'meeting', meetingId };
    composeRef.current = card;
    setCompose(card);
    setTranscript('');
    setQuiet(true);
  };

  /** Speak into the card. Opens a message card if none is open (the ring's
   *  Record message), else the open card takes the words (a screenshot
   *  deserves a spoken note too). The recorder rolls at pauses and every
   *  part is written down as it lands, so the words appear while talking;
   *  the last part comes with `final`, when the recording has ended. A card
   *  closed mid dictation drops the words and still clears main's state. */
  const speak = async () => {
    setBusy('starting');
    const r = await window.cth.puckMessageStart();
    if (!r.ok) { setBusy(null); showFlash(problem(r.error)); return; }
    if (!composeRef.current || composeRef.current.kind === 'meeting') {
      // From the ring: the card exists from the first word, and shows on
      // the next click on the creature.
      const card: Compose = { kind: 'message', text: '' };
      composeRef.current = card;
      setCompose(card);
      setNote('');
      setQuiet(true);
      setRingTake(true);
      setTakeLevels([]);
    }
    takeMark.current = Date.now();
    const started = await rec.start({ kind: 'message' }, async (clip, final) => {
      const wanted = composeRef.current !== null && composeRef.current.kind !== 'meeting';
      if (!wanted) {
        if (final) await window.cth.puckMessageStop({ audio: new ArrayBuffer(0), mimeType: clip.mimeType }).catch(() => undefined);
        return;
      }
      if (final) { setBusy('transcribe'); lastClip.current = clip; }
      const out = final
        ? await window.cth.puckMessageStop({ audio: clip.audio, mimeType: clip.mimeType })
        : await window.cth.puckMessageSegment({ audio: clip.audio, mimeType: clip.mimeType });
      if (out.ok) { if (final) lastClip.current = null; setNote((n) => join(n, out.text)); }
      else if (out.error !== 'no audio') showFlash(problem(out.error, final ? 'final' : 'part'));
      // Done ran its course: the card opens with the words in its box.
      if (final) { setBusy(null); setRingTake(false); setQuiet(false); }
    });
    if (!started.ok) {
      // Cancelled while the microphone was opening: cancelTake already told main.
      if (started.error === 'cancelled') return;
      setBusy(null);
      await window.cth.puckMessageStop({ audio: new ArrayBuffer(0), mimeType: 'audio/webm' }).catch(() => undefined);
      if (ringTake || composeRef.current?.kind === 'message') dropTakeCard();
      showFlash(problem(started.error));
      return;
    }
    setBusy(null);
  };

  /** The take's card goes, when the take is dropped before Done. */
  const dropTakeCard = () => {
    setRingTake(false);
    setTakeLevels([]);
    if (composeRef.current?.kind === 'message' && !note.trim()) { composeRef.current = null; setCompose(null); setNote(''); }
  };

  /** Done: stop, and the last part is written down; the card opens then.
   *  Pressed while the microphone is still opening, there is nothing to keep. */
  const doneTake = () => {
    if (busy === 'starting' || !rec.isRecording()) { cancelTake(); return; }
    takeMark.current = Date.now();
    setBusy('transcribe');
    void rec.stop();
  };

  /** Cancel (or Esc, or the watchdog): drop the audio, back to idle, nothing
   *  sent. Always works: the recorder lets the microphone go whatever state it
   *  is in, and main is told the take is over whether or not a clip ever
   *  reached it. */
  const cancelTake = () => {
    rec.cancel();
    lastClip.current = null;
    setBusy(null);
    setRingTake(false);
    setTakeLevels([]);
    composeRef.current = null;
    setCompose(null);
    setNote('');
    void window.cth.puckMessageStop({ audio: new ArrayBuffer(0), mimeType: 'audio/webm' }).catch(() => undefined);
  };
  const phase = takePhase({ ringTake, recording: st.recording?.kind === 'message', busy, card: compose !== null });

  // The take's live level: the recorder's meter, read as bars (the same
  // scale as the Option hold's meter).
  useEffect(() => {
    if (phase !== 'listening' || preview) return;
    const id = setInterval(() => setTakeLevels((l) => [...l, levelOf(rec.level())].slice(-METER_BARS)), 80);
    return () => clearInterval(id);
  }, [phase, preview]);

  // The watchdog: a take with no voice, no audio and no end for a minute is
  // dropped (Kevin, 25 Sep); so is an Option hold view main went quiet on.
  const watchRef = useRef<() => void>(() => {});
  watchRef.current = () => {
    const now = Date.now();
    if (takeExpired(phase, Math.max(rec.lastActive(), takeMark.current), now)) {
      cancelTake();
      showFlash({ text: t('pro.puck.take.expired'), bad: true }, 3200);
    }
    if (dictationExpired(dictView.current.phase, lastDictAt.current, now)) { dictView.current = IDLE_VIEW; setDict(IDLE_VIEW); }
  };
  const watching = phase === 'starting' || phase === 'listening' || phase === 'transcribing' || dict.phase === 'listening' || dict.phase === 'transcribing';
  useEffect(() => {
    if (!watching || preview) return;
    const id = setInterval(() => watchRef.current(), 5000);
    return () => clearInterval(id);
  }, [watching, preview]);

  // Esc cancels a take from anywhere in this window.
  useEffect(() => {
    if (!ringTake) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); cancelTake(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // The mic, on the ring and in the card: press to talk, press again to stop.
  const dictating = st.recording?.kind === 'message';
  // Still taking words: a stop pressed and the last part being written down
  // no longer count, so the mic shows stopped from the click.
  const listening = dictating && busy !== 'stopping' && busy !== 'transcribe';
  const dictate = () => {
    // Stopped at the click (founder, 25 Sep 2026): the button says so at once,
    // and the recorder lets the microphone go now, not after the last part.
    if (dictating) { if (busy === null) setBusy('stopping'); void rec.stop(); return; }
    if (busy || st.recording) return;
    setFlash(null);
    void speak();
  };

  const closeCard = () => {
    composeRef.current = null;
    // Closed mid dictation: the words are dropped and main hears the end
    // either way (a stop could wait on a part that never comes).
    if (dictating || rec.isRecording()) {
      rec.cancel();
      setBusy(null);
      void window.cth.puckMessageStop({ audio: new ArrayBuffer(0), mimeType: 'audio/webm' }).catch(() => undefined);
    }
    setRingTake(false);
    setCompose(null);
    setNote('');
  };

  toggleRef.current = () => {
    if (busy) return;
    if (st.recording?.kind === 'meeting') { void stopRecording(); return; }
    if (!st.recording) void startMeeting();
  };

  const stopRecording = async () => {
    setBusy('stopping');
    closeMenu();
    const was = st.recording?.kind;
    await rec.stop();
    if (was !== 'message') setBusy(null);
    if (was === 'meeting') {
      if (composeRef.current?.kind === 'meeting') { composeRef.current = null; setCompose(null); }
      showFlash({ text: t('pro.puck.flash.meetingSaved') });
    }
  };

  const toggleInvisible = () => { void window.cth.puckInvisible(!st.invisible); };

  /** The picker's choice goes to main, which saves it and answers with the
   *  state naming the new recipient; the preview has no main and keeps it here. */
  const pickRecipient = async (id: string) => {
    if (preview) { setSt((s) => ({ ...s, recipientId: id, recipient: s.recipients.find((r) => r.id === id)?.name ?? s.recipient })); return; }
    setSt(await window.cth.puckSendTo(id));
  };

  const send = async () => {
    if (!compose || compose.kind === 'meeting' || busy) return;
    const text = note.trim();
    if (compose.kind === 'message' && !text) return;
    setFlash(null);
    setBusy('send');
    const r = await window.cth.puckSend(compose.kind === 'screenshot' ? { note: text, screenshots: compose.shots.map((s) => s.path) } : { note: text });
    setBusy(null);
    if (r.ok) { setCompose(null); setNote(''); showFlash({ text: t('pro.puck.flash.sent', { recipient: r.to }) }); }
    else showFlash(problem(r.error, 'send'));
  };

  /* ---- layout ----------------------------------------------------------- */

  const size = cfg?.size ?? 80;
  const side = ringFootprint(size);
  const cx = st.offset.x || side / 2;
  const cy = st.offset.y || side / 2;
  // What may be drawn in: the part of the window on its screen (I3). A
  // Stapler bigger than its screen's work area hangs off it, and a card
  // placed in the bare square was cut there. The card and the notice also
  // keep clear of a screen edge (cardSpace).
  const room = roomIn(onScreen(side, st.screen), cx, cy);
  const space = cardSpace(side, st.screen);

  // The ring for the room around the disc. The window is clamped to the
  // display, so the disc's offset inside it says how far each screen edge
  // is: the full circle in the open, a fan on the far side near an edge.
  const layout = useMemo(() => {
    if (!cfg) return null;
    const actions = st.recording
      ? { screenshot: false, message: false, meeting: true, invisible: true, computerUse: false }
      : cfg.actions;
    return ringLayout(actions, size, room);
  }, [cfg, size, st.recording, room.left, room.right, room.top, room.bottom]);
  const ring = layout?.slots ?? [];
  const orbit = (layout?.radius ?? size * RING.radius) * 2;

  const btnSize = Math.round(size * RING.button);
  const labelFor = (a: PuckAction): { text: string; sub?: string } => {
    if (st.recording && a === 'meeting') return { text: t('pro.puck.ring.stop') };
    if (a === 'invisible') return { text: st.invisible ? t('pro.puck.ring.visible') : t('pro.puck.ring.invisible') };
    if (a === 'computerUse') return { text: t('pro.puck.ring.computerUse'), sub: t('pro.puck.ring.comingSoon') };
    // A meeting needs the same key a message does: main refuses to start one
    // without it (0.5.2), so the button says why before it is pressed.
    if ((a === 'message' || a === 'meeting') && !st.canTranscribe) return { text: t(`pro.puck.ring.${a}`), sub: t('pro.puck.ring.needsKey') };
    return { text: t(`pro.puck.ring.${a}`) };
  };
  const iconFor = (a: PuckAction): string => {
    if (st.recording && a === 'meeting') return 'stop';
    if (a === 'invisible') return st.invisible ? 'eyeOff' : 'eye';
    return PUCK_ACTION_GLYPH[a];
  };
  const run = (a: PuckAction) => {
    if (busy) return;
    if (st.recording) { if (a === 'meeting') void stopRecording(); else if (a === 'invisible') toggleInvisible(); return; }
    switch (a) {
      case 'screenshot': void screenshot(); break;
      case 'meeting': void startMeeting(); break;
      case 'message': dictate(); break;
      case 'invisible': toggleInvisible(); break;
      case 'computerUse': break;
    }
  };

  // The ring: folded while a note is written, except during a recording,
  // when Stop and Leave invisible must stay a click away.
  const showRing = st.menuOpen && !st.capturing && (!compose || st.recording !== null);
  const recordingMs = st.recording ? now - st.recording.startedAt : 0;

  // The card beside the disc, or clear of the ring when both are open. A
  // picture takes its own proportion at the card's width (shared/puck
  // shotBox), several sit as thumbnails (shotsLayout), both inside the part
  // of the window on screen (I3's space), and the card is as tall as that
  // needs.
  const shots = compose?.kind === 'screenshot' && !compose.attached ? shotsLayout(compose.shots, space) : null;
  // The card as tall as it is drawn, not as tall as it was guessed: a long
  // problem wraps the status line and a dragged field grows, and a card
  // placed at the guess ran off the bottom of the screen by the difference.
  const CARD_H = Math.max(cardHeight(shots), cardDrawn);
  const shotsFull = compose?.kind === 'screenshot' && compose.shots.length >= PUCK_MAX_SHOTS;
  const dropShot = (path: string) => {
    const cur = composeRef.current;
    if (cur?.kind !== 'screenshot') return;
    // The last attached picture removed: the card is the message it was.
    if (cur.attached && cur.shots.length === 1) {
      const msg: Compose = { kind: 'message', text: '' };
      composeRef.current = msg;
      setCompose(msg);
      return;
    }
    if (cur.shots.length < 2) return;
    const card: Compose = { kind: 'screenshot', shots: cur.shots.filter((s) => s.path !== path), ...(cur.attached ? { attached: true } : {}) };
    composeRef.current = card;
    setCompose(card);
  };
  const avoid = showRing && st.recording && layout ? ringExtent(layout, size) : null;
  // The card as wide as it is drawn too: its padding and border sit outside
  // CARD.w, and a card placed at CARD.w ran that much past the screen edge.
  const CARD_W = Math.max(CARD.w, cardDrawnW);
  const cardStyle: React.CSSProperties = placeCard({ w: CARD_W, h: CARD_H }, space, { cx, cy, size }, avoid);
  // Capture and Cancel, or Done and Cancel: above the open card, clear of it
  // and on screen (founder, 25 Sep 2026); with no card, by the disc.
  const cardBox = compose && cardVisible
    ? { x0: Number(cardStyle.left), y0: Number(cardStyle.top), x1: Number(cardStyle.left) + CARD_W, y1: Number(cardStyle.top) + CARD_H }
    : null;
  const pair = placePair(size, { cx, cy }, room, space, cardBox);

  const cardTitle = compose?.kind === 'screenshot' && !compose.attached ? t('pro.puck.card.screenshot') : compose?.kind === 'meeting' ? t('pro.puck.card.meeting') : t('pro.puck.card.message');
  // What the card says, in order of urgency: a problem, then what is being
  // waited on (the microphone opening, words being written, a message on
  // its way), then the recording's state, then the picture's size or the
  // review nudge.
  const rowText = (): string => {
    if (flash) return flash.text;
    if (busy === 'starting') return t('pro.puck.card.starting');
    if (busy === 'stopping') return t('pro.puck.card.stopping');
    if (busy === 'transcribe') return t('pro.puck.card.transcribing');
    if (busy === 'send') return t('pro.puck.card.sending');
    if (st.recording?.kind === 'meeting') {
      const time = t('pro.puck.card.recording', { time: clock(recordingMs) });
      return st.canTranscribe ? `${time} · ${t('pro.puck.card.parts', { done: st.recording.transcribed, total: st.recording.segments })}` : `${time} · ${t('pro.puck.card.noKeyMeeting')}`;
    }
    if (dictating) return t('pro.puck.card.recording', { time: clock(recordingMs) });
    if (compose?.kind === 'screenshot' && compose.attached) return t('pro.puck.card.attached', { count: compose.shots.length });
    if (compose?.kind === 'screenshot') {
      if (shotsFull) return t('pro.puck.card.shotsFull', { count: PUCK_MAX_SHOTS });
      if (compose.shots.length > 1) return t('pro.puck.card.shots', { count: compose.shots.length });
      return `${compose.shots[0].width}×${compose.shots[0].height}`;
    }
    return t('pro.puck.card.review');
  };

  return (
    <div
      style={{ width: side, height: side, position: 'relative' }}
      onMouseDown={(e) => {
        // A press on the transparent part while the ring is open closes it.
        if (e.target === e.currentTarget && st.menuOpen) closeMenu();
      }}
      {...(showRing || cardVisible ? { 'data-hit': true } : {})}
    >
      {/* The ring, folded into the disc until `in`. */}
      {cfg && (
        <div className={`puck-ring${showRing ? ' in' : ''}`} aria-hidden={!showRing}>
          <div className="puck-orbit" style={{ left: cx, top: cy, width: orbit, height: orbit }} />
          <div className="puck-orbit dashed" style={{ left: cx, top: cy, width: orbit + 28, height: orbit + 28 }} />
          {ring.map((slot, i) => {
            const label = labelFor(slot.action);
            const disabled = slot.action === 'computerUse' ||
              ((slot.action === 'message' || slot.action === 'meeting') && !st.canTranscribe && !st.recording);
            const on = slot.action === 'invisible' && st.invisible;
            const danger = st.recording !== null && slot.action === 'meeting';
            // Beside the button on the circle; past it along its own angle
            // on a fan (shared/puck LabelPlace).
            let lx: string;
            let labelPos: { left: number; top: number };
            if (slot.label.mode === 'beside') {
              const outward = slot.label.side;
              lx = outward === 'left' ? 'calc(-100% - 10px)' : outward === 'right' ? '10px' : '-50%';
              labelPos = outward === 'up'
                ? { left: cx + slot.x, top: cy + slot.y - btnSize / 2 - 14 }
                : outward === 'down'
                  ? { left: cx + slot.x, top: cy + slot.y + btnSize / 2 + 14 }
                  : { left: cx + slot.x + (outward === 'right' ? btnSize / 2 : -btnSize / 2), top: cy + slot.y };
            } else {
              const rad = (slot.angle * Math.PI) / 180;
              const d = (layout?.radius ?? 0) + btnSize / 2 + RING.pad + LABEL_GAP;
              lx = slot.label.align === 'left' ? '-100%' : slot.label.align === 'right' ? '0' : '-50%';
              labelPos = { left: Math.round(cx + Math.sin(rad) * d), top: Math.round(cy - Math.cos(rad) * d) };
            }
            // The name is drawn by puck.css only while its button is hovered
            // or focused, and must stay the button's next sibling for that.
            // No title on the button: it would repeat the label a beat later.
            return (
              <div key={slot.action}>
                <button
                  type="button"
                  className={`puck-btn${on ? ' on' : ''}${danger ? ' danger' : ''}`}
                  data-hit
                  data-action={slot.action}
                  disabled={disabled}
                  tabIndex={showRing ? 0 : -1}
                  aria-label={label.text}
                  style={{ left: cx, top: cy, width: btnSize, height: btnSize, ['--x' as string]: `${slot.x}px`, ['--y' as string]: `${slot.y}px`, ['--i' as string]: i } as React.CSSProperties}
                  onClick={() => run(slot.action)}
                >
                  <Glyph name={iconFor(slot.action)} size={Math.round(btnSize * 0.46)} />
                </button>
                <div className="puck-label" style={{ ...labelPos, ['--lx' as string]: lx } as React.CSSProperties}>
                  {label.text}
                  {label.sub && <small>{label.sub}</small>}
                </div>
              </div>
            );
          })}
          {/* Close, straight below, nearer than the buttons. A fan has none:
              the disc and the empty space close it, and the room is the
              buttons'. */}
          {layout?.close && (
            <button
              type="button"
              className="puck-btn close"
              data-hit
              tabIndex={showRing ? 0 : -1}
              aria-label={t('pro.puck.ring.close')}
              title={t('pro.puck.ring.close')}
              style={{ left: cx, top: cy, width: Math.round(size * RING.closeButton), height: Math.round(size * RING.closeButton), ['--x' as string]: `${layout.close.x}px`, ['--y' as string]: `${layout.close.y}px`, ['--i' as string]: ring.length } as React.CSSProperties}
              onClick={closeMenu}
            >
              <Glyph name="close" size={14} />
            </button>
          )}
        </div>
      )}

      {/* Capture and Cancel, on the Stapler while the selector is up (0.5.2,
          card v052-stapler-capture-buttons-placement): the ring is folded, and
          these two take the ring's place straight below the disc, or above it
          at the bottom of the screen. The labels stay on: the words are the
          point. */}
      {cfg && st.capturing && !preview && (() => {
        const one = (kind: 'capture' | 'cancel', i: number) => {
          const x = kind === 'capture' ? -pair.dx : pair.dx;
          const text = kind === 'capture' ? (shotBusy ? t('pro.puck.capture.capturing') : t('pro.puck.capture.capture')) : t('pro.puck.capture.cancel');
          return (
            <div key={kind}>
              <button
                type="button"
                className={`puck-btn ${kind === 'capture' ? 'on' : 'close'}`}
                data-hit
                data-action={kind}
                disabled={shotBusy}
                aria-label={text}
                style={{ left: pair.x, top: pair.y, width: pair.button, height: pair.button, ['--x' as string]: `${x}px`, ['--y' as string]: '0px', ['--i' as string]: i } as React.CSSProperties}
                onClick={kind === 'capture' ? () => { void requestCapture(); } : cancelCapture}
              >
                <Glyph name={kind === 'capture' ? 'check' : 'close'} size={Math.round(pair.button * 0.46)} />
              </button>
              <div className="puck-label always" style={{ left: pair.x + x, top: pair.labelTop, ['--lx' as string]: '-50%' } as React.CSSProperties}>{text}</div>
            </div>
          );
        };
        return (
          <div className="puck-ring in puck-capture" data-hit data-pair={pair.at}>
            {one('capture', 0)}
            {one('cancel', 1)}
          </div>
        );
      })()}

      {/* The recording pulse around the disc, and the clock under it (a take
          from the ring shows its meter and Done and Cancel instead). */}
      {st.recording && (
        <>
          <div className="puck-rec" style={{ left: cx, top: cy, width: size + 10, height: size + 10 }} />
          {!ringTake && <div className="puck-clock" style={{ left: cx, top: cy + size / 2 + 10 }}>
            {busy === 'starting' ? t('pro.puck.card.starting') : `${st.recording.kind === 'meeting' ? t('pro.puck.recording.meeting') : t('pro.puck.recording.message')} ${clock(recordingMs)}`}
            {busy === 'transcribe' && ` · ${t('pro.puck.recording.transcribing')}`}
          </div>}
        </>
      )}

      {/* Record message from the ring (founder, 25 Sep 2026): the eyes, the
          live level, and exactly two buttons, Done and Cancel, in the place
          the capture pair uses; the level sits on the other side of the disc.
          Nothing else: a click on the disc does nothing while this is up. */}
      {cfg && ringTake && (phase === 'starting' || phase === 'listening' || phase === 'transcribing') && (() => {
        const labelTop = pair.labelTop;
        // The level goes on the side the buttons are not. With the buttons
        // above (the Stapler at the bottom of the screen) there is no room
        // below either, so it sits above their labels instead of off screen.
        const pillTop = labelTop > pair.y ? cy - size / 2 - 10 - DICTATE_PILL_H : labelTop - 26 - DICTATE_PILL_H;
        const one = (kind: 'done' | 'cancel', i: number) => {
          const x = kind === 'done' ? -pair.dx : pair.dx;
          const text = kind === 'done' ? t('pro.puck.take.done') : t('pro.puck.take.cancel');
          return (
            <div key={kind}>
              <button
                type="button"
                className={`puck-btn ${kind === 'done' ? 'on' : 'close'}`}
                data-hit
                data-take={kind}
                disabled={kind === 'done' && phase !== 'listening'}
                aria-label={text}
                style={{ left: pair.x, top: pair.y, width: pair.button, height: pair.button, ['--x' as string]: `${x}px`, ['--y' as string]: '0px', ['--i' as string]: i } as React.CSSProperties}
                onClick={kind === 'done' ? doneTake : cancelTake}
              >
                <Glyph name={kind === 'done' ? 'check' : 'close'} size={Math.round(pair.button * 0.46)} />
              </button>
              <div className="puck-label always" style={{ left: pair.x + x, top: pair.labelTop, ['--lx' as string]: '-50%' } as React.CSSProperties}>{text}</div>
            </div>
          );
        };
        return (
          <>
            <div className="puck-dictate" data-take-phase={phase} style={{ left: cx, top: pillTop }} aria-live="polite">
              {phase === 'listening' ? (
                <span className="puck-meter" aria-label={t('pro.puck.dictation.listening')}>
                  {Array.from({ length: METER_BARS }, (_, i) => {
                    const lv = takeLevels[takeLevels.length - METER_BARS + i] ?? 0;
                    return <i key={i} style={{ height: 3 + Math.round(lv * 13) }} />;
                  })}
                </span>
              ) : phase === 'starting' ? t('pro.puck.card.starting') : t('pro.puck.recording.transcribing')}
            </div>
            <div className="puck-ring in puck-capture" data-hit data-take-buttons data-pair={pair.at}>
              {one('done', 0)}
              {one('cancel', 1)}
            </div>
          </>
        );
      })()}

      {/* The disc. */}
      {cfg && (
        <div
          className={`puck-disc${hover || dragging || st.menuOpen ? ' lifted' : ''}`}
          data-hit
          role="button"
          aria-label={t('pro.puck.disc')}
          aria-expanded={st.menuOpen}
          style={{ left: cx, top: cy, opacity: hover || dragging || st.menuOpen || st.recording || compose || dict.phase !== 'idle' ? 1 : cfg.opacity / 100 }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { endDrag(); }}
          onLostPointerCapture={() => { endDrag(); }}
        >
          <PuckFace look={dict.phase === 'listening' || dict.phase === 'transcribing' || (ringTake && phase !== 'card' && phase !== 'idle') ? { ...cfg, expression: 'thinking' } : cfg} size={size} animate="always" />
        </div>
      )}

      {/* Dictation from anywhere (0.5.3): a live meter while it listens, then
          Transcribing. The eyes above switch to the thinking pose meanwhile.
          Under the disc, or above it when the Stapler sits at the bottom of
          the screen (placeFlash), so the meter is never cut off. */}
      {!st.recording && (dict.phase === 'listening' || dict.phase === 'transcribing') && (
        <div className="puck-dictate" data-dictation={dict.phase} style={{ left: cx, top: placeFlash(space, { cx, cy, size }, DICTATE_PILL_H, 10).top }} aria-live="polite">
          {dict.phase === 'listening' ? (
            <span className="puck-meter" aria-label={t('pro.puck.dictation.listening')}>
              {Array.from({ length: METER_BARS }, (_, i) => {
                const lv = dict.levels[dict.levels.length - METER_BARS + i] ?? 0;
                return <i key={i} style={{ height: 3 + Math.round(lv * 13) }} />;
              })}
            </span>
          ) : t('pro.puck.recording.transcribing')}
        </div>
      )}

      {/* The note card: a screenshot with its note, a spoken message with its
          words, or a meeting with its transcript so far. */}
      {compose && cardVisible && (
        <div ref={cardRef} className="puck-card" data-hit style={cardStyle} role="dialog" aria-label={cardTitle}>
          <div className="puck-head">
            <h2>{cardTitle}</h2>
            {/* Who this goes to (0.5.3, I5): every agent a capture can reach
                now, the orchestrator first. The pick is saved as the Stapler's
                "Send captures to", so it is still chosen the next time the
                card opens, and after the app restarts. A native menu, so it
                opens whole even with the Stapler against a screen edge. */}
            {compose.kind !== 'meeting' && st.recipients.length > 0 && (
              <label className="puck-to">
                <span>{t('pro.puck.card.to')}</span>
                <select
                  data-recipient
                  aria-label={t('pro.puck.card.sendTo')}
                  value={st.recipientId}
                  disabled={busy === 'send'}
                  onChange={(e) => { void pickRecipient(e.target.value); }}
                >
                  {st.recipients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
            )}
          </div>
          {compose.kind === 'screenshot' && !compose.attached && compose.shots.length === 1 && <img src={compose.shots[0].preview} alt="" width={shots?.boxes[0]?.width} height={shots?.boxes[0]?.height} />}
          {compose.kind === 'screenshot' && !compose.attached && compose.shots.length > 1 && (
            <div className="puck-shots" data-shots={compose.shots.length}>
              {compose.shots.map((s, i) => (
                <div key={s.path} className="puck-thumb" style={{ width: shots?.boxes[i]?.width, height: shots?.boxes[i]?.height }}>
                  <img src={s.preview} alt="" />
                  <button
                    type="button"
                    className="puck-b icon"
                    data-drop-shot
                    disabled={busy !== null}
                    aria-label={t('pro.puck.card.dropShot', { n: i + 1 })}
                    title={t('pro.puck.card.dropShot', { n: i + 1 })}
                    onClick={() => dropShot(s.path)}
                  >
                    <Glyph name="close" size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {compose.kind === 'meeting' && onSpeakers && (
            <div className="puck-hint" role="note" data-speakers-hint>{t('pro.puck.card.headphones')}</div>
          )}
          {compose.kind === 'meeting' ? (
            <textarea
              ref={transcriptBox}
              readOnly
              value={transcript}
              placeholder={t('pro.puck.card.transcriptWaits')}
              onKeyDown={(e) => { if (e.key === 'Escape') closeCard(); }}
            />
          ) : (
            <textarea
              ref={transcriptBox}
              autoFocus
              value={note}
              placeholder={compose.kind === 'screenshot' && !compose.attached ? t('pro.puck.card.notePlaceholder', { recipient: st.recipient }) : dictating ? t('pro.puck.card.listening') : t('pro.puck.card.messagePlaceholder')}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeCard();
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); }
              }}
            />
          )}
          {/* The pictures added to this message (founder, 25 Sep 2026: "even
              when we click screenshot it is not getting shown as attached"):
              a chip each, under the words, with a remove x. Send carries them. */}
          {compose.kind === 'screenshot' && compose.attached && (
            <div className="puck-attached" data-attached={compose.shots.length}>
              {compose.shots.map((s, i) => (
                <div key={s.path} className="puck-chip" data-chip>
                  <img src={s.preview} alt="" />
                  <span>{t('pro.puck.card.chip', { n: i + 1 })}</span>
                  <button
                    type="button"
                    className="puck-b icon"
                    data-drop-shot
                    disabled={busy !== null}
                    aria-label={t('pro.puck.card.dropShot', { n: i + 1 })}
                    title={t('pro.puck.card.dropShot', { n: i + 1 })}
                    onClick={() => dropShot(s.path)}
                  >
                    <Glyph name="close" size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* What the card says, on its own line: a problem, else the
              recording's state, else the picture's size or the review
              nudge. Beside four controls the row has no room for it. */}
          <div className={`puck-status${flash?.bad ? ' bad' : ''}`} role="status">
            <span>{rowText()}</span>
            {flash?.action && <button type="button" className="puck-b" onClick={flash.action.run}>{flash.action.label}</button>}
            {flash?.action && <button type="button" className="puck-b" aria-label={t('pro.puck.card.dismiss')} title={t('pro.puck.card.dismiss')} onClick={() => setFlash(null)}><Glyph name="close" size={11} /></button>}
          </div>
          <div className="puck-row">
            {compose.kind === 'meeting' ? (
              <>
                <button type="button" className="puck-b" onClick={quiet ? closeMenu : closeCard}>{t('pro.puck.card.hide')}</button>
                <button type="button" className="puck-b danger" data-stop disabled={busy !== null} onClick={() => { void stopRecording(); }}>
                  {t('pro.puck.ring.stop')}
                </button>
              </>
            ) : (
              <>
                {/* A picture for a spoken message (founder, 7 Sep 2026): the
                    capture box opens, and the picture joins this note. And
                    another picture for a screenshot card (I6, 23 Sep 2026),
                    up to PUCK_MAX_SHOTS. */}
                {(compose.kind === 'message' || compose.kind === 'screenshot') && (
                  <button
                    type="button"
                    className="puck-b icon"
                    data-shot
                    disabled={busy !== null || st.capturing || shotsFull}
                    aria-label={t('pro.puck.card.addScreenshot')}
                    title={t('pro.puck.card.addScreenshot')}
                    onClick={() => { void screenshot(); }}
                  >
                    <Glyph name="screenshot" size={15} />
                  </button>
                )}
                <button
                  type="button"
                  className={`puck-b icon${listening ? ' danger' : ''}`}
                  data-dictate
                  disabled={busy !== null || (!st.canTranscribe && !dictating)}
                  aria-label={listening ? t('pro.puck.card.stopDictate') : t('pro.puck.card.dictate')}
                  title={!st.canTranscribe && !dictating ? t('pro.puck.ring.needsKey') : listening ? t('pro.puck.card.stopDictate') : t('pro.puck.card.dictate')}
                  onClick={dictate}
                >
                  <Glyph name={listening ? 'stop' : 'mic'} size={15} />
                </button>
                <button type="button" className="puck-b" onClick={closeCard}>{t('pro.puck.card.cancel')}</button>
                <button type="button" className="puck-b primary" disabled={busy !== null || dictating || (compose.kind === 'message' && !note.trim())} onClick={() => { void send(); }}>
                  {busy === 'send' ? t('pro.puck.card.sending') : t('pro.puck.card.send')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* A short notice under the disc, or above it when there is no room;
          always whole and inside the window (placeFlash). */}
      {flash && !cardVisible && (
        <div ref={flashRef} className={`puck-flash${flash.bad ? ' bad' : ''}`} data-hit style={placeFlash(space, { cx, cy, size }, Math.max(flash.action ? 96 : 36, flashDrawn), st.recording ? 36 : FLASH.gap)} role="status">
          <span>{flash.text}</span>
          {flash.action && (
            <span className="puck-row">
              <button type="button" className="puck-b" onClick={flash.action.run}>{flash.action.label}</button>
              <button type="button" className="puck-b" onClick={() => setFlash(null)}>{t('pro.puck.card.cancel')}</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
