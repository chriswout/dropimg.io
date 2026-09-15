import { describe, expect, it } from "vitest";
import {
  generateOrgSlug,
  isOrgProjectSlug,
  isUuid,
  mediaAliasUrl,
  mediaVersionUrl,
  parseAliasPath,
  parseMediaDeliveryPath,
  permanentOriginalKey,
} from "../../src/lib/media-path";
import { PROJECT_KEY_PREFIX } from "../../src/lib/media-config";
import {
  generateProjectToken,
  projectTokenFormatOk,
} from "../../src/lib/project-credential";

describe("media paths", () => {
  it("accepts nested alias paths and rejects traversal", () => {
    expect(parseAliasPath("website/header")).toBe("website/header");
    expect(parseAliasPath("/website/header/")).toBe("website/header");
    expect(parseAliasPath(".. /secret")).toBeNull();
    expect(parseAliasPath("website//header")).toBeNull();
    expect(parseAliasPath("../header")).toBeNull();
    expect(parseAliasPath("Website/Header")).toBeNull();
  });

  it("parses delivery URLs from the /m prefix", () => {
    expect(parseMediaDeliveryPath("/m/acme/site/website/header")).toEqual({
      orgSlug: "acme",
      projectSlug: "site",
      alias: "website/header",
    });
    expect(parseMediaDeliveryPath("/m/acme/site")).toBeNull();
    expect(parseMediaDeliveryPath("/i/acme/site/header")).toBeNull();
  });

  it("builds stable alias and version URLs without changing the alias path", () => {
    expect(mediaAliasUrl("https://dropimg.io/", "acme", "site", "website/header")).toBe(
      "https://dropimg.io/m/acme/site/website/header",
    );
    expect(
      mediaVersionUrl("https://dropimg.io", "acme", "site", "website/header", "11111111-1111-4111-8111-111111111111"),
    ).toBe(
      "https://dropimg.io/m/acme/site/website/header?v=11111111-1111-4111-8111-111111111111",
    );
  });

  it("keeps permanent originals under p/ and never o/", () => {
    const key = permanentOriginalKey({
      orgId: "org",
      projectId: "proj",
      assetId: "asset",
      versionId: "ver",
    });
    expect(key).toBe("p/org/proj/asset/ver/original");
    expect(key.startsWith("o/")).toBe(false);
  });

  it("generates org slugs that pass the shared slug grammar", () => {
    const slug = generateOrgSlug();
    expect(isOrgProjectSlug(slug)).toBe(true);
    expect(slug.startsWith("o")).toBe(true);
  });

  it("accepts UUID v4 ids and rejects junk", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});

describe("project keys", () => {
  it("issues dropimg_pk_ tokens that pass the format check", () => {
    const token = generateProjectToken();
    expect(token.startsWith(PROJECT_KEY_PREFIX)).toBe(true);
    expect(projectTokenFormatOk(token)).toBe(true);
    expect(projectTokenFormatOk("dropimg_api_aaaaaaaaaaaaaaaaaaaaaa")).toBe(false);
  });
});
