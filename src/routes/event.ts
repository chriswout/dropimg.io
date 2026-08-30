import { Hono } from "hono";
import {
  allowInterval,
  allowPlan,
  track,
  type AnalyticsEvent,
} from "../lib/analytics";
import { normalizePageIntent } from "../lib/page-intent";
import { normalizeUploadClient } from "../lib/upload-client";

type Env = {
  Bindings: Cloudflare.Env;
};

const CLIENT_EVENTS = new Set<AnalyticsEvent>([
  "home_view",
  "landing_view",
  "share_cta_click",
  "recent_link_open",
  "recent_delete",
  "upload_start",
  "pro_cta_click",
  "checkout_completed_client",
  "dashboard_open",
  "dashboard_copy",
  "dashboard_delete",
]);

export const eventRoutes = new Hono<Env>();

/**
 * Lightweight product analytics beacon.
 * Accepts only allowlisted event names + low-cardinality fields.
 */
eventRoutes.post("/api/event", async (c) => {
  let body: {
    event?: string;
    page_intent?: string;
    pageIntent?: string;
    plan?: string;
    interval?: string;
    client?: string;
    reason?: string;
  };
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
  const reason =
    event === "landing_view"
      ? pageIntent || undefined
      : allowInterval(body.reason) || allowInterval(body.interval) || undefined;

  track(c.env.ANALYTICS, event, {
    pageIntent: pageIntent || undefined,
    reason,
    plan: allowPlan(body.plan) || undefined,
    interval: allowInterval(body.interval) || undefined,
    client: body.client ? normalizeUploadClient(body.client) : undefined,
  });

  return c.json({ ok: true });
});
