import { composeTeam, toRuns, PALETTE, PIXEL } from '../sleighPlan';

// Santa's sleigh behind three reindeer, Rudolph in front: pixel art from
// sleighPlan.ts. The body and the two leg frames are separate boxes, so
// christmas.css gallops the legs with opacity alone (a change on an SVG <g>
// is not composited; see the bat in Night.tsx).
const TEAM = composeTeam();

function Grid({ rows, className }: { rows: string[]; className: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${TEAM.width} ${TEAM.height}`}
      width={TEAM.width * PIXEL}
      height={TEAM.height * PIXEL}
      shapeRendering="crispEdges"
    >
      {toRuns(rows).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={PALETTE[r.key]} />
      ))}
    </svg>
  );
}

export function Sleigh({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="cth-pc cth-pc-sleigh" style={{ width: TEAM.width * PIXEL, height: TEAM.height * PIXEL }}>
        <Grid rows={TEAM.body} className="cth-pc-sleigh-body" />
        <Grid rows={TEAM.legsA} className="cth-pc-sleigh-legs cth-pc-sleigh-legs-a" />
        <Grid rows={TEAM.legsB} className="cth-pc-sleigh-legs cth-pc-sleigh-legs-b" />
      </div>
    </div>
  );
}
