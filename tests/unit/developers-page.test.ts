import { describe, expect, it } from "vitest";
import { DEVELOPERS_PAGE } from "../../marketing/developers";
import { CHROME_WEB_STORE_URL, EXTENSION_PAGE } from "../../marketing/extension";
import { MCP_PAGE } from "../../marketing/mcp";
import { renderDevelopersPage, renderExtensionPage, renderHome, renderMcpPage } from "../../marketing/render";

describe("developers and mcp product pages", () => {
  it("positions docs around Web Assets, MCP, and REST", () => {
    const html = renderDevelopersPage();
    expect(html).toContain("Web assets your coding agent can manage.");
    expect(html).toContain("Connect with MCP");
    expect(html).toContain("https://dropimg.io/mcp");
    expect(html).toContain("data-page-intent=\"developers\"");
    expect(html).toContain("dropimg_api_");
    expect(html).toContain("dropimg_pk_");
    expect(html).toContain("list_media_projects");
    expect(html).toContain("upload_media_asset");
    expect(html).toContain("POST https://dropimg.io/api/v1/media/orgs");
    expect(html).toContain("Temporary Drops API");
    expect(html).toContain("POST https://dropimg.io/api/v1/images");
    expect(html).toContain("Authorization: Bearer");
    expect(html).toContain("image_url");
    expect(html).toContain("created_at");
    expect(html).not.toContain("delete_url");
    expect(html).toContain("/openapi/v1.yaml");
    expect(html).toContain("quota_exceeded");
    expect(html).toContain("Knowledge of the URL is sufficient");
    expect(html).toContain("code-box");
    expect(DEVELOPERS_PAGE.title).toContain("Web Assets");
    expect(DEVELOPERS_PAGE.title).toContain("MCP");
    expect(html).not.toContain("Temporary Image Upload API");
    expect(html).not.toContain("when Media is enabled");
  });

  it("sells MCP as stable web assets for coding agents", () => {
    const html = renderMcpPage();
    expect(html).toContain("Give your coding agent stable web assets.");
    expect(html).toContain("data-page-intent=\"mcp\"");
    expect(html).toContain("https://dropimg.io/mcp");
    expect(html).toContain("Add to Cursor");
    expect(html).toContain("cursor.com/en/install-mcp");
    expect(html).toContain("Claude Desktop snippet");
    expect(html).toContain("30 MCP requests per minute");
    expect(html).toContain("one text line per live drop");
    expect(html).toContain("must not invent a URL");
    expect(html).not.toContain("same envelope as REST");
    expect(html).not.toContain("when Media is enabled");
    expect(html).toContain("Free 20 uploads / 50 MB");
    expect(MCP_PAGE.heroFacts[0]).toContain("Add to Cursor");
    expect(MCP_PAGE.heroFacts[1]).toMatch(/stable \/m/i);
    expect(MCP_PAGE.heroFacts[2]).toMatch(/GitHub|PR|Slack/);
    expect(html).not.toContain("Ask your agent for a temporary image URL");
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
