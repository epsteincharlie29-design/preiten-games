'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Online-Koop mit Code (bis 4 Spieler)
//  Verbunden wird über öffentliche Relay-Server (MQTT über WebSocket):
//  das klappt auch im Schul-WLAN, hinter VPN und strengen Routern.
//  Der Code (4 Buchstaben) ist der Treffpunkt. Reserve: direkte Verbindung (PeerJS).
//  HOST: rechnet das ganze Spiel (Gegner, Treffer, Geld) und schickt 15x pro
//        Sekunde einen Schnappschuss + Effekte (Blut, Funken, Sounds, Texte).
//  GAST: schickt nur Tasten + Zielrichtung und zeigt das Bild vom Host an.
//  Anrufe (Dialoge) sehen alle gleichzeitig. Der Host blättert, Gäste dürfen "weiter" drücken.
//  Gegen Lag: klappt nebenbei eine DIREKTE Verbindung (wie in den ersten Versionen), laufen die
//  Daten ohne Umweg. Der Gast bewegt seine Figur sofort selbst, alles andere wird geglättet.
// =====================================================================
const NET_PREFIX = 'hottepreitenline-';
// Spielversion: Host und Gäste brauchen die gleiche (bei jedem Update ändern!)
const NET_VER = '2026-10-09-boerse';   // s2b: Benutzernamen (hello/me/cp "n", Spielerliste "ros"); s2c: Gast hackt ('hk'), Gast startet Aufträge ('go'), interaktive Level-Elemente
const NET_SNAP = 1 / 15, NET_SNAP_MS = 1000 / 15;
const NET_EDGES = ['fireP', 'alt', 'exec', 'finger', 'use', 'wave'];
const NET_SKIP = new Set(['path', 'pathT', 'target', 'execTarget', 'src', 'lastSeen', 'hits', 'hit', 'route', 'owner', 'nfx', 'nfy', '_h', '_d']);
Object.assign(NET, { conns: [], myIdx: 1, others: {}, status: '', code: '', peer: null, conn: null, relay: null, nidSeq: 0, fx: [], fxDepth: 0, inLevel: false, floorSeq: 0, edges: {}, sendT: 0 });

// =====================================================================
//  RELAY-SERVER: öffentliche MQTT-Broker (kostenlos, ohne Anmeldung).
//  Der Host hängt an allen, jeder Gast nimmt den, über den der Host antwortet.
//  Themen: <ROOT><CODE>/h/<gast> = an den Host, <ROOT><CODE>/g/<gast> = an den Gast,
//          <ROOT><CODE>/x = Host ist weg (letzter Wille), <ROOT>pub/<CODE> = öffentliches Spiel
// =====================================================================
// Reihenfolge = Vorliebe (schnellster zuerst). Gemessen im Schul-WLAN: HiveMQ 51 ms, Coreflux 58 ms,
// Mosquitto 67 ms, shiftr 160-460 ms (bremst). broker.hivemq.com sperren manche Schulen -> Zweitname zuerst.
const RELAY_BROKERS = [
  { urls: ['wss://mqtt-dashboard.com:8884/mqtt', 'wss://broker.hivemq.com:8884/mqtt'] },
  { urls: ['wss://iot.coreflux.cloud:443/mqtt'] },   // Port 443: kommt durch fast jede Firewall
  { urls: ['wss://test.mosquitto.org:8081'] },
  { urls: ['wss://public.cloud.shiftr.io'], user: 'public', pass: 'public' },   // langsam, nur zur Not
];
const RELAY_ROOT = 'hottepreitenline/v2/';
const NET_Z = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
const MQ_ENC = new TextEncoder(), MQ_DEC = new TextDecoder();
const netRid = (n) => { let s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); };
function mqCat(...parts) { let n = 0; for (const p of parts) n += p.length; const o = new Uint8Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; }
function mqStr(s) { const b = typeof s === 'string' ? MQ_ENC.encode(s) : s; const o = new Uint8Array(2 + b.length); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; }
function mqPkt(type, body) { const h = [type]; let x = body.length; do { let d = x % 128; x = Math.floor(x / 128); if (x > 0) d |= 128; h.push(d); } while (x > 0); return mqCat(new Uint8Array(h), body); }
// Mini-MQTT-Client (nur QoS 0): verbinden, abonnieren, senden, "letzter Wille".
// B.urls = Adressen desselben Servers: ist eine gesperrt, kommt die nächste dran.
function mqOpen(B, id, will) {
  const m = { B, ready: false, dead: false, pid: 1, onReady: null, onSub: null, onMsg: null, onDown: null };
  let ws = null, buf = new Uint8Array(0), ui = 0;
  const raw = (p) => { if (ws && ws.readyState === 1) ws.send(p); };
  const shut = () => { m.dead = true; m.ready = false; clearInterval(m.pingI); clearTimeout(m.connT); try { if (ws) ws.close(); } catch (e) { /* egal */ } };
  const down = () => { if (m.downDone) return; m.downDone = true; shut(); if (m.onDown) m.onDown(); };
  m.close = () => { m.downDone = true; shut(); };
  m.pub = (topic, payload, retain) => raw(mqPkt(0x30 | (retain ? 1 : 0), mqCat(mqStr(topic), payload)));
  m.sub = (topics) => { const pid = (m.pid++ & 0xffff) || 1; raw(mqPkt(0x82, mqCat(new Uint8Array([pid >> 8, pid & 255]), ...topics.map((t) => mqCat(mqStr(t), new Uint8Array([0])))))); };
  const next = () => {   // diese Adresse klappt nicht: die nächste probieren
    if (m.downDone || m.ready) return;
    if (ws) { ws.onclose = null; ws.onmessage = null; try { ws.close(); } catch (e) { /* egal */ } }
    if (++ui < B.urls.length) connect(); else down();
  };
  const connect = () => {
  buf = new Uint8Array(0);
  clearTimeout(m.connT);
  try { ws = new WebSocket(B.urls[ui], 'mqtt'); } catch (e) { setTimeout(next, 0); return; }
  m.ws = ws; m.url = B.urls[ui]; ws.binaryType = 'arraybuffer';
  m.connT = setTimeout(next, 5000);
  ws.onopen = () => {
    let flags = 0x02; const tail = [];
    if (will) { flags |= 0x04; tail.push(mqStr(will.topic), mqStr(will.payload)); }
    if (B.user) { flags |= 0x80; tail.push(mqStr(B.user)); }
    if (B.pass) { flags |= 0x40; tail.push(mqStr(B.pass)); }
    raw(mqPkt(0x10, mqCat(new Uint8Array([0, 4, 77, 81, 84, 84, 4, flags, 0, 120]), mqStr(id), ...tail)));
  };
  ws.onmessage = (ev) => {
    buf = buf.length ? mqCat(buf, new Uint8Array(ev.data)) : new Uint8Array(ev.data);
    for (;;) {
      if (buf.length < 2) return;
      let mul = 1, len = 0, i = 1, b;
      do { if (i >= buf.length) return; b = buf[i++]; len += (b & 127) * mul; mul *= 128; } while (b & 128);
      if (buf.length < i + len) return;
      const type = buf[0] >> 4, fl = buf[0] & 15, body = buf.subarray(i, i + len);
      buf = buf.subarray(i + len);
      if (type === 2) {   // CONNACK
        clearTimeout(m.connT);
        if (body[1] !== 0) { next(); return; }
        m.ready = true;
        m.pingI = setInterval(() => raw(new Uint8Array([0xc0, 0])), 30000);
        if (m.onReady) m.onReady();
      } else if (type === 3) {   // PUBLISH
        const tl = (body[0] << 8) | body[1], topic = MQ_DEC.decode(body.subarray(2, 2 + tl));
        let p = 2 + tl; if ((fl >> 1) & 3) p += 2;
        if (m.onMsg) m.onMsg(topic, body.slice(p));
      } else if (type === 9 && m.onSub) m.onSub();   // SUBACK
    }
  };
  ws.onerror = () => { /* kommt gleich als close */ };
  ws.onclose = () => { if (m.ready) down(); else next(); };
  };
  connect();
  return m;
}
// Nachrichten: 1 Byte Format (0 = Text, 1 = gepackt) + JSON
const relayRaw = (m) => mqCat(new Uint8Array([0]), MQ_ENC.encode(JSON.stringify(m)));
function relayRawDec(b) { if (!b || !b.length || b[0] !== 0) return null; try { return JSON.parse(MQ_DEC.decode(b.subarray(1))); } catch (e) { return null; } }
async function relayZip(s) { const st = new Blob([s]).stream().pipeThrough(new CompressionStream('deflate')); return new Uint8Array(await new Response(st).arrayBuffer()); }
async function relayDec(b) {
  if (!b || !b.length) return null;
  if (b[0] !== 1) return relayRawDec(b);
  const st = new Blob([b.subarray(1)]).stream().pipeThrough(new DecompressionStream('deflate'));
  return JSON.parse(await new Response(st).text());
}
// dieselbe Nachricht für mehrere Gäste nur einmal einpacken
function relayEnc(m, z) {
  if (NET.encM === m && NET.encZ === z) return NET.encP;
  const s = JSON.stringify(m);
  const p = z && s.length > 16000 ? relayZip(s).then((b) => mqCat(new Uint8Array([1]), b)) : Promise.resolve(mqCat(new Uint8Array([0]), MQ_ENC.encode(s)));
  NET.encM = m; NET.encZ = z; NET.encP = p;
  return p;
}
// eine Verbindung über einen Relay-Server (sieht für den Rest aus wie eine PeerJS-Verbindung).
// Klappt nebenbei eine DIREKTE Verbindung (attachP2P), laufen die Daten ab dann direkt.
// Umschalten ohne Durcheinander: jede Seite schickt als letzte Server-Nachricht "_sw"; was direkt
// schon vorher ankommt, wartet, bis dieses "_sw" da ist.
function relayConn(mq, topic, z) {
  const h = {};
  const c = {
    open: false, relay: true, mq, z, lastRx: performance.now(), tx: Promise.resolve(), rx: Promise.resolve(), onClose: null,
    p2p: null, txP2P: false, rxP2P: false, p2pBuf: [], p2pTries: 0,
    on(ev, f) { (h[ev] || (h[ev] = [])).push(f); return c; },
    emit(ev, a) { for (const f of h[ev] || []) { try { f(a); } catch (e) { console.error(e); } } },
    relaySend(m) {
      if (mq.dead) return;
      const p = relayEnc(m, c.z);
      c.tx = c.tx.then(() => p).then((b) => { if (!mq.dead) mq.pub(topic, b); }).catch(() => { /* egal */ });
    },
    send(m) {
      if (!c.open) return;
      const d = c.p2p;
      if (c.txP2P && d && d.open) {
        if (m.t === 'snap' && d.dataChannel && d.dataChannel.bufferedAmount > 300000) return;
        try { d.send(m); } catch (e) { /* egal */ }
        return;
      }
      if (m.t === 'snap' && mq.ws && mq.ws.bufferedAmount > 300000) return;   // Leitung voll: Schnappschuss auslassen
      c.relaySend(m);
    },
    recv(b) {
      c.lastRx = performance.now();
      c.rx = c.rx.then(() => relayDec(b)).then((m) => {
        if (!m || !c.open) return;
        if (m.t === '_sw') { c.rxP2P = true; const q = c.p2pBuf; c.p2pBuf = []; for (const x of q) c.emit('data', x); return; }
        const direct = c.p2p && c.p2p.open;
        if (m.t === '_leave') { if (!direct) c.close(); return; }   // Server-Verbindung des Gasts weg
        if (m.t === 'bye' && direct) return;   // nur die Server-Verbindung ist weg, direkt läuft es weiter
        if (c.rxP2P) { c.rxP2P = false; c.txP2P = false; }   // die andere Seite ist zurück auf dem Server
        c.emit('data', m);
      }).catch(() => { /* kaputte Nachricht */ });
    },
    attachP2P(pc) {
      if (c.p2p) { try { c.p2p.close(); } catch (e) { /* egal */ } }
      c.p2p = pc; c.p2pBuf = []; c.rxP2P = false; c.txP2P = false; c.p2pTries++;
      pc.on('open', () => {
        if (!c.open || c.p2p !== pc) { try { pc.close(); } catch (e) { /* egal */ } return; }
        c.relaySend({ t: '_sw' });   // letzte Nachricht über den Server, ab jetzt direkt
        c.txP2P = true;
        netHostStatus();
      });
      pc.on('data', (m) => {
        if (c.p2p !== pc || !c.open || !m) return;
        c.lastRx = performance.now();
        if (!c.rxP2P) { if (c.p2pBuf.length < 3000) c.p2pBuf.push(m); return; }
        c.emit('data', m);
      });
      const lost = () => {
        if (c.p2p !== pc) return;
        c.p2p = null; c.txP2P = false; c.rxP2P = false;
        const q = c.p2pBuf; c.p2pBuf = []; for (const x of q) c.emit('data', x);
        netHostStatus();
        if (c.open && c.retryDirect && c.p2pTries < 3) setTimeout(() => { if (c.open && !c.p2p) c.retryDirect(); }, 15000);
      };
      pc.on('close', lost); pc.on('error', lost);
    },
    close() {
      if (!c.open) return;
      c.open = false;
      const d = c.p2p; c.p2p = null; c.txP2P = false;
      if (d) { try { d.close(); } catch (e) { /* egal */ } }
      if (c.onClose) c.onClose();
      c.emit('close');
    },
  };
  return c;
}
// ---------- Host: an allen Servern auf Gäste warten ----------
function relayHost() {
  const R = { host: true, pub: NET.pub, code: NET.code, base: RELAY_ROOT + NET.code + '/', mqs: [], conns: {}, advT: -1e9 };
  NET.relay = R;
  RELAY_BROKERS.forEach((B, bi) => relayHostBroker(R, B, bi, 0));
}
function relayHostBroker(R, B, bi, tries) {
  if (NET.relay !== R) return;
  const mq = mqOpen(B, 'hplh' + netRid(12), { topic: R.base + 'x', payload: relayRaw({ t: 'bye' }) });
  R.mqs[bi] = mq;
  mq.onReady = () => mq.sub([R.base + 'h/+']);
  mq.onSub = () => { netHostStatus(); relayAdvertise(true); };
  mq.onMsg = (topic, b) => relayHostMsg(R, mq, topic, b);
  mq.onDown = () => {
    if (NET.relay !== R) return;
    for (const gid in R.conns) { const c = R.conns[gid]; if (c.mq === mq && !(c.p2p && c.p2p.open)) c.close(); }
    netHostStatus();
    setTimeout(() => relayHostBroker(R, B, bi, tries + 1), Math.min(15000, 2000 * (tries + 1)));   // neu verbinden
  };
}
function relayHostMsg(R, mq, topic, b) {
  if (NET.relay !== R) return;
  const gid = topic.slice(topic.lastIndexOf('/') + 1), c = R.conns[gid];
  if (c) { if (c.mq === mq) c.recv(b); return; }
  // neuer Gast: die erste Nachricht ist "_join"
  const m = relayRawDec(b);
  if (!m || m.t !== '_join' || !/^[a-z0-9]{6,24}$/.test(gid)) return;
  const reply = (msg) => mq.pub(R.base + 'g/' + gid, relayRaw(msg));
  if (m.v !== NET_VER) { reply({ t: 'ver', v: NET_VER }); return; }
  if (NET.conns.length >= 3) { reply({ t: 'full' }); return; }
  const c2 = relayConn(mq, R.base + 'g/' + gid, !!(m.z && NET_Z));
  c2.onClose = () => { if (R.conns[gid] === c2) delete R.conns[gid]; };
  R.conns[gid] = c2;
  c2.open = true;
  c2.send({ t: '_ok', z: NET_Z ? 1 : 0 });
  netBind(c2);
  c2.emit('open');
}
// öffentliches Spiel: "Aushang" mit Code + Spielerzahl (bleibt am Server hängen)
function relayAdvertise(force) {
  const R = NET.relay;
  if (!R || !R.host || !R.pub || NET.mode !== 'host') return;
  const now = performance.now();
  if (!force && now - R.advT < 20000) return;
  R.advT = now;
  const msg = relayRaw({ c: R.code, n: NET.conns.length + 1, v: NET_VER, at: Date.now() });
  for (const mq of R.mqs) if (mq && mq.ready) mq.pub(RELAY_ROOT + 'pub/' + R.code, msg, true);
}
// zumachen: erst die letzten Nachrichten rausschicken (und den Aushang abnehmen)
function relayShutdown(R) {
  R.done = true; clearTimeout(R.t); clearInterval(R.chk);
  setTimeout(() => {
    if (R.host && R.pub) for (const mq of R.mqs) if (mq && mq.ready) mq.pub(RELAY_ROOT + 'pub/' + R.code, new Uint8Array(0), true);
    setTimeout(() => { for (const mq of R.mqs) if (mq) mq.close(); }, 200);
  }, 250);
}
// ---------- Gast: über die Server beim Host anklopfen ----------
function relayJoin(code, ms, onFail) {
  const R = { host: false, code, base: RELAY_ROOT + code + '/', gid: netRid(12), mqs: [], conn: null, done: false };
  NET.relay = R;
  const fail = (why) => {
    if (R.done || R.conn || NET.relay !== R) return;
    R.done = true; clearTimeout(R.t); clearInterval(R.chk);
    for (const mq of R.mqs) if (mq) mq.close();
    NET.relay = null;
    onFail(why);
  };
  R.t = setTimeout(() => fail('none'), ms);
  // überall angeklopft und keiner antwortet? Dann gibt es den Code (dort) nicht
  R.chk = setInterval(() => {
    const alive = R.mqs.filter((o) => o && !o.dead), now = performance.now();
    if (alive.length && alive.every((o) => o.joinAt && now - o.joinAt > 2500)) fail('none');
  }, 250);
  const join = relayRaw({ t: '_join', v: NET_VER, z: NET_Z ? 1 : 0 });
  RELAY_BROKERS.forEach((B, bi) => {
    const mq = mqOpen(B, 'hplg' + R.gid + bi, { topic: R.base + 'h/' + R.gid, payload: relayRaw({ t: '_leave' }) });
    R.mqs[bi] = mq;
    mq.onReady = () => mq.sub([R.base + 'g/' + R.gid, R.base + 'x']);
    // erst am ersten Server anklopfen, an den anderen etwas später (falls der Host dort nicht ist)
    mq.onSub = () => setTimeout(() => { if (!R.conn && !R.done && !mq.dead) { mq.pub(R.base + 'h/' + R.gid, join); mq.joinAt = performance.now(); } }, bi * 300);
    mq.onMsg = (topic, b) => {
      if (NET.relay !== R) return;
      if (R.conn) { if (R.conn.mq === mq) R.conn.recv(b); return; }
      const m = relayRawDec(b);
      if (!m || R.done) return;
      if (m.t === 'full' || m.t === 'ver') { fail(m.t); return; }
      if (m.t !== '_ok') return;
      clearTimeout(R.t); clearInterval(R.chk);
      for (const o of R.mqs) if (o && o !== mq) o.close();
      const c = relayConn(mq, R.base + 'h/' + R.gid, !!(m.z && NET_Z));
      c.onClose = () => setTimeout(() => mq.close(), 300);
      R.conn = c;
      netBind(c);
      c.open = true; c.emit('open');
      c.retryDirect = () => netTryDirect(c, R.gid, code);
      netTryDirect(c, R.gid, code);
    };
    mq.onDown = () => {
      if (NET.relay !== R) return;
      if (R.conn) { if (R.conn.mq === mq && !(R.conn.p2p && R.conn.p2p.open)) R.conn.close(); return; }
      if (R.mqs.length === RELAY_BROKERS.length && R.mqs.every((o) => o.dead)) fail('down');
    };
  });
}
// ---------- Schnell beitreten: Aushänge der öffentlichen Spiele lesen ----------
function relayFind(cb) {
  const R = { find: true, mqs: [], seen: {}, done: false };
  NET.relay = R;
  let left = RELAY_BROKERS.length;
  const finish = () => {
    if (R.done) return;
    R.done = true; clearTimeout(R.t);
    for (const mq of R.mqs) if (mq) mq.close();
    if (NET.relay === R) NET.relay = null;
    const now = Date.now();
    cb(Object.values(R.seen).filter((a) => a.v === NET_VER && a.n < 4 && Math.abs(now - a.at) < 180000).sort((a, b) => b.at - a.at).map((a) => a.c));
  };
  const one = (mq) => { if (mq.counted) return; mq.counted = true; if (--left <= 0) finish(); };
  R.t = setTimeout(finish, 6000);
  RELAY_BROKERS.forEach((B, bi) => {
    const mq = mqOpen(B, 'hplf' + netRid(12) + bi, null);
    R.mqs[bi] = mq;
    mq.onReady = () => mq.sub([RELAY_ROOT + 'pub/+']);
    mq.onSub = () => setTimeout(() => one(mq), 1500);
    mq.onMsg = (topic, b) => {
      const a = relayRawDec(b);
      if (a && typeof a.c === 'string' && /^[A-Z]{4}$/.test(a.c) && typeof a.at === 'number') { const o = R.seen[a.c]; if (!o || o.at < a.at) R.seen[a.c] = a; }
    };
    mq.onDown = () => one(mq);
  });
}

// =====================================================================
//  RESERVE: direkte Verbindung (PeerJS / WebRTC). Die kostenlosen TURN-Umleitungen
//  (PeerJS, openrelay) gibt es nicht mehr - dafür sind jetzt die Relay-Server da.
// =====================================================================
const NET_LIBS = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
const NET_ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
const netPeerOpts = () => ({ debug: 0, config: NET_ICE });
function netLoadLib(cb, fail, src = 0) {
  if (window.Peer) { cb(); return; }
  if (NET.libLoading && src === 0) { NET.libWait.push([cb, fail]); return; }
  NET.libLoading = true; if (src === 0) NET.libWait = [[cb, fail]];
  const s = document.createElement('script');
  s.src = NET_LIBS[src];
  s.onload = () => { NET.libLoading = false; const w = NET.libWait; NET.libWait = []; w.forEach((f) => f[0]()); };
  s.onerror = () => {
    if (src + 1 < NET_LIBS.length) { netLoadLib(cb, fail, src + 1); return; }
    NET.libLoading = false; const w = NET.libWait; NET.libWait = []; w.forEach((f) => { if (f[1]) f[1](); });
  };
  (document.head || document.body).appendChild(s);
}
function netCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
const netErrText = (e) => (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed') ? 'KEINE VERBINDUNG ZUM SERVER. INTERNET AN?' : e.type === 'webrtc' ? 'VERBINDUNG BLOCKIERT (FIREWALL?). NOCHMAL VERSUCHEN!' : 'ONLINE-FEHLER: ' + (e.type || e.message || e);

// =====================================================================
//  HOSTEN / BEITRETEN
// =====================================================================
// pub = öffentliches Spiel (andere finden es mit SCHNELL BEITRETEN)
function netHost(pub) {
  netLeave(true);
  NET.mode = 'host'; NET.pub = !!pub; NET.code = netCode(); NET.ready = false; NET.p2pOk = false; NET.p2pFail = false;
  NET.status = 'VERBINDE MIT DEN SERVERN...';
  netInstallHooks();
  relayHost();
  netLoadLib(netHostPeer, () => { NET.p2pFail = true; netHostStatus(); });
}
// zusätzlich direkt erreichbar (falls ein Gast die Relay-Server nicht erreicht)
function netHostPeer() {
  if (NET.mode !== 'host' || NET.peer) return;
  let peer;
  try { peer = new Peer(NET_PREFIX + NET.code.toLowerCase(), netPeerOpts()); } catch (e) { NET.p2pFail = true; netHostStatus(); return; }
  NET.peer = peer;
  peer.on('open', () => { if (NET.peer === peer) { NET.p2pOk = true; netHostStatus(); } });
  peer.on('connection', (conn) => {
    if (NET.peer !== peer) return;
    const up = conn.metadata && conn.metadata.up;
    if (up) {   // Abkürzung für einen Gast, der schon über den Server verbunden ist
      const rc = NET.relay && NET.relay.host ? NET.relay.conns[up] : null;
      if (rc && rc.open) rc.attachP2P(conn); else conn.on('open', () => conn.close());
      return;
    }
    if (NET.conns.length >= 3) { conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 400); }); return; }
    netBind(conn);
  });
  peer.on('error', () => { if (NET.peer === peer) { NET.p2pFail = true; netHostStatus(); } });   // ist nur die Reserve
  peer.on('disconnected', () => { if (NET.mode === 'host' && NET.peer === peer && !peer.destroyed) { try { peer.reconnect(); } catch (x) { /* egal */ } } });
}
function netHostStatus() {
  if (NET.mode !== 'host') return;
  const R = NET.relay, relayOk = !!(R && R.mqs.some((m) => m && m.ready));
  NET.ready = relayOk || !!NET.p2pOk;
  if (NET.connected) NET.status = 'SPIELER: ' + (NET.conns.length + 1) + '/4 - CODE ' + NET.code + ' - ' + netLinkText() + ' - STARTE EINEN AUFTRAG.';
  else if (NET.ready) NET.status = (NET.pub ? 'ÖFFENTLICHES SPIEL OFFEN: ' : 'DEIN CODE: ') + NET.code + '  -  WARTE AUF MITSPIELER...';
  else if (R && R.mqs.length === RELAY_BROKERS.length && R.mqs.every((m) => m && m.dead) && NET.p2pFail) NET.status = 'KEINE VERBINDUNG ZU DEN SERVERN. INTERNET AN?';
  else NET.status = 'VERBINDE MIT DEN SERVERN...';
}
// wie sind die Mitspieler verbunden? DIREKT = von PC zu PC wie früher (schnell), sonst über einen Server
function netLinkText() {
  const cs = (NET.mode === 'host' ? NET.conns.map((e) => e.conn) : [NET.conn]).filter(Boolean);
  if (!cs.length) return '';
  const d = cs.filter((c) => !c.relay || (c.txP2P && c.p2p && c.p2p.open)).length;
  return d === cs.length ? 'DIREKT' : d ? d + 'X DIREKT' : 'ÜBER SERVER';
}
// Gast: im Hintergrund die direkte Verbindung aufbauen (wie in den ersten Versionen). Klappt sie,
// laufen die Daten ohne Umweg (im gleichen WLAN fast 0 ms). Sonst bleibt es einfach beim Server.
function netTryDirect(c, gid, code) {
  const go = (peer) => { if (NET.peer === peer && NET.conn === c && c.open && !c.p2p) c.attachP2P(peer.connect(NET_PREFIX + code.toLowerCase(), { reliable: true, metadata: { up: gid } })); };
  if (NET.peer && NET.peer.open) { go(NET.peer); return; }
  netLoadLib(() => {
    if (NET.conn !== c || !c.open || NET.peer) return;
    let peer;
    try { peer = new Peer(undefined, netPeerOpts()); } catch (e) { return; }
    NET.peer = peer;
    peer.on('open', () => go(peer));
    peer.on('error', () => { /* dann eben über den Server */ });
  }, () => { /* Bibliothek nicht ladbar: bleibt beim Server */ });
}
// mit Code beitreten: erst über die Relay-Server, sonst direkt
function netJoin(code) {
  netLeave(true);
  NET.mode = 'client'; NET.quick = false; NET.code = code.toUpperCase(); NET.status = 'SUCHE DAS SPIEL ' + NET.code + '...';
  relayJoin(NET.code, 8000, (why) => {
    if (NET.mode !== 'client' || NET.connected) return;
    if (why === 'full') { netLeave(true, true); NET.status = 'DAS SPIEL IST SCHON VOLL (MAXIMAL 4 SPIELER).'; return; }
    if (why === 'ver') { netVerFail(); return; }
    netJoinP2P(why === 'down');
  });
}
function netJoinP2P(noRelay) {
  const code = NET.code, lost = noRelay ? 'KEINE VERBINDUNG ZU DEN SERVERN. INTERNET AN?' : 'CODE ' + code + ' NICHT GEFUNDEN. TIPPFEHLER? HOSTET DER ANDERE NOCH?';
  NET.status = 'PROBIERE DIREKTE VERBINDUNG MIT ' + code + '...';
  netLoadLib(() => {
    if (NET.mode !== 'client' || NET.connected || NET.peer || NET.code !== code) return;
    let peer;
    try { peer = new Peer(undefined, netPeerOpts()); } catch (e) { netLeave(true, true); NET.status = lost; return; }
    NET.peer = peer;
    peer.on('open', () => {
      if (NET.peer !== peer) return;
      netBind(peer.connect(NET_PREFIX + code.toLowerCase(), { reliable: true }));
      clearTimeout(NET.joinT);
      NET.joinT = setTimeout(() => { if (NET.peer === peer && !NET.connected) { netLeave(true, true); NET.status = 'DIE VERBINDUNG KLAPPT NICHT. NOCHMAL VERSUCHEN (ODER VPN AUS)!'; } }, 15000);
    });
    peer.on('error', (e) => {
      if (NET.peer !== peer || NET.connected) return;
      netLeave(true, true);
      NET.status = e.type === 'peer-unavailable' || e.type === 'network' || e.type === 'server-error' ? lost : netErrText(e);
    });
  }, () => { if (NET.mode === 'client' && !NET.connected && NET.code === code) { netLeave(true, true); NET.status = lost; } });
}
// irgendein öffentliches Spiel finden
function netQuickJoin() {
  netLeave(true);
  NET.mode = 'client'; NET.quick = true; NET.qList = []; NET.qi = 0; NET.status = 'SUCHE ÖFFENTLICHE SPIELE...';
  relayFind((list) => { if (NET.mode === 'client' && NET.quick && !NET.connected) { NET.qList = list; NET.qi = 0; netTryPub(); } });
}
function netTryPub() {
  if (NET.mode !== 'client' || NET.connected || !NET.quick) return;
  if (NET.qi >= NET.qList.length) { netLeave(true, true); NET.status = 'KEIN FREIES ÖFFENTLICHES SPIEL GEFUNDEN. HOSTE DOCH SELBST EINS!'; return; }
  const code = NET.qList[NET.qi++];
  NET.code = code; NET.status = 'PROBIERE ÖFFENTLICHES SPIEL ' + code + '...';
  relayJoin(code, 6000, () => netTryPub());
}
function netBind(conn) {
  const host = NET.mode === 'host', ent = host ? { conn, idx: 0, hat: 'shades', remote: null } : null;
  if (!host) NET.conn = conn;
  conn.on('open', () => {
    if (host) {
      ent.idx = [1, 2, 3].find((i) => !NET.conns.some((c) => c.idx === i)) || 3;
      NET.conns.push(ent); NET.connected = true;
      conn.send({ t: 'hello', idx: ent.idx, hat: save.hat, v: NET_VER, n: unameGet() });
      netHostStatus(); relayAdvertise(true);
      if (state === 'city') cityMsg('SPIELER ' + (ent.idx + 1) + ' KOMMT REIN...', 3);
      if (G && G.players && (state === 'play' || state === 'pause') && !G.players.some((p) => p.idx === ent.idx)) {
        const [x2, y2] = spotNear(G.player.x, G.player.y); G.players.push(makePlayer(x2, y2, ent.idx)); if (run && run.livesBy) syncLives(); netSendFloor();
      }
      // läuft gerade ein Anruf? Dann sieht der Neue ihn auch
      if (state === 'dialog' && dlg && !dlg.follow && !dlg.done) conn.send({ t: 'dlg', name: dlg.name, i: dlg.i, r: dlg.ringT > 0 ? 1 : 0 });
      NET.saveDirty = true; NET.saveT = 0;
    } else {
      NET.connected = true; NET.quick = false; clearTimeout(NET.joinT);
      conn.send({ t: 'hello', hat: save.hat, perks: save.perks, mask: save.mask || 'none', v: NET_VER, n: unameGet() });
      NET.status = 'VERBUNDEN MIT ' + NET.code + '! DER HOST STARTET DIE AUFTRÄGE.';
      if (state === 'city') cityMsg('VERBUNDEN! WARTE, BIS DER HOST EINEN AUFTRAG STARTET.', 4);
    }
    Sound.play('select');
  });
  conn.on('data', (m) => { try { netOnData(m, ent); } catch (e) { console.error(e); } });
  conn.on('close', () => netLost(ent));
  conn.on('error', () => netLost(ent));
}
function netSend(m, except) {
  if (NET.mode === 'host') { for (const c of NET.conns) if (c !== except && c.conn.open) { try { c.conn.send(m); } catch (e) { /* egal */ } } return; }
  if (NET.conn && NET.conn.open) { try { NET.conn.send(m); } catch (e) { /* egal */ } }
}
function netLost(ent) {
  if (NET.mode === 'host') {
    if (!ent || !NET.conns.includes(ent)) return;
    NET.conns = NET.conns.filter((c) => c !== ent);
    NET.connected = NET.conns.length > 0;
    delete NET.others[ent.idx];
    netHostStatus(); relayAdvertise(true);
    if (G && G.players) { G.players = G.players.filter((p) => p.idx !== ent.idx); G.player = G.players[0]; }
    if (state === 'city') cityMsg((ent.name || 'SPIELER ' + (ent.idx + 1)) + ' IST WEG.', 3);
    return;
  }
  if (!NET.connected) return;
  netLeave(true, true);
  NET.status = 'VERBINDUNG ZUM HOST VERLOREN.';
  if (state !== 'city') { fade = 1; fadeDir = -1; enterHub(); }
  cityMsg('VERBINDUNG ZUM HOST VERLOREN.', 4);
}
// keepStatus = Statustext stehen lassen
function netLeave(silent, keepStatus) {
  const cs = NET.mode === 'host' ? NET.conns.map((e) => e.conn) : [NET.conn], p = NET.peer, R = NET.relay, wasClient = NET.mode === 'client' && NET.connected;
  clearTimeout(NET.joinT);
  NET.conns = []; NET.others = {};
  NET.connected = false; NET.conn = null; NET.peer = null; NET.relay = null; NET.ready = false; NET.p2pOk = false; NET.p2pFail = false;
  NET.mode = 'off'; NET.roster = null; NET.rosSent = ''; NET.remote = null; NET.inLevel = false; NET.code = ''; NET.quick = false; NET.dlgWant = null; NET.ping = 0;
  for (const c of cs) if (c) { try { c.send({ t: 'bye' }); } catch (e) { /* egal */ } try { c.close(); } catch (e) { /* egal */ } }
  if (p) { try { p.destroy(); } catch (e) { /* egal */ } }
  if (R) relayShutdown(R);
  if (!keepStatus) NET.status = silent ? '' : 'ONLINE BEENDET.';
  if (wasClient) { save = defaultSave(); loadSave(); }   // wieder der eigene Spielstand
  if (G && G.players && !netInPlay()) { G.players = G.players.filter((q) => q.idx === 0); G.player = G.players[0]; }
}
function netOnData(m, ent) {
  if (!m || !m.t) return;
  if (m.t === 'cp') { if (ent) { m.idx = ent.idx; netSend(m, ent); } netGotCity(m); return; }
  if (m.t === 'save') { netApplySave(m.s); if (NET.mode === 'host') NET.saveDirty = true; return; }
  if (NET.mode === 'host') {
    if (!ent) return;
    if (m.t === 'in') netGotInput(m.i || {}, ent);
    else if (m.t === 'hello' && m.v !== NET_VER) {   // anderes Spiel-Update: lieber gar nicht als kaputt
      try { ent.conn.send({ t: 'ver', v: NET_VER }); } catch (x) { /* egal */ }
      const c = ent.conn; setTimeout(() => { try { c.close(); } catch (x) { /* egal */ } }, 500);
      netLost(ent);
      if (state === 'city') cityMsg('EIN MITSPIELER HAT EINE ANDERE SPIELVERSION.', 4);
    }
    else if (m.t === 'hello' || m.t === 'me') {
      ent.hat = HATS[m.hat] && m.hat !== 'none' ? m.hat : 'shades'; ent.perks = m.perks || {}; ent.mask = MASK_BY_ID[m.mask] ? m.mask : 'none';
      if (m.n !== undefined) ent.name = netCleanName(m.n);
      if (m.t === 'hello' && state === 'city') cityMsg(netPlayerName(ent.idx) + ' IST ONLINE DABEI! WINK MAL.', 4);
      const p = G && G.players && G.players.find((q) => q.idx === ent.idx); if (p) { p.hat = ent.hat; p.perks = ent.perks; p.mask = ent.mask; }
    }
    else if (m.t === 'crime') { if (C) crime(m.stars, netPlayerName(ent.idx) + ': ' + m.reason, true); }
    else if (m.t === 'seen') NET.seenAt = performance.now();
    else if (m.t === 'ping') { ent.ping = m.last || 0; try { ent.conn.send({ t: 'pong', ts: m.ts }); } catch (x) { /* egal */ } }
    else if (m.t === 'busted') { if (C && C.wanted) { C.wanted = 0; C.bust = 0; endChase(); cityMsg(netPlayerName(ent.idx) + ' WURDE VERHAFTET. DIE FAHNDUNG IST VORBEI.', 3); } }
    else if (m.t === 'dlgnext') { if (state === 'dialog' && dlg && !dlg.follow && !dlg.done) dlgNext(); }
    else if (m.t === 'dlgreq') netDlgRequest(m.name, ent);
    else if (m.t === 'resync') netResync(ent);
    else if (m.t === 'hk') wsGuestHack(m, ent);   // Gast hat Wireshark geschafft + Aktion gewählt
    else if (m.t === 'go') netGoRequest(m, ent);   // Gast will einen Auftrag/Modus starten
    else if (m.t === 'bye') netLost(ent);
    return;
  }
  if (m.t === 'hello') { if (m.v !== NET_VER) { netVerFail(); return; } NET.myIdx = m.idx || 1; return; }
  if (m.t === 'ver') { netVerFail(); return; }
  if (m.t === 'wanted') { netGotWanted(m.w); return; }
  if (NET.mode !== 'client') return;
  switch (m.t) {
    case 'full': netLeave(true, true); NET.status = 'DAS SPIEL IST SCHON VOLL (MAXIMAL 4 SPIELER).'; break;
    case 'pong': NET.ping = Math.round(performance.now() - m.ts); break;
    case 'ros': NET.roster = Array.isArray(m.l) ? m.l.slice(0, 4).filter((q) => Array.isArray(q)).map((q) => [q[0] | 0, netCleanName(q[1])]) : null; break;
    case 'card': netClientCard(m); break;
    case 'start': netClientStart(m); break;
    case 'snap': netClientSnap(m); break;
    case 'hold': NET.hold = m.what; NET.holdAt = performance.now(); break;
    case 'end': netClientEnd(m); break;
    case 'pay': NET.payMsg = '+' + m.v + '€ (' + m.why + ')'; NET.payT = 4; if (state === 'city') cityMsg('KOOP-GELD: +' + m.v + '€ (' + m.why + ')', 4); break;
    case 'lobby': netClientToLobby(m.msg); break;
    case 'dlg': netGotDlg(m); break;
    case 'dlgs': netGotDlgState(m); break;
    case 'dlge': netGotDlgEnd(); break;
    case 'dlgbusy': if (state === 'city') cityMsg('DER HOST IST GERADE BESCHÄFTIGT. DER ANRUF KOMMT, SOBALD ER IN DER STADT IST.', 4); break;
    case 'bye': netLost(); break;
    case 'hkno': if (G && G.player) floatText(G.player.x, G.player.y - 20, 'ZU SPÄT! DAS WAR SCHON GEHACKT.', '#ff6a6a', true); break;
    case 'gobusy': if (state === 'city') cityMsg(m.msg || 'DER HOST IST GERADE BESCHÄFTIGT. VERSUCH ES GLEICH NOCHMAL.', 3); break;
  }
}
function netVerFail() {
  if (NET.mode !== 'client') return;
  netLeave(true, true);
  NET.status = 'DER HOST HAT EINE ANDERE SPIELVERSION! IHR BRAUCHT BEIDE DAS GLEICHE UPDATE.';
  if (state === 'city') cityMsg('ANDERE SPIELVERSION ALS DER HOST - NICHT VERBUNDEN.', 4);
}

// =====================================================================
//  ANRUFE / DIALOGE GEMEINSAM
//  Der Host zeigt den Dialog allen. Er blättert (Gäste dürfen "weiter" drücken).
//  Will ein Gast einen Anruf starten (Telefon zuhause), macht das der Host für alle.
// =====================================================================
function netDlgStart() {
  if (NET.mode !== 'host' || !NET.connected || !dlg) return;
  netSend({ t: 'dlg', name: dlg.name, i: dlg.i, r: dlg.ringT > 0 ? 1 : 0 });
}
function netDlgSync(end) {
  if (NET.mode !== 'host' || !NET.connected || !dlg) return;
  const line = dlg.lines[dlg.i];
  netSend(end ? { t: 'dlge' } : { t: 'dlgs', i: dlg.i, c: line && dlg.chars >= line.text.length ? 1 : 0, r: dlg.ringT > 0 ? 1 : 0 });
}
// Gast drückt "weiter"
function netDlgAsk() {
  const now = performance.now();
  if (now - (NET.dlgAskAt || 0) < 250) return;
  NET.dlgAskAt = now;
  netSend({ t: 'dlgnext' });
}
// Gast: den Anruf vom Host mit anschauen
function netGotDlg(m) {
  if (!DIALOGS[m.name]) return;
  const back = state === 'dialog' && dlg && dlg.follow ? dlg.back : state;
  startDialog(m.name, () => netDlgBack(m.name, back), true);
  dlg.back = back;
  if (m.i) dlg.i = clamp(m.i | 0, 0, dlg.lines.length - 1);
  if (!m.r) dlg.ringT = 0;
  fade = 1; fadeDir = -1; fadeCb = null;
}
function netDlgBack(name, back) {
  if (DIALOG_BACK[name]) { extCall(DIALOG_BACK[name], back); return; }
  if (name === 'ending' || (G && G.L && G.L.ending === name)) { setState('victory'); Sound.muffle(false); Sound.playSong('win'); return; }
  if ((back === 'netplay' || back === 'netcard') && run && NET.connected) { setState(back); if (LEVELS[run.li]) Sound.playSong(LEVELS[run.li].song); return; }
  enterHub();
}
function netGotDlgState(m) {
  if (state !== 'dialog' || !dlg || !dlg.follow) return;
  if (!m.r) dlg.ringT = 0;
  const i = clamp(m.i | 0, 0, dlg.lines.length - 1);
  if (i !== dlg.i) { dlg.i = i; dlg.chars = m.c ? 999 : 0; } else if (m.c) dlg.chars = Math.max(dlg.chars, dlg.lines[i].text.length);
}
function netGotDlgEnd() {
  if (state !== 'dialog' || !dlg || !dlg.follow || dlg.done) return;
  dlg.done = true;
  if (fadeDir === 1) fadeCb = dlg.onDone; else goto(dlg.onDone);
}
// Host: ein Gast will einen Anruf starten (kommt, sobald der Host frei in der Stadt ist)
function netDlgRequest(name, ent) {
  if (!DIALOGS[name] || (state === 'dialog' && dlg && !dlg.done)) return;
  NET.dlgWant = name;
  if (netDlgFree()) netDlgRun(); else { try { ent.conn.send({ t: 'dlgbusy' }); } catch (e) { /* egal */ } }
}
const netDlgFree = () => state === 'city' && fadeDir === 0 && C && !C.menu && !C.mp && !C.phone && !C.store && !C.inv && !C.map && !C.travel;
// Anrufe, die ein Gast anfragen darf: Name -> Funktion (sonst bizIntro / Telefon); Rückweg des Gasts nach einem Dialog
const DLG_RUN = {}, DIALOG_BACK = {};
// Gast "spielt" (auch während er am Wireshark-PC sitzt)
const netInPlay = () => state === 'netplay' || (state === 'wireshark' && !!WS && !!WS.guest);
// ---------------------------------------------------------------------
//  Gast startet Aufträge/Modi: der Gast schickt { t: 'go', k, a }, der Host startet es (für alle), wenn er frei
//  in der Stadt ist. NET_GO[k] = (a, name) => true (gestartet) | string (Grund, warum nicht). Nur der Host ruft das auf.
// ---------------------------------------------------------------------
const NET_GO = {
  mission(li) {
    li = li | 0;
    if (!LEVELS[li] || !BUILDINGS.some((b) => b.mission === li)) return 'DIESEN AUFTRAG GIBT ES NICHT.';
    const st = missionState(li);
    if (st === 'locked') return 'DIESER AUFTRAG IST NOCH GESPERRT.';
    if (st === 'call') return 'ERST MUSS JEMAND ANS TELEFON ZUHAUSE GEHEN!';
    citySave(); netStartLevel(li); goto(() => startLevel(li)); return true;
  },
  arena() { citySave(); goto(() => startArena()); return true; },
  raid() { citySave(); goto(() => startRaid()); return true; },
};
const NET_GO_TXT = { mission: 'EINEN AUFTRAG', arena: 'DIE ARENA', raid: 'EINEN RAID' };
// Gast: Start anfragen
function netAskStart(k, a) {
  if (NET.mode !== 'client' || !NET.connected) return false;
  const now = performance.now();
  if (now - (NET.goAt || 0) < 800) return true;
  NET.goAt = now;
  netSend({ t: 'go', k: String(k), a: a == null ? 0 : a });
  if (state === 'city') cityMsg('ANFRAGE AN DEN HOST GESCHICKT... GLEICH GEHT ES LOS!', 3);
  Sound.play('select');
  return true;
}
// Host: Anfrage eines Gasts
function netGoRequest(m, ent) {
  const f = NET_GO[m.k], no = (msg) => { try { ent.conn.send({ t: 'gobusy', msg }); } catch (e) { /* egal */ } };
  if (typeof f !== 'function') { no('DAS KANN DER HOST NICHT STARTEN (ANDERE SPIELVERSION?).'); return; }
  if (!netDlgFree() || NET.inLevel) { no('DER HOST IST GERADE BESCHÄFTIGT (MENÜ, HANDY, LADEN...). VERSUCH ES GLEICH NOCHMAL.'); return; }
  if (C && C.wanted > 0) { no('DER HOST WIRD GESUCHT! ERST DIE POLIZEI ABHÄNGEN.'); return; }
  const who = netPlayerName(ent.idx), r = extCall(f, m.a, who);
  if (r === true) cityMsg(who + ' STARTET ' + (NET_GO_TXT[m.k] || String(m.k).toUpperCase()) + '!', 3);
  else no(typeof r === 'string' ? r : 'GEHT GERADE NICHT.');
}
function netDlgRun() {
  const name = NET.dlgWant;
  NET.dlgWant = null;
  if (name) (DLG_RUN[name] || (name === 'bizIntro' ? bizIntroCall : phoneCall))(name);
}

// =====================================================================
//  HOST
// =====================================================================
function netGotInput(i, ent) {
  const r = ent.remote || (ent.remote = { mx: 0, my: 0, aim: 0, fire: false });
  r.mx = clamp(+i.mx || 0, -1, 1); r.my = clamp(+i.my || 0, -1, 1); r.aim = +i.aim || 0; r.fire = !!i.fire;
  // der Gast schickt seine Position mit (er bewegt sich bei sich selbst, ohne Verzögerung)
  if (typeof i.x === 'number' && typeof i.y === 'number' && isFinite(i.x) && isFinite(i.y) && i.fs === NET.floorSeq) {
    r.x = i.x; r.y = i.y; r.vx = clamp(+i.vx || 0, -400, 400); r.vy = clamp(+i.vy || 0, -400, 400);
    r.ackX = +i.ax || 0; r.ackY = +i.ay || 0; r.tp = i.tp | 0; r.at = performance.now();
  } else r.x = null;
  for (const k of NET_EDGES) if (i[k]) r[k] = true;
}
function netRemoteInput(p) {
  const en = NET.conns.find((c) => c.idx === p.idx), r = en && en.remote;
  if (!r) return { mx: 0, my: 0, aim: p.a, fire: false, fireP: false, alt: false, exec: false, finger: false, use: false, wave: false };
  const out = { mx: r.mx, my: r.my, aim: r.aim, fire: r.fire };
  if (r.x != null) out.net = r;
  for (const k of NET_EDGES) { out[k] = !!r[k]; r[k] = false; }
  return out;
}
// Host: ein Online-Gast bewegt sich bei sich selbst. Der Host übernimmt seine Position (Türen gehen
// dabei normal auf). Stöße vom Host (Boss zieht, Gegner schubsen, Weste) zählen mit (pushX/pushY),
// der Gast macht sie bei sich nach und meldet zurück, wie weit er ist (ackX/ackY).
function netFollowGuest(p, r, dt) {
  if (p.nfx !== undefined) { p.pushX = (p.pushX || 0) + (p.x - p.nfx); p.pushY = (p.pushY || 0) + (p.y - p.nfy); }
  if ((r.tp | 0) === (p.tp | 0)) {
    const age = Math.min(0.1, (performance.now() - r.at) / 1000);
    const tx = r.x + r.vx * age + (p.pushX || 0) - r.ackX, ty = r.y + r.vy * age + (p.pushY || 0) - r.ackY;
    if (Math.abs(tx - p.x) > 80 || Math.abs(ty - p.y) > 80) { p.x = tx; p.y = ty; } else moveEntity(p, tx - p.x, ty - p.y);
    p.vx = r.vx; p.vy = r.vy;
    if (r.vx * r.vx + r.vy * r.vy > 64) p.walkT += dt;
  } else { p.vx = 0; p.vy = 0; }   // der Gast hat den Sprung noch nicht mitbekommen
  p.nfx = p.x; p.nfy = p.y;
}
// Host setzt einen Spieler um (z.B. Wiederbelebung): der Gast übernimmt diese Position
function netTeleported(p) { p.tp = (p.tp | 0) + 1; p.nfx = p.x; p.nfy = p.y; }
// Effekte mitschneiden: Funktionen werden umwickelt, der Gast spielt sie nach
function netInstallHooks() {
  if (NET.hooked) return;
  NET.hooked = true;
  const rec = () => NET.mode === 'host' && NET.connected && NET.inLevel;
  const wrap = (name, always) => {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function (...a) {
      if (rec() && (always || NET.fxDepth === 0)) netFx(name, a);
      NET.fxDepth++;
      try { return orig.apply(this, a); } finally { NET.fxDepth--; }
    };
  };
  for (const n of ['sparks', 'bloodBurst', 'muzzleFlash', 'casing', 'floatText', 'shake', 'juiceSplashFx']) wrap(n, false);
  for (const n of ['breakGlass', 'unlockSecurity']) wrap(n, true);   // ändern die Karte -> immer
  const oc = window.stampCorpse;
  window.stampCorpse = function (e, ang) {
    if (rec()) netFx('corpse', [{ x: e.x, y: e.y, a: e.a, kind: e.kind, btype: e.btype, suit: e.suit, skin: e.skin, hair: e.hair, isPlayer: !!e.isPlayer, idx: e.idx || 0 }, ang]);
    NET.fxDepth++;
    try { return oc(e, ang); } finally { NET.fxDepth--; }
  };
  const ox = window.explode;
  window.explode = function (x, y, r, o) {
    if (rec()) netFx('juice', [x, y, r]);
    NET.fxDepth++;
    try { return ox(x, y, r, o); } finally { NET.fxDepth--; }
  };
  const os = window.damageSafe;
  window.damageSafe = function (tx, ty, dmg) {
    const i = ty * G.w + tx, before = G.tiles[i];
    const res = os(tx, ty, dmg);
    if (rec() && before === 'Z' && G.tiles[i] !== 'Z') netFx('safe', [tx, ty]);
    return res;
  };
  const sp = Sound.play;
  Sound.play = function (name, ...a) {
    if (rec() && NET.fxDepth === 0 && state === 'play') netFx('snd', [name].concat(a));
    return sp.call(Sound, name, ...a);
  };
}
// fxOwn = dieser Effekt gehört zum Schuss eines Online-Gasts (der zeigt ihn schon selbst)
function netFx(name, args) { if (NET.fx.length < 300) NET.fx.push(NET.fxOwn ? [name, args, NET.fxOwn] : [name, args]); }
const netQ = (v, m) => Math.round((v || 0) * m);
function netNid(o) { return o.nid || (o.nid = ++NET.nidSeq); }
// beliebiges Objekt als einfache Daten (ohne Verweise auf andere Figuren)
function netPlain(o, depth = 0) {
  if (o == null || typeof o !== 'object') return o;
  if (depth > 0 && o.isPlayer) return { __p: o.idx || 0 };
  if (typeof o.getContext === 'function' || ArrayBuffer.isView(o)) return undefined;
  if (depth > 0 && o.kind && o.state !== undefined && o.x !== undefined) return undefined;   // andere Figur
  if (depth > 3) return undefined;
  if (Array.isArray(o)) return o.map((v) => netPlain(v, depth + 1));
  const out = {};
  for (const k in o) {
    if (NET_SKIP.has(k)) continue;
    const v = o[k], t = typeof v;
    if (t === 'number' || t === 'string' || t === 'boolean') out[k] = v;
    else if (v && t === 'object') { const r = netPlain(v, depth + 1); if (r !== undefined) out[k] = r; }
  }
  return out;
}
function netEnemyStatic(e) { return [netNid(e), e.kind, e.suit, e.shirt, e.hair, e.skin, e.glasses ? 1 : 0, e.static ? 1 : 0, e.r, e.flying ? 1 : 0, e.btype || 0, e.prop || 0]; }
function netEnemyDyn(e) {
  if (e.state === 'dead') return [netNid(e), 'dead'];
  return [netNid(e), netQ(e.x, 4), netQ(e.y, 4), netQ(e.a, 1000), e.state, e.weapon || 0, e.hp, netQ(e.walkT, 100), netQ(e.downAng, 1000), netQ(e.flash, 100),
    netQ(e.recoil, 10), netQ(e.aimT, 100), netQ(e.windup, 100), netQ(e.swingT, 100), e.swingDir || 1, netQ(e.spot, 100), e.sayT > 0 ? e.sayText : 0, netQ(e.sayT, 100),
    e.target && e.target.isPlayer ? e.target.idx || 0 : -1, netEnemyExt(e)];
}
// [19] = eigene Daten einer neuen Gegnerart (ENEMY_EXT[kind].netDyn)
function netEnemyExt(e) {
  const EX = ENEMY_EXT[e.kind], v = EX && EX.netDyn ? extCall(EX.netDyn, e) : 0;
  return v == null ? 0 : v;
}
function netPlayer(p) { const d = netPlain(p); d.hat = p.idx === 0 ? save.hat : (p.hat || 'shades'); return d; }
// Neue Etage (oder Neustart der Etage) an den Gast schicken
function netFloorMsg() {
  const ens = [];
  for (const e of G.enemies) if (e.kind !== 'B') { ens.push(netEnemyStatic(e)); NET.sent.add(e); }
  return { t: 'start', seq: NET.floorSeq, li: G.li, fi: G.fi, tiles: G.tiles.join(''), laserOff: G.laserOff, ens,
    perks: save.perks, hearts: save.hearts, booster: save.booster, booster2: save.booster2, hostHat: save.hat };
}
function netSendFloor() {
  if (NET.mode !== 'host' || !NET.connected || !G) return;
  netInstallHooks();
  NET.inLevel = true; NET.floorSeq++; NET.fx = []; NET.sent = new Set(); NET.snapT = 0;
  for (const c of NET.conns) if (c.remote) c.remote.x = null;
  netSend(netFloorMsg());
}
// ein Gast hat den Anschluss verpasst (Nachricht verloren): die Etage nochmal nur für ihn
function netResync(ent) {
  if (!NET.inLevel || !G || !G.players || !NET.sent || !['play', 'pause', 'wireshark'].includes(state)) return;
  if (ent.remote) ent.remote.x = null;
  try { ent.conn.send(netFloorMsg()); } catch (e) { /* egal */ }
}
function netStartLevel(li) { if (NET.mode === 'host' && NET.connected) { NET.inLevel = true; netSend({ t: 'card', li, hearts: save.hearts }); } }
function netSendLevelEnd(info) { if (NET.mode === 'host' && NET.connected) { netSend({ t: 'end', info }); NET.inLevel = false; } }
function netHostLobby(msg) { if (NET.mode === 'host' && NET.connected && NET.inLevel) netSend({ t: 'lobby', msg: msg || '' }); NET.inLevel = false; }
function netPay(v, why) { if (NET.mode === 'host' && NET.connected && v > 0) netSend({ t: 'pay', v, why }); }
// aus updatePlay: Schnappschuss senden
function netHostTick(dt) {
  if (!NET.connected || !NET.inLevel) return;
  NET.snapT -= dt;
  if (NET.snapT > 0) return;
  NET.snapT = NET_SNAP;
  const ensNew = [];
  for (const e of G.enemies) if (e.kind !== 'B' && !NET.sent.has(e)) { ensNew.push(netEnemyStatic(e)); NET.sent.add(e); }
  const doors = [];
  for (const k in G.doors) if (G.doors[k].open) doors.push(+k, G.doors[k].side);
  const m = {
    t: 'snap', seq: NET.floorSeq, ht: Math.round(performance.now()),
    g: { time: G.time, introT: G.introT, flash: G.flash, cleared: G.cleared, clearT: G.clearT, focusT: G.focusT, slowmo: G.slowmo || 0, exiting: !!G.exiting, won: !!G.won, victoryT: G.victoryT || 0,
      hacked: G.hacked, cause: G.cause || '', tip: G.tip || '', shake: G.shake },
    run: { score: run.score, kills: run.kills, combo: run.combo, maxCombo: run.maxCombo, lastKillT: run.lastKillT, time: run.time, cash: run.cash, deaths: run.deaths, lives: run.lives, maxLives: run.maxLives,
      mode: run.mode || '', modeData: run.modeData ? netPlain(run.modeData) : null },
    hearts: save.hearts,
    pl: G.players.map(netPlayer),
    ensNew,
    en: G.enemies.filter((e) => e.kind !== 'B').map(netEnemyDyn),
    boss: G.boss ? Object.assign(netPlain(G.boss), { nid: netNid(G.boss), tg: G.boss.target && G.boss.target.isPlayer ? G.boss.target.idx || 0 : -1 }) : null,
    bu: G.bullets.filter((b) => !b.dead).slice(0, 160).map((b) => [netQ(b.x, 4), netQ(b.y, 4), netQ(b.vx, 1), netQ(b.vy, 1), b.kind, b.owner === 'player' ? 1 : 0, netQ(b.life, 100), netQ(b.sx, 1), netQ(b.sy, 1), b.src && b.src.isPlayer ? b.src.idx | 0 : -1]),
    pk: G.pickups.map((k) => [netNid(k), netQ(k.x, 4), netQ(k.y, 4), k.id, netQ(k.rot, 100), k.flying ? 1 : 0]),
    ca: G.cashes.map((c) => [netQ(c.x, 2), netQ(c.y, 2)]),
    ou: G.oneUps.map((o) => [netQ(o.x, 2), netQ(o.y, 2)]),
    pet: G.pet ? [netQ(G.pet.x, 2), netQ(G.pet.y, 2), netQ(G.pet.a, 100), netQ(G.pet.walkT, 100), G.pet.kind, netQ(G.pet.biteT, 100)] : null,
    doors,
    wv: netPlain(G.waves || []), bm: netPlain(G.booms || []), ln: netPlain(G.lanes), hz: netPlain(G.hazards || []), ar: G.arena ? netPlain(G.arena) : null, md: netPlain(G.modState || {}),
    fx: NET.fx,
  };
  NET.fx = [];
  netSend(m);
}
// aus frame(): wenn der Host gerade nicht spielt (Pause, Wireshark, Kartenbild...)
function netFrame(dt) {
  if (NET.mode !== 'host' || !NET.connected || !NET.inLevel) return;
  NET.holdT = (NET.holdT || 0) - dt;
  if (state === 'play' || NET.holdT > 0) return;
  NET.holdT = 0.4;
  const what = { pause: 'pause', wireshark: 'wireshark', card: 'card', dialog: 'dialog', victory: 'victory', guide: 'pause' }[state];
  if (what) netSend({ t: 'hold', what });
}

// =====================================================================
//  GAST (SPIELER 2)
// =====================================================================
function netClientCard(m) {
  newRun(m.li);
  NET.hostHearts = m.hearts;
  NET.hold = '';
  setState('netcard'); fade = 1; fadeDir = -1; fadeCb = null;
  if (m.li !== 'arena') { const L = levelById(m.li); if (L) Sound.playSong(L.song); }
}
function netClientStart(m) {
  NET.floorSeq = m.seq;
  WS = null;   // ein offenes Gast-Wireshark gehört zur alten Etage
  if (!run || run.li !== m.li) newRun(m.li);
  if (m.li === 'arena') run.arena = true;
  run.fi = m.fi;
  loadFloor(m.li, m.fi);
  // Karte genau wie beim Host (kaputte Scheiben, offene Tresore, Sicherheitstüren)
  if (m.tiles && m.tiles.length === G.w * G.h) {
    for (let i = 0; i < G.tiles.length; i++) {
      const c = m.tiles[i];
      if (c === G.tiles[i]) continue;
      G.tiles[i] = c; G.solid[i] = isSolidC(c) ? 1 : 0;
      if (c === 'D' && !G.doors[i]) G.doors[i] = { open: true, side: 1, horiz: true, wasSecurity: true };
    }
    renderStatic();
  }
  if (m.laserOff) G.laserOff = m.laserOff.slice();
  G.players = [G.player];
  const me = makePlayer(G.player.x + 12, G.player.y, NET.myIdx); G.players.push(me); G.player = me;
  me.synced = false;   // erst mit dem ersten Schnappschuss steht fest, wo wir stehen
  G.enemies = []; G.pickups = []; G.cashes = []; G.oneUps = []; G.bullets = []; G.boss = null; G.pet = null;
  NET.ens = new Map();
  for (const s of m.ens || []) netAddStatic(s);
  NET.snapAt = 0; NET.hold = ''; NET.menu = false;
  NET.dHist = []; NET.dMin = undefined; NET.jit = 0; NET.delay = null; NET.buHist = []; NET.fxq = []; NET.pcd = 0;
  NET.predQ = { snd: [], muzzleFlash: [], casing: [], shake: [] };
  NET.hostPerks = m.perks || {}; NET.hostHearts = m.hearts; NET.hostBoost = [m.booster || '', m.booster2 || '']; NET.hostHat = m.hostHat || 'none';
  NET.edges = {};
  setState('netplay'); fade = 1; fadeDir = -1; fadeCb = null;
}
function netAddStatic(s) {
  if (NET.ens.has(s[0])) return;
  const e = { nid: s[0], kind: s[1], suit: s[2], shirt: s[3], hair: s[4], skin: s[5], glasses: !!s[6], static: !!s[7], r: s[8], flying: !!s[9], btype: s[10] || undefined, prop: s[11] || undefined, cd: 0,
    x: 0, y: 0, a: 0, state: 'idle', weapon: null, hp: 1, walkT: 0, sayT: 0, sayText: '', flash: 0, recoil: 0, aimT: 0, windup: 0, swingT: 0, swingDir: 1, spot: 0, downAng: 0 };
  NET.ens.set(s[0], e);
  G.enemies.push(e);
}
function netResolve(o) {
  if (!o || typeof o !== 'object') return o;
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = netResolve(o[i]); return o; }
  if (o.__p !== undefined && Object.keys(o).length === 1) return G.players.find((q) => q.idx === o.__p) || G.players[0];
  for (const k in o) o[k] = netResolve(o[k]);
  return o;
}
// ---------- Glätten: alles vom Host etwas in der Vergangenheit zeigen, dafür gleichmäßig ----------
// (Schnappschüsse kommen nie ganz pünktlich - mit kleinem Puffer ruckelt nichts)
function netClock(now, ht) {
  const H = NET.dHist || (NET.dHist = []);
  H.push(now, now - ht);
  while (H.length > 2 && now - H[0] > 3000) H.splice(0, 2);
  let mn = Infinity;
  for (let i = 1; i < H.length; i += 2) if (H[i] < mn) mn = H[i];
  // typische Verspätung (90 %): einzelne Ausreißer überbrückt das Weiterrechnen in netAt
  const late = [];
  for (let i = 1; i < H.length; i += 2) late.push(H[i] - mn);
  late.sort((a, b) => a - b);
  NET.dMin = mn; NET.jit = late[Math.floor((late.length - 1) * 0.9)] || 0;
}
function netRenderTime(dt) {
  const target = NET_SNAP_MS + clamp(NET.jit || 0, 15, 160);
  NET.delay = NET.delay == null ? target : NET.delay + (target - NET.delay) * Math.min(1, dt * 1.5);
  return performance.now() - NET.dMin - NET.delay;
}
function netSample(e, t, x, y, a, d) {
  const h = e._h || (e._h = []);
  if (h.length && t <= h[h.length - 1].t) return;
  h.push({ t, x, y, a, d });
  if (h.length > 14) h.shift();
}
// Stand zur Zeit rt: Position dazwischen, alles andere vom letzten Schnappschuss davor
function netAt(e, rt, apply) {
  const h = e._h;
  if (!h || !h.length) return;
  let i = h.length - 1;
  while (i > 0 && h[i].t > rt) i--;
  const s0 = h[i], s1 = h[i + 1];
  if (apply && s0.d && e._d !== s0.d) { e._d = s0.d; apply(e, s0.d); }
  let x = s0.x, y = s0.y, a = s0.a;
  if (rt > s0.t) {
    if (s1) { const f = (rt - s0.t) / Math.max(1, s1.t - s0.t); x += (s1.x - s0.x) * f; y += (s1.y - s0.y) * f; if (a != null && s1.a != null) a += angDiff(a, s1.a) * f; }
    else if (i > 0) { const q = h[i - 1], f = Math.min(rt - s0.t, 100) / Math.max(1, s0.t - q.t); x += (s0.x - q.x) * f; y += (s0.y - q.y) * f; }
  }
  e.x = x; e.y = y; if (a != null) e.a = a;
}
function netApplyEnemy(e, d) {
  if (d[1] === 'dead') { e.state = 'dead'; return; }
  e.state = d[4]; e.weapon = d[5] || null; e.hp = d[6]; e.walkT = d[7] / 100; e.downAng = d[8] / 1000; e.flash = d[9] / 100; e.recoil = d[10] / 10;
  e.aimT = d[11] / 100; e.windup = d[12] / 100; e.swingT = d[13] / 100; e.swingDir = d[14]; e.spot = d[15] / 100; e.sayText = d[16] || ''; e.sayT = d[17] / 100;
  e.target = d[18] >= 0 ? G.players.find((q) => q.idx === d[18]) || null : null;
  const EX = ENEMY_EXT[e.kind];
  if (EX && EX.netApply && d.length > 19) extCall(EX.netApply, e, d[19]);
}
function netApplyBoss(b, d) { Object.assign(b, d); b.target = d.tg >= 0 ? G.players.find((q) => q.idx === d.tg) || null : null; }
const netApplyPlayer = (p, d) => Object.assign(p, d);
// eigene Figur: Position rechnet der Gast selbst, alles andere (Leben, Waffe...) kommt vom Host
function netOwnSnap(p, d) {
  const keep = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, a: p.a, walkT: p.walkT, swingT: p.swingT, swingDir: p.swingDir, recoil: p.recoil, mouthT: p.mouthT };
  Object.assign(p, d);
  const tp = d.tp | 0;
  if (!p.synced || tp !== (p.tpSeen | 0) || d.execT > 0 || !d.alive) {
    // Etagenstart, Wiederbelebung, Hinrichtung oder tot: dann gilt die Position vom Host
    if (!p.synced || tp !== (p.tpSeen | 0)) { p.ackX = d.pushX || 0; p.ackY = d.pushY || 0; }
    p.synced = true; p.tpSeen = tp; p.vx = 0; p.vy = 0;
    if (!(d.execT > 0) && d.alive) p.a = keep.a;
    return;
  }
  Object.assign(p, keep);
}
// Schnappschüsse von einer Etage, die wir nicht haben? Dann die Etage nochmal anfordern
function netAskResync() { const now = performance.now(); if (now - (NET.resyncAt || 0) < 2500) return; NET.resyncAt = now; netSend({ t: 'resync' }); }
function netClientSnap(m) {
  if (!netInPlay() || !G || m.seq !== NET.floorSeq) { if (state !== 'dialog' && state !== 'levelend' && state !== 'victory') netAskResync(); return; }
  const now = performance.now(), ht = m.ht || now;
  netClock(now, ht);
  NET.snapAt = now;
  Object.assign(G, m.g); NET.hostTime = m.g.time;
  Object.assign(run, m.run);
  NET.hostHearts = m.hearts;
  // Spieler
  const keepIds = new Set();
  for (const d of m.pl) {
    let p = G.players.find((q) => q.idx === d.idx);
    if (!p) { p = makePlayer(d.x, d.y, d.idx); if (d.idx === NET.myIdx) p.synced = false; G.players.push(p); }
    keepIds.add(d.idx);
    netResolve(d);
    if (d.idx === NET.myIdx) netOwnSnap(p, d);
    else { if (!p._h) netApplyPlayer(p, d); netSample(p, ht, d.x, d.y, d.a, d); }
  }
  G.players = G.players.filter((q) => keepIds.has(q.idx));
  G.player = G.players.find((q) => q.idx === NET.myIdx) || G.players[0];
  // Gegner (in den Verlauf, gezeigt wird später in netClientUpdate)
  for (const s of m.ensNew) netAddStatic(s);
  const seen = new Set();
  for (const d of m.en) {
    const e = NET.ens.get(d[0]);
    if (!e) continue;
    seen.add(e);
    const h = e._h, last = h && h.length ? h[h.length - 1] : null;
    if (d[1] === 'dead') { if (!last) e.state = 'dead'; else if (last.d[1] !== 'dead') netSample(e, ht, last.x, last.y, last.a, d); continue; }
    if (!last) { netApplyEnemy(e, d); e.x = d[1] / 4; e.y = d[2] / 4; e.a = d[3] / 1000; }
    netSample(e, ht, d[1] / 4, d[2] / 4, d[3] / 1000, d);
  }
  // Boss (alle Werte)
  if (m.boss) {
    let b = G.boss;
    if (!b || b.nid !== m.boss.nid) { b = { nid: m.boss.nid }; G.boss = b; }
    netResolve(m.boss);
    if (!b._h) netApplyBoss(b, m.boss);
    netSample(b, ht, m.boss.x, m.boss.y, m.boss.a, m.boss);
    seen.add(b);
  } else G.boss = null;
  G.enemies = G.enemies.filter((e) => seen.has(e));
  if (G.boss && !G.enemies.includes(G.boss)) G.enemies.push(G.boss);
  // Haustier, Kugeln, Waffen, Geld
  if (m.pet) {
    const P = G.pet && G.pet.kind === m.pet[4] ? G.pet : (G.pet = { kind: m.pet[4], x: m.pet[0] / 2, y: m.pet[1] / 2, a: m.pet[2] / 100 });
    P.walkT = m.pet[3] / 100; P.biteT = m.pet[5] / 100;
    netSample(P, ht, m.pet[0] / 2, m.pet[1] / 2, m.pet[2] / 100, null);
  } else G.pet = null;
  NET.buHist.push({ ht, list: m.bu.map((q) => ({ _x: q[0] / 4, _y: q[1] / 4, x: q[0] / 4, y: q[1] / 4, vx: q[2], vy: q[3], kind: q[4], owner: q[5] ? 'player' : 'enemy', life: q[6] / 100, sx: q[7], sy: q[8], oi: q[9] == null ? -1 : q[9], ht })) });
  if (NET.buHist.length > 8) NET.buHist.shift();
  const oldPk = new Map(G.pickups.map((k) => [k.nid, k]));
  G.pickups = m.pk.map((q) => {
    const o = oldPk.get(q[0]) || { nid: q[0], x: q[1] / 4, y: q[2] / 4 };
    o.id = q[3]; o.rot = q[4] / 100; o.flying = !!q[5];
    if (o.flying) netSample(o, ht, q[1] / 4, q[2] / 4, null, null); else { o.x = q[1] / 4; o.y = q[2] / 4; o._h = null; }
    return o;
  });
  G.cashes = m.ca.map((q) => ({ x: q[0] / 2, y: q[1] / 2, t: 0 }));
  G.oneUps = m.ou.map((q) => ({ x: q[0] / 2, y: q[1] / 2, t: 0 }));
  // Türen
  const open = new Map();
  for (let i = 0; i < m.doors.length; i += 2) open.set(m.doors[i], m.doors[i + 1]);
  for (const k in G.doors) { const d = G.doors[k]; if (d.glass || d.security) continue; const s = open.get(+k); d.open = s !== undefined; if (s !== undefined) d.side = s; }
  G.waves = netResolve(m.wv); G.booms = netResolve(m.bm); G.lanes = netResolve(m.ln); G.hazards = netResolve(m.hz);
  G.arena = m.ar ? netResolve(m.ar) : null;
  if (m.md) G.modState = netResolve(m.md) || {};   // Zustand der Etagen-Mods vom Host
  // Effekte erst abspielen, wenn das Bild so weit ist (passt dann zu den Figuren)
  for (const f of m.fx) NET.fxq.push([ht, f]);
}
// Effekte nachspielen
function netReplay(name, a) {
  try {
    if (name === 'snd') { Sound.play(...a); return; }
    if (name === 'corpse') { stampCorpse(a[0], a[1]); return; }
    if (name === 'juice') { netJuiceFx(a[0], a[1], a[2]); return; }
    if (name === 'safe') {
      const [tx, ty] = a, i = ty * G.w + tx;
      G.tiles[i] = G.under[i]; G.solid[i] = 0; drawFloorTile(G.fg, G.under[i], tx, ty);
      return;
    }
    if (typeof window[name] === 'function') window[name](...a);
  } catch (e) { /* ein kaputter Effekt darf das Spiel nicht stoppen */ }
}
// eigene Schüsse hat der Gast schon selbst gezeigt (netPredictShot) - nicht doppelt
function netPredicted(kind) {
  const q = NET.predQ && NET.predQ[kind];
  if (!q) return false;
  const now = performance.now();
  while (q.length && now - q[0] > 1200) q.shift();
  if (!q.length) return false;
  q.shift();
  return true;
}
// nur die Optik der O-Saft-Explosion
function netJuiceFx(x, y, r) {
  Sound.play('explode'); Sound.play('splat'); shake(9); G.flash = 0.12;
  for (let i = 0; i < 46; i++) { const a = rand(TAU), sp = rand(30, 220); G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.2, 0.55), col: pick(JUICE), s: pick([1, 2, 2, 3]), kind: 'blood', fric: 6 }); }
  withDecal(x, y, r + 8, (g) => { for (let k = 0; k < 9; k++) { const a2 = (k / 9) * TAU + hash(k, Math.round(x)), d = hash(Math.round(y), k) * r * 0.7; pxEll(g, x + Math.cos(a2) * d, y + Math.sin(a2) * d, 3 + (k % 4), 2 + (k % 3), ['#e8820a', '#f0a01a', '#d97400'][k % 3]); } });
  G.parts.push({ x, y, vx: 0, vy: 0, life: 0.12, max: 0.12, col: '#fff3c0', s: r * 0.8, kind: 'flash' });
}
function netClientEnd(m) {
  if (m.info.final) return;
  endInfo = Object.assign({}, m.info, { newCall: false, unlock: '', record: false });
  setState('levelend'); fade = 1; fadeDir = -1; fadeCb = null;
  Sound.muffle(false); Sound.playSong('win');
}
function netClientToLobby(msg) {
  if (NET.mode !== 'client') return;
  if (netInPlay() || state === 'netcard') {
    fade = 1; fadeDir = -1; fadeCb = null; WS = null;
    enterHub(); cityMsg(msg || 'DER HOST IST ZURÜCK IN SEINER STADT.', 4);
  }
}
// ---------- Gast: eigene Figur sofort bewegen (wie beim Host gerechnet, nur ohne Warten) ----------
function netLocalResolve(e) {
  const r = e.r;
  const x0 = Math.floor((e.x - r) / TS), x1 = Math.floor((e.x + r) / TS);
  const y0 = Math.floor((e.y - r) / TS), y1 = Math.floor((e.y + r) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (blocksMoveTile(tx, ty) !== 1) continue;   // Türen macht der Host auf
    const rx = tx * TS, ry = ty * TS;
    const cx = clamp(e.x, rx, rx + TS), cy = clamp(e.y, ry, ry + TS);
    const ddx = e.x - cx, ddy = e.y - cy, d2 = ddx * ddx + ddy * ddy;
    if (d2 >= r * r) continue;
    if (d2 > 0) { const d = Math.sqrt(d2); e.x += ddx / d * (r - d); e.y += ddy / d * (r - d); }
    else {
      const l = e.x - rx, rr = rx + TS - e.x, t = e.y - ry, bb = ry + TS - e.y, m = Math.min(l, rr, t, bb);
      if (m === l) e.x = rx - r; else if (m === rr) e.x = rx + TS + r; else if (m === t) e.y = ry - r; else e.y = ry + TS + r;
    }
  }
}
function netLocalMove(e, dx, dy) { e.x += dx; netLocalResolve(e); e.y += dy; netLocalResolve(e); }
function netLocalStep(p, dt, mx, my, fire) {
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  const w = p.weapon && WEAPONS[p.weapon.id] ? WEAPONS[p.weapon.id] : FISTS;
  const boost = NET.hostBoost && NET.hostBoost.includes('speed');
  const sp = 105 * (1 + 0.08 * perkP(p, 'speed')) * (w.spin && fire ? 0.55 : 1) * (boost ? 1.12 : 1) * (hasMask(p, 'hase') ? 1.15 : 1), k = 1 - Math.exp(-dt * 18);
  p.vx += (mx * sp - p.vx) * k; p.vy += (my * sp - p.vy) * k;
  netLocalMove(p, p.vx * dt, p.vy * dt);
  if (ml > 0.1) {
    p.walkT += dt;
    // Türhilfe wie beim Host: wer schräg auf eine Öffnung zuläuft, wird hineingeschoben
    const horiz = Math.abs(mx) > Math.abs(my), dir = horiz ? Math.sign(mx) : Math.sign(my);
    const tx = horiz ? Math.floor((p.x + dir * (p.r + 3)) / TS) : Math.floor(p.x / TS), ty = horiz ? Math.floor(p.y / TS) : Math.floor((p.y + dir * (p.r + 3)) / TS);
    if (blocksMoveTile(tx, ty) === 1) {
      for (const s2 of [-1, 1]) {
        const ox = horiz ? tx : tx + s2, oy = horiz ? ty + s2 : ty;
        if (blocksMoveTile(ox, oy) === 1) continue;
        const c = horiz ? oy * TS + 8 : ox * TS + 8, cur = horiz ? p.y : p.x;
        if (Math.abs(c - cur) > 13) continue;
        const step = Math.sign(c - cur) * Math.min(Math.abs(c - cur), 85 * dt);
        if (horiz) netLocalMove(p, 0, step); else netLocalMove(p, step, 0);
        break;
      }
    }
  }
  const c = T_(Math.floor(p.x / TS), Math.floor(p.y / TS));
  if (c === '>') netLocalMove(p, 46 * dt, 0); else if (c === '<') netLocalMove(p, -46 * dt, 0);
}
// eigener Schuss/Schlag: Knall, Mündungsfeuer und Hülse sofort (die Kugel selbst kommt vom Host)
function netPredictShot(p, now, dt) {
  NET.pcd = (NET.pcd || 0) - dt;
  if (NET.pcd > 0) return;
  const w = p.weapon && WEAPONS[p.weapon.id] ? WEAPONS[p.weapon.id] : FISTS, Q = NET.predQ;
  if (w.ranged) {
    if (w.special || w.spin || w.onFire || !(w.auto ? mouse.down : mouse.pl) || !(p.weapon.ammo > 0)) return;
    NET.pcd = w.rate;
    let mx = p.x + Math.cos(p.a) * 10, my = p.y + Math.sin(p.a) * 10;
    if (!los(p.x, p.y, mx, my)) { mx = p.x; my = p.y; }
    muzzleFlash(mx, my); Q.muzzleFlash.push(now);
    if (!weaponNoCasing(w)) { casing(p.x, p.y, p.a); Q.casing.push(now); }
    shake(w.shake); Q.shake.push(now);
    Sound.play(w.sfx); Q.snd.push(now);
    p.recoil = 2; p.mouthT = 0.12;
  } else if (mouse.down) {
    NET.pcd = w.rate;
    Sound.play('swoosh'); Q.snd.push(now);
    p.swingT = 0.18; p.swingDir = -(p.swingDir || 1);
  }
}
// Kugeln: fremde zur Bild-Zeit, eigene so aktuell wie möglich
function netShowBullets(rt, nowHost) {
  const H = NET.buHist;
  if (!H || !H.length) { G.bullets = []; return; }
  let s = H[0];
  for (const x of H) if (x.ht <= rt) s = x;
  const newest = H[H.length - 1], out = [];
  const put = (b, t) => { const k = clamp((t - b.ht) / 1000, 0, 0.15); b.x = b._x + b.vx * k; b.y = b._y + b.vy * k; out.push(b); };
  for (const b of s.list) if (b.oi !== NET.myIdx) put(b, rt);
  for (const b of newest.list) if (b.oi === NET.myIdx) put(b, nowHost);
  G.bullets = out;
}
// Eingaben + eigene Position senden, eigene Figur sofort bewegen, den Rest glätten
// frozen = der Gast sitzt gerade am Wireshark-PC: keine Eingaben, Spiel + Netz laufen weiter
function netClientUpdate(dt, frozen) {
  if (!G) return;
  const now = performance.now();
  if (!frozen && pressed.Escape) { NET.menu = !NET.menu; Sound.play('select'); }
  const p = G.player && G.player.idx === NET.myIdx ? G.player : null;
  if (p) {
    const wm = screenToWorld(mouse.x, mouse.y);
    let mx = 0, my = 0;
    if (!NET.menu && !frozen) {
      if (keys.KeyW || keys.ArrowUp) my--; if (keys.KeyS || keys.ArrowDown) my++;
      if (keys.KeyA || keys.ArrowLeft) mx--; if (keys.KeyD || keys.ArrowRight) mx++;
    }
    const fire = !NET.menu && !frozen && mouse.down, free = p.alive && p.synced && !(p.execT > 0);
    const aim = Math.atan2(wm.y - p.y, wm.x - p.x);
    if (p.alive && !(p.execT > 0) && !NET.menu && !frozen) p.a = aim;
    if (free) {
      netLocalStep(p, dt * (G.slowmo > 0 ? 0.3 : 1) * (G.focusT > 0 ? 0.8 : 1), mx, my, fire);
      // Stöße vom Host nachmachen (Boss zieht, Gegner schubsen, Weste)
      const ux = (p.pushX || 0) - (p.ackX || 0), uy = (p.pushY || 0) - (p.ackY || 0);
      if (ux || uy) { netLocalMove(p, ux, uy); p.ackX = p.pushX || 0; p.ackY = p.pushY || 0; }
    }
    if (!NET.menu && !frozen) {
      const E = NET.edges;
      if (mouse.pl) E.fireP = 1; if (mouse.pr) E.alt = 1; if (pressed.Space) E.exec = 1;
      if (pressed.KeyQ || pressed.KeyF) E.finger = 1; if (pressed.KeyV) E.wave = 1;
      if (pressed.KeyE) {   // am Wireshark-PC hackt der Gast selbst, sonst geht [E] an den Host (Hebel, Automat, Schacht...)
        const ti = p.alive && p.synced ? nearTerminal(p) : -1;
        if (ti >= 0) openWireshark({ guest: true, ti }); else E.use = 1;
      }
      if (free) netPredictShot(p, now, dt);
    }
    NET.sendT -= dt;
    if (NET.sendT <= 0 || NET_EDGES.some((k) => NET.edges[k])) {
      NET.sendT = 1 / 20;
      const r1 = (v) => Math.round(v * 10) / 10;
      const i = Object.assign({ mx, my, aim: Math.round(p.a * 1000) / 1000, fire: fire ? 1 : 0 }, NET.edges);
      if (p.synced) Object.assign(i, { x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), ax: r1(p.ackX || 0), ay: r1(p.ackY || 0), tp: p.tpSeen | 0, fs: NET.floorSeq });
      netSend({ t: 'in', i });
      NET.edges = {};
    }
  }
  // alle anderen gleichmäßig in der Vergangenheit zeigen
  if (NET.dMin !== undefined) {
    const rt = netRenderTime(dt), nowHost = now - NET.dMin;
    for (const q of G.players) if (q !== p) netAt(q, rt, netApplyPlayer);
    for (const e of G.enemies) if (e.state !== 'dead') netAt(e, rt, e === G.boss ? netApplyBoss : netApplyEnemy);
    for (const o of G.pickups) if (o.flying) netAt(o, rt, null);
    if (G.pet) netAt(G.pet, rt, null);
    netShowBullets(rt, nowHost);
    // Effekte, sobald das Bild so weit ist
    let n = 0;
    while (NET.fxq.length && NET.fxq[0][0] <= rt && n++ < 400) { const f = NET.fxq.shift()[1]; if (f[2] === NET.myIdx && netPredicted(f[0])) continue; netReplay(f[0], f[1]); }
  }
  if (NET.hostTime !== undefined) G.time = NET.hostTime + (now - NET.snapAt) / 1000;
  G.introT -= dt; G.flash -= dt; G.shake = Math.max(0, G.shake - dt * 30);
  floorModsCall('clientUpdate', dt);   // Etagen-Mods beim Gast (nur Anzeige, Zustand kommt vom Host)
  updateParticles(dt);
  updateCamera(dt);
  if (NET.payT > 0) NET.payT -= dt;
}
// Bild des Gasts: wie beim Host, nur mit den Herzen/Perks des Hosts
function netClientRender() {
  if (!G) return;
  const keep = { hearts: save.hearts, perks: save.perks, booster: save.booster, booster2: save.booster2 };
  save.hearts = NET.hostHearts != null ? NET.hostHearts : save.hearts;
  save.perks = NET.hostPerks || save.perks;
  if (NET.hostBoost) { save.booster = NET.hostBoost[0]; save.booster2 = NET.hostBoost[1]; }
  const host = G.players.find((q) => q.idx === 0); if (host) host.hat = NET.hostHat;
  try {
    renderWorld(); drawHUD();
    if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, G.flash * 3)})`; ctx.fillRect(0, 0, W, H); }
  } finally { Object.assign(save, keep); }
  const holdTxt = { pause: 'DER HOST HAT PAUSIERT...', wireshark: 'DER HOST HACKT GERADE MIT WIRESHARK...', card: 'GLEICH GEHT ES LOS...', dialog: 'DER HOST TELEFONIERT MIT RUSSIAN HACKER BOI...', victory: 'GESCHAFFT! DER HOST FEIERT.' }[NET.hold];
  if (holdTxt && performance.now() - NET.holdAt < 1500) { panel(W / 2 - 150, H / 2 - 12, 300, 24, '#66aaff'); txt(holdTxt, W / 2, H / 2 - 4, { font: FS, align: 'center', color: '#ffffff' }); }
  if (!G.players.some((q) => q.alive)) { panel(W / 2 - 110, H - 40, 220, 18, '#66aaff'); txt('DER HOST ENTSCHEIDET, WIE ES WEITERGEHT...', W / 2, H - 35, { font: FS, align: 'center', color: '#66aaff' }); }
  txt('ONLINE: ' + NET.code + '  -  ' + netLinkText() + (NET.ping ? '  -  PING ' + NET.ping + ' MS' : ''), W / 2, H - 22, { font: FS, align: 'center', color: NET.ping > 200 ? '#ffb52a' : '#66aaff' });
  if (NET.menu) {
    ctx.fillStyle = 'rgba(0,8,20,0.75)'; ctx.fillRect(0, 0, W, H);
    txt('ONLINE-KOOP', W / 2, 60, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
    listMenu('netmenu', [
      { label: 'WEITER', act: () => { NET.menu = false; } },
      { label: 'VERBINDUNG TRENNEN', act: () => { NET.menu = false; netLeave(); goto(() => { enterHub(); cityMsg('ONLINE-SPIEL VERLASSEN.', 3); }); } },
    ], W / 2, 110, 20);
  }
}
// Kartenbild beim Gast, bis der Host loslegt
function netCardScreen() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const arena = run && run.li === 'arena', L = levelById(run.li);
  txt(arena ? 'ARENA' : L.final ? 'FINALE' : levelLabel(run.li), W / 2, 44, { size: 32, align: 'center', color: (i) => neon(i * 2), wave: 3, shadow: '#400020' });
  txt(L.chapter, W / 2, 96, { align: 'center', color: '#ffffff' });
  txt(L.name, W / 2, 120, { size: 16, align: 'center', color: '#ffd84a', wave: 2 });
  txt('ONLINE-KOOP MIT ' + NET.code + '  -  DU BIST SPIELER ' + (NET.myIdx + 1), W / 2, 160, { font: FS, align: 'center', color: '#66aaff' });
  if (Math.floor(T * 2) % 2 === 0) txt('WARTE AUF DEN HOST...', W / 2, 200, { font: FS, align: 'center', color: '#777777' });
}

// =====================================================================
//  STADT: beide schicken ihre Position, damit man sich auch dort sieht
// =====================================================================
function netCityTick(dt) {
  if (!NET.connected || !C) return;
  NET.cityT = (NET.cityT || 0) - dt;
  if (NET.cityT > 0) return;
  NET.cityT = 0.1;
  netSend({ t: 'cp', idx: NET.mode === 'host' ? 0 : NET.myIdx, x: Math.round(C.p.x), y: Math.round(C.p.y), a: Math.round(C.p.a * 100) / 100, w: Math.round(C.p.walkT * 100) / 100,
    car: C.inCar ? 1 : 0, cx: Math.round(C.car.x), cy: Math.round(C.car.y), ca: Math.round(C.car.a * 100) / 100, v: save.vehicle, hat: save.hat, n: unameGet() });
}
function netGotCity(m) {
  const o = NET.others[m.idx || 0] || (NET.others[m.idx || 0] = {});
  Object.assign(o, m); o.at = performance.now();
  if (o.rx === undefined || Math.abs(o.rx - o.x) > 300 || Math.abs(o.ry - o.y) > 300) { o.rx = o.x; o.ry = o.y; }
}
function drawOtherPlayer(g) {
  if (!NET.connected) return;
  const me = NET.mode === 'host' ? 0 : NET.myIdx, k = Math.min(1, frameDt * 12);
  for (const key in NET.others) {
    const o = NET.others[key], idx = +key;
    if (idx === me || performance.now() - o.at > 4000) continue;
    o.rx += (o.x - o.rx) * k; o.ry += (o.y - o.ry) * k;
    if (o.car) { drawVehicle(g, { x: o.rx, y: o.ry, a: o.ca, v: 0 }, false, VEHICLES[o.v] ? o.v : 'car'); g.drawImage(SPR.headC, Math.round(o.rx) - 7, Math.round(o.ry) - 9); }
    else drawHuman(g, { x: o.rx, y: o.ry, a: o.a, walkT: o.w, isPlayer: true, suit: ['', '#1f4f9a', '#2a8a3a', '#c8641a'][idx] || undefined, hat: HATS[o.hat] ? o.hat : 'none', r: 5, invT: 0, mouthT: 0, armor: 0, state: '' });
    const nm = netPlayerName(idx) + (idx === 0 ? ' (HOST)' : ''), nw = textWidth(nm, '8px ' + FS), col = ['#ff9ad5', '#66aaff', '#7dff7a', '#ffb52a'][idx] || '#ffffff';
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(Math.round(o.rx - nw / 2 - 2), Math.round(o.ry) - 37, Math.ceil(nw) + 4, 10);
    txt(nm, o.rx, o.ry - 36, { g, font: FS, align: 'center', color: col });
    g.fillStyle = col; g.beginPath(); g.moveTo(Math.round(o.rx) - 2, Math.round(o.ry) - 27); g.lineTo(Math.round(o.rx) + 2, Math.round(o.ry) - 27); g.lineTo(Math.round(o.rx), Math.round(o.ry) - 24); g.fill();
  }
}

// ---------- gemeinsamer Spielstand (ein Konto für beide) ----------
function netSyncTick(dt) {
  // Relay: Aushang auffrischen, stumme Verbindungen schließen, gewünschte Anrufe starten
  if (NET.mode === 'host') {
    relayAdvertise(false);
    if (NET.dlgWant && netDlgFree()) netDlgRun();
    const now = performance.now();
    for (const e of NET.conns) if (e.conn.relay && now - e.conn.lastRx > 45000) e.conn.close();
  } else if (NET.connected && NET.conn && NET.conn.relay && performance.now() - NET.conn.lastRx > 30000) { NET.conn.close(); return; }
  if (!NET.connected) return;
  // Fahndungsstufe gehört allen (der Host bestimmt sie)
  if (NET.mode === 'host' && C && NET.wantedSent !== C.wanted) { NET.wantedSent = C.wanted; netSend({ t: 'wanted', w: C.wanted }); }
  // Spielerliste mit Namen (Host -> alle), bei Änderung sofort, sonst alle 5 s
  if (NET.mode === 'host') {
    const ros = JSON.stringify(netRosterList()), now = performance.now();
    if (ros !== NET.rosSent || now - (NET.rosAt || 0) > 5000) { NET.rosSent = ros; NET.rosAt = now; netSend({ t: 'ros', l: JSON.parse(ros) }); }
  }
  // Ping messen
  if (NET.mode === 'client') { NET.pingT = (NET.pingT || 0) - dt; if (NET.pingT <= 0) { NET.pingT = 2; netSend({ t: 'ping', ts: performance.now(), last: NET.ping || 0 }); } }
  // eigene Perks/Maske/Hut an den Host melden
  if (NET.mode === 'client') { const me = JSON.stringify([save.perks, save.mask, save.hat, unameGet()]); if (me !== NET.meSent) { NET.meSent = me; netSend({ t: 'me', perks: save.perks, mask: save.mask || 'none', hat: save.hat, n: unameGet() }); } }
  if (!NET.saveDirty) return;
  NET.saveT = (NET.saveT || 0) - dt;
  if (NET.saveT > 0) return;
  NET.saveT = 0.5; NET.saveDirty = false;
  const s = Object.assign({}, save); delete s.city; delete s.opts; delete s.wanted; delete s.perks; delete s.mask; delete s.hat;
  netSend({ t: 'save', s });
}
function netApplySave(s) {
  const keep = { city: save.city, opts: save.opts, wanted: save.wanted, seenTut: save.seenTut, perks: save.perks, mask: save.mask, hat: save.hat };
  save = Object.assign(defaultSave(), s, keep);
  save.stats = Object.assign(defaultSave().stats, s.stats || {});
  if (NET.mode === 'host') { try { localStorage.setItem(slotKey(SLOT), JSON.stringify(save)); } catch (e) { /* egal */ } }
}
// Gast: Fahndungsstufe vom Host übernehmen (die Polizei jagt alle)
function netGotWanted(w) {
  if (!C) return;
  const before = C.wanted;
  C.wanted = w;
  if (w > before) {
    C.lostT = 0; C.lastKnown = { x: C.p.x, y: C.p.y }; if (PF) PF.footKey = PF.carKey = -1;
    cityMsg('FAHNDUNG: ' + w + (w > 1 ? ' STERNE' : ' STERN') + '!', 2.5); Sound.play('whistle'); startChase(before > 0);
  } else if (w === 0 && before > 0) { endChase(); cityMsg('DIE POLIZEI SUCHT EUCH NICHT MEHR.', 2.5); }
}
// Gast: eigene Perks/Maske/Hut im eigenen Spielstand behalten
function netKeepOwn() {
  try { const k = slotKey(SLOT), d = JSON.parse(localStorage.getItem(k) || 'null'); if (d) { d.perks = save.perks; d.mask = save.mask; d.hat = save.hat; localStorage.setItem(k, JSON.stringify(d)); } } catch (e) { /* egal */ }
}

// ---------- Benutzernamen + Spielerliste ----------
function netCleanName(n) { return unameClean(n); }
const netMeIdx = () => (NET.mode === 'host' ? 0 : NET.myIdx);
// Anzeigename von Spieler idx (eigener Name aus localStorage, andere aus Liste/Stadt-Paketen)
function netPlayerName(idx) {
  idx |= 0;
  if (!NET.connected || idx === netMeIdx()) return unameMy(idx);
  let n = '';
  if (NET.mode === 'host') { const e = NET.conns.find((c) => c.idx === idx); n = e && e.name; }
  else { const r = (NET.roster || []).find((q) => q[0] === idx); n = r && r[1]; }
  if (!n && NET.others[idx]) n = NET.others[idx].n;
  return netCleanName(n) || 'SPIELER ' + (idx + 1);
}
// Host: [[idx, name], ...]
function netRosterList() { return [[0, unameGet()]].concat(NET.conns.map((e) => [e.idx, e.name || ''])).sort((a, b) => a[0] - b[0]); }
// alle Spieler (inkl. mir): { idx, name, me, here (gerade in der Stadt, Position bekannt), o (Stadt-Paket), ping }
function netPeople() {
  if (!NET.connected) return [];
  const me = netMeIdx(), now = performance.now(), ids = new Set([0, me]);
  if (NET.mode === 'host') for (const e of NET.conns) ids.add(e.idx);
  else if (NET.roster) for (const r of NET.roster) ids.add(r[0]);
  for (const k in NET.others) if (now - NET.others[k].at < 4000) ids.add(+k);
  return [...ids].sort((a, b) => a - b).map((idx) => {
    const o = NET.others[idx], ent = NET.mode === 'host' ? NET.conns.find((c) => c.idx === idx) : null;
    return { idx, name: netPlayerName(idx), me: idx === me, here: idx === me ? state === 'city' : !!(o && now - o.at < 4000), o: idx === me ? null : o || null, ping: idx === me ? 0 : ent ? ent.ping || 0 : 0 };
  });
}
// eigener Name geändert -> sofort weitersagen
function netNameChanged() { NET.meSent = ''; NET.rosSent = ''; }
