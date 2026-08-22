import { track } from "../lib/analytics";

const BATCH = 500;
const MAX_BATCHES = 4;
const TOMBSTONE_KEEP_SECONDS = 7 * 24 * 60 * 60;

/**
 * Expire live images, then purge old tombstones.
 * R2 delete before D1 tombstone; R2 deletes are idempotent.
 */
export async function runCleanup(
  env: Cloudflare.Env,
  now = Math.floor(Date.now() / 1000),
): Promise<{ expired: number; purged: number }> {
  let expired = 0;
  let purged = 0;

  for (let b = 0; b < MAX_BATCHES; b++) {
    const { results } = await env.DB.prepare(
      `SELECT id, slug, r2_key, mime, size FROM images
       WHERE deleted_at IS NULL AND expires_at <= ?
       LIMIT ?`,
    )
      .bind(now, BATCH)
      .all<{
        id: string;
        slug: string;
        r2_key: string;
        mime: string;
        size: number;
      }>();

    if (!results || results.length === 0) break;

    const keys = results.map((r) => r.r2_key).filter(Boolean);
    if (keys.length > 0) {
      await env.BUCKET.delete(keys);
    }

    const ids = results.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");
    await env.DB.prepare(
      `UPDATE images
       SET deleted_at = ?, delete_reason = 'expired', r2_key = ''
       WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    )
      .bind(now, ...ids)
      .run();

    for (const row of results) {
      track(env.ANALYTICS, "delete_expired", {
        slug: row.slug,
        mime: row.mime,
        size: row.size,
      });
    }
    expired += results.length;
    if (results.length < BATCH) break;
  }

  // Hard-delete tombstones older than 7 days
  for (let b = 0; b < MAX_BATCHES; b++) {
    const cutoff = now - TOMBSTONE_KEEP_SECONDS;
    const { results } = await env.DB.prepare(
      `SELECT id FROM images
       WHERE deleted_at IS NOT NULL AND deleted_at <= ?
       LIMIT ?`,
    )
      .bind(cutoff, BATCH)
      .all<{ id: string }>();

    if (!results || results.length === 0) break;
    const ids = results.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");
    await env.DB.prepare(
      `DELETE FROM images WHERE id IN (${placeholders})`,
    )
      .bind(...ids)
      .run();
    purged += results.length;
    if (results.length < BATCH) break;
  }

  return { expired, purged };
}
