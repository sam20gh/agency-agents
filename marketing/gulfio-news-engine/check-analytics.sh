#!/usr/bin/env bash
# check-analytics.sh — Phase 1/4: fetch Upload-Post analytics.
#
# Pulls profile analytics, total-impressions breakdown, and (if a request_id is
# given) per-post analytics. Merges them into a single analytics.json.
#
# Usage:
#   ./check-analytics.sh <output-analytics.json> [request_id] [platform]
#
# Env: UPLOADPOST_TOKEN, UPLOADPOST_USER (required)

set -euo pipefail

OUT="${1:?Usage: check-analytics.sh <output.json> [request_id] [platform]}"
REQUEST_ID="${2:-}"
PLATFORM="${3:-tiktok}"
API_BASE="${UPLOADPOST_API_BASE:-https://api.upload-post.com}"

: "${UPLOADPOST_TOKEN:?UPLOADPOST_TOKEN is not set}"
: "${UPLOADPOST_USER:?UPLOADPOST_USER is not set}"

AUTH=(-H "Authorization: Apikey $UPLOADPOST_TOKEN")

fetch() {
  curl -sS "${AUTH[@]}" "$1" 2>/dev/null || echo '{}'
}

echo "[analytics] Fetching profile analytics ..." >&2
PROFILE="$(fetch "$API_BASE/api/analytics/$UPLOADPOST_USER?platforms=$PLATFORM")"

echo "[analytics] Fetching impressions breakdown ..." >&2
IMPRESSIONS="$(fetch "$API_BASE/api/uploadposts/total-impressions/$UPLOADPOST_USER?platform=$PLATFORM&breakdown=true")"

POST='{}'
if [[ -n "$REQUEST_ID" ]]; then
  echo "[analytics] Fetching per-post analytics for $REQUEST_ID ..." >&2
  POST="$(fetch "$API_BASE/api/uploadposts/post-analytics/$REQUEST_ID")"
fi

node -e '
  const fs = require("fs");
  const safe = (s) => { try { return JSON.parse(s); } catch { return { raw: s }; } };
  const out = {
    fetchedAt: new Date().toISOString(),
    platform: process.argv[5],
    profile: safe(process.argv[1]),
    impressions: safe(process.argv[2]),
    post: safe(process.argv[3]),
    request_id: process.argv[4] || null,
  };
  fs.writeFileSync(process.argv[6], JSON.stringify(out, null, 2));
' "$PROFILE" "$IMPRESSIONS" "$POST" "$REQUEST_ID" "$PLATFORM" "$OUT"

echo "[analytics] Wrote $OUT" >&2
