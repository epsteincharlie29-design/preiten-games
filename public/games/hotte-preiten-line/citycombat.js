'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Kämpfen in der offenen Stadt (wie in GTA):
//  [Q] Waffe ziehen (alle im Kiosk gekauften Waffen), Leute umhauen oder
//  erledigen, Zeugen rufen die Polizei, ab 3 Sternen schießt sie zurück.
//  Keine Leben mehr = bewusstlos -> Krankenhaus (kostet Geld).
//  Dazu: Verkehr auf den Straßen und nachkommende Passanten.
// =====================================================================
const CITY_HP = 5, HOSPITAL_SPOT = [84, 48], HOSPITAL_CAR = [86, 51];
const SCREAMS = ['AAAAH!', 'HILFE!!', 'MÖRDER!', 'POLIZEI!!!', 'LAUFT!', 'NICHT SCHIESSEN!', 'MAMAAA!'];
const COP_SHOUT = ['WAFFE WEG!', 'SCHUSSWAFFE FREIGEGEBEN!', 'FEUER FREI!', 'ER IST BEWAFFNET!', 'IN DECKUNG!'];
const CIV_COLS = [['#3a6ac4', '#1a3a84'], ['#e8e8e8', '#a8a8b0'], ['#2a8a4a', '#1a5a2a'], ['#c41f2a', '#841018'], ['#4a4a52', '#2a2a30'], ['#d9a020', '#a07010'], ['#8e44ad', '#5e2a7d'], ['#2ab0c8', '#1a7088']];
const KO_LINES = ['DER ARZT HAT GESAGT: WENIGER PRÜGELN, MEHR SAFT TRINKEN.', 'DAS KRANKENHAUSESSEN WAR SCHLIMMER ALS DIE SCHÜSSE.', 'DIE KRANKENSCHWESTER WOLLTE EIN AUTOGRAMM.', 'DU HAST DREI TAGE GESCHLAFEN. ODER DREI MINUTEN.'];

function cityWeapons() { return [null].concat(Object.keys(save.weapons || {}).filter((id) => save.weapons[id] && WEAPONS[id] && !WEAPONS[id].enemyOnly && !WEAPONS[id].noCity && id !== 'vexwave' && id !== 'boomerang')); }
function setCityWeapon(id) { C.wpn = id; C.p.weapon = id ? { id, ammo: 1 } : null; C.ammo = id && WEAPONS[id].ranged ? cityMag(id) : 0; C.reload = 0; }
function cycleWeapon() {
  const list = cityWeapons();
  if (list.length <= 1) { cityMsg('DU HAST NOCH KEINE WAFFEN. KAUF WELCHE IM KIOSK (WAFFEN)!', 2.5); Sound.play('click'); return; }
  const i = list.indexOf(C.wpn || null);
  setCityWeapon(list[(i + 1) % list.length]);
  Sound.play('pickup'); cityMsg(C.wpn ? WEAPONS[C.wpn].name + ' GEZOGEN. LINKSKLICK = ANGRIFF.' : 'WAFFE WEGGESTECKT.', 1.5);
}
const aimAngle = () => Math.atan2(mouse.y - H / 2 + C.cam.y - C.p.y, mouse.x - W / 2 + C.cam.x - C.p.x);

function updateCityCombat(dt, canAttack) {
  const p = C.p;
  if (p.hp == null) p.hp = cityMaxHp();
  if (C.wpn && !(save.weapons && save.weapons[C.wpn])) setCityWeapon(null);
  C.fireCd = (C.fireCd || 0) - dt;
  if (pressed.KeyQ && !C.inCar) cycleWeapon();
  if (C.reload > 0) { C.reload -= dt; if (C.reload <= 0) { C.ammo = WEAPONS[C.wpn] ? cityMag(C.wpn) : 0; Sound.play('click'); } }
  const w = C.wpn ? WEAPONS[C.wpn] : null;
  if (!C.inCar && canAttack && (w && w.ranged && w.auto ? mouse.down : mouse.pl)) cityAttack(w);
  p.recoil = Math.max(0, (p.recoil || 0) - dt * 12);
  C.hurtT = (C.hurtT || 0) + dt;
  if (p.hp < cityMaxHp() && C.hurtT > 6) { C.regenT = (C.regenT || 0) + dt; if (C.regenT > 4) { C.regenT = 0; p.hp++; } }
  p.invT = Math.max(0, (p.invT || 0) - dt);
  C.lethalT = Math.max(0, (C.lethalT || 0) - dt);
  updateCityBullets(dt);
  updateWitnesses(dt);
  updateCopGuns(dt);
  updateCashDrops(dt);
  updateCityParts(dt);
  updatePopulation(dt);
  updateTraffic(dt);
  updateWaypoint();
  updateCityPet(dt);
  updateBounty(dt);
  updateGold();
}
const cityMaxHp = () => CITY_HP + sk('hp');
const cityMag = (id) => Math.round(WEAPONS[id].ammo * (1 + 0.2 * sk('aim')));
const cityReload = () => 1.4 / (1 + 0.2 * sk('aim'));
function cityAttack(w) {
  const p = C.p;
  if (C.fireCd > 0) return;
  p.a = aimAngle();
  if (!w) { cityPunch(); return; }
  if (!w.ranged) { cityMelee(w); C.fireCd = w.rate; return; }
  if (C.reload > 0) return;
  if (C.ammo <= 0) { C.reload = cityReload(); Sound.play('click'); return; }
  C.ammo--; C.fireCd = w.rate; p.recoil = 2; p.mouthT = 0.12;
  const mx = p.x + Math.cos(p.a) * 10, my = p.y + Math.sin(p.a) * 10;
  if (w.special === 'juice') spawnCityBullet(mx, my, p.a, 260, 'p', 0.75, 3, 'juice');
  else for (let i = 0; i < (w.pellets || 1); i++) {
    const flame = w.special === 'flame';
    spawnCityBullet(mx, my, p.a + rand(-(w.spread || 0), w.spread || 0), (w.speed || 470) * (flame ? rand(0.7, 1) : 1), 'p', flame ? rand(0.25, 0.4) : 1, w.kind === 'laser' || w.kind === 'harpoon' ? 2 : 1, flame ? 'flame' : w.kind || 'bullet');
  }
  if (!w.special) cityPart(mx, my, 0, 0, 0.05, '#fff7b0', 5, 'flash');
  if (w.special !== 'flame' || Math.random() < 0.25) Sound.play(w.sfx);
  C.shakeT = Math.max(C.shakeT || 0, 0.04 + (w.shake || 1) * 0.015);
  panicAround(p.x, p.y, 210, false);
  if (C.wanted < 1 && !C.bounty && copsNear(p.x, p.y, 300)) crime(1, 'SCHÜSSE IN DER STADT!', true);
  if (C.ammo <= 0) C.reload = cityReload();
}
function copsNear(x, y, r) { return C.cops.some((q) => q.state !== 'down' && dist(q.x, q.y, x, y) < r) || C.pcars.some((c) => dist(c.x, c.y, x, y) < r * 1.2); }
// Fäuste: umhauen. Wer schon liegt, wird erledigt.
function cityPunch() {
  const p = C.p;
  p.swingT = 0.18; p.swingDir = -(p.swingDir || 1); C.fireCd = 0.35;
  Sound.play('swoosh');
  for (const list of [C.peds, C.cops]) for (const q of list) {
    if (dist(p.x, p.y, q.x, q.y) > 17 || Math.abs(angDiff(p.a, Math.atan2(q.y - p.y, q.x - p.x))) > 1.1) continue;
    if (protectedPed(q)) { q.sayText = q.seller || q.vendor ? 'HEY CHEF, ICH ARBEITE FÜR DICH!' : 'LASS DAS!'; q.sayT = 1.5; return; }
    if (q.state === 'down') { Sound.play('punch'); killCityPed(q, p.a, 'melee'); return; }
    q.state = 'down'; q.downT = q.cop ? 3 : 2.5; q.downAng = p.a; q.sayText = pick(['AUA!', 'UFF!', 'SPINNST DU?!', 'MEINE NASE!', 'HILFE!']); q.sayT = 1.8;
    Sound.play('punch'); C.shakeT = 0.1;
    if (q.cop) crime(1, 'POLIZIST GESCHLAGEN!', true);
    else if (!q.robber) {
      crime(1, 'SCHLÄGEREI!');
      if (Math.random() < 0.25) { const v = randi(2, 12); dropCash(q.x, q.y, v); }
    }
    return;
  }
}
function cityMelee(w) {
  const p = C.p;
  p.swingT = 0.18; p.swingDir = -(p.swingDir || 1);
  Sound.play('swoosh');
  let hit = false;
  for (const list of [C.peds, C.cops]) for (const q of list.slice()) {
    const d = dist(p.x, p.y, q.x, q.y), a = Math.atan2(q.y - p.y, q.x - p.x);
    if (d > w.reach + q.r || (d > 8 && Math.abs(angDiff(p.a, a)) > w.arc)) continue;
    if (protectedPed(q)) { q.sayText = 'LASS DAS!'; q.sayT = 1.5; continue; }
    hit = true; Sound.play(w.hitSfx || 'punch');
    if (w.lethal || q.state === 'down') killCityPed(q, a, 'melee');
    else { q.state = 'down'; q.downT = 2.6; q.downAng = a; q.sayText = 'QUIETSCH!'; q.sayT = 1.5; if (!q.robber) crime(1, q.cop ? 'POLIZIST GESCHLAGEN!' : 'SCHLÄGEREI!', !!q.cop); }
  }
  if (hit) C.shakeT = 0.12;
}
const protectedPed = (q) => q.still || q.jobPed || q.seller || q.vendor;
// Person erledigt: liegt da, Geld fällt raus, Zeugen schreien
function killCityPed(q, ang, how) {
  if (q.dead || protectedPed(q)) return false;
  q.dead = true; q.state = 'dead';
  if (q.cop) C.cops = C.cops.filter((o) => o !== q); else C.peds = C.peds.filter((o) => o !== q);
  (C.bodies = C.bodies || []).push({ x: q.x, y: q.y, a: ang, suit: q.suit, shirt: q.shirt, skin: q.skin, hair: q.hair, cop: !!q.cop, t: 0, blood: rand(6, 10) });
  if (C.bodies.length > 30) C.bodies.shift();
  for (let i = 0; i < 16; i++) { const a = ang + rand(-1, 1), s = rand(30, 140); cityPart(q.x, q.y, Math.cos(a) * s, Math.sin(a) * s, rand(0.2, 0.5), pick(BLOOD), pick([1, 2]), 'blood'); }
  Sound.play('splat'); C.shakeT = Math.max(C.shakeT || 0, 0.12);
  dropCash(q.x, q.y, q.cop ? randi(30, 80) : Math.random() < 0.08 ? randi(60, 150) : randi(4, 35));
  save.stats.cityKills = (save.stats.cityKills || 0) + 1;
  if (q.robber || q.bountyTarget || q.bountyGuard) { panicAround(q.x, q.y, 120, false); return true; }   // Gesuchte: keine Anzeige
  C.lethalT = 60;
  panicAround(q.x, q.y, 160, true);
  if (q.cop) crime(3, 'POLIZIST ERLEDIGT!', true);
  else if (copsSee(q.x, q.y, true)) crime(2, 'MORD VOR DEN AUGEN DER POLIZEI!', true);
  return true;
}
// Leute in der Nähe rennen weg; Zeugen rufen nach ein paar Sekunden die Polizei
function panicAround(x, y, r, witness) {
  for (const q of C.peds) {
    if (q.dead || q.still || q.state === 'down' || dist(q.x, q.y, x, y) > r) continue;
    q.fleeT = rand(3.5, 6); q.fleeFrom = { x, y };
    if (Math.random() < 0.5) { q.sayText = pick(SCREAMS); q.sayT = 1.6; }
    if (witness && !q.robber && !q.seller && cityLOS(q.x, q.y, x, y) && q.callT == null) q.callT = rand(2.5, 4);
  }
}
function updateWitnesses(dt) {
  for (const q of C.peds) {
    if (q.callT == null) continue;
    q.callT -= dt;
    if (q.callT > 0) continue;
    q.callT = null;
    if (q.dead || q.state === 'down') continue;
    q.sayText = 'HALLO POLIZEI?! HIER WURDE JEMAND...'; q.sayT = 2.5;
    for (const o of C.peds) o.callT = null;
    crime(C.wanted >= 2 ? 1 : 2, 'ZEUGEN HABEN DIE POLIZEI GERUFEN!', true);
    break;
  }
}
// ab 3 Sternen (oder nach einem Mord) schießt die Polizei zurück
function updateCopGuns(dt) {
  if (C.busted || C.wanted < 2 || (C.wanted < 3 && C.lethalT <= 0)) return;
  const p = C.p, tgt = C.inCar ? C.car : p;
  for (const q of C.cops) {
    if (q.mode !== 'chase' || q.state === 'down' || q.waitT > 0) continue;
    q.gunT = (q.gunT == null ? rand(0.6, 1.4) : q.gunT) - dt;
    const d = dist(q.x, q.y, tgt.x, tgt.y);
    if (q.gunT > 0 || d > 170 || d < 14 || !cityLOS(q.x, q.y, tgt.x, tgt.y)) continue;
    q.gunT = rand(1.1, 1.8);
    const a = Math.atan2(tgt.y - q.y, tgt.x - q.x);
    q.a = a; spawnCityBullet(q.x + Math.cos(a) * 8, q.y + Math.sin(a) * 8, a + rand(-0.14, 0.14), 280, 'c', 1.2, 1, 'bullet');
    Sound.play('pistol', 0.6);
    if (Math.random() < 0.3) { q.sayText = pick(COP_SHOUT); q.sayT = 1.6; }
  }
}
function hurtCityPlayer(b) {
  const p = C.p;
  if (p.invT > 0 || C.busted) return;
  if (C.inCar && Math.random() < 0.7) { Sound.play('armor'); return; }   // das Auto fängt das meiste ab
  p.hp--; p.invT = 0.5; C.hurtT = 0; C.shakeT = 0.25; Sound.play('hurtBoss');
  for (let i = 0; i < 8; i++) { const a = rand(TAU); cityPart(p.x, p.y, Math.cos(a) * 60, Math.sin(a) * 60, 0.3, pick(BLOOD), 2, 'blood'); }
  if (p.hp <= 0) knockOut();
}
function knockOut() {
  const p = C.p, fee = Math.min(save.money, 150 + Math.round(save.money * 0.05), 2000);
  save.money -= fee; save.stats.ko = (save.stats.ko || 0) + 1;
  C.wanted = 0; C.bust = 0; C.pick = null; C.lostT = 0; C.lethalT = 0; C.bullets = [];
  for (const q of C.cops) if (q.mode === 'chase') q.mode = 'leave';
  for (const c of C.pcars) if (c.mode === 'chase') { c.mode = 'leave'; c.siren = false; }
  C.busted = { t: 3.6, fine: fee, hospital: true, line: pick(KO_LINES) };
  C.inCar = false; p.hp = cityMaxHp(); p.invT = 2; if (C.bounty) { C.peds = C.peds.filter((q) => q !== C.bounty.ped && !C.bounty.guards.includes(q)); C.bounty = null; C.wp = null; }
  p.x = HOSPITAL_SPOT[0] * TS + 8; p.y = HOSPITAL_SPOT[1] * TS + 8;
  C.car.x = HOSPITAL_CAR[0] * TS + 8; C.car.y = HOSPITAL_CAR[1] * TS + 8; C.car.a = 0; C.car.v = 0;
  C.cam.x = p.x; C.cam.y = p.y;
  Sound.play('death'); cityMusic();
  citySave();
}

// ---------- Kugeln in der Stadt ----------
function spawnCityBullet(x, y, a, sp, owner, life, dmg, kind) { (C.bullets = C.bullets || []).push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, owner, life, dmg, kind }); }
function updateCityBullets(dt) {
  if (!C.bullets) return;
  for (const b of C.bullets) {
    if (b.dead) continue;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; if (b.kind === 'juice') cityExplode(b.x, b.y, 48); continue; }
    const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 4));
    b.px = b.x; b.py = b.y;
    for (let s = 0; s < n && !b.dead; s++) {
      b.x += b.vx * dt / n; b.y += b.vy * dt / n;
      const tx = Math.floor(b.x / TS), ty = Math.floor(b.y / TS);
      if (tx < 0 || ty < 0 || tx >= CW || ty >= CH) { b.dead = true; break; }
      const i = ty * CW + tx, c = CITY.t[i];
      if ((CITY.solid[i] && c !== '~') || (EQ_SOLID && EQ_SOLID[i])) {
        b.dead = true;
        if (b.kind === 'juice') cityExplode(b.x - b.vx * dt / n, b.y - b.vy * dt / n, 48);
        else cityPart(b.x, b.y, 0, 0, 0.12, '#ffe66d', 2, 'spark');
        break;
      }
      if (b.owner === 'p') {
        for (const list of [C.peds, C.cops]) {
          for (const q of list) {
            if (q.dead || dist(b.x, b.y, q.x, q.y) > q.r + 2) continue;
            if (b.kind === 'juice') { b.dead = true; cityExplode(b.x, b.y, 48); break; }
            hitCityPed(q, b);
            if (b.kind !== 'flame' && b.kind !== 'harpoon') { b.dead = true; break; }
          }
          if (b.dead) break;
        }
      } else {
        const p = C.p, tgt = C.inCar ? C.car : p;
        if (dist(b.x, b.y, tgt.x, tgt.y) < (C.inCar ? 12 : p.r + 2)) { b.dead = true; hurtCityPlayer(b); }
      }
    }
  }
  C.bullets = C.bullets.filter((b) => !b.dead);
}
function hitCityPed(q, b) {
  if (protectedPed(q)) { q.sayText = 'HEY!! NICHT SCHIESSEN!'; q.sayT = 1.2; return; }
  if (q.cop || q.hp > 1) {
    q.hp = (q.hp == null ? 2 : q.hp) - b.dmg;
    if (!q.cop) { if (q.hp > 0) { q.sayText = pick(['AUA!', 'DAS WAR NIX!', 'HAHA, DANEBEN!']); q.sayT = 1.2; return; } killCityPed(q, Math.atan2(b.vy, b.vx), 'shot'); return; }
    if (q.hp > 0) { q.sayText = pick(COP_SHOUT); q.sayT = 1.5; if (q.mode !== 'leave') q.mode = 'chase'; crime(2, 'SCHÜSSE AUF DIE POLIZEI!', true); return; }
  }
  killCityPed(q, Math.atan2(b.vy, b.vx), 'shot');
}
// O-Saft in der Stadt: alles im Umkreis ist erledigt
function cityExplode(x, y, r) {
  Sound.play('explode'); Sound.play('splat'); C.shakeT = 0.35;
  for (let i = 0; i < 40; i++) { const a = rand(TAU), s = rand(30, 200); cityPart(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.2, 0.6), pick(JUICE), pick([1, 2, 3]), 'blood'); }
  cityPart(x, y, 0, 0, 0.15, '#fff3c0', r * 0.8, 'flash');
  for (const list of [C.peds, C.cops]) for (const q of list.slice()) if (!q.dead && dist(q.x, q.y, x, y) < r) killCityPed(q, Math.atan2(q.y - y, q.x - x), 'juice');
  if (!C.inCar && dist(C.p.x, C.p.y, x, y) < r * 0.5) { hurtCityPlayer({}); hurtCityPlayer({}); }
  panicAround(x, y, 260, true);
}
// ---------- Geld auf dem Boden ----------
function dropCash(x, y, v) { (C.drops = C.drops || []).push({ x: x + rand(-4, 4), y: y + rand(-4, 4), v, t: 0 }); }
function updateCashDrops(dt) {
  if (!C.drops) return;
  for (const d of C.drops) {
    d.t += dt;
    if (!C.inCar && dist(d.x, d.y, C.p.x, C.p.y) < 12) { d.dead = true; save.money += d.v; Sound.play('coin'); cityMsg('+' + d.v + '€ AUFGEHOBEN', 1.2); }
    if (d.t > 90) d.dead = true;
  }
  C.drops = C.drops.filter((d) => !d.dead);
}
// ---------- kleine Effekte ----------
function cityPart(x, y, vx, vy, life, col, s, kind) { (C.parts = C.parts || []).push({ x, y, vx, vy, life, max: life, col, s, kind }); if (C.parts.length > 400) C.parts.shift(); }
function updateCityParts(dt) {
  if (!C.parts) return;
  for (const q of C.parts) { q.life -= dt; const f = Math.exp(-dt * 6); q.vx *= f; q.vy *= f; q.x += q.vx * dt; q.y += q.vy * dt; }
  C.parts = C.parts.filter((q) => q.life > 0);
  if (C.bodies) { for (const b of C.bodies) b.t += dt; C.bodies = C.bodies.filter((b) => b.t < 120); }
}
// ---------- Passanten kommen nach ----------
function updatePopulation(dt) {
  C.popT = (C.popT || 0) - dt;
  if (C.popT > 0) return;
  C.popT = 2;
  const walkers = C.peds.filter((q) => !q.still && !q.seller && !q.vendor && !q.jobPed && !q.robber).length;
  if (walkers >= 42) return;
  const s = spawnSpot(footSpawnOk, 300, 620);
  if (s) C.peds.push(makePed(Math.floor(s.y / TS) * CW + Math.floor(s.x / TS)));
}
// ---------- Verkehr ----------
function updateTraffic(dt) {
  C.traffic = C.traffic || [];
  if (C.traffic.length < 12 && Math.random() < dt * 0.8) {
    const s = spawnSpot(carSpawnOk, 280, 900);
    if (s && s.x < (LAND_X - 2) * TS) { const t = makePoliceCar(s.x, s.y, 'patrol'); const [c1, c2] = pick(CIV_COLS); t.civ = true; t.col = c1; t.dark = c2; C.traffic.push(t); }
  }
  for (const t of C.traffic) updatePoliceCar(t, dt, null, null);
  // Leute überfahren: der Verkehr bremst, Lil nicht unbedingt...
  for (const t of C.traffic) {
    if (Math.abs(t.v) < 40) continue;
    for (const q of C.peds) if (q.state !== 'down' && !q.still && dist(q.x, q.y, t.x, t.y) < 12) { q.state = 'down'; q.downT = 2; q.downAng = t.a; q.sayText = 'IDIOT!!'; q.sayT = 1.5; t.v *= 0.3; Sound.play('honk'); }
  }
}

// ---------- Zeichnen ----------
function drawCityBodies(g) {
  if (C.bodies) for (const b of C.bodies) {
    if (offscreen(b.x, b.y, 30)) continue;
    const k = clamp(b.t * 2, 0, 1);
    g.fillStyle = 'rgba(110,0,16,0.85)'; g.beginPath(); g.ellipse(b.x + 2, b.y + 1, b.blood * k + 3, b.blood * 0.7 * k + 2, b.a, 0, TAU); g.fill();
    g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(b.a);
    if (b.t > 100) g.globalAlpha = clamp((120 - b.t) / 20, 0, 1);
    drawLyingBody(g, { suit: b.suit, skin: b.skin, hair: b.cop ? '#14204a' : b.hair, isPlayer: false });
    g.restore(); g.globalAlpha = 1;
  }
  if (C.drops) for (const d of C.drops) {
    if (offscreen(d.x, d.y, 20)) continue;
    const bob = Math.round(Math.sin(T * 4 + d.x) * 1);
    g.fillStyle = '#1a6a2a'; g.fillRect(Math.round(d.x) - 4, Math.round(d.y) - 2 + bob, 8, 5); g.fillStyle = '#7dff7a'; g.fillRect(Math.round(d.x) - 3, Math.round(d.y) - 1 + bob, 6, 3);
    g.fillStyle = '#1a6a2a'; g.fillRect(Math.round(d.x) - 1, Math.round(d.y) + bob, 2, 1);
  }
}
function drawCityBullets(g) {
  if (C.bullets) for (const b of C.bullets) {
    if (b.kind === 'juice') { g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(T * 14); drawWeaponShape(g, 'osaft'); g.restore(); continue; }
    if (b.kind === 'flame') { const k = clamp(b.life / 0.4, 0, 1); g.fillStyle = `rgba(255,${Math.round(120 + 120 * k)},40,${0.4 + 0.5 * k})`; g.beginPath(); g.arc(b.x, b.y, 2 + (1 - k) * 5, 0, TAU); g.fill(); continue; }
    g.strokeStyle = b.owner === 'p' ? (b.kind === 'laser' ? '#39ff7a' : '#fff3a0') : '#ff8a5a'; g.lineWidth = b.kind === 'laser' ? 2 : 1.5;
    g.beginPath(); g.moveTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018); g.lineTo(b.x, b.y); g.stroke();
  }
  g.lineWidth = 1;
  if (C.parts) for (const q of C.parts) {
    if (q.kind === 'flash') { g.fillStyle = q.col; g.globalAlpha = clamp(q.life / q.max, 0, 1); g.beginPath(); g.arc(q.x, q.y, q.s * (q.life / q.max) + 1, 0, TAU); g.fill(); g.globalAlpha = 1; }
    else { g.fillStyle = q.col; g.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
  }
}
function drawCityWeapon(g) {
  const p = C.p;
  if (C.reload > 0) { g.fillStyle = '#000'; g.fillRect(Math.round(p.x) - 9, Math.round(p.y) - 20, 18, 3); g.fillStyle = '#ffe14d'; g.fillRect(Math.round(p.x) - 8, Math.round(p.y) - 19, Math.round(16 * (1 - C.reload / 1.4)), 1); }
}
function drawCityCombatHUD() {
  const p = C.p, show = (p.hp != null && p.hp < cityMaxHp()) || C.wanted >= 2 || C.wpn || C.bounty;
  if (show) {
    for (let i = 0; i < cityMaxHp(); i++) drawHeart(ctx, 8 + i * 9, H - 62, 1, i < (p.hp == null ? cityMaxHp() : p.hp) ? '#ff3b5a' : '#3a2a3a');
  }
  if (C.wpn) {
    const w = WEAPONS[C.wpn];
    txt(w.name + (w.ranged ? '  ' + (C.reload > 0 ? 'LÄDT...' : C.ammo + '/' + w.ammo) : ''), 8, H - 54, { font: FS, color: C.reload > 0 ? '#ffe14d' : '#ffffff' });
  }
  if (C.lethalT > 0 && C.wanted >= 2) txt('DIE POLIZEI SCHIESST!', 8, H - 72, { font: FS, color: Math.floor(T * 4) % 2 ? '#ff3b3b' : '#ffffff' });
}
