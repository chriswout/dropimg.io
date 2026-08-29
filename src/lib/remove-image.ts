export type DeleteReason = "user" | "expired" | "moderation";

export type RemovableImage = {
  id: string;
  slug: string;
  r2_key: string;
  deleted_at: number | null;
  mime?: string;
  size?: number;
};

/**
 * Delete R2 object (idempotent) then tombstone the D1 row.
 * Shared by user delete and moderation remove.
 */
export async function removeImage(
  env: { DB: D1Database; BUCKET: R2Bucket },
  row: RemovableImage,
  reason: DeleteReason,
  now = Math.floor(Date.now() / 1000),
): Promise<{ alreadyDeleted: boolean }> {
  if (row.deleted_at) {
    return { alreadyDeleted: true };
  }

  if (row.r2_key) {
    try {
      await env.BUCKET.delete(row.r2_key);
    } catch {
      // Continue — tombstone so the URL stops serving
    }
  }

  await tombstoneImages(env.DB, [row.id], reason, now);
  return { alreadyDeleted: false };
}

/** Batch R2 deletes (cleanup / multi-key). Empty keys skipped. */
export async function deleteR2Keys(
  bucket: R2Bucket,
  keys: string[],
): Promise<void> {
  const filtered = keys.filter(Boolean);
  if (filtered.length === 0) return;
  await bucket.delete(filtered);
}

/** Tombstone one or more live image rows with a preserved delete_reason. */
export async function tombstoneImages(
  db: D1Database,
  ids: string[],
  reason: DeleteReason,
  now: number,
): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  await db
    .prepare(
      `UPDATE images
       SET deleted_at = ?, delete_reason = ?, r2_key = ''
       WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    )
    .bind(now, reason, ...ids)
    .run();
}
