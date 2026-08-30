import { describe, expect, it } from "vitest";
import { LOCALES } from "../../marketing/locales";
import { allProUrls, proAlternateLinks, proPath, proUrl } from "../../marketing/pro";
import { renderAccountPage } from "../../src/views/account";
import { renderAppPage } from "../../src/views/app";
import { renderLoginPage } from "../../src/views/login";
import { renderProPage } from "../../src/views/pro";

describe("localized /pro SEO", () => {
  it("uses the existing locale-prefix URL scheme", () => {
    expect(proPath("en")).toBe("/pro");
    expect(proPath("es")).toBe("/es/pro");
    expect(proPath("pt-BR")).toBe("/pt-br/pro");
    expect(proPath("de")).toBe("/de/pro");
    expect(allProUrls()).toHaveLength(4);
  });

  it("emits canonical, hreflang, and social metadata", async () => {
    for (const locale of LOCALES) {
      const res = renderProPage({
        locale,
        env: { ENVIRONMENT: "staging" },
        signedIn: false,
        plan: "anonymous",
        billingOn: true,
      });
      const html = await res.text();
      expect(html).toContain(`rel="canonical" href="${proUrl(locale)}"`);
      expect(html).toContain('name="description"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('name="twitter:card"');
      expect(html).toContain("application/ld+json");
      for (const alt of proAlternateLinks()) {
        expect(html).toContain(`hreflang="${alt.hreflang}" href="${alt.href}"`);
      }
      expect(html).toContain('content="index, follow"');
    }
  });

  it("hides purchase CTAs for an active Pro subscriber", async () => {
    const html = await renderProPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      signedIn: true,
      plan: "pro",
      billingOn: true,
      periodEnd: 1_790_721_044,
      cancelAtPeriodEnd: false,
    }).text();
    expect(html).toContain("You're on DropIMG Pro");
    expect(html).toContain("Manage billing");
    expect(html).not.toContain("data-interval");
    expect(html).not.toContain("Get Pro");
  });

  it("shows Get Pro for Free and anonymous visitors", async () => {
    const html = await renderProPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      signedIn: true,
      plan: "free",
      billingOn: true,
    }).text();
    expect(html).toContain("Get Pro");
    expect(html).toContain("$24.99");
    expect(html).toContain("$2.99");
    expect(html).toContain("$2.08/mo");
    expect(html).toContain("Save 30%");
    expect(html).toContain("Best value");
    expect(html).not.toContain("Most popular");
  });
});

describe("authenticated pages stay noindex", () => {
  it("marks login, app, and account noindex", () => {
    const login = renderLoginPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      state: "form",
    });
    const app = renderAppPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      origin: "https://dropimg.io",
      email: "user@example.com",
      plan: "free",
      drops: [],
      historyCapped: true,
      nextCursor: null,
    });
    const account = renderAccountPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      email: "user@example.com",
      plan: "free",
      periodEnd: null,
      cancelAtPeriodEnd: false,
    });
    for (const html of [login, app, account]) {
      expect(html).toMatch(/name="robots" content="noindex/);
    }
  });
});
