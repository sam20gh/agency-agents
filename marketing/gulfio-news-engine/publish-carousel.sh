#!/usr/bin/env bash
# publish-carousel.sh — Phase 4: publish the 6 slides to TikTok + Instagram
# via the Upload-Post API. Saves the returned request_id to post-info.json.
#
# Usage:
#   ./publish-carousel.sh <run-dir>
#
# Env:
#   UPLOADPOST_TOKEN (required)  — Upload-Post API token
#   UPLOADPOST_USER  (required)  — Upload-Post username
#   UPLOADPOST_PLATFORMS (optional) — space list, default "tiktok instagram"

set -euo pipefail

RUN_DIR="${1:?Usage: publish-carousel.sh <run-dir>}"
API_BASE="${UPLOADPOST_API_BASE:-https://api.upload-post.com}"
PLATFORMS="${UPLOADPOST_PLATFORMS:-tiktok instagram}"

: "${UPLOADPOST_TOKEN:?UPLOADPOST_TOKEN is not set}"
: "${UPLOADPOST_USER:?UPLOADPOST_USER is not set}"

CAPTION_FILE="$RUN_DIR/caption.txt"
TITLE_FILE="$RUN_DIR/title.txt"
[[ -f "$CAPTION_FILE" ]] || { echo "[publish] FATAL: missing $CAPTION_FILE" >&2; exit 1; }

TITLE="$(cat "$TITLE_FILE" 2>/dev/null || true)"
[[ -z "$TITLE" ]] && TITLE="$(head -c 90 "$CAPTION_FILE")"

# Assemble curl args.
ARGS=(-sS -X POST "$API_BASE/api/upload_photos"
  -H "Authorization: Apikey $UPLOADPOST_TOKEN"
  -F "user=$UPLOADPOST_USER"
  -F "title=$TITLE"
  -F "caption=$(cat "$CAPTION_FILE")"
  -F "auto_add_music=true"
  -F "privacy_level=PUBLIC_TO_EVERYONE"
  -F "async_upload=true")

for p in $PLATFORMS; do
  ARGS+=(-F "platform[]=$p")
done

PHOTO_COUNT=0
for i in 1 2 3 4 5 6; do
  f="$RUN_DIR/slide-$i.jpg"
  if [[ -f "$f" ]]; then
    ARGS+=(-F "photos[]=@$f;type=image/jpeg")
    PHOTO_COUNT=$((PHOTO_COUNT + 1))
  fi
done

if [[ "$PHOTO_COUNT" -lt 1 ]]; then
  echo "[publish] FATAL: no slide-*.jpg found in $RUN_DIR" >&2
  exit 1
fi

echo "[publish] Uploading $PHOTO_COUNT slides to: $PLATFORMS ..." >&2
RESP="$(curl "${ARGS[@]}")"
echo "$RESP" > "$RUN_DIR/upload-response.json"

# Extract request_id (and any returned URLs) without jq.
node -e '
  const fs = require("fs");
  let r = {};
  try { r = JSON.parse(process.argv[1]); } catch { r = { raw: process.argv[1] }; }
  const info = {
    publishedAt: new Date().toISOString(),
    request_id: r.request_id || r.requestId || r.id || null,
    success: r.success !== undefined ? r.success : null,
    platforms: process.argv[2].split(" "),
    response: r,
  };
  fs.writeFileSync(process.argv[3], JSON.stringify(info, null, 2));
  if (info.request_id) console.error("[publish] request_id=" + info.request_id);
  else console.error("[publish] WARNING: no request_id in response — see upload-response.json");
' "$RESP" "$PLATFORMS" "$RUN_DIR/post-info.json"

echo "[publish] Wrote $RUN_DIR/post-info.json" >&2
