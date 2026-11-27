const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

const workflow = fs.readFileSync(
  path.join(__dirname, '../.github/workflows/daily-copilot-review.yml'),
  'utf8'
)
const script = workflow.split('          script: |\n')[1]
  .split('\n')
  .map(line => line.replace(/^ {12}/, ''))
  .join('\n')
const runScript = new Function(
  'github', 'context', 'core',
  `return (async () => { ${script} })()`
)

const copilot = { login: 'copilot-pull-request-reviewer[bot]', type: 'Bot' }
const pull = (number, overrides = {}) => ({
  number, draft: false, user: { type: 'User' },
  head: { sha: `head-${number}` }, ...overrides
})

async function run({ pulls = [], reviews = {}, pending = {}, errors = {}, accountType = 'User' } = {}) {
  const requests = []
  const failures = []
  const logs = []
  const calls = []
  let summaryWritten = false
  const github = {
    rest: {
      users: { getAuthenticated: async () => ({ data: { login: 'subscriber', type: accountType } }) },
      pulls: {
        list: 'list',
        listReviews: 'reviews',
        listRequestedReviewers: 'pending',
        requestReviewers: async params => {
          if (errors[params.pull_number]) throw new Error(errors[params.pull_number])
          requests.push(params)
        }
      }
    },
    paginate: async (method, params, map) => {
      calls.push({ method, params })
      if (method === 'list') return pulls
      if (method === 'reviews') return reviews[params.pull_number] || []
      return map({ data: { users: pending[params.pull_number] || [] } })
    }
  }
  const summary = {
    addHeading: () => summary,
    addRaw: () => summary,
    addTable: () => summary,
    write: async () => { summaryWritten = true }
  }
  const core = {
    info: message => logs.push(message),
    error: message => logs.push(message),
    setFailed: message => failures.push(message),
    summary
  }
  await runScript(github, { repo: { owner: 'owner', repo: 'repo' } }, core)
  return { requests, failures, logs, calls, summaryWritten }
}

test('daily schedule, manual trigger, personal token, and no contributor code execution', () => {
  assert.match(workflow, /cron: '0 9 \* \* \*'/)
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /permissions: \{\}/)
  assert.match(workflow, /github-token: \$\{\{ secrets\.COPILOT_REVIEW_TOKEN \}\}/)
  assert.match(workflow, /exit 1/)
  assert.doesNotMatch(workflow, /uses: actions\/checkout|pull_request_target:|pull_request:/)
})

test('requests reviews for new and changed human PRs, including the backlog', async () => {
  const result = await run({
    pulls: [pull(1), pull(2)],
    reviews: { 2: [{ user: copilot, submitted_at: 'yesterday', commit_id: 'old-head' }] }
  })
  assert.deepEqual(result.requests.map(request => request.pull_number), [1, 2])
  assert.deepEqual(result.requests[0].reviewers, [copilot.login])
  assert.deepEqual(result.failures, [])
  assert.equal(result.summaryWritten, true)
  assert.ok(result.calls.every(call => call.params.per_page === 100))
})

test('skips drafts, bot PRs, completed current-head reviews, and pending requests', async () => {
  const result = await run({
    pulls: [pull(1, { draft: true }), pull(2, { user: { type: 'Bot' } }), pull(3), pull(4)],
    reviews: { 3: [{ user: copilot, submitted_at: 'today', commit_id: 'head-3' }] },
    pending: { 4: [copilot] }
  })
  assert.deepEqual(result.requests, [])
  assert.deepEqual(result.failures, [])
})

test('human reviews and unsubmitted reviews do not suppress a Copilot review', async () => {
  const result = await run({
    pulls: [pull(1), pull(2)],
    reviews: {
      1: [{ user: { login: 'maintainer' }, submitted_at: 'today', commit_id: 'head-1' }],
      2: [{ user: copilot, submitted_at: null, commit_id: 'head-2' }]
    },
    pending: { 1: [{ login: 'maintainer' }] }
  })
  assert.equal(result.requests.length, 2)
})

test('recognizes the Copilot display login returned by the API', async () => {
  const result = await run({
    pulls: [pull(1), pull(2)],
    reviews: { 1: [{ user: { login: 'Copilot' }, submitted_at: 'today', commit_id: 'head-1' }] },
    pending: { 2: [{ login: 'Copilot' }] }
  })
  assert.deepEqual(result.requests, [])
})

test('surfaces per-PR failures, continues the batch, and fails the run', async () => {
  const result = await run({
    pulls: [pull(1), pull(2)],
    errors: { 1: 'Forbidden' }
  })
  assert.deepEqual(result.requests.map(request => request.pull_number), [2])
  assert.match(result.failures[0], /1 pull request/)
  assert.ok(result.logs.some(message => message.includes('#1') && message.includes('Forbidden')))
  assert.equal(result.summaryWritten, true)
})

test('rejects bot authentication', async () => {
  await assert.rejects(run({ accountType: 'Bot' }), /personal account/)
})
