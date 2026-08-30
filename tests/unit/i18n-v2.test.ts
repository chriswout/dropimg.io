import { describe, expect, it } from "vitest";
import { CHROME } from "../../marketing/content";
import { LOCALES, type Locale } from "../../marketing/locales";
import { PRO_SEO } from "../../marketing/pro";
import { UI } from "../../marketing/ui";
import { ACCOUNT_COPY } from "../../src/views/account";
import { APP_COPY } from "../../src/views/app";
import { SHELL_COPY } from "../../src/views/app-shell";
import { LOGIN_COPY } from "../../src/views/login";
import { LOCKED_COPY } from "../../src/views/locked-share";
import { PRO_COPY } from "../../src/views/pro";
import { GONE_COPY, SHARE_COPY } from "../../src/views/share";

const REQUIRED_UI = [
  "uploadedCopied",
  "manageInDrops",
  "needLongerTitle",
  "needLongerBody",
  "passwordProtected",
  "passwordTooShort",
  "proControlsKicker",
  "expiresLabel",
  "expiry24h",
  "expiry7d",
  "expiry30d",
  "passwordLabel",
] as const;

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value == null || typeof value !== "object") return prefix ? [prefix] : [];
  if (Array.isArray(value)) return [prefix || "[]"];
  const out: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "function") out.push(next);
    else if (child && typeof child === "object" && !Array.isArray(child)) {
      out.push(...leafKeys(child, next));
    } else out.push(next);
  }
  return out.sort();
}

function assertParity<T>(label: string, all: Record<Locale, T>) {
  const en = leafKeys(all.en);
  expect(en.length).toBeGreaterThan(3);
  for (const locale of LOCALES) {
    expect(leafKeys(all[locale]), `${label}/${locale}`).toEqual(en);
  }
}

describe("V2 locale completeness", () => {
  it("keeps the same keys in every locale", () => {
    assertParity("UI", UI);
    assertParity("CHROME", CHROME);
    assertParity("PRO_SEO", PRO_SEO);
    assertParity("PRO_COPY", PRO_COPY);
    assertParity("LOGIN_COPY", LOGIN_COPY);
    assertParity("ACCOUNT_COPY", ACCOUNT_COPY);
    assertParity("APP_COPY", APP_COPY);
    assertParity("SHELL_COPY", SHELL_COPY);
    assertParity("LOCKED_COPY", LOCKED_COPY);
    assertParity("GONE_COPY", GONE_COPY);
    assertParity("SHARE_COPY", SHARE_COPY);
  });

  it("has required homepage / upload keys", () => {
    for (const locale of LOCALES) {
      for (const key of REQUIRED_UI) {
        expect(UI[locale][key], `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  /**
   * Guards the opposite failure from the parity check: a key that exists in
   * every locale but still holds the English sentence. Only keys that must
   * read as the local language are listed — brand words, prices and the
   * German loanword "Upgrade" are deliberately shared.
   */
  it("translates the commercial calls to action", () => {
    const proKeys = [
      "getPro",
      "signIn",
      "manage",
      "save",
      "bestValue",
      "annualHint",
      "monthly",
      "annual",
    ] as const;
    const uiKeys = ["expiry1h", "expiry24h", "expiry7d", "expiry30d", "expiry90d"] as const;

    for (const locale of LOCALES) {
      if (locale === "en") continue;
      for (const key of proKeys) {
        expect(PRO_COPY[locale][key], `PRO_COPY.${locale}.${key}`).not.toBe(
          PRO_COPY.en[key],
        );
      }
      for (const key of uiKeys) {
        expect(UI[locale][key], `UI.${locale}.${key}`).not.toBe(UI.en[key]);
      }
      for (const [i, feature] of PRO_COPY[locale].features.entries()) {
        expect(feature, `PRO_COPY.${locale}.features[${i}]`).not.toBe(
          PRO_COPY.en.features[i],
        );
      }
    }
  });

  it("does not translate product names or file types", () => {
    const joined = LOCALES.map((locale) =>
      [
        PRO_COPY[locale].heading,
        PRO_COPY[locale].kicker,
        ACCOUNT_COPY[locale].sharexTitle,
        ACCOUNT_COPY[locale].extensionTitle,
        UI[locale].dropHintFormats,
      ].join(" "),
    ).join(" ");
    expect(joined).toContain("DropIMG Pro");
    expect(joined).toContain("ShareX");
    expect(joined).toMatch(/PNG/);
    expect(joined).toMatch(/JPEG/);
    expect(joined).toMatch(/WebP/);
    expect(joined).toMatch(/GIF/);
  });
});
