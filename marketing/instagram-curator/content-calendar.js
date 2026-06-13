#!/usr/bin/env node
/**
 * content-calendar.js — Phase 2 of the Instagram Curator.
 *
 * Builds a 30-day Instagram content calendar following the agent spec's 1/3
 * rule (Brand / Educational / Community) across multiple formats (Carousel,
 * Reel, Single image, Story). One primary feed post per day + a Story idea.
 *
 * Content pillars:
 *   - Brand        → rotating GrubPos product campaigns
 *   - Educational  → operator how-to / insight bank
 *   - Community    → UGC, proof, polls, spotlights
 *
 * If a carousel-engine learnings.json is passed, its self-learned best hour is
 * used for posting time; otherwise a sensible per-weekday default is applied.
 *
 * Usage:
 *   node content-calendar.js <analysis.json> <out-dir> [learnings.json] [YYYY-MM-DD]
 * Writes: <out-dir>/calendar.json, <out-dir>/calendar.md
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BRAND, CAMPAIGNS, EDUCATIONAL, COMMUNITY } from "./lib/brand.js";

const analysisPath = process.argv[2];
const outDir = process.argv[3];
const learningsPath = process.argv[4];
const startArg = process.argv[5];
if (!analysisPath || !outDir) {
  console.error("Usage: node content-calendar.js <analysis.json> <out-dir> [learnings.json] [YYYY-MM-DD]");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const a = JSON.parse(readFileSync(analysisPath, "utf8"));
let learnings = null;
if (learningsPath) {
  try {
    learnings = JSON.parse(readFileSync(learningsPath, "utf8"));
  } catch {
    /* no learnings yet */
  }
}

// Proof points: real stats from the scrape if present, else curated.
const scrapedStats = (a.content?.stats || []).filter((s) => /%|k|m|x|\+|£|\$/i.test(s)).slice(0, 4);
const proof = scrapedStats.length ? scrapedStats.join(" · ") : "Thousands of restaurants · Commission-free";

// ---- Best posting hour -----------------------------------------------------
// Reuse the carousel engine's learned best hour if available; else weekday map.
function learnedBestHour() {
  const hist = (learnings?.history || []).filter((h) => h.engagementRate > 0 && h.hour != null);
  if (!hist.length) return null;
  const byHour = {};
  for (const h of hist) {
    byHour[h.hour] = byHour[h.hour] || { sum: 0, n: 0 };
    byHour[h.hour].sum += h.engagementRate;
    byHour[h.hour].n += 1;
  }
  let best = null;
  let bestAvg = -1;
  for (const [hour, { sum, n }] of Object.entries(byHour)) {
    const avg = sum / n;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = hour;
    }
  }
  return best != null ? `${String(best).padStart(2, "0")}:00` : null;
}
const BEST_HOUR = learnedBestHour();
// Default high-intent windows for restaurant operators (they scroll between services).
const WEEKDAY_TIME = {
  Mon: "11:30",
  Tue: "15:00",
  Wed: "15:00",
  Thu: "17:30",
  Fri: "11:30",
  Sat: "10:00",
  Sun: "18:00",
};

// ---- Format rotation (multi-format mastery) --------------------------------
// Reels carry reach; carousels carry depth; single images anchor the grid.
const FORMAT_BY_PILLAR = {
  Brand: ["Carousel", "Reel", "Single image"],
  Educational: ["Carousel", "Reel", "Carousel"],
  Community: ["Reel", "Single image", "Story-led"],
};

// ---- Build 30 days ---------------------------------------------------------
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const start = startArg ? new Date(startArg + "T00:00:00") : new Date();
const PILLAR_CYCLE = ["Brand", "Educational", "Community"]; // 1/3 rule, round-robin

const counters = { Brand: 0, Educational: 0, Community: 0 };
const formatIdx = { Brand: 0, Educational: 0, Community: 0 };

function caption(pillar, item, campaign) {
  // Skeleton: hook → context → one CTA. Hashtags live in hashtags.md, not here.
  if (pillar === "Brand") {
    return `${campaign.hook}\n\n${campaign.benefit}.\n\n${campaign.cta} 👇 ${BRAND.site}`;
  }
  if (pillar === "Educational") {
    return `${item.hook}\n\n${item.takeaway}.\n\nSave this for your next shift. Full breakdown 👉 ${BRAND.site}`;
  }
  // Community
  const close = item.story ? "Tap the sticker 👆" : item.ugc ? "Tag an operator who needs this 👇" : "Drop a 🔥 if this is your kitchen";
  return `${item.hook}\n\n${item.takeaway}.\n\n${close}`;
}

const days = [];
for (let i = 0; i < 30; i++) {
  const date = new Date(start);
  date.setDate(start.getDate() + i);
  const dow = DAY_NAMES[date.getDay()];
  const pillar = PILLAR_CYCLE[i % 3];

  let title, hook, item, campaign, ctaOrStory, formatList;
  if (pillar === "Brand") {
    campaign = CAMPAIGNS[counters.Brand % CAMPAIGNS.length];
    title = `${campaign.product}: ${campaign.angle}`;
    hook = campaign.hook;
    ctaOrStory = campaign.cta;
    formatList = FORMAT_BY_PILLAR.Brand;
  } else if (pillar === "Educational") {
    item = EDUCATIONAL[counters.Educational % EDUCATIONAL.length];
    title = item.theme;
    hook = item.hook;
    ctaOrStory = "Save + share";
    formatList = FORMAT_BY_PILLAR.Educational;
  } else {
    item = COMMUNITY[counters.Community % COMMUNITY.length];
    title = item.theme;
    hook = item.hook;
    ctaOrStory = item.story ? "Story interaction (poll/Q&A)" : item.ugc ? "Repost / tag UGC" : "Engagement bait";
    formatList = FORMAT_BY_PILLAR.Community;
  }

  const format = formatList[formatIdx[pillar] % formatList.length];
  formatIdx[pillar]++;
  counters[pillar]++;

  // Story idea every day (Stories run daily even when the feed post is light).
  const storyIdea =
    pillar === "Community" && item?.story
      ? `${hook} — interactive sticker`
      : pillar === "Brand"
        ? `BTS of ${campaign.product} in a real venue + "${campaign.cta}" link sticker`
        : `Quick tip teaser for "${title}" → swipe up to the feed post`;

  days.push({
    day: i + 1,
    date: date.toISOString().slice(0, 10),
    weekday: dow,
    pillar,
    format,
    title,
    hook,
    cta: ctaOrStory,
    postTime: BEST_HOUR || WEEKDAY_TIME[dow],
    storyIdea,
    captionSkeleton: caption(pillar, item, campaign),
    campaignId: campaign?.id || null,
  });
}

// ---- Mix summary -----------------------------------------------------------
const mix = days.reduce((m, d) => ((m[d.pillar] = (m[d.pillar] || 0) + 1), m), {});
const fmtMix = days.reduce((m, d) => ((m[d.format] = (m[d.format] || 0) + 1), m), {});

const calendar = {
  brand: BRAND.name,
  generatedAt: new Date().toISOString(),
  startDate: days[0].date,
  postingTimeSource: BEST_HOUR ? "learned (carousel analytics)" : "weekday-default",
  pillarMix: mix,
  formatMix: fmtMix,
  proof,
  targets: {
    engagementRate: "3.5%+",
    storyCompletion: "80%+",
    reachGrowth: "25% MoM",
    ugcPerMonth: "200+ branded posts",
  },
  days,
};
writeFileSync(join(outDir, "calendar.json"), JSON.stringify(calendar, null, 2));

// ---- Markdown --------------------------------------------------------------
const emoji = { Brand: "🟦", Educational: "🟩", Community: "🟧" };
const md = `# ${BRAND.name} — 30-Day Instagram Content Calendar

*Generated ${calendar.generatedAt.slice(0, 10)} · starts ${calendar.startDate} · posting time: ${calendar.postingTimeSource}.*

## Content mix (1/3 rule)

| Pillar | Posts | Share |
|---|---|---|
${PILLAR_CYCLE.map((p) => `| ${emoji[p]} ${p} | ${mix[p] || 0} | ${Math.round(((mix[p] || 0) / 30) * 100)}% |`).join("\n")}

**Format spread:** ${Object.entries(fmtMix).map(([f, n]) => `${f} ×${n}`).join(" · ")}

**Targets:** ${Object.entries(calendar.targets).map(([k, v]) => `${k} ${v}`).join(" · ")}

## Calendar

| Day | Date | Day | Pillar | Format | Post @ | Title / Hook | CTA |
|---|---|---|---|---|---|---|---|
${days
  .map(
    (d) =>
      `| ${d.day} | ${d.date} | ${d.weekday} | ${emoji[d.pillar]} ${d.pillar} | ${d.format} | ${d.postTime} | **${d.title}** — ${d.hook} | ${d.cta} |`,
  )
  .join("\n")}

## Caption skeletons + Story ideas

${days
  .map(
    (d) => `### Day ${d.day} (${d.date}, ${d.weekday}) — ${emoji[d.pillar]} ${d.pillar} · ${d.format}
**${d.title}**

\`\`\`
${d.captionSkeleton}
\`\`\`
*Story:* ${d.storyIdea}
*Hashtags:* see \`hashtags.md\` → ${d.pillar} set.
`,
  )
  .join("\n")}

---
*Brand posts rotate the six GrubPos product campaigns. Educational + Community pull from the operator content banks. Swap any \`title\`/\`hook\` for a timely angle, but keep the pillar + format so the grid stays coherent (see \`aesthetic.md\`).*
`;
writeFileSync(join(outDir, "calendar.md"), md);

console.error(`[calendar] 30 days | mix ${JSON.stringify(mix)} | time ${calendar.postingTimeSource}`);
console.error(`[calendar] wrote ${join(outDir, "calendar.md")}`);
