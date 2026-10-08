'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Offene Stadt: Zeichnen, HUD, Menüs (Pause, Multiplayer)
// =====================================================================
function renderCity(dt) {
  ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, W, H);
  const cam = C.cam, p = C.p, b = B();
  ctx.save();
  const sh = C.shakeT > 0 ? (C.shakeT -= dt, 3) : 0;
  ctx.translate(Math.round(W / 2 - cam.x + rand(-sh, sh)), Math.round(H / 2 - cam.y + rand(-sh, sh)));
  const sx0 = Math.max(0, Math.floor(cam.x - W / 2 - 8)), sy0 = Math.max(0, Math.floor(cam.y - H / 2 - 8));
  const sw = Math.min(CW * TS - sx0, W + 16), shh = Math.min(CH * TS - sy0, H + 16);
  ctx.drawImage(CITY.staticC, sx0, sy0, sw, shh, sx0, sy0, sw, shh);
  const wheel = CITY.stations.find((s) => s.type === 'wheel');
  if (wheel) { ctx.save(); ctx.translate(wheel.x, wheel.y); ctx.rotate(T * 0.6); for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#ffd23f' : '#c41f2a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 22, i * TAU / 12, (i + 1) * TAU / 12); ctx.fill(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); ctx.restore(); }
  drawCityDecor(ctx);
  drawEquipment(ctx);
  drawOrchard(ctx);
  drawGate(ctx);
  for (const s of CITY.stations) {
    if (s.type === 'slots') { ctx.fillStyle = '#5a0a2a'; ctx.fillRect(s.x - 7, s.y - 7, 14, 14); ctx.fillStyle = Math.floor(T * 4 + s.y) % 2 ? '#ffd23f' : '#ff3fa4'; ctx.fillRect(s.x - 5, s.y - 5, 10, 5); ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 4, s.y - 4, 2, 3); ctx.fillRect(s.x - 1, s.y - 4, 2, 3); ctx.fillRect(s.x + 2, s.y - 4, 2, 3); }
    else if (s.type === 'box') { const site = siteOfTile(Math.floor(s.x / TS), Math.floor(s.y / TS)); if (site && ownsSite(site) && !slotsEmpty(siteBox(site))) txt('!', s.x, s.y - 20 + Math.round(Math.sin(T * 6) * 2), { font: FS, align: 'center', color: '#ffe14d' }); }
    else if (s.type === 'register' && b.register > 0) txt(b.register + '€', s.x, s.y - 18 + Math.round(Math.sin(T * 5) * 2), { font: FS, align: 'center', color: '#7dff7a' });
    else if (s.type === 'stand') txt(upLvl('stand') ? 'OFFEN' : 'ZU VERKAUFEN', s.x, s.y - 18, { font: FS, align: 'center', color: upLvl('stand') ? '#7dff7a' : '#888888' });
  }
  if (Math.abs(cam.x - 23 * TS) < 420 && Math.abs(cam.y - 19 * TS) < 300) drawHome(ctx);
  // Autohaus: Ausstellungsfahrzeuge auf Drehscheiben
  if (Math.abs(cam.x - 116 * TS) < 400 && Math.abs(cam.y - 20 * TS) < 300) {
    [['bike', 114.5, 21], ['scooter', 117, 21], ['sport', 115.8, 23.4]].forEach(([id, tx, ty], k) => {
      const X = tx * TS, Y = ty * TS;
      ctx.fillStyle = '#9ab0c8'; ctx.beginPath(); ctx.arc(X, Y, id === 'sport' ? 17 : 10, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c8d8e8'; ctx.beginPath(); ctx.arc(X, Y, id === 'sport' ? 15 : 8, 0, TAU); ctx.fill();
      drawVehicle(ctx, { x: X, y: Y, a: T * 0.5 + k * 2, v: 0 }, false, id);
      if (!save.vehicles[id]) txt(VEHICLES[id].price + '€', X, Y - (id === 'sport' ? 24 : 18), { font: FS, align: 'center', color: '#ffe14d' });
    });
  }
  for (const bd of BUILDINGS) if (bd.locked && bd.locked()) {
    const X = bd.door[0] * TS, Y = bd.door[1] * TS;
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(X + 2, Y - 2, 4, 20); ctx.fillRect(X + 10, Y - 2, 4, 20);
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(X, Y + 3, 16, 3); ctx.fillRect(X, Y + 10, 16, 3);
    txt('ZU VERKAUFEN', X - 4, Y - 14, { font: FS, align: 'center', color: '#ffe14d' });
  }
  const ph = CITY.stations.find((s) => s.type === 'phone');
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(ph.x - 7, ph.y - 5, 14, 11); ctx.fillStyle = '#e01b3c'; ctx.fillRect(ph.x - 4 + (phoneRinging() ? Math.round(Math.sin(T * 40)) : 0), ph.y - 3, 8, 5);
  if (phoneRinging()) txt('RIIING!', ph.x, ph.y - 18 + Math.round(Math.sin(T * 6) * 2), { font: FS, align: 'center', color: '#ffe14d' });
  // Marker: Aufträge + Arena
  for (const bd of BUILDINGS) {
    if (!bd.marker) continue;
    const mx = bd.marker[0] * TS + 8, my = bd.marker[1] * TS + 8;
    if (bd.arena) {
      ctx.strokeStyle = '#ff3b3b'; const rr = 10 + Math.sin(T * 4) * 2;
      ctx.beginPath(); ctx.arc(mx, my, rr, 0, TAU); ctx.stroke();
      txt('ARENA', mx, my - 4, { font: FS, align: 'center', color: '#ff6a6a' });
      continue;
    }
    if (bd.act) {   // eigenes Gebäude mit Aktion (kein Auftrag)
      if (bd.drawMarker) { extCall(bd.drawMarker, ctx, mx, my, bd); continue; }
      const col = bd.markerCol || '#3fd0ff', rr = 10 + Math.sin(T * 4) * 2;
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx, my, rr, 0, TAU); ctx.stroke();
      txt(bd.markerText || '!', mx, my - 4, { font: FB, align: 'center', color: col });
      continue;
    }
    const st = missionState(bd.mission);
    if (st === 'locked') { txt('?', mx, my - 4, { font: FS, align: 'center', color: '#555566' }); continue; }
    const col = st === 'done' ? '#7dff7a' : st === 'open' ? '#ff3fa4' : '#ffe14d';
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    const rr = 10 + Math.sin(T * 4) * 2;
    ctx.beginPath(); ctx.arc(mx, my, rr, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(mx, my, rr, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    txt((bd.mission + 1) + '', mx, my - 4, { font: FB, align: 'center', color: '#ffffff' });
    if (st === 'done' && save.grades[bd.mission]) txt(save.grades[bd.mission], mx, my + 8, { font: FS, align: 'center', color: '#7dff7a' });
    if (propOf(bd) && ownsProp(bd.id)) txt('GEHÖRT DIR', mx, my + 17, { font: FS, align: 'center', color: '#ffd23f' });
    if (st === 'open') drawHandPointing(ctx, mx, my - 22 - Math.abs(Math.sin(T * 5)) * 5, Math.PI / 2, false);
  }
  // Kunden mit Bestellungen
  for (const o of b.orders) {
    const fake = { x: o.x, y: o.y, a: Math.PI / 2, walkT: 0, suit: '#7dff7a', shirt: '#fff', skin: '#f0c8a0', hair: '#4a2a12', weapon: null, state: '' };
    drawHuman(ctx, fake);
    ctx.save(); ctx.translate(o.x + 9, o.y - 14); drawWeaponShape(ctx, 'osaft'); ctx.restore();
    txt(o.qty + 'X', o.x, o.y - 30 + Math.round(Math.sin(T * 5) * 2), { font: FS, align: 'center', color: '#7dff7a' });
  }
  drawGold(ctx);
  drawCityBodies(ctx);
  drawBounty(ctx);
  for (const q of C.peds) if (!offscreen(q.x, q.y, 30)) drawHuman(ctx, q);
  for (const t of C.traffic || []) if (!offscreen(t.x, t.y, 40)) drawVehicle(ctx, t, false, 'car');
  for (const t of C.trucks) if (!offscreen(t.x, t.y, 40)) drawVehicle(ctx, t, false, 'van');
  drawPolice(ctx);
  drawRaidMarker(ctx);
  drawJobs(ctx);
  for (const f of CITY_HOOKS.draw) extCall(f, ctx);   // Weltkoordinaten
  mmapDrawGroundArrows(ctx);
  drawOtherPlayer(ctx);
  mmapDrawTpFx(ctx);
  drawVehicle(ctx, C.car, C.inCar);
  drawCityPet(ctx);
  if (!C.inCar) { drawHuman(ctx, p); drawCityWeapon(ctx); }
  drawCityBullets(ctx);
  // Sprechblasen: nur zeichnen, wenn sie sich nicht überdecken
  const said = [];
  for (const list of [C.cops, C.peds]) for (const q of list) {
    if (q.sayT <= 0 || offscreen(q.x, q.y)) continue;
    const w = textWidth(q.sayText, '8px ' + FS);
    if (said.some((r) => Math.abs(r.x - q.x) < (r.w + w) / 2 + 4 && Math.abs(r.y - q.y) < 11)) continue;
    said.push({ x: q.x, y: q.y, w });
    txt(q.sayText, q.x, q.y - 20, { font: FS, align: 'center', color: q.cop ? '#9ab0ff' : '#ffffff' });
  }
  if (C.prompt && !C.menu && !C.mp) {
    const o = C.prompt;
    let label = '';
    if (o.kind === 'station') {
      if (o.s.type === 'phone') label = phoneRinging() ? 'ANRUF ANNEHMEN!' : 'LETZTEN ANRUF NOCHMAL HÖREN';
      else if (o.s.type === 'eq') label = eqLabel(o.s.eq) + '   [X] AUFHEBEN';
      else if (o.s.type === 'tree') label = (B().orchard[o.s.tree] || 0) <= bizNow() ? 'ORANGEN PFLÜCKEN' : 'ORANGENBAUM (WÄCHST NACH)';
      else label = o.s.label;
    } else if (o.kind === 'car') label = 'EINSTEIGEN (' + curVehicle().name + ')';
    else if (o.kind === 'locked') label = o.b.apt ? 'WOHNUNG ' + o.b.label + ' KAUFEN: ' + APT_BY_ID[o.b.apt].price + '€' : o.b.site ? 'GRUNDSTÜCK ' + o.b.label + ' KAUFEN: ' + SITES[o.b.site].price + '€' + (B().rank < SITES[o.b.site].rank ? ' (AB RANG ' + SITES[o.b.site].rank + ')' : '') : o.b.label + ' (ZU VERKAUFEN)';
    else if (o.kind === 'exitcar') label = 'AUSSTEIGEN';
    else if (o.kind === 'ped') label = o.q.talkLabel || (canOffer(o.q) ? 'SAFT ANBIETEN (VERKAUFEN)' : 'REDEN');
    else if (o.kind === 'custom') label = o.label || '';
    else if (o.kind === 'order') label = 'LIEFERN: ' + o.o.qty + 'X ' + productName(o.o.prod) + ' (' + o.o.pay + '€)';
    else if (o.kind === 'arena') label = 'WELLEN-ARENA BETRETEN (BESTE WELLE: ' + (save.arenaBest || 0) + ')';
    else if (o.kind === 'raid') label = 'ÜBERFALL ABWEHREN!';
    else if (o.kind === 'mission') {
      const st = missionState(o.b.mission), L = LEVELS[o.b.mission];
      label = st === 'call' ? 'ERST ANS TELEFON!' : (st === 'done' ? 'NOCHMAL: ' : 'AUFTRAG STARTEN: ') + levelLabel(o.b.mission) + ' ' + L.name;
    }
    if (!(o.kind === 'exitcar' && Math.abs(C.car.v) > 5) && !C.ghost) txt('[E] ' + label, p.x, p.y - 28, { font: FS, align: 'center', color: '#7ff' });
    if (o.kind === 'mission' && propOf(o.b) && save.unlocked > o.b.mission) { const pr = propOf(o.b); txt(ownsProp(pr.id) ? 'GEHÖRT DIR: +' + pr.rent + '€/MIN' : '[B] KAUFEN: ' + pr.price + '€ (+' + pr.rent + '€/MIN MIETE)', p.x, p.y - 38, { font: FS, align: 'center', color: ownsProp(pr.id) ? '#7dff7a' : '#ffe14d' }); }
  }
  if (C.pickT && !C.pick && !C.menu && !C.mp) txt('[F] KLAUEN', p.x, p.y - (C.prompt ? 38 : 28), { font: FS, align: 'center', color: '#ffe14d' });
  if (C.ghost) txt(C.ghost.ok ? '[KLICK] AUFSTELLEN   [R] DREHEN' : C.ghost.why, p.x, p.y - 28, { font: FS, align: 'center', color: C.ghost.ok ? '#7dff7a' : '#ff6a6a' });
  drawCityLights(ctx);
  ctx.restore();
  drawCityAtmosphere();
  drawVignette();
  drawCityHUD();
  for (const f of CITY_HOOKS.drawHud) extCall(f, ctx);   // Bildschirmkoordinaten
}
function edgeArrow(tx, ty, big) {
  const sx = tx - C.cam.x + W / 2, sy = ty - C.cam.y + H / 2;
  if (sx >= 20 && sx <= W - 20 && sy >= 24 && sy <= H - 20) return;
  const ang = Math.atan2(sy - H / 2, sx - W / 2);
  const ex = clamp(W / 2 + Math.cos(ang) * 400, 24, W - 24), ey = clamp(H / 2 + Math.sin(ang) * 400, 30, H - 24);
  if (big) drawHandPointing(ctx, ex, ey, ang, false);
  else { ctx.fillStyle = '#7dff7a'; ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.fill(); ctx.restore(); }
}
function drawCityHUD() {
  const obj = cityObjective(), b = B();
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, 14);
  if (C.wanted > 0) {
    const cfg = WANTED_CFG[C.wanted];
    txt(C.seen ? 'GESUCHT! HAU AB ODER VERSTECK DICH!' : 'VERSTECKT... NOCH ' + Math.ceil(cfg.lose - C.lostT) + ' S, DANN 1 STERN WENIGER', 6, 3, { font: FS, color: C.seen ? '#ff6a6a' : '#7dff7a' });
    ctx.fillStyle = '#222'; ctx.fillRect(6, 11, 140, 2);
    ctx.fillStyle = '#7dff7a'; ctx.fillRect(6, 11, Math.round(140 * C.lostT / cfg.lose), 2);
  } else if (C.raid) txt('ÜBERFALL IN DEINER SAFTFABRIK! NOCH ' + Math.max(0, Math.ceil((C.raid.until - bizNow()) / 1000)) + ' S - SCHNELL HIN!', 6, 3, { font: FS, color: Math.floor(T * 4) % 2 ? '#ff6a6a' : '#ffe14d' });
  else if (C.bounty) txt(fitText('KOPFGELD: ' + C.bounty.ped.name + ' ERLEDIGEN - NOCH ' + Math.ceil(C.bounty.t) + ' S - ' + C.bounty.o.pay + '€', W - 110 - textWidth(save.money + '€', '8px ' + FS)), 6, 3, { font: FS, color: '#ff6a6a' });
  else if (C.job) txt(fitText(jobHudText(), W - 110 - textWidth(save.money + '€', '8px ' + FS)), 6, 3, { font: FS, color: '#7dff7a' });
  else txt(fitText('ZIEL: ' + obj.text, W - 110 - textWidth(save.money + '€', '8px ' + FS)), 6, 3, { font: FS, color: '#ffe14d' });
  txt(save.money + '€', W - 6, 3, { font: FS, align: 'right', color: '#7dff7a' });
  drawWantedStars(W - 14 - textWidth(save.money + '€', '8px ' + FS));
  if (C.raid) edgeArrow(RAID_SPOT[0] * TS + 8, RAID_SPOT[1] * TS + 8, true);
  else if (C.wp) edgeArrow(C.wp.x, C.wp.y, true);
  else if (C.job && jobTarget()) edgeArrow(jobTarget().x, jobTarget().y, true);
  else if (obj.target && !C.wanted) edgeArrow(obj.target.x, obj.target.y, true);
  for (const o of b.orders) edgeArrow(o.x, o.y, false);
  // Bestellungen
  b.orders.forEach((o, i) => {
    const left = Math.max(0, Math.ceil((o.until - bizNow()) / 1000));
    const tm = ' ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + '  ' + o.pay + '€';
    txt(fitText(o.name + ': ' + o.qty + 'X ' + productName(o.prod), 214 - textWidth(tm, '8px ' + FS)) + tm, 6, 17 + i * 10, { font: FS, color: slotsCount(bag(), 'j:' + o.prod) >= o.qty ? '#7dff7a' : '#ffb52a' });
  });
  // SMS / Rang-Meldungen
  bizNote.forEach((n, i) => { ctx.globalAlpha = clamp(n.t, 0, 1); panel(W - 250, 18 + i * 16, 244, 14, n.col); txt(fitText(n.text, 236), W - 246, 21 + i * 16, { font: FS, color: n.col }); ctx.globalAlpha = 1; });
  // Minikarte (Radar um Lil herum, Klick/N = große Karte)
  mmapRoute();
  mmapDrawRadar();
  txt('TAG ' + (gameDay() + 1) + '  ' + cityClock(), W - 6, H - MMAP_RH - 19, { font: FS, align: 'right', color: nightAmount() > 0.5 ? '#9ab0ff' : '#ffe14d' });
  const site = siteHere();
  if (site && ownsSite(site)) {
    const pots = allPots().filter((o) => o.s === site), ready = pots.filter((o) => potState(o) === 'ready').length, si = storeSlotInfo(site);
    if (!b.eq.some((o) => o.s === site)) { panel(MMAP_HX - 150, H - 66, 300, 14, '#7dff7a'); txt('TIPP: ZAHLENTASTE = GERÄT IN DIE HAND, DANN HIER HINKLICKEN!', MMAP_HX, H - 63, { font: FS, align: 'center', color: '#7dff7a' }); }
    panel(MMAP_HX - 120, H - 50, 240, 16, '#ff9a1a');
    txt(fitText(SITES[site].name + ':  KÜBEL ' + pots.length + (ready ? ' (' + ready + ' REIF!)' : '') + '   REGALE ' + si.used + '/' + si.total + '   SÄFTE ' + storeJuiceCount(site) + (site === 'factory' ? '   KASSE ' + b.register + '€' : ''), 232), MMAP_HX, H - 46, { font: FS, align: 'center', color: ready ? '#7dff7a' : '#ffffff' });
  }
  if (C.msgT > 0) {
    const lines = wrap(C.msg, 62).slice(0, 2);
    panel(W / 2 - 184, 40, 368, 6 + lines.length * 10, '#3fd0ff');
    lines.forEach((l, i) => txt(l, W / 2, 43 + i * 10, { font: FS, align: 'center', color: '#ffffff' }));
  } else if (!site) txt(fitText(C.inCar ? 'SHIFT TURBO   R RADIO   E AUSSTEIGEN   H HANDY   N KARTE' : 'E BENUTZEN  KLICK ANGRIFF  Q WAFFE  F KLAUEN  I INVENTAR  H HANDY', W - MMAP_RW - 24), 8, H - 30, { font: FS, color: '#888888' });
  drawHotbar();
  drawCityCombatHUD();
  if (coopActive()) txt('KOOP AN', 6, H - 54, { font: FS, color: '#66aaff' });
  drawPoliceHUD();
  if (C.inv) drawInventory();
  if (C.store) drawStore();
  if (C.map) drawPhoneMap();
  if (C.phone) drawPhone();
  if (C.travel) drawTravel();
  if (C.menu) cityMenu();
  if (C.mp) cityMP();
}
let confirmWipe = false;
function cityMenu() {
  ctx.fillStyle = 'rgba(10,0,20,0.8)'; ctx.fillRect(0, 0, W, H);
  txt('PAUSE', W / 2, 30, { size: 24, align: 'center', color: (i) => neon(i), wave: 3 });
  if (confirmWipe) {
    txt('WIRKLICH ALLES LÖSCHEN? GELD, LEVEL, PERKS, SAFTFABRIK - ALLES WEG!', W / 2, 100, { font: FS, align: 'center', color: '#ff6a6a' });
    listMenu('wipe', [
      { label: 'NEIN, BLOSS NICHT', act: () => { confirmWipe = false; } },
      { label: 'JA, NEU ANFANGEN', act: () => { confirmWipe = false; wipeSave(); save.exists = true; persist(); C = null; cityInit(); enterHub(); } },
    ], W / 2, 124, 20);
    return;
  }
  if (C.ach) { drawAchievements(); if (pressed.Escape && uiActive() && T - (C.menuAt || 0) > 0.1) C.ach = false; return; }
  if (C.opts) {
    txt('OPTIONEN', W / 2, 60, { align: 'center', color: '#ffe14d' });
    listMenu('cityopts', optionItems(() => { C.opts = false; }), W / 2, 86, 20);
    if (pressed.Escape && uiActive() && T - (C.menuAt || 0) > 0.1) C.opts = false;
    return;
  }
  listMenu('citymenu', [
    { label: 'WEITER', act: () => { C.menu = false; } },
    { label: 'FAHRZEUG HERHOLEN', act: () => { C.menu = false; callVehicle(); } },
    { label: 'MULTIPLAYER', act: () => { C.menu = false; C.mp = true; C.mpAt = T; } },
    { label: 'ANLEITUNG', act: () => { C.menu = false; openGuide('city'); } },
    { label: 'ERFOLGE', act: () => { C.ach = true; C.menuAt = T; } },
    ...(save.beaten ? [{ label: 'SCHWER-MODUS: ' + (save.hard ? 'AN' : 'AUS'), act: () => { save.hard = !save.hard; persist(); cityMsg(save.hard ? 'SCHWER-MODUS AN: HÄRTERE GEGNER, 50% MEHR GELD. FINALE = GOLDKRONE!' : 'SCHWER-MODUS AUS.', 4); } }] : []),
    { label: 'OPTIONEN', act: () => { C.opts = true; C.menuAt = T; } },
    { label: 'SPIELSTAND LÖSCHEN', act: () => { confirmWipe = true; } },
    { label: 'HAUPTMENÜ', act: () => { C.menu = false; citySave(); goto(() => { setState('title'); Sound.playSong('title'); }); } },
  ], W / 2, 64, 17);
  txt('DEIN SPIEL WIRD AUTOMATISCH GESPEICHERT.', W / 2, 222, { font: FS, align: 'center', color: '#888888' });
  if (pressed.Escape && uiActive() && T - (C.menuAt || 0) > 0.1) C.menu = false;
}
// ---------- Multiplayer-Menü (Spielkonsole zuhause / Pause) ----------
function cityMP() {
  ctx.fillStyle = 'rgba(0,8,20,0.92)'; ctx.fillRect(0, 0, W, H);
  txt('MULTIPLAYER', W / 2, 10, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  if (unameEditor()) return;
  if (C.joining) {
    txt('CODE VOM HOST EINGEBEN (4 BUCHSTABEN):', W / 2, 70, { align: 'center', color: '#ffffff' });
    for (const ch of typed) if (/[a-zA-Z0-9]/.test(ch) && C.joinCode.length < 4) C.joinCode += ch.toUpperCase();
    if (pressed.Backspace) C.joinCode = C.joinCode.slice(0, -1);
    panel(W / 2 - 60, 90, 120, 26, '#66aaff');
    txt(C.joinCode + (Math.floor(T * 2) % 2 && C.joinCode.length < 4 ? '_' : ''), W / 2, 96, { size: 16, align: 'center', color: '#ffe14d' });
    txt(C.joinCode.length === 4 ? '[ENTER] VERBINDEN   [ESC] ZURÜCK' : 'TIPPE DEN CODE   [ESC] ZURÜCK', W / 2, 130, { font: FS, align: 'center', color: '#aaaaaa' });
    if (uiActive() && pressed.Enter && C.joinCode.length === 4) { netJoin(C.joinCode); C.joining = false; COOP.on = false; }
    if (uiActive() && pressed.Escape) C.joining = false;
    return;
  }
  const net = NET.mode;
  const items = [
    { label: 'DEIN NAME: ' + (unameGet() || '(KEINER - KLICK!)'), color: '#ffb52a', act: () => unameAsk(null, false) },
    { label: 'LOKAL AM SELBEN PC: ' + (COOP.on ? 'AN' : 'AUS'), act: () => { COOP.on = !COOP.on; if (COOP.on && NET.mode !== 'off') netLeave(); } },
    { label: net === 'host' && !NET.pub ? 'PRIVAT GEHOSTET' + (NET.code ? ' (' + NET.code + ')' : '') : 'ONLINE PRIVAT HOSTEN (CODE)', act: () => { if (!(net === 'host' && !NET.pub)) { COOP.on = false; netHost(false); } } },
    { label: net === 'host' && NET.pub ? 'ÖFFENTLICH GEHOSTET' + (NET.code ? ' (' + NET.code + ')' : '') : 'ONLINE ÖFFENTLICH HOSTEN', act: () => { if (!(net === 'host' && NET.pub)) { COOP.on = false; netHost(true); } } },
    { label: 'MIT CODE BEITRETEN', act: () => { C.joining = true; C.joinCode = ''; } },
    { label: 'SCHNELL BEITRETEN (ÖFFENTLICH)', act: () => { COOP.on = false; netQuickJoin(); } },
  ];
  for (const p of netPeople()) if (!p.me && p.here) items.push({ label: 'ZU ' + p.name + ' TELEPORTIEREN', color: mmapTpBlock(p.idx) ? '#7788aa' : '#66ffff', act: () => mmapTeleport(p.idx) });
  if (net !== 'off') items.push({ label: 'VERBINDUNG TRENNEN', act: () => netLeave() });
  items.push({ label: 'ZURÜCK', act: () => { C.mp = false; } });
  const ppl = NET.connected;
  listMenu('mp', items, ppl ? 130 : W / 2, 32, 14, { w: ppl ? 124 : 190, max: 11 });
  if (ppl) mmapPlayerList(262, 30, 210, true);
  if (net === 'host' && NET.ready) {
    const px = ppl ? 262 : W / 2 - 100, py = ppl ? 92 : 148, pw = ppl ? 210 : 200, cx = px + pw / 2;
    panel(px, py, pw, 32, NET.connected ? '#7dff7a' : '#ffe14d');
    txt(NET.connected ? (NET.conns.length + 1) + '/4 SPIELER - CODE:' : NET.pub ? 'ANDERE FINDEN DICH ÜBER SCHNELL BEITRETEN:' : 'SAG DEINEN FREUNDEN DEN CODE:', cx, py + 4, { font: FS, align: 'center', color: '#ffffff' });
    txt(NET.code, cx, py + 14, { size: 16, align: 'center', color: NET.connected ? '#7dff7a' : '#ffe14d', wave: NET.connected ? 0 : 1 });
  }
  if (!ppl) [
    'LOKAL: SPIELER 2 AM SELBEN PC (CONTROLLER ODER PFEILTASTEN + PUNKT/KOMMA/MINUS).',
    'ONLINE: BIS ZU 4 SPIELER MIT CODE - KLAPPT AUCH IM SCHUL-WLAN UND MIT VPN.',
    'PRIVAT = NUR MIT CODE, ÖFFENTLICH = JEDER KANN ÜBER "SCHNELL BEITRETEN" REIN.',
    'IHR TEILT KONTO, TASCHE, FABRIK, FAHNDUNG UND ANRUFE. PERKS UND LEBEN HAT JEDER.',
  ].forEach((l, i) => txt(l, W / 2, 182 + i * 10, { font: FS, align: 'center', color: '#cccccc' }));
  else txt('TELEPORT: NUR IN DER STADT, NICHT MIT FAHNDUNG, JOB ODER KOPFGELD.', W / 2, 212, { font: FS, align: 'center', color: '#888899' });
  const st = (NET.status || (COOP.on ? 'LOKALER KOOP IST AN.' : 'EINZELSPIELER.')) + (NET.mode === 'client' && NET.connected ? '  (' + netLinkText() + ')' : '');
  txt(fitText('STATUS: ' + st + (NET.ping && NET.mode === 'client' ? '  PING ' + NET.ping + ' MS' : ''), W - 30), W / 2, 228, { font: FS, align: 'center', color: NET.connected ? '#7dff7a' : NET.mode !== 'off' ? '#ffe14d' : '#7dff7a' });
  if (pressed.Escape && uiActive() && T - (C.mpAt || 0) > 0.1) C.mp = false;
}

// =====================================================================
//  Minikarte (Radar unten rechts), Symbole, Navi-Route, Teleport zu Freunden
// =====================================================================
const MMAP_RW = 140, MMAP_RH = 80, MMAP_S = 2;   // Radar: 70x40 Felder, 2 px pro Feld
const MMAP_PCOL = ['#ff9ad5', '#66aaff', '#7dff7a', '#ffb52a'];
const MMAP_BLD = { home: ['home', '#ff6fb5'], kiosk: ['shop', '#ffd23f'], casino: ['casino', '#ff3fa4'], autohaus: ['car', '#3fd0ff'], garden: ['leaf', '#7dff7a'], police: ['cop', '#3a5aff'] };
// 5x5-Pixelbilder für die Symbole
const MMAP_GLYPH = {
  home: '..#...###.#####.#.#..###.', shop: '.###.#.#...###...#.#.###.', casino: '..#...###.#####.###...#..', car: '......###.##########.#.#.',
  leaf: '...##..###.###.###..#....', cop: '#.#.#.###.#####.###.#.#.#', arena: '#...#.#.#...#...#.#.#...#', mission: '..#....#....#.........#..',
  done: '....#...#.#.#...#........', call: '.###.#...#..#...###..###.', order: '..#...###..#.#..###..###.', factory: '#....#.#.######.#########',
  gunzer: '.###.#....#.####...#.###.', skull: '.###.#.#.######.###..#.#.', flag: '###..####.###..#....#....', apt: '#####.#.#.#####.#.#.#####',
};
const MMAP_IC = {};
const mmapLight = (c) => { const h = /^#([0-9a-f]{6})$/i.exec(c || ''); if (!h) return false; const n = parseInt(h[1], 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) > 150; };
// 9x9-Plakette mit Rand + Bild, gecacht pro Art/Farbe
function mmapIconImg(kind, col) {
  const key = kind + col;
  if (MMAP_IC[key]) return MMAP_IC[key];
  const [c, g] = mkCanvas(9, 9);
  g.fillStyle = '#000'; g.fillRect(1, 0, 7, 9); g.fillRect(0, 1, 9, 7);
  g.fillStyle = col; g.fillRect(2, 1, 5, 7); g.fillRect(1, 2, 7, 5);
  const gl = MMAP_GLYPH[kind];
  if (gl) { g.fillStyle = mmapLight(col) ? '#1a0a20' : '#ffffff'; for (let i = 0; i < 25; i++) if (gl[i] !== '.') g.fillRect(2 + (i % 5), 2 + ((i / 5) | 0), 1, 1); }
  return (MMAP_IC[key] = c);
}
function mmapIcon(g, kind, x, y, col, ch) {
  x = Math.round(x); y = Math.round(y);
  g.drawImage(mmapIconImg(MMAP_GLYPH[kind] ? kind : 'letter', col), x - 4, y - 4);
  if (!MMAP_GLYPH[kind] && ch) txt(String(ch).slice(0, 1), x + 1, y - 4, { g, font: FS, align: 'center', color: mmapLight(col) ? '#1a0a20' : '#ffffff' });
}
// Pfeil (ich / Freunde)
function mmapArrow(g, x, y, a, col, big) {
  const r = big ? 5 : 4;
  g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(a || 0);
  g.fillStyle = '#000'; g.beginPath(); g.moveTo(r + 2, 0); g.lineTo(-r, -r); g.lineTo(-r + 2, 0); g.lineTo(-r, r); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(r, 0); g.lineTo(-r + 1, -r + 2); g.lineTo(-r + 3, 0); g.lineTo(-r + 1, r - 2); g.closePath(); g.fill();
  g.restore();
}
// Alles, was auf die Karten gehört: { x, y (Welt-px), kind, col, label, ch?, pri? (am Radarrand festhalten) }
function mmapPOIs() {
  const out = [], b = B();
  const add = (x, y, kind, col, label, o) => out.push(Object.assign({ x, y, kind, col, label }, o || {}));
  for (const bd of BUILDINGS) {
    const gz = /gunzer/i.test(bd.id + ' ' + (bd.label || ''));
    const spot = bd.marker || bd.door || [bd.x + bd.w / 2, bd.y + bd.h];
    if (gz) { add(spot[0] * TS + 8, spot[1] * TS + 8, 'gunzer', '#ff9a1a', bd.label || 'GUNZER', { pri: true }); continue; }
    const k = MMAP_BLD[bd.id];
    if (k) { add(spot[0] * TS + 8, spot[1] * TS + 8, k[0], k[1], bd.label); continue; }
    if (bd.apt && ownsApt(bd.apt) && bd.door) { add(bd.door[0] * TS + 8, bd.door[1] * TS + 8, 'apt', '#ff9ad5', bd.label + ' (DEINS)'); continue; }
    if (bd.site && ownsSite(bd.site) && bd.door) { add(bd.door[0] * TS + 8, bd.door[1] * TS + 8, 'factory', '#ff9a1a', bd.label + ' (DEINS)'); continue; }
    if (!bd.marker) continue;
    const mx = bd.marker[0] * TS + 8, my = bd.marker[1] * TS + 8;
    if (bd.arena) add(mx, my, 'arena', '#ff3b3b', bd.label);
    else if (bd.act) add(mx, my, 'letter', bd.markerCol || '#3fd0ff', bd.actLabel || bd.label, { ch: bd.markerText || '!' });
    else if (bd.mission != null && LEVELS[bd.mission]) {
      const st = missionState(bd.mission);
      if (st === 'locked') continue;
      const nm = levelLabel(bd.mission) + ' ' + LEVELS[bd.mission].name;
      if (st === 'done') add(mx, my, 'done', '#2a8a3a', nm + ' (GESCHAFFT' + (save.grades[bd.mission] ? ', ' + save.grades[bd.mission] : '') + ')');
      else add(mx, my, 'mission', st === 'open' ? '#ff3fa4' : '#ffb52a', 'AUFTRAG ' + nm + (st === 'call' ? ' (ERST ANS TELEFON)' : ''), { pri: true });
    }
  }
  const ph = CITY.stations.find((s) => s.type === 'phone');
  if (ph && phoneRinging()) add(ph.x, ph.y, 'call', '#ffe14d', 'TELEFON KLINGELT!', { pri: true });
  for (const o of b.orders) add(o.x, o.y, 'order', '#7dff7a', 'KUNDE: ' + o.qty + 'X ' + productName(o.prod) + ' (' + o.pay + '€)', { pri: true });
  for (const q of C.peds) if (q.name === 'GUNZER' && !q.dead) add(q.x, q.y, 'gunzer', '#ff9a1a', 'GUNZER', { pri: true });
  if (C.bounty && C.bounty.ped) add(C.bounty.ped.x, C.bounty.ped.y, 'skull', '#ff3b3b', 'KOPFGELD: ' + C.bounty.ped.name, { pri: true });
  if (C.raid) add(RAID_SPOT[0] * TS + 8, RAID_SPOT[1] * TS + 8, 'mission', '#ff3b3b', 'ÜBERFALL!', { pri: true });
  if (C.job) { const t = jobTarget(); if (t) add(t.x, t.y, 'flag', '#7dff7a', 'JOB-ZIEL', { pri: true }); }
  return out;
}
// ---------- Navi-Route (Breitensuche vom Ziel, eigenes Feld; Polizei-Felder bleiben unberührt) ----------
const MMAP_R = { key: '', field: null, pts: null, t: 0, ok: null };
function mmapRoute() {
  if (!C.wp || !CITY) { MMAP_R.pts = null; MMAP_R.key = ''; return null; }
  if (!PF) pfInit();
  const car = !!C.inCar, ok = car ? PF.okCar : PF.okDoor;
  const tx = clamp(Math.floor(C.wp.x / TS), 0, CW - 1), ty = clamp(Math.floor(C.wp.y / TS), 0, CH - 1), key = tx + ',' + ty + (car ? 'c' : 'f');
  if (key !== MMAP_R.key) {
    MMAP_R.key = key; MMAP_R.ok = ok; MMAP_R.t = 0;
    if (!MMAP_R.field) MMAP_R.field = new Int16Array(CW * CH);
    bfs(MMAP_R.field, ok, nearestOk(ok, tx, ty));
  }
  MMAP_R.t -= frameDt || 0.016;
  if (MMAP_R.t <= 0) { MMAP_R.t = 0.25; MMAP_R.pts = mmapTrace(MMAP_R.field, MMAP_R.ok, C.inCar ? C.car.x : C.p.x, C.inCar ? C.car.y : C.p.y); }
  return MMAP_R.pts;
}
function mmapTrace(field, ok, x, y) {
  let tx = clamp(Math.floor(x / TS), 0, CW - 1), ty = clamp(Math.floor(y / TS), 0, CH - 1), i = ty * CW + tx;
  if (field[i] < 0) {   // Start liegt in einer Wand/Wiese: nächstes erreichbares Feld
    let best = -1, bd = 1e9;
    for (let r = 1; r <= 4 && best < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue;
      const n = ny * CW + nx;
      if (field[n] >= 0 && field[n] < bd) { bd = field[n]; best = n; }
    }
    if (best < 0) return null;
    i = best;
  }
  const pts = [[x, y]];
  let lx = 0, ly = 0;
  for (let n = 0; n < 900 && field[i] > 0; n++) {
    const cx = i % CW, cy = (i / CW) | 0;
    let best = -1, bd = field[i];
    for (const [dx, dy] of DIRS8) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue;
      const k = ny * CW + nx;
      if (field[k] < 0) continue;
      if (dx && dy && (!ok[cy * CW + nx] || !ok[ny * CW + cx])) continue;
      const d = field[k] + (dx && dy ? 0.45 : 0);
      if (d < bd) { bd = d; best = k; }
    }
    if (best < 0) break;
    const ddx = (best % CW) - cx, ddy = ((best / CW) | 0) - cy;
    if (ddx === lx && ddy === ly && pts.length > 1) pts.pop();   // gerade Strecken zusammenfassen
    lx = ddx; ly = ddy; i = best;
    pts.push([(i % CW) * TS + 8, ((i / CW) | 0) * TS + 8]);
  }
  pts.push([C.wp.x, C.wp.y]);
  return pts;
}
// Route als gestrichelte Linie in Kartenkoordinaten (P = Welt -> Bildschirm)
function mmapDrawRoute(g, P, w) {
  const pts = MMAP_R.pts;
  if (!C.wp) return;
  g.save();
  g.lineWidth = w; g.lineJoin = 'round';
  const path = () => { g.beginPath(); if (pts) pts.forEach((q, k) => { const [a, b] = P(q[0], q[1]); if (k) g.lineTo(a, b); else g.moveTo(a, b); }); else { const [a, b] = P(C.p.x, C.p.y), [c, d] = P(C.wp.x, C.wp.y); g.moveTo(a, b); g.lineTo(c, d); } };
  g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = w + 2; path(); g.stroke();
  g.lineWidth = w; g.strokeStyle = '#ffe14d';
  if (g.setLineDash) { g.setLineDash([3, 2]); g.lineDashOffset = -T * 10; }
  path(); g.stroke();
  g.restore();
}
// Bodenpfeile in der Welt: die nächsten Meter der Route
function mmapDrawGroundArrows(g) {
  if (!C.wp || C.map) return;
  const pts = mmapRoute();
  if (!pts || pts.length < 2) return;
  // Route in gleichmäßigen Abständen abgehen
  let k = 0, ax = pts[0][0], ay = pts[0][1], left = 22, n = 0;
  while (k < pts.length - 1 && n < 7) {
    const bx = pts[k + 1][0], by = pts[k + 1][1], seg = Math.hypot(bx - ax, by - ay);
    if (seg < left) { left -= seg; ax = bx; ay = by; k++; continue; }
    const f = left / seg; ax += (bx - ax) * f; ay += (by - ay) * f; left = 26; n++;
    if (dist(ax, ay, C.wp.x, C.wp.y) < 20) break;
    const a = Math.atan2(by - ay, bx - ax);
    g.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(T * 6 - n * 0.9));
    g.save(); g.translate(Math.round(ax), Math.round(ay)); g.rotate(a);
    g.fillStyle = '#000'; g.beginPath(); g.moveTo(6, 0); g.lineTo(-3, -6); g.lineTo(-1, 0); g.lineTo(-3, 6); g.closePath(); g.fill();
    g.fillStyle = '#ffe14d'; g.beginPath(); g.moveTo(5, 0); g.lineTo(-2, -4); g.lineTo(0, 0); g.lineTo(-2, 4); g.closePath(); g.fill();
    g.restore();
  }
  g.globalAlpha = 1;
}
// ---------- Radar unten rechts ----------
const mmapRadarRect = () => ({ x: W - MMAP_RW - 6, y: H - MMAP_RH - 6, w: MMAP_RW, h: MMAP_RH });
const mmapOverRadar = () => { const r = mmapRadarRect(); return mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h; };
function mmapDrawRadar() {
  const R = mmapRadarRect(), s = MMAP_S, vw = R.w / s, vh = R.h / s;
  const fx = C.inCar ? C.car.x : C.p.x, fy = C.inCar ? C.car.y : C.p.y;
  const sx0 = clamp(fx / TS - vw / 2, 0, CW - vw), sy0 = clamp(fy / TS - vh / 2, 0, CH - vh);
  const P = (x, y) => [R.x + (x / TS - sx0) * s, R.y + (y / TS - sy0) * s];
  const hov = mmapOverRadar() && !C.map && !C.phone && !C.menu && !C.mp;
  ctx.fillStyle = '#000'; ctx.fillRect(R.x - 2, R.y - 2, R.w + 4, R.h + 4);
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  ctx.drawImage(CITY.miniC, Math.round(R.x - sx0 * s), Math.round(R.y - sy0 * s), CW * s, CH * s);
  if (nightAmount() > 0.3) { ctx.fillStyle = 'rgba(0,0,30,' + (nightAmount() * 0.25).toFixed(2) + ')'; ctx.fillRect(R.x, R.y, R.w, R.h); }
  mmapDrawRoute(ctx, P, 1);
  const tile = (x, y, col, sz = 2) => { const [a, b] = P(x * TS, y * TS); ctx.fillStyle = col; ctx.fillRect(Math.round(a) - 1, Math.round(b) - 1, sz, sz); };
  drawPoliceMinimap(tile);
  ctx.restore();
  // Symbole (wichtige am Rand festhalten)
  const inR = (a, b) => a >= R.x && a < R.x + R.w && b >= R.y && b < R.y + R.h;
  const edge = (a, b) => [clamp(a, R.x + 4, R.x + R.w - 5), clamp(b, R.y + 4, R.y + R.h - 5)];
  for (const o of mmapPOIs()) {
    let [a, b] = P(o.x, o.y);
    if (!inR(a, b)) { if (!o.pri) continue; [a, b] = edge(a, b); ctx.globalAlpha = 0.75; }
    if (o.kind === 'done') { ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(Math.round(a) - 2, Math.round(b) - 2, 4, 4); ctx.fillStyle = '#7dff7a'; ctx.fillRect(Math.round(a) - 1, Math.round(b) - 1, 2, 2); continue; }
    if (o.kind === 'mission' && Math.floor(T * 3) % 2) { ctx.strokeStyle = o.col; ctx.strokeRect(Math.round(a) - 5.5, Math.round(b) - 5.5, 11, 11); }
    mmapIcon(ctx, o.kind, a, b, o.col, o.ch);
    ctx.globalAlpha = 1;
  }
  // Wegpunkt
  if (C.wp) { let [a, b] = P(C.wp.x, C.wp.y); if (!inR(a, b)) [a, b] = edge(a, b); mmapIcon(ctx, 'flag', a, b - (Math.floor(T * 4) % 2), '#ffe14d'); }
  // Freunde
  for (const f of mmapFriends()) { let [a, b] = P(f.x, f.y); if (!inR(a, b)) [a, b] = edge(a, b); mmapArrow(ctx, a, b, f.a, MMAP_PCOL[f.idx] || '#fff'); }
  // Fahrzeug + ich
  if (!C.inCar) { const [a, b] = P(C.car.x, C.car.y); if (inR(a, b)) { ctx.fillStyle = '#000'; ctx.fillRect(Math.round(a) - 2, Math.round(b) - 2, 5, 4); ctx.fillStyle = '#ff3fa4'; ctx.fillRect(Math.round(a) - 1, Math.round(b) - 1, 3, 2); } }
  { const [a, b] = P(fx, fy); mmapArrow(ctx, a, b, C.inCar ? C.car.a : C.p.a, '#ffffff', true); }
  // Rahmen
  ctx.strokeStyle = hov ? '#ffffff' : C.wanted > 0 ? (Math.floor(T * 4) % 2 ? '#ff3b3b' : '#3b6aff') : '#3fd0ff';
  ctx.lineWidth = 1; ctx.strokeRect(R.x - 1.5, R.y - 1.5, R.w + 3, R.h + 3);
  if (hov) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(R.x, R.y + R.h - 11, R.w, 11); txt('KLICK: GROSSE KARTE', R.x + R.w / 2, R.y + R.h - 10, { font: FS, align: 'center', color: '#ffffff' }); }
  else txt('N', R.x + 3, R.y + 1, { font: FS, color: 'rgba(255,255,255,0.6)' });
}
// ---------- Freunde (online) ----------
function mmapFriends() {
  if (!NET.connected) return [];
  const out = [], me = NET.mode === 'host' ? 0 : NET.myIdx, now = performance.now();
  for (const k in NET.others) {
    const o = NET.others[k], idx = +k;
    if (idx === me || now - o.at > 4000) continue;
    const x = Number.isFinite(o.rx) ? o.rx : o.x, y = Number.isFinite(o.ry) ? o.ry : o.y;
    out.push({ idx, x, y, a: o.car ? o.ca : o.a, car: !!o.car, name: netPlayerName(idx) });
  }
  return out;
}
// Teleport-Sperre: null = geht, sonst Grund
function mmapTpBlock(idx) {
  if (state !== 'city' || !C) return 'NUR IN DER STADT!';
  if (C.wanted > 0) return 'NICHT MIT FAHNDUNG! ERST DIE POLIZEI ABHÄNGEN.';
  if (C.busted) return 'GERADE NICHT...';
  if (C.raid) return 'ERST DEN ÜBERFALL ABWEHREN!';
  if (C.job) return 'NICHT WÄHREND EINES JOBS!';
  if (C.bounty) return 'NICHT WÄHREND DER KOPFGELD-JAGD!';
  if (C.ghost) return 'ERST DAS GERÄT WEGLEGEN!';
  const o = NET.others[idx];
  if (!NET.connected || !o || performance.now() - o.at > 4000) return netPlayerName(idx) + ' IST GERADE NICHT IN DER STADT.';
  return null;
}
// freien Platz neben (x, y) suchen
function mmapFreeSpot(x, y) {
  const free = (px, py) => px > 16 && py > 16 && px < CW * TS - 16 && py < CH * TS - 16 && ![[0, 0], [-6, 0], [6, 0], [0, -6], [0, 6]].some(([dx, dy]) => citySolidAt(px + dx, py + dy, false));
  for (const r of [22, 30, 40, 54, 70]) for (let k = 0; k < 16; k++) {
    const a = Math.PI / 2 + k * TAU / 16, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (free(px, py)) return [px, py];
  }
  return free(x, y) ? [x, y] : null;
}
function mmapTeleport(idx) {
  const why = mmapTpBlock(idx);
  if (why) { cityMsg(why, 2.5); Sound.play('click'); return false; }
  const o = NET.others[idx], spot = mmapFreeSpot(o.car ? o.cx : o.x, o.car ? o.cy : o.y);
  if (!spot) { cityMsg('DA IST KEIN PLATZ NEBEN ' + netPlayerName(idx) + '. GLEICH NOCHMAL!', 2.5); Sound.play('click'); return false; }
  const wasCar = C.inCar;
  C.inCar = false; if (C.car) C.car.v = 0;
  C.p.x = spot[0]; C.p.y = spot[1]; C.p.vx = C.p.vy = 0;
  C.cam.x = clamp(C.p.x, W / 2, CW * TS - W / 2); C.cam.y = clamp(C.p.y, H / 2, CH * TS - H / 2);
  C.tpFx = { x: C.p.x, y: C.p.y, t: 0.8 };
  C.map = null; C.mp = false;
  NET.cityT = 0;   // neue Position sofort senden
  Sound.play('door'); Sound.play('coin');
  cityMsg(pick(['BEAM! DU STEHST JETZT NEBEN ', 'ZACK, TELEPORTIERT ZU ', 'SAFT-PORTAL GEÖFFNET: HALLO ', 'WUSCH! ÜBERRASCHUNG FÜR ']) + netPlayerName(idx) + '!' + (wasCar ? ' (DEIN FAHRZEUG: ESC > FAHRZEUG HERHOLEN)' : ''), 3.5);
  return true;
}
// Teleport-Blitz in der Welt
function mmapDrawTpFx(g) {
  const f = C.tpFx;
  if (!f) return;
  f.t -= frameDt || 0.016;
  if (f.t <= 0) { C.tpFx = null; return; }
  const k = f.t / 0.8;
  g.globalAlpha = k; g.strokeStyle = '#66ffff'; g.lineWidth = 2;
  g.beginPath(); g.arc(Math.round(C.p.x), Math.round(C.p.y), 6 + (1 - k) * 26, 0, TAU); g.stroke();
  g.fillStyle = '#ffffff'; g.fillRect(Math.round(C.p.x) - 1, Math.round(C.p.y) - 40 * k, 2, 40 * k);
  g.globalAlpha = 1; g.lineWidth = 1;
}
// Klick auf das Radar / Taste N öffnet die große Karte (bevor die Stadt den Klick als Angriff nimmt)
const mmapUpdateCity0 = updateCity;
updateCity = function (dt) {
  if (C && !(C.menu || C.mp || C.inv || C.phone || C.travel || C.store || C.map || C.busted) && uiActive()) {
    if ((mouse.pl && mmapOverRadar()) || pressed.KeyN) { mouse.pl = false; C.map = { at: T }; Sound.play('select'); return; }
  }
  return mmapUpdateCity0(dt);
};
// Spielerliste (Multiplayer-Menü und große Karte); gibt die Höhe zurück
function mmapPlayerList(x, y, w, tp) {
  const ps = netPeople();
  if (!ps.length) return 0;
  panel(x, y, w, 12 + ps.length * 11, '#66aaff');
  ctx.strokeStyle = '#66aaff'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 11 + ps.length * 11);
  txt('SPIELER ' + ps.length + '/4', x + 4, y + 2, { font: FS, color: '#66aaff' });
  ps.forEach((p, i) => {
    const yy = y + 12 + i * 11, col = MMAP_PCOL[p.idx] || '#fff';
    ctx.fillStyle = col; ctx.fillRect(x + 4, yy + 2, 5, 5);
    const tag = p.me ? ' (DU)' : p.idx === 0 ? ' (HOST)' : '';
    txt(fitText(p.name + tag, w - 66), x + 12, yy, { font: FS, color: p.me ? '#ffffff' : col });
    const where = p.me ? (p.ping ? p.ping + ' MS' : '') : !p.here ? 'IM EINSATZ/MENÜ' : p.o && p.o.car ? 'FÄHRT' : 'STADT';
    if (!tp || p.me || !p.here) txt(where, x + w - 4, yy, { font: FS, align: 'right', color: '#888899' });
    else {
      const bx = x + w - 52, hov = mouse.x >= bx && mouse.x < x + w - 2 && mouse.y >= yy - 1 && mouse.y < yy + 10, blocked = !!mmapTpBlock(p.idx);
      ctx.fillStyle = hov ? '#66aaff' : 'rgba(102,170,255,0.25)'; ctx.fillRect(bx, yy - 1, 50, 10);
      txt('TELEPORT', bx + 25, yy, { font: FS, align: 'center', color: hov ? '#000' : blocked ? '#7788aa' : '#ffffff' });
      if (hov && mouse.pl && uiActive()) { mouse.pl = false; mmapTeleport(p.idx); }
    }
  });
  return 12 + ps.length * 11;
}
const MMAP_HX = Math.round((W - MMAP_RW - 12) / 2);   // Mitte der Fläche links vom Radar
