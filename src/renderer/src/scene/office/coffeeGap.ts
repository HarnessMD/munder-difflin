// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Who may be sent on a break, and how long an agent rests after a coffee break.
//
// The coffee loop: an idle agent's break ends with a refill or a fresh mug,
// the mug is carried home, and the moment its courier sits down
// (updateDeskLife) an agent that is still idle gets up and wanders. A
// wandering agent is not sitting, so it is eligible again, and the café
// director (a window every 6-12 s, 70% of the time) picked it straight back
// up: a lone idle agent did nothing but walk to coffee and back. After a break
// the agent now rests a few minutes (COFFEE_GAP_S) before the café may take it
// again. Errands and the rest of desk life are untouched.

/** The fields of an office runtime that these rules read. */
export interface BreakRuntime {
  brk?: unknown;
  err?: unknown;
  run?: unknown;
  cupCarryHome?: boolean;
  /** Seconds until the café may take this agent again (0/undefined = ready). */
  coffeeRest?: number;
  character: { isSitting(): boolean };
}

export interface BreakAgent {
  isGod?: boolean;
  status: string;
}

/** The rest after a coffee break: 3-5 minutes. */
export const COFFEE_GAP_S: readonly [number, number] = [180, 300];

/** Free for a break or an errand: idle, not busy with another trip, not seated. */
export const breakEligible = (agent: BreakAgent, rt: BreakRuntime): boolean => {
  if (agent.isGod || rt.brk || rt.err || rt.run || rt.cupCarryHome) return false;
  if (agent.status !== 'idle' && agent.status !== 'success') return false;
  return !rt.character.isSitting();   // already parked at a desk → leave it
};

/** Free for a CAFÉ break: break-eligible and rested since the last one. */
export const cafeEligible = (agent: BreakAgent, rt: BreakRuntime): boolean =>
  breakEligible(agent, rt) && !((rt.coffeeRest ?? 0) > 0);

/** A break just ended (or was cut short): start the rest. */
export const startCoffeeRest = (rt: BreakRuntime, rand: () => number = Math.random): void => {
  const [lo, hi] = COFFEE_GAP_S;
  rt.coffeeRest = lo + rand() * (hi - lo);
};

/** Count every agent's rest down by one frame. */
export const tickCoffeeRest = (rt: BreakRuntime, dt: number): void => {
  if (rt.coffeeRest) rt.coffeeRest = Math.max(0, rt.coffeeRest - dt);
};
