/**
 * Load a workspace image over IPC and hand back a `blob:` URL for it.
 *
 * WHY A HOOK, AND WHY BLOB: the renderer cannot read the disk. The CSP is
 * `default-src 'self'` with `img-src 'self' data: blob:` and the app registers
 * no file protocol, so `<img src="file:///…">` fails silently — the classic
 * dead end for "why is my screenshot blank". Bytes therefore come over
 * `fs:readBinary` and get wrapped locally.
 *
 * `blob:` over `data:`: a data URI base64-encodes the payload, inflating a 6 MB
 * screenshot to ~8 MB of JavaScript STRING that lives in the heap for as long as
 * the element does, and re-decodes on every render. A blob URL is a handle to
 * bytes the browser already holds, and it is cheap to pass around.
 *
 * The catch — and the reason every consumer must go through this hook — is that
 * a blob URL is a document-scoped registration that is NOT garbage collected
 * when the <img> disappears. The IDE opens and closes image tabs, and a markdown
 * report can hold a dozen screenshots; without an explicit revoke, every open
 * would strand its bytes for the lifetime of the window. The effect cleanup here
 * is the only revoke site, so "mounted" and "URL alive" are the same interval by
 * construction.
 *
 * SVG note: an SVG loaded through <img> renders in the browser's static secure
 * mode — no scripts, no external fetches — so agent-authored SVGs are safe to
 * display this way even though their source is executable-looking markup.
 */
import { useEffect, useState } from 'react';

export type WorkspaceImageState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; mime: string; size: number }
  | { status: 'error'; error: string };

/** What one `fs:readBinary` round trip settles to. */
export type WorkspaceImageRead = Awaited<ReturnType<Window['cth']['readBinary']>>;

/**
 * Run one image read so that EVERY failure comes back as `{ ok: false, error }`
 * — never as a throw.
 *
 * A trailing `.catch()` only sees a REJECTED promise. A read that throws while
 * being CALLED (the preload bridge missing, or throwing before it returns a
 * promise) escapes it, and inside an effect that exception unmounts the whole
 * preview through the error boundary instead of turning one image into a chip.
 * Taking a thunk puts the call itself inside the `try`.
 */
export async function settleImageRead(read: () => Promise<WorkspaceImageRead>): Promise<WorkspaceImageRead> {
  try {
    return await read();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function useWorkspaceImage(
  root: string | null | undefined,
  rel: string | null | undefined
): WorkspaceImageState {
  const [state, setState] = useState<WorkspaceImageState>({ status: 'loading' });

  useEffect(() => {
    if (!root || !rel) {
      setState({ status: 'error', error: 'no file' });
      return;
    }
    let alive = true;
    let created: string | null = null;
    setState({ status: 'loading' });

    void settleImageRead(() => window.cth.readBinary(root, rel)).then((res) => {
      // Bail BEFORE creating the URL when the consumer already unmounted — a URL
      // created after cleanup has run would never be revoked by anyone.
      if (!alive) return;
      if (!res.ok) { setState({ status: 'error', error: res.error }); return; }
      created = URL.createObjectURL(new Blob([res.bytes], { type: res.mime }));
      setState({ status: 'ready', url: created, mime: res.mime, size: res.size });
    }).catch((e: unknown) => {
      if (alive) setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    });

    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [root, rel]);

  return state;
}
