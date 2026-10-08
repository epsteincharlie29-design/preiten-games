'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Kern: Konstanten, Helfer, Eingabe, Assets, Text
// =====================================================================
const W = 480, H = 270, TS = 16, TAU = Math.PI * 2;
const FB = '"Press Start 2P", monospace';
const FS = 'Silkscreen, monospace';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;
ctx.imageSmoothingEnabled = false;

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  // ganzzahlig = schärfer; aber nur, wenn dabei nicht zu viel Fenster leer bleibt
  const si = s >= 2 && Math.floor(s) / s > 0.86 ? Math.floor(s) : s;
  canvas.style.width = W * si + 'px';
  canvas.style.height = H * si + 'px';
}
addEventListener('resize', fit); fit();

// ---------- Helfer ----------
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function turnTo(a, target, step) { const d = angDiff(a, target); return Math.abs(d) <= step ? target : a + Math.sign(d) * step; }
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
function pxEll(g, cx, cy, rx, ry, col) {
  g.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

// ---------- Eingabe ----------
const keys = {}, pressed = {};
const mouse = { x: W / 2, y: H / 2, down: false, rdown: false, pl: false, pr: false, moved: false, wheel: 0 };
let typed = '';
addEventListener('keydown', (e) => {
  if (e.key && e.key.length === 1) typed += e.key;
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  Sound.init();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = clamp((e.clientX - r.left) / r.width * W, 0, W);
  mouse.y = clamp((e.clientY - r.top) / r.height * H, 0, H);
  mouse.moved = true;
});
addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
addEventListener('mousedown', (e) => {
  Sound.init();
  if (e.button === 0) { mouse.down = true; mouse.pl = true; }
  if (e.button === 2) { mouse.rdown = true; mouse.pr = true; }
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; if (e.button === 2) mouse.rdown = false; });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = mouse.rdown = false; });
function clearInput() { typed = ''; for (const k in pressed) delete pressed[k]; mouse.pl = mouse.pr = false; mouse.moved = false; mouse.wheel = 0; }
const anyConfirm = () => pressed.Enter || pressed.Space || mouse.pl;

// ---------- Speicherstand ----------
const SAVE_KEY = 'lilPreitner_v1';
let SLOT = 1; try { SLOT = +localStorage.getItem('hpl_slot') || 1; } catch (e) { /* egal */ }
const slotKey = (n) => (n === 1 ? SAVE_KEY : SAVE_KEY + '_s' + n);
function defaultSave() {
  return {
    exists: false, unlocked: 0, called: -1, money: 0, perks: {}, hats: { none: true }, hat: 'none', startWeapon: '', weapons: {},
    city: null, seenTut: false, hearts: 1, booster: '', booster2: '', biz: null, arenaBest: 0, bonusCalls: {},
    opts: { scan: true, shake: true, fx: 2 }, vehicles: { car: true }, vehicle: 'car', wanted: 0, achieved: {},
    best: [], grades: [], beaten: false, seenGuide: false, lv19: true, apts: {},
    stats: { deaths: 0, kills: 0, time: 0, casinoWon: 0, casinoLost: 0, gameOvers: 0, stolen: 0, arrests: 0, crimes: 0 },
  };
}
let save = defaultSave();
// Spielstand-Umbauten aus späteren Dateien: f(save, rohdaten)
const SAVE_MIGRATIONS = [];
let saveRaw = null;
function runSaveMigrations(d) { if (!d) return; for (const f of SAVE_MIGRATIONS) { try { f(save, d); } catch (e) { console.error(e); } } }
function loadSave() {
  try {
    const raw = localStorage.getItem(slotKey(SLOT));
    if (raw) {
      const d = JSON.parse(raw);
      save = Object.assign(defaultSave(), d);
      save.stats = Object.assign(defaultSave().stats, d.stats || {});
      if (d.hearts == null) save.hearts = 2 + (save.perks.lives || 0);   // alter Spielstand: Herzen gutschreiben
      // alter Spielstand mit 17 Leveln: das Finale ist jetzt Level 19 (davor 2 neue Level)
      if (!d.lv19) {
        if (save.unlocked >= 17) { save.unlocked = 19; save.called = Math.max(save.called, 18); }
        for (const k of ['best', 'grades']) if (save[k] && save[k][16] != null) { save[k][18] = save[k][16]; save[k][16] = undefined; }
        save.lv19 = true;
      }
      delete save.perks.lives;
      saveRaw = d; runSaveMigrations(d);
    }
  } catch (e) { /* kaputter Spielstand -> neu */ }
}
// im Online-Koop gibt es nur EINEN Spielstand (den vom Host): der Gast schreibt nichts lokal
function persist() {
  save.exists = true;
  if (typeof NET !== 'undefined' && NET.connected) { NET.saveDirty = true; if (NET.mode === 'client') { netKeepOwn(); return; } }
  try { localStorage.setItem(slotKey(SLOT), JSON.stringify(save)); } catch (e) { /* egal */ }
}
function wipeSave() { save = defaultSave(); try { localStorage.removeItem(slotKey(SLOT)); } catch (e) { /* egal */ } }
function useSlot(n) { SLOT = n; try { localStorage.setItem('hpl_slot', n); } catch (e) { /* egal */ } save = defaultSave(); loadSave(); C = null; }
function slotInfo(n) { try { const d = JSON.parse(localStorage.getItem(slotKey(n)) || 'null'); return d && d.exists ? 'LEVEL ' + Math.min((d.unlocked || 0) + 1, LEVELS.length) + '/' + LEVELS.length + ' - ' + (d.money || 0) + '€' : 'NEU'; } catch (e) { return 'NEU'; } }
const perk = (id) => save.perks[id] || 0;
// Perks eines bestimmten Spielers (im Online-Koop hat jeder seine eigenen)
const perkP = (p, id) => (p && p.perks ? p.perks[id] || 0 : perk(id));
// Werkstatt-Umbau an einer Waffe (Magazin, Laser, Dämpfer)
const wmod = (id, m) => !!(id && save.wmods && save.wmods[id] && save.wmods[id][m]);
const heartCap = () => 5 + 2 * perk('heartcap');
loadSave();

// ---------- Text ----------
// Text wird EINMAL mit Umrandung gerendert und dann nur noch als Bild kopiert (viel schneller)
const TXT_CACHE = new Map(), WIDTH_CACHE = new Map();
const MEASURE = document.createElement('canvas').getContext('2d');
function textWidth(str, fontStr) {
  const key = fontStr + '|' + str;
  let w = WIDTH_CACHE.get(key);
  if (w === undefined) { if (WIDTH_CACHE.size > 5000) WIDTH_CACHE.clear(); MEASURE.font = fontStr; w = MEASURE.measureText(str).width; WIDTH_CACHE.set(key, w); }
  return w;
}
function clearTextCache() { TXT_CACHE.clear(); WIDTH_CACHE.clear(); FIT_CACHE.clear(); }
// Text auf eine Breite kürzen (mit ...), Ergebnis wird gemerkt
const FIT_CACHE = new Map();
function fitText(str, maxW, fontStr = '8px ' + FS) {
  const key = maxW + '|' + fontStr + '|' + str;
  let r = FIT_CACHE.get(key);
  if (r === undefined) {
    r = str;
    if (textWidth(str, fontStr) > maxW) { let lo = 0, hi = str.length; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (textWidth(str.slice(0, m) + '...', fontStr) <= maxW) lo = m; else hi = m - 1; } r = str.slice(0, lo) + '...'; }
    if (FIT_CACHE.size > 2000) FIT_CACHE.clear();
    FIT_CACHE.set(key, r);
  }
  return r;
}
function drawGlyphRaw(g, s, x, y, col, out, shadow) {
  if (shadow) { g.fillStyle = shadow; g.fillText(s, x + 2, y + 2); }
  if (out) {
    g.fillStyle = out;
    g.fillText(s, x - 1, y); g.fillText(s, x + 1, y); g.fillText(s, x, y - 1); g.fillText(s, x, y + 1);
  }
  g.fillStyle = col; g.fillText(s, x, y);
}
function drawGlyph(g, s, x, y, col, out, shadow, fontStr, size) {
  const key = fontStr + '|' + s + '|' + col + '|' + out + '|' + (shadow || '');
  let c = TXT_CACHE.get(key);
  if (!c) {
    if (TXT_CACHE.size > 3000) TXT_CACHE.clear();
    const w = Math.ceil(textWidth(s, fontStr)) + 6, h = Math.ceil(size * 1.3) + 6;
    const cv = document.createElement('canvas'); cv.width = Math.max(1, w); cv.height = h;
    const cg = cv.getContext('2d');
    cg.font = fontStr; cg.textBaseline = 'top';
    drawGlyphRaw(cg, s, 1, 1, col, out, shadow);
    c = cv; TXT_CACHE.set(key, c);
  }
  g.drawImage(c, x - 1, y - 1);
}
// o: size, font, color (string|fn(i)), align, outline, shadow, wave, speed, g
function txt(str, x, y, o = {}) {
  const g = o.g || ctx;
  const size = o.size || 8;
  const fontStr = size + 'px ' + (o.font || FB);
  str = String(str);
  const w = textWidth(str, fontStr);
  let sx = x;
  if (o.align === 'center') sx = x - w / 2; else if (o.align === 'right') sx = x - w;
  sx = Math.round(sx); y = Math.round(y);
  const col = o.color || '#fff';
  const out = o.outline === undefined ? '#000' : o.outline;
  if (o.wave || typeof col === 'function') {
    let cx = sx;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const cw = textWidth(ch, fontStr);
      const cy = y + (o.wave ? Math.round(Math.sin(T * (o.speed || 6) + i * 0.6) * o.wave) : 0);
      if (ch !== ' ') drawGlyph(g, ch, Math.round(cx), cy, typeof col === 'function' ? col(i) : col, out, o.shadow, fontStr, size);
      cx += cw;
    }
  } else drawGlyph(g, str, sx, y, col, out, o.shadow, fontStr, size);
  return w;
}
function wrap(text, maxChars) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}
const neon = (i, off = 0) => 'hsl(' + (Math.round(((T * 120 + i * 25 + off) % 360) / 15) * 15) + ',100%,65%)';

// ---------- Assets ----------
const IMG = {};
const SPR = {};
function loadImg(name, src) {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => { IMG[name] = i; res(); };
    i.onerror = () => { IMG[name] = null; res(); };
    i.src = src;
  });
}
// hochwertig verkleinern (mehrstufig), danach Alpha hart machen (wenn erlaubt)
function scaled(img, sx, sy, sw, sh, tw, th) {
  let src = img, cx = sx, cy = sy, cw = sw, ch = sh;
  while (cw / 2 >= tw && ch / 2 >= th) {
    const [c, g] = mkCanvas(Math.ceil(cw / 2), Math.ceil(ch / 2));
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, cx, cy, cw, ch, 0, 0, c.width, c.height);
    src = c; cx = 0; cy = 0; cw = c.width; ch = c.height;
  }
  const [c, g] = mkCanvas(tw, th);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, cx, cy, cw, ch, 0, 0, tw, th);
  try { // klappt nur über http(s); bei file:// bleibt es einfach weich
    const id = g.getImageData(0, 0, tw, th); const d = id.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 100 ? 255 : 0;
    g.putImageData(id, 0, 0);
  } catch (e) { /* tainted canvas */ }
  return c;
}
function tint(src, color) {
  const [c, g] = mkCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function flipV(src) {
  const [c, g] = mkCanvas(src.width, src.height);
  g.translate(0, src.height); g.scale(1, -1); g.drawImage(src, 0, 0);
  return c;
}
function placeholderFace(open) {
  const [c, g] = mkCanvas(51, 77);
  pxEll(g, 25, 30, 18, 22, '#4a3020'); pxEll(g, 25, 36, 15, 18, '#e0a070');
  g.fillStyle = '#222'; g.fillRect(16, 32, 4, 3); g.fillRect(31, 32, 4, 3);
  if (open) pxEll(g, 25, 46, 5, 4, '#7a1020'); else { g.fillStyle = '#a03040'; g.fillRect(20, 46, 11, 2); }
  g.fillStyle = '#333'; g.fillRect(5, 62, 41, 15);
  return c;
}

// Russian Hacker Boi: Uschanka, Hoodie, leuchtende Brille. evil = rote Augen + fieses Grinsen
function drawHackerBoi(g, open, evil) {
  const hood = evil ? '#1a0c10' : '#16261a', hood2 = evil ? '#2a1218' : '#20362a';
  const glow = evil ? '#ff2a3a' : '#39ff7a';
  // Körper / Hoodie
  g.fillStyle = hood; g.fillRect(3, 60, 45, 17); pxEll(g, 25, 62, 23, 7, hood);
  g.fillStyle = hood2; g.fillRect(8, 64, 8, 13); g.fillRect(35, 64, 8, 13);
  g.fillStyle = '#d8d8d8'; g.fillRect(21, 60, 1, 9); g.fillRect(29, 60, 1, 9);
  g.fillStyle = glow; g.fillRect(23, 70, 5, 1); g.fillRect(23, 72, 1, 2); g.fillRect(27, 72, 1, 2); g.fillRect(24, 73, 3, 1);
  // Kapuze
  pxEll(g, 25, 34, 21, 27, hood);
  pxEll(g, 25, 33, 19, 25, hood2);
  pxEll(g, 25, 39, 14, 18, '#070a07');
  // Gesicht im Schatten (Laptop-Licht von unten)
  pxEll(g, 25, 44, 10, 12, evil ? '#8a5a50' : '#a07a5e');
  pxEll(g, 25, 49, 9, 7, evil ? '#a0605a' : '#b48a6a');
  g.fillStyle = evil ? 'rgba(255,40,60,0.18)' : 'rgba(57,255,122,0.16)'; g.fillRect(15, 46, 21, 12);
  // Brille
  g.fillStyle = '#050505'; g.fillRect(14, 37, 23, 6);
  g.fillStyle = glow; g.fillRect(15, 38, 9, 4); g.fillRect(27, 38, 9, 4);
  g.fillStyle = '#ffffff'; g.fillRect(16, 38, 2, 1); g.fillRect(28, 38, 2, 1);
  g.fillStyle = evil ? 'rgba(255,40,60,0.35)' : 'rgba(57,255,122,0.3)'; g.fillRect(13, 36, 25, 1); g.fillRect(13, 43, 25, 1);
  // Uschanka (Pelzmütze mit Ohrenklappen)
  const fur = evil ? '#3a2418' : '#5a3e2a', fur2 = evil ? '#4e3424' : '#7a5a40', fur3 = '#2a1a10';
  pxEll(g, 25, 13, 19, 10, fur);
  for (let i = 0; i < 18; i++) { g.fillStyle = i % 2 ? fur2 : fur3; g.fillRect(8 + Math.floor(hash(i, 3) * 34), 5 + Math.floor(hash(i, 7) * 12), 2, 1); }
  g.fillStyle = fur2; g.fillRect(5, 17, 41, 7); g.fillStyle = fur; g.fillRect(5, 23, 41, 1);
  for (let i = 0; i < 10; i++) { g.fillStyle = fur3; g.fillRect(6 + i * 4, 18 + (i % 2) * 3, 1, 2); }
  g.fillStyle = fur2; g.fillRect(3, 22, 8, 20); g.fillRect(40, 22, 8, 20);
  g.fillStyle = fur3; g.fillRect(4, 40, 6, 2); g.fillRect(41, 40, 6, 2);
  // Headset
  g.fillStyle = '#444'; g.fillRect(9, 34, 4, 8); g.fillRect(38, 34, 4, 8);
  g.fillStyle = glow; g.fillRect(9, 37, 1, 3); g.fillRect(41, 37, 1, 3);
  g.fillStyle = '#2a2a2a'; g.fillRect(11, 42, 2, 9); g.fillRect(12, 50, 5, 2);
  g.fillStyle = '#555'; g.fillRect(17, 49, 3, 3);
  // Mund
  if (evil) {
    if (open) { g.fillStyle = '#2a0005'; g.fillRect(18, 50, 15, 5); g.fillStyle = '#fff'; for (let i = 0; i < 7; i++) g.fillRect(18 + i * 2, 50, 1, 2); }
    else { g.fillStyle = '#2a0005'; g.fillRect(17, 51, 17, 2); g.fillStyle = '#fff'; for (let i = 0; i < 8; i++) g.fillRect(17 + i * 2, 51, 1, 1); g.fillRect(16, 50, 1, 1); g.fillRect(34, 50, 1, 1); }
  } else if (open) { pxEll(g, 25, 52, 4, 3, '#3a0a0a'); g.fillStyle = '#fff'; g.fillRect(22, 50, 7, 1); }
  else { g.fillStyle = '#4a1a14'; g.fillRect(21, 52, 9, 1); g.fillRect(30, 51, 1, 1); }
}

async function loadAssets() {
  await Promise.all([
    loadImg('faceC', 'face_closed.png'),
    loadImg('faceO', 'face_open.png'),
    loadImg('hand', 'hand_point.png'),
  ]);
  for (const k of ['C', 'O']) {
    const im = IMG['face' + k];
    if (im) {
      SPR['port' + k] = scaled(im, 0, 40, 512, 768, 51, 77);       // Dialog-Portrait
      SPR['mini' + k] = scaled(im, 0, 40, 512, 768, 26, 39);       // HUD
      SPR['head' + k] = scaled(im, 36, 70, 440, 560, 14, 18);      // Kopf von oben (Bobblehead!)
    } else {
      SPR['port' + k] = placeholderFace(k === 'O');
      SPR['mini' + k] = SPR['port' + k];
      SPR['head' + k] = SPR['port' + k];
    }
    SPR['portDim' + k] = tint(SPR['port' + k], 'rgba(30,0,50,0.6)');
    SPR['miniRed' + k] = tint(SPR['mini' + k], 'rgba(200,0,30,0.55)');
    SPR['headRed' + k] = tint(SPR['head' + k], 'rgba(255,40,40,0.45)');
  }
  if (IMG.hand) {
    SPR.handBig = scaled(IMG.hand, 0, 108, 170, 112, 42, 28);
    SPR.handMid = scaled(IMG.hand, 0, 108, 170, 112, 26, 17);
  } else {
    const [c, g] = mkCanvas(26, 17); g.fillStyle = '#e0a070'; g.fillRect(4, 6, 14, 8); g.fillRect(18, 6, 8, 3); g.fillStyle = '#222'; g.fillRect(0, 6, 4, 9);
    SPR.handBig = SPR.handMid = c;
  }
  SPR.handMidF = flipV(SPR.handMid);
  SPR.handBigF = flipV(SPR.handBig);
  SPR.handMidGrey = tint(SPR.handMid, 'rgba(40,40,60,0.75)');
  for (const k of ['C', 'O']) {
    let [c, g] = mkCanvas(51, 77); drawHackerBoi(g, k === 'O', false); SPR['hb' + k] = c;
    SPR['hbDim' + k] = tint(c, 'rgba(30,0,50,0.6)');
    [c, g] = mkCanvas(51, 77); drawHackerBoi(g, k === 'O', true); SPR['evil' + k] = c;
    SPR['evilDim' + k] = tint(c, 'rgba(30,0,50,0.6)');
  }
  // Scanlines + Vignette
  const [sc, sg] = mkCanvas(W, H);
  sg.fillStyle = 'rgba(0,0,0,0.13)'; for (let y = 0; y < H; y += 2) sg.fillRect(0, y, W, 1);
  const grd = sg.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.55)');
  sg.fillStyle = grd; sg.fillRect(0, 0, W, H);
  SPR.post = sc;
}
