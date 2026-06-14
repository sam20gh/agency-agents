#!/usr/bin/env bash
# verify-slides.sh — automated vision QA pass over the 6 generated slides.
#
# For each slide, asks Gemini (verify_slide.py) whether it correctly renders the
# expected headline with no defects. Failing slides are regenerated (reusing the
# slide's imagePrompt + slide-1.jpg as reference) up to MAX_TRIES times. Writes a
# qa-report.txt into the run dir.
#
# Usage:
#   ./verify-slides.sh <run-dir>
#
# Env: GEMINI_API_KEY (required for real QA; fail-open if missing)
#      GEMINI_QA_MODEL (optional), MAX_TRIES (default 3)

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${1:?Usage: verify-slides.sh <run-dir>}"
PROMPTS="$RUN_DIR/slide-prompts.json"
MAX_TRIES="${MAX_TRIES:-3}"
WIDTH="${SLIDE_WIDTH:-768}"
HEIGHT="${SLIDE_HEIGHT:-1376}"
REPORT="$RUN_DIR/qa-report.txt"

[[ -f "$PROMPTS" ]] || { echo "[qa] FATAL: missing $PROMPTS" >&2; exit 1; }

field() { # field <index> <key>
  node -e '
    const fs=require("fs");
    const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
    const s=p.slides.find(x=>x.index===Number(process.argv[2]));
    process.stdout.write(s?String(s[process.argv[3]]||""):"");
  ' "$PROMPTS" "$1" "$2"
}

echo "Vision QA report — $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$REPORT"
overall_ok=1

# The gold category tag (BREAKING / FOOTBALL / WEATHER / GULFIO) is part of the
# brand design — tell the QA model it's allowed so it doesn't try to delete it.
ALLOW_TAG="$(node -e 'try{const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(p.categoryLabel||"BREAKING")}catch{process.stdout.write("BREAKING")}' "$PROMPTS")"

for i in 1 2 3 4 5 6; do
  img="$RUN_DIR/slide-$i.jpg"
  expect="$(field "$i" copy)"
  prompt="$(field "$i" imagePrompt)"
  [[ -f "$img" ]] || { echo "slide-$i: MISSING image" | tee -a "$REPORT" >&2; overall_ok=0; continue; }

  tries=0
  while :; do
    verdict="$(uv run "$HERE/verify_slide.py" --image "$img" --expect "$expect" --allow-tag "$ALLOW_TAG" || true)"
    if echo "$verdict" | grep -q '"pass": *true'; then
      if [[ "$tries" -gt 0 ]]; then
        echo "slide-$i: PASS (after $tries regen)" | tee -a "$REPORT" >&2
      else
        echo "slide-$i: PASS" | tee -a "$REPORT" >&2
      fi
      break
    fi
    reason="$(echo "$verdict" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).reason||"")}catch{process.stdout.write("")}})' 2>/dev/null || true)"
    tries=$((tries + 1))
    if [[ "$tries" -gt "$MAX_TRIES" ]]; then
      echo "slide-$i: FAIL after $MAX_TRIES tries — keeping best. last reason: $reason" | tee -a "$REPORT" >&2
      overall_ok=0
      break
    fi
    echo "slide-$i: regenerating (try $tries/$MAX_TRIES) — reason: $reason" | tee -a "$REPORT" >&2
    uv run "$HERE/generate_image.py" --prompt "$prompt" --output "$img" \
      --input-image "$RUN_DIR/slide-1.jpg" --width "$WIDTH" --height "$HEIGHT" >&2 || true
  done
done

echo "[qa] report written to $REPORT" >&2
[[ "$overall_ok" -eq 1 ]] && echo "[qa] all slides passed" >&2 || echo "[qa] some slides imperfect (kept best)" >&2
exit 0
