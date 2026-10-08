'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Fahrzeuge (Autohaus) für die offene Stadt
// =====================================================================
const VEHICLES = {
  bike: { name: 'FAHRRAD', price: 300, speed: 190, turbo: 225, accel: 270, turn: 3.5, len: 12, wid: 6, desc: 'LEISE, WENDIG, BILLIG.' },
  scooter: { name: 'E-ROLLER', price: 900, speed: 235, turbo: 265, accel: 320, turn: 3.7, len: 11, wid: 5, desc: 'SURRT DURCH DIE STADT.' },
  car: { name: 'PINKER FLITZER', price: 0, speed: 280, turbo: 340, accel: 300, turn: 2.7, len: 28, wid: 14, desc: 'DEIN TREUES AUTO.' },
  van: { name: 'SAFT-MOBIL', price: 3500, speed: 250, turbo: 300, accel: 250, turn: 2.3, len: 32, wid: 16, desc: '+25% TRINKGELD BEI SAFT-LIEFERUNGEN.' },
  sport: { name: 'SPORTWAGEN', price: 9000, speed: 380, turbo: 470, accel: 430, turn: 3.0, len: 28, wid: 13, desc: 'SEHR SCHNELL. DIE POLIZEI HOLT DICH KAUM EIN.' },
};
const curVehicle = () => VEHICLES[save.vehicle] || VEHICLES.car;

// Kollision: mehrere Punkte entlang des Fahrzeugs prüfen
function vehicleHits(x, y, a, v) {
  const fx = Math.cos(a), fy = Math.sin(a), sx = -fy, sy = fx;
  const hl = v.len / 2 * 0.75, hw = v.wid / 2 * 0.8;
  for (const [l, w] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [0, 0], [hl, 0], [-hl, 0]]) {
    if (citySolidAt(x + fx * l + sx * w, y + fy * l + sy * w, true)) return true;
  }
  return false;
}
function drawVehicle(g, car, inCar, type = save.vehicle, police = false) {
  const v = VEHICLES[type] || VEHICLES.car, x = Math.round(car.x), y = Math.round(car.y);
  if (inCar && car.v > 30 && (type === 'car' || type === 'van' || type === 'sport' || police)) {
    g.fillStyle = 'rgba(255,240,170,0.12)';
    g.beginPath(); g.moveTo(x + Math.cos(car.a) * 14, y + Math.sin(car.a) * 14);
    g.arc(x, y, 90, car.a - 0.35, car.a + 0.35); g.fill();
  }
  g.save(); g.translate(x, y); g.rotate(car.a);
  const L = v.len, Wd = v.wid;
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-L / 2 + 2, -Wd / 2 + 2, L, Wd);
  if (type === 'bike' || type === 'scooter') {
    g.fillStyle = '#111'; g.fillRect(-L / 2, -1, 4, 2); g.fillRect(L / 2 - 4, -1, 4, 2);
    g.fillStyle = type === 'bike' ? '#3fd0ff' : '#7dff7a'; g.fillRect(-L / 2 + 2, -1, L - 4, 2);
    g.fillStyle = '#ddd'; g.fillRect(L / 2 - 3, -3, 1, 6);
    g.restore();
    if (inCar) { g.drawImage(SPR.headC, x - 7, y - 11); if (save.hat !== 'none') drawHat(g, save.hat, x - 7, y - 11, 1); }
    return;
  }
  const col = car.col || (police ? '#f0f0f8' : type === 'van' ? '#ff9a1a' : type === 'sport' ? '#ffd23f' : '#ff3f9a');
  const dark = car.dark || (police ? '#1a2a6a' : type === 'van' ? '#c86a00' : type === 'sport' ? '#c89a00' : '#c41f73');
  g.fillStyle = '#111'; g.fillRect(-L / 2 + 4, -Wd / 2 - 1, 6, 3); g.fillRect(L / 2 - 10, -Wd / 2 - 1, 6, 3); g.fillRect(-L / 2 + 4, Wd / 2 - 2, 6, 3); g.fillRect(L / 2 - 10, Wd / 2 - 2, 6, 3);
  g.fillStyle = col; g.fillRect(-L / 2, -Wd / 2, L, Wd); g.fillStyle = dark; g.fillRect(-L / 2, Wd / 2 - 3, L, 3);
  if (police) { g.fillStyle = '#1a2a6a'; g.fillRect(-L / 2 + 6, -Wd / 2, L - 12, Wd); }
  g.fillStyle = '#1d2a4a'; g.fillRect(L / 2 - 12, -Wd / 2 + 2, 5, Wd - 4); g.fillRect(-L / 2 + 3, -Wd / 2 + 2, 3, Wd - 4);
  if (type === 'car' && !police && !car.col) { g.fillStyle = '#ff7fc0'; g.fillRect(-7, -5, 9, 10); if (upLvl('werbung')) { g.fillStyle = '#ff9a1a'; g.fillRect(-6, -3, 6, 6); } }
  if (type === 'van' && !police) { g.fillStyle = '#ffffff'; g.fillRect(-10, -5, 12, 10); g.fillStyle = '#ff9a1a'; pxEll(g, -4, 0, 3, 3, '#ff9a1a'); g.fillStyle = '#3a9a3a'; g.fillRect(-4, -4, 2, 1); }
  if (type === 'sport' && !police) { g.fillStyle = '#111'; g.fillRect(-2, -Wd / 2, 2, Wd); g.fillRect(-L / 2, -2, 3, 4); g.fillRect(-L / 2 + 1, -Wd / 2 + 1, 2, Wd - 2); }
  if (police) {
    const blink = car.siren && Math.floor(T * 8) % 2, on = car.siren;
    g.fillStyle = on ? (blink ? '#ff2a2a' : '#2a6aff') : '#7a2a2a'; g.fillRect(-2, -4, 3, 3);
    g.fillStyle = on ? (blink ? '#2a6aff' : '#ff2a2a') : '#2a2a7a'; g.fillRect(-2, 1, 3, 3);
    g.fillStyle = '#ffffff'; g.fillRect(-L / 2 + 2, -Wd / 2, 3, 2); g.fillRect(-L / 2 + 2, Wd / 2 - 2, 3, 2);
  }
  g.fillStyle = '#fff6a0'; g.fillRect(L / 2 - 1, -Wd / 2 + 1, 1, 3); g.fillRect(L / 2 - 1, Wd / 2 - 4, 1, 3);
  g.fillStyle = keys.KeyS && inCar ? '#ff2020' : '#8a1010'; g.fillRect(-L / 2, -Wd / 2 + 1, 1, 3); g.fillRect(-L / 2, Wd / 2 - 4, 1, 3);
  g.restore();
  if (inCar) g.drawImage(SPR.headC, x - 7, y - 9);
}

// Fahrzeug zu Lil bringen (Pausenmenü)
function callVehicle() {
  if (C.wanted > 0) { cityMsg('NICHT, WÄHREND DIE POLIZEI DICH SUCHT!', 2.5); Sound.play('click'); return; }
  if (C.inCar) { cityMsg('DU SITZT DOCH SCHON DRIN!', 2); return; }
  if (!PF) pfInit();
  const tx = Math.floor(C.p.x / TS), ty = Math.floor(C.p.y / TS);
  let best = -1, bd = 1e9;
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const x = tx + dx, y = ty + dy;
    if (x < 1 || y < 1 || x >= CW - 1 || y >= CH - 1 || !PF.okCar[y * CW + x]) continue;
    const d = Math.hypot(dx, dy) + (CITY.t[y * CW + x] === '=' ? 0 : 1.5);
    if (d >= 1.5 && d < bd) { bd = d; best = y * CW + x; }
  }
  if (best < 0) { cityMsg('HIER KOMMT KEIN FAHRZEUG HIN. GEH AUF DIE STRASSE!', 2.5); return; }
  const bx = (best % CW) * TS + 8, by = ((best / CW) | 0) * TS + 8;
  C.car.x = bx; C.car.y = by; C.car.v = 0;
  C.car.a = H_ROADS.some((r) => Math.abs(by / TS - (r + 1.5)) < 2) ? 0 : Math.PI / 2;
  Sound.play('door'); cityMsg(curVehicle().name + ' STEHT BEREIT!', 2);
}
// Saft-Laster (Upgrade): fahren durch die Stadt und verkaufen (siehe bizTick)
function updateTrucks(dt) {
  const n = upLvl('laster');
  if (C.trucks.length < n && Math.random() < dt) {
    const s = spawnSpot(carSpawnOk, 260, 900);
    if (s) { const t = makePoliceCar(s.x, s.y, 'patrol'); t.truck = true; C.trucks.push(t); }
  }
  for (const t of C.trucks) updatePoliceCar(t, dt, null, null);
}

// ---------- Autohaus ----------
let autohausMsg = '', autohausMsgT = 0;
function screenAutohaus() {
  drawRoomBg();
  txt('AUTOHAUS', W / 2, 6, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  moneyTag(W - 10, 28);
  panel(10, 40, 226, 200, '#3fd0ff');
  panel(244, 40, 226, 200, '#3fd0ff');
  const ids = Object.keys(VEHICLES);
  const items = ids.map((id) => {
    const v = VEHICLES[id], own = save.vehicles[id], act = save.vehicle === id;
    return { label: v.name, color: act ? '#7dff7a' : own ? '#7ff' : save.money >= v.price ? '#ffffff' : '#aa7777',
      act: () => {
        if (!own) {
          if (save.money < v.price) { Sound.play('click'); autohausMsg = 'ZU WENIG GELD! DU BRAUCHST ' + v.price + '€'; autohausMsgT = 2; return; }
          save.money -= v.price; save.vehicles[id] = true; Sound.play('cash');
        }
        save.vehicle = id; persist();
        // das Fahrzeug steht dann vor dem Autohaus auf der Straße
        C.car.x = 110 * TS + 8; C.car.y = 21 * TS + 8; C.car.a = -Math.PI / 2; C.car.v = 0;
        C.inCar = true; C.p.x = C.car.x; C.p.y = C.car.y; C.cam.x = C.p.x; C.cam.y = C.p.y;
        citySave();
        goto(() => { enterHub(); cityMsg(v.name + ' STEHT BEREIT! GUTE FAHRT.', 3); });
      } };
  });
  items.push({ label: 'ZURÜCK', act: () => enterHub() });
  const sel = listMenu('autohaus', items, 40, 58, 20, { align: 'left', w: 95 });
  ids.forEach((id, i) => {
    const v = VEHICLES[id], st = save.vehicle === id ? 'AKTIV' : save.vehicles[id] ? 'GEKAUFT' : v.price + '€';
    txt(st, 226, 58 + i * 20, { font: FS, align: 'right', color: save.vehicle === id ? '#7dff7a' : save.vehicles[id] ? '#7ff' : '#ffe14d' });
  });
  const id = ids[sel], v = VEHICLES[id];
  if (v) {
    ctx.save(); ctx.translate(357, 100); ctx.scale(3, 3);
    drawVehicle(ctx, { x: 0, y: 0, a: T * 0.6, v: 0 }, false, id);
    ctx.restore();
    txt(v.name, 357, 150, { align: 'center', color: (i) => neon(i), wave: 1 });
    wrap(v.desc, 34).forEach((l, i) => txt(l, 357, 166 + i * 11, { font: FS, align: 'center', color: '#ffffff' }));
    const bar = (label, val, max, y) => {
      txt(label, 256, y, { font: FS, color: '#aaaaaa' });
      ctx.fillStyle = '#222'; ctx.fillRect(330, y + 1, 128, 5);
      ctx.fillStyle = '#3fd0ff'; ctx.fillRect(330, y + 1, Math.round(128 * clamp(val / max, 0, 1)), 5);
    };
    bar('TEMPO', v.speed, 400, 194); bar('TURBO', v.turbo, 480, 206); bar('LENKUNG', v.turn, 4, 218);
  }
  if (autohausMsgT > 0) { autohausMsgT -= frameDt; txt(autohausMsg, W / 2, H - 22, { font: FS, align: 'center', color: '#ff6a6a' }); }
  else txt('ENTER/KLICK = KAUFEN ODER WECHSELN   ESC = ZURÜCK', W / 2, H - 22, { font: FS, align: 'center', color: '#888888' });
  if (uiActive() && pressed.Escape) enterHub();
}
