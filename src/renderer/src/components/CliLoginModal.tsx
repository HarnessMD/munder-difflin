/**
 * The sign in modal over an agent's terminal (0.5.3, I2 part 2).
 *
 * The CLI printed how to sign in; this shows the same thing in the app's own
 * words, so nobody has to read a raw terminal: **Open link** (main opens the
 * link it read from the CLI), the one time code in large type with **Copy**,
 * a field for a code the site shows that the CLI wants pasted back (written
 * into the pty by main), or, for a CLI that wants an API key, a masked field
 * that goes to the app's write only key store, the same place BYOK keys live.
 * The terminal stays visible behind a light scrim and **Use the terminal**
 * closes the modal for people who would rather type there. The modal goes
 * by itself when the CLI says the sign in ended.
 *
 * Built from the kit (founder, 23 Sep 2026, with CliMissingCard): the kit Btn
 * for every action, the kit surface for the box, the kit input styles for the
 * fields, tokens only. The scrim says `pointerEvents: 'auto'` and
 * `cursor: 'default'` out loud so an ancestor that passes clicks through
 * cannot leave these controls drawn but dead.
 */
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LOGIN_KEY_BACKENDS, type LoginPrompt } from '@shared/cliLogin';
import { actOnLogin, useCliSetup } from './terminalPool';
import { Btn, inputStyle, monoInputStyle, proToast } from './pro/ui';

const scrim: CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  background: 'color-mix(in srgb, var(--cth-paper-100) 78%, transparent)', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-700)',
  pointerEvents: 'auto', cursor: 'default',
  // F3, same as CliMissingCard: xterm's own layers hold z-index 2..10 in this
  // stacking context, and a z auto scrim loses the hit test to the grid's
  // canvas: buttons drawn but dead, the terminal's I-beam over them.
  zIndex: 20
};
const box: CSSProperties = {
  maxWidth: 520, width: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
  border: '1px solid var(--cth-ink-300)', borderRadius: 12, background: 'var(--cth-cream-50)'
};
const field: CSSProperties = { ...monoInputStyle, minWidth: 0, flex: 1 };
/** The link, once, at most two lines and an ellipsis (founder 25 Sep: an oauth
 *  link is 400 characters); the whole link is in the title and on Copy link. */
const linkText: CSSProperties = {
  fontSize: 11.5, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', wordBreak: 'break-all',
  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minWidth: 0
};
/** One line, clipped: the CLI's own words under the buttons. */
const lineText: CSSProperties = { fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 };

export function CliLoginModal({ ptyId, prompt }: { ptyId: string; prompt: LoginPrompt }) {
  const { t } = useTranslation();
  // Batch 2: after an install the agent starts from the panel's button, not
  // by itself, so the modal says where to go once the site says yes.
  const afterSetup = useCliSetup(ptyId)?.phase === 'signin';
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [backend, setBackend] = useState<string>(LOGIN_KEY_BACKENDS[0]);
  const [note, setNote] = useState<string | null>(null);

  const openLink = async () => {
    setBusy(true); setNote(null);
    try { const r = await actOnLogin(ptyId, 'open-link'); if (!r.ok) setNote(t('terminal.cliLogin.refused', { error: r.error ?? '' })); }
    finally { setBusy(false); }
  };
  const copyCode = () => { if (prompt.code) { void window.cth.copyToClipboard(prompt.code); proToast(t('terminal.cliLogin.copied')); } };
  const paste = async () => {
    if (!text.trim()) return;
    setBusy(true); setNote(null);
    try { const r = await actOnLogin(ptyId, 'paste', text.trim()); if (r.ok) setText(''); else setNote(t('terminal.cliLogin.refused', { error: r.error ?? '' })); }
    finally { setBusy(false); }
  };
  const saveKey = async () => {
    if (!text.trim()) return;
    setBusy(true); setNote(null);
    try {
      const r = await window.cth.providerKeySet({ backend, key: text.trim() });
      if (r.ok) { setText(''); setNote(t('terminal.cliLogin.keySaved')); }
      else setNote(t('terminal.cliLogin.refused', { error: r.error ?? '' }));
    } finally { setBusy(false); }
  };
  const dismiss = () => { void actOnLogin(ptyId, 'dismiss'); };

  const title = prompt.kind === 'api-key' ? t('terminal.cliLogin.titleKey') : t('terminal.cliLogin.title');
  const what = prompt.kind === 'device-code' ? t(afterSetup ? 'terminal.cliLogin.deviceWhatSetup' : 'terminal.cliLogin.deviceWhat')
    : prompt.kind === 'browser' ? t(afterSetup ? 'terminal.cliLogin.browserWhatSetup' : 'terminal.cliLogin.browserWhat')
    : prompt.kind === 'paste-code' ? t('terminal.cliLogin.pasteWhat')
    : t('terminal.cliLogin.keyWhat');

  return (
    <div style={scrim} data-cli-login={prompt.kind} data-cli-login-recipe={prompt.recipe} role="dialog" aria-label={title}>
      <div style={box}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{title}</span>
        <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{what}</span>
        {prompt.code && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 26, letterSpacing: 2, fontWeight: 600, color: 'var(--cth-ink-900)' }} data-cli-login-code>{prompt.code}</span>
            <Btn size="sm" onClick={copyCode}>{t('terminal.cliLogin.copy')}</Btn>
          </div>
        )}
        {prompt.url && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span style={linkText} title={prompt.url} data-cli-login-url>{prompt.url}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Open link only for a link the provider's own recipe read on that
                  provider's sign in host (prompt.trusted, checked again in main);
                  anything else gets Copy link and the warning, no button. */}
              {prompt.trusted && (prompt.kind === 'device-code' || prompt.kind === 'browser' || prompt.kind === 'paste-code') && (
                <Btn kind="primary" size="sm" disabled={busy} onClick={() => { void openLink(); }} dataAttrs={{ 'data-cli-login-open': 'true' }}>{t('terminal.cliLogin.openLink')}</Btn>
              )}
              <Btn size="sm" onClick={() => { void window.cth.copyToClipboard(prompt.url as string); proToast(t('terminal.cliLogin.linkCopied')); }} dataAttrs={{ 'data-cli-login-copy': 'true' }}>{t('terminal.cliLogin.copyLink')}</Btn>
            </div>
            {!prompt.trusted && <span style={{ fontSize: 11.5 }} data-cli-login-unvouched>{t('terminal.cliLogin.linkFromTerminal')}</span>}
          </div>
        )}
        {(prompt.kind === 'paste-code') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={field} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('terminal.cliLogin.pastePlaceholder')} disabled={busy} data-cli-login-paste
              onKeyDown={(e) => { if (e.key === 'Enter') void paste(); }} />
            <Btn kind="primary" size="sm" disabled={busy || !text.trim()} onClick={() => { void paste(); }}>{t('terminal.cliLogin.paste')}</Btn>
          </div>
        )}
        {prompt.kind === 'api-key' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select style={{ ...inputStyle, height: 32, flex: '0 0 auto' }} value={backend} onChange={(e) => setBackend(e.target.value)} disabled={busy} data-cli-login-backend>
              {LOGIN_KEY_BACKENDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <input style={field} type="password" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('terminal.cliLogin.keyPlaceholder')} disabled={busy} data-cli-login-key autoComplete="off" />
            <Btn kind="primary" size="sm" disabled={busy || !text.trim()} onClick={() => { void saveKey(); }}>{t('terminal.cliLogin.saveKey')}</Btn>
          </div>
        )}
        {note && <span style={{ fontSize: 12 }}>{note}</span>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn kind="ghost" size="sm" onClick={dismiss} dataAttrs={{ 'data-cli-login-dismiss': 'true' }}>{t('terminal.cliLogin.useTerminal')}</Btn>
        </div>
        {/* The CLI's own words, never the link a second time. */}
        {prompt.line && !(prompt.url && prompt.line.includes(prompt.url)) && !/https?:\/\//.test(prompt.line) && (
          <span style={lineText} title={prompt.line} data-cli-login-line>{prompt.line}</span>
        )}
      </div>
    </div>
  );
}
