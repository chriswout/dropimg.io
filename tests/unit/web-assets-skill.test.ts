import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const skill = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../.agents/skills/dropimg-web-assets/SKILL.md"),
  "utf8",
);

type Route = "drop" | "media" | "replace" | "unsupported" | "ask";

const SCENARIOS: Array<{ id: number; prompt: string; expect: Route }> = [
  { id: 1, prompt: "Upload this screenshot so I can paste it in a GitHub issue.", expect: "drop" },
  { id: 2, prompt: "Put this logo into the website.", expect: "media" },
  { id: 3, prompt: "Replace the site's current logo.", expect: "replace" },
  { id: 4, prompt: "Host this PDF brochure.", expect: "unsupported" },
  { id: 5, prompt: "Use this WOFF2 font in the site.", expect: "media" },
  { id: 6, prompt: "Upload this SVG logo.", expect: "media" },
  { id: 7, prompt: "Upload this screenshot to Slack.", expect: "drop" },
  { id: 8, prompt: "Create another logo URL because I changed the logo.", expect: "replace" },
  { id: 9, prompt: "Add this WOFF2 font to the site.", expect: "media" },
  { id: 10, prompt: "Replace our current logo with this SVG.", expect: "replace" },
  { id: 11, prompt: "Replace branding/logo SVG with this PNG.", expect: "replace" },
  { id: 12, prompt: "Store this private API credential as an asset.", expect: "unsupported" },
  { id: 13, prompt: "Upload another hero image.", expect: "ask" },
];

function routePrompt(prompt: string): Route {
  const p = prompt.toLowerCase();
  if (/\bpdf\b|\bzip\b|brochure|archive|credential|secret|confidential/.test(p)) {
    return "unsupported";
  }
  if (/\banother hero\b/.test(p)) return "ask";
  if (/\breplace\b/.test(p) || /another .+ url because i changed/.test(p)) return "replace";
  if (
    /\b(logo|hero|favicon|woff2|svg logo|website|site)\b/.test(p) &&
    !/screenshot|slack|github issue/.test(p)
  ) {
    return "media";
  }
  if (/screenshot|github issue|slack|chat|bug report/.test(p)) return "drop";
  if (/\b(logo|hero|favicon|font|woff)\b/.test(p)) return "media";
  return "drop";
}

describe("DropIMG Web Assets skill", () => {
  it("is a Cursor-compatible SKILL.md with an intent-oriented description", () => {
    expect(skill).toMatch(/^---\nname: dropimg-web-assets\n/);
    expect(skill).toMatch(/description: >-/);
    expect(skill).toMatch(/permanent Web\s+Assets/);
    expect(skill).toMatch(/temporary Drops/);
    expect(skill).toMatch(/replace an existing Web Asset/);
    expect(skill).not.toMatch(/dropimg_pk_YOUR_KEY/);
    expect(skill).not.toMatch(/Production Media may be flagged off/);
    expect(skill).not.toMatch(/Do not copy this skill into a second MCP server/);
    expect(skill.length).toBeLessThan(12_000);
  });

  it("keeps a single canonical copy for the Cursor plugin", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
    const canonical = join(root, ".agents/skills/dropimg-web-assets/SKILL.md");
    const plugin = join(root, "skills/dropimg-web-assets/SKILL.md");
    expect(existsSync(plugin)).toBe(true);
    expect(lstatSync(plugin).isSymbolicLink()).toBe(true);
    expect(realpathSync(plugin)).toBe(realpathSync(canonical));
  });

  it("teaches Drops vs Web Assets vs unsupported", () => {
    expect(skill).toMatch(/Screenshot for a bug report/);
    expect(skill).toMatch(/Screenshot for GitHub issue/);
    expect(skill).toMatch(/Slack/);
    expect(skill).toMatch(/Logo used by the website/);
    expect(skill).toMatch(/Homepage hero/);
    expect(skill).toMatch(/favicon\.ico/);
    expect(skill).toMatch(/logo\.svg/);
    expect(skill).toMatch(/Inter\.woff2/);
    expect(skill).toMatch(/PDF brochure/);
    expect(skill).toMatch(/ZIP \/ archive/);
    expect(skill).toMatch(/Never invent `\/m\/\.\.\.` paths/);
    expect(skill).toMatch(/Default to the stable alias/);
    expect(skill).toMatch(/Do not replace a stable alias with a version URL/);
  });

  it("teaches replace-before-create, stable aliases, quotas, and the intent upload path", () => {
    expect(skill).toMatch(/upload_media_asset/);
    expect(skill).toMatch(/replace_media_asset/);
    expect(skill).toMatch(/confirm: true/);
    expect(skill).toMatch(/Never put Web Asset binaries or base64 in MCP JSON-RPC/);
    expect(skill).toMatch(/upload_image/);
    expect(skill).toMatch(/project_id/);
    expect(skill).toMatch(/leave application URL\/code unchanged/);
    expect(skill).toMatch(/@font-face/);
    expect(skill).toMatch(/sanitizes/);
    expect(skill).toMatch(/quota_exceeded/);
    expect(skill).toMatch(/Do not create `branding\/logo-new`/);
    expect(skill).toMatch(/intentionally mutable/);
    expect(skill).toMatch(/credentials supplied by the installed DropIMG MCP connection/);
    expect(skill).toMatch(/Do not introduce a second DropIMG MCP backend/);
  });

  it("covers the error table including quota and existing roles", () => {
    expect(skill).toMatch(/Existing semantic role/);
    expect(skill).toMatch(/Plan\/project\/storage\/key quota exceeded/);
    expect(skill).toMatch(/`\/m\/\.\.\.` is public/);
  });

  it("routes the required agent scenarios", () => {
    for (const s of SCENARIOS) {
      expect(routePrompt(s.prompt), `scenario ${s.id}`).toBe(s.expect);
    }
  });
});
