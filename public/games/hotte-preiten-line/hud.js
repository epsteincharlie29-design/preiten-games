'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - HUD, Tutorial-Hinweise, Tod/Game-Over-Anzeige
// =====================================================================
function hintBox(lines, y) {
  ctx.font = '8px ' + FS;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16, h = lines.length * 10 + 8;
  const x = Math.round(W / 2 - w / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = neon(0); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  lines.forEach((l, i) => txt(l, W / 2, y + 5 + i * 10, { font: FS, align: 'center', color: i === 0 ? '#ffe14d' : '#ffffff' }));
}

// Geführtes Tutorial auf der allerersten Etage
function tutorialHint() {
  const p = G.player, t = G.tut || (G.tut = { step: 0, t: 0, sx: p.x, sy: p.y });
  t.t += 1 / 60;
  const next = () => { t.step++; t.t = 0; Sound.play('select'); };
  switch (t.step) {
    case 0: if (dist(p.x, p.y, t.sx, t.sy) > 50) next(); return ['TUTORIAL 1/6', 'WASD = LAUFEN    MAUS = ZIELEN', 'LAUF EIN STÜCK!'];
    case 1: if (p.weapon) next(); return ['TUTORIAL 2/6', 'GEH ZUR BRATPFANNE (BLINKT) UND', 'DRÜCK [RECHTSKLICK] ZUM AUFHEBEN'];
    case 2: if (run.kills > 0) next(); return ['TUTORIAL 3/6', '[LINKSKLICK] = ANGREIFEN / SCHIESSEN', 'EIN TREFFER TÖTET - AUCH DICH! GEH REIN!'];
    case 3: if (run.cash > 0 || t.t > 12) next(); return ['TUTORIAL 4/6', 'TOTE GEGNER LASSEN GELD FALLEN (GRÜN).', 'LAUF DRÜBER! GELD = PERKS IM SHOP'];
    case 4: if (t.t > 9) next(); return ['TUTORIAL 5/6', '[RECHTSKLICK] MIT WAFFE = WERFEN (HAUT UM)', '[Q] = FINGERPISTOLE (GEGNER ERSTARREN)'];
    case 5: if (t.t > 9) next(); return ['TUTORIAL 6/6', 'LIEGENDE GEGNER: [LEERTASTE] = ERLEDIGEN', 'TÜREN AUFRENNEN HAUT GEGNER DAHINTER UM!'];
  }
  return null;
}

function drawHUD() {
  const p = G.player;
  txt(run.score + ' PKT', 8, 6, { size: 16, color: (i) => neon(i), wave: 1, shadow: '#2a0030' });
  // Herzen (gespeichert, kaufbar im Kiosk)
  for (let i = 0; i < (p.maxLives || 0); i++) drawHeart(ctx, 8 + i * 10, 26, 1, i < p.lives ? '#ff3b5a' : '#3a1a24');
  // Geld (dieser Versuch)
  txt('+' + run.cash + '€', 8 + (p.maxLives || 0) * 10 + 4, 25, { font: FS, color: '#7dff7a' });
  if (save.booster) txt('BOOSTER: ' + boosterNames(), 8, 50, { font: FS, color: '#ffb52a' });
  if (G.players.length > 1) drawP2Hud();
  const since = run.time - run.lastKillT;
  if (run.combo > 1 && since < 3.2) {
    txt(run.combo + 'X COMBO', 8, 36, { color: '#ffe14d', wave: 2 });
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(8, 47, Math.round(72 * (1 - since / 3.2)), 2);
  }
  const w = p.weapon ? WEAPONS[p.weapon.id] : FISTS;
  txt(w.name, W - 8, 8, { align: 'right', color: '#7ff' });
  if (w.ranged) txt(p.weapon.ammo + '', W - 8, 20, { align: 'right', size: 16, color: p.weapon.ammo ? '#fff' : '#ff4a4a' });
  if (p.armor > 0) txt('WESTE x' + p.armor, W - 8, 40, { font: FS, align: 'right', color: '#66ffff' });
  if (p.focus > 0) txt('[E] ZEITLUPE x' + p.focus, W - 8, 50, { font: FS, align: 'right', color: '#9ab8ff' });

  const last = G.fi === G.L.floors.length - 1;
  if (!G.cleared) {
    const left = G.enemies.filter((e) => e.state !== 'dead').length;
    if (!G.boss && !G.arena) txt('GEGNER: ' + left, W / 2, 8, { align: 'center', color: '#ff9ad5' });
  } else if (!G.exiting && Math.floor(T * 3) % 2 === 0 && !G.L.final) {
    txt(last ? 'ZUM AUSGANG!' : 'ZUR TREPPE!', W / 2, 10, { align: 'center', size: 16, color: (i) => neon(i), wave: 3 });
  }
  if (G.boss && G.boss.active && G.boss.state !== 'dead') {
    const b = G.boss, bw = 220, bx = W / 2 - bw / 2, by = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 80, by - 4, bw + 160, 34);
    ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
    ctx.fillStyle = '#5a0010'; ctx.fillRect(bx, by, bw, 6);
    const BX = BOSS_EXT[b.btype];
    ctx.fillStyle = b.flash > 0 ? '#fff' : (BX && BX.barColor && extCall(BX.barColor, b)) || (b.btype === 'hacker' ? (b.mode === 'firewall' ? '#2a8a4a' : '#39ff7a') : '#ff2a4a');
    ctx.fillRect(bx, by, Math.round(bw * b.hp / b.maxHp), 6);
    let label = BOSS_INFO[b.btype].name;
    if (b.btype === 'hacker') label += b.phase === 1 ? '  -  FIREWALL AKTIV: SERVER ZERSTÖREN!' : b.phase === 2 ? '  -  PHASE 2' : '  -  SYSTEM OVERLOAD!';
    if (b.btype === 'tabluator' && b.mode === 'netz') label += '  -  ROUTER ZERSTÖREN!';
    if (BX && BX.label) label = extCall(BX.label, b) || label;
    txt(label, W / 2, by + 9, { font: FS, align: 'center', color: b.btype === 'hacker' ? '#39ff7a' : '#ffd84a' });
    const vul = bossVulnerable(b);
    txt(vul ? 'JETZT! ER IST WEHRLOS - DRAUF!' : 'SCHWACHSTELLE: ' + (BOSS_WEAK[b.btype] || '???'), W / 2, by + 19, { font: FS, align: 'center', color: vul ? (Math.floor(T * 6) % 2 ? '#7dff7a' : '#ffffff') : '#ffe14d' });
    if (BOSS_EXT[b.btype] && BOSS_EXT[b.btype].hud) BOSS_EXT[b.btype].hud(b);
  }
  // Gesicht + Hut
  const mini = p.alive ? (p.mouthT > 0 ? SPR.miniO : SPR.miniC) : SPR.miniRedO;
  const bounce = p.mouthT > 0 ? -2 : 0;
  ctx.drawImage(mini, 6, H - 45 + bounce);
  if (save.hat !== 'none') drawHat(ctx, save.hat, 6 + 2, H - 45 + bounce + 1.5, 1.6);
  const ready = p.fingerCd <= 0;
  ctx.drawImage(ready ? SPR.handMid : SPR.handMidGrey, 36, H - 24);
  if (!ready) { ctx.fillStyle = '#ff6fb5'; ctx.fillRect(36, H - 5, Math.round(26 * clamp(1 - p.fingerCd / (perkP(p, 'finger') ? 3 : 5), 0, 1)), 2); }
  txt('Q', 66, H - 20, { color: ready ? '#ffe14d' : '#666' });
  if (perkP(p, 'vexwave') || p.freeWave) {
    const lvw = perkP(p, 'vexwave'), maxCd = lvw ? [14, 9, 6][lvw - 1] : 14, rd = p.waveCd <= 0;
    ctx.strokeStyle = rd ? '#c89bff' : '#4a3a6a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(86, H - 16, 7, 0, TAU); ctx.stroke();
    if (!rd) { ctx.strokeStyle = '#c89bff'; ctx.beginPath(); ctx.arc(86, H - 16, 7, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(1 - p.waveCd / maxCd, 0, 1)); ctx.stroke(); }
    ctx.lineWidth = 1;
    txt('V', 96, H - 20, { color: rd ? '#c89bff' : '#666' });
  }
  txt((save.hard ? 'SCHWER  -  ' : '') + (G.arena ? (G.arena.raid ? 'ÜBERFALL!' : 'WELLEN-ARENA') : (G.L.label || 'LEVEL ' + (G.li + 1)) + ': ' + G.L.name + ' - ' + G.F.name), W - 6, H - 12, { font: FS, align: 'right', color: '#dddddd' });
  if (G.arena) drawArenaHud();
  floorModsCall('hud');
  const RM = curRunMode();
  if (RM && RM.hud) extCall(RM.hud);

  if (G.li === 0 && G.fi === 0 && p.alive && !save.seenTut) {
    const h = tutorialHint();
    if (h) hintBox(h, H - 92); else { save.seenTut = true; persist(); }
  }
  if (G.lanes.length && G.time < 6 && p.alive) hintBox(['ACHTUNG U-BAHN!', 'WENN DIE GLEISE ROT BLINKEN: RUNTER DA!'], H - 70);
  if (G.lasers.length && G.time < 6 && p.alive) hintBox(['LASERSCHRANKEN!', 'ROT = TÖDLICH. WARTE, BIS SIE AUS SIND.'], H - 70);
  if (G.terminals.length && !G.hacked && G.time < 8 && p.alive) hintBox(['SICHERHEITSTÜR VERSCHLOSSEN!', 'FINDE DEN PC UND BENUTZ WIRESHARK MIT [E].'], H - 70);
  if (G.dark && G.time < 6 && p.alive) hintBox(['STROMAUSFALL!', 'DEINE TASCHENLAMPE LEUCHTET DORTHIN, WO DU ZIELST.'], H - 70);

  // Hand zeigt zum Ausgang
  if (G.cleared && !G.exiting && p.alive && G.exits.length && !G.L.final) {
    let best = null, bd = 1e9;
    for (const i of G.exits) { const ex = (i % G.w) * TS + 8, ey = ((i / G.w) | 0) * TS + 8, d = dist(p.x, p.y, ex, ey); if (d < bd) { bd = d; best = [ex, ey]; } }
    const s = worldToScreen(best[0], best[1]);
    if (s.x > 20 && s.x < W - 20 && s.y > 30 && s.y < H - 20) drawHandPointing(ctx, s.x, s.y - 18 - Math.abs(Math.sin(T * 5)) * 5, Math.PI / 2, false);
    else {
      const ang = Math.atan2(s.y - H / 2, s.x - W / 2);
      const ex = clamp(W / 2 + Math.cos(ang) * 400, 24, W - 24), ey = clamp(H / 2 + Math.sin(ang) * 400, 40, H - 24);
      drawHandPointing(ctx, ex - Math.cos(ang) * Math.abs(Math.sin(T * 5)) * 4, ey - Math.sin(ang) * Math.abs(Math.sin(T * 5)) * 4, ang, false);
    }
  }
  if (G.introT > 0 && p.alive) {
    ctx.globalAlpha = clamp(G.introT, 0, 1);
    txt(G.F.name, W / 2, H / 2 - 40, { align: 'center', size: 16, color: (i) => neon(i), wave: 3, shadow: '#000' });
    ctx.globalAlpha = 1;
  }
  if (!G.players.some((q) => q.alive) && Math.min(...G.players.map((q) => q.deadT)) > 0.5) drawDeathScreen();
}
// zeigt den ANDEREN Spieler (beim Host: P2, beim Online-Gast: P1)
function drawP2Hud() {
  G.players.filter((r) => r !== G.player).forEach((q, k) => {
    const x = W - 116, y = H - 64 - k * 28;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, 110, 26);
    ctx.drawImage(q.alive ? SPR.headC : SPR.headRedC, x + 3, y + 4);
    const hat = q.hat || (q.idx === 0 ? save.hat : 'shades');
    if (hat !== 'none') drawHat(ctx, hat, x + 3, y + 4, 1);
    const w = q.weapon ? WEAPONS[q.weapon.id] : FISTS;
    const en = NET.mode === 'host' && NET.conns.find((c) => c.idx === q.idx);
    txt('P' + (q.idx + 1) + (q.idx === 0 ? ' (HOST)' : en && en.ping ? ' ' + en.ping + 'MS' : '') + '  ' + (q.lives || 0) + ' LEBEN', x + 22, y + 3, { font: FS, color: ['#ff9ad5', '#66aaff', '#7dff7a', '#ffb52a'][q.idx] || '#fff' });
    txt(q.alive ? w.name.slice(0, 14) + (w.ranged ? ' ' + q.weapon.ammo : '') : q.reviveT > 0 ? 'ZURÜCK IN ' + Math.ceil(q.reviveT) + 'S' : 'TOT (KEINE LEBEN)', x + 22, y + 13, { font: FS, color: q.alive ? '#ffffff' : '#ff6a6a' });
  });
}

function drawDeathScreen() {
  if (G.arena) { drawArenaOver(); return; }
  const left = G.players.reduce((a, q) => a + (q.lives || 0), 0), over = left <= 0;
  ctx.fillStyle = over ? 'rgba(20,0,0,0.75)' : 'rgba(60,0,10,0.5)'; ctx.fillRect(0, 0, W, H);
  txt(over ? 'ALLE LEBEN WEG' : 'DU BIST TOT', W / 2, 50, { size: 24, align: 'center', color: (i) => 'hsl(' + (350 + Math.round(Math.sin(T * 3 + i) * 3) * 4) + ',100%,55%)', wave: 4, shadow: '#000' });
  txt('TODESURSACHE: ' + G.cause, W / 2, 90, { align: 'center', color: '#ffffff' });
  wrap('TIPP: ' + G.tip, 44).forEach((l, i) => txt(l, W / 2, 110 + i * 11, { font: FS, align: 'center', color: '#ffd84a' }));
  if (over) {
    const cp = checkpointFloor();
    txt(cp ? 'ZURÜCK ZUM CHECKPOINT (ETAGE ' + (cp + 1) + ').' : 'DAS LEVEL FÄNGT VON VORNE AN (ETAGE 1).', W / 2, 146, { align: 'center', color: '#ff6a6a' });
    txt('NUR DAS GELD AUS DIESEM VERSUCH IST WEG - DEIN KONTO BLEIBT.', W / 2, 162, { font: FS, align: 'center', color: '#cccccc' });
    if (Math.floor(T * 2.5) % 2 === 0) txt('[R] NOCHMAL VON VORNE', W / 2, 190, { align: 'center', color: (i) => neon(i), wave: 2 });
  } else {
    txt('NOCH ' + left + ' LEBEN AUF DIESER ETAGE' + (G.players.length > 1 ? ' (ALLE ZUSAMMEN)' : ''), W / 2, 146, { align: 'center', color: '#ff9ad5' });
    for (let i = 0; i < Math.min(14, left); i++) drawHeart(ctx, W / 2 - Math.min(14, left) * 6 + i * 12, 160, 1, '#ff3b5a');
    if (Math.floor(T * 2.5) % 2 === 0) txt('[R] WEITER AUF DIESER ETAGE', W / 2, 186, { align: 'center', color: (i) => neon(i), wave: 2 });
  }
}

function drawCrosshair() {
  const x = Math.round(mouse.x), y = Math.round(mouse.y);
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 6, y - 1, 5, 3); ctx.fillRect(x + 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 6, 3, 5); ctx.fillRect(x - 1, y + 2, 3, 5);
  ctx.fillStyle = neon(0);
  ctx.fillRect(x - 5, y, 4, 1); ctx.fillRect(x + 2, y, 4, 1); ctx.fillRect(x, y - 5, 1, 4); ctx.fillRect(x, y + 2, 1, 4);
}
