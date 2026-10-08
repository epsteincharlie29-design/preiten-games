'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Staffel 2: INTERAKTIVE LEVEL-ELEMENTE + HACK-AKTIONEN + ONLINE-STARTS
//
//  Kartenzeichen (F.map oder Generator, siehe GEN_FEATS unten):
//    '*' SICHERUNGSKASTEN  schlagen/schießen/Explosion -> Raum 12 s dunkel, Gegner darin blind + kurz verwirrt
//    '(' O-SAFT-FASS       Treffer -> explodiert (Kettenreaktion!), Nahkampf -> zischt 1,1 s, dann BUMM
//    ')' GETRÄNKEAUTOMAT   [E] = kaufen (Weste/Zeitlupe/Zufallswaffe, kostet Run-Geld), schlagen = Dosen fliegen raus
//    '|' HEBEL             [E] = alle Rolltore, die diesem Hebel am nächsten sind, auf/zu
//    '/' ROLLTOR           fest (wie Sicherheitstür) bis ein Hebel es öffnet; Zumachen zerquetscht Gegner
//    '{' '}' SCHACHT-PAAR  [E] = durchkriechen zum Partner-Schacht (n-tes '{' <-> n-tes '}'), Verfolger verlieren dich
//  Steht '*', '|', '{', '}' IN einer Wand (links+rechts oder oben+unten Wand), bleibt die Kachel Wand und das Ding hängt dran.
//
//  Mechanik: wir hängen uns an floorModsCall (läuft für jede Etage), Zustand nur in G.modState.s2i (einfache Daten):
//    { st: [Zahl pro Element], lt: Licht-aus-Zehntel, al: [nid, Zehntel(-1 = für immer), ...] }
//  Elemente selbst werden aus der Karte abgeleitet (Host = Gast), lokal in G.s2i (nicht synchronisiert).
//  Host rechnet alles; Gast übernimmt Kacheln (Fass weg / Rolltor auf) aus st und zeichnet.
// =====================================================================
const S2I_CH = '*()|/{}';
const S2I_BOOM = ['FASS-ALARM!', 'O-SAFT-FONTÄNE!', 'KABUMM!', 'VITAMIN-BOMBE!', 'FRUCHTFLEISCH ÜBERALL!'];
const S2I_DARK = ['WER HAT DAS LICHT AUSGEMACHT?!', 'MAMA?', 'ICH SEH NIX!', 'AUTSCH, MEIN ZEH!', 'HAT WER EINE TASCHENLAMPE?'];
const S2I_VENT = ['KRIECH, KRIECH...', 'PSST!', 'STAUBIG HIER DRIN!', 'HUST HUST.'];
const S2I_PAIR = ['#3fd0ff', '#ff3fa4', '#ffe14d', '#7dff7a', '#c08aff'];
const S2I_GUNS = ['pistol', 'shotgun', 'uzi', 'magnum', 'katana', 'bat', 'pan', 'rifle', 'golf', 'nailgun', 'crossbow', 'taser'];
const s2i_price = () => 30 + Math.round((G ? G.diff : 5) * 3);
const s2i_S = () => (G && G.modState ? G.modState.s2i : null);

// ---------------------------------------------------------------------
//  Aufbau (Host + Gast, in loadFloor nach den Etagen-Mods, vor renderStatic)
// ---------------------------------------------------------------------
function s2i_emb(x, y) {
  const w = (dx, dy) => isWallC(T_(x + dx, y + dy));
  return (w(-1, 0) && w(1, 0)) || (w(0, -1) && w(0, 1));
}
function s2i_setup() {
  const els = [], w = G.w;
  for (let i = 0; i < G.tiles.length; i++) {
    const c = G.tiles[i];
    if (S2I_CH.indexOf(c) < 0) continue;
    const x = i % w, y = (i / w) | 0;
    els.push({ k: c, i, tx: x, ty: y, x: x * TS + 8, y: y * TS + 8, emb: '*|{}'.includes(c) && s2i_emb(x, y) });
  }
  for (const el of els) {
    const fl = G.under[el.i] || '.';
    const t = el.k === '/' ? 'L' : el.emb ? '#' : (el.k === '(' || el.k === ')' || el.k === '*') ? 'w' : fl;
    G.tiles[el.i] = t; G.solid[el.i] = isSolidC(t) ? 1 : 0;
  }
  els.forEach((el) => {   // Rolltor -> nächster Hebel
    if (el.k !== '/') return;
    let b = -1, bd = 1e9;
    els.forEach((o, j) => { if (o.k === '|') { const d = dist(el.x, el.y, o.x, o.y); if (d < bd) { bd = d; b = j; } } });
    el.lv = b;
  });
  const A = [], B = [];
  els.forEach((el, j) => { if (el.k === '{') A.push(j); else if (el.k === '}') B.push(j); });
  for (let n = 0; n < Math.min(A.length, B.length); n++) { els[A[n]].to = B[n]; els[B[n]].to = A[n]; els[A[n]].pair = els[B[n]].pair = n; }
  G.s2i = { els, an: els.map(() => 0), reg: {}, dark: new Uint8Array(G.w * G.h), darkN: 0, pend: [], cd: {}, base: !!G.dark, forced: false, tg: 0 };
  G.modState.s2i = { st: els.map(() => 0), lt: 0, al: [] };
}

// ---------------------------------------------------------------------
//  Host: jede Frame
// ---------------------------------------------------------------------
function s2i_update(dt) {
  const C_ = G.s2i, S = s2i_S();
  if (!C_ || !S) return;
  s2i_anim(dt);
  for (const q of C_.pend) { q.t -= dt; if (q.t <= 0 && !q.done) { q.done = 1; s2i_boom(q.k); } }
  if (C_.pend.length) C_.pend = C_.pend.filter((q) => !q.done);
  if (C_.els.length) s2i_hits(dt);
  C_.els.forEach((el, k) => {   // Sicherungen: Dunkelzeit läuft ab
    if (el.k !== '*' || !(S.st[k] > 0)) return;
    S.st[k] = Math.max(0, S.st[k] - dt * 10);
    if (S.st[k] <= 0) {
      S.st[k] = -1;
      for (const i of s2i_region(k)) if (C_.dark[i]) C_.dark[i]--;
      C_.darkN--;
      floatText(el.x, el.y - 14, 'NOTSTROM AN.', '#ffe14d', true);
    }
  });
  if (S.lt > 0) { S.lt = Math.max(0, S.lt - dt * 10); if (S.lt <= 0) { G.dark = s2i_darkBase(); C_.forced = false; floatText(G.player.x, G.player.y - 24, 'LICHT WIEDER AN!', '#ffe14d', true); } }
  if (S.al.length) s2i_allyTick(dt);
}
function s2i_anim(dt) {
  const C_ = G.s2i, S = s2i_S();
  if (!C_ || !S || !S.st || S.st.length !== C_.els.length) return;
  C_.els.forEach((el, k) => {
    if (el.k !== '/' && el.k !== '|') return;
    const want = S.st[k] ? 1 : 0;
    C_.an[k] += clamp(want - C_.an[k], -dt * 4, dt * 4);
  });
}
// Kugel, die gerade (oder im nächsten Schritt) im Kasten um el steckt
function s2i_bulletAt(el, hw, dt, skip) {
  for (const b of G.bullets) {
    if (b.dead || (skip && b.kind === skip) || Math.abs(b.x - el.x) > 48 || Math.abs(b.y - el.y) > 48) continue;
    for (let s = 0; s <= 3; s++) {
      const px = b.x + b.vx * dt * s / 3, py = b.y + b.vy * dt * s / 3;
      if (Math.abs(px - el.x) < hw && Math.abs(py - el.y) < hw) return b;
    }
  }
  return null;
}
function s2i_thrownAt(el, r) {
  for (const k of G.pickups) if (k.flying && k.thrown && Math.abs(k.x - el.x) < r && Math.abs(k.y - el.y) < r) { k.thrown = false; k.vx *= -0.3; k.vy *= -0.3; return k; }
  return null;
}
function s2i_hits(dt) {
  const C_ = G.s2i, S = s2i_S();
  C_.els.forEach((el, k) => {
    if (el.k === '(' && S.st[k] === 0 && !C_.pend.some((q) => q.k === k)) {
      const b = s2i_bulletAt(el, 7, dt);
      if (b) { if (!b.pierce) b.dead = true; s2i_trigger(k, 0.05); }
      else if (s2i_thrownAt(el, 9)) s2i_trigger(k, 0.05);
    } else if (el.k === '*' && S.st[k] === 0) {
      const b = s2i_bulletAt(el, 8, dt);
      if (b) { b.dead = true; s2i_fuse(k); } else if (s2i_thrownAt(el, 10)) s2i_fuse(k);
    } else if (el.k === ')') {   // Automat = Deckung: Kugeln prallen ab
      const b = s2i_bulletAt(el, 7, dt, 's2i_can');
      if (b) { b.dead = true; sparks(b.x, b.y, 4, '#ffe66d'); if (Math.random() < 0.3) Sound.play('punch'); }
    }
  });
}

// ---------------------------------------------------------------------
//  O-SAFT-FASS
// ---------------------------------------------------------------------
function s2i_trigger(k, delay) {
  const C_ = G.s2i, S = s2i_S(), el = C_ && C_.els[k];
  if (!el || el.k !== '(' || S.st[k] !== 0 || C_.pend.some((q) => q.k === k)) return;
  C_.pend.push({ k, t: delay });
  if (delay > 0.3) { floatText(el.x, el.y - 14, 'ES ZISCHT! LAUF!', '#ff9a1a'); Sound.play('squeak'); }
}
function s2i_boom(k) {
  const C_ = G.s2i, S = s2i_S(), el = C_.els[k];
  if (S.st[k] !== 0) return;
  S.st[k] = 1;
  G.tiles[el.i] = G.under[el.i] || '.'; G.solid[el.i] = 0;
  explode(el.x, el.y, 54, { words: S2I_BOOM });
}
// jede Explosion (auch Raketen, Saftbomben...): Fässer in Reichweite gehen kurz danach hoch, Sicherungen fliegen raus
function s2i_blast(x, y, r) {
  const C_ = G.s2i, S = s2i_S();
  if (!C_ || !S || !C_.els.length) return;
  C_.els.forEach((el, k) => {
    const d = dist(x, y, el.x, el.y);
    if (el.k === '(' && S.st[k] === 0 && d < r + 6) s2i_trigger(k, 0.12 + Math.random() * 0.1);
    else if (el.k === '*' && S.st[k] === 0 && d < r * 0.8 + 8) s2i_fuse(k);
  });
}

// ---------------------------------------------------------------------
//  SICHERUNGSKASTEN: Raum (Flutfüllung bis Wand/Tür/Glas) wird dunkel
// ---------------------------------------------------------------------
function s2i_region(k) {
  const C_ = G.s2i;
  if (C_.reg[k]) return C_.reg[k];
  const el = C_.els[k], w = G.w, seen = new Uint8Array(G.w * G.h), q = [], out = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= G.w || y >= G.h) return;
    const i = y * w + x;
    if (seen[i]) return;
    seen[i] = 1;
    const c = G.tiles[i];
    if (isWallC(c) || c === 'D' || c === 'G' || c === 'L' || c === 'X') return;
    q.push(i);
  };
  if (!el.emb) push(el.tx, el.ty);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) push(el.tx + dx, el.ty + dy);
  for (let h = 0; h < q.length && out.length < 480; h++) {
    const i = q[h]; out.push(i);
    const x = i % w, y = (i / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  C_.reg[k] = out;
  return out;
}
function s2i_fuse(k) {
  const C_ = G.s2i, S = s2i_S(), el = C_.els[k];
  if (S.st[k] !== 0) return;
  S.st[k] = 120;   // 12 s dunkel
  const reg = s2i_region(k);
  for (const i of reg) C_.dark[i]++;
  C_.darkN++;
  const inReg = new Set(reg);
  let said = 0;
  for (const e of G.enemies) {
    if (e.state === 'dead' || e.static || e.kind === 'B' || e.kind === 'O' || e.state === 'down' || s2i_allyIdx(e) >= 0) continue;
    if (!inReg.has(Math.floor(e.y / TS) * G.w + Math.floor(e.x / TS))) continue;
    e.state = 'confused'; e.confT = rand(1.4, 2.4); e.windup = 0; e.aimT = 0; e.spot = 0;
    if (said++ < 3) say(e, pick(S2I_DARK), 1.6);
  }
  sparks(el.x, el.y, 18, '#ffe14d'); sparks(el.x, el.y, 8, '#9ff');
  floatText(el.x, el.y - 16, 'SICHERUNG RAUS!', '#ffe14d');
  Sound.play('zap'); Sound.play('glitch');
}
const s2i_darkBase = () => { const B = G.modState && G.modState.blackout; return B ? !B.on : !!(G.s2i && G.s2i.base); };
// sieht dieser Gegner gerade nichts? (Licht aus, dunkler Raum, Spieler im Schacht verschwunden)
function s2i_blind(e, q) {
  if (q && q.s2iHide > G.time) return true;
  const S = s2i_S(), C_ = G.s2i;
  if (!S || !C_) return false;
  if (S.lt > 0) return true;
  if (!C_.darkN) return false;
  const ti = (x, y) => Math.floor(y / TS) * G.w + Math.floor(x / TS);
  return !!(C_.dark[ti(e.x, e.y)] || (q && C_.dark[ti(q.x, q.y)]));
}

// ---------------------------------------------------------------------
//  [E]: Automat, Hebel, Schacht (Host; Online-Gäste kommen über ihr 'use' hier an)
// ---------------------------------------------------------------------
function s2i_near(p, kinds, r = 24) {
  const C_ = G.s2i;
  if (!C_) return -1;
  let best = -1, bd = r;
  C_.els.forEach((el, k) => {
    if (!kinds.includes(el.k)) return;
    const d = dist(p.x, p.y, el.x, el.y) - (el.emb ? 3 : 0);
    if (d < bd) { bd = d; best = k; }
  });
  return best;
}
function s2i_use(p) {
  const k = s2i_near(p, ')|{}');
  if (k < 0) return false;
  const el = G.s2i.els[k];
  if (el.k === ')') s2i_buy(k, p); else if (el.k === '|') s2i_lever(k, p); else s2i_vent(k, p);
  return true;
}
USE_HOOKS.push(s2i_use);

function s2i_buy(k, p) {
  const C_ = G.s2i, S = s2i_S(), el = C_.els[k], buys = S.st[k] % 10, price = s2i_price();
  if (buys >= 4) { floatText(el.x, el.y - 16, 'AUSVERKAUFT!', '#ff6a6a', true); Sound.play('click'); return; }
  if (run.cash < price) { floatText(el.x, el.y - 16, 'ZU WENIG KOHLE! (' + price + '€) - ODER TRETEN?', '#ff6a6a', true); Sound.play('click'); return; }
  run.cash -= price; S.st[k]++;
  Sound.play('cash');
  const r = Math.random(), a = Math.atan2(p.y - el.y, p.x - el.x);
  if (r < 0.45) {
    if ((p.armor || 0) < 3) { p.armor = (p.armor || 0) + 1; floatText(p.x, p.y - 20, 'O-SAFT-DOSE: +1 WESTE!', '#66ffff'); Sound.play('armor'); }
    else { p.focus = (p.focus || 0) + 1; floatText(p.x, p.y - 20, 'ENERGY-SAFT: +1 ZEITLUPE!', '#9ab8ff'); }
  } else if (r < 0.87) {
    const pool = S2I_GUNS.filter((id) => WEAPONS[id]), id = pick(pool.length ? pool : ['pistol']);
    spawnPickup(el.x + Math.cos(a) * 10, el.y + Math.sin(a) * 10, id, dropAmmo(id) || (WEAPONS[id].ranged ? WEAPONS[id].ammo : 0), a, 70);
    floatText(el.x, el.y - 16, 'ZUFALLSWAFFE: ' + (WEAPONS[id].name || id.toUpperCase()) + '!', '#ffe14d');
  } else { floatText(el.x, el.y - 16, 'DOSE KLEMMT! GELD WEG. (TRETEN HILFT!)', '#ff9a1a'); Sound.play('punch'); }
}
function s2i_kick(k, p) {
  const C_ = G.s2i, S = s2i_S(), el = C_.els[k], kicks = Math.floor(S.st[k] / 10);
  shake(3);
  if (kicks >= 2) { floatText(el.x, el.y - 16, 'KLONK. NUR NOCH LUFT DRIN.', '#aaaaaa', true); Sound.play('punch'); return; }
  S.st[k] += 10;
  const a0 = Math.random() * TAU;
  for (let n = 0; n < 6; n++) {
    const a = a0 + n * TAU / 6 + rand(-0.25, 0.25);
    spawnBullet(el.x + Math.cos(a) * 9, el.y + Math.sin(a) * 9, a, rand(210, 290), 'player', p, 's2i_can', 'osaft');
  }
  floatText(el.x, el.y - 16, pick(['DOSENREGEN!', 'RÜTTEL RÜTTEL!', 'GRATIS-SAFT FÜR ALLE!']), '#ff9a1a');
  Sound.play('slam'); makeNoise(el.x, el.y, 160);
}
function s2i_gateTile(k, open) {
  const el = G.s2i.els[k], t = open ? (G.under[el.i] || '.') : 'L';
  G.tiles[el.i] = t; G.solid[el.i] = isSolidC(t) ? 1 : 0;
}
function s2i_lever(k, p) {
  const C_ = G.s2i, S = s2i_S(), el = C_.els[k], on = S.st[k] ? 0 : 1;
  const gates = [];
  C_.els.forEach((o, j) => { if (o.k === '/' && o.lv === k) gates.push(j); });
  if (!gates.length) { S.st[k] = on; floatText(el.x, el.y - 16, 'KLICK. NICHTS PASSIERT. HM.', '#aaaaaa', true); Sound.play('click'); return; }
  if (!on) {
    for (const j of gates) {
      const g = C_.els[j];
      if (G.players.some((q) => q.alive && Math.abs(q.x - g.x) < 8 + q.r && Math.abs(q.y - g.y) < 8 + q.r)) { floatText(el.x, el.y - 16, 'GEHT NICHT - DA STEHT WER IM TOR!', '#ff6a6a', true); Sound.play('click'); return; }
    }
  }
  S.st[k] = on;
  for (const j of gates) {
    S.st[j] = on; s2i_gateTile(j, on);
    if (on) continue;
    const g = C_.els[j];
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.kind === 'B' || e.kind === 'O' || e.flying || Math.abs(e.x - g.x) >= 8 + e.r || Math.abs(e.y - g.y) >= 8 + e.r) continue;
      killEnemy(e, 'door', Math.atan2(e.y - g.y, e.x - g.x)); floatText(g.x, g.y - 14, 'ROLLTOR-KNALL!', '#ffd84a');
    }
  }
  floatText(el.x, el.y - 16, on ? 'ROLLTOR GEHT HOCH!' : 'ROLLTOR RUNTER!', on ? '#7dff7a' : '#ffb52a');
  Sound.play('door'); Sound.play('slam'); shake(2);
  makeNoise(el.x, el.y, 170);
}
function s2i_vent(k, p) {
  const C_ = G.s2i, el = C_.els[k];
  if ((C_.cd[p.idx] || 0) > G.time) return;
  if (el.to == null) { floatText(el.x, el.y - 16, 'SACKGASSE! NUR STAUB HIER.', '#aaaaaa', true); Sound.play('click'); return; }
  const to = C_.els[el.to];
  let [nx, ny] = [to.x, to.y];
  if (G.solid[to.i]) [nx, ny] = spotNear(to.x, to.y);
  const ox = p.x, oy = p.y;
  for (let n = 0; n < 10; n++) G.parts.push({ x: ox + rand(-6, 6), y: oy + rand(-6, 6), vx: rand(-30, 30), vy: rand(-30, 30), life: rand(0.3, 0.6), col: pick(['#8a8478', '#6a655c', '#a8a090']), s: 2, kind: 'dust', fric: 4 });
  p.x = nx; p.y = ny; p.vx = 0; p.vy = 0;
  if (p.idx > 0 && NET.mode === 'host' && typeof netTeleported === 'function') netTeleported(p);
  C_.cd[p.idx] = G.time + 0.7;
  p.s2iHide = G.time + 1.6;   // kurz unsichtbar für die Gegner
  for (const e of G.enemies) {
    if (e.state !== 'alert' || e.static || e.kind === 'B' || e.kind === 'O' || (e.target && e.target !== p)) continue;
    e.state = 'search'; e.alerted = true; e.lastSeen = { x: ox, y: oy }; e.pathT = 0; e.spot = 0;
    if (Math.random() < 0.5) say(e, pick(['WO IST ER HIN?!', 'HÄÄ?', 'EBEN WAR ER NOCH DA!']), 1.4);
  }
  for (let n = 0; n < 10; n++) G.parts.push({ x: nx + rand(-6, 6), y: ny + rand(-6, 6), vx: rand(-30, 30), vy: rand(-30, 30), life: rand(0.3, 0.6), col: pick(['#8a8478', '#6a655c', '#a8a090']), s: 2, kind: 'dust', fric: 4 });
  floatText(nx, ny - 16, pick(S2I_VENT), '#bfefff', true);
  Sound.play('door');
}
// Nahkampf trifft Elemente (Host): Fass zischt, Sicherung fliegt, Automat wird getreten
function s2i_swing(p, w) {
  const C_ = G.s2i, S = s2i_S();
  if (!C_ || !S || !C_.els.length) return;
  const reach = (w.reach || 18) + 10, arc = (w.arc || 1.2) + 0.25;
  C_.els.forEach((el, k) => {
    if (el.k !== '(' && el.k !== '*' && el.k !== ')') return;
    const d = dist(p.x, p.y, el.x, el.y);
    if (d > reach || (d > 12 && Math.abs(angDiff(p.a, Math.atan2(el.y - p.y, el.x - p.x))) > arc)) return;
    if (el.k === '(' && S.st[k] === 0) { sparks(el.x, el.y, 5, '#ffb52a'); s2i_trigger(k, 1.1); }
    else if (el.k === '*' && S.st[k] === 0) s2i_fuse(k);
    else if (el.k === ')') s2i_kick(k, p);
  });
}

// ---------------------------------------------------------------------
//  Verbündete Maschinen (Hack: GESCHÜTZE UMDREHEN / DROHNEN KAPERN)
// ---------------------------------------------------------------------
function s2i_allyIdx(e) {
  const S = s2i_S(), al = S && S.al;
  if (!al || !al.length || !e.nid) return -1;
  for (let j = 0; j < al.length; j += 2) if (al[j] === e.nid) return j;
  return -1;
}
function s2i_allies() {
  const out = [], S = s2i_S();
  if (!S || !S.al.length) return out;
  for (const e of G.enemies) if (e.state !== 'dead' && s2i_allyIdx(e) >= 0) out.push(e);
  return out;
}
function s2i_addAlly(e, tenths) {
  const S = s2i_S(), id = netNid(e), j = s2i_allyIdx(e);
  if (j >= 0) S.al[j + 1] = tenths; else S.al.push(id, tenths);
  e.state = 'idle'; e.spot = 0; e.reaction = 0; e.cd = 0.4; e.target = null; e.lastSeen = null; e.path = null;
  sparks(e.x, e.y, 12, '#39ff7a');
}
function s2i_allyTarget(e, range) {
  if (e.s2iTgT > G.time && e.s2iTg && e.s2iTg.state !== 'dead') return e.s2iTg;
  let best = null, bd = range;
  for (const o of G.enemies) {
    if (o === e || o.state === 'dead' || o.kind === 'O' || (o.kind === 'B' && !o.active) || s2i_allyIdx(o) >= 0) continue;
    const d = dist(e.x, e.y, o.x, o.y);
    if (d < bd && los(e.x, e.y, o.x, o.y)) { bd = d; best = o; }
  }
  e.s2iTg = best; e.s2iTgT = G.time + 0.3;
  return best;
}
function s2i_allyShot(e, a, spd, kind, cause) {
  const mx = e.x + Math.cos(a) * 9, my = e.y + Math.sin(a) * 9;
  spawnBullet(mx, my, a, spd, 'player', e, kind, cause);
  G.bullets[G.bullets.length - 1].hits = s2i_allies();
  muzzleFlash(mx, my);
}
function s2i_allyTurret(e, dt) {
  e.target = null; e.state = 'idle';
  const t = s2i_allyTarget(e, 290);
  if (!t) { e.a += (e.sweep || 1) * 0.9 * dt; return; }
  const pa = Math.atan2(t.y - e.y, t.x - e.x);
  e.a = turnTo(e.a, pa, 5 * dt);
  if (e.cd <= 0 && Math.abs(angDiff(e.a, pa)) < 0.15) {
    e.burst = (e.burst || 0) + 1; e.cd = e.burst >= 3 ? 0.55 : 0.1; if (e.burst >= 3) e.burst = 0;
    s2i_allyShot(e, e.a + rand(-0.05, 0.05), 440, 'bullet', 'turret');
    Sound.play('uzi', 0.6); e.recoil = 2;
  }
}
function s2i_allyDrone(e, dt) {
  e.target = null; e.state = 'idle'; e.walkT += dt;
  const t = s2i_allyTarget(e, 240), p = nearestPlayer(e.x, e.y);
  let mx = 0, my = 0;
  if (t) {
    const pa = Math.atan2(t.y - e.y, t.x - e.x), d = dist(e.x, e.y, t.x, t.y);
    e.a = turnTo(e.a, pa, 6 * dt);
    if (d > 110) { mx = Math.cos(pa); my = Math.sin(pa); } else if (d < 60) { mx = -Math.cos(pa); my = -Math.sin(pa); }
    if (e.cd <= 0) { e.cd = 0.75; s2i_allyShot(e, pa + rand(-0.04, 0.04), 400, 'laser', 'drone'); Sound.play('zap'); }
  } else if (p) {
    const ang = G.time * 1.6 + (e.nid || 0), tx = p.x + Math.cos(ang) * 30, ty = p.y + Math.sin(ang) * 30, d = dist(e.x, e.y, tx, ty);
    if (d > 4) { mx = (tx - e.x) / d; my = (ty - e.y) / d; }
    e.a = turnTo(e.a, Math.atan2(p.y - e.y, p.x - e.x), 4 * dt);
  }
  moveEntity(e, mx * 120 * dt, my * 120 * dt);
}
function s2i_allyTick(dt) {
  const S = s2i_S(), al = S.al, keep = [];
  for (let j = 0; j < al.length; j += 2) {
    const e = G.enemies.find((o) => o.nid === al[j]);
    if (!e || e.state === 'dead') continue;
    let t = al[j + 1];
    if (t > 0) {
      t = Math.max(0, t - dt * 10);
      if (t <= 0) { e.state = 'idle'; e.spot = 0; say(e, 'UPDATE FERTIG. ICH HASSE DICH WIEDER!', 2); sparks(e.x, e.y, 8, '#ff2a3a'); continue; }
    }
    keep.push(al[j], t);
  }
  S.al = keep;
  // eigene Kugeln fliegen durch Verbündete durch
  const A = s2i_allies();
  if (A.length) for (const b of G.bullets) {
    if (b.dead || b.owner !== 'player') continue;
    for (const e of A) if (Math.abs(b.x - e.x) < 26 && Math.abs(b.y - e.y) < 26 && !(b.hits && b.hits.includes(e))) (b.hits || (b.hits = [])).push(e);
  }
  // alle echten Gegner weg -> Verbündete verabschieden sich (sonst wird die Etage nie frei)
  if (A.length && !G.cleared && !G.enemies.some((e) => e.state !== 'dead' && e.kind !== 'O' && s2i_allyIdx(e) < 0)) {
    S.al = [];
    for (const e of A) { say(e, pick(['AUFTRAG ERLEDIGT. TSCHÜSS!', 'SELBSTZERSTÖRUNG IN 0...', 'ES WAR MIR EINE EHRE.']), 1.5); killEnemy(e, 'shot', 0); }
  }
}
// Gegner-KI umleiten (Host)
const s2i_origTurret = updateTurret;
// eslint-disable-next-line no-global-assign
updateTurret = function (e, dt) { if (G && G.s2i && s2i_allyIdx(e) >= 0) { s2i_allyTurret(e, dt); return; } return s2i_origTurret(e, dt); };
const s2i_origDrone = updateDrone;
// eslint-disable-next-line no-global-assign
updateDrone = function (e, dt) { if (G && G.s2i && s2i_allyIdx(e) >= 0) { s2i_allyDrone(e, dt); return; } return s2i_origDrone(e, dt); };
const s2i_origCanSee = canSee;
// eslint-disable-next-line no-global-assign
canSee = function (e, range, half, p) {
  if (G && G.s2i) {
    const q = p || targetOf(e);
    if (q && s2i_blind(e, q) && dist(e.x, e.y, q.x, q.y) > 28) return false;
  }
  return s2i_origCanSee(e, range, half, p);
};
const s2i_origExplode = explode;
// eslint-disable-next-line no-global-assign
explode = function (x, y, r, o) {
  const res = s2i_origExplode(x, y, r, o);
  if (NET.mode !== 'client' && G && G.s2i) s2i_blast(x, y, r);
  return res;
};
const s2i_origSwing = playerSwing;
// eslint-disable-next-line no-global-assign
playerSwing = function (p, w) {
  const res = s2i_origSwing(p, w);
  if (NET.mode !== 'client' && G && G.s2i) s2i_swing(p, w);
  return res;
};

// ---------------------------------------------------------------------
//  Hack-Aktionen (Registry aus wireshark.js)
// ---------------------------------------------------------------------
const s2i_liveKind = (k) => G.enemies.some((e) => e.kind === k && e.state !== 'dead' && s2i_allyIdx(e) < 0);
HACK_ACTIONS.turrets = { name: 'GESCHÜTZE UMDREHEN', desc: 'ALLE GESCHÜTZE SCHIESSEN 15 S LANG AUF DIE GEGNER.', col: '#ff9a1a', order: 10,
  avail: () => s2i_liveKind('Y'),
  run: (p) => {
    for (const e of G.enemies) if (e.kind === 'Y' && e.state !== 'dead' && s2i_allyIdx(e) < 0) { s2i_addAlly(e, 150); say(e, pick(['NEUES ZIEL: DEINE KOLLEGEN.', 'FIREWALL? NIE GEHÖRT.', 'ICH BIN JETZT IM TEAM LIL.']), 2); }
  } };
HACK_ACTIONS.lights = { name: 'LICHT AUS', desc: 'STROM WEG: GEGNER SIND 8 S BLIND (DU HAST EINE TASCHENLAMPE).', col: '#9ab8ff', order: 20,
  avail: () => { const S = s2i_S(); return !!S && !(S.lt > 0); },
  run: () => {
    const S = s2i_S(), C_ = G.s2i;
    if (!S || !C_) return;
    S.lt = 80; G.dark = true; C_.forced = true;
    let said = 0;
    for (const e of G.enemies) {
      if (e.state === 'dead' || e.static || e.kind === 'B' || e.kind === 'O' || e.state === 'down' || s2i_allyIdx(e) >= 0) continue;
      e.state = 'confused'; e.confT = rand(1.2, 2.2); e.windup = 0; e.aimT = 0; e.spot = 0;
      if (said++ < 4) say(e, pick(S2I_DARK), 1.8);
    }
    Sound.play('glitch');
  } };
HACK_ACTIONS.drones = { name: 'DROHNEN KAPERN', desc: 'ALLE DROHNEN FLIEGEN AB JETZT FÜR DICH.', col: '#39ff7a', order: 30,
  avail: () => s2i_liveKind('Q'),
  run: () => { for (const e of G.enemies) if (e.kind === 'Q' && e.state !== 'dead' && s2i_allyIdx(e) < 0) { s2i_addAlly(e, -1); say(e, 'BIEP! NEUER BESITZER.', 1.6); } } };

// ---------------------------------------------------------------------
//  Gast: Kacheln aus dem Host-Zustand übernehmen, Dunkelheit, Animation
// ---------------------------------------------------------------------
function s2i_client(dt) {
  const C_ = G.s2i, S = s2i_S();
  if (!C_ || !S || !Array.isArray(S.st) || S.st.length !== C_.els.length) return;
  C_.els.forEach((el, k) => {
    let want = null;
    if (el.k === '(') want = S.st[k] ? (G.under[el.i] || '.') : 'w';
    else if (el.k === '/') want = S.st[k] ? (G.under[el.i] || '.') : 'L';
    if (want && G.tiles[el.i] !== want) { G.tiles[el.i] = want; G.solid[el.i] = isSolidC(want) ? 1 : 0; }
  });
  s2i_anim(dt);
  if (S.lt > 0) { G.dark = true; C_.forced = true; } else if (C_.forced) { G.dark = s2i_darkBase(); C_.forced = false; }
}

// ---------------------------------------------------------------------
//  Zeichnen (Host + Gast, Weltkoordinaten)
// ---------------------------------------------------------------------
function s2i_drawBarrel(g, x, y, warn) {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 5, y + 5, 13, 3);
  g.fillStyle = '#b85a00'; g.fillRect(x - 6, y - 6, 12, 13);
  g.fillStyle = '#ff9a1a'; g.fillRect(x - 5, y - 6, 10, 13);
  g.fillStyle = '#ffd23f'; g.fillRect(x - 4, y - 6, 2, 13);
  g.fillStyle = '#7a3a00'; g.fillRect(x - 6, y - 3, 12, 1); g.fillRect(x - 6, y + 4, 12, 1);
  g.fillStyle = '#ffb52a'; g.fillRect(x - 5, y - 8, 10, 3);
  g.fillStyle = '#7a3a00'; g.fillRect(x + 1, y - 8, 2, 1);
  g.fillStyle = '#ffffff'; g.fillRect(x - 2, y - 1, 5, 4);
  g.fillStyle = '#ff7a00'; g.fillRect(x - 1, y, 3, 2);
  if (warn && Math.sin(T * 40) > 0) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - 6, y - 8, 12, 15); }
}
function s2i_drawFuse(g, x, y, st) {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 4, y - 4, 11, 12);
  g.fillStyle = '#4a4a56'; g.fillRect(x - 5, y - 6, 10, 12);
  if (st === 0) {
    g.fillStyle = '#8a8a98'; g.fillRect(x - 4, y - 5, 8, 10);
    g.fillStyle = '#ffe14d'; g.fillRect(x, y - 4, 2, 2); g.fillRect(x - 1, y - 2, 2, 2); g.fillRect(x, y, 2, 1); g.fillRect(x - 1, y + 1, 2, 2);
    g.fillStyle = Math.sin(T * 3 + x) > 0 ? '#39ff7a' : '#1a5a2a'; g.fillRect(x + 3, y - 5, 1, 1);
  } else {
    g.fillStyle = '#111116'; g.fillRect(x - 4, y - 5, 8, 10);
    g.fillStyle = '#6a6a78'; g.fillRect(x - 7, y - 5, 2, 10);   // Klappe hängt offen
    if (hash(x, Math.floor(T * 9)) > 0.72) { g.fillStyle = '#ffe14d'; g.fillRect(x - 2 + Math.floor(hash(y, Math.floor(T * 9)) * 5), y - 3 + Math.floor(hash(x + 1, Math.floor(T * 9)) * 6), 1, 1); }
    g.fillStyle = '#ff2a3a'; if (Math.sin(T * 8) > 0) g.fillRect(x + 3, y - 5, 1, 1);
  }
}
function s2i_drawVend(g, x, y, st) {
  const empty = st % 10 >= 4 && st >= 20;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 6, y - 6, 15, 16);
  g.fillStyle = '#8a1018'; g.fillRect(x - 7, y - 8, 14, 16);
  g.fillStyle = '#c41f2a'; g.fillRect(x - 6, y - 8, 12, 15);
  g.fillStyle = '#ff5a5a'; g.fillRect(x - 6, y - 8, 12, 2);
  const lit = !empty && Math.sin(T * 13 + x * 0.3) > -0.9;
  g.fillStyle = lit ? '#9fe0ff' : '#2a3a44'; g.fillRect(x - 5, y - 5, 7, 8);
  const left = 6 - Math.min(6, Math.floor(st / 10) * 3);
  for (let n = 0; n < left; n++) { g.fillStyle = JUICE[n % JUICE.length]; g.fillRect(x - 4 + (n % 3) * 2, y - 4 + Math.floor(n / 3) * 4, 1, 3); }
  g.fillStyle = '#222'; g.fillRect(x + 3, y - 4, 2, 4);
  g.fillStyle = '#ffe14d'; g.fillRect(x + 3, y + 1, 2, 1);
  g.fillStyle = '#111'; g.fillRect(x - 5, y + 4, 10, 2);
}
function s2i_drawLever(g, x, y, a, emb) {
  if (!emb) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 3, y - 2, 8, 8); }
  g.fillStyle = '#3a3a44'; g.fillRect(x - 4, y - 4, 8, 8);
  g.fillStyle = '#6a6a78'; g.fillRect(x - 3, y - 3, 6, 6);
  const ang = -Math.PI / 2 + (a - 0.5) * 1.6, ex = x + Math.cos(ang) * 6, ey = y + Math.sin(ang) * 6;
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke(); g.lineWidth = 1;
  g.fillStyle = a > 0.5 ? '#39ff7a' : '#ff3b3b'; g.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 3);
}
function s2i_drawGate(g, el, open) {
  const X = el.tx * TS, Y = el.ty * TS, h = Math.round(16 * (1 - open));
  if (h > 0) {
    g.fillStyle = '#7a808c'; g.fillRect(X, Y, 16, h);
    g.fillStyle = '#5a606a'; for (let yy = 1; yy < h; yy += 3) g.fillRect(X, Y + yy, 16, 1);
    if (h > 3) for (let xx = 0; xx < 16; xx += 4) { g.fillStyle = (xx / 4) % 2 ? '#111' : '#ffd23f'; g.fillRect(X + xx, Y + h - 2, 4, 2); }
  }
  g.fillStyle = '#3a3e48'; g.fillRect(X, Y, 16, 3);
}
function s2i_drawVent(g, el) {
  const x = el.x, y = el.y;
  g.fillStyle = '#1a1c22'; g.fillRect(x - 7, y - 6, 14, 12);
  g.fillStyle = '#5a606c'; for (let yy = -4; yy < 5; yy += 3) g.fillRect(x - 6, y + yy, 12, 1);
  g.fillStyle = el.to == null ? '#666666' : S2I_PAIR[(el.pair || 0) % S2I_PAIR.length];
  g.fillRect(x - 7, y - 6, 1, 1); g.fillRect(x + 6, y - 6, 1, 1); g.fillRect(x - 7, y + 5, 1, 1); g.fillRect(x + 6, y + 5, 1, 1);
  g.fillRect(x - 1, y - 8, 2, 1);
}
function s2i_prompt(g, x, y, label, col) {
  const bob = Math.round(Math.sin(T * 5) * 2);
  txt(label, x, y - 18 + bob, { g, font: FS, align: 'center', color: col || '#3fd0ff' });
}
function s2i_draw(g) {
  const C_ = G.s2i, S = s2i_S();
  if (!C_ || !S || !Array.isArray(S.st)) return;
  const st = (k) => S.st[k] || 0;
  // dunkle Räume (Sicherung raus) - Spieler haben ein kleines Licht um sich
  if (C_.els.length) C_.els.forEach((el, k) => {
    if (el.k !== '*' || !(st(k) > 0)) return;
    const reg = s2i_region(k), fade = Math.min(1, st(k) / 10), flick = st(k) < 15 && Math.sin(T * 30) > 0.3 ? 0.4 : 1;
    for (const i of reg) {
      const cx = (i % G.w) * TS + 8, cy = ((i / G.w) | 0) * TS + 8;
      let a = 0.78;
      for (const p of G.players) if (p.alive) { const d = dist(cx, cy, p.x, p.y); if (d < 70) a = Math.min(a, 0.2 + d / 70 * 0.58); }
      g.fillStyle = 'rgba(0,0,12,' + (a * fade * flick).toFixed(2) + ')';
      g.fillRect(cx - 8, cy - 8, 16, 16);
    }
  });
  C_.els.forEach((el, k) => {
    if (el.k === '(') { if (!st(k)) s2i_drawBarrel(g, el.x, el.y, C_.pend.some((q) => q.k === k)); }
    else if (el.k === '*') s2i_drawFuse(g, el.x, el.y, st(k) === 0 ? 0 : 1);
    else if (el.k === ')') s2i_drawVend(g, el.x, el.y, st(k));
    else if (el.k === '|') s2i_drawLever(g, el.x, el.y, C_.an[k], el.emb);
    else if (el.k === '/') s2i_drawGate(g, el, C_.an[k]);
    else s2i_drawVent(g, el);
  });
  // gehackte Maschinen
  if (S.al && S.al.length) for (const e of G.enemies) {
    const j = s2i_allyIdx(e);
    if (j < 0 || e.state === 'dead') continue;
    g.strokeStyle = Math.sin(T * 8) > 0 ? '#39ff7a' : '#1a8a3a'; g.lineWidth = 1;
    g.beginPath(); g.arc(Math.round(e.x), Math.round(e.y), (e.r || 6) + 4, 0, TAU); g.stroke();
    const t = S.al[j + 1];
    txt(t > 0 ? 'GEHACKT ' + Math.ceil(t / 10) : 'GEHACKT', e.x, e.y - 18, { g, font: FS, align: 'center', color: '#39ff7a' });
  }
  // [E]-Hinweise für die Spieler an diesem Bildschirm
  const locals = NET.mode === 'client' ? [G.player] : G.players.filter((p) => p.idx === 0 || COOP.on);
  for (const p of locals) {
    if (!p || !p.alive) continue;
    const k = s2i_near(p, ')|{}');
    if (k >= 0) {
      const el = C_.els[k];
      const lab = el.k === ')' ? (st(k) % 10 >= 4 ? 'AUSVERKAUFT (SCHLAGEN = TRETEN)' : '[E] SAFT ZIEHEN ' + s2i_price() + '€  /  SCHLAGEN = TRETEN')
        : el.k === '|' ? '[E] HEBEL' : '[E] REINKRIECHEN';
      s2i_prompt(g, el.x, el.y, lab, el.k === ')' ? '#ffb52a' : '#3fd0ff');
    }
  }
  // Wireshark-PC: nach "TÜREN ENTRIEGELN" zeigt render.js kein [E] mehr - andere Hacks gehen aber noch
  if (G.hacked && G.terminals.length && typeof wsHackLeft === 'function' && wsHackLeft() > 0) {
    for (const i of G.terminals) s2i_prompt(g, (i % G.w) * TS + 8, ((i / G.w) | 0) * TS + 6, '[E] HACKEN', '#39ff7a');
  }
}
function s2i_hud() {
  const S = s2i_S();
  if (!S) return;
  const lines = [];
  if (S.lt > 0) lines.push(['LICHT AUS! GEGNER BLIND: ' + Math.ceil(S.lt / 10) + ' S', '#9ab8ff']);
  if (S.al && S.al.length) lines.push(['GEHACKTE MASCHINEN: ' + S.al.length / 2, '#39ff7a']);
  lines.forEach((l, n) => txt(l[0], W / 2, 64 + n * 10, { font: FS, align: 'center', color: l[1] }));
}

// ---------------------------------------------------------------------
//  An floorModsCall hängen (läuft in jeder Etage, auch ohne Mods)
// ---------------------------------------------------------------------
const S2I_FX = { setup: s2i_setup, update: s2i_update, clientUpdate: s2i_client, draw: s2i_draw, hud: s2i_hud };
const s2i_origFMC = floorModsCall;
// eslint-disable-next-line no-global-assign
floorModsCall = function (fnName, ...args) {
  const out = s2i_origFMC(fnName, ...args);
  const fx = S2I_FX[fnName];
  if (fx && G && G.modState) extCall(fx, ...args);
  return out;
};

// ---------------------------------------------------------------------
//  Dosen aus dem Automaten: hauen um statt zu töten
// ---------------------------------------------------------------------
BULLET_KINDS.s2i_can = { dmg: 1, life: 0.7, noCasing: true,
  impact: (b, x, y) => sparks(x, y, 4, '#ff9a1a'),
  hit: (b, e, ang) => {
    if (e.kind === 'B' || e.static || e.kind === 'O' || e.flying) return false;
    knockDown(e, ang, 2.4); floatText(e.x, e.y - 14, 'DOSE!', '#ff9a1a', true);
    return true;
  } };
BULLET_DRAW.s2i_can = (g, b) => {
  const x = Math.round(b.x), y = Math.round(b.y), r = Math.floor((b.x + b.y) / 6) % 2;
  g.fillStyle = '#c41f2a'; if (r) g.fillRect(x - 2, y - 1, 5, 3); else g.fillRect(x - 1, y - 2, 3, 5);
  g.fillStyle = '#d0d0dc'; if (r) g.fillRect(x - 2, y - 1, 1, 3); else g.fillRect(x - 1, y - 2, 3, 1);
  return true;
};

// ---------------------------------------------------------------------
//  Generator: F.gen.feat = { fass: 3, sicherung: 1, automat: 1, schacht: 1 }
// ---------------------------------------------------------------------
function s2i_genPlace(ctx, n, ch, wall, pair) {
  let placed = 0;
  for (let tries = 0; placed < n && tries < 160; tries++) {
    const r = ctx.pk(ctx.rooms);
    if (r.x1 - r.x0 < 3 || r.y1 - r.y0 < 3) continue;
    const x = ctx.ri(r.x0 + 1, r.x1 - 1);
    if (wall) {   // an die obere Wand des Raums
      const y = r.y0;
      if (!isWallC(ctx.get(x, y - 1)) || ctx.nearDoor(x, y) || !ctx.isFloor(x, y) || !ctx.isFloor(x - 1, y) || !ctx.isFloor(x + 1, y) || !ctx.isFloor(x, y + 1)) continue;
      ctx.set(x, y, ch); placed++;
    } else {
      const y = ctx.ri(r.y0 + 1, r.y1 - 1), two = pair && ctx.rng() < 0.5;
      if (!ctx.rectFree(x - 1, y - 1, x + (two ? 2 : 1), y + 1)) continue;
      ctx.set(x, y, ch); if (two) ctx.set(x + 1, y, ch);
      placed++;
    }
  }
}
GEN_FEATS.fass = (ctx, n) => s2i_genPlace(ctx, n === true ? 2 : n | 0, '(', false, true);
GEN_FEATS.sicherung = (ctx, n) => s2i_genPlace(ctx, n === true ? 1 : n | 0, '*', true);
GEN_FEATS.automat = (ctx, n) => s2i_genPlace(ctx, n === true ? 1 : n | 0, ')', true);
GEN_FEATS.schacht = (ctx, n) => {
  const pairs = n === true ? 1 : n | 0, rooms = ctx.byArea.filter((r) => r.x1 - r.x0 >= 3 && r.y1 - r.y0 >= 3);
  let made = 0;
  for (let tries = 0; made < pairs && tries < 60; tries++) {
    const a = ctx.pk(rooms), b = ctx.pk(rooms);
    if (a === b || Math.abs((a.x0 + a.x1) - (b.x0 + b.x1)) + Math.abs((a.y0 + a.y1) - (b.y0 + b.y1)) < 24) continue;
    const spot = (r) => { for (let k = 0; k < 20; k++) { const x = ctx.ri(r.x0 + 1, r.x1 - 1), y = ctx.ri(r.y0 + 1, r.y1 - 1); if (ctx.rectFree(x - 1, y - 1, x + 1, y + 1)) return [x, y]; } return null; };
    const p1 = spot(a), p2 = spot(b);
    if (!p1 || !p2) continue;
    ctx.set(p1[0], p1[1], '{'); ctx.set(p2[0], p2[1], '}'); made++;
  }
};

// ---------------------------------------------------------------------
//  Online: Gast startet Turm / Boss-Rush (modes.js) über den Host
// ---------------------------------------------------------------------
NET_GO.md = (a) => { if (typeof md_start !== 'function') return 'DER HOST HAT KEINE SPIELMODI.'; md_start(a ? 1 : 0); return true; };
NET_GO_TXT.md = 'EINEN SPIELMODUS';
function s2i_wrapModes() {
  if (typeof md_openMenu !== 'function' || md_openMenu.s2i) return;
  const om = md_openMenu, os = md_start;
  // Gast darf das Menü sehen (Rekorde), Start geht als Anfrage an den Host
  // eslint-disable-next-line no-global-assign
  md_openMenu = function (sel) {
    if (NET.mode !== 'client' || !NET.connected) return om(sel);
    const m = NET.mode; NET.mode = 'off';
    try { return om(sel); } finally { NET.mode = m; }
  };
  md_openMenu.s2i = true;
  // eslint-disable-next-line no-global-assign
  md_start = function (which) {
    if (NET.mode !== 'client' || !NET.connected) return os(which);
    enterHub(); netAskStart('md', which ? 1 : 0);
  };
}
CITY_HOOKS.init.push(s2i_wrapModes);
if (typeof setTimeout === 'function') setTimeout(() => { try { s2i_wrapModes(); } catch (e) { /* egal */ } }, 0);
