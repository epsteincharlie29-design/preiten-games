'use strict';
// =====================================================================
//  LIL PREITNER - Wireshark-Minispiel: Login-Paket finden, Tür öffnen
// =====================================================================
let WS = null;
const WS_PROTO = [
  ['TCP', 40], ['TLSv1.2', 12], ['UDP', 12], ['DNS', 12], ['HTTP', 9], ['ARP', 8], ['ICMP', 7],
];
const WS_COL = { TCP: '#e7e6ff', 'TLSv1.2': '#e7e6ff', UDP: '#daeeff', DNS: '#daeeff', HTTP: '#e4ffc7', ARP: '#faf0d7', ICMP: '#fce0ff' };
const wsIp = () => pick(['192.168.1.' + randi(2, 60), '10.0.0.' + randi(2, 30), '172.16.4.' + randi(2, 99), '8.8.8.8', '13.37.13.37', '192.168.1.1']);

function wsPacket(login) {
  const W_ = WS;
  let proto = 'TCP';
  if (login) proto = 'HTTP';
  else { let r = rand(100); for (const [p, w] of WS_PROTO) { r -= w; if (r <= 0) { proto = p; break; } } }
  let info = '', bad = false;
  switch (proto) {
    case 'TCP':
      if (Math.random() < 0.08) { info = '[TCP Retransmission] 443 → ' + randi(40000, 60000) + ' [PSH, ACK]'; bad = true; }
      else info = pick(['443', '80', '22', '3389']) + ' → ' + randi(40000, 60000) + ' ' + pick(['[ACK]', '[SYN]', '[SYN, ACK]', '[FIN, ACK]', '[PSH, ACK]']) + ' Seq=' + randi(1, 9999) + ' Win=502';
      break;
    case 'TLSv1.2': info = pick(['Application Data', 'Client Hello', 'Server Hello, Certificate']); break;
    case 'UDP': info = randi(1024, 65000) + ' → ' + pick(['5353', '1900', '123']) + ' Len=' + randi(20, 400); break;
    case 'DNS': info = pick(['Standard query 0x' + randi(4096, 65535).toString(16) + ' A tebleedd.ru', 'Standard query response A 13.37.13.37', 'Standard query A memes.example', 'Standard query AAAA packettracer.cisco']); break;
    case 'HTTP': info = login ? 'POST /login.php HTTP/1.1 (application/x-www-form-urlencoded)' : pick(['GET /memes/katze.png HTTP/1.1', 'HTTP/1.1 200 OK (text/html)', 'GET /favicon.ico HTTP/1.1', 'HTTP/1.1 404 Not Found', 'GET /schularbeit_noten.pdf HTTP/1.1']); break;
    case 'ARP': info = 'Who has 192.168.1.' + randi(1, 60) + '? Tell 192.168.1.' + randi(2, 60); break;
    case 'ICMP': info = pick(['Echo (ping) request  id=0x0001, seq=' + randi(1, 99), 'Echo (ping) reply    id=0x0001', 'Destination unreachable (Port unreachable)']); break;
  }
  return {
    no: ++W_.count, time: W_.t.toFixed(6), src: proto === 'ARP' ? 'Cisco_3a:2f:0' + randi(1, 9) : login ? '192.168.1.42' : wsIp(),
    dst: proto === 'ARP' ? 'Broadcast' : login ? '10.0.0.5' : wsIp(), proto, len: login ? 612 : randi(42, 1514), info, bad, login,
  };
}
// ---------------------------------------------------------------------
//  HACK-AKTIONEN: nach dem gefundenen Login-Paket wählt man, WAS gehackt wird.
//  HACK_ACTIONS[id] = { name, desc, col?, order? (klein = oben), avail?() -> bool (Host + Gast, nur einfache Daten lesen),
//                       run(p) (NUR Host/Einzelspieler; p = wer gehackt hat) }
//  Jede Aktion geht einmal pro Etage (G.modState.wsh.u). Der PC bleibt benutzbar, solange noch eine Aktion frei ist.
//  Online-Gast: das Minispiel läuft beim Gast, er schickt { t: 'hk', a: id, ti, fs } und der Host führt run(p) aus.
// ---------------------------------------------------------------------
const HACK_ACTIONS = {};
HACK_ACTIONS.doors = { name: 'TÜREN ENTRIEGELN', desc: 'ALLE SICHERHEITSTÜREN DIESER ETAGE GEHEN AUF.', col: '#39ff7a', order: 0,
  avail: () => G.locked.some((i) => G.tiles[i] === 'L'), run: () => unlockSecurity() };
HACK_ACTIONS.safes = { name: 'TRESORE ÖFFNEN', desc: 'ALLE TRESORE SPRINGEN AUF. GELD REGNET.', col: '#ffe14d', order: 40,
  avail: () => G.tiles.includes('Z'),
  run: () => { for (let i = 0; i < G.tiles.length; i++) if (G.tiles[i] === 'Z') damageSafe(i % G.w, (i / G.w) | 0, 99); } };
const wsUsed = () => (G && G.modState && G.modState.wsh && Array.isArray(G.modState.wsh.u) ? G.modState.wsh.u : []);
// freie Aktionen (sortiert)
function wsActions() {
  if (!G) return [];
  const used = wsUsed();
  return Object.keys(HACK_ACTIONS).filter((id) => {
    const A = HACK_ACTIONS[id];
    if (!A || used.includes(id) || typeof (A.run || A.apply) !== 'function') return false;
    return typeof A.avail !== 'function' || !!extCall(A.avail);
  }).sort((a, b) => (HACK_ACTIONS[a].order == null ? 50 : HACK_ACTIONS[a].order) - (HACK_ACTIONS[b].order == null ? 50 : HACK_ACTIONS[b].order));
}
const wsHackLeft = () => wsActions().length;
// Host / Einzelspieler: Aktion ausführen
function wsRun(id, p) {
  const A = HACK_ACTIONS[id];
  if (!A || !G) return false;
  if (!G.modState.wsh) G.modState.wsh = { u: [] };
  G.modState.wsh.u.push(id);
  extCall(A.run || A.apply, p);
  if (!wsActions().length) G.hacked = true;   // PC ist "fertig" (grüner Bildschirm, kein [E] mehr)
  if (p) floatText(p.x, p.y - 20, (A.name || A.label || id) + '!', 'rainbow');
  Sound.play('clear');
  return true;
}
// Host: ein Online-Gast hat gehackt
function wsGuestHack(m, ent) {
  if (!G || !NET.inLevel || m.fs !== NET.floorSeq || typeof m.a !== 'string') return;
  const p = G.players.find((q) => q.idx === ent.idx);
  const near = p && p.alive && G.terminals.some((i) => dist(p.x, p.y, (i % G.w) * TS + 8, ((i / G.w) | 0) * TS + 8) < 72);
  const ok = near && wsActions().includes(m.a) && wsRun(m.a, p);
  if (!ok) { try { ent.conn.send({ t: 'hkno' }); } catch (e) { /* egal */ } }
}
function openWireshark(o = {}) {
  WS = { t: 0, count: 0, list: [], filter: '', paused: false, sel: null, omgT: 0, spawnT: 0, loginT: rand(4, 6), done: 0, err: false,
    guest: !!o.guest, ti: o.ti == null ? -1 : o.ti, p: o.p || null, acts: null, menu: null, mi: 0 };
  setState('wireshark'); Sound.play('glitch');
}
// Wireshark schließen; id = gewählte Aktion (oder nichts)
function wsClose(id) {
  const S = WS;
  WS = null;
  if (S && S.guest) {
    if (state === 'wireshark') setState('netplay');
    if (id && NET.mode === 'client') {
      netSend({ t: 'hk', a: id, ti: S.ti, fs: NET.floorSeq });
      if (G && G.player) floatText(G.player.x, G.player.y - 20, 'HACK GESENDET...', '#3fd0ff', true);
    }
    return;
  }
  if (state === 'wireshark') setState('play');
  if (id && G) wsRun(id, S && S.p && S.p.alive ? S.p : G.player);
}
function wsFilterOk(f) { return f === '' || ['tcp', 'udp', 'dns', 'http', 'arp', 'icmp', 'tls'].includes(f); }
function wsVisible() {
  const f = WS.filter.trim().toLowerCase();
  if (!wsFilterOk(f) || f === '') return WS.list;
  return WS.list.filter((p) => p.proto.toLowerCase().startsWith(f));
}
function screenWireshark(dt) {
  const S = WS;
  if (!S || !G) { WS = null; setState(NET.mode === 'client' ? 'netplay' : 'play'); return; }
  if (S.guest) {   // Online-Gast: das Spiel beim Host läuft weiter -> Bild + Schnappschüsse weiter verarbeiten
    if (NET.mode !== 'client' || !G.player || !G.player.alive) { wsClose(); return; }
    netClientUpdate(dt, true); netClientRender();
    if (state !== 'wireshark' || WS !== S) return;
  } else { renderWorld(); drawHUD(); }
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  S.t += dt;
  if (S.menu) { wsMenu(S); return; }
  if (S.done > 0) {
    S.done -= dt;
    if (S.done <= 0) {
      S.acts = wsActions();
      if (S.acts.length <= 1) { wsClose(S.acts[0]); return; }
      S.menu = S.acts; S.mi = 0; Sound.play('select');
      wsMenu(S); return;
    }
  }
  // Pakete einsammeln
  if (!S.paused && S.done <= 0) {
    S.spawnT -= dt; S.loginT -= dt;
    while (S.spawnT <= 0) {
      S.spawnT += 1 / 22;
      S.list.push(wsPacket(false));
      if (S.loginT <= 0) { S.loginT = rand(5, 8); S.list.push(wsPacket(true)); }
    }
    if (S.list.length > 300) S.list.splice(0, S.list.length - 300);
  }
  // Eingabe: Filter tippen
  if (S.done <= 0) {
    for (const ch of typed) if (/[a-zA-Z0-9.]/.test(ch) && S.filter.length < 20) S.filter += ch;
    if (pressed.Backspace) S.filter = S.filter.slice(0, -1);
    if (pressed.Space) { S.paused = !S.paused; Sound.play('click'); }
    if (pressed.Escape) { wsClose(); return; }
  }
  // Fenster
  const X = 14, Y = 10, Wd = W - 28, Hd = H - 22;
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(X, Y, Wd, Hd);
  ctx.fillStyle = '#d8d8d8'; ctx.fillRect(X, Y, Wd, 12);
  ctx.fillStyle = '#1f6fd0'; ctx.beginPath(); ctx.moveTo(X + 6, Y + 10); ctx.lineTo(X + 11, Y + 2); ctx.lineTo(X + 13, Y + 10); ctx.fill();
  txt('Wireshark  -  ' + (S.paused ? 'Aufnahme gestoppt' : 'Capturing from eth0') + '  -  KABELZENTRALE', X + 18, Y + 2, { font: FS, color: '#222222', outline: '' });
  txt('X', X + Wd - 10, Y + 2, { font: FS, color: '#aa0000', outline: '' });
  // Werkzeugleiste
  ctx.fillStyle = '#e6e6e6'; ctx.fillRect(X, Y + 12, Wd, 12);
  ctx.fillStyle = '#1f6fd0'; ctx.fillRect(X + 4, Y + 14, 8, 8);
  ctx.fillStyle = S.paused ? '#888' : '#d02020'; ctx.fillRect(X + 16, Y + 14, 8, 8);
  txt(S.paused ? '[LEERTASTE] = WEITER AUFNEHMEN' : '[LEERTASTE] = AUFNAHME STOPPEN', X + 30, Y + 15, { font: FS, color: '#333333', outline: '' });
  // Filterleiste
  const fOk = wsFilterOk(S.filter.trim().toLowerCase());
  ctx.fillStyle = S.filter === '' ? '#ffffff' : fOk ? '#afffaf' : '#ffafaf'; ctx.fillRect(X + 4, Y + 26, Wd - 8, 11);
  ctx.strokeStyle = '#999'; ctx.strokeRect(X + 4.5, Y + 26.5, Wd - 9, 10);
  txt(S.filter === '' ? 'Anzeigefilter anwenden ... (TIPPEN, Z.B. http)' : S.filter + (Math.floor(T * 2) % 2 ? '|' : ''), X + 8, Y + 28, { font: FS, color: S.filter === '' ? '#999999' : '#111111', outline: '' });
  // Tabelle
  const cols = [['No.', 26], ['Time', 50], ['Source', 76], ['Destination', 70], ['Proto', 44], ['Len', 30], ['Info', 0]];
  let cx = X + 4;
  const TY = Y + 40;
  ctx.fillStyle = '#e0e0e0'; ctx.fillRect(X + 4, TY, Wd - 8, 9);
  for (const [n, w] of cols) { txt(n, cx + 1, TY + 1, { font: FS, color: '#222222', outline: '' }); cx += w; }
  const vis = wsVisible(), rows = 15;
  const show = vis.slice(Math.max(0, vis.length - rows));
  show.forEach((pk, i) => {
    const ry = TY + 10 + i * 9;
    const sel = S.sel === pk;
    ctx.fillStyle = sel ? '#3875d7' : pk.bad ? '#a40000' : WS_COL[pk.proto] || '#ffffff';
    ctx.fillRect(X + 4, ry, Wd - 8, 9);
    const tc = sel ? '#ffffff' : pk.bad ? '#fffc9c' : '#111111';
    const vals = [pk.no, pk.time, pk.src, pk.dst, pk.proto, pk.len, pk.info];
    let x2 = X + 4;
    cols.forEach(([, w], k) => { txt(String(vals[k]).slice(0, k === 6 ? 46 : 14), x2 + 1, ry + 1, { font: FS, color: tc, outline: '' }); x2 += w; });
    if (mouse.pl && mouse.y >= ry && mouse.y < ry + 9 && mouse.x > X && mouse.x < X + Wd && S.done <= 0) {
      S.sel = pk; Sound.play('blip', true);
      if (pk.login) { S.acts = wsActions(); S.done = S.acts.length > 1 ? 1.4 : 2.6; Sound.play('win'); }
    }
  });
  // Details
  const DY = TY + 12 + rows * 9;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 4, DY, Wd - 8, Y + Hd - DY - 4);
  ctx.strokeStyle = '#bbb'; ctx.strokeRect(X + 4.5, DY + 0.5, Wd - 9, Y + Hd - DY - 5);
  if (S.sel) {
    const pk = S.sel;
    const lines = ['> Frame ' + pk.no + ': ' + pk.len + ' bytes on wire', '> Internet Protocol Version 4, Src: ' + pk.src + ', Dst: ' + pk.dst];
    if (pk.login) lines.push('v HTML Form URL Encoded: application/x-www-form-urlencoded', '    Form item: "user" = "kumi"', '    Form item: "pass" = "cisco123"');
    else lines.push('> ' + pk.proto + ': ' + pk.info.slice(0, 60), '  (KEIN PASSWORT HIER... WEITERSUCHEN!)');
    lines.forEach((l, i) => txt(l, X + 8, DY + 3 + i * 9, { font: FS, color: pk.login && i >= 3 ? '#c41f2a' : '#222222', outline: '' }));
  } else {
    txt('KLICK AUF EIN PAKET, UM ES ANZUSEHEN. GESUCHT: DAS LOGIN-PAKET (HTTP POST /login.php)', X + 8, DY + 4, { font: FS, color: '#555555', outline: '' });
    txt('[ESC] = PC VERLASSEN', X + 8, DY + 14, { font: FS, color: '#888888', outline: '' });
  }
  // "DA PASSIERT VIEL OMG"
  if (S.t > 0.9 && S.t < 3.4) {
    const k = Math.min(1, (S.t - 0.9) * 6);
    ctx.save(); ctx.translate(W / 2 + rand(-2, 2), H / 2 + rand(-2, 2)); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(-190, -30, 380, 60);
    ctx.strokeStyle = neon(0); ctx.lineWidth = 2; ctx.strokeRect(-190, -30, 380, 60);
    txt('DA PASSIERT VIEL OMG', 0, -12, { size: 16, align: 'center', color: (i) => neon(i * 2), wave: 3 });
    ctx.restore();
    if (Math.floor(S.t * 10) !== Math.floor((S.t - dt) * 10)) Sound.play('blip', Math.random() < 0.5);
  }
  if (S.done > 0) {
    ctx.fillStyle = 'rgba(0,40,0,0.85)'; ctx.fillRect(W / 2 - 170, H / 2 - 26, 340, 52);
    ctx.strokeStyle = '#39ff7a'; ctx.strokeRect(W / 2 - 169.5, H / 2 - 25.5, 339, 51);
    txt('PASSWORT GEFUNDEN: cisco123', W / 2, H / 2 - 16, { align: 'center', color: '#39ff7a' });
    const a = S.acts || [], A = a.length === 1 ? HACK_ACTIONS[a[0]] : null;
    txt(a.length > 1 ? 'ZUGRIFF ERTEILT! ADMIN-MENÜ WIRD GELADEN...' : A ? (A.name || A.label || a[0]) + '...' : 'HIER GIBT ES NICHTS MEHR ZU HACKEN.', W / 2, H / 2 + 4, { font: FS, align: 'center', color: '#ffffff' });
  }
}
// Auswahl nach dem Hack: Zahlen / W S + ENTER / Maus. ESC = ohne Aktion raus.
function wsMenu(S) {
  const list = S.menu, n = list.length;
  if (pressed.KeyW || pressed.ArrowUp) { S.mi = (S.mi + n - 1) % n; Sound.play('blip', true); }
  if (pressed.KeyS || pressed.ArrowDown) { S.mi = (S.mi + 1) % n; Sound.play('blip', true); }
  for (let k = 0; k < Math.min(n, 9); k++) if (pressed['Digit' + (k + 1)] || pressed['Numpad' + (k + 1)]) { wsClose(list[k]); return; }
  const rh = 22, Wd = 330, Hd = 40 + n * rh, X = Math.round(W / 2 - Wd / 2), Y = Math.round(H / 2 - Hd / 2);
  ctx.fillStyle = 'rgba(0,16,8,0.92)'; ctx.fillRect(X, Y, Wd, Hd);
  ctx.strokeStyle = '#39ff7a'; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, Y + 0.5, Wd - 1, Hd - 1);
  txt('ROOT-ZUGRIFF! WAS WILLST DU HACKEN?', W / 2, Y + 6, { align: 'center', color: '#39ff7a' });
  list.forEach((id, k) => {
    const A = HACK_ACTIONS[id] || {}, ry = Y + 24 + k * rh;
    if (mouse.x > X && mouse.x < X + Wd && mouse.y >= ry && mouse.y < ry + rh) { if (S.mi !== k) Sound.play('blip', true); S.mi = k; if (mouse.pl) { wsClose(id); return; } }
    const on = S.mi === k;
    if (on) { ctx.fillStyle = 'rgba(57,255,122,0.18)'; ctx.fillRect(X + 4, ry, Wd - 8, rh - 2); }
    txt((k < 9 ? '[' + (k + 1) + '] ' : '') + (A.name || A.label || id), X + 10, ry + 2, { color: on ? (A.col || '#39ff7a') : '#cfe8d8' });
    txt(String(A.desc || '').slice(0, 64), X + 10, ry + 12, { font: FS, color: on ? '#ffffff' : '#7a9a88', outline: '' });
  });
  if (!WS) return;
  txt('[ESC] = DOCH NICHTS HACKEN', W / 2, Y + Hd + 4, { font: FS, align: 'center', color: '#888888' });
  if (pressed.Enter || pressed.Space || pressed.KeyE) { wsClose(list[S.mi]); return; }
  if (pressed.Escape) wsClose();
}
