import { describe, expect, it } from "vitest";
import {
  hmacSha256Hex,
  verifyStripeSignature,
} from "../../src/lib/billing/verify";

const SECRET = "whsec_test_secret";
const BODY = JSON.stringify({
  id: "evt_01test",
  type: "customer.subscription.created",
  data: { object: { id: "sub_01test" } },
});

async function sign(ts: number, body = BODY): Promise<string> {
  const v1 = await hmacSha256Hex(SECRET, `${ts}.${body}`);
  return `t=${ts},v1=${v1}`;
}

describe("verifyStripeSignature", () => {
  it("accepts a fresh matching signature", async () => {
    const ts = 1_700_000_000;
    const result = await verifyStripeSignature({
      rawBody: BODY,
      header: await sign(ts),
      secret: SECRET,
      nowSeconds: ts,
    });
    expect(result).toEqual({ ok: true, ts });
  });

  it("accepts when one of several v1 signatures matches", async () => {
    const ts = 1_700_000_000;
    const good = await hmacSha256Hex(SECRET, `${ts}.${BODY}`);
    const result = await verifyStripeSignature({
      rawBody: BODY,
      header: `t=${ts},v1=${"0".repeat(64)},v1=${good}`,
      secret: SECRET,
      nowSeconds: ts,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const ts = 1_700_000_000;
    const result = await verifyStripeSignature({
      rawBody: BODY.replace("created", "updated"),
      header: await sign(ts),
      secret: SECRET,
      nowSeconds: ts,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("mismatch");
  });

  it("rejects a stale timestamp", async () => {
    const ts = 1_700_000_000;
    const result = await verifyStripeSignature({
      rawBody: BODY,
      header: await sign(ts),
      secret: SECRET,
      nowSeconds: ts + 600,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("expired");
  });

  it("tolerates skew inside Stripe's window", async () => {
    const ts = 1_700_000_000;
    const result = await verifyStripeSignature({
      rawBody: BODY,
      header: await sign(ts),
      secret: SECRET,
      nowSeconds: ts + 120,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a missing header", async () => {
    const result = await verifyStripeSignature({
      rawBody: BODY,
      header: "",
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("missing");
  });

  it("rejects a header with no v1 part", async () => {
    const result = await verifyStripeSignature({
      rawBody: BODY,
      header: "t=1700000000",
      secret: SECRET,
      nowSeconds: 1_700_000_000,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("malformed");
  });
});
