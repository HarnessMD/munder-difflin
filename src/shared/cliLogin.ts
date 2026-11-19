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
const BEL = String.fromCharCode(7);
/** A move to a row (cursor position `H` or `f`, line position `d`): where tmux or a TUI starts drawing another row. */
const ROW_MOVE = new RegExp(ESC + '\\[[0-9;]*[Hfd]', 'g');
/**
 * Every escape sequence, whole: CSI with any parameters (`ESC [ > c` too), OSC ended by BEL or by ST, DCS, SOS, PM
 * and APC ended by ST, a character set choice (`ESC ( B`), and any other two byte escape (`ESC =`, `ESC 7`).
 */
const ANSI = new RegExp([
  ESC + '\\[[0-?]*[ -/]*[@-~]',
  ESC + '\\][\\s\\S]*?(?:' + BEL + '|' + ESC + '\\\\)',
  ESC + '[PX^_][\\s\\S]*?' + ESC + '\\\\',
  ESC + '[()*+\\-./][\\s\\S]',
  ESC + '[\\s\\S]'
].join('|'), 'g');
/**
 * Colour, cursor moves and OSC titles gone; CR kept as a line break, and a move to a row read as one. Through
 * tmux, agy's Google link reached the screen as rows that each began with `ESC ( B`, which the old pattern kept, so the second row read as no part of the link and the sheet got the
 * first row alone (`client_id=1071006060591-...`, Google 404 "Required parameter is missing: response_type"). And
 * tmux draws the sentence after the link with a move to its row: removed with no break, that sentence joined the
 * link's last row and cut `state` off.
 */
export function stripAnsi(s: string): string { return s.replace(ROW_MOVE, '\n').replace(ANSI, '').replace(/\r/g, '\n'); }

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
/** Hosts matched as THEMSELVES ONLY, never a subdomain, and only under ONE
 *  path. Claude Code (2.1.285, read on 8 Oct 2026) sends a
 *  subscription sign in to https://claude.com/cai/oauth/authorize. claude.com
 *  is a whole site, not a sign in host, so nothing of it is vouched for but
 *  its sign in pages: the host itself, and a path that begins with `path`. */
export interface ExactLoginHost { host: string; path: string }
export const LOGIN_HOSTS_EXACT: Partial<Record<AgentProvider, readonly ExactLoginHost[]>> = {
  claude: [{ host: 'claude.com', path: '/cai/oauth/' }]
};
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Whether the app may open this link for this provider: https to one of
 *  the provider's sign in hosts (or a subdomain of one) on the usual port with
 *  no name or password in the address, or, for a CLI on this computer only,
 *  its own localhost callback. Anything else is shown, never opened. */
export function loginHostAllowed(provider: AgentProvider, url: string | undefined, opts: LoginHostOptions = {}): boolean {
  return loginLinkToOpen(provider, url, opts) !== null;
}

export interface LoginHostOptions {
  /** TRUE ONLY for a CLI on this computer: its way back is a localhost
   *  callback, which may then be opened. Anything else, left out included,
   *  never opens a localhost address: the safe answer is the one given by default. */
  local?: boolean;
}

/** A sign in path that is meant to stay under its prefix: no `..`, and none of
 *  the written forms a server may read as a way up or out (`%2e`, `%2f`, `%5c`,
 *  a `;` parameter). The parser takes out the plain forms; these it keeps. */
const PATH_WAY_OUT = /\.\.|%2e|%2f|%5c|;/i;

/** A provider's own list, whatever name is asked for: a name that is no
 *  provider has no list, never a thing
 *  inherited from every object. */
function listOf<T>(lists: Partial<Record<string, readonly T[]>>, provider: string): readonly T[] {
  // A name is text. Anything else (a list holding a name, say) would be read as text by the lookup.
  if (typeof provider !== 'string') return [];
  const own = lists[provider];
  return Array.isArray(own) ? own : [];
}

/**
 * THE ADDRESS TO OPEN, or null when the app does not open it. What comes back
 * is the address AS IT WAS READ FOR THE CHECK (the parsed form), so the thing
 * opened is the thing checked, never the text it came as.
 */
export function loginLinkToOpen(provider: AgentProvider | string, url: string | undefined, opts: LoginHostOptions = {}): string | null {
  if (typeof url !== 'string' || !url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (LOCAL_HOSTS.has(host)) return opts.local === true && (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
  if (u.protocol !== 'https:') return null;
  // Every listed host: on the usual port, with no name or password in the address.
  if (u.port !== '' || u.username !== '' || u.password !== '') return null;
  // The host itself, under its one path. The path asked is the parsed one: the plain `..` is
  // already taken out of it, and the written forms it keeps are refused (PATH_WAY_OUT).
  const exact = listOf(LOGIN_HOSTS_EXACT, provider).filter((e) => e.host === host);
  if (exact.length > 0) return !PATH_WAY_OUT.test(u.pathname) && exact.some((e) => u.pathname.startsWith(e.path)) ? u.href : null;
  return listOf(LOGIN_HOSTS, provider).some((h) => host === h || host.endsWith('.' + h)) ? u.href : null;
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

/** The characters a link is made of, and nothing else: a row of only these continues a link a terminal broke. */
const LINK_ROW = /^[A-Za-z0-9%&=._~:/?#@!$'()*+,;-]+$/;

/**
 * A LINK A TERMINAL BROKE INTO ROWS, joined again. The last line where `start` matches is where the link
 * begins; when the link runs to that line's end, every following row that is only link characters is part of it
 * (blank rows between are skipped: a TUI's own line ends read as one each). A row with anything else in it, agy's
 * next sentence above all, ends the link. Undefined while no such row has come: the link may still be arriving, and
 * a part of a link is never offered. A link that ends inside its line is that link, as before.
 */
export function wrappedUrl(t: string, start: RegExp): string | undefined {
  const lines = t.split('\n');
  let at = -1;
  for (let i = lines.length - 1; i >= 0 && at < 0; i--) if (start.test(lines[i])) at = i;
  if (at < 0) return undefined;
  const first = lines[at].trim();
  const tail = /https?:\/\/\S+$/.exec(first);
  if (!tail || !start.test(tail[0])) {
    const m = lines[at].match(URL_RE);
    return m ? m[m.length - 1] : undefined;
  }
  let url = tail[0];
  for (let i = at + 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (row === '') continue;
    if (!LINK_ROW.test(row)) return url;
    url += row;
  }
  return undefined;
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
    // --device-auth always prints a code: until it is in, the prompt is not read yet. Read early, the link
    // (which arrives first, often in pieces) became a "paste a code" prompt that was never taken back.
    if (u && /accounts\.x\.ai/.test(u)) { const code = lastCode(t); return code ? { kind: 'device-code', url: u, code, line: contextLine(t) } : null; }
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
  // agy (Antigravity 1.5.1) has NO login command of its own: it signs in on
  // its first run, and away from a desktop it prints a Google link and takes
  // the code back (STEP0.md; antigravity.google/docs/install). NOT READ FROM A
  // TRANSCRIPT: the shape below is the documented one. Anything else reads as
  // no prompt, and the panel then hands the person the terminal (R9), which is
  // what it does today for every engine it cannot read.
  //
  // READ FROM A TERMINAL since (agy 1.5.1, 11 Nov 2026, in a 100 column login
  // pty): after the login method is chosen it prints "Your browser should open automatically. If not:", then the
  // Google link BROKEN INTO ROWS of 98 characters, each row its own line, then "If you aren't automatically
  // redirected, paste the authorization code below:". Read as one line, the link stopped at the first row's end
  // ("client_id=107100", a Google 404). So the rows are joined (wrappedUrl), and the link is only
  // read once agy's next sentence is there: a link still arriving is not offered.
  //
  // ONLY GOOGLE'S OWN SIGN IN PAGE: after the code agy shows its Terms step, whose
  // rows carry https://antigravity.google/terms; read as a sign in link, that Terms page became step 1 and the panel
  // sat on "Checking the code". The sign in link is accounts.google.com, never a link read off another screen.
  antigravity: (t) => {
    const u = wrappedUrl(t, /https:\/\/accounts\.google\.com\//);
    if (!u) return null;
    // Its own words first: the link's random parts (state, code_challenge) can look like a device code.
    if (/paste (the |this )?(authorization )?code|enter (the |this )?code/i.test(t)) return { kind: 'paste-code', url: u, line: contextLine(t) };
    const code = lastCode(t);
    if (code) return { kind: 'device-code', url: u, code, line: contextLine(t) };
    return { kind: 'browser', url: u, line: contextLine(t) };
  },
  // opencode auth login: a provider is picked in OpenCode's own list, then that
  // provider's own way in. GitHub Copilot is GitHub's device flow, OpenAI has a
  // device flow of its own, and most others take a pasted API KEY, which is
  // left to the terminal here on purpose: a key never rides through the panel.
  // NOT READ FROM A TRANSCRIPT either (STEP0.md).
  opencode: (t) => {
    if (/github\.com\/login\/device/.test(t)) { const code = lastCode(t); return code ? { kind: 'device-code', url: 'https://github.com/login/device', code, line: contextLine(t) } : null; }
    const u = lastUrl(t);
    if (u && /opencode\.ai|console\.anthropic\.com|claude\.ai/.test(u)) { const code = lastCode(t); return code ? { kind: 'device-code', url: u, code, line: contextLine(t) } : { kind: 'browser', url: u, line: contextLine(t) }; }
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
 *  output, plain (stripAnsi) or raw. `opts` is how its link is judged: a CLI
 *  on this computer passes `{ local: true }`. */
export function detectLoginPrompt(provider: AgentProvider, text: string, opts: LoginHostOptions = {}): LoginPrompt | null {
  const t = stripAnsi(text);
  const own = RECIPES[provider]?.(t);
  // Trusted only when the provider's own recipe read it and the host is that
  // provider's; a recipe that matched on words with a link elsewhere is not.
  if (own) return { provider, recipe: 'provider', trusted: loginHostAllowed(provider, own.url, opts), ...own };
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
