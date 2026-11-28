/**
 * THE KEY CHECK: what the notice "Check your integrations and keys" reads
 * and what its Done does (preview 15). Electron free; index.ts registers it.
 *
 * A key waits here when the app cannot know that the person chose where it
 * goes: a key saved for an address that is not the provider's own, or for a
 * record that had its key under another address (integrations.ts). The keys
 * an older version kept are not asked about: they work at once.
 * Nothing that waits is sent or handed to an agent. The person's "This is
 * right" releases it; "Switch off" forgets it. Both happen at Done and not
 * before. The sheet opens only from the line in Integrations, Keys and secrets.
 *
 * No value ever leaves main: a key is shown by its first four and last four
 * characters and its length, or by its length alone under twelve characters.
 */
import type { IntegrationRecord } from '../shared/integrations';
import type { HeldSecret, MoveResult } from './sealedStore';

export interface KeyCheckDeps {
  held: () => HeldSecret[];
  lastMove: () => MoveResult;
  /** The names whose old key was dropped, kept on disk until the person has seen them. */
  lost: () => string[];
  seenLost: (refs: readonly string[]) => void;
  /** The names that still hold an old value (a move that stood back left them). */
  oldRefs: () => string[];
  /** The cause of a stood back move the person pressed Done on, and the call that records it. */
  skipSeen: () => string | undefined;
  seeSkip: (cause: string) => void;
  records: () => IntegrationRecord[];
  /** Both act only on the exact stored value the row was read from (`shown`). */
  release: (ref: string, shown: string) => boolean;
  forget: (ref: string, shown: string) => boolean;
  /** Switch an integration off (its record stays, without a key). */
  switchOff: (id: string) => void;
  /** The provider's name for a provider key's ref (`apikey:anthropic` is "Anthropic"), else undefined. */
  providerName: (ref: string) => string | undefined;
  /** The agent key's name for a key by name (`env:NAME` is "NAME"), else undefined. */
  envName: (ref: string) => string | undefined;
  /** Point every live grant at what is enabled now. */
  onChanged: () => void;
}

export interface KeyCheckList {
  /** `shown` marks the stored value a row was read from; the answer carries it back. */
  integrations: Array<{ ref: string; shown: string; name: string; url: string }>;
  keys: Array<{ ref: string; shown: string; name: string; provider: boolean; head: string; tail: string; length: number }>;
  /** Keys the update could not keep, by name only. They stay until Done names them (`ref`). */
  lost: Array<{ ref: string; name: string; kind: 'integration' | 'key' }>;
  /** The update could not look at the saved keys at all at this start: every
   *  old key reads as not set until it is entered again. True until the
   *  person presses Done on it; then not again for the same cause. */
  unchecked: boolean;
  /** The keys that are not in use because they could not be checked, by name
   *  only. Filled while the cause lasts, also after Done (`notInUse`). */
  uncheckedNames: Array<{ name: string; kind: 'integration' | 'key' }>;
  /** The cause still lasts at this start, whether or not the person pressed
   *  Done on it: Settings keeps saying so, and can show the names again. */
  notInUse: boolean;
}

const MAX_ANSWERS = 1000;

export function keyCheckHandlers(deps: KeyCheckDeps) {
  const recordOf = (ref: string): IntegrationRecord | undefined => deps.records().find((r) => r.secretRef === ref);
  const keyName = (ref: string): { name: string; provider: boolean } | undefined => {
    const p = deps.providerName(ref);
    if (p !== undefined) return { name: p, provider: true };
    const e = deps.envName(ref);
    return e === undefined ? undefined : { name: e, provider: false };
  };

  /** Why the move stood back at this start. */
  const stoodBackNow = (): string | undefined => {
    const skipped = deps.lastMove().skipped;
    // A key cipher has no old keys to look at: that is not a failure.
    return skipped !== undefined && skipped !== 'no-cipher' ? skipped : undefined;
  };
  /** The same, when the person has not pressed Done on that cause yet. */
  const stoodBack = (): string | undefined => {
    const skipped = stoodBackNow();
    return skipped !== undefined && deps.skipSeen() !== skipped ? skipped : undefined;
  };

  return {
    list(): KeyCheckList {
      const out: KeyCheckList = { integrations: [], keys: [], lost: [], unchecked: stoodBack() !== undefined, uncheckedNames: [], notInUse: stoodBackNow() !== undefined };
      if (out.notInUse) {
        for (const ref of deps.oldRefs()) {
          const k = keyName(ref);
          if (k) out.uncheckedNames.push({ name: k.name, kind: 'key' });
          else { const rec = recordOf(ref); if (rec) out.uncheckedNames.push({ name: rec.label, kind: 'integration' }); }
        }
      }
      for (const h of deps.held()) {
        if (h.kind === 'held' && h.url) {
          out.integrations.push({ ref: h.ref, shown: h.shown, name: recordOf(h.ref)?.label ?? h.ref, url: h.url });
        } else if (h.kind === 'held-env') {
          const k = keyName(h.ref);
          out.keys.push({ ref: h.ref, shown: h.shown, name: k?.name ?? h.ref, provider: k?.provider ?? false, head: h.head, tail: h.tail, length: h.length });
        }
      }
      const waits = new Set([...out.integrations, ...out.keys].map((r) => r.ref));
      for (const ref of deps.lost()) {
        // A name that has a key again (it waits above) is not one to set again.
        if (waits.has(ref)) continue;
        const k = keyName(ref);
        if (k) out.lost.push({ ref, name: k.name, kind: 'key' });
        else { const rec = recordOf(ref); if (rec) out.lost.push({ ref, name: rec.label, kind: 'integration' }); }
      }
      const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);
      out.integrations.sort(byName); out.keys.sort(byName); out.lost.sort(byName); out.uncheckedNames.sort(byName);
      return out;
    },

    /** Done. Every answer is checked before any is applied: an answer for a
     *  key that is not waiting, or for a value other than the one the row
     *  showed, changes nothing at all. */
    answer(payload: unknown): { ok: boolean; error?: string } {
      const list = (payload as { answers?: unknown } | null)?.answers ?? [];
      // The names to set again the person has been through: they ask nothing, Done only stops naming them.
      const seenRaw = (payload as { lost?: unknown } | null)?.lost ?? [];
      if (!Array.isArray(list) || !Array.isArray(seenRaw) || list.length > MAX_ANSWERS || seenRaw.length > MAX_ANSWERS) return { ok: false, error: 'answers required' };
      // Done on "the saved keys could not be checked": it is not shown again for the same cause.
      const sawUnchecked = (payload as { unchecked?: unknown } | null)?.unchecked === true;
      if (list.length + seenRaw.length === 0 && !sawUnchecked) return { ok: false, error: 'answers required' };
      if (seenRaw.some((r) => typeof r !== 'string')) return { ok: false, error: 'each name to set again is a text' };
      const seenLost = seenRaw as string[];
      const waiting = new Map(deps.held().map((h) => [h.ref, h]));
      const seen = new Set<string>();
      const answers: Array<{ ref: string; shown: string; keep: boolean }> = [];
      for (const a of list as Array<{ ref?: unknown; shown?: unknown; keep?: unknown } | null>) {
        if (!a || typeof a.ref !== 'string' || typeof a.shown !== 'string' || typeof a.keep !== 'boolean') return { ok: false, error: 'each answer needs a key and a yes or no' };
        if (!waiting.has(a.ref) || seen.has(a.ref)) return { ok: false, error: 'that key is not waiting for an answer; nothing was changed' };
        if (waiting.get(a.ref)?.shown !== a.shown) return { ok: false, error: 'a key changed since it was shown; nothing was changed. Look at the list again' };
        seen.add(a.ref);
        answers.push({ ref: a.ref, shown: a.shown, keep: a.keep });
      }
      const failed: string[] = [];
      try {
        for (const a of answers) {
          if (a.keep) { if (!deps.release(a.ref, a.shown)) failed.push(a.ref); continue; }
          if (!deps.forget(a.ref, a.shown)) { failed.push(a.ref); continue; }
          const rec = waiting.get(a.ref)?.kind === 'held' ? recordOf(a.ref) : undefined;
          if (rec) deps.switchOff(rec.id);
        }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      } finally {
        deps.onChanged();
      }
      if (failed.length) return { ok: false, error: `${failed.length} could not be saved; they still wait` };
      if (seenLost.length) deps.seenLost(seenLost);
      const cause = sawUnchecked ? stoodBack() : undefined;
      if (cause !== undefined) deps.seeSkip(cause);
      return { ok: true };
    }
  };
}
