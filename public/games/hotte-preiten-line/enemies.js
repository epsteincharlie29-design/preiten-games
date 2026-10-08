'use strict';
// =====================================================================
//  LIL PREITNER - Gegner: Erzeugen und KI
// =====================================================================
const SUITS = {
  E: ['#f2f2f2', '#ff6fb5'], S: ['#3d6b4f', '#e8e8e8'], U: ['#262630', '#ff3b3b'], M: ['#8e44ad', '#ffffff'],
  K: ['#8b4513', '#c0392b'], R: ['#1a1a1a', '#ffd700'], N: ['#4a5a3a', '#c0c0a0'], B: ['#fafafa', '#c41f1f'],
  F: ['#2a3a5a', '#9ab0c8'], J: ['#141418', '#e01b3c'], W: ['#d9622a', '#ffd23f'],   // Schild, Ninja, O-Saft-Bomber
};
const dd = () => clamp((G.diff - 1) / 9, 0, 1);   // 0 = leicht ... 1 = brutal

function makeEnemy(kind, x, y, bossType) {
  const D = G ? G.diff : 1;
  if (G && !bossType && !(G.L && G.L.arena)) {   // neue Gegnertypen in späteren Levels
    if (kind === 'E' && D >= 5.5 && Math.random() < 0.14) kind = 'F';
    else if (kind === 'M' && D >= 5 && Math.random() < 0.2) kind = 'J';
    else if ((kind === 'E' || kind === 'U') && D >= 7 && Math.random() < 0.09) kind = 'W';
  }
  const melee = D <= 3 ? pick(['baguette', 'pan', 'baguette', 'chicken']) : pick(['bat', 'pan', 'bat', 'katana', 'baguette']);
  let weapon = { E: 'pistol', S: 'shotgun', U: 'uzi', M: melee, N: 'sniper', Y: 'turret', Q: 'drone', F: 'pistol', J: 'katana' }[kind] || null;
  if (kind === 'E' && D >= 6 && Math.random() < 0.25) weapon = 'magnum';
  if (kind === 'U' && D >= 6 && Math.random() < 0.4) weapon = 'rifle';
  if (kind === 'R' && Math.random() < 0.3) weapon = 'bat';
  const s = SUITS[kind] || SUITS.E;
  const e = {
    kind, x, y, a: 0, ta: 0, r: { B: 11, K: 4, R: 7, Y: 6, Q: 5, V: 8 }[kind] || 5, weapon,
    hp: { R: 3, Y: 4, V: 8 }[kind] || 1,
    state: Math.random() < (kind === 'K' ? 0.6 : kind === 'N' ? 0.1 : 0.4) ? 'patrol' : 'idle',
    alerted: false, reaction: 0, cd: rand(0.2, 0.5), burst: 0, windup: 0, atkT: 0, swingT: 0, swingDir: 1,
    downT: 0, confT: 0, idleT: rand(1, 3), lookT: 0, path: null, pathT: 0, lastSeen: null, walkT: rand(10),
    sayText: '', sayT: 0, flash: 0, recoil: 0, aimT: 0, suit: s[0], shirt: s[1],
    hair: pick(['#1a1a1a', '#4a2a12', '#e8c547', '#8b1a1a', '#2a2a2a']),
    skin: pick(['#f0c8a0', '#d9a070', '#a86a40', '#f5d0b0']), glasses: Math.random() < 0.55,
    static: kind === 'Y' || kind === 'V' || kind === 'O', flying: kind === 'Q', sweep: Math.random() < 0.5 ? 1 : -1,
  };
  if (e.static) e.state = 'idle';
  if (kind === 'B') initBoss(e, bossType || 'guenther');
  const EX = ENEMY_EXT[kind];
  if (EX && EX.make) extCall(EX.make, e, D);   // neue Gegnerart: eigene Werte
  return e;
}

// ---------------------------------------------------------------------
//  Bewegung
// ---------------------------------------------------------------------
function moveToward(e, tx, ty, step) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  if (d < 0.01) return 0;
  const m = Math.min(step, d);
  return moveEntity(e, dx / d * m, dy / d * m);
}
function followPath(e, step, dt) {
  if (!e.path || !e.path.length) return true;
  let n = e.path[0], dx = n.x - e.x, dy = n.y - e.y, d = Math.hypot(dx, dy);
  if (d < 3) {
    e.path.shift();
    if (!e.path.length) return true;
    n = e.path[0]; dx = n.x - e.x; dy = n.y - e.y; d = Math.hypot(dx, dy);
  }
  e.a = turnTo(e.a, Math.atan2(dy, dx), 10 * dt);
  const m = moveEntity(e, dx / d * Math.min(step, d), dy / d * Math.min(step, d));
  e.walkT += dt;
  if (m < step * 0.2) { e.stuck = (e.stuck || 0) + dt; if (e.stuck > 0.6) { e.stuck = 0; e.path = null; e.pathT = 0; return true; } }
  else e.stuck = 0;
  return false;
}
function patrolTurn(e) {
  const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS);
  const opts = [0, Math.PI / 2, Math.PI, -Math.PI / 2].filter((a) => {
    const nx = tx + Math.round(Math.cos(a)), ny = ty + Math.round(Math.sin(a));
    const c = T_(nx, ny);
    return !G.solid[ny * G.w + nx] && c !== ' ' && c !== 'r' && c !== 'l';
  });
  const fwd = opts.filter((a) => Math.abs(angDiff(a, e.a + Math.PI)) > 0.3);
  return pick(fwd.length ? fwd : (opts.length ? opts : [e.a + Math.PI]));
}
function tryEnemyPickup(e) {
  const k = nearestPickup(e.x, e.y, 9, true);
  if (!k) return;
  e.weapon = k.id;
  G.pickups.splice(G.pickups.indexOf(k), 1);
  e.cd = 0.4;
  say(e, 'HAB WAS!', 1);
}
// Ziel = nächster lebender Spieler (bleibt etwas am alten Ziel "kleben")
function targetOf(e) {
  const ps = G.players;
  if (ps.length === 1) return ps[0];
  let best = null, bd = 1e9;
  for (const q of ps) {
    if (!q.alive) continue;
    const v = dist(e.x, e.y, q.x, q.y) - (e.target === q ? 40 : 0);
    if (v < bd) { bd = v; best = q; }
  }
  return best || ps[0];
}
// Wie lange es dauert, bis ein Gegner dich wirklich bemerkt: nah = schnell, weit weg = langsam
function spotTime(e, pd) {
  return lerp(0.22, 0.95, clamp(pd / 300, 0, 1)) * lerp(1.25, 0.8, dd()) * (hasMask(targetOf(e), 'disco') ? 1.5 : 1) * (save.hard ? 0.75 : 1) * (e.alerted ? 0.6 : 1) * (G.doorGrace > 0 ? 1.9 : 1) * (e.kind === 'K' ? 0.75 : 1);
}
function canSee(e, range, half, p = targetOf(e)) {
  if (!p || !p.alive || G.time < 1.5) return false;
  const pd = dist(e.x, e.y, p.x, p.y);
  if (pd > range) return false;
  if (pd > 26 && Math.abs(angDiff(e.a, Math.atan2(p.y - e.y, p.x - e.x))) > half) return false;
  return los(e.x, e.y, p.x, p.y);
}

// ---------------------------------------------------------------------
//  KI
// ---------------------------------------------------------------------
function updateEnemy(e, dt) {
  if (e.state === 'dead') return;
  e.sayT -= dt; e.flash -= dt; e.swingT -= dt; e.atkT -= dt; e.cd -= dt;
  e.recoil = Math.max(0, e.recoil - dt * 20);
  if (e.fling > 0) { updateFling(e, dt); return; }
  const EX = ENEMY_EXT[e.kind];
  if (EX && EX.update && extCall(EX.update, e, dt)) return;   // true = eigene KI hat alles erledigt
  if (e.kind === 'B') { e.target = targetOf(e); updateBoss(e, dt); return; }
  if (e.kind === 'V') return;
  if (e.kind === 'O') { e.cd -= dt; return; }   // Boss-Requisite
  if (e.kind === 'Y') { updateTurret(e, dt); return; }
  if (e.kind === 'Q') { updateDrone(e, dt); return; }
  if (e.state === 'down') {
    e.downT -= dt;
    if (e.downT <= 0) {
      e.state = 'search'; e.alerted = true; e.lastSeen = { x: G.player.x, y: G.player.y }; e.pathT = 0; e.lookT = 0;
      say(e, pick(L_GETUP));
    }
    return;
  }
  if (e.state === 'confused') { e.confT -= dt; if (e.confT <= 0) { e.state = 'alert'; e.reaction = 0.2; } return; }

  const p = targetOf(e), D = dd();
  e.target = p;
  const pd = dist(e.x, e.y, p.x, p.y), pa = Math.atan2(p.y - e.y, p.x - e.x);
  const range = e.kind === 'N' ? 430 : e.alerted ? 290 + 60 * D : 200 + 70 * D;
  const half = (e.state === 'alert' || e.state === 'search') ? 2.4 : (e.kind === 'K' ? 1.6 : e.kind === 'N' ? 0.7 : 1.15);
  const sees = canSee(e, range, half, p);
  if (!sees && e.state !== 'alert') e.spot = Math.max(0, (e.spot || 0) - dt * 0.7);
  if (sees && e.state !== 'alert') {
    e.spot = (e.spot || 0) + dt / spotTime(e, pd);
    e.a = turnTo(e.a, pa, 2.5 * dt);
  }
  if (sees && (e.state === 'alert' || e.spot >= 1)) {
    e.lastSeen = { x: p.x, y: p.y };
    if (e.state !== 'alert') {
      e.state = 'alert'; e.spot = 1;
      e.reaction = rand(0.08, 0.18) + 0.1 * (1 - D);
      if (!e.alerted || Math.random() < 0.35) say(e, e.kind === 'K' ? pick(L_ALERT_DOG) : e.kind === 'R' ? pick(['FRISCHFLEISCH!', 'KOMM HER, KLEINER!', 'HEUTE KEIN EINLASS!']) : pick(L_ALERT), 1.3);
      e.alerted = true;
      Sound.play(e.kind === 'K' ? 'bark' : 'alert');
    }
  }
  const W_ = e.weapon ? WEAPONS[e.weapon] : null;
  const ranged = W_ && W_.ranged;
  const spd = (e.kind === 'K' ? 140 + 20 * D : e.kind === 'R' ? 62 + 12 * D : 76 + 16 * D) * (e.kind === 'F' ? 0.75 : e.kind === 'J' ? 1.4 : e.kind === 'W' ? 1.2 : 1) * (save.hard ? 1.12 : 1);
  const reach = e.kind === 'K' ? 15 : e.kind === 'R' ? 21 : 19;

  switch (e.state) {
    case 'idle':
      e.idleT -= dt;
      if (e.idleT <= 0) { e.idleT = rand(1.5, 4); e.ta = e.a + rand(-1.4, 1.4); }
      e.a = turnTo(e.a, e.ta, 2 * dt);
      break;
    case 'patrol': {
      const want = (e.kind === 'K' ? 50 : 36) * dt;
      const m = moveEntity(e, Math.cos(e.a) * want, Math.sin(e.a) * want);
      e.walkT += dt; e.idleT -= dt;
      const ahead = T_(Math.floor((e.x + Math.cos(e.a) * 10) / TS), Math.floor((e.y + Math.sin(e.a) * 10) / TS));
      if (m < want * 0.5 || e.idleT <= 0 || ahead === 'r' || ahead === 'l') { e.idleT = rand(2, 5); e.a = patrolTurn(e); }
      break;
    }
    case 'alert':
      if (!sees) { e.state = 'search'; e.pathT = 0; e.lookT = 0; e.aimT = 0; break; }
      e.a = turnTo(e.a, pa, (e.kind === 'K' ? 12 : e.kind === 'N' ? 3 : 7) * dt);
      if (e.kind === 'N' && ranged) {
        e.reaction -= dt;
        if (e.reaction <= 0) {
          e.aimT += dt;
          if (e.aimT > 0.95 - 0.25 * D) {
            const a = Math.atan2(p.y - e.y, p.x - e.x);
            spawnBullet(e.x + Math.cos(a) * 9, e.y + Math.sin(a) * 9, a, W_.speed, 'enemy', e, 'bullet', 'sniper');
            muzzleFlash(e.x + Math.cos(a) * 9, e.y + Math.sin(a) * 9);
            Sound.play('shotgun', 0.8); e.aimT = -0.7; e.recoil = 3;
          }
        }
      } else if (ranged) {
        e.reaction -= dt;
        if (e.reaction <= 0 && Math.abs(angDiff(e.a, pa)) < 0.3) enemyFire(e, W_);
        if (pd > 150) { moveToward(e, p.x, p.y, spd * 0.55 * dt); e.walkT += dt; }
      } else {
        if (!e.weapon && e.kind !== 'K' && e.kind !== 'R' && e.kind !== 'W') {
          const k = nearestPickup(e.x, e.y, 90, true);
          if (k && dist(e.x, e.y, k.x, k.y) < pd * 0.7) { moveToward(e, k.x, k.y, spd * dt); e.walkT += dt; tryEnemyPickup(e); break; }
        }
        if (pd > 12 && e.windup <= 0) { moveToward(e, p.x, p.y, spd * dt); e.walkT += dt; }
        if (e.kind === 'W') { if (pd < 30 && !e.fuse) { e.fuse = 0.75; say(e, 'TIKITIKI!!!', 1); Sound.play('alert'); } }
        else if (pd < reach + 4 && e.windup <= 0 && e.atkT <= 0) e.windup = e.kind === 'K' ? 0.14 : e.kind === 'R' ? 0.32 : 0.22 - 0.05 * D;
      }
      break;
    case 'search': {
      e.pathT -= dt;
      let target = e.lastSeen;
      if (!e.weapon && e.kind !== 'K' && e.kind !== 'R' && e.kind !== 'W') { const k = nearestPickup(e.x, e.y, 260, true); if (k) target = { x: k.x, y: k.y }; }
      if (e.pathT <= 0 && target) { e.pathT = 0.6; e.path = findPath(e.x, e.y, target.x, target.y); }
      const done = followPath(e, spd * 0.8 * dt, dt);
      if (!e.weapon && e.kind !== 'R' && e.kind !== 'W') tryEnemyPickup(e);
      if (done || !target) {
        e.lookT += dt; e.a += dt * 2.6;
        if (e.lookT > 2.8) { e.state = 'patrol'; e.lookT = 0; e.idleT = rand(2, 4); }
      }
      break;
    }
  }

  if (e.windup > 0) {
    e.windup -= dt;
    if (e.windup <= 0) {
      e.swingT = 0.18; e.swingDir *= -1; e.atkT = e.kind === 'R' ? 0.9 : 0.65;
      Sound.play(e.kind === 'K' ? 'bark' : 'swoosh');
      const a2 = Math.atan2(p.y - e.y, p.x - e.x);
      if (p.alive && dist(e.x, e.y, p.x, p.y) < reach + 4 + p.r && Math.abs(angDiff(e.a, a2)) < 1.4) {
        killPlayer(e, a2, e.kind === 'K' ? 'dog' : e.kind === 'R' && !e.weapon ? 'heavy' : (e.weapon || 'fists'), p);
      }
    }
  }
  if (e.fuse > 0) { e.fuse -= dt; if (e.fuse <= 0) { e.boomed = true; explode(e.x, e.y, 54); if (e.state !== 'dead') killEnemy(e, 'juice', 0); return; } }
  beltPush(e, dt);
}
// VEX-WAVE / Schaufel: Gegner fliegt weg - knallt er gegen die Wand, ist er erledigt
function flingEnemy(e, ang, power) {
  if (e.state === 'dead') return;
  if (e.kind === 'B') { bossDamage(e, 2, ang, 'wave'); moveEntity(e, Math.cos(ang) * 10, Math.sin(ang) * 10); return; }
  if (e.static) { hurtEnemy(e, 1, 'wave', ang); return; }
  if (e.kind === 'K' || e.kind === 'Q') { killEnemy(e, 'wave', ang); return; }
  e.fling = 0.5; e.fx = Math.cos(ang) * power; e.fy = Math.sin(ang) * power; e.windup = 0; e.aimT = 0;
  if (e.kind !== 'R') {
    if (e.weapon) { spawnPickup(e.x, e.y, e.weapon, dropAmmo(e.weapon), ang + rand(-0.8, 0.8), rand(60, 110)); e.weapon = null; }
    e.state = 'down'; e.downT = 2.4; e.downAng = ang;
  }
  say(e, pick(['WAAAH!', 'HUIII!', 'NEIN NEIN NEIN!', 'ICH FLIEEEG!']), 1);
}
function updateFling(e, dt) {
  e.fling -= dt;
  const vx = e.fx, vy = e.fy, sp = Math.hypot(vx, vy);
  const m = moveEntity(e, vx * dt, vy * dt);
  e.fx *= Math.exp(-dt * 3); e.fy *= Math.exp(-dt * 3);
  e.walkT += dt * 3;
  if (sp > 160 && m < sp * dt * 0.45) {
    floatText(e.x, e.y - 14, 'WAND-KNALL!', '#ffd84a');
    if (e.kind === 'R') { e.fling = 0; hurtEnemy(e, 2, 'wave', Math.atan2(vy, vx)); } else killEnemy(e, 'wave', Math.atan2(vy, vx));
    shake(4); Sound.play('slam');
  }
}

function enemyFire(e, w) {
  if (e.cd > 0) return;
  const D = dd(), mul = lerp(1.15, 0.72, D);
  if (e.weapon === 'uzi' || e.weapon === 'rifle') { e.burst++; if (e.burst >= (e.weapon === 'rifle' ? 4 : 6)) { e.burst = 0; e.cd = 0.75 * mul; } else e.cd = w.eRate; }
  else e.cd = w.eRate * rand(0.9, 1.2) * mul;
  const mx = e.x + Math.cos(e.a) * 9, my = e.y + Math.sin(e.a) * 9;
  const sp = (w.speed ? Math.min(w.speed, 520) : 300) + 90 * D;
  const spread = w.eSpread * lerp(1.15, 0.75, D);
  for (let i = 0; i < w.pellets; i++) spawnBullet(mx, my, e.a + rand(-spread, spread), w.pellets > 1 ? rand(sp * 0.85, sp) : sp, 'enemy', e);
  muzzleFlash(mx, my); casing(e.x, e.y, e.a);
  e.recoil = 2;
  const lp = e.target || G.player;
  Sound.play(w.sfx, clamp(1 - dist(e.x, e.y, lp.x, lp.y) / 400, 0.25, 1) * 0.8);
}

// Geschützturm: schwenkt hin und her, feuert Salven
function updateTurret(e, dt) {
  const p = targetOf(e), D = dd();
  e.target = p;
  const pa = Math.atan2(p.y - e.y, p.x - e.x);
  let sees = canSee(e, 270, e.state === 'alert' ? 1.4 : 0.8, p);
  if (sees && e.state !== 'alert') { e.spot = (e.spot || 0) + dt / (spotTime(e, dist(e.x, e.y, p.x, p.y)) * 1.2); if (e.spot < 1) sees = false; }
  else if (!sees) e.spot = Math.max(0, (e.spot || 0) - dt);
  if (sees) {
    if (e.state !== 'alert') { e.state = 'alert'; e.reaction = 0.3 - 0.15 * D; Sound.play('alert'); say(e, 'ZIEL ERFASST', 1); }
    e.a = turnTo(e.a, pa, (1.6 + D) * dt);
    e.reaction -= dt;
    if (e.reaction <= 0 && e.cd <= 0 && Math.abs(angDiff(e.a, pa)) < 0.2) {
      e.burst++;
      e.cd = e.burst >= 3 ? (1.2 - 0.4 * D) : 0.11;
      if (e.burst >= 3) e.burst = 0;
      const mx = e.x + Math.cos(e.a) * 9, my = e.y + Math.sin(e.a) * 9;
      spawnBullet(mx, my, e.a + rand(-0.06, 0.06), 330 + 60 * D, 'enemy', e, 'bullet', 'turret');
      muzzleFlash(mx, my); Sound.play('uzi', 0.6); e.recoil = 2;
    }
  } else {
    e.state = 'idle';
    e.a += e.sweep * 0.9 * dt;
    e.idleT -= dt; if (e.idleT <= 0) { e.idleT = rand(2, 3.5); e.sweep = -e.sweep; }
  }
}

// Drohne: fliegt über Möbel, hält Abstand und kreist
function updateDrone(e, dt) {
  const p = targetOf(e), D = dd();
  e.target = p;
  e.walkT += dt;
  const pd = dist(e.x, e.y, p.x, p.y), pa = Math.atan2(p.y - e.y, p.x - e.x);
  let sees = canSee(e, 290, TAU, p);
  if (sees && e.state !== 'alert') { e.spot = (e.spot || 0) + dt / spotTime(e, pd); if (e.spot < 1) sees = false; }
  const spd = 72 + 30 * D;
  if (sees) {
    if (e.state !== 'alert') { e.state = 'alert'; e.reaction = 0.4 - 0.15 * D; Sound.play('zap'); }
    e.lastSeen = { x: p.x, y: p.y };
    e.a = turnTo(e.a, pa, 6 * dt);
    e.idleT -= dt; if (e.idleT <= 0) { e.idleT = rand(1, 2); e.sweep = -e.sweep; }
    let mx = Math.cos(pa + Math.PI / 2) * e.sweep * 0.8, my = Math.sin(pa + Math.PI / 2) * e.sweep * 0.8;
    if (pd > 140) { mx += Math.cos(pa); my += Math.sin(pa); } else if (pd < 85) { mx -= Math.cos(pa); my -= Math.sin(pa); }
    const l = Math.hypot(mx, my) || 1;
    moveEntity(e, mx / l * spd * dt, my / l * spd * dt);
    e.reaction -= dt;
    if (e.reaction <= 0 && e.cd <= 0) {
      e.cd = 1.1 * lerp(1.1, 0.7, D);
      spawnBullet(e.x, e.y, pa + rand(-0.05, 0.05), 250 + 70 * D, 'enemy', e, 'laser', 'drone');
      Sound.play('zap');
    }
  } else if (e.lastSeen) {
    e.state = 'search';
    e.pathT -= dt;
    if (e.pathT <= 0) { e.pathT = 0.7; e.path = findPath(e.x, e.y, e.lastSeen.x, e.lastSeen.y); }
    if (followPath(e, spd * dt, dt)) { e.lastSeen = null; e.state = 'idle'; }
  } else {
    e.a += dt * 1.2;
  }
}
