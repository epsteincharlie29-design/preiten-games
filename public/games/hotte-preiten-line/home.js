'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Waffen-Werkstatt, Möbel & Trophäen zuhause
// =====================================================================
const MODS = [
  { id: 'mag', name: 'MAGAZIN', f: 0.4, desc: ['GROSSES MAGAZIN:', '+50% MUNITION FÜR DIESE WAFFE', '(BEIM START UND BEIM AUFHEBEN).'] },
  { id: 'laser', name: 'LASER', f: 0.3, desc: ['LASERVISIER:', 'ROTE ZIELLINIE UND', 'NUR HALB SO VIEL STREUUNG.'] },
  { id: 'silent', name: 'DÄMPFER', f: 0.25, desc: ['SCHALLDÄMPFER:', 'DIESE WAFFE IST VIEL LEISER.', 'GEGNER HÖREN DICH KAUM.'] },
];
const MOD_GUNS = ['pistol', 'magnum', 'uzi', 'shotgun', 'rifle', 'crossbow', 'nailgun', 'minigun'];
const modPrice = (gun, m) => Math.round((WEAPON_PRICES[gun] || 2500) * m.f / 10) * 10;
const FURNITURE = [
  { id: 'palm', name: 'PALME', price: 400, desc: 'GRÜN IST GESUND.' },
  { id: 'poster', name: 'TEBLEEDD-POSTER', price: 600, desc: 'DAMIT DU NIE VERGISST, WORUM ES GEHT.' },
  { id: 'sofa', name: 'PINKES SOFA', price: 800, desc: 'ZUM CHILLEN NACH DEM EINSATZ.' },
  { id: 'disco', name: 'DISCOKUGEL', price: 1200, desc: 'MACHT JEDE BUDE ZUM CLUB.' },
  { id: 'aqua', name: 'AQUARIUM', price: 1500, desc: 'MIT EINEM GOLDFISCH NAMENS GÜNTHER.' },
  { id: 'arcade', name: 'ARCADE-AUTOMAT', price: 2500, desc: 'BLINKT. MACHT GERÄUSCHE. GEIL.' },
  { id: 'tv', name: 'RIESEN-FERNSEHER', price: 3000, desc: 'LÄUFT IMMER: SAFT-TV.' },
  { id: 'toilet', name: 'GOLDENE TOILETTE', price: 7777, desc: 'WEIL DU ES DIR LEISTEN KANNST.' },
];
// Trophäen der Bosse (erscheinen automatisch im Regal)
const TROPHIES = [
  { level: 1, col: '#c41f2a', name: 'GRECHIS BRILLE' }, { level: 3, col: '#a0522d', name: 'GÜNTHERS WURST' },
  { level: 4, col: '#3fd0ff', name: 'KUMIS ROUTER' }, { level: 7, col: '#ffd23f', name: 'CROUPIER-KARTE' },
  { level: 10, col: '#ff7a2a', name: 'BAKA-RAMEN' }, { level: 18, col: '#39ff7a', name: 'DAS TEBLEEDD' },
  { level: 13, col: '#fff04d', name: 'ZITROS SONNENBRILLE' }, { level: 14, col: '#ff2020', name: 'CLOWNSNASE' }, { level: 15, col: '#7dff7a', name: 'REBOOT-KNOPF' },
  { level: 16, col: '#c8a040', name: 'SCHROTTKRONE' }, { level: 17, col: '#ffe14d', name: 'GOLDENER BUZZER' },
];
const hasFurn = (id) => !!(save.furn && save.furn[id]);

// Kiosk-Reiter "WERKSTATT"
function shopWorkshopItems() {
  save.wmods = save.wmods || {};
  const items = [];
  for (const gun of MOD_GUNS) for (const m of MODS) {
    const on = wmod(gun, m.id), price = modPrice(gun, m);
    items.push({ label: WEAPONS[gun].name + ': ' + m.name + (on ? '  [DRAN]' : '  ' + price + '€'), color: on ? '#7dff7a' : save.money >= price ? '#ffffff' : '#aa7777', gun, mod: m,
      act: () => { if (on) { Sound.play('click'); return; } shopBuy(price, () => { (save.wmods[gun] = save.wmods[gun] || {})[m.id] = true; }); } });
  }
  return items;
}
function shopFurnitureItems() {
  save.furn = save.furn || {};
  return FURNITURE.map((f) => ({ label: f.name + (hasFurn(f.id) ? '  [ZUHAUSE]' : '  ' + f.price + '€'), color: hasFurn(f.id) ? '#7dff7a' : save.money >= f.price ? '#ffffff' : '#aa7777', furn: f,
    act: () => { if (hasFurn(f.id)) { Sound.play('click'); return; } shopBuy(f.price, () => { save.furn[f.id] = true; }); } }));
}

// ---------- Zuhause zeichnen (Möbel + Trophäen) ----------
function drawHome(g) {
  const X = (tx) => tx * TS, Y = (ty) => ty * TS;
  // Trophäen-Regal unten (rechts neben der Tür)
  g.fillStyle = '#5a3a1a'; g.fillRect(X(24), Y(23) + 10, 64, 4); g.fillRect(X(18), Y(23) + 10, 54, 4);
  TROPHIES.forEach((t, i) => {
    const x = i < 6 ? X(24) + 4 + i * 10 : X(18) + 4 + (i - 6) * 10, y = Y(23) + 2;
    if (save.unlocked <= t.level) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y + 3, 6, 5); return; }
    g.fillStyle = '#ffd700'; g.fillRect(x, y, 6, 4); g.fillRect(x + 2, y + 4, 2, 3); g.fillRect(x + 1, y + 7, 4, 1);
    g.fillStyle = t.col; g.fillRect(x + 2, y + 1, 2, 2);
  });
  if (hasFurn('palm')) { g.fillStyle = '#6a4a2a'; g.fillRect(X(28) + 5, Y(22) + 8, 6, 7); pxEll(g, X(28) + 8, Y(22) + 4, 7, 5, '#2a8a3a'); pxEll(g, X(28) + 6, Y(22) + 2, 4, 3, '#3aaa4a'); }
  if (hasFurn('poster')) { g.fillStyle = '#111'; g.fillRect(X(21), Y(14) + 2, 22, 13); g.fillStyle = '#3fd0ff'; g.fillRect(X(21) + 2, Y(14) + 4, 18, 9); g.fillStyle = '#fff'; g.fillRect(X(21) + 6, Y(14) + 6, 10, 5); g.fillStyle = '#ff3fa4'; g.fillRect(X(21) + 9, Y(14) + 7, 4, 3); }
  if (hasFurn('sofa')) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X(24) + 2, Y(20) + 4, 48, 12); g.fillStyle = '#c41f73'; g.fillRect(X(24), Y(20) + 2, 46, 12); g.fillStyle = '#ff6fb5'; g.fillRect(X(24) + 2, Y(20) + 5, 42, 7); g.fillStyle = '#c41f73'; g.fillRect(X(24) + 14, Y(20) + 5, 1, 7); g.fillRect(X(24) + 30, Y(20) + 5, 1, 7); }
  if (hasFurn('tv')) { g.fillStyle = '#222'; g.fillRect(X(24) + 2, Y(18) + 2, 42, 10); g.fillStyle = ['#ff9a1a', '#3fd0ff', '#ff3fa4'][Math.floor(T * 2) % 3]; g.fillRect(X(24) + 4, Y(18) + 3, 38, 7); txt('SAFT-TV', X(24) + 23, Y(18) + 3, { g, font: FS, align: 'center', color: '#ffffff', outline: '' }); }
  if (hasFurn('aqua')) { g.fillStyle = '#1a3a6a'; g.fillRect(X(19), Y(22) + 2, 30, 12); g.fillStyle = '#3f8ad0'; g.fillRect(X(19) + 1, Y(22) + 4, 28, 9); const fx = X(19) + 6 + Math.round((Math.sin(T * 1.3) + 1) * 8); g.fillStyle = '#ff9a1a'; g.fillRect(fx, Y(22) + 7, 4, 2); g.fillRect(fx + (Math.cos(T * 1.3) > 0 ? -2 : 4), Y(22) + 6, 2, 4); }
  if (hasFurn('arcade')) { g.fillStyle = '#2a0a4a'; g.fillRect(X(28) + 2, Y(18), 12, 16); g.fillStyle = Math.floor(T * 4) % 2 ? '#39ff7a' : '#ff3fa4'; g.fillRect(X(28) + 4, Y(18) + 2, 8, 6); g.fillStyle = '#e01b3c'; g.fillRect(X(28) + 5, Y(18) + 10, 2, 2); g.fillStyle = '#ffd23f'; g.fillRect(X(28) + 9, Y(18) + 10, 2, 2); }
  if (hasFurn('toilet')) { g.fillStyle = '#ffd700'; g.fillRect(X(18) + 3, Y(15) + 2, 10, 5); pxEll(g, X(18) + 8, Y(15) + 10, 5, 4, '#ffd700'); pxEll(g, X(18) + 8, Y(15) + 10, 3, 2, '#c8a020'); }
  if (hasFurn('disco')) {
    const cx = X(22) + 8, cy = Y(19) + 8;
    for (let k = 0; k < 6; k++) { const a = T * 1.5 + k * TAU / 6, r = 18 + (k % 2) * 10; g.fillStyle = ['rgba(255,63,164,0.35)', 'rgba(63,208,255,0.35)', 'rgba(255,225,77,0.35)'][k % 3]; g.fillRect(Math.round(cx + Math.cos(a) * r) - 2, Math.round(cy + Math.sin(a) * r * 0.7) - 2, 4, 4); }
    pxEll(g, cx, cy, 4, 4, '#d8d8e8'); g.fillStyle = '#ffffff'; g.fillRect(cx - 2, cy - 2, 1, 1);
  }
}
