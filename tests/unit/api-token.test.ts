import { describe, expect, it } from "vitest";
import {
  API_TOKEN_PREFIX,
  apiTokenFormatOk,
  generateApiToken,
  parseImageScopes,
  scopesFromRow,
} from "../../src/lib/integration-token";

describe("API tokens and scopes", () => {
  it("mints dropimg_api_ keys", () => {
    const token = generateApiToken();
    expect(token.startsWith(API_TOKEN_PREFIX)).toBe(true);
    expect(apiTokenFormatOk(token)).toBe(true);
    expect(apiTokenFormatOk("dropimg_it_abcdefghijklmnopqr_stu")).toBe(false);
  });

  it("defaults new keys to all three scopes", () => {
    expect(parseImageScopes(undefined)).toEqual([
      "images:write",
      "images:read",
      "images:delete",
    ]);
    expect(parseImageScopes(["images:read"])).toEqual(["images:read"]);
    expect(parseImageScopes([])).toBeNull();
    expect(parseImageScopes(["nope"])).toBeNull();
  });

  it("maps legacy upload scope to images:write", () => {
    expect(scopesFromRow("upload", null)).toEqual(["images:write"]);
    expect(scopesFromRow("upload", JSON.stringify(["images:read", "images:delete"]))).toEqual([
      "images:read",
      "images:delete",
    ]);
  });
});
