import { beforeEach, describe, expect, it, vi } from "vitest";

const local = new Map<string, unknown>();
const sync = new Map<string, unknown>();

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: async (key: string) => ({ [key]: local.get(key) }),
      set: async (obj: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(obj)) local.set(k, v);
      },
      remove: async (keys: string[]) => {
        for (const k of keys) local.delete(k);
      },
    },
    sync: {
      get: async (key: string) => ({ [key]: sync.get(key) }),
      set: async (obj: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(obj)) sync.set(k, v);
      },
    },
  },
});

const {
  ACCOUNT_KEY,
  EXPIRY_KEY,
  TOKEN_KEY,
  PAIRING_KEY,
  disconnectAccount,
  loadDisclosureAccepted,
  loadIntegrationToken,
  loadPendingPairing,
  saveDisclosureAccepted,
  saveIntegrationToken,
  saveLastExpiry,
  savePendingPairing,
  saveSettings,
} = await import("../../extension/src/storage");

describe("extension token storage", () => {
  beforeEach(() => {
    local.clear();
    sync.clear();
  });

  it("stores the token only in chrome.storage.local", async () => {
    await saveIntegrationToken("dropimg_it_abcdefghijklmnopqr_stu");
    await saveLastExpiry(86400);
    await saveSettings({ lastMode: "region" });
    expect(await loadIntegrationToken()).toBe("dropimg_it_abcdefghijklmnopqr_stu");
    expect(local.has(TOKEN_KEY)).toBe(true);
    expect(local.has(EXPIRY_KEY)).toBe(true);
    expect(sync.has(TOKEN_KEY)).toBe(false);
    expect(sync.has(ACCOUNT_KEY)).toBe(false);
    expect(sync.has("settings")).toBe(true);
    await disconnectAccount();
    expect(await loadIntegrationToken()).toBeNull();
    expect(local.has(TOKEN_KEY)).toBe(false);
    expect(sync.has("settings")).toBe(true);
  });

  it("resumes a pending pairing and forgets it on disconnect", async () => {
    await savePendingPairing({
      pairingId: "11111111-2222-4333-8444-555555555555",
      deviceSecret: "secret",
      verificationUrl: "https://dropimg.io/connect/browser/11111111-2222-4333-8444-555555555555",
      expiresAt: Math.floor(Date.now() / 1000) + 120,
    });
    const pending = await loadPendingPairing();
    expect(pending?.pairingId).toContain("11111111");
    expect(sync.has(PAIRING_KEY)).toBe(false);
    await saveIntegrationToken("dropimg_it_abcdefghijklmnopqr_stu");
    await disconnectAccount();
    expect(await loadIntegrationToken()).toBeNull();
    expect(await loadPendingPairing()).toBeNull();
  });

  it("keeps the capture disclosure on the device only", async () => {
    expect(await loadDisclosureAccepted()).toBe(false);
    await saveDisclosureAccepted();
    expect(await loadDisclosureAccepted()).toBe(true);
    expect(sync.has("captureDisclosureAccepted")).toBe(false);
  });
});
