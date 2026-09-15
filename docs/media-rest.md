# DropIMG Media — REST

Permanent files for a website or agent-built app. Temporary My Drops stay on `/api/v1/images`.

Public `/m/...` aliases provide no confidentiality. Knowledge of the URL is sufficient to fetch the asset.

Requires `MEDIA_ENABLED=true` (staging today; production remains off).

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
  -F path=logo \
  -F file=@logo.png
```

Use the returned `url` in HTML/CSS. Optional `Idempotency-Key` (1–128 characters) is scoped to this project and `asset.create` for 24 hours.

## 4. Replace without changing the URL

```bash
curl -X POST https://dropimg.io/api/v1/media/assets/$ASSET_ID/versions \
  -H "Authorization: Bearer dropimg_pk_…" \
  -F file=@logo-v2.png
```

`GET /m/{org}/{project}/{path}` serves the new bytes. `?v={oldVersionId}` still serves an old version until the asset is deleted.

## 5. Delete

```bash
curl -X DELETE https://dropimg.io/api/v1/media/assets/$ASSET_ID \
  -H "Authorization: Bearer dropimg_pk_…"
```

The alias becomes 404. Stored originals are removed. Account deletion is allowed after the last live asset is gone.

See also `/app/media`, [`docs/media-mcp.md`](media-mcp.md), and [`/openapi/v1.yaml`](https://dropimg.io/openapi/v1.yaml).
