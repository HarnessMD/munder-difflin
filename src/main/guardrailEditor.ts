/**
 * The Rules screen's way to guardrail.json and the switch.
 *
 * Main only: the screen sends a whole file and the fingerprint (stamp) of the file it
 * showed; main decides. Every change the screen makes is the operator's, so each one
 * also records the new file's fingerprint in the app config (`guardrailApproved`),
 * where no agent can write. The engine loads the file only when the switch is on and
 * the file still matches that fingerprint, so a file an agent wrote while the folder
 * was unprotected is never taken for the operator's.
 *
 * A save is refused when the file changed since the screen read it (no silent
 * overwrite), when the file on disk is broken (it may hold rules the screen never
 * saw), or when the new file fails the shape check or the engine's own check.
 *
 * While the guardrail is off, the policy folder is writable by every agent. So nothing
 * here follows a symbolic link there: the file is read with O_NOFOLLOW, a linked folder
 * or file is refused, and a save writes a temp file with an unpredictable name created
 * exclusively (a planted link at that name cannot be written through) and renames it
 * into place.
 */
import { lstatSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { GUARDRAIL_FILE, guardrailHash, parseGuardrail, readGuardrailBytes, toEngineRules, validateGuardrail } from './guardrail';
import { STARTER } from './guardrailStarter';
import { PolicyEngine, type PolicyStatus } from './policy';
import type { GuardrailFile, GuardrailResult, GuardrailView } from '../shared/guardrail';

export interface GuardrailEditorDeps {
  policyDir: () => string | null;
  config: () => { guardrail?: boolean; guardrailApproved?: string };
  /** False when the write did not land (a damaged config.json pauses every save). */
  setConfig: (patch: { guardrail?: boolean; guardrailApproved?: string }) => boolean;
  /** Load guardrail.json again (HookServer.reloadPolicy). */
  reload: () => PolicyStatus;
  status: () => PolicyStatus;
  log: (row: Record<string, unknown>) => void;
}

/**
 * Write guardrail.json atomically without following a link: refuse a linked policy
 * folder, create the temp file exclusively ('wx' fails on anything already at that
 * name, a planted link included) under an unpredictable name, then rename it into
 * place (a rename replaces a link at the destination, it does not write through it).
 * `tmp` is a parameter only so a test can plant a link at it.
 */
export function writeGuardrailFile(path: string, text: string, tmp = `${path}.${randomBytes(12).toString('hex')}.tmp`): void {
  mkdirSync(dirname(path), { recursive: true });
  if (lstatSync(dirname(path)).isSymbolicLink()) throw new Error('the policy folder is a symbolic link; remove it by hand first');
  try {
    writeFileSync(tmp, text, { flag: 'wx', mode: 0o644 });
  } catch (e) {
    throw new Error(`could not create a temp file next to ${GUARDRAIL_FILE}: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

/** What the screen says when the app settings could not be written. */
const CONFIG_PAUSED = 'The app settings could not be saved: config.json is damaged, so saves are paused.';

export class GuardrailEditor {
  constructor(private d: GuardrailEditorDeps) {}

  private path(): string | null {
    const dir = this.d.policyDir();
    return dir ? join(dir, GUARDRAIL_FILE) : null;
  }

  /** The file's bytes; `error` when it cannot be read safely (a link, not a file). */
  private bytes(): { text: string | null; error: string | null } {
    const p = this.path();
    return p ? readGuardrailBytes(p) : { text: null, error: null };
  }

  read(): GuardrailView {
    const cfg = this.d.config();
    const st = this.d.status();
    const engine = { loaded: st.configured && !st.error, rulesLoaded: st.rulesLoaded, error: st.error };
    const { text, error } = this.bytes();
    if (error) return { on: cfg.guardrail === true, exists: true, file: null, text: null, error, stamp: null, approved: false, engine };
    if (text === null) return { on: cfg.guardrail === true, exists: false, file: null, text: null, error: null, stamp: null, approved: false, engine };
    const stamp = guardrailHash(text);
    const g = parseGuardrail(text);
    return {
      on: cfg.guardrail === true,
      exists: true,
      file: g.ok ? g.file : null,
      text,
      error: g.ok ? null : g.error,
      stamp,
      approved: stamp === cfg.guardrailApproved,
      engine,
    };
  }

  /** Write the operator's file, record it as approved, and load it if the guardrail is on. */
  save(next: GuardrailFile, stamp: string | null, actor = 'operator'): GuardrailResult {
    const p = this.path();
    if (!p) return { ok: false, errors: ['no hive is open'] };
    const { text, error } = this.bytes();
    if (error) return { ok: false, errors: [`the rules file cannot be used safely (${error}); remove it by hand first`] };
    if ((text === null ? null : guardrailHash(text)) !== stamp) {
      return { ok: false, errors: ['the rules file changed since this screen read it; reload and make the change again'] };
    }
    const current = text === null ? null : parseGuardrail(text);
    if (current && !current.ok) {
      return { ok: false, errors: [`the rules file is broken (${current.error}); fix it by hand or delete it first`] };
    }
    const file: GuardrailFile = { ...next, version: 1, rev: (current?.ok ? current.file.rev : 0) + 1 };
    const errors = validateGuardrail(file);
    if (!errors.length) {
      // The engine's own check (regexes, globs), on every backstop, including the ones
      // that are off, so switching one on later cannot break the file.
      const check = new PolicyEngine(null, () => {});
      check.loadRules({ version: 1, rules: toEngineRules({ ...file, rules: file.rules.map((r) => (r.backstop ? { ...r, backstop: { ...r.backstop, on: true } } : r)) }) });
      if (check.status.error) errors.push(check.status.error);
    }
    if (errors.length) return { ok: false, errors };
    const out = JSON.stringify(file, null, 2) + '\n';
    try {
      writeGuardrailFile(p, out);
    } catch (e) {
      return { ok: false, errors: [e instanceof Error ? e.message : String(e)] };
    }
    if (this.d.setConfig({ guardrailApproved: guardrailHash(out) }) === false) {
      return { ok: false, errors: [`${CONFIG_PAUSED} The rules file was saved but is not approved, so it does not load. Repair or reset the settings, then accept it here.`] };
    }
    const on = this.d.config().guardrail === true;
    const status = on ? this.d.reload() : null;
    this.d.log({
      kind: 'guardrail-saved', actor, rev: file.rev, rules: file.rules.length,
      backstops_on: file.rules.filter((r) => r.backstop?.on).length,
      rules_loaded: status?.rulesLoaded ?? null, error: status?.error ?? null,
    });
    return { ok: true, view: this.read() };
  }

  /**
   * "Turn on guardrail". With no file, writes the starter rules. With a file, turns on
   * the file the screen showed (`stamp`): the operator has seen its rules, so it becomes
   * the approved file.
   */
  turnOn(stamp: string | null, actor = 'operator'): GuardrailResult {
    const { text, error } = this.bytes();
    if (error) return { ok: false, errors: [`the rules file cannot be used safely (${error}); remove it by hand first`] };
    if (text === null) {
      if (stamp !== null) return { ok: false, errors: ['the rules file was removed since this screen read it; reload'] };
      const saved = this.save(STARTER, null, actor);
      if (!saved.ok) return saved;
    } else {
      const hash = guardrailHash(text);
      if (hash !== stamp) return { ok: false, errors: ['the rules file changed since this screen read it; reload and look at it again'] };
      const g = parseGuardrail(text);
      if (!g.ok) return { ok: false, errors: [`the rules file is broken (${g.error}); fix it by hand or delete it first`] };
      if (this.d.setConfig({ guardrailApproved: hash }) === false) return { ok: false, errors: [`${CONFIG_PAUSED} The guardrail stays off.`] };
    }
    if (this.d.setConfig({ guardrail: true }) === false) return { ok: false, errors: [`${CONFIG_PAUSED} The guardrail stays off.`] };
    const status = this.d.reload();
    this.d.log({ kind: 'guardrail-on', actor, rules_loaded: status.rulesLoaded, error: status.error });
    return { ok: true, view: this.read() };
  }

  /** "Turn off": nothing is checked or delivered, and agents are told their rules were removed. */
  turnOff(actor = 'operator'): GuardrailResult {
    if (this.d.setConfig({ guardrail: false }) === false) return { ok: false, errors: [`${CONFIG_PAUSED} The guardrail was not turned off.`] };
    this.d.reload();
    this.d.log({ kind: 'guardrail-off', actor });
    return { ok: true, view: this.read() };
  }

  /** Accept a file that changed outside this screen, after the operator has read it. */
  accept(stamp: string, actor = 'operator'): GuardrailResult {
    const { text, error } = this.bytes();
    if (error) return { ok: false, errors: [`the rules file cannot be used safely (${error}); remove it by hand first`] };
    if (text === null || guardrailHash(text) !== stamp) {
      return { ok: false, errors: ['the rules file changed since this screen read it; reload and look at it again'] };
    }
    const g = parseGuardrail(text);
    if (!g.ok) return { ok: false, errors: [`the rules file is broken (${g.error}); fix it by hand or delete it first`] };
    if (this.d.setConfig({ guardrailApproved: stamp }) === false) return { ok: false, errors: [`${CONFIG_PAUSED} These rules are not accepted.`] };
    const status = this.d.config().guardrail === true ? this.d.reload() : null;
    this.d.log({ kind: 'guardrail-accepted', actor, rev: g.file.rev, rules_loaded: status?.rulesLoaded ?? null });
    return { ok: true, view: this.read() };
  }
}
