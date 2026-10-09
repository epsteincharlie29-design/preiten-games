'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Bosse Teil 2: FRAU GRECHI (Level 2) und
//  KUMI (Level 5). Beide werden nicht blutig besiegt, sondern K.O.
// =====================================================================

// ---------- Frau Grechenig: böse Deutschlehrerin ----------
function updateGrechenig(e, dt, pd, pa) {
  const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
  e.a = turnTo(e.a, pa, 4 * dt);
  e.walkT += dt;
  switch (e.mode) {
    case 'walk': {
      // Abstand halten und seitlich laufen
      e.idleT = (e.idleT || 0) - dt; if (e.idleT <= 0) { e.idleT = rand(1, 2.2); e.sweep = Math.random() < 0.5 ? 1 : -1; }
      const keep = pd > 150 ? 1 : pd < 90 ? -1 : 0;
      const mx = Math.cos(pa) * keep + Math.cos(pa + Math.PI / 2) * (e.sweep || 1) * 0.8, my = Math.sin(pa) * keep + Math.sin(pa + Math.PI / 2) * (e.sweep || 1) * 0.8;
      const l = Math.hypot(mx, my) || 1;
      moveEntity(e, mx / l * (angry ? 70 : 55) * dt, my / l * (angry ? 70 : 55) * dt);
      e.shootT -= dt;
      if (e.shootT <= 0 && sees) {
        const n = angry ? 4 : 3;
        for (let i = 0; i < n; i++) spawnBullet(e.x, e.y, pa + (i - (n - 1) / 2) * 0.16, angry ? 215 : 185, 'enemy', e, 'pen', 'redpen');
        Sound.play('swoosh'); e.shootT = angry ? 1.2 : 1.6;
        if (Math.random() < 0.35) say(e, pick(L_BOSS.grechenig), 1.5);
      }
      e.modeT -= dt;
      if (e.modeT <= 0) {
        e.attack = (e.attack + 1) % 3;
        if (e.attack === 0) { e.mode = 'aehm'; e.modeT = 1.0; say(e, 'ÄHHHHHHHM...', 1.1); Sound.play('boss'); }
        else if (e.attack === 1) { e.mode = 'fokus'; e.modeT = angry ? 2.6 : 2.1; say(e, 'FOOOKUSSS!!!', 2); Sound.play('boss_attack'); shake(4); }
        else { e.mode = 'diktat'; e.modeT = angry ? 3 : 2.4; e.spinA = pa; say(e, 'DIKTAT! HEFTE RAUS!', 1.6); }
      }
      break;
    }
    case 'aehm':
      e.modeT -= dt; shake(1);
      if (e.modeT <= 0) {
        say(e, 'RUHE, THEO!!!', 1.5); Sound.play('explode');
        // Buchstaben-Ring mit Lücken: in die Lücke laufen!
        for (let ring = 0; ring < (angry ? 2 : 1); ring++) {
          const n = 30, gap0 = randi(0, n - 1), base = rand(TAU);
          for (let i = 0; i < n; i++) {
            const k = (i - gap0 + n) % n;
            if (k < 6 || (angry && k >= 15 && k < 19)) continue;
            spawnBullet(e.x, e.y, base + i * TAU / n, 108 - ring * 24, 'enemy', e, 'letter', 'letters');
          }
        }
        e.mode = 'walk'; e.modeT = rand(2.5, 3.5);
      }
      break;
    case 'fokus': {
      // saugt Lil zu sich her - weglaufen!
      e.modeT -= dt;
      for (const q of G.players) {
        const qd = dist(e.x, e.y, q.x, q.y);
        if (!q.alive || qd < 1) continue;
        const pull = (angry ? 52 : 42);
        q.x += (e.x - q.x) / qd * pull * dt; q.y += (e.y - q.y) / qd * pull * dt; resolve(q);
      }
      e.shootT -= dt;
      if (e.shootT <= 0) { e.shootT = 0.5; spawnBullet(e.x, e.y, pa + rand(-0.3, 0.3), 200, 'enemy', e, 'pen', 'redpen'); }
      if (Math.random() < 0.6) { const a = rand(TAU); G.parts.push({ x: e.x + Math.cos(a) * 90, y: e.y + Math.sin(a) * 90, vx: -Math.cos(a) * 220, vy: -Math.sin(a) * 220, life: 0.35, col: 'rgba(255,255,255,0.5)', s: 1, kind: 'spark' }); }
      if (e.modeT <= 0) { e.mode = 'stunned'; e.modeT = 3.0; say(e, 'PUH... WO WAR ICH?', 1.5); }
      break;
    }
    case 'diktat':
      e.modeT -= dt;
      e.spinA += dt * 2.4;
      e.shootT -= dt;
      if (e.shootT <= 0) {
        e.shootT = angry ? 0.18 : 0.24;
        for (let k = 0; k < 2; k++) spawnBullet(e.x, e.y, e.spinA + k * Math.PI, 95, 'enemy', e, 'paper', 'paper');
      }
      if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); }
      break;
    case 'stunned':
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2, 3); say(e, 'SO! JETZT REICHT ES!', 1.2); }
      break;
  }
  if (e.mode !== 'stunned' && p.execT <= 0 && pd < e.r + p.r) killPlayer(e, pa, 'nachsitzen', p);
  if (!e.summoned && angry) { e.summoned = true; say(e, 'AUFSICHT!! SCHNAPPT IHN!', 2); spawnMinions('M', 1); spawnMinions('E', 1); }
}
function drawGrechenigBody(g, e) {
  const s = Math.round(Math.sin(e.walkT * 12) * 3);
  g.fillStyle = '#2a1a1a'; g.fillRect(-3 + s, -5, 5, 3); g.fillRect(-3 - s, 2, 5, 3);
  g.fillStyle = '#6a3a7a'; g.fillRect(-4, -7, 8, 14); g.fillStyle = '#8a4a9a'; g.fillRect(-4, -7, 3, 14);
  g.fillStyle = '#e8e0d0'; g.fillRect(2, -2, 2, 4);
  // Arm mit Rotstift
  g.fillStyle = '#6a3a7a'; g.fillRect(0, 5, 7, 3); g.fillStyle = '#f0c8a0'; g.fillRect(7, 5, 2, 3);
  g.fillStyle = '#e01b3c'; g.fillRect(9, 6, 7, 1); g.fillStyle = '#fff'; g.fillRect(15, 6, 1, 1);
  // Heft im anderen Arm
  g.fillStyle = '#6a3a7a'; g.fillRect(0, -8, 6, 3); g.fillStyle = '#3a6ac4'; g.fillRect(5, -10, 5, 6);
  // Kopf: Dutt + Brille
  pxEll(g, 0, 0, 5, 5, '#7a5a3a'); pxEll(g, -3, 0, 3, 3, '#6a4a2a');
  g.fillStyle = '#f0c8a0'; g.fillRect(2, -3, 3, 6);
  g.fillStyle = '#111'; g.fillRect(4, -3, 1, 2); g.fillRect(4, 1, 1, 2); g.fillRect(4, -1, 1, 2);
}

// ---------- Der Tabluator: Netzwerktechniker mit Cisco Packet Tracer ----------
function tabluatorRouters() { return G.enemies.filter((o) => o.kind === 'V' && o.state !== 'dead'); }
function tabluatorCables(e) {
  const r = tabluatorRouters(), cables = [];
  for (const v of r) cables.push([e.x, e.y, v.x, v.y]);
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    if (Math.abs(r[i].x - r[j].x) < 4 || Math.abs(r[i].y - r[j].y) < 4) cables.push([r[i].x, r[i].y, r[j].x, r[j].y]);
  }
  return cables;
}
function updateTabluator(e, dt, pd, pa) {
  const p = e.target || G.player, angry = e.hp < e.maxHp / 2, sees = los(e.x, e.y, p.x, p.y);
  e.a = turnTo(e.a, pa, 4 * dt);
  e.walkT += dt;
  const routers = tabluatorRouters();
  // Pakete laufen über die Kabel (wie im Simulationsmodus)
  e.packetT = (e.packetT || 0) - dt;
  if (routers.length && e.packetT <= 0) {
    e.packetT = angry ? 0.75 : 1.05;
    const c = pick(tabluatorCables(e)), rev = Math.random() < 0.5;
    G.hazards.push({ kind: 'packet', ax: rev ? c[2] : c[0], ay: rev ? c[3] : c[1], bx: rev ? c[0] : c[2], by: rev ? c[1] : c[3], t: 0, speed: angry ? 105 : 82, col: pick(['#ffd23f', '#3fd0ff', '#7dff7a', '#ff6fb5']) });
  }
  if (e.mode === 'netz') {
    // geschützt, solange Router laufen
    e.shootT -= dt;
    if (e.shootT <= 0 && sees) {
      e.shootT = angry ? 2.0 : 2.7;
      for (let i = 0; i < 3; i++) spawnBullet(e.x, e.y, pa + (i - 1) * 0.2, 145, 'enemy', e, 'packet', 'packet');
      say(e, pick(['PING!', 'PING... PING...', 'ICMP ECHO REQUEST!']), 0.8); Sound.play('zap');
    }
    if (Math.random() < 0.02) say(e, pick(L_BOSS.tabluator), 1.6);
    if (!routers.length) { e.mode = 'walk'; e.modeT = 2; say(e, 'MEINE ROUTER!! NO SHUTDOWN!!!', 2); Sound.play('boss_phase'); shake(10); G.flash = 0.25; if (!propsOf('plug').length) { const s = randomArenaSpot(110); if (s) spawnProp('plug', s[0], s[1]); } }
    return;
  }
  switch (e.mode) {
    case 'walk': {
      const step = (angry ? 62 : 50) * dt;
      if (pd > 60 && sees) { moveToward(e, p.x, p.y, step); }
      else if (!sees) { e.pathT -= dt; if (e.pathT <= 0) { e.path = findPath(e.x, e.y, p.x, p.y); e.pathT = 0.5; } followPath(e, step, dt); }
      e.shootT -= dt;
      if (e.shootT <= 0 && sees) {
        e.shootT = angry ? 0.95 : 1.3;
        spawnBullet(e.x, e.y, pa, 180, 'enemy', e, 'packet', 'packet'); Sound.play('zap');
      }
      if (pd < 42 && e.windup <= 0) { e.mode = 'whip'; e.modeT = 0.42; say(e, 'LAYER-1-PROBLEM!', 0.8); }
      e.modeT -= dt;
      if (e.modeT <= 0) {
        e.attack = (e.attack + 1) % 3;
        if (e.attack === 0) { // Broadcast-Sturm
          const n = angry ? 16 : 12;
          for (let ring = 0; ring < 2; ring++) for (let i = 0; i < n; i++) spawnBullet(e.x, e.y, i * TAU / n + ring * 0.15, 120 - ring * 26, 'enemy', e, 'packet', 'packet');
          say(e, 'BROADCAST-STURM!', 1.4); Sound.play('boss_attack'); e.modeT = rand(3, 4);
        } else if (e.attack === 1) { // ping -t
          e.mode = 'pingt'; e.burst = angry ? 7 : 5; e.shootT = 0; say(e, 'PING -T !!!', 1.2);
        } else { // neue Switches einstecken -> wieder geschützt
          e.mode = 'netz'; say(e, 'NEUE SWITCHES! REDUNDANZ, KOLLEGE!', 2);
          for (let k = 0; k < 2; k++) {
            const s = randomArenaSpot(120);
            if (!s) continue;
            const v = makeEnemy('V', s[0], s[1]); v.hp = 3; G.enemies.push(v); sparks(s[0], s[1], 12, '#3fd0ff');
          }
          G.cleared = false;
        }
      }
      break;
    }
    case 'pingt':
      e.shootT -= dt;
      if (e.shootT <= 0) {
        e.shootT = 0.18;
        spawnBullet(e.x, e.y, pa + rand(-0.08, 0.08), 220, 'enemy', e, 'packet', 'packet'); Sound.play('zap');
        e.burst--;
        if (e.burst <= 0) { e.mode = 'stunned'; e.modeT = 2.6; say(e, 'REQUEST TIMED OUT...', 1.4); }
      }
      break;
    case 'whip':
      e.modeT -= dt;
      if (e.modeT <= 0) {
        Sound.play('swoosh'); e.swingT = 0.2;
        if (p.alive && pd < 52 && Math.abs(angDiff(e.a, pa)) < 1.5) killPlayer(e, pa, 'cable', p);
        e.mode = 'walk'; e.modeT = Math.max(e.modeT, 1);
      }
      break;
    case 'stunned':
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'walk'; e.modeT = rand(2.5, 3.5); }
      break;
  }
  if (e.mode !== 'stunned' && p.execT <= 0 && pd < e.r + p.r) killPlayer(e, pa, 'tabluator', p);
}
function drawTabluatorBody(g, e) {
  const s = Math.round(Math.sin(e.walkT * 12) * 3);
  g.fillStyle = '#1a1a22'; g.fillRect(-3 + s, -5, 5, 3); g.fillRect(-3 - s, 2, 5, 3);
  g.fillStyle = '#1f5a9a'; g.fillRect(-4, -7, 8, 14); g.fillStyle = '#2a6ac4'; g.fillRect(-4, -7, 3, 14);
  g.fillStyle = '#fff'; g.fillRect(1, -3, 2, 2);
  // Laptop mit Packet Tracer
  g.fillStyle = '#1f5a9a'; g.fillRect(1, -9, 6, 3); g.fillRect(1, 6, 6, 3);
  g.fillStyle = '#f0c8a0'; g.fillRect(7, -9, 2, 3); g.fillRect(7, 6, 2, 3);
  g.fillStyle = '#2a2a2a'; g.fillRect(8, -6, 6, 12); g.fillStyle = '#3fd0ff'; g.fillRect(9, -5, 4, 10);
  g.fillStyle = '#ffd23f'; g.fillRect(10, -3, 2, 1); g.fillRect(10, 2, 2, 1);
  // Kabel über der Schulter
  g.fillStyle = '#ffd23f'; g.fillRect(-5, -8, 1, 16);
  // Kopf mit Headset
  pxEll(g, 0, 0, 5, 5, '#3a2a1a');
  g.fillStyle = '#f0c8a0'; g.fillRect(2, -3, 3, 6);
  g.fillStyle = '#222'; g.fillRect(-1, -6, 2, 12); g.fillRect(3, 3, 3, 1);
}
function drawRouter(g, e, dead) {
  const x = Math.round(e.x), y = Math.round(e.y);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 2, y + 3, 10, 6, 0, 0, TAU); g.fill();
  pxEll(g, x, y + 2, 9, 5, dead ? '#222' : '#14507a');
  g.fillStyle = dead ? '#222' : '#14507a'; g.fillRect(x - 9, y - 3, 19, 5);
  pxEll(g, x, y - 3, 9, 5, dead ? '#333' : '#2a7ab8');
  if (!dead) {
    g.fillStyle = '#ffffff';
    g.fillRect(x - 5, y - 4, 4, 1); g.fillRect(x + 2, y - 4, 4, 1); g.fillRect(x - 1, y - 7, 1, 3); g.fillRect(x, y - 2, 1, 3);
    g.fillStyle = Math.sin(T * 8 + x) > 0 ? '#7dff7a' : '#1a4a1a'; g.fillRect(x - 7, y + 2, 2, 1);
    for (let i = 0; i < e.hp; i++) { g.fillStyle = '#3fd0ff'; g.fillRect(x - 8 + i * 3, y - 13, 2, 2); }
    txt('ROUTER', x, y + 9, { g, font: FS, align: 'center', color: '#9fe0ff' });
  }
}
function drawTabluatorNet(g, e) {
  if (e.state === 'dead') return;
  g.lineWidth = 1;
  for (const c of tabluatorCables(e)) {
    g.strokeStyle = 'rgba(20,20,30,0.9)'; g.beginPath(); g.moveTo(c[0], c[1] + 1); g.lineTo(c[2], c[3] + 1); g.stroke();
    g.strokeStyle = e.mode === 'netz' ? 'rgba(63,208,255,0.75)' : 'rgba(63,208,255,0.3)';
    g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]); g.stroke();
  }
  if (e.mode === 'netz') {
    g.strokeStyle = `rgba(63,208,255,${0.5 + Math.sin(T * 8) * 0.25})`; g.lineWidth = 2;
    g.beginPath(); g.arc(e.x, e.y, 16, 0, TAU); g.stroke(); g.lineWidth = 1;
  }
}
function drawEnvelope(g, x, y, col) {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = '#000'; g.fillRect(x - 5, y - 4, 11, 8);
  g.fillStyle = '#fff'; g.fillRect(x - 4, y - 3, 9, 6);
  g.fillStyle = col; g.fillRect(x - 4, y - 3, 9, 1); g.fillRect(x - 3, y - 2, 2, 1); g.fillRect(x + 2, y - 2, 2, 1); g.fillRect(x - 1, y - 1, 3, 1);
}
