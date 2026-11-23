/**
 * ⌘I opens the IDE from any screen (0.5.3, feature 23). The key and the reasons
 * for it are in ide/ideKeys.ts.
 *
 * It draws nothing. It is a component only so that it can be mounted in ONE
 * place, beside the panel in App.tsx: that is the only spot that exists on
 * every screen and does not exist on a door (onboarding), where an IDE flag
 * set behind it would pop the panel open the moment the person got through.
 *
 * No agent is named. The panel's own rule then picks the workspace (the agent
 * on screen, else the orchestrator) and says when it guessed.
 */
import { useEffect } from 'react';
import { useStore } from '@/store/store';
import { coveredAboveIde, installIdeShortcut } from './ideShortcutRules';

export function IdeShortcut(): null {
  // The rules, and why each exists, are in ideShortcutRules.ts, where they run
  // under test. This only hands them the real window.
  useEffect(() => installIdeShortcut(window, {
    isOpen: () => useStore.getState().ideOpen,
    open: () => useStore.getState().setIdeOpen(true),
    covered: () => coveredAboveIde(document, window)
  }), []);
  return null;
}
