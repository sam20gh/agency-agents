#!/usr/bin/env node
/**
 * pick-category.js — prints today's content pillar (News | Football | Weather |
 * AppValue) so run.sh can fetch the right kind of live article.
 *
 * Order of precedence:
 *   1. The Gulfio Instagram Curator's 30-day calendar (today's planned pillar).
 *   2. A weekday rotation fallback (so there's always variety) when there's no
 *      calendar or no entry for today.
 *
 * Calendar path: $CALENDAR_FILE, else ../gulfio-instagram-curator/out/<slug>/calendar.json
 *
 * Usage: node pick-category.js   → stdout: one of News|Football|Weather|AppValue
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND, PILLARS } from "./lib/brand.js";

const HERE = dirname(fileURLToPath(import.meta.url));

// Weekday rotation: keep News-heavy (Gulfio's core), with Football on match-heavy
// days and a Weather/AppValue change-up. 0=Sun..6=Sat.
const WEEKDAY = ["News", "News", "Football", "News", "Weather", "Football", "AppValue"];

function fromCalendar() {
  const slug = BRAND.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const calPath =
    process.env.CALENDAR_FILE || join(HERE, "..", "gulfio-instagram-curator", "out", slug, "calendar.json");
  try {
    const cal = JSON.parse(readFileSync(calPath, "utf8"));
    const today = new Date().toISOString().slice(0, 10);
    const entry = (cal.days || []).find((d) => d.date === today);
    if (entry?.pillar && PILLARS.includes(entry.pillar)) return entry.pillar;
  } catch {
    /* no calendar — fall through */
  }
  return null;
}

const pillar = fromCalendar() || WEEKDAY[new Date().getDay()] || "News";
process.stdout.write(pillar);
