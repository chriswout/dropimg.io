import { describe, expect, it } from "vitest";
import {
  renderAccountPage,
  renderBillingPage,
  renderIntegrationsPage,
} from "../../src/views/account";
import { renderAppPage } from "../../src/views/app";
import { renderLoginPage } from "../../src/views/login";
import { renderProPage } from "../../src/views/pro";

describe("Account pages share site chrome", () => {
  it("login uses the homepage header/footer shell", () => {
    const html = renderLoginPage({
      locale: "en",
      env: { ENVIRONMENT: "production" },
      state: "form",
    });
    expect(html).toContain('class="page"');
    expect(html).toContain("brand-logo");
    expect(html).toContain('id="account-nav"');
    expect(html).toContain('class="lang"');
    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain("dropimg:theme");
    expect(html).toContain('class="foot"');
    expect(html).toContain('href="/site.css"');
    expect(html).toContain("/chrome.js");
    expect(html).toContain("Sign in to DropIMG");
    expect(html).toContain("No password required");
    expect(html).toContain('id="account-plan"');
    expect(html).toContain('class="account-menu"');
    expect(html).toContain('href="/pro"');
    expect(html).toContain("Upgrade");
    expect(html).toContain("Pro · $2.99");
    expect(html).toContain("Edit account");
    expect(html).toContain('href="/app/account"');
  });

  it("splits settings into account, billing, and integrations sections", () => {
    const props = {
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      email: "user@example.com",
      plan: "pro",
      periodEnd: 1_790_721_044,
      cancelAtPeriodEnd: false,
    } as const;

    const account = renderAccountPage(props);
    expect(account).toContain("user@example.com");
    expect(account).toContain("Delete account");
    expect(account).toContain("/api/account/delete");

    const billing = renderBillingPage(props);
    expect(billing).toContain("Manage billing");
    expect(billing).toContain("/api/billing/portal");

    const integrations = renderIntegrationsPage(props);
    expect(integrations).toContain("Connect extension");
    expect(integrations).toContain("Create ShareX config");
    expect(integrations).toContain('id="revoke-modal"');

    // Every section renders the same shell nav.
    for (const html of [account, billing, integrations]) {
      expect(html).toContain('class="app-nav"');
      expect(html).toContain('href="/app/integrations"');
    }
  });

  it("pro page shows one offer when not subscribed and a member hero when Pro", async () => {
    const shop = renderProPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      signedIn: true,
      plan: "free",
      billingOn: true,
    });
    expect(shop.status).toBe(200);
    expect(shop.headers.get("Cache-Control")).toBe("private, no-store");
    const html = await shop.text();
    expect(html).toContain("Get Pro");
    // One product, one CTA, with the interval as a selector rather than a
    // second plan card.
    expect(html).toContain('class="pro-offer"');
    expect(html.match(/data-select-interval=/g)).toHaveLength(2);
    expect(html.match(/data-interval="/g)).toHaveLength(1);
    expect(html).toContain('data-interval="annual"');

    const member = renderProPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      signedIn: true,
      plan: "pro",
      billingOn: true,
      periodEnd: 1_790_721_044,
      cancelAtPeriodEnd: false,
    });
    const memberHtml = await member.text();
    expect(memberHtml).toContain("You're on DropIMG Pro");
    expect(memberHtml).toContain("Manage billing");
    expect(memberHtml).not.toContain("Get Pro");
  });

  it("my drops uses the same shell", () => {
    const html = renderAppPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      origin: "https://dropimg.io",
      email: "user@example.com",
      plan: "free",
      drops: [],
      historyCapped: true,
      nextCursor: null,
    });
    expect(html).toContain('class="page"');
    expect(html).toContain("brand-logo");
    expect(html).toContain("My drops");
    expect(html).toContain('href="/site.css"');
  });

  it("my drops rows include a share URL and copy control without loading the original", () => {
    const html = renderAppPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      origin: "https://dropimg.io",
      email: "user@example.com",
      plan: "free",
      drops: [
        {
          slug: "abc123XY",
          mime: "image/png",
          size: 12_345,
          created_at: 1_700_000_000,
          expires_at: 1_700_086_400,
        },
      ],
      historyCapped: true,
      nextCursor: null,
    });
    expect(html).not.toContain('src="/i/abc123XY"');
    expect(html).toContain("dropimg.io/abc123XY");
    expect(html).toContain('data-url="https://dropimg.io/abc123XY"');
    expect(html).toContain("drop-url-input");
    expect(html).toContain("drop-copy");
    expect(html).toContain("drops-view-btn");
  });

  it("account deletion copy lists the real side effects", () => {
    const html = renderAccountPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      email: "user@example.com",
      plan: "pro",
      periodEnd: 1_790_721_044,
      cancelAtPeriodEnd: false,
    });
    expect(html).toContain("Danger zone");
    expect(html).toContain("cancel Pro if active");
    expect(html).toContain("delete your active DropIMG images");
    expect(html).toContain("revoke connected integrations");
    expect(html).toContain("sign you out everywhere");
    expect(html).toContain("This cannot be undone.");
    expect(html).toContain('id="delete-modal"');
  });

  it("Free My drops shows an upgrade path and empty-state upload", () => {
    const html = renderAppPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      origin: "https://dropimg.io",
      email: "user@example.com",
      plan: "free",
      drops: [],
      historyCapped: true,
      nextCursor: null,
    });
    expect(html).toContain("Your drops will show up here.");
    expect(html).toContain("Upload image");
    expect(html).toContain("Last 10 active uploads");
    expect(html).toContain("Upgrade");
  });

  it("loads the Vite client on development pages", () => {
    const html = renderLoginPage({
      locale: "es",
      env: { ENVIRONMENT: "development" },
      state: "form",
    });
    expect(html).toContain("/client/main.ts");
    expect(html).not.toContain("/site.css");
  });
});
