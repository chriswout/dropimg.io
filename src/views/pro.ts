import { LOCALE_CONFIG, type Locale } from "../../marketing/locales";
import { proHeadTags, proPath, PRO_SEO } from "../../marketing/pro";
import { renderSitePage, siteHtmlResponse } from "./site-page";

type Copy = {
  title: string;
  kicker: string;
  heading: string;
  memberHeading: string;
  lede: string;
  ledeMore: string;
  memberLede: string;
  monthly: string;
  annual: string;
  monthlyPrice: string;
  annualPrice: string;
  monthlyNote: string;
  annualNote: string;
  annualPerMonth: string;
  save: string;
  /** Short badge on the annual option. Not "Most popular" — there is one plan. */
  bestValue: string;
  /** Accessible name for the Monthly / Annual segmented control. */
  intervalAria: string;
  /** Nudge shown while Monthly is selected. */
  annualHint: string;
  getPro: string;
  signIn: string;
  manage: string;
  waiting: string;
  activating: string;
  activatingTimeout: string;
  checkoutUnavailable: string;
  checkoutCouldNotOpen: string;
  billingOff: string;
  skip: string;
  note: string;
  renews: (date: string) => string;
  ends: (date: string) => string;
  features: [string, string, string, string, string, string, string];
};

export const PRO_COPY: Record<Locale, Copy> = {
  en: {
    title: PRO_SEO.en.title,
    kicker: "DropIMG Pro",
    heading: "DropIMG Pro",
    memberHeading: "You're on DropIMG Pro",
    lede: "More control for people who use DropIMG every day.",
    ledeMore:
      "Keep links longer, manage your uploads across devices, and protect what you share.",
    memberLede: "Cancel anytime from billing.",
    monthly: "Monthly",
    annual: "Annual",
    monthlyPrice: "$2.99",
    annualPrice: "$24.99",
    monthlyNote: "/ month",
    annualNote: "/ year",
    annualPerMonth: "$2.08/mo",
    save: "Save 30%",
    bestValue: "Best value",
    intervalAria: "Billing interval",
    annualHint: "Pay yearly and save 30%.",
    getPro: "Get Pro",
    signIn: "Sign in to get Pro",
    manage: "Manage billing",
    waiting: "Opening checkout…",
    activating: "Payment received. Activating Pro…",
    activatingTimeout:
      "Your payment was received. Pro is still activating. Refresh My drops in a moment.",
    checkoutUnavailable: "Checkout isn’t available right now. Try again shortly.",
    checkoutCouldNotOpen: "Checkout could not open. Try again shortly.",
    billingOff: "Billing isn’t available right now.",
    skip: "Skip to plans",
    note: "DropIMG stays temporary. Even Pro links expire after a maximum of 90 days.",
    renews: (date) => `Renews ${date}`,
    ends: (date) => `Ends ${date}`,
    features: [
      "Choose 1 hour to 90 days",
      "Upload images up to 50 MB",
      "Full active upload history",
      "Sync across devices",
      "Password-protected links",
      "Extension + ShareX account uploads",
      "Always ad-free",
    ],
  },
  es: {
    title: PRO_SEO.es.title,
    kicker: "DropIMG Pro",
    heading: "DropIMG Pro",
    memberHeading: "Estás en DropIMG Pro",
    lede: "Más control si usas DropIMG a diario.",
    ledeMore:
      "Conserva enlaces más tiempo, gestiona tus envíos en todos tus dispositivos y protege lo que compartes.",
    memberLede: "Cancela cuando quieras desde facturación.",
    monthly: "Mensual",
    annual: "Anual",
    monthlyPrice: "$2.99",
    annualPrice: "$24.99",
    monthlyNote: "/ mes",
    annualNote: "/ año",
    annualPerMonth: "$2.08/mes",
    save: "Ahorra 30%",
    bestValue: "Mejor precio",
    intervalAria: "Periodo de facturación",
    annualHint: "Paga al año y ahorra un 30%.",
    getPro: "Obtener Pro",
    signIn: "Entra para obtener Pro",
    manage: "Gestionar facturación",
    waiting: "Abriendo el pago…",
    activating: "Pago recibido. Activando Pro…",
    activatingTimeout:
      "Recibimos el pago. Pro se está activando. Actualiza Mis envíos en un momento.",
    checkoutUnavailable: "El pago no está disponible ahora. Prueba en un momento.",
    checkoutCouldNotOpen: "No se pudo abrir el pago. Prueba en un momento.",
    billingOff: "La facturación no está disponible ahora.",
    skip: "Ir a los planes",
    note: "DropIMG sigue siendo temporal. Incluso los enlaces Pro caducan a los 90 días como máximo.",
    renews: (date) => `Se renueva el ${date}`,
    ends: (date) => `Termina el ${date}`,
    features: [
      "Elige de 1 hora a 90 días",
      "Imágenes de hasta 50 MB",
      "Historial activo completo",
      "Sincroniza entre dispositivos",
      "Enlaces con contraseña",
      "Subidas con extensión y ShareX",
      "Siempre sin anuncios",
    ],
  },
  "pt-BR": {
    title: PRO_SEO["pt-BR"].title,
    kicker: "DropIMG Pro",
    heading: "DropIMG Pro",
    memberHeading: "Você está no DropIMG Pro",
    lede: "Mais controle pra quem usa o DropIMG todo dia.",
    ledeMore:
      "Mantenha links por mais tempo, gerencie envios em todos os dispositivos e proteja o que você compartilha.",
    memberLede: "Cancele quando quiser na cobrança.",
    monthly: "Mensal",
    annual: "Anual",
    monthlyPrice: "$2.99",
    annualPrice: "$24.99",
    monthlyNote: "/ mês",
    annualNote: "/ ano",
    annualPerMonth: "$2.08/mês",
    save: "Economize 30%",
    bestValue: "Melhor valor",
    intervalAria: "Período de cobrança",
    annualHint: "Pague por ano e economize 30%.",
    getPro: "Assinar Pro",
    signIn: "Entre para assinar Pro",
    manage: "Gerenciar cobrança",
    waiting: "Abrindo o pagamento…",
    activating: "Pagamento recebido. Ativando Pro…",
    activatingTimeout:
      "Seu pagamento foi recebido. O Pro ainda está ativando. Atualize Meus envios daqui a pouco.",
    checkoutUnavailable: "O pagamento não está disponível agora. Tente em instantes.",
    checkoutCouldNotOpen: "Não deu pra abrir o pagamento. Tente de novo.",
    billingOff: "A cobrança não está disponível agora.",
    skip: "Ir para os planos",
    note: "O DropIMG continua temporário. Até links Pro expiram no máximo em 90 dias.",
    renews: (date) => `Renova em ${date}`,
    ends: (date) => `Termina em ${date}`,
    features: [
      "Escolha de 1 hora a 90 dias",
      "Imagens de até 50 MB",
      "Histórico ativo completo",
      "Sincroniza entre dispositivos",
      "Links com senha",
      "Envios pela extensão e ShareX",
      "Sempre sem anúncios",
    ],
  },
  de: {
    title: PRO_SEO.de.title,
    kicker: "DropIMG Pro",
    heading: "DropIMG Pro",
    memberHeading: "Du bist auf DropIMG Pro",
    lede: "Mehr Kontrolle für alle, die DropIMG täglich nutzen.",
    ledeMore:
      "Links länger behalten, Uploads auf allen Geräten verwalten und Freigaben schützen.",
    memberLede: "Jederzeit in der Abrechnung kündbar.",
    monthly: "Monatlich",
    annual: "Jährlich",
    monthlyPrice: "$2.99",
    annualPrice: "$24.99",
    monthlyNote: "/ Monat",
    annualNote: "/ Jahr",
    annualPerMonth: "$2.08/Monat",
    save: "30% sparen",
    bestValue: "Bester Preis",
    intervalAria: "Abrechnungszeitraum",
    annualHint: "Jährlich zahlen und 30% sparen.",
    getPro: "Pro holen",
    signIn: "Anmelden, um Pro zu holen",
    manage: "Abrechnung verwalten",
    waiting: "Checkout wird geöffnet…",
    activating: "Zahlung erhalten. Pro wird aktiviert…",
    activatingTimeout:
      "Deine Zahlung ist da. Pro wird noch aktiviert. Meine Drops gleich neu laden.",
    checkoutUnavailable: "Checkout ist gerade nicht verfügbar. Bitte gleich nochmal.",
    checkoutCouldNotOpen: "Checkout ließ sich nicht öffnen. Bitte gleich nochmal.",
    billingOff: "Abrechnung ist gerade nicht verfügbar.",
    skip: "Zu den Plänen",
    note: "DropIMG bleibt temporär. Auch Pro-Links laufen nach höchstens 90 Tagen ab.",
    renews: (date) => `Verlängert sich am ${date}`,
    ends: (date) => `Endet am ${date}`,
    features: [
      "1 Stunde bis 90 Tage wählen",
      "Bilder bis 50 MB hochladen",
      "Vollständige aktive Historie",
      "Auf allen Geräten synchron",
      "Passwortgeschützte Links",
      "Uploads per Erweiterung und ShareX",
      "Immer werbefrei",
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
  const t = PRO_COPY[opts.locale];
  const check =
    '<svg class="pro-check icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>';
  const perks = `<ul class="pro-perks">${t.features
    .map((f) => `<li>${check}<span>${esc(f)}</span></li>`)
    .join("")}</ul>`;
  const isPro = opts.plan === "pro";
  const period =
    isPro && opts.periodEnd
      ? opts.cancelAtPeriodEnd
        ? t.ends(formatDay(opts.periodEnd, opts.locale))
        : t.renews(formatDay(opts.periodEnd, opts.locale))
      : "";

  /*
   * One product, two ways to pay. Annual is the default so the page still
   * renders a complete, buyable offer with JavaScript disabled; the selector
   * only swaps which price is visible and which interval the single CTA
   * carries, so the `[data-interval]` contract that drives checkout is
   * unchanged.
   */
  const cta = !opts.billingOn
    ? ""
    : !opts.signedIn
      ? `<a class="btn primary btn-lg pro-cta" href="/login">${esc(t.signIn)}</a>`
      : `<button type="button" class="btn primary btn-lg pro-cta" data-interval="annual">${esc(t.getPro)}</button>`;

  const offer = `<div class="pro-offer">
      <div class="pro-interval" role="radiogroup" aria-label="${esc(t.intervalAria)}">
        <button type="button" class="pro-interval-opt" role="radio" aria-checked="false" data-select-interval="monthly">${esc(t.monthly)}</button>
        <button type="button" class="pro-interval-opt" role="radio" aria-checked="true" data-select-interval="annual">
          ${esc(t.annual)}<span class="pro-interval-save">${esc(t.bestValue)}</span>
        </button>
      </div>
      <div class="pro-figure">
        <p class="pro-price" data-interval-view="annual">${esc(t.annualPrice)}<span class="pro-per">${esc(t.annualNote)}</span></p>
        <p class="pro-price" data-interval-view="monthly" hidden>${esc(t.monthlyPrice)}<span class="pro-per">${esc(t.monthlyNote)}</span></p>
        <p class="pro-figure-sub" data-interval-view="annual">${esc(t.annualPerMonth)} · ${esc(t.save)}</p>
        <p class="pro-figure-sub" data-interval-view="monthly" hidden>${esc(t.annualHint)}</p>
      </div>
      ${cta}
      ${perks}
    </div>`;

  const billingOff = !opts.billingOn
    ? `<p class="pro-note">${esc(t.billingOff)}</p>`
    : "";

  const hero = isPro
    ? `<header class="pro-hero">
      <p class="pro-kicker">${esc(t.kicker)}</p>
      <h1>${esc(t.memberHeading)}</h1>
      <p class="pro-lede">${esc([period, t.memberLede].filter(Boolean).join(". "))}</p>
      <div class="pro-hero-actions">
        ${opts.billingOn ? `<button type="button" class="btn primary" id="pro-portal">${esc(t.manage)}</button>` : ""}
      </div>
    </header>`
    : `<header class="pro-hero">
      <p class="pro-kicker">${esc(t.kicker)}</p>
      <h1>${esc(t.heading)}</h1>
      <p class="pro-lede">${esc(t.lede)}</p>
      <p class="pro-lede">${esc(t.ledeMore)}</p>
    </header>`;

  const main = `<section class="pro-page" id="pro-app"
    data-signed-in="${opts.signedIn ? "1" : "0"}"
    data-plan="${esc(opts.plan)}"
    data-billing="${opts.billingOn ? "1" : "0"}"
    data-waiting="${esc(t.waiting)}"
    data-activating="${esc(t.activating)}"
    data-timeout="${esc(t.activatingTimeout)}"
    data-unavailable="${esc(t.checkoutUnavailable)}"
    data-open-fail="${esc(t.checkoutCouldNotOpen)}">
    ${hero}
    ${isPro ? "" : offer}
    ${isPro ? "" : `<p class="pro-fineprint">${esc(t.note)}</p>`}
    ${isPro ? "" : billingOff}
    <p id="pro-status" class="pro-note pro-status" hidden aria-live="polite">${esc(t.waiting)}</p>
  </section>`;

  const html = renderSitePage({
    locale: opts.locale,
    title: t.title,
    env: opts.env,
    main,
    skipLabel: t.skip,
    stayPath: proPath(opts.locale),
    langHref: (loc) => proPath(loc),
    robots: "index",
    extraHead: `${proHeadTags(opts.locale)}
    ${
      opts.env.ENVIRONMENT === "development"
        ? ""
        : `<script src="https://cdn.paddle.com/paddle/v2/paddle.js" defer></script>`
    }`,
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
    month: "long",
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
