/**
 * The editable command line. Every place an agent is started shows the exact
 * line that will run, lets a person change it, and offers one way back to the
 * line the picks resolve to.
 *
 * Controlled and dumb on purpose: the caller owns the text and decides when a
 * draft is committed. The "use resolved" button shows only while the text
 * differs from the resolved line, which is also how a person sees that what
 * they are looking at is a hand edit.
 */
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { settingsKit } from './settings/classicChrome';

export function CommandField({ value, resolved, onChange, ariaLabel, placeholder, disabled, testId, error }: {
  value: string;
  /** The line the current picks resolve to. Empty means there is none to offer. */
  resolved: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
  /** Said under the box, in the bad tone, when the line cannot be run as it is. */
  error?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      {/* Wraps: in a narrow panel the button beside a box that must also fit a
          long line would leave the box a few characters wide. */}
      <div data-command-field={testId} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', minWidth: 0 }}>
        <input
          aria-label={ariaLabel} value={value} placeholder={placeholder} disabled={disabled}
          aria-invalid={error ? true : undefined}
          spellCheck={false} autoCapitalize="off" autoCorrect="off"
          onChange={(e) => onChange(e.target.value)}
          style={{ ...settingsKit.input, fontFamily: 'var(--cth-font-mono)', fontSize: 12, flex: '1 1 240px', minWidth: 0 }}
        />
        {resolved && value.trim() !== resolved.trim() && (
          <PixelButton size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(resolved)}>{t('pro.sheet.useResolved', 'Use the resolved command')}</PixelButton>
        )}
      </div>
      {error && <div role="alert" data-command-error={testId} style={{ fontSize: 11.5, color: 'var(--cth-status-blocked)' }}>{error}</div>}
    </div>
  );
}
