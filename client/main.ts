import "./styles.css";
import { matchBrowserLocale } from "../marketing/locales";
import { pagePath, pathToPageId, type PageId } from "../marketing/pages";
import { resolveLocale, t, type UiStrings } from "../marketing/ui";
import { expiryCountdown } from "../src/lib/expiry-format";
import { shouldOfferLangSuggest } from "../src/lib/lang-suggest";
import { normalizePageIntent } from "../src/lib/page-intent";
import type { RecentDrop, UploadErrorResponse, UploadResponse } from "../src/types";
import {
  accountEntitlements,
  accountReady,
  accountUser,
  rememberLocaleChoice,
  setupAccountNav,
  setupEntrance,
  setupHeaderScroll,
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
  extra: { page_intent?: string; plan?: string; interval?: string } = {},
): void {
  try {
    const body = JSON.stringify({
      event,
      page_intent: extra.page_intent ?? pageIntent,
      plan: extra.plan,
      interval: extra.interval,
      client: "web",
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

const EXPIRY_KEY = "dropimg:expiry";
const DEFAULT_EXPIRY = 604800;

function selectedExpiry(): number {
  const group = document.getElementById("expiry-choice");
  const raw = group?.getAttribute("data-value");
  return Number(raw) || DEFAULT_EXPIRY;
}

function visibleExpiryPills(group: HTMLElement): HTMLButtonElement[] {
  return [...group.querySelectorAll<HTMLButtonElement>(".expiry-pill")].filter((btn) => !btn.hidden && !btn.disabled);
}

function setExpiry(seconds: number) {
  const group = document.getElementById("expiry-choice");
  if (!group) return;
  group.setAttribute("data-value", String(seconds));
  group.querySelectorAll<HTMLButtonElement>(".expiry-pill").forEach((btn) => {
    const on = Number(btn.getAttribute("data-expiry")) === seconds;
    btn.setAttribute("aria-checked", on ? "true" : "false");
    btn.tabIndex = on ? 0 : -1;
  });
  try {
    localStorage.setItem(EXPIRY_KEY, String(seconds));
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

function ownedUploadOptions(): { expiry: number; password?: string } {
  const expiry = selectedExpiry();
  if (!proPasswordOn()) return { expiry };
  const passwordEl = document.getElementById("pro-password") as HTMLInputElement | null;
  const password = passwordEl?.value.trim() || "";
  return password ? { expiry, password } : { expiry };
}

/**
 * Choosing a lifetime is a free feature, so this runs for every visitor. The
 * server list is authoritative: pills outside it are removed rather than
 * disabled, and a plan with a single lifetime gets no radiogroup at all.
 */
function setupDropOptions() {
  const tray = document.getElementById("drop-options");
  if (!tray) return;
  const allowed = accountEntitlements?.allowedExpirySeconds ?? [DEFAULT_EXPIRY];
  const fallback = accountEntitlements?.defaultExpirySeconds ?? DEFAULT_EXPIRY;

  const expiryEl = document.getElementById("expiry-choice");
  const expiryField = expiryEl?.closest<HTMLElement>(".drop-field");
  if (expiryEl && expiryField) {
    expiryEl.querySelectorAll<HTMLButtonElement>(".expiry-pill").forEach((btn) => {
      const value = Number(btn.getAttribute("data-expiry"));
      const offered = allowed.includes(value);
      btn.hidden = !offered;
      btn.disabled = !offered;
      btn.tabIndex = -1;
      if (offered) {
        btn.addEventListener("click", () => setExpiry(value));
      }
    });

    // A single option is a statement, not a choice — don't render it as one.
    expiryField.hidden = allowed.length < 2;

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
      setExpiry(next);
      pills[index].focus();
    });

    let next = fallback;
    try {
      const remembered = Number(localStorage.getItem(EXPIRY_KEY));
      if (allowed.includes(remembered)) next = remembered;
    } catch {
      // ignore
    }
    setExpiry(next);
  }

  const canPassword = Boolean(accountEntitlements?.passwordProtection);
  const passwordWrap = document.getElementById("pro-password-wrap");
  const passwordToggle = document.getElementById("pro-password-toggle");
  if (passwordWrap) passwordWrap.hidden = !canPassword;
  if (passwordToggle && canPassword) {
    passwordToggle.addEventListener("click", () => {
      setProPasswordOn(!proPasswordOn());
    });
  }

  tray.hidden = Boolean(expiryField?.hidden) && !canPassword;
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
  if (status === 413) return ui.tooLarge;
  if (status === 429) return ui.errors.rate_limited;
  return ui.uploadFailed;
}

async function handleFile(file: File) {
  await accountReady;
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
    showError(ui.invalidFormat);
    return;
  }
  const limit = accountEntitlements?.maxUploadBytes ?? MAX_BYTES;
  if (file.size > limit) {
    showError(ui.tooLargeLimit(Math.round(limit / (1024 * 1024))));
    return;
  }
  if (proPasswordOn()) {
    const password = (document.getElementById("pro-password") as HTMLInputElement | null)?.value.trim() || "";
    if (password.length < 8) {
      showError(ui.passwordTooShort);
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
  trackEvent("upload_start", {
    plan: accountEntitlements?.plan || (accountUser ? "free" : "anonymous"),
  });

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
    body: JSON.stringify(ownedUploadOptions()),
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
      // Signed-in uploads carry the expiry on the intent instead. Until
      // entitlements land, the tray still shows its rendered default, which
      // the plan may not actually allow — send nothing and let the server
      // apply its own default rather than have the upload rejected.
      if (!accountUser && accountEntitlements) {
        xhr.setRequestHeader("X-Dropimg-Expiry", String(selectedExpiry()));
      }
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
  shareUrl.value = result.url.replace(/^https?:\/\//, "");
  shareUrl.dataset.url = result.url;
  btnOpen.href = result.url;
  expiresLabel.textContent = `${ui.expiresPrefix} ${formatExpiry(result.expiresAt)}`;
  const protect = document.getElementById("protect-label");
  if (protect) protect.hidden = !proPasswordOn();
  const manage = document.getElementById("btn-manage") as HTMLAnchorElement | null;
  if (manage) manage.hidden = !(accountUser && accountEntitlements?.plan === "pro");
  const upsell = document.getElementById("success-upsell");
  if (upsell) upsell.hidden = accountEntitlements?.plan === "pro";
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
  const countdown = expiryCountdown(expiresAt);
  switch (countdown.unit) {
    case "soon":
      return ui.expiresSoon;
    case "minutes":
      return ui.expiresInMins(countdown.value);
    case "hours":
      return ui.expiresInHours(countdown.value);
    case "days":
      return ui.expiresInDays(countdown.value);
  }
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
  if (active) document.body.dataset.dragging = "true";
  else delete document.body.dataset.dragging;
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
setupHeaderScroll();
setupEntrance();
setupLangSuggest();
if (document.getElementById("dropzone")) {
  setupUploader();
  void accountReady.then(() => setupDropOptions());
}
