import { Hono } from "hono";
import { ugcShareAdsEnabled } from "../lib/ads";
import { track } from "../lib/analytics";
import { securityHeaders, sharePageCsp } from "../lib/headers";
import { isValidSlug } from "../lib/slug";
import type { ImageRow } from "../types";
import { renderGonePage, renderSharePage } from "../views/share";

type Env = {
  Bindings: Cloudflare.Env;
};

export const shareRoutes = new Hono<Env>();

shareRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) {
    // Let static assets / 404-page handle non-slug paths like /terms if present;
    // for invalid slug-shaped paths, 404.
    return c.env.ASSETS.fetch(c.req.raw);
  }

  const row = await c.env.DB.prepare(
    `SELECT * FROM images WHERE slug = ? LIMIT 1`,
  )
    .bind(slug)
    .first<ImageRow>();

  const origin = new URL(c.req.url).origin;
  const headers = securityHeaders({
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": sharePageCsp(),
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "private, no-store",
  });

  if (!row) {
    return new Response(renderGonePage({ reason: "missing" }), {
      status: 404,
      headers,
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (row.deleted_at || row.expires_at <= now) {
    return new Response(
      renderGonePage({
        reason:
          row.delete_reason === "user" || row.delete_reason === "moderation"
            ? "deleted"
            : "expired",
      }),
      { status: 410, headers },
    );
  }

  track(c.env.ANALYTICS, "share_view", {
    slug,
    mime: row.mime,
    size: row.size,
  });

  const html = renderSharePage({
    slug,
    origin,
    mime: row.mime,
    width: row.width,
    height: row.height,
    size: row.size,
    expiresAt: row.expires_at,
    adsEnabled: ugcShareAdsEnabled(c.env),
  });

  return new Response(html, { status: 200, headers });
});
