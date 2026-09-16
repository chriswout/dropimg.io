import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const skill = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../.agents/skills/dropimg-web-assets/SKILL.md"),
  "utf8",
);

type Route = "drop" | "media" | "replace" | "unsupported";

const SCENARIOS: Array<{ id: number; prompt: string; expect: Route }> = [
  { id: 1, prompt: "Upload this screenshot so I can paste it in a GitHub issue.", expect: "drop" },
  { id: 2, prompt: "Put this logo into the website.", expect: "media" },
  { id: 3, prompt: "Replace the site's current logo.", expect: "replace" },
  { id: 4, prompt: "Host this PDF brochure.", expect: "unsupported" },
  { id: 5, prompt: "Use this WOFF2 font in the site.", expect: "media" },
  { id: 6, prompt: "Upload this SVG logo.", expect: "media" },
  { id: 7, prompt: "Upload this screenshot to Slack.", expect: "drop" },
  { id: 8, prompt: "Create another logo URL because I changed the logo.", expect: "replace" },
];

function routePrompt(prompt: string): Route {
  const p = prompt.toLowerCase();
  if (/\bpdf\b|\bzip\b|brochure|archive/.test(p)) return "unsupported";
  if (/\breplace\b/.test(p) || /another .+ url because i changed/.test(p)) return "replace";
  if (/\b(logo|hero|favicon|woff2|svg logo|website|site)\b/.test(p) && !/screenshot|slack|github issue/.test(p)) {
    return "media";
  }
  if (/screenshot|github issue|slack|chat|bug report/.test(p)) return "drop";
  if (/\b(logo|hero|favicon|font|woff)\b/.test(p)) return "media";
  return "drop";
}

describe("DropIMG Web Assets skill", () => {
  it("is a Cursor/Claude-compatible SKILL.md with a precise description", () => {
    expect(skill).toMatch(/^---\nname: dropimg-web-assets\n/);
    expect(skill).toMatch(/description:/);
    expect(skill).toMatch(/https:\/\/dropimg\.io\/mcp/);
    expect(skill.length).toBeLessThan(12_000);
  });

  it("teaches Drops vs Media vs unsupported", () => {
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
    expect(skill).toMatch(/never invent a `\/m\/\.\.\.` URL/i);
  });

  it("teaches Media intent upload and confirmed replace", () => {
    expect(skill).toMatch(/upload_media_asset/);
    expect(skill).toMatch(/replace_media_asset/);
    expect(skill).toMatch(/confirm: true/);
    expect(skill).toMatch(/Never put Media binaries or base64 in MCP JSON-RPC/);
    expect(skill).toMatch(/upload_image/);
    expect(skill).toMatch(/project_id/);
    expect(skill).toMatch(/leave application code unchanged/);
    expect(skill).toMatch(/@font-face/);
    expect(skill).toMatch(/sanitizes/);
  });

  it("routes the required agent scenarios", () => {
    for (const s of SCENARIOS) {
      expect(routePrompt(s.prompt), `scenario ${s.id}`).toBe(s.expect);
    }
  });
});
