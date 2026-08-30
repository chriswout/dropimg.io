/** Stripe's own recommended tolerance for replayed webhook deliveries. */
export const STRIPE_SIGNATURE_MAX_SKEW_SECONDS = 300;

export type VerifyResult =
  | { ok: true; ts: number }
  | { ok: false; error: "missing" | "malformed" | "expired" | "mismatch" };

/**
 * `t=<unix>,v1=<hex>` with a v1 per active secret, so a signature rotated in
 * the dashboard keeps verifying against the old secret until it is retired.
 */
function parseSignatureHeader(header: string): { ts: number; v1: string[] } | null {
  let ts: number | null = null;
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!v) continue;
    if (k === "t") ts = Number(v);
    if (k === "v1") v1.push(v);
  }
  if (ts == null || !Number.isFinite(ts) || v1.length === 0) return null;
  return { ts, v1 };
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyStripeSignature(opts: {
  rawBody: string;
  header: string | null | undefined;
  secret: string;
  nowSeconds?: number;
  maxSkewSeconds?: number;
}): Promise<VerifyResult> {
  const header = opts.header?.trim() || "";
  if (!header || !opts.rawBody || !opts.secret) return { ok: false, error: "missing" };
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { ok: false, error: "malformed" };

  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  const skew = opts.maxSkewSeconds ?? STRIPE_SIGNATURE_MAX_SKEW_SECONDS;
  if (Math.abs(now - parsed.ts) > skew) return { ok: false, error: "expired" };

  const expected = hexToBytes(
    await hmacSha256Hex(opts.secret, `${parsed.ts}.${opts.rawBody}`),
  );
  if (!expected) return { ok: false, error: "mismatch" };

  for (const candidate of parsed.v1) {
    const given = hexToBytes(candidate);
    if (given && timingSafeEqual(expected, given)) return { ok: true, ts: parsed.ts };
  }
  return { ok: false, error: "mismatch" };
}
