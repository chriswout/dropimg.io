const LOCALE_KEY = "dropimg:locale";
const RECENT_KEY = "dropimg:recent";

export type AccountMe = {
  user: { id: string; email: string } | null;
  entitlements?: {
    plan: string;
    maxUploadBytes: number;
    allowedExpirySeconds: number[];
    passwordProtection: boolean;
  };
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
  const planEl = document.getElementById("account-plan");
  const planBadge = document.getElementById("account-plan-badge");
  const signout = document.getElementById("account-signout");
  const accountMenu = document.querySelector<HTMLDetailsElement>(".account-menu");
  if (!signin || !sessionEl || !emailEl || !signout) return;

  exclusiveDetails();

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
      applyPlanState(planEl, planBadge, data.entitlements?.plan === "pro");
      signin.hidden = true;
      sessionEl.hidden = false;
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
    applyPlanState(planEl, planBadge, false);
    if (planEl) {
      planEl.hidden = true;
      planEl.textContent = "";
      planEl.removeAttribute("data-plan");
    }
  });
}

function applyPlanState(
  planEl: HTMLElement | null,
  badgeEl: HTMLElement | null,
  isPro: boolean,
) {
  if (planEl) {
    if (isPro) {
      planEl.hidden = true;
      planEl.removeAttribute("data-plan");
    } else {
      planEl.textContent =
        planEl.getAttribute("data-label-upgrade") || "Upgrade to Pro";
      planEl.dataset.plan = "free";
      planEl.hidden = false;
    }
  }
  if (badgeEl) badgeEl.hidden = !isPro;
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
      node.setAttribute("content", theme === "dark" ? "#07101C" : "#F8FAFC");
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
