'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Koop: Spieler 2 (Controller / zweite Tastatur / online)
//  P2 Tastatur:  Pfeiltasten laufen   .  Angriff   ,  Aufheben/Werfen
//                -  Erledigen   Shift rechts  Fingerpistole   L  Benutzen
//  P2 Controller: linker Stick laufen, rechter Stick zielen, RT Angriff,
//                LT Aufheben/Werfen, A Erledigen, X Fingerpistole, Y Benutzen
// =====================================================================
const COOP = { on: false, padPrev: [] };
const NET = { mode: 'off', connected: false, remote: null };   // wird in net.js gefüllt

function coopActive() { return COOP.on || (NET.mode === 'host' && NET.conns && NET.conns.length > 0); }
function coopPad() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of gps) if (g && g.connected) return g;
  return null;
}
function coopKeyboardP2() { return COOP.on && NET.mode !== 'host' && !coopPad(); }

// Zielhilfe: nächster sichtbarer Gegner ungefähr in Blickrichtung
function aimAssist(p, baseAng, maxDist = 220, cone = 1.1) {
  let best = null, bs = 1e9;
  for (const e of G.enemies) {
    if (e.state === 'dead') continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d > maxDist) continue;
    const a = Math.atan2(e.y - p.y, e.x - p.x), off = Math.abs(angDiff(baseAng, a));
    if (off > cone || !los(p.x, p.y, e.x, e.y)) continue;
    const score = d + off * 120;
    if (score < bs) { bs = score; best = a; }
  }
  return best;
}
function inputP2(p) {
  if (NET.mode === 'host' && NET.connected) return netRemoteInput(p);
  const pad = coopPad();
  if (pad) {
    const ax = (i) => (Math.abs(pad.axes[i] || 0) > 0.22 ? pad.axes[i] : 0);
    const down = (i) => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
    const edge = (i) => { const now = down(i), was = COOP.padPrev[i]; COOP.padPrev[i] = now; return now && !was; };
    const mx = ax(0), my = ax(1), rx = ax(2), ry = ax(3);
    let aim = p.a;
    if (Math.hypot(rx, ry) > 0.35) aim = Math.atan2(ry, rx);
    else if (Math.hypot(mx, my) > 0.3) aim = Math.atan2(my, mx);
    const help = aimAssist(p, aim, 220, 0.35);
    const fp = edge(7), fp2 = edge(5), al = edge(6), al2 = edge(4);
    return { mx, my, aim: help != null ? help : aim, fire: down(7) || down(5), fireP: fp || fp2, alt: al || al2, exec: edge(0), finger: edge(2), use: edge(3), wave: edge(1) };
  }
  let mx = 0, my = 0;
  if (keys.ArrowUp) my--; if (keys.ArrowDown) my++; if (keys.ArrowLeft) mx--; if (keys.ArrowRight) mx++;
  let aim = mx || my ? Math.atan2(my, mx) : p.a;
  const help = aimAssist(p, aim);
  if (help != null) aim = help;
  return { mx, my, aim, fire: !!(keys.Period || keys.Numpad0), fireP: !!(pressed.Period || pressed.Numpad0), alt: !!(pressed.Comma || pressed.Numpad1),
    exec: !!(pressed.Slash || pressed.Minus || pressed.Numpad2), finger: !!(pressed.ShiftRight || pressed.Numpad3), use: !!(pressed.KeyL || pressed.Numpad4), wave: !!(pressed.KeyK || pressed.Numpad5) };
}
// freie Stelle neben einem Spieler suchen (Spawn / Wiederbelebung)
function spotNear(x, y) {
  for (let r = 10; r < 60; r += 6) for (let k = 0; k < 12; k++) {
    const a = k * TAU / 12, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
    const test = { x: nx, y: ny, r: 5 };
    if (!blocksMoveTile(Math.floor(nx / TS), Math.floor(ny / TS))) { resolve(test); if (dist(test.x, test.y, nx, ny) < 1) return [nx, ny]; }
  }
  return [x, y];
}
// Wiederbelebung im Koop: toter Spieler kommt nach ein paar Sekunden zurück (kostet 1 Herz)
function updateRevives(dt) {
  if (G.players.length < 2) return;
  const alive = G.players.filter((q) => q.alive);
  if (!alive.length) return;
  for (const p of G.players) {
    if (p.alive || p.reviveT <= 0) continue;
    p.reviveT -= dt;
    if (p.reviveT > 0) continue;
    if ((run.livesBy[p.idx] || 0) <= 0) { p.reviveT = 0; continue; }
    const q = alive[0], [nx, ny] = spotNear(q.x, q.y);
    Object.assign(p, { alive: true, x: nx, y: ny, invT: 2, weapon: null, execT: 0, vx: 0, vy: 0, deadT: 0 });
    if (typeof netTeleported === 'function') netTeleported(p);   // Online-Gast: diese Position übernehmen
    floatText(p.x, p.y - 20, 'WIEDER DA!', '#7dff7a'); Sound.play('heart');
    if (G.players.some((r) => r.alive)) Sound.muffle(false);
  }
}
