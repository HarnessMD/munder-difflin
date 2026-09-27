/* mdline.h: the JSON lines the md-hotkey helpers speak, in C (0.5.3, F16).
 *
 * The protocol is one flat JSON object per line: string, number and boolean
 * values, no nesting the helpers need. So this is not a JSON library, it is
 * the four things a helper does with a line: find a key's raw value, read it
 * as a string, number or bool, and write a line back with the escaping the
 * other end (src/main/transcribe/lineHelper.ts, JSON.parse) requires. Plus
 * base64 for the PCM. Header only, no allocation beyond the caller's buffers.
 */
#ifndef MDLINE_H
#define MDLINE_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* Locate the raw value of `key` in a flat JSON object. Returns a pointer to
 * the first character of the value and its length, or NULL. */
static const char *md_json_find(const char *line, const char *key, size_t *len) {
  size_t klen = strlen(key);
  const char *p = line;
  while ((p = strchr(p, '"')) != NULL) {
    const char *k = p + 1;
    const char *kend = k;
    while (*kend && *kend != '"') { if (*kend == '\\' && kend[1]) kend++; kend++; }
    if (!*kend) return NULL;
    int match = (size_t)(kend - k) == klen && strncmp(k, key, klen) == 0;
    const char *q = kend + 1;
    while (*q == ' ' || *q == '\t') q++;
    if (*q != ':') { p = kend + 1; continue; }  /* a string value, not a key */
    q++;
    while (*q == ' ' || *q == '\t') q++;
    const char *vstart = q;
    const char *vend = q;
    if (*q == '"') {
      vend = q + 1;
      while (*vend && *vend != '"') { if (*vend == '\\' && vend[1]) vend++; vend++; }
      if (*vend) vend++;
    } else if (*q == '{' || *q == '[') {
      int depth = 0; int instr = 0;
      for (vend = q; *vend; vend++) {
        char c = *vend;
        if (instr) { if (c == '\\' && vend[1]) vend++; else if (c == '"') instr = 0; continue; }
        if (c == '"') instr = 1;
        else if (c == '{' || c == '[') depth++;
        else if (c == '}' || c == ']') { depth--; if (depth == 0) { vend++; break; } }
      }
    } else {
      while (*vend && *vend != ',' && *vend != '}' && *vend != ' ' && *vend != '\n' && *vend != '\r') vend++;
    }
    if (match) { *len = (size_t)(vend - vstart); return vstart; }
    p = vend;
  }
  return NULL;
}

/* One hex digit. */
static int md_hex(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

/* Read a string value into `out` (UTF-8, escapes decoded, \uXXXX for the BMP
 * and surrogate pairs). Returns 1 when the key is a string, else 0. */
static int md_json_string(const char *line, const char *key, char *out, size_t cap) {
  size_t len; const char *v = md_json_find(line, key, &len);
  if (!v || len < 2 || v[0] != '"') return 0;
  const char *p = v + 1, *end = v + len - 1;
  size_t o = 0;
  while (p < end && o + 4 < cap) {
    if (*p == '\\' && p + 1 < end) {
      p++;
      switch (*p) {
        case 'n': out[o++] = '\n'; p++; break;
        case 't': out[o++] = '\t'; p++; break;
        case 'r': out[o++] = '\r'; p++; break;
        case 'b': out[o++] = '\b'; p++; break;
        case 'f': out[o++] = '\f'; p++; break;
        case 'u': {
          if (p + 4 >= end + 1) { p = end; break; }
          int h[4]; int ok = 1;
          for (int i = 0; i < 4; i++) { h[i] = md_hex(p[1 + i]); if (h[i] < 0) ok = 0; }
          if (!ok) { p++; break; }
          uint32_t cp = (uint32_t)((h[0] << 12) | (h[1] << 8) | (h[2] << 4) | h[3]);
          p += 5;
          if (cp >= 0xD800 && cp <= 0xDBFF && p + 5 < end + 1 && p[0] == '\\' && p[1] == 'u') {
            int l[4]; int ok2 = 1;
            for (int i = 0; i < 4; i++) { l[i] = md_hex(p[2 + i]); if (l[i] < 0) ok2 = 0; }
            if (ok2) {
              uint32_t lo = (uint32_t)((l[0] << 12) | (l[1] << 8) | (l[2] << 4) | l[3]);
              if (lo >= 0xDC00 && lo <= 0xDFFF) { cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00); p += 6; }
            }
          }
          if (cp < 0x80) out[o++] = (char)cp;
          else if (cp < 0x800) { out[o++] = (char)(0xC0 | (cp >> 6)); out[o++] = (char)(0x80 | (cp & 0x3F)); }
          else if (cp < 0x10000) { out[o++] = (char)(0xE0 | (cp >> 12)); out[o++] = (char)(0x80 | ((cp >> 6) & 0x3F)); out[o++] = (char)(0x80 | (cp & 0x3F)); }
          else { out[o++] = (char)(0xF0 | (cp >> 18)); out[o++] = (char)(0x80 | ((cp >> 12) & 0x3F)); out[o++] = (char)(0x80 | ((cp >> 6) & 0x3F)); out[o++] = (char)(0x80 | (cp & 0x3F)); }
          break;
        }
        default: out[o++] = *p; p++; break;  /* \" \\ \/ */
      }
    } else {
      out[o++] = *p++;
    }
  }
  out[o] = 0;
  return 1;
}

static int md_json_number(const char *line, const char *key, double *out) {
  size_t len; const char *v = md_json_find(line, key, &len);
  if (!v || len == 0 || v[0] == '"' || v[0] == '{' || v[0] == '[') return 0;
  char buf[64]; if (len >= sizeof buf) return 0;
  memcpy(buf, v, len); buf[len] = 0;
  char *e = NULL; double d = strtod(buf, &e);
  if (e == buf) return 0;
  *out = d; return 1;
}

/* 1 for true, 0 for false, -1 when absent or not a boolean. */
static int md_json_bool(const char *line, const char *key) {
  size_t len; const char *v = md_json_find(line, key, &len);
  if (!v) return -1;
  if (len == 4 && strncmp(v, "true", 4) == 0) return 1;
  if (len == 5 && strncmp(v, "false", 5) == 0) return 0;
  return -1;
}

/* The request id, raw, so it goes back unchanged (a number or a string). */
static void md_json_id(const char *line, char *out, size_t cap) {
  size_t len; const char *v = md_json_find(line, "id", &len);
  if (!v || len == 0 || len >= cap) { strncpy(out, "null", cap); out[cap - 1] = 0; return; }
  memcpy(out, v, len); out[len] = 0;
}

/* Append a JSON string literal (with quotes) for UTF-8 `s` to a buffer. */
static size_t md_json_quote(char *out, size_t cap, const char *s) {
  size_t o = 0;
  if (o < cap) out[o++] = '"';
  for (const unsigned char *p = (const unsigned char *)s; *p && o + 8 < cap; p++) {
    switch (*p) {
      case '"': out[o++] = '\\'; out[o++] = '"'; break;
      case '\\': out[o++] = '\\'; out[o++] = '\\'; break;
      case '\n': out[o++] = '\\'; out[o++] = 'n'; break;
      case '\r': out[o++] = '\\'; out[o++] = 'r'; break;
      case '\t': out[o++] = '\\'; out[o++] = 't'; break;
      default:
        if (*p < 0x20) { o += (size_t)snprintf(out + o, cap - o, "\\u%04x", *p); }
        else out[o++] = (char)*p;
    }
  }
  if (o < cap) out[o++] = '"';
  if (o < cap) out[o] = 0; else out[cap - 1] = 0;
  return o;
}

static const char MD_B64[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/* Base64 of `n` bytes into `out` (needs 4*ceil(n/3)+1). Returns the length. */
static size_t md_base64(const unsigned char *in, size_t n, char *out) {
  size_t o = 0, i = 0;
  while (i + 2 < n) {
    uint32_t v = ((uint32_t)in[i] << 16) | ((uint32_t)in[i + 1] << 8) | in[i + 2];
    out[o++] = MD_B64[(v >> 18) & 63]; out[o++] = MD_B64[(v >> 12) & 63]; out[o++] = MD_B64[(v >> 6) & 63]; out[o++] = MD_B64[v & 63];
    i += 3;
  }
  if (i < n) {
    uint32_t v = (uint32_t)in[i] << 16; if (i + 1 < n) v |= (uint32_t)in[i + 1] << 8;
    out[o++] = MD_B64[(v >> 18) & 63]; out[o++] = MD_B64[(v >> 12) & 63];
    out[o++] = (i + 1 < n) ? MD_B64[(v >> 6) & 63] : '=';
    out[o++] = '=';
  }
  out[o] = 0;
  return o;
}

#endif
