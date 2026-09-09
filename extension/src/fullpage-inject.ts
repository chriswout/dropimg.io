/**
 * Injected IIFE: measure, scroll, hide repeating overlays, restore.
 * Built as IIFE and injected via chrome.scripting.executeScript({ files }).
 *
 * Fixed overlays are hidden after the first tile. Sticky headings are hidden
 * only after they were actually visible in an earlier tile, so in-flow sticky
 * section titles still appear once.
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
  const seenSticky = new WeakSet<HTMLElement>();

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

  function intersectsViewport(el: HTMLElement): boolean {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  }

  function hideOverlays() {
    if (!saved) prepare();
    const root = saved!;
    const all = document.body ? document.body.getElementsByTagName("*") : [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i] as HTMLElement;
      if (el.getAttribute(TAG)) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const hideFixed = style.position === "fixed";
      const hideSticky = style.position === "sticky" && seenSticky.has(el);
      if (!hideFixed && !hideSticky) continue;
      root.overlays.push({ el, visibility: el.style.visibility });
      el.setAttribute(TAG, "1");
      el.style.visibility = "hidden";
    }
  }

  function rememberVisibleSticky() {
    const all = document.body ? document.body.getElementsByTagName("*") : [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i] as HTMLElement;
      if (el.getAttribute(TAG)) continue;
      const style = getComputedStyle(el);
      if (style.position !== "sticky") continue;
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (intersectsViewport(el)) seenSticky.add(el);
    }
  }

  function scrollToY(y: number) {
    window.scrollTo(0, y);
    return { scrollY: window.scrollY, scrollHeight: document.documentElement.scrollHeight };
  }

  function currentScrollY() {
    return window.scrollY;
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

  w[KEY] = {
    measure,
    prepare,
    hideOverlays,
    rememberVisibleSticky,
    scrollToY,
    currentScrollY,
    restore,
  };
})();
