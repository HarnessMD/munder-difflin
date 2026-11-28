import type { AgentProvider } from './agentProvider';
import { bridgeOf, providerPreset } from './agentProvider';
import { DEFAULT_COMPACTION_FOCUS } from './triggers';

/** What one provider's interactive TUI accepts for each context action. */
export interface ProviderContextCommands {
  /** Summarise-in-place. `null` = no command we can type with confidence. */
  compact: string | null;
  /** Discard-and-restart. `null` = same. */
  clear: string | null;
  /**
   * Whether the TUI parses text AFTER the compact command as a focus
   * instruction. When false the focus is DROPPED rather than typed: a CLI whose
   * slash parser ignores the remainder is harmless, but one that re-reads it as
   * a fresh prompt would silently turn a compaction into a whole extra turn.
   */
  compactTakesFocus: boolean;
}

const NO_CONTEXT_COMMANDS: ProviderContextCommands = {
  compact: null,
  clear: null,
  compactTakesFocus: false
};

/**
 * THE per-provider context-command table.
 *
 * Deliberately a total `Record<AgentProvider, …>` and NOT a switch with a
 * `default:` arm — the previous switch silently answered `null` for seven of the
 * eleven providers, so auto-compaction quietly did nothing for most of the fleet
 * and nobody found out. A total record makes the compiler stop the next person
 * who adds a provider until they have actually looked its commands up.
 *
 * `null` means "we could not establish a command we trust", NOT "we didn't
 * check". A wrong slash command typed into a live terminal is worse than no
 * command: at best it is dead text the model answers, at worst it fires some
 * other verb. Every entry below cites where it was verified — mostly by reading
 * the SHIPPED BINARY of each CLI (its own embedded command table / docs), which
 * outranks web docs because it cannot lag the installed version.
 */
const CONTEXT_COMMANDS: Record<AgentProvider, ProviderContextCommands> = {
  // claudeCommands.ts:34,37 (this repo's own catalog): `/compact` takes a focus
  // ("usage: /compact keep the auth decisions"), `/clear` starts a fresh
  // conversation and reclaims the window.
  claude: { compact: '/compact', clear: '/clear', compactTakesFocus: true },

  // Codex 0.137.0 binary, TUI slash-command description table:
  //   "summarize conversation to prevent hitting the context limit"  → /compact
  //   "clear the terminal and start a new chat"                      → /clear
  // NOTE this contradicts codexCommands.ts, which lists /clear but NOT /compact.
  // The binary is right and that catalog is incomplete (see report).
  // compactTakesFocus stays FALSE: codex's own `Usage: /…` strings spell out an
  // argument for every command that takes one (/goal, /raw, /mcp, /keymap,
  // /ide, /sandbox-add-read-dir) and /compact has none.
  codex: { compact: '/compact', clear: '/clear', compactTakesFocus: false },

  // Grok binary ships its own docs inline (04-slash-commands.md):
  //   "/compact [context] — Compress conversation history… Optionally specify
  //    what to preserve", example `/compact keep the auth implementation details`
  //   "/new — Start a new session, clearing the current conversation.
  //    Aliases: /clear"
  // `/new` is the documented spelling (and what grokCommands.ts:13 already
  // records), so prefer it over the alias.
  // compactTakesFocus is FALSE despite those docs (F5, Grok 1.0.70): the bare command ran in 34 s, and with
  // text the line stayed in Grok's box and a further Enter did nothing.
  grok: { compact: '/compact', clear: '/new', compactTakesFocus: false },

  // Moonshot kimi-cli slash-command reference: `/compact` accepts appended
  // custom instructions ("/compact preserve database-related discussions");
  // `/clear` (alias /reset) "Clear the current session's context and start a
  // new conversation". NB `/new` there forks a session rather than discarding.
  kimi: { compact: '/compact', clear: '/clear', compactTakesFocus: true },

  // antigravity.google/docs/cli/reference (Google's own command table):
  //   "/clear  (/new)  — Clear the terminal and reset active conversation
  //    contexts."     ← a REAL context reset, and
  //   "Ctrl+L  cli.clear_screen — Refreshes and clears the visual terminal
  //    buffer."       ← the screen-only one. The two are different things, so
  // the "agy /clear only clears the screen" worry does not hold.
  // That reference lists NO compaction verb at all (zero hits for compact /
  // compress / summarize), and the shipped `agy` binary has no such literal
  // either — agy compacts AUTOMATICALLY when the window fills ("# Resuming from
  // a compaction"). Nothing to type, so: null.
  antigravity: { compact: null, clear: '/clear', compactTakesFocus: false },

  // Google Gemini CLI's command reference documents `/compress` as replacing
  // the chat context with a summary and `/clear` as starting a clean context.
  // `/compress` has no focus-argument contract, so never append user prose.
  gemini: { compact: '/compress', clear: '/clear', compactTakesFocus: false },

  // qwen-code's bundled cli.js, verbatim:
  //   compressCommand = { name:"compress", altNames:["summarize"],
  //     description "Compresses the context by replacing it with a summary." }
  //   and its action reads `context.invocation?.args` as `customInstructions`
  //   (capped at 2000 chars) → it genuinely takes a focus.
  //   clearCommand    = { name:"clear", altNames:["reset","new"],
  //     description "Clear conversation history and free up context." }
  // It is `/compress`, NOT `/compact`: qwen dropped upstream gemini-cli's
  // `compact` altName, so `/compact` would land as plain text here.
  qwen: { compact: '/compress', clear: '/clear', compactTakesFocus: true },

  // opencode binary's command registry, verbatim:
  //   { title:"Compact session", value:"session.compact",
  //     slash:{ name:"compact", aliases:["summarize"] }, run: … }
  // and its own tip text "Run /compact to summarize long sessions near context
  // limits". That `run()` calls session.summarize({sessionID,model}) and never
  // looks at the invocation args → the focus would be silently dropped, so
  // compactTakesFocus is false.
  // `/clear` does NOT exist in the binary (zero literals); the fresh-session
  // verb is `/new` — matched exactly (`t.trim().toLowerCase()==="/new"`).
  opencode: { compact: '/compact', clear: '/new', compactTakesFocus: false },

  // Crush has NO typed slash commands at all. Its own binary strings show
  // "Summarize Session" / "New Session" as ctrl+p COMMAND-PALETTE rows, and the
  // hint "/ or ctrl+p" means a leading `/` OPENS that palette rather than
  // submitting a command. Typing "/compact" would filter a modal and leave it
  // open, swallowing everything queued behind it. Nothing safe to type: null.
  // (Crush's compact/clear are reachable only over its HTTP API.)
  crush: NO_CONTEXT_COMMANDS,

  // pi's dist/core/slash-commands.js, verbatim:
  //   { name:"compact", description:"Manually compact the session context" }
  //   { name:"new",     description:"Start a new session" }
  // and docs/compaction.md: "trigger manually with `/compact [instructions]`,
  // where optional instructions focus the summary". There is no `/clear`.
  pi: { compact: '/compact', clear: '/new', compactTakesFocus: true },

  // Copilot's interactive mode has `/compact [FOCUS-INSTRUCTIONS]` and
  // `/clear`, and since 0.5.3 the preset runs it interactively (`-i`). They
  // stay null until they are checked against a live 1.0.88 session: a wrong
  // slash typed into a live TUI is worse than no auto-compact.
  copilot: NO_CONTEXT_COMMANDS,

  // Cursor Agent CLI (`agent`) is interactive in this preset, but its slash /
  // command surface is not yet verified against a frozen binary catalog in-repo.
  // Prefer null over guessing — wrong slashes into a live TUI are worse than no
  // auto-compact. Revisit when a shipped command table is transcribed.
  cursor: NO_CONTEXT_COMMANDS,

  // An arbitrary user binary. We cannot know its command surface, and guessing
  // means typing slashes into someone's unknown REPL.
  custom: NO_CONTEXT_COMMANDS
};

/** The full context-command entry for a provider (unknown ids degrade to none). */
export function contextCommandsForProvider(provider: AgentProvider): ProviderContextCommands {
  return CONTEXT_COMMANDS[provider] ?? NO_CONTEXT_COMMANDS;
}

/**
 * The compaction command to type, or null when this provider has none.
 *
 * `message` is the user-editable `ContextRule.message` (default
 * `DEFAULT_COMPACTION_FOCUS`) and is appended only where the provider's parser
 * actually reads it — see `compactTakesFocus`.
 */
export function compactionCommandForProvider(
  provider: AgentProvider,
  message: string = DEFAULT_COMPACTION_FOCUS
): string | null {
  const { compact, compactTakesFocus } = contextCommandsForProvider(provider);
  if (!compact) return null;
  const focus = message.trim();
  return compactTakesFocus && focus ? `${compact} ${focus}` : compact;
}

/** Every distinct compaction verb this harness can type, across all providers.
 *  Derived from CONTEXT_COMMANDS rather than hand-listed, so a provider added to
 *  that table is covered here without a second edit anyone could forget. */
const COMPACT_VERBS: ReadonlySet<string> = new Set(
  Object.values(CONTEXT_COMMANDS)
    .map((c) => c.compact)
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
);

/**
 * Is this queued text a compaction command?
 *
 * Matches the leading VERB only, so `/compact keep the auth decisions` counts
 * while a human sentence that merely mentions compaction does not — the queue
 * carries both, and mistaking prose for a command would silently drop real work.
 *
 * Provider-agnostic on purpose: the queue is keyed by agent, not provider, and a
 * duplicate `/compact` is worth dropping regardless of which CLI is going to
 * receive it.
 */
export function isCompactionCommand(text: string): boolean {
  return COMPACT_VERBS.has(text.trim().split(/\s+/)[0]);
}

/**
 * The context-clearing command to type, or null when nothing typed can reach
 * this provider.
 *
 * Per `ContextRule.message`, a non-empty message on the CLEAR rule is "the
 * literal command to send" — an override, not a suffix. That asymmetry with
 * compact is deliberate and useful: it is the operator's escape hatch for the
 * providers this table answers `null` for, and for a CLI that renames its verb
 * between releases. Empty message = the table's own bare command.
 */
export function clearCommandForProvider(
  provider: AgentProvider,
  message: string = ''
): string | null {
  const override = message.trim();
  if (override) return override;
  return contextCommandsForProvider(provider).clear;
}

/** 0.5.6: the engine's clear command when the app may clear this agent on a
 *  switch of work (shared/switchClear.ts): it has one, and its hooks tell the
 *  app when a turn ends. Here and not in switchClear.ts, whose import of this
 *  file would close a loop through triggers.ts. Main and the office ask it. */
export function switchClearCommand(provider: AgentProvider): string | null {
  return wakeOptionsFor(provider).selfFile ? null : clearCommandForProvider(provider);
}

/** Claude exposes remote control as a slash command; Codex uses its daemon and
 * Kimi has no equivalent slash command. */
export function remoteControlCommandForProvider(
  provider: AgentProvider,
  sessionName?: string
): string | null {
  if (provider !== 'claude') return null;
  const name = sessionName?.trim();
  return name ? `/remote-control ${name}` : '/remote-control';
}

/**
 * The gap, in milliseconds, between writing a message into a TUI and writing
 * the Return that submits it. The text goes first (as a bracketed paste when it
 * has newlines) and the Return follows as its own keystroke: sent in one chunk
 * the TUI reads the Return as one more pasted newline and the message sits in
 * the input box unsubmitted. The gap is fixed, so it is only ever as good as
 * the slowest paste it has to cover. Under heavy load the TUI has not finished
 * ingesting the text when the Return lands, and the same symptom comes back:
 * the text sits visibly on the agent's prompt and nothing notices, because the
 * write succeeded and only a dead pty makes a write fail.
 *
 * Was a literal 140 in two files and named in neither, so raising one looked
 * done and was not. Raised to 240 for 0.5.1 on the founder's word (400 was
 * argued for; his call). Both submit sites import THIS constant and the
 * provider-automation test pins that, so the two cannot drift apart again.
 * This is headroom, not the fix. For Claude the fix is the bytes (see
 * typeAndSubmit below): a gap cannot beat a machine that reads late.
 */
export const PTY_SUBMIT_DELAY_MS = 240;


/**
 * Autosend (founder, 29 Sep 2026): "Whenever the computer is slightly slow, the
 * Autosend thing does not work ... it keeps sitting there never gets sent."
 *
 * The cause, measured on Claude Code 2.1.284 (hive/shared/eng/autosend-0.5.5):
 * the CLI treats ANY single read of 64 bytes or more of plain input as a paste,
 * and a Return inside a paste is a newline. A slow machine reads late, so the
 * text and our Return land in one read however long we waited between them.
 * No gap and no screen read can fix that; the bytes have to be different.
 *
 * So for Claude:
 *  - the text always goes as bracketed pastes, which the CLI never mistakes for
 *    typed keys, split so each stays under the size where the CLI collapses it
 *    into `[Pasted text #N]` (800 characters, or 4 lines). A collapsed paste
 *    reaches the model inside a pasted content tag, and the model is told to
 *    follow instructions there only where the user's own message asks: a queued
 *    message has no other text, so it must arrive as the plain prompt;
 *  - the submit key is `ESC[13u` (CSI u Enter), which the CLI reads as Enter
 *    even inside the same read as the text;
 *  - proof of submission is the CLI's own UserPromptSubmit hook, not the screen.
 * Other providers type as before (raw, or one paste when the text has a
 * newline, then `\r`); they were not tested live and gain only the proof,
 * the stuck outcome and the log line.
 */
export const CLAUDE_SUBMIT_KEY = '\x1b[13u';
/** The oldest Claude Code proven to read CLAUDE_SUBMIT_KEY as Enter. Older
 *  versions keep `\r`, which submits after a bracketed paste too. */
export const CLAUDE_CSI_U_FLOOR: readonly [number, number, number] = [2, 1, 282];
export const CLAUDE_PASTE_MAX_CHARS = 700;
export const CLAUDE_PASTE_MAX_LINES = 3;
const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';

export interface SubmitEncoding {
  /** Everything typed before the key: the pastes, or the raw text. */
  payload: string;
  /** The submit key, written alone. */
  key: string;
  bracketed: boolean;
  /** How many bracketed pastes the payload holds (0 when raw). */
  pastes: number;
  /** A slash command: one press, no blind retry (it may open a menu). */
  slash: boolean;
}

/** A message cannot end its own paste: the markers are taken out. */
export function stripPasteMarkers(text: string): string {
  return text.split(PASTE_START).join('').split(PASTE_END).join('');
}

/** Split `text` into pieces of at most `maxChars` UTF-16 units and at most
 *  `maxLines` lines each, joined they equal `text`. Splits on code points, so a
 *  surrogate pair is never cut. A newline that would give a piece one line too
 *  many starts the next piece. */
export function splitPastes(text: string, maxChars = CLAUDE_PASTE_MAX_CHARS, maxLines = CLAUDE_PASTE_MAX_LINES): string[] {
  const out: string[] = [];
  let cur = '';
  let newlines = 0;
  for (const cp of text) {
    const nl = cp === '\n' ? 1 : 0;
    if (cur && (cur.length + cp.length > maxChars || newlines + nl > maxLines - 1)) {
      out.push(cur);
      cur = '';
      newlines = 0;
    }
    cur += cp;
    newlines += nl;
  }
  if (cur) out.push(cur);
  return out;
}

/** A slash command the CLI runs itself: `/clear`, `/compact keep x`, and not a
 *  path such as `/tmp/notes`. */
export function isSlashCommand(text: string): boolean {
  const t = text.trim();
  return !t.includes('\n') && /^\/[\w:.-]+(?:\s|$)/.test(t);
}

function versionAtLeast(v: readonly number[], floor: readonly number[]): boolean {
  for (let i = 0; i < floor.length; i++) {
    const a = v[i] ?? 0;
    if (a !== floor[i]) return a > floor[i];
  }
  return true;
}

/** How to type `text` into this provider's TUI and submit it. `claudeVersion`
 *  null means unknown, and an unknown Claude gets the current key. */
export function submitEncodingFor(
  provider: AgentProvider,
  text: string,
  claudeVersion?: readonly number[] | null
): SubmitEncoding {
  if (provider === 'claude') {
    const key = claudeVersion && !versionAtLeast(claudeVersion, CLAUDE_CSI_U_FLOOR) ? '\r' : CLAUDE_SUBMIT_KEY;
    // A slash command runs as a command bracketed too (2b Q1), as one paste; a
    // longer one than a paste may hold goes raw, which CSI u still submits.
    if (isSlashCommand(text)) {
      const clean = stripPasteMarkers(text);
      return clean.length <= CLAUDE_PASTE_MAX_CHARS
        ? { payload: PASTE_START + clean + PASTE_END, key, bracketed: true, pastes: 1, slash: true }
        : { payload: clean, key, bracketed: false, pastes: 0, slash: true };
    }
    const pieces = splitPastes(stripPasteMarkers(text).replace(/\r\n?/g, '\n'));
    return { payload: pieces.map((p) => PASTE_START + p + PASTE_END).join(''), key, bracketed: pieces.length > 0, pastes: pieces.length, slash: false };
  }
  // Antigravity prints the paste markers as text and never submits.
  // CODEX GETS ONE LINE AS A PASTE TOO (0.5.6). Codex reads a fast run of
  // plain characters as a paste, and for 120 ms after one a Return is a new
  // line, not a send (its paste_burst.rs). Our Return follows the text by 240
  // ms on OUR clock; a Codex that reads late (starting up, mid turn, a slow
  // machine) takes both in one read, and the message sat in the box until a
  // person pressed Enter. With no hook yet and no box to read there is no
  // second press either. A paste it is told about has no such window.
  // Measured on Codex 0.153.4: plain text and Return in one write, not sent;
  // the same text as one paste and Return in one write, sent; `/status` the
  // same, so a command goes as a paste as well.
  const codexLine = provider === 'codex' && text.length > 0;
  // Antigravity's bare /clear opens command completion: Return selects the
  // completion instead of running it. Finish the command token before Return,
  // so clearing still needs only one press (never a blind Enter into a menu).
  if (provider === 'antigravity' && /^\/clear\s*$/.test(text)) {
    return { payload: text.trimEnd() + ' ', key: '\r', bracketed: false, pastes: 0, slash: true };
  }
  if (provider === 'antigravity' || (!codexLine && !text.includes('\n'))) {
    return { payload: text, key: '\r', bracketed: false, pastes: 0, slash: isSlashCommand(text) };
  }
  // Multi line text as ONE paste, so a newline cannot submit a fragment (#24).
  return { payload: PASTE_START + stripPasteMarkers(text) + PASTE_END, key: '\r', bracketed: true, pastes: 1, slash: isSlashCommand(text) };
}

/**
 * How the inbox wake is written for this provider (0.5.6, shared/hiveNudge.ts).
 *
 * `oneLine`: a text with line breaks reaches this provider's TUI raw, with no
 * paste around it, so a line break in it could submit a fragment.
 *
 * `selfFile`: the app files a wake's mail when the agent's turn ends, and it
 * hears a turn end only from the CLI's own hooks or a hooks bridge. A CLI with
 * neither (Cursor) is told to file its own mail, as every agent did before.
 */
export function wakeOptionsFor(provider: AgentProvider): { oneLine: boolean; selfFile: boolean } {
  return {
    oneLine: !submitEncodingFor(provider, 'a\nb').bracketed,
    selfFile: !(providerPreset(provider).hiveAware || bridgeOf(provider)?.kind === 'hooks')
  };
}

/** The hook events that prove a slash command ran (it fires no UserPromptSubmit). */
export function commandProofEvents(text: string): string[] {
  const verb = text.trim().split(/\s+/)[0]?.toLowerCase();
  if (verb === '/clear') return ['SessionStart'];
  if (verb === '/compact') return ['PreCompact', 'SessionStart'];
  return [];
}

export const PROMPT_TAIL_CHARS = 48;

/** The end of a prompt as the hook reports it and as we typed it, comparable:
 *  pasted content tags and all whitespace removed, last 48 characters. A prompt
 *  that fused onto older stuck text still ENDS with ours. */
export function promptTail(text: string, n = PROMPT_TAIL_CHARS): string {
  return text.replace(/<\/?pasted_content[^>]*>/g, '').replace(/\s+/g, '').slice(-n);
}

/** Does a hook's prompt tail prove `ourTail` was submitted? */
export function tailMatches(hookTail: string, ourTail: string): boolean {
  return ourTail.length > 0 && hookTail.endsWith(ourTail);
}

/** No proof this long after a press: press again, alone. Each gap doubles. */
export const PTY_RETRY_AFTER_MS = 4_000;
/** Presses in all, the first included. */
export const PTY_SUBMIT_MAX_PRESSES = 4;
/** After the last press, how long proof may still arrive. */
export const PTY_FINAL_WAIT_MS = 4_000;
export const PTY_PROOF_POLL_MS = 150;

/** `gone` is main's answer to a press-only request when the process the text
 *  was typed into has exited or been replaced: the box is gone with it, so the
 *  caller clears its stuck mark and types the message again (gate G4). It is
 *  also typeAndSubmit's answer when a wake left the box with no press of ours. */
export type SubmitOutcome = 'submitted' | 'unconfirmed' | 'stuck' | 'held' | 'gone';
export type SubmitProof = 'hook' | 'activity' | 'screen' | 'none';
export interface SubmitResult {
  outcome: SubmitOutcome; proof: SubmitProof; presses: number; ms: number;
  /** Our text left the box with no press of ours (a person sent or cleared it). */
  left?: true;
  /** Held, not typed: an earlier send of ours still sits in the box (R7). */
  behind?: true;
  /** Held: why, as the submitter's log says it ('codex-screen', 'screen-unread', 'draft-or-menu', ...). Set by PtySubmitter. */
  reason?: string;
  /** Unconfirmed: the agent moved after our press and took no prompt. Its Enter may have answered something on the
   *  screen, or the prompt's own hook was lost: never typed again by itself; the person decides (trigger-prompt-058). */
  moved?: true;
}

export interface SubmitIo {
  write: (data: string) => Promise<void>;
  /** The agent's screen, or null when it cannot be read reliably. */
  screen: () => Promise<readonly string[] | null>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** This agent's CLI has sent at least one hook event since its terminal started. */
  hookChannel: () => boolean;
  /** A UserPromptSubmit whose tail matches, at or after `sinceMs`. */
  promptSeen: (sinceMs: number, tail: string) => boolean;
  /** Any hook event at or after `sinceMs`. */
  activitySeen: (sinceMs: number) => boolean;
  /** One of `events` at or after `sinceMs`. */
  eventSeen: (sinceMs: number, events: readonly string[]) => boolean;
  /** Nobody is typing in this terminal and no menu is open: we may type. */
  safeToType: () => Promise<boolean>;
  /** The same, for a key press alone. */
  safeToPress: () => Promise<boolean>;
  /** Is the text still unsubmitted on this screen? submitStillPending when not
   *  given; Codex reads its composer instead (its last two rules are the header box). */
  stillPending?: (screen: readonly string[], text: string) => boolean | null;
  log?: (line: string) => void;
}

export interface SubmitPlan {
  text: string;
  encoding: SubmitEncoding;
  /** The agent was idle when we typed. Hook activity is proof only then: a hook
   *  from a turn already running says nothing about our text. */
  idle: boolean;
  /** Press the key without typing: the text is already in the box. */
  pressOnly?: boolean;
  /** The text is a wake: when it leaves the box with no press of ours it is
   *  typed again ('gone'). Any other text is not: it may be an instruction a
   *  person already sent, or cleared on purpose. */
  wake?: boolean;
}

/**
 * Type a message and submit it, then look for proof, in this order: the CLI's
 * UserPromptSubmit with our tail (or a slash command's own event), any hook
 * activity if the agent was idle, then the screen (the text was seen in the box
 * and is gone in two reads in a row). A hook proof is final: nothing read later
 * overturns it.
 *
 * No proof: the key is pressed again, alone, 4 s, 8 s and 16 s apart, 4
 * presses in all, never while a person types or a menu is open. The text is
 * never typed twice. A first press after text stuck in the box is swallowed
 * with no visible change, so an unchanged box is no reason to stop.
 *
 * A slash command gets one press: `/model` opens a menu where Enter changes
 * the person's default model. Otherwise a press is repeated only where proof
 * can still come: the screen shows the text still in the box, or the hook
 * channel works. A send into a running turn is proved the same way: the CLI
 * fires UserPromptSubmit when the key is pressed, 0.03 to 0.07 s, not when the
 * queued message later runs (2b).
 *
 * The outcome:
 *  - submitted: proof;
 *  - stuck: the text is still in the box, or the hook channel works and the
 *    screen cannot be read, or every press was refused;
 *  - unconfirmed: no proof and no evidence of a stuck box (no hook channel and
 *    no screen, or a slash command). Treated as sent, and logged;
 *  - held: a person was typing, so nothing was typed. Try again later;
 *  - gone: a wake left the box with no press of ours (a person sent or
 *    cleared it). Nothing proves it was sent, so the caller types it again: a
 *    duplicate wake is harmless, a lost one stalls an agent. Any other text
 *    that left this way ends unconfirmed (`left` set): typed again, a person's
 *    instruction would run twice, and text cleared on purpose would come back.
 */
/**
 * A PROMPT THAT ASKS THE PERSON IS ON THE SCREEN (trigger-prompt-058, god, 9 Nov 2026: a trigger's Enter approved a
 * subagent's permission prompt, and its own text was lost). An automated line is never typed into one, and no submit
 * key is pressed while one shows. Looked for where a CLI draws it: below the last rule when a rule is drawn (Claude's
 * dialog and menus sit under one; its input box's own footer never matches), else among the last rows with text.
 * The transcript above never counts.
 */
export const ASK_ROWS = 12;
const ASK_ON_SCREEN: readonly RegExp[] = [
  // Claude: a permission ("Do you want to proceed?", "Do you want to make this edit to a.ts?").
  /\bDo you want to\b[^?]*\?/i,
  // Claude: a question or a menu, by its own key hint (as officeScreenBox.ts CLAUDE_MENU_FOOTER reads it).
  /\b(?:enter to (?:select|confirm|continue|choose)|esc(?:ape)? to (?:cancel|continue|exit|close|go back|dismiss))\b|\u2191\/?\u2193 to (?:navigate|select|move)\b/i,
  // Codex: an approval.
  /\bWould you like to (?:run|make|apply|allow)\b|\bAllow command\?|\bpress enter to confirm or esc to cancel\b|\bYes, proceed\b/i
];
export function promptOnScreen(lines: readonly string[]): boolean {
  let lastRule = -1;
  lines.forEach((l, i) => { if (isBoxRule(l)) lastRule = i; });
  const tail = (lastRule >= 0 ? lines.slice(lastRule + 1) : lines).filter((l) => l.trim() !== '').slice(-ASK_ROWS);
  return tail.some((l) => ASK_ON_SCREEN.some((re) => re.test(l)));
}

/**
 * Hook events that say a PROMPT WAS TAKEN: the CLI's own UserPromptSubmit (Gemini's BeforeAgent arrives as it), or
 * Antigravity's PreInvocation. Only these prove a press sent our line (trigger-prompt-058): a tool event, a subagent's
 * or a Stop after a press can be a dialog the Enter answered, its own text lost.
 */
export const PROMPT_TAKEN_EVENTS: readonly string[] = ['UserPromptSubmit', 'PreInvocation'];


export async function typeAndSubmit(io: SubmitIo, plan: SubmitPlan): Promise<SubmitResult> {
  const { encoding: enc, text } = plan;
  const started = io.now();
  const tail = promptTail(text);
  const events = enc.slash ? commandProofEvents(text) : [];
  let presses = 0;
  let seen = plan.pressOnly === true;
  let lastPending: boolean | null = null;
  let goneReads = 0;
  let goneUnpressed = false;
  let elsewhere = false;
  const result = (outcome: SubmitOutcome, proof: SubmitProof): SubmitResult =>
    ({ outcome, proof, presses, ms: io.now() - started });

  if (!plan.pressOnly) {
    if (!(await io.safeToType())) return result('held', 'none');
    if (enc.payload) await io.write(enc.payload);
  }

  const proof = async (): Promise<SubmitProof | null> => {
    if (io.promptSeen(started, tail)) return 'hook';
    if (events.length && io.eventSeen(started, events)) return 'hook';
    // Activity and an emptied box prove OUR press only once there was one: with
    // none, a person's Enter on our text shows as a matching prompt above. The
    // activity is a prompt taken, never a tool or a subagent working again: that
    // is a dialog our Enter answered (trigger-prompt-058).
    if (plan.idle && presses > 0 && io.eventSeen(started, PROMPT_TAKEN_EVENTS)) return 'activity';
    const lines = await io.screen();
    const p = lines ? (io.stillPending ?? submitStillPending)(lines, text) : null;
    lastPending = p;
    if (p === true) { seen = true; goneReads = 0; return null; }
    goneReads = p === false && seen ? goneReads + 1 : 0;
    if (goneReads < 2) return null;
    if (presses === 0) { goneUnpressed = true; return null; }
    return 'screen';
  };
  const press = async (): Promise<void> => {
    if (!(await io.safeToPress())) { io.log?.('a person is typing or a menu is open, press skipped'); return; }
    await io.write(enc.key);
    presses += 1;
  };

  if (!plan.pressOnly) await io.sleep(PTY_SUBMIT_DELAY_MS);
  await press();
  const once = enc.slash;
  const maxAttempts = once ? 1 : PTY_SUBMIT_MAX_PRESSES;
  let attempts = 1;
  let gap = PTY_RETRY_AFTER_MS;
  let nextAt = io.now() + gap;
  let finalAt = once ? io.now() + PTY_FINAL_WAIT_MS : Infinity;
  for (;;) {
    const found = await proof();
    if (found) return result('submitted', found);
    if (goneUnpressed) return { ...result(plan.wake === true ? 'gone' : 'unconfirmed', 'none'), left: true };
    const now = io.now();
    if (now >= finalAt) break;
    // An idle agent moved after our press and took no prompt: the Enter went to something else on its screen (a
    // dialog, a menu). Nothing more is pressed, now or below, and with no proof by the final wait it is unconfirmed:
    // never settled, its mail typed again once the screen is clear (trigger-prompt-058).
    if (!elsewhere && plan.idle && presses > 0 && io.activitySeen(started) && !io.eventSeen(started, PROMPT_TAKEN_EVENTS)) {
      elsewhere = true;
      io.log?.('the agent moved after our press with no prompt taken: no more presses');
      if (finalAt === Infinity) finalAt = now + PTY_FINAL_WAIT_MS;
    }
    if (!elsewhere && now >= nextAt && attempts < maxAttempts) {
      // Press again only where proof can still come: the text is visibly in
      // the box, or the screen cannot be read and the hook channel works (mid
      // turn too: the hook fires on the key, not when the queued message runs).
      // With no hooks and no screen a blind Return could answer a prompt nobody can see.
      if (lastPending !== true && !io.hookChannel()) break;
      // A box that shows without our text: this press is skipped, the time is kept. An Enter there has nothing of
      // ours to send and lands on whatever the CLI shows next (Stanley b8, 3c: four Enters into a CLI busy in its
      // prompt hooks); a slow TUI that paints our text later still gets the next press.
      if (lastPending === false) io.log?.('no proof yet and our text is not in the box, no press');
      else {
        io.log?.('no proof of submission yet, pressing the submit key again');
        await press();
      }
      attempts += 1;
      gap *= 2;
      nextAt = io.now() + gap;
      if (attempts >= maxAttempts) finalAt = io.now() + PTY_FINAL_WAIT_MS;
    }
    await io.sleep(PTY_PROOF_POLL_MS);
  }
  // Every press was refused: the text sits in the box, never sent. Filed as
  // sent ('unconfirmed'), the next delivery would hold on the full box forever.
  if (presses === 0) return result('stuck', 'none');
  if (elsewhere) return { ...result('unconfirmed', 'none'), moved: true };
  if (enc.slash) return result('unconfirmed', 'none');
  // No proof, and the last read did not show the text in the box. One more
  // look: a text still there gets one more Enter, and then either proof or
  // stuck. It is never left in the box as sent, where the next send would be
  // typed onto it and go in fused to it (Pam, round 6, R7).
  if (lastPending !== true) {
    const lines = await io.screen();
    if (lines && (io.stillPending ?? submitStillPending)(lines, text) === true) {
      lastPending = true;
      seen = true;
      io.log?.('no proof and the text is still in the box, pressing the submit key once more');
      await press();
      const until = io.now() + PTY_FINAL_WAIT_MS;
      while (io.now() < until) {
        await io.sleep(PTY_PROOF_POLL_MS);
        const found = await proof();
        if (found) return result('submitted', found);
      }
    }
  }
  if (lastPending === true) return result('stuck', 'none');
  if (lastPending === null && io.hookChannel()) return result('stuck', 'none');
  return result('unconfirmed', 'none');
}

/**
 * A horizontal rule a TUI draws around its input box: box drawing only, and long. Or such a rule with a label set into
 * it: Claude Code 2.1 draws the session's title in the top border of its input box, two cells in
 * ("\u2500\u2500 title \u2500\u2500\u2500\u2500\u2500"; its Ink box's borderText, position top, align start, offset 2). God's session has one once
 * /remote-control has named it, and with the top rule unread no box was ever seen: every queued send to him was held
 * "no-box" for minutes (log.jsonl 17:54 to 18:06 IST, 11 Nov), and his /remote-control was never typed.
 * With no session title, the same border carries a label at its right end instead, set flush with one rule
 * cell after it ("\u2500\u2500\u2500\u2500\u2500 Hive inbox processing (4) \u2500"; borderText, position top, align end, offset 0). God's box on RC2
 * 90d8f16f had one, the rule reader asked for three cells after the label, and his queued sends were held "no-box"
 * for 120 s and not typed (14:30 to 14:45 IST, 12 Nov), or typed 15 s late once a frame without the label came by.
 */
export function isBoxRule(line: string): boolean {
  const t = line.trim();
  if (t.length < 10) return false;
  if (!/^[\u2500-\u257F\s]+$/.test(t) && !isTitledRule(t)) return false;
  return (t.match(/[\u2500\u2501\u2550]/g) ?? []).length >= 10;
}

/**
 * A rule with one label in it: rule, a space, the label (no box drawing in it), a space, rule. Both ends are rule; the
 * right end can be a single cell (a label aligned to the end). The ten rule cells isBoxRule asks for still hold.
 */
const TITLED_RULE = /^[\u2500-\u257F]+ +[^\u2500-\u257F]{1,120}? +[\u2500-\u257F]+$/;
function isTitledRule(t: string): boolean {
  return TITLED_RULE.test(t);
}

/** Characters a TUI paints inside its input box that are not the message. */
const INPUT_CHROME = /[\u2500-\u257F\s>\u276F\u203A$#|]/g;

/**
 * Is `text` still sitting unsubmitted in the input box on this screen?
 *
 * The input box is the region between the LAST two box rules on the screen
 * (Claude Code draws a rule above and below it, Gemini a rounded box). The
 * transcript above it also echoes a submitted message, so only that region
 * counts. Whitespace is ignored because the box wraps long lines, and the tail
 * of the message is enough: a wrapped or scrolled box always shows its end,
 * where the cursor is. A collapsed paste ("[Pasted text #1 +12 lines]") counts
 * as the message too.
 *
 * Returns null when the screen shows no box at all (a CLI we cannot read):
 * no evidence, so the caller does nothing more than it did before.
 */
/** The raw lines inside the input box (between the last two box rules), or
 *  null when the screen draws no box. Used to see whether the TUI has read a
 *  keystroke: the box changes when it does. */
export function inputBoxText(screen: readonly string[]): string | null {
  const rules: number[] = [];
  screen.forEach((line, i) => { if (isBoxRule(line)) rules.push(i); });
  // OpenCode's box is drawn with no rule: it is read below the last rule, so a rule in its transcript (a
  // table, a command's output) is never taken for its box, and its shape above a Claude or Gemini box never counts.
  const open = openCodeBox(screen);
  if (open && (rules.length === 0 || open.foot > rules[rules.length - 1])) return open.text;
  if (rules.length < 2) return null;
  return screen.slice(rules[rules.length - 2] + 1, rules[rules.length - 1]).map((l) => l.replace(/\s+$/, '')).join('\n');
}

/**
 * OPENCODE'S INPUT BOX. OpenCode 1.18 and 1.19
 * draw no rule around their box: a column of "┃" at its left, its last row the agent and model ("Build · Big
 * Pickle OpenCode"), closed by a row of "╹" and half blocks ("╹▀▀▀..."), with an empty row
 * above it that sets it off from the transcript (the transcript's own "┃" rows, a sent message among them, are
 * above that row). Read as the box between two rules, its screen had no box, and every queued send was held
 * behind one ("earlier-in-box").
 * The rows above the agent's line, up to that empty row, with the box's side and its two cells of padding taken off
 * as the rules of a Claude box are; null when the screen has no such box.
 */
const OPENCODE_BOX_FOOT = /^\s*╹▀{10,}\s*$/;
const OPENCODE_BOX_SIDE = /^\s*┃ {0,2}/;
function openCodeBox(screen: readonly string[]): { text: string; foot: number } | null {
  let foot = -1;
  for (let i = screen.length - 1; i >= 0; i--) if (OPENCODE_BOX_FOOT.test(screen[i])) { foot = i; break; }
  if (foot < 0) return null;
  let top = foot;
  while (top > 0 && OPENCODE_BOX_SIDE.test(screen[top - 1])) top -= 1;
  // At least the input's row and the agent's line.
  if (foot - top < 2) return null;
  return { text: screen.slice(top, foot - 1).map((l) => l.replace(OPENCODE_BOX_SIDE, '').replace(/\s+$/, '')).join('\n'), foot };
}

export function submitStillPending(screen: readonly string[], text: string): boolean | null {
  const raw = inputBoxText(screen);
  if (raw === null) return null;
  return boxHoldsTail(raw, text, 'in');
}

/**
 * Does an input box's text hold the end of `text`? Whitespace and chrome blind,
 * the last 24 characters. `end`: only when the box ENDS with it, so nothing
 * was typed after ours. A collapsed paste (Claude's "[Pasted text #1 +12
 * lines]", Codex's "[Pasted Content 1234 chars]", OpenCode's "[Pasted ~12
 * lines]") counts as the message.
 */
export function boxHoldsTail(raw: string, text: string, at: 'in' | 'end'): boolean {
  const box = raw.replace(INPUT_CHROME, '');
  if (!box) return false;
  // "#" and the spaces are chrome, already gone.
  if (at === 'in' ? /\[Pasted(?:text|Content|~)\d+/i.test(box) : /\[Pasted(?:text\d+\+\d+lines?|Content\d+chars|~\d+lines?)\]$/i.test(box)) return true;
  const needle = text.replace(INPUT_CHROME, '');
  if (!needle) return false;
  return at === 'in' ? box.includes(needle.slice(-24)) : box.endsWith(needle.slice(-24));
}

/** An input box with nothing in it but chrome. */
export function inputBoxEmpty(raw: string): boolean {
  return raw.replace(INPUT_CHROME, '') === '';
}

/** Initial TUI output needs a short provider-specific settle before typing. */
export function terminalReadySettleMs(provider: AgentProvider): number {
  switch (provider) {
    case 'kimi': return 650;
    case 'grok': return 500;
    case 'gemini': return 500;
    case 'codex': return 500;
    default: return 400;
  }
}

/**
 * A live TUI is ready after it has produced an initial frame and had a short
 * settle period. Do not require output to become quiet: Codex can continuously
 * repaint its status line, which previously kept queued messages blocked until
 * every readiness attempt timed out.
 *
 * `undefined` is accepted for compatibility with a renderer hot-reloaded
 * against an older main process that does not yet expose `hasOutput`.
 */
export function terminalReadyToReceive(
  hasOutput: boolean | undefined,
  elapsedMs: number,
  provider: AgentProvider
): boolean {
  if (provider === 'antigravity') {
    return elapsedMs >= terminalReadySettleMs(provider);
  }
  return hasOutput !== false && elapsedMs >= terminalReadySettleMs(provider);
}
