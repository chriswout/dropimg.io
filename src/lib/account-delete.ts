import { revokeAllSessions } from "./auth/session";
import { revokeAllIntegrationTokens } from "./integration-token";
import {
  cancelPaddleSubscriptionImmediately,
  isLivePaddleStatus,
  type BillingEnv,
} from "./billing/paddle";
import { removeImage } from "./remove-image";

export type AccountDeleteFail = {
  ok: false;
  status: 409 | 502;
  error: string;
};

export type AccountDeleteOk = { ok: true };

export async function deleteUserAccount(
  env: Cloudflare.Env & BillingEnv,
  userId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<AccountDeleteOk | AccountDeleteFail> {
  const subs = await env.DB.prepare(
    `SELECT provider_subscription_id, status
     FROM subscriptions
     WHERE user_id = ? AND provider = 'paddle'`,
  )
    .bind(userId)
    .all<{ provider_subscription_id: string | null; status: string }>();

  for (const sub of subs.results ?? []) {
    if (!isLivePaddleStatus(sub.status)) continue;
    const subscriptionId = sub.provider_subscription_id?.trim();
    if (!subscriptionId) {
      return {
        ok: false,
        status: 409,
        error:
          "We couldn't cancel your Pro subscription, so your DropIMG account was not deleted.",
      };
    }
    const canceled = await cancelPaddleSubscriptionImmediately(env, subscriptionId);
    if (!canceled.ok) {
      return {
        ok: false,
        status: canceled.error === "paddle_unconfigured" ? 409 : 502,
        error:
          "We couldn't cancel your Pro subscription, so your DropIMG account was not deleted.",
      };
    }
    await env.DB.prepare(
      `UPDATE subscriptions
       SET status = 'canceled', cancel_at_period_end = 0, updated_at = ?
       WHERE provider_subscription_id = ?`,
    )
      .bind(now, subscriptionId)
      .run();
  }

  const images = await env.DB.prepare(
    `SELECT id, slug, r2_key, deleted_at
     FROM images
     WHERE user_id = ? AND deleted_at IS NULL`,
  )
    .bind(userId)
    .all<{
      id: string;
      slug: string;
      r2_key: string;
      deleted_at: number | null;
    }>();

  for (const row of images.results ?? []) {
    await removeImage(env, row, "user", now);
  }

  await revokeAllIntegrationTokens(env.DB, userId, now);
  await revokeAllSessions(env.DB, userId, now);
  const tombstoneEmail = `deleted.${userId}@deleted.dropimg.invalid`;
  await env.DB.prepare(
    `UPDATE users
     SET email = ?, email_norm = ?, deleted_at = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(tombstoneEmail, tombstoneEmail, now, now, userId)
    .run();

  return { ok: true };
}
