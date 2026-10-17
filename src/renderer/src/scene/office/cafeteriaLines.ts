// Cafeteria small-talk.
//
// An agent's coffee break is an excuse for a one-liner. Two kinds of line:
//   • solo  — one quip shown above a single agent at a break spot
//   • pair  — a two-beat exchange between two agents at the same table
//
// Lines are kept short so they fit the ThoughtBubble (≈MAX_WIDTH). Character
// keys match CharacterName; anyone without bespoke lines falls back to the
// shared pools so the floor never feels empty.

import type { CharacterName } from './characters';

/** Where an agent is lingering — picks a contextual line pool. */
export type BreakSpot = 'coffee' | 'vending' | 'snack' | 'table';

const pick = <T,>(arr: readonly T[], seed: number): T =>
  arr[((seed % arr.length) + arr.length) % arr.length];

// ─── solo lines, by spot ─────────────────────────────────────────────────────

const COFFEE: readonly string[] = [
  'is this… decaf?? who did this',
  "we're out of beans again",
  'first cup of the day. and the fifth.',
  'the coffee here is basically a hug',
  'who took my mug?',
  'brewing. do not disturb the machine.',
];

const VENDING: readonly string[] = [
  'the machine ate my dollar',
  'B4… please be the pretzels',
  'it’s stuck. classic.',
  'shaking it. gently. respectfully.',
  'one (1) emotional-support snack',
  'A1 again. living dangerously.',
];

const SNACK: readonly string[] = [
  'who finished the chips??',
  'just a little treat',
  'these are everyone’s? cool cool cool',
  'second breakfast',
  'a snack is a unit test for morale',
];

const TABLE: readonly string[] = [
  'big day. lots of meetings.',
  'just five more minutes',
  'did you see the standup notes?',
  'pretending to read my notes',
  'I needed this break, honestly',
  'if anyone asks, I’m in a review',
];

const SPOT_POOL: Record<BreakSpot, readonly string[]> = {
  coffee: COFFEE, vending: VENDING, snack: SNACK, table: TABLE,
};

// ─── character flavour — overrides the generic pool when present ─────────────

const BY_CHARACTER: Partial<Record<CharacterName, readonly string[]>> = {
  ada:   ['checking the logs one more time', 'it compiles. why does it compile?', 'quiet is the best metric'],
  ben:   ['shipping on a Friday, obviously', 'works on my machine', 'one tiny migration, what could go wrong'],
  cleo:  ['that padding is off by two pixels', 'I have notes. many notes.', 'the kerning is a crime'],
  dax:   ['it needs a loading spinner', 'have you tried more animation?', 'rewriting it in a new framework'],
  eli:   ['I wrote a test for the test', 'edge case: the empty string', 'did you run it twice?'],
  fern:  ['updating the README, again', 'good docs are a love letter', 'who can explain this flag?'],
  gus:   ['paged at 3am. fine, I’m fine.', 'have you tried turning it off and on?', 'the disk is 94% full'],
  hana:  ['plotting the plot', 'the outliers are the story', 'correlation is not causation, but wow'],
  ivo:   ['who is blocked? tell me now.', 'priorities, people.', 'I want a status in one line'],
  jules: ['reading the diff twice', 'that token should not be in the repo', 'please rotate that key'],
  kira:  ['cutting the release at five', 'changelog first, then ship', 'the tag is in the wrong place'],
  leo:   ['staying calm. staying calm.', 'the customer is right, mostly', 'ticket closed. next.'],
  maya:  ['but why do we need it?', 'can we ship half of it?', 'what does the user actually want?'],
  nico:  ['shaved 40ms off the cold start', 'profile first, opinions later', 'that loop is O(n²)'],
  otto:  ['I’ll get to the review soon', 'no rush, it’s a big diff', 'slowly, carefully, correctly'],
};

/** A solo break-room line. Character flavour ~60% of the time, else the line
 *  fits the spot the agent is standing at. `seed` keeps it deterministic per
 *  call site (avoids Math.random, which Pixi/Electron CSP-safe code prefers). */
export function pickSoloLine(character: string, spot: BreakSpot, seed: number): string {
  const flavour = BY_CHARACTER[character as CharacterName];
  if (flavour && seed % 5 < 3) return pick(flavour, Math.floor(seed / 5));
  return pick(SPOT_POOL[spot], seed);
}

// ─── paired exchanges (two agents at one table) ──────────────────────────────
//
// Each exchange is a list of beats that ALTERNATE between the two agents:
// beat[0] = the speaker who sat down, beat[1] = their table-mate, beat[2] =
// speaker again, and so on. The director plays them out one beat at a time.
// Lines are trimmed to fit the thought cloud; longer ones auto-truncate.

type Exchange = readonly string[];

const EXCHANGES: readonly Exchange[] = [
  ['standup ran 40 minutes.', 'could’ve been an email.'],
  ['is the build green yet?', '...don’t look.'],
  ['who reply-all’d everyone?', 'we don’t talk about it.'],
  ['tabs or spaces?', 'we have a linter for that.', 'that’s not an answer.', 'it’s the linter’s answer.'],
  ['is a hot dog a sandwich?', 'it is.', 'I know, right?'],
  ['did you restart it?', 'yes.', 'twice?', '...once.'],
  ['it works on my machine.', 'ship your machine, then.'],
  ['I found the bug.', 'where was it?', 'in the fix for the last bug.'],
  ['how long will this take?', 'two days.', 'and really?', 'two weeks.'],
  ['who wrote this?', 'git blame says you.', '...past me is a stranger.'],
  ['we should rewrite it.', 'no.', 'in Rust?', 'absolutely not.', '...maybe a little.'],
  ['I’m going to refactor this.', 'what’s the deadline?', 'Friday.', 'then I’m not going to.'],
  ['naming things is hard.', 'cache invalidation is harder.', 'off by one is hardest.'],
  ['can you review my PR?', 'how big is it?', 'it’s… moderate.', 'it’s forty files.'],
  ['I deleted the wrong branch.', 'the reflog remembers.', 'bless the reflog.'],
  ['the tests are flaky.', 'rerun them.', 'that’s how they got flaky.'],
  ['why is the fridge humming?', 'it’s thinking.', 'about what?', 'its next defrost.'],
  ['I need more coffee.', 'you’ve had four.', 'and yet.'],
  ['should we write that down?', 'in the docs?', 'in a ticket.', 'it’s a wiki now.'],
  ['quick question.', 'that’s never quick.', 'it might be.', 'it isn’t.'],
  ['this meeting should be a doc.', 'send a doc.', 'I’ll schedule a meeting about the doc.'],
  ['ten minutes to demo.', 'is it working?', 'define working.', 'don’t.'],
  ['what’s the plan?', 'step one: coffee.', 'step two?', 'more coffee.'],
  ['I’m not saying it’s a memory leak.', 'it’s a memory leak.', 'it’s a memory leak.'],
  ['logs say “everything is fine”.', 'that’s the scariest log.'],
  ['did anyone touch prod?', '...no.', 'no one touched prod.', 'good.', 'good.'],
  ['we have a ticket for that.', 'how old is the ticket?', 'it can vote.'],
  ['it’s just a config change.', 'those are my favorite last words.'],
  ['the cat walked on my keyboard.', 'did it commit?', 'it force-pushed.', 'fire the cat.'],
  ['everything is a distributed system.', 'even the fridge?', 'especially the fridge.'],
];

// Keyed off the SPEAKER so, when the right character sits down first, they get
// to open with their signature bit.
const KEYED_EXCHANGES: Partial<Record<CharacterName, Exchange>> = {
  ivo:   ['quick sync?', 'we just synced.', 'then a quick re-sync.'],
  eli:   ['did you run the tests?', 'yes.', 'twice?', 'twice.'],
  gus:   ['did anyone change the config?', '...maybe.', 'I’ll check the pager.'],
  fern:  ['can we document that?', 'it’s obvious.', 'to whom?'],
  jules: ['who has the keys?', 'which keys?', 'exactly.'],
  cleo:  ['it needs more breathing room.', 'it’s a settings page.', 'it needs to breathe.'],
  nico:  ['that took 300ms.', 'is that bad?', 'it’s an eternity.'],
  maya:  ['what problem are we solving?', 'a real one.', 'whose?'],
};

/** A multi-beat exchange for two agents sharing a table. Beats alternate:
 *  index 0 = `speaker`, 1 = the table-mate, 2 = speaker, … */
export function pickExchange(speaker: string, seed: number): Exchange {
  const keyed = KEYED_EXCHANGES[speaker as CharacterName];
  if (keyed && seed % 4 === 0) return keyed;
  return pick(EXCHANGES, seed);
}
