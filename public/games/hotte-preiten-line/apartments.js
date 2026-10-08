'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Wohnungen zum Freischalten
//  Jede Wohnung hat ein Bett (speichern) und eine Schnellreise-Tafel
//  und bringt +5% Geld bei jedem geschafften Auftrag.
// =====================================================================
const APARTMENTS = [
  { id: 'apt1', name: 'BAUWAGEN', price: 2000, desc: 'KLEIN, ABER DEINS. GLEICH NEBEN DEM PARK.' },
  { id: 'apt2', name: 'LOFT', price: 15000, desc: 'INDUSTRIE-CHIC IM NEUEN OSTVIERTEL.' },
  { id: 'apt3', name: 'STRANDVILLA', price: 40000, desc: 'DIREKT AM STRAND. MIT ANGELSTEG.' },
  { id: 'apt4', name: 'PENTHOUSE', price: 90000, desc: 'GANZ OBEN. MIT BLICK AUF DEN CYBERCORP TOWER.' },
];
const APT_BY_ID = {};
for (const a of APARTMENTS) APT_BY_ID[a.id] = a;
const ownsApt = (id) => !!(save.apts && save.apts[id]);
const aptCount = () => APARTMENTS.filter((a) => ownsApt(a.id)).length;
const aptBonus = () => 0.05 * aptCount();
// Kaufen an der Tür: zweimal [E] drücken (Sicherheitsabfrage)
function aptTryBuy(bd) {
  const a = APT_BY_ID[bd.apt];
  if (!a) return;
  if (save.money < a.price) { cityMsg('ZU WENIG GELD! ' + a.name + ' KOSTET ' + a.price + '€. (' + a.desc + ')', 3); Sound.play('click'); return; }
  if (!C.aptAsk || C.aptAsk.id !== a.id || T - C.aptAsk.t > 4) { C.aptAsk = { id: a.id, t: T }; cityMsg(a.name + ' FÜR ' + a.price + '€ KAUFEN? NOCHMAL [E] DRÜCKEN!', 4); Sound.play('select'); return; }
  C.aptAsk = null;
  save.money -= a.price; (save.apts = save.apts || {})[a.id] = true; persist();
  Sound.play('cash'); Sound.play('levelup');
  cityMsg(a.name + ' GEHÖRT DIR! BETT = SPEICHERN, TAFEL = SCHNELLREISE, +5% GELD PRO AUFTRAG.', 6);
}
// Feld direkt hinter der Tür (innen)
function doorInside(b) {
  const [dx, dy] = b.door;
  if (dy === b.y + b.h - 1) return [dx, dy - 1];
  if (dy === b.y) return [dx, dy + 1];
  if (dx === b.x) return [dx + 1, dy];
  return [dx - 1, dy];
}
function travelSpots() {
  const out = [];
  const add = (id, label) => { const b = BUILDINGS.find((q) => q.id === id); if (b && !(b.locked && b.locked())) out.push({ label, b }); };
  add('home', 'ZUHAUSE'); add('factory', 'SAFTFABRIK'); add('greenhouse', 'GEWÄCHSHAUS'); add('casino', 'CASINO');
  for (const a of APARTMENTS) if (ownsApt(a.id)) add(a.id, a.name);
  return out;
}
function travelTo(b) {
  const [x, y] = doorInside(b);
  C.p.x = x * TS + 8; C.p.y = y * TS + 8; C.inCar = false; C.travel = false;
  C.cam.x = C.p.x; C.cam.y = C.p.y;
  Sound.play('door'); cityMusic();
  cityMsg('SCHNELLREISE: ' + b.label + '. DEIN FAHRZEUG HOLST DU ÜBERS MENÜ (ESC).', 3.5);
}
function openTravel() {
  if (C.wanted > 0) { cityMsg('NICHT, WÄHREND DIE POLIZEI DICH SUCHT!', 2.5); Sound.play('click'); return; }
  C.travel = true; C.travelAt = T; Sound.play('select');
}
function drawTravel() {
  const x = W / 2 - 110, y = 40, w = 220, h = 190;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = '#c8a070'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#b08a5a'; for (let k = 0; k < 9; k++) ctx.fillRect(x + 6 + ((k * 37) % (w - 16)), y + 10 + ((k * 53) % (h - 20)), 2, 2);
  txt('SCHNELLREISE', W / 2, y + 8, { align: 'center', color: '#3a2410' });
  const items = travelSpots().map((s) => ({ label: s.label, color: '#2a1a0a', act: () => travelTo(s.b) }));
  items.push({ label: 'ZURÜCK', color: '#5a2a00', act: () => { C.travel = false; } });
  listMenu('travel', items, W / 2, y + 34, 16, { max: 8 });
  txt('WOHNUNGEN: ' + aptCount() + '/' + APARTMENTS.length + '  -  +' + Math.round(aptBonus() * 100) + '% GELD PRO AUFTRAG', W / 2, y + h - 22, { font: FS, align: 'center', color: '#3a2410' });
  txt('[ESC] ZU', W / 2, y + h - 11, { font: FS, align: 'center', color: '#5a3a1a' });
  if (uiActive() && pressed.Escape && T - (C.travelAt || 0) > 0.1) C.travel = false;
}
