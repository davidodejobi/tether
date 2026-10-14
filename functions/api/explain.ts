// Cloudflare Pages Function: POST /api/explain (spec section 5a). The provider key stays here (env.OPENROUTER_API_KEY).
// The request holds only { moveId, contentVersion, style }; the reviewed rule is loaded server-side.
// Nothing about the learner is received, logged or sent on. Provider errors are never returned.
import { buildPrompt, checkOutput, parseCompletion, parseRequest, type ExplainResponse, type Failure } from "../../server/explain-core.ts";

interface Env {
  OPENROUTER_API_KEY?: string;
  AI_MODEL?: string;
}

const DEFAULT_MODEL = "google/gemini-3.5-flash-lite";
const LIMIT = 10;
const WINDOW_MS = 60_000;
const TIMEOUT_MS = 15_000;

// ponytail: Pages Functions do not support the Workers Rate Limiting binding, so this is a per-isolate sliding window.
// Isolates are not shared across locations, so it is best-effort; the credit limit set on the OpenRouter key is the hard cap.
const hits = new Map<string, number[]>();
export function limited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return false;
}

const status: Record<Failure, number> = { bad_request: 400, rate: 429, invalid: 502, timeout: 504, unavailable: 503 };
const reply = (r: ExplainResponse) =>
  new Response(JSON.stringify(r), { status: r.ok ? 200 : status[r.reason], headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (reason: Failure) => reply({ ok: false, reason });

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  if (limited(request.headers.get("cf-connecting-ip") ?? "local", Date.now())) return fail("rate");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("bad_request");
  }
  const req = parseRequest(body);
  if (!req) return fail("bad_request");
  if (!env.OPENROUTER_API_KEY) return fail("unavailable");

  const { system, user } = buildPrompt(req.style);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: ctl.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": new URL(request.url).origin,
        "X-Title": "Tether",
      },
      body: JSON.stringify({
        model: env.AI_MODEL || DEFAULT_MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        max_tokens: 220,
        temperature: 0.4,
      }),
    });
    if (!res.ok) return fail("unavailable");
    const text = parseCompletion(await res.json());
    if (!text || checkOutput(text)) return fail("invalid");
    return reply({ ok: true, text });
  } catch (e) {
    return fail(ctl.signal.aborted || (e instanceof Error && e.name === "AbortError") ? "timeout" : "unavailable");
  } finally {
    clearTimeout(timer);
  }
};

// Anything but POST.
export const onRequest = (): Response => new Response(null, { status: 405, headers: { allow: "POST" } });
