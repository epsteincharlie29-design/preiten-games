'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Neue Waffen: Taser, Harpune, Raketenwerfer,
//  Sense, Golfschläger, Saftkanone
// =====================================================================
Object.assign(WEAPONS, {
  taser: { name: 'TASER', ranged: true, ammo: 8, rate: 0.42, spread: 0.02, pellets: 1, life: 0.45, noise: 90, shake: 1, sfx: 'zap', speed: 430, kind: 'zap', eRate: 1, eSpread: 0.05, noEnemy: true },
  harpoon: { name: 'HARPUNE', ranged: true, ammo: 5, rate: 0.7, spread: 0, pellets: 1, pierce: true, noise: 80, shake: 3, sfx: 'crossbow', speed: 500, kind: 'harpoon', eRate: 1, eSpread: 0.02, noEnemy: true },
  rocket: { name: 'RAKETENWERFER', ranged: true, ammo: 3, rate: 0.9, spread: 0.01, pellets: 1, life: 1.4, noise: 420, shake: 6, sfx: 'shotgun', speed: 290, kind: 'rocket', eRate: 1, eSpread: 0.02, noEnemy: true },
  juicegun: { name: 'SAFTKANONE', ranged: true, ammo: 24, rate: 0.22, spread: 0.06, pellets: 1, life: 0.6, auto: true, noise: 160, shake: 1.5, sfx: 'splat', speed: 300, kind: 'blob', eRate: 1, eSpread: 0.06, noEnemy: true },
  scythe: { name: 'SENSE', lethal: true, rate: 0.5, reach: 28, arc: 3.1, hitSfx: 'swoosh' },
  golf: { name: 'GOLFSCHLÄGER', lethal: false, rate: 0.4, reach: 24, arc: 1.3, hitSfx: 'bonk', fling: 300 },
});
Object.assign(WEAPON_PRICES, { golf: 1300, taser: 1500, scythe: 3000, harpoon: 3800, juicegun: 4200, rocket: 8000 });
MOD_GUNS.push('taser', 'harpoon', 'juicegun', 'rocket');
// eigene Waffenbilder aus späteren Dateien: id -> (g, id) => true wenn gezeichnet (Mitte = 0,0, Lauf nach +x)
const WEAPON_DRAW = {};
// Saftkanone: kleiner Saft-Platscher (tut Spielern nichts)
function juiceSplashFx(x, y) {
  Sound.play('splat');
  for (let i = 0; i < 14; i++) { const a = rand(TAU), sp = rand(30, 120); G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.15, 0.4), col: pick(JUICE), s: pick([1, 2]), kind: 'blood', fric: 7 }); }
  withDecal(x, y, 14, (g) => { pxEll(g, x, y, 5, 4, '#e8820a'); pxEll(g, x + 3, y - 2, 2, 2, '#f0a01a'); });
}
function juiceSplash(x, y) {
  juiceSplashFx(x, y);
  makeNoise(x, y, 120);
  for (const e of G.enemies) {
    if (e.state === 'dead' || dist(x, y, e.x, e.y) > 22 + e.r) continue;
    if (e.kind === 'B') bossDamage(e, 1, Math.atan2(e.y - y, e.x - x), 'juice');
    else hurtEnemy(e, 2, 'juice', Math.atan2(e.y - y, e.x - x));
  }
}
// Rakete: große Explosion, tut dem Schützen nichts
function rocketBoom(x, y) { explode(x, y, 58, { safe: true, words: ['BUMM!', 'KAWUMM!', 'RAKETE!', 'BYE BYE!'] }); }
// Taser: betäubt statt tötet
function taserHit(e, ang) {
  if (e.kind === 'B') { bossDamage(e, 1, ang, 'shot'); return; }
  if (e.static || e.kind === 'O') { hurtEnemy(e, 1, 'shot', ang); return; }
  if (e.kind === 'R') { e.state = 'confused'; e.confT = 2.6; }
  else knockDown(e, ang, 3.6);
  sparks(e.x, e.y, 8, '#9ff'); floatText(e.x, e.y - 14, 'BZZZT!', '#9ff', true);
}
// neue Geschosse zeichnen (true = erledigt)
function drawNewBullet(g, b) {
  const bd = BULLET_DRAW[b.kind];
  if (bd && extCall(bd, g, b)) return true;
  if (drawBossBullet(g, b)) return true;
  const a = Math.atan2(b.vy, b.vx);
  if (b.kind === 'zap') {
    g.strokeStyle = '#bfffff'; g.lineWidth = 1; g.beginPath();
    for (let k = 0; k < 4; k++) { const t = k / 3, x = b.x - Math.cos(a) * 10 * t + rand(-2, 2), y = b.y - Math.sin(a) * 10 * t + rand(-2, 2); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke(); return true;
  }
  if (b.kind === 'harpoon') {
    g.strokeStyle = '#9a9aa8'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x - Math.cos(a) * 12, b.y - Math.sin(a) * 12); g.lineTo(b.x, b.y); g.stroke();
    g.fillStyle = '#e8e8f0'; g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 3, 3); g.lineWidth = 1; return true;
  }
  if (b.kind === 'rocket') {
    g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(a);
    g.fillStyle = '#3a5a2a'; g.fillRect(-5, -2, 8, 4); g.fillStyle = '#e01b3c'; g.fillRect(3, -2, 3, 4);
    g.fillStyle = Math.random() < 0.5 ? '#ffe14d' : '#ff9a1a'; g.fillRect(-9, -1, 4, 2);
    g.restore();
    if (Math.random() < 0.6) G.parts.push({ x: b.x - Math.cos(a) * 8, y: b.y - Math.sin(a) * 8, vx: rand(-10, 10), vy: rand(-10, 10), life: 0.3, col: 'rgba(200,200,200,0.5)', s: 2, kind: 'spark' });
    return true;
  }
  if (b.kind === 'blob') { pxEll(g, Math.round(b.x), Math.round(b.y), 3, 3, '#ff9a1a'); g.fillStyle = '#ffd23f'; g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 2, 2, 1); return true; }
  return false;
}
function drawNewWeapon(g, id) {
  const wd = WEAPON_DRAW[id];
  if (wd && extCall(wd, g, id)) return true;
  switch (id) {
    case 'taser': g.fillStyle = '#ffd23f'; g.fillRect(-4, -2, 8, 4); g.fillStyle = '#111'; g.fillRect(-4, 1, 3, 3); g.fillRect(4, -2, 2, 1); g.fillRect(4, 1, 2, 1); g.fillStyle = '#3fd0ff'; g.fillRect(6, -2, 1, 1); g.fillRect(6, 1, 1, 1); return true;
    case 'harpoon': g.fillStyle = '#5a6a7a'; g.fillRect(-9, -1, 16, 3); g.fillStyle = '#3a2410'; g.fillRect(-9, 1, 4, 3); g.fillStyle = '#e8e8f0'; g.fillRect(7, -2, 4, 5); g.fillRect(11, 0, 2, 1); return true;
    case 'rocket': g.fillStyle = '#3a5a2a'; g.fillRect(-10, -2, 18, 4); g.fillStyle = '#2a3a1a'; g.fillRect(-2, 2, 3, 3); g.fillStyle = '#e01b3c'; g.fillRect(8, -2, 3, 4); g.fillStyle = '#111'; g.fillRect(-10, -2, 2, 4); return true;
    case 'juicegun': g.fillStyle = '#ff9a1a'; g.fillRect(-6, -3, 7, 6); g.fillStyle = '#5a5a66'; g.fillRect(1, -1, 9, 2); g.fillStyle = '#ffd23f'; g.fillRect(-5, -2, 3, 2); g.fillStyle = '#111'; g.fillRect(-2, 3, 2, 3); return true;
    case 'scythe': g.fillStyle = '#6a4a2a'; g.fillRect(-10, 0, 22, 2); g.fillStyle = '#c8c8d8'; g.fillRect(9, -6, 2, 6); g.fillRect(5, -7, 5, 2); g.fillRect(2, -6, 3, 1); return true;
    case 'golf': g.fillStyle = '#c8c8d8'; g.fillRect(-9, 0, 18, 1); g.fillStyle = '#111'; g.fillRect(-10, -1, 3, 3); g.fillStyle = '#e8e8f0'; g.fillRect(9, -2, 3, 4); return true;
  }
  return false;
}
