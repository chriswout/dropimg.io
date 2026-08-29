import { describe, expect, it } from "vitest";
import { shouldOfferLangSuggest } from "../../src/lib/lang-suggest";

describe("shouldOfferLangSuggest", () => {
  it("offers Spanish on first English visit when the browser prefers es", () => {
    expect(
      shouldOfferLangSuggest({
        pageLocale: "en",
        storedLocale: null,
        dismissed: false,
        browserMatch: "es",
      }),
    ).toBe(true);
  });

  it("stays hidden after switching back to English", () => {
    expect(
      shouldOfferLangSuggest({
        pageLocale: "en",
        storedLocale: "en",
        dismissed: false,
        browserMatch: "es",
      }),
    ).toBe(false);
  });

  it("stays hidden after dismiss and after choosing Spanish", () => {
    expect(
      shouldOfferLangSuggest({
        pageLocale: "en",
        storedLocale: null,
        dismissed: true,
        browserMatch: "es",
      }),
    ).toBe(false);
    expect(
      shouldOfferLangSuggest({
        pageLocale: "en",
        storedLocale: "es",
        dismissed: false,
        browserMatch: "es",
      }),
    ).toBe(false);
  });

  it("never offers on a non-English page", () => {
    expect(
      shouldOfferLangSuggest({
        pageLocale: "es",
        storedLocale: null,
        dismissed: false,
        browserMatch: "es",
      }),
    ).toBe(false);
  });
});
