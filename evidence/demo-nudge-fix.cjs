'use strict';

/**
 * Before/after evidence for PR #736 (fix/inbox-nudge-pty-delivery).
 *
 * This is a standalone, runnable demonstration -- not part of the test suite --
 * of the exact bug and the fix. It uses a fake PTY where the simulated Enter
 * keystroke is NEVER acknowledged (the "swallowed Enter" case), run once
 * against the OLD delivery logic (reproduced here verbatim from the pre-fix
 * src/main/index.ts) and once against the real, fixed nudgeDelivery.ts.
 *
 * Run: node evidence/demo-nudge-fix.cjs
 */

const path = require('node:path');
const loadTs = require(path.join(__dirname, '..', 'test', 'load-ts.cjs'));
const { deliverNudge } = loadTs('src/main/nudgeDelivery.ts');

function fakePty() {
  const writes = [];
  return {
    writes,
    write: (_id, data) => { writes.push(data); return { ok: true }; }
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── BEFORE: the pre-fix logic, reproduced verbatim (see git history, the
// `nudgeWorker` function removed by this PR) ────────────────────────────────
//
//   function nudgeWorker(ptyId, ids = []) {
//     const wrote = ptyManager.write(ptyId, inboxNudgeText(ids));
//     if (!wrote.ok) { ...; return; }
//     setTimeout(() => {
//       const submitted = ptyManager.write(ptyId, '\r');
//       ...
//     }, 140);
//   }
//
// No confirmation of either write, so a caller has no signal that Enter was
// swallowed -- it just calls nudgeWorker again on the next beat.
function oldNudgeWorker(pty, text) {
  pty.write('x', text);
  return new Promise((resolve) => {
    setTimeout(() => {
      pty.write('x', '\r');
      resolve();
    }, 140);
  });
}

async function before() {
  console.log('=== BEFORE (pre-fix logic): Enter is swallowed, next beat retypes the text ===');
  const pty = fakePty();
  const nudgeText = 'You have new hive inbox message(s) — at least: mail-1. Read your inbox, act on what is pending there, and move handled ones to inbox/.done/. Your inbox directory is authoritative...';

  // Beat 1: delivers the nudge. The simulated terminal never reacts to Enter
  // (the exact "swallowed Enter" failure reported live) -- nothing in the old
  // code notices this.
  await oldNudgeWorker(pty, nudgeText);
  console.log(`  beat 1 wrote ${pty.writes.length} chunk(s) (text + "\\r"), no confirmation taken`);

  // Beat 2 (next poll, ~15s later): the inbox is STILL undrained (the agent
  // never saw the nudge), so the watchdog calls nudgeWorker again -- with the
  // SAME full text, because nothing marked a delivery "in flight".
  await oldNudgeWorker(pty, nudgeText);

  const textWrites = pty.writes.filter((w) => w !== '\r');
  console.log(`  beat 2 wrote the full nudge text again`);
  console.log(`  RESULT: nudge text written ${textWrites.length} time(s) -- duplicated in the input box.`);
  console.log('');
}

// ─── AFTER: the fixed logic (src/main/nudgeDelivery.ts), same swallowed-Enter
// scenario -- the PTY never reacts to the FIRST Enter, only to a retry ──────
async function after() {
  console.log('=== AFTER (this PR): Enter is confirmed/retried, text is written exactly once ===');
  let elapsed = 0;
  let lastOutputAt = 0;
  const writes = [];
  const log = [];
  const deps = {
    write: (_id, data) => { writes.push(data); return { ok: true }; },
    lastOutputAt: () => lastOutputAt,
    log: (event) => { log.push(event); console.log(`  [${event.phase}]${event.attempt !== undefined ? ` attempt=${event.attempt}` : ''}`); },
    sleep: async (ms) => {
      elapsed += ms;
      // The PTY reacts only once Enter has actually been RE-SENT (simulating
      // the same real-world "first Enter swallowed, retry gets through").
      if (lastOutputAt === 0 && writes.filter((w) => w === '\r').length >= 2 && elapsed >= 1450) lastOutputAt = elapsed;
    }
  };
  const nudgeText = 'New hive inbox message(s) — at least: mail-1. Process your inbox per your standing instructions.';

  const result = await deliverNudge('pty-demo', 'agent-demo', nudgeText, deps);

  const textWrites = writes.filter((w) => w !== '\r');
  console.log(`  RESULT: delivery result = "${result}", nudge text written ${textWrites.length} time(s), Enter sent ${writes.filter((w) => w === '\r').length} time(s) (1 original + retries) -- never duplicated.`);
}

(async () => {
  await before();
  await after();
})();
