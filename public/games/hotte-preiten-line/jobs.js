'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Handy (Taste H) mit Nebenjobs + Autoradio (Taste R)
// =====================================================================
const JOB_TYPES = {
  taxi: { name: 'TAXI-FAHRT', desc: 'HOL DEN FAHRGAST AB UND BRING IHN HIN. NUR MIT FAHRZEUG!', time: 75 },
  kurier: { name: 'EILPAKET', desc: 'HOL DAS PAKET AB UND BRING ES SCHNELL ZUM ZIEL.', time: 65 },
  race: { name: 'RENNEN GEGEN DIE ZEIT', desc: 'FAHR DURCH ALLE 5 CHECKPOINTS, BEVOR DIE ZEIT ABLÄUFT.', time: 55 },
  robber: { name: 'ÜBERFALL AM KIOSK', desc: 'EIN RÄUBER HAT DEN KIOSK AUSGERAUBT. HAU IHN UM!', time: 60 },
};
const PASSENGERS = ['OMA HILDE', 'KEVIN', 'DJ BASSBOX', 'HERR MÜLLER', 'CHANTAL', 'DER POSTBOTE', 'LISA'];
const RADIO = [
  { name: 'AUS', song: '' }, { name: 'SAFT FM', song: 'city' }, { name: 'BASS RADIO', song: 'disco' },
  { name: 'HACKER WAVE', song: 'cyber' }, { name: 'CASINO JAZZ', song: 'casino' },
];
const RADIO_LINES = [
  () => 'ES IST ' + cityClock() + ' UHR. ZEIT FÜR EINEN O-SAFT!',
  () => 'STAUMELDUNG: AUF DER HAUPTSTRASSE STEHT EIN PINKER FLITZER. SCHON WIEDER.',
  () => 'WERBUNG: ZITRONIA AG - SAURER GEHT NICHT!',
  () => 'DAS WETTER: SONNE. PERFEKT FÜR SAFT.',
  () => 'GRÜSSE AN FRAU GRECHENIG: FOOOKUSSS!',
  () => 'DIE POLIZEI MELDET HEUTE ' + randi(3, 40) + ' TASCHENDIEBSTÄHLE. PASST AUF!',
  () => 'NÄCHSTER SONG: UNTS UNTS UNTS (BAKA-REMIX).',
  () => 'HÖRERFRAGE: WER HAT DAS TEBLEEDD GEKLAUT?',
  () => 'RUSSIAN HACKER BOI GRÜSST ALLE HÖRER. ER HAT EURE WLAN-PASSWÖRTER.',
  () => 'KUMI IT SAGT: STARTET EUREN ROUTER NEU.',
];

// ---------- Musik in der Stadt: Polizei > Autoradio > Stadt ----------
function cityMusic() {
  if (!C) return;
  const r = C.radio == null ? 1 : C.radio;
  Sound.playSong(C.wanted > 0 ? 'police' : C.inCar || C.radioFoot ? RADIO[r].song : 'city');
}
function updateRadio(dt) {
  if (!C.inCar) return;
  if (pressed.KeyR) {
    C.radio = ((C.radio == null ? 1 : C.radio) + 1) % RADIO.length;
    cityMusic(); cityMsg('RADIO: ' + RADIO[C.radio].name, 1.5); Sound.play('blip');
  }
  C.radioT = (C.radioT == null ? 20 : C.radioT) - dt;
  if (C.radioT <= 0) { C.radioT = rand(40, 70); if ((C.radio == null ? 1 : C.radio) > 0 && !C.wanted) cityMsg(RADIO[C.radio == null ? 1 : C.radio].name + ': ' + pick(RADIO_LINES)(), 4); }
}

// ---------- Nebenjobs ----------
function jobSpot(from, minD, maxD, car) {
  if (!PF) pfInit();
  for (let k = 0; k < 160; k++) {
    const a = rand(TAU), d = rand(minD, maxD);
    const tx = Math.floor((from.x + Math.cos(a) * d) / TS), ty = Math.floor((from.y + Math.sin(a) * d) / TS);
    if (tx < 1 || ty < 1 || tx >= CW - 1 || ty >= CH - 1) continue;
    const i = ty * CW + tx, c = CITY.t[i];
    if (car ? PF.okCar[i] : PF.okNoDoor[i] && (c === '_' || c === 'P' || c === 'g')) return { x: tx * TS + 8, y: ty * TS + 8 };
  }
  return { x: from.x, y: from.y + 40 };
}
// Nebenjobs sind ein kleines Zubrot: wenig Geld, Pause zwischen den Jobs, höchstens 6 pro Tag
const JOBS_PER_DAY = 6, JOB_COOLDOWN = 45;
function jobDayInfo() { const d = gameDay(); if (!C.jobDay || C.jobDay.d !== d) C.jobDay = { d, n: 0 }; return C.jobDay; }
function jobBlocked() {
  if (C.job) return 'DU HAST SCHON EINEN JOB.';
  if ((C.jobCd || 0) > 0) return 'PAUSE! NÄCHSTER JOB IN ' + Math.ceil(C.jobCd) + ' S.';
  if (jobDayInfo().n >= JOBS_PER_DAY) return 'HEUTE KEINE JOBS MEHR (' + JOBS_PER_DAY + '/' + JOBS_PER_DAY + '). MORGEN WIEDER!';
  return '';
}
function makeOffers() {
  const types = Object.keys(JOB_TYPES), mult = 1 + save.unlocked * 0.03;
  C.offers = [];
  const shuffled = types.slice().sort(() => Math.random() - 0.5);
  for (let k = 0; k < 3; k++) {
    const t = shuffled[k];
    const base = { taxi: [60, 140], kurier: [50, 110], race: [90, 180], robber: [80, 150] }[t];
    C.offers.push({ type: t, pay: Math.round(rand(base[0], base[1]) * mult / 10) * 10, who: pick(PASSENGERS) });
  }
  C.offerT = 150;
}
function startJob(o) {
  const why = jobBlocked();
  if (why) { cityMsg(why, 2.5); Sound.play('click'); return; }
  jobDayInfo().n++;
  const p = C.p, J = { type: o.type, pay: o.pay, who: o.who, t: JOB_TYPES[o.type].time, stage: 0 };
  if (o.type === 'taxi') {
    J.a = jobSpot(p, 250, 600, true); J.b = jobSpot(J.a, 700, 1300, true);
    J.ped = Object.assign(makePed(Math.floor(J.a.y / TS) * CW + Math.floor(J.a.x / TS)), { still: true, name: o.who, suit: '#ff9a1a', jobPed: true, x: J.a.x, y: J.a.y });
    C.peds.push(J.ped);
  } else if (o.type === 'kurier') { J.a = jobSpot(p, 200, 500, false); J.b = jobSpot(J.a, 600, 1200, false); }
  else if (o.type === 'race') { J.cps = []; let q = p; for (let k = 0; k < 5; k++) { q = jobSpot(q, 260, 520, true); J.cps.push(q); } J.ci = 0; }
  else if (o.type === 'robber') {
    J.ped = Object.assign(makePed(24 * CW + 37), { name: 'RÄUBER', robber: true, suit: '#111111', shirt: '#e01b3c', hair: '#111111', glasses: true, sayText: 'HAHA! DIE KASSE GEHÖRT MIR!', sayT: 3 });
    C.peds.push(J.ped);
  }
  C.job = J; C.phone = null;
  cityMsg('JOB ANGENOMMEN: ' + JOB_TYPES[o.type].name + ' - ' + o.pay + '€. ' + JOB_TYPES[o.type].desc, 4);
  Sound.play('select');
  makeOffers();
}
function endJob(ok, why) {
  const J = C.job;
  if (!J) return;
  if (J.ped) C.peds = C.peds.filter((q) => q !== J.ped);
  C.job = null; C.jobCd = JOB_COOLDOWN;
  if (ok) {
    const bonus = Math.round(Math.max(0, J.t) * 0.5);
    save.money += J.pay + bonus; save.stats.jobs = (save.stats.jobs || 0) + 1; lilXP(12); persist();
    cityMsg(why + ' +' + J.pay + '€' + (bonus ? ' (+' + bonus + '€ ZEITBONUS)' : ''), 4); Sound.play('cash'); Sound.play('win');
  } else { cityMsg('JOB VERKACKT: ' + why, 3); Sound.play('lose'); }
}
function jobTarget() {
  const J = C.job;
  if (!J) return null;
  if (J.type === 'race') return J.cps[J.ci];
  if (J.type === 'robber') return J.ped;
  return J.stage === 0 ? J.a : J.b;
}
function updateJobs(dt) {
  if (C.offerT == null || !C.offers) makeOffers();
  C.offerT -= dt; C.jobCd = Math.max(0, (C.jobCd || 0) - dt);
  if (C.offerT <= 0 && !C.job) makeOffers();
  const J = C.job;
  if (!J) return;
  const p = C.p, car = C.car, slow = Math.abs(car.v) < 80;
  J.t -= dt;
  if (J.t <= 0) { endJob(false, 'DIE ZEIT IST UM!'); return; }
  if (J.type === 'taxi') {
    if (J.stage === 0 && C.inCar && slow && dist(car.x, car.y, J.a.x, J.a.y) < 36) {
      J.stage = 1; C.peds = C.peds.filter((q) => q !== J.ped); J.ped = null;
      cityMsg(J.who + ' STEIGT EIN: "' + pick(['FAHR VORSICHTIG, JUNGE!', 'SCHNELL, ICH HAB ES EILIG!', 'IST DAS EIN PINKES AUTO?']) + '"', 3); Sound.play('door');
    } else if (J.stage === 1 && C.inCar && slow && dist(car.x, car.y, J.b.x, J.b.y) < 36) endJob(true, J.who + ' IST ANGEKOMMEN!');
  } else if (J.type === 'kurier') {
    if (J.stage === 0 && dist(p.x, p.y, J.a.x, J.a.y) < 26) { J.stage = 1; cityMsg('PAKET EINGESAMMELT! JETZT ZUM ZIEL.', 2.5); Sound.play('pickup'); }
    else if (J.stage === 1 && dist(p.x, p.y, J.b.x, J.b.y) < 28) endJob(true, 'PAKET GELIEFERT!');
  } else if (J.type === 'race') {
    const c = J.cps[J.ci];
    if (dist(p.x, p.y, c.x, c.y) < 34) { J.ci++; Sound.play('coin'); if (J.ci >= J.cps.length) endJob(true, 'RENNEN GESCHAFFT!'); else J.t += 4; }
  } else if (J.type === 'robber') {
    const r = J.ped;
    if (r.state === 'down' || r.dead) { endJob(true, r.dead ? 'RÄUBER ERLEDIGT. DER KIOSK-MANN IST ETWAS SCHOCKIERT.' : 'RÄUBER GESCHNAPPT! DER KIOSK-MANN BEDANKT SICH.'); return; }
    if (dist(p.x, p.y, r.x, r.y) < 170) r.fleeT = 1;
    if (dist(p.x, p.y, r.x, r.y) > 950) endJob(false, 'DER RÄUBER IST ENTKOMMEN!');
  }
}
function drawJobs(g) {
  const J = C.job;
  if (!J) return;
  const ring = (q, col, label) => {
    const r = 13 + Math.sin(T * 6) * 2;
    g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, r, 0, TAU); g.stroke(); g.lineWidth = 1;
    txt(label, q.x, q.y - 26, { g, font: FS, align: 'center', color: col });
  };
  if (J.type === 'taxi') ring(J.stage === 0 ? J.a : J.b, '#ffd23f', J.stage === 0 ? 'ABHOLEN: ' + J.who : 'ZIEL');
  else if (J.type === 'kurier') {
    if (J.stage === 0) { g.fillStyle = '#c8a070'; g.fillRect(J.a.x - 5, J.a.y - 5, 10, 10); g.fillStyle = '#6a4a2a'; g.fillRect(J.a.x - 5, J.a.y - 1, 10, 2); ring(J.a, '#c8a070', 'PAKET'); }
    else ring(J.b, '#c8a070', 'LIEFERN');
  } else if (J.type === 'race') { J.cps.forEach((c, i) => { if (i === J.ci) ring(c, '#3fd0ff', 'CHECKPOINT ' + (i + 1) + '/5'); else if (i === J.ci + 1) { g.strokeStyle = 'rgba(63,208,255,0.35)'; g.beginPath(); g.arc(c.x, c.y, 10, 0, TAU); g.stroke(); } }); }
  else if (J.type === 'robber' && J.ped) txt('!', J.ped.x, J.ped.y - 30 + Math.round(Math.sin(T * 8) * 2), { g, align: 'center', color: '#ff3b3b' });
}
function jobHudText() {
  const J = C.job;
  return J ? 'JOB: ' + JOB_TYPES[J.type].name + (J.type === 'race' ? ' (' + J.ci + '/5)' : '') + ' - NOCH ' + Math.ceil(J.t) + ' S - ' + J.pay + '€' : '';
}
