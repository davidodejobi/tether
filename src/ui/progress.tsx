// The one place screens reach saved progress (docs/decisions.md, local progress).
import { createContext, type ComponentChildren } from "preact";
import { useCallback, useContext, useEffect, useState } from "preact/hooks";
import { claimWriter } from "../platform/storage.ts";
import { openKV } from "../storage/kv.ts";
import { openProgress, type Batch, type ProgressStore } from "../storage/progress.ts";

export type ProgressState =
  | { status: "opening" }
  /** Storage did not answer or failed to read: show "Couldn't open your saved progress" with Retry, never an empty store. */
  | { status: "couldNotOpen"; retry: () => void }
  | { status: "ready"; store: ProgressStore; save: (batch: Batch) => Promise<void> };

const ProgressContext = createContext<ProgressState>({ status: "opening" });

export function ProgressProvider({ children }: { children: ComponentChildren }) {
  const [state, setState] = useState<ProgressState>({ status: "opening" });

  const open = useCallback(() => {
    setState({ status: "opening" });
    openProgress(() => openKV(), () => claimWriter()).then(
      (store) => {
        // Saving swaps the store's state; a new context value makes screens re-read it.
        const save = async (batch: Batch) => {
          await store.save(batch);
          setState((s) => ({ ...s }));
        };
        setState({ status: "ready", store, save });
      },
      // ponytail: every open failure (timeout or unreadable records) offers the same Retry.
      () => setState({ status: "couldNotOpen", retry: open }),
    );
  }, []);

  useEffect(open, [open]);
  return <ProgressContext.Provider value={state}>{children}</ProgressContext.Provider>;
}

/** Startup state: opening, could not open, or ready. Startup screens (step 7) decide what to show. */
export const useProgressState = () => useContext(ProgressContext);

/** The open store and its save. Only for screens rendered after startup reports ready. */
export function useProgress(): Extract<ProgressState, { status: "ready" }> {
  const state = useProgressState();
  if (state.status !== "ready") throw new Error("useProgress before progress opened");
  return state;
}
