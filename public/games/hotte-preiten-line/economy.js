'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Wirtschaft: jeder Spieltag (8 Minuten) zählt
//  - Tageskosten: Personal will Lohn, Grundstücke + Wohnungen kosten Unterhalt
//  - Tagesabrechnung: was hast du verdient, was ausgegeben?
//  - Saft-Börse: jeden Tag sind andere Säfte gefragt (70% - 140%)
//  - Tagesaufgaben: 3 kleine Ziele pro Tag mit Belohnung
//  - Anwalt: Fahndung gegen Geld löschen
// =====================================================================
const gameDay = () => Math.floor(((save.biz && save.biz.clock) || 0) / DAY_LEN);
const WAGES = { seller: 90, gardener: 130, presser: 150, mixer: 200 };
const UPKEEP = { factory: 60, garage: 70, hall1: 220, greenhouse: 160, barn: 260 };
const APT_UPKEEP = { apt1: 25, apt2: 90, apt3: 180, apt4: 350 };
function dailyCosts() {
  const b = B(); let wages = 0, upkeep = 0;
  for (const k in WAGES) wages += (b.staff[k] || 0) * WAGES[k];
  for (const k in UPKEEP) if (ownsSite(k)) upkeep += UPKEEP[k];
  for (const k in APT_UPKEEP) if (ownsApt(k)) upkeep += APT_UPKEEP[k];
  return { wages, upkeep, total: wages + upkeep };
}
// aus bizTick: neuer Tag?
function dayTick() {
  const b = B(), day = gameDay();
  if (b.dayN == null) { b.dayN = day; newMarket(b); newTasks(b); return; }
  if (day <= b.dayN) { checkTasks(b); return; }
  const n = Math.min(3, day - b.dayN);
  for (let k = 0; k < n; k++) newDay(b);
  b.dayN = day;
}
function newDay(b) {
  const c = dailyCosts();
  let left = c.total;
  const fromReg = Math.min(b.register, left); b.register -= fromReg; left -= fromReg;
  const fromBank = Math.min(save.money, left); save.money -= fromBank; left -= fromBank;
  let quit = '';
  if (left > 0) {   // nicht bezahlt: einer kündigt
    const k = Object.keys(WAGES).filter((q) => b.staff[q] > 0).sort((p, q) => WAGES[q] - WAGES[p])[0];
    if (k) { b.staff[k]--; quit = STAFF[k].name; }
  }
  b.report = { day: b.dayN + 1, income: b.dayIncome || 0, sold: b.sold - (b.soldAt0 || 0), wages: c.wages, upkeep: c.upkeep, paid: c.total - left, quit };
  bizNotify('TAG ' + (b.dayN + 1) + ' VORBEI: +' + b.report.income + '€ VERDIENT, -' + b.report.paid + '€ KOSTEN (LOHN + UNTERHALT)', '#ffd23f');
  if (quit) bizNotify('DU KONNTEST NICHT ZAHLEN - DER ' + quit + ' HAT GEKÜNDIGT!', '#ff6a6a');
  b.dayIncome = 0; b.soldAt0 = b.sold;
  newMarket(b); newTasks(b);
}
// ---------- Saft-Börse ----------
function newMarket(b) {
  const ks = Object.keys(FRUITS), m = {};
  for (const k of ks) m[k] = Math.round(rand(0.8, 1.2) * 20) / 20;
  const hot = pick(ks); let flop = pick(ks); if (flop === hot) flop = ks[(ks.indexOf(hot) + 1) % ks.length];
  m[hot] = Math.round(rand(1.3, 1.4) * 20) / 20; m[flop] = Math.round(rand(0.7, 0.75) * 20) / 20;
  b.market = m; b.marketHot = hot;
  bizNotify('SAFT-BÖRSE: ' + FRUITS[hot].juice + ' IST HEUTE GEFRAGT (+' + Math.round((m[hot] - 1) * 100) + '%)! ' + FRUITS[flop].juice + ' WILL KEINER.', '#66ffff');
}
const marketMult = (f) => (save.biz && save.biz.market && save.biz.market[f]) || 1;
// ---------- Tagesaufgaben ----------
const TASK_TYPES = {
  sell: { text: (n) => 'VERKAUFE ' + n + ' SÄFTE', range: [8, 18], pay: 22, val: () => B().sold },
  orders: { text: (n) => 'LIEFERE ' + n + ' BESTELLUNGEN', range: [2, 4], pay: 110, val: () => (B().cnt && B().cnt.orders) || 0 },
  harvest: { text: (n) => 'ERNTE ' + n + ' FRÜCHTE', range: [15, 36], pay: 9, val: () => (B().cnt && B().cnt.harvest) || 0 },
  mix: { text: (n) => 'MIXE ' + n + ' SÄFTE', range: [4, 10], pay: 30, val: () => (B().cnt && B().cnt.mix) || 0 },
  street: { text: (n) => 'STRASSENVERKAUF: ' + n + ' SÄFTE', range: [3, 6], pay: 45, val: () => save.stats.street || 0 },
  level: { text: () => 'SCHAFF EINEN AUFTRAG', range: [1, 1], pay: 300, val: () => save.stats.levels || 0 },
  kills: { text: (n) => 'ERLEDIGE ' + n + ' GEGNER', range: [15, 30], pay: 9, val: () => save.stats.kills || 0 },
  jobs: { text: (n) => 'MACH ' + n + ' NEBENJOBS', range: [1, 2], pay: 90, val: () => save.stats.jobs || 0 },
};
function newTasks(b) {
  const types = Object.keys(TASK_TYPES).sort(() => Math.random() - 0.5).slice(0, 3);
  b.tasks = types.map((t) => { const T2 = TASK_TYPES[t], n = randi(T2.range[0], T2.range[1]); return { t, n, base: T2.val(), done: false, pay: Math.round(T2.pay * n * (1 + b.rank * 0.08) / 10) * 10 }; });
}
function taskProgress(q) { return clamp(TASK_TYPES[q.t].val() - q.base, 0, q.n); }
function checkTasks(b) {
  if (!b.tasks) return;
  for (const q of b.tasks) {
    if (q.done || taskProgress(q) < q.n) continue;
    q.done = true; save.money += q.pay; addXP(20);
    bizNotify('TAGESAUFGABE GESCHAFFT: ' + TASK_TYPES[q.t].text(q.n) + ' +' + q.pay + '€', '#7dff7a');
    Sound.play('win');
  }
}
// ---------- Anwalt: Fahndung löschen ----------
const lawyerPrice = (stars) => 400 * stars * stars;
function lawyerClear() {
  if (!C || C.wanted <= 0) { cityMsg('DU WIRST GAR NICHT GESUCHT.', 2); return; }
  if (NET.mode === 'client' && NET.connected) { cityMsg('IM KOOP KANN DAS NUR DER HOST.', 2.5); return; }
  const b = B(), now = bizNow();
  if ((b.lawyerT || 0) > now) { cityMsg('DR. SCHLAU IST NOCH BESCHÄFTIGT. NOCH ' + Math.ceil((b.lawyerT - now) / 1000) + ' S.', 2.5); return; }
  const p = lawyerPrice(C.wanted);
  if (save.money < p) { cityMsg('ZU WENIG GELD! DR. SCHLAU WILL ' + p + '€.', 2.5); Sound.play('click'); return; }
  save.money -= p; b.lawyerT = now + 240000;
  C.wanted = 0; C.lostT = 0; C.lethalT = 0; endChase(); persist();
  Sound.play('cash'); cityMsg('DR. SCHLAU HAT TELEFONIERT: FAHNDUNG GELÖSCHT. (-' + p + '€)', 3.5);
}
