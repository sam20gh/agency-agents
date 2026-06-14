#!/usr/bin/env bash
# monthly-calendar.sh — entry point for the monthly launchd job (Gulfio).
#
# Regenerates the Gulfio Curator deliverables (aesthetic, 30-day calendar,
# hashtags, highlights) IN PLACE, so the news engine's pick-category.js always
# has a current plan for today's pillar. The 30-day window would otherwise
# expire and the engine would fall back to the weekday rotation.
#
# Fully deterministic — no API keys, no publishing, no egress.
#
# Invoked by com.gulfio.curator-calendar.plist. Safe to run by hand too.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# launchd starts with a minimal PATH — add the Node the toolkit needs.
export PATH="/Users/sam/.nvm/versions/node/v18.20.8/bin:/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$HERE"

# Optional overrides (BRAND_NAME, OUT_DIR) from .env.
if [[ -f .env ]]; then set -a; source .env; set +a; fi

mkdir -p "$HERE/state"
LOG="$HERE/state/calendar.log"
{
  echo "================================================================"
  echo "Monthly calendar regen start: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >> "$LOG"

./curate.sh >> "$LOG" 2>&1
status=$?

echo "Monthly calendar regen end ($status): $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
exit "$status"
