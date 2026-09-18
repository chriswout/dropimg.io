import { describe, expect, it } from "vitest";
import { CHROME, HOME } from "../../marketing/content";
import { DEVELOPERS_ONBOARDING, DEVELOPERS_PAGE } from "../../marketing/developers";
import { PRICING_PAGE, PRICING_TIERS } from "../../marketing/pricing";
import {
  renderDevelopersPage,
  renderHome,
  renderPricingPage,
  renderWebAssetsPage,
} from "../../marketing/render";
import { UI } from "../../marketing/ui";
import { WEB_ASSETS_PAGE } from "../../marketing/web-assets";
import { LOCALES } from "../../marketing/locales";

describe("product taxonomy chrome", () => {
  it("keeps Drops Pro out of the global header", () => {
    const html = renderHome("en");
    expect(html).toContain("Web Assets");
    expect(html).toContain("Drops");
    expect(html).toContain("Pricing");
    expect(html).toContain("Docs");
    expect(html).toContain("Get started");
    expect(html).toContain("Sign in");
    expect(html).toContain(">Dashboard<");
    expect(html).not.toContain("Pro · €2.99");
    expect(html).not.toContain("account-pro-anon");
    expect(html).not.toContain(">My drops<");
    expect(html).toContain("Drops Pro");
    expect(html).toContain("Developer Docs");
  });

  it("labels Drops Pro in the footer, not a generic Pro", () => {
    const html = renderHome("en");
    expect(html).toContain(">Drops Pro<");
    expect(html).not.toMatch(/foot-col[\s\S]*?>Pro</);
  });
});

describe("pricing page scope", () => {
  const html = renderPricingPage();

  it("is Web Assets first with Drops Pro called out separately", () => {
    expect(html).toContain("Web Assets pricing");
    expect(html).toContain("Looking for Drops pricing?");
    expect(html).toContain("Drops Pro");
    expect(html).toContain("€2.99/month");
    expect(PRICING_TIERS[0]).toMatchObject({ id: "free", price: "$0" });
    expect(PRICING_TIERS[1]).toMatchObject({ id: "developer", price: "$9" });
    expect(PRICING_TIERS[2]).toMatchObject({ id: "pro", price: "$29" });
    expect(html).toContain('data-wa-checkout="developer"');
    expect(html).toContain('data-wa-checkout="pro"');
    expect(PRICING_PAGE.h1).toBe("Web Assets pricing");
  });
});

describe("stale launch states", () => {
  it("does not ship coming-soon copy on live surfaces", () => {
    const pages = [renderHome("en"), renderWebAssetsPage(), renderDevelopersPage()];
    for (const html of pages) {
      expect(html).not.toMatch(/coming soon/i);
      expect(html).not.toMatch(/launching soon/i);
      expect(html).not.toContain("data-cta-soon");
      expect(html).not.toMatch(/when Media is enabled/i);
    }
    expect(WEB_ASSETS_PAGE.kicker).toBe("Web Assets");
    expect(DEVELOPERS_ONBOARDING.launchNote).toBe("");
  });
});

describe("localized taxonomy", () => {
  it("qualifies Drops Pro and localizes project teasers", () => {
    for (const locale of LOCALES) {
      expect(CHROME[locale].dropsProPrice).toContain("Drops Pro");
      expect(CHROME[locale].dropsPro).toBe("Drops Pro");
      expect(UI[locale].needLongerBody).toMatch(/Drops Pro/);
      expect(renderHome(locale)).not.toContain("data-cta-soon");
    }
    expect(HOME.es.pricingTeasers[0]).toContain("proyectos");
    expect(HOME["pt-BR"].pricingTeasers[0]).toContain("projetos");
    expect(HOME.de.pricingTeasers[0]).toContain("Projekte");
    expect(renderHome("es")).not.toContain("3 projects");
  });
});
