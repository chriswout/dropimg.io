import { Hono } from "hono";
import { track } from "../lib/analytics";
import { toArrayBuffer } from "../lib/d1-blob";
import { removeImage } from "../lib/remove-image";
import { isValidSlug } from "../lib/slug";
import { verifyDeleteToken } from "../lib/tokens";
import type { ImageRow } from "../types";

type Env = {
  Bindings: Cloudflare.Env;
};

export const deleteRoutes = new Hono<Env>();

deleteRoutes.delete("/api/i/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) {
    return c.json({ error: "Not found" }, 404);
  }

  const auth = c.req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match) {
    return c.json({ error: "Missing delete token" }, 401);
  }
  const token = match[1]!.trim();

  const row = await c.env.DB.prepare(
    `SELECT * FROM images WHERE slug = ? LIMIT 1`,
  )
    .bind(slug)
    .first<ImageRow>();

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  const stored = toArrayBuffer(row.delete_token_hash);
  if (!stored || !(await verifyDeleteToken(token, stored))) {
    return c.json({ error: "Invalid delete token" }, 403);
  }

  if (row.deleted_at) {
    return c.json({ ok: true, alreadyDeleted: true });
  }

  const result = await removeImage(c.env, row, "user");

  if (!result.alreadyDeleted) {
    track(c.env.ANALYTICS, "delete_user", {
      slug,
      mime: row.mime,
      size: row.size,
    });
  }

  return c.json({ ok: true, alreadyDeleted: result.alreadyDeleted });
});
