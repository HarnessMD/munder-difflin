/**
 * A CLI's sign in, read from its own output (0.5.3, I2 part 2).
 *
 * Every engine CLI signs a person in its own way: a link to open and a one
 * time code to type on the site (Codex, Grok, Kimi, Copilot), a link alone
 * that comes back by itself (Cursor, Codex without a device code), a code the
 * site shows that must be pasted back into the terminal (Claude Code, Gemini
 * with no browser), or an API key. The app drives none of these itself: the
 * CLI runs in its terminal as always, and this module reads what it printed
 * so the modal can show the same thing in the app's own words, with the link
 * as a button and the code large with Copy. Nothing here stores a session.
 *
 * One recipe per provider, from a transcript captured on a Mac with that CLI
 * (test/fixtures/cli-login), plus a generic reading for a CLI whose transcript
 * has not been captured yet: a link, a code that looks like one, the words
 * that ask for a paste or a key. Pure and dependency free.
 */
import type { AgentProvider } from './agentProvider';

export type LoginKind = 'device-code' | 'browser' | 'paste-code' | 'api-key';

export interface LoginPrompt {
  provider: AgentProvider;
  kind: LoginKind;
  /** The link the CLI printed, exactly. Main opens it; the renderer never does. */
  url?: string;
  /** True only when this provider's own recipe read the link AND its host is
   *  on that provider's sign in allowlist (LOGIN_HOSTS). A terminal carries
   *  model and tool output too, so a line that looks like a sign in with a
   *  link to anywhere else gets no Open button: the URL is shown as text,
   *  said to have come from the terminal, and that is all. */
  trusted: boolean;
  /** The one time code the CLI printed, for the site (device-code). */
  code?: string;
  /** The CLI's own line, for the modal's small print. */
  line: string;
  /** Read from this provider's transcript, or by the generic reading. */
  recipe: 'provider' | 'generic';
}

export interface LoginOutcome { outcome: 'success' | 'failure'; line: string }

/** What main sends the terminal over `pty:login:<id>`. */
export type LoginEvent =
  | { prompt: LoginPrompt }
  | { done: LoginOutcome };

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(ESC + '\\[[0-9;?]*[A-Za-z]|' + ESC + '\\][^' + String.fromCharCode(7) + ']*' + String.fromCharCode(7), 'g');
/** Colour, cursor moves and OSC titles gone; CR kept as a line break. */
export function stripAnsi(s: string): string { return s.replace(ANSI, '').replace(/\r/g, '\n'); }

/** The hosts each provider's sign in lives on: what the transcripts and the
 *  vendors' docs show, plus the localhost callback a CLI opens for the
 *  browser to come back to. A host matches itself or a subdomain of itself.
 *  The app opens a link only when it is on this list for that provider, and
 *  only from that provider's own recipe; nothing else is vouched for. */
export const LOGIN_HOSTS: Record<AgentProvider, readonly string[]> = {
  claude: ['claude.ai', 'console.anthropic.com', 'platform.claude.com'],
  codex: ['auth.openai.com', 'chatgpt.com', 'platform.openai.com'],
  grok: ['accounts.x.ai', 'auth.x.ai', 'x.ai'],
  kimi: ['kimi.ai', 'kimi.com'],
  gemini: ['accounts.google.com'],
  antigravity: ['accounts.google.com', 'antigravity.google'],
  qwen: ['chat.qwen.ai', 'qwen.ai'],
  opencode: ['claude.ai', 'console.anthropic.com', 'github.com', 'opencode.ai'],
  crush: ['github.com', 'charm.land'],
  pi: ['claude.ai', 'auth.openai.com', 'github.com', 'accounts.google.com'],
  copilot: ['github.com'],
  cursor: ['cursor.com', 'authenticator.cursor.sh'],
  custom: []
};
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Whether the app may open this link for this provider: https to one of
 *  the provider's sign in hosts (or a subdomain of one), or the CLI's own
 *  localhost callback on any scheme. Anything else is shown, never opened. */
export function loginHostAllowed(provider: AgentProvider, url: string | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  const host = u.hostname.toLowerCase();
  if (LOCAL_HOSTS.has(host)) return u.protocol === 'http:' || u.protocol === 'https:';
  if (u.protocol !== 'https:') return false;
  return (LOGIN_HOSTS[provider] ?? []).some((h) => host === h || host.endsWith('.' + h));
}

const URL_RE = /https?:\/\/[^\s"'<>)\]]+/g;
/** XXXX-XXXX or XXXX-XXXXX, upper case letters and digits: the shape every device code here has. */
const CODE_RE = /\b([A-Z0-9]{4}-[A-Z0-9]{4,6})\b/g;
/** Words that mean a sign in is going on, so a link in ordinary output is not one. */
const LOGIN_CONTEXT = /\b(sign in|signin|log in|login|logged in|authoriz|authent|device code|one[- ]time code|user_code|api key|paste (the|this) code|enter (the |this )?code)\b/i;

const lastUrl = (t: string): string | undefined => { const m = t.match(URL_RE); return m ? m[m.length - 1] : undefined; };
const lastCode = (t: string): string | undefined => { const m = t.match(CODE_RE); return m ? m[m.length - 1] : undefined; };
/** The last line of the window that carries the context word, for the modal.
 *  A line that is only a link is never it: the modal shows the link itself,
 *  and an oauth link says "authorize" (founder 25 Sep: the link showed twice). */
function contextLine(t: string): string {
  const lines = t.split('\n').map((l) => l.trim()).filter((l) => l && !/^https?:\/\/\S+$/.test(l));
  for (let i = lines.length - 1; i >= 0; i--) if (LOGIN_CONTEXT.test(lines[i])) return lines[i].slice(0, 200);
  return lines[lines.length - 1]?.slice(0, 200) ?? '';
}

type Recipe = (t: string) => Omit<LoginPrompt, 'provider' | 'recipe' | 'trusted'> | null;

/** From the transcripts. Each returns null when its own prompt is not there,
 *  so the generic reading gets its turn. */
const RECIPES: Partial<Record<AgentProvider, Recipe>> = {
  // codex login --device-auth: "1. Open this link ... https://auth.openai.com/codex/device
  // 2. Enter this one-time code (expires in 15 minutes) TIFP-HBDCJ"; plain
  // `codex login` prints a localhost callback link and waits for the browser.
  codex: (t) => {
    if (/auth\.openai\.com\/codex\/device/.test(t)) { const code = lastCode(t); return code ? { kind: 'device-code', url: 'https://auth.openai.com/codex/device', code, line: contextLine(t) } : null; }
    const u = lastUrl(t);
    if (u && /auth\.openai\.com/.test(u)) return { kind: 'browser', url: u, line: contextLine(t) };
    return null;
  },
  // grok login --device-auth: "https://accounts.x.ai/oauth2/device?user_code=Q5GE-H92B ... Confirm this code in your browser: Q5GE-H92B"
  grok: (t) => {
    const u = lastUrl(t);
    if (u && /accounts\.x\.ai/.test(u)) { const code = lastCode(t); return code ? { kind: 'device-code', url: u, code, line: contextLine(t) } : { kind: 'browser', url: u, line: contextLine(t) }; }
    return null;
  },
  // kimi login: "https://www.kimi.ai/code/authorize_device?user_code=VAM5-PYA2 ... enter code: VAM5-PYA2. Code expires in 1800s."
  kimi: (t) => {
    const u = lastUrl(t);
    if (u && /kimi\.(ai|com)\/code\/authorize_device/.test(u)) { const code = lastCode(t); return code ? { kind: 'device-code', url: u, code, line: contextLine(t) } : null; }
    return null;
  },
  // cursor-agent login: "Open a browser and navigate to this link: https://cursor.com/loginDeepControl?challenge=..." and it waits.
  cursor: (t) => {
    const u = lastUrl(t);
    if (u && /cursor\.com\/loginDeepControl/.test(u)) return { kind: 'browser', url: u, line: contextLine(t) };
    return null;
  },
  // copilot /login: "Please visit https://github.com/login/device and enter code XXXX-XXXX" (GitHub's device flow).
  // copilot 1.0.88 login (founder's test build, 25 Sep): "Opening your browser to authenticate...
  // If it doesn't open automatically, visit: https://github.com/login/oauth/authorize?client_id=...
  // &redirect_uri=http%3A%2F%2F127.0.0.1%3A64309%2Fcallback... Waiting for authorization..."
  copilot: (t) => {
    if (/github\.com\/login\/device/.test(t)) { const code = lastCode(t); return code ? { kind: 'device-code', url: 'https://github.com/login/device', code, line: contextLine(t) } : null; }
    const u = lastUrl(t);
    if (u && /^https:\/\/github\.com\/login\/oauth\/authorize\?/.test(u)) return { kind: 'browser', url: u, line: contextLine(t) };
    return null;
  },
  // claude: opens the browser, then "Paste code here if prompted" and waits for the code the site shows (documented; transcript to capture).
  claude: (t) => {
    if (/paste code here/i.test(t)) return { kind: 'paste-code', url: lastUrl(t), line: contextLine(t) };
    return null;
  }
};

/** The generic reading, for a CLI without a recipe or whose recipe found
 *  nothing: only inside a sign in context, never on a bare link. */
function generic(t: string): Omit<LoginPrompt, 'provider' | 'recipe' | 'trusted'> | null {
  if (!LOGIN_CONTEXT.test(t)) return null;
  const url = lastUrl(t);
  const code = lastCode(t);
  if (/paste (the |this )?code (here|below|into)|enter (the |this )?code (here|below|into)/i.test(t)) return { kind: 'paste-code', url, line: contextLine(t) };
  if (url && code) return { kind: 'device-code', url, code, line: contextLine(t) };
  if (url) return { kind: 'browser', url, line: contextLine(t) };
  if (/api key/i.test(t) && /[:>]\s*$/.test(t.trimEnd())) return { kind: 'api-key', line: contextLine(t) };
  return null;
}

/** What the CLI is asking a person to do, or null. `text` is the recent
 *  output, plain (stripAnsi) or raw. */
export function detectLoginPrompt(provider: AgentProvider, text: string): LoginPrompt | null {
  const t = stripAnsi(text);
  const own = RECIPES[provider]?.(t);
  // Trusted only when the provider's own recipe read it and the host is that
  // provider's; a recipe that matched on words with a link elsewhere is not.
  if (own) return { provider, recipe: 'provider', trusted: loginHostAllowed(provider, own.url), ...own };
  const g = generic(t);
  return g ? { provider, recipe: 'generic', trusted: false, ...g } : null;
}

const SUCCESS = /\b(logged in|login successful|successfully (logged|signed) in|signed in as|authentication (complete|successful)|authenticated as|login complete|you are now logged in|you're all set|welcome back)\b/i;
const FAILURE = /\b(login failed|authentication failed|authorization failed|code (has )?expired|token expired|access denied|login (was )?cancell?ed|could not (log|sign) in|not authorized|invalid (code|token|api key))\b/i;

/** Whether the sign in ended, read from the same output. Only lines are
 *  judged, so a stale success from scrollback cannot answer a new prompt:
 *  callers hand over what came AFTER the prompt. */
export function detectLoginOutcome(text: string): LoginOutcome | null {
  const lines = stripAnsi(text).split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (SUCCESS.test(lines[i])) return { outcome: 'success', line: lines[i].slice(0, 200) };
    if (FAILURE.test(lines[i])) return { outcome: 'failure', line: lines[i].slice(0, 200) };
  }
  return null;
}

/** Two prompts are the same ask when the kind, link and code match: the
 *  watcher shows a prompt once, not on every repaint. */
export function sameLoginPrompt(a: LoginPrompt | null, b: LoginPrompt | null): boolean {
  if (!a || !b) return a === b;
  return a.kind === b.kind && a.url === b.url && a.code === b.code;
}

/** The model backends whose key the app can store for a CLI (the BYOK env
 *  map in main): what the api-key modal offers. */
export const LOGIN_KEY_BACKENDS = ['anthropic', 'openai', 'google', 'openrouter', 'groq'] as const;
