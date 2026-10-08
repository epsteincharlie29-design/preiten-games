'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - STAFFEL 2: Etagen-Mods, Teil 2
//  hostage, blackout, zerog, rewind, strobe, escort   (Präfix s2m2_ / S2M2_)
//
//  Vertrag (hooks.md 2.3): alles, was ein Online-Gast SEHEN muss, liegt als einfache Daten in
//  G.modState[id]. Reine Host-Rechenhilfen (Geschwindigkeiten, alte Werte) liegen in WeakMaps
//  pro Figur oder in Feldern, die netPlain ohnehin auslässt ('path').
//
//  BENUTZUNG FÜR LEVEL-BAUER (Etage oder Level: mods: ['hostage'] usw.)
//  - hostage:  Gefesselte Zivilisten. Hinlaufen = befreit (+Geld/Punkte), Spieler-Kugel trifft = tot
//              (-Geld). Etage erst geräumt, wenn keine Geisel mehr gefesselt ist.
//              Felder: hostages: [[tx, ty], ...] (Kachel-Koordinaten, Handkarten) ODER
//              hostageCount: 3 (Standard; automatisch neben Gegnern, >= 9 Kacheln vom Start, erreichbar),
//              hostageBonus: 300, hostageFine: 500.
//  - blackout: Stromausfall (G.dark). Notlichter blinken rot, Gegner tragen sichtbare Taschenlampen-Kegel,
//              sie entdecken dich ~2,5x langsamer (außer du stehst in ihrem Kegel oder schießt gerade).
//              Ist die Etage geräumt, geht das Licht wieder an. Felder: lamps: n (Notlichter, Std. nach Größe).
//  - zerog:    Schwerelos: Spieler + Gegner treiben mit Schwung, prallen von Wänden ab, Schüsse stoßen
//              zurück (Schrot stark), Kisten/Saftblasen/Gummienten schweben (nur Deko). Felder: debris: n.
//              Gut mit viel Platz und wenig Nahkampf-Gegnern.
//  - rewind:   Zeitschleife: normal erledigte Gegner stehen nach 12 s wieder auf (verwirrt, 1,1 s), nur
//              Hinrichtungen ([LEERTASTE] auf Liegende) sind endgültig. Jeder Gegner kommt höchstens
//              rewindMax-mal zurück (Std. 1). Etage erst geräumt, wenn nichts mehr ansteht.
//              Felder: rewindDelay: 12, rewindMax: 1. Waffen zum Umhauen (Fäuste, Würfe, Türen) hinlegen!
//  - strobe:   Stroboskop im Takt (strobeBpm: 128, strobeDuty: 0.38 = Lichtanteil). Gegner bemerken dich
//              und schießen NUR im Lichtblitz; im Dunkeln bleibt nur ein Lichtkreis um die Spieler.
//  - escort:   GUNZER läuft mit (folgt dem nächsten Spieler, geht in Deckung, wenn ihn ein alarmierter
//              Gegner sieht, [E] bei ihm = WARTE/KOMM, wartend: hinlaufen = KOMM). 4 Treffer durch
//              Gegner-Kugeln = tot -> alle Spieler sterben (Leben weg, Etage neu). Etage erst geräumt,
//              wenn Gunzer (lebend) in der Nähe eines Ausgangs X ist. Felder: gunzer: [tx, ty]
//              (Start, sonst neben P). Karte braucht mind. ein X.
// =====================================================================

const S2M2_IDS = ['hostage', 'blackout', 'zerog', 'rewind', 'strobe', 'escort'];
const S2M2_RING = [[-1, 0], [0, 1], [0, -1], [1, 0], [-1, 1], [-1, -1], [1, 1], [1, -1]];
CAUSE.s2m2_gunzer = 'GUNZER NICHT BESCHÜTZT';

// ---------------------------------------------------------------------
//  Gemeinsame Helfer
// ---------------------------------------------------------------------
// deterministischer Zufall pro Etage (Host = Gast)
function s2m2_rng(F, salt) {
  let seed = (F && F.gen && F.gen.seed) | 0;
  if (!seed && F && F.map) for (const row of F.map) for (let i = 0; i < row.length; i++) seed = (Math.imul(seed, 31) + row.charCodeAt(i)) | 0;
  return mulberry32((seed + salt * 7919 + (G.fi | 0) * 104729) | 0);
}
// freie, normale Bodenkachel (keine Gleise/Bänder/Laser/Türen)
function s2m2_free(tx, ty) {
  const c = T_(tx, ty);
  return FLOORS.includes(c) && c !== 'r' && c !== '<' && c !== '>' && !G.solid[ty * G.w + tx];
}
// Kugel-Strecke dieses Frames (px,py -> x,y) trifft Kreis?
function s2m2_segHit(b, x, y, r) {
  const ox = b.px === undefined ? b.x : b.px, oy = b.py === undefined ? b.y : b.py;
  const dx = b.x - ox, dy = b.y - oy, l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? clamp(((x - ox) * dx + (y - oy) * dy) / l2, 0, 1) : 0;
  const cx = ox + dx * t - x, cy = oy + dy * t - y;
  return cx * cx + cy * cy < r * r;
}
// Startspieler (Kartenzeichen P) - beim Gast ist G.player ein anderer Spieler
const s2m2_p0 = () => G.players.find((q) => q.idx === 0) || G.player;
const s2m2_allDead = () => G.enemies.every((e) => e.state === 'dead' || e.kind === 'O');
// HUD-Zeile oben (unter "GEGNER: n"), mehrere Mods stapeln sich
function s2m2_hudY(id) {
  const list = (G.mods || []).filter((m) => FLOOR_MODS[m] && FLOOR_MODS[m].hud);
  return 22 + 10 * Math.max(0, list.indexOf(id)) + (G.boss && G.boss.active && G.boss.state !== 'dead' ? 30 : 0);
}
// Einführungs-Hinweis (weicht den eingebauten Hinweisen aus)
function s2m2_hint(id, lines, t0 = 0, dur = 7) {
  const p = G.player;
  if (!p || !p.alive || G.time < t0 || G.time > t0 + dur) return;
  const mine = (G.mods || []).filter((m) => S2M2_IDS.includes(m));
  const busy = ((G.lanes.length || G.lasers.length || G.dark) && G.time < 6) || (G.terminals.length && !G.hacked && G.time < 8);
  hintBox(lines, H - 70 - (busy ? 44 : 0) - Math.max(0, mine.indexOf(id)) * 44);
}
// Pfeil am Bildschirmrand zu einem Punkt außerhalb des Bilds
function s2m2_edgeArrow(g, wx, wy, col, label) {
  const s = worldToScreen(wx, wy), m = 14;
  if (s.x >= m && s.x <= W - m && s.y >= m && s.y <= H - m) return false;
  const cx = W / 2, cy = H / 2, dx = s.x - cx, dy = s.y - cy;
  const k = Math.min((W / 2 - m) / Math.max(1e-6, Math.abs(dx)), (H / 2 - m) / Math.max(1e-6, Math.abs(dy)));
  const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
  const bob = Math.round(Math.sin(T * 8) * 2);
  g.save(); g.translate(Math.round(ax - Math.cos(a) * bob), Math.round(ay - Math.sin(a) * bob)); g.rotate(a);
  g.fillStyle = '#000'; g.beginPath(); g.moveTo(8, 0); g.lineTo(-5, -7); g.lineTo(-5, 7); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -5); g.lineTo(-4, 5); g.closePath(); g.fill();
  g.restore();
  if (label) txt(label, clamp(ax - Math.cos(a) * 18, 34, W - 34), clamp(ay - Math.sin(a) * 14 - 3, 6, H - 14), { font: FS, align: 'center', color: col });
  return true;
}
// Online-Gast: Positionen kommen 20x/s -> zum Zeichnen glätten (nur Anzeige, kein Spielzustand)
const S2M2_DISP = new Map();
let s2m2_dispG = null;
function s2m2_smooth(key, x, y) {
  if (NET.mode !== 'client') return { x, y };
  if (s2m2_dispG !== G) { S2M2_DISP.clear(); s2m2_dispG = G; }
  let d = S2M2_DISP.get(key);
  if (!d || Math.abs(d.x - x) > 60 || Math.abs(d.y - y) > 60) { d = { x, y }; S2M2_DISP.set(key, d); }
  const k = 1 - Math.exp(-(frameDt || 0.016) * 14);
  d.x += (x - d.x) * k; d.y += (y - d.y) * k;
  return d;
}
// Saftflecken-Positionen auf dem Oberkörper (gedrehte Figur, +x = Blickrichtung)
const S2M2_STAINS = [[-1, -4, 2, 2], [0, 2, 2, 2], [-2, 0, 1, 2], [1, -1, 2, 1], [-1, 5, 2, 1], [1, -6, 1, 2], [-3, 3, 2, 1], [0, -2, 1, 1]];
// Mensch von oben, wie drawHuman (render.js), mit Posen: 0 normal, 1 gefesselt (sitzt), 2 duckt sich, 3 rennt
function s2m2_drawPerson(g, o) {
  const x = Math.round(o.x), y = Math.round(o.y);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 1, y + 2, 6, 6, 0, 0, TAU); g.fill();
  g.save(); g.translate(x, y); g.rotate(o.a || 0);
  const s = o.pose === 1 || o.pose === 2 ? 0 : Math.round(Math.sin((o.walkT || 0) * 14) * 3);
  g.fillStyle = o.pants || '#151515';
  if (o.pose === 1) { g.fillRect(1, -4, 6, 3); g.fillRect(1, 1, 6, 3); }   // sitzt: Beine nach vorn
  else { g.fillRect(-2 + s, -4, 4, 3); g.fillRect(-2 - s, 1, 4, 3); }
  g.fillStyle = o.suit; g.fillRect(-3, -6, 6, 12); g.fillRect(-2, -7, 4, 14);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-3, -6, 2, 12);
  for (let i = 0; i < Math.min(o.stains || 0, S2M2_STAINS.length); i++) {
    const q = S2M2_STAINS[i]; g.fillStyle = i % 3 === 2 ? '#ffd23f' : '#ff9a1a'; g.fillRect(q[0], q[1], q[2], q[3]);
  }
  if (o.pose === 1) {   // Hände hinter dem Rücken, Seil um den Bauch
    g.fillStyle = o.suit; g.fillRect(-5, -5, 3, 2); g.fillRect(-5, 3, 3, 2);
    g.fillStyle = o.skin; g.fillRect(-6, -2, 2, 4);
    g.fillStyle = '#c8a060'; g.fillRect(-1, -7, 1, 14); g.fillRect(1, -7, 1, 14); g.fillRect(-6, -1, 2, 2);
  } else if (o.pose === 2) {   // duckt sich, Hände über dem Kopf
    g.fillStyle = o.suit; g.fillRect(-1, -6, 4, 2); g.fillRect(-1, 4, 4, 2);
    g.fillStyle = o.skin; g.fillRect(1, -4, 3, 3); g.fillRect(1, 1, 3, 3);
  } else {
    const sw = o.pose === 3 ? Math.round(Math.sin((o.walkT || 0) * 14) * 2) : 0;
    g.fillStyle = o.suit; g.fillRect(0, -5, 3 + sw, 2); g.fillRect(0, 3, 3 - sw, 2);
    g.fillStyle = o.skin; g.fillRect(3 + sw, -6, 3, 3); g.fillRect(3 - sw, 3, 3, 3);
    if (o.carton) { g.fillStyle = '#ff9a1a'; g.fillRect(5 - sw, 4, 3, 4); g.fillStyle = '#ffffff'; g.fillRect(5 - sw, 4, 3, 1); }
  }
  pxEll(g, 0, 0, 4, 4, o.hair);
  if (o.cap) { pxEll(g, -1, 0, 4, 4, o.cap); g.fillStyle = o.cap; g.fillRect(4, -3, 2, 6); }
  g.fillStyle = o.skin; g.fillRect(2, -2, 2, 4);
  if (o.pose === 1) { g.fillStyle = '#ffffff'; g.fillRect(3, -2, 1, 4); }   // Knebel
  g.restore();
}

// =====================================================================
//  hostage: GEISELN
// =====================================================================
const S2M2_CIV = [
  { suit: '#d8c8a0', skin: '#f0c8a0', hair: '#e8e8e8' },
  { suit: '#3a6ad0', skin: '#c89070', hair: '#1a1a1a' },
  { suit: '#9a3aaa', skin: '#f0c8a0', hair: '#c87a2a' },
  { suit: '#2a8a4a', skin: '#8a5a3a', hair: '#0a0a0a' },
  { suit: '#e8e8e8', skin: '#f0c8a0', hair: '#ffd23f' },
  { suit: '#ff7ab0', skin: '#e0b090', hair: '#5a3a1a' },
];
const S2M2_HELP = ['HILFE!', 'MMMPF!', 'HOLT MICH HIER RAUS!', 'ICH HAB NUR SAFT GEKAUFT!', 'MAMA!', 'BITTE NICHT SCHIESSEN!', 'MEINE KATZE HAT HUNGER!'];
const S2M2_THANKS = ['DANKE, LIL!', 'ENDLICH! ICH MUSS AUFS KLO!', 'DU BIST MEIN HELD!', 'ICH KÜNDIGE!', 'NIE WIEDER SAFT!', 'ICH RUF MEINEN ANWALT AN!'];

// Plätze neben Gegnern (gleicher Raum = Sichtlinie), weit weg vom Start, vom Start aus erreichbar
function s2m2_placeHostages(n, rng) {
  const p0 = s2m2_p0(), out = [];
  const ens = G.enemies.filter((e) => e.kind !== 'B' && e.kind !== 'O' && !e.static);
  for (let tries = 0; out.length < n && tries < 500; tries++) {
    let tx, ty;
    if (ens.length && tries < 380) {
      const e = ens[Math.floor(rng() * ens.length)];
      tx = Math.floor(e.x / TS) + Math.floor(rng() * 7) - 3; ty = Math.floor(e.y / TS) + Math.floor(rng() * 7) - 3;
      if (!s2m2_free(tx, ty) || !los(e.x, e.y, tx * TS + 8, ty * TS + 8)) continue;
    } else { tx = 1 + Math.floor(rng() * (G.w - 2)); ty = 1 + Math.floor(rng() * (G.h - 2)); }
    if (!s2m2_free(tx, ty)) continue;
    const x = tx * TS + 8, y = ty * TS + 8;
    if (dist(x, y, p0.x, p0.y) < 9 * TS || out.some((q) => dist(q[0], q[1], x, y) < 5 * TS)) continue;
    if (G.enemies.some((e) => dist(e.x, e.y, x, y) < 12) || G.pickups.some((k) => dist(k.x, k.y, x, y) < 10)) continue;
    if (!findPath(p0.x, p0.y, x, y)) continue;
    out.push([x, y]);
  }
  return out;
}
function s2m2_hostageDie(s, h, ang) {
  h.st = 2; s.lost++;
  const c = S2M2_CIV[h.c] || S2M2_CIV[0];
  run.cash = Math.max(0, run.cash - s.fine); run.score = Math.max(0, run.score - 500);
  bloodBurst(h.x, h.y, ang, 20, 120);
  stampCorpse({ x: h.x, y: h.y, a: h.a, kind: 'E', suit: c.suit, skin: c.skin, hair: c.hair, shirt: c.suit }, ang);
  floatText(h.x, h.y - 18, 'GEISEL GETROFFEN! -' + s.fine + '€', '#ff4a4a');
  Sound.play('splat'); shake(4);
}
FLOOR_MODS.hostage = {
  setup(F) {
    const rng = s2m2_rng(F, 11);
    const pos = Array.isArray(F.hostages) && F.hostages.length ? F.hostages.map((q) => [q[0] * TS + 8, q[1] * TS + 8]) : s2m2_placeHostages(F.hostageCount || 3, rng);
    const h = pos.map((q) => ({ x: q[0], y: q[1], r: 5, a: Math.round(rng() * 628) / 100, st: 0, t: 0, c: Math.floor(rng() * S2M2_CIV.length), walkT: 0, sayText: '', sayT: 0, nt: 1 + Math.round(rng() * 40) / 10 }));
    G.modState.hostage = { h, saved: 0, lost: 0, bonus: F.hostageBonus || 300, fine: F.hostageFine || 500, done: 0 };
  },
  update(dt) {
    const s = G.modState.hostage;
    if (!s) return;
    let changed = false;
    for (const h of s.h) {
      h.sayT -= dt;
      if (h.st === 0) {
        for (const b of G.bullets) {
          if (b.dead || b.owner !== 'player' || !s2m2_segHit(b, h.x, h.y, 6)) continue;
          b.dead = true; s2m2_hostageDie(s, h, Math.atan2(b.vy, b.vx)); changed = true; break;
        }
        if (h.st !== 0) continue;
        const p = nearestPlayer(h.x, h.y);
        if (p && dist(p.x, p.y, h.x, h.y) < 14) {   // befreit!
          h.st = 1; h.t = 0; s.saved++; changed = true;
          h.sayText = pick(S2M2_THANKS); h.sayT = 2.2;
          run.cash += s.bonus; run.score += 1000;
          floatText(h.x, h.y - 26, 'GEISEL BEFREIT! +' + s.bonus + '€', '#7dff7a');
          Sound.play('cash');
          let best = null, bd = 1e9;
          for (const i of G.exits) { const ex = (i % G.w) * TS + 8, ey = ((i / G.w) | 0) * TS + 8, d = dist(h.x, h.y, ex, ey); if (d < bd) { bd = d; best = [ex, ey]; } }
          h.path = best ? findPath(h.x, h.y, best[0], best[1]) : null;   // 'path' schickt netPlain nicht mit
          continue;
        }
        h.nt -= dt;
        if (h.nt <= 0) { h.nt = rand(3, 6); h.sayText = pick(S2M2_HELP); h.sayT = 1.6; }
        if (p) h.a = turnTo(h.a, Math.atan2(p.y - h.y, p.x - h.x), dt * 1.5);
      } else if (h.st === 1) {   // rennt zum Ausgang und ist weg
        h.t += dt;
        const done = !h.path || followPath(h, 80 * dt, dt);
        if ((done && h.t > 2.2) || h.t > 8) { h.st = 3; h.path = null; }
      }
    }
    if (changed && !s.done && s.h.every((h) => h.st !== 0)) {
      s.done = 1;
      if (s.h.length && s.saved === s.h.length) { run.cash += 500; floatText(G.player.x, G.player.y - 32, 'ALLE GEISELN GERETTET! +500€', 'rainbow'); }
      checkClear();
    }
  },
  canClear() { const s = G.modState.hostage; return !s || s.h.every((h) => h.st !== 0); },
  draw(g) {
    const s = G.modState.hostage;
    if (!s) return;
    s.h.forEach((h, i) => {
      if (h.st === 2 || h.st === 3) return;
      const c = S2M2_CIV[h.c] || S2M2_CIV[0], P = s2m2_smooth('h' + i, h.x, h.y);
      if (h.st === 0) {   // pulsierender Ring = "hier hin!"
        g.strokeStyle = `rgba(255,225,77,${(0.45 + 0.35 * Math.sin(T * 6)).toFixed(2)})`; g.lineWidth = 1;
        g.beginPath(); g.arc(P.x, P.y, 10 + Math.sin(T * 6) * 1.5, 0, TAU); g.stroke();
      }
      g.globalAlpha = h.st === 1 ? clamp((8 - h.t) / 2, 0, 1) : 1;
      s2m2_drawPerson(g, { x: P.x, y: P.y, a: h.a, walkT: h.walkT, suit: c.suit, skin: c.skin, hair: c.hair, pose: h.st === 0 ? 1 : 3 });
      g.globalAlpha = 1;
      if (h.sayT > 0 && h.sayText) txt(h.sayText, P.x, P.y - 22, { g, font: FS, align: 'center', color: h.st === 0 ? '#ffe14d' : '#7dff7a' });
      else if (h.st === 0 && Math.floor(T * 3) % 2) txt('!', P.x, P.y - 20, { g, align: 'center', color: '#ffe14d' });
    });
  },
  drawScreen(g) {
    const s = G.modState.hostage;
    if (!s || !s2m2_allDead()) return;
    for (const h of s.h) if (h.st === 0) s2m2_edgeArrow(g, h.x, h.y, '#ffe14d', 'GEISEL');
  },
  hud() {
    const s = G.modState.hostage;
    if (!s) return;
    const y = s2m2_hudY('hostage'), tied = s.h.filter((h) => h.st === 0).length;
    let t = 'GEISELN BEFREIT: ' + s.saved + '/' + s.h.length + (s.lost ? '   VERLOREN: ' + s.lost : '');
    if (tied && s2m2_allDead() && !G.cleared) t = Math.floor(T * 3) % 2 ? 'BEFREIE DIE RESTLICHEN GEISELN! (' + tied + ')' : t;
    txt(t, W / 2, y, { font: FS, align: 'center', color: s.lost ? '#ffb52a' : '#ffe14d' });
    s2m2_hint('hostage', ['GEISELN!', 'LAUF ZU DEN GEFESSELTEN, UM SIE ZU BEFREIEN (+' + s.bonus + '€).', 'NICHT AUF SIE SCHIESSEN - DAS KOSTET ' + s.fine + '€!']);
  },
};

// =====================================================================
//  blackout: STROMAUSFALL
// =====================================================================
const S2M2_SPOT_BO = new WeakMap();
FLOOR_MODS.blackout = {
  setup(F) {
    G.dark = true;
    const rng = s2m2_rng(F, 23), lamps = [];
    const want = F.lamps != null ? F.lamps : clamp(Math.round(G.w * G.h / 260), 3, 8);
    for (let tries = 0; lamps.length < want && tries < 800; tries++) {
      const tx = 1 + Math.floor(rng() * (G.w - 2)), ty = 1 + Math.floor(rng() * (G.h - 2));
      if (!s2m2_free(tx, ty)) continue;
      const wall = S2M2_RING.slice(0, 4).find(([dx, dy]) => T_(tx + dx, ty + dy) === '#');
      if (!wall) continue;
      const x = tx * TS + 8 + wall[0] * 6, y = ty * TS + 8 + wall[1] * 6;
      if (lamps.some((l) => dist(l[0], l[1], x, y) < 8 * TS)) continue;
      lamps.push([x, y, Math.round(rng() * 100) / 100]);
    }
    G.modState.blackout = { t: 0, on: 0, lamps };
  },
  update(dt) {
    const s = G.modState.blackout;
    if (!s) return;
    s.t += dt;
    if (!s.on && G.cleared) {
      s.on = 1; G.dark = false;
      floatText(G.player.x, G.player.y - 30, 'STROM IST WIEDER DA!', '#ffe14d'); Sound.play('select');
    }
    if (s.on) return;
    // Im Dunkeln sehen die Gegner schlechter - außer man steht in ihrem Lichtkegel oder schießt gerade
    const shooting = (p) => G.bullets.some((b) => !b.dead && b.owner === 'player' && b.src === p && dist(b.sx, b.sy, p.x, p.y) < 24 && dist(b.x, b.y, b.sx, b.sy) < 150);
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.kind === 'B' || e.kind === 'O') continue;
      const prev = S2M2_SPOT_BO.get(e);
      if (prev !== undefined && e.state !== 'alert' && (e.spot || 0) > prev) {
        const p = e.target && e.target.alive ? e.target : nearestPlayer(e.x, e.y);
        const lit = p && ((dist(e.x, e.y, p.x, p.y) < 80 && Math.abs(angDiff(e.a, Math.atan2(p.y - e.y, p.x - e.x))) < 0.5) || shooting(p));
        if (!lit) e.spot = prev + (e.spot - prev) * 0.4;
      }
      S2M2_SPOT_BO.set(e, e.spot || 0);
    }
  },
  clientUpdate(dt) { const s = G.modState.blackout; if (!s) return; s.t += dt; G.dark = !s.on; },
  drawScreen(g) {
    const s = G.modState.blackout;
    if (!s || s.on) return;
    const z = G.cam.z || 1;
    g.save(); g.globalCompositeOperation = 'lighter';
    // rote Notlichter (Drehlicht, flackert manchmal)
    for (const l of s.lamps) {
      const q = worldToScreen(l[0], l[1]);
      if (q.x < -90 || q.y < -90 || q.x > W + 90 || q.y > H + 90) continue;
      const fl = Math.sin((s.t + l[2] * 10) * 2.3) > -0.9 ? 1 : 0.25, a = s.t * 2.6 + l[2] * 6 + G.cam.rot;
      const gr = g.createRadialGradient(q.x, q.y, 2, q.x, q.y, 74 * z);
      gr.addColorStop(0, `rgba(255,40,40,${0.42 * fl})`); gr.addColorStop(1, 'rgba(255,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(q.x, q.y); g.arc(q.x, q.y, 74 * z, a - 0.45, a + 0.45); g.closePath(); g.fill();
      const gr2 = g.createRadialGradient(q.x, q.y, 1, q.x, q.y, 22 * z);
      gr2.addColorStop(0, `rgba(255,70,50,${0.5 * fl})`); gr2.addColorStop(1, 'rgba(255,0,0,0)');
      g.fillStyle = gr2; g.beginPath(); g.arc(q.x, q.y, 22 * z, 0, TAU); g.fill();
    }
    // Taschenlampen der Gegner: man sieht, wohin sie schauen
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.state === 'down' || e.static || e.kind === 'B' || e.kind === 'O' || e.kind === 'K') continue;
      const q = worldToScreen(e.x, e.y);
      if (q.x < -90 || q.y < -90 || q.x > W + 90 || q.y > H + 90) continue;
      const a = e.a + G.cam.rot, al = e.state === 'alert' ? 0.36 : 0.24;
      const gr = g.createRadialGradient(q.x, q.y, 3, q.x, q.y, 80 * z);
      gr.addColorStop(0, `rgba(255,236,150,${al})`); gr.addColorStop(1, 'rgba(255,220,120,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(q.x, q.y); g.arc(q.x, q.y, 80 * z, a - 0.42, a + 0.42); g.closePath(); g.fill();
      g.fillStyle = e.state === 'alert' ? 'rgba(255,90,60,0.9)' : 'rgba(255,240,170,0.7)'; g.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 2, 2);
    }
    g.restore();
  },
  hud() {
    const s = G.modState.blackout;
    if (!s) return;
    if (!s.on) txt('STROMAUSFALL', W / 2, s2m2_hudY('blackout'), { font: FS, align: 'center', color: Math.floor(T * 2) % 2 ? '#ff4a4a' : '#8a2020' });
    s2m2_hint('blackout', ['IM DUNKELN SEHEN DICH DIE GEGNER SCHLECHTER.', 'GELBE KEGEL = IHRE TASCHENLAMPEN. NICHT REINLAUFEN!', 'SCHÜSSE VERRATEN DICH. RÄUM AUF, DANN KOMMT DER STROM.'], 6, 7);
  },
};

// =====================================================================
//  zerog: SCHWERELOSIGKEIT
// =====================================================================
const S2M2_ZG = new WeakMap();
// Spieler: Eingabe wirkt nur noch als sanfter Schub, Schwung bleibt, Rückstoß beim Schießen
function s2m2_zgPlayer(p, dt, mv) {
  if (!p || !p.alive || p.execT > 0 || !(dt > 0)) { if (p) S2M2_ZG.delete(p); return; }
  const id = p.weapon ? p.weapon.id : '', am = p.weapon ? p.weapon.ammo : 0;
  const z = S2M2_ZG.get(p);
  if (!z) { S2M2_ZG.set(p, { vx: p.vx || 0, vy: p.vy || 0, x: p.x, y: p.y, id, am }); return; }
  let vx = z.vx + ((p.vx || 0) - z.vx) * 0.1, vy = z.vy + ((p.vy || 0) - z.vy) * 0.1;
  const w = id && WEAPONS[id];
  if (w && w.ranged && id === z.id && am < z.am) {
    const k = Math.min(3, z.am - am) * (w.pellets > 1 ? 110 : 40 + (w.shake || 1) * 6);
    vx -= Math.cos(p.a) * k; vy -= Math.sin(p.a) * k;
  }
  const sp = Math.hypot(vx, vy);
  if (sp > 240) { vx *= 240 / sp; vy *= 240 / sp; }
  mv(p, (vx - (p.vx || 0)) * dt, (vy - (p.vy || 0)) * dt);
  // an Wänden abprallen
  const ax = p.x - z.x, ay = p.y - z.y;
  if (Math.abs(vx) > 30 && ax * Math.sign(vx) < Math.abs(vx * dt) * 0.25) vx = -vx * 0.45;
  if (Math.abs(vy) > 30 && ay * Math.sign(vy) < Math.abs(vy * dt) * 0.25) vy = -vy * 0.45;
  p.vx = vx; p.vy = vy;
  z.vx = vx; z.vy = vy; z.x = p.x; z.y = p.y; z.id = id; z.am = am;
}
// Gegner: ihre Bewegung (KI, Schubsen, Umfallen) wird zu Schwung
function s2m2_zgEnemy(e, dt) {
  if (e.state === 'dead' || e.static || e.flying || e.kind === 'B' || e.kind === 'O' || e.fling > 0) { S2M2_ZG.delete(e); return; }
  const z = S2M2_ZG.get(e);
  if (!z) { S2M2_ZG.set(e, { vx: 0, vy: 0, x: e.x, y: e.y }); return; }
  const dvx = (e.x - z.x) / dt, dvy = (e.y - z.y) / dt;
  if (Math.abs(dvx) > 500 || Math.abs(dvy) > 500) { z.x = e.x; z.y = e.y; return; }   // Sprung/Teleport
  if (e.state === 'down' || e.state === 'confused') {   // liegt/steht dumm herum: Stöße werden zu Schwung, kaum Bremsen
    const d = Math.exp(-dt * 1.2);
    z.vx = z.vx * d + dvx * 0.15; z.vy = z.vy * d + dvy * 0.15;
  } else {   // eigene Bewegung (KI) wirkt nur als sanfter Schub
    const k = 1 - Math.exp(-dt * 2.4);
    z.vx += (dvx - z.vx) * k; z.vy += (dvy - z.vy) * k;
  }
  e.x = z.x; e.y = z.y;
  moveEntity(e, z.vx * dt, z.vy * dt);
  const ax = e.x - z.x, ay = e.y - z.y;
  if (Math.abs(z.vx) > 25 && ax * Math.sign(z.vx) < Math.abs(z.vx * dt) * 0.25) z.vx = -z.vx * 0.4;
  if (Math.abs(z.vy) > 25 && ay * Math.sign(z.vy) < Math.abs(z.vy * dt) * 0.25) z.vy = -z.vy * 0.4;
  z.x = e.x; z.y = e.y;
}
// Schwebe-Deko: Position = f(Zeit) -> Host und Gast sehen dasselbe
function s2m2_debrisPos(d, t) { return [d.x + Math.sin(t * d.w + d.ph) * d.ax, d.y + Math.cos(t * d.w * 0.8 + d.ph) * d.ay, t * d.r + d.ph]; }
FLOOR_MODS.zerog = {
  setup(F) {
    const rng = s2m2_rng(F, 37), deb = [];
    const n = F.debris != null ? F.debris : clamp(Math.round(G.w * G.h / 110), 6, 18);
    const r2 = (v) => Math.round(v * 100) / 100;
    for (let tries = 0; deb.length < n && tries < 600; tries++) {
      const tx = 1 + Math.floor(rng() * (G.w - 2)), ty = 1 + Math.floor(rng() * (G.h - 2));
      if (!s2m2_free(tx, ty)) continue;
      deb.push({ x: tx * TS + 8, y: ty * TS + 8, k: Math.floor(rng() * 4), ph: r2(rng() * TAU), ax: r2(6 + rng() * 16), ay: r2(6 + rng() * 16), w: r2(0.25 + rng() * 0.45), r: r2((rng() - 0.5) * 1.6) });
    }
    G.modState.zerog = { t: 0, deb };
  },
  update(dt) {
    const s = G.modState.zerog;
    if (!s || !(dt > 0)) return;
    s.t += dt;
    for (const p of G.players) if (p.nfx === undefined) s2m2_zgPlayer(p, dt, moveEntity);   // Online-Gäste treiben bei sich selbst
    for (const e of G.enemies) s2m2_zgEnemy(e, dt);
  },
  clientUpdate(dt) {
    const s = G.modState.zerog;
    if (!s) return;
    s.t += dt;
    const p = G.player;
    if (p && p.idx === NET.myIdx && p.synced && !NET.menu) s2m2_zgPlayer(p, dt, netLocalMove);
  },
  draw(g) {
    const s = G.modState.zerog;
    if (!s) return;
    for (const d of s.deb) {
      const [x, y, r] = s2m2_debrisPos(d, s.t);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(Math.round(x + 5), Math.round(y + 8), 5, 3, 0, 0, TAU); g.fill();
      g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(r);
      if (d.k === 0) {   // Kiste
        g.fillStyle = '#3a240e'; g.fillRect(-6, -6, 12, 12); g.fillStyle = '#9a6a32'; g.fillRect(-5, -5, 10, 10);
        g.fillStyle = '#6a4420'; g.fillRect(-5, -1, 10, 2); g.fillRect(-1, -5, 2, 10);
      } else if (d.k === 1) {   // O-Saft-Blase (wabbelt)
        const wb = Math.sin(s.t * 5 + d.ph);
        pxEll(g, 0, 0, Math.round(4 + wb), Math.round(4 - wb), '#ff9a1a'); g.fillStyle = '#ffe0a0'; g.fillRect(-2, -2, 2, 1);
        g.fillStyle = '#ffb52a'; g.fillRect(6, 2, 2, 2);
      } else if (d.k === 2) {   // Saftpackung
        g.fillStyle = '#fafafa'; g.fillRect(-3, -5, 7, 10); g.fillStyle = '#ff9a1a'; g.fillRect(-3, -1, 7, 4); g.fillStyle = '#2a8a4a'; g.fillRect(-1, -7, 3, 2);
      } else {   // Gummiente
        pxEll(g, 0, 1, 4, 3, '#ffd23f'); pxEll(g, 3, -2, 2, 2, '#ffd23f'); g.fillStyle = '#ff7a1a'; g.fillRect(5, -2, 2, 1); g.fillStyle = '#111'; g.fillRect(3, -3, 1, 1);
      }
      g.restore();
    }
  },
  hud() {
    const s = G.modState.zerog;
    if (!s) return;
    txt('SCHWERELOS', W / 2, s2m2_hudY('zerog') + Math.round(Math.sin(T * 2) * 1.5), { font: FS, align: 'center', color: '#9ad8ff' });
    s2m2_hint('zerog', ['SCHWERELOSIGKEIT!', 'DU TREIBST MIT SCHWUNG - FRÜH GEGENSTEUERN!', 'SCHÜSSE STOSSEN DICH ZURÜCK (SCHROT = RAKETENRUCKSACK).']);
  },
};

// =====================================================================
//  rewind: ZEITSCHLEIFE
// =====================================================================
const S2M2_RWGEN = new WeakMap();   // Gegner -> wie oft schon zurückgekommen (nur Host)
const S2M2_DEJAVU = ['DÉJÀ-VU!', 'HAB ICH DAS NICHT SCHON MAL ERLEBT?', 'ICH BIN WIEDER DA!', 'NOCHMAL VON VORNE!', 'WAR ICH NICHT TOT?', 'ZEIT IST EIN SAFTKREIS.'];
function s2m2_revive(s, q) {
  const e = makeEnemy(q.k, q.x, q.y);
  e.a = q.a; resolve(e);
  e.state = 'confused'; e.confT = 1.1; e.alerted = true; e.spot = 1;
  G.enemies.push(e);
  S2M2_RWGEN.set(e, q.gen);
  s.n++;
  s.g.push({ n: typeof netNid === 'function' ? netNid(e) : 0, i: G.enemies.length - 1 });
  say(e, pick(S2M2_DEJAVU), 1.8);
  sparks(e.x, e.y, 14, '#c89bff'); sparks(e.x, e.y, 8, '#3fd0ff');
  floatText(e.x, e.y - 26, 'ZEITSCHLEIFE!', '#c89bff', true);
  Sound.play('glitch');
}
function s2m2_rwFind(r) {
  if (r.n) { const e = G.enemies[r.i]; return e && e.nid === r.n ? e : G.enemies.find((q) => q.nid === r.n); }
  return G.enemies[r.i];
}
FLOOR_MODS.rewind = {
  setup(F) { G.modState.rewind = { q: [], g: [], n: 0, delay: F.rewindDelay || 12, max: F.rewindMax != null ? F.rewindMax : 1 }; },
  onKill(e, how) {
    const s = G.modState.rewind;
    if (!s || 'BOVYQ'.includes(e.kind) || e.static || e.flying || (ENEMY_EXT[e.kind] && ENEMY_EXT[e.kind].machine)) return;
    if (how === 'exec') { floatText(e.x, e.y - 22, 'ENDGÜLTIG GELÖSCHT!', '#c89bff', true); return; }
    const gen = S2M2_RWGEN.get(e) || 0;
    if (gen >= s.max) return;
    s.q.push({ x: Math.round(e.x), y: Math.round(e.y), a: Math.round((e.a || 0) * 100) / 100, k: e.kind, gen: gen + 1, t: s.delay, suit: e.suit || '#222', skin: e.skin || '#f0c8a0', hair: e.hair || '#222' });
  },
  update(dt) {
    const s = G.modState.rewind;
    if (!s) return;
    for (let i = s.q.length - 1; i >= 0; i--) {
      const q = s.q[i];
      q.t -= dt;
      if (q.t <= 0) { s.q.splice(i, 1); s2m2_revive(s, q); }
    }
    s.g = s.g.filter((r) => { const e = s2m2_rwFind(r); return e && e.state !== 'dead'; });
  },
  clientUpdate(dt) { const s = G.modState.rewind; if (s) for (const q of s.q) q.t = Math.max(0, q.t - dt); },
  canClear() { const s = G.modState.rewind; return !s || s.q.length === 0; },
  draw(g) {
    const s = G.modState.rewind;
    if (!s) return;
    for (const q of s.q) {
      const k = clamp(1 - q.t / s.delay, 0, 1), soon = q.t < 3;
      // Geist flackert immer stärker
      if (soon || Math.floor(T * 6 + q.x) % 5 === 0) {
        const j = soon ? randi(-1, 1) : 0;
        g.globalAlpha = soon ? 0.25 + 0.35 * k : 0.15;
        s2m2_drawPerson(g, { x: q.x + j, y: q.y, a: q.a, walkT: 0, suit: q.suit, skin: q.skin, hair: q.hair, pose: 0 });
        g.globalAlpha = 1;
      }
      g.strokeStyle = soon && Math.floor(T * 10) % 2 ? '#3fd0ff' : '#c89bff'; g.lineWidth = 2;
      g.beginPath(); g.arc(q.x, q.y, 10, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke(); g.lineWidth = 1;
      txt(Math.ceil(q.t) + '', q.x, q.y - 22, { g, font: FS, align: 'center', color: soon ? '#ff6fb5' : '#c89bff' });
    }
    // zurückgekommene Gegner: Glitch-Rahmen
    for (const r of s.g) {
      const e = s2m2_rwFind(r);
      if (!e || e.state === 'dead') continue;
      const o = Math.floor(T * 12) % 3 - 1, x = Math.round(e.x), y = Math.round(e.y);
      g.strokeStyle = 'rgba(63,208,255,0.7)'; g.strokeRect(x - 7.5 + o, y - 7.5, 15, 15);
      g.strokeStyle = 'rgba(255,60,200,0.7)'; g.strokeRect(x - 7.5 - o, y - 7.5 + o, 15, 15);
    }
  },
  hud() {
    const s = G.modState.rewind;
    if (!s) return;
    const n = s.q.length;
    txt(n ? 'ZEITSCHLEIFE: ' + n + (n === 1 ? ' GEGNER STEHT' : ' GEGNER STEHEN') + ' GLEICH WIEDER AUF!' : 'ZEITSCHLEIFE AKTIV', W / 2, s2m2_hudY('rewind'), { font: FS, align: 'center', color: n && Math.floor(T * 4) % 2 ? '#ff6fb5' : '#c89bff' });
    s2m2_hint('rewind', ['ZEITSCHLEIFE!', 'ERLEDIGTE GEGNER STEHEN NACH ' + s.delay + ' SEK WIEDER AUF.', 'NUR HINRICHTUNGEN (UMHAUEN + [LEERTASTE]) SIND ENDGÜLTIG!']);
  },
};

// =====================================================================
//  strobe: STROBOSKOP
// =====================================================================
const S2M2_SPOT_ST = new WeakMap();
function s2m2_strobePhase(s) { const bl = 60 / s.bpm, ph = (s.t % bl) / bl; return { bl, ph, light: ph < s.duty, beat: Math.floor(s.t / bl) }; }
FLOOR_MODS.strobe = {
  setup(F) { G.modState.strobe = { t: 0, bpm: F.strobeBpm || 128, duty: clamp(F.strobeDuty || 0.38, 0.15, 0.8) }; },
  update(dt) {
    const s = G.modState.strobe;
    if (!s) return;
    s.t += dt;
    const P = s2m2_strobePhase(s), rem = (1 - P.ph) * P.bl;
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.kind === 'B' || e.kind === 'O') continue;
      const prev = S2M2_SPOT_ST.get(e);
      if (!P.light) {
        if (prev !== undefined && e.state !== 'alert' && (e.spot || 0) > prev) e.spot = prev;   // im Dunkeln nichts bemerken
        if (e.state === 'alert') { e.cd = Math.max(e.cd || 0, rem); if (e.kind === 'N') e.aimT = Math.min(e.aimT || 0, 0.4); }   // geschossen wird im Blitz
      }
      S2M2_SPOT_ST.set(e, e.spot || 0);
    }
  },
  clientUpdate(dt) { const s = G.modState.strobe; if (s) s.t += dt; },
  draw(g) {   // Discokugel-Funkeln auf dem Boden, nur im Blitz
    const s = G.modState.strobe;
    if (!s) return;
    const P = s2m2_strobePhase(s);
    if (!P.light) return;
    const rng = mulberry32(P.beat * 7919 + 13), z = G.cam.z || 1, hw = W / 2 / z + 20, hh = H / 2 / z + 20, a = 1 - P.ph / s.duty;
    for (let i = 0; i < 46; i++) {
      const x = G.cam.x + (rng() * 2 - 1) * hw, y = G.cam.y + (rng() * 2 - 1) * hh;
      g.fillStyle = `hsla(${Math.floor(rng() * 360)},100%,70%,${(0.55 * a).toFixed(2)})`; g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  },
  drawScreen(g) {
    const s = G.modState.strobe;
    if (!s) return;
    const P = s2m2_strobePhase(s), soft = save.opts && save.opts.fx === 1 ? 0.55 : 1;
    if (P.light) {
      const a = 0.16 * soft * (1 - P.ph / s.duty);
      g.fillStyle = `hsla(${(P.beat * 67) % 360},100%,60%,${a.toFixed(3)})`; g.fillRect(0, 0, W, H);
    } else {
      const a = 0.68 * soft * clamp((P.ph - s.duty) / 0.08, 0, 1), z = G.cam.z || 1, R = 46 * z;
      g.save(); g.fillStyle = `rgba(6,0,18,${a.toFixed(3)})`; g.beginPath(); g.rect(0, 0, W, H);
      for (const p of G.players) if (p.alive) { const q = worldToScreen(p.x, p.y); g.moveTo(q.x + R, q.y); g.arc(q.x, q.y, R, 0, TAU, true); }
      g.fill('evenodd'); g.restore();
    }
    // Rand pulsiert im Takt
    const pa = (0.35 * (1 - P.ph) * soft).toFixed(3);
    g.fillStyle = `hsla(${(P.beat * 67 + 180) % 360},100%,60%,${pa})`;
    g.fillRect(0, 0, W, 3); g.fillRect(0, H - 3, W, 3); g.fillRect(0, 0, 3, H); g.fillRect(W - 3, 0, 3, H);
  },
  hud() {
    const s = G.modState.strobe;
    if (!s) return;
    const P = s2m2_strobePhase(s), y = s2m2_hudY('strobe');
    txt('STROBO', W / 2 - 22, y, { font: FS, align: 'right', color: P.light ? '#ffffff' : '#8a6aaa' });
    for (let i = 0; i < 4; i++) { ctx.fillStyle = P.beat % 4 === i ? (P.light ? neon(i) : '#c89bff') : '#2a1a3a'; ctx.fillRect(W / 2 - 16 + i * 9, y + 1, 7, 5); }
    txt(P.light ? 'LICHT!' : 'DUNKEL', W / 2 + 22, y, { font: FS, color: P.light ? '#ffe14d' : '#6a5a8a' });
    s2m2_hint('strobe', ['STROBOSKOP!', 'GEGNER SEHEN UND SCHIESSEN NUR IM LICHTBLITZ.', 'IM DUNKELN BEWEGEN, IM BLITZ IN DECKUNG!']);
  },
};

// =====================================================================
//  escort: GUNZER LÄUFT MIT
// =====================================================================
const S2M2_G_SPILL = ['OIDA, SCHON WIEDER ANGEGUNZT!', 'MEIN SHIRT! FRISCH GEWASCHEN!', 'DER SAFT HAT MICH ANGEGRIFFEN!', 'WIESO IST DIE PACKUNG OFFEN?!', 'IST DAS FRUCHTFLEISCH? DAS IST FRUCHTFLEISCH!', 'KEINER HAT DAS GESEHEN, OK?'];
const S2M2_G_HIT = ['AUA! MEIN SAFT!', 'EY! ICH BIN ZIVILIST!', 'DAS GIBT FLECKEN!', 'OIDA, DAS TUT WEH!'];
const S2M2_G_HIDE = ['OIDA! DIE SCHIESSEN!', 'ICH BLEIB HIER IN DECKUNG!', 'MACH DU DAS, LIL!', 'ICH BIN NUR DER PRAKTIKANT!'];
const S2M2_G_GO = ['PUH. WEITER GEHT\'S.', 'BIN WIEDER DA!', 'OK, ICH FOLGE DIR.'];
const S2M2_G_WAIT = ['OK, ICH WART HIER. MIT MEINEM SAFT.', 'ICH RÜHR MICH NICHT. EHRENWORT.', 'ICH BEWACHE DIESE ECKE!'];
const S2M2_G_COME = ['BIN SCHON DA!', 'JAWOHL!', 'WARTE AUF MICH!'];
const S2M2_G_FF = ['EY! NICHT AUF MICH!', 'LIL! ICH BIN DER GUTE!', 'ZIEL WOANDERS HIN!'];
const S2M2_FOCUS = new WeakMap();
function s2m2_gSay(gz, text, t = 2.2) { gz.sayText = text; gz.sayT = t; }
FLOOR_MODS.escort = {
  setup(F) {
    const p0 = s2m2_p0();
    let x = p0.x, y = p0.y;
    if (Array.isArray(F.gunzer)) { x = F.gunzer[0] * TS + 8; y = F.gunzer[1] * TS + 8; }
    else {
      const ptx = Math.floor(p0.x / TS), pty = Math.floor(p0.y / TS);
      search: for (let r = 1; r <= 3; r++) for (const [dx, dy] of S2M2_RING) {
        const tx = ptx + dx * r, ty = pty + dy * r;
        if (s2m2_free(tx, ty) && los(p0.x, p0.y, tx * TS + 8, ty * TS + 8)) { x = tx * TS + 8; y = ty * TS + 8; break search; }
      }
    }
    G.modState.escort = {
      gz: { x, y, r: 5, a: 0, walkT: 0, hp: 4, maxHp: 4, inv: 0, stains: 1, spillT: 7, sayText: 'GEHEN WIR, LIL! ICH BLEIB DICHT HINTER DIR.', sayT: 3, pathT: 0, force: 0 },
      mode: 'f', calm: 0, left: 0, atExit: 0, dead: 0, deadT: 0, killed: 0, ff: 0, said: 0,
    };
  },
  update(dt) {
    const s = G.modState.escort;
    if (!s) return;
    const gz = s.gz;
    gz.sayT -= dt; gz.inv -= dt; s.ff -= dt;
    if (s.dead) {
      s.deadT += dt;
      if (s.deadT > 1.6 && !s.killed) {   // Gunzer tot = Etage verloren
        s.killed = 1;
        for (const p of G.players) if (p.alive) { p.armor = 0; p.invT = 0; killPlayer(null, 0, 's2m2_gunzer', p); }
      }
      if (s.deadT > 4 && G.players.some((p) => p.alive)) {   // nur im Gott-Modus möglich: wieder aufstehen statt festzustecken
        Object.assign(s, { dead: 0, deadT: 0, killed: 0, mode: 'f' }); gz.hp = gz.maxHp; s2m2_gSay(gz, 'ICH LEBE NOCH! GLAUB ICH.');
      }
      return;
    }
    // [E] bei Gunzer: WARTE / KOMM (lokale Spieler; Online-Gäste holen ihn durch Hinlaufen)
    for (const p of G.players) {
      if (!p.alive || p.nfx !== undefined) continue;
      const key = p.idx === 0 ? pressed.KeyE : (pressed.KeyL || pressed.Numpad4);
      if (!key || dist(p.x, p.y, gz.x, gz.y) > 30) continue;
      if (s.mode === 'w') { s.mode = 'f'; floatText(p.x, p.y - 18, 'KOMM!', '#7dff7a', true); s2m2_gSay(gz, pick(S2M2_G_COME)); }
      else { s.mode = 'w'; s.left = 0; floatText(p.x, p.y - 18, 'WARTE HIER!', '#ffe14d', true); s2m2_gSay(gz, pick(S2M2_G_WAIT)); }
      Sound.play('select');
      const f0 = S2M2_FOCUS.get(p);
      if (f0 !== undefined && p.focus < f0) { p.focus = f0; G.focusT = 0; }   // die Zeitlupe nicht aus Versehen verbrauchen
      break;
    }
    for (const p of G.players) S2M2_FOCUS.set(p, p.focus);
    // Gefahr: ein alarmierter Gegner sieht Gunzer
    let danger = false;
    for (const e of G.enemies) {
      if (e.state !== 'alert' || e.kind === 'O' || dist(e.x, e.y, gz.x, gz.y) > 240) continue;
      if (los(e.x, e.y, gz.x, gz.y)) { danger = true; break; }
    }
    if (s.mode === 'f' && danger) { s.mode = 'h'; s.calm = 0; gz.path = null; s2m2_gSay(gz, pick(S2M2_G_HIDE), 1.8); }
    else if (s.mode === 'h') { s.calm = danger ? 0 : s.calm + dt; if (s.calm > 1.1) { s.mode = 'f'; s2m2_gSay(gz, pick(S2M2_G_GO), 1.6); } }
    const tp = nearestPlayer(gz.x, gz.y), td = tp ? dist(gz.x, gz.y, tp.x, tp.y) : 1e9;
    if (s.mode === 'w' && tp) {
      if (td > 48) s.left = 1;
      else if (s.left && td < 16) { s.mode = 'f'; s2m2_gSay(gz, pick(S2M2_G_COME)); }
    }
    // hinterherlaufen
    if (s.mode === 'f' && tp) {
      if (td > 28) {
        const step = (td > 110 ? 128 : 98) * dt;
        gz.force -= dt;
        if (gz.force <= 0 && td < 170 && los(gz.x, gz.y, tp.x, tp.y)) {
          gz.path = null;
          const m = moveToward(gz, tp.x, tp.y, step);
          gz.a = turnTo(gz.a, Math.atan2(tp.y - gz.y, tp.x - gz.x), 10 * dt); gz.walkT += dt;
          if (m < step * 0.3) gz.force = 1.2;   // hängt an Tisch/Kiste -> eine Weile den Weg suchen
        } else {
          gz.pathT -= dt;
          if (!gz.path || gz.pathT <= 0) { gz.path = findPath(gz.x, gz.y, tp.x, tp.y); gz.pathT = 0.5; }
          if (gz.path) followPath(gz, step, dt);
        }
      } else gz.a = turnTo(gz.a, Math.atan2(tp.y - gz.y, tp.x - gz.x), 6 * dt);
      if (td > 420 && gz.sayT <= 0) s2m2_gSay(gz, 'LIL?! WARTE AUF MICH!', 2);
    }
    for (const p of G.players) {   // nicht ineinander stehen
      if (!p.alive) continue;
      const d = dist(p.x, p.y, gz.x, gz.y);
      if (d < 10 && d > 0.01) moveEntity(gz, (gz.x - p.x) / d * (10 - d), (gz.y - p.y) / d * (10 - d));
    }
    // Kugeln: Gegner-Kugeln treffen, eigene fliegen vorbei (er duckt sich)
    for (const b of G.bullets) {
      if (b.dead || !s2m2_segHit(b, gz.x, gz.y, 6)) continue;
      if (b.owner === 'player') { if (s.ff <= 0) { s.ff = 2; s2m2_gSay(gz, pick(S2M2_G_FF), 1.4); } continue; }
      b.dead = true;
      if (gz.inv > 0) continue;
      gz.hp--; gz.inv = 0.6; gz.stains = Math.min(gz.stains + 1, 8);
      sparks(gz.x, gz.y, 10, '#ff9a1a'); shake(3); Sound.play('bonk');
      if (gz.hp <= 0) {
        s.dead = 1; s.deadT = 0; gz.path = null; gz.a = Math.atan2(b.vy, b.vx);
        s2m2_gSay(gz, 'ICH HAB MICH... ZUM LETZTEN MAL... ANGEGUNZT...', 3);
        floatText(gz.x, gz.y - 30, 'GUNZER IST UMGEKIPPT!', '#ff4a4a'); Sound.play('death'); shake(8);
        return;
      }
      floatText(gz.x, gz.y - 26, 'GUNZER: ' + gz.hp + ' LEBEN', '#ff9a1a', true);
      s2m2_gSay(gz, pick(S2M2_G_HIT), 1.4);
    }
    // Running Gag: kleckert sich voll
    gz.spillT -= dt;
    if (gz.spillT <= 0) {
      gz.spillT = rand(10, 16); gz.stains = Math.min(gz.stains + 1, 8);
      s2m2_gSay(gz, pick(S2M2_G_SPILL), 2.4);
      sparks(gz.x, gz.y, 8, '#ff9a1a'); Sound.play('splat');
    }
    // Ausgang erst mit Gunzer
    s.atExit = !G.exits.length || G.exits.some((i) => dist(gz.x, gz.y, (i % G.w) * TS + 8, ((i / G.w) | 0) * TS + 8) < 44) ? 1 : 0;
    if (s.atExit && !G.cleared) {
      checkClear();
      if (G.cleared && !s.said) { s.said = 1; s2m2_gSay(gz, 'AUSGANG! ICH HAB AUCH NUR EIN BISSCHEN GEKLECKERT.', 2.6); }
    }
  },
  canClear() { const s = G.modState.escort; return !s || (!s.dead && !!s.atExit); },
  draw(g) {
    const s = G.modState.escort;
    if (!s || !s.gz) return;
    const gz = s.gz, P = s2m2_smooth('gz', gz.x, gz.y);
    if (s.dead) {
      g.save(); g.translate(Math.round(P.x), Math.round(P.y)); g.rotate(gz.a || 0);
      drawLyingBody(g, { suit: '#c41f2a', skin: '#f0c8a0', hair: '#4a2a12' });
      g.fillStyle = '#ff9a1a'; g.fillRect(-6, -2, 3, 2); g.fillRect(-3, 2, 2, 2); g.fillRect(9, 4, 4, 3);
      g.restore();
    } else {
      g.strokeStyle = `rgba(125,255,122,${(0.45 + 0.25 * Math.sin(T * 5)).toFixed(2)})`; g.lineWidth = 1;
      g.beginPath(); g.arc(P.x, P.y + 1, 9, 0, TAU); g.stroke();
      if (!(gz.inv > 0 && Math.floor(T * 20) % 2)) {
        s2m2_drawPerson(g, { x: P.x, y: P.y, a: gz.a, walkT: gz.walkT, suit: '#c41f2a', skin: '#f0c8a0', hair: '#4a2a12', cap: '#ff9a1a', pants: '#2a3a6a', stains: gz.stains, pose: s.mode === 'h' ? 2 : 0, carton: true });
      }
      for (let i = 0; i < gz.maxHp; i++) { g.fillStyle = i < gz.hp ? '#ff9a1a' : '#3a2a1a'; g.fillRect(Math.round(P.x) - gz.maxHp * 2 + i * 4, Math.round(P.y) - 13, 3, 2); }
      if (s.mode === 'w' && !(gz.sayT > 0)) txt('WARTET', P.x, P.y + 9, { g, font: FS, align: 'center', color: '#ffe14d' });
    }
    if (gz.sayT > 0 && gz.sayText) txt(gz.sayText, P.x, P.y - 24, { g, font: FS, align: 'center', color: '#ffd23f' });
    else if (!s.dead) txt('GUNZER', P.x, P.y - 21, { g, font: FS, align: 'center', color: '#ff9a1a' });
  },
  drawScreen(g) {
    const s = G.modState.escort;
    if (!s || !s.gz) return;
    s2m2_edgeArrow(g, s.gz.x, s.gz.y, '#ff9a1a', 'GUNZER');
    if (!s.dead && !s.atExit && !G.cleared && s2m2_allDead() && G.exits.length) {
      let best = null, bd = 1e9;
      for (const i of G.exits) { const ex = (i % G.w) * TS + 8, ey = ((i / G.w) | 0) * TS + 8, d = dist(s.gz.x, s.gz.y, ex, ey); if (d < bd) { bd = d; best = [ex, ey]; } }
      s2m2_edgeArrow(g, best[0], best[1], '#7dff7a', 'AUSGANG');
    }
  },
  hud() {
    const s = G.modState.escort;
    if (!s || !s.gz) return;
    const y = s2m2_hudY('escort'), gz = s.gz;
    let t = s.dead ? 'GUNZER IST UMGEKIPPT!' : s.mode === 'w' ? 'GUNZER WARTET ([E] = KOMM!)' : s.mode === 'h' ? 'GUNZER IN DECKUNG!' : 'GUNZER FOLGT DIR ([E] = WARTE)';
    if (!s.dead && !s.atExit && !G.cleared && s2m2_allDead() && Math.floor(T * 3) % 2) t = 'BRING GUNZER ZUM AUSGANG!';
    const w = txt(t, W / 2 - 18, y, { font: FS, align: 'center', color: s.dead ? '#ff4a4a' : '#ff9a1a' });
    for (let i = 0; i < gz.maxHp; i++) drawHeart(ctx, Math.round(W / 2 - 18 + w / 2 + 6 + i * 9), y, 1, i < gz.hp && !s.dead ? '#ff9a1a' : '#3a2a1a');
    s2m2_hint('escort', ['ESKORTE: GUNZER!', 'GUNZER FOLGT DIR. [E] BEI IHM = WARTE / KOMM.', 'ER MUSS LEBEND MIT ZUM AUSGANG!']);
  },
};
