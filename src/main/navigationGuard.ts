/**
 * A WINDOW OF THIS APP SHOWS THIS APP'S OWN PAGE, AND NOTHING ELSE.
 *
 * Every window is made with the preload, and the preload is the door to main:
 * agents, files and secrets being set. A window whose top page went somewhere
 * else would hand that door to whatever page it landed on. Nothing in the app
 * navigates a window on purpose; a link, a form or a script in text an agent
 * wrote could.
 *
 * So: the top frame of any window may load only the app's own pages. Any
 * other navigation is stopped. A web address is handed to the person's own
 * browser instead, as a link that opens a new window already is; anything
 * else (a file, another scheme) goes nowhere. Frames inside the page are not
 * touched here: they are sandboxed where they are made and never get the
 * preload.
 *
 * Pure but for the listeners at the bottom, so the rule can be tested
 * without Electron.
 */
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

/** The app's pages, by name: the office is the only one. */
export const OWN_PAGES: readonly string[] = ['index.html'];

export interface OwnPages {
  /** The dev server's address, when this is a development run (never in a packaged app); else null. */
  rendererUrl: string | null;
  /** The directory the packaged pages are loaded from (OWN_PAGES). */
  rendererDir: string;
  /** File names compare without case on macOS and Windows. Default: by platform. */
  ignoreCase?: boolean;
}

/** Whether `url` is one of the app's own pages. */
export function isOwnPage(url: string, own: OwnPages): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (own.rendererUrl) {
    try {
      const dev = new URL(own.rendererUrl);
      // The page itself, by its own scheme: a blob: or filesystem: address carries the origin and is not a page of ours.
      if ((dev.protocol === 'http:' || dev.protocol === 'https:') && u.protocol === dev.protocol && u.origin === dev.origin) return true;
    } catch { /* not an address: no dev pages */ }
  }
  // One of the app's own page files, by its whole path: not any file under the directory. (A file
  // address that names a host is a network share: fileURLToPath refuses it on macOS and Linux,
  // and on Windows gives a path that starts with the share.)
  if (u.protocol !== 'file:') return false;
  let path: string;
  try { path = resolve(fileURLToPath(u)); } catch { return false; }
  const fold = own.ignoreCase ?? (process.platform === 'darwin' || process.platform === 'win32');
  const same = (a: string, b: string): boolean => (fold ? a.toLowerCase() === b.toLowerCase() : a === b);
  return OWN_PAGES.some((page) => same(path, resolve(join(own.rendererDir, page))));
}

/** What to do with a navigation of a window's top frame. */
export type Navigation = 'allow' | 'browser' | 'stop';
export function decideNavigation(url: string, own: OwnPages): Navigation {
  if (isOwnPage(url, own)) return 'allow';
  return isWebAddress(url) ? 'browser' : 'stop';
}

/** What may be handed to the person's browser: an http or https address, and one that carries
 *  no name and password (those would be sent to the site the moment the browser opened it). */
export function isWebAddress(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try { const u = new URL(url); return !u.username && !u.password; } catch { return false; }
}

/** The part of Electron's WebContents this needs. */
export interface GuardedContents {
  on(event: 'will-navigate', listener: (e: { preventDefault(): void }, url: string) => void): unknown;
  on(event: 'will-redirect', listener: (e: { preventDefault(): void; isMainFrame?: boolean }, url: string, isInPlace: boolean, isMainFrame: boolean) => void): unknown;
  on(event: 'will-attach-webview', listener: (e: { preventDefault(): void }) => void): unknown;
  setWindowOpenHandler(handler: (details: { url: string }) => { action: 'deny' }): void;
}

/**
 * Put the rule on one window's contents. Called for every contents the app
 * ever makes (`web-contents-created`), so a window added later is covered
 * without anybody remembering to.
 */
export function guardNavigation(contents: GuardedContents, own: OwnPages, openInBrowser: (url: string) => void): void {
  const decide = (e: { preventDefault(): void }, url: string): void => {
    const what = decideNavigation(url, own);
    if (what === 'allow') return;
    e.preventDefault();
    if (what === 'browser') openInBrowser(url);
  };
  // The top frame, started by the page (a link, a form, a script).
  contents.on('will-navigate', (e, url) => decide(e, url));
  // ...and where a navigation is sent on to by a server. Only the top frame's.
  contents.on('will-redirect', (e, url, _isInPlace, isMainFrame) => { if (e.isMainFrame ?? isMainFrame) decide(e, url); });
  // A link that opens a new window never makes one: a web address goes to the browser, the rest
  // nowhere. Set here and not per window, so every window added later has it too.
  contents.setWindowOpenHandler(({ url }) => {
    if (isWebAddress(url)) openInBrowser(url);
    return { action: 'deny' };
  });
  // The app embeds no other page as a view of its own.
  contents.on('will-attach-webview', (e) => e.preventDefault());
}
