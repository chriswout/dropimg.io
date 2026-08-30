/// <reference types="chrome" />
import { validateIntegrationToken } from "./account-upload";
import {
  disconnectAccount,
  loadAccountProfile,
  loadIntegrationToken,
  loadLastExpiry,
  loadRecent,
  loadSettings,
  pushRecent,
  removeRecent,
  saveAccountProfile,
  saveIntegrationToken,
  saveLastExpiry,
  saveSettings,
} from "./storage";
import {
  API_ORIGIN,
  EXPIRY_24H,
  EXPIRY_30D,
  EXPIRY_7D,
  accountUrl,
  chooseExpirySeconds,
  integrationTokenLooksValid,
  msg,
  type CaptureMode,
  type CaptureResult,
  type RecentItem,
} from "./shared";

const idle = el("state-idle");
const loading = el("state-loading");
const success = el("state-success");
const errorState = el("state-error");
const shareUrl = el<HTMLInputElement>("share-url");
const takenAt = el("taken-at");
const expires = el("expires");
const errorMessage = el("error-message");
const btnOpen = el<HTMLAnchorElement>("btn-open");
const btnCopy = el<HTMLButtonElement>("btn-copy");
const btnRetry = el<HTMLButtonElement>("btn-retry");
const btnCapture = el<HTMLButtonElement>("btn-capture");
const btnAnother = el<HTMLButtonElement>("btn-another");
const copyNote = el("copy-note");
const loadingTitle = el("loading-title");
const loadingHint = el("loading-hint");
const modeHint = el("mode-hint");
const recentSection = el("recent");
const recentList = el("recent-list");

let currentMode: CaptureMode = "visible";

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing`);
  return node as T;
}

function show(state: "idle" | "loading" | "success" | "error") {
  idle.classList.toggle("hidden", state !== "idle");
  loading.classList.toggle("hidden", state !== "loading");
  success.classList.toggle("hidden", state !== "success");
  errorState.classList.toggle("hidden", state !== "error");
}

function applyI18n() {
  el("mode-visible").textContent = msg("modeVisible");
  el("mode-region").textContent = msg("modeRegion");
  el("success-title").textContent = `✓ ${msg("uploaded")}`;
  el("error-title").textContent = msg("uploadFailed");
  btnCopy.textContent = msg("copy");
  btnOpen.textContent = msg("open");
  btnRetry.textContent = msg("tryAgain");
  btnCapture.textContent = msg("capture");
  btnAnother.textContent = msg("captureAnother");
  el("recent-heading").textContent = msg("recentDrops");
  el("account-heading").textContent = msg("accountHeading");
  el("account-anon-hint").textContent = msg("accountAnonHint");
  el<HTMLButtonElement>("btn-connect").textContent = msg("connect");
  el("connect-steps").textContent = msg("connectSteps");
  el<HTMLAnchorElement>("open-account").textContent = msg("openAccount");
  el<HTMLAnchorElement>("open-account").href = accountUrl();
  el("token-input-label").textContent = msg("tokenPlaceholder");
  el<HTMLInputElement>("token-input").placeholder = msg("tokenPlaceholder");
  el<HTMLButtonElement>("btn-connect-save").textContent = msg("connectSave");
  el<HTMLButtonElement>("btn-connect-cancel").textContent = msg("connectCancel");
  el("expiry-label").textContent = msg("expiresLabel");
  el<HTMLButtonElement>("btn-disconnect").textContent = msg("disconnect");
  el("disconnect-hint").textContent = msg("disconnectHint");
  document.documentElement.lang = chrome.i18n.getUILanguage() || "en";
}

function showAccount(view: "anon" | "connect" | "connected") {
  el("account-anon").classList.toggle("hidden", view !== "anon");
  el("account-connect").classList.toggle("hidden", view !== "connect");
  el("account-connected").classList.toggle("hidden", view !== "connected");
}

function fillExpirySelect(allowed: number[], selected: number) {
  const select = el<HTMLSelectElement>("expiry-select");
  const options: Array<{ value: number; label: string }> = [
    { value: EXPIRY_24H, label: msg("expiry24h") },
    { value: EXPIRY_7D, label: msg("expiry7d") },
    { value: EXPIRY_30D, label: msg("expiry30d") },
  ];
  select.innerHTML = "";
  for (const opt of options) {
    if (!allowed.includes(opt.value)) continue;
    const node = document.createElement("option");
    node.value = String(opt.value);
    node.textContent = opt.label;
    if (opt.value === selected) node.selected = true;
    select.append(node);
  }
}

async function renderAccount() {
  const token = await loadIntegrationToken();
  const profile = await loadAccountProfile();
  if (!token || !profile) {
    showAccount("anon");
    return;
  }
  el("account-email").textContent = profile.emailMasked;
  el("account-plan").textContent =
    profile.plan === "pro" ? msg("planPro") : msg("planFree");
  const preferred = await loadLastExpiry();
  const selected = chooseExpirySeconds(profile.allowedExpirySeconds, preferred);
  fillExpirySelect(profile.allowedExpirySeconds, selected);
  showAccount("connected");
}

function formatTakenAgo(createdAtSec: number): string {
  const secs = Math.max(0, Math.floor(Date.now() / 1000 - createdAtSec));
  if (secs < 8) return msg("takenJustNow");
  if (secs < 60) return msg("takenSecsAgo", String(secs));
  const mins = Math.floor(secs / 60);
  if (mins < 60) {
    return mins === 1
      ? msg("takenMinsAgo", "1")
      : msg("takenMinsAgoPlural", String(mins));
  }
  const hours = Math.floor(mins / 60);
  return hours === 1
    ? msg("takenHoursAgo", "1")
    : msg("takenHoursAgoPlural", String(hours));
}

function formatExpiry(expiresAt: number): string {
  const ms = expiresAt * 1000 - Date.now();
  if (ms <= 0) return `${msg("expiresPrefix")} ${msg("expiresSoon")}`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 23) return `${msg("expiresPrefix")} ${msg("expiresAbout24h")}`;
  if (hours > 0) {
    return `${msg("expiresPrefix")} ${msg("expiresInHours", String(hours))}`;
  }
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${msg("expiresPrefix")} ${msg("expiresInMins", String(mins))}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    shareUrl.focus();
    shareUrl.select();
    return false;
  }
}

function setModeUI(mode: CaptureMode) {
  currentMode = mode;
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".mode")) {
    btn.setAttribute(
      "aria-selected",
      btn.dataset.mode === mode ? "true" : "false",
    );
  }
  modeHint.textContent =
    mode === "region" ? msg("modeHintRegion") : msg("modeHintVisible");
}

function loadingCopy(mode: CaptureMode) {
  if (mode === "region") {
    loadingTitle.textContent = msg("preparingRegion");
    loadingHint.textContent = msg("uploading");
  } else {
    loadingTitle.textContent = msg("capturing");
    loadingHint.textContent = msg("uploading");
  }
}

function showResult(
  item: Pick<RecentItem, "url" | "expiresAt" | "createdAt">,
  opts: { copied?: boolean } = {},
) {
  shareUrl.value = item.url;
  btnOpen.href = item.url;
  takenAt.textContent = formatTakenAgo(item.createdAt);
  expires.textContent = formatExpiry(item.expiresAt);
  show("success");
  if (opts.copied) {
    copyNote.hidden = false;
    copyNote.textContent = msg("linkCopied");
  } else {
    copyNote.hidden = true;
  }
}

async function runCapture(mode: CaptureMode = currentMode) {
  if (!navigator.onLine) {
    errorMessage.textContent = msg("offline");
    show("error");
    return;
  }

  loadingCopy(mode);
  show("loading");
  copyNote.hidden = true;

  // Region needs the popup out of the way so the user can draw on the page.
  if (mode === "region") {
    setTimeout(() => window.close(), 120);
  }

  let result: CaptureResult;
  try {
    result = await chrome.runtime.sendMessage({
      type: "CAPTURE_AND_UPLOAD",
      mode,
    });
  } catch {
    result = { ok: false, error: msg("bgUnavailable") };
  }

  if (!document.body) return;

  if (!result?.ok) {
    errorMessage.textContent = result?.error || msg("uploadFailed");
    show("error");
    return;
  }

  const createdAt = Math.floor(Date.now() / 1000);
  await pushRecent({
    slug: result.slug,
    url: result.url,
    expiresAt: result.expiresAt,
    deleteToken: result.deleteToken,
    createdAt,
  });
  await renderRecent();

  const copied = await copyText(result.url);
  showResult(
    { url: result.url, expiresAt: result.expiresAt, createdAt },
    { copied },
  );
}

async function renderRecent() {
  const items = await loadRecent();
  recentList.innerHTML = "";
  if (items.length === 0) {
    recentSection.hidden = true;
    return;
  }
  recentSection.hidden = false;
  for (const item of items) {
    recentList.append(recentRow(item));
  }
}

function recentRow(item: RecentItem): HTMLLIElement {
  const li = document.createElement("li");

  const thumbWrap = document.createElement("a");
  thumbWrap.className = "thumb";
  thumbWrap.href = item.url;
  thumbWrap.target = "_blank";
  thumbWrap.rel = "noopener";
  thumbWrap.title = item.url;

  const thumb = document.createElement("img");
  thumb.src = `${API_ORIGIN}/i/${item.slug}`;
  thumb.alt = "";
  thumb.width = 44;
  thumb.height = 44;
  thumb.loading = "lazy";
  thumb.decoding = "async";
  thumb.referrerPolicy = "no-referrer";
  thumb.addEventListener("error", () => {
    thumbWrap.hidden = true;
  });
  thumbWrap.append(thumb);

  const body = document.createElement("div");
  body.className = "body";

  const slug = document.createElement("span");
  slug.className = "slug";
  slug.textContent = item.url.replace(/^https?:\/\//, "");
  slug.title = item.url;

  const meta = document.createElement("div");
  meta.className = "meta";
  const taken = document.createElement("span");
  taken.className = "taken";
  taken.textContent = formatTakenAgo(item.createdAt);
  const exp = document.createElement("span");
  exp.className = "exp";
  exp.textContent = formatExpiry(item.expiresAt);
  meta.append(taken, exp);

  const actions = document.createElement("div");
  actions.className = "row-actions";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "btn secondary tiny";
  copyBtn.textContent = msg("copy");
  copyBtn.addEventListener("click", async () => {
    await copyText(item.url);
  });

  const openBtn = document.createElement("a");
  openBtn.className = "btn secondary tiny";
  openBtn.href = item.url;
  openBtn.target = "_blank";
  openBtn.rel = "noopener";
  openBtn.textContent = msg("open");

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "btn secondary tiny";
  delBtn.textContent = msg("delete");
  delBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API_ORIGIN}/api/i/${item.slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${item.deleteToken}` },
      });
      if (!res.ok && res.status !== 404) {
        delBtn.textContent = msg("couldNotDelete");
        return;
      }
    } catch {
      delBtn.textContent = msg("couldNotDelete");
      return;
    }
    await removeRecent(item.slug);
    await renderRecent();
  });

  actions.append(copyBtn, openBtn, delBtn);
  body.append(slug, meta, actions);
  li.append(thumbWrap, body);
  return li;
}

async function init() {
  applyI18n();
  const settings = await loadSettings();
  setModeUI(settings.lastMode);
  await renderRecent();

  for (const btn of document.querySelectorAll<HTMLButtonElement>(".mode")) {
    btn.addEventListener("click", async () => {
      const mode = btn.dataset.mode as CaptureMode;
      setModeUI(mode);
      await saveSettings({ lastMode: mode });
      show("idle");
    });
  }

  btnCapture.addEventListener("click", () => void runCapture(currentMode));
  btnRetry.addEventListener("click", () => void runCapture(currentMode));
  btnAnother.addEventListener("click", () => show("idle"));
  btnCopy.addEventListener("click", async () => {
    const ok = await copyText(shareUrl.value);
    copyNote.hidden = false;
    copyNote.textContent = ok ? msg("linkCopied") : msg("copyManual");
  });
  shareUrl.addEventListener("focus", () => shareUrl.select());

  el("btn-connect").addEventListener("click", () => {
    el<HTMLInputElement>("token-input").value = "";
    el("connect-error").hidden = true;
    showAccount("connect");
    el<HTMLInputElement>("token-input").focus();
  });
  el("btn-connect-cancel").addEventListener("click", () => showAccount("anon"));
  el("btn-connect-save").addEventListener("click", async () => {
    const token = el<HTMLInputElement>("token-input").value.trim();
    const err = el("connect-error");
    if (!integrationTokenLooksValid(token)) {
      err.textContent = msg("connectInvalid");
      err.hidden = false;
      return;
    }
    const checked = await validateIntegrationToken(token);
    if (!checked.ok) {
      err.textContent = checked.error || msg("connectInvalid");
      err.hidden = false;
      return;
    }
    await saveIntegrationToken(token);
    await saveAccountProfile({
      emailMasked: checked.emailMasked,
      plan: checked.plan,
      maxUploadBytes: checked.maxUploadBytes,
      allowedExpirySeconds: checked.allowedExpirySeconds,
    });
    el<HTMLInputElement>("token-input").value = "";
    await renderAccount();
  });
  el("btn-disconnect").addEventListener("click", async () => {
    await disconnectAccount();
    await renderAccount();
  });
  el<HTMLSelectElement>("expiry-select").addEventListener("change", async (event) => {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
    if (Number.isFinite(value) && value > 0) await saveLastExpiry(value);
  });
  await renderAccount();

  const items = await loadRecent();
  const newest = items[0];
  const ageSec = newest
    ? Math.floor(Date.now() / 1000) - newest.createdAt
    : Infinity;
  if (newest && ageSec < 15 * 60) {
    showResult(newest);
  } else {
    show("idle");
  }
}

void init();
