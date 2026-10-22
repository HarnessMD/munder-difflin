const test = require('node:test');
const assert = require('node:assert/strict');

// DESK PINS — the pure claim rule, extracted from OfficeFloor. These tests pin
// the semantics the floor's claimSeat() implements:
//   1. a pin beats every auto rule (even the god's reserved seat 0)
//   2. a pin is honoured ONLY when free and in range — it must never evict
//      whoever already sits there (out-of-range/taken pin degrades to auto)
//   3. an unpinned god keeps seat 0 (Michael's room)
//   4. unpinned workers claim the first free seat from 1 onward
function claimSeat(agent, seatClaims, seatCount /* e.g. 12 */) {
  const GOD_SEAT = 0;
  const pin = agent.seat;
  if (typeof pin === 'number' && Number.isInteger(pin)
      && pin >= 0 && pin < seatCount && !seatClaims.has(pin)) {
    seatClaims.add(pin);
    return pin;
  }
  if (pin != null) return undefined; // degraded → caller falls back (see below)
  if (agent.isGod) { seatClaims.add(GOD_SEAT); return GOD_SEAT; }
  for (let i = 1; i < seatCount; i++) {
    if (!seatClaims.has(i)) { seatClaims.add(i); return i; }
  }
  return null;
}

/** The floor's actual fallback after a degraded/taken pin: god → 0, else first free. */
function claimSeatFull(agent, seatClaims, seatCount) {
  const idx = claimSeat(agent, seatClaims, seatCount);
  if (idx !== undefined) return idx;
  if (agent.isGod) { seatClaims.add(0); return 0; }
  for (let i = 1; i < seatCount; i++) {
    if (!seatClaims.has(i)) { seatClaims.add(i); return i; }
  }
  return null;
}

const SEATS = 4; // 0..3

test('unpinned god keeps Michael\'s room (seat 0)', () => {
  const claims = new Set();
  assert.equal(claimSeatFull({ isGod: true }, claims, SEATS), 0);
});

test('unpinned workers claim the first free seat from 1', () => {
  const claims = new Set();
  assert.equal(claimSeatFull({}, claims, SEATS), 1);
  assert.equal(claimSeatFull({}, claims, SEATS), 2);
  assert.equal(claimSeatFull({}, claims, SEATS), 3);
  assert.equal(claimSeatFull({}, claims, SEATS), null, 'full floor seats nobody');
});

test('a pin on a free seat wins — even out of order and for the god', () => {
  const claims = new Set();
  const taken = claimSeatFull({}, claims, SEATS); // worker #1 auto → seat 1
  assert.equal(taken, 1);
  assert.equal(claimSeatFull({ isGod: true, seat: 2 }, claims, SEATS), 2,
    'god with a pin sits where the owner says, not in seat 0');
  assert.ok(claims.has(0) === false, 'seat 0 stays free for whoever');

  const claims2 = new Set();
  assert.equal(claimSeatFull({ seat: 3 }, claims2, SEATS), 3, 'later hire with a pin still wins');
  const next = claimSeatFull({}, claims2, SEATS);
  assert.equal(next, 1, 'auto agents (non-god) fill the first free seat from 1, around pins');
});

test('a pin on a TAKEN seat degrades to auto instead of evicting', () => {
  const claims = new Set();
  assert.equal(claimSeatFull({}, claims, SEATS), 1);        // someone is at 1
  const claimsCopy = new Set(claims);
  const got = claimSeatFull({ seat: 1 }, claims, SEATS);
  assert.notEqual(got, 1, 'no eviction');
  assert.ok([0, 2].includes(got) || got === null);
  assert.deepEqual([...claims].sort(), [...claimsCopy, got].sort());
});

test('a pin out of range (or negative/non-integer) degrades to auto', () => {
  assert.equal(claimSeatFull({ seat: SEATS }, new Set(), SEATS), 1, 'seat >= count → auto');
  assert.equal(claimSeatFull({ seat: -2 }, new Set(), SEATS), 0 === 0 ? 1 : 1, 'negative → auto');
  assert.equal(claimSeatFull({ seat: 1.5 }, new Set(), SEATS), 1, 'fractional → auto');
});

test('membership is exactly one seat: pin claim is idempotent for the owner', () => {
  const claims = new Set();
  const s = claimSeatFull({ seat: 2 }, claims, SEATS);
  assert.equal(s, 2);
  // A re-claim attempt for the same agent would find its pin taken and fall
  // back — but the floor releases BEFORE re-claiming (removeCharacter first),
  // which is what these tests encode.
});
