// Where an unenrolled machine sends its first request. A packaged build must
// reach the public relay (RELAY-VPS-DEPLOY.md step 11); a dev build, the tests
// and the local rehearsal keep loopback. Before enrolment this default is the
// only answer, so a packaged app with the loopback default could never enrol.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('packaged builds default to the public relay; dev builds to loopback; MD_RELAY_URL beats both', () => {
  const src = read('src/main/relay.ts');
  assert.match(src, /const PUBLIC_RELAY_URL = 'https:\/\/relay\.harnessmd\.com';/);
  assert.match(src, /const LOCAL_RELAY_URL = 'http:\/\/127\.0\.0\.1:4312';/);
  assert.match(src, /const DEFAULT_RELAY_URL = app\.isPackaged \? PUBLIC_RELAY_URL : LOCAL_RELAY_URL;/);
  const fn = src.slice(src.indexOf('export function relayHttpUrl()'));
  assert.ok(fn.indexOf('MD_RELAY_URL') < fn.indexOf('readMembership()') && fn.indexOf('readMembership()') < fn.indexOf('return DEFAULT_RELAY_URL'), 'env, then the enrolled relay, then the default');
  // The console the desktop links to lives beside the relay, one domain family.
  assert.match(read('src/shared/consoleLinks.ts'), /CONSOLE_ORIGIN = 'https:\/\/app\.harnessmd\.com'/);
});
