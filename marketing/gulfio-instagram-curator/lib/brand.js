/**
 * brand.js — shared Gulfio brand knowledge + pure helpers for the Instagram
 * Curator toolkit. Mirrors the curated Gulfio identity used by the news engine
 * (gulfio-news-engine) so aesthetic, calendar, hashtag, and highlights output
 * all stay on-message and consistent.
 *
 * Gulfio is an informative Gulf & MENA news app (trending news, football,
 * weather). Everything here is deterministic — no API keys required. The whole
 * strategy points at one outcome: turn a scroller into an app download.
 */

export const BRAND = {
  name: process.env.BRAND_NAME || "Gulfio",
  site: "gulfio.app",
  handle: "@gulfio.app",
  niche: "Gulf & MENA news app",
  tagline: "Gulf & MENA news, weather & football — in one app.",
  voice: {
    persona: "A trusted regional newsroom that talks like a sharp friend who already read everything — fast, factual, never breathless.",
    tone: ["informative", "credible", "concise", "regional", "neutral-but-engaging"],
    do: [
      "Lead with the fact, not the opinion — accuracy is the brand",
      "Localise: name the Gulf/MENA country, city, club, or league it affects",
      "One story per post; one clear 'download the app' close",
      "Numbers and specifics over adjectives (scores, temperatures, dates)",
      "Culturally aware, apolitical framing on sensitive topics",
    ],
    dont: [
      "Clickbait the article can't back up",
      "Editorialising or taking political sides",
      "Hashtag walls in the caption body",
      "More than one CTA",
      "Posting a claim that isn't in the source",
    ],
  },
};

// ---- Content pillars (the calendar rotates these) ---------------------------
// Pillar names MUST match the news engine's PILLARS so pick-category.js can read
// today's planned pillar straight off the calendar.
export const PILLARS = ["News", "Football", "Weather", "AppValue"];

// Per-pillar content banks: example angles the calendar slots in. The live copy
// each day comes from the API article; these are the *editorial themes*.
export const NEWS = [
  { theme: "Top Gulf story", hook: "The Gulf story everyone's talking about today", takeaway: "Trending now across the region" },
  { theme: "MENA business", hook: "The deal reshaping the regional economy", takeaway: "Business & markets, explained fast" },
  { theme: "Region in numbers", hook: "Today's headline number from the Gulf", takeaway: "One stat, the full context" },
  { theme: "World ↔ Gulf", hook: "What today's world news means for the Gulf", takeaway: "Global story, regional angle" },
  { theme: "Tech & innovation", hook: "The tech move putting the Gulf on the map", takeaway: "Innovation across the GCC" },
  { theme: "Lifestyle & culture", hook: "What's opening, launching and trending near you", takeaway: "Culture & lifestyle in the region" },
];

export const FOOTBALL = [
  { theme: "Matchday preview", hook: "Tonight's fixtures you can't miss", takeaway: "Kick-off times, team news, predictions" },
  { theme: "Results & reactions", hook: "Full-time: here's what just happened", takeaway: "Scores, key moments, what's next" },
  { theme: "League table", hook: "The table after this weekend", takeaway: "Who's up, who's chasing, who's in trouble" },
  { theme: "Transfer watch", hook: "The transfer the region is buzzing about", takeaway: "Done deals & the latest links" },
  { theme: "Player spotlight", hook: "The player carrying the league right now", takeaway: "Form, stats, the story behind it" },
];

export const WEATHER = [
  { theme: "Daily forecast", hook: "Your Gulf weather check for today", takeaway: "City-by-city, at a glance" },
  { theme: "Heat alert", hook: "How hot it's getting this week", takeaway: "Temperatures, timing, advice" },
  { theme: "Storm / rain watch", hook: "Rain & wind on the way — when and where", takeaway: "What to expect, where it hits" },
  { theme: "Weekend outlook", hook: "Your weekend weather, sorted", takeaway: "Plan around the forecast" },
];

// AppValue — rotating "Why Gulfio" promos (kept in sync with the news engine).
export const APP_PROMOS = [
  { id: "all-in-one", product: "Gulfio", angle: "One app for the whole Gulf", hook: "Five apps to follow the Gulf?", benefit: "News, football & weather in one feed", cta: "Download Gulfio" },
  { id: "football", product: "Gulfio Football", angle: "Live scores & fixtures", hook: "Never miss a kick-off again", benefit: "Live scores, fixtures & tables in your pocket", cta: "Get Gulfio for live football" },
  { id: "weather", product: "Gulfio Weather", angle: "Gulf-built forecasts", hook: "How hot will it get tomorrow?", benefit: "City-by-city Gulf forecasts & heat alerts", cta: "Check the weather on Gulfio" },
  { id: "trusted", product: "Gulfio", angle: "Trusted regional news", hook: "Know the Gulf — first", benefit: "Trending Gulf & MENA stories, updated all day", cta: "Download Gulfio today" },
];

// ---- Hashtag pools, tiered by reach ----------------------------------------
export const HASHTAGS = {
  broad: ["#news", "#breakingnews", "#middleeast", "#fyp", "#trending"],
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
  football: ["#football", "#soccer", "#saudiproleague", "#adnocproleague", "#aclelite", "#livescores"],
  weather: ["#weather", "#weatherforecast", "#heatwave", "#gulfweather"],
  branded: ["#gulfio", "#gulfioapp"],
  location: ["#dubai", "#riyadh", "#doha", "#abudhabi"],
};

// ---- Visual identity (curated — no website scrape) --------------------------
export const VISUAL = {
  palette: ["#0B1E3B", "#E0B341", "#0E7C7B", "#F4F1EA"], // navy, gold, petrol-teal, sand
  ink: "#0B1E3B",
  accent: "#E0B341",
  support: "#0E7C7B",
  surface: "#F4F1EA",
  headingFamily: "Editorial Grotesk / bold modern sans",
  bodyFamily: "Clean humanist sans",
  mood: "authoritative regional-newsroom editorial — deep Gulf navy with a confident gold accent, subtle Arabian geometric motifs, real Gulf/MENA imagery (skylines, stadiums, desert, weather)",
};

// ---- helpers ----------------------------------------------------------------

export function classifyHookStyle(h) {
  const t = String(h || "").trim();
  if (/\?$/.test(t)) return "question";
  if (/^(stop|don'?t|never|why|how|breaking|just in)/i.test(t)) return "command-or-curiosity";
  if (/\d/.test(t)) return "stat-claim";
  return "bold-claim";
}

export function rotate(arr, i) {
  return arr[((i % arr.length) + arr.length) % arr.length];
}
