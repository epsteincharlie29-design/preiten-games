'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Saft-Imperium Teil 3:
//  Saft-Qualität, Immobilien (Miete), Überfälle der ZITRONIA AG
// =====================================================================
// Qualität kommt von der Ausstattung: Dünger, Lampen, Abfüllanlage, Gewächshaus
const GRADE_MULT = { C: 1, B: 1.1, A: 1.25, S: 1.4 };
function juiceGrade() {
  const b = B();
  const q = (upLvl('duenger') >= 1) + (upLvl('duenger') >= 2) + (upLvl('lampe') >= 1) + (hasEquip('filler') ? 1 : 0) + (ownsSite('greenhouse') || ownsSite('barn') ? 1 : 0);
  return q >= 5 ? 'S' : q >= 3 ? 'A' : q >= 1 ? 'B' : 'C';
}
const gradeText = () => { const g = juiceGrade(); return g + (g === 'C' ? '' : ' (+' + Math.round((GRADE_MULT[g] - 1) * 100) + '%)'); };

// ---------- Immobilien: geschaffte Auftrags-Gebäude kaufen, bringen Miete ----------
const PROPERTIES = [
  { id: 'm0', price: 5000, rent: 18 }, { id: 'm2', price: 11000, rent: 42 }, { id: 'm6', price: 17000, rent: 60 },
  { id: 'm7', price: 30000, rent: 108 }, { id: 'm9', price: 48000, rent: 175 }, { id: 'm12', price: 78000, rent: 270 },
  { id: 'm14', price: 95000, rent: 325 }, { id: 'm15', price: 120000, rent: 390 }, { id: 'm17', price: 145000, rent: 455 }, { id: 'm18', price: 180000, rent: 540 },
];
const propOf = (bd) => PROPERTIES.find((q) => q.id === bd.id);
const ownsProp = (id) => !!(B().props && B().props[id]);
function rentPerMin() { let r = 0; for (const q of PROPERTIES) if (ownsProp(q.id)) r += q.rent; return r; }
function buyProperty(bd) {
  const pr = propOf(bd), b = B();
  if (!pr) { cityMsg(bd.label + ' STEHT NICHT ZUM VERKAUF.', 2); Sound.play('click'); return; }
  if (save.unlocked <= bd.mission) { cityMsg('ERST DEN AUFTRAG SCHAFFEN, DANN KANNST DU ' + bd.label + ' KAUFEN.', 3); Sound.play('click'); return; }
  if (ownsProp(pr.id)) { cityMsg(bd.label + ' GEHÖRT DIR SCHON. (+' + pr.rent + '€/MIN)', 2); return; }
  if (save.money < pr.price) { cityMsg('ZU WENIG GELD! ' + bd.label + ' KOSTET ' + pr.price + '€.', 2.5); Sound.play('click'); return; }
  save.money -= pr.price; (b.props = b.props || {})[pr.id] = true; persist();
  Sound.play('cash'); Sound.play('levelup');
  cityMsg(bd.label + ' GEHÖRT JETZT DIR! MIETE: ' + pr.rent + '€/MIN (ABHOLEN AN DER KASSE IN DER SAFTFABRIK).', 5);
}

// ---------- Überfälle: die ZITRONIA AG greift deine Saftfabrik an ----------
const RAID_SPOT = [98, 47];
function raidActive() { return save.unlocked <= 13 && B().rank >= 3; }   // bis die ZITRONIA AG (Level 14) erledigt ist
function raidTick() {
  if (NET.mode === 'client' && NET.connected) return;
  const b = B(), now = bizNow();
  if (!raidActive()) { C.raid = null; return; }
  if (!b.raidAt) b.raidAt = now + 420000;
  if (!C.raid && now >= b.raidAt && !C.wanted) {
    C.raid = { until: now + 90000 };
    bizNotify('ALARM! ZITRONIA-SCHLÄGER IN DEINER SAFTFABRIK! 90 SEKUNDEN!', '#ff6a6a');
    Sound.play('whistle'); Sound.play('alert');
  }
  if (C.raid && now > C.raid.until) raidLost('ZU SPÄT! ');
}
function raidLost(pre) {
  const b = B(); let n = 0;
  for (const S of shelfConts()) for (let i = 0; i < S.length; i++) { const s = S[i]; if (!s || s.k[0] !== 'j') continue; const k = Math.floor(s.n * 0.4); s.n -= k; n += k; if (s.n <= 0) S[i] = null; }
  const money = Math.floor(b.register * 0.5); b.register -= money;
  bizNotify((pre || '') + 'ZITRONIA HAT ' + n + ' SÄFTE UND ' + money + '€ GEKLAUT!', '#ff6a6a');
  if (C) C.raid = null;
  b.raidAt = bizNow() + rand(720000, 1200000); persist();
}
function raidWon(cash) {
  const b = B(), reward = 300 + 120 * b.rank;
  save.money += cash + reward; addXP(25);
  if (C) C.raid = null;
  b.raidAt = bizNow() + rand(720000, 1200000); persist();
  return reward;
}
function drawRaidMarker(g) {
  if (!C.raid) return;
  const x = RAID_SPOT[0] * TS + 8, y = RAID_SPOT[1] * TS + 8, r = 12 + Math.sin(T * 8) * 3;
  g.strokeStyle = '#ff3b3b'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.lineWidth = 1;
  txt('ÜBERFALL!', x, y - 24, { g, font: FB, align: 'center', color: Math.floor(T * 4) % 2 ? '#ff3b3b' : '#ffe14d' });
}
