import { describe, expect, it } from "vitest";
import {
  EXPIRY_1H,
  EXPIRY_24H,
  EXPIRY_30D,
  EXPIRY_7D,
  EXPIRY_90D,
  FREE_MAX_UPLOAD_BYTES,
  MAX_LIFETIME_SECONDS,
  PRO_MAX_UPLOAD_BYTES,
  isProSubscription,
  parseExpiryHeader,
  r2ClassFor,
  resolveEntitlements,
  uploadIntentAllowed,
} from "../../src/lib/entitlements";
import { maskEmail, normalizeEmail } from "../../src/lib/auth/magic-link";
import { localeFromAcceptLanguage } from "../../src/lib/auth/locale-cookie";

const now = 1_700_000_000;
const longTtl = { longTtl: true, pro50mb: true };

const proSub = {
  status: "active",
  current_period_end: now + 86400,
  cancel_at_period_end: 0,
};

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

  it("Pro with flags gets 50 MB and the full 1h-90d ladder", () => {
    const e = resolveEntitlements({
      userId: "u1",
      now,
      flags: longTtl,
      subscription: proSub,
    });
    expect(e.maxUploadBytes).toBe(PRO_MAX_UPLOAD_BYTES);
    expect(e.allowedExpirySeconds).toEqual([
      EXPIRY_1H,
      EXPIRY_24H,
      EXPIRY_7D,
      EXPIRY_30D,
      EXPIRY_90D,
    ]);
    expect(e.defaultExpirySeconds).toBe(EXPIRY_7D);
  });

  it("anonymous and Free share 1h/24h/7d with a 7-day default", () => {
    for (const userId of [null, "u1"]) {
      const e = resolveEntitlements({
        userId,
        subscription: null,
        now,
        flags: longTtl,
      });
      expect(e.allowedExpirySeconds).toEqual([
        EXPIRY_1H,
        EXPIRY_24H,
        EXPIRY_7D,
      ]);
      expect(e.defaultExpirySeconds).toBe(EXPIRY_7D);
      expect(e.allowedExpirySeconds).not.toContain(EXPIRY_30D);
      expect(e.allowedExpirySeconds).not.toContain(EXPIRY_90D);
    }
  });

  it("the 90-day ceiling is the longest lifetime any plan can pick", () => {
    const pro = resolveEntitlements({
      userId: "u1",
      now,
      flags: longTtl,
      subscription: proSub,
    });
    expect(Math.max(...pro.allowedExpirySeconds)).toBe(MAX_LIFETIME_SECONDS);
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

  it("still rejects Pro-only lifetimes once Free can reach 7 days", () => {
    const free = resolveEntitlements({
      userId: "u1",
      subscription: null,
      now,
      flags: longTtl,
    });
    const intent = (expiry_seconds: number) => ({
      expiry_seconds,
      max_bytes: FREE_MAX_UPLOAD_BYTES,
      hasPassword: false,
    });
    expect(uploadIntentAllowed(intent(EXPIRY_7D), free)).toBe(true);
    expect(uploadIntentAllowed(intent(EXPIRY_30D), free)).toBe(false);
    expect(uploadIntentAllowed(intent(EXPIRY_90D), free)).toBe(false);
  });
});

describe("r2ClassFor", () => {
  it("keeps short Free lifetimes on o/24h and 7-day ones on o/7d", () => {
    expect(r2ClassFor("anonymous", EXPIRY_1H)).toBe("24h");
    expect(r2ClassFor("anonymous", EXPIRY_24H)).toBe("24h");
    expect(r2ClassFor("anonymous", EXPIRY_7D)).toBe("7d");
    expect(r2ClassFor("free", EXPIRY_7D)).toBe("7d");
  });

  it("parks every Pro upload on o/pro so a later extend needs no copy", () => {
    for (const seconds of [EXPIRY_1H, EXPIRY_24H, EXPIRY_7D, EXPIRY_90D]) {
      expect(r2ClassFor("pro", seconds)).toBe("pro");
    }
  });
});

describe("parseExpiryHeader", () => {
  const anon = resolveEntitlements({ userId: null, now, flags: longTtl });

  it("falls back to the plan default when the header is absent", () => {
    expect(parseExpiryHeader(null, anon)).toEqual({
      ok: true,
      expirySeconds: EXPIRY_7D,
    });
    expect(parseExpiryHeader("  ", anon)).toEqual({
      ok: true,
      expirySeconds: EXPIRY_7D,
    });
  });

  it("accepts only the values the plan already allows", () => {
    expect(parseExpiryHeader(String(EXPIRY_1H), anon)).toEqual({
      ok: true,
      expirySeconds: EXPIRY_1H,
    });
    expect(parseExpiryHeader(String(EXPIRY_24H), anon)).toEqual({
      ok: true,
      expirySeconds: EXPIRY_24H,
    });
    for (const bad of ["1", "7200", "abc", "3600.5", "-3600", String(EXPIRY_90D)]) {
      expect(parseExpiryHeader(bad, anon)).toEqual({ ok: false });
    }
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
