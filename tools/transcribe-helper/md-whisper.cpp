// md-whisper: the resident local transcription helper (F16).
//
// One process per app, model loaded once, one JSON object per line on stdin
// and one per line on stdout. Nothing else is ever printed on stdout; whisper's
// own logging goes to stderr.
//
//   start:   md-whisper --model <ggml file> [--threads N] [--no-gpu] [--language en]
//   ready:   {"ready":true,"model":"<path>","gpu":true,"threads":4,"whisper":"<commit>"}   (no id, once)
//   request: {"id":"r1","audioPath":"/x.wav"}                       one of audioPath / pcm16
//            {"id":"r2","pcm16":"<base64 int16 LE>","sampleRate":48000,"channels":1}
//            optional: "mode":"dictation"|"meeting"  (default dictation)
//                      "prompt":"<vocabulary as whisper's initial prompt>"  or  "words":["Stapler",...]
//                      "carryPrompt":true             (prompt into every window, off by default, see below)
//                      "model":"<ggml file>"          (swap the loaded model first)
//            {"id":"r3","tokenize":"<text>"}          answers {"id","tokens","maxPromptTokens"}
//            {"id":"r4","op":"ping"|"status"|"shutdown"}   the control ops md-speech has, same names
//   reply:   {"id":"r1","text":"...","segments":[{"t0":0.0,"t1":2.4,"text":"..."}],"ms":312,"seconds":11.0}
//            {"id":"r1","error":"<code>","detail":"..."}   codes: bad-json, bad-request, unknown-op,
//                                                          audio-unreadable, model-load-failed, transcription-failed
//   Every reply carries the request's id back unchanged (any JSON value).
//   No partial results: whisper decodes a window at a time, dictation answers once.
//
// mode: dictation decodes each window on its own (no_context) and does not
// retry at higher temperatures, which keeps a short utterance's latency flat;
// meeting keeps whisper's rolling context between the windows of ONE request.
//
// Every request starts from an empty context: each one is a segment or a clip
// of its own, and whisper's state (its rolling context, prompt included) is
// created for the request and freed after it. Without that, a resident helper
// carried the last tokens of one meeting into the first window of the next,
// and a prompt sent once shaped every later request (Kevin, 23 Sep 2026).
//
// The prompt is whisper's initial prompt. The decoder keeps at most
// n_text_ctx/2 = 224 tokens of it and, when it is longer, keeps the LAST 224,
// so the caller puts the words that matter most (the user's own) at the end.

#include "whisper.h"
#include "common-whisper.h"
#include "json.hpp"

#include <chrono>
#include <cstdio>
#include <cstring>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

using json = nlohmann::json;

namespace {

struct Options {
    std::string model;
    std::string language = "en";
    int threads = 0;
    bool gpu = true;
};

void usage() {
    fprintf(stderr, "usage: md-whisper --model <ggml file> [--threads N] [--no-gpu] [--language en]\n");
}

bool parse_args(int argc, char ** argv, Options & o) {
    for (int i = 1; i < argc; i++) {
        std::string a = argv[i];
        if (a == "--model" && i + 1 < argc) o.model = argv[++i];
        else if (a == "--threads" && i + 1 < argc) o.threads = atoi(argv[++i]);
        else if (a == "--language" && i + 1 < argc) o.language = argv[++i];
        else if (a == "--no-gpu") o.gpu = false;
        else if (a == "--help" || a == "-h") { usage(); return false; }
        else { fprintf(stderr, "md-whisper: unknown argument %s\n", a.c_str()); usage(); return false; }
    }
    if (o.model.empty()) { usage(); return false; }
    if (o.threads <= 0) o.threads = std::min(4u, std::max(1u, std::thread::hardware_concurrency()));
    return true;
}

// Standard base64, no line breaks. Returns false on a malformed input.
bool base64_decode(const std::string & in, std::vector<uint8_t> & out) {
    static int8_t table[256];
    static bool init = false;
    if (!init) {
        memset(table, -1, sizeof(table));
        const char * alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for (int i = 0; i < 64; i++) table[(uint8_t) alphabet[i]] = (int8_t) i;
        init = true;
    }
    out.clear();
    out.reserve(in.size() * 3 / 4);
    uint32_t acc = 0;
    int bits = 0;
    for (unsigned char c : in) {
        if (c == '=') break;
        if (c == '\n' || c == '\r' || c == ' ') continue;
        int8_t v = table[c];
        if (v < 0) return false;
        acc = (acc << 6) | (uint32_t) v;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out.push_back((uint8_t) ((acc >> bits) & 0xff));
        }
    }
    return true;
}

// int16 little endian PCM at `rate` Hz, mono, to float at WHISPER_SAMPLE_RATE.
// Linear interpolation is enough here: the renderer sends 16 kHz already and this
// only covers a caller that did not resample.
void pcm16_to_float(const std::vector<uint8_t> & bytes, int rate, std::vector<float> & out) {
    const size_t n = bytes.size() / 2;
    std::vector<float> mono(n);
    for (size_t i = 0; i < n; i++) {
        int16_t s = (int16_t) (bytes[2 * i] | (bytes[2 * i + 1] << 8));
        mono[i] = s / 32768.0f;
    }
    if (rate == WHISPER_SAMPLE_RATE || rate <= 0 || n == 0) { out = std::move(mono); return; }
    const double step = (double) rate / WHISPER_SAMPLE_RATE;
    const size_t m = (size_t) (n / step);
    out.resize(m);
    for (size_t i = 0; i < m; i++) {
        double pos = i * step;
        size_t j = (size_t) pos;
        float frac = (float) (pos - j);
        float a = mono[std::min(j, n - 1)];
        float b = mono[std::min(j + 1, n - 1)];
        out[i] = a + (b - a) * frac;
    }
}

std::string trim(const std::string & s) {
    size_t a = s.find_first_not_of(" \t\r\n");
    if (a == std::string::npos) return "";
    size_t b = s.find_last_not_of(" \t\r\n");
    return s.substr(a, b - a + 1);
}

void emit(const json & j) {
    std::string line = j.dump();
    fwrite(line.data(), 1, line.size(), stdout);
    fputc('\n', stdout);
    fflush(stdout);
}

// Errors carry a short code (the same vocabulary as Stanley's md-speech, so
// one client can switch on it) and a readable detail.
json error_reply(const json & id, const char * code, const std::string & detail) {
    return json{{"id", id}, {"error", code}, {"detail", detail}};
}

struct whisper_context * load(const std::string & model, bool gpu) {
    whisper_context_params cparams = whisper_context_default_params();
    cparams.use_gpu = gpu;
    cparams.flash_attn = gpu;
    // No state on the context: each request makes its own (see the header).
    return whisper_init_from_file_with_params_no_state(model.c_str(), cparams);
}

// whisper's own logging would land on stdout by default; send it to stderr so
// stdout stays one JSON line per reply.
void log_to_stderr(enum ggml_log_level, const char * text, void *) {
    fputs(text, stderr);
}

} // namespace

int main(int argc, char ** argv) {
    Options opt;
    if (!parse_args(argc, argv, opt)) return 64;

    whisper_log_set(log_to_stderr, nullptr);
    ggml_log_set(log_to_stderr, nullptr);

    std::string loaded_model = opt.model;
    struct whisper_context * ctx = load(loaded_model, opt.gpu);
    if (!ctx) {
        emit(json{{"ready", false}, {"error", "failed to load model " + opt.model}});
        return 66;
    }
    emit(json{
        {"ready", true}, {"model", loaded_model}, {"gpu", opt.gpu}, {"threads", opt.threads},
        {"whisper", MD_WHISPER_COMMIT}
    });

    std::string line;
    while (std::getline(std::cin, line)) {
        if (trim(line).empty()) continue;
        json req;
        try { req = json::parse(line); }
        catch (const std::exception & e) { emit(error_reply(nullptr, "bad-json", e.what())); continue; }
        const json id = req.contains("id") ? req["id"] : json(nullptr);

        // Control ops, the same names as md-speech so one client shape fits both.
        if (req.contains("op") && req["op"].is_string()) {
            const std::string op = req["op"];
            if (op == "ping") {
                emit(json{{"id", id}, {"ok", true}, {"helper", "md-whisper"}, {"version", MD_WHISPER_VERSION}, {"whisper", MD_WHISPER_COMMIT}});
            } else if (op == "status") {
                // The model is a file we ship or downloaded, so it is installed
                // whenever we are running; the swap path reports a missing file.
                emit(json{{"id", id}, {"status", "installed"}, {"model", loaded_model}, {"gpu", opt.gpu}, {"threads", opt.threads}, {"maxPromptTokens", whisper_n_text_ctx(ctx) / 2}});
            } else if (op == "shutdown") {
                emit(json{{"id", id}, {"ok", true}});
                break;
            } else {
                emit(error_reply(id, "unknown-op", op));
            }
            continue;
        }

        // A different model on this request: swap before decoding. The model
        // stays swapped for the requests that follow.
        if (req.contains("model") && req["model"].is_string() && req["model"] != loaded_model) {
            std::string next = req["model"];
            struct whisper_context * nctx = load(next, opt.gpu);
            if (!nctx) { emit(error_reply(id, "model-load-failed", "failed to load model " + next)); continue; }
            whisper_free(ctx);
            ctx = nctx;
            loaded_model = next;
        }

        // {"id","tokenize":"<text>"} answers how many prompt tokens a text costs,
        // so Settings can show the vocabulary budget (224) against the real count.
        if (req.contains("tokenize") && req["tokenize"].is_string()) {
            const std::string text = req["tokenize"];
            const int n = -whisper_tokenize(ctx, text.c_str(), nullptr, 0);
            emit(json{{"id", id}, {"tokens", n}, {"maxPromptTokens", whisper_n_text_ctx(ctx) / 2}});
            continue;
        }

        std::vector<float> pcmf32;
        std::vector<std::vector<float>> pcmf32s;
        if (req.contains("audioPath") && req["audioPath"].is_string()) {
            const std::string path = req["audioPath"];
            if (!read_audio_data(path, pcmf32, pcmf32s, false)) { emit(error_reply(id, "audio-unreadable", "cannot read audio " + path)); continue; }
        } else if (req.contains("pcm16") && req["pcm16"].is_string()) {
            std::vector<uint8_t> bytes;
            if (!base64_decode(req["pcm16"], bytes)) { emit(error_reply(id, "bad-request", "pcm16 is not base64")); continue; }
            const int rate = req.value("sampleRate", WHISPER_SAMPLE_RATE);
            const int channels = req.value("channels", 1);
            if (channels == 2) {
                // Interleaved stereo: average the pair before resampling.
                std::vector<uint8_t> mono(bytes.size() / 2);
                for (size_t i = 0; i + 3 < bytes.size(); i += 4) {
                    const int16_t l = (int16_t) (bytes[i] | (bytes[i + 1] << 8));
                    const int16_t r = (int16_t) (bytes[i + 2] | (bytes[i + 3] << 8));
                    const int16_t m = (int16_t) ((l + r) / 2);
                    mono[i / 2] = (uint8_t) (m & 0xff);
                    mono[i / 2 + 1] = (uint8_t) ((m >> 8) & 0xff);
                }
                bytes.swap(mono);
            } else if (channels != 1) {
                emit(error_reply(id, "bad-request", "channels must be 1 or 2"));
                continue;
            }
            pcm16_to_float(bytes, rate, pcmf32);
        } else {
            emit(error_reply(id, "bad-request", "request needs audioPath or pcm16"));
            continue;
        }
        if (pcmf32.empty()) { emit(error_reply(id, "bad-request", "empty audio")); continue; }
        // whisper refuses anything under a second ("input is too short"); a one
        // word push to talk is shorter than that, so pad with silence.
        const size_t min_samples = (size_t) WHISPER_SAMPLE_RATE * 11 / 10;
        if (pcmf32.size() < min_samples) pcmf32.resize(min_samples, 0.0f);

        const std::string mode = req.value("mode", "dictation");
        // The vocabulary arrives either assembled ("prompt", the plan's field)
        // or as the plain word list md-speech takes ("words"); both become the
        // initial prompt.
        std::string prompt = req.value("prompt", "");
        if (prompt.empty() && req.contains("words") && req["words"].is_array()) {
            for (const auto & w : req["words"]) {
                if (!w.is_string()) continue;
                const std::string s = trim(w.get<std::string>());
                if (s.empty()) continue;
                if (!prompt.empty()) prompt += ", ";
                prompt += s;
            }
        }
        const bool meeting = mode == "meeting";

        whisper_full_params p = whisper_full_default_params(WHISPER_SAMPLING_BEAM_SEARCH);
        p.beam_search.beam_size = 5;
        p.greedy.best_of = 5;
        p.n_threads = opt.threads;
        p.language = opt.language.c_str();
        p.translate = false;
        p.print_progress = false;
        p.print_realtime = false;
        p.print_timestamps = false;
        p.print_special = false;
        p.no_context = !meeting;
        p.suppress_blank = true;
        p.suppress_nst = true;
        if (!meeting) p.temperature_inc = 0.0f;
        if (!prompt.empty()) {
            p.initial_prompt = prompt.c_str();
            // Measured (F16-WHISPER-BENCH.md, "Vocabulary prompt"): carrying the
            // prompt into every 30 s window of a meeting cost 2.5x the decode time
            // and six points of WER on the headset clip, so it is off unless the
            // caller asks with "carryPrompt": true. The first window sees the
            // prompt and whisper's own rolling context carries what it heard.
            p.carry_initial_prompt = req.value("carryPrompt", false);
        }

        const auto t0 = std::chrono::steady_clock::now();
        // A fresh state per request: an empty rolling context, nothing carried
        // over from the previous segment, clip or prompt. The state holds the
        // KV cache and the decode buffers; making one costs a few ms.
        struct whisper_state * state = whisper_init_state(ctx);
        if (!state) { emit(error_reply(id, "transcription-failed", "whisper_init_state failed")); continue; }
        if (whisper_full_with_state(ctx, state, p, pcmf32.data(), (int) pcmf32.size()) != 0) {
            whisper_free_state(state);
            emit(error_reply(id, "transcription-failed", "whisper_full returned an error"));
            continue;
        }
        const auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - t0).count();

        json segments = json::array();
        std::string text;
        const int n = whisper_full_n_segments_from_state(state);
        for (int i = 0; i < n; i++) {
            const std::string seg = trim(whisper_full_get_segment_text_from_state(state, i));
            if (seg.empty()) continue;
            segments.push_back(json{
                {"t0", whisper_full_get_segment_t0_from_state(state, i) / 100.0},
                {"t1", whisper_full_get_segment_t1_from_state(state, i) / 100.0},
                {"text", seg}
            });
            if (!text.empty()) text += ' ';
            text += seg;
        }
        whisper_free_state(state);
        emit(json{{"id", id}, {"text", text}, {"segments", segments}, {"ms", ms}, {"seconds", pcmf32.size() / (double) WHISPER_SAMPLE_RATE}});
    }

    whisper_free(ctx);
    return 0;
}
