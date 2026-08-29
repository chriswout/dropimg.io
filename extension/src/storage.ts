import {
  DEFAULT_SETTINGS,
  type ExtSettings,
  type RecentItem,
} from "./shared";

const SETTINGS_KEY = "settings";
const RECENT_KEY = "recent";
const MAX_RECENT = 10;

export async function loadSettings(): Promise<ExtSettings> {
  const data = await chrome.storage.sync.get(SETTINGS_KEY);
  const raw = (data[SETTINGS_KEY] || {}) as Partial<ExtSettings>;
  return {
    lastMode: raw.lastMode === "region" ? "region" : "visible",
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

export { DEFAULT_SETTINGS, MAX_RECENT };
