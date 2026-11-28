import { useEffect } from 'react';
import { useSeason } from '@/design/season';
import { watchWindowHidden } from './season/windowHidden';
import { SNOWFLAKES } from './season/snowPlan';
import { Sleigh } from './season/pieces';
import './christmas.css';

/**
 * The Christmas decorations of the WINDOW: a light snowfall over every
 * screen, and Santa's sleigh crossing the top now and then, where
 * Halloween's bats fly. The twin of HalloweenLayer.tsx, mounted beside it in
 * the season's own root (main.tsx), and only one of the two draws at a time.
 *
 * It never takes a click (pointer-events: none on the whole layer). The
 * flakes are few, small and slow, so nothing a person reads is covered: a
 * flake is a few pixels that passes in a second. The sleigh keeps to the band
 * under the top bar and is gone in seconds. Only transform and opacity move.
 * With prefers-reduced-motion nothing falls or flies (christmas.css), and
 * with the window off screen everything stops where it is (data-cth-window,
 * windowHidden.ts).
 * Season 'none' renders nothing.
 *
 * While Christmas is on this layer keeps the app's single "is the window off
 * screen" listener, as HalloweenLayer does while Halloween is on.
 */
export function ChristmasLayer() {
  const season = useSeason();
  useEffect(() => {
    if (season !== 'christmas') return;
    return watchWindowHidden();
  }, [season]);
  if (season !== 'christmas') return null;
  return (
    <div className="cth-xm" aria-hidden="true">
      {SNOWFLAKES.map((f, i) => (
        <span
          key={i}
          className="cth-xm-flake"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            animationDuration: `${f.fall}s, ${f.sway}s`,
            animationDelay: `-${f.delay}s, -${f.delay}s`,
          }}
        />
      ))}
      <div className="cth-xm-sky">
        <Sleigh className="cth-xm-sleigh" />
      </div>
    </div>
  );
}
