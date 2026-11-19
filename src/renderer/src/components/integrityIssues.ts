// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * The files main reports as not reading, read on mount
 * and every few seconds, as main sends no change event. Its own file so that
 * Settings, which pauses Save on a damaged config.json, does not pull in the
 * banner's drawing.
 */
import { useEffect, useState } from 'react';

export interface IntegrityIssue { file: string; copy: string | null; error: string }

const POLL_MS = 5000;

/** The damaged files main lists now, read on mount and every few seconds. */
export function useIntegrityIssues(): IntegrityIssue[] {
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  useEffect(() => {
    let live = true;
    const read = () => {
      void window.cth.integrityIssues?.().then((list) => { if (live) setIssues(Array.isArray(list) ? list : []); }, () => { /* keep the last answer */ });
    };
    read();
    const timer = setInterval(read, POLL_MS);
    return () => { live = false; clearInterval(timer); };
  }, []);
  return issues;
}
