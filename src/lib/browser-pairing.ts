import { randomToken, sha256Bytes, timingSafeEqualBytes } from "./auth/crypto";
import { toArrayBuffer } from "./d1-blob";
import { entitlementsFor } from "./entitlements";
import {
  createIntegrationToken,
  maskEmail,
  revokeIntegrationToken,
} from "./integration-token";

export const PAIRING_PENDING_TTL_SECONDS = 120;
export const PAIRING_HANDOFF_TTL_SECONDS = 60;
/** @deprecated Use PAIRING_PENDING_TTL_SECONDS. */
export const PAIRING_TTL_SECONDS = PAIRING_PENDING_TTL_SECONDS;
export const PAIRING_CLIENTS = ["chrome-extension", "edge-extension"] as const;
export type PairingClient = (typeof PAIRING_CLIENTS)[number];

export type PairingStatus =
  | "pending"
  | "approved"
  | "consumed"
  | "expired"
  | "cancelled";

export type BrowserPairingRow = {
  id: string;
  device_secret_hash: ArrayBuffer;
  client: string;
  created_at: number;
  expires_at: number;
  user_id: string | null;
  token_id: string | null;
  issued_token: string | null;
  approved_at: number | null;
  consumed_at: number | null;
  cancelled_at: number | null;
};

export function isPairingClient(raw: unknown): raw is PairingClient {
  return raw === "chrome-extension" || raw === "edge-extension";
}

export function pairingPublicStatus(
  row: Pick<
    BrowserPairingRow,
    "expires_at" | "cancelled_at" | "consumed_at" | "approved_at"
  >,
  now: number,
): PairingStatus {
  if (row.cancelled_at) return "cancelled";
  if (row.consumed_at) return "consumed";
  if (row.expires_at <= now) return "expired";
  if (row.approved_at) return "approved";
  return "pending";
}

export async function hashPairingSecret(secret: string): Promise<ArrayBuffer> {
  return sha256Bytes(secret);
}

export function extensionPairingLabel(
  userAgent: string,
  client: PairingClient,
): string {
  const browser =
    client === "edge-extension" || /Edg\//i.test(userAgent) ? "Edge" : "Chrome";
  let os = "browser";
  if (/CrOS/i.test(userAgent)) os = "ChromeOS";
  else if (/Android/i.test(userAgent)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(userAgent)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(userAgent)) os = "macOS";
  else if (/Windows/i.test(userAgent)) os = "Windows";
  else if (/Linux/i.test(userAgent)) os = "Linux";
  return `${browser} on ${os}`.slice(0, 50);
}

export async function startBrowserPairing(
  db: D1Database,
  input: { client: PairingClient; origin: string; now?: number },
): Promise<{
  pairingId: string;
  deviceSecret: string;
  verificationUrl: string;
  expiresIn: number;
}> {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const pairingId = crypto.randomUUID();
  const deviceSecret = randomToken();
  const hash = await hashPairingSecret(deviceSecret);
  await db
    .prepare(
      `INSERT INTO browser_pairings
        (id, device_secret_hash, client, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(pairingId, new Uint8Array(hash), input.client, now, now + PAIRING_PENDING_TTL_SECONDS)
    .run();
  return {
    pairingId,
    deviceSecret,
    verificationUrl: `${input.origin.replace(/\/$/, "")}/connect/browser/${pairingId}`,
    expiresIn: PAIRING_PENDING_TTL_SECONDS,
  };
}

export async function loadPairingById(
  db: D1Database,
  pairingId: string,
): Promise<BrowserPairingRow | null> {
  const row = await db
    .prepare(
      `SELECT id, device_secret_hash, client, created_at, expires_at, user_id,
              token_id, issued_token, approved_at, consumed_at, cancelled_at
       FROM browser_pairings WHERE id = ? LIMIT 1`,
    )
    .bind(pairingId)
    .first<{
      id: string;
      device_secret_hash: ArrayBuffer;
      client: string;
      created_at: number;
      expires_at: number;
      user_id: string | null;
      token_id: string | null;
      issued_token: string | null;
      approved_at: number | null;
      consumed_at: number | null;
      cancelled_at: number | null;
    }>();
  return row ?? null;
}

export async function loadPairingBySecret(
  db: D1Database,
  pairingId: string,
  deviceSecret: string,
): Promise<BrowserPairingRow | null> {
  if (!deviceSecret) return null;
  const row = await loadPairingById(db, pairingId);
  if (!row) return null;
  const expected = await hashPairingSecret(deviceSecret);
  const stored = toArrayBuffer(row.device_secret_hash);
  if (!stored || !timingSafeEqualBytes(expected, stored)) return null;
  return row;
}

export async function sweepExpiredPairing(
  db: D1Database,
  row: BrowserPairingRow,
  now: number,
): Promise<void> {
  if (pairingPublicStatus(row, now) !== "expired") return;
  if (!row.issued_token && !row.token_id) return;

  await db
    .prepare(
      `UPDATE browser_pairings
          SET issued_token = NULL
        WHERE id = ?
          AND consumed_at IS NULL
          AND expires_at <= ?`,
    )
    .bind(row.id, now)
    .run();

  if (row.token_id && row.user_id) {
    await revokeIntegrationToken(db, {
      userId: row.user_id,
      tokenId: row.token_id,
      now,
    });
  }
}

export async function approveBrowserPairing(
  db: D1Database,
  input: {
    pairingId: string;
    userId: string;
    label: string;
    now?: number;
  },
): Promise<
  | { ok: true; status: "approved" }
  | { ok: false; status: PairingStatus | "missing" | "taken" }
> {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const row = await loadPairingById(db, input.pairingId);
  if (!row) return { ok: false, status: "missing" };
  const status = pairingPublicStatus(row, now);
  if (status === "expired") {
    await sweepExpiredPairing(db, row, now);
    return { ok: false, status };
  }
  if (status === "approved" && row.user_id === input.userId) {
    return { ok: true, status: "approved" };
  }
  if (status === "approved" && row.user_id && row.user_id !== input.userId) {
    return { ok: false, status: "taken" };
  }
  if (status !== "pending") return { ok: false, status };

  const created = await createIntegrationToken(db, {
    userId: input.userId,
    label: input.label,
    kind: "extension",
    now,
  });
  const claimed = await db
    .prepare(
      `UPDATE browser_pairings
       SET user_id = ?, token_id = ?, issued_token = ?, approved_at = ?, expires_at = ?
       WHERE id = ? AND approved_at IS NULL AND cancelled_at IS NULL
         AND consumed_at IS NULL AND expires_at > ?`,
    )
    .bind(
      input.userId,
      created.id,
      created.token,
      now,
      now + PAIRING_HANDOFF_TTL_SECONDS,
      input.pairingId,
      now,
    )
    .run();
  if ((claimed.meta?.changes ?? 0) === 0) {
    await revokeIntegrationToken(db, {
      userId: input.userId,
      tokenId: created.id,
      now,
    });
    const latest = await loadPairingById(db, input.pairingId);
    if (!latest) return { ok: false, status: "missing" };
    if (pairingPublicStatus(latest, now) === "expired") {
      await sweepExpiredPairing(db, latest, now);
    }
    const latestStatus = pairingPublicStatus(latest, now);
    if (latestStatus === "approved" && latest.user_id === input.userId) {
      return { ok: true, status: "approved" };
    }
    if (latestStatus === "approved") return { ok: false, status: "taken" };
    return { ok: false, status: latestStatus };
  }
  return { ok: true, status: "approved" };
}

export async function cancelBrowserPairing(
  db: D1Database,
  pairingId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<PairingStatus | "missing"> {
  const row = await loadPairingById(db, pairingId);
  if (!row) return "missing";
  const status = pairingPublicStatus(row, now);
  if (status === "expired") {
    await sweepExpiredPairing(db, row, now);
    return "expired";
  }
  if (status === "pending") {
    await db
      .prepare(
        `UPDATE browser_pairings
         SET cancelled_at = ?, issued_token = NULL
         WHERE id = ? AND cancelled_at IS NULL AND consumed_at IS NULL`,
      )
      .bind(now, pairingId)
      .run();
    return "cancelled";
  }
  return status;
}

export async function consumeApprovedPairing(
  env: Cloudflare.Env,
  pairingId: string,
  deviceSecret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<
  | { ok: true; status: "pending" }
  | {
      ok: true;
      status: "approved";
      token: string;
      user: { emailMasked: string };
      entitlements: {
        plan: "free" | "pro" | "anonymous";
        maxUploadBytes: number;
        allowedExpirySeconds: number[];
        defaultExpirySeconds: number;
      };
    }
  | { ok: true; status: Exclude<PairingStatus, "pending" | "approved"> }
  | { ok: false; status: "unauthorized" | "missing" }
> {
  const row = await loadPairingBySecret(env.DB, pairingId, deviceSecret);
  if (!row) {
    const exists = await loadPairingById(env.DB, pairingId);
    return { ok: false, status: exists ? "unauthorized" : "missing" };
  }
  const status = pairingPublicStatus(row, now);
  if (status === "expired") {
    await sweepExpiredPairing(env.DB, row, now);
    return { ok: true, status: "expired" };
  }
  if (status === "pending") return { ok: true, status: "pending" };
  if (status !== "approved") {
    return { ok: true, status };
  }

  /**
   * One winner: consumed_at is set only if it was still null and the handoff
   * window is still open. RETURNING keeps the token value because we do not
   * null it in this statement (SQLite RETURNING is post-update).
   */
  const claimed = await env.DB.prepare(
    `UPDATE browser_pairings
     SET consumed_at = ?
     WHERE id = ? AND consumed_at IS NULL AND cancelled_at IS NULL
       AND issued_token IS NOT NULL AND expires_at > ?
     RETURNING issued_token, user_id`,
  )
    .bind(now, pairingId, now)
    .first<{ issued_token: string; user_id: string }>();
  if (!claimed?.issued_token || !claimed.user_id) {
    const latest = await loadPairingById(env.DB, pairingId);
    if (!latest) return { ok: true, status: "consumed" };
    const latestStatus = pairingPublicStatus(latest, now);
    if (latestStatus === "expired") {
      await sweepExpiredPairing(env.DB, latest, now);
      return { ok: true, status: "expired" };
    }
    return { ok: true, status: latestStatus === "approved" ? "consumed" : latestStatus };
  }
  await env.DB.prepare(
    `UPDATE browser_pairings SET issued_token = NULL WHERE id = ? AND consumed_at IS NOT NULL`,
  )
    .bind(pairingId)
    .run();

  const user = await env.DB.prepare(
    `SELECT email FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
  )
    .bind(claimed.user_id)
    .first<{ email: string }>();
  if (!user) return { ok: true, status: "cancelled" };

  const entitlements = await entitlementsFor(env, claimed.user_id);
  return {
    ok: true,
    status: "approved",
    token: claimed.issued_token,
    user: { emailMasked: maskEmail(user.email) },
    entitlements: {
      plan: entitlements.plan,
      maxUploadBytes: entitlements.maxUploadBytes,
      allowedExpirySeconds: entitlements.allowedExpirySeconds,
      defaultExpirySeconds: entitlements.defaultExpirySeconds,
    },
  };
}

export async function cancelPairingsForUser(
  db: D1Database,
  userId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  await db
    .prepare(
      `UPDATE browser_pairings
       SET cancelled_at = COALESCE(cancelled_at, ?), issued_token = NULL
       WHERE user_id = ?`,
    )
    .bind(now, userId)
    .run();
}
