// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * Classic's action button for the boxes, drawn the way Classic
 * pages draw it: a small pixel button, 'default' drawn as 'secondary'.
 */
import { PixelButton } from './PixelButton';
import type { ActionButton } from './actionButton';

export const pixelAction: ActionButton = ({ label, kind, onClick, disabled, dataAttrs }) => (
  <PixelButton variant={kind === 'default' ? 'secondary' : kind} size="sm" onClick={onClick} disabled={disabled} dataAttrs={dataAttrs}>{label}</PixelButton>
);
