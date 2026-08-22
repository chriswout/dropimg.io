/** HMAC IP fingerprint — never store raw IPs. Rotates daily via date salt. */

export async function hashIp(
  ip: string,
  secret: string,
  now = new Date(),
): Promise<string> {
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD UTC
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
    new TextEncoder().encode(`${ip}|${date}`),
  );
  // Truncate to 16 bytes hex (32 chars) — enough for rate-limit keys
  const bytes = new Uint8Array(sig).slice(0, 16);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}
