// Draws the share card as a PNG with plain Canvas 2D: serious light background whatever the theme, local font, colour tokens.
import type { CardModel } from "./card.ts";

const W = 1080;
const FONT = '"Atkinson Hyperlegible Next", system-ui, sans-serif';

/** Reads a colour token from an element pinned to the light theme, so the card is light in a dark app too. */
function tokens() {
  const el = document.createElement("div");
  el.className = "pin-light";
  document.body.append(el);
  const cs = getComputedStyle(el);
  const t = (n: string) => cs.getPropertyValue(n).trim();
  const out = {
    page: t("--bg-surface"), text: t("--text-primary"), muted: t("--text-secondary"), border: t("--border-subtle"),
    green: t("--bg-primary"), greenText: t("--text-brand"),
    gold: t("--bg-proof"), goldEdge: t("--bg-proof-edge"), goldText: t("--text-on-proof"), goldBg: t("--bg-proof-container"),
  };
  el.remove();
  return out;
}

export async function drawCard(m: CardModel): Promise<Blob> {
  await Promise.all([700, 400].map((w) => document.fonts.load(`${w} 40px "Atkinson Hyperlegible Next"`))).catch(() => {});
  const c = tokens();
  const proof = m.kind === "proof";
  const accent = proof ? c.gold : c.green;
  const accentText = proof ? c.goldEdge : c.greenText;
  const m0 = 72;
  const cv = document.createElement("canvas");
  cv.width = W;
  const ctx = cv.getContext("2d")!;
  const lines = (text: string, size: number, weight: number, width: number) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const out: string[] = [];
    let cur = "";
    for (const word of text.split(" ")) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && ctx.measureText(next).width > width) (out.push(cur), (cur = word));
      else cur = next;
    }
    return cur ? [...out, cur] : out;
  };
  // Two passes over one layout: the first measures the height, the second paints.
  const paint = (draw: boolean) => {
    let y = 0;
    const text = (t: string, size: number, weight: number, color: string, gap = 0, width = W - m0 * 2) => {
      for (const l of lines(t, size, weight, width)) {
        y += size * 1.3;
        if (draw) (ctx.font = `${weight} ${size}px ${FONT}`, (ctx.fillStyle = color), ctx.fillText(l, m0, y));
      }
      y += gap;
    };
    y = 24 + m0;
    text("Tether", 40, 700, c.greenText, 8);
    text(m.nickname, 64, 700, c.text, 4);
    text(m.exam, 36, 400, c.muted, 40);
    text(m.headline, 44, 700, accentText, 12);
    const scoreTop = y;
    text(m.score, 120, 700, c.text, 0);
    text(m.scoreLabel, 34, 400, c.muted, 8);
    text(m.date, 34, 700, c.text, 28);
    const scoreBottom = y;
    for (const d of m.details) text(d, 36, 400, c.text, 10);
    y += 24;
    const supportTop = y;
    y += 28;
    text(m.support, 38, 700, c.text, 0);
    y += 24;
    text(m.source, 28, 400, c.muted, 0);
    y += m0;
    return { height: Math.ceil(y), scoreTop, scoreBottom, supportTop };
  };
  const { height, scoreTop, scoreBottom, supportTop } = paint(false);
  cv.height = height;
  ctx.fillStyle = c.page;
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 24);
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, height - 4);
  paint(true);
  // Proof stamp: a ring and word, never colour alone. A progress card has none.
  if (m.badge) {
    const r = 110, cx = W - m0 - r, cy = (scoreTop + scoreBottom) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = c.goldBg;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = c.gold;
    ctx.stroke();
    ctx.fillStyle = c.goldText;
    ctx.font = `700 44px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(m.badge, cx, cy + 15);
    ctx.textAlign = "start";
  }
  ctx.fillStyle = c.border;
  ctx.fillRect(m0, supportTop, W - m0 * 2, 3);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/png"));
}
