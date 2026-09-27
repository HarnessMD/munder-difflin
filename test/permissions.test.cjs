// The whole role × permission table, spelled out. A permission added to the
// union without a row here fails the exhaustiveness check below, which is the
// point: gating must be decided in one place, never discovered in a screen.
const { test } = require('node:test');
const assert = require('node:assert');
const loadTs = require('./load-ts.cjs');

const {
  can, standingOf, PERMS, NETWORK_PERMS, KNOWLEDGE_PERMS, isTeamOnly
} = loadTs('src/shared/permissions.ts');

const TABLE = {
  //                   solo   member  admin
  'billing.view':     [false, false,  true],
  'seats.view':       [false, false,  true],
  'seats.manage':     [false, false,  true],
  'team.invite':      [false, false,  true],
  'team.permissions': [false, false,  true],
  'team.remove':      [false, false,  true],
  'knowledge.add':    [false, false,  true],
  'knowledge.suggest':[false, true,   true],
  'self.allow':       [false, true,   true],
};

test('every permission in the union has a row, and no row is stale', () => {
  assert.deepStrictEqual([...PERMS].sort(), Object.keys(TABLE).sort());
});

test('the table is exactly what can() answers', () => {
  for (const [perm, [solo, member, admin]] of Object.entries(TABLE)) {
    assert.strictEqual(can('solo', perm), solo, `${perm} for solo`);
    assert.strictEqual(can('member', perm), member, `${perm} for member`);
    assert.strictEqual(can('admin', perm), admin, `${perm} for admin`);
  }
});

test('a member never sees pricing, billing, seats or invites (founder rule)', () => {
  for (const perm of ['billing.view', 'seats.view', 'seats.manage', 'team.invite']) {
    assert.strictEqual(can('member', perm), false, perm);
    assert.strictEqual(can('solo', perm), false, perm);
  }
});

/* ---- the two families (founder, 4 Sep 2026) ------------------------------
   PRO gained a solo plan, so `solo` is a standing people actually reach and
   the false column above is drawn rather than merely correct. The founder
   named two things as team only, "network" and "computer brain"; they are
   sets here so src/shared/soloPro.ts can compose with them for NAVIGATION
   instead of restating the table. Added, not rewritten: no cell moved. */

test('every permission belongs to exactly one family, and the families cover the union', () => {
  const network = [...NETWORK_PERMS];
  const knowledge = [...KNOWLEDGE_PERMS];
  const overlap = network.filter((p) => knowledge.includes(p));
  assert.deepStrictEqual(overlap, [], 'a permission is in both families');
  // billing.view is neither: it is admin only, not team only. A member in an
  // org cannot see it either, so calling it a team feature would be wrong.
  assert.deepStrictEqual([...network, ...knowledge, 'billing.view'].sort(), [...PERMS].sort(),
    'a permission joined the union without a family; the solo nav has no opinion about it');
});

test('team only means exactly what solo cannot do', () => {
  for (const perm of PERMS) {
    if (isTeamOnly(perm)) {
      assert.strictEqual(can('solo', perm), false, `${perm} is team only and reachable solo`);
      assert.ok(can('member', perm) || can('admin', perm), `${perm} is team only and reachable by nobody`);
    }
  }
  assert.strictEqual(isTeamOnly('billing.view'), false);
  assert.strictEqual(isTeamOnly('knowledge.suggest'), true, 'Team knowledge is the computer brain');
  assert.strictEqual(isTeamOnly('self.allow'), true, 'what my clones allow a TEAMMATE is the network');
});

test('standing is derived from mode and isAdmin: admin survives degraded, not locked', () => {
  assert.strictEqual(standingOf('solo', true), 'solo');
  assert.strictEqual(standingOf('enrolling', true), 'solo');
  assert.strictEqual(standingOf('live', false), 'member');
  assert.strictEqual(standingOf('live', true), 'admin');
  // Degraded is "not reached the server lately", not a demotion (god, 2 Sep).
  assert.strictEqual(standingOf('degraded', true), 'admin');
  assert.strictEqual(standingOf('degraded', false), 'member');
  // Locked is "no longer has standing": the one mode that demotes.
  assert.strictEqual(standingOf('locked', true), 'member');
});
