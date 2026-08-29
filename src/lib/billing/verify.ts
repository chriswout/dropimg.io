/** Paddle docs window is 5s; allow 10s for Worker/Paddle clock skew. */
export const PADDLE_SIGNATURE_MAX_SKEW_SECONDS = 10;

export type VerifyResult =
  | { ok: true; ts: number }
  | { ok: false; error: "missing" | "malformed" | "expired" | "mismatch" };

function parseSignatureHeader(header: string): { ts: number; h1: string } | null {
  let ts: number | null = null;
  let h1: string | null = null;
  for (const part of header.split(";")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k === "ts" && v) ts = Number(v);
    if (k === "h1" && v) h1 = v;
  }
  if (ts == null || !Number.isFinite(ts) || !h1) return null;
  return { ts, h1 };
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

export async function verifyPaddleSignature(opts: {
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
  const skew = opts.maxSkewSeconds ?? PADDLE_SIGNATURE_MAX_SKEW_SECONDS;
  if (Math.abs(now - parsed.ts) > skew) return { ok: false, error: "expired" };

  const expected = await hmacSha256Hex(opts.secret, `${parsed.ts}:${opts.rawBody}`);
  const a = hexToBytes(expected);
  const b = hexToBytes(parsed.h1);
  if (!a || !b || !timingSafeEqual(a, b)) return { ok: false, error: "mismatch" };
  return { ok: true, ts: parsed.ts };
}
