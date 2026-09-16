import { describe, expect, it } from "vitest";
import { HOME } from "../../marketing/content";
import { DEVELOPERS_ONBOARDING } from "../../marketing/developers";
import { PRICING_TIERS } from "../../marketing/pricing";
import {
  renderDropsPage,
  renderHome,
  renderPricingPage,
  renderWebAssetsPage,
} from "../../marketing/render";
import { WEB_ASSETS_PAGE } from "../../marketing/web-assets";

describe("homepage Web Assets reposition (KON-79)", () => {
  const html = renderHome("en");

  it("leads with the Web Assets hero and keeps the Drop uploader", () => {
    expect(html).toContain(HOME.en.h1Lead);
    expect(html).toContain(HOME.en.h1Rest);
    expect(html).toContain("Create a Web Assets project");
    expect(html).toContain("Try a temporary Drop");
    expect(html).toContain('id="dropzone"');
    expect(html).toContain("Drop an image. Get a link.");
    expect(html).toContain("Need a quick URL instead?");
    expect(html).toContain('href="#dropzone"');
  });

  it("shows product nav, comparison, formats, and MCP-ready integrations", () => {
    expect(html).toContain("product-nav");
    expect(html).toContain('href="/web-assets"');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain("Drops vs Web Assets");
    expect(html).toContain("Replace asset without changing code");
    expect(html).toContain("/m/acme/site/homepage/hero");
    expect(html).toContain("sanitized SVG");
    expect(html).toContain("WOFF2");
    expect(html).toContain("PDF");
    expect(html).toContain("Works with Cursor · Claude Code · Codex · MCP");
    expect(html).not.toContain("Chrome Web Store badge");
    expect(html).not.toContain("marketplace");
  });

  it("keeps Chrome Web Store listing for the extension promo", () => {
    expect(html).toContain("chromewebstore.google.com");
  });
});

describe("Web Assets product page (KON-80)", () => {
  const html = renderWebAssetsPage();

  it("renders the public product route with supported and unsupported types", () => {
    expect(html).toContain('data-page-intent="web-assets"');
    expect(html).toContain(WEB_ASSETS_PAGE.h1);
    expect(html).toContain("/m/acme/site/branding/logo");
    expect(html).toContain("sanitized SVG");
    expect(html).toContain("WOFF2");
    expect(html).toContain("PDF");
    expect(html).toContain("not confidential");
    expect(html).toContain("data-media-cta=\"create\"");
    expect(html).toContain("Web Assets launching soon");
  });
});

describe("pricing page (KON-80)", () => {
  const html = renderPricingPage();

  it("shows the launch tiers without checkout or unlimited claims", () => {
    expect(html).toContain('data-page-intent="pricing"');
    expect(PRICING_TIERS[0]).toMatchObject({
      id: "free",
      price: "$0",
    });
    expect(PRICING_TIERS[1]).toMatchObject({
      id: "developer",
      price: "$9",
      annual: "$90/year",
    });
    expect(PRICING_TIERS[2]).toMatchObject({
      id: "pro",
      price: "$29",
      annual: "$290/year",
    });
    expect(html).toContain("3 projects");
    expect(html).toContain("1 GB Web Asset storage");
    expect(html).toContain("100K asset deliveries / month");
    expect(html).toContain("20 projects");
    expect(html).toContain("10 GB storage");
    expect(html).toContain("2M asset deliveries / month");
    expect(html).toContain("100 projects");
    expect(html).toContain("100 GB storage");
    expect(html).toContain("10M asset deliveries / month");
    expect(html).toContain("No bandwidth / egress fees.");
    expect(html).toContain("No per-MCP-call charges.");
    expect(html).not.toMatch(/\bunlimited\b/i);
    expect(html).toContain("data-media-cta=\"create\"");
    expect(html).not.toContain("/checkout");
  });
});

describe("developer onboarding (KON-80)", () => {
  it("documents Cursor, Claude Code, Codex, and the canonical MCP endpoint", () => {
    expect(DEVELOPERS_ONBOARDING.mcpEndpoint).toBe("https://dropimg.io/mcp");
    expect(DEVELOPERS_ONBOARDING.cursorHeading).toBe("Cursor");
    expect(DEVELOPERS_ONBOARDING.claudeHeading).toBe("Claude Code");
    expect(DEVELOPERS_ONBOARDING.codexHeading).toBe("Codex");
    expect(DEVELOPERS_ONBOARDING.launchNote).toMatch(/Production Media is still flagged off/i);
  });
});

describe("drops page preservation", () => {
  it("reuses the existing uploader", () => {
    const html = renderDropsPage();
    expect(html).toContain('id="dropzone"');
    expect(html).toContain("Drop an image. Get a link.");
    expect(html).toContain('accept="image/png,image/jpeg,image/webp,image/gif"');
  });
});
