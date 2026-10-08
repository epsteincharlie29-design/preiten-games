'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Begleiter (Haustiere aus dem Kiosk)
//  Folgen Lil in der Stadt und in jedem Einsatz und helfen mit:
//   DACKEL BRUNO   beißt Gegner um (dann [LEERTASTE])
//   KATZE MIEZE    faucht Gegner an (verwirrt) + zeigt Gegner durch Wände
//   BULLDOGGE ROCKY langsamer, sein Biss erledigt Gegner
//   MICHAEL MERL    die Amsel: fliegt über Wände, sammelt Geld ein,
//                   hackt Gegnern auf den Kopf (verwirrt), findet Geld in der Stadt
//  In der Stadt beißen sie Polizisten, die dich festnehmen wollen.
// =====================================================================
const PETS = {
  dackel: { name: 'DACKEL BRUNO', price: 4500, speed: 165, cd: 2.4, desc: ['SCHNELL UND MUTIG.', 'BEISST GEGNER UM - DANN', 'MIT [LEERTASTE] ERLEDIGEN.'] },
  katze: { name: 'KATZE MIEZE', price: 7000, speed: 145, cd: 3.0, desc: ['FAUCHT GEGNER AN: VERWIRRT.', 'ZEIGT DIR GEGNER IN DER', 'NÄHE DURCH WÄNDE.'] },
  bulldog: { name: 'BULLDOGGE ROCKY', price: 12000, speed: 120, cd: 3.6, desc: ['LANGSAM, ABER STARK.', 'SEIN BISS ERLEDIGT GEGNER', 'SOFORT (KEINE BOSSE).'] },
  merl: { name: 'MICHAEL MERL', price: 6500, speed: 200, cd: 2.2, fly: true, desc: ['DIE AMSEL MICHAEL MERL.', 'FLIEGT ÜBER WÄNDE, BRINGT DIR', 'GELD UND HACKT GEGNERN AUF', 'DEN KOPF (VERWIRRT).'] },
};
const MERL_LINES = ['TSCHILP!', 'MERL MERL!', 'ICH BIN MICHAEL MERL!', 'KRAAH!', 'PIEP PIEP, LIL!'];
const PET_NO = 'BVYQOK';   // Bosse, Maschinen, Requisiten, Hunde: in Ruhe lassen
function shopPetItems() {
  save.pets = save.pets || {};
  return Object.keys(PETS).map((id) => {
    const P = PETS[id], own = save.pets[id], act = save.pet === id;
    return { label: P.name + (act ? '  [DABEI]' : own ? '  [GEKAUFT]' : '  ' + P.price + '€'), color: act ? '#7dff7a' : own ? '#7ff' : save.money >= P.price ? '#ffffff' : '#aa7777', pet: id,
      act: () => { if (own) { save.pet = act ? '' : id; persist(); Sound.play('pickup'); } else shopBuy(P.price, () => { save.pets[id] = true; save.pet = id; }); } };
  });
}
// ---------- im Einsatz ----------
function petInit() {
  G.pet = null;
  if (!save.pet || !PETS[save.pet] || NET.mode === 'client') return;
  const p = G.player;
  G.pet = { kind: save.pet, x: p.x + 8, y: p.y + 6, a: 0, walkT: 0, cd: 1, r: 4, target: null, biteT: 0 };
  resolve(G.pet);
}
function petOwner() { return G.players.find((q) => q.alive) || null; }
function updatePet(dt) {
  const P = G.pet;
  if (!P) return;
  const D = PETS[P.kind], o = petOwner();
  P.cd -= dt; P.biteT = Math.max(0, P.biteT - dt);
  if (!o) return;
  if (D.fly) { updateFlyPet(P, D, o, dt); return; }
  // Ziel suchen: wache Gegner in der Nähe mit Sichtlinie
  if (P.target && (P.target.state === 'dead' || P.target.state === 'down' || P.target.state === 'confused' && P.kind === 'katze')) P.target = null;
  if (!P.target && P.cd <= 0) {
    let best = null, bd = 150;
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.state === 'down' || e.static || PET_NO.includes(e.kind) || (ENEMY_EXT[e.kind] && ENEMY_EXT[e.kind].noPet) || e.flying) continue;
      if (P.kind === 'katze' && e.state === 'confused') continue;
      const d = dist(P.x, P.y, e.x, e.y);
      if (d < bd && (e.alerted || e.state === 'alert' || e.state === 'search' || d < 70) && los(P.x, P.y, e.x, e.y)) { bd = d; best = e; }
    }
    P.target = best;
    if (best && Math.random() < 0.5) floatText(P.x, P.y - 12, P.kind === 'katze' ? 'FAUCH!' : 'WUFF!', '#ffe14d', true);
  }
  let tx = o.x, ty = o.y, sp = D.speed;
  const tg = P.target;
  if (tg) {
    tx = tg.x; ty = tg.y;
    if (dist(P.x, P.y, tg.x, tg.y) < tg.r + P.r + 4) { petBite(P, tg); P.target = null; P.cd = D.cd; }
  } else if (dist(P.x, P.y, o.x, o.y) < 22) sp = 0;
  if (dist(P.x, P.y, o.x, o.y) > 420) { P.x = o.x + 8; P.y = o.y + 6; resolve(P); P.target = null; }
  if (sp > 0) {
    const a = Math.atan2(ty - P.y, tx - P.x), step = sp * dt;
    P.a = turnTo(P.a, a, dt * 12);
    if (los(P.x, P.y, tx, ty)) moveEntity(P, Math.cos(a) * step, Math.sin(a) * step);
    else { P.pathT = (P.pathT || 0) - dt; if (P.pathT <= 0) { P.path = findPath(P.x, P.y, tx, ty); P.pathT = 0.5; } followPath(P, step, dt); }
    P.walkT += dt;
  }
}
// Michael Merl fliegt: keine Wände, kreist um Lil, stürzt sich auf Gegner, trägt Geld zu Lil
function updateFlyPet(P, D, o, dt) {
  P.walkT += dt;
  if (P.target && (P.target.state === 'dead' || P.target.state === 'down' || P.target.state === 'confused')) P.target = null;
  if (!P.target && P.cd <= 0) {
    let best = null, bd = 170;
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.state === 'down' || e.state === 'confused' || e.static || PET_NO.includes(e.kind) || (ENEMY_EXT[e.kind] && ENEMY_EXT[e.kind].noPet) || e.flying) continue;
      const d = dist(o.x, o.y, e.x, e.y);
      if (d < bd && (e.alerted || e.state === 'alert' || e.state === 'search' || d < 90)) { bd = d; best = e; }
    }
    P.target = best;
    if (best && Math.random() < 0.5) floatText(P.x, P.y - 18, pick(['TSCHILP!', 'KRAAH!', 'MERL!']), '#ffe14d', true);
  }
  let tx, ty;
  if (P.target) {
    const e = P.target; tx = e.x; ty = e.y;
    if (dist(P.x, P.y, tx, ty) < 9) {
      e.state = 'confused'; e.confT = 2.6; P.target = null; P.cd = D.cd; P.biteT = 0.3;
      Sound.play('squeak'); floatText(e.x, e.y - 14, pick(['PICK PICK!', 'AUA, MEIN KOPF!', 'EIN VOGEL?!', 'MICHAEL MERL!!!']), '#ffe14d', true);
    }
  } else { const a = T * 2.2; tx = o.x + Math.cos(a) * 20; ty = o.y + Math.sin(a) * 14 - 4; }
  const a = Math.atan2(ty - P.y, tx - P.x), d = dist(P.x, P.y, tx, ty), step = Math.min(d, D.speed * (P.target ? 1.2 : 1) * dt);
  P.x += Math.cos(a) * step; P.y += Math.sin(a) * step;
  if (d > 1) P.a = turnTo(P.a, a, dt * 10);
  if (dist(P.x, P.y, o.x, o.y) > 500) { P.x = o.x; P.y = o.y - 10; P.target = null; }
  // Geld in seiner Nähe trägt er zu Lil
  for (const c of G.cashes) {
    const dc = dist(c.x, c.y, P.x, P.y);
    if (dc < 46) { const k = Math.min(1, 220 * dt / Math.max(1, dist(c.x, c.y, o.x, o.y))); c.x += (o.x - c.x) * k; c.y += (o.y - c.y) * k; }
  }
}
function drawMerl(g, P) {
  const x = Math.round(P.x), y = Math.round(P.y), h = P.noFly ? 0 : 9 + Math.round(Math.sin(T * 3 + (P.walkT || 0)) * 2), flap = Math.sin(T * 22) > 0;
  if (!P.noFly) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, y + 4, 5, 2, 0, 0, TAU); g.fill(); }
  g.save(); g.translate(x, y - h); g.scale(1.3, 1.3); g.rotate(P.a || 0);
  g.fillStyle = '#16161c';
  if (flap) { g.fillRect(-3, -7, 5, 5); g.fillRect(-3, 2, 5, 5); } else { g.fillRect(-4, -5, 6, 3); g.fillRect(-4, 2, 6, 3); }
  g.fillStyle = '#26262e'; g.fillRect(-5, -2, 9, 4);
  g.fillStyle = '#3a3a44'; g.fillRect(-4, -2, 6, 1);
  g.fillStyle = '#101014'; g.fillRect(-8, -1, 3, 2);
  g.fillStyle = '#26262e'; g.fillRect(3, -2, 3, 4);
  g.fillStyle = '#ffb000'; g.fillRect(6, -1, 3, 2);
  g.fillStyle = '#ffd23f'; g.fillRect(4, -2, 1, 1); g.fillRect(4, 1, 1, 1);
  if (P.biteT > 0) { g.fillStyle = '#ffffff'; g.fillRect(9, -2, 1, 1); g.fillRect(9, 1, 1, 1); }
  g.restore();
}
function petBite(P, e) {
  const ang = Math.atan2(e.y - P.y, e.x - P.x);
  P.biteT = 0.25;
  if (P.kind === 'katze' || e.kind === 'R') { e.state = 'confused'; e.confT = 3; Sound.play('squeak'); floatText(e.x, e.y - 14, P.kind === 'katze' ? 'IIIH, EINE KATZE!' : 'AUA! MEIN BEIN!', '#ffe14d', true); return; }
  Sound.play('bark');
  if (P.kind === 'bulldog') killEnemy(e, 'dog', ang);
  else { knockDown(e, ang, 3.2); floatText(e.x, e.y - 14, 'GEBISSEN!', '#ffe14d', true); }
}
function drawPetSprite(g, P, lying) {
  const x = Math.round(P.x), y = Math.round(P.y);
  if (P.kind === 'merl') { drawMerl(g, P); return; }
  if (P.kind === 'katze') {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 1, y + 2, 5, 4, 0, 0, TAU); g.fill();
    g.save(); g.translate(x, y); g.rotate(P.a);
    const s = Math.round(Math.sin(P.walkT * 20) * 1.5);
    g.fillStyle = '#c87a20'; g.fillRect(-5 + s, -3, 2, 2); g.fillRect(2 - s, -3, 2, 2); g.fillRect(-5 - s, 1, 2, 2); g.fillRect(2 + s, 1, 2, 2);
    g.fillStyle = '#e8a040'; g.fillRect(-5, -2, 9, 4); g.fillStyle = '#c87a20'; g.fillRect(-3, -2, 1, 4); g.fillRect(0, -2, 1, 4);
    g.fillStyle = '#e8a040'; g.fillRect(4, -2, 4, 4); g.fillRect(5, -4, 1, 2); g.fillRect(7, -4, 1, 2);
    g.fillStyle = '#7dff7a'; g.fillRect(7, -1, 1, 1); g.fillStyle = '#ff9ad5'; g.fillRect(8, 0, 1, 1);
    g.fillStyle = '#e8a040'; g.fillRect(-9, -1 + Math.round(Math.sin(T * 5) * 1.5), 4, 1);
    g.restore();
    return;
  }
  const big = P.kind === 'bulldog';
  g.save(); g.translate(x, y); if (big) { g.scale(1.25, 1.25); g.translate(-x, -y); }
  drawDog(g, { x, y, a: P.a, walkT: P.walkT, windup: P.biteT, swingT: 0 }, lying);
  g.restore();
  if (big) { g.save(); g.translate(x, y); g.rotate(P.a); g.fillStyle = '#d8c8b0'; g.fillRect(-8, -3, 15, 6); g.fillStyle = '#b8a890'; g.fillRect(-8, -3, 15, 1); g.fillStyle = '#5a4a3a'; g.fillRect(6, -3, 6, 6); g.fillStyle = '#111'; g.fillRect(11, -1, 2, 2); g.restore(); }
  g.save(); g.translate(x, y); g.rotate(P.a); g.fillStyle = '#ff3fa4'; g.fillRect(4, -2, 1, 4); g.restore();   // pinkes Halsband
}
function drawPet(g) {
  const P = G.pet;
  if (!P) return;
  drawPetSprite(g, P, false);
  // Katze: Gegner in der Nähe durch Wände sehen
  if (P.kind === 'katze') for (const e of G.enemies) if (e.state !== 'dead' && e.kind !== 'B' && dist(e.x, e.y, P.x, P.y) < 230) { g.strokeStyle = 'rgba(255,170,60,0.7)'; g.lineWidth = 1; g.strokeRect(Math.round(e.x) - 6.5, Math.round(e.y) - 6.5, 13, 13); }
}
// ---------- in der Stadt ----------
function updateCityPet(dt) {
  if (!save.pet || !PETS[save.pet]) { C.pet = null; return; }
  const p = C.p, D = PETS[save.pet];
  if (!C.pet || C.pet.kind !== save.pet) C.pet = { kind: save.pet, x: p.x + 10, y: p.y + 8, a: 0, walkT: 0, r: 4, cd: 0, biteT: 0 };
  const P = C.pet;
  P.cd -= dt; P.biteT = Math.max(0, P.biteT - dt);
  if (D.fly) { updateCityBird(P, D, dt); return; }
  if (C.inCar) { P.x = C.car.x; P.y = C.car.y; return; }   // fährt mit
  // Polizisten beißen, die Lil festnehmen wollen
  if (C.wanted > 0 && P.cd <= 0) {
    const cop = C.cops.find((q) => q.mode === 'chase' && q.state !== 'down' && dist(q.x, q.y, p.x, p.y) < 70);
    if (cop) {
      const a = Math.atan2(cop.y - P.y, cop.x - P.x);
      cityMove(P, Math.cos(a) * D.speed * dt, Math.sin(a) * D.speed * dt); P.a = a; P.walkT += dt;
      if (dist(P.x, P.y, cop.x, cop.y) < 10) { cop.state = 'down'; cop.downT = 2.5; cop.downAng = a; cop.sayText = P.kind === 'katze' ? 'IIIH! EINE KATZE!' : 'AUA! DER BEISST!'; cop.sayT = 2; P.cd = D.cd * 2.5; P.biteT = 0.3; Sound.play(P.kind === 'katze' ? 'squeak' : 'bark'); C.bust = 0; }
      return;
    }
  }
  const d = dist(P.x, P.y, p.x, p.y);
  if (d > 260) { P.x = p.x + 10; P.y = p.y + 8; return; }
  if (d > 24) {
    const a = Math.atan2(p.y - P.y, p.x - P.x), sp = Math.min(D.speed, d * 4) * dt;
    cityMove(P, Math.cos(a) * sp, Math.sin(a) * sp); P.a = turnTo(P.a, a, dt * 10); P.walkT += dt;
  }
  if (Math.random() < dt * 0.05) { P.say = P.kind === 'katze' ? 'MIAU' : 'WUFF'; P.sayT = 1.2; }
  P.sayT = (P.sayT || 0) - dt;
}
// Michael Merl in der Stadt: fliegt mit (auch neben dem Auto), hackt Polizisten, findet ab und zu Geld
function updateCityBird(P, D, dt) {
  const p = C.inCar ? C.car : C.p;
  P.walkT += dt; P.sayT = (P.sayT || 0) - dt;
  let tx, ty;
  const cop = C.wanted > 0 && P.cd <= 0 && !C.inCar ? C.cops.find((q) => q.mode === 'chase' && q.state !== 'down' && dist(q.x, q.y, C.p.x, C.p.y) < 90) : null;
  if (cop) {
    tx = cop.x; ty = cop.y;
    if (dist(P.x, P.y, cop.x, cop.y) < 9) { cop.state = 'down'; cop.downT = 2.2; cop.downAng = P.a; cop.sayText = 'EIN VOGEL! MEIN KOPF!'; cop.sayT = 2; P.cd = D.cd * 2.5; P.biteT = 0.3; Sound.play('squeak'); C.bust = 0; }
  } else { const a = T * 2.2; tx = p.x + Math.cos(a) * (C.inCar ? 26 : 20); ty = p.y + Math.sin(a) * 14 - 4; }
  const a = Math.atan2(ty - P.y, tx - P.x), d = dist(P.x, P.y, tx, ty), step = Math.min(d, (C.inCar ? 480 : D.speed * 1.2) * dt);
  P.x += Math.cos(a) * step; P.y += Math.sin(a) * step;
  if (d > 1) P.a = turnTo(P.a, a, dt * 10);
  if (dist(P.x, P.y, p.x, p.y) > 300) { P.x = p.x; P.y = p.y - 10; }
  P.findT = (P.findT == null ? rand(25, 45) : P.findT) - dt;
  if (P.findT <= 0) { P.findT = rand(30, 55); const v = randi(4, 20); save.money += v; persist(); cityMsg('MICHAEL MERL HAT ' + v + '€ GEFUNDEN UND BRINGT ES DIR!', 2.5); Sound.play('coin'); }
  if (Math.random() < dt * 0.05) { P.say = pick(MERL_LINES); P.sayT = 1.4; }
}
function drawCityPet(g) {
  const P = C.pet;
  if (P && PETS[P.kind] && PETS[P.kind].fly) { if (!offscreen(P.x, P.y, 30)) { drawMerl(g, P); if (P.sayT > 0) txt(P.say, P.x, P.y - 24, { g, font: FS, align: 'center', color: '#ffffff' }); } return; }
  if (!P || C.inCar || offscreen(P.x, P.y, 30)) return;
  drawPetSprite(g, P, false);
  if (P.sayT > 0) txt(P.say, P.x, P.y - 16, { g, font: FS, align: 'center', color: '#ffffff' });
}
