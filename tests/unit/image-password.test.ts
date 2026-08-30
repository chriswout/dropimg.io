import { scrypt as scryptCallback } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  hashImagePassword,
  PASSWORD_KDF,
  PASSWORD_KDF_PBKDF2,
  SCRYPT_N,
  SCRYPT_P,
  SCRYPT_R,
  scryptDerive,
  signUnlockCookie,
  unlockCookieHeader,
  unlockCookieValid,
  verifyImagePassword,
  type ImagePasswordRecord,
  type StoredImagePassword,
} from "../../src/lib/image-password";

function storedFrom(
  rec: ImagePasswordRecord,
  overrides: Partial<StoredImagePassword> = {},
): StoredImagePassword {
  return {
    hash: rec.hash.slice().buffer as ArrayBuffer,
    salt: rec.salt.slice().buffer as ArrayBuffer,
    kdf: rec.kdf,
    cost: rec.cost,
    blockSize: rec.blockSize,
    parallelization: rec.parallelization,
    ...overrides,
  };
}

function nodeScrypt(
  password: string,
  salt: Uint8Array,
  keyLen: number,
  opts: { N: number; r: number; p: number },
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, Buffer.from(salt), keyLen, { ...opts, maxmem: 32 * 1024 * 1024 }, (err, key) => {
      if (err) reject(err);
      else resolve(new Uint8Array(key));
    });
  });
}

describe("image password", () => {
  it("matches RFC 7914 scrypt vector and Node crypto", async () => {
    const salt = new TextEncoder().encode("NaCl");
    const derived = await scryptDerive("password", salt, {
      N: 1024,
      r: 8,
      p: 16,
      keyLen: 64,
    });
    expect(Buffer.from(derived).toString("hex")).toBe(
      "fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b3731622eaf30d92e22a3886ff109279d9830dac727afb94a83ee6d8360cbdfa2cc0640",
    );
    const fromNode = await nodeScrypt("password", salt, 64, { N: 1024, r: 8, p: 16 });
    expect(Buffer.from(derived).toString("hex")).toBe(Buffer.from(fromNode).toString("hex"));
  });

  it("hashes with scrypt-v1 and persists N/r/p", async () => {
    const rec = await hashImagePassword("correct-horse");
    expect(rec.kdf).toBe(PASSWORD_KDF);
    expect(rec.cost).toBe(SCRYPT_N);
    expect(rec.blockSize).toBe(SCRYPT_R);
    expect(rec.parallelization).toBe(SCRYPT_P);
    expect(rec.salt.byteLength).toBe(16);
    expect(rec.hash.byteLength).toBe(32);
    const independent = await nodeScrypt("correct-horse", rec.salt, 32, {
      N: rec.cost,
      r: rec.blockSize,
      p: rec.parallelization,
    });
    expect(Buffer.from(rec.hash).toString("hex")).toBe(Buffer.from(independent).toString("hex"));
  });

  it("uses a random salt so two hashes of the same password differ", async () => {
    const a = await hashImagePassword("same-password");
    const b = await hashImagePassword("same-password");
    expect(Buffer.from(a.salt).toString("hex")).not.toBe(Buffer.from(b.salt).toString("hex"));
    expect(Buffer.from(a.hash).toString("hex")).not.toBe(Buffer.from(b.hash).toString("hex"));
  });

  it("verifies the correct password and rejects the wrong one", async () => {
    const rec = await hashImagePassword("correct-horse");
    const stored = storedFrom(rec);
    expect(await verifyImagePassword("correct-horse", stored)).toBe(true);
    expect(await verifyImagePassword("wrong-password", stored)).toBe(false);
  });

  it("honors stored scrypt parameters instead of current defaults", async () => {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const hash = await scryptDerive("stored-params", salt, {
      N: 1024,
      r: 8,
      p: 1,
      keyLen: 32,
    });
    const stored: StoredImagePassword = {
      hash: hash.slice().buffer as ArrayBuffer,
      salt: salt.slice().buffer as ArrayBuffer,
      kdf: PASSWORD_KDF,
      cost: 1024,
      blockSize: 8,
      parallelization: 1,
    };
    expect(await verifyImagePassword("stored-params", stored)).toBe(true);
    expect(
      await verifyImagePassword("stored-params", { ...stored, cost: SCRYPT_N }),
    ).toBe(false);
  });

  it("fails closed for unknown KDFs and leftover pbkdf2-sha256 rows", async () => {
    const rec = await hashImagePassword("correct-horse");
    const base = storedFrom(rec);
    expect(await verifyImagePassword("correct-horse", { ...base, kdf: PASSWORD_KDF_PBKDF2 })).toBe(
      false,
    );
    expect(await verifyImagePassword("correct-horse", { ...base, kdf: "scrypt" })).toBe(false);
    expect(await verifyImagePassword("correct-horse", { ...base, kdf: "argon2id" })).toBe(false);
    expect(await verifyImagePassword("correct-horse", { ...base, kdf: null })).toBe(false);
    expect(
      await verifyImagePassword("correct-horse", {
        hash: base.hash,
        salt: base.salt,
      }),
    ).toBe(false);
  });

  it("fails closed when stored parameters are missing or invalid", async () => {
    const rec = await hashImagePassword("correct-horse");
    const base = storedFrom(rec);
    expect(await verifyImagePassword("correct-horse", { ...base, cost: null })).toBe(false);
    expect(await verifyImagePassword("correct-horse", { ...base, blockSize: null })).toBe(false);
    expect(await verifyImagePassword("correct-horse", { ...base, parallelization: null })).toBe(
      false,
    );
    expect(await verifyImagePassword("correct-horse", { ...base, cost: 16383 })).toBe(false);
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
