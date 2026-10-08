'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Boss-Schwachstellen
//  Bosse sind mit normalen Waffen nicht zu knacken: jeder hat einen Trick.
//  Nur im "wehrlosen" Zustand (meist benommen) wirkt Schaden - dann aber x3.
//  Requisiten (Glocken, Stecker, Zuckersäcke ...) sind Figuren vom Typ 'O'.
// =====================================================================
const BOSS_WEAK = {
  guenther: 'LASS IHN GEGEN DIE WAND RENNEN - DANN IST ER BENOMMEN!',
  croupier: 'WIRF WAS NACH IHM (RECHTSKLICK) - DANN ZUHAUEN!',
  grechenig: 'HAU AUF DIE PAUSENGLOCKEN - DANN IST SIE WEHRLOS!',
  tabluator: 'ERST DIE ROUTER, DANN DEN STECKER ZIEHEN (DRAUFHAUEN)!',
  baka: 'WEICH DEM BAUCHPLATSCHER AUS - DANN ZUHAUEN!',
  hacker: 'SERVER ZERSTÖREN, DANN WARTEN, BIS SEIN LASER ÜBERHITZT!',
};
// eigene Regeln für Bosse, die nicht einfach "benommen" sein müssen (neue Bosse)
const BOSS_RULES = {};
function bossVulnerable(e) {
  if (e.btype === 'hacker' && e.mode === 'firewall') return false;
  if (e.btype === 'tabluator' && e.mode === 'netz') return false;
  if (BOSS_RULES[e.btype]) return BOSS_RULES[e.btype](e);
  return bossStunned(e);
}
// wehrlos (Hinrichtung, Sterne): 'stunned' oder eigene Regel BOSS_EXT[id].vulnerable(e)
function bossStunned(e) { const X = BOSS_EXT[e.btype]; return e.mode === 'stunned' || !!(X && X.vulnerable && extCall(X.vulnerable, e)); }
function spawnProp(type, x, y) {
  const o = makeEnemy('O', x, y);
  o.prop = type; o.hp = 999; o.cd = 0;
  G.enemies.push(o);
  sparks(x, y, 10, '#ffe14d');
  return o;
}
const propsOf = (type) => G.enemies.filter((o) => o.kind === 'O' && o.prop === type && o.state !== 'dead');
function propSpots(n, minDist) { const out = []; for (let k = 0; k < n; k++) { const s = randomArenaSpot(minDist); if (s) out.push(s); } return out; }
// Spieler trifft eine Requisite (Schuss, Schlag, Wurf, Explosion)
function hitProp(o) {
  if (o.cd > 0) { if (T - (o.msgT || -9) > 1) { o.msgT = T; floatText(o.x, o.y - 16, 'NOCH ' + Math.ceil(o.cd) + ' S...', '#888888', true); } return; }
  const b = G.boss, live = b && b.state !== 'dead';
  const stun = (t, line) => { if (!live) return; b.mode = 'stunned'; b.modeT = t; say(b, line, 1.8); shake(6); Sound.play('boss_phase'); };
  if (PROP_HIT[o.prop]) { PROP_HIT[o.prop](o, b, live, stun); return; }
  switch (o.prop) {
    case 'bell':
      o.cd = 7; Sound.play('ring'); floatText(o.x, o.y - 18, 'DING DONG! PAUSE!', '#ffe14d');
      if (live) stun(3.6, pick(['PAUSE?! JETZT SCHON?!', 'ÄHHHM... WER HAT GEKLINGELT?!', 'NIEMAND GEHT IN DIE PAUSE!']));
      break;
    case 'plug':
      if (live && b.mode === 'netz') { floatText(o.x, o.y - 18, 'ERST DIE ROUTER ZERSTÖREN!', '#3fd0ff', true); Sound.play('click'); return; }
      o.cd = 4; Sound.play('glitch'); floatText(o.x, o.y - 18, 'STECKER GEZOGEN!', '#3fd0ff');
      stun(3.6, 'WER HAT DEN STECKER GEZOGEN?!');
      { const s = randomArenaSpot(110); if (s) { sparks(o.x, o.y, 10, '#3fd0ff'); o.x = s[0]; o.y = s[1]; } }
      break;
  }
}
const PROP_HIT = {};   // neue Bosse tragen hier ihre Requisiten ein
// Requisiten zeichnen
function drawProp(g, e) {
  const x = Math.round(e.x), y = Math.round(e.y), off = e.cd > 0, blink = !off && Math.floor(T * 3) % 2;
  if (PROP_DRAW[e.prop]) { PROP_DRAW[e.prop](g, e, x, y, off, blink); return; }
  if (e.prop === 'bell') {
    g.fillStyle = '#5a3a1a'; g.fillRect(x - 1, y - 11, 2, 4);
    pxEll(g, x, y - 2, 6, 6, off ? '#7a6a3a' : '#ffd23f'); g.fillStyle = off ? '#5a4a2a' : '#c8a020'; g.fillRect(x - 7, y + 3, 14, 2);
    g.fillStyle = '#3a2410'; g.fillRect(x - 1, y + 5, 2, 2);
    if (blink) txt('!', x, y - 24, { g, font: FS, align: 'center', color: '#ffe14d' });
  } else if (e.prop === 'plug') {
    g.fillStyle = '#2a2a30'; g.fillRect(x - 8, y - 4, 16, 8); g.fillStyle = off ? '#3a3a44' : '#e8e8f0'; g.fillRect(x - 6, y - 2, 4, 4); g.fillRect(x + 2, y - 2, 4, 4);
    g.strokeStyle = '#111'; g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 14, y + 6); g.stroke();
    if (!off && Math.random() < 0.3) { g.fillStyle = '#3fd0ff'; g.fillRect(x + rand(-6, 6), y - 6 + rand(-2, 2), 1, 1); }
    if (blink) txt('!', x, y - 20, { g, font: FS, align: 'center', color: '#3fd0ff' });
  }
}
const PROP_DRAW = {};
// beim Boss-Start die Requisiten aufstellen
function bossSetupProps(e) {
  if (e.btype === 'grechenig' && !propsOf('bell').length) for (const s of propSpots(3, 90)) spawnProp('bell', s[0], s[1]);
  if (BOSS_SETUP[e.btype]) BOSS_SETUP[e.btype](e);
  else if (BOSS_EXT[e.btype] && BOSS_EXT[e.btype].setup) BOSS_EXT[e.btype].setup(e);   // neue Boss-Dateien brauchen kein BOSS_SETUP
}
const BOSS_SETUP = {};
