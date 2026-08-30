import type { Locale } from "../../marketing/locales";
import { renderSitePage, siteHtmlResponse } from "./site-page";

type Copy = {
  title: string;
  heading: string;
  hint: string;
  emailLabel: string;
  submit: string;
  noPassword: string;
  checkInbox: string;
  sentTo: (masked: string) => string;
  expires: string;
  resend: string;
  tryAgain: string;
  invalidEmail: string;
  sendFailed: string;
  invalidLink: string;
  expiredLink: string;
  accountGone: string;
  skip: string;
};

export const LOGIN_COPY: Record<Locale, Copy> = {
  en: {
    title: "Sign in — dropimg.io",
    heading: "Sign in to DropIMG",
    hint: "We’ll email you a one-time link.",
    emailLabel: "Email",
    submit: "Email me a sign-in link",
    noPassword: "No password required.",
    checkInbox: "Check your inbox",
    sentTo: (m) => `We sent a sign-in link to ${m}.`,
    expires: "Link expires in 15 minutes.",
    resend: "Resend",
    tryAgain: "Too many sign-in attempts. Try again shortly.",
    invalidEmail: "Enter a valid email.",
    sendFailed: "Could not send the sign-in email. Try again shortly.",
    invalidLink: "This sign-in link is invalid.",
    expiredLink: "This sign-in link has expired. Request a new one.",
    accountGone: "This account is no longer available.",
    skip: "Skip to sign in",
  },
  es: {
    title: "Entrar — dropimg.io",
    heading: "Entra en DropIMG",
    hint: "Te enviamos un enlace de un solo uso.",
    emailLabel: "Correo",
    submit: "Enviarme el enlace",
    noPassword: "Sin contraseña.",
    checkInbox: "Revisa tu correo",
    sentTo: (m) => `Enviamos un enlace a ${m}.`,
    expires: "El enlace caduca en 15 minutos.",
    resend: "Reenviar",
    tryAgain: "Demasiados intentos. Prueba en un momento.",
    invalidEmail: "Escribe un correo válido.",
    sendFailed: "No se pudo enviar el correo. Prueba en un momento.",
    invalidLink: "Este enlace de acceso no es válido.",
    expiredLink: "Este enlace caducó. Pide uno nuevo.",
    accountGone: "Esta cuenta ya no está disponible.",
    skip: "Ir al inicio de sesión",
  },
  "pt-BR": {
    title: "Entrar — dropimg.io",
    heading: "Entre no DropIMG",
    hint: "Enviaremos um link de uso único.",
    emailLabel: "E-mail",
    submit: "Enviar link de entrada",
    noPassword: "Sem senha.",
    checkInbox: "Confira sua caixa de entrada",
    sentTo: (m) => `Enviamos um link para ${m}.`,
    expires: "O link expira em 15 minutos.",
    resend: "Reenviar",
    tryAgain: "Muitas tentativas. Tente de novo em instantes.",
    invalidEmail: "Digite um e-mail válido.",
    sendFailed: "Não deu pra enviar o e-mail. Tente de novo em instantes.",
    invalidLink: "Este link de entrada é inválido.",
    expiredLink: "Este link expirou. Peça outro.",
    accountGone: "Esta conta não está mais disponível.",
    skip: "Ir para o login",
  },
  de: {
    title: "Anmelden — dropimg.io",
    heading: "Bei DropIMG anmelden",
    hint: "Wir senden einen einmaligen Link.",
    emailLabel: "E-Mail",
    submit: "Anmeldelink senden",
    noPassword: "Kein Passwort nötig.",
    checkInbox: "Posteingang prüfen",
    sentTo: (m) => `Wir haben einen Link an ${m} gesendet.`,
    expires: "Der Link läuft in 15 Minuten ab.",
    resend: "Erneut senden",
    tryAgain: "Zu viele Versuche. Bitte gleich noch einmal.",
    invalidEmail: "Bitte eine gültige E-Mail eingeben.",
    sendFailed: "E-Mail ließ sich nicht senden. Bitte gleich nochmal.",
    invalidLink: "Dieser Anmeldelink ist ungültig.",
    expiredLink: "Dieser Anmeldelink ist abgelaufen. Bitte einen neuen anfordern.",
    accountGone: "Dieses Konto ist nicht mehr verfügbar.",
    skip: "Zur Anmeldung",
  },
};

export function renderLoginPage(opts: {
  locale: Locale;
  env: { ENVIRONMENT?: string };
  state: "form" | "sent" | "rate_limited" | "invalid" | "expired";
  email?: string;
  maskedEmail?: string;
  error?: string;
  devMagicUrl?: string;
}): string {
  const t = LOGIN_COPY[opts.locale];
  const err = opts.error ? `<p class="form-error" role="alert">${esc(opts.error)}</p>` : "";
  const dev =
    opts.devMagicUrl && opts.state === "sent"
      ? `<p class="account-dev"><a href="${esc(opts.devMagicUrl)}">Dev sign-in link</a></p>`
      : "";

  const form = (heading: string, hint: string, extraErr = "") =>
    `<h1 class="tagline account-title">${esc(heading)}</h1>
    <p class="sub">${esc(hint)}</p>
    ${extraErr}${err}
    <form method="post" action="/login" class="account-form" autocomplete="username">
      <label for="email">${esc(t.emailLabel)}</label>
      <input id="email" name="email" type="email" required autofocus placeholder="you@example.com" />
      <button type="submit" class="btn primary">${esc(t.submit)}</button>
    </form>
    <p class="account-muted">${esc(t.noPassword)}</p>`;

  const inner =
    opts.state === "sent"
      ? `<h1 class="tagline account-title">${esc(t.checkInbox)}</h1>
    <p class="sub">${esc(t.sentTo(opts.maskedEmail || "***"))}</p>
    <p class="account-muted">${esc(t.expires)}</p>
    ${dev}
    <form method="post" action="/login" class="account-form">
      <input type="hidden" name="email" value="${esc(opts.email || "")}" />
      <button type="submit" class="btn primary">${esc(t.resend)}</button>
    </form>`
      : opts.state === "rate_limited"
        ? `<h1 class="tagline account-title">${esc(t.heading)}</h1>
    <p class="sub" role="alert">${esc(t.tryAgain)}</p>
    <p><a class="btn secondary" href="/login">${esc(t.resend)}</a></p>`
        : opts.state === "invalid"
          ? form(t.heading, t.invalidLink)
          : opts.state === "expired"
            ? form(t.heading, t.expiredLink)
            : form(t.heading, t.hint);

  return renderSitePage({
    locale: opts.locale,
    title: t.title,
    env: opts.env,
    skipLabel: t.skip,
    stayPath: "/login",
    main: `<section class="account-panel">${inner}</section>`,
  });
}

export function loginHtmlResponse(
  opts: Parameters<typeof renderLoginPage>[0],
  status = 200,
): Response {
  return siteHtmlResponse(renderLoginPage(opts), status);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
