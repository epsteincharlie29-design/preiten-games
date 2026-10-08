'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - SAFT-IMPERIUM 2.0 (angelehnt an "Schedule I"):
//  Geräte kaufen und selbst aufstellen, Tasche mit Slots, Regale zum
//  Lagern, mehrere Grundstücke, anbauen, pressen, mixen, verkaufen,
//  Preise festlegen, Personal einstellen, Ränge aufsteigen.
//  Gegenstände: siehe inventory.js, Geräte + Grundstücke: equip.js
// =====================================================================
const FRUITS = {
  orange: { name: 'ORANGE', juice: 'O-SAFT', value: 40, seed: 10, rank: 1, col: '#ff9a1a' },
  blood: { name: 'BLUTORANGE', juice: 'BLUTORANGEN-SAFT', value: 62, seed: 25, rank: 3, col: '#c41f2a' },
  mandarin: { name: 'MANDARINE', juice: 'MANDARINEN-SAFT', value: 78, seed: 40, rank: 4, col: '#ff7a1a' },
  gold: { name: 'GOLDORANGE', juice: 'GOLD-SAFT', value: 95, seed: 60, rank: 6, col: '#ffd23f' },
  rainbow: { name: 'REGENBOGEN-ORANGE', juice: 'REGENBOGEN-SAFT', value: 160, seed: 130, rank: 8, col: '#ff3fa4', market: true },
};
const SEED_ORDER = ['rainbow', 'gold', 'mandarin', 'blood', 'orange'];   // beste zuerst
// Zutaten: mult = Wertfaktor, boost = Effekt als Booster für den nächsten Einsatz
const INGREDIENTS = {
  zucker: { name: 'ZUCKER', mix: 'SÜSSER', mult: 1.4, price: 12, rank: 1, boost: 'focus' },
  ingwer: { name: 'INGWER', mix: 'INGWER-KICK', mult: 1.7, price: 20, rank: 2, boost: 'speed' },
  chili: { name: 'CHILI', mix: 'HÖLLEN', mult: 2.0, price: 30, rank: 4, boost: 'osaft' },
  energy: { name: 'ENERGY-PULVER', mix: 'TURBO', mult: 2.4, price: 45, rank: 5, boost: 'armor' },
  glitzer: { name: 'GLITZER', mix: 'GLITZER', mult: 3.2, price: 70, rank: 8, boost: 'cash' },
  // Spezial-Zutaten: werden durch Bosse freigeschaltet
  wurst: { name: 'WURST-SALZ', mix: 'WURST', mult: 2.6, price: 55, level: 3, boost: 'heart' },
  paket: { name: 'PAKET-PULVER', mix: 'PING', mult: 2.8, price: 60, level: 4, boost: 'focus' },
  goldstaub: { name: 'CASINO-GOLDSTAUB', mix: 'JACKPOT', mult: 4.0, price: 120, level: 7, boost: 'cash' },
  ramen: { name: 'RAMEN-WÜRZE', mix: 'BAKA', mult: 3.5, price: 90, level: 10, boost: 'wave' },
};
const ING_COLS = { zucker: '#ffffff', ingwer: '#e8c547', chili: '#e01b3c', energy: '#3fd0ff', glitzer: '#ff9ad5', wurst: '#a0522d', paket: '#c8a070', goldstaub: '#ffd700', ramen: '#ff9a1a' };
const BOOSTERS = {
  focus: { name: 'ZEITLUPE+', desc: '+1 ZEITLUPE [E]' },
  speed: { name: 'TEMPO', desc: '+12% LAUFTEMPO' },
  osaft: { name: 'O-SAFT-START', desc: 'STARTE MIT TIKITIKILUKAS O-SAFT' },
  armor: { name: 'EXTRA-WESTE', desc: '+1 TREFFER ABGEFANGEN' },
  cash: { name: 'GELDREGEN', desc: '+30% GELD IM EINSATZ' },
  heart: { name: 'EXTRA-LEBEN', desc: '+2 LEBEN PRO ETAGE' },
  wave: { name: 'VEX-TURBO', desc: 'VEX-WAVE SOFORT BEREIT + SCHNELLER (OHNE KAUF: 1 GRATIS-WELLE)' },
};
// Geheime Rezepte: Saft + 2 Zutaten. Mehr wert (x1.3) und geben BEIDE Booster.
const RECIPES = [
  { f: 'orange', a: 'ingwer', b: 'zucker', name: 'OMAS HUSTENSAFT', line: 'WIE BEI OMA. NUR MIT MEHR BUMMS.' },
  { f: 'blood', a: 'ingwer', b: 'zucker', name: 'FOOOKUSSS-TEE', line: 'ÄHHHM... RUHE! JETZT WIRD GETRUNKEN.' },
  { f: 'orange', a: 'energy', b: 'chili', name: 'HÖLLEN-TURBO', line: 'BRENNT ZWEIMAL. VERSPROCHEN.' },
  { f: 'orange', a: 'wurst', b: 'chili', name: 'GÜNTHERS GRILL-SAFT', line: 'SCHMECKT NACH VILLA BRATWURST.' },
  { f: 'blood', a: 'glitzer', b: 'zucker', name: 'VAMPIR-GLITZER', line: 'FUNKELT IM DUNKELN.' },
  { f: 'blood', a: 'paket', b: 'energy', name: 'PING-PANZER', line: '0% PAKETVERLUST. 100% POWER.' },
  { f: 'mandarin', a: 'chili', b: 'ingwer', name: 'MANDARINEN-DRACHE', line: 'FEUER UND FRÜCHTE. VORSICHT, HEISS!' },
  { f: 'gold', a: 'paket', b: 'chili', name: 'TEBLEEDD-TONIC', line: 'LÄDT DEN AKKU. DEINEN AUCH.' },
  { f: 'gold', a: 'glitzer', b: 'energy', name: 'TIKITIKI SUPREME', line: 'DER KÖNIG ALLER SÄFTE.' },
  { f: 'gold', a: 'ramen', b: 'zucker', name: 'BAKA BAKA BRAUSE DELUXE', line: 'BAKA BAKA BAKA!!!' },
  { f: 'gold', a: 'goldstaub', b: 'glitzer', name: 'JACKPOT ROYALE', line: 'DAS TEUERSTE GETRÄNK DER STADT.' },
  { f: 'rainbow', a: 'goldstaub', b: 'glitzer', name: 'EINHORN-ELIXIER', line: 'SCHMECKT NACH REGENBOGEN. UND NACH GELD.' },
];
// Produkt-IDs: "orange" (reiner Saft), "orange+ingwer" oder "orange+ingwer+zucker"
// (Zutaten immer nach Wert sortiert, damit jede Mischung genau eine ID hat)
function canonId(f, a, b) {
  if (!a) return f;
  if (!b || b === a) return f + '+' + a;
  const ma = INGREDIENTS[a].mult, mb = INGREDIENTS[b].mult;
  return ma > mb || (ma === mb && a < b) ? f + '+' + a + '+' + b : f + '+' + b + '+' + a;
}
const RECIPE_BY_ID = {};
for (const r of RECIPES) { r.id = canonId(r.f, r.a, r.b); RECIPE_BY_ID[r.id] = r; }

const RANKS = [
  [0, 'SAFTSTAND-NEULING'], [150, 'ORANGEN-AZUBI'], [400, 'PRESS-PROFI'], [800, 'VITAMIN-VERKÄUFER'], [1400, 'SAFT-HÄNDLER'],
  [2200, 'ZITRUS-BOSS'], [3300, 'TIKITIKI-TYCOON'], [4800, 'SAFT-MILLIONÄR'], [6800, 'VITAMIN-KAISER'], [9500, 'SAFTGOTT'],
];
const STAFF = {
  seller: { name: 'VERKÄUFER', desc: 'VERKAUFT ALLE 35 S EINEN SAFT AUS DEINEN REGALEN. BEHÄLT 25%.', price: 600, rank: 3, max: (r) => Math.min(4, r - 2) },
  gardener: { name: 'GÄRTNER', desc: 'ERNTET IN ALLEN GRUNDSTÜCKEN UND PFLANZT NEU (KERNE AUS DEN REGALEN).', price: 1000, rank: 4, max: () => 2 },
  presser: { name: 'PRESSER', desc: 'PRESST FRÜCHTE AUS DEN REGALEN (BRAUCHT EINE AUFGESTELLTE PRESSE).', price: 1200, rank: 5, max: () => 1 },
  mixer: { name: 'MIXER', desc: 'MIXT DEIN AUTO-REZEPT AUS DEN REGALEN (BRAUCHT EINEN MIXTISCH).', price: 2000, rank: 7, max: () => 1 },
};
// name/desc/rank dürfen Funktionen der Stufe sein
const UPGRADES = {
  rucksack: { name: (lv) => ['RUCKSACK', 'GROSSER RUCKSACK', 'EXPEDITIONS-RUCKSACK'][lv] || 'RUCKSACK', desc: (lv) => 'TASCHE: ' + (8 + lv * 2) + ' -> ' + (10 + lv * 2) + ' PLÄTZE', price: (n) => [800, 3000, 9000][n], max: () => 3, rank: (lv) => [1, 3, 6][lv] },
  duenger: { name: 'TURBO-DÜNGER', desc: 'FRÜCHTE WACHSEN SCHNELLER', price: (n) => [600, 2000][n], max: () => 2, rank: 2 },
  stand: { name: 'SAFT-STAND IM PARK', desc: 'VERKAUFT ALLE 45 S EINEN SAFT AUS DEINEN REGALEN', price: () => 800, max: () => 1, rank: 2 },
  werbung: { name: 'WERBUNG', desc: 'MEHR BESTELLUNGEN, +10% PREIS', price: (n) => [1000, 3000][n], max: () => 2, rank: 3 },
  lampe: { name: 'WACHSTUMS-FORMEL', desc: '+1 FRUCHT PRO ERNTE (ALLE KÜBEL)', price: () => 1500, max: () => 1, rank: 4 },
  laster: { name: 'SAFT-LASTER', desc: 'EIN LASTER FÄHRT DURCH DIE STADT: ALLE 25 S EIN SAFT (90%)', price: (n) => [6000, 14000][n], max: () => 2, rank: 6 },
};
const upName = (u, lv) => (typeof u.name === 'function' ? u.name(lv) : u.name);
const upDesc = (u, lv) => (typeof u.desc === 'function' ? u.desc(lv) : u.desc);
const upRank = (u, lv) => (typeof u.rank === 'function' ? u.rank(lv) : u.rank);
const CUSTOMER_NAMES = ['KEVIN', 'OMA HILDE', 'JUSTIN', 'CHANTAL', 'HERR MÜLLER', 'DIE BAUARBEITER', 'DER POSTBOTE', 'LISA', 'MEHMET', 'DIE SCHACHGRUPPE', 'DJ BASSBOX', 'DER KIOSK-MANN', 'BAUER HEINZ', 'FRAU SONNENSCHEIN'];
const SPECIAL_CUSTOMERS = [
  { level: 1, name: 'FRAU GRECHENIG', line: 'OHNE ZUCKER. UND FOOOKUSSS BEIM LIEFERN.' },
  { level: 3, name: 'GÜNTHER', line: 'MIT WURST-SALZ. ICH BIN JETZT DEIN FAN.' },
  { level: 4, name: 'KUMI IT', line: 'BITTE PER PAKET. PING MICH AN.' },
  { level: 10, name: 'BAKA BAKA BAKA', line: 'BAKA-BRAUSE!!! SOFORT!!!' },
];

// Startausrüstung für einen neuen Spielstand: alles in der Tasche - selbst aufstellen!
function starterBag() {
  const S = new Array(8).fill(null);
  S[0] = { k: 'e:pot', n: 2 }; S[1] = { k: 'e:press', n: 1 }; S[2] = { k: 'e:shelf', n: 1 }; S[3] = { k: 's:orange', n: 4 };
  return S;
}
function bizDefault() {
  return { rank: 1, xp: 0, staff: { seller: 0, gardener: 0, presser: 0, mixer: 0 }, up: {}, register: 0, orders: [], lastTick: 0, clock: 0, clockV: 1,
    sold: 0, earned: 0, rep: 0, recipe: '', unlockedIng: {}, timers: {}, nextOrder: 30000, seenIntro: false, totalCut: 0, known: {},
    v2: true, inv: starterBag(), eq: [], sites: { factory: true }, boxes: {}, price: {}, deliveries: [], orchard: {}, uid: 1, callT: {} };
}
function B() {
  if (!save.biz) save.biz = bizDefault();
  const b = save.biz;
  if (!b.known) b.known = {};
  if (!b.clockV) { b.clockV = 1; b.clock = 0; b.lastTick = 0; b.nextOrder = 30000; b.orders = []; }
  if (!b.v2) bizMigrate(b);   // alter Spielstand -> Inventar 2.0 (equip.js)
  if (b.inv.length < bagSize(b)) while (b.inv.length < bagSize(b)) b.inv.push(null);
  return b;
}
const upLvl = (id) => B().up[id] || 0;
function bizRankName(r = B().rank) { return RANKS[r - 1][1]; }
function growMs() { return [60, 42, 28][upLvl('duenger')] * 1000; }
function bagSize(b = B()) { return 8 + 2 * ((b.up && b.up.rucksack) || 0); }

function productParts(id) { return id.split('+'); }
function productName(id) {
  const r = RECIPE_BY_ID[id];
  if (r) return r.name;
  const [f, a, b] = productParts(id);
  if (!a) return FRUITS[f].juice;
  if (!b) return INGREDIENTS[a].mix + ' ' + FRUITS[f].name;
  return INGREDIENTS[a].mix + '-' + INGREDIENTS[b].mix + ' ' + FRUITS[f].name;
}
function productValue(id) {
  const [f, a, b] = productParts(id);
  let v = FRUITS[f].value;
  if (a) v *= INGREDIENTS[a].mult;
  if (b) v *= 1 + (INGREDIENTS[b].mult - 1) * 0.5;
  if (RECIPE_BY_ID[id]) v *= 1.3;
  return Math.round(v * 0.85 * marketMult(f) * (1 + 0.04 * sk('deal')) * (1 + 0.1 * upLvl('werbung')) * (hasEquip('filler') ? 1.25 : 1) * GRADE_MULT[juiceGrade()]);
}
// eigener Verkaufspreis (Handy-App PREISE): 70% bis 160% vom Wert
const priceMult = (id) => (B().price && B().price[id]) || 1;
const productPrice = (id) => Math.round(productValue(id) * priceMult(id));
// Booster eines Safts: gemixt = Booster der stärkeren Zutat, Geheimrezept = beide
function productBoosts(id) {
  const [, a, b] = productParts(id);
  if (!a) return [];
  const out = [INGREDIENTS[a].boost];
  if (b && RECIPE_BY_ID[id] && INGREDIENTS[b].boost !== out[0]) out.push(INGREDIENTS[b].boost);
  return out;
}
function ingUnlocked(id) {
  const g = INGREDIENTS[id];
  if (g.level != null) return !!B().unlockedIng[id];
  return B().rank >= g.rank;
}
function fruitUnlocked(k) { return B().rank >= FRUITS[k].rank; }
// Russian Hacker Boi kassiert 10% vom Saft-Geschäft - bis du ihn besiegt hast
function rhbCut(amount, src) {
  if (src !== 'biz' || save.beaten) return 0;
  return Math.round(amount * 0.1);
}
function bizEarn(amount) {
  const cut = rhbCut(amount, 'biz');
  B().totalCut += cut; B().dayIncome = (B().dayIncome || 0) + amount - cut;
  return amount - cut;
}
function addXP(n) {
  const b = B();
  b.xp += n;
  while (b.rank < RANKS.length && b.xp >= RANKS[b.rank][0]) {
    b.rank++;
    bizNotify('RANG ' + b.rank + ': ' + bizRankName() + '! NEUE SACHEN FREIGESCHALTET!', '#ffe14d');
    if (b.rank === GATE.rank) bizNotify('DIE STRASSENSPERRE ZUM LANDKREIS (GANZ RECHTS) IST JETZT OFFEN!', '#7dff7a');
    Sound.play('levelup');
  }
}
let bizNote = [], bizLog = [];
function bizNotify(text, col = '#7dff7a') {
  bizNote.push({ text, col, t: 4.5 }); if (bizNote.length > 3) bizNote.shift();
  bizLog.unshift({ text, col, at: (B().clock || 0) }); if (bizLog.length > 30) bizLog.pop();
}

// Uhr fürs Geschäft: während bizTick die simulierte Zeit
let BIZ_NOW = 0;
const bizNow = () => BIZ_NOW || (B().clock || 0) * 1000;   // Spielzeit: wächst nur, wenn gespielt wird

// ---------- Pflanzkübel (aufgestellte Geräte, siehe equip.js) ----------
function potGrowMs(o) { const E = EQUIP[o.id] || {}; return growMs() * (E.speed || 1) * ((SITES[o.s] && SITES[o.s].grow) || 1) * (lampNear(o) ? 0.7 : 1) * (1 - 0.08 * sk('thumb')); }
function potKind(o) { return o.k || 'orange'; }
function potLeft(o) { return o.t ? Math.max(0, potGrowMs(o) - (bizNow() - o.t)) : 0; }
function potState(o) {
  if (!o || !o.t) return 'empty';
  return bizNow() - o.t >= potGrowMs(o) ? 'ready' : 'growing';
}
function allPots() { return B().eq.filter((o) => EQUIP[o.id] && EQUIP[o.id].kind === 'pot' && ownsSite(o.s)); }
function potYield(o) { return 3 + upLvl('lampe') + ((EQUIP[o.id] && EQUIP[o.id].yield) || 0); }
// beste Kerne in einem Behälter (oder der Tasche)
function bestSeedIn(S) { return SEED_ORDER.find((k) => slotsCount(S, 's:' + k) > 0); }
function bestSeed() { return bestSeedIn(B().inv); }
// pflanzen: Kerne aus der Tasche (Lil) oder aus den Regalen (Gärtner)
function plantPot(o, kind, fromStore) {
  if (!o || o.t) return false;
  const b = B();
  if (fromStore) { kind = kind || SEED_ORDER.find((k) => storeCount('s:' + k) > 0); if (!kind || !storeTake('s:' + kind, 1)) return false; }
  else { kind = kind || bestSeed(); if (!kind || !slotsTake(b.inv, 's:' + kind, 1)) return false; }
  o.t = Math.max(1, bizNow()); o.k = kind;
  return true;
}
// ernten: in die Tasche (Lil) oder in die Regale (Gärtner); false = kein Platz
function harvestPot(o, toStore) {
  const k = potKind(o), n = potYield(o), key = 'f:' + k;
  if (toStore) { if (storeRoom(key, o.s) < n && storeRoom(key) < n) return 0; storeAdd(key, n, o.s); }
  else { if (slotsRoom(B().inv, key) < n) return 0; slotsAdd(B().inv, key, n); bizCount('harvest', n); lilXP(1); }
  o.t = 0;
  addXP(2);
  return n;
}
// beste Presse (Säfte pro 3 Früchte) auf einem Grundstück (oder überall)
function pressOut(site) {
  let best = 0;
  for (const o of B().eq) { const E = EQUIP[o.id]; if (E && E.kind === 'press' && ownsSite(o.s) && (!site || o.s === site)) best = Math.max(best, E.out); }
  return best;
}
// Lil presst an einer Presse: Früchte aus der Tasche -> Säfte in die Tasche
function pressBag(out) {
  const S = B().inv; let made = 0, full = false;
  for (const k of SEED_ORDER) {
    const fk = 'f:' + k, jk = 'j:' + k;
    while (slotsCount(S, fk) >= 3) {
      slotsTake(S, fk, 3);
      const got = slotsAdd(S, jk, out);
      if (got < out) { slotsTake(S, jk, got); slotsAdd(S, fk, 3); full = true; break; }   // kein Platz: zurück
      made += out;
    }
  }
  if (made) addXP(made);
  pressBag.full = full;
  return made;
}
// Personal presst: Früchte aus den Regalen -> Säfte in die Regale
function pressStore() {
  const out = pressOut();
  if (!out) return 0;
  for (const k of SEED_ORDER) {
    if (storeCount('f:' + k) >= 3 && storeRoom('j:' + k) >= out) { storeTake('f:' + k, 3); storeAdd('j:' + k, out); addXP(out); return out; }
  }
  return 0;
}
// ---------- Mixen ----------
// Zutaten + Saft aus der Tasche, dann aus den Regalen des Grundstücks; Ergebnis in die Tasche
function mixHave(k, site) { return slotsCount(B().inv, k) + storeCount(k, site); }
function mixTake(k, site) { if (slotsTake(B().inv, k, 1)) return true; return storeTake(k, 1, site) > 0; }
function canMix(f, a, b2, site) {
  if (mixHave('j:' + f, site) <= 0 || !a || mixHave('i:' + a, site) <= 0 || !ingUnlocked(a)) return false;
  if (b2 && (b2 === a || mixHave('i:' + b2, site) <= 0 || !ingUnlocked(b2))) return false;
  return true;
}
function mixCount(f, a, b2, site) {
  if (!canMix(f, a, b2, site)) return 0;
  return Math.min(mixHave('j:' + f, site), mixHave('i:' + a, site), b2 ? mixHave('i:' + b2, site) : 1e9);
}
// gibt die neue Produkt-ID zurück (oder '' wenn es nicht geht)
function mixOne(f, a, b2, site, staff) {
  const b = B();
  if (staff) {
    if (storeCount('j:' + f) <= 0 || storeCount('i:' + a) <= 0 || (b2 && storeCount('i:' + b2) <= 0)) return '';
    const id0 = canonId(f, a, b2);
    if (storeRoom('j:' + id0) <= 0) return '';
    storeTake('j:' + f, 1); storeTake('i:' + a, 1); if (b2) storeTake('i:' + b2, 1);
    storeAdd('j:' + id0, 1);
    addXP(b2 ? 5 : 3);
    return id0;
  }
  if (!canMix(f, a, b2, site)) return '';
  const id = canonId(f, a, b2);
  if (slotsRoom(b.inv, 'j:' + id) <= 0 && storeRoom('j:' + id, site) <= 0) return '';
  mixTake('j:' + f, site); mixTake('i:' + a, site); if (b2) mixTake('i:' + b2, site);
  if (!slotsAdd(b.inv, 'j:' + id, 1)) storeAdd('j:' + id, 1, site);
  addXP(b2 ? 5 : 3); bizCount('mix', 1); lilXP(1);
  const r = RECIPE_BY_ID[id];
  if (r && !b.known[id]) {
    b.known[id] = true;
    addXP(40);
    bizNotify('GEHEIMREZEPT ENTDECKT: ' + r.name + '!', '#ff9ad5');
    Sound.play('win');
  }
  return id;
}
// wertvollsten Saft aus den Regalen nehmen (Personal verkauft ihn)
function takeBestJuice() {
  let best = null, bv = -1;
  for (const k of storeKeys('j')) { const v = productPrice(k.slice(2)); if (v > bv) { bv = v; best = k; } }
  if (!best || !storeTake(best, 1)) return null;
  return best.slice(2);
}

// ---------- Zeit läuft weiter ----------
function bizTick() {
  if (NET.mode === 'client' && NET.connected) return;   // im Koop rechnet nur der Host das Geschäft
  const b = B(), now = (b.clock || 0) * 1000;
  if (!(b.lastTick <= now)) b.lastTick = now;
  let secs = Math.floor((now - b.lastTick) / 1000);
  const T_ = b.timers;
  // teurer Preis = langsamer verkauft
  const sell = (key, every, share) => {
    T_[key] = (T_[key] || 0) + 1;
    if (T_[key] < every) return;
    const id = takeBestJuice();
    if (!id) { T_[key] = every; return; }
    T_[key] = -Math.round(every * (priceMult(id) ** 2 - 1));
    const v = bizEarn(Math.round(productPrice(id) * share)); b.register += v; b.sold++; b.earned += v; addXP(1);
  };
  try {
  while (secs >= 1) {
    secs -= 1;
    b.lastTick += 1000; BIZ_NOW = b.lastTick;
    // Gärtner (jeder schafft einen Kübel alle 3 s)
    if (b.staff.gardener) {
      T_.gard = (T_.gard || 0) + 1;
      if (T_.gard >= 3) {
        T_.gard = 0;
        let jobs = b.staff.gardener;
        for (const o of allPots()) {
          if (jobs <= 0) break;
          if (potState(o) === 'ready' && harvestPot(o, true)) jobs--;
          else if (potState(o) === 'empty' && plantPot(o, null, true)) jobs--;
        }
      }
    }
    if (b.staff.presser) { T_.press = (T_.press || 0) + 1; if (T_.press >= 4) { T_.press = 0; pressStore(); } }
    if (b.staff.mixer && b.recipe && hasEquip('mixer')) {
      T_.mix = (T_.mix || 0) + 1;
      if (T_.mix >= 5) { T_.mix = 0; const [f, a, b2] = productParts(b.recipe); mixOne(f, a, b2, null, true); }
    }
    for (let s2 = 0; s2 < b.staff.seller; s2++) sell('sell' + s2, 35, 0.75);
    if (upLvl('stand')) sell('stand', 45, 1);
    for (let s2 = 0; s2 < upLvl('laster'); s2++) sell('truck' + s2, 25, 0.9);
    // Miete von deinen Immobilien (pro Spielminute)
    if (b.props) { b.rentAcc = (b.rentAcc || 0) + rentPerMin() / 60; if (b.rentAcc >= 1) { const v = Math.floor(b.rentAcc); b.rentAcc -= v; b.register += v; } }
    sprinklerTick();
    deliveryTick();
  }
  } finally { BIZ_NOW = 0; }
  dayTick();
}

const bizCount = (k, n) => { const b = B(); b.cnt = b.cnt || {}; b.cnt[k] = (b.cnt[k] || 0) + n; };
// ---------- Kundenbestellungen (SMS) ----------
const ORDER_SPOTS = [[8, 9], [30, 13], [40, 29], [11, 33], [46, 49], [76, 13], [79, 29], [108, 33], [75, 49], [14, 53], [46, 69], [79, 73], [110, 69], [62, 33], [28, 49], [95, 53], [111, 13], [111, 52],
  [128, 9], [150, 13], [126, 29], [152, 33], [133, 49], [148, 53], [128, 69], [150, 73], [120, 89], [60, 93], [100, 93], [150, 93], [165, 29], [165, 69], [170, 49]];
function orderOptions() {
  const b = B(), options = [];
  for (const f in FRUITS) {
    if (!fruitUnlocked(f)) continue;
    options.push(f);
    for (const i in INGREDIENTS) if (ingUnlocked(i)) options.push(f + '+' + i);
  }
  return options;
}
function bizOrderTick(dt, force) {
  const b = B(), now = (b.clock || 0) * 1000;
  b.orders = b.orders.filter((o) => {
    if (o.until < now) { bizNotify('BESTELLUNG VON ' + o.name + ' ABGELAUFEN!', '#ff6a6a'); b.rep = Math.max(0, b.rep - 1); const r = b.regulars && b.regulars[o.name]; if (r) r.loyal = Math.max(0, r.loyal - 1); return false; }
    return true;
  });
  const maxOrders = 1 + Math.min(3, Math.floor(b.rank / 3));
  if (!force && (now < b.nextOrder || b.orders.length >= maxOrders)) return null;
  if (b.orders.length >= 6) return null;
  // höhere Preise = weniger Bestellungen
  const ids = Object.keys(b.price || {}), avg = ids.length ? ids.reduce((a, k) => a + priceMult(k), 0) / ids.length : 1;
  const gap = (75 - upLvl('werbung') * 15 - Math.min(20, b.rep)) * 1000 * Math.max(0.8, avg * avg);
  b.nextOrder = now + Math.max(25000, gap) * rand(0.8, 1.2);
  const options = orderOptions();
  const recipes = RECIPES.filter((r) => b.known[r.id]).map((r) => r.id);
  let prod = pick(options.slice(0, Math.max(2, Math.min(options.length, 2 + b.rank * 2))));
  if (recipes.length && Math.random() < 0.35) prod = pick(recipes);
  const qty = randi(1, 1 + Math.min(4, Math.floor(b.rank / 2)));
  const specials = SPECIAL_CUSTOMERS.filter((c) => save.unlocked > c.level);
  const sc = !force && specials.length && Math.random() < 0.25 ? pick(specials) : null;
  // Stammkunden: bestellen öfter ihren Lieblingssaft und zahlen mehr, je treuer sie sind
  b.regulars = b.regulars || {};
  const regs = Object.keys(b.regulars).filter((n) => !b.orders.some((q) => q.name === n));
  let reg = typeof force === 'string' ? force : !sc && regs.length && Math.random() < 0.55 ? pick(regs) : null;
  if (reg && b.regulars[reg] && (options.includes(b.regulars[reg].fav) || recipes.includes(b.regulars[reg].fav))) prod = b.regulars[reg].fav;
  const spot = pick(ORDER_SPOTS);
  const tip = rand(1.0, 1.3) + (sc ? 0.3 : 0) + (reg && b.regulars[reg] ? 0.08 * b.regulars[reg].loyal : 0);
  const o = { id: now + Math.random(), reg: !!reg, name: sc ? sc.name : reg || pick(CUSTOMER_NAMES), line: sc ? sc.line : '', prod, qty, pay: Math.round(productPrice(prod) * qty * tip), x: spot[0] * TS + 8, y: spot[1] * TS + 8, until: now + 240000 };
  b.orders.push(o);
  bizNotify('SMS VON ' + o.name + (reg && b.regulars[reg] ? ' (STAMMKUNDE ' + '*'.repeat(b.regulars[reg].loyal) + ')' : '') + ': ' + qty + 'X ' + productName(prod) + ' FÜR ' + o.pay + '€', reg ? '#ffd23f' : '#66ffff');
  Sound.play('sms');
  return o;
}
// bonus = Trinkgeld-Faktor (z.B. Saft-Mobil)
function deliverOrder(o, bonus = 1) {
  const b = B(), S = b.inv, k = 'j:' + o.prod;
  if (slotsCount(S, k) < o.qty) return false;
  slotsTake(S, k, o.qty);
  const v = bizEarn(Math.round(o.pay * bonus));
  save.money += v; b.sold += o.qty; b.earned += v; b.rep++;
  addXP(8 + o.qty * 3); bizCount('orders', 1); lilXP(6);
  const rg = (b.regulars = b.regulars || {})[o.name] || (b.regulars[o.name] = { fav: o.prod, loyal: 0 });
  rg.loyal = Math.min(5, rg.loyal + 1); rg.fav = o.prod;
  b.orders = b.orders.filter((q) => q !== o);
  persist();
  return v;
}

// ---------- Verbindung zum Hauptspiel ----------
function onLevelFirstClear(li) {
  const b = B();
  for (const id in INGREDIENTS) {
    const g = INGREDIENTS[id];
    if (g.level === li && !b.unlockedIng[id]) { b.unlockedIng[id] = true; giveItem('i:' + id, 3); }
  }
  if (li === 0) giveItem('s:orange', 4);
}
// in die Tasche, sonst in die Regale, sonst in die Lieferkiste der Saftfabrik
function giveItem(k, n) {
  const b = B();
  let left = n - slotsAdd(b.inv, k, n);
  if (left > 0) left -= storeAdd(k, left);
  if (left > 0) left -= slotsAdd(siteBox('factory'), k, left);
  return n - left;
}
function levelUnlockText(li) {
  for (const id in INGREDIENTS) if (INGREDIENTS[id].level === li) return 'SAFT-IMPERIUM: NEUE ZUTAT ' + INGREDIENTS[id].name + ' (+3 GRATIS)!';
  if (li === 0) return 'SAFT-IMPERIUM: +4 ORANGENKERNE GRATIS!';
  return '';
}
// Booster für den nächsten Einsatz einpacken (Saft aus der Tasche oder den Regalen)
function takeBooster(id) {
  const boosts = productBoosts(id), k = 'j:' + id;
  if (!boosts.length) return false;
  if (!slotsTake(B().inv, k, 1) && !storeTake(k, 1)) return false;
  save.booster = boosts[0]; save.booster2 = boosts[1] || '';
  persist();
  return true;
}
const hasBoost = (id) => save.booster === id || save.booster2 === id;
function clearBoosters() { save.booster = ''; save.booster2 = ''; }
function boosterNames() { return [save.booster, save.booster2].filter((k) => k && BOOSTERS[k]).map((k) => BOOSTERS[k].name).join(' + '); }
function boosterDescs() { return [save.booster, save.booster2].filter((k) => k && BOOSTERS[k]).map((k) => BOOSTERS[k].desc).join('  /  '); }
function applyBoosterStart(p) {
  if (hasBoost('osaft') && !p.weapon) p.weapon = { id: 'osaft', ammo: 4, boosted: true };
  if (hasBoost('wave')) { p.waveCd = 0; if (!perk('vexwave')) p.freeWave = 1; }
  if (hasBoost('focus')) p.focus += 1;
}
