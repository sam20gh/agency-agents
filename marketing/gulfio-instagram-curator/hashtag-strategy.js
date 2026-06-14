#!/usr/bin/env node
/**
 * hashtag-strategy.js — Phase 3 of the Gulfio Instagram Curator.
 *
 * Builds a tiered hashtag strategy (broad + region + pillar + branded) and a
 * ready-to-paste set per content pillar. Instagram favours ~5–8 highly-relevant
 * tags over a wall of 30, so each set is curated, not dumped.
 *
 * Usage:
 *   node hashtag-strategy.js <out-dir>
 * Writes: <out-dir>/hashtags.json, <out-dir>/hashtags.md
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BRAND, HASHTAGS } from "./lib/brand.js";

const outDir = process.argv[2];
if (!outDir) {
  console.error("Usage: node hashtag-strategy.js <out-dir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

function setFor(extra, count = 8) {
  const picked = [...HASHTAGS.broad.slice(0, 2), ...HASHTAGS.region.slice(0, 3), ...extra, ...HASHTAGS.branded.slice(0, 1)];
  return [...new Set(picked)].slice(0, count);
}

const sets = {
  News: setFor(["#gulfnews", "#middleeastnews", "#breakingnews"]),
  Football: setFor(HASHTAGS.football.slice(0, 3)),
  Weather: setFor(HASHTAGS.weather.slice(0, 3)),
  AppValue: setFor(["#newsapp", "#gulf", "#mena"]),
};

const out = {
  brand: BRAND.name,
  generatedAt: new Date().toISOString(),
  guidance: {
    perPost: "6–8 highly-relevant tags. Relevance beats volume — IG down-ranks spammy walls.",
    placement: "First comment OR end of caption (pick one, stay consistent). Never mid-sentence.",
    rotation: "Rotate ~30% of tags between posts so you don't trip repetitive-content filters.",
    branded: "Always include #gulfio so reposts/UGC are findable.",
    location: "Swap in the specific city tag the story is about (e.g. #dubai for a Dubai story).",
  },
  tiers: HASHTAGS,
  setsByPillar: sets,
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
| Region | Qualified Gulf/MENA intent | ${HASHTAGS.region.join(" ")} |
| Football | Match/sport days | ${HASHTAGS.football.join(" ")} |
| Weather | Forecast/alert days | ${HASHTAGS.weather.join(" ")} |
| Branded | Own them; make UGC findable | ${HASHTAGS.branded.join(" ")} |

## Ready-to-paste sets by pillar

${Object.entries(sets)
  .map(([pillar, tags]) => `**${pillar}**\n\n\`\`\`\n${tags.join(" ")}\n\`\`\`\n`)
  .join("\n")}

---
*Pairs with \`calendar.md\` — each day references its pillar's set. Add the specific city tag the story is about.*
`;
writeFileSync(join(outDir, "hashtags.md"), md);

console.error(`[hashtags] sets: ${Object.keys(sets).join(", ")}`);
console.error(`[hashtags] wrote ${join(outDir, "hashtags.md")}`);
