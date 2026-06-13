/**
 * brand.js — shared brand knowledge + small pure helpers for the Instagram
 * Curator toolkit. Mirrors the curated GrubPos data used by the carousel engine
 * (build-prompts.js) so aesthetic, calendar, hashtag, and highlights output all
 * stay on-message and consistent.
 *
 * Everything here is deterministic — no API keys required. The scraped
 * analysis.json is used only for the VISUAL identity (palette, fonts, mood);
 * brand voice, product names, and claims are curated and accurate.
 */

export const BRAND = {
  name: process.env.BRAND_NAME || "GrubPos",
  site: "grubpos.com",
  handle: "@grubpos",
  niche: "restaurant-tech",
  // Voice, for caption skeletons + aesthetic guide.
  voice: {
    persona: "The operator's ally — talks like a restaurateur who's worked a Friday-night rush.",
    tone: ["confident", "plain-spoken", "warm", "no-jargon", "outcome-first"],
    do: [
      "Lead with the operator's pain (lost orders, thin margin, queue out the door)",
      "Use real restaurant/kitchen language (covers, pass, dockets, turn the table)",
      "One idea per post; one clear CTA",
      "Numbers over adjectives (commission %, time saved, covers turned)",
    ],
    dont: [
      "Corporate filler ('synergy', 'solutions', 'leverage')",
      "Hashtag walls in the caption body",
      "More than one CTA",
      "Tech specs the floor staff would never read",
    ],
  },
};

// GrubPos product campaigns — the same six used by the carousel engine. Each is
// one product angle the Curator can build a content pillar around.
export const CAMPAIGNS = [
  {
    id: "platform",
    product: "GrubPos",
    angle: "One system for the whole operation",
    hook: "Running 5 systems to run one restaurant?",
    benefit: "Every order — dine-in, takeaway, delivery — in one place",
    cta: "Book a free demo",
    tag: "#epos",
  },
  {
    id: "digital-ordering",
    product: "GrubPos Digital Ordering",
    angle: "Commission-free online ordering",
    hook: "Marketplaces are eating your profit",
    benefit: "Keep 100% of every order — no 14–35% commission",
    cta: "Stop paying commission",
    tag: "#commissionfree",
  },
  {
    id: "kds",
    product: "GrubPos KDS",
    angle: "Kitchen display, no paper tickets",
    hook: "Paper tickets are slowing your kitchen",
    benefit: "Orders routed to the right station, nothing lost at the pass",
    cta: "Upgrade your kitchen",
    tag: "#kitchen",
  },
  {
    id: "kiosk",
    product: "GrubKiosk",
    angle: "Self-ordering that upsells",
    hook: "Your counter queue is costing you sales",
    benefit: "Bigger baskets, shorter queues — self-service that upsells",
    cta: "Add self-ordering kiosks",
    tag: "#selfordering",
  },
  {
    id: "epos",
    product: "GrubPos EPOS",
    angle: "One fast, reliable till",
    hook: "Your till shouldn't slow your team down",
    benefit: "Dine-in, takeaway & delivery on one fast till",
    cta: "See GrubPos EPOS",
    tag: "#epos",
  },
  {
    id: "websites",
    product: "GrubPos Websites",
    angle: "Own your customers, not the apps",
    hook: "You don't own your customers — apps do",
    benefit: "A branded site: your customers, your data, commission-free",
    cta: "Claim your restaurant site",
    tag: "#restaurantmarketing",
  },
];

// Hashtag pools, tiered by reach (Curator hashtag strategy = popular + niche +
// branded + location, per the agent spec).
export const HASHTAGS = {
  // Big-reach discovery tags (high volume, high competition).
  broad: ["#fyp", "#foryou", "#smallbusiness", "#entrepreneur", "#foodie"],
  // Niche, restaurant-operator intent (medium volume, qualified).
  niche: [
    "#restaurant",
    "#hospitality",
    "#restaurantlife",
    "#restaurantowner",
    "#foodbusiness",
    "#restaurantmanagement",
    "#cheflife",
    "#takeaway",
    "#qsr",
    "#epos",
    "#pos",
    "#kitchenlife",
  ],
  // Branded — own these.
  branded: ["#grubpos", "#grubkiosk", "#runyourrestaurant"],
  // Location — swap for the operator's actual city when known.
  location: ["#ukrestaurants", "#londonrestaurants", "#restaurantuk"],
};

// Educational content bank (1/3 of the mix). Operator how-to / insight angles.
export const EDUCATIONAL = [
  { theme: "Cut delivery commission", hook: "The hidden 30% tax on every delivery order", takeaway: "How direct ordering claws margin back" },
  { theme: "Speed up the pass", hook: "Why your kitchen falls behind at 8pm (and the fix)", takeaway: "Routing tickets by station, not by shout" },
  { theme: "Turn tables faster", hook: "3 things slowing your table turns tonight", takeaway: "Where seconds leak at the till" },
  { theme: "Upsell on autopilot", hook: "The upsell your staff forgets every shift", takeaway: "Letting the kiosk ask 'make it a meal?'" },
  { theme: "Own your customer list", hook: "Apps know your regulars better than you do", takeaway: "Why a branded site = repeat marketing" },
  { theme: "Reconciliation at midnight", hook: "If you're tallying tills by hand, read this", takeaway: "One report instead of five systems" },
  { theme: "Peak-time prep", hook: "The Friday rush starts losing money at 7:55", takeaway: "Prepping the system before the door opens" },
  { theme: "Menu engineering", hook: "Your best-margin dish is probably hidden", takeaway: "Putting the profit-makers where eyes land" },
  { theme: "Refunds & bad reviews", hook: "Every lost docket is a refund AND a 1-star", takeaway: "Killing the paper-ticket failure point" },
  { theme: "Staff onboarding", hook: "New starter, busy shift, clunky till = chaos", takeaway: "A till floor staff learn in one shift" },
];

// Community content bank (1/3 of the mix). UGC / proof / engagement angles.
export const COMMUNITY = [
  { theme: "Customer spotlight", hook: "Meet a kitchen that ditched paper tickets", takeaway: "Real operator, real result", ugc: true },
  { theme: "Behind the pass", hook: "A Friday-night rush, start to finish", takeaway: "Show the system under real pressure" },
  { theme: "Poll: biggest headache", hook: "What's killing your margin? Vote 👇", takeaway: "Story poll: commission / staffing / waste", story: true },
  { theme: "Before / after", hook: "5 systems → 1. Here's the receipt.", takeaway: "Operator's setup before and after" },
  { theme: "Ask-me-anything", hook: "Bring your worst POS horror story", takeaway: "Story Q&A sticker, reply in-feed", story: true },
  { theme: "Team shoutout", hook: "The unsung hero of every service: the KDS", takeaway: "Celebrate the kitchen, tag the crew" },
  { theme: "Milestone", hook: "Thousands of restaurants, zero commission", takeaway: "Community proof, round-number flex" },
  { theme: "User tip repost", hook: "An operator's hack we had to share", takeaway: "Repost UGC, credit the creator", ugc: true },
];

/** Convert a CSS color (rgb/rgba/hex/name) to an uppercase #RRGGBB hex. */
export function toHex(color) {
  if (!color) return null;
  const s = String(color).trim();
  if (/^#([0-9a-f]{6})$/i.test(s)) return s.toUpperCase();
  if (/^#([0-9a-f]{3})$/i.test(s)) {
    const [r, g, b] = s.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const hex = m
      .slice(1, 4)
      .map((n) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`.toUpperCase();
  }
  return null; // named colors etc. — leave for the human to fill in
}

function rgb(hex) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** Rough luminance so we can label a color light/dark for the aesthetic guide. */
export function lightness(hex) {
  const c = rgb(hex);
  if (!c) return null;
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; // 0..1
}

/** Chroma (max-min, 0..1) — a cheap saturation proxy for picking the accent. */
export function saturation(hex) {
  const c = rgb(hex);
  if (!c) return null;
  return (Math.max(...c) - Math.min(...c)) / 255;
}

/** Name a font role from a CSS font-family stack. */
export function describeFont(stack) {
  const s = (stack || "").toLowerCase();
  if (/mono|consol|courier/.test(s)) return "monospace";
  if (/serif/.test(s) && !/sans/.test(s)) return "serif";
  return "sans-serif";
}

/** First family name out of a CSS stack, quotes stripped. */
export function primaryFont(stack) {
  if (!stack) return null;
  return String(stack).split(",")[0].replace(/['"]/g, "").trim() || null;
}
