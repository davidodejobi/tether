// Add every new screen here: { name, path } at 360x800, plus optional wider captures.
export type Screen = { name: string; path: string; width?: number; height?: number };

export const SCREENS: Screen[] = [
  { name: "kit", path: "/kit" },
  { name: "kit-768", path: "/kit", width: 768, height: 1024 },
  { name: "kit-1366", path: "/kit", width: 1366, height: 768 },
];
