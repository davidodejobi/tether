// Service worker registration and the page's side of its protocol (src/sw.js). Production builds only.
import { useCallback, useEffect, useState } from "preact/hooks";

export const swSupported = () => import.meta.env.PROD && typeof navigator !== "undefined" && "serviceWorker" in navigator;

export function registerSW() {
  if (swSupported()) addEventListener("load", () => void navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

function ask(sw: ServiceWorker, type: "status" | "fill"): Promise<number> {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => resolve(e.data.missing);
    sw.postMessage({ type }, [ch.port2]);
  });
}

/** How many required entries the active worker has not stored (null until it answers), and a waiting update, if any. */
export function useServiceWorker() {
  const [missing, setMissing] = useState<number | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  const check = useCallback(async (r: ServiceWorkerRegistration, type: "status" | "fill" = "status") => {
    if (r.active) setMissing(await ask(r.active, type));
  }, []);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    addEventListener("online", up);
    addEventListener("offline", down);
    if (!swSupported()) return () => (removeEventListener("online", up), removeEventListener("offline", down));
    let live = true;
    // `ready` waits for an active worker, so a first visit shows "preparing" until install finishes.
    navigator.serviceWorker.ready.then((r) => {
      if (!live) return;
      setReg(r);
      void check(r);
      const watch = () => {
        // A worker waiting while another controls the page is an update; the first install has no controller.
        if (r.waiting && navigator.serviceWorker.controller) setWaiting(r.waiting);
      };
      watch();
      r.addEventListener("updatefound", () => r.installing?.addEventListener("statechange", watch));
    });
    return () => {
      live = false;
      removeEventListener("online", up);
      removeEventListener("offline", down);
    };
  }, [check]);

  const retry = () => (reg ? check(reg, "fill") : navigator.serviceWorker.getRegistration().then((r) => r?.update()));
  const update = () => {
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
    waiting?.postMessage({ type: "skipWaiting" });
  };
  return { missing, online, retry, update: waiting ? update : null };
}
