/* md-hotkey for Windows: the native half of "dictate into any app" (0.5.3,
 * F16, F16-ANY-APP-WIN-LINUX-PLAN.md). The same protocol as the macOS helper
 * (tools/md-hotkey/main.swift has the spec), byte for byte, so the loop in
 * src/main/transcribe/anyApp.ts does not know which platform it is on:
 *
 *   {"id":1,"op":"ping"}            -> {"id":1,"ok":true,"helper":"md-hotkey","version":"0.1.0","platform":"win32","stream":true}
 *   {"id":2,"op":"permissions"}     -> {"id":2,"mic":"authorized|denied","accessibility":true,"postEvent":true}
 *   {"id":3,"op":"requestMic"}      -> opens the microphone privacy page when denied; {"id":3,"mic":"..."}
 *   {"id":4,"op":"requestAccessibility"} / requestPostEvent -> true, Windows has no such grant
 *   {"id":6,"op":"openSettings","pane":"microphone|accessibility"} -> {"id":6,"ok":true}
 *   {"id":7,"op":"arm","key":"Control+Alt+Space","record":true,"stream":true} -> {"id":7,"ok":true,"keyCode":32,"modifiers":6144,...}
 *        then {"event":"keydown"}, {"event":"chunk","pcm16":...,"sampleRate":16000,"seq":n,"source":"mic"} while held,
 *        {"event":"keyup","heldMs":812}, {"event":"audio-end","seconds":0.81,"peak":0.4,"chunks":19,"source":"mic"}
 *        or without stream: {"event":"audio","pcm16":...,"sampleRate":16000,"seconds":0.81,"peak":0.4,"source":"mic"}
 *   {"id":8,"op":"disarm"}, {"id":11,"op":"record","seconds":1,"stream":false}, {"id":9,"op":"inject","text":"..","restoreMs":300,"dryRun":false}, {"id":10,"op":"shutdown"}
 *   {"id":12,"op":"tap","key":"Control+Shift+Space"} -> {"id":12,"ok":true,"key":"Control+Shift+Space","keyCode":32,"modifiers":4608}
 *        then {"event":"tap","key":"Control+Shift+Space","at":<unix ms>} on every press of the chord (a held key gives one)
 *   {"id":13,"op":"untap"} -> {"id":13,"ok":true}. ping answers "tap":true so main can tell this helper from one without the op.
 *
 * The tap slot (Stanley's meeting chord, 23 Sep) is separate from the arm
 * slot: both can be set at once, untap leaves arm alone and disarm leaves
 * tap alone. The same chord in both is refused (register-failed, detail
 * in-use-by-arm or in-use-by-tap). A low level hook sees a chord before any
 * other program's hot key does, so a chord "taken" elsewhere is not a
 * failure here: this helper swallows it. register-failed on Windows means
 * the hook itself could not be installed.
 *
 * How it is done here. The key: a low level keyboard hook (WH_KEYBOARD_LL)
 * on the main thread's message loop; the armed key with its exact modifier
 * set is swallowed so the app in front never sees it, a repeat while down is
 * ignored, and a release is believed after 60 ms (the Mac rule). The mic:
 * WASAPI shared mode with AUTOCONVERTPCM asking the engine for 16 kHz mono
 * int16, so no resampler lives here; a capture thread runs while the key is
 * held and hands 40 ms chunks to the output. The paste: the clipboard is
 * snapshotted (every HGLOBAL format), CF_UNICODETEXT is set, Ctrl+V is sent
 * with SendInput, and the snapshot is put back after restoreMs. Permissions:
 * the microphone consent store in the registry (Windows 10 and later); there
 * is no accessibility grant on Windows. One static binary, no admin, no driver.
 *
 * Modifier numbers in the arm reply are the Carbon ones the Mac helper uses
 * (cmd 256, shift 512, option 2048, control 4096), so a reader sees one set.
 */
#define WIN32_LEAN_AND_MEAN
#define COBJMACROS
#define _CRT_SECURE_NO_WARNINGS
#include <windows.h>
#include <initguid.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <shellapi.h>
#include <io.h>
#include <fcntl.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "mdline.h"

/* The audio GUIDs, defined here: MSVC's C headers only declare them (the
 * definitions are not in any import library), mingw's libuuid has them. */
static const CLSID MD_CLSID_MMDeviceEnumerator = { 0xBCDE0395, 0xE52F, 0x467C, { 0x8E, 0x3D, 0xC4, 0x57, 0x92, 0x91, 0x69, 0x2E } };
static const IID MD_IID_IMMDeviceEnumerator = { 0xA95664D2, 0x9614, 0x4F35, { 0xA7, 0x46, 0xDE, 0x8D, 0xB6, 0x36, 0x17, 0xE6 } };
static const IID MD_IID_IAudioClient = { 0x1CB9AD4C, 0xDBFA, 0x4C32, { 0xB1, 0x78, 0xC2, 0xF5, 0x68, 0xA7, 0x03, 0xB2 } };
static const IID MD_IID_IAudioCaptureClient = { 0xC8ADBD64, 0xE71E, 0x48A0, { 0xA4, 0xDE, 0x18, 0x5C, 0x39, 0x5C, 0xD3, 0x17 } };

#define MD_VERSION "0.1.0"
#define WM_MD_LINE (WM_APP + 1)
#define WM_MD_CHUNK (WM_APP + 2)
#define WM_MD_CAPTURE_ERROR (WM_APP + 3)
/* Timer slots. A thread timer (SetTimer with no window) ignores the id it is
 * given and returns its own, so the id Windows returned is kept per slot and
 * WM_TIMER is matched against that (CI 25 Sep: matching the constants meant
 * inject never answered and a held key never released). */
enum { TIMER_RELEASE, TIMER_RESTORE, TIMER_RECORD, TIMER_SLOTS };
static UINT_PTR timer_id[TIMER_SLOTS];
static void timer_start(int slot, UINT ms) { timer_id[slot] = SetTimer(NULL, timer_id[slot], ms, NULL); }
static void timer_stop(int slot) { if (timer_id[slot]) { KillTimer(NULL, timer_id[slot]); timer_id[slot] = 0; } }
static int timer_is(WPARAM w, int slot) { return timer_id[slot] != 0 && w == timer_id[slot]; }
/* The Carbon numbers the Mac helper reports (windows.h has its own MOD_*). */
#define MDMOD_CMD 256
#define MDMOD_SHIFT 512
#define MDMOD_OPTION 2048
#define MDMOD_CONTROL 4096
#define RATE 16000
#define CHUNK_FRAMES 640 /* 40 ms at 16 kHz */

/* ---- output ------------------------------------------------------------- */
static CRITICAL_SECTION out_lock;
static void emit(const char *line) {
  EnterCriticalSection(&out_lock);
  fputs(line, stdout);
  fputc('\n', stdout);
  fflush(stdout);
  LeaveCriticalSection(&out_lock);
}
static void emitf(const char *fmt, ...) {
  char buf[4096];
  va_list ap; va_start(ap, fmt); vsnprintf(buf, sizeof buf, fmt, ap); va_end(ap);
  emit(buf);
}
static void fail(const char *id, const char *code, const char *detail) {
  char q[1024];
  if (detail) { md_json_quote(q, sizeof q, detail); emitf("{\"id\":%s,\"error\":\"%s\",\"detail\":%s}", id, code, q); }
  else emitf("{\"id\":%s,\"error\":\"%s\"}", id, code);
}
static double now_ms(void) {
  LARGE_INTEGER f, c; QueryPerformanceFrequency(&f); QueryPerformanceCounter(&c);
  return (double)c.QuadPart * 1000.0 / (double)f.QuadPart;
}

/* ---- key names ---------------------------------------------------------- */
typedef struct { int vk; unsigned mods; char name[128]; } KeySpec;

static int vk_for(const char *name) {
  static const struct { const char *n; int vk; } table[] = {
    {"space", VK_SPACE}, {"return", VK_RETURN}, {"enter", VK_RETURN}, {"tab", VK_TAB}, {"backspace", VK_BACK},
    {"delete", VK_DELETE}, {"escape", VK_ESCAPE}, {"esc", VK_ESCAPE}, {"home", VK_HOME}, {"end", VK_END},
    {"pageup", VK_PRIOR}, {"pagedown", VK_NEXT}, {"left", VK_LEFT}, {"right", VK_RIGHT}, {"up", VK_UP}, {"down", VK_DOWN},
    {"=", VK_OEM_PLUS}, {"plus", VK_OEM_PLUS}, {"-", VK_OEM_MINUS}, {"minus", VK_OEM_MINUS}, {",", VK_OEM_COMMA}, {"comma", VK_OEM_COMMA},
    {".", VK_OEM_PERIOD}, {"period", VK_OEM_PERIOD}, {"/", VK_OEM_2}, {"slash", VK_OEM_2}, {";", VK_OEM_1}, {"semicolon", VK_OEM_1},
    {"'", VK_OEM_7}, {"quote", VK_OEM_7}, {"[", VK_OEM_4}, {"]", VK_OEM_6}, {"\\", VK_OEM_5}, {"`", VK_OEM_3}, {"grave", VK_OEM_3},
    /* The capture chord (founder, 23 Sep): Control+Shift+PrintScreen. The low
     * level hook sees VK_SNAPSHOT before the Snipping Tool shortcut does. */
    {"printscreen", VK_SNAPSHOT}, {"print", VK_SNAPSHOT}, {"prtsc", VK_SNAPSHOT},
    {NULL, 0}
  };
  if (strlen(name) == 1) {
    char c = name[0];
    if (c >= 'a' && c <= 'z') return 'A' + (c - 'a');
    if (c >= '0' && c <= '9') return c;
  }
  if ((name[0] == 'f') && name[1] >= '1' && name[1] <= '9') {
    int n = atoi(name + 1);
    if (n >= 1 && n <= 24 && strspn(name + 1, "0123456789") == strlen(name + 1)) return VK_F1 + (n - 1);
  }
  for (int i = 0; table[i].n; i++) if (strcmp(table[i].n, name) == 0) return table[i].vk;
  return 0;
}

static void lower(char *s) { for (; *s; s++) if (*s >= 'A' && *s <= 'Z') *s = (char)(*s - 'A' + 'a'); }

/* "Control+Alt+Space" -> a virtual key plus a modifier set. A key with no
 * modifier is accepted only for F keys, so a bare letter is never taken
 * away from every app. */
static int parse_key(const char *s, KeySpec *out) {
  char buf[128]; strncpy(buf, s, sizeof buf - 1); buf[sizeof buf - 1] = 0;
  unsigned mods = 0; int vk = 0; int is_f = 0;
  char *save = NULL; char *tok = strtok_s(buf, "+", &save);
  char parts[8][32]; int n = 0;
  while (tok && n < 8) {
    while (*tok == ' ') tok++;
    size_t l = strlen(tok); while (l && tok[l - 1] == ' ') tok[--l] = 0;
    strncpy(parts[n], tok, 31); parts[n][31] = 0; n++;
    tok = strtok_s(NULL, "+", &save);
  }
  if (n == 0 || !parts[n - 1][0]) return 0;
  for (int i = 0; i < n - 1; i++) {
    char m[32]; strcpy(m, parts[i]); lower(m);
    if (!strcmp(m, "command") || !strcmp(m, "cmd") || !strcmp(m, "super") || !strcmp(m, "meta") || !strcmp(m, "win")) mods |= MDMOD_CMD;
    else if (!strcmp(m, "control") || !strcmp(m, "ctrl")) mods |= MDMOD_CONTROL;
    else if (!strcmp(m, "alt") || !strcmp(m, "option") || !strcmp(m, "opt")) mods |= MDMOD_OPTION;
    else if (!strcmp(m, "shift")) mods |= MDMOD_SHIFT;
    else return 0;
  }
  char last[32]; strcpy(last, parts[n - 1]); lower(last);
  vk = vk_for(last);
  if (!vk) return 0;
  is_f = last[0] == 'f' && last[1] >= '1' && last[1] <= '9' && strspn(last + 1, "0123456789") == strlen(last + 1);
  if (mods == 0 && !is_f) return 0;
  out->vk = vk; out->mods = mods; snprintf(out->name, sizeof out->name, "%s", s);
  return 1;
}

/* ---- the microphone (WASAPI) ------------------------------------------- */
typedef struct {
  IMMDeviceEnumerator *enumerator;
  IMMDevice *device;
  IAudioClient *client;
  IAudioCaptureClient *capture;
  HANDLE event;
  HANDLE thread;
  HANDLE stop;
  volatile LONG capturing;
  int streaming;
  int seq;
  long frames;
  short peak;
  /* file mode accumulates here (grows), streaming sends 40 ms chunks */
  short *out; size_t out_len, out_cap;
  short chunk[CHUNK_FRAMES]; size_t chunk_len;
  CRITICAL_SECTION lock;
  DWORD main_thread;
} Recorder;
static Recorder rec;

typedef struct { int seq; double ts; size_t frames; short pcm[CHUNK_FRAMES]; } ChunkMsg;
/* Epoch ms of the capture's first sample (Stanley's optional fields, 23 Sep:
 * audio-start carries startedAt, a chunk carries ts of its first sample, so
 * the You/Them merge lines two captures up on the clock). */
static double started_at = 0;
static double epoch_ms(void) {
  FILETIME ft; GetSystemTimeAsFileTime(&ft);
  ULARGE_INTEGER u; u.LowPart = ft.dwLowDateTime; u.HighPart = ft.dwHighDateTime;
  return (double)(u.QuadPart / 10000ULL) - 11644473600000.0;
}

static void rec_teardown(void) {
  if (rec.capture) { IAudioCaptureClient_Release(rec.capture); rec.capture = NULL; }
  if (rec.client) { IAudioClient_Release(rec.client); rec.client = NULL; }
  if (rec.device) { IMMDevice_Release(rec.device); rec.device = NULL; }
  if (rec.enumerator) { IMMDeviceEnumerator_Release(rec.enumerator); rec.enumerator = NULL; }
  if (rec.event) { CloseHandle(rec.event); rec.event = NULL; }
}

/* Open the default capture endpoint at 16 kHz mono int16, converted by the
 * engine. Done at arm time so a press only has to Start. Returns an error
 * word or NULL. */
static const char *rec_prewarm(void) {
  if (rec.client) return NULL;
  HRESULT hr = CoCreateInstance(&MD_CLSID_MMDeviceEnumerator, NULL, CLSCTX_ALL, &MD_IID_IMMDeviceEnumerator, (void **)&rec.enumerator);
  if (FAILED(hr)) return "no audio service";
  hr = IMMDeviceEnumerator_GetDefaultAudioEndpoint(rec.enumerator, eCapture, eConsole, &rec.device);
  if (FAILED(hr)) { rec_teardown(); return "no input device"; }
  hr = IMMDevice_Activate(rec.device, &MD_IID_IAudioClient, CLSCTX_ALL, NULL, (void **)&rec.client);
  if (FAILED(hr)) { rec_teardown(); return "cannot activate the input device"; }
  WAVEFORMATEX fmt; memset(&fmt, 0, sizeof fmt);
  fmt.wFormatTag = WAVE_FORMAT_PCM; fmt.nChannels = 1; fmt.nSamplesPerSec = RATE; fmt.wBitsPerSample = 16;
  fmt.nBlockAlign = 2; fmt.nAvgBytesPerSec = RATE * 2;
  DWORD flags = AUDCLNT_STREAMFLAGS_EVENTCALLBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM | AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY;
  hr = IAudioClient_Initialize(rec.client, AUDCLNT_SHAREMODE_SHARED, flags, 2000000 /* 200 ms */, 0, &fmt, NULL);
  if (FAILED(hr)) { rec_teardown(); return hr == AUDCLNT_E_DEVICE_IN_USE ? "input device in use" : "the input cannot give 16 kHz mono"; }
  rec.event = CreateEventW(NULL, FALSE, FALSE, NULL);
  hr = IAudioClient_SetEventHandle(rec.client, rec.event);
  if (FAILED(hr)) { rec_teardown(); return "cannot set the audio event"; }
  hr = IAudioClient_GetService(rec.client, &MD_IID_IAudioCaptureClient, (void **)&rec.capture);
  if (FAILED(hr)) { rec_teardown(); return "no capture client"; }
  return NULL;
}

static void rec_push(const short *pcm, size_t frames) {
  for (size_t i = 0; i < frames; i++) { short v = pcm[i]; short a = v == -32768 ? 32767 : (short)(v < 0 ? -v : v); if (a > rec.peak) rec.peak = a; }
  rec.frames += (long)frames;
  if (!rec.streaming) {
    if (rec.out_len + frames > rec.out_cap) {
      size_t ncap = rec.out_cap ? rec.out_cap * 2 : RATE * 4;
      while (ncap < rec.out_len + frames) ncap *= 2;
      short *n = (short *)realloc(rec.out, ncap * sizeof(short));
      if (!n) return;
      rec.out = n; rec.out_cap = ncap;
    }
    memcpy(rec.out + rec.out_len, pcm, frames * sizeof(short));
    rec.out_len += frames;
    return;
  }
  size_t i = 0;
  while (i < frames) {
    size_t take = CHUNK_FRAMES - rec.chunk_len; if (take > frames - i) take = frames - i;
    memcpy(rec.chunk + rec.chunk_len, pcm + i, take * sizeof(short));
    rec.chunk_len += take; i += take;
    if (rec.chunk_len == CHUNK_FRAMES) {
      ChunkMsg *m = (ChunkMsg *)malloc(sizeof *m);
      if (m) {
        m->seq = ++rec.seq; m->frames = CHUNK_FRAMES;
        m->ts = started_at + (double)(rec.frames - (long)CHUNK_FRAMES) * 1000.0 / RATE;
        memcpy(m->pcm, rec.chunk, sizeof rec.chunk);
        PostThreadMessageW(rec.main_thread, WM_MD_CHUNK, 0, (LPARAM)m);
      }
      rec.chunk_len = 0;
    }
  }
}

static DWORD WINAPI rec_thread(LPVOID arg) {
  (void)arg;
  CoInitializeEx(NULL, COINIT_MULTITHREADED);
  HANDLE waits[2] = { rec.stop, rec.event };
  for (;;) {
    DWORD w = WaitForMultipleObjects(2, waits, FALSE, 500);
    if (w == WAIT_OBJECT_0) break;
    if (w == WAIT_TIMEOUT) continue;
    UINT32 packet = 0;
    while (SUCCEEDED(IAudioCaptureClient_GetNextPacketSize(rec.capture, &packet)) && packet > 0) {
      BYTE *data = NULL; UINT32 frames = 0; DWORD flags = 0;
      if (FAILED(IAudioCaptureClient_GetBuffer(rec.capture, &data, &frames, &flags, NULL, NULL))) break;
      if (frames > 0) {
        EnterCriticalSection(&rec.lock);
        if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
          short zeros[1024]; memset(zeros, 0, sizeof zeros);
          UINT32 left = frames; while (left) { UINT32 n = left > 1024 ? 1024 : left; rec_push(zeros, n); left -= n; }
        } else {
          rec_push((const short *)data, frames);
        }
        LeaveCriticalSection(&rec.lock);
      }
      IAudioCaptureClient_ReleaseBuffer(rec.capture, frames);
    }
  }
  CoUninitialize();
  return 0;
}

static int rec_start(int streaming, const char **why) {
  *why = NULL;
  const char *e = rec_prewarm();
  if (e) { *why = e; return 0; }
  EnterCriticalSection(&rec.lock);
  rec.streaming = streaming; rec.seq = 0; rec.frames = 0; rec.peak = 0; rec.out_len = 0; rec.chunk_len = 0;
  LeaveCriticalSection(&rec.lock);
  if (!rec.stop) rec.stop = CreateEventW(NULL, TRUE, FALSE, NULL);
  ResetEvent(rec.stop);
  HRESULT hr = IAudioClient_Start(rec.client);
  if (FAILED(hr)) { *why = "the input did not start"; return 0; }
  rec.thread = CreateThread(NULL, 0, rec_thread, NULL, 0, NULL);
  if (!rec.thread) { IAudioClient_Stop(rec.client); *why = "no capture thread"; return 0; }
  InterlockedExchange(&rec.capturing, 1);
  started_at = epoch_ms();
  emitf("{\"event\":\"audio-start\",\"source\":\"mic\",\"startedAt\":%.0f,\"sampleRate\":%d}", started_at, RATE);
  return 1;
}

/* Stop the capture and emit: audio-end after the last chunk (streamed), or
 * the whole clip (file mode). Runs on the main thread; the chunk messages
 * already posted are drained first so the order holds. */
static void drain_chunks(void);
static void rec_stop_and_emit(void) {
  if (!InterlockedExchange(&rec.capturing, 0)) return;
  SetEvent(rec.stop);
  if (rec.thread) { WaitForSingleObject(rec.thread, 2000); CloseHandle(rec.thread); rec.thread = NULL; }
  if (rec.client) IAudioClient_Stop(rec.client);
  drain_chunks();
  EnterCriticalSection(&rec.lock);
  double level = (double)rec.peak / 32767.0;
  if (rec.streaming) {
    double seconds = ((double)rec.frames / RATE * 1000.0 + 0.5); seconds = (double)((long)seconds) / 1000.0;
    int n = rec.seq; rec.streaming = 0;
    LeaveCriticalSection(&rec.lock);
    emitf("{\"event\":\"audio-end\",\"seconds\":%.3f,\"peak\":%.4f,\"chunks\":%d,\"source\":\"mic\"}", seconds, level, n);
    return;
  }
  size_t frames = rec.out_len; short *pcm = rec.out; rec.out = NULL; rec.out_len = 0; rec.out_cap = 0;
  LeaveCriticalSection(&rec.lock);
  double seconds = (double)frames / RATE; seconds = (double)((long)(seconds * 1000.0 + 0.5)) / 1000.0;
  size_t bytes = frames * 2;
  char *b64 = (char *)malloc(bytes / 3 * 4 + 8);
  char *line = b64 ? (char *)malloc(bytes / 3 * 4 + 160) : NULL;
  if (b64 && line) {
    md_base64((const unsigned char *)pcm, bytes, b64);
    snprintf(line, bytes / 3 * 4 + 160, "{\"event\":\"audio\",\"pcm16\":\"%s\",\"sampleRate\":%d,\"seconds\":%.3f,\"peak\":%.4f,\"source\":\"mic\"}", b64, RATE, seconds, level);
    emit(line);
  }
  free(b64); free(line); free(pcm);
}

static void emit_chunk(ChunkMsg *m) {
  static char b64[CHUNK_FRAMES * 2 / 3 * 4 + 16];
  static char line[sizeof b64 + 128];
  md_base64((const unsigned char *)m->pcm, m->frames * 2, b64);
  snprintf(line, sizeof line, "{\"event\":\"chunk\",\"pcm16\":\"%s\",\"sampleRate\":%d,\"seq\":%d,\"ts\":%.0f,\"source\":\"mic\"}", b64, RATE, m->seq, m->ts);
  emit(line);
  free(m);
}
static void drain_chunks(void) {
  MSG msg;
  while (PeekMessageW(&msg, NULL, WM_MD_CHUNK, WM_MD_CHUNK, PM_REMOVE)) emit_chunk((ChunkMsg *)msg.lParam);
}

/* ---- the key (WH_KEYBOARD_LL) ------------------------------------------ */
static HHOOK hook = NULL;
static KeySpec armed; static int is_armed = 0;
static int record_on_hold = 0, stream_on_hold = 0;
static int is_down = 0; static double pressed_at = 0;
/* The tap slot: one event per press of the chord, the release only clears
 * the latch so a held key cannot repeat. */
static KeySpec tapped; static int is_tapped = 0; static int tap_down = 0;

static int same_chord(const KeySpec *a, const KeySpec *b) { return a->vk == b->vk && a->mods == b->mods; }

static unsigned mods_now(void) {
  unsigned m = 0;
  if (GetAsyncKeyState(VK_CONTROL) & 0x8000) m |= MDMOD_CONTROL;
  if (GetAsyncKeyState(VK_MENU) & 0x8000) m |= MDMOD_OPTION;
  if (GetAsyncKeyState(VK_SHIFT) & 0x8000) m |= MDMOD_SHIFT;
  if ((GetAsyncKeyState(VK_LWIN) & 0x8000) || (GetAsyncKeyState(VK_RWIN) & 0x8000)) m |= MDMOD_CMD;
  return m;
}

static void on_key_down(void) {
  if (is_down) { timer_stop(TIMER_RELEASE); return; }
  is_down = 1; pressed_at = now_ms();
  emit("{\"event\":\"keydown\"}");
  if (record_on_hold) {
    const char *why = NULL;
    if (!rec_start(stream_on_hold, &why)) {
      char q[256]; md_json_quote(q, sizeof q, why ? why : "");
      emitf("{\"event\":\"error\",\"error\":\"capture-failed\",\"detail\":%s,\"source\":\"mic\"}", q);
    }
  }
}
static void on_key_released_for_real(void) {
  if (!is_down) return;
  is_down = 0;
  emitf("{\"event\":\"keyup\",\"heldMs\":%d}", (int)(now_ms() - pressed_at));
  if (record_on_hold) rec_stop_and_emit();
}

static void on_tap(void) {
  char q[160]; md_json_quote(q, sizeof q, tapped.name);
  emitf("{\"event\":\"tap\",\"key\":%s,\"at\":%.0f}", q, epoch_ms());
}

static LRESULT CALLBACK hook_proc(int code, WPARAM wp, LPARAM lp) {
  if (code == HC_ACTION) {
    const KBDLLHOOKSTRUCT *k = (const KBDLLHOOKSTRUCT *)lp;
    int down = (wp == WM_KEYDOWN || wp == WM_SYSKEYDOWN), up = (wp == WM_KEYUP || wp == WM_SYSKEYUP);
    if (is_armed && (int)k->vkCode == armed.vk) {
      if (down) {
        if (is_down || mods_now() == armed.mods) { on_key_down(); return 1; }
      } else if (up) {
        if (is_down) {
          /* A repeat can look like an up and a down a few ms apart; believe the release after 60 ms. */
          timer_start(TIMER_RELEASE, 60);
          return 1;
        }
      }
    }
    if (is_tapped && (int)k->vkCode == tapped.vk) {
      if (down) {
        if (tap_down) return 1;                       /* the key repeating while held: one tap, not many */
        if (mods_now() == tapped.mods) { tap_down = 1; on_tap(); return 1; }
      } else if (up) {
        if (tap_down) { tap_down = 0; return 1; }
      }
    }
  }
  return CallNextHookEx(hook, code, wp, lp);
}

static int ensure_hook(void) {
  if (!hook) hook = SetWindowsHookExW(WH_KEYBOARD_LL, hook_proc, GetModuleHandleW(NULL), 0);
  return hook != NULL;
}
static int arm(const KeySpec *spec) {
  if (!ensure_hook()) return 0;
  armed = *spec; is_armed = 1; is_down = 0;
  return 1;
}
static int tap(const KeySpec *spec) {
  if (!ensure_hook()) return 0;
  tapped = *spec; is_tapped = 1; tap_down = 0;
  return 1;
}
static void untap(void) { is_tapped = 0; tap_down = 0; }
static void disarm(void) {
  is_armed = 0; is_down = 0;
  timer_stop(TIMER_RELEASE);
  if (InterlockedCompareExchange(&rec.capturing, 0, 0)) { SetEvent(rec.stop); if (rec.thread) { WaitForSingleObject(rec.thread, 2000); CloseHandle(rec.thread); rec.thread = NULL; } if (rec.client) IAudioClient_Stop(rec.client); InterlockedExchange(&rec.capturing, 0); drain_chunks(); }
  rec_teardown();
}

/* ---- permissions --------------------------------------------------------- */
static const char *consent(const wchar_t *sub) {
  HKEY k; wchar_t val[32]; DWORD n = sizeof val; DWORD type = 0;
  if (RegOpenKeyExW(HKEY_CURRENT_USER, sub, 0, KEY_READ, &k) != ERROR_SUCCESS) return NULL;
  LONG r = RegQueryValueExW(k, L"Value", NULL, &type, (BYTE *)val, &n);
  RegCloseKey(k);
  if (r != ERROR_SUCCESS || type != REG_SZ) return NULL;
  return _wcsicmp(val, L"Deny") == 0 ? "denied" : "authorized";
}
static const char *mic_word(void) {
  const char *global = consent(L"Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone");
  const char *desktop = consent(L"Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone\\NonPackaged");
  if ((global && !strcmp(global, "denied")) || (desktop && !strcmp(desktop, "denied"))) return "denied";
  return "authorized";
}
static int open_settings(const char *pane) {
  const wchar_t *uri = !strcmp(pane, "microphone") ? L"ms-settings:privacy-microphone" : L"ms-settings:privacy";
  return (INT_PTR)ShellExecuteW(NULL, L"open", uri, NULL, NULL, SW_SHOWNORMAL) > 32;
}

/* ---- injection: clipboard snapshot, CF_UNICODETEXT, Ctrl+V, restore ------ */
typedef struct { UINT fmt; size_t size; void *data; } Saved;
static Saved saved[64]; static int saved_n = 0; static int saved_valid = 0;
static char restore_id[128]; static int restore_posted = 0, restore_dry = 0;

static void saved_free(void) { for (int i = 0; i < saved_n; i++) free(saved[i].data); saved_n = 0; saved_valid = 0; }
static void snapshot_clipboard(void) {
  saved_free();
  if (!OpenClipboard(NULL)) return;
  UINT f = 0;
  while ((f = EnumClipboardFormats(f)) != 0 && saved_n < 64) {
    /* Formats without an HGLOBAL behind them cannot be copied this way. */
    if (f == CF_BITMAP || f == CF_ENHMETAFILE || f == CF_METAFILEPICT || f == CF_DSPBITMAP || f == CF_DSPENHMETAFILE || f == CF_DSPMETAFILEPICT || f == CF_OWNERDISPLAY || f == CF_PALETTE) continue;
    HANDLE h = GetClipboardData(f);
    if (!h) continue;
    SIZE_T sz = GlobalSize(h);
    void *p = GlobalLock(h);
    if (!p || sz == 0) { if (p) GlobalUnlock(h); continue; }
    void *copy = malloc(sz);
    if (copy) { memcpy(copy, p, sz); saved[saved_n].fmt = f; saved[saved_n].size = sz; saved[saved_n].data = copy; saved_n++; }
    GlobalUnlock(h);
  }
  CloseClipboard();
  saved_valid = 1;
}
static void restore_clipboard(void) {
  if (!saved_valid) return;
  if (OpenClipboard(NULL)) {
    EmptyClipboard();
    for (int i = 0; i < saved_n; i++) {
      HGLOBAL h = GlobalAlloc(GMEM_MOVEABLE, saved[i].size);
      if (!h) continue;
      void *p = GlobalLock(h); memcpy(p, saved[i].data, saved[i].size); GlobalUnlock(h);
      if (!SetClipboardData(saved[i].fmt, h)) GlobalFree(h);
    }
    CloseClipboard();
  }
  saved_free();
}
static int set_clipboard_text(const char *utf8) {
  int n = MultiByteToWideChar(CP_UTF8, 0, utf8, -1, NULL, 0);
  if (n <= 0) return 0;
  HGLOBAL h = GlobalAlloc(GMEM_MOVEABLE, (SIZE_T)n * sizeof(wchar_t));
  if (!h) return 0;
  wchar_t *w = (wchar_t *)GlobalLock(h); MultiByteToWideChar(CP_UTF8, 0, utf8, -1, w, n); GlobalUnlock(h);
  if (!OpenClipboard(NULL)) { GlobalFree(h); return 0; }
  EmptyClipboard();
  int ok = SetClipboardData(CF_UNICODETEXT, h) != NULL;
  if (!ok) GlobalFree(h);
  CloseClipboard();
  return ok;
}
static int post_ctrl_v(void) {
  INPUT in[4]; memset(in, 0, sizeof in);
  in[0].type = INPUT_KEYBOARD; in[0].ki.wVk = VK_CONTROL;
  in[1].type = INPUT_KEYBOARD; in[1].ki.wVk = 'V';
  in[2].type = INPUT_KEYBOARD; in[2].ki.wVk = 'V'; in[2].ki.dwFlags = KEYEVENTF_KEYUP;
  in[3].type = INPUT_KEYBOARD; in[3].ki.wVk = VK_CONTROL; in[3].ki.dwFlags = KEYEVENTF_KEYUP;
  return SendInput(4, in, sizeof(INPUT)) == 4;
}
static void inject(const char *id, const char *text, int restore_ms, int dry) {
  snapshot_clipboard();
  if (!set_clipboard_text(text)) { restore_clipboard(); fail(id, "inject-failed", "the clipboard could not be written"); return; }
  int posted = 0;
  if (!dry) {
    posted = post_ctrl_v();
    if (!posted) { restore_clipboard(); fail(id, "post-event-denied", "SendInput was refused (an elevated app in front cannot receive it)"); return; }
  }
  strncpy(restore_id, id, sizeof restore_id - 1); restore_id[sizeof restore_id - 1] = 0;
  restore_posted = posted; restore_dry = dry;
  timer_start(TIMER_RESTORE, (UINT)(restore_ms < 50 ? 50 : restore_ms));
}

/* ---- requests ------------------------------------------------------------ */
static char record_id[128]; static int recording_op = 0;

static void handle(const char *line) {
  char id[128]; md_json_id(line, id, sizeof id);
  char op[64]; if (!md_json_string(line, "op", op, sizeof op)) { fail(id, "bad-request", "op missing"); return; }
  if (!strcmp(op, "ping")) {
    emitf("{\"id\":%s,\"ok\":true,\"helper\":\"md-hotkey\",\"version\":\"%s\",\"platform\":\"win32\",\"stream\":true,\"tap\":true}", id, MD_VERSION);
  } else if (!strcmp(op, "permissions")) {
    emitf("{\"id\":%s,\"mic\":\"%s\",\"accessibility\":true,\"postEvent\":true}", id, mic_word());
  } else if (!strcmp(op, "requestMic")) {
    if (!strcmp(mic_word(), "denied")) open_settings("microphone");
    emitf("{\"id\":%s,\"mic\":\"%s\"}", id, mic_word());
  } else if (!strcmp(op, "requestAccessibility")) {
    emitf("{\"id\":%s,\"accessibility\":true}", id);
  } else if (!strcmp(op, "requestPostEvent")) {
    emitf("{\"id\":%s,\"postEvent\":true}", id);
  } else if (!strcmp(op, "openSettings")) {
    char pane[32]; if (!md_json_string(line, "pane", pane, sizeof pane)) pane[0] = 0;
    emitf("{\"id\":%s,\"ok\":%s}", id, open_settings(pane) ? "true" : "false");
  } else if (!strcmp(op, "arm")) {
    char key[128]; KeySpec spec;
    if (!md_json_string(line, "key", key, sizeof key) || !parse_key(key, &spec)) {
      char q[160]; md_json_quote(q, sizeof q, key[0] ? key : "");
      emitf("{\"id\":%s,\"error\":\"bad-key\",\"key\":%s}", id, q); return;
    }
    char q[160]; md_json_quote(q, sizeof q, key);
    if (is_tapped && same_chord(&spec, &tapped)) { emitf("{\"id\":%s,\"error\":\"register-failed\",\"status\":0,\"detail\":\"in-use-by-tap\",\"key\":%s}", id, q); return; }
    int rec_b = md_json_bool(line, "record"); record_on_hold = rec_b < 0 ? 1 : rec_b;
    int st = md_json_bool(line, "stream"); stream_on_hold = record_on_hold && st == 1;
    disarm();
    if (!arm(&spec)) { emitf("{\"id\":%s,\"error\":\"register-failed\",\"status\":%lu,\"key\":%s}", id, (unsigned long)GetLastError(), q); return; }
    if (record_on_hold) rec_prewarm(); /* a failure here is reported at the press */
    emitf("{\"id\":%s,\"ok\":true,\"key\":%s,\"keyCode\":%d,\"modifiers\":%u,\"record\":%s,\"stream\":%s}", id, q, spec.vk, spec.mods, record_on_hold ? "true" : "false", stream_on_hold ? "true" : "false");
  } else if (!strcmp(op, "disarm")) {
    disarm(); emitf("{\"id\":%s,\"ok\":true}", id);
  } else if (!strcmp(op, "tap")) {
    char key[128]; KeySpec spec;
    if (!md_json_string(line, "key", key, sizeof key) || !parse_key(key, &spec)) {
      char q[160]; md_json_quote(q, sizeof q, key[0] ? key : "");
      emitf("{\"id\":%s,\"error\":\"bad-key\",\"key\":%s}", id, q); return;
    }
    char q[160]; md_json_quote(q, sizeof q, key);
    if (is_armed && same_chord(&spec, &armed)) { emitf("{\"id\":%s,\"error\":\"register-failed\",\"status\":0,\"detail\":\"in-use-by-arm\",\"key\":%s}", id, q); return; }
    untap();
    if (!tap(&spec)) { emitf("{\"id\":%s,\"error\":\"register-failed\",\"status\":%lu,\"key\":%s}", id, (unsigned long)GetLastError(), q); return; }
    emitf("{\"id\":%s,\"ok\":true,\"key\":%s,\"keyCode\":%d,\"modifiers\":%u}", id, q, spec.vk, spec.mods);
  } else if (!strcmp(op, "untap")) {
    untap(); emitf("{\"id\":%s,\"ok\":true}", id);
  } else if (!strcmp(op, "record")) {
    double seconds = 1.0; md_json_number(line, "seconds", &seconds);
    if (seconds < 0.2) seconds = 0.2;
    if (seconds > 10) seconds = 10;
    if (is_down || InterlockedCompareExchange(&rec.capturing, 0, 0) || recording_op) { fail(id, "busy", "already recording"); return; }
    const char *why = NULL;
    if (!rec_start(md_json_bool(line, "stream") == 1, &why)) { char q[256]; md_json_quote(q, sizeof q, why ? why : ""); emitf("{\"event\":\"error\",\"error\":\"capture-failed\",\"detail\":%s,\"source\":\"mic\"}", q); fail(id, "capture-failed", why); return; }
    recording_op = 1; strncpy(record_id, id, sizeof record_id - 1); record_id[sizeof record_id - 1] = 0;
    timer_start(TIMER_RECORD, (UINT)(seconds * 1000));
  } else if (!strcmp(op, "inject")) {
    static char text[65536];
    if (!md_json_string(line, "text", text, sizeof text)) { fail(id, "bad-request", "text missing"); return; }
    double rm = 300; md_json_number(line, "restoreMs", &rm);
    inject(id, text, (int)rm, md_json_bool(line, "dryRun") == 1);
  } else if (!strcmp(op, "shutdown")) {
    disarm(); untap(); emitf("{\"id\":%s,\"ok\":true}", id); fflush(stdout); ExitProcess(0);
  } else {
    char q[80]; md_json_quote(q, sizeof q, op);
    emitf("{\"id\":%s,\"error\":\"unknown-op\",\"op\":%s}", id, q);
  }
}

/* ---- stdin reader, posts each line to the main thread ------------------- */
static DWORD main_thread_id;
static DWORD WINAPI reader(LPVOID arg) {
  (void)arg;
  static char buf[1 << 20];
  while (fgets(buf, sizeof buf, stdin)) {
    size_t l = strlen(buf); while (l && (buf[l - 1] == '\n' || buf[l - 1] == '\r')) buf[--l] = 0;
    const char *p = buf; while (*p == ' ' || *p == '\t') p++;
    if (!*p) continue;
    char *copy = _strdup(p);
    if (copy) PostThreadMessageW(main_thread_id, WM_MD_LINE, 0, (LPARAM)copy);
  }
  PostThreadMessageW(main_thread_id, WM_QUIT, 0, 0);
  return 0;
}

int main(void) {
  _setmode(_fileno(stdout), _O_BINARY);
  _setmode(_fileno(stdin), _O_BINARY);
  InitializeCriticalSection(&out_lock);
  InitializeCriticalSection(&rec.lock);
  CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
  main_thread_id = GetCurrentThreadId();
  rec.main_thread = main_thread_id;
  /* The message queue must exist before the reader posts to it. */
  MSG msg; PeekMessageW(&msg, NULL, WM_USER, WM_USER, PM_NOREMOVE);
  emitf("{\"ready\":true,\"helper\":\"md-hotkey\",\"version\":\"%s\",\"platform\":\"win32\"}", MD_VERSION);
  CreateThread(NULL, 0, reader, NULL, 0, NULL);
  while (GetMessageW(&msg, NULL, 0, 0) > 0) {
    if (msg.message == WM_MD_LINE) {
      char *line = (char *)msg.lParam; handle(line); free(line);
    } else if (msg.message == WM_MD_CHUNK) {
      emit_chunk((ChunkMsg *)msg.lParam);
    } else if (msg.message == WM_TIMER) {
      if (timer_is(msg.wParam, TIMER_RELEASE)) { timer_stop(TIMER_RELEASE); if (is_down && !(GetAsyncKeyState(armed.vk) & 0x8000)) on_key_released_for_real(); }
      else if (timer_is(msg.wParam, TIMER_RESTORE)) {
        timer_stop(TIMER_RESTORE); restore_clipboard();
        emitf("{\"id\":%s,\"ok\":true,\"posted\":%s,\"restored\":true,\"dryRun\":%s}", restore_id, restore_posted ? "true" : "false", restore_dry ? "true" : "false");
      } else if (timer_is(msg.wParam, TIMER_RECORD)) {
        timer_stop(TIMER_RECORD); rec_stop_and_emit(); recording_op = 0;
        emitf("{\"id\":%s,\"ok\":true}", record_id);
      }
    } else {
      TranslateMessage(&msg); DispatchMessageW(&msg);
    }
  }
  disarm();
  return 0;
}
