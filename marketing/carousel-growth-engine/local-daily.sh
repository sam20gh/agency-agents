#!/usr/bin/env bash
# local-daily.sh — entry point for the daily launchd job.
#
# Runs the full Carousel Growth Engine locally (research -> generate -> Gemini
# vision QA -> publish to Instagram -> learn). Keys come from the local .env;
# learnings persist in the repo-tracked state file. Network is unrestricted
# locally, so publishing to Upload-Post works (unlike the cloud sandbox).
#
# Invoked by com.grubpos.carousel.plist. Safe to run by hand too.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# launchd starts with a minimal PATH — add the tools the pipeline needs.
export PATH="/Users/sam/.nvm/versions/node/v18.20.8/bin:/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$HERE"

# Load credentials from .env (symlinked to the repo-root .env).
if [[ -f .env ]]; then set -a; source .env; set +a; fi

# Persist learnings in the repo so history accumulates across days.
export LEARNINGS_FILE="$HERE/state/learnings.json"
export UPLOADPOST_PLATFORMS="instagram"

mkdir -p "$HERE/state"
LOG="$HERE/state/daily.log"
{
  echo "================================================================"
  echo "Daily run start: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >> "$LOG"

./run.sh https://grubpos.com >> "$LOG" 2>&1
status=$?

echo "Daily run end ($status): $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
exit "$status"
