'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - GUNZER (Stadt-NPC) + 5-teilige Nebenquest-Kette
//  Running Gag: GUNZER bekleckert sich ständig mit O-Saft ("ANGEGUNZT").
//  Zustand dauerhaft: save.s2.gunzer = { step, act, stains } (lazy).
//  Zustand pro Stadtbesuch: C.gz (Quest-Fortschritt), C.gzPed, C.gzFx.
//  Online-Gast: Gunzer plaudert nur (Quests macht der Host / Einzelspieler).
// =====================================================================

const GZ_HOME = [202, 47];       // vor GUNZERS WOHNUNG (K2, Landkreis)
const GZ_TOWN = [20, 46];        // Ausweich-Platz bei der Dönerbude, solange das Landkreis-Tor zu ist
const GZ_STEPS = 5;
const GZ_COL = '#ff9a1a';

// ---------- Spielstand ----------
function gz_state() {
  save.s2 = save.s2 || {};
  const g = save.s2.gunzer = save.s2.gunzer || {};
  if (typeof g.step !== 'number') g.step = 0;
  if (typeof g.stains !== 'number') g.stains = 0;
  g.act = !!g.act;
  return g;
}
const gz_guest = () => typeof NET !== 'undefined' && NET.mode === 'client' && NET.connected;
function gz_snapPx(tx, ty) { const s = citySnap(tx, ty); return { x: s[0] * TS + 8, y: s[1] * TS + 8 }; }
function gz_spot() { return (typeof gateOpen === 'function' && gateOpen()) ? GZ_HOME : GZ_TOWN; }
function gz_ped() { return C && C.gzPed; }
function gz_hasDialogs() { return typeof SPEAKERS !== 'undefined' && !!SPEAKERS.gunzer && !(typeof NET !== 'undefined' && NET.connected); }

// ---------- Texte ----------
const GZ_GAGS = ['OIDA, SCHON WIEDER ANGEGUNZT!', 'DAS IST KEIN FLECK. DAS IST EIN MUSTER.', 'WER HAT DEN BODEN SO SAFTIG GEMACHT? ACH, ICH.',
  'ICH TRINK NUR AUS DEM GLAS. AUF DEM HEMD LANDET ES TROTZDEM.', 'MEIN HEMD RIECHT NACH VITAMIN C.', 'LIL! SCHAU NICHT SO. ICH WEISS ES SELBST.',
  'O-SAFT IST WIE LIEBE: ER KLEBT ÜBERALL.', 'ICH HAB MIR FRÜHER MAL NICHT ANGEGUNZT. WAR LANGWEILIG.'];
const GZ_LINES = (a) => a.map(([who, text]) => ({ who, text }));
function gz_dlg(id, ring, lines) { const d = GZ_LINES(lines); d.ring = ring; DIALOGS[id] = d; }
gz_dlg('gz_q0a', 'GUNZER WINKT DICH ZU SICH... (ER TROPFT)', [
  ['gunzer', 'LIL! OIDA! SCHAU MICH AN. SCHON WIEDER ANGEGUNZT.'], ['lil', 'DU HAST DIR DEN GANZEN O-SAFT ÜBERS HEMD GEKIPPT.'],
  ['gunzer', 'MEIN ERSATZHEMD HÄNGT AM WÄSCHESTÄNDER IM WESTPARK. HOLST DU ES MIR?'], ['lil', 'WARUM HÄNGT DEIN HEMD IM PARK?'],
  ['gunzer', 'WEIL ICH ES DA GEWASCHEN HAB. IM BRUNNEN. FRAG NICHT.']]);
gz_dlg('gz_q0b', 'GUNZER ZIEHT SICH UM...', [
  ['gunzer', 'FRISCHES HEMD! ICH FÜHL MICH WIE NEU GEBOREN.'], ['gunzer', '...OH. JETZT HAB ICH MICH BEIM ANZIEHEN ANGEGUNZT.'], ['lil', 'WIE GEHT DAS ÜBERHAUPT?!'],
  ['gunzer', 'TALENT. HIER, 300 EURO FÜR DEINE MÜHE.']]);
gz_dlg('gz_q1a', 'GUNZER RUFT... VON LILS EIGENEM HANDY?', [
  ['gunzer', 'LIL, NOTFALL! MEIN HANDY IST WEG.'], ['lil', 'WO HAST DU ES ZULETZT GEHABT?'],
  ['gunzer', 'IN DER HAND. MIT EINEM O-SAFT. DANN BIN ICH GELAUFEN UND HAB ÜBERALL GETROPFT.'], ['lil', 'ALSO FOLGE ICH EINFACH DEINER SAFTSPUR.'],
  ['gunzer', 'DU BIST EIN GENIE. FÜNF FLECKEN, DANN MÜSSTE ES DA LIEGEN.']]);
gz_dlg('gz_q1b', 'GUNZER FREUT SICH...', [
  ['gunzer', 'MEIN HANDY! ES KLEBT GANZ GENAU SO WIE VORHER!'], ['lil', 'DU HAST 47 VERPASSTE ANRUFE. ALLE VON DEINER MAMA.'],
  ['gunzer', 'DIE WILL NUR WISSEN, OB ICH MICH ANGEGUNZT HAB. SAG NIX. HIER, 600 EURO.']]);
gz_dlg('gz_q2a', 'GUNZER BALANCIERT EIN TABLETT...', [
  ['gunzer', 'LIL, DIE STRANDBAR HAT 8 GLÄSER FRISCHEN O-SAFT BESTELLT. VON MIR!'], ['lil', 'UND WARUM TRÄGST DU SIE NICHT SELBST HIN?'],
  ['gunzer', 'WEIL ICH SCHON BEIM ANSCHAUEN DES TABLETTS ANGEGUNZT BIN. DU MACHST DAS.'],
  ['gunzer', 'FAHR VORSICHTIG! KEINE VOLLBREMSUNG, KEINE UNFÄLLE, KEINE KURVEN MIT VOLLGAS. UND NICHT RENNEN!'],
  ['gunzer', 'WENIGER ALS 3 GLÄSER, DANN IST DIE LIEFERUNG GEPLATZT.']]);
gz_dlg('gz_q2b', 'GUNZER ZÄHLT DAS TRINKGELD...', [
  ['gunzer', 'DIE STRANDBAR IST BEGEISTERT! SIE SAGEN, DU HAST NUR GANZ WENIG GEKLECKERT.'], ['lil', 'IM GEGENSATZ ZU DIR.'],
  ['gunzer', 'IM GEGENSATZ ZU MIR. HIER IST DEIN ANTEIL.']]);
gz_dlg('gz_q3a', 'GUNZER IST NERVÖS...', [
  ['gunzer', 'LIL... ICH HAB EIN DATE. MIT SANDRA. AN DER STRANDBAR.'], ['lil', 'GLÜCKWUNSCH! UND WAS WILLST DU VON MIR?'],
  ['gunzer', 'BRING MICH HIN. ALLEIN SCHAFF ICH DAS NICHT OHNE MICH ANZUGUNZEN.'], ['lil', 'NA GUT. BLEIB DICHT HINTER MIR. UND SPRING INS AUTO, WENN ICH FAHRE.'],
  ['gunzer', 'UND WENN ICH AUSRUTSCHE, HILFST DU MIR HOCH. VERSPROCHEN?']]);
gz_dlg('gz_q3b', 'GUNZER SCHWEBT AUF WOLKE 7...', [
  ['gunzer', 'SIE MAG MICH! SIE HAT GESAGT, MEINE FLECKEN SIND "KUNST".'], ['lil', 'HAT SIE DAS WIRKLICH GESAGT?'],
  ['gunzer', 'SIE HAT "KRASS" GESAGT. ICH HAB "KUNST" VERSTANDEN. HIER, 900 EURO. DU BIST MEIN WINGMAN.']]);
gz_dlg('gz_q4a', 'GUNZER FLÜSTERT VERSCHWÖRERISCH...', [
  ['gunzer', 'LIL. BITTERLEMON INC. HAT ÜBERALL IN DER STADT PLAKATE AUFGEHÄNGT. BITTERZITRONE FÜR ALLE.'],
  ['lil', 'MR. BITTER. DER TYP MIT DEM TEBLEEDD-KLON.'], ['gunzer', 'WIR MACHEN DEN SAFT-COUP: DU SPRÜHST JEDES PLAKAT MIT O-SAFT VOLL.'],
  ['gunzer', 'ABER LASS DICH NICHT VON DER POLIZEI ERWISCHEN. SACHBESCHÄDIGUNG UND SO.'], ['lil', 'UND DU?'],
  ['gunzer', 'ICH BLEIB HIER UND HALTE DEN SAFT. ICH HAB MICH SCHON EINGESPRÜHT. AUS VERSEHEN.']]);
gz_dlg('gz_q4b', 'GUNZER WEINT VOR FREUDE (UND SAFT)...', [
  ['gunzer', 'ALLE VIER PLAKATE! MR. BITTER WIRD KOCHEN VOR WUT.'], ['lil', 'ICH BIN SELBST KOMPLETT VOLL SAFT.'],
  ['gunzer', 'OIDA. DU HAST DICH ANGEGUNZT! WILLKOMMEN IM CLUB!'],
  ['gunzer', 'HIER: 2500 EURO. UND MEINE HEILIGE FLECK-KAPPE. TRAG SIE MIT STOLZ.']]);

// ---------- Quests ----------
const GZ_STAIN_TILES = [[24, 49], [47, 53], [79, 69], [111, 73], [139, 89]];
const GZ_PHONE_TILE = [143, 93];
const GZ_POSTERS = [[47, 13], [79, 33], [143, 49], [15, 69]];
const GZ_BAR = [85, 93];
const GZ_Q = [
  { name: 'DAS FRISCHE HEMD', a: 'gz_q0a', b: 'gz_q0b', pay: 300, xp: 8,
    init(z) { z.shirt = gz_snapPx(4, 17); },
    hint(z) { return z.ready ? 'BRING GUNZER DAS HEMD' : 'HOL DAS ERSATZHEMD IM WESTPARK'; },
    targets(z) { return z.ready ? [] : [{ x: z.shirt.x, y: z.shirt.y, icon: 'shirt' }]; },
    update(z) { if (!z.ready && dist(C.p.x, C.p.y, z.shirt.x, z.shirt.y) < 22) { z.ready = true; cityMsg('ERSATZHEMD EINGESACKT! ES IST... AUCH SCHON ANGEGUNZT. BRING ES ZU GUNZER.', 3.5); Sound.play('pickup'); } } },
  { name: 'DIE SAFTSPUR', a: 'gz_q1a', b: 'gz_q1b', pay: 600, xp: 12,
    init(z) { z.i = 0; z.pts = GZ_STAIN_TILES.map((t) => gz_snapPx(t[0], t[1])); z.phone = gz_snapPx(GZ_PHONE_TILE[0], GZ_PHONE_TILE[1]); },
    hint(z) { return z.ready ? 'BRING GUNZER SEIN HANDY' : z.i < z.pts.length ? 'FOLGE DER SAFTSPUR (' + z.i + '/' + z.pts.length + ')' : 'DAS HANDY MUSS HIER IRGENDWO LIEGEN'; },
    targets(z) { return z.ready ? [] : z.i < z.pts.length ? [{ x: z.pts[z.i].x, y: z.pts[z.i].y, icon: 'stain' }] : [{ x: z.phone.x, y: z.phone.y, icon: 'phone' }]; },
    update(z) {
      if (z.ready) return;
      if (z.i < z.pts.length) {
        const q = z.pts[z.i];
        if (dist(C.p.x, C.p.y, q.x, q.y) < 24) { z.i++; Sound.play('squeak'); cityMsg(z.i < z.pts.length ? 'SAFTFLECK ' + z.i + '/' + z.pts.length + '. KLEBT NOCH. DIE SPUR GEHT WEITER...' : 'DIE SPUR ENDET HIER IRGENDWO AM STRAND...', 2.5); }
      } else if (dist(C.p.x, C.p.y, z.phone.x, z.phone.y) < 22) { z.ready = true; Sound.play('pickup'); cityMsg('GUNZERS HANDY GEFUNDEN! DER BILDSCHIRM IST ORANGE. VON INNEN.', 3.5); }
    } },
  { name: 'WACKELIGE LIEFERUNG', a: 'gz_q2a', b: 'gz_q2b', pay: 0, xp: 15,
    init(z) { z.bar = gz_snapPx(GZ_BAR[0], GZ_BAR[1]); z.glasses = 8; z.cd = 0; z.lv = null; },
    hint(z) { return z.ready ? 'HOL DIR DEIN GELD BEI GUNZER' : z.glasses <= 0 ? 'ALLES VERSCHÜTTET! HOL BEI GUNZER EIN NEUES TABLETT' : 'BRING DIE SÄFTE ZUR STRANDBAR - GLÄSER ' + z.glasses + '/8'; },
    targets(z) { return z.ready || z.glasses <= 0 ? [] : [{ x: z.bar.x, y: z.bar.y, icon: 'glass' }]; },
    update(z, dt) {
      if (z.ready || z.glasses <= 0) return;
      z.cd -= dt;
      // Ruckel-Messung: Bremsen/Unfall/Kurven im Auto, Rennen zu Fuß
      let jolt = 0;
      if (C.inCar) {
        const v = C.car.v, a = C.car.a;
        if (z.lv) { const dv = (z.lv.v - v) / Math.max(dt, 0.001), da = Math.abs(Math.atan2(Math.sin(a - z.lv.a), Math.cos(a - z.lv.a))) / Math.max(dt, 0.001); jolt = Math.max(Math.abs(dv) > 760 ? 1 : 0, da * Math.abs(v) > 640 ? 1 : 0); }
        z.lv = { v, a };
      } else { z.lv = null; if ((keys.ShiftLeft || keys.ShiftRight) && (keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight)) jolt = 1; }
      if (jolt && z.cd <= 0) {
        z.cd = 0.45; z.glasses--; gz_puddle(C.p.x + rand(-6, 6), C.p.y + rand(-6, 6)); Sound.play('splat');
        cityMsg(z.glasses >= 3 ? 'KLIRR! EIN GLAS WENIGER (' + z.glasses + '/8). DU HAST DICH ANGEGUNZT!' : 'ZU VIEL VERSCHÜTTET! DIE LIEFERUNG IST GEPLATZT.', 2.2);
        if (z.glasses < 3) z.glasses = 0;
      }
      if (z.glasses >= 3 && dist(C.p.x, C.p.y, z.bar.x, z.bar.y) < (C.inCar ? 40 : 26)) {
        z.ready = true; z.pay = z.glasses * 120 + (z.glasses === 8 ? 400 : 0); Sound.play('cash');
        cityMsg('GELIEFERT: ' + z.glasses + ' GLÄSER O-SAFT!' + (z.glasses === 8 ? ' KEIN TROPFEN DANEBEN - BONUS!' : '') + ' ZURÜCK ZU GUNZER.', 3.5);
      }
    } },
  { name: 'GUNZER GEHT AUS', a: 'gz_q3a', b: 'gz_q3b', pay: 900, xp: 20,
    init(z) { z.bar = gz_snapPx(GZ_BAR[0] + 2, GZ_BAR[1]); z.follow = true; z.slipT = rand(9, 15); z.date = 0; z.riding = false; },
    hint(z) { return z.ready ? 'REDE MIT GUNZER' : z.date > 0 ? 'GUNZER HAT SEIN DATE...' : 'BRING GUNZER ZU SANDRA AN DIE STRANDBAR' + (z.riding ? ' (ER SITZT IM AUTO)' : ''); },
    targets(z) { return z.ready || z.date > 0 ? [] : [{ x: z.bar.x, y: z.bar.y, icon: 'heart' }]; },
    update(z, dt) { gz_escort(z, dt); } },
  { name: 'DER SAFT-COUP', a: 'gz_q4a', b: 'gz_q4b', pay: 2500, xp: 30, hat: true,
    init(z) { z.pts = GZ_POSTERS.map((t) => gz_snapPx(t[0], t[1])); z.done = z.pts.map(() => false); z.spray = null; },
    hint(z) { const n = z.done.filter(Boolean).length; return z.ready ? 'ZURÜCK ZU GUNZER' : z.spray ? 'SPRÜHEN... ' + Math.round(z.spray.t / 1.6 * 100) + '%' : 'BITTERLEMON-PLAKATE MIT O-SAFT BESPRÜHEN (' + n + '/' + z.pts.length + ')'; },
    targets(z) { return z.ready ? [] : z.pts.filter((q, i) => !z.done[i]).map((q) => ({ x: q.x, y: q.y, icon: 'spray' })); },
    update(z, dt) {
      if (z.ready || !z.spray) return;
      const q = z.pts[z.spray.i];
      if (C.inCar || dist(C.p.x, C.p.y, q.x, q.y) > 34) { z.spray = null; cityMsg('SPRÜHEN ABGEBROCHEN.', 1.5); return; }
      z.spray.t += dt;
      if (Math.random() < dt * 12) gz_drop(q.x + rand(-7, 7), q.y - 14 + rand(-6, 6));
      if (!z.spray.seen && typeof copsSee === 'function' && copsSee(C.p.x, C.p.y, true)) { z.spray.seen = true; crime(1, 'SACHBESCHÄDIGUNG MIT O-SAFT!', true); }
      if (z.spray.t >= 1.6) {
        z.done[z.spray.i] = true; z.spray = null; Sound.play('splat'); const n = z.done.filter(Boolean).length;
        if (n >= z.pts.length) { z.ready = true; cityMsg('ALLE PLAKATE SIND JETZT ORANGE! ZURÜCK ZU GUNZER.', 3.5); Sound.play('clear'); }
        else cityMsg('PLAKAT ' + n + '/' + z.pts.length + ' VERSAFTET! "BITTERLEMON" HEISST JETZT "BITTE LEMON".', 2.8);
      }
    } },
];

// ---------- Effekte (Pfützen/Tropfen, nur Anzeige) ----------
function gz_fx() { return (C.gzFx = C.gzFx || { puddles: [], drops: [] }); }
function gz_puddle(x, y) { const f = gz_fx(); f.puddles.push({ x, y, t: 0, r: rand(5, 8) }); if (f.puddles.length > 24) f.puddles.shift(); }
function gz_drop(x, y) { const f = gz_fx(); f.drops.push({ x, y, vx: rand(-30, 30), vy: rand(-60, -20), t: 0 }); if (f.drops.length > 60) f.drops.shift(); }

// Gunzer rutscht aus (Running Gag)
function gz_slip(q, line) {
  if (!q || q.state === 'down') return;
  q.state = 'down'; q.downT = 2.2; q.downAng = q.a + rand(-0.6, 0.6);
  q.sayText = line || pick(['OIDA, SCHON WIEDER ANGEGUNZT!', 'HUIII... PLATSCH.', 'WER HAT HIER O-SAFT VERSCHÜTTET? ...ICH.', 'ALLES GUT! ICH LIEG NUR KURZ.']); q.sayT = 2.4;
  gz_puddle(q.x, q.y); for (let k = 0; k < 6; k++) gz_drop(q.x, q.y);
  Sound.play('gz_slip');
  if (!gz_guest()) { const g = gz_state(); g.stains = Math.min(999, g.stains + 1); }
}

// ---------- Begleitung (Quest 4) ----------
function gz_escort(z, dt) {
  const q = gz_ped(), p = C.p;
  if (!q || z.ready) return;
  if (z.date > 0) {
    z.date += dt;
    const sd = C.gzDate, L = [[0.2, 'gunzer', 'HALLO SANDRA. ICH BIN GUNZER. ICH HAB DIR SAFT MITGEBRACHT.'], [3, 'sandra', 'DU HAST DA EINEN FLECK.'],
      [5.6, 'gunzer', 'DAS IST KEIN FLECK. DAS IST KUNST.'], [8.2, 'sandra', 'KRASS.'], [10.4, 'gunzer', 'SIE HAT "KUNST" GESAGT!!']];
    for (const [t, who, text] of L) if (z.date - dt < t && z.date >= t) { const s = who === 'gunzer' ? q : sd; if (s) { s.sayText = text; s.sayT = 2.6; } }
    if (z.date > 12) { z.ready = true; z.date = 0; cityMsg('DAS DATE LIEF... GUT? REDE MIT GUNZER.', 3); }
    return;
  }
  // ins Auto / aussteigen
  if (C.inCar && !z.riding && dist(q.x, q.y, C.car.x, C.car.y) < 48 && q.state !== 'down') { z.riding = true; C.peds = C.peds.filter((o) => o !== q); Sound.play('door'); cityMsg('GUNZER SPRINGT INS AUTO. "FAHR LANGSAM, ICH HAB EINEN BECHER IN DER HAND."', 3); }
  if (z.riding) {
    q.x = C.car.x; q.y = C.car.y;
    if (!C.inCar) { z.riding = false; const s = citySnap(Math.floor(p.x / TS), Math.floor(p.y / TS)); q.x = s[0] * TS + 8 + rand(-4, 4); q.y = s[1] * TS + 8 + rand(-4, 4); C.peds.push(q); }
  } else if (q.state !== 'down') {
    const d = dist(q.x, q.y, p.x, p.y);
    if (d > 520 && offscreen(q.x, q.y, 10) && !C.inCar) { const s = citySnap(Math.floor(p.x / TS), Math.floor(p.y / TS)); q.x = s[0] * TS + 8; q.y = s[1] * TS + 8; }
    else if (d > 22 && !C.inCar) {
      const sp = d > 90 ? 125 : 95, a = Math.atan2(p.y - q.y, p.x - q.x);
      cityMove(q, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt); q.a = a; q.walkT += dt;
    } else if (C.inCar && d > 70 && Math.random() < dt * 0.3) { q.sayText = 'LIL! WARTE! ICH WILL MIT!'; q.sayT = 2; }
    z.slipT -= dt;
    if (z.slipT <= 0 && !C.inCar) { z.slipT = rand(12, 22); gz_slip(q); }
  }
  const gx = z.riding ? C.car.x : q.x, gy = z.riding ? C.car.y : q.y;
  if (dist(gx, gy, z.bar.x, z.bar.y) < 44) {
    if (z.riding) { if (!C.inCar) return; cityMsg('AUSSTEIGEN! GUNZER MUSS ZU FUSS ZU SANDRA. (E)', 1); return; }
    z.date = 0.01; q.a = 0; cityMsg('GUNZER TRIFFT SANDRA. PSSST!', 2.5);
  }
}

// ---------- Quest starten / abschließen ----------
function gz_begin(k) {
  const Q = GZ_Q[k]; if (!Q) return;
  const z = { k, ready: false }; Q.init(z); C.gz = z;
  if (k === 3) gz_spawnDate();
}
function gz_spawnDate() {
  if (!C || C.gzDate) return;
  const s = citySnap(GZ_BAR[0] + 3, GZ_BAR[1]);
  C.gzDate = Object.assign(makePed(s[1] * CW + s[0]), { still: true, jobPed: true, name: 'SANDRA', a: Math.PI, suit: '#ff6fb5', shirt: '#ffffff', hair: '#e8c547', glasses: true, talkLabel: 'MIT SANDRA REDEN' });
  C.peds.push(C.gzDate);
}
function gz_play(id, after) {
  if (gz_hasDialogs() && DIALOGS[id]) { startDialog(id, () => { enterHub(); if (after) after(); }); return; }
  // ohne Porträt (oder online): als Sprechblasen-Folge in der Stadt
  C.gzChat = { lines: DIALOGS[id] || [], i: -1, t: 0 };
  if (after) after();
}
function gz_finish() {
  const g = gz_state(), z = C.gz, Q = GZ_Q[g.step];
  if (!Q || !z) return;
  const pay = Q.pay || z.pay || 0;
  g.step++; g.act = false; C.gz = null;
  if (C.gzDate) { C.peds = C.peds.filter((o) => o !== C.gzDate); C.gzDate = null; }
  save.money += pay;
  if (typeof lilXP === 'function') lilXP(Q.xp, 'GUNZER');
  if (Q.hat) { save.hats = save.hats || {}; save.hats.gz_fleckkappe = true; }
  persist(); Sound.play('cash');
  if (typeof bizNotify === 'function') bizNotify('GUNZER-QUEST ' + g.step + '/' + GZ_STEPS + ' GESCHAFFT: +' + pay + '€' + (Q.hat ? ' + FLECK-KAPPE' : ''), GZ_COL);
  gz_play(Q.b);
}

// [E] auf Gunzer
function gz_talk(q) {
  q = q || gz_ped();
  if (!q) return;
  q.a = Math.atan2(C.p.y - q.y, C.p.x - q.x);
  if (gz_guest()) { q.sayText = pick(GZ_GAGS) + ' (QUESTS NUR BEIM HOST)'; q.sayT = 3; Sound.play('blip', true); return; }
  const g = gz_state();
  if (g.act && C.gz && C.gz.ready) { gz_finish(); return; }
  if (C.gzChat && C.gzChat.i < C.gzChat.lines.length) { C.gzChat.t = 0; return; }   // Blasen-Gespräch weiterklicken
  if (g.step >= GZ_STEPS) { q.sayText = pick(GZ_GAGS); q.sayT = 2.8; Sound.play('blip', true); if (Math.random() < 0.25) gz_slip(q); return; }
  if (g.act) {
    if (!C.gz) gz_begin(g.step);
    const z = C.gz, Q = GZ_Q[g.step];
    if (z.ready) { gz_finish(); return; }
    if (g.step === 2 && z.glasses <= 0) { Q.init(z); q.sayText = 'NEUES TABLETT. DIESMAL OHNE KLECKERN, JA?'; q.sayT = 3; Sound.play('pickup'); return; }
    q.sayText = Q.hint(z) + '!'; q.sayT = 3; Sound.play('blip', true); return;
  }
  if (C.wanted > 0) { q.sayText = 'DIE POLIZEI IST HINTER DIR! ICH KENN DICH NICHT!'; q.sayT = 2.5; Sound.play('click'); return; }
  g.act = true; persist();
  gz_begin(g.step);
  gz_play(GZ_Q[g.step].a);
}

// ---------- Hooks ----------
BUILDINGS.push({ id: 'gz_home', x: 191, y: 41, w: 14, h: 5, roof: '#c86a1a', label: 'GUNZERS WOHNUNG', marker: [198, 47], markerCol: GZ_COL, markerText: 'G',
  actLabel: 'BEI GUNZER KLINGELN',
  act: () => {
    const q = gz_ped();
    if (q && dist(q.x, q.y, GZ_HOME[0] * TS + 8, GZ_HOME[1] * TS + 8) < 60) { gz_talk(q); return; }
    cityMsg('NIEMAND DA. AN DER TÜR KLEBT EIN ZETTEL: "BIN UNTERWEGS. NICHT AUSRUTSCHEN!"', 3); Sound.play('click');
  } });

CITY_HOOKS.init.push((C_) => {
  const s = gz_spot();
  const q = Object.assign(makePed(s[1] * CW + s[0]), { still: true, name: 'GUNZER', a: Math.PI / 2, suit: '#f4f0e6', shirt: '#c41f2a', skin: '#f0c8a0', hair: '#4a2a12', glasses: false, talkLabel: 'MIT GUNZER REDEN', gzIdle: rand(18, 35) });
  C_.peds.push(q); C_.gzPed = q; C_.gz = null; C_.gzDate = null; C_.gzChat = null;
});
CITY_HOOKS.talk.GUNZER = (q) => gz_talk(q);
CITY_HOOKS.talk.SANDRA = (q) => { q.sayText = pick(['ICH WARTE AUF GUNZER. ER IST SÜSS. UND KLEBRIG.', 'IST DAS DA ORANGENSAFT AUF DEINER JACKE?', 'ICH HAB GEHÖRT, GUNZER MALT MIT SAFT.']); q.sayT = 2.6; Sound.play('blip', true); };

CITY_HOOKS.update.push((dt) => {
  if (!C || !C.gzPed) return;
  const q = C.gzPed, g = gz_guest() ? { step: 0, act: false } : gz_state();
  // Quest-Fortschritt (nach Neuladen wieder aufbauen)
  if (g.act && !C.gz && !gz_guest()) gz_begin(g.step);
  const z = C.gz;
  if (z && GZ_Q[z.k]) GZ_Q[z.k].update(z, dt);
  // Gunzer steht zuhause (Landkreis) oder bei der Dönerbude, solange das Tor zu ist
  const esc = z && z.k === 3 && !z.ready && z.date === 0;
  if (!esc && !(z && z.k === 3) && q.state !== 'down' && C.peds.includes(q)) {
    const s = gz_spot(), hx = s[0] * TS + 8, hy = s[1] * TS + 8;
    if (dist(q.x, q.y, hx, hy) > 30 && offscreen(q.x, q.y, 20) && offscreen(hx, hy, 20)) { q.x = hx; q.y = hy; }
  }
  if (z && z.k === 3 && z.ready && !C.peds.includes(q)) { C.peds.push(q); q.x = C.p.x + 12; q.y = C.p.y; }
  // Leerlauf-Gag: ab und zu ausrutschen, wenn Lil zuschaut
  q.gzIdle = (q.gzIdle || 20) - dt;
  if (q.gzIdle <= 0) { q.gzIdle = rand(25, 45); if (!offscreen(q.x, q.y, -20) && !esc) gz_slip(q); }
  // Sprechblasen-Gespräch
  const ch = C.gzChat;
  if (ch) {
    ch.t -= dt;
    if (ch.t <= 0) {
      ch.i++; ch.t = 2.8;
      const L = ch.lines[ch.i];
      if (!L) C.gzChat = null;
      else { const who = L.who === 'lil' ? 'LIL' : L.who === 'gunzer' ? 'GUNZER' : String(L.who).toUpperCase(); cityMsg(who + ': ' + L.text, 2.9); if (L.who === 'gunzer') { q.sayText = L.text; q.sayT = 2.7; } }
    }
  }
  // Effekte
  const f = gz_fx();
  for (const pd of f.puddles) pd.t += dt;
  f.puddles = f.puddles.filter((pd) => pd.t < 14);
  for (const d of f.drops) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 220 * dt; }
  f.drops = f.drops.filter((d) => d.t < 0.6);
});

// Prompt: Plakat besprühen (Quest 5)
CITY_HOOKS.prompt.push((p) => {
  const z = C && C.gz;
  if (!z || z.k !== 4 || z.ready || z.spray || C.inCar) return null;
  for (let i = 0; i < z.pts.length; i++) {
    if (z.done[i]) continue;
    const q = z.pts[i];
    if (Math.abs(q.x - p.x) < 40 && Math.abs(q.y - p.y) < 40) return { label: 'PLAKAT MIT O-SAFT BESPRÜHEN', x: q.x, y: q.y, r: 28, act: () => { z.spray = { i, t: 0, seen: false }; Sound.play('swoosh'); } };
  }
  return null;
});

// ---------- Zeichnen ----------
function gz_drawStains(g, q, n) {
  if (q.state === 'down') return;
  g.save(); g.translate(Math.round(q.x), Math.round(q.y)); g.rotate(q.a);
  const S = [[-1, -4], [1, 2], [-2, 1], [0, -2], [1, -5], [-2, 4]];
  g.fillStyle = GZ_COL;
  for (let i = 0; i < Math.min(S.length, 2 + Math.floor(n / 3)); i++) g.fillRect(S[i][0], S[i][1], 2, 2);
  g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 1, 1);
  g.restore();
}
function gz_icon(g, x, y, icon) {
  x = Math.round(x); y = Math.round(y);
  if (icon === 'stain') { pxEll(g, x, y, 6, 4, 'rgba(255,154,26,0.85)'); pxEll(g, x + 4, y + 3, 2, 2, 'rgba(255,154,26,0.85)'); g.fillStyle = '#ffd23f'; g.fillRect(x - 2, y - 1, 2, 1); }
  else if (icon === 'shirt') { g.fillStyle = '#7a5a3a'; g.fillRect(x - 9, y - 9, 18, 1); g.fillRect(x - 9, y - 9, 1, 12); g.fillRect(x + 8, y - 9, 1, 12); g.fillStyle = '#f4f0e6'; g.fillRect(x - 5, y - 7, 10, 9); g.fillRect(x - 7, y - 7, 3, 4); g.fillRect(x + 4, y - 7, 3, 4); g.fillStyle = GZ_COL; g.fillRect(x - 1, y - 4, 2, 2); g.fillRect(x + 2, y - 1, 2, 1); }
  else if (icon === 'phone') { g.fillStyle = '#111'; g.fillRect(x - 3, y - 5, 6, 10); g.fillStyle = Math.floor(T * 4) % 2 ? GZ_COL : '#ffd23f'; g.fillRect(x - 2, y - 4, 4, 6); }
  else if (icon === 'glass') { g.fillStyle = '#e8a050'; g.fillRect(x - 8, y - 3, 16, 3); g.fillStyle = '#5a3a1a'; g.fillRect(x - 1, y, 2, 6); }
  else if (icon === 'heart') { g.fillStyle = '#ff3fa4'; g.fillRect(x - 4, y - 3, 3, 3); g.fillRect(x + 1, y - 3, 3, 3); g.fillRect(x - 4, y - 1, 8, 2); g.fillRect(x - 3, y + 1, 6, 1); g.fillRect(x - 1, y + 2, 2, 1); }
  else if (icon === 'spray') { // Bitterlemon-Plakat auf Ständer
    g.fillStyle = '#333'; g.fillRect(x - 1, y - 6, 2, 8);
    g.fillStyle = '#f2f2e0'; g.fillRect(x - 9, y - 22, 18, 16); g.fillStyle = '#d8e81a'; pxEll(g, x, y - 15, 5, 4, '#d8e81a'); g.fillStyle = '#4a6a1a'; g.fillRect(x - 1, y - 20, 2, 1);
    g.fillStyle = '#c41f2a'; g.fillRect(x - 8, y - 9, 16, 2);
  }
}
function gz_sprayedPoster(g, x, y) {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = '#333'; g.fillRect(x - 1, y - 6, 2, 8);
  g.fillStyle = '#f2f2e0'; g.fillRect(x - 9, y - 22, 18, 16);
  g.fillStyle = GZ_COL; g.fillRect(x - 9, y - 22, 18, 7); g.fillRect(x - 6, y - 15, 3, 6); g.fillRect(x + 2, y - 15, 2, 8); g.fillRect(x - 2, y - 13, 2, 3);
  g.fillStyle = '#ffd23f'; g.fillRect(x - 5, y - 20, 10, 2);
}
CITY_HOOKS.draw.push((g) => {
  if (!C || !C.gzPed) return;
  const f = gz_fx();
  for (const pd of f.puddles) { if (offscreen(pd.x, pd.y, 20)) continue; g.globalAlpha = clamp((14 - pd.t) / 4, 0, 0.75); pxEll(g, Math.round(pd.x), Math.round(pd.y), Math.round(pd.r), Math.round(pd.r * 0.6), GZ_COL); g.fillStyle = '#ffd23f'; g.fillRect(Math.round(pd.x) - 2, Math.round(pd.y) - 1, 2, 1); }
  g.globalAlpha = 1;
  g.fillStyle = GZ_COL; for (const d of f.drops) g.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
  const q = C.gzPed, inWorld = C.peds.includes(q);
  if (inWorld && !offscreen(q.x, q.y)) {
    gz_drawStains(g, q, gz_guest() ? 6 : gz_state().stains);
    txt('GUNZER', q.x, q.y - 22, { font: FS, align: 'center', color: GZ_COL });
    if (!gz_guest()) {
      const s = gz_state(), z = C.gz, bob = Math.round(Math.sin(T * 5) * 2);
      const mark = s.step >= GZ_STEPS ? '' : !s.act ? '!' : z && (z.ready || (z.k === 2 && z.glasses <= 0)) ? '?' : '';
      if (mark && !C.wanted) txt(mark, q.x, q.y - 34 + bob, { font: FB, align: 'center', color: '#ffe14d' });
    }
  }
  const z = C.gz;
  if (!z || !GZ_Q[z.k]) return;
  if (z.k === 1) for (let i = 0; i < z.i; i++) gz_icon(g, z.pts[i].x, z.pts[i].y, 'stain');
  if (z.k === 4) for (let i = 0; i < z.pts.length; i++) if (z.done[i] && !offscreen(z.pts[i].x, z.pts[i].y)) gz_sprayedPoster(g, z.pts[i].x, z.pts[i].y);
  for (const t of GZ_Q[z.k].targets(z)) {
    if (offscreen(t.x, t.y, 30)) continue;
    gz_icon(g, t.x, t.y, t.icon);
    const b = Math.round(Math.sin(T * 6) * 2);
    g.fillStyle = '#ffe14d'; g.beginPath(); g.moveTo(t.x - 4, t.y - 30 + b); g.lineTo(t.x + 4, t.y - 30 + b); g.lineTo(t.x, t.y - 25 + b); g.fill();
  }
});
CITY_HOOKS.drawHud.push((g) => {
  if (!C || !C.gzPed || gz_guest()) return;
  const s = gz_state(), z = C.gz, q = C.gzPed;
  // Minikarte (gleiche Maße wie drawCityHUD)
  const ms = 0.42, mw = Math.round(CW * ms), mh = Math.round(CH * ms), mx = W - mw - 6, my = H - mh - 6;
  const dot = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(mx + x / TS * ms) - 1, Math.round(my + y / TS * ms) - 1, 3, 3); };
  if (s.step < GZ_STEPS && (!s.act || (z && (z.ready || (z.k === 2 && z.glasses <= 0))))) dot(q.x, q.y, Math.floor(T * 3) % 2 ? GZ_COL : '#ffffff');
  if (!z || !GZ_Q[z.k]) return;
  const tg = GZ_Q[z.k].targets(z);
  for (const t of tg) dot(t.x, t.y, Math.floor(T * 4) % 2 ? GZ_COL : '#ffe14d');
  // Questzeile oben links (unter den Bestellungen)
  const ord = (typeof B === 'function' && B().orders) ? B().orders.length : 0, y = 17 + ord * 10;
  const line = 'GUNZER ' + (z.k + 1) + '/' + GZ_STEPS + ' ' + GZ_Q[z.k].name + ': ' + GZ_Q[z.k].hint(z);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(4, y - 1, Math.min(300, textWidth(line, '8px ' + FS) + 6), 10);
  txt(fitText(line, 296), 7, y, { font: FS, color: GZ_COL });
  if (z.k === 2 && !z.ready && z.glasses > 0) { for (let i = 0; i < 8; i++) { g.fillStyle = i < z.glasses ? GZ_COL : '#333'; g.fillRect(7 + i * 7, y + 11, 5, 7); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(7 + i * 7, y + 11, 5, 1); } }
  // Pfeil am Bildschirmrand zum nächsten Ziel (bzw. zu Gunzer)
  let tx = null, ty = null;
  if (tg.length) { let bd = 1e9; for (const t of tg) { const d = dist(C.p.x, C.p.y, t.x, t.y); if (d < bd) { bd = d; tx = t.x; ty = t.y; } } }
  else if (z.ready || (z.k === 2 && z.glasses <= 0)) { tx = q.x; ty = q.y; }
  if (tx != null && !C.wanted) {
    const sx = tx - C.cam.x + W / 2, sy = ty - C.cam.y + H / 2;
    if (sx < 20 || sx > W - 20 || sy < 24 || sy > H - 20) {
      const a = Math.atan2(sy - H / 2, sx - W / 2), ex = clamp(W / 2 + Math.cos(a) * 400, 24, W - 24), ey = clamp(H / 2 + Math.sin(a) * 400, 30, H - 24);
      g.save(); g.translate(ex, ey); g.rotate(a); g.fillStyle = GZ_COL; g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-5, 5); g.fill(); g.restore();
    }
  }
});

// ---------- Belohnung: Hut + Sound ----------
HATS.gz_fleckkappe = { name: 'GUNZERS FLECK-KAPPE', price: 0, special: true, how: 'GUNZER-QUEST 5' };
HAT_DRAW.gz_fleckkappe = (R) => { R(1, 0, 12, 4, '#f4f0e6'); R(0, 3, 15, 2, '#d8d0c0'); R(3, 1, 2, 2, GZ_COL); R(8, 0, 2, 1, GZ_COL); R(10, 2, 1, 1, '#ffd23f'); R(12, 3, 2, 1, GZ_COL); };
if (typeof Sound !== 'undefined' && Sound.addSfx) {
  Sound.addSfx('gz_slip', () => { const { tone, noise, now } = Sound.synth, t = now();
    tone({ type: 'sine', f: 900, f2: 300, dur: 0.22, vol: 0.12, t }); noise({ dur: 0.25, ft: 'lowpass', f: 900, f2: 300, vol: 0.18, t: t + 0.2 }); });
}
ACHIEVEMENTS.push({ id: 'gz_freund', name: 'GUNZERS BESTER FREUND', desc: 'ALLE 5 GUNZER-QUESTS', pay: 3000,
  ok: () => !!(save.s2 && save.s2.gunzer && save.s2.gunzer.step >= 5) });
