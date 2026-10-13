// The one place screens reach saved progress (docs/decisions.md, local progress).
import { createContext, type ComponentChildren } from "preact";
import { useCallback, useContext, useEffect, useState } from "preact/hooks";
import { claimWriter } from "../platform/storage.ts";
import { memoryKV, openKV } from "../storage/kv.ts";
import { openProgress, type Batch, type ProgressStore } from "../storage/progress.ts";

export type ProgressState =
  | { status: "opening" }
  /** Storage did not answer or failed to read: show "Couldn't open your saved progress" with Retry, never an empty store. */
  | { status: "couldNotOpen"; retry: () => void; /** Only on the learner's explicit choice: progress then lives in memory and is lost on reload. */ continueWithoutSaving: () => void }
  | {
      status: "ready";
      store: ProgressStore;
      save: (batch: Batch) => Promise<void>;
      /** Resolves once no save is in flight. Screens that resume from saved progress wait for it, so a save
       *  started on a screen the learner just left lands before the resume point is read. */
      idle: () => Promise<void>;
      /** Opens again, e.g. after the other tab was closed. */
      reopen: () => void;
    };

const ProgressContext = createContext<ProgressState>({ status: "opening" });

export function ProgressProvider({ children }: { children: ComponentChildren }) {
  const [state, setState] = useState<ProgressState>({ status: "opening" });

  const open = useCallback((memory = false) => {
    setState({ status: "opening" });
    const opener = memory ? async () => ({ kv: memoryKV(), durable: false as const, reason: "unavailable" as const }) : () => openKV();
    openProgress(opener, () => claimWriter()).then(
      async (store) => {
        // Older records get their sounds default and avatar once, before any screen can save. A failure is
        // retried with the same seed by the next learner save.
        await store.backfill().catch(() => {});
        // Saving swaps the store's state; a new context value makes screens re-read it.
        let inFlight: Promise<unknown> = Promise.resolve();
        const save = async (batch: Batch) => {
          const saving = store.save(batch);
          inFlight = saving.catch(() => {});
          await saving;
          setState((s) => ({ ...s }));
        };
        const idle = () => inFlight.then(() => {});
        setState({ status: "ready", store, save, idle, reopen: () => open() });
      },
      // ponytail: every open failure (timeout or unreadable records) offers the same Retry.
      () => setState({ status: "couldNotOpen", retry: () => open(), continueWithoutSaving: () => open(true) }),
    );
  }, []);

  useEffect(() => open(), [open]);
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
