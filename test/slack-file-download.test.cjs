'use strict';

// Tests for the Slack file-download guard helpers (slack-trigger.cjs) that stop
// MD saving a 2-line HTML auth-redirect STUB instead of the real file.

const assert = require('assert');
const {
  slackFileUrl,
  isSlackHost,
  looksLikeHtmlStub,
  SLACK_FILE_MAX_REDIRECTS,
} = require('../src/main/slack-trigger.cjs');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (err) { failures++; console.log(`  ✗ ${name}\n     ${err.message}`); }
}

console.log('slack file-download guard tests');

test('slackFileUrl prefers url_private_download, falls back to url_private', () => {
  assert.strictEqual(
    slackFileUrl({ url_private: 'https://files.slack.com/a', url_private_download: 'https://files.slack.com/a?dl=1' }),
    'https://files.slack.com/a?dl=1'
  );
  assert.strictEqual(slackFileUrl({ url_private: 'https://files.slack.com/a' }), 'https://files.slack.com/a');
  assert.strictEqual(slackFileUrl({}), undefined);
  assert.strictEqual(slackFileUrl(null), undefined);
});

test('isSlackHost matches only Slack hosts (token never leaks to a foreign host)', () => {
  assert.strictEqual(isSlackHost('files.slack.com'), true);
  assert.strictEqual(isSlackHost('slack.com'), true);
  assert.strictEqual(isSlackHost('spideruci.slack.com'), true);
  assert.strictEqual(isSlackHost('FILES.SLACK.COM'), true);
  assert.strictEqual(isSlackHost('evil.com'), false);
  assert.strictEqual(isSlackHost('slack.com.evil.com'), false);
  assert.strictEqual(isSlackHost('notslack.com'), false);
  assert.strictEqual(isSlackHost(''), false);
  assert.strictEqual(isSlackHost(undefined), false);
});

test('looksLikeHtmlStub catches the EXACT auth-redirect stub from the bug report', () => {
  // The literal content the user saw saved to slack-files/.
  const stub = '<a href="https://spideruci.slack.com/?redir=%2Ffiles-pri%2FT04QM8G1X-F123%2Ffoo.md">Found</a>.';
  assert.strictEqual(looksLikeHtmlStub(undefined, Buffer.from(stub)), true, 'detected by body sniff');
  assert.strictEqual(looksLikeHtmlStub('text/html; charset=utf-8', Buffer.from(stub)), true, 'detected by content-type');
});

test('looksLikeHtmlStub flags html content-type and common html body starts', () => {
  assert.strictEqual(looksLikeHtmlStub('text/html', Buffer.from('anything')), true);
  assert.strictEqual(looksLikeHtmlStub(undefined, Buffer.from('<!DOCTYPE html><html>...')), true);
  assert.strictEqual(looksLikeHtmlStub(undefined, Buffer.from('   <html>')), true, 'leading whitespace tolerated');
  assert.strictEqual(looksLikeHtmlStub(undefined, '<head>'), true, 'accepts string head');
});

test('looksLikeHtmlStub does NOT flag real binary/text file bodies', () => {
  assert.strictEqual(looksLikeHtmlStub('image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47])), false);
  assert.strictEqual(looksLikeHtmlStub('text/markdown', Buffer.from('# A real markdown doc\n\ntext')), false);
  assert.strictEqual(looksLikeHtmlStub('application/octet-stream', Buffer.from('binary\x00stuff')), false);
  assert.strictEqual(looksLikeHtmlStub(undefined, Buffer.from('plain text, no markup')), false);
});

test('SLACK_FILE_MAX_REDIRECTS is a sane positive bound', () => {
  assert.ok(Number.isInteger(SLACK_FILE_MAX_REDIRECTS) && SLACK_FILE_MAX_REDIRECTS >= 1 && SLACK_FILE_MAX_REDIRECTS <= 10);
});

console.log(failures === 0 ? '\nall passed' : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
