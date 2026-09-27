/* md-hotkey for Linux, X11: the native half of "dictate into any app" (0.5.3,
 * F16, F16-ANY-APP-WIN-LINUX-PLAN.md). The macOS helper's protocol byte for
 * byte (tools/md-hotkey/main.swift has the spec; win.c has the same summary),
 * so the loop in src/main/transcribe/anyApp.ts is the same on every platform.
 *
 * How it is done here. The key: XGrabKey on the root window for the key with
 * the exact modifier set, plus the same key with NumLock and CapsLock on, and
 * XkbSetDetectableAutoRepeat so a held key is one press and one release; the
 * release is believed after 60 ms (the Mac rule). The mic: PulseAudio's
 * simple API at 16 kHz mono int16 (PipeWire serves the same socket), read in
 * 40 ms blocks on a thread while the key is held. The paste: this process
 * takes ownership of the CLIPBOARD selection with the text and answers the
 * requests for it, posts Ctrl+V through XTest, and after restoreMs re-owns the
 * selection with the text that was there before (only text can be restored
 * on X11; an image that was on the clipboard is gone after a dictation).
 *
 * The tap slot (Stanley's meeting chord, 23 Sep): {"op":"tap","key":...} grabs
 * a second chord on its own; every press of it is {"event":"tap","key":...,
 * "at":<unix ms>}, one per press however long it is held, the release is
 * nothing. {"op":"untap"} lets it go. Separate from arm: both can be set,
 * untap leaves arm alone and disarm leaves tap alone; the same chord in both
 * is refused (register-failed, detail in-use-by-arm or in-use-by-tap). A
 * chord another client already grabbed is BadAccess: register-failed,
 * status 1. A key this keyboard map has no key code for (F13 to F24 on many
 * X servers) is register-failed, status 2, detail no-keycode. ping answers
 * "tap":true.
 *
 * Wayland: no X11 display and a Wayland session in the environment. The
 * helper starts, says so on its ready line ({"ready":true,...,"unsupported":
 * "wayland"}), answers ping and permissions, and refuses arm, tap, record and
 * inject with "wayland-unsupported". Nothing half shipped: Settings shows the
 * reason, and the switch stays off.
 *
 * One thread talks to X (the main one, on select over the X socket, a command
 * pipe and timers); stdin is read on a second thread that queues lines; the
 * capture thread hands chunks to the output lock. XInitThreads is called for
 * the one XFlush the capture thread never does; everything X is on main.
 */
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <pthread.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/select.h>
#include <sys/time.h>
#include <time.h>
#include <unistd.h>
#include <X11/Xlib.h>
#include <X11/Xatom.h>
#include <X11/XKBlib.h>
#include <X11/keysym.h>
#include <X11/extensions/XTest.h>
#include <pulse/simple.h>
#include <pulse/error.h>
#include "mdline.h"

#define MD_VERSION "0.1.0"
#define MOD_CMD 256
#define MOD_SHIFT 512
#define MOD_OPTION 2048
#define MOD_CONTROL 4096
#define RATE 16000
#define CHUNK_FRAMES 640 /* 40 ms */

/* ---- output ------------------------------------------------------------- */
static pthread_mutex_t out_lock = PTHREAD_MUTEX_INITIALIZER;
static void emit(const char *line) {
  pthread_mutex_lock(&out_lock);
  fputs(line, stdout); fputc('\n', stdout); fflush(stdout);
  pthread_mutex_unlock(&out_lock);
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
static double now_ms(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }

/* ---- X state ------------------------------------------------------------- */
static Display *dpy = NULL;
static Window root, win;
static int wayland = 0;
static Atom A_CLIPBOARD, A_TARGETS, A_UTF8, A_TEXT, A_STRING, A_MD_SEL, A_INCR;

typedef struct { KeySym sym; KeyCode code; unsigned xmods; unsigned mods; char name[128]; } KeySpec;
static KeySpec armed; static int is_armed = 0;
static int record_on_hold = 0, stream_on_hold = 0;
static int is_down = 0; static double pressed_at = 0;
static double release_due = 0; /* ms, 0 = none */
/* The tap slot: one event per press, the release only clears the latch. */
static KeySpec tapped; static int is_tapped = 0; static int tap_down = 0;

static int same_chord(const KeySpec *a, const KeySpec *b) { return a->sym == b->sym && a->xmods == b->xmods; }

/* ---- key names ---------------------------------------------------------- */
static void lower(char *s) { for (; *s; s++) if (*s >= 'A' && *s <= 'Z') *s = (char)(*s - 'A' + 'a'); }
static KeySym sym_for(const char *name) {
  static const struct { const char *n; KeySym s; } table[] = {
    {"space", XK_space}, {"return", XK_Return}, {"enter", XK_Return}, {"tab", XK_Tab}, {"backspace", XK_BackSpace},
    {"delete", XK_Delete}, {"escape", XK_Escape}, {"esc", XK_Escape}, {"home", XK_Home}, {"end", XK_End},
    {"pageup", XK_Page_Up}, {"pagedown", XK_Page_Down}, {"left", XK_Left}, {"right", XK_Right}, {"up", XK_Up}, {"down", XK_Down},
    {"=", XK_equal}, {"plus", XK_equal}, {"-", XK_minus}, {"minus", XK_minus}, {",", XK_comma}, {"comma", XK_comma},
    {".", XK_period}, {"period", XK_period}, {"/", XK_slash}, {"slash", XK_slash}, {";", XK_semicolon}, {"semicolon", XK_semicolon},
    {"'", XK_apostrophe}, {"quote", XK_apostrophe}, {"[", XK_bracketleft}, {"]", XK_bracketright}, {"\\", XK_backslash}, {"`", XK_grave}, {"grave", XK_grave},
    /* The capture chord (founder, 23 Sep): Control+Shift+PrintScreen. */
    {"printscreen", XK_Print}, {"print", XK_Print}, {"prtsc", XK_Print},
    {NULL, 0}
  };
  if (strlen(name) == 1 && ((name[0] >= 'a' && name[0] <= 'z') || (name[0] >= '0' && name[0] <= '9'))) return XStringToKeysym(name);
  if (name[0] == 'f' && name[1] >= '1' && name[1] <= '9' && strspn(name + 1, "0123456789") == strlen(name + 1)) {
    int n = atoi(name + 1); if (n >= 1 && n <= 35) return XK_F1 + (n - 1);
  }
  for (int i = 0; table[i].n; i++) if (!strcmp(table[i].n, name)) return table[i].s;
  return NoSymbol;
}
static int parse_key(const char *s, KeySpec *out) {
  char buf[128]; strncpy(buf, s, sizeof buf - 1); buf[sizeof buf - 1] = 0;
  char parts[8][32]; int n = 0;
  char *save = NULL; char *tok = strtok_r(buf, "+", &save);
  while (tok && n < 8) {
    while (*tok == ' ') tok++;
    size_t l = strlen(tok); while (l && tok[l - 1] == ' ') tok[--l] = 0;
    strncpy(parts[n], tok, 31); parts[n][31] = 0; n++;
    tok = strtok_r(NULL, "+", &save);
  }
  if (n == 0 || !parts[n - 1][0]) return 0;
  unsigned mods = 0, xmods = 0;
  for (int i = 0; i < n - 1; i++) {
    char m[32]; strcpy(m, parts[i]); lower(m);
    if (!strcmp(m, "command") || !strcmp(m, "cmd") || !strcmp(m, "super") || !strcmp(m, "meta") || !strcmp(m, "win")) { mods |= MOD_CMD; xmods |= Mod4Mask; }
    else if (!strcmp(m, "control") || !strcmp(m, "ctrl")) { mods |= MOD_CONTROL; xmods |= ControlMask; }
    else if (!strcmp(m, "alt") || !strcmp(m, "option") || !strcmp(m, "opt")) { mods |= MOD_OPTION; xmods |= Mod1Mask; }
    else if (!strcmp(m, "shift")) { mods |= MOD_SHIFT; xmods |= ShiftMask; }
    else return 0;
  }
  char last[32]; strcpy(last, parts[n - 1]); lower(last);
  KeySym sym = sym_for(last);
  if (sym == NoSymbol) return 0;
  int is_f = last[0] == 'f' && last[1] >= '1' && last[1] <= '9' && strspn(last + 1, "0123456789") == strlen(last + 1);
  if (mods == 0 && !is_f) return 0;
  out->sym = sym; out->mods = mods; out->xmods = xmods; out->code = 0;
  strncpy(out->name, s, sizeof out->name - 1); out->name[sizeof out->name - 1] = 0;
  return 1;
}

/* ---- the microphone (pulse simple) -------------------------------------- */
static pthread_mutex_t rec_lock = PTHREAD_MUTEX_INITIALIZER;
static pa_simple *pa = NULL;
static pthread_t rec_thread_h; static int rec_thread_live = 0;
static volatile int capturing = 0;
static int streaming = 0, seq = 0; static long frames = 0; static short peak = 0;
static short *out_pcm = NULL; static size_t out_len = 0, out_cap = 0;
static char pa_error[256];
/* Epoch ms of the capture's first sample (Stanley's optional fields, 23 Sep:
 * audio-start carries startedAt, a chunk carries ts of its first sample). */
static double started_at = 0;
static double epoch_ms(void) { struct timeval tv; gettimeofday(&tv, NULL); return tv.tv_sec * 1000.0 + tv.tv_usec / 1000.0; }

static int rec_open(void) {
  if (pa) return 1;
  pa_sample_spec ss; ss.format = PA_SAMPLE_S16LE; ss.rate = RATE; ss.channels = 1;
  pa_buffer_attr attr; attr.maxlength = (uint32_t)-1; attr.tlength = (uint32_t)-1; attr.prebuf = (uint32_t)-1; attr.minreq = (uint32_t)-1; attr.fragsize = CHUNK_FRAMES * 2;
  int err = 0;
  pa = pa_simple_new(NULL, "Munder Difflin", PA_STREAM_RECORD, NULL, "dictation", &ss, NULL, &attr, &err);
  if (!pa) { snprintf(pa_error, sizeof pa_error, "%s", pa_strerror(err)); return 0; }
  return 1;
}
static void rec_close(void) { if (pa) { pa_simple_free(pa); pa = NULL; } }

static void push_pcm(const short *pcm, size_t n) {
  pthread_mutex_lock(&rec_lock);
  for (size_t i = 0; i < n; i++) { short v = pcm[i]; short a = v == -32768 ? 32767 : (short)(v < 0 ? -v : v); if (a > peak) peak = a; }
  frames += (long)n;
  if (streaming) {
    int s = ++seq;
    double ts = started_at + (double)(frames - (long)n) * 1000.0 / RATE;
    pthread_mutex_unlock(&rec_lock);
    static char b64[CHUNK_FRAMES * 2 / 3 * 4 + 16];
    static char line[sizeof b64 + 128];
    md_base64((const unsigned char *)pcm, n * 2, b64);
    snprintf(line, sizeof line, "{\"event\":\"chunk\",\"pcm16\":\"%s\",\"sampleRate\":%d,\"seq\":%d,\"ts\":%.0f,\"source\":\"mic\"}", b64, RATE, s, ts);
    emit(line);
    return;
  }
  if (out_len + n > out_cap) {
    size_t ncap = out_cap ? out_cap * 2 : RATE * 4; while (ncap < out_len + n) ncap *= 2;
    short *g = realloc(out_pcm, ncap * sizeof(short));
    if (g) { out_pcm = g; out_cap = ncap; }
  }
  if (out_len + n <= out_cap) { memcpy(out_pcm + out_len, pcm, n * sizeof(short)); out_len += n; }
  pthread_mutex_unlock(&rec_lock);
}
static void *rec_thread(void *arg) {
  (void)arg;
  short buf[CHUNK_FRAMES];
  while (capturing) {
    int err = 0;
    if (pa_simple_read(pa, buf, sizeof buf, &err) < 0) {
      char q[256]; md_json_quote(q, sizeof q, pa_strerror(err));
      emitf("{\"event\":\"error\",\"error\":\"capture-failed\",\"detail\":%s,\"source\":\"mic\"}", q);
      break;
    }
    if (capturing) push_pcm(buf, CHUNK_FRAMES);
  }
  return NULL;
}
static int rec_start(int stream, const char **why) {
  *why = NULL;
  if (!rec_open()) { *why = pa_error; return 0; }
  int err = 0; pa_simple_flush(pa, &err);
  pthread_mutex_lock(&rec_lock);
  streaming = stream; seq = 0; frames = 0; peak = 0; out_len = 0;
  pthread_mutex_unlock(&rec_lock);
  capturing = 1;
  started_at = epoch_ms();
  if (pthread_create(&rec_thread_h, NULL, rec_thread, NULL) != 0) { capturing = 0; *why = "no capture thread"; return 0; }
  rec_thread_live = 1;
  emitf("{\"event\":\"audio-start\",\"source\":\"mic\",\"startedAt\":%.0f,\"sampleRate\":%d}", started_at, RATE);
  return 1;
}
static void rec_stop_and_emit(void) {
  if (!capturing) return;
  capturing = 0;
  if (rec_thread_live) { pthread_join(rec_thread_h, NULL); rec_thread_live = 0; }
  pthread_mutex_lock(&rec_lock);
  double level = (double)peak / 32767.0;
  if (streaming) {
    double seconds = ((double)frames / RATE * 1000.0 + 0.5); seconds = (double)((long)seconds) / 1000.0;
    int n = seq; streaming = 0;
    pthread_mutex_unlock(&rec_lock);
    emitf("{\"event\":\"audio-end\",\"seconds\":%.3f,\"peak\":%.4f,\"chunks\":%d,\"source\":\"mic\"}", seconds, level, n);
    return;
  }
  size_t n = out_len; short *pcm = out_pcm; out_pcm = NULL; out_len = 0; out_cap = 0;
  pthread_mutex_unlock(&rec_lock);
  double seconds = (double)n / RATE; seconds = (double)((long)(seconds * 1000.0 + 0.5)) / 1000.0;
  size_t bytes = n * 2;
  char *b64 = malloc(bytes / 3 * 4 + 8);
  char *line = b64 ? malloc(bytes / 3 * 4 + 160) : NULL;
  if (b64 && line) {
    md_base64((const unsigned char *)pcm, bytes, b64);
    snprintf(line, bytes / 3 * 4 + 160, "{\"event\":\"audio\",\"pcm16\":\"%s\",\"sampleRate\":%d,\"seconds\":%.3f,\"peak\":%.4f,\"source\":\"mic\"}", b64, RATE, seconds, level);
    emit(line);
  }
  free(b64); free(line); free(pcm);
}
static void rec_discard(void) { if (capturing) { capturing = 0; if (rec_thread_live) { pthread_join(rec_thread_h, NULL); rec_thread_live = 0; } } }

/* ---- the key ------------------------------------------------------------- */
static int x_error_seen = 0;
static int on_x_error(Display *d, XErrorEvent *e) { (void)d; (void)e; x_error_seen = 1; return 0; }

static void ungrab_spec(const KeySpec *spec) {
  if (!dpy || !spec->code) return;
  unsigned variants[4] = { 0, LockMask, Mod2Mask, LockMask | Mod2Mask };
  for (int i = 0; i < 4; i++) XUngrabKey(dpy, spec->code, spec->xmods | variants[i], root);
  XFlush(dpy);
}
static void ungrab_all(void) { ungrab_spec(&armed); }
static int grab(KeySpec *spec) {
  spec->code = XKeysymToKeycode(dpy, spec->sym);
  if (!spec->code) return 0;
  x_error_seen = 0;
  unsigned variants[4] = { 0, LockMask, Mod2Mask, LockMask | Mod2Mask };
  for (int i = 0; i < 4; i++) XGrabKey(dpy, spec->code, spec->xmods | variants[i], root, False, GrabModeAsync, GrabModeAsync);
  XSync(dpy, False);
  if (x_error_seen) { for (int i = 0; i < 4; i++) XUngrabKey(dpy, spec->code, spec->xmods | variants[i], root); XFlush(dpy); return 0; }
  return 1;
}
static void disarm(void) {
  if (is_armed) ungrab_all();
  is_armed = 0; is_down = 0; release_due = 0;
  rec_discard();
  rec_close();
}
static void untap(void) {
  if (is_tapped) ungrab_spec(&tapped);
  is_tapped = 0; tap_down = 0;
}
static void on_tap(void) {
  char q[160]; md_json_quote(q, sizeof q, tapped.name);
  emitf("{\"event\":\"tap\",\"key\":%s,\"at\":%.0f}", q, epoch_ms());
}
/* The chord's own modifiers, NumLock and CapsLock not counted. */
static unsigned chord_state(unsigned state) { return state & ~(LockMask | Mod2Mask); }
static void on_key_down(void) {
  release_due = 0;
  if (is_down) return;
  is_down = 1; pressed_at = now_ms();
  emit("{\"event\":\"keydown\"}");
  if (record_on_hold) {
    const char *why = NULL;
    if (!rec_start(stream_on_hold, &why)) { char q[256]; md_json_quote(q, sizeof q, why ? why : ""); emitf("{\"event\":\"error\",\"error\":\"capture-failed\",\"detail\":%s,\"source\":\"mic\"}", q); }
  }
}
static void on_key_released_for_real(void) {
  if (!is_down) return;
  is_down = 0;
  emitf("{\"event\":\"keyup\",\"heldMs\":%d}", (int)(now_ms() - pressed_at));
  if (record_on_hold) rec_stop_and_emit();
}

/* ---- the clipboard, served by this process ------------------------------- */
static char *clip_text = NULL;   /* what we serve now */
static char *prev_text = NULL;   /* what was there before the dictation, or NULL */
static int prev_known = 0;
static double restore_due = 0; static char restore_id[128]; static int restore_posted = 0, restore_dry = 0;

static void serve_selection(XSelectionRequestEvent *r) {
  XEvent reply; memset(&reply, 0, sizeof reply);
  reply.xselection.type = SelectionNotify; reply.xselection.display = r->display; reply.xselection.requestor = r->requestor;
  reply.xselection.selection = r->selection; reply.xselection.target = r->target; reply.xselection.time = r->time;
  reply.xselection.property = None;
  Atom prop = r->property == None ? r->target : r->property;
  if (clip_text) {
    if (r->target == A_TARGETS) {
      Atom targets[4] = { A_TARGETS, A_UTF8, A_STRING, A_TEXT };
      XChangeProperty(dpy, r->requestor, prop, XA_ATOM, 32, PropModeReplace, (unsigned char *)targets, 4);
      reply.xselection.property = prop;
    } else if (r->target == A_UTF8 || r->target == A_STRING || r->target == A_TEXT) {
      Atom type = r->target == A_STRING ? XA_STRING : A_UTF8;
      XChangeProperty(dpy, r->requestor, prop, type, 8, PropModeReplace, (unsigned char *)clip_text, (int)strlen(clip_text));
      reply.xselection.property = prop;
    }
  }
  XSendEvent(dpy, r->requestor, False, 0, &reply);
  XFlush(dpy);
}

/* Read the current CLIPBOARD as UTF-8 text, waiting up to `ms` for the owner. */
static char *read_clipboard_text(int ms) {
  if (XGetSelectionOwner(dpy, A_CLIPBOARD) == None) return NULL;
  XConvertSelection(dpy, A_CLIPBOARD, A_UTF8, A_MD_SEL, win, CurrentTime);
  XFlush(dpy);
  double until = now_ms() + ms;
  while (now_ms() < until) {
    while (XPending(dpy)) {
      XEvent e; XNextEvent(dpy, &e);
      if (e.type == SelectionRequest) { serve_selection(&e.xselectionrequest); continue; }
      if (e.type == SelectionNotify && e.xselection.selection == A_CLIPBOARD) {
        if (e.xselection.property == None) return NULL;
        Atom type; int fmt; unsigned long n, after; unsigned char *data = NULL;
        if (XGetWindowProperty(dpy, win, A_MD_SEL, 0, 1 << 20, True, AnyPropertyType, &type, &fmt, &n, &after, &data) != Success || !data) return NULL;
        if (type == A_INCR) { XFree(data); return NULL; } /* a very large clipboard: not restored */
        char *s = malloc(n + 1); if (s) { memcpy(s, data, n); s[n] = 0; }
        XFree(data);
        return s;
      }
    }
    usleep(2000);
  }
  return NULL;
}
static void own_clipboard(const char *text) {
  free(clip_text); clip_text = text ? strdup(text) : NULL;
  if (clip_text) XSetSelectionOwner(dpy, A_CLIPBOARD, win, CurrentTime);
  else if (XGetSelectionOwner(dpy, A_CLIPBOARD) == win) XSetSelectionOwner(dpy, A_CLIPBOARD, None, CurrentTime);
  XFlush(dpy);
}
static int post_ctrl_v(void) {
  int major, minor, ev, err;
  if (!XTestQueryExtension(dpy, &ev, &err, &major, &minor)) return 0;
  KeyCode ctrl = XKeysymToKeycode(dpy, XK_Control_L), v = XKeysymToKeycode(dpy, XK_v);
  if (!ctrl || !v) return 0;
  XTestFakeKeyEvent(dpy, ctrl, True, 0); XTestFakeKeyEvent(dpy, v, True, 0);
  XTestFakeKeyEvent(dpy, v, False, 0); XTestFakeKeyEvent(dpy, ctrl, False, 0);
  XFlush(dpy);
  return 1;
}
static void inject(const char *id, const char *text, int restore_ms, int dry) {
  if (restore_due) { fail(id, "busy", "a paste is still being restored"); return; }
  free(prev_text); prev_text = read_clipboard_text(150); prev_known = 1;
  own_clipboard(text);
  int posted = 0;
  if (!dry) {
    posted = post_ctrl_v();
    if (!posted) { own_clipboard(prev_text); fail(id, "post-event-denied", "XTest is not available on this display"); return; }
  }
  strncpy(restore_id, id, sizeof restore_id - 1); restore_id[sizeof restore_id - 1] = 0;
  restore_posted = posted; restore_dry = dry;
  restore_due = now_ms() + (restore_ms < 50 ? 50 : restore_ms);
}
static void restore_now(void) {
  restore_due = 0;
  own_clipboard(prev_text);  /* the old text back, or the clipboard cleared when there was none */
  free(prev_text); prev_text = NULL; prev_known = 0;
  emitf("{\"id\":%s,\"ok\":true,\"posted\":%s,\"restored\":true,\"dryRun\":%s}", restore_id, restore_posted ? "true" : "false", restore_dry ? "true" : "false");
}

/* ---- permissions --------------------------------------------------------- */
static const char *mic_word(void) {
  if (pa) return "authorized";
  if (rec_open()) { rec_close(); return "authorized"; }
  return "denied";
}
static int have_xtest(void) { int a, b, c, d; return dpy && XTestQueryExtension(dpy, &a, &b, &c, &d); }

/* ---- requests (main thread) ---------------------------------------------- */
static double record_due = 0; static char record_id[128];

static void handle(const char *line) {
  char id[128]; md_json_id(line, id, sizeof id);
  char op[64]; if (!md_json_string(line, "op", op, sizeof op)) { fail(id, "bad-request", "op missing"); return; }
  if (!strcmp(op, "ping")) {
    emitf("{\"id\":%s,\"ok\":true,\"helper\":\"md-hotkey\",\"version\":\"%s\",\"platform\":\"linux\",\"stream\":true,\"tap\":true%s}", id, MD_VERSION, wayland ? ",\"unsupported\":\"wayland\"" : "");
  } else if (!strcmp(op, "permissions")) {
    emitf("{\"id\":%s,\"mic\":\"%s\",\"accessibility\":%s,\"postEvent\":%s}", id, wayland ? "notDetermined" : mic_word(), have_xtest() ? "true" : "false", have_xtest() ? "true" : "false");
  } else if (!strcmp(op, "requestMic")) {
    emitf("{\"id\":%s,\"mic\":\"%s\"}", id, wayland ? "notDetermined" : mic_word());
  } else if (!strcmp(op, "requestAccessibility")) {
    emitf("{\"id\":%s,\"accessibility\":%s}", id, have_xtest() ? "true" : "false");
  } else if (!strcmp(op, "requestPostEvent")) {
    emitf("{\"id\":%s,\"postEvent\":%s}", id, have_xtest() ? "true" : "false");
  } else if (!strcmp(op, "openSettings")) {
    emitf("{\"id\":%s,\"ok\":false}", id);
  } else if (wayland && (!strcmp(op, "arm") || !strcmp(op, "tap") || !strcmp(op, "record") || !strcmp(op, "inject"))) {
    fail(id, "wayland-unsupported", "any app dictation needs an X11 session on Linux in this release");
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
    if (!grab(&spec)) { emitf("{\"id\":%s,\"error\":\"register-failed\",\"status\":%d,%s\"key\":%s}", id, x_error_seen ? 1 : 2, spec.code ? "" : "\"detail\":\"no-keycode\",", q); return; }
    armed = spec; is_armed = 1;
    if (record_on_hold) rec_open(); /* a failure here is reported at the press */
    emitf("{\"id\":%s,\"ok\":true,\"key\":%s,\"keyCode\":%d,\"modifiers\":%u,\"record\":%s,\"stream\":%s}", id, q, (int)spec.code, spec.mods, record_on_hold ? "true" : "false", stream_on_hold ? "true" : "false");
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
    if (!grab(&spec)) { emitf("{\"id\":%s,\"error\":\"register-failed\",\"status\":%d,%s\"key\":%s}", id, x_error_seen ? 1 : 2, spec.code ? "" : "\"detail\":\"no-keycode\",", q); return; }
    tapped = spec; is_tapped = 1;
    emitf("{\"id\":%s,\"ok\":true,\"key\":%s,\"keyCode\":%d,\"modifiers\":%u}", id, q, (int)spec.code, spec.mods);
  } else if (!strcmp(op, "untap")) {
    untap(); emitf("{\"id\":%s,\"ok\":true}", id);
  } else if (!strcmp(op, "record")) {
    double seconds = 1.0; md_json_number(line, "seconds", &seconds);
    if (seconds < 0.2) seconds = 0.2;
    if (seconds > 10) seconds = 10;
    if (is_down || capturing || record_due) { fail(id, "busy", "already recording"); return; }
    const char *why = NULL;
    if (!rec_start(md_json_bool(line, "stream") == 1, &why)) { char q[256]; md_json_quote(q, sizeof q, why ? why : ""); emitf("{\"event\":\"error\",\"error\":\"capture-failed\",\"detail\":%s,\"source\":\"mic\"}", q); fail(id, "capture-failed", why); return; }
    strncpy(record_id, id, sizeof record_id - 1); record_id[sizeof record_id - 1] = 0;
    record_due = now_ms() + seconds * 1000.0;
  } else if (!strcmp(op, "inject")) {
    static char text[65536];
    if (!md_json_string(line, "text", text, sizeof text)) { fail(id, "bad-request", "text missing"); return; }
    double rm = 300; md_json_number(line, "restoreMs", &rm);
    inject(id, text, (int)rm, md_json_bool(line, "dryRun") == 1);
  } else if (!strcmp(op, "shutdown")) {
    disarm(); untap(); emitf("{\"id\":%s,\"ok\":true}", id); fflush(stdout); _exit(0);
  } else {
    char q[80]; md_json_quote(q, sizeof q, op);
    emitf("{\"id\":%s,\"error\":\"unknown-op\",\"op\":%s}", id, q);
  }
}

/* ---- stdin reader -> a pipe the main loop selects on -------------------- */
static int cmd_pipe[2];
static void *reader(void *arg) {
  (void)arg;
  static char buf[1 << 20];
  while (fgets(buf, sizeof buf, stdin)) {
    size_t l = strlen(buf); while (l && (buf[l - 1] == '\n' || buf[l - 1] == '\r')) buf[--l] = 0;
    const char *p = buf; while (*p == ' ' || *p == '\t') p++;
    if (!*p) continue;
    char *copy = strdup(p);
    if (copy && write(cmd_pipe[1], &copy, sizeof copy) != (ssize_t)sizeof copy) free(copy);
  }
  char *eof = NULL; if (write(cmd_pipe[1], &eof, sizeof eof) < 0) { /* the loop sees the closed pipe */ }
  close(cmd_pipe[1]);
  return NULL;
}

int main(void) {
  setvbuf(stdout, NULL, _IOLBF, 0);
  XInitThreads();
  XSetErrorHandler(on_x_error);
  const char *session = getenv("XDG_SESSION_TYPE");
  /* A Wayland session is refused even when XWayland offers a DISPLAY: a grab
   * on that display never sees a key pressed in a native Wayland window. No
   * display at all is the same answer, nothing to grab and nothing to paste into. */
  if ((session && !strcmp(session, "wayland")) || (getenv("WAYLAND_DISPLAY") && !getenv("DISPLAY"))) wayland = 1;
  if (!wayland) dpy = XOpenDisplay(NULL);
  if (!dpy) wayland = 1;
  if (dpy) {
    root = DefaultRootWindow(dpy);
    win = XCreateSimpleWindow(dpy, root, 0, 0, 1, 1, 0, 0, 0);
    A_CLIPBOARD = XInternAtom(dpy, "CLIPBOARD", False); A_TARGETS = XInternAtom(dpy, "TARGETS", False);
    A_UTF8 = XInternAtom(dpy, "UTF8_STRING", False); A_TEXT = XInternAtom(dpy, "TEXT", False);
    A_STRING = XA_STRING; A_MD_SEL = XInternAtom(dpy, "MD_HOTKEY_SEL", False); A_INCR = XInternAtom(dpy, "INCR", False);
    Bool supported = False; XkbSetDetectableAutoRepeat(dpy, True, &supported);
  }
  if (pipe(cmd_pipe) != 0) return 1;
  emitf("{\"ready\":true,\"helper\":\"md-hotkey\",\"version\":\"%s\",\"platform\":\"linux\"%s}", MD_VERSION, wayland ? ",\"unsupported\":\"wayland\"" : "");
  pthread_t rt; pthread_create(&rt, NULL, reader, NULL);
  int xfd = dpy ? ConnectionNumber(dpy) : -1;
  for (;;) {
    /* Drain X first: events may already be queued behind the socket. */
    while (dpy && XPending(dpy)) {
      XEvent e; XNextEvent(dpy, &e);
      /* The tap chord is matched on its keycode and its modifiers, so a key
       * that both slots share (different modifiers) goes to the right one;
       * the arm slot keeps its keycode only match from before. */
      if (e.type == KeyPress && is_tapped && e.xkey.keycode == tapped.code && chord_state(e.xkey.state) == tapped.xmods) { if (!tap_down) { tap_down = 1; on_tap(); } }
      else if (e.type == KeyRelease && is_tapped && e.xkey.keycode == tapped.code && tap_down) tap_down = 0;
      else if (e.type == KeyPress && is_armed && e.xkey.keycode == armed.code) on_key_down();
      else if (e.type == KeyRelease && is_armed && e.xkey.keycode == armed.code && is_down) release_due = now_ms() + 60;
      else if (e.type == SelectionRequest) serve_selection(&e.xselectionrequest);
      else if (e.type == SelectionClear && e.xselectionclear.selection == A_CLIPBOARD) { free(clip_text); clip_text = NULL; }
    }
    double now = now_ms(); double wait = 250;
    if (release_due) { double d = release_due - now; if (d <= 0) { release_due = 0; on_key_released_for_real(); continue; } if (d < wait) wait = d; }
    if (restore_due) { double d = restore_due - now; if (d <= 0) { restore_now(); continue; } if (d < wait) wait = d; }
    if (record_due) { double d = record_due - now; if (d <= 0) { record_due = 0; rec_stop_and_emit(); emitf("{\"id\":%s,\"ok\":true}", record_id); continue; } if (d < wait) wait = d; }
    fd_set fds; FD_ZERO(&fds); FD_SET(cmd_pipe[0], &fds); if (xfd >= 0) FD_SET(xfd, &fds);
    int maxfd = cmd_pipe[0] > xfd ? cmd_pipe[0] : xfd;
    struct timeval tv; tv.tv_sec = (long)(wait / 1000); tv.tv_usec = (long)((wait - tv.tv_sec * 1000) * 1000);
    int r = select(maxfd + 1, &fds, NULL, NULL, &tv);
    if (r < 0 && errno != EINTR) break;
    if (r > 0 && FD_ISSET(cmd_pipe[0], &fds)) {
      char *line = NULL;
      ssize_t n = read(cmd_pipe[0], &line, sizeof line);
      if (n <= 0 || !line) break;  /* stdin closed: exit like the Mac helper */
      handle(line); free(line);
    }
  }
  disarm();
  untap();
  return 0;
}
