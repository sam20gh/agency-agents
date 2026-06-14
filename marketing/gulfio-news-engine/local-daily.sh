#!/usr/bin/env bash
# local-daily.sh — entry point for the daily launchd job (Gulfio).
#
# Runs the full Gulfio News Engine locally (learn -> fetch live article ->
# generate -> Gemini vision QA -> publish to Instagram -> learn). Keys come from
# the local .env; learnings persist in the repo-tracked state file. Network is
# unrestricted locally, so publishing to Upload-Post works.
#
# Invoked by com.gulfio.carousel.plist. Safe to run by hand too.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# launchd starts with a minimal PATH — add the tools the pipeline needs.
export PATH="/Users/sam/.nvm/versions/node/v18.20.8/bin:/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$HERE"

mkdir -p "$HERE/state"
LOG="$HERE/state/daily.log"

# ---- UAE-noon guard --------------------------------------------------------
# launchd fires at both 08:00 and 09:00 London (to survive DST); we only post
# when it's actually 12:00 in UAE, and at most once per UAE calendar day. Pass
# --now (or FORCE_RUN=1) to bypass the guard for a manual run.
LOCK="$HERE/state/.last-run-date"
UAE_HOUR="$(TZ=Asia/Dubai date +%H)"
UAE_DATE="$(TZ=Asia/Dubai date +%F)"
if [[ "${1:-}" != "--now" && "${FORCE_RUN:-0}" != "1" ]]; then
  if [[ "$UAE_HOUR" != "12" ]]; then
    echo "[$(date -u +%FT%TZ)] skip: UAE hour is $UAE_HOUR (want 12)" >> "$LOG"
    exit 0
  fi
  if [[ -f "$LOCK" && "$(cat "$LOCK" 2>/dev/null)" == "$UAE_DATE" ]]; then
    echo "[$(date -u +%FT%TZ)] skip: already ran for $UAE_DATE" >> "$LOG"
    exit 0
  fi
fi
echo "$UAE_DATE" > "$LOCK"

# Load credentials from .env (symlinked to the repo-root .env).
if [[ -f .env ]]; then set -a; source .env; set +a; fi

# Publish to the Gulfio Upload-Post account, not the GrubPos one.
export UPLOADPOST_USER="${UPLOADPOST_USER_GULFIO:-${UPLOADPOST_USER:-}}"
export UPLOADPOST_PLATFORMS="${UPLOADPOST_PLATFORMS:-instagram}"

# Persist learnings in the repo so history accumulates across days.
export LEARNINGS_FILE="$HERE/state/learnings.json"

{
  echo "================================================================"
  echo "Daily run start: $(date -u +%Y-%m-%dT%H:%M:%SZ) (UAE noon, $UAE_DATE)"
} >> "$LOG"

./run.sh >> "$LOG" 2>&1
status=$?

echo "Daily run end ($status): $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
exit "$status"
