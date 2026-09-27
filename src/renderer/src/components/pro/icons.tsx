/**
 * Stroke icons for the PRO sidebar and titlebar. The sprite in assets/glyphs.svg
 * is the 16px pixel set drawn for the office; next to OS window controls and a
 * 13px UI face a pixel grid reads as a rendering artifact, which is why the
 * titlebar already draws its own strokes (App.tsx). These are the same idea,
 * one per sidebar row, 1.7px stroke, currentColor.
 */
import type { CSSProperties } from 'react';

export type ProIconName =
  | 'tasks' | 'inbox' | 'automations' | 'memory' | 'capabilities'
  | 'agents' | 'temps' | 'team' | 'chevronLeft' | 'chevronRight' | 'chevronUp' | 'chevronDown'
  | 'settings' | 'update' | 'theme' | 'clip' | 'mic' | 'send' | 'panel' | 'close' | 'plus' | 'ask' | 'slack' | 'hook'
  | 'clock' | 'gauge' | 'org' | 'check' | 'external' | 'copy' | 'profile' | 'billing' | 'minus' | 'folder'
  // The two the Classic sweep needed (0.4.9 phase 5): a notice and a "there is
  // something new here". Both existed only as pixel glyphs, which is why a
  // Settings page under PRO still had one 16px pixel mark on it.
  | 'bell' | 'sparkle' | 'minimize' | 'arrowRight'
  // The theme control is two icons, not one (founder, 3 Sep 2026): the moon
  // while the app is light and the sun while it is dark, each showing where a
  // click goes. `theme` (the half filled disc) stays for anything that wants
  // the idea of a theme rather than a direction.
  | 'sun' | 'moon'
  // The puck (7 Sep 2026): its own row, and the glyphs its screen needs for
  // the ring's actions, the recorders and the transcript list.
  | 'puck' | 'screenshot' | 'video' | 'eyeOff' | 'computer' | 'stop' | 'trash' | 'doc' | 'play'
  // The agent note (founder, 24 Sep 2026): a notepad, not the paperclip,
  // which reads as "attach a file" and is the composer's own button.
  | 'note';

const PATHS: Record<ProIconName, string> = {
  puck: 'M3 15h18v4H3zM5 15V9a1 1 0 011-1h9l6-2v9M15 8v7',
  screenshot: 'M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M9 12h6',
  video: 'M3 7a1 1 0 011-1h11a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1zM16 10l5-3v10l-5-3',
  eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0121 12a10.6 10.6 0 01-2.2 3.1M6.6 6.6A10.6 10.6 0 003 12a10 10 0 0013.4 4.4',
  computer: 'M3 5h18v11H3zM8 20h8M12 16v4',
  stop: 'M7 7h10v10H7z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  note: 'M6 5h12a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1zM9 3v4M12 3v4M15 3v4M8.5 11h7M8.5 14.5h7M8.5 18h4',
  play: 'M8 5l11 7-11 7z',
  billing: 'M3 7h18v11H3zM3 10h18M7 14h4',
  folder: 'M3 7a1 1 0 011-1h5l2 2h9a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1z',
  profile: 'M12 12m-4 0a4 4 0 108 0a4 4 0 10-8 0M4 21c0-4 3.6-6 8-6s8 2 8 6',
  tasks: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM9 5v14M15 5v14',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l2 3h4l2-3h5',
  automations: 'M13 2L4 14h7l-1 8 9-12h-7z',
  memory: 'M6 6m-2.5 0a2.5 2.5 0 105 0a2.5 2.5 0 10-5 0M18 8m-2.5 0a2.5 2.5 0 105 0a2.5 2.5 0 10-5 0M9 18m-2.5 0a2.5 2.5 0 105 0a2.5 2.5 0 10-5 0M17 17m-2.5 0a2.5 2.5 0 105 0a2.5 2.5 0 10-5 0M8 7.5l7.5 1M7.5 8l1 7.5M11.5 18h3M16 10l1 4.5',
  capabilities: 'M12 3l2 3h3l1 3 3 2-1 3 1 3-3 2-1 3h-3l-2 3-2-3H7l-1-3-3-2 1-3-1-3 3-2 1-3h3zM12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0',
  agents: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  temps: 'M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0M12 7v5l3 2',
  team: 'M9 8m-3.5 0a3.5 3.5 0 107 0a3.5 3.5 0 10-7 0M2.5 20a6.5 6.5 0 0113 0M17 9m-2.5 0a2.5 2.5 0 105 0a2.5 2.5 0 10-5 0M15.5 14.5a5 5 0 016 5.5',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronUp: 'M6 15l6-6 6 6',
  chevronDown: 'M6 9l6 6 6-6',
  settings: 'M12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  update: 'M21 12a9 9 0 11-3-6.7M21 3v6h-6',
  theme: 'M12 3a9 9 0 000 18V3z M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0',
  clip: 'M21 12l-8.5 8.5a5 5 0 01-7-7L14 5a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 8',
  mic: 'M9 3h6v8a3 3 0 01-6 0zM5 11a7 7 0 0014 0M12 18v3M9 21h6',
  send: 'M4 12l16-8-6 16-2-6z',
  panel: 'M3 4h18a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1zM15 4v16',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  ask: 'M9.5 9a2.5 2.5 0 015 0c0 1.8-2.5 2-2.5 4M12 17h.01M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0',
  slack: 'M9 3a2 2 0 012 2v4H9a2 2 0 110-4zM15 3a2 2 0 00-2 2v4h2a2 2 0 100-4zM3 9a2 2 0 002 2h4V9a2 2 0 10-4 0zM21 15a2 2 0 00-2-2h-4v2a2 2 0 104 0zM9 21a2 2 0 002-2v-4H9a2 2 0 100 4zM15 21a2 2 0 01-2-2v-4h2a2 2 0 110 4zM3 15a2 2 0 012-2h4v2a2 2 0 11-4 0zM21 9a2 2 0 01-2 2h-4V9a2 2 0 114 0z',
  hook: 'M12 3v9a4 4 0 01-8 0v-1M12 3l3 3M12 3L9 6M20 12a4 4 0 01-8 0',
  clock: 'M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0M12 7v5l3 2',
  gauge: 'M12 13l4-4M12 21a9 9 0 110-18 9 9 0 010 18zM5 15h2M17 15h2',
  org: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6M8 12h.01M12 12h.01M16 12h.01',
  check: 'M5 12l5 5L20 7',
  external: 'M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5',
  copy: 'M9 9h10v11H9zM5 15V4h11',
  bell: 'M18 16V11a6 6 0 10-12 0v5l-2 3h16zM10 22h4',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 3.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z',
  // Sits low on purpose: `minus` is the middle of the box and means "remove",
  // this is the bottom edge and means "put it away".
  minimize: 'M6 18h12',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  sun: 'M12 12m-4 0a4 4 0 108 0a4 4 0 10-8 0M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5',
  moon: 'M21 13.2A9 9 0 1110.8 3a7 7 0 0010.2 10.2z'
};

export function ProIcon({ name, size = 16, style }: { name: ProIconName; size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" aria-hidden
      style={{ display: 'block', flexShrink: 0, ...style }}
      fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
