import { readFileSync } from "node:fs";
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
    expect(html).toContain('class="drop-utility"');
    expect(html).not.toContain("hero drop-hero");
  });

  it("shows product nav, comparison, formats, and MCP-ready integrations", () => {
    expect(html).toContain("product-nav");
    expect(html).toContain('href="/web-assets"');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain("Drops vs Web Assets");
    expect(html).toContain("Need a quick image URL?");
    expect(html).toContain("Building an app?");
    expect(html).toContain("/m/acme/site/homepage/hero");
    expect(html).toContain("sanitized SVG");
    expect(html).toContain("WOFF2");
    expect(html).toContain("PDF");
    expect(html).toContain("Works with Cursor · Claude Code · Codex · MCP");
    expect(html).not.toContain("Chrome Web Store badge");
    expect(html).not.toContain("marketplace");
  });

  it("lands the Web Assets story before the Drop uploader", () => {
    const ids = [
      ...html.matchAll(
        /id="(hero-heading|demo-heading|drop-heading|compare-heading|formats-heading|pricing-heading|security-heading|faq-heading|closing-heading)"/g,
      ),
    ].map((match) => match[1]);
    expect(ids).toEqual([
      "hero-heading",
      "demo-heading",
      "drop-heading",
      "compare-heading",
      "formats-heading",
      "pricing-heading",
      "security-heading",
      "faq-heading",
      "closing-heading",
    ]);
  });

  it("uses benefit-oriented formats copy, a pricing teaser, and a closing CTA", () => {
    expect(html).toContain("Everything your AI-built site needs. Nothing it doesn’t.");
    expect(html).toContain(
      "Images, SVGs, icons and web fonts—validated, versioned and served from stable URLs.",
    );
    expect(html).not.toContain("Focused Web Assets, not generic file storage");
    expect(html).toContain("See full pricing");
    expect(html).toContain("$9");
    expect(html).toContain("$29");
    expect(html).toContain("/mo");
    expect(html).not.toContain("3 projects");
    expect(html).not.toContain("10 GB · 2M deliveries");
    expect(html).not.toContain("How a Drop works");
    expect(html).not.toContain("Share it. Forget it.");
    expect(html).not.toContain("id=\"agents-heading\"");
    expect(html).not.toContain("id=\"stable-heading\"");
    expect(html).toContain("Give your coding agent permanent web assets.");
    expect(html).toContain("Create a project");
    expect(html).toContain("Read the docs");
    expect(html).toContain("Agent");
    expect(html).toContain("Stable URL unchanged");
  });

  it("keeps Chrome Web Store listing for the extension promo", () => {
    expect(html).toContain("chromewebstore.google.com");
  });

  it("keeps Media CTAs live and does not ship coming-soon fallbacks", () => {
    expect(html).not.toContain('data-cta-soon="Web Assets launching soon"');
    expect(html).not.toContain("data-cta-soon");
    expect(html).toContain('data-media-cta="create"');
  });

  it("shows a replacement story with real assets instead of a path list", () => {
    expect(html).toContain("story-swap");
    expect(html).toContain("stable-v-label");
    expect(html).toContain("Version 12 · AVIF");
    expect(html).toContain("Version 13 · WebP");
    expect(html).toContain("https://dropimg.io/m/o9eamt653257/website/marketing/home/hero-v1");
    expect(html).toContain("https://dropimg.io/m/o9eamt653257/website/marketing/home/hero-v2");
    expect(html).not.toContain("path-examples");
    expect(html).not.toContain("stable-board");
    expect(html).toContain("Inspected on ingest");
    expect(html).not.toContain("Server-authoritative file inspection");
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
    expect(html).not.toContain("Web Assets launching soon");
    expect(html).not.toContain("data-cta-soon");
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
    expect(html).toContain("1 GB");
    expect(html).toContain("100K");
    expect(html).toContain("20 project keys");
    expect(html).toContain("10 GB");
    expect(html).toContain("2M");
    expect(html).toContain("100 project keys");
    expect(html).toContain("100 GB");
    expect(html).toContain("10M");
    expect(html).toContain("No bandwidth / egress fees.");
    expect(html).toContain("No per-MCP-call charges.");
    expect(html).not.toMatch(/\bunlimited\b/i);
    expect(html).toContain("data-media-cta=\"create\"");
    expect(html).toContain('data-wa-checkout="developer"');
    expect(html).toContain('data-wa-checkout="pro"');
    expect(html).not.toContain("/checkout");
  });
});

describe("developer onboarding (KON-80)", () => {
  it("documents Cursor, Claude Code, Codex, and the canonical MCP endpoint", () => {
    expect(DEVELOPERS_ONBOARDING.mcpEndpoint).toBe("https://dropimg.io/mcp");
    expect(DEVELOPERS_ONBOARDING.cursorHeading).toBe("Cursor");
    expect(DEVELOPERS_ONBOARDING.claudeHeading).toBe("Claude Code");
    expect(DEVELOPERS_ONBOARDING.codexHeading).toBe("Codex");
    expect(DEVELOPERS_ONBOARDING.launchNote).toBe("");
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

describe("Vite production MPA inputs", () => {
  it("includes Web Assets, pricing, and drops HTML so they ship with the Worker", () => {
    const src = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");
    expect(src).toContain('web-assets/index.html');
    expect(src).toContain("pricing/index.html");
    expect(src).toContain("drops/index.html");
  });
});
