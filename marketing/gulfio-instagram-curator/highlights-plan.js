#!/usr/bin/env node
/**
 * highlights-plan.js — Phase 4 of the Gulfio Instagram Curator.
 *
 * Plans the Story Highlights tray: the permanent, pinned narrative under the
 * bio. For a news app the tray's job is to show "everything Gulfio covers" and
 * make the download the obvious next tap.
 *
 * Usage:
 *   node highlights-plan.js <out-dir>
 * Writes: <out-dir>/highlights.json, <out-dir>/highlights.md
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BRAND } from "./lib/brand.js";

const outDir = process.argv[2];
if (!outDir) {
  console.error("Usage: node highlights-plan.js <out-dir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const highlights = [
  {
    name: "Start Here",
    icon: "▶︎ play / Gulfio mark",
    purpose: "30-second 'what Gulfio is' for first-time visitors",
    feeds: ["What Gulfio covers (news + football + weather)", `Link sticker → ${BRAND.site}`],
  },
  {
    name: "Top Stories",
    icon: "📰 newspaper",
    purpose: "The best of this week's Gulf & MENA news — proof the feed is fresh",
    feeds: ["Daily headline cards", "Trending regional stories", "Why it matters explainers"],
  },
  {
    name: "Football",
    icon: "⚽ ball",
    purpose: "Show the live scores / fixtures / tables coverage",
    feeds: ["Matchday previews", "Full-time results", "League tables", "Transfer news"],
  },
  {
    name: "Weather",
    icon: "☀︎ sun / cloud",
    purpose: "City-by-city Gulf forecasts and heat alerts",
    feeds: ["Daily temps", "Heat/storm alerts", "Weekend outlook"],
  },
  {
    name: "Why Gulfio",
    icon: "★ star",
    purpose: "The pitch: one trusted app for the whole region",
    feeds: ["All-in-one explainer", "Speed/accuracy proof", "User reactions / UGC"],
  },
  {
    name: "Get the App",
    icon: "→ arrow / download",
    purpose: "The conversion highlight — always the last thing they tap",
    feeds: ["App walkthrough", `Link sticker → ${BRAND.site}`, "App Store / Play badges"],
  },
];

const out = {
  brand: BRAND.name,
  generatedAt: new Date().toISOString(),
  coverSystem: {
    style: "Flat gold icons on the navy brand background — one consistent set so the tray reads as a designed row, not a scrapbook.",
    rule: "Same icon weight, same navy background, same gold accent across all covers. Name each highlight in ≤12 chars so it doesn't truncate.",
  },
  highlights,
};
writeFileSync(join(outDir, "highlights.json"), JSON.stringify(out, null, 2));

const md = `# ${BRAND.name} — Story Highlights Plan

*Generated ${out.generatedAt.slice(0, 10)}.*

The Highlights tray is the **permanent pitch** under the bio. A cold visitor reads it left→right; order it the way they evaluate a news app: *what is it → is it fresh → what does it cover → why this one → how do I get it.*

## Cover system

- **Style:** ${out.coverSystem.style}
- **Rule:** ${out.coverSystem.rule}

## Highlights (left → right)

${highlights
  .map(
    (h, i) => `### ${i + 1}. ${h.name}
- **Cover icon:** ${h.icon}
- **Purpose:** ${h.purpose}
- **Feed it with:**
${h.feeds.map((f) => `  - ${f}`).join("\n")}
`,
  )
  .join("\n")}

---
*Keep "Start Here" first and "Get the App" last. Refresh "Top Stories" and "Football" weekly from the best-performing Stories.*
`;
writeFileSync(join(outDir, "highlights.md"), md);

console.error(`[highlights] ${highlights.length} highlights | conversion: ${highlights[highlights.length - 1].name}`);
console.error(`[highlights] wrote ${join(outDir, "highlights.md")}`);
