'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Börse im Handy (App BÖRSE):
//  Aktien, Krypto und Shitcoins mit erfundenen Kursen. Jeder Spielstand
//  hat seine eigenen Kurse (save.stk.seed). Shitcoins können explodieren
//  oder rug-gepullt werden (minus 97-99%, danach tot).
//  Kurse laufen weiter, solange man in der Stadt ist (alle 3 Sekunden).
// =====================================================================
const STK_STEP = 3;      // Sekunden pro Kurs
const STK_FEE = 0.01;    // 1% Gebühr
const STK_CATS = [['aktie', 'AKTIEN'], ['krypto', 'KRYPTO'], ['shit', 'SHITCOINS'], ['depot', 'DEPOT']];
const STK_ASSETS = [
  { id: 'PRTN', name: 'PREITEN AG', cat: 'aktie', base: 120, vol: 0.012, drift: 0.0002 },
  { id: 'SAFT', name: 'SAFT & SÖHNE', cat: 'aktie', base: 65, vol: 0.015, drift: 0.0002 },
  { id: 'TBLD', name: 'TEBLEEDD CORP', cat: 'aktie', base: 300, vol: 0.02, drift: 0.0001 },
  { id: 'DÖNR', name: 'DÖNER HOLDING', cat: 'aktie', base: 40, vol: 0.01, drift: 0.00025 },
  { id: 'ORNG', name: 'ORANGENHAIN AG', cat: 'aktie', base: 85, vol: 0.017, drift: 0.0002 },
  { id: 'BTC', name: 'BITCOIN', cat: 'krypto', base: 6000, vol: 0.03, drift: 0.0003 },
  { id: 'ETH', name: 'ETHEREUM', cat: 'krypto', base: 1800, vol: 0.038, drift: 0.00025 },
  { id: 'SOL', name: 'SOLANA', cat: 'krypto', base: 160, vol: 0.05, drift: 0.0002 },
  { id: 'XRP', name: 'RIPPLE', cat: 'krypto', base: 2, vol: 0.045, drift: 0.0001 },
  { id: 'GUNZ', name: 'GUNZERCOIN', cat: 'shit', base: 0.8, vol: 0.11, drift: 0.0009 },
  { id: 'RHB', name: 'HACKERBOI TOKEN', cat: 'shit', base: 2.5, vol: 0.13, drift: 0.0009 },
  { id: 'MOON', name: 'TOTHEMOON', cat: 'shit', base: 0.3, vol: 0.15, drift: 0.0012 },
  { id: 'PEPE', name: 'PREITENPEPE', cat: 'shit', base: 0.05, vol: 0.17, drift: 0.0012 },
  { id: 'KBAB', name: 'KEBABINU', cat: 'shit', base: 0.6, vol: 0.14, drift: 0.001 },
];
const STK_CACHE = {};

function stkSave() {
  if (!save.stk || typeof save.stk !== 'object') save.stk = {};
  const s = save.stk;
  if (!s.seed) s.seed = (Math.random() * 4294967295) >>> 0 || 1;
  if (!s.held) s.held = {};
  if (!s.paid) s.paid = {};
  if (typeof s.t !== 'number') s.t = 0;
  return s;
}
function stkRnd(seed, a, step, k) {
  let h = (seed ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(step + 7, 0x85ebca6b) ^ Math.imul(k + 3, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// Kursverlauf eines Wertpapiers bis Schritt n (wird zwischengespeichert)
function stkSeries(a, n) {
  const seed = stkSave().seed, key = seed + ':' + a, A = STK_ASSETS[a];
  let s = STK_CACHE[key];
  if (!s) { const p0 = A.base * (0.6 + stkRnd(seed, a, 0, 9) * 0.8); s = STK_CACHE[key] = { p: [p0], rug: -1, pump: [], gen: [0], b0: p0, from: 0 }; }
  while (s.p.length <= n) {
    const st = s.p.length;
    let p = s.p[st - 1];
    // Neustart eines toten Shitcoins nach 20 Minuten (alte Coins sind dann wertlos)
    if (s.rug >= 0 && st - s.rug >= 400) { p = s.b0 = A.base * (0.6 + stkRnd(seed, a, st, 8) * 0.8); s.rug = -1; s.from = st; s.gen.push(st); s.p.push(p); continue; }
    const z = (stkRnd(seed, a, st, 1) + stkRnd(seed, a, st, 2) + stkRnd(seed, a, st, 3) - 1.5) * 2;
    // Richtwert wächst langsam mit; der Kurs pendelt darum (nur Grundrechenarten -> überall gleich)
    const target = s.b0 * (1 + A.drift * (st - s.from)), r = p / target;
    const x = (s.rug >= 0 ? A.vol * 0.25 : A.vol) * z - 0.004 * (r - 1) / (r + 1) * 2;
    p *= 1 + x + x * x / 2;
    const q = stkRnd(seed, a, st, 4);
    if (A.cat === 'shit' && s.rug < 0) {
      if (st - s.from > 40 && q < 0.0005) { p *= 0.01 + stkRnd(seed, a, st, 5) * 0.03; s.rug = st; s.b0 = p; s.from = st; }
      else if (q > 0.9965) { p *= 1.6 + stkRnd(seed, a, st, 6) * 2.4; s.pump.push(st); }
    } else if (A.cat === 'krypto') {
      if (q < 0.003) p *= 0.6 + stkRnd(seed, a, st, 5) * 0.2;
      else if (q > 0.997) p *= 1.3 + stkRnd(seed, a, st, 6) * 0.4;
    } else if (q < 0.002) p *= 0.85; // Aktien: mal eine schlechte Nachricht
    s.p.push(Math.max(0.0001, p));
  }
  return s;
}
function stkGen(a) { const st = stkStep(), g = stkSeries(a, st).gen; let n = 0; for (const x of g) if (x <= st) n++; return n; }
function stkName(a) { const g = STK_ASSETS[a].cat === 'shit' ? stkGen(a) : 1; return STK_ASSETS[a].name + (g > 1 ? ' V' + g : ''); }
// gehaltene Coins einer alten (rug-gepullten) Version verfallen
function stkCheckGen() {
  const s = stkSave(); if (!s.gen) s.gen = {};
  for (const k in s.held) {
    const a = +k; if (STK_ASSETS[a].cat !== 'shit') continue;
    const g = stkGen(a);
    if (!s.gen[a]) s.gen[a] = g;
    else if (s.gen[a] !== g) { delete s.held[a]; delete s.paid[a]; delete s.gen[a]; cityMsg(STK_ASSETS[a].name + ' WURDE NEU GESTARTET - DEINE ALTEN COINS SIND WERTLOS.', 3.5); }
  }
}
const stkStep = () => Math.floor(stkSave().t / STK_STEP);
const stkPrice = (a) => stkSeries(a, stkStep()).p[stkStep()];
function stkHist(a, n) { const st = stkStep(); return stkSeries(a, st).p.slice(Math.max(0, st - n + 1), st + 1); }
function stkRugged(a) { const s = stkSeries(a, stkStep()); return s.rug >= 0 && s.rug <= stkStep(); }
const stkR4 = (n) => Math.floor(n * 10000 + 1e-6) / 10000;
function stkAmt(n) { return n >= 100 ? String(Math.floor(n)) : String(+n.toFixed(4)).replace('.', ','); }
function stkFmt(p) {
  if (!p) return '0€';
  if (p >= 10000) return Math.round(p).toLocaleString('de-DE') + '€';
  if (p >= 100) return Math.round(p) + '€';
  if (p >= 1) return p.toFixed(2).replace('.', ',') + '€';
  return p.toFixed(p >= 0.01 ? 3 : 5).replace('.', ',') + '€';
}
function stkDepot() { const s = stkSave(); let v = 0; for (const k in s.held) v += s.held[k] * stkPrice(+k); return v; }

function stkBuy(a, part) {
  const s = stkSave(), each = stkPrice(a) * (1 + STK_FEE);
  const n = stkR4((save.money * part) / each);
  if (n <= 0 || Math.ceil(each * n) > save.money) { cityMsg('ZU WENIG GELD FÜR ' + STK_ASSETS[a].name + '!', 2); Sound.play('click'); return; }
  const cost = Math.ceil(each * n);
  save.money -= cost; if (!s.gen) s.gen = {}; if (STK_ASSETS[a].cat === 'shit') s.gen[a] = stkGen(a); s.held[a] = stkR4((s.held[a] || 0) + n + 1e-9); s.paid[a] = (s.paid[a] || 0) + cost;
  persist(); Sound.play('cash');
  cityMsg(stkAmt(n) + 'X ' + STK_ASSETS[a].name + ' GEKAUFT (-' + cost + '€)', 2.5);
}
function stkSell(a, part) {
  const s = stkSave(), h = s.held[a] || 0, n = part >= 1 ? h : stkR4(h * part);
  if (n <= 0) return;
  const got = Math.floor(stkPrice(a) * n * (1 - STK_FEE));
  s.paid[a] = Math.round((s.paid[a] || 0) * (1 - n / h));
  s.held[a] = stkR4(h - n + 1e-9); if (s.held[a] <= 0) { delete s.held[a]; delete s.paid[a]; }
  save.money += got; persist(); Sound.play('cash');
  cityMsg(stkAmt(n) + 'X ' + STK_ASSETS[a].name + ' VERKAUFT (+' + got + '€)', 2.5);
}

// Kurse laufen in der Stadt weiter; Rug Pull / Pump bei eigenen Coins melden
function stkAdvance(dt) {
  const s = stkSave(), before = stkStep();
  s.t += dt;
  const st = stkStep();
  if (st === before) return;
  stkCheckGen();
  for (const k in s.held) {
    const a = +k, A = STK_ASSETS[a], ser = stkSeries(a, st);
    if (A.cat !== 'shit') continue;
    if (ser.rug === st) { cityMsg('RUG PULL! ' + stkName(a) + ' IST ABGESTÜRZT (-98%)! DIE ENTWICKLER SIND WEG.', 4); Sound.play('click'); }
    else if (ser.pump.includes(st)) { cityMsg(A.name + ' GEHT DURCH DIE DECKE! X' + (ser.p[st] / ser.p[st - 1]).toFixed(1), 3); Sound.play('cash'); }
  }
}
CITY_HOOKS.update.push(stkAdvance);

// ---------- Handy-App ----------
function stkChart(a, x, y, w, h, n) {
  const hist = stkHist(a, n);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y, w, h);
  if (hist.length < 2) return;
  const lo = Math.min(...hist), hi = Math.max(...hist), sp = hi - lo || 1;
  ctx.strokeStyle = hist[hist.length - 1] >= hist[0] ? '#7dff7a' : '#ff6a6a'; ctx.lineWidth = 1; ctx.beginPath();
  hist.forEach((p, i) => { const px = x + 1 + (i / (hist.length - 1)) * (w - 2), py = y + h - 2 - ((p - lo) / sp) * (h - 4); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
  ctx.stroke();
}
function stkChange(a, n) { const h = stkHist(a, n); return h.length > 1 ? (h[h.length - 1] / h[0] - 1) * 100 : 0; }

function stkApp(P, x, y, w, h, on) {
  const s = stkSave(), now = performance.now();
  if (P.stkLast) stkAdvance(Math.min(0.1, (now - P.stkLast) / 1000)); // Kurse laufen auch bei offenem Handy
  P.stkLast = now;
  stkCheckGen();
  if (P.sub && typeof P.sub.a === 'number') return stkDetail(P, P.sub.a, x, y, w, on);
  if (!P.stkTab) P.stkTab = 'aktie';
  // Reiter
  const tw = w / STK_CATS.length;
  STK_CATS.forEach(([id, name], i) => {
    const tx = x + i * tw, act = P.stkTab === id, hov = mouse.x >= tx && mouse.x < tx + tw && mouse.y >= y - 2 && mouse.y < y + 10;
    ctx.fillStyle = act ? '#ffd23f' : hov ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'; ctx.fillRect(tx + 1, y - 2, tw - 2, 11);
    txt(fitText(name, tw - 3), tx + tw / 2, y, { font: FS, align: 'center', color: act ? '#000000' : '#ffffff', outline: '' });
    if (hov && on && mouse.pl) { P.stkTab = id; Sound.play('blip', true); }
  });
  if (on && (pressed.KeyQ || pressed.KeyE)) {
    const i = STK_CATS.findIndex((c) => c[0] === P.stkTab);
    P.stkTab = STK_CATS[(i + (pressed.KeyE ? 1 : STK_CATS.length - 1)) % STK_CATS.length][0]; Sound.play('blip', true);
  }
  const dep = stkDepot();
  phLine('GELD ' + save.money + '€  DEPOT ' + stkFmt(dep), x, y + 13, '#ffd23f', w);
  const ids = STK_ASSETS.map((_, i) => i).filter((i) => (P.stkTab === 'depot' ? s.held[i] > 0 : STK_ASSETS[i].cat === P.stkTab));
  if (P.stkTab === 'shit') phLine('ACHTUNG: KANN X4 MACHEN ODER RUG-PULLEN!', x, y + 24, '#ff9a6a', w);
  if (!ids.length) { phLine('NOCH NICHTS GEKAUFT.', x, y + 40, '#888888'); return; }
  const y0 = y + 40;
  phList('stk_' + P.stkTab, ids.map((i) => {
    const A = STK_ASSETS[i], rug = A.cat === 'shit' && stkRugged(i);
    return { label: A.id + (A.cat === 'shit' && stkGen(i) > 1 ? stkGen(i) : '') + (rug ? ' (TOT)' : '') + ' ' + stkFmt(stkPrice(i)), color: rug ? '#888888' : '#ffffff', act: () => { P.sub = { a: i }; Sound.play('select'); } };
  }), x, y0, w, 9);
  ids.slice(0, 9).forEach((i, r) => {
    const ch = stkChange(i, 20);
    stkChart(i, x + w - 60, y0 + r * 13 - 1, 24, 10, 24);
    txt((ch >= 0 ? '+' : '') + ch.toFixed(1) + '%', x + w, y0 + r * 13, { font: FS, align: 'right', color: ch >= 0 ? '#7dff7a' : '#ff6a6a', outline: '' });
  });
  phLine('[Q]/[E] ODER KLICK: KATEGORIE', x, y + 160, '#888888', w);
}
function stkDetail(P, a, x, y, w, on) {
  const s = stkSave(), A = STK_ASSETS[a], p = stkPrice(a), h = s.held[a] || 0, rug = A.cat === 'shit' && stkRugged(a);
  phLine(stkName(a) + ' (' + A.id + ')', x, y, '#ffe14d', w);
  const ch = stkChange(a, 20);
  phLine(stkFmt(p), x, y + 11, '#ffffff');
  txt((ch >= 0 ? '+' : '') + ch.toFixed(1) + '% (1 MIN)', x + w, y + 11, { font: FS, align: 'right', color: ch >= 0 ? '#7dff7a' : '#ff6a6a', outline: '' });
  stkChart(a, x, y + 22, w, 40, 80);
  if (rug) txt('RUG PULL!', x + w / 2, y + 36, { font: FS, align: 'center', color: '#ff3a3a' });
  if (h) {
    const val = h * p, paid = s.paid[a] || 0, gain = val - paid;
    phLine('DU HAST ' + stkAmt(h) + ' = ' + stkFmt(val), x, y + 66, '#ffd23f', w);
    phLine('GEWINN: ' + (gain >= 0 ? '+' : '') + Math.round(gain) + '€', x, y + 76, gain >= 0 ? '#7dff7a' : '#ff6a6a', w);
  } else phLine('GELD: ' + save.money + '€', x, y + 66, '#ffd23f', w);
  phList('stkd', [
    { label: 'KAUFEN MIT 10% GELD', disabled: rug, act: () => stkBuy(a, 0.1) },
    { label: 'KAUFEN MIT 50% GELD', disabled: rug, act: () => stkBuy(a, 0.5) },
    { label: 'ALL IN (100%)', disabled: rug, act: () => stkBuy(a, 1) },
    { label: 'HÄLFTE VERKAUFEN', disabled: !h, act: () => stkSell(a, 0.5) },
    { label: 'ALLES VERKAUFEN', disabled: !h, act: () => stkSell(a, 1) },
  ], x, y + 92, w, 5);
  phLine('GEBÜHR 1% PRO KAUF/VERKAUF', x, y + 160, '#888888', w);
}

(function stkInstall() {
  const old = PHONE_APPS.find((q) => q.id === 'market');
  if (old) old.name = 'SAFTKURS';
  PHONE_APPS.push({
    id: 'stocks', name: 'BÖRSE', title: 'PREITEN-BÖRSE', col: '#0a6a3a',
    draw: (g, x, y) => {
      g.fillStyle = '#062a18'; g.fillRect(x + 4, y + 5, 20, 18);
      g.fillStyle = '#ff6a6a'; g.fillRect(x + 7, y + 12, 3, 7); g.fillStyle = '#7dff7a'; g.fillRect(x + 12, y + 9, 3, 8); g.fillRect(x + 17, y + 6, 3, 9);
      g.fillStyle = '#ffd23f'; g.fillRect(x + 7, y + 20, 14, 1);
    },
  });
  PHONE_DRAW.stocks = stkApp;
})();
