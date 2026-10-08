'use strict';
// =====================================================================
//  LIL PREITNER - Casino Teil 2: Blackjack und Glücksrad
// =====================================================================
function openCasinoGame(type) { CZ.game = type; setState('casino'); Sound.playSong('casino'); }

// ---------- Blackjack ----------
const BJ = { phase: 'bet', player: [], dealer: [], bet: 0, t: 0, doubled: false };
const bjCard = () => randi(1, 13);
function bjValue(hand) {
  let v = 0, aces = 0;
  for (const c of hand) { if (c === 1) { aces++; v += 11; } else v += Math.min(10, c); }
  while (v > 21 && aces) { v -= 10; aces--; }
  return v;
}
function bjEnd(result) {
  BJ.phase = 'result'; BJ.t = 0;
  const b = BJ.bet;
  if (result === 'bj') { const w = Math.round(b * (perk('lucky') ? 3 : 2.5)); payOut(w); czMsg('BLACKJACK!!! +' + w + '€', '#ffe14d'); Sound.play('heart'); Sound.play('cash'); }
  else if (result === 'win') { payOut(b * 2); czMsg('GEWONNEN! +' + b * 2 + '€', '#7dff7a'); Sound.play('win'); }
  else if (result === 'push') { payOut(b); czMsg('UNENTSCHIEDEN. EINSATZ ZURÜCK.', '#ffffff'); Sound.play('select'); }
  else { czMsg(result === 'bust' ? 'ÜBER 21! VERLOREN.' : 'DIE BANK GEWINNT. HAHA!', '#ff6a6a'); Sound.play('lose'); }
}
function bjDrawHand(hand, x, y, hideSecond) {
  hand.forEach((c, i) => {
    ctx.save(); ctx.translate(x + i * 40, y); ctx.scale(0.75, 0.75);
    drawCard(0, 0, c, hideSecond && i === 1);
    ctx.restore();
  });
}
function blackjackGame(dt) {
  // Tisch
  ctx.fillStyle = '#3a1a0a'; ctx.beginPath(); ctx.ellipse(W / 2, 120, 220, 92, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0f6a2a'; ctx.beginPath(); ctx.ellipse(W / 2, 120, 212, 85, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(W / 2, 120, 180, 66, 0, 0, TAU); ctx.stroke();
  txt('BANK ZIEHT BIS 16, STEHT AB 17  -  BLACKJACK ZAHLT ' + (perk('lucky') ? '3:1' : '3:2'), W / 2, 112, { font: FS, align: 'center', color: '#ffd23f', outline: '' });
  ctx.drawImage(Math.floor(T * 2) % 7 === 0 ? SPR.hbO : SPR.hbC, 14, 40, 51, 77);
  txt('DEALER:', 14, 120, { font: FS, color: '#39ff7a' }); txt('RUSSIAN', 14, 130, { font: FS, color: '#39ff7a' }); txt('HACKER BOI', 14, 140, { font: FS, color: '#39ff7a' });
  const hideD = BJ.phase === 'player';
  if (BJ.dealer.length) {
    bjDrawHand(BJ.dealer, W / 2 - 60, 46, hideD);
    txt('BANK: ' + (hideD ? '?' : bjValue(BJ.dealer)), W / 2 + 120, 60, { color: '#ffffff' });
  }
  if (BJ.player.length) {
    bjDrawHand(BJ.player, W / 2 - 60, 128, false);
    txt('DU: ' + bjValue(BJ.player), W / 2 + 120, 142, { color: '#66ffff' });
  }
  if (BJ.phase === 'bet') {
    betSelector(214, false);
    if (button('AUSTEILEN!', W / 2 + 100, 213, 100, 18, save.money >= currentBet()) || (uiActive() && (pressed.Space || pressed.Enter) && save.money >= currentBet())) {
      BJ.bet = currentBet(); payIn(BJ.bet); BJ.doubled = false;
      BJ.player = [bjCard(), bjCard()]; BJ.dealer = [bjCard(), bjCard()];
      Sound.play('swoosh');
      const pv = bjValue(BJ.player), dv = bjValue(BJ.dealer);
      if (pv === 21) { if (dv === 21) bjEnd('push'); else bjEnd('bj'); }
      else BJ.phase = 'player';
    }
  } else if (BJ.phase === 'player') {
    const hit = button('KARTE [1]', 90, 214, 90, 18) || (uiActive() && pressed.Digit1);
    const stand = button('HALTEN [2]', 195, 214, 90, 18) || (uiActive() && pressed.Digit2);
    const canDbl = BJ.player.length === 2 && save.money >= BJ.bet;
    const dbl = button('VERDOPPELN [3]', 300, 214, 110, 18, canDbl) || (uiActive() && pressed.Digit3 && canDbl);
    if (hit || dbl) {
      if (dbl) { payIn(BJ.bet); BJ.bet *= 2; BJ.doubled = true; }
      BJ.player.push(bjCard()); Sound.play('swoosh');
      if (bjValue(BJ.player) > 21) bjEnd('bust');
      else if (dbl || bjValue(BJ.player) === 21) { BJ.phase = 'dealer'; BJ.t = 0; }
    } else if (stand) { BJ.phase = 'dealer'; BJ.t = 0; }
  } else if (BJ.phase === 'dealer') {
    BJ.t += dt;
    if (BJ.t > 0.6) {
      BJ.t = 0;
      const dv = bjValue(BJ.dealer);
      if (dv < 17) { BJ.dealer.push(bjCard()); Sound.play('swoosh'); }
      else {
        const pv = bjValue(BJ.player);
        if (dv > 21 || pv > dv) bjEnd('win'); else if (pv === dv) bjEnd('push'); else bjEnd('lose');
      }
    }
  } else if (BJ.phase === 'result') {
    BJ.t += dt;
    if (BJ.t > 0.6 && (button('NEUE RUNDE', W / 2 + 100, 213, 100, 18) || (uiActive() && (pressed.Space || pressed.Enter)))) { BJ.phase = 'bet'; BJ.player = []; BJ.dealer = []; }
  }
}

// ---------- Glücksrad ----------
const WHEEL_SEGS = [0, 2, 0, 0.5, 1.5, 0, 0.5, 0, 3, 0, 0.5, 1.5, 0, 0.5, 0, 0, 0.5, 0, 0.5, 8];
const WHEEL_COL = { 0: '#2a2a36', 0.5: '#2a6ac4', 1.5: '#2a8a4a', 2: '#8e44ad', 3: '#d9622a', 8: '#ffd23f' };
const WH = { spin: false, ang: 0, from: 0, to: 0, t: 0, dur: 4.2, res: -1, bet: 0, lastSeg: -1 };
function wheelGame(dt) {
  const cx = W / 2, cy = 116, R = 78, N = WHEEL_SEGS.length, seg = TAU / N;
  if (WH.spin) {
    WH.t += dt;
    const k = clamp(WH.t / WH.dur, 0, 1);
    WH.ang = lerp(WH.from, WH.to, 1 - Math.pow(1 - k, 3));
    const cur = Math.floor(((-WH.ang % TAU) + TAU) % TAU / seg);
    if (cur !== WH.lastSeg) { WH.lastSeg = cur; Sound.play('spin'); }
    if (k >= 1) {
      WH.spin = false;
      const m = WHEEL_SEGS[WH.res], win = Math.round(WH.bet * m);
      if (win > 0) { payOut(win); czMsg((m >= 8 ? 'JACKPOT ' : '') + m + 'X! +' + win + '€', m >= 3 ? '#ffe14d' : '#7dff7a'); Sound.play(m >= 3 ? 'heart' : 'win'); if (m >= 8) Sound.play('cash'); }
      else { czMsg('NIX! RUSSIAN HACKER BOI SAGT DANKE.', '#ff6a6a'); Sound.play('lose'); }
    }
  }
  // Rad zeichnen
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx + 3, cy + 4, R + 6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx, cy, R + 5, 0, TAU); ctx.fill();
  for (let i = 0; i < N; i++) {
    const a0 = WH.ang + i * seg - Math.PI / 2;
    ctx.fillStyle = WHEEL_COL[WHEEL_SEGS[i]];
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + seg); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + seg / 2);
    txt(WHEEL_SEGS[i] + 'X', R - 22, -4, { font: FS, color: WHEEL_SEGS[i] === 8 ? '#111111' : '#ffffff', outline: WHEEL_SEGS[i] === 8 ? '' : '#000' });
    ctx.restore();
  }
  // Lichter am Rand
  for (let i = 0; i < 24; i++) { const a = i * TAU / 24; ctx.fillStyle = (i + Math.floor(T * 6)) % 2 ? '#ffffff' : '#ff3fa4'; ctx.fillRect(Math.round(cx + Math.cos(a) * (R + 3)) - 1, Math.round(cy + Math.sin(a) * (R + 3)) - 1, 2, 2); }
  ctx.fillStyle = '#ff3fa4'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, TAU); ctx.fill();
  ctx.drawImage(SPR.miniO, cx - 13, cy - 19, 26, 39);
  // Zeiger
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx - 8, cy - R - 12); ctx.lineTo(cx + 8, cy - R - 12); ctx.lineTo(cx, cy - R + 6); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.stroke();
  betSelector(214, WH.spin);
  if (!WH.spin && (button('DREHEN!', W / 2 + 100, 213, 90, 18, save.money >= currentBet()) || (uiActive() && (pressed.Space || pressed.Enter) && save.money >= currentBet()))) {
    WH.bet = currentBet(); payIn(WH.bet);
    let res = randi(0, N - 1);
    if (perk('lucky') && WHEEL_SEGS[res] === 0 && Math.random() < 0.3) res = (res + 1) % N;
    WH.res = res;
    const target = -(res + 0.5) * seg;
    WH.from = WH.ang;
    const base = Math.floor(WH.ang / TAU) * TAU;
    WH.to = base - 5 * TAU + ((target % TAU) - TAU) - rand(-0.3, 0.3) * seg * 0;
    WH.t = 0; WH.spin = true; WH.lastSeg = -1;
    Sound.play('select');
  }
}
