#!/usr/bin/env bash
# run.sh — full Gulfio News Engine pipeline orchestrator.
#
#   Phase 1: Learn from history (analytics -> learnings.json)
#   Phase 2: Fetch a live article from the Gulfio API (-> articles.json)
#   Phase 3: Generate 6 coherent news-teaser slides (Gemini) + vision QA
#   Phase 4: Publish to Instagram (+ TikTok) via Upload-Post, record metadata
#
# The content pillar (News / Football / Weather / AppValue) is taken from the
# Gulfio Curator's calendar for today (or a weekday rotation), then the freshest
# matching article is fetched and turned into an informative app-download carousel.
#
# Usage:
#   ./run.sh [category] [--no-publish] [--dry-run]
#
#   category     : News | Football | Weather | AppValue (default: auto from calendar)
#   --no-publish : fetch + generate slides, skip publishing
#   --dry-run    : fetch only (no Gemini calls, no publishing)
#
# Env (see .env.example): GEMINI_API_KEY, GULFIO_API_KEY, UPLOADPOST_TOKEN, UPLOADPOST_USER

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CATEGORY=""
MODE="full"
for arg in "$@"; do
  case "$arg" in
    --no-publish) MODE="no-publish" ;;
    --dry-run) MODE="dry-run" ;;
    News|Football|Weather|AppValue) CATEGORY="$arg" ;;
  esac
done

# Load .env if present.
if [[ -f "$HERE/.env" ]]; then set -a; source "$HERE/.env"; set +a; fi

# Gulfio ALWAYS publishes to its own Upload-Post account — never the GrubPos one.
# Sourcing .env above sets UPLOADPOST_USER to the shared default (grubpos), so we
# re-assert the Gulfio account here. This must happen after the source, or the
# carousel ends up on the wrong channel regardless of how run.sh was invoked.
export UPLOADPOST_USER="${UPLOADPOST_USER_GULFIO:-${UPLOADPOST_USER:-}}"
export UPLOADPOST_PLATFORMS="${UPLOADPOST_PLATFORMS:-instagram}"

CAROUSEL_HOME="${CAROUSEL_HOME:-/tmp/gulfio}"
LEARNINGS="${LEARNINGS_FILE:-$CAROUSEL_HOME/learnings.json}"
mkdir -p "$(dirname "$LEARNINGS")"
TS="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$CAROUSEL_HOME/runs/$TS"
mkdir -p "$RUN_DIR"

# Decide today's pillar if not explicitly given.
if [[ -z "$CATEGORY" ]]; then
  CATEGORY="$(node "$HERE/pick-category.js" 2>/dev/null || echo News)"
fi

echo "================================================================" >&2
echo " Gulfio News Engine — $TS" >&2
echo " pillar: $CATEGORY | mode: $MODE | run: $RUN_DIR" >&2
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

# ---- Phase 2: Fetch a live article -----------------------------------------
echo ">> Phase 2: Fetch article ($CATEGORY)" >&2
CATEGORY="$CATEGORY" node "$HERE/fetch-articles.js" "$RUN_DIR" "$CATEGORY"

if [[ "$MODE" == "dry-run" ]]; then
  echo ">> Dry run complete. See $RUN_DIR/articles.json" >&2
  exit 0
fi

# ---- Phase 3: Generate ------------------------------------------------------
echo ">> Phase 3: Generate slides" >&2
bash "$HERE/generate-slides.sh" "$RUN_DIR/articles.json" "$RUN_DIR" "$LEARNINGS"

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
