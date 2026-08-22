import "./styles.css";
import type { RecentDrop, UploadErrorResponse, UploadResponse } from "../src/types";

const MAX_BYTES = 10 * 1024 * 1024;
const RECENT_KEY = "dropimg:recent";
const RECENT_LIMIT = 8;

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

type UiState = "idle" | "uploading" | "success" | "error";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing`);
  return node as T;
}

function announce(message: string) {
  statusLive.textContent = "";
  // Force a DOM change so screen readers re-announce
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
  dropzone.setAttribute(
    "aria-busy",
    state === "uploading" ? "true" : "false",
  );
}

function clearPreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  preview.removeAttribute("src");
}

async function handleFile(file: File) {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
    showError("Please choose a PNG, JPEG, WebP, or GIF image.");
    return;
  }
  if (file.size > MAX_BYTES) {
    showError("File exceeds the 10 MB limit.");
    return;
  }

  clearPreview();
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  progressBar.style.width = "0%";
  progressLabel.textContent = "0%";
  progressWrap.setAttribute("aria-valuenow", "0");
  setState("uploading");
  announce("Uploading");

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
    const msg = err instanceof Error ? err.message : "Upload failed";
    showError(msg);
  }
}

function uploadWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.responseType = "json";

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
      reject(new Error(body?.error || `Upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    file.arrayBuffer().then((buf) => xhr.send(buf), reject);
  });
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
  const title = copied ? "Uploaded. Link copied." : "Uploaded.";
  successTitle.textContent = title;
  shareUrl.value = result.url;
  btnOpen.href = result.url;
  expiresLabel.textContent = `Expires ${formatExpiry(result.expiresAt)}`;
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
  announce(`Upload failed. ${message}`);
}

function formatExpiry(expiresAt: number): string {
  const ms = expiresAt * 1000 - Date.now();
  if (ms <= 0) return "soon";
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 23) return `in about 24 hours`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
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
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
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
    li.append(a, del);
    recentList.append(li);
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
    idleTitle.textContent = "Drop it here";
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
  const title = ok ? "Uploaded. Link copied." : "Uploaded.";
  successTitle.textContent = title;
  announce(title);
  if (ok) {
    const prev = btn.textContent;
    btn.textContent = "Copied";
    window.setTimeout(() => {
      btn.textContent = prev || "Copy";
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
      showError("Could not delete image.");
      return;
    }
  } catch {
    showError("Could not delete image.");
    return;
  }
  removeRecent(slug);
  announce("Image deleted");
  resetToIdle();
});

shareUrl.addEventListener("focus", () => shareUrl.select());

renderRecent();
