'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Polizei, Fahndung & Taschendiebstahl
//  Verbrechen (Leute anfahren, Klauen, Polizei rammen) geben Sterne.
//  1 Stern: du kannst dich in Gebäuden verstecken. Ab 2 Sternen kommen
//  die Polizisten auch rein. Nicht gesehen werden = Sterne verschwinden.
//  Erwischt = Strafe zahlen und vor der Wache aufwachen.
// =====================================================================
const POLICE_SPOT = [111, 5], POLICE_CAR_SPOT = [109, 6];
const WANTED_CFG = [
  { foot: 3, cars: 2 },
  { foot: 1, cars: 1, footSp: 64, carSp: 132, lose: 13, tip: 7 },
  { foot: 2, cars: 1, footSp: 70, carSp: 154, lose: 19, tip: 5.5 },
  { foot: 3, cars: 2, footSp: 77, carSp: 176, lose: 25, tip: 4.5 },
  { foot: 4, cars: 3, footSp: 82, carSp: 188, lose: 32, tip: 3.5 },
];
const WANTED_MAX = 4;
const COP_LINES = ['HALT! POLIZEI!', 'STEHEN BLEIBEN, LIL!', 'DU KOMMST NICHT WEIT!', 'IM NAMEN DES GESETZES!', 'ZENTRALE, BRAUCHE VERSTÄRKUNG!',
  'NUR NOCH 2 TAGE BIS ZUR RENTE...', 'HÄNDE HOCH! ODER SAFT HER!', 'ICH HAB DICH GLEICH!', 'WER RENNT, IST VERDÄCHTIG!'];
const VICTIM_LINES = ['HEY! DIEB!!!', 'HILFE! POLIZEI!', 'MEIN PORTEMONNAIE!!', 'HALT! DER KLAUT!'];
const POLICE_V = { len: 28, wid: 14 };
const DIRS4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // (DIRS8 kommt aus world.js)

// ---------- Wegfindung (Flussfelder über die Stadtkarte) ----------
let PF = null;
function pfInit() {
  const N = CW * CH, okDoor = new Uint8Array(N), okNoDoor = new Uint8Array(N), okCar = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const s = CITY.solid[i]; okDoor[i] = s ? 0 : 1; okNoDoor[i] = s || CITY.t[i] === 'D' ? 0 : 1; }
  for (let y = 1; y < CH - 1; y++) for (let x = 1; x < CW - 1; x++) {
    let ok = 1;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!okNoDoor[(y + dy) * CW + x + dx]) { ok = 0; break; }
    okCar[y * CW + x] = ok;
  }
  PF = { okDoor, okNoDoor, okCar, foot: new Int16Array(N).fill(-1), car: new Int16Array(N).fill(-1), q: new Int32Array(N), footKey: -1, carKey: -1 };
}
function nearestOk(ok, tx, ty) {
  for (let r = 0; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = tx + dx, y = ty + dy;
    if (x >= 0 && y >= 0 && x < CW && y < CH && ok[y * CW + x]) return y * CW + x;
  }
  return -1;
}
function bfs(field, ok, seed) {
  field.fill(-1);
  if (seed < 0) return;
  const q = PF.q; let h = 0, t = 0;
  field[seed] = 0; q[t++] = seed;
  while (h < t) {
    const i = q[h++], x = i % CW, d = field[i] + 1;
    if (x > 0 && ok[i - 1] && field[i - 1] < 0) { field[i - 1] = d; q[t++] = i - 1; }
    if (x < CW - 1 && ok[i + 1] && field[i + 1] < 0) { field[i + 1] = d; q[t++] = i + 1; }
    if (i >= CW && ok[i - CW] && field[i - CW] < 0) { field[i - CW] = d; q[t++] = i - CW; }
    if (i < CW * (CH - 1) && ok[i + CW] && field[i + CW] < 0) { field[i + CW] = d; q[t++] = i + CW; }
  }
}
// nächster Wegpunkt Richtung Ziel (Mitte des besten Nachbarfelds)
function flowStep(field, ok, x, y) {
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS), i = ty * CW + tx;
  let best = -1, bd = field[i] >= 0 ? field[i] : 1e9;
  for (const [dx, dy] of DIRS8) {
    const nx = tx + dx, ny = ty + dy;
    if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue;
    const n = ny * CW + nx;
    if (field[n] < 0) continue;
    if (dx && dy && (!ok[ty * CW + nx] || !ok[ny * CW + tx])) continue;   // keine Ecken schneiden
    const d = field[n] + (dx && dy ? 0.45 : 0);
    if (d < bd) { bd = d; best = n; }
  }
  return best < 0 ? null : { x: (best % CW) * TS + 8, y: ((best / CW) | 0) * TS + 8, d: bd };
}
function copsUseDoors() { return C.wanted >= 2; }
function updateFields() {
  const tgt = C.lastKnown, tx = Math.floor(tgt.x / TS), ty = Math.floor(tgt.y / TS);
  const okF = copsUseDoors() ? PF.okDoor : PF.okNoDoor;
  const fk = ty * CW + tx + (copsUseDoors() ? 1e6 : 0);
  if (fk !== PF.footKey) { PF.footKey = fk; bfs(PF.foot, okF, nearestOk(okF, tx, ty)); }
  if (ty * CW + tx !== PF.carKey) { PF.carKey = ty * CW + tx; bfs(PF.car, PF.okCar, nearestOk(PF.okCar, tx, ty)); }
}
// Sichtlinie in der Stadt (Gebäude, Mauern und Bäume blockieren)
function cityLOS(x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 6);
  for (let k = 1; k < n; k++) {
    const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
    if (CITY.solid[Math.floor(y / TS) * CW + Math.floor(x / TS)]) return false;
  }
  return true;
}

// ---------- Einheiten ----------
function makeCop(x, y, mode) {
  return Object.assign(makePed(Math.floor(y / TS) * CW + Math.floor(x / TS)), {
    x, y, cop: true, suit: '#1a2a6a', shirt: '#9ab0ff', hair: '#1a1a1a', glasses: false, mode: mode || 'patrol', lineT: rand(2, 5), searchT: 0,
  });
}
function centerLine(tx, ty) { return H_ROADS.includes(ty - 1) || V_ROADS.includes(tx - 1); }
function makePoliceCar(x, y, mode) {
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  const onH = H_ROADS.includes(ty - 1), onV = V_ROADS.includes(tx - 1);
  const d = onH && onV ? randi(0, 3) : onH ? pick([0, 2]) : pick([1, 3]);
  return { x, y, cx: x, cy: y, d, a: d * Math.PI / 2, v: mode === 'chase' ? 120 : 100, mode: mode || 'patrol', siren: mode === 'chase', off: 0, stuckT: 0, revT: 0, dropped: 0, honkT: 0 };
}
// zufälliger Platz außerhalb des Bildschirms
function spawnSpot(ok, minD = 300, maxD = 470) {
  for (let k = 0; k < 90; k++) {
    const a = rand(TAU), d = rand(minD, maxD);
    const tx = Math.floor((C.cam.x + Math.cos(a) * d) / TS), ty = Math.floor((C.cam.y + Math.sin(a) * d) / TS);
    if (tx < 1 || ty < 1 || tx >= CW - 1 || ty >= CH - 1) continue;
    if (ok(tx, ty)) return { x: tx * TS + 8, y: ty * TS + 8 };
  }
  return null;
}
const footSpawnOk = (tx, ty) => { const c = CITY.t[ty * CW + tx]; return (c === '_' || c === 'P') && PF.okNoDoor[ty * CW + tx]; };
const carSpawnOk = (tx, ty) => centerLine(tx, ty) && CITY.t[ty * CW + tx] === '=';
function offscreen(x, y, m = 40) { return Math.abs(x - C.cam.x) > W / 2 + m || Math.abs(y - C.cam.y) > H / 2 + m; }

function policeInit() {
  if (!PF) pfInit();
  C.wanted = clamp(save.wanted | 0, 0, WANTED_MAX);
  C.cops = []; C.pcars = [];
  C.lostT = 0; C.bust = 0; C.crimeCd = 0; C.busted = null; C.pick = null; C.sirenT = 0; C.seen = false; C.fieldT = 0;
  C.lastKnown = { x: C.p.x, y: C.p.y };
  PF.footKey = PF.carKey = -1;
  policeFill();
  if (C.wanted) startChase(true);
}
// Streife auffüllen bzw. Verstärkung schicken
function policeFill() {
  const cfg = WANTED_CFG[C.wanted], chase = C.wanted > 0, mode = chase ? 'chase' : 'patrol';
  const foot = C.cops.filter((q) => q.mode === mode).length, cars = C.pcars.filter((q) => q.mode === mode).length;
  // Verstärkung kommt von außerhalb des Bildschirms und fährt erst nach kurzer Zeit los
  for (let k = foot; k < cfg.foot; k++) {
    const s = spawnSpot(footSpawnOk, chase ? 290 : 300, chase ? 420 : 900);
    if (s) C.cops.push(Object.assign(makeCop(s.x, s.y, mode), { waitT: chase ? rand(2, 3.5) : 0 }));
  }
  for (let k = cars; k < cfg.cars; k++) {
    const s = spawnSpot(carSpawnOk, chase ? 380 : 330, chase ? 560 : 900);
    if (s) C.pcars.push(Object.assign(makePoliceCar(s.x, s.y, mode), { waitT: chase ? rand(2.5, 4) : 0 }));
  }
}
function startChase(quiet) {
  for (const q of C.cops) if (q.mode !== 'leave' && (q.mode === 'chase' || dist(q.x, q.y, C.p.x, C.p.y) < 420)) { q.mode = 'chase'; if (!quiet) { q.sayText = pick(COP_LINES); q.sayT = 2; } }
  for (const c of C.pcars) if (c.mode !== 'leave' && dist(c.x, c.y, C.p.x, C.p.y) < 520) { c.mode = 'chase'; c.siren = true; }
  policeFill();
  cityMusic();
}
function endChase() {
  for (const q of C.cops) if (q.mode === 'chase') q.mode = 'leave';
  for (const c of C.pcars) if (c.mode === 'chase') { c.mode = 'leave'; c.siren = false; }
  C.bust = 0;
  cityMusic();
}
// Verbrechen melden. always = sicher gesehen
function crime(stars, reason, always) {
  if (C.busted) return;
  if (!always && C.crimeCd > 0) return;
  if (!always && !copsSee(C.p.x, C.p.y, true) && Math.random() > 0.2) return;
  if (NET.mode === 'client' && NET.connected) { C.crimeCd = 1.5; netSend({ t: 'crime', stars, reason }); return; }   // die Fahndung führt der Host
  C.crimeCd = 1.5;
  const before = C.wanted;
  C.wanted = Math.min(WANTED_MAX, C.wanted + stars);
  C.lostT = 0; C.lastKnown = { x: C.p.x, y: C.p.y }; PF.footKey = PF.carKey = -1;
  save.stats.crimes = (save.stats.crimes || 0) + 1;
  if (C.wanted > before) {
    cityMsg(reason + '  FAHNDUNG: ' + C.wanted + (C.wanted > 1 ? ' STERNE' : ' STERN') + '!', 3);
    Sound.play('whistle');
    startChase(before > 0);
  }
}
// Sieht irgendein Polizist diese Stelle?
function copsSee(x, y, anyMode) {
  for (const q of C.cops) {
    if (q.state === 'down' || q.mode === 'leave' || (!anyMode && q.mode !== 'chase')) continue;
    const d = dist(q.x, q.y, x, y);
    if (d < 145 * (1 - 0.3 * nightAmount()) && cityLOS(q.x, q.y, x, y)) return true;
  }
  for (const c of C.pcars) {
    if (c.mode === 'leave' || (!anyMode && c.mode !== 'chase')) continue;
    const d = dist(c.x, c.y, x, y);
    if (d < 195 * (1 - 0.25 * nightAmount()) && cityLOS(c.x, c.y, x, y)) return true;
  }
  return false;
}

// ---------- Update ----------
function updatePolice(dt) {
  const p = C.p, car = C.car, cfg = WANTED_CFG[C.wanted];
  C.crimeCd -= dt;
  const target = { x: p.x, y: p.y };
  if (C.wanted > 0) {
    const guest = NET.mode === 'client' && NET.connected;
    C.seen = copsSee(p.x, p.y);
    if (guest && C.seen) { NET.seenT = (NET.seenT || 0) - dt; if (NET.seenT <= 0) { NET.seenT = 0.4; netSend({ t: 'seen' }); } }
    const seenAny = C.seen || (NET.mode === 'host' && NET.connected && performance.now() - (NET.seenAt || 0) < 900);
    if (C.seen) C.lastKnown = target;
    if (seenAny) C.lostT = 0;
    else if (!guest) {
      // hartnäckig: Zeugen geben der Polizei immer wieder Hinweise, wo du ungefähr bist
      C.tipT = (C.tipT || 0) + dt;
      if (C.tipT >= cfg.tip) { C.tipT = 0; C.lastKnown = { x: p.x + rand(-36, 36), y: p.y + rand(-36, 36) }; PF.footKey = PF.carKey = -1; }
      C.lostT += dt;
      if (C.lostT >= cfg.lose) {
        C.wanted--; C.lostT = 0;
        if (C.wanted === 0) { endChase(); save.stats.escapes = (save.stats.escapes || 0) + 1; cityMsg('POLIZEI ABGEHÄNGT! GUT GEMACHT, LIL.', 3); Sound.play('clear'); }
        else { cityMsg('NUR NOCH ' + C.wanted + (C.wanted > 1 ? ' STERNE' : ' STERN') + '. WEITER VERSTECKEN!', 2.5); PF.footKey = -1; }
      }
    }
    C.fieldT -= dt;
    if (C.fieldT <= 0) { C.fieldT = 0.35; updateFields(); }
  }
  const W2 = WANTED_CFG[Math.max(1, C.wanted)];
  // --- Polizisten zu Fuß ---
  for (const q of C.cops) {
    q.sayT -= dt;
    if (q.waitT > 0) { q.waitT -= dt; continue; }
    if (C.pick && C.pick.q === q) continue;   // wird gerade beklaut
    if (q.state === 'down') { q.downT -= dt; if (q.downT <= 0) q.state = ''; continue; }
    if (C.inCar && Math.abs(car.v) > 60 && dist(q.x, q.y, car.x, car.y) < curVehicle().len * 0.3 + 6) {
      q.state = 'down'; q.downT = 4; q.downAng = car.a; q.sayText = 'AUA! DAS GIBT EINE ANZEIGE!'; q.sayT = 2;
      Sound.play('punch'); car.v *= 0.6;
      crime(1, 'POLIZIST ANGEFAHREN!', true);
      continue;
    }
    if (q.mode === 'chase') {
      q.lineT -= dt;
      if (q.lineT <= 0) { q.lineT = rand(4, 8); if (dist(q.x, q.y, p.x, p.y) < 200) { q.sayText = pick(COP_LINES); q.sayT = 2; } }
      const tgt = C.seen ? target : C.lastKnown;
      const near = dist(q.x, q.y, tgt.x, tgt.y);
      let wx, wy;
      if (near < 48 && cityLOS(q.x, q.y, tgt.x, tgt.y)) { wx = tgt.x; wy = tgt.y; }
      else { const wp = flowStep(PF.foot, copsUseDoors() ? PF.okDoor : PF.okNoDoor, q.x, q.y); if (wp) { wx = wp.x; wy = wp.y; } }
      if (!C.seen && near < 20) { q.searchT -= dt; if (q.searchT <= 0) { q.searchT = rand(1, 2.5); q.a = rand(TAU); } wx = q.x + Math.cos(q.a) * 20; wy = q.y + Math.sin(q.a) * 20; }
      if (wx != null) {
        const a = Math.atan2(wy - q.y, wx - q.x), sp = (C.seen ? W2.footSp : W2.footSp * 0.8) * dt;
        q.a = a;
        if (dist(q.x, q.y, wx, wy) > 1.5) { cityMove(q, Math.cos(a) * sp, Math.sin(a) * sp, !copsUseDoors()); q.walkT += dt * 1.4; }
      }
    } else {
      wanderPed(q, dt, 30, true);
    }
  }
  // --- Polizeiautos ---
  for (const c of C.pcars) updatePoliceCar(c, dt, target, W2);
  // weggehende Einheiten verschwinden, sobald man sie nicht mehr sieht
  const gone = (o) => o.mode === 'leave' && (offscreen(o.x, o.y, 80) || (o.leaveT = (o.leaveT || 0) + dt) > 30);
  C.cops = C.cops.filter((q) => !gone(q));
  C.pcars = C.pcars.filter((c) => !gone(c));
  if (Math.random() < dt * 0.5) policeFill();
  // --- Festnahme ---
  let grab = false;
  if (C.wanted > 0) {
    if (!C.inCar) { for (const q of C.cops) if (q.mode === 'chase' && q.state !== 'down' && dist(q.x, q.y, p.x, p.y) < 12) grab = true; }
    else if (Math.abs(car.v) < 45) {
      for (const q of C.cops) if (q.mode === 'chase' && q.state !== 'down' && dist(q.x, q.y, car.x, car.y) < 19) grab = true;
      for (const c of C.pcars) if (c.mode === 'chase' && dist(c.x, c.y, car.x, car.y) < 32) grab = true;
    }
  }
  if (grab) C.bust += dt / (C.inCar ? 2.6 : 1.4);
  else C.bust = Math.max(0, C.bust - dt * 1.0);
  if (C.bust >= 1) { arrest(); return; }
  // --- Sirene ---
  C.sirenT -= dt;
  if (C.sirenT <= 0) {
    C.sirenT = 0.95;
    let bd = 1e9;
    for (const c of C.pcars) if (c.siren) bd = Math.min(bd, dist(c.x, c.y, C.cam.x, C.cam.y));
    if (bd < 470) Sound.play('siren', clamp(1.15 - bd / 470, 0.2, 1));
  }
}
function updatePoliceCar(c, dt, target, cfg) {
  const p = C.p, car = C.car;
  c.honkT -= dt;
  if (c.waitT > 0) { c.waitT -= dt; return; }
  if (c.mode === 'patrol') {
    // fährt auf der Mittellinie, rechts versetzt; biegt an Kreuzungen ab
    let blocked = false;
    const [dx, dy] = DIRS4[c.d];
    const fx = c.x + dx * 26, fy = c.y + dy * 26;
    if (dist(fx, fy, p.x, p.y) < 20 || (C.inCar && dist(fx, fy, car.x, car.y) < 24)) blocked = true;
    // andere Autos: nur wenn sie nicht auf der Gegenspur sind; nach 2 s Stau wird gedrängelt
    if (c.pushT > 0) c.pushT -= dt;
    else {
      for (const list of [C.pcars, C.trucks, C.traffic || []]) for (const o of list) {
        if (o === c || (o.mode === 'patrol' && (o.d + 2) % 4 === c.d)) continue;
        if (dist(fx, fy, o.x, o.y) < 22) blocked = true;
      }
    }
    if (blocked) { c.jamT = (c.jamT || 0) + dt; if (c.jamT > 2) { c.pushT = 1.5; c.jamT = 0; } } else c.jamT = 0;
    const vt = blocked ? 0 : 105;
    c.v += (vt - c.v) * (1 - Math.exp(-dt * 4));
    if (blocked && c.honkT <= 0 && dist(c.x, c.y, p.x, p.y) < 60) { c.honkT = 2.5; Sound.play('honk'); }
    const ox = c.cx, oy = c.cy;
    c.cx += dx * c.v * dt; c.cy += dy * c.v * dt;
    if (dx) {
      for (const r of V_ROADS) { const ix = (r + 1) * TS + 8; if (ox !== ix && (ox - ix) * (c.cx - ix) <= 0) { c.cx = ix; carPatrolTurn(c); break; } }
    } else {
      for (const r of H_ROADS) { const iy = (r + 1) * TS + 8; if (oy !== iy && (oy - iy) * (c.cy - iy) <= 0) { c.cy = iy; carPatrolTurn(c); break; } }
    }
    if (c.cx < 24 || c.cx > CW * TS - 24 || c.cy < 24 || c.cy > CH * TS - 24) { c.cx = clamp(c.cx, 24, CW * TS - 24); c.cy = clamp(c.cy, 24, CH * TS - 24); c.d = (c.d + 2) % 4; }
    if (c.d === 0 && c.cx > (LAND_X - 1) * TS) { c.cx = (LAND_X - 1) * TS; c.d = 2; }   // Stadtgrenze: wenden
    // Fahrspur: rechts von der Mittellinie (weich überblendet beim Abbiegen)
    const [ex, ey] = DIRS4[c.d], k = 1 - Math.exp(-dt * 6);
    c.ox = (c.ox || 0) + (-ey * 9 - (c.ox || 0)) * k; c.oy = (c.oy || 0) + (ex * 9 - (c.oy || 0)) * k;
    c.x = c.cx + c.ox; c.y = c.cy + c.oy;
    c.a = turnTo(c.a, Math.atan2(ey, ex), dt * 7);
    return;
  }
  if (c.mode === 'leave') { c.v *= Math.exp(-dt * 3); return; }
  // --- Verfolgung ---
  const tgt = C.seen ? target : C.lastKnown;
  const d = dist(c.x, c.y, tgt.x, tgt.y);
  let aim = null;
  if (d < 100 && cityLOS(c.x, c.y, tgt.x, tgt.y)) aim = tgt;
  else {
    const w1 = flowStep(PF.car, PF.okCar, c.x, c.y);
    if (w1) { const w2 = flowStep(PF.car, PF.okCar, w1.x, w1.y); aim = w2 && w2.d < w1.d ? { x: (w1.x + w2.x) / 2, y: (w1.y + w2.y) / 2 } : w1; }
  }
  // Polizisten aussteigen lassen, wenn Lil zu Fuß in der Nähe ist
  if (!C.inCar && d < 150 && c.dropped < 1 && Math.abs(c.v) < 70 && C.cops.length < 9) {
    c.dropped++;
    const cop = makeCop(c.x + Math.cos(c.a + Math.PI / 2) * 14, c.y + Math.sin(c.a + Math.PI / 2) * 14, 'chase');
    if (!citySolidAt(cop.x, cop.y)) { cop.sayText = 'AUSSTEIGEN! ZUGRIFF!'; cop.sayT = 2; C.cops.push(cop); Sound.play('door'); }
  }
  if (c.revT > 0) {
    c.revT -= dt; c.v = -70;
    c.a += dt * 1.6 * (c.revDir || 1);
  } else if (aim) {
    const want = Math.atan2(aim.y - c.y, aim.x - c.x), diff = Math.abs(angDiff(c.a, want));
    c.a = turnTo(c.a, want, dt * 3.4);
    let vt = cfg.carSp * clamp(1.15 - diff / 1.6, 0.3, 1);
    if (!C.inCar && d < 60) vt = 0;                               // vor Lil anhalten
    else if (C.inCar && d < 45) vt = Math.min(vt, Math.abs(car.v) + 40);
    c.v += (vt - c.v) * (1 - Math.exp(-dt * 2.4));
  } else c.v *= Math.exp(-dt * 2);
  const nx = c.x + Math.cos(c.a) * c.v * dt, ny = c.y + Math.sin(c.a) * c.v * dt;
  if (!vehicleHits(nx, ny, c.a, POLICE_V)) { c.x = nx; c.y = ny; if (Math.abs(c.v) > 25 || d < 70) c.stuckT = 0; }
  else { c.v *= -0.3; c.stuckT += dt * 3; }
  if (Math.abs(c.v) < 12 && d > 80) c.stuckT += dt;
  if (c.stuckT > 1.6 && c.revT <= 0) { c.revT = 0.7; c.revDir = Math.random() < 0.5 ? -1 : 1; c.stuckT = 0.6; c.stuckN = (c.stuckN || 0) + 1; }
  // hängt fest und keiner sieht hin -> woanders neu einsetzen
  if ((c.stuckN || 0) > 2 && offscreen(c.x, c.y)) {
    const s = spawnSpot((tx, ty) => PF.okCar[ty * CW + tx] && PF.car[ty * CW + tx] >= 0, 300, 420);
    if (s) { c.x = s.x; c.y = s.y; c.v = 0; c.stuckN = 0; }
  }
  // Leute umfahren (keine Anzeige für Lil)
  for (const q of C.peds) if (q.state !== 'down' && Math.abs(c.v) > 80 && dist(q.x, q.y, c.x, c.y) < 14) { q.state = 'down'; q.downT = 2.5; q.downAng = c.a; q.sayText = 'AUA! POLIZEIGEWALT!'; q.sayT = 2; Sound.play('punch'); }
}
function carPatrolTurn(c) {
  const tx = Math.floor(c.cx / TS), ty = Math.floor(c.cy / TS);
  const opts = [];
  for (const nd of [c.d, (c.d + 1) % 4, (c.d + 3) % 4]) {
    const [dx, dy] = DIRS4[nd], nx = tx + dx * 3, ny = ty + dy * 3;
    if (nx < 1 || ny < 1 || nx >= CW - 1 || ny >= CH - 1) continue;
    if (CITY.t[ny * CW + nx] !== '=') continue;
    for (let k = 0; k < (nd === c.d ? 2 : 1); k++) opts.push(nd);
  }
  c.d = opts.length ? pick(opts) : (c.d + 2) % 4;
}
// Zusammenstöße zwischen Lils Fahrzeug und Polizeiautos
function policeCarBumps(dt) {
  const car = C.car, V = curVehicle();
  if (!C.inCar) return;
  for (const c of C.pcars.concat(C.trucks, C.traffic || [])) {
    if (c.bumpT) { c.bumpT -= dt; if (c.bumpT <= 0) c.bumpT = 0; }
    const d = dist(car.x, car.y, c.x, c.y), min = (V.len + POLICE_V.len) * 0.36;
    if (d >= min || d < 0.01) continue;
    const nx = (car.x - c.x) / d, ny = (car.y - c.y) / d, push = (min - d);
    const px = car.x + nx * push, py = car.y + ny * push;
    if (!vehicleHits(px, py, car.a, V)) { car.x = px; car.y = py; }
    if (Math.abs(car.v) > 140 && !c.bumpT) {
      Sound.play('slam'); C.shakeT = 0.25;
      if (!c.truck && !c.civ) crime(1, 'POLIZEIAUTO GERAMMT!', true);
      else if (c.civ && Math.random() < 0.3) crime(1, 'UNFALL MIT FAHRERFLUCHT!');
    }
    car.v *= 0.8; c.v *= 0.5;
    c.bumpT = 0.8;
  }
}

// ---------- Festnahme ----------
function arrest() {
  const stars = C.wanted;
  const fine = Math.min(save.money, Math.round(save.money * 0.05) + 80 * stars);
  save.money -= fine;
  save.stats.arrests = (save.stats.arrests || 0) + 1;
  C.wanted = 0; C.bust = 0; C.pick = null; C.lostT = 0;
  C.busted = { t: 3.4, fine, stars, line: pick(['SIE HABEN DAS RECHT ZU SCHWEIGEN. ODER ZU SAFTEN.', 'DER RICHTER HAT GESAGT: NÄCHSTES MAL GIBT ES NUR WASSER.', 'IN DER ZELLE GAB ES KEIN WLAN. FURCHTBAR.', 'DER POLIZIST WOLLTE EIN AUTOGRAMM.']) };
  for (const q of C.cops) if (q.mode === 'chase') q.mode = 'leave';
  for (const c of C.pcars) if (c.mode === 'chase') { c.mode = 'leave'; c.siren = false; }
  C.inCar = false;
  C.p.x = POLICE_SPOT[0] * TS + 8; C.p.y = POLICE_SPOT[1] * TS + 8;
  C.car.x = POLICE_CAR_SPOT[0] * TS + 8; C.car.y = POLICE_CAR_SPOT[1] * TS + 8; C.car.a = Math.PI / 2; C.car.v = 0;
  C.cam.x = C.p.x; C.cam.y = C.p.y;
  Sound.play('busted'); cityMusic();
  if (NET.mode === 'client' && NET.connected) netSend({ t: 'busted' });
  citySave();
}

// ---------- Taschendiebstahl ----------
function pickTarget() {
  if (C.inCar || C.busted) return null;
  const p = C.p; let best = null, bd = 17;
  const check = (q) => {
    if (q.state === 'down' || q.still || q.seller || q.vendor || q.robbed || q.robber || q.fleeT > 0 || (q.cop && q.mode === 'chase')) return;
    const d = dist(p.x, p.y, q.x, q.y);
    if (d >= bd) return;
    if (Math.cos(Math.atan2(p.y - q.y, p.x - q.x) - q.a) > -0.25) return;   // nur von hinten!
    best = q; bd = d;
  };
  C.peds.forEach(check); C.cops.forEach(check);
  return best;
}
// Minispiel: Zeiger läuft hin und her - 2x im grünen Bereich [F] drücken
function pickZone(w) { const a = rand(0.08, 0.92 - w); return [a, a + w]; }
function updatePickpocket(dt) {
  const p = C.p;
  if (C.inCar) { C.pick = null; return; }
  if (!C.pick) {
    if (pressed.KeyF) {
      const q = pickTarget();
      if (q) { const hard = q.cop ? 1.5 : 1; C.pick = { q, pos: 0, dir: 1, sp: 1.1 * hard, zone: pickZone(0.26 / hard * (1 + 0.15 * sk('fingers'))), hits: 0, t: 0 }; Sound.play('blip'); }
    }
    return;
  }
  const P = C.pick, q = P.q;
  P.t += dt; P.pos += P.dir * P.sp * dt;
  if (P.pos > 1) { P.pos = 1; P.dir = -1; } else if (P.pos < 0) { P.pos = 0; P.dir = 1; }
  if (P.t > 5 || q.state === 'down') { pickCaught(q, false); return; }
  if (!(pressed.KeyF || pressed.Space || mouse.pl)) return;
  if (P.pos < P.zone[0] || P.pos > P.zone[1]) { pickCaught(q, false); return; }
  P.hits++; Sound.play('coin');
  if (P.hits < 2) { P.zone = pickZone((P.zone[1] - P.zone[0]) * 0.75); P.sp *= 1.3; return; }
  C.pick = null; q.robbed = true;
  const loot = q.cop ? randi(70, 170) : Math.random() < 0.05 ? randi(180, 320) : randi(6, 48);
  const noticed = Math.random() < (q.cop ? 0.15 : 0.04) + (copsSee(p.x, p.y, true) ? 0.3 : 0);
  let text = '+' + loot + '€ GEKLAUT!';
  if (!q.cop && Math.random() < 0.12) { B().seeds.orange += 2; text += ' UND 2 ORANGENKERNE!'; }
  else if (loot >= 180) text = 'GOLDENE UHR GEKLAUT! VERHÖKERT FÜR ' + loot + '€!';
  else if (q.cop) text = 'EINEN POLIZISTEN BEKLAUT! +' + loot + '€';
  save.money += loot; save.stats.stolen = (save.stats.stolen || 0) + loot;
  Sound.play('steal'); lilXP(3); persist();
  if (noticed) pickCaught(q, true, text);
  else cityMsg(text + ' KEINER HAT WAS GEMERKT.', 2.5);
}
function pickCaught(q, gotIt, text) {
  C.pick = null;
  q.sayText = pick(VICTIM_LINES); q.sayT = 2.5; q.fleeT = 3; q.robbed = true;
  if (q.cop) { q.mode = 'chase'; q.sayText = 'DU BEKLAUST DIE POLIZEI?!'; }
  cityMsg((gotIt ? text + ' ABER ' : '') + 'ERWISCHT!', 2.5);
  crime(q.cop ? 2 : 1, 'TASCHENDIEB!', true);
}
// gemeinsame Laufroutine für Passanten und Streifenpolizisten
function wanderPed(q, dt, speed, noDoor) {
  if (q.fleeT > 0) {
    q.fleeT -= dt;
    const a = Math.atan2(q.y - C.p.y, q.x - C.p.x);
    q.a = a; cityMove(q, Math.cos(a) * 70 * dt, Math.sin(a) * 70 * dt, noDoor); q.walkT += dt * 1.5;
    return;
  }
  q.t -= dt;
  const ox = q.x, oy = q.y;
  cityMove(q, Math.cos(q.a) * speed * dt, Math.sin(q.a) * speed * dt, noDoor);
  q.walkT += dt;
  const ahead = cT(Math.floor((q.x + Math.cos(q.a) * 10) / TS), Math.floor((q.y + Math.sin(q.a) * 10) / TS));
  if (q.t <= 0 || (q.x === ox && q.y === oy) || ahead === '=') { q.t = rand(1.5, 4); q.a = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]); }
}

// ---------- Zeichnen ----------
function drawPolice(g) {
  for (const c of C.pcars) {
    if (offscreen(c.x, c.y, 40)) continue;
    if (c.siren) {
      const red = Math.floor(T * 6) % 2;
      g.fillStyle = red ? 'rgba(255,40,40,0.13)' : 'rgba(60,110,255,0.13)';
      g.beginPath(); g.arc(c.x, c.y, 34, 0, TAU); g.fill();
    }
    drawVehicle(g, c, false, 'car', true);
  }
  for (const q of C.cops) if (!offscreen(q.x, q.y, 30)) drawHuman(g, q);
  if (C.pick) {
    const P = C.pick, q = P.q, x = Math.round(q.x - 24), y = Math.round(q.y - 36);
    g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, 50, 8);
    g.fillStyle = '#5a1a1a'; g.fillRect(x, y, 48, 6);
    g.fillStyle = '#3aff6a'; g.fillRect(x + Math.round(P.zone[0] * 48), y, Math.max(2, Math.round((P.zone[1] - P.zone[0]) * 48)), 6);
    g.fillStyle = '#ffffff'; g.fillRect(x + Math.round(P.pos * 46), y - 2, 2, 10);
    txt('[F] IM GRÜNEN! ' + P.hits + '/2', q.x, y - 11, { g, font: FS, align: 'center', color: '#ffe14d' });
  }

}
function drawStar(x, y, r, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
// Sterne oben rechts (links neben dem Geld)
function drawWantedStars(xr) {
  for (let i = 0; i < WANTED_MAX; i++) {
    const on = i < C.wanted, blink = on && !C.seen && Math.floor(T * 4) % 2;
    drawStar(xr - (WANTED_MAX - 1 - i) * 11, 7, 4.5, on ? (blink ? '#806a20' : '#ffd23f') : null, on ? '#000' : '#555566');
  }
}
function drawPoliceHUD() {
  if (C.wanted > 0) {
    const red = Math.floor(T * 5) % 2;
    ctx.fillStyle = red ? 'rgba(255,30,30,0.32)' : 'rgba(40,90,255,0.32)';
    ctx.fillRect(0, 14, W, 2); ctx.fillRect(0, H - 2, W, 2); ctx.fillRect(0, 14, 2, H - 14); ctx.fillRect(W - 2, 14, 2, H - 14);
  }
  if (C.bust > 0.02) {
    panel(W / 2 - 70, H / 2 + 34, 140, 20, '#ff3b3b');
    txt('FESTNAHME!', W / 2, H / 2 + 37, { font: FS, align: 'center', color: '#ff6a6a' });
    ctx.fillStyle = '#ff3b3b'; ctx.fillRect(W / 2 - 64, H / 2 + 47, Math.round(128 * clamp(C.bust, 0, 1)), 3);
  }
  if (C.busted) {
    const b = C.busted, k = clamp((3.4 - b.t) * 2, 0, 1);
    ctx.fillStyle = 'rgba(0,0,20,0.82)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5a5a6a';
    for (let x = 18; x < W; x += 34) ctx.fillRect(x, Math.round(-H + H * k), 6, H);
    ctx.fillRect(0, Math.round(-H + H * k + 40), W, 5); ctx.fillRect(0, Math.round(-H + H * k + H - 46), W, 5);
    if (b.hospital) {
      ctx.fillStyle = 'rgba(60,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(W / 2 - 6, 30, 12, 34); ctx.fillRect(W / 2 - 17, 41, 34, 12); ctx.fillStyle = '#e01b3c'; ctx.fillRect(W / 2 - 4, 32, 8, 30); ctx.fillRect(W / 2 - 15, 43, 30, 8);
      txt('AUSGEKNOCKT!', W / 2, 78, { size: 24, align: 'center', color: Math.floor(T * 4) % 2 ? '#ff3b3b' : '#ffffff', shadow: '#000' });
      txt('KRANKENHAUS-RECHNUNG: ' + b.fine + '€', W / 2, 120, { align: 'center', color: '#ffffff' });
    } else {
    txt('VERHAFTET!', W / 2, 78, { size: 24, align: 'center', color: Math.floor(T * 4) % 2 ? '#ff3b3b' : '#3b6aff', shadow: '#000' });
    txt('STRAFE: ' + b.fine + '€', W / 2, 120, { align: 'center', color: '#ffffff' });
    }
    txt(b.line, W / 2, 142, { font: FS, align: 'center', color: '#cccccc' });
  }
}
function drawPoliceMinimap(dot) {
  for (const q of C.cops) if (q.mode === 'chase') dot(q.x / TS, q.y / TS, '#6a8aff');
  for (const c of C.pcars) dot(c.x / TS, c.y / TS, c.siren ? (Math.floor(T * 6) % 2 ? '#ff3b3b' : '#3b6aff') : '#6a8aff', c.siren ? 3 : 2);
}
