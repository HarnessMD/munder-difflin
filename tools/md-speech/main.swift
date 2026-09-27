// md-speech: Apple SpeechAnalyzer as a resident helper for Munder Difflin
// (0.5.3, F16). macOS 26 and later.
//
// One JSON object per line on stdin, one or more JSON lines per request on
// stdout. Every reply carries the request's `id` back unchanged. The process
// stays alive between requests so the system keeps the model warm; it exits
// on stdin EOF or {"op":"shutdown"}. The first line it prints, before any
// request, is {"ready":true,"helper":"md-speech","version":...}.
//
// Requests
//   {"id":1,"op":"ping"}
//     -> {"id":1,"ok":true,"helper":"md-speech","version":"0.1.0","macos":"26.0.1"}
//   {"id":2,"op":"status","locale":"en_US"}
//     -> {"id":2,"locale":"en_US","status":"installed|supported|downloading|unsupported",
//         "installed":[...locales...],"supported":[...locales...]}
//   {"id":3,"op":"install","locale":"en_US"}
//     -> {"id":3,"event":"asset","state":"downloading","progress":0.42}   (repeated)
//     -> {"id":3,"event":"asset","state":"installed","ms":12800}
//   {"id":4,"audioPath":"/tmp/x.wav","mode":"dictation","words":["Munder Difflin"]}   ("prompt":"a, b" is taken too)
//   {"id":5,"pcm16":"<base64 little endian int16 mono>","sampleRate":16000,"mode":"meeting"}
//     dictation streams:  {"id":4,"partial":"text so far"}   (repeated)
//     both finish with:   {"id":4,"text":"...","segments":[{"t0":0.0,"t1":2.4,"text":"..."}],"ms":812}
//     optional fields: "locale" (default en_US), "stream" (default true for
//     dictation, false for meeting), "engine" ("transcriber", the default and
//     the measured one, is SpeechTranscriber; "dictation" opts into the
//     DictationTranscriber module), "autoInstall" (download the asset first
//     when it is only supported).
//   Errors: {"id":4,"error":"asset-not-installed","status":"supported"}
//
//   A streamed dictation (any app push to talk: audio arrives while the key
//   is held, so the recogniser works during the speech and the final text
//   lands a fraction of a second after key up instead of seconds later):
//   {"id":7,"op":"stream","sampleRate":16000,"channels":1,"mode":"dictation","words":[...]}
//     -> {"id":7,"stream":"open"}                    the session is taking audio
//   {"op":"chunk","stream":7,"pcm16":"<base64>"}     no reply; repeated while held
//     -> {"id":7,"partial":"text so far"}           as the recogniser hears it
//   {"op":"end","stream":7}                          the key went up
//     -> {"id":7,"text":"...","segments":[...],"ms":412,"totalMs":2210,"seconds":1.9,"chunks":19}
//        "ms" is end to final, the number a push to talk user feels.
//   {"op":"cancel","stream":7}                       a tap, nothing wanted
//     -> {"id":7,"error":"cancelled"}
//   A helper without these ops answers {"error":"unknown-op"}; the caller
//   then sends the whole clip as one pcm16 request (md-whisper does this).
//   {"id":8,"op":"warm","locale":"en_US"} -> {"id":8,"ok":true,"ms":4100}
//     runs a moment of silence through a session so the system loads the
//     model now; the first real request in a fresh helper otherwise pays
//     3 to 4 s at load (measured 23 Sep), the ones after it under 100 ms.
//
// Custom words go in as AnalysisContext.contextualStrings under the .general
// tag, which is the API Apple gives for vocabulary the recogniser should favour.
import AVFoundation
import CoreMedia
import Foundation
import Speech

let VERSION = "0.2.0"

// MARK: output, one line at a time, never interleaved
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
let DEBUG = ProcessInfo.processInfo.environment["MD_SPEECH_DEBUG"] != nil
func debug(_ s: String) { if DEBUG { FileHandle.standardError.write(("md-speech: " + s + "\n").data(using: .utf8)!) } }

struct HelperError: Error, CustomStringConvertible {
  let description: String
  init(_ s: String) { description = s }
}

// MARK: the pieces every module hands back
struct Piece {
  let text: String
  let start: Double
  let end: Double
  let isFinal: Bool
}

@available(macOS 26, *)
func statusWord(_ s: AssetInventory.Status) -> String {
  switch s {
  case .installed: return "installed"
  case .downloading: return "downloading"
  case .supported: return "supported"
  case .unsupported: return "unsupported"
  @unknown default: return "unknown"
  }
}

@available(macOS 26, *)
func makeModule(engine: String, locale: Locale, stream: Bool) -> any SpeechModule {
  if engine == "transcriber" {
    return SpeechTranscriber(
      locale: locale,
      transcriptionOptions: [],
      reportingOptions: stream ? [.volatileResults] : [],
      attributeOptions: [.audioTimeRange])
  }
  return DictationTranscriber(
    locale: locale,
    contentHints: [.shortForm],
    transcriptionOptions: [.punctuation],
    reportingOptions: stream ? [.volatileResults] : [],
    attributeOptions: [.audioTimeRange])
}

@available(macOS 26, *)
func collect(_ module: any SpeechModule, _ sink: @escaping (Piece) -> Void) -> Task<Void, Error> {
  if let t = module as? SpeechTranscriber {
    return Task {
      for try await r in t.results {
        debug("transcriber final=\(r.isFinal) range=\(r.range.start.seconds)..\(r.range.end.seconds) fin=\(r.resultsFinalizationTime.seconds) text=\(String(r.text.characters))")
        sink(Piece(text: String(r.text.characters), start: r.range.start.seconds, end: r.range.end.seconds, isFinal: r.isFinal))
      }
    }
  }
  let d = module as! DictationTranscriber
  return Task {
    for try await r in d.results {
      debug("dictation final=\(r.isFinal) range=\(r.range.start.seconds)..\(r.range.end.seconds) fin=\(r.resultsFinalizationTime.seconds) text=\(String(r.text.characters))")
      sink(Piece(text: String(r.text.characters), start: r.range.start.seconds, end: r.range.end.seconds, isFinal: r.isFinal))
    }
  }
}

// MARK: audio in
@available(macOS 26, *)
func pcmBuffer(base64: String, sampleRate: Double, channels: Int) throws -> AVAudioPCMBuffer {
  guard let data = Data(base64Encoded: base64) else { throw HelperError("pcm16 is not base64") }
  guard let fmt = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: AVAudioChannelCount(channels), interleaved: true) else { throw HelperError("bad pcm format") }
  let frames = data.count / (2 * channels)
  guard frames > 0, let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: AVAudioFrameCount(frames)) else { throw HelperError("pcm16 is empty") }
  buf.frameLength = AVAudioFrameCount(frames)
  data.withUnsafeBytes { raw in
    guard let dst = buf.int16ChannelData?[0] else { return }
    raw.copyBytes(to: UnsafeMutableRawBufferPointer(start: dst, count: data.count))
  }
  return buf
}

/// The analyzer wants its own format (16 kHz Int16 mono today); convert when
/// the caller's differs. AVAudioConverter pulls input through the block.
func converted(_ buf: AVAudioPCMBuffer, to fmt: AVAudioFormat) throws -> AVAudioPCMBuffer {
  if buf.format == fmt { return buf }
  guard let conv = AVAudioConverter(from: buf.format, to: fmt) else { throw HelperError("no converter \(buf.format) -> \(fmt)") }
  let ratio = fmt.sampleRate / buf.format.sampleRate
  let cap = AVAudioFrameCount(Double(buf.frameLength) * ratio) + 64
  guard let out = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: cap) else { throw HelperError("no output buffer") }
  var handed = false
  var err: NSError? = nil
  let status = conv.convert(to: out, error: &err) { _, outStatus in
    if handed { outStatus.pointee = .endOfStream; return nil }
    handed = true
    outStatus.pointee = .haveData
    return buf
  }
  if let err { throw err }
  if status == .error { throw HelperError("audio conversion failed") }
  return out
}

/// A module that never finalised (DictationTranscriber does this) still said
/// something: its last volatile text stands as the one segment. Segments are
/// {t0, t1, text} in seconds, the shape md-whisper answers with.
func assemble(_ finalsIn: [Piece], volatileText: String) -> (text: String, segments: [[String: Any]]) {
  var finals = finalsIn
  if finals.isEmpty, !volatileText.trimmingCharacters(in: .whitespaces).isEmpty {
    finals = [Piece(text: volatileText, start: 0, end: 0, isFinal: true)]
  }
  let text = finals.map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.joined(separator: " ")
  let segments: [[String: Any]] = finals.map { ["t0": ($0.start * 1000).rounded() / 1000, "t1": ($0.end * 1000).rounded() / 1000, "text": $0.text.trimmingCharacters(in: .whitespacesAndNewlines)] }
  return (text, segments)
}

/// Vocabulary: "words" as a list, or md-whisper's "prompt" as one string
/// (split on commas and newlines); the same request serves both helpers.
func wordsOf(_ req: [String: Any]) -> [String] {
  var words = (req["words"] as? [String]) ?? []
  if words.isEmpty, let prompt = req["prompt"] as? String {
    words = prompt.split(whereSeparator: { $0 == "," || $0 == "\n" }).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
  }
  return words
}

// MARK: one transcription
@available(macOS 26, *)
func transcribe(_ req: [String: Any], id: Any) async {
  let t0 = nowMs()
  let mode = (req["mode"] as? String) ?? "dictation"
  // Both modes use SpeechTranscriber, the module the F16 benchmark measured
  // (WER 0.87%, partials at mic pace). DictationTranscriber is opt in through
  // "engine":"dictation": on macOS 26.0.1 it never marks a result final and
  // dropped a word on the fixture, so it is not the default.
  let engine = (req["engine"] as? String) ?? "transcriber"
  let stream = (req["stream"] as? Bool) ?? (mode == "dictation")
  let locale = Locale(identifier: (req["locale"] as? String) ?? "en_US")
  let words = wordsOf(req)

  let module = makeModule(engine: engine, locale: locale, stream: stream)
  var status = await AssetInventory.status(forModules: [module])
  if status == .supported, (req["autoInstall"] as? Bool) == true {
    do { try await install(locale: locale, modules: [module], id: id) } catch { fail(id, "asset-install-failed", ["detail": "\(error)"]); return }
    status = await AssetInventory.status(forModules: [module])
  }
  guard status == .installed else { fail(id, "asset-not-installed", ["status": statusWord(status), "locale": locale.identifier]); return }

  let analyzer = SpeechAnalyzer(modules: [module])
  if !words.isEmpty {
    let context = AnalysisContext()
    context.contextualStrings = [.general: words]
    do { try await analyzer.setContext(context) } catch { fail(id, "context-failed", ["detail": "\(error)"]); return }
  }

  var finals: [Piece] = []
  var volatileText = ""
  let sink: (Piece) -> Void = { p in
    if p.isFinal {
      finals.append(p)
      volatileText = ""
    } else {
      volatileText = p.text
    }
    if stream {
      let sofar = (finals.map(\.text).joined(separator: " ") + " " + volatileText).trimmingCharacters(in: .whitespacesAndNewlines)
      emit(["id": id, "partial": sofar])
    }
  }
  let collector = collect(module, sink)

  do {
    if let path = req["audioPath"] as? String {
      let file = try AVAudioFile(forReading: URL(fileURLWithPath: path))
      if let last = try await analyzer.analyzeSequence(from: file) {
        try await analyzer.finalizeAndFinish(through: last)
      } else {
        try await analyzer.finalizeAndFinish(through: CMTime(seconds: Double(file.length) / file.processingFormat.sampleRate, preferredTimescale: 16000))
      }
    } else if let b64 = req["pcm16"] as? String {
      let rate = (req["sampleRate"] as? Double) ?? 16000
      let channels = (req["channels"] as? Int) ?? 1
      let raw = try pcmBuffer(base64: b64, sampleRate: rate, channels: channels)
      let fmt = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [module]) ?? raw.format
      let buf = try converted(raw, to: fmt)
      let (input, cont) = AsyncStream<AnalyzerInput>.makeStream()
      try await analyzer.start(inputSequence: input)
      cont.yield(AnalyzerInput(buffer: buf))
      cont.finish()
      try await analyzer.finalizeAndFinishThroughEndOfInput()
    } else {
      throw HelperError("request needs audioPath or pcm16")
    }
    try await collector.value
  } catch {
    collector.cancel()
    fail(id, "transcription-failed", ["detail": "\(error)"])
    return
  }

  let (text, segments) = assemble(finals, volatileText: volatileText)
  emit(["id": id, "text": text, "segments": segments, "ms": Int(nowMs() - t0), "engine": engine, "locale": locale.identifier])
}

// MARK: a streamed dictation: chunks in while the key is held, final on end
@available(macOS 26, *)
final class StreamSession {
  let id: Any
  let key: String
  let t0 = nowMs()
  let engine: String
  let locale: Locale
  let analyzer: SpeechAnalyzer
  let inFormat: AVAudioFormat
  let format: AVAudioFormat
  let cont: AsyncStream<AnalyzerInput>.Continuation
  var collector: Task<Void, Error>? = nil
  var finals: [Piece] = []
  var volatileText = ""
  var chunks = 0
  var frames = 0
  init(id: Any, engine: String, locale: Locale, analyzer: SpeechAnalyzer, inFormat: AVAudioFormat, format: AVAudioFormat, cont: AsyncStream<AnalyzerInput>.Continuation) {
    self.id = id; self.key = "\(id)"; self.engine = engine; self.locale = locale; self.analyzer = analyzer
    self.inFormat = inFormat; self.format = format; self.cont = cont
  }
  func take(_ p: Piece) {
    if p.isFinal { finals.append(p); volatileText = "" } else { volatileText = p.text }
    let sofar = (finals.map(\.text).joined(separator: " ") + " " + volatileText).trimmingCharacters(in: .whitespacesAndNewlines)
    emit(["id": id, "partial": sofar])
  }
}
@available(macOS 26, *)
var streams: [String: StreamSession] = [:]

@available(macOS 26, *)
func openStream(_ req: [String: Any], id: Any) async {
  let key = "\(id)"
  if streams[key] != nil { fail(id, "busy", ["detail": "stream \(key) is already open"]); return }
  let engine = (req["engine"] as? String) ?? "transcriber"
  let locale = Locale(identifier: (req["locale"] as? String) ?? "en_US")
  let words = wordsOf(req)
  let rate = (req["sampleRate"] as? Double) ?? 16000
  let channels = (req["channels"] as? Int) ?? 1
  guard let inFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: rate, channels: AVAudioChannelCount(channels), interleaved: true) else {
    fail(id, "transcription-failed", ["detail": "bad pcm format"]); return
  }
  let module = makeModule(engine: engine, locale: locale, stream: true)
  let status = await AssetInventory.status(forModules: [module])
  guard status == .installed else { fail(id, "asset-not-installed", ["status": statusWord(status), "locale": locale.identifier]); return }
  let analyzer = SpeechAnalyzer(modules: [module])
  if !words.isEmpty {
    let context = AnalysisContext()
    context.contextualStrings = [.general: words]
    do { try await analyzer.setContext(context) } catch { fail(id, "context-failed", ["detail": "\(error)"]); return }
  }
  let format = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [module]) ?? inFormat
  let (input, cont) = AsyncStream<AnalyzerInput>.makeStream()
  let s = StreamSession(id: id, engine: engine, locale: locale, analyzer: analyzer, inFormat: inFormat, format: format, cont: cont)
  s.collector = collect(module) { p in s.take(p) }
  do { try await analyzer.start(inputSequence: input) } catch {
    s.collector?.cancel(); cont.finish()
    fail(id, "transcription-failed", ["detail": "\(error)"]); return
  }
  streams[key] = s
  emit(["id": id, "stream": "open", "sampleRate": format.sampleRate, "ms": Int(nowMs() - s.t0)])
}

@available(macOS 26, *)
func streamOf(_ req: [String: Any]) -> StreamSession? {
  guard let ref = req["stream"] else { return nil }
  return streams["\(ref)"]
}

@available(macOS 26, *)
func streamChunk(_ req: [String: Any]) {
  guard let s = streamOf(req) else { emit(["event": "error", "error": "no-stream", "stream": "\(req["stream"] ?? "")"]); return }
  guard let b64 = req["pcm16"] as? String else { emit(["event": "error", "error": "bad-chunk", "stream": s.key, "detail": "pcm16 missing"]); return }
  do {
    let raw = try pcmBuffer(base64: b64, sampleRate: s.inFormat.sampleRate, channels: Int(s.inFormat.channelCount))
    let buf = try converted(raw, to: s.format)
    s.cont.yield(AnalyzerInput(buffer: buf))
    s.chunks += 1
    s.frames += Int(buf.frameLength)
  } catch {
    emit(["event": "error", "error": "bad-chunk", "stream": s.key, "detail": "\(error)"])
  }
}

/// The key went up: no more audio. The finish runs on its own task so the
/// next press can open its stream while this one settles.
@available(macOS 26, *)
func endStream(_ req: [String: Any]) {
  guard let s = streamOf(req) else { emit(["event": "error", "error": "no-stream", "stream": "\(req["stream"] ?? "")"]); return }
  streams.removeValue(forKey: s.key)
  let tEnd = nowMs()
  s.cont.finish()
  Task {
    do {
      try await s.analyzer.finalizeAndFinishThroughEndOfInput()
      try await s.collector?.value
    } catch {
      s.collector?.cancel()
      fail(s.id, "transcription-failed", ["detail": "\(error)"])
      return
    }
    let (text, segments) = assemble(s.finals, volatileText: s.volatileText)
    emit(["id": s.id, "text": text, "segments": segments, "ms": Int(nowMs() - tEnd), "totalMs": Int(nowMs() - s.t0),
          "seconds": (Double(s.frames) / s.format.sampleRate * 1000).rounded() / 1000, "chunks": s.chunks, "engine": s.engine, "locale": s.locale.identifier])
  }
}

/// Push a moment of silence through a session so the daemon loads the model
/// before the first real request.
@available(macOS 26, *)
func warm(_ req: [String: Any], id: Any) async {
  let t0 = nowMs()
  let locale = Locale(identifier: (req["locale"] as? String) ?? "en_US")
  let module = makeModule(engine: (req["engine"] as? String) ?? "transcriber", locale: locale, stream: true)
  let status = await AssetInventory.status(forModules: [module])
  guard status == .installed else { fail(id, "asset-not-installed", ["status": statusWord(status), "locale": locale.identifier]); return }
  let analyzer = SpeechAnalyzer(modules: [module])
  guard let format = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [module]),
        let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(format.sampleRate / 5)) else {
    fail(id, "transcription-failed", ["detail": "no analyzer format"]); return
  }
  buf.frameLength = buf.frameCapacity
  let collector = collect(module) { _ in }
  do {
    let (input, cont) = AsyncStream<AnalyzerInput>.makeStream()
    try await analyzer.start(inputSequence: input)
    cont.yield(AnalyzerInput(buffer: buf))
    cont.finish()
    try await analyzer.finalizeAndFinishThroughEndOfInput()
    try await collector.value
  } catch {
    collector.cancel()
    fail(id, "transcription-failed", ["detail": "\(error)"]); return
  }
  emit(["id": id, "ok": true, "ms": Int(nowMs() - t0), "locale": locale.identifier])
}

@available(macOS 26, *)
func cancelStream(_ req: [String: Any]) {
  guard let s = streamOf(req) else { emit(["event": "error", "error": "no-stream", "stream": "\(req["stream"] ?? "")"]); return }
  streams.removeValue(forKey: s.key)
  s.cont.finish()
  s.collector?.cancel()
  Task {
    await s.analyzer.cancelAndFinishNow()
    fail(s.id, "cancelled", ["chunks": s.chunks])
  }
}

// MARK: assets
/// Locales this process has already reserved: a second install request in the
/// same helper answers at once instead of asking the asset daemon again.
var reservedHere = Set<String>()

@available(macOS 26, *)
func install(locale: Locale, modules: [any SpeechModule], id: Any) async throws {
  let t0 = nowMs()
  if reservedHere.contains(locale.identifier) {
    emit(["id": id, "event": "asset", "state": "installed", "ms": 0, "locale": locale.identifier, "cached": true])
    return
  }
  // Already on the disk: reserve the locale if this process has not, and skip
  // the installation request, which took 3 s a call even with nothing to
  // fetch (T117 step 4, 23 Sep).
  var present = true
  for m in modules where await AssetInventory.status(forModules: [m]) != .installed { present = false; break }
  if present {
    let reserved = await AssetInventory.reservedLocales
    let want = locale.identifier(.bcp47)
    if !reserved.contains(where: { $0.identifier(.bcp47) == want }) {
      _ = try await AssetInventory.reserve(locale: locale)
    }
    reservedHere.insert(locale.identifier)
    emit(["id": id, "event": "asset", "state": "installed", "ms": Int(nowMs() - t0), "locale": locale.identifier, "reserved": true])
    return
  }
  guard let request = try await AssetInventory.assetInstallationRequest(supporting: modules) else {
    emit(["id": id, "event": "asset", "state": "installed", "ms": 0, "locale": locale.identifier])
    return
  }
  let progress = request.progress
  let ticker = Task {
    while !Task.isCancelled {
      emit(["id": id, "event": "asset", "state": "downloading", "progress": progress.fractionCompleted, "locale": locale.identifier])
      try await Task.sleep(nanoseconds: 500_000_000)
    }
  }
  defer { ticker.cancel() }
  try await request.downloadAndInstall()
  reservedHere.insert(locale.identifier)
  emit(["id": id, "event": "asset", "state": "installed", "ms": Int(nowMs() - t0), "locale": locale.identifier])
}

@available(macOS 26, *)
func status(_ req: [String: Any], id: Any) async {
  let locale = Locale(identifier: (req["locale"] as? String) ?? "en_US")
  let dictation = await AssetInventory.status(forModules: [makeModule(engine: "dictation", locale: locale, stream: false)])
  let transcriber = await AssetInventory.status(forModules: [makeModule(engine: "transcriber", locale: locale, stream: false)])
  let installed = await DictationTranscriber.installedLocales.map(\.identifier).sorted()
  let supported = await DictationTranscriber.supportedLocales.map(\.identifier).sorted()
  // "status" is the worse of the two module types; both are needed.
  let worst = min(dictation, transcriber)
  emit(["id": id, "locale": locale.identifier, "status": statusWord(worst), "dictation": statusWord(dictation), "transcriber": statusWord(transcriber), "installed": installed, "supported": supported])
}

// MARK: the loop: stdin lines in, handled one at a time, in order
@available(macOS 26, *)
func handle(_ req: [String: Any]) async {
  let id: Any = req["id"] ?? NSNull()
  let op = (req["op"] as? String) ?? "transcribe"
  switch op {
  case "ping":
    let v = ProcessInfo.processInfo.operatingSystemVersion
    emit(["id": id, "ok": true, "helper": "md-speech", "version": VERSION, "macos": "\(v.majorVersion).\(v.minorVersion).\(v.patchVersion)", "stream": true])
  case "status":
    await status(req, id: id)
  case "install":
    let locale = Locale(identifier: (req["locale"] as? String) ?? "en_US")
    do { try await install(locale: locale, modules: [makeModule(engine: "dictation", locale: locale, stream: false), makeModule(engine: "transcriber", locale: locale, stream: false)], id: id) }
    catch { fail(id, "asset-install-failed", ["detail": "\(error)"]) }
  case "shutdown":
    emit(["id": id, "ok": true])
    exit(0)
  case "transcribe":
    await transcribe(req, id: id)
  case "stream":
    await openStream(req, id: id)
  case "chunk":
    streamChunk(req)
  case "end":
    endStream(req)
  case "cancel":
    cancelStream(req)
  case "warm":
    await warm(req, id: id)
  default:
    fail(id, "unknown-op", ["op": op])
  }
}

guard #available(macOS 26, *) else {
  emit(["error": "unsupported-macos", "detail": "md-speech needs macOS 26 or later"])
  exit(3)
}

// The same first line md-whisper prints, so a router can wait for it.
do {
  let v = ProcessInfo.processInfo.operatingSystemVersion
  emit(["ready": true, "helper": "md-speech", "version": VERSION, "macos": "\(v.majorVersion).\(v.minorVersion).\(v.patchVersion)", "stream": true])
}
let (lines, feed) = AsyncStream<[String: Any]>.makeStream()
Thread {
  while let line = readLine(strippingNewline: true) {
    let trimmed = line.trimmingCharacters(in: .whitespaces)
    if trimmed.isEmpty { continue }
    guard let data = trimmed.data(using: .utf8), let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
      emit(["error": "bad-json"])
      continue
    }
    feed.yield(obj)
  }
  feed.finish()
}.start()

let done = DispatchSemaphore(value: 0)
Task {
  for await req in lines { await handle(req) }
  done.signal()
}
done.wait()
exit(0)
