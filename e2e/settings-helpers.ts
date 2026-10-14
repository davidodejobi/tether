import type { Page } from "@playwright/test";

/** Opens a Settings row by its label (button name is "<label>, <value>"); a row already open stays open. */
export async function openRow(page: Page, label: string) {
  const row = page.getByRole("button", { name: new RegExp(`^${label}, `) });
  if ((await row.getAttribute("aria-expanded")) !== "true") await row.click();
}
