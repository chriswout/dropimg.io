import { Hono } from "hono";
import { imageResponseHeaders } from "../lib/headers";
import { mimeToExt } from "../lib/inspect";
import { isValidSlug } from "../lib/slug";
import type { AllowedMime, ImageRow } from "../types";

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

  const object = await c.env.BUCKET.get(row.r2_key);
  if (!object) {
    return c.text("Not found", 404);
  }

  const etag = object.httpEtag;
  const inm = c.req.header("if-none-match");
  if (etag && inm && inm === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const mime = row.mime as AllowedMime;
  const headers = imageResponseHeaders({
    mime,
    slug,
    ext: mimeToExt(mime),
    etag,
  });

  return new Response(object.body, { status: 200, headers });
});
