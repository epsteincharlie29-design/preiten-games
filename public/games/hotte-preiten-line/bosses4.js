'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Neue Bosse, jeder mit eigenem Trick:
//   ZITRO ZACKZACK     -> Zuckersack kaputthauen, er rennt hin und frisst
//   CLOWNI CLOWNOWSKI  -> alle Ballons zerstören, dann fällt er hin
//   WATCHDOG 3000      -> Reboot-Knopf auf dem Rücken treffen (von hinten)
//   DER SCHROTTKÖNIG   -> unter den Magnet locken, dann den Hebel hauen
//   DER QUIZMASTER     -> den Buzzer mit der richtigen Antwort hauen
//  Alle Bosse hängen sich über BOSS_EXT in bosses.js ein.
// =====================================================================
const BOSS_EXT = {};
Object.assign(BOSS_INFO, {
  zitro: { name: 'ZITRO ZACKZACK', hp: 55, r: 10, song: 'boss', noGore: true, koText: 'K.O.! ZUCKERKOMA...' },
  clown: { name: 'CLOWNI CLOWNOWSKI', hp: 55, r: 9, song: 'boss', noGore: true, koText: 'K.O.! DIE SHOW IST VORBEI. HUP.' },
  watchdog: { name: 'WATCHDOG 3000', hp: 60, r: 11, song: 'boss', noGore: true, koText: 'K.O.! WATCHDOG.EXE REAGIERT NICHT MEHR.' },
  schrott: { name: 'DER SCHROTTKÖNIG', hp: 65, r: 12, song: 'boss', noGore: true, koText: 'K.O.! AB IN DIE SCHROTTPRESSE...' },
  quiz: { name: 'DER QUIZMASTER', hp: 55, r: 9, song: 'boss', noGore: true, koText: 'K.O.! WIR SCHALTEN ZUR WERBUNG...' },
});
Object.assign(BOSS_WEAK, {
  zitro: 'HAU EINEN ZUCKERSACK KAPUTT - ER RENNT HIN UND FRISST!',
  clown: 'ZERSTÖR ALLE SEINE BALLONS - DANN FÄLLT ER HIN!',
  watchdog: 'TRIFF DEN REBOOT-KNOPF AUF SEINEM RÜCKEN (VON HINTEN)!',
  schrott: 'LOCK IHN UNTER EINEN MAGNET - DANN DEN HEBEL HAUEN!',
  quiz: 'HAU DEN BUZZER MIT DER RICHTIGEN ANTWORT!',
});
Object.assign(L_BOSS, {
  zitro: ['ZACK ZACK!', 'SAUER MACHT LUSTIG!', 'DEIN SAFT IST ZU SÜSS!', 'ZITRONIA REGIERT DIE STADT!', 'NIMM DAS, ORANGEN-FAN!', 'SAFT-MAFIA FOREVER!'],
  clown: ['HUP HUP!', 'LACH DOCH MAL!', 'APPLAUS! APPLAUS!', 'ICH BIN DER LUSTIGSTE!', 'SAHNETORTE GEFÄLLIG?', 'DIE SHOW MUSS WEITERGEHEN!'],
  watchdog: ['WUFF.EXE', 'ZIEL ERFASST.', 'SCANNE...', 'EINDRINGLING!', 'BELL-PROTOKOLL AKTIV.', 'SITZ! PLATZ! STIRB!'],
  schrott: ['ALLES SCHROTT!', 'ICH PRESS DICH ZUM WÜRFEL!', 'MEIN REICH! MEIN MÜLL!', 'REIFEN-WECHSEL!', 'DU BIST NUR ALTMETALL!'],
  quiz: ['UND NUN... DIE NÄCHSTE FRAGE!', 'APPLAUS FÜR MICH!', 'DAS PUBLIKUM LIEBT MICH!', 'ZEIT LÄUFT!', 'WER WIRD MILLIONÄR? DU NICHT!'],
});
Object.assign(CAUSE, {
  lemon: 'ZITRONENSAFT IM AUGE', zitro: 'ZITRO ZACKZACK', pie: 'SAHNETORTE', juggle: 'JONGLIERBALL', honk: 'DIE RIESEN-HUPE', clown: 'CLOWNI CLOWNOWSKI',
  confetti: 'KONFETTI-KANONE', dogshot: 'LASER-BELLEN', bark: 'MEGA-WUFF', watchdog: 'WATCHDOG 3000', missile: 'MINI-RAKETE',
  tire: 'ALTREIFEN', scrap: 'SCHROTT-REGEN', wrench: 'SCHRAUBENSCHLÜSSEL', schrott: 'DER SCHROTTKÖNIG', note: 'FALSCHER TON', spot: 'SCHEINWERFER', quiz: 'DER QUIZMASTER',
});

// ---------- Hilfen ----------
function bShot(e, a, sp, kind, cause, life) {
  spawnBullet(e.x + Math.cos(a) * (e.r + 3), e.y + Math.sin(a) * (e.r + 3), a, sp, 'enemy', e, kind, cause);
  const b = G.bullets[G.bullets.length - 1]; b.life = life || 3.5; return b;
}
function bFan(e, a, n, spread, sp, kind, cause) { for (let i = 0; i < n; i++) bShot(e, n > 1 ? a - spread / 2 + spread * i / (n - 1) : a, sp, kind, cause); }
function bRing(e, n, sp, kind, cause, gapLen) {
  const gap = randi(0, n - 1);
  for (let i = 0; i < n; i++) { if ((i - gap + n) % n < gapLen) continue; bShot(e, i * TAU / n, sp, kind, cause); }
}
function bChase(e, p, step, dt, keep) {
  if (dist(e.x, e.y, p.x, p.y) <= (keep || 28)) return;
  if (los(e.x, e.y, p.x, p.y)) moveToward(e, p.x, p.y, step);
  else { e.pathT -= dt; if (e.pathT <= 0) { e.path = findPath(e.x, e.y, p.x, p.y); e.pathT = 0.6; } followPath(e, step, dt); }
  e.walkT += dt;
}
function bTouch(e, p, pa, pd, cause) { if (e.mode !== 'stunned' && p.alive && p.execT <= 0 && pd < e.r + p.r) killPlayer(e, pa, cause, p); }
const bAlive = () => G.players.filter((q) => q.alive);
// feste Stellen in der Boss-Arena (Anteile von Breite/Höhe der Arena über der Tür)
function arenaBottom() { let y = G.h - 1; for (let i = 0; i < G.tiles.length; i++) if (G.tiles[i] === 'D') y = Math.min(y, Math.floor(i / G.w)); return y; }
function arenaSpotAt(fx, fy) {
  const bot = arenaBottom(), tx0 = Math.round(1 + fx * (G.w - 3)), ty0 = Math.round(1 + fy * (bot - 2));
  const ok = (x, y) => {
    if (x < 2 || y < 2 || x >= G.w - 2 || y >= bot - 1) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = (y + dy) * G.w + x + dx; if (G.solid[i] || 'DX '.includes(G.tiles[i])) return false; }
    return !G.enemies.some((o) => o.kind === 'O' && o.state !== 'dead' && dist(o.x, o.y, x * TS + 8, y * TS + 8) < 20);
  };
  for (let r = 0; r < 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) === r && ok(tx0 + dx, ty0 + dy)) return [(tx0 + dx) * TS + 8, (ty0 + dy) * TS + 8];
  }
  return randomArenaSpot(40);
}
// fallende Sachen (Schrott, Raketen, Konfetti, Scheinwerfer): roter Kreis, dann Treffer
function addDrop(x, y, r, t, look) { (G.hazards = G.hazards || []).push({ kind: 'drop', x, y, r, t, max: t, look }); }
function dropAt(target, spread, r, t, look) { const q = target || pick(bAlive()) || G.player; addDrop(q.x + rand(-spread, spread), q.y + rand(-spread, spread), r, t, look); }
function updateDrops(dt) {
  if (!G.hazards) return;
  for (const h of G.hazards) {
    if (h.kind !== 'drop' || h.dead) continue;
    h.t -= dt;
    if (h.t > 0) continue;
    h.dead = true; shake(5); Sound.play(h.look === 'spot' ? 'zap' : 'slam');
    sparks(h.x, h.y, 14, h.look === 'confetti' ? pick(['#ff3fa4', '#3fd0ff', '#ffe14d']) : h.look === 'spot' ? '#fff8c0' : '#cccccc');
    const cause = h.look === 'scrap' ? 'scrap' : h.look === 'spot' ? 'spot' : h.look === 'confetti' ? 'confetti' : 'missile';
    for (const p of G.players) if (p.alive && dist(p.x, p.y, h.x, h.y) < h.r) killPlayer(G.boss, Math.atan2(p.y - h.y, p.x - h.x), cause, p);
    for (const o of G.enemies) if (o.state !== 'dead' && o.kind !== 'B' && !o.static && dist(o.x, o.y, h.x, h.y) < h.r) killEnemy(o, 'friendly', 0);
  }
}
function drawDrops(g) {
  if (!G.hazards) return;
  for (const h of G.hazards) {
    if (h.kind !== 'drop') continue;
    const k = clamp(1 - h.t / h.max, 0, 1), x = Math.round(h.x), y = Math.round(h.y);
    if (h.look === 'spot') { g.fillStyle = `rgba(255,250,200,${0.1 + 0.3 * k})`; g.beginPath(); g.arc(x, y, h.r, 0, TAU); g.fill(); }
    g.strokeStyle = `rgba(255,40,40,${0.5 + Math.sin(T * 30) * 0.4})`; g.lineWidth = 1;
    g.beginPath(); g.arc(x, y, h.r, 0, TAU); g.stroke();
    g.fillStyle = `rgba(255,40,40,${0.1 + 0.2 * k})`; g.beginPath(); g.arc(x, y, h.r * k, 0, TAU); g.fill();
    const fy = Math.round(y - (1 - k) * 80);
    if (h.look === 'scrap') { g.fillStyle = '#6a6a74'; g.fillRect(x - 5, fy - 3, 10, 6); g.fillStyle = '#8a5a3a'; g.fillRect(x - 3, fy - 1, 4, 2); }
    else if (h.look === 'missile') { g.fillStyle = '#c8c8d8'; g.fillRect(x - 1, fy - 6, 3, 8); g.fillStyle = '#ff2a3a'; g.fillRect(x - 1, fy + 2, 3, 2); }
    else if (h.look === 'confetti') { for (let i = 0; i < 4; i++) { g.fillStyle = ['#ff3fa4', '#3fd0ff', '#ffe14d', '#7dff7a'][i]; g.fillRect(x - 5 + i * 3, fy - 2 + (i % 2) * 3, 2, 2); } }
  }
}
// Kugeln der neuen Bosse zeichnen
function drawBossBullet(g, b) {
  const x = Math.round(b.x), y = Math.round(b.y);
  switch (b.kind) {
    case 'lemon': pxEll(g, x, y, 3, 2, '#fff04d'); g.fillStyle = '#c8b020'; g.fillRect(x + 2, y, 1, 1); return true;
    case 'pie': pxEll(g, x, y, 4, 4, '#f4f4f4'); pxEll(g, x, y, 3, 3, '#ff9ad5'); g.fillStyle = '#e01b3c'; g.fillRect(x, y - 1, 1, 1); return true;
    case 'ball': pxEll(g, x, y, 3, 3, ['#ff3b3b', '#3fd0ff', '#ffe14d', '#7dff7a'][Math.abs(Math.floor(b.sx + b.sy)) % 4]); return true;
    case 'confetti': g.fillStyle = ['#ff3fa4', '#3fd0ff', '#ffe14d', '#7dff7a'][Math.abs(Math.floor(b.sx * 3 + b.sy)) % 4]; g.fillRect(x - 1, y - 1, 3, 3); return true;
    case 'dogshot': { const a = Math.atan2(b.vy, b.vx); g.strokeStyle = '#ff2a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x - Math.cos(a) * 6, b.y - Math.sin(a) * 6); g.lineTo(b.x, b.y); g.stroke(); g.lineWidth = 1; return true; }
    case 'tire': pxEll(g, x, y, 5, 5, '#111'); pxEll(g, x, y, 2, 2, '#5a5a66'); g.fillStyle = '#333'; g.fillRect(x - 4 + Math.round(Math.sin(T * 20) * 2), y - 1, 2, 2); return true;
    case 'note': g.fillStyle = '#2a0030'; g.fillRect(x - 3, y, 5, 4); g.fillStyle = '#ff9ad5'; g.fillRect(x - 2, y + 1, 3, 2); g.fillRect(x, y - 4, 1, 5); g.fillRect(x + 1, y - 4, 2, 1); return true;
  }
  return false;
}

// =====================================================================
//  ZITRO ZACKZACK - Chef der ZITRONIA AG (süchtig nach Zucker)
// =====================================================================
BOSS_EXT.zitro = {
  taunts: ['ZU LANGSAM, ORANGE!', 'SAUER GEWINNT IMMER!', 'ZACK ZACK - WEG BIST DU!'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; say(e, 'ZACK ZACK! WER STÖRT MEINE ZITRONEN-PRESSE?!', 3); Sound.play('boss'); },
  setup() { for (const [fx, fy] of [[0.12, 0.25], [0.88, 0.25], [0.5, 0.82]]) { const s = arenaSpotAt(fx, fy); if (s) spawnProp('sugar', s[0], s[1]); } },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
    updateDrops(dt);
    switch (e.mode) {
      case 'walk':
        e.a = turnTo(e.a, pa, 3 * dt);
        bChase(e, p, (angry ? 50 : 40) * dt, dt, 36);
        e.shootT -= dt;
        if (e.shootT <= 0 && sees) { e.shootT = angry ? 1.35 : 1.8; bFan(e, pa, angry ? 4 : 3, 0.55, 140, 'lemon', 'lemon'); Sound.play('throwIt'); if (Math.random() < 0.3) say(e, pick(L_BOSS.zitro), 1.3); }
        e.modeT -= dt;
        if (e.modeT <= 0) {
          e.attack = (e.attack + 1) % 2;
          if (e.attack === 1) { e.mode = 'spray'; e.modeT = 2.2; e.spinA = pa; e.shootT = 0; say(e, 'ZITRONEN-DUSCHE!', 1.2); Sound.play('boss'); }
          else if (sees) { e.mode = 'windup'; e.modeT = 0.65; say(e, 'ZACK ZACK!!', 0.8); Sound.play('boss_attack'); }
          else e.modeT = 1;
        }
        break;
      case 'spray':
        e.modeT -= dt; e.spinA += dt * (angry ? 3.0 : 2.4); e.a = e.spinA; e.shootT -= dt;
        if (e.shootT <= 0) { e.shootT = 0.1; bShot(e, e.spinA, 115, 'lemon', 'lemon'); bShot(e, e.spinA + Math.PI, 115, 'lemon', 'lemon'); }
        if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(3, 4); e.shootT = 1; }
        break;
      case 'windup':
        e.a = turnTo(e.a, pa, 6 * dt); e.modeT -= dt;
        if (e.modeT <= 0) { e.mode = 'dash'; e.ca = e.a; e.modeT = 0.8; }
        break;
      case 'dash': {
        const want = (angry ? 290 : 260) * dt, m = moveEntity(e, Math.cos(e.ca) * want, Math.sin(e.ca) * want);
        e.walkT += dt * 2; e.modeT -= dt;
        // gegen die Wand? Tut ihm nichts - nur Zucker haut ihn um!
        if (m < want * 0.4) { shake(6); Sound.play('slam'); say(e, 'AUTSCH! ...EGAL, ICH BIN AUS ZITRONE!', 1.2); e.mode = 'walk'; e.modeT = rand(2.5, 3.5); }
        else if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(3, 4); }
        break;
      }
      case 'sugarRun': {
        const s = e.sugar; e.modeT -= dt;
        if (!s) { e.mode = 'walk'; break; }
        const d = dist(e.x, e.y, s.x, s.y), sp = 150 * dt;
        e.a = turnTo(e.a, Math.atan2(s.y - e.y, s.x - e.x), 8 * dt);
        if (d > 12) {
          if (los(e.x, e.y, s.x, s.y)) moveToward(e, s.x, s.y, sp);
          else { e.pathT -= dt; if (e.pathT <= 0) { e.path = findPath(e.x, e.y, s.x, s.y); e.pathT = 0.5; } followPath(e, sp, dt); }
          e.walkT += dt * 2;
        }
        if (d <= 16 || e.modeT <= 0) {
          for (const o of propsOf('sugar')) if (o.spent) { o.state = 'dead'; sparks(o.x, o.y, 18, '#ffffff'); }
          e.mode = 'stunned'; e.modeT = 3.4; e.sugar = null;
          say(e, pick(['MMMH... ZUCKER!!!', 'SÜSS! SO SÜSS!', 'NUR NOCH EIN LÖFFEL...']), 2); Sound.play('wurst');
        }
        break;
      }
      case 'stunned':
        e.modeT -= dt;
        if (Math.random() < 0.3) G.parts.push({ x: e.x + rand(-6, 6), y: e.y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-30, -5), life: 0.4, col: '#ffffff', s: 1, kind: 'spark' });
        if (e.modeT <= 0) {
          e.mode = 'walk'; e.modeT = rand(2.5, 3.5);
          say(e, pick(['ZUCKERSCHOCK VORBEI! JETZT BIN ICH SAUER!', 'SAUER!!!', 'DAS WAR MEIN LETZTER ZUCKER!']), 1.6);
          if (propsOf('sugar').filter((o) => !o.spent).length < 2) { const s = randomArenaSpot(100); if (s) spawnProp('sugar', s[0], s[1]); }
        }
        break;
    }
    bTouch(e, p, pa, pd, 'zitro');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'ZITRONIA-JUNGS! HOLT IHN!', 2); spawnMinions('E', 2); }
  },
  draw(g, e) {
    const s = Math.round(Math.sin(e.walkT * 10) * 3);
    g.fillStyle = '#111'; g.fillRect(-4 + s, -8, 6, 4); g.fillRect(-4 - s, 4, 6, 4);
    pxEll(g, -1, 0, 9, 10, '#a08a10'); pxEll(g, 0, 0, 8, 9, '#ffe14d');
    g.fillStyle = '#2a8a3a'; g.fillRect(2, -1, 7, 2);
    g.fillStyle = '#ffe14d'; g.fillRect(2, -11, 7, 3); g.fillRect(2, 8, 7, 3);
    g.fillStyle = '#f0c8a0'; g.fillRect(9, -11, 2, 3); g.fillRect(9, 8, 2, 3);
    pxEll(g, 12, 9, 3, 2, '#fff04d');
    pxEll(g, 0, 0, 6, 7, '#d8c020'); pxEll(g, 1, 0, 5, 6, '#fff04d');
    g.fillStyle = '#111'; g.fillRect(4, -4, 2, 3); g.fillRect(4, 1, 2, 3); g.fillRect(4, -1, 1, 2);
    g.fillStyle = '#3aaa4a'; g.fillRect(-7, -1, 3, 2); g.fillRect(-8, -2, 2, 1);
  },
  extra(g, e) {
    drawDrops(g);
    if (e.mode === 'sugarRun' && e.sugar) { g.strokeStyle = 'rgba(255,255,255,0.4)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.sugar.x, e.sugar.y); g.stroke(); g.setLineDash([]); }
  },
};
PROP_HIT.sugar = (o, b, live) => {
  if (o.spent) return;
  if (!live) { o.state = 'dead'; return; }
  if (b.mode === 'stunned' || b.mode === 'sugarRun') { if (T - (o.msgT || -9) > 1) { o.msgT = T; floatText(o.x, o.y - 16, 'ER FRISST SCHON!', '#cccccc', true); } return; }
  o.spent = true; Sound.play('splat'); sparks(o.x, o.y, 16, '#ffffff');
  floatText(o.x, o.y - 18, 'ZUCKER! ZITRO RIECHT ES...', '#ffffff');
  b.mode = 'sugarRun'; b.modeT = 3.5; b.sugar = { x: o.x, y: o.y }; b.path = null; b.pathT = 0;
  say(b, pick(['ZUCKER?! ZUCKEEER!!!', 'ICH RIECHE ZUCKER!', 'NICHT DER ZUCKER... DOCH, DER ZUCKER!']), 1.6);
};
PROP_DRAW.sugar = (g, e, x, y, off, blink) => {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 6, y + 4, 13, 3);
  pxEll(g, x, y, 7, 6, e.spent ? '#bfb39a' : '#e8dcc0'); g.fillStyle = '#c8b898'; g.fillRect(x - 3, y - 7, 6, 2);
  g.fillStyle = '#3fd0ff'; g.fillRect(x - 4, y - 1, 8, 3);
  if (e.spent) pxEll(g, x + 6, y + 3, 5, 2, '#ffffff');
  else { txt('ZUCKER', x, y - 18, { g, font: FS, align: 'center', color: '#ffffff' }); if (blink) txt('!', x, y - 26, { g, font: FS, align: 'center', color: '#ffe14d' }); }
};

// =====================================================================
//  CLOWNI CLOWNOWSKI - schwebt an Ballons durch sein Zirkuszelt
// =====================================================================
const BALLOON_COLS = ['#ff3b3b', '#3fd0ff', '#ffe14d', '#7dff7a'];
function clownBalloons(e, n) { for (let k = 0; k < n; k++) { const o = spawnProp('balloon', e.x, e.y - 20); o.suit = BALLOON_COLS[k % 4]; o.r = 5; } }
BOSS_EXT.clown = {
  taunts: ['HUP HUP! DU BIST RAUS!', 'DAS PUBLIKUM LACHT ÜBER DICH!', 'TÖRÖÖÖ!'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; say(e, 'HUP HUP! WILLKOMMEN IN MEINER SHOW!', 3); Sound.play('boss'); },
  setup(e) { clownBalloons(e, 3); },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
    updateDrops(dt);
    const bal = propsOf('balloon');
    e.spinA += dt * (angry ? 2.2 : 1.6);
    bal.forEach((o, k) => { const a = e.spinA + k * TAU / bal.length; o.x = e.x + Math.cos(a) * 25; o.y = e.y + Math.sin(a) * 25 - 4; });
    switch (e.mode) {
      case 'walk': {
        e.a = turnTo(e.a, pa, 4 * dt);
        const sp = (46 + (3 - Math.min(3, bal.length)) * 10 + (angry ? 10 : 0)) * dt;
        if (!sees) bChase(e, p, sp, dt, 30);
        else {
          if (pd > 130) moveToward(e, p.x, p.y, sp);
          else if (pd < 85) moveEntity(e, -Math.cos(pa) * sp, -Math.sin(pa) * sp);
          const side = e.sweep || 1, m = moveEntity(e, Math.cos(pa + Math.PI / 2) * sp * 0.7 * side, Math.sin(pa + Math.PI / 2) * sp * 0.7 * side);
          if (m < sp * 0.3) e.sweep = -side;
          e.walkT += dt;
        }
        e.shootT -= dt;
        if (e.shootT <= 0 && sees) {
          e.shootT = angry ? 1.25 : 1.65;
          bShot(e, pa, 150, 'pie', 'pie'); if (angry) { bShot(e, pa - 0.32, 140, 'pie', 'pie'); bShot(e, pa + 0.32, 140, 'pie', 'pie'); }
          Sound.play('throwIt'); if (Math.random() < 0.3) say(e, pick(L_BOSS.clown), 1.3);
        }
        e.modeT -= dt;
        if (e.modeT <= 0) {
          e.attack = (e.attack + 1) % 3;
          if (e.attack === 0) { e.mode = 'juggle'; e.burst = angry ? 3 : 2; e.shootT = 0.4; say(e, 'JONGLIER-SHOW!', 1.2); Sound.play('boss'); }
          else if (e.attack === 1) { e.mode = 'honk'; e.modeT = 0.75; say(e, 'HUUUUUP!', 0.9); Sound.play('boss_attack'); }
          else { e.mode = 'confetti'; e.modeT = 1.6; say(e, 'KONFETTI-REGEN!', 1.2); for (let k = 0; k < (angry ? 6 : 4); k++) dropAt(null, 40, 20, rand(1.0, 1.5), 'confetti'); }
        }
        break;
      }
      case 'juggle':
        e.shootT -= dt;
        if (e.shootT <= 0) { e.shootT = 0.6; bRing(e, 16, 92 + (3 - e.burst) * 10, 'ball', 'juggle', 5); Sound.play('swoosh'); e.burst--; if (e.burst <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); } }
        break;
      case 'honk':
        e.modeT -= dt;
        if (e.modeT <= 0) {
          Sound.play('boss_phase'); shake(8);
          for (const q of G.players) if (q.alive && dist(q.x, q.y, e.x, e.y) < 52 && los(e.x, e.y, q.x, q.y)) killPlayer(e, Math.atan2(q.y - e.y, q.x - e.x), 'honk', q);
          bRing(e, 10, 125, 'ball', 'juggle', 3);
          e.mode = 'walk'; e.modeT = rand(2.5, 3.5);
        }
        break;
      case 'confetti': e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); } break;
      case 'stunned':
        e.modeT -= dt;
        if (e.modeT <= 0) { e.mode = 'pump'; e.modeT = 1.1; say(e, 'NEUE BALLONS! FFFFFT...', 1.2); Sound.play('squeak'); }
        break;
      case 'pump':
        e.modeT -= dt;
        if (e.modeT <= 0) { clownBalloons(e, angry ? 4 : 3); e.mode = 'walk'; e.modeT = rand(2.5, 3.5); say(e, pick(['DIE SHOW GEHT WEITER!', 'HUP HUP! NOCHMAL!', 'ZUGABE!']), 1.4); }
        break;
    }
    bTouch(e, p, pa, pd, 'clown');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'MEINE BALLONTIERE! FASST!', 2); spawnMinions('K', 2); }
  },
  draw(g, e) {
    const s = Math.round(Math.sin(e.walkT * 12) * 3), down = e.mode === 'stunned' || e.mode === 'pump';
    if (down) g.rotate(Math.PI / 2);
    g.fillStyle = '#ff3b3b'; g.fillRect(-2 + s, -9, 9, 4); g.fillRect(-2 - s, 5, 9, 4);
    pxEll(g, -1, 0, 9, 10, '#6a1a8a'); pxEll(g, 0, 0, 8, 9, '#c43aff');
    g.fillStyle = '#ffe14d'; for (const [a, b] of [[-4, -5], [2, 3], [-3, 4], [3, -4], [-1, -1]]) g.fillRect(a, b, 2, 2);
    g.fillStyle = '#c43aff'; g.fillRect(2, -11, 7, 3); g.fillRect(2, 8, 7, 3);
    g.fillStyle = '#fff'; g.fillRect(9, -11, 3, 3); g.fillRect(9, 8, 3, 3);
    pxEll(g, 0, 0, 6, 6, '#f4f4f4');
    g.fillStyle = '#ff3fa4'; g.fillRect(-4, -8, 4, 3); g.fillStyle = '#3fd0ff'; g.fillRect(-4, 5, 4, 3); g.fillStyle = '#7dff7a'; g.fillRect(-7, -3, 3, 6);
    g.fillStyle = '#e01b3c'; g.fillRect(2, -2, 3, 1); g.fillRect(2, 1, 3, 1);
    pxEll(g, 6, 0, 2, 2, '#ff2020');
  },
  extra(g, e) {
    drawDrops(g);
    if (e.mode === 'honk') { const k = 1 - e.modeT / 0.75; g.strokeStyle = `rgba(255,60,60,${0.5 + Math.sin(T * 40) * 0.4})`; g.lineWidth = 1; g.beginPath(); g.arc(e.x, e.y, 52, 0, TAU); g.stroke(); g.fillStyle = `rgba(255,60,60,${0.1 + 0.2 * k})`; g.beginPath(); g.arc(e.x, e.y, 52 * k, 0, TAU); g.fill(); }
  },
};
PROP_HIT.balloon = (o, b, live, stun) => {
  o.state = 'dead'; Sound.play('glass'); sparks(o.x, o.y, 12, o.suit || '#ff3b3b'); floatText(o.x, o.y - 12, 'PENG!', o.suit || '#ff3b3b', true);
  if (!live) return;
  if (!propsOf('balloon').length) stun(3.6, pick(['AUA! MEINE BALLONS!', 'NEEEIN! ICH FALLE!', 'HUP... HUP...']));
  else say(b, pick(['MEIN BALLON!', 'HEY! DER WAR TEUER!', 'NICHT DIE BALLONS!']), 1);
};
PROP_DRAW.balloon = (g, e, x, y) => {
  const b = G.boss;
  if (b) { g.strokeStyle = 'rgba(230,230,230,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(Math.round(b.x), Math.round(b.y)); g.stroke(); }
  pxEll(g, x, y, 5, 6, e.suit || '#ff3b3b'); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - 3, y - 4, 2, 2);
  g.fillStyle = e.suit || '#ff3b3b'; g.fillRect(x - 1, y + 6, 2, 1);
};

// =====================================================================
//  WATCHDOG 3000 - Roboterhund vom Rechenzentrum, Reboot-Knopf hinten
// =====================================================================
BOSS_EXT.watchdog = {
  taunts: ['EINDRINGLING ENTFERNT. WUFF.', 'GUTER HUND. BÖSER LIL.', 'SITZ. PLATZ. TOT.'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; say(e, 'EINDRINGLING ERKANNT. WUFF.EXE WIRD GESTARTET.', 3); Sound.play('boss'); },
  // Treffer von hinten = Reboot-Knopf gedrückt
  hit(e, dmg, ang) {
    if (e.mode === 'stunned' || Math.abs(angDiff(e.a, ang)) > 1.05) return false;
    e.mode = 'stunned'; e.modeT = 3.6; e.boot = 0; e.path = null;
    say(e, 'REBOOT-KNOPF GEDRÜCKT... SYSTEM STARTET NEU...', 2); Sound.play('glitch'); Sound.play('boss_phase'); shake(6);
    sparks(e.x - Math.cos(e.a) * 10, e.y - Math.sin(e.a) * 10, 14, '#7dff7a'); floatText(e.x, e.y - 30, 'REBOOT!', '#7dff7a');
    return true;
  },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y), face = Math.abs(angDiff(e.a, pa));
    updateDrops(dt);
    switch (e.mode) {
      case 'walk': {
        e.a = turnTo(e.a, pa, (angry ? 2.0 : 1.5) * dt);   // dreht sich langsam -> lauf um ihn herum!
        const st = (angry ? 50 : 42) * dt;
        if (!sees) bChase(e, p, st, dt, 40);
        else if (pd > 60 && face < 0.8) { moveEntity(e, Math.cos(e.a) * st, Math.sin(e.a) * st); e.walkT += dt; }
        e.shootT -= dt;
        if (e.shootT <= 0 && sees && face < 0.7) { e.shootT = angry ? 1.1 : 1.5; bFan(e, e.a, 3, 0.3, 175, 'dogshot', 'dogshot'); Sound.play('zap'); }
        e.modeT -= dt;
        if (e.modeT <= 0) {
          e.attack = (e.attack + 1) % 3;
          if (e.attack === 0 && sees) { e.mode = 'windup'; e.modeT = 0.75; say(e, 'ANGRIFF.EXE!', 0.9); Sound.play('boss_attack'); }
          else if (e.attack === 1) { e.mode = 'missiles'; e.modeT = 1.4; e.burst = angry ? 6 : 4; e.shootT = 0; say(e, 'RAKETEN WERDEN GESTARTET.', 1.2); Sound.play('boss'); }
          else { e.mode = 'bark'; e.modeT = 0.6; say(e, 'WUFF!!!', 0.8); }
        }
        break;
      }
      case 'bark':
        e.a = turnTo(e.a, pa, 1.2 * dt); e.modeT -= dt;
        if (e.modeT <= 0) {
          Sound.play('bark'); shake(7);
          for (const q of G.players) { const qa = Math.atan2(q.y - e.y, q.x - e.x); if (q.alive && dist(q.x, q.y, e.x, e.y) < 78 && Math.abs(angDiff(e.a, qa)) < 0.75 && los(e.x, e.y, q.x, q.y)) killPlayer(e, qa, 'bark', q); }
          bFan(e, e.a, 7, 1.2, 150, 'dogshot', 'dogshot');
          e.mode = 'walk'; e.modeT = rand(2.5, 3.5);
        }
        break;
      case 'windup':
        e.a = turnTo(e.a, pa, 5 * dt); e.modeT -= dt;
        if (e.modeT <= 0) { e.mode = 'charge'; e.ca = e.a; e.modeT = 1.5; }
        break;
      case 'charge': {
        const want = (angry ? 300 : 270) * dt, m = moveEntity(e, Math.cos(e.ca) * want, Math.sin(e.ca) * want);
        e.walkT += dt * 2; e.modeT -= dt;
        for (const q of G.players) if (q.alive && q.invT <= 0 && dist(q.x, q.y, e.x, e.y) < e.r + q.r + 2) killPlayer(e, e.ca, 'watchdog', q);
        if (m < want * 0.4) { e.mode = 'skid'; e.modeT = 1.7; shake(8); Sound.play('slam'); say(e, 'FEHLER 404: WAND GEFUNDEN.', 1.4); sparks(e.x + Math.cos(e.ca) * 12, e.y + Math.sin(e.ca) * 12, 12, '#ffffff'); }
        else if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); }
        break;
      }
      case 'skid': e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); } break;   // steht mit dem Rücken zu dir!
      case 'missiles':
        e.shootT -= dt;
        if (e.shootT <= 0 && e.burst > 0) { e.shootT = 0.22; e.burst--; dropAt(null, 26, 24, 1.1, 'missile'); Sound.play('zap'); }
        e.modeT -= dt; if (e.modeT <= 0 && e.burst <= 0) { e.mode = 'walk'; e.modeT = rand(3, 4); }
        break;
      case 'stunned':
        e.modeT -= dt; e.boot = clamp(1 - e.modeT / 3.6, 0, 1);
        if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2, 3); say(e, pick(['SYSTEM WIEDER ONLINE. WUFF.', 'UPDATE INSTALLIERT: MEHR WUT.', 'NEUSTART ABGESCHLOSSEN!']), 1.6); }
        break;
    }
    bTouch(e, p, pa, pd, 'watchdog');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'VERSTÄRKUNG ANGEFORDERT.', 2); spawnMinions('Q', 2); }
  },
  draw(g, e) {
    const s = Math.round(Math.sin(e.walkT * 14) * 3);
    g.fillStyle = '#2a2a33'; for (const [lx, ly] of [[6 + s, -9], [6 - s, 6], [-8 - s, -9], [-8 + s, 6]]) g.fillRect(lx, ly, 4, 3);
    pxEll(g, -1, 0, 12, 8, '#4a4a58'); pxEll(g, 0, 0, 11, 7, '#8a8a9a');
    g.fillStyle = '#6a6a78'; g.fillRect(-6, -6, 12, 1); g.fillRect(-6, 5, 12, 1);
    pxEll(g, 11, 0, 5, 5, '#5a5a68'); pxEll(g, 12, 0, 4, 4, '#9a9aaa');
    g.fillStyle = e.mode === 'stunned' ? '#333' : '#ff2a3a'; g.fillRect(14, -2, 2, 4);
    g.fillStyle = '#3a3a44'; g.fillRect(8, -6, 3, 2); g.fillRect(8, 4, 3, 2);
    const on = e.mode !== 'stunned' && Math.floor(T * 4) % 2;
    pxEll(g, -9, 0, 3, 3, '#1a1a22'); pxEll(g, -9, 0, 2, 2, on ? '#7dff7a' : '#2a8a3a');
    g.fillStyle = '#111'; g.fillRect(-15, -1, 4, 2);
  },
  extra(g, e) {
    drawDrops(g);
    if (e.mode === 'bark') { g.fillStyle = `rgba(255,40,40,${0.15 + Math.sin(T * 40) * 0.1})`; g.beginPath(); g.moveTo(e.x, e.y); g.arc(e.x, e.y, 78, e.a - 0.75, e.a + 0.75); g.closePath(); g.fill(); }
  },
  post(g, e) {
    if (e.mode !== 'stunned') { if (Math.floor(T * 2) % 2) txt('KNOPF', e.x - Math.cos(e.a) * 18, e.y - Math.sin(e.a) * 18 - 4, { g, font: FS, align: 'center', color: '#7dff7a' }); return; }
    const x = Math.round(e.x) - 14, y = Math.round(e.y) - 26;
    g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, 30, 5); g.fillStyle = '#7dff7a'; g.fillRect(x, y, Math.round(28 * (e.boot || 0)), 3);
    txt('REBOOT ' + Math.round((e.boot || 0) * 100) + '%', e.x, y - 10, { g, font: FS, align: 'center', color: '#7dff7a' });
  },
};

// =====================================================================
//  DER SCHROTTKÖNIG - Krone aus Eisen, zwei Magnetkräne in der Arena
// =====================================================================
BOSS_EXT.schrott = {
  taunts: ['ALTMETALL! HAHA!', 'AB IN DIE PRESSE!', 'DU WARST NIE MEHR ALS SCHROTT!'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; say(e, 'WER BETRITT MEIN SCHROTT-REICH?! ICH PRESS DICH ZUM WÜRFEL!', 3); Sound.play('boss'); },
  setup(e) {
    e.zones = [];
    const plan = [[[0.3, 0.4], [0.06, 0.88], '#ffd23f'], [[0.7, 0.4], [0.94, 0.88], '#3fd0ff']];
    for (const [zp, lp, col] of plan) {
      const z = arenaSpotAt(zp[0], zp[1]), l = arenaSpotAt(lp[0], lp[1]);
      if (!z || !l) continue;
      e.zones.push({ x: z[0], y: z[1], r: 46, col, flashT: 0 });
      const o = spawnProp('lever', l[0], l[1]); o.zi = e.zones.length - 1; o.suit = col;
    }
  },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
    updateDrops(dt);
    for (const z of e.zones || []) if (z.flashT > 0) z.flashT -= dt;
    switch (e.mode) {
      case 'walk':
        e.a = turnTo(e.a, pa, 3 * dt);
        bChase(e, p, (angry ? 46 : 38) * dt, dt, 30);
        e.shootT -= dt;
        if (e.shootT <= 0 && sees) { e.shootT = angry ? 1.5 : 2.0; bFan(e, pa, angry ? 3 : 2, 0.4, 150, 'tire', 'tire'); Sound.play('throwIt'); if (Math.random() < 0.3) say(e, pick(L_BOSS.schrott), 1.3); }
        e.modeT -= dt;
        if (e.modeT <= 0) {
          e.attack = (e.attack + 1) % 2;
          if (e.attack === 0) { e.mode = 'scrap'; e.modeT = 1.5; e.burst = angry ? 7 : 5; e.shootT = 0; say(e, 'SCHROTT-REGEN!', 1.2); Sound.play('boss'); }
          else { e.mode = 'spinup'; e.modeT = 0.7; say(e, 'SCHRAUBENSCHLÜSSEL-WIRBEL!', 1); Sound.play('boss_attack'); }
        }
        break;
      case 'scrap':
        e.shootT -= dt;
        if (e.shootT <= 0 && e.burst > 0) { e.shootT = 0.2; e.burst--; dropAt(null, 34, 22, 1.2, 'scrap'); }
        e.modeT -= dt; if (e.modeT <= 0 && e.burst <= 0) { e.mode = 'walk'; e.modeT = rand(3, 4); }
        break;
      case 'spinup': e.modeT -= dt; e.spinA += dt * 8; e.a = e.spinA; if (e.modeT <= 0) { e.mode = 'spin'; e.modeT = 1.6; } break;
      case 'spin':
        e.modeT -= dt; e.spinA += dt * 16; e.a = e.spinA;
        bChase(e, p, (angry ? 85 : 70) * dt, dt, 0);
        if (Math.random() < 0.15) Sound.play('swoosh');
        for (const q of G.players) if (q.alive && dist(q.x, q.y, e.x, e.y) < 30) killPlayer(e, Math.atan2(q.y - e.y, q.x - e.x), 'wrench', q);
        if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(3, 4); say(e, 'PUH... SCHWINDELIG...', 1); }
        break;
      case 'lifted': {
        const z = e.liftZ; e.modeT -= dt;
        if (z) { const k = 1 - Math.exp(-dt * 6); e.x += (z.x - e.x) * k; e.y += (z.y - e.y) * k; }
        e.lift = clamp(1 - e.modeT / 1.0, 0, 1);
        if (e.modeT <= 0) {
          resolve(e); e.lift = 0; e.liftZ = null;
          shake(12); Sound.play('slam'); Sound.play('explode'); G.flash = 0.12; sparks(e.x, e.y, 22, '#cccccc');
          for (const o of G.enemies) if (o !== e && o.state !== 'dead' && !o.static && dist(o.x, o.y, e.x, e.y) < 40) killEnemy(o, 'friendly', 0);
          e.mode = 'stunned'; e.modeT = 3.6; say(e, 'AUA! MEINE KRONE IST VERBOGEN!', 1.6);
        }
        break;
      }
      case 'stunned':
        e.modeT -= dt;
        if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); say(e, pick(['DAFÜR KOMMST DU IN DIE PRESSE!', 'JETZT WIRD VERSCHROTTET!', 'MEIN REICH! MEINE REGELN!']), 1.6); }
        break;
    }
    if (e.mode !== 'lifted') bTouch(e, p, pa, pd, 'schrott');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'SCHROTTHUNDE! FASS!', 2); spawnMinions('K', 3); }
  },
  draw(g, e) {
    if (e.lift) { g.rotate(-e.a); g.translate(0, -Math.round(e.lift * 20)); const k = 1 + e.lift * 0.2; g.scale(k, k); g.rotate(e.a + Math.sin(T * 20) * 0.2 * e.lift); }
    const s = Math.round(Math.sin(e.walkT * 8) * 4);
    g.fillStyle = '#2a1a0a'; g.fillRect(-5 + s, -11, 8, 5); g.fillRect(-5 - s, 6, 8, 5);
    pxEll(g, -1, 0, 12, 13, '#4a3420'); pxEll(g, 0, 0, 11, 12, '#7a5a3a');
    g.fillStyle = '#8a8a9a'; g.fillRect(-6, -8, 5, 4); g.fillRect(-2, 4, 6, 4); g.fillRect(3, -5, 4, 3);
    g.fillStyle = '#ddd'; g.fillRect(-5, -7, 1, 1); g.fillRect(0, 5, 1, 1); g.fillRect(4, -4, 1, 1);
    g.fillStyle = '#7a5a3a'; g.fillRect(3, -14, 8, 4); g.fillRect(3, 10, 8, 4);
    g.fillStyle = '#d9a070'; g.fillRect(11, -13, 3, 3); g.fillRect(11, 10, 3, 3);
    g.fillStyle = '#9a9aaa'; g.fillRect(12, 10, 14, 3); g.fillRect(24, 8, 4, 2); g.fillRect(24, 13, 4, 2);
    pxEll(g, 0, 0, 7, 7, '#d9a070'); g.fillStyle = '#3a2410'; g.fillRect(4, -3, 3, 6);
    g.fillStyle = '#c8a040'; g.fillRect(-6, -7, 3, 14); g.fillRect(-3, -8, 2, 3); g.fillRect(-3, 5, 2, 3); g.fillRect(-8, -2, 2, 4);
    g.fillStyle = '#ff3b3b'; g.fillRect(-6, -1, 2, 2);
  },
  extra(g, e) {
    drawDrops(g);
    for (const z of e.zones || []) {
      const fl = z.flashT > 0 && Math.floor(T * 10) % 2, col = fl ? '#ff3b3b' : z.col || '#ffd23f', inside = dist(e.x, e.y, z.x, z.y) < z.r + 8;
      g.fillStyle = inside ? 'rgba(125,255,122,0.12)' : 'rgba(255,210,60,0.06)'; g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.fill();
      g.strokeStyle = inside ? '#7dff7a' : col; g.lineWidth = 1; g.setLineDash([4, 3]); g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.stroke(); g.setLineDash([]);
      const X = Math.round(z.x), Y = Math.round(z.y);
      g.fillStyle = '#c41f2a'; g.fillRect(X - 6, Y - 6, 3, 9); g.fillRect(X + 3, Y - 6, 3, 9); g.fillRect(X - 6, Y - 6, 12, 3);
      g.fillStyle = '#ddd'; g.fillRect(X - 6, Y + 3, 3, 2); g.fillRect(X + 3, Y + 3, 3, 2);
      txt(inside ? 'JETZT HEBEL!' : 'MAGNET', X, Y + 8, { g, font: FS, align: 'center', color: inside ? '#7dff7a' : col });
    }
    if (e.mode === 'lifted') { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(e.x, e.y + 3, 12, 9, 0, 0, TAU); g.fill(); }
  },
  post(g, e) {
    if (e.mode !== 'lifted') return;
    const y = e.y - 20 - (e.lift || 0) * 20;
    g.strokeStyle = '#888'; g.lineWidth = 1; g.beginPath(); g.moveTo(e.x, y - 60); g.lineTo(e.x, y - 6); g.stroke();
    g.fillStyle = '#c41f2a'; g.fillRect(Math.round(e.x) - 7, Math.round(y) - 8, 14, 5);
  },
};
PROP_HIT.lever = (o, b, live) => {
  if (!live) return;
  const z = b.zones && b.zones[o.zi];
  if (!z) return;
  if (b.mode === 'lifted' || b.mode === 'stunned') { if (T - (o.msgT || -9) > 1) { o.msgT = T; floatText(o.x, o.y - 16, 'ER HÄNGT SCHON!', '#cccccc', true); } return; }
  if (dist(b.x, b.y, z.x, z.y) > z.r + 8) { o.cd = 1.2; z.flashT = 1; floatText(o.x, o.y - 16, 'ER STEHT NICHT UNTERM MAGNET!', '#ffe14d', true); Sound.play('click'); return; }
  o.cd = 6; Sound.play('boss_phase'); shake(6); floatText(o.x, o.y - 18, 'MAGNET AN!', z.col || '#ffd23f');
  b.mode = 'lifted'; b.modeT = 1.0; b.liftZ = { x: z.x, y: z.y }; b.lift = 0; b.path = null;
  say(b, pick(['HEY! LASS MICH RUNTER!', 'MEINE EISENKRONE! NEIN!', 'WAS IST DAS FÜR EIN MAGNET?!']), 1.6);
};
PROP_DRAW.lever = (g, e, x, y, off, blink) => {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 6, y + 5, 13, 3);
  g.fillStyle = '#2a2a30'; g.fillRect(x - 6, y + 1, 12, 5); g.fillStyle = e.suit || '#ffd23f'; g.fillRect(x - 6, y + 1, 12, 1);
  const a = off ? 0.7 : -0.7, hx = Math.round(x + Math.sin(a) * 10), hy = Math.round(y + 2 - Math.cos(a) * 10);
  g.strokeStyle = '#c8c8d8'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 2); g.lineTo(hx, hy); g.stroke(); g.lineWidth = 1;
  pxEll(g, hx, hy, 2, 2, '#e01b3c');
  txt('HEBEL', x, y - 20, { g, font: FS, align: 'center', color: e.suit || '#ffd23f' });
  if (blink) txt('!', x, y - 28, { g, font: FS, align: 'center', color: '#ffe14d' });
};

// =====================================================================
//  DER QUIZMASTER - Live-Sendung bei SAFT-TV, vier Farb-Buzzer
// =====================================================================
const QUIZ_COLORS = [{ n: 'ROT', c: '#ff3b3b' }, { n: 'BLAU', c: '#3f8bff' }, { n: 'GRÜN', c: '#3fdc5a' }, { n: 'GELB', c: '#ffe14d' }];
const QUIZ_Q = [
  ['WELCHE FARBE HAT EINE ZITRONE?', 3], ['WELCHE FARBE HAT GRAS?', 2], ['WELCHE FARBE HAT DER HIMMEL?', 1], ['WELCHE FARBE HAT EINE TOMATE?', 0],
  ['WELCHE FARBE HAT EIN FEUERWEHRAUTO?', 0], ['WELCHE FARBE HAT DAS MEER?', 1], ['WELCHE FARBE HAT EINE GURKE?', 2], ['WELCHE FARBE HAT EINE BANANE?', 3],
  ['WELCHE FARBE HAT DER CODE VOM RUSSIAN HACKER BOI?', 2], ['WELCHE FARBE HAT BLUTORANGEN-SAFT?', 0], ['WELCHE FARBE HAT EIN EIGELB?', 3], ['WELCHE FARBE HAT DAS BLAULICHT?', 1],
  ['WELCHE FARBE HAT GRECHIS ROTSTIFT?', 0], ['WELCHE FARBE HAT EIN FROSCH?', 2], ['WELCHE FARBE HAT ZITRO ZACKZACKS ANZUG?', 3], ['WELCHE FARBE HAT EIN SCHLUMPF?', 1],
  ['2 + 2 = ?', 1, 'ROT: 3    BLAU: 4    GRÜN: 22    GELB: 5'], ['10 - 3 = ?', 0, 'ROT: 7    BLAU: 6    GRÜN: 8    GELB: 13'],
  ['3 X 3 = ?', 2, 'ROT: 6    BLAU: 33    GRÜN: 9    GELB: 12'], ['100 : 4 = ?', 3, 'ROT: 20    BLAU: 40    GRÜN: 4    GELB: 25'],
  ['WIE VIELE LEBEN HAST DU PRO ETAGE?', 2, 'ROT: 1    BLAU: 99    GRÜN: 5    GELB: 0'], ['WER HAT DAS TEBLEEDD GEKLAUT?', 0, 'ROT: RUSSIAN HACKER BOI    BLAU: GÜNTHER    GRÜN: BAKA    GELB: DU'],
];
function quizAsk(e, angry) {
  let q;
  if (Math.random() < 0.25) {
    const word = randi(0, 3); let ink = randi(0, 3); if (ink === word) ink = (ink + 1 + randi(0, 2)) % 4;
    q = { text: 'IN WELCHER FARBE IST DAS WORT GESCHRIEBEN?', word: QUIZ_COLORS[word].n, ink, ans: ink };
  } else { const k = pick(QUIZ_Q); q = { text: k[0], ans: k[1], sub: k[2] || '' }; }
  q.t = q.max = angry ? 8 : 10;
  e.quiz = q; Sound.play('ring'); say(e, 'QUIZFRAGE! HAU DEN RICHTIGEN BUZZER!', 1.6);
}
function quizFail(e, why) {
  floatText(e.x, e.y - 30, why, '#ff6a6a'); Sound.play('lose');
  say(e, pick(['FAAALSCH! HAHAHA!', 'LEIDER NEIN!', 'DAS KOSTET DICH... ALLES!']), 1.6);
  bRing(e, 18, 112, 'confetti', 'confetti', 5);
  e.quiz = null; e.quizT = 2.4;
}
BOSS_EXT.quiz = {
  taunts: ['UND DER KANDIDAT FLIEGT RAUS!', 'APPLAUS FÜR DEN VERLIERER!', 'NÄCHSTER KANDIDAT, BITTE!'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; e.quizT = 3; say(e, 'GUTEN ABEND UND WILLKOMMEN BEI... SAFT ODER SCHAFFT!', 3); Sound.play('boss'); },
  setup() {
    [[0.1, 0.22], [0.9, 0.22], [0.1, 0.8], [0.9, 0.8]].forEach(([fx, fy], k) => { const s = arenaSpotAt(fx, fy); if (s) { const o = spawnProp('buzzer', s[0], s[1]); o.qc = k; o.suit = QUIZ_COLORS[k].c; } });
  },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
    updateDrops(dt);
    if (e.mode !== 'stunned') {
      if (e.quiz) { e.quiz.t -= dt; if (e.quiz.t <= 0) quizFail(e, 'ZEIT VORBEI!'); }
      else { e.quizT = (e.quizT == null ? 2 : e.quizT) - dt; if (e.quizT <= 0) quizAsk(e, angry); }
    }
    switch (e.mode) {
      case 'walk': {
        e.a = turnTo(e.a, pa, 4 * dt);
        const sp = (angry ? 48 : 40) * dt;
        if (!sees) bChase(e, p, sp, dt, 30);
        else {
          if (pd > 140) moveToward(e, p.x, p.y, sp); else if (pd < 90) moveEntity(e, -Math.cos(pa) * sp, -Math.sin(pa) * sp);
          const side = e.sweep || 1, m = moveEntity(e, Math.cos(pa + Math.PI / 2) * sp * 0.6 * side, Math.sin(pa + Math.PI / 2) * sp * 0.6 * side);
          if (m < sp * 0.3) e.sweep = -side;
          e.walkT += dt;
        }
        e.shootT -= dt;
        if (e.shootT <= 0 && sees) { e.shootT = angry ? 1.3 : 1.7; bFan(e, pa, 5, 0.8, 125, 'note', 'note'); Sound.play('peng'); if (Math.random() < 0.25) say(e, pick(L_BOSS.quiz), 1.3); }
        e.modeT -= dt;
        if (e.modeT <= 0) {
          e.attack = (e.attack + 1) % 2;
          if (e.attack === 0) { e.mode = 'spots'; e.modeT = 1.6; say(e, 'SCHEINWERFER AN!', 1.2); Sound.play('boss'); for (let k = 0; k < (angry ? 5 : 3); k++) dropAt(null, 30, 26, rand(1.1, 1.5), 'spot'); }
          else { e.mode = 'cannon'; e.burst = angry ? 3 : 2; e.shootT = 0.3; say(e, 'KONFETTI-KANONE!', 1.2); Sound.play('boss_attack'); }
        }
        break;
      }
      case 'spots': e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(3, 4); } break;
      case 'cannon':
        e.shootT -= dt;
        if (e.shootT <= 0) { e.shootT = 0.55; bRing(e, 18, 100 + (3 - e.burst) * 12, 'confetti', 'confetti', 5); Sound.play('shotgun'); e.burst--; if (e.burst <= 0) { e.mode = 'walk'; e.modeT = rand(3, 4); } }
        break;
      case 'stunned':
        e.modeT -= dt;
        if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); e.quizT = 2.5; say(e, pick(['DAS WAR NUR GLÜCK!', 'NÄCHSTE RUNDE! SCHWERERE FRAGEN!', 'DIE ZUSCHAUER WOLLEN BLUT!']), 1.6); }
        break;
    }
    bTouch(e, p, pa, pd, 'quiz');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'APPLAUS FÜR MEINE ASSISTENTEN!', 2); spawnMinions('M', 2); }
  },
  draw(g, e) {
    const s = Math.round(Math.sin(e.walkT * 10) * 3);
    g.fillStyle = '#111'; g.fillRect(-3 + s, -7, 5, 3); g.fillRect(-3 - s, 4, 5, 3);
    pxEll(g, -1, 0, 8, 10, '#3a1a5a'); pxEll(g, 0, 0, 7, 9, '#8a3aff');
    g.fillStyle = '#ffe14d'; for (let k = 0; k < 5; k++) if ((k + Math.floor(T * 8)) % 2) g.fillRect(-5 + k * 2, -6 + (k * 5) % 12, 1, 1);
    g.fillStyle = '#fff'; g.fillRect(2, -2, 4, 4); g.fillStyle = '#e01b3c'; g.fillRect(5, -1, 2, 2);
    g.fillStyle = '#8a3aff'; g.fillRect(1, -10, 7, 3); g.fillRect(1, 7, 7, 3);
    g.fillStyle = '#f0c8a0'; g.fillRect(8, -10, 2, 3); g.fillRect(8, 7, 2, 3);
    g.fillStyle = '#222'; g.fillRect(10, -10, 3, 2); pxEll(g, 14, -9, 2, 2, '#666');
    pxEll(g, 0, 0, 6, 6, '#e8c547'); pxEll(g, 1, 0, 5, 5, '#f0c8a0'); g.fillStyle = '#e8c547'; g.fillRect(-5, -5, 5, 10);
    g.fillStyle = '#fff'; g.fillRect(5, -2, 1, 4);
  },
  extra(g) { drawDrops(g); },
  hud(b) {
    const q = b.quiz;
    if (!q) return;
    const y = 46, two = q.word || q.sub;
    ctx.fillStyle = 'rgba(0,0,20,0.85)'; ctx.fillRect(W / 2 - 175, y - 6, 350, two ? 32 : 22);
    ctx.fillStyle = q.t < 3 ? '#ff6a6a' : '#ffe14d'; ctx.fillRect(W / 2 - 175, y - 6, Math.round(350 * clamp(q.t / q.max, 0, 1)), 2);
    txt('QUIZFRAGE: ' + q.text, W / 2, y, { font: FS, align: 'center', color: '#ffffff' });
    if (q.word) txt(q.word, W / 2, y + 11, { font: FB, align: 'center', color: QUIZ_COLORS[q.ink].c });
    else if (q.sub) txt(q.sub, W / 2, y + 11, { font: FS, align: 'center', color: '#ffe14d' });
    else txt('HAU DEN RICHTIGEN BUZZER! (' + Math.ceil(q.t) + ' S)', W / 2, y + 10, { font: FS, align: 'center', color: '#ffe14d' });
  },
};
PROP_HIT.buzzer = (o, b, live, stun) => {
  if (!live) return;
  o.cd = 0.6; Sound.play('click');
  if (!b.quiz || b.mode === 'stunned') { floatText(o.x, o.y - 16, 'WARTE AUF DIE FRAGE!', '#cccccc', true); return; }
  if (o.qc === b.quiz.ans) {
    floatText(o.x, o.y - 18, 'RICHTIG!!!', '#7dff7a'); Sound.play('win');
    b.quiz = null; b.quizT = 3; for (const q of propsOf('buzzer')) q.cd = 1;
    stun(3.6, pick(['WAS?! DAS WAR... RICHTIG?!', 'UNMÖGLICH! NIEMAND WEISS DAS!', 'DIE REGIE HAT GESCHUMMELT!']));
  } else { floatText(o.x, o.y - 18, 'FALSCH!', '#ff6a6a'); quizFail(b, 'FALSCHE ANTWORT!'); for (const q of propsOf('buzzer')) q.cd = 1.5; }
};
PROP_DRAW.buzzer = (g, e, x, y, off) => {
  const c = QUIZ_COLORS.find((q) => q.c === e.suit) || QUIZ_COLORS[0];
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 6, y + 6, 14, 3);
  g.fillStyle = '#1a1a22'; g.fillRect(x - 7, y - 2, 14, 9); pxEll(g, x, y, 6, 5, off ? '#555566' : c.c);
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x - 3, y - 3, 3, 1);
  txt(c.n, x, y - 18, { g, font: FS, align: 'center', color: c.c });
};
for (const id in BOSS_EXT) if (BOSS_EXT[id].setup) BOSS_SETUP[id] = BOSS_EXT[id].setup;
