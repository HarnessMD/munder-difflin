'use strict';

/**
 * THE FIFTH BILLING STATE.
 *
 * `awaiting-card` is where the server creates every org
 * (`teams-backend/src/schemas.mjs:48`) and where it stays until a payment is
 * confirmed. This side knew four states. The consequence was not a missing
 * label: `teamsOrg.valid()` rejected the WHOLE `/me` response over the
 * unrecognised value, so a person who had just signed up got no org cached, no
 * seats, and no admin standing, and the first thing they tried to do was
 * invite somebody.
 *
 * These tests pin the five, and pin that the desktop's idea of "may invite"
 * matches the server's own gate rather than drifting from it. The server admits
 * exactly `trialing` and `healthy` (`teams-backend/src/db.mjs:155-167`,
 * `seatGuard`); if that ever changes, `isEntitled` has to change with it and
 * this file is where the mismatch shows up.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const billing = loadTs(path.join(ROOT, 'src/shared/billing.ts'));

const ALL = ['awaiting-card', 'trialing', 'healthy', 'payment-failed', 'cancelled'];

test('every billing state the server can send has a tone', () => {
  for (const state of ALL) {
    const tone = billing.stateTone(state);
    assert.ok(['ok', 'warn', 'bad', 'muted'].includes(tone), `${state} produced ${tone}`);
  }
});

test('awaiting-card is a warning, not a failure', () => {
  // Nothing has gone wrong when an org has not paid yet. Drawing it in the
  // same red as a declined card sends people to support instead of to the
  // billing page.
  assert.equal(billing.stateTone('awaiting-card'), 'warn');
  assert.equal(billing.stateTone('payment-failed'), 'bad');
});

test('keyDateFor answers for every state and invents no date for awaiting-card', () => {
  const view = { trialEndsAt: 'T', graceEndsAt: 'G', renewalAt: 'R' };
  assert.equal(billing.keyDateFor({ ...view, state: 'trialing' }), 'T');
  assert.equal(billing.keyDateFor({ ...view, state: 'payment-failed' }), 'G');
  assert.equal(billing.keyDateFor({ ...view, state: 'healthy' }), 'R');
  assert.equal(billing.keyDateFor({ ...view, state: 'cancelled' }), null);
  // Nothing is counting down before a card exists, so there is no date to show.
  assert.equal(billing.keyDateFor({ ...view, state: 'awaiting-card' }), null);
});

test('isEntitled matches the server seat guard exactly', () => {
  assert.equal(billing.isEntitled('trialing'), true);
  assert.equal(billing.isEntitled('healthy'), true);
  assert.equal(billing.isEntitled('awaiting-card'), false);
  assert.equal(billing.isEntitled('payment-failed'), false);
  assert.equal(billing.isEntitled('cancelled'), false);
});

test('teamsOrg accepts a /me carrying awaiting-card', () => {
  // Structural, because loading teamsOrg.ts needs electron and a relay. The
  // list in `valid()` is the whole bug: a state missing from it discards the
  // entire response, including the org name and the admin flag.
  const src = fs.readFileSync(path.join(ROOT, 'src/main/teamsOrg.ts'), 'utf8');
  // The guard is the one line that tests the state against a LIST. Three other
  // lines mention `me.org.entitlement.state` (it is read into the view and
  // compared against ACTIVE), so match on the list check, not on the field.
  const line = src.split('\n').find((l) => l.includes('].includes(me.org.entitlement.state)'));
  assert.ok(line, 'teamsOrg.valid() no longer checks the entitlement state');
  for (const state of ALL) {
    assert.ok(line.includes(`'${state}'`), `valid() would throw away a /me in ${state}`);
  }
});

test('the shared type carries all five, so a switch cannot silently miss one', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/shared/teams.ts'), 'utf8');
  const m = src.match(/export type BillingState =([^;]+);/);
  assert.ok(m, 'BillingState is gone or reshaped');
  for (const state of ALL) assert.ok(m[1].includes(`'${state}'`), `BillingState is missing ${state}`);
});

test('every state has copy in all three locales, and none of it carries a dash', () => {
  for (const locale of ['en', 'zh-CN', 'ar']) {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, `src/renderer/src/i18n/locales/${locale}.json`), 'utf8'));
    const copy = json.team.org.entitlement;
    for (const state of ALL) {
      assert.ok(typeof copy[state] === 'string' && copy[state].length > 0, `${locale} has no copy for ${state}`);
      assert.ok(!/—|–| - /.test(copy[state]), `${locale} ${state} carries a dash`);
    }
  }
});
