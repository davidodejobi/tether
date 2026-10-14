// The move a flow belongs to travels in the URL as ?move=<moveId>. Absent or unknown means move 1.
import { useLocation } from "preact-iso";
import type { Move } from "../content/generate.ts";
import { moveById, moveNumber, moveOrFirst, stripDisguiseMove } from "../content/moves.ts";

/** The path with the move added; unchanged for move 1, so move 1's links stay as they always were. */
export function withMove(path: string, moveId: string): string {
  return moveId === stripDisguiseMove.moveId ? path : `${path}${path.includes("?") ? "&" : "?"}move=${moveId}`;
}

/** The move named by ?move= on the current page (move 1 when absent or unknown). */
export const useMove = (): Move => moveOrFirst(useLocation().query.move);
/** The move named by ?move= on the current page, or undefined when there is none or it is unknown. */
export const useMoveParam = (): Move | undefined => moveById(useLocation().query.move);

/** "Strip the Disguise" for move 1 (as it always read); "Move 3: Collective nouns" for the rest. */
export const moveLabel = (m: Move) => (m === stripDisguiseMove ? m.title : `Move ${moveNumber(m)}: ${m.title}`);
