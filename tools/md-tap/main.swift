// md-tap: the other side of a call on macOS (0.5.3, F16, the founder's
// "you and them" view; hive/shared/v053/F16-SYSTEM-AUDIO-PLAN.md, PR 2).
//
// ScreenCaptureKit's audio tap of the whole display, this app's own audio
// excluded, resampled and downmixed to 16 kHz mono int16 and handed over as
// chunk lines on stdout, the one shape every audio source on the floor speaks
// (Creed's format, 23 Sep 2026). macOS 13 or later; older answers
// {"error":"unsupported-macos"} and exits 3. Needs the Screen Recording
// grant, which is the same grant the puck's screenshot already asks for.
//
// One JSON object per line on stdin, JSON lines on stdout; replies carry the
// request's id, events have none. First line: {"ready":true,...}.
//
//   {"id":1,"op":"ping"}                 -> {"id":1,"ok":true,"helper":"md-tap","version":"0.1.0","macos":"26.0.1"}
//   {"id":2,"op":"permissions"}          -> {"id":2,"screen":true|false}
//   {"id":3,"op":"requestPermission"}    -> the system prompt when never asked; {"id":3,"screen":false}
//                                           (macOS grants after the app is reopened, so false is the usual first answer)
//   {"id":4,"op":"openSettings"}         -> {"id":4,"ok":true}   the Screen Recording pane
//   {"id":5,"op":"start"}                -> {"id":5,"ok":true,"startedAt":1790150000123,"sampleRate":16000}
//        then  {"event":"audio-start","source":"system","startedAt":1790150000123,"sampleRate":16000}
//              {"event":"chunk","pcm16":"<base64 int16 LE mono>","sampleRate":16000,"seq":12,"source":"system","ts":1790150001323}
//              (about every 100 ms while running)
//        or    {"event":"error","error":"screen-denied|capture-failed","detail":"...","source":"system"}
//   {"id":6,"op":"stop"}                 -> {"event":"audio-end","seconds":81.3,"peak":0.4,"chunks":813,"source":"system"} then {"id":6,"ok":true}
//   {"id":7,"op":"shutdown"}             -> {"id":7,"ok":true} and exit 0
//
// `ts` is the epoch millisecond of the chunk's first sample, from the sample
// buffer's presentation time mapped onto the wall clock, so main can cut the
// stream to the microphone's segments by time rather than by arrival.
import AVFoundation
import CoreMedia
import Foundation
import ScreenCaptureKit

let VERSION = "0.1.0"

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
let DEBUG = ProcessInfo.processInfo.environment["MD_TAP_DEBUG"] != nil
func debug(_ s: String) { if DEBUG { FileHandle.standardError.write(("md-tap: " + s + "\n").data(using: .utf8)!) } }

func macosWord() -> String {
  let v = ProcessInfo.processInfo.operatingSystemVersion
  return "\(v.majorVersion).\(v.minorVersion).\(v.patchVersion)"
}

// MARK: the tap
@available(macOS 13, *)
final class Tap: NSObject, SCStreamDelegate, SCStreamOutput {
  private var stream: SCStream? = nil
  private var converter: AVAudioConverter? = nil
  private var inFormat: AVAudioFormat? = nil
  private let outFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true)!
  private let queue = DispatchQueue(label: "md-tap.audio")
  private(set) var running = false
  private var seq = 0
  private var frames = 0
  private var peak: Int16 = 0
  private var startedAt: Double = 0
  /// Host time to wall clock: the sample buffer's presentation time is on the
  /// host clock; the difference is taken once at start.
  private var hostToWallMs: Double = 0

  func start() async throws -> Double {
    if running { throw NSError(domain: "md-tap", code: 1, userInfo: [NSLocalizedDescriptionKey: "already running"]) }
    let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
    guard let display = content.displays.first else {
      throw NSError(domain: "md-tap", code: 2, userInfo: [NSLocalizedDescriptionKey: "no display"])
    }
    let filter = SCContentFilter(display: display, excludingApplications: [], exceptingWindows: [])
    let cfg = SCStreamConfiguration()
    cfg.capturesAudio = true
    cfg.excludesCurrentProcessAudio = true
    cfg.sampleRate = 48000
    cfg.channelCount = 2
    // The video side is not read: the smallest frame at the slowest rate.
    cfg.width = 2
    cfg.height = 2
    cfg.minimumFrameInterval = CMTime(value: 1, timescale: 1)
    cfg.showsCursor = false
    let s = SCStream(filter: filter, configuration: cfg, delegate: self)
    try s.addStreamOutput(self, type: .audio, sampleHandlerQueue: queue)
    seq = 0; frames = 0; peak = 0
    startedAt = nowMs()
    hostToWallMs = startedAt - CMClockGetTime(CMClockGetHostTimeClock()).seconds * 1000
    try await s.startCapture()
    stream = s
    running = true
    emit(["event": "audio-start", "source": "system", "startedAt": Int(startedAt), "sampleRate": 16000])
    return startedAt
  }

  func stop() async {
    guard running, let s = stream else { return }
    running = false
    try? await s.stopCapture()
    stream = nil
    let (n, total, top) = queue.sync { (seq, frames, peak) }
    emit(["event": "audio-end", "seconds": (Double(total) / 16000 * 1000).rounded() / 1000, "peak": Double(top) / 32767.0, "chunks": n, "source": "system"])
  }

  func stream(_ stream: SCStream, didStopWithError error: Error) {
    running = false
    self.stream = nil
    emit(["event": "error", "error": "capture-failed", "detail": "\(error)", "source": "system"])
  }

  func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
    guard type == .audio, running, sampleBuffer.isValid, CMSampleBufferGetNumSamples(sampleBuffer) > 0 else { return }
    guard let desc = CMSampleBufferGetFormatDescription(sampleBuffer) else { return }
    let fmt = AVAudioFormat(cmAudioFormatDescription: desc)
    if inFormat == nil || inFormat! != fmt {
      inFormat = fmt
      converter = AVAudioConverter(from: fmt, to: outFormat)
      debug("input format \(fmt)")
    }
    guard let conv = converter else { return }
    let n = AVAudioFrameCount(CMSampleBufferGetNumSamples(sampleBuffer))
    guard let inBuf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: n) else { return }
    inBuf.frameLength = n
    // The sample buffer's channels are copied into the AVAudioPCMBuffer's own
    // memory: pointing its buffer list at the block buffer instead leaves its
    // channel data untouched (the first build converted silence that way).
    let channels = Int(fmt.channelCount)
    let ablSize = MemoryLayout<AudioBufferList>.size + max(0, channels - 1) * MemoryLayout<AudioBuffer>.size
    let ablPtr = UnsafeMutableRawPointer.allocate(byteCount: ablSize, alignment: MemoryLayout<AudioBufferList>.alignment).bindMemory(to: AudioBufferList.self, capacity: 1)
    defer { ablPtr.deallocate() }
    var blockBuffer: CMBlockBuffer? = nil
    let status = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(sampleBuffer, bufferListSizeNeededOut: nil, bufferListOut: ablPtr, bufferListSize: ablSize, blockBufferAllocator: nil, blockBufferMemoryAllocator: nil, flags: 0, blockBufferOut: &blockBuffer)
    guard status == noErr else { debug("abl status \(status)"); return }
    let abl = UnsafeMutableAudioBufferListPointer(ablPtr)
    let dst = inBuf.mutableAudioBufferList
    let dstList = UnsafeMutableAudioBufferListPointer(dst)
    for c in 0..<min(abl.count, dstList.count) {
      guard let src = abl[c].mData, let d = dstList[c].mData else { continue }
      memcpy(d, src, Int(min(abl[c].mDataByteSize, dstList[c].mDataByteSize)))
    }
    if DEBUG, seq % 50 == 0 {
      var top: Float = 0
      if let ch = inBuf.floatChannelData { for c in 0..<channels { for i in 0..<Int(n) { top = max(top, abs(ch[c][i])) } } }
      debug("in frames \(n) ch \(channels) interleaved \(fmt.isInterleaved) max \(top) abl buffers \(abl.count) bytes \(abl[0].mDataByteSize)")
    }
    let cap = AVAudioFrameCount(Double(n) * outFormat.sampleRate / fmt.sampleRate) + 64
    guard let out = AVAudioPCMBuffer(pcmFormat: outFormat, frameCapacity: cap) else { return }
    var handed = false
    var err: NSError? = nil
    conv.convert(to: out, error: &err) { _, st in
      if handed { st.pointee = .noDataNow; return nil }
      handed = true; st.pointee = .haveData; return inBuf
    }
    if let err { debug("convert error \(err)"); return }
    guard out.frameLength > 0, let p = out.int16ChannelData?[0] else { return }
    let count = Int(out.frameLength)
    for v in UnsafeBufferPointer(start: p, count: count) { let a = v == Int16.min ? Int16.max : abs(v); if a > peak { peak = a } }
    let data = Data(buffer: UnsafeBufferPointer(start: p, count: count))
    seq += 1
    frames += count
    let pts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    let ts = pts.isValid ? pts.seconds * 1000 + hostToWallMs : nowMs() - Double(count) / 16.0
    emit(["event": "chunk", "pcm16": data.base64EncodedString(), "sampleRate": 16000, "seq": seq, "source": "system", "ts": Int(ts)])
  }
}

// MARK: permissions
func screenGranted() -> Bool { CGPreflightScreenCaptureAccess() }
func openScreenSettings() -> Bool {
  guard let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") else { return false }
  return NSWorkspace.shared.open(url)
}

// MARK: requests
@available(macOS 13, *)
let tap = Tap()

@available(macOS 13, *)
func handle(_ req: [String: Any]) async {
  let id: Any = req["id"] ?? NSNull()
  let op = (req["op"] as? String) ?? ""
  switch op {
  case "ping":
    emit(["id": id, "ok": true, "helper": "md-tap", "version": VERSION, "macos": macosWord()])
  case "permissions":
    emit(["id": id, "screen": screenGranted()])
  case "requestPermission":
    // Asks once when never asked; the answer comes after the app is reopened.
    let now = CGRequestScreenCaptureAccess()
    emit(["id": id, "screen": now || screenGranted()])
  case "openSettings":
    emit(["id": id, "ok": openScreenSettings()])
  case "start":
    guard screenGranted() else { fail(id, "screen-denied", ["hint": "grant Screen Recording (System Settings, Privacy and Security) and reopen the app"]); return }
    do {
      let at = try await tap.start()
      emit(["id": id, "ok": true, "startedAt": Int(at), "sampleRate": 16000])
    } catch {
      fail(id, "capture-failed", ["detail": "\(error)"])
    }
  case "stop":
    await tap.stop()
    emit(["id": id, "ok": true])
  case "shutdown":
    await tap.stop()
    emit(["id": id, "ok": true])
    exit(0)
  default:
    fail(id, "unknown-op", ["op": op])
  }
}

guard #available(macOS 13, *) else {
  emit(["error": "unsupported-macos", "detail": "md-tap needs macOS 13 or later"])
  exit(3)
}

emit(["ready": true, "helper": "md-tap", "version": VERSION, "macos": macosWord()])
let (lines, feed) = AsyncStream<[String: Any]>.makeStream()
Thread {
  while let line = readLine(strippingNewline: true) {
    let t = line.trimmingCharacters(in: .whitespaces)
    if t.isEmpty { continue }
    guard let d = t.data(using: .utf8), let obj = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] else { emit(["error": "bad-json"]); continue }
    feed.yield(obj)
  }
  feed.finish()
}.start()
let done = DispatchSemaphore(value: 0)
Task {
  for await req in lines { await handle(req) }
  await tap.stop()
  done.signal()
}
// A run loop on the main thread, so ScreenCaptureKit's callbacks and the
// permission prompt have one to land on; the semaphore ends it.
DispatchQueue.global().async { done.wait(); exit(0) }
RunLoop.main.run()
