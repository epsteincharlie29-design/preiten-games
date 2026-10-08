'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - SPIELMODI: ENDLOS-TURM + BOSS-RUSH (Staffel 2)
//  ENDLOS-TURM: unendlich viele Zufalls-Etagen (Seed = Etagennummer), steigende Schwierigkeit,
//    zufällige Themes + Etagen-Mods, alle 10 Etagen ein Turmwächter (Boss). Leben werden mitgenommen.
//    Nach jeder geräumten Etage: [C] auszahlen oder weiter. Tot = halbes Geld. Rekorde: save.s2.tower.
//  BOSS-RUSH: alle Bosse aus BOSS_INFO, die eine Arena haben, am Stück, mit Stoppuhr. Bestzeit: save.s2.rush.
//  Eingang: Stadt-Bauplatz K1 (zwei Gebäude: ENDLOS-TURM + BOSS-RUSH-HALLE), Menü-Bildschirm 'md_menu'.
//  Online: Host startet (wie die Arena), Gäste laden dieselben Etagen deterministisch nach (loadFloor).
// =====================================================================

// ---------------------------------------------------------------------
//  Spielstand (lazy, verträgt alte Stände und save.s2.tower = Zahl)
// ---------------------------------------------------------------------
function md_sv() {
  if (!save.s2 || typeof save.s2 !== 'object') save.s2 = {};
  const s = save.s2;
  if (!s.tower || typeof s.tower !== 'object') s.tower = { floor: typeof s.tower === 'number' ? s.tower : 0, score: 0, runs: 0, cash: 0 };
  if (!s.rush || typeof s.rush !== 'object') s.rush = { best: 0, most: 0, runs: 0, wins: 0 };
  return s;
}
SAVE_MIGRATIONS.push((s) => {
  if (!s.s2 || typeof s.s2 !== 'object') s.s2 = {};
  if (!s.s2.tower || typeof s.s2.tower !== 'object') s.s2.tower = { floor: typeof s.s2.tower === 'number' ? s.s2.tower : 0, score: 0, runs: 0, cash: 0 };
  if (!s.s2.rush || typeof s.s2.rush !== 'object') s.s2.rush = { best: 0, most: 0, runs: 0, wins: 0 };
});
const md_fmtTime = (t) => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };

// ---------------------------------------------------------------------
//  Daten / Texte
// ---------------------------------------------------------------------
const MD_FLOOR_NAMES = ['SAFTLAGER', 'BÜRO DER VERZWEIFLUNG', 'KANTINE (GESCHLOSSEN)', 'TOILETTEN-TRAKT', 'CHEFETAGE (FALSCH)', 'KELLER IM 12. STOCK',
  'DRUCKER-HÖLLE', 'MEETINGRAUM 404', 'PAUSENRAUM DER SCHMERZEN', 'ARCHIV FÜR NICHTS', 'TEAMBUILDING-ZONE', 'SERVERRAUM (NASS)', 'FITNESS-ETAGE',
  'BÄLLEBAD FÜR ERWACHSENE', 'GROSSRAUMBÜRO', 'HAUSMEISTER-REICH', 'LOBBY 2: DIE RACHE', 'ZITRONEN-ABTEILUNG', 'KAFFEEKÜCHE OHNE KAFFEE', 'FLUR DES GRAUENS',
  'PRAKTIKANTEN-KÄFIG', 'WARTEZIMMER', 'MÖBELHAUS-FILIALE', 'GEHEIMLABOR (OFFEN)'];
const MD_MOD_OK = ['slippery', 'alarm', 'cameras', 'fire', 'flood', 'bomb', 'blackout', 'zerog', 'rewind', 'strobe', 'hostage'];   // Mods ohne Spezialkarte
const MD_MOD_BAD = [['zerog', 'slippery'], ['zerog', 'flood'], ['blackout', 'strobe'], ['bomb', 'flood']];
const MD_MOD_NAMES = { slippery: 'RUTSCHIG', alarm: 'ALARMANLAGE', cameras: 'KAMERAS', fire: 'FEUER', flood: 'FLUT', bomb: 'BOMBE', blackout: 'STROMAUSFALL',
  zerog: 'SCHWERELOS', rewind: 'ZEITSCHLEIFE', strobe: 'STROBO', hostage: 'GEISELN' };
const MD_TOWER_LINES = ['DER AUFZUG IST KAPUTT. NATÜRLICH.', 'NOCH EINE ETAGE. NUR NOCH EINE. VERSPROCHEN.', 'WER HAT DIESEN TURM GEBAUT?!', 'DIE TREPPE HÖRT NIE AUF!',
  'GUNZER WARTET UNTEN MIT O-SAFT.', 'ICH HÖRE SCHON DIE HÖHENLUFT.'];

// ---------------------------------------------------------------------
//  BOSS-RUSH: Liste aller Bosse mit Arena (erst beim ersten Zugriff - dann sind alle Dateien geladen)
// ---------------------------------------------------------------------
let md_rushCache = null;
function md_rushList() {
  if (md_rushCache) return md_rushCache;
  const seen = {}, out = [];
  LEVELS.forEach((L, li) => (L.floors || []).forEach((F, fi) => {
    if (!F || !F.boss || !F.map || seen[F.boss] || !BOSS_INFO[F.boss]) return;
    seen[F.boss] = true;
    const mods = [...(L.mods || []), ...(F.mods || [])].filter((m) => m !== 'escort' && m !== 'elevator');
    const C = Object.assign({}, F, { theme: F.theme || L.theme, mods, checkpoint: false });
    out.push({ id: F.boss, li, fi, F: C, song: L.song, diff: L.diff || 5 });
  }));
  md_rushCache = out;
  return out;
}
const md_rushFloorsArr = [];
function md_rushFloors() {
  if (!md_rushFloorsArr.length) {
    const L = md_rushList();
    L.forEach((r, i) => md_rushFloorsArr.push(Object.assign({}, r.F, { name: 'BOSS ' + (i + 1) + '/' + L.length + ': ' + BOSS_INFO[r.id].name })));
  }
  return md_rushFloorsArr;
}
let md_rCur = 0;   // zuletzt geladene Rush-Etage (für theme/song/diff-Getter)
EXTRA_LEVELS.md_rush = {
  name: 'BOSS-RUSH', label: 'BOSS-RUSH', chapter: 'BOSS-RUSH', date: 'JETZT - GANZ SCHNELL',
  floors: new Proxy([], {   // Index-Zugriff merkt sich die Etage (Gast lädt per loadFloor('md_rush', fi))
    get(t, key) {
      const arr = md_rushFloors();
      if (typeof key === 'string' && /^\d+$/.test(key)) { md_rCur = +key; return arr[+key]; }
      if (key === 'length') return arr.length;
      return Reflect.get(arr, key);
    },
  }),
  get theme() { const r = md_rushList()[md_rCur]; return r ? r.F.theme : 'arena'; },
  get song() { const r = md_rushList()[md_rCur]; return r ? r.song : 'arena'; },
  get diff() { const r = md_rushList()[md_rCur]; return Math.max(0.5, (r ? r.diff : 5) - md_rCur * 0.35); },
};

// ---------------------------------------------------------------------
//  ENDLOS-TURM: Etage k wird nur aus k abgeleitet (Host = Gast)
// ---------------------------------------------------------------------
const md_T = { cache: {}, cur: 0, init: false, themes: [], mods: [], exts: [] };
function md_tInit() {
  if (md_T.init) return;
  md_T.init = true;
  const seen = {};
  for (const L of LEVELS) {
    if (!L || seen[L.theme] || !THEMES[L.theme] || !THEME_FLOORS[L.theme] || !(L.floors || []).some((f) => f && f.gen)) continue;
    seen[L.theme] = true; md_T.themes.push({ theme: L.theme, song: L.song || 'cyber' });
  }
  if (!md_T.themes.length) md_T.themes.push({ theme: 'cyber', song: 'cyber' });
  md_T.mods = MD_MOD_OK.filter((id) => FLOOR_MODS[id]);
  md_T.exts = Object.keys(ENEMY_EXT).filter((c) => c.length === 1 && !/[A-Za-z0-9]/.test(c)).sort();
}
function md_tFloor(k) {
  k = Math.max(0, k | 0);
  md_T.cur = k;
  if (md_T.cache[k]) return md_T.cache[k];
  md_tInit();
  const R = mulberry32(91000 + k * 7919), pk = (a) => a[Math.floor(R() * a.length)], r2 = (v) => Math.round(v * 100) / 100;
  const th = pk(md_T.themes), rush = md_rushList();
  let F;
  if ((k + 1) % 10 === 0 && rush.length) {
    // Turmwächter: eine Boss-Arena aus der Kampagne
    const src = rush[((k + 1) / 10 - 1) % rush.length];
    F = Object.assign({}, src.F, { name: 'ETAGE ' + (k + 1) + ': TURMWÄCHTER ' + BOSS_INFO[src.id].name, mods: src.F.mods.slice(), md_song: src.song });
  } else {
    const mix = { E: 4, M: 3 };
    if (k >= 1) mix.U = 1 + (k >= 5 ? 1 : 0) + (k >= 10 ? 1 : 0);
    if (k >= 2) mix.S = 1 + (k >= 8 ? 1 : 0);
    if (k >= 3) mix.R = 2;
    if (k >= 4) mix.K = 1;
    if (k >= 6) mix.N = 1;
    if (k >= 9) mix.Q = 1;
    if (k >= 12) mix.J = 1;
    for (const c of md_T.exts) if (k >= 5 && R() < 0.45) mix[c] = 1 + (k >= 15 ? 1 : 0);
    const feat = { maxRoom: 11 + Math.floor(R() * 5) };
    if (R() < 0.7) feat.tables = r2(0.1 + R() * 0.3);
    if (R() < 0.6) feat.glass = r2(0.1 + R() * 0.3);
    if (R() < 0.6) feat.crates = r2(0.15 + R() * 0.25);
    if (R() < 0.2) feat.shelves = 0.3;
    if (k >= 3 && R() < 0.3) feat.lasers = 2;
    if (k >= 4 && R() < 0.15) feat.belts = 2;
    if (k >= 5 && R() < 0.2) feat.dark = 1;
    if (R() < (th.theme === 'disco' || th.theme === 'tv' ? 0.8 : 0.15)) feat.dance = 1;
    // Etagen-Mods (nur solche, die es gibt)
    const mods = [], want = k < 2 ? 0 : k < 6 ? (R() < 0.4 ? 1 : 0) : k < 12 ? (R() < 0.7 ? 1 : 0) : (R() < 0.5 ? 2 : 1);
    for (let t = 0; t < 12 && mods.length < want && md_T.mods.length; t++) {
      const m = pk(md_T.mods);
      if (mods.includes(m) || MD_MOD_BAD.some(([a, b]) => (a === m && mods.includes(b)) || (b === m && mods.includes(a)))) continue;
      mods.push(m);
    }
    F = { name: 'ETAGE ' + (k + 1) + ': ' + pk(MD_FLOOR_NAMES), theme: th.theme, md_song: th.song, mods,
      gen: { seed: 77000 + k * 131, w: 34 + Math.min(14, k), h: 22 + Math.min(8, k >> 1), enemies: Math.min(34, 10 + Math.round(k * 1.5)), mix,
        items: 5 + (k % 2), cash: 8 + Math.min(12, k), safes: k % 4 === 3 ? 1 : 0, osaft: 1, feat } };
  }
  F.md_diff = Math.min(8, 1 + k * 0.25);
  md_T.cache[k] = F;
  return F;
}
const md_towerFloors = new Proxy([], {
  get(t, key) {
    if (key === 'length') return 999;
    if (typeof key === 'string' && /^\d+$/.test(key)) return md_tFloor(+key);
    return Reflect.get(t, key);
  },
});
EXTRA_LEVELS.md_tower = {
  name: 'ENDLOS-TURM', label: 'TURM', chapter: 'ENDLOS-TURM', date: 'IMMER - BIS ZUM UMFALLEN',
  floors: md_towerFloors,
  get theme() { return md_tFloor(md_T.cur).theme || 'cyber'; },
  get song() { return md_tFloor(md_T.cur).md_song || 'cyber'; },
  get diff() { return md_tFloor(md_T.cur).md_diff || 1; },
};

// ---------------------------------------------------------------------
//  Gemeinsam: Leben mitnehmen, Waffen mitnehmen, Lauf beenden
// ---------------------------------------------------------------------
function md_saveCarry() {
  run.carry = G.players.filter((p) => p.alive && p.weapon).map((p) => ({ idx: p.idx, w: Object.assign({}, p.weapon) }));
}
// Leben für die nächste Etage merken (+bonus, min 1, max 9)
function md_storeLives(bonus) {
  const L = {};
  for (const p of G.players) L[p.idx] = clamp((run.livesBy[p.idx] || 0) + bonus, 1, 9);
  run.modeData.lives = L;
}
function md_applyLives() {
  const L = run.modeData && run.modeData.lives;
  if (!L) return;
  for (const p of G.players) {
    const n = L[p.idx] != null ? L[p.idx] : floorLives(p);
    run.livesBy[p.idx] = n; p.lives = n; p.maxLives = Math.max(n, floorLives(p));
  }
}
let md_res = null;     // Ergebnis-Bildschirm
let md_deadAt = -1;    // seit wann alle tot und ohne Leben (HUD-Erkennung)
function md_endRun(why) {
  if (!G || G.md_over) return;
  G.md_over = true; G.exiting = true;
  const S = md_sv(), D = run.modeData || {}, tower = run.mode === 'md_tower';
  let pay = 0, title = '', lines = [], col = '#ff3fa4';
  if (tower) {
    const fl = D.floor || 0, rec = fl > S.tower.floor, hi = run.score > S.tower.score;
    S.tower.floor = Math.max(S.tower.floor, fl); S.tower.score = Math.max(S.tower.score, run.score); S.tower.runs = (S.tower.runs || 0) + 1;
    pay = why === 'cash' ? run.cash : Math.floor(run.cash / 2);
    S.tower.cash = (S.tower.cash || 0) + pay;
    title = why === 'cash' ? 'AUSGEZAHLT!' : 'VOM TURM GEFALLEN';
    col = why === 'cash' ? '#7dff7a' : '#ff4a6a';
    lines = ['GESCHAFFTE ETAGEN: ' + fl + (rec ? '   NEUER REKORD!' : '   (REKORD: ' + S.tower.floor + ')'),
      'PUNKTE: ' + run.score + (hi ? '   NEUER HIGHSCORE!' : '   (HIGHSCORE: ' + S.tower.score + ')'),
      'KILLS: ' + run.kills + '   MAX-COMBO: ' + run.maxCombo + 'X',
      (why === 'cash' ? 'AUSZAHLUNG: ' : 'TROSTGELD (DIE HÄLFTE): ') + pay + '€'];
  } else {
    const n = md_rushList().length, done = D.i || 0, win = why === 'win';
    S.rush.runs = (S.rush.runs || 0) + 1; S.rush.most = Math.max(S.rush.most || 0, done);
    let rec = false;
    if (win) { S.rush.wins = (S.rush.wins || 0) + 1; if (!S.rush.best || D.t < S.rush.best) { S.rush.best = Math.round(D.t * 10) / 10; rec = true; } }
    pay = win ? run.cash + 1500 + n * 400 : Math.floor(run.cash / 2) + done * 150;
    title = win ? 'BOSS-RUSH GESCHAFFT!' : 'BOSS-RUSH GESCHEITERT';
    col = win ? '#ffe14d' : '#ff4a6a';
    lines = ['BOSSE: ' + done + '/' + n + (win ? '' : '   (BESTE: ' + S.rush.most + ')'),
      'ZEIT: ' + md_fmtTime(D.t) + (rec ? '   NEUE BESTZEIT!' : S.rush.best ? '   (BESTZEIT: ' + md_fmtTime(S.rush.best) + ')' : ''),
      'KILLS: ' + run.kills + '   PUNKTE: ' + run.score,
      (win ? 'PRÄMIE: ' : 'TROSTGELD: ') + pay + '€'];
  }
  save.money += pay; lilXP(tower ? 10 + (D.floor || 0) * 4 : 20 + (D.i || 0) * 8);
  persist();
  const msg = title + ' ' + (pay ? 'DU HAST ' + pay + '€ BEKOMMEN.' : '');
  if (typeof netPay === 'function') netPay(pay, tower ? 'ENDLOS-TURM' : 'BOSS-RUSH');
  if (NET.mode === 'host' && typeof netHostLobby === 'function') netHostLobby(msg);   // Gäste zurück in die Lobby
  md_res = { title, lines, col, msg, tower, sub: tower ? pick(MD_TOWER_LINES) : win(why) };
  Sound.muffle(false); Sound.play(why === 'dead' ? 'death' : 'win');
  setState('md_result');
  function win(w) { return w === 'win' ? 'ALLE BOSSE PLATT. GUNZER IST BEEINDRUCKT (UND VOLL MIT SAFT).' : 'DIE BOSSE LACHEN DICH AUS. NOCHMAL!'; }
}

// ---------------------------------------------------------------------
//  ENDLOS-TURM: Ablauf
// ---------------------------------------------------------------------
function md_towerStart() {
  md_sv();
  newRun('md_tower');
  run.mode = 'md_tower';
  run.modeData = { floor: 0, lives: null, rec: md_sv().tower.floor, next: 0 };
  md_towerBegin(0);
}
function md_towerBegin(k) {
  md_deadAt = -1;
  beginFloor(k);
  md_applyLives();
  G.introT = 2.4;
  Sound.play('alert');
}
function md_towerNext() {
  const k = G.fi, D = run.modeData;
  if (G.md_over || G.md_next) return;
  G.md_next = true; G.exiting = true;
  const reward = 40 + k * 20 + (G.F.boss ? 400 : 0);
  run.cash += reward;
  floatText(G.player.x, G.player.y - 30, 'ETAGE ' + (k + 1) + ' GESCHAFFT! +' + reward + '€', '#7dff7a');
  D.floor = Math.max(D.floor || 0, k + 1);
  const S = md_sv(); if (D.floor > S.tower.floor) { S.tower.floor = D.floor; persist(); }   // Rekord sofort sichern
  md_storeLives((k + 1) % 2 === 0 || G.F.boss ? 1 : 0);
  md_saveCarry();
  Sound.play('clear');
  goto(() => md_towerBegin(k + 1));
}
RUN_MODES.md_tower = {
  update(dt) {
    const D = run.modeData; if (!D || G.md_over) return;
    if (G.cleared && !G.exiting) {
      if (pressed.KeyC) { md_endRun('cash'); return; }
      if (G.F.boss) { D.next = (D.next || 3.5) - frameDt; if (D.next <= 0) { D.next = 0; md_towerNext(); } }
    } else D.next = 0;
  },
  onExit() { md_towerNext(); return true; },
  onAllDead() { if (livesLeft()) return false; md_endRun('dead'); return true; },
  hud() { md_hud(); },
};

// ---------------------------------------------------------------------
//  BOSS-RUSH: Ablauf
// ---------------------------------------------------------------------
function md_rushStart() {
  const L = md_rushList();
  if (!L.length) { enterHub(); cityMsg('KEINE BOSSE DA. DIE HABEN ALLE URLAUB.', 3); return; }
  md_sv();
  newRun('md_rush');
  run.mode = 'md_rush';
  run.modeData = { i: 0, n: L.length, t: 0, lives: null, next: 0, best: md_sv().rush.best || 0 };
  md_rushBegin(0);
}
function md_rushBegin(i) {
  md_deadAt = -1;
  md_rCur = i;
  beginFloor(i);
  md_applyLives();
  G.introT = 2.4;
}
function md_rushNext() {
  const D = run.modeData;
  if (G.md_over || G.md_next) return;
  G.md_next = true;
  D.i = G.fi + 1;
  run.cash += 250;
  if (D.i >= md_rushList().length) { md_endRun('win'); return; }
  G.exiting = true;
  md_storeLives(2);
  md_saveCarry();
  goto(() => md_rushBegin(D.i));
}
RUN_MODES.md_rush = {
  update(dt) {
    const D = run.modeData; if (!D || G.md_over) return;
    if (!G.cleared) { D.t += frameDt; D.next = 0; return; }
    if (!G.exiting) { D.next = (D.next || 3) - frameDt; if (D.next <= 0) { D.next = 0; md_rushNext(); } }
  },
  onExit() { md_rushNext(); return true; },
  onAllDead() { if (livesLeft()) return false; md_endRun('dead'); return true; },
  hud() { md_hud(); },
};
// eigene Anzeige (Host + Gast). Beim Host: "alle tot, keine Leben" -> nach 1,2 s Ergebnis statt Neustart-Text
function md_hud() {
  const D = run.modeData; if (!D || !G) return;
  const tower = run.mode === 'md_tower', y0 = G.boss && G.boss.active && G.boss.state !== 'dead' ? 42 : 30;
  if (tower) {
    txt('ENDLOS-TURM  -  ETAGE ' + (G.fi + 1) + '   REKORD: ' + Math.max(D.rec || 0, D.floor || 0), W / 2, y0, { font: FS, align: 'center', color: '#c08aff' });
  } else {
    txt('BOSS-RUSH ' + (Math.min(D.i || 0, D.n - 1) + 1) + '/' + D.n + '   ZEIT ' + md_fmtTime(D.t) + (D.best ? '   BESTZEIT ' + md_fmtTime(D.best) : ''), W / 2, y0, { font: FS, align: 'center', color: '#ffb52a' });
  }
  const someAlive = G.players.some((q) => q.alive);
  if (G.cleared && !G.exiting && someAlive) {
    const host = NET.mode !== 'client';
    if (tower) txt((G.F.boss ? 'WEITER IN ' + Math.ceil(D.next || 0) + '...   ' : '') + (host ? '[C] AUSZAHLEN (' + run.cash + '€) UND GEHEN' : 'DER HOST KANN MIT [C] AUSZAHLEN'), W / 2, y0 + 12, { font: FS, align: 'center', color: '#7dff7a' });
    else txt('BOSS ERLEDIGT! ' + (D.i + 1 >= D.n ? 'GLEICH GESCHAFFT...' : 'NÄCHSTER BOSS IN ' + Math.ceil(D.next || 0) + '...'), W / 2, y0 + 12, { font: FS, align: 'center', color: '#7dff7a' });
  }
  // Mods der Etage ansagen
  if (G.introT > 0 && G.mods && G.mods.length) {
    ctx.globalAlpha = clamp(G.introT, 0, 1);
    txt('ACHTUNG: ' + G.mods.map((m) => MD_MOD_NAMES[m] || String(m).toUpperCase()).join(' + '), W / 2, H / 2 - 18, { align: 'center', color: '#ff6a6a', shadow: '#000' });
    ctx.globalAlpha = 1;
  }
  if (NET.mode === 'client') return;
  if (!someAlive && !livesLeft() && !G.md_over) {
    if (md_deadAt < 0) md_deadAt = T;
    else if (T - md_deadAt > 1.2) md_endRun('dead');
  } else md_deadAt = -1;
}

// ---------------------------------------------------------------------
//  Bildschirme: Auswahl-Menü + Ergebnis
// ---------------------------------------------------------------------
let md_sel = 0;
function md_openMenu(sel) {
  if (NET.mode === 'client') { cityMsg('DU BIST ONLINE-GAST: DER HOST STARTET DIE MODI.', 3); Sound.play('click'); return; }
  if (C && C.wanted > 0) { cityMsg('DU WIRST GESUCHT! HÄNG ERST DIE POLIZEI AB.', 2.5); Sound.play('click'); return; }
  md_sel = sel; md_sv();
  setState('md_menu');
  Sound.play('select');
}
function md_start(which) {
  citySave();
  Sound.play('select');
  goto(() => (which === 0 ? md_towerStart() : md_rushStart()));
}
// kleiner Pixel-Turm (Menü), Fenster blinken zufällig
function md_drawTower(g, x, y, floors) {
  g.fillStyle = '#1a0a2a'; g.fillRect(x - 2, y - floors * 12 - 10, 40, floors * 12 + 10);
  g.fillStyle = '#ff3fa4'; g.fillRect(x + 16, y - floors * 12 - 22, 4, 12);
  g.fillStyle = Math.floor(T * 2) % 2 ? '#ff2a2a' : '#5a0000'; g.fillRect(x + 16, y - floors * 12 - 24, 4, 3);
  for (let f = 0; f < floors; f++) for (let k = 0; k < 4; k++) {
    const on = hash(f * 7 + k, Math.floor(T * 1.5)) > 0.4;
    g.fillStyle = on ? (f === floors - 1 ? '#ffe14d' : '#b06aff') : '#2a1a3a';
    g.fillRect(x + 2 + k * 9, y - f * 12 - 8, 6, 6);
  }
  g.fillStyle = '#ff3fa4'; g.fillRect(x - 4, y, 44, 2);
}
function md_drawSkull(g, x, y, c) {
  g.fillStyle = c; g.fillRect(x, y, 10, 8); g.fillRect(x + 2, y + 8, 6, 3);
  g.fillStyle = '#100010'; g.fillRect(x + 2, y + 3, 2, 2); g.fillRect(x + 6, y + 3, 2, 2); g.fillRect(x + 4, y + 9, 1, 2);
}
SCREENS.md_menu = (dt) => {
  drawSynthwave();
  const S = md_sv(), rush = md_rushList();
  panel(24, 18, W - 48, H - 36, md_sel === 1 ? '#ff3b3b' : '#b06aff');
  txt('TURM & RUSH', W / 2, 26, { size: 16, align: 'center', color: (i) => neon(i), wave: 2, shadow: '#200030' });
  const opts = ['ENDLOS-TURM', 'BOSS-RUSH', 'ZURÜCK'];
  for (let i = 0; i < opts.length; i++) {
    const y = 60 + i * 26;
    if (button((md_sel === i ? '> ' : '') + opts[i], 40, y, 150, 20, true, i === 1 ? '#ff3b3b' : i === 0 ? '#b06aff' : '#888888')) { md_sel = i; if (i === 2) { enterHub(); return; } md_start(i); return; }
  }
  if (uiActive()) {
    if (pressed.ArrowDown || pressed.KeyS) { md_sel = (md_sel + 1) % 3; Sound.play('blip', true); }
    if (pressed.ArrowUp || pressed.KeyW) { md_sel = (md_sel + 2) % 3; Sound.play('blip', true); }
    if (pressed.Escape) { enterHub(); return; }
    if (stateT > 0.15 && (pressed.Enter || pressed.Space || pressed.KeyE)) { if (md_sel === 2) { enterHub(); return; } md_start(md_sel); return; }
  }
  const ix = 212, iw = W - 48 - (ix - 24) - 10;
  if (md_sel === 0) {
    md_drawTower(ctx, 52, 228, 5);
    txt('DER ENDLOS-TURM', ix, 58, { color: '#c08aff' });
    wrap('JEDE ETAGE NEU GEWÜRFELT. ES WIRD IMMER HÄRTER: MEHR GEGNER, FIESE ETAGEN-MODS, ALLE 10 ETAGEN EIN TURMWÄCHTER. LEBEN NIMMST DU MIT (ALLE 2 ETAGEN +1).', Math.floor(iw / 5.2))
      .forEach((l, i) => txt(l, ix, 74 + i * 10, { font: FS, color: '#dddddd' }));
    txt('NACH JEDER ETAGE: [C] AUSZAHLEN.', ix, 140, { font: FS, color: '#7dff7a' });
    txt('ALLE LEBEN WEG = NUR HALBES GELD.', ix, 150, { font: FS, color: '#ff6a6a' });
    txt('REKORD: ETAGE ' + S.tower.floor, ix, 172, { color: '#ffe14d' });
    txt('HIGHSCORE: ' + S.tower.score + ' PKT', ix, 186, { font: FS, color: '#ffe14d' });
    txt('VERSUCHE: ' + (S.tower.runs || 0) + '   VERDIENT: ' + (S.tower.cash || 0) + '€', ix, 198, { font: FS, color: '#aaaaaa' });
  } else if (md_sel === 1) {
    for (let i = 0; i < Math.min(rush.length, 12); i++) md_drawSkull(ctx, 44 + (i % 6) * 16, 150 + Math.floor(i / 6) * 18 + (Math.floor(T * 4 + i) % 4 === 0 ? -1 : 0), i < (S.rush.most || 0) ? '#ffe14d' : '#e8e8e8');
    txt('BOSS-RUSH', ix, 58, { color: '#ff6a6a' });
    wrap('ALLE ' + rush.length + ' BOSSE HINTEREINANDER. DIE UHR LÄUFT. LEBEN WERDEN MITGENOMMEN (+2 PRO BOSS). WAFFEN AUCH.', Math.floor(iw / 5.2))
      .forEach((l, i) => txt(l, ix, 74 + i * 10, { font: FS, color: '#dddddd' }));
    rush.slice(0, 6).forEach((r, i) => txt((i + 1) + '. ' + BOSS_INFO[r.id].name, ix, 112 + i * 9, { font: FS, color: '#ff9ad5' }));
    if (rush.length > 6) txt('... UND ' + (rush.length - 6) + ' WEITERE', ix, 166, { font: FS, color: '#ff9ad5' });
    txt('BESTZEIT: ' + (S.rush.best ? md_fmtTime(S.rush.best) : '--:--.-'), ix, 180, { color: '#ffe14d' });
    txt('MEISTE BOSSE: ' + (S.rush.most || 0) + '/' + rush.length + '   SIEGE: ' + (S.rush.wins || 0), ix, 194, { font: FS, color: '#aaaaaa' });
  } else {
    txt('ZURÜCK IN DIE STADT.', ix, 58, { color: '#aaaaaa' });
    txt('FEIGLING. (NICHT BÖSE GEMEINT.)', ix, 74, { font: FS, color: '#777777' });
  }
  txt('[W/S] WÄHLEN   [ENTER] LOS   [ESC] ZURÜCK', W / 2, H - 30, { font: FS, align: 'center', color: '#888888' });
};
SCREENS.md_result = (dt) => {
  if (G && G.players) renderWorld(); else drawSynthwave();
  const R_ = md_res || { title: '???', lines: [], col: '#fff', msg: '' };
  ctx.fillStyle = 'rgba(10,0,20,0.78)'; ctx.fillRect(0, 0, W, H);
  txt(R_.title, W / 2, 40, { size: 24, align: 'center', color: R_.col, wave: 3, shadow: '#000' });
  if (R_.tower) md_drawTower(ctx, 26, 220, Math.min(12, Math.max(1, (run.modeData && run.modeData.floor) || 1)));
  R_.lines.forEach((l, i) => txt(l, W / 2, 86 + i * 16, { align: 'center', color: i === R_.lines.length - 1 ? '#7dff7a' : '#ffffff' }));
  if (R_.sub) txt(R_.sub, W / 2, 160, { font: FS, align: 'center', color: '#ff9ad5' });
  if (stateT > 0.8 && Math.floor(T * 2.5) % 2 === 0) txt('[ENTER] ZURÜCK IN DIE STADT', W / 2, 200, { align: 'center', color: (i) => neon(i), wave: 2 });
  if (uiActive() && stateT > 0.8 && (pressed.Enter || pressed.Space || pressed.KeyE || pressed.KeyR || pressed.Escape || mouse.pl)) {
    const m = R_.msg;
    goto(() => { enterHub(); cityMsg(m, 5); });
  }
};

// ---------------------------------------------------------------------
//  Stadt: Bauplatz K1 (201,78,16,8) -> zwei Gebäude nebeneinander
// ---------------------------------------------------------------------
BUILDINGS.push({ id: 'md_turm', x: 201, y: 78, w: 9, h: 8, roof: '#2a1040', label: 'ENDLOS-TURM', marker: [205, 87], markerText: 'T', markerCol: '#b06aff',
  actLabel: 'ENDLOS-TURM BETRETEN', act: () => md_openMenu(0) });
BUILDINGS.push({ id: 'md_rushhalle', x: 211, y: 78, w: 6, h: 8, roof: '#4a0a0a', label: 'BOSS-RUSH', marker: [214, 87], markerText: 'B', markerCol: '#ff3b3b',
  actLabel: 'BOSS-RUSH-HALLE BETRETEN', act: () => md_openMenu(1) });
// Dach-Deko: Turm mit Neon-Fenstern + Antenne, Halle mit Totenkopf-Schild
CITY_HOOKS.draw.push((g) => {
  const tx = 201 * TS, ty = 78 * TS;
  for (let f = 0; f < 5; f++) for (let k = 0; k < 6; k++) {
    g.fillStyle = hash(f * 13 + k, Math.floor(T)) > 0.35 ? '#b06aff' : '#3a2050';
    g.fillRect(tx + 18 + k * 18, ty + 14 + f * 18, 8, 6);
  }
  g.fillStyle = '#888'; g.fillRect(tx + 70, ty - 10, 2, 14);
  g.fillStyle = Math.floor(T * 2) % 2 ? '#ff2a2a' : '#600'; g.fillRect(tx + 69, ty - 12, 4, 3);
  const rx = 211 * TS, ry = 78 * TS;
  md_drawSkull(g, rx + 43, ry + 40, Math.floor(T * 3) % 2 ? '#ffe14d' : '#e8e8e8');
  g.fillStyle = '#ff3b3b'; g.fillRect(rx + 30, ry + 60, 36, 2);
});

// ---------------------------------------------------------------------
//  Erfolge
// ---------------------------------------------------------------------
ACHIEVEMENTS.push(
  { id: 'md_tower10', name: 'HÖHENANGST? NÖ!', desc: 'ENDLOS-TURM: ETAGE 10 GESCHAFFT', pay: 5000, ok: () => !!(save.s2 && save.s2.tower && save.s2.tower.floor >= 10) },
  { id: 'md_tower25', name: 'TURM-GOTT', desc: 'ENDLOS-TURM: ETAGE 25 GESCHAFFT', pay: 15000, ok: () => !!(save.s2 && save.s2.tower && save.s2.tower.floor >= 25) },
  { id: 'md_rushwin', name: 'BOSS DER BOSSE', desc: 'BOSS-RUSH KOMPLETT GESCHAFFT', pay: 12000, ok: () => !!(save.s2 && save.s2.rush && save.s2.rush.wins > 0) },
);
