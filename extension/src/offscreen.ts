/// <reference types="chrome" />

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OFFSCREEN_WRITE_CLIPBOARD") return;
  void (async () => {
    try {
      await navigator.clipboard.writeText(String(message.text || ""));
      sendResponse({ ok: true });
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : "clipboard_failed",
      });
    }
  })();
  return true;
});
