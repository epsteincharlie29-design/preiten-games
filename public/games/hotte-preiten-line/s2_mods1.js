'use strict';
// =====================================================================
//  s2_mods1.js - STAFFEL 2: Etagen-Mods (FLOOR_MODS)
//  slippery (Saftpfützen), alarm (Stealth), cameras (Überwachung), fire (Feuer),
//  flood (Wasser steigt), bomb (Saftbombe), elevator (Aufzug-Wellen).
//  Zustand nur in G.modState[id] (einfache Daten -> Online-Gäste sehen alles),
//  Setup deterministisch (mulberry32). Optionen pro Etage: F.modOpts[id] (oder L.modOpts[id]).
//  Hilfs-Caches auf Modulebene sind nur Host-Physik / Zeichen-Puffer und hängen an G.
// =====================================================================

// ---------- gemeinsame Helfer ----------
function s2m1_opts(id) {
  const L = G.L || {}, F = G.F || {};
  return Object.assign({}, (L.modOpts && L.modOpts[id]) || {}, (F.modOpts && F.modOpts[id]) || {});
}
function s2m1_rng(salt) {
  let s = 0;
  if (typeof G.li === 'number') s = G.li * 7919; else for (const ch of String(G.li)) s = (s * 31 + ch.charCodeAt(0)) | 0;
  s = (s + G.fi * 104729 + salt * 1013 + ((G.F && G.F.gen && G.F.gen.seed) || 0) + G.w * 17 + G.h * 131) | 0;
  return mulberry32(s);
}
function s2m1_dedupe() { G.mods = [...new Set(G.mods)]; }   // Mod in L.mods UND F.mods -> nur einmal laufen lassen
function s2m1_ti(x, y) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= G.w || ty >= G.h ? -1 : ty * G.w + tx; }
function s2m1_floor(i) { return i >= 0 && i < G.w * G.h && !G.solid[i] && FLOORS.includes(G.tiles[i]); }
function s2m1_remote(p) { return NET.mode === 'host' && !!NET.connected && p.idx > 0; }   // Online-Gast bewegt sich selbst
function s2m1_me() { return NET.mode === 'client' && G.player && G.player.alive ? G.player : null; }
function s2m1_live() { return G.enemies.some((e) => e.state !== 'dead' && e.kind !== 'O'); }
function s2m1_tc(i) { return [(i % G.w) * TS + 8, ((i / G.w) | 0) * TS + 8]; }
function s2m1_bfs(i0) {
  const n = G.w * G.h, d = new Int32Array(n).fill(-1), q = new Int32Array(n);
  if (i0 < 0 || i0 >= n) return d;
  let qh = 0, qt = 0; d[i0] = 0; q[qt++] = i0;
  while (qh < qt) {
    const i = q[qh++], x = i % G.w, y = (i / G.w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= G.w || ny >= G.h) continue;
      const j = ny * G.w + nx;
      if (d[j] >= 0 || G.solid[j] || isWallC(G.tiles[j])) continue;
      d[j] = d[i] + 1; q[qt++] = j;
    }
  }
  return d;
}
function s2m1_view(m = 24) { const c = G.cam, z = c.z || 1, r = Math.hypot(W, H) / 2 / z + m; return [c.x - r, c.y - r, c.x + r, c.y + r]; }
function s2m1_inView(x, y, m = 40) { const v = s2m1_view(m); return x > v[0] && x < v[2] && y > v[1] && y < v[3]; }
// Weltkoordinaten über den Wänden (drawScreen): gleiche Kamera wie renderWorld, ohne Wackeln
function s2m1_xf(g) {
  const c = G.cam, z = c.z || 1;
  g.save(); g.translate(Math.round(W / 2), Math.round(H / 2));
  if (z !== 1) g.scale(z, z);
  g.rotate(c.rot); g.translate(-Math.round(c.x), -Math.round(c.y));
}
// HUD-Zeilen oben in der Mitte (mehrere Mods gleichzeitig untereinander)
let s2m1_hudT = -1, s2m1_hudN = 0;
function s2m1_row() {
  if (s2m1_hudT !== T) { s2m1_hudT = T; s2m1_hudN = 0; }
  return (G.boss && G.boss.active && G.boss.state !== 'dead' ? 44 : 20) + 11 * s2m1_hudN++;
}
const S2M1_HINTS = {
  slippery: ['SAFTPFÜTZEN! (GUNZER WAR HIER)', 'DU RUTSCHST - DIE GEGNER AUCH. AUSGERUTSCHTE MIT [LEERTASTE] ERLEDIGEN.'],
  alarm: ['STILLER ALARM!', 'SIEHT DICH EINER, KOMMT VERSTÄRKUNG. LAUTLOS DURCH = BONUS-GELD.'],
  cameras: ['ÜBERWACHUNGSKAMERAS!', 'NICHT IN DEN LICHTKEGEL - ODER DIE KAMERA KAPUTTHAUEN/-SCHIESSEN.'],
  fire: ['ES BRENNT!', 'NICHT INS FEUER LAUFEN. O-SAFT LÖSCHT - AUCH DIE BRANDHERDE!'],
  flood: ['WASSERROHRBRUCH!', 'DAS WASSER STEIGT. IM TIEFEN WASSER SÄUFST DU AB - BEEIL DICH!'],
  bomb: ['SAFTBOMBE!', 'GEH ZUM ZÜNDER UND BLEIB DRAN - ODER ERLEDIGE ALLE GEGNER.'],
  elevator: ['AUFZUG-ALARM!', 'AUS DEM AUFZUG KOMMEN WELLEN. HALTET DURCH, DANN GEHT DER AUSGANG AUF.'],
};
function s2m1_hint(id) {
  const mine = G.mods.filter((m) => S2M1_HINTS[m]), k = mine.indexOf(id);
  if (k < 0 || !G.player || !G.player.alive) return;
  const t0 = 0.6 + k * 4.6;
  if (G.time > t0 && G.time < t0 + 4.4) hintBox(S2M1_HINTS[id], H - 104);
}
// Gegner zur Laufzeit (nur Host): kommt alarmiert auf den nächsten Spieler zu (Gast bekommt ihn über ensNew)
function s2m1_spawnEnemy(kind, x, y) {
  const e = makeEnemy(kind, x, y);
  let best = null, bd = 1e9;
  for (const p of G.players) if (p.alive) { const d = dist(p.x, p.y, x, y); if (d < bd) { bd = d; best = p; } }
  e.alerted = true; e.state = 'search'; e.pathT = 0; e.reaction = 0.35;
  e.lastSeen = best ? { x: best.x, y: best.y } : { x, y };
  if (best) e.a = e.ta = Math.atan2(best.y - y, best.x - x);
  G.enemies.push(e);
  sparks(x, y, 6, '#ffffff');
  return e;
}
function s2m1_mixPick(mix) { const s = String(mix || 'EEMUS'); return s[Math.floor(Math.random() * s.length)]; }

// ---------- Texte, Ursachen, Geräusche ----------
CAUSE.s2m1_fire = 'ANGEKOKELT (WIE GUNZERS TOAST)';
CAUSE.s2m1_flood = 'ABGESOFFEN (SEEPFERDCHEN FEHLT)';
CAUSE.s2m1_bomb = 'SAFTBOMBE - ZU LANGSAM!';
KILL_WORDS.s2m1_fire = ['GEGRILLT!', 'KNUSPRIG!', 'MEDIUM RARE!'];
KILL_WORDS.s2m1_flood = ['BLUBB!', 'ABGETAUCHT!', 'SEEPFERDCHEN FEHLT!'];
Sound.addSfx('s2m1_siren', (v = 1) => {
  const { tone, now } = Sound.synth, t = now();
  tone({ type: 'sawtooth', f: 620, f2: 940, slide: 0.32, dur: 0.34, vol: 0.08 * v, lp: 2400, t });
  tone({ type: 'sawtooth', f: 940, f2: 620, slide: 0.32, dur: 0.34, vol: 0.08 * v, lp: 2400, t: t + 0.36 });
});
Sound.addSfx('s2m1_ding', () => {
  const { tone, now } = Sound.synth, t = now();
  tone({ type: 'sine', f: 1318, dur: 0.45, vol: 0.13, t }); tone({ type: 'sine', f: 1046, dur: 0.6, vol: 0.13, t: t + 0.2 });
});
Sound.addSfx('s2m1_beep', (v = 1) => { const { tone, now } = Sound.synth; tone({ type: 'square', f: 1900, dur: 0.05, vol: 0.05 * v, t: now() }); });
Sound.addSfx('s2m1_slip', () => {
  const { tone, noise, now } = Sound.synth, t = now();
  tone({ type: 'triangle', f: 420, f2: 1300, slide: 0.22, dur: 0.24, vol: 0.13, t }); noise({ dur: 0.12, ft: 'bandpass', f: 900, vol: 0.12, t: t + 0.18 });
});
Sound.addSfx('s2m1_cam', () => { const { tone, now } = Sound.synth, t = now(); tone({ type: 'square', f: 1400, dur: 0.06, vol: 0.08, t }); tone({ type: 'square', f: 1400, dur: 0.06, vol: 0.08, t: t + 0.1 }); });
Sound.addSfx('s2m1_hiss', () => { const { noise, now } = Sound.synth; noise({ dur: 0.45, ft: 'highpass', f: 2500, f2: 1200, vol: 0.14, t: now() }); });

// =====================================================================
//  SLIPPERY - Saftpfützen: Spieler rutschen mit Trägheit, Gegner fallen hin
// =====================================================================
const S2M1_JUICE = [['#c86a08', '#ff9a1a', '#ffc04a'], ['#c8a800', '#ffe14d', '#fff38a'], ['#7a9a10', '#c8e04a', '#e8f8a0']];
const S2M1_SLIP_SAY = ['UIIIIH!', 'HUCH!', 'WER HAT HIER GESAFTET?!', 'MEINE NEUEN SCHUHE!', 'ANGEGUNZT!'];
let s2m1_slipC = null, s2m1_slipPaint = null;
const s2m1_pSlip = new WeakMap(), s2m1_eSlip = new WeakMap();
function s2m1_slipMask() {
  const S = G.modState.slippery;
  if (!S || !S.b) return null;
  if (s2m1_slipC && s2m1_slipC.G === G && s2m1_slipC.n === S.b.length) return s2m1_slipC.m;
  const m = new Uint8Array(G.w * G.h);
  for (const [bx, by, rx, ry] of S.b) {
    for (let ty = Math.floor((by - ry) / TS); ty <= Math.floor((by + ry) / TS); ty++) for (let tx = Math.floor((bx - rx) / TS); tx <= Math.floor((bx + rx) / TS); tx++) {
      if (tx < 0 || ty < 0 || tx >= G.w || ty >= G.h) continue;
      const i = ty * G.w + tx, dx = (tx * TS + 8 - bx) / (rx + 4), dy = (ty * TS + 8 - by) / (ry + 4);
      if (dx * dx + dy * dy <= 1 && s2m1_floor(i)) m[i] = 1;
    }
  }
  s2m1_slipC = { G, n: S.b.length, m };
  return m;
}
// Pfützen einmal in die Deko-Ebene malen (Host + Gast; neu, falls renderStatic die Ebene erneuert)
function s2m1_paintPuddles() {
  const S = G.modState.slippery;
  if (!S || !S.b || !G.dchunks || s2m1_slipPaint === G.dchunks) return;
  s2m1_slipPaint = G.dchunks;
  for (const [bx, by, rx, ry, c] of S.b) {
    const col = S2M1_JUICE[(c | 0) % S2M1_JUICE.length];
    withDecal(bx, by, Math.max(rx, ry) + 8, (g) => {
      g.save(); g.beginPath();
      for (let ty = Math.floor((by - ry - 4) / TS); ty <= Math.floor((by + ry + 4) / TS); ty++) for (let tx = Math.floor((bx - rx - 4) / TS); tx <= Math.floor((bx + rx + 4) / TS); tx++) {
        if (tx >= 0 && ty >= 0 && tx < G.w && ty < G.h && s2m1_floor(ty * G.w + tx)) g.rect(tx * TS, ty * TS, TS, TS);
      }
      g.clip();
      g.globalAlpha = 0.9;
      pxEll(g, bx, by, rx + 2, ry + 2, col[0]);
      pxEll(g, bx, by, rx, ry, col[1]);
      pxEll(g, bx - Math.round(rx * 0.2), by - Math.round(ry * 0.25), Math.round(rx * 0.5), Math.round(ry * 0.4), col[2]);
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillRect(Math.round(bx - rx * 0.45), Math.round(by - ry * 0.45), 4, 1); g.fillRect(Math.round(bx - rx * 0.5), Math.round(by - ry * 0.3), 1, 2);
      for (let k = 0; k < 6; k++) {   // Spritzer rundherum
        const a = hash(k, bx) * TAU, d = 1.05 + hash(by, k) * 0.35;
        g.fillStyle = col[k % 2]; g.fillRect(Math.round(bx + Math.cos(a) * rx * d), Math.round(by + Math.sin(a) * ry * d), 2, 2);
      }
      g.restore();
    });
  }
}
// Trägheit: eigene Geschwindigkeit iv läuft der Spieler-Geschwindigkeit nur langsam nach (Host-Spieler + lokaler Gast)
function s2m1_slide(p, dt, grip, m, mover) {
  let st = s2m1_pSlip.get(p);
  if (!st) { st = { vx: p.vx, vy: p.vy }; s2m1_pSlip.set(p, st); }
  const on = m[s2m1_ti(p.x, p.y)] === 1, k = 1 - Math.exp(-dt * (on ? grip : 14));
  st.vx += (p.vx - st.vx) * k; st.vy += (p.vy - st.vy) * k;
  const ex = (st.vx - p.vx) * dt, ey = (st.vy - p.vy) * dt;
  if (Math.abs(ex) + Math.abs(ey) < 0.01) return;
  const ox = p.x; mover(p, ex, 0); if (Math.abs(p.x - ox - ex) > 0.05) st.vx = p.vx;   // gegen die Wand: Schwung weg
  const oy = p.y; mover(p, 0, ey); if (Math.abs(p.y - oy - ey) > 0.05) st.vy = p.vy;
  if (on && Math.hypot(st.vx, st.vy) > 60 && Math.random() < dt * 10) {
    G.parts.push({ x: p.x + rand(-3, 3), y: p.y + 4, vx: rand(-30, 30), vy: rand(-30, 10), life: rand(0.2, 0.4), col: pick(['#ff9a1a', '#ffc04a', '#ffe14d']), s: 1, kind: 'spray', fric: 4 });
  }
}
FLOOR_MODS.slippery = {
  setup(F, L) {
    s2m1_dedupe();
    const o = s2m1_opts('slippery'), rng = s2m1_rng(11), st = s2m1_ti(G.player.x, G.player.y), sx = st % G.w, sy = (st / G.w) | 0;
    const cand = [];
    for (let i = 0; i < G.w * G.h; i++) if (s2m1_floor(i)) cand.push(i);
    const n = o.n || clamp(Math.round(cand.length / 55), 4, 16), size = o.size || 1.6, blobs = [];
    for (let tries = 0; blobs.length < n && tries < n * 40 && cand.length; tries++) {
      const i = cand[Math.floor(rng() * cand.length)], x = i % G.w, y = (i / G.w) | 0, px = x * TS + 8, py = y * TS + 8;
      if (Math.abs(x - sx) + Math.abs(y - sy) < 4) continue;
      if (blobs.some((b) => Math.hypot(b[0] - px, b[1] - py) < 44)) continue;
      blobs.push([px, py, Math.round(TS * (1 + rng() * size)), Math.round(TS * (0.8 + rng() * size * 0.75)), Math.floor(rng() * 3) % (o.colors || 3)]);
    }
    G.modState.slippery = { b: blobs, falls: 0, grip: o.grip || 2.4, fall: o.fall == null ? 1 : o.fall };
  },
  update(dt) {
    const S = G.modState.slippery, m = s2m1_slipMask();
    if (!S || !m) return;
    s2m1_paintPuddles();
    for (const p of G.players) if (p.alive && !s2m1_remote(p) && !(p.execT > 0)) s2m1_slide(p, dt, S.grip, m, moveEntity);
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.static || e.flying || e.kind === 'B' || e.kind === 'K' || e.kind === 'R' || e.kind === 'O') continue;
      let st = s2m1_eSlip.get(e);
      if (!st) { st = { x: e.x, y: e.y, cd: 1, vx: 0, vy: 0 }; s2m1_eSlip.set(e, st); }
      st.cd -= dt;
      if (e.state === 'down') {   // weiterschlittern
        if (st.vx || st.vy) {
          moveEntity(e, st.vx * dt, st.vy * dt);
          const k = Math.exp(-dt * 3); st.vx *= k; st.vy *= k;
          if (Math.hypot(st.vx, st.vy) < 6) st.vx = st.vy = 0;
        }
      } else if (dt > 0 && m[s2m1_ti(e.x, e.y)] && st.cd <= 0 && G.time > 1.5) {
        const vx = (e.x - st.x) / dt, vy = (e.y - st.y) / dt, sp = Math.hypot(vx, vy);
        const chance = (e.state === 'alert' || e.state === 'search' ? 1.1 : 0.35) * S.fall;
        if (sp > 40 && Math.random() < chance * dt) {
          const ang = Math.atan2(vy, vx);
          knockDown(e, ang, 2.1);
          if (e.state === 'down') {
            st.vx = Math.cos(ang) * 140; st.vy = Math.sin(ang) * 140; st.cd = 4.5;
            say(e, pick(S2M1_SLIP_SAY), 1.5); floatText(e.x, e.y - 14, 'AUSGERUTSCHT!', '#ffc04a', true);
            S.falls++; Sound.play('s2m1_slip');
          }
        }
      }
      st.x = e.x; st.y = e.y;
    }
  },
  clientUpdate(dt) {
    const S = G.modState.slippery, m = s2m1_slipMask(), me = s2m1_me();
    s2m1_paintPuddles();
    if (S && m && me) s2m1_slide(me, dt, S.grip || 2.4, m, netLocalMove);   // eigene Figur bewegt der Gast selbst
  },
  draw(g) {
    const S = G.modState.slippery;
    if (!S || !S.b) return;
    s2m1_paintPuddles();
    for (const [bx, by, rx, ry] of S.b) {   // Glitzern
      if (!s2m1_inView(bx, by)) continue;
      for (let k = 0; k < 3; k++) {
        const ph = T * 1.7 + hash(k, bx + by) * 6;
        if (Math.sin(ph) < 0.6) continue;
        g.fillStyle = 'rgba(255,255,240,0.85)';
        const x = Math.round(bx + (hash(bx, k) - 0.5) * rx * 1.2), y = Math.round(by + (hash(k, by) - 0.5) * ry * 1.1);
        g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y + 1, 3, 1); g.fillRect(x, y + 2, 1, 1);
      }
    }
  },
  hud() {
    s2m1_hint('slippery');
    const S = G.modState.slippery;
    if (S && S.falls > 0) txt('AUSRUTSCHER: ' + S.falls, W / 2, s2m1_row(), { font: FS, align: 'center', color: '#ffc04a' });
  },
};

// =====================================================================
//  ALARM - Stealth: wer gesehen wird, löst Alarm aus -> Verstärkung aus Türen
// =====================================================================
const S2M1_REINF_SAY = ['VERSTÄRKUNG IST DA!', 'WER HAT GEKLINGELT?', 'SECURITY! KEINE PANIK!', 'ICH HAB NUR KAFFEE GEHOLT!', 'WO BRENNT\'S?'];
function s2m1_alarmStart(why, x, y) {
  const A = G.modState.alarm;
  if (!A || A.on || A.off || G.cleared) return;
  A.on = 1; A.t = 0; A.by = why; A.sir = 0;
  Sound.play('alert'); shake(4);
  floatText(x, y - 22, why === 'KAMERA' ? 'KAMERA-ALARM!!' : 'ALARM!!', '#ff3a3a');
  makeNoise(x, y, 300);
}
function s2m1_spawnSpots(minD) {
  const pl = G.players.filter((p) => p.alive), ref = pl.length ? pl : G.players;
  const near = (x, y) => Math.min(...ref.map((p) => dist(p.x, p.y, x, y)));
  const seen = (x, y) => ref.some((p) => dist(p.x, p.y, x, y) < 230 && los(p.x, p.y, x, y));
  const reach = s2m1_bfs(s2m1_ti(ref[0].x, ref[0].y)), out = [];
  for (const k in G.doors) {
    const i = +k;
    if (G.tiles[i] !== 'D') continue;
    const x = i % G.w, y = (i / G.w) | 0;
    let best = null, bd = -1;   // Bodenfeld neben der Tür, möglichst weit weg von den Spielern
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = (y + dy) * G.w + x + dx;
      if (!s2m1_floor(j) || reach[j] < 0) continue;
      const [px, py] = s2m1_tc(j), d = near(px, py);
      if (d > bd) { bd = d; best = [px, py]; }
    }
    if (best && bd > minD && !seen(best[0], best[1])) out.push([best[0], best[1], bd]);
  }
  if (!out.length) {   // keine passende Tür: ferne, erreichbare Bodenfelder
    for (let k = 0; k < 500 && out.length < 6; k++) {
      const i = randi(0, G.w * G.h - 1);
      if (!s2m1_floor(i) || reach[i] < 0) continue;
      const [px, py] = s2m1_tc(i), d = near(px, py);
      if (d > minD + 40 && !seen(px, py)) out.push([px, py, d]);
    }
  }
  out.sort((a, b) => a[2] - b[2]);   // die nächsten (aber unsichtbaren) zuerst -> Verstärkung kommt schnell an
  return out;
}
function s2m1_alarmWave(A) {
  const spots = s2m1_spawnSpots(150);
  if (!spots.length) return;
  for (let k = 0; k < A.per; k++) {
    const s = spots[k % Math.min(spots.length, 3)];
    const e = s2m1_spawnEnemy(s2m1_mixPick(A.mix), s[0] + rand(-3, 3), s[1] + rand(-3, 3));
    if (k === 0) say(e, pick(S2M1_REINF_SAY), 2);
  }
  Sound.play('door');
}
FLOOR_MODS.alarm = {
  setup(F, L) {
    s2m1_dedupe(); s2m1_hackReg();
    const o = s2m1_opts('alarm');
    G.modState.alarm = { on: 0, t: 0, w: 0, waves: o.waves == null ? 2 : o.waves, per: o.per || (G.diff >= 10.5 ? 3 : 2) + 1, delay: o.delay == null ? 3 : o.delay,
      gap: o.gap || 9, bonus: o.bonus == null ? Math.round(150 + G.diff * 30) : o.bonus, paid: 0, by: '', sir: 0, mix: o.mix || 'EEMUS' };
  },
  update(dt) {
    const A = G.modState.alarm;
    if (!A) return;
    if (!A.on) {
      if (G.cleared) {
        if (!A.paid && A.bonus > 0) {
          A.paid = 1; run.cash += A.bonus;
          floatText(G.player.x, G.player.y - 30, 'LAUTLOS-BONUS +' + A.bonus + ' €', '#7dff7a'); Sound.play('combo', 6);
        }
        return;
      }
      if (G.time < 1.5 || A.off) return;
      for (const e of G.enemies) if (e.state === 'alert' && !e.static && e.kind !== 'O' && e.kind !== 'V') { say(e, 'ALAAARM!', 2); s2m1_alarmStart('GEGNER', e.x, e.y); break; }
      return;
    }
    A.t += dt; A.sir -= dt;
    if (A.sir <= 0 && !G.cleared) { Sound.play('s2m1_siren', A.t < 8 ? 1 : 0.6); A.sir = A.t < 8 ? 1.5 : 6; }
    if (A.w < A.waves) {
      const due = A.delay + A.w * A.gap;
      if (A.t >= due || (!s2m1_live() && A.t >= Math.min(due, A.delay))) { s2m1_alarmWave(A); A.w++; checkClear(); }
    }
  },
  canClear() { const A = G.modState.alarm; return !(A && A.on && A.w < A.waves); },
  drawScreen(g) {
    const A = G.modState.alarm;
    if (!A || !A.on || G.cleared) return;
    const a = 0.16 + 0.12 * Math.sin(T * 9);
    g.fillStyle = 'rgba(255,0,30,' + a.toFixed(3) + ')';
    g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6); g.fillRect(0, 6, 6, H - 12); g.fillRect(W - 6, 6, 6, H - 12);
    if (Math.floor(T * 3) % 2 === 0) { g.fillStyle = 'rgba(255,0,30,0.06)'; g.fillRect(0, 0, W, H); }
    for (const sx of [10, W - 10]) {   // Rundumleuchten in den Ecken
      const ang = T * 6 * (sx < W / 2 ? 1 : -1);
      g.fillStyle = 'rgba(255,40,40,0.18)';
      g.beginPath(); g.moveTo(sx, 10); g.arc(sx, 10, 70, ang - 0.25, ang + 0.25); g.closePath(); g.fill();
      g.fillStyle = '#ff2a2a'; g.fillRect(sx - 3, 6, 6, 6); g.fillStyle = '#ffd0d0'; g.fillRect(sx - 1, 7, 2, 2);
    }
  },
  hud() {
    s2m1_hint('alarm');
    const A = G.modState.alarm;
    if (!A || G.cleared && !A.on) return;
    const y = s2m1_row();
    if (!A.on) txt((A.off ? 'ALARM GEHACKT - ' : '') + (A.paid && !G.cleared ? 'KEIN BONUS' : 'LAUTLOS: +' + A.bonus + ' € BONUS'), W / 2, y, { font: FS, align: 'center', color: A.paid && !G.cleared ? '#c8ccd4' : '#7dff7a' });
    else if (!G.cleared) {
      const left = A.w < A.waves ? Math.max(0, Math.ceil(A.delay + A.w * A.gap - A.t)) : -1;
      txt('!! ALARM !!' + (left >= 0 ? '  VERSTÄRKUNG IN ' + left : ''), W / 2, y, { font: FS, align: 'center', color: Math.floor(T * 4) % 2 ? '#ff3a3a' : '#ffffff' });
    }
  },
};

// =====================================================================
//  CAMERAS - schwenkende Überwachungskameras an den Wänden
// =====================================================================
// Kamera = [x, y, Grundwinkel, Schwenk, Periode, Phase, kaputt, Entdeckung 0..1, Pause]
function s2m1_camAng(c) { return c[2] + Math.sin(G.time * TAU / c[4] + c[5]) * c[3]; }
function s2m1_camSees(S, c, a, p) {
  const d = dist(c[0], c[1], p.x, p.y);
  if (d > S.range + p.r) return false;
  if (d > 6 && Math.abs(angDiff(a, Math.atan2(p.y - c[1], p.x - c[0]))) > S.half) return false;
  return los(c[0], c[1], p.x, p.y);
}
function s2m1_camHit(c) {
  for (const b of G.bullets) if (b.owner === 'player' && dist(b.x, b.y, c[0], c[1]) < 9) { b.life = 0; return true; }
  for (const k of G.pickups) if (k.flying && dist(k.x, k.y, c[0], c[1]) < 11) return true;
  for (const q of G.parts) if (q.kind === 'flash' && q.col === '#fff3c0' && dist(q.x, q.y, c[0], c[1]) < q.s / 0.8 + 6) return true;
  for (const p of G.players) {
    if (!p.alive || !(p.swingT > 0.06)) continue;
    const w = p.weapon && WEAPONS[p.weapon.id] ? WEAPONS[p.weapon.id] : FISTS;
    if (w.ranged) continue;
    const d = dist(p.x, p.y, c[0], c[1]);
    if (d < (w.reach || 18) + 8 && (d < 8 || Math.abs(angDiff(p.a, Math.atan2(c[1] - p.y, c[0] - p.x))) < (w.arc || 1.2) + 0.2)) return true;
  }
  return false;
}
FLOOR_MODS.cameras = {
  setup(F, L) {
    s2m1_dedupe(); s2m1_hackReg();
    const o = s2m1_opts('cameras'), rng = s2m1_rng(23), P = G.player, range = o.range || 120, half = o.half || 0.36;
    let floors = 0;
    for (let i = 0; i < G.w * G.h; i++) if (s2m1_floor(i)) floors++;
    const n = o.n || clamp(Math.round(floors / 150), 3, 7), cand = [];
    const wall = (x, y) => isWallC(T_(x, y));
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {   // auch Außenwände + einfache Innenwände (Handkarten)
      if (T_(x, y) !== '#') continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x1 = x + dx, y1 = y + dy, x2 = x + 2 * dx, y2 = y + 2 * dy;
        if (x2 < 0 || y2 < 0 || x2 >= G.w || y2 >= G.h) continue;
        if (!s2m1_floor(y1 * G.w + x1) || !s2m1_floor(y2 * G.w + x2)) continue;
        if (!wall(x + dy, y + dx) || !wall(x - dy, y - dx)) continue;   // gerade Wand
        cand.push([x, y, dx, dy]);
      }
    }
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const cams = [];
    if (o.at) for (const [x, y, dx, dy] of o.at) cand.unshift([x, y, dx, dy, 1]);
    for (const gap of [7, 5]) for (const [x, y, dx, dy, forced] of cand) {   // zweiter Durchgang mit weniger Abstand (kleine Karten)
      if (cams.length >= n + (o.at ? o.at.length : 0)) break;
      const cx = x * TS + 8 + dx * 10, cy = y * TS + 8 + dy * 10;
      if (cams.some((c) => c[0] === cx && c[1] === cy)) continue;
      if (forced && gap === 5) continue;
      if (!forced) {
        if (dist(cx, cy, P.x, P.y) < 7 * TS || (dist(cx, cy, P.x, P.y) < range + 24 && los(cx, cy, P.x, P.y))) continue;
        if (cams.some((c) => dist(c[0], c[1], cx, cy) < gap * TS)) continue;
      }
      cams.push([cx, cy, Math.round(Math.atan2(dy, dx) * 1000) / 1000, Math.round((0.55 + rng() * 0.35) * 100) / 100, Math.round((4 + rng() * 3) * 100) / 100, Math.round(rng() * TAU * 100) / 100, 0, 0, 0]);
    }
    G.modState.cameras = { c: cams, range, half, spot: o.spot || 0.6, noise: o.noise || 340, kills: 0 };
  },
  update(dt) {
    const S = G.modState.cameras;
    if (!S) return;
    for (const c of S.c) {
      if (c[6]) continue;
      if (s2m1_camHit(c)) {
        c[6] = 1; c[7] = 0; S.kills++;
        sparks(c[0], c[1], 14, '#9ff'); sparks(c[0], c[1], 8, '#ffe14d'); Sound.play('glass');
        run.score += 250; floatText(c[0], c[1] - 14, 'KAMERA KAPUTT! +250', '#7ff');
        continue;
      }
      if (c[8] > 0) { c[8] = Math.max(0, c[8] - dt); continue; }
      if (G.time < 1.5 || G.cleared) { c[7] = Math.max(0, c[7] - dt); continue; }
      const a = s2m1_camAng(c);
      let seen = null;
      for (const p of G.players) if (p.alive && s2m1_camSees(S, c, a, p)) { seen = p; break; }
      if (seen) {
        if (c[7] === 0) Sound.play('s2m1_cam');
        c[7] = Math.min(1, c[7] + dt / S.spot);
        if (c[7] >= 1) {
          c[7] = 0; c[8] = 6;
          floatText(seen.x, seen.y - 20, 'GEFILMT!', '#ff3a3a'); Sound.play('alert');
          if (G.modState.alarm) s2m1_alarmStart('KAMERA', seen.x, seen.y);
          makeNoise(seen.x, seen.y, S.noise);
        }
      } else c[7] = Math.max(0, c[7] - dt * 0.8);
    }
  },
  draw(g) {
    const S = G.modState.cameras;
    if (!S || !S.c) return;
    for (const c of S.c) {
      if (!s2m1_inView(c[0], c[1], S.range + 20)) continue;
      const base = c[2], mx = Math.round(c[0] - Math.cos(base) * 2), my = Math.round(c[1] - Math.sin(base) * 2);
      if (!c[6]) {   // Sichtkegel (an Wänden abgeschnitten)
        const a = s2m1_camAng(c), alarm = c[8] > 0, hot = c[7] > 0;
        g.fillStyle = alarm ? 'rgba(255,40,40,' + (0.16 + 0.1 * Math.sin(T * 14)).toFixed(3) + ')' : hot ? 'rgba(255,120,40,' + (0.14 + c[7] * 0.16).toFixed(3) + ')' : 'rgba(255,240,140,0.11)';
        g.beginPath(); g.moveTo(c[0], c[1]);
        for (let k = 0; k <= 10; k++) {
          const ra = a - S.half + (2 * S.half * k) / 10, ca = Math.cos(ra), sa = Math.sin(ra);
          let d = 4;
          while (d < S.range && !blocksSightTile(Math.floor((c[0] + ca * d) / TS), Math.floor((c[1] + sa * d) / TS))) d += 4;
          g.lineTo(c[0] + ca * d, c[1] + sa * d);
        }
        g.closePath(); g.fill();
        // Kamera
        g.save(); g.translate(mx, my);
        g.fillStyle = '#3a3d44'; g.fillRect(-3, -3, 6, 6);
        g.rotate(a);
        g.fillStyle = '#c8ccd4'; g.fillRect(-1, -3, 8, 6); g.fillStyle = '#7a7f88'; g.fillRect(-1, 2, 8, 1);
        g.fillStyle = '#111'; g.fillRect(6, -2, 2, 4); g.fillStyle = '#5ad0ff'; g.fillRect(7, -1, 1, 1);
        g.fillStyle = alarm || Math.floor(T * 2 + c[5]) % 2 ? '#ff2a2a' : '#5a1010'; g.fillRect(1, -2, 2, 1);
        g.restore();
      } else if (c[6] === 2) {   // gehackt: Kamera hängt schlaff nach unten, LED grün
        g.fillStyle = '#3a3d44'; g.fillRect(mx - 3, my - 3, 6, 6);
        g.fillStyle = '#c8ccd4'; g.fillRect(mx - 3, my + 1, 6, 7); g.fillStyle = '#111'; g.fillRect(mx - 2, my + 7, 4, 2);
        g.fillStyle = Math.floor(T * 2 + c[5]) % 2 ? '#39ff7a' : '#145a24'; g.fillRect(mx - 2, my + 2, 1, 2);
      } else {   // kaputt: hängt am Kabel
        g.fillStyle = '#3a3d44'; g.fillRect(mx - 3, my - 3, 6, 6);
        g.fillStyle = '#222'; g.fillRect(mx, my, 1, 5);
        g.fillStyle = '#7a7f88'; g.fillRect(mx - 2, my + 5, 5, 3);
        if (Math.floor(T * 5 + c[5]) % 7 === 0) { g.fillStyle = '#ffe14d'; g.fillRect(mx + 2, my + 4, 1, 1); }
      }
    }
  },
  hud() {
    s2m1_hint('cameras');
    const S = G.modState.cameras;
    if (!S || !S.c || !S.c.length) return;
    const alive = S.c.filter((c) => !c[6]).length, spot = S.c.some((c) => !c[6] && c[7] > 0.25);
    if (S.hacked && !alive) { txt('KAMERAS GEHACKT', W / 2, s2m1_row(), { font: FS, align: 'center', color: '#39ff7a' }); return; }
    if (alive || S.kills) txt('KAMERAS: ' + alive + (spot ? '  - DU WIRST GEFILMT!' : ''), W / 2, s2m1_row(), { font: FS, align: 'center', color: spot ? '#ff7a3a' : '#c8ccd4' });
  },
};

// =====================================================================
//  FIRE - Feuer breitet sich aus, Brandherde brennen bis man sie mit O-Saft löscht
// =====================================================================
let s2m1_fh = null, s2m1_fv = null;
function s2m1_fireHost() {   // Host-Rechenpuffer (pro Etage): 0 frei, 1 brennt, 2 Asche, 3 nass
  if (!s2m1_fh || s2m1_fh.G !== G) {
    s2m1_fh = { G, st: new Uint8Array(G.w * G.h), end: new Float32Array(G.w * G.h), heat: new WeakMap(), eh: new WeakMap() };
    const S = G.modState.fire;
    if (S) for (const i of S.b) { s2m1_fh.st[i] = 1; s2m1_fh.end[i] = G.time + S.burn; }
  }
  return s2m1_fh;
}
function s2m1_fireAt(S, H_, i) {
  if (H_ && H_.st[i] === 1) return true;
  for (const s of S.s) if (s[1] && s[0] === i) return true;
  return false;
}
function s2m1_douse(S, H_, x, y, r) {
  let n = 0;
  for (let k = S.b.length - 1; k >= 0; k--) {
    const i = S.b[k], [cx, cy] = s2m1_tc(i);
    if (dist(cx, cy, x, y) > r + 6) continue;
    S.b.splice(k, 1); H_.st[i] = 3; S.w.push(i); n++;
  }
  for (const s of S.s) {
    if (!s[1]) continue;
    const [cx, cy] = s2m1_tc(s[0]);
    if (dist(cx, cy, x, y) > r + 8) continue;
    s[1] = 0; H_.st[s[0]] = 3; S.out++; n++;
    run.cash += 40; run.score += 300;
    floatText(cx, cy - 18, 'BRANDHERD GELÖSCHT! +40 €', '#7ff');
  }
  if (S.w.length > 40) S.w.splice(0, S.w.length - 40);
  if (n) { Sound.play('s2m1_hiss'); for (let k = 0; k < 8; k++) G.parts.push({ x: x + rand(-r, r) * 0.5, y: y + rand(-r, r) * 0.5, vx: rand(-15, 15), vy: rand(-35, -15), life: rand(0.6, 1.1), col: 'rgba(230,230,240,0.55)', s: 3, kind: 'smoke', fric: 1 }); }
}
// Rauch + Funken (Host und Gast, nur Anzeige)
function s2m1_fireFx(S, dt) {
  const v = s2m1_view(20), emit = (i, big) => {
    const [x, y] = s2m1_tc(i);
    if (x < v[0] || x > v[2] || y < v[1] || y > v[3]) return;
    if (Math.random() < dt * (big ? 5 : 1.4)) G.parts.push({ x: x + rand(-5, 5), y: y - 6, vx: rand(-8, 8), vy: rand(-30, -14), life: rand(0.7, 1.3), col: pick(['rgba(60,60,60,0.55)', 'rgba(100,100,100,0.45)', 'rgba(35,35,35,0.6)']), s: pick([2, 3, 3, 4]), kind: 'smoke', fric: 0.5 });
    if (Math.random() < dt * (big ? 3 : 0.7)) G.parts.push({ x: x + rand(-5, 5), y: y - 4, vx: rand(-14, 14), vy: rand(-55, -30), life: rand(0.3, 0.6), col: pick(['#ffb84a', '#ffe14d', '#ff6a1a']), s: 1, kind: 'ember', fric: 1 });
  };
  for (const i of S.b) emit(i, false);
  for (const s of S.s) if (s[1]) emit(s[0], true);
}
// Asche / O-Saft-Lache in die Deko-Ebene malen, sobald ein Feld nicht mehr brennt (Host + Gast)
function s2m1_firePaint(S) {
  if (!G.dchunks) return;
  if (!s2m1_fv || s2m1_fv.G !== G || s2m1_fv.dc !== G.dchunks) s2m1_fv = { G, dc: G.dchunks, prev: new Set(), src: new Set() };
  const cur = new Set(S.b), wet = new Set(S.w || []);
  const paint = (i, isWet, big) => {
    const [x, y] = s2m1_tc(i);
    withDecal(x, y, 14, (g) => {
      if (isWet) { pxEll(g, x, y, big ? 10 : 7, big ? 8 : 6, 'rgba(255,154,26,0.45)'); g.fillStyle = 'rgba(255,230,160,0.6)'; g.fillRect(x - 3, y - 2, 3, 1); }
      else { pxEll(g, x, y, 8, 7, 'rgba(25,18,12,0.5)'); g.fillStyle = 'rgba(10,8,6,0.6)'; for (let k = 0; k < 4; k++) g.fillRect(x - 6 + Math.floor(hash(i, k) * 12), y - 5 + Math.floor(hash(k, i) * 10), 2, 1); }
    });
  };
  for (const i of s2m1_fv.prev) if (!cur.has(i)) paint(i, wet.has(i), false);
  for (const s of S.s) if (!s[1] && !s2m1_fv.src.has(s[0])) { s2m1_fv.src.add(s[0]); paint(s[0], true, true); }
  s2m1_fv.prev = cur;
}
function s2m1_flame(g, x, y, i, s) {   // x,y = Mitte unten
  g.fillStyle = 'rgba(255,110,20,0.2)'; g.fillRect(Math.round(x - 10 * s), Math.round(y - 12 * s), Math.round(20 * s), Math.round(16 * s));
  for (let k = 0; k < 3; k++) {
    const fx = Math.round(x - 6 * s + k * 4 * s), ph = hash(i, k) * 10;
    const h = Math.round((6 + 4 * Math.sin(T * 11 + ph) + (k === 1 ? 4 : 0)) * s), w4 = Math.max(2, Math.round(4 * s)), w2 = Math.max(1, Math.round(2 * s));
    g.fillStyle = '#d8321a'; g.fillRect(fx, y - h, w4, h);
    g.fillStyle = '#ff8a1a'; g.fillRect(fx + 1, y - Math.round(h * 0.72), w2, Math.round(h * 0.72));
    g.fillStyle = '#ffe14d'; g.fillRect(fx + 1, y - Math.round(h * 0.38), w2, Math.round(h * 0.38));
    if (Math.sin(T * 17 + ph * 3) > 0.7) { g.fillStyle = '#ffb84a'; g.fillRect(fx + 1, y - h - 2, 1, 1); }
  }
}
FLOOR_MODS.fire = {
  setup(F, L) {
    s2m1_dedupe();
    const o = s2m1_opts('fire'), rng = s2m1_rng(31), d = s2m1_bfs(s2m1_ti(G.player.x, G.player.y));
    let max = 0;
    for (let i = 0; i < d.length; i++) if (d[i] > max) max = d[i];
    const src = [];
    if (o.at) for (const [x, y] of o.at) src.push([y * G.w + x, 1]);
    else {
      const n = o.seeds || (max > 45 ? 3 : 2), cand = [];
      for (let i = 0; i < d.length; i++) if (d[i] >= max * 0.4 && d[i] <= max * 0.9 && s2m1_floor(i)) cand.push(i);
      for (let tries = 0; src.length < n && tries < 300 && cand.length; tries++) {
        const i = cand[Math.floor(rng() * cand.length)], [x, y] = s2m1_tc(i);
        if (G.exits.some((e) => { const [ex, ey] = s2m1_tc(e); return dist(ex, ey, x, y) < 5 * TS; })) continue;
        if (src.some((s) => { const [sx, sy] = s2m1_tc(s[0]); return dist(sx, sy, x, y) < 8 * TS; })) continue;
        src.push([i, 1]);
      }
    }
    G.modState.fire = { b: [], s: src, w: [], out: 0, nt: 1, rate: o.rate || 0.8, burn: o.burn || 13, max: o.max || 60, osaft: o.osaft == null ? 2 : o.osaft, sp: 0, dmg: o.dmgTime || 0.45 };
  },
  update(dt) {
    const S = G.modState.fire;
    if (!S) return;
    const H_ = s2m1_fireHost();
    if (!S.sp) {   // O-Saft zum Löschen neben den Start legen (Host -> Gäste sehen die Waffen normal)
      S.sp = 1;
      for (let k = 0; k < S.osaft; k++) { const [x, y] = spotNear(G.player.x, G.player.y); spawnPickup(x, y, 'osaft', WEAPONS.osaft.ammo, 0, 0); }
    }
    s2m1_fireFx(S, dt);
    if (G.time < 1.5) return;
    // Löschen: jede O-Saft-Explosion (Flasche, Bomber, Saftkanonen-Knall) und Saft-Kugeln
    for (const q of G.parts) if (q.kind === 'flash' && q.col === '#fff3c0' && !q.s2m1) { q.s2m1 = 1; s2m1_douse(S, H_, q.x, q.y, q.s / 0.8 + 10); }
    for (const b of G.bullets) if (b.owner === 'player' && (b.kind === 'juice' || b.kind === 'blob')) { const i = s2m1_ti(b.x, b.y); if (i >= 0 && s2m1_fireAt(S, H_, i)) s2m1_douse(S, H_, b.x, b.y, b.kind === 'blob' ? 12 : 8); }
    // Ausbrennen -> Asche
    for (let k = S.b.length - 1; k >= 0; k--) { const i = S.b[k]; if (G.time >= H_.end[i]) { S.b.splice(k, 1); H_.st[i] = 2; } }
    // Ausbreiten
    S.nt -= dt;
    if (S.nt <= 0) {
      S.nt = S.rate * (0.6 + Math.random() * 0.8);
      const live = S.s.filter((s) => s[1]).map((s) => s[0]), pool = S.b.concat(live);
      const tries = 1 + Math.floor(pool.length / 6);
      for (let t = 0; t < tries && pool.length && S.b.length < S.max; t++) {
        const i = pick(pool), x = i % G.w, y = (i / G.w) | 0, [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        const j = (y + dy) * G.w + x + dx;
        if (x + dx < 0 || y + dy < 0 || x + dx >= G.w || y + dy >= G.h || !s2m1_floor(j) || H_.st[j] !== 0) continue;
        if (S.s.some((s) => s[0] === j)) continue;
        H_.st[j] = 1; H_.end[j] = G.time + S.burn + Math.random() * 4; S.b.push(j);
      }
    }
    // Spieler: wer im Feuer steht, wird heiß -> Tod
    for (const p of G.players) {
      if (!p.alive) continue;
      let h = H_.heat.get(p) || 0;
      if (s2m1_fireAt(S, H_, s2m1_ti(p.x, p.y))) {
        if (h === 0) floatText(p.x, p.y - 18, 'HEISS! HEISS!', '#ff8a1a', true);
        h += dt;
        if (h >= S.dmg) { h = 0; killPlayer(null, 0, 's2m1_fire', p); }
      } else h = Math.max(0, h - dt * 0.6);
      H_.heat.set(p, h);
    }
    // Gegner meiden das Feuer (werden rausgeschoben) und verbrennen, wenn sie drin bleiben
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.static || e.flying || e.kind === 'B' || e.kind === 'O') continue;
      const i = s2m1_ti(e.x, e.y);
      let h = H_.eh.get(e) || 0;
      if (i >= 0 && s2m1_fireAt(S, H_, i)) {
        const [cx, cy] = s2m1_tc(i), ang = Math.atan2(e.y - cy, e.x - cx) || Math.random() * TAU;
        moveEntity(e, Math.cos(ang) * 70 * dt, Math.sin(ang) * 70 * dt);
        if (h === 0) say(e, pick(['AUA, HEISS!', 'MEINE HOSE BRENNT!', 'FEUER! FEUER!']), 1.2);
        h += dt;
        if (h >= 1) { h = 0; killEnemy(e, 's2m1_fire', ang); }
      } else h = Math.max(0, h - dt);
      H_.eh.set(e, h);
    }
  },
  clientUpdate(dt) { const S = G.modState.fire; if (S && S.b) s2m1_fireFx(S, dt); },
  draw(g) {
    const S = G.modState.fire;
    if (!S || !S.b) return;
    s2m1_firePaint(S);
    const v = s2m1_view(20);
    for (const s of S.s) {   // Brandherd = umgekippte Fritteuse
      const [x, y] = s2m1_tc(s[0]);
      if (x < v[0] || x > v[2] || y < v[1] || y > v[3]) continue;
      g.fillStyle = '#4a4f58'; g.fillRect(x - 6, y - 2, 12, 8); g.fillStyle = '#6a6f78'; g.fillRect(x - 6, y - 2, 12, 2); g.fillStyle = '#2a2d34'; g.fillRect(x - 7, y + 1, 1, 3); g.fillRect(x + 6, y + 1, 1, 3);
      if (s[1]) s2m1_flame(g, x, y, s[0], 1.5);
      else if (Math.sin(T * 3 + s[0]) > 0) { g.fillStyle = 'rgba(230,230,240,0.5)'; g.fillRect(x - 2, y - 8 - Math.round((T * 8) % 6), 2, 2); }
    }
    for (const i of S.b) {
      const [x, y] = s2m1_tc(i);
      if (x < v[0] || x > v[2] || y < v[1] || y > v[3]) continue;
      s2m1_flame(g, x, y + 6, i, 1);
    }
  },
  drawScreen(g) {
    const S = G.modState.fire;
    if (!S || !S.b || !S.b.length) return;
    g.fillStyle = 'rgba(255,90,20,' + Math.min(0.07, S.b.length / 800).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
  },
  hud() {
    s2m1_hint('fire');
    const S = G.modState.fire;
    if (!S || !S.b) return;
    const src = S.s.filter((s) => s[1]).length;
    if (src || S.b.length) txt('FEUER: ' + S.b.length + ' FELDER' + (src ? '  -  BRANDHERDE: ' + src : ''), W / 2, s2m1_row(), { font: FS, align: 'center', color: '#ff8a1a' });
  },
};

// =====================================================================
//  FLOOD - Wasser steigt von einer Seite: flach = langsam, tief = absaufen
// =====================================================================
const s2m1_fPrev = new WeakMap();
function s2m1_u(S, x, y) { return S.side === 0 ? x : S.side === 1 ? G.w * TS - x : S.side === 2 ? y : G.h * TS - y; }
// Wasserband [u0,u1) zeichnen, nur über Nicht-Leere-Feldern (Wände malen später drüber)
function s2m1_fillBand(g, S, u0, u1, col) {
  if (u1 <= u0) return;
  const Wp = G.w * TS, Hp = G.h * TS, v = s2m1_view(16);
  let x0, x1, y0, y1;
  if (S.side === 0) { x0 = u0; x1 = u1; y0 = 0; y1 = Hp; } else if (S.side === 1) { x0 = Wp - u1; x1 = Wp - u0; y0 = 0; y1 = Hp; }
  else if (S.side === 2) { y0 = u0; y1 = u1; x0 = 0; x1 = Wp; } else { y0 = Hp - u1; y1 = Hp - u0; x0 = 0; x1 = Wp; }
  x0 = Math.max(x0, v[0], 0); x1 = Math.min(x1, v[2], Wp); y0 = Math.max(y0, v[1], 0); y1 = Math.min(y1, v[3], Hp);
  if (x1 <= x0 || y1 <= y0) return;
  g.fillStyle = col;
  const tx0 = Math.floor(x0 / TS), tx1 = Math.min(G.w - 1, Math.floor((x1 - 0.01) / TS));
  for (let ty = Math.floor(y0 / TS); ty <= Math.min(G.h - 1, Math.floor((y1 - 0.01) / TS)); ty++) {
    const ry0 = Math.max(y0, ty * TS), ry1 = Math.min(y1, ty * TS + TS);
    let run0 = -1;
    for (let tx = tx0; tx <= tx1 + 1; tx++) {
      const ok = tx <= tx1 && G.tiles[ty * G.w + tx] !== ' ';
      if (ok && run0 < 0) run0 = tx;
      if (!ok && run0 >= 0) {
        const rx0 = Math.max(x0, run0 * TS), rx1 = Math.min(x1, tx * TS);
        if (rx1 > rx0) g.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
        run0 = -1;
      }
    }
  }
}
FLOOR_MODS.flood = {
  setup(F, L) {
    s2m1_dedupe();
    const o = s2m1_opts('flood'), Wp = G.w * TS, Hp = G.h * TS;
    let ex = Wp / 2, ey = Hp / 2;
    if (G.exits.length) { ex = 0; ey = 0; for (const i of G.exits) { const [x, y] = s2m1_tc(i); ex += x; ey += y; } ex /= G.exits.length; ey /= G.exits.length; }
    const span = [ex, Wp - ex, ey, Hp - ey], names = { left: 0, right: 1, top: 2, bottom: 3 };
    let side = names[o.side];
    if (side == null) { side = 0; for (let k = 1; k < 4; k++) if (span[k] > span[side]) side = k; }
    const time = o.time || 75, deep = Math.max(o.deep || 130, time + 10);
    G.modState.flood = { side, span: Math.round(span[side]), len: side < 2 ? Wp : Hp, f: 0, d: 0, t: 0, delay: o.delay == null ? 4 : o.delay, time,
      deepDelay: o.deepDelay == null ? 18 : o.deepDelay, deep, drown: o.drown || 2.2, slow: o.slow == null ? 0.45 : o.slow, air: {} };
  },
  update(dt) {
    const S = G.modState.flood;
    if (!S) return;
    if (G.time > 1.5) S.t += dt;
    const fr = clamp((S.t - S.delay) / Math.max(1, S.time - S.delay), 0, 2);
    S.f = Math.round(Math.min(S.len, fr * Math.max(2 * TS, S.span - 1.5 * TS)) * 10) / 10;
    const dr = clamp((S.t - S.deepDelay) / Math.max(1, S.deep - S.deepDelay), 0, 1);
    S.d = Math.round(Math.min(S.f, dr * Math.max(0, S.span - 3 * TS)) * 10) / 10;
    for (const p of G.players) {
      if (!p.alive) { delete S.air[p.idx]; continue; }
      const u = s2m1_u(S, p.x, p.y);
      if (u < S.d) {
        const a = (S.air[p.idx] || 0) + dt;
        S.air[p.idx] = Math.round(a * 100) / 100;
        if (Math.random() < dt * 6) G.parts.push({ x: p.x + rand(-4, 4), y: p.y - 4, vx: 0, vy: -20, life: 0.5, col: 'rgba(200,230,255,0.8)', s: 2, kind: 'bubble', fric: 0 });
        if (a >= S.drown) { delete S.air[p.idx]; floatText(p.x, p.y - 18, 'BLUBB...', '#9ad0ff'); killPlayer(null, 0, 's2m1_flood', p); }
        continue;
      }
      if (S.air[p.idx]) { const a = S.air[p.idx] - dt * 1.5; if (a > 0) S.air[p.idx] = Math.round(a * 100) / 100; else delete S.air[p.idx]; }
      if (u < S.f && !s2m1_remote(p) && !(p.execT > 0)) {
        moveEntity(p, -p.vx * dt * S.slow, -p.vy * dt * S.slow);
        if (Math.hypot(p.vx, p.vy) > 40 && Math.random() < dt * 8) G.parts.push({ x: p.x + rand(-4, 4), y: p.y + 3, vx: rand(-25, 25), vy: rand(-25, 5), life: 0.3, col: 'rgba(170,215,255,0.9)', s: 1, kind: 'spray', fric: 3 });
      }
    }
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.flying || e.kind === 'B' || e.kind === 'O') continue;
      let st = s2m1_fPrev.get(e);
      if (!st) { st = { x: e.x, y: e.y, a: 0 }; s2m1_fPrev.set(e, st); }
      const u = s2m1_u(S, e.x, e.y);
      if (u < S.d) {
        st.a += dt;
        if (st.a > 1.6) { floatText(e.x, e.y - 14, e.static ? 'KURZSCHLUSS!' : 'BLUBB!', '#9ad0ff', true); killEnemy(e, 's2m1_flood', 0); continue; }
      } else if (u < S.f && !e.static && e.state !== 'down') moveEntity(e, -(e.x - st.x) * 0.4, -(e.y - st.y) * 0.4);
      st.x = e.x; st.y = e.y;
    }
  },
  clientUpdate(dt) {
    const S = G.modState.flood, me = s2m1_me();
    if (!S || !me) return;
    const u = s2m1_u(S, me.x, me.y);
    if (u < S.f && u >= S.d) netLocalMove(me, -me.vx * dt * (S.slow == null ? 0.45 : S.slow), -me.vy * dt * (S.slow == null ? 0.45 : S.slow));
  },
  draw(g) {
    const S = G.modState.flood;
    if (!S || !(S.f > 0)) return;
    s2m1_fillBand(g, S, S.d, S.f, 'rgba(40,130,230,0.34)');
    s2m1_fillBand(g, S, 0, S.d, 'rgba(12,40,120,0.66)');
    const Wp = G.w * TS, Hp = G.h * TS, v = s2m1_view(16);
    const pt = (u, w) => (S.side === 0 ? [u, w] : S.side === 1 ? [Wp - u, w] : S.side === 2 ? [w, u] : [w, Hp - u]);
    const w0 = Math.max(0, S.side < 2 ? v[1] : v[0]), w1 = Math.min(S.side < 2 ? Hp : Wp, S.side < 2 ? v[3] : v[2]);
    for (let w = Math.floor(w0 / 4) * 4; w < w1; w += 4) {   // Schaumkante + Tiefwasser-Kante
      const [x, y] = pt(S.f + Math.sin(T * 3 + w * 0.13) * 2.5, w);
      g.fillStyle = 'rgba(225,242,255,0.75)'; g.fillRect(Math.round(x) - 1, Math.round(y), 2, 2);
      if (S.d > 0) { const [a, b] = pt(S.d + Math.sin(T * 2.3 + w * 0.17) * 2, w); g.fillStyle = 'rgba(120,180,255,0.55)'; g.fillRect(Math.round(a) - 1, Math.round(b), 2, 2); }
    }
    for (let k = 0; k < 40; k++) {   // Glitzern auf dem Wasser
      if (Math.sin(T * 2 + k * 1.7) < 0.3) continue;
      const u = hash(k, 7) * S.f, w = w0 + hash(3, k) * (w1 - w0);
      const [x, y] = pt(u, w);
      if (G.tiles[s2m1_ti(x, y)] === ' ') continue;
      g.fillStyle = 'rgba(200,235,255,0.45)'; g.fillRect(Math.round(x), Math.round(y), 3, 1);
    }
    for (const p of G.players) {   // Luft-Anzeige
      const a = S.air && S.air[p.idx];
      if (!p.alive || !a) continue;
      const f = clamp(1 - a / S.drown, 0, 1);
      g.fillStyle = '#000'; g.fillRect(Math.round(p.x) - 8, Math.round(p.y) - 16, 16, 3);
      g.fillStyle = f < 0.35 ? '#ff3a3a' : '#7fd8ff'; g.fillRect(Math.round(p.x) - 7, Math.round(p.y) - 15, Math.round(14 * f), 1);
    }
  },
  drawScreen(g) {
    const S = G.modState.flood, p = G.player;
    if (!S || !p || !p.alive) return;
    if (s2m1_u(S, p.x, p.y) < S.d) { g.fillStyle = 'rgba(10,40,140,' + (0.18 + 0.06 * Math.sin(T * 5)).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  },
  hud() {
    s2m1_hint('flood');
    const S = G.modState.flood;
    if (!S) return;
    const p = G.player, inDeep = p && p.alive && s2m1_u(S, p.x, p.y) < S.d;
    const t = inDeep ? 'RAUS AUS DEM TIEFEN WASSER!' : S.t < S.deepDelay ? 'WASSER STEIGT - TIEF IN ' + Math.ceil(S.deepDelay - S.t) + ' S' : 'WASSER STEIGT! ZUM AUSGANG!';
    txt(t, W / 2, s2m1_row(), { font: FS, align: 'center', color: inDeep ? (Math.floor(T * 4) % 2 ? '#ff3a3a' : '#ffffff') : '#7fd8ff' });
  },
};

// =====================================================================
//  BOMB - Saftbombe mit Countdown: Zünder erreichen und dranbleiben oder alle Gegner erledigen
// =====================================================================
function s2m1_bombDefuse(B, text, bonus) {
  B.def = 1; B.prog = 1;
  floatText(B.x, B.y - 22, text, 'rainbow'); Sound.play('s2m1_ding');
  if (bonus > 0) { run.cash += bonus; run.score += 1000; floatText(B.x, B.y - 34, '+' + bonus + ' € ENTSCHÄRFER-BONUS', '#7dff7a'); }
}
function s2m1_bombBoom(B) {
  B.boom = 1; B.t = 0; B.bt = 0;
  Sound.play('explode'); Sound.play('splat'); shake(22); G.flash = 0.5; hitstop(0.12);
  for (let i = 0; i < 140; i++) {
    const a = rand(TAU), sp = rand(40, 420);
    G.parts.push({ x: B.x, y: B.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.9), col: pick(JUICE), s: pick([1, 2, 3, 3]), kind: 'blood', fric: 4 });
  }
  withDecal(B.x, B.y, 70, (g) => { pxEll(g, B.x, B.y, 26, 20, 'rgba(20,14,8,0.55)'); for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU, d = 16 + hash(k, 3) * 40; pxEll(g, B.x + Math.cos(a) * d, B.y + Math.sin(a) * d, 4 + (k % 4), 3 + (k % 3), ['#e8820a', '#f0a01a', '#d97400'][k % 3]); } });
  floatText(B.x, B.y - 20, 'BOOOOOM!!', 'rainbow');
  for (const e of G.enemies) if (e.state !== 'dead' && e.kind !== 'B' && dist(e.x, e.y, B.x, B.y) < 90) hurtEnemy(e, 3, 'juice', Math.atan2(e.y - B.y, e.x - B.x));
  for (const p of G.players) if (p.alive) { p.armor = 0; p.invT = 0; killPlayer(null, Math.atan2(p.y - B.y, p.x - B.x), 's2m1_bomb', p); }
}
FLOOR_MODS.bomb = {
  setup(F, L) {
    s2m1_dedupe();
    const o = s2m1_opts('bomb'), rng = s2m1_rng(41);
    let tile = -1;
    if (o.at) tile = o.at[1] * G.w + o.at[0];
    else {
      const d = s2m1_bfs(s2m1_ti(G.player.x, G.player.y));
      let max = 0;
      for (let i = 0; i < d.length; i++) if (d[i] > max) max = d[i];
      const lo = o.near || 0.5, hi = (o.near || 0.5) + 0.25, cand = [], loose = [];
      for (let i = 0; i < d.length; i++) {
        if (d[i] < max * lo || d[i] > max * hi || !s2m1_floor(i)) continue;
        const [x, y] = s2m1_tc(i);
        if (G.exits.some((e) => { const [ex, ey] = s2m1_tc(e); return dist(ex, ey, x, y) < 5 * TS; })) continue;
        loose.push(i);
        const tx = i % G.w, ty = (i / G.w) | 0;
        if (isWallC(T_(tx, ty - 1)) || isWallC(T_(tx - 1, ty)) || isWallC(T_(tx + 1, ty))) cand.push(i);   // an die Wand gelehnt
      }
      const pool = cand.length ? cand : loose;
      tile = pool.length ? pool[Math.floor(rng() * pool.length)] : s2m1_ti(G.player.x + 3 * TS, G.player.y);
    }
    const [x, y] = s2m1_tc(tile), time = o.time || 90;
    G.modState.bomb = { x, y, t: time, max: time, prog: 0, def: 0, boom: 0, bt: 0, ls: -1, bonus: o.bonus == null ? 250 : o.bonus, need: o.hold || 2.5 };
  },
  update(dt) {
    const B = G.modState.bomb;
    if (!B) return;
    if (B.boom) { B.bt += dt; return; }
    if (B.def || G.time < 1.5) return;
    if (G.cleared || !s2m1_live()) { s2m1_bombDefuse(B, 'ALLE WEG - ZÜNDER AUS!', 0); return; }
    B.t = Math.max(0, B.t - dt);
    const sec = Math.ceil(B.t);
    if (sec !== B.ls) { B.ls = sec; if (sec <= 10) Sound.play('s2m1_beep', 1.6); else if (sec <= 30 || sec % 5 === 0) Sound.play('s2m1_beep', 0.8); }
    if (G.players.some((p) => p.alive && dist(p.x, p.y, B.x, B.y) < 20)) {
      if (B.prog === 0) floatText(B.x, B.y - 22, 'ENTSCHÄRFEN... DRANBLEIBEN!', '#ffe14d', true);
      B.prog = Math.min(1, B.prog + dt / B.need);
      if (B.prog >= 1) { s2m1_bombDefuse(B, 'ENTSCHÄRFT!', B.bonus + Math.round(B.t * 3)); return; }
    } else B.prog = Math.max(0, B.prog - dt * 0.5);
    if (B.t <= 0) s2m1_bombBoom(B);
  },
  draw(g) {
    const B = G.modState.bomb;
    if (!B || B.boom || !s2m1_inView(B.x, B.y)) return;
    const x = Math.round(B.x), y = Math.round(B.y);
    if (!B.def) { g.strokeStyle = 'rgba(255,225,77,' + (0.25 + 0.15 * Math.sin(T * 4)).toFixed(3) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 20, 0, TAU); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 1, y + 5, 10, 4, 0, 0, TAU); g.fill();
    for (let k = 0; k < 3; k++) {   // drei O-Saft-Flaschen mit Klebeband
      const bx = x - 7 + k * 5;
      g.fillStyle = '#ff9a1a'; g.fillRect(bx, y - 4, 4, 9); g.fillStyle = '#ffc04a'; g.fillRect(bx + 1, y - 3, 1, 6); g.fillStyle = '#2a8a3a'; g.fillRect(bx + 1, y - 6, 2, 2);
    }
    g.fillStyle = '#9a9aa8'; g.fillRect(x - 8, y, 15, 2);
    g.fillStyle = '#ff3a3a'; g.fillRect(x + 6, y - 8, 1, 6); g.fillStyle = '#3a8aff'; g.fillRect(x + 4, y - 9, 1, 6);
    g.fillStyle = '#111'; g.fillRect(x - 14, y - 19, 28, 11); g.fillStyle = '#444'; g.fillRect(x - 14, y - 9, 28, 1);
    const t = Math.ceil(B.t), s = B.def ? 'SAFE' : Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    txt(s, x, y - 18, { g, font: FS, align: 'center', color: B.def ? '#39ff7a' : t <= 10 && Math.floor(T * 4) % 2 ? '#ffffff' : '#ff3a3a', outline: false });
    if (!B.def && Math.floor(T * (B.t < 10 ? 8 : 2)) % 2) { g.fillStyle = '#ff2a2a'; g.fillRect(x - 1, y - 7, 2, 2); }
    if (B.prog > 0 && !B.def) { g.strokeStyle = '#39ff7a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * B.prog); g.stroke(); g.lineWidth = 1; }
  },
  drawScreen(g) {
    const B = G.modState.bomb;
    if (!B) return;
    if (B.boom) { if (B.bt < 1.4) { g.fillStyle = 'rgba(255,170,40,' + (0.75 * (1 - B.bt / 1.4)).toFixed(3) + ')'; g.fillRect(0, 0, W, H); } return; }
    if (B.def) return;
    if (B.t < 10) { g.fillStyle = 'rgba(255,0,0,' + (0.08 * (0.5 + 0.5 * Math.sin(T * 12))).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
    const s = worldToScreen(B.x, B.y);   // Pfeil zur Bombe, wenn sie nicht im Bild ist
    if (s.x > 14 && s.x < W - 14 && s.y > 14 && s.y < H - 14) return;
    const ax = clamp(s.x, 16, W - 16), ay = clamp(s.y, 30, H - 50), a = Math.atan2(s.y - ay, s.x - ax);
    g.save(); g.translate(ax, ay); g.rotate(a);
    g.fillStyle = Math.floor(T * 4) % 2 ? '#ff3a3a' : '#ffe14d';
    g.beginPath(); g.moveTo(8, 0); g.lineTo(-4, -6); g.lineTo(-4, 6); g.closePath(); g.fill();
    g.restore();
    txt('BOMBE', ax, ay + 8, { font: FS, align: 'center', color: '#ff3a3a' });
  },
  hud() {
    s2m1_hint('bomb');
    const B = G.modState.bomb;
    if (!B) return;
    const y = s2m1_row();
    if (B.boom) return void txt('BOOM! - [R] NOCHMAL', W / 2, y, { font: FS, align: 'center', color: '#ff9a1a' });
    if (B.def) return void txt('BOMBE ENTSCHÄRFT', W / 2, y, { font: FS, align: 'center', color: '#39ff7a' });
    const t = Math.ceil(B.t);
    txt('SAFTBOMBE ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') + (B.prog > 0 ? '  ENTSCHÄRFEN ' + Math.floor(B.prog * 100) + '%' : ''), W / 2, y, { align: 'center', color: t <= 10 ? (Math.floor(T * 4) % 2 ? '#ff3a3a' : '#ffffff') : '#ffb84a' });
  },
};

// =====================================================================
//  ELEVATOR - Halte-Phase: aus dem Aufzug kommen Wellen, danach geht der Ausgang auf
// =====================================================================
const S2M1_ELEV_SAY = ['NÄCHSTER HALT: DU!', 'LIFT-SERVICE!', 'ETAGE 3: HERRENMODE UND SCHLÄGEREI!', 'WER HAT GEDRÜCKT?', 'FAHRSTUHLMUSIK AUS!'];
FLOOR_MODS.elevator = {
  setup(F, L) {
    s2m1_dedupe();
    const o = s2m1_opts('elevator'), rng = s2m1_rng(57), d = s2m1_bfs(s2m1_ti(G.player.x, G.player.y));
    let max = 0;
    for (let i = 0; i < d.length; i++) if (d[i] > max) max = d[i];
    const wall = (x, y) => isWallC(T_(x, y)), ok = (x, y) => x > 0 && y > 0 && x < G.w - 1 && y < G.h - 1;
    let pickE = null;
    const tryWall = (x, y, strict) => {
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const fx = x + dx, fy = y + dy, fi = fy * G.w + fx;
        if (!ok(fx, fy) || !s2m1_floor(fi) || !s2m1_floor((y + 2 * dy) * G.w + x + 2 * dx) || d[fi] < 0) continue;
        if (strict && (!wall(x + dy, y + dx) || !wall(x - dy, y - dx))) continue;
        if (strict && (!s2m1_floor((fy + dx) * G.w + fx + dy) || !s2m1_floor((fy - dx) * G.w + fx - dy))) continue;
        return [x, y, dx, dy];
      }
      return null;
    };
    if (o.at) pickE = tryWall(o.at[0], o.at[1], false);
    if (!pickE) {
      const cand = [];
      for (let y = 1; y < G.h - 1; y++) for (let x = 1; x < G.w - 1; x++) {
        if (T_(x, y) !== '#') continue;
        const c = tryWall(x, y, true);
        if (!c) continue;
        const fi = (y + c[3]) * G.w + x + c[2], [fx, fy] = s2m1_tc(fi);
        if (d[fi] < max * 0.3 || d[fi] > max * 0.85) continue;
        if (G.exits.some((e) => { const [ex, ey] = s2m1_tc(e); return dist(ex, ey, fx, fy) < 6 * TS; })) continue;
        cand.push(c);
      }
      if (cand.length) pickE = cand[Math.floor(rng() * cand.length)];
    }
    if (!pickE) {   // Notlösung: irgendeine Wand mit Boden davor
      for (let y = 1; y < G.h - 1 && !pickE; y++) for (let x = 1; x < G.w - 1 && !pickE; x++) if (T_(x, y) === '#') pickE = tryWall(x, y, false);
    }
    if (!pickE) pickE = [Math.floor(G.player.x / TS), Math.floor(G.player.y / TS) - 1, 0, 1];
    const [wx, wy, dx, dy] = pickE;
    G.modState.elevator = { wx, wy, dx, dy, sx: (wx + dx) * TS + 8, sy: (wy + dy) * TS + 8, ph: 0, t: 0, time: o.time || 45, every: o.every || 6.5,
      per: o.per || (G.diff >= 10.8 ? 3 : 2), cap: o.cap || 6, nt: 0, w: 0, door: 0, mix: o.mix || 'EEMUS', near: o.near || 110, auto: o.auto || 0 };
  },
  update(dt) {
    const E = G.modState.elevator;
    if (!E) return;
    E.door = Math.max(0, E.door - dt);
    if (E.ph === 0) {
      if (G.time < 1.5) return;
      const near = G.players.some((p) => p.alive && dist(p.x, p.y, E.sx, E.sy) < E.near);
      if (near || !s2m1_live() || (E.auto && G.time > E.auto)) {
        E.ph = 1; E.t = 0; E.nt = 1.2; Sound.play('s2m1_ding');
        floatText(E.sx, E.sy - 22, 'DING! DER AUFZUG KOMMT!', '#ffe14d');
      }
      return;
    }
    if (E.ph !== 1) return;
    E.t += dt; E.nt -= dt;
    if (E.t >= E.time) {
      E.ph = 2; Sound.play('s2m1_ding');
      floatText(E.sx, E.sy - 22, 'AUFZUG AUSSER BETRIEB!', '#39ff7a');
      checkClear();
      return;
    }
    if (E.nt <= 0 && E.t < E.time - 3) {
      E.nt = E.every;
      const alive = G.enemies.filter((e) => e.s2m1el && e.state !== 'dead').length, n = Math.min(E.per, E.cap - alive);
      if (n <= 0) { E.nt = 1.5; return; }
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * 7;
        const e = s2m1_spawnEnemy(s2m1_mixPick(E.mix), E.sx + (E.dx ? 0 : off), E.sy + (E.dx ? off : 0));
        e.s2m1el = 1;
        if (k === 0) say(e, pick(S2M1_ELEV_SAY), 2);
      }
      E.door = 1.4; E.w++;
      Sound.play('s2m1_ding');
    }
  },
  canClear() { const E = G.modState.elevator; return !E || E.ph === 2; },
  draw(g) {
    const E = G.modState.elevator;
    if (!E) return;
    if (E.ph < 2) for (const i of G.exits) {   // Ausgang abgesperrt (Flatterband)
      const x = (i % G.w) * TS, y = ((i / G.w) | 0) * TS;
      if (!s2m1_inView(x, y)) continue;
      for (let k = 0; k < 16; k += 2) {
        g.fillStyle = (k >> 1) % 2 ? '#ffffff' : '#ff3a3a';
        g.fillRect(x + k, y + k, 2, 2); g.fillRect(x + 14 - k, y + k, 2, 2);
      }
    }
    if (!s2m1_inView(E.sx, E.sy)) return;
    const fx = (E.wx + E.dx) * TS, fy = (E.wy + E.dy) * TS;
    if (E.door > 0) { g.fillStyle = 'rgba(255,243,192,0.28)'; g.fillRect(fx - (E.dy ? 4 : 0), fy - (E.dx ? 4 : 0), E.dy ? 24 : 16, E.dx ? 24 : 16); }
    for (let k = 0; k < 16; k += 4) {   // Warnstreifen vor der Tür
      g.fillStyle = (k >> 2) % 2 ? '#111' : '#ffd23f';
      if (E.dy) g.fillRect(fx + k, E.dy > 0 ? fy : fy + 13, 4, 3); else g.fillRect(E.dx > 0 ? fx : fx + 13, fy + k, 3, 4);
    }
  },
  drawScreen(g) {
    const E = G.modState.elevator;
    if (!E || !s2m1_inView(E.sx, E.sy)) return;
    s2m1_xf(g);   // über den Wänden zeichnen
    g.translate(E.wx * TS + 8, E.wy * TS + 8); g.rotate(Math.atan2(E.dy, E.dx) - Math.PI / 2);   // lokal +y = zum Raum
    g.fillStyle = '#4a4f5a'; g.fillRect(-8, -8, 16, 16);
    g.fillStyle = '#8a909c'; g.fillRect(-7, -5, 14, 13);
    const open = E.door > 0 ? Math.min(1, Math.min(E.door, 1.4 - E.door) * 4) : 0, dw = Math.round(6 * (1 - open));
    g.fillStyle = '#fff3c0'; g.fillRect(-6, -4, 12, 12);
    g.fillStyle = '#b8bec8'; g.fillRect(-6, -4, dw, 12); g.fillRect(6 - dw, -4, dw, 12);
    if (dw > 0) { g.fillStyle = '#6a707a'; g.fillRect(-6 + dw - 1, -4, 1, 12); g.fillRect(6 - dw, -4, 1, 12); }
    g.fillStyle = '#111'; g.fillRect(-4, -8, 8, 3);
    g.fillStyle = E.ph === 1 ? (Math.floor(T * 4) % 2 ? '#ff3a3a' : '#ffe14d') : E.ph === 2 ? '#39ff7a' : '#666';
    g.fillRect(-1, -7, 2, 1); g.fillRect(-2, -8 + (E.ph === 1 ? 2 : 0), 4, 1);
    g.restore();
  },
  hud() {
    s2m1_hint('elevator');
    const E = G.modState.elevator;
    if (!E) return;
    const y = s2m1_row();
    if (E.ph === 0) txt('AUSGANG GESPERRT - ZUM AUFZUG!', W / 2, y, { font: FS, align: 'center', color: '#ffe14d' });
    else if (E.ph === 1) {
      const left = Math.max(0, Math.ceil(E.time - E.t));
      txt('HALTET DURCH: ' + left + ' S', W / 2, y, { font: FS, align: 'center', color: Math.floor(T * 3) % 2 ? '#ffe14d' : '#ffffff' });
      ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 61, y + 8, 122, 4);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(W / 2 - 60, y + 9, Math.round(120 * clamp(E.t / E.time, 0, 1)), 2);
      s2m1_hudN++;
    } else if (!G.cleared && s2m1_live()) txt('AUFZUG LEER - REST ERLEDIGEN!', W / 2, y, { font: FS, align: 'center', color: '#39ff7a' });
  },
};

// =====================================================================
//  WIRESHARK-Hack-Aktion (nur wenn s2_interact.js die Registry HACK_ACTIONS anlegt)
//  Läuft auf dem Host (host-autoritär); schaltet Alarm + Kameras dieser Etage ab.
// =====================================================================
function s2m1_secActive() {
  const A = G.modState && G.modState.alarm, S = G.modState && G.modState.cameras;
  return !!((A && !A.off && !G.cleared) || (S && S.c && S.c.some((c) => !c[6])));
}
function s2m1_secOff(p) {
  const A = G.modState.alarm, S = G.modState.cameras, pl = p && p.x != null ? p : G.player;
  if (A && !A.off) {
    if (A.on) { A.paid = 1; A.w = A.waves; }   // laufender Alarm: Verstärkung abbestellt, Bonus ist aber weg
    A.on = 0; A.off = 1;
  }
  if (S && S.c) { for (const c of S.c) if (!c[6]) { c[6] = 2; c[7] = 0; c[8] = 0; } S.hacked = 1; }
  if (pl) floatText(pl.x, pl.y - 26, 'SICHERHEIT GEHACKT! RHB: "EASY."', '#39ff7a');
  Sound.play('s2m1_ding');
  checkClear();
  return true;
}
const S2M1_HACK = { id: 's2m1_secoff', name: 'ALARM + KAMERAS AUS', label: 'ALARM + KAMERAS AUS', desc: 'KEIN ALARM, KEINE KAMERAS MEHR AUF DIESER ETAGE.',
  avail: s2m1_secActive, when: s2m1_secActive, run: s2m1_secOff, apply: s2m1_secOff };
function s2m1_hackReg() {
  if (typeof HACK_ACTIONS === 'undefined' || !HACK_ACTIONS) return false;
  try {
    if (Array.isArray(HACK_ACTIONS)) { if (!HACK_ACTIONS.some((h) => h && h.id === S2M1_HACK.id)) HACK_ACTIONS.push(S2M1_HACK); }
    else if (typeof HACK_ACTIONS === 'object' && !HACK_ACTIONS[S2M1_HACK.id]) HACK_ACTIONS[S2M1_HACK.id] = S2M1_HACK;
  } catch (e) { return false; }
  return true;
}
if (!s2m1_hackReg() && typeof setTimeout === 'function') setTimeout(s2m1_hackReg, 0);   // Registry evtl. erst in einer späteren Datei
