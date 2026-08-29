import { Hono } from "hono";
import { track, type AnalyticsEvent } from "../lib/analytics";
import { normalizePageIntent } from "../lib/page-intent";

type Env = {
  Bindings: Cloudflare.Env;
};

const CLIENT_EVENTS = new Set<AnalyticsEvent>([
  "home_view",
  "landing_view",
  "share_cta_click",
  "recent_link_open",
  "recent_delete",
]);

export const eventRoutes = new Hono<Env>();

/**
 * Lightweight product analytics beacon.
 * Accepts only allowlisted event names + page_intent values.
 */
eventRoutes.post("/api/event", async (c) => {
  let body: { event?: string; page_intent?: string; pageIntent?: string };
  try {
    const text = await c.req.text();
    body = text ? (JSON.parse(text) as typeof body) : {};
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const event = (body.event || "").trim() as AnalyticsEvent;
  if (!CLIENT_EVENTS.has(event)) {
    return c.json({ error: "Unknown event" }, 400);
  }

  const pageIntent = normalizePageIntent(
    body.page_intent ?? body.pageIntent ?? "",
  );

  track(c.env.ANALYTICS, event, {
    pageIntent: pageIntent || undefined,
    reason: event === "landing_view" ? pageIntent || undefined : undefined,
  });

  return c.json({ ok: true });
});
