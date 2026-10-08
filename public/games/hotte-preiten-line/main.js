'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Zustände, Level-Ablauf, Hauptschleife
// =====================================================================
let T = 0, frameDt = 0;
let state = 'loading', stateT = 0;
let fade = 0, fadeDir = 0, fadeCb = null;
const GRADE_BONUS = { 'A+': 350, A: 250, B: 150, C: 90, D: 40 };

function setState(s) { state = s; stateT = 0; }
function goto(fn) { if (fadeDir === 1) return; fadeDir = 1; fadeCb = fn; }

// ---------------------------------------------------------------------
//  Level-Ablauf
// ---------------------------------------------------------------------
function newRun(li) {
  run = { li, fi: 0, score: 0, kills: 0, combo: 0, maxCombo: 0, lastKillT: -99, time: 0, deaths: 0, cash: 0,
    floorCash: 0, floorScore: 0, floorKills: 0, lives: 0, maxLives: 0, livesBy: {}, carry: [] };
}
function startLevel(li) {
  newRun(li);
  setState('card');
  Sound.playSong(levelById(li).song);
}
function beginFloor(fi) {
  run.fi = fi;
  run.floorCash = run.cash; run.floorScore = run.score; run.floorKills = run.kills;
  loadFloor(run.li, fi);
  applyCarry();
  setupFloorLives();
  setState('play');
}
// Leben pro Etage: 5, beim Boss 7 (+ Perk EXTRA-LEBEN, + Wurst-Salz-Booster)
// jeder Spieler hat seine eigenen Leben (im Koop)
function floorLives(p) { return (G.F.boss ? 7 : 5) + perkP(p, 'heartcap') + (hasBoost('heart') ? 2 : 0) + (hasMask(p, 'clown') ? 1 : 0); }
function setupFloorLives() { run.livesBy = {}; for (const p of G.players) { const n = floorLives(p); run.livesBy[p.idx] = n; p.lives = p.maxLives = n; } bossShield(); }
function syncLives() { for (const p of G.players) { if (run.livesBy[p.idx] == null) run.livesBy[p.idx] = floorLives(p); p.lives = run.livesBy[p.idx]; p.maxLives = Math.max(p.maxLives || 0, floorLives(p), p.lives); } }
const livesLeft = () => G.players.some((p) => (run.livesBy[p.idx] || 0) > 0);
// Boss-Etage: jeder bekommt 2 Schutzwesten
function bossShield() { if (!G.F.boss) return; for (const p of G.players) p.armor += 2; floatText(G.player.x, G.player.y + 26, 'BOSS-SCHUTZ: +2 WESTEN!', '#66ffff'); }
// Waffe auf die nächste Etage mitnehmen
function applyCarry() { for (const c of run.carry || []) { const p = G.players.find((q) => q.idx === c.idx); if (p) p.weapon = Object.assign({}, c.w); } }
// Herz verloren -> auf DERSELBEN Etage weitermachen (z.B. im Keller)
function respawnFloor() {
  run.cash = run.floorCash; run.score = run.floorScore; run.kills = run.floorKills;
  run.combo = 0; run.lastKillT = -99;
  loadFloor(run.li, run.fi);
  applyCarry(); bossShield(); syncLives();
  for (const p of G.players) if (p.lives <= 0) { p.alive = false; p.deadT = 99; p.reviveT = 0; }   // wer keine Leben mehr hat, schaut zu
  G.introT = 1.4;
  floatText(G.player.x, G.player.y - 24, G.player.alive ? 'NOCH ' + G.player.lives + ' LEBEN - WEITER GEHT\'S!' : 'DU SCHAUST ZU (KEINE LEBEN)', '#ff9ad5');
  setState('play');
}
// alle Leben einer Etage weg: das Level fängt von vorne an (kein Game Over)
function restartLevel() {
  save.stats.gameOvers++; persist();
  const cp = checkpointFloor(), mode = run.mode, modeData = run.modeData;
  newRun(run.li);
  if (mode) { run.mode = mode; run.modeData = modeData; }
  beginFloor(cp);
  G.introT = 2;
  floatText(G.player.x, G.player.y - 24, cp ? 'ALLE LEBEN WEG - ZURÜCK ZUM CHECKPOINT!' : 'ALLE LEBEN WEG - NOCHMAL VON VORNE!', '#ff9ad5');
}
// Neustart ab dem letzten Checkpoint (Etage mit checkpoint: true bis zur aktuellen, sonst Etage 1)
function checkpointFloor() {
  const L = levelById(run.li), fl = (L && L.floors) || [];
  let cp = 0;
  for (let i = 0; i <= (run.fi || 0) && i < fl.length; i++) if (fl[i].checkpoint) cp = i;
  return cp;
}
function gameOver() {
  save.stats.gameOvers++; clearBoosters(); persist();
  NET.lobbyMsg = 'GAME OVER: DER HOST HAT KEINE HERZEN MEHR.';
  goto(() => { enterHub(); cityMsg('GAME OVER! KEINE HERZEN MEHR. NEUE GIBT ES IM KIOSK!', 6); });
}
function exitFloor() {
  floorModsCall('exit');
  G.exiting = true;
  Sound.play('select');
  const RM = curRunMode();
  if (RM && RM.onExit && extCall(RM.onExit)) return;   // Spielmodus übernimmt (z.B. nächste Turm-Etage)
  if (G.arena) return;
  const li = G.li, fi = G.fi;
  run.carry = G.players.filter((p) => p.alive && p.weapon).map((p) => ({ idx: p.idx, w: Object.assign({}, p.weapon) }));
  goto(() => { if (fi + 1 < levelById(li).floors.length) beginFloor(fi + 1); else levelComplete(); });
}
function levelComplete() {
  if (typeof run.li !== 'number') { enterHub(); return; }   // Sonder-Level (EXTRA_LEVELS) ohne RUN_MODES.onExit: nichts speichern
  const L = levelById(run.li);
  const par = L.floors.length * 110;
  const timeBonus = Math.max(0, Math.round(par - run.time)) * 25;
  const total = run.score + timeBonus;
  const ratio = total / Math.max(1, run.kills * 700);
  const grade = ratio >= 1.8 ? 'A+' : ratio >= 1.4 ? 'A' : ratio >= 1.05 ? 'B' : ratio >= 0.75 ? 'C' : 'D';
  const bonus = Math.round(GRADE_BONUS[grade] * (1 + L.diff * 0.5) * (save.hard ? 1.5 : 1) + (run.cash + GRADE_BONUS[grade]) * aptBonus());
  const first = run.li >= save.unlocked;
  const cut = rhbCut(run.cash + bonus);
  endInfo = { li: run.li, score: total, kills: run.kills, maxCombo: run.maxCombo, time: run.time, deaths: run.deaths, grade, cash: run.cash, bonus, cut,
    record: total > (save.best[run.li] || 0), newCall: first && run.li + 1 < LEVELS.length, unlock: first ? levelUnlockText(run.li) : '' };
  if (endInfo.record) { save.best[run.li] = total; save.grades[run.li] = grade; }
  save.money += run.cash + bonus - cut;
  save.unlocked = Math.max(save.unlocked, run.li + 1);
  save.stats.levels = (save.stats.levels || 0) + 1; lilXP(50 + run.li * 6);
  clearBoosters();
  if (first) onLevelFirstClear(run.li);
  persist();
  if (NET.mode === 'host' && typeof netSendLevelEnd === 'function') netSendLevelEnd(endInfo);
  setState('levelend');
  Sound.muffle(false); Sound.playSong('win');
}
function finalVictory() { if (!G.victoryT) G.victoryT = 3.2; }
function finishGame() {
  const L = (G && G.L) || levelById(run.li), s1 = !L.season || L.season === 1;
  save.money += run.cash + 3000;
  if (typeof netPay === 'function') netPay(run.cash + 3000, 'FINALE GESCHAFFT');
  if (s1 && save.beaten && save.hard) save.hats.goldkrone = true;   // Belohnung für den Schwer-Modus (nur Staffel 1)
  if (s1) save.beaten = true; else if (L.season === 2) save.beaten2 = true;
  if (typeof run.li === 'number') save.unlocked = Math.max(save.unlocked, run.li + 1);
  save.best[run.li] = Math.max(save.best[run.li] || 0, run.score); save.grades[run.li] = save.grades[run.li] || 'A';
  clearBoosters();
  persist();
  goto(() => startDialog(L.ending || 'ending', () => { setState('victory'); Sound.muffle(false); Sound.playSong('win'); }));
}

// ---------------------------------------------------------------------
//  Spiel-Update
// ---------------------------------------------------------------------
function updatePlay(dt) {
  if (pressed.Escape && !fadeDir) { setState('pause'); return; }
  save.stats.time += dt;
  G.doorGrace -= dt;
  if (!G.players.some((q) => q.alive)) {
    const t = Math.min(...G.players.map((q) => q.deadT));
    if (t > 0.35 && pressed.KeyR && !fadeDir) {
      const RM = curRunMode();
      if (G.arena) arenaOver();
      else if (RM && RM.onAllDead && extCall(RM.onAllDead)) { /* Spielmodus hat übernommen */ }
      else if (livesLeft()) respawnFloor();
      else restartLevel();
      return;
    }
  }
  if (G.victoryT) { G.victoryT -= dt; if (G.victoryT <= 0 && !G.won) { G.won = true; finishGame(); } }
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  let sdt = dt;
  if (G.slowmo > 0) { G.slowmo -= dt; sdt = dt * 0.3; }
  let wdt = sdt;
  if (G.focusT > 0) { G.focusT -= dt; wdt = sdt * 0.35; }
  G.time += wdt; run.time += dt;
  G.introT -= dt; G.flash -= dt; G.clearT += dt;
  G.shake = Math.max(0, G.shake - dt * 30);
  updatePlayers(G.focusT > 0 ? sdt * 0.8 : sdt);
  if (state !== 'play') return;
  updateRevives(dt);
  for (const e of G.enemies) updateEnemy(e, wdt);
  updatePet(wdt);
  separate();
  updateWaves(wdt);
  updateBooms(wdt);
  updateBullets(wdt);
  updatePickups(wdt);
  updateCash(sdt);
  updateLanes(wdt);
  floorModsCall('update', wdt);
  updateParticles(wdt);
  if (G.arena) updateArena(wdt);
  const RM = curRunMode();
  if (RM && RM.update) extCall(RM.update, wdt);
  if (NET.mode === 'host' && typeof netHostTick === 'function') netHostTick(dt);
  updateCamera(dt);
}
function updateCamera(dt) {
  const c = G.cam, alive = G.players.filter((q) => q.alive);
  // online hat jeder seine eigene Sicht (eigene Figur, sonst ein lebender Mitspieler); lokal am selben PC: gemeinsam
  const own = NET.mode !== 'off' && NET.connected && !COOP.on;
  const focus = own ? (G.player && G.player.alive ? [G.player] : alive.length ? [alive[0]] : [G.player]) : alive.length ? alive : [G.player];
  let fx = focus.reduce((a, q) => a + q.x, 0) / focus.length, fy = focus.reduce((a, q) => a + q.y, 0) / focus.length;
  let zt = 1;
  if (focus.length > 1) {
    const xs = focus.map((q) => q.x), ys = focus.map((q) => q.y), d = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    zt = clamp(1 - (d - 150) / 600, 0.62, 1);
  } else if (focus[0] === G.player) {
    const look = (keys.ShiftLeft || keys.ShiftRight) ? 0.75 : 0.28;
    fx += (mouse.x - W / 2) * look; fy += (mouse.y - H / 2) * look;
  }
  const k = 1 - Math.exp(-dt * 7);
  c.x += (fx - c.x) * k; c.y += (fy - c.y) * k;
  c.z += (zt - c.z) * (1 - Math.exp(-dt * 3));
  c.rot = Math.sin(T * 0.7) * 0.025 + Math.sin(T * 0.31) * 0.015 + (run.combo > 2 && run.time - run.lastKillT < 3.2 ? Math.sin(T * 3) * 0.02 : 0);
}

// ---------------------------------------------------------------------
//  Render + Schleife
// ---------------------------------------------------------------------
function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  switch (state) {
    case 'loading': ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); txt('LADE...', W / 2, H / 2, { align: 'center' }); break;
    case 'boot': case 'title': screenTitle(); break;
    case 'controls': screenControls(); break;
    case 'slots': screenSlots(); break;
    case 'city': renderCity(dt); break;
    case 'shop': screenShop(dt); break;
    case 'casino': screenCasino(dt); break;
    case 'biz': screenBiz(); break;
    case 'autohaus': screenAutohaus(); break;
    case 'guide': screenGuide(); break;
    case 'dialog': screenDialog(dt); break;
    case 'card': screenCard(); break;
    case 'play':
      renderWorld(); drawHUD();
      if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, G.flash * 3)})`; ctx.fillRect(0, 0, W, H); }
      break;
    case 'wireshark': screenWireshark(dt); break;
    case 'pause': screenPause(); break;
    case 'levelend': screenLevelEnd(); break;
    case 'victory': screenVictory(); break;
    case 'netplay': netClientRender(); break;
    case 'netcard': netCardScreen(); break;
    case 'fish': screenFish(dt); break;
    case 'darts': screenDarts(dt); break;
    case 'kart': screenKart(dt); break;
    default: if (SCREENS[state]) extCall(SCREENS[state], dt);   // eigene Bildschirme (menus.js SCREENS)
  }
  if (!save.opts || save.opts.scan) ctx.drawImage(SPR.post, 0, 0);
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  drawCrosshair();
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now; T += dt; frameDt = dt;
  try {
    stateT += dt;
    if (save.biz && NET.mode !== 'client' && !['loading', 'boot', 'title', 'slots', 'controls'].includes(state)) save.biz.clock = (save.biz.clock || 0) + dt;
    if (pressed.KeyM && state !== 'wireshark') Sound.toggleMute();
    if (fadeDir === 1) {
      fade += dt * 3.5;
      if (fade >= 1) { fade = 1; fadeDir = -1; const cb = fadeCb; fadeCb = null; if (cb) cb(); }
    } else if (fadeDir === -1) {
      fade -= dt * 3.5;
      if (fade <= 0) { fade = 0; fadeDir = 0; }
    }
    if (state === 'play') updatePlay(dt);
    else if (state === 'city') updateCity(dt);
    else if (state === 'netplay') netClientUpdate(dt);
    if (NET.mode !== 'off') { netSyncTick(dt); if (NET.mode === 'host') netFrame(dt); }
    render(dt);
  } catch (err) { console.error(err); }
  clearInput();
  requestAnimationFrame(frame);
}

(async function boot() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  try {
    await Promise.race([
      Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('8px Silkscreen')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) { /* Schrift fehlt -> monospace */ }
  clearTextCache();
  await loadAssets();
  runSaveMigrations(saveRaw);   // Spielstand-Umbauten aus späteren Dateien (beim ersten Laden gab es sie noch nicht)
  buildWeaponSprites();
  setState('boot');
  requestAnimationFrame(frame);
})();

// Speichern, wenn das Fenster zugeht
addEventListener('beforeunload', () => { if (state === 'city' && C) citySave(); else if (save.exists) persist(); });

// kleine Testhilfe für die Konsole
window.__lil = {
  get G() { return G; }, get run() { return run; },
  clear() { for (const e of G.enemies) if (e.state !== 'dead' && e.kind !== 'B') killEnemy(e, 'shot', 0); },
  level(li, fi = 0) { newRun(li); beginFloor(fi); },
  money(v) { save.money += v; persist(); },
};
