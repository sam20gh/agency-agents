#!/usr/bin/env bash
# curate.sh — Instagram Curator pipeline orchestrator.
#
#   Phase 1: Research the target URL (reuses the carousel engine's analyze-web.js)
#   Phase 2: Aesthetic guide   (palette, type, photography, 9-post grid)
#   Phase 3: 30-day calendar   (1/3 rule, multi-format, learned posting time)
#   Phase 4: Hashtag strategy  (tiered + per-pillar sets)
#   Phase 5: Story highlights  (pinned conversion narrative)
#
# Usage:
#   ./curate.sh [url] [--no-research]
#
#   url            target site (default: https://grubpos.com)
#   --no-research  skip Playwright; reuse an existing analysis.json in the out dir
#
# Output: out/<brand-slug>/ (override with OUT_DIR). Reuses ../carousel-growth-engine
# for analyze-web.js and (if present) state/learnings.json for the best post hour.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAROUSEL="$HERE/../carousel-growth-engine"

URL="${1:-https://grubpos.com}"
NO_RESEARCH=0
for arg in "$@"; do
  case "$arg" in --no-research) NO_RESEARCH=1 ;; esac
done

# Load .env if present (does not override already-set vars).
if [[ -f "$HERE/.env" ]]; then set -a; source "$HERE/.env"; set +a; fi

BRAND_SLUG="$(echo "${BRAND_NAME:-grubpos}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')"
OUT_DIR="${OUT_DIR:-$HERE/out/$BRAND_SLUG}"
mkdir -p "$OUT_DIR"
ANALYSIS="$OUT_DIR/analysis.json"

# Optional: self-learned best posting hour from the carousel engine's history.
LEARNINGS="${LEARNINGS_FILE:-$CAROUSEL/state/learnings.json}"
[[ -f "$LEARNINGS" ]] || LEARNINGS=""

echo "================================================================" >&2
echo " Instagram Curator — ${BRAND_NAME:-GrubPos}" >&2
echo " URL: $URL | out: $OUT_DIR" >&2
echo "================================================================" >&2

# ---- Phase 1: Research -----------------------------------------------------
if [[ "$NO_RESEARCH" == "1" && -f "$ANALYSIS" ]]; then
  echo ">> Phase 1: research skipped (reusing $ANALYSIS)" >&2
elif [[ -f "$CAROUSEL/analyze-web.js" ]]; then
  echo ">> Phase 1: Research $URL (Playwright)" >&2
  node "$CAROUSEL/analyze-web.js" "$URL" "$ANALYSIS"
else
  echo "!! analyze-web.js not found at $CAROUSEL. Provide $ANALYSIS manually or run from the repo." >&2
  exit 1
fi

# ---- Phases 2–5: Deliverables ----------------------------------------------
echo ">> Phase 2: Aesthetic guide" >&2
node "$HERE/aesthetic-guide.js" "$ANALYSIS" "$OUT_DIR"

echo ">> Phase 3: 30-day content calendar" >&2
node "$HERE/content-calendar.js" "$ANALYSIS" "$OUT_DIR" "$LEARNINGS"

echo ">> Phase 4: Hashtag strategy" >&2
node "$HERE/hashtag-strategy.js" "$ANALYSIS" "$OUT_DIR"

echo ">> Phase 5: Story highlights plan" >&2
node "$HERE/highlights-plan.js" "$ANALYSIS" "$OUT_DIR"

echo "================================================================" >&2
echo " DONE. Deliverables in: $OUT_DIR" >&2
ls -1 "$OUT_DIR"/*.md 2>/dev/null | sed 's/^/   /' >&2 || true
echo "================================================================" >&2
