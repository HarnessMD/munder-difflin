/**
 * ONE SENTENCE INSTEAD OF FOUR FACTS.
 *
 * A row used to say both directions in words, each with its own reason, which
 * is four facts about one lane and reads as a wall. The founder's ask: when
 * everything is open say NOTHING, and when something is closed say the single
 * tightest fact, as one sentence a person can act on.
 *
 * This helper is that rule, and it is the only place the rule lives: it takes
 * the two EFFECTIVE policies (status already applied on your side) and answers
 * with the key of the one sentence to draw, or null when the lane is fully
 * open and there is nothing to say.
 *
 * WHOSE SIDE closed it comes from `sendBlock`, run once per direction. The
 * outbound lane (you writing to them) is `sendBlock(mine, theirs)`; the
 * inbound lane (them reaching you) is the same rule mirrored,
 * `sendBlock(theirs, mine)`, because their send crossing needs your receive
 * open exactly as your send needs theirs.
 *
 * WHEN BOTH LANES ARE CLOSED the sentence names YOUR side if your side closed
 * either of them, because your side is the one the person reading the row can
 * actually fix. Two closures both caused by them collapse to the outbound
 * sentence, since "can I write to them" is the question a roster row answers
 * first.
 *
 * React-free and renderer-free on purpose: the roster row, the teammate
 * drawer and any future surface all call this and cannot disagree.
 */
import { canReceiveFrom, canSendTo, sendBlock, type TeamPolicy } from './teamPolicy';

/**
 * The four sentences, as keys. The UI draws `team.lane.<key>`:
 *
 *   youClosedOut    You cannot write to them. Your side is closed.
 *   theyClosedOut   You cannot write to them. Their side is closed.
 *   youClosedIn     They cannot reach you. Your side is closed.
 *   theyClosedIn    They cannot reach you. Their side is closed.
 */
export type LaneSummaryKey = 'youClosedOut' | 'theyClosedOut' | 'youClosedIn' | 'theyClosedIn';

export function laneSummary(mine: TeamPolicy, theirs: TeamPolicy): LaneSummaryKey | null {
  const outOpen = canSendTo(mine, theirs);
  const inOpen = canReceiveFrom(mine, theirs);
  if (outOpen && inOpen) return null;

  // `you-not-sending` on the mirrored call means THEIR send is off; the
  // refusal names the closed door of whoever is trying to write.
  const outKey: LaneSummaryKey | null = outOpen
    ? null
    : sendBlock(mine, theirs) === 'you-not-sending' ? 'youClosedOut' : 'theyClosedOut';
  const inKey: LaneSummaryKey | null = inOpen
    ? null
    : sendBlock(theirs, mine) === 'they-not-receiving' ? 'youClosedIn' : 'theyClosedIn';

  if (outKey && inKey) {
    if (outKey === 'youClosedOut') return outKey;
    if (inKey === 'youClosedIn') return inKey;
    return outKey;
  }
  return outKey ?? inKey;
}
