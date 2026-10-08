'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Offene Stadt: Karte und statische Grafik
//  Kartenzeichen der Stadt:
//   g Wiese  = Straße  _ Gehweg  P Platz  R Dach (Gebäude)  # Mauer  D Tür
//   T Baum  ~ Wasser  . Holzboden  , Teppich  : Fliesen
//   Stationen: b Bett  v Konsole/TV  F Telefon  A Anleitung  c Kiosk-Theke
//              J Blackjack  O Glücksrad  S Spielautomat  V Roulette  H Höher/Tiefer  Y Bar/Regal
//   Saftfabrik: o Pflanzkübel  z Saftpresse  x Mixtisch  k Kühlschrank  q Kasse  n Personal
//   G Gartencenter-Theke   j Saftstand im Park   W Autohaus-Theke   u Kübel im Gewächshaus
//   a Sand (Strand)   e Schnellreise-Tafel (in den Wohnungen)
//   Land: m Wiese  l Acker  w Feldweg  h Zaun  Q Orangenbaum   i Betonboden (innen)
//   p Lieferkiste   M Großmarkt-Theke   N Export-Rampe
// =====================================================================
const CW = 220, CH = 110;
const CITY_SOLID = 'R#T~bvFAcJOSVHYozxkqnGjWufdKehQpMN';
const STATION_INFO = {
  b: { type: 'bed', label: 'SCHLAFEN (SPEICHERN)' },
  v: { type: 'console', label: 'SPIELKONSOLE: MULTIPLAYER' },
  F: { type: 'phone', label: 'TELEFON' },
  A: { type: 'guide', label: 'ANLEITUNG LESEN' },
  c: { type: 'shop', label: 'KIOSK: HERZEN, PERKS, WAFFEN & HÜTE' },
  J: { type: 'blackjack', label: 'BLACKJACK SPIELEN' },
  O: { type: 'wheel', label: 'GLÜCKSRAD DREHEN' },
  S: { type: 'slots', label: 'SPIELAUTOMAT' },
  V: { type: 'roulette', label: 'ROULETTE' },
  H: { type: 'cards', label: 'HÖHER ODER TIEFER' },
  o: { type: 'pot', label: 'PFLANZKÜBEL' },
  z: { type: 'press', label: 'SAFTPRESSE: FRÜCHTE PRESSEN' },
  x: { type: 'mixer', label: 'MIXTISCH' },
  k: { type: 'fridge', label: 'KÜHLSCHRANK / BOOSTER' },
  q: { type: 'register', label: 'KASSE: GELD ABHOLEN' },
  n: { type: 'staff', label: 'PERSONAL EINSTELLEN' },
  G: { type: 'garden', label: 'GARTENCENTER: SAMEN, ZUTATEN, UPGRADES' },
  j: { type: 'stand', label: 'SAFT-STAND' },
  W: { type: 'autohaus', label: 'AUTOHAUS: FAHRZEUGE KAUFEN & WECHSELN' },
  u: { type: 'pot', label: 'PFLANZKÜBEL' },
  f: { type: 'fish', label: 'ANGELN' },
  d: { type: 'darts', label: 'DARTS (20€ PRO RUNDE)' },
  K: { type: 'kart', label: 'KARTBAHN (50€ PRO RENNEN)' },
  e: { type: 'travel', label: 'SCHNELLREISE-TAFEL' },
  p: { type: 'box', label: 'LIEFERKISTE ÖFFNEN' },
  M: { type: 'market', label: 'GROSSMARKT: KERNE & ZUTATEN BILLIGER' },
  N: { type: 'export', label: 'EXPORT-RAMPE: SÄFTE IN MASSEN VERKAUFEN' },
  Q: { type: 'tree', label: 'ORANGENBAUM' },
};
// Erweiterungen der Stadt aus späteren Dateien (hooks.md)
const CITY_HOOKS = { build: [], init: [], update: [], prompt: [], draw: [], drawHud: [], talk: {}, station: {} };
const SINGLE_STATIONS = 'SouQ';   // jede Kachel ist eine eigene Station
const H_ROADS = [10, 30, 50, 70, 90], V_ROADS = [12, 44, 76, 108, 140, 172];
const ROAD_END = 92;   // darunter: Strand und Meer
const LAND_X = 176;    // ab hier: Landkreis (nur über die Landstraße erreichbar)
const hRoadEnd = (y) => (y === 50 ? CW - 1 : LAND_X - 1);
// Straßensperre zum Landkreis: erst ab einem bestimmten Saft-Rang offen
const GATE = { x0: 178, x1: 179, y0: 49, y1: 53, rank: 4 };
const gateOpen = () => B().rank >= GATE.rank;
const gateTile = (tx, ty) => tx >= GATE.x0 && tx <= GATE.x1 && ty >= GATE.y0 && ty <= GATE.y1;
// Gebäude: enter = begehbar (kein Dach); mission = Auftrag (Index in LEVELS)
const BUILDINGS = [
  { id: 'home', x: 17, y: 14, w: 13, h: 11, door: [23, 24], floor: '.', label: 'ZUHAUSE', col: '#ff6fb5', enter: true },
  { id: 'kiosk', x: 33, y: 15, w: 9, h: 8, door: [37, 22], floor: ':', label: 'KIOSK', col: '#ffd23f', enter: true },
  { id: 'casino', x: 49, y: 14, w: 25, h: 15, door: [61, 28], floor: ',', label: 'CASINO', col: '#ff3fa4', enter: true },
  { id: 'factory', x: 91, y: 34, w: 15, h: 13, door: [98, 46], floor: ':', label: 'SAFTFABRIK', col: '#ff9a1a', enter: true, site: 'factory' },
  { id: 'garage', x: 31, y: 24, w: 11, h: 5, door: [36, 28], floor: 'i', label: 'GARAGE', col: '#c8c8d8', enter: true, site: 'garage', locked: () => !ownsSite('garage') },
  { id: 'garden', x: 91, y: 15, w: 14, h: 10, door: [97, 24], floor: '.', label: 'GARTENCENTER', col: '#7dff7a', enter: true },
  { id: 'm0', x: 17, y: 35, w: 10, h: 7, roof: '#a0482a', label: 'DÖNERBUDE', mission: 0, marker: [21, 43] },
  { id: 'm1', x: 30, y: 35, w: 12, h: 9, roof: '#6b4a2a', label: 'BIBLIOTHEK', mission: 1, marker: [35, 45] },
  { id: 'm2', x: 49, y: 35, w: 12, h: 9, roof: '#3a1a5a', label: 'CLUB BASSBOX', mission: 2, marker: [54, 46] },
  { id: 'm3', x: 63, y: 35, w: 11, h: 9, roof: '#d8d4f0', label: 'VILLA BRATWURST', mission: 3, marker: [68, 46] },
  { id: 'm4', x: 81, y: 15, w: 8, h: 11, roof: '#3a4a5e', label: 'KABEL-ZENTRALE', mission: 4, marker: [84, 27] },
  { id: 'm5', x: 81, y: 35, w: 8, h: 11, roof: '#e8f4f4', label: 'KLINIKUM', mission: 5, marker: [84, 47] },
  { id: 'm6', x: 17, y: 55, w: 14, h: 4, roof: '#7a5a3a', label: 'HAFEN 404', mission: 6, marker: [23, 54] },
  { id: 'm7', x: 49, y: 55, w: 12, h: 6, roof: '#c8a030', label: 'CASINO ROYAL', mission: 7, marker: [54, 54] },
  { id: 'm8', x: 63, y: 55, w: 11, h: 5, roof: '#cfc7a6', label: 'U-BAHN U8', mission: 8, marker: [68, 54] },
  { id: 'm9', x: 81, y: 55, w: 24, h: 11, roof: '#b0b0c8', label: 'MALL OF PAIN', mission: 9, marker: [92, 67] },
  { id: 'm10', x: 17, y: 76, w: 25, h: 10, roof: '#8a4ab0', label: 'ANIME-CON', mission: 10, marker: [29, 74] },
  { id: 'm11', x: 49, y: 76, w: 25, h: 11, roof: '#5a5a62', label: 'JVA KNASTBURG', mission: 11, marker: [61, 74] },
  { id: 'm12', x: 81, y: 76, w: 26, h: 12, roof: '#9ab0c8', label: 'FLUGHAFEN LUFTLOCH', mission: 12, marker: [93, 74] },
  { id: 'm13', x: 52, y: 1, w: 15, h: 7, roof: '#1e3246', label: 'CYBERCORP TOWER', mission: 18, marker: [59, 9] },
  { id: 'arena', x: 81, y: 1, w: 24, h: 7, roof: '#5a1a1a', label: 'WELLEN-ARENA', arena: true, marker: [92, 9] },
  { id: 'm14', x: 17, y: 1, w: 11, h: 6, roof: '#c8b030', label: 'ZITRONIA AG', mission: 13, marker: [22, 8] },
  { id: 'm15', x: 31, y: 1, w: 11, h: 6, roof: '#c84a8a', label: 'FREIZEITPARK', mission: 14, marker: [36, 8] },
  { id: 'm16', x: 1, y: 36, w: 9, h: 5, roof: '#1a2a3a', label: 'RECHENZENTRUM', mission: 15, marker: [5, 42] },
  { id: 'police', x: 112, y: 1, w: 8, h: 7, roof: '#24346a', label: 'POLIZEI' },
  { id: 'autohaus', x: 112, y: 15, w: 8, h: 11, door: [112, 20], floor: ':', label: 'AUTOHAUS', col: '#3fd0ff', enter: true },
  { id: 'greenhouse', x: 112, y: 34, w: 8, h: 14, door: [112, 41], floor: '.', label: 'GEWÄCHSHAUS', col: '#7dff7a', enter: true, site: 'greenhouse', locked: () => !ownsSite('greenhouse') },
  // ---- Ostviertel + Strand ----
  { id: 'm18', x: 122, y: 15, w: 16, h: 11, roof: '#3a1a5a', label: 'SAFT-TV STUDIO', mission: 17, marker: [130, 27] },
  { id: 'm17', x: 122, y: 55, w: 16, h: 11, roof: '#6a5a4a', label: 'SCHROTTPLATZ', mission: 16, marker: [130, 67] },
  { id: 'tower2', x: 145, y: 1, w: 13, h: 7, roof: '#2a3a5a', label: 'BÜROTURM' },
  { id: 'block1', x: 145, y: 35, w: 13, h: 12, roof: '#5a4a6a', label: 'WOHNBLOCK' },
  { id: 'hall1', x: 122, y: 76, w: 16, h: 10, door: [130, 85], floor: 'i', label: 'LAGERHALLE', col: '#9ab0c8', enter: true, site: 'hall1', locked: () => !ownsSite('hall1') },
  { id: 'block2', x: 145, y: 75, w: 13, h: 12, roof: '#6a4a3a', label: 'REIHENHÄUSER' },
  { id: 'bar', x: 80, y: 95, w: 10, h: 5, roof: '#e8a050', label: 'STRANDBAR' },
  { id: 'apt1', x: 1, y: 1, w: 8, h: 6, door: [4, 6], floor: '.', label: 'BAUWAGEN', col: '#e8c890', enter: true, apt: 'apt1', locked: () => !ownsApt('apt1') },
  { id: 'apt2', x: 145, y: 55, w: 13, h: 9, door: [151, 63], floor: ',', label: 'LOFT', col: '#ff9ad5', enter: true, apt: 'apt2', locked: () => !ownsApt('apt2') },
  { id: 'apt3', x: 40, y: 95, w: 14, h: 7, door: [46, 95], floor: ':', label: 'STRANDVILLA', col: '#3fd0ff', enter: true, apt: 'apt3', locked: () => !ownsApt('apt3') },
  { id: 'apt4', x: 145, y: 15, w: 13, h: 11, door: [151, 25], floor: ',', label: 'PENTHOUSE', col: '#ffd23f', enter: true, apt: 'apt4', locked: () => !ownsApt('apt4') },
  // ---- Landkreis ----
  { id: 'barn', x: 182, y: 6, w: 16, h: 12, door: [189, 17], floor: '.', label: 'SCHEUNE', col: '#e8643a', enter: true, site: 'barn', locked: () => !ownsSite('barn') },
  { id: 'farm', x: 201, y: 6, w: 11, h: 8, roof: '#a0482a', label: 'BAUERNHOF' },
  { id: 'silo', x: 213, y: 7, w: 5, h: 6, roof: '#9a9aa8', label: 'SILO' },
  { id: 'market', x: 182, y: 58, w: 16, h: 10, door: [189, 58], floor: 'i', label: 'GROSSMARKT', col: '#ffd23f', enter: true },
];
const CITY_SPAWN = [24, 21], CAR_SPAWN = [24, 27];
// Saftfabrik: Positionen der 12 Pflanzkübel (Reihenfolge = Kübel-Nummer)
const POT_TILES = [[93, 36], [95, 36], [97, 36], [99, 36], [93, 38], [95, 38], [97, 38], [99, 38], [93, 40], [95, 40], [97, 40], [99, 40]];
// Gewächshaus: 10 weitere Kübel (Station-Nummer 100 + Index)
const POT_TILES2 = [[114, 36], [117, 36], [114, 38], [117, 38], [114, 40], [117, 40], [114, 42], [117, 42], [114, 44], [117, 44]];
// Feld vor einer Tür (außen)
function doorOutside(b) {
  const [dx, dy] = b.door;
  if (dy === b.y + b.h - 1) return [dx, dy + 1];
  if (dy === b.y) return [dx, dy - 1];
  if (dx === b.x) return [dx - 1, dy];
  return [dx + 1, dy];
}

function buildCity() {
  const t = new Array(CW * CH).fill('g');
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < CW && y < CH) t[y * CW + x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  // Landkreis: Wiese, Waldrand als Grenze (nur die Landstraße führt hinein)
  rect(LAND_X, 0, CW - 1, ROAD_END + 9, 'm');
  for (let y = 0; y <= ROAD_END + 9; y++) for (const x of [LAND_X, LAND_X + 1]) set(x, y, y > ROAD_END ? 'h' : 'T');
  for (const y of H_ROADS) { rect(0, y - 1, hRoadEnd(y), y - 1, '_'); rect(0, y + 3, hRoadEnd(y), y + 3, '_'); }
  for (const x of V_ROADS) { rect(x - 1, 0, x - 1, ROAD_END, '_'); rect(x + 3, 0, x + 3, ROAD_END, '_'); }
  rect(LAND_X, 49, CW - 1, 49, 'w'); rect(LAND_X, 53, CW - 1, 53, 'w');
  for (const y of H_ROADS) rect(0, y, hRoadEnd(y), y + 2, '=');
  for (const x of V_ROADS) rect(x, 0, x + 2, ROAD_END, '=');
  // Strand und Meer ganz unten
  rect(11, ROAD_END + 2, LAND_X - 1, ROAD_END + 9, 'a'); rect(0, ROAD_END + 10, CW - 1, CH - 1, '~'); rect(LAND_X + 2, ROAD_END + 2, CW - 1, ROAD_END + 9, 'a');
  // Landkreis: Äcker, Feldwege, Orangenhain, See
  for (let y = 18; y <= 44; y++) for (let x = 207; x <= 218; x++) if (y % 6 !== 0) set(x, y, 'l');
  for (let y = 72; y <= 90; y++) for (let x = 180; x <= 197; x++) if (x % 7 !== 0) set(x, y, 'l');
  rect(189, 18, 189, 48, 'w'); rect(183, 21, 207, 21, 'w'); rect(189, 54, 189, 57, 'w'); rect(198, 54, 198, 60, 'w'); rect(199, 60, 207, 60, 'w');
  rect(181, 21, 181, 46, 'w'); rect(181, 46, 188, 46, 'w');
  for (let y = 61; y <= 76; y++) for (let x = 199; x <= 216; x++) if (((x - 207.5) / 8.5) ** 2 + ((y - 68.5) / 7.5) ** 2 <= 1) set(x, y, '~');
  for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) set(183 + i * 4, 24 + j * 4, 'Q');
  // Wasser: unten links + Hafenbecken, Teich im Ostpark
  rect(0, 54, 10, CH - 1, '~'); rect(16, 60, 42, 68, '~'); rect(124, 37, 134, 44, '~');
  rect(1, 43, 9, 47, 'P');
  for (const b of BUILDINGS) {
    if (b.enter) {
      rect(b.x, b.y, b.x + b.w - 1, b.y + b.h - 1, '#');
      rect(b.x + 1, b.y + 1, b.x + b.w - 2, b.y + b.h - 2, b.floor);
      set(b.door[0], b.door[1], 'D');
    } else rect(b.x, b.y, b.x + b.w - 1, b.y + b.h - 1, 'R');
    if (b.marker) { const mc = t[b.marker[1] * CW + b.marker[0]]; rect(b.marker[0] - 2, b.marker[1] - 1, b.marker[0] + 2, b.marker[1], mc === 'g' ? 'P' : mc); }
  }
  rect(22, 25, 26, 28, 'P');           // Einfahrt zuhause
  rect(96, 47, 100, 48, 'P');          // Hof der Saftfabrik
  // Einrichtung: Zuhause, Kiosk, Casino
  rect(19, 16, 20, 18, 'b'); rect(23, 16, 25, 16, 'v'); set(27, 16, 'F'); set(27, 21, 'A');
  rect(35, 17, 39, 17, 'c');
  rect(52, 17, 56, 18, 'J'); rect(67, 15, 69, 17, 'O');
  for (const y of [20, 22, 24, 26]) set(50, y, 'S');
  rect(59, 20, 62, 21, 'V'); rect(66, 23, 68, 24, 'H'); rect(72, 20, 72, 26, 'Y');
  // Saftfabrik: nur Kasse + Personal-Tafel fest - alles andere stellst du selbst auf
  set(101, 44, 'q'); set(103, 44, 'n');
  // Lieferkisten in allen Grundstücken (dahin kommt, was du per Handy bestellst)
  set(95, 45, 'p'); set(32, 25, 'p'); set(113, 35, 'p'); set(123, 77, 'p'); set(183, 7, 'p');
  // Großmarkt auf dem Land
  rect(184, 62, 190, 62, 'M'); rect(193, 62, 195, 63, 'N');
  // Gartencenter
  rect(94, 17, 101, 17, 'G'); rect(103, 19, 103, 22, 'Y'); rect(92, 21, 92, 22, 'Y');
  // Saft-Stand im Park
  rect(5, 20, 6, 20, 'j');
  // Wohnungen: Bett + Schnellreise-Tafel
  rect(2, 2, 3, 3, 'b'); set(7, 2, 'e');
  rect(147, 57, 148, 59, 'b'); set(155, 57, 'e'); rect(155, 60, 155, 61, 'Y');
  rect(42, 97, 43, 99, 'b'); set(51, 97, 'e'); rect(51, 99, 51, 100, 'Y');
  rect(147, 17, 149, 19, 'b'); set(155, 17, 'e'); rect(155, 20, 155, 23, 'Y');
  // Strand: Steg zum Angeln, Palmen
  rect(100, ROAD_END + 10, 101, ROAD_END + 14, '.'); set(100, ROAD_END + 14, 'f');
  for (let y = ROAD_END + 3; y <= ROAD_END + 9; y++) for (let x = 12; x < CW; x++) if (t[y * CW + x] === 'a' && hash(x * 11, y * 5) < 0.035) set(x, y, 'T');
  // Autohaus
  rect(114, 18, 117, 18, 'W');
  // Bäume in den Parks
  const park = (x0, y0, x1, y1, dens) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (t[y * CW + x] === 'g' && hash(x * 3, y * 7) < dens) set(x, y, 'T'); };
  park(0, 0, 10, 8, 0.28); park(0, 14, 10, 28, 0.18); park(0, 34, 10, 48, 0.12); park(16, 0, 42, 8, 0.06);
  park(112, 0, 119, 89, 0.25); park(16, 26, 19, 28, 0.15); park(31, 24, 42, 28, 0.15); park(16, 44, 42, 48, 0.08); park(48, 45, 74, 48, 0.05);
  park(80, 26, 90, 28, 0.1); park(80, 46, 90, 48, 0.1); park(48, 61, 74, 68, 0.1); park(16, 87, 106, 88, 0.12);
  park(120, 0, 138, 88, 0.05); park(120, 34, 138, 48, 0.22); park(144, 0, 170, 88, 0.06);
  for (let y = 0; y <= ROAD_END; y++) for (let x = LAND_X + 2; x < CW; x++) if (t[y * CW + x] === 'm' && hash(x * 13, y * 7) < 0.035) set(x, y, 'T');
  for (let x = 4; x <= 7; x++) for (let y = 19; y <= 22; y++) if (t[y * CW + x] === 'T') set(x, y, 'g');
  for (const b of BUILDINGS) { if (b.door) { const [ox, oy] = doorOutside(b), i = oy * CW + ox; if (t[i] === 'T') t[i] = b.y > ROAD_END ? 'a' : 'g'; } }
  for (const b of BUILDINGS) if (b.marker) for (let y = b.marker[1] - 2; y <= b.marker[1] + 1; y++) for (let x = b.marker[0] - 3; x <= b.marker[0] + 3; x++) if (t[y * CW + x] === 'T') t[y * CW + x] = 'g';
  // Minispiele: Angelsteg am Hafen, Dartscheibe im Casino, Kartbahn im Park
  set(36, 60, 'f'); set(57, 25, 'd'); set(7, 23, 'K'); set(207, 61, 'f');
  for (const [x, y] of [[36, 59], [6, 23], [8, 23], [7, 24], [7, 22]]) if (t[y * CW + x] === 'T') set(x, y, 'g');
  for (const f of CITY_HOOKS.build) extCall(f, set, rect, t);   // eigene Kacheln/Stationen
  // Stationen sammeln
  const stations = [], seen = new Uint8Array(CW * CH);
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (!STATION_INFO[c] || seen[i]) continue;
    const q = [i], cells = []; seen[i] = 1;
    while (q.length) {
      const k = q.pop(); cells.push(k);
      const x = k % CW, y = (k / CW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = (y + dy) * CW + x + dx;
        if (x + dx >= 0 && x + dx < CW && y + dy >= 0 && y + dy < CH && !seen[n] && t[n] === c && !SINGLE_STATIONS.includes(c)) { seen[n] = 1; q.push(n); }
      }
    }
    const cx = cells.reduce((a, k) => a + (k % CW), 0) / cells.length * TS + 8, cy = cells.reduce((a, k) => a + ((k / CW) | 0), 0) / cells.length * TS + 8;
    const st = { ch: c, ...STATION_INFO[c], x: cx, y: cy, cells };
    if (c === 'o') st.pot = POT_TILES.findIndex(([px, py]) => py * CW + px === cells[0]);
    if (c === 'u') st.pot = 100 + POT_TILES2.findIndex(([px, py]) => py * CW + px === cells[0]);
    if (c === 'Q') st.tree = stations.filter((q) => q.ch === 'Q').length;
    stations.push(st);
  }
  const solid = new Uint8Array(CW * CH);
  for (let i = 0; i < t.length; i++) solid[i] = CITY_SOLID.includes(t[i]) || (STATION_INFO[t[i]] && STATION_INFO[t[i]].solid) ? 1 : 0;
  return { t, solid, stations };
}
const cT = (x, y) => (x < 0 || y < 0 || x >= CW || y >= CH ? 'R' : CITY.t[y * CW + x]);
// nächstes begehbares Feld (für Kunden-Standorte)
function citySnap(tx, ty) {
  for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const c = cT(tx + dx, ty + dy);
    if (c === '_' || c === 'P' || c === 'g') return [tx + dx, ty + dy];
  }
  return [tx, ty];
}

function renderCityStatic() {
  const [c, g] = mkCanvas(CW * TS, CH * TS);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const ch = CITY.t[y * CW + x], X = x * TS, Y = y * TS;
    switch (ch === 'T' && y > ROAD_END ? 'a' : ch) {
      case 'g': case 'T':
        g.fillStyle = (x + y) % 2 ? '#1c3a24' : '#1a3622'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#24482c'; for (let k = 0; k < 6; k++) g.fillRect(X + Math.floor(hash(x * 5 + k, y) * 15), Y + Math.floor(hash(x, y * 5 + k) * 14), 1, 2);
        break;
      case '=': {
        g.fillStyle = '#26262e'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#2e2e38'; for (let k = 0; k < 8; k++) g.fillRect(X + Math.floor(hash(x * 9 + k, y) * 16), Y + Math.floor(hash(x, y * 9 + k) * 16), 1, 1);
        const hMid = H_ROADS.some((r) => y === r + 1), vMid = V_ROADS.some((r) => x === r + 1);
        const inV = V_ROADS.some((r) => x >= r && x <= r + 2), inH = H_ROADS.some((r) => y >= r && y <= r + 2);
        g.fillStyle = '#d8c040';
        if (hMid && !inV && x % 2 === 0) g.fillRect(X + 2, Y + 7, 10, 2);
        if (vMid && !inH && y % 2 === 0 && y <= ROAD_END) g.fillRect(X + 7, Y + 2, 2, 10);
        break;
      }
      case '_':
        g.fillStyle = '#4a4a56'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#3e3e48'; g.fillRect(X + 15, Y, 1, 16); g.fillRect(X, Y + 15, 16, 1);
        break;
      case 'P':
        g.fillStyle = '#545462'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#5e5e6e'; for (let i = 0; i < 16; i += 8) for (let j = 0; j < 16; j += 8) if ((i + j) % 16 === 0) g.fillRect(X + i, Y + j, 8, 8);
        break;
      case '~':
        g.fillStyle = '#0e2a4a'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#1a4a7a'; for (let k = 0; k < 3; k++) g.fillRect(X + Math.floor(hash(x * 9 + k, y) * 12), Y + Math.floor(hash(x, y * 9 + k) * 14), 4, 1);
        break;
      case '.': g.fillStyle = (y % 2) ? '#8a6a4a' : '#7e6040'; g.fillRect(X, Y, 16, 16); g.fillStyle = '#6a4a2a'; g.fillRect(X, Y + 15, 16, 1); break;
      case 'm': case 'Q':
        g.fillStyle = (x + y) % 2 ? '#2a5a2c' : '#285628'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#336a34'; for (let k = 0; k < 5; k++) g.fillRect(X + Math.floor(hash(x * 5 + k, y) * 15), Y + Math.floor(hash(x, y * 5 + k) * 14), 1, 2);
        if (hash(x * 3, y * 11) < 0.12) { g.fillStyle = pick(['#ffe14d', '#ffffff', '#ff9ad5', '#9ab0ff']); g.fillRect(X + 4 + Math.floor(hash(x, y) * 8), Y + 4 + Math.floor(hash(y, x) * 8), 2, 2); }
        break;
      case 'l':
        g.fillStyle = '#5a3a1a'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#4a2e14'; for (let k = 0; k < 16; k += 4) g.fillRect(X, Y + k + 2, 16, 1);
        g.fillStyle = '#4a9a3a'; for (let k = 0; k < 16; k += 4) for (let j = 1; j < 16; j += 5) g.fillRect(X + j + (k % 8 ? 2 : 0), Y + k, 2, 2);
        break;
      case 'w':
        g.fillStyle = (x + y) % 2 ? '#8a7050' : '#84694a'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#6a5438'; for (let k = 0; k < 6; k++) g.fillRect(X + Math.floor(hash(x * 7 + k, y) * 15), Y + Math.floor(hash(x, y * 7 + k) * 15), 2, 1);
        break;
      case 'h':
        g.fillStyle = '#d2c288'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#6a4a2a'; g.fillRect(X + 2, Y, 3, 16); g.fillRect(X + 11, Y, 3, 16); g.fillStyle = '#8a6a3a'; g.fillRect(X, Y + 4, 16, 2); g.fillRect(X, Y + 10, 16, 2);
        break;
      case 'i': g.fillStyle = (x + y) % 2 ? '#8a8a94' : '#84848e'; g.fillRect(X, Y, 16, 16); g.fillStyle = '#74747e'; g.fillRect(X, Y + 15, 16, 1); g.fillRect(X + 15, Y, 1, 16); if (hash(x, y * 3) < 0.2) { g.fillStyle = '#6a6a74'; g.fillRect(X + 3, Y + 7, 7, 1); } break;
      case 'a':
        g.fillStyle = (x + y) % 2 ? '#d8c890' : '#d2c288'; g.fillRect(X, Y, 16, 16);
        g.fillStyle = '#c0ae74'; for (let k = 0; k < 5; k++) g.fillRect(X + Math.floor(hash(x * 7 + k, y) * 15), Y + Math.floor(hash(x, y * 7 + k) * 15), 1, 1);
        if (cT(x, y + 1) === '~') { g.fillStyle = '#e8f0f0'; g.fillRect(X, Y + 13, 16, 3); }
        break;
      case ',': g.fillStyle = '#7a1040'; g.fillRect(X, Y, 16, 16); g.fillStyle = '#9a1a50'; if ((x + y) % 2) g.fillRect(X + 4, Y + 4, 8, 8); g.fillStyle = '#ffd23f'; if ((x + y) % 4 === 0) g.fillRect(X + 7, Y + 7, 2, 2); break;
      case ':': g.fillStyle = (x + y) % 2 ? '#d8e8e0' : '#c0d4ca'; g.fillRect(X, Y, 16, 16); break;
      default: g.fillStyle = '#26262e'; g.fillRect(X, Y, 16, 16);
    }
  }
  // Böden unter Stationen
  for (const b of BUILDINGS) if (b.enter) for (let y = b.y + 1; y < b.y + b.h - 1; y++) for (let x = b.x + 1; x < b.x + b.w - 1; x++) {
    if (STATION_INFO[CITY.t[y * CW + x]] || 'vYp'.includes(CITY.t[y * CW + x])) {
      const X = x * TS, Y = y * TS;
      g.fillStyle = b.floor === '.' ? '#8a6a4a' : b.floor === ',' ? '#7a1040' : b.floor === 'i' ? '#8a8a94' : '#d8e8e0'; g.fillRect(X, Y, 16, 16);
    }
  }
  // Laternen-Licht (auf den Gehwegen)
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (CITY.t[y * CW + x] !== '_' || (x * 7 + y * 3) % 11 !== 0) continue;
    const X = x * TS + 8, Y = y * TS + 8;
    (CITY.lamps || (CITY.lamps = [])).push([X, Y]);
    const grd = g.createRadialGradient(X, Y, 2, X, Y, 46);
    grd.addColorStop(0, 'rgba(255,210,120,0.22)'); grd.addColorStop(1, 'rgba(255,210,120,0)');
    g.fillStyle = grd; g.fillRect(X - 46, Y - 46, 92, 92);
    g.fillStyle = '#222'; g.fillRect(X - 1, Y - 1, 3, 3); g.fillStyle = '#ffe9a0'; g.fillRect(X, Y, 1, 1);
  }
  // Bäume (und Orangenbäume auf dem Land)
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const ch = CITY.t[y * CW + x];
    if (ch !== 'T' && ch !== 'Q') continue;
    const X = x * TS + 8, Y = y * TS + 8, s = ch === 'Q' ? 7 : 8;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(X + 4, Y + 5, s + 1, s - 1, 0, 0, TAU); g.fill();
    if (ch === 'Q') { g.fillStyle = '#5a3a1a'; g.fillRect(X - 1, Y + 2, 3, 6); }
    const c1 = ch === 'Q' ? '#1e5a1e' : '#14361c', c2 = ch === 'Q' ? '#2a7a2a' : '#1e4a26', c3 = ch === 'Q' ? '#3a9a3a' : '#2e6a36';
    pxEll(g, X, Y, s, s, c1); pxEll(g, X - 1, Y - 1, s - 2, s - 2, c2); pxEll(g, X - 3, Y - 3, Math.max(2, s - 5), Math.max(2, s - 5), c3);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(X - 4, Y - 5, 2, 1);
  }
  // Mauern der begehbaren Gebäude
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (CITY.t[y * CW + x] !== '#') continue;
    const X = x * TS, Y = y * TS, isW = (dx, dy) => cT(x + dx, y + dy) === '#';
    g.fillStyle = '#c8c0d8'; g.fillRect(X, Y, 16, 16);
    if (!isW(0, 1)) { g.fillStyle = '#6a6080'; g.fillRect(X, Y + 11, 16, 5); }
    g.fillStyle = '#1a1028';
    if (!isW(0, -1)) g.fillRect(X, Y, 16, 1); if (!isW(-1, 0)) g.fillRect(X, Y, 1, 16); if (!isW(1, 0)) g.fillRect(X + 15, Y, 1, 16); if (!isW(0, 1)) g.fillRect(X, Y + 15, 16, 1);
  }
  // Dächer mit Schild
  for (const b of BUILDINGS) {
    const X = b.x * TS, Y = b.y * TS, Wd = b.w * TS, Hd = b.h * TS;
    if (!b.enter) {
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(X + 4, Y + 5, Wd, Hd);
      g.fillStyle = b.roof; g.fillRect(X, Y, Wd, Hd);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(X, Y + Hd - 7, Wd, 7);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(X, Y, Wd, 2);
      for (let k = 0; k < Math.floor(b.w * b.h / 14); k++) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 6 + Math.floor(hash(k, b.x) * (Wd - 20)), Y + 6 + Math.floor(hash(b.y, k) * (Hd - 22)), 8, 6); }
      g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, Wd - 1, Hd - 1);
    }
    const signY = b.enter ? Y + Hd + 1 : Y + Hd / 2 - 8;
    if (b.enter) {
      txt(b.label, X + Wd / 2, b.door[1] === b.y ? Y + Hd + 2 : Y - 11, { g, font: FB, align: 'center', color: b.col, outline: '#000' });
    } else {
      ctx.font = '8px ' + FB;
      txt(b.label, X + Wd / 2, signY, { g, font: b.label.length * 8 > Wd - 8 ? FS : FB, align: 'center', color: b.mission != null ? '#ffffff' : '#bbbbcc', outline: '#000' });
    }
  }
  // Einrichtung (statisch)
  const box = (x, y, w, h, c1, c2) => { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 2, y + 2, w, h); g.fillStyle = c1; g.fillRect(x, y, w, h); g.fillStyle = c2; g.fillRect(x + 1, y + 1, w - 2, h - 2); };
  for (const s of CITY.stations) {
    const xs = s.cells.map((k) => k % CW), ys = s.cells.map((k) => (k / CW) | 0);
    const X = Math.min(...xs) * TS, Y = Math.min(...ys) * TS, Wd = (Math.max(...xs) - Math.min(...xs) + 1) * TS, Hd = (Math.max(...ys) - Math.min(...ys) + 1) * TS;
    switch (s.ch) {
      case 'o': case 'u': box(X + 2, Y + 3, 12, 12, '#5a3a1a', '#7a5030'); g.fillStyle = '#3a2410'; g.fillRect(X + 4, Y + 5, 8, 7); break;
      case 'W': box(X, Y + 2, Wd, Hd - 2, '#1a3a5a', '#3a6a9a'); g.fillStyle = '#ffffff'; g.fillRect(X + 6, Y + 5, 10, 6); g.fillStyle = '#3fd0ff'; g.fillRect(X + 7, Y + 6, 8, 4); g.fillStyle = '#ffd23f'; g.fillRect(X + Wd - 8, Y + 6, 5, 4); txt('VERKAUF', X + 36, Y + 5, { g, font: FS, align: 'center', color: '#ffffff', outline: '' }); break;
      case 'z': box(X, Y, Wd, Hd, '#3a3a44', '#6a6a78'); g.fillStyle = '#ff9a1a'; g.fillRect(X + 8, Y + 6, Wd - 16, Hd - 16); g.fillStyle = '#c0c0cc'; g.fillRect(X + 4, Y + 2, Wd - 8, 3); txt('PRESSE', X + Wd / 2, Y + Hd - 9, { g, font: FS, align: 'center', color: '#ffffff', outline: '' }); break;
      case 'x': box(X, Y, Wd, Hd, '#4a2c18', '#8d5a3b'); g.fillStyle = '#fff'; g.fillRect(X + 5, Y + 5, 5, 7); g.fillStyle = '#ff9a1a'; g.fillRect(X + 5, Y + 8, 5, 4); g.fillStyle = '#c41f2a'; g.fillRect(X + 15, Y + 6, 4, 4); g.fillStyle = '#ffd23f'; g.fillRect(X + 22, Y + 7, 5, 3); txt('MIX', X + Wd / 2, Y + Hd - 9, { g, font: FS, align: 'center', color: '#ffffff', outline: '' }); break;
      case 'k': box(X, Y, Wd, Hd, '#8aa0b0', '#d8e8f0'); g.fillStyle = '#5a6a7a'; g.fillRect(X + Wd - 6, Y + 6, 2, 10); g.fillRect(X + 2, Y + Hd / 2, Wd - 4, 1); break;
      case 'q': box(X + 1, Y + 2, 14, 12, '#2a2a30', '#4a4a56'); g.fillStyle = '#7dff7a'; g.fillRect(X + 3, Y + 4, 10, 3); g.fillStyle = '#ffd23f'; g.fillRect(X + 5, Y + 9, 6, 3); break;
      case 'n': box(X + 1, Y + 1, 14, 14, '#4a2c18', '#e8d9b5'); g.fillStyle = '#333'; for (let k2 = 0; k2 < 3; k2++) g.fillRect(X + 4, Y + 4 + k2 * 3, 8, 1); g.fillStyle = '#c41f2a'; g.fillRect(X + 11, Y + 3, 2, 2); break;
      case 'G': box(X, Y + 2, Wd, Hd - 2, '#2a5a2a', '#4a8a3a'); for (let k2 = 0; k2 < 8; k2++) { g.fillStyle = pick(['#ff9a1a', '#c41f2a', '#ffd23f', '#7dff7a', '#ffffff']); g.fillRect(X + 4 + k2 * 15, Y + 5, 4, 5); } break;
      case 'j': box(X, Y, Wd, Hd, '#8a5a32', '#ff9a1a'); g.fillStyle = '#fff'; for (let k2 = 0; k2 < Wd; k2 += 6) g.fillRect(X + k2, Y, 3, 4); txt('SAFT', X + Wd / 2, Y + 6, { g, font: FS, align: 'center', color: '#5a2a00', outline: '' }); break;
      case 'b': box(X + 1, Y + 1, Wd - 2, Hd - 2, '#3a2a5a', '#5a4a8a'); g.fillStyle = '#f0f0f0'; g.fillRect(X + 4, Y + 4, Wd - 8, 9); g.fillStyle = '#ff6fb5'; g.fillRect(X + 3, Y + 16, Wd - 6, Hd - 20); break;
      case 'c': box(X, Y + 2, Wd, Hd - 2, '#4a2c18', '#8d5a3b'); g.fillStyle = '#ffd23f'; g.fillRect(X + 6, Y + 5, 6, 4); g.fillStyle = '#ff9a1a'; g.fillRect(X + 20, Y + 4, 5, 7); g.fillStyle = '#3fd0ff'; g.fillRect(X + 36, Y + 5, 6, 5); break;
      case 'J': box(X, Y, Wd, Hd, '#3a1a0a', '#0f6a2a'); g.strokeStyle = '#ffd23f'; g.strokeRect(X + 6.5, Y + 6.5, Wd - 13, Hd - 13); txt('BLACKJACK', X + Wd / 2, Y + Hd / 2 - 4, { g, font: FS, align: 'center', color: '#ffd23f', outline: '' }); break;
      case 'V': box(X, Y, Wd, Hd, '#3a1a0a', '#0f6a2a'); pxEll(g, X + 14, Y + Hd / 2, 10, 10, '#2a1a0a'); pxEll(g, X + 14, Y + Hd / 2, 8, 8, '#c41f2a'); pxEll(g, X + 14, Y + Hd / 2, 4, 4, '#111'); break;
      case 'H': box(X, Y, Wd, Hd, '#3a1a0a', '#1a3a6a'); g.fillStyle = '#fff'; g.fillRect(X + 10, Y + 8, 8, 12); g.fillRect(X + 26, Y + 8, 8, 12); break;
      case 'Y': box(X, Y, Wd, Hd, '#2a1a0a', '#6a3a1a'); for (let k = 0; k < 5; k++) { g.fillStyle = pick(['#3fd0ff', '#ff6fb5', '#ffd23f']); g.fillRect(X + 4, Y + 8 + k * 20, 4, 6); } break;
      case 'v': g.fillStyle = '#111'; g.fillRect(X + 2, Y + 2, Wd - 4, 8); g.fillStyle = '#5a3a2a'; g.fillRect(X + 2, Y + 30, Wd - 4, 10); break;
      case 'A': box(X + 2, Y + 1, 12, 14, '#2a1a0a', '#f4f0e0'); g.fillStyle = '#333'; for (let k = 0; k < 4; k++) g.fillRect(X + 4, Y + 4 + k * 3, 8, 1); break;
      case 'f': g.fillStyle = '#6a4a2a'; g.fillRect(X, Y, 16, 16); g.fillStyle = '#4a3018'; g.fillRect(X, Y + 5, 16, 1); g.fillRect(X, Y + 11, 16, 1); g.strokeStyle = '#3a2410'; g.beginPath(); g.moveTo(X + 4, Y + 12); g.lineTo(X + 14, Y - 6); g.stroke(); txt('ANGELN', X + 8, Y - 16, { g, font: FS, align: 'center', color: '#9ab0ff', outline: '#000' }); break;
      case 'd': box(X + 1, Y + 1, 14, 14, '#2a1a0a', '#111'); pxEll(g, X + 8, Y + 8, 6, 6, '#e8dcc0'); pxEll(g, X + 8, Y + 8, 4, 4, '#c41f2a'); pxEll(g, X + 8, Y + 8, 1, 1, '#2a8a3a'); txt('DARTS', X + 8, Y - 10, { g, font: FS, align: 'center', color: '#ffe14d', outline: '#000' }); break;
      case 'e': box(X + 1, Y + 1, 14, 14, '#3a2410', '#c8a070'); g.fillStyle = '#7dff7a'; g.fillRect(X + 4, Y + 4, 3, 2); g.fillStyle = '#3fd0ff'; g.fillRect(X + 9, Y + 6, 3, 3); g.fillStyle = '#e01b3c'; g.fillRect(X + 5, Y + 10, 2, 2); g.fillStyle = '#3a2410'; g.fillRect(X + 6, Y + 6, 4, 1); g.fillRect(X + 7, Y + 7, 1, 4); txt('REISE', X + 8, Y - 10, { g, font: FS, align: 'center', color: '#ffe14d', outline: '#000' }); break;
      case 'p': box(X + 1, Y + 2, 14, 13, '#5a3a1a', '#c8a070'); g.fillStyle = '#8a6a3a'; g.fillRect(X + 1, Y + 7, 14, 2); g.fillRect(X + 7, Y + 2, 2, 13); txt('LIEFERUNG', X + 8, Y - 10, { g, font: FS, align: 'center', color: '#c8a070', outline: '#000' }); break;
      case 'M': box(X, Y + 2, Wd, Hd - 2, '#3a2a0a', '#c89a30'); for (let k2 = 0; k2 < 6; k2++) { g.fillStyle = pick(['#ff9a1a', '#c41f2a', '#ffd23f', '#7dff7a', '#ff3fa4']); g.fillRect(X + 6 + k2 * 17, Y + 5, 6, 6); } txt('GROSSHANDEL', X + Wd / 2, Y - 10, { g, font: FS, align: 'center', color: '#ffd23f', outline: '#000' }); break;
      case 'N': box(X, Y, Wd, Hd, '#2a2a30', '#5a5a66'); g.fillStyle = '#ffd23f'; for (let k2 = 0; k2 < Wd; k2 += 6) g.fillRect(X + k2, Y + Hd - 4, 3, 3); g.fillStyle = '#c8a070'; g.fillRect(X + 4, Y + 4, 10, 8); g.fillRect(X + 18, Y + 6, 10, 8); txt('EXPORT', X + Wd / 2, Y - 10, { g, font: FS, align: 'center', color: '#3fd0ff', outline: '#000' }); break;
      case 'K': box(X + 1, Y + 1, 14, 14, '#2a2a30', '#ffffff'); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { g.fillStyle = '#111'; g.fillRect(X + 2 + i * 3, Y + 2 + j * 3, 3, 3); } txt('KARTBAHN', X + 8, Y - 10, { g, font: FS, align: 'center', color: '#3fd0ff', outline: '#000' }); break;
    }
  }
  // Gewächshaus: Glasdach-Schimmer
  { const b = BUILDINGS.find((q) => q.id === 'greenhouse'), X = (b.x + 1) * TS, Y = (b.y + 1) * TS, Wd = (b.w - 2) * TS, Hd = (b.h - 2) * TS;
    g.fillStyle = 'rgba(140,255,180,0.07)'; g.fillRect(X, Y, Wd, Hd);
    g.fillStyle = 'rgba(210,255,230,0.12)'; for (let x = X; x < X + Wd; x += 32) g.fillRect(x, Y, 1, Hd); for (let y = Y; y < Y + Hd; y += 32) g.fillRect(X, y, Wd, 1); }
  // Polizeiwache: Abzeichen + Blaulicht auf dem Dach
  { const b = BUILDINGS.find((q) => q.id === 'police'), X = b.x * TS + b.w * 8, Y = b.y * TS + 22;
    pxEll(g, X, Y, 9, 9, '#ffd23f'); pxEll(g, X, Y, 7, 7, '#c8a020'); pxEll(g, X, Y, 3, 3, '#ffe88a');
    g.fillStyle = '#3a6aff'; g.fillRect(b.x * TS + 10, b.y * TS + 6, 6, 4); g.fillStyle = '#ff3b3b'; g.fillRect(b.x * TS + b.w * TS - 16, b.y * TS + 6, 6, 4); }
  gfxCityStatic(g);
  CITY.staticC = c;
  // Minimap (1 Pixel pro Feld)
  const [mc, mg] = mkCanvas(CW, CH);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const ch = CITY.t[y * CW + x];
    mg.fillStyle = ch === '=' ? '#5a5a66' : ch === '_' || ch === 'P' ? '#3a3a44' : ch === '~' ? '#1a4a7a' : ch === 'a' ? '#b8a870' : ch === 'T' ? '#14361c' : ch === 'g' ? '#1c3a24'
      : ch === 'm' ? '#2a5a2c' : ch === 'Q' ? '#3a7a2a' : ch === 'l' ? '#5a3a1a' : ch === 'w' ? '#8a7050' : ch === 'h' ? '#6a4a2a' : ch === 'R' ? '#8a7a9a' : ch === '#' ? '#c8c0d8' : '#6a4a5a';
    mg.fillRect(x, y, 1, 1);
  }
  const pol = BUILDINGS.find((q) => q.id === 'police');
  mg.fillStyle = '#3a5aff'; mg.fillRect(pol.x, pol.y, pol.w, pol.h);
  CITY.miniC = mc;
}
