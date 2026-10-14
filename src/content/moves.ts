// Every playable move, in journey order. Stages in src/content/blueprint.ts with a moveId point here.
import { collectiveNouns } from "./collective-nouns.ts";
import { allCombos, lessonCombo, type Move } from "./generate.ts";
import { indefinitePronouns } from "./indefinite-pronouns.ts";
import { nearestSubject } from "./nearest-subject.ts";
import { oneOfThe } from "./one-of-the.ts";
import { stripDisguise } from "./strip-disguise.ts";
import type { Lang } from "./types.ts";

/** Move 1 as a Move: its question space comes from the side-phrase generator. */
export const stripDisguiseMove: Move = { ...stripDisguise, example: lessonCombo(stripDisguise), combos: allCombos(stripDisguise) };

export const moves: readonly Move[] = [stripDisguiseMove, nearestSubject, collectiveNouns, indefinitePronouns, oneOfThe];

/** The move with this ID, or undefined. */
export const moveById = (id: string | null | undefined): Move | undefined => moves.find((m) => m.moveId === id);
/** The move with this ID, falling back to move 1 for an absent or unknown ID. */
export const moveOrFirst = (id: string | null | undefined): Move => moveById(id) ?? stripDisguiseMove;
/** True when this move's copy in `lang` is not yet approved: the screens then show an "Unreviewed" tag. */
export const unreviewed = (m: Move, lang: Lang) => m.review[lang].status !== "approved";
/** A move's 1-based number in the journey. */
export const moveNumber = (m: Move) => moves.indexOf(m) + 1;
