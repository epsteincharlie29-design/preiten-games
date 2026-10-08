'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Lil-Level, Skills, Kopfgeld-Jagd, Sammeln
//  - Erfahrung (EP) für alles: Gegner, Aufträge, Säfte, Kopfgelder ...
//    Jedes Lil-Level = 1 Skillpunkt (Handy-App PROFIL)
//  - Kopfgeld-Jagd: Gangster in der Stadt aufspüren und erledigen
//  - 25 goldene Orangen sind in der Stadt und auf dem Land versteckt
// =====================================================================
const SKILLS = {
  hp: { name: 'AUSDAUER', max: 3, desc: (l) => '+1 HERZ IN DER STADT (JETZT +' + l + ')' },
  deal: { name: 'VERHANDELN', max: 5, desc: (l) => 'SÄFTE 4% MEHR WERT PRO STUFE (JETZT +' + l * 4 + '%)' },
  charm: { name: 'CHARME', max: 3, desc: (l) => 'KUNDEN KAUFEN AUF DER STRASSE ÖFTER (+' + l * 8 + '%)' },
  thumb: { name: 'GRÜNER DAUMEN', max: 3, desc: (l) => 'FRÜCHTE WACHSEN 8% SCHNELLER PRO STUFE (JETZT -' + l * 8 + '%)' },
  fingers: { name: 'LANGE FINGER', max: 3, desc: (l) => 'TASCHENDIEBSTAHL: GRÜNER BEREICH GRÖSSER (+' + l * 15 + '%)' },
  aim: { name: 'SCHARFSCHÜTZE', max: 3, desc: (l) => 'IN DER STADT: SCHNELLER NACHLADEN, MEHR MUNITION (+' + l * 20 + '%)' },
  hunter: { name: 'KOPFGELDJÄGER', max: 3, desc: (l) => 'KOPFGELDER BRINGEN MEHR GELD (+' + l * 15 + '%)' },
  lucky: { name: 'GLÜCKSKIND', max: 3, desc: (l) => 'GEGNER IN LEVELN LASSEN MEHR GELD FALLEN (+' + l * 8 + '%)' },
};
const sk = (id) => (save.skills && save.skills[id]) || 0;
const lilXpNeed = (lv) => Math.round(120 * Math.pow(lv, 1.35));
function lilXP(n, why) {
  if (NET.mode === 'client' && NET.connected) return;
  save.lil = save.lil || { lv: 1, xp: 0, pts: 0 };
  const L = save.lil;
  L.xp += n;
  while (L.xp >= lilXpNeed(L.lv)) {
    L.xp -= lilXpNeed(L.lv); L.lv++; L.pts++;
    const msg = 'LIL-LEVEL ' + L.lv + '! +1 SKILLPUNKT (HANDY: PROFIL)';
    if (state === 'city' && typeof bizNotify === 'function') bizNotify(msg, '#ff9ad5');
    else if (G && state === 'play') floatText(G.player.x, G.player.y - 34, 'LIL-LEVEL ' + L.lv + '!', 'rainbow');
    Sound.play('levelup');
  }
}
function buySkill(id) {
  const L = save.lil || { pts: 0 }, S = SKILLS[id], lv = sk(id);
  if (lv >= S.max) { cityMsg(S.name + ' IST SCHON AUF MAX.', 2); return; }
  if (L.pts <= 0) { cityMsg('KEINE SKILLPUNKTE. SAMMEL ERFAHRUNG (GEGNER, AUFTRÄGE, SÄFTE, KOPFGELDER)!', 3); Sound.play('click'); return; }
  L.pts--; (save.skills = save.skills || {})[id] = lv + 1; persist();
  Sound.play('levelup'); cityMsg(S.name + ' STUFE ' + (lv + 1) + ': ' + S.desc(lv + 1), 3);
}

// ---------- Kopfgeld-Jagd ----------
const BOUNTY_NAMES = ['ZITRONEN-ZORAN', 'DER SAURE SASCHA', 'MESSER-MANNI', 'KLEPTO-KLAUS', 'BÖSE BIRGIT', 'DÖNER-DIETER', 'GOLDZAHN-GERD', 'SCHMIER-SCHORSCH', 'RATTEN-RALF', 'TURBO-TANJA', 'BROKKOLI-BERND', 'ZOCKER-ZOE'];
const BOUNTY_CRIMES = ['HAT 300 ORANGEN GEKLAUT', 'VERKAUFT GEPANSCHTEN SAFT', 'HAT DEN KIOSK AUSGERAUBT', 'ARBEITET FÜR DIE ZITRONIA AG', 'KLAUT FAHRRÄDER', 'HAT DIE POLIZEI AUSGELACHT', 'FÄLSCHT TIKITIKILUKAS O-SAFT', 'SCHULDET RUSSIAN HACKER BOI GELD'];
function makeBountyOffers() {
  const b = B(), lv = (save.lil && save.lil.lv) || 1;
  C.bounties = [0, 1, 2].map((i) => {
    const tier = i + 1, pay = Math.round((180 + tier * 160 + lv * 25) * rand(0.9, 1.15) / 10) * 10;
    return { name: pick(BOUNTY_NAMES), crime: pick(BOUNTY_CRIMES), tier, pay, guards: tier - 1 };
  });
  C.bountyT = 240;
}
function startBounty(o) {
  if (C.bounty) { cityMsg('DU JAGST SCHON JEMANDEN!', 2); return; }
  if (!PF) pfInit();
  const s = jobSpot(C.p, 500, 1200, false);
  const boss = Object.assign(makePed(Math.floor(s.y / TS) * CW + Math.floor(s.x / TS)), { x: s.x, y: s.y, bountyTarget: true, name: o.name, suit: '#2a2a30', shirt: '#e01b3c', hair: '#111', glasses: true, hp: 2 + o.tier, still: false, armed: o.tier >= 2 });
  C.peds.push(boss);
  const guards = [];
  for (let k = 0; k < o.guards; k++) { const g = Object.assign(makePed(Math.floor(s.y / TS) * CW + Math.floor(s.x / TS)), { x: s.x + rand(-20, 20), y: s.y + rand(-20, 20), bountyGuard: true, suit: '#3a3a44', shirt: '#e01b3c', hp: 2, armed: true }); C.peds.push(g); guards.push(g); }
  C.bounty = { o, ped: boss, guards, t: 180 };
  C.wp = { x: s.x, y: s.y };
  C.phone = null;
  cityMsg('KOPFGELD: ' + o.name + ' (' + o.crime + '). FOLG DEM NAVI! ' + o.pay + '€ BELOHNUNG.', 4);
  Sound.play('select');
}
function updateBounty(dt) {
  if (C.bountyT == null || !C.bounties) makeBountyOffers();
  C.bountyT -= dt; if (C.bountyT <= 0 && !C.bounty) makeBountyOffers();
  const Bt = C.bounty;
  if (!Bt) return;
  Bt.t -= dt;
  const q = Bt.ped;
  if (q.dead) {
    const pay = Math.round(Bt.o.pay * (1 + sk('hunter') * 0.15));
    save.money += pay; save.stats.bounties = (save.stats.bounties || 0) + 1; lilXP(40 + Bt.o.tier * 20);
    C.bounty = null; C.wp = null; persist();
    cityMsg('KOPFGELD KASSIERT: ' + Bt.o.name + ' ERLEDIGT! +' + pay + '€', 4); Sound.play('cash'); Sound.play('win');
    C.bounties = C.bounties.filter((x) => x !== Bt.o);
    return;
  }
  if (Bt.t <= 0) { cityMsg('ZU LANGSAM! ' + Bt.o.name + ' IST UNTERGETAUCHT.', 3); Sound.play('lose'); C.peds = C.peds.filter((p) => p !== q && !Bt.guards.includes(p)); C.bounty = null; C.wp = null; return; }
  C.wp = { x: q.x, y: q.y };
  // Gesuchte fliehen, Leibwächter schießen zurück
  const p = C.p, d = dist(q.x, q.y, p.x, p.y);
  if (d < 160) { q.fleeT = 0.5; if (!q.spotted) { q.spotted = true; q.sayText = pick(['DU KRIEGST MICH NIE!', 'ER IST HIER! LEUTE!', 'KOPFGELDJÄGER!!!']); q.sayT = 2; } }
  for (const g of Bt.guards.concat(q.armed ? [q] : [])) {
    if (g.dead || g.state === 'down') continue;
    const dg = dist(g.x, g.y, p.x, p.y);
    if (g !== q && dg < 200 && dg > 30) { const a = Math.atan2(p.y - g.y, p.x - g.x); g.a = a; cityMove(g, Math.cos(a) * 50 * dt, Math.sin(a) * 50 * dt); g.walkT += dt; g.fleeT = 0; }
    g.gunT = (g.gunT == null ? 1.5 : g.gunT) - dt;
    if (g.gunT <= 0 && dg < 170 && !C.inCar && cityLOS(g.x, g.y, p.x, p.y)) {
      g.gunT = rand(1.2, 2); const a = Math.atan2(p.y - g.y, p.x - g.x);
      spawnCityBullet(g.x + Math.cos(a) * 8, g.y + Math.sin(a) * 8, a + rand(-0.16, 0.16), 260, 'c', 1.2, 1, 'bullet'); Sound.play('pistol', 0.5);
    }
  }
}
function drawBounty(g) {
  const Bt = C.bounty;
  if (!Bt || Bt.ped.dead) return;
  const q = Bt.ped;
  g.strokeStyle = '#ff3b3b'; g.lineWidth = 1; g.beginPath(); g.arc(q.x, q.y, 11 + Math.sin(T * 6) * 2, 0, TAU); g.stroke();
  txt('GESUCHT: ' + q.name, q.x, q.y - 28, { g, font: FS, align: 'center', color: '#ff6a6a' });
}

// ---------- Goldene Orangen (versteckt) ----------
function goldSpots() {
  if (CITY.gold) return CITY.gold;
  const out = [], R = mulberry32(4242);
  for (let k = 0; k < 2000 && out.length < 25; k++) {
    const x = 2 + Math.floor(R() * (CW - 4)), y = 2 + Math.floor(R() * (CH - 12)), c = CITY.t[y * CW + x];
    if (!'gma'.includes(c) || CITY.solid[y * CW + x]) continue;
    if (out.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 14)) continue;
    out.push([x, y]);
  }
  CITY.gold = out;
  return out;
}
function updateGold() {
  const got = (save.gold = save.gold || {}), p = C.p;
  goldSpots().forEach(([x, y], i) => {
    if (got[i] || C.inCar || Math.abs(p.x - x * TS - 8) > 12 || Math.abs(p.y - y * TS - 8) > 12) return;
    got[i] = true;
    const n = Object.keys(got).length;
    save.money += 250; lilXP(30); persist();
    Sound.play('coin'); Sound.play('win');
    cityMsg('GOLDENE ORANGE GEFUNDEN! (' + n + '/25) +250€' + (n === 25 ? ' - ALLE! DU BEKOMMST DEN GOLDHUT!' : ''), 3.5);
    if (n === 25) { save.hats.goldorange = true; }
  });
}
function drawGold(g) {
  const got = save.gold || {};
  goldSpots().forEach(([x, y], i) => {
    if (got[i]) return;
    const X = x * TS + 8, Y = y * TS + 8;
    if (offscreen(X, Y, 20)) return;
    const bob = Math.round(Math.sin(T * 3 + i) * 2);
    pxEll(g, X, Y + bob, 4, 4, '#c89a00'); pxEll(g, X, Y + bob, 3, 3, '#ffd23f'); g.fillStyle = '#fff6c0'; g.fillRect(X - 2, Y - 2 + bob, 1, 1); g.fillStyle = '#3a9a3a'; g.fillRect(X, Y - 5 + bob, 2, 2);
    if (Math.floor(T * 4 + i) % 6 === 0) { g.fillStyle = '#ffffff'; g.fillRect(X + 3, Y - 4 + bob, 1, 1); }
  });
}
