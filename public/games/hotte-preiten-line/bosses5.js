'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Staffel 2, Bosse Teil A (Präfix b5_)
//   CHEFKOCH GULASCHO -> alle 3 Herde ausschalten -> er rutscht auf seinem kalten Fett aus
//   KAPITÄN HAI       -> in den Elektrozaun locken (Schalter = Strom an)
//   RHB-KLON 2.0      -> spiegelt deine Bewegungen; Kühlmodul zerstören, solange sein Laser läuft
//  Alles über BOSS_EXT / PROP_HIT / PROP_DRAW / HAZ_UPDATE / HAZ_DRAW / BULLET_DRAW.
//  Synchronisierter Zustand nur als einfache Daten am Boss (herds, fences, power, cool, fat ...).
//  Fertige Boss-Etagen für die Level-Bauer: S2_BOSS_FLOORS.koch / .hai / .robo
// =====================================================================
Object.assign(BOSS_INFO, {
  koch: { name: 'CHEFKOCH GULASCHO', hp: 68, r: 11, song: 'boss', noGore: true, koText: 'K.O.! DIE KÜCHE IST GESCHLOSSEN...' },
  hai: { name: 'KAPITÄN HAI', hp: 72, r: 11, song: 'boss', noGore: true, koText: 'K.O.! KAPITÄN HAI GEHT VON BORD...' },
  robo: { name: 'RHB-KLON 2.0', hp: 76, r: 10, song: 'boss', noGore: true, koText: 'K.O.! KLON.EXE HAT EINEN BLUESCREEN.' },
});
Object.assign(BOSS_WEAK, {
  koch: 'SCHALTE ALLE 3 HERDE AUS - DANN RUTSCHT ER AUF SEINEM FETT AUS!',
  hai: 'STROM AN (SCHALTER) UND LOCK IHN IN DEN ELEKTROZAUN!',
  robo: 'ZERSTÖR EIN KÜHLMODUL, WÄHREND SEIN LASER LÄUFT!',
});
Object.assign(L_BOSS, {
  koch: ['MEHR SALZ!', 'DAS IST KEIN GULASCH, DAS IST KUNST!', 'IN MEINER KÜCHE HERRSCHT ZUCHT!', 'WER HAT DIE SOSSE ANBRENNEN LASSEN?!', 'FRIKADELLEN-ALARM!', 'ABSCHMECKEN! MIT DEM KOCHLÖFFEL!'],
  hai: ['HAI-LIGE SCHEISSE!', 'ICH RIECHE ANGST... UND O-SAFT!', 'ALLE MANN AN DECK!', 'BLUBB! BLUBB! TOT!', 'MEIN AQUARIUM, MEINE REGELN!', 'ARRR... ICH MEINE: HAI!'],
  robo: ['ICH BIN DU. NUR BESSER.', 'KOPIERE... BEWEGUNG...', 'STRG+C, STRG+V, STRG+TOT.', 'PRIVET! ICH BIN DAS UPDATE.', 'DEIN SPIEGELBILD HASST DICH.', 'HARDWARE SCHLÄGT SOFTWARE!'],
});
Object.assign(CAUSE, {
  b5_meat: 'FRIKADELLE MIT KARACHO', b5_fire: 'FLAMBIERT', b5_pot: 'KOCHTOPF AUF DEN KOPF', koch: 'CHEFKOCH GULASCHO',
  b5_harp: 'HARPUNIERT', b5_fish: 'PIRANHA VON OBEN', b5_zaun: 'ELEKTROZAUN', hai: 'KAPITÄN HAI',
  b5_bit: 'SPIEGEL-BITS', b5_laser: 'KLON-LASER', b5_sat: 'SATELLITEN-SCHROTT', robo: 'RHB-KLON 2.0',
});

// ---------- Sounds ----------
if (Sound.addSfx) {
  Sound.addSfx('b5_sizzle', (v = 1) => { const { noise, tone, now } = Sound.synth, t = now();
    noise({ dur: 0.35, ft: 'highpass', f: 3000, f2: 1500, vol: 0.16 * v, t }); tone({ type: 'sawtooth', f: 180, f2: 90, dur: 0.25, vol: 0.06 * v, t }); });
  Sound.addSfx('b5_shock', (v = 1) => { const { tone, noise, now } = Sound.synth, t = now();
    tone({ type: 'square', f: 90, f2: 1400, slide: 0.1, dur: 0.18, vol: 0.12 * v, t }); tone({ type: 'square', f: 1200, f2: 80, dur: 0.25, vol: 0.1 * v, t: t + 0.12 });
    noise({ dur: 0.4, ft: 'bandpass', f: 2500, vol: 0.14 * v, t }); });
}

// ---------- Hilfen ----------
// fallende Sachen mit rotem Warnkreis (eigene Gefahr, läuft über HAZ_UPDATE/HAZ_DRAW -> auch beim Gast sichtbar)
function b5_drop(x, y, r, t, look) { (G.hazards = G.hazards || []).push({ kind: 'b5_drop', x, y, r, t, max: t, look }); }
function b5_dropOn(spread, r, t, look) { const q = pick(G.players.filter((p) => p.alive)) || G.player; b5_drop(q.x + rand(-spread, spread), q.y + rand(-spread, spread), r, t, look); }
const b5_DROP_CAUSE = { pot: 'b5_pot', fish: 'b5_fish', sat: 'b5_sat' };
HAZ_UPDATE.b5_drop = (h, dt) => {
  h.t -= dt;
  if (h.t > 0) return;
  h.dead = true; shake(5); Sound.play('slam');
  sparks(h.x, h.y, 14, h.look === 'pot' ? '#c8c8d0' : h.look === 'fish' ? '#3fd0ff' : '#ffe14d');
  if (h.look === 'pot') sparks(h.x, h.y, 8, '#c4402a');
  for (const p of G.players) if (p.alive && dist(p.x, p.y, h.x, h.y) < h.r) killPlayer(G.boss, Math.atan2(p.y - h.y, p.x - h.x), b5_DROP_CAUSE[h.look] || 'b5_pot', p);
  for (const o of G.enemies) if (o.state !== 'dead' && o.kind !== 'B' && !o.static && dist(o.x, o.y, h.x, h.y) < h.r) killEnemy(o, 'friendly', 0);
};
HAZ_DRAW.b5_drop = (g, h) => {
  const k = clamp(1 - h.t / h.max, 0, 1), x = Math.round(h.x), y = Math.round(h.y);
  g.strokeStyle = `rgba(255,40,40,${0.5 + Math.sin(T * 30) * 0.4})`; g.lineWidth = 1;
  g.beginPath(); g.arc(x, y, h.r, 0, TAU); g.stroke();
  g.fillStyle = `rgba(255,40,40,${0.1 + 0.2 * k})`; g.beginPath(); g.arc(x, y, h.r * k, 0, TAU); g.fill();
  const fy = Math.round(y - (1 - k) * 90);
  if (h.look === 'pot') {          // Kochtopf mit Gulasch
    g.fillStyle = '#8a8a96'; g.fillRect(x - 6, fy - 4, 12, 8); g.fillStyle = '#b0b0bc'; g.fillRect(x - 6, fy - 4, 12, 2);
    g.fillStyle = '#5a5a66'; g.fillRect(x - 8, fy - 2, 2, 3); g.fillRect(x + 6, fy - 2, 2, 3);
    g.fillStyle = '#8a2a10'; g.fillRect(x - 4, fy - 3, 8, 1);
  } else if (h.look === 'fish') {  // Piranha
    pxEll(g, x, fy, 5, 3, '#c0302a'); pxEll(g, x - 1, fy - 1, 4, 2, '#e0603a');
    g.fillStyle = '#c0302a'; g.fillRect(x - 8, fy - 2, 3, 5); g.fillStyle = '#fff'; g.fillRect(x + 3, fy + 1, 2, 1); g.fillStyle = '#111'; g.fillRect(x + 2, fy - 2, 1, 1);
  } else {                         // Satelliten-Schrott
    g.fillStyle = '#3a5aa8'; g.fillRect(x - 9, fy - 2, 6, 5); g.fillRect(x + 3, fy - 2, 6, 5);
    g.fillStyle = '#c8c8d8'; g.fillRect(x - 3, fy - 3, 6, 7); g.fillStyle = '#ff3b3b'; g.fillRect(x - 1, fy - 1, 2, 2);
  }
};
// Abstand Punkt -> Strecke
function b5_segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
// Index des nächsten Eintrags (Requisiten-Daten am Boss werden über die Position gefunden, das klappt auch beim Gast)
function b5_nearest(list, x, y) {
  let bi = -1, bd = 1e9;
  (list || []).forEach((h, i) => { const d = dist(h.x, h.y, x, y); if (d < bd) { bd = d; bi = i; } });
  return bd < 24 ? bi : -1;
}
const b5_boss = (id) => (G.boss && G.boss.btype === id ? G.boss : null);
function b5_toWalk(e, line) { e.mode = 'walk'; e.modeT = rand(2.6, 3.4); if (line) say(e, line, 1.6); }

// eigene Kugeln
BULLET_DRAW.b5_meat = (g, b) => { const x = Math.round(b.x), y = Math.round(b.y); pxEll(g, x, y, 3, 3, '#5a2a10'); pxEll(g, x, y, 2, 2, '#8a4a20'); g.fillStyle = '#c87a40'; g.fillRect(x - 1, y - 2, 1, 1); return true; };
BULLET_DRAW.b5_fire = (g, b) => {
  const x = Math.round(b.x), y = Math.round(b.y), f = Math.floor(T * 20 + b.sx) % 2;
  pxEll(g, x, y, 3, 3, f ? '#ff6a1a' : '#ff3b1a'); g.fillStyle = '#ffe14d'; g.fillRect(x - 1, y - 1, 2, 2); return true;
};
BULLET_DRAW.b5_harp = (g, b) => {
  const a = Math.atan2(b.vy, b.vx), c = Math.cos(a), s = Math.sin(a);
  g.strokeStyle = '#8a6a3a'; g.lineWidth = 1; g.beginPath(); g.moveTo(b.x - c * 10, b.y - s * 10); g.lineTo(b.x, b.y); g.stroke();
  g.fillStyle = '#d8d8e0'; g.fillRect(Math.round(b.x + c * 1) - 1, Math.round(b.y + s * 1) - 1, 3, 3); return true;
};
BULLET_DRAW.b5_bit = (g, b) => { const x = Math.round(b.x), y = Math.round(b.y); g.fillStyle = '#3fd0ff'; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = '#e8ffff'; g.fillRect(x - 1, y - 1, 2, 2); return true; };

// =====================================================================
//  CHEFKOCH GULASCHO - Restaurant "Zur Goldenen Pfanne"
//  Trick: alle 3 Herde ausschalten -> sein Fett wird kalt -> er rutscht aus -> wehrlos.
//  Ausgeschaltete Herde zündet er nach ein paar Sekunden wieder an (Zeitdruck!).
// =====================================================================
BOSS_EXT.koch = {
  taunts: ['ZU ROH! ZURÜCK IN DEN OFEN!', 'DAS WAR DEIN LETZTES MENÜ!', 'GUTEN APPETIT, PREITNER!'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; say(e, 'WER LÄUFT DA DURCH MEINE KÜCHE?! HAARNETZ AUF, SOFORT!', 3); Sound.play('boss'); },
  setup(e) {
    e.herds = []; e.herdOff = 0;
    for (const [fx, fy] of [[0.12, 0.3], [0.88, 0.3], [0.5, 0.8]]) {
      const s = arenaSpotAt(fx, fy);
      if (!s) continue;
      const o = spawnProp('b5_herd', s[0], s[1]); o.suit = '#ff6a1a';
      e.herds.push({ x: s[0], y: s[1], on: 1, t: 0 });
    }
  },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
    if (e.fat) { e.fat.t -= dt; if (e.fat.t <= 0) e.fat = null; }
    // ausgeschaltete Herde wieder anzünden
    if (e.mode !== 'slip' && e.mode !== 'stunned') {
      for (const h of e.herds || []) {
        if (h.on) continue;
        h.t -= dt;
        if (h.t <= 0) { h.on = 1; sparks(h.x, h.y, 8, '#ff6a1a'); floatText(h.x, h.y - 18, 'WIEDER AN!', '#ff6a1a', true); Sound.play('b5_sizzle'); if (Math.random() < 0.6) say(e, pick(['WER SPIELT AN MEINEN HERDEN?!', 'HERD AN! ZACK!', 'MEIN GULASCH WIRD KALT!']), 1.3); }
      }
      e.herdOff = (e.herds || []).filter((h) => !h.on).length;
    }
    switch (e.mode) {
      case 'walk':
        e.a = turnTo(e.a, pa, 3 * dt);
        bChase(e, p, (angry ? 50 : 40) * dt, dt, 30);
        e.shootT -= dt;
        if (e.shootT <= 0 && sees) {
          e.shootT = angry ? 1.25 : 1.7; bFan(e, pa, angry ? 5 : 3, 0.55, 140, 'b5_meat', 'b5_meat'); Sound.play('throwIt');
          if (Math.random() < 0.3) say(e, pick(L_BOSS.koch), 1.3);
        }
        e.modeT -= dt;
        if (e.modeT <= 0) {
          e.attack = (e.attack + 1) % 3;
          if (e.attack === 1 && sees && pd < 170) { e.mode = 'flambeAim'; e.modeT = 0.9; say(e, 'FLAMBIEREN!!!', 1); Sound.play('boss_attack'); }
          else { e.mode = 'pots'; e.modeT = 1.4; e.burst = angry ? 6 : 4; e.shootT = 0.1; say(e, pick(['TÖPFE FREI!', 'ESSEN IST FERTIG!', 'GULASCH VON OBEN!']), 1.2); Sound.play('boss'); }
        }
        break;
      case 'pots':
        e.a = turnTo(e.a, pa, 2 * dt); e.shootT -= dt;
        if (e.shootT <= 0 && e.burst > 0) { e.shootT = 0.26; e.burst--; b5_dropOn(30, 22, 1.15, 'pot'); Sound.play('swoosh'); }
        e.modeT -= dt; if (e.modeT <= 0 && e.burst <= 0) b5_toWalk(e);
        break;
      case 'flambeAim':   // roter Kegel = gleich kommt Feuer
        e.a = turnTo(e.a, pa, 1.4 * dt); e.modeT -= dt;
        if (e.modeT <= 0) {
          Sound.play('b5_sizzle'); Sound.play('explode'); shake(7); G.flash = 0.06;
          for (const q of G.players) { const qa = Math.atan2(q.y - e.y, q.x - e.x); if (q.alive && dist(q.x, q.y, e.x, e.y) < 92 && Math.abs(angDiff(e.a, qa)) < 0.55 && los(e.x, e.y, q.x, q.y)) killPlayer(e, qa, 'b5_fire', q); }
          for (let i = 0; i < 7; i++) bShot(e, e.a - 0.5 + i / 6, rand(150, 190), 'b5_fire', 'b5_fire', 0.65);
          sparks(e.x + Math.cos(e.a) * 30, e.y + Math.sin(e.a) * 30, 16, '#ff6a1a');
          b5_toWalk(e);
        }
        break;
      case 'slip': {    // rutscht auf dem kalten Fett weg und dreht sich
        e.spinA += dt * 16; e.a = e.spinA; e.modeT -= dt;
        const v = 110 * clamp(e.modeT / 0.9, 0, 1) * dt; moveEntity(e, Math.cos(e.ca) * v, Math.sin(e.ca) * v); e.walkT += dt * 3;
        if (e.modeT <= 0) {
          e.mode = 'stunned'; e.modeT = 3.6; shake(10); Sound.play('slam'); Sound.play('boss_phase');
          sparks(e.x, e.y, 16, '#ffe08a'); floatText(e.x, e.y - 30, 'PLATSCH!', '#ffe08a');
          say(e, pick(['MEIN RÜCKEN! MEINE SOSSE!', 'AUA! WER HAT HIER GEFETTET?!', 'ICH SEH STERNE... MIT PETERSILIE...']), 1.8);
        }
        break;
      }
      case 'stunned':
        e.modeT -= dt;
        if (e.modeT <= 0) {
          for (const h of e.herds || []) { h.on = 1; h.t = 0; sparks(h.x, h.y, 6, '#ff6a1a'); }
          e.herdOff = 0; Sound.play('b5_sizzle');
          b5_toWalk(e, pick(['ALLE HERDE AN! VOLLE HITZE!', 'JETZT WIRD SCHARF GEKOCHT!', 'DU KOMMST IN DEN EINTOPF!']));
        }
        break;
      default: b5_toWalk(e);
    }
    if (e.mode !== 'slip') bTouch(e, p, pa, pd, 'koch');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'KÜCHENHILFEN! SCHNIPPELT IHN!', 2); spawnMinions('M', 2); }
  },
  draw(g, e) {
    const s = Math.round(Math.sin(e.walkT * 9) * 3), st = e.mode === 'stunned';
    g.fillStyle = '#111'; g.fillRect(-5 + s, -10, 7, 4); g.fillRect(-5 - s, 6, 7, 4);   // Schuhe
    pxEll(g, -1, 0, 12, 12, '#b8b8c0'); pxEll(g, 0, 0, 11, 11, '#f4f4f4');               // Kochjacke (dicker Bauch)
    g.fillStyle = '#c8c8d0'; g.fillRect(-9, -1, 18, 1);
    g.fillStyle = '#333'; for (const [bx, by] of [[3, -5], [3, 4], [-2, -5], [-2, 4]]) g.fillRect(bx, by, 2, 2);   // Knöpfe
    g.fillStyle = '#e01b3c'; g.fillRect(4, -4, 3, 8);                                      // Halstuch
    g.fillStyle = '#f4f4f4'; g.fillRect(2, -14, 8, 5); g.fillRect(2, 9, 8, 5);             // Ärmel
    g.fillStyle = '#f0b890'; g.fillRect(10, -13, 3, 3); g.fillRect(10, 10, 3, 3);         // Hände
    // Pfanne in der rechten Hand (mit brutzelndem Fett)
    g.fillStyle = '#5a3a1a'; g.fillRect(12, 11, 8, 2);
    pxEll(g, 25, 12, 6, 6, '#1a1a1a'); pxEll(g, 25, 12, 4, 4, '#3a3a3a');
    pxEll(g, 25, 12, 2, 2, e.herdOff >= 3 || st ? '#d8d0a0' : '#ffd23f');
    g.fillStyle = '#8a3a10'; g.fillRect(23, 10, 3, 2);
    // Kopf + Schnurrbart + Kochmütze
    pxEll(g, 2, 0, 6, 6, '#f0b890');
    g.fillStyle = '#4a2410'; g.fillRect(7, -5, 2, 10); g.fillRect(6, -7, 2, 2); g.fillRect(6, 5, 2, 2);
    if (!st) { pxEll(g, -1, 0, 7, 7, '#e8e8ec'); pxEll(g, -1, 0, 6, 6, '#ffffff'); g.fillStyle = '#e0e0e6'; g.fillRect(-5, -2, 2, 2); g.fillRect(0, 2, 2, 2); g.fillRect(-2, -5, 2, 2); }
    else { pxEll(g, -13, 9, 5, 4, '#ffffff'); g.fillStyle = '#e0e0e6'; g.fillRect(-15, 8, 2, 2); }   // Mütze runtergefallen
  },
  extra(g, e) {
    if (e.fat) { const a = clamp(e.fat.t / 2, 0, 1) * 0.6; g.fillStyle = `rgba(240,220,120,${a})`; g.beginPath(); g.ellipse(e.fat.x, e.fat.y, 26, 16, 0, 0, TAU); g.fill(); }
    if (e.mode === 'flambeAim') {
      g.fillStyle = `rgba(255,40,40,${0.18 + Math.sin(T * 40) * 0.1})`; g.beginPath(); g.moveTo(e.x, e.y); g.arc(e.x, e.y, 92, e.a - 0.55, e.a + 0.55); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,40,40,0.8)'; g.lineWidth = 1; g.beginPath(); g.arc(e.x, e.y, 92, e.a - 0.55, e.a + 0.55); g.stroke();
    }
    if (e.mode === 'slip') { g.fillStyle = 'rgba(240,220,120,0.5)'; g.beginPath(); g.ellipse(e.x, e.y + 2, 18, 12, 0, 0, TAU); g.fill(); }
  },
  hud(b) {
    const n = b.herdOff || 0, hs = b.herds || [];
    let soon = 99; for (const h of hs) if (!h.on) soon = Math.min(soon, h.t);
    const line = 'HERDE AUS: ' + n + '/' + (hs.length || 3) + (n > 0 && n < 3 && soon < 99 ? '  (WIEDER AN IN ' + Math.max(0, Math.ceil(soon)) + ' S)' : '');
    txt(line, W / 2, 46, { font: FS, align: 'center', color: n >= 3 ? '#7dff7a' : '#ff9a3a' });
  },
};
BOSS_SETUP.koch = BOSS_EXT.koch.setup;
PROP_HIT.b5_herd = (o, b, live) => {
  if (!live || b.btype !== 'koch') return;
  const i = b5_nearest(b.herds, o.x, o.y), h = b.herds && b.herds[i];
  if (!h) return;
  if (b.mode === 'slip' || b.mode === 'stunned') { if (T - (o.msgT || -9) > 1) { o.msgT = T; floatText(o.x, o.y - 16, 'ER LIEGT SCHON - DRAUF!', '#7dff7a', true); } return; }
  if (!h.on) { o.cd = 0.4; floatText(o.x, o.y - 16, 'SCHON AUS!', '#888888', true); return; }
  h.on = 0; h.t = b5_relight(b); o.cd = 0.4;
  Sound.play('click'); Sound.play('b5_sizzle'); sparks(o.x, o.y, 10, '#cccccc');
  b.herdOff = b.herds.filter((q) => !q.on).length;
  floatText(o.x, o.y - 18, 'HERD AUS! ' + b.herdOff + '/' + b.herds.length, '#3fd0ff');
  if (b.herdOff >= b.herds.length) {
    b.mode = 'slip'; b.modeT = 0.9; b.ca = b.a; b.path = null; b.fat = { x: b.x, y: b.y, t: 5 };
    say(b, pick(['MEIN FETT WIRD KALT... UND GLITSCHIG... WAAAH!', 'NEIN! DIE HERDE! ICH RUTSCH...!']), 1.6); shake(6); Sound.play('boss_phase');
  } else if (Math.random() < 0.5) say(b, pick(['FINGER WEG VON MEINEM HERD!', 'DAS GULASCH WIRD KALT!', 'WER HAT DEN HERD AUSGEMACHT?!']), 1.2);
};
function b5_relight(b) { return b.hp < b.maxHp / 2 ? 9.5 : 11; }   // Sekunden, bis er einen Herd wieder anzündet
PROP_DRAW.b5_herd = (g, o, x, y, off, blink) => {
  const b = b5_boss('koch'), i = b ? b5_nearest(b.herds, o.x, o.y) : -1, h = i >= 0 ? b.herds[i] : { on: 1, t: 0 };
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 8, y - 5, 18, 15);
  g.fillStyle = '#5a5a66'; g.fillRect(x - 9, y - 7, 18, 15); g.fillStyle = '#8a8a96'; g.fillRect(x - 9, y - 7, 18, 2);
  g.fillStyle = '#2a2a30'; g.fillRect(x - 9, y + 5, 18, 3);
  for (const [dx, dy] of [[-4, -2], [4, -2], [-4, 3], [4, 3]]) {
    pxEll(g, x + dx, y + dy, 3, 2, '#1a1a1a');
    if (h.on) { const f = Math.floor(T * 12 + dx + dy) % 2; pxEll(g, x + dx, y + dy, 2, 1, f ? '#ff6a1a' : '#3f8bff'); }
  }
  g.fillStyle = h.on ? '#ff3b1a' : '#3a3a44'; g.fillRect(x - 7, y + 6, 2, 1); g.fillRect(x - 3, y + 6, 2, 1);
  if (h.on) {
    txt('HERD', x, y - 18, { g, font: FS, align: 'center', color: '#ff6a1a' });
    if (blink) txt('!', x, y - 26, { g, font: FS, align: 'center', color: '#ffe14d' });
  } else {
    txt('AUS', x, y - 18, { g, font: FS, align: 'center', color: '#3fd0ff' });
    const k = clamp(h.t / 11, 0, 1); g.fillStyle = '#000'; g.fillRect(x - 9, y - 12, 18, 3); g.fillStyle = '#ff9a3a'; g.fillRect(x - 8, y - 11, Math.round(16 * (1 - k)), 1);
  }
};

// =====================================================================
//  KAPITÄN HAI - Aquarium Blubberwelt
//  Trick: Schalter -> Strom auf den Elektrozäunen. Hai im Zaun = Stromschlag -> wehrlos.
//  Beim Laufen weicht er Strom-Zäunen aus - aber seinen Sprint kann er nicht bremsen!
//  Achtung: der Zaun unter Strom grillt auch dich.
// =====================================================================
const b5_POWER = 5.4, b5_WARM = 0.4;   // Sekunden Strom; erste 0,4 s nur Funken (Vorwarnung)
const b5_live = (e) => (e.power || 0) > 0 && (e.power || 0) < b5_POWER - b5_WARM;
function b5_onFence(e, x, y, pad) { for (const f of e.fences || []) if (b5_segDist(x, y, f.x1, f.y1, f.x2, f.y2) < pad) return true; return false; }
function b5_shockHai(e) {
  e.mode = 'zap'; e.modeT = 0.6; e.path = null; shake(10); G.flash = 0.12;
  Sound.play('b5_shock'); Sound.play('boss_phase'); sparks(e.x, e.y, 22, '#bfefff'); sparks(e.x, e.y, 10, '#ffe14d');
  floatText(e.x, e.y - 30, 'BZZZZZT!', '#bfefff');
  say(e, pick(['HAAAIIII-SPANNUNG!', 'MEINE FLOSSEN! ALLES KRIBBELT!', 'BLUBB... BZZT... BLUBB...']), 1.6);
}
BOSS_EXT.hai = {
  taunts: ['FRISCHFLEISCH! HAHA!', 'DU BIST JETZT FISCHFUTTER!', 'MANN ÜBER BORD!'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; say(e, 'AHOI, LANDRATTE! WILLKOMMEN IN MEINEM BECKEN!', 3); Sound.play('boss'); },
  setup(e) {
    e.power = 0; e.fences = [];
    const bot = arenaBottom(), x1 = Math.round(1 + 0.25 * (G.w - 3)), x2 = Math.round(1 + 0.75 * (G.w - 3));
    for (const fy of [0.33, 0.68]) {
      const ty = Math.round(1 + fy * (bot - 2));
      e.fences.push({ x1: x1 * TS + 8, y1: ty * TS + 8, x2: x2 * TS + 8, y2: ty * TS + 8 });
    }
    for (const fx of [0.04, 0.96]) { const s = arenaSpotAt(fx, 0.5); if (s) { const o = spawnProp('b5_schalter', s[0], s[1]); o.suit = '#ffe14d'; } }
  },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
    if (e.power > 0) {
      e.power = Math.max(0, e.power - dt);
      if (e.power <= 0) { floatText(e.x, e.y - 34, 'STROM AUS', '#888888', true); }
      if (b5_live(e)) for (const q of G.players) if (q.alive && b5_onFence(e, q.x, q.y, q.r + 1)) killPlayer(e, 0, 'b5_zaun', q);
    }
    const zapNow = (e.power || 0) > 0 && e.mode !== 'zap' && e.mode !== 'stunned' && b5_onFence(e, e.x, e.y, e.r + 2);
    if (zapNow) b5_shockHai(e);
    switch (e.mode) {
      case 'walk': {
        e.a = turnTo(e.a, pa, 3 * dt);
        const ox = e.x, oy = e.y;
        bChase(e, p, (angry ? 56 : 46) * dt, dt, 34);
        // läuft nicht freiwillig in einen Zaun unter Strom
        if ((e.power || 0) > 0 && b5_onFence(e, e.x, e.y, e.r + 8) && !b5_onFence(e, ox, oy, e.r + 8)) {
          e.x = ox; e.y = oy; e.modeT -= dt;   // wird ungeduldig -> sprintet früher
          if (T - (e.balkT || -9) > 2.5) { e.balkT = T; say(e, pick(['HAHA! NICHT MIT MIR!', 'ICH SEH DEN STROM, LANDRATTE!', 'ZAUN? KENN ICH!']), 1.3); }
        }
        e.shootT -= dt;
        if (e.shootT <= 0 && sees) {
          e.shootT = angry ? 1.2 : 1.65; bFan(e, pa, angry ? 3 : 2, 0.3, 175, 'b5_harp', 'b5_harp'); Sound.play('throwIt');
          if (Math.random() < 0.3) say(e, pick(L_BOSS.hai), 1.3);
        }
        e.modeT -= dt;
        if (e.modeT <= 0) {
          e.attack = (e.attack + 1) % 3;
          if (e.attack !== 2 && sees) { e.mode = 'windup'; e.modeT = 0.8; say(e, 'HAI-SPRINT!', 0.9); Sound.play('boss_attack'); }
          else { e.mode = 'fish'; e.modeT = 1.4; e.burst = angry ? 7 : 5; e.shootT = 0.1; say(e, 'PIRANHAS! FÜTTERUNG!', 1.2); Sound.play('boss'); }
        }
        break;
      }
      case 'windup':   // roter Strich = Sprintrichtung
        e.a = turnTo(e.a, pa, 4 * dt); e.ca = e.a; e.modeT -= dt;
        if (e.modeT <= 0) { e.mode = 'charge'; e.modeT = 1.4; Sound.play('swoosh'); }
        break;
      case 'charge': {
        const want = (angry ? 320 : 285) * dt, m = moveEntity(e, Math.cos(e.ca) * want, Math.sin(e.ca) * want);
        e.walkT += dt * 2; e.modeT -= dt;
        for (const q of G.players) if (q.alive && q.invT <= 0 && dist(q.x, q.y, e.x, e.y) < e.r + q.r + 2) killPlayer(e, e.ca, 'hai', q);
        if ((e.power || 0) > 0 && b5_onFence(e, e.x, e.y, e.r + 2)) { b5_shockHai(e); break; }
        if (m < want * 0.4) { e.mode = 'dazed'; e.modeT = 1.1; shake(8); Sound.play('slam'); say(e, 'AUA! MEINE NASE!', 1.2); sparks(e.x + Math.cos(e.ca) * 12, e.y + Math.sin(e.ca) * 12, 10, '#bfefff'); }
        else if (e.modeT <= 0) b5_toWalk(e);
        break;
      }
      case 'dazed': e.modeT -= dt; if (e.modeT <= 0) b5_toWalk(e); break;
      case 'fish':
        e.a = turnTo(e.a, pa, 2 * dt); e.shootT -= dt;
        if (e.shootT <= 0 && e.burst > 0) { e.shootT = 0.2; e.burst--; b5_dropOn(36, 20, 1.05, 'fish'); }
        e.modeT -= dt; if (e.modeT <= 0 && e.burst <= 0) b5_toWalk(e);
        break;
      case 'zap':
        e.modeT -= dt; e.spinA += dt * 30;
        if (Math.random() < 0.3) sparks(e.x + rand(-8, 8), e.y + rand(-8, 8), 2, '#bfefff');
        if (e.modeT <= 0) { e.mode = 'stunned'; e.modeT = 3.6; e.power = 0; say(e, 'BLUBB... ALLES DREHT SICH...', 1.6); }
        break;
      case 'stunned':
        e.modeT -= dt;
        if (e.modeT <= 0) b5_toWalk(e, pick(['ICH BIN WIEDER GELADEN! HAHA!', 'DAFÜR GEHST DU KIELHOLEN!', 'JETZT WIRD ZURÜCKGEBISSEN!']));
        break;
      default: b5_toWalk(e);
    }
    if (e.mode !== 'zap') bTouch(e, p, pa, pd, 'hai');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'MATROSEN! ENTERT IHN!', 2); spawnMinions('U', 2); }
  },
  draw(g, e) {
    if (e.mode === 'zap') g.translate(Math.round(Math.sin(T * 90) * 2), 0);
    const s = Math.round(Math.sin(e.walkT * 10) * 3), bite = e.mode === 'charge' || e.mode === 'windup';
    g.fillStyle = '#111'; g.fillRect(-5 + s, -10, 7, 4); g.fillRect(-5 - s, 6, 7, 4);
    // Schwanzflosse hinten
    g.fillStyle = '#5a7a9a'; g.fillRect(-17, -5, 4, 3); g.fillRect(-17, 2, 4, 3); g.fillRect(-14, -2, 4, 4);
    // Kapitänsjacke
    pxEll(g, -1, 0, 11, 11, '#101a30'); pxEll(g, 0, 0, 10, 10, '#1a2a4a');
    g.fillStyle = '#ffd23f'; for (const [bx, by] of [[3, -4], [3, 3], [-1, -4], [-1, 3]]) g.fillRect(bx, by, 2, 2);
    g.fillRect(-3, -11, 6, 2); g.fillRect(-3, 9, 6, 2);   // Schulterklappen
    // Rückenflosse (ragt nach hinten raus)
    g.fillStyle = '#4a6a8a'; g.fillRect(-12, -1, 9, 3); g.fillRect(-10, -2, 5, 1); g.fillStyle = '#7a9ab8'; g.fillRect(-12, -1, 9, 1);
    // Arme + Harpune
    g.fillStyle = '#1a2a4a'; g.fillRect(2, 8, 7, 4); g.fillRect(2, -12, 7, 4);
    g.fillStyle = '#7a9ab8'; g.fillRect(9, 8, 3, 3); g.fillRect(9, -12, 3, 3);
    g.fillStyle = '#5a3a1a'; g.fillRect(8, 10, 8, 3); g.fillStyle = '#8a8a96'; g.fillRect(16, 10, 10, 2); g.fillStyle = '#d8d8e0'; g.fillRect(26, 9, 3, 4);
    // Hai-Kopf
    pxEll(g, 4, 0, 7, 6, '#5a7a9a'); pxEll(g, 6, 0, 6, 4, '#7a9ab8'); g.fillRect(10, -2, 4, 4);
    g.fillStyle = '#c8d8e8'; g.fillRect(8, -1, 6, 2);
    g.fillStyle = '#111'; g.fillRect(6, -5, 2, 2); g.fillRect(6, 3, 2, 2);
    g.fillStyle = '#fff'; for (let k = -3; k <= 2; k += 2) g.fillRect(bite ? 13 : 12, k, 2, 1);
    if (bite) { g.fillStyle = '#8a1a2a'; g.fillRect(11, -2, 2, 4); }
    // Kapitänsmütze
    pxEll(g, 0, 0, 5, 5, '#f4f4f4'); g.fillStyle = '#101a30'; g.fillRect(4, -4, 2, 8); g.fillStyle = '#ffd23f'; g.fillRect(-1, -1, 2, 2);
  },
  extra(g, e) {
    const live = b5_live(e), warm = (e.power || 0) > 0 && !live;
    for (const f of e.fences || []) {
      const len = Math.hypot(f.x2 - f.x1, f.y2 - f.y1), n = Math.max(2, Math.round(len / 32));
      for (let k = 0; k <= n; k++) { const x = Math.round(lerp(f.x1, f.x2, k / n)), y = Math.round(lerp(f.y1, f.y2, k / n)); g.fillStyle = '#3a3a44'; g.fillRect(x - 2, y - 4, 4, 8); g.fillStyle = live ? '#bfefff' : '#6a6a78'; g.fillRect(x - 1, y - 4, 2, 1); }
      for (const o of [-2, 1]) {
        g.strokeStyle = live ? `rgba(191,239,255,${0.6 + Math.random() * 0.4})` : warm && Math.floor(T * 20) % 2 ? '#7aa8c8' : '#4a4a58';
        g.lineWidth = 1; g.beginPath(); g.moveTo(f.x1, f.y1 + o); g.lineTo(f.x2, f.y2 + o); g.stroke();
      }
      if (live) {   // knisternde Blitze
        g.strokeStyle = '#ffffff'; g.beginPath(); let px = f.x1, py = f.y1; g.moveTo(px, py);
        for (let k = 1; k <= 12; k++) { px = lerp(f.x1, f.x2, k / 12); py = lerp(f.y1, f.y2, k / 12) + (k < 12 ? rand(-4, 4) : 0); g.lineTo(px, py); }
        g.stroke();
        g.fillStyle = 'rgba(120,200,255,0.12)'; g.fillRect(Math.min(f.x1, f.x2), f.y1 - 6, Math.abs(f.x2 - f.x1), 12);
      }
      txt(live ? 'STROM!' : 'ELEKTROZAUN', (f.x1 + f.x2) / 2, f.y1 - 14, { g, font: FS, align: 'center', color: live ? '#bfefff' : '#6a8aa8' });
    }
    if (e.mode === 'windup') {
      const len = beamLength(e.x, e.y, e.a);
      g.strokeStyle = `rgba(255,40,40,${0.45 + Math.sin(T * 40) * 0.35})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(e.a) * len, e.y + Math.sin(e.a) * len); g.stroke(); g.lineWidth = 1;
    }
  },
  hud(b) {
    const pw = b.power || 0;
    txt(pw > 0 ? 'STROM AN: ' + Math.ceil(pw) + ' S - LOCK IHN IN DEN ZAUN!' : 'STROM AUS - HAU AUF EINEN SCHALTER!', W / 2, 46, { font: FS, align: 'center', color: pw > 0 ? '#bfefff' : '#ffe14d' });
  },
};
BOSS_SETUP.hai = BOSS_EXT.hai.setup;
PROP_HIT.b5_schalter = (o, b, live) => {
  if (!live || b.btype !== 'hai') return;
  if (b.mode === 'zap' || b.mode === 'stunned') { if (T - (o.msgT || -9) > 1) { o.msgT = T; floatText(o.x, o.y - 16, 'ER ZAPPELT SCHON - DRAUF!', '#7dff7a', true); } return; }
  if ((b.power || 0) > 1) { o.cd = 0.5; floatText(o.x, o.y - 16, 'STROM IST SCHON AN!', '#bfefff', true); return; }
  b.power = b5_POWER; o.cd = 8; Sound.play('click'); Sound.play('b5_shock'); shake(4);
  floatText(o.x, o.y - 18, 'STROM AN!', '#bfefff');
  for (const f of b.fences || []) { sparks(f.x1, f.y1, 6, '#bfefff'); sparks(f.x2, f.y2, 6, '#bfefff'); }
  if (Math.random() < 0.6) say(b, pick(['HEY! WER SPIELT AM SICHERUNGSKASTEN?!', 'STROM? ICH BIN DOCH NICHT BLÖD!', 'DA LAUF ICH NICHT REIN!']), 1.4);
};
PROP_DRAW.b5_schalter = (g, o, x, y, off, blink) => {
  const b = b5_boss('hai'), on = b && (b.power || 0) > 0;
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 6, y - 6, 14, 16);
  g.fillStyle = '#3a3a44'; g.fillRect(x - 7, y - 8, 14, 16); g.fillStyle = '#ffd23f'; g.fillRect(x - 7, y - 8, 14, 2);
  g.fillStyle = '#111'; g.fillRect(x - 1, y - 3, 3, 1); g.fillRect(x - 2, y - 2, 3, 1); g.fillRect(x, y - 1, 3, 1); g.fillRect(x - 1, y, 3, 1);   // Blitz
  g.fillStyle = '#2a2a30'; g.fillRect(x - 4, y + 3, 8, 3); g.fillStyle = on ? '#7dff7a' : '#ff3b3b'; g.fillRect(on ? x + 1 : x - 4, y + 3, 3, 3);
  txt('STROM', x, y - 20, { g, font: FS, align: 'center', color: on ? '#bfefff' : '#ffe14d' });
  if (blink && !on) txt('!', x, y - 28, { g, font: FS, align: 'center', color: '#ffe14d' });
};

// =====================================================================
//  RHB-KLON 2.0 - Raumstation Saft-1
//  Spiegelt deine Bewegungen (steht immer gespiegelt auf der anderen Arena-Seite).
//  Trick: Während sein Laser läuft, sind die Kühlmodule offen -> eins zerstören -> Überhitzung.
// =====================================================================
const b5_OPEN = ['laserAim', 'laser', 'vent'];
const b5_isOpen = (b) => b5_OPEN.includes(b.mode);
BOSS_EXT.robo = {
  taunts: ['KOPIE SCHLÄGT ORIGINAL.', 'DU WURDEST GELÖSCHT. PRIVET.', 'STRG+Z GIBT ES NICHT, LIL.'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; e.heat = 0; say(e, 'PRIVET, LIL. ICH BIN RHB 2.0 - JETZT MIT 100% MEHR METALL!', 3); Sound.play('glitch'); Sound.play('boss'); },
  setup(e) {
    e.cool = [];
    for (const [fx, fy] of [[0.12, 0.25], [0.88, 0.25], [0.5, 0.82]]) {
      const s = arenaSpotAt(fx, fy);
      if (!s) continue;
      const o = spawnProp('b5_kuehl', s[0], s[1]); o.suit = '#3fd0ff';
      e.cool.push({ x: s[0], y: s[1], broken: 0 });
    }
  },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
    if (e.mode !== 'laser') e.heat = Math.max(0, (e.heat || 0) - dt * 0.4);
    switch (e.mode) {
      case 'walk': {   // Spiegel-Modus: geht dorthin, wo dein Spiegelbild steht
        const cx = G.w * TS / 2, tx = clamp(2 * cx - p.x, 24, G.w * TS - 24), ty = p.y;
        const m = moveToward(e, tx, ty, (angry ? 105 : 85) * dt);
        if (m > 0.2) e.walkT += dt;
        e.a = turnTo(e.a, pa, 5 * dt);
        e.shootT -= dt;
        if (e.shootT <= 0 && sees) {
          e.shootT = angry ? 0.95 : 1.3; bFan(e, pa, angry ? 3 : 2, 0.22, 190, 'b5_bit', 'b5_bit'); Sound.play('zap');
          if (Math.random() < 0.25) say(e, pick(L_BOSS.robo), 1.3);
        }
        e.modeT -= dt;
        if (e.modeT <= 0) {
          e.attack = (e.attack + 1) % 3;
          if (e.attack !== 1) { e.mode = 'laserAim'; e.modeT = 1.1; e.beamA = pa + Math.PI / 2; e.spinDir = Math.random() < 0.5 ? -1 : 1; say(e, 'LASER.EXE WIRD GELADEN...', 1.1); Sound.play('boss_attack'); }
          else { e.mode = 'sats'; e.modeT = 1.5; e.burst = angry ? 7 : 5; e.shootT = 0.1; say(e, 'SATELLITEN-UPDATE!', 1.2); Sound.play('boss'); }
        }
        break;
      }
      case 'laserAim':
        e.modeT -= dt; e.beamA += e.spinDir * 0.3 * dt;
        if (e.modeT <= 0) { e.mode = 'laser'; e.modeT = 2.4; Sound.play('boss_laser'); }
        break;
      case 'laser':
        e.modeT -= dt; e.beamA += e.spinDir * (angry ? 1.35 : 1.05) * dt; e.heat = Math.min(1, (e.heat || 0) + dt * 0.45); e.a = e.beamA;
        if (Math.random() < 0.08) Sound.play('boss_laser');
        for (let k = 0; k < 2; k++) {
          const a = e.beamA + k * Math.PI;
          for (const q of G.players) if (q.alive && beamHits(e.x, e.y, a, q.x, q.y, q.r + 2)) killPlayer(e, a, 'b5_laser', q);
        }
        if (e.modeT <= 0) { e.mode = 'vent'; e.modeT = 0.7; say(e, 'KÜHLUNG... PFFFFF...', 1); }
        break;
      case 'vent': e.modeT -= dt; if (Math.random() < 0.4) sparks(e.x + rand(-6, 6), e.y + rand(-6, 6), 1, '#e8f4ff'); if (e.modeT <= 0) b5_toWalk(e); break;
      case 'sats':
        e.shootT -= dt;
        if (e.shootT <= 0 && e.burst > 0) { e.shootT = 0.22; e.burst--; b5_dropOn(34, 24, 1.2, 'sat'); Sound.play('zap'); }
        e.modeT -= dt; if (e.modeT <= 0 && e.burst <= 0) b5_toWalk(e);
        break;
      case 'stunned':
        e.modeT -= dt; e.heat = 1;
        if (Math.random() < 0.15) sparks(e.x + rand(-8, 8), e.y + rand(-8, 8), 2, pick(['#3fd0ff', '#ff3b3b', '#ffffff']));
        if (e.modeT <= 0) {
          for (const c of e.cool || []) if (c.broken) { c.broken = 0; sparks(c.x, c.y, 10, '#3fd0ff'); floatText(c.x, c.y - 18, 'NEU GEDRUCKT!', '#3fd0ff', true); }
          b5_toWalk(e, pick(['NEUSTART ABGESCHLOSSEN. JETZT MIT MEHR WUT.', 'KÜHLMODUL NACHGEDRUCKT. 3D-DRUCKER SEI DANK.', 'FEHLER BEHOBEN: DU.']));
        }
        break;
      default: b5_toWalk(e);
    }
    bTouch(e, p, pa, pd, 'robo');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'DROHNEN.EXE! ANGRIFF!', 2); spawnMinions('Q', 2); }
  },
  draw(g, e) {
    const heat = e.heat || 0, st = e.mode === 'stunned', s = Math.round(Math.sin(e.walkT * 10) * 3);
    const glow = st ? (Math.floor(T * 8) % 2 ? '#ff3b3b' : '#333') : heat > 0.6 ? '#ff6a3a' : '#3fd0ff';
    g.fillStyle = '#2a2a33'; g.fillRect(-4 + s, -10, 7, 4); g.fillRect(-4 - s, 6, 7, 4);
    pxEll(g, -1, 0, 9, 11, '#4a4a58'); pxEll(g, 0, 0, 8, 10, '#9a9aaa');           // Chrom-Hoodie
    g.fillStyle = '#7a7a8a'; g.fillRect(-2, -9, 4, 18);
    g.fillStyle = '#c8c8d8'; g.fillRect(-6, -7, 2, 2); g.fillRect(-6, 5, 2, 2);
    // Kühlrippen am Rücken (glühen bei Hitze)
    g.fillStyle = heat > 0.5 ? `rgb(${150 + Math.round(heat * 100)},70,40)` : '#5a5a68';
    g.fillRect(-11, -6, 2, 3); g.fillRect(-11, -1, 2, 3); g.fillRect(-11, 4, 2, 3);
    g.fillStyle = '#2a2a2a'; g.fillRect(6, -7, 8, 14); g.fillStyle = glow; g.fillRect(7, -6, 6, 12);   // Laptop wie das Original
    g.fillStyle = '#9a9aaa'; g.fillRect(3, -10, 5, 3); g.fillRect(3, 7, 5, 3);
    pxEll(g, 0, 0, 7, 7, '#5a5a68'); pxEll(g, 0, 0, 6, 6, '#b8b8c8'); pxEll(g, -1, -1, 3, 3, '#e0e0ec');   // Chrom-Kopf
    g.fillStyle = glow; g.fillRect(4, -4, 2, 8);                                     // Visier
    g.fillStyle = '#5a5a68'; g.fillRect(-3, -8, 1, 3); g.fillStyle = Math.floor(T * 3) % 2 ? '#ff3b3b' : '#7a2020'; g.fillRect(-3, -9, 1, 1);   // Antenne
  },
  extra(g, e) {
    if (e.mode === 'laserAim' || e.mode === 'laser') {
      for (let k = 0; k < 2; k++) {
        const a = (e.beamA || 0) + k * Math.PI, len = beamLength(e.x, e.y, a), x2 = e.x + Math.cos(a) * len, y2 = e.y + Math.sin(a) * len;
        if (e.mode === 'laserAim') { g.strokeStyle = `rgba(255,40,60,${0.35 + Math.sin(T * 40) * 0.3})`; g.lineWidth = 1; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(x2, y2); g.stroke(); }
        else {
          g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(x2, y2); g.stroke();
          g.strokeStyle = '#3fd0ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(x2, y2); g.stroke(); g.lineWidth = 1;
        }
      }
    }
    // Spiegel-Achse (gestrichelt) - damit man den Trick sieht
    if (e.mode === 'walk') {
      const cx = G.w * TS / 2; g.strokeStyle = 'rgba(63,208,255,0.12)'; g.setLineDash([3, 5]); g.beginPath(); g.moveTo(cx, 16); g.lineTo(cx, arenaBottom() * TS); g.stroke(); g.setLineDash([]);
    }
  },
  post(g, e) {
    if (e.mode === 'laserAim' || e.mode === 'laser' || e.mode === 'vent') {
      if (Math.floor(T * 4) % 2) txt('KÜHLUNG OFFEN!', e.x, e.y - 30, { g, font: FS, align: 'center', color: '#7dff7a' });
    }
    if (e.heat > 0.05 && e.mode !== 'stunned') {
      const x = Math.round(e.x) - 12, y = Math.round(e.y) - 22;
      g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, 26, 4); g.fillStyle = e.heat > 0.7 ? '#ff3b3b' : '#ff9a3a'; g.fillRect(x, y, Math.round(24 * e.heat), 2);
    }
  },
  hud(b) {
    const open = b5_isOpen(b);
    txt(open ? 'KÜHLMODULE OFFEN - JETZT EINS ZERSTÖREN!' : 'KÜHLMODULE GESCHLOSSEN - WARTE AUF SEINEN LASER', W / 2, 46, { font: FS, align: 'center', color: open ? '#7dff7a' : '#3fd0ff' });
  },
};
BOSS_SETUP.robo = BOSS_EXT.robo.setup;
PROP_HIT.b5_kuehl = (o, b, live, stun) => {
  if (!live || b.btype !== 'robo') return;
  const i = b5_nearest(b.cool, o.x, o.y), c = b.cool && b.cool[i];
  if (!c) return;
  if (b.mode === 'stunned') { if (T - (o.msgT || -9) > 1) { o.msgT = T; floatText(o.x, o.y - 16, 'ER IST ÜBERHITZT - DRAUF!', '#7dff7a', true); } return; }
  if (c.broken) { o.cd = 0.5; floatText(o.x, o.y - 16, 'SCHON KAPUTT!', '#888888', true); return; }
  if (!b5_isOpen(b)) { o.cd = 0.6; sparks(o.x, o.y, 4, '#3fd0ff'); floatText(o.x, o.y - 16, 'GESCHLOSSEN! WARTE AUF SEINEN LASER!', '#3fd0ff', true); Sound.play('armor'); return; }
  c.broken = 1; o.cd = 1;
  Sound.play('explode'); Sound.play('glitch'); sparks(o.x, o.y, 18, '#3fd0ff'); sparks(o.x, o.y, 8, '#ffffff');
  floatText(o.x, o.y - 18, 'KÜHLMODUL ZERSTÖRT!', '#7dff7a');
  stun(3.6, pick(['ÜBERHITZUNG! ÜBERHITZUNG!', 'KERNTEMPERATUR: JA.', 'MEINE LÜFTER! NYET!']));
  b.heat = 1; G.flash = 0.1;
};
PROP_DRAW.b5_kuehl = (g, o, x, y, off, blink) => {
  const b = b5_boss('robo'), i = b ? b5_nearest(b.cool, o.x, o.y) : -1, c = i >= 0 ? b.cool[i] : { broken: 0 }, open = b && b5_isOpen(b);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 6, y - 6, 16, 16);
  g.fillStyle = c.broken ? '#2a2a30' : '#5a6a7a'; g.fillRect(x - 8, y - 8, 16, 16);
  g.fillStyle = c.broken ? '#1a1a1a' : '#8a9aaa'; g.fillRect(x - 8, y - 8, 16, 2);
  pxEll(g, x, y + 1, 5, 5, '#1a2028');
  if (!c.broken) {   // drehender Lüfter
    const a = T * (open ? 25 : 8); g.fillStyle = '#9adfff';
    for (let k = 0; k < 3; k++) { const aa = a + k * TAU / 3; g.fillRect(Math.round(x + Math.cos(aa) * 3) - 1, Math.round(y + 1 + Math.sin(aa) * 3) - 1, 2, 2); }
  } else { g.fillStyle = '#ff6a1a'; if (Math.floor(T * 10) % 2) g.fillRect(x - 2, y - 1, 3, 3); g.fillStyle = 'rgba(90,90,100,0.5)'; g.fillRect(x - 3, y - 14 - Math.round((T * 10) % 6), 5, 5); }
  if (!c.broken && !open) { g.strokeStyle = 'rgba(63,208,255,0.6)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.stroke(); }
  txt(c.broken ? 'KAPUTT' : open ? 'OFFEN!' : 'KÜHLUNG', x, y - 20, { g, font: FS, align: 'center', color: c.broken ? '#888888' : open ? '#7dff7a' : '#3fd0ff' });
  if (open && !c.broken && blink) txt('!', x, y - 28, { g, font: FS, align: 'center', color: '#7dff7a' });
};

// =====================================================================
//  Fertige Boss-Etagen für die Level-Bauer (Arena oben, Tür-Reihe D, Gang, Startraum mit P)
//  Benutzung: floors: [ ..., S2_BOSS_FLOORS.koch ]  (theme kommt vom Level)
// =====================================================================
globalThis.S2_BOSS_FLOORS = globalThis.S2_BOSS_FLOORS || {};
S2_BOSS_FLOORS.koch = { name: 'DIE GROSSKÜCHE', boss: 'koch', map: [
  '########################################',
  '#$:::::::::::::::::::::::::::::::::::$:#',
  '#::TTTTTT::::::::::::::::::::::TTTTTT::#',
  '#::::::::::::::::::::::::::::::::::::::#',
  '#::::::::::::::::::::::::::::::::::::::#',
  '#:::::CC:::::::::::::::::::::::::CC::::#',
  '#:::::::::::::::::::B::::::::::::::::::#',
  '#::::::::::::::::::::::::::::::::::::::#',
  '#::TT::::::::::::::::::::::::::::::TT::#',
  '#::TT:::::::::::f::::::::::::::::::TT::#',
  '#::::::::::::::::::::::::::::::::::::::#',
  '#:::::CC:::::::::::::::::::::::::CC::::#',
  '#::::::::::::::::::::::::::::::::::::::#',
  '#::s:::::::::TTTT::::::TTTT::::::::::u:#',
  '#::::::::::::::::::::::::::::::::::::::#',
  '#:::::::::::::::::::X::::::::::::::::::#',
  '####################D###################',
  '                   #:#                  ',
  '                   #:#                  ',
  '             #######:#######            ',
  '             #:::::::::::::#            ',
  '             #::b:::P:::p::#            ',
  '             ###############            ',
] };
S2_BOSS_FLOORS.hai = { name: 'DAS HAIBECKEN', boss: 'hai', map: [
  '########################################',
  '#$....................................$#',
  '#..GGGGG........................GGGGG..#',
  '#..G~~~G........................G~~~G..#',
  '#..G~~~G...........B............G~~~G..#',
  '#..GGGGG........................GGGGG..#',
  '#......................................#',
  '#......CC......................CC......#',
  '#......................................#',
  '#......................................#',
  '#......CC......................CC......#',
  '#......................................#',
  '#..GGGGG........................GGGGG..#',
  '#..G~~~G.........4..............G~~~G..#',
  '#..GGGGG.............m..........GGGGG..#',
  '#...................X..................#',
  '####################D###################',
  '                   #.#                  ',
  '          ##########.#                  ',
  '          #..........#                  ',
  '          #.s..P.....#                  ',
  '          ############                  ',
] };
S2_BOSS_FLOORS.robo = { name: 'DIE ANDOCKSTATION', boss: 'robo', map: [
  '########################################',
  '#$------------------------------------$#',
  '#--II----------------------------II----#',
  '#--II----------------------------II----#',
  '#--------------------------------------#',
  '#-------CC----------B-----------CC-----#',
  '#--------------------------------------#',
  '#--------------------------------------#',
  '#----II--------------------------II----#',
  '#----II--------------------------II----#',
  '#--------------------------------------#',
  '#-------CC----------------------CC-----#',
  '#--------------------------------------#',
  '#--j-----------------------------g-----#',
  '#--------------------------------------#',
  '#-------------------X------------------#',
  '####################D###################',
  '                 ###-###                ',
  '                 #-----#                ',
  '                 #--P--#                ',
  '                 #-p-i-#                ',
  '                 #######                ',
] };
