"use strict";
(() => {
  // client/chrome.ts
  var LOCALE_KEY = "dropimg:locale";
  var RECENT_KEY = "dropimg:recent";
  var accountUser = null;
  var accountEntitlements = null;
  var accountReady = Promise.resolve();
  function rememberLocaleChoice(code) {
    try {
      localStorage.setItem(LOCALE_KEY, code);
    } catch {
    }
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `dropimg_locale=${encodeURIComponent(code)}; Path=/; SameSite=Lax; Max-Age=${365 * 24 * 60 * 60}${secure}`;
  }
  function setupAccountNav() {
    const signin = document.getElementById("account-signin");
    const sessionEl = document.getElementById("account-session");
    const emailEl = document.getElementById("account-email");
    const emailFullEl = document.getElementById("account-email-full");
    const planEl = document.getElementById("account-plan");
    const planBadge = document.getElementById("account-plan-badge");
    const signout = document.getElementById("account-signout");
    const accountMenu = document.querySelector(".account-menu");
    if (!signin || !sessionEl || !emailEl || !signout) return;
    exclusiveDetails();
    accountReady = (async () => {
      try {
        const res = await fetch("/api/account/me", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = await res.json();
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
      }
    })();
    signout.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin"
        });
      } catch {
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
  function applyPlanState(planEl, badgeEl, isPro) {
    if (planEl) {
      if (isPro) {
        planEl.hidden = true;
        planEl.removeAttribute("data-plan");
      } else {
        planEl.textContent = planEl.getAttribute("data-label-upgrade") || "Upgrade to Pro";
        planEl.dataset.plan = "free";
        planEl.hidden = false;
      }
    }
    if (badgeEl) badgeEl.hidden = !isPro;
  }
  function headerMenus() {
    return [
      ...document.querySelectorAll(
        ".account-menu, .lang-details"
      )
    ];
  }
  function closeHeaderMenus(except) {
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
  function setupThemeToggle() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const paint = (theme) => {
      document.documentElement.dataset.theme = theme;
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? btn.getAttribute("data-label-light") || "Switch to light" : btn.getAttribute("data-label-dark") || "Switch to dark"
      );
      document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
        node.setAttribute("content", theme === "dark" ? "#07101C" : "#F8FAFC");
        node.removeAttribute("media");
      });
    };
    const current = () => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    paint(current());
    btn.addEventListener("click", () => {
      const next = current() === "dark" ? "light" : "dark";
      paint(next);
      try {
        localStorage.setItem("dropimg:theme", next);
      } catch {
      }
    });
  }
  function setupLanguageLinks() {
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
        }
      });
    });
  }
  async function claimLocalRecent() {
    const items = loadRecentForClaim().map((d) => ({
      slug: d.slug,
      deleteToken: d.deleteToken
    }));
    if (items.length === 0) return;
    try {
      await fetch("/api/account/claim", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
    } catch {
    }
  }
  function loadRecentForClaim() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const now = Date.now() / 1e3;
      return parsed.filter(
        (d) => Boolean(d.slug && d.deleteToken && d.expiresAt && d.expiresAt > now)
      );
    } catch {
      return [];
    }
  }

  // client/chrome-boot.ts
  setupAccountNav();
  setupThemeToggle();
  setupLanguageLinks();
})();
