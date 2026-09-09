/**
 * Phase 1.5a bake-off. Does not gate production uploads.
 *
 * Uses CLOUDFLARE_API_TOKEN, or the local wrangler OAuth token.
 *
 *   npm run eval:moderation -- --both
 */
import { homedir } from "node:os";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  decideModeration,
  DEFAULT_MODERATION_MODEL,
  extractModelText,
  LLAMA_VISION_MODEL,
  MOONDREAM_MODEL,
  parseModerationJson,
  runInputsForModel,
  type ModerationDecision,
  type ModerationScores,
} from "../src/lib/workers-ai-moderation";

type Case = {
  id: string;
  path: string;
  expect: "allow" | "block";
  category: string;
};

type Row = {
  id: string;
  category: string;
  expect: "allow" | "block";
  outcome: ModerationDecision["outcome"];
  reason?: string;
  scores?: ModerationScores;
  ms: number;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ACCOUNT_FALLBACK = "0d63cbb8e5f0ff360d850f1456eb7d50";

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function wranglerOauthToken(): string | undefined {
  const file = join(homedir(), "Library/Preferences/.wrangler/config/default.toml");
  if (!existsSync(file)) return undefined;
  const match = readFileSync(file, "utf8").match(/oauth_token\s*=\s*"([^"]+)"/);
  return match?.[1];
}

async function runModel(
  model: string,
  image: string,
  accountId: string,
  token: string,
): Promise<unknown> {
  let last = "Workers AI request failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(runInputsForModel(model, image)),
      },
    );
    const body = (await res.json()) as {
      result?: unknown;
      success?: boolean;
      errors?: Array<{ message?: string }>;
    };
    if (res.status === 429 || res.status >= 500) {
      last = `Workers AI ${res.status}`;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    if (!res.ok || body.success === false) {
      throw new Error(`Workers AI ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
    }
    return body.result ?? body;
  }
  throw new Error(last);
}

function mimeOf(path: string): string {
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  return "image/png";
}

const SOFT_CATEGORIES = new Set(["adult", "drugs", "weapons"]);

function summarize(rows: Row[]) {
  const n = rows.length;
  const parseFail = rows.filter((r) => r.outcome === "unavailable").length;
  const labeledAllow = rows.filter((r) => r.expect === "allow");
  const labeledBlock = rows.filter(
    (r) => r.expect === "block" && !SOFT_CATEGORIES.has(r.category),
  );
  const falseBlock = labeledAllow.filter((r) => r.outcome === "block").length;
  const missedBlock = labeledBlock.filter((r) => r.outcome === "allow").length;
  const latencies = rows.map((r) => r.ms).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const byCategory: Record<string, { n: number; allow: number; block: number; unavailable: number }> =
    {};
  for (const row of rows) {
    const bucket = (byCategory[row.category] ??= {
      n: 0,
      allow: 0,
      block: 0,
      unavailable: 0,
    });
    bucket.n += 1;
    bucket[row.outcome] += 1;
  }
  return {
    n,
    parseFailRate: n ? Number((parseFail / n).toFixed(4)) : 0,
    falseBlockRate: labeledAllow.length
      ? Number((falseBlock / labeledAllow.length).toFixed(4))
      : 0,
    missRate: labeledBlock.length
      ? Number((missedBlock / labeledBlock.length).toFixed(4))
      : 0,
    p50,
    p95,
    byCategory,
  };
}

function resultPath(dir: string, model: string, suffix = ""): string {
  const tag = suffix ? `-${suffix}` : "";
  return join(dir, `results-${model.replace(/[^\w.-]+/g, "_")}${tag}.json`);
}

function samplePerCategory(cases: Case[], n: number): Case[] {
  const byCategory = new Map<string, Case[]>();
  for (const item of cases) {
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }
  const picked: Case[] = [];
  for (const bucket of byCategory.values()) {
    picked.push(...bucket.slice(0, n));
  }
  return picked;
}

function loadRows(out: string): Row[] {
  if (!existsSync(out)) return [];
  try {
    const parsed = JSON.parse(readFileSync(out, "utf8")) as { rows?: Row[] };
    return Array.isArray(parsed.rows) ? parsed.rows : [];
  } catch {
    return [];
  }
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

async function classifyOne(
  item: Case,
  dir: string,
  model: string,
  accountId: string,
  token: string,
): Promise<Row> {
  const file = join(dir, item.path);
  const started = Date.now();
  try {
    const bytes = readFileSync(file);
    const image = `data:${mimeOf(item.path)};base64,${bytes.toString("base64")}`;
    const raw = await runModel(model, image, accountId, token);
    const scores = parseModerationJson(extractModelText(raw));
    if (!scores) {
      const preview = extractModelText(raw).slice(0, 160) || JSON.stringify(raw).slice(0, 160);
      return {
        id: item.id,
        category: item.category,
        expect: item.expect,
        outcome: "unavailable",
        reason: `parse:${preview}`,
        ms: Date.now() - started,
      };
    }
    const decided = decideModeration(scores, model);
    return {
      id: item.id,
      category: item.category,
      expect: item.expect,
      outcome: decided.outcome,
      scores,
      ms: Date.now() - started,
    };
  } catch (err) {
    return {
      id: item.id,
      category: item.category,
      expect: item.expect,
      outcome: "unavailable",
      reason: err instanceof Error ? err.message.slice(0, 200) : "error",
      ms: Date.now() - started,
    };
  }
}

async function main() {
  const dir = resolve(root, arg("--dir", "eval/moderation"));
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`Missing ${manifestPath}. Run npm run eval:moderation:download`);
    process.exit(1);
  }
  const allCases = JSON.parse(readFileSync(manifestPath, "utf8")) as Case[];
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || ACCOUNT_FALLBACK;
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim() || wranglerOauthToken();
  if (!token) {
    console.error("No Cloudflare token. Run wrangler login or set CLOUDFLARE_API_TOKEN.");
    process.exit(1);
  }

  const models = [arg("--model", DEFAULT_MODERATION_MODEL)];
  if (process.argv.includes("--both")) {
    models.splice(0, models.length, MOONDREAM_MODEL, LLAMA_VISION_MODEL);
  }
  const perCategory = Number(arg("--sample", "0"));
  const cases = perCategory > 0 ? samplePerCategory(allCases, perCategory) : allCases;
  const limit = Number(arg("--limit", "0")) || cases.length;
  const concurrency = Math.max(1, Number(arg("--concurrency", "3")));
  const fresh = process.argv.includes("--fresh");
  const slice = cases.slice(0, limit);

  for (const model of models) {
    if (model === LLAMA_VISION_MODEL) {
      try {
        await runModel(model, "data:image/png;base64,aa", accountId, token);
      } catch {
        // license agree is a separate call; ignore probe failure
      }
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "agree" }),
        },
      );
    }

    const out = resultPath(dir, model, perCategory > 0 ? `sample${perCategory}` : "");
    const rows = fresh ? [] : loadRows(out);
    const done = new Set(rows.map((r) => r.id));
    const pending = slice.filter((item) => !done.has(item.id));
    console.log(`${model}: ${done.size} done, ${pending.length} remaining`);
    let finished = 0;
    await mapPool(pending, concurrency, async (item) => {
      const row = await classifyOne(item, dir, model, accountId, token);
      rows.push(row);
      finished += 1;
      if (finished % 10 === 0 || finished === pending.length) {
        writeFileSync(out, JSON.stringify({ model, summary: summarize(rows), rows }, null, 2));
        console.log(`  ${finished}/${pending.length} ${row.id} ${row.outcome} ${row.ms}ms`);
      }
    });
    const summary = summarize(rows);
    writeFileSync(out, JSON.stringify({ model, summary, rows }, null, 2));
    console.log(model, summary);
    console.log("wrote", out);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
