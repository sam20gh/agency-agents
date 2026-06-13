#!/usr/bin/env bash
# run.sh — full Carousel Growth Engine pipeline orchestrator.
#
#   Phase 1: Learn from history (analytics -> learnings.json)
#   Phase 2: Research the target URL (Playwright -> analysis.json)
#   Phase 3: Generate 6 coherent slides (Gemini)
#   Phase 4: Publish to TikTok + Instagram (Upload-Post) and record metadata
#
# Usage:
#   ./run.sh <url> [--no-publish] [--dry-run]
#
#   --no-publish : research + generate slides, skip publishing
#   --dry-run    : research only (no Gemini calls, no publishing)
#
# Env (see .env.example): GEMINI_API_KEY, UPLOADPOST_TOKEN, UPLOADPOST_USER
# Optional: CAROUSEL_HOME (default /tmp/carousel), GEMINI_IMAGE_MODEL

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

URL="${1:-}"
MODE="full"
for arg in "${@:2}"; do
  case "$arg" in
    --no-publish) MODE="no-publish" ;;
    --dry-run) MODE="dry-run" ;;
  esac
done

if [[ -z "$URL" ]]; then
  echo "Usage: ./run.sh <url> [--no-publish] [--dry-run]" >&2
  exit 1
fi

# Load .env if present (does not override already-set vars).
if [[ -f "$HERE/.env" ]]; then set -a; source "$HERE/.env"; set +a; fi

CAROUSEL_HOME="${CAROUSEL_HOME:-/tmp/carousel}"
# Persistent learnings file. Defaults to runtime dir, but can be pointed at a
# repo-tracked file (e.g. state/learnings.json) so history survives across
# ephemeral cloud runs. If LEARNINGS_FILE is set, its directory is created.
LEARNINGS="${LEARNINGS_FILE:-$CAROUSEL_HOME/learnings.json}"
mkdir -p "$(dirname "$LEARNINGS")"
TS="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$CAROUSEL_HOME/runs/$TS"
mkdir -p "$RUN_DIR"

echo "================================================================" >&2
echo " Carousel Growth Engine — $TS" >&2
echo " URL: $URL | mode: $MODE | run: $RUN_DIR" >&2
echo "================================================================" >&2

# ---- Phase 1: Learn from history -------------------------------------------
if [[ "$MODE" != "dry-run" && -n "${UPLOADPOST_TOKEN:-}" && -n "${UPLOADPOST_USER:-}" ]]; then
  echo ">> Phase 1: Learn from history" >&2
  PREV_REQ=""
  if [[ -f "$LEARNINGS" ]]; then
    PREV_REQ="$(node -e 'try{const l=require(process.argv[1]);const h=(l.history||[]).filter(x=>x.request_id);process.stdout.write(h.length?h[h.length-1].request_id:"")}catch{}' "$LEARNINGS" 2>/dev/null || true)"
  fi
  bash "$HERE/check-analytics.sh" "$RUN_DIR/analytics.json" "$PREV_REQ" || echo "[run] analytics fetch failed (continuing)" >&2
  node "$HERE/learn-from-analytics.js" "$RUN_DIR/analytics.json" "$LEARNINGS" || echo "[run] learning step failed (continuing)" >&2
else
  echo ">> Phase 1: skipped (dry-run or missing Upload-Post creds)" >&2
fi

# ---- Phase 2: Research ------------------------------------------------------
echo ">> Phase 2: Research $URL" >&2
node "$HERE/analyze-web.js" "$URL" "$RUN_DIR/analysis.json"

if [[ "$MODE" == "dry-run" ]]; then
  echo ">> Dry run complete. See $RUN_DIR/analysis.json" >&2
  exit 0
fi

# ---- Phase 3: Generate ------------------------------------------------------
echo ">> Phase 3: Generate slides" >&2
bash "$HERE/generate-slides.sh" "$RUN_DIR/analysis.json" "$RUN_DIR" "$LEARNINGS"

# ---- Phase 3b: Automated vision QA (Gemini) --------------------------------
if [[ "${SKIP_VERIFY:-0}" != "1" ]]; then
  echo ">> Phase 3b: Vision QA (regenerating any weak slides)" >&2
  bash "$HERE/verify-slides.sh" "$RUN_DIR" || echo "[run] QA step had issues (continuing)" >&2
else
  echo ">> Phase 3b: vision QA skipped (SKIP_VERIFY=1)" >&2
fi

if [[ "$MODE" == "no-publish" ]]; then
  echo ">> --no-publish: stopping before publish. Slides in $RUN_DIR" >&2
  exit 0
fi

# ---- Phase 4: Publish + record ---------------------------------------------
echo ">> Phase 4: Publish" >&2
bash "$HERE/publish-carousel.sh" "$RUN_DIR"

# Record this post into learnings (attribution; metrics arrive on next run).
node "$HERE/learn-from-analytics.js" \
  "$RUN_DIR/analytics.json" "$LEARNINGS" \
  "$RUN_DIR/slide-prompts.json" "$RUN_DIR/post-info.json" \
  || echo "[run] post-attribution step failed (non-fatal)" >&2

echo "================================================================" >&2
echo " DONE. Artifacts in: $RUN_DIR" >&2
node -e 'try{const i=require(process.argv[1]);console.error(" request_id: "+(i.request_id||"n/a"));}catch{}' "$RUN_DIR/post-info.json" 2>/dev/null || true
echo "================================================================" >&2
