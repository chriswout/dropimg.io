import {
  DEFAULT_SETTINGS,
  EXPIRY_7D,
  type AccountProfile,
  type ExtSettings,
  type PendingPairing,
  type RecentItem,
} from "./shared";

const SETTINGS_KEY = "settings";
const RECENT_KEY = "recent";
const TOKEN_KEY = "integrationToken";
const ACCOUNT_KEY = "accountProfile";
const EXPIRY_KEY = "lastExpirySeconds";
const DISCLOSURE_KEY = "captureDisclosureAccepted";
const PAIRING_KEY = "pendingPairing";
const MAX_RECENT = 10;

export async function loadSettings(): Promise<ExtSettings> {
  const data = await chrome.storage.sync.get(SETTINGS_KEY);
  const raw = (data[SETTINGS_KEY] || {}) as Partial<ExtSettings>;
  return {
    lastMode:
      raw.lastMode === "region" || raw.lastMode === "fullpage"
        ? raw.lastMode
        : "visible",
  };
}

export async function saveSettings(
  partial: Partial<ExtSettings>,
): Promise<ExtSettings> {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function loadRecent(): Promise<RecentItem[]> {
  const data = await chrome.storage.local.get(RECENT_KEY);
  const list = (data[RECENT_KEY] || []) as RecentItem[];
  const now = Math.floor(Date.now() / 1000);
  const live = list.filter((i) => i.expiresAt > now).slice(0, MAX_RECENT);
  if (live.length !== list.length) {
    await chrome.storage.local.set({ [RECENT_KEY]: live });
  }
  return live;
}

export async function pushRecent(item: RecentItem): Promise<RecentItem[]> {
  const now = Math.floor(Date.now() / 1000);
  const prev = (await loadRecent()).filter((i) => i.slug !== item.slug);
  const next = [item, ...prev]
    .filter((i) => i.expiresAt > now)
    .slice(0, MAX_RECENT);
  await chrome.storage.local.set({ [RECENT_KEY]: next });
  return next;
}

export async function removeRecent(slug: string): Promise<RecentItem[]> {
  const next = (await loadRecent()).filter((i) => i.slug !== slug);
  await chrome.storage.local.set({ [RECENT_KEY]: next });
  return next;
}

export async function loadIntegrationToken(): Promise<string | null> {
  const data = await chrome.storage.local.get(TOKEN_KEY);
  const token = data[TOKEN_KEY];
  return typeof token === "string" && token ? token : null;
}

export async function saveIntegrationToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function loadAccountProfile(): Promise<AccountProfile | null> {
  const data = await chrome.storage.local.get(ACCOUNT_KEY);
  const raw = data[ACCOUNT_KEY] as AccountProfile | undefined;
  if (!raw || typeof raw.emailMasked !== "string") return null;
  return raw;
}

export async function saveAccountProfile(profile: AccountProfile): Promise<void> {
  await chrome.storage.local.set({ [ACCOUNT_KEY]: profile });
}

export async function loadLastExpiry(): Promise<number> {
  const data = await chrome.storage.local.get(EXPIRY_KEY);
  const value = Number(data[EXPIRY_KEY]);
  return Number.isFinite(value) && value > 0 ? value : EXPIRY_7D;
}

export async function saveLastExpiry(seconds: number): Promise<void> {
  await chrome.storage.local.set({ [EXPIRY_KEY]: seconds });
}

export async function disconnectAccount(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, ACCOUNT_KEY, EXPIRY_KEY, PAIRING_KEY]);
}

export async function loadPendingPairing(): Promise<PendingPairing | null> {
  const data = await chrome.storage.local.get(PAIRING_KEY);
  const raw = data[PAIRING_KEY] as PendingPairing | undefined;
  if (!raw?.pairingId || !raw.deviceSecret || !raw.verificationUrl) return null;
  if (!raw.expiresAt || raw.expiresAt * 1000 <= Date.now()) {
    await clearPendingPairing();
    return null;
  }
  return raw;
}

export async function savePendingPairing(pairing: PendingPairing): Promise<void> {
  await chrome.storage.local.set({ [PAIRING_KEY]: pairing });
}

export async function clearPendingPairing(): Promise<void> {
  await chrome.storage.local.remove(PAIRING_KEY);
}

export async function loadDisclosureAccepted(): Promise<boolean> {
  const data = await chrome.storage.local.get(DISCLOSURE_KEY);
  return data[DISCLOSURE_KEY] === true;
}

export async function saveDisclosureAccepted(): Promise<void> {
  await chrome.storage.local.set({ [DISCLOSURE_KEY]: true });
}

export {
  DEFAULT_SETTINGS,
  MAX_RECENT,
  TOKEN_KEY,
  ACCOUNT_KEY,
  EXPIRY_KEY,
  DISCLOSURE_KEY,
  PAIRING_KEY,
};
