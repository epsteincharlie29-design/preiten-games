'use strict';
// =====================================================================
//  LIL PREITNER - Zeichnen: Figuren, Waffen, Welt
// =====================================================================
const P_SUIT = '#2b2b33', P_SKIN = '#e0a070';

function screenToWorld(sx, sy) {
  const c = G.cam, z = c.z || 1, dx = (sx - W / 2) / z, dy = (sy - H / 2) / z, cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  return { x: dx * cs + dy * sn + c.x, y: -dx * sn + dy * cs + c.y };
}
function worldToScreen(x, y) {
  const c = G.cam, z = c.z || 1, dx = x - c.x, dy = y - c.y, cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  return { x: (dx * cs - dy * sn) * z + W / 2, y: (dx * sn + dy * cs) * z + H / 2 };
}

// ---------- Waffen ----------
function drawWeaponShape(g, id) {
  if (drawNewWeapon(g, id)) return;
  switch (id) {
    case 'pistol': g.fillStyle = '#2b2b33'; g.fillRect(-4, -1, 8, 2); g.fillRect(-4, 1, 2, 2); g.fillStyle = '#6a6a78'; g.fillRect(-4, -1, 8, 1); break;
    case 'magnum': g.fillStyle = '#9a9aa8'; g.fillRect(-4, -1, 10, 2); g.fillStyle = '#5a3a1a'; g.fillRect(-5, 0, 3, 3); g.fillStyle = '#d0d0dc'; g.fillRect(-4, -1, 10, 1); break;
    case 'shotgun': g.fillStyle = '#6b4423'; g.fillRect(-9, -1, 7, 3); g.fillStyle = '#3a3a44'; g.fillRect(-2, -1, 11, 2); g.fillStyle = '#80808c'; g.fillRect(-2, -1, 11, 1); break;
    case 'uzi': g.fillStyle = '#16161c'; g.fillRect(-4, -2, 9, 3); g.fillRect(-1, 1, 2, 4); g.fillStyle = '#4a4a55'; g.fillRect(-4, -2, 9, 1); break;
    case 'rifle': g.fillStyle = '#2a3020'; g.fillRect(-9, -1, 18, 3); g.fillRect(-1, 2, 2, 3); g.fillStyle = '#4a5a3a'; g.fillRect(-9, -1, 18, 1); g.fillStyle = '#111'; g.fillRect(9, 0, 3, 1); break;
    case 'laser': g.fillStyle = '#e8e8f0'; g.fillRect(-5, -2, 11, 4); g.fillStyle = '#39ff7a'; g.fillRect(-3, -1, 7, 2); g.fillStyle = '#00e5ff'; g.fillRect(6, -1, 2, 2); break;
    case 'baguette': g.fillStyle = '#c98b45'; g.fillRect(-8, -1, 16, 3); g.fillStyle = '#f0c27a'; g.fillRect(-7, -1, 14, 1); g.fillStyle = '#8f5a24'; g.fillRect(-4, 0, 2, 1); g.fillRect(0, 0, 2, 1); g.fillRect(4, 0, 2, 1); break;
    case 'pan': g.fillStyle = '#3a2a1a'; g.fillRect(-9, -1, 7, 2); pxEll(g, 3, 0, 5, 5, '#1e1e22'); pxEll(g, 3, 0, 3, 3, '#3a3a44'); g.fillStyle = '#8a8a9a'; g.fillRect(1, -3, 2, 1); break;
    case 'chicken':
      pxEll(g, 0, 0, 5, 3, '#ffe14d'); pxEll(g, 6, -1, 2, 2, '#ffe14d');
      g.fillStyle = '#ff8c1a'; g.fillRect(8, -1, 2, 1); g.fillRect(-2, 3, 1, 2); g.fillRect(1, 3, 1, 2);
      g.fillStyle = '#e53935'; g.fillRect(5, -4, 2, 2); g.fillStyle = '#111'; g.fillRect(6, -2, 1, 1); break;
    case 'bat': g.fillStyle = '#c8a070'; g.fillRect(-9, -1, 8, 2); g.fillRect(-1, -2, 10, 4); g.fillStyle = '#e0bc8a'; g.fillRect(-1, -2, 10, 1); g.fillStyle = '#222'; g.fillRect(-9, -1, 3, 2); break;
    case 'vexwave':
      g.fillStyle = '#2a1a4a'; g.fillRect(-6, -3, 12, 6); g.fillStyle = '#8e44ff'; g.fillRect(-5, -2, 10, 4);
      g.fillStyle = '#3fd0ff'; g.fillRect(4, -1, 4, 2); pxEll(g, 8, 0, 2, 3, '#c89bff'); g.fillStyle = '#fff'; g.fillRect(-3, -1, 2, 1); break;
    case 'crossbow':
      g.fillStyle = '#5a3a1a'; g.fillRect(-8, -1, 13, 2); g.fillStyle = '#3a3a44'; g.fillRect(3, -6, 2, 12);
      g.fillStyle = '#ddd'; g.fillRect(3, -6, 1, 1); g.fillRect(3, 5, 1, 1); g.fillStyle = '#aaa'; g.fillRect(-2, 0, 10, 1); break;
    case 'flamer':
      g.fillStyle = '#c41f2a'; g.fillRect(-8, -3, 7, 6); g.fillStyle = '#3a3a44'; g.fillRect(-1, -1, 10, 3);
      g.fillStyle = '#ffb52a'; g.fillRect(9, -1, 2, 2); g.fillStyle = '#ffd23f'; g.fillRect(-7, -2, 2, 2); break;
    case 'boomerang':
      g.fillStyle = '#a0602a'; g.fillRect(-7, -1, 8, 3); g.fillRect(0, -7, 3, 8);
      g.fillStyle = '#d98a3a'; g.fillRect(-7, -1, 8, 1); g.fillRect(0, -7, 1, 8); break;
    case 'minigun':
      g.fillStyle = '#2a2a30'; g.fillRect(-8, -3, 8, 7); g.fillStyle = '#5a5a66'; g.fillRect(0, -3, 12, 2); g.fillRect(0, 0, 12, 2);
      g.fillStyle = '#80808c'; g.fillRect(0, 2, 12, 1); g.fillStyle = '#ffd23f'; g.fillRect(-6, 4, 4, 2); break;
    case 'shovel':
      g.fillStyle = '#6b4a2a'; g.fillRect(-9, -1, 12, 2); g.fillStyle = '#888896'; g.fillRect(3, -3, 6, 6); g.fillStyle = '#b0b0bc'; g.fillRect(3, -3, 6, 1); break;
    case 'nailgun':
      g.fillStyle = '#e8b81a'; g.fillRect(-4, -2, 9, 4); g.fillStyle = '#222'; g.fillRect(-3, 2, 2, 3); g.fillRect(5, -1, 3, 2); break;
    case 'osaft':
      g.fillStyle = '#c85a00'; g.fillRect(-4, -5, 8, 10);
      g.fillStyle = '#ff9a1a'; g.fillRect(-3, -4, 6, 8);
      g.fillStyle = '#ffffff'; g.fillRect(-3, -1, 6, 3);
      g.fillStyle = '#ff7a00'; g.fillRect(-2, 0, 4, 1);
      g.fillStyle = '#3a9a3a'; g.fillRect(-1, -7, 3, 2); g.fillStyle = '#e8e8e8'; g.fillRect(1, -6, 2, 1);
      break;
    case 'katana': g.fillStyle = '#1a1a1a'; g.fillRect(-9, -1, 5, 2); g.fillStyle = '#ffd700'; g.fillRect(-4, -2, 1, 4); g.fillStyle = '#e8eef8'; g.fillRect(-3, -1, 13, 2); g.fillStyle = '#ffffff'; g.fillRect(-3, -1, 13, 1); break;
  }
}
function buildWeaponSprites() {
  SPR.weap = {}; SPR.weapW = {};
  for (const id in WEAPONS) {
    if (WEAPONS[id].enemyOnly) continue;
    buildWeaponSprite(id);
  }
}
function buildWeaponSprite(id) {
  const [c, g] = mkCanvas(32, 16);
  g.translate(16, 8); drawWeaponShape(g, id);
  SPR.weap[id] = c; SPR.weapW[id] = tint(c, '#ffffff');
}
// Waffenbild (wird nachgebaut, wenn eine Waffe erst nach dem Start dazukam)
function weapSprite(id, white) {
  if (!SPR.weap) { SPR.weap = {}; SPR.weapW = {}; }
  if (!SPR.weap[id]) buildWeaponSprite(id);
  return white ? SPR.weapW[id] : SPR.weap[id];
}

// ---------- Hüte (Kosmetik aus dem Shop) ----------
const HATS = {
  none: { name: 'KEINER', price: 0 },
  cap: { name: 'BASECAP', price: 300 },
  party: { name: 'PARTYHUT', price: 600 },
  shades: { name: 'SONNENBRILLE', price: 900 },
  chain: { name: 'GOLDKETTE', price: 1500 },
  crown: { name: 'KRONE', price: 4000 },
  halo: { name: 'HEILIGENSCHEIN', price: 8000 },
  goldkrone: { name: 'GOLDKRONE', price: 0, special: true },
  goldorange: { name: 'ORANGEN-KRONE', price: 0, special: true, how: '25 GOLDENE ORANGEN' },
};
// eigene Hüte aus späteren Dateien: id -> (R, g, x, y, s) (R = Pixel-Rechteck relativ zum Kopf)
const HAT_DRAW = {};
// x,y = linke obere Ecke des Kopfes; s = Pixelgröße (1 = Spielwelt)
function drawHat(g, id, x, y, s) {
  const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + a * s), Math.round(y + b * s), Math.ceil(w * s), Math.ceil(h * s)); };
  switch (id) {
    case 'cap': R(1, 0, 12, 4, '#e01b3c'); R(0, 3, 15, 2, '#b01530'); R(6, 1, 2, 1, '#ffffff'); break;
    case 'party': R(5, -6, 4, 2, '#ff3fa4'); R(4, -4, 6, 2, '#ffd23f'); R(3, -2, 8, 3, '#3fd0ff'); R(6, -8, 2, 2, '#ffffff'); break;
    case 'shades': R(2, 7, 4, 2, '#111'); R(8, 7, 4, 2, '#111'); R(6, 7, 2, 1, '#111'); R(3, 7, 1, 1, '#9ff'); R(9, 7, 1, 1, '#9ff'); break;
    case 'chain': for (let i = 0; i < 7; i++) R(2 + i * 1.6, 15 + Math.sin(i / 6 * Math.PI) * 2, 1.2, 1.2, '#ffd700'); R(6, 17, 2, 2, '#ffd700'); break;
    case 'crown': R(2, -1, 10, 3, '#ffd700'); R(2, -3, 2, 2, '#ffd700'); R(6, -4, 2, 3, '#ffd700'); R(10, -3, 2, 2, '#ffd700'); R(6, 0, 2, 1, '#e01b3c'); R(3, 0, 1, 1, '#3fd0ff'); R(10, 0, 1, 1, '#3fd0ff'); break;
    case 'goldkrone': R(1, -3, 12, 4, '#ffd700'); R(1, -6, 2, 3, '#ffd700'); R(4, -7, 2, 4, '#ffd700'); R(8, -7, 2, 4, '#ffd700'); R(11, -6, 2, 3, '#ffd700'); R(3, -2, 2, 2, '#e01b3c'); R(6, -2, 2, 2, '#3fd0ff'); R(9, -2, 2, 2, '#7dff7a'); if (Math.floor(T * 3) % 3 === 0) R(5, -8, 1, 1, '#ffffff'); break;
    case 'goldorange': R(2, -5, 10, 6, '#c89a00'); R(3, -6, 8, 6, '#ffd23f'); R(5, -5, 2, 2, '#fff6c0'); R(6, -9, 2, 3, '#3a9a3a'); R(8, -9, 3, 2, '#3a9a3a'); break;
    case 'halo': g.strokeStyle = `rgba(255,240,150,${0.7 + Math.sin(T * 4) * 0.3})`; g.lineWidth = Math.max(1, s); g.beginPath(); g.ellipse(x + 7 * s, y - 2 * s, 6 * s, 2 * s, 0, 0, TAU); g.stroke(); break;
    default: if (HAT_DRAW[id]) extCall(HAT_DRAW[id], R, g, x, y, s);
  }
}

// ---------- Menschen ----------
function drawArms(g, e, suit, skin) {
  const id = e.weapon ? (e.isPlayer ? e.weapon.id : e.weapon) : null;
  const w = id ? WEAPONS[id] : null;
  if (e.state === 'confused') {
    g.fillStyle = suit; g.fillRect(-1, -10, 3, 4); g.fillRect(-1, 6, 3, 4);
    g.fillStyle = skin; g.fillRect(-1, -12, 3, 2); g.fillRect(-1, 10, 3, 2);
    return;
  }
  if (w && w.ranged) {
    const rc = -Math.round(e.recoil || 0);
    g.fillStyle = suit;
    g.fillRect(0, -5, 4, 2); g.fillRect(3 + rc, -3, 4, 2); g.fillRect(0, 3, 4, 2); g.fillRect(3 + rc, 1, 4, 2);
    g.fillStyle = skin; g.fillRect(6 + rc, -2, 3, 4);
    g.save(); g.translate(12 + rc, 0);
    if (id === 'sniper') { g.fillStyle = '#2a3020'; g.fillRect(-6, -1, 20, 2); g.fillStyle = '#111'; g.fillRect(-1, -3, 5, 2); }
    else drawWeaponShape(g, id);
    g.restore();
    return;
  }
  if (!id) {
    const ext = e.swingT > 0 ? Math.round(Math.sin((1 - e.swingT / 0.18) * Math.PI) * 6) : 0;
    const l = e.swingDir < 0 ? ext : 0, r = e.swingDir > 0 ? ext : 0;
    g.fillStyle = suit; g.fillRect(0, -5, 3 + l, 2); g.fillRect(0, 3, 3 + r, 2);
    g.fillStyle = skin; g.fillRect(3 + l, -6, 3, 3); g.fillRect(3 + r, 3, 3, 3);
    return;
  }
  let sw;
  if (e.swingT > 0) sw = lerp(-1.5, 1.5, 1 - e.swingT / 0.18) * e.swingDir;
  else if (e.windup > 0) sw = -1.8 * e.swingDir;
  else sw = 0.9 * e.swingDir;
  g.fillStyle = suit; g.fillRect(0, -5, 4, 2); g.fillStyle = skin; g.fillRect(4, -5, 2, 2);
  g.save(); g.rotate(sw);
  g.fillStyle = suit; g.fillRect(0, 2, 6, 2);
  g.fillStyle = skin; g.fillRect(6, 1, 3, 3);
  g.save(); g.translate(16, 2); drawWeaponShape(g, id); g.restore();
  g.restore();
}
function drawLyingBody(g, e) {
  const suit = e.isPlayer ? P_SUIT : e.suit, skin = e.isPlayer ? P_SKIN : e.skin;
  g.fillStyle = '#1a1a1a'; g.fillRect(-15, -4, 7, 3); g.fillRect(-15, 1, 7, 3);
  g.fillStyle = suit; g.fillRect(-9, -5, 11, 10);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-9, 3, 11, 2);
  g.fillStyle = suit; g.fillRect(-4, -9, 3, 5); g.fillRect(-2, 5, 3, 5);
  g.fillStyle = skin; g.fillRect(-4, -11, 3, 2); g.fillRect(-2, 9, 3, 2);
  if (e.isPlayer) { g.save(); g.translate(7, 0); g.rotate(Math.PI / 2); g.drawImage(SPR.headO, -7, -9); g.restore(); }
  else { pxEll(g, 5, 0, 4, 4, e.hair); g.fillStyle = skin; g.fillRect(8, -2, 1, 4); }
}
function drawHuman(g, e) {
  const x = Math.round(e.x), y = Math.round(e.y);
  const suit = e.isPlayer ? (e.suit || P_SUIT) : e.suit, skin = e.isPlayer ? P_SKIN : e.skin;
  const big = e.kind === 'R';
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 1, y + 2, big ? 9 : 6, big ? 9 : 6, 0, 0, TAU); g.fill();
  if (e.state === 'down') {
    g.save(); g.translate(x, y); g.rotate(e.downAng || 0); drawLyingBody(g, e); g.restore();
    g.fillStyle = '#ffe14d';
    for (let i = 0; i < 3; i++) { const a = T * 5 + i * TAU / 3; g.fillRect(Math.round(x + Math.cos(a) * 6) - 1, Math.round(y - 9 + Math.sin(a) * 2), 2, 2); }
    return;
  }
  g.save(); g.translate(x, y); g.rotate(e.a);
  if (big) g.scale(1.45, 1.45);
  const s = Math.round(Math.sin(e.walkT * 14) * 3);
  g.fillStyle = '#151515'; g.fillRect(-2 + s, -4, 4, 3); g.fillRect(-2 - s, 1, 4, 3);
  g.fillStyle = suit; g.fillRect(-3, -6, 6, 12); g.fillRect(-2, -7, 4, 14);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-3, -6, 2, 12);
  if (!e.isPlayer) { g.fillStyle = e.shirt; g.fillRect(2, -1, 1, 2); }
  drawArms(g, e, suit, skin);
  if (!e.isPlayer) {
    pxEll(g, 0, 0, 4, 4, big ? '#0d0d0d' : e.hair);
    g.fillStyle = skin; g.fillRect(2, -2, 2, 4);
    if (e.glasses || big) { g.fillStyle = '#0d0d0d'; g.fillRect(3, -3, 1, 6); }
    if (e.kind === 'N') { pxEll(g, 0, 0, 4, 4, '#3a4a2a'); g.fillStyle = '#2a3a1a'; g.fillRect(-4, -1, 8, 2); }
    if (e.cop) { pxEll(g, -1, 0, 4, 4, '#14204a'); g.fillStyle = '#0a1030'; g.fillRect(2, -3, 2, 6); g.fillStyle = '#ffd23f'; g.fillRect(0, -1, 2, 2); }
    if (e.kind === 'J') { pxEll(g, 0, 0, 4, 4, '#141418'); g.fillStyle = '#e01b3c'; g.fillRect(-4, -1, 3, 2); g.fillStyle = skin; g.fillRect(2, -1, 2, 2); }
    if (e.kind === 'F' && e.state !== 'down') { pxEll(g, 0, 0, 4, 4, '#2a3a5a'); g.fillStyle = '#bfefff'; g.fillRect(2, -2, 2, 4); g.fillStyle = '#5a7090'; g.fillRect(7, -9, 3, 18); g.fillStyle = '#9ab0c8'; g.fillRect(7, -9, 2, 18); g.fillStyle = 'rgba(230,245,255,0.8)'; g.fillRect(7, -6, 1, 4); }
    if (e.kind === 'W') { g.fillStyle = '#ff9a1a'; g.fillRect(-7, -6, 3, 4); g.fillRect(-7, 2, 3, 4); g.fillStyle = '#ffffff'; g.fillRect(-7, -6, 3, 1); g.fillRect(-7, 2, 3, 1); if (e.fuse > 0 && Math.floor(T * 16) % 2) { g.fillStyle = '#ffe14d'; g.fillRect(-3, -3, 6, 6); } }
    const EX = ENEMY_EXT[e.kind];
    if (EX && EX.overlay) extCall(EX.overlay, g, e);   // gedreht: +x = Blickrichtung
  }
  g.restore();
  if (e.isPlayer) {
    const bob = Math.round(Math.abs(Math.sin(e.walkT * 14)));
    const head = e.invT > 0 && Math.floor(T * 20) % 2 ? SPR.headRedO : e.mouthT > 0 ? SPR.headO : SPR.headC;
    const hx = Math.round(x - 7 + Math.cos(e.a)), hy = Math.round(y - 13 - bob + Math.sin(e.a));
    g.drawImage(head, hx, hy);
    drawMask(g, maskOf(e), hx, hy, 1);
    const hatId = e.hat || save.hat;
    if (hatId && hatId !== 'none') drawHat(g, hatId, hx, hy, 1);
    if (e.idx >= 1 && G && G.players && G.players.length > 1) txt('P' + (e.idx + 1), x, y - 24, { g, font: FS, align: 'center', color: ['', '#66aaff', '#7dff7a', '#ffb52a'][e.idx] });
    if (e.armor > 0) { g.fillStyle = '#66ffff'; for (let i = 0; i < e.armor; i++) g.fillRect(x - 3 + i * 4, y + 9, 3, 2); }
  }
  if (e.flash > 0) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x, y, e.r + 1, 0, TAU); g.fill(); }
  if (e.hp > 1 && !e.isPlayer) for (let i = 0; i < e.hp; i++) { g.fillStyle = '#ff3b3b'; g.fillRect(x - e.hp * 2 + i * 4, y - e.r - 8, 3, 2); }
  if (e.state === 'confused') txt('?', x, y - 22 + Math.round(Math.sin(T * 10) * 2), { g, align: 'center', color: '#ffe14d' });
  else if (e.windup > 0) txt('!', x, y - 20, { g, align: 'center', color: '#ff3b3b' });
  const tp = e.target || (G && G.player);
  if (e.kind === 'N' && e.aimT > 0 && tp && tp.alive) {
    g.strokeStyle = `rgba(255,30,30,${0.35 + e.aimT * 0.6})`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(tp.x, tp.y); g.stroke();
  }
  if (!e.isPlayer && e.spot > 0.12 && e.state !== 'alert' && e.state !== 'confused') {
    g.globalAlpha = clamp(e.spot, 0.3, 1);
    txt('?', x, y - 22, { g, align: 'center', color: e.spot > 0.7 ? '#ff6a3a' : '#ffe14d' });
    g.globalAlpha = 1;
  }
}
function drawDog(g, e, lying) {
  const x = Math.round(e.x), y = Math.round(e.y);
  if (!lying) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 1, y + 2, 7, 5, 0, 0, TAU); g.fill(); }
  g.save(); g.translate(x, y); g.rotate(e.a);
  const s = lying ? 0 : Math.round(Math.sin(e.walkT * 22) * 2);
  g.fillStyle = '#5a2a08';
  if (lying) { g.fillRect(-6, -6, 1, 4); g.fillRect(3, -6, 1, 4); g.fillRect(-6, 3, 1, 4); g.fillRect(3, 3, 1, 4); }
  else { g.fillRect(-6 + s, -4, 2, 2); g.fillRect(3 - s, -4, 2, 2); g.fillRect(-6 - s, 2, 2, 2); g.fillRect(3 + s, 2, 2, 2); }
  g.fillStyle = '#8b4513'; g.fillRect(-7, -2, 13, 4);
  g.fillStyle = '#a0522d'; g.fillRect(-7, -2, 13, 1);
  g.fillStyle = '#c0392b'; g.fillRect(4, -2, 1, 4);
  g.fillStyle = '#7a3b10'; g.fillRect(5, -2, 5, 4);
  g.fillStyle = '#5a2a08'; g.fillRect(9, -1, 3, 2);
  g.fillStyle = '#111'; g.fillRect(12, -1, 1, 1);
  g.fillStyle = '#4a2006'; g.fillRect(5, -4, 3, 2); g.fillRect(5, 2, 3, 2);
  g.fillStyle = '#8b4513'; g.fillRect(-10, -1 + (lying ? 0 : Math.round(Math.sin(T * 20) * 2)), 3, 1);
  if (!lying && (e.windup > 0 || e.swingT > 0)) { g.fillStyle = '#fff'; g.fillRect(11, -2, 1, 1); g.fillRect(11, 1, 1, 1); }
  g.restore();
  if (e.state === 'confused') txt('?', x, y - 14, { g, align: 'center', color: '#ffe14d' });
}
function drawMachine(g, e, dead) {
  const x = Math.round(e.x), y = Math.round(e.y);
  if (e.kind === 'O') { if (!dead) drawProp(g, e); return; }
  if (e.kind === 'V' && G.boss && G.boss.btype === 'tabluator') { drawRouter(g, e, dead); return; }
  if (e.kind === 'Y') {
    g.fillStyle = dead ? '#2a2a2a' : '#3a4450'; g.fillRect(x - 7, y - 7, 14, 14);
    g.fillStyle = dead ? '#1a1a1a' : '#5a6878'; g.fillRect(x - 6, y - 6, 12, 2);
    if (dead) { g.fillStyle = '#111'; g.fillRect(x - 3, y - 3, 6, 6); return; }
    g.save(); g.translate(x, y); g.rotate(e.a);
    pxEll(g, 0, 0, 5, 5, '#222a33'); g.fillStyle = '#111'; g.fillRect(2 - Math.round(e.recoil || 0), -1, 10, 3);
    g.fillStyle = e.state === 'alert' ? '#ff2a3a' : '#39ff7a'; g.fillRect(-1, -1, 2, 2);
    g.restore();
    if (e.state !== 'alert') { g.fillStyle = 'rgba(255,40,40,0.08)'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, 60, e.a - 0.8, e.a + 0.8); g.fill(); }
  } else if (e.kind === 'Q') {
    const bob = dead ? 0 : Math.round(Math.sin(e.walkT * 6) * 2);
    if (!dead) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 3, y + 6, 6, 3, 0, 0, TAU); g.fill(); }
    g.fillStyle = dead ? '#222' : '#2a3440'; g.fillRect(x - 4, y - 4 - bob, 8, 8);
    const rot = dead ? 0 : T * 30;
    g.fillStyle = dead ? '#333' : 'rgba(200,220,255,0.6)';
    for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { g.fillRect(x + dx - 2 + Math.round(Math.cos(rot)), y + dy - 1 - bob, 4, 1); g.fillRect(x + dx - 1, y + dy - 2 - bob + Math.round(Math.sin(rot)), 1, 4); }
    if (!dead) { g.fillStyle = e.state === 'alert' ? '#ff2a3a' : '#39ff7a'; g.fillRect(x + Math.round(Math.cos(e.a) * 2) - 1, y - 1 - bob + Math.round(Math.sin(e.a) * 2), 2, 2); }
  } else if (e.kind === 'V') {
    g.fillStyle = dead ? '#1a1a1a' : '#0f1a12'; g.fillRect(x - 8, y - 10, 16, 20);
    g.fillStyle = dead ? '#111' : '#1e3024'; g.fillRect(x - 7, y - 9, 14, 3); g.fillRect(x - 7, y - 4, 14, 3); g.fillRect(x - 7, y + 1, 14, 3); g.fillRect(x - 7, y + 6, 14, 3);
    if (!dead) for (let i = 0; i < 4; i++) { g.fillStyle = Math.sin(T * 9 + i * 2 + x) > 0 ? '#39ff7a' : '#0a3a1a'; g.fillRect(x + 4, y - 8 + i * 5, 2, 1); }
    if (!dead) for (let i = 0; i < e.hp; i++) { g.fillStyle = '#39ff7a'; g.fillRect(x - 8 + i * 2, y - 14, 1, 2); }
  }
}
function drawCorpse(g, e, ang) {
  const EX = ENEMY_EXT[e.kind];
  if (EX && EX.drawCorpse && extCall(EX.drawCorpse, g, e, ang)) return;
  if (e.kind === 'K') { drawDog(g, { x: e.x, y: e.y, a: ang, walkT: 0 }, true); return; }
  if (e.kind === 'Y' || e.kind === 'Q' || e.kind === 'V') { drawMachine(g, e, true); return; }
  g.save(); g.translate(Math.round(e.x), Math.round(e.y)); g.rotate(ang);
  if (e.kind === 'B') { g.scale(2, 2); drawLyingBody(g, { suit: e.btype === 'hacker' ? '#16261a' : e.btype === 'croupier' ? '#16161c' : '#fafafa', skin: '#f0b890', hair: '#1e1e1e' }); }
  else { if (e.kind === 'R') g.scale(1.4, 1.4); drawLyingBody(g, e); }
  g.restore();
}

// ---------------------------------------------------------------------
//  Welt
// ---------------------------------------------------------------------
function drawBackground() {
  const h1 = (T * 15) % 360;
  const grd = ctx.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, `hsl(${h1},70%,22%)`); grd.addColorStop(1, `hsl(${(h1 + 70) % 360},80%,12%)`);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  const off = (T * 20) % 40;
  for (let x = -H - 40 + off; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 20, 0); ctx.lineTo(x + 20 + H, H); ctx.lineTo(x + H, H); ctx.fill(); }
}
function drawDoors(g) {
  for (const key in G.doors) {
    const i = +key, d = G.doors[key];
    const X = (i % G.w) * TS, Y = ((i / G.w) | 0) * TS;
    if (d.glass) {
      if (G.tiles[i] !== 'G') continue;
      g.fillStyle = 'rgba(160,225,255,0.5)';
      if (d.horiz) { g.fillRect(X, Y + 5, 16, 6); g.fillStyle = '#9adcf0'; g.fillRect(X, Y + 5, 16, 1); g.fillRect(X, Y + 10, 16, 1); g.fillStyle = '#fff'; g.fillRect(X + 3, Y + 7, 3, 1); }
      else { g.fillRect(X + 5, Y, 6, 16); g.fillStyle = '#9adcf0'; g.fillRect(X + 5, Y, 1, 16); g.fillRect(X + 10, Y, 1, 16); g.fillStyle = '#fff'; g.fillRect(X + 7, Y + 3, 1, 3); }
      continue;
    }
    const wood = '#9a6332', dark = '#5c3a1a';
    if (!d.open) {
      if (d.horiz) { g.fillStyle = dark; g.fillRect(X, Y + 6, 16, 4); g.fillStyle = wood; g.fillRect(X, Y + 6, 16, 3); g.fillStyle = '#ffd84a'; g.fillRect(X + 12, Y + 7, 1, 1); }
      else { g.fillStyle = dark; g.fillRect(X + 6, Y, 4, 16); g.fillStyle = wood; g.fillRect(X + 6, Y, 3, 16); g.fillStyle = '#ffd84a'; g.fillRect(X + 7, Y + 12, 1, 1); }
    } else if (d.horiz) { const yy = d.side > 0 ? Y + 8 : Y - 6; g.globalAlpha = 0.6; g.fillStyle = wood; g.fillRect(X, yy, 2, 14); g.globalAlpha = 1; }
    else { const xx = d.side > 0 ? X + 8 : X - 6; g.globalAlpha = 0.6; g.fillStyle = wood; g.fillRect(xx, Y, 14, 2); g.globalAlpha = 1; }
  }
}
function drawPickup(g, k) {
  g.save(); g.translate(Math.round(k.x), Math.round(k.y)); g.rotate(k.rot);
  if (!k.flying) {
    g.globalAlpha = 0.45 + (Math.sin(T * 7) + 1) * 0.25;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(weapSprite(k.id, true), -16 + dx, -8 + dy);
    g.globalAlpha = 1;
  }
  g.drawImage(weapSprite(k.id), -16, -8);
  g.restore();
}
function drawHandPointing(g, x, y, ang, big) {
  const flip = Math.cos(ang) < 0;
  const img = big ? (flip ? SPR.handBigF : SPR.handBig) : (flip ? SPR.handMidF : SPR.handMid);
  g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(ang);
  g.drawImage(img, -Math.round(img.width * 0.6), -Math.round(img.height / 2));
  g.restore();
}
function drawDynamicTiles(g) {
  // Wasser
  g.fillStyle = 'rgba(255,255,255,0.7)';
  const tk = Math.floor(T * 3);
  for (const i of G.water) if (hash(i, tk) > 0.75) g.fillRect((i % G.w) * TS + Math.floor(hash(tk, i) * 12), ((i / G.w) | 0) * TS + Math.floor(hash(i + 7, tk) * 14), 3, 1);
  // Tanzfläche
  const beat = Math.floor(T * 2.07);
  for (const i of G.dance) {
    const x = i % G.w, y = (i / G.w) | 0;
    const hsh = hash(x + beat * 7, y + beat * 3);
    if (hsh < 0.45) continue;
    g.fillStyle = `hsla(${(hsh * 360 + beat * 40) % 360},100%,60%,0.55)`;
    g.fillRect(x * TS + 1, y * TS + 1, 14, 14);
  }
  // Förderbänder
  for (const i of G.belts) {
    const X = (i % G.w) * TS, Y = ((i / G.w) | 0) * TS, dir = G.tiles[i] === '>' ? 1 : -1;
    g.fillStyle = '#26262c'; g.fillRect(X, Y + 2, 16, 12);
    g.fillStyle = '#4a4a56';
    const off = ((T * 46 * dir) % 8 + 8) % 8;
    for (let k = -8; k < 16; k += 8) { const xx = X + k + off; if (xx >= X && xx < X + 15) g.fillRect(Math.round(xx), Y + 3, 1, 10); }
    g.fillStyle = '#ffd23f'; g.fillRect(X, Y + 2, 16, 1); g.fillRect(X, Y + 13, 16, 1);
  }
  // Tresore
  for (const key in G.safes) {
    const i = +key; if (G.tiles[i] !== 'Z') continue;
    const X = (i % G.w) * TS, Y = ((i / G.w) | 0) * TS, s = G.safes[key];
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X + 2, Y + 2, 15, 15);
    g.fillStyle = '#4a4e58'; g.fillRect(X, Y, 15, 15);
    g.fillStyle = '#6a707c'; g.fillRect(X + 1, Y + 1, 13, 13);
    g.fillStyle = '#2a2e36'; g.fillRect(X + 3, Y + 3, 9, 9);
    pxEll(g, X + 7, Y + 7, 2, 2, '#ffd700');
    for (let k = 0; k < 4 - s.hp; k++) { g.fillStyle = '#111'; g.fillRect(X + 2 + k * 3, Y + 2 + ((k * 5) % 9), 2, 1); }
  }
  // Laser
  for (const i of G.lasers) {
    const gid = G.laserGroup[i], on = laserOn(gid), warn = laserWarn(gid);
    if (!on && !warn) continue;
    const x = i % G.w, y = (i / G.w) | 0, X = x * TS, Y = y * TS;
    const horiz = T_(x - 1, y) === 'l' || T_(x + 1, y) === 'l' || !(T_(x, y - 1) === 'l' || T_(x, y + 1) === 'l');
    g.fillStyle = on ? `rgba(255,30,60,${0.75 + Math.sin(T * 40) * 0.2})` : `rgba(255,30,60,${0.25 + Math.sin(T * 60) * 0.2})`;
    if (horiz) { g.fillRect(X, Y + 7, 16, on ? 2 : 1); if (on) { g.fillStyle = 'rgba(255,120,140,0.35)'; g.fillRect(X, Y + 5, 16, 6); } }
    else { g.fillRect(X + 7, Y, on ? 2 : 1, 16); if (on) { g.fillStyle = 'rgba(255,120,140,0.35)'; g.fillRect(X + 5, Y, 6, 16); } }
  }
  // Wireshark-PCs
  for (const i of G.terminals) {
    const X = (i % G.w) * TS, Y = ((i / G.w) | 0) * TS;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X + 2, Y + 3, 15, 14);
    g.fillStyle = '#5a3a20'; g.fillRect(X, Y + 4, 16, 11);
    g.fillStyle = '#1a1a22'; g.fillRect(X + 2, Y, 12, 9);
    g.fillStyle = G.hacked ? '#1a5a2a' : '#1f6fd0'; g.fillRect(X + 3, Y + 1, 10, 7);
    g.fillStyle = '#9fe0ff'; for (let k = 0; k < 3; k++) g.fillRect(X + 4, Y + 2 + k * 2, 4 + ((Math.floor(T * 6) + k) % 5), 1);
    g.fillStyle = '#ddd'; g.fillRect(X + 3, Y + 11, 10, 2);
    if (!G.hacked) { const bob = Math.round(Math.sin(T * 5) * 2); txt('[E]', X + 8, Y - 12 + bob, { g, font: FS, align: 'center', color: '#3fd0ff' }); }
  }
  for (const i of G.locked) {
    if (G.tiles[i] !== 'L') continue;
    const X = (i % G.w) * TS, Y = ((i / G.w) | 0) * TS;
    g.fillStyle = '#3a3e48'; g.fillRect(X, Y, 16, 16);
    g.fillStyle = '#5a606c'; g.fillRect(X + 2, Y + 2, 12, 12);
    g.fillStyle = '#2a2e36'; g.fillRect(X + 7, Y + 1, 2, 14);
    g.fillStyle = Math.floor(T * 3) % 2 ? '#ff2a3a' : '#7a0a14'; g.fillRect(X + 11, Y + 3, 2, 2);
    g.fillStyle = '#ffd23f'; g.fillRect(X + 2, Y + 13, 12, 1);
  }
  // Geld & Extraleben
  for (const c of G.cashes) {
    const x = Math.round(c.x), y = Math.round(c.y - Math.abs(Math.sin(c.t * 4)) * 2);
    g.fillStyle = '#1a5a1a'; g.fillRect(x - 4, y - 2, 8, 5);
    g.fillStyle = '#5fd35a'; g.fillRect(x - 3, y - 2, 6, 4);
    g.fillStyle = '#1a5a1a'; g.fillRect(x - 1, y - 1, 2, 2);
    if (Math.floor(c.t * 3) % 4 === 0) { g.fillStyle = '#fff'; g.fillRect(x + 2, y - 2, 1, 1); }
  }
  for (const o of G.oneUps) {
    const y = Math.round(o.y - 2 + Math.sin(o.t * 4) * 2), x = Math.round(o.x);
    drawHeart(g, x - 4, y - 4, 1, '#ff3b5a');
    txt('1UP', x, y - 13, { g, font: FS, align: 'center', color: neon(0) });
  }
}
function drawHeart(g, x, y, s, col) {
  const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  g.fillStyle = col;
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') g.fillRect(x + i * s, y + j * s, s, s); });
}
function drawTrains(g) {
  for (const ln of G.lanes) {
    const top = ln.y0 * TS, h = (ln.y1 - ln.y0 + 1) * TS;
    if (ln.state === 'warn' && Math.floor(T * 8) % 2 === 0) {
      g.fillStyle = 'rgba(255,40,40,0.25)'; g.fillRect(0, top, G.w * TS, h);
      for (let x = 8; x < G.w * TS; x += 96) { g.fillStyle = '#ff2a2a'; g.fillRect(x, top - 4, 4, 3); g.fillRect(x, top + h + 1, 4, 3); }
    }
    if (ln.state !== 'pass') continue;
    const x0 = ln.dir > 0 ? ln.x - TRAIN_LEN : ln.x;
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x0 + 4, top + 4, TRAIN_LEN, h);
    for (let c = 0; c < 3; c++) {
      const cx = x0 + c * (TRAIN_LEN / 3);
      g.fillStyle = '#c8ccd4'; g.fillRect(cx + 1, top + 1, TRAIN_LEN / 3 - 3, h - 2);
      g.fillStyle = '#ffd23f'; g.fillRect(cx + 1, top + h / 2 - 2, TRAIN_LEN / 3 - 3, 4);
      g.fillStyle = '#2a3a5a'; for (let wx = 6; wx < TRAIN_LEN / 3 - 10; wx += 14) { g.fillRect(cx + wx, top + 3, 9, 5); g.fillRect(cx + wx, top + h - 8, 9, 5); }
    }
    const front = ln.dir > 0 ? x0 + TRAIN_LEN - 3 : x0;
    g.fillStyle = '#fff6a0'; g.fillRect(front, top + 3, 3, 4); g.fillRect(front, top + h - 7, 3, 4);
  }
}
function drawDarkness() {
  if (!G.darkC) { const [c, g] = mkCanvas(W, H); G.darkC = c; G.darkG = g; }
  const g = G.darkG, z = G.cam.z || 1;
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(0,0,6,0.93)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out';
  for (const p of G.players) {
    if (!p.alive) continue;
    const s = worldToScreen(p.x, p.y), a = p.a + G.cam.rot;
    const grd = g.createRadialGradient(s.x, s.y, 10, s.x, s.y, 210 * z);
    grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(s.x, s.y); g.arc(s.x, s.y, 220 * z, a - 0.5, a + 0.5); g.closePath(); g.fill();
    const grd2 = g.createRadialGradient(s.x, s.y, 4, s.x, s.y, 34 * z);
    grd2.addColorStop(0, 'rgba(0,0,0,1)'); grd2.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd2; g.beginPath(); g.arc(s.x, s.y, 34 * z, 0, TAU); g.fill();
  }
  for (const b of G.bullets) { const q = worldToScreen(b.x, b.y); g.beginPath(); g.arc(q.x, q.y, 10, 0, TAU); g.fill(); }
  for (const q of G.parts) if (q.kind === 'flash') { const zz = worldToScreen(q.x, q.y); g.beginPath(); g.arc(zz.x, zz.y, 40, 0, TAU); g.fill(); }
  ctx.drawImage(G.darkC, 0, 0);
}

// neue Gegnerart zeichnet sich selbst? (true = fertig)
function enemyExtDraw(g, e) { const EX = ENEMY_EXT[e.kind]; return !!(EX && EX.draw && extCall(EX.draw, g, e)); }
function renderWorld() {
  drawBackground();
  const c = G.cam, p = G.player;
  ctx.save();
  const sx = (Math.random() - 0.5) * G.shake * 2, sy = (Math.random() - 0.5) * G.shake * 2;
  ctx.translate(Math.round(W / 2 + sx), Math.round(H / 2 + sy));
  if (c.z && c.z !== 1) ctx.scale(c.z, c.z);
  ctx.rotate(c.rot);
  ctx.translate(-Math.round(c.x), -Math.round(c.y));
  const z = c.z || 1, vw = W / z * 0.62 + 24, vh = H / z * 0.62 + 40;
  const vx0 = Math.max(0, Math.floor(c.x - vw)), vy0 = Math.max(0, Math.floor(c.y - vh));
  const vx1 = Math.min(G.w * TS, Math.ceil(c.x + vw)), vy1 = Math.min(G.h * TS, Math.ceil(c.y + vh));
  const crop = (img) => { if (vx1 > vx0 && vy1 > vy0) ctx.drawImage(img, vx0, vy0, vx1 - vx0, vy1 - vy0, vx0, vy0, vx1 - vx0, vy1 - vy0); };
  crop(G.floorC);
  drawDecals(ctx, vx0, vy0, vx1, vy1);
  drawDynamicTiles(ctx);
  if (G.cleared) {
    ctx.fillStyle = `rgba(255,63,164,${0.35 + Math.sin(T * 6) * 0.2})`;
    for (const i of G.exits) ctx.fillRect((i % G.w) * TS, ((i / G.w) | 0) * TS, TS, TS);
  }
  drawDoors(ctx);
  if (typeof drawHazards === 'function') drawHazards(ctx);
  for (const k of G.pickups) if (!k.flying) drawPickup(ctx, k);
  drawWaves(ctx);
  if (perk('eagle') && p.alive) {
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.state === 'down' || e.kind === 'B' || e.kind === 'V') continue;
      ctx.fillStyle = e.state === 'alert' ? 'rgba(255,40,40,0.13)' : 'rgba(255,255,120,0.08)';
      const half = e.kind === 'K' ? 1.6 : e.kind === 'N' ? 0.7 : 1.15;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, 70, e.a - half, e.a + half); ctx.fill();
    }
  }
  for (const e of G.enemies) if (e.state === 'down' && !enemyExtDraw(ctx, e)) drawHuman(ctx, e);
  drawPet(ctx);
  for (const e of G.enemies) {
    if (e.state === 'dead' || e.state === 'down' || e.flying) continue;
    if (enemyExtDraw(ctx, e)) continue;
    if (e.kind === 'K') drawDog(ctx, e, false);
    else if (e.kind === 'B') drawBoss(ctx, e);
    else if (e.static) drawMachine(ctx, e, false);
    else drawHuman(ctx, e);
  }
  for (const q of G.players) {
    if (!q.alive) continue;
    drawHuman(ctx, q);
    if (q.fingerT > 0) {
      const t = q.fingerT / 0.7, kick = t > 0.8 ? -Math.round((t - 0.8) * 30) : 0;
      drawHandPointing(ctx, q.x + Math.cos(q.a) * (14 + kick), q.y + Math.sin(q.a) * (14 + kick), q.a - (t > 0.85 ? 0.4 : 0), true);
    }
    if (q.spinT > 0) { ctx.fillStyle = `rgba(255,210,60,${clamp(q.spinT / 0.45, 0, 1) * 0.6})`; ctx.fillRect(Math.round(q.x + Math.cos(q.a) * 14) - 1, Math.round(q.y + Math.sin(q.a) * 14) - 1, 3, 3); }
  }
  drawBooms(ctx);
  for (const k of G.pickups) if (k.flying) drawPickup(ctx, k);
  for (const b of G.bullets) {
    if (drawNewBullet(ctx, b)) continue;
    if (b.kind === 'wurst') {
      ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(Math.atan2(b.vy, b.vx));
      pxEll(ctx, 0, 0, 5, 2, '#a0522d'); ctx.fillStyle = '#ffcc00'; ctx.fillRect(-3, 0, 6, 1); ctx.restore();
    } else if (b.kind === 'card') {
      ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(T * 12);
      ctx.fillStyle = '#fff'; ctx.fillRect(-3, -4, 6, 8); ctx.fillStyle = '#e01b3c'; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    } else if (b.kind === 'ramen') {
      ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(T * 5);
      pxEll(ctx, 0, 0, 5, 4, '#f4f4f4'); pxEll(ctx, 0, 0, 4, 3, '#e8b84a'); ctx.fillStyle = '#c41f2a'; ctx.fillRect(-4, -4, 8, 1); ctx.fillStyle = '#7a4a1a'; ctx.fillRect(1, -3, 1, 5);
      ctx.restore();
    } else if (b.kind === 'baka') {
      txt('BAK'[Math.abs(Math.floor(b.vx * 0.37 + b.vy * 0.11)) % 3], b.x, b.y - 4, { font: FB, align: 'center', color: '#ff6fb5', outline: '#3a0020' });
    } else if (b.kind === 'flame') {
      const k = clamp(b.life / 0.4, 0, 1);
      ctx.fillStyle = `rgba(255,${Math.round(120 + 120 * k)},40,${0.4 + 0.5 * k})`;
      ctx.beginPath(); ctx.arc(b.x, b.y, 2 + (1 - k) * 5, 0, TAU); ctx.fill();
    } else if (b.kind === 'bolt' || b.kind === 'nail') {
      const a = Math.atan2(b.vy, b.vx), L = b.kind === 'bolt' ? 8 : 4;
      ctx.strokeStyle = b.kind === 'bolt' ? '#8a5a2a' : '#c0c0cc'; ctx.lineWidth = b.kind === 'bolt' ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(b.x - Math.cos(a) * L, b.y - Math.sin(a) * L); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = '#e8e8f0'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
    } else if (b.kind === 'juice') {
      ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(T * 14); drawWeaponShape(ctx, 'osaft'); ctx.restore();
    } else if (b.kind === 'pen') {
      const a = Math.atan2(b.vy, b.vx);
      ctx.strokeStyle = '#e01b3c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x - Math.cos(a) * 6, b.y - Math.sin(a) * 6); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
    } else if (b.kind === 'letter') {
      txt('ÄHM'[Math.abs(Math.floor(b.vx * 0.37 + b.vy * 0.11)) % 3], b.x, b.y - 4, { font: FB, align: 'center', color: '#ffe14d', outline: '#5a0010' });
    } else if (b.kind === 'paper') {
      ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(T * 6 + b.sx);
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(-3, -4, 6, 8); ctx.fillStyle = '#e01b3c'; ctx.fillRect(-2, -2, 4, 1); ctx.fillStyle = '#888'; ctx.fillRect(-2, 0, 4, 1);
      ctx.restore();
    } else if (b.kind === 'packet') {
      drawEnvelope(ctx, b.x, b.y, '#ffd23f');
    } else if (b.kind === 'bit') {
      txt(Math.floor(b.sx + b.sy) % 2 ? '1' : '0', b.x, b.y - 4, { font: FS, align: 'center', color: '#39ff7a', outline: '#002a0a' });
    } else {
      const laser = b.kind === 'laser';
      ctx.strokeStyle = laser ? (b.owner === 'player' ? '#39ff7a' : '#ff2a5a') : b.owner === 'player' ? '#fff3a0' : '#ffb070';
      ctx.lineWidth = laser ? 2 : 1.5;
      const k = laser ? 0.03 : 0.018;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * k, b.y - b.vy * k); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  for (const e of G.enemies) if (e.flying && e.state !== 'dead' && !enemyExtDraw(ctx, e)) drawMachine(ctx, e, false);
  for (const q of G.parts) {
    if (q.kind === 'flash') { ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (q.life / q.max), 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
  }
  floorModsCall('draw', ctx);   // Etagen-Mods: Weltkoordinaten
  gfxLevelGlow(ctx);
  drawTrains(ctx);
  crop(G.wallC);
  // Eulen-Maske: Gegner durch Wände sehen
  if (G.player && G.player.alive && hasMask(G.player, 'eule')) for (const e of G.enemies) if (e.state !== 'dead' && e.kind !== 'B') { ctx.strokeStyle = 'rgba(255,70,70,0.75)'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(e.x) - 5.5, Math.round(e.y) - 5.5, 11, 11); }
  // Laservisier aus der Werkstatt
  for (const q of G.players) if (q.alive && q.weapon && WEAPONS[q.weapon.id] && WEAPONS[q.weapon.id].ranged && wmod(q.weapon.id, 'laser')) {
    const ca = Math.cos(q.a), sa = Math.sin(q.a); let ex = q.x + ca * 10, ey = q.y + sa * 10;
    for (let k = 0; k < 40; k++) { const nx = ex + ca * 5, ny = ey + sa * 5; if (blocksSightTile(Math.floor(nx / TS), Math.floor(ny / TS))) break; ex = nx; ey = ny; }
    ctx.strokeStyle = 'rgba(255,40,40,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x + ca * 10, q.y + sa * 10); ctx.lineTo(ex, ey); ctx.stroke();
  }
  if (p.alive && p.execT <= 0) {
    const k = nearestPickup(p.x, p.y, 15);
    if (k) txt('[RMB] ' + WEAPONS[k.id].name, k.x, k.y - 16, { font: FS, align: 'center', color: '#7ff' });
    for (const e of G.enemies) {
      const ok = e.state === 'down' || (e.kind === 'B' && e.state !== 'dead' && bossStunned(e));
      if (ok && dist(p.x, p.y, e.x, e.y) < (e.kind === 'B' ? 30 : 20)) { txt('[LEERTASTE]', e.x, e.y + 10, { font: FS, align: 'center', color: '#ffe14d' }); break; }
    }
  }
  for (const e of G.enemies) {
    if (e.state === 'dead' || e.sayT <= 0) continue;
    txt(e.sayText, e.x, e.y - (e.kind === 'B' ? 30 : 20), { font: FS, align: 'center', color: e.kind === 'B' ? '#ffd84a' : '#ffffff' });
  }
  for (const t of G.texts) {
    ctx.globalAlpha = clamp(1 - (t.t / t.max) ** 2, 0, 1);
    txt(t.text, t.x, t.y, { font: t.small ? FS : FB, align: 'center', color: t.color === 'rainbow' ? (i) => neon(i) : t.color });
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (G.dark) drawDarkness();
  if (G.TH.strobe && Math.floor(T * 4.14) % 4 === 0) { ctx.fillStyle = `hsla(${(T * 200) % 360},100%,60%,0.07)`; ctx.fillRect(0, 0, W, H); }
  if (G.TH.glitch && Math.random() < (G.boss && G.boss.phase === 3 ? 0.25 : 0.06)) {
    const y = randi(0, H - 10), h = randi(2, 10);
    ctx.drawImage(canvas, 0, y, W, h, randi(-8, 8), y, W, h);
  }
  if (G.focusT > 0) { ctx.fillStyle = 'rgba(80,140,255,0.12)'; ctx.fillRect(0, 0, W, H); }
  drawVignette();
  floorModsCall('drawScreen', ctx);   // Etagen-Mods: Bildschirmkoordinaten (vor dem HUD)
}
