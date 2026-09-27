// PRO phase 5: Subscription & billing, admin only twice (the row by can(),
// the answer by main from the relay-verified /me), fed by the relay's
// GET /billing, with every figure a minor unit and a currency.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const B = loadTs('src/shared/billing.ts');

const wire = (extra = {}) => ({
  state: 'healthy', trialEndsAt: null, renewalAt: '2026-10-01T00:00:00.000Z', graceEndsAt: null,
  seatsPaid: 10, seatsUsed: 3, pricePerSeatMinor: 3900, currency: 'USD',
  card: { brand: 'visa', last4: '4242', expiryMonth: 4, expiryYear: 2029 },
  invoices: [{ invoiceId: 'pay_1', at: '2026-09-01T00:00:00.000Z', amountMinor: 39000, currency: 'USD', status: 'paid', receiptUrl: null }],
  serverTime: '2026-09-02T18:00:00.000Z', ...extra
});

test('the wire body is validated field by field and never trusted', () => {
  const v = B.parseBillingWire(wire({ razorpay: { customerId: 'cust_x' }, extra: 1 }));
  assert.ok(v);
  assert.ok(!('razorpay' in v) && !('extra' in v), 'unknown fields never ride through');
  assert.equal(B.parseBillingWire(wire({ state: 'paused' })), null);
  assert.equal(B.parseBillingWire(wire({ pricePerSeatMinor: '39.00' })), null, 'money is a number of minor units, never a string');
  assert.equal(B.parseBillingWire(wire({ currency: 'EUR' })), null);
  assert.equal(B.parseBillingWire(wire({ card: { brand: 'visa', last4: '42', expiryMonth: 4, expiryYear: 2029 } })), null);
  assert.equal(B.parseBillingWire(wire({ card: null })).card, null);
  assert.equal(B.parseBillingWire(wire({ invoices: [{ invoiceId: 'x' }, ...wire().invoices] })).invoices.length, 1, 'a bad invoice row is dropped, not the view');
  assert.equal(B.parseBillingWire(null), null);
  assert.equal(B.parseBillingWire('{}'), null);
});

test('money, totals, the key date and the tone', () => {
  assert.equal(B.fmtMoney(3900, 'USD'), '$39.00');
  assert.equal(B.fmtMoney(320000, 'INR', 'en-IN'), '₹3,200.00');
  assert.equal(B.monthlyTotalMinor({ seatsPaid: 10, pricePerSeatMinor: 3900 }), 39000);
  assert.equal(B.keyDateFor(wire()), '2026-10-01T00:00:00.000Z');
  assert.equal(B.keyDateFor(wire({ state: 'trialing', trialEndsAt: 'T' })), 'T');
  assert.equal(B.keyDateFor(wire({ state: 'payment-failed', graceEndsAt: 'G' })), 'G');
  assert.equal(B.keyDateFor(wire({ state: 'cancelled' })), null);
  assert.deepEqual(['healthy', 'trialing', 'payment-failed', 'cancelled'].map(B.stateTone), ['ok', 'warn', 'bad', 'muted']);
});

test('main is the second wall: a non-admin is refused before any network call', () => {
  const main = read('src/main/index.ts');
  const h = main.slice(main.indexOf("ipcMain.handle('billing:summary'"), main.indexOf("ipcMain.handle('teams:org:verify'"));
  assert.ok(h.length > 0, 'billing:summary handler missing');
  const refuse = h.indexOf("if (!org.available || org.you?.isAdmin !== true) return { ok: false, reason: 'refused' };");
  const fetchAt = h.indexOf('await fetchBilling()');
  assert.ok(refuse > 0 && fetchAt > refuse, 'the admin check must come before the fetch');
  assert.match(h, /const org = teamsOrg\.view\(\)/, 'the standing is main\'s relay-verified view, not the renderer\'s word');
  assert.match(h, /parseBillingWire\(r\.data\)/, 'the body is validated, not cast');
  const relay = read('src/main/relay.ts');
  assert.match(relay, /path: '\/billing', deviceId/);
  const preload = read('src/preload/index.ts');
  assert.match(preload, /billingSummary: \(\): Promise<BillingSummary> => ipcRenderer\.invoke\('billing:summary'\)/);
});

test('the billing row and page are drawn only for billing.view, and money actions go to the console', () => {
  const sidebar = strip(read('src/renderer/src/components/pro/ProSidebar.tsx'));
  assert.match(sidebar, /can\(standing, 'billing\.view'\) && \(\s*<MenuRow icon="billing"/);
  const page = strip(read('src/renderer/src/components/pro/BillingScreen.tsx'));
  assert.match(page, /can\(standing, 'billing\.view'\)/);
  assert.ok(!/isAdmin/.test(page));
  assert.match(page, /consoleUrl\('billing'\)/);
  assert.ok(!/razorpay|Razorpay\(|checkout\.js|card\s*number|cvv/i.test(page), 'the desktop never takes a card or charges');
  assert.match(page, /fmtMoney\(/, 'the page formats money through the one function');
  const nav = loadTs('src/renderer/src/components/pro/proNav.ts');
  assert.ok(nav.PRO_PAGES.includes('billing') && !nav.PRO_SCREENS.includes('billing'));
  assert.match(read('src/renderer/src/components/pro/ProShell.tsx'), /case 'billing': return <BillingScreen \/>;/);
});

test('the org key fingerprint form passes through keyGroups unchanged', () => {
  const org = read('src/main/teamsOrg.ts');
  assert.match(org, /export const KEY_GROUPS_RE = \/\^\[0-9A-F\]\{4\}\( \[0-9A-F\]\{4\}\)\{5\}\$\//);
  assert.match(org, /if \(KEY_GROUPS_RE\.test\(signingKey\)\) return signingKey;/);
  assert.ok(/^[0-9A-F]{4}( [0-9A-F]{4}){5}$/.test('8F2A 41C7 90DE 5B36 A1F8 7C24'));
});

test('every pro.billing.* key the page uses exists in all three locales', () => {
  const page = read('src/renderer/src/components/pro/BillingScreen.tsx');
  const keys = new Set([...page.matchAll(/t\('((?:pro|team)\.[a-zA-Z.]+)'/g)].map((m) => m[1]));
  for (const k of ['refused', 'unavailable', 'offline', 'error']) keys.add(`pro.billing.fail.${k}`);
  for (const k of ['trialing', 'healthy', 'payment-failed', 'cancelled']) { keys.add(`pro.billing.state.${k}`); keys.add(`pro.billing.stateBlurb.${k}`); }
  for (const k of ['date', 'amount', 'status', 'receipt']) keys.add(`pro.billing.col.${k}`);
  for (const k of ['paid', 'failed', 'refunded']) keys.add(`pro.billing.invoiceStatus.${k}`);
  keys.add('pro.menu.billing');
  assert.ok(keys.size > 30, `parser found only ${keys.size} keys`);
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const dict = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`));
    for (const k of keys) {
      const v = k.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), dict);
      assert.equal(typeof v, 'string', `${lang} is missing ${k}`);
    }
  }
});
