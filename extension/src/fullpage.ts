/**
 * Content script helpers for full-page capture (message API).
 * Built as IIFE; background talks via chrome.tabs.sendMessage.
 */
(() => {
  const FLAG = "__dropimg_fullpage_cs__";
  const w = window as unknown as Record<string, unknown>;
  if (w[FLAG]) return;
  w[FLAG] = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;
    if (message.type === "FP_MEASURE") {
      const doc = document.documentElement;
      const body = document.body;
      sendResponse({
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        pageW: Math.max(doc.scrollWidth, body?.scrollWidth || 0, doc.clientWidth),
        pageH: Math.max(
          doc.scrollHeight,
          body?.scrollHeight || 0,
          doc.clientHeight,
        ),
        dpr: window.devicePixelRatio || 1,
      });
      return;
    }
    if (message.type === "FP_SCROLL") {
      window.scrollTo(0, Number(message.y) || 0);
      sendResponse({ ok: true });
      return;
    }
    if (message.type === "FP_RESTORE") {
      window.scrollTo(Number(message.x) || 0, Number(message.y) || 0);
      sendResponse({ ok: true });
      return;
    }
  });
})();
