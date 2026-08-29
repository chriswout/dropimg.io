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
  skip: string;
};

const COPY: Record<Locale, Copy> = {
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
    tryAgain: "Try again shortly.",
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
    tryAgain: "Inténtalo de nuevo en un momento.",
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
    tryAgain: "Tente de novo em instantes.",
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
    tryAgain: "Bitte gleich noch einmal versuchen.",
    skip: "Zur Anmeldung",
  },
};

export function renderLoginPage(opts: {
  locale: Locale;
  env: { ENVIRONMENT?: string };
  state: "form" | "sent" | "rate_limited";
  email?: string;
  maskedEmail?: string;
  error?: string;
  devMagicUrl?: string;
}): string {
  const t = COPY[opts.locale];
  const err = opts.error ? `<p class="form-error">${esc(opts.error)}</p>` : "";
  const dev =
    opts.devMagicUrl && opts.state === "sent"
      ? `<p class="account-dev"><a href="${esc(opts.devMagicUrl)}">Dev sign-in link</a></p>`
      : "";

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
    <p class="sub">${esc(t.tryAgain)}</p>
    <p><a class="btn secondary" href="/login">${esc(t.resend)}</a></p>`
        : `<h1 class="tagline account-title">${esc(t.heading)}</h1>
    <p class="sub">${esc(t.hint)}</p>
    ${err}
    <form method="post" action="/login" class="account-form" autocomplete="username">
      <label for="email">${esc(t.emailLabel)}</label>
      <input id="email" name="email" type="email" required autofocus placeholder="you@example.com" />
      <button type="submit" class="btn primary">${esc(t.submit)}</button>
    </form>
    <p class="account-muted">${esc(t.noPassword)}</p>`;

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
