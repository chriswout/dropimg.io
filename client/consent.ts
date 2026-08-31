/**
 * Consent-gated Google Analytics.
 *
 * Nothing is requested from Google until the visitor opts in — no tag, no
 * cookie, no pageview. That is stricter than Google Consent Mode, which loads
 * the tag immediately and merely withholds cookies, and it is the only version
 * we can honestly describe in the privacy policy: before a choice is made,
 * Google does not know the visitor exists.
 *
 * Loaded on marketing, legal and signed-in app pages. Never on /i/:slug share
 * pages — those carry someone else's content behind an unguessable link, and
 * their CSP would refuse the script anyway.
 */

const GA_MEASUREMENT_ID = "G-S836RXY4XV";
const STORAGE_KEY = "dropimg:analytics";

/**
 * Keeps localhost, previews and the staging worker out of the production
 * property. Without this, every `npm run dev` session becomes real traffic.
 */
const ANALYTICS_HOSTS = new Set(["dropimg.io", "www.dropimg.io"]);

type Choice = "granted" | "denied";

type Strings = {
  title: string;
  body: string;
  accept: string;
  decline: string;
  privacy: string;
};

const STRINGS: Record<string, Strings> = {
  en: {
    title: "Analytics cookies",
    body: "We'd like to use Google Analytics to see which pages are worth keeping. It sets cookies. Nothing loads until you choose, and declining costs you nothing.",
    accept: "Accept",
    decline: "Decline",
    privacy: "Privacy policy",
  },
  es: {
    title: "Cookies de analítica",
    body: "Nos gustaría usar Google Analytics para saber qué páginas merece la pena mantener. Instala cookies. No se carga nada hasta que elijas, y rechazar no te cuesta nada.",
    accept: "Aceptar",
    decline: "Rechazar",
    privacy: "Política de privacidad",
  },
  "pt-BR": {
    title: "Cookies de análise",
    body: "Queremos usar o Google Analytics para saber quais páginas valem a pena manter. Ele usa cookies. Nada é carregado até você escolher, e recusar não custa nada.",
    accept: "Aceitar",
    decline: "Recusar",
    privacy: "Política de privacidade",
  },
  de: {
    title: "Analyse-Cookies",
    body: "Wir würden gern Google Analytics nutzen, um zu sehen, welche Seiten sich lohnen. Dabei werden Cookies gesetzt. Vor deiner Wahl wird nichts geladen, und Ablehnen kostet dich nichts.",
    accept: "Akzeptieren",
    decline: "Ablehnen",
    privacy: "Datenschutzerklärung",
  },
};

function strings(): Strings {
  const tag = (document.documentElement.lang || "en").toLowerCase();
  if (tag.startsWith("pt")) return STRINGS["pt-BR"]!;
  if (tag.startsWith("es")) return STRINGS.es!;
  if (tag.startsWith("de")) return STRINGS.de!;
  return STRINGS.en!;
}

function readChoice(): Choice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "granted" || raw === "denied" ? raw : null;
  } catch {
    return null;
  }
}

function writeChoice(choice: Choice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Private mode: the choice holds for this page view and is asked again later.
  }
}

/**
 * Global Privacy Control is a legally recognised opt-out signal in several US
 * states. Treating it as a decline means those visitors are never asked, which
 * is the point of the signal.
 */
function gpcDeclined(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean })
    .globalPrivacyControl === true;
}

let loaded = false;

function loadAnalytics(): void {
  if (loaded || !ANALYTICS_HOSTS.has(location.hostname)) return;
  loaded = true;

  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  /**
   * Pushes the `arguments` object, not a rest array. gtag.js tells real
   * commands from ordinary data by that type, so a plain array queues and is
   * never executed — the tag loads and nothing is ever recorded.
   */
  function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  }
  (gtag as (...a: unknown[]) => void)("js", new Date());
  (gtag as (...a: unknown[]) => void)("config", GA_MEASUREMENT_ID);

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

let banner: HTMLElement | null = null;

function dismiss(choice: Choice): void {
  writeChoice(choice);
  banner?.remove();
  banner = null;
  if (choice === "granted") loadAnalytics();
}

function showBanner(): void {
  if (banner) return;
  const t = strings();

  const el = document.createElement("div");
  el.className = "consent";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "false");
  el.setAttribute("aria-labelledby", "consent-title");
  el.setAttribute("aria-describedby", "consent-body");
  el.innerHTML = `
    <div class="consent-card">
      <div class="consent-copy">
        <h2 class="consent-title" id="consent-title"></h2>
        <p class="consent-body" id="consent-body"></p>
      </div>
      <div class="consent-actions">
        <button type="button" class="btn secondary" data-consent="denied"></button>
        <button type="button" class="btn primary" data-consent="granted"></button>
      </div>
    </div>`;

  /** Set as text, never interpolated, so a translation can never inject markup. */
  el.querySelector<HTMLElement>(".consent-title")!.textContent = t.title;
  const body = el.querySelector<HTMLElement>(".consent-body")!;
  body.textContent = `${t.body} `;
  const link = document.createElement("a");
  link.href = "/privacy";
  link.textContent = t.privacy;
  body.appendChild(link);

  el.querySelector<HTMLElement>('[data-consent="denied"]')!.textContent = t.decline;
  el.querySelector<HTMLElement>('[data-consent="granted"]')!.textContent = t.accept;

  for (const btn of el.querySelectorAll<HTMLButtonElement>("[data-consent]")) {
    btn.addEventListener("click", () => dismiss(btn.dataset.consent as Choice));
  }

  /**
   * First in the DOM so keyboard and screen-reader users reach the choice
   * before the page, even though it is painted at the bottom. There is no
   * close affordance on purpose: dismissing without choosing would be read as
   * consent, which it is not.
   */
  banner = el;
  document.body.insertBefore(el, document.body.firstChild);
}

export function setupConsent(): void {
  const choice = readChoice();
  if (choice === "granted") {
    loadAnalytics();
    return;
  }
  if (choice === "denied" || gpcDeclined()) return;
  showBanner();
}

/** Lets the privacy page reopen the choice, so consent can be withdrawn. */
export function openConsentPreferences(): void {
  banner?.remove();
  banner = null;
  showBanner();
}
