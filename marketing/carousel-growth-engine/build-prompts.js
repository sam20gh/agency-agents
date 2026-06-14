#!/usr/bin/env node
/**
 * build-prompts.js — turns analysis.json (+ optional learnings.json) into the
 * 6-slide narrative arc, image-generation prompts, caption, and TikTok title.
 *
 * Narrative arc (fixed): Hook -> Problem -> Agitation -> Solution -> Feature -> CTA
 *
 * Content comes from a rotating set of GrubPos product CAMPAIGNS so each daily
 * post is materially different from the last. The scraped analysis.json is used
 * only for the VISUAL identity (palette, mood, fonts) — not the copy — so the
 * brand, product names, and claims are always accurate and on-message.
 *
 * Outputs (into <run-dir>): slide-prompts.json, caption.txt, title.txt
 *
 * Usage:
 *   node build-prompts.js <analysis.json> <run-dir> [learnings.json]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

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

// Brand is fixed for this deployment (the scrape often falls back to a hostname).
const brand = process.env.BRAND_NAME || "GrubPos";
const SITE = "grubpos.com";

// ---- GrubPos product campaigns (rotated for day-to-day variety) ------------
// One campaign = one full 6-slide story for a specific product/angle. Keep
// headlines short so they render cleanly. proof = slide-5 sub (no scraped fees).
const CAMPAIGNS = [
  {
    id: "platform",
    product: "GrubPos",
    hook: "Running 5 systems to run one restaurant?",
    problem: "Your till, kitchen and online orders don't talk",
    agitation: "So you're reconciling it all by hand at midnight",
    solution: "Meet GrubPos",
    solutionSub: "One system for your whole operation",
    feature: "Every order in one place",
    proof: "Trusted by 4,000+ restaurants",
    cta: "Book a free demo",
    tag: "#epos",
  },
  {
    id: "digital-ordering",
    product: "GrubPos Digital Ordering",
    hook: "Marketplaces are eating your profit",
    problem: "Just Eat, Deliveroo & Uber Eats take 14–35% per order",
    agitation: "That's margin you never get back",
    solution: "Go commission-free",
    solutionSub: "with GrubPos online ordering",
    feature: "Keep 100% of every order",
    proof: "Commission-free, always",
    cta: "Stop paying commission",
    tag: "#commissionfree",
  },
  {
    id: "kds",
    product: "GrubPos KDS",
    hook: "Paper tickets are slowing your kitchen",
    problem: "Lost dockets and orders shouted across the pass",
    agitation: "Every missed ticket is a refund and a bad review",
    solution: "Meet GrubPos KDS",
    solutionSub: "Your kitchen display system",
    feature: "Orders routed to the right station",
    proof: "No more paper tickets",
    cta: "Upgrade your kitchen",
    tag: "#kitchen",
  },
  {
    id: "kiosk",
    product: "GrubKiosk",
    hook: "Your counter queue is costing you sales",
    problem: "At peak, customers walk out instead of waiting",
    agitation: "Long lines mean smaller orders and lost covers",
    solution: "Meet GrubKiosk",
    solutionSub: "Self-ordering for fast food & QSR",
    feature: "Bigger baskets, shorter queues",
    proof: "Self-service that upsells for you",
    cta: "Add self-ordering kiosks",
    tag: "#selfordering",
  },
  {
    id: "epos",
    product: "GrubPos EPOS",
    hook: "Your till shouldn't slow your team down",
    problem: "Clunky tills cost you covers at the worst time",
    agitation: "Every fumbled order is a table you can't turn",
    solution: "Meet GrubPos EPOS",
    solutionSub: "One fast, reliable till",
    feature: "Dine-in, takeaway & delivery in one",
    proof: "Built for busy service",
    cta: "See GrubPos EPOS",
    tag: "#epos",
  },
  {
    id: "websites",
    product: "GrubPos Websites",
    hook: "You don't own your customers — apps do",
    problem: "Your regulars order through apps that hide their data",
    agitation: "No list, no control, no repeat marketing",
    solution: "Own your channel",
    solutionSub: "with a branded GrubPos site",
    feature: "Your brand, your customers, your data",
    proof: "Commission-free ordering built in",
    cta: "Claim your restaurant site",
    tag: "#restaurantmarketing",
  },
];

// ---- Campaign selection: Instagram Curator calendar, then rotation ---------
// If the Curator's 30-day calendar exists, today's planned Brand-pillar entry
// drives this post so the carousel matches the published plan. When there's no
// calendar (or today isn't a Brand day), fall back to blind rotation by how many
// posts already exist, so consecutive runs never repeat.
const rotation = Number.isFinite(learnings?.history?.length) ? learnings.history.length : 0;
const planned = pickFromCalendar();
const c = planned.campaign || CAMPAIGNS[rotation % CAMPAIGNS.length];
console.error(`[prompts] campaign source: ${planned.reason}`);

const hookCopy = c.hook;
const hookStyle = classifyHookStyle(hookCopy);

// ---- Visual identity (from the scrape; copy stays curated) ------------------
const palette = (a.visualContext?.palette || a.brand?.colors || []).slice(0, 4);
const mood = a.visualContext?.mood || "warm appetizing restaurant-tech, navy and bright blue accent, confident bold sans-serif";
const fonts = describeFont(a.brand?.typography?.heading);
const paletteStr = palette.length ? palette.join(", ") : "navy, near-black, white and a bright blue accent";

const visualDNA =
  `A full-bleed vertical 9:16 marketing poster graphic (edge to edge). Aesthetic: ${mood}. ` +
  `Color palette: ${paletteStr}. Use ${fonts}, large and legible. ` +
  `Real busy restaurant/kitchen context. ` +
  `The image is ONLY a background photo with a bold headline text overlay — nothing else. ` +
  `Keep the bottom 20% clear of text. Centered, mobile-first composition with generous margins.`;

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
    copy: c.hook,
    hookStyle,
    imagePrompt: slidePrompt(
      "Hook",
      c.hook,
      null,
      "This slide DEFINES the visual identity for the whole carousel — establish the dominant color, type style, and background treatment here. Bold, high-impact, the kind of frame that stops a thumb mid-scroll."
    ),
  },
  {
    index: 2,
    role: "Problem",
    copy: c.problem,
    imagePrompt: slidePrompt("Problem", c.problem, null, "Mood slightly tense/relatable. Keep the exact same color palette and type style as the reference image."),
  },
  {
    index: 3,
    role: "Agitation",
    copy: c.agitation,
    imagePrompt: slidePrompt("Agitation", c.agitation, null, "Heighten the stakes visually. Same palette and typography as the reference image."),
  },
  {
    index: 4,
    role: "Solution",
    copy: c.solution, // matches rendered headline (QA checks this)
    imagePrompt: slidePrompt("Solution", c.solution, c.solutionSub, "Shift the mood to relief/optimism. Same palette and typography as the reference image."),
  },
  {
    index: 5,
    role: "Feature",
    copy: truncate(c.feature, 60),
    imagePrompt: slidePrompt("Feature", truncate(c.feature, 60), c.proof, "Show the standout benefit confidently. Same palette and typography as the reference image."),
  },
  {
    index: 6,
    role: "CTA",
    copy: c.cta,
    imagePrompt: slidePrompt("Call to action", c.cta, SITE, "Clear, single, punchy call to action. Same palette and typography as the reference image."),
  },
];

writeFileSync(
  join(runDir, "slide-prompts.json"),
  JSON.stringify({ brand, campaign: c.id, product: c.product, hookStyle, slides }, null, 2)
);

// ---- Caption + hashtags ----------------------------------------------------
const tags = buildHashtags(c);
const caption =
  `${c.hook}\n\n` +
  `${c.problem}. ${c.agitation}.\n\n` +
  `${c.solution} — ${c.solutionSub}. ${c.feature}.\n\n` +
  `${c.cta} 👇  ${SITE}\n\n` +
  tags.join(" ");
writeFileSync(join(runDir, "caption.txt"), caption);

// TikTok/IG title: <= 90 chars including a few hashtags.
let title = c.hook.replace(/\s+/g, " ").trim();
const titleTags = tags.slice(0, 3).join(" ");
if ((title + " " + titleTags).length > 90) {
  title = title.slice(0, 90 - titleTags.length - 2).trim();
}
writeFileSync(join(runDir, "title.txt"), `${title} ${titleTags}`.trim().slice(0, 90));

console.error(`[prompts] campaign=${c.id} (${c.product}) hook="${c.hook}" | rotation=${rotation} | tags: ${tags.join(" ")}`);

// ---- helpers ----------------------------------------------------------------

/**
 * Look up today's entry in the Instagram Curator's 30-day calendar.json.
 * Returns the matching GrubPos campaign on a Brand-pillar day, else null (so the
 * caller falls back to rotation). Path: $CALENDAR_FILE, else the Curator's
 * out/<brand-slug>/calendar.json next to this engine. Missing file = no-op.
 */
function pickFromCalendar() {
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const calPath =
    process.env.CALENDAR_FILE ||
    join(HERE, "..", "instagram-curator", "out", slug, "calendar.json");
  try {
    const cal = JSON.parse(readFileSync(calPath, "utf8"));
    const today = new Date().toISOString().slice(0, 10);
    const entry = (cal.days || []).find((d) => d.date === today);
    if (!entry) return { campaign: null, reason: `no calendar entry for ${today} — rotation` };
    if (entry.campaignId) {
      const match = CAMPAIGNS.find((x) => x.id === entry.campaignId);
      if (match) return { campaign: match, reason: `calendar Brand day ${today} → ${match.product}` };
    }
    return { campaign: null, reason: `calendar ${entry.pillar} day ${today} (no Brand campaign) — rotation` };
  } catch {
    return { campaign: null, reason: "no Curator calendar — rotation" };
  }
}

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

function buildHashtags(campaign) {
  const base = ["#fyp", "#foryou", "#restaurant", "#hospitality", "#restaurantlife"];
  return [...new Set([...base, campaign.tag, "#grubpos"])].slice(0, 8);
}
