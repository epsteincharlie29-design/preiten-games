'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Handy (Taste H) mit Apps - wie in den großen
//  Spielen: Nachrichten, Karte + Navi, Jobs, Lieferdienst, Preise, Bank,
//  Taxi, Kontakte, Imperium-Übersicht, Musik, Erfolge, Hilfe
// =====================================================================
const PHONE_APPS = [
  { id: 'sms', name: 'SMS', title: 'NACHRICHTEN', col: '#3ac85a' }, { id: 'map', name: 'KARTE', col: '#3f8bff' }, { id: 'jobs', name: 'JOBS', col: '#e8a020' }, { id: 'bounty', name: 'KOPFGELD', col: '#c41f2a' },
  { id: 'deliv', name: 'LIEFERUNG', title: 'LIEFERDIENST', col: '#a07040' }, { id: 'price', name: 'PREISE', col: '#e05a9a' }, { id: 'market', name: 'BÖRSE', title: 'SAFT-BÖRSE', col: '#1a8a8a' }, { id: 'bank', name: 'BANK', col: '#2a9a6a' },
  { id: 'taxi', name: 'TAXI', col: '#d8b020' }, { id: 'contacts', name: 'KONTAKTE', col: '#3ab0c8' }, { id: 'lawyer', name: 'ANWALT', title: 'ANWALT DR. SCHLAU', col: '#5a4a8a' }, { id: 'tasks', name: 'AUFGABEN', title: 'TAGESAUFGABEN', col: '#e8641a' },
  { id: 'profile', name: 'PROFIL', title: 'LIL-PROFIL & SKILLS', col: '#ff3fa4' }, { id: 'empire', name: 'IMPERIUM', col: '#e86a1a' }, { id: 'music', name: 'MUSIK', col: '#9a3aff' }, { id: 'help', name: 'HILFE', col: '#6a6a7a' },
];
const PH = { x: W / 2 - 92, y: 12, w: 184, h: 246 };
function openPhone() { C.phone = { app: null, sel: 0, at: T }; Sound.play('sms'); if (!C.offers) makeOffers(); }
function phoneBack() { const P = C.phone; if (P.sub) P.sub = null; else if (P.app) { P.app = null; } else C.phone = null; Sound.play('blip', true); }
function phoneBadge(id) {
  const ap = PHONE_APPS.find((q) => q.id === id);
  if (ap && ap.badge) return extCall(ap.badge) || 0;
  const b = B();
  if (id === 'sms') return b.orders.length;
  if (id === 'jobs') return C.job ? 1 : jobBlocked() ? 0 : (C.offers || []).length;
  if (id === 'deliv') return (b.deliveries || []).length;
  if (id === 'bounty') return C.bounty ? 1 : 0;
  if (id === 'tasks') return (b.tasks || []).filter((q) => !q.done).length;
  if (id === 'profile') return (save.lil && save.lil.pts) || 0;
  return 0;
}
// kleine Pixel-Symbole für die Apps (28x28)
function drawAppIcon(id, x, y, col) {
  const g = ctx;
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + 2, y + 2, 28, 28);
  g.fillStyle = col; g.fillRect(x, y, 28, 28);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, 28, 3);
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, y + 25, 28, 3);
  const ap = PHONE_APPS.find((q) => q.id === id);
  if (ap && ap.draw) { extCall(ap.draw, g, x, y); return; }   // eigenes Symbol (28x28)
  const W_ = '#ffffff';
  switch (id) {
    case 'sms': g.fillStyle = W_; g.fillRect(x + 5, y + 7, 18, 11); g.fillRect(x + 8, y + 18, 4, 3); g.fillStyle = col; g.fillRect(x + 8, y + 10, 12, 1); g.fillRect(x + 8, y + 13, 8, 1); break;
    case 'map': g.fillStyle = '#d8e8c0'; g.fillRect(x + 4, y + 6, 20, 16); g.fillStyle = '#7a9a5a'; g.fillRect(x + 10, y + 6, 1, 16); g.fillRect(x + 17, y + 6, 1, 16); g.fillStyle = '#e01b3c'; pxEll(g, x + 14, y + 11, 3, 3, '#e01b3c'); g.fillRect(x + 13, y + 13, 2, 5); break;
    case 'jobs': g.fillStyle = '#5a3a1a'; g.fillRect(x + 5, y + 10, 18, 12); g.fillRect(x + 10, y + 6, 8, 4); g.fillStyle = col; g.fillRect(x + 12, y + 8, 4, 2); g.fillStyle = '#ffd23f'; g.fillRect(x + 12, y + 14, 4, 3); break;
    case 'deliv': g.fillStyle = '#c8a070'; g.fillRect(x + 5, y + 8, 18, 14); g.fillStyle = '#6a4a2a'; g.fillRect(x + 5, y + 13, 18, 2); g.fillRect(x + 13, y + 8, 2, 14); break;
    case 'price': g.fillStyle = W_; g.fillRect(x + 6, y + 8, 14, 12); g.fillRect(x + 20, y + 11, 3, 6); g.fillStyle = col; g.fillRect(x + 8, y + 10, 2, 2); txt('€', x + 15, y + 9, { font: FS, align: 'center', color: col, outline: '' }); break;
    case 'bank': pxEll(g, x + 14, y + 14, 9, 9, '#ffd23f'); pxEll(g, x + 14, y + 14, 7, 7, '#e8b020'); txt('€', x + 14, y + 10, { align: 'center', color: '#8a5a00', outline: '' }); break;
    case 'taxi': g.fillStyle = '#ffd23f'; g.fillRect(x + 4, y + 11, 20, 8); g.fillRect(x + 8, y + 7, 12, 5); g.fillStyle = '#111'; g.fillRect(x + 6, y + 19, 4, 3); g.fillRect(x + 18, y + 19, 4, 3); g.fillStyle = '#1d2a4a'; g.fillRect(x + 10, y + 8, 8, 3); g.fillStyle = '#111'; g.fillRect(x + 12, y + 5, 4, 2); break;
    case 'contacts': pxEll(g, x + 14, y + 10, 4, 4, W_); g.fillStyle = W_; g.fillRect(x + 7, y + 16, 14, 7); break;
    case 'empire': g.fillStyle = '#e8e8f0'; g.fillRect(x + 5, y + 12, 18, 11); g.fillRect(x + 17, y + 5, 4, 8); g.fillStyle = '#ff9a1a'; g.fillRect(x + 8, y + 15, 4, 4); g.fillRect(x + 15, y + 15, 4, 4); g.fillStyle = '#aaa'; g.fillRect(x + 18, y + 3, 2, 2); break;
    case 'music': g.fillStyle = W_; g.fillRect(x + 16, y + 6, 2, 13); g.fillRect(x + 16, y + 6, 6, 2); pxEll(g, x + 13, y + 19, 4, 3, W_); break;
    case 'ach': g.fillStyle = '#ffe14d'; g.fillRect(x + 8, y + 6, 12, 8); g.fillRect(x + 12, y + 14, 4, 4); g.fillRect(x + 9, y + 18, 10, 3); g.fillStyle = col; g.fillRect(x + 12, y + 8, 4, 3); break;
    case 'help': txt('?', x + 14, y + 7, { size: 16, align: 'center', color: W_, outline: '' }); break;
    case 'bounty': g.fillStyle = '#e8dcc0'; g.fillRect(x + 6, y + 4, 16, 20); g.fillStyle = '#5a3a1a'; g.fillRect(x + 8, y + 6, 12, 2); pxEll(g, x + 14, y + 14, 4, 4, '#3a2a1a'); g.fillStyle = '#c41f2a'; g.fillRect(x + 8, y + 20, 12, 2); break;
    case 'market': g.fillStyle = '#0a3a3a'; g.fillRect(x + 4, y + 5, 20, 18); g.strokeStyle = '#7dff7a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 6, y + 19); g.lineTo(x + 11, y + 13); g.lineTo(x + 15, y + 16); g.lineTo(x + 22, y + 8); g.stroke(); g.lineWidth = 1; break;
    case 'lawyer': g.fillStyle = W_; g.fillRect(x + 13, y + 5, 2, 18); g.fillRect(x + 6, y + 8, 16, 2); g.fillRect(x + 9, y + 22, 10, 2); pxEll(g, x + 8, y + 15, 3, 2, '#ffd23f'); pxEll(g, x + 20, y + 15, 3, 2, '#ffd23f'); break;
    case 'tasks': g.fillStyle = W_; g.fillRect(x + 6, y + 4, 16, 20); for (let k = 0; k < 3; k++) { g.fillStyle = k < 2 ? '#3ac85a' : '#aaa'; g.fillRect(x + 8, y + 7 + k * 6, 3, 3); g.fillStyle = '#555'; g.fillRect(x + 13, y + 8 + k * 6, 7, 1); } break;
    case 'profile': pxEll(g, x + 14, y + 10, 5, 5, '#f0c8a0'); g.fillStyle = '#2b2b33'; g.fillRect(x + 7, y + 17, 14, 7); txt(String((save.lil && save.lil.lv) || 1), x + 22, y + 2, { font: FS, align: 'center', color: '#ffe14d', outline: '#000' }); break;
  }
}
// ---------- Handy zeichnen ----------
function drawPhone() {
  const P = C.phone, { x, y, w, h } = PH;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0c0c12'; ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(x - 5, y - 5, w + 10, 1); ctx.fillRect(x - 5, y - 5, 1, h + 10);
  // Hintergrund (Synthwave)
  const grd = ctx.createLinearGradient(0, y, 0, y + h);
  grd.addColorStop(0, '#1a0a3a'); grd.addColorStop(0.6, '#4a1a5a'); grd.addColorStop(1, '#c8406a');
  ctx.fillStyle = grd; ctx.fillRect(x, y, w, h);
  // Statusleiste
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y, w, 12);
  txt(cityClock(), x + 5, y + 2, { font: FS, color: '#ffffff', outline: '' });
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i < 3 ? '#ffffff' : '#777'; ctx.fillRect(x + w - 40 + i * 4, y + 8 - i * 2, 3, 2 + i * 2); }
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x + w - 20, y + 3, 13, 6); ctx.fillStyle = '#7dff7a'; ctx.fillRect(x + w - 19, y + 4, 9, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + w - 7, y + 5, 1, 2);
  ctx.fillStyle = '#0c0c12'; ctx.fillRect(x + w / 2 - 14, y, 28, 5);
  const on = uiActive() && T - P.at > 0.12;
  if (!P.app) phoneHome(P, on);
  else {
    const app = PHONE_APPS.find((a) => a.id === P.app);
    ctx.fillStyle = app.col; ctx.fillRect(x, y + 12, w, 16);
    txt(app.title || app.name, x + w / 2, y + 16, { font: FS, align: 'center', color: '#ffffff' });
    ctx.fillStyle = 'rgba(8,4,20,0.82)'; ctx.fillRect(x, y + 28, w, h - 40);
    PHONE_DRAW[P.app](P, x + 6, y + 32, w - 12, h - 48, on);
  }
  // Home-Leiste
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + w / 2 - 20, y + h - 6, 40, 2);
  txt(P.app ? '[ESC] ZURÜCK   [H] ZU' : '[ENTER] ÖFFNEN   [H]/[ESC] ZU', x + w / 2, y + h - 17, { font: FS, align: 'center', color: '#bbbbbb' });
  if (on && pressed.KeyH) { C.phone = null; Sound.play('blip', true); }
  else if (on && pressed.Escape) phoneBack();
}
function phoneHome(P, on) {
  // bis 16 Apps: 4 Spalten; mehr: 5 Spalten (ab 21 Apps werden die Zeilen enger)
  const cols = PHONE_APPS.length > 16 ? 5 : 4, rows = Math.ceil(PHONE_APPS.length / cols);
  const { x, y, w } = PH, cw = cols === 5 ? 35 : 44, ch = rows > 4 ? Math.floor(196 / rows) : 48, x0 = x + (w - cw * cols) / 2, y0 = y + 22;
  PHONE_APPS.forEach((a, i) => {
    const cx = x0 + (i % cols) * cw, cy = y0 + Math.floor(i / cols) * ch, ix = cx + (cw - 28) / 2, iy = cy + 2;
    const hov = mouse.x >= cx && mouse.x < cx + cw && mouse.y >= cy && mouse.y < cy + ch;
    if (hov && on && (mouse.moved || mouse.pl)) P.sel = i;
    if (P.sel === i) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(cx + 2, cy, cw - 4, ch - 2); }
    drawAppIcon(a.id, ix, iy, a.col);
    const n = phoneBadge(a.id);
    if (n) { pxEll(ctx, ix + 27, iy + 1, 5, 5, '#e01b3c'); txt(String(n), ix + 27, iy - 3, { font: FS, align: 'center', color: '#ffffff', outline: '' }); }
    txt(cols > 4 ? fitText(a.name, cw) : a.name, cx + cw / 2, cy + 33, { font: FS, align: 'center', color: P.sel === i ? '#ffe14d' : '#ffffff' });
    if (hov && on && mouse.pl) phoneOpenApp(a.id);
  });
  if (!on) return;
  const N = PHONE_APPS.length;
  if (pressed.ArrowRight || pressed.KeyD) P.sel = (P.sel + 1) % N;
  if (pressed.ArrowLeft || pressed.KeyA) P.sel = (P.sel + N - 1) % N;
  if (pressed.ArrowDown || pressed.KeyS) P.sel = (P.sel + cols) % N;
  if (pressed.ArrowUp || pressed.KeyW) P.sel = (P.sel + N * cols - cols) % N;
  if (pressed.Enter || pressed.Space) phoneOpenApp(PHONE_APPS[P.sel].id);
}
function phoneOpenApp(id) {
  Sound.play('select');
  const ap = PHONE_APPS.find((q) => q.id === id);
  if (ap && ap.open) { C.phone = null; extCall(ap.open); return; }   // App öffnet etwas Eigenes (Handy geht zu)
  if (id === 'map') { C.phone = null; C.map = { at: T }; return; }
  if (id === 'help') { C.phone = null; openGuide('city'); return; }
  C.phone.app = id; C.phone.sub = null; C.phone.at = T;
}
// Liste im Handy (linksbündig, scrollt)
function phList(id, items, x, y, w, rows) { return listMenu('ph_' + id, items, x + 12, y, 13, { align: 'left', w: w / 2 - 12, max: rows || 10, font: FS }); }
function phLine(t, x, y, col, w) { txt(fitText(t, w || 168), x, y, { font: FS, color: col || '#ffffff' }); }
const PHONE_DRAW = {};

// ---------- Nachrichten (Bestellungen + Verlauf) ----------
PHONE_DRAW.sms = (P, x, y, w, h) => {
  const b = B();
  if (P.sub && P.sub.o) {
    const o = P.sub.o;
    if (!b.orders.includes(o)) { P.sub = null; return; }
    const left = Math.max(0, Math.ceil((o.until - bizNow()) / 1000)), have = slotsCount(bag(), 'j:' + o.prod);
    phLine('VON: ' + o.name, x, y, '#ffe14d');
    wrap(o.qty + 'X ' + productName(o.prod), 30).slice(0, 2).forEach((l, i) => phLine(l, x, y + 12 + i * 10));
    phLine('BEZAHLUNG: ' + o.pay + '€', x, y + 36, '#7dff7a');
    phLine('ZEIT: ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), x, y + 46);
    phLine('IN DER TASCHE: ' + have + '/' + o.qty, x, y + 56, have >= o.qty ? '#7dff7a' : '#ff9a6a');
    if (o.line) wrap('"' + o.line + '"', 30).slice(0, 2).forEach((l, i) => phLine(l, x, y + 68 + i * 10, '#cccccc'));
    phList('smsd', [
      { label: 'NAVI ZUM KUNDEN', act: () => { C.wp = { x: o.x, y: o.y, label: o.name }; cityMsg('NAVI GESETZT: ' + o.name + '. FOLG DEM PFEIL!', 2.5); C.phone = null; } },
      { label: 'ABLEHNEN', act: () => { b.orders = b.orders.filter((q) => q !== o); b.rep = Math.max(0, b.rep - 1); bizNotify('BESTELLUNG VON ' + o.name + ' ABGELEHNT.', '#ff9a6a'); P.sub = null; persist(); } },
      { label: 'ZURÜCK', act: () => { P.sub = null; } },
    ], x, y + 96, w);
    return;
  }
  if (P.sub && P.sub.log) {
    bizLog.slice(0, 16).forEach((n, i) => phLine(n.text, x, y + i * 10, n.col));
    if (!bizLog.length) phLine('NOCH KEINE NACHRICHTEN.', x, y, '#888888');
    return;
  }
  const items = b.orders.map((o) => ({ label: fitText(o.name + ': ' + o.qty + 'X ' + productName(o.prod), 150), color: slotsCount(bag(), 'j:' + o.prod) >= o.qty ? '#7dff7a' : '#ffffff', act: () => { P.sub = { o }; } }));
  if (!items.length) phLine('KEINE BESTELLUNGEN. VERKAUF MEHR, DANN', x, y, '#888888'), phLine('MELDEN SICH KUNDEN PER SMS.', x, y + 10, '#888888');
  items.push({ label: 'VERLAUF ANSEHEN', act: () => { P.sub = { log: true }; } });
  phList('sms', items, x, y + (b.orders.length ? 4 : 28), w);
};

// ---------- Jobs ----------
PHONE_DRAW.jobs = (P, x, y, w) => {
  const why = jobBlocked(), d = jobDayInfo();
  phLine('HEUTE: ' + d.n + '/' + JOBS_PER_DAY + ' JOBS', x, y, '#ffe14d');
  if (C.job) {
    wrap(jobHudText(), 30).slice(0, 3).forEach((l, i) => phLine(l, x, y + 14 + i * 10, '#7dff7a'));
    phList('jobs1', [{ label: 'JOB ABBRECHEN', act: () => endJob(false, 'ABGEBROCHEN.') }, { label: 'NAVI ZUM ZIEL', act: () => { const t = jobTarget(); if (t) { C.wp = { x: t.x, y: t.y }; C.phone = null; } } }], x, y + 54, w);
    return;
  }
  if (why) { wrap(why, 30).forEach((l, i) => phLine(l, x, y + 14 + i * 10, '#ff9a6a')); return; }
  const items = (C.offers || []).map((o) => ({ label: JOB_TYPES[o.type].name.slice(0, 16) + ' ' + o.pay + '€', hint: JOB_TYPES[o.type].desc, act: () => startJob(o) }));
  const sel = phList('jobs', items, x, y + 16, w);
  const it = items[sel];
  if (it) wrap(it.hint, 30).forEach((l, i) => phLine(l, x, y + 80 + i * 10, '#cccccc'));
  phLine('NEUE JOBS IN ' + Math.max(0, Math.ceil(C.offerT || 0)) + ' S', x, y + 140, '#888888');
};

// ---------- Lieferdienst: bestellen und in eine Lieferkiste liefern lassen ----------
const DELIVERY_FEE = 1.2, DELIVERY_MS = 60000;
function deliveryCatalog() {
  const b = B(), out = [];
  for (const k in FRUITS) if (fruitUnlocked(k) && !FRUITS[k].market) out.push({ k: 's:' + k, n: 25, price: Math.round(FRUITS[k].seed * 25 * 0.9) });
  for (const k in INGREDIENTS) if (ingUnlocked(k)) out.push({ k: 'i:' + k, n: 20, price: Math.round(INGREDIENTS[k].price * 20 * 0.9) });
  for (const id in EQUIP) if (b.rank >= EQUIP[id].rank) out.push({ k: 'e:' + id, n: 1, price: EQUIP[id].price });
  return out;
}
PHONE_DRAW.deliv = (P, x, y, w) => {
  const b = B(), sites = Object.keys(SITES).filter(ownsSite);
  P.site = sites.includes(P.site) ? P.site : sites[0];
  if (P.sub && P.sub.list) {
    const items = (b.deliveries || []).map((d) => ({ label: fitText(d.n + 'X ' + itemName(d.k), 110) + ' ' + Math.max(0, Math.ceil((d.at - bizNow()) / 1000)) + 'S', color: '#c8a070' }));
    if (!items.length) phLine('KEINE LIEFERUNGEN UNTERWEGS.', x, y, '#888888');
    else phList('dlist', items, x, y, w);
    return;
  }
  phLine('LIEFERN AN: < ' + SITES[P.site].name + ' >', x, y, '#ffe14d');
  phLine('+20% GEBÜHR, KOMMT IN ' + DELIVERY_MS / 1000 + ' S IN DIE LIEFERKISTE.', x, y + 10, '#cccccc');
  const items = deliveryCatalog().map((c) => {
    const price = Math.max(c.price + 30, Math.round(c.price * DELIVERY_FEE));
    return { label: fitText(c.n + 'X ' + itemName(c.k), 116) + ' ' + price + '€', act: () => {
      if (save.money < price) { cityMsg('ZU WENIG GELD! (' + price + '€)', 2); Sound.play('click'); return; }
      save.money -= price; (b.deliveries = b.deliveries || []).push({ site: P.site, k: c.k, n: c.n, at: bizNow() + DELIVERY_MS }); persist();
      Sound.play('cash'); cityMsg('BESTELLT! ' + c.n + 'X ' + itemName(c.k) + ' KOMMT IN ' + DELIVERY_MS / 1000 + ' S ZUR ' + SITES[P.site].name + '.', 3);
    } };
  });
  items.unshift({ label: 'UNTERWEGS (' + (b.deliveries || []).length + ')', act: () => { P.sub = { list: true }; } });
  phList('deliv', items, x, y + 26, w, 11);
  if (uiActive() && sites.length > 1 && (pressed.ArrowRight || pressed.KeyD || pressed.ArrowLeft || pressed.KeyA)) { P.site = cycle(sites, P.site, pressed.ArrowLeft || pressed.KeyA ? -1 : 1); Sound.play('blip', true); }
};
// Lieferungen ankommen lassen (aus bizTick, jede Sekunde)
function deliveryTick() {
  const b = B();
  if (!b.deliveries || !b.deliveries.length) return;
  b.deliveries = b.deliveries.filter((d) => {
    if (d.at > BIZ_NOW || !ownsSite(d.site)) return true;
    const got = slotsAdd(siteBox(d.site), d.k, d.n);
    d.n -= got;
    if (d.n <= 0) { bizNotify('LIEFERUNG ANGEKOMMEN: ' + itemName(d.k) + ' IN DER LIEFERKISTE (' + SITES[d.site].name + ')', '#c8a070'); Sound.play('sms'); return false; }
    if (got) bizNotify('LIEFERKISTE (' + SITES[d.site].name + ') VOLL! RÄUM SIE LEER.', '#ff9a6a');
    d.at = BIZ_NOW + 15000;
    return true;
  });
}

// ---------- Preise: eigener Verkaufspreis pro Saft (70% - 160%) ----------
PHONE_DRAW.price = (P, x, y, w) => {
  const b = B(), keys = [...new Set(slotsKeys(bag(), 'j').concat(storeKeys('j')))].map((k) => k.slice(2)).sort((p, q) => productValue(q) - productValue(p));
  phLine('TEURER = MEHR GELD, ABER WENIGER KÄUFER.', x, y, '#cccccc');
  if (!keys.length) { phLine('DU HAST NOCH KEINE SÄFTE.', x, y + 16, '#888888'); return; }
  const items = keys.map((id) => ({ id, label: fitText(productName(id), 104) + ' ' + Math.round(priceMult(id) * 100) + '%', act: () => setPrice(id, 0.1, true) }));
  const sel = phList('price', items, x, y + 14, w, 10);
  const it = items[sel];
  if (it) {
    phLine('WERT ' + productValue(it.id) + '€  ->  DEIN PREIS ' + productPrice(it.id) + '€', x, y + 162, '#7dff7a');
    phLine('< > ODER ENTER = PREIS ÄNDERN', x, y + 172, '#888888');
    if (uiActive()) { if (pressed.ArrowRight || pressed.KeyD) setPrice(it.id, 0.1); if (pressed.ArrowLeft || pressed.KeyA) setPrice(it.id, -0.1); }
  }
};
function setPrice(id, d, wrapAround) {
  const b = B(); b.price = b.price || {};
  let m = Math.round((priceMult(id) + d) * 10) / 10;
  if (m > 1.6) m = wrapAround ? 0.7 : 1.6; if (m < 0.7) m = 0.7;
  if (Math.abs(m - 1) < 0.01) delete b.price[id]; else b.price[id] = m;
  Sound.play('blip', true); persist();
}

// ---------- Bank ----------
PHONE_DRAW.bank = (P, x, y, w) => {
  const b = B();
  const rows = [['KONTO', save.money + '€', '#7dff7a'], ['KASSE (FABRIK)', b.register + '€', '#ffd23f'], ['MIETE', '+' + rentPerMin() + '€/MIN', '#ffd23f'],
    ['SÄFTE VERKAUFT', b.sold, '#ffffff'], ['SAFT VERDIENT', b.earned + '€', '#7dff7a'], ['SCHUTZGELD AN RHB', b.totalCut + '€', '#ff6a6a'], ['WOHNUNGEN', '+' + Math.round(aptBonus() * 100) + '%/AUFTRAG', '#ff9ad5']];
  rows.forEach(([k, v, c], i) => { phLine(k, x, y + i * 11, '#aaaaaa'); txt(String(v), x + w, y + i * 11, { font: FS, align: 'right', color: c }); });
  const fee = Math.ceil(b.register * 0.05);
  phList('bank', [{ label: 'KASSE ÜBERWEISEN (-5%)', disabled: b.register <= 0, act: () => { const v = b.register - fee; save.money += v; b.register = 0; persist(); Sound.play('cash'); cityMsg('ÜBERWIESEN: +' + v + '€ (GEBÜHR ' + fee + '€)', 2.5); } }], x, y + 84, w);
  const c = dailyCosts(), r = b.report;
  phLine('KOSTEN PRO TAG: ' + c.total + '€', x, y + 106, '#ff9a6a');
  phLine('LOHN ' + c.wages + '€ + UNTERHALT ' + c.upkeep + '€', x, y + 116, '#ff9a6a');
  phLine('HEUTE VERDIENT (SAFT): ' + (b.dayIncome || 0) + '€', x, y + 128, '#7dff7a');
  if (r) { phLine('GESTERN: +' + r.income + '€  -' + r.paid + '€', x, y + 140, '#ffd23f'); if (r.quit) phLine(r.quit + ' HAT GEKÜNDIGT!', x, y + 150, '#ff6a6a'); }
  phLine('NÄCHSTER TAG IN ' + Math.ceil(DAY_LEN - (((b.clock || 0)) % DAY_LEN)) + ' S', x, y + 162, '#888888');
};

// ---------- Taxi: überall hin (kostet Geld) ----------
function taxiSpots() {
  const out = [], add = (label, x, y) => out.push({ label, x: x * TS + 8, y: y * TS + 8 });
  const bd = (id) => BUILDINGS.find((q) => q.id === id);
  const at = (id, label) => { const b = bd(id); if (b && b.door && !(b.locked && b.locked())) { const [ox, oy] = doorOutside(b); add(label || b.label, ox, oy); } };
  at('home', 'ZUHAUSE'); at('factory'); at('garden', 'GARTENCENTER'); at('kiosk'); at('casino'); at('autohaus');
  for (const id in SITES) if (id !== 'factory' && ownsSite(id)) at(id);
  for (const a of APARTMENTS) if (ownsApt(a.id)) at(a.id);
  if (gateOpen()) { at('market', 'GROSSMARKT (LAND)'); add('ORANGENHAIN (LAND)', 189, 47); }
  const m = BUILDINGS.find((q) => q.mission === save.unlocked);
  if (m && save.unlocked < LEVELS.length) add('AUFTRAG: ' + LEVELS[m.mission].name, m.marker[0], m.marker[1] + 1);
  add('WELLEN-ARENA', 92, 10);
  return out;
}
PHONE_DRAW.taxi = (P, x, y, w) => {
  phLine('DER TAXIFAHRER BRINGT DICH HIN. DEIN', x, y, '#cccccc'); phLine('FAHRZEUG RUFST DU DANN ÜBERS MENÜ.', x, y + 10, '#cccccc');
  const items = taxiSpots().map((s) => {
    const price = Math.round(15 + dist(C.p.x, C.p.y, s.x, s.y) / TS * 0.4);
    return { label: fitText(s.label, 118) + ' ' + price + '€', act: () => {
      if (C.wanted > 0) { cityMsg('KEIN TAXI FÄHRT, WÄHREND DIE POLIZEI DICH SUCHT!', 2.5); Sound.play('click'); return; }
      if (save.money < price) { cityMsg('ZU WENIG GELD! (' + price + '€)', 2); Sound.play('click'); return; }
      save.money -= price; persist(); C.phone = null;
      goto(() => { C.inCar = false; C.p.x = s.x; C.p.y = s.y; C.cam.x = s.x; C.cam.y = s.y; enterHub(); cityMsg('TAXI: ANGEKOMMEN BEI ' + s.label + '. (-' + price + '€)', 3); });
    } };
  });
  phList('taxi', items, x, y + 26, w, 11);
};

// ---------- Kontakte: Stammkunden anrufen ----------
PHONE_DRAW.contacts = (P, x, y, w) => {
  const b = B(), regs = Object.keys(b.regulars || {});
  if (!regs.length) { phLine('NOCH KEINE STAMMKUNDEN.', x, y, '#888888'); phLine('LIEFERE BESTELLUNGEN AUS - WER OFT', x, y + 12, '#888888'); phLine('BEI DIR KAUFT, WIRD STAMMKUNDE.', x, y + 22, '#888888'); return; }
  phLine('ANRUFEN = SIE BESTELLEN SOFORT WAS.', x, y, '#cccccc');
  b.callT = b.callT || {};
  const now = bizNow();
  const items = regs.map((n) => {
    const r = b.regulars[n], cd = Math.max(0, Math.ceil(((b.callT[n] || 0) - now) / 1000)), busy = b.orders.some((o) => o.name === n);
    return { label: fitText(n, 74) + ' ' + '*'.repeat(r.loyal) + (busy ? ' BESTELLT' : cd ? ' ' + cd + 'S' : ''), disabled: busy || cd > 0, hint: 'LIEBLINGSSAFT: ' + productName(r.fav),
      act: () => { const o = bizOrderTick(0, n); if (o) { b.callT[n] = now + 180000; cityMsg(n + ': "' + pick(['KLAR, ICH NEHM WAS!', 'GUT, DASS DU ANRUFST!', 'BRING MIR DAS ÜBLICHE!']) + '"', 2.5); persist(); } else cityMsg('GERADE NIEMAND ERREICHBAR.', 2); } };
  });
  const sel = phList('contacts', items, x, y + 14, w, 10);
  if (items[sel] && items[sel].hint) phLine(items[sel].hint, x, y + 162, '#ffe14d');
};

// ---------- Imperium: Übersicht über alles ----------
PHONE_DRAW.empire = (P, x, y, w) => {
  const b = B();
  const nx = b.rank < RANKS.length ? RANKS[b.rank][0] : b.xp, px = RANKS[b.rank - 1][0];
  phLine('RANG ' + b.rank + ': ' + bizRankName(), x, y, '#ffe14d');
  ctx.fillStyle = '#222'; ctx.fillRect(x, y + 10, w, 3); ctx.fillStyle = '#ffe14d'; ctx.fillRect(x, y + 10, Math.round(w * clamp((b.xp - px) / Math.max(1, nx - px), 0, 1)), 3);
  phLine('QUALITÄT: ' + gradeText() + '   LAGER: ' + storeJuiceCount() + ' SÄFTE', x, y + 16, '#ff9ad5');
  let yy = y + 30;
  for (const id in SITES) {
    const S = SITES[id], own = ownsSite(id);
    if (!own) { phLine(S.name + ': ' + (b.rank >= S.rank ? S.price + '€' : 'AB RANG ' + S.rank), x, yy, '#666677'); yy += 10; continue; }
    const pots = allPots().filter((o) => o.s === id), ready = pots.filter((o) => potState(o) === 'ready').length, si = storeSlotInfo(id);
    phLine(S.name + ': ' + pots.length + ' KÜBEL' + (ready ? ' (' + ready + ' REIF)' : '') + ', REGALE ' + si.used + '/' + si.total, x, yy, ready ? '#7dff7a' : '#ffffff'); yy += 10;
  }
  yy += 4;
  phLine('PERSONAL: ' + (Object.keys(STAFF).filter((k) => b.staff[k]).map((k) => b.staff[k] + 'X ' + STAFF[k].name).join(', ') || 'KEINS'), x, yy, '#66ffff'); yy += 10;
  phLine('GEHEIMREZEPTE: ' + RECIPES.filter((r) => b.known[r.id]).length + '/' + RECIPES.length + '   STAMMKUNDEN: ' + Object.keys(b.regulars || {}).length, x, yy, '#ffb52a'); yy += 10;
  phLine('LANDKREIS: ' + (gateOpen() ? 'OFFEN' : 'GESPERRT BIS RANG ' + GATE.rank), x, yy, gateOpen() ? '#7dff7a' : '#ff9a6a');
};

// ---------- Musik ----------
PHONE_DRAW.music = (P, x, y, w) => {
  phLine('MUSIK HÖREN - AUCH ZU FUSS.', x, y, '#cccccc');
  const items = RADIO.map((r, i) => ({ label: (i === (C.radio == null ? 1 : C.radio) && (C.inCar || C.radioFoot || i === 0) ? '> ' : '  ') + r.name, act: () => { C.radio = i; C.radioFoot = i > 0; cityMusic(); cityMsg('RADIO: ' + r.name, 1.5); } }));
  phList('music', items, x, y + 16, w);
};

// ---------- Karte (ganzer Bildschirm) mit Navi ----------
function drawPhoneMap() {
  const M = C.map, s = 2, mx = Math.round(W / 2 - CW), my = 20, mw = CW * s, mh = CH * s;
  ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, W, H);
  txt('STADTPLAN', mx, 6, { color: '#3fd0ff' });
  txt('TAG ' + (gameDay() + 1) + '  ' + cityClock() + '   ' + save.money + '€', mx + mw, 6, { font: FS, align: 'right', color: '#7dff7a' });
  ctx.fillStyle = '#000'; ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
  ctx.drawImage(CITY.miniC, mx, my, mw, mh);
  ctx.strokeStyle = '#3fd0ff'; ctx.strokeRect(mx - 1.5, my - 1.5, mw + 3, mh + 3);
  const P2 = (x, y) => [mx + x / TS * s, my + y / TS * s];
  for (const bd of BUILDINGS) {
    const [bx, by] = P2(bd.x * TS, bd.y * TS);
    if (bd.site) { ctx.strokeStyle = ownsSite(bd.site) ? '#ff9a1a' : 'rgba(255,154,26,0.4)'; ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, bd.w * s - 1, bd.h * s - 1); }
    if (bd.apt) { ctx.strokeStyle = ownsApt(bd.apt) ? '#ff9ad5' : 'rgba(255,154,213,0.4)'; ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, bd.w * s - 1, bd.h * s - 1); }
  }
  if (!gateOpen()) { const [gx, gy] = P2(GATE.x0 * TS, GATE.y0 * TS); ctx.fillStyle = Math.floor(T * 3) % 2 ? '#ff3b3b' : '#ffffff'; ctx.fillRect(Math.round(gx), Math.round(gy), 4, 10); }
  mmapDrawRoute(ctx, P2, 2);
  drawPoliceMinimap((x, y, col, sz = 2) => { const [a, b] = P2(x * TS, y * TS); ctx.fillStyle = col; ctx.fillRect(Math.round(a) - 1, Math.round(b) - 1, sz + 1, sz + 1); });
  // Symbole + was unter der Maus ist
  const hv = { d: 7, label: '', col: '#ffe14d' }, near = (a, b, label, col, extra) => { const d = Math.hypot(mouse.x - a, mouse.y - b); if (d < hv.d) { hv.d = d; hv.label = label; hv.col = col; hv.x = extra && extra.x; hv.y = extra && extra.y; hv.friend = extra && extra.friend; } };
  for (const o of mmapPOIs()) {
    const [a, b] = P2(o.x, o.y);
    if (o.kind === 'mission' && Math.floor(T * 3) % 2) { ctx.strokeStyle = o.col; ctx.strokeRect(Math.round(a) - 5.5, Math.round(b) - 5.5, 11, 11); }
    mmapIcon(ctx, o.kind, a, b, o.col, o.ch);
    near(a, b, o.label, o.col, { x: o.x, y: o.y });
  }
  if (C.wp) { const [a, b] = P2(C.wp.x, C.wp.y); mmapIcon(ctx, 'flag', a, b - 2 - (Math.floor(T * 4) % 2), '#ffe14d'); }
  { const [a, b] = P2(C.car.x, C.car.y); if (!C.inCar) { mmapIcon(ctx, 'car', a, b, '#ff3fa4'); near(a, b, 'DEIN FAHRZEUG', '#ff3fa4', { x: C.car.x, y: C.car.y }); } }
  for (const f of mmapFriends()) {
    const [a, b] = P2(f.x, f.y), col = MMAP_PCOL[f.idx] || '#fff';
    mmapArrow(ctx, a, b, f.a, col, true);
    const nw = textWidth(f.name, '8px ' + FS);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(Math.round(a - nw / 2) - 2, Math.round(b) - 18, Math.ceil(nw) + 4, 10);
    txt(f.name, a, b - 17, { font: FS, align: 'center', color: col });
    near(a, b, f.name + (mmapTpBlock(f.idx) ? ' - KLICK = NAVI (' + mmapTpBlock(f.idx) + ')' : ' - KLICK = HIN TELEPORTIEREN'), col, { friend: f.idx });
  }
  const fx = C.inCar ? C.car.x : C.p.x, fy = C.inCar ? C.car.y : C.p.y;
  { const [a, b] = P2(fx, fy); const pul = 6 + (T * 8) % 6; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(Math.round(a), Math.round(b), pul, 0, TAU); ctx.stroke(); mmapArrow(ctx, a, b, C.inCar ? C.car.a : C.p.a, '#ffffff', true); near(a, b, 'DU' + (unameGet() ? ' (' + unameGet() + ')' : ''), '#ffffff'); }
  // Spieler online (Teleport-Knöpfe) oben rechts in der Karte
  if (NET.connected) mmapPlayerList(mx + mw - 176, my + 4, 172, true);
  // Name unter der Maus
  const wx = (mouse.x - mx) / s * TS, wy = (mouse.y - my) / s * TS, inside = mouse.x >= mx && mouse.x < mx + mw && mouse.y >= my && mouse.y < my + mh;
  let tip = hv.label, tcol = hv.col;
  if (inside && !tip) {
    const bd = BUILDINGS.find((q) => wx >= q.x * TS && wx < (q.x + q.w) * TS && wy >= q.y * TS && wy < (q.y + q.h) * TS);
    if (bd) { tip = bd.label + (bd.site ? (ownsSite(bd.site) ? ' (DEINS)' : ' (GRUNDSTÜCK ' + SITES[bd.site].price + '€)') : bd.apt ? (ownsApt(bd.apt) ? ' (DEINS)' : ' (WOHNUNG)') : ''); tcol = '#ffe14d'; }
  }
  if (inside && tip) {
    const tw = Math.min(300, textWidth(tip, '8px ' + FS) + 8), tx = clamp(mouse.x + 8, 4, W - tw - 4), ty = clamp(mouse.y - 16, 2, H - 14);
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(tx, ty, tw, 11); ctx.strokeStyle = tcol; ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, 10);
    txt(fitText(tip, tw - 6), tx + 4, ty + 1, { font: FS, color: tcol });
  }
  // Legende
  const leg = [['home', '#ff6fb5', 'ZUHAUSE'], ['mission', '#ff3fa4', 'AUFTRAG'], ['shop', '#ffd23f', 'LADEN'], ['gunzer', '#ff9a1a', 'GUNZER'], ['order', '#7dff7a', 'KUNDE'], ['flag', '#ffe14d', 'ZIEL']];
  if (NET.connected) leg.push(['friend', '#66aaff', 'FREUNDE']);
  let lx = mx;
  for (const [k, c, l] of leg) {
    if (k === 'friend') mmapArrow(ctx, lx + 3, my + mh + 9, 0, c); else mmapIcon(ctx, k, lx + 4, my + mh + 9, c);
    txt(l, lx + 11, my + mh + 5, { font: FS, color: '#aaaaaa' }); lx += 18 + textWidth(l, '8px ' + FS);
  }
  txt(C.wp ? 'RECHTSKLICK = ZIEL LÖSCHEN   ESC = ZU' : 'KLICK = ZIEL SETZEN' + (NET.connected ? '   KLICK AUF FREUND = TELEPORT' : '') + '   ESC/N = ZU', W / 2, H - 11, { font: FS, align: 'center', color: '#888888' });
  const on = uiActive() && T - M.at > 0.12;
  if (on && inside && mouse.pl) {
    if (hv.friend != null) { const o = NET.others[hv.friend]; if (!mmapTpBlock(hv.friend)) mmapTeleport(hv.friend); else if (o) { C.wp = { x: o.x, y: o.y, label: netPlayerName(hv.friend) }; MMAP_R.t = 0; Sound.play('select'); } }
    else { const tx2 = hv.x != null ? hv.x : wx, ty2 = hv.x != null ? hv.y : wy; C.wp = { x: tx2, y: ty2, label: hv.label || 'ZIEL' }; MMAP_R.t = 0; Sound.play('select'); }
  }
  if (on && mouse.pr) { C.wp = null; Sound.play('blip', true); }
  if (C.map && on && (pressed.Escape || pressed.KeyH || pressed.KeyN)) C.map = null;
}
// Navi: angekommen?
function updateWaypoint() { if (C.wp && dist(C.p.x, C.p.y, C.wp.x, C.wp.y) < 40) { C.wp = null; Sound.play('coin'); cityMsg('ZIEL ERREICHT!', 1.5); } }

// ---------- Kopfgeld-Jagd ----------
PHONE_DRAW.bounty = (P, x, y, w) => {
  const Bt = C.bounty;
  if (Bt) {
    phLine('GESUCHT: ' + Bt.ped.name, x, y, '#ff6a6a'); phLine(Bt.o.crime, x, y + 10, '#cccccc');
    phLine('BELOHNUNG: ' + Math.round(Bt.o.pay * (1 + sk('hunter') * 0.15)) + '€   ZEIT: ' + Math.ceil(Bt.t) + ' S', x, y + 22, '#ffd23f');
    phLine(Bt.o.guards ? Bt.o.guards + ' LEIBWÄCHTER - BEWAFFNET!' : 'ER IST ALLEIN. ABER SCHNELL.', x, y + 34, '#ff9a6a');
    phList('bty1', [{ label: 'NAVI ZUM ZIEL', act: () => { C.wp = { x: Bt.ped.x, y: Bt.ped.y }; C.phone = null; } }, { label: 'AUFGEBEN', act: () => { C.peds = C.peds.filter((q) => q !== Bt.ped && !Bt.guards.includes(q)); C.bounty = null; C.wp = null; cityMsg('KOPFGELD AUFGEGEBEN.', 2); } }], x, y + 54, w);
    return;
  }
  phLine('GESUCHTE GANGSTER ERLEDIGEN', x, y, '#cccccc'); phLine('= BELOHNUNG (KEINE ANZEIGE).', x, y + 10, '#cccccc');
  const items = (C.bounties || []).map((o) => ({ label: '*'.repeat(o.tier) + ' ' + fitText(o.name, 90) + ' ' + o.pay + '€', hint: o.crime + (o.guards ? ' (' + o.guards + ' LEIBWÄCHTER)' : ''), act: () => startBounty(o) }));
  const sel = phList('bounty', items, x, y + 26, w);
  if (items[sel]) wrap(items[sel].hint, 32).forEach((l, i) => phLine(l, x, y + 80 + i * 10, '#ffe14d'));
  if (!items.length) phLine('GERADE KEINE AUFTRÄGE.', x, y + 30, '#888888');
  phLine('NEUE KOPFGELDER IN ' + Math.max(0, Math.ceil(C.bountyT || 0)) + ' S', x, y + 150, '#888888');
};
// ---------- Saft-Börse ----------
PHONE_DRAW.market = (P, x, y, w) => {
  const b = B();
  phLine('HEUTE GEFRAGT (TAG ' + (gameDay() + 1) + '):', x, y, '#cccccc');
  Object.keys(FRUITS).forEach((k, i) => {
    const m = marketMult(k), yy = y + 14 + i * 14, up = m > 1.02, dn = m < 0.98;
    phLine(FRUITS[k].juice, x, yy, fruitUnlocked(k) ? '#ffffff' : '#666677');
    txt((up ? '+' : '') + Math.round((m - 1) * 100) + '%', x + w, yy, { font: FS, align: 'right', color: up ? '#7dff7a' : dn ? '#ff6a6a' : '#cccccc' });
    ctx.fillStyle = up ? '#7dff7a' : dn ? '#ff6a6a' : '#888'; if (up) { ctx.fillRect(x + w - 34, yy + 5, 5, 1); ctx.fillRect(x + w - 33, yy + 4, 3, 1); ctx.fillRect(x + w - 32, yy + 3, 1, 1); } else if (dn) { ctx.fillRect(x + w - 34, yy + 2, 5, 1); ctx.fillRect(x + w - 33, yy + 3, 3, 1); ctx.fillRect(x + w - 32, yy + 4, 1, 1); }
  });
  if (b.marketHot) phLine('HEUTE TOP: ' + FRUITS[b.marketHot].juice, x, y + 96, '#ffd23f');
  phLine('GILT AUCH FÜR GEMIXTE SÄFTE.', x, y + 112, '#888888');
  phLine('NEUE KURSE IN ' + Math.ceil(DAY_LEN - ((b.clock || 0) % DAY_LEN)) + ' S', x, y + 138, '#888888');
};
// ---------- Anwalt ----------
PHONE_DRAW.lawyer = (P, x, y, w) => {
  const b = B(), now = bizNow(), cd = Math.max(0, Math.ceil(((b.lawyerT || 0) - now) / 1000));
  phLine('"ICH REGLE DAS. GEGEN BARGELD."', x, y, '#cccccc');
  phLine('FAHNDUNG: ' + (C.wanted ? C.wanted + ' STERNE' : 'KEINE'), x, y + 16, C.wanted ? '#ff6a6a' : '#7dff7a');
  phLine('PREIS: 1 STERN 400€, 2: 1600€, 3: 3600€, 4: 6400€', x, y + 28, '#ffd23f');
  phList('lawyer', [{ label: C.wanted ? 'FAHNDUNG LÖSCHEN ' + lawyerPrice(C.wanted) + '€' : 'NICHTS ZU TUN', disabled: !C.wanted || cd > 0, act: () => lawyerClear() }], x, y + 46, w);
  if (cd) phLine('DR. SCHLAU IST BESCHÄFTIGT: NOCH ' + cd + ' S', x, y + 66, '#888888');
};
// ---------- Tagesaufgaben ----------
PHONE_DRAW.tasks = (P, x, y, w) => {
  const b = B();
  phLine('3 AUFGABEN PRO TAG:', x, y, '#cccccc');
  (b.tasks || []).forEach((q, i) => {
    const yy = y + 16 + i * 30, pr = taskProgress(q);
    phLine((q.done ? 'OK  ' : '') + TASK_TYPES[q.t].text(q.n), x, yy, q.done ? '#7dff7a' : '#ffffff');
    ctx.fillStyle = '#222'; ctx.fillRect(x, yy + 11, w - 86, 4); ctx.fillStyle = q.done ? '#7dff7a' : '#ffe14d'; ctx.fillRect(x, yy + 11, Math.round((w - 86) * pr / q.n), 4);
    txt(pr + '/' + q.n, x + w - 82, yy + 9, { font: FS, color: '#cccccc' });
    txt('+' + q.pay + '€', x + w, yy + 9, { font: FS, align: 'right', color: '#7dff7a' });
  });
  phLine('NEUE AUFGABEN IN ' + Math.ceil(DAY_LEN - ((b.clock || 0) % DAY_LEN)) + ' S', x, y + 110, '#888888');
};
// ---------- Profil: Lil-Level, Skills, Statistik ----------
PHONE_DRAW.profile = (P, x, y, w) => {
  const L = save.lil || { lv: 1, xp: 0, pts: 0 }, st = save.stats;
  if (P.sub && P.sub.stats) {
    const rows = [['SPIELZEIT', Math.floor((st.time || 0) / 60) + ' MIN'], ['GEGNER ERLEDIGT', st.kills || 0], ['TODE', st.deaths || 0], ['AUFTRÄGE GESCHAFFT', st.levels || 0],
      ['SÄFTE VERKAUFT', B().sold], ['GEKLAUT', (st.stolen || 0) + '€'], ['VERHAFTET', st.arrests || 0], ['AUSGEKNOCKT', st.ko || 0], ['KOPFGELDER', st.bounties || 0],
      ['NEBENJOBS', st.jobs || 0], ['GOLDENE ORANGEN', Object.keys(save.gold || {}).length + '/25'], ['CASINO GEWONNEN', (st.casinoWon || 0) + '€']];
    rows.forEach(([k, v], i) => { phLine(k, x, y + i * 11, '#aaaaaa'); txt(String(v), x + w, y + i * 11, { font: FS, align: 'right', color: '#ffffff' }); });
    return;
  }
  phLine('LIL-LEVEL ' + L.lv + '   SKILLPUNKTE: ' + L.pts, x, y, L.pts ? '#ffe14d' : '#ffffff');
  ctx.fillStyle = '#222'; ctx.fillRect(x, y + 10, w, 3); ctx.fillStyle = '#ff3fa4'; ctx.fillRect(x, y + 10, Math.round(w * clamp(L.xp / lilXpNeed(L.lv), 0, 1)), 3);
  const items = Object.keys(SKILLS).map((id) => { const S = SKILLS[id], lv = sk(id); return { label: fitText(S.name, 96) + ' ' + '|'.repeat(lv) + '.'.repeat(S.max - lv), hint: S.desc(lv), color: lv >= S.max ? '#7dff7a' : '#ffffff', act: () => buySkill(id) }; });
  items.push({ label: 'STATISTIK', act: () => { P.sub = { stats: true }; } });
  const sel = phList('profile', items, x, y + 18, w, 10);
  if (items[sel] && items[sel].hint) wrap(items[sel].hint, 32).forEach((l, i) => phLine(l, x, y + 152 + i * 10, '#ffe14d'));
};
