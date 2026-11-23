/**
 * SLACK FILES, DOWN TO THIS MACHINE. The files sent with a Slack message are
 * fetched with the bot token into a folder the host names: this computer's
 * userData/slack-files. Out of the repo, out
 * of MemPalace. The token goes only in the Authorization header, only to
 * Slack's hosts, and is NEVER logged. No electron here.
 */
import { randomBytes } from 'node:crypto';
import { createWriteStream, mkdirSync, unlinkSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { basename, join } from 'node:path';
import { slackFileHelpers, type SlackEventFile } from '../main/slack';

export type SlackLocalFile = { path: string; name: string; mimetype: string };

/** Per-file download size cap — reject files larger than 10 MB before writing. */
export const SLACK_FILE_MAX_BYTES = 10 * 1024 * 1024;
/** Socket inactivity timeout for Slack file downloads (matches fetchText.ts's 12s). */
export const SLACK_DOWNLOAD_TIMEOUT_MS = 12_000;

/** Sanitize a Slack filename: keep only the basename, replace non-safe chars,
 *  prefix with a random hex tag to prevent collisions and path-traversal attacks. */
export function sanitizeSlackFilename(name: string | undefined, tag: string): string {
  const safe = (typeof name === 'string' && name)
    ? basename(name).replace(/[^\w.\-]/g, '_').replace(/^\.+/, '_').slice(0, 200) || 'file'
    : 'file';
  return `${tag}-${safe}`;
}

/**
 * Download a single Slack private file into destDir using the bot token.
 * Returns the local path on success, null on any failure (size limit, network,
 * an HTML login stub, too many redirects). The bot token is used only in the
 * Authorization header, only toward *.slack.com, and is NEVER logged.
 */
export function downloadSlackFile(
  file: SlackEventFile,
  botToken: string,
  destDir: string
): Promise<SlackLocalFile | null> {
  return new Promise((resolve) => {
    const tag = randomBytes(4).toString('hex');
    const filename = sanitizeSlackFilename(file.name, tag);
    const destPath = join(destDir, filename);
    const name = file.name ?? filename;
    const mimetype = file.mimetype ?? 'application/octet-stream';

    try {
      mkdirSync(destDir, { recursive: true });
    } catch {
      resolve(null);
      return;
    }

    // Prefer url_private_download; fall back to url_private.
    const startUrl = slackFileHelpers.slackFileUrl(file);
    if (!startUrl) { resolve(null); return; }

    // A file whose Slack metadata is itself HTML must NOT be refused by the stub
    // guard below (that guard catches a login or redirect page returned when auth
    // fails, see looksLikeHtmlStub).
    const expectHtml = /html/i.test(mimetype);

    // Fetch, following redirects. Slack's files-pri URL redirects (to a signed
    // URL, or without valid auth to a login page whose two line HTML body used to
    // be written to disk as the "file"). The redirect is followed, the bot token
    // is sent ONLY to Slack hosts (never to a signed CDN target or any other host
    // an event names), and an HTML auth stub is never saved.
    const attempt = (rawUrl: string, redirectsLeft: number): void => {
      let urlObj: URL;
      try { urlObj = new URL(rawUrl); } catch { resolve(null); return; }
      if (urlObj.protocol !== 'https:') { resolve(null); return; }

      const headers: Record<string, string> = {};
      if (slackFileHelpers.isSlackHost(urlObj.hostname)) headers.authorization = `Bearer ${botToken}`;

      const req = httpsRequest(
        { hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, method: 'GET', headers },
        (res) => {
          const status = res.statusCode ?? 0;

          // Follow 3xx redirects (auth goes only to Slack hosts, via `headers`).
          if (status >= 300 && status < 400 && res.headers.location) {
            res.resume(); // drain
            if (redirectsLeft <= 0) {
              console.error('[slack] file download: too many redirects, not saving');
              resolve(null); return;
            }
            let nextUrl: string;
            try { nextUrl = new URL(res.headers.location, urlObj).toString(); }
            catch { resolve(null); return; }
            attempt(nextUrl, redirectsLeft - 1);
            return;
          }

          if (status < 200 || status >= 300) {
            res.resume();
            console.error(`[slack] file download failed: HTTP ${status}, not saving`);
            resolve(null); return;
          }

          const contentType = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : undefined;
          let written = 0;
          let aborted = false;
          let stream: ReturnType<typeof createWriteStream> | null = null;
          // Remove the partial file once its stream has closed: createWriteStream opens the
          // file asynchronously, so an unlink before the open lands finds nothing and the
          // open then makes the file, kept for good. Null is answered after, so null means
          // nothing was kept.
          const discard = (): void => {
            const gone = (): void => { try { unlinkSync(destPath); } catch { /* best-effort cleanup */ } resolve(null); };
            if (!stream) { gone(); return; }
            stream.once('close', gone);
            try { stream.destroy(); } catch { gone(); }
          };
          const bail = (msg: string): void => {
            aborted = true;
            res.destroy();
            console.error(`[slack] file download: ${msg}`);
            discard();
          };

          res.on('data', (chunk: Buffer) => {
            if (aborted) return;
            if (!stream) {
              // Never write a login or auth redirect HTML stub as the file.
              // Skipped when the file's own mimetype is HTML (a real .html upload).
              if (!expectHtml && slackFileHelpers.looksLikeHtmlStub(contentType, chunk)) {
                bail('received an HTML auth redirect stub, not the file; check the bot token has files:read and access to this file');
                return;
              }
              stream = createWriteStream(destPath);
              stream.on('error', () => { res.destroy(); resolve(null); });
            }
            written += chunk.length;
            if (written > SLACK_FILE_MAX_BYTES) { bail('exceeded size cap'); return; }
            stream.write(chunk);
          });
          res.on('end', () => {
            if (aborted) return;
            if (!stream) { console.error('[slack] file download: empty response, not saving'); resolve(null); return; }
            stream.end(() => resolve({ path: destPath, name, mimetype }));
          });
          res.on('error', () => { if (aborted) return; aborted = true; discard(); });
        }
      );
      req.on('error', () => resolve(null));
      // Node has no default socket timeout: a peer that accepts the connection but
      // never responds would leave this promise pending forever, and onMessage
      // awaits the download after the webhook already acked Slack, so the inbound
      // message would be silently dropped. Destroy with an error so the 'error'
      // handler resolves null (a dropped attachment, not a dropped message).
      req.setTimeout(SLACK_DOWNLOAD_TIMEOUT_MS, () => req.destroy(new Error('timed out')));
      req.end();
    };
    attempt(startUrl, slackFileHelpers.SLACK_FILE_MAX_REDIRECTS);
  });
}

/**
 * Download all raw Slack files (up to cap) and return the local-path file list.
 * Failures are silently dropped — a partial list is still useful to the agent.
 */
export async function downloadSlackFiles(
  rawFiles: SlackEventFile[],
  botToken: string | undefined,
  destDir: string
): Promise<SlackLocalFile[]> {
  if (!rawFiles.length || !botToken) return [];
  const results = await Promise.all(
    rawFiles.map((f) => downloadSlackFile(f, botToken, destDir))
  );
  return results.filter((r): r is SlackLocalFile => r !== null);
}
