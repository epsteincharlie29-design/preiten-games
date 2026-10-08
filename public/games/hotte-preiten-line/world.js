'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Welt: Etage laden, Tiles, Kollision, Sicht, Pfade, Gefahren
// =====================================================================
let G = null;     // aktuelle Etage
let run = null;   // aktueller Level-Versuch

const FLOORS = '.,:_;=+-r<>';
const ENT = 'PESUMKBRNYQVFJW';
// neue Gegnerarten aus späteren Dateien: Kartenzeichen (kein Buchstabe!) -> Verhalten (hooks.md)
const ENEMY_EXT = {};
const isEnemyChar = (c) => ENT.includes(c) || !!ENEMY_EXT[c];
const ITEMS = { p: 'pistol', s: 'shotgun', u: 'uzi', b: 'baguette', f: 'pan', c: 'chicken', h: 'bat', k: 'katana', m: 'magnum', g: 'rifle', j: 'laser', o: 'osaft', v: 'vexwave', a: 'crossbow', n: 'flamer', y: 'boomerang', q: 'minigun', e: 'shovel', i: 'nailgun', t: 'taser', x: 'rocket', z: 'scythe', d: 'golf', 4: 'harpoon', 5: 'juicegun' };
const BLOOD = ['#a0001a', '#7a0012', '#c4002a', '#8c0018'];
const DEFAULT_FLOOR = {
  '.': ['#3fb8af', '#37a69e'], ',': ['#7a1f5c', '#86266a'], ':': ['#f1ece0', '#24202e'], '_': ['#2a2838', '#302e42'],
  ';': ['#3c8c3c', '#357d35'], '=': ['#9c1a2a', '#ad2232'], '+': ['#ff3fa4', '#3fd0ff'], '-': ['#1a2430', '#1e2a38'], 'r': ['#2a2622', '#3a342c'],
  '>': ['#2a2a30', '#3a3a44'], '<': ['#2a2a30', '#3a3a44'],
};

function T_(x, y) { if (x < 0 || y < 0 || x >= G.w || y >= G.h) return ' '; return G.tiles[y * G.w + x]; }
const isWallC = (c) => c === '#' || c === 'H' || c === ' ' || c === 'I';
const isSolidC = (c) => isWallC(c) || c === 'T' || c === 'A' || c === '~' || c === 'G' || c === 'C' || c === 'Z' || c === 'L' || c === 'w';
const blocksBulletC = (c) => isWallC(c) || c === 'A' || c === 'C' || c === 'Z' || c === 'L';

function floorUnder(rows, x, y) {
  const at = (xx, yy) => (rows[yy] && rows[yy][xx]) || ' ';
  for (let r = 1; r < 4; r++) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const c = at(x + dx * r, y + dy * r);
      if (FLOORS.includes(c) && c !== 'r') return c;
    }
  }
  return '.';
}

function loadFloor(li, fi) {
  const L = levelById(li), F = L.floors[fi];
  const rows = F.map || generateFloor(bigGen(F.gen), L.theme, L.diff);
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const feat = (F.gen && F.gen.feat) || {};
  G = {
    li, fi, L, F, w, h, TH: THEMES[F.theme || L.theme] || {}, diff: L.diff + fi * 0.35 + (save.hard && !L.arena ? 1.5 : 0), locked: [], terminals: [], hacked: false,
    tiles: new Array(w * h), under: new Array(w * h), solid: new Uint8Array(w * h), doors: {},
    enemies: [], pickups: [], bullets: [], parts: [], texts: [], exits: [], water: [], dance: [],
    cashes: [], oneUps: [], safes: {}, lasers: [], laserGroup: new Int16Array(w * h).fill(-1), laserOff: [],
    lanes: [], dark: !!feat.dark || !!F.dark,
    time: 0, cleared: false, exiting: false, hitstop: 0, slowmo: 0, shake: 0, flash: 0, introT: 3,
    cam: { x: 0, y: 0, rot: 0, z: 1 }, boss: null, tip: '', clearT: 0, focusT: 0, waves: [], booms: [], doorGrace: 0, belts: [],
  };
  G.mods = [...(L.mods || []), ...(F.mods || [])];   // aktive Etagen-Mods (Ids in FLOOR_MODS)
  G.modState = {};                                    // ihr Zustand: nur einfache Daten (wird an Online-Gäste geschickt)
  let px = 40, py = 40;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x] || ' ';
      const i = y * w + x, cx = x * TS + 8, cy = y * TS + 8;
      if (isEnemyChar(c) || ITEMS[c] || c === '$' || c === '1') {
        G.tiles[i] = floorUnder(rows, x, y);
        if (c === 'P') { px = cx; py = cy; }
        else if (ITEMS[c]) G.pickups.push(makePickup(cx, cy, ITEMS[c]));
        else if (c === '$') G.cashes.push({ x: cx, y: cy, val: cashValue(), vx: 0, vy: 0, t: rand(10) });
        else if (c === '1') G.oneUps.push({ x: cx, y: cy, t: 0 });
        else G.enemies.push(makeEnemy(c, cx, cy, F.boss));
      } else G.tiles[i] = c;
      G.under[i] = FLOORS.includes(G.tiles[i]) && G.tiles[i] !== 'r' ? G.tiles[i] : floorUnder(rows, x, y);
      if (c === 'X') G.exits.push(i);
      if (c === '~') G.water.push(i);
      if (c === '+') G.dance.push(i);
      if (c === 'Z') G.safes[i] = { hp: 4 };
      if (c === 'l') G.lasers.push(i);
      if (c === 'L') G.locked.push(i);
      if (c === 'w') G.terminals.push(i);
    }
  }
  const wallish = (c) => isWallC(c) || c === 'G' || c === 'D' || c === 'L';
  for (let i = 0; i < w * h; i++) {
    const c = G.tiles[i];
    G.solid[i] = isSolidC(c) ? 1 : 0;
    if (c === 'D' || c === 'G' || c === 'L') {
      const x = i % w, y = (i / w) | 0;
      const horiz = wallish(T_(x - 1, y)) && wallish(T_(x + 1, y));
      G.doors[i] = c === 'D' ? { open: false, side: 1, horiz } : c === 'L' ? { security: true, horiz } : { glass: true, horiz };
    }
  }
  if (F.boss) addBossCover(li, fi, px, py);
  setupLasers();
  setupLanes();
  G.player = makePlayer(px, py, 0);
  G.players = [G.player];
  if (typeof coopActive === 'function' && coopActive()) {
    const ids = NET.mode === 'host' ? NET.conns.map((c) => c.idx).sort() : [1];
    for (const i of ids) { const [x2, y2] = spotNear(px, py); G.players.push(makePlayer(x2, y2, i)); }
  }
  for (let i = 0; i < w * h; i++) if (G.tiles[i] === '>' || G.tiles[i] === '<') G.belts.push(i);
  for (const e of G.enemies) {
    const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS);
    const dirs = [[1, 0, 0], [0, 1, Math.PI / 2], [-1, 0, Math.PI], [0, -1, -Math.PI / 2]].filter(([dx, dy]) => !G.solid[(ty + dy) * w + tx + dx]);
    if (dirs.length) e.a = e.ta = pick(dirs)[2];
    if (e.kind === 'B') G.boss = e;
  }
  floorModsCall('setup', F, L);   // Mods dürfen hier noch Kacheln ändern
  renderStatic();
  G.cam.x = px; G.cam.y = py;
  Sound.muffle(false);
  Sound.playSong(L.song);
  petInit();
  if (NET.mode === 'host' && NET.connected && typeof netSendFloor === 'function') netSendFloor();
}
// generierte Etagen sind größer und voller als früher (mehr zum Grinden)
function bigGen(g) { return Object.assign({}, g, { w: Math.round(g.w * 1.15), h: Math.round(g.h * 1.12), enemies: Math.round(g.enemies * 1.2), items: g.items + 2, cash: Math.round(g.cash * 1.2) }); }
function cashValue() { return Math.round((5 + G.diff * 4) * rand(0.7, 1.3)); }

// ---------- Laser: Gruppen blinken versetzt ----------
function setupLasers() {
  let gid = 0;
  for (const s of G.lasers) {
    if (G.laserGroup[s] >= 0) continue;
    const q = [s]; G.laserGroup[s] = gid;
    while (q.length) {
      const c = q.pop(), x = c % G.w, y = (c / G.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = (y + dy) * G.w + x + dx;
        if (T_(x + dx, y + dy) === 'l' && G.laserGroup[n] < 0) { G.laserGroup[n] = gid; q.push(n); }
      }
    }
    G.laserOff.push(rand(0, 3.4)); gid++;
  }
}
const LASER_PERIOD = 3.4, LASER_ON = 1.8;
function laserPhase(gid) { return (G.time + G.laserOff[gid]) % LASER_PERIOD; }
function laserOn(gid) { return laserPhase(gid) < LASER_ON; }
function laserWarn(gid) { return laserPhase(gid) > LASER_PERIOD - 0.45; }

// ---------- U-Bahn: Gleise und Züge ----------
function setupLanes() {
  let y = 0;
  while (y < G.h) {
    let cnt = 0; for (let x = 0; x < G.w; x++) if (G.tiles[y * G.w + x] === 'r') cnt++;
    if (cnt > G.w * 0.5) {
      const y0 = y; while (y + 1 < G.h) { let c2 = 0; for (let x = 0; x < G.w; x++) if (G.tiles[(y + 1) * G.w + x] === 'r') c2++; if (c2 > G.w * 0.5) y++; else break; }
      G.lanes.push({ y0, y1: y, t: rand(5, 9), state: 'idle', x: 0, dir: Math.random() < 0.5 ? 1 : -1 });
    }
    y++;
  }
}
const TRAIN_LEN = 15 * TS, TRAIN_SPEED = 620;
function updateLanes(dt) {
  for (const ln of G.lanes) {
    ln.t -= dt;
    if (ln.state === 'idle' && ln.t <= 0) { ln.state = 'warn'; ln.t = 2.2; Sound.play('train'); }
    else if (ln.state === 'warn' && ln.t <= 0) {
      ln.state = 'pass'; ln.dir = -ln.dir;
      ln.x = ln.dir > 0 ? -TRAIN_LEN : G.w * TS + TRAIN_LEN;
      Sound.play('rumble'); shake(4);
    } else if (ln.state === 'pass') {
      ln.x += ln.dir * TRAIN_SPEED * dt;
      shake(1.5);
      const top = ln.y0 * TS, bot = (ln.y1 + 1) * TS;
      const x0 = ln.dir > 0 ? ln.x - TRAIN_LEN : ln.x, x1 = ln.dir > 0 ? ln.x : ln.x + TRAIN_LEN;
      const hit = (e) => e.y + e.r > top && e.y - e.r < bot && e.x > x0 && e.x < x1;
      for (const p of G.players) if (p.alive && hit(p)) killPlayer(null, ln.dir > 0 ? 0 : Math.PI, 'train', p);
      for (const e of G.enemies) if (e.state !== 'dead' && e.kind !== 'Y' && e.kind !== 'V' && !(ENEMY_EXT[e.kind] && ENEMY_EXT[e.kind].trainProof) && hit(e)) killEnemy(e, 'train', ln.dir > 0 ? 0 : Math.PI);
      if ((ln.dir > 0 && ln.x > G.w * TS + TRAIN_LEN) || (ln.dir < 0 && ln.x < -TRAIN_LEN)) { ln.state = 'idle'; ln.t = rand(7, 12); }
    }
  }
}

// ---------- Geld, Extraleben, Tresore ----------
function spawnCash(x, y, total, n) {
  const per = Math.max(1, Math.round(total / n));
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), s = rand(30, 110);
    G.cashes.push({ x, y, val: per, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rand(10) });
  }
}
function updateCash(dt) {
  const magnet = perk('magnet') || anyMask('magnet') ? 75 : 0;
  const cashMul = (magnet ? 1.25 : 1) * (hasBoost('cash') ? 1.3 : 1) * (anyMask('schwein') ? 1.25 : 1) * (save.hard ? 1.5 : 1);
  for (const c of G.cashes) {
    c.t += dt;
    const f = Math.exp(-dt * 5); c.vx *= f; c.vy *= f;
    const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
    if (!G.solid[Math.floor(c.y / TS) * G.w + Math.floor(nx / TS)]) c.x = nx; else c.vx *= -0.5;
    if (!G.solid[Math.floor(ny / TS) * G.w + Math.floor(c.x / TS)]) c.y = ny; else c.vy *= -0.5;
    const p = nearestPlayer(c.x, c.y);
    if (!p) continue;
    const d = dist(c.x, c.y, p.x, p.y);
    if (magnet && d < magnet && d > 1) { c.x += (p.x - c.x) / d * 180 * dt; c.y += (p.y - c.y) / d * 180 * dt; }
    if (d < 11) {
      c.dead = true;
      const v = Math.round(c.val * cashMul);
      run.cash += v;
      floatText(c.x, c.y - 8, '+' + v + '€', '#7dff7a', true);
      Sound.play('coin');
    }
  }
  G.cashes = G.cashes.filter((c) => !c.dead);
  for (const o of G.oneUps) {
    o.t += dt;
    const p = nearestPlayer(o.x, o.y);
    if (p && dist(o.x, o.y, p.x, p.y) < 11) {
      o.dead = true; if (run.livesBy) { run.livesBy[p.idx] = (run.livesBy[p.idx] || 0) + 1; p.lives = run.livesBy[p.idx]; p.maxLives = Math.max(p.maxLives || 0, p.lives); }
      floatText(o.x, o.y - 12, 'EXTRA-LEBEN!', 'rainbow'); Sound.play('heart');
    }
  }
  G.oneUps = G.oneUps.filter((o) => !o.dead);
}
function damageSafe(tx, ty, dmg) {
  const i = ty * G.w + tx, s = G.safes[i];
  if (!s || G.tiles[i] !== 'Z') return false;
  s.hp -= dmg;
  sparks(tx * TS + 8, ty * TS + 8, 6, '#ffe14d');
  Sound.play('punch');
  if (s.hp <= 0) {
    G.tiles[i] = G.under[i]; G.solid[i] = 0;
    drawFloorTile(G.fg, G.under[i], tx, ty);
    spawnCash(tx * TS + 8, ty * TS + 8, Math.round((40 + G.diff * 25) * rand(0.8, 1.3)), 8);
    floatText(tx * TS + 8, ty * TS - 4, 'TRESOR GEKNACKT!', '#7dff7a');
    Sound.play('cash'); shake(3);
  }
  return true;
}

// ---------------------------------------------------------------------
//  Statische Ebenen vorrendern
// ---------------------------------------------------------------------
function floorCols(ch) { return G.TH[ch] || DEFAULT_FLOOR[ch] || DEFAULT_FLOOR['.']; }
function drawFloorTile(g, ch, x, y) {
  const [a, b] = floorCols(ch);
  const X = x * TS, Y = y * TS;
  g.fillStyle = a; g.fillRect(X, Y, TS, TS);
  switch (ch) {
    case '.':
      if ((x + y) % 2) { g.fillStyle = b; g.fillRect(X, Y, TS, TS); }
      g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(X, Y + 15, 16, 1); g.fillRect(X + 15, Y, 1, 16);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(X, Y, 16, 1);
      break;
    case ',':
      g.fillStyle = b;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2 === 0) g.fillRect(X + i * 4 + 1, Y + j * 4 + 1, 2, 2);
      break;
    case ':':
      g.fillStyle = b;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if ((i + j) % 2) g.fillRect(X + i * 8, Y + j * 8, 8, 8);
      break;
    case '_':
      g.fillStyle = b;
      for (let k = 0; k < 14; k++) g.fillRect(X + Math.floor(hash(x * 31 + k, y * 17) * 16), Y + Math.floor(hash(x * 7, y * 13 + k) * 16), 1, 1);
      if (y % 4 === 2 && x % 3 === 0) { g.fillStyle = '#d8c040'; g.fillRect(X + 2, Y + 7, 10, 2); }
      break;
    case ';':
      g.fillStyle = b;
      for (let k = 0; k < 12; k++) g.fillRect(X + Math.floor(hash(x * 11 + k, y * 3) * 16), Y + Math.floor(hash(x * 5, y * 19 + k) * 15), 1, 2);
      if (hash(x, y) > 0.92) { g.fillStyle = ['#ff6fb5', '#ffe14d', '#ffffff'][Math.floor(hash(y, x) * 3)]; g.fillRect(X + 6, Y + 6, 2, 2); }
      break;
    case '=':
      g.fillStyle = b;
      for (let i = 0; i < 16; i += 4) g.fillRect(X + i, Y + ((i / 4 + x + y) % 4) * 4, 2, 2);
      g.fillStyle = 'rgba(255,215,0,0.25)'; if (y % 2 === 0) g.fillRect(X, Y, 16, 1);
      break;
    case '+':
      g.fillStyle = '#140820'; g.fillRect(X, Y, 16, 16);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(X, Y, 16, 1); g.fillRect(X, Y, 1, 16);
      break;
    case '-':
      g.fillStyle = b;
      for (let i = 0; i < 16; i += 4) { g.fillRect(X + i, Y, 1, 16); g.fillRect(X, Y + i, 16, 1); }
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(X + 1, Y + 1, 2, 2);
      break;
    case 'r':
      g.fillStyle = '#1a1714'; g.fillRect(X, Y, 16, 16);
      g.fillStyle = '#5a4630'; for (let i = 1; i < 16; i += 5) g.fillRect(X + i, Y + 1, 3, 14);
      g.fillStyle = '#9a9aa8'; g.fillRect(X, Y + 3, 16, 2); g.fillRect(X, Y + 11, 16, 2);
      break;
  }
}
function drawTable(g, x, y) {
  const X = x * TS, Y = y * TS;
  const nT = (dx, dy) => T_(x + dx, y + dy) === 'T';
  const l = nT(-1, 0) ? 0 : 1, r = nT(1, 0) ? 0 : 1, t = nT(0, -1) ? 0 : 1, b = nT(0, 1) ? 0 : 1;
  g.fillStyle = 'rgba(0,0,0,0.3)'; if (b) g.fillRect(X + 2, Y + 14, 14, 2);
  g.fillStyle = '#4a2c18'; g.fillRect(X + l, Y + t, 16 - l - r, 16 - t - b);
  g.fillStyle = '#8d5a3b'; g.fillRect(X + l * 2, Y + t * 2, 16 - l * 2 - r * 2, 16 - t * 2 - b * 3);
  g.fillStyle = '#a8714d'; if (t) g.fillRect(X + l * 2, Y + 2, 16 - l * 2 - r * 2, 1);
  const hv = hash(x * 3, y * 5);
  if (hv > 0.62) { pxEll(g, X + 8, Y + 7, 3, 3, '#f4f4f4'); pxEll(g, X + 8, Y + 7, 2, 1, '#c98b3e'); g.fillStyle = '#4caf50'; g.fillRect(X + 7, Y + 6, 1, 1); }
  else if (hv > 0.42) { g.fillStyle = '#fff'; g.fillRect(X + 5, Y + 5, 3, 3); g.fillStyle = '#6b3a1a'; g.fillRect(X + 6, Y + 6, 1, 1); }
  else if (hv > 0.3) { g.fillStyle = '#e53935'; g.fillRect(X + 9, Y + 4, 2, 5); g.fillStyle = '#fff'; g.fillRect(X + 9, Y + 5, 2, 1); }
}
function drawCrate(g, x, y) {
  const X = x * TS, Y = y * TS;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X + 2, Y + 2, 15, 15);
  g.fillStyle = '#6b4a24'; g.fillRect(X, Y, 15, 15);
  g.fillStyle = '#a07040'; g.fillRect(X + 1, Y + 1, 13, 13);
  g.fillStyle = '#6b4a24'; g.fillRect(X + 1, Y + 7, 13, 1); g.fillRect(X + 7, Y + 1, 1, 13);
  g.fillStyle = '#c08a50'; g.fillRect(X + 1, Y + 1, 13, 1);
}
function drawCars(g) {
  const seen = new Uint8Array(G.w * G.h);
  for (let i = 0; i < G.tiles.length; i++) {
    if (G.tiles[i] !== 'A' || seen[i]) continue;
    const x0 = i % G.w, y0 = (i / G.w) | 0;
    let x1 = x0, y1 = y0;
    while (T_(x1 + 1, y0) === 'A') x1++;
    while (T_(x0, y1 + 1) === 'A') y1++;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) seen[y * G.w + x] = 1;
    const horiz = x1 - x0 >= y1 - y0;
    const X = x0 * TS, Y = y0 * TS, w = (x1 - x0 + 1) * TS, h = (y1 - y0 + 1) * TS;
    const col = ['#ff3f9a', '#3fa8ff', '#ffd23f', '#5aff7a', '#e8e8e8', '#ff6a3f'][Math.floor(hash(x0, y0) * 6)];
    g.save();
    if (!horiz) { g.translate(X + w, Y); g.rotate(Math.PI / 2); } else g.translate(X, Y);
    const L = horiz ? w : h, Wd = horiz ? h : w, R = Math.round;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(3, 3, L, Wd);
    g.fillStyle = '#111'; g.fillRect(8, -1, 9, 3); g.fillRect(L - 17, -1, 9, 3); g.fillRect(8, Wd - 2, 9, 3); g.fillRect(L - 17, Wd - 2, 9, 3);
    g.fillStyle = col; g.fillRect(2, 0, L - 4, Wd); g.fillRect(0, 2, L, Wd - 4);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, Wd - 6, L, 3);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(R(L * 0.3), 4, R(L * 0.25), Wd - 8);
    g.fillStyle = '#1d2a4a'; g.fillRect(R(L * 0.55), 4, R(L * 0.16), Wd - 8); g.fillRect(R(L * 0.2), 5, R(L * 0.1), Wd - 10);
    g.fillStyle = '#fff6a0'; g.fillRect(L - 3, 3, 2, 4); g.fillRect(L - 3, Wd - 7, 2, 4);
    g.fillStyle = '#ff2020'; g.fillRect(1, 3, 2, 3); g.fillRect(1, Wd - 6, 2, 3);
    g.restore();
  }
}
function drawShelf(g, x, y, kind) {
  const X = x * TS, Y = y * TS;
  const nI = (dx, dy) => { const n = T_(x + dx, y + dy); return n === 'I'; };
  const horiz = nI(-1, 0) || nI(1, 0) || !(nI(0, -1) || nI(0, 1));
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X + 2, Y + 3, 15, 15);
  if (kind === 'servers') {
    g.fillStyle = '#0e1116'; g.fillRect(X, Y, 16, 16);
    g.fillStyle = '#1e2430';
    for (let i = 1; i < 16; i += 3) { if (horiz) g.fillRect(X + i, Y + 1, 2, 13); else g.fillRect(X + 1, Y + i, 13, 2); }
    for (let k = 0; k < 4; k++) { g.fillStyle = hash(x * 3 + k, y) > 0.5 ? '#39ff7a' : '#3fd0ff'; g.fillRect(X + 2 + Math.floor(hash(x, y + k) * 12), Y + 2 + Math.floor(hash(x + k, y) * 11), 1, 1); }
    g.fillStyle = '#2a3240'; g.fillRect(X, Y, 16, 1);
    return;
  }
  // Bücherregal
  g.fillStyle = kind === 'books' ? '#4a2c14' : '#6b4a2a'; g.fillRect(X, Y, 16, 16);
  const cols = ['#c41f2a', '#2a6ac4', '#e2bf4a', '#2a8a4a', '#8e44ad', '#e8e0d0', '#d9622a'];
  for (let i = 1; i < 15; i += 2) {
    g.fillStyle = cols[Math.floor(hash(x * 13 + i, y * 7) * cols.length)];
    const len = 9 + Math.floor(hash(x + i, y * 3) * 4);
    if (horiz) g.fillRect(X + i, Y + 13 - len, 1, len); else g.fillRect(X + 13 - len, Y + i, len, 1);
  }
  g.fillStyle = '#2a1608'; if (horiz) g.fillRect(X, Y + 13, 16, 3); else g.fillRect(X + 13, Y, 3, 16);
  g.fillStyle = '#8a5a32'; g.fillRect(X, Y, 16, 1);
}
function drawWaterTile(g, x, y) {
  const X = x * TS, Y = y * TS;
  g.fillStyle = '#2a9df4'; g.fillRect(X, Y, TS, TS);
  g.fillStyle = '#57b8ff';
  for (let k = 0; k < 3; k++) g.fillRect(X + Math.floor(hash(x * 9 + k, y) * 12), Y + Math.floor(hash(x, y * 9 + k) * 14), 4, 1);
  g.fillStyle = '#eef0f8';
  if (T_(x, y - 1) !== '~') g.fillRect(X, Y, 16, 2);
  if (T_(x, y + 1) !== '~') g.fillRect(X, Y + 14, 16, 2);
  if (T_(x - 1, y) !== '~') g.fillRect(X, Y, 2, 16);
  if (T_(x + 1, y) !== '~') g.fillRect(X + 14, Y, 2, 16);
}
function drawStairs(g, x, y) {
  const X = x * TS, Y = y * TS;
  g.fillStyle = '#3a3a4a'; g.fillRect(X, Y, 16, 16);
  for (let i = 0; i < 16; i += 4) { g.fillStyle = '#6a6a80'; g.fillRect(X + 1, Y + i, 14, 2); g.fillStyle = '#24242e'; g.fillRect(X + 1, Y + i + 2, 14, 1); }
}
function renderStatic() {
  const { w, h } = G;
  const [fc, fg] = mkCanvas(w * TS, h * TS);
  const [wc, wg] = mkCanvas(w * TS, h * TS);
  G.floorC = fc; G.fg = fg; G.wallC = wc;
  G.dcw = Math.ceil(w * TS / DCH); G.dch = Math.ceil(h * TS / DCH); G.dchunks = new Array(G.dcw * G.dch).fill(null);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, c = G.tiles[i];
    if (isWallC(c)) continue;
    drawFloorTile(fg, c === 'r' || c === '+' ? c : G.under[i], x, y);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = G.tiles[y * w + x];
    if (isWallC(c)) continue;
    const up = T_(x, y - 1), left = T_(x - 1, y);
    fg.fillStyle = 'rgba(0,0,0,0.28)'; if (up === '#' || up === 'H' || up === 'I') fg.fillRect(x * TS, y * TS, 16, 4);
    fg.fillStyle = 'rgba(0,0,0,0.16)'; if (left === '#' || left === 'H' || left === 'I') fg.fillRect(x * TS, y * TS, 3, 16);
    if (G.TH.cables && hash(x * 7, y * 11) < 0.16) {
      fg.fillStyle = ['#3fd0ff', '#ffd23f', '#9a9aa8', '#5aff7a'][Math.floor(hash(y, x) * 4)];
      if (hash(x, y * 3) < 0.5) fg.fillRect(x * TS, y * TS + 4 + Math.floor(hash(x, y) * 8), 16, 1);
      else fg.fillRect(x * TS + 4 + Math.floor(hash(y, x * 5) * 8), y * TS, 1, 16);
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = G.tiles[y * w + x];
    if (c === 'T') drawTable(fg, x, y);
    else if (c === '~') drawWaterTile(fg, x, y);
    else if (c === 'X') drawStairs(fg, x, y);
    else if (c === 'C') drawCrate(fg, x, y);
  }
  drawCars(fg);
  const th = G.TH;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (G.tiles[y * w + x] === 'I') drawShelf(wg, x, y, th.shelf);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = G.tiles[y * w + x];
    if (c !== '#' && c !== 'H') continue;
    const X = x * TS, Y = y * TS;
    const isW = (dx, dy) => { const n = T_(x + dx, y + dy); return n === '#' || n === 'H'; };
    const hedge = c === 'H';
    const top = hedge ? '#2f8a3a' : th.wallTop, side = hedge ? '#1d5e27' : th.wallSide, line = hedge ? '#0e2a12' : th.wallLine;
    wg.fillStyle = top; wg.fillRect(X, Y, 16, 16);
    if (hedge) {
      for (let k = 0; k < 9; k++) { wg.fillStyle = k % 2 ? '#47a84f' : '#246b2e'; wg.fillRect(X + 1 + Math.floor(hash(x * 5 + k, y) * 13), Y + 1 + Math.floor(hash(x, y * 5 + k) * 10), 2, 2); }
    } else {
      wg.fillStyle = 'rgba(255,255,255,0.18)'; if (!isW(0, -1)) wg.fillRect(X, Y + 1, 16, 1);
      wg.fillStyle = 'rgba(0,0,0,0.06)'; if ((x + y) % 2) wg.fillRect(X, Y, 16, 16);
    }
    if (!isW(0, 1)) { wg.fillStyle = side; wg.fillRect(X, Y + 11, 16, 5); wg.fillStyle = 'rgba(0,0,0,0.2)'; wg.fillRect(X, Y + 14, 16, 2); }
    wg.fillStyle = line;
    if (!isW(0, -1)) wg.fillRect(X, Y, 16, 1);
    if (!isW(-1, 0)) wg.fillRect(X, Y, 1, 16);
    if (!isW(1, 0)) wg.fillRect(X + 15, Y, 1, 16);
    if (!isW(0, 1)) wg.fillRect(X, Y + 15, 16, 1);
  }
  gfxLevelStatic(fg, wg);
}

// ---------------------------------------------------------------------
//  Kollision & Türen
// ---------------------------------------------------------------------
function blocksMoveTile(tx, ty) {
  const c = T_(tx, ty);
  if (isSolidC(c)) return 1;
  if (c === 'D') return G.doors[ty * G.w + tx].open ? 0 : 2;
  return 0;
}
function blocksSightTile(tx, ty) {
  const c = T_(tx, ty);
  if (isWallC(c) || c === 'L') return true;
  if (c === 'D') return !G.doors[ty * G.w + tx].open;
  return false;
}
function moveEntity(e, dx, dy) {
  const ox = e.x, oy = e.y;
  e.x += dx; resolve(e);
  e.y += dy; resolve(e);
  return Math.hypot(e.x - ox, e.y - oy);
}
function resolve(e) {
  const r = e.r;
  const x0 = Math.floor((e.x - r) / TS), x1 = Math.floor((e.x + r) / TS);
  const y0 = Math.floor((e.y - r) / TS), y1 = Math.floor((e.y + r) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    let b = blocksMoveTile(tx, ty);
    if (!b) continue;
    if (e.flying && b === 1) { const c = T_(tx, ty); if (!isWallC(c) && c !== 'G') continue; }
    const rx = tx * TS, ry = ty * TS;
    const cx = clamp(e.x, rx, rx + TS), cy = clamp(e.y, ry, ry + TS);
    const ddx = e.x - cx, ddy = e.y - cy, d2 = ddx * ddx + ddy * ddy;
    if (d2 >= r * r) continue;
    if (b === 2) { openDoor(tx, ty, e); continue; }
    if (d2 > 0) {
      const d = Math.sqrt(d2);
      e.x += ddx / d * (r - d); e.y += ddy / d * (r - d);
    } else {
      const l = e.x - rx, rr = rx + TS - e.x, t = e.y - ry, bb = ry + TS - e.y;
      const m = Math.min(l, rr, t, bb);
      if (m === l) e.x = rx - r; else if (m === rr) e.x = rx + TS + r; else if (m === t) e.y = ry - r; else e.y = ry + TS + r;
    }
  }
}
function openDoor(tx, ty, e) {
  const i = ty * G.w + tx, d = G.doors[i];
  if (!d || d.open) return;
  d.open = true;
  const cx = tx * TS + 8, cy = ty * TS + 8;
  d.side = d.horiz ? (e.y < cy ? 1 : -1) : (e.x < cx ? 1 : -1);
  if (e.isPlayer) {
    G.doorGrace = 0.6;
    let slammed = 0;
    for (const en of G.enemies) {
      if (en.state === 'dead' || en.state === 'down' || en.kind === 'B' || en.static) continue;
      if (dist(en.x, en.y, cx, cy) > 26) continue;
      const opp = d.horiz ? Math.sign(en.y - cy) === d.side : Math.sign(en.x - cx) === d.side;
      if (!opp) continue;
      const ang = Math.atan2(en.y - cy, en.x - cx);
      if (en.kind === 'K' || en.kind === 'Q' || (ENEMY_EXT[en.kind] && ENEMY_EXT[en.kind].doorKill)) killEnemy(en, 'door', ang);
      else if (en.kind === 'R') { say(en, 'HÄ?', 1); shake(3); }
      else if (hasMask(e, 'pferd')) { killEnemy(en, 'door', ang); floatText(en.x, en.y - 14, 'PFERDE-TÜR!', '#ffd84a'); }
      else { knockDown(en, ang, 2.8); floatText(en.x, en.y - 14, 'TÜR-KNALL!', '#ffd84a'); }
      slammed++;
    }
    if (slammed) { Sound.play('slam'); shake(5); } else Sound.play('door');
  } else Sound.play('door');
}
function unlockSecurity() {
  G.hacked = true;
  for (const i of G.locked) {
    G.tiles[i] = 'D'; G.solid[i] = 0;
    const d = G.doors[i];
    G.doors[i] = { open: true, side: 1, horiz: d ? d.horiz : true, wasSecurity: true };
    const x = i % G.w, y = (i / G.w) | 0;
    sparks(x * TS + 8, y * TS + 8, 14, '#39ff7a');
    floatText(x * TS + 8, y * TS - 6, 'TÜR ENTRIEGELT!', '#39ff7a');
  }
  Sound.play('clear');
}
function breakGlass(tx, ty) {
  const i = ty * G.w + tx;
  if (G.tiles[i] !== 'G') return;
  G.tiles[i] = G.under[i]; G.solid[i] = 0;
  drawFloorTile(G.fg, G.under[i], tx, ty);
  for (let k = 0; k < 16; k++) {
    G.parts.push({ x: tx * TS + rand(16), y: ty * TS + rand(16), vx: rand(-70, 70), vy: rand(-70, 70), life: rand(0.25, 0.7), col: pick(['#bfefff', '#e8fbff', '#8fd8ff']), s: 1, kind: 'shard', fric: 5 });
  }
  Sound.play('glass');
  makeNoise(tx * TS + 8, ty * TS + 8, 150);
}

// ---------------------------------------------------------------------
//  Sichtlinie & Pfadsuche
// ---------------------------------------------------------------------
function los(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 4);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (blocksSightTile(Math.floor((x0 + (x1 - x0) * t) / TS), Math.floor((y0 + (y1 - y0) * t) / TS))) return false;
  }
  return true;
}
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function findPath(sx, sy, tx, ty) {
  const w = G.w, h = G.h;
  const s = Math.floor(sy / TS) * w + Math.floor(sx / TS);
  let t = Math.floor(ty / TS) * w + Math.floor(tx / TS);
  let exact = true;
  if (t < 0 || t >= w * h || s < 0 || s >= w * h) return null;
  if (G.solid[t]) {
    exact = false;
    const x = t % w, y = (t / w) | 0; let found = -1;
    for (const [dx, dy] of DIRS8) { const n = (y + dy) * w + x + dx; if (n >= 0 && n < w * h && !G.solid[n]) { found = n; break; } }
    if (found < 0) return null;
    t = found;
  }
  if (s === t) return [{ x: tx, y: ty }];
  const prev = new Int32Array(w * h).fill(-1);
  prev[s] = s;
  const q = [s]; let ok = false;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    if (c === t) { ok = true; break; }
    const cx = c % w, cy = (c / w) | 0;
    for (const [dx, dy] of DIRS8) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (prev[n] !== -1 || G.solid[n]) continue;
      if (dx && dy) {
        if (G.solid[cy * w + nx] || G.solid[ny * w + cx]) continue;
        if (G.tiles[n] === 'D' || G.tiles[c] === 'D' || G.tiles[cy * w + nx] === 'D' || G.tiles[ny * w + cx] === 'D') continue;
      }
      prev[n] = c; q.push(n);
    }
  }
  if (!ok) return null;
  const path = [];
  let c = t;
  while (c !== s) { path.push({ x: (c % w) * TS + 8, y: ((c / w) | 0) * TS + 8 }); c = prev[c]; }
  path.reverse();
  if (exact && path.length) path[path.length - 1] = { x: tx, y: ty };
  return path;
}

// ---------------------------------------------------------------------
//  Effekte
// ---------------------------------------------------------------------
function shake(v) { if (save.opts && !save.opts.shake) return; G.shake = Math.max(G.shake, v); }
// Blut/Leichen werden in 256er-Stücke gemalt: nur das Stück, das sich ändert, muss neu zur Grafikkarte
const DCH = 256;
function decalChunk(i) {
  if (!G.dchunks[i]) { const [c, g] = mkCanvas(DCH, DCH); G.dchunks[i] = { c, g }; }
  return G.dchunks[i];
}
function withDecal(x, y, r, fn) {
  const x0 = Math.max(0, Math.floor((x - r) / DCH)), x1 = Math.min(G.dcw - 1, Math.floor((x + r) / DCH));
  const y0 = Math.max(0, Math.floor((y - r) / DCH)), y1 = Math.min(G.dch - 1, Math.floor((y + r) / DCH));
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const ch = decalChunk(cy * G.dcw + cx);
    ch.g.save(); ch.g.translate(-cx * DCH, -cy * DCH); fn(ch.g); ch.g.restore();
  }
}
function drawDecals(g, vx0, vy0, vx1, vy1) {
  const x0 = Math.max(0, Math.floor(vx0 / DCH)), x1 = Math.min(G.dcw - 1, Math.floor(vx1 / DCH));
  const y0 = Math.max(0, Math.floor(vy0 / DCH)), y1 = Math.min(G.dch - 1, Math.floor(vy1 / DCH));
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const ch = G.dchunks[cy * G.dcw + cx]; if (ch) g.drawImage(ch.c, cx * DCH, cy * DCH); }
}
function hitstop(t) { G.hitstop = Math.max(G.hitstop, t); }
function floatText(x, y, text, color = '#fff', small = false) { G.texts.push({ x, y, text, color, t: 0, max: small ? 1.5 : 1.1, small }); }
function say(e, text, t = 1.4) { e.sayText = text; e.sayT = t; }
function bloodBurst(x, y, ang, n, spd, cols = BLOOD) {
  if (save.opts && save.opts.fx === 1) n = Math.ceil(n * 0.4);
  for (let i = 0; i < n; i++) {
    const a = ang + rand(-0.8, 0.8), s = rand(0.2, 1) * spd;
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.15, 0.5), col: pick(cols), s: pick([1, 1, 2, 2, 3]), kind: 'blood', fric: 7 });
  }
}
function sparks(x, y, n = 5, col = '#ffe66d') {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), s = rand(30, 110);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.08, 0.22), col, s: 1, kind: 'spark', fric: 4 });
  }
}
function muzzleFlash(x, y) { G.parts.push({ x, y, vx: 0, vy: 0, life: 0.05, max: 0.05, col: '#fff7b0', s: 6, kind: 'flash' }); }
function casing(x, y, a) {
  const b = a + Math.PI / 2 + rand(-0.4, 0.4);
  G.parts.push({ x, y, vx: Math.cos(b) * rand(40, 80), vy: Math.sin(b) * rand(40, 80), life: 0.35, col: '#e0b030', s: 1, kind: 'casing', fric: 6 });
}
function stampCorpse(e, ang) {
  const big = e.kind === 'B' ? 2.2 : e.kind === 'R' ? 1.4 : 1;
  const pools = [];
  for (let k = 0; k < 10; k++) {
    const a = rand(TAU), r = rand(2, 8) * big;
    pools.push([e.x + Math.cos(a) * r + Math.cos(ang) * 4, e.y + Math.sin(a) * r + Math.sin(ang) * 4, randi(2, 5) * big, randi(2, 4) * big, pick(['#7a0012', '#8c0018', '#6a0010'])]);
  }
  withDecal(e.x, e.y, 34 * big, (g) => {
    if (!(e.kind === 'Y' || e.kind === 'Q' || e.kind === 'V' || (ENEMY_EXT[e.kind] && ENEMY_EXT[e.kind].machine))) for (const q of pools) pxEll(g, q[0], q[1], q[2], q[3], q[4]);
    drawCorpse(g, e, ang);
  });
}
function updateParticles(dt) {
  for (const p of G.parts) {
    p.life -= dt;
    const f = Math.exp(-(p.fric || 0) * dt);
    p.vx *= f; p.vy *= f;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life <= 0 && (p.kind === 'blood' || p.kind === 'casing' || p.kind === 'shard')) {
      const ci = Math.floor(p.y / DCH) * G.dcw + Math.floor(p.x / DCH);
      if (p.x >= 0 && p.y >= 0 && ci >= 0 && ci < G.dchunks.length) {
        const ch = decalChunk(ci), cx = ci % G.dcw, cy = (ci / G.dcw) | 0;
        ch.g.fillStyle = p.col; ch.g.fillRect(Math.round(p.x) - cx * DCH, Math.round(p.y) - cy * DCH, p.s, p.s);
      }
    }
  }
  G.parts = G.parts.filter((p) => p.life > 0);
  for (const t of G.texts) { t.t += dt; t.y -= dt * (t.small ? 10 : 18); }
  G.texts = G.texts.filter((t) => t.t < t.max);
}

// Boss-Arenen: ein paar Kisten als Deckung (immer gleich, damit online alle dieselbe Karte haben)
function addBossCover(li, fi, px, py) {
  const boss = G.enemies.find((e) => e.kind === 'B');
  const R = mulberry32(9100 + (typeof li === 'number' ? li * 37 : 5) + fi * 7);
  const open = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = T_(x + dx, y + dy); if (!FLOORS.includes(c) || 'r<>'.includes(c)) return false; } return true; };
  let placed = 0;
  for (let tries = 0; tries < 500 && placed < 6; tries++) {
    const x = 2 + Math.floor(R() * (G.w - 4)), y = 2 + Math.floor(R() * (G.h - 4)), horiz = R() < 0.5;
    const x2 = horiz ? x + 1 : x, y2 = horiz ? y : y + 1;
    if (!open(x, y) || !open(x2, y2)) continue;
    const cx = x * TS + 8, cy = y * TS + 8;
    if (dist(cx, cy, px, py) < 72 || (boss && dist(cx, cy, boss.x, boss.y) < 64)) continue;
    for (const [tx, ty] of [[x, y], [x2, y2]]) { const i = ty * G.w + tx; G.tiles[i] = 'C'; G.solid[i] = 1; }
    placed++;
  }
  // ein paar Waffen mehr im Boss-Raum (verteilt, nicht direkt beim Boss)
  const pool = ['shotgun', 'uzi', 'magnum', 'katana', 'rifle', 'bat', 'pistol', 'pan'].filter((id) => WEAPONS[id]);
  let guns = 0;
  for (let tries = 0; tries < 400 && guns < 4 && pool.length; tries++) {
    const x = 2 + Math.floor(R() * (G.w - 4)), y = 2 + Math.floor(R() * (G.h - 4));
    if (!open(x, y)) continue;
    const cx = x * TS + 8, cy = y * TS + 8;
    if (boss && dist(cx, cy, boss.x, boss.y) < 80) continue;
    if (G.pickups.some((k) => dist(k.x, k.y, cx, cy) < 40)) continue;
    G.pickups.push(makePickup(cx, cy, pool[Math.floor(R() * pool.length)]));
    guns++;
  }
}
