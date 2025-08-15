// server.js
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ==== CONFIG: set MATCH_ID in .env or Render env ====
// Example: MATCH_ID=18726255
const MATCH_ID = process.env.MATCH_ID || "18726255";

// Possible source URLs we will try (they sometimes vary by domain/path)
const SOURCE_URLS = [
  `https://cricheroes.com/scorecard/${MATCH_ID}/live`,
  `https://cricheroes.com/scorecard/${MATCH_ID}`,
  `https://cricheroes.in/scorecard/${MATCH_ID}/live`,
  `https://cricheroes.in/live-video-scorecard-customize/${MATCH_ID}`
];

app.use(express.static(path.join(__dirname, 'public')));

// Simple cache so we don't hammer their site
let CACHE = { ts: 0, data: null };

// Heuristic HTML parser (works across minor layout changes)
function parseHtml(html) {
  const result = {
    batsmen: [],         // ["Name 12(9)", "Name 5(8)"]
    score: "",           // "45-2 (6.3)"
    bowler: "",          // "Bowler 1-12 (2)"
    balls: [],           // [".","1","4","W","2","."]
    crr: ""
  };

  // SCORE & OVERS
  // Matches "45-2 (6.3)" OR "45/2 (6.3)" OR "45-2/6.3"
  let m = html.match(/(\d+)\s*[-/]\s*(\d+)\s*\((\d+\.\d)\)/);
  if (!m) {
    m = html.match(/(\d+)\s*[-/]\s*(\d+)\s*[/ ]\s*(\d+\.\d)/);
  }
  if (m) {
    result.score = `${m[1]}-${m[2]} (${m[3]})`;
  }

  // CRR like "CRR: 6.43" or "RR 6.43"
  let r = html.match(/(?:CRR|RR)\s*[:]\s*(\d+\.\d{1,2})/i);
  if (r) result.crr = r[1];

  // Batsmen like "Ranchhod R... 0(0)" (Two top matches)
  const bats = [...html.matchAll(/([A-Z][A-Za-z'.\-\s]{1,28})\s+(\d+)\((\d+)\)/g)]
    .map(x => `${x[1].trim()} ${x[2]}(${x[3]})`)
    .slice(0,2);
  if (bats.length) result.batsmen = bats;

  // Bowler like "Meer Khan 0-0 (0)"
  const bow = html.match(/([A-Z][A-Za-z'.\-\s]{1,28})\s+(\d+)-(\d+)\s*\((\d+)\)/);
  if (bow) result.bowler = `${bow[1].trim()} ${bow[2]}-${bow[3]} (${bow[4]})`;

  // Recent balls: try to pick dotted list like ". 1 4 W 2 ."
  const balls = [...html.matchAll(/(?:\u2022|W|\.|[0-6])(?=[^0-9]|$)/g)]
                .map(m=>m[0].replace("\u2022","."))
                .filter(Boolean)
                .slice(0,6);
  if (balls.length) result.balls = balls;

  // Fallback defaults
  if (!result.batsmen.length) result.batsmen = ["Batter 1 0(0)","Batter 2 0(0)"];
  if (!result.score) result.score = "0-0 (0.0)";
  if (!result.bowler) result.bowler = "Bowler 0-0 (0)";
  if (!result.balls.length) result.balls = [".",".",".",".",".","."];
  if (!result.crr) result.crr = "0.00";

  return result;
}

// Tries multiple URLs until one returns something
async function fetchLive() {
  for (const url of SOURCE_URLS) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Overlay Bot)" } });
      if (!res.ok) continue;
      const html = await res.text();
      const parsed = parseHtml(html);
      if (parsed) return { ok: true, from: url, data: parsed };
    } catch (e) {
      // try next
    }
  }
  return { ok: false };
}

app.get('/api/score', async (req, res) => {
  const now = Date.now();
  if (CACHE.data && now - CACHE.ts < 2500) {
    return res.json({ ok: true, cached: true, ...CACHE.data });
  }
  const live = await fetchLive();
  if (live.ok) {
    CACHE = { ts: now, data: live };
    return res.json({ ok: true, ...live });
  }
  res.status(500).json({ ok: false, error: "Unable to fetch live score" });
});

app.listen(PORT, () => {
  console.log(`Overlay server running on :${PORT} (MATCH_ID=${MATCH_ID})`);
});
