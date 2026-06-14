#!/usr/bin/env bash
# curate.sh — Gulfio Instagram Curator pipeline orchestrator.
#
#   Phase 1: Aesthetic guide   (palette, type, photography, 9-post grid)
#   Phase 2: 30-day calendar   (4 pillars, multi-format, learned posting time)
#   Phase 3: Hashtag strategy  (tiered + per-pillar sets)
#   Phase 4: Story highlights  (pinned conversion narrative)
#
# Fully deterministic — no API keys, no scraping. Gulfio's visual identity is
# curated in lib/brand.js; live content comes from the API at publish time.
#
# Usage:
#   ./curate.sh
#
# Output: out/<brand-slug>/ (override with OUT_DIR). Reuses the news engine's
# state/learnings.json (if present) for the self-learned best posting hour.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE="$HERE/../gulfio-news-engine"

# Load .env if present (does not override already-set vars).
if [[ -f "$HERE/.env" ]]; then set -a; source "$HERE/.env"; set +a; fi

BRAND_SLUG="$(echo "${BRAND_NAME:-gulfio}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')"
OUT_DIR="${OUT_DIR:-$HERE/out/$BRAND_SLUG}"
mkdir -p "$OUT_DIR"

# Optional: self-learned best posting hour from the news engine's history.
LEARNINGS="${LEARNINGS_FILE:-$ENGINE/state/learnings.json}"
[[ -f "$LEARNINGS" ]] || LEARNINGS=""

echo "================================================================" >&2
echo " Gulfio Instagram Curator — ${BRAND_NAME:-Gulfio}" >&2
echo " out: $OUT_DIR" >&2
echo "================================================================" >&2

echo ">> Phase 1: Aesthetic guide" >&2
node "$HERE/aesthetic-guide.js" "$OUT_DIR"

echo ">> Phase 2: 30-day content calendar" >&2
node "$HERE/content-calendar.js" "$OUT_DIR" "$LEARNINGS"

echo ">> Phase 3: Hashtag strategy" >&2
node "$HERE/hashtag-strategy.js" "$OUT_DIR"

echo ">> Phase 4: Story highlights plan" >&2
node "$HERE/highlights-plan.js" "$OUT_DIR"

echo "================================================================" >&2
echo " DONE. Deliverables in: $OUT_DIR" >&2
ls -1 "$OUT_DIR"/*.md 2>/dev/null | sed 's/^/   /' >&2 || true
echo "================================================================" >&2
