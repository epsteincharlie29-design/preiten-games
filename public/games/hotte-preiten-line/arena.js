'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - WELLEN-ARENA (zum Geld-Grinden)
//  Welle um Welle Gegner. Zwischen den Wellen: [E] auszahlen und gehen.
//  Stirbst du, bekommst du nur die Hälfte. Herzen werden hier nicht verbraucht.
// =====================================================================
const ARENA_LEVEL = {
  name: 'WELLEN-ARENA', chapter: 'GRIND-MODUS', date: 'JEDEN TAG - 24/7', song: 'arena', diff: 1, theme: 'arena', arena: true,
  floors: [{ name: 'DIE ARENA', map: [
    '############################################',
    '#==========================================#',
    '#==CC================CC================CC==#',
    '#==CC================CC================CC==#',
    '#==========================================#',
    '#======TT======##==========##======TT======#',
    '#======TT======##==========##======TT======#',
    '#==========================================#',
    '#===CC==============P===============CC=====#',
    '#==========================================#',
    '#======TT======##==========##======TT======#',
    '#======TT======##==========##======TT======#',
    '#==========================================#',
    '#==CC================CC================CC==#',
    '#==CC================CC================CC==#',
    '#==========================================#',
    '############################################',
  ] }],
};
THEMES.arena = { wallTop: '#3a1a1a', wallSide: '#1a0808', wallLine: '#ff3b3b', '=': ['#4a2a1a', '#542f1d'] };
const ARENA_SPAWNS = [[2, 1], [41, 1], [2, 15], [41, 15], [21, 1], [21, 15], [1, 8], [42, 8]];
// Überfall der ZITRONIA AG: deine Saftfabrik verteidigen (3 Wellen)
const RAID_LEVEL = {
  name: 'ÜBERFALL', chapter: 'ZITRONIA GREIFT AN', date: 'JETZT!', song: 'arena', diff: 3, theme: 'raid', arena: true,
  floors: [{ name: 'DEINE SAFTFABRIK', map: [
    '##################################',
    '#::::::::::::::::::::::::::::::::#',
    '#::TT::TT::TT::::::CC:::::CC:::::#',
    '#::TT::TT::TT::::::CC:::::CC:::::#',
    '#::::::::::::::::::::::::::::::::#',
    '#::::::CC::::::::::P::::::::::CC:#',
    '#::::::::::::::::::::::::::::::::#',
    '#::TT::TT::TT:::::::::CC::CC:::::#',
    '#::TT::TT::TT:::::::::CC::CC:::::#',
    '#::::::::::::::::::::::::::::::::#',
    '#:::::CC:::::::::::::::::CC::::::#',
    '#::::::::::::::::::::::::::::::::#',
    '##################################',
  ] }],
};
THEMES.raid = { wallTop: '#c86a00', wallSide: '#6a3a00', wallLine: '#ffb52a', ':': ['#e8dcc0', '#d8ccb0'] };
const RAID_SPAWNS = [[1, 1], [32, 1], [1, 11], [32, 11], [16, 1], [16, 11]];
EXTRA_LEVELS.arena = ARENA_LEVEL; EXTRA_LEVELS.raid = RAID_LEVEL;   // Level per Text-Id (levelById)
function startRaid() {
  newRun('raid'); run.arena = true;
  loadFloor('raid', 0);
  G.arena = { wave: 0, state: 'break', t: 3, earned: 0, raid: true, max: 3 };
  setState('play');
}

function startArena() {
  newRun('arena');
  run.arena = true;
  loadFloor('arena', 0);
  G.arena = { wave: 0, state: 'break', t: 4, earned: 0 };
  setState('play');
}
function arenaDiff(w) { return Math.min(10, 1 + w * 0.55); }
function arenaSpawnWave() {
  const A = G.arena;
  A.wave++;
  G.diff = A.raid ? 3 + Math.min(6, save.unlocked * 0.45) + A.wave * 0.5 : arenaDiff(A.wave);
  const n = A.raid ? 3 + A.wave * 3 : Math.min(26, 3 + A.wave * 2);
  const pool = ['E', 'M', 'E', 'M'];
  if (A.wave >= 3) pool.push('S', 'K');
  if (A.wave >= 5) pool.push('U', 'R');
  if (A.wave >= 7) pool.push('N', 'Q', 'R');
  if (A.wave >= 9) pool.push('U', 'S', 'Q');
  for (let k = 0; k < n; k++) {
    const [sx, sy] = pick(A.raid ? RAID_SPAWNS : ARENA_SPAWNS);
    const e = makeEnemy(A.raid ? pick(['E', 'M', 'M', 'R', 'J', 'S']) : pick(pool), sx * TS + 8 + rand(-4, 4), sy * TS + 8 + rand(-4, 4));
    if (A.raid) { e.suit = '#e8d040'; e.shirt = '#2a8a3a'; }
    e.state = 'search'; e.alerted = true; e.spot = 1;
    const tp = nearestPlayer(e.x, e.y) || G.player;
    e.lastSeen = { x: tp.x, y: tp.y };
    G.enemies.push(e);
    sparks(e.x, e.y, 8, '#ff3b3b');
  }
  G.cleared = false;
  A.state = 'fight';
  floatText(G.player.x, G.player.y - 30, (A.raid ? 'ZITRONIA-WELLE ' + A.wave + '/' + A.max : 'WELLE ' + A.wave) + '!', 'rainbow');
  Sound.play('alert'); Sound.play('boss');
}
function updateArena(dt) {
  const A = G.arena;
  if (A.state === 'fight') {
    if (G.enemies.every((e) => e.state === 'dead')) {
      if (A.raid && A.wave >= A.max) { raidVictory(); return; }
      const reward = A.raid ? 50 : 30 + A.wave * 25; lilXP(6);
      run.cash += reward; A.earned += reward;
      A.state = 'break'; A.t = 7;
      floatText(G.player.x, G.player.y - 30, 'WELLE ' + A.wave + ' GESCHAFFT! +' + reward + '€', '#7dff7a');
      Sound.play('clear');
      // Waffen nachliefern
      for (let k = 0; k < 2 + Math.floor(A.wave / 3); k++) {
        const id = pick(A.wave < 4 ? ['pistol', 'bat', 'shotgun', 'osaft'] : ['shotgun', 'uzi', 'rifle', 'magnum', 'crossbow', 'osaft', 'katana', 'flamer', 'minigun', 'boomerang', 'taser', 'harpoon', 'scythe', 'juicegun', 'rocket']);
        spawnPickup(rand(5, 38) * TS, rand(3, 13) * TS, id, null, rand(TAU), 0);
      }
      G.enemies = G.enemies.filter((e) => e.state !== 'dead');
    }
  } else {
    A.t -= dt;
    if (pressed.KeyE && A.wave > 0 && !A.raid) { arenaCashOut(false); return; }
    if (A.t <= 0) arenaSpawnWave();
  }
}
function arenaCashOut(died) {
  const A = G.arena;
  if (A.raid) { G.exiting = true; goto(() => { enterHub(); raidLost('VERLOREN! '); }); return; }
  const pay = died ? Math.floor(run.cash / 2) : run.cash;
  save.money += pay;
  if (typeof netPay === 'function') { netPay(pay, 'ARENA'); NET.lobbyMsg = 'ARENA VORBEI! DU HAST ' + pay + '€ BEKOMMEN.'; }
  save.arenaBest = Math.max(save.arenaBest || 0, A.wave - (died ? 1 : 0));
  persist();
  G.exiting = true;
  goto(() => { enterHub(); cityMsg((died ? 'ARENA VORBEI! TROSTGELD: ' : 'ARENA AUSGEZAHLT: ') + pay + '€  (BESTE WELLE: ' + save.arenaBest + ')', 6); });
}
function arenaOver() { arenaCashOut(true); }
function drawArenaHud() {
  const A = G.arena;
  if (!A) return;
  txt(A.raid ? 'ÜBERFALL!  WELLE ' + A.wave + '/' + A.max : 'WELLE ' + A.wave + '   BESTE: ' + (save.arenaBest || 0), W / 2, 8, { align: 'center', color: A.raid ? '#ffe14d' : '#ff9ad5' });
  if (A.state === 'break' && G.players.some((p) => p.alive)) {
    txt(A.raid ? 'VERTEIDIGE DEINE SAFTFABRIK! NÄCHSTE WELLE IN ' + Math.ceil(A.t) + 'S' : A.wave ? 'NÄCHSTE WELLE IN ' + Math.ceil(A.t) + 'S   -   [E] AUSZAHLEN (' + run.cash + '€) UND GEHEN' : 'GLEICH GEHT ES LOS... ' + Math.ceil(A.t), W / 2, 22, { font: FS, align: 'center', color: '#7dff7a' });
  }
}
function drawArenaOver() {
  ctx.fillStyle = 'rgba(30,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
  txt('ARENA VORBEI', W / 2, 60, { size: 24, align: 'center', color: (i) => neon(i), wave: 3, shadow: '#000' });
  txt('DU HAST ' + Math.max(0, G.arena.wave - 1) + ' WELLEN GESCHAFFT', W / 2, 104, { align: 'center', color: '#ffffff' });
  txt('TROSTGELD (DIE HÄLFTE): ' + Math.floor(run.cash / 2) + '€', W / 2, 124, { align: 'center', color: '#7dff7a' });
  if (Math.floor(T * 2.5) % 2 === 0) txt('[R] ZURÜCK IN DIE STADT', W / 2, 170, { align: 'center', color: (i) => neon(i), wave: 2 });
}
function raidVictory() {
  const cash = run.cash, reward = raidWon(cash);
  G.exiting = true; Sound.play('win');
  goto(() => { enterHub(); cityMsg('ÜBERFALL ABGEWEHRT! BELOHNUNG: ' + (cash + reward) + '€. DIE ZITRONIA AG IST SAUER.', 5); });
}
