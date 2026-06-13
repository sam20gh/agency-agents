#!/usr/bin/env node
/**
 * analyze-web.js — Phase 2 of the Carousel Growth Engine.
 *
 * Full Playwright (Chromium) analysis of a target website. Visits the landing
 * page plus internal pages (pricing, features, about, testimonials), extracts
 * brand identity, content, competitors, classifies the business niche, and
 * derives niche-specific hooks and pain points. Writes analysis.json.
 *
 * Usage:
 *   node analyze-web.js <url> [output.json]
 *
 * Requires: `npm install` then `npx playwright install chromium`.
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const TARGET = process.argv[2];
const OUTPUT = process.argv[3] || "analysis.json";

if (!TARGET) {
  console.error("Usage: node analyze-web.js <url> [output.json]");
  process.exit(1);
}

// ---- Static knowledge bases ------------------------------------------------

const KNOWN_COMPETITORS = [
  // Productivity / SaaS
  "Notion", "Asana", "Trello", "ClickUp", "Jira", "Linear",
  "Slack", "Zoom", "Figma", "Canva", "Webflow", "Framer",
  "Shopify", "Squarespace", "Wix", "WordPress", "Stripe", "PayPal",
  "Salesforce", "HubSpot", "Mailchimp", "Klaviyo", "Intercom", "Zendesk",
  "Airtable", "Zapier", "Retool", "Vercel", "Netlify",
  "Dropbox", "Calendly", "Loom",
  // Restaurant / retail POS (multi-word names matched first for precision)
  "Epos Now", "Square", "Toast", "Lightspeed", "Clover", "TouchBistro",
  "Revel", "Zettle", "SumUp", "Deliveroo", "Uber Eats", "Just Eat",
];

// Single-word brand names that are also common English words — only counted as
// competitors when they appear as a clear product reference, to avoid matching
// ordinary prose like "Make your operation smoother" or "Square footage".
const AMBIGUOUS_COMPETITORS = {
  Square: /\bSquare\b(?!\s*(footage|foot|metre|meter|feet))/i,
};

const NICHE_RULES = [
  {
    niche: "restaurant-tech",
    keywords: [
      "restaurant", "pos", "epos", "kitchen", "menu", "dine-in", "dine in",
      "takeaway", "takeout", "delivery", "kds", "waitstaff", "table", "order",
      "hospitality", "cafe", "bar", "food", "till", "checkout", "diner",
    ],
    painPoints: [
      "Orders get lost between the floor and the kitchen",
      "Your staff is juggling 3 tablets just to take one order",
      "Every missed order is money walking out the door",
      "Delivery, dine-in, and takeaway never talk to each other",
    ],
    hooks: [
      "This is why your kitchen keeps falling behind",
      "Restaurants are quietly switching to this",
      "The £12/week fix for restaurant chaos",
    ],
  },
  {
    niche: "saas",
    keywords: ["dashboard", "subscription", "workflow", "integration", "api", "platform", "automation", "saas", "per seat", "per user", "free trial"],
    painPoints: [
      "Your team is drowning in disconnected tools",
      "You're paying for software nobody actually uses",
      "Manual work is eating hours you don't have",
      "Switching between 10 tabs is killing your focus",
    ],
    hooks: [
      "Stop wasting 6 hours a week on this",
      "The tool your competitors don't want you to find",
      "Why your current workflow is secretly broken",
    ],
  },
  {
    niche: "ecommerce",
    keywords: ["cart", "checkout", "shipping", "product", "store", "buy now", "add to cart", "free shipping", "shop", "collection"],
    painPoints: [
      "Abandoned carts are draining your revenue",
      "Customers leave because checkout is too slow",
      "You're losing sales to faster competitors",
      "Your best products are invisible to buyers",
    ],
    hooks: [
      "This sold out in 48 hours",
      "Why customers keep coming back for this",
      "The product everyone's adding to cart",
    ],
  },
  {
    niche: "app",
    keywords: ["download", "app store", "google play", "ios", "android", "mobile app", "get the app", "install"],
    painPoints: [
      "You keep forgetting to track the things that matter",
      "Every other app makes this way too complicated",
      "Your phone is full of apps you never open",
      "You've tried everything and nothing sticks",
    ],
    hooks: [
      "The app that actually changed my routine",
      "I deleted 5 apps after finding this one",
      "Download this before everyone else does",
    ],
  },
  {
    niche: "developer-tools",
    keywords: ["sdk", "cli", "github", "open source", "npm", "deploy", "code", "developer", "documentation", "terminal", "framework"],
    painPoints: [
      "You're shipping slower than you should be",
      "Debugging in production is stealing your weekends",
      "Boilerplate is killing your momentum",
      "Your stack is held together with duct tape",
    ],
    hooks: [
      "Ship in minutes, not weeks",
      "The dev tool that paid for itself day one",
      "Why senior engineers swear by this",
    ],
  },
  {
    niche: "health",
    keywords: ["wellness", "fitness", "nutrition", "health", "workout", "sleep", "mental", "therapy", "supplement", "doctor"],
    painPoints: [
      "You know what to do — you just can't stay consistent",
      "Generic advice never works for your body",
      "You're tired of feeling tired",
      "Quick fixes always fail you",
    ],
    hooks: [
      "What no one tells you about staying consistent",
      "The 5-minute habit that changed everything",
      "Doctors wish you knew this sooner",
    ],
  },
  {
    niche: "education",
    keywords: ["course", "learn", "lesson", "student", "curriculum", "certificate", "tutorial", "training", "bootcamp", "academy"],
    painPoints: [
      "You start courses but never finish them",
      "Theory without practice gets you nowhere",
      "You're learning the wrong things first",
      "Generic courses don't fit how you learn",
    ],
    hooks: [
      "Learn this in a weekend, not a year",
      "The skill that doubled my income",
      "Why most courses fail you (and this doesn't)",
    ],
  },
  {
    niche: "design",
    keywords: ["design", "template", "ui", "ux", "creative", "portfolio", "brand", "typography", "figma", "mockup"],
    painPoints: [
      "Your designs look generic and you know it",
      "You waste hours on the same repetitive work",
      "Clients keep asking for endless revisions",
      "Blank canvas paralysis strikes every time",
    ],
    hooks: [
      "Make it look expensive in 5 minutes",
      "The design trick agencies charge $5k for",
      "Why your designs look 'AI-generated'",
    ],
  },
];

const GENERIC_NICHE = {
  niche: "general",
  painPoints: [
    "You're spending too much time on the wrong things",
    "The old way of doing this is broken",
    "Your competitors already figured this out",
    "Small problems are quietly costing you big",
  ],
  hooks: [
    "Everyone's switching to this",
    "The thing you didn't know you needed",
    "Why this changes everything",
  ],
};

// ---- Helpers ---------------------------------------------------------------

function absolutize(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function classifyNiche(text) {
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const rule of NICHE_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return bestScore >= 2 ? best : GENERIC_NICHE;
}

function detectCompetitors(text, selfBrand = "") {
  const found = new Set();
  const self = selfBrand.toLowerCase();
  for (const c of KNOWN_COMPETITORS) {
    if (AMBIGUOUS_COMPETITORS[c]) continue; // handled separately
    const re = new RegExp(`\\b${c.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (re.test(text) && c.toLowerCase() !== self) found.add(c);
  }
  for (const [c, re] of Object.entries(AMBIGUOUS_COMPETITORS)) {
    if (re.test(text) && c.toLowerCase() !== self) found.add(c);
  }
  return [...found];
}

/** Extract everything we can from the currently loaded page, in browser context. */
async function extractPage(page) {
  return page.evaluate(() => {
    const txt = (el) => (el?.textContent || "").trim().replace(/\s+/g, " ");

    // Colors: tally background/text colors of prominent elements.
    const colorCount = {};
    const bump = (c) => {
      if (!c || c === "rgba(0, 0, 0, 0)" || c === "transparent") return;
      colorCount[c] = (colorCount[c] || 0) + 1;
    };
    const sampleSel = "header, nav, button, a.button, .btn, h1, h2, [class*='cta'], [class*='hero']";
    document.querySelectorAll(sampleSel).forEach((el) => {
      const s = getComputedStyle(el);
      bump(s.backgroundColor);
      bump(s.color);
    });
    bump(getComputedStyle(document.body).backgroundColor);
    const colors = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([c]) => c);

    // Typography
    const bodyFont = getComputedStyle(document.body).fontFamily;
    const h1El = document.querySelector("h1");
    const headingFont = h1El ? getComputedStyle(h1El).fontFamily : bodyFont;

    // Brand assets
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.content;
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    const favicon =
      document.querySelector('link[rel~="icon"]')?.href ||
      document.querySelector('link[rel="shortcut icon"]')?.href;
    const logoImg =
      document.querySelector('img[class*="logo" i], img[alt*="logo" i], header img')?.src;

    // Content
    const headline = txt(document.querySelector("h1"));
    const metaDesc = document.querySelector('meta[name="description"]')?.content || "";
    const tagline = txt(document.querySelector("h1 + p, h2")) || metaDesc;

    const features = [...document.querySelectorAll("h2, h3, li")]
      .map(txt)
      .filter((t) => t.length > 8 && t.length < 120)
      .slice(0, 25);

    const ctas = [...document.querySelectorAll("button, a.button, .btn, [class*='cta'] a, a[class*='cta']")]
      .map(txt)
      .filter((t) => t.length > 1 && t.length < 40)
      .slice(0, 15);

    const testimonials = [...document.querySelectorAll("blockquote, [class*='testimonial'], [class*='quote'], [class*='review']")]
      .map(txt)
      .filter((t) => t.length > 30 && t.length < 400)
      .slice(0, 10);

    // Stats: tokens like "10k", "99%", "$2M", "3x"
    const bodyText = document.body.innerText || "";
    const stats = [...bodyText.matchAll(/(\$?\d[\d,.]*\s?(?:%|k|K|M|m|x|X|\+|million|billion)?)/g)]
      .map((m) => m[0].trim())
      .filter((s) => /[%kKMmxX+]|million|billion|\$/.test(s) && s.length <= 12)
      .slice(0, 12);

    // Pricing snippets
    const pricing = [...document.querySelectorAll("[class*='pric' i], [class*='plan' i]")]
      .map(txt)
      .filter((t) => /\$|\d|free|month|year|plan/i.test(t) && t.length < 160)
      .slice(0, 10);

    // Internal links of interest
    const links = [...document.querySelectorAll("a[href]")].map((a) => ({
      href: a.getAttribute("href"),
      text: (a.textContent || "").trim().toLowerCase(),
    }));

    return {
      colors,
      typography: { body: bodyFont, heading: headingFont },
      brandNameGuess: ogSite || document.title,
      ogImage,
      favicon,
      logo: logoImg,
      headline,
      tagline,
      metaDesc,
      features,
      ctas,
      testimonials,
      stats,
      pricing,
      links,
      title: document.title,
      bodyText: bodyText.slice(0, 20000),
    };
  });
}

// ---- Main ------------------------------------------------------------------

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    ignoreHTTPSErrors: true, // some target sites have self-signed / misconfigured certs
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.error(`[analyze] Loading ${TARGET} ...`);
  await page.goto(TARGET, { waitUntil: "networkidle", timeout: 45000 }).catch(async () => {
    await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 45000 });
  });
  await page.waitForTimeout(1500);

  const home = await extractPage(page);

  // Find internal pages of interest.
  const wanted = ["pricing", "feature", "about", "testimonial", "customer", "product"];
  const seen = new Set();
  const internalTargets = [];
  for (const l of home.links) {
    const abs = absolutize(l.href, TARGET);
    if (!abs) continue;
    if (!abs.startsWith(new URL(TARGET).origin)) continue;
    const hay = `${l.href} ${l.text}`.toLowerCase();
    if (wanted.some((w) => hay.includes(w)) && !seen.has(abs)) {
      seen.add(abs);
      internalTargets.push(abs);
    }
    if (internalTargets.length >= 4) break;
  }

  const internalPages = [];
  for (const url of internalTargets) {
    try {
      console.error(`[analyze] Visiting internal page ${url} ...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(800);
      const data = await extractPage(page);
      internalPages.push({ url, headline: data.headline, features: data.features, pricing: data.pricing, testimonials: data.testimonials, stats: data.stats });
    } catch (e) {
      console.error(`[analyze] Skipped ${url}: ${e.message}`);
    }
  }

  await browser.close();

  // Aggregate text for classification + competitor detection.
  const allText = [
    home.bodyText,
    ...internalPages.map((p) => `${p.headline} ${(p.features || []).join(" ")}`),
  ].join(" ");

  const brandNameEarly = (home.brandNameGuess || "").split(/[|\-—·]/)[0].trim();
  const niche = classifyNiche(allText);
  const competitors = detectCompetitors(allText, brandNameEarly);

  // Merge content from internal pages.
  const mergedFeatures = [...new Set([...home.features, ...internalPages.flatMap((p) => p.features || [])])].slice(0, 20);
  const mergedPricing = [...new Set([...home.pricing, ...internalPages.flatMap((p) => p.pricing || [])])].slice(0, 10);
  const mergedTestimonials = [...new Set([...home.testimonials, ...internalPages.flatMap((p) => p.testimonials || [])])].slice(0, 8);
  const mergedStats = [...new Set([...home.stats, ...internalPages.flatMap((p) => p.stats || [])])].slice(0, 10);

  const brandName = (home.brandNameGuess || "").split(/[|\-—·]/)[0].trim() || new URL(TARGET).hostname;

  const analysis = {
    url: TARGET,
    scrapedAt: new Date().toISOString(),
    brand: {
      name: brandName,
      logo: home.logo || home.ogImage || null,
      favicon: home.favicon || null,
      colors: home.colors,
      typography: home.typography,
    },
    content: {
      headline: home.headline,
      tagline: home.tagline,
      metaDescription: home.metaDesc,
      features: mergedFeatures,
      pricing: mergedPricing,
      testimonials: mergedTestimonials,
      stats: mergedStats,
      ctas: home.ctas,
    },
    internalPages: internalPages.map((p) => p.url),
    businessType: niche.niche,
    competitors,
    hooks: niche.hooks,
    painPoints: niche.painPoints,
    visualContext: {
      palette: home.colors,
      fonts: home.typography,
      mood: deriveMood(niche.niche),
      logo: home.logo || home.ogImage || null,
    },
  };

  writeFileSync(OUTPUT, JSON.stringify(analysis, null, 2));
  console.error(`[analyze] Wrote ${OUTPUT}`);
  console.error(`[analyze] Brand: ${brandName} | Niche: ${niche.niche} | Competitors: ${competitors.join(", ") || "none"}`);
}

function deriveMood(niche) {
  const map = {
    "restaurant-tech": "warm appetizing food-tech, busy kitchen energy, confident bold sans-serif, navy and bright accent, real restaurant context",
    saas: "clean modern tech, confident, bold sans-serif, gradient accents",
    ecommerce: "vibrant lifestyle, aspirational, product-forward, warm",
    app: "playful minimal, friendly, rounded, bright accent color",
    "developer-tools": "dark mode terminal aesthetic, sharp, monospace accents, neon highlights",
    health: "calm wellness, soft gradients, natural tones, airy",
    education: "approachable academic, clear hierarchy, motivating, fresh",
    design: "editorial premium, high-contrast typography, generous whitespace",
    general: "modern professional, high-contrast, bold typography, premium",
  };
  return map[niche] || map.general;
}

main().catch((e) => {
  console.error("[analyze] FATAL:", e);
  process.exit(1);
});
