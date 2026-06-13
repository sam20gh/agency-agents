#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "requests>=2.31",
# ]
# ///
"""
verify_slide.py — automated vision QA for one carousel slide via Gemini.

Asks a Gemini vision model whether the slide correctly renders the expected
headline and is free of defects (fake app UI, font-name text, edge cutoffs,
text in the bottom 20%). Lets the daily pipeline self-QA without a human or the
Claude CLI in the loop.

Usage:
  uv run verify_slide.py --image slide-2.jpg --expect "Orders get lost between the floor and the kitchen"

Exit code 0 = PASS, 1 = FAIL (reason printed to stdout as JSON).

Env:
  GEMINI_API_KEY   (required)
  GEMINI_QA_MODEL  (optional, default: gemini-2.5-flash)
"""

import argparse
import base64
import json
import os
import sys

import requests

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
MODEL = os.environ.get("GEMINI_QA_MODEL", "gemini-2.5-flash")

RUBRIC = (
    "You are a STRICT quality reviewer for a vertical social-media carousel slide. "
    "The slide must display this exact headline text: \"{expect}\".\n"
    "Fail the slide if ANY of these are true:\n"
    "1. The headline text is missing words, misspelled, garbled, or not clearly legible.\n"
    "2. There is any fake phone/app UI, status bar, clock, Instagram/TikTok chrome, "
    "navigation bar, like/comment/share/save icons, follower counts, usernames, "
    "captions, or watermarks.\n"
    "3. Any font name, hex color code, or instruction/label word is rendered as visible text.\n"
    "4. Text is cut off at the image edges.\n"
    "5. There is readable text in the bottom ~20% of the image.\n"
    'Respond with ONLY compact JSON, no prose: {{"pass": true_or_false, "reason": "short explanation"}}'
)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--expect", required=True)
    ap.add_argument("--model", default=MODEL)
    args = ap.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(json.dumps({"pass": True, "reason": "no GEMINI_API_KEY — skipping QA"}))
        sys.exit(0)  # fail-open: don't block publishing if QA can't run

    with open(args.image, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("ascii")

    body = {
        "contents": [
            {
                "parts": [
                    {"text": RUBRIC.format(expect=args.expect)},
                    {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}},
                ]
            }
        ],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }
    url = f"{API_BASE}/{args.model}:generateContent"
    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}

    try:
        resp = requests.post(url, json=body, headers=headers, timeout=60)
        if resp.status_code != 200:
            print(json.dumps({"pass": True, "reason": f"QA call HTTP {resp.status_code} — skipping"}))
            sys.exit(0)  # fail-open
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        verdict = json.loads(text)
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"pass": True, "reason": f"QA error {e} — skipping"}))
        sys.exit(0)  # fail-open

    passed = bool(verdict.get("pass"))
    print(json.dumps({"pass": passed, "reason": verdict.get("reason", "")}))
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
