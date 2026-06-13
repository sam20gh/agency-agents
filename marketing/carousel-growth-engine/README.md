# Carousel Growth Engine

Autonomous TikTok + Instagram carousel generator. Implements the
[`marketing-carousel-growth-engine`](../marketing-carousel-growth-engine.md) agent
spec end-to-end:

1. **Learn** from past performance (Upload-Post analytics → `learnings.json`)
2. **Research** any website (Playwright → `analysis.json`)
3. **Generate** 6 visually coherent 9:16 slides (Gemini, slide 1 = visual DNA, slides 2–6 = image-to-image)
4. **Publish** to TikTok + Instagram with auto trending music (Upload-Post)
5. **Iterate** — every post feeds the next one's creative + timing decisions

## Setup

```bash
cd marketing/carousel-growth-engine
npm install                 # installs Playwright; postinstall runs `playwright install chromium`
cp .env.example .env        # then fill in GEMINI_API_KEY, UPLOADPOST_TOKEN, UPLOADPOST_USER
```

Requirements:
- **Node 18+** (for `analyze-web.js`, `build-prompts.js`, `learn-from-analytics.js`)
- **[uv](https://docs.astral.sh/uv/)** (runs `generate_image.py`; deps are declared inline via PEP 723 — no manual pip)
- **curl** (publishing + analytics)

Free API keys:
- `GEMINI_API_KEY` → https://aistudio.google.com/app/apikey
- `UPLOADPOST_TOKEN` / `UPLOADPOST_USER` → https://upload-post.com

## Run

```bash
# Full pipeline (research → generate → publish → learn)
./run.sh https://example.com

# Research only — no Gemini, no publish (cheapest sanity check)
./run.sh https://example.com --dry-run

# Research + generate slides, but DON'T publish (review JPGs first)
./run.sh https://example.com --no-publish
```

Artifacts land in `$CAROUSEL_HOME/runs/<timestamp>/` (default `/tmp/carousel/runs/...`):
`analysis.json`, `slide-prompts.json`, `slide-1.jpg … slide-6.jpg`, `caption.txt`,
`title.txt`, `post-info.json`. The persistent knowledge base is
`$CAROUSEL_HOME/learnings.json`.

## Scripts (match the agent spec)

| Script | Phase | Role |
|---|---|---|
| `analyze-web.js` | 2 | Playwright research → `analysis.json` |
| `build-prompts.js` | 3 | Narrative arc + image prompts + caption/title (helper) |
| `generate_image.py` | 3 | One Gemini slide (text or image-to-image), normalized to 9:16 JPG |
| `generate-slides.sh` | 3 | Orchestrates all 6 slides |
| `publish-carousel.sh` | 4 | `POST /api/upload_photos` to TikTok + Instagram |
| `check-analytics.sh` | 1/4 | Fetch profile + per-post analytics |
| `learn-from-analytics.js` | 1 | Update `learnings.json`, emit recommendations |
| `run.sh` | all | Pipeline orchestrator |

## Daily automation

Run once per day via cron (uses the self-learned best hour over time):

```cron
0 18 * * *  cd /path/to/carousel-growth-engine && ./run.sh https://example.com >> /tmp/carousel/run.log 2>&1
```

## Notes & caveats

- **Vision verification is a human/agent step.** `generate-slides.sh` produces the
  slides; the agent (or you) should eyeball each for legibility, spelling, and
  no-text-in-bottom-20%, then regenerate weak slides with `generate_image.py
  --input-image slide-1.jpg`. This script set does not call a vision model itself.
- **Model name** defaults to `gemini-3.1-flash-image-preview` per the spec; override
  with `GEMINI_IMAGE_MODEL` if your account exposes a different image model.
- **Upload-Post auth** uses the `Authorization: Apikey <token>` header. If your
  account uses a different scheme, adjust `publish-carousel.sh` / `check-analytics.sh`.
- Analytics JSON shapes vary; parsers are defensive and fall back to `0`/`null`
  rather than crashing the loop.
