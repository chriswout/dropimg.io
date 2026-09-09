import type { Locale } from "../../marketing/locales";
import { renderSitePage, siteHtmlResponse } from "./site-page";

type Copy = {
  title: string;
  skip: string;
  heading: string;
  lede: string;
  willBeAble: string;
  canSave: string;
  canLimits: string;
  canExpiry: string;
  connect: string;
  cancel: string;
  successTitle: string;
  successBody: string;
  expiredTitle: string;
  expiredBody: string;
  cancelledTitle: string;
  cancelledBody: string;
  takenTitle: string;
  takenBody: string;
};

export const CONNECT_BROWSER_COPY: Record<Locale, Copy> = {
  en: {
    title: "Connect Browser Extension — dropimg.io",
    skip: "Skip to connect",
    heading: "Connect Browser Extension?",
    lede: "Connect this browser extension to your DropIMG account.",
    willBeAble: "This browser extension will be able to:",
    canSave: "save screenshots to your DropIMG account",
    canLimits: "use your account upload limits",
    canExpiry: "use your available expiry options",
    connect: "Connect",
    cancel: "Cancel",
    successTitle: "Browser connected",
    successBody: "You can close this tab and return to the extension.",
    expiredTitle: "This connection request has expired.",
    expiredBody: "Start again from the browser extension.",
    cancelledTitle: "Connection cancelled",
    cancelledBody: "Start again from the browser extension if you still want to connect.",
    takenTitle: "Already connected to another account",
    takenBody: "This request was approved by a different DropIMG user.",
  },
  es: {
    title: "Conectar extensión — dropimg.io",
    skip: "Ir a conectar",
    heading: "¿Conectar la extensión?",
    lede: "Conecta esta extensión a tu cuenta de DropIMG.",
    willBeAble: "Esta extensión podrá:",
    canSave: "guardar capturas en tu cuenta de DropIMG",
    canLimits: "usar los límites de subida de tu cuenta",
    canExpiry: "usar las caducidades que tengas disponibles",
    connect: "Conectar",
    cancel: "Cancelar",
    successTitle: "Navegador conectado",
    successBody: "Puedes cerrar esta pestaña y volver a la extensión.",
    expiredTitle: "Esta solicitud de conexión caducó.",
    expiredBody: "Empieza de nuevo desde la extensión.",
    cancelledTitle: "Conexión cancelada",
    cancelledBody: "Si quieres conectar, empieza de nuevo desde la extensión.",
    takenTitle: "Ya está conectada a otra cuenta",
    takenBody: "Otra cuenta de DropIMG aprobó esta solicitud.",
  },
  "pt-BR": {
    title: "Conectar extensão — dropimg.io",
    skip: "Ir para conectar",
    heading: "Conectar a extensão?",
    lede: "Conecte esta extensão à sua conta DropIMG.",
    willBeAble: "Esta extensão poderá:",
    canSave: "salvar prints na sua conta DropIMG",
    canLimits: "usar os limites de envio da sua conta",
    canExpiry: "usar as opções de validade disponíveis",
    connect: "Conectar",
    cancel: "Cancelar",
    successTitle: "Navegador conectado",
    successBody: "Pode fechar esta aba e voltar para a extensão.",
    expiredTitle: "Este pedido de conexão expirou.",
    expiredBody: "Comece de novo pela extensão.",
    cancelledTitle: "Conexão cancelada",
    cancelledBody: "Se ainda quiser conectar, comece de novo pela extensão.",
    takenTitle: "Já conectada a outra conta",
    takenBody: "Outra conta DropIMG aprovou este pedido.",
  },
  de: {
    title: "Browser-Erweiterung verbinden — dropimg.io",
    skip: "Zum Verbinden",
    heading: "Browser-Erweiterung verbinden?",
    lede: "Verbinde diese Erweiterung mit deinem DropIMG-Konto.",
    willBeAble: "Diese Browser-Erweiterung kann dann:",
    canSave: "Screenshots in deinem DropIMG-Konto speichern",
    canLimits: "deine Upload-Limits nutzen",
    canExpiry: "deine verfügbaren Laufzeiten nutzen",
    connect: "Verbinden",
    cancel: "Abbrechen",
    successTitle: "Browser verbunden",
    successBody: "Du kannst diesen Tab schließen und zur Erweiterung zurückkehren.",
    expiredTitle: "Diese Verbindungsanfrage ist abgelaufen.",
    expiredBody: "Starte erneut in der Browser-Erweiterung.",
    cancelledTitle: "Verbindung abgebrochen",
    cancelledBody: "Starte erneut in der Erweiterung, wenn du verbinden willst.",
    takenTitle: "Bereits mit einem anderen Konto verbunden",
    takenBody: "Diese Anfrage hat ein anderes DropIMG-Konto bestätigt.",
  },
};

export type ConnectBrowserState =
  | "pending"
  | "success"
  | "expired"
  | "cancelled"
  | "taken";

export function renderConnectBrowserPage(opts: {
  locale: Locale;
  env: { ENVIRONMENT?: string };
  pairingId: string;
  state: ConnectBrowserState;
}): string {
  const t = CONNECT_BROWSER_COPY[opts.locale];
  let inner: string;
  if (opts.state === "success") {
    inner = `<p class="auth-mark" aria-hidden="true">✓</p>
      <h1 class="auth-title">${esc(t.successTitle)}</h1>
      <p class="auth-lede">${esc(t.successBody)}</p>`;
  } else if (opts.state === "expired") {
    inner = `<h1 class="auth-title">${esc(t.expiredTitle)}</h1>
      <p class="auth-lede">${esc(t.expiredBody)}</p>`;
  } else if (opts.state === "cancelled") {
    inner = `<h1 class="auth-title">${esc(t.cancelledTitle)}</h1>
      <p class="auth-lede">${esc(t.cancelledBody)}</p>`;
  } else if (opts.state === "taken") {
    inner = `<h1 class="auth-title">${esc(t.takenTitle)}</h1>
      <p class="auth-lede">${esc(t.takenBody)}</p>`;
  } else {
    inner = `<h1 class="auth-title">${esc(t.heading)}</h1>
      <p class="auth-lede">${esc(t.lede)}</p>
      <p class="auth-fineprint">${esc(t.willBeAble)}</p>
      <ul class="auth-perks">
        <li><span>${esc(t.canSave)}</span></li>
        <li><span>${esc(t.canLimits)}</span></li>
        <li><span>${esc(t.canExpiry)}</span></li>
      </ul>
      <div class="auth-actions">
        <form method="post" action="/connect/browser/${esc(opts.pairingId)}/approve">
          <button type="submit" class="btn primary btn-lg">${esc(t.connect)}</button>
        </form>
        <form method="post" action="/connect/browser/${esc(opts.pairingId)}/cancel">
          <button type="submit" class="btn secondary">${esc(t.cancel)}</button>
        </form>
      </div>`;
  }

  return renderSitePage({
    locale: opts.locale,
    title: t.title,
    env: opts.env,
    skipLabel: t.skip,
    stayPath: `/connect/browser/${opts.pairingId}`,
    robots: "noindex",
    mainClass: "auth-main",
    main: `<section class="auth">
      <div class="auth-card">${inner}</div>
    </section>`,
  });
}

export function connectBrowserHtmlResponse(
  opts: Parameters<typeof renderConnectBrowserPage>[0],
  status = 200,
): Response {
  return siteHtmlResponse(renderConnectBrowserPage(opts), status, {
    robots: "noindex",
    cache: "private",
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
