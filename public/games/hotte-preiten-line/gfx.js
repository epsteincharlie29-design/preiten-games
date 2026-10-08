'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Grafik-Extras
//  Level: weiche Schatten an Wänden, Bodenstruktur, Wand-Details,
//         Lichtschein (Schüsse, Explosionen, Laser), Vignette
//  Stadt: Zebrastreifen, Dach-Details, Bänke/Mülleimer/Hydranten,
//         Wasser-Glitzern, Windrad, Straßensperre, nachts: Fenster + Scheinwerfer
//  Optionen: GRAFIK HOCH / MITTEL / NIEDRIG (save.opts.gfx 2/1/0)
// =====================================================================
const gfxLevel = () => (save.opts && save.opts.gfx != null ? save.opts.gfx : 2);
const GLOW_CACHE = new Map();
function glowSprite(col) {
  let c = GLOW_CACHE.get(col);
  if (c) return c;
  const [cv, g] = mkCanvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, col); grd.addColorStop(0.35, col.replace(/[\d.]+\)$/, (m) => (parseFloat(m) * 0.45).toFixed(3) + ')')); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  GLOW_CACHE.set(col, cv);
  return cv;
}
function glow(g, x, y, r, col, a) { g.globalAlpha = a; g.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }
let VIGNETTE = null;
function drawVignette() {
  if (gfxLevel() === 0) return;
  if (!VIGNETTE) {
    const [c, g] = mkCanvas(W, H);
    const grd = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.62);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,10,0.42)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    VIGNETTE = c;
  }
  ctx.drawImage(VIGNETTE, 0, 0);
}

// ---------- Level: nach renderStatic (einmal pro Etage) ----------
function gfxLevelStatic(fg, wg) {
  if (gfxLevel() === 0) return;
  const { w, h } = G, wallish = (x, y) => { const c = T_(x, y); return c === '#' || c === 'H' || c === 'I'; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = G.tiles[y * w + x];
    if (isWallC(c)) continue;
    const X = x * TS, Y = y * TS;
    // Bodenstruktur: ein paar helle/dunkle Pixel pro Kachel
    for (let k = 0; k < 3; k++) { fg.fillStyle = k % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'; fg.fillRect(X + Math.floor(hash(x * 13 + k, y * 7) * 15), Y + Math.floor(hash(x * 3, y * 11 + k) * 15), 1, 1); }
    // weiche Schatten neben Wänden (Umgebungsverdeckung)
    const up = wallish(x, y - 1), lf = wallish(x - 1, y), rt = wallish(x + 1, y), dn = wallish(x, y + 1);
    if (up) for (let k = 0; k < 7; k++) { fg.fillStyle = `rgba(0,0,0,${0.2 * (1 - k / 7)})`; fg.fillRect(X, Y + k, 16, 1); }
    if (lf) for (let k = 0; k < 5; k++) { fg.fillStyle = `rgba(0,0,0,${0.15 * (1 - k / 5)})`; fg.fillRect(X + k, Y, 1, 16); }
    if (rt) for (let k = 0; k < 4; k++) { fg.fillStyle = `rgba(0,0,0,${0.12 * (1 - k / 4)})`; fg.fillRect(X + 15 - k, Y, 1, 16); }
    if (dn) { fg.fillStyle = 'rgba(0,0,0,0.1)'; fg.fillRect(X, Y + 14, 16, 2); }
    if (!up && !lf && wallish(x - 1, y - 1)) { fg.fillStyle = 'rgba(0,0,0,0.12)'; fg.fillRect(X, Y, 4, 4); }
  }
  // Wände: Kante oben heller, Seitenfläche mit Fugen + Sockelleiste
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = G.tiles[y * w + x];
    if (c !== '#') continue;
    const X = x * TS, Y = y * TS, below = wallish(x, y + 1), above = wallish(x, y - 1);
    if (!above) { wg.fillStyle = 'rgba(255,255,255,0.12)'; wg.fillRect(X, Y + 2, 16, 1); }
    if (!below) {
      wg.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 0; k < 16; k += 8) wg.fillRect(X + k + ((x % 2) * 4), Y + 11, 1, 4);
      wg.fillStyle = 'rgba(255,255,255,0.1)'; wg.fillRect(X, Y + 11, 16, 1);
    }
    if (hash(x * 7, y * 3) < 0.08) { wg.fillStyle = 'rgba(0,0,0,0.1)'; wg.fillRect(X + 3 + Math.floor(hash(x, y) * 8), Y + 4, 3, 2); }
  }
}
// ---------- Level: Lichtschein (jedes Bild, nach den Partikeln) ----------
function gfxLevelGlow(g) {
  if (gfxLevel() < 2) return;
  g.globalCompositeOperation = 'lighter';
  for (const b of G.bullets) {
    const col = b.kind === 'laser' || b.kind === 'bit' ? 'rgba(80,255,140,1)' : b.kind === 'flame' ? 'rgba(255,140,40,1)' : b.kind === 'zap' ? 'rgba(140,240,255,1)' : b.owner === 'player' ? 'rgba(255,230,140,1)' : 'rgba(255,120,80,1)';
    glow(g, b.x, b.y, b.kind === 'flame' ? 14 : 10, col, b.kind === 'flame' ? 0.25 : 0.35);
  }
  for (const q of G.parts) {
    if (q.kind === 'flash') glow(g, q.x, q.y, Math.max(20, q.s * 2.2), 'rgba(255,220,140,1)', clamp(q.life / (q.max || 0.1), 0, 1) * 0.7);
    else if (q.kind === 'spark' && Math.random() < 0.5) glow(g, q.x, q.y, 5, 'rgba(255,230,140,1)', 0.25);
  }
  if (G.lasers && G.lasers.length) for (const i of G.lasers) {
    const gid = G.laserGroup[i];
    if (gid == null || gid < 0 || !laserOn(gid)) continue;
    const x = (i % G.w) * TS + 8, y = ((i / G.w) | 0) * TS + 8;
    if (Math.abs(x - G.cam.x) > 300 || Math.abs(y - G.cam.y) > 200) continue;
    glow(g, x, y, 16, 'rgba(255,40,60,1)', 0.18);
  }
  g.globalCompositeOperation = 'source-over';
}

// ---------- Stadt: einmalig beim Zeichnen der Karte ----------
function gfxCityStatic(g) {
  const tAt = (x, y) => (x < 0 || y < 0 || x >= CW || y >= CH ? 'R' : CITY.t[y * CW + x]);
  // Zebrastreifen an den Kreuzungen
  for (const ry of H_ROADS) for (const rx of V_ROADS) {
    if (rx + 4 > hRoadEnd(ry) || ry > ROAD_END) continue;
    for (const cx of [rx - 2, rx + 4]) {
      if (tAt(cx, ry) !== '=') continue;
      for (let yy = ry * TS + 1; yy < (ry + 3) * TS - 1; yy += 4) { g.fillStyle = 'rgba(235,235,240,0.75)'; g.fillRect(cx * TS + 2, yy, 12, 2); }
    }
    for (const cy of [ry - 2, ry + 4]) {
      if (tAt(rx, cy) !== '=') continue;
      for (let xx = rx * TS + 1; xx < (rx + 3) * TS - 1; xx += 4) { g.fillStyle = 'rgba(235,235,240,0.75)'; g.fillRect(xx, cy * TS + 2, 2, 12); }
    }
  }
  // Dächer: Klimaanlagen, Lüfter, Oberlichter, Antennen
  for (const b of BUILDINGS) {
    if (b.enter) continue;
    const X = b.x * TS, Y = b.y * TS, Wd = b.w * TS, Hd = b.h * TS, n = Math.max(1, Math.floor(b.w * b.h / 20));
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(X + 1, Y + 1, Wd - 2, 1); g.fillRect(X + 1, Y + 1, 1, Hd - 9);
    for (let k = 0; k < n; k++) {
      const ax = X + 8 + Math.floor(hash(b.x * 7 + k, b.y) * (Wd - 28)), ay = Y + 8 + Math.floor(hash(b.y, b.x * 5 + k) * (Hd - 30)), kind = Math.floor(hash(k, b.x + b.y) * 4);
      if (ax + 14 > X + Wd || ay + 12 > Y + Hd - 8) continue;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(ax + 2, ay + 2, 12, 10);
      if (kind === 0) { g.fillStyle = '#9a9aa8'; g.fillRect(ax, ay, 12, 10); g.fillStyle = '#5a5a66'; pxEll(g, ax + 6, ay + 5, 3, 3, '#5a5a66'); g.fillStyle = '#c8c8d0'; g.fillRect(ax + 5, ay + 2, 2, 6); }
      else if (kind === 1) { g.fillStyle = '#6a6a74'; g.fillRect(ax, ay, 10, 10); g.fillStyle = '#3a3a44'; for (let j = 1; j < 10; j += 3) g.fillRect(ax + 1, ay + j, 8, 1); }
      else if (kind === 2) { g.fillStyle = 'rgba(140,200,255,0.55)'; g.fillRect(ax, ay, 12, 8); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(ax + 1, ay + 1, 4, 1); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.strokeRect(ax + 0.5, ay + 0.5, 11, 7); }
      else { g.fillStyle = '#2a2a30'; g.fillRect(ax + 5, ay, 1, 10); g.fillRect(ax + 2, ay + 2, 7, 1); g.fillStyle = '#e01b3c'; g.fillRect(ax + 5, ay - 1, 1, 1); }
    }
  }
  // Bänke, Mülleimer, Hydranten auf den Gehwegen
  for (let y = 1; y < CH - 1; y++) for (let x = 1; x < LAND_X; x++) {
    if (tAt(x, y) !== '_' || hash(x * 17, y * 23) > 0.05) continue;
    const X = x * TS, Y = y * TS, kind = Math.floor(hash(y * 3, x) * 3), vert = tAt(x, y - 1) === '_' && tAt(x, y + 1) === '_';
    if (kind === 0) {   // Bank
      g.fillStyle = 'rgba(0,0,0,0.3)'; if (vert) g.fillRect(X + 6, Y + 3, 5, 12); else g.fillRect(X + 3, Y + 7, 12, 5);
      g.fillStyle = '#7a5030'; if (vert) { g.fillRect(X + 5, Y + 2, 4, 11); g.fillStyle = '#5a3a1a'; g.fillRect(X + 5, Y + 2, 1, 11); } else { g.fillRect(X + 2, Y + 6, 11, 4); g.fillStyle = '#5a3a1a'; g.fillRect(X + 2, Y + 6, 11, 1); }
    } else if (kind === 1) {   // Mülleimer
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X + 7, Y + 7, 6, 6);
      g.fillStyle = '#2a6a3a'; g.fillRect(X + 5, Y + 5, 6, 6); g.fillStyle = '#3a8a4a'; g.fillRect(X + 5, Y + 5, 6, 1); g.fillStyle = '#1a3a22'; g.fillRect(X + 6, Y + 6, 4, 1);
    } else {   // Hydrant
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X + 7, Y + 7, 4, 5);
      g.fillStyle = '#c41f2a'; g.fillRect(X + 6, Y + 5, 4, 6); g.fillRect(X + 5, Y + 7, 6, 2); g.fillStyle = '#ff6a6a'; g.fillRect(X + 6, Y + 5, 1, 2);
    }
  }
  // Blumen in den Parks
  for (let y = 0; y < CH; y++) for (let x = 0; x < LAND_X; x++) {
    if (tAt(x, y) !== 'g' || hash(x * 29, y * 31) > 0.06) continue;
    g.fillStyle = ['#ffe14d', '#ff9ad5', '#ffffff', '#9ab0ff'][Math.floor(hash(x, y * 2) * 4)];
    g.fillRect(x * TS + 3 + Math.floor(hash(x, y) * 10), y * TS + 3 + Math.floor(hash(y, x) * 10), 2, 2);
  }
  // beleuchtete Fenster für die Nacht (einmal ausrechnen)
  CITY.windows = [];
  for (const b of BUILDINGS) {
    if (b.enter) continue;
    for (let k = 0; k < Math.floor(b.w * b.h / 6); k++) {
      if (hash(b.x * 11 + k, b.y * 3) < 0.45) continue;
      CITY.windows.push([b.x * TS + 4 + Math.floor(hash(k, b.x * 3) * (b.w * TS - 10)), b.y * TS + 4 + Math.floor(hash(b.y * 7, k) * (b.h * TS - 14)), hash(k, b.y) < 0.5 ? '#ffd27a' : '#bfe0ff']);
    }
  }
}
// ---------- Stadt: jedes Bild (Weltkoordinaten) ----------
function drawCityDecor(g) {
  const cam = C.cam, x0 = Math.max(0, Math.floor((cam.x - W / 2) / TS) - 1), x1 = Math.min(CW - 1, Math.ceil((cam.x + W / 2) / TS) + 1);
  const y0 = Math.max(0, Math.floor((cam.y - H / 2) / TS) - 1), y1 = Math.min(CH - 1, Math.ceil((cam.y + H / 2) / TS) + 1);
  if (gfxLevel() >= 1) {
    // Wasser glitzert und bewegt sich
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (CITY.t[y * CW + x] !== '~') continue;
      const ph = T * 1.6 + hash(x, y) * 6;
      g.fillStyle = 'rgba(160,210,255,0.35)';
      g.fillRect(x * TS + Math.floor((hash(x * 3, y) * 12 + ph * 3) % 14), y * TS + Math.floor(hash(x, y * 3) * 14), 3, 1);
      if (Math.sin(ph) > 0.85) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x * TS + Math.floor(hash(y, x * 7) * 14), y * TS + Math.floor(hash(x * 7, y) * 14), 1, 1); }
    }
  }
  // Windrad auf dem Land
  const wx = 205 * TS + 8, wy = 30 * TS + 8;
  if (!offscreen(wx, wy, 60)) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(wx - 2, wy + 2, 7, 26);
    g.fillStyle = '#e8e8f0'; g.fillRect(wx - 3, wy, 6, 24); g.fillStyle = '#b8b8c8'; g.fillRect(wx + 1, wy, 2, 24);
    g.save(); g.translate(wx, wy); g.rotate(T * 1.3);
    g.fillStyle = '#f4f4f8'; for (let k = 0; k < 3; k++) { g.rotate(TAU / 3); g.fillRect(-2, -26, 4, 24); }
    g.restore(); pxEll(g, wx, wy, 3, 3, '#9a9aa8');
  }
}
function drawGate(g) {
  const x = GATE.x0 * TS, y0 = GATE.y0 * TS, y1 = (GATE.y1 + 1) * TS;
  if (offscreen(x, (y0 + y1) / 2, 80)) return;
  const open = gateOpen();
  g.fillStyle = '#3a3a44'; g.fillRect(x + 4, y0 - 6, 6, 8); g.fillRect(x + 4, y1 - 2, 6, 8);
  if (!open) {
    for (let yy = y0; yy < y1; yy += 8) { g.fillStyle = (yy / 8) % 2 ? '#e01b3c' : '#f4f4f4'; g.fillRect(x + 5, yy, 4, 8); }
    if (Math.floor(T * 2) % 2) { g.fillStyle = '#ff3b3b'; g.fillRect(x + 5, y0 - 8, 4, 3); g.fillRect(x + 5, y1 + 5, 4, 3); }
    txt('LANDKREIS', x + 7, y0 - 28, { g, font: FS, align: 'center', color: '#ffffff' });
    txt('ZUFAHRT AB SAFT-RANG ' + GATE.rank, x + 7, y0 - 18, { g, font: FS, align: 'center', color: '#ff6a6a' });
  } else {
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#e01b3c' : '#f4f4f4'; g.fillRect(x + 5, y0 - 34 + k * 8, 4, 8); }
    txt('LANDKREIS', x + 7, y0 - 44, { g, font: FS, align: 'center', color: '#7dff7a' });
  }
}
function drawCityLights(g) {
  if (gfxLevel() < 2) return;
  g.globalCompositeOperation = 'lighter';
  for (const o of B().eq) if (o.id === 'uvlamp' && ownsSite(o.s) && !offscreen(o.x * TS, o.y * TS, 60)) glow(g, o.x * TS + 8, o.y * TS + 6, 34, 'rgba(190,90,255,1)', 0.22 + Math.sin(T * 3) * 0.03);
  if (C.bullets) for (const b of C.bullets) glow(g, b.x, b.y, 9, b.owner === 'p' ? 'rgba(255,230,140,1)' : 'rgba(255,120,80,1)', 0.35);
  if (C.parts) for (const q of C.parts) if (q.kind === 'flash') glow(g, q.x, q.y, Math.max(18, q.s * 2), 'rgba(255,220,140,1)', clamp(q.life / q.max, 0, 1) * 0.7);
  g.globalCompositeOperation = 'source-over';
}
// nachts (nach der Abdunkelung, Bildschirmkoordinaten): Fenster + Scheinwerfer
function gfxNight(n) {
  if (gfxLevel() === 0 || n <= 0) return;
  const ox = W / 2 - C.cam.x, oy = H / 2 - C.cam.y;
  ctx.globalCompositeOperation = 'lighter';
  if (CITY.windows) for (const [x, y, col] of CITY.windows) {
    const sx = x + ox, sy = y + oy;
    if (sx < -10 || sy < -10 || sx > W + 10 || sy > H + 10) continue;
    ctx.globalAlpha = 0.5 * n; ctx.fillStyle = col; ctx.fillRect(Math.round(sx), Math.round(sy), 4, 3);
    if (gfxLevel() >= 2) glow(ctx, sx + 2, sy + 1, 7, col === '#ffd27a' ? 'rgba(255,210,120,1)' : 'rgba(190,220,255,1)', 0.18 * n);
  }
  ctx.globalAlpha = 1;
  const cone = (c) => {
    const sx = c.x + ox, sy = c.y + oy;
    if (sx < -120 || sy < -120 || sx > W + 120 || sy > H + 120) return;
    ctx.fillStyle = `rgba(255,240,180,${0.14 * n})`;
    ctx.beginPath(); ctx.moveTo(sx + Math.cos(c.a) * 10, sy + Math.sin(c.a) * 10); ctx.arc(sx, sy, 80, c.a - 0.32, c.a + 0.32); ctx.fill();
  };
  for (const c of (C.traffic || []).concat(C.pcars || [], C.trucks || [])) cone(c);
  ctx.globalCompositeOperation = 'source-over';
}
