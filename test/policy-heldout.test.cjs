'use strict';

// Held-out cases for publishing without sign-off: every way a command can put work
// outside this machine, run against the example backstops with the hardened publish
// pattern from test/fixtures. Labels follow the rule's intent (nothing leaves this machine without the
// operator's sign-off), not the engine's vocabulary. These were written with the
// engine in view, so they measure gaps, not a blind catch rate.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { PolicyEngine } = loadTs('src/main/policy.ts');

const { toEngineRules } = loadTs('src/main/guardrail.ts');

const EXAMPLE = () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples/policy/guardrail.example.json'), 'utf8'));

const HARDENED_PUBLISH = require('./fixtures/guardrail-publish-pattern.json').command_matches;

/** The example backstops, with remote-push held to the hardened publish pattern (the
 *  example ships a short, readable one), and every ledger row captured. */
function shipped() {
  const rules = toEngineRules(EXAMPLE()).map((r) => (r.id === 'remote-push' ? { ...r, match: { ...r.match, command_matches: HARDENED_PUBLISH } } : r));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-heldout-'));
  fs.mkdirSync(path.join(root, 'policy'));
  const rows = [];
  const e = new PolicyEngine(root, (row) => rows.push(row), () => ['agent-a']);
  e.loadRules({ version: 1, rules });
  rows.length = 0; // keep the policy-loaded row out of what the cases assert on
  return { e, rows, root };
}

const pre = (tool_name, tool_input) => ({ hook_event_name: 'PreToolUse', agent_id: 'agent-a', tool_name, tool_input });

// --- H1. Every way of publishing matches ---------------------------------------

test('H1. a push matches every time: an earlier consent is never carried to the next one', () => {
  const { e } = shipped();
  // The engine keeps no consent state, so sign-off on one task cannot be
  // reused silently on the next.
  for (const command of ['git push origin main', 'git push origin main']) {
    assert.equal(!!e.evaluate(pre('Bash', { command })).ruleId, true, command);
  }
});

// Each of these puts work outside this machine, so each must match. Like every
// route in this rule, a --help on one of them matches too: the cost the rule
// accepts rather than an exemption to hide in.
const PUBLISH_ROUTES = [
  'gh pr merge 12 --squash --delete-branch',
  'gh api -X POST repos/o/r/pulls -f head=feat/x -f base=main',
  'gh api --method=PATCH repos/o/r -f private=false',
  'gh repo create o/r --public --source=. --push',
  'curl --request POST -H "Authorization: token $T" https://api.github.com/repos/o/r/issues -d @b.json',
  'git -c alias.ship=push ship origin main',
  'git -C /r -c alias.ship=push ship',
  'git send-pack origin refs/heads/main',
  'bash -c \'gh pr merge 12\''
];

test('H1b. every route that publishes matches, through the engine', () => {
  const { e } = shipped();
  for (const command of PUBLISH_ROUTES) {
    const v = e.evaluate(pre('Bash', { command }));
    assert.equal(!!v.ruleId, true, command);
    assert.equal(v.ruleId, 'remote-push', command);
  }
});

test('H1c. the neighbours of those routes that publish nothing do not match', () => {
  const { e } = shipped();
  for (const command of [
    'gh api repos/o/r/pulls',
    'gh api -X GET repos/o/r/pulls',
    'gh pr view 12',
    'gh repo create o/r --private',
    'git -c alias.lg=log lg --oneline',
    'curl --request GET https://api.github.com/repos/o/r',
    'curl --request POST http://localhost:8080/hook',
    'git push --dry-run',
    'echo "gh pr merge 12"'
  ]) {
    assert.equal(!!e.evaluate(pre('Bash', { command })).ruleId, false, command);
  }
});

// Found in review: each of these writes to GitHub with no
// write verb on the command line, or in a verb's lower case.
test('H1e. a write the tool performs implicitly matches', () => {
  const { e } = shipped();
  for (const command of [
    'gh api repos/o/r/pulls -f head=feat/x -f base=main',
    'gh api repos/o/r/issues -F title=x',
    'gh api repos/o/r/issues --field title=x',
    'gh api repos/o/r/issues --raw-field body=y',
    'gh api repos/o/r/issues --input body.json',
    'gh api graphql -f query=\'mutation { addStar(input:{starrableId:"x"}) { clientMutationId } }\'',
    'gh api --method post repos/o/r/issues',
    'gh api -X delete repos/o/r/git/refs/heads/x',
    'curl -XPOST https://api.github.com/repos/o/r/issues',
    'curl --request post https://api.github.com/repos/o/r/issues',
    'curl -d @b.json https://api.github.com/repos/o/r/issues',
    'curl --data-binary @b.json https://api.github.com/repos/o/r/issues',
    'curl --json \'{"title":"x"}\' https://api.github.com/repos/o/r/issues',
    'curl -H "Content-Type: application/octet-stream" --data-binary @a.zip "https://uploads.github.com/repos/o/r/releases/1/assets?name=a.zip"',
    'curl -T a.zip https://uploads.github.com/repos/o/r/releases/1/assets'
  ]) {
    const v = e.evaluate(pre('Bash', { command }));
    assert.equal(!!v.ruleId, true, command);
    assert.equal(v.ruleId, 'remote-push', command);
  }
});

test('H1f. --dry-run given as the VALUE of a flag does not exempt a real push', () => {
  const { e } = shipped();
  for (const command of [
    'git push -o --dry-run origin main',
    'git push --push-option --dry-run origin main',
    'gh pr merge 12 -b --dry-run'
  ]) {
    assert.equal(!!e.evaluate(pre('Bash', { command })).ruleId, true, command);
  }
  // Fails closed: a real dry run behind a flag matches too. One prompt.
  assert.equal(!!e.evaluate(pre('Bash', { command: 'git push -v --dry-run' })).ruleId, true);
});

test('H1h. a push still matches when a dry run is cancelled, or hidden behind a git option with a value', () => {
  const { e } = shipped();
  for (const command of [
    'git push --dry-run --no-dry-run origin main',
    "git push -o 'x --dry-run y' origin main",
    'git push --push-option="a --dry-run" origin main',
    'git --git-dir /r/.git push origin main',
    'git --work-tree /r push origin main',
    'git --git-dir /r/.git --work-tree /r push origin main',
    // The subtree branch once took no global options, so this matched nothing.
    'git -C x subtree push -P p origin feat',
    'git --git-dir /r/.git subtree push --prefix=p origin feat',
  ]) {
    assert.equal(!!e.evaluate(pre('Bash', { command })).ruleId, true, command);
  }
});

test('H1g. reads, local calls and real dry runs near those shapes still pass', () => {
  const { e } = shipped();
  for (const command of [
    'gh api repos/o/r/issues',
    'gh api -X GET repos/o/r/issues -f state=open',
    'gh api --method get repos/o/r/issues -F per_page=100',
    'gh api graphql -f query=\'query { viewer { login } }\'',
    'gh api repos/o/r/contents/README.md --jq .sha',
    'curl https://api.github.com/repos/o/r',
    'curl -fsSL https://api.github.com/repos/o/r/releases/latest',
    'curl -H "Accept: application/vnd.github+json" https://api.github.com/user',
    'curl -d @b.json http://localhost:8080/hook',
    'curl -o a.zip https://uploads.github.com/x',
    'git push --dry-run',
    'git push origin main --dry-run',
    'git push --dry-run -u origin fix/x',
    'npm publish --dry-run',
    'echo "curl -d x https://api.github.com"',
    'grep -n "gh api" notes.md'
  ]) {
    assert.equal(!!e.evaluate(pre('Bash', { command })).ruleId, false, command);
  }
});

// --- H4. Every shipped pattern stays linear --------------------------------------

test('H4. the shipped command patterns run in linear time: a crafted command cannot stall the main process', () => {
  // Shapes that once made a pattern quadratic or exponential in the command length.
  // remote-push's git-option loop read `--x` two ways, so `git` + N double-dash flags + a
  // non-push word was exponential: 24 flags (106 characters) took 6.3 s.
  const SHAPES = [['bb ', 'pr -x '], ['bb ', 'pr -x y '], ['BB -x ', 'pr '], ['git push ', '-o x '], ['gh api ', '-f x '],
    ['git ', '--x '], ['git ', '-C '], ['git ', '--git-dir '], ['git -C x ', '--request '], ['git ', '-c ']];
  const patterns = [...toEngineRules(EXAMPLE()).filter((x) => x.match.command_matches).map((r) => [r.id, r.match.command_matches]), ['hardened publish', HARDENED_PUBLISH]];
  for (const [id, pattern] of patterns) {
    const re = new RegExp(pattern);
    for (const [head, unit] of SHAPES) {
      const s = head + unit.repeat(Math.ceil(60000 / unit.length)) + 'Q';
      const t = Date.now();
      re.test(s);
      re.test(head + unit.repeat(40) + 'status');
      assert.ok(Date.now() - t < 150, `${id}: ${JSON.stringify(head)} + ${JSON.stringify(unit)} x 60k chars took ${Date.now() - t} ms`);
    }
  }
});
