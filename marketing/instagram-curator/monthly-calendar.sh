#!/usr/bin/env bash
# monthly-calendar.sh — entry point for the monthly launchd job.
#
# Regenerates the Instagram Curator deliverables (aesthetic, 30-day calendar,
# hashtags, highlights) IN PLACE, so the carousel engine's build-prompts.js
# always has a current plan to align today's post to. The 30-day calendar
# window would otherwise expire and the engine would silently fall back to blind
# rotation.
#
# Fully deterministic — no API keys, no publishing, no cloud egress. Research
# (Playwright) runs against the live site locally where the network is open.
#
# Invoked by com.grubpos.curator-calendar.plist. Safe to run by hand too.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# launchd starts with a minimal PATH — add the Node the toolkit needs.
export PATH="/Users/sam/.nvm/versions/node/v18.20.8/bin:/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$HERE"

# Optional overrides (BRAND_NAME, OUT_DIR, PROOF_LINE, CURATOR_URL) from .env.
if [[ -f .env ]]; then set -a; source .env; set +a; fi

mkdir -p "$HERE/state"
LOG="$HERE/state/calendar.log"
{
  echo "================================================================"
  echo "Monthly calendar regen start: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >> "$LOG"

./curate.sh "${CURATOR_URL:-https://grubpos.com}" >> "$LOG" 2>&1
status=$?

echo "Monthly calendar regen end ($status): $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
exit "$status"
