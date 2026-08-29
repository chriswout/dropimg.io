/**
 * Content script: region selection overlay.
 * Built as IIFE and injected via chrome.scripting.executeScript({ files }).
 */
(() => {
  const EXISTING = "__dropimg_region_overlay__";
  const w = window as unknown as Record<string, unknown>;
  if (w[EXISTING]) return;
  w[EXISTING] = true;

  const hintText =
    (typeof chrome !== "undefined" &&
      chrome.i18n?.getMessage?.("regionHint")) ||
    "Drag to select · Esc to cancel";

  const root = document.createElement("div");
  root.id = "dropimg-region-root";
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    cursor: "crosshair",
    background: "rgba(15, 23, 42, 0.28)",
    userSelect: "none",
  });

  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    border: "2px solid #2563eb",
    background: "rgba(37, 99, 235, 0.15)",
    display: "none",
    pointerEvents: "none",
  });

  const hint = document.createElement("div");
  hint.textContent = hintText;
  Object.assign(hint.style, {
    position: "fixed",
    top: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#0f172a",
    color: "#f8fafc",
    padding: "8px 14px",
    borderRadius: "999px",
    font: '650 13px/1.2 "Segoe UI", system-ui, sans-serif',
    zIndex: "2147483647",
    pointerEvents: "none",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  });

  root.append(box, hint);
  document.documentElement.append(root);

  let startX = 0;
  let startY = 0;
  let dragging = false;

  function cleanup() {
    root.remove();
    delete w[EXISTING];
    window.removeEventListener("keydown", onKey, true);
  }

  function finish(
    result:
      | {
          ok: true;
          rect: {
            x: number;
            y: number;
            width: number;
            height: number;
            dpr: number;
          };
        }
      | { ok: false; code: "region_cancelled" },
  ) {
    cleanup();
    void chrome.runtime.sendMessage({ type: "REGION_RESULT", ...result });
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish({ ok: false, code: "region_cancelled" });
    }
  }

  root.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    box.style.display = "block";
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    box.style.width = "0px";
    box.style.height = "0px";
  });

  root.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const wdt = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.style.width = `${wdt}px`;
    box.style.height = `${h}px`;
  });

  root.addEventListener("mouseup", (e) => {
    if (!dragging || e.button !== 0) return;
    dragging = false;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);
    if (width < 4 || height < 4) {
      finish({ ok: false, code: "region_cancelled" });
      return;
    }
    finish({
      ok: true,
      rect: {
        x,
        y,
        width,
        height,
        dpr: window.devicePixelRatio || 1,
      },
    });
  });

  window.addEventListener("keydown", onKey, true);
})();
