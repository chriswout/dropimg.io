import type { Locale } from "../../marketing/locales";
import { mediaEnabled } from "../lib/media-config";
import { renderSitePage } from "./site-page";

/**
 * The signed-in area. Every authenticated screen renders inside this shell so
 * the four sections read as one product rather than four separate pages.
 */

export type AppSection = "drops" | "media" | "integrations" | "billing" | "account";

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
  planWebAssetsFree: string;
  planWebAssetsDeveloper: string;
  planWebAssetsPro: string;
  upgrade: string;
  upgradeHint: string;
  drops: SectionCopy;
  media: SectionCopy;
  integrations: SectionCopy;
  billing: SectionCopy;
  account: SectionCopy;
};

export const SHELL_COPY: Record<Locale, ShellCopy> = {
  en: {
    navAria: "Sections",
    skip: "Skip to content",
    planFree: "Drops — Free",
    planPro: "Drops — Drops Pro",
    planWebAssetsFree: "Web Assets — Free",
    planWebAssetsDeveloper: "Web Assets — Developer",
    planWebAssetsPro: "Web Assets — Pro",
    upgrade: "Drops Pro",
    upgradeHint: "Longer Drop links and password protection.",
    drops: {
      nav: "My Drops",
      title: "My Drops",
      lede: "Every link you have live right now.",
    },
    media: {
      nav: "Web Assets",
      title: "Web Assets",
      lede: "Permanent files for a website, landing page, or storefront.",
    },
    integrations: {
      nav: "Integrations",
      title: "Integrations",
      lede: "Connect DropIMG to tools you already use.",
    },
    billing: {
      nav: "Billing",
      title: "Plan and billing",
      lede: "Your Drops and Web Assets plans, and how they renew.",
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
    planFree: "Drops — Gratis",
    planPro: "Drops — Drops Pro",
    planWebAssetsFree: "Web Assets — Gratis",
    planWebAssetsDeveloper: "Web Assets — Developer",
    planWebAssetsPro: "Web Assets — Pro",
    upgrade: "Drops Pro",
    upgradeHint: "Enlaces de Drop más largos y contraseña.",
    drops: {
      nav: "Mis envíos",
      title: "Mis envíos",
      lede: "Todos los enlaces que tienes activos ahora.",
    },
    media: {
      nav: "Web Assets",
      title: "Web Assets",
      lede: "Archivos permanentes para un sitio, landing o tienda.",
    },
    integrations: {
      nav: "Integraciones",
      title: "Integraciones",
      lede: "Conecta DropIMG a las herramientas que ya usas.",
    },
    billing: {
      nav: "Facturación",
      title: "Plan y facturación",
      lede: "Tus planes de Drops y Web Assets, y cómo se renuevan.",
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
    planFree: "Drops — Grátis",
    planPro: "Drops — Drops Pro",
    planWebAssetsFree: "Web Assets — Grátis",
    planWebAssetsDeveloper: "Web Assets — Developer",
    planWebAssetsPro: "Web Assets — Pro",
    upgrade: "Drops Pro",
    upgradeHint: "Links de Drop mais longos e senha.",
    drops: {
      nav: "Meus envios",
      title: "Meus envios",
      lede: "Todos os links que você tem ativos agora.",
    },
    media: {
      nav: "Web Assets",
      title: "Web Assets",
      lede: "Arquivos permanentes para um site, landing ou loja.",
    },
    integrations: {
      nav: "Integrações",
      title: "Integrações",
      lede: "Conecte o DropIMG às ferramentas que você já usa.",
    },
    billing: {
      nav: "Cobrança",
      title: "Plano e cobrança",
      lede: "Seus planos de Drops e Web Assets, e como eles renovam.",
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
    planFree: "Drops — Kostenlos",
    planPro: "Drops — Drops Pro",
    planWebAssetsFree: "Web Assets — Kostenlos",
    planWebAssetsDeveloper: "Web Assets — Developer",
    planWebAssetsPro: "Web Assets — Pro",
    upgrade: "Drops Pro",
    upgradeHint: "Längere Drop-Links und Passwortschutz.",
    drops: {
      nav: "Meine Drops",
      title: "Meine Drops",
      lede: "Alle Links, die gerade aktiv sind.",
    },
    media: {
      nav: "Web Assets",
      title: "Web Assets",
      lede: "Dauerhafte Dateien für Website, Landingpage oder Shop.",
    },
    integrations: {
      nav: "Integrationen",
      title: "Integrationen",
      lede: "Verbinde DropIMG mit Tools, die du schon nutzt.",
    },
    billing: {
      nav: "Abrechnung",
      title: "Plan und Abrechnung",
      lede: "Deine Drops- und Web-Assets-Pläne und wie sie sich verlängern.",
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
  media: "/app/media",
  integrations: "/app/integrations",
  billing: "/app/billing",
  account: "/app/account",
};

const SECTION_ORDER: AppSection[] = [
  "media",
  "drops",
  "integrations",
  "billing",
  "account",
];

const SECTION_ICON: Record<AppSection, string> = {
  drops: `<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" /><path d="m4.6 16.2 4-3.7a1.8 1.8 0 0 1 2.5 0l4.6 4.3" /><circle cx="9" cy="9" r="1.4" />`,
  media: `<path d="M4 7.2A2.2 2.2 0 0 1 6.2 5h11.6A2.2 2.2 0 0 1 20 7.2v9.6A2.2 2.2 0 0 1 17.8 19H6.2A2.2 2.2 0 0 1 4 16.8z" /><path d="M8 12.5 10.2 10l3.3 4 2-1.8L16 14" />`,
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
  env: { ENVIRONMENT?: string; MEDIA_ENABLED?: string };
  section: AppSection;
  title: string;
  plan: "free" | "pro";
  webAssetsPlan?: "free" | "developer" | "pro";
  main: string;
  heading?: string;
  lede?: string;
  actions?: string;
  extraBody?: string;
}): string {
  const shell = SHELL_COPY[opts.locale];
  const section = shell[opts.section];
  const sections = mediaEnabled(opts.env)
    ? SECTION_ORDER
    : SECTION_ORDER.filter((key) => key !== "media");

  const nav = sections.map((key) => {
    const current = key === opts.section;
    return `          <a class="app-nav-link" href="${SECTION_PATH[key]}"${current ? ' aria-current="page"' : ""}>
            <svg class="app-nav-icon icon" viewBox="0 0 24 24" aria-hidden="true">${SECTION_ICON[key]}</svg>
            <span>${esc(shell[key].nav)}</span>
          </a>`;
  }).join("\n");

  const waPlan = opts.webAssetsPlan ?? "free";
  const waLabel =
    waPlan === "pro"
      ? shell.planWebAssetsPro
      : waPlan === "developer"
        ? shell.planWebAssetsDeveloper
        : shell.planWebAssetsFree;
  const dropsLabel = opts.plan === "pro" ? shell.planPro : shell.planFree;

  const planCard =
    opts.section === "billing"
      ? ""
      : `<div class="app-plan-card${opts.plan === "pro" || waPlan !== "free" ? " is-pro" : ""}">
          <p class="app-plan-name">${esc(waLabel)}</p>
          <p class="app-plan-name">${esc(dropsLabel)}</p>
          ${
            opts.plan === "pro"
              ? ""
              : `<p class="app-plan-hint">${esc(shell.upgradeHint)}</p>
          <a class="btn primary btn-sm" href="/pro">${esc(shell.upgrade)}</a>`
          }
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
