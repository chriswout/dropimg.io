import { describe, expect, it } from "vitest";
import { verifyPaypalWebhook } from "../../src/lib/billing/paypal";
import { hmacSha256Hex, verifyHmacSignature } from "../../src/lib/billing/verify";

const SECRET = "whsec_test_secret";
const BODY = JSON.stringify({
  id: "WH-01test",
  event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
  resource: { id: "I-01test" },
});

async function sign(ts: number, body = BODY): Promise<string> {
  const v1 = await hmacSha256Hex(SECRET, `${ts}.${body}`);
  return `t=${ts},v1=${v1}`;
}

describe("verifyHmacSignature", () => {
  it("accepts a fresh matching signature", async () => {
    const ts = 1_700_000_000;
    const result = await verifyHmacSignature({
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
    const result = await verifyHmacSignature({
      rawBody: BODY,
      header: `t=${ts},v1=${"0".repeat(64)},v1=${good}`,
      secret: SECRET,
      nowSeconds: ts,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const ts = 1_700_000_000;
    const result = await verifyHmacSignature({
      rawBody: BODY.replace("ACTIVATED", "CANCELLED"),
      header: await sign(ts),
      secret: SECRET,
      nowSeconds: ts,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("mismatch");
  });

  it("rejects a stale timestamp", async () => {
    const ts = 1_700_000_000;
    const result = await verifyHmacSignature({
      rawBody: BODY,
      header: await sign(ts),
      secret: SECRET,
      nowSeconds: ts + 600,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("expired");
  });

  it("tolerates skew inside the 300s window", async () => {
    const ts = 1_700_000_000;
    const result = await verifyHmacSignature({
      rawBody: BODY,
      header: await sign(ts),
      secret: SECRET,
      nowSeconds: ts + 120,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a missing header", async () => {
    const result = await verifyHmacSignature({
      rawBody: BODY,
      header: "",
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("missing");
  });

  it("rejects a header with no v1 part", async () => {
    const result = await verifyHmacSignature({
      rawBody: BODY,
      header: "t=1700000000",
      secret: SECRET,
      nowSeconds: 1_700_000_000,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("malformed");
  });
});

describe("verifyPaypalWebhook", () => {
  it("uses HMAC when only PAYPAL_WEBHOOK_SECRET is set", async () => {
    const ts = 1_700_000_000;
    const headers = new Headers({
      "PayPal-Signature": await sign(ts),
    });
    const result = await verifyPaypalWebhook(
      { PAYPAL_WEBHOOK_SECRET: SECRET },
      { rawBody: BODY, headers, nowSeconds: ts },
    );
    expect(result).toEqual({ ok: true });
  });

  it("calls PayPal verify-webhook-signature when WEBHOOK_ID is set", async () => {
    const calls: string[] = [];
    const headers = new Headers({
      "paypal-transmission-id": "tid",
      "paypal-transmission-time": "2026-01-01T00:00:00Z",
      "paypal-transmission-sig": "sig",
      "paypal-cert-url": "https://api.paypal.com/cert",
      "paypal-auth-algo": "SHA256withRSA",
    });
    const fakeFetch: typeof fetch = async (input) => {
      calls.push(String(input));
      if (String(input).includes("/oauth2/token")) {
        return new Response(JSON.stringify({ access_token: "tok", expires_in: 300 }));
      }
      return new Response(JSON.stringify({ verification_status: "SUCCESS" }));
    };
    const result = await verifyPaypalWebhook(
      {
        PAYPAL_ENV: "sandbox",
        PAYPAL_CLIENT_ID: "id",
        PAYPAL_CLIENT_SECRET: "secret",
        PAYPAL_WEBHOOK_ID: "WH-1",
      },
      { rawBody: BODY, headers },
      fakeFetch,
    );
    expect(result).toEqual({ ok: true });
    expect(calls.some((u) => u.includes("/v1/notifications/verify-webhook-signature"))).toBe(
      true,
    );
  });
});
