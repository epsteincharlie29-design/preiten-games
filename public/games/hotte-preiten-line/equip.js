'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Geräte zum Aufstellen + Grundstücke
//  Kaufen (Gartencenter/Baumarkt, Großmarkt, Lieferdienst), in die Hand
//  nehmen (Zahlentaste) und in einem eigenen Grundstück hinklicken.
//  [R] dreht, [X] hebt ein leeres Gerät wieder auf.
// =====================================================================
const EQUIP = {
  pot: { name: 'PFLANZKÜBEL', kind: 'pot', w: 1, h: 1, price: 150, rank: 1, stack: 5, desc: 'HIER WACHSEN DEINE FRÜCHTE.' },
  bigpot: { name: 'PROFI-KÜBEL', kind: 'pot', w: 1, h: 1, price: 700, rank: 4, stack: 5, yield: 2, speed: 0.85, desc: '+2 FRÜCHTE PRO ERNTE, WÄCHST 15% SCHNELLER.' },
  uvlamp: { name: 'UV-STRAHLER', kind: 'lamp', w: 1, h: 1, price: 450, rank: 3, stack: 5, desc: 'KÜBEL BIS 2 FELDER DANEBEN WACHSEN 30% SCHNELLER.' },
  sprinkler: { name: 'SPRINKLER', kind: 'sprinkler', w: 1, h: 1, price: 1200, rank: 5, stack: 3, desc: 'PFLANZT LEERE KÜBEL BIS 2 FELDER DANEBEN NEU (KERNE AUS DEN REGALEN).' },
  press: { name: 'SAFTPRESSE', kind: 'press', w: 2, h: 2, price: 800, rank: 1, out: 1, desc: '3 FRÜCHTE = 1 SAFT.' },
  propress: { name: 'PROFI-PRESSE', kind: 'press', w: 2, h: 2, price: 3500, rank: 5, out: 2, desc: '3 FRÜCHTE = 2 SÄFTE.' },
  indpress: { name: 'INDUSTRIE-PRESSE', kind: 'press', w: 2, h: 2, price: 9000, rank: 8, out: 3, desc: '3 FRÜCHTE = 3 SÄFTE.' },
  mixer: { name: 'MIXTISCH', kind: 'mixer', w: 2, h: 1, price: 600, rank: 1, desc: 'SAFT + ZUTATEN MISCHEN. GEHEIMREZEPTE ENTDECKEN!' },
  shelf: { name: 'KLEINES REGAL', kind: 'shelf', w: 1, h: 1, price: 200, rank: 1, stack: 3, slots: 4, desc: '4 LAGERPLÄTZE.' },
  fridge: { name: 'KÜHLSCHRANK', kind: 'shelf', w: 1, h: 2, price: 1500, rank: 2, slots: 8, cool: true, desc: '8 LAGERPLÄTZE.' },
  bigshelf: { name: 'GROSSES REGAL', kind: 'shelf', w: 2, h: 1, price: 900, rank: 3, slots: 10, desc: '10 LAGERPLÄTZE.' },
  filler: { name: 'ABFÜLLANLAGE', kind: 'filler', w: 2, h: 2, price: 8000, rank: 7, desc: 'SCHICKE FLASCHEN: ALLE SÄFTE +25% WERT (EINE REICHT).' },
};
// Grundstücke für das Saft-Geschäft (b = Gebäude-ID in city.js)
const SITES = {
  factory: { name: 'SAFTFABRIK', price: 0, rank: 1, grow: 1, desc: 'DEIN ERSTES GRUNDSTÜCK.' },
  garage: { name: 'GARAGE', price: 3000, rank: 1, grow: 1, desc: 'KLEIN UND BILLIG. GLEICH NEBEN DEM KIOSK.' },
  hall1: { name: 'LAGERHALLE', price: 25000, rank: 4, grow: 1, desc: 'RIESIG. PLATZ FÜR VIELE REGALE UND PRESSEN.' },
  greenhouse: { name: 'GEWÄCHSHAUS', price: 15000, rank: 5, grow: 0.7, desc: 'GLASDACH: FRÜCHTE WACHSEN 30% SCHNELLER.' },
  barn: { name: 'SCHEUNE', price: 45000, rank: 6, grow: 0.8, desc: 'AUF DEM LAND: FRÜCHTE WACHSEN 20% SCHNELLER.' },
};
const ownsSite = (id) => !!(save.biz && save.biz.sites && save.biz.sites[id]);
const siteBld = (id) => BUILDINGS.find((q) => q.id === id);
function siteOfTile(tx, ty) {
  for (const id in SITES) { const b = siteBld(id); if (b && tx > b.x && tx < b.x + b.w - 1 && ty > b.y && ty < b.y + b.h - 1) return id; }
  return null;
}
const siteHere = () => (C ? siteOfTile(Math.floor(C.p.x / TS), Math.floor(C.p.y / TS)) : null);
// Lieferkiste eines Grundstücks (12 Plätze)
function siteBox(id) { const b = B(); b.boxes = b.boxes || {}; return b.boxes[id] || (b.boxes[id] = new Array(12).fill(null)); }
const hasEquip = (id) => !!(save.biz && save.biz.eq && save.biz.eq.some((o) => o.id === id && ownsSite(o.s)));
const eqDims = (o) => { const E = EQUIP[o.id]; return o.r ? [E.h, E.w] : [E.w, E.h]; };
function lampNear(o) {
  for (const q of B().eq) if (q.id === 'uvlamp' && q.s === o.s && Math.abs(q.x - o.x) <= 2 && Math.abs(q.y - o.y) <= 2) return true;
  return false;
}

// ---------- Belegung (für Kollision und Interaktion) ----------
let EQ_ST = [], EQ_SOLID = null, EQ_REF = null, EQ_V = -1;
function eqRebuild() {
  const b = B();
  EQ_SOLID = new Uint8Array(CW * CH); EQ_ST = [];
  for (const o of b.eq) {
    const E = EQUIP[o.id];
    if (!E) continue;
    const [w, h] = eqDims(o), cells = [];
    for (let y = o.y; y < o.y + h; y++) for (let x = o.x; x < o.x + w; x++) { const i = y * CW + x; EQ_SOLID[i] = 1; cells.push(i); }
    EQ_ST.push({ type: 'eq', eq: o, label: E.name, x: (o.x + w / 2) * TS, y: (o.y + h / 2) * TS, cells });
  }
  EQ_REF = b.eq; EQ_V = b.eqV || 0;
}
function eqCheck() { const b = B(); if (!EQ_SOLID || EQ_REF !== b.eq || EQ_V !== (b.eqV || 0)) eqRebuild(); }
function eqChanged() { const b = B(); b.eqV = (b.eqV || 0) + 1; eqRebuild(); persist(); }
const eqAt = (tx, ty) => B().eq.find((o) => { const [w, h] = eqDims(o); return tx >= o.x && tx < o.x + w && ty >= o.y && ty < o.y + h; });

// ---------- Aufstellen ----------
function doorInsideOf(bd) { const [dx, dy] = bd.door; return dy === bd.y + bd.h - 1 ? [dx, dy - 1] : dy === bd.y ? [dx, dy + 1] : dx === bd.x ? [dx + 1, dy] : [dx - 1, dy]; }
// Grund, warum es nicht geht ('' = passt)
function canPlace(id, tx, ty, w, h, site, auto) {
  if (!site || !ownsSite(site)) return 'NUR IN DEINEN EIGENEN GRUNDSTÜCKEN!';
  const bd = siteBld(site), [ix, iy] = doorInsideOf(bd), cells = [];
  for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
    if (siteOfTile(x, y) !== site) return 'DAS PASST HIER NICHT REIN.';
    const i = y * CW + x;
    if (CITY.solid[i] || CITY.t[i] !== bd.floor) return 'DA STEHT SCHON WAS.';
    if (EQ_SOLID && EQ_SOLID[i]) return 'DA STEHT SCHON EIN GERÄT.';
    if (x === ix && y === iy) return 'NICHT DIREKT VOR DIE TÜR!';
    cells.push(i);
  }
  if (!auto) {
    const p = C.p, px0 = Math.floor((p.x - p.r) / TS), px1 = Math.floor((p.x + p.r) / TS), py0 = Math.floor((p.y - p.r) / TS), py1 = Math.floor((p.y + p.r) / TS);
    if (tx <= px1 && tx + w - 1 >= px0 && ty <= py1 && ty + h - 1 >= py0) return 'DU STEHST IM WEG!';
    if (dist(p.x, p.y, (tx + w / 2) * TS, (ty + h / 2) * TS) > 80) return 'ZU WEIT WEG - GEH NÄHER RAN.';
  }
  // Weg darf nicht versperrt werden: alle Geräte und Lil müssen von der Tür aus erreichbar bleiben
  const blocked = (i) => CITY.solid[i] || (EQ_SOLID && EQ_SOLID[i]) || cells.includes(i);
  const seen = new Set([iy * CW + ix]), q = [iy * CW + ix];
  while (q.length) {
    const i = q.pop(), x = i % CW, y = (i / CW) | 0;
    for (const [dx, dy] of DIRS4) {
      const n = (y + dy) * CW + x + dx;
      if (!seen.has(n) && siteOfTile(x + dx, y + dy) === site && !blocked(n)) { seen.add(n); q.push(n); }
    }
  }
  const reach = (o2x, o2y, ow, oh) => { for (let y = o2y - 1; y <= o2y + oh; y++) for (let x = o2x - 1; x <= o2x + ow; x++) if (seen.has(y * CW + x)) return true; return false; };
  for (const o of B().eq) if (o.s === site) { const [ow, oh] = eqDims(o); if (!reach(o.x, o.y, ow, oh)) return 'DAS VERSPERRT DEN WEG ZU EINEM GERÄT!'; }
  if (!reach(tx, ty, w, h)) return 'DA KOMMST DU NICHT MEHR RAN!';
  for (const s of CITY.stations) if (siteOfTile(s.x / TS | 0, s.y / TS | 0) === site && !s.cells.some((c) => reach(c % CW, (c / CW) | 0, 1, 1))) return 'DAS VERSPERRT DEN WEG!';
  if (!auto) { const pt = Math.floor(C.p.y / TS) * CW + Math.floor(C.p.x / TS); if (!seen.has(pt)) return 'DANN KOMMST DU NICHT MEHR RAUS!'; }
  return '';
}
function placeEquip(id, x, y, rot, site) {
  const b = B(), E = EQUIP[id];
  const o = { u: b.uid = (b.uid || 1) + 1, id, x, y, s: site, r: rot ? 1 : 0 };
  if (E.kind === 'pot') { o.t = 0; o.k = 'orange'; }
  if (E.slots) o.slots = new Array(E.slots).fill(null);
  b.eq.push(o);
  eqChanged();
  return o;
}
// freie Stelle suchen (für alte Spielstände und Lieferungen)
function autoPlace(id, site) {
  if (!CITY) CITY = buildCity();
  if (!ownsSite(site)) return null;
  eqCheck();
  const bd = siteBld(site), E = EQUIP[id];
  for (const rot of [0, 1]) {
    const w = rot ? E.h : E.w, h = rot ? E.w : E.h;
    for (let y = bd.y + 1; y < bd.y + bd.h - 1; y++) for (let x = bd.x + 1; x < bd.x + bd.w - 1; x++) {
      if (!canPlace(id, x, y, w, h, site, true)) return placeEquip(id, x, y, rot, site);
    }
  }
  return null;
}
// in der Hand: Vorschau zeigen, Klick stellt auf. true = Klick verbraucht
function updateBuild() {
  C.ghost = null;
  const hd = heldItem();
  if (!hd || hd.k[0] !== 'e' || C.inCar) return false;
  const id = hd.k.slice(2), E = EQUIP[id];
  if (!E) return false;
  const site = siteHere();
  if (!site || !ownsSite(site)) return false;   // nur in eigenen Grundstücken (draußen kann man normal angreifen)
  if (pressed.KeyR) { C.rot = !C.rot; Sound.play('blip', true); }
  const w = C.rot ? E.h : E.w, h = C.rot ? E.w : E.h;
  const wx = mouse.x - W / 2 + C.cam.x, wy = mouse.y - H / 2 + C.cam.y;
  const tx = Math.floor(wx / TS - (w - 1) / 2), ty = Math.floor(wy / TS - (h - 1) / 2);
  const why = canPlace(id, tx, ty, w, h, site);
  C.ghost = { id, x: tx, y: ty, w, h, ok: !why, why, site };
  if (!mouse.pl) return false;
  if (why) { cityMsg(why, 2); Sound.play('click'); return true; }
  const S = bag(), s = S[C.hot];
  s.n--; if (s.n <= 0) { S[C.hot] = null; C.hot = -1; }
  placeEquip(id, tx, ty, C.rot, site);
  Sound.play('door'); sparksCity(tx * TS + w * 8, ty * TS + h * 8);
  cityMsg(E.name + ' AUFGESTELLT!' + (E.kind === 'pot' ? ' JETZT KERNE REIN: [E] AM KÜBEL.' : E.kind === 'shelf' ? ' [E] = EINLAGERN.' : ''), 2.5);
  addXP(1);
  return true;
}
function sparksCity(x, y) { (C.fx = C.fx || []).push({ x, y, t: 0.5 }); }
// leeres Gerät wieder einpacken
function eqPickup(o) {
  const E = EQUIP[o.id];
  if (E.kind === 'pot' && o.t) { cityMsg('ERST ERNTEN! (DA WÄCHST NOCH WAS)', 2); Sound.play('click'); return; }
  if (o.slots && !slotsEmpty(o.slots)) { cityMsg('ERST LEERRÄUMEN! ([E] ÖFFNEN, "ALLES NEHMEN")', 2.5); Sound.play('click'); return; }
  if (!slotsAdd(bag(), 'e:' + o.id, 1)) { cityMsg('TASCHE VOLL!', 2); Sound.play('click'); return; }
  const b = B();
  b.eq = b.eq.filter((q) => q !== o);
  eqChanged();
  Sound.play('pickup'); cityMsg(E.name + ' EINGEPACKT.', 2);
}
// [E] an einem Gerät
function eqInteract(o) {
  const E = EQUIP[o.id], b = B();
  switch (E.kind) {
    case 'pot': {
      const st = potState(o);
      if (st === 'ready') {
        const k = potKind(o), n = harvestPot(o, false);
        if (!n) { cityMsg('TASCHE VOLL! LEG WAS IN EIN REGAL.', 2.5); Sound.play('click'); return; }
        Sound.play('pickup'); cityMsg('+' + n + ' ' + FRUITS[k].name + 'N GEERNTET!', 2);
        const hd = heldItem(), want = hd && hd.k[0] === 's' ? hd.k.slice(2) : null;
        if (plantPot(o, want && slotsCount(bag(), 's:' + want) ? want : null)) cityMsg('+' + n + ' ' + FRUITS[k].name + 'N GEERNTET! NEU GEPFLANZT: ' + FRUITS[o.k].name + '.', 2.5);
        persist();
      } else if (st === 'growing') cityMsg(FRUITS[potKind(o)].name + ' WÄCHST NOCH... ' + Math.ceil(potLeft(o) / 1000) + ' SEKUNDEN', 1.5);
      else {
        const hd = heldItem(), want = hd && hd.k[0] === 's' ? hd.k.slice(2) : null;
        if (plantPot(o, want)) { Sound.play('plant'); cityMsg(FRUITS[o.k].name + ' GEPFLANZT! IN ' + Math.round(potGrowMs(o) / 1000) + ' S REIF.', 2); persist(); }
        else cityMsg('KEINE KERNE IN DER TASCHE! KAUF WELCHE IM GARTENCENTER.', 2.5);
      }
      break;
    }
    case 'press': {
      const n = pressBag(E.out);
      if (n) { Sound.play('press'); o.anim = 0.8; cityMsg(n + ' SÄFTE GEPRESST! SIE SIND IN DEINER TASCHE.', 2.5); persist(); }
      else if (pressBag.full) cityMsg('TASCHE VOLL! LEG ERST WAS IN EIN REGAL.', 2.5);
      else cityMsg('DU BRAUCHST 3 GLEICHE FRÜCHTE IN DER TASCHE.', 2.5);
      break;
    }
    case 'mixer': BZ.site = o.s; openBiz('mixer'); break;
    case 'shelf': openStore(o.slots, E.name, { eq: o }); break;
    case 'lamp': cityMsg('UV-STRAHLER: KÜBEL BIS 2 FELDER DANEBEN WACHSEN 30% SCHNELLER.', 3); break;
    case 'sprinkler': cityMsg('SPRINKLER: PFLANZT LEERE KÜBEL IN DER NÄHE NEU - MIT KERNEN AUS DEN REGALEN.', 3.5); break;
    case 'filler': cityMsg('ABFÜLLANLAGE: ALLE SÄFTE SIND 25% MEHR WERT. LÄUFT!', 3); break;
  }
}
function eqLabel(o) {
  const E = EQUIP[o.id];
  if (E.kind === 'pot') { const st = potState(o); return st === 'ready' ? 'ERNTEN!' : st === 'growing' ? FRUITS[potKind(o)].name + ' WÄCHST (' + Math.ceil(potLeft(o) / 1000) + ' S)' : 'PFLANZEN (' + E.name + ')'; }
  if (E.kind === 'press') return 'PRESSEN (' + E.name + ')';
  if (E.kind === 'mixer') return 'MIXEN';
  if (E.kind === 'shelf') return E.name + ' ÖFFNEN (' + slotsUsed(o.slots) + '/' + o.slots.length + ')';
  return E.name;
}
// Sprinkler: alle 5 s leere Kübel in der Nähe bepflanzen (aus bizTick)
function sprinklerTick() {
  const b = B();
  b.timers.spr = (b.timers.spr || 0) + 1;
  if (b.timers.spr < 5) return;
  b.timers.spr = 0;
  for (const s of b.eq) {
    if (s.id !== 'sprinkler' || !ownsSite(s.s)) continue;
    for (const o of b.eq) if (EQUIP[o.id].kind === 'pot' && o.s === s.s && !o.t && Math.abs(o.x - s.x) <= 2 && Math.abs(o.y - s.y) <= 2) { plantPot(o, null, true); break; }
  }
}

// ---------- Grundstück kaufen (an der Tür 2x [E]) ----------
function siteTryBuy(bd) {
  const S = SITES[bd.site], b = B();
  if (b.rank < S.rank) { cityMsg(S.name + ': ERST AB SAFT-RANG ' + S.rank + ' (DU BIST RANG ' + b.rank + ').', 3); Sound.play('click'); return; }
  if (save.money < S.price) { cityMsg('ZU WENIG GELD! ' + S.name + ' KOSTET ' + S.price + '€. (' + S.desc + ')', 3); Sound.play('click'); return; }
  if (!C.siteAsk || C.siteAsk.id !== bd.site || T - C.siteAsk.t > 4) { C.siteAsk = { id: bd.site, t: T }; cityMsg(S.name + ' FÜR ' + S.price + '€ KAUFEN? NOCHMAL [E] DRÜCKEN! (' + S.desc + ')', 4); Sound.play('select'); return; }
  C.siteAsk = null;
  save.money -= S.price; b.sites[bd.site] = true; persist();
  Sound.play('cash'); Sound.play('levelup');
  cityMsg(S.name + ' GEHÖRT DIR! STELL DORT GERÄTE AUF. LIEFERUNGEN KOMMEN IN DIE LIEFERKISTE.', 6);
}

// ---------- Orangenhain auf dem Land (Bäume zum Ernten) ----------
function treeInteract(st) {
  const b = B(), now = bizNow(), ready = (b.orchard[st.tree] || 0) <= now;
  if (!ready) { cityMsg('DER BAUM TRÄGT NOCH KEINE FRÜCHTE. NOCH ' + Math.ceil(((b.orchard[st.tree] || 0) - now) / 1000) + ' S.', 2); return; }
  const kind = st.tree % 3 === 0 && fruitUnlocked('mandarin') ? 'mandarin' : 'orange', n = randi(2, 4);
  const got = slotsAdd(bag(), 'f:' + kind, n);
  if (!got) { cityMsg('TASCHE VOLL!', 2); Sound.play('click'); return; }
  b.orchard[st.tree] = now + 240000;
  Sound.play('pickup'); cityMsg('+' + got + ' ' + FRUITS[kind].name + 'N VOM BAUM GEPFLÜCKT!', 2); addXP(1); persist();
}

// ---------- Zeichnen ----------
function eqBox(g, x, y, w, h, c1, c2) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 2, y + 2, w, h); g.fillStyle = c1; g.fillRect(x, y, w, h); g.fillStyle = c2; g.fillRect(x + 1, y + 1, w - 2, h - 2); }
function drawPlantIn(g, o, x, y) {
  const st = potState(o);
  if (st === 'empty') return;
  const f = FRUITS[potKind(o)], k = st === 'ready' ? 1 : clamp(1 - potLeft(o) / potGrowMs(o), 0, 1);
  if (k < 0.35) { g.fillStyle = '#3a9a3a'; g.fillRect(x - 1, y - 2 - Math.round(k * 8), 2, 3 + Math.round(k * 8)); g.fillStyle = '#5ac85a'; g.fillRect(x - 2, y - 3 - Math.round(k * 8), 2, 1); }
  else {
    const r = 3 + Math.round(k * 3);
    pxEll(g, x, y - 3, r, r, '#1e5a1e'); pxEll(g, x - 1, y - 4, r - 1, r - 1, '#2a7a2a'); pxEll(g, x - 2, y - 5, Math.max(1, r - 3), Math.max(1, r - 3), '#3a9a3a');
    if (st === 'ready') { for (const [ax, ay] of [[-4, -5], [2, -3], [-1, -8], [3, -7]]) { pxEll(g, x + ax + 1, y + ay + 1, 1, 1, f.col); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x + ax, y + ay, 1, 1); } }
  }
  if (st === 'ready') txt('!', x, y - 20 + Math.round(Math.sin(T * 6) * 2), { g, font: FS, align: 'center', color: '#7dff7a' });
  else if (dist(C.p.x, C.p.y, x, y) < 40) txt(Math.ceil(potLeft(o) / 1000) + 'S', x, y - 18, { g, font: FS, align: 'center', color: '#ffffff' });
}
function drawEquip(g, o, ghost) {
  const E = EQUIP[o.id], [w, h] = ghost ? [o.w, o.h] : eqDims(o), X = o.x * TS, Y = o.y * TS, Wd = w * TS, Hd = h * TS;
  switch (E.kind) {
    case 'pot': {
      const big = o.id === 'bigpot';
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X + 4, Y + 13, 11, 3);
      if (big) { eqBox(g, X + 1, Y + 3, 14, 12, '#3a3a44', '#6a6a78'); g.fillStyle = '#9a9aa8'; g.fillRect(X + 1, Y + 3, 14, 1); }
      else { eqBox(g, X + 2, Y + 4, 12, 11, '#5a3a1a', '#8a5a30'); g.fillStyle = '#a06a3a'; g.fillRect(X + 2, Y + 4, 12, 1); }
      g.fillStyle = '#2a1808'; g.fillRect(X + (big ? 3 : 4), Y + 5, big ? 10 : 8, 4);
      if (!ghost) drawPlantIn(g, o, X + 8, Y + 8);
      break;
    }
    case 'lamp':
      g.fillStyle = 'rgba(180,80,255,0.10)'; g.beginPath(); g.arc(X + 8, Y + 8, 40, 0, TAU); g.fill();
      g.fillStyle = '#2a2a33'; g.fillRect(X + 7, Y + 5, 2, 9); g.fillRect(X + 4, Y + 13, 8, 2);
      g.fillStyle = '#5a5a68'; g.fillRect(X + 3, Y + 2, 10, 4); g.fillStyle = Math.floor(T * 2) % 2 ? '#d07aff' : '#b05aff'; g.fillRect(X + 4, Y + 5, 8, 2);
      break;
    case 'sprinkler':
      g.fillStyle = '#2a4a8a'; g.fillRect(X + 5, Y + 7, 6, 7); g.fillStyle = '#5a8ad0'; g.fillRect(X + 6, Y + 4, 4, 4); g.fillStyle = '#9ad0ff'; g.fillRect(X + 7, Y + 3, 2, 1);
      if (!ghost && Math.floor(T * 3) % 3 === 0) { g.fillStyle = 'rgba(150,200,255,0.8)'; for (let k = 0; k < 4; k++) { const a = T * 4 + k * 1.6; g.fillRect(Math.round(X + 8 + Math.cos(a) * 9), Math.round(Y + 6 + Math.sin(a) * 6), 1, 1); } }
      break;
    case 'press': {
      const c = o.id === 'press' ? ['#3a3a44', '#6a6a78', '#ff9a1a'] : o.id === 'propress' ? ['#1a3a6a', '#3a6a9a', '#ffd23f'] : ['#2a2a2a', '#5a5a5a', '#7dff7a'];
      eqBox(g, X + 1, Y + 1, Wd - 2, Hd - 2, c[0], c[1]);
      g.fillStyle = c[2]; g.fillRect(X + 6, Y + 6, Wd - 12, Hd - 14);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(X + 7, Y + 7, 2, Hd - 16);
      g.fillStyle = '#c0c0cc'; g.fillRect(X + 4, Y + 2, Wd - 8, 3);
      const down = o.anim > 0 ? Math.round(Math.abs(Math.sin(o.anim * 12)) * 3) : 0;
      g.fillStyle = '#e8e8f0'; g.fillRect(X + Wd / 2 - 1, Y + 1 + down, 2, 5);
      txt(o.id === 'press' ? 'PRESSE' : o.id === 'propress' ? 'PROFI' : 'MAXI', X + Wd / 2, Y + Hd - 10, { g, font: FS, align: 'center', color: '#ffffff', outline: '' });
      if (!ghost && o.anim > 0) { o.anim -= frameDt; g.fillStyle = c[2]; for (let k = 0; k < 3; k++) g.fillRect(X + Wd / 2 - 4 + k * 4, Y + Hd - 2 + ((T * 40 + k * 5) % 6), 2, 2); }
      break;
    }
    case 'mixer':
      eqBox(g, X, Y + 1, Wd, Hd - 1, '#4a2c18', '#8d5a3b');
      g.fillStyle = '#6a4024'; if (w > h) g.fillRect(X + 2, Y + Hd / 2, Wd - 4, 1); else g.fillRect(X + Wd / 2, Y + 2, 1, Hd - 4);
      g.fillStyle = '#fff'; g.fillRect(X + 4, Y + 3, 3, 6); g.fillStyle = '#ff9a1a'; g.fillRect(X + 4, Y + 5, 3, 4);
      g.fillStyle = '#c41f2a'; g.fillRect(X + (w > h ? 12 : 4), Y + (w > h ? 4 : 13), 3, 3);
      pxEll(g, X + Wd - 7, Y + Hd - 7, 4, 3, '#d8d8e0'); pxEll(g, X + Wd - 7, Y + Hd - 7, 3, 2, '#ffd23f');
      break;
    case 'shelf': {
      if (E.cool) {
        eqBox(g, X + 1, Y, Wd - 2, Hd, '#8aa0b0', '#e8f0f4');
        g.fillStyle = '#5a6a7a'; g.fillRect(X + Wd - 4, Y + 4, 1, Hd - 8);
        g.fillStyle = 'rgba(120,200,255,0.25)'; g.fillRect(X + 3, Y + 3, Wd - 8, Hd - 6);
      } else {
        eqBox(g, X, Y + 1, Wd, Hd - 1, '#3a2410', '#6a4a2a');
        g.fillStyle = '#4a3018'; for (let yy = Y + 5; yy < Y + Hd; yy += 5) g.fillRect(X + 1, yy, Wd - 2, 1);
      }
      if (o.slots) {   // was drinliegt, sieht man auch
        let n = 0;
        for (const s of o.slots) {
          if (!s) continue;
          const cols = Math.max(1, Math.floor((Wd - 4) / 5)), cx = X + 3 + (n % cols) * 5, cy = Y + 3 + Math.floor(n / cols) * 5;
          if (cy > Y + Hd - 5) break;
          g.fillStyle = itemColor(s.k); g.fillRect(cx, cy, 3, 3); n++;
        }
      }
      break;
    }
    case 'filler':
      eqBox(g, X + 1, Y + 1, Wd - 2, Hd - 2, '#2a3a2a', '#4a6a4a');
      g.fillStyle = '#222'; g.fillRect(X + 3, Y + Hd - 9, Wd - 6, 4);
      for (let k = 0; k < 4; k++) { const bx = X + 4 + ((k * 6 + Math.floor(T * 12)) % (Wd - 8)); g.fillStyle = 'rgba(220,240,255,0.9)'; g.fillRect(bx, Y + Hd - 12, 3, 5); g.fillStyle = '#ff9a1a'; g.fillRect(bx, Y + Hd - 10, 3, 3); }
      g.fillStyle = '#7dff7a'; g.fillRect(X + 5, Y + 5, 4, 3); g.fillStyle = '#ffe14d'; g.fillRect(X + Wd - 9, Y + 5, 4, 3);
      break;
  }
}
// kleines Symbol für Slots (12x12)
function drawEquipIcon(g, id, x, y) {
  const E = EQUIP[id];
  if (!E) return;
  switch (E.kind) {
    case 'pot': g.fillStyle = id === 'bigpot' ? '#6a6a78' : '#8a5a30'; g.fillRect(x + 2, y + 5, 8, 7); g.fillStyle = '#2a1808'; g.fillRect(x + 3, y + 5, 6, 2); g.fillStyle = '#3a9a3a'; g.fillRect(x + 5, y + 1, 2, 4); g.fillRect(x + 3, y + 2, 2, 1); break;
    case 'lamp': g.fillStyle = '#5a5a68'; g.fillRect(x + 2, y + 1, 8, 3); g.fillStyle = '#d07aff'; g.fillRect(x + 3, y + 4, 6, 2); g.fillStyle = '#2a2a33'; g.fillRect(x + 5, y + 6, 2, 5); g.fillRect(x + 3, y + 10, 6, 2); break;
    case 'sprinkler': g.fillStyle = '#2a4a8a'; g.fillRect(x + 3, y + 5, 6, 7); g.fillStyle = '#9ad0ff'; g.fillRect(x + 4, y + 2, 4, 3); g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x + 10, y + 2, 1, 1); break;
    case 'press': g.fillStyle = id === 'press' ? '#6a6a78' : id === 'propress' ? '#3a6a9a' : '#5a5a5a'; g.fillRect(x + 1, y + 2, 10, 10); g.fillStyle = id === 'press' ? '#ff9a1a' : id === 'propress' ? '#ffd23f' : '#7dff7a'; g.fillRect(x + 3, y + 5, 6, 5); g.fillStyle = '#e8e8f0'; g.fillRect(x + 5, y, 2, 4); break;
    case 'mixer': g.fillStyle = '#8d5a3b'; g.fillRect(x, y + 5, 12, 6); g.fillStyle = '#fff'; g.fillRect(x + 2, y + 1, 2, 4); g.fillStyle = '#ff9a1a'; g.fillRect(x + 2, y + 3, 2, 2); pxEll(g, x + 8, y + 4, 3, 2, '#ffd23f'); break;
    case 'shelf':
      if (E.cool) { g.fillStyle = '#e8f0f4'; g.fillRect(x + 3, y, 7, 12); g.fillStyle = '#5a6a7a'; g.fillRect(x + 8, y + 3, 1, 6); g.fillRect(x + 3, y + 5, 7, 1); }
      else { g.fillStyle = '#6a4a2a'; g.fillRect(x + 1, y + 1, id === 'bigshelf' ? 11 : 8, 11); g.fillStyle = '#3a2410'; g.fillRect(x + 1, y + 5, id === 'bigshelf' ? 11 : 8, 1); g.fillRect(x + 1, y + 9, id === 'bigshelf' ? 11 : 8, 1); g.fillStyle = '#ff9a1a'; g.fillRect(x + 3, y + 2, 2, 3); g.fillStyle = '#7dff7a'; g.fillRect(x + 6, y + 6, 2, 3); }
      break;
    case 'filler': g.fillStyle = '#4a6a4a'; g.fillRect(x, y + 2, 12, 9); g.fillStyle = '#222'; g.fillRect(x + 1, y + 8, 10, 2); g.fillStyle = '#ff9a1a'; g.fillRect(x + 3, y + 4, 2, 4); g.fillRect(x + 7, y + 4, 2, 4); break;
  }
}
// alle Geräte im Bild + Vorschau
function drawEquipment(g) {
  eqCheck();
  for (const o of B().eq) {
    if (!ownsSite(o.s)) continue;
    const [w, h] = eqDims(o), cx = (o.x + w / 2) * TS, cy = (o.y + h / 2) * TS;
    if (offscreen(cx, cy, 40)) continue;
    drawEquip(g, o, false);
  }
  const gh = C.ghost;
  if (gh) {
    g.globalAlpha = 0.55; drawEquip(g, gh, true); g.globalAlpha = 1;
    g.strokeStyle = gh.ok ? '#7dff7a' : '#ff3b3b'; g.lineWidth = 1; g.strokeRect(gh.x * TS + 0.5, gh.y * TS + 0.5, gh.w * TS - 1, gh.h * TS - 1);
    g.fillStyle = gh.ok ? 'rgba(125,255,122,0.12)' : 'rgba(255,59,59,0.15)'; g.fillRect(gh.x * TS, gh.y * TS, gh.w * TS, gh.h * TS);
  }
  if (C.fx) { for (const f of C.fx) { f.t -= frameDt; g.strokeStyle = `rgba(255,255,255,${clamp(f.t * 2, 0, 1)})`; g.beginPath(); g.arc(f.x, f.y, 14 + (0.5 - f.t) * 30, 0, TAU); g.stroke(); } C.fx = C.fx.filter((f) => f.t > 0); }
}
// reife Orangenbäume auf dem Land
function drawOrchard(g) {
  const b = B(), now = bizNow();
  for (const s of CITY.stations) {
    if (s.type !== 'tree' || offscreen(s.x, s.y, 30)) continue;
    if ((b.orchard[s.tree] || 0) > now) continue;
    const col = s.tree % 3 === 0 && fruitUnlocked('mandarin') ? FRUITS.mandarin.col : FRUITS.orange.col;
    for (const [ax, ay] of [[-4, -4], [3, -2], [-1, 2], [4, 3], [-5, 1]]) { g.fillStyle = col; g.fillRect(Math.round(s.x + ax), Math.round(s.y + ay), 2, 2); }
  }
}

// ---------- Alter Spielstand (feste Kübel, Lager-Zähler) -> Inventar 2.0 ----------
function bizMigrate(b) {
  b.v2 = true;
  b.inv = new Array(8 + 2 * ((b.up && b.up.rucksack) || 0)).fill(null);
  b.eq = []; b.sites = { factory: true }; b.boxes = {}; b.price = b.price || {}; b.deliveries = []; b.orchard = {}; b.uid = 1; b.callT = {};
  b.staff = b.staff || { seller: 0, gardener: 0, presser: 0, mixer: 0 };
  if (b.gh) b.sites.greenhouse = true;
  if (!CITY) CITY = buildCity();
  EQ_SOLID = null;
  const put = (id, x, y, site, extra) => { if (!ownsSite(site)) return null; eqCheck(); const E = EQUIP[id]; if (canPlace(id, x, y, E.w, E.h, site, true)) return autoPlace(id, site); const o = placeEquip(id, x, y, 0, site); Object.assign(o, extra || {}); return o; };
  const potsOld = b.pots || [], kindOld = b.potKind || [];
  potsOld.forEach((t, i) => { const p = POT_TILES[i]; if (p) { const o = put('pot', p[0], p[1], 'factory'); if (o) { o.t = t || 0; o.k = kindOld[i] || 'orange'; } } });
  if (b.gh && b.gh.pots) b.gh.pots.forEach((t, i) => { const p = POT_TILES2[i]; if (p) { const o = put('pot', p[0], p[1], 'greenhouse'); if (o) { o.t = t || 0; o.k = (b.gh.kind && b.gh.kind[i]) || 'orange'; } } });
  put(['press', 'propress', 'indpress'][Math.min(2, (b.up && b.up.presse) || 0)], 102, 36, 'factory');
  put('mixer', 102, 40, 'factory');
  if (b.up && b.up.abfuell) autoPlace('filler', 'factory');
  // alte Tasche zuerst in die neue Tasche
  const stock = [];
  const old = b.bag || {};
  for (const [t, src] of [['f', old.fruit], ['j', old.juice]]) for (const k in src || {}) if (src[k] > 0) { const n = slotsAdd(b.inv, t + ':' + k, src[k]); if (n < src[k]) stock.push([t + ':' + k, src[k] - n]); }
  for (const k in b.seeds || {}) if (b.seeds[k] > 0) { const n = slotsAdd(b.inv, 's:' + k, b.seeds[k]); if (n < b.seeds[k]) stock.push(['s:' + k, b.seeds[k] - n]); }
  for (const [t, src] of [['f', b.fruit], ['i', b.ing], ['j', b.juice]]) for (const k in src || {}) if (src[k] > 0) stock.push([t + ':' + k, src[k]]);
  // dann das alte Lager in Kühlschränke und Regale
  let rest = 0;
  for (const [k, n0] of stock) {
    let n = n0 - storeAdd(k, n0);
    while (n > 0) {
      const o = autoPlace('fridge', 'factory') || autoPlace('fridge', 'greenhouse') || autoPlace('shelf', 'factory');
      if (!o) break;
      n -= slotsAdd(o.slots, k, n);
    }
    if (n > 0) n -= slotsAdd(siteBox('factory'), k, n);
    if (n > 0) rest += n * itemValue(k);
  }
  if (!b.eq.some((o) => o.slots)) autoPlace('shelf', 'factory');
  if (rest > 0) { b.register += Math.round(rest * 0.6); bizNotify('ALTBESTAND VERKAUFT: +' + Math.round(rest * 0.6) + '€ IN DER KASSE.', '#ffd23f'); }
  for (const k of ['pots', 'potKind', 'fruit', 'seeds', 'ing', 'juice', 'bag', 'gh']) delete b[k];
  if (b.up) for (const k of ['pot', 'kuehl', 'gh', 'presse', 'abfuell']) delete b.up[k];
  b.eqV = 1; EQ_SOLID = null;
}
