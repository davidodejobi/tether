// Learning rules take a Clock so dates and timers are testable without the real clock.
export type Clock = { now(): number };

export const systemClock: Clock = { now: () => Date.now() };
