import { LOCALE_CONFIG, type Locale } from "../../marketing/locales";
import { renderSitePage, siteHtmlResponse } from "./site-page";

type Copy = {
  title: string;
  kicker: string;
  heading: string;
  memberHeading: string;
  lede: string;
  memberLede: string;
  monthly: string;
  annual: string;
  monthlyPrice: string;
  annualPrice: string;
  monthlyNote: string;
  annualNote: string;
  save: string;
  buyMonthly: string;
  buyAnnual: string;
  signIn: string;
  manage: string;
  account: string;
  waiting: string;
  skip: string;
  renews: (date: string) => string;
  ends: (date: string) => string;
  features: [string, string, string, string];
};

const COPY: Record<Locale, Copy> = {
  en: {
    title: "DropIMG Pro — $1.99/month",
    kicker: "DropIMG Pro",
    heading: "Longer links. Passwords. Bigger files.",
    memberHeading: "You’re on Pro",
    lede: "Anonymous 24h drops stay free. Pro is for the links you need to keep around.",
    memberLede: "Cancel anytime from billing.",
    monthly: "Monthly",
    annual: "Annual",
    monthlyPrice: "$1.99",
    annualPrice: "$19.99",
    monthlyNote: "per month",
    annualNote: "per year",
    save: "Two months free",
    buyMonthly: "Get monthly",
    buyAnnual: "Get annual",
    signIn: "Sign in to upgrade",
    manage: "Manage billing",
    account: "Account",
    waiting: "Activating Pro…",
    skip: "Skip to plans",
    renews: (date) => `Renews ${date}.`,
    ends: (date) => `Access through ${date}.`,
    features: [
      "7-day and 30-day links",
      "Password-protected drops",
      "50 MB uploads",
      "Full history in My drops",
    ],
  },
  es: {
    title: "DropIMG Pro — $1.99/mes",
    kicker: "DropIMG Pro",
    heading: "Enlaces más largos. Contraseña. Archivos más grandes.",
    memberHeading: "Ya tienes Pro",
    lede: "Los envíos anónimos de 24 h siguen gratis. Pro es para los enlaces que quieres conservar.",
    memberLede: "Cancela cuando quieras desde facturación.",
    monthly: "Mensual",
    annual: "Anual",
    monthlyPrice: "$1.99",
    annualPrice: "$19.99",
    monthlyNote: "al mes",
    annualNote: "al año",
    save: "Dos meses gratis",
    buyMonthly: "Elegir mensual",
    buyAnnual: "Elegir anual",
    signIn: "Entra para mejorar",
    manage: "Gestionar facturación",
    account: "Cuenta",
    waiting: "Activando Pro…",
    skip: "Ir a los planes",
    renews: (date) => `Se renueva el ${date}.`,
    ends: (date) => `Acceso hasta el ${date}.`,
    features: [
      "Enlaces de 7 y 30 días",
      "Drops con contraseña",
      "Subidas de 50 MB",
      "Historial completo",
    ],
  },
  "pt-BR": {
    title: "DropIMG Pro — $1.99/mês",
    kicker: "DropIMG Pro",
    heading: "Links mais longos. Senha. Arquivos maiores.",
    memberHeading: "Você já é Pro",
    lede: "Drops anônimos de 24h continuam grátis. Pro é para o link que você precisa manter.",
    memberLede: "Cancele quando quiser na cobrança.",
    monthly: "Mensal",
    annual: "Anual",
    monthlyPrice: "$1.99",
    annualPrice: "$19.99",
    monthlyNote: "por mês",
    annualNote: "por ano",
    save: "Dois meses grátis",
    buyMonthly: "Assinar mensal",
    buyAnnual: "Assinar anual",
    signIn: "Entre para assinar",
    manage: "Gerenciar cobrança",
    account: "Conta",
    waiting: "Ativando Pro…",
    skip: "Ir para os planos",
    renews: (date) => `Renova em ${date}.`,
    ends: (date) => `Acesso até ${date}.`,
    features: [
      "Links de 7 e 30 dias",
      "Drops com senha",
      "Uploads de 50 MB",
      "Histórico completo",
    ],
  },
  de: {
    title: "DropIMG Pro — $1.99/Monat",
    kicker: "DropIMG Pro",
    heading: "Längere Links. Passwort. Größere Dateien.",
    memberHeading: "Du bist Pro",
    lede: "Anonyme 24h-Drops bleiben kostenlos. Pro ist für Links, die bleiben sollen.",
    memberLede: "Jederzeit in der Abrechnung kündbar.",
    monthly: "Monatlich",
    annual: "Jährlich",
    monthlyPrice: "$1.99",
    annualPrice: "$19.99",
    monthlyNote: "pro Monat",
    annualNote: "pro Jahr",
    save: "Zwei Monate gratis",
    buyMonthly: "Monatlich holen",
    buyAnnual: "Jährlich holen",
    signIn: "Anmelden zum Upgrade",
    manage: "Abrechnung verwalten",
    account: "Konto",
    waiting: "Pro wird aktiviert…",
    skip: "Zu den Plänen",
    renews: (date) => `Verlängert sich am ${date}.`,
    ends: (date) => `Zugang bis ${date}.`,
    features: [
      "7- und 30-Tage-Links",
      "Passwortgeschützte Drops",
      "50-MB-Uploads",
      "Volle Historie",
    ],
  },
};

export function renderProPage(opts: {
  locale: Locale;
  env: { ENVIRONMENT?: string };
  signedIn: boolean;
  plan: string;
  billingOn: boolean;
  periodEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
}): Response {
  const t = COPY[opts.locale];
  const perks = `<ul class="pro-perks">${t.features
    .map((f) => `<li>${esc(f)}</li>`)
    .join("")}</ul>`;
  const isPro = opts.plan === "pro";
  const period =
    isPro && opts.periodEnd
      ? opts.cancelAtPeriodEnd
        ? t.ends(formatDay(opts.periodEnd, opts.locale))
        : t.renews(formatDay(opts.periodEnd, opts.locale))
      : "";

  const memberLede = [period, t.memberLede].filter(Boolean).join(" ");
  const cardCta = (interval: "monthly" | "annual", label: string) =>
    !opts.billingOn
      ? ""
      : !opts.signedIn
        ? `<a class="btn primary" href="/login">${esc(t.signIn)}</a>`
        : `<button type="button" class="btn primary" data-interval="${interval}">${esc(label)}</button>`;

  const plans = `<div class="pro-plans">
      <article class="pro-card">
        <h2>${esc(t.monthly)}</h2>
        <p class="pro-price">${esc(t.monthlyPrice)}</p>
        <p class="pro-note">${esc(t.monthlyNote)}</p>
        ${cardCta("monthly", t.buyMonthly)}
      </article>
      <article class="pro-card pro-card-featured">
        <p class="pro-save">${esc(t.save)}</p>
        <h2>${esc(t.annual)}</h2>
        <p class="pro-price">${esc(t.annualPrice)}</p>
        <p class="pro-note">${esc(t.annualNote)}</p>
        ${cardCta("annual", t.buyAnnual)}
      </article>
    </div>`;

  const billingOff = !opts.billingOn
    ? `<p class="pro-note">Checkout is off in this environment.</p>`
    : "";

  const hero = isPro
    ? `<header class="pro-hero">
      <p class="pro-kicker">${esc(t.kicker)}</p>
      <h1>${esc(t.memberHeading)}</h1>
      <p class="pro-lede">${esc(memberLede)}</p>
      <div class="pro-hero-actions">
        ${opts.billingOn ? `<button type="button" class="btn primary" id="pro-portal">${esc(t.manage)}</button>` : ""}
        <a class="btn secondary" href="/account">${esc(t.account)}</a>
      </div>
    </header>`
    : `<header class="pro-hero">
      <p class="pro-kicker">${esc(t.kicker)}</p>
      <h1>${esc(t.heading)}</h1>
      <p class="pro-lede">${esc(t.lede)}</p>
    </header>`;

  const main = `<section class="pro-page" id="pro-app"
    data-signed-in="${opts.signedIn ? "1" : "0"}"
    data-plan="${esc(opts.plan)}"
    data-billing="${opts.billingOn ? "1" : "0"}">
    ${hero}
    ${perks}
    ${isPro ? "" : plans}
    ${billingOff}
    <p id="pro-status" class="pro-note pro-status" hidden>${esc(t.waiting)}</p>
  </section>`;

  const html = renderSitePage({
    locale: opts.locale,
    title: t.title,
    env: opts.env,
    main,
    skipLabel: t.skip,
    stayPath: "/pro",
    robots: "index",
    extraHead:
      opts.env.ENVIRONMENT === "development"
        ? ""
        : `<script src="https://cdn.paddle.com/paddle/v2/paddle.js" defer></script>`,
    extraBody:
      opts.env.ENVIRONMENT === "development"
        ? `<script type="module" src="/client/pro.ts"></script>`
        : `<script src="/pro.js" defer></script>`,
  });
  return siteHtmlResponse(html, 200, { robots: "index", cache: "private" });
}

function formatDay(unix: number, locale: Locale): string {
  return new Date(unix * 1000).toLocaleDateString(LOCALE_CONFIG[locale].htmlLang, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
