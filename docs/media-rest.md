# DropIMG Media — REST

DropIMG Media is **permanent Web Asset infrastructure** for AI-built websites and applications. Broader than an image host, narrower than a blob store. The differentiator is a stable alias agents can upload, replace, and manage without changing application code:

`https://dropimg.io/m/{orgSlug}/{projectSlug}/{path}`

Example: `/m/acme/site/branding/logo`. Underlying versions may change. The alias does not.

Temporary My Drops stay on `/api/v1/images` and `/o/...`. Permanent objects stay under `p/...`.

Public `/m/...` aliases provide no confidentiality. Knowledge of the URL is sufficient to fetch the asset.

Requires `MEDIA_ENABLED=true` (staging today; production remains off).

## Supported Web Assets

| Category | `assetType` | MIME |
|---|---|---|
| Raster | `image` | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif` |
| Vector | `vector` | `image/svg+xml` (sanitized before store) |
| Icons | `icon` | `image/x-icon` |
| Fonts | `font` | `font/woff`, `font/woff2` |

The server is authoritative. Filename, multipart `Content-Type`, and MCP-declared type are ignored. Bytes decide `mime` and `assetType`.

Canonical ICO MIME is `image/x-icon` (not `image/vnd.microsoft.icon`) because browsers treat it as the favicon type.

## Explicitly unsupported

PDFs, video, audio, archives (ZIP/TAR), EXE/APK, HTML/JS/CSS/PHP, source code, generic `application/octet-stream`, and any client MIME override.

DropIMG is web-asset infrastructure, not general blob storage. Unsupported files fail with `415` (`unsupported_type`) or `400`/`422` when the bytes are malformed or unsafe.

## Detection, sanitization, and hash

SVG is parsed with a real XML sanitizer (not regex). Active constructs (`script`, `on*`, `foreignObject`, external `href`/`use`/`image`, `javascript:` URLs, CSS `@import`, DTD/entity payloads) are rejected. If sanitization succeeds, **only the sanitized tree is stored and served**. Input SHA-256 may differ from the stored hash; that is intentional.

AVIF is validated as ISO BMFF (`ftyp` brand `avif`/`avis` + `ispe` dimensions). The Worker does not decode AV1, so EXIF-style stripping is not applied to AVIF. PNG/JPEG/WebP/GIF still go through the existing metadata strip + moderation path.

WOFF/WOFF2 are identified by container bytes. TTF, OTF, and EOT are rejected. Fonts have a 2 MB cap; SVG and ICO 1 MB; overall Media upload cap remains 10 MB. Storage quota is unchanged.

## MIME changes on replace

Replacement **may change MIME**. `/m/{org}/{project}/branding/logo` can move SVG → PNG (or ICO → SVG, etc.) because the alias is a role, not a file extension.

- The live alias immediately serves the new `Content-Type`.
- `?v={oldVersionId}` keeps the old MIME and bytes until the asset is deleted.
- Clients must not rely on a file extension in the URL.

## 1. Create a project

Sign in, then:

```bash
curl -X POST https://dropimg.io/api/v1/media/orgs \
  -H "Origin: https://dropimg.io" \
  -H "Content-Type: application/json" \
  --cookie "dropimg_session=…" \
  -d '{}'

curl -X POST https://dropimg.io/api/v1/media/orgs/$ORG_ID/projects \
  -H "Origin: https://dropimg.io" \
  -H "Content-Type: application/json" \
  --cookie "dropimg_session=…" \
  -d '{"slug":"website","name":"Website"}'
```

The project’s namespace is `https://dropimg.io/m/{orgSlug}/{projectSlug}/`.

## 2. Mint a project key

Shown once. Prefix `dropimg_pk_`.

```bash
curl -X POST https://dropimg.io/api/v1/media/projects/$PROJECT_ID/keys \
  -H "Origin: https://dropimg.io" \
  -H "Content-Type: application/json" \
  --cookie "dropimg_session=…" \
  -d '{"label":"CI"}'
```

List metadata (no hashes, no raw token):

```bash
curl https://dropimg.io/api/v1/media/projects/$PROJECT_ID/keys \
  --cookie "dropimg_session=…"
```

Revoke (auth fails immediately):

```bash
curl -X POST https://dropimg.io/api/v1/media/projects/$PROJECT_ID/keys/$KEY_ID/revoke \
  -H "Origin: https://dropimg.io" \
  --cookie "dropimg_session=…"
```

## 3. Upload the first asset

```bash
curl -X POST https://dropimg.io/api/v1/media/projects/$PROJECT_ID/assets \
  -H "Authorization: Bearer dropimg_pk_…" \
  -F path=branding/logo \
  -F file=@logo.svg
```

Response includes `mime`, `assetType`, `url`, and version metadata. Optional `Idempotency-Key` (1–128 characters) is scoped to this project and `asset.create` for 24 hours.

## 4. Replace without changing the URL

```bash
curl -X POST https://dropimg.io/api/v1/media/assets/$ASSET_ID/versions \
  -H "Authorization: Bearer dropimg_pk_…" \
  -F file=@logo-v2.png
```

`GET /m/{org}/{project}/{path}` serves the new bytes and MIME. `?v={oldVersionId}` still serves an old version until the asset is deleted.

## 5. Delete

```bash
curl -X DELETE https://dropimg.io/api/v1/media/assets/$ASSET_ID \
  -H "Authorization: Bearer dropimg_pk_…"
```

The alias becomes 404. Stored originals are removed. Account deletion is allowed after the last live asset is gone.

## Delivery headers

Public aliases send `X-Content-Type-Options: nosniff`, `Access-Control-Allow-Origin: *`, and `Cross-Origin-Resource-Policy: cross-origin` so sites can use `<img>` and `@font-face` from another origin.

SVG aliases additionally send:

```text
Content-Type: image/svg+xml; charset=utf-8
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox
```

A dedicated asset hostname is a future production hardening option; this pass keeps `/m/...` on the main origin.

See also `/app/media`, [`docs/media-mcp.md`](media-mcp.md), and [`/openapi/v1.yaml`](https://dropimg.io/openapi/v1.yaml).
