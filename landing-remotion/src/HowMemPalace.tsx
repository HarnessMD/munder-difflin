import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { C, FONT } from './theme';
import { press, vt } from './fonts';
import { Panel, Caption } from './components';

const Beam: React.FC<{ x1: number; y1: number; x2: number; y2: number; from: number; color: string }> = ({ x1, y1, x2, y2, from, color }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [from, from + 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg style={{ position: 'absolute', inset: 0 }} width="1920" height="1080">
      <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * t} y2={y1 + (y2 - y1) * t}
        stroke={color} strokeWidth={4} strokeDasharray="8 8" opacity={0.85} />
    </svg>
  );
};

const AgentBox: React.FC<{ x: number; y: number; fill: string; name: string; note: string }> = ({ x, y, fill, name, note }) => (
  <Panel x={x} y={y} w={260} h={110} fill={fill} border={C.ink900} bw={4}>
    <div style={{ textAlign: 'center', marginTop: 18 }}>
      <div style={{ fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 30, color: C.ink900 }}>{name}</div>
      <div style={{ fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 22, color: '#3D2E4A' }}>{note}</div>
    </div>
  </Panel>
);

export const HowMemPalace: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // search query result highlight pulse
  const pulse = spring({ frame: frame - 110, fps, config: { damping: 120 } });
  const ms = Math.max(0, Math.round(interpolate(frame, [110, 130], [40, 12], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));

  return (
    <AbsoluteFill style={{ background: `radial-gradient(60% 60% at 50% 38%, #3a2356 0%, ${C.ink} 75%)` }}>
      {/* central palace */}
      <Panel x={700} y={360} w={520} h={360} fill={C.ink2} border={C.lilac} bw={6}>
        <div style={{ fontFamily: `${FONT.display}, ${press}, monospace`, fontSize: 22, color: C.gold, textAlign: 'center', marginTop: 22 }}>MEMPALACE</div>
        {[
          'design tokens · maroon / gold',
          'office cast = The Office',
          'hive: single-committer git',
          'recall index · semantic',
        ].map((t, i) => {
          const hot = i === 1 && pulse > 0;
          return (
            <div key={i} style={{
              margin: '18px 26px 0', padding: '10px 14px',
              background: hot ? C.lilac : C.ink900,
              border: `2px solid ${hot ? C.gold : C.muted}`,
              fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 24,
              color: hot ? C.ink900 : C.lilacL,
            }}>{t}</div>
          );
        })}
      </Panel>

      {/* agents */}
      <AgentBox x={150} y={180} fill={C.coralL} name="agent.coder" note="writes memory.md" />
      <AgentBox x={1510} y={180} fill={C.skyL} name="agent.research" note="mines its wing" />
      <AgentBox x={150} y={790} fill={C.lemonL} name="agent.qa" note="recall in 12ms" />
      <AgentBox x={1510} y={790} fill={C.mintL} name="ORCHESTRATOR" note="searches palace" />

      <Beam x1={410} y1={235} x2={700} y2={420} from={20} color={C.coral} />
      <Beam x1={1510} y1={235} x2={1220} y2={420} from={40} color={C.sky} />
      <Beam x1={410} y1={845} x2={700} y2={660} from={60} color={C.lemon} />
      <Beam x1={1510} y1={845} x2={1220} y2={660} from={80} color={C.mint} />

      {/* recall stamp */}
      <div style={{
        position: 'absolute', left: 820, top: 300, opacity: pulse,
        fontFamily: `${FONT.display}, ${press}, monospace`, fontSize: 26, color: C.gold,
      }}>recall: {ms}ms</div>

      <Caption x={150} y={980} kicker="THE MEMORY LAYER"
        title="MemPalace · shared, instant."
        sub="Every agent remembers across sessions and recalls in milliseconds." from={6} />
    </AbsoluteFill>
  );
};
