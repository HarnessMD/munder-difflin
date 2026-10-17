import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { C, FONT } from './theme';
import { press } from './fonts';
import { HowAgents } from './HowAgents';
import { HowOrchestratorHive } from './HowOrchestratorHive';
import { HowMemPalace } from './HowMemPalace';

// Optional synthetic hero used ONLY if you don't have a real screen recording yet.
// Prefer dropping a real capture at docs/media/hero.mp4 / hero.webm.
export const HeroFallback: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Sequence durationInFrames={150}><HowAgents /></Sequence>
    <Sequence from={150} durationInFrames={150}><HowOrchestratorHive /></Sequence>
    <Sequence from={300} durationInFrames={150}><HowMemPalace /></Sequence>
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 40, textAlign: 'center',
      fontFamily: `${FONT.display}, ${press}, monospace`, fontSize: 20, color: C.gold,
      textShadow: `3px 3px 0 ${C.maroonD}`,
    }}>
      A BUSY DAY AT MUNDER DIFFLIN
    </div>
  </AbsoluteFill>
);
