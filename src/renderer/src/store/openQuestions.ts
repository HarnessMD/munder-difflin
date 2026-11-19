/**
 * Which agents have a multiple choice question open (0.5.3 bug 19). Module
 * level because the hook stream that feeds it and the drains that read it live
 * in different effects of useHive, which is mounted once. Its own small module
 * so a screen can read it without loading useHive (O62).
 */
import { useSyncExternalStore } from 'react';
import { OpenQuestionTracker } from '../../../shared/openQuestion';

export const openQuestions = new OpenQuestionTracker();

/** Has this agent a question open for the person? What a held queue waits on first (O62). */
export function useQuestionOpen(agentId: string | undefined): boolean {
  return useSyncExternalStore((fn) => openQuestions.subscribe(fn), () => openQuestions.isOpen(agentId), () => false);
}
