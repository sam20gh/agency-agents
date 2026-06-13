#!/usr/bin/env node
/**
 * build-prompts.js — turns analysis.json (+ optional learnings.json) into the
 * 6-slide narrative arc, image-generation prompts, caption, and TikTok title.
 *
 * Narrative arc (fixed): Hook -> Problem -> Agitation -> Solution -> Feature -> CTA
 *
 * Outputs (into <run-dir>):
 *   slide-prompts.json  — array of { index, role, copy, imagePrompt }
 *   caption.txt         — platform caption with hashtags
 *   title.txt           — TikTok title (<= 90 chars)
 *
 * Usage:
 *   node build-prompts.js <analysis.json> <run-dir> [learnings.json]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const analysisPath = process.argv[2];
const runDir = process.argv[3];
const learningsPath = process.argv[4];

if (!analysisPath || !runDir) {
  console.error("Usage: node build-prompts.js <analysis.json> <run-dir> [learnings.json]");
  process.exit(1);
}

const a = JSON.parse(readFileSync(analysisPath, "utf8"));

let learnings = null;
if (learningsPath) {
  try {
    learnings = JSON.parse(readFileSync(learningsPath, "utf8"));
  } catch {
    /* first run — no learnings yet */
  }
}

const brand = a.brand?.name || "the brand";
const palette = (a.visualContext?.palette || a.brand?.colors || []).slice(0, 4);
const mood = a.visualContext?.mood || "modern professional, high-contrast, bold typography";
// Describe the font as a STYLE, never the raw family name — passing a literal
// name (e.g. a fallback "Times New Roman") into the prompt makes Gemini render
// the name as visible text on the slide.
const fonts = describeFont(a.brand?.typography?.heading);

// Pick a hook. Prefer a learned top-performer if available.
const learnedHook = learnings?.bestHooks?.[0]?.hook;
const hookPool = a.hooks && a.hooks.length ? a.hooks : ["The thing you didn't know you needed"];
const hookCopy = learnedHook || hookPool[Math.floor(Math.random() * hookPool.length)];
const hookStyle = classifyHookStyle(hookCopy);

const pain = (a.painPoints && a.painPoints[0]) || "The old way of doing this is broken";
const pain2 = (a.painPoints && a.painPoints[1]) || "And it's quietly costing you every day";

const feature =
  (a.content?.features || []).find((f) => f.length < 80) ||
  a.content?.tagline ||
  `${brand} makes it effortless`;
const stat = (a.content?.stats || [])[0];
const competitor = (a.competitors || [])[0];
const cta = (a.content?.ctas || []).find((c) => /try|start|get|join|sign|download|buy|shop/i.test(c)) || "Try it today";

// Visual DNA shared across every slide so Gemini keeps coherence.
const paletteStr = palette.length ? palette.join(", ") : "a bold high-contrast brand palette";
const visualDNA =
  `A full-bleed vertical 9:16 marketing poster graphic (edge to edge). Aesthetic: ${mood}. ` +
  `Color palette: ${paletteStr}. Use ${fonts}, large and legible. ` +
  `The image is ONLY a background photo with a bold headline text overlay — nothing else. ` +
  `Keep the bottom 20% clear of text. Centered, mobile-first composition with generous margins.`;

// Hard negative constraints: stop Gemini from drawing a fake app/phone screenshot.
const NEGATIVE =
  `ABSOLUTELY DO NOT render any phone UI, app interface, screenshot frame, status bar, ` +
  `clock, battery, signal bars, Instagram or TikTok logos or chrome, navigation bar, ` +
  `like/comment/share/save icons, follower counts, usernames, captions, or watermarks. ` +
  `No device mockup. Output a clean standalone poster image only. ` +
  `Render ONLY the headline (and supporting line if given) as text — do NOT draw any ` +
  `font names, color codes, hex values, labels, or instruction words as visible text.`;

function slidePrompt(role, headline, sub, extra = "") {
  return (
    `${visualDNA} This is the "${role}" frame of a 6-part visual story for ${brand}. ` +
    `Render this exact headline text prominently and correctly spelled: "${headline}". ` +
    (sub ? `Smaller supporting line beneath it: "${sub}". ` : "") +
    `${extra} ${NEGATIVE} Editorial, premium, scroll-stopping.`
  );
}

const slides = [
  {
    index: 1,
    role: "Hook",
    copy: hookCopy,
    hookStyle,
    imagePrompt: slidePrompt(
      "Hook",
      hookCopy,
      null,
      "This slide DEFINES the visual identity for the whole carousel — establish the dominant color, type style, and background treatment here. Bold, high-impact, the kind of frame that stops a thumb mid-scroll."
    ),
  },
  {
    index: 2,
    role: "Problem",
    copy: pain,
    imagePrompt: slidePrompt("Problem", pain, null, "Mood slightly tense/relatable. Keep the exact same color palette and type style as the reference image."),
  },
  {
    index: 3,
    role: "Agitation",
    copy: pain2,
    imagePrompt: slidePrompt(
      "Agitation",
      pain2,
      competitor ? `Even ${competitor} users feel this.` : null,
      "Heighten the stakes visually. Same palette and typography as the reference image."
    ),
  },
  {
    index: 4,
    role: "Solution",
    // copy must match the rendered HEADLINE (used by QA), not the sub-line.
    copy: `Meet ${brand}`,
    imagePrompt: slidePrompt("Solution", `Meet ${brand}`, a.content?.tagline || "A better way", "Shift the mood to relief/optimism. Same palette and typography as the reference image."),
  },
  {
    index: 5,
    role: "Feature",
    // copy must match the rendered (truncated) headline for QA.
    copy: truncate(feature, 60),
    imagePrompt: slidePrompt("Feature", truncate(feature, 60), stat ? `${stat} and counting` : null, "Show the standout benefit confidently. Same palette and typography as the reference image."),
  },
  {
    index: 6,
    role: "CTA",
    copy: cta,
    imagePrompt: slidePrompt("Call to action", cta, `Find ${brand} now`, "Clear, single, punchy call to action. Same palette and typography as the reference image."),
  },
];

writeFileSync(join(runDir, "slide-prompts.json"), JSON.stringify({ brand, hookStyle, slides }, null, 2));

// Caption + hashtags
const tags = buildHashtags(a);
const caption =
  `${hookCopy}\n\n` +
  `${pain} ${pain2}\n\n` +
  `${brand} ${a.content?.tagline ? "— " + a.content.tagline : "fixes it."} ${cta} 👇\n\n` +
  tags.join(" ");
writeFileSync(join(runDir, "caption.txt"), caption);

// TikTok title: <= 90 chars including 2-3 hashtags.
let title = hookCopy.replace(/\s+/g, " ").trim();
const titleTags = tags.slice(0, 3).join(" ");
if ((title + " " + titleTags).length > 90) {
  title = title.slice(0, 90 - titleTags.length - 2).trim();
}
writeFileSync(join(runDir, "title.txt"), `${title} ${titleTags}`.trim().slice(0, 90));

console.error(`[prompts] hook="${hookCopy}" (${hookStyle}) | 6 slides | tags: ${tags.join(" ")}`);

// ---- helpers ----

function describeFont(stack) {
  const s = (stack || "").toLowerCase();
  if (/mono|consol|courier/.test(s)) return "bold monospace typography";
  if (/serif/.test(s) && !/sans/.test(s)) return "elegant serif typography";
  return "bold modern sans-serif typography";
}

function classifyHookStyle(h) {
  if (/\?$/.test(h.trim())) return "question";
  if (/^(stop|don'?t|never|why|how)/i.test(h.trim())) return "command-or-curiosity";
  if (/\d/.test(h)) return "stat-claim";
  return "bold-claim";
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1).trim() + "…" : s;
}

function buildHashtags(a) {
  const base = ["#fyp", "#foryou"];
  const nicheTags = {
    "restaurant-tech": ["#restaurant", "#restaurantlife", "#hospitality", "#epos"],
    saas: ["#saas", "#productivity", "#startup", "#tech"],
    ecommerce: ["#smallbusiness", "#shopping", "#ecommerce", "#tiktokmademebuyit"],
    app: ["#app", "#tech", "#lifehack", "#productivity"],
    "developer-tools": ["#coding", "#developer", "#programming", "#tech"],
    health: ["#wellness", "#health", "#fitness", "#selfcare"],
    education: ["#learnontiktok", "#education", "#skills", "#career"],
    design: ["#design", "#ui", "#creative", "#designtok"],
    general: ["#business", "#growth", "#tips", "#viral"],
  };
  const niche = nicheTags[a.businessType] || nicheTags.general;
  const brandTag =
    "#" + (a.brand?.name || "brand").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  return [...new Set([...base, ...niche.slice(0, 4), brandTag])].slice(0, 8);
}
