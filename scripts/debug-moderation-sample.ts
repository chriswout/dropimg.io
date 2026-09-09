import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  decideModeration,
  extractModelText,
  MOONDREAM_MODEL,
  parseModerationJson,
  runInputsForModel,
} from "../src/lib/workers-ai-moderation";

async function main() {
  const token = readFileSync(
    join(homedir(), "Library/Preferences/.wrangler/config/default.toml"),
    "utf8",
  ).match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
  if (!token) throw new Error("no wrangler token");
  const account = "0d63cbb8e5f0ff360d850f1456eb7d50";
  const samples = [
    ["safe/screenshot/ui-001.png", "image/png"],
    ["safe/beach/beach-001.jpg", "image/jpeg"],
    ["block/adult/adult-001.jpg", "image/jpeg"],
    ["block/weapons/weapons-001.jpg", "image/jpeg"],
  ] as const;

  for (const [rel, mime] of samples) {
    const bytes = readFileSync(`eval/moderation/${rel}`);
    const image = `data:${mime};base64,${bytes.toString("base64")}`;
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MOONDREAM_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(runInputsForModel(MOONDREAM_MODEL, image)),
      },
    );
    const body = (await res.json()) as { result?: unknown };
    const text = extractModelText(body.result ?? body);
    const scores = parseModerationJson(text);
    console.log(`\n== ${rel} ==`);
    console.log("raw:", text.slice(0, 500));
    console.log("scores:", scores);
    console.log("decision:", scores ? decideModeration(scores, MOONDREAM_MODEL).outcome : "parse-fail");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
