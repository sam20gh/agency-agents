#!/usr/bin/env node
/**
 * build-prompts.js — turns articles.json (the live article selected by
 * fetch-articles.js) into the 6-slide narrative arc, image-generation prompts,
 * caption, and post title.
 *
 * Gulfio carousels are INFORMATIVE news teasers, not sales funnels. The arc:
 *   Slide 1  — the headline (stop the scroll with the actual news)
 *   Slides 2-5 — the genuinely useful facts (per-pillar arc, see lib/brand.js)
 *   Slide 6  — the app-download CTA (the full story lives in the Gulfio app)
 *
 * The COPY comes from the live article (accurate, on-message). The VISUAL
 * identity (palette, mood, fonts) comes from the curated brand config so every
 * post is unmistakably Gulfio. On AppValue days (or when no article was
 * available) it builds from a curated "Why Gulfio" promo instead.
 *
 * Outputs (into <run-dir>): slide-prompts.json, caption.txt, title.txt
 *
 * Usage:
 *   node build-prompts.js <articles.json> <run-dir> [learnings.json]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, VISUAL, ARCS, APP_PROMOS, HASHTAGS, classifyHookStyle, truncate, rotate } from "./lib/brand.js";

const articlesPath = process.argv[2];
const runDir = process.argv[3];
const learningsPath = process.argv[4];

if (!articlesPath || !runDir) {
  console.error("Usage: node build-prompts.js <articles.json> <run-dir> [learnings.json]");
  process.exit(1);
}

const data = JSON.parse(readFileSync(articlesPath, "utf8"));
let learnings = null;
if (learningsPath) {
  try {
    learnings = JSON.parse(readFileSync(learningsPath, "utf8"));
  } catch {
    /* first run — no learnings yet */
  }
}
const rotation = Number.isFinite(learnings?.history?.length) ? learnings.history.length : 0;

const pillar = data.pillar || "News";
const article = data.selected || null;
const arc = ARCS[pillar] || ARCS.News;

// ---- Build the 6 slide copies ----------------------------------------------
let slideCopy; // [slide1..slide5] strings; slide 6 (CTA) added below
let appCta;
let captionBody;
let hashTags;
let categoryLabel;

if (article) {
  categoryLabel = labelFor(pillar, article);
  const facts = extractFacts(article, 4);
  const headline = truncate(article.title, 80);

  slideCopy = [
    headline, // Slide 1 — headline
    facts[0] || truncate(article.summary, 70) || "Here's what we know so far",
    facts[1] || sourceLine(article),
    facts[2] || whyItMatters(pillar),
    facts[3] || "There's more to this story",
  ];

  appCta = rotate(BRAND.appCtas, rotation);
  captionBody =
    `${categoryLabel ? categoryLabel + ": " : ""}${article.title}\n\n` +
    `${truncate(article.summary || facts.join(". "), 280)}\n\n` +
    `📲 ${appCta} → ${BRAND.site}` +
    (article.source ? `\n\nvia ${article.source}` : "");
  hashTags = buildHashtags(pillar, article);
} else {
  // AppValue / fallback: curated promo.
  const promo = pickPromo(pillar, rotation);
  categoryLabel = "GULFIO";
  slideCopy = [
    promo.hook,
    promo.problem,
    promo.solution,
    truncate(promo.feature, 60),
    promo.proof,
  ];
  appCta = promo.cta;
  captionBody =
    `${promo.hook}\n\n` +
    `${promo.problem}. ${promo.solution} — ${promo.feature}.\n\n` +
    `📲 ${promo.cta} → ${BRAND.site}`;
  hashTags = buildHashtags("AppValue", null);
}

const slide6 = appCta;
const hookCopy = slideCopy[0];
const hookStyle = classifyHookStyle(hookCopy);

// ---- Visual identity (curated; image-to-image keeps it coherent) -----------
const vc = data.visualContext || {};
const palette = (vc.palette || VISUAL.palette).slice(0, 4);
const mood = vc.mood || VISUAL.moodByCategory[pillar] || VISUAL.moodByCategory.News;
const fonts = vc.fonts || VISUAL.fonts;
const accent = vc.accent || VISUAL.accent;
const paletteStr = palette.join(", ");

const visualDNA =
  `A full-bleed vertical 9:16 editorial news poster graphic (edge to edge). Aesthetic: ${mood}. ` +
  `Color palette: ${paletteStr} (deep navy base, ${accent} as the single accent). Use ${fonts}, large and legible. ` +
  `A small "${categoryLabel}" category tag (gold accent) sits near the top. ` +
  `The image is ONLY a relevant Gulf/MENA background photo with a bold headline text overlay — nothing else. ` +
  `Keep the bottom 20% clear of text. Centered, mobile-first composition with generous margins.`;

const NEGATIVE =
  `ABSOLUTELY DO NOT render any phone UI, app interface, screenshot frame, status bar, ` +
  `clock, battery, signal bars, Instagram or TikTok logos or chrome, navigation bar, ` +
  `like/comment/share/save icons, follower counts, usernames, captions, or watermarks. ` +
  `No device mockup. Output a clean standalone news poster image only. ` +
  `Render ONLY the headline (and the category tag) as text — do NOT draw any ` +
  `font names, color codes, hex values, labels, or instruction words as visible text. ` +
  `Do not invent fake logos of real news outlets. Keep imagery respectful and apolitical.`;

function slidePrompt(role, headline, extra = "") {
  return (
    `${visualDNA} This is the "${role}" frame of a 6-part visual news story for ${BRAND.name}. ` +
    `Render this exact headline text prominently and correctly spelled: "${headline}". ` +
    `${extra} ${NEGATIVE} Editorial, premium, credible, scroll-stopping.`
  );
}

const slideExtras = [
  "This slide DEFINES the visual identity for the whole carousel — establish the dominant navy, the gold accent, the type style, and the background treatment here. Authoritative, high-impact, the kind of news frame that stops a thumb mid-scroll.",
  "Keep the exact same palette, accent, and type style as the reference image. Calm, factual, informative.",
  "Same palette and typography as the reference image. Lead the eye to the key fact.",
  "Same palette and typography as the reference image. Convey significance/impact for the region.",
  "Same palette and typography as the reference image. Tease that there's more to the story.",
  "Same palette and typography as the reference image. Clear, single, confident call to action to download the app.",
];

const allCopy = [...slideCopy, slide6];
const slides = allCopy.map((copy, i) => ({
  index: i + 1,
  role: arc[i] || (i === 5 ? "CTA" : `Slide ${i + 1}`),
  copy: truncate(copy, i === 0 ? 90 : 88),
  ...(i === 0 ? { hookStyle } : {}),
  imagePrompt: slidePrompt(arc[i] || "CTA", truncate(copy, i === 0 ? 90 : 88), slideExtras[i]),
}));

writeFileSync(
  join(runDir, "slide-prompts.json"),
  JSON.stringify(
    {
      brand: BRAND.name,
      pillar,
      categoryLabel, // the gold tag rendered on every slide (BREAKING/FOOTBALL/...)
      category: article?.category || "appvalue",
      articleId: article?.id || null,
      articleUrl: article?.url || null,
      hookStyle,
      slides,
    },
    null,
    2
  )
);

// ---- Caption + title -------------------------------------------------------
const caption = `${captionBody}\n\n${hashTags.join(" ")}`;
writeFileSync(join(runDir, "caption.txt"), caption);

let title = hookCopy.replace(/\s+/g, " ").trim();
const titleTags = hashTags.slice(0, 3).join(" ");
if ((title + " " + titleTags).length > 90) {
  title = title.slice(0, 90 - titleTags.length - 2).trim();
}
writeFileSync(join(runDir, "title.txt"), `${title} ${titleTags}`.trim().slice(0, 90));

console.error(
  `[prompts] pillar=${pillar} hook="${truncate(hookCopy, 60)}" style=${hookStyle} rotation=${rotation} | tags: ${hashTags.join(" ")}`
);

// ---- helpers ----------------------------------------------------------------

function labelFor(p, art) {
  if (p === "Football") {
    const t = `${art?.title || ""} ${art?.category || ""}`;
    const footy = /\b(football|soccer|uefa|fifa|premier league|la ?liga|serie a|bundesliga|ligue ?1|champions league|pro league|al ?nassr|al ?hilal|messi|ronaldo)\b/i.test(t);
    return footy ? "FOOTBALL" : "SPORT";
  }
  return { News: "BREAKING", Weather: "WEATHER", AppValue: "GULFIO" }[p] || "NEWS";
}

function whyItMatters(p) {
  return {
    News: "Why it matters for the region",
    Football: "What it means for the table",
    Weather: "What it means for you",
    AppValue: "Why thousands trust Gulfio",
  }[p];
}

function sourceLine(a) {
  return a.source ? `According to ${a.source}` : "Here's what we know";
}

/**
 * Pull up to `n` informative fact-lines from the article, in document order.
 * News writing is inverted-pyramid: the lede + first body sentences ARE the key
 * facts, so order beats keyword scoring. The summary comes first (it's the
 * lede), then body sentences fill any gap. Each line is a COMPLETE sentence,
 * trimmed to a slide-legible length on a word boundary by the caller.
 */
function extractFacts(a, n) {
  // Summary first (the lede), then body — de-duplicated, in order.
  const text = `${a.summary || ""} ${a.body || ""}`.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 220);

  const seen = new Set();
  const ordered = [];
  for (const s of sentences) {
    const key = s.slice(0, 40).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(s);
    if (ordered.length >= n) break;
  }
  return ordered;
}

function pickPromo(p, i) {
  const byPillar = { Football: "football", Weather: "weather" };
  const want = byPillar[p];
  if (want) {
    const m = APP_PROMOS.find((x) => x.id === want);
    if (m) return m;
  }
  return rotate(APP_PROMOS, i);
}

function buildHashtags(p, a) {
  const base = [...HASHTAGS.broad.slice(0, 2), ...HASHTAGS.region.slice(0, 3)];
  const pillarTags =
    p === "Football" ? HASHTAGS.football.slice(0, 2) : p === "Weather" ? HASHTAGS.weather.slice(0, 2) : [];
  // Add a country tag if the article mentions one.
  const country = a ? detectCountryTag(`${a.title} ${a.summary}`) : null;
  const tags = [...base, ...pillarTags, ...(country ? [country] : []), ...HASHTAGS.branded];
  return [...new Set(tags)].slice(0, 8);
}

function detectCountryTag(text) {
  const map = [
    [/\b(uae|emirat|dubai|abu dhabi)\b/i, "#uae"],
    [/\b(saudi|riyadh|jeddah|ksa)\b/i, "#saudiarabia"],
    [/\b(qatar|doha)\b/i, "#qatar"],
    [/\b(kuwait)\b/i, "#kuwait"],
    [/\b(bahrain|manama)\b/i, "#bahrain"],
    [/\b(oman|muscat)\b/i, "#oman"],
    [/\b(egypt|cairo)\b/i, "#egypt"],
  ];
  for (const [re, tag] of map) if (re.test(text)) return tag;
  return null;
}
