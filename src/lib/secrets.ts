const DEV_PLACEHOLDER = "dev-ip-hash-secret-change-me";

/**
 * Resolve IP hash secret. Staging/production refuse the missing or placeholder
 * secret so a misconfigured deploy cannot share a known hashing key.
 */
export function resolveIpHashSecret(env: {
  ENVIRONMENT?: string;
  IP_HASH_SECRET?: string;
}): { ok: true; secret: string } | { ok: false } {
  const secret = env.IP_HASH_SECRET?.trim() ?? "";
  const isProdLike =
    env.ENVIRONMENT === "production" || env.ENVIRONMENT === "staging";

  if (isProdLike) {
    if (!secret || secret === DEV_PLACEHOLDER) return { ok: false };
    return { ok: true, secret };
  }

  return { ok: true, secret: secret || DEV_PLACEHOLDER };
}
