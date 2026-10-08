'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Bosse: Günther, der Croupier, RUSSIAN HACKER BOI (Endboss)
// =====================================================================
const BOSS_INFO = {
  guenther: { name: 'GÜNTHER, DER WURSTPATE', hp: 30, r: 11, song: 'boss' },
  croupier: { name: 'DER CROUPIER', hp: 36, r: 9, song: 'boss' },
  hacker: { name: 'RUSSIAN HACKER BOI', hp: 90, r: 10, song: 'final' },
  grechenig: { name: 'FRAU GRECHENIG', hp: 40, r: 8, song: 'boss', noGore: true },
  tabluator: { name: 'KUMI IT', hp: 50, r: 8, song: 'boss', noGore: true },
};
const L_BOSS = {
  guenther: ['WURST-ZEIT!', 'SENF DAZU?', 'ISS DAS!', 'FRISCH VOM GRILL!', 'MEIN REVIER!', 'BINGO! HAHA!'],
  croupier: ['RIEN NE VA PLUS!', 'DIE BANK GEWINNT!', 'MISCHEN, LIL!', 'ALLES AUF ROT!', 'PECH GEHABT!'],
  hacker: ['DA DA DA!', 'NYET!', 'GG EZ, TOVARISCH!', 'LAG? DAS BIST DU!', 'STRG+ALT+ENTF!', 'DU BIST NUR EIN NPC!', '404: SKILL NOT FOUND', 'ICH HAB DEIN WLAN-PASSWORT!', 'PING: 1 MS. DEINER: 999!'],
  grechenig: ['ÄHHHM... RUHE, THEO!', 'FOOOKUSSS!', 'DAS IST NICHT GENÜGEND!', 'HEFT RAUS!', 'WER REDET DA?!', 'ABSCHREIBEN IST VERBOTEN!', 'DAS KOMMT ZUR SCHULARBEIT!', 'ÄHHHM... THEO?!'],
  tabluator: ['HABT IHR DAS IM PACKET TRACER SIMULIERT?', 'LAYER-1-PROBLEM, KOLLEGE!', 'PING... TIMEOUT!', 'ICH SUBNETTE DICH WEG!', 'DU BIST NUR EIN /32!', 'SHOW RUNNING-CONFIG!', 'CONFIGURE TERMINAL!', 'WER HAT DAS KABEL GEZOGEN?!'],
};

// eigene Gefahren-Arten (G.hazards, h.kind): Update / Zeichnen; Funktionen, die bei jedem Boss-Tod laufen
const HAZ_UPDATE = {}, HAZ_DRAW = {};
const BOSS_KILL_HOOKS = [];
function initBoss(e, type) {
  const I = BOSS_INFO[type];
  Object.assign(e, { btype: type, hp: Math.round(I.hp * 0.75), maxHp: Math.round(I.hp * 0.75), r: I.r, active: false, mode: 'idle', modeT: 0, shootT: 0, summoned: false,
    state: 'boss', phase: 0, spinA: 0, attack: 0, hair: '#222', skin: '#f0b890' });
}
function activateBoss(e) {
  if (e.active || e.state === 'dead') return;
  e.active = true; e.mode = 'walk'; e.modeT = 4; e.shootT = 1.5;
  G.hazards = G.hazards || [];
  if (e.btype === 'hacker') {
    e.phase = 1; e.mode = 'firewall';
    say(e, 'PRIVET, LIL! WILLKOMMEN IN MEINEM NETZ!', 3);
    Sound.play('boss_intro');
  } else if (e.btype === 'grechenig') {
    e.mode = 'walk'; e.modeT = 3; say(e, 'ÄHHHM... WER STÖRT MEINEN UNTERRICHT?!', 3); Sound.play('boss');
  } else if (e.btype === 'baka') {
    e.mode = 'walk'; e.modeT = 3; say(e, 'BAKA BAKA BAKA! WER STÖRT MEINE CON?!', 3); Sound.play('boss');
  } else if (e.btype === 'tabluator') {
    e.mode = 'netz'; say(e, 'WILLKOMMEN IM PACKET TRACER! ERST MAL PINGEN...', 3); Sound.play('boss');
  } else if (e.btype === 'croupier') {
    say(e, 'MACHEN SIE IHRE EINSÄTZE, MONSIEUR PREITNER!', 3); Sound.play('boss');
  } else if (BOSS_EXT[e.btype]) BOSS_EXT[e.btype].activate(e);
  else {
    say(e, 'DU! DU HAST MEINEN SENF BELEIDIGT!', 2.6); Sound.play('boss');
  }
  Sound.playSong(BOSS_INFO[e.btype].song);
  bossSetupProps(e);
  for (const o of G.enemies) {
    if (o !== e && !o.static && (o.state === 'idle' || o.state === 'patrol')) { o.state = 'search'; o.alerted = true; o.lastSeen = { x: G.player.x, y: G.player.y }; o.pathT = 0; }
  }
}
function bossTaunt(e) {
  if (BOSS_EXT[e.btype]) { say(e, pick(BOSS_EXT[e.btype].taunts), 3); return; }
  say(e, e.btype === 'hacker' ? pick(['GG. RESPAWN, NOOB!', 'DAS WAR MEIN AIMBOT. DA!', 'HAHA! NOCHMAL, TOVARISCH?'])
    : e.btype === 'croupier' ? 'DIE BANK GEWINNT IMMER!'
    : e.btype === 'grechenig' ? pick(['SETZEN. NICHT GENÜGEND!', 'NACHSITZEN, PREITNER!', 'FOOOKUSSS HÄTTE GEHOLFEN.'])
    : e.btype === 'tabluator' ? pick(['VERBINDUNG ABGELEHNT!', 'DU WARST NICHT IM SUBNETZ.', 'PACKET LOSS: 100%!'])
    : e.btype === 'baka' ? pick(['BAKA!', 'OMAE WA MOU... TOT!', 'ZU BAKA ZUM AUSWEICHEN!'])
    : 'HAHA! WURST GEWINNT IMMER!', 3);
  if (e.btype === 'hacker') Sound.play('boss_win');
}
function bossPylonDown(b, v) {
  if (b.state === 'dead') return;
  if (b.btype === 'tabluator') { say(b, pick(['MEIN ROUTER!', 'DAS WAR EIN CISCO!', 'WER HAT DAS KABEL GEZOGEN?!']), 1.5); Sound.play('glitch'); shake(5); return; }
  if (b.btype !== 'hacker') return;
  const left = G.enemies.filter((o) => o.kind === 'V' && o.state !== 'dead').length;
  Sound.play('glitch'); shake(8);
  if (left > 0) say(b, pick(['MEIN SERVER!', 'DAS WAR TEUER!', 'HÖR AUF DAMIT!']) + ' (' + left + ' ÜBRIG)', 2);
  else {
    b.phase = 2; b.mode = 'glitch'; b.modeT = 1.5; b.attack = 0;
    say(b, 'MEINE FIREWALL!! JETZT WIRD ES PERSÖNLICH!', 3);
    Sound.play('boss_phase'); G.flash = 0.3; shake(12);
  }
}

function updateBoss(e, dt) {
  const p = e.target || G.player;
  const pd = dist(e.x, e.y, p.x, p.y), pa = Math.atan2(p.y - e.y, p.x - e.x);
  if (!e.active) {
    if (p.alive && G.time > 1 && pd < 260 && los(e.x, e.y, p.x, p.y)) activateBoss(e);
    return;
  }
  updateHazards(dt);
  // neues Schwäche-Fenster: Schaden pro Fenster ist begrenzt (mindestens 3 Runden)
  if (e.mode === 'stunned' && e.prevMode !== 'stunned') { e.winDmg = 0; if (anyMask('buzzer')) e.modeT += 1; }
  e.prevMode = e.mode;
  if (!p.alive) { e.a = turnTo(e.a, pa, 2 * dt); return; }
  if (e.btype === 'hacker') updateHacker(e, dt, pd, pa);
  else if (e.btype === 'grechenig') updateGrechenig(e, dt, pd, pa);
  else if (e.btype === 'tabluator') updateTabluator(e, dt, pd, pa);
  else if (e.btype === 'baka') updateBaka(e, dt, pd, pa);
  else if (e.btype === 'croupier') updateCroupier(e, dt, pd, pa);
  else if (BOSS_EXT[e.btype]) BOSS_EXT[e.btype].update(e, dt, pd, pa);
  else updateGuenther(e, dt, pd, pa);
}

// ---------- Günther ----------
function updateGuenther(e, dt, pd, pa) {
  const p = e.target || G.player, sees = los(e.x, e.y, p.x, p.y), angry = e.hp < e.maxHp / 2;
  switch (e.mode) {
    case 'walk': {
      e.a = turnTo(e.a, pa, 3 * dt);
      const step = (angry ? 52 : 42) * dt;
      if (pd > 30) {
        if (sees) moveToward(e, p.x, p.y, step);
        else { e.pathT -= dt; if (e.pathT <= 0) { e.path = findPath(e.x, e.y, p.x, p.y); e.pathT = 0.5; } followPath(e, step, dt); }
        e.walkT += dt;
      }
      e.shootT -= dt;
      if (e.shootT <= 0 && sees) {
        const n = angry ? 7 : 5, spread = angry ? 1.1 : 0.9;
        for (let i = 0; i < n; i++) spawnBullet(e.x + Math.cos(e.a) * 14, e.y + Math.sin(e.a) * 14, e.a - spread / 2 + spread * i / (n - 1), angry ? 145 : 130, 'enemy', e, 'wurst');
        Sound.play('wurst'); e.shootT = angry ? 1.25 : 1.7;
        if (Math.random() < 0.3) say(e, pick(L_BOSS.guenther), 1.4);
      }
      e.modeT -= dt;
      if (e.modeT <= 0 && sees) { e.mode = 'windup'; e.modeT = 0.75; say(e, 'WURST-ATTACKE!!', 1); Sound.play('boss'); }
      break;
    }
    case 'windup':
      e.a = turnTo(e.a, pa, 6 * dt); e.modeT -= dt; shake(1);
      if (e.modeT <= 0) { e.mode = 'charge'; e.ca = e.a; e.modeT = 1.4; }
      break;
    case 'charge': {
      const want = (angry ? 310 : 280) * dt;
      const m = moveEntity(e, Math.cos(e.ca) * want, Math.sin(e.ca) * want);
      e.walkT += dt * 2; e.modeT -= dt;
      for (const o of G.enemies) if (o !== e && o.state !== 'dead' && dist(o.x, o.y, e.x, e.y) < e.r + o.r) killEnemy(o, 'friendly', e.ca);
      if (m < want * 0.4) {
        e.mode = 'stunned'; e.modeT = 3.2; shake(10); Sound.play('slam');
        say(e, 'AUA! MEIN KOPF!', 1.5); sparks(e.x + Math.cos(e.ca) * 12, e.y + Math.sin(e.ca) * 12, 12, '#fff');
      } else if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(3.5, 5); }
      break;
    }
    case 'stunned':
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(3.5, 5); say(e, pick(['JETZT BIN ICH SAUER!', 'NOCHMAL!', 'DAS WAR GLÜCK!']), 1.5); }
      break;
  }
  if (e.mode !== 'stunned' && p.execT <= 0 && pd < e.r + p.r) killPlayer(e, pa, 'boss', p);
  if (!e.summoned && angry) { e.summoned = true; say(e, 'HOLT IHN, MEINE DACKEL!', 2); spawnMinions('K', 2); }
}

// ---------- Croupier ----------
function updateCroupier(e, dt, pd, pa) {
  const p = e.target || G.player, sees = los(e.x, e.y, p.x, p.y), angry = e.hp < e.maxHp / 2;
  e.a = turnTo(e.a, pa, 4 * dt);
  switch (e.mode) {
    case 'walk': {
      // tänzelt seitlich um den Spieler
      e.idleT = (e.idleT || 0) - dt; if (e.idleT <= 0) { e.idleT = rand(1, 2); e.sweep = Math.random() < 0.5 ? 1 : -1; }
      const keep = pd > 160 ? 1 : pd < 90 ? -1 : 0;
      const mx = Math.cos(pa) * keep + Math.cos(pa + Math.PI / 2) * (e.sweep || 1), my = Math.sin(pa) * keep + Math.sin(pa + Math.PI / 2) * (e.sweep || 1);
      const l = Math.hypot(mx, my) || 1;
      moveEntity(e, mx / l * (angry ? 75 : 60) * dt, my / l * (angry ? 75 : 60) * dt); e.walkT += dt;
      e.shootT -= dt;
      if (e.shootT <= 0 && sees) {
        const n = angry ? 5 : 3;
        for (let i = 0; i < n; i++) { spawnBullet(e.x, e.y, pa - 0.5 + i / (n - 1), 180, 'enemy', e, 'card', 'card'); G.bullets[G.bullets.length - 1].homing = 0.65; }
        Sound.play('swoosh'); e.shootT = angry ? 1.25 : 1.65;
        if (Math.random() < 0.3) say(e, pick(L_BOSS.croupier), 1.4);
      }
      e.modeT -= dt;
      if (e.modeT <= 0) {
        e.attack = (e.attack + 1) % 2;
        if (e.attack === 1) {
          e.mode = 'dice'; e.modeT = 1.4; say(e, 'WÜRFEL FALLEN!', 1.2);
          for (let i = 0; i < (angry ? 3 : 2); i++) G.hazards.push({ kind: 'dice', x: p.x + rand(-40, 40), y: p.y + rand(-40, 40), t: 1.1 + i * 0.25, r: 28, src: e });
        } else { e.mode = 'vanish'; e.modeT = 0.6; Sound.play('glitch'); }
      }
      break;
    }
    case 'dice': e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(3, 4.5); } break;
    case 'vanish':
      e.modeT -= dt;
      if (e.modeT <= 0) { const s = randomArenaSpot(140); if (s) { sparks(e.x, e.y, 14, '#fff'); e.x = s[0]; e.y = s[1]; sparks(e.x, e.y, 14, '#fff'); } e.mode = 'walk'; e.modeT = rand(3, 4.5); }
      break;
    case 'stunned':
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = 2; say(e, 'UNERHÖRT!', 1.2); }
      break;
  }
  if (!e.summoned && angry) { e.summoned = true; say(e, 'SECURITY!!', 2); spawnMinions('E', 1); spawnMinions('U', 1); }
}

// ---------- HACKER BOI ----------
function updateHacker(e, dt, pd, pa) {
  const p = e.target || G.player;
  e.spinA += dt * (e.phase === 3 ? 2.6 : 1.8);
  e.walkT += dt;
  const fast = e.phase === 3;
  if (e.mode === 'firewall') {
    // schwebt langsam um die Mitte, Bit-Spirale, Drohnen
    const cx = G.w * TS / 2, cy = (G.h - 4) * TS / 2;
    const tx = cx + Math.cos(G.time * 0.4) * 60, ty = cy + Math.sin(G.time * 0.55) * 40;
    moveToward(e, tx, ty, 30 * dt);
    e.shootT -= dt;
    if (e.shootT <= 0) {
      e.shootT = 0.22;
      for (let k = 0; k < 3; k++) spawnBullet(e.x, e.y, e.spinA + k * TAU / 3, 92, 'enemy', e, 'bit', 'bits');
    }
    e.modeT -= dt;
    if (e.modeT <= 0) {
      e.modeT = 5.5;
      const drones = G.enemies.filter((o) => o.kind === 'Q' && o.state !== 'dead').length;
      if (drones < 3) { spawnMinions('Q', 2, e); say(e, 'DROHNEN, LOS!', 1.2); Sound.play('boss_attack'); }
      else aimedBurst(e, pa, 5, 0.35, 230);
    }
    return;
  }
  switch (e.mode) {
    case 'glitch': // kurze Pause, dann Teleport
      e.modeT -= dt;
      if (e.modeT <= 0) {
        const s = randomArenaSpot(130);
        e.tele = s; e.mode = 'teleport'; e.modeT = fast ? 0.35 : 0.5; Sound.play('glitch');
      }
      break;
    case 'teleport':
      e.modeT -= dt;
      if (e.modeT <= 0) {
        if (e.tele) { sparks(e.x, e.y, 16, '#39ff7a'); e.x = e.tele[0]; e.y = e.tele[1]; sparks(e.x, e.y, 16, '#39ff7a'); }
        e.tele = null; e.mode = 'attack'; e.modeT = 0.3;
        e.attack = (e.attack + 1) % 3;
        if (fast && Math.random() < 0.35) say(e, pick(L_BOSS.hacker), 1.4);
      }
      break;
    case 'attack':
      e.modeT -= dt;
      if (e.modeT > 0) break;
      if (e.attack === 0) { // Paketflut
        e.mode = 'burst'; e.burst = fast ? 4 : 3; e.shootT = 0;
        Sound.play('boss_attack');
      } else if (e.attack === 1) { // Ring
        const n = fast ? 18 : 14;
        for (let ring = 0; ring < 2; ring++) for (let i = 0; i < n; i++) {
          spawnBullet(e.x, e.y, i * TAU / n + ring * TAU / n / 2, (fast ? 140 : 118) - ring * 26, 'enemy', e, 'bit', 'bits');
        }
        Sound.play('boss_attack'); e.mode = 'glitch'; e.modeT = fast ? 1.2 : 1.7;
      } else { // DDoS-Laser
        e.mode = 'laserAim'; e.modeT = fast ? 0.9 : 1.15; e.beamA = pa; e.beams = fast ? 2 : 1;
        say(e, 'DDOS-LASER!', 1); Sound.play('boss_laser');
      }
      break;
    case 'burst':
      e.shootT -= dt;
      if (e.shootT <= 0) {
        e.shootT = fast ? 0.3 : 0.4;
        aimedBurst(e, pa, 5, 0.3, fast ? 245 : 215);
        e.burst--;
        if (e.burst <= 0) { e.mode = 'glitch'; e.modeT = fast ? 1.0 : 1.4; }
      }
      break;
    case 'laserAim':
      e.beamA = turnTo(e.beamA, pa, 1.2 * dt);
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'laser'; e.modeT = fast ? 2.0 : 1.5; shake(6); }
      break;
    case 'laser':
      e.beamA = turnTo(e.beamA, pa, (fast ? 1.0 : 0.75) * dt);
      e.modeT -= dt; shake(2);
      for (let b = 0; b < e.beams; b++) {
        const a = e.beamA + b * Math.PI;
        for (const q of G.players) if (q.alive && beamHits(e.x, e.y, a, q.x, q.y, q.r + 2)) killPlayer(e, a, 'hackbeam', q);
      }
      if (e.modeT <= 0) { e.mode = 'stunned'; e.modeT = fast ? 2.8 : 3.4; say(e, 'ÜBERHITZT! NEIN!', 1.5); }
      break;
    case 'stunned':
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'glitch'; e.modeT = 0.4; }
      break;
  }
  // Phase 3: Überlastung
  if (e.phase === 2 && e.hp <= e.maxHp * 0.5) {
    e.phase = 3; e.mode = 'glitch'; e.modeT = 1;
    say(e, 'SYSTEM OVERLOAD!!! JETZT KEINE GNADE!', 3);
    Sound.play('boss_phase'); G.flash = 0.4; shake(14);
    e.sweepT = 3;
  }
  if (e.phase === 3) {
    e.sweepT -= dt;
    if (e.sweepT <= 0) { e.sweepT = 11; startSweep(); }
    e.droneT = (e.droneT || 6) - dt;
    if (e.droneT <= 0) { e.droneT = 11; if (G.enemies.filter((o) => o.kind === 'Q' && o.state !== 'dead').length < 2) spawnMinions('Q', 1, e); }
  }
  if (e.mode !== 'stunned' && p.execT <= 0 && pd < e.r + p.r) killPlayer(e, pa, 'hacker', p);
}
function aimedBurst(e, pa, n, spread, sp) {
  for (let i = 0; i < n; i++) spawnBullet(e.x, e.y, pa - spread / 2 + spread * i / (n - 1), sp, 'enemy', e, 'bit', 'bits');
}
function beamHits(x, y, a, px, py, r) {
  const dx = px - x, dy = py - y, along = dx * Math.cos(a) + dy * Math.sin(a);
  if (along < 0) return false;
  const perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
  if (perp > r) return false;
  return los(x, y, px, py);
}
function beamLength(x, y, a) {
  for (let d = 0; d < 900; d += 4) { if (blocksSightTile(Math.floor((x + Math.cos(a) * d) / TS), Math.floor((y + Math.sin(a) * d) / TS))) return d; }
  return 900;
}
// Laser-Gitter wandert durchs Feld, mit einer Lücke zum Durchschlüpfen
function startSweep() {
  const vert = Math.random() < 0.5;
  const span = vert ? G.w : G.h - 4;
  const gap = randi(3, span - 6);
  G.hazards.push({ kind: 'sweep', vert, pos: TS * 1.5, speed: 70, gap0: gap * TS, gap1: (gap + 3) * TS, t: 0 });
  Sound.play('boss_laser');
}
function updateHazards(dt) {
  if (!G.hazards) return;
  for (const h of G.hazards) {
    if (h.kind === 'dice') {
      h.t -= dt;
      if (h.t <= 0) {
        h.dead = true; Sound.play('explode'); shake(6);
        sparks(h.x, h.y, 20, '#ffffff'); bloodBurst(h.x, h.y, 0, 10, 120, ['#ffffff', '#ff3b3b', '#111111']);
        for (const p of G.players) if (p.alive && dist(p.x, p.y, h.x, h.y) < h.r) killPlayer(h.src, Math.atan2(p.y - h.y, p.x - h.x), 'dice', p);
        for (const o of G.enemies) if (o.state !== 'dead' && o.kind !== 'B' && !o.static && dist(o.x, o.y, h.x, h.y) < h.r) killEnemy(o, 'friendly', 0);
      }
    } else if (h.kind === 'packet') {
      const len = Math.max(1, dist(h.ax, h.ay, h.bx, h.by));
      h.t += h.speed * dt / len;
      if (h.t >= 1) { h.dead = true; continue; }
      h.x = lerp(h.ax, h.bx, h.t); h.y = lerp(h.ay, h.by, h.t);
      for (const p of G.players) if (p.alive && dist(p.x, p.y, h.x, h.y) < p.r + 4) { h.dead = true; killPlayer(G.boss, 0, 'packet', p); }
    } else if (h.kind === 'sweep') {
      h.pos += h.speed * dt; h.t += dt;
      const max = h.vert ? (G.h - 4) * TS : G.w * TS;
      if (h.pos > max) { h.dead = true; continue; }
      for (const p of G.players) {
        if (!p.alive || h.t <= 0.6) continue;
        const pp = h.vert ? p.y : p.x, other = h.vert ? p.x : p.y;
        if (Math.abs(pp - h.pos) < p.r + 1 && (other < h.gap0 || other > h.gap1)) killPlayer(G.boss, 0, 'laserwall', p);
      }
    } else if (HAZ_UPDATE[h.kind]) extCall(HAZ_UPDATE[h.kind], h, dt);
  }
  G.hazards = G.hazards.filter((h) => !h.dead);
}
function randomArenaSpot(minDist) {
  const b = G.boss;
  for (let tries = 0; tries < 200; tries++) {
    const x = randi(2, G.w - 3), y = randi(2, G.h - 3), i = y * G.w + x;
    if (G.solid[i] || G.tiles[i] === 'D' || G.tiles[i] === ' ') continue;
    const wx = x * TS + 8, wy = y * TS + 8;
    if (G.players.some((p) => p.alive && dist(wx, wy, p.x, p.y) < minDist)) continue;
    if (b && !los(wx, wy, b.x, b.y) && !los(wx, wy, G.player.x, G.player.y)) continue;
    let ok = true;
    for (const [dx, dy] of DIRS8) if (G.solid[(y + dy) * G.w + x + dx]) ok = false;
    if (ok) return [wx, wy];
  }
  return null;
}
function spawnMinions(kind, n, from) {
  for (let k = 0; k < n; k++) {
    const s = from ? [from.x + rand(-20, 20), from.y + rand(-20, 20)] : randomArenaSpot(170);
    if (!s) continue;
    const d = makeEnemy(kind, s[0], s[1]);
    d.state = 'search'; d.alerted = true; d.lastSeen = { x: G.player.x, y: G.player.y };
    if (d.flying) d.state = 'alert';
    G.enemies.push(d);
    sparks(s[0], s[1], 12, kind === 'Q' ? '#39ff7a' : '#ffffff');
  }
  G.cleared = false;
  Sound.play(kind === 'K' ? 'bark' : 'zap');
}

// ---------- Schaden & Tod ----------
function bossDamage(e, dmg, ang, how) {
  if (e.state === 'dead') return;
  activateBoss(e);
  if (e.btype === 'croupier' && how === 'thrown' && e.mode !== 'stunned') { e.mode = 'stunned'; e.modeT = 3.2; say(e, 'AUTSCH! MEINE FLIEGE!', 1.2); Sound.play('bonk'); return; }
  if (BOSS_EXT[e.btype] && BOSS_EXT[e.btype].hit && BOSS_EXT[e.btype].hit(e, dmg, ang, how)) return;
  if (!bossVulnerable(e)) {
    sparks(e.x + Math.cos(ang + Math.PI) * e.r, e.y + Math.sin(ang + Math.PI) * e.r, 4, e.btype === 'hacker' ? '#39ff7a' : '#ffffff');
    if (T - (e.hintT || -9) > 1.5) { e.hintT = T; floatText(e.x, e.y - 26, BOSS_WEAK[e.btype] || 'FINDE SEINE SCHWACHSTELLE!', '#ffe14d', true); Sound.play('armor'); }
    return;
  }
  const cap = Math.ceil(e.maxHp * 0.36);
  dmg = Math.min(dmg * 2, cap - (e.winDmg || 0));
  if (dmg <= 0) return;
  e.winDmg = (e.winDmg || 0) + dmg;
  e.hp -= dmg; e.flash = 0.08;
  Sound.play(e.btype === 'hacker' ? 'boss_hit' : 'hurtBoss');
  if (e.btype === 'hacker') sparks(e.x, e.y, 5, '#39ff7a');
  else if (BOSS_INFO[e.btype].noGore) sparks(e.x, e.y, 6, e.btype === 'tabluator' ? '#3fd0ff' : '#ffffff');
  else bloodBurst(e.x, e.y, ang, 5, 90);
  floatText(e.x + rand(-8, 8), e.y - 22, '-' + dmg, '#ffd84a', true);
  if (Math.random() < 0.14) say(e, e.btype === 'grechenig' ? pick(['AUA! FOOOKUS!', 'DAS GIBT EINEN EINTRAG!', 'ÄHHHM...!']) : e.btype === 'tabluator' ? pick(['PAKETVERLUST!', 'MEIN LAPTOP!', 'TIMEOUT!']) : e.btype === 'hacker' ? pick(['NYET!', 'OI OI OI!', 'MEIN PING!']) : pick(['AUTSCH!', 'MEIN ANZUG!', 'DAS GIBT RACHE!', 'NICHT INS GESICHT!']), 1);
  if (e.hp <= 0) { killBoss(e, ang); return; }
  // Fenster voll: der Boss rappelt sich auf
  if (e.winDmg >= cap && e.mode === 'stunned') { e.modeT = Math.min(e.modeT, 0.05); floatText(e.x, e.y - 34, 'GENUG! WEITER GEHT\'S!', '#ff9ad5', true); }
}
function killBoss(e, ang) {
  e.state = 'dead'; e.hp = 0;
  for (const o of G.enemies) if (o.kind === 'O') o.state = 'dead';
  if (e.btype === 'hacker') {
    for (let i = 0; i < 6; i++) sparks(e.x + rand(-20, 20), e.y + rand(-20, 20), 20, pick(['#39ff7a', '#ffffff', '#ff2a3a']));
    Sound.play('boss_death');
    G.hazards = [];
    for (const b of G.bullets) if (b.owner === 'enemy') b.dead = true;
    for (const o of G.enemies) if (o.state !== 'dead') killEnemy(o, 'machine', 0);
    floatText(e.x, e.y - 20, 'RUSSIAN_HACKER_BOI.EXE WURDE BEENDET', 'rainbow');
  } else if (BOSS_INFO[e.btype].noGore) {
    // Lehrer-Bosse: kein Blut - K.O. und weg!
    for (let i = 0; i < 4; i++) sparks(e.x + rand(-10, 10), e.y + rand(-10, 10), 16, pick(['#ffffff', '#ffe14d', '#3fd0ff']));
    G.hazards = [];
    for (const b of G.bullets) if (b.owner === 'enemy') b.dead = true;
    for (const o of G.enemies) if (o.kind === 'V' && o.state !== 'dead') killEnemy(o, 'machine', 0);
    spawnCash(e.x, e.y, 200 + G.diff * 40, 10);
    Sound.play('explode');
    floatText(e.x, e.y + 10, BOSS_INFO[e.btype].koText ? BOSS_INFO[e.btype].koText : e.btype === 'grechenig' ? 'K.O.! DIE STUNDE IST VORBEI...' : e.btype === 'baka' ? 'K.O.! BAKA... ZZZ...' : 'K.O.! VERBINDUNG GETRENNT...', '#ffffff', true);
  } else {
    bloodBurst(e.x, e.y, ang, 70, 200);
    if (e.btype === 'guenther') bloodBurst(e.x, e.y, ang + Math.PI, 35, 160, ['#ffcc00', '#e6b800', '#ffd84a']);
    else spawnCash(e.x, e.y, 260 + G.diff * 40, 12);
    Sound.play('explode');
    floatText(e.x, e.y + 10, e.btype === 'guenther' ? 'MEIN... SENF...' : 'DIE BANK... VERLIERT...', '#ffffff', true);
  }
  if (!BOSS_INFO[e.btype].noGore) stampCorpse(e, ang);
  addKillScore(e.btype === 'hacker' ? 20000 : 5000, BOSS_INFO[e.btype].name + ' BESIEGT!', e.x, e.y);
  G.slowmo = 1.6; shake(14); G.flash = 0.35;
  if (e.btype !== 'hacker') Sound.playSong(G.L.song);
  const X = BOSS_EXT[e.btype];
  if (X && X.death) extCall(X.death, e, ang);
  for (const f of BOSS_KILL_HOOKS) extCall(f, e);
  checkClear();
}

// ---------- Zeichnen ----------
function drawGuentherBody(g, e) {
  const s = Math.round(Math.sin(e.walkT * 10) * 4);
  g.fillStyle = '#111'; g.fillRect(-4 + s, -9, 7, 5); g.fillRect(-4 - s, 4, 7, 5);
  pxEll(g, -1, 0, 10, 12, '#c9c9d4'); pxEll(g, 0, 0, 9, 11, '#fafafa');
  g.fillStyle = '#c41f1f'; g.fillRect(4, -2, 5, 4);
  g.fillStyle = '#ffd700'; for (let i = -5; i <= 5; i += 2) g.fillRect(7, i, 1, 1);
  g.fillStyle = '#e8e8ee'; g.fillRect(2, -12, 8, 4); g.fillRect(2, 8, 8, 4);
  g.fillStyle = '#f0b890'; g.fillRect(10, -11, 3, 3); g.fillRect(10, 8, 3, 3);
  g.fillStyle = '#5a5a66'; g.fillRect(9, -3, 14, 6); g.fillStyle = '#8a8a99'; g.fillRect(9, -3, 14, 1);
  g.fillStyle = '#b5532a'; g.fillRect(22, -2, 3, 4);
  pxEll(g, 0, 0, 7, 7, '#1e1e1e'); pxEll(g, 0, 0, 4, 4, '#c41f1f'); pxEll(g, 0, 0, 3, 3, '#333');
  g.fillStyle = '#6b3a1a'; g.fillRect(6, 1, 5, 2); g.fillStyle = '#ff5a1a'; g.fillRect(11, 1, 1, 2);
}
function drawCroupierBody(g, e) {
  const s = Math.round(Math.sin(e.walkT * 12) * 3);
  g.fillStyle = '#111'; g.fillRect(-3 + s, -6, 5, 3); g.fillRect(-3 - s, 3, 5, 3);
  g.fillStyle = '#16161c'; g.fillRect(-4, -8, 8, 16); g.fillStyle = '#f4f4f4'; g.fillRect(1, -3, 3, 6);
  g.fillStyle = '#e01b3c'; g.fillRect(3, -2, 2, 4);
  g.fillStyle = '#f4f4f4'; g.fillRect(0, -11, 7, 3); g.fillRect(0, 8, 7, 3);
  g.fillStyle = '#f0c8a0'; g.fillRect(7, -11, 2, 3); g.fillRect(7, 8, 2, 3);
  g.fillStyle = '#fff'; g.fillRect(9, 7, 4, 5); g.fillStyle = '#e01b3c'; g.fillRect(10, 8, 2, 2);
  pxEll(g, 0, 0, 5, 5, '#0d0d0d'); g.fillStyle = '#333'; g.fillRect(-4, -1, 8, 1);
  g.fillStyle = '#f0c8a0'; g.fillRect(3, -2, 2, 4);
}
function drawHackerBody(g, e) {
  const glow = e.phase === 3 ? '#ff2a3a' : '#39ff7a';
  pxEll(g, -1, 0, 9, 11, '#0c160e'); pxEll(g, 0, 0, 8, 10, '#16261a');
  g.fillStyle = '#20362a'; g.fillRect(-2, -9, 4, 18);
  g.fillStyle = '#2a2a2a'; g.fillRect(6, -7, 8, 14); g.fillStyle = glow; g.fillRect(7, -6, 6, 12);
  g.fillStyle = '#16261a'; g.fillRect(3, -10, 5, 3); g.fillRect(3, 7, 5, 3);
  pxEll(g, 0, 0, 7, 7, '#3a2418'); pxEll(g, 0, 0, 6, 6, '#5a3e2a'); pxEll(g, -1, 0, 3, 4, '#7a5a40');
  g.fillStyle = '#5a3e2a'; g.fillRect(-2, -8, 4, 2); g.fillRect(-2, 6, 4, 2);
  g.fillStyle = glow; g.fillRect(5, -3, 2, 6);
}
function drawBoss(g, e) {
  const x = Math.round(e.x), y = Math.round(e.y);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 2, y + 3, e.r + 2, e.r + 2, 0, 0, TAU); g.fill();
  if (e.mode === 'windup') { g.fillStyle = `rgba(255,40,40,${0.3 + Math.sin(T * 40) * 0.2})`; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.fill(); }
  if (e.btype === 'hacker' && e.mode === 'teleport' && e.tele) {
    g.strokeStyle = `rgba(57,255,122,${0.4 + Math.sin(T * 50) * 0.4})`; g.lineWidth = 1;
    g.strokeRect(e.tele[0] - 10, e.tele[1] - 10, 20, 20);
  }
  const glitch = e.btype === 'hacker' && (e.phase === 3 || e.mode === 'teleport');
  if (e.btype === 'tabluator') drawTabluatorNet(g, e);
  if (e.btype === 'baka') drawBakaExtra(g, e);
  const X = BOSS_EXT[e.btype];
  if (X && X.extra) X.extra(g, e);
  const drawB = (ox, oy) => {
    g.save(); g.translate(x + ox, y + oy); g.rotate(e.a);
    if (e.btype === 'hacker') drawHackerBody(g, e); else if (e.btype === 'croupier') drawCroupierBody(g, e);
    else if (e.btype === 'grechenig') drawGrechenigBody(g, e); else if (e.btype === 'tabluator') drawTabluatorBody(g, e);
    else if (e.btype === 'baka') { if (e.mode === 'flop') { g.globalAlpha = 0.55; g.scale(1.35, 1.35); } drawBakaBody(g, e); g.globalAlpha = 1; }
    else if (X) X.draw(g, e);
    else drawGuentherBody(g, e);
    g.restore();
  };
  if (glitch) { g.globalAlpha = 0.5; drawB(randi(-3, 3), 0); drawB(0, randi(-3, 3)); g.globalAlpha = 1; }
  drawB(0, 0);
  if (e.flash > 0) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x, y, e.r + 1, 0, TAU); g.fill(); }
  if (e.btype === 'hacker' && e.mode === 'firewall') {
    g.strokeStyle = `rgba(57,255,122,${0.5 + Math.sin(T * 8) * 0.25})`; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, 19, 0, TAU); g.stroke();
    g.lineWidth = 1;
    for (const v of G.enemies) if (v.kind === 'V' && v.state !== 'dead') {
      g.strokeStyle = `rgba(57,255,122,${0.25 + Math.random() * 0.3})`;
      g.beginPath(); g.moveTo(v.x, v.y); g.lineTo(x, y); g.stroke();
    }
  }
  if (e.btype === 'hacker' && (e.mode === 'laserAim' || e.mode === 'laser')) {
    for (let b = 0; b < e.beams; b++) {
      const a = e.beamA + b * Math.PI, len = beamLength(x, y, a);
      if (e.mode === 'laserAim') { g.strokeStyle = `rgba(255,40,60,${0.3 + Math.sin(T * 40) * 0.3})`; g.lineWidth = 1; }
      else { g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke(); g.strokeStyle = '#ff2a5a'; g.lineWidth = 3; }
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
    g.lineWidth = 1;
  }
  if (e.mode === 'stunned') {
    g.fillStyle = '#ffe14d';
    for (let i = 0; i < 4; i++) { const a = T * 5 + i * TAU / 4; g.fillRect(Math.round(x + Math.cos(a) * 11) - 1, Math.round(y - 16 + Math.sin(a) * 3), 2, 2); }
  }
  if (X && X.post) X.post(g, e);
}
function drawHazards(g) {
  if (!G.hazards) return;
  for (const h of G.hazards) {
    if (h.kind === 'packet') { if (h.x !== undefined) drawEnvelope(g, h.x, h.y, h.col); continue; }
    if (h.kind === 'dice') {
      g.strokeStyle = `rgba(255,40,40,${0.5 + Math.sin(T * 30) * 0.4})`; g.lineWidth = 1;
      g.beginPath(); g.arc(h.x, h.y, h.r * clamp(1 - h.t / 1.5, 0.3, 1), 0, TAU); g.stroke();
      g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(Math.round(h.x) - 3, Math.round(h.y) - 3 - Math.round(h.t * 20), 6, 6);
      g.fillStyle = '#e01b3c'; g.fillRect(Math.round(h.x) - 1, Math.round(h.y) - 1 - Math.round(h.t * 20), 2, 2);
    } else if (h.kind === 'sweep') {
      const warn = h.t < 0.6;
      g.fillStyle = warn ? `rgba(255,40,60,${0.3 + Math.sin(T * 40) * 0.3})` : '#ff2a5a';
      const thick = warn ? 1 : 3;
      if (h.vert) { g.fillRect(0, h.pos - thick / 2, h.gap0, thick); g.fillRect(h.gap1, h.pos - thick / 2, G.w * TS - h.gap1, thick); }
      else { g.fillRect(h.pos - thick / 2, 0, thick, h.gap0); g.fillRect(h.pos - thick / 2, h.gap1, thick, (G.h - 4) * TS - h.gap1); }
    } else if (HAZ_DRAW[h.kind]) extCall(HAZ_DRAW[h.kind], g, h);
  }
}
