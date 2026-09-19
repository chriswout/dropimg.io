export async function settlePendingPlanChanges(
  db: D1Database,
  opts: { userId: string; now?: number },
): Promise<void> {
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE subscriptions
       SET price_id = pending_price_id,
           pending_price_id = NULL,
           pending_effective_at = NULL,
           updated_at = ?
       WHERE user_id = ?
         AND pending_price_id IS NOT NULL
         AND pending_effective_at IS NOT NULL
         AND pending_effective_at <= ?`,
    )
    .bind(now, opts.userId, now)
    .run();
}
