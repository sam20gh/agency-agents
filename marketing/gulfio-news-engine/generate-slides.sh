#!/usr/bin/env bash
# generate-slides.sh — Phase 3: generate 6 coherent Gulfio news-carousel slides.
#
# Slide 1 is generated from a text prompt only and defines the visual DNA.
# Slides 2-6 use Gemini image-to-image with slide-1.jpg as the reference so the
# palette, gold accent, typography, and aesthetic stay consistent.
#
# Usage:
#   ./generate-slides.sh <articles.json> <run-dir> [learnings.json]
#
# Env: GEMINI_API_KEY (required), GEMINI_IMAGE_MODEL (optional)

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTICLES="${1:?Usage: generate-slides.sh <articles.json> <run-dir> [learnings.json]}"
RUN_DIR="${2:?run-dir required}"
LEARNINGS="${3:-}"

WIDTH="${SLIDE_WIDTH:-768}"
HEIGHT="${SLIDE_HEIGHT:-1376}"

mkdir -p "$RUN_DIR"

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "[slides] FATAL: GEMINI_API_KEY is not set" >&2
  exit 1
fi

# 1. Build prompts, caption, title from the selected article.
echo "[slides] Building prompts ..." >&2
node "$HERE/build-prompts.js" "$ARTICLES" "$RUN_DIR" "$LEARNINGS"

PROMPTS="$RUN_DIR/slide-prompts.json"

read_prompt() {
  local idx="$1"
  node -e '
    const fs = require("fs");
    const p = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const s = p.slides.find(x => x.index === Number(process.argv[2]));
    process.stdout.write(s ? s.imagePrompt : "");
  ' "$PROMPTS" "$idx"
}

GEN() {
  # GEN <index> <output> [input-image]
  local idx="$1" out="$2" ref="${3:-}"
  local prompt
  prompt="$(read_prompt "$idx")"
  if [[ -z "$prompt" ]]; then
    echo "[slides] FATAL: no prompt for slide $idx" >&2
    exit 1
  fi
  if [[ -n "$ref" ]]; then
    uv run "$HERE/generate_image.py" --prompt "$prompt" --output "$out" \
      --input-image "$ref" --width "$WIDTH" --height "$HEIGHT"
  else
    uv run "$HERE/generate_image.py" --prompt "$prompt" --output "$out" \
      --width "$WIDTH" --height "$HEIGHT"
  fi
}

# 2. Slide 1 — establishes visual DNA (text-only).
echo "[slides] Generating slide 1 (visual DNA) ..." >&2
GEN 1 "$RUN_DIR/slide-1.jpg"

# 3. Slides 2-6 — image-to-image referencing slide 1.
for i in 2 3 4 5 6; do
  echo "[slides] Generating slide $i (i2i from slide-1) ..." >&2
  GEN "$i" "$RUN_DIR/slide-$i.jpg" "$RUN_DIR/slide-1.jpg"
done

echo "[slides] Done. 6 slides in $RUN_DIR" >&2
ls -1 "$RUN_DIR"/slide-*.jpg >&2
