import type { Locale } from "../../marketing/locales";
import { renderSitePage } from "./site-page";

/**
 * The signed-in area. Every authenticated screen renders inside this shell so
 * the four sections read as one product rather than four separate pages.
 */

export type AppSection = "drops" | "integrations" | "billing" | "account";

type SectionCopy = {
  nav: string;
  title: string;
  lede: string;
};

type ShellCopy = {
  navAria: string;
  skip: string;
  planFree: string;
  planPro: string;
  upgrade: string;
  upgradeHint: string;
  drops: SectionCopy;
  integrations: SectionCopy;
  billing: SectionCopy;
  account: SectionCopy;
};

export const SHELL_COPY: Record<Locale, ShellCopy> = {
  en: {
    navAria: "Sections",
    skip: "Skip to content",
    planFree: "Free plan",
    planPro: "Pro plan",
    upgrade: "Upgrade to Pro",
    upgradeHint: "Bigger uploads, longer links, passwords.",
    drops: {
      nav: "My drops",
      title: "My drops",
      lede: "Every link you have live right now.",
    },
    integrations: {
      nav: "Integrations",
      title: "Integrations",
      lede: "Connect DropIMG to tools you already use.",
    },
    billing: {
      nav: "Billing",
      title: "Plan and billing",
      lede: "Your plan, renewal date, and invoices.",
    },
    account: {
      nav: "Account",
      title: "Account",
      lede: "Sign-in, sessions, and closing your account.",
    },
  },
  es: {
    navAria: "Secciones",
    skip: "Ir al contenido",
    planFree: "Plan gratis",
    planPro: "Plan Pro",
    upgrade: "Mejorar a Pro",
    upgradeHint: "Más tamaño, más tiempo, contraseñas.",
    drops: {
      nav: "Mis envíos",
      title: "Mis envíos",
      lede: "Todos los enlaces que tienes activos ahora.",
    },
    integrations: {
      nav: "Integraciones",
      title: "Integraciones",
      lede: "Conecta DropIMG a las herramientas que ya usas.",
    },
    billing: {
      nav: "Facturación",
      title: "Plan y facturación",
      lede: "Tu plan, la fecha de renovación y las facturas.",
    },
    account: {
      nav: "Cuenta",
      title: "Cuenta",
      lede: "Acceso, sesiones y cierre de cuenta.",
    },
  },
  "pt-BR": {
    navAria: "Seções",
    skip: "Ir para o conteúdo",
    planFree: "Plano grátis",
    planPro: "Plano Pro",
    upgrade: "Assinar o Pro",
    upgradeHint: "Mais tamanho, mais tempo, senhas.",
    drops: {
      nav: "Meus envios",
      title: "Meus envios",
      lede: "Todos os links que você tem ativos agora.",
    },
    integrations: {
      nav: "Integrações",
      title: "Integrações",
      lede: "Conecte o DropIMG às ferramentas que você já usa.",
    },
    billing: {
      nav: "Cobrança",
      title: "Plano e cobrança",
      lede: "Seu plano, a data de renovação e as faturas.",
    },
    account: {
      nav: "Conta",
      title: "Conta",
      lede: "Login, sessões e encerramento da conta.",
    },
  },
  de: {
    navAria: "Bereiche",
    skip: "Zum Inhalt",
    planFree: "Kostenloser Plan",
    planPro: "Pro-Plan",
    upgrade: "Auf Pro upgraden",
    upgradeHint: "Größer, länger, mit Passwort.",
    drops: {
      nav: "Meine Drops",
      title: "Meine Drops",
      lede: "Alle Links, die gerade aktiv sind.",
    },
    integrations: {
      nav: "Integrationen",
      title: "Integrationen",
      lede: "Verbinde DropIMG mit Tools, die du schon nutzt.",
    },
    billing: {
      nav: "Abrechnung",
      title: "Plan und Abrechnung",
      lede: "Dein Plan, das Verlängerungsdatum und Rechnungen.",
    },
    account: {
      nav: "Konto",
      title: "Konto",
      lede: "Anmeldung, Sitzungen und Kontoschließung.",
    },
  },
};

const SECTION_PATH: Record<AppSection, string> = {
  drops: "/app",
  integrations: "/app/integrations",
  billing: "/app/billing",
  account: "/app/account",
};

const SECTION_ORDER: AppSection[] = [
  "drops",
  "integrations",
  "billing",
  "account",
];

const SECTION_ICON: Record<AppSection, string> = {
  drops: `<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" /><path d="m4.6 16.2 4-3.7a1.8 1.8 0 0 1 2.5 0l4.6 4.3" /><circle cx="9" cy="9" r="1.4" />`,
  integrations: `<path d="M8.5 3.5v4" /><path d="M15.5 3.5v4" /><path d="M6 7.5h12v4.8a6 6 0 0 1-12 0z" /><path d="M12 18.3V21" />`,
  billing: `<rect x="3" y="6" width="18" height="12" rx="2.2" /><path d="M3 10.2h18" />`,
  account: `<circle cx="12" cy="8.4" r="3.6" /><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />`,
};

/**
 * Renders a signed-in page: global chrome, section nav, page header, content.
 * `actions` sits beside the heading on desktop and wraps below it on mobile.
 */
export function renderAppShellPage(opts: {
  locale: Locale;
  env: { ENVIRONMENT?: string };
  section: AppSection;
  title: string;
  plan: "free" | "pro";
  main: string;
  heading?: string;
  lede?: string;
  actions?: string;
  extraBody?: string;
}): string {
  const shell = SHELL_COPY[opts.locale];
  const section = shell[opts.section];

  const nav = SECTION_ORDER.map((key) => {
    const current = key === opts.section;
    return `          <a class="app-nav-link" href="${SECTION_PATH[key]}"${current ? ' aria-current="page"' : ""}>
            <svg class="app-nav-icon icon" viewBox="0 0 24 24" aria-hidden="true">${SECTION_ICON[key]}</svg>
            <span>${esc(shell[key].nav)}</span>
          </a>`;
  }).join("\n");

  // Billing already leads with plan state; a sidebar card would just repeat it.
  const planCard =
    opts.section === "billing"
      ? ""
      : opts.plan === "pro"
        ? `<p class="app-plan-card is-pro">${esc(shell.planPro)}</p>`
        : `<div class="app-plan-card">
          <p class="app-plan-name">${esc(shell.planFree)}</p>
          <p class="app-plan-hint">${esc(shell.upgradeHint)}</p>
          <a class="btn primary btn-sm" href="/pro">${esc(shell.upgrade)}</a>
        </div>`;

  const main = `<div class="app-shell">
      <div class="app-side">
        <nav class="app-nav" aria-label="${esc(shell.navAria)}">
${nav}
        </nav>
        ${planCard}
      </div>
      <div class="app-content">
        <header class="app-head">
          <div class="app-head-text">
            <h1 class="app-title">${esc(opts.heading ?? section.title)}</h1>
            <p class="app-lede">${esc(opts.lede ?? section.lede)}</p>
          </div>
          ${opts.actions ?? ""}
        </header>
        ${opts.main}
      </div>
    </div>`;

  return renderSitePage({
    locale: opts.locale,
    title: opts.title,
    env: opts.env,
    skipLabel: shell.skip,
    stayPath: SECTION_PATH[opts.section],
    bodyClass: "page-app",
    mainClass: "app-main",
    main,
    extraBody: opts.extraBody,
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
