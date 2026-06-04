/* Golf Skins — shared live backend
 * Tiny Express server + JSON-file database. No native deps.
 * Each "round" is identified by a short code shared among golfers.
 *
 * Run:  npm install && npm start
 * Open: http://localhost:3000/?r=lacanada
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));

const HOLES = 18;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

// ---- storage ----
let rounds = {};
try { rounds = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {}; } catch (e) { rounds = {}; }

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(rounds), () => {});
  }, 400);
}

function emptySnapshot() {
  return {
    players: [],
    opts: {},
    course: {
      par:  [3,4,4,4,4,5,3,4,3, 4,3,5,4,4,4,3,5,4],
      hcp:  [11,1,15,13,5,3,7,9,17, 8,14,10,2,6,12,18,16,4],
      yard: [171,418,333,295,368,546,191,347,121, 445,147,462,401,328,280,145,430,345]
    },
    pid: 1
  };
}
function getRound(code) {
  if (!rounds[code]) rounds[code] = { version: 0, snapshot: emptySnapshot() };
  return rounds[code];
}
function bump(r) { r.version++; persist(); }

// ---- API ----
// Read full state
app.get('/api/round/:code', (req, res) => {
  const r = rounds[req.params.code];
  if (!r) return res.json({ version: 0, snapshot: null });
  res.json({ version: r.version, snapshot: r.snapshot });
});

// Replace config (players meta, options, course, pid) — PRESERVES existing scores by player id
app.put('/api/round/:code/config', (req, res) => {
  const r = getRound(req.params.code);
  const body = req.body || {};
  const prev = {};
  (r.snapshot.players || []).forEach(p => { prev[p.id] = p.scores; });
  const players = (body.players || []).map(p => ({
    id: p.id, name: p.name, index: p.index,
    flight: p.flight, group: p.group, pair: p.pair,
    scores: prev[p.id] || new Array(HOLES).fill(null)
  }));
  r.snapshot.players = players;
  if (body.opts) r.snapshot.opts = body.opts;
  if (body.course) r.snapshot.course = body.course;
  if (body.pid != null) r.snapshot.pid = body.pid;
  bump(r);
  res.json({ version: r.version });
});

// Set a single score cell
app.post('/api/round/:code/score', (req, res) => {
  const r = getRound(req.params.code);
  const { id, h, v } = req.body || {};
  const p = (r.snapshot.players || []).find(x => x.id === id);
  if (p) {
    if (!Array.isArray(p.scores)) p.scores = new Array(HOLES).fill(null);
    if (h >= 0 && h < HOLES) p.scores[h] = (v === '' || v == null || isNaN(v)) ? null : +v;
    bump(r);
  }
  res.json({ version: r.version });
});

// Bulk set scores (used by Fill-par / Clear-all)
app.post('/api/round/:code/bulk', (req, res) => {
  const r = getRound(req.params.code);
  const sc = (req.body && req.body.scores) || {};
  (r.snapshot.players || []).forEach(p => {
    if (sc[p.id]) p.scores = sc[p.id];
  });
  bump(r);
  res.json({ version: r.version });
});

// ---- static frontend ----
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res) => {
  const idx = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(idx)) return res.sendFile(idx);
  res.status(404).send('Place your golf-skins app at public/index.html — see README.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Golf Skins backend on http://localhost:' + PORT));
