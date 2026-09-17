import { describe, expect, it } from "vitest";
import { IMAGE_SCOPES } from "../../src/lib/integration-token";
import { mcpAuthFromProps, oauthImageScopes } from "../../src/lib/mcp-server";

describe("MCP OAuth Drop scopes", () => {
  it("gives account MCP sessions full Drop image scopes", () => {
    expect(oauthImageScopes({ userId: "u1", scopes: [] })).toEqual([...IMAGE_SCOPES]);
    expect(mcpAuthFromProps({ userId: "u1", scopes: [] }).scopes).toEqual([...IMAGE_SCOPES]);
    expect(
      mcpAuthFromProps({ userId: "u1", scopes: ["images:read"], tokenId: "grant-uuid" }).scopes,
    ).toEqual([...IMAGE_SCOPES]);
  });

  it("does not give project keys Drop image scopes", () => {
    expect(
      oauthImageScopes({
        userId: "pk:1",
        scopes: [],
        tokenId: "cred-1",
        media: {
          credentialId: "cred-1",
          orgId: "org",
          projectId: "proj",
          scopes: ["media:write"],
          userId: "u1",
        },
      }),
    ).toEqual([]);
  });
});
