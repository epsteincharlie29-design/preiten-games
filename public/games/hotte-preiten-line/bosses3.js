'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Boss: BAKA BAKA BAKA
//  Dick, lange Ginger-Haare über den Augen. Wird K.O. geschlagen (kein Blut).
// =====================================================================
BOSS_INFO.baka = { name: 'BAKA BAKA BAKA', hp: 60, r: 12, song: 'boss', noGore: true };
L_BOSS.baka = ['BAKA BAKA BAKA!', 'NANI?!', 'DU BIST SO BAKA!', 'MEINE RAMEN!', 'OMAE WA MOU...', 'ICH BIN DER HAUPTCHARAKTER!', 'SUGOI... NICHT!'];

function bakaRing(e, n, speed, gapAt, gapLen) {
  for (let i = 0; i < n; i++) {
    const k = (i - gapAt + n) % n;
    if (k < gapLen) continue;
    spawnBullet(e.x, e.y, i * TAU / n, speed, 'enemy', e, 'baka', 'shout');
  }
}
function updateBaka(e, dt, pd, pa) {
  const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
  e.walkT += dt;
  switch (e.mode) {
    case 'walk': {
      e.a = turnTo(e.a, pa, 2.5 * dt);
      const step = (angry ? 46 : 34) * dt;
      if (pd > 40) { if (sees) moveToward(e, p.x, p.y, step); else { e.pathT -= dt; if (e.pathT <= 0) { e.path = findPath(e.x, e.y, p.x, p.y); e.pathT = 0.6; } followPath(e, step, dt); } }
      e.shootT -= dt;
      if (e.shootT <= 0 && sees) {
        e.shootT = angry ? 1.4 : 1.9;
        for (let i = -1; i <= 1; i++) spawnBullet(e.x + Math.cos(pa) * 14, e.y + Math.sin(pa) * 14, pa + i * 0.28, 118, 'enemy', e, 'ramen', 'ramen');
        Sound.play('swoosh');
        if (Math.random() < 0.35) say(e, pick(L_BOSS.baka), 1.4);
      }
      if (pd < 36 && e.windup <= 0) { e.mode = 'hair'; e.modeT = angry ? 0.5 : 0.62; say(e, 'HAAR-PEITSCHE!', 0.8); break; }
      e.modeT -= dt;
      if (e.modeT <= 0) {
        e.attack = (e.attack + 1) % 2;
        if (e.attack === 0) { e.mode = 'baka'; e.burst = 2; e.shootT = 0.5; say(e, 'BAKA... BAKA...', 1); Sound.play('boss'); }
        else { e.mode = 'flop'; e.modeT = 1.2; e.flopX = p.x; e.flopY = p.y; say(e, 'BAUCHPLATSCHER!!!', 1.2); Sound.play('boss_attack'); }
      }
      break;
    }
    case 'baka':
      e.shootT -= dt;
      if (e.shootT <= 0) {
        e.shootT = 0.5;
        bakaRing(e, 22, 100 + (2 - e.burst) * 16, randi(0, 21), angry ? 6 : 7);
        say(e, 'BAKA!', 0.4); shake(4); Sound.play('explode');
        e.burst--;
        if (e.burst <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); }
      }
      break;
    case 'flop':
      // springt hoch und landet da, wo du gerade warst
      e.modeT -= dt;
      if (e.modeT <= 0) {
        e.x = e.flopX; e.y = e.flopY; resolve(e);
        shake(14); Sound.play('slam'); Sound.play('explode'); G.flash = 0.15;
        for (const q of G.players) if (q.alive && dist(q.x, q.y, e.x, e.y) < 42) killPlayer(e, Math.atan2(q.y - e.y, q.x - e.x), 'belly', q);
        for (const o of G.enemies) if (o !== e && o.state !== 'dead' && dist(o.x, o.y, e.x, e.y) < 48) killEnemy(o, 'friendly', 0);
        bakaRing(e, 12, 130, randi(0, 11), 3);
        sparks(e.x, e.y, 24, '#ffffff');
        e.mode = 'stunned'; e.modeT = angry ? 2.6 : 3.2; say(e, 'UFF... MEIN BAUCH...', 1.4);
      }
      break;
    case 'hair':
      e.modeT -= dt;
      if (e.modeT <= 0) {
        Sound.play('swoosh'); e.swingT = 0.25;
        for (const q of G.players) if (q.alive && dist(q.x, q.y, e.x, e.y) < 34) killPlayer(e, Math.atan2(q.y - e.y, q.x - e.x), 'hair', q);
        e.mode = 'walk'; e.modeT = Math.max(e.modeT, 1.2);
      }
      break;
    case 'stunned':
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); say(e, pick(['NANI?! NOCHMAL!', 'JETZT BIN ICH SAUER!', 'BAKA!!!']), 1.2); }
      break;
  }
  if (e.mode !== 'stunned' && e.mode !== 'flop' && p.execT <= 0 && pd < e.r + p.r) killPlayer(e, pa, 'baka', p);
  if (!e.summoned && angry) { e.summoned = true; say(e, 'MEINE FANS!! HOLT IHN!', 2); spawnMinions('M', 2); }
}
function drawBakaBody(g, e) {
  const s = Math.round(Math.sin(e.walkT * 8) * 4);
  g.fillStyle = '#1a1a22'; g.fillRect(-4 + s, -10, 7, 5); g.fillRect(-4 - s, 5, 7, 5);
  pxEll(g, -1, 0, 12, 13, '#c43a7a'); pxEll(g, 0, 0, 11, 12, '#ff6fb5');
  g.fillStyle = '#fff'; g.fillRect(3, -3, 5, 6); g.fillStyle = '#3fd0ff'; g.fillRect(4, -2, 3, 2);   // Anime-Shirt
  g.fillStyle = '#ff6fb5'; g.fillRect(4, -14, 8, 4); g.fillRect(4, 10, 8, 4);
  g.fillStyle = '#f0c8a0'; g.fillRect(12, -13, 3, 3); g.fillRect(12, 10, 3, 3);
  if (e.swingT > 0) { g.strokeStyle = '#e8641a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.stroke(); g.lineWidth = 1; }
  // Kopf mit langen Ginger-Haaren über den Augen
  pxEll(g, 0, 0, 7, 7, '#c8501a'); pxEll(g, 1, 0, 6, 6, '#e8641a');
  g.fillStyle = '#f0c8a0'; g.fillRect(5, -3, 2, 6);
  g.fillStyle = '#e8641a'; for (let i = -4; i <= 4; i += 2) g.fillRect(4, i, 5 + (i % 4 === 0 ? 2 : 0), 1);
  g.fillStyle = '#ff9a4a'; g.fillRect(2, -5, 2, 10);
}
function drawBakaExtra(g, e) {
  if (e.mode === 'flop') {
    const k = 1 - e.modeT / 1.2;
    g.strokeStyle = `rgba(255,40,40,${0.5 + Math.sin(T * 30) * 0.4})`; g.lineWidth = 1;
    g.beginPath(); g.arc(e.flopX, e.flopY, 48, 0, TAU); g.stroke();
    g.fillStyle = `rgba(0,0,0,${0.2 + 0.3 * k})`; g.beginPath(); g.ellipse(e.flopX, e.flopY, 12 * (0.5 + k), 10 * (0.5 + k), 0, 0, TAU); g.fill();
  }
}
