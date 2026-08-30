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
  disconnectAccount,
  loadIntegrationToken,
  saveIntegrationToken,
  saveLastExpiry,
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
});
