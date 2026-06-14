#!/usr/bin/env node
/**
 * content-calendar.js — Phase 2 of the Gulfio Instagram Curator.
 *
 * Builds a 30-day Instagram content calendar across Gulfio's four pillars
 * (News / Football / Weather / AppValue) and multiple formats (Carousel, Reel,
 * Single image, Story). One primary feed post per day + a Story idea.
 *
 * CRITICAL: each day's `pillar` is read by the news engine's pick-category.js,
 * which then fetches a live article of that category for the daily carousel. So
 * this calendar is both the human plan AND the engine's content schedule.
 *
 * If the news engine's learnings.json is passed, its self-learned best hour is
 * used for posting time; otherwise a sensible per-weekday default is applied.
 *
 * Usage:
 *   node content-calendar.js <out-dir> [learnings.json] [YYYY-MM-DD]
 * Writes: <out-dir>/calendar.json, <out-dir>/calendar.md
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BRAND, NEWS, FOOTBALL, WEATHER, APP_PROMOS, rotate } from "./lib/brand.js";

const outDir = process.argv[2];
const learningsPath = process.argv[3];
const startArg = process.argv[4];
if (!outDir) {
  console.error("Usage: node content-calendar.js <out-dir> [learnings.json] [YYYY-MM-DD]");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

let learnings = null;
if (learningsPath) {
  try {
    learnings = JSON.parse(readFileSync(learningsPath, "utf8"));
  } catch {
    /* no learnings yet */
  }
}

// ---- Best posting hour -----------------------------------------------------
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
// Default windows for a news audience (commute + evening scroll, regional time).
const WEEKDAY_TIME = {
  Mon: "08:00",
  Tue: "08:00",
  Wed: "13:00",
  Thu: "20:00",
  Fri: "20:00",
  Sat: "11:00",
  Sun: "08:00",
};

// ---- Weekly pillar pattern (matches the engine's weekday rotation) ----------
// Sun..Sat. News-heavy core, Football on match-heavy days, a Weather/AppValue
// change-up. Keep in sync with gulfio-news-engine/pick-category.js WEEKDAY.
const WEEKDAY_PILLAR = ["News", "News", "Football", "News", "Weather", "Football", "AppValue"];

const FORMAT_BY_PILLAR = {
  News: ["Carousel", "Reel", "Single image"],
  Football: ["Carousel", "Reel", "Carousel"],
  Weather: ["Single image", "Carousel", "Story-led"],
  AppValue: ["Carousel", "Reel", "Single image"],
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const start = startArg ? new Date(startArg + "T00:00:00") : new Date();

const formatIdx = { News: 0, Football: 0, Weather: 0, AppValue: 0 };
const bankIdx = { News: 0, Football: 0, Weather: 0, AppValue: 0 };

function bankFor(pillar, i) {
  if (pillar === "Football") return rotate(FOOTBALL, i);
  if (pillar === "Weather") return rotate(WEATHER, i);
  if (pillar === "AppValue") return rotate(APP_PROMOS, i);
  return rotate(NEWS, i);
}

function caption(pillar, item) {
  if (pillar === "AppValue") {
    return `${item.hook}\n\n${item.benefit}.\n\n📲 ${item.cta} → ${BRAND.site}`;
  }
  const close =
    pillar === "Football"
      ? "Live scores & fixtures on the app 👉"
      : pillar === "Weather"
        ? "Full city forecasts on the app 👉"
        : "Get the full story first 👉";
  return `${item.hook}\n\n${item.takeaway}.\n\n📲 ${close} ${BRAND.site}`;
}

const days = [];
for (let i = 0; i < 30; i++) {
  const date = new Date(start);
  date.setDate(start.getDate() + i);
  const dow = DAY_NAMES[date.getDay()];
  const pillar = WEEKDAY_PILLAR[date.getDay()];

  const item = bankFor(pillar, bankIdx[pillar]++);
  const formatList = FORMAT_BY_PILLAR[pillar];
  const format = formatList[formatIdx[pillar]++ % formatList.length];

  const title = pillar === "AppValue" ? `${item.product}: ${item.angle}` : item.theme;
  const hook = item.hook;
  const cta = pillar === "AppValue" ? item.cta : "Download Gulfio";

  const storyIdea =
    pillar === "Football"
      ? `Live score sticker for today's match + "open in app" link`
      : pillar === "Weather"
        ? `Today's temps poll ("hotter where you are?") + forecast link sticker`
        : pillar === "AppValue"
          ? `App walkthrough Story + "Download Gulfio" link sticker`
          : `"Today's top Gulf story" teaser → swipe up / link to app`;

  days.push({
    day: i + 1,
    date: date.toISOString().slice(0, 10),
    weekday: dow,
    pillar, // ← read by the news engine
    format,
    title,
    hook,
    cta,
    postTime: BEST_HOUR || WEEKDAY_TIME[dow],
    storyIdea,
    captionSkeleton: caption(pillar, item),
  });
}

// ---- Mix summary -----------------------------------------------------------
const mix = days.reduce((m, d) => ((m[d.pillar] = (m[d.pillar] || 0) + 1), m), {});
const fmtMix = days.reduce((m, d) => ((m[d.format] = (m[d.format] || 0) + 1), m), {});

const calendar = {
  brand: BRAND.name,
  generatedAt: new Date().toISOString(),
  startDate: days[0].date,
  postingTimeSource: BEST_HOUR ? "learned (news-engine analytics)" : "weekday-default",
  pillarMix: mix,
  formatMix: fmtMix,
  targets: {
    engagementRate: "3.5%+",
    storyCompletion: "80%+",
    reachGrowth: "25% MoM",
    appInstalls: "track link-in-bio + Story link taps as the north-star",
  },
  days,
};
writeFileSync(join(outDir, "calendar.json"), JSON.stringify(calendar, null, 2));

// ---- Markdown --------------------------------------------------------------
const emoji = { News: "🟦", Football: "🟩", Weather: "🟨", AppValue: "🟧" };
const PILLAR_ORDER = ["News", "Football", "Weather", "AppValue"];
const md = `# ${BRAND.name} — 30-Day Instagram Content Calendar

*Generated ${calendar.generatedAt.slice(0, 10)} · starts ${calendar.startDate} · posting time: ${calendar.postingTimeSource}.*

> Each day's **pillar** is read by the Gulfio News Engine, which fetches a live article of that category and builds the carousel. Keep the pillar column intact.

## Content mix

| Pillar | Posts | Share |
|---|---|---|
${PILLAR_ORDER.map((p) => `| ${emoji[p]} ${p} | ${mix[p] || 0} | ${Math.round(((mix[p] || 0) / 30) * 100)}% |`).join("\n")}

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
*Live copy each day comes from the Gulfio API article for that pillar. Swap a \`title\`/\`hook\` for a timely angle, but keep the \`pillar\` + \`format\` so the grid stays coherent and the engine fetches the right content (see \`aesthetic.md\`).*
`;
writeFileSync(join(outDir, "calendar.md"), md);

console.error(`[calendar] 30 days | mix ${JSON.stringify(mix)} | time ${calendar.postingTimeSource}`);
console.error(`[calendar] wrote ${join(outDir, "calendar.md")}`);
