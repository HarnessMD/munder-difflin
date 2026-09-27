/**
 * 0.5.3 founder retest (25 Sep), Connections > Inbound integrations:
 *   1. a new webhook's row shows a spinner and "Creating address…" until its
 *      address exists; a failed start shows red with Retry;
 *   2. every row has Delete directly below its on/off toggle, confirmed in
 *      the app (no browser dialog), staged, applied on Save.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { rowAddressState, ADDRESS_TIMEOUT_MS } = loadTs('src/shared/inboundWebhook.ts');
const SRC = read('src/renderer/src/components/settings/InboundIntegrations.tsx');
const MAIN = read('src/main/index.ts');

const row = (p) => ({ saved: true, enabled: true, url: '', starting: false, creatingForMs: 0, ...p });

test('the address line: after Save, creating until the address exists; failed on an error or a timeout', () => {
  assert.equal(rowAddressState(row({ saved: false })), 'unsaved');
  assert.equal(rowAddressState(row({ enabled: false })), 'off');
  assert.equal(rowAddressState(row({})), 'creating');
  assert.equal(rowAddressState(row({ starting: true, error: 'old' })), 'creating', 'a start under way wins over the last error');
  assert.equal(rowAddressState(row({ url: 'https://x.tunnelmole.net/wh-1' })), 'ready');
  assert.equal(rowAddressState(row({ error: 'tunnel unavailable: ETIMEDOUT' })), 'failed');
  assert.equal(rowAddressState(row({ creatingForMs: ADDRESS_TIMEOUT_MS + 1 })), 'failed');
  assert.equal(rowAddressState(row({ url: 'https://x/wh-1', error: 'old' })), 'ready', 'an address beats a stale error');
});

test('main reports starting and the last error, and a retry restarts a server with no tunnel', () => {
  assert.match(MAIN, /webhookStarting = true;\s*lastWebhookError = undefined;/);
  assert.match(MAIN, /try \{ res = await server\.start\(\); \} finally \{ webhookStarting = false; \}\s*if \(!res\.ok\) lastWebhookError = res\.error \?\? 'could not start';/);
  assert.match(MAIN, /starting: webhookStarting,\s*\.\.\.\(lastWebhookError \? \{ error: lastWebhookError \} : \{\}\),/);
  const at = MAIN.indexOf("ipcMain.handle('webhooks:retry'");
  const block = MAIN.slice(at, MAIN.indexOf('\n});', at));
  assert.match(block, /if \(webhookServer && !webhookServer\.publicUrl\(\)\) stopWebhookServer\(\);\s*return startWebhookServer\(\);/);
  assert.match(read('src/preload/index.ts'), /webhooksRetry: \(\): Promise<\{ ok: boolean; url\?: string; error\?: string \}> => ipcRenderer\.invoke\('webhooks:retry'\)/);
});

test('the row draws the spinner, the red line with Retry, and polls often enough to notice', () => {
  assert.match(SRC, /<AddressLine state=\{addr\} url=\{urlOf\(w\.id\)\} error=\{status\?\.error\} retrying=\{retrying\} onRetry=\{retry\} \/>/);
  assert.match(SRC, /animation: 'md-inbound-spin 0\.8s linear infinite'/);
  assert.match(SRC, /\{t\('settings\.conn\.inbound\.creatingAddress'\)\}/);
  assert.match(SRC, /role="alert"[^>]*data-integ-address-line="failed"/);
  assert.match(SRC, /data-integ-retry/);
  assert.match(SRC, /window\.setInterval\(tick, 2000\)/);
  assert.equal(JSON.parse(read('src/renderer/src/i18n/locales/en.json')).settings.conn.inbound.creatingAddress, 'Creating address…');
});

test('Delete sits directly below the toggle on every row, outside any fold', () => {
  const at = SRC.indexOf('hooks.map((w) => {');
  const rowSrc = SRC.slice(at, SRC.indexOf('<Disclosure title={t(\'settings.integ.list.edit\')}', at));
  assert.match(rowSrc, /<Switch on=\{w\.enabled\}[^\n]*\/>\s*<DeleteControl gone=\{gone\}/, 'Delete follows the toggle, in the same column');
  assert.match(rowSrc, /flexDirection: 'column', alignItems: 'flex-end'/);
  assert.ok(!/settings\.integ\.remove/.test(SRC), 'the old Remove inside More is gone');
});

test('Delete confirms in the app, stages, shows Undo, and Save leaves the row out', () => {
  assert.ok(!/window\.confirm|confirm\(/.test(SRC.replace(/deleteConfirm|data-integ-delete-confirm/g, '')), 'no browser dialog');
  const del = SRC.slice(SRC.indexOf('function DeleteControl'), SRC.indexOf('function AddressLine'));
  assert.match(del, /if \(!asking\) return <Btn[^>]*onClick=\{\(\) => setAsking\(true\)\}/);
  assert.match(del, /onClick=\{\(\) => \{ setAsking\(false\); onDelete\(\); \}\}/);
  assert.match(del, /if \(gone\) return <Btn size="sm" onClick=\{onUndo\}/);
  assert.match(SRC, /const removeHook = \(id: string\) => \{ pending\.removed = \[\.\.\.pending\.removed\.filter\(\(x\) => x !== id\), id\]; setHooks\(hooks\); \};/);
  assert.match(SRC, /const saved = await saveWebhooks\(pending\.hooks\.filter\(\(w\) => !removed\.has\(w\.id\)\)\);/);
  assert.match(SRC, /pending\.hooks = null; pending\.tokens = \{\}; pending\.stale = false; pending\.removed = \[\];/, 'Close without saving forgets the deletes');
  for (const l of ['en', 'ar', 'zh-CN']) {
    const ib = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).settings.conn.inbound;
    for (const k of ['creatingAddress', 'addressFailed', 'addressTimedOut', 'retry', 'delete', 'keep', 'deleteNamed', 'deleteConfirm', 'deleteOnSave', 'undo']) assert.ok(ib[k], `${l} lacks ${k}`);
  }
});
