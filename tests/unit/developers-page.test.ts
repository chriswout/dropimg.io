import { describe, expect, it } from "vitest";
import { DEVELOPERS_PAGE } from "../../marketing/developers";
import { CHROME_WEB_STORE_URL, EXTENSION_PAGE } from "../../marketing/extension";
import { MCP_PAGE } from "../../marketing/mcp";
import { renderDevelopersPage, renderExtensionPage, renderHome, renderMcpPage } from "../../marketing/render";

describe("developers and mcp product pages", () => {
  it("opens with the product line and a curl", () => {
    const html = renderDevelopersPage();
    expect(html).toContain("Image in. URL out.");
    expect(html).toContain("data-page-intent=\"developers\"");
    expect(html).toContain("POST https://dropimg.io/api/v1/images");
    expect(html).toContain("Authorization: Bearer");
    expect(html).toContain("image_url");
    expect(html).toContain("created_at");
    expect(html).not.toContain("delete_url");
    expect(html).toContain("/openapi/v1.yaml");
    expect(html).toContain("Free 20 uploads / 50 MB per day");
    expect(DEVELOPERS_PAGE.title.toLowerCase()).toContain("image upload api");
  });

  it("sells MCP as a temporary image URL for agents", () => {
    const html = renderMcpPage();
    expect(html).toContain("Ask your agent for a temporary image URL");
    expect(html).toContain("data-page-intent=\"mcp\"");
    expect(html).toContain("https://dropimg.io/mcp");
    expect(html).toContain("Add to Cursor");
    expect(html).toContain("cursor.com/en/install-mcp");
    expect(html).toContain("Claude Desktop snippet");
    expect(html).toContain("30 MCP requests per minute");
    expect(html).toContain("one text line per live drop");
    expect(html).toContain("must not invent a URL");
    expect(html).not.toContain("same envelope as REST");
    expect(html).toContain("Free 20 uploads / 50 MB");
    expect(MCP_PAGE.heroFacts[0]).toContain("Add to Cursor");
    expect(MCP_PAGE.heroFacts[1]).toMatch(/GitHub|PR|Slack/);
  });

  it("sends homepage and extension page installs to the Chrome Web Store listing", () => {
    const home = renderHome("en");
    const ext = renderExtensionPage();
    expect(home).toContain(CHROME_WEB_STORE_URL);
    expect(home).toContain("Available on the Chrome Web Store");
    expect(ext).toContain(CHROME_WEB_STORE_URL);
    expect(ext).toContain(EXTENSION_PAGE.storeCta);
    expect(ext).not.toContain("coming soon");
  });
});
