/**
 * One place that fetches text over https.
 *
 * Extracted from skills.ts when the hero payload needed the same thing: two
 * copies of redirect-following, timeout and status handling would drift, and the
 * one that drifted would be the one nobody was looking at.
 *
 * https only, by construction — every caller fetches from raw.githubusercontent
 * or a repo URL, and an http: fallback would silently downgrade content the app
 * then renders.
 */
import { request as httpsRequest } from 'node:https';

/**
 * The bytes of a URL, untouched. 0.5.3, bug 9: the skill installer used to read
 * every file through `getText`, which decodes as UTF-8, so a font or an image
 * came back with every invalid sequence replaced and was written to disk
 * broken. Anything that is not known to be text goes through here.
 *
 * `maxBytes` is enforced on what actually arrives, not on a size somebody
 * declared: a listing can understate a file.
 */
/** How many redirects one fetch may follow. raw.githubusercontent needs one or
 *  two for a branch alias; a loop needs a stop. */
const MAX_REDIRECTS = 5;

export function getBytes(url: string, opts: { timeoutMs?: number; maxBytes?: number } = {}, hops = 0): Promise<Buffer> {
  const timeoutMs = opts.timeoutMs ?? 12000;
  return new Promise((resolve, reject) => {
    // Settle ONCE, whatever order the events come in.
    let done = false;
    const finish = (err: Error | null, body?: Buffer): void => {
      if (done) return;
      done = true;
      if (err) reject(err); else resolve(body as Buffer);
    };
    let target: URL;
    try { target = new URL(url); } catch { finish(new Error(`not a URL: ${url}`)); return; }
    if (target.protocol !== 'https:') { finish(new Error(`refusing a fetch that is not https: ${target.protocol}//${target.host}`)); return; }
    const req = httpsRequest(target, { method: 'GET', headers: { 'user-agent': 'munder-difflin' } }, (res) => {
      // Follow a redirect once per hop; raw.githubusercontent does this for
      // branch aliases and the request just fails without it.
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (hops >= MAX_REDIRECTS) { finish(new Error(`too many redirects (${MAX_REDIRECTS})`)); return; }
        // A Location may be relative; it is relative to THIS url.
        let nextUrl: string;
        try { nextUrl = new URL(res.headers.location, target).toString(); } catch { finish(new Error('redirect to something that is not a URL')); return; }
        getBytes(nextUrl, opts, hops + 1).then((b) => finish(null, b), (e) => finish(e instanceof Error ? e : new Error(String(e))));
        return;
      }
      if (res.statusCode !== 200) { res.resume(); finish(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks: Buffer[] = [];
      let seen = 0;
      res.on('data', (c: Buffer) => {
        seen += c.length;
        if (opts.maxBytes !== undefined && seen > opts.maxBytes) { req.destroy(new Error('larger than expected')); finish(new Error('larger than expected')); return; }
        chunks.push(c);
      });
      res.on('end', () => finish(null, Buffer.concat(chunks)));
      // Once a response exists, `req` stops reporting errors and the idle timeout
      // dies with the socket. A connection reset mid body therefore reached
      // NOTHING, the promise never settled, and whatever awaited it (the skill
      // installer's Promise.all) span for ever. A body that stops early is an
      // error, never a short success: `end` is the only success.
      res.on('error', (e) => finish(e instanceof Error ? e : new Error(String(e))));
      res.on('aborted', () => finish(new Error('the connection closed before the whole file arrived')));
      res.on('close', () => finish(new Error('the connection closed before the whole file arrived')));
    });
    req.on('error', (e) => finish(e));
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('timed out')); finish(new Error('timed out')); });
    req.end();
  });
}

export function getText(url: string, opts: { timeoutMs?: number } = {}): Promise<string> {
  return getBytes(url, opts).then((b) => b.toString('utf8'));
}
