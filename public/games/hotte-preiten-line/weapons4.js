'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Staffel 2: neue Waffen
//  '6' KETTENSÄGE  '7' TENNISSCHLÄGER  '8' EISSTRAHL  '9' PIZZA-SCHEIBE
//  '0' LAUBBLÄSER  '2' KLEBE-SAFTGRANATE  '3' GOLDENE KLOBÜRSTE
//  '[' STEIRER KERNÖL  ']' RUSSIAN HACKER BOI LAPTOP (Addendum)
//  Host-autoritär: Logik in onFire/onHit/BULLET_KINDS + Etagen-Ticker 'w4_tick';
//  was Gäste sehen, liegt in G.hazards (einfache Daten) oder kommt über netFx.
// =====================================================================

// Treffer-Definitionen für meleeHit (keine echten Waffen)
const W4_SAW_HIT = { name: 'KETTENSÄGE', lethal: true, rate: 0.06, reach: 21, arc: 0.9, hitSfx: 'w4_saw' };
const W4_RACKET_HIT = { name: 'TENNISSCHLÄGER', lethal: false, rate: 0.3, reach: 24, arc: 1.3, hitSfx: 'w4_pock', fling: 175 };

Object.assign(WEAPONS, {
  w4_saw: { name: 'KETTENSÄGE', ranged: true, auto: true, ammo: 100, rate: 0.06, spread: 0, pellets: 1, noise: 280, shake: 1, sfx: 'w4_saw',
    noEnemy: true, noCasing: true, noCity: true, throwLethal: true, onFire: (p, w) => w4FireSaw(p, w) },
  w4_racket: { name: 'TENNISSCHLÄGER', ranged: true, ammo: 40, rate: 0.28, spread: 0, pellets: 1, noise: 90, shake: 1, sfx: 'swoosh',
    noEnemy: true, noCasing: true, noCity: true, onFire: (p, w) => w4FireRacket(p, w) },
  w4_ice: { name: 'EISSTRAHL', ranged: true, auto: true, ammo: 60, rate: 0.07, spread: 0.12, pellets: 1, noise: 90, shake: 0.4, sfx: 'w4_ice', speed: 270, kind: 'w4_ice',
    noEnemy: true, noCasing: true, noCity: true, onFire: (p, w) => w4FireIce(p, w) },
  w4_pizza: { name: 'PIZZA-SCHEIBE', ranged: true, ammo: 6, rate: 0.35, spread: 0, pellets: 1, noise: 40, shake: 1, sfx: 'throwIt', speed: 330, kind: 'w4_pizza',
    noEnemy: true, noCasing: true, noCity: true, onFire: (p, w) => w4FirePizza(p, w) },
  w4_blower: { name: 'LAUBBLÄSER', ranged: true, auto: true, ammo: 80, rate: 0.05, spread: 0, pellets: 1, noise: 220, shake: 0.5, sfx: 'w4_blow',
    noEnemy: true, noCasing: true, noCity: true, onFire: (p, w) => w4FireBlower(p, w) },
  w4_sticky: { name: 'KLEBE-SAFTGRANATE', ranged: true, ammo: 3, rate: 0.6, spread: 0.02, pellets: 1, noise: 60, shake: 1, sfx: 'throwIt', speed: 250, kind: 'w4_sticky',
    noEnemy: true, noCasing: true, noCity: true, onFire: (p, w) => w4FireSticky(p, w) },
  w4_brush: { name: 'GOLDENE KLOBÜRSTE', lethal: true, rate: 0.3, reach: 24, arc: 1.4, hitSfx: 'w4_bling', throwLethal: true,
    onHit: (e, w, ang, p) => w4BrushHit(e, ang) },
});
Object.assign(WEAPON_PRICES, { w4_racket: 2400, w4_pizza: 2800, w4_blower: 3600, w4_ice: 5500, w4_sticky: 6500, w4_saw: 9500, w4_brush: 30000 });
MOD_GUNS.push('w4_ice', 'w4_pizza', 'w4_blower', 'w4_sticky', 'w4_saw');
Object.assign(ITEMS, { 6: 'w4_saw', 7: 'w4_racket', 8: 'w4_ice', 9: 'w4_pizza', 0: 'w4_blower', 2: 'w4_sticky', 3: 'w4_brush' });
Object.assign(CAUSE, { w4_saw: 'KETTENSÄGE', w4_racket: 'TENNISSCHLÄGER', w4_ice: 'EISSTRAHL', w4_pizza: 'PIZZA-SCHEIBE', w4_blower: 'LAUBBLÄSER',
  w4_sticky: 'KLEBE-SAFTGRANATE', w4_brush: 'GOLDENE KLOBÜRSTE' });
// Zufalls-Etagen: nur Staffel 2 (S1 bleibt bit-genau). Klobürste gibt es nur als seltene Beute / im Kiosk / in Handkarten.
GEN_ITEMS.push(
  { ch: '7', minDiff: 10.01, melee: true },
  { ch: '8', minDiff: 10.01 },
  { ch: '9', minDiff: 10.01 },
  { ch: '0', minDiff: 10.2 },
  { ch: '2', minDiff: 10.4 },
  { ch: '6', minDiff: 10.6 },
);

// ---------------------------------------------------------------------
//  Sounds
// ---------------------------------------------------------------------
Sound.addSfx('w4_saw', () => { const { tone, noise, now } = Sound.synth, t = now();
  tone({ type: 'sawtooth', f: 95 + Math.random() * 20, f2: 120, dur: 0.12, vol: 0.13, lp: 1600, t }); noise({ dur: 0.1, ft: 'bandpass', f: 2600, vol: 0.06, t }); });
Sound.addSfx('w4_pock', () => { const { tone, noise, now } = Sound.synth, t = now();
  tone({ type: 'sine', f: 950, f2: 520, dur: 0.07, vol: 0.25, t }); noise({ dur: 0.03, ft: 'highpass', f: 3000, vol: 0.12, t }); });
Sound.addSfx('w4_ice', () => { const { noise, now } = Sound.synth; noise({ dur: 0.09, ft: 'highpass', f: 4500, vol: 0.07, t: now() }); });
Sound.addSfx('w4_freeze', () => { const { tone, noise, now } = Sound.synth, t = now();
  noise({ dur: 0.3, ft: 'bandpass', f: 5000, f2: 2000, vol: 0.15, t }); tone({ type: 'triangle', f: 1800, f2: 2600, dur: 0.15, vol: 0.06, t }); });
Sound.addSfx('w4_blow', () => { const { noise, now } = Sound.synth; noise({ dur: 0.1, ft: 'lowpass', f: 900, vol: 0.12, t: now() }); });
Sound.addSfx('w4_stick', () => { const { tone, noise, now } = Sound.synth, t = now();
  noise({ dur: 0.12, ft: 'lowpass', f: 700, vol: 0.2, t }); tone({ type: 'sine', f: 180, f2: 320, dur: 0.1, vol: 0.12, t }); });
Sound.addSfx('w4_beep', (hi) => { const { tone, now } = Sound.synth; tone({ type: 'square', f: hi ? 1700 : 1200, dur: 0.05, vol: 0.07, t: now() }); });
Sound.addSfx('w4_boing', () => { const { tone, now } = Sound.synth; tone({ type: 'triangle', f: 260, f2: 620, dur: 0.12, vol: 0.12, t: now() }); });
Sound.addSfx('w4_bling', () => { const { tone, now } = Sound.synth, t = now();
  tone({ type: 'triangle', f: 1568, dur: 0.12, vol: 0.12, t }); tone({ type: 'triangle', f: 2093, dur: 0.2, vol: 0.1, t: t + 0.06 }); });

// ---------------------------------------------------------------------
//  Helfer: Ticker, Netz-Effekte
// ---------------------------------------------------------------------
function w4TickOn() { if (G && G.mods && !G.mods.includes('w4_tick')) G.mods.push('w4_tick'); }
function w4Fx(name, ...a) {
  if (NET.mode === 'host' && NET.connected && NET.inLevel && !NET.fxDepth) netFx(name, a);
  NET.fxDepth++;
  try { window[name](...a); } finally { NET.fxDepth--; }
}
function w4InCone(p, e, reach, arc) {
  const d = dist(p.x, p.y, e.x, e.y), ang = Math.atan2(e.y - p.y, e.x - p.x);
  if (d > reach || (d > 8 && Math.abs(angDiff(p.a, ang)) > arc) || !los(p.x, p.y, e.x, e.y)) return null;
  return ang;
}
function w4Front(p, r, fn) {   // Glas/Tresor vor der Waffe
  const tx = Math.floor((p.x + Math.cos(p.a) * r) / TS), ty = Math.floor((p.y + Math.sin(p.a) * r) / TS), c = T_(tx, ty);
  if (c === 'G') breakGlass(tx, ty);
  else if (c === 'Z' && fn) fn(tx, ty);
}
function w4Noise(p, r) { makeNoise(p.x, p.y, r * (perkP(p, 'silencer') ? 0.45 : 1) * (wmod(p.weapon && p.weapon.id, 'silent') ? 0.35 : 1) * (hasMask(p, 'robo') ? 0.5 : 1)); }

// --- Effekte (Host + Gast über netReplay) ---
function w4LeafFx(x, y, a) {
  for (let i = 0; i < 3; i++) {
    const b = a + rand(-0.45, 0.45), sp = rand(120, 230);
    G.parts.push({ x: x + rand(-2, 2), y: y + rand(-2, 2), vx: Math.cos(b) * sp, vy: Math.sin(b) * sp, life: rand(0.25, 0.5), col: pick(['#5a8a2a', '#8ab03a', '#c87a2a', '#a05a1a', '#d8c8a8']), s: 2, kind: 'w4', fric: 3 });
  }
}
function w4SwingFx(x, y, a) {
  for (let i = 0; i < 7; i++) { const b = a - 1.1 + i * 0.37; G.parts.push({ x: x + Math.cos(b) * 15, y: y + Math.sin(b) * 15, vx: Math.cos(b) * 20, vy: Math.sin(b) * 20, life: 0.12 + i * 0.012, col: i % 2 ? '#ffffff' : '#e8ffd0', s: 2, kind: 'w4', fric: 6 }); }
}
function w4SawFx(x, y, a) {
  for (let i = 0; i < 3; i++) { const b = a + rand(-0.6, 0.6), sp = rand(60, 150); G.parts.push({ x, y, vx: Math.cos(b) * sp, vy: Math.sin(b) * sp, life: rand(0.1, 0.25), col: pick(['#ffe66d', '#ffffff', '#ff9a1a']), s: 1, kind: 'w4', fric: 5 }); }
}
function w4FrostFx(x, y) {
  for (let i = 0; i < 2; i++) G.parts.push({ x: x + rand(-2, 2), y: y + rand(-2, 2), vx: rand(-20, 20), vy: rand(-20, 20), life: rand(0.2, 0.4), col: pick(['#bfefff', '#ffffff', '#7fd8ff']), s: 1, kind: 'w4', fric: 4 });
}

// ---------------------------------------------------------------------
//  '6' KETTENSÄGE: gedrückt halten = Dauer-Nahkampf (Sprit = Munition)
// ---------------------------------------------------------------------
function w4FireSaw(p, w) {
  w4TickOn();
  if ((p.w4SndT || 0) <= G.time) { p.w4SndT = G.time + 0.11; Sound.play('w4_saw'); }
  p.recoil = 1 + Math.random(); shake(w.shake);
  let hit = 0, dmg = 0;
  for (const e of G.enemies) {
    if (e.state === 'dead') continue;
    const ang = w4InCone(p, e, W4_SAW_HIT.reach + e.r, W4_SAW_HIT.arc);
    if (ang === null) continue;
    hit++;
    if ((e.w4SawT || 0) > 0) continue;
    e.w4SawT = 0.28; dmg++;
    if (e.kind === 'B') bossDamage(e, 1, ang, 'melee');
    else { meleeHit(e, W4_SAW_HIT, ang, p); if (e.state === 'dead' && Math.random() < 0.5) floatText(e.x, e.y - 24, pick(['BRRRRM!', 'ZERSÄGT!', 'HEIMWERKER!']), 'rainbow'); }
  }
  const fx = p.x + Math.cos(p.a) * 16, fy = p.y + Math.sin(p.a) * 16;
  if (hit) { bloodBurst(fx, fy, p.a, 3, 90); if (dmg) hitstop(0.012); } else if (Math.random() < 0.4) w4Fx('w4SawFx', fx, fy, p.a);
  if ((p.w4SafeT || 0) <= G.time) w4Front(p, 14, (tx, ty) => { p.w4SafeT = G.time + 0.35; damageSafe(tx, ty, 1); });
  w4Noise(p, w.noise);
}

// ---------------------------------------------------------------------
//  '7' TENNISSCHLÄGER: Schlag schickt Kugeln (und Zitronen) zurück, wirft Gegner um
// ---------------------------------------------------------------------
function w4RacketReflect(p) {
  const cx = p.x + Math.cos(p.a) * 10, cy = p.y + Math.sin(p.a) * 10;
  let n = 0;
  for (const b of G.bullets) {
    if (b.dead || b.w4Ret || (b.owner === 'player' && !b.s2eLob)) continue;
    if ((b.x - cx) ** 2 + (b.y - cy) ** 2 > 24 * 24) continue;
    const a = p.a + rand(-0.04, 0.04);
    if (b.s2eLob) { b.vx = Math.cos(a) * 210; b.vy = Math.sin(a) * 210; b.life = 0.75; }
    else {
      const sp = Math.max(330, Math.hypot(b.vx, b.vy) * 1.3);
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.owner = 'player'; b.src = p; b.hits = null; b.homing = 0;
      b.life = Math.max(b.life, 0.9);
    }
    b.sx = b.x; b.sy = b.y; b.w4Ret = true;
    n++;
  }
  if (n) {
    Sound.play('w4_pock'); hitstop(0.05); shake(3); run.score += 100 * n;
    floatText(p.x, p.y - 20, pick(['RETOURE!', 'ASS!', 'SPIEL, SATZ, SIEG!', 'VOLLEY!', 'NETZROLLER!']), 'rainbow');
  }
  return n;
}
function w4FireRacket(p, w) {
  w4TickOn();
  p.w4RacketT = 0.15;
  Sound.play('swoosh');
  w4Fx('w4SwingFx', p.x, p.y, p.a);
  w4RacketReflect(p);
  for (const e of G.enemies) {
    if (e.state === 'dead') continue;
    const ang = w4InCone(p, e, W4_RACKET_HIT.reach + e.r, W4_RACKET_HIT.arc);
    if (ang === null) continue;
    Sound.play('w4_pock');
    meleeHit(e, W4_RACKET_HIT, ang, p);
    if (e.state !== 'dead') floatText(e.x, e.y - 22, pick(['AUFSCHLAG!', 'FÜNFZEHN-NULL!', 'AUS!']), '#e8ffd0', true);
  }
  w4Front(p, 13, null);
  w4Noise(p, w.noise);
}

// ---------------------------------------------------------------------
//  '8' EISSTRAHL: friert ein; wer länger eingefroren ist, zersplittert beim nächsten Treffer
// ---------------------------------------------------------------------
function w4FireIce(p, w) {
  w4TickOn();
  const mx = p.x + Math.cos(p.a) * 10, my = p.y + Math.sin(p.a) * 10;
  const ox = los(p.x, p.y, mx, my) ? mx : p.x, oy = los(p.x, p.y, mx, my) ? my : p.y;
  spawnBullet(ox, oy, p.a + rand(-w.spread, w.spread) * (wmod('w4_ice', 'laser') ? 0.5 : 1), w.speed * rand(0.85, 1.1), 'player', p, 'w4_ice');
  G.bullets[G.bullets.length - 1].life = rand(0.32, 0.42);
  if ((p.w4SndT || 0) <= G.time) { p.w4SndT = G.time + 0.09; Sound.play('w4_ice'); }
  w4Noise(p, w.noise);
}
function w4Shatter(e, ang) {
  e.w4IceT = 0;
  sparks(e.x, e.y, 16, '#bfefff'); sparks(e.x, e.y, 8, '#ffffff');
  Sound.play('glass');
  floatText(e.x, e.y - 24, pick(['ZERSPLITTERT!', 'EISWÜRFEL!', 'COOL BLEIBEN!', 'SCHOCKGEFROSTET!']), 'rainbow');
  killEnemy(e, 'shot', ang);
}
function w4Freeze(e, ang) {
  if (e.state === 'dead') return;
  if (e.kind === 'O' || e.kind === 'B' || e.static) {
    if ((e.w4SawT || 0) > 0) return;
    e.w4SawT = 0.35;
    if (e.kind === 'B') bossDamage(e, 0.5, ang, 'shot'); else hurtEnemy(e, 1, 'shot', ang);
    return;
  }
  if (e.kind === 'Q' || e.state === 'down') { w4Shatter(e, ang); return; }
  if (e.w4IceT > 0 && e.state === 'confused') {
    if (e.w4IceAge > 0.75) w4Shatter(e, ang);
    return;
  }
  e.state = 'confused'; e.confT = 3.2; e.w4IceT = 3.2; e.w4IceAge = 0;
  e.windup = 0; e.aimT = 0; e.path = null; e.fling = 0; e.burst = 0;
  say(e, pick(['BRRR!', 'KALT KALT KALT!', 'MEINE FÜSSE!']), 1);
  floatText(e.x, e.y - 14, 'EINGEFROREN!', '#bfefff', true);
  Sound.play('w4_freeze');
  w4TickOn();
}
BULLET_KINDS.w4_ice = { noCasing: true, life: 0.4, hit(b, e, ang) { w4Freeze(e, ang); return true; }, impact(b, x, y) { if (Math.random() < 0.3) w4FrostFx(x, y); } };
BULLET_DRAW.w4_ice = (g, b) => {
  const k = clamp(b.life / 0.4, 0, 1), x = Math.round(b.x), y = Math.round(b.y);
  g.fillStyle = `rgba(190,240,255,${0.35 + 0.5 * k})`; g.fillRect(x - 2, y - 2, 4, 4);
  g.fillStyle = '#ffffff'; g.fillRect(x - 1 + (Math.floor(T * 30 + b.sx) % 2), y - 1, 1, 1);
  return true;
};

// ---------------------------------------------------------------------
//  '9' PIZZA-SCHEIBE: Diskus, durchschlägt Gegner, prallt bis zu 4x von Wänden ab
// ---------------------------------------------------------------------
function w4FirePizza(p, w) {
  const mx = p.x + Math.cos(p.a) * 8, my = p.y + Math.sin(p.a) * 8, ok = los(p.x, p.y, mx, my);
  spawnBullet(ok ? mx : p.x, ok ? my : p.y, p.a, w.speed, 'player', p, 'w4_pizza');
  const b = G.bullets[G.bullets.length - 1];
  b.pierce = true; b.life = 1.7; b.w4B = 0;
  Sound.play('throwIt'); shake(w.shake);
  w4Noise(p, w.noise);
}
function w4Blocks(x, y) {
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS), c = T_(tx, ty);
  return blocksBulletC(c) || (c === 'D' && G.doors[ty * G.w + tx] && !G.doors[ty * G.w + tx].open);
}
function w4PizzaImpact(b, x, y) {
  if (b.life <= 0 || (b.w4B || 0) >= 4) { sparks(x, y, 6, '#ffd23f'); sparks(x, y, 3, '#c41f2a'); return; }
  const sx = Math.sign(b.vx) * 4, sy = Math.sign(b.vy) * 4;
  let vx = b.vx, vy = b.vy;
  const hx = w4Blocks(x + sx, y), hy = w4Blocks(x, y + sy);
  if (hx) vx = -vx;
  if (hy) vy = -vy;
  if (!hx && !hy) { vx = -vx; vy = -vy; }
  spawnBullet(x, y, Math.atan2(vy, vx), Math.hypot(vx, vy) * 0.93, 'player', b.src, 'w4_pizza');
  const nb = G.bullets[G.bullets.length - 1];
  nb.pierce = true; nb.life = b.life; nb.w4B = (b.w4B || 0) + 1; nb.sx = b.sx; nb.sy = b.sy;
  Sound.play('w4_boing'); sparks(x, y, 2, '#ffd23f');
}
BULLET_KINDS.w4_pizza = { noCasing: true, life: 1.7, dmg: 1, impact: (b, x, y) => w4PizzaImpact(b, x, y) };
BULLET_DRAW.w4_pizza = (g, b) => {
  g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(T * 16 + b.sx); g.scale(0.8, 0.8);
  drawWeaponShape(g, 'w4_pizza'); g.restore();
  return true;
};

// ---------------------------------------------------------------------
//  '0' LAUBBLÄSER: pustet Gegner weg (gegen die Wand = erledigt), lenkt Kugeln ab, Blätter!
// ---------------------------------------------------------------------
function w4FireBlower(p, w) {
  w4TickOn();
  const R = 92, ARC = 0.55, ca = Math.cos(p.a), sa = Math.sin(p.a);
  if ((p.w4SndT || 0) <= G.time) { p.w4SndT = G.time + 0.09; Sound.play('w4_blow'); }
  p.w4Leaf = ((p.w4Leaf || 0) + 1) % 2;
  if (!p.w4Leaf) w4Fx('w4LeafFx', p.x + ca * 12, p.y + sa * 12, p.a);
  for (const e of G.enemies) {
    if (e.state === 'dead' || e.static || e.kind === 'O') continue;
    const ang = w4InCone(p, e, R + e.r, ARC);
    if (ang === null) continue;
    const f = 1 - dist(p.x, p.y, e.x, e.y) / (R + e.r), push = (k) => moveEntity(e, Math.cos(ang) * k * f, Math.sin(ang) * k * f);
    const EX = ENEMY_EXT[e.kind];
    if (e.kind === 'B') { push(2.5); continue; }
    if (e.kind === 'K' || e.kind === 'R' || e.flying || (EX && EX.noKnock)) {
      push(e.kind === 'R' || (EX && EX.noKnock) ? 1.5 : 5);
      if ((e.w4BlowT || 0) <= 0) { e.w4BlowT = 1.2; say(e, e.kind === 'K' ? 'WUFF?!' : pick(['FRISUR!', 'MEIN TOUPET!', 'IST DAS WIND?']), 0.8); }
      continue;
    }
    if (e.state !== 'down' && (e.w4BlowT || 0) <= 0) { e.w4BlowT = 0.5; e.w4IceT = 0; flingEnemy(e, ang, 120 + 170 * f); }
    else if (!(e.fling > 0)) push(3);
  }
  for (const b of G.bullets) {   // Gegenwind
    if (b.dead || (b.owner === 'player' && !b.s2eLob)) continue;
    const d = dist(p.x, p.y, b.x, b.y);
    if (d > 80 || Math.abs(angDiff(p.a, Math.atan2(b.y - p.y, b.x - p.x))) > 0.8) continue;
    b.vx += ca * 70; b.vy += sa * 70;
  }
  for (const k of G.pickups) {
    if (k.thrown || dist(p.x, p.y, k.x, k.y) > 70 || Math.abs(angDiff(p.a, Math.atan2(k.y - p.y, k.x - p.x))) > ARC) continue;
    k.vx += ca * 40; k.vy += sa * 40; k.flying = true; k.spin = 6;
  }
  if (G.cashes) for (const c of G.cashes) {
    if (dist(p.x, p.y, c.x, c.y) > 70 || Math.abs(angDiff(p.a, Math.atan2(c.y - p.y, c.x - p.x))) > ARC) continue;
    c.vx = (c.vx || 0) + ca * 30; c.vy = (c.vy || 0) + sa * 30;
  }
  shake(w.shake);
  w4Noise(p, w.noise);
}

// ---------------------------------------------------------------------
//  '2' KLEBE-SAFTGRANATE: klebt an Gegner/Wand, platzt nach 1,2 s, hinterlässt Klebepfütze
// ---------------------------------------------------------------------
function w4FireSticky(p, w) {
  const mx = p.x + Math.cos(p.a) * 8, my = p.y + Math.sin(p.a) * 8, ok = los(p.x, p.y, mx, my);
  spawnBullet(ok ? mx : p.x, ok ? my : p.y, p.a + rand(-w.spread, w.spread), w.speed, 'player', p, 'w4_sticky');
  G.bullets[G.bullets.length - 1].life = 0.85;
  Sound.play('throwIt');
  w4Noise(p, w.noise);
}
function w4Stick(x, y, e) {
  w4TickOn();
  const h = { kind: 'w4_nade', x: Math.round(x), y: Math.round(y), t: 1.2 };
  if (e && e.kind !== 'O') {
    h.en = e;   // nur beim Host (netPlain lässt Figuren weg)
    if (e.kind !== 'B' && !e.static && e.state !== 'down') {
      say(e, pick(['WAS KLEBT DA?!', 'NIMM ES WEG!!', 'IIIH, SAFT!', 'MAMAAA!']), 1.2);
      if (!(e.w4IceT > 0)) { e.state = 'confused'; e.confT = Math.max(e.confT || 0, 1.3); e.windup = 0; e.aimT = 0; }
    }
  }
  (G.hazards = G.hazards || []).push(h);
  Sound.play('w4_stick');
}
function w4StickyPop(x, y) {
  juiceSplashFx(x, y); Sound.play('explode'); shake(6); hitstop(0.03);
  floatText(x, y - 14, pick(['KLEBT & PLATZT!', 'SAFT-BOMBE!', 'ANGEGUNZT!']), 'rainbow');
  for (const e of G.enemies) {
    if (e.state === 'dead') continue;
    const d = dist(x, y, e.x, e.y), ang = Math.atan2(e.y - y, e.x - x);
    if (d > 38 + e.r) continue;
    if (e.kind === 'B') bossDamage(e, 3, ang, 'juice'); else hurtEnemy(e, 3, 'juice', ang);
  }
  for (let ty = Math.floor((y - 30) / TS); ty <= Math.floor((y + 30) / TS); ty++) for (let tx = Math.floor((x - 30) / TS); tx <= Math.floor((x + 30) / TS); tx++) if (T_(tx, ty) === 'G') breakGlass(tx, ty);
  (G.hazards = G.hazards || []).push({ kind: 'w4_glue', x: Math.round(x), y: Math.round(y), r: 24, t: 9 });
  makeNoise(x, y, 260);
}
BULLET_KINDS.w4_sticky = { noCasing: true, life: 0.85, hit(b, e) { w4Stick(b.x, b.y, e); return true; }, impact(b, x, y) { w4Stick(x, y, null); } };
BULLET_DRAW.w4_sticky = (g, b) => {
  const x = Math.round(b.x), y = Math.round(b.y);
  pxEll(g, x, y, 3, 3, '#ff9a1a'); g.fillStyle = '#7dff3a'; g.fillRect(x - 3, y + 1, 2, 2); g.fillStyle = '#ffd23f'; g.fillRect(x - 1, y - 2, 2, 1);
  g.fillStyle = 'rgba(125,255,58,0.5)'; g.fillRect(Math.round(x - b.vx * 0.03), Math.round(y - b.vy * 0.03), 2, 2);
  return true;
};

// ---------------------------------------------------------------------
//  '3' GOLDENE KLOBÜRSTE: tödlich + Bonus-Geld bei jedem Treffer
// ---------------------------------------------------------------------
function w4BrushHit(e, ang) {
  if (e.state === 'dead' || e.kind === 'O') return false;
  spawnCash(e.x, e.y, Math.round(30 + G.diff * 5), 3);
  sparks(e.x, e.y, 6, '#ffe14d');
  floatText(e.x, e.y - 24, pick(['+GOLD!', 'BLING!', 'SAUBER UND REICH!']), '#ffe14d', true);
  return false;   // Standard-Treffer (tödlich) läuft weiter
}

// ---------------------------------------------------------------------
//  Etagen-Ticker (Host): Eis, Granaten, Klebepfützen, Schläger-Nachlauf
// ---------------------------------------------------------------------
function w4OnGlue(x, y) {
  for (const h of G.hazards) if (h.kind === 'w4_glue' && (x - h.x) ** 2 + ((y - h.y) * 1.4) ** 2 < h.r * h.r) return true;
  return false;
}
FLOOR_MODS.w4_tick = {
  name: '', hidden: true,
  update(dt) {
    G.hazards = G.hazards || [];
    for (const p of G.players) if (p.w4RacketT > 0) { p.w4RacketT -= dt; if (p.alive) w4RacketReflect(p); }
    for (const h of G.hazards) {
      if (h.kind === 'w4_nade') {
        if (h.en && h.en.state !== 'dead') { h.x = Math.round(h.en.x); h.y = Math.round(h.en.y); }
        const bt = Math.floor(h.t * 6);
        h.t -= dt;
        if (Math.floor(h.t * 6) !== bt && h.t > 0) Sound.play('w4_beep', h.t < 0.4);
        if (h.t <= 0) { h.dead = true; h.en = null; w4StickyPop(h.x, h.y); }
      } else if (h.kind === 'w4_glue') { h.t -= dt; if (h.t <= 0) h.dead = true; }
    }
    w4OilHackTick(dt);
    G.hazards = G.hazards.filter((h) => !h.dead && h.kind !== 'w4_ice' && h.kind !== 'w4_hack');
    w4HackUpdate(dt);
    for (const e of G.enemies) {
      e.w4SawT = (e.w4SawT || 0) - dt; e.w4BlowT = (e.w4BlowT || 0) - dt;
      if (e.state === 'dead') continue;
      if (e.w4IceT > 0) {
        e.w4IceT -= dt; e.w4IceAge += dt;
        if (e.state !== 'confused') e.w4IceT = 0;
        else G.hazards.push({ kind: 'w4_ice', x: Math.round(e.x), y: Math.round(e.y), r: e.r, t: Math.round(e.w4IceT * 10) / 10 });
      }
      // Klebepfütze: Gegner kommen kaum voran
      const glued = !e.flying && e.kind !== 'B' && !e.static && G.hazards.length && w4OnGlue(e.x, e.y);
      if (glued && e.w4Px !== undefined) {
        const dx = e.x - e.w4Px, dy = e.y - e.w4Py;
        if (dx * dx + dy * dy < 100) moveEntity(e, -dx * 0.8, -dy * 0.8);
        if (!e.w4Glued) { e.w4Glued = true; say(e, pick(['ICH KLEBE FEST!', 'MEINE SCHUHE!', 'SO EIN SAFTLADEN!']), 1); }
      } else if (!glued) e.w4Glued = false;
      e.w4Px = e.x; e.w4Py = e.y;
    }
  },
  draw(g) {   // über den Figuren: Eisblöcke + klebende Granaten (Host + Gast)
    if (!G.hazards) return;
    for (const h of G.hazards) {
      if (h.kind === 'w4_ice') {
        const s = (h.r || 5) + 5, x = h.x, y = h.y, blink = h.t < 0.8 && Math.floor(T * 12) % 2;
        g.fillStyle = blink ? 'rgba(190,240,255,0.25)' : 'rgba(170,230,255,0.45)'; g.fillRect(x - s, y - s - 2, s * 2, s * 2 + 2);
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x - s, y - s - 2, s * 2, 1); g.fillRect(x - s, y - s - 2, 1, s * 2 + 2);
        g.fillRect(x - s + 3, y - s + 1, 3, 1); g.fillRect(x + s - 4, y + s - 4, 2, 1);
        g.fillStyle = 'rgba(80,160,220,0.6)'; g.fillRect(x + s - 1, y - s - 2, 1, s * 2 + 2); g.fillRect(x - s, y + s - 1, s * 2, 1);
      } else if (h.kind === 'w4_nade') {
        pxEll(g, h.x + 3, h.y - 2, 3, 3, '#ff9a1a'); g.fillStyle = '#7dff3a'; g.fillRect(h.x + 1, h.y, 3, 2);
        if (Math.floor(T * (h.t < 0.4 ? 20 : 8)) % 2) { g.fillStyle = '#ff2a3a'; g.fillRect(h.x + 3, h.y - 4, 2, 2); }
        g.strokeStyle = 'rgba(255,60,60,0.5)'; g.lineWidth = 1; g.beginPath(); g.arc(h.x, h.y, 38 * clamp(1 - h.t / 1.2, 0.15, 1), 0, TAU); g.stroke();
      } else if (h.kind === 'w4_hack') w4DrawHack(g, h);
    }
  },
};
// Gast: G.mods hat 'w4_tick' nicht -> beim ersten Zeichnen eintragen, damit draw() läuft
HAZ_DRAW.w4_ice = () => { w4TickOn(); };
HAZ_DRAW.w4_nade = () => { w4TickOn(); };
HAZ_DRAW.w4_glue = (g, h) => {
  const k = clamp(h.t / 1.5, 0, 1), x = h.x, y = h.y;
  g.globalAlpha = 0.8 * k;
  pxEll(g, x, y, h.r, Math.round(h.r * 0.7), '#c86a10');
  pxEll(g, x - 1, y - 1, h.r - 3, Math.round(h.r * 0.55), '#ff9a1a');
  for (let i = 0; i < 5; i++) {   // Blubberblasen
    const a = i * 2.3 + x * 0.1, bx = x + Math.round(Math.cos(a) * h.r * 0.55), by = y + Math.round(Math.sin(a) * h.r * 0.35);
    if (Math.sin(T * 4 + i * 1.7) > 0.2) { g.fillStyle = '#ffd23f'; g.fillRect(bx, by, 2, 2); }
  }
  g.fillStyle = '#7dff3a'; g.fillRect(x - 3, y + 2, 3, 1); g.fillRect(x + 5, y - 2, 2, 1);
  g.globalAlpha = 1;
  return true;
};

// ---------------------------------------------------------------------
//  Waffenbilder (Mitte = 0,0, Lauf nach +x, passt in 32x16)
// ---------------------------------------------------------------------
WEAPON_DRAW.w4_saw = (g) => {
  g.fillStyle = '#9a9aa8'; g.fillRect(-1, -2, 14, 4); g.fillRect(12, -1, 2, 2);         // Schwert
  g.fillStyle = '#2a2a30'; for (let i = 0; i < 7; i++) { g.fillRect(i * 2, -3, 1, 1); g.fillRect(i * 2 + 1, 2, 1, 1); }
  g.fillStyle = '#ff7a1a'; g.fillRect(-10, -4, 10, 8);                                    // Motor
  g.fillStyle = '#ffb52a'; g.fillRect(-10, -4, 10, 1);
  g.fillStyle = '#222'; g.fillRect(-9, -6, 6, 2); g.fillRect(-12, -1, 2, 3);              // Griffe
  g.fillStyle = '#ffffff'; g.fillRect(-7, -1, 3, 2);
  return true;
};
WEAPON_DRAW.w4_racket = (g) => {
  g.fillStyle = '#c41f2a'; g.fillRect(-13, -1, 7, 3);   // Griffband
  g.fillStyle = '#e8e8e8'; g.fillRect(-6, 0, 5, 1);
  pxEll(g, 6, 0, 7, 6, '#2a2a2a'); pxEll(g, 6, 0, 6, 5, '#e8ffd0');
  g.fillStyle = '#9ab07a'; for (let i = -4; i <= 4; i += 2) { g.fillRect(1, i, 11, 1); g.fillRect(6 + i, -5, 1, 11); }
  pxEll(g, 3, -6, 2, 2, '#d8ff3a');                      // Tennisball am Rand
  return true;
};
WEAPON_DRAW.w4_ice = (g) => {
  g.fillStyle = '#3fd0ff'; g.fillRect(-10, -4, 8, 7); g.fillStyle = '#bfefff'; g.fillRect(-9, -3, 2, 5);   // Tank
  g.fillStyle = '#c8d8e8'; g.fillRect(-2, -2, 12, 3); g.fillStyle = '#7a8a9a'; g.fillRect(-2, 1, 12, 1);
  g.fillStyle = '#bfefff'; g.fillRect(10, -3, 2, 5); g.fillStyle = '#ffffff'; g.fillRect(12, -1, 1, 1);
  g.fillStyle = '#222'; g.fillRect(-4, 3, 3, 3);
  return true;
};
WEAPON_DRAW.w4_pizza = (g) => {
  g.fillStyle = '#c8822a'; g.fillRect(-8, -6, 3, 12); g.fillStyle = '#e8a04a'; g.fillRect(-8, -6, 1, 12);   // Rand
  g.fillStyle = '#ffd23f';
  for (let i = 0; i < 13; i++) { const h = Math.round(5.5 - i * 5.5 / 13); g.fillRect(-5 + i, -h, 1, h * 2 + 1); }
  g.fillStyle = '#c41f2a'; g.fillRect(-3, -3, 2, 2); g.fillRect(0, 1, 2, 2); g.fillRect(3, -1, 2, 2);
  g.fillStyle = '#fff3a0'; g.fillRect(-4, 2, 1, 1); g.fillRect(2, -2, 1, 1);
  return true;
};
WEAPON_DRAW.w4_blower = (g) => {
  g.fillStyle = '#e8a020'; g.fillRect(-10, -4, 9, 8); g.fillStyle = '#ffd23f'; g.fillRect(-10, -4, 9, 1);   // Gehäuse
  g.fillStyle = '#333'; g.fillRect(-12, -2, 2, 4); g.fillRect(-8, -6, 5, 2);
  g.fillStyle = '#5a5a66'; g.fillRect(-1, -1, 12, 3); g.fillStyle = '#7a7a88'; g.fillRect(-1, -1, 12, 1);
  g.fillStyle = '#5a5a66'; g.fillRect(11, -3, 2, 6);
  return true;
};
WEAPON_DRAW.w4_sticky = (g) => {
  pxEll(g, 0, 1, 4, 4, '#ff9a1a'); g.fillStyle = '#ffd23f'; g.fillRect(-2, -2, 2, 2);
  g.fillStyle = '#5a5a66'; g.fillRect(-1, -5, 3, 3); g.fillStyle = '#c8c8d8'; g.fillRect(2, -5, 3, 1);
  g.fillStyle = '#7dff3a'; g.fillRect(-4, 3, 2, 2); g.fillRect(3, 4, 1, 2);   // Kleber tropft
  return true;
};
WEAPON_DRAW.w4_brush = (g) => {
  g.fillStyle = '#c89a10'; g.fillRect(-12, 0, 16, 2); g.fillStyle = '#ffe14d'; g.fillRect(-12, -1, 16, 1);
  pxEll(g, 8, 0, 4, 4, '#ffe14d'); g.fillStyle = '#fff7a0';
  for (let i = -3; i <= 3; i += 2) { g.fillRect(12, i, 2, 1); g.fillRect(8 + i, -5, 1, 1); g.fillRect(8 + i, 5, 1, 1); }
  g.fillStyle = '#ffffff'; g.fillRect(6, -2, 1, 1); g.fillRect(-9, -2, 1, 1);
  return true;
};

// =====================================================================
//  ADDENDUM: '[' STEIRER KERNÖL  ']' RUSSIAN HACKER BOI LAPTOP
// =====================================================================
const W4_HACK_FIST = { name: 'GEHACKTE FAUST', lethal: true, rate: 0.5, reach: 16, arc: 1, hitSfx: 'punch' };
const W4_OIL_GAG = ['DES IS DAS GRÜNE GOLD!', 'KERNÖL-ALARM!', 'STEIERMARK, BABY!', 'AUF DEN SALAT, NED AUFN BODEN!', 'SCHMECKT NACH KÜRBIS!'];
const W4_RHB_LINES = ['DEIN GEGNER IST JETZT MEIN PRAKTIKANT!', 'SUDO KÄMPF FÜR UNS!', 'PASSWORT WAR 1234!', 'GEHACKT. MIT LIEBE.', 'FIREWALL? NIE GEHÖRT!', 'ICH BIN JETZT DER GUTE. GLAUBE ICH.'];
Object.assign(WEAPONS, {
  w4_oil: { name: 'STEIRER KERNÖL', ranged: true, auto: true, ammo: 40, rate: 0.11, spread: 0.16, pellets: 1, noise: 60, shake: 0.3, sfx: 'w4_glug', speed: 230, kind: 'w4_oil',
    noEnemy: true, noCasing: true, noCity: true, onFire: (p, w) => w4FireOil(p, w) },
  w4_laptop: { name: 'RUSSIAN HACKER BOI LAPTOP', ranged: true, ammo: 18, rate: 0.32, spread: 0.03, pellets: 1, noise: 50, shake: 0.4, sfx: 'w4_modem', speed: 360, kind: 'w4_bits',
    noEnemy: true, noCasing: true, noCity: true, onFire: (p, w) => w4FireLaptop(p, w) },
});
Object.assign(WEAPON_PRICES, { w4_oil: 4200, w4_laptop: 14000 });
MOD_GUNS.push('w4_oil', 'w4_laptop');
Object.assign(ITEMS, { '[': 'w4_oil', ']': 'w4_laptop' });
Object.assign(CAUSE, { w4_oil: 'STEIRER KERNÖL', w4_laptop: 'GEHACKTER KOLLEGE' });
GEN_ITEMS.push({ ch: '[', minDiff: 10.3 }, { ch: ']', minDiff: 10.8 });

Sound.addSfx('w4_glug', () => { const { tone, now } = Sound.synth, t = now();
  tone({ type: 'sine', f: 220 + Math.random() * 60, f2: 120, dur: 0.07, vol: 0.12, t }); });
Sound.addSfx('w4_slip', () => { const { tone, noise, now } = Sound.synth, t = now();
  tone({ type: 'triangle', f: 900, f2: 180, dur: 0.25, vol: 0.12, t }); noise({ dur: 0.12, ft: 'lowpass', f: 600, vol: 0.12, t: t + 0.2 }); });
Sound.addSfx('w4_modem', () => { const { tone, now } = Sound.synth, t = now();
  for (let i = 0; i < 4; i++) tone({ type: 'square', f: [1200, 2100, 900, 2400][i] + Math.random() * 200, dur: 0.03, vol: 0.05, t: t + i * 0.03 }); });
Sound.addSfx('w4_hack', () => { const { tone, now } = Sound.synth, t = now();
  tone({ type: 'square', f: 400, f2: 1600, dur: 0.18, vol: 0.08, t }); tone({ type: 'square', f: 1600, f2: 800, dur: 0.12, vol: 0.06, t: t + 0.18 }); });

// ---------------------------------------------------------------------
//  '[' STEIRER KERNÖL: spritzt Öl, getroffene Gegner rutschen aus; Ölpfützen bleiben liegen
// ---------------------------------------------------------------------
function w4FireOil(p, w) {
  w4TickOn();
  const mx = p.x + Math.cos(p.a) * 9, my = p.y + Math.sin(p.a) * 9, ok = los(p.x, p.y, mx, my);
  spawnBullet(ok ? mx : p.x, ok ? my : p.y, p.a + rand(-w.spread, w.spread), w.speed * rand(0.8, 1.1), 'player', p, 'w4_oil');
  G.bullets[G.bullets.length - 1].life = rand(0.35, 0.5);
  if ((p.w4SndT || 0) <= G.time) { p.w4SndT = G.time + 0.1; Sound.play('w4_glug'); }
  if ((p.w4GagT || 0) <= G.time) { p.w4GagT = G.time + 5; floatText(p.x, p.y - 22, pick(W4_OIL_GAG), '#7dff3a', true); }
  w4Noise(p, w.noise);
}
function w4OilPuddle(x, y) {
  w4TickOn();
  G.hazards = G.hazards || [];
  if (blocksBulletC(T_(Math.floor(x / TS), Math.floor(y / TS)))) return;
  for (const h of G.hazards) if (h.kind === 'w4_oil' && !h.dead && (h.x - x) ** 2 + (h.y - y) ** 2 < 100) { h.r = Math.min(20, h.r + 1); h.t = 30; return; }
  const oils = G.hazards.filter((h) => h.kind === 'w4_oil' && !h.dead);
  if (oils.length >= 28) oils[0].dead = true;   // alte Pfützen trocknen (Netz klein halten)
  G.hazards.push({ kind: 'w4_oil', x: Math.round(x), y: Math.round(y), r: 11, t: 30 });
}
function w4OnOil(x, y) {
  for (const h of G.hazards) if (h.kind === 'w4_oil' && !h.dead && (x - h.x) ** 2 + ((y - h.y) * 1.3) ** 2 < h.r * h.r) return true;
  return false;
}
function w4Slip(e, ang) {
  if (e.state === 'dead' || e.state === 'down' || e.w4HackT > 0) return false;
  const EX = ENEMY_EXT[e.kind];
  if (e.kind === 'B' || e.static || e.flying || e.kind === 'O' || e.kind === 'Q' || e.kind === 'R' || (EX && EX.noKnock)) {
    if ((e.w4BlowT || 0) <= 0) { e.w4BlowT = 1.5; say(e, pick(['IIH, ÖLIG!', 'MEIN ANZUG!', 'RIECHT NACH SALAT!']), 1); }
    return false;
  }
  knockDown(e, ang, 2.4);
  if (e.state === 'down' || e.state === 'dead') {
    Sound.play('w4_slip');
    floatText(e.x, e.y - 20, pick(['AUSGERUTSCHT!', 'UIIIII!', 'SALATDRESSING!', 'GRÜNES GOLD!']), '#7dff3a', true);
    run.score += 50;
    return true;
  }
  return false;
}
BULLET_KINDS.w4_oil = { noCasing: true, life: 0.5,
  hit(b, e, ang) { if (e.kind === 'B') bossDamage(e, 0.2, ang, 'shot'); else w4Slip(e, ang); w4OilPuddle(e.x + rand(-4, 4), e.y + rand(-4, 4)); return true; },
  impact(b, x, y) { if (Math.random() < 0.6) w4OilPuddle(x, y); } };
BULLET_DRAW.w4_oil = (g, b) => {
  const x = Math.round(b.x), y = Math.round(b.y);
  g.fillStyle = '#1f3a10'; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = '#4a8a1a'; g.fillRect(x - 1, y - 2, 2, 1);
  g.fillStyle = 'rgba(40,80,16,0.6)'; g.fillRect(Math.round(x - b.vx * 0.02), Math.round(y - b.vy * 0.02), 2, 2);
  return true;
};
HAZ_DRAW.w4_oil = (g, h) => {
  const k = clamp(h.t / 3, 0, 1), x = h.x, y = h.y, r = h.r;
  g.globalAlpha = 0.85 * k;
  pxEll(g, x, y, r, Math.round(r * 0.7), '#16280a');
  pxEll(g, x - 1, y - 1, r - 2, Math.round(r * 0.55), '#2a4a12');
  g.fillStyle = '#7a5a1a'; g.fillRect(x - Math.round(r * 0.4), y + 1, 2, 1);   // Kürbiskern
  g.fillStyle = 'rgba(200,255,140,0.55)';                                       // Glanz
  const s = Math.round(Math.sin(T * 2 + x) * 2);
  g.fillRect(x - 3 + s, y - Math.round(r * 0.3), 4, 1); g.fillRect(x + 2 + s, y - Math.round(r * 0.3) + 2, 2, 1);
  g.globalAlpha = 1;
  return true;
};

// ---------------------------------------------------------------------
//  ']' RUSSIAN HACKER BOI LAPTOP: 0101-Pakete; Getroffene kämpfen 6,5 s für dich
// ---------------------------------------------------------------------
function w4FireLaptop(p, w) {
  w4TickOn();
  const mx = p.x + Math.cos(p.a) * 9, my = p.y + Math.sin(p.a) * 9, ok = los(p.x, p.y, mx, my);
  spawnBullet(ok ? mx : p.x, ok ? my : p.y, p.a + rand(-w.spread, w.spread), w.speed, 'player', p, 'w4_bits');
  Sound.play('w4_modem');
  if (Math.random() < 0.3) w4Fx('w4BitFx', mx, my);
  if ((p.w4GagT || 0) <= G.time && Math.random() < 0.3) { p.w4GagT = G.time + 6; floatText(p.x, p.y - 22, 'RHB: ' + pick(['ENTER DRÜCKEN, LIL!', 'ICH HACKE, DU RENNST!', 'BITTE NICHT SAFT AUF TASTATUR!']), '#39ff7a', true); }
  w4Noise(p, w.noise);
}
function w4BitFx(x, y) {
  for (let i = 0; i < 3; i++) G.parts.push({ x, y, vx: rand(-40, 40), vy: rand(-50, -10), life: rand(0.2, 0.45), col: pick(['#39ff7a', '#bfffcf', '#1a8a3a']), s: 1, kind: 'w4', fric: 3 });
}
function w4CanHack(e) {
  return e.state !== 'dead' && !['B', 'O', 'Y', 'Q', 'V', 'H'].includes(e.kind) && !e.static && !e.flying;
}
function w4Hack(e, p, ang) {
  if (!w4CanHack(e)) { if (e.kind === 'B') bossDamage(e, 1, ang, 'shot'); else hurtEnemy(e, 1, 'shot', ang); return; }
  const fresh = !(e.w4HackT > 0);
  e.w4HackT = 6.5; e.w4HackBy = p; e.w4HackCd = 0.4;
  e.state = 'confused'; e.confT = 1; e.windup = 0; e.aimT = 0; e.path = null; e.burst = 0; e.downT = 0; e.fling = 0;
  if (fresh) {
    Sound.play('w4_hack'); sparks(e.x, e.y, 10, '#39ff7a');
    say(e, pick(['SYSTEM ÜBERNOMMEN.', 'ICH... MAG DICH JETZT?', 'UPDATE WIRD INSTALLIERT...', 'KOLLEGEN, VERZEIHT MIR!']), 1.5);
    floatText(p.x, p.y - 24, 'RHB: ' + pick(W4_RHB_LINES), '#39ff7a', true);
    run.score += 150;
  }
  w4TickOn();
}
BULLET_KINDS.w4_bits = { noCasing: true, life: 1.1,
  hit(b, e, ang) { if (!(e.w4HackT > 0)) w4Hack(e, b.src && b.src.alive !== undefined ? b.src : G.player, ang); return true; },
  impact(b, x, y) { sparks(x, y, 3, '#39ff7a'); } };
BULLET_DRAW.w4_bits = (g, b) => {
  const x = Math.round(b.x), y = Math.round(b.y), one = Math.floor(T * 14 + b.sx) % 2;
  g.fillStyle = 'rgba(57,255,122,0.3)'; g.fillRect(x - 4, y - 4, 9, 8);
  g.fillStyle = '#39ff7a';
  if (one) { g.fillRect(x - 2, y - 3, 1, 1); g.fillRect(x - 1, y - 3, 1, 6); g.fillRect(x - 2, y + 2, 3, 1); }
  else { g.fillRect(x - 2, y - 3, 3, 1); g.fillRect(x - 2, y + 2, 3, 1); g.fillRect(x - 3, y - 2, 1, 4); g.fillRect(x + 1, y - 2, 1, 4); }
  g.fillStyle = '#bfffcf'; g.fillRect(x + 3, y - 1, 1, 1);
  return true;
};
function w4HackTarget(e) {
  let best = null, bd = 300;
  for (const o of G.enemies) {
    if (o === e || o.state === 'dead' || o.kind === 'O' || o.w4HackT > 0) continue;
    const d = dist(e.x, e.y, o.x, o.y);
    if (d < bd && los(e.x, e.y, o.x, o.y)) { bd = d; best = o; }
  }
  return best;
}
function w4HackUpdate(dt) {   // Host: gehackte Gegner kämpfen für den Spieler
  for (const e of G.enemies) {
    if (!(e.w4HackT > 0)) continue;
    if (e.state === 'dead') { e.w4HackT = 0; e.w4HackBy = null; continue; }
    e.w4HackT -= dt; e.w4HackCd -= dt;
    if (e.w4HackT <= 0) {
      e.w4HackT = 0; e.w4HackBy = null;
      if (e.state !== 'down') { e.state = 'confused'; e.confT = 0.9; }
      say(e, pick(['WO BIN ICH?', 'WAS HAB ICH GETAN?!', 'NEUSTART...']), 1.2);
      sparks(e.x, e.y, 6, '#39ff7a');
      continue;
    }
    G.hazards.push({ kind: 'w4_hack', x: Math.round(e.x), y: Math.round(e.y), r: e.r, t: Math.round(e.w4HackT * 10) / 10 });
    if (e.state === 'down') { e.state = 'confused'; e.downT = 0; }   // Hacker-Reboot: steht wieder auf
    if (e.state !== 'confused' || e.w4IceT > 0 || e.fling > 0) continue;
    e.confT = Math.max(e.confT || 0, 0.5);
    const p = e.w4HackBy && e.w4HackBy.alive !== false ? e.w4HackBy : G.player;
    const t = w4HackTarget(e);
    if (!t) {   // niemand da: dem Hacker hinterher
      if (p && dist(e.x, e.y, p.x, p.y) > 34) { moveToward(e, p.x, p.y, 70 * dt); e.walkT += dt; e.a = turnTo(e.a, Math.atan2(p.y - e.y, p.x - e.x), 8 * dt); }
      continue;
    }
    const ta = Math.atan2(t.y - e.y, t.x - e.x), d = dist(e.x, e.y, t.x, t.y);
    e.a = turnTo(e.a, ta, 10 * dt);
    const w = e.weapon && WEAPONS[e.weapon];
    if (w && w.ranged && w.pellets && !w.onFire) {
      if (d > 170) { moveToward(e, t.x, t.y, 60 * dt); e.walkT += dt; }
      if (e.w4HackCd <= 0 && Math.abs(angDiff(e.a, ta)) < 0.25) {
        e.w4HackCd = Math.max(0.28, (w.eRate || 0.5) * 1.1);
        const mx = e.x + Math.cos(e.a) * 9, my = e.y + Math.sin(e.a) * 9;
        for (let i = 0; i < w.pellets; i++) {
          spawnBullet(mx, my, e.a + rand(-1, 1) * Math.min(0.12, w.eSpread || 0.06), Math.min(w.speed || 420, 520), 'player', p, 'bullet', 'w4_laptop');
          G.bullets[G.bullets.length - 1].hits = [e];
        }
        muzzleFlash(mx, my); e.recoil = 2; Sound.play(w.sfx || 'pistol'); makeNoise(e.x, e.y, 200);
      }
    } else {   // Nahkampf (auch ohne Waffe): hinlaufen und zuhauen
      if (d > t.r + e.r + 6) { moveToward(e, t.x, t.y, (e.kind === 'K' ? 130 : 85) * dt); e.walkT += dt; }
      else if (e.w4HackCd <= 0) {
        e.w4HackCd = 0.55; e.swingT = 0.2; e.swingDir = -(e.swingDir || 1);
        Sound.play('swoosh');
        if (t.kind === 'B') bossDamage(t, 1, ta, 'melee'); else meleeHit(t, W4_HACK_FIST, ta, p);
      }
    }
  }
}
function w4OilHackTick(dt) {   // Ölpfützen trocknen langsam; wer drüberläuft, fällt hin
  let any = false;
  for (const h of G.hazards) if (h.kind === 'w4_oil') { any = true; h.t -= dt; if (h.t <= 0) h.dead = true; }
  for (const e of G.enemies) {
    e.w4SlipT = (e.w4SlipT || 0) - dt;
    const ox = e.w4Ox, oy = e.w4Oy; e.w4Ox = e.x; e.w4Oy = e.y;
    if (!any || ox === undefined || e.state === 'dead' || e.state === 'down' || e.w4SlipT > 0) continue;
    const dx = e.x - ox, dy = e.y - oy;
    if (dx * dx + dy * dy < 0.2 || !w4OnOil(e.x, e.y)) continue;
    e.w4SlipT = 3;
    if (w4Slip(e, Math.atan2(dy, dx))) say(e, pick(['WER HAT HIER GEÖLT?!', 'KÜRBISKERNÖL?!', 'DES GRÜNE GOLD!']), 1.2);
  }
}
function w4DrawHack(g, h) {   // über den Figuren (Host + Gast)
  const s = (h.r || 5) + 4, x = h.x, y = h.y;
  g.strokeStyle = `rgba(57,255,122,${0.45 + 0.3 * Math.sin(T * 10)})`; g.lineWidth = 1;
  g.strokeRect(x - s + 0.5, y - s + 0.5, s * 2, s * 2);
  g.fillStyle = '#39ff7a';
  for (let i = 0; i < 3; i++) {   // aufsteigende Bits
    const k = (T * 0.9 + i / 3 + x * 0.013) % 1, bx = x - 6 + i * 5, by = Math.round(y - s - k * 12);
    g.globalAlpha = 1 - k;
    if ((i + Math.floor(T * 3)) % 2) g.fillRect(bx, by, 1, 4);
    else { g.fillRect(bx - 1, by, 3, 1); g.fillRect(bx - 1, by + 3, 3, 1); g.fillRect(bx - 1, by, 1, 4); g.fillRect(bx + 1, by, 1, 4); }
  }
  g.globalAlpha = 1;
  const k = clamp(h.t / 6.5, 0, 1);   // Restzeit
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 8, y + s + 2, 16, 2);
  g.fillStyle = '#39ff7a'; g.fillRect(x - 8, y + s + 2, Math.round(16 * k), 2);
}
HAZ_DRAW.w4_hack = () => { w4TickOn(); };

WEAPON_DRAW.w4_oil = (g) => {
  g.fillStyle = '#16280a'; g.fillRect(-9, -4, 13, 8);               // Flaschenbauch
  g.fillStyle = '#2f5a14'; g.fillRect(-9, -4, 13, 2);
  g.fillStyle = '#16280a'; g.fillRect(4, -2, 5, 4);                 // Hals
  g.fillStyle = '#c8a050'; g.fillRect(9, -2, 2, 4);                 // Korken
  g.fillStyle = '#f0e8d0'; g.fillRect(-7, -2, 7, 4);                // Etikett
  g.fillStyle = '#2a8a2a'; g.fillRect(-7, -2, 7, 1);                // weiß-grün wie die Steiermark
  g.fillStyle = '#7a5a1a'; g.fillRect(-5, 0, 1, 1); g.fillRect(-3, 1, 1, 1); g.fillRect(-2, 0, 1, 1);   // Kürbiskerne
  g.fillStyle = 'rgba(200,255,140,0.6)'; g.fillRect(-8, -3, 1, 5);
  return true;
};
WEAPON_DRAW.w4_laptop = (g) => {
  g.fillStyle = '#3a3a44'; g.fillRect(-10, 2, 18, 4); g.fillStyle = '#5a5a66'; g.fillRect(-10, 2, 18, 1);   // Tastatur
  g.fillStyle = '#22222a'; for (let i = 0; i < 6; i++) g.fillRect(-9 + i * 3, 4, 2, 1);
  g.fillStyle = '#2a2a33'; g.fillRect(-10, -7, 18, 9);               // Deckel
  g.fillStyle = '#062a12'; g.fillRect(-9, -6, 16, 7);                 // Bildschirm
  g.fillStyle = '#39ff7a'; g.fillRect(-8, -5, 3, 1); g.fillRect(-4, -5, 1, 1); g.fillRect(-2, -5, 4, 1);
  g.fillRect(-8, -3, 1, 1); g.fillRect(-6, -3, 5, 1); g.fillRect(0, -3, 2, 1); g.fillRect(-8, -1, 6, 1);
  g.fillStyle = '#c41f2a'; g.fillRect(4, -2, 2, 2);                   // roter Aufkleber
  g.fillStyle = '#ffe14d'; g.fillRect(5, -5, 1, 1);
  return true;
};
