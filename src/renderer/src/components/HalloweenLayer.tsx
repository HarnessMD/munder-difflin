import { useEffect } from 'react';
import { useSeason } from '@/design/season';
import { watchWindowHidden } from './season/windowHidden';
import { Bat } from './season/pieces';
import './halloween.css';

/**
 * The Halloween decorations of the WINDOW: bats that cross the top now and
 * then. The cobweb, the spider, the pumpkin and the ghost moved onto the
 * queue input area (0.5.5 rc2, season/SeasonCorner.tsx), where each input
 * area draws its own.
 *
 * Mounted once, in its own root (main.tsx), over both skins. It never takes a
 * click (pointer-events: none on the whole layer) and the bats keep to the
 * top, so nothing a person reads or clicks is covered for more than the
 * second a bat takes to fly past. With prefers-reduced-motion nothing flies
 * (halloween.css). Season 'none' renders nothing.
 *
 * Being the one piece that is mounted once, it also keeps the app's single
 * "is the window off screen" listener, which pauses every decoration.
 */
export function HalloweenLayer() {
  const season = useSeason();
  useEffect(() => {
    if (season !== 'halloween') return;
    return watchWindowHidden();
  }, [season]);
  if (season !== 'halloween') return null;
  return (
    <div className="cth-hw" aria-hidden="true">
      <div className="cth-hw-bats">
        <Bat className="cth-hw-bat cth-hw-bat-1" />
        <Bat className="cth-hw-bat cth-hw-bat-2" />
        <Bat className="cth-hw-bat cth-hw-bat-3" />
      </div>
    </div>
  );
}

// The bat itself is drawn once, in season/pieces/Night.tsx. Its wings are
// separate boxes, so halloween.css flaps them with transform only: a transform
// on an SVG <g> is not composited (Kevin's perf note on #171).
