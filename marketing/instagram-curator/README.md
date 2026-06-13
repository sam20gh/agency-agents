# Instagram Curator

Strategy toolkit that implements the
[`marketing-instagram-curator`](../marketing-instagram-curator.md) agent spec
end-to-end. It turns a brand's website into the Curator's four core deliverables:

1. **Aesthetic guide** — palette (normalised to hex + roles), typography, photography
   direction, graphic system, brand voice, and a 9-post grid plan
2. **30-day content calendar** — the spec's **1/3 rule** (Brand / Educational /
   Community) across formats (Carousel / Reel / Single image / Story), with caption
   skeletons, Story ideas, and a self-learned best posting time
3. **Hashtag strategy** — tiered (broad / niche / branded / location) + ready-to-paste
   sets per pillar and per product campaign
4. **Story-highlights plan** — the pinned conversion narrative under the bio

It is the **strategist** counterpart to the
[`carousel-growth-engine`](../carousel-growth-engine/) (which is the *executor* that
generates and posts the slides). The Curator reuses the engine's `analyze-web.js`
for research and, if present, its `state/learnings.json` for the best posting hour.

## Why no API keys

Everything is **deterministic** — like the engine's `analyze-web.js` and
`build-prompts.js`, the copy and strategy are curated for the GrubPos
restaurant-tech niche; only the *visual identity* (palette, fonts, mood) is read
from the scrape. So the brand, product names, and claims are always accurate and
on-message. The only optional dependency is Playwright (via the carousel engine)
for the research phase.

## Run

```bash
cd marketing/instagram-curator

# Full run: research grubpos.com → all four deliverables
./curate.sh

# Any brand
./curate.sh https://example.com

# Reuse an existing out/<brand>/analysis.json (skip Playwright)
./curate.sh https://grubpos.com --no-research
```

Output lands in `out/<brand-slug>/`:
`aesthetic.md` · `calendar.md` · `hashtags.md` · `highlights.md` (plus the matching
`.json` for each, and `analysis.json` from the research phase).

Run any generator standalone against an `analysis.json`:

```bash
node aesthetic-guide.js   out/grubpos/analysis.json out/grubpos
node content-calendar.js  out/grubpos/analysis.json out/grubpos [learnings.json] [YYYY-MM-DD]
node hashtag-strategy.js  out/grubpos/analysis.json out/grubpos
node highlights-plan.js   out/grubpos/analysis.json out/grubpos
```

## Scripts (match the agent spec phases)

| Script | Spec phase | Role |
|---|---|---|
| `lib/brand.js` | — | Shared GrubPos brand data, content banks, colour/font helpers |
| `aesthetic-guide.js` | 1 — Brand Aesthetic Development | Palette + type + photography + 9-post grid |
| `content-calendar.js` | 2 — Multi-Format Content Strategy | 30-day, 1/3 rule, multi-format, learned timing |
| `hashtag-strategy.js` | 2/4 — Discovery + Optimization | Tiered + per-pillar + per-campaign tag sets |
| `highlights-plan.js` | 1/3 — Aesthetic + Community/Commerce | Pinned Story-highlights conversion tray |
| `curate.sh` | all | Pipeline orchestrator (research → 4 deliverables) |

## Configuration (all optional — see `.env.example`)

| Var | Default | Effect |
|---|---|---|
| `BRAND_NAME` | `GrubPos` | Name used across all deliverables + the `out/` slug |
| `OUT_DIR` | `out/<brand-slug>` | Where deliverables are written |
| `LEARNINGS_FILE` | `../carousel-growth-engine/state/learnings.json` | Self-learned best posting hour |

## How it pairs with the carousel engine

```
analyze-web.js (carousel)  ──►  analysis.json  ──►  Instagram Curator (strategy)
                                                       │  calendar.md → what to post, when, which pillar
                                                       ▼
                          build-prompts.js + generate-slides.sh (carousel = execution)
```

The Curator decides **strategy** (aesthetic, mix, timing, hashtags, highlights); the
carousel engine **executes** the Brand-pillar carousels. Use the calendar's pillar +
format + post-time to drive what the engine generates each day.

## Notes & caveats

- **Strategy, not auto-posting.** This toolkit produces plans and copy skeletons for a
  human/agent to schedule. Automated posting lives in the carousel engine.
- **Hashtag volume is intentionally low** (~6–8/post). Current Instagram best practice
  favours relevance over 30-tag walls; the generator reflects that.
- **Calendar copy is a skeleton.** Hooks and captions are starting points — swap in
  timely angles, but keep each day's pillar + format so the grid stays coherent.
- **Best posting time** uses the carousel engine's learned hour only once real
  engagement data exists; until then it falls back to per-weekday operator windows.
