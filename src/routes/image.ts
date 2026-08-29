import { Hono } from "hono";
import { track } from "../lib/analytics";
import { csrfOriginOk } from "../lib/auth/csrf";
import { resolveSession } from "../lib/auth/session";
import { toArrayBuffer } from "../lib/d1-blob";
import { imageResponseHeaders, lockedShareCsp, securityHeaders } from "../lib/headers";
import {
  imageHasPassword,
  signUnlockCookie,
  unlockCookieHeader,
  unlockCookieValid,
  verifyImagePassword,
} from "../lib/image-password";
import { mimeToExt } from "../lib/inspect";
import { clientIp, hashIp } from "../lib/ip";
import { resolveIpHashSecret } from "../lib/secrets";
import { isValidSlug } from "../lib/slug";
import type { AllowedMime, ImageRow } from "../types";
import { renderLockedSharePage } from "../views/locked-share";

type Env = {
  Bindings: Cloudflare.Env;
};

export const imageRoutes = new Hono<Env>();

imageRoutes.get("/i/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) {
    return c.text("Not found", 404);
  }

  const row = await c.env.DB.prepare(
    `SELECT * FROM images WHERE slug = ? LIMIT 1`,
  )
    .bind(slug)
    .first<ImageRow>();

  if (!row || row.deleted_at) {
    return c.text("Not found", 404);
  }

  const now = Math.floor(Date.now() / 1000);
  if (row.expires_at <= now) {
    return c.text("Gone", 410);
  }

  if (imageHasPassword(row)) {
    const allowed = await canViewProtected(c, row, slug);
    if (!allowed) return c.text("Unauthorized", 401);
  }

  const object = await c.env.BUCKET.get(row.r2_key);
  if (!object) {
    return c.text("Not found", 404);
  }

  const mime = row.mime as AllowedMime;
  const etag = object.httpEtag;
  const headers = imageResponseHeaders({
    mime,
    slug,
    ext: mimeToExt(mime),
    etag,
    protected: imageHasPassword(row),
  });

  const inm = c.req.header("if-none-match");
  if (etag && inm && inm === etag) {
    headers.delete("Content-Type");
    headers.delete("Content-Disposition");
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { status: 200, headers });
});

imageRoutes.post("/api/i/:slug/unlock", async (c) => {
  const slug = c.req.param("slug");
  const origin = new URL(c.req.url).origin;
  const lockedHeaders = securityHeaders({
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": lockedShareCsp(),
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "private, no-store",
  });

  if (!isValidSlug(slug)) {
    return c.text("Not found", 404);
  }
  if (!csrfOriginOk(c.req.raw)) {
    return c.json({ error: "Invalid origin" }, 403);
  }

  const secretResolved = resolveIpHashSecret(c.env);
  if (!secretResolved.ok) return c.text("Unavailable", 500);
  const ipHash = await hashIp(clientIp(c.req.raw), secretResolved.secret);

  const limiter = c.env.AUTH_LIMIT;
  if (limiter) {
    const { success } = await limiter.limit({ key: `unlock:${ipHash}:${slug}` });
    if (!success) {
      return new Response(
        renderLockedSharePage({
          slug,
          origin,
          error: "Try again shortly.",
        }),
        { status: 429, headers: lockedHeaders },
      );
    }
  }

  const row = await c.env.DB.prepare(
    `SELECT * FROM images WHERE slug = ? LIMIT 1`,
  )
    .bind(slug)
    .first<ImageRow>();
  if (!row || row.deleted_at || !imageHasPassword(row)) {
    return c.text("Not found", 404);
  }

  let password = "";
  const ct = c.req.header("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const body = (await c.req.json()) as { password?: string };
      password = String(body.password || "");
    } catch {
      password = "";
    }
  } else {
    const form = await c.req.formData();
    password = String(form.get("password") || "");
  }

  const hash = toArrayBuffer(row.password_hash);
  const salt = toArrayBuffer(row.password_salt);
  const ok =
    hash &&
    salt &&
    (await verifyImagePassword(password, {
      hash,
      salt,
      iterations: row.password_iterations || 0,
    }));

  if (!ok) {
    track(c.env.ANALYTICS, "unlock_fail", { slug });
    const wantsJson = ct.includes("application/json");
    if (wantsJson) return c.json({ error: "Wrong password." }, 401);
    return new Response(
      renderLockedSharePage({
        slug,
        origin,
        error: "Wrong password.",
      }),
      { status: 401, headers: lockedHeaders },
    );
  }

  const value = await signUnlockCookie(slug, secretResolved.secret);
  track(c.env.ANALYTICS, "unlock_ok", { slug });
  if (ct.includes("application/json")) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": unlockCookieHeader(slug, value, c.env),
      },
    });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${slug}`,
      "Set-Cookie": unlockCookieHeader(slug, value, c.env),
    },
  });
});

async function canViewProtected(
  c: { env: Cloudflare.Env; req: { header: (n: string) => string | undefined } },
  row: ImageRow,
  slug: string,
): Promise<boolean> {
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (session && row.user_id && session.id === row.user_id) return true;
  const secretResolved = resolveIpHashSecret(c.env);
  if (!secretResolved.ok) return false;
  return unlockCookieValid(slug, c.req.header("cookie"), secretResolved.secret);
}
