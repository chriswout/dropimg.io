/// <reference types="chrome" />
import {
  uploadAnonymous,
  uploadWithIntegrationToken,
} from "./account-upload";
import { pushRecent, loadIntegrationToken, loadAccountProfile, loadLastExpiry } from "./storage";
import {
  CAPTURE_GAP_MS,
  chooseExpirySeconds,
  dataUrlToArrayBuffer,
  formatBytes,
  isRestrictedUrl,
  mapError,
  MAX_UPLOAD_BYTES,
  msg,
  sleep,
  type CaptureMode,
  type CaptureResult,
  type RegionRect,
} from "./shared";

const OFFSCREEN_PATH = "offscreen.html";
const REGION_FILE = "region-overlay.js";
const TOAST_FILE = "toast-inject.js";
const TOAST_MS = 7000;

let regionWaiter:
  | {
      resolve: (
        v: { ok: true; rect: RegionRect } | { ok: false; code: string },
      ) => void;
    }
  | null = null;

let lastCaptureAt = 0;

function dropimgClient(): "chrome-extension" | "edge-extension" {
  return /Edg\//.test(navigator.userAgent)
    ? "edge-extension"
    : "chrome-extension";
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REGION_RESULT") {
    if (regionWaiter) {
      regionWaiter.resolve(
        message.ok
          ? { ok: true, rect: message.rect as RegionRect }
          : { ok: false, code: message.code || "region_cancelled" },
      );
      regionWaiter = null;
    }
    return;
  }

  if (message?.type === "CAPTURE_AND_UPLOAD") {
    const mode = (message.mode || "visible") as CaptureMode;
    void (async () => {
      const tab = await activeTab();
      const result = await captureAndUpload(mode);
      // Region closes the popup — clipboard + page toast (no double UI with popup).
      if (mode === "region") {
        await finishWithoutPopup(result, tab?.id);
      }
      try {
        sendResponse(result);
      } catch {
        // Popup may already be closed (region flow).
      }
    })();
    return true;
  }
});

async function finishWithoutPopup(
  result: CaptureResult,
  tabId?: number,
): Promise<void> {
  if (result.ok) {
    await pushRecent({
      slug: result.slug,
      url: result.url,
      expiresAt: result.expiresAt,
      deleteToken: result.deleteToken,
      createdAt: Math.floor(Date.now() / 1000),
    });
    const copied = await writeClipboard(result.url);
    const toasted = tabId ? await showPageToast(tabId, result.url) : false;
    if (!toasted) {
      await notify(
        msg("notifyOkTitle"),
        copied ? msg("notifyOkMessage") : result.url,
      );
    }
    try {
      await chrome.action.openPopup();
    } catch {
      // optional
    }
  } else {
    await notify(msg("notifyFailTitle"), result.error);
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== "silent-capture") return;
  void runSilentCapture();
});

async function runSilentCapture() {
  const tab = await activeTab();
  const result = await captureAndUpload("visible");
  if (result.ok) {
    await pushRecent({
      slug: result.slug,
      url: result.url,
      expiresAt: result.expiresAt,
      deleteToken: result.deleteToken,
      createdAt: Math.floor(Date.now() / 1000),
    });
    const copied = await writeClipboard(result.url);
    const toasted = tab?.id ? await showPageToast(tab.id, result.url) : false;
    if (!toasted) {
      await notify(
        msg("notifyOkTitle"),
        copied ? msg("notifyOkMessage") : result.url,
      );
    }
  } else {
    await notify(msg("notifyFailTitle"), result.error);
  }
}

async function captureAndUpload(mode: CaptureMode): Promise<CaptureResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, error: mapError("offline"), code: "offline" };
  }

  const tab = await activeTab();
  if (!tab?.id || tab.windowId == null) {
    return { ok: false, error: mapError("no_tab"), code: "no_tab" };
  }
  if (isRestrictedUrl(tab.url || "")) {
    return {
      ok: false,
      error: mapError("restricted_page"),
      code: "restricted_page",
    };
  }

  try {
    const dataUrl =
      mode === "region"
        ? await captureRegion(tab)
        : await captureVisible(tab.windowId);
    return await uploadDataUrl(dataUrl);
  } catch (err) {
    const code =
      err instanceof Error && err.message ? err.message : "server_error";
    return { ok: false, error: mapError(code), code };
  }
}

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  } catch {
    return undefined;
  }
}

async function assertSameTab(tabId: number): Promise<void> {
  const cur = await activeTab();
  if (!cur?.id || cur.id !== tabId) {
    throw new Error("tab_changed");
  }
}

async function captureVisible(windowId: number): Promise<string> {
  await throttleCapture();
  try {
    return await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  } catch {
    throw new Error("restricted_page");
  }
}

async function throttleCapture(): Promise<void> {
  const elapsed = Date.now() - lastCaptureAt;
  if (elapsed < CAPTURE_GAP_MS) {
    await sleep(CAPTURE_GAP_MS - elapsed);
  }
  lastCaptureAt = Date.now();
}

async function injectFile(tabId: number, file: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [file],
  });
}

async function captureRegion(tab: chrome.tabs.Tab): Promise<string> {
  if (!tab.id || tab.windowId == null) throw new Error("no_tab");

  const resultPromise = new Promise<
    { ok: true; rect: RegionRect } | { ok: false; code: string }
  >((resolve) => {
    regionWaiter = { resolve };
  });

  try {
    await injectFile(tab.id, REGION_FILE);
  } catch {
    regionWaiter = null;
    throw new Error("restricted_page");
  }

  const selection = await Promise.race([
    resultPromise,
    sleep(120_000).then(
      () => ({ ok: false, code: "region_cancelled" }) as const,
    ),
  ]);

  if (!selection.ok) throw new Error(selection.code || "region_cancelled");

  await assertSameTab(tab.id);
  await sleep(80);
  const full = await captureVisible(tab.windowId);
  return cropDataUrl(full, selection.rect);
}

async function dataUrlToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const buf = dataUrlToArrayBuffer(dataUrl);
  const blob = new Blob([buf], { type: "image/png" });
  return createImageBitmap(blob);
}

async function cropDataUrl(
  dataUrl: string,
  rect: RegionRect,
): Promise<string> {
  const bmp = await dataUrlToBitmap(dataUrl);
  try {
    const sx = Math.max(0, Math.floor(rect.x * rect.dpr));
    const sy = Math.max(0, Math.floor(rect.y * rect.dpr));
    const sw = Math.min(bmp.width - sx, Math.floor(rect.width * rect.dpr));
    const sh = Math.min(bmp.height - sy, Math.floor(rect.height * rect.dpr));
    if (sw < 2 || sh < 2) throw new Error("region_cancelled");

    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("invalid_image");
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return blobToDataUrl(blob);
  } finally {
    bmp.close();
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("invalid_image"));
    reader.readAsDataURL(blob);
  });
}

async function uploadDataUrl(dataUrl: string): Promise<CaptureResult> {
  let body: ArrayBuffer;
  try {
    body = dataUrlToArrayBuffer(dataUrl);
  } catch {
    return {
      ok: false,
      error: mapError("invalid_image"),
      code: "invalid_image",
    };
  }

  const token = await loadIntegrationToken();
  const profile = token ? await loadAccountProfile() : null;

  /**
   * Checked here so the message can name the caller's own limit, which Pro
   * raises. The server enforces it too; this only avoids spending the upload
   * to be told a number we already knew.
   */
  const limit = profile?.maxUploadBytes || MAX_UPLOAD_BYTES;
  if (body.byteLength > limit) {
    return {
      ok: false,
      error: mapError("too_large_max", "", formatBytes(limit)),
      code: "too_large",
    };
  }

  if (token) {
    const preferred = await loadLastExpiry();
    const expirySeconds = chooseExpirySeconds(
      profile?.allowedExpirySeconds,
      preferred,
      profile?.defaultExpirySeconds,
    );
    return uploadWithIntegrationToken({
      token,
      bytes: body,
      expirySeconds,
      client: dropimgClient(),
    });
  }

  return uploadAnonymous(body, dropimgClient());
}

async function showPageToast(tabId: number, url: string): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [TOAST_FILE],
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [
        url,
        {
          title: msg("notifyOkTitle"),
          copy: msg("copy"),
          open: msg("open"),
          copied: msg("linkCopied"),
        },
        TOAST_MS,
      ],
      func: (
        shareUrl: string,
        labels: {
          title: string;
          copy: string;
          open: string;
          copied: string;
        },
        durationMs: number,
      ) => {
        const show = (
          window as unknown as {
            __dropimgToast?: (
              u: string,
              l: typeof labels,
              ms: number,
            ) => void;
          }
        ).__dropimgToast;
        show?.(shareUrl, labels, durationMs);
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "Write share URL to clipboard after silent capture",
  });
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await ensureOffscreen();
    const res = await chrome.runtime.sendMessage({
      type: "OFFSCREEN_WRITE_CLIPBOARD",
      text,
    });
    return Boolean(res?.ok);
  } catch {
    return false;
  }
}

async function notify(title: string, message: string): Promise<void> {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title,
      message,
    });
  } catch {
    // notifications may be blocked
  }
}
