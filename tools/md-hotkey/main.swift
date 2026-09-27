// md-hotkey: the native half of "dictate into any app" on macOS (0.5.3, F16,
// F16-ANY-APP-DICTATION.md). Three things Electron cannot do on its own:
//
//   1. A global push to talk key with KEY UP. Electron's globalShortcut only
//      reports the press; the Carbon hot key API reports both and needs no
//      permission for a modifier plus key combination.
//   2. Microphone capture while our window is not focused, straight from
//      AVAudioEngine, handed back as 16 kHz mono PCM when the key is released.
//   3. Text injection into the frontmost app: the text goes on the pasteboard,
//      Cmd+V is posted, and the pasteboard is put back as it was. Posting the
//      keystroke needs the PostEvent grant, which macOS shows in the
//      Accessibility pane.
//
// One JSON object per line on stdin, JSON lines on stdout; replies carry the
// request's id, events have none. First line on start: {"ready":true,...}.
//
//   {"id":1,"op":"ping"}                      -> {"id":1,"ok":true,"helper":"md-hotkey","version":"0.1.0"}
//   {"id":2,"op":"permissions"}               -> {"id":2,"mic":"authorized|denied|notDetermined|restricted","accessibility":true,"postEvent":true}
//   {"id":3,"op":"requestMic"}                -> the system prompt if not yet decided; {"id":3,"mic":"authorized"}
//   {"id":4,"op":"requestAccessibility"}      -> the system prompt; {"id":4,"accessibility":false}   (true only after the user ticks the box)
//   {"id":5,"op":"requestPostEvent"}          -> {"id":5,"postEvent":false}
//   {"id":6,"op":"openSettings","pane":"accessibility|microphone"} -> {"id":6,"ok":true}
//   {"id":7,"op":"arm","key":"Control+Alt+Space","record":true}    -> {"id":7,"ok":true,"keyCode":49,"modifiers":6144}
//        then, on the key:  {"event":"keydown"}   {"event":"keyup","heldMs":812}
//        and with record:   {"event":"audio","pcm16":"<base64>","sampleRate":16000,"seconds":0.81}
//        or                 {"event":"error","error":"mic-denied|capture-failed","detail":"..."}
//   {"id":7,"op":"arm","key":"Control+Alt+Space","record":true,"stream":true}
//        the audio comes WHILE the key is held, a chunk at a time (about
//        every 40 ms), so a streaming recogniser can work during the speech:
//        {"event":"chunk","pcm16":"<base64>","sampleRate":16000,"seq":12}   (repeated)
//        {"event":"keyup","heldMs":812}
//        {"event":"audio-end","seconds":0.81,"peak":0.4,"chunks":19}         after the last chunk
//   {"id":7,"op":"arm","key":"Option","record":true,"stream":true}
//        HOLD A MODIFIER ALONE (0.5.3, founder 24 Sep 2026): "Option" (or
//        "Alt") is not a chord but a hold. Either Option key, held with no
//        other modifier, key or click for holdMs (default 300), gives the
//        keydown above; letting go gives keyup. Anything else pressed during
//        the wait cancels quietly, so Option+E and Option+click keep working.
//        Anything pressed AFTER the keydown ends the take without text:
//        {"event":"cancel","why":"key|click|modifier"}
//        {"id":14,"op":"holdInput","input":"option|release|modifier|key|click"}
//        feeds the hold one input as if the monitor saw it (tests). Arm with
//        "monitor":false for a test, so real keys on the machine stay out.
//        Watching keys from outside needs Accessibility; the reply carries
//        "trusted", and without it nothing is heard.
//   While recording, in every mode, about every 40 ms:
//        {"event":"level","rms":0.12,"peak":0.4}   (0 to 1, for a live meter)
//   {"id":8,"op":"disarm"}                    -> {"id":8,"ok":true}
//   {"id":12,"op":"tap","key":"Shift+Command+Space"} -> {"id":12,"ok":true,"key":...,"keyCode":49,"modifiers":768}
//       A second, separate chord that reports each press (key DOWN, one event
//       per press, key up ignored): {"event":"tap","key":"Shift+Command+Space","at":<ms>}.
//       The founder's meeting chord (0.5.3, F16): press starts a Stapler meeting,
//       press again stops it. Lives beside the armed key; untap and disarm leave
//       each other alone. bad-key and register-failed as arm gives them.
//   {"id":13,"op":"untap"}                    -> {"id":13,"ok":true}
//   {"id":11,"op":"record","seconds":1}       -> the audio event after one second, then {"id":11,"ok":true}
//        with "stream":true the chunk events and audio-end instead, as a held key gives
//   {"id":9,"op":"inject","text":"hello","restoreMs":300,"dryRun":false} -> {"id":9,"ok":true,"posted":true,"restored":true}
//        dryRun writes and restores the pasteboard but posts no keystroke.
//   {"id":10,"op":"shutdown"}                 -> {"id":10,"ok":true} and exit 0
//
// Keys: an Electron style accelerator, "Control+Alt+Space", "Command+Shift+D",
// "F5". Modifiers: Command|Cmd|Super, Control|Ctrl, Alt|Option, Shift. A key
// with no modifier is accepted only for F1 to F20, so a bare letter can never
// be taken away from every app.
import AppKit
import AVFoundation
import Carbon
import Foundation

let VERSION = "0.4.0"

// MARK: output
let outLock = NSLock()
func emit(_ obj: [String: Any]) {
  guard let data = try? JSONSerialization.data(withJSONObject: obj, options: [.sortedKeys, .withoutEscapingSlashes]) else { return }
  outLock.lock()
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data([0x0a]))
  outLock.unlock()
}
func fail(_ id: Any, _ error: String, _ extra: [String: Any] = [:]) {
  var o: [String: Any] = ["id": id, "error": error]
  for (k, v) in extra { o[k] = v }
  emit(o)
}
func nowMs() -> Double { Date().timeIntervalSince1970 * 1000 }
let DEBUG = ProcessInfo.processInfo.environment["MD_HOTKEY_DEBUG"] != nil
func debug(_ s: String) { if DEBUG { FileHandle.standardError.write(("md-hotkey: " + s + "\n").data(using: .utf8)!) } }

// MARK: key names
let KEYS: [String: UInt32] = [
  "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9, "b": 11, "q": 12, "w": 13, "e": 14, "r": 15,
  "y": 16, "t": 17, "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "=": 24, "9": 25, "7": 26, "-": 27, "8": 28, "0": 29,
  "]": 30, "o": 31, "u": 32, "[": 33, "i": 34, "p": 35, "l": 37, "j": 38, "'": 39, "k": 40, ";": 41, "\\": 42, ",": 43, "/": 44,
  "n": 45, "m": 46, ".": 47, "`": 50,
  "return": 36, "enter": 36, "tab": 48, "space": 49, "backspace": 51, "delete": 117, "escape": 53, "esc": 53,
  "home": 115, "end": 119, "pageup": 116, "pagedown": 121, "left": 123, "right": 124, "down": 125, "up": 126,
  "f1": 122, "f2": 120, "f3": 99, "f4": 118, "f5": 96, "f6": 97, "f7": 98, "f8": 100, "f9": 101, "f10": 109,
  "f11": 103, "f12": 111, "f13": 105, "f14": 107, "f15": 113, "f16": 106, "f17": 64, "f18": 79, "f19": 80, "f20": 90,
  "plus": 24, "minus": 27, "comma": 43, "period": 47, "slash": 44, "semicolon": 41, "quote": 39, "grave": 50
]
struct HotKeySpec { let code: UInt32; let modifiers: UInt32; let name: String }
/// "Option" or "Alt" alone: the hold, not a Carbon chord.
func isHoldName(_ s: String) -> Bool {
  let k = s.trimmingCharacters(in: .whitespaces).lowercased()
  return k == "option" || k == "alt" || k == "opt"
}
func parseKey(_ s: String) -> HotKeySpec? {
  let parts = s.split(separator: "+").map { $0.trimmingCharacters(in: .whitespaces) }
  guard let last = parts.last, !last.isEmpty else { return nil }
  var mods: UInt32 = 0
  for m in parts.dropLast() {
    switch m.lowercased() {
    case "command", "cmd", "super", "meta": mods |= UInt32(cmdKey)
    case "control", "ctrl": mods |= UInt32(controlKey)
    case "alt", "option", "opt": mods |= UInt32(optionKey)
    case "shift": mods |= UInt32(shiftKey)
    default: return nil
    }
  }
  guard let code = KEYS[last.lowercased()] else { return nil }
  let isFunctionKey = last.lowercased().hasPrefix("f") && Int(last.dropFirst()) != nil
  if mods == 0 && !isFunctionKey { return nil }
  return HotKeySpec(code: code, modifiers: mods, name: s)
}

// MARK: the hot key (Carbon), press and release
var hotKeyRef: EventHotKeyRef? = nil
var handlerRef: EventHandlerRef? = nil
var armed: HotKeySpec? = nil
/// The tap slot (hot key id 2): the meeting chord, press only.
var tapRef: EventHotKeyRef? = nil
var tapped: HotKeySpec? = nil
let HOTKEY_SIG = OSType(0x4D444854) /* MDHT */
func hotKeyIdOf(_ event: EventRef) -> UInt32 {
  var hkid = EventHotKeyID()
  let status = GetEventParameter(event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID), nil, MemoryLayout<EventHotKeyID>.size, nil, &hkid)
  return status == noErr ? hkid.id : 1
}
var recordOnHold = false
var streamOnHold = false
var pressedAt: Double = 0
var isDown = false
var releasePending = false

let hotKeyHandler: EventHandlerUPP = { _, event, _ in
  guard let event else { return noErr }
  let kind = GetEventKind(event)
  if hotKeyIdOf(event) == 2 {
    // The tap slot: one event per press, releases and repeats say nothing.
    if kind == UInt32(kEventHotKeyPressed), let t = tapped { emit(["event": "tap", "key": t.name, "at": nowMs()]) }
    return noErr
  }
  if kind == UInt32(kEventHotKeyPressed) {
    if isDown { releasePending = false; return noErr }
    isDown = true
    pressedAt = nowMs()
    emit(["event": "keydown"])
    if recordOnHold { Recorder.shared.start(streaming: streamOnHold) }
  } else if kind == UInt32(kEventHotKeyReleased) {
    if !isDown { return noErr }
    // Key repeat can show up as a release and a press a few ms apart; a real
    // release has no press behind it. Wait a moment before believing it.
    releasePending = true
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(60)) {
      guard releasePending, isDown else { return }
      releasePending = false
      isDown = false
      emit(["event": "keyup", "heldMs": Int(nowMs() - pressedAt)])
      if recordOnHold { Recorder.shared.stopAndEmit() }
    }
  }
  return noErr
}

func installHandlerOnce() -> Bool {
  if handlerRef != nil { return true }
  var specs = [
    EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed)),
    EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyReleased))
  ]
  let status = InstallEventHandler(GetApplicationEventTarget(), hotKeyHandler, 2, &specs, nil, &handlerRef)
  return status == noErr
}

func arm(_ spec: HotKeySpec) -> OSStatus {
  disarm()
  guard installHandlerOnce() else { return -1 }
  let hkid = EventHotKeyID(signature: HOTKEY_SIG, id: 1)
  return RegisterEventHotKey(spec.code, spec.modifiers, hkid, GetApplicationEventTarget(), 0, &hotKeyRef)
}

func tap(_ spec: HotKeySpec) -> OSStatus {
  untap()
  guard installHandlerOnce() else { return -1 }
  let hkid = EventHotKeyID(signature: HOTKEY_SIG, id: 2)
  return RegisterEventHotKey(spec.code, spec.modifiers, hkid, GetApplicationEventTarget(), 0, &tapRef)
}

func untap() {
  if let ref = tapRef { UnregisterEventHotKey(ref); tapRef = nil }
  tapped = nil
}

func disarm() {
  if let ref = hotKeyRef { UnregisterEventHotKey(ref); hotKeyRef = nil }
  stopHold()
  armed = nil
  isDown = false
  releasePending = false
  Recorder.shared.teardown()
}

// MARK: the hold (Option alone), from a global event monitor
var holdMonitor: Any? = nil
var holdWait: DispatchWorkItem? = nil
var holdMs = 300
/// Set when something else joined Option; only letting Option go clears it,
/// so Option+Shift, then Shift up with Option still held, never starts a take.
var holdSpoiled = false
/// Option is held right now (alone or with others). Typing with Option up
/// spoils nothing.
var optionHeld = false
let MOD_MASK: NSEvent.ModifierFlags = [.command, .control, .option, .shift, .function]

func holdPress() {
  isDown = true
  pressedAt = nowMs()
  emit(["event": "keydown"])
  if recordOnHold { Recorder.shared.start(streaming: streamOnHold) }
}
func holdRelease() {
  guard isDown else { return }
  isDown = false
  emit(["event": "keyup", "heldMs": Int(nowMs() - pressedAt)])
  if recordOnHold { Recorder.shared.stopAndEmit() }
}
/// Something else joined after the take began: drop it, say why.
func holdCancel(_ why: String) {
  holdWait?.cancel(); holdWait = nil
  guard isDown else { return }
  isDown = false
  if recordOnHold { Recorder.shared.discard() }
  emit(["event": "cancel", "why": why, "heldMs": Int(nowMs() - pressedAt)])
}
/// What the monitor saw, reduced to the five things the hold cares about.
/// The holdInput op feeds the same words in, so a test can walk the rules
/// without pressing a real key on the machine.
enum HoldInput: String { case option, release, modifier, key, click }
func onHoldEvent(_ e: NSEvent) {
  switch e.type {
  case .flagsChanged:
    let f = e.modifierFlags.intersection(MOD_MASK)
    onHoldInput(f == .option ? .option : !f.contains(.option) ? .release : .modifier)
  case .keyDown: onHoldInput(.key)
  default: onHoldInput(.click)
  }
}
func onHoldInput(_ i: HoldInput) {
  switch i {
  case .option:
    optionHeld = true
    do {
      // Option alone went down: wait, unless already waiting or taking.
      if isDown || holdWait != nil || holdSpoiled { return }
      let w = DispatchWorkItem { holdWait = nil; holdPress() }
      holdWait = w
      DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(holdMs), execute: w)
    }
  case .release:
    // Option let go: a wait ends quietly, a take ends and is typed.
    holdSpoiled = false
    optionHeld = false
    if let w = holdWait { w.cancel(); holdWait = nil; return }
    holdRelease()
  case .modifier, .key, .click:
    // Anything else: a wait ends quietly, a take ends without text.
    if i == .modifier { optionHeld = true }
    if optionHeld { holdSpoiled = true }
    if let w = holdWait { w.cancel(); holdWait = nil; return }
    holdCancel(i.rawValue)
  }
}
/// Armed as a hold. `monitor: false` (tests) arms the rules with no global
/// monitor, so only holdInput drives them and the person using the machine
/// cannot change a test's answer by typing.
var holdArmed = false
func startHold(monitor: Bool) -> Bool {
  stopHold()
  holdArmed = true
  if !monitor { return true }
  holdMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.flagsChanged, .keyDown, .leftMouseDown, .rightMouseDown, .otherMouseDown], handler: onHoldEvent)
  return holdMonitor != nil
}
func stopHold() {
  holdArmed = false
  holdWait?.cancel(); holdWait = nil
  holdSpoiled = false
  optionHeld = false
  if let m = holdMonitor { NSEvent.removeMonitor(m); holdMonitor = nil }
}

// MARK: the microphone, 16 kHz mono Int16 out
final class Recorder {
  static let shared = Recorder()
  private var engine: AVAudioEngine? = nil
  private var converter: AVAudioConverter? = nil
  private var out: Data = Data()
  private var capturing = false
  private var streaming = false
  private var seq = 0
  private var frames = 0
  private var peak: Int16 = 0
  /// Chunks leave on this queue, never on the audio thread: encoding and a
  /// write to a pipe must not stall the microphone.
  private let chunkQueue = DispatchQueue(label: "md-hotkey.chunks")
  var isCapturing: Bool { capturing }
  private let target = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true)!
  private let lock = NSLock()

  /// Build the graph and prepare it while the key is armed, so the press
  /// only has to start it: starting a cold engine took 300 to 450 ms on an
  /// M1, which is the first syllable. The microphone opens on start, not here.
  func prewarm() {
    if engine != nil { return }
    if AVCaptureDevice.authorizationStatus(for: .audio) == .denied { return }
    let engine = AVAudioEngine()
    let input = engine.inputNode
    let fmt = input.outputFormat(forBus: 0)
    guard fmt.sampleRate > 0, let conv = AVAudioConverter(from: fmt, to: target) else { return }
    converter = conv
    debug("input format \(fmt)")
    input.installTap(onBus: 0, bufferSize: 2048, format: fmt) { [weak self] buf, _ in
      guard let self, self.capturing, let conv = self.converter else { return }
      debug("tap \(buf.frameLength) frames")
      let cap = AVAudioFrameCount(Double(buf.frameLength) * self.target.sampleRate / fmt.sampleRate) + 64
      guard let o = AVAudioPCMBuffer(pcmFormat: self.target, frameCapacity: cap) else { return }
      var handed = false
      var err: NSError? = nil
      conv.convert(to: o, error: &err) { _, st in
        if handed { st.pointee = .noDataNow; return nil }
        handed = true; st.pointee = .haveData; return buf
      }
      if let err { debug("convert error \(err)"); return }
      if o.frameLength == 0 { debug("convert gave 0 frames"); return }
      let bytes = Int(o.frameLength) * 2
      if let p = o.int16ChannelData?[0] {
        let chunk = Data(buffer: UnsafeBufferPointer(start: p, count: bytes / 2))
        self.lock.lock()
        self.frames += Int(o.frameLength)
        var sq: Double = 0
        var top: Int16 = 0
        for v in UnsafeBufferPointer(start: p, count: bytes / 2) {
          let a = v == Int16.min ? Int16.max : abs(v)
          if a > self.peak { self.peak = a }
          if a > top { top = a }
          sq += Double(v) * Double(v)
        }
        let rms = (sq / Double(max(1, bytes / 2))).squareRoot() / 32767.0
        let lvl = ["event": "level", "rms": (rms * 1000).rounded() / 1000, "peak": (Double(top) / 32767.0 * 1000).rounded() / 1000] as [String: Any]
        self.chunkQueue.async { emit(lvl) }
        if self.streaming {
          self.seq += 1
          let n = self.seq
          self.lock.unlock()
          self.chunkQueue.async { emit(["event": "chunk", "pcm16": chunk.base64EncodedString(), "sampleRate": 16000, "seq": n]) }
        } else {
          self.out.append(chunk)
          self.lock.unlock()
        }
      }
    }
    engine.prepare()
    self.engine = engine
    debug("engine prepared")
  }

  func start(streaming stream: Bool = false) {
    if AVCaptureDevice.authorizationStatus(for: .audio) == .denied {
      emit(["event": "error", "error": "mic-denied"]); return
    }
    prewarm()
    guard let engine else { emit(["event": "error", "error": "capture-failed", "detail": "no input"]); return }
    lock.lock(); out = Data(); streaming = stream; seq = 0; frames = 0; peak = 0; lock.unlock()
    let t0 = nowMs()
    do {
      try engine.start()
      capturing = true
      debug("engine started in \(Int(nowMs() - t0)) ms")
    } catch {
      emit(["event": "error", "error": "capture-failed", "detail": "\(error)"])
    }
  }

  private func pause() {
    capturing = false
    engine?.pause()
    // Keep the prepared graph for the next press; the device is released by pause.
  }

  func stopAndEmit() {
    pause()
    lock.lock()
    let data = out; out = Data()
    let wasStreaming = streaming; streaming = false
    let n = seq; let total = frames; let top = peak
    lock.unlock()
    let level = Double(top) / 32767.0
    if wasStreaming {
      // After the last chunk, on the same queue, so the order holds.
      let seconds = (Double(total) / 16000 * 1000).rounded() / 1000
      chunkQueue.async { emit(["event": "audio-end", "seconds": seconds, "peak": level, "chunks": n]) }
      return
    }
    let seconds = Double(data.count / 2) / 16000
    emit(["event": "audio", "pcm16": data.base64EncodedString(), "sampleRate": 16000, "seconds": (seconds * 1000).rounded() / 1000, "peak": level])
  }

  func discard() {
    pause()
    lock.lock(); out = Data(); lock.unlock()
  }

  func teardown() {
    capturing = false
    if let e = engine { e.inputNode.removeTap(onBus: 0); e.stop() }
    engine = nil
    converter = nil
  }
}

// MARK: permissions
func micWord() -> String {
  switch AVCaptureDevice.authorizationStatus(for: .audio) {
  case .authorized: return "authorized"
  case .denied: return "denied"
  case .restricted: return "restricted"
  case .notDetermined: return "notDetermined"
  @unknown default: return "unknown"
  }
}
func accessibilityTrusted(prompt: Bool) -> Bool {
  let opts = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: prompt] as CFDictionary
  return AXIsProcessTrustedWithOptions(opts)
}
func permissions() -> [String: Any] {
  ["mic": micWord(), "accessibility": accessibilityTrusted(prompt: false), "postEvent": CGPreflightPostEventAccess()]
}
func openSettings(_ pane: String) -> Bool {
  let anchor: String
  switch pane {
  case "accessibility": anchor = "Privacy_Accessibility"
  case "microphone": anchor = "Privacy_Microphone"
  case "inputMonitoring": anchor = "Privacy_ListenEvent"
  default: anchor = "Privacy"
  }
  guard let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?\(anchor)") else { return false }
  return NSWorkspace.shared.open(url)
}

// MARK: injection: pasteboard, Cmd+V, pasteboard back
func snapshotPasteboard() -> [NSPasteboardItem] {
  (NSPasteboard.general.pasteboardItems ?? []).map { item in
    let copy = NSPasteboardItem()
    for t in item.types { if let d = item.data(forType: t) { copy.setData(d, forType: t) } }
    return copy
  }
}
func restorePasteboard(_ items: [NSPasteboardItem]) {
  let pb = NSPasteboard.general
  pb.clearContents()
  if !items.isEmpty { pb.writeObjects(items) }
}
func postCommandV() -> Bool {
  guard CGPreflightPostEventAccess() else { return false }
  let src = CGEventSource(stateID: .combinedSessionState)
  guard let down = CGEvent(keyboardEventSource: src, virtualKey: 9, keyDown: true),
        let up = CGEvent(keyboardEventSource: src, virtualKey: 9, keyDown: false) else { return false }
  down.flags = .maskCommand
  up.flags = .maskCommand
  down.post(tap: .cghidEventTap)
  up.post(tap: .cghidEventTap)
  return true
}
func inject(id: Any, text: String, restoreMs: Int, dryRun: Bool) {
  let saved = snapshotPasteboard()
  let pb = NSPasteboard.general
  pb.clearContents()
  pb.setString(text, forType: .string)
  var posted = false
  if !dryRun {
    posted = postCommandV()
    if !posted {
      restorePasteboard(saved)
      fail(id, "post-event-denied", ["hint": "grant Accessibility (System Settings, Privacy and Security) and try again"])
      return
    }
  }
  // Give the receiving app time to read the pasteboard before it goes back.
  DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(max(50, restoreMs))) {
    restorePasteboard(saved)
    emit(["id": id, "ok": true, "posted": posted, "restored": true, "dryRun": dryRun])
  }
}

// MARK: requests, on the main thread (Carbon and AppKit want it)
func handle(_ req: [String: Any]) {
  let id: Any = req["id"] ?? NSNull()
  let op = (req["op"] as? String) ?? ""
  switch op {
  case "ping":
    emit(["id": id, "ok": true, "helper": "md-hotkey", "version": VERSION, "stream": true, "tap": true, "hold": true, "level": true])
  case "permissions":
    var o = permissions(); o["id"] = id; emit(o)
  case "requestMic":
    AVCaptureDevice.requestAccess(for: .audio) { _ in
      DispatchQueue.main.async { emit(["id": id, "mic": micWord()]) }
    }
  case "requestAccessibility":
    emit(["id": id, "accessibility": accessibilityTrusted(prompt: true)])
  case "requestPostEvent":
    emit(["id": id, "postEvent": CGRequestPostEventAccess()])
  case "openSettings":
    emit(["id": id, "ok": openSettings((req["pane"] as? String) ?? "")])
  case "arm":
    if let keyName = req["key"] as? String, isHoldName(keyName) {
      disarm()
      recordOnHold = (req["record"] as? Bool) ?? true
      streamOnHold = recordOnHold && ((req["stream"] as? Bool) ?? false)
      holdMs = min(2000, max(100, (req["holdMs"] as? Int) ?? 300))
      guard startHold(monitor: (req["monitor"] as? Bool) ?? true) else { fail(id, "register-failed", ["status": -1, "key": keyName, "detail": "monitor"]); return }
      armed = HotKeySpec(code: 0, modifiers: UInt32(optionKey), name: keyName)
      if recordOnHold { Recorder.shared.prewarm() }
      emit(["id": id, "ok": true, "key": keyName, "keyCode": -1, "modifiers": Int(optionKey), "record": recordOnHold, "stream": streamOnHold, "hold": true, "holdMs": holdMs, "trusted": accessibilityTrusted(prompt: false)])
      return
    }
    guard let keyName = req["key"] as? String, let spec = parseKey(keyName) else { fail(id, "bad-key", ["key": req["key"] ?? ""]); return }
    // One chord, one meaning: the tap slot may not hold it (Creed's rule in
    // win.c and linux.c, matched here so main sees one error on all three).
    if let t = tapped, t.code == spec.code && t.modifiers == spec.modifiers { fail(id, "register-failed", ["status": 0, "key": keyName, "detail": "in-use-by-tap"]); return }
    recordOnHold = (req["record"] as? Bool) ?? true
    streamOnHold = recordOnHold && ((req["stream"] as? Bool) ?? false)
    let status = arm(spec)
    if status != noErr { fail(id, "register-failed", ["status": Int(status), "key": keyName]); return }
    armed = spec
    if recordOnHold { Recorder.shared.prewarm() }
    emit(["id": id, "ok": true, "key": keyName, "keyCode": Int(spec.code), "modifiers": Int(spec.modifiers), "record": recordOnHold, "stream": streamOnHold])
  case "disarm":
    disarm(); emit(["id": id, "ok": true])
  case "tap":
    guard let keyName = req["key"] as? String, let spec = parseKey(keyName) else { fail(id, "bad-key", ["key": req["key"] ?? ""]); return }
    if let a = armed, a.code == spec.code && a.modifiers == spec.modifiers { fail(id, "register-failed", ["status": 0, "key": keyName, "detail": "in-use-by-arm"]); return }
    let status = tap(spec)
    if status != noErr { fail(id, "register-failed", ["status": Int(status), "key": keyName]); return }
    tapped = spec
    emit(["id": id, "ok": true, "key": keyName, "keyCode": Int(spec.code), "modifiers": Int(spec.modifiers)])
  case "holdInput":
    // Test only: feed the hold one input, as if the monitor had seen it.
    guard holdArmed else { fail(id, "not-holding"); return }
    guard let w = req["input"] as? String, let i = HoldInput(rawValue: w) else { fail(id, "bad-request", ["detail": "input"]); return }
    onHoldInput(i); emit(["id": id, "ok": true])
  case "untap":
    untap(); emit(["id": id, "ok": true])
  case "record":
    // Capture for a fixed time with no key: the Settings "test your mic"
    // button, and the way a test proves the microphone path.
    let seconds = min(10.0, max(0.2, (req["seconds"] as? Double) ?? 1.0))
    if isDown || Recorder.shared.isCapturing { fail(id, "busy", ["detail": "already recording"]); return }
    // "stream": true gives the chunk events a held key would, for a test.
    Recorder.shared.start(streaming: (req["stream"] as? Bool) ?? false)
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(Int(seconds * 1000))) {
      Recorder.shared.stopAndEmit()
      emit(["id": id, "ok": true, "seconds": seconds])
    }
  case "inject":
    guard let text = req["text"] as? String else { fail(id, "bad-request", ["detail": "text missing"]); return }
    inject(id: id, text: text, restoreMs: (req["restoreMs"] as? Int) ?? 300, dryRun: (req["dryRun"] as? Bool) ?? false)
  case "shutdown":
    disarm(); untap(); emit(["id": id, "ok": true]); exit(0)
  default:
    fail(id, "unknown-op", ["op": op])
  }
}

// An accessory app: no Dock icon, no menu bar, but a real AppKit run loop so
// Carbon hot key events and AVFoundation callbacks are delivered.
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
emit(["ready": true, "helper": "md-hotkey", "version": VERSION])
Thread {
  while let line = readLine(strippingNewline: true) {
    let t = line.trimmingCharacters(in: .whitespaces)
    if t.isEmpty { continue }
    guard let d = t.data(using: .utf8), let obj = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] else { emit(["error": "bad-json"]); continue }
    DispatchQueue.main.async { handle(obj) }
  }
  DispatchQueue.main.async { disarm(); exit(0) }
}.start()
app.run()
