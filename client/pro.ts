function root(): HTMLElement | null {
  return document.getElementById("pro-app");
}

function copy(key: string, fallback: string): string {
  return root()?.getAttribute(`data-${key}`) || fallback;
}

function setStatus(message: string) {
  const status = document.getElementById("pro-status");
  if (!status) return;
  status.hidden = false;
  status.textContent = message;
}

function trackClient(
  event: string,
  extra: { interval?: string; plan?: string } = {},
) {
  try {
    const body = JSON.stringify({
      event,
      page_intent: "pro",
      client: "web",
      ...extra,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/event", blob);
  } catch {
    // ignore
  }
}

/**
 * Managed Payments only runs on Stripe's own hosted page, so checkout is a
 * full navigation rather than an overlay: the session is minted server-side
 * and the browser is handed the URL it returns.
 */
async function startCheckout(interval: "monthly" | "annual") {
  trackClient("pro_cta_click", { interval, plan: "free" });
  setStatus(copy("waiting", "Opening checkout…"));
  let res: Response;
  try {
    res = await fetch("/api/billing/checkout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
  } catch {
    setStatus(copy("unavailable", "Checkout isn’t available right now. Try again shortly."));
    return;
  }
  if (res.status === 401) {
    location.href = "/login";
    return;
  }
  if (!res.ok) {
    setStatus(copy("unavailable", "Checkout isn’t available right now. Try again shortly."));
    return;
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    setStatus(copy("open-fail", "Checkout could not open. Try again shortly."));
    return;
  }
  location.href = data.url;
}

/**
 * Stripe returns the buyer before the webhook has necessarily landed, so the
 * success page waits for the entitlement rather than assuming it.
 */
async function pollUntilPro() {
  setStatus(copy("activating", "Payment received. Activating Pro…"));
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch("/api/account/me", { credentials: "same-origin" });
      const body = (await res.json()) as { entitlements?: { plan?: string } };
      if (body.entitlements?.plan === "pro") {
        location.href = "/app";
        return;
      }
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  setStatus(
    copy(
      "timeout",
      "Your payment was received. Pro is still activating. Refresh My drops in a moment.",
    ),
  );
}

async function openPortal() {
  const res = await fetch("/api/billing/portal", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    setStatus(copy("unavailable", "Billing isn’t available right now."));
    return;
  }
  const body = (await res.json()) as { url?: string };
  if (body.url) location.href = body.url;
}

/**
 * Monthly / Annual is a view switch, not two products: it only swaps which
 * price is visible and re-tags the single CTA. Checkout still reads
 * `[data-interval]` off the button that was clicked.
 */
function setupIntervalSelector(page: HTMLElement) {
  const options = page.querySelectorAll<HTMLButtonElement>(
    "[data-select-interval]",
  );
  if (options.length === 0) return;
  const cta = page.querySelector<HTMLElement>(".pro-cta");

  const select = (interval: "monthly" | "annual") => {
    options.forEach((opt) => {
      opt.setAttribute(
        "aria-checked",
        opt.dataset.selectInterval === interval ? "true" : "false",
      );
    });
    page.querySelectorAll<HTMLElement>("[data-interval-view]").forEach((el) => {
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
  page.querySelectorAll<HTMLElement>("[data-interval]").forEach((btn) => {
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
