// Install guidance (spec sections 11 and 13). beforeinstallprompt can fire before Home mounts, so it is caught at startup.
interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
}
let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();

export function captureInstallPrompt() {
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    listeners.forEach((l) => l());
  });
  addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export const onInstallChange = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
export const canPromptInstall = () => deferred !== null;
export async function promptInstall() {
  const p = deferred;
  deferred = null;
  await p?.prompt();
}

export const isInstalled = () => matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
