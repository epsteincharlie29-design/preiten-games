'use strict';
// =====================================================================
//  LIL PREITNER - Hacker Bois Casino: Spielautomat, Roulette, Höher/Tiefer
// =====================================================================
const BETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const CZ = { game: null, bet: 2, msg: '', msgT: 0, msgCol: '#fff',
  slots: { reels: [0, 0, 0], spin: false, t: 0, stopAt: [0, 0, 0], res: [0, 0, 0] },
  rou: { pick: 0, spin: false, t: 0, dur: 3, from: 0, to: 0, off: 0, res: -1 },
  hl: { active: false, pot: 0, card: 7, next: null, showT: 0, round: 0 } };

function openCasino() { CZ.game = null; setState('casino'); Sound.playSong('casino'); }
function czMsg(m, col = '#ffffff', t = 2.2) { CZ.msg = m; CZ.msgCol = col; CZ.msgT = t; }
function currentBet() { return BETS[CZ.bet]; }
function payIn(v) { save.money -= v; save.stats.casinoLost += v; persist(); }
function payOut(v) { save.money += v; save.stats.casinoWon += v; persist(); }

function button(label, x, y, w, h, enabled = true, col = '#ff3fa4') {
  const hov = mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + h;
  ctx.fillStyle = !enabled ? '#1a1a22' : hov ? '#3a1040' : '#1a0820'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = enabled ? col : '#444'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  txt(label, x + w / 2, y + h / 2 - 4, { align: 'center', color: enabled ? (hov ? '#ffe14d' : '#ffffff') : '#555555' });
  return enabled && hov && mouse.pl && uiActive();
}
function betSelector(y, locked) {
  while (CZ.bet > 0 && BETS[CZ.bet] > save.money) CZ.bet--;
  txt('EINSATZ', W / 2, y - 12, { font: FS, align: 'center', color: '#aaaaaa' });
  if (button('-', W / 2 - 90, y, 24, 16, !locked && CZ.bet > 0) || (!locked && uiActive() && (pressed.ArrowLeft || pressed.KeyA) && CZ.bet > 0)) { CZ.bet--; Sound.play('blip', true); }
  if (button('+', W / 2 + 66, y, 24, 16, !locked && CZ.bet < BETS.length - 1 && BETS[CZ.bet + 1] <= save.money) || (!locked && uiActive() && (pressed.ArrowRight || pressed.KeyD) && CZ.bet < BETS.length - 1 && BETS[CZ.bet + 1] <= save.money)) { CZ.bet++; Sound.play('blip', true); }
  txt(currentBet() + '€', W / 2, y + 4, { align: 'center', color: '#ffe14d' });
}

function screenCasino(dt) {
  drawRoomBg();
  if (CZ.msgT > 0) CZ.msgT -= dt;
  if (!CZ.game) { enterHub(); return; }
  txt({ slots: 'SPIELAUTOMAT', roulette: 'ROULETTE', cards: 'HÖHER ODER TIEFER', blackjack: 'BLACKJACK', wheel: 'GLÜCKSRAD' }[CZ.game], W / 2, 6, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  moneyTag(W - 10, 28);
  if (CZ.game === 'slots') slotsGame(dt);
  else if (CZ.game === 'roulette') rouletteGame(dt);
  else if (CZ.game === 'blackjack') blackjackGame(dt);
  else if (CZ.game === 'wheel') wheelGame(dt);
  else cardsGame(dt);
  if (CZ.msgT > 0) txt(CZ.msg, W / 2 + 30, 246, { align: 'center', color: CZ.msgCol, wave: 2 });
  const busy = CZ.slots.spin || CZ.rou.spin || CZ.hl.active || WH.spin || (BJ.phase !== 'bet' && BJ.phase !== 'result');
  if (button('ZURÜCK', 8, H - 22, 70, 16, !busy) || (uiActive() && pressed.Escape && !busy)) { CZ.game = null; BJ.phase = 'bet'; BJ.player = []; BJ.dealer = []; Sound.play('select'); enterHub(); }
  if (save.money < BETS[0] && !busy) txt('PLEITE! SPIEL LEVEL, UM GELD ZU VERDIENEN.', W / 2, 30, { font: FS, align: 'center', color: '#ff6a6a' });
}
function casinoLobby() {
  txt('RUSSIAN HACKER BOIS CASINO', W / 2, 8, { size: 16, align: 'center', color: (i) => neon(i), wave: 2, shadow: '#000' });
  moneyTag(W / 2, 30, 'center');
  ctx.drawImage(Math.floor(T * 2) % 5 === 0 ? SPR.hbO : SPR.hbC, 10, 100, 102, 154);
  txt('"DAS HAUS GEWINNT IMMER. ICH BIN DAS HAUS."', W / 2, 44, { font: FS, align: 'center', color: '#39ff7a' });
  if (perk('lucky')) txt('GLÜCKSPILZ AKTIV: BESSERE CHANCEN!', W / 2, 56, { font: FS, align: 'center', color: '#ffe14d' });
  listMenu('casino', [
    { label: 'SPIELAUTOMAT  (LIL = 75X!)', act: () => { CZ.game = 'slots'; } },
    { label: 'ROULETTE  (GRÜN = 14X)', act: () => { CZ.game = 'roulette'; } },
    { label: 'HÖHER ODER TIEFER', act: () => { CZ.game = 'cards'; } },
    { label: 'ZURÜCK ZUM UNTERSCHLUPF', act: () => enterHub() },
  ], W / 2 + 40, 90, 24, { w: 150 });
  if (save.money < BETS[0]) txt('DU BIST PLEITE. GEH LEVEL SPIELEN!', W / 2 + 40, 200, { font: FS, align: 'center', color: '#ff6a6a' });
  if (uiActive() && pressed.Escape) enterHub();
}

// ---------- Spielautomat ----------
const SYMS = ['KIRSCHE', 'ZITRONE', 'DÖNER', 'GLOCKE', 'SIEBEN', 'LIL'];
const PAY3 = [5, 5, 10, 15, 30, 75];
function rollSym() {
  const w = perk('lucky') ? [5, 5, 4, 3, 2.6, 1.6] : [6, 6, 4, 3, 2, 1];
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return 0;
}
function drawSym(id, cx, cy) {
  switch (id) {
    case 0: pxEll(ctx, cx - 5, cy + 3, 5, 5, '#e01b3c'); pxEll(ctx, cx + 5, cy + 4, 5, 5, '#c41030'); ctx.fillStyle = '#3a9a3a'; ctx.fillRect(cx - 4, cy - 9, 2, 8); ctx.fillRect(cx + 1, cy - 10, 2, 9); ctx.fillRect(cx - 3, cy - 11, 6, 2); ctx.fillStyle = '#fff'; ctx.fillRect(cx - 7, cy + 1, 2, 2); break;
    case 1: pxEll(ctx, cx, cy, 11, 7, '#ffe14d'); pxEll(ctx, cx - 2, cy - 2, 6, 3, '#fff27a'); ctx.fillStyle = '#c8a800'; ctx.fillRect(cx + 10, cy - 1, 3, 2); break;
    case 2: ctx.fillStyle = '#c98b45'; ctx.beginPath(); ctx.moveTo(cx - 10, cy - 8); ctx.lineTo(cx + 10, cy - 8); ctx.lineTo(cx, cy + 12); ctx.fill(); ctx.fillStyle = '#5ac83a'; ctx.fillRect(cx - 8, cy - 10, 16, 3); ctx.fillStyle = '#e01b3c'; ctx.fillRect(cx - 5, cy - 11, 3, 2); ctx.fillRect(cx + 2, cy - 11, 3, 2); ctx.fillStyle = '#8a4a1a'; ctx.fillRect(cx - 6, cy - 6, 12, 2); break;
    case 3: ctx.fillStyle = '#ffc61a'; ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.quadraticCurveTo(cx + 11, cy - 8, cx + 11, cy + 7); ctx.lineTo(cx - 11, cy + 7); ctx.quadraticCurveTo(cx - 11, cy - 8, cx, cy - 12); ctx.fill(); ctx.fillStyle = '#b8860b'; ctx.fillRect(cx - 12, cy + 6, 24, 3); pxEll(ctx, cx, cy + 10, 3, 2, '#b8860b'); break;
    case 4: txt('7', cx, cy - 12, { size: 24, align: 'center', color: '#ff2a3a', outline: '#600010' }); break;
    case 5: ctx.drawImage(SPR.miniO, cx - 13, cy - 19); break;
  }
}
function slotsGame(dt) {
  const S = CZ.slots;
  // Automat
  ctx.fillStyle = '#5a0a2a'; ctx.fillRect(110, 40, 260, 140); ctx.fillStyle = '#ffd23f'; ctx.fillRect(114, 44, 252, 132);
  ctx.fillStyle = '#1a0010'; ctx.fillRect(120, 50, 240, 120);
  for (let r = 0; r < 3; r++) {
    const x = 128 + r * 78;
    ctx.fillStyle = '#f4f0e8'; ctx.fillRect(x, 56, 70, 108);
    const spinning = S.spin && S.t < S.stopAt[r];
    for (let k = -1; k <= 1; k++) {
      const off = spinning ? ((S.t * 900) % 36) : 0;
      const sym = spinning ? Math.floor(hash(r * 7 + k, Math.floor(S.t * 25)) * 6) : k === 0 ? S.res[r] : Math.floor(hash(r * 3 + k + 5, S.res[r]) * 6);
      const cy = 110 + k * 36 + off - (spinning ? 18 : 0);
      if (cy < 60 || cy > 160) continue;
      drawSym(sym, x + 35, cy);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, 56, 70, 14); ctx.fillRect(x, 150, 70, 14);
  }
  ctx.fillStyle = 'rgba(255,40,80,0.7)'; ctx.fillRect(120, 109, 240, 2);
  txt('3X LIL = 75X   3X 7 = 30X   3X GLOCKE = 15X   3X DÖNER = 10X', W / 2, 183, { font: FS, align: 'center', color: '#ffe14d' });
  txt('3X OBST = 5X   2X KIRSCHE = 2X   1X KIRSCHE = HALBES GELD ZURÜCK', W / 2, 192, { font: FS, align: 'center', color: '#cccccc' });
  betSelector(218, S.spin);
  if (S.spin) {
    const prev = S.t; S.t += dt;
    if (Math.floor(S.t * 20) !== Math.floor(prev * 20)) Sound.play('spin');
    for (let r = 0; r < 3; r++) if (prev < S.stopAt[r] && S.t >= S.stopAt[r]) Sound.play('door');
    if (S.t >= S.stopAt[2] + 0.2) {
      S.spin = false;
      const [a, b, c] = S.res, bet = S.bet;
      let win = 0;
      if (a === b && b === c) win = bet * PAY3[a];
      else { const ch = S.res.filter((s) => s === 0).length; if (ch === 2) win = bet * 2; else if (ch === 1) win = Math.floor(bet / 2); }
      if (win > 0) { payOut(win); Sound.play(win >= bet * 10 ? 'heart' : 'win'); czMsg((win >= bet * 10 ? 'JACKPOT!!! ' : 'GEWONNEN: ') + win + '€', '#7dff7a'); if (win >= bet * 10) Sound.play('cash'); }
      else { Sound.play('lose'); czMsg('NIX. RUSSIAN HACKER BOI LACHT.', '#ff6a6a', 1.5); }
    }
  } else if (button('DREHEN!', W / 2 + 100, 217, 90, 18, save.money >= currentBet()) || (uiActive() && (pressed.Space || pressed.Enter) && save.money >= currentBet())) {
    S.bet = currentBet(); payIn(S.bet);
    S.res = [rollSym(), rollSym(), rollSym()];
    S.spin = true; S.t = 0; S.stopAt = [0.8, 1.25, 1.7];
    Sound.play('select');
  }
}

// ---------- Roulette ----------
const ROU_N = 15;
const rouCol = (i) => (i === 0 ? 'G' : i % 2 ? 'R' : 'S');
function rouletteGame(dt) {
  const R = CZ.rou, CW = 26;
  const cur = R.spin ? lerp(R.from, R.to, 1 - Math.pow(1 - clamp(R.t / R.dur, 0, 1), 3)) : R.off;
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(0, 60, W, 52);
  ctx.save(); ctx.beginPath(); ctx.rect(20, 64, W - 40, 44); ctx.clip();
  const first = Math.floor(cur - (W / 2) / CW) - 1;
  for (let k = first; k < first + W / CW + 3; k++) {
    const idx = ((k % ROU_N) + ROU_N) % ROU_N, x = W / 2 + (k - cur) * CW - CW / 2;
    ctx.fillStyle = { G: '#1a9a3a', R: '#c41f2a', S: '#16161c' }[rouCol(idx)];
    ctx.fillRect(Math.round(x) + 1, 66, CW - 2, 40);
    txt(String(idx), Math.round(x) + CW / 2, 80, { align: 'center', color: '#ffffff' });
  }
  ctx.restore();
  ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.moveTo(W / 2 - 6, 56); ctx.lineTo(W / 2 + 6, 56); ctx.lineTo(W / 2, 68); ctx.fill();
  ctx.fillRect(W / 2, 64, 1, 46);
  const opts = [['ROT  2X', 'R', '#c41f2a'], ['SCHWARZ  2X', 'S', '#888888'], ['GRÜN  14X', 'G', '#1a9a3a']];
  opts.forEach((o, i) => {
    const x = 60 + i * 125;
    if (button((R.pick === i ? '> ' : '') + o[0], x, 124, 115, 20, !R.spin, o[2])) { R.pick = i; Sound.play('blip', true); }
  });
  if (!R.spin && uiActive()) { if (pressed.Digit1) R.pick = 0; if (pressed.Digit2) R.pick = 1; if (pressed.Digit3) R.pick = 2; }
  if (perk('lucky')) txt('GLÜCKSPILZ: BEI GRÜN GIBT ES ROT/SCHWARZ-EINSÄTZE ZURÜCK', W / 2, 150, { font: FS, align: 'center', color: '#ffe14d' });
  betSelector(176, R.spin);
  if (R.spin) {
    const prev = R.t; R.t += dt;
    const p0 = lerp(R.from, R.to, 1 - Math.pow(1 - clamp(prev / R.dur, 0, 1), 3));
    if (Math.floor(cur) !== Math.floor(p0)) Sound.play('spin');
    if (R.t >= R.dur) {
      R.spin = false; R.off = R.to;
      const col = rouCol(R.res), want = opts[R.pick][1];
      let win = 0;
      if (col === want) win = R.bet * (want === 'G' ? 14 : 2);
      else if (col === 'G' && perk('lucky')) win = R.bet;
      if (win > 0) { payOut(win); Sound.play(want === 'G' && col === 'G' ? 'heart' : 'win'); czMsg((col === want ? 'GEWONNEN: ' : 'GLÜCK GEHABT: ') + win + '€', '#7dff7a'); }
      else { Sound.play('lose'); czMsg(R.res + ' ' + { G: 'GRÜN', R: 'ROT', S: 'SCHWARZ' }[col] + '. VERLOREN.', '#ff6a6a', 1.6); }
    }
  } else if (button('DREHEN!', W / 2 + 100, 175, 90, 18, save.money >= currentBet()) || (uiActive() && (pressed.Space || pressed.Enter) && save.money >= currentBet())) {
    R.bet = currentBet(); payIn(R.bet);
    R.res = randi(0, ROU_N - 1);
    const base = Math.ceil(R.off / ROU_N) * ROU_N + ROU_N * 4;
    R.from = R.off; R.to = base + R.res + rand(-0.35, 0.35); R.t = 0; R.dur = 3.2; R.spin = true;
    Sound.play('select');
  }
}

// ---------- Höher oder Tiefer ----------
const CARD_NAMES = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K'];
function hlOdds(card, higher) {
  const lucky = perk('lucky');
  const n = higher ? 13 - card + (lucky ? 1 : 0) : card - 1 + (lucky ? 1 : 0);
  const p = n / 13;
  return { p, mult: p > 0 ? Math.max(1.05, (lucky ? 1.0 : 0.95) / p) : 0 };
}
function drawCard(x, y, v, hidden) {
  ctx.fillStyle = '#000'; ctx.fillRect(x + 2, y + 2, 50, 70);
  ctx.fillStyle = hidden ? '#5a0a5a' : '#f4f4f4'; ctx.fillRect(x, y, 50, 70);
  ctx.strokeStyle = hidden ? '#ff3fa4' : '#999'; ctx.strokeRect(x + 0.5, y + 0.5, 49, 69);
  if (hidden) { txt('?', x + 25, y + 27, { size: 16, align: 'center', color: '#ff3fa4' }); return; }
  const red = v % 2 === 0;
  txt(CARD_NAMES[v], x + 25, y + 24, { size: 16, align: 'center', color: red ? '#c41f2a' : '#111111', outline: '' });
  txt(CARD_NAMES[v], x + 4, y + 4, { font: FS, color: red ? '#c41f2a' : '#111111', outline: '' });
}
function cardsGame(dt) {
  const C = CZ.hl;
  drawCard(150, 50, C.card, false);
  drawCard(280, 50, C.next || 1, !C.next);
  txt('AKTUELL', 175, 124, { font: FS, align: 'center', color: '#aaaaaa' });
  txt('NÄCHSTE', 305, 124, { font: FS, align: 'center', color: '#aaaaaa' });
  if (C.showT > 0) {
    C.showT -= dt;
    if (C.showT <= 0) { if (C.next) { C.card = C.next; C.next = null; } if (!C.active) C.card = randi(1, 13); }
  }
  if (!C.active) {
    txt('RATE OB DIE NÄCHSTE KARTE HÖHER ODER TIEFER IST.', W / 2, 140, { font: FS, align: 'center', color: '#ffffff' });
    txt('JEDER TREFFER MULTIPLIZIERT DEINEN TOPF. GLEICH = VERLOREN.', W / 2, 150, { font: FS, align: 'center', color: '#cccccc' });
    betSelector(178, false);
    if (C.showT <= 0 && (button('SPIELEN!', W / 2 + 100, 177, 90, 18, save.money >= currentBet()) || (uiActive() && (pressed.Space || pressed.Enter) && save.money >= currentBet()))) {
      payIn(currentBet()); C.active = true; C.pot = currentBet(); C.round = 0; C.next = null; Sound.play('select');
    }
    return;
  }
  txt('TOPF: ' + C.pot + '€', W / 2, 136, { align: 'center', color: '#7dff7a', wave: 1 });
  txt('RUNDE ' + (C.round + 1) + '/8', W / 2, 150, { font: FS, align: 'center', color: '#aaaaaa' });
  if (C.showT > 0) return;
  const hi = hlOdds(C.card, true), lo = hlOdds(C.card, false);
  let choice = 0;
  if (button('HÖHER  x' + hi.mult.toFixed(2), 60, 170, 160, 20, hi.p > 0, '#3fd0ff') || (uiActive() && (pressed.KeyW || pressed.ArrowUp) && hi.p > 0)) choice = 1;
  if (button('TIEFER  x' + lo.mult.toFixed(2), 260, 170, 160, 20, lo.p > 0, '#3fd0ff') || (uiActive() && (pressed.KeyS || pressed.ArrowDown) && lo.p > 0)) choice = -1;
  if (button('AUSZAHLEN: ' + C.pot + '€', W / 2 - 90, 200, 180, 20, true, '#7dff7a') || (uiActive() && pressed.Enter)) {
    payOut(C.pot); Sound.play('cash'); czMsg('AUSGEZAHLT: ' + C.pot + '€', '#7dff7a'); C.active = false; C.showT = 0.01; return;
  }
  if (choice) {
    const nv = randi(1, 13), lucky = perk('lucky');
    const win = choice > 0 ? (nv > C.card || (lucky && nv === C.card)) : (nv < C.card || (lucky && nv === C.card));
    C.next = nv; C.showT = 0.9;
    if (win) {
      C.pot = Math.round(C.pot * (choice > 0 ? hi.mult : lo.mult)); C.round++;
      Sound.play('win'); czMsg('RICHTIG! TOPF: ' + C.pot + '€', '#7dff7a', 1.2);
      if (C.round >= 8) { payOut(C.pot); czMsg('8 RICHTIGE! AUSGEZAHLT: ' + C.pot + '€', '#ffe14d'); C.active = false; }
    } else { Sound.play('lose'); czMsg('FALSCH! TOPF WEG.', '#ff6a6a', 1.5); C.active = false; C.pot = 0; }
  }
}
