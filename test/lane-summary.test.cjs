'use strict';

/**
 * THE ONE SENTENCE RULE (the 0.4.11 simplification).
 *
 * `laneSummary` is the single place that decides what a roster row or the
 * teammate drawer says about a lane: nothing when it is fully open, and the
 * one tightest fact when something is closed. This file runs the rule for
 * real over every closure shape:
 *
 *   1. fully open in both directions answers null, so an open lane draws
 *      nothing extra;
 *   2. each single closure answers the key that names the closed direction
 *      AND the side that closed it;
 *   3. a double closure prefers the key naming YOUR side, because your side
 *      is the one the person reading the sentence can fix.
 *
 * No React, no .tsx: the helper is a pure shared module and is loaded through
 * the same transpiler the app's own contracts tests use.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { laneSummary } = loadTs('src/shared/laneSummary.ts');
const { policyOf } = loadTs('src/shared/teamPolicy.ts');

/** A combination the four presets cannot express, built by hand on purpose:
 *  the rule must hold for custom mixes too. */
const p = (receive, send, commands = false) => ({ receive, send, commands });

test('fully open in both directions says nothing', () => {
  assert.equal(laneSummary(policyOf('open'), policyOf('open')), null);
  assert.equal(laneSummary(policyOf('converse'), policyOf('converse')), null);
  // Commands do not open or close a lane; the sentence is about messages.
  assert.equal(laneSummary(policyOf('converse'), policyOf('open')), null);
});

test('you cannot write to them, and it is your side: your send is off', () => {
  // Listen keeps receive open, so only the outbound lane is closed, by you.
  assert.equal(laneSummary(policyOf('listen'), policyOf('open')), 'youClosedOut');
});

test('you cannot write to them, and it is their side: their receive is off', () => {
  assert.equal(laneSummary(policyOf('open'), p(false, true)), 'theyClosedOut');
});

test('they cannot reach you, and it is your side: your receive is off', () => {
  assert.equal(laneSummary(p(false, true), policyOf('open')), 'youClosedIn');
});

test('they cannot reach you, and it is their side: their send is off', () => {
  assert.equal(laneSummary(policyOf('open'), policyOf('listen')), 'theyClosedIn');
});

test('a double closure names YOUR side, the one the reader can fix', () => {
  // Everything closed by you: the outbound sentence, yours.
  assert.equal(laneSummary(policyOf('off'), policyOf('open')), 'youClosedOut');
  // Outbound closed by you, inbound closed by them: still yours.
  assert.equal(laneSummary(policyOf('listen'), policyOf('listen')), 'youClosedOut');
  // Outbound closed by them, inbound closed by you: yours again, so the
  // preference is about the side, not about which direction happens first.
  assert.equal(laneSummary(p(false, true), p(false, true)), 'youClosedIn');
});

test('a double closure entirely on their side falls to the outbound fact', () => {
  assert.equal(laneSummary(policyOf('open'), policyOf('off')), 'theyClosedOut');
});
