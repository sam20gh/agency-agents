# Gulfio Instagram Curator

The strategy brain for **[Gulfio](https://gulfio.app)** on Instagram — the Gulf & MENA news app. It produces the four deliverables a consistent, download-driving feed needs, and (critically) the **30-day content calendar that tells the [Gulfio News Engine](../gulfio-news-engine/) which content pillar to publish each day.**

It's the news-brand sibling of the [`instagram-curator`](../instagram-curator/) toolkit. Same deterministic, no-API-key approach; the difference is the brand (Gulfio, a news app) and that the visual identity is **curated** in `lib/brand.js` rather than scraped from a website.

## Deliverables (`out/gulfio/`)

| File | What it is |
|---|---|
| `aesthetic.md` / `.json` | Brand aesthetic guide — navy + gold palette, typography, photography, graphic system, 9-post grid |
| `calendar.md` / `.json` | 30-day calendar across 4 pillars + formats + posting times. **`days[].pillar` is read by the news engine.** |
| `hashtags.md` / `.json` | Tiered hashtag strategy + ready-to-paste sets per pillar |
| `highlights.md` / `.json` | Story Highlights tray plan (ends on "Get the App") |

## Pillars

| Pillar | What runs | Engine behaviour on that day |
|---|---|---|
| 🟦 **News** | Trending Gulf & MENA stories | Fetches the freshest news article |
| 🟩 **Football** | Fixtures, results, tables, transfers | Fetches the latest football article |
| 🟨 **Weather** | City forecasts, heat/storm alerts | Fetches the latest weather article |
| 🟧 **AppValue** | "Why Gulfio" brand promos | Builds from a curated promo (no article) |

## Usage

```bash
./curate.sh          # regenerate all four deliverables into out/gulfio/
```

Automated monthly via launchd (`com.gulfio.curator-calendar.plist`, 1st @ 06:30 local) → `monthly-calendar.sh`, so the calendar window never expires and the news engine always has a current plan to read.

## How it links to the News Engine

```
content-calendar.js  →  out/gulfio/calendar.json  →  days[].pillar
                                                          │
gulfio-news-engine/pick-category.js reads today's pillar ─┘
                                                          │
                            fetch-articles.js fetches a live article of that category
```

If the calendar is missing or stale, the engine falls back to its own weekday rotation (`pick-category.js`), so nothing breaks.

## Environment

All optional — see `.env.example`. `BRAND_NAME`, `OUT_DIR`, and `LEARNINGS_FILE` (point at the news engine's `state/learnings.json` to use its self-learned best posting hour).
