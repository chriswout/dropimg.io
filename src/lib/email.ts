export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const DEFAULT_FROM = "DropIMG <signin@dropimg.io>";

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
    text: `Sign in to DropIMG with this link (expires in ${opts.minutes} minutes):\n\n${opts.url}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Sign in to DropIMG with this one-time link. It expires in ${opts.minutes} minutes.</p><p><a href="${esc(opts.url)}">Sign in</a></p><p>If you did not request this, ignore this email.</p>`,
  };
}

function emailBinding(
  env: Cloudflare.Env,
): { send: (message: Record<string, unknown>) => Promise<unknown> } | undefined {
  const candidate = (env as { EMAIL?: { send?: unknown } }).EMAIL;
  return candidate && typeof candidate.send === "function"
    ? (candidate as { send: (message: Record<string, unknown>) => Promise<unknown> })
    : undefined;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}
