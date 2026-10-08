'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Staffel 2: neue Gegnerarten (ENEMY_EXT)
//  & SAFT-NINJA   % PANZER-PAPA   @ SANITÄTER
//  ^ ZITRONEN-WERFER   ! SPIEGEL-MANN   ? GEISTER-HACKER
//  Alles Host-autoritär; Gäste sehen nur Standardfelder + netDyn [19],
//  Pfützen liegen als einfache Daten in G.hazards, Effekte über s2eFx (netFx).
// =====================================================================

SUITS['&'] = ['#17110c', '#ff9a1a'];   // Saft-Ninja: schwarz mit O-Saft-Gürtel
SUITS['%'] = ['#6a5a3a', '#c41f2a'];   // Panzer-Papa: Strickjacke, rotes Hemd
SUITS['@'] = ['#f2f2f2', '#e01b3c'];   // Sanitäter: weißer Kittel
SUITS['^'] = ['#e8d84a', '#3a8a2a'];   // Zitronen-Werfer: gelb
SUITS['!'] = ['#b8bcc8', '#ffffff'];   // Spiegel-Mann: Chrom
SUITS['?'] = ['#14181c', '#39ff7a'];   // Geister-Hacker: Hoodie

// Gegner-Waffen (nur für Gegner, kein Bodenbild)
Object.assign(WEAPONS, {
  s2e_defi: { name: 'DEFIBRILLATOR', enemyOnly: true, lethal: true, rate: 0.4, reach: 20, arc: 1.2, hitSfx: 'zap' },
  s2e_lemons: { name: 'ZITRONEN', ranged: true, enemyOnly: true, pellets: 1, eRate: 2, eSpread: 0, sfx: 'throwIt', speed: 200 },
});
Object.assign(CAUSE, { s2e_defi: 'DEFIBRILLATOR (DOKTOR SPIELEN)', s2e_lemon: 'ZITRONEN-SAFTBOMBE' });
WEAPON_DRAW.s2e_defi = (g) => {
  g.fillStyle = '#c41f2a'; g.fillRect(-7, -1, 6, 3);
  g.fillStyle = '#d0d0dc'; g.fillRect(-1, -3, 4, 7); g.fillStyle = '#ffe14d'; g.fillRect(3, -2, 1, 5);
  return true;
};
WEAPON_DRAW.s2e_lemons = (g) => { pxEll(g, 0, 0, 3, 2, '#ffe14d'); g.fillStyle = '#fff7a0'; g.fillRect(-1, -1, 2, 1); g.fillStyle = '#3a8a2a'; g.fillRect(-4, -2, 2, 1); return true; };

// ---------------------------------------------------------------------
//  Sounds
// ---------------------------------------------------------------------
Sound.addSfx('s2e_blink', () => { const { tone, noise, now } = Sound.synth, t = now();
  noise({ dur: 0.18, ft: 'bandpass', f: 900, f2: 4000, vol: 0.18, t }); tone({ type: 'sine', f: 300, f2: 1400, dur: 0.15, vol: 0.12, t }); });
Sound.addSfx('s2e_heal', () => { const { tone, now } = Sound.synth, t = now();
  tone({ type: 'square', f: 400, f2: 1600, dur: 0.35, vol: 0.08, t }); tone({ type: 'sawtooth', f: 90, dur: 0.12, vol: 0.2, t: t + 0.36 }); });
Sound.addSfx('s2e_mirror', () => { const { tone, now } = Sound.synth, t = now();
  for (let i = 0; i < 4; i++) tone({ type: 'triangle', f: 1200 + i * 300, dur: 0.06, vol: 0.07, t: t + i * 0.04 }); });
Sound.addSfx('s2e_lemon', () => { const { tone, noise, now } = Sound.synth, t = now();
  noise({ dur: 0.22, ft: 'lowpass', f: 1400, f2: 300, vol: 0.28, t }); tone({ type: 'sine', f: 220, f2: 90, dur: 0.18, vol: 0.18, t }); });
Sound.addSfx('s2e_crate', () => { const { tone, noise, now } = Sound.synth, t = now();
  noise({ dur: 0.25, ft: 'lowpass', f: 500, vol: 0.3, t }); tone({ type: 'square', f: 70, f2: 50, dur: 0.2, vol: 0.12, t }); });

// ---------------------------------------------------------------------
//  Helfer
// ---------------------------------------------------------------------
// Effekt lokal abspielen + an Online-Gäste schicken (netReplay ruft window[name] auf)
function s2eFx(name, ...a) {
  if (NET.mode === 'host' && NET.connected && NET.inLevel && !NET.fxDepth) netFx(name, a);
  NET.fxDepth++;
  try { window[name](...a); } finally { NET.fxDepth--; }
}
// unsichtbare Etagen-Mechanik für Pfützen + Langsam-Logik (wird bei Bedarf in G.mods gehängt)
function s2eTickOn() { if (G && G.mods && !G.mods.includes('s2e_tick')) G.mods.push('s2e_tick'); }
function s2eFreeAt(x, y) {
  for (const [dx, dy] of [[-4, -4], [4, -4], [-4, 4], [4, 4], [0, 0]]) {
    const tx = Math.floor((x + dx) / TS), ty = Math.floor((y + dy) / TS), c = T_(tx, ty);
    if (c === ' ' || c === 'D' || c === 'l' || G.solid[ty * G.w + tx]) return false;
  }
  return true;
}
function s2eDown(e) { return e.state === 'down' || e.state === 'confused'; }
// gemeinsamer Tod: winzige Chance auf die GOLDENE KLOBÜRSTE (weapons4.js)
function s2eDeath(e) {
  if (WEAPONS.w4_brush && Math.random() < 0.025) {
    spawnPickup(e.x, e.y, 'w4_brush', 0, rand(TAU), 70);
    floatText(e.x, e.y - 24, 'WAS GLÄNZT DA?!', '#ffe14d');
  }
}

// --- Effekte (laufen auch beim Gast über netReplay) ---
function s2eNinjaPuff(x, y) {
  Sound.play('s2e_blink');
  for (let i = 0; i < 16; i++) { const a = rand(TAU), sp = rand(30, 140); G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.15, 0.4), col: pick(['#ff9a1a', '#ffd23f', '#2a1a10']), s: pick([1, 2]), kind: 's2e', fric: 5 }); }
}
function s2eHealFx(x, y) {
  Sound.play('s2e_heal');
  for (let i = 0; i < 12; i++) G.parts.push({ x: x + rand(-6, 6), y: y + rand(-4, 4), vx: rand(-15, 15), vy: rand(-70, -30), life: rand(0.4, 0.8), col: pick(['#7dff7a', '#ffffff', '#e01b3c']), s: 2, kind: 's2e', fric: 2 });
}
function s2eMirrorFx(x, y) {
  Sound.play('s2e_mirror');
  for (let i = 0; i < 10; i++) { const a = rand(TAU); G.parts.push({ x: x + Math.cos(a) * 8, y: y + Math.sin(a) * 8, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: rand(0.2, 0.5), col: pick(['#ffffff', '#bfe6ff', '#d8dce8']), s: 1, kind: 's2e', fric: 4 }); }
}
function s2eLemonFx(x, y) {
  Sound.play('s2e_lemon'); shake(3);
  for (let i = 0; i < 22; i++) { const a = rand(TAU), sp = rand(30, 150); G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.15, 0.45), col: pick(['#ffe14d', '#fff7a0', '#d8c020']), s: pick([1, 2, 2]), kind: 'blood', fric: 7 }); }
}
// Kiste um ein Feld schieben (Host + Gast, idempotent)
function s2eCrateMove(from, to) {
  if (!G || !G.tiles || G.tiles[from] !== 'C' || G.solid[to] || !FLOORS.includes(G.tiles[to])) return;
  const fx = from % G.w, fy = (from / G.w) | 0, tx = to % G.w, ty = (to / G.w) | 0;
  G.tiles[from] = G.under[from] || '.'; G.solid[from] = 0;
  G.tiles[to] = 'C'; G.solid[to] = 1;
  if (G.fg) { drawFloorTile(G.fg, G.tiles[from], fx, fy); drawCrate(G.fg, tx, ty); }
  Sound.play('s2e_crate');
  for (let i = 0; i < 8; i++) G.parts.push({ x: fx * TS + 8 + rand(-6, 6), y: fy * TS + 8 + rand(-6, 6), vx: rand(-30, 30), vy: rand(-30, 30), life: rand(0.2, 0.4), col: 'rgba(200,180,140,0.7)', s: 2, kind: 's2e', fric: 4 });
}

// ---------------------------------------------------------------------
//  Etagen-Ticker: Pfützen, Langsamkeit (nur Host; G.mods bekommt 's2e_tick')
// ---------------------------------------------------------------------
function s2eSlowBack(o, f) {   // Bewegung seit dem letzten Tick auf Faktor f kürzen
  if (o.s2ePx !== undefined && f < 1) {
    const dx = o.x - o.s2ePx, dy = o.y - o.s2ePy;
    if (dx * dx + dy * dy < 100) moveEntity(o, -dx * (1 - f), -dy * (1 - f));
  }
  o.s2ePx = o.x; o.s2ePy = o.y;
}
function s2eOnPuddle(x, y) {
  if (!G.hazards) return null;
  for (const h of G.hazards) if (h.kind === 's2e_pud' && !h.dead && (x - h.x) ** 2 + ((y - h.y) * 1.4) ** 2 < h.r * h.r) return h;
  return null;
}
FLOOR_MODS.s2e_tick = {
  name: '', hidden: true,
  update(dt) {
    if (G.hazards) {
      for (const h of G.hazards) if (h.kind === 's2e_pud') { h.t -= dt; if (h.t <= 0) h.dead = true; }
      G.hazards = G.hazards.filter((h) => !h.dead);
    }
    for (const e of G.enemies) {
      if (e.state === 'dead') continue;
      s2eSlowBack(e, e.kind === '%' && !(e.fling > 0) ? 0.62 : 1);
    }
    for (const p of G.players) {
      if (!p.alive) { p.s2ePx = undefined; continue; }
      if (p.nfx !== undefined) { p.s2ePx = undefined; continue; }   // Online-Gast bewegt sich selbst
      const h = s2eOnPuddle(p.x, p.y);
      s2eSlowBack(p, h ? 0.5 : 1);
      if (h && !p.s2eSticky) { p.s2eSticky = true; floatText(p.x, p.y - 18, 'IIIH, ZITRONENSAFT! KLEBT!', '#ffe14d', true); }
      else if (!h) p.s2eSticky = false;
    }
  },
};
HAZ_DRAW.s2e_pud = (g, h) => {
  const k = clamp(h.t / 1.5, 0, 1), x = Math.round(h.x), y = Math.round(h.y);
  g.globalAlpha = 0.75 * k;
  pxEll(g, x, y, Math.round(h.r), Math.round(h.r * 0.7), '#c8b020');
  pxEll(g, x - 2, y - 1, Math.round(h.r * 0.8), Math.round(h.r * 0.55), '#ffe14d');
  g.fillStyle = '#fff7a0';
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + x; g.fillRect(x + Math.round(Math.cos(a) * h.r * 0.5), y + Math.round(Math.sin(a) * h.r * 0.3 + Math.sin(T * 3 + i) * 1), 2, 1); }
  g.globalAlpha = 1;
  return true;
};

// ---------------------------------------------------------------------
//  & SAFT-NINJA: schnell, Katana, kündigt einen Sprung an und teleportiert neben dich
// ---------------------------------------------------------------------
function s2eNinjaBlink(e, p) {
  const pd = dist(e.x, e.y, p.x, p.y);
  for (let k = 0; k < 8; k++) {
    const a = Math.atan2(e.y - p.y, e.x - p.x) + rand(-1.1, 1.1), r = Math.min(pd - 4, rand(30, 42));
    const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (s2eFreeAt(x, y) && los(x, y, p.x, p.y) && los(e.x, e.y, x, y)) {
      s2eFx('s2eNinjaPuff', e.x, e.y);
      e.x = x; e.y = y; e.a = Math.atan2(p.y - y, p.x - x); e.path = null;
      s2eFx('s2eNinjaPuff', x, y);
      e.s2eFx = 1;
      return true;
    }
  }
  return false;
}
ENEMY_EXT['&'] = {
  name: 'SAFT-NINJA',
  make(e, D) { e.weapon = 'katana'; e.s2eBl = rand(0.8, 1.6); e.s2eCh = 0; e.s2eFx = 0; s2eTickOn(); },
  update(e, dt) {
    e.s2eBl -= dt; e.s2eFx = Math.max(0, e.s2eFx - dt * 2.5);
    if (s2eDown(e)) { e.s2eCh = 0; return false; }
    const p = targetOf(e);
    if (e.s2eCh > 0) {   // Ansage: steht still, leuchtet orange
      e.s2eCh -= dt; e.target = p;
      e.a = turnTo(e.a, Math.atan2(p.y - e.y, p.x - e.x), 8 * dt);
      if (e.s2eCh <= 0) { if (p.alive) s2eNinjaBlink(e, p); e.s2eBl = lerp(3, 1.8, dd()) * rand(0.9, 1.2); }
      return true;
    }
    if (e.state === 'alert' && p && p.alive) {
      const pd = dist(e.x, e.y, p.x, p.y);
      if (e.s2eBl <= 0 && pd > 60 && pd < 200 && e.windup <= 0 && los(e.x, e.y, p.x, p.y)) {
        e.s2eCh = 0.38; e.s2eFx = 1; say(e, pick(['HAI!', 'SAFT-JUTSU!', 'NINJA-SPRUNG!', 'SHURI-SAFT!']), 0.8);
        return true;
      }
      if (pd > 14 && e.windup <= 0) { moveToward(e, p.x, p.y, 38 * dt); e.walkT += dt; }   // schneller als normal
    }
    return false;
  },
  bullet(e, b, ang) {   // weicht aus, wenn der Sprung bereit ist
    if (s2eDown(e) || e.s2eBl > 0 || b.kind === 'flame') return false;
    for (const s of [1, -1]) {
      const x = e.x + Math.cos(ang + s * Math.PI / 2) * 20, y = e.y + Math.sin(ang + s * Math.PI / 2) * 20;
      if (s2eFreeAt(x, y) && los(e.x, e.y, x, y)) {
        s2eFx('s2eNinjaPuff', e.x, e.y); e.x = x; e.y = y; e.s2eFx = 1; e.s2eBl = 2.2;
        floatText(e.x, e.y - 14, 'ZU LANGSAM!', '#ff9a1a', true);
        if (e.state !== 'alert') { e.state = 'alert'; e.alerted = true; e.spot = 1; e.reaction = 0.15; }
        return true;
      }
    }
    return false;
  },
  overlay(g, e) {
    pxEll(g, 0, 0, 4, 4, '#17110c');
    g.fillStyle = '#ff9a1a'; g.fillRect(-4, -1, 8, 2); g.fillRect(-7, -3, 3, 1); g.fillRect(-7, 2, 3, 1);   // Stirnband mit Bändern
    g.fillStyle = e.skin || '#f0c8a0'; g.fillRect(2, -1, 2, 2);
    if (e.s2eFx > 0) {
      g.globalAlpha = clamp(e.s2eFx, 0, 1) * 0.6; g.strokeStyle = '#ff9a1a'; g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, 7 + (1 - e.s2eFx) * 5, 0, TAU); g.stroke(); g.globalAlpha = 1;
    }
  },
  onDeath(e) { s2eDeath(e); },
  netDyn: (e) => Math.round(clamp(e.s2eFx || 0, 0, 1) * 100), netApply: (e, v) => { e.s2eFx = v / 100; },
  score: 1.3,
};

// ---------------------------------------------------------------------
//  % PANZER-PAPA: 3 Treffer, langsam, schiebt Kisten, lacht über Fäuste
// ---------------------------------------------------------------------
ENEMY_EXT['%'] = {
  name: 'PANZER-PAPA',
  make(e, D) { e.hp = 3; e.r = 7; e.weapon = 'shotgun'; e.s2ePush = 0; s2eTickOn(); },
  update(e, dt) {
    e.s2ePush -= dt;
    if (s2eDown(e) || (e.state !== 'alert' && e.state !== 'search')) return false;
    const p = e.state === 'alert' ? targetOf(e) : e.lastSeen; if (!p || p.alive === false) return false;
    const dx = p.x - e.x, dy = p.y - e.y, pd = Math.hypot(dx, dy);
    if (e.state === 'alert' && pd > 40) { moveToward(e, p.x, p.y, 34 * dt); e.walkT += dt; }
    if (e.s2ePush <= 0 && pd > 24) {   // Kiste im Weg? wegschieben!
      const hx = Math.abs(dx) > Math.abs(dy), sx = hx ? Math.sign(dx) : 0, sy = hx ? 0 : Math.sign(dy);
      const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS), ax = tx + sx, ay = ty + sy, bx = ax + sx, by = ay + sy;
      const along = hx ? Math.abs(ax * TS + 8 - e.x) : Math.abs(ay * TS + 8 - e.y);
      if (T_(ax, ay) === 'C' && along < 18 && FLOORS.includes(T_(bx, by)) && !G.solid[by * G.w + bx]) {
        const cx = bx * TS + 8, cy = by * TS + 8;
        const busy = G.players.some((q) => q.alive && dist(q.x, q.y, cx, cy) < 12) || G.enemies.some((q) => q !== e && q.state !== 'dead' && dist(q.x, q.y, cx, cy) < 12);
        if (!busy) {
          s2eFx('s2eCrateMove', ay * G.w + ax, by * G.w + bx);
          e.s2ePush = 0.7;
          if (Math.random() < 0.5) say(e, pick(['PAPA RÄUMT AUF!', 'WER HAT DAS HIER HINGESTELLT?!', 'IN MEINEM HAUS NICHT!']), 1.2);
        }
      }
    }
    return false;
  },
  melee(e, w, ang, p) {
    const lethal = w.lethal || (w === FISTS && hasMask(p, 'baka'));
    if (!lethal && !w.fling) {
      floatText(e.x, e.y - 18, pick(['PAPA LACHT NUR.', 'HAT DAS GEKITZELT?', 'NICHT MIT DEM GESICHT!']), '#ffffff', true);
      if (e.state !== 'alert') { e.state = 'alert'; e.alerted = true; e.reaction = 0.1; e.spot = 1; }
      return true;
    }
    if (w.fling) moveEntity(e, Math.cos(ang) * 8, Math.sin(ang) * 8);
    hurtEnemy(e, 1, 'melee', ang);
    return true;
  },
  draw(g, e) {
    if (e.state === 'down') return false;
    const x = Math.round(e.x), y = Math.round(e.y);
    g.save(); g.translate(x, y); g.scale(1.35, 1.35); g.translate(-x, -y);
    drawHuman(g, e);
    g.restore();
    return true;
  },
  overlay(g, e) {
    g.fillStyle = e.shirt || '#c41f2a'; g.fillRect(1, -3, 2, 6);   // Bauch spannt das Hemd
    pxEll(g, 0, 0, 4, 4, e.skin || '#f0c8a0');      // Glatze
    g.fillStyle = '#5a3a1a'; g.fillRect(-4, -3, 2, 6);  // Haarkranz
    g.fillStyle = '#3a2410'; g.fillRect(3, -3, 2, 6);   // Schnurrbart
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-1, -2, 2, 1);
  },
  drawCorpse(g, e, ang) {
    g.save(); g.translate(Math.round(e.x), Math.round(e.y)); g.rotate(ang); g.scale(1.35, 1.35);
    drawLyingBody(g, e); g.restore();
    return true;
  },
  onDeath(e) { s2eDeath(e); if (Math.random() < 0.6) floatText(e.x, e.y + 14, pick(['SAG MAMA, DER GRILL IST NOCH AN...', 'ICH BIN NICHT WÜTEND. NUR ENTTÄUSCHT.']), '#ffffff', true); },
  noKnock: true,
  score: 2,
};

// ---------------------------------------------------------------------
//  @ SANITÄTER: rennt zu umgefallenen Gegnern und stellt sie wieder auf
// ---------------------------------------------------------------------
function s2eFindPatient(e) {
  let best = null, bd = e.alerted ? 340 : 190;
  for (const q of G.enemies) {
    if (q === e || q.state !== 'down' || q.kind === 'B' || q.static) continue;
    if (G.players.some((p) => p.alive && (p.execT > 0 || dist(p.x, p.y, q.x, q.y) < 16))) continue;   // Spieler steht drauf
    const d = dist(e.x, e.y, q.x, q.y);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
ENEMY_EXT['@'] = {
  name: 'SANITÄTER',
  make(e, D) { e.weapon = 's2e_defi'; e.s2eHeal = 0; e.s2eScan = rand(0.2, 0.5); e.s2ePat = null; s2eTickOn(); },
  update(e, dt) {
    if (s2eDown(e)) { e.s2eHeal = 0; e.s2ePat = null; return false; }
    e.s2eScan -= dt;
    if (e.s2eScan <= 0) { e.s2eScan = 0.4; const q = s2eFindPatient(e); if (q !== e.s2ePat) { e.s2ePat = q; e.path = null; e.pathT = 0; if (q) say(e, pick(['KEINE PANIK, ICH BIN ARZT!', 'SANI KOMMT!', 'HALT DURCH, KOLLEGE!']), 1.2); } }
    const q = e.s2ePat;
    if (!q || q.state !== 'down') { e.s2ePat = null; e.s2eHeal = 0; return false; }
    const d = dist(e.x, e.y, q.x, q.y), D = dd();
    if (d > 11) {
      e.s2eHeal = 0;
      e.pathT -= dt;
      if (e.pathT <= 0 || !e.path) { e.pathT = 0.5; e.path = findPath(e.x, e.y, q.x, q.y); }
      if (!e.path || followPath(e, (92 + 22 * D) * dt, dt)) { moveToward(e, q.x, q.y, (92 + 22 * D) * dt); e.a = Math.atan2(q.y - e.y, q.x - e.x); e.walkT += dt; }
      return true;
    }
    e.a = turnTo(e.a, Math.atan2(q.y - e.y, q.x - e.x), 8 * dt);
    e.s2eHeal += dt;
    if (e.s2eHeal >= 0.85) {
      const p = targetOf(q);
      q.state = 'search'; q.alerted = true; q.downT = 0; q.pathT = 0; q.lookT = 0; q.lastSeen = p ? { x: p.x, y: p.y } : null;
      say(q, pick(['DANKE, DOC!', 'ICH LEBE!', 'NOCH EINE RUNDE!', 'WIE NEU!']), 1.4);
      say(e, pick(['PFLASTER DRAUF!', 'STEH AUF, DU MEMME!', 'DIE KRANKENKASSE ZAHLT!', 'GEHEILT!']), 1.4);
      s2eFx('s2eHealFx', q.x, q.y);
      e.s2eHeal = 0; e.s2ePat = null; e.s2eScan = 0.6;
    }
    return true;
  },
  overlay(g, e) {
    pxEll(g, 0, 0, 4, 4, '#ffffff');                       // Haube
    g.fillStyle = '#e01b3c'; g.fillRect(-2, -1, 3, 1); g.fillRect(-1, -2, 1, 3);   // Kreuz auf der Haube
    g.fillStyle = e.skin || '#f0c8a0'; g.fillRect(2, -2, 2, 4);
    g.fillStyle = '#7dd0ff'; g.fillRect(3, -2, 1, 4);      // Mundschutz
    if (e.s2eHeal > 0) {   // Defi lädt
      g.strokeStyle = Math.floor(T * 20) % 2 ? '#bfffff' : '#ffffff'; g.lineWidth = 1; g.beginPath();
      g.moveTo(8, -3); g.lineTo(11, 0); g.lineTo(9, 1); g.lineTo(13, 4); g.stroke();
    }
  },
  onDeath(e) { s2eDeath(e); },
  netDyn: (e) => Math.round(clamp(e.s2eHeal || 0, 0, 1) * 100), netApply: (e, v) => { e.s2eHeal = v / 100; },
  score: 1.2,
};

// ---------------------------------------------------------------------
//  ^ ZITRONEN-WERFER: wirft Saftbomben im Bogen (Landestelle markiert), Pfützen kleben
// ---------------------------------------------------------------------
// Bogenflug: Kugel gehört formal dem Spieler (trifft unterwegs niemanden), Wirkung erst bei der Landung
function s2eThrowLemon(e, p) {
  const lead = 0.35, tx0 = p.x + (p.vx || 0) * lead, ty0 = p.y + (p.vy || 0) * lead;
  let a = Math.atan2(ty0 - e.y, tx0 - e.x), d = Math.min(dist(e.x, e.y, tx0, ty0), 260);
  a += rand(-0.06, 0.06) * (1.2 - dd()); d *= rand(0.94, 1.06);
  const Tf = clamp(d / 190, 0.45, 1.2);
  const sx = e.x + Math.cos(a) * 6, sy = e.y + Math.sin(a) * 6;
  spawnBullet(sx, sy, a, Math.max(10, d - 6) / Tf, 'player', e, 's2e_lemon', 's2e_lemon');
  const b = G.bullets[G.bullets.length - 1];
  b.life = Tf; b.pierce = true; b.s2eLob = 1;
  Sound.play('throwIt'); e.recoil = 2;
}
function s2eLemonLand(b, x, y) {
  if (b.w4Ret && typeof juiceSplash === 'function') { juiceSplash(x, y); floatText(x, y - 14, 'ZURÜCK ZUM ABSENDER!', 'rainbow'); }
  else {
    s2eFx('s2eLemonFx', x, y);
    for (const p of G.players) if (p.alive && dist(p.x, p.y, x, y) < 14) killPlayer(b.src && b.src.state !== undefined ? b.src : null, Math.atan2(p.y - y, p.x - x), 's2e_lemon', p);
  }
  (G.hazards = G.hazards || []).push({ kind: 's2e_pud', x: Math.round(x), y: Math.round(y), r: 19, t: 7 });
  withDecal(x, y, 14, (g) => { pxEll(g, x, y, 5, 3, '#d8c020'); pxEll(g, x + 2, y - 1, 2, 1, '#ffe14d'); });
  s2eTickOn();
}
BULLET_KINDS.s2e_lemon = { noCasing: true, life: 1, hit: () => true, impact: (b, x, y) => s2eLemonLand(b, x, y) };
BULLET_DRAW.s2e_lemon = (g, b) => {
  const sp = Math.hypot(b.vx, b.vy), trav = dist(b.sx, b.sy, b.x, b.y), rest = sp * Math.max(0, b.life);
  const prog = trav / Math.max(1, trav + rest), h = Math.sin(prog * Math.PI) * (10 + (trav + rest) * 0.08);
  const x = Math.round(b.x), y = Math.round(b.y);
  // Landestelle
  const lx = Math.round(b.x + b.vx * Math.max(0, b.life)), ly = Math.round(b.y + b.vy * Math.max(0, b.life));
  g.strokeStyle = `rgba(255,225,60,${0.35 + 0.35 * Math.sin(T * 18)})`; g.lineWidth = 1;
  g.beginPath(); g.arc(lx, ly, 6 + 4 * (1 - prog), 0, TAU); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 2, y - 1, 4, 2);
  g.save(); g.translate(x, Math.round(y - h)); g.rotate(T * 10 + b.sx);
  pxEll(g, 0, 0, 3, 2, '#ffe14d'); g.fillStyle = '#3a8a2a'; g.fillRect(-4, -1, 2, 1); g.fillStyle = '#fff7a0'; g.fillRect(-1, -1, 1, 1);
  g.restore();
  return true;
};
ENEMY_EXT['^'] = {
  name: 'ZITRONEN-WERFER',
  make(e, D) { e.weapon = 's2e_lemons'; e.s2eArm = 0; e.cd = rand(0.6, 1.2); s2eTickOn(); },
  update(e, dt) {
    if (e.state !== 'alert') { e.s2eArm = 0; return false; }   // Wache, Suche, Umfallen: Standard
    const p = targetOf(e), D = dd(); e.target = p;
    if (!p || !p.alive || !canSee(e, 340, 2.4, p)) { e.state = 'search'; e.pathT = 0; e.lookT = 0; e.s2eArm = 0; return true; }
    e.lastSeen = { x: p.x, y: p.y };
    const pd = dist(e.x, e.y, p.x, p.y), pa = Math.atan2(p.y - e.y, p.x - e.x);
    e.a = turnTo(e.a, pa, 6 * dt);
    if (e.s2eArm <= 0) {
      const sp = (60 + 12 * D) * dt;
      if (pd < 85) { moveToward(e, e.x - (p.x - e.x), e.y - (p.y - e.y), sp); e.walkT += dt; }
      else if (pd > 230) { moveToward(e, p.x, p.y, sp); e.walkT += dt; }
    }
    e.reaction -= dt;
    if (e.s2eArm > 0) {
      e.s2eArm += dt;
      if (e.s2eArm >= 0.45) { s2eThrowLemon(e, p); e.s2eArm = 0; e.cd = lerp(2.3, 1.4, D) * rand(0.9, 1.2) * (save.hard ? 0.85 : 1); }
    } else if (e.cd <= 0 && e.reaction <= 0 && Math.abs(angDiff(e.a, pa)) < 0.5) {
      e.s2eArm = 0.001;
      if (Math.random() < 0.3) say(e, pick(['FRISCH GEPRESST!', 'VITAMIN C!', 'SAUER MACHT LUSTIG!', 'ZITRONE KOMMT!']), 1);
    }
    beltPush(e, dt);
    return true;
  },
  overlay(g, e) {
    pxEll(g, 0, 0, 4, 4, '#ffe14d'); g.fillStyle = '#d8c020'; g.fillRect(-4, -1, 1, 2);   // Zitronen-Mütze
    g.fillStyle = '#3a8a2a'; g.fillRect(-1, -6, 2, 2); g.fillRect(1, -7, 2, 1);
    g.fillStyle = e.skin || '#f0c8a0'; g.fillRect(2, -2, 2, 4);
    if (e.s2eArm > 0) { pxEll(g, -4, -8, 3, 2, '#ffe14d'); g.fillStyle = '#3a8a2a'; g.fillRect(-7, -9, 2, 1); }   // ausholen
  },
  onDeath(e) { s2eDeath(e); },
  netDyn: (e) => (e.s2eArm > 0 ? 1 : 0), netApply: (e, v) => { e.s2eArm = v ? 1 : 0; },
  score: 1.2,
};

// ---------------------------------------------------------------------
//  ! SPIEGEL-MANN: kopiert die Waffe seines Ziels (die Kopie zerfällt beim Tod)
// ---------------------------------------------------------------------
function s2eMirrorId(p) {
  if (!p || !p.weapon) return null;
  const id = p.weapon.id, w = WEAPONS[id];
  if (!w || w.enemyOnly) return 'pistol';
  if (!w.ranged) return w.onHit ? 'bat' : id;
  if (w.special || w.onFire || w.noEnemy || w.spin || !w.pellets || !w.eRate) return 'magnum';
  return id;
}
ENEMY_EXT['!'] = {
  name: 'SPIEGEL-MANN',
  make(e, D) { e.weapon = 'pistol'; e.s2eCopyT = 0; e.s2eCopied = false; e.s2eShine = 0; s2eTickOn(); },
  update(e, dt) {
    e.s2eShine = Math.max(0, e.s2eShine - dt * 1.5);
    if (s2eDown(e) || e.state !== 'alert') return false;
    e.s2eCopyT -= dt;
    if (e.s2eCopyT <= 0) {
      e.s2eCopyT = 0.6;
      const p = e.target || targetOf(e), id = s2eMirrorId(p);
      if (p && p.alive && id !== e.weapon) {
        e.weapon = id; e.s2eCopied = true; e.s2eShine = 1; e.cd = Math.max(e.cd, 0.4); e.burst = 0;
        say(e, id ? pick(['KOPIERT: ', 'ICH AUCH: ', 'SPIEGEL SAGT: ']) + WEAPONS[id].name + '!' : 'FÄUSTE? KANN ICH AUCH!', 1.4);
        s2eFx('s2eMirrorFx', e.x, e.y);
      }
    }
    return false;
  },
  overlay(g, e) {
    pxEll(g, 0, 0, 4, 4, '#d8dce8');                    // Chromkopf
    g.fillStyle = '#ffffff'; g.fillRect(-2, -3, 1, 3); g.fillRect(-1, -3, 2, 1);
    g.fillStyle = '#7aa0e0'; g.fillRect(2, -3, 2, 6);   // Spiegel-Visier
    if (e.s2eShine > 0 && Math.floor(T * 14) % 2) { g.fillStyle = '#ffffff'; g.fillRect(-6, -6, 2, 2); g.fillRect(4, 5, 2, 2); g.fillRect(-3, 6, 1, 1); }
  },
  onDeath(e) {
    const k = G.pickups[G.pickups.length - 1];   // die kopierte Waffe zerfällt
    if (e.s2eCopied && k && k.x === e.x && k.y === e.y) { G.pickups.pop(); sparks(e.x, e.y, 10, '#d8dce8'); floatText(e.x, e.y - 22, 'NUR EIN SPIEGELBILD!', '#bfe6ff', true); }
    s2eDeath(e);
  },
  netDyn: (e) => Math.round(clamp(e.s2eShine || 0, 0, 1) * 100), netApply: (e, v) => { e.s2eShine = v / 100; },
  score: 1.5,
};

// ---------------------------------------------------------------------
//  ? GEISTER-HACKER: fast unsichtbar, wenn er still steht; flimmert beim Laufen
// ---------------------------------------------------------------------
ENEMY_EXT['?'] = {
  name: 'GEISTER-HACKER',
  make(e, D) { e.weapon = 'pistol'; e.glasses = false; e.s2eTalk = rand(3, 6); s2eTickOn(); },
  update(e, dt) {
    if (e.state === 'alert') { e.s2eTalk -= dt; if (e.s2eTalk <= 0) { e.s2eTalk = rand(4, 7); say(e, pick(['ICH BIN GAR NICHT HIER.EXE', 'PING... PONG!', 'DU SIEHST MICH NICHT.', '404: HACKER NICHT GEFUNDEN']), 1.3); } }
    return false;
  },
  draw(g, e) {   // läuft beim Host und beim Gast (nur Standardfelder + eigene Zeichen-Felder)
    if (e.state === 'down') return false;
    const mv = e.s2eLx === undefined ? 0 : Math.hypot(e.x - e.s2eLx, e.y - e.s2eLy);
    e.s2eLx = e.x; e.s2eLy = e.y;
    e.s2eMv = mv > 0.05 ? 14 : (e.s2eMv || 0) - 1;
    const loud = e.recoil > 0.3 || e.flash > 0 || e.windup > 0 || e.swingT > 0 || e.sayT > 1.1;
    const want = loud ? 0.95 : e.s2eMv > 0 ? 0.4 : 0.05;
    e.s2eVis = (e.s2eVis === undefined ? want : e.s2eVis) + (want - (e.s2eVis === undefined ? want : e.s2eVis)) * 0.2;
    g.save();
    g.globalAlpha = e.s2eVis;
    drawHuman(g, e);
    if (e.s2eMv > 0 && Math.random() < 0.5) {   // Glitch-Kopie
      g.globalAlpha = e.s2eVis * 0.5; g.translate(Math.round(rand(-3, 3)), 0); drawHuman(g, e);
    }
    g.restore();
    // grünes Augenglimmen bleibt immer ein bisschen sichtbar (fair bleiben)
    const ex = e.x + Math.cos(e.a) * 3, ey = e.y + Math.sin(e.a) * 3, px = -Math.sin(e.a) * 1.5, py = Math.cos(e.a) * 1.5;
    g.fillStyle = `rgba(57,255,122,${0.35 + 0.25 * Math.sin(T * 6 + e.x)})`;
    g.fillRect(Math.round(ex + px), Math.round(ey + py), 1, 1); g.fillRect(Math.round(ex - px), Math.round(ey - py), 1, 1);
    return true;
  },
  overlay(g, e) {
    pxEll(g, -1, 0, 4, 4, '#0c0f12');   // Kapuze
    g.fillStyle = '#39ff7a'; g.fillRect(2, -2, 2, 4);
    g.fillStyle = '#1e5a32'; g.fillRect(-3, -5, 1, 3); g.fillRect(-1, 4, 1, 2);
  },
  onDeath(e) { s2eDeath(e); floatText(e.x, e.y + 14, 'VERBINDUNG GETRENNT.', '#39ff7a', true); },
  score: 1.5,
};
