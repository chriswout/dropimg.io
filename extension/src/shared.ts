/** Shared types + helpers for the dropimg Chrome extension. */

export const API_ORIGIN = "https://dropimg.io";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Chrome limits captureVisibleTab to 2/sec — stay comfortably under. */
export const CAPTURE_GAP_MS = 650;

export type CaptureMode = "visible" | "region";

export type CaptureOk = {
  ok: true;
  url: string;
  expiresAt: number;
  slug: string;
  deleteToken: string;
};

export type CaptureErr = {
  ok: false;
  error: string;
  code?: string;
};

export type CaptureResult = CaptureOk | CaptureErr;

export type UploadResponse = {
  slug: string;
  url: string;
  expiresAt: number;
  deleteToken: string;
};

export type UploadErrorBody = {
  error?: string;
  code?: string;
};

export type RecentItem = {
  slug: string;
  url: string;
  expiresAt: number;
  deleteToken: string;
  createdAt: number;
};

export type ExtSettings = {
  lastMode: CaptureMode;
};

export const DEFAULT_SETTINGS: ExtSettings = {
  lastMode: "visible",
};

export type ExtMessage =
  | { type: "CAPTURE_AND_UPLOAD"; mode: CaptureMode }
  | { type: "OFFSCREEN_WRITE_CLIPBOARD"; text: string }
  | { type: "REGION_RESULT"; ok: true; rect: RegionRect }
  | { type: "REGION_RESULT"; ok: false; code: "region_cancelled" }
  | { type: "FULLPAGE_PROGRESS"; phase: string };

export type RegionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  dpr: number;
};

export function msg(key: string, substitutions?: string | string[]): string {
  try {
    const text = chrome.i18n.getMessage(key, substitutions);
    if (text) return text;
  } catch {
    // fall through
  }
  return key;
}

export function mapError(code: string | undefined, fallback = ""): string {
  if (code) {
    const localized = msg(`err_${code}`);
    if (localized && localized !== `err_${code}`) return localized;
  }
  if (fallback) return fallback;
  return msg("err_server_error");
}

/** data:image/…;base64,… → ArrayBuffer */
export function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("invalid_image");
  const b64 = dataUrl.slice(comma + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function isRestrictedUrl(url: string): boolean {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("https://chrome.google.com/webstore") ||
    url.startsWith("https://chromewebstore.google.com") ||
    url.startsWith("https://microsoftedge.microsoft.com/addons")
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
