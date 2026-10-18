'use strict';

/** Re-earn the published A15 ordering figure on demand:
 *    node test/electron-harness/run-ipc-order.cjs --phase1 2000 --phase2 5000 --phase3 60 */
const { runIpcOrder } = require('./run.cjs');

const argOf = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};

runIpcOrder({ phase1: argOf('phase1', 2000), phase2: argOf('phase2', 5000), phase3: argOf('phase3', 60) })
  .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1); })
  .catch((e) => { console.error(e); process.exit(1); });
