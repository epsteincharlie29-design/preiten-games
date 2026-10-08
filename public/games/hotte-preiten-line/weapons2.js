'use strict';
// =====================================================================
//  LIL PREITNER - Spezialwaffen: VEX-WAVE (Schockwelle) und Bumerang
// =====================================================================

// ---------- VEX-WAVE ----------
function fireWave(p, max = 125) {
  (G.waves || (G.waves = [])).push({ x: p.x, y: p.y, r: 4, max, owner: p, hit: [] });
  Sound.play('wave'); shake(8); G.flash = 0.08;
  floatText(p.x, p.y - 22, 'VEX-WAVE!', 'rainbow');
  makeNoise(p.x, p.y, 260);
}
function updateWaves(dt) {
  if (!G.waves || !G.waves.length) return;
  for (const w of G.waves) {
    const r0 = w.r;
    w.r += 380 * dt;
    for (const e of G.enemies) {
      if (e.state === 'dead' || w.hit.includes(e)) continue;
      const d = dist(w.x, w.y, e.x, e.y);
      if (d <= w.r + e.r && d >= r0 - e.r - 8 && los(w.x, w.y, e.x, e.y)) {
        w.hit.push(e);
        flingEnemy(e, Math.atan2(e.y - w.y, e.x - w.x), 140 + 260 * (1 - clamp(d / (w.max + 20), 0, 1)));
      }
    }
    for (const b of G.bullets) {
      if (b.owner !== 'enemy' || b.dead) continue;
      const d = dist(w.x, w.y, b.x, b.y);
      if (d < w.r && d > r0 - 12) { b.dead = true; sparks(b.x, b.y, 3, '#c89bff'); }
    }
    for (let k = 0; k < 20; k++) {
      const a = k * TAU / 20, tx = Math.floor((w.x + Math.cos(a) * w.r) / TS), ty = Math.floor((w.y + Math.sin(a) * w.r) / TS);
      if (T_(tx, ty) === 'G') breakGlass(tx, ty);
    }
    for (const k of G.pickups) {
      if (k.flying) continue;
      const d = dist(w.x, w.y, k.x, k.y);
      if (d < w.r && d > r0 - 10 && d > 1) { k.vx = (k.x - w.x) / d * 160; k.vy = (k.y - w.y) / d * 160; k.flying = true; k.spin = 12; }
    }
    if (w.r >= w.max) w.dead = true;
  }
  G.waves = G.waves.filter((w) => !w.dead);
}
function drawWaves(g) {
  if (!G.waves) return;
  for (const w of G.waves) {
    const k = w.r / w.max;
    g.strokeStyle = `rgba(200,150,255,${0.9 * (1 - k)})`; g.lineWidth = 5 * (1 - k) + 1;
    g.beginPath(); g.arc(w.x, w.y, w.r, 0, TAU); g.stroke();
    g.strokeStyle = `rgba(63,208,255,${0.7 * (1 - k)})`; g.lineWidth = 1;
    g.beginPath(); g.arc(w.x, w.y, Math.max(1, w.r - 6), 0, TAU); g.stroke();
  }
  g.lineWidth = 1;
}

// ---------- Bumerang ----------
function throwBoomerang(p) {
  p.weapon = null;
  (G.booms || (G.booms = [])).push({ x: p.x + Math.cos(p.a) * 8, y: p.y + Math.sin(p.a) * 8, a: p.a, t: 0, owner: p, back: false, hit: [], rot: 0 });
  Sound.play('throwIt');
}
function dropBoom(b) { b.dead = true; spawnPickup(b.x, b.y, 'boomerang', 1, rand(TAU), 20); }
function updateBooms(dt) {
  if (!G.booms || !G.booms.length) return;
  for (const b of G.booms) {
    b.t += dt; b.rot += dt * 25;
    if (!b.back && b.t > 0.4) b.back = true;
    const o = b.owner;
    let vx, vy;
    if (!b.back) { vx = Math.cos(b.a) * 330; vy = Math.sin(b.a) * 330; }
    else {
      if (!o.alive || b.t > 3) { dropBoom(b); continue; }
      const d = Math.max(1, dist(b.x, b.y, o.x, o.y));
      if (d < 10) {
        b.dead = true; Sound.play('pickup');
        if (!o.weapon) o.weapon = { id: 'boomerang', ammo: 1, boosted: true }; else spawnPickup(o.x, o.y, 'boomerang', 1, rand(TAU), 30);
        continue;
      }
      vx = (o.x - b.x) / d * 360; vy = (o.y - b.y) / d * 360;
    }
    const nx = b.x + vx * dt, ny = b.y + vy * dt;
    if (pickupBlocked(nx, ny, { thrown: true })) {
      if (!b.back) { b.back = true; sparks(b.x, b.y, 4, '#fff'); Sound.play('punch'); }
      else { dropBoom(b); continue; }
    } else { b.x = nx; b.y = ny; }
    if (Math.floor(b.t * 12) !== Math.floor((b.t - dt) * 12)) Sound.play('swoosh');
    for (const e of G.enemies) {
      if (e.state === 'dead' || b.hit.includes(e) || dist(b.x, b.y, e.x, e.y) > e.r + 6) continue;
      b.hit.push(e);
      const ang = Math.atan2(vy, vx);
      if (e.kind === 'B') bossDamage(e, 2, ang, 'thrown');
      else if (e.static || e.kind === 'R') hurtEnemy(e, 2, 'thrown', ang);
      else killEnemy(e, 'thrown', ang);
    }
  }
  G.booms = G.booms.filter((b) => !b.dead);
}
function drawBooms(g) {
  if (!G.booms) return;
  for (const b of G.booms) {
    g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(b.rot);
    drawWeaponShape(g, 'boomerang');
    g.restore();
  }
}
