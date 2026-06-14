/**
 * brand.js — shared Gulfio brand knowledge + small pure helpers for the news
 * carousel engine. Gulfio is an informative Gulf & MENA news app: trending
 * regional news, football fixtures/results, and weather. Every carousel's job
 * is to deliver one genuinely useful, accurate slice of "what's happening in
 * the Gulf right now" and convert the scroller into an app download.
 *
 * Unlike the carousel engine's website scrape, Gulfio's COPY comes from a live
 * article pulled from https://api.gulfio.app/api/articles. This file supplies
 * the VISUAL identity (palette, mood, fonts), the brand voice, the per-category
 * narrative arcs, the app-download CTAs, and the hashtag pools — all curated and
 * deterministic so the brand stays consistent and on-message every single day.
 */

export const BRAND = {
  name: process.env.BRAND_NAME || "Gulfio",
  app: "Gulfio",
  site: "gulfio.app",
  handle: "@gulfio.app",
  niche: "Gulf & MENA news app",
  tagline: "Gulf & MENA news, weather & football — in one app.",
  // The whole point of every post: drive an app download.
  appCtas: [
    "Download Gulfio for the full story",
    "Get the Gulfio app",
    "Read it first on Gulfio",
    "Live updates on the Gulfio app",
    "Tap the link in bio — get Gulfio",
  ],
  voice: {
    persona: "A trusted regional newsroom that talks like a sharp friend who already read everything — fast, factual, never breathless.",
    tone: ["informative", "credible", "concise", "regional", "neutral-but-engaging"],
    do: [
      "Lead with the fact, not the opinion — Gulfio's edge is being accurate and first",
      "Localise: name the Gulf/MENA country, city, club, or league it affects",
      "One story per post; one clear 'download the app' close",
      "Numbers and specifics over adjectives (scores, temperatures, dates, figures)",
      "Respect the region — culturally aware, apolitical framing on sensitive topics",
    ],
    dont: [
      "Clickbait that the article can't back up (erodes a news brand instantly)",
      "Editorialising or taking political sides",
      "Hashtag walls in the caption body",
      "More than one CTA",
      "Publishing a claim that isn't in the source article",
    ],
  },
};

// ---- Content pillars / categories ------------------------------------------
// Gulfio's daily mix. Each pillar maps to a category the API can be filtered by
// and to a tailored 6-slide narrative arc (see ARCS below). The curator's
// calendar rotates these so the feed stays varied; the engine fetches a live
// article of the planned category each day.
export const PILLARS = ["News", "Football", "Weather", "AppValue"];

// Map a pillar to the API category keywords we accept for it (loose match,
// case-insensitive). The fetcher uses these to pick the right live article.
export const CATEGORY_MATCH = {
  News: ["news", "breaking", "politics", "business", "world", "gulf", "mena", "uae", "saudi", "qatar", "economy", "tech", "lifestyle"],
  Football: ["football", "soccer", "sport", "sports", "match", "fixture", "league", "result"],
  Weather: ["weather", "forecast", "heat", "storm", "rain", "temperature", "climate"],
  // AppValue isn't fetched from articles — it's a curated "why Gulfio" promo.
  AppValue: [],
};

// ---- Per-category 6-slide narrative arcs ------------------------------------
// Each arc names the role of slides 1..5 (slide 6 is always the app-download
// CTA). build-prompts.js fills these roles from the live article fields.
export const ARCS = {
  News: ["Headline", "What happened", "Key detail", "Why it matters", "The bigger picture", "CTA"],
  Football: ["The result/fixture", "The match", "Key stat", "Standout moment", "What's next", "CTA"],
  Weather: ["The alert", "Where & when", "The numbers", "What it means", "The outlook", "CTA"],
  AppValue: ["Hook", "The problem", "What Gulfio gives you", "Key feature", "Why thousands trust it", "CTA"],
};

// ---- Curated "Why Gulfio" promos (the AppValue pillar) ----------------------
// Used on AppValue days and as a fallback when no fresh article is available.
export const APP_PROMOS = [
  {
    id: "all-in-one",
    hook: "Five apps to follow the Gulf?",
    problem: "News here, scores there, weather somewhere else",
    solution: "Gulfio puts it in one place",
    feature: "Gulf & MENA news, football & weather — one feed",
    proof: "Built for the region, updated all day",
    cta: "Download Gulfio",
  },
  {
    id: "football",
    hook: "Never miss a kick-off again",
    problem: "Fixtures, results and tables scattered everywhere",
    solution: "Gulfio tracks it for you",
    feature: "Live scores, fixtures & league tables in your pocket",
    proof: "Gulf leagues + the world's biggest competitions",
    cta: "Get Gulfio for live football",
  },
  {
    id: "weather",
    hook: "How hot will it get tomorrow?",
    problem: "Generic weather apps don't know the Gulf",
    solution: "Gulfio does",
    feature: "City-by-city Gulf forecasts & heat alerts",
    proof: "From Dubai to Riyadh to Doha",
    cta: "Check the weather on Gulfio",
  },
  {
    id: "trusted",
    hook: "Know what's happening in the Gulf — first",
    problem: "Endless feeds, slow updates, no local focus",
    solution: "Gulfio is built for the region",
    feature: "Trending Gulf & MENA stories, updated all day",
    proof: "One trusted app for the whole region",
    cta: "Download Gulfio today",
  },
];

// ---- Hashtag pools, tiered by reach ----------------------------------------
export const HASHTAGS = {
  // Big-reach discovery tags.
  broad: ["#news", "#breakingnews", "#middleeast", "#fyp", "#trending"],
  // Regional / niche — qualified, on-brand reach.
  region: [
    "#gulf",
    "#mena",
    "#uae",
    "#dubai",
    "#abudhabi",
    "#saudiarabia",
    "#riyadh",
    "#qatar",
    "#doha",
    "#kuwait",
    "#bahrain",
    "#oman",
    "#gulfnews",
    "#middleeastnews",
  ],
  football: ["#football", "#soccer", "#aclelite", "#saudiproleague", "#adnocproleague", "#worldcup", "#livescores"],
  weather: ["#weather", "#weatherforecast", "#heatwave", "#gulfweather"],
  branded: ["#gulfio", "#gulfioapp"],
};

// ---- Visual identity (curated; no website scrape) ---------------------------
// Premium regional-newsroom look: deep Gulf navy, a confident gold accent, warm
// sand surface. Subtle Arabian geometric motifs, clean bold sans typography,
// real Gulf/MENA imagery (skylines, stadiums, desert, weather).
export const VISUAL = {
  palette: ["#0B1E3B", "#E0B341", "#0E7C7B", "#F4F1EA"], // navy, gold, petrol-teal, sand
  ink: "#0B1E3B",
  accent: "#E0B341",
  support: "#0E7C7B",
  surface: "#F4F1EA",
  fonts: "bold modern editorial sans-serif typography",
  moodByCategory: {
    News: "authoritative regional-newsroom editorial; deep Gulf navy with a confident gold accent, subtle Arabian geometric motif, real Gulf/MENA context",
    Football: "high-energy sports editorial; floodlit stadium atmosphere, deep navy and gold, bold scoreboard-style typography, Gulf/Middle East football context",
    Weather: "clean meteorological editorial; Gulf skyline under dramatic sky, navy and gold with warm desert-heat tones, crisp data-forward layout",
    AppValue: "premium app-brand promo; confident navy and gold, sleek modern phone-free poster, trustworthy and aspirational regional tone",
  },
};

// ---- helpers ----------------------------------------------------------------

/** Classify a free-text category/section string into one of our PILLARS. */
export function pillarForCategory(category) {
  const s = String(category || "").toLowerCase();
  for (const pillar of ["Football", "Weather"]) {
    if (CATEGORY_MATCH[pillar].some((k) => s.includes(k))) return pillar;
  }
  // Default everything else to News (the broadest pillar).
  return "News";
}

/** Hook-style classifier (mirrors the carousel engine for shared analytics). */
export function classifyHookStyle(h) {
  const t = String(h || "").trim();
  if (/\?$/.test(t)) return "question";
  if (/^(stop|don'?t|never|why|how|breaking|just in)/i.test(t)) return "command-or-curiosity";
  if (/\d/.test(t)) return "stat-claim";
  return "bold-claim";
}

/** Truncate to ≤ n chars on a WORD boundary (no mid-word cuts), with ellipsis. */
export function truncate(s, n) {
  const str = String(s || "").replace(/\s+/g, " ").trim();
  if (str.length <= n) return str;
  const cut = str.slice(0, n - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > Math.floor(n * 0.5) ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[\s,;:.!–—-]+$/, "") + "…";
}

/** Pick a rotating item from an array by an integer counter. */
export function rotate(arr, i) {
  return arr[((i % arr.length) + arr.length) % arr.length];
}
