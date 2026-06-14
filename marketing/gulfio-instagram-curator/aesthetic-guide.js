#!/usr/bin/env node
/**
 * aesthetic-guide.js — Phase 1 of the Gulfio Instagram Curator.
 *
 * Emits a Brand Aesthetic Guide for Gulfio: colour palette + roles, typography,
 * photography style, graphic system, and a 9-post grid plan for a cohesive feed
 * preview. Deterministic — the visual identity is curated in lib/brand.js (no
 * website scrape, since Gulfio's content comes from its API).
 *
 * Usage:
 *   node aesthetic-guide.js <out-dir>
 * Writes: <out-dir>/aesthetic.md, <out-dir>/aesthetic.json
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BRAND, VISUAL } from "./lib/brand.js";

const outDir = process.argv[2];
if (!outDir) {
  console.error("Usage: node aesthetic-guide.js <out-dir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const { ink, accent, support, surface } = VISUAL;

const paletteRoles = [
  { role: "Ink / Primary", hex: ink, use: "Headlines, backgrounds, the brand anchor — most frames are navy-dominant" },
  { role: "Accent / Gold", hex: accent, use: "Category tags, key-word highlights, CTA — one pop per frame (~10–15%)" },
  { role: "Support / Teal", hex: support, use: "Secondary highlights, data viz, weather/sport accents" },
  { role: "Surface / Sand", hex: surface, use: "Light backgrounds, breathing room, explainer slides" },
];

const photography = [
  "Real Gulf/MENA context — skylines (Dubai, Riyadh, Doha), stadiums, ports, desert, weather skies — not generic stock",
  "Editorial news grade: confident contrast, deep navy shadows, warm gold highlights",
  "Football: floodlit stadium energy; Weather: dramatic Gulf skies; News: city + regional landmarks",
  "Respectful, apolitical imagery — no flags-as-opinion, no graphic content",
  "Consistent treatment so any frame reads as Gulfio before the handle is seen",
];
const graphics = [
  `Small gold category tag near the top of every frame (BREAKING / FOOTBALL / WEATHER)`,
  `Bold headline overlay in ${VISUAL.headingFamily}, large and legible, top ~two-thirds`,
  `Keep the bottom 20% clear of text (IG UI + Reel caption safe zone)`,
  `One gold accent (${accent}) per frame — a highlight, underline, or tag`,
  "Carousels share one visual DNA: slide 1 sets palette + type, slides 2–6 inherit it",
  "9:16 for Reels/Stories, 4:5 for feed carousels (max vertical real estate)",
];

// 9-post grid: stagger the four pillars so the grid reads as designed.
const PILLARS = ["News", "Football", "Weather", "AppValue"];
const grid = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3) + 1;
  const col = (i % 3) + 1;
  const pillar = PILLARS[i % PILLARS.length];
  const treatment =
    pillar === "News"
      ? `Dark ${ink} background, gold BREAKING tag, big headline`
      : pillar === "Football"
        ? `Stadium photo, navy gradient, gold score/stat`
        : pillar === "Weather"
          ? `Gulf sky photo, teal/gold data overlay`
          : `Navy brand frame, gold CTA — "Download Gulfio"`;
  return { position: i + 1, row, col, pillar, treatment };
});

const guide = {
  brand: BRAND.name,
  site: BRAND.site,
  generatedAt: new Date().toISOString(),
  palette: paletteRoles,
  typography: { headingFamily: VISUAL.headingFamily, bodyFamily: VISUAL.bodyFamily },
  mood: VISUAL.mood,
  photography,
  graphics,
  grid,
  voice: BRAND.voice,
};
writeFileSync(join(outDir, "aesthetic.json"), JSON.stringify(guide, null, 2));

const sw = (hex) => `\`${hex}\``;
const md = `# ${BRAND.name} — Instagram Brand Aesthetic Guide

*Generated ${guide.generatedAt.slice(0, 10)} from curated brand identity.*

The goal: a feed so consistent a follower recognises a ${BRAND.name} post **before** they read the handle — and always knows the next tap is "download the app".

## Colour palette

| Role | Hex | Use |
|---|---|---|
${paletteRoles.map((p) => `| ${p.role} | ${sw(p.hex)} | ${p.use} |`).join("\n")}

**Rule of thumb:** every post is navy-dominant with the gold accent appearing once. The accent marks the category tag, the key word, or the CTA — never split a frame 50/50.

## Typography

- **Headlines:** ${VISUAL.headingFamily} — large, tight, editorial.
- **Body / captions on-image:** ${VISUAL.bodyFamily}, smaller and lighter than the headline.
- One type family does the heavy lifting; weight + size create hierarchy.

## Mood

> ${VISUAL.mood}

## Photography direction

${photography.map((p) => `- ${p}`).join("\n")}

## Graphic system

${graphics.map((g) => `- ${g}`).join("\n")}

## Brand voice

**Persona:** ${BRAND.voice.persona}
**Tone:** ${BRAND.voice.tone.join(" · ")}

**Do**
${BRAND.voice.do.map((d) => `- ${d}`).join("\n")}

**Don't**
${BRAND.voice.dont.map((d) => `- ${d}`).join("\n")}

## 9-post grid plan (feed preview)

| | Col 1 | Col 2 | Col 3 |
|---|---|---|---|
${[1, 2, 3]
  .map((r) => {
    const cells = grid.filter((g) => g.row === r).map((g) => `**${g.pillar}** — ${g.treatment}`);
    return `| Row ${r} | ${cells.join(" | ")} |`;
  })
  .join("\n")}

**Pillar treatments (keep fixed so the grid stays coherent):**
- **News** → dark ${sw(ink)} background, gold BREAKING tag, big headline.
- **Football** → stadium photo, navy gradient, gold score/stat.
- **Weather** → Gulf sky photo, teal/gold data overlay.
- **AppValue** → navy brand frame, gold "Download Gulfio" CTA.

---
*Companion files: \`calendar.md\` (30-day plan), \`hashtags.md\` (tag strategy), \`highlights.md\` (Story highlights).*
`;
writeFileSync(join(outDir, "aesthetic.md"), md);

console.error(`[aesthetic] palette: ${VISUAL.palette.join(" ")} | ink=${ink} accent=${accent}`);
console.error(`[aesthetic] wrote ${join(outDir, "aesthetic.md")}`);
