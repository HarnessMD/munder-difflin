// 0.4.9 phase 6b, founder 3 Sep 2026: connections and the role bundle sheet.
//
// Three asks, and the traps under each:
//
//   6.4 "the connections modal        A bug report with no detail, and three
//        is broken"                   defects under it. The header mapped every
//                                     template to its own Add button, which was
//                                     right at two templates and clips the close
//                                     control at nine. The template behind a
//                                     record was looked up by KIND, and seven
//                                     templates share the custom-rest kind, so
//                                     Stripe was handed Custom REST API's help.
//                                     And a second connection from the same
//                                     preset reused the first one's id, which is
//                                     also its secret's handle: upsert replaced
//                                     the record and the new one inherited the
//                                     old key, under a toast that said "Added".
//
//   6.5 "a custom API connection      Five shapes, one function, and a rule the
//        that supports every API      shapes make easy to break: the preview has
//        key auth shape a real        to prove what will be sent without ever
//        service uses"                putting the key on the screen. So the
//                                     preview takes NO secret at all, and both
//                                     it and the request read one description of
//                                     each shape. The other trap is the unset
//                                     secret: a missing value in a template
//                                     literal is the four letter string
//                                     "undefined", and `Bearer undefined` is a
//                                     401 nobody can see the cause of. And a
//                                     query parameter shape rides on the URL,
//                                     so a forward path that merges only the
//                                     headers drops the credential in silence.
//
//   6.6 "the role bundle modal is     Eleven cards each unpacking their own MCP,
//        undesigned"                  skills and tools chips is around two
//                                     hundred chips at once, in which the
//                                     selection is a one pixel border and the
//                                     question the sheet exists to answer, what
//                                     this button does to this agent, is
//                                     nowhere. Undesigned is not "needs nicer
//                                     spacing": it is a layout that does not
//                                     carry the meaning. So it splits the way
//                                     TaskSheet splits, and this file pins it to
//                                     TaskSheet rather than to numbers of its
//                                     own, because a second spacing scale is the
//                                     thing that was wrong.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const conn = strip(read(`${PRO}/ConnectionsSheet.tsx`));
const bundle = strip(read(`${PRO}/BundleSheet.tsx`));
const taskSheet = strip(read(`${PRO}/TaskSheet.tsx`));
const broker = strip(read('src/main/integrationBroker.ts'));
const main = strip(read('src/main/index.ts'));

const A = loadTs('src/shared/apiAuth.ts');
const I = loadTs('src/shared/integrations.ts');

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const LOCALES = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
const BANNED = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;
const DASH = /—|–| - /;

const SECRET = 'sk_live_51H8xQ2Lp';

/* ---- 6.5a every shape produces the right request pieces -------------------- */

test('each of the five shapes puts the key exactly where its provider asks for it', () => {
  assert.deepEqual(A.apiAuthParts({ mode: 'none' }, SECRET), { headers: {}, query: {} },
    'a public API gets nothing, even when a key happens to be stored');

  assert.deepEqual(A.apiAuthParts({ mode: 'bearer' }, SECRET),
    { headers: { authorization: `Bearer ${SECRET}` }, query: {} });

  assert.deepEqual(A.apiAuthParts({ mode: 'header', header: 'X-Api-Key' }, SECRET),
    { headers: { 'x-api-key': SECRET }, query: {} },
    'the header name is lowercased, the way fetch sends it, and the key rides alone');

  assert.deepEqual(A.apiAuthParts({ mode: 'prefix', header: 'Authorization', prefix: 'Token' }, SECRET),
    { headers: { authorization: `Token ${SECRET}` }, query: {} },
    'one space, added here, so the person types the word and not the spacing');

  assert.deepEqual(A.apiAuthParts({ mode: 'query', param: 'api_key' }, SECRET),
    { headers: {}, query: { api_key: SECRET } },
    'a query shape contributes NO header: it rides on the URL');

  const basic = A.apiAuthParts({ mode: 'basic', user: 'you@example.com' }, SECRET);
  assert.deepEqual(basic, {
    headers: { authorization: `Basic ${Buffer.from(`you@example.com:${SECRET}`, 'utf8').toString('base64')}` },
    query: {}
  }, 'basic folds the user and the key into one base64 pair');

  assert.deepEqual(A.apiAuthParts({ mode: 'github' }, SECRET), {
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      authorization: `Bearer ${SECRET}`
    },
    query: {}
  }, 'the GitHub preset keeps the two constant headers it always sent');
});

test('base64 is right for ASCII and for the bytes a hand rolled encoder gets wrong', () => {
  for (const s of ['', 'a', 'ab', 'abc', 'you@example.com:sk_live_1', 'p:\u00e4\u00df\u4f60\u597d', '\u{1f511}:k']) {
    assert.equal(A.base64Utf8(s), Buffer.from(s, 'utf8').toString('base64'), `base64 of ${JSON.stringify(s)}`);
  }
});

/* ---- 6.5b an unset secret produces nothing, never "undefined" -------------- */

test('no secret means no credential, and never the literal string undefined', () => {
  const shapes = [
    { mode: 'bearer' },
    { mode: 'header', header: 'X-Api-Key' },
    { mode: 'prefix', header: 'Authorization', prefix: 'Token' },
    { mode: 'query', param: 'api_key' },
    { mode: 'basic', user: 'you@example.com' }
  ];
  for (const auth of shapes) {
    for (const missing of [undefined, null, '', '   ']) {
      const parts = A.apiAuthParts(auth, missing);
      assert.deepEqual(parts, { headers: {}, query: {} },
        `${auth.mode} with ${JSON.stringify(missing)} sent something`);
      const written = [...Object.values(parts.headers), ...Object.values(parts.query)].join(' ');
      assert.ok(!/undefined|null|NaN/.test(written), `${auth.mode} wrote a missing value into the request`);
    }
  }
  // GitHub is the one shape with headers that are not credentials: a public
  // read still needs them, so they ride without a token and nothing else does.
  const gh = A.apiAuthParts({ mode: 'github' }, undefined);
  assert.deepEqual(Object.keys(gh.headers).sort(), ['accept', 'x-github-api-version']);
  assert.equal(gh.headers.authorization, undefined);
});

test('a half configured shape sends nothing rather than a header with no name', () => {
  for (const auth of [
    { mode: 'header', header: '' },
    { mode: 'header', header: 'not a header name' },
    { mode: 'prefix', header: 'Authorization', prefix: '' },
    { mode: 'prefix', header: 'Authorization', prefix: 'two words' },
    { mode: 'query', param: '' },
    { mode: 'basic', user: '' },
    { mode: 'basic', user: 'has:a:colon' }
  ]) {
    assert.deepEqual(A.apiAuthParts(auth, SECRET), { headers: {}, query: {} },
      `${auth.mode} sent something while it was still half filled in`);
    assert.equal(A.apiAuthSlot(auth), null);
    assert.ok(A.validateApiAuth(auth) !== null, `${JSON.stringify(auth)} passed validation`);
  }
  assert.equal(A.validateApiAuth({ mode: 'prefix', header: 'bad name', prefix: 'Token' }), 'header');
  assert.equal(A.validateApiAuth({ mode: 'prefix', header: 'Authorization', prefix: '' }), 'prefix');
  assert.equal(A.validateApiAuth({ mode: 'query', param: 'api_key' }), null);
  assert.equal(A.validateApiAuth({ mode: 'basic', user: 'you@example.com' }), null);
});

/* ---- 6.5c the mask, and a preview that cannot leak ------------------------ */

test('the masking function never returns the secret, whatever the secret is', () => {
  const battery = ['a', 'ab', 'sk', 'sk_live_51H8xQ2Lp', '****', '   x   ', 'ghp_' + 'A'.repeat(36), '\u4f60\u597d'];
  // The whole guarantee, in one line: the result does not depend on the value,
  // so it can carry no character, no prefix and no length of the real key.
  for (const s of battery) {
    assert.equal(A.maskSecret(s), A.SECRET_MASK, `mask of ${JSON.stringify(s)} depends on the value`);
  }
  // Which means the mask is never the key, except for the one key that is
  // already four stars, and even there the function never looked at it.
  for (const s of battery.filter((x) => x.trim() !== A.SECRET_MASK)) {
    assert.notEqual(A.maskSecret(s), s.trim());
    assert.ok(!A.maskSecret(s).includes(s.trim()), `mask leaked ${JSON.stringify(s)}`);
  }
  assert.equal(A.maskSecret(undefined), '');
  assert.equal(A.maskSecret(''), '');
  assert.equal(A.maskSecret('   '), '', 'whitespace is not a stored key');
});

test('the preview draws the shape and CANNOT draw the value: it takes no secret', () => {
  assert.equal(A.apiAuthPreview.length, 1, 'a second parameter would be somewhere to pass a key');
  assert.equal(A.apiAuthPreview({ mode: 'bearer' }), 'Authorization: Bearer ****');
  assert.equal(A.apiAuthPreview({ mode: 'header', header: 'X-Api-Key' }), 'X-Api-Key: ****');
  assert.equal(A.apiAuthPreview({ mode: 'prefix', header: 'Authorization', prefix: 'Token' }), 'Authorization: Token ****');
  assert.equal(A.apiAuthPreview({ mode: 'query', param: 'api_key' }), '?api_key=****');
  assert.equal(A.apiAuthPreview({ mode: 'basic', user: 'you@example.com' }), 'Authorization: Basic ****',
    'the pair is base64 in the request; on screen it is the mask, not an encoding of the key');
  assert.equal(A.apiAuthPreview({ mode: 'none' }), '', 'nothing sent reads as nothing, not as an empty header');
});

test('the preview and the request agree on where the credential goes', () => {
  const shapes = [
    { mode: 'bearer' },
    { mode: 'header', header: 'X-Api-Key' },
    { mode: 'prefix', header: 'Authorization', prefix: 'Token' },
    { mode: 'query', param: 'api_key' },
    { mode: 'basic', user: 'you@example.com' },
    { mode: 'github' }
  ];
  for (const auth of shapes) {
    const slot = A.apiAuthSlot(auth);
    const parts = A.apiAuthParts(auth, SECRET);
    const drawn = A.apiAuthPreview(auth);
    if (slot.where === 'header') {
      assert.ok(slot.name in parts.headers, `${auth.mode}: the slot names a header the request does not send`);
      assert.ok(drawn.toLowerCase().startsWith(`${slot.name}:`), `${auth.mode}: the preview names a different header`);
    } else {
      assert.ok(slot.name in parts.query, `${auth.mode}: the slot names a parameter the request does not send`);
      assert.ok(drawn.startsWith(`?${slot.name}=`));
    }
    assert.ok(!drawn.includes(SECRET), `${auth.mode}: the preview carries the key`);
  }
});

/* ---- 6.5d the record, and the forward path -------------------------------- */

test('the registry accepts each new shape and refuses a field left over from another', () => {
  const base = { id: 'my-api', label: 'My API', kind: 'custom-rest', baseUrl: 'https://api.example.com', enabled: true };
  const ok = (r) => {
    const v = I.validateIntegrationRecord(r);
    assert.ok(v.ok, `rejected: ${v.error}`);
    return v.value;
  };
  assert.equal(ok({ ...base, authType: 'prefix', authHeader: 'Authorization', authPrefix: 'Token' }).authPrefix, 'Token');
  assert.equal(ok({ ...base, authType: 'query', authQuery: 'api_key' }).authQuery, 'api_key');
  assert.equal(ok({ ...base, authType: 'basic', authUser: 'you@example.com' }).authUser, 'you@example.com');
  // Every shape that stores a secret gets a handle, and only a handle.
  for (const t of ['bearer', 'header', 'prefix', 'query', 'basic', 'github']) assert.equal(I.authTypeNeedsSecret(t), true);
  assert.equal(I.authTypeNeedsSecret('none'), false);

  for (const bad of [
    { ...base, authType: 'prefix', authHeader: 'Authorization' },
    { ...base, authType: 'query' },
    { ...base, authType: 'basic' },
    { ...base, authType: 'bearer', authQuery: 'api_key' },
    { ...base, authType: 'query', authQuery: 'api_key', authUser: 'you@example.com' }
  ]) {
    assert.equal(I.validateIntegrationRecord(bad).ok, false, `${JSON.stringify(bad)} was accepted`);
  }
});

test('the forward path carries BOTH halves, so a query parameter key is not dropped in silence', () => {
  const rec = { authType: 'query', authQuery: 'appid' };
  assert.deepEqual(I.buildAuthRequest(rec, SECRET), { headers: {}, query: { appid: SECRET } });
  assert.deepEqual(I.buildAuthRequest({ authType: 'basic', authUser: 'u' }, undefined), { headers: {}, query: {} });
  // The two places a secret is ever injected both take the query half and set
  // it on the URL. A merge of headers alone is the defect this pins shut.
  assert.match(broker, /const \{ headers: injected, query: injectedQuery \} = buildAuthRequest\(rec, secret\);/);
  assert.match(broker, /for \(const \[k, v\] of Object\.entries\(injectedQuery\)\) upstream\.searchParams\.set\(k, v\);/);
  assert.match(main, /const \{ headers, query \} = buildAuthRequest\(rec, secret\);/);
  assert.match(main, /for \(const \[k, v\] of Object\.entries\(query\)\) target\.searchParams\.set\(k, v\);/);
  assert.ok(!/buildAuthHeaders/.test(broker + main), 'the headers only builder is gone, not merely unused');
});

test('no renderer file may build a real credential: that lives in main', () => {
  const files = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))
    .filter((f) => /\.tsx?$/.test(f));
  for (const f of files('src/renderer/src')) {
    const src = strip(read(f));
    assert.ok(!/\bapiAuthParts\b/.test(src), `${f} builds a real auth header in the renderer`);
    assert.ok(!/\bbuildAuthRequest\b/.test(src), `${f} builds a real auth request in the renderer`);
  }
  // And the one preview call the editor makes is passed a shape, never a key.
  for (const m of conn.matchAll(/apiAuthPreview\(([^)]*\)?[^)]*)\)/g)) {
    assert.ok(!m[1].includes(','), `apiAuthPreview called with a second argument: ${m[0]}`);
  }
});

/* ---- 6.4 the connections modal -------------------------------------------- */

test('the header cannot outgrow the sheet again: adding is one button, choosing is a step', () => {
  const header = conn.slice(conn.indexOf('width={720}>'), conn.indexOf('{draft ? ('));
  assert.ok(header.includes('<CloseX'), 'the close control is in the header');
  assert.ok(!header.includes('<Btn'), 'no button in the header, so nine templates cannot clip the close control');
  assert.ok(!/templates\.map\(\(x\) => <Btn/.test(conn), 'the one button per template row is gone');
  assert.equal((conn.match(/templates\.map\(/g) || []).length, 1, 'templates are listed in exactly one place');
  assert.match(conn, /\{templates\.map\(\(x\) => \(\s*<Card/, 'and that place is the picker, as cards');
  // The action sits in the footer, on the right, as it does on TaskSheet.
  assert.match(conn, /<Btn size="sm" kind="primary" disabled=\{templates\.length === 0\} onClick=\{\(\) => setPicking\(true\)\}/);
  assert.match(conn, /t\('pro\.conn\.add'\)/);
});

test('a record remembers the template it came from, so seven custom REST APIs stop sharing one name', () => {
  assert.ok(!/templates\.find\(\(x\) => x\.kind ===/.test(conn), 'the kind lookup that always answered Custom REST API is gone');
  assert.match(conn, /const tpl = draft \? resolveTemplate\(templates, draft\) : undefined;/);
  assert.match(conn, /resolveTemplate\(templates, r\)\?\.label/, 'the list chip resolves the same way');
  assert.match(conn, /templateId: tpl\.idSuggestion/, 'adding stamps the template on the record');
  assert.match(conn, /templateId: draft\.templateId/, 'and saving carries it back');

  // The defect, in the resolver itself. Seven templates share the kind.
  const tpls = I.INTEGRATION_TEMPLATES;
  const customRest = tpls.filter((x) => x.kind === 'custom-rest');
  assert.ok(customRest.length > 1, 'a kind lookup is only ambiguous while a kind has more than one template');
  assert.equal(tpls.find((x) => x.kind === 'custom-rest').label, 'Custom REST API',
    'this is the wrong answer the old code gave for Stripe, Linear, Notion, Jira, Sentry, Confluence and HubSpot');

  const stripe = tpls.find((x) => x.idSuggestion === 'stripe');
  assert.equal(I.resolveTemplate(tpls, { kind: 'custom-rest', baseUrl: stripe.baseUrl, templateId: 'stripe' }).label, 'Stripe');
  // A record written before the stamp existed still finds itself by base URL.
  assert.equal(I.resolveTemplate(tpls, { kind: 'custom-rest', baseUrl: stripe.baseUrl }).label, 'Stripe');
  // And an unrecognisable one says nothing rather than naming the wrong provider.
  assert.equal(I.resolveTemplate(tpls, { kind: 'custom-rest', baseUrl: 'https://api.acme.test' }), undefined);
  // One template owns the github kind, so that lookup is still unambiguous.
  assert.equal(I.resolveTemplate(tpls, { kind: 'github', baseUrl: 'https://api.github.com' }).label, 'GitHub');
});

test('a second connection from the same preset gets its own id, and never the first one\'s key', () => {
  assert.match(conn, /const freeId = \(seed: string\): string => \{/);
  assert.match(conn, /for \(let n = 2; taken\.has\(id\); n \+= 1\) id = slugify\(`\$\{base\}-\$\{n\}`\);/);
  assert.match(conn, /id: freeId\(tpl\.idSuggestion \|\| tpl\.label\)/, 'adding starts from a free id');
  assert.match(conn, /if \(d\.isNew && \(records \?\? \[\]\)\.some\(\(r\) => r\.id === idOf\(d\)\)\) return t\('pro\.conn\.errDuplicate'\);/,
    'and a collision is refused before it is written');
  // An EDIT keeps the id it was written under. Re-slugging one writes a second
  // record and orphans the first, with the key still bound to the old handle.
  assert.match(conn, /const idOf = \(d: Draft\) => \(d\.isNew \? slugify\(d\.id \|\| d\.label\) : d\.id\);/);
  // The handle is derived from the id, which is why a shared id shares a key.
  assert.equal(I.secretRefFor('jira'), 'int:jira');
});

test('the editor asks for the field each shape needs, and says in one line what the shape is', () => {
  for (const [mode, field] of [['prefix', 'authPrefix'], ['query', 'authQuery'], ['basic', 'authUser']]) {
    assert.ok(conn.includes(`draft.authType === '${mode}'`), `${mode} has no field of its own`);
    // Saved trimmed, and ONLY by the shape that sends it: a header name left
    // behind by a shape the person moved away from is refused by the registry.
    assert.ok(conn.includes(`${field}: at === '${mode}' ? draft.${field}.trim() : undefined`), `${field} is not saved for ${mode} alone`);
  }
  assert.match(conn, /\(draft\.authType === 'header' \|\| draft\.authType === 'prefix'\)/, 'both header shapes ask for a name');
  assert.match(conn, /hint=\{draft\.kind === 'custom-rest' \? t\(`pro\.conn\.authWhy\.\$\{draft\.authType\}`\)/,
    'the one line explanation rides with the picker, for the person reading their provider docs');
  assert.match(conn, /const CUSTOM_AUTH: readonly ApiAuthMode\[\] = API_AUTH_MODES;/);
  assert.deepEqual([...A.API_AUTH_MODES], ['none', 'bearer', 'header', 'prefix', 'query', 'basic'],
    'github is a preset, not a shape a person picks');
  assert.match(conn, /type="password"/, 'the secret is write only');
  assert.match(conn, /<ConfirmDialog danger[^\n]*pro\.conn\.removeTitle/);
  for (const door of ['listTemplates', 'list', 'save', 'remove', 'test']) {
    assert.match(conn, new RegExp(`integrationsClient\\.${door}\\(`), door);
  }
});

test('the connections sheet and the bundle sheet keep TaskSheet\'s header, body and footer', () => {
  for (const [name, src] of [['ConnectionsSheet', conn], ['BundleSheet', bundle]]) {
    assert.ok(src.includes("padding: '14px 18px', borderBottom: '1px solid var(--cth-ink-300)'"), `${name}: header`);
    assert.ok(src.includes("padding: '12px 18px', borderTop: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)'"), `${name}: footer`);
    assert.ok(taskSheet.includes("padding: '14px 18px', borderBottom: '1px solid var(--cth-ink-300)'"), 'TaskSheet is still the reference');
    assert.ok(taskSheet.includes("padding: '12px 18px', borderTop: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)'"));
    // One even 1px border per surface: no edge is ever thicker than the others.
    assert.ok(!/border(Left|Right)/.test(src), `${name}: a border on one side of something`);
    assert.equal((src.match(/borderBottom/g) || []).length, 1, `${name}: one hairline under the header`);
    assert.equal((src.match(/borderTop/g) || []).length, 1, `${name}: one hairline over the footer`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src), `${name}: kit tokens only`);
  }
});

/* ---- 6.6 the role bundle sheet -------------------------------------------- */

test('the sheet splits into the roles, the chosen role, and who is receiving it', () => {
  assert.ok(bundle.includes("gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 24, padding: 18"),
    'main and rail, on TaskSheet\'s 18px body and 24px column gap');
  assert.ok(taskSheet.includes('gap: 24, padding: 18'), 'TaskSheet is still the reference');
  // The eleven cards no longer each unpack the catalog: only the chosen one does.
  assert.ok(!/ROLE_BUNDLES\.map\([\s\S]{0,400}MCP_CATALOG/.test(bundle), 'every card is drawing every chip again');
  assert.match(bundle, /\{ROLE_BUNDLES\.map\(\(b\) => <RolePick key=\{b\.id\} b=\{b\} on=\{b\.id === chosen\.id\}/);
  assert.match(bundle, /\{chosen\.mcp\.map\(\(id\) => \{/, 'the chosen role is the one that opens up');
  assert.match(bundle, /t\('pro\.bundles\.counts', \{ mcp: b\.mcp\.length, skills: b\.skills\.length, tools: b\.tools\.length \}\)/,
    'a card that does not list its contents still says how much is in it');
});

test('each half says whether Grant writes it, next to the chips it is talking about', () => {
  assert.match(bundle, /<Group title=\{t\('pro\.caps\.mcp'\)\} note=\{t\('pro\.bundles\.mcpNote'\)\}/);
  assert.match(bundle, /<Group title=\{t\('pro\.caps\.skills'\)\} note=\{t\('pro\.bundles\.skillsNote'\)\}/);
  assert.match(bundle, /<Group title=\{t\('pro\.caps\.tools'\)\} note=\{t\('pro\.bundles\.toolsNote'\)\}/);
  assert.ok(!/skillsInstall|updateConfig/.test(bundle), 'skills have no per agent door; the sheet does not pretend');
  // The arithmetic of the grant is in the rail, so the footer sentence is never
  // the first place the person sees what the button is about to do.
  assert.match(bundle, /<Tally label=\{t\('pro\.bundles\.toAdd'\)\} count=\{plan\?\.grant\.length \?\? 0\}/);
  assert.match(bundle, /<Tally label=\{t\('pro\.bundles\.alreadyOn'\)\} count=\{already\.length\}/);
  assert.match(bundle, /for \(const id of plan\.grant\) \{\s*await window\.cth\.setAgentMcp\(agent\.id, id, true\);/, 'one merged write per server');
});

test('agents are sprites, the marks are the app\'s own icons, and the action is on the right', () => {
  assert.match(bundle, /<Portrait agent=\{agent\} size=\{24\} \/>/, 'the picker is sprites');
  assert.ok(!/initials/i.test(bundle));
  assert.match(bundle, /import \{ ProIcon \} from '\.\/icons';/, 'no fetched or generated art');
  assert.match(bundle, /<ProIcon name="capabilities" size=\{17\} \/>/);
  assert.match(bundle, /\{on && <ProIcon name="check" size=\{14\} \/>\}/, 'the chosen agent is marked, not merely tinted');
  const footer = bundle.slice(bundle.lastIndexOf("padding: '12px 18px', borderTop"));
  const order = ['pro.dialog.cancel', 'pro.bundles.grantTo'];
  let at = -1;
  for (const key of order) {
    const next = footer.indexOf(key);
    assert.ok(next > at, `${key} is out of order in the footer`);
    at = next;
  }
  assert.ok(footer.indexOf('kind="primary"') < footer.indexOf('pro.bundles.grantTo'), 'the last button is the primary one');
});

/* ---- strings -------------------------------------------------------------- */

test('every string the phase added exists in the three locales, with no dash and no banned word', () => {
  const keys = new Set();
  for (const src of [conn, bundle]) for (const m of src.matchAll(/\bt\(\s*'((?:pro|common)\.[^']+)'/g)) keys.add(m[1]);
  // The families the sheets reach by template literal, which no parser sees.
  for (const k of ['none', 'bearer', 'header', 'prefix', 'query', 'basic', 'github']) {
    keys.add(`pro.conn.authKind.${k}`);
    keys.add(`pro.conn.authWhy.${k}`);
  }
  for (const k of ['github', 'custom-rest']) keys.add(`pro.conn.kind.${k}`);
  assert.ok(keys.size > 55, `parser found only ${keys.size} keys`);
  for (const k of keys) {
    for (const l of Object.keys(LOCALES)) {
      assert.equal(typeof LOCALES[l].get(k), 'string', `${k} in ${l}`);
      assert.ok(LOCALES[l].get(k).trim().length > 0, `${k} in ${l} is empty`);
    }
    // Real translations, not English parked in a zh or ar key.
    if (/^pro\.conn\.(authWhy|step|empty|userHint|prefixHint|paramHint|headerHint|sendsMasked)/.test(k)) {
      assert.notEqual(LOCALES['zh-CN'].get(k), LOCALES.en.get(k), `${k} is English in zh-CN`);
      assert.notEqual(LOCALES.ar.get(k), LOCALES.en.get(k), `${k} is English in ar`);
    }
  }
  for (const l of Object.keys(LOCALES)) {
    for (const [k, v] of LOCALES[l]) {
      if (!/^pro\.(conn|bundles)\./.test(k)) continue;
      assert.ok(!DASH.test(v), `${k} (${l}): a dash in "${v}"`);
      assert.ok(!BANNED.test(v), `${k} (${l}): a banned word in "${v}"`);
      assert.ok(!BANNED.test(k), `${k}: a banned word in the key name`);
    }
  }
});
