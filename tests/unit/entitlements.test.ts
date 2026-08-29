import { describe, expect, it } from "vitest";
import {
  EXPIRY_24H,
  EXPIRY_30D,
  EXPIRY_7D,
  FREE_MAX_UPLOAD_BYTES,
  PRO_MAX_UPLOAD_BYTES,
  isProSubscription,
  resolveEntitlements,
  uploadIntentAllowed,
} from "../../src/lib/entitlements";
import { maskEmail, normalizeEmail } from "../../src/lib/auth/magic-link";
import { localeFromAcceptLanguage } from "../../src/lib/auth/locale-cookie";

const now = 1_700_000_000;

describe("resolveEntitlements", () => {
  it("anonymous: 10 MB, 24h, no password, no history", () => {
    const e = resolveEntitlements({ userId: null, now });
    expect(e.plan).toBe("anonymous");
    expect(e.maxUploadBytes).toBe(FREE_MAX_UPLOAD_BYTES);
    expect(e.allowedExpirySeconds).toEqual([EXPIRY_24H]);
    expect(e.passwordProtection).toBe(false);
    expect(e.historyLimit).toBe(0);
    expect(e.adFree).toBe(false);
  });

  it("signed-in Free: 10 cloud history", () => {
    const e = resolveEntitlements({ userId: "u1", subscription: null, now });
    expect(e.plan).toBe("free");
    expect(e.historyLimit).toBe(10);
    expect(e.passwordProtection).toBe(false);
  });

  it("active Pro without flags stays 10 MB / 24h but ad-free + passwords", () => {
    const e = resolveEntitlements({
      userId: "u1",
      now,
      subscription: {
        status: "active",
        current_period_end: now + 86400,
        cancel_at_period_end: 0,
      },
    });
    expect(e.plan).toBe("pro");
    expect(e.maxUploadBytes).toBe(FREE_MAX_UPLOAD_BYTES);
    expect(e.allowedExpirySeconds).toEqual([EXPIRY_24H]);
    expect(e.passwordProtection).toBe(true);
    expect(e.historyLimit).toBeNull();
    expect(e.adFree).toBe(true);
  });

  it("Pro with flags gets 50 MB and 7/30 day", () => {
    const e = resolveEntitlements({
      userId: "u1",
      now,
      flags: { longTtl: true, pro50mb: true },
      subscription: {
        status: "active",
        current_period_end: now + 86400,
        cancel_at_period_end: 0,
      },
    });
    expect(e.maxUploadBytes).toBe(PRO_MAX_UPLOAD_BYTES);
    expect(e.allowedExpirySeconds).toEqual([EXPIRY_24H, EXPIRY_7D, EXPIRY_30D]);
  });

  it("canceled-at-period-end remains Pro until current_period_end", () => {
    expect(
      isProSubscription(
        {
          status: "active",
          current_period_end: now + 100,
          cancel_at_period_end: 1,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isProSubscription(
        {
          status: "canceled",
          current_period_end: now + 100,
          cancel_at_period_end: 1,
        },
        now,
      ),
    ).toBe(true);
  });

  it("expired Pro is Free", () => {
    const e = resolveEntitlements({
      userId: "u1",
      now,
      flags: { longTtl: true, pro50mb: true },
      subscription: {
        status: "canceled",
        current_period_end: now - 1,
        cancel_at_period_end: 1,
      },
    });
    expect(e.plan).toBe("free");
    expect(e.maxUploadBytes).toBe(FREE_MAX_UPLOAD_BYTES);
    expect(e.passwordProtection).toBe(false);
  });
});

describe("uploadIntentAllowed", () => {
  it("rejects leftover Pro expiry, password, or 50MB after downgrade", () => {
    const free = resolveEntitlements({ userId: "u1", subscription: null, now });
    expect(
      uploadIntentAllowed(
        { expiry_seconds: EXPIRY_7D, max_bytes: FREE_MAX_UPLOAD_BYTES, hasPassword: false },
        free,
      ),
    ).toBe(false);
    expect(
      uploadIntentAllowed(
        { expiry_seconds: EXPIRY_24H, max_bytes: FREE_MAX_UPLOAD_BYTES, hasPassword: true },
        free,
      ),
    ).toBe(false);
    expect(
      uploadIntentAllowed(
        { expiry_seconds: EXPIRY_24H, max_bytes: PRO_MAX_UPLOAD_BYTES, hasPassword: false },
        free,
      ),
    ).toBe(false);
    expect(
      uploadIntentAllowed(
        { expiry_seconds: EXPIRY_24H, max_bytes: FREE_MAX_UPLOAD_BYTES, hasPassword: false },
        free,
      ),
    ).toBe(true);
  });
});

describe("email helpers", () => {
  it("normalizes and masks without leaking the local part", () => {
    expect(normalizeEmail("  Chris@Example.COM ")).toBe("chris@example.com");
    expect(maskEmail("chris@example.com")).toBe("c***@example.com");
  });
});

describe("locale cookie / accept-language", () => {
  it("maps browser tags without using them as auth", () => {
    expect(localeFromAcceptLanguage("pt-BR,pt;q=0.9")).toBe("pt-BR");
    expect(localeFromAcceptLanguage("de-DE")).toBe("de");
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });
});
