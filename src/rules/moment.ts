/**
 * A point in the learner's timeline. `at` is the wall-clock time; `seq` comes from one counter shared by all
 * of a learner's records, so it gives the true order even when times tie or the device clock is changed.
 */
export interface Moment {
  at: number;
  seq: number;
}

/** Sort comparator: true event order. */
export const inOrder = (x: Moment, y: Moment) => x.seq - y.seq;

/** The moment after `last`. Storage keeps `last` so the counter never repeats. */
export const nextMoment = (last: Moment | null, at: number): Moment => ({ at, seq: (last?.seq ?? 0) + 1 });
