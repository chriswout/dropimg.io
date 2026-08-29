import { Hono } from "hono";
import { ugcShareAdsEnabled } from "../lib/ads";
import { track } from "../lib/analytics";
import { resolveSession } from "../lib/auth/session";
import { lockedShareCsp, securityHeaders, sharePageCsp } from "../lib/headers";
import {
  imageHasPassword,
  unlockCookieValid,
} from "../lib/image-password";
import { resolveIpHashSecret } from "../lib/secrets";
import { isValidSlug } from "../lib/slug";
import type { ImageRow } from "../types";
import { renderLockedSharePage } from "../views/locked-share";
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

  if (imageHasPassword(row)) {
    const session = await resolveSession(c.env.DB, c.req.header("cookie"));
    const owner = Boolean(session && row.user_id && session.id === row.user_id);
    const secretResolved = resolveIpHashSecret(c.env);
    const unlocked =
      secretResolved.ok &&
      (await unlockCookieValid(slug, c.req.header("cookie"), secretResolved.secret));
    if (!owner && !unlocked) {
      return new Response(renderLockedSharePage({ slug, origin }), {
        status: 200,
        headers: securityHeaders({
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": lockedShareCsp(),
          "X-Robots-Tag": "noindex, nofollow",
          "Cache-Control": "private, no-store",
        }),
      });
    }
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
