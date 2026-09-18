const LOCALE_KEY = "dropimg:locale";
const RECENT_KEY = "dropimg:recent";

export type AccountMe = {
  user: { id: string; email: string } | null;
  entitlements?: {
    plan: string;
    maxUploadBytes: number;
    allowedExpirySeconds: number[];
    defaultExpirySeconds: number;
    passwordProtection: boolean;
  };
  webAssets?: { plan: "free" | "developer" | "pro" };
};

export let accountUser: AccountMe["user"] = null;
export let accountEntitlements: AccountMe["entitlements"] | null = null;
export let accountReady: Promise<void> = Promise.resolve();

export function rememberLocaleChoice(code: string) {
  try {
    localStorage.setItem(LOCALE_KEY, code);
  } catch {
    // ignore
  }
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `dropimg_locale=${encodeURIComponent(code)}; Path=/; SameSite=Lax; Max-Age=${365 * 24 * 60 * 60}${secure}`;
}

export function setupAccountNav() {
  const signin = document.getElementById("account-signin");
  const sessionEl = document.getElementById("account-session");
  const emailEl = document.getElementById("account-email");
  const emailFullEl = document.getElementById("account-email-full");
  const planWeb = document.getElementById("account-plan-web");
  const planDrops = document.getElementById("account-plan-drops");
  const mediaMenu = document.getElementById("account-media-menu");
  const signout = document.getElementById("account-signout");
  const accountMenu = document.querySelector<HTMLDetailsElement>(".account-menu");
  const accountNav = document.getElementById("account-nav");
  if (!signin || !sessionEl || !emailEl || !signout) return;

  exclusiveDetails();
  setupModals();
  void fetch("/api/site-config")
    .then((res) => (res.ok ? res.json() : null))
    .then((raw) => {
      const data = raw as { mediaEnabled?: boolean } | null;
      if (mediaMenu && data?.mediaEnabled !== true) mediaMenu.hidden = true;
    })
    .catch(() => {
      // keep the Web Assets menu link; production has Media live
    });

  accountReady = (async () => {
    try {
      const res = await fetch("/api/account/me", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as AccountMe;
      accountUser = data.user;
      accountEntitlements = data.entitlements ?? null;
      if (!data.user?.email) return;
      const local = data.user.email.split("@")[0] || data.user.email;
      emailEl.textContent = local;
      emailEl.title = data.user.email;
      if (emailFullEl) emailFullEl.textContent = data.user.email;
      paintPlanLines(accountNav, planWeb, planDrops, data);
      signin.hidden = true;
      sessionEl.hidden = false;
      document.querySelectorAll(".account-get-started").forEach((el) => {
        el.setAttribute("hidden", "");
      });
      await claimLocalRecent();
    } catch {
      // stay on Sign in
    }
  })();

  signout.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // still clear the local view
    }
    accountUser = null;
    accountEntitlements = null;
    signin.hidden = false;
    sessionEl.hidden = true;
    emailEl.textContent = "";
    if (emailFullEl) emailFullEl.textContent = "";
    if (accountMenu) accountMenu.open = false;
    if (planWeb) {
      planWeb.hidden = true;
      planWeb.textContent = "";
    }
    if (planDrops) {
      planDrops.hidden = true;
      planDrops.textContent = "";
    }
  });
}

function paintPlanLines(
  nav: HTMLElement | null,
  planWeb: HTMLElement | null,
  planDrops: HTMLElement | null,
  data: AccountMe,
) {
  const webLabel = nav?.getAttribute("data-label-web") || "Web Assets";
  const dropsLabel = nav?.getAttribute("data-label-drops") || "Drops";
  const free = nav?.getAttribute("data-label-free") || "Free";
  const developer = nav?.getAttribute("data-label-developer") || "Developer";
  const waPro = nav?.getAttribute("data-label-wa-pro") || "Pro";
  const dropsPro = nav?.getAttribute("data-label-drops-pro") || "Drops Pro";
  const waPlan = data.webAssets?.plan ?? "free";
  const dropsPlan = data.entitlements?.plan === "pro" ? dropsPro : free;
  const waName = waPlan === "pro" ? waPro : waPlan === "developer" ? developer : free;
  if (planWeb) {
    planWeb.textContent = `${webLabel} — ${waName}`;
    planWeb.hidden = false;
  }
  if (planDrops) {
    planDrops.textContent = `${dropsLabel} — ${dropsPlan}`;
    planDrops.hidden = false;
  }
}

function setupModals() {
  document.querySelectorAll<HTMLElement>(".modal").forEach(bindModal);
}

function bindModal(modal: HTMLElement) {
  let lastFocus: HTMLElement | null = null;

  const focusables = () =>
    [
      ...modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => !el.hasAttribute("disabled") && !el.closest("[hidden]"));

  const onKey = (event: KeyboardEvent) => {
    if (modal.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal(modal);
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const observer = new MutationObserver(() => {
    if (modal.hidden) {
      document.removeEventListener("keydown", onKey, true);
      lastFocus?.focus();
      lastFocus = null;
      return;
    }
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.addEventListener("keydown", onKey, true);
    const items = focusables();
    (items[0] || modal.querySelector<HTMLElement>(".dialog") || modal).focus();
  });
  observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
}

export function closeModal(modal: HTMLElement) {
  modal.hidden = true;
}

function headerMenus(): HTMLDetailsElement[] {
  return [
    ...document.querySelectorAll<HTMLDetailsElement>(
      ".account-menu, .lang-details",
    ),
  ];
}

function closeHeaderMenus(except?: HTMLDetailsElement) {
  for (const menu of headerMenus()) {
    if (menu !== except) menu.open = false;
  }
}

function exclusiveDetails() {
  const menus = headerMenus();
  menus.forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (menu.open) closeHeaderMenus(menu);
    });
  });

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const inside = menus.some((menu) => menu.open && menu.contains(target));
    if (!inside) closeHeaderMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeHeaderMenus();
  });
}

export function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const paint = (theme: "light" | "dark") => {
    document.documentElement.dataset.theme = theme;
    btn.setAttribute(
      "aria-label",
      theme === "dark"
        ? btn.getAttribute("data-label-light") || "Switch to light"
        : btn.getAttribute("data-label-dark") || "Switch to dark",
    );
    document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
      node.setAttribute("content", theme === "dark" ? "#0B0E17" : "#F7F7FB");
      node.removeAttribute("media");
    });
  };

  const current = (): "light" | "dark" =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";

  paint(current());
  btn.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    paint(next);
    try {
      localStorage.setItem("dropimg:theme", next);
    } catch {
      // ignore
    }
  });
}

export function setupLanguageLinks() {
  document.querySelectorAll(".lang-menu a").forEach((node) => {
    node.addEventListener("click", (event) => {
      const hrefLang = node.getAttribute("hreflang");
      if (hrefLang) {
        rememberLocaleChoice(hrefLang === "pt-BR" ? "pt-BR" : hrefLang);
      }
      const href = node.getAttribute("href");
      if (!href) return;
      try {
        const next = new URL(href, location.href);
        if (next.pathname === location.pathname) {
          event.preventDefault();
          location.reload();
        }
      } catch {
        // let the browser follow the link
      }
    });
  });
}

/** Fades the header background in once the page has scrolled past the hero edge. */
export function setupHeaderScroll() {
  if (!document.querySelector(".top")) return;
  let ticking = false;
  const apply = () => {
    ticking = false;
    const scrolled = window.scrollY > 8;
    if (scrolled) document.body.dataset.scrolled = "true";
    else delete document.body.dataset.scrolled;
  };
  apply();
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    },
    { passive: true },
  );
}

/** Reveals `[data-enter]` elements as they come into view. */
export function setupEntrance() {
  const targets = [...document.querySelectorAll<HTMLElement>("[data-enter]")];
  if (targets.length === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const delay = Number(el.dataset.enterDelay || 0);
        if (delay > 0) el.style.transitionDelay = `${delay}ms`;
        el.classList.add("is-in");
        observer.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
  );
  targets.forEach((el) => observer.observe(el));
}

const TOAST_ICONS: Record<string, string> = {
  success: '<path d="M4 12.5l5 5L20 6.5"/>',
  danger: '<path d="M12 8v5"/><path d="M12 16.5v.01"/><circle cx="12" cy="12" r="9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5v.01"/>',
};

function toastRegion(): HTMLElement {
  let region = document.getElementById("toast-region");
  if (region) return region;
  region = document.createElement("div");
  region.id = "toast-region";
  region.className = "toast-region";
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  document.body.appendChild(region);
  return region;
}

/** Shows a small transient confirmation. Announced via the shared live region. */
export function toast(
  message: string,
  tone: "success" | "danger" | "info" = "success",
  ms = 2600,
) {
  const region = toastRegion();
  const node = document.createElement("div");
  node.className = "toast";
  node.dataset.tone = tone;
  node.innerHTML = `<svg class="toast-icon icon" viewBox="0 0 24 24" aria-hidden="true">${TOAST_ICONS[tone] ?? TOAST_ICONS.info}</svg><span></span>`;
  node.querySelector("span")!.textContent = message;
  region.appendChild(node);

  window.setTimeout(() => {
    node.classList.add("is-leaving");
    window.setTimeout(() => node.remove(), 200);
  }, ms);
}

async function claimLocalRecent() {
  const items = loadRecentForClaim().map((d) => ({
    slug: d.slug,
    deleteToken: d.deleteToken,
  }));
  if (items.length === 0) return;
  try {
    await fetch("/api/account/claim", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  } catch {
    // local recent still works
  }
}

function loadRecentForClaim(): { slug: string; deleteToken: string; expiresAt: number }[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      slug?: string;
      deleteToken?: string;
      expiresAt?: number;
    }[];
    const now = Date.now() / 1000;
    return parsed.filter(
      (d): d is { slug: string; deleteToken: string; expiresAt: number } =>
        Boolean(d.slug && d.deleteToken && d.expiresAt && d.expiresAt > now),
    );
  } catch {
    return [];
  }
}
