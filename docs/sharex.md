# ShareX

Upload screenshots from [ShareX](https://getsharex.com/) to dropimg.io.

## Setup

1. Download [`integrations/sharex/dropimg.sxcu`](../integrations/sharex/dropimg.sxcu)
2. Open the file (or Import in ShareX → Destinations → Custom uploader)
3. Set dropimg.io as the image uploader destination

## Endpoint

ShareX sends `multipart/form-data`. The adapter at:

`POST /api/integrations/sharex`

extracts the file field and forwards bytes to the main `/api/upload` pipeline with `X-Dropimg-Client: sharex`. Upload limits, MIME checks, stripping, and 24-hour TTL are unchanged.

## Response

JSON matches `/api/upload` (`url`, `imageUrl`, `deleteUrl`, `deleteToken`, `expiresAt`, …). ShareX is configured to use `{json:url}` as the share link.
