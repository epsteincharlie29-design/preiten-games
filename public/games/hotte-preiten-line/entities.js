'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Waffen, Spieler, Kugeln, Schaden, Punkte & Geld
// =====================================================================
const WEAPONS = {
  pistol: { name: 'PISTOLE', ranged: true, ammo: 12, rate: 0.2, spread: 0.035, pellets: 1, noise: 300, shake: 2, sfx: 'pistol', eRate: 0.62, eSpread: 0.09 },
  shotgun: { name: 'SCHROTFLINTE', ranged: true, ammo: 6, rate: 0.55, spread: 0.22, pellets: 7, noise: 340, shake: 5, sfx: 'shotgun', eRate: 1.1, eSpread: 0.25 },
  uzi: { name: 'UZI', ranged: true, ammo: 30, rate: 0.075, spread: 0.11, pellets: 1, auto: true, noise: 300, shake: 1.5, sfx: 'uzi', eRate: 0.1, eSpread: 0.16 },
  magnum: { name: 'MAGNUM', ranged: true, ammo: 6, rate: 0.45, spread: 0.01, pellets: 1, pierce: true, noise: 360, shake: 6, sfx: 'shotgun', speed: 620, eRate: 1.0, eSpread: 0.05 },
  rifle: { name: 'STURMGEWEHR', ranged: true, ammo: 24, rate: 0.11, spread: 0.05, pellets: 1, auto: true, noise: 330, shake: 2, sfx: 'pistol', speed: 560, eRate: 0.13, eSpread: 0.1 },
  laser: { name: 'LASERKNARRE', ranged: true, ammo: 10, rate: 0.3, spread: 0, pellets: 1, pierce: true, noise: 120, shake: 3, sfx: 'zap', speed: 900, kind: 'laser', eRate: 0.6, eSpread: 0.04 },
  baguette: { name: 'BAGUETTE', lethal: true, rate: 0.32, reach: 24, arc: 1.25, hitSfx: 'punch' },
  pan: { name: 'BRATPFANNE', lethal: true, rate: 0.42, reach: 21, arc: 1.2, hitSfx: 'bonk' },
  chicken: { name: 'GUMMIHUHN', lethal: false, rate: 0.24, reach: 23, arc: 1.3, hitSfx: 'squeak' },
  bat: { name: 'BASEBALLSCHLÄGER', lethal: true, rate: 0.36, reach: 25, arc: 1.3, hitSfx: 'bonk' },
  katana: { name: 'KATANA', lethal: true, rate: 0.22, reach: 27, arc: 1.6, hitSfx: 'swoosh' },
  vexwave: { name: 'VEX-WAVE', ranged: true, ammo: 5, rate: 0.85, special: 'wave', noise: 260, shake: 7, sfx: 'wave', eRate: 1, eSpread: 0 },
  crossbow: { name: 'ARMBRUST', ranged: true, ammo: 8, rate: 0.55, spread: 0.005, pellets: 1, pierce: true, noise: 50, shake: 1, sfx: 'crossbow', speed: 540, kind: 'bolt', eRate: 1, eSpread: 0.02 },
  flamer: { name: 'FLAMMENWERFER', ranged: true, ammo: 90, rate: 0.035, spread: 0.22, pellets: 1, auto: true, special: 'flame', noise: 220, shake: 0.6, sfx: 'flame', speed: 210, eRate: 1, eSpread: 0.2 },
  boomerang: { name: 'BUMERANG', ranged: true, ammo: 1, rate: 0.3, special: 'boomerang', noise: 40, shake: 1, sfx: 'throwIt', eRate: 1, eSpread: 0 },
  minigun: { name: 'MINIGUN', ranged: true, ammo: 150, rate: 0.045, spread: 0.13, pellets: 1, auto: true, spin: 0.45, noise: 380, shake: 1.8, sfx: 'uzi', speed: 520, eRate: 1, eSpread: 0.15 },
  nailgun: { name: 'NAGELPISTOLE', ranged: true, ammo: 28, rate: 0.12, spread: 0.05, pellets: 1, noise: 150, shake: 1, sfx: 'click', speed: 520, kind: 'nail', eRate: 0.4, eSpread: 0.08 },
  shovel: { name: 'SCHAUFEL', lethal: true, rate: 0.48, reach: 26, arc: 1.6, hitSfx: 'bonk', fling: 230 },
  osaft: { name: 'TIKITIKILUKAS O-SAFT', ranged: true, ammo: 3, rate: 0.55, spread: 0.02, pellets: 1, special: 'juice', noise: 200, shake: 2, sfx: 'throwIt', speed: 270, eRate: 1, eSpread: 0 },
  // nur für Gegner
  sniper: { name: 'SCHARFSCHÜTZENGEWEHR', ranged: true, enemyOnly: true, pellets: 1, sfx: 'shotgun', eRate: 2.4, eSpread: 0.0, speed: 760 },
  turret: { name: 'GESCHÜTZ', ranged: true, enemyOnly: true, pellets: 1, sfx: 'uzi', eRate: 0.12, eSpread: 0.08 },
  drone: { name: 'DROHNE', ranged: true, enemyOnly: true, pellets: 1, sfx: 'zap', eRate: 1.1, eSpread: 0.06, speed: 260 },
};
const FISTS = { name: 'FÄUSTE', lethal: false, rate: 0.26, reach: 17, arc: 1.1, hitSfx: 'punch' };
// eigene Kugelarten (b.kind) aus späteren Dateien: { impact(b,x,y), hit(b,e,ang) -> true = erledigt, dmg, noCasing, life }
const BULLET_KINDS = {};
// eigene Kugel-Grafik (Bosse + Waffen): kind -> (g, b) => true wenn gezeichnet
const BULLET_DRAW = {};
// keine Hülse auswerfen?
const weaponNoCasing = (w) => !!w.noCasing || ['laser', 'bolt', 'zap', 'harpoon', 'rocket', 'blob'].includes(w.kind) || !!(BULLET_KINDS[w.kind] && BULLET_KINDS[w.kind].noCasing);
const SHOP_WEAPONS = ['pistol', 'uzi', 'shotgun', 'katana', 'rifle', 'osaft', 'crossbow', 'minigun'];
const JUICE = ['#ff9a1a', '#ffb52a', '#ffd23f', '#ff7a00'];

const L_ALERT = ['HEY!', 'WER BIST DU DENN?!', 'EINDRINGLING!', 'MEIN DÖNER!', 'ICH HAB PAUSE!', 'HALT STOPP!', 'DER SCHON WIEDER!', 'MAMA?!', 'DAS IST LIL PREITNER!', 'SCHNAPPT IHN!', 'IST DAS EIN KOPF?!', 'NICHT DER RAPPER!'];
const L_ALERT_DOG = ['WUFF!', 'KLÄFF!', 'GRRRR!', 'WAU WAU!'];
const L_DEATH = ['AUA', 'NICHT DIE FRISUR!', 'MAMA...', 'MEIN ANZUG!', 'DAS WAR UNNÖTIG', 'AUTSCH', 'ICH WAR NUR AUSHILFE!', 'UFF', 'MEIN DÖNER...', 'SAG MUTTI BESCHEID', 'HEUTE WAR MEIN LETZTER TAG...', 'WORTH IT', 'DAS TEBLEEDD GEHÖRT DEM BOSS!'];
const L_CONF = ['IST DIE ECHT?!', 'NICHT SCHIESSEN!', '?!', 'ICH ERGEBE MICH... ODER?', 'MAMAAA!', 'WAS IST DAS?!', 'UNFAIR!', 'BITTE NICHT!'];
const L_GETUP = ['WO BIN ICH?', 'MEIN KOPF...', 'DAS GIBT RACHE!', 'AUA AUA', 'WER HAT DAS LICHT AUS...'];
const L_SEARCH = ['HM?', 'WAR DA WAS?', 'HALLO?', 'ICH HAB WAS GEHÖRT!', 'KEVIN, BIST DU DAS?'];
const L_WIN = ['HAHA!', 'ZU LANGSAM!', 'UND TSCHÜSS!', 'GRÜSS RUSSIAN HACKER BOI!', 'DAS WAR EINFACH', 'LIL? EHER MINI!'];
const KILL_WORDS = {
  shot: ['PENG!', 'DURCHLÖCHERT!', 'LUFTLOCH!', 'KNALLHART!'], melee: ['BONK!', 'KLATSCH!', 'ZACK!', 'WUMMS!', 'SAUBER!'],
  exec: ['BODENKUSS!', 'FEIERABEND!', 'GUTE NACHT!'], door: ['TÜR-KNALL!'], thrown: ['VOLLTREFFER!', 'WURFSIEG!'],
  friendly: ['EIGENTOR!'], dog: ['SORRY, HUND!', 'BÖSER HUND!'], train: ['ZUG VERPASST!', 'NÄCHSTER HALT: AUA'],
  machine: ['SCHROTT!', 'SYSTEM ERROR!', 'AUSGESCHALTET!'], fire: ['GEGRILLT!', 'KNUSPRIG!', 'BBQ!'], wave: ['WEGGESCHLEUDERT!', 'WAND-KNALL!', 'VEX-WAVE!'], juice: ['SAFTIG!', 'AUSGEPRESST!', 'VITAMINSCHOCK!', 'TIKITIKILUKAS!'],
};
const CAUSE = {
  pistol: 'PISTOLE', shotgun: 'SCHROTFLINTE', uzi: 'UZI', magnum: 'MAGNUM', rifle: 'STURMGEWEHR', laser: 'LASER', baguette: 'BAGUETTE',
  pan: 'BRATPFANNE', chicken: 'GUMMIHUHN', bat: 'BASEBALLSCHLÄGER', katana: 'KATANA', fists: 'FÄUSTE', heavy: 'BRECHER-FAUST', dog: 'DACKEL',
  wurst: 'BRATWURST', boss: 'GÜNTHERS BAUCH', sniper: 'SCHARFSCHÜTZE', turret: 'GESCHÜTZTURM', drone: 'DROHNE', train: 'U-BAHN',
  card: 'SPIELKARTE', dice: 'WÜRFEL-BOMBE', croupier: 'DER CROUPIER', bits: 'BÖSE BITS', hackbeam: 'DDOS-LASER', hacker: 'RUSSIAN HACKER BOI', laserwall: 'LASERSCHRANKE',
  osaft: 'EIGENER O-SAFT (SELBST SCHULD)', redpen: 'ROTSTIFT', letters: 'ÄHHHM-WELLE', nachsitzen: 'NACHSITZEN', paper: 'SCHULARBEIT',
  packet: 'PING-PAKET', cable: 'NETZWERKKABEL', tabluator: 'KUMI', grechenig: 'FRAU GRECHI',
  baka: 'BAKA BAKA BAKA', belly: 'BAUCHPLATSCHER', hair: 'HAAR-PEITSCHE', ramen: 'RAMEN-SCHÜSSEL', shout: 'BAKA-SCHREI',
};
const TIPS = [
  'KUGELN SIND SCHLECHT FÜR DIE GESUNDHEIT.', 'RECHTSKLICK WIRFT DEINE WAFFE. AUCH BAGUETTES.',
  'DIE FINGERPISTOLE [Q] IST NICHT ECHT. DIE GEGNER WISSEN DAS NICHT.', 'TÜREN SIND AUCH WAFFEN. EINFACH REINRENNEN.',
  'HAST DU SCHON MAL VERSUCHT, NICHT ZU STERBEN?', 'DACKEL SIND SCHNELLER ALS SIE AUSSEHEN.', 'LIEGENDE GEGNER MIT [LEERTASTE] ERLEDIGEN.',
  '[SHIFT] GEDRÜCKT HALTEN, UM WEITER ZU SCHAUEN.', 'SCHÜSSE SIND LAUT. BRATPFANNEN NICHT.', 'BRECHER LACHEN ÜBER FÄUSTE. NIMM WAS SCHARFES.',
  'GELD AUFSAMMELN NICHT VERGESSEN! TOTE BEZAHLEN NICHT.', 'IM SHOP GIBT ES EINE KEVLARWESTE. NUR SO ALS TIPP.',
  'KISTEN UND AUTOS HALTEN KUGELN AUF.', 'ROTER LASER AUF DIR? BEWEG DICH!', 'TRESORE MIT SCHLÄGEN ODER KUGELN KNACKEN.',
  'DAS CASINO GEWINNT IMMER. MEISTENS.', 'MIT [E] AKTIVIERST DU ZEITLUPE (PERK).',
  'DER TIKITIKILUKAS O-SAFT EXPLODIERT. NICHT ZU NAH WERFEN!', 'BEI GRECHIS ÄHHHM-WELLE: IN DIE LÜCKE LAUFEN!',
  'BEI KUMI ERST DIE ROUTER KAPUTT MACHEN.', 'VOR DEM BOSS GELD IM KIOSK FÜR PERKS AUSGEBEN!',
];

// ---------------------------------------------------------------------
//  Erzeugen
// ---------------------------------------------------------------------
function makePlayer(x, y, idx = 0) {
  const p = { x, y, a: 0, r: 5, vx: 0, vy: 0, alive: true, weapon: null, cd: 0, swingT: 0, swingDir: 1, mouthT: 0,
    fingerCd: 0, fingerT: 0, execT: 0, execTarget: null, walkT: 0, deadT: 0, recoil: 0, isPlayer: true,
    armor: perk('armor') + (hasBoost('armor') ? 1 : 0), focus: perk('focus'), invT: 0, idx, reviveT: 0, spinT: 0, waveCd: 2, freeWave: 0 };
  if (idx >= 1) { p.suit = ['', '#1f4f9a', '#2a8a3a', '#c8641a'][idx]; const en = NET.mode === 'host' && NET.conns.find((c) => c.idx === idx); p.hat = (en && en.hat) || 'shades'; }
  // eigene Perks + Maske pro Spieler (Online-Koop)
  const en1 = idx >= 1 && NET.mode === 'host' ? NET.conns.find((c) => c.idx === idx) : null;
  p.perks = en1 && en1.perks ? en1.perks : null;
  p.mask = idx === 0 ? save.mask || 'none' : (en1 && en1.mask) || 'none';
  p.armor = perkP(p, 'armor') + (hasBoost('armor') ? 1 : 0) + (hasMask(p, 'zebra') ? 1 : 0);
  p.focus = perkP(p, 'focus') + (hasMask(p, 'fokus') ? 1 : 0);
  const sw = save.startWeapon;
  if (sw && WEAPONS[sw]) p.weapon = { id: sw, ammo: playerAmmo(sw, WEAPONS[sw].ammo || 0, p) };
  if (typeof applyBoosterStart === 'function') applyBoosterStart(p);
  return p;
}
const playerAmmo = (id, a, p) => Math.round(a * (WEAPONS[id].ranged && perkP(p, 'ammo') ? 1.5 : 1) * (WEAPONS[id].ranged && hasMask(p, 'router') ? 1.5 : 1) * (wmod(id, 'mag') ? 1.5 : 1));
function dropAmmo(id) { const w = WEAPONS[id]; return w && w.ranged ? randi(Math.ceil(w.ammo * 0.4), w.ammo) : 0; }
function makePickup(x, y, id, ammo) {
  const w = WEAPONS[id];
  return { x, y, id, ammo: ammo == null ? (w.ranged ? w.ammo : 0) : ammo, vx: 0, vy: 0, rot: rand(TAU), spin: 0, flying: false, thrown: false, life: 0 };
}
function spawnPickup(x, y, id, ammo, ang, speed) {
  if (!WEAPONS[id] || WEAPONS[id].enemyOnly) return null;
  const k = makePickup(x, y, id, ammo);
  k.vx = Math.cos(ang) * speed; k.vy = Math.sin(ang) * speed; k.spin = speed > 150 ? 20 : 6; k.flying = speed > 0;
  G.pickups.push(k);
  return k;
}
function spawnBullet(x, y, a, spd, owner, src, kind = 'bullet', cause) {
  G.bullets.push({ x, y, px: x, py: y, sx: x, sy: y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, owner, src, kind,
    life: (BULLET_KINDS[kind] && BULLET_KINDS[kind].life) || (['wurst', 'bit', 'card', 'letter', 'paper', 'packet', 'pen', 'ramen', 'baka'].includes(kind) ? 3.5 : 1.2), hits: null,
    cause: cause || (kind === 'wurst' ? 'wurst' : (src && src.weapon) || 'pistol') });
}

// ---------------------------------------------------------------------
//  Spieler: P1 = Tastatur + Maus, P2 = Gamepad / zweite Tastenbelegung (coop.js)
// ---------------------------------------------------------------------
function inputP1(p) {
  const wm = screenToWorld(mouse.x, mouse.y);
  const arrows = !coopKeyboardP2();
  let mx = 0, my = 0;
  if (keys.KeyW || (arrows && keys.ArrowUp)) my--;
  if (keys.KeyS || (arrows && keys.ArrowDown)) my++;
  if (keys.KeyA || (arrows && keys.ArrowLeft)) mx--;
  if (keys.KeyD || (arrows && keys.ArrowRight)) mx++;
  return { mx, my, aim: Math.atan2(wm.y - p.y, wm.x - p.x), fire: mouse.down, fireP: mouse.pl, alt: mouse.pr,
    exec: !!pressed.Space, finger: !!(pressed.KeyQ || pressed.KeyF), use: !!pressed.KeyE, wave: !!pressed.KeyV };
}
function updatePlayers(dt) {
  for (const p of G.players) updatePlayer(p, p.idx === 0 ? inputP1(p) : inputP2(p), dt);
}
function updatePlayer(p, inp, dt) {
  if (!p.alive) { p.deadT += dt; return; }
  p.cd -= dt; p.swingT -= dt; p.mouthT -= dt; p.fingerCd -= dt; p.fingerT -= dt; p.invT -= dt; p.waveCd -= dt;
  p.recoil = Math.max(0, p.recoil - dt * 20);
  if (p.execT > 0) { updateExecution(p, dt); return; }
  if (inp.aim != null) p.a = inp.aim;
  if (inp.wave) useVexWave(p);
  let mx = inp.mx, my = inp.my;
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  const w = p.weapon ? WEAPONS[p.weapon.id] : FISTS;
  const slow = w.spin && inp.fire ? 0.55 : 1;
  const sp = 105 * (1 + 0.08 * perkP(p, 'speed')) * slow * (hasBoost('speed') ? 1.12 : 1) * (hasMask(p, 'hase') ? 1.15 : 1), k = 1 - Math.exp(-dt * 18);
  if (inp.net) netFollowGuest(p, inp.net, dt);   // Online-Gast: bewegt sich bei sich selbst, der Host übernimmt die Position
  else {
    p.nfx = undefined;
    p.vx += (mx * sp - p.vx) * k; p.vy += (my * sp - p.vy) * k;
    moveEntity(p, p.vx * dt, p.vy * dt);
    if (ml > 0.1) { p.walkT += dt; doorAssist(p, mx, my, dt); }
    beltPush(p, dt);
  }

  if (w.ranged) {
    if (w.spin) {   // Minigun muss erst anlaufen
      if (inp.fire && p.weapon.ammo > 0) { p.spinT += dt; if (p.spinT >= w.spin && p.cd <= 0) playerShoot(p, w); if (Math.random() < 0.3) Sound.play('spin'); }
      else { p.spinT = 0; if (inp.fireP && p.weapon.ammo <= 0) { Sound.play('click'); p.cd = 0.25; } }
    } else if ((w.auto ? inp.fire : inp.fireP) && p.cd <= 0) {
      if (p.weapon.ammo > 0) playerShoot(p, w);
      else if (inp.fireP) { Sound.play('click'); floatText(p.x, p.y - 16, 'LEER! WERFEN!', '#ff5a5a', true); p.cd = 0.25; }
    }
  } else if (inp.fire && p.cd <= 0) playerSwing(p, w);
  if (inp.alt) pickupOrThrow(p);
  if (inp.exec) tryExecute(p);
  if (inp.finger) fingerGun(p);
  if (inp.use && !(G.arena && G.arena.state === 'break')) {
    const ti = nearTerminal(p);
    if (ti >= 0) {
      if (p.idx === 0 || COOP.on) { openWireshark({ p, ti }); return; }
      return;   // Online-Gast: hackt bei sich selbst (wireshark.js), das Ergebnis kommt als 'hk'
    }
    let used = false;
    for (const f of USE_HOOKS) if (extCall(f, p) === true) { used = true; break; }
    if (!used && p.focus > 0 && G.focusT <= 0) { p.focus--; G.focusT = 3; Sound.play('glitch'); floatText(p.x, p.y - 20, 'ZEITLUPE!', 'rainbow'); }
  }
  const ti = Math.floor(p.y / TS) * G.w + Math.floor(p.x / TS);
  if (G.tiles[ti] === 'l' && laserOn(G.laserGroup[ti])) killPlayer(null, 0, 'laserwall', p);
  if (G.cleared && !G.exiting && G.tiles[ti] === 'X') exitFloor();
}
// VEX-WAVE: Fähigkeit aus dem Kiosk (Taste V)
function useVexWave(p) {
  const lv = perkP(p, 'vexwave');
  if (!lv && !p.freeWave) { Sound.play('click'); floatText(p.x, p.y - 18, 'VEX-WAVE IM KIOSK KAUFEN!', '#c89bff', true); return; }
  if (p.waveCd > 0) { Sound.play('click'); return; }
  if (lv) p.waveCd = [14, 9, 6][lv - 1] * (hasBoost('wave') ? 0.6 : 1); else { p.freeWave--; p.waveCd = 14; }
  fireWave(p, lv >= 3 ? 165 : 125);
}
// Hilft durch Türen: wer leicht schräg auf eine Öffnung zuläuft, wird hineingeschoben
function doorAssist(p, mx, my, dt) {
  const horiz = Math.abs(mx) > Math.abs(my);
  const dir = horiz ? Math.sign(mx) : Math.sign(my);
  const tx = horiz ? Math.floor((p.x + dir * (p.r + 3)) / TS) : Math.floor(p.x / TS);
  const ty = horiz ? Math.floor(p.y / TS) : Math.floor((p.y + dir * (p.r + 3)) / TS);
  if (blocksMoveTile(tx, ty) !== 1) return;
  for (const s2 of [-1, 1]) {
    const ox = horiz ? tx : tx + s2, oy = horiz ? ty + s2 : ty;
    if (blocksMoveTile(ox, oy) === 1) continue;
    const c = horiz ? oy * TS + 8 : ox * TS + 8, cur = horiz ? p.y : p.x;
    if (Math.abs(c - cur) > 13) continue;
    const step = Math.sign(c - cur) * Math.min(Math.abs(c - cur), 85 * dt);
    if (horiz) moveEntity(p, 0, step); else moveEntity(p, step, 0);
    return;
  }
}
function beltPush(e, dt) {
  const c = T_(Math.floor(e.x / TS), Math.floor(e.y / TS));
  if (c === '>') moveEntity(e, 46 * dt, 0); else if (c === '<') moveEntity(e, -46 * dt, 0);
}

function playerShoot(p, w) {
  p.cd = w.rate; p.weapon.ammo--; p.mouthT = 0.12; p.recoil = 2;
  if (w.onFire) { extCall(w.onFire, p, w); return; }   // ganz eigene Waffe (Sound, Kugeln, Lärm macht sie selbst)
  if (w.special === 'wave') { fireWave(p); return; }
  if (w.special === 'boomerang') { throwBoomerang(p); return; }
  let mx = p.x + Math.cos(p.a) * 10, my = p.y + Math.sin(p.a) * 10;
  if (!los(p.x, p.y, mx, my)) { mx = p.x; my = p.y; }
  for (let i = 0; i < w.pellets; i++) {
    spawnBullet(mx, my, p.a + rand(-w.spread, w.spread) * (wmod(p.weapon.id, 'laser') ? 0.5 : 1), (w.speed || (w.pellets > 1 ? rand(380, 470) : 470)) * (w.special === 'flame' ? rand(0.8, 1.2) : 1), 'player', p, w.special || w.kind || 'bullet');
    const b = G.bullets[G.bullets.length - 1];
    if (w.special === 'juice') b.life = 0.75;
    if (w.special === 'flame') { b.life = rand(0.28, 0.4); b.pierce = true; }
    if (w.life) b.life = w.life;
    if (w.pierce) b.pierce = true;
  }
  if (p.idx > 0 && NET.mode === 'host' && !w.special && !w.spin) NET.fxOwn = p.idx;   // Knall + Feuer zeigt ein Online-Gast schon selbst
  if (!w.special) { muzzleFlash(mx, my); if (!weaponNoCasing(w)) casing(p.x, p.y, p.a); }
  shake(w.shake); if (w.special !== 'flame' || Math.random() < 0.25) Sound.play(w.sfx);
  NET.fxOwn = 0;
  makeNoise(p.x, p.y, w.noise * (perkP(p, 'silencer') ? 0.45 : 1) * (wmod(p.weapon && p.weapon.id, 'silent') ? 0.35 : 1) * (hasMask(p, 'robo') ? 0.5 : 1));
}

function playerSwing(p, w) {
  p.cd = w.rate; p.swingT = 0.18; p.swingDir *= -1;
  if (p.idx > 0 && NET.mode === 'host') NET.fxOwn = p.idx;
  Sound.play('swoosh');
  NET.fxOwn = 0;
  let hits = 0;
  for (const e of G.enemies) {
    if (e.state === 'dead') continue;
    const d = dist(p.x, p.y, e.x, e.y), ang = Math.atan2(e.y - p.y, e.x - p.x);
    if (d > w.reach + e.r || (d > 8 && Math.abs(angDiff(p.a, ang)) > w.arc) || !los(p.x, p.y, e.x, e.y)) continue;
    hits++;
    Sound.play(w.hitSfx);
    meleeHit(e, w, ang, p);
  }
  const tx = Math.floor((p.x + Math.cos(p.a) * 13) / TS), ty = Math.floor((p.y + Math.sin(p.a) * 13) / TS);
  if (T_(tx, ty) === 'G') breakGlass(tx, ty);
  if (T_(tx, ty) === 'Z') { damageSafe(tx, ty, w.lethal ? 2 : 1); hits++; }
  if (hits) { shake(3); hitstop(0.03); p.mouthT = 0.3; }
}
function meleeHit(e, w, ang, p) {
  const lethal = w.lethal || (w === FISTS && hasMask(p, 'baka'));
  if (w.onHit && extCall(w.onHit, e, w, ang, p)) return;   // eigene Nahkampfwaffe
  if (e.kind === 'O') { hitProp(e); return; }
  const EX = ENEMY_EXT[e.kind];
  if (EX && EX.melee && extCall(EX.melee, e, w, ang, p)) return;   // neue Gegnerart
  if (e.kind === 'B') { bossDamage(e, lethal ? 3 : 1, ang, 'melee'); return; }
  // Schild-Polizist: von vorne prallt alles ab
  if (e.kind === 'F' && e.state !== 'down' && !w.fling && Math.abs(angDiff(e.a, ang + Math.PI)) < 1.25) {
    floatText(e.x, e.y - 14, 'SCHILD! VON HINTEN!', '#9ab0ff', true); Sound.play('armor'); moveEntity(e, Math.cos(ang) * 5, Math.sin(ang) * 5); return;
  }
  if (e.static || e.kind === 'R') {
    if (!lethal) { floatText(e.x, e.y - 16, e.kind === 'R' ? 'LOL.' : 'KLONK', '#ffffff', true); if (e.kind === 'R') { e.state = 'alert'; e.alerted = true; e.reaction = 0.1; e.spot = 1; } return; }
    if (w.fling && e.kind === 'R') flingEnemy(e, ang, w.fling);
    hurtEnemy(e, 2, 'melee', ang); return;
  }
  if (w.fling && e.state !== 'down') { flingEnemy(e, ang, w.fling); return; }
  if (e.state === 'down' || lethal || e.kind === 'K' || e.kind === 'Q' || e.kind === 'W') killEnemy(e, 'melee', ang);
  else { knockDown(e, ang, 2.6); floatText(e.x, e.y - 14, w === FISTS ? 'PATSCH!' : 'QUIETSCH!', '#ffd84a', true); }
}

function nearestPickup(x, y, r, forEnemy) {
  let best = null, bd = r;
  for (const k of G.pickups) {
    if (k.flying || (forEnemy && WEAPONS[k.id] && WEAPONS[k.id].noEnemy)) continue;
    const d = dist(x, y, k.x, k.y);
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}
function pickupOrThrow(p) {
  const k = nearestPickup(p.x, p.y, 15);
  if (k) {
    const old = p.weapon;
    if (!k.boosted) { k.ammo = playerAmmo(k.id, k.ammo, p); k.boosted = true; }
    p.weapon = { id: k.id, ammo: k.ammo, boosted: true };
    G.pickups.splice(G.pickups.indexOf(k), 1);
    if (old) { const o = spawnPickup(p.x, p.y, old.id, old.ammo, rand(TAU), 40); if (o) o.boosted = true; }
    Sound.play('pickup');
    floatText(p.x, p.y - 16, WEAPONS[k.id].name, '#7ff', true);
    return;
  }
  if (p.weapon) {
    const t = spawnPickup(p.x + Math.cos(p.a) * 6, p.y + Math.sin(p.a) * 6, p.weapon.id, p.weapon.ammo, p.a, 360);
    if (t) { t.thrown = true; t.life = 0.8; t.spin = 22; t.boosted = true; }
    p.weapon = null;
    Sound.play('throwIt');
  }
}

function tryExecute(p) {
  let best = null, bd = 1e9;
  for (const e of G.enemies) {
    const ok = e.state === 'down' || (e.kind === 'B' && e.state !== 'dead' && bossStunned(e));
    if (!ok) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < (e.kind === 'B' ? 30 : 20) && d < bd) { best = e; bd = d; }
  }
  if (!best) return;
  p.execT = 0.62; p.execTarget = best; p.vx = p.vy = 0;
  if (best.kind === 'B') best.modeT = Math.max(best.modeT, 0.9);
  else best.downT = Math.max(best.downT, 1);
}
function updateExecution(p, dt) {
  const e = p.execTarget;
  if (!e || e.state === 'dead') { p.execT = 0; p.execTarget = null; return; }
  p.a = Math.atan2(e.y - p.y, e.x - p.x);
  const prev = p.execT;
  p.execT -= dt;
  for (const th of [0.48, 0.32, 0.16]) {
    if (prev > th && p.execT <= th) {
      const id = p.weapon && p.weapon.id;
      Sound.play(id === 'pan' || id === 'bat' || id === 'shovel' ? 'bonk' : id === 'chicken' ? 'squeak' : 'punch');
      if (e.kind === 'B' && BOSS_INFO[e.btype].noGore) sparks(e.x, e.y, 6, '#ffffff'); else bloodBurst(e.x, e.y, rand(TAU), 8, 70);
      shake(3); p.swingT = 0.14; p.swingDir *= -1; p.mouthT = 0.25;
      floatText(e.x + rand(-6, 6), e.y - 10, pick(['ZACK', 'BAM', 'POW', 'KLONK']), '#fff', true);
    }
  }
  if (p.execT <= 0) {
    p.execTarget = null;
    if (e.kind === 'B') bossDamage(e, 6, p.a, 'exec'); else killEnemy(e, 'exec', p.a);
  }
}

function fingerGun(p) {
  if (p.fingerCd > 0) { Sound.play('click'); return; }
  const pro = perkP(p, 'finger');
  p.fingerCd = pro ? 3 : 5; p.fingerT = 0.7; p.mouthT = 0.5;
  Sound.play('peng');
  floatText(p.x + Math.cos(p.a) * 20, p.y + Math.sin(p.a) * 20 - 8, 'PENG!', 'rainbow');
  let n = 0;
  for (const e of G.enemies) {
    if (e.state === 'dead' || e.state === 'down') continue;
    const d = dist(p.x, p.y, e.x, e.y), ang = Math.atan2(e.y - p.y, e.x - p.x);
    if (d > (pro ? 300 : 240) || Math.abs(angDiff(p.a, ang)) > (pro ? 0.6 : 0.42) || !los(p.x, p.y, e.x, e.y)) continue;
    if (e.kind === 'B') { say(e, 'LÄCHERLICH.', 1.5); activateBoss(e); continue; }
    if (e.static || e.kind === 'Q') { say(e, 'ERROR 404: ANGST NICHT GEFUNDEN', 1.5); continue; }
    e.state = 'confused'; e.confT = e.kind === 'K' ? 2.2 : 1.9; e.windup = 0; e.aimT = 0; e.alerted = true;
    say(e, e.kind === 'K' ? 'WUFF?' : pick(L_CONF), 1.7);
    n++;
  }
  if (n >= 3) floatText(p.x, p.y - 26, 'MASSENPANIK!', 'rainbow');
  else if (n === 0) floatText(p.x, p.y - 18, '...PENG?', '#aaaaaa', true);
}

function makeNoise(x, y, r) {
  for (const e of G.enemies) {
    if (e.kind === 'B') { if (!e.active && e.state !== 'dead' && dist(e.x, e.y, x, y) < r) activateBoss(e); continue; }
    if (e.static || e.state === 'dead' || e.state === 'down' || e.state === 'confused' || e.state === 'alert') continue;
    if (dist(e.x, e.y, x, y) > r) continue;
    e.state = 'search'; e.alerted = true; e.lastSeen = { x, y }; e.pathT = 0; e.lookT = 0;
    if (Math.random() < 0.4) say(e, e.kind === 'K' ? pick(L_ALERT_DOG) : pick(L_SEARCH), 1.2);
  }
}

// [E]-Aktionen von Inhaltsdateien: (p) => true = erledigt (Host + Einzelspieler, auch für Online-Gäste, deren [E] beim Host ankommt)
const USE_HOOKS = [];
function nearTerminal(p = G.player) {
  // jede Hack-Aktion geht einmal pro Etage (wireshark.js); ohne freie Aktion ist der PC "fertig"
  for (const i of G.terminals) {
    if (dist(p.x, p.y, (i % G.w) * TS + 8, ((i / G.w) | 0) * TS + 8) < 24) return (typeof wsHackLeft === 'function' ? wsHackLeft() > 0 : !G.hacked) ? i : -1;
  }
  return -1;
}
// TIKITIKILUKAS O-SAFT: Saft-Explosion
function explode(x, y, r, o = {}) {
  Sound.play('explode'); Sound.play('splat'); shake(9); G.flash = 0.12; hitstop(0.04);
  for (let i = 0; i < 46; i++) {
    const a = rand(TAU), sp = rand(30, 220);
    G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.2, 0.55), col: pick(JUICE), s: pick([1, 2, 2, 3]), kind: 'blood', fric: 6 });
  }
  withDecal(x, y, r + 8, (g) => { for (let k = 0; k < 9; k++) { const a2 = (k / 9) * TAU + hash(k, Math.round(x)) , d = (hash(Math.round(y), k) * r * 0.7); pxEll(g, x + Math.cos(a2) * d, y + Math.sin(a2) * d, 3 + (k % 4), 2 + (k % 3), ['#e8820a', '#f0a01a', '#d97400'][k % 3]); } });
  G.parts.push({ x, y, vx: 0, vy: 0, life: 0.12, max: 0.12, col: '#fff3c0', s: r * 0.8, kind: 'flash' });
  floatText(x, y - 12, pick(o.words || ['SAFTIG!', 'TIKITIKILUKAS!', 'O-SAFT-ATTACKE!', 'VITAMIN C!']), 'rainbow');
  for (const e of G.enemies) {
    if (e.state === 'dead') continue;
    const d = dist(x, y, e.x, e.y), ang = Math.atan2(e.y - y, e.x - x);
    if (d > r + e.r) continue;
    if (e.kind === 'B') bossDamage(e, 4, ang, 'juice'); else hurtEnemy(e, 3, 'juice', ang);
  }
  if (!o.safe) for (const p of G.players) if (p.alive && dist(x, y, p.x, p.y) < r * 0.55) killPlayer(null, Math.atan2(p.y - y, p.x - x), 'osaft', p);
  for (let ty = Math.floor((y - r) / TS); ty <= Math.floor((y + r) / TS); ty++) for (let tx = Math.floor((x - r) / TS); tx <= Math.floor((x + r) / TS); tx++) {
    if (dist(x, y, tx * TS + 8, ty * TS + 8) > r) continue;
    const c = T_(tx, ty);
    if (c === 'G') breakGlass(tx, ty); else if (c === 'Z') damageSafe(tx, ty, 2);
  }
  makeNoise(x, y, 320);
}

// ---------------------------------------------------------------------
//  Schaden, Tod, Punkte, Geld
// ---------------------------------------------------------------------
function knockDown(e, ang, t) {
  if (e.state === 'dead' || e.kind === 'B' || e.static || e.kind === 'R' || (ENEMY_EXT[e.kind] && ENEMY_EXT[e.kind].noKnock)) return;
  if (e.kind === 'K' || e.kind === 'Q') { killEnemy(e, 'melee', ang); return; }
  e.state = 'down'; e.downT = t; e.downAng = ang; e.windup = 0; e.aimT = 0; e.path = null;
  if (e.weapon) { spawnPickup(e.x, e.y, e.weapon, dropAmmo(e.weapon), ang + rand(-0.8, 0.8), rand(60, 110)); e.weapon = null; }
  moveEntity(e, Math.cos(ang) * 6, Math.sin(ang) * 6);
  say(e, pick(['AUA!', 'UFF!', 'OOF!', 'MEIN KOPF!']), 1);
  shake(3); hitstop(0.02);
}
function hurtEnemy(e, dmg, how, ang) {
  const EX = ENEMY_EXT[e.kind];
  if (EX && EX.hurt && extCall(EX.hurt, e, dmg, how, ang)) return e.state === 'dead';   // neue Gegnerart regelt den Schaden selbst
  if (e.kind === 'O') { hitProp(e); return false; }
  if (e.kind === 'B') { bossDamage(e, dmg, ang, how); return false; }
  if (e.hp > 1) {
    e.hp -= dmg;
    if (e.hp > 0) {
      e.flash = 0.1;
      if (e.static) sparks(e.x, e.y, 6, '#9ff'); else bloodBurst(e.x, e.y, ang, 5, 80);
      Sound.play(e.static ? 'punch' : 'hurtBoss');
      if (!e.static) { e.state = 'alert'; e.alerted = true; e.reaction = Math.min(e.reaction || 0.2, 0.2); moveEntity(e, Math.cos(ang) * 3, Math.sin(ang) * 3); }
      return false;
    }
  }
  killEnemy(e, how, ang);
  return true;
}
function killEnemy(e, how, ang) {
  if (e.state === 'dead') return;
  e.state = 'dead';
  if (e.kind === 'W' && !e.boomed) { e.boomed = true; explode(e.x, e.y, 50); }   // O-Saft-Bomber geht hoch
  if (e.weapon) spawnPickup(e.x, e.y, e.weapon, dropAmmo(e.weapon), ang + rand(-1, 1), rand(40, 90));
  e.weapon = null;
  const EX = ENEMY_EXT[e.kind];
  const machine = e.kind === 'Y' || e.kind === 'Q' || e.kind === 'V' || !!(EX && EX.machine);
  if (machine) { sparks(e.x, e.y, 18, '#9ff'); sparks(e.x, e.y, 10, '#ffe14d'); Sound.play('explode'); }
  else bloodBurst(e.x, e.y, ang, how === 'shot' ? 26 : how === 'exec' ? 34 : 20, how === 'shot' ? 160 : 110, how === 'juice' ? JUICE : BLOOD);
  stampCorpse(e, ang);
  const kind = machine ? 'machine' : e.kind === 'K' ? 'dog' : how;
  const base = { shot: 400, melee: 600, exec: 800, door: 700, thrown: 600, friendly: 500, dog: 300, train: 500, machine: 500, juice: 700 }[kind] || 400;
  addKillScore(base * (e.kind === 'R' ? 2 : 1) * ((EX && EX.score) || 1), pick(KILL_WORDS[kind] || KILL_WORDS.melee), e.x, e.y);
  // Geld fallen lassen (muss eingesammelt werden!)
  if (e.kind !== 'V') spawnCash(e.x, e.y, Math.round((4 + G.diff * 2) * Math.min(run.combo, 4) * (e.kind === 'R' || e.kind === 'N' ? 2 : 1) * (1 + sk('lucky') * 0.08)), e.kind === 'R' ? 4 : 2);
  if (e.kind === 'K') floatText(e.x, e.y + 6, 'JAUL!', '#ffffff', true);
  else if (!machine && Math.random() < 0.5) floatText(e.x, e.y + 6, pick(L_DEATH), '#ffffff', true);
  for (const q of G.players) q.mouthT = 0.45;
  hitstop(0.035); shake(how === 'shot' ? 3 : 5); G.flash = 0.06;
  if (!machine) Sound.play('splat');
  if (e.kind === 'V' && G.boss) bossPylonDown(G.boss, e);
  if (EX && EX.onDeath) extCall(EX.onDeath, e, how, ang);
  floorModsCall('onKill', e, how);
  checkClear();
}
function killPlayer(src, ang, cause, who) {
  const p = who || G.player;
  if (!p || !p.alive || window.__god || p.invT > 0 || G.won) return;
  if (p.armor > 0) {
    p.armor--; p.invT = 0.8;
    Sound.play('armor'); shake(6); G.flash = 0.1; sparks(p.x, p.y, 14, '#9ff');
    floatText(p.x, p.y - 18, p.armor ? 'WESTE HÄLT!' : 'WESTE KAPUTT!', '#66ffff');
    moveEntity(p, Math.cos(ang) * 6, Math.sin(ang) * 6);
    return;
  }
  p.alive = false; p.deadT = 0; p.execT = 0;
  floorModsCall('onPlayerDeath', p);
  if (!G.arena && run.livesBy) { run.livesBy[p.idx] = Math.max(0, (run.livesBy[p.idx] || 0) - 1); p.lives = run.livesBy[p.idx]; }
  bloodBurst(p.x, p.y, ang, 36, 150);
  stampCorpse(p, ang);
  Sound.play('death');
  shake(9); G.flash = 0.15; hitstop(0.08);
  G.tip = pick(TIPS);
  G.cause = CAUSE[cause] || 'PECH';
  run.deaths++;
  save.stats.deaths++;
  if (G.players.some((q) => q.alive)) {
    p.reviveT = 4;
    floatText(p.x, p.y - 20, p.lives > 0 ? 'WIEDERBELEBUNG IN 4 SEK (NOCH ' + p.lives + ' LEBEN)' : 'KEINE LEBEN MEHR - NÄCHSTE ETAGE BIST DU WIEDER DA', '#ff9ad5', true);
  } else Sound.muffle(true);
  if (src && src.state !== 'dead') {
    if (src.kind === 'B') bossTaunt(src);
    else say(src, src.kind === 'K' ? 'WUFF!' : pick(L_WIN), 2.5);
  }
}
function addKillScore(base, word, x, y) {
  if (run.time - run.lastKillT < (anyMask('zitrone') ? 6.4 : 3.2)) run.combo++; else run.combo = 1;
  run.lastKillT = run.time;
  run.maxCombo = Math.max(run.maxCombo, run.combo);
  const pts = base * run.combo;
  run.score += pts; run.kills++;
  save.stats.kills++; lilXP(2);
  floatText(x, y - 12, '+' + pts, '#ffffff');
  floatText(x, y - 22, word, 'rainbow');
  if (run.combo > 1) Sound.play('combo', run.combo);
}
function checkClear() {
  if (G.arena || G.cleared || !G.players.some((p) => p.alive)) return;
  if (G.enemies.every((e) => e.state === 'dead' || e.kind === 'O') && !floorModsCall('canClear').includes(false)) {
    G.cleared = true; G.clearT = 0;
    Sound.muffle(true); Sound.play('clear');
    if (G.L.final && G.F.boss) finalVictory();
    const RM = curRunMode(); if (RM && RM.onClear) extCall(RM.onClear);
  }
}

// ---------------------------------------------------------------------
//  Kugeln, herumfliegende Waffen, Abstand halten
// ---------------------------------------------------------------------
function updateBullets(dt) {
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; if (b.kind === 'juice') explode(b.x, b.y, 46); else if (b.kind === 'rocket') rocketBoom(b.x, b.y); else if (b.kind === 'blob') juiceSplash(b.x, b.y); else if (BULLET_KINDS[b.kind] && BULLET_KINDS[b.kind].impact) extCall(BULLET_KINDS[b.kind].impact, b, b.x, b.y); continue; }
    const hp = b.homing ? nearestPlayer(b.x, b.y) : null;
    if (hp) {
      const a = Math.atan2(b.vy, b.vx), ta = Math.atan2(hp.y - b.y, hp.x - b.x), sp = Math.hypot(b.vx, b.vy);
      const na = turnTo(a, ta, b.homing * dt);
      b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
    }
    const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 3));
    b.px = b.x; b.py = b.y;
    for (let s = 0; s < n && !b.dead; s++) {
      const ox = b.x, oy = b.y;
      b.x += b.vx * dt / n; b.y += b.vy * dt / n;
      const tx = Math.floor(b.x / TS), ty = Math.floor(b.y / TS), c = T_(tx, ty);
      if (c === 'G') breakGlass(tx, ty);
      else if (blocksBulletC(c) || (c === 'D' && !G.doors[ty * G.w + tx].open)) {
        b.dead = true;
        if (c === 'Z' && b.owner === 'player') damageSafe(tx, ty, 1);
        if (BULLET_KINDS[b.kind] && BULLET_KINDS[b.kind].impact) { extCall(BULLET_KINDS[b.kind].impact, b, ox, oy); break; }
        if (b.kind === 'juice') { explode(ox, oy, 46); break; }
        if (b.kind === 'rocket') { rocketBoom(ox, oy); break; }
        if (b.kind === 'blob') { juiceSplash(ox, oy); break; }
        if (b.kind === 'wurst') bloodBurst(ox, oy, Math.atan2(-b.vy, -b.vx), 8, 60, ['#ffcc00', '#e6b800', '#a0522d']);
        else sparks(ox, oy, 4, b.kind === 'bit' || b.kind === 'laser' ? '#39ff7a' : '#ffe66d');
        break;
      }
      bulletHit(b);
    }
  }
  G.bullets = G.bullets.filter((b) => !b.dead);
}
function bulletHit(b) {
  const ang = Math.atan2(b.vy, b.vx);
  if (b.owner === 'player') {
    for (const e of G.enemies) {
      if (e.state === 'dead' || (b.hits && b.hits.includes(e))) continue;
      const rr = e.r + (e.state === 'down' ? 2.5 : 1.5);
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < rr * rr) {
        if (b.kind === 'juice') { b.dead = true; explode(b.x, b.y, 46); return; }
        if (b.kind === 'rocket') { b.dead = true; rocketBoom(b.x, b.y); return; }
        if (b.kind === 'blob') { b.dead = true; juiceSplash(b.x, b.y); return; }
        const BK = BULLET_KINDS[b.kind], EX = ENEMY_EXT[e.kind];
        if ((BK && BK.hit && extCall(BK.hit, b, e, ang)) || (EX && EX.bullet && extCall(EX.bullet, e, b, ang))) {   // eigene Kugel / Gegnerart: erledigt
          if (b.pierce) { (b.hits || (b.hits = [])).push(e); continue; }
          b.dead = true; return;
        }
        if (b.kind === 'flame') { (b.hits || (b.hits = [])).push(e); if (e.kind === 'B') bossDamage(e, 0.25, ang, 'fire'); else hurtEnemy(e, 1, 'fire', ang); continue; }
        if (e.kind === 'F' && e.state !== 'down' && Math.abs(angDiff(e.a, ang + Math.PI)) < 1.25) { sparks(b.x, b.y, 5, '#9ab0ff'); Sound.play('armor'); b.dead = true; return; }   // Schild
        if (e.kind === 'J' && e.state !== 'down' && Math.random() < 0.45) { moveEntity(e, Math.cos(ang + Math.PI / 2) * 10, Math.sin(ang + Math.PI / 2) * 10); floatText(e.x, e.y - 14, 'AUSGEWICHEN!', '#ff6a6a', true); (b.hits || (b.hits = [])).push(e); continue; }
        if (b.kind === 'zap') { taserHit(e, ang); b.dead = true; return; }
        const bd = (BK && BK.dmg) || (b.kind === 'laser' ? 2 : b.kind === 'harpoon' ? 3 : 1);
        if (e.kind === 'B') bossDamage(e, bd, ang, 'shot'); else hurtEnemy(e, bd, 'shot', ang);
        if (b.pierce) { (b.hits || (b.hits = [])).push(e); continue; }
        b.dead = true; return;
      }
    }
  } else {
    for (const p of G.players) {
      const pr = b.kind === 'wurst' || b.kind === 'card' || b.kind === 'pie' ? p.r + 3 : b.kind === 'ramen' || b.kind === 'tire' ? p.r + 4 : p.r + 1;
      if (p.alive && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < pr * pr) { killPlayer(b.src, ang, b.cause, p); b.dead = true; return; }
    }
    if (b.kind !== 'bullet') return;
    for (const e of G.enemies) {
      if (e === b.src || e.kind === 'B' || e.static || e.state === 'dead' || e.state === 'down' || e.kind === 'Q') continue;
      if (dist(b.sx, b.sy, b.x, b.y) < 12) continue;
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + 1) ** 2) { hurtEnemy(e, 1, 'friendly', ang); b.dead = true; return; }
    }
  }
}
function pickupBlocked(x, y, k) {
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS), c = T_(tx, ty);
  if (blocksBulletC(c)) { if (c === 'Z' && k.thrown) damageSafe(tx, ty, 1); return true; }
  if (c === 'D' && !G.doors[ty * G.w + tx].open) return true;
  if (c === 'G') { if (k.thrown) { breakGlass(tx, ty); return false; } return true; }
  return false;
}
function updatePickups(dt) {
  for (const k of G.pickups) {
    if (!k.flying) continue;
    const boom = () => { if (k.id === 'osaft' && k.ammo > 0 && !k.dead) { k.dead = true; explode(k.x, k.y, 52); return true; } return false; };
    const nx = k.x + k.vx * dt;
    if (pickupBlocked(nx, k.y, k)) { k.vx *= -0.3; if (k.thrown) { k.thrown = false; if (!boom()) { Sound.play('punch'); sparks(k.x, k.y, 3, '#fff'); } } } else k.x = nx;
    const ny = k.y + k.vy * dt;
    if (pickupBlocked(k.x, ny, k)) { k.vy *= -0.3; if (k.thrown) { k.thrown = false; if (!boom()) { Sound.play('punch'); sparks(k.x, k.y, 3, '#fff'); } } } else k.y = ny;
    if (k.dead) continue;
    k.rot += k.spin * dt;
    if (k.thrown) {
      k.life -= dt;
      for (const e of G.enemies) {
        if (e.state === 'dead' || e.state === 'down') continue;
        if (dist(k.x, k.y, e.x, e.y) < e.r + 5) {
          const ang = Math.atan2(k.vy, k.vx);
          if (boom()) break;
          const lethal = k.id === 'pan' || k.id === 'katana' || perk('ninja') || !!(WEAPONS[k.id] && WEAPONS[k.id].throwLethal);
          if (e.kind === 'B') bossDamage(e, lethal ? 3 : 1, ang, 'thrown');
          else if (e.static || e.kind === 'R') { Sound.play('bonk'); hurtEnemy(e, lethal ? 2 : 1, 'thrown', ang); }
          else if (lethal || e.kind === 'K' || e.kind === 'Q') { Sound.play(k.id === 'pan' ? 'bonk' : 'punch'); killEnemy(e, 'thrown', ang); }
          else { Sound.play(k.id === 'chicken' ? 'squeak' : 'punch'); knockDown(e, ang, 2.6); floatText(e.x, e.y - 14, 'K.O.!', '#ffd84a'); }
          k.vx *= -0.25; k.vy *= -0.25; k.thrown = false;
          break;
        }
      }
      if (k.life <= 0) k.thrown = false;
    } else {
      const f = Math.exp(-dt * 7);
      k.vx *= f; k.vy *= f; k.spin *= f;
    }
    if (!k.thrown && Math.hypot(k.vx, k.vy) < 10) { k.flying = false; k.vx = k.vy = 0; }
  }
  G.pickups = G.pickups.filter((k) => !k.dead);
}
function separate() {
  const list = G.enemies.filter((e) => e.state !== 'dead' && e.state !== 'down' && !e.flying);
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
      if (d > 0.01 && d < m) {
        const push = (m - d) / 2;
        if (!a.static) { a.x -= dx / d * push; a.y -= dy / d * push; resolve(a); }
        if (!b.static) { b.x += dx / d * push; b.y += dy / d * push; resolve(b); }
      }
    }
    for (const p of G.players) {
      if (!p.alive || p.execT > 0) continue;
      const dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy), m = a.r + p.r;
      if (d > 0.01 && d < m) {
        const push = (m - d) / (a.static ? 1 : 2);
        if (!a.static) { a.x -= dx / d * push; a.y -= dy / d * push; resolve(a); }
        p.x += dx / d * push; p.y += dy / d * push; resolve(p);
      }
    }
  }
}
function nearestPlayer(x, y) {
  let best = null, bd = 1e9;
  for (const p of G.players) { if (!p.alive) continue; const d = dist(x, y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
  return best;
}
