import { describe, expect, it } from "vitest";
import {
  hmacSha256Hex,
  verifyPaddleSignature,
} from "../../src/lib/billing/verify";

const SECRET = "pdl_ntfset_test_secret";
const BODY = JSON.stringify({
  event_id: "evt_01test",
  event_type: "subscription.created",
  data: { id: "sub_01test" },
});

async function sign(ts: number, body = BODY): Promise<string> {
  const h1 = await hmacSha256Hex(SECRET, `${ts}:${body}`);
  return `ts=${ts};h1=${h1}`;
}

describe("verifyPaddleSignature", () => {
  it("accepts a fresh matching signature", async () => {
    const ts = 1_700_000_000;
    const header = await sign(ts);
    const result = await verifyPaddleSignature({
      rawBody: BODY,
      header,
      secret: SECRET,
      nowSeconds: ts,
    });
    expect(result).toEqual({ ok: true, ts });
  });

  it("rejects a tampered body", async () => {
    const ts = 1_700_000_000;
    const header = await sign(ts);
    const result = await verifyPaddleSignature({
      rawBody: BODY.replace("created", "updated"),
      header,
      secret: SECRET,
      nowSeconds: ts,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("mismatch");
  });

  it("rejects a stale timestamp", async () => {
    const ts = 1_700_000_000;
    const header = await sign(ts);
    const result = await verifyPaddleSignature({
      rawBody: BODY,
      header,
      secret: SECRET,
      nowSeconds: ts + 30,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("expired");
  });

  it("rejects a missing header", async () => {
    const result = await verifyPaddleSignature({
      rawBody: BODY,
      header: "",
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("missing");
  });
});
