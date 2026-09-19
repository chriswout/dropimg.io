export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailAccent = "brand" | "warning" | "danger" | "success" | "neutral";

export type BrandedEmailBody = {
  preheader: string;
  heading: string;
  paragraphs: string[];
  meta?: { label: string; value: string };
  details?: { label: string; value: string }[];
  cta?: { href: string; label: string };
  secondary?: { href: string; label: string };
  note?: string;
  accent?: EmailAccent;
  /** Sign-in mail omits the billing footer link. */
  footerBilling?: boolean;
  footerLine?: string;
};

const DEFAULT_FROM = "DropIMG <signin@dropimg.io>";
const SITE_URL = "https://dropimg.io";
const LOGO_URL = `${SITE_URL}/brand/logo-64.png`;
const LOGO_WIDTH = 160;
const LOGO_HEIGHT = 38;
const BUTTON = "#3b4fe8";
const BILLING_URL = `${SITE_URL}/app/billing`;

const ACCENT: Record<EmailAccent, string> = {
  brand: "#3b4fe8",
  warning: "#b45309",
  danger: "#dc2626",
  success: "#0e9f6e",
  neutral: "#3b4fe8",
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,'Helvetica Neue',Arial,sans-serif";

export function parseFromAddress(raw: string): { email: string; name?: string } {
  const trimmed = raw.trim();
  const angled = /^(.*)<([^>]+)>\s*$/.exec(trimmed);
  if (angled) {
    const name = angled[1]!.trim().replace(/^["']|["']$/g, "");
    const email = angled[2]!.trim();
    return name ? { email, name } : { email };
  }
  return { email: trimmed };
}

/**
 * Cloudflare Email Sending via the EMAIL binding.
 * Development without a binding is a no-op (caller may echo the magic URL).
 */
export async function sendMail(
  env: Cloudflare.Env,
  msg: MailMessage,
): Promise<{ sent: boolean; error?: string }> {
  const from = parseFromAddress(env.AUTH_FROM_EMAIL?.trim() || DEFAULT_FROM);
  if (!from.email) {
    if (env.ENVIRONMENT === "development") return { sent: false };
    return { sent: false, error: "email_unconfigured" };
  }

  const email = emailBinding(env);
  if (!email) {
    if (env.ENVIRONMENT === "development") return { sent: false };
    return { sent: false, error: "email_unconfigured" };
  }

  try {
    await email.send({
      to: msg.to,
      from,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
    return { sent: true };
  } catch {
    return { sent: false, error: "email_send_failed" };
  }
}

export function magicLinkEmail(opts: {
  url: string;
  minutes: number;
}): MailMessage {
  return {
    to: "",
    subject: "Sign in to DropIMG",
    text: brandedText({
      heading: "Here's your sign-in link",
      paragraphs: [
        `This link signs you in to DropIMG. It expires in ${opts.minutes} minutes.`,
      ],
      cta: { href: opts.url, label: "Sign in" },
      note: "If you didn't ask for this, you can ignore the email.",
    }),
    html: renderBrandedEmail({
      preheader: `Your sign-in link expires in ${opts.minutes} minutes.`,
      heading: "Here's your sign-in link",
      paragraphs: [
        `This link signs you in to DropIMG. It expires in ${opts.minutes} minutes.`,
      ],
      cta: { href: opts.url, label: "Sign in" },
      note: "If you didn't ask for this, you can ignore the email.",
      accent: "brand",
      footerBilling: false,
    }),
  };
}

export function renderBrandedEmail(opts: BrandedEmailBody): string {
  const accent = ACCENT[opts.accent ?? "brand"];
  const paragraphs = opts.paragraphs
    .map(
      (p, i) =>
        `<p style="margin:${i === 0 ? "14px" : "16px"} 0 0;color:#4b4f62;font-size:15px;line-height:1.6;">${esc(p)}</p>`,
    )
    .join("");
  const meta = opts.meta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0 0;border-collapse:separate;">
        <tr>
          <td style="background:#f2f3f9;border-radius:10px;padding:14px 16px;">
            <p style="margin:0;color:#676c80;font-size:11px;font-weight:650;letter-spacing:0.06em;text-transform:uppercase;">${esc(opts.meta.label)}</p>
            <p style="margin:6px 0 0;color:#12131c;font-size:15px;font-weight:650;line-height:1.4;">${esc(opts.meta.value)}</p>
          </td>
        </tr>
      </table>`
    : "";
  const details = opts.details?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0 0;border-collapse:separate;">
        <tr>
          <td style="background:#f2f3f9;border-radius:10px;padding:8px 18px 10px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
              ${opts.details
                .map(
                  (row, i) => `<tr>
                <td style="padding:${i === 0 ? "10px" : "12px"} 0 ${i === (opts.details!.length - 1) ? "10px" : "12px"};border-top:${i === 0 ? "0" : "1px solid rgba(18,19,28,0.08)"};color:#676c80;font-size:13px;line-height:1.4;width:38%;">${esc(row.label)}</td>
                <td style="padding:${i === 0 ? "10px" : "12px"} 0 ${i === (opts.details!.length - 1) ? "10px" : "12px"};border-top:${i === 0 ? "0" : "1px solid rgba(18,19,28,0.08)"};color:#12131c;font-size:15px;font-weight:650;line-height:1.4;text-align:right;">${esc(row.value)}</td>
              </tr>`,
                )
                .join("")}
            </table>
          </td>
        </tr>
      </table>`
    : "";
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;border-collapse:separate;">
        <tr>
          <td bgcolor="${BUTTON}" style="background:${BUTTON};border-radius:10px;">
            <a href="${esc(opts.cta.href)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-family:${FONT};font-size:15px;font-weight:650;letter-spacing:-0.01em;line-height:1;text-decoration:none;">${esc(opts.cta.label)}</a>
          </td>
        </tr>
      </table>`
    : "";
  const secondary = opts.secondary
    ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;"><a href="${esc(opts.secondary.href)}" style="color:#3347d6;font-weight:650;text-decoration:none;">${esc(opts.secondary.label)}</a></p>`
    : "";
  const note = opts.note
    ? `<p style="margin:24px 0 0;color:#676c80;font-size:13px;line-height:1.5;">${esc(opts.note)}</p>`
    : "";
  const billingLink =
    opts.footerBilling === false
      ? ""
      : `&nbsp;·&nbsp;<a href="${BILLING_URL}" style="color:#3347d6;text-decoration:none;">Billing</a>`;
  const preheaderPad = "&nbsp;&zwnj;".repeat(80);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f7fb;color:#12131c;font-family:${FONT};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f7f7fb;">${esc(opts.preheader)}${preheaderPad}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f7f7fb;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 22px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${LOGO_URL}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="dropimg.io" style="display:block;border:0;height:${LOGO_HEIGHT}px;width:${LOGO_WIDTH}px;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid rgba(18,19,28,0.09);border-radius:20px;overflow:hidden;box-shadow:0 4px 16px rgba(16,18,32,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td bgcolor="${accent}" style="background:${accent};height:4px;font-size:0;line-height:4px;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:32px 32px 36px;">
                    <h1 style="margin:0;color:#12131c;font-size:22px;font-weight:700;letter-spacing:-0.03em;line-height:1.25;">${esc(opts.heading)}</h1>
                    ${paragraphs}
                    ${meta}
                    ${details}
                    ${cta}
                    ${secondary}
                    ${note}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 4px 0;color:#676c80;font-size:12px;line-height:1.6;">
              <p style="margin:0;">
                <a href="${SITE_URL}" style="color:#3347d6;text-decoration:none;">dropimg.io</a>
                ${billingLink}
                &nbsp;·&nbsp;
                <a href="${SITE_URL}/privacy" style="color:#3347d6;text-decoration:none;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}/terms" style="color:#3347d6;text-decoration:none;">Terms</a>
              </p>
              <p style="margin:10px 0 0;">${esc(opts.footerLine || "Thanks for using dropimg.io")}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function brandedText(opts: {
  heading: string;
  paragraphs: string[];
  meta?: { label: string; value: string };
  details?: { label: string; value: string }[];
  cta?: { href: string; label: string };
  secondary?: { href: string; label: string };
  note?: string;
}): string {
  const lines = [opts.heading, "", ...opts.paragraphs];
  if (opts.meta) lines.push("", `${opts.meta.label}:`, opts.meta.value);
  if (opts.details?.length) {
    lines.push("");
    for (const row of opts.details) lines.push(`${row.label}: ${row.value}`);
  }
  if (opts.cta) lines.push("", `${opts.cta.label}:`, opts.cta.href);
  if (opts.secondary) {
    lines.push("", `${opts.secondary.label}:`, opts.secondary.href);
  }
  if (opts.note) lines.push("", opts.note);
  return `${lines.join("\n")}\n`;
}

export { BILLING_URL, SITE_URL };

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailBinding(
  env: Cloudflare.Env,
): { send: (message: Record<string, unknown>) => Promise<unknown> } | undefined {
  const candidate = (env as { EMAIL?: { send?: unknown } }).EMAIL;
  return candidate && typeof candidate.send === "function"
    ? (candidate as { send: (message: Record<string, unknown>) => Promise<unknown> })
    : undefined;
}
