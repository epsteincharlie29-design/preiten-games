'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Minispiele: Angeln (Hafen), Darts (Casino),
//  Kartbahn (Park)
// =====================================================================
const mgPress = () => uiActive() && (pressed.Space || pressed.Enter || mouse.pl);

// ---------- ANGELN ----------
const FISH = [
  { name: 'ALTER STIEFEL', v: 0, p: 0.28, col: '#5a3a1a' }, { name: 'SARDINE', v: 5, p: 0.33, col: '#9ab0c8' },
  { name: 'KARPFEN', v: 12, p: 0.2, col: '#c8a040' }, { name: 'HECHT', v: 30, p: 0.12, col: '#4a8a4a' },
  { name: 'GOLDFISCH', v: 80, p: 0.055, col: '#ffd23f' }, { name: 'TEBLEEDD-FISCH', v: 250, p: 0.015, col: '#3fd0ff' },
];
const FG = { state: 'wait', t: 0, total: 0, n: 0, msg: '', fish: null };
function openFish() { Object.assign(FG, { state: 'wait', t: rand(3, 7), total: 0, n: 0, msg: 'WARTE, BIS ES ZAPPELT... DANN [LEERTASTE]!', fish: null }); setState('fish'); Sound.playSong('hub'); }
function rollFish() { let r = Math.random(); for (const f of FISH) { if (r < f.p) return f; r -= f.p; } return FISH[1]; }
function screenFish(dt) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a3a6a'); sky.addColorStop(0.45, '#2a5a8a'); sky.addColorStop(0.46, '#0e2a4a'); sky.addColorStop(1, '#06182a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(120,180,255,0.25)'; ctx.fillRect(Math.round((hash(i, 1) * W + T * 12 * (1 + hash(i, 2))) % W), 130 + Math.floor(hash(i, 3) * 130), 10 + Math.floor(hash(i, 4) * 14), 1); }
  ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, 196, 150, 12); ctx.fillStyle = '#4a3018'; for (let x = 6; x < 150; x += 24) ctx.fillRect(x, 208, 6, 62);
  ctx.drawImage(SPR.headC, 96, 170, 28, 36);
  drawMask(ctx, save.mask, 96, 170, 2);
  if (save.hat !== 'none') drawHat(ctx, save.hat, 96, 170, 2);
  const bite = FG.state === 'bite', bx = 320, by = 150 + Math.sin(T * 2) * 2 + (bite ? 5 + Math.sin(T * 40) * 2 : 0);
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(120, 186); ctx.lineTo(190, 110); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(190, 110); ctx.quadraticCurveTo(260, 120, bx, by - 3); ctx.stroke();
  ctx.fillStyle = '#e01b3c'; ctx.fillRect(bx - 3, by - 6, 6, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 3, by - 2, 6, 3);
  if (bite) { txt('!', bx, by - 24, { size: 16, align: 'center', color: '#ffe14d' }); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(bx, by + 2, 8 + Math.sin(T * 20) * 3, 0, TAU); ctx.stroke(); }
  FG.t -= dt;
  const press = mgPress();
  if (FG.state === 'wait') {
    if (press) { FG.state = 'msg'; FG.t = 1.4; FG.msg = 'ZU FRÜH! DER FISCH IST ABGEHAUEN.'; Sound.play('click'); }
    else if (FG.t <= 0) { FG.state = 'bite'; FG.t = 0.65; Sound.play('blip', true); }
  } else if (FG.state === 'bite') {
    if (press) {
      const f = rollFish(); FG.fish = f; FG.n++; FG.total += f.v; save.money += f.v; save.stats.fish = (save.stats.fish || 0) + 1; persist();
      FG.state = 'msg'; FG.t = 2.2; FG.msg = f.v ? f.name + '! VERKAUFT FÜR ' + f.v + '€' : 'EIN ' + f.name + '. TOLL.';
      Sound.play(f.v >= 80 ? 'win' : f.v ? 'cash' : 'lose');
    } else if (FG.t <= 0) { FG.state = 'msg'; FG.t = 1.4; FG.msg = 'ZU LANGSAM... WEG IST ER.'; FG.fish = null; }
  } else if (FG.t <= 0) { FG.state = 'wait'; FG.t = rand(3, 8); FG.msg = 'WARTE, BIS ES ZAPPELT... DANN [LEERTASTE]!'; FG.fish = null; }
  if (FG.fish && FG.state === 'msg') { pxEll(ctx, 380, 90, 14, 7, FG.fish.col); ctx.fillStyle = FG.fish.col; ctx.fillRect(392, 84, 8, 12); ctx.fillStyle = '#111'; ctx.fillRect(371, 88, 2, 2); }
  txt('ANGELN AM HAFEN', W / 2, 8, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  txt(FG.msg, W / 2, 40, { align: 'center', color: '#ffffff' });
  txt('GEFANGEN: ' + FG.n + '   VERDIENT: ' + FG.total + '€', W / 2, 56, { font: FS, align: 'center', color: '#7dff7a' });
  txt('[LEERTASTE] EINHOLEN   [ESC] ZURÜCK', W / 2, H - 12, { font: FS, align: 'center', color: '#cccccc' });
  if (uiActive() && pressed.Escape) enterHub();
}

// ---------- DARTS ----------
const DG = { darts: 3, score: 0, hits: [], state: 'aim', msg: '' };
const DART_C = { x: 240, y: 138 };
function openDarts() {
  if (save.money < 20) { cityMsg('DARTS KOSTET 20€ PRO RUNDE.', 2); Sound.play('click'); return; }
  save.money -= 20; save.stats.casinoLost = (save.stats.casinoLost || 0) + 20; persist();
  Object.assign(DG, { darts: 3, score: 0, hits: [], state: 'aim', msg: '3 PFEILE. ZIELE MIT DER MAUS, KLICK ZUM WERFEN!' });
  setState('darts'); Sound.playSong('casino');
}
function dartPoints(r) { return r < 5 ? 50 : r < 12 ? 25 : r < 28 ? 15 : r < 46 ? 10 : r < 70 ? 5 : 0; }
function screenDarts(dt) {
  drawRoomBg();
  const { x, y } = DART_C;
  pxEll(ctx, x, y, 74, 74, '#111');
  [[70, '#e8dcc0'], [46, '#c41f2a'], [28, '#e8dcc0'], [12, '#2a8a3a'], [5, '#c41f2a']].forEach(([r, c]) => pxEll(ctx, x, y, r, r, c));
  for (let k = 0; k < 20; k++) { const a = k * TAU / 20; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 70, y + Math.sin(a) * 70); ctx.stroke(); }
  for (const h of DG.hits) { ctx.fillStyle = '#111'; ctx.fillRect(h.x - 1, h.y - 1, 3, 3); ctx.fillStyle = '#3fd0ff'; ctx.fillRect(h.x + 1, h.y - 4, 2, 4); }
  // wackelige Hand
  const wob = 20, ax = mouse.x + Math.sin(T * 3.1) * wob * 0.8 + Math.sin(T * 7.3) * wob * 0.3, ay = mouse.y + Math.cos(T * 2.7) * wob * 0.8 + Math.cos(T * 6.1) * wob * 0.3;
  if (DG.state === 'aim') {
    ctx.strokeStyle = '#ffe14d'; ctx.beginPath(); ctx.arc(ax, ay, 4, 0, TAU); ctx.stroke();
    if (uiActive() && mouse.pl) {
      const pts = dartPoints(dist(ax, ay, x, y));
      DG.hits.push({ x: Math.round(ax), y: Math.round(ay) }); DG.score += pts; DG.darts--;
      DG.msg = pts ? '+' + pts + (pts === 50 ? ' BULLSEYE!!!' : '') : 'DANEBEN!'; Sound.play(pts >= 25 ? 'coin' : 'punch');
      if (DG.darts <= 0) {
        const win = DG.score >= 130 ? 150 : DG.score >= 100 ? 60 : DG.score >= 70 ? 25 : 0;
        save.money += win; if (win) save.stats.casinoWon = (save.stats.casinoWon || 0) + win; persist();
        DG.state = 'done'; DG.msg = DG.score + ' PUNKTE: ' + (win ? 'GEWONNEN: ' + win + '€!' : 'NIX GEWONNEN.'); Sound.play(win ? 'win' : 'lose');
      }
    }
  } else if (uiActive() && (pressed.Enter || pressed.Space)) openDarts();
  txt('DARTS', W / 2, 6, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  moneyTag(W - 10, 10);
  txt(DG.msg, W / 2, 24, { align: 'center', color: '#ffffff' });
  txt('PFEILE: ' + DG.darts + '   PUNKTE: ' + DG.score, 10, 40, { font: FS, color: '#ffe14d' });
  txt('70+ = 25€   100+ = 60€   130+ = 150€', 10, 52, { font: FS, color: '#cccccc' });
  txt(DG.state === 'done' ? '[ENTER] NOCHMAL (20€)   [ESC] ZURÜCK' : 'KLICK = WERFEN   [ESC] ZURÜCK', W / 2, H - 12, { font: FS, align: 'center', color: '#888888' });
  if (uiActive() && pressed.Escape) enterHub();
}

// ---------- KARTBAHN ----------
const TRK = { cx: 240, cy: 145, ox: 210, oy: 108, ix: 118, iy: 44 };
const TRK_MX = (TRK.ox + TRK.ix) / 2, TRK_MY = (TRK.oy + TRK.iy) / 2;
let KG = null;
const kartAng = (k) => Math.atan2((k.y - TRK.cy) / TRK_MY, (k.x - TRK.cx) / TRK_MX);
function onTrack(x, y) {
  const a = ((x - TRK.cx) / TRK.ox) ** 2 + ((y - TRK.cy) / TRK.oy) ** 2, b = ((x - TRK.cx) / TRK.ix) ** 2 + ((y - TRK.cy) / TRK.iy) ** 2;
  return a <= 1 && b >= 1;
}
function openKart() {
  if (save.money < 50) { cityMsg('EINE RUNDE KART KOSTET 50€.', 2); Sound.play('click'); return; }
  save.money -= 50; persist();
  const cols = ['#ff3f9a', '#3fd0ff', '#7dff7a', '#ffd23f'], names = ['LIL', 'GÜNTHER', 'KEVIN', 'BAKA'];
  KG = { t: 3.2, state: 'count', time: 0, karts: cols.map((c, i) => {
    const th = Math.PI / 2 - 0.12 - (i % 2) * 0.1, lane = i < 2 ? -14 : 14;
    const k = { x: TRK.cx + Math.cos(th) * (TRK_MX + lane), y: TRK.cy + Math.sin(th) * (TRK_MY + lane * 0.5), a: Math.PI, v: 0, col: c, name: names[i], ai: i > 0, lane, spd: 140 + i * 6 + rand(-4, 4), prog: 0, done: 0 };
    k.prev = kartAng(k); return k;
  }), place: 0 };
  setState('kart'); Sound.playSong('con');
}
function screenKart(dt) {
  ctx.fillStyle = '#1c4a24'; ctx.fillRect(0, 0, W, H);
  pxEll(ctx, TRK.cx, TRK.cy, TRK.ox + 6, TRK.oy + 6, '#e8e8e8'); pxEll(ctx, TRK.cx, TRK.cy, TRK.ox, TRK.oy, '#3a3a44');
  pxEll(ctx, TRK.cx, TRK.cy, TRK.ix, TRK.iy, '#e8e8e8'); pxEll(ctx, TRK.cx, TRK.cy, TRK.ix - 5, TRK.iy - 5, '#2a6a34');
  for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#111' : '#fff'; ctx.fillRect(TRK.cx - 4 + (k % 2) * 4, TRK.cy + TRK.iy + k * 8, 4, 8); ctx.fillStyle = k % 2 ? '#fff' : '#111'; ctx.fillRect(TRK.cx - 4 + ((k + 1) % 2) * 4, TRK.cy + TRK.iy + k * 8, 4, 8); }
  txt('KARTBAHN', TRK.cx, TRK.cy - 6, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  const G2 = KG;
  if (G2.state === 'count') { G2.t -= dt; if (G2.t <= 0) { G2.state = 'race'; Sound.play('select'); } }
  else if (G2.state === 'race') G2.time += dt;
  for (const k of G2.karts) {
    if (G2.state === 'race' && !k.done) {
      let thr = 0, steer = 0;
      if (k.ai) {
        const th = kartAng(k) + 0.32, tx = TRK.cx + Math.cos(th) * (TRK_MX + k.lane * 0.6), ty = TRK.cy + Math.sin(th) * (TRK_MY + k.lane * 0.3);
        const want = Math.atan2(ty - k.y, tx - k.x); steer = clamp(angDiff(k.a, want) * 3, -1, 1); thr = 1;
      } else {
        if (keys.KeyW || keys.ArrowUp) thr = 1; if (keys.KeyS || keys.ArrowDown) thr = -1;
        if (keys.KeyA || keys.ArrowLeft) steer = -1; if (keys.KeyD || keys.ArrowRight) steer = 1;
      }
      const max = (k.ai ? k.spd : 158) * (onTrack(k.x, k.y) ? 1 : 0.4);
      k.v += thr * 220 * dt; k.v *= Math.exp(-dt * (thr ? 0.8 : 2)); k.v = clamp(k.v, -50, max);
      k.a += steer * 3.2 * dt * clamp(k.v / 60, -1, 1);
      k.x = clamp(k.x + Math.cos(k.a) * k.v * dt, 6, W - 6); k.y = clamp(k.y + Math.sin(k.a) * k.v * dt, 6, H - 6);
      const th = kartAng(k); k.prog += angDiff(k.prev, th); k.prev = th;
      if (k.prog >= 3 * TAU) { k.done = ++G2.place; if (!k.ai) kartFinish(k.done); }
    }
    for (const o of G2.karts) if (o !== k) { const d = dist(k.x, k.y, o.x, o.y); if (d < 9 && d > 0.01) { k.x += (k.x - o.x) / d * (9 - d) * 0.5; k.y += (k.y - o.y) / d * (9 - d) * 0.5; } }
    ctx.save(); ctx.translate(Math.round(k.x), Math.round(k.y)); ctx.rotate(k.a);
    ctx.fillStyle = '#111'; ctx.fillRect(-6, -5, 4, 2); ctx.fillRect(2, -5, 4, 2); ctx.fillRect(-6, 3, 4, 2); ctx.fillRect(2, 3, 4, 2);
    ctx.fillStyle = k.col; ctx.fillRect(-6, -3, 12, 6); ctx.restore();
    if (!k.ai) ctx.drawImage(SPR.headC, Math.round(k.x) - 7, Math.round(k.y) - 12);
  }
  const me = G2.karts[0], lap = Math.min(3, Math.floor(Math.max(0, me.prog) / TAU) + 1);
  const pos = 1 + G2.karts.filter((k) => k !== me && (k.done ? !me.done || k.done < me.done : k.prog > me.prog)).length;
  txt('RUNDE ' + lap + '/3   PLATZ ' + pos + '/4   ZEIT ' + G2.time.toFixed(1) + 'S', 8, 6, { font: FS, color: '#ffffff' });
  if (G2.state === 'count') txt(String(Math.ceil(G2.t)), W / 2, H / 2 - 20, { size: 32, align: 'center', color: '#ffe14d' });
  if (G2.state === 'done') {
    panel(W / 2 - 120, 92, 240, 70, '#ffe14d');
    txt('PLATZ ' + G2.result + '!', W / 2, 100, { size: 16, align: 'center', color: (i) => neon(i) });
    txt(G2.win ? 'PREISGELD: ' + G2.win + '€' : 'KEIN PREISGELD. NÄCHSTES MAL!', W / 2, 124, { align: 'center', color: '#7dff7a' });
    txt('[ENTER] NOCHMAL (50€)   [ESC] ZURÜCK', W / 2, 144, { font: FS, align: 'center', color: '#cccccc' });
    if (uiActive() && (pressed.Enter || pressed.Space)) openKart();
  }
  txt('W/S GAS/BREMSE   A/D LENKEN   3 RUNDEN   [ESC] AUFGEBEN', W / 2, H - 10, { font: FS, align: 'center', color: '#cccccc' });
  if (uiActive() && pressed.Escape) enterHub();
}
function kartFinish(place) {
  const win = [0, 250, 100, 50, 0][place];
  KG.state = 'done'; KG.result = place; KG.win = win;
  if (win) { save.money += win; persist(); }
  Sound.play(place === 1 ? 'win' : win ? 'cash' : 'lose');
}
