# Workers AI moderation bake-off

Synthetic bake-offs are done for now. The next dataset is real DropIMG traffic in **shadow mode** (`MODERATION_ENABLED=true`, `MODERATION_ENFORCE=false`). Do not set `ENFORCE=true` until would-block rate, flags, unavailable rate, and p50/p95 look sane.

This folder stays as a local harness if we need it later. Do not rerun the 754-image suite as a ship gate.

Add **500–1,000** labeled images locally (gitignored). Cover:

- normal screenshots / text-heavy UI
- beach / swimwear
- medical
- adult
- violent
- guns
- drugs
- cartoons
- known false-positive-prone shots

Download a local set (Wikimedia + Openverse + generated UI screenshots; no CSAM):

```bash
npm run eval:moderation:download
```

Labels follow search queries, not a human review. Treat the bake-off as a first pass.

Or copy `manifest.example.json` to `manifest.json`:

```json
[
  { "id": "ui-1", "path": "safe/ui.png", "expect": "allow", "category": "screenshot" },
  { "id": "violence-1", "path": "block/violence.jpg", "expect": "block", "category": "violence" }
]
```

Run:

```bash
CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… npm run eval:moderation -- --both
```

`adult_nudity`, `drugs`, and `weapons` are recorded but do not block. Hard blocks are explicit sexual content, graphic violence, hate symbols, and self-harm. `graphic_violence` stays a hard block even though recall is weak.

Targeted violence + Call of Duty slice (30–50 images, not the 754 suite):

```bash
npm run eval:moderation:violence:download
npm run eval:moderation:violence
```

First slice (48 images, prompt v3): surgery and Halloween all allowed. Labeled-violence miss rate was high (~0.8) — `graphic_violence` still under-detects. Five Call of Duty stills: two first-person gun views still set `weapons: true`; character / booth / dialogue shots allowed. Game-gun false positives stay a staging watch.

Go if parse-fail is near zero, hard-block recall is high, and screenshot / art false-positive rate is acceptable. Otherwise keep the same quarantine contract and swap in Google Vision later.
