/**
 * THE VENDORS' OWN MARKS, for the limits panel and chip only (Pam's
 * page hive/shared/eng/task-force-058/design/m30-248-limits.html, which lists
 * each file's source). ProviderLogo stays as it is for the other screens.
 *
 * Antigravity and OpenCode carry masks, so they load as images: drawn inline
 * their ids would clash. Codex and Grok are one colour and take the text's.
 * Light and dark are swapped by LIMITS_CSS, with the app's theme.
 */
import claudeSlate from '@/assets/logos/limits/claude-code-logo-slate.svg?url';
import claudeIvory from '@/assets/logos/limits/claude-code-logo-ivory.svg?url';
import claudeSpark from '@/assets/logos/limits/claude-code-spark.svg?url';
import antigravity from '@/assets/logos/limits/antigravity-icon-full-color.svg?url';
import opencodeLight from '@/assets/logos/limits/opencode-logo-light-square.svg?url';
import opencodeDark from '@/assets/logos/limits/opencode-logo-dark-square.svg?url';
import openaiBlossom from '@/assets/logos/limits/openai-blossom.svg?raw';
import grokMark from '@/assets/logos/limits/grok-mark.svg?raw';
import type { LimitEngine } from '@shared/usageLimits';

/** The Claude Code logo's width for a height of 1 (viewBox 14552 by 2000). */
const CLAUDE_LOGO_RATIO = 7.276;

function Raw({ svg, size }: { svg: string; size: number }) {
  return <span className="cth-lim-raw" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** An engine's mark alone: the chip, the settings pills, and beside a typed name. Claude Code's is the spark from its logo. */
export function LimitsMark({ engine, size }: { engine: LimitEngine; size: number }) {
  const img = (src: string, cls?: string) => <img className={cls} src={src} alt="" width={size} height={size} draggable={false} />;
  return (
    <span className="cth-lim-mk" aria-hidden style={{ width: size, height: size }}>
      {engine === 'claude' && img(claudeSpark)}
      {engine === 'codex' && <Raw svg={openaiBlossom} size={size} />}
      {engine === 'antigravity' && img(antigravity)}
      {engine === 'grok' && <Raw svg={grokMark} size={size} />}
      {engine === 'opencode' && <>{img(opencodeLight, 'cth-lim-lgL')}{img(opencodeDark, 'cth-lim-lgD')}</>}
    </span>
  );
}

/** The whole Claude Code logo: it carries its own words, so no name is typed beside it and the name is its alt text. */
export function ClaudeCodeLogo({ height }: { height: number }) {
  const width = Math.round(height * CLAUDE_LOGO_RATIO);
  return (
    <>
      <img className="cth-lim-lgL" src={claudeSlate} alt="Claude Code" width={width} height={height} draggable={false} />
      <img className="cth-lim-lgD" src={claudeIvory} alt="Claude Code" width={width} height={height} draggable={false} />
    </>
  );
}
