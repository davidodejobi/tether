// Which tile a key points at, or null. `struck[i]` tiles cannot be chosen again.
export function targetTile(key: string, from: number, struck: boolean[]): number | null {
  const n = struck.length;
  const ok = (i: number) => i >= 0 && i < n && !struck[i];
  if (/^[1-9]$/.test(key)) return ok(Number(key) - 1) ? Number(key) - 1 : null;
  if (key === " ") return ok(from) ? from : null;
  const step = key === "ArrowRight" || key === "ArrowDown" ? 1 : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
  if (!step) return null;
  for (let k = 1; k <= n; k++) {
    const i = (((from + step * k) % n) + n) % n;
    if (ok(i)) return i;
  }
  return null;
}
