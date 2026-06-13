#!/usr/bin/env node
/**
 * highlights-plan.js — Phase 1/3 of the Instagram Curator.
 *
 * Plans the Story Highlights tray: the permanent, pinned narrative under the
 * bio. Each highlight = a cover concept + topic + which Stories feed it. This
 * is what converts a profile visitor into a follower or a demo booking.
 *
 * Usage:
 *   node highlights-plan.js <analysis.json> <out-dir>
 * Writes: <out-dir>/highlights.json, <out-dir>/highlights.md
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BRAND, CAMPAIGNS } from "./lib/brand.js";

const analysisPath = process.argv[2];
const outDir = process.argv[3];
if (!analysisPath || !outDir) {
  console.error("Usage: node highlights-plan.js <analysis.json> <out-dir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const a = JSON.parse(readFileSync(analysisPath, "utf8"));
const ctas = a.content?.ctas || [];
const primaryCta = ctas.find((c) => /demo|start|book|get|try/i.test(c)) || "Book a demo";

// Highlight tray, ordered left→right by how a cold visitor evaluates a brand:
// what is it → does it work → can I see it → how do I start.
const highlights = [
  {
    name: "Start Here",
    icon: "▶︎ play / logo mark",
    purpose: "30-second 'what GrubPos is' for first-time visitors",
    feeds: ["Brand intro Stories", "Founder/ops one-liner", `Link sticker → ${BRAND.site}`],
  },
  {
    name: "Products",
    icon: "grid of 4 product glyphs",
    purpose: "One frame per product so visitors self-select",
    feeds: CAMPAIGNS.map((c) => `${c.product}: ${c.angle}`),
  },
  {
    name: "Proof",
    icon: "★ star / quote mark",
    purpose: "Testimonials + numbers — kill the 'will it work for me?' doubt",
    feeds: ["Operator quotes", "Before/after setups", "Round-number milestones"],
  },
  {
    name: "Behind the Pass",
    icon: "🍳 pan / kitchen",
    purpose: "Real venues, real service — the system under pressure",
    feeds: ["Friday-night rush clips", "KDS in a live kitchen", "Counter/kiosk in use"],
  },
  {
    name: "Commission-Free",
    icon: "% with a slash",
    purpose: "The single sharpest wedge vs marketplaces",
    feeds: ["The 14–35% math", "Direct-ordering explainer", "Keep-100% message"],
  },
  {
    name: "FAQ",
    icon: "? question mark",
    purpose: "Answer the objections that stall a demo booking",
    feeds: ["Setup time", "Hardware", "Switching from another POS", "Pricing range"],
  },
  {
    name: primaryCta.length <= 14 ? primaryCta : "Demo",
    icon: "→ arrow / calendar",
    purpose: "The conversion highlight — always the last thing they tap",
    feeds: [`What a demo covers`, `Link sticker → ${BRAND.site}`, "DM prompt"],
  },
];

const out = {
  brand: BRAND.name,
  generatedAt: new Date().toISOString(),
  coverSystem: {
    style: "Flat single-accent icons on the brand Ink background — one consistent set so the tray reads as a designed row, not a scrapbook.",
    rule: "Same icon weight, same background, same accent across all covers. Name each highlight in ≤14 chars so it doesn't truncate.",
  },
  highlights,
};
writeFileSync(join(outDir, "highlights.json"), JSON.stringify(out, null, 2));

const md = `# ${BRAND.name} — Story Highlights Plan

*Generated ${out.generatedAt.slice(0, 10)}.*

The Highlights tray is the **permanent pitch** under the bio. A cold visitor reads it left→right; order it the way they evaluate: *what is it → does it work → can I see it → how do I start.*

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
*Keep "Start Here" first and the conversion highlight last. Refresh "Proof" and "Behind the Pass" monthly from the best-performing Stories.*
`;
writeFileSync(join(outDir, "highlights.md"), md);

console.error(`[highlights] ${highlights.length} highlights | conversion: ${highlights[highlights.length - 1].name}`);
console.error(`[highlights] wrote ${join(outDir, "highlights.md")}`);
