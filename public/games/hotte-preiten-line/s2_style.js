'use strict';
// =====================================================================
//  STAFFEL 2: DER SAFT-KRIEG - Musik, Masken, Hüte (Präfix s2y_)
//  7 Lieder (s2_party ... s2_finale), 15 Masken (je S2-Level eine,
//  frei nach dem Schaffen von Level li), 6 Hüte im Kiosk.
// =====================================================================

// ---------------------------------------------------------------------
//  Musik (Format: hooks.md 9.1)
// ---------------------------------------------------------------------
// Partymusik: Dur, Four-on-the-floor, hüpfende Melodie
Sound.addSong('s2_party', {
  bpm: 126, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
  kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
  bass: 'x.xx..x.x.xx..x.', arp: 'x.x.x.x.x.x.x.x.', arpType: 'square', arpVol: 0.035,
  lead: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 76, 0, 74, 0, 72, 0, 72, 0, 76, 0, 72, 0, 69, 0, 72, 0, 0, 0, 0, 0, 0, 0,
    77, 0, 81, 0, 77, 0, 72, 0, 74, 0, 72, 0, 69, 0, 67, 0, 71, 0, 74, 0, 79, 0, 77, 0, 74, 0, 71, 0, 67, 0, 0, 0],
  leadType: 'square', leadVol: 0.05,
});
// Schleichen: langsam, Moll, viel Luft, unheimliche Einzeltöne
Sound.addSong('s2_stealth', {
  bpm: 84, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
  kick: 'x.........x.....', snare: '................', hat: '....x.......x...', hatVol: 0.04,
  bass: 'x.......x..x....', bassType: 'triangle', bassOct: '...........x....',
  arp: 'x..x..x..x..x...', arpType: 'triangle', arpVol: 0.035, pad: true,
  lead: [74, 0, 0, 0, 0, 0, 0, 0, 0, 0, 77, 0, 0, 0, 76, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    74, 0, 0, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0, 0, 0, 73, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  leadType: 'sine', leadVol: 0.06,
});
// Action: schnell, treibende Achtel im Bass, harte Leadline
Sound.addSong('s2_action', {
  bpm: 152, chords: [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 50, 54]],
  kick: 'x..x..x.x..x..x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', hatVol: 0.045,
  bass: 'xxxxxxxxxxxxxxxx', bassOct: '.x.x.x.x.x.x.x.x', bassType: 'sawtooth',
  arp: '..x...x...x...x.', arpType: 'square', arpVol: 0.03,
  lead: [76, 0, 76, 0, 79, 0, 76, 0, 74, 0, 71, 0, 74, 0, 76, 0, 72, 0, 72, 0, 76, 0, 72, 0, 71, 0, 67, 0, 71, 0, 72, 0,
    74, 0, 74, 0, 78, 0, 74, 0, 81, 0, 78, 0, 76, 0, 74, 0, 71, 0, 74, 0, 78, 0, 81, 0, 83, 0, 0, 0, 78, 0, 0, 0],
  leadType: 'square', leadVol: 0.045,
});
// Weltraum: verträumt, Sinus-Arpeggio, langsame Melodie
Sound.addSong('s2_space', {
  bpm: 96, chords: [[57, 61, 64], [54, 57, 61], [50, 54, 57], [52, 56, 59]],
  kick: 'x.......x.......', snare: '........x.......', snareVol: 0.14, hat: '..x...x...x...x.', hatVol: 0.035,
  bass: 'x.......x.......', bassType: 'sine', arp: 'xxxxxxxxxxxxxxxx', arpType: 'sine', arpVol: 0.05, pad: true,
  lead: [81, 0, 0, 0, 0, 0, 0, 0, 80, 0, 0, 0, 76, 0, 0, 0, 78, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    74, 0, 0, 0, 76, 0, 0, 0, 78, 0, 0, 0, 0, 0, 0, 0, 76, 0, 0, 0, 0, 0, 0, 0, 71, 0, 0, 0, 0, 0, 0, 0],
  leadType: 'triangle', leadVol: 0.06,
});
// Disco: Oktav-Bass, offene Hi-Hats auf den Offbeats, funky Lead
Sound.addSong('s2_disco', {
  bpm: 118, chords: [[57, 60, 64], [50, 53, 57], [55, 59, 62], [52, 56, 59]],
  kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hatVol: 0.09,
  bass: 'x.x.x.x.x.x.x.x.', bassOct: '..x...x...x...x.', bassType: 'square',
  arp: '.x.x.x.x.x.x.x.x', arpType: 'triangle', arpVol: 0.04, pad: true,
  lead: [76, 0, 0, 76, 0, 0, 74, 0, 72, 0, 74, 0, 76, 0, 0, 0, 74, 0, 0, 74, 0, 0, 72, 0, 69, 0, 72, 0, 74, 0, 0, 0,
    79, 0, 0, 79, 0, 0, 77, 0, 74, 0, 77, 0, 79, 0, 0, 0, 80, 0, 0, 80, 0, 0, 76, 0, 71, 0, 74, 0, 76, 0, 0, 0],
  leadType: 'square', leadVol: 0.045,
});
// Boss: sehr schnell, verminderte Akkorde, Sägezahn überall
Sound.addSong('s2_boss', {
  bpm: 168, chords: [[45, 48, 51], [46, 49, 52], [44, 47, 50], [45, 48, 52]],
  kick: 'x.x.x..xx.x.x..x', snare: '....x.......x.x.', hat: 'x.xxx.xxx.xxx.xx', hatVol: 0.05,
  bass: 'xx.xx.xx.xx.xxx.', bassType: 'sawtooth', arp: 'xxxxxxxxxxxxxxxx', arpType: 'sawtooth', arpVol: 0.025,
  lead: [69, 0, 72, 0, 75, 0, 72, 0, 70, 0, 73, 0, 76, 0, 73, 0, 68, 0, 71, 0, 74, 0, 71, 0, 69, 0, 72, 0, 76, 0, 81, 0,
    81, 0, 80, 0, 81, 0, 0, 0, 82, 0, 81, 0, 79, 0, 0, 0, 80, 0, 77, 0, 74, 0, 71, 0, 69, 0, 0, 0, 68, 0, 69, 0],
  leadType: 'sawtooth', leadVol: 0.04,
});
// Finale: episch, Moll, Fläche + Arpeggio + Helden-Melodie
Sound.addSong('s2_finale', {
  bpm: 138, chords: [[48, 51, 55], [44, 48, 51], [51, 55, 58], [46, 50, 53]],
  kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatVol: 0.05,
  bass: 'x.xx.xx.x.xx.xx.', bassType: 'sawtooth', arp: 'xxxxxxxxxxxxxxxx', arpType: 'triangle', arpVol: 0.04, pad: true,
  lead: [72, 0, 0, 0, 75, 0, 79, 0, 0, 0, 77, 0, 75, 0, 74, 0, 72, 0, 0, 0, 0, 0, 68, 0, 72, 0, 0, 0, 0, 0, 0, 0,
    75, 0, 0, 0, 79, 0, 82, 0, 0, 0, 80, 0, 79, 0, 77, 0, 74, 0, 0, 0, 77, 0, 82, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  leadType: 'square', leadVol: 0.055,
});

// ---------------------------------------------------------------------
//  Masken (eine pro S2-Level, frei nach dem Schaffen von Level li)
// ---------------------------------------------------------------------
// Einige wirken über bestehende Masken (incl), die anderen über S2Y_FX unten.
[
  { id: 's2y_party', name: 'PARTY-GUNZER', desc: 'KILLS: 25% CHANCE AUF KONFETTI-GELD', level: 19 },
  { id: 's2y_mumie', name: 'MUMIE MUMPITZ', desc: 'GEGNER BEMERKEN DICH 50% SPÄTER', level: 20, incl: ['disco'] },
  { id: 's2y_koch', name: 'CHEFKOCH-MÜTZE', desc: 'JEDER 6. KILL: +1 WESTE (MAX 3)', level: 21 },
  { id: 's2y_hai', name: 'KAPITÄN HAI', desc: 'JEDE 5ER-KOMBO: +1 ZEITLUPE', level: 22 },
  { id: 's2y_flasche', name: 'SAFTFLASCHEN-KOPF', desc: 'JEDER KILL FÜLLT 2 SCHUSS NACH', level: 23 },
  { id: 's2y_page', name: 'PAGE PAUL', desc: 'TRINKGELD-MAGNET (+25% GELD)', level: 24, incl: ['magnet'] },
  { id: 's2y_yeti', name: 'YETI YANNICK', desc: '+15% LAUFTEMPO', level: 25, incl: ['hase'] },
  { id: 's2y_astro', name: 'ASTRO-HELM', desc: '+1 WESTE AUF JEDER ETAGE', level: 26, incl: ['zebra'] },
  { id: 's2y_affe', name: 'AFFE AXEL', desc: 'WURF- UND TÜR-KILLS: 3-FACH GELD', level: 27 },
  { id: 's2y_dj', name: 'DJ BASSDROP', desc: 'KOMBO HÄLT DOPPELT SO LANG', level: 28, incl: ['zitrone'] },
  { id: 's2y_oma', name: 'OMAS DAUERWELLE', desc: '+1 LEBEN AUF JEDER ETAGE', level: 29, incl: ['clown'] },
  { id: 's2y_matrose', name: 'SEEMANNS-BART', desc: 'AUFGERISSENE TÜREN TÖTEN', level: 30, incl: ['pferd'] },
  { id: 's2y_gas', name: 'GASMASKE 13', desc: 'SIEHT GEGNER DURCH WÄNDE', level: 31, incl: ['eule'] },
  { id: 's2y_spirale', name: 'ZENTRIFUGEN-SPIRALE', desc: 'ALLE 25 S: +1 ZEITLUPE (MAX 2)', level: 32 },
  { id: 's2y_bitter', name: 'MR. BITTERS ZITRONE', desc: 'GELD + KOMBO + WESTE (SAUER!)', level: 33, incl: ['schwein', 'zitrone', 'zebra'] },
].forEach((m) => addMask(m));

Object.assign(MASK_DRAW, {
  s2y_party: (R, face, eyes) => {   // Gunzer-Gesicht mit Partyhut und Saftfleck
    face('#f0c090'); R(3, 2, 8, 2, '#6a3a18'); R(2, 3, 2, 3, '#6a3a18'); R(10, 3, 2, 3, '#6a3a18');
    R(5, -3, 4, 2, '#3fd0ff'); R(6, -5, 2, 2, '#ffe14d'); R(4, -1, 6, 3, '#ff3fa4'); R(6, -6, 2, 1, '#ffffff');
    eyes(); R(5, 11, 4, 1, '#7a2a1a'); R(9, 12, 2, 2, '#ff9a1a'); R(4, 10, 1, 1, '#c87a50'); R(9, 10, 1, 1, '#c87a50');
  },
  s2y_mumie: (R, face) => {
    face('#e8e0c8'); for (let k = 0; k < 5; k++) R(2 + (k % 2), 4 + k * 2, 9, 1, '#b8ab88');
    R(4, 8, 2, 2, '#111'); R(8, 8, 2, 2, '#111'); R(4, 8, 1, 1, Math.floor(T * 2) % 3 ? '#39ff7a' : '#111'); R(11, 12, 2, 4, '#e8e0c8');
  },
  s2y_koch: (R, face, eyes) => {
    face('#f0c8a0'); R(3, -4, 8, 6, '#ffffff'); R(2, -6, 4, 3, '#ffffff'); R(8, -6, 4, 3, '#ffffff'); R(5, -7, 4, 2, '#ffffff'); R(3, 1, 8, 1, '#d8d8d8');
    eyes(); R(3, 11, 3, 1, '#3a2a1a'); R(8, 11, 3, 1, '#3a2a1a'); R(2, 10, 1, 1, '#3a2a1a'); R(11, 10, 1, 1, '#3a2a1a'); R(6, 12, 2, 1, '#c41f2a');
  },
  s2y_hai: (R, face) => {
    face('#6a8aa8'); R(6, -2, 2, 6, '#5a7a98'); R(5, 0, 1, 4, '#5a7a98'); R(3, 10, 8, 4, '#d8e0e8');
    R(3, 7, 2, 2, '#111'); R(9, 7, 2, 2, '#111'); for (let k = 0; k < 4; k++) R(3 + k * 2, 11, 1, 2, '#ffffff'); R(3, 13, 8, 1, '#7a1a1a');
    R(2, 3, 9, 1, '#2a3a5a'); R(3, 2, 7, 1, '#ffffff');
  },
  s2y_flasche: (R) => {
    R(3, 4, 8, 11, '#ff9a1a'); R(4, 0, 6, 4, '#ffb84a'); R(5, -2, 4, 2, '#3aaa4a'); R(4, 7, 6, 4, '#ffffff'); R(5, 8, 4, 2, '#ff9a1a');
    R(4, 4, 1, 10, '#ffd38a'); R(5, 12, 1, 1, '#111'); R(8, 12, 1, 1, '#111');
  },
  s2y_page: (R, face, eyes) => {
    face('#f0c8a0'); R(3, 0, 8, 3, '#c41f2a'); R(2, 2, 10, 1, '#ffd700'); R(6, 0, 2, 1, '#ffd700');
    eyes(); R(5, 11, 4, 1, '#7a3a2a'); R(4, 14, 6, 2, '#c41f2a'); R(6, 14, 2, 1, '#ffd700');
  },
  s2y_yeti: (R) => {
    R(1, 2, 12, 14, '#f4f8ff'); R(2, 0, 3, 3, '#f4f8ff'); R(9, 0, 3, 3, '#f4f8ff'); R(3, 6, 8, 7, '#8ab0d0');
    R(4, 7, 2, 2, '#111'); R(8, 7, 2, 2, '#111'); R(5, 11, 4, 1, '#2a3a5a'); R(5, 12, 1, 1, '#ffffff'); R(8, 12, 1, 1, '#ffffff');
  },
  s2y_astro: (R) => {
    R(1, 1, 12, 15, '#e8e8f0'); R(2, 0, 10, 1, '#e8e8f0'); R(3, 5, 8, 7, '#1a2a5a');
    R(4, 6, 3, 1, '#bfe6ff'); R(4, 7, 1, 2, '#bfe6ff'); R(9, 9, 1, 1, '#ffffff'); R(2, 13, 2, 2, '#ff3b3b'); R(10, 13, 2, 2, '#3fd0ff'); R(6, -2, 1, 2, '#888');
    R(6, -3, 1, 1, Math.floor(T * 3) % 2 ? '#ff3b3b' : '#5a1a1a');
  },
  s2y_affe: (R, face) => {
    face('#7a4a24'); R(0, 6, 2, 4, '#7a4a24'); R(12, 6, 2, 4, '#7a4a24'); R(0, 7, 1, 2, '#e0b080'); R(13, 7, 1, 2, '#e0b080');
    R(3, 5, 8, 5, '#e0b080'); R(4, 10, 6, 4, '#e0b080'); R(4, 7, 2, 2, '#111'); R(8, 7, 2, 2, '#111');
    R(6, 11, 1, 1, '#3a2010'); R(7, 11, 1, 1, '#3a2010'); R(5, 13, 4, 1, '#3a2010'); R(10, 2, 3, 2, '#ffe14d');
  },
  s2y_dj: (R, face, eyes) => {
    face('#3a2a4a'); R(1, 5, 2, 6, '#111'); R(11, 5, 2, 6, '#111'); R(2, 2, 10, 2, '#111'); R(1, 7, 1, 2, '#ff3fa4'); R(12, 7, 1, 2, '#ff3fa4');
    R(3, 7, 8, 2, '#111'); R(4, 7, 2, 1, '#3fd0ff'); R(8, 7, 2, 1, '#3fd0ff'); R(5, 12, 4, 1, ['#ff3fa4', '#3fd0ff', '#ffe14d'][Math.floor(T * 4) % 3]);
  },
  s2y_oma: (R, face) => {
    face('#f0d0b8'); for (let i = 0; i < 6; i++) R(1 + i * 2, 0 + (i % 2), 3, 3, '#c8b8e8'); R(1, 3, 2, 5, '#c8b8e8'); R(11, 3, 2, 5, '#c8b8e8');
    R(3, 7, 3, 3, '#d8b030'); R(8, 7, 3, 3, '#d8b030'); R(4, 8, 1, 1, '#111'); R(9, 8, 1, 1, '#111'); R(6, 8, 2, 1, '#d8b030');
    R(5, 12, 4, 1, '#c86a8a'); R(3, 11, 1, 1, '#ff9ab5'); R(10, 11, 1, 1, '#ff9ab5');
  },
  s2y_matrose: (R, face, eyes) => {
    face('#e0b090'); R(2, 1, 10, 3, '#ffffff'); R(2, 3, 10, 1, '#1a2a5a'); R(6, 1, 2, 1, '#ffd700');
    eyes(); R(2, 10, 10, 6, '#8a5a32'); R(3, 9, 8, 1, '#8a5a32'); R(5, 11, 4, 1, '#c87a5a'); R(0, 8, 2, 3, '#ffd700');
  },
  s2y_gas: (R) => {
    R(2, 3, 10, 12, '#3a4a3a'); R(3, 2, 8, 1, '#3a4a3a'); R(3, 6, 3, 3, '#aaffcc'); R(8, 6, 3, 3, '#aaffcc'); R(4, 7, 1, 1, '#ffffff'); R(9, 7, 1, 1, '#ffffff');
    R(5, 11, 4, 4, '#222'); R(6, 12, 2, 2, '#555'); R(1, 8, 1, 3, '#222'); R(12, 8, 1, 3, '#222'); R(5, 4, 4, 1, '#ffe14d');
  },
  s2y_spirale: (R, face) => {
    face('#e8e8f0'); const t = Math.floor(T * 6) % 4, cols = ['#ff3fa4', '#111111'];
    for (let k = 0; k < 4; k++) { const c = cols[(k + t) % 2]; R(2 + k, 4 + k, 10 - k * 2, 1, c); R(2 + k, 13 - k, 10 - k * 2, 1, c); R(2 + k, 4 + k, 1, 10 - k * 2, c); R(11 - k, 4 + k, 1, 10 - k * 2, c); }
  },
  s2y_bitter: (R) => {
    R(2, 3, 10, 12, '#ffe14d'); R(3, 2, 8, 1, '#ffe14d'); R(3, 15, 8, 1, '#ffe14d'); R(6, 0, 2, 2, '#ffe14d'); R(6, 16, 2, 1, '#ffe14d');
    R(8, -1, 3, 2, '#3aaa4a'); R(3, 6, 3, 1, '#4a4a52'); R(8, 6, 3, 1, '#4a4a52'); R(4, 8, 2, 1, '#111'); R(8, 8, 2, 1, '#111');
    R(7, 7, 4, 1, '#d8b030'); R(7, 10, 4, 1, '#d8b030'); R(7, 7, 1, 4, '#d8b030'); R(10, 7, 1, 4, '#d8b030');
    R(6, 12, 2, 1, '#7a3a2a'); R(3, 4, 1, 1, '#fff6c0');
  },
});

// ---------- Masken-Wirkungen (Host-Logik über die Etagen-Mod-Verteilung) ----------
// floorModsCall läuft für setup/update/onKill/... jeder Etage (auch ohne Mods). Wir hängen uns an
// und rufen danach S2Y_FX auf. Zustand nur in G.modState.s2y (einfache Daten).
const s2y_wearers = (id) => (G && G.players ? G.players.filter((p) => p.alive && hasMask(p, id)) : []);
const S2Y_FX = {
  setup() { G.modState.s2y = { kills: 0, spin: 0 }; },
  update(dt) {
    const st = G.modState.s2y || (G.modState.s2y = { kills: 0, spin: 0 });
    // Zentrifugen-Spirale: Zeitlupe lädt sich langsam auf
    const sp = s2y_wearers('s2y_spirale');
    if (!sp.length || G.cleared) return;
    st.spin += dt;
    if (st.spin >= 25) {
      st.spin = 0;
      for (const p of sp) if ((p.focus || 0) < 2) { p.focus = (p.focus || 0) + 1; floatText(p.x, p.y - 20, 'ZEITLUPE GELADEN!', '#9ab8ff'); }
    }
  },
  onKill(e, how) {
    const st = G.modState.s2y || (G.modState.s2y = { kills: 0, spin: 0 });
    st.kills++;
    const cash = Math.round((4 + G.diff * 2) * Math.min(Math.max(run.combo || 1, 1), 4));
    // Party-Gunzer: Konfetti-Geld
    if (s2y_wearers('s2y_party').length && Math.random() < 0.25) {
      spawnCash(e.x, e.y, cash, 2);
      for (const c of ['#ff3fa4', '#3fd0ff', '#ffe14d', '#7dff7a']) sparks(e.x, e.y, 3, c);
      floatText(e.x, e.y - 30, 'PARTY-BONUS!', 'rainbow');
    }
    // Affe Axel: Wurf- und Tür-Kills bringen das Dreifache
    if ((how === 'thrown' || how === 'door') && s2y_wearers('s2y_affe').length) {
      spawnCash(e.x, e.y, cash * 2, 3);
      floatText(e.x, e.y - 30, 'UH UH AH AH!', '#ffe14d');
    }
    // Chefkoch: jede 6. Erledigung eine Weste
    if (st.kills % 6 === 0) for (const p of s2y_wearers('s2y_koch')) if ((p.armor || 0) < 3) {
      p.armor = (p.armor || 0) + 1; Sound.play('armor'); floatText(p.x, p.y - 20, 'FRISCH GEKOCHT: +1 WESTE!', '#66ffff');
    }
    // Kapitän Hai: jede 5er-Kombo eine Zeitlupe
    if (run.combo >= 5 && run.combo % 5 === 0) for (const p of s2y_wearers('s2y_hai')) {
      p.focus = (p.focus || 0) + 1; floatText(p.x, p.y - 20, 'HAI-KOMBO: +1 ZEITLUPE!', '#9ab8ff');
    }
    // Saftflaschen-Kopf: 2 Schuss nachfüllen
    for (const p of s2y_wearers('s2y_flasche')) {
      const w = p.weapon, W_ = w && WEAPONS[w.id];
      if (!W_ || !W_.ranged || typeof w.ammo !== 'number') continue;
      const max = playerAmmo(w.id, W_.ammo || 0, p);
      if (w.ammo < max) { w.ammo = Math.min(max, w.ammo + 2); floatText(p.x, p.y - 20, '+2 SCHUSS', '#ffb84a'); }
    }
  },
};
const s2y_origFMC = floorModsCall;
// eslint-disable-next-line no-global-assign
floorModsCall = function (fnName, ...args) {
  const out = s2y_origFMC(fnName, ...args);
  const fx = S2Y_FX[fnName];
  if (fx && G && G.modState) extCall(fx, ...args);
  return out;
};

// ---------------------------------------------------------------------
//  Hüte (Kiosk, Tab HÜTE)
// ---------------------------------------------------------------------
Object.assign(HATS, {
  s2y_koch: { name: 'KOCHMÜTZE', price: 1800 },
  s2y_pudel: { name: 'PUDELMÜTZE', price: 1200 },
  s2y_dj: { name: 'DJ-KOPFHÖRER', price: 3500 },
  s2y_schnorchel: { name: 'TAUCHERBRILLE', price: 2500 },
  s2y_astro: { name: 'RAUMHELM', price: 7500 },
  s2y_zitrone: { name: 'ZITRONEN-ZYLINDER', price: 9000 },
});
Object.assign(HAT_DRAW, {
  s2y_koch: (R) => { R(3, -2, 8, 4, '#ffffff'); R(2, -5, 4, 4, '#ffffff'); R(8, -5, 4, 4, '#ffffff'); R(5, -6, 4, 3, '#ffffff'); R(3, 1, 8, 1, '#d8d8d8'); R(5, -4, 1, 1, '#e8e8e8'); },
  s2y_pudel: (R) => { R(2, -1, 10, 4, '#c41f2a'); R(2, 2, 10, 2, '#ffffff'); for (let i = 0; i < 5; i++) R(2 + i * 2, 0, 1, 2, '#ffffff'); R(5, -4, 4, 3, '#ffffff'); R(6, -5, 2, 1, '#ffffff'); },
  s2y_dj: (R) => { R(2, 0, 10, 2, '#222'); R(1, 1, 2, 2, '#222'); R(11, 1, 2, 2, '#222'); R(0, 5, 3, 6, '#222'); R(11, 5, 3, 6, '#222');
    R(0, 7, 1, 2, ['#ff3fa4', '#3fd0ff', '#ffe14d'][Math.floor(T * 4) % 3]); R(13, 7, 1, 2, ['#3fd0ff', '#ffe14d', '#ff3fa4'][Math.floor(T * 4) % 3]); },
  s2y_schnorchel: (R) => { R(2, 6, 10, 4, '#3fd0ff'); R(3, 7, 3, 2, '#bfefff'); R(8, 7, 3, 2, '#bfefff'); R(1, 7, 1, 2, '#ffd23f'); R(12, 7, 1, 2, '#ffd23f'); R(12, 1, 2, 9, '#ffd23f'); R(12, 0, 2, 1, '#ff3fa4'); },
  s2y_astro: (R, g, x, y, s) => {
    g.strokeStyle = 'rgba(200,240,255,0.85)'; g.lineWidth = Math.max(1, s); g.beginPath(); g.ellipse(x + 7 * s, y + 8 * s, 9 * s, 10 * s, 0, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(160,220,255,0.18)'; g.fill(); R(3, -1, 2, 2, '#ffffff'); R(5, 16, 4, 2, '#888'); R(6, 17, 1, 1, Math.floor(T * 3) % 2 ? '#39ff7a' : '#1a5a2a');
  },
  s2y_zitrone: (R) => { R(3, -7, 8, 7, '#ffe14d'); R(2, -1, 10, 2, '#ffe14d'); R(3, -3, 8, 1, '#3aaa4a'); R(4, -6, 1, 3, '#fff6c0'); R(1, 1, 12, 1, '#c8a800'); R(8, -9, 3, 2, '#3aaa4a'); },
});
