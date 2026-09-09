import { describe, expect, it } from "vitest";
import { defaultExpiryForDrop, parseExpiryInput } from "../../src/lib/create-drop";
import {
  EXPIRY_24H,
  EXPIRY_7D,
  EXPIRY_90D,
  EXPIRY_180D,
  resolveEntitlements,
} from "../../src/lib/entitlements";

describe("defaultExpiryForDrop", () => {
  const free = resolveEntitlements({
    userId: "u1",
    flags: { longTtl: true, pro50mb: false },
  });
  const pro = resolveEntitlements({
    userId: "u1",
    subscription: {
      status: "active",
      current_period_end: Math.floor(Date.now() / 1000) + 86_400,
      cancel_at_period_end: 0,
    },
    flags: { longTtl: true, pro50mb: false },
  });

  it("defaults Free API/MCP to 24h", () => {
    expect(defaultExpiryForDrop("api", free)).toBe(EXPIRY_24H);
    expect(defaultExpiryForDrop("mcp", free)).toBe(EXPIRY_24H);
    expect(defaultExpiryForDrop("web", free)).toBe(EXPIRY_7D);
  });

  it("keeps the Pro plan default for API/MCP", () => {
    expect(defaultExpiryForDrop("api", pro)).toBe(EXPIRY_7D);
    expect(defaultExpiryForDrop("web", pro)).toBe(EXPIRY_7D);
  });
});

describe("parseExpiryInput", () => {
  it("accepts labels and seconds", () => {
    expect(parseExpiryInput("7d", EXPIRY_24H)).toBe(EXPIRY_7D);
    expect(parseExpiryInput("24h", EXPIRY_7D)).toBe(EXPIRY_24H);
    expect(parseExpiryInput("90days", EXPIRY_7D)).toBe(EXPIRY_90D);
    expect(parseExpiryInput("180d", EXPIRY_7D)).toBe(EXPIRY_180D);
    expect(parseExpiryInput(String(EXPIRY_7D), EXPIRY_24H)).toBe(EXPIRY_7D);
    expect(parseExpiryInput(EXPIRY_7D, EXPIRY_24H)).toBe(EXPIRY_7D);
  });

  it("falls back when empty and rejects junk", () => {
    expect(parseExpiryInput("", EXPIRY_7D)).toBe(EXPIRY_7D);
    expect(parseExpiryInput(null, EXPIRY_7D)).toBe(EXPIRY_7D);
    expect(parseExpiryInput("nope", EXPIRY_7D)).toBeNull();
    expect(parseExpiryInput(1.5, EXPIRY_7D)).toBeNull();
  });
});
