'use strict';

// 0.4.11, founder 6 Sep 2026, after the release shipped: "update the release
// drop modal ... I want them to be able to see and know everything that is
// there in PRO and TEAMS plan after 0.4.6. and the road map ahead and there
// should be a CTA to the website to get PRO and get TEAMS." And later: "the
// roadmap ... is sandbox, memory layer, and mobile app in next three months
// along with features and fixes to increase productivity."
//
// The drop is fetched live from notes-v<version>.md on the box at first launch
// of a version (src/main/updater.ts fetchReleaseBody), so RELEASE.md's drop
// block is what every install updating from 0.4.6 onward actually sees, and
// the Notes workflow can republish it without rebuilding installers.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const body = fs.readFileSync(path.join(ROOT, 'RELEASE.md'), 'utf8');
const { extractDropHtml } = loadTs('src/shared/releaseDrop.ts');
const { soloConsoleUrl } = loadTs('src/shared/soloPro.ts');
const drop = extractDropHtml(body);

test('1. the drop parses, and stays under the updater fetch cap', () => {
  assert.ok(drop && drop.length > 0, 'the drop block extracts');
  // fetchServerText destroys the request past 262144 bytes; a body over the
  // cap means NO notes and NO drop for anyone, silently.
  assert.ok(Buffer.byteLength(body, 'utf8') < 262_144, 'RELEASE.md must stay under the 256 KB fetch cap');
});

// What a reader actually SEES: the drop with its HTML comments removed, applying
// the tokenizer's rule that a comment runs from `<!--` to the first `-->`. The
// page keeps two deliberately unrendered blocks, and counting a price or reading
// a headline out of one of those would be counting something nobody can read.
function rendered(html) {
  let out = '', i = 0;
  for (;;) {
    const open = html.indexOf('<!--', i);
    if (open === -1) { out += html.slice(i); break; }
    out += html.slice(i, open);
    const close = html.indexOf('-->', open + 4);
    if (close === -1) break;
    i = close + 3;
  }
  return out;
}
const shown = rendered(drop);

// RE-POINTED 9 Sep 2026, ruled by god. This test used to pin the two 0.4.11
// section headings and five catch-up claims, one per release since 0.4.6.
//
// THE REASON THEY WENT, and it is the founder's, on 9 September 2026: the drop
// is "the only notification that we sell for Pro and Teams plan", it must "look
// like an advertisement" and "convince them to buy", carry screenshots, and not
// be too much text. He called the previous version "too basic". A list of what
// changed in each of five past releases is the changelog form he rejected.
//
// The INTENT is unchanged and is what this now asserts: both plans are pitched,
// each with a price and a way to buy it.
//
// RE-POINTED 25 Sep 2026 for 0.5.3, on the founder's brief through Kevin: the
// drop leads with "Launch offer: get the annual plan for $150 USD", with small
// text that the price is adjusted for purchasing power and can go as low as
// $100 a year. The monthly $20 and the twin price strip went with the 0.5.2
// page. Teams stays pitched, once, with its own door.
test('2. both plans are pitched, each with a price and a door', () => {
  assert.match(shown, /\bPro\b/, 'the PRO plan is named');
  assert.match(shown, /\bTeams\b/, 'the Teams plan is named');

  // Each price is real selectable text, not drawn by CSS: content: on an
  // ::after prints nothing the day somebody drops the quotes.
  assert.match(shown, /annual plan for \$150/, "the offer in the founder's words");
  assert.match(shown, /as low as \$100 a year/, 'the purchasing power floor is said with it');
  assert.match(shown, /\$39/, 'the Teams price is on the page');

  // A price with no way to act on it is a poster, not a pitch.
  assert.match(shown, /href="[^"]*"[^>]*>\s*<span class="go">Get Pro/s, 'the offer has a door');
  assert.match(shown, /href="[^"]*"[^>]*>\s*Set up Teams/s, 'the Teams price has a door');
});

// The 0.5.2 page kept a commented OFFER SLOT so an offer could be switched on
// from the sidecar. 0.5.3 ships with the offer live, so the guard becomes: the
// live offer never shows a placeholder, and the button's pending state (pure
// CSS, the frame runs no script) says what is happening in plain words.
test('2b. the offer is live, and shows no placeholder', () => {
  assert.match(shown, /class="offer"/, 'the offer block renders');
  for (const ghost of ['WHAT THE OFFER IS', 'ends THE DATE', '>CODE<', 'TODO', 'PLACEHOLDER']) {
    assert.ok(!shown.includes(ghost), `a reader must never see a placeholder: ${ghost}`);
  }
  assert.match(shown, /class="wait"[^>]*>[\s\S]*?Opening your browser/, 'the button says it is opening the browser');
});

// TEST 3 WAS DELETED ON 9 SEPTEMBER 2026, ON THE FOUNDER'S RULING. It asserted
// the drop carried a roadmap section, THE NEXT THREE MONTHS, with SANDBOX,
// MEMORY LAYER and MOBILE APP as chips.
//
// His words: "We can keep it out of the release drop, the roadmap, it's okay."
//
// READ THAT PRECISELY. WHAT HE RETIRED IS THE ROADMAP'S PLACE IN THIS DROP, NOT
// THE ROADMAP. It is carried as a 0.5.3 card. Nothing here says the product has
// stopped having a roadmap, and this note is not a licence to remove roadmap
// copy from anywhere else.
//
// WHY IT EXISTED, so nobody restores it by reflex: this file pins the founder's
// ask of 6 September 2026, quoted in the header above, which had three parts.
// Two of them survive in tests 2 and 4, re-pointed the same day at the sales
// drop that replaced the 0.4.11 one. The roadmap was the third, and it is the
// only part he has since ruled out.

// RE-POINTED 9 Sep 2026, ruled by god, after the sales drop replaced the
// 0.4.11 one. The old version of this test pinned two literal hrefs,
// harnessmd.com/pro and harnessmd.com/console, and its comment said why those
// two: they survive the sign in redirect. THE LITERALS WERE NEVER THE POINT,
// the property was, so this asserts the property instead and the next person
// does not have to re-pin two more strings when the page changes again.
//
// The doors the drop opens must be THE DOORS THE APP ITSELF OPENS. A drop
// cannot mint a checkout nonce, because no script runs in that frame, so the
// PRO button uses the same fallback the paywall falls back to, and Teams uses
// the URL all four in-app Teams buttons open. Both were followed end to end on
// 9 September: /console/license lands on signin?as=solo&next=/console/license
// and /checkout on signin?as=admin&next=/console/new, both 200, both carrying
// the buyer back with the right role.
test('4. the CTAs are the doors the app itself opens, and every link can work', () => {
  const soloDoor = soloConsoleUrl();
  assert.match(drop, new RegExp(`href="${soloDoor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
    'the PRO button goes where the app sends a solo person for their licence');
  assert.match(drop, /href="https:\/\/harnessmd\.com\/checkout"/,
    'the Teams button goes where every in-app Set up Teams button goes');
  // That second one is a literal here only because it is a literal in the app
  // too: ProSidebar, TeamScreen, TeamWindow and teamsSeam all hard-code it.
  // If it ever becomes a function, pin the function, not the string.
  const inApp = fs.readFileSync(path.join(ROOT, 'src/renderer/src/components/pro/ProSidebar.tsx'), 'utf8');
  assert.match(inApp, /https:\/\/harnessmd\.com\/checkout/,
    'the app still opens this door; if it moved, the drop must move with it');
  // The sandbox grants allow-popups only: a link without target="_blank" is a
  // dead control in front of every user, and a non-https href silently does
  // nothing under the frame's CSP.
  const links = drop.match(/<a\s[^>]*>/g) ?? [];
  for (const a of links) {
    assert.match(a, /target="_blank"/, `a drop link must open a window: ${a}`);
    assert.match(a, /rel="noreferrer"/, `a drop link must not leak a referrer: ${a}`);
    assert.match(a, /href="https:\/\//, `a drop link must be https: ${a}`);
  }
  assert.ok(links.length >= 2, 'a way to buy each plan');
});

test('5. the drop carries no active content and no dash', () => {
  assert.doesNotMatch(drop, /<script/i);
  assert.doesNotMatch(drop, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(drop, /[–—]|\s-\s/, 'house style: no dashes in the drop');
  assert.doesNotMatch(drop, /\bworkers?\b/i, 'the office says temp');
});
