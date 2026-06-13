#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "requests>=2.31",
#   "pillow>=10.0",
# ]
# ///
"""
generate_image.py — single-slide image generation via the Gemini API.

Generates one carousel slide from a text prompt. Optionally accepts an input
image for image-to-image generation (used so slides 2-6 inherit the visual DNA
of slide 1). The output is normalized to a 9:16 JPG (default 768x1376) because
TikTok carousels reject PNG and require vertical framing.

Usage:
  uv run generate_image.py --prompt "..." --output slide-1.jpg
  uv run generate_image.py --prompt "..." --output slide-2.jpg --input-image slide-1.jpg

Env:
  GEMINI_API_KEY        (required)
  GEMINI_IMAGE_MODEL    (optional, default: gemini-3.1-flash-image-preview)
"""

import argparse
import base64
import io
import os
import sys
import time

import requests
from PIL import Image

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
DEFAULT_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image-preview")


def log(msg: str) -> None:
    print(f"[gemini] {msg}", file=sys.stderr)


def build_parts(prompt: str, input_image: str | None) -> list:
    parts: list = [{"text": prompt}]
    if input_image:
        with open(input_image, "rb") as f:
            raw = f.read()
        parts.append(
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64.b64encode(raw).decode("ascii"),
                }
            }
        )
    return parts


def extract_image_bytes(payload: dict) -> bytes | None:
    for cand in payload.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    return None


def call_gemini(prompt: str, input_image: str | None, api_key: str, model: str) -> bytes:
    url = f"{API_BASE}/{model}:generateContent"
    body = {
        "contents": [{"parts": build_parts(prompt, input_image)}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}

    last_err = None
    for attempt in range(1, 4):
        try:
            resp = requests.post(url, json=body, headers=headers, timeout=120)
            if resp.status_code == 200:
                img = extract_image_bytes(resp.json())
                if img:
                    return img
                last_err = f"no image in response: {resp.text[:300]}"
            elif resp.status_code in (429, 500, 503):
                last_err = f"HTTP {resp.status_code}: {resp.text[:200]}"
                log(f"transient error (attempt {attempt}); backing off")
                time.sleep(2 * attempt)
                continue
            else:
                # responseModalities can be rejected on some models; retry without it once.
                if "responseModalities" in body.get("generationConfig", {}) and resp.status_code == 400:
                    log("400 with responseModalities; retrying without it")
                    body["generationConfig"] = {}
                    continue
                raise SystemExit(f"[gemini] FATAL HTTP {resp.status_code}: {resp.text[:500]}")
        except requests.RequestException as e:
            last_err = str(e)
            log(f"request exception (attempt {attempt}): {e}")
            time.sleep(2 * attempt)
    raise SystemExit(f"[gemini] FATAL after retries: {last_err}")


def normalize(raw: bytes, output: str, width: int, height: int) -> None:
    """Cover-fit + center-crop to the target 9:16 size, save as JPG."""
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    target_ratio = width / height
    src_ratio = img.width / img.height

    if src_ratio > target_ratio:
        # too wide -> crop width
        new_w = int(img.height * target_ratio)
        left = (img.width - new_w) // 2
        img = img.crop((left, 0, left + new_w, img.height))
    else:
        # too tall -> crop height
        new_h = int(img.width / target_ratio)
        top = (img.height - new_h) // 2
        img = img.crop((0, top, img.width, top + new_h))

    img = img.resize((width, height), Image.LANCZOS)
    img.save(output, "JPEG", quality=90, optimize=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--input-image", default=None)
    ap.add_argument("--width", type=int, default=768)
    ap.add_argument("--height", type=int, default=1376)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    args = ap.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("[gemini] FATAL: GEMINI_API_KEY is not set")

    log(f"model={args.model} output={args.output} i2i={bool(args.input_image)}")
    raw = call_gemini(args.prompt, args.input_image, api_key, args.model)
    normalize(raw, args.output, args.width, args.height)
    log(f"saved {args.output} ({args.width}x{args.height})")


if __name__ == "__main__":
    main()
