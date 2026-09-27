'use strict';

/**
 * PILOT FEEDBACK, 0.4.11 (founder, 5 Sep 2026), items 17 and 18.
 *
 * 17: "Remove the Selling the PRO version part in the settings section, this
 *     is already the PRO version." The Settings General hero used to carry an
 *     ANNOUNCEMENT block selling v0.5.0 Pro, a 50% off Founders' Wall offer
 *     band, a star-on-GitHub button and a changelog link, all drawn in the old
 *     release-drop idiom (2px ink borders, uppercase mono). The hero is now a
 *     kit card with one job: the running release (name, version, plan chip)
 *     and three actions (what's new, join Discord, report a problem). The
 *     Updates block below it still owns checks and downloads.
 *
 * 18: "The profile, billing and versions section had half width cards make it
 *     cover the entire width." Profile, Billing and Version & updates capped
 *     their content column at 720/760px; the cards now span the full content
 *     width like every other full screen, same padding.
 *
 * Each assertion here is a thing that was actually wrong on the pilot build.
 *
 * AMENDED 5 Sep 2026, the free tier: item 17's rule was written when every
 * install was a paid install. Now that a FREE install exists the founder
 * ordered one ad back, a plans band in this same hero that explains PRO and
 * TEAMS and sends the person to the website. Item 17 therefore narrows, it
 * does not die: the OLD selling surfaces stay dead forever, and the one band
 * that sells sits behind the free gate, so a payer or an org member still
 * never sees Settings sell to them.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
/** Comments off first: this file's own prose names the things it forbids. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HERO_PATH = 'src/renderer/src/components/SettingsHeroCard.tsx';
const MODAL_PATH = 'src/renderer/src/components/SettingsModal.tsx';
const HERO = strip(read(HERO_PATH));

/* ── item 17, as amended: Settings sells only to a free install ───────────── */

test('the old selling surfaces stay dead: no announcement, no offer band, no star, no changelog, no sponsor', () => {
  // Every t() key the removed surfaces used. A survivor means one came back.
  // (5 Sep 2026: the plans band is the one permitted seller and it has its
  // own keys and its own test below; none of these may return.)
  for (const key of [
    'settingsHero.announcement', 'settingsHero.proLaunch', 'settingsHero.proCommunityFree',
    'settingsHero.proParagraph', 'settingsHero.foundersWallTitle', 'settingsHero.foundersWallBody',
    'settingsHero.seeTheWall', 'settingsHero.starOnGitHub', 'settingsHero.fullChangelog',
    'settingsHero.sponsoredBy', 'settingsHero.visit'
  ]) {
    assert.ok(!HERO.includes(key), `the hero still draws ${key}`);
  }
  // And the destinations those surfaces opened.
  assert.ok(!HERO.includes('wall.html'), 'the Founders\' Wall link survived');
  assert.ok(!HERO.includes('harnessmd.com/download'), 'the changelog link survived');
  assert.ok(!/upgrade/i.test(HERO), 'an upgrade affordance survived');
  assert.ok(!/sponsor/i.test(HERO), 'the sponsor slot survived');
  assert.ok(!/50\s*%|% OFF/i.test(HERO), 'the 50% offer survived');
});

test('5 Sep 2026: the plans band explains PRO and TEAMS to a free install, CTA to the website', () => {
  // The band's four keys, and the one destination.
  for (const key of [
    'settingsHero.plans.title', 'settingsHero.plans.pro',
    'settingsHero.plans.teams', 'settingsHero.plans.cta'
  ]) {
    assert.ok(HERO.includes(key), `the plans band lost ${key}`);
  }
  assert.match(HERO, /https:\/\/harnessmd\.com\/#pricing/);
  // The gate is App's freeAdmitted minus a payer, computed from the same
  // stores App reads, so the band and the gate cannot drift apart.
  assert.match(HERO, /skin !== 'professional' && teamsMode === 'solo'/);
  assert.match(HERO, /freeAdmits\(free\) && !proGateAdmits\(teamsMode, license\)/);
  // And every selling key sits inside that guard: the band is the guard's
  // only content, so a key drawn outside it would sell to a payer again.
  assert.match(HERO, /\{freeUser && \(/);
  const guarded = HERO.slice(HERO.indexOf('{freeUser && ('));
  for (const key of ['settingsHero.plans.title', 'settingsHero.plans.cta']) {
    assert.ok(guarded.includes(key), `${key} is drawn outside the free gate`);
  }
});

test('the hero keeps exactly its three actions, on their original handlers', () => {
  // what's new: asks UpdateToast to re-show the notes, same CustomEvent as before.
  assert.match(HERO, /settingsHero\.whatsNew/);
  assert.match(HERO, /cth:show-release-notes/);
  // join Discord.
  assert.match(HERO, /settingsHero\.joinDiscord/);
  assert.match(HERO, /discord\.gg/);
  // report a problem, straight to a new issue.
  assert.match(HERO, /settingsHero\.reportProblem/);
  assert.match(HERO, /issues\/new/);
  // All three open through the bridge, which enforces https again.
  assert.match(HERO, /window\.cth\.openExternal/);
});

test('the hero answers "what is this install": name, running version, plan chip', () => {
  assert.match(HERO, /Munder Difflin/);
  assert.match(HERO, /window\.cth\.appInfo\(\)/);
  assert.match(HERO, /v\{version\}/);
  // The chip label is still hero.json's plan, validated in shared/heroPayload.
  assert.match(HERO, /window\.cth\.heroPayload\(\)/);
  assert.match(HERO, /<Chip tone="muted">\{hero\.plan\.label\}<\/Chip>/);
  // Update state left the hero: the Updates block below is the one owner of
  // checks, downloads and the pending version.
  assert.ok(!/updateState|pendingVersion|reduceStatus|manualDownloadUrl/.test(HERO),
    'the hero wires the updater again; Updates below owns that');
});

test('the hero is drawn in PRO chrome, not the release-drop idiom', () => {
  // The kit's surfaces and controls, imported from the kit.
  assert.match(HERO, /import \{ Btn, Card, Chip \} from '\.\/pro\/ui'/);
  assert.match(HERO, /<Card style=\{\{ padding: 16, gap: 12 \}\}>/);
  // No 2px ink frame, no pixel display face, no uppercase mono blocks.
  assert.ok(!/\b2px solid\b/.test(HERO), 'a 2px edge came back');
  assert.ok(!HERO.includes('--cth-font-display'), 'the hero wears the pixel face');
  assert.ok(!/textTransform: 'uppercase'/.test(HERO), 'an uppercase mono block came back');
  // No literal colour anywhere in the card.
  assert.deepEqual(HERO.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], [], 'the hero carries a literal colour');
});

test('General still opens with the hero and the Updates block below it', () => {
  const modal = strip(read(MODAL_PATH));
  assert.match(modal, /<SettingsHeroCard \/>/);
  assert.match(modal, /<UpdatesSection \/>/);
});

test('every key the hero uses exists in all three locales', () => {
  const keys = [...HERO.matchAll(/t\('(settingsHero\.[a-zA-Z.]+)'\)/g)].map((m) => m[1]);
  assert.ok(keys.length >= 4, `parser found only ${keys.length} keys; the guard is disarmed`);
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const dict = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`));
    for (const k of keys) {
      const v = k.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), dict);
      assert.equal(typeof v, 'string', `${lang} is missing ${k}`);
    }
  }
});

/* ── item 18: Profile, Billing and Updates span the full content width ───── */

test('no half-width column: the three pages let their cards fill the screen', () => {
  for (const f of ['ProfileScreen', 'BillingScreen', 'UpdatesScreen']) {
    const src = strip(read(`src/renderer/src/components/pro/${f}.tsx`));
    assert.ok(!/maxWidth/.test(src), `${f} caps its content column again`);
    // Same scroll pane, same padding as before: only the cap moved.
    assert.match(src, /overflowY: 'auto', padding: '18px 18px 32px'/, `${f} lost the shared pane padding`);
  }
});
