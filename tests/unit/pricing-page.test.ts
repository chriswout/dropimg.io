import { describe, expect, it } from "vitest";
import { PRICING_COMPARE_ROWS, PRICING_PAGE, PRICING_TIERS } from "../../marketing/pricing";
import { renderPricingPage } from "../../marketing/render";
import { WEB_ASSETS_PLANS } from "../../src/lib/web-assets-plans";

describe("Web Assets pricing page redesign", () => {
  const html = renderPricingPage();

  it("keeps canonical prices and checkout contracts", () => {
    expect(PRICING_TIERS[0]).toMatchObject({ id: "free", price: "$0" });
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
    expect(html).toContain("$0");
    expect(html).toContain("$9");
    expect(html).toContain("$90");
    expect(html).toContain("$29");
    expect(html).toContain("$290");
    expect(html).toContain("$7.50");
    expect(html).toContain("$24.17");
    expect(html).toContain('data-wa-checkout="developer"');
    expect(html).toContain('data-wa-checkout="pro"');
    expect(html).toContain('data-interval="monthly"');
    expect(html).toContain('data-select-interval="monthly"');
    expect(html).toContain('data-select-interval="annual"');
    expect(html).toContain("Save 17%");
    expect(html).not.toContain("/checkout");
    expect(html).not.toMatch(/\bunlimited\b/i);
  });

  it("shows plan limits that match the backend catalog", () => {
    expect(html).toContain(String(WEB_ASSETS_PLANS.free.projectLimit));
    expect(html).toContain(String(WEB_ASSETS_PLANS.developer.projectLimit));
    expect(html).toContain(String(WEB_ASSETS_PLANS.pro.projectLimit));
    expect(html).toContain("1 GB");
    expect(html).toContain("10 GB");
    expect(html).toContain("100 GB");
    expect(html).toContain("100K");
    expect(html).toContain("2M");
    expect(html).toContain("10M");
    expect(html).toContain("2 active project keys");
    expect(html).toContain("20 project keys");
    expect(html).toContain("100 project keys");
  });

  it("marks Developer as the recommended plan without generic Pro in the header", () => {
    expect(html).toContain("is-recommended");
    expect(html).toContain("Recommended");
    expect(html).toContain(PRICING_PAGE.h1);
    expect(html).toContain("Start free");
    expect(html).toContain("Choose Developer");
    expect(html).toContain("Choose Pro");
    expect(html).not.toContain("Pro · €2.99");
    expect(html).not.toContain("account-pro-anon");
  });

  it("keeps Drops Pro as a separate compact product", () => {
    expect(html).toContain("Need temporary image sharing instead?");
    expect(html).toContain("Drops Pro");
    expect(html).toContain("€2.99/month");
    expect(html).toContain("View Drops Pro");
    expect(html).toContain("Drops subscriptions are separate from Web Assets plans.");
    expect(html).toContain('href="/pro"');
  });

  it("includes comparison, usage protection, and pricing questions", () => {
    expect(html).toContain("Compare plans");
    expect(PRICING_COMPARE_ROWS).toHaveLength(11);
    expect(html).toContain("Usage protection");
    expect(html).toContain("We don't suddenly break your live assets.");
    expect(html).toContain("Pricing questions");
    expect(html).toContain("Can I buy Developer or Pro today?");
    expect(html).toContain("Can I switch Web Assets plans?");
    expect(html).toContain("the new price starts at the next renewal");
    expect(html).not.toContain("keep access until the paid period ends, then subscribe");
    expect(html).toContain("pricing-billing-status");
    expect(html).toContain("Is there a per-MCP-call fee?");
    expect(html).toContain("Ready to give your coding agent permanent web assets?");
  });
});
