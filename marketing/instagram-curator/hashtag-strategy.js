#!/usr/bin/env node
/**
 * hashtag-strategy.js — Phase 2/4 of the Instagram Curator.
 *
 * Builds a tiered hashtag strategy (broad + niche + branded + location) and a
 * ready-to-paste set per content pillar. Per the agent spec: a research-backed
 * mix for discoverability without looking spammy. Instagram now favours ~3–5
 * highly-relevant tags over a wall of 30, so each set is curated, not dumped.
 *
 * Pulls competitor names from analysis.json to suggest tags worth monitoring.
 *
 * Usage:
 *   node hashtag-strategy.js <analysis.json> <out-dir>
 * Writes: <out-dir>/hashtags.json, <out-dir>/hashtags.md
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BRAND, CAMPAIGNS, HASHTAGS } from "./lib/brand.js";

const analysisPath = process.argv[2];
const outDir = process.argv[3];
if (!analysisPath || !outDir) {
  console.error("Usage: node hashtag-strategy.js <analysis.json> <out-dir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const a = JSON.parse(readFileSync(analysisPath, "utf8"));

// Per-pillar sets: a few broad for reach, more niche for qualified intent, one
// or two branded. Keep each set ~6–8 tags (current best practice).
function setFor(pillarTags, count = 8) {
  const picked = [
    ...HASHTAGS.broad.slice(0, 2),
    ...pillarTags,
    ...HASHTAGS.branded.slice(0, 1),
  ];
  return [...new Set(picked)].slice(0, count);
}

const sets = {
  Brand: setFor([...HASHTAGS.niche.slice(0, 4), "#grubpos"]),
  Educational: setFor(["#restaurantmanagement", "#foodbusiness", "#restaurantowner", "#hospitality", "#runyourrestaurant"]),
  Community: setFor(["#restaurantlife", "#cheflife", "#kitchenlife", "#restaurant", "#hospitality"]),
};

// Per-campaign branded/product tag suggestion (Brand posts swap in the product tag).
const campaignTags = CAMPAIGNS.map((c) => ({
  product: c.product,
  set: [...new Set([...HASHTAGS.broad.slice(0, 2), c.tag, "#restaurant", "#hospitality", "#grubpos"])].slice(0, 7),
}));

// Competitor tags worth monitoring (NOT posting on — for listening/positioning).
const competitors = a.competitors || [];
const monitor = competitors
  .map((c) => "#" + c.toLowerCase().replace(/[^a-z0-9]/g, ""))
  .filter(Boolean);

const out = {
  brand: BRAND.name,
  generatedAt: new Date().toISOString(),
  guidance: {
    perPost: "6–8 highly-relevant tags. Quality + relevance beats volume — Instagram down-ranks spammy walls.",
    placement: "First comment OR end of caption (pick one, stay consistent). Never mid-sentence.",
    rotation: "Rotate ~30% of tags between posts so you don't trip repetitive-content filters.",
    branded: "Always include a branded tag so UGC is findable. Pin #runyourrestaurant in bio.",
    location: "Swap the location tags for the operator's actual city when posting for a specific venue.",
  },
  tiers: HASHTAGS,
  setsByPillar: sets,
  campaignTags,
  monitor,
};
writeFileSync(join(outDir, "hashtags.json"), JSON.stringify(out, null, 2));

const md = `# ${BRAND.name} — Instagram Hashtag Strategy

*Generated ${out.generatedAt.slice(0, 10)}.*

## How to use

- **${out.guidance.perPost}**
- **Placement:** ${out.guidance.placement}
- **Rotation:** ${out.guidance.rotation}
- **Branded:** ${out.guidance.branded}
- **Location:** ${out.guidance.location}

## Tiers

| Tier | Purpose | Tags |
|---|---|---|
| Broad | Reach (high volume, high competition) | ${HASHTAGS.broad.join(" ")} |
| Niche | Qualified operator intent | ${HASHTAGS.niche.join(" ")} |
| Branded | Own them; make UGC findable | ${HASHTAGS.branded.join(" ")} |
| Location | Swap per venue/city | ${HASHTAGS.location.join(" ")} |

## Ready-to-paste sets by pillar

${Object.entries(sets)
  .map(([pillar, tags]) => `**${pillar}**\n\n\`\`\`\n${tags.join(" ")}\n\`\`\`\n`)
  .join("\n")}

## Per-campaign sets (Brand posts)

${campaignTags.map((c) => `- **${c.product}** — \`${c.set.join(" ")}\``).join("\n")}

${monitor.length ? `## Competitor tags to monitor (listen, don't post)\n\n${monitor.join(" ")}\n\n*Watch these to spot operator complaints, trending angles, and switch-intent you can answer in comments.*\n` : ""}
---
*Pairs with \`calendar.md\` — each day references its pillar's set.*
`;
writeFileSync(join(outDir, "hashtags.md"), md);

console.error(`[hashtags] sets: ${Object.keys(sets).join(", ")} | monitor: ${monitor.join(" ") || "none"}`);
console.error(`[hashtags] wrote ${join(outDir, "hashtags.md")}`);
