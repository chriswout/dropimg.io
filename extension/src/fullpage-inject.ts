/**
 * Injected IIFE: measure, scroll, hide fixed/sticky overlays, restore.
 * Built as IIFE and injected via chrome.scripting.executeScript({ files }).
 */
(() => {
  const KEY = "__dropimg_fullpage__";
  const TAG = "data-dropimg-fp";
  const w = window as unknown as Record<string, unknown>;
  if (w[KEY]) return;

  type Saved = {
    scrollX: number;
    scrollY: number;
    htmlBehavior: string;
    htmlOverflow: string;
    overlays: Array<{ el: HTMLElement; visibility: string }>;
  };

  let saved: Saved | null = null;

  function measure() {
    const root = document.documentElement;
    const body = document.body;
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth ?? 0),
      scrollHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      dpr: window.devicePixelRatio || 1,
    };
  }

  function prepare() {
    if (saved) return;
    const html = document.documentElement;
    saved = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      htmlBehavior: html.style.scrollBehavior,
      htmlOverflow: html.style.overflow,
      overlays: [],
    };
    html.style.scrollBehavior = "auto";
  }

  function hideOverlays() {
    if (!saved) prepare();
    const root = saved!;
    if (root.overlays.length) return;
    const all = document.body ? document.body.getElementsByTagName("*") : [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i] as HTMLElement;
      if (el.getAttribute(TAG)) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.position !== "fixed" && style.position !== "sticky") continue;
      root.overlays.push({ el, visibility: el.style.visibility });
      el.setAttribute(TAG, "1");
      el.style.visibility = "hidden";
    }
  }

  function scrollToY(y: number) {
    window.scrollTo(0, y);
    return { scrollY: window.scrollY, scrollHeight: document.documentElement.scrollHeight };
  }

  function restore() {
    if (!saved) return;
    for (const item of saved.overlays) {
      item.el.style.visibility = item.visibility;
      item.el.removeAttribute(TAG);
    }
    const html = document.documentElement;
    html.style.scrollBehavior = saved.htmlBehavior;
    html.style.overflow = saved.htmlOverflow;
    window.scrollTo(saved.scrollX, saved.scrollY);
    saved = null;
  }

  w[KEY] = { measure, prepare, hideOverlays, scrollToY, restore };
})();
