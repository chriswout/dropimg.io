"use strict";
(() => {
  // client/pro.ts
  function root() {
    return document.getElementById("pro-app");
  }
  function copy(key, fallback) {
    return root()?.getAttribute(`data-${key}`) || fallback;
  }
  function setStatus(message) {
    const status = document.getElementById("pro-status");
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
  }
  function trackClient(event, extra = {}) {
    try {
      const body = JSON.stringify({
        event,
        page_intent: "pro",
        client: "web",
        ...extra
      });
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/event", blob);
    } catch {
    }
  }
  async function startCheckout(interval) {
    trackClient("pro_cta_click", { interval, plan: "free" });
    setStatus(copy("waiting", "Opening checkout\u2026"));
    let res;
    try {
      res = await postDropsCheckout(interval);
      if (res.status === 401) {
        location.href = "/login";
        return;
      }
      if (res.status === 409) {
        const first = await res.json().catch(() => null);
        if (first?.code === "checkout_in_progress") {
          await abandonDropsCheckout();
          res = await postDropsCheckout(interval);
        } else {
          setStatus(first?.error || copy("already", "You already have Drops Pro. Manage it in PayPal."));
          return;
        }
      }
    } catch {
      setStatus(copy("unavailable", "Checkout isn\u2019t available right now. Try again shortly."));
      return;
    }
    if (res.status === 409) {
      const body = await res.json().catch(() => null);
      setStatus(body?.error || copy("already", "You already have Drops Pro. Manage it in PayPal."));
      return;
    }
    if (!res.ok) {
      setStatus(copy("unavailable", "Checkout isn\u2019t available right now. Try again shortly."));
      return;
    }
    const data = await res.json();
    if (!data.url) {
      setStatus(copy("open-fail", "Checkout could not open. Try again shortly."));
      return;
    }
    location.href = data.url;
  }
  function postDropsCheckout(interval) {
    return fetch("/api/billing/checkout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval })
    });
  }
  function abandonDropsCheckout() {
    return fetch("/api/billing/checkout/abandon", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: "drops_pro" })
    }).catch(() => void 0);
  }
  async function pollUntilPro() {
    if (root()?.getAttribute("data-plan") === "pro") {
      location.href = "/app";
      return;
    }
    setStatus(copy("activating", "Payment received. Activating Drops Pro\u2026"));
    const subscriptionId = new URLSearchParams(location.search).get("subscription_id");
    try {
      const synced = await fetch("/api/billing/sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionId ? { subscription_id: subscriptionId } : {})
      });
      if (synced.ok) {
        const body = await synced.json();
        if (body.plan === "pro") {
          location.href = "/app";
          return;
        }
      }
    } catch {
    }
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch("/api/account/me", { credentials: "same-origin" });
        const body = await res.json();
        if (body.entitlements?.plan === "pro") {
          location.href = "/app";
          return;
        }
      } catch {
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setStatus(
      copy(
        "timeout",
        "Your payment was received. Drops Pro is still activating. Refresh My Drops in a moment."
      )
    );
  }
  async function openPortal() {
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) {
      setStatus(copy("unavailable", "Billing isn\u2019t available right now."));
      return;
    }
    const body = await res.json();
    if (body.url) location.href = body.url;
  }
  function setupIntervalSelector(page) {
    const options = page.querySelectorAll(
      "[data-select-interval]"
    );
    if (options.length === 0) return;
    const cta = page.querySelector(".pro-cta");
    const select = (interval) => {
      options.forEach((opt) => {
        opt.setAttribute(
          "aria-checked",
          opt.dataset.selectInterval === interval ? "true" : "false"
        );
      });
      page.querySelectorAll("[data-interval-view]").forEach((el) => {
        el.hidden = el.dataset.intervalView !== interval;
      });
      if (cta?.hasAttribute("data-interval")) {
        cta.setAttribute("data-interval", interval);
      }
    };
    options.forEach((opt) => {
      opt.addEventListener("click", () => {
        select(opt.dataset.selectInterval === "monthly" ? "monthly" : "annual");
      });
    });
  }
  function setupProPage() {
    const page = root();
    if (!page) return;
    setupIntervalSelector(page);
    page.querySelectorAll("[data-interval]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const interval = btn.getAttribute("data-interval") === "annual" ? "annual" : "monthly";
        void startCheckout(interval);
      });
    });
    document.getElementById("pro-portal")?.addEventListener("click", () => {
      void openPortal();
    });
    if (new URLSearchParams(location.search).get("checkout") === "success") {
      void pollUntilPro();
    }
  }
  setupProPage();
})();
