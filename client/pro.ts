declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: "sandbox" | "production") => void };
      Initialize: (opts: {
        token: string;
        eventCallback?: (event: { name?: string }) => void;
      }) => void;
      Checkout: {
        open: (opts: {
          items: { priceId: string; quantity: number }[];
          customer?: { email: string };
          customData?: Record<string, string>;
          settings?: { variant?: string };
        }) => void;
      };
    };
  }
}

let paddleReady: Promise<void> | null = null;
let paddleInitialized = false;

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

function loadPaddle(): Promise<void> {
  if (window.Paddle) return Promise.resolve();
  if (paddleReady) return paddleReady;
  paddleReady = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[src*='paddle.js']");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("paddle_js"));
    document.head.appendChild(script);
  });
  return paddleReady;
}

async function startCheckout(interval: "monthly" | "annual") {
  trackClient("pro_cta_click", { interval, plan: "free" });
  setStatus(copy("waiting", "Opening checkout…"));
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interval }),
  });
  if (res.status === 401) {
    location.href = "/login";
    return;
  }
  if (!res.ok) {
    setStatus(copy("unavailable", "Checkout isn’t available right now. Try again shortly."));
    return;
  }
  const data = (await res.json()) as {
    env: string;
    clientToken: string;
    priceId: string;
    email: string;
    customData: Record<string, string>;
  };
  await loadPaddle();
  if (!window.Paddle) return;
  if (!paddleInitialized) {
    if (data.env === "sandbox") {
      window.Paddle.Environment.set("sandbox");
    }
    window.Paddle.Initialize({
      token: data.clientToken,
      eventCallback(event) {
        if (event.name === "checkout.completed") {
          trackClient("checkout_completed_client", { interval, plan: "free" });
          void pollUntilPro();
        }
        if (event.name === "checkout.error") {
          setStatus(copy("open-fail", "Checkout could not open. Try again shortly."));
        }
      },
    });
    paddleInitialized = true;
  }
  window.Paddle.Checkout.open({
    items: [{ priceId: data.priceId, quantity: 1 }],
    customer: data.email ? { email: data.email } : undefined,
    customData: data.customData,
    settings: { variant: "one-page" },
  });
}

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

function setupProPage() {
  const page = root();
  if (!page) return;
  page.querySelectorAll<HTMLButtonElement>("[data-interval]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const interval = btn.getAttribute("data-interval") === "annual" ? "annual" : "monthly";
      void startCheckout(interval);
    });
  });
  document.getElementById("pro-portal")?.addEventListener("click", () => {
    void openPortal();
  });
}

setupProPage();
