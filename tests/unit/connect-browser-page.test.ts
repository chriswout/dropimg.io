import { describe, expect, it } from "vitest";
import { renderConnectBrowserPage } from "../../src/views/connect-browser";

describe("connect browser page", () => {
  it("never shows an integration token", () => {
    const html = renderConnectBrowserPage({
      locale: "en",
      env: { ENVIRONMENT: "production" },
      pairingId: "11111111-2222-4333-8444-555555555555",
      state: "pending",
    });
    expect(html).toContain("Connect Browser Extension?");
    expect(html).toContain("/connect/browser/11111111-2222-4333-8444-555555555555/approve");
    expect(html).not.toContain("dropimg_it_");
  });
});
