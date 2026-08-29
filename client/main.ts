import "./styles.css";
import { matchBrowserLocale } from "../marketing/locales";
import { pagePath, pathToPageId, type PageId } from "../marketing/pages";
import { resolveLocale, t, type UiStrings } from "../marketing/ui";
import { shouldOfferLangSuggest } from "../src/lib/lang-suggest";
import { normalizePageIntent } from "../src/lib/page-intent";
import type { RecentDrop, UploadErrorResponse, UploadResponse } from "../src/types";
import {
  accountEntitlements,
  accountReady,
  accountUser,
  rememberLocaleChoice,
  setupAccountNav,
  setupLanguageLinks,
  setupThemeToggle,
} from "./chrome";

const MAX_BYTES = 10 * 1024 * 1024;
const RECENT_KEY = "dropimg:recent";
const LOCALE_KEY = "dropimg:locale";
const LOCALE_DISMISS_KEY = "dropimg:locale-suggest-dismissed";
const RECENT_LIMIT = 8;

const locale = resolveLocale(
  document.documentElement.dataset.locale || document.documentElement.lang,
);
const ui: UiStrings = t(locale);

const pageIntent =
  normalizePageIntent(document.documentElement.dataset.pageIntent) ||
  normalizePageIntent(pathToPageId(location.pathname) ?? "") ||
  "home";

type UiState = "idle" | "uploading" | "success" | "error";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing`);
  return node as T;
}

function trackEvent(
  event: string,
  extra: { page_intent?: string } = {},
): void {
  try {
    const body = JSON.stringify({
      event,
      page_intent: extra.page_intent ?? pageIntent,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/event", blob);
      return;
    }
    void fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // ignore
  }
}

function proExpiryValue(): number {
  const group = document.getElementById("pro-expiry");
  const raw = group?.getAttribute("data-value");
  return Number(raw) || 86400;
}

function visibleExpiryPills(group: HTMLElement): HTMLButtonElement[] {
  return [...group.querySelectorAll<HTMLButtonElement>(".expiry-pill")].filter((btn) => !btn.hidden && !btn.disabled);
}

function setProExpiry(seconds: number) {
  const group = document.getElementById("pro-expiry");
  if (!group) return;
  group.setAttribute("data-value", String(seconds));
  group.querySelectorAll<HTMLButtonElement>(".expiry-pill").forEach((btn) => {
    const on = Number(btn.getAttribute("data-expiry")) === seconds;
    btn.setAttribute("aria-checked", on ? "true" : "false");
    btn.tabIndex = on ? 0 : -1;
  });
  try {
    localStorage.setItem("dropimg:pro-expiry", String(seconds));
  } catch {
    // ignore
  }
}

function proPasswordOn(): boolean {
  return document.getElementById("pro-password-toggle")?.getAttribute("aria-checked") === "true";
}

function setProPasswordOn(on: boolean) {
  const toggle = document.getElementById("pro-password-toggle");
  const input = document.getElementById("pro-password") as HTMLInputElement | null;
  if (!toggle || !input) return;
  toggle.setAttribute("aria-checked", on ? "true" : "false");
  input.hidden = !on;
  if (on) {
    input.focus();
  } else {
    input.value = "";
  }
}

function proUploadOptions(): { expiry: number; password?: string } {
  const expiry = proExpiryValue();
  try {
    localStorage.setItem("dropimg:pro-expiry", String(expiry));
  } catch {
    // ignore
  }
  if (!proPasswordOn()) return { expiry };
  const passwordEl = document.getElementById("pro-password") as HTMLInputElement | null;
  const password = passwordEl?.value.trim() || "";
  return password ? { expiry, password } : { expiry };
}

function setupProOptions() {
  const bar = document.getElementById("pro-options");
  if (!bar || !accountEntitlements || accountEntitlements.plan !== "pro") return;
  bar.hidden = false;
  const expiryEl = document.getElementById("pro-expiry");
  if (expiryEl) {
    expiryEl.querySelectorAll<HTMLButtonElement>(".expiry-pill").forEach((btn) => {
      const value = Number(btn.getAttribute("data-expiry"));
      const allowed = accountEntitlements!.allowedExpirySeconds.includes(value);
      btn.hidden = !allowed;
      btn.disabled = !allowed;
      btn.tabIndex = -1;
      btn.addEventListener("click", () => {
        if (!allowed) return;
        setProExpiry(value);
      });
    });
    expiryEl.addEventListener("keydown", (event) => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      if (!keys.includes(event.key)) return;
      const pills = visibleExpiryPills(expiryEl);
      if (!pills.length) return;
      event.preventDefault();
      const current = pills.findIndex((btn) => btn.getAttribute("aria-checked") === "true");
      let index = current < 0 ? 0 : current;
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = pills.length - 1;
      else if (event.key === "ArrowRight" || event.key === "ArrowDown") index = (index + 1) % pills.length;
      else index = (index - 1 + pills.length) % pills.length;
      const next = Number(pills[index].getAttribute("data-expiry"));
      setProExpiry(next);
      pills[index].focus();
    });
    let next = 86400;
    try {
      const remembered = Number(localStorage.getItem("dropimg:pro-expiry"));
      if (accountEntitlements.allowedExpirySeconds.includes(remembered)) {
        next = remembered;
      }
    } catch {
      // ignore
    }
    setProExpiry(next);
  }
  const passwordWrap = document.getElementById("pro-password-wrap");
  const passwordToggle = document.getElementById("pro-password-toggle");
  if (passwordWrap) {
    passwordWrap.hidden = !accountEntitlements.passwordProtection;
  }
  if (passwordToggle && accountEntitlements.passwordProtection) {
    passwordToggle.addEventListener("click", () => {
      setProPasswordOn(!proPasswordOn());
    });
  }
}

function setupUploader() {
  const dropzone = el<HTMLElement>("dropzone");
  const fileInput = el<HTMLInputElement>("file-input");
  const preview = el<HTMLImageElement>("preview");
  const progressBar = el<HTMLElement>("progress-bar");
  const progressLabel = el<HTMLElement>("progress-label");
  const progressWrap = el<HTMLElement>("progress-wrap");
  const shareUrl = el<HTMLInputElement>("share-url");
  const successTitle = el<HTMLElement>("success-title");
  const expiresLabel = el<HTMLElement>("expires-label");
  const errorMessage = el<HTMLElement>("error-message");
  const btnOpen = el<HTMLAnchorElement>("btn-open");
  const recentSection = el<HTMLElement>("recent");
  const recentList = el<HTMLElement>("recent-list");
  const statusLive = el<HTMLElement>("status-live");
  const idleTitle = el<HTMLElement>("idle-title");
  const idleTitleHtml = idleTitle.innerHTML;

  let current: UploadResponse | null = null;
  let previewUrl: string | null = null;
  let dragDepth = 0;

function announce(message: string) {
  statusLive.textContent = "";
  requestAnimationFrame(() => {
    statusLive.textContent = message;
  });
}

function setState(state: UiState) {
  for (const id of ["state-idle", "state-uploading", "state-success", "state-error"]) {
    el(id).classList.toggle("hidden", id !== `state-${state}`);
  }
  dropzone.style.pointerEvents = state === "uploading" ? "none" : "";
  dropzone.classList.toggle("is-busy", state === "uploading");
  dropzone.classList.toggle("is-done", state === "success" || state === "error");
  dropzone.setAttribute("aria-busy", state === "uploading" ? "true" : "false");
}

function clearPreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  preview.removeAttribute("src");
}

function mapUploadError(body: UploadErrorResponse | null, status: number): string {
  if (body?.code && ui.errors[body.code]) return ui.errors[body.code]!;
  if (body?.error) return body.error;
  return `${ui.uploadFailed} (${status})`;
}

async function handleFile(file: File) {
  await accountReady;
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
    showError(ui.invalidFormat);
    return;
  }
  const limit = accountEntitlements?.maxUploadBytes ?? MAX_BYTES;
  if (file.size > limit) {
    showError(ui.tooLarge);
    return;
  }
  if (proPasswordOn()) {
    const password = (document.getElementById("pro-password") as HTMLInputElement | null)?.value.trim() || "";
    if (password.length < 8) {
      showError("Password must be at least 8 characters.");
      document.getElementById("pro-password")?.focus();
      return;
    }
  }

  clearPreview();
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  progressBar.style.width = "0%";
  progressLabel.textContent = "0%";
  progressWrap.setAttribute("aria-valuenow", "0");
  setState("uploading");
  announce(ui.uploading);

  try {
    const result = await uploadWithProgress(file, (pct) => {
      progressBar.style.width = `${pct}%`;
      progressLabel.textContent = `${pct}%`;
      progressWrap.setAttribute("aria-valuenow", String(pct));
    });
    current = result;
    saveRecent(result);
    const copied = await tryCopy(result.url);
    showSuccess(result, copied);
  } catch (err) {
    const msg = err instanceof Error ? err.message : ui.uploadFailed;
    showError(msg);
  }
}

async function createAccountUploadUrl(): Promise<string> {
  const res = await fetch("/api/account/upload-intent", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proUploadOptions()),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as UploadErrorResponse | null;
    throw new Error(mapUploadError(body, res.status));
  }
  const data = (await res.json()) as { uploadUrl?: string };
  if (!data.uploadUrl) throw new Error(ui.uploadFailed);
  return data.uploadUrl;
}

function uploadWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<UploadResponse> {
  return (async () => {
    const url = accountUser
      ? await createAccountUploadUrl()
      : "/api/upload";
    return new Promise<UploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.setRequestHeader("X-Dropimg-Client", "web");
      if (pageIntent) {
        xhr.setRequestHeader("X-Dropimg-Page-Intent", pageIntent);
      }
      xhr.responseType = "json";
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        onProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response as UploadResponse);
          return;
        }
        const body = xhr.response as UploadErrorResponse | null;
        reject(new Error(mapUploadError(body, xhr.status)));
      };

      xhr.onerror = () => reject(new Error(ui.networkError));
      xhr.onabort = () => reject(new Error(ui.uploadAborted));

      file.arrayBuffer().then((buf) => xhr.send(buf), reject);
    });
  })();
}

async function tryCopy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function showSuccess(result: UploadResponse, copied: boolean) {
  const title = copied ? ui.uploadedCopied : ui.uploaded;
  successTitle.textContent = title;
  shareUrl.value = result.url;
  btnOpen.href = result.url;
  expiresLabel.textContent = `${ui.expiresPrefix} ${formatExpiry(result.expiresAt)}`;
  setState("success");
  announce(title);
  if (!copied) {
    shareUrl.focus();
    shareUrl.select();
  }
  renderRecent();
}

function showError(message: string) {
  errorMessage.textContent = message;
  setState("error");
  announce(`${ui.uploadFailed}. ${message}`);
}

function formatExpiry(expiresAt: number): string {
  const ms = expiresAt * 1000 - Date.now();
  if (ms <= 0) return ui.expiresSoon;
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 23) return ui.expiresAbout24h;
  if (hours > 0) return ui.expiresInHours(hours, mins);
  return ui.expiresInMins(mins);
}

function loadRecent(): RecentDrop[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentDrop[];
    const now = Date.now() / 1000;
    return parsed.filter((d) => d.expiresAt > now).slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function saveRecent(result: UploadResponse) {
  const next: RecentDrop = {
    slug: result.slug,
    url: result.url,
    deleteToken: result.deleteToken,
    expiresAt: result.expiresAt,
    mime: result.mime,
    size: result.size,
  };
  const list = [next, ...loadRecent().filter((d) => d.slug !== next.slug)].slice(
    0,
    RECENT_LIMIT,
  );
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

function removeRecent(slug: string) {
  const list = loadRecent().filter((d) => d.slug !== slug);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  renderRecent();
}

function renderRecent() {
  const list = loadRecent();
  recentList.innerHTML = "";
  if (list.length === 0) {
    recentSection.hidden = true;
    return;
  }
  recentSection.hidden = false;
  for (const item of list) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = item.url.replace(/^https?:\/\//, "");
    a.addEventListener("click", () => trackEvent("recent_link_open"));
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = ui.delete;
    del.addEventListener("click", async () => {
      trackEvent("recent_delete");
      try {
        const res = await fetch(`/api/i/${item.slug}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${item.deleteToken}` },
        });
        if (!res.ok && res.status !== 404) {
          throw new Error("Delete failed");
        }
      } catch {
        // Still remove locally if already gone
      }
      removeRecent(item.slug);
      if (current?.slug === item.slug) resetToIdle();
    });
    li.appendChild(a);
    li.appendChild(del);
    recentList.appendChild(li);
  }
}

function resetToIdle() {
  current = null;
  clearPreview();
  idleTitle.innerHTML = idleTitleHtml;
  setState("idle");
}

function setDragging(active: boolean) {
  dropzone.classList.toggle("dragover", active);
  if (active) {
    idleTitle.textContent = ui.dropItHere;
  } else {
    idleTitle.innerHTML = idleTitleHtml;
  }
}

function pickImageFromClipboard(e: ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  const files = e.clipboardData?.files;
  if (files && files.length > 0 && files[0]!.type.startsWith("image/")) {
    return files[0]!;
  }
  return null;
}

// --- Events ---

function openFilePicker() {
  if (!el("state-idle").classList.contains("hidden")) fileInput.click();
}

dropzone.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("button, a, input")) return;
  openFilePicker();
});

dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openFilePicker();
  }
});

el("btn-choose").addEventListener("click", (e) => {
  e.stopPropagation();
  openFilePicker();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (file) void handleFile(file);
});

document.addEventListener("paste", (e) => {
  const file = pickImageFromClipboard(e);
  if (!file) return;
  e.preventDefault();
  void handleFile(file);
});

window.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragDepth++;
  setDragging(true);
});

window.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) setDragging(false);
});

window.addEventListener("dragover", (e) => {
  e.preventDefault();
});

window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  setDragging(false);
  const file = e.dataTransfer?.files?.[0];
  if (file) void handleFile(file);
});

el("btn-copy").addEventListener("click", async () => {
  if (!current) return;
  const btn = el<HTMLButtonElement>("btn-copy");
  const ok = await tryCopy(current.url);
  const title = ok ? ui.uploadedCopied : ui.uploaded;
  successTitle.textContent = title;
  announce(title);
  if (ok) {
    const prev = btn.textContent;
    btn.textContent = ui.copied;
    window.setTimeout(() => {
      btn.textContent = prev || ui.copy;
    }, 1600);
  } else {
    shareUrl.focus();
    shareUrl.select();
  }
});

el("btn-another").addEventListener("click", () => resetToIdle());
el("btn-retry").addEventListener("click", () => resetToIdle());

el("btn-delete").addEventListener("click", async () => {
  if (!current) return;
  const slug = current.slug;
  const token = current.deleteToken;
  try {
    const res = await fetch(`/api/i/${slug}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) {
      showError(ui.couldNotDelete);
      return;
    }
  } catch {
    showError(ui.couldNotDelete);
    return;
  }
  removeRecent(slug);
  announce(ui.imageDeleted);
  resetToIdle();
});

shareUrl.addEventListener("focus", () => shareUrl.select());

  renderRecent();

  if (pageIntent === "home") {
    trackEvent("home_view");
  } else {
    trackEvent("landing_view");
  }
}

function setupLangSuggest() {
  const banner = document.getElementById("lang-suggest");
  const dataEl = document.getElementById("lang-suggest-data");
  if (!banner || !dataEl) return;
  banner.hidden = true;

  const ua = navigator.userAgent;
  if (/bot|crawl|spider|slurp|facebookexternalhit/i.test(ua)) return;

  let preferred: string | null = null;
  try {
    preferred = localStorage.getItem(LOCALE_KEY);
  } catch {
    preferred = null;
  }

  let dismissed: string | null = null;
  try {
    dismissed = localStorage.getItem(LOCALE_DISMISS_KEY);
  } catch {
    dismissed = null;
  }

  const tags = navigator.languages?.length
    ? [...navigator.languages]
    : [navigator.language];
  let match: ReturnType<typeof matchBrowserLocale> = null;
  for (const tag of tags) {
    match = matchBrowserLocale(tag);
    if (match && match !== "en") break;
    match = null;
  }

  if (
    !shouldOfferLangSuggest({
      pageLocale: locale,
      storedLocale: preferred,
      dismissed: dismissed === "1",
      browserMatch: match,
    })
  ) {
    return;
  }

  let messages: Record<string, string> = {};
  try {
    messages = JSON.parse(dataEl.textContent || "{}") as Record<string, string>;
  } catch {
    return;
  }
  if (!match) return;
  const msg = messages[match];
  if (!msg) return;

  const pageId: PageId = pathToPageId(location.pathname) ?? "home";
  const target = pagePath(pageId, match);

  const msgEl = document.getElementById("lang-suggest-msg");
  const switchEl = document.getElementById("lang-suggest-switch") as HTMLAnchorElement | null;
  const dismissEl = document.getElementById("lang-suggest-dismiss");
  if (!msgEl || !switchEl || !dismissEl) return;

  msgEl.textContent = msg;
  switchEl.href = target;
  switchEl.addEventListener("click", () => {
    rememberLocaleChoice(match);
    try {
      localStorage.setItem(LOCALE_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  });
  dismissEl.addEventListener("click", () => {
    try {
      localStorage.setItem(LOCALE_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    banner.hidden = true;
  });
  banner.hidden = false;
}

setupAccountNav();
setupThemeToggle();
setupLanguageLinks();
setupLangSuggest();
if (document.getElementById("dropzone")) {
  setupUploader();
  void accountReady.then(() => setupProOptions());
}
