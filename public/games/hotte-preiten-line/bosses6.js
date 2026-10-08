'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - STAFFEL 2: DJ BASSDROP, OMA TURBO, MR. BITTER
//   DJ BASSDROP  -> alle 3 Boxen ausstecken (bevor er sie wieder einsteckt) -> Stille -> wehrlos
//   OMA TURBO    -> Saftkanister umhauen, Oma beim Turbo-Anlauf durch die Pfütze locken -> ausgerutscht
//   MR. BITTER   -> Finale in 3 Phasen:
//                   1 ANZUG: O-Saft-Sprinkler aufdrehen, wenn er (oder sein Sturmangriff) drin ist
//                   2 ZITRONEN-MECH: Stampf-Sprung auf eine Wartungsluke locken -> steckt fest
//                   3 TEBLEEDD-MAX-KERN: hinter einen Spiegel stellen -> Strahl kommt zurück -> Überlastung
//  Alles hängt über BOSS_EXT / PROP_HIT / HAZ_UPDATE / BULLET_DRAW (hooks.md §7, §8.2).
//  Zustand nur als einfache Daten am Boss bzw. in G.hazards (Online-Koop).
//  S2_BOSS_FLOORS.dj / .oma / .bitter = fertige Boss-Etagen für die Level-Dateien.
// =====================================================================

Object.assign(BOSS_INFO, {
  dj: { name: 'DJ BASSDROP', hp: 72, r: 10, song: 'disco', noGore: true, koText: 'K.O.! LICHT AN, PARTY AUS. ALLE NACH HAUSE!' },
  oma: { name: 'OMA TURBO', hp: 76, r: 10, song: 'boss', noGore: true, koText: 'K.O.! OMA MACHT JETZT IHR MITTAGSSCHLÄFCHEN...' },
  bitter: { name: 'MR. BITTER', hp: 120, r: 10, song: 'final', noGore: true, koText: 'K.O.! BITTERLEMON INC. IST PLEITE!' },
});
// Staffel-2-Lieder benutzen, sobald die Musik-Datei sie registriert hat (sonst eingebaute)
for (const [id, s2, fb] of [['dj', 's2_disco', 'disco'], ['oma', 's2_boss', 'boss'], ['bitter', 's2_finale', 'final']]) {
  Object.defineProperty(BOSS_INFO[id], 'song', { enumerable: true, configurable: true, get: () => (Sound.hasSong && Sound.hasSong(s2) ? s2 : fb) });
}
const b6_BIT_WEAK = ['', 'DREH DEN O-SAFT-SPRINKLER AUF, WENN ER DRIN STEHT!', 'LOCK SEINEN STAMPF-SPRUNG AUF EINE LUKE!', 'STELL DICH HINTER EINEN SPIEGEL!'];
Object.assign(BOSS_WEAK, {
  dj: 'ZIEH DEN STECKER AN ALLEN 3 BOXEN - OHNE BASS IST ER NIX!',
  oma: 'KIPP DIE SAFTKANISTER UM - LASS SIE REINRASEN!',
});
Object.defineProperty(BOSS_WEAK, 'bitter', { enumerable: true, configurable: true, get: () => b6_BIT_WEAK[(G.boss && G.boss.btype === 'bitter' && G.boss.phase) || 1] || b6_BIT_WEAK[1] });
Object.assign(L_BOSS, {
  dj: ['YO YO YO!', 'HÄNDE IN DIE LUFT!', 'LAUTER! LAUTER!', 'DER BASS IST MEIN SCHILD!', 'DROP IT LIKE IT\'S HOT!', 'WUMM WUMM WUMM!', 'NUR NOCH EIN SONG! (LÜGE)'],
  oma: ['FRÜHER WAR ALLES BESSER!', 'IN MEINEM ALTER?! JAWOLL!', 'ISS WAS, DU BIST GANZ DÜNN!', 'TURBOOOO!', 'ICH HAB DEN KRIEG ÜBERLEBT, MEIN JUNGE!', 'KEKS? NEIN? DANN EBEN SO!'],
  bitter: ['DAS LEBEN IST BITTER.', 'SÜSS IST FÜR VERLIERER!', 'ICH KAUFE DEINE STADT!', 'BITTERLEMON - ODER NICHTS!', 'DEIN O-SAFT IST GESCHICHTE!', 'GEWINNE SIND BITTER. UND SCHÖN.'],
});
Object.assign(CAUSE, {
  dj: 'DJ BASSDROP', b6floor: 'TANZFLÄCHEN-BASS', b6bass: 'DER BASS-DROP',
  oma: 'OMA TURBO', b6rollator: 'TURBO-ROLLATOR', b6teeth: 'OMAS DRITTE ZÄHNE', b6cookie: 'STEINHARTER BUTTERKEKS', b6needle: 'STRICKNADEL',
  bitter: 'MR. BITTER', b6case: 'AKTENKOFFER', b6stomp: 'ZITRONEN-MECH', b6orb: 'BITTER-PLASMA', b6beam: 'TEBLEEDD-MAX-STRAHL',
});

// ---------- Geräusche ----------
Sound.addSfx('b6_kick', (v = 1) => { const { tone, now } = Sound.synth, t = now(); tone({ type: 'sine', f: 130, f2: 38, slide: 0.12, dur: 0.15, vol: 0.3 * v, t }); });
Sound.addSfx('b6_scratch', () => { const { noise, now } = Sound.synth, t = now(); noise({ dur: 0.12, ft: 'bandpass', f: 700, f2: 2600, vol: 0.18, t }); noise({ dur: 0.1, ft: 'bandpass', f: 2600, f2: 600, vol: 0.15, t: t + 0.12 }); });
Sound.addSfx('b6_rev', () => { const { tone, now } = Sound.synth, t = now(); tone({ type: 'sawtooth', f: 60, f2: 240, slide: 0.7, dur: 0.75, vol: 0.12, lp: 900, t }); });

// ---------- Hilfen ----------
function b6_arena() { return { x0: 1, y0: 1, x1: G.w - 2, y1: arenaBottom() - 1 }; }
function b6_clearHaz(kinds) { if (G.hazards) for (const h of G.hazards) if (kinds.includes(h.kind)) h.dead = true; }
function b6_stunFx(e, col) { if (Math.random() < 0.3) G.parts.push({ x: e.x + rand(-6, 6), y: e.y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-30, -5), life: 0.4, col, s: 1, kind: 'spark' }); }
function b6_recover(e, line) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); e.shootT = 1; if (line) say(e, line, 1.8); }
function b6_killNear(x, y, r, cause, src) {
  for (const p of G.players) if (p.alive && dist(p.x, p.y, x, y) < r + p.r) killPlayer(src || G.boss, Math.atan2(p.y - y, p.x - x), cause, p);
}
// Gegner auf Abstand halten / Seitwärts tänzeln (gemeinsam für DJ + Mr. Bitter)
function b6_strafe(e, p, pd, pa, sp, near, far, dt) {
  if (!los(e.x, e.y, p.x, p.y)) { bChase(e, p, sp, dt, 40); return; }
  if (pd > far) moveToward(e, p.x, p.y, sp);
  else if (pd < near) moveEntity(e, -Math.cos(pa) * sp, -Math.sin(pa) * sp);
  const side = e.sweep || 1, m = moveEntity(e, Math.cos(pa + Math.PI / 2) * sp * 0.75 * side, Math.sin(pa + Math.PI / 2) * sp * 0.75 * side);
  if (m < sp * 0.3) e.sweep = -side;
  e.walkT += dt;
}
// Strahl (Strecke) trifft Punkt?
function b6_segHit(x, y, a, len, px, py, r) {
  const dx = px - x, dy = py - y, along = dx * Math.cos(a) + dy * Math.sin(a);
  if (along < 0 || along > len) return false;
  return Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) < r;
}
// Sturmangriff geradeaus; liefert true, wenn eine Wand gestoppt hat
function b6_dashStep(e, sp, dt) {
  const want = sp * dt, m = moveEntity(e, Math.cos(e.ca) * want, Math.sin(e.ca) * want);
  e.walkT += dt * 2;
  for (const q of G.players) if (q.alive && dist(q.x, q.y, e.x, e.y) < e.r + q.r + 2) killPlayer(e, e.ca, e.btype === 'oma' ? 'b6rollator' : e.btype, q);
  return m < want * 0.4;
}
function b6_inHaz(kind, x, y, pad) { return (G.hazards || []).find((h) => h.kind === kind && !h.dead && dist(x, y, h.x, h.y) < h.r + pad); }
// gestrichelte Warnlinie (Anlauf)
function b6_dashLine(g, e, col) {
  const len = Math.min(beamLength(e.x, e.y, e.a), 420);
  g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([5, 4]);
  g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(e.a) * len, e.y + Math.sin(e.a) * len); g.stroke();
  g.setLineDash([]); g.lineWidth = 1;
}

// ---------- Kugeln ----------
BULLET_DRAW.b6teeth = (g, b) => {
  const x = Math.round(b.x), y = Math.round(b.y), o = Math.floor(T * 12) % 2;
  g.fillStyle = '#ff7a9a'; g.fillRect(x - 3, y - 2 + o, 7, 4); g.fillStyle = '#ffffff'; g.fillRect(x - 3, y - 2 + o, 1, 2); g.fillRect(x - 1, y - 2 + o, 1, 2); g.fillRect(x + 1, y - 2 + o, 1, 2); g.fillRect(x + 3, y - 2 + o, 1, 2);
  return true;
};
BULLET_DRAW.b6cookie = (g, b) => { const x = Math.round(b.x), y = Math.round(b.y); pxEll(g, x, y, 3, 3, '#d8a050'); g.fillStyle = '#8a5a20'; g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); return true; };
BULLET_DRAW.b6needle = (g, b) => {
  const a = Math.atan2(b.vy, b.vx); g.strokeStyle = '#c8d0e0'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(b.x - Math.cos(a) * 5, b.y - Math.sin(a) * 5); g.lineTo(b.x + Math.cos(a) * 2, b.y + Math.sin(a) * 2); g.stroke();
  g.fillStyle = '#ff3fa4'; g.fillRect(Math.round(b.x - Math.cos(a) * 5) - 1, Math.round(b.y - Math.sin(a) * 5) - 1, 2, 2);
  return true;
};
BULLET_DRAW.b6orb = (g, b) => { const x = Math.round(b.x), y = Math.round(b.y); pxEll(g, x, y, 4, 4, '#3a6a10'); pxEll(g, x, y, 3, 3, '#d8ff3a'); g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 1, 1); return true; };

// =====================================================================
//  DJ BASSDROP - Angriffe im Takt; die 3 Boxen sind sein Schild
// =====================================================================
const b6_DJ_BOX = [[0.08, 0.15], [0.92, 0.15], [0.5, 0.92]];
const b6_beatLen = (e) => (e.hp < e.maxHp / 2 ? 0.4 : 0.5);
const b6_boxesOn = (e) => (e.boxes || []).filter((q) => q.on).length;
function b6_boxOf(b, o) { if (!b || !b.boxes) return null; let best = null, bd = 12; for (const q of b.boxes) { const d = dist(q.x, q.y, o.x, o.y); if (d < bd) { bd = d; best = q; } } return best; }
// Tanzflächen-Muster: Zellen aus 2x2 Kacheln
function b6_floorCell(h, tx, ty) {
  if (tx < h.x0 || ty < h.y0 || tx > h.x1 || ty > h.y1 || G.solid[ty * G.w + tx]) return false;
  const cx = Math.floor((tx - h.x0) / 2), cy = Math.floor((ty - h.y0) / 2);
  return ((h.pat === 'rows' ? cy : h.pat === 'cols' ? cx : cx + cy) & 1) === h.par;
}
function b6_floorPat(e, k) {
  const A = b6_arena(), bl = b6_beatLen(e);
  G.hazards.push({ kind: 'b6floor', x0: A.x0, y0: A.y0, x1: A.x1, y1: A.y1, pat: e.pat, par: k % 2, t: bl * 2, max: bl * 2, hot: 0.3 });
}
HAZ_UPDATE.b6floor = (h, dt) => {
  h.t -= dt;
  if (h.t > 0) return;
  if (!h.boom) { h.boom = 1; Sound.play('b6_kick', 1.5); shake(3); }
  for (const p of G.players) if (p.alive && b6_floorCell(h, Math.floor(p.x / TS), Math.floor(p.y / TS))) killPlayer(G.boss, 0, 'b6floor', p);
  h.hot -= dt; if (h.hot <= 0) h.dead = true;
};
HAZ_DRAW.b6floor = (g, h) => {
  if (h.dead) return;
  const hot = h.t <= 0, k = hot ? 1 : clamp(1 - h.t / h.max, 0, 1);
  g.fillStyle = hot ? 'rgba(255,235,255,0.8)' : `rgba(255,40,150,${0.1 + 0.25 * k + (Math.floor(T * 8) % 2 ? 0.06 : 0)})`;
  for (let ty = h.y0; ty <= h.y1; ty++) for (let tx = h.x0; tx <= h.x1; tx++) if (b6_floorCell(h, tx, ty)) g.fillRect(tx * TS, ty * TS, TS, TS);
};
HAZ_UPDATE.b6boom = (h, dt) => {
  h.t -= dt;
  if (h.t > 0) return;
  h.dead = true; shake(8); Sound.play('explode'); Sound.play('b6_kick', 2);
  for (let i = 0; i < 18; i++) { const a = i * TAU / 18; sparks(h.x + Math.cos(a) * h.r, h.y + Math.sin(a) * h.r, 2, pick(['#ff3fa4', '#3fd0ff', '#ffffff'])); }
  b6_killNear(h.x, h.y, h.r - 4, 'b6bass');
  for (const o of G.enemies) if (o.state !== 'dead' && o.kind !== 'B' && !o.static && dist(o.x, o.y, h.x, h.y) < h.r) killEnemy(o, 'friendly', 0);
};
HAZ_DRAW.b6boom = (g, h) => {
  if (h.dead) return;
  const k = clamp(1 - h.t / h.max, 0, 1), x = Math.round(h.x), y = Math.round(h.y);
  g.strokeStyle = `rgba(255,60,160,${0.5 + Math.sin(T * 30) * 0.4})`; g.lineWidth = 1; g.setLineDash([4, 3]);
  g.beginPath(); g.arc(x, y, h.r, 0, TAU); g.stroke(); g.setLineDash([]);
  g.fillStyle = `rgba(255,40,140,${0.08 + 0.22 * k})`; g.beginPath(); g.arc(x, y, h.r * k, 0, TAU); g.fill();
};

BOSS_EXT.dj = {
  taunts: ['DU HAST DEN TAKT VERLOREN!', 'UND DAS WAR DEIN LETZTER TANZ!', 'DJ BASSDROP - 1, DU - 0!'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; e.beat = 0; e.bt = 0.5; e.pulse = 0; say(e, 'YO YO YO! DJ BASSDROP IM HAUS! HÄNDE HOCH - ODER ICH DROP DICH!', 3); Sound.play('boss'); },
  setup(e) {
    e.boxes = [];
    for (const [fx, fy] of b6_DJ_BOX) { const s = arenaSpotAt(fx, fy); if (!s) continue; const o = spawnProp('b6box', s[0], s[1]); o.r = 8; o.suit = '#1a1a22'; e.boxes.push({ x: s[0], y: s[1], on: 1, t: 0 }); }
  },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y), bl = b6_beatLen(e), on = b6_boxesOn(e);
    // der Takt
    let beat = false;
    e.bt -= dt; e.pulse = Math.max(0, (e.pulse || 0) - dt * 4);
    if (e.bt <= 0) { e.bt += bl; e.beat = (e.beat || 0) + 1; beat = true; if (on && e.mode !== 'stunned') { Sound.play('b6_kick', 0.35 + 0.2 * on); e.pulse = 1; } }
    // ausgesteckte Boxen steckt er nach einer Weile wieder ein
    if (e.mode !== 'stunned') for (const q of e.boxes || []) if (!q.on) {
      q.t -= dt;
      if (q.t <= 0) { q.on = 1; q.t = 0; sparks(q.x, q.y, 10, '#3fd0ff'); Sound.play('zap'); say(e, pick(['WIEDER EINGESTECKT! HEHE!', 'FUNK-STECKDOSE, BABY!', 'DER BASS LEBT!']), 1.3); }
    }
    switch (e.mode) {
      case 'walk':
        e.a = turnTo(e.a, pa, 4 * dt);
        b6_strafe(e, p, pd, pa, (angry ? 48 : 38) * dt, 85, 140, dt);
        if (beat && sees && e.beat % 2 === 0) {
          const n = 1 + 2 * Math.ceil(on / 2) + (angry ? 2 : 0); bFan(e, pa, n, 0.17 * (n - 1), 125, 'note', 'note'); Sound.play('throwIt');   // mehr Boxen = mehr Noten
          if (Math.random() < 0.2) say(e, pick(L_BOSS.dj), 1.2);
        }
        e.modeT -= dt;
        if (e.modeT <= 0 && beat) {
          e.attack = ((e.attack || 0) + 1) % 3;
          if (e.attack === 1) { e.mode = 'floor'; e.fl = 0; e.flN = angry ? 4 : 3; e.pat = pick(['checker', 'rows', 'cols']); e.modeT = bl * 2; b6_floorPat(e, 0); say(e, 'TANZFLÄCHE! HÜPF IM TAKT!', 1.6); Sound.play('b6_scratch'); }
          else if (e.attack === 2) {
            e.mode = 'drop'; e.cnt = 4; e.modeT = bl * 4;
            for (const q of e.boxes || []) if (q.on) G.hazards.push({ kind: 'b6boom', x: q.x, y: q.y, r: 62, t: bl * 4, max: bl * 4 });
            G.hazards.push({ kind: 'b6boom', x: e.x, y: e.y, r: 44, t: bl * 4, max: bl * 4 });
            say(e, 'ACHTUNG... DER DROP KOMMT!', 1.4); Sound.play('boss_attack');
          } else { e.mode = 'scratch'; e.modeT = bl * 6; e.spinA = pa; e.shootT = 0; say(e, 'WIKI-WIKI-WIKI!', 1.2); }
        }
        break;
      case 'floor':
        e.walkT += dt * 2; e.a = turnTo(e.a, pa, 3 * dt); e.modeT -= dt;
        if (angry && beat && sees && e.beat % 4 === 0) bShot(e, pa, 120, 'note', 'note');
        if (e.modeT <= 0) {
          e.fl++;
          if (e.fl < e.flN) { b6_floorPat(e, e.fl); e.modeT = bl * 2; if (e.fl === e.flN - 1) say(e, 'UND NOCHMAL!', 0.8); }
          else b6_recover(e);
        }
        break;
      case 'drop':
        e.a = turnTo(e.a, pa, 3 * dt); e.modeT -= dt;
        if (beat) { e.cnt--; say(e, e.cnt > 0 ? String(e.cnt) + '...' : 'DROP!!!', 0.6); Sound.play('blip'); }
        if (e.modeT <= 0) { bRing(e, angry ? 18 : 14, 105, 'note', 'note', 4); b6_recover(e); }
        break;
      case 'scratch':
        e.modeT -= dt; e.spinA += dt * (angry ? 2.8 : 2.2); e.a = e.spinA; e.shootT -= dt; e.walkT += dt;
        if (beat) Sound.play('b6_scratch');
        if (e.shootT <= 0) { e.shootT = 0.12; bShot(e, e.spinA, 110, 'note', 'note'); bShot(e, e.spinA + Math.PI, 110, 'note', 'note'); }
        if (e.modeT <= 0) b6_recover(e);
        break;
      case 'stunned':
        e.modeT -= dt; b6_stunFx(e, '#ff3fa4');
        if (e.modeT <= 0) {
          for (const q of e.boxes || []) { q.on = 1; q.t = 0; sparks(q.x, q.y, 10, '#3fd0ff'); }
          for (const o of propsOf('b6box')) o.cd = 1.5;
          b6_recover(e, pick(['UND DER BASS IST ZURÜÜÜCK!', 'NIEMAND STOPPT DIE PARTY!', 'REMIX! JETZT ERST RECHT!']));
          Sound.play('boss_attack');
        }
        break;
    }
    bTouch(e, p, pa, pd, 'dj');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'TÜRSTEHER! SCHMEISST IHN RAUS!', 2); spawnMinions('E', 2); }
  },
  draw(g, e) {
    const s = Math.round(Math.sin(e.walkT * 12) * 3), bob = e.mode === 'stunned' ? 0 : Math.round((e.pulse || 0) * 1.5);
    g.fillStyle = '#111'; g.fillRect(-4 + s, -9, 6, 4); g.fillRect(-4 - s, 5, 6, 4);
    pxEll(g, -1, 0, 9 + bob, 10 + bob, '#2a0a4a'); pxEll(g, 0, 0, 8 + bob, 9 + bob, '#7a2aff');
    g.fillStyle = '#ffd84a'; for (const [a, b] of [[-5, -5], [-3, 4], [-6, 1], [-2, -2]]) g.fillRect(a, b, 1, 1);
    g.fillStyle = '#7a2aff'; g.fillRect(2, -11, 8, 3); g.fillRect(2, 8, 8, 3);
    g.fillStyle = '#c88a5a'; g.fillRect(10, -11, 2, 3); g.fillRect(10, 8, 2, 3);
    if (e.mode !== 'stunned') { pxEll(g, 13, 0, 5, 5, '#111'); pxEll(g, 13, 0, 2, 2, '#ff3fa4'); g.fillStyle = '#444'; g.fillRect(11, -3, 1, 1); }
    g.fillStyle = '#ffd84a'; g.fillRect(4, -4, 1, 8);
    pxEll(g, 0, 0, 5, 5, '#c88a5a'); pxEll(g, -1, 0, 5, 5, '#ff3fa4'); g.fillStyle = '#ff3fa4'; g.fillRect(-9, -2, 4, 4);
    g.fillStyle = '#222'; g.fillRect(-2, -8, 4, 3); g.fillRect(-2, 5, 4, 3); g.fillStyle = '#555'; g.fillRect(-1, -6, 2, 12);
    g.fillStyle = '#111'; g.fillRect(3, -4, 2, 8); g.fillStyle = '#3fd0ff'; g.fillRect(4, -3, 1, 2);
  },
  hud(b) {
    const n = (b.boxes || []).length, on = b6_boxesOn(b), x0 = W / 2 - n * 7;
    txt('BASS-BOXEN AN: ' + on + '/' + n, W / 2, 46, { font: FS, align: 'center', color: on ? '#ff3fa4' : '#7dff7a' });
    (b.boxes || []).forEach((q, i) => { ctx.fillStyle = q.on ? '#ff3fa4' : '#3a3a44'; ctx.fillRect(x0 + i * 14, 56, 10, 6); });
  },
};
PROP_HIT.b6box = (o, b, live, stun) => {
  if (!live) return;
  const q = b6_boxOf(b, o);
  if (!q) return;
  if (b.mode === 'stunned') { if (T - (o.msgT || -9) > 1) { o.msgT = T; floatText(o.x, o.y - 18, 'ER IST SCHON STUMM - DRAUF!', '#7dff7a', true); } return; }
  if (!q.on) { if (T - (o.msgT || -9) > 1) { o.msgT = T; floatText(o.x, o.y - 18, 'SCHON AUS!', '#888888', true); } return; }
  q.on = 0; q.t = b.hp < b.maxHp / 2 ? 7 : 9; o.cd = 0.4;
  Sound.play('click'); Sound.play('glitch'); sparks(o.x, o.y, 12, '#3fd0ff'); floatText(o.x, o.y - 18, 'STECKER GEZOGEN!', '#3fd0ff');
  const left = b6_boxesOn(b);
  if (!left) { b6_clearHaz(['b6floor', 'b6boom']); stun(3.6, pick(['WO... WO IST MEIN BASS?!', 'STILLE?! ICH HASSE STILLE!', 'NEIN! NICHT DER BASS!'])); Sound.play('b6_scratch'); }
  else say(b, pick(['HEY! MEINE BOX!', 'FINGER WEG VOM KABEL!', 'DAS WAR EIN 5000-EURO-KABEL!']) + ' (' + left + ' AN)', 1.3);
};
PROP_DRAW.b6box = (g, o, x, y, off, blink) => {
  const b = G.boss, q = b6_boxOf(b, o), on = q ? q.on : 1, pu = on && b ? (b.pulse || 0) : 0;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 7, y + 7, 15, 3);
  g.fillStyle = '#0c0c12'; g.fillRect(x - 8, y - 9, 16, 18); g.fillStyle = '#26262e'; g.fillRect(x - 7, y - 8, 14, 16);
  pxEll(g, x, y + 2, 5 + Math.round(pu), 5 + Math.round(pu), '#111'); pxEll(g, x, y + 2, 2, 2, on ? '#ff3fa4' : '#444');
  pxEll(g, x, y - 5, 2, 2, '#111');
  g.fillStyle = on ? (Math.floor(T * 4) % 2 ? '#7dff7a' : '#3a8a3a') : '#ff2a3a'; g.fillRect(x + 5, y - 8, 2, 2);
  // Kabel + Stecker
  g.strokeStyle = '#111'; g.beginPath(); g.moveTo(x + 8, y + 6); g.lineTo(x + 12, y + 10); g.stroke();
  g.fillStyle = '#e8e8f0'; g.fillRect(on ? x + 11 : x + 15, on ? y + 9 : y + 12, 3, 3);
  if (on && pu > 0.3) { g.strokeStyle = `rgba(255,63,164,${pu * 0.6})`; g.beginPath(); g.arc(x, y, 12 + (1 - pu) * 10, 0, TAU); g.stroke(); }
  if (!on && q) txt(String(Math.max(0, Math.ceil(q.t))), x, y - 20, { g, font: FS, align: 'center', color: '#ff2a3a' });
  else if (blink) txt('!', x, y - 22, { g, font: FS, align: 'center', color: '#ff3fa4' });
};

// =====================================================================
//  OMA TURBO - Rollator-Raserin der Seniorenresidenz Abendrot
// =====================================================================
const b6_OMA_KAN = [[0.15, 0.25], [0.85, 0.25], [0.22, 0.8], [0.78, 0.8]];
HAZ_UPDATE.b6pud = (h, dt) => { h.t -= dt; if (h.t <= 0) h.dead = true; };
HAZ_DRAW.b6pud = (g, h) => {
  if (h.dead || (h.t < 2 && Math.floor(T * 8) % 2)) return;
  const x = Math.round(h.x), y = Math.round(h.y);
  g.fillStyle = 'rgba(255,140,20,0.55)'; g.beginPath(); g.ellipse(x, y, h.r, h.r * 0.75, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,190,60,0.6)'; g.beginPath(); g.ellipse(x - 5, y - 3, h.r * 0.5, h.r * 0.3, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x - 8, y - 6, 3, 1); g.fillRect(x + 6, y + 2, 2, 1);
};
BOSS_EXT.oma = {
  taunts: ['UND JETZT AB INS BETT, JUNGER MANN!', 'IN MEINEM ALTER - UND IMMER NOCH SCHNELLER ALS DU!', 'DAS HAST DU VON DEINER FRECHHEIT!'],
  activate(e) { e.mode = 'walk'; e.modeT = 3; say(e, 'HIER WIRD NICHT GERANNT, JUNGER MANN! ...AUSSER VON MIR!', 3); Sound.play('boss'); },
  setup(e) { e.kanT = 6; for (const [fx, fy] of b6_OMA_KAN) { const s = arenaSpotAt(fx, fy); if (s) { const o = spawnProp('b6kan', s[0], s[1]); o.r = 7; } } },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
    // neue Kanister liefern lassen
    if (e.mode !== 'stunned' && propsOf('b6kan').length < 2) {
      e.kanT -= dt;
      if (e.kanT <= 0) { e.kanT = 6; const s = randomArenaSpot(80); if (s) { const o = spawnProp('b6kan', s[0], s[1]); o.r = 7; floatText(s[0], s[1] - 16, 'SAFT-LIEFERUNG!', '#ff9a1a', true); } }
    }
    switch (e.mode) {
      case 'walk': {
        e.a = turnTo(e.a, pa, 3.5 * dt);
        const ox = e.x, oy = e.y;
        bChase(e, p, (angry ? 46 : 36) * dt, dt, 40);
        if (b6_inHaz('b6pud', e.x, e.y, 2)) { e.x = ox; e.y = oy; }   // langsam fährt sie um Pfützen herum
        e.shootT -= dt;
        if (e.shootT <= 0 && sees) {
          e.shootT = angry ? 1.4 : 1.8; e.alt = !e.alt;
          if (e.alt) { bShot(e, pa, 175, 'b6teeth', 'b6teeth'); say(e, pick(['MEIN GEBISS! HOL ES!', 'BEISS ZU, KUKIDENT!']), 1); }
          else bFan(e, pa, angry ? 5 : 3, 0.6, 120, 'b6cookie', 'b6cookie');
          Sound.play('throwIt');
        }
        e.modeT -= dt;
        if (e.modeT <= 0) {
          e.attack = ((e.attack || 0) + 1) % 3;
          if (e.attack === 0) { e.mode = 'knit'; e.burst = angry ? 4 : 3; e.shootT = 0.5; say(e, 'STRICKNADEL-STURM!', 1.2); Sound.play('swoosh'); }
          else if (sees) { e.mode = 'windup'; e.modeT = angry ? 0.85 : 1.05; say(e, pick(['TURBOOO!', 'ROLLATOR - VOLLGAS!', 'AUS DEM WEG, SCHNÖSEL!']), 1); Sound.play('b6_rev'); }
          else e.modeT = 1;
        }
        break;
      }
      case 'windup':
        e.modeT -= dt;
        if (e.modeT > 0.3) e.a = turnTo(e.a, pa, 5 * dt);
        if (Math.random() < 0.5) G.parts.push({ x: e.x - Math.cos(e.a) * 12, y: e.y - Math.sin(e.a) * 12, vx: -Math.cos(e.a) * 40 + rand(-15, 15), vy: -Math.sin(e.a) * 40 + rand(-15, 15), life: 0.3, col: pick(['#888888', '#cccccc']), s: 2, kind: 'spark', fric: 3 });
        if (e.modeT <= 0) { e.mode = 'dash'; e.ca = e.a; e.modeT = 1.7; Sound.play('boss_attack'); }
        break;
      case 'dash': {
        e.modeT -= dt;
        const pud = b6_inHaz('b6pud', e.x, e.y, 4);
        if (pud) {
          pud.dead = true; e.mode = 'slip'; e.modeT = 1.0; e.svx = Math.cos(e.ca) * 190; e.svy = Math.sin(e.ca) * 190;
          say(e, 'HUUUCH?!', 1); Sound.play('squeak'); Sound.play('splat'); floatText(e.x, e.y - 24, 'AUSGERUTSCHT!', '#ff9a1a');
          break;
        }
        if (Math.random() < 0.7) G.parts.push({ x: e.x - Math.cos(e.ca) * 12, y: e.y - Math.sin(e.ca) * 12, vx: -Math.cos(e.ca) * 60, vy: -Math.sin(e.ca) * 60, life: 0.25, col: pick(['#ff9a1a', '#ffe14d', '#ff3b3b']), s: 2, kind: 'spark', fric: 3 });
        if (b6_dashStep(e, angry ? 320 : 290, dt)) {
          shake(6); Sound.play('slam'); sparks(e.x + Math.cos(e.ca) * 10, e.y + Math.sin(e.ca) * 10, 10, '#cccccc');
          say(e, pick(['MEIN ROLLATOR HAT AIRBAGS, SCHÄTZCHEN!', 'HAT NICHT WEHGETAN! HÜFTE AUS TITAN!']), 1.4);
          e.mode = 'walk'; e.modeT = rand(2, 3);
        } else if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); }
        break;
      }
      case 'slip':
        e.modeT -= dt; e.a += dt * 16;
        moveEntity(e, e.svx * dt, e.svy * dt); e.svx *= Math.exp(-dt * 3); e.svy *= Math.exp(-dt * 3);
        if (e.modeT <= 0) { e.mode = 'stunned'; e.modeT = 3.6; shake(8); Sound.play('slam'); say(e, pick(['WER HAT HIER GEWISCHT?!', 'MEINE HÜFTE! ...DIE NEUE!', 'OHHH... ICH SEH STERNCHEN!']), 1.8); }
        break;
      case 'knit':
        e.shootT -= dt; e.walkT += dt;
        if (e.shootT <= 0) { e.shootT = 0.55; bRing(e, 18, 100 + (4 - e.burst) * 8, 'b6needle', 'b6needle', 4); Sound.play('swoosh'); e.burst--; if (e.burst <= 0) b6_recover(e); }
        break;
      case 'stunned':
        e.modeT -= dt; b6_stunFx(e, '#ffffff');
        if (e.modeT <= 0) b6_recover(e, pick(['DAS GIBT KEINEN KUCHEN MEHR!', 'JETZT WIRD OMA BÖSE!', 'ICH RUF DEINE MUTTER AN!']));
        break;
    }
    if (e.mode !== 'dash') bTouch(e, p, pa, pd, 'oma');
    if (!e.summoned && angry) { e.summoned = true; say(e, 'WALDI! FIFI! SCHNAPPI! FASST!', 2); spawnMinions('K', 3); }
  },
  draw(g, e) {
    const s = Math.round(Math.sin(e.walkT * 14) * 2), fast = e.mode === 'dash' || e.mode === 'windup';
    // Rollator
    g.fillStyle = '#9aa0aa'; g.fillRect(4, -10, 14, 2); g.fillRect(4, 8, 14, 2); g.fillRect(16, -10, 2, 20);
    g.fillStyle = '#111'; g.fillRect(15, -11, 4, 3); g.fillRect(15, 8, 4, 3); g.fillRect(5, -11, 3, 3); g.fillRect(5, 8, 3, 3);
    g.fillStyle = '#c89a5a'; g.fillRect(9, -6, 6, 12); g.fillStyle = '#ff9a1a'; g.fillRect(10, -4, 3, 3); g.fillStyle = '#f0e0b0'; g.fillRect(11, 1, 3, 3);
    // Turbo hinten
    g.fillStyle = '#555'; g.fillRect(-14, -3, 5, 6); g.fillStyle = '#c41f2a'; g.fillRect(-12, -3, 1, 6);
    if (fast) { g.fillStyle = Math.floor(T * 20) % 2 ? '#ffe14d' : '#ff9a1a'; g.fillRect(-18 - (e.mode === 'dash' ? 3 : 0), -2, 4 + (e.mode === 'dash' ? 3 : 0), 4); }
    // Oma
    g.fillStyle = '#4a2a1a'; g.fillRect(-4 + s, -8, 5, 3); g.fillRect(-4 - s, 5, 5, 3);
    pxEll(g, -1, 0, 9, 10, '#7a2a4a'); pxEll(g, 0, 0, 8, 9, '#d04a8a');
    g.fillStyle = '#ffffff'; g.fillRect(3, -3, 1, 1); g.fillRect(3, 0, 1, 1); g.fillRect(3, 3, 1, 1);
    g.fillStyle = '#d04a8a'; g.fillRect(2, -10, 4, 3); g.fillRect(2, 7, 4, 3);
    g.fillStyle = '#f0c8a0'; g.fillRect(6, -10, 2, 3); g.fillRect(6, 7, 2, 3);
    g.fillStyle = '#5a2a1a'; g.fillRect(-6, 6, 5, 4);   // Handtasche
    pxEll(g, 0, 0, 5, 5, '#f0c8a0'); pxEll(g, -1, 0, 5, 5, '#d8d8e0'); pxEll(g, -5, 0, 3, 3, '#c0c0c8');
    g.fillStyle = '#e8e8f0'; g.fillRect(3, -3, 2, 2); g.fillRect(3, 1, 2, 2); g.fillStyle = '#111'; g.fillRect(4, -3, 1, 1); g.fillRect(4, 1, 1, 1);
  },
  extra(g, e) {
    if (e.mode === 'windup') b6_dashLine(g, e, `rgba(255,60,60,${0.45 + Math.sin(T * 30) * 0.35})`);
  },
  hud(b) {
    const n = (G.hazards || []).filter((h) => h.kind === 'b6pud' && !h.dead).length;
    txt(b.mode === 'windup' ? 'SIE NIMMT ANLAUF! STELL EINE PFÜTZE IN DEN WEG!' : 'SAFTPFÜTZEN: ' + n, W / 2, 46, { font: FS, align: 'center', color: b.mode === 'windup' ? '#ff5a5a' : '#ff9a1a' });
  },
};
PROP_HIT.b6kan = (o, b, live) => {
  o.state = 'dead';
  Sound.play('splat'); sparks(o.x, o.y, 14, '#ff9a1a');
  if (!live) return;
  G.hazards = G.hazards || [];
  G.hazards.push({ kind: 'b6pud', x: o.x, y: o.y, r: 22, t: 16 });
  floatText(o.x, o.y - 18, 'SAFTPFÜTZE!', '#ff9a1a');
  if (Math.random() < 0.5) say(b, pick(['WER KLECKERT DENN DA?!', 'DAS WISCHST DU WIEDER AUF!', 'TSS, DIE JUGEND VON HEUTE!']), 1.3);
};
PROP_DRAW.b6kan = (g, o, x, y, off, blink) => {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 6, y + 6, 13, 3);
  g.fillStyle = '#c86a10'; g.fillRect(x - 6, y - 6, 12, 13); g.fillStyle = '#ff9a1a'; g.fillRect(x - 5, y - 5, 10, 11);
  g.fillStyle = '#c86a10'; g.fillRect(x - 3, y - 9, 6, 3); g.fillRect(x + 3, y - 9, 2, 2);
  g.fillStyle = '#ffffff'; g.fillRect(x - 3, y - 2, 6, 5); g.fillStyle = '#ff9a1a'; g.fillRect(x - 1, y - 1, 2, 3);
  txt('SAFT', x, y - 20, { g, font: FS, align: 'center', color: '#ff9a1a' });
  if (blink) txt('!', x, y - 28, { g, font: FS, align: 'center', color: '#ffe14d' });
};

// =====================================================================
//  MR. BITTER - Chef von BITTERLEMON INC. (Staffel-2-Finale, 3 Phasen)
// =====================================================================
const b6_BIT_NAME = ['', 'DER ANZUG', 'ZITRONEN-MECH', 'TEBLEEDD-MAX-KERN'];
const b6_BIT_SPOTS = {
  valve: [[0.14, 0.2], [0.86, 0.2], [0.5, 0.86]],
  hatch: [[0.2, 0.3], [0.8, 0.3], [0.5, 0.78]],
  core: [0.5, 0.42],
  mirror: [[0.2, 0.22], [0.8, 0.22], [0.5, 0.9]],
};
const b6_bitLim = (e) => Math.ceil(e.maxHp / 6);                                       // Schaden pro Fenster (=> 2 Fenster pro Phase)
const b6_bitFloor = (e) => (e.phase === 1 ? Math.round(e.maxHp * 2 / 3) : e.phase === 2 ? Math.round(e.maxHp / 3) : 0);
function b6_bitSweet(e, h) {
  e.mode = 'stunned'; e.modeT = 3.6; e.path = null; e.winDmg = 0; h.dead = true;   // Saft verbraucht (kein Dauer-Betäuben)
  say(e, pick(['SÜÜÜSS!!! ICH BIN ALLERGISCH GEGEN O-SAFT!', 'IGITT! VITAMINE!', 'MEIN ANZUG! ER IST... ORANGE!']), 1.8);
  shake(6); Sound.play('boss_phase'); sparks(e.x, e.y, 16, '#ff9a1a');
}
function b6_bitSpawnMirror(e, fx, fy) {
  const s = fx === undefined ? null : arenaSpotAt(fx, fy);
  let pos = s && dist(s[0], s[1], e.x, e.y) > 60 ? s : null;
  for (let k = 0; k < 40 && !pos; k++) { const r = randomArenaSpot(50); if (r && dist(r[0], r[1], e.x, e.y) > 70 && dist(r[0], r[1], e.x, e.y) < 190 && los(r[0], r[1], e.x, e.y)) pos = r; }
  if (!pos) return;
  const o = spawnProp('b6mirror', pos[0], pos[1]); o.r = 7; o.suit = '#c8d8ff';
}
function b6_bitHatch(e) {
  for (let k = 0; k < 40; k++) {
    const s = randomArenaSpot(60);
    if (s && !(e.hatches || []).some((h) => dist(h.x, h.y, s[0], s[1]) < 60) && dist(s[0], s[1], e.x, e.y) > 40) { e.hatches.push({ x: s[0], y: s[1], b: 0 }); return; }
  }
}
function b6_bitProps(e) {
  for (const o of G.enemies) if (o.kind === 'O' && o.state !== 'dead') { o.state = 'dead'; sparks(o.x, o.y, 8, '#ffe14d'); }
  e.hatches = [];
  if (e.phase === 1) for (const [fx, fy] of b6_BIT_SPOTS.valve) { const s = arenaSpotAt(fx, fy); if (s) { const o = spawnProp('b6valve', s[0], s[1]); o.r = 7; } }
  if (e.phase === 2) for (const [fx, fy] of b6_BIT_SPOTS.hatch) { const s = arenaSpotAt(fx, fy); if (s) e.hatches.push({ x: s[0], y: s[1], b: 0 }); }
  if (e.phase === 3) for (const [fx, fy] of b6_BIT_SPOTS.mirror) b6_bitSpawnMirror(e, fx, fy);
}
function b6_bitPhase(e, ph) {
  e.phase = ph; e.mode = 'morph'; e.modeT = 2.4; e.attack = 0; e.shootT = 1.5; e.winDmg = 0; e.caseOut = 0;
  b6_clearHaz(['b6spray', 'b6case', 'drop']);
  for (const b of G.bullets) if (b.owner === 'enemy') b.dead = true;
  e.r = ph === 2 ? 14 : 13;
  if (ph === 3) {
    const s = arenaSpotAt(b6_BIT_SPOTS.core[0], b6_BIT_SPOTS.core[1]);
    if (s) { sparks(e.x, e.y, 20, '#ffe14d'); e.x = s[0]; e.y = s[1]; }
    for (const p of G.players) if (p.alive && dist(p.x, p.y, e.x, e.y) < 40) { const a = Math.atan2(p.y - e.y, p.x - e.x); moveEntity(p, Math.cos(a) * 30, Math.sin(a) * 30); }
  }
  resolve(e);
  b6_bitProps(e);
  say(e, ph === 2 ? 'GENUG GESPIELT! ZEIT FÜR DEN ZITRONEN-MECH!' : 'DU WILLST ES WIRKLICH WISSEN? TEBLEEDD MAX - KERN AKTIVIEREN!', 2.6);
  Sound.play('boss_phase'); G.flash = 0.4; shake(14);
  for (let i = 0; i < 4; i++) sparks(e.x + rand(-12, 12), e.y + rand(-12, 12), 14, pick(['#ffe14d', '#d8ff3a', '#ffffff']));
  if (ph === 2) { spawnMinions('E', 2); say(e, 'PRAKTIKANTEN! HALTET IHN AUF, WÄHREND ICH EINSTEIGE!', 2.6); }
}
HAZ_UPDATE.b6spray = (h, dt) => {
  h.t -= dt;
  if (h.t <= 0) { h.dead = true; return; }
  if (Math.random() < 0.6) { const a = rand(TAU), r = rand(h.r); G.parts.push({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, vx: rand(-10, 10), vy: rand(-25, -5), life: 0.35, col: pick(['#ff9a1a', '#ffc04d']), s: 2, kind: 'spark', fric: 2 }); }
  const e = G.boss;
  if (e && e.btype === 'bitter' && e.state !== 'dead' && e.phase === 1 && e.mode !== 'stunned' && e.mode !== 'morph' && dist(e.x, e.y, h.x, h.y) < h.r) b6_bitSweet(e, h);
};
HAZ_DRAW.b6spray = (g, h) => {
  if (h.dead) return;
  const x = Math.round(h.x), y = Math.round(h.y);
  g.fillStyle = `rgba(255,154,26,${0.16 + Math.sin(T * 10) * 0.05})`; g.beginPath(); g.arc(x, y, h.r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,190,80,0.6)'; g.beginPath(); g.arc(x, y, h.r, 0, TAU); g.stroke();
  g.fillStyle = '#ffc04d';
  for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + T * 2, r = ((T * 60 + i * 13) % h.r); g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2); }
};
HAZ_UPDATE.b6case = (h, dt) => {
  const b = G.boss;
  h.t += dt;
  if (!b || b.state === 'dead' || h.t > 4) { h.dead = true; if (b) b.caseOut = 0; return; }
  if (!h.back) {
    h.x += Math.cos(h.a) * h.sp * dt; h.y += Math.sin(h.a) * h.sp * dt; h.d += h.sp * dt;
    if (h.d >= h.max || blocksBulletC(T_(Math.floor(h.x / TS), Math.floor(h.y / TS)))) h.back = 1;
  } else {
    const a = Math.atan2(b.y - h.y, b.x - h.x); h.x += Math.cos(a) * h.sp * 1.15 * dt; h.y += Math.sin(a) * h.sp * 1.15 * dt;
    if (dist(h.x, h.y, b.x, b.y) < 12) { h.dead = true; b.caseOut = 0; }
  }
  b6_killNear(h.x, h.y, 6, 'b6case', b);
};
HAZ_DRAW.b6case = (g, h) => {
  if (h.dead) return;
  g.save(); g.translate(Math.round(h.x), Math.round(h.y)); g.rotate(h.t * 14);
  g.fillStyle = '#3a2410'; g.fillRect(-6, -4, 12, 8); g.fillStyle = '#6a4220'; g.fillRect(-5, -3, 10, 6); g.fillStyle = '#ffd84a'; g.fillRect(-1, -4, 2, 2); g.fillRect(-3, -6, 6, 2);
  g.restore();
};

function b6_bit1(e, dt, pd, pa, p, sees) {
  switch (e.mode) {
    case 'walk': {
      e.a = turnTo(e.a, pa, 4 * dt);
      const ox = e.x, oy = e.y;
      b6_strafe(e, p, pd, pa, 44 * dt, 80, 130, dt);
      if (b6_inHaz('b6spray', e.x, e.y, 3)) { e.x = ox; e.y = oy; }     // freiwillig geht er da NICHT rein
      e.shootT -= dt;
      if (e.shootT <= 0 && sees) { e.shootT = 1.5; bFan(e, pa, 3, 0.5, 150, 'lemon', 'lemon'); Sound.play('throwIt'); if (Math.random() < 0.25) say(e, pick(L_BOSS.bitter), 1.3); }
      e.modeT -= dt;
      if (e.modeT <= 0) {
        e.attack = ((e.attack || 0) + 1) % 2;
        if (!sees) e.modeT = 1;
        else if (e.attack === 1) { e.mode = 'windup'; e.modeT = 0.85; say(e, 'FEINDLICHE ÜBERNAHME!', 1); Sound.play('boss_attack'); }
        else if (!e.caseOut) { e.caseOut = 1; G.hazards.push({ kind: 'b6case', x: e.x, y: e.y, a: pa, sp: 210, d: 0, max: 190, t: 0, back: 0 }); say(e, 'MEIN AKTENKOFFER! FANG!', 1); Sound.play('swoosh'); e.modeT = rand(2, 3); }
        else e.modeT = 1;
      }
      break;
    }
    case 'windup':
      e.modeT -= dt;
      if (e.modeT > 0.25) e.a = turnTo(e.a, pa, 6 * dt);
      if (e.modeT <= 0) { e.mode = 'dash'; e.ca = e.a; e.modeT = 1.2; }
      break;
    case 'dash':
      e.modeT -= dt;
      if (b6_dashStep(e, 260, dt)) { shake(5); Sound.play('slam'); say(e, pick(['AU! MEINE FRISUR!', 'DIE WAND KAUF ICH AUCH NOCH!']), 1.2); e.mode = 'walk'; e.modeT = rand(2, 3); }
      else if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); }
      break;
  }
}
function b6_bit2(e, dt, pd, pa, p, sees) {
  switch (e.mode) {
    case 'walk':
      e.a = turnTo(e.a, pa, 2.5 * dt);
      if (pd > 50) bChase(e, p, 30 * dt, dt, 50);
      e.shootT -= dt;
      if (e.shootT <= 0 && sees) { e.shootT = 1.4; bFan(e, pa, 5, 0.8, 140, 'lemon', 'lemon'); Sound.play('throwIt'); }
      e.modeT -= dt;
      if (e.modeT <= 0) {
        e.attack = ((e.attack || 0) + 1) % 4;
        if (e.attack % 2 === 1) { e.mode = 'crouch'; e.modeT = 0.95; e.tx = p.x; e.ty = p.y; say(e, 'STAMPF-SPRUNG!', 1); Sound.play('b6_rev'); }
        else if (e.attack === 2) { e.mode = 'wait'; e.modeT = 1.6; say(e, 'ZITRONEN-RAKETEN!', 1.2); Sound.play('boss_attack'); for (let k = 0; k < 6; k++) dropAt(null, 55, 22, rand(1.1, 1.6), 'missile'); }
        else if (sees) { e.mode = 'squirtW'; e.modeT = 0.55; say(e, 'ZITRONEN-FLAMMENWERFER!', 1.2); Sound.play('boss_attack'); }
        else e.modeT = 1;
      }
      break;
    case 'crouch':
      e.modeT -= dt; e.a = turnTo(e.a, pa, 4 * dt);
      if (e.modeT > 0.3) { e.tx = p.x; e.ty = p.y; }
      if (e.modeT <= 0) { e.mode = 'air'; e.jt = 0; e.jx = e.x; e.jy = e.y; Sound.play('swoosh'); }
      break;
    case 'air': {
      e.jt += dt / 0.8;
      const k = Math.min(1, e.jt);
      e.x = lerp(e.jx, e.tx, k); e.y = lerp(e.jy, e.ty, k);
      if (k >= 1) {
        resolve(e); shake(12); Sound.play('slam'); Sound.play('explode');
        sparks(e.x, e.y, 24, '#ffe14d');
        b6_killNear(e.x, e.y, 26, 'b6stomp', e);
        for (const o of G.enemies) if (o.state !== 'dead' && o.kind !== 'B' && !o.static && dist(o.x, o.y, e.x, e.y) < 30) killEnemy(o, 'friendly', 0);
        const h = (e.hatches || []).find((q) => !q.b && dist(q.x, q.y, e.x, e.y) < 22);
        if (h) { h.b = 1; e.x = h.x; e.y = h.y; e.mode = 'stunned'; e.modeT = 3.6; say(e, pick(['ICH STECKE FEST!! WER HAT DIESE LUKE GEBAUT?!', 'DAS BEIN! DAS MECH-BEIN!']), 1.8); Sound.play('boss_phase'); }
        else { bRing(e, 10, 120, 'lemon', 'lemon', 3); e.mode = 'walk'; e.modeT = rand(1.8, 2.6); }
      }
      break;
    }
    case 'squirtW':
      e.modeT -= dt; e.a = turnTo(e.a, pa, 3 * dt);
      if (e.modeT <= 0) { e.mode = 'squirt'; e.modeT = 1.6; e.shootT = 0; }
      break;
    case 'squirt':
      e.modeT -= dt; e.a = turnTo(e.a, pa, 1.1 * dt); e.shootT -= dt;
      if (e.shootT <= 0) { e.shootT = 0.07; bShot(e, e.a + rand(-0.16, 0.16), 165, 'lemon', 'lemon', 0.75); }
      if (e.modeT <= 0) b6_recover(e);
      break;
    case 'wait': e.modeT -= dt; if (e.modeT <= 0) b6_recover(e); break;
  }
}
function b6_bitMirrorHit(e, a, len) {
  let best = null, bd = len;
  for (const o of propsOf('b6mirror')) {
    const dx = o.x - e.x, dy = o.y - e.y, along = dx * Math.cos(a) + dy * Math.sin(a);
    if (along > 0 && along < bd && Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) < 10) { bd = along; best = o; }
  }
  return best ? { o: best, d: bd } : null;
}
function b6_bit3(e, dt, pd, pa, p, sees) {
  e.walkT += dt;
  switch (e.mode) {
    case 'walk':
      e.a += dt * 0.8;
      e.shootT -= dt;
      if (e.shootT <= 0) { e.shootT = 1.4; bRing(e, 14, 78, 'b6orb', 'b6orb', 3); Sound.play('zap'); }
      e.modeT -= dt;
      if (e.modeT <= 0) {
        e.attack = ((e.attack || 0) + 1) % 4;
        if (e.attack % 2 === 1) { e.mode = 'charge'; e.modeT = 1.7; e.beamA = pa; say(e, pick(['TEBLEEDD MAX - VOLLE LEISTUNG!', 'BITTERSTRAHL WIRD GELADEN!']), 1.4); Sound.play('boss_laser'); }
        else if (e.attack === 2) { e.mode = 'spinW'; e.modeT = 1.1; e.rotA = pa + Math.PI / 2; e.rotDir = Math.random() < 0.5 ? 1 : -1; say(e, 'ROTIERENDE BITTERKEIT!', 1.2); Sound.play('boss_attack'); }
        else { e.mode = 'orbs'; e.burst = 3; e.shootT = 0.2; }
      }
      break;
    case 'charge':
      e.modeT -= dt;
      if (e.modeT > 0.45) e.beamA = turnTo(e.beamA, pa, 2.2 * dt);
      e.a = e.beamA;
      if (e.modeT <= 0) {
        const len = beamLength(e.x, e.y, e.beamA), m = b6_bitMirrorHit(e, e.beamA, len);
        e.blen = m ? m.d : len; e.refl = m ? 1 : 0; e.mode = 'beam'; e.modeT = 0.6;
        Sound.play('boss_laser'); shake(6);
        if (m) { floatText(m.o.x, m.o.y - 18, 'REFLEKTIERT!', '#c8d8ff'); }
      }
      break;
    case 'beam':
      e.modeT -= dt;
      for (const q of G.players) if (q.alive && b6_segHit(e.x, e.y, e.beamA, e.blen, q.x, q.y, q.r + 4)) killPlayer(e, e.beamA, 'b6beam', q);
      if (e.modeT <= 0) {
        if (e.refl) {
          const m = b6_bitMirrorHit(e, e.beamA, e.blen + 2);
          if (m) { m.o.state = 'dead'; sparks(m.o.x, m.o.y, 18, '#c8d8ff'); Sound.play('glass'); }
          e.refl = 0; e.mode = 'stunned'; e.modeT = 3.6; shake(10); Sound.play('boss_phase');
          say(e, pick(['ÜBERLASTUNG!!! DER STRAHL KOMMT ZURÜCK?!', 'WER HAT HIER EINEN SPIEGEL HINGESTELLT?!']), 1.8);
        } else b6_recover(e);
      }
      break;
    case 'spinW':
      e.modeT -= dt; e.a = e.rotA;
      if (e.modeT <= 0) { e.mode = 'spin'; e.modeT = 4.2; Sound.play('boss_laser'); }
      break;
    case 'spin':
      e.modeT -= dt; e.rotA += dt * 0.72 * e.rotDir; e.a = e.rotA;
      for (let k = 0; k < 2; k++) { const a = e.rotA + k * Math.PI, len = beamLength(e.x, e.y, a); for (const q of G.players) if (q.alive && b6_segHit(e.x, e.y, a, len, q.x, q.y, q.r + 2)) killPlayer(e, a, 'b6beam', q); }
      if (e.modeT <= 0) b6_recover(e);
      break;
    case 'orbs':
      e.shootT -= dt;
      if (e.shootT <= 0) { e.shootT = 0.5; bFan(e, pa, 7, 1.5, 95, 'b6orb', 'b6orb'); Sound.play('zap'); e.burst--; if (e.burst <= 0) b6_recover(e); }
      break;
  }
}
BOSS_EXT.bitter = {
  taunts: ['DAS LEBEN IST BITTER. DEINS JETZT AUCH.', 'GEKAUFT. VERKAUFT. ERLEDIGT.', 'SÜSS WAR GESTERN!'],
  activate(e) { e.phase = 1; e.mode = 'walk'; e.modeT = 3; say(e, 'ICH BIN MR. BITTER. UND DAS LEBEN IST BITTER, KLEINER.', 3); Sound.play('boss'); },
  setup(e) { b6_bitProps(e); },
  // eigenes Schadensmodell: max. 1/6 der HP pro Fenster und Phasen-Schwellen (=> mind. 6 Fenster)
  hit(e, dmg, ang, how) {
    if (e.mode !== 'stunned') return false;
    const lim = b6_bitLim(e), fl = b6_bitFloor(e), d = Math.min(dmg * 2, lim - (e.winDmg || 0), e.hp - fl);
    if (d <= 0) { e.modeT = Math.min(e.modeT, 0.05); return true; }
    e.winDmg = (e.winDmg || 0) + d; e.hp -= d; e.flash = 0.08;
    Sound.play('hurtBoss'); sparks(e.x, e.y, 6, '#ffe14d'); floatText(e.x + rand(-8, 8), e.y - 22, '-' + d, '#ffd84a', true);
    if (Math.random() < 0.14) say(e, pick(['MEINE AKTIEN!', 'DAS ZAHLST DU MIR!', 'AUTSCH! MEIN BONUS!']), 1);
    if (e.hp <= 0) { killBoss(e, ang); return true; }
    if (e.hp <= fl) b6_bitPhase(e, e.phase + 1);
    else if (e.winDmg >= lim) { e.modeT = Math.min(e.modeT, 0.05); floatText(e.x, e.y - 34, 'GENUG! WEITER GEHT\'S!', '#ff9ad5', true); }
    return true;
  },
  update(e, dt, pd, pa) {
    const p = e.target || G.player, sees = los(e.x, e.y, p.x, p.y);
    if (!e.phase) e.phase = 1;
    updateDrops(dt);
    if (e.mode === 'morph') {
      e.modeT -= dt; e.a += dt * 6;
      if (Math.random() < 0.5) sparks(e.x + rand(-14, 14), e.y + rand(-14, 14), 2, pick(['#ffe14d', '#d8ff3a']));
      if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = 2; e.a = pa; }
      return;
    }
    if (e.mode === 'stunned') {
      e.modeT -= dt; b6_stunFx(e, e.phase === 3 ? '#d8ff3a' : '#ff9a1a');
      if (e.modeT <= 0) {
        if (e.phase === 2) { e.hatches = (e.hatches || []).filter((h) => !h.b); b6_bitHatch(e); }
        if (e.phase === 3) while (propsOf('b6mirror').length < 3) { const n = propsOf('b6mirror').length; b6_bitSpawnMirror(e); if (propsOf('b6mirror').length === n) break; }
        b6_recover(e, pick(['NOCH BIN ICH NICHT BITTER GENUG!', 'DAS SETZ ICH VON DER STEUER AB!', 'MEINE ANWÄLTE WERDEN DICH LIEBEN!']));
      }
      return;
    }
    if (e.phase === 1) b6_bit1(e, dt, pd, pa, p, sees);
    else if (e.phase === 2) b6_bit2(e, dt, pd, pa, p, sees);
    else b6_bit3(e, dt, pd, pa, p, sees);
    if (e.mode !== 'air' && e.mode !== 'dash') bTouch(e, p, pa, pd, 'bitter');
  },
  draw(g, e) {
    const s = Math.round(Math.sin(e.walkT * 10) * 3);
    if (e.phase === 2) {
      const air = e.mode === 'air' ? Math.sin(Math.min(1, e.jt || 0) * Math.PI) : 0, sc = 1 + air * 0.45;
      if (e.mode === 'stunned') g.rotate(Math.sin(T * 20) * 0.08);
      g.scale(sc, sc);
      g.fillStyle = '#4a4a20'; g.fillRect(-9 + s, -17, 10, 6); g.fillRect(-9 - s, 11, 10, 6);
      g.fillStyle = '#5a5a64'; g.fillRect(2, -19, 15, 5); g.fillRect(2, 14, 15, 5); g.fillStyle = '#ffe14d'; g.fillRect(16, -19, 3, 5); g.fillRect(16, 14, 3, 5);
      pxEll(g, 0, 0, 15, 13, '#8a7a10'); pxEll(g, 0, 0, 14, 12, '#ffe14d'); pxEll(g, -14, 0, 3, 3, '#e8c820'); pxEll(g, 14, 0, 3, 3, '#e8c820');
      g.fillStyle = '#c8b020'; for (const [a, b] of [[-8, -6], [-8, 5], [6, -8], [6, 7], [-2, -10], [-2, 9]]) g.fillRect(a, b, 2, 2);
      pxEll(g, 3, 0, 6, 6, '#2a6a8a'); pxEll(g, 3, 0, 5, 5, '#5ab0d0'); pxEll(g, 3, 0, 3, 3, '#e8c8a0'); g.fillStyle = '#ffffff'; g.fillRect(5, -4, 2, 1);
      return;
    }
    if (e.phase === 3) {
      const pu = Math.sin(T * 6) * 1.2, over = e.mode === 'stunned' || (e.mode === 'beam' && e.refl);
      pxEll(g, 0, 0, 14, 14, '#1a3a10'); pxEll(g, 0, 0, Math.round(12 + pu), Math.round(12 + pu), over ? (Math.floor(T * 16) % 2 ? '#ffffff' : '#ff2a3a') : '#5a9a1a');
      pxEll(g, 0, 0, 9, 9, over ? '#ffe14d' : '#d8ff3a');
      g.fillStyle = '#2a4a10'; for (let i = 0; i < 6; i++) { const a = T * 2 + i * TAU / 6; g.fillRect(Math.round(Math.cos(a) * 11) - 1, Math.round(Math.sin(a) * 11) - 1, 3, 3); }
      pxEll(g, 4, 0, 4, 4, '#111'); g.fillStyle = e.mode === 'charge' ? '#ffffff' : '#ff2a3a'; g.fillRect(5, -1, 2, 2);
      return;
    }
    // Phase 1: Anzug
    g.fillStyle = '#111'; g.fillRect(-4 + s, -8, 6, 4); g.fillRect(-4 - s, 4, 6, 4);
    pxEll(g, -1, 0, 9, 10, '#15151c'); pxEll(g, 0, 0, 8, 9, '#2e2e3a');
    g.fillStyle = '#ffffff'; g.fillRect(4, -2, 3, 4); g.fillStyle = '#ffe14d'; g.fillRect(5, -1, 4, 2);
    g.fillStyle = '#2e2e3a'; g.fillRect(2, -11, 7, 3); g.fillRect(2, 8, 7, 3);
    g.fillStyle = '#e8c8a0'; g.fillRect(9, -11, 2, 3); g.fillRect(9, 8, 2, 3);
    if (!e.caseOut) { g.fillStyle = '#3a2410'; g.fillRect(8, 10, 9, 6); g.fillStyle = '#ffd84a'; g.fillRect(11, 10, 3, 1); }
    pxEll(g, 0, 0, 5, 5, '#e8c8a0'); g.fillStyle = '#f8e0c0'; g.fillRect(-1, -2, 2, 1);
    g.fillStyle = '#8a8a8a'; g.fillRect(-4, -3, 6, 1); g.fillRect(-4, -1, 5, 1); g.fillRect(-3, 1, 4, 1);
    g.fillStyle = '#111'; g.fillRect(3, -3, 2, 2); g.fillRect(3, 1, 2, 2); g.fillStyle = '#ffd84a'; g.fillRect(3, 1, 2, 1);
  },
  extra(g, e) {
    drawDrops(g);
    for (const h of e.hatches || []) {
      const x = Math.round(h.x), y = Math.round(h.y);
      if (h.b) { pxEll(g, x, y, 11, 11, '#0a0a0e'); g.strokeStyle = '#3a3a44'; g.beginPath(); g.moveTo(x - 14, y - 6); g.lineTo(x - 8, y - 2); g.moveTo(x + 9, y + 3); g.lineTo(x + 15, y + 8); g.stroke(); continue; }
      g.fillStyle = '#ffe14d'; g.fillRect(x - 11, y - 11, 22, 22); g.fillStyle = '#111';
      for (let i = 0; i < 4; i++) { g.fillRect(x - 11 + i * 6, y - 11, 3, 2); g.fillRect(x - 11 + i * 6, y + 9, 3, 2); }
      g.fillStyle = '#5a5a64'; g.fillRect(x - 8, y - 8, 16, 16); g.fillStyle = '#3a3a44';
      for (let i = 0; i < 4; i++) g.fillRect(x - 7, y - 6 + i * 4, 14, 1);
      if (e.phase === 2 && Math.floor(T * 3) % 2) txt('LUKE', x, y - 22, { g, font: FS, align: 'center', color: '#ffe14d' });
    }
    if (e.phase === 1 && e.mode === 'windup') b6_dashLine(g, e, `rgba(255,60,60,${0.45 + Math.sin(T * 30) * 0.35})`);
    if (e.phase === 2 && (e.mode === 'crouch' || e.mode === 'air')) {
      const k = e.mode === 'air' ? clamp(e.jt || 0, 0, 1) : 0, x = Math.round(e.tx), y = Math.round(e.ty);
      g.strokeStyle = `rgba(255,40,40,${0.5 + Math.sin(T * 30) * 0.4})`; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.stroke();
      g.fillStyle = `rgba(255,40,40,${0.12 + 0.25 * k})`; g.beginPath(); g.arc(x, y, 26 * Math.max(0.15, k), 0, TAU); g.fill();
      if (e.mode === 'air') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(Math.round(e.x), Math.round(e.y), 12, 0, TAU); g.fill(); }
    }
    if (e.phase === 2 && e.mode === 'squirtW') b6_dashLine(g, e, 'rgba(255,225,77,0.6)');
  },
  post(g, e) {
    if (e.phase !== 3) return;
    const x = Math.round(e.x), y = Math.round(e.y);
    if (e.mode === 'charge') {
      const len = beamLength(x, y, e.beamA);
      g.strokeStyle = `rgba(216,255,58,${0.35 + Math.sin(T * 40) * 0.3})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(e.beamA) * len, y + Math.sin(e.beamA) * len); g.stroke();
      g.fillStyle = 'rgba(216,255,58,0.3)'; g.beginPath(); g.arc(x, y, 6 + (1.7 - e.modeT) * 8, 0, TAU); g.fill();
    } else if (e.mode === 'beam') {
      const ex = x + Math.cos(e.beamA) * e.blen, ey = y + Math.sin(e.beamA) * e.blen;
      g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = '#d8ff3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      if (e.refl) { g.strokeStyle = '#ff2a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(ex, ey + 3); g.lineTo(x, y + 3); g.stroke(); }
      g.lineWidth = 1;
    } else if (e.mode === 'spinW' || e.mode === 'spin') {
      for (let k = 0; k < 2; k++) {
        const a = e.rotA + k * Math.PI, len = beamLength(x, y, a), ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
        if (e.mode === 'spinW') { g.strokeStyle = `rgba(255,40,60,${0.3 + Math.sin(T * 40) * 0.3})`; g.lineWidth = 1; }
        else { g.strokeStyle = '#d8ff3a'; g.lineWidth = 3; }
        g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      }
      g.lineWidth = 1;
    }
  },
  barColor: (b) => (b.phase === 2 ? '#ffe14d' : b.phase === 3 ? '#9aff3a' : '#c8a020'),
  label: (b) => BOSS_INFO.bitter.name + '  -  PHASE ' + (b.phase || 1) + '/3: ' + b6_BIT_NAME[b.phase || 1],
  hud(b) {
    const ph = b.phase || 1;
    const t = b.mode === 'morph' ? 'ER VERWANDELT SICH...' : ph === 1 ? (b.mode === 'windup' ? 'ER STÜRMT GLEICH LOS - AB HINTER DEN SPRINKLER!' : 'O-SAFT MACHT IHN FERTIG!')
      : ph === 2 ? (b.mode === 'crouch' ? 'ER ZIELT AUF DICH - STEH AUF EINER LUKE!' : 'LUKEN: ' + (b.hatches || []).filter((h) => !h.b).length)
        : (b.mode === 'charge' ? 'STRAHL LÄDT - AB HINTER EINEN SPIEGEL!' : 'SPIEGEL WERFEN DEN STRAHL ZURÜCK!');
    txt(t, W / 2, 46, { font: FS, align: 'center', color: b.mode === 'morph' ? '#ffffff' : '#ffe14d' });
  },
  death(e) {
    for (let i = 0; i < 6; i++) sparks(e.x + rand(-20, 20), e.y + rand(-20, 20), 16, pick(['#ff9a1a', '#ffe14d', '#d8ff3a', '#ffffff']));
    floatText(e.x, e.y - 30, 'TEBLEEDD MAX: OFFLINE', 'rainbow');
    spawnCash(e.x, e.y, 600, 8);
    // Finale: ohne Chef kündigen alle Angestellten (sonst bliebe die Etage ungeräumt)
    for (const o of G.enemies) if (o !== e && o.state !== 'dead' && o.kind !== 'O') { killEnemy(o, 'friendly', 0); }
    if (G.enemies.some((o) => o.kind !== 'O' && o.kind !== 'B')) floatText(e.x, e.y + 22, 'DIE PRAKTIKANTEN KÜNDIGEN!', '#ffffff', true);
  },
};
PROP_HIT.b6valve = (o, b, live) => {
  if (!live || b.phase !== 1) return;
  o.cd = 7; Sound.play('splat'); Sound.play('click');
  G.hazards = G.hazards || [];
  G.hazards.push({ kind: 'b6spray', x: o.x, y: o.y, r: 44, t: 5 });
  floatText(o.x, o.y - 20, 'O-SAFT MARSCH!', '#ff9a1a');
};
PROP_DRAW.b6valve = (g, o, x, y, off, blink) => {
  g.fillStyle = '#5a5a64'; g.fillRect(x - 2, y - 2, 4, 10); g.fillStyle = '#3a3a44'; g.fillRect(x - 6, y + 6, 12, 3);
  pxEll(g, x, y - 4, 5, 5, off ? '#6a6a74' : '#c41f2a'); g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 5, 2, 2);
  g.fillStyle = '#ff9a1a'; g.fillRect(x - 1, y - 11, 3, 3);
  if (!off) { txt('O-SAFT', x, y - 22, { g, font: FS, align: 'center', color: '#ff9a1a' }); if (blink) txt('!', x, y - 30, { g, font: FS, align: 'center', color: '#ffe14d' }); }
};
PROP_HIT.b6mirror = (o) => { if (T - (o.msgT || -9) > 1.2) { o.msgT = T; floatText(o.x, o.y - 18, 'STELL DICH DAHINTER!', '#c8d8ff', true); Sound.play('click'); } };
PROP_DRAW.b6mirror = (g, o, x, y) => {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 5, y + 8, 11, 3);
  g.fillStyle = '#8a8a9a'; g.fillRect(x - 6, y - 10, 12, 19); g.fillStyle = o.suit || '#c8d8ff'; g.fillRect(x - 5, y - 9, 10, 17);
  g.fillStyle = '#ffffff'; g.fillRect(x - 3, y - 7, 1, 5); g.fillRect(x - 1, y - 8, 1, 3); g.fillRect(x + 2, y + 2, 1, 4);
  txt('SPIEGEL', x, y - 20, { g, font: FS, align: 'center', color: '#c8d8ff' });
};

// =====================================================================
//  Boss-Etagen (handgebaut) - Level-Dateien nehmen z.B. floors: [..., S2_BOSS_FLOORS.dj]
//  (Datei muss VOR den Level-Dateien geladen werden; Arena oben, D-Reihe + Startraum mit P unten)
// =====================================================================
window.S2_BOSS_FLOORS = window.S2_BOSS_FLOORS || {};
S2_BOSS_FLOORS.dj = { name: 'DJ-KANZEL', boss: 'dj', checkpoint: true, map: [
  '########################################',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,TTTTTTTTTTTT,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,++++++++++++++++++++++++,,,,,,,#',
  '#,,$,,,,++++++++++++++++++++++++,,,,$,,#',
  '#,,,,,,,++++++++++++++++++++++++,,,,,,,#',
  '#,,,,,,,+++++++++++B++++++++++++,,,,,,,#',
  '#,CC,,,,++++++++++++++++++++++++,,,,CC,#',
  '#,CC,,,,++++++++++++++++++++++++,,,,CC,#',
  '#,,,,,,,++++++++++++++++++++++++,,,,,,,#',
  '#,,,,,,,++++++++++++++++++++++++,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,TT,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,TT,,#',
  '#,,TT,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,TT,,#',
  '#,u,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,s,#',
  '#,,,,,,,,,,,,,,,,,,X,,,,,,,,,,,,,,,,,,,#',
  '###################D####################',
  '                #.....#                 ',
  '                #..P..#                 ',
  '                #######                 ',
] };
S2_BOSS_FLOORS.oma = { name: 'SPEISESAAL', boss: 'oma', checkpoint: true, map: [
  '##########################################',
  '#$......................................$#',
  '#........................................#',
  '#...TTT.......TTT..........TTT.......TTT.#',
  '#........................................#',
  '#........________________________........#',
  '#........________________________........#',
  '#........___________B____________........#',
  '#........________________________........#',
  '#...CC...________________________...CC...#',
  '#........________________________........#',
  '#........................................#',
  '#........................................#',
  '#...TTT.......TTT..........TTT.......TTT.#',
  '#........................................#',
  '#.h....................................p.#',
  '#....................X...................#',
  '#####################D####################',
  '                  #.....#                 ',
  '                  #..P..#                 ',
  '                  #######                 ',
] };
S2_BOSS_FLOORS.bitter = { name: 'CHEFETAGE', boss: 'bitter', checkpoint: true, map: [
  '############################################',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,TTT,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,TTT,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,::::::::::::::::::::::::,,,,,,,,#',
  '#,,$,,,,,,,::::::::::::::::::::::::,,,,,$,,#',
  '#,,,,,,,,,,::::::::::::::::::::::::,,,,,,,,#',
  '#,,,,,,,,,,::::::::::::::::::::::::,,,,,,,,#',
  '#,,,,,,,,,,:::::::::::B::::::::::::,,,,,,,,#',
  '#,,CC,,,,,,::::::::::::::::::::::::,,,,CC,,#',
  '#,,CC,,,,,,::::::::::::::::::::::::,,,,CC,,#',
  '#,,,,,,,,,,::::::::::::::::::::::::,,,,,,,,#',
  '#,,,,,,,,,,::::::::::::::::::::::::,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,TT,,,,,,,,,,,,,,,,,,,,,,,,,,TT,,,,,,#',
  '#,,,,,,TT,,,,,,,,,,,,,,,,,,,,,,,,,,TT,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,g,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,m,#',
  '#,,,,,,,,,,,,,,,,,,,,,X,,,,,,,,,,,,,,,,,,,,#',
  '#####################D######################',
  '                   #.....#                  ',
  '                   #..P..#                  ',
  '                   #######                  ',
] };
