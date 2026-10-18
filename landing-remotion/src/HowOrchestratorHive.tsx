import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT } from './theme';
import { press, vt } from './fonts';
import { Panel, Envelope, Caption } from './components';

const Worker: React.FC<{ x: number; fill: string; name: string }> = ({ x, fill, name }) => (
  <Panel x={x} y={760} w={300} h={170} fill={fill} border={C.ink900} bw={4}>
    <div style={{ textAlign: 'center', marginTop: 22 }}>
      <div style={{ fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 30, color: C.ink900 }}>{name}</div>
      <div style={{ fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 22, color: '#3D2E4A' }}>claude + memory</div>
    </div>
  </Panel>
);

export const HowOrchestratorHive: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: 'absolute', left: 80, top: 70, fontFamily: `${FONT.display}, ${press}, monospace`, fontSize: 24, color: C.gold }}>
        YOU TALK TO ONE AGENT.
      </div>

      {/* YOU */}
      <Panel x={120} y={200} w={240} h={120} fill={C.gold} border={C.maroonD} bw={6} shadow={false}>
        <div style={{ fontFamily: `${FONT.display}, ${press}, monospace`, fontSize: 26, color: C.ink, textAlign: 'center', marginTop: 42 }}>YOU</div>
      </Panel>

      {/* ORCHESTRATOR */}
      <Panel x={760} y={170} w={400} h={190} fill={C.maroon} border={C.gold} bw={6}>
        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <div style={{ fontFamily: `${FONT.display}, ${press}, monospace`, fontSize: 40, color: C.cream }}>ORCHESTRATOR</div>
          <div style={{ fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 30, color: C.gold, marginTop: 10 }}>orchestrator</div>
          <div style={{ fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 24, color: C.creamD }}>route · assign · escalate</div>
        </div>
      </Panel>

      {/* approvals (HITL) */}
      <Panel x={1480} y={195} w={340} h={150} fill={C.ink2} border={C.coral} bw={4}>
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <div style={{ fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 30, color: C.coralL }}>approvals</div>
          <div style={{ fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 22, color: C.muted }}>only critical items reach you</div>
        </div>
      </Panel>

      {/* hive bus */}
      <Panel x={120} y={560} w={1680} h={70} fill={C.ink2} border={C.sky} bw={4} shadow={false}>
        <div style={{ fontFamily: `${FONT.mono}, ${vt}, monospace`, fontSize: 32, color: C.skyL, textAlign: 'center', marginTop: 14 }}>
          the hive · mailbox · blackboard · task ledger · event log
        </div>
      </Panel>

      <Worker x={120} fill={C.coralL} name="agent.coder" />
      <Worker x={470} fill={C.skyL} name="agent.research" />
      <Worker x={820} fill={C.lemonL} name="agent.qa" />
      <Worker x={1170} fill={C.lilacL} name="agent.docs" />

      {/* flows: you→orchestrator, orchestrator→hive, hive→workers, escalation→approvals */}
      <Envelope x1={360} y1={250} x2={760} y2={250} from={10} dur={36} tint={C.gold} />
      <Envelope x1={950} y1={360} x2={950} y2={560} from={50} dur={30} tint={C.skyL} />
      <Envelope x1={950} y1={560} x2={260} y2={760} from={82} dur={40} tint={C.coralL} />
      <Envelope x1={950} y1={560} x2={620} y2={760} from={92} dur={40} tint={C.skyL} />
      <Envelope x1={950} y1={560} x2={970} y2={760} from={102} dur={40} tint={C.lemonL} />
      <Envelope x1={1160} y1={250} x2={1480} y2={250} from={130} dur={36} tint={C.coral} />

      <Caption x={1280} y={690} title="The ORCHESTRATOR agent runs the floor." from={6} />

      <div style={{ position: 'absolute', right: 60, bottom: 50, fontFamily: `${FONT.display}, ${press}, monospace`, fontSize: 16, color: C.gold }}>
        MUNDER DIFFLIN
      </div>
    </AbsoluteFill>
  );
};
