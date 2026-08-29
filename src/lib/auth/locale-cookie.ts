import {
  DEFAULT_LOCALE,
  isLocale,
  matchBrowserLocale,
  type Locale,
} from "../../../marketing/locales";
import { cookieSecure } from "./crypto";

export const LOCALE_COOKIE = "dropimg_locale";
const MAX_AGE = 365 * 24 * 60 * 60;

export function parseLocaleCookie(
  cookieHeader: string | null | undefined,
): Locale | null {
  if (!cookieHeader) return null;
  const m = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`).exec(cookieHeader);
  if (!m) return null;
  const raw = decodeURIComponent(m[1]!);
  return isLocale(raw) ? raw : null;
}

export function localeFromAcceptLanguage(
  header: string | null | undefined,
): Locale | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]!.trim();
    const match = matchBrowserLocale(tag);
    if (match) return match;
    if (tag.toLowerCase().startsWith("en")) return "en";
  }
  return null;
}

export function resolveRequestLocale(req: Request): Locale {
  return (
    parseLocaleCookie(req.headers.get("cookie")) ||
    localeFromAcceptLanguage(req.headers.get("accept-language")) ||
    DEFAULT_LOCALE
  );
}

export function localeCookieHeader(
  locale: Locale,
  env: { ENVIRONMENT?: string },
): string {
  const parts = [
    `${LOCALE_COOKIE}=${encodeURIComponent(locale)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE}`,
  ];
  if (cookieSecure(env)) parts.push("Secure");
  return parts.join("; ");
}
