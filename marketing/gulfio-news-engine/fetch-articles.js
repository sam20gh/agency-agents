#!/usr/bin/env node
/**
 * fetch-articles.js — Phase 2 of the Gulfio News Engine (replaces the carousel
 * engine's Playwright analyze-web.js). Pulls live articles from the Gulfio API
 * and selects ONE article to turn into today's carousel.
 *
 * Source : GET https://api.gulfio.app/api/articles   (header: x-api-key)
 * Output : <run-dir>/articles.json — the selected article (normalised) plus the
 *          curated brand visual context and the chosen content pillar.
 *
 * Selection logic:
 *   1. Normalise every article to a common shape (defensive about field names).
 *   2. If a CATEGORY is requested (env CATEGORY, e.g. from the curator calendar),
 *      keep only articles whose category maps to that pillar.
 *   3. Rank by "freshness + trending" (newest first, with any trending/views
 *      signal as a tiebreaker) and pick the top one. An OFFSET (env, default 0)
 *      lets consecutive runs avoid repeating the same story.
 *   4. On AppValue days, or when no article matches, fall back to a curated
 *      "Why Gulfio" promo so the daily post never fails.
 *
 * Usage:
 *   node fetch-articles.js <run-dir> [category]
 *
 * Env:
 *   GULFIO_API_KEY      (required for live fetch)
 *   GULFIO_API_URL      (default: https://api.gulfio.app/api/articles)
 *   CATEGORY            (optional: News | Football | Weather | AppValue)
 *   ARTICLE_OFFSET      (optional int, default 0 — skip N top articles)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { BRAND, VISUAL, PILLARS, CATEGORY_MATCH, pillarForCategory } from "./lib/brand.js";

const runDir = process.argv[2];
const requestedCategory = (process.argv[3] || process.env.CATEGORY || "").trim();

if (!runDir) {
  console.error("Usage: node fetch-articles.js <run-dir> [category]");
  process.exit(1);
}
mkdirSync(runDir, { recursive: true });

const API_URL = process.env.GULFIO_API_URL || "https://api.gulfio.app/api/articles";
const API_KEY = process.env.GULFIO_API_KEY || "";
const OFFSET = Math.max(0, parseInt(process.env.ARTICLE_OFFSET || "0", 10) || 0);

// ---- helpers: defensive field extraction -----------------------------------
const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
};

const num = (...vals) => {
  for (const v of vals) {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
};

/** Strip HTML tags + entities so news copy renders cleanly on a slide. */
const stripHtml = (s) =>
  String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Normalise one raw API article into the shape build-prompts.js expects. */
function normalise(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = stripHtml(pick(raw, "title", "headline", "name", "heading"));
  if (!title) return null;
  const body = stripHtml(pick(raw, "content", "body", "text", "article")).slice(0, 2000);
  const summary =
    stripHtml(pick(raw, "summary", "description", "excerpt", "snippet", "subtitle", "standfirst", "deck")) ||
    firstSentences(body, 220);
  const category = pick(raw, "category", "section", "topic", "type", "tag") || "news";
  return {
    id: pick(raw, "_id", "id", "slug", "guid", "url"),
    title,
    summary,
    body,
    category: String(category).trim(),
    pillar: pillarForCategory(category),
    // Gulfio API uses sourceName / sourceGroupName for attribution.
    source: pick(raw, "sourceName", "sourceGroupName", "source", "publisher", "author", "byline"),
    url: pick(raw, "url", "link", "permalink", "canonicalUrl"),
    image: pick(raw, "image", "imageUrl", "thumbnail", "cover", "media", "urlToImage"),
    language: String(pick(raw, "language", "lang") || "").toLowerCase(),
    publishedAt: pick(raw, "publishedAt", "published_at", "date", "pubDate", "createdAt", "timestamp", "updatedAt"),
    // Gulfio API ranks with finalScore/engagementScore; viewCount/likes are signals too.
    trendScore: num(
      pick(raw, "finalScore", "engagementScore", "_score", "score", "trending", "popularity"),
      pick(raw, "viewCount", "views", "reads"),
      pick(raw, "likes")
    ),
  };
}

function firstSentences(text, max) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (lastStop > 60 ? cut.slice(0, lastStop + 1) : cut).trim();
}

/** Pull the article array out of whatever envelope the API returns. */
function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const k of ["articles", "data", "results", "items", "docs", "posts", "response"]) {
    if (Array.isArray(payload?.[k])) return payload[k];
    if (Array.isArray(payload?.[k]?.articles)) return payload[k].articles;
  }
  // single object → wrap it
  if (payload && typeof payload === "object" && (payload.title || payload.headline)) return [payload];
  return [];
}

/** True if the text reads as association football/soccer (not other sports). */
function isFootball(text) {
  return /\b(football|soccer|uefa|fifa|premier league|la ?liga|serie a|bundesliga|ligue ?1|champions league|europa league|pro league|world cup qualif|ballon d'?or|messi|ronaldo|al ?nassr|al ?hilal|al ?ittihad)\b/i.test(
    String(text)
  );
}

function tsOf(a) {
  const t = Date.parse(a.publishedAt || "");
  return Number.isNaN(t) ? 0 : t;
}

function writeOut(selected, sourceNote) {
  const pillar = selected?.pillar || pillarForCategory(requestedCategory) || "News";
  const out = {
    fetchedAt: new Date().toISOString(),
    brand: BRAND.name,
    source: API_URL,
    requestedCategory: requestedCategory || null,
    pillar,
    selected, // null on AppValue days — build-prompts falls back to a promo
    sourceNote,
    visualContext: {
      palette: VISUAL.palette,
      ink: VISUAL.ink,
      accent: VISUAL.accent,
      surface: VISUAL.surface,
      fonts: VISUAL.fonts,
      mood: VISUAL.moodByCategory[pillar] || VISUAL.moodByCategory.News,
    },
  };
  writeFileSync(`${runDir}/articles.json`, JSON.stringify(out, null, 2));
  console.error(
    `[fetch] pillar=${pillar} | ${selected ? `selected: "${selected.title.slice(0, 70)}"` : "no article (promo fallback)"} | ${sourceNote}`
  );
}

// ---- AppValue / no-key / no-article fast paths -----------------------------
function pillarFromRequest() {
  const c = requestedCategory.trim();
  if (PILLARS.includes(c)) return c;
  if (c) return pillarForCategory(c);
  return null;
}

const reqPillar = pillarFromRequest();

if (reqPillar === "AppValue") {
  writeOut(null, "AppValue day — curated 'Why Gulfio' promo");
  process.exit(0);
}

if (!API_KEY) {
  console.error("[fetch] WARNING: GULFIO_API_KEY not set — falling back to a 'Why Gulfio' promo.");
  writeOut(null, "no GULFIO_API_KEY — promo fallback");
  process.exit(0);
}

// ---- Live fetch ------------------------------------------------------------
async function main() {
  let payload;
  try {
    const res = await fetch(API_URL, {
      headers: { "x-api-key": API_KEY, accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[fetch] API HTTP ${res.status} — promo fallback. ${(await res.text()).slice(0, 200)}`);
      return writeOut(null, `API HTTP ${res.status} — promo fallback`);
    }
    payload = await res.json();
  } catch (e) {
    console.error(`[fetch] request failed (${e.message}) — promo fallback.`);
    return writeOut(null, `fetch error: ${e.message} — promo fallback`);
  }

  const all = extractList(payload).map(normalise).filter(Boolean);
  if (!all.length) {
    return writeOut(null, "API returned no usable articles — promo fallback");
  }

  // Filter to the requested pillar (if any), using loose category matching.
  let pool = all;
  if (reqPillar && reqPillar !== "AppValue") {
    const keys = CATEGORY_MATCH[reqPillar] || [];
    let matched = all.filter(
      (a) => a.pillar === reqPillar || keys.some((k) => a.category.toLowerCase().includes(k))
    );

    // Football: prefer ACTUAL football/soccer over other sports (cricket etc.),
    // so a cricket story never ends up tagged FOOTBALL. Only narrows if some exist.
    if (reqPillar === "Football" && matched.length) {
      const footy = matched.filter((a) => isFootball(`${a.title} ${a.category}`));
      if (footy.length) matched = footy;
    }

    if (matched.length) {
      pool = matched;
    } else if (reqPillar === "News") {
      console.error("[fetch] no 'News' match — using newest across all categories.");
    } else {
      // Football/Weather with no relevant article → curated promo (never mislabel).
      return writeOut(null, `no '${reqPillar}' article today — promo fallback`);
    }
  }

  // Soft language preference (default English, for the English IG feed). Only
  // narrows the pool if at least one article matches, so it never empties it.
  const wantLang = (process.env.ARTICLE_LANG || "en").toLowerCase();
  if (wantLang) {
    const langMatched = pool.filter((a) => !a.language || a.language.startsWith(wantLang));
    if (langMatched.length) pool = langMatched;
  }

  // Rank: freshest first, trending as tiebreaker.
  pool.sort((a, b) => tsOf(b) - tsOf(a) || b.trendScore - a.trendScore);

  const chosen = pool[Math.min(OFFSET, pool.length - 1)] || pool[0];
  writeOut(chosen, `live API — ${pool.length} candidate(s)${reqPillar ? ` in ${reqPillar}` : ""}, offset ${OFFSET}`);
}

main();
