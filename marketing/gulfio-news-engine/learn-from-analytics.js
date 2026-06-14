#!/usr/bin/env node
/**
 * learn-from-analytics.js — Phase 1: process analytics into learnings.json.
 *
 * Appends the latest post's performance to a rolling 100-post history, then
 * recomputes aggregate insights: best hooks, best posting times/days, average
 * engagement, winning hook styles, and a recommendation for the next carousel.
 *
 * Usage:
 *   node learn-from-analytics.js <analytics.json> <learnings.json> [slide-prompts.json] [post-info.json]
 *
 * - analytics.json     : output of check-analytics.sh (profile + per-post)
 * - learnings.json     : persistent KB (created if missing)
 * - slide-prompts.json : the creative just published (for hook/style attribution)
 * - post-info.json     : publish metadata (request_id, publishedAt)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const analyticsPath = process.argv[2];
const learningsPath = process.argv[3];
const promptsPath = process.argv[4];
const postInfoPath = process.argv[5];

if (!analyticsPath || !learningsPath) {
  console.error("Usage: node learn-from-analytics.js <analytics.json> <learnings.json> [slide-prompts.json] [post-info.json]");
  process.exit(1);
}

const read = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

const analytics = read(analyticsPath) || {};
const prompts = promptsPath ? read(promptsPath) : null;
const postInfo = postInfoPath ? read(postInfoPath) : null;

const learnings = existsSync(learningsPath)
  ? read(learningsPath) || emptyLearnings()
  : emptyLearnings();

function emptyLearnings() {
  return {
    version: 1,
    updatedAt: null,
    postCount: 0,
    history: [], // rolling, max 100
    bestHooks: [],
    bestTimes: [], // ["18", "20", ...] hours, ranked
    bestDays: [],
    hookStyleStats: {},
    avgEngagementRate: 0,
    recommendations: [],
    profileSnapshot: {},
  };
}

// ---- Extract this post's metrics (defensive against schema variance) -------

function num(...candidates) {
  for (const c of candidates) {
    if (typeof c === "number" && !Number.isNaN(c)) return c;
    if (typeof c === "string" && c.trim() !== "" && !Number.isNaN(Number(c))) return Number(c);
  }
  return 0;
}

const post = analytics.post || {};
const postData = post.data || post.analytics || post;
const views = num(postData.views, postData.view_count, postData.impressions, postData.plays);
const likes = num(postData.likes, postData.like_count);
const comments = num(postData.comments, postData.comment_count);
const shares = num(postData.shares, postData.share_count);
const engagementRate = views > 0 ? (likes + comments + shares) / views : 0;

const publishedAt = postInfo?.publishedAt || analytics.fetchedAt || new Date().toISOString();
const d = new Date(publishedAt);
const hour = String(d.getUTCHours()).padStart(2, "0");
const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];

const hookCopy = prompts?.slides?.find((s) => s.index === 1)?.copy || null;
const hookStyle = prompts?.hookStyle || prompts?.slides?.find((s) => s.index === 1)?.hookStyle || "unknown";

// Only record a history entry if we actually have a published post to attribute.
if (postInfo?.request_id || hookCopy) {
  learnings.history.push({
    request_id: postInfo?.request_id || null,
    publishedAt,
    hour,
    day,
    hookCopy,
    hookStyle,
    views,
    likes,
    comments,
    shares,
    engagementRate: Number(engagementRate.toFixed(4)),
  });
  if (learnings.history.length > 100) {
    learnings.history = learnings.history.slice(-100);
  }
}

// ---- Recompute aggregates --------------------------------------------------

const hist = learnings.history.filter((h) => h.views > 0 || h.likes > 0);

// Best hooks by views.
learnings.bestHooks = [...learnings.history]
  .filter((h) => h.hookCopy)
  .sort((a, b) => (b.views || 0) - (a.views || 0))
  .slice(0, 5)
  .map((h) => ({ hook: h.hookCopy, style: h.hookStyle, views: h.views, engagementRate: h.engagementRate }));

// Hook style stats: average views + engagement per style.
const styleAgg = {};
for (const h of learnings.history) {
  const s = h.hookStyle || "unknown";
  styleAgg[s] = styleAgg[s] || { count: 0, views: 0, eng: 0 };
  styleAgg[s].count += 1;
  styleAgg[s].views += h.views || 0;
  styleAgg[s].eng += h.engagementRate || 0;
}
learnings.hookStyleStats = Object.fromEntries(
  Object.entries(styleAgg).map(([s, v]) => [
    s,
    { count: v.count, avgViews: Math.round(v.views / v.count), avgEngagement: Number((v.eng / v.count).toFixed(4)) },
  ])
);

// Best posting hours/days by average views.
learnings.bestTimes = rankByAvgViews(learnings.history, "hour");
learnings.bestDays = rankByAvgViews(learnings.history, "day");

// Average engagement rate across posts with data.
learnings.avgEngagementRate = hist.length
  ? Number((hist.reduce((s, h) => s + (h.engagementRate || 0), 0) / hist.length).toFixed(4))
  : 0;

// Profile snapshot.
const profile = analytics.profile?.data || analytics.profile || {};
learnings.profileSnapshot = {
  followers: num(profile.followers, profile.follower_count),
  totalLikes: num(profile.likes, profile.like_count),
  fetchedAt: analytics.fetchedAt || null,
};

// Recommendations for next carousel.
learnings.recommendations = buildRecommendations(learnings);

learnings.postCount = learnings.history.length;
learnings.updatedAt = new Date().toISOString();

writeFileSync(learningsPath, JSON.stringify(learnings, null, 2));

console.error(
  `[learn] posts=${learnings.postCount} avgEng=${learnings.avgEngagementRate} ` +
    `bestHook="${learnings.bestHooks[0]?.hook || "n/a"}" ` +
    `bestTime=${learnings.bestTimes[0]?.value || "n/a"}h`
);
for (const r of learnings.recommendations) console.error(`[learn] rec: ${r}`);

// ---- helpers ---------------------------------------------------------------

function rankByAvgViews(history, key) {
  const agg = {};
  for (const h of history) {
    const k = h[key];
    if (k == null) continue;
    agg[k] = agg[k] || { views: 0, count: 0 };
    agg[k].views += h.views || 0;
    agg[k].count += 1;
  }
  return Object.entries(agg)
    .map(([value, v]) => ({ value, avgViews: Math.round(v.views / v.count), samples: v.count }))
    .sort((a, b) => b.avgViews - a.avgViews);
}

function buildRecommendations(l) {
  const recs = [];
  if (l.history.length < 3) {
    recs.push("Not enough data yet — keep publishing daily to build the learning baseline (target: 10 posts).");
    return recs;
  }
  if (l.bestHooks[0]) {
    recs.push(`Lead with a "${l.bestHooks[0].style}" hook — top performer: "${l.bestHooks[0].hook}" (${l.bestHooks[0].views} views).`);
  }
  const styles = Object.entries(l.hookStyleStats).sort((a, b) => b[1].avgViews - a[1].avgViews);
  if (styles.length >= 2) {
    recs.push(`Hook style "${styles[0][0]}" averages ${styles[0][1].avgViews} views vs "${styles[styles.length - 1][0]}" at ${styles[styles.length - 1][1].avgViews}. Favor the former.`);
  }
  if (l.bestTimes[0]) {
    recs.push(`Post around ${l.bestTimes[0].value}:00 UTC — best average reach (${l.bestTimes[0].avgViews} views, ${l.bestTimes[0].samples} samples).`);
  }
  if (l.bestDays[0]) {
    recs.push(`${l.bestDays[0].value} is your strongest day (${l.bestDays[0].avgViews} avg views).`);
  }
  if (l.avgEngagementRate < 0.05) {
    recs.push(`Engagement (${(l.avgEngagementRate * 100).toFixed(1)}%) is below the 5% target — sharpen the hook and CTA, and make slide 1 more polarizing.`);
  }
  return recs;
}
