import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import {
  DEFAULT_RESPONSE_STYLE,
  RESPONSE_STYLE_MAX,
  isDefaultStyle,
  normalizeResponseStyle
} from '@shared/responseStyle';
import { Btn } from './pro/ui';
import { CLAUDE_OUTPUT_STYLES, normalizeClaudeOutputStyle } from '@shared/outputStyle';
import { settingsChrome, type SettingsChromeKind } from './pro/settings/chrome';
import { useConfigValue, useSettingsDraft } from './settings/SettingsFrame';

/**
 * Settings section for the house RESPONSE STYLE: the standing brief every agent
 * works under when it answers.
 *
 * Self contained on purpose. Since 0.5.3 it stages both fields into the
 * Settings page's one draft, and the footer Save writes them (founder, 24 Sep:
 * "only one save button"). Main normalizes the value again on write and on
 * read, so what is shown here is always what the agents will actually receive.
 */
export interface ResponseStyleSectionProps {
  config: HarnessConfig;
  /** Which skin is drawing the Settings surface around this section. Every
   *  other block in that form takes its shapes from `settingsChrome`, so this
   *  one does too; without it the section would draw Classic's pixel face and
   *  square corners inside the PRO page. Defaults to the Classic modal, which
   *  is what an embedder that has not been updated is. */
  chrome?: SettingsChromeKind;
}

const noteStyle: React.CSSProperties = {
  fontSize: 11,
  lineHeight: '15px',
  color: 'var(--cth-ink-500)'
};

export function ResponseStyleSection({ config, chrome = 'modal' }: ResponseStyleSectionProps) {
  const { t } = useTranslation();
  const kit = settingsChrome(chrome);
  const labelStyle = kit.label;
  // What the agents are getting right now. Normalized here as well as in main so
  // the textarea can never show something the injection would not send.
  const saved = normalizeResponseStyle(config.responseStyle);
  const page = useSettingsDraft();
  const [staged, stageStyle] = useConfigValue(config, 'responseStyle', saved);
  const [outputStyle, stageOutputStyle] = useConfigValue(config, 'claudeOutputStyle', normalizeClaudeOutputStyle(config?.claudeOutputStyle));
  // The box keeps what was typed; the draft holds it normalized for Save.
  const [draft, setDraft] = useState(staged);

  // Follow the stored value when it changes underneath us (another floor
  // window, a save coming back normalized), unless an edit is waiting for Save.
  useEffect(() => { if (!page || !('responseStyle' in page.patch())) setDraft(saved); }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = normalizeResponseStyle(staged) !== saved;
  const atCap = draft.length >= RESPONSE_STYLE_MAX;
  const edit = (value: string) => { setDraft(value); stageStyle(normalizeResponseStyle(value)); };

  // A style of the person's own (from ~/.claude/output-styles) stays selectable.
  const currentStyle = normalizeClaudeOutputStyle(outputStyle);
  const styleOptions = CLAUDE_OUTPUT_STYLES.includes(currentStyle) ? [...CLAUDE_OUTPUT_STYLES] : [currentStyle, ...CLAUDE_OUTPUT_STYLES];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={labelStyle}>{t('responseStyle.title')}</div>
        <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
          {t('responseStyle.desc')}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <span style={labelStyle}>{t('responseStyle.label')}</span>
          <span
            style={{
              ...noteStyle,
              fontFamily: 'var(--cth-font-figures)',
              color: atCap ? 'var(--cth-status-blocked)' : 'var(--cth-ink-500)'
            }}
          >
            {t('responseStyle.counter', { used: draft.length, max: RESPONSE_STYLE_MAX })}
          </span>
        </div>

        <textarea
          value={draft}
          maxLength={RESPONSE_STYLE_MAX}
          rows={9}
          spellCheck={false}
          onChange={(e) => edit(e.currentTarget.value)}
          style={{
            // The form's own input shape, so this field cannot be the one that
            // looks different. Height comes off it because a textarea sizes by
            // rows, and the face is mono because this is a brief an agent
            // receives verbatim and whitespace in it is meaningful.
            ...kit.input,
            width: '100%',
            height: 'auto',
            padding: '8px 10px',
            fontFamily: 'var(--cth-font-mono)',
            fontSize: 12,
            lineHeight: '17px',
            outline: 'none',
            resize: 'vertical'
          }}
        />

        {atCap && <span style={{ ...noteStyle, color: 'var(--cth-status-blocked)' }}>{t('responseStyle.atCap')}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Btn
          size="sm"
          disabled={isDefaultStyle(normalizeResponseStyle(draft))}
          onClick={() => edit(DEFAULT_RESPONSE_STYLE)}
        >
          {t('responseStyle.reset')}
        </Btn>
        <span style={noteStyle} data-response-style-note>
          {pending ? t('settings.frame.onSave') : isDefaultStyle(saved) ? t('responseStyle.usingDefault') : t('responseStyle.edited')}
        </span>
      </div>

      {/* 0.5.3 feature 19. Claude Code is the one engine with an output style
          setting of its own; every other engine gets the brief above. Written
          into each agent's settings file at start, so it applies from the next
          start of an agent, and the line under it says so. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
        <span style={labelStyle}>{t('responseStyle.claudeStyleLabel')}</span>
        <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>{t('responseStyle.claudeStyleDesc')}</span>
        <select
          aria-label={t('responseStyle.claudeStyleLabel')}
          value={currentStyle}
          onChange={(e) => stageOutputStyle(e.target.value)}
          style={{ alignSelf: 'flex-start', height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)', font: 'inherit', fontSize: 12.5 }}
        >
          {styleOptions.map((s) => <option key={s} value={s}>{s === 'default' ? t('responseStyle.claudeStyleOff') : s}</option>)}
        </select>
        <span style={noteStyle}>{t('responseStyle.claudeStyleApplies')}</span>
      </div>

      {/* Which engines see an edit when. The two halves are not the same channel,
          and a person editing this deserves to know which agents change now. */}
      <span style={noteStyle}>{t('responseStyle.reach')}</span>
    </div>
  );
}
