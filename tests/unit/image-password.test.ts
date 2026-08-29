import { describe, expect, it } from "vitest";
import {
  hashImagePassword,
  pbkdf2HmacSha256,
  signUnlockCookie,
  unlockCookieHeader,
  unlockCookieValid,
  verifyImagePassword,
} from "../../src/lib/image-password";

describe("image password", () => {
  it("matches standard PBKDF2-HMAC-SHA256", async () => {
    const salt = new TextEncoder().encode("salt");
    const derived = await pbkdf2HmacSha256("password", salt, 4096, 32);
    expect(Buffer.from(derived).toString("hex")).toBe(
      "c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a",
    );
  });

  it("hashes and verifies with PBKDF2", async () => {
    const rec = await hashImagePassword("correct-horse");
    expect(rec.iterations).toBe(600_000);
    expect(rec.salt.byteLength).toBe(16);
    const stored = {
      hash: rec.hash.slice().buffer as ArrayBuffer,
      salt: rec.salt.slice().buffer as ArrayBuffer,
      iterations: rec.iterations,
    };
    expect(await verifyImagePassword("correct-horse", stored)).toBe(true);
    expect(await verifyImagePassword("wrong-password", stored)).toBe(false);
  });

  it("accepts a signed unlock cookie and rejects expiry", async () => {
    const cookie = await signUnlockCookie("abcd1234", "test-secret", 1_700_000_000);
    const header = unlockCookieHeader("abcd1234", cookie, { ENVIRONMENT: "development" });
    expect(
      await unlockCookieValid("abcd1234", header, "test-secret", 1_700_000_100),
    ).toBe(true);
    expect(
      await unlockCookieValid("abcd1234", header, "test-secret", 1_700_004_000),
    ).toBe(false);
    expect(
      await unlockCookieValid("otherxxx", header, "test-secret", 1_700_000_100),
    ).toBe(false);
  });
});
