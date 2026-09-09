import { describe, expect, it } from "vitest";
import { MCP_TOOL_META } from "../../src/lib/mcp-server";

describe("MCP tool descriptions", () => {
  it("tells the agent the upload job, how to get bytes, and what not to invent", () => {
    const { description, image, expiry } = MCP_TOOL_META.upload_image;
    expect(description).toMatch(/GitHub|PR|Slack/i);
    expect(description).toMatch(/Read the image from the workspace first/i);
    expect(description).toMatch(/Do not invent a URL/i);
    expect(description).toMatch(/Do not pass a file path/i);
    expect(description).toMatch(/PNG, JPEG, WebP, or GIF/);
    expect(description).toMatch(/10 MB/);
    expect(image).toMatch(/base64/);
    expect(image).not.toMatch(/file path/i);
    expect(expiry).toMatch(/1h/);
    expect(expiry).toMatch(/180d/);
  });

  it("scopes get/list/delete to the signed-in account", () => {
    expect(MCP_TOOL_META.get_image.description).toMatch(/YOUR live/i);
    expect(MCP_TOOL_META.list_images.description).toMatch(/YOUR live/i);
    expect(MCP_TOOL_META.delete_image.description).toMatch(/YOUR live/i);
    expect(MCP_TOOL_META.get_image.id).toMatch(/abc123xy/);
    expect(MCP_TOOL_META.delete_image.description).toMatch(/list_images/);
  });
});
