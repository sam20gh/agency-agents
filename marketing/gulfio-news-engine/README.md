# Gulfio News Engine

Autonomous Instagram/TikTok **news-carousel** generator for **[Gulfio](https://gulfio.app)** — the Gulf & MENA news app. Every day it fetches a live, trending story (regional news, football, or weather) from the Gulfio API, turns it into an informative 6-slide carousel that ends with an **app-download CTA**, publishes it via Upload-Post, and learns from the analytics to make the next post better.

It's the news-brand sibling of the [`carousel-growth-engine`](../carousel-growth-engine/) (which sells a SaaS product). The pipeline and the Gemini/Upload-Post stack are shared; the difference is the **content source** (live articles instead of a website scrape) and the **mission** (inform → download the app, not sell a product).

## What it does

```
learn (analytics) → fetch live article → build 6-slide arc → Gemini slides
   → vision QA → publish to Instagram (+ TikTok) → record + learn
```

- **Live content, accurate copy.** Copy comes straight from the selected Gulfio article — Gulfio is a news brand, so accuracy is the whole game. No invented claims.
- **Pillar of the day.** News / Football / Weather / AppValue, chosen from the [Gulfio Curator](../gulfio-instagram-curator/) calendar (or a weekday rotation), then the freshest matching article is fetched.
- **Informative arc, app-download close.** Slide 1 is the headline; slides 2–5 are the genuinely useful facts; slide 6 is "get the full story on Gulfio."
- **Visual coherence.** Slide 1 sets the visual DNA (deep Gulf navy + gold accent); slides 2–6 are Gemini image-to-image off slide 1.
- **Self-improving.** Per-post analytics feed `state/learnings.json` (best hooks, times, hook styles).

## Pillars & arcs

| Pillar | Source | 6-slide arc |
|---|---|---|
| **News** | trending Gulf/MENA articles | Headline → What happened → Key detail → Why it matters → Bigger picture → CTA |
| **Football** | match/fixture/result articles | Result/fixture → The match → Key stat → Standout moment → What's next → CTA |
| **Weather** | weather/forecast articles | The alert → Where & when → The numbers → What it means → The outlook → CTA |
| **AppValue** | curated "Why Gulfio" promo | Hook → Problem → What Gulfio gives you → Feature → Trust → CTA |

## Usage

```bash
# Auto (pillar from calendar / weekday), full pipeline:
./run.sh

# Force a pillar:
./run.sh Football

# Fetch only — inspect the selected article, no Gemini/publish:
./run.sh --dry-run

# Generate slides but don't publish:
./run.sh News --no-publish
```

Daily automation is via launchd (`com.gulfio.carousel.plist`, 19:00 local) → `local-daily.sh`, which points `UPLOADPOST_USER` at the Gulfio account (`UPLOADPOST_USER_GULFIO`) and persists learnings in `state/`.

## Environment

| Variable | Description | How to get |
|---|---|---|
| `GEMINI_API_KEY` | Gemini image generation | https://aistudio.google.com/app/apikey |
| `GULFIO_API_KEY` | Sent as the `x-api-key` header to the Gulfio API | Gulfio backend |
| `UPLOADPOST_TOKEN` | Upload-Post publishing + analytics | https://upload-post.com |
| `UPLOADPOST_USER_GULFIO` | The Gulfio Upload-Post account username | upload-post.com |

Optional: `GULFIO_API_URL` (default `https://api.gulfio.app/api/articles`), `CATEGORY`, `ARTICLE_OFFSET`, `UPLOADPOST_PLATFORMS`, `CAROUSEL_HOME`, `SLIDE_WIDTH`/`SLIDE_HEIGHT`. See `.env.example`.

If `GULFIO_API_KEY` is missing or the API is unreachable, the engine **falls back to a curated "Why Gulfio" promo** so the daily post never fails.

## Files

| File | Role |
|---|---|
| `run.sh` | Pipeline orchestrator (4 phases) |
| `pick-category.js` | Today's pillar from the curator calendar / weekday rotation |
| `fetch-articles.js` | Fetch + normalise + select a live article → `articles.json` |
| `build-prompts.js` | Article → `slide-prompts.json`, `caption.txt`, `title.txt` |
| `generate-slides.sh` / `generate_image.py` | 6 coherent slides via Gemini (i2i) |
| `verify-slides.sh` / `verify_slide.py` | Automated vision QA + targeted regen |
| `publish-carousel.sh` | Upload-Post publish → `post-info.json` |
| `check-analytics.sh` / `learn-from-analytics.js` | Analytics → `state/learnings.json` |
| `lib/brand.js` | Curated Gulfio identity: palette, voice, arcs, promos, hashtags |
