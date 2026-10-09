'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Offene Stadt: Laufen, Fahrzeuge, Leute, Telefon,
//  Aufträge, Saft-Imperium (Fabrik, Kunden), Arena, Polizei, Multiplayer-Konsole
// =====================================================================
let CITY = null;   // Karte (einmal gebaut)
let C = null;      // Zustand in der Stadt
const PED_LINES = ['HAST DU DAS TEBLEEDD GESEHEN?', 'ICH HAB GEHÖRT, GRECHI SUCHT DICH.', 'KUMI HAT MEIN WLAN GESUBNETTET.', 'IM CASINO GEWINNT NUR RUSSIAN HACKER BOI.',
  'SCHÖNE FRISUR!', 'BIST DU NICHT DIESER LIL?', 'FOOOKUSSS... OH, SORRY.', 'DER O-SAFT IM KIOSK IST EXPLOSIV.', 'ICH HAB KEIN GELD. GEH WEG.', 'DA PASSIERT VIEL OMG.',
  'DEIN SAFT IST DER BESTE DER STADT!', 'HAST DU NOCH TURBO-SAFT?', 'IN DER ARENA KANN MAN RICHTIG KOHLE MACHEN.', 'BAKA BAKA BAKA WAR HIER...', 'ICH HÄTTE GERN EINEN INGWER-KICK.',
  'PASS AUF DEINE TASCHEN AUF. HIER WIRD GEKLAUT!', 'HAST DU MICHAEL MERL GESEHEN? DIESE AMSEL IST LEGENDÄR.', 'IM AUTOHAUS GIBT ES EINEN SPORTWAGEN!', 'OMA HILDE KENNT EIN GEHEIMES SAFTREZEPT...', 'DIE POLIZEI IST HEUTE GANZ SCHÖN NERVÖS.'];
const ROBBED_LINES = ['MEIN PORTEMONNAIE IST WEG!!', 'WER HAT MEIN GELD?!', 'ICH SCHWÖRE, ICH HATTE NOCH 20 EURO...', 'HEUTE IST NICHT MEIN TAG.'];

function cityInit() {
  if (!CITY) CITY = buildCity();
  if (!CITY.staticC) renderCityStatic();
  const s = save.city;
  C = {
    p: { x: CITY_SPAWN[0] * TS + 8, y: CITY_SPAWN[1] * TS + 8, a: Math.PI / 2, r: 5, walkT: 0, isPlayer: true, weapon: null, mouthT: 0, armor: 0, invT: 0, state: '' },
    car: { x: CAR_SPAWN[0] * TS + 8, y: CAR_SPAWN[1] * TS + 8, a: Math.PI / 2, v: 0 },
    inCar: false, cam: { x: 0, y: 0 }, peds: [], prompt: null, msg: '', msgT: 0, saveT: 5, ringT: 0, menu: false, mp: false, bizT: 0, pressT: 0,
  };
  if (s && s.x < CW * TS && s.y < CH * TS) { C.p.x = s.x; C.p.y = s.y; C.car.x = s.cx; C.car.y = s.cy; C.car.a = s.ca || 0; C.inCar = !!s.inCar; }
  if (C.inCar) { C.p.x = C.car.x; C.p.y = C.car.y; }
  C.cam.x = C.p.x; C.cam.y = C.p.y;
  const spots = [];
  for (let i = 0; i < CITY.t.length; i++) if ('_P'.includes(CITY.t[i])) spots.push(i);
  for (let k = 0; k < 42; k++) C.peds.push(makePed(pick(spots)));
  for (let k = 0; k < 4; k++) { const x = randi(52, 70), y = randi(19, 26); if (!CITY.solid[y * CW + x]) C.peds.push(makePed(y * CW + x)); }
  const still = (x, y, suit, shirt, name) => C.peds.push(Object.assign(makePed(y * CW + x), { still: true, a: Math.PI / 2, suit, shirt, name }));
  still(37, 16, '#e8e8e8', '#ffd23f', 'KIOSK'); still(54, 16, '#111111', '#e01b3c', 'DEALER'); still(97, 16, '#2a8a3a', '#ffffff', 'GÄRTNER');
  still(116, 17, '#3fd0ff', '#ffffff', 'VERKÄUFERIN');
  for (const f of CITY_HOOKS.init) extCall(f, C);   // eigene Leute / Zustand
  bizSpawnPeople(spots);
  policeInit();
  C.trucks = [];
}
function bizSpawnPeople(spots) {
  C.peds = C.peds.filter((q) => !q.seller && !q.vendor);
  const b = B();
  for (let k = 0; k < b.staff.seller; k++) C.peds.push(Object.assign(makePed(pick(spots)), { seller: true, suit: '#ff9a1a', shirt: '#ffffff', name: 'VERKÄUFER' }));
  if (upLvl('stand')) C.peds.push(Object.assign(makePed(21 * CW + 5), { still: true, vendor: true, a: -Math.PI / 2, suit: '#ff9a1a', shirt: '#fff', name: 'STAND' }));
}
function makePed(i) {
  return { x: (i % CW) * TS + 8, y: ((i / CW) | 0) * TS + 8, a: pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), r: 5, walkT: rand(5), t: rand(1, 4),
    suit: pick(['#3a6ac4', '#c41f2a', '#2a8a4a', '#e8e8e8', '#8e44ad', '#d9622a', '#444']), shirt: '#fff', skin: pick(['#f0c8a0', '#d9a070', '#a86a40', '#f5d0b0']),
    hair: pick(['#1a1a1a', '#4a2a12', '#e8c547', '#8b1a1a', '#aaaaaa']), glasses: Math.random() < 0.3, weapon: null, state: '', downT: 0, sayText: '', sayT: 0 };
}
const citySolidAt = (x, y, car) => {
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  if (tx < 0 || ty < 0 || tx >= CW || ty >= CH) return true;
  const i = ty * CW + tx, c = CITY.t[i];
  return CITY.solid[i] || (EQ_SOLID && EQ_SOLID[i]) || (c === 'D' && (car || lockedDoor(tx, ty))) || (gateTile(tx, ty) && !gateOpen());
};
// abgeschlossene Türen (Gewächshaus vor dem Kauf)
function lockedDoor(tx, ty) { for (const b of BUILDINGS) if (b.locked && b.door[0] === tx && b.door[1] === ty) return b.locked(); return false; }
// noDoor = darf keine Türen benutzen (Polizei bei 1 Stern)
function cityMove(e, dx, dy, noDoor) {
  const r = e.r;
  const ok = (x, y) => !citySolidAt(x - r, y - r, noDoor) && !citySolidAt(x + r, y - r, noDoor) && !citySolidAt(x - r, y + r, noDoor) && !citySolidAt(x + r, y + r, noDoor);
  if (ok(e.x + dx, e.y)) e.x += dx;
  if (ok(e.x, e.y + dy)) e.y += dy;
}
// kann man dieser Person Saft anbieten?
const canOffer = (q) => !q.still && !q.seller && !q.vendor && !q.cop && !q.robber && !q.bought && !q.robbed && q.state !== 'down' && bagHasJuice();
function citySave() {
  save.city = { x: C.p.x, y: C.p.y, cx: C.car.x, cy: C.car.y, ca: C.car.a, inCar: C.inCar };
  save.wanted = C.wanted || 0;
  persist();
}
function enterHub() {
  if (!C) cityInit();
  setState('city'); Sound.muffle(false); cityMusic();
  bizTick();
  if (phoneRinging()) C.ringT = 0.5;
  if (NET.mode === 'host' && typeof netHostLobby === 'function') { netHostLobby(NET.lobbyMsg); NET.lobbyMsg = ''; }
}
function cityMsg(m, t = 3) { if (!C) cityInit(); C.msg = m; C.msgT = t; }
function inBuilding(id) {
  const b = BUILDINGS.find((q) => q.id === id), tx = Math.floor(C.p.x / TS), ty = Math.floor(C.p.y / TS);
  return b && tx > b.x && tx < b.x + b.w - 1 && ty > b.y && ty < b.y + b.h - 1;
}

// ---------- Ziel / Telefon ----------
function phoneRinging() { return save.called < save.unlocked && save.unlocked < LEVELS.length; }
// Telefon zuhause: neuer Auftrag oder den letzten Anruf nochmal (im Online-Koop für alle)
function phoneCall() {
  if (phoneRinging()) { const li = save.unlocked; startDialog(LEVELS[li].intro, () => { save.called = li; persist(); enterHub(); cityMsg('NEUER AUFTRAG: ' + LEVELS[li].name + '! STEIG INS AUTO.', 5); }); }
  else if (save.unlocked > 0) startDialog(LEVELS[Math.min(save.unlocked, LEVELS.length) - 1].intro, () => enterHub());
  else cityMsg('KEINE NEUEN ANRUFE.', 2);
}
// erstes Mal in der Saftfabrik
function bizIntroCall() {
  startDialog('bizIntro', () => { enterHub(); cityMsg(slotsCount(bag(), 'e:pot') ? 'STELL DEINE KÜBEL AUF: TASTE 1 DRÜCKEN UND IN DER FABRIK HINKLICKEN!' : 'PFLANZ ORANGEN IN DEINE KÜBEL! KERNE GIBT ES IM GARTENCENTER.', 6); });
}
function cityObjective() {
  if (save.unlocked >= LEVELS.length) return { text: 'ALLES GESCHAFFT! SAFT-IMPERIUM AUSBAUEN, ARENA, HÜTE SAMMELN...', target: null };
  if (phoneRinging()) { const ph = CITY.stations.find((s) => s.type === 'phone'); return { text: 'DAS TELEFON ZUHAUSE KLINGELT! GEH RAN.', target: ph }; }
  const b = BUILDINGS.find((q) => q.mission === save.unlocked);
  if (!b) return { text: 'AUFTRAG ' + (save.unlocked + 1) + ': ' + LEVELS[save.unlocked].name + ' - INFOS AM TELEFON ZUHAUSE.', target: CITY.stations.find((s) => s.type === 'phone') };
  return { text: 'AUFTRAG ' + (save.unlocked + 1) + ': ' + LEVELS[save.unlocked].name + ' - HINFAHREN!', target: { x: b.marker[0] * TS + 8, y: b.marker[1] * TS + 8 } };
}
function missionState(li) {
  if (li < save.unlocked) return 'done';
  if (li === save.unlocked) return save.called >= li ? 'open' : 'call';
  return 'locked';
}

// ---------- Update ----------
function updateCity(dt) {
  if (C.menu || C.mp || C.inv || C.phone || C.travel || C.store || C.map) return;
  C.msgT -= dt; C.saveT -= dt; C.bizT -= dt; C.pressT -= dt;
  if (C.saveT <= 0) { C.saveT = 5; citySave(); }
  if (C.bizT <= 0) { C.bizT = 1; bizTick(); checkAchievements(); }
  raidTick();
  updateWeather(dt);
  if (bagHasJuice() || storeJuiceCount() > 0 || B().sold > 0) bizOrderTick(dt);
  for (const n of bizNote) n.t -= dt;
  bizNote = bizNote.filter((n) => n.t > 0);
  if (C.busted) {
    C.busted.t -= dt;
    if (C.busted.t <= 0) { cityMsg(C.busted.hospital ? 'DU BIST IM KRANKENHAUS AUFGEWACHT. RECHNUNG: ' + C.busted.fine + '€' : 'DU STEHST VOR DER POLIZEIWACHE. STRAFE BEZAHLT: ' + C.busted.fine + '€', 4); C.busted = null; }
    return;
  }
  if (pressed.Escape) { C.menu = true; C.menuAt = T; Sound.play('select'); return; }
  if (pressed.KeyI) { C.inv = true; C.invAt = T; Sound.play('select'); return; }
  if (pressed.KeyH) { openPhone(); return; }
  eqCheck();
  updateHotbar();
  const p = C.p, car = C.car;
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) my--;
  if (keys.KeyS || keys.ArrowDown) my++;
  if (keys.KeyA || keys.ArrowLeft) mx--;
  if (keys.KeyD || keys.ArrowRight) mx++;
  if (C.inCar) {
    const V = curVehicle(), throttle = -my, turbo = keys.ShiftLeft || keys.ShiftRight;
    if (throttle > 0) car.v += V.accel * dt; else if (throttle < 0) car.v -= (car.v > 0 ? V.accel * 1.4 : V.accel * 0.6) * dt;
    car.v *= Math.exp(-dt * (throttle ? 0.6 : 1.6));
    car.v = clamp(car.v, -V.speed * 0.4, turbo ? V.turbo : V.speed);
    const na = car.a + mx * V.turn * dt * clamp(car.v / 120, -1, 1);
    if (!vehicleHits(car.x, car.y, na, V)) car.a = na;
    const nx = car.x + Math.cos(car.a) * car.v * dt, ny = car.y + Math.sin(car.a) * car.v * dt;
    if (!vehicleHits(nx, ny, car.a, V)) { car.x = nx; car.y = ny; }
    else if (!vehicleHits(nx, car.y, car.a, V) && Math.abs(Math.cos(car.a)) > 0.35) { car.x = nx; car.v *= 0.92; }
    else if (!vehicleHits(car.x, ny, car.a, V) && Math.abs(Math.sin(car.a)) > 0.35) { car.y = ny; car.v *= 0.92; }
    else { if (Math.abs(car.v) > 120) { Sound.play('slam'); C.shakeT = 0.2; } car.v *= -0.35; }
    policeCarBumps(dt);
    p.x = car.x; p.y = car.y;
  } else {
    const ml = Math.hypot(mx, my);
    const sp = (keys.ShiftLeft || keys.ShiftRight) ? 150 : 100;
    if (ml && !C.pick) { cityMove(p, mx / ml * sp * dt, my / ml * sp * dt); p.walkT += dt; p.a = Math.atan2(my, mx); }
  }
  // erstes Mal in der Saftfabrik: Anruf
  if (!B().seenIntro && inBuilding('factory')) {
    B().seenIntro = true; persist();
    bizIntroCall();
    return;
  }
  // Passanten
  for (const q of C.peds) {
    q.sayT -= dt;
    if (q.state === 'down') { q.downT -= dt; if (q.downT <= 0) { q.state = ''; } continue; }
    if (C.inCar && Math.abs(car.v) > 60 && dist(q.x, q.y, car.x, car.y) < curVehicle().len * 0.3 + 6) {
      if (Math.abs(car.v) > 175 && !protectedPed(q)) { killCityPed(q, car.a, 'car'); car.v *= 0.75; if (!q.robber) crime(2, 'FAHRERFLUCHT MIT TODESFOLGE!'); continue; }
      q.state = 'down'; q.downT = 2.5; q.downAng = car.a; q.sayText = pick(['AUA! PASS DOCH AUF!', 'MEIN FUSS!', 'LERN FAHREN!', 'HEY!!', 'ICH RUF DIE POLIZEI!']); q.sayT = 2;
      Sound.play('punch'); car.v *= 0.6;
      if (!q.still && !q.robber) crime(1, 'FAHRERFLUCHT!');
      continue;
    }
    if (q.still) continue;
    if (C.pick && C.pick.q === q) { q.walkT += dt * 0.5; continue; }
    wanderPed(q, dt, 26);
    if (q.seller && Math.random() < 0.002) { q.sayText = pick(['FRISCHER SAFT!', 'TIKITIKI TURBO GEFÄLLIG?', 'O-SAFT! O-SAFT!']); q.sayT = 2; }
  }
  // Gerät in der Hand: Vorschau + Aufstellen. Sonst: Linksklick = angreifen
  const built = updateBuild();
  p.swingT = (p.swingT || 0) - dt; C.punchCd = (C.punchCd || 0) - dt;
  updateCityCombat(dt, !built && !C.pick);
  updatePolice(dt);
  if (C.busted) return;
  if (NET.connected) netCityTick(dt);
  updatePickpocket(dt);
  updateTrucks(dt);
  updateJobs(dt);
  for (const f of CITY_HOOKS.update) extCall(f, dt);
  updateRadio(dt);
  // Interaktionen
  let best = null, bd = 30;
  const consider = (d, obj) => { if (d < bd) { bd = d; best = obj; } };
  if (!C.inCar) {
    for (const s of CITY.stations.concat(EQ_ST)) {
      if (Math.abs(s.x - p.x) > 90 || Math.abs(s.y - p.y) > 90) continue;
      const d = Math.min(...s.cells.map((k) => dist(p.x, p.y, (k % CW) * TS + 8, ((k / CW) | 0) * TS + 8)));
      consider(d < 24 ? d : 99, { kind: 'station', s });
    }
    consider(dist(p.x, p.y, car.x, car.y) < 26 ? dist(p.x, p.y, car.x, car.y) : 99, { kind: 'car' });
    for (const q of C.peds) if (q.state !== 'down') consider(dist(p.x, p.y, q.x, q.y) < 18 ? dist(p.x, p.y, q.x, q.y) + 5 : 99, { kind: 'ped', q });
    for (const q of C.cops) if (q.state !== 'down' && q.mode !== 'chase') consider(dist(p.x, p.y, q.x, q.y) < 18 ? dist(p.x, p.y, q.x, q.y) + 5 : 99, { kind: 'ped', q });
    for (const b of BUILDINGS) if (b.locked && b.locked()) { const [ox, oy] = doorOutside(b), d = dist(p.x, p.y, ox * TS + 8, oy * TS + 8); consider(d < 22 ? d : 99, { kind: 'locked', b }); }
  } else consider(0, { kind: 'exitcar' });
  // eigene Prompts: { kind:'custom', label, x, y, act } (ohne x/y: gewinnt immer)
  for (const f of CITY_HOOKS.prompt) {
    const r = extCall(f, p);
    for (const o of Array.isArray(r) ? r : r ? [r] : []) {
      o.kind = o.kind || 'custom';
      if (o.x == null) { best = o; bd = 0; continue; }
      if (C.inCar && !o.car) continue;
      const d = dist(p.x, p.y, o.x, o.y);
      if (d < (o.r || (C.inCar ? 34 : 24))) { if (C.inCar) { best = o; bd = 0; } else consider(d, o); }
    }
  }
  C.pickT = C.inCar ? null : pickTarget();
  for (const o of B().orders) { const d = dist(p.x, p.y, o.x, o.y); if (d < (C.inCar ? 34 : 22)) { best = { kind: 'order', o }; bd = 0; } }
  for (const b of BUILDINGS) {
    if (!b.marker) continue;
    const d = dist(p.x, p.y, b.marker[0] * TS + 8, b.marker[1] * TS + 8);
    if (d >= (C.inCar ? 34 : 24)) continue;
    if (b.arena) { best = { kind: 'arena', b }; bd = 0; }
    else if (b.act) { best = { kind: 'custom', label: b.actLabel || b.label, b, act: () => b.act(b) }; bd = 0; }
    else if (b.mission != null && missionState(b.mission) !== 'locked') { best = { kind: 'mission', b }; bd = 0; }
  }
  if (C.raid && dist(p.x, p.y, RAID_SPOT[0] * TS + 8, RAID_SPOT[1] * TS + 8) < 34) { best = { kind: 'raid' }; bd = 0; }
  C.prompt = best;
  if (best && pressed.KeyE) cityInteract(best);
  if (best && pressed.KeyX && best.kind === 'station' && best.s.type === 'eq') eqPickup(best.s.eq);
  if (best && best.kind === 'mission' && pressed.KeyB) buyProperty(best.b);
  // Kamera
  const look = C.inCar ? 0.45 : 0.15;
  const tx = p.x + (C.inCar ? Math.cos(car.a) * car.v * look : (mouse.x - W / 2) * look), ty = p.y + (C.inCar ? Math.sin(car.a) * car.v * look : (mouse.y - H / 2) * look);
  const k = 1 - Math.exp(-dt * 5);
  C.cam.x += (tx - C.cam.x) * k; C.cam.y += (ty - C.cam.y) * k;
  C.cam.x = clamp(C.cam.x, W / 2, CW * TS - W / 2); C.cam.y = clamp(C.cam.y, H / 2, CH * TS - H / 2);
  if (phoneRinging()) { C.ringT -= dt; if (C.ringT <= 0) { C.ringT = 3.5; const ph = CITY.stations.find((s) => s.type === 'phone'); if (dist(p.x, p.y, ph.x, ph.y) < 260) Sound.play('ring'); } }
}
function cityInteract(o) {
  const p = C.p, car = C.car, b = B();
  if (o.kind === 'custom') { if (o.act) extCall(o.act, o); return; }
  if (o.kind === 'car') { C.inCar = true; car.v = 0; Sound.play('door'); cityMusic(); cityMsg(curVehicle().name + ':  W/S GAS/BREMSE   A/D LENKEN   SHIFT TURBO   E AUSSTEIGEN', 4); return; }
  if (o.kind === 'locked') { if (o.b.apt) { aptTryBuy(o.b); return; } if (o.b.site) { siteTryBuy(o.b); return; } cityMsg(o.b.label + ': ZU VERKAUFEN! KAUFEN KANNST DU ES IM GARTENCENTER (UPGRADES).', 3); Sound.play('click'); return; }
  if (o.kind === 'exitcar') {
    if (Math.abs(car.v) > 40) { cityMsg('ERST ANHALTEN! (S = BREMSE)', 1.5); return; }
    const off = curVehicle().wid / 2 + 9;
    for (const side of [1, -1]) {
      const ex = car.x + Math.cos(car.a + side * Math.PI / 2) * off, ey = car.y + Math.sin(car.a + side * Math.PI / 2) * off;
      if (!citySolidAt(ex, ey)) { C.inCar = false; p.x = ex; p.y = ey; car.v = 0; Sound.play('door'); cityMusic(); return; }
    }
    cityMsg('HIER KANNST DU NICHT AUSSTEIGEN!', 1.5); return;
  }
  if (o.kind === 'ped') {
    const q = o.q;
    if (q.onTalk) { extCall(q.onTalk, q); return; }
    if (q.name && CITY_HOOKS.talk[q.name]) { extCall(CITY_HOOKS.talk[q.name], q); return; }
    if (canOffer(q)) {
      const hd = heldItem(), S = bag();
      const best = hd && hd.k[0] === 'j' ? hd.k.slice(2) : slotsKeys(S, 'j').map((k) => k.slice(2)).sort((x, y) => productPrice(y) - productPrice(x))[0];
      q.bought = true;
      const pm = priceMult(best), want = Math.min(0.85, 0.5 + b.rep * 0.01 + (nightAmount() > 0.5 ? 0.1 : 0)) * (pm <= 1 ? 1 + (1 - pm) * 0.8 : 1 / (pm * pm)) * (1 + 0.08 * sk('charm'));
      if (Math.random() < want) {
        const price = Math.round(productPrice(best) * rand(0.85, 1.15)), v = bizEarn(price);
        slotsTake(S, 'j:' + best, 1); save.money += v; b.sold++; b.earned += v; b.rep++; addXP(4);
        save.stats.street = (save.stats.street || 0) + 1; lilXP(2); persist();
        q.sayText = pick(['LECKER! HIER, ' + price + '€.', 'GENAU DAS HAB ICH GEBRAUCHT!', 'SAFT! ENDLICH!', 'NIMM DAS GELD, SCHNELL!', 'WAHNSINN, DER IST JA FRISCH!']); q.sayT = 2.5;
        cityMsg('VERKAUFT: 1X ' + productName(best) + ' FÜR ' + v + '€', 2.5); Sound.play('cash');
      } else { q.sayText = pick(['NEIN DANKE, KEIN DURST.', 'ICH TRINK NUR WASSER.', 'ZU TEUER!', 'VIELLEICHT SPÄTER.', 'IGITT, ORANGEN.']); q.sayT = 2.5; Sound.play('click'); }
      return;
    }
    q.sayText = q.name === 'KIOSK' ? 'WILLKOMMEN IM KIOSK! [E] AN DER THEKE.' : q.name === 'DEALER' ? 'SETZ DICH AN DEN TISCH!' : q.name === 'GÄRTNER' ? 'SAMEN UND ZUTATEN AN DER THEKE!'
      : q.name === 'VERKÄUFERIN' ? 'SUCH DIR EIN FAHRZEUG AUS! [E] AN DER THEKE.'
      : q.cop ? pick(['ALLES RUHIG HIER. NOCH.', 'FAHR VORSICHTIG, LIL.', 'ICH HAB DICH IM AUGE.', 'SCHÖNES WETTER ZUM STREIFE LAUFEN.'])
      : q.robbed ? pick(ROBBED_LINES)
      : q.seller ? 'ICH VERKAUFE DEINEN SAFT, CHEF!' : q.vendor ? 'DER STAND LÄUFT, CHEF!' : pick(PED_LINES);
    q.sayT = 2.5; Sound.play('blip', true); return;
  }
  if (o.kind === 'order') {
    const van = C.inCar && save.vehicle === 'van';
    const v = deliverOrder(o.o, van ? 1.25 : 1);
    if (v) { cityMsg('GELIEFERT AN ' + o.o.name + ': +' + v + '€' + (van ? ' (SAFT-MOBIL +25%)' : '') + (o.o.line ? '  "' + o.o.line + '"' : ''), 4); Sound.play('cash'); }
    else cityMsg(o.o.name + ' WILL ' + o.o.qty + 'X ' + productName(o.o.prod) + '. IN DER TASCHE: ' + slotsCount(bag(), 'j:' + o.o.prod) + '.', 3);
    return;
  }
  // Wer gesucht wird, kann keine Einsätze starten und nicht einkaufen
  const busy = o.kind === 'arena' || o.kind === 'mission' || o.kind === 'raid' || (o.kind === 'station' && !['bed', 'guide', 'phone', 'eq', 'box', 'register', 'stand', 'tree', 'fish'].includes(o.s.type) && !(STATION_INFO[o.s.ch] && STATION_INFO[o.s.ch].free));
  if (busy && C.wanted > 0) { cityMsg('DU WIRST GESUCHT! HÄNG ERST DIE POLIZEI AB.', 2.5); Sound.play('click'); return; }
  // Online-Gast: fragt beim Host an, der startet es für alle (net.js NET_GO)
  if ((o.kind === 'arena' || o.kind === 'mission' || o.kind === 'raid') && NET.mode === 'client') {
    if (o.kind === 'mission' && missionState(o.b.mission) === 'call') { cityMsg('ERST ANS TELEFON ZUHAUSE GEHEN!', 2.5); Sound.play('click'); return; }
    if (!netAskStart(o.kind, o.kind === 'mission' ? o.b.mission : 0)) { cityMsg('NICHT VERBUNDEN.', 2.5); Sound.play('click'); }
    return;
  }
  if (o.kind === 'arena') { citySave(); goto(() => startArena()); return; }
  if (o.kind === 'raid') { citySave(); goto(() => startRaid()); return; }
  if (o.kind === 'mission') {
    const li = o.b.mission, st = missionState(li);
    if (st === 'call') { cityMsg('ERST ANS TELEFON ZUHAUSE GEHEN!', 2.5); Sound.play('click'); return; }
    citySave();
    if (NET.mode === 'host' && typeof netStartLevel === 'function') netStartLevel(li);
    goto(() => startLevel(li));
    return;
  }
  const s = o.s;
  if (CITY_HOOKS.station[s.type]) { extCall(CITY_HOOKS.station[s.type], s); return; }
  switch (s.type) {
    case 'phone': phoneCall(); break;
    case 'guide': openGuide('city'); break;
    case 'bed': citySave(); Sound.play('heart'); cityMsg('ZZZ... SPIEL GESPEICHERT!', 2.5); break;
    case 'shop': setState('shop'); Sound.playSong('casino'); break;
    case 'console': C.mp = true; C.mpAt = T; Sound.play('select'); break;
    case 'eq': eqInteract(s.eq); break;
    case 'box': { const site = siteOfTile(Math.floor(s.x / TS), Math.floor(s.y / TS)); if (site) openStore(siteBox(site), 'LIEFERKISTE (' + SITES[site].name + ')'); break; }
    case 'market': openBiz('market'); break;
    case 'export': openBiz('export'); break;
    case 'tree': treeInteract(s); break;
    case 'autohaus': setState('autohaus'); Sound.playSong('casino'); break;
    case 'fish': openFish(); break;
    case 'darts': openDarts(); break;
    case 'kart': openKart(); break;
    case 'travel': openTravel(); break;
    case 'staff': openBiz('staff'); break;
    case 'garden': openBiz('garden'); break;
    case 'register':
      if (b.register > 0) { save.money += b.register; cityMsg('KASSE GELEERT: +' + b.register + '€', 3); b.register = 0; Sound.play('cash'); persist(); }
      else cityMsg('DIE KASSE IST LEER. VERKÄUFER UND SAFTSTAND FÜLLEN SIE.', 2.5);
      break;
    case 'stand': cityMsg(upLvl('stand') ? 'DEIN SAFTSTAND VERKAUFT ALLE 45 S EINEN SAFT AUS DEINEN REGALEN.' : 'SAFTSTAND ZU VERKAUFEN! (UPGRADE IM GARTENCENTER, AB RANG 2)', 3); break;
    default: openCasinoGame(s.type);
  }
}
