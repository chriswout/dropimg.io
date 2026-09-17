import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Cursor Marketplace plugin package", () => {
  it("has a valid Cursor Plugin manifest", () => {
    const manifest = JSON.parse(read(".cursor-plugin/plugin.json")) as {
      name: string;
      displayName?: string;
      version: string;
      description: string;
      homepage: string;
      repository: string;
      logo: string;
      mcpServers: string;
      keywords: string[];
      variables?: unknown;
    };
    expect(manifest.name).toBe("dropimg");
    expect(manifest.displayName).toBe("DropIMG Web Assets");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.description.toLowerCase()).toMatch(/permanent web assets/);
    expect(manifest.homepage).toBe("https://dropimg.io/web-assets");
    expect(manifest.repository).toBe("https://github.com/chriswout/dropimg.io");
    expect(manifest.logo).toBe("assets/logo.svg");
    expect(manifest.mcpServers).toBe("./mcp.json");
    expect(manifest.keywords).toEqual(
      expect.arrayContaining(["web-assets", "mcp", "images", "svg", "fonts"]),
    );
    expect(manifest.variables).toBeUndefined();
    expect(manifest.logo.startsWith("..")).toBe(false);
    expect(existsSync(join(root, manifest.logo))).toBe(true);
  });

  it("declares only the production MCP URL with OAuth (no token headers)", () => {
    const mcp = JSON.parse(read("mcp.json")) as {
      mcpServers: Record<string, { type?: string; url: string; headers?: unknown }>;
    };
    expect(Object.keys(mcp.mcpServers)).toEqual(["dropimg"]);
    expect(mcp.mcpServers.dropimg.url).toBe("https://dropimg.io/mcp");
    expect(mcp.mcpServers.dropimg.type).toBe("http");
    expect(mcp.mcpServers.dropimg.headers).toBeUndefined();
    expect(read("mcp.json")).not.toMatch(/dropimg_(pk|api|it)_/);
    expect(read("mcp.json")).not.toMatch(/\$\{[A-Z0-9_]+\}/);
  });

  it("does not ship a hard-coded credential in plugin files", () => {
    const files = [
      ".cursor-plugin/plugin.json",
      "mcp.json",
      "docs/cursor-plugin.md",
      ".agents/skills/dropimg-web-assets/SKILL.md",
    ];
    for (const file of files) {
      expect(read(file), file).not.toMatch(/Bearer [A-Za-z0-9_\-]{12,}/);
      expect(read(file), file).not.toMatch(/dropimg_pk_[A-Za-z0-9]/);
    }
  });

  it("keeps plugin skill folder/name aligned", () => {
    const skill = read(".agents/skills/dropimg-web-assets/SKILL.md");
    expect(skill).toMatch(/^---\nname: dropimg-web-assets\n/);
    expect(existsSync(join(root, "skills/dropimg-web-assets/SKILL.md"))).toBe(true);
  });
});
