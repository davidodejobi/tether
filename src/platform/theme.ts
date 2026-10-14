// Light, dark or the device's own setting (spec section 14: Naija Green by day, Adire Night by night).
// tokens.css already honours data-theme on <html>; "system" removes it so the OS preference decides.
export type Theme = "system" | "light" | "dark";

// A copy in localStorage lets the first paint use the choice before saved progress opens. The saved learner decides.
const KEY = "tether:theme";
// The browser chrome colour per theme; these match --bg-page in tokens.css and the theme-color metas in index.html.
const CHROME = { light: "#F4FDF5", dark: "#060F35" } as const;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    m.content = CHROME[theme === "system" ? (m.media.includes("dark") ? "dark" : "light") : theme];
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage can be blocked; the saved learner still applies the theme once progress opens.
  }
}

/** Before the first render: reuse the last explicit choice so the page does not flash the other theme. */
export function applyEarlyTheme() {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark") applyTheme(t);
  } catch {
    // Nothing stored or storage blocked: the OS preference applies.
  }
}
