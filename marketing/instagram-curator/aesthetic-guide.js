#!/usr/bin/env node
/**
 * aesthetic-guide.js — Phase 1 of the Instagram Curator.
 *
 * Turns analysis.json (from the carousel engine's analyze-web.js) into a Brand
 * Aesthetic Guide: colour palette (normalised to hex + roles), typography,
 * photography style, graphic elements, and a 9-post grid plan for a cohesive
 * feed preview.
 *
 * Deterministic — no API keys. Scraped palette/fonts drive the visual identity;
 * voice and photography direction are curated for the restaurant-tech niche.
 *
 * Usage:
 *   node aesthetic-guide.js <analysis.json> <out-dir>
 * Writes: <out-dir>/aesthetic.md, <out-dir>/aesthetic.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BRAND, toHex, lightness, saturation, describeFont, primaryFont } from "./lib/brand.js";

const analysisPath = process.argv[2];
const outDir = process.argv[3];
if (!analysisPath || !outDir) {
  console.error("Usage: node aesthetic-guide.js <analysis.json> <out-dir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const a = JSON.parse(readFileSync(analysisPath, "utf8"));

// ---- Palette ---------------------------------------------------------------
const rawColors = a.visualContext?.palette || a.brand?.colors || [];
const hexes = [...new Set(rawColors.map(toHex).filter(Boolean))];

// Assign roles: darkest = primary/ink, lightest = surface, most-saturated mid =
// accent. Falls back to the curated GrubPos palette when the scrape is thin.
const FALLBACK = ["#0A1A2F", "#1E63FF", "#F5F7FA", "#0E0E12"]; // navy, bright blue, off-white, near-black
const palette = (hexes.length >= 2 ? hexes : FALLBACK).slice(0, 6);

const withL = palette
  .map((hex) => ({ hex, l: lightness(hex) }))
  .filter((c) => c.l !== null)
  .sort((x, y) => x.l - y.l);

const ink = withL[0]?.hex || "#0E0E12";
const surface = withL[withL.length - 1]?.hex || "#F5F7FA";
// Accent = the MOST SATURATED color that isn't ink/surface (the brand pop —
// e.g. a bright blue, not a dark navy that's only one step off ink).
const accent =
  palette
    .filter((h) => h !== ink && h !== surface)
    .map((h) => ({ h, s: saturation(h) ?? -1 }))
    .sort((x, y) => y.s - x.s)[0]?.h ||
  palette.find((h) => h !== ink && h !== surface) ||
  "#1E63FF";

const paletteRoles = [
  { role: "Ink / Primary", hex: ink, use: "Headlines, logo, dark backgrounds — the brand anchor" },
  { role: "Accent", hex: accent, use: "CTAs, highlights, one pop per frame — never more than ~15% of a post" },
  { role: "Surface", hex: surface, use: "Backgrounds, breathing room, light carousels" },
];
const extras = palette.filter((h) => ![ink, accent, surface].includes(h));
extras.forEach((hex, i) => paletteRoles.push({ role: `Support ${i + 1}`, hex, use: "Secondary fills, dividers, supporting graphics" }));

// ---- Typography ------------------------------------------------------------
const headingStack = a.brand?.typography?.heading;
const bodyStack = a.brand?.typography?.body;
const headingKind = describeFont(headingStack);
const headingFamily = primaryFont(headingStack);
const bodyFamily = primaryFont(bodyStack);

const typeRec =
  headingKind === "serif"
    ? "elegant high-contrast serif for headlines, clean sans for body"
    : headingKind === "monospace"
      ? "bold monospace for headlines (tech-forward), neutral sans for body"
      : "bold geometric/grotesk sans for headlines, neutral humanist sans for body";

// ---- Photography + graphic direction (curated for restaurant-tech) ---------
const mood = a.visualContext?.mood || "warm, appetising food-tech with real busy-kitchen energy";
const photography = [
  "Real restaurant context — the pass, the counter, hands on a till, food going out — not stock laptops",
  "Warm, appetising light; shoot food and service, not abstract tech",
  "Tight crops on the moment of friction or relief (the queue, the docket, the tap-to-pay)",
  "Consistent grade: slightly warm highlights, deep but not crushed shadows",
  "People over product shots — operators and staff, faces and hands at work",
];
const graphics = [
  `Bold headline overlay in ${headingKind}, large and legible, top ~two-thirds of the frame`,
  `Keep the bottom 20% clear of text (Instagram UI + Reel caption safe zone)`,
  `One accent (${accent}) per frame — a keyword highlight, underline, or CTA chip`,
  "Consistent 9:16 for Reels/Stories, 4:5 for feed posts (max vertical real estate)",
  "Carousels share one visual DNA: slide 1 sets palette + type, slides 2–6 inherit it",
];

// ---- 9-post grid plan (cohesive feed preview) ------------------------------
// Checkerboard the 3 content pillars so the grid reads as designed, not random.
const PILLARS = ["Brand", "Educational", "Community"];
const grid = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3) + 1;
  const col = (i % 3) + 1;
  const pillar = PILLARS[(i + Math.floor(i / 3)) % 3]; // diagonal stagger
  const treatment =
    pillar === "Brand"
      ? `Dark ${ink} background, big headline, accent CTA`
      : pillar === "Educational"
        ? `Light ${surface} background, numbered/how-to layout`
        : `Photo-led (operator/kitchen), light text overlay`;
  return { position: i + 1, row, col, pillar, treatment };
});

// ---- Write -----------------------------------------------------------------
const guide = {
  brand: BRAND.name,
  site: BRAND.site,
  generatedAt: new Date().toISOString(),
  source: a.url || null,
  palette: paletteRoles,
  typography: { headingKind, headingFamily, bodyFamily, recommendation: typeRec },
  mood,
  photography,
  graphics,
  grid,
  voice: BRAND.voice,
};
writeFileSync(join(outDir, "aesthetic.json"), JSON.stringify(guide, null, 2));

const sw = (hex) => `\`${hex}\``;
const md = `# ${BRAND.name} — Instagram Brand Aesthetic Guide

*Generated ${guide.generatedAt.slice(0, 10)} from ${guide.source || "curated defaults"}.*

The goal: a feed so consistent a follower recognises a ${BRAND.name} post **before** they read the handle.

## Colour palette

| Role | Hex | Use |
|---|---|---|
${paletteRoles.map((p) => `| ${p.role} | ${sw(p.hex)} | ${p.use} |`).join("\n")}

**Rule of thumb:** every post is mostly Ink **or** Surface, with the Accent appearing once. Never split a frame 50/50 between Ink and Accent — the accent loses its job.

## Typography

- **Headlines:** ${typeRec.split(",")[0]}${headingFamily ? ` (site uses *${headingFamily}*)` : ""}.
- **Body / captions on-image:** ${bodyFamily ? `*${bodyFamily}* or a` : "a"} neutral sans, set smaller and lighter than the headline.
- One type family does the heavy lifting. Weight + size create hierarchy — not a second decorative font.

## Mood

> ${mood}

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

Lay these out so the grid reads as *designed* — the three pillars stagger on a diagonal:

| | Col 1 | Col 2 | Col 3 |
|---|---|---|---|
${[1, 2, 3]
  .map((r) => {
    const cells = grid.filter((g) => g.row === r).map((g) => `**${g.pillar}** — ${g.treatment}`);
    return `| Row ${r} | ${cells.join(" | ")} |`;
  })
  .join("\n")}

**Pillar treatments (keep these fixed so the grid stays coherent):**
- **Brand** → dark ${sw(ink)} background, big headline, ${sw(accent)} CTA chip.
- **Educational** → light ${sw(surface)} background, numbered / how-to layout.
- **Community** → photo-led (operator/kitchen), light text overlay.

---
*Companion files: \`calendar.md\` (30-day plan), \`hashtags.md\` (tag strategy), \`highlights.md\` (Story highlights).*
`;
writeFileSync(join(outDir, "aesthetic.md"), md);

console.error(`[aesthetic] palette: ${palette.join(" ")} | ink=${ink} accent=${accent} surface=${surface} | heading=${headingKind}`);
console.error(`[aesthetic] wrote ${join(outDir, "aesthetic.md")}`);
