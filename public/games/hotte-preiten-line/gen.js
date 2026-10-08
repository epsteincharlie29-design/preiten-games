'use strict';
// =====================================================================
//  LIL PREITNER - Etagen-Generator (BSP-Räume mit festem Seed)
// =====================================================================
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const THEME_FLOORS = {
  doener: ['.', ',', ':'], garage: ['_', '.', '_', ','], disco: [',', ':', '.'], villa: ['.', ',', ':'],
  hospital: ['.', ':', ','], harbor: ['.', '_', ','], casino: ['=', ',', ':', '.'], subway: ['.', '_', ':'],
  cyber: ['-', '.', ','], server: ['-', '.'], library: ['.', ',', '.', ':'], network: ['-', ',', '-', '.'],
  mall: ['.', ',', '.', ':'], con: [',', '.', ':'], prison: ['.', ':', ','], airport: ['.', '_', ','],
  lemon: ['.', ',', ':'], junk: ['_', '.', '-', ','], tv: [',', ':', '.'],
};
const GEN_BLOCK = '#HTACG~ZIwL ';   // für die Erreichbarkeit: das hier blockiert
// eigene Generator-Bausteine: feat-Schlüssel -> (ctx, wert); false = Versuch verwerfen (neuer Seed)
const GEN_FEATS = {};
// zusätzliche Waffen in Zufalls-Etagen: { ch, minDiff, maxDiff, melee }
const GEN_ITEMS = [];

function generateFloor(spec, themeName, diff) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const m = tryGenerate(spec, themeName, diff, spec.seed + attempt * 977);
    if (m) return m;
  }
  throw new Error('Generator gescheitert: ' + spec.seed);
}

function tryGenerate(spec, themeName, diff, seed) {
  const R = mulberry32(seed);
  const rnd = (a, b) => a + R() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pk = (arr) => arr[Math.floor(R() * arr.length)];
  const w = spec.w, h = spec.h, f = spec.feat || {};
  const g = [];
  for (let y = 0; y < h; y++) { g.push([]); for (let x = 0; x < w; x++) g[y].push(y === 0 || x === 0 || y === h - 1 || x === w - 1 ? '#' : '.'); }

  // ---------- Räume ----------
  const minR = f.minRoom || 5, maxR = Math.max(f.maxRoom || 11, minR * 2 + 1);
  const leaves = [], splits = [];
  function split(x0, y0, x1, y1, depth) {
    const rw = x1 - x0 + 1, rh = y1 - y0 + 1;
    const canV = rw >= minR * 2 + 1, canH = rh >= minR * 2 + 1;
    const want = rw > maxR || rh > maxR || (R() < 0.3 && depth < 3);
    if (!want || (!canV && !canH)) { leaves.push({ x0, y0, x1, y1 }); return; }
    const vert = canV && (!canH || rw > rh * 1.2 || (rw * 1.2 >= rh && R() < 0.5));
    if (vert) {
      const sx = ri(x0 + minR, x1 - minR);
      for (let y = y0; y <= y1; y++) g[y][sx] = '#';
      splits.push({ vert: true, pos: sx, a: y0, b: y1 });
      split(x0, y0, sx - 1, y1, depth + 1); split(sx + 1, y0, x1, y1, depth + 1);
    } else {
      const sy = ri(y0 + minR, y1 - minR);
      for (let x = x0; x <= x1; x++) g[sy][x] = '#';
      splits.push({ vert: false, pos: sy, a: x0, b: x1 });
      split(x0, y0, x1, sy - 1, depth + 1); split(x0, sy + 1, x1, y1, depth + 1);
    }
  }
  split(1, 1, w - 2, h - 2, 0);

  // ---------- Türen, Durchgänge, Fenster ----------
  for (const s of splits) {
    const cands = [];
    for (let t = s.a; t <= s.b; t++) {
      const x = s.vert ? s.pos : t, y = s.vert ? t : s.pos;
      const A = s.vert ? g[y][x - 1] : g[y - 1][x], B = s.vert ? g[y][x + 1] : g[y + 1][x];
      if (g[y][x] === '#' && A !== '#' && B !== '#') cands.push(t);
    }
    if (!cands.length) return null;
    const doors = [];
    const nd = (s.b - s.a > 14 && R() < 0.6) ? 2 : 1;
    for (let k = 0; k < 20 && doors.length < nd; k++) {
      const t = pk(cands);
      if (doors.every((d) => Math.abs(d - t) > 4)) doors.push(t);
    }
    const set = (t, c) => { if (s.vert) g[t][s.pos] = c; else g[s.pos][t] = c; };
    for (const t of doors) {
      if (R() < 0.15 && cands.includes(t + 1)) { set(t, '.'); set(t + 1, '.'); }
      else set(t, 'D');
    }
    if (f.glass && R() < f.glass * 2.2) {
      const free = cands.filter((t) => doors.every((d) => Math.abs(d - t) > 1));
      if (free.length > 2) {
        const st = pk(free), len = ri(2, 5);
        for (let t = st; t < st + len; t++) if (free.includes(t)) set(t, 'G');
      }
    }
  }

  // ---------- Böden pro Raum ----------
  const floors = THEME_FLOORS[themeName] || ['.'];
  for (const L of leaves) {
    L.ch = pk(floors);
    for (let y = L.y0; y <= L.y1; y++) for (let x = L.x0; x <= L.x1; x++) if (g[y][x] === '.') g[y][x] = L.ch;
    L.area = (L.x1 - L.x0 + 1) * (L.y1 - L.y0 + 1);
  }
  const isFloor = (c) => '.,:_;=+-r<>'.includes(c);
  const nearDoor = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = (g[y + dy] || [])[x + dx]; if (c === 'D' || c === 'G') return true; } return false; };
  const rectFree = (x0, y0, x1, y1) => {
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      const c = (g[y] || [])[x];
      if (c === undefined) return false;
      if (y >= y0 && y <= y1 && x >= x0 && x <= x1) { if (!isFloor(c)) return false; }
      else if (c === 'D' || c === 'G' || c === 'T' || c === 'A' || c === 'C' || c === '~') return false;
    }
    return true;
  };
  const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; };
  const byArea = leaves.slice().sort((a, b) => b.area - a.area);

  // Tanzfläche
  for (let i = 0; i < (f.dance || 0) && i < byArea.length; i++) {
    const L = byArea[i];
    fill(L.x0 + 1, L.y0 + 1, L.x1 - 1, L.y1 - 1, '+');
  }
  // Pool
  if (f.water) {
    const L = byArea[0];
    const pw = Math.max(3, L.x1 - L.x0 - 5), ph = Math.max(2, L.y1 - L.y0 - 5);
    const px = L.x0 + Math.floor((L.x1 - L.x0 + 1 - pw) / 2), py = L.y0 + Math.floor((L.y1 - L.y0 + 1 - ph) / 2);
    if (rectFree(px, py, px + pw - 1, py + ph - 1)) fill(px, py, px + pw - 1, py + ph - 1, '~');
  }
  // Autos (4x2)
  for (let i = 0, tries = 0; i < (f.cars || 0) && tries < 200; tries++) {
    const L = pk(leaves);
    const horiz = R() < 0.7, cw = horiz ? 4 : 2, chh = horiz ? 2 : 4;
    const x0 = ri(L.x0 + 1, L.x1 - cw), y0 = ri(L.y0 + 1, L.y1 - chh);
    if (x0 < L.x0 + 1 || y0 < L.y0 + 1) continue;
    if (rectFree(x0, y0, x0 + cw - 1, y0 + chh - 1)) { fill(x0, y0, x0 + cw - 1, y0 + chh - 1, 'A'); i++; }
  }
  // Tische, Kisten
  for (const L of leaves) {
    if (f.tables && R() < f.tables * 2) {
      const n = ri(1, 3);
      for (let k = 0; k < n; k++) {
        const tw = ri(1, 3), th = ri(1, 2);
        const x0 = ri(L.x0 + 2, L.x1 - 1 - tw), y0 = ri(L.y0 + 2, L.y1 - 1 - th);
        if (x0 >= L.x0 + 2 && y0 >= L.y0 + 2 && rectFree(x0, y0, x0 + tw - 1, y0 + th - 1)) fill(x0, y0, x0 + tw - 1, y0 + th - 1, 'T');
      }
    }
    if (f.crates && R() < f.crates * 2) {
      const n = ri(2, 5);
      for (let k = 0; k < n; k++) {
        const s2 = R() < 0.4 ? 2 : 1;
        const x0 = ri(L.x0 + 1, L.x1 - s2), y0 = ri(L.y0 + 1, L.y1 - s2);
        if (x0 >= L.x0 + 1 && y0 >= L.y0 + 1 && rectFree(x0, y0, x0 + s2 - 1, y0 + s2 - 1)) fill(x0, y0, x0 + s2 - 1, y0 + s2 - 1, 'C');
      }
    }
  }
  // Regale / Serverschränke in Reihen (wie Wände, mit Lücken an beiden Enden)
  if (f.shelves) {
    for (const L of leaves) {
      const rw = L.x1 - L.x0 + 1, rh = L.y1 - L.y0 + 1;
      if (R() > f.shelves * 1.4 || Math.max(rw, rh) < 7) continue;
      if (rw >= rh) {
        for (let y = L.y0 + 2; y <= L.y1 - 2; y += 3) {
          const x0 = L.x0 + 2, x1 = L.x1 - 2;
          if (x1 - x0 < 2) continue;
          const gap = R() < 0.5 ? ri(x0 + 1, x1 - 1) : -1;
          for (let x = x0; x <= x1; x++) if (x !== gap && isFloor(g[y][x]) && !nearDoor(x, y)) g[y][x] = 'I';
        }
      } else {
        for (let x = L.x0 + 2; x <= L.x1 - 2; x += 3) {
          const y0 = L.y0 + 2, y1 = L.y1 - 2;
          if (y1 - y0 < 2) continue;
          const gap = R() < 0.5 ? ri(y0 + 1, y1 - 1) : -1;
          for (let y = y0; y <= y1; y++) if (y !== gap && isFloor(g[y][x]) && !nearDoor(x, y)) g[y][x] = 'I';
        }
      }
    }
  }
  // Förderbänder (Flughafen): lange Bahnen in großen Räumen
  for (let i = 0, tries = 0; i < (f.belts || 0) && tries < 60; tries++) {
    const L = pk(byArea);
    if (L.belt || L.x1 - L.x0 < 7) continue;
    L.belt = true; i++;
    const y = Math.floor((L.y0 + L.y1) / 2), dir = R() < 0.5 ? '>' : '<';
    for (let x = L.x0 + 1; x <= L.x1 - 1; x++) if (isFloor(g[y][x]) && !nearDoor(x, y)) g[y][x] = dir;
  }
  // Gleise quer durch die Karte
  if (f.rails) {
    const bands = f.rails === 2 ? [Math.floor(h / 3) - 2, Math.floor(h * 2 / 3) - 1] : [Math.floor(h / 2) - 2];
    for (const yb of bands) {
      for (let x = 1; x < w - 1; x++) {
        g[yb][x] = '.'; g[yb + 1][x] = 'r'; g[yb + 2][x] = 'r'; g[yb + 3][x] = '.';
      }
    }
  }
  // Laser quer durch Räume
  for (let i = 0, tries = 0; i < (f.lasers || 0) && tries < 50; tries++) {
    const L = pk(leaves);
    if (L.laser) continue;
    L.laser = true; i++;
    if (R() < 0.5) { const x = Math.floor((L.x0 + L.x1) / 2); for (let y = L.y0; y <= L.y1; y++) if (isFloor(g[y][x]) && g[y][x] !== 'r') g[y][x] = 'l'; }
    else { const y = Math.floor((L.y0 + L.y1) / 2); for (let x = L.x0; x <= L.x1; x++) if (isFloor(g[y][x]) && g[y][x] !== 'r') g[y][x] = 'l'; }
  }

  // eigene Bausteine (GEN_FEATS) - danach kommt die Erreichbarkeits-Prüfung
  for (const k in f) {
    if (!f[k] || !GEN_FEATS[k]) continue;
    const ctx = { W: w, H: h, get: (x, y) => (g[y] && g[y][x] !== undefined ? g[y][x] : '#'), set: (x, y, ch) => { if (x > 0 && y > 0 && x < w - 1 && y < h - 1) g[y][x] = ch; },
      rooms: leaves, byArea, rng: R, ri, pk, spec, feat: f, diff, theme: themeName, grid: g, isFloor: (x, y) => !!g[y] && isFloor(g[y][x]), isFloorC: isFloor, nearDoor, rectFree, fill };
    if (GEN_FEATS[k](ctx, f[k]) === false) return null;
  }

  // ---------- Start, Erreichbarkeit, Ausgang ----------
  const startL = leaves.reduce((a, b) => (a.x0 + a.y0 <= b.x0 + b.y0 ? a : b));
  let P = null;
  const cx = Math.floor((startL.x0 + startL.x1) / 2), cy = Math.floor((startL.y0 + startL.y1) / 2);
  for (let r = 0; r < 8 && !P; r++) for (let y = cy - r; y <= cy + r && !P; y++) for (let x = cx - r; x <= cx + r && !P; x++) {
    if (g[y] && isFloor(g[y][x]) && g[y][x] !== 'l' && g[y][x] !== 'r') P = [x, y];
  }
  if (!P) return null;
  const distA = new Int32Array(w * h).fill(-1);
  const q = [P[1] * w + P[0]]; distA[q[0]] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi], x = c % w, y = (c / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || distA[n] >= 0 || GEN_BLOCK.includes(g[ny][nx])) continue;
      distA[n] = distA[c] + 1; q.push(n);
    }
  }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (isFloor(g[y][x]) && distA[y * w + x] < 0) return null;
  let best = -1, X = null;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const d = distA[y * w + x];
    if (d > best && isFloor(g[y][x]) && g[y][x] !== 'l' && g[y][x] !== 'r' && !nearDoor(x, y)) { best = d; X = [x, y]; }
  }
  if (!X || best < 15) return null;
  g[P[1]][P[0]] = 'P';
  g[X[1]][X[0]] = 'X';

  // ---------- Gegner ----------
  const leafOf = (x, y) => leaves.find((L) => x >= L.x0 && x <= L.x1 && y >= L.y0 && y <= L.y1);
  const free = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const c = g[y][x];
    if (!isFloor(c) || c === 'l' || c === 'r' || c === '+' && R() < 0.3) continue;
    if (nearDoor(x, y)) continue;
    const d = distA[y * w + x];
    if (d < 9 || Math.hypot(x - P[0], y - P[1]) < 8) continue;
    free.push([x, y]);
  }
  const mix = spec.mix || { E: 1 };
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  const sampleKind = () => { let r = R() * total; for (const k in mix) { r -= mix[k]; if (r <= 0) return k; } return 'E'; };
  const taken = [];
  for (let i = 0, tries = 0; i < spec.enemies && tries < 2000 && free.length; tries++) {
    const [x, y] = free[Math.floor(R() * free.length)];
    if (taken.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 3)) continue;
    if (leafOf(x, y) === startL) continue;
    g[y][x] = sampleKind();
    taken.push([x, y]); i++;
  }

  // ---------- Waffen, Geld, Tresore ----------
  let pool = diff <= 3 ? 'bfcphpbeidt' : diff <= 6 ? 'psuhmbfkaiyetdz4' : 'sumgkjhmanqyz45x';
  let meleeStart = diff <= 3 ? 'bfhe' : 'hkbfe';
  for (const it of GEN_ITEMS) if (diff >= (it.minDiff || 0) && diff <= (it.maxDiff == null ? 99 : it.maxDiff)) { pool += it.ch; if (it.melee) meleeStart += it.ch; }
  const putIn = (cond, ch) => {
    for (let tries = 0; tries < 400; tries++) {
      const x = ri(1, w - 2), y = ri(1, h - 2);
      if (!isFloor(g[y][x]) || g[y][x] === 'l' || g[y][x] === 'r' || nearDoor(x, y) || !cond(x, y)) continue;
      g[y][x] = ch; return true;
    }
    return false;
  };
  putIn((x, y) => leafOf(x, y) === startL && Math.abs(x - P[0]) + Math.abs(y - P[1]) <= 4, pk(meleeStart.split('')));
  for (let i = 0; i < (spec.items || 0); i++) putIn((x, y) => leafOf(x, y) !== startL, pk(pool.split('')));
  for (let i = 0; i < (spec.osaft || 0); i++) putIn((x, y) => leafOf(x, y) !== startL, 'o');
  for (let i = 0; i < (spec.cash || 0); i++) putIn(() => true, '$');
  for (let i = 0; i < (spec.safes || 0); i++) {
    putIn((x, y) => leafOf(x, y) !== startL && (g[y - 1][x] === '#' || g[y + 1][x] === '#' || g[y][x - 1] === '#' || g[y][x + 1] === '#'), 'Z');
  }
  return g.map((r) => r.join(''));
}
