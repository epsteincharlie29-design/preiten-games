'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Masken (wie in Hotline Miami)
//  Jeder geschaffte Level schaltet eine Maske frei. Auswahl vor dem Einsatz
//  (Level-Karte: A/D oder Pfeile). Jeder Spieler hat seine eigene Maske.
// =====================================================================
const MASKS = [
  { id: 'none', name: 'KEINE MASKE', desc: 'NUR LIL. GANZ NORMAL.', level: -1 },
  { id: 'hase', name: 'HASE RICHARD', desc: '+15% LAUFTEMPO', level: 0 },
  { id: 'schwein', name: 'SPARSCHWEIN', desc: '+25% GELD IM EINSATZ', level: 1 },
  { id: 'pferd', name: 'PFERD DON JUAN', desc: 'AUFGERISSENE TÜREN TÖTEN', level: 2 },
  { id: 'zebra', name: 'ZEBRA ZORRO', desc: '+1 WESTE AUF JEDER ETAGE', level: 3 },
  { id: 'eule', name: 'EULE EBERHARD', desc: 'SIEHT GEGNER DURCH WÄNDE', level: 4 },
  { id: 'disco', name: 'DISCO-KUGEL', desc: 'GEGNER BEMERKEN DICH 50% SPÄTER', level: 6 },
  { id: 'router', name: 'KUMIS ROUTER', desc: '+50% MUNITION', level: 7 },
  { id: 'baka', name: 'BAKA-MASKE', desc: 'DEINE FÄUSTE TÖTEN', level: 10 },
  { id: 'fokus', name: 'GRECHIS BRILLE', desc: '+1 ZEITLUPE AUF JEDER ETAGE', level: 12 },
  { id: 'zitrone', name: 'ZITRONEN-MASKE', desc: 'KOMBO HÄLT DOPPELT SO LANG', level: 13 },
  { id: 'clown', name: 'CLOWNSNASE', desc: '+1 LEBEN AUF JEDER ETAGE', level: 14 },
  { id: 'robo', name: 'ROBO-HUND', desc: 'SCHÜSSE SIND HALB SO LAUT', level: 15 },
  { id: 'magnet', name: 'SCHROTT-KRONE', desc: 'GELD-MAGNET (+25% GELD)', level: 16 },
  { id: 'buzzer', name: 'GOLDENER BUZZER', desc: 'BOSSE SIND 1 S LÄNGER WEHRLOS', level: 17 },
  { id: 'tebleedd', name: 'TEBLEEDD-MASKE', desc: 'TEMPO + WESTE + GELD (ALLES!)', level: 18 },
];
const MASK_BY_ID = {};
for (const m of MASKS) MASK_BY_ID[m.id] = m;
// eigene Masken: addMask({ id, name, desc, level, unlock?, incl? }) + MASK_DRAW[id] = (R, face, eyes, g, x, y, s) => {}
const MASK_DRAW = {};
function addMask(m) { if (MASK_BY_ID[m.id]) return Object.assign(MASK_BY_ID[m.id], m); MASKS.push(m); MASK_BY_ID[m.id] = m; return m; }
const maskUnlocked = (m) => (m.unlock ? !!extCall(m.unlock) : m.level < 0 || save.unlocked > m.level);
// Maske einer Figur: Spieler-Objekte tragen ihre Maske, Lil in der Stadt die gespeicherte
function maskOf(p) {
  if (!p) return 'none';
  if (p.mask !== undefined) return p.mask || 'none';
  return p.isPlayer && !p.idx ? save.mask || 'none' : 'none';
}
function hasMask(p, id) {
  const m = maskOf(p);
  return m === id || (m === 'tebleedd' && (id === 'hase' || id === 'zebra' || id === 'schwein')) || !!(MASK_BY_ID[m] && MASK_BY_ID[m].incl && MASK_BY_ID[m].incl.includes(id));
}
const anyMask = (id) => G && G.players && G.players.some((q) => hasMask(q, id));
// Maske auf den Kopf malen (x,y = linke obere Ecke vom Kopf, s = Pixelgröße)
function drawMask(g, id, x, y, s) {
  if (!id || id === 'none') return;
  const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + a * s), Math.round(y + b * s), Math.ceil(w * s), Math.ceil(h * s)); };
  const face = (c) => { R(2, 4, 10, 10, c); R(3, 3, 8, 12, c); };
  const eyes = (c = '#111') => { R(4, 8, 2, 2, c); R(8, 8, 2, 2, c); };
  switch (id) {
    case 'hase': face('#f4f4f4'); R(3, -4, 2, 8, '#f4f4f4'); R(9, -4, 2, 8, '#f4f4f4'); R(4, -3, 1, 6, '#ff9ad5'); R(10, -3, 1, 6, '#ff9ad5'); eyes(); R(6, 11, 2, 1, '#ff6fb5'); break;
    case 'schwein': face('#ff9ad5'); eyes(); R(5, 10, 4, 3, '#e86aa5'); R(5, 11, 1, 1, '#7a2a4a'); R(8, 11, 1, 1, '#7a2a4a'); R(2, 2, 2, 2, '#ff9ad5'); R(10, 2, 2, 2, '#ff9ad5'); break;
    case 'pferd': face('#8a5a32'); R(4, 13, 6, 3, '#8a5a32'); R(5, 3, 4, 2, '#3a2010'); R(6, 6, 2, 7, '#f0f0f0'); eyes(); R(3, 1, 2, 3, '#8a5a32'); R(9, 1, 2, 3, '#8a5a32'); break;
    case 'zebra': face('#f4f4f4'); for (let k = 0; k < 4; k++) R(2, 4 + k * 3, 10, 1, '#111'); eyes('#ff3b3b'); break;
    case 'eule': face('#8a6a3a'); R(3, 6, 4, 4, '#ffd23f'); R(7, 6, 4, 4, '#ffd23f'); R(4, 7, 2, 2, '#111'); R(8, 7, 2, 2, '#111'); R(6, 10, 2, 2, '#ff9a1a'); R(2, 2, 2, 3, '#5a4020'); R(10, 2, 2, 3, '#5a4020'); break;
    case 'disco': face('#c8c8d8'); for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) R(2 + i * 2, 4 + j * 2, 2, 2, ['#ff3fa4', '#3fd0ff', '#ffe14d', '#ffffff'][(i * 3 + j + Math.floor(T * 6)) % 4]); eyes(); break;
    case 'router': face('#2a3a4a'); R(3, 0, 1, 4, '#888'); R(10, 0, 1, 4, '#888'); for (let k = 0; k < 4; k++) R(3 + k * 2, 12, 1, 1, Math.floor(T * 5 + k) % 2 ? '#39ff7a' : '#1a5a2a'); eyes('#39ff7a'); break;
    case 'baka': R(2, 3, 10, 6, '#ff7a2a'); R(2, 3, 2, 10, '#ff7a2a'); R(10, 3, 2, 10, '#ff7a2a'); R(5, 9, 1, 3, '#ff7a2a'); R(8, 9, 1, 3, '#ff7a2a'); break;
    case 'fokus': R(2, 7, 4, 3, '#c41f2a'); R(8, 7, 4, 3, '#c41f2a'); R(6, 8, 2, 1, '#c41f2a'); R(3, 8, 2, 1, '#bfefff'); R(9, 8, 2, 1, '#bfefff'); break;
    case 'zitrone': face('#fff04d'); R(6, 1, 2, 3, '#3aaa4a'); R(8, 1, 3, 2, '#3aaa4a'); R(4, 8, 2, 2, '#111'); R(8, 8, 2, 2, '#111'); R(5, 12, 4, 1, '#a08a10'); R(4, 11, 1, 1, '#a08a10'); R(9, 11, 1, 1, '#a08a10'); break;
    case 'clown': face('#f4f4f4'); R(1, 3, 2, 5, '#ff3fa4'); R(11, 3, 2, 5, '#3fd0ff'); R(4, 2, 6, 2, '#7dff7a'); eyes(); R(6, 10, 2, 2, '#ff2020'); R(4, 12, 6, 1, '#e01b3c'); break;
    case 'robo': face('#8a8a9a'); R(3, 7, 8, 3, '#1a1a22'); R(4, 8, 6, 1, Math.floor(T * 4) % 2 ? '#ff2a3a' : '#aa1a2a'); R(6, 0, 2, 3, '#5a5a68'); R(6, -1, 2, 1, '#7dff7a'); R(4, 12, 6, 1, '#5a5a68'); break;
    case 'magnet': face('#7a5a3a'); R(2, 1, 2, 4, '#c8a040'); R(6, 0, 2, 4, '#c8a040'); R(10, 1, 2, 4, '#c8a040'); R(2, 4, 10, 2, '#c8a040'); R(6, 2, 2, 1, '#ff3b3b'); eyes('#ffe14d'); R(4, 12, 6, 2, '#3a2410'); break;
    case 'buzzer': face('#3a1a5a'); R(3, 4, 8, 3, '#e8c547'); eyes('#ffffff'); R(5, 11, 4, 2, ['#ff3b3b', '#3f8bff', '#3fdc5a', '#ffe14d'][Math.floor(T * 3) % 4]); break;
    case 'tebleedd': R(2, 3, 10, 12, '#1a2a4a'); R(3, 4, 8, 10, '#3fd0ff'); for (let k = 0; k < 6; k++) R(4 + (k % 3) * 2, 6 + Math.floor(k / 3) * 3, 1, 2, (k + Math.floor(T * 4)) % 2 ? '#ffffff' : '#1a5a8a'); break;
    default: if (MASK_DRAW[id]) extCall(MASK_DRAW[id], R, face, eyes, g, x, y, s);
  }
}
// Auswahl auf der Level-Karte (Host) bzw. beim Online-Gast
function maskPicker(y) {
  const ms = MASKS.filter(maskUnlocked);
  if (ms.length <= 1) return false;
  let i = ms.findIndex((m) => m.id === (save.mask || 'none'));
  if (i < 0) i = 0;
  if (uiActive() && (pressed.KeyA || pressed.ArrowLeft)) { i = (i + ms.length - 1) % ms.length; save.mask = ms[i].id; persist(); Sound.play('blip', true); }
  if (uiActive() && (pressed.KeyD || pressed.ArrowRight)) { i = (i + 1) % ms.length; save.mask = ms[i].id; persist(); Sound.play('blip', true); }
  const m = ms[i];
  ctx.drawImage(SPR.headC, W / 2 - 150, y - 4, 28, 36);
  drawMask(ctx, m.id, W / 2 - 150, y - 4, 2);
  txt('MASKE:  < ' + m.name + ' >   (A/D)', W / 2 + 10, y, { align: 'center', color: '#ffe14d' });
  txt(m.desc, W / 2 + 10, y + 14, { font: FS, align: 'center', color: '#cccccc' });
  return true;
}
