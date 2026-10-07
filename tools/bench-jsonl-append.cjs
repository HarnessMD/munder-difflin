'use strict';

// Manual Windows probe for #621. The default file size matches the issue's
// 70 MiB reproduction; neither this script nor its results gate CI.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const loadTs = require('../test/load-ts.cjs');

const { APPEND_FILE_VALIDATE_EVERY_WRITES, JsonlAppendFile } = loadTs('src/main/jsonlAppendFile.ts');
const FILE_SIZE_MIB = Number(process.argv[2] ?? 70);
const ROWS_PER_CADENCE = Number(process.argv[3] ?? 256);
const BYTES_PER_MIB = 1024 * 1024;
const VALIDATION_CADENCES = [...new Set([1, 8, 16, 64, APPEND_FILE_VALIDATE_EVERY_WRITES])];
const LINE = '{"ts":1,"kind":"probe","pad":"' + 'x'.repeat(150) + '"}\n';

if (!Number.isSafeInteger(FILE_SIZE_MIB) || FILE_SIZE_MIB < 1
  || !Number.isSafeInteger(ROWS_PER_CADENCE) || ROWS_PER_CADENCE < 1) {
  throw new Error('usage: node tools/bench-jsonl-append.cjs [file-size-MiB] [rows-per-cadence]');
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function summarize(label, samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const mean = samples.reduce((total, elapsed) => total + elapsed, 0) / samples.length;
  console.log(label.padEnd(26),
    `p50=${percentile(sorted, 0.5).toFixed(3)}ms`,
    `p90=${percentile(sorted, 0.9).toFixed(3)}ms`,
    `p99=${percentile(sorted, 0.99).toFixed(3)}ms`,
    `mean=${mean.toFixed(3)}ms`,
    `max=${sorted.at(-1).toFixed(3)}ms`);
}

function seedFile(file) {
  const seedLine = '{"kind":"seed","pad":"' + 'x'.repeat(150) + '"}\n';
  const chunk = Buffer.from(seedLine.repeat(Math.ceil(BYTES_PER_MIB / Buffer.byteLength(seedLine))));
  const descriptor = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT);
  try {
    let bytesWritten = 0;
    while (bytesWritten < FILE_SIZE_MIB * BYTES_PER_MIB) {
      const written = fs.writeSync(descriptor, chunk);
      if (written <= 0) throw new Error('seed write did not progress');
      bytesWritten += written;
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'md-jsonl-cadence-'));
const file = path.join(directory, 'log.jsonl');
try {
  seedFile(file);
  console.log(`Node ${process.version}, ${process.platform} ${os.release()}, file=${(fs.statSync(file).size / BYTES_PER_MIB).toFixed(1)} MiB, rows=${ROWS_PER_CADENCE}`);
  console.log('Record the active antivirus product separately when comparing against #621.');
  for (const validateEveryWrites of VALIDATION_CADENCES) {
    const appendFile = new JsonlAppendFile({ validateEveryWrites });
    const samples = [];
    try {
      if (!appendFile.append(file, LINE)) throw new Error('warm-up append failed');
      for (let row = 0; row < ROWS_PER_CADENCE; row++) {
        const started = performance.now();
        if (!appendFile.append(file, LINE)) throw new Error('measured append failed');
        samples.push(performance.now() - started);
      }
    } finally {
      appendFile.close();
    }
    summarize(`validate every ${validateEveryWrites}`, samples);
  }

  const baselineSamples = [];
  for (let row = 0; row < Math.min(ROWS_PER_CADENCE, 24); row++) {
    const started = performance.now();
    fs.appendFileSync(file, LINE, 'utf8');
    baselineSamples.push(performance.now() - started);
  }
  summarize('appendFileSync baseline', baselineSamples);
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
