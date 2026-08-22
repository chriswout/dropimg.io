import { Hono } from "hono";
import { track } from "../lib/analytics";
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

  if (row.deleted_at) {
    return c.json({ ok: true, alreadyDeleted: true });
  }

  const stored = toArrayBuffer(row.delete_token_hash);
  if (!stored || !(await verifyDeleteToken(token, stored))) {
    return c.json({ error: "Invalid delete token" }, 403);
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    await c.env.BUCKET.delete(row.r2_key);
  } catch {
    // Continue — tombstone anyway so the URL stops serving
  }

  await c.env.DB.prepare(
    `UPDATE images
     SET deleted_at = ?, delete_reason = 'user', r2_key = ''
     WHERE slug = ? AND deleted_at IS NULL`,
  )
    .bind(now, slug)
    .run();

  track(c.env.ANALYTICS, "delete_user", {
    slug,
    mime: row.mime,
    size: row.size,
  });

  return c.json({ ok: true });
});

/** D1 may return BLOB as ArrayBuffer, Uint8Array, or number[]. */
function toArrayBuffer(value: unknown): ArrayBuffer | null {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return view.buffer.slice(
      view.byteOffset,
      view.byteOffset + view.byteLength,
    ) as ArrayBuffer;
  }
  if (Array.isArray(value)) {
    return new Uint8Array(value).buffer;
  }
  return null;
}
