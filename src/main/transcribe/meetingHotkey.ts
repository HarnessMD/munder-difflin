/**
 * THE MEETING CHORD (0.5.3, F16, founder 23 Sep 2026). One press anywhere on
 * the machine starts a Stapler meeting, a second press stops it: a toggle,
 * not a hold. Shift+Command+Space on the Mac, Control+Shift+Space on
 * Windows and Linux, changeable under Dictation & Meetings.
 *
 * The chord is registered through the md-hotkey helper of this platform
 * with its `tap` op (0.3.0): a second slot beside the push to talk key that
 * reports each press as `{"event":"tap"}` and nothing on release. This loop
 * owns its own helper process, so the any app loop is untouched and either
 * can run without the other. A helper without the op (an older build)
 * answers unknown-op, which becomes the `no-tap` reason in Settings.
 *
 * main-floor only, like any app: a chord is machine wide and two floors
 * armed would start two meetings. index.ts keeps that rule; this class just
 * arms what it is given.
 */
import { LineHelper, HelperError } from './lineHelper';

export interface MeetingHotkeyOptions {
  helperPath: string;
  key: string;
  onToggle: (at: number) => void;
  env?: NodeJS.ProcessEnv;
}

export type MeetingHotkeyFailure = 'no-tap' | 'bad-key' | 'register-failed' | 'start-failed';

export class MeetingHotkey {
  private helper: LineHelper;
  private armedKey: string | null = null;
  /** Presses arrive on the helper's clock; two within this window are one. */
  private lastAt = 0;

  constructor(private readonly opts: MeetingHotkeyOptions) {
    this.helper = new LineHelper(opts.helperPath, {
      env: opts.env,
      onEvent: (e) => { if (e.event === 'tap') this.pressed(typeof e.at === 'number' ? e.at : Date.now()); },
      onExit: () => { this.armedKey = null; }
    });
  }

  get armed(): string | null { return this.armedKey; }

  private pressed(at: number): void {
    if (at - this.lastAt < 250) return;
    this.lastAt = at;
    this.opts.onToggle(at);
  }

  /** Registers the chord. Throws a HelperError whose code is one of
   *  MeetingHotkeyFailure; the helper is stopped on failure. */
  async start(): Promise<{ key: string; keyCode: number }> {
    try {
      const ping = await this.helper.request({ op: 'ping' });
      if (ping.tap !== true) throw new HelperError('no-tap', { version: ping.version });
      const r = await this.helper.request({ op: 'tap', key: this.opts.key });
      this.armedKey = this.opts.key;
      return { key: this.opts.key, keyCode: Number(r.keyCode) };
    } catch (e) {
      await this.helper.stop().catch(() => { /* gone */ });
      if (e instanceof HelperError) throw e;
      throw new HelperError('start-failed', { detail: e instanceof Error ? e.message : String(e) });
    }
  }

  async stop(): Promise<void> {
    this.armedKey = null;
    if (!this.helper.running) return;
    try { await this.helper.request({ op: 'untap' }); } catch { /* the stop below ends it */ }
    await this.helper.stop().catch(() => { /* gone */ });
  }

  /** Test seam. */
  get lineHelper(): LineHelper { return this.helper; }
}
