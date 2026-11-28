/**
 * Strip secret-shaped substrings out of free text before it leaves the main
 * process toward the voice / renderer layer. This is the MAIN-SIDE privacy gate
 * for the voice read-layer's message-content path (`hive:messages`): a message
 * body can quote a key, paste a token, or echo a credential, so every body and
 * subject is run through this before it crosses IPC. Inbox's thinking row is the
 * one place the renderer cleans text itself, with this same code: an agent's live
 * action never crosses hive:messages.
 *
 * Deliberately CONSERVATIVE: it matches known credential SHAPES (provider key
 * prefixes, JWTs, PEM private keys, bearer tokens) and sensitive key=value /
 * key: value assignments, then replaces the secret with `[redacted]`. It does
 * NOT blanket-redact on entropy, so operator-meaningful content the briefing
 * needs — git SHAs, agent ids, file paths, ordinary prose — survives intact.
 * Over-redaction (e.g. a non-secret `apikey:openai` ref) is acceptable; leaking
 * a real secret is not.
 *
 * LOCKSTEP: the regex battery below is mirrored character-identically in
 * test/voice-messages.test.cjs (a .cjs test cannot import this TS module). If
 * you change a pattern here, mirror it there — the test is what PROVES a
 * secret-shaped value is stripped.
 */
export function redactSecrets(text: unknown): string {
  if (typeof text !== 'string' || !text) return typeof text === 'string' ? text : '';
  let s = text;
  // 1. PEM private-key blocks (RSA/EC/OPENSSH/PGP — header through footer).
  s = s.replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, '[redacted]');
  // 2. JSON Web Tokens — three base64url segments separated by dots.
  s = s.replace(/\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g, '[redacted]');
  // 3. Known credential prefixes: OpenAI/Anthropic (sk-, sk-ant-), Slack
  //    (xoxb/xoxp/xoxa/xoxr/xoxs-, xapp-), GitHub (ghp_/gho_/ghu_/ghs_/ghr_,
  //    github_pat_), AWS access-key ids (AKIA…), Google API keys (AIza…).
  s = s.replace(
    /(?:sk-(?:ant-)?[A-Za-z0-9_-]{16,}|xox[bpaors]-[A-Za-z0-9-]{10,}|xapp-[A-Za-z0-9-]{10,}|gh[posru]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[A-Za-z0-9_-]{20,})/g,
    '[redacted]'
  );
  // 4. Bearer tokens — keep the label, drop the credential.
  s = s.replace(/\b(bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [redacted]');
  // 5. Sensitive key = value / key: value — keep the key name, drop the value.
  //    An optional namespace prefix (aws_, gcp_, …) is folded into the captured
  //    key so a LABELED secret survives the \b boundary: `aws_secret_access_key`
  //    is all word chars, so a bare `\b(secret)\b` never sees it. Listing
  //    secret_access_key / private_key alone is not enough — the prefix run is
  //    what lets `aws_secret_access_key=…` (no AKIA shape on the value) redact.
  //    The quote after the key is JSON's: `"token":"…"`, the form of .cloud and .broker (F14).
  s = s.replace(
    /\b((?:[a-z0-9]+[_-])*(?:api[_-]?key|secret[_-]?access[_-]?key|secret|token|password|passwd|pwd|access[_-]?token|refresh[_-]?token|client[_-]?secret|signing[_-]?secret|webhook[_-]?secret|auth[_-]?token|bot[_-]?token|private[_-]?key))["']?(\s*[:=]\s*)(["']?)[^\s"',}]{6,}\3/gi,
    (_m, k) => `${k}=[redacted]`
  );
  // 6. A known prefix key cut at the very end (a subject or a preview cut from a longer text): too short for 3 to know,
  //    still a piece of a key. Not after a letter, digit, _ or -, so `task-1234` is a word, not a key.
  s = s.replace(/(?<![A-Za-z0-9_-])(?:sk-(?:ant-)?|xox[bpaors]-|xapp-|gh[posru]_|github_pat_|AKIA|AIza|eyJ)[A-Za-z0-9_-]{4,}$/, '[redacted]');
  return s;
}
