// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * How a box draws its one action (the crash box, the HISTORY list's load
 * older and jump). Callers pass pixelAction (classicAction.tsx) for the
 * pixel button.
 */
import type { ReactNode } from 'react';

export type ActionButton = (p: {
  label: string;
  kind: 'primary' | 'default' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  /** `data-*` attributes on the button, the same contract as PixelButton. */
  dataAttrs?: Record<`data-${string}`, string | undefined>;
}) => ReactNode;
