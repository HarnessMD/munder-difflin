import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type SidebarTab } from '@/store/store';
import { type AccentColorName } from '@/design/tokens';
import { Icon, type IconName } from './Icon';

// v0.3.4: the files tab is gone — the per-agent IDE button (header) opens the
// full Monaco editor + file tree, which superseded the read-only browser.
const TABS: { key: SidebarTab; labelKey: string; icon: IconName }[] = [
  { key: 'terminal', labelKey: 'sidebar.terminal', icon: 'terminal' },
  { key: 'history',  labelKey: 'sidebar.history',  icon: 'clock' },
  { key: 'git',      labelKey: 'sidebar.git',      icon: 'code' },
  { key: 'messages', labelKey: 'sidebar.messages', icon: 'bell' },
  { key: 'traces',   labelKey: 'sidebar.traces',   icon: 'web' }
];

export interface SidebarTabsProps {
  current: SidebarTab;
  accent: AccentColorName;
  onChange: (tab: SidebarTab) => void;
}

/** Below this width the closed tabs show only their icon (Pam's P5). */
export const COMPACT_TABS_PX = 520;

export function SidebarTabs({ current, accent, onChange }: SidebarTabsProps) {
  const { t } = useTranslation();
  const row = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = row.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setCompact(el.clientWidth > 0 && el.clientWidth < COMPACT_TABS_PX));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={row} style={{
      display: 'flex',
      gap: 0,
      background: 'var(--cth-cream-200)',
      boxShadow: 'inset 0 -2px 0 var(--cth-ink-900)',
      flexShrink: 0
    }}>
      {TABS.map(tab => {
        const active = current === tab.key;
        // Compact: a closed tab keeps its icon, with its word as tooltip and label; the open one keeps its word.
        const iconOnly = compact && !active;
        const label = t(tab.labelKey);
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            title={iconOnly ? label : undefined}
            aria-label={iconOnly ? label : undefined}
            style={{
              flex: iconOnly ? '0 1 auto' : 1,
              height: 36,
              padding: '0 10px',
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--cth-cream-100)' : 'transparent',
              boxShadow: active
                ? `inset 0 -3px 0 var(--cth-${accent}), inset 1px 0 0 var(--cth-ink-900), inset -1px 0 0 var(--cth-ink-900)`
                : 'inset 0 0 0 0',
              fontFamily: 'var(--cth-font-display)',
              fontSize: 10,
              lineHeight: '14px',
              color: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Icon name={tab.icon} />{!iconOnly && <> {label.toUpperCase()}</>}
          </button>
        );
      })}
    </div>
  );
}
