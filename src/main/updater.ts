import { app, ipcMain, shell } from 'electron';
import type { WebContents } from 'electron';
import { request as httpsRequest } from 'node:https';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readConfig } from './config';
import { DEFAULT_DROP_HTML } from '../shared/releaseDrop';
import { reduceStatus, isNewer, REPO, shouldShowReleaseDrop, type UpdateStatus } from '../shared/updateState';

/**
 * The update notice.
 *
 * Releases are source only. A GitHub release carries its notes and GitHub's own
 * source archive, nothing is signed, and people build the app themselves. So
 * this file never downloads or installs anything. It asks GitHub for
 * `releases/latest` of REPO, compares that tag with the running version, and
 * when the tag is newer it reports an `available` status. The toolbar badge, the
 * toast and Settings show it, with a button that opens the release page
 * (`update:openRelease`).
 *
 * Everything is gated on the `autoUpdate` HarnessConfig flag (default ON,
 * Settings → General) and on `app.isPackaged`, so dev runs never poll.
 *
 * Every failure is shown to the renderer AND appended to `updater.log` in
 * userData, so a check that stops working leaves a trace.
 */

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
/** A request that goes quiet for this long is cut off and reported. */
const REQUEST_TIMEOUT_MS = 10_000;
/** The release body is RELEASE.md, tens of KB. A reply past this is not a release. */
const MAX_BODY = 262_144;

export type { UpdateStatus };

let sendTo: (() => WebContents | null) | null = null;
let started = false;
/** Remembered so a status survives a renderer reload and can be re-served. */
let lastStatus: UpdateStatus | null = null;
/** The check in flight, so overlapping asks share one request. */
let inflight: Promise<{ ok: boolean; error?: string }> | null = null;
/** A redirect is logged once per run, not on every 6 hour check. */
let redirectLogged = false;

/** Append-only breadcrumb trail in userData. The whole point of this file's
 *  existence is that the last failure left no trace anywhere. */
function logLine(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log('[updater]', msg);
  try {
    const dir = app.getPath('userData');
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, 'updater.log'), line);
  } catch { /* logging must never take the app down */ }
}

function emit(status: UpdateStatus): void {
  lastStatus = reduceStatus(lastStatus, status);
  try { sendTo?.()?.send('update:status', lastStatus); } catch { /* window tore down */ }
}

function autoUpdateEnabled(): boolean {
  try {
    return readConfig().autoUpdate !== false; // default ON
  } catch {
    return true;
  }
}

function errText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.length > 300 ? `${m.slice(0, 300)}…` : m;
}

type Fetched = { ok: true; json: unknown } | { ok: false; error: string };

/** Where a redirect from the GitHub API may lead: back to api.github.com over
 *  https, and nowhere else. GitHub answers a moved repository with a 301 to
 *  /repositories/<id>/..., which this admits. */
function redirectTarget(location: string, from: string): string | null {
  try {
    const u = new URL(location, from);
    return u.protocol === 'https:' && u.hostname === 'api.github.com' ? u.href : null;
  } catch {
    return null;
  }
}

/**
 * GET one GitHub API URL and parse the JSON reply.
 *
 * Follows at most `redirects` redirects, one by default. That is what keeps the
 * notice working when the repository moves again before REPO is changed: GitHub
 * answers the old name with a 301 instead of the release. Never throws, and
 * calls `done` exactly once.
 */
function getJson(url: string, done: (r: Fetched) => void, redirects = 1): void {
  let settled = false;
  const finish = (r: Fetched): void => {
    if (settled) return;
    settled = true;
    done(r);
  };
  try {
    const req = httpsRequest(
      url,
      {
        method: 'GET',
        headers: { 'User-Agent': 'munder-difflin-updater', Accept: 'application/vnd.github+json' },
        timeout: REQUEST_TIMEOUT_MS
      },
      (res) => {
        const code = res.statusCode ?? 0;
        if (code >= 300 && code < 400) {
          res.resume();
          const location = res.headers.location;
          const next = typeof location === 'string' ? redirectTarget(location, url) : null;
          if (next && redirects > 0) {
            if (!redirectLogged) {
              redirectLogged = true;
              logLine(`GitHub answered ${code} for ${url}; following it to ${next}`);
            }
            getJson(next, finish, redirects - 1);
          } else {
            finish({ ok: false, error: `GitHub answered ${code} and the redirect was not followed` });
          }
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (d: string) => {
          body += d;
          if (body.length > MAX_BODY) {
            finish({ ok: false, error: 'GitHub sent a reply too large to be a release' });
            req.destroy();
          }
        });
        res.on('error', (e) => finish({ ok: false, error: errText(e) }));
        res.on('end', () => {
          if (code !== 200) {
            finish({ ok: false, error: `GitHub answered ${code}` });
            return;
          }
          try {
            finish({ ok: true, json: JSON.parse(body) });
          } catch {
            finish({ ok: false, error: 'GitHub sent a reply that is not JSON' });
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error(`GitHub did not answer within ${REQUEST_TIMEOUT_MS / 1000}s`)));
    req.on('error', (e) => finish({ ok: false, error: errText(e) }));
    req.end();
  } catch (e) {
    finish({ ok: false, error: errText(e) });
  }
}

/** Body of the release tagged v{version}, or undefined. Never throws. */
function fetchReleaseBody(version: string, done: (notes: string | undefined) => void): void {
  getJson(`https://api.github.com/repos/${REPO}/releases/tags/v${version}`, (r) => {
    const body = r.ok ? (r.json as { body?: unknown } | null)?.body : undefined;
    done(typeof body === 'string' ? body : undefined);
  });
}

/**
 * One check against releases/latest. Always ends in a definite state
 * (`available`, `not-available` or `error`), so the badge never stays on
 * `checking`. Never throws.
 */
function runCheck(): Promise<{ ok: boolean; error?: string }> {
  if (inflight) return inflight;
  const check = new Promise<{ ok: boolean; error?: string }>((resolve) => {
    emit({ state: 'checking' });
    getJson(`https://api.github.com/repos/${REPO}/releases/latest`, (r) => {
      const fail = (error: string): void => {
        logLine(`check failed: ${error}`);
        emit({ state: 'error', message: error });
        resolve({ ok: false, error });
      };
      if (!r.ok) { fail(r.error); return; }
      const rel = (r.json ?? {}) as { tag_name?: unknown; html_url?: unknown; body?: unknown };
      const tag = typeof rel.tag_name === 'string' ? rel.tag_name : '';
      if (!tag) { fail('GitHub named no tag for the latest release'); return; }
      const current = app.getVersion();
      if (!isNewer(tag, current)) {
        emit({ state: 'not-available' });
        resolve({ ok: true });
        return;
      }
      const version = tag.replace(/^v/, '');
      // GitHub's own page for the release. After a move it names the new
      // owner, which is why openRelease also admits the page named here.
      const url = typeof rel.html_url === 'string' && rel.html_url.startsWith('https://github.com/')
        ? rel.html_url
        : `https://github.com/${REPO}/releases/tag/${tag}`;
      if (lastStatus?.state !== 'available' || lastStatus.version !== version) {
        logLine(`v${version} is available (running v${current})`);
      }
      emit({
        state: 'available',
        version,
        url,
        // Already in the reply just parsed, so carrying it costs nothing and
        // lets the toast show what is new. NOT a new request: see
        // TELEMETRY.md, this app never adds one.
        notes: typeof rel.body === 'string' ? rel.body : undefined
      });
      resolve({ ok: true });
    });
  });
  inflight = check;
  void check.finally(() => { if (inflight === check) inflight = null; });
  return check;
}

/** Only ever a release page of this project: this is not a generic opener. The
 *  page the last check named is admitted as well, because after a repository
 *  move the poll follows GitHub's redirect and that page lives under the new
 *  name until REPO is changed to match. */
function mayOpen(href: string): boolean {
  if (href.startsWith(`https://github.com/${REPO}/`)) return true;
  return lastStatus?.state === 'available' && href === lastStatus.url && href.startsWith('https://github.com/');
}

/** DEV ONLY — a realistic release body for `update:simulate`.
 *
 *  Structurally a copy of the REAL v0.4.4 release body, not of CHANGELOG.md, and
 *  the difference is load-bearing: summarizeReleaseNotes digests the first section
 *  that yields list items, so it must skip a title, a marketing paragraph, a rule
 *  and a `> [!IMPORTANT]` block before reaching the bullets. Fed the CHANGELOG
 *  shape instead (bold lead paragraph, then `### Fixed`) it returns ONE bullet —
 *  the lead paragraph, clipped mid-sentence. Verified against the published
 *  v0.4.4-rc.1 body: this shape yields the same 3 bullets the real toast shows. */
const SIMULATED_NOTES = `# Munder Difflin v9.9.9

**A local hive of Claude Code, Antigravity, Codex, Grok & Copilot agents that run themselves** —
messaging, routing, and remembering, coordinated by your clone, Michael, who you talk to.

---

## What's new in 9.9.9 — *simulated release*

**On Windows, agents were never told they could message each other.** They started, rendered, and
looked perfectly healthy — but a multi-line prompt handed to a CLI through \`cmd.exe\` is cut off at
its first newline.

- **Agent-to-agent messaging works on Windows.** Prompt-carrying spawns now run the CLI's real
  interpreter directly instead of routing through \`cmd.exe\`, so the whole protocol survives.
- **Setup can finish again.** Accepting the suggested \`~/HarnessAgents\` folder wrote a literal
  \`~\`, and the wizard then died on \`ENOENT: mkdir '~/HarnessAgents'\`.
- **Copying from a terminal is clean.** The Edit menu was intercepting ⌘C before the terminal saw it.
- **Agent terminals are UTF-8.** They ran with no locale at all.`;

/**
 * Start the update notice. Call once from app.whenReady with an accessor for the
 * primary window's webContents. Safe to call in dev (registers IPC, no polling).
 */
export function initUpdateNotice(getWebContents: () => WebContents | null): void {
  sendTo = getWebContents;

  // IPC surface is registered unconditionally so the renderer can always call it.
  ipcMain.handle('update:checkNow', async () => {
    if (!app.isPackaged) return { ok: false, error: 'dev build — updates are only checked in packaged apps' };
    return runCheck();
  });
  /** Re-serve the last known status to a freshly loaded window. */
  ipcMain.handle('update:current', () => lastStatus ?? { state: 'idle' });
  /**
   * DEV ONLY: push a synthetic status so the update notice can be seen without
   * a real release. The toast renders for a newer release and for a release
   * drop, and a dev build never polls (the block at the end of this function is
   * behind `app.isPackaged`, and checkNow refuses above). So without this the
   * one UI that only appears at release time is the one nobody can look at
   * while building it.
   *
   * Hard-gated on `!app.isPackaged` — in a shipped build this handler answers
   * `{ok:false}` and can never fabricate an update for a real user.
   */
  ipcMain.handle('update:simulate', (_evt, opts: unknown) => {
    if (app.isPackaged) return { ok: false, error: 'simulate is dev-only' };
    const o = (opts ?? {}) as { version?: string; notes?: string; drop?: boolean };
    const version = typeof o.version === 'string' && o.version ? o.version : '9.9.9';
    // `drop: true` previews the centered release page built from the default
    // template; without it you get the corner digest toast. Both paths ship, so
    // both need to be previewable — defaulting to one would leave the other
    // only ever seen by users.
    const notes = typeof o.notes === 'string'
      ? o.notes
      : o.drop === true
        ? `<!-- drop -->\n${DEFAULT_DROP_HTML}\n<!-- /drop -->`
        : SIMULATED_NOTES;
    emit({ state: 'available', version, notes, url: `https://github.com/${REPO}/releases/tag/v${version}` });
    logLine(`SIMULATED available ${version} (dev only)`);
    return { ok: true };
  });
  // DEV ONLY — `MD_DROP_PREVIEW=<path to a release body .md>` (see
  // `npm run dev:drop`) feeds that file through the simulate path on boot, so a
  // drop under authoring opens centred the moment the window is up, with no
  // DevTools paste. The renderer pulls `update:current` on mount, so emitting
  // before the window exists is fine. Same hard gate as `update:simulate`.
  const previewPath = process.env.MD_DROP_PREVIEW;
  if (!app.isPackaged && previewPath) {
    try {
      const notes = readFileSync(previewPath, 'utf8');
      const m = notes.match(/what[’']?s\s+new\s+in\s+v?(\d+\.\d+\.\d+)/i) ?? notes.match(/\bv(\d+\.\d+\.\d+)\b/);
      const version = m?.[1] ?? '9.9.9';
      emit({ state: 'available', version, notes, url: `https://github.com/${REPO}/releases/tag/v${version}` });
      logLine(`SIMULATED available ${version} from MD_DROP_PREVIEW=${previewPath} (dev only)`);
    } catch (e) {
      logLine(`MD_DROP_PREVIEW unreadable: ${errText(e)}`);
    }
  }
  // First launch after the version moved: show THIS release's page. The stamp
  // is the updater's own (analytics keeps a separate one that only exists when
  // telemetry initialised). Skipped when a preview is being forced, and the
  // fetch failing just means no page, never a broken boot.
  if (!previewPath) {
    try {
      const stampFile = join(app.getPath('userData'), 'last-run-version');
      let previous: string | null = null;
      try { previous = readFileSync(stampFile, 'utf8').trim() || null; } catch { /* first run */ }
      const current = app.getVersion();
      // The stamp write stays UNCONDITIONAL on a version change (it already ran
      // even when `previous` was null), which is what arms every install that
      // boots this version even once. Its own try/catch so an unwritable
      // userData cannot skip the decision below by throwing to the outer catch.
      let stamped = false;
      if (previous !== current) {
        try {
          mkdirSync(app.getPath('userData'), { recursive: true });
          writeFileSync(stampFile, current + '\n', 'utf8');
          stamped = true;
        } catch (e) {
          logLine(`last-run-version stamp failed: ${errText(e)}`);
        }
      }
      // Gated on the stamp having LANDED, not merely been attempted: if the
      // stamp cannot be written, `previous` stays null on every future launch,
      // so firing here would reopen the drop on every single boot forever.
      // Showing it zero times on an unwritable userData is the lesser failure.
      if (stamped && shouldShowReleaseDrop(previous, current)) {
        logLine(`first run of ${current} (previous ${previous ?? 'none'}); fetching its release page`);
        fetchReleaseBody(current, (notes) => {
          emit({ state: 'just-updated', version: current, notes });
          logLine(`just-updated ${current} ${notes ? 'with' : 'without'} release notes`);
        });
      }
    } catch (e) {
      logLine(`post-update check failed: ${errText(e)}`);
    }
  }
  ipcMain.handle('update:openRelease', (_evt, url: unknown) => {
    const href = typeof url === 'string' ? url : `https://github.com/${REPO}/releases/latest`;
    if (!mayOpen(href)) return { ok: false };
    void shell.openExternal(href);
    return { ok: true };
  });

  if (!app.isPackaged) return;
  if (started) return;
  started = true;

  const tick = (): void => { if (autoUpdateEnabled()) void runCheck(); };
  // First check shortly after boot (don't compete with spawn/startup I/O),
  // then every CHECK_INTERVAL_MS.
  setTimeout(tick, 30_000);
  setInterval(tick, CHECK_INTERVAL_MS);
}
