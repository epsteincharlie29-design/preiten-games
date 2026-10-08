'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Kleinkriminalität in der offenen Stadt
//  (bewusst maßvoll, "nicht zu viel GTA"):
//   - Kassen überfallen: KIOSK + neue TANKSTELLE (Bauplatz E5) - nur mit Waffe, nicht bei Fahndung
//   - Geldautomaten hacken: Timing-Minispiel an ein paar Automaten auf dem Gehweg
//   - Autos knacken: Autos aus dem Verkehr klauen, beim Hehler (Tankstelle) verhökern
//  Polizei-Reaktion immer über crime(stars, reason, always) (police.js; Gäste melden an den Host).
//  Zustand pro Stadtbesuch: C.cr. Dauerhaft: save.s2.crime = { own?, stats } (lazy).
// =====================================================================

const CR_KIOSK = [37, 16];                         // KIOSK-Verkäufer (city2.js)
const CR_TANKE = { x: 158, y: 95, w: 14, h: 5, marker: [165, 94], clerk: [169, 94] };
const CR_ATM_CAND = [[40, 13], [66, 29], [96, 69], [128, 49], [100, 93], [20, 53]];
const CR_ATMS = [];                                // { tx, ty, x, y } - gefüllt in CITY_HOOKS.build
const CR_ROB_CD = 240, CR_ATM_CD = 300;
const CR_COL = '#7dff7a';

function cr_save() {
  save.s2 = save.s2 || {};
  const s = save.s2.crime = save.s2.crime || {};
  s.stats = s.stats || { rob: 0, atm: 0, car: 0 };
  return s;
}
function cr_st() {
  if (!C.cr) C.cr = { cd: {}, atmCd: {}, atmAlarm: {}, rob: null, hack: null, stolen: null, parked: null, arr: 0 };
  return C.cr;
}
const cr_armed = () => !!(C && C.wpn);
const cr_busted = () => (save.stats.arrests || 0) + (save.stats.ko || 0);
const CR_CLERK_LINES = ['NICHT SCHIESSEN! ICH HAB NUR MÜNZEN!', 'NIMM DIE GUMMIBÄRCHEN, ABER LASS MICH LEBEN!', 'ICH VERDIEN HIER 9 EURO DIE STUNDE...', 'DAS IST SCHON DER DRITTE ÜBERFALL HEUTE!', 'WILLST DU AUCH EINE TÜTE?'];

// ---------- Tankstelle (Bauplatz E5) ----------
const CR_TANKE_B = {
  id: 'cr_tanke', x: CR_TANKE.x, y: CR_TANKE.y, w: CR_TANKE.w, h: CR_TANKE.h, roof: '#d8d8e0', label: 'TANKSTELLE', marker: CR_TANKE.marker, markerCol: '#ffd23f', markerText: '€',
  get actLabel() {
    if (!C) return 'TANKSTELLE';
    const S = cr_st();
    if (C.inCar && C.car.cr) return 'GEKLAUTES AUTO VERHÖKERN (' + S.stolen.val + '€)';
    if (!C.inCar && cr_armed()) return (S.cd.tanke || 0) > 0 ? 'KASSE IST NOCH LEER' : 'TANKSTELLE AUSRAUBEN';
    return 'TANKSTELLEN-WURST KAUFEN (15€)';
  },
  act: () => cr_tankeAct(),
};
BUILDINGS.push(CR_TANKE_B);

function cr_tankeAct() {
  const S = cr_st();
  if (C.inCar && C.car.cr) { cr_sellCar(); return; }
  if (C.inCar) { cityMsg('ERST AUSSTEIGEN. DER TANKWART BEDIENT NUR FUSSGÄNGER.', 2.2); return; }
  if (cr_armed()) { cr_robStart('tanke'); return; }
  if (save.money < 15) { cityMsg('NICHT MAL 15€? DANN GIBT ES NUR DEN GERUCH.', 2); Sound.play('click'); return; }
  save.money -= 15; const p = C.p;
  if (p.hp != null && typeof cityMaxHp === 'function') p.hp = Math.min(cityMaxHp(), p.hp + 2);
  persist(); Sound.play('cash');
  cityMsg(pick(['TANKSTELLEN-WURST: SCHMECKT NACH BENZIN. +LEBEN', 'DIE WURST IST VON 2019. SIE IST TROTZDEM LECKER. +LEBEN', 'WURST MIT SENF UND EINEM HAUCH SUPER PLUS. +LEBEN']), 2.8);
}

// ---------- Überfall ----------
function cr_robStart(id) {
  const S = cr_st();
  if (S.rob || S.hack) return;
  if (C.wanted > 0) { cityMsg('ERST DIE POLIZEI ABHÄNGEN. EIN ÜBERFALL NACH DEM ANDEREN!', 2.5); Sound.play('click'); return; }
  if (!cr_armed()) { cityMsg('OHNE WAFFE LACHT DICH DER KASSIERER NUR AUS. (Q = WAFFE)', 2.5); Sound.play('click'); return; }
  if ((S.cd[id] || 0) > 0) { cityMsg('DIE KASSE IST NOCH LEER. KOMM IN ' + Math.ceil(S.cd[id]) + ' S WIEDER.', 2.2); Sound.play('click'); return; }
  const clerk = C.peds.find((q) => q.name === (id === 'kiosk' ? 'KIOSK' : 'TANKWART'));
  const pos = id === 'kiosk' ? CR_KIOSK : CR_TANKE.marker;
  S.rob = { id, t: 0, need: id === 'kiosk' ? 3.2 : 4, x: pos[0] * TS + 8, y: pos[1] * TS + 8, clerk, alarm: rand(1.2, 2.4), alarmed: false, lineT: 0 };
  if (clerk) { clerk.sayText = 'AAAH! EIN ÜBERFALL!'; clerk.sayT = 2; }
  Sound.play('alert');
  cityMsg('ÜBERFALL! BLEIB IN DER NÄHE, BIS DIE KASSE LEER IST!', 2.5);
}
function cr_updateRob(S, dt) {
  const R = S.rob;
  if (!R) return;
  if (C.inCar || dist(C.p.x, C.p.y, R.x, R.y) > 56) {
    S.rob = null; S.cd[R.id] = 30;
    cityMsg('ÜBERFALL ABGEBROCHEN! DER KASSIERER HAT TROTZDEM GEPETZT.', 2.5); crime(1, 'VERSUCHTER ÜBERFALL!', true); return;
  }
  R.t += dt; R.lineT -= dt;
  if (R.clerk && R.lineT <= 0) { R.lineT = 1.4; R.clerk.sayText = pick(CR_CLERK_LINES); R.clerk.sayT = 1.4; }
  if (!R.alarmed && R.t >= R.alarm) { R.alarmed = true; crime(2, R.id === 'kiosk' ? 'KIOSK ÜBERFALLEN!' : 'TANKSTELLE ÜBERFALLEN!', true); }
  if (R.t >= R.need) {
    const loot = R.id === 'kiosk' ? randi(150, 320) : randi(260, 520);
    S.rob = null; S.cd[R.id] = CR_ROB_CD;
    save.money += loot; save.stats.stolen = (save.stats.stolen || 0) + loot; cr_save().stats.rob++; persist();
    Sound.play('cash');
    cityMsg('KASSE AUSGERÄUMT: +' + loot + '€' + (R.id === 'kiosk' ? ' (UND EINE TÜTE SAURE ZUNGEN)' : ' (UND EIN DUFTBAUM)') + '. JETZT WEG HIER!', 3.5);
    if (R.clerk) { R.clerk.sayText = 'DAS SAG ICH MEINER MAMA!'; R.clerk.sayT = 2.5; }
  }
}

// ---------- Geldautomaten ----------
CITY_HOOKS.build.push((set, rect, t) => {
  CR_ATMS.length = 0;
  for (const [cx, cy] of CR_ATM_CAND) {
    let best = null, bd = 99;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 1 || y < 1 || x >= CW - 1 || y >= CH - 1 || t[y * CW + x] !== '_') continue;
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    if (best) CR_ATMS.push({ tx: best[0], ty: best[1], x: best[0] * TS + 8, y: best[1] * TS + 8 });
  }
});
function cr_zone(w) { const a = rand(0.08, 0.92 - w); return [a, a + w]; }
function cr_hackStart(i) {
  const S = cr_st();
  if (S.rob || S.hack) return;
  if (C.wanted > 0) { cityMsg('MIT DER POLIZEI IM NACKEN HACKT ES SICH SCHLECHT.', 2.5); Sound.play('click'); return; }
  if ((S.atmCd[i] || 0) > 0) { cityMsg('DIESER AUTOMAT IST LEER. "BITTE BESUCHEN SIE UNS IN ' + Math.ceil(S.atmCd[i]) + ' S WIEDER."', 2.5); Sound.play('click'); return; }
  S.hack = { i, round: 0, pos: 0, dir: 1, sp: 0.75, zone: cr_zone(0.28), t: 9, flash: 0 };
  Sound.play('select');
}
function cr_hackHit() {
  const S = cr_st(), H_ = S.hack;
  if (!H_) return;
  if (H_.pos >= H_.zone[0] && H_.pos <= H_.zone[1]) {
    H_.round++; H_.flash = 0.25; Sound.play('blip');
    if (H_.round >= 3) { cr_hackDone(true); return; }
    H_.zone = cr_zone((H_.zone[1] - H_.zone[0]) * 0.72); H_.sp *= 1.35;
  } else cr_hackDone(false);
}
function cr_hackDone(ok) {
  const S = cr_st(), H_ = S.hack, a = CR_ATMS[H_.i];
  S.hack = null; S.atmCd[H_.i] = CR_ATM_CD;
  if (ok) {
    const loot = randi(180, 420);
    let left = loot; while (left > 0) { const v = Math.min(left, randi(40, 90)); left -= v; dropCash(a.x + rand(-10, 10), a.y + rand(4, 14), v); }
    cr_save().stats.atm++; save.stats.stolen = (save.stats.stolen || 0) + loot; persist();
    Sound.play('cash'); cityMsg('ZUGRIFF GEWÄHRT! DER AUTOMAT SPUCKT ' + loot + '€ AUS. AUFSAMMELN!', 3);
    if (Math.random() < 0.3) crime(1, 'STILLER ALARM AM GELDAUTOMATEN!', true);
  } else {
    S.atmAlarm[H_.i] = 8; Sound.play('cr_alarm');
    cityMsg('FALSCHER CODE! DER AUTOMAT SCHREIT UM HILFE!', 2.5);
    crime(2, 'GELDAUTOMAT-ALARM!', true);
  }
}
function cr_updateHack(S, dt) {
  const H_ = S.hack;
  if (!H_) return;
  const a = CR_ATMS[H_.i];
  if (!a || C.inCar || dist(C.p.x, C.p.y, a.x, a.y) > 34) { S.hack = null; cityMsg('VERBINDUNG ZUM AUTOMATEN GETRENNT.', 1.8); return; }
  H_.pos += H_.dir * H_.sp * dt; H_.flash -= dt;
  if (H_.pos > 1) { H_.pos = 1; H_.dir = -1; } else if (H_.pos < 0) { H_.pos = 0; H_.dir = 1; }
  H_.t -= dt;
  if (H_.t <= 0) cr_hackDone(false);
}

// ---------- Autos knacken ----------
function cr_restoreOwn() {
  const s = cr_save(), o = s.own;
  delete C.car.col; delete C.car.dark; delete C.car.cr;
  if (!o) return;
  C.car.x = o.x; C.car.y = o.y; C.car.a = o.a || 0; C.car.v = 0;
  if (o.veh) save.vehicle = o.veh;
  delete s.own; persist();
}
function cr_enterStolen(car, val, fresh) {
  const S = cr_st(), s = cr_save();
  if (!s.own) s.own = { x: C.car.x, y: C.car.y, a: C.car.a, veh: save.vehicle };
  save.vehicle = 'car';
  Object.assign(C.car, { x: car.x, y: car.y, a: car.a, v: 0, col: car.col, dark: car.dark, cr: 1 });
  S.stolen = { val, col: car.col, dark: car.dark, lv: 0 }; S.arr = cr_busted(); S.parked = null;
  C.inCar = true; C.p.x = C.car.x; C.p.y = C.car.y;
  persist(); Sound.play('door'); if (typeof cityMusic === 'function') cityMusic();
  cityMsg(fresh ? 'AUTO GEKNACKT! WERT CA. ' + val + '€ - BRING ES ZUM HEHLER AN DER TANKSTELLE (STRAND OST).' : 'WIEDER DRIN. DER HEHLER WARTET AN DER TANKSTELLE.', 3.5);
}
function cr_jack(t) {
  const S = cr_st();
  if (C.inCar || C.car.cr) return;
  const i = (C.traffic || []).indexOf(t);
  if (i < 0) return;
  C.traffic.splice(i, 1);
  // Fahrer fliegt raus
  const d = Object.assign(makePed(Math.floor(t.y / TS) * CW + Math.floor(t.x / TS)), { x: t.x + Math.cos(t.a + Math.PI / 2) * 14, y: t.y + Math.sin(t.a + Math.PI / 2) * 14, state: 'down', downT: 2.2, downAng: t.a, sayText: pick(['MEIN AUTO!!', 'DAS IST EIN LEASING-WAGEN!', 'HILFE! POLIZEI!', 'MEINE SAFTKISTE IST NOCH IM KOFFERRAUM!']), sayT: 2.5 });
  if (!citySolidAt(d.x, d.y)) C.peds.push(d);
  Sound.play('punch');
  cr_save().stats.car++;
  cr_enterStolen(t, randi(350, 750), true);
  crime(1, 'AUTODIEBSTAHL!', Math.random() < 0.5);
}
function cr_sellCar() {
  const S = cr_st();
  if (C.wanted > 0) { cityMsg('HEHLER: "MIT DEN BULLEN IM SCHLEPPTAU? VERGISS ES!"', 2.5); Sound.play('click'); return; }
  if (Math.abs(C.car.v) > 40) { cityMsg('ERST ANHALTEN!', 1.5); return; }
  const v = S.stolen ? S.stolen.val : 300;
  S.stolen = null; C.inCar = false; C.car.v = 0;
  const m = CR_TANKE.marker; C.p.x = m[0] * TS + 8; C.p.y = m[1] * TS + 8 + 8;
  cr_restoreOwn();
  save.money += v; persist(); Sound.play('cash'); if (typeof cityMusic === 'function') cityMusic();
  cityMsg('HEHLER: "SCHÖNE KARRE. ' + v + '€, KEINE FRAGEN." DEIN EIGENES FAHRZEUG STEHT NOCH, WO DU ES GELASSEN HAST.', 4.5);
}
function cr_updateCar(S, dt) {
  if (C.car.cr) {
    if (!C.inCar) {
      const conf = cr_busted() !== S.arr;
      if (!conf) S.parked = { x: C.car.x, y: C.car.y, a: C.car.a, col: C.car.col, dark: C.car.dark, val: S.stolen ? S.stolen.val : 300, t: 0 };
      else cityMsg('DIE POLIZEI HAT DAS GEKLAUTE AUTO BESCHLAGNAHMT.', 3);
      S.stolen = null; cr_restoreOwn();
    } else if (S.stolen) {   // Blechschäden mindern den Wert
      const v = C.car.v;
      if (Math.abs(S.stolen.lv - v) > 110 && Math.abs(S.stolen.lv) > 110) { S.stolen.val = Math.max(100, S.stolen.val - 30); }
      S.stolen.lv = v;
    }
  }
  if (S.parked) { S.parked.t += dt; if (S.parked.t > 150 && offscreen(S.parked.x, S.parked.y, 60)) S.parked = null; }
}

// ---------- Hooks ----------
CITY_HOOKS.init.push((C_) => {
  C_.cr = null;
  // Spielstand mitten im Autodiebstahl gespeichert? -> eigenes Fahrzeug zurück
  if (save.s2 && save.s2.crime && save.s2.crime.own) { C_.inCar = false; cr_restoreOwn(); }
  C_.peds.push(Object.assign(makePed(CR_TANKE.clerk[1] * CW + CR_TANKE.clerk[0]), { still: true, name: 'TANKWART', a: -Math.PI / 2, suit: '#2a4a8a', shirt: '#ffd23f', hair: '#aaaaaa', glasses: true }));
});
CITY_HOOKS.talk.TANKWART = (q) => {
  q.sayText = pick(['SUPER, DIESEL ODER O-SAFT?', 'DIE WURST IST FRISCH. RELATIV GESEHEN.', 'HINTEN IN DER GARAGE KAUFT EINER AUTOS. FRAG NICHT, WOHER.', 'BITTE NICHT ÜBERFALLEN. ICH HAB RÜCKEN.']);
  q.sayT = 2.6; Sound.play('blip', true);
};
CITY_HOOKS.update.push((dt) => {
  if (!C || !CITY) return;
  const S = cr_st();
  for (const k in S.cd) S.cd[k] = Math.max(0, S.cd[k] - dt);
  for (const k in S.atmCd) S.atmCd[k] = Math.max(0, S.atmCd[k] - dt);
  for (const k in S.atmAlarm) S.atmAlarm[k] = Math.max(0, S.atmAlarm[k] - dt);
  cr_updateRob(S, dt);
  cr_updateHack(S, dt);
  cr_updateCar(S, dt);
});
CITY_HOOKS.prompt.push((p) => {
  if (!C || !CITY) return null;
  const S = cr_st();
  if (S.hack) return { label: 'JETZT DRÜCKEN, WENN DER BALKEN IM GRÜNEN IST!', act: () => cr_hackHit() };
  if (S.rob) return null;
  const out = [];
  if (!C.inCar) {
    // Kiosk-Kasse (nur mit Waffe sichtbar)
    const kx = CR_KIOSK[0] * TS + 8, ky = CR_KIOSK[1] * TS + 8;
    // mit Waffe in der Hand hat der Überfall Vorrang vor der Theke (Waffe weg = normal einkaufen)
    if (cr_armed() && dist(p.x, p.y, kx, ky) < 44) return { label: (S.cd.kiosk || 0) > 0 ? 'KASSE IST NOCH LEER (WAFFE WEG = EINKAUFEN)' : 'KIOSK-KASSE AUSRAUBEN (WAFFE WEG = EINKAUFEN)', act: () => cr_robStart('kiosk') };
    for (let i = 0; i < CR_ATMS.length; i++) {
      const a = CR_ATMS[i];
      if (Math.abs(p.x - a.x) < 40 && Math.abs(p.y - a.y) < 40) out.push({ label: (S.atmCd[i] || 0) > 0 ? 'GELDAUTOMAT (LEER)' : 'GELDAUTOMAT HACKEN', x: a.x, y: a.y, r: 22, act: () => cr_hackStart(i) });
    }
    for (const t of C.traffic || []) {
      if (Math.abs(p.x - t.x) < 40 && Math.abs(p.y - t.y) < 40 && Math.abs(t.v) < 150) out.push({ label: 'AUTO KNACKEN', x: t.x, y: t.y, r: 22, act: () => cr_jack(t) });
    }
    const pk = S.parked;
    if (pk && !C.car.cr && Math.abs(p.x - pk.x) < 40 && Math.abs(p.y - pk.y) < 40) out.push({ label: 'GEKLAUTES AUTO NEHMEN', x: pk.x, y: pk.y, r: 24, act: () => cr_enterStolen(pk, pk.val, false) });
  }
  return out;
});

// ---------- Zeichnen ----------
function cr_drawAtm(g, a, i, S) {
  const x = Math.round(a.x), y = Math.round(a.y), alarm = (S.atmAlarm[i] || 0) > 0, empty = (S.atmCd[i] || 0) > 0;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 4, y - 2, 10, 9);
  g.fillStyle = '#5a6a7a'; g.fillRect(x - 5, y - 9, 10, 15);
  g.fillStyle = '#3a4a5a'; g.fillRect(x - 5, y + 3, 10, 3);
  g.fillStyle = alarm ? (Math.floor(T * 8) % 2 ? '#ff2a2a' : '#ffe14d') : empty ? '#22303a' : (Math.floor(T * 1.5) % 2 ? '#3fd0ff' : '#2a9ac8');
  g.fillRect(x - 3, y - 7, 6, 4);
  g.fillStyle = '#111'; g.fillRect(x - 3, y - 1, 6, 1);
  g.fillStyle = '#7dff7a'; g.fillRect(x - 4, y - 11, 8, 2);
  if (alarm && Math.floor(T * 8) % 2) { g.fillStyle = 'rgba(255,40,40,0.25)'; g.beginPath(); g.arc(x, y - 4, 16, 0, TAU); g.fill(); }
}
function cr_drawTanke(g) {
  const m = CR_TANKE.marker, y = m[1] * TS + 2;
  for (const tx of [160, 170]) {
    const x = tx * TS + 8;
    if (offscreen(x, y, 30)) continue;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 4, y + 2, 10, 8);
    g.fillStyle = '#c41f2a'; g.fillRect(x - 5, y - 8, 10, 15);
    g.fillStyle = '#f2f2e0'; g.fillRect(x - 3, y - 6, 6, 4);
    g.fillStyle = '#111'; g.fillRect(x + 5, y - 4, 2, 8); g.fillRect(x + 6, y + 3, 3, 1);
    g.fillStyle = '#ffd23f'; g.fillRect(x - 5, y - 10, 10, 2);
  }
}
CITY_HOOKS.draw.push((g) => {
  if (!C || !CITY) return;
  const S = cr_st();
  CR_ATMS.forEach((a, i) => { if (!offscreen(a.x, a.y, 20)) cr_drawAtm(g, a, i, S); });
  cr_drawTanke(g);
  const pk = S.parked;
  if (pk && !offscreen(pk.x, pk.y, 40)) { drawVehicle(g, pk, false, 'car'); if (Math.floor(T * 2) % 2) txt('!', pk.x, pk.y - 18, { font: FB, align: 'center', color: '#ffd23f' }); }
  if (S.rob) {   // Fortschrittsbalken über der Kasse
    const R = S.rob, k = clamp(R.t / R.need, 0, 1);
    g.fillStyle = '#000'; g.fillRect(Math.round(R.x) - 16, Math.round(R.y) - 30, 32, 5);
    g.fillStyle = '#ffd23f'; g.fillRect(Math.round(R.x) - 15, Math.round(R.y) - 29, Math.round(30 * k), 3);
  }
});
CITY_HOOKS.drawHud.push((g) => {
  if (!C || !CITY) return;
  const S = cr_st();
  // Minikarte: Automaten + Tankstelle schon über BUILDINGS; geklautes Auto
  const ms = 0.42, mw = Math.round(CW * ms), mh = Math.round(CH * ms), mx = W - mw - 6, my = H - mh - 6;
  const dot = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(mx + x / TS * ms) - 1, Math.round(my + y / TS * ms) - 1, 2, 2); };
  for (let i = 0; i < CR_ATMS.length; i++) if (!(S.atmCd[i] > 0)) dot(CR_ATMS[i].x, CR_ATMS[i].y, CR_COL);
  if (S.parked) dot(S.parked.x, S.parked.y, '#ffd23f');
  if (C.car.cr && S.stolen) {
    panel(W / 2 - 110, 18, 220, 14, '#ffd23f');
    txt('GEKLAUTES AUTO: ' + S.stolen.val + '€ - AB ZUR TANKSTELLE (STRAND OST)', W / 2, 21, { font: FS, align: 'center', color: '#ffd23f' });
  }
  if (S.rob) {
    const R = S.rob;
    panel(W / 2 - 90, 18, 180, 22, '#ff3b3b');
    txt('ÜBERFALL! KASSE LEEREN...', W / 2, 21, { font: FS, align: 'center', color: '#ff6a6a' });
    g.fillStyle = '#222'; g.fillRect(W / 2 - 80, 31, 160, 5); g.fillStyle = '#ffd23f'; g.fillRect(W / 2 - 80, 31, Math.round(160 * clamp(R.t / R.need, 0, 1)), 5);
  }
  const H_ = S.hack;
  if (H_) {
    const bw = 200, bx = Math.round(W / 2 - bw / 2), by = 70;
    g.fillStyle = 'rgba(0,12,4,0.92)'; g.fillRect(bx - 10, by - 26, bw + 20, 74);
    g.strokeStyle = H_.flash > 0 ? '#ffffff' : CR_COL; g.lineWidth = 1; g.strokeRect(bx - 9.5, by - 25.5, bw + 19, 73);
    txt('BANK-O-MAT 3000 // HACK.EXE', W / 2, by - 21, { font: FS, align: 'center', color: CR_COL });
    txt('CODE ' + (H_.round + 1) + '/3   ZEIT ' + Math.max(0, H_.t).toFixed(1) + ' S', W / 2, by - 11, { font: FS, align: 'center', color: '#bfffbf' });
    g.fillStyle = '#062a10'; g.fillRect(bx, by, bw, 12);
    g.fillStyle = '#2aff6a'; g.fillRect(bx + Math.round(H_.zone[0] * bw), by, Math.max(2, Math.round((H_.zone[1] - H_.zone[0]) * bw)), 12);
    g.fillStyle = '#ffffff'; g.fillRect(bx + Math.round(H_.pos * bw) - 1, by - 3, 3, 18);
    for (let i = 0; i < 3; i++) { g.fillStyle = i < H_.round ? CR_COL : '#1a3a22'; g.fillRect(W / 2 - 22 + i * 16, by + 18, 12, 6); }
    txt('[E] IM GRÜNEN BEREICH DRÜCKEN - DANEBEN = ALARM!', W / 2, by + 30, { font: FS, align: 'center', color: '#ffe14d' });
  }
});

// ---------- Sound + Erfolg ----------
if (typeof Sound !== 'undefined' && Sound.addSfx) {
  Sound.addSfx('cr_alarm', () => { const { tone, now } = Sound.synth, t = now();
    for (let i = 0; i < 4; i++) tone({ type: 'square', f: i % 2 ? 660 : 880, dur: 0.14, vol: 0.07, lp: 2400, t: t + i * 0.15 }); });
}
ACHIEVEMENTS.push({ id: 'cr_ganove', name: 'KLEINGANOVE', desc: 'KASSE, AUTOMAT UND AUTO GEKNACKT', pay: 1500,
  ok: () => { const s = save.s2 && save.s2.crime && save.s2.crime.stats; return !!s && s.rob > 0 && s.atm > 0 && s.car > 0; } });
