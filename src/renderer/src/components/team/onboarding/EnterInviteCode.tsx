/**
 * D2 — the code screen.
 *
 * The dashes are drawn as part of the field, so the code reads MD - XXXX - XXXX
 * the way it is written down. Paste fills all of it, because the realistic way
 * this arrives is a paste out of Slack.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from '../../PixelButton';
import { PixelPanel } from '../../PixelPanel';
import { SteppedDots } from '../primitives';
import type { CodeError } from '@shared/teams';

export type { CodeError } from '@shared/teams';

export interface EnterInviteCodeProps {
  onContinue: (code: string) => void;
  onNoCode: () => void;
  /** Plan 4.8: this person already has a seat and this is a new laptop. The
   *  sign-in alone names the seat; no code. Absent under the dev switch. */
  onSecondMachine?: () => void;
  /** Drives the failure states. Set by the caller after a failed attempt. */
  error?: CodeError | null;
  /** The relay's own sentence, shown for `refused` and `signin` when present.
   *  Never branched on: the code above is the contract, the sentence is copy. */
  errorDetail?: string | null;
  validating?: boolean;
}

const GROUPS = [4, 4];

export function EnterInviteCode({ onContinue, onNoCode, onSecondMachine, error, errorDetail, validating }: EnterInviteCodeProps) {
  const { t } = useTranslation();
  const [parts, setParts] = useState<string[]>(['', '']);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const complete = parts.every((p, i) => p.length === GROUPS[i]);
  const code = `MD-${parts[0]}-${parts[1]}`;

  function setPart(i: number, raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, GROUPS[i]!);
    setParts(p => p.map((v, j) => (j === i ? clean : v)));
    // Auto advance, so the dashes never have to be typed.
    if (clean.length === GROUPS[i] && i < GROUPS.length - 1) refs[i + 1]?.current?.focus();
  }

  /** A pasted whole code fills every group, wherever it was dropped. */
  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (text.length < 8) return;
    e.preventDefault();
    const body = text.startsWith('MD') ? text.slice(2) : text;
    setParts([body.slice(0, 4), body.slice(4, 8)]);
    refs[1]?.current?.focus();
  }

  return (
    <Centred>
      <PixelPanel variant="dialog" noPadding style={{ width: 520, maxWidth: '100%' }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
            {t('firstRun.code.title')}
          </span>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
            padding: '14px 12px',
            borderRadius: 'var(--cth-radius-md, 8px)',
            background: 'var(--cth-cream-200)',
            boxShadow: `inset 0 0 0 1px ${error ? 'var(--cth-status-blocked)' : 'var(--cth-ink-300)'}`
          }}>
            <span style={{
              fontFamily: 'var(--cth-font-mono)', fontSize: 16, color: 'var(--cth-ink-500)'
            }}>MD</span>
            {GROUPS.map((len, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--cth-font-mono)', fontSize: 16, color: 'var(--cth-ink-500)'
                }}>–</span>
                <input
                  ref={refs[i]}
                  value={parts[i]}
                  onChange={e => setPart(i, e.target.value)}
                  onPaste={onPaste}
                  aria-label={t('firstRun.code.group', { n: i + 1 })}
                  style={{
                    width: `${len + 1}ch`, background: 'transparent', border: 'none',
                    fontFamily: 'var(--cth-font-mono)', fontSize: 16, letterSpacing: '0.12em',
                    color: 'var(--cth-ink-900)', textAlign: 'center', outline: 'none'
                  }} />
              </span>
            ))}
          </div>

          {error && (
            <span style={{ fontSize: 13, color: 'var(--cth-status-blocked)' }}>
              {(error === 'refused' || error === 'signin') && errorDetail
                ? errorDetail
                : t(`firstRun.code.error.${error}`)}
            </span>
          )}

          <PixelButton
            variant="primary" size="lg" fullWidth
            disabled={!complete || validating}
            onClick={() => onContinue(code)}>
            {validating
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <SteppedDots color="currentColor" />{t('firstRun.code.checking')}
                </span>
              : error === 'offline' || error === 'signin' ? t('firstRun.code.retry') : t('common.continue')}
          </PixelButton>

          <button
            onClick={onNoCode}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 13, color: 'var(--cth-ink-500)', textDecoration: 'underline'
            }}>{t('firstRun.code.noCode')}</button>
          {onSecondMachine && (
            <button
              type="button"
              onClick={onSecondMachine}
              disabled={validating}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-500)',
                textDecoration: 'underline', textUnderlineOffset: 3
              }}>{t('firstRun.code.secondMachine')}</button>
          )}
        </div>
      </PixelPanel>
    </Centred>
  );
}

export function Centred({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100%', height: '100%', minHeight: 400,
      background: 'var(--cth-cream-50)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>{children}</div>
  );
}
