'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - SAFT-IMPERIUM: Menüs
//  (Gartencenter & Baumarkt, Großmarkt, Export, Mixtisch + Rezeptbuch, Personal)
// =====================================================================
const BZ = { screen: 'garden', tab: 0, msg: '', msgT: 0, mix: { f: 'orange', a: 'zucker', b: '' }, book: false, site: 'factory' };
function openBiz(screen) { BZ.screen = screen; BZ.tab = 0; BZ.book = false; setState('biz'); Sound.playSong('factory'); }
function bzMsg(m, ok = true) { BZ.msg = m; BZ.msgT = 2; Sound.play(ok ? 'cash' : 'click'); }
function bzBuy(price, fn) {
  if (save.money < price) { bzMsg('ZU WENIG GELD! (' + price + '€)', false); return; }
  save.money -= price; fn(); persist(); bzMsg('GEKAUFT!');
}
// kaufen und direkt in die Tasche (nur wenn alles reinpasst)
function bzBuyItem(k, n, price) {
  if (slotsRoom(bag(), k) < n) { bzMsg('TASCHE VOLL! LEG WAS IN EIN REGAL ODER BESTELL PER HANDY (LIEFERDIENST).', false); return; }
  bzBuy(price, () => { slotsAdd(bag(), k, n); });
}
function bizHeader(title) {
  drawRoomBg();
  const b = B();
  txt(title, W / 2, 6, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  txt('RANG ' + b.rank + ': ' + bizRankName(), 10, 28, { font: FS, color: '#ffe14d' });
  const nx = b.rank < RANKS.length ? RANKS[b.rank][0] : b.xp, px = RANKS[b.rank - 1][0];
  ctx.fillStyle = '#222'; ctx.fillRect(10, 38, 120, 4);
  ctx.fillStyle = '#ffe14d'; ctx.fillRect(10, 38, Math.round(120 * clamp((b.xp - px) / Math.max(1, nx - px), 0, 1)), 4);
  moneyTag(W - 10, 28);
  txt('TASCHE: ' + slotsUsed(bag()) + '/' + bag().length + ' PLÄTZE', W - 10, 40, { font: FS, align: 'right', color: '#cccccc' });
}
function bizFooter(hint) {
  if (BZ.msgT > 0) { BZ.msgT -= frameDt; txt(fitText(BZ.msg, W - 20), W / 2, H - 16, { font: FS, align: 'center', color: BZ.msg === 'GEKAUFT!' ? '#7dff7a' : '#ffe14d' }); }
  else txt(hint, W / 2, H - 16, { font: FS, align: 'center', color: '#888888' });
  if (uiActive() && pressed.Escape) { if (BZ.book) BZ.book = false; else enterHub(); }
}
// Beschreibung des gewählten Eintrags (eine Zeile über der Fußzeile)
function bizHint(items, sel, y = 232) {
  const it = items[sel];
  if (it && it.hint) txt(fitText(it.hint, W - 20), W / 2, y, { font: FS, align: 'center', color: '#cccccc' });
}
function bizTabs(tabs) {
  tabs.forEach((t, i) => {
    const x = W / 2 + (i - (tabs.length - 1) / 2) * 110, hov = Math.abs(mouse.x - x) < 50 && mouse.y > 48 && mouse.y < 60;
    if (hov && mouse.pl && uiActive()) { BZ.tab = i; Sound.play('blip', true); }
    txt(t, x, 50, { align: 'center', color: i === BZ.tab ? '#ffe14d' : '#888888' });
  });
  if (uiActive() && (pressed.ArrowRight || pressed.KeyD)) BZ.tab = (BZ.tab + 1) % tabs.length;
  if (uiActive() && (pressed.ArrowLeft || pressed.KeyA)) BZ.tab = (BZ.tab + tabs.length - 1) % tabs.length;
}

function screenBiz() {
  bizTick();
  if (BZ.screen === 'garden') bizGarden(false);
  else if (BZ.screen === 'market') bizGarden(true);
  else if (BZ.screen === 'export') bizExport();
  else if (BZ.screen === 'mixer') { if (BZ.book) bizRecipes(); else bizMixer(); }
  else bizStaff();
}

// ---------- Gartencenter & Baumarkt / Großmarkt (auf dem Land: 20% billiger, große Packungen) ----------
function seedItems(market) {
  const b = B(), items = [];
  for (const k in FRUITS) {
    const f = FRUITS[k], ok = b.rank >= f.rank;
    if (f.market && !market) { items.push({ label: f.name + '-KERNE - NUR IM GROSSMARKT (LAND)', disabled: true, hint: 'DER GROSSMARKT LIEGT AUF DEM LAND (RECHTS, HINTER DER STRASSENSPERRE).' }); continue; }
    for (const n of market ? [20, 50] : [5, 25]) {
      const price = Math.round(f.seed * n * (n > 5 ? 0.9 : 1) * (market ? 0.8 : 1));
      items.push({ label: ok ? f.name + '-KERNE X' + n + '   ' + price + '€' : f.name + '-KERNE - AB RANG ' + f.rank, disabled: !ok,
        hint: 'IN DER TASCHE: ' + slotsCount(bag(), 's:' + k) + '. 1 KERN = 1 PFLANZE = 3+ FRÜCHTE. SAFT WERT: ' + f.value + '€.', act: () => bzBuyItem('s:' + k, n, price) });
    }
  }
  return items;
}
function ingItems(market) {
  const items = [];
  for (const k in INGREDIENTS) {
    const g = INGREDIENTS[k], ok = ingUnlocked(k);
    const lock = g.level != null ? 'BOSS VON LEVEL ' + (g.level + 1) + ' BESIEGEN' : 'AB RANG ' + g.rank;
    for (const n of market ? [20] : [5, 20]) {
      if (!ok && n > 5 && !market) continue;
      const price = Math.round(g.price * n * (n > 5 ? 0.9 : 1) * (market ? 0.8 : 1));
      items.push({ label: ok ? g.name + ' X' + n + '   ' + price + '€' : g.name + ' - ' + lock, disabled: !ok,
        hint: ok ? 'WERT X' + g.mult + '   BOOSTER: ' + BOOSTERS[g.boost].name + ' (' + BOOSTERS[g.boost].desc + ')' : 'NOCH GESPERRT: ' + lock,
        act: () => bzBuyItem('i:' + k, n, price) });
    }
  }
  return items;
}
function equipItems() {
  const b = B(), items = [];
  for (const id in EQUIP) {
    const E = EQUIP[id], ok = b.rank >= E.rank;
    const have = b.eq.filter((o) => o.id === id).length + slotsCount(bag(), 'e:' + id);
    items.push({ label: ok ? E.name + '   ' + E.price + '€' + (have ? '  (HAST ' + have + ')' : '') : E.name + ' - AB RANG ' + E.rank, disabled: !ok,
      hint: E.desc + ' GRÖSSE ' + E.w + 'X' + E.h + '. KOMMT IN DIE TASCHE - DANN IM GRUNDSTÜCK AUFSTELLEN.', act: () => bzBuyItem('e:' + id, 1, E.price) });
  }
  return items;
}
function upgradeItems() {
  const b = B(), items = [];
  for (const k in UPGRADES) {
    const u = UPGRADES[k], lv = upLvl(k), max = u.max(b.rank), full = lv >= max;
    const needRank = full ? 0 : upRank(u, lv), ok = b.rank >= needRank;
    items.push({ label: upName(u, Math.min(lv, u.max(99) - 1)) + ' (' + lv + '/' + u.max(99) + ')' + (full ? '  MAX' : !ok ? '  AB RANG ' + needRank : '   ' + u.price(lv) + '€'),
      disabled: !ok || full, hint: upDesc(u, Math.min(lv, u.max(99) - 1)),
      act: () => bzBuy(u.price(lv), () => {
        b.up[k] = lv + 1;
        if (k === 'rucksack') { while (b.inv.length < bagSize(b)) b.inv.push(null); bizNotify('DEINE TASCHE HAT JETZT ' + bagSize(b) + ' PLÄTZE!', '#7dff7a'); }
        if (k === 'laster') bizNotify('EIN SAFT-LASTER FÄHRT JETZT FÜR DICH DURCH DIE STADT!', '#ff9a1a');
      }) });
  }
  return items;
}
function bizGarden(market) {
  bizHeader(market ? 'GROSSMARKT' : 'GARTENCENTER & BAUMARKT');
  const tabs = market ? ['KERNE', 'ZUTATEN'] : ['KERNE', 'ZUTATEN', 'GERÄTE', 'UPGRADES'];
  bizTabs(tabs);
  panel(10, 64, W - 20, 160, market ? '#ffd23f' : '#7dff7a');
  const items = BZ.tab === 0 ? seedItems(market) : BZ.tab === 1 ? ingItems(market) : BZ.tab === 2 ? equipItems() : upgradeItems();
  items.push({ label: 'ZURÜCK', act: () => enterHub() });
  const sel = listMenu((market ? 'market' : 'garden') + BZ.tab, items, 26, 74, 15, { align: 'left', w: 210, max: 10 });
  bizHint(items, sel);
  if (BZ.tab === 2 && !market) { const it = items[sel]; const id = Object.keys(EQUIP)[sel]; if (it && id && EQUIP[id]) { ctx.save(); ctx.translate(W - 66, 82); ctx.scale(2, 2); drawEquip(ctx, { id, x: 0, y: 0, w: EQUIP[id].w, h: EQUIP[id].h }, true); ctx.restore(); } }
  bizFooter(market ? 'GROSSPACKUNGEN 20% BILLIGER   < > KATEGORIE   ESC ZURÜCK' : '<  > KATEGORIE   ENTER/KLICK KAUFEN   MAUSRAD SCROLLEN   ESC ZURÜCK');
}
// ---------- Export-Rampe (Großmarkt): Säfte aus der Tasche sofort verkaufen, aber billig ----------
const EXPORT_SHARE = 0.45;
function bizExport() {
  bizHeader('SAFT-EXPORT');
  panel(10, 50, W - 20, 174, '#3fd0ff');
  txt('DER GROSSHANDEL NIMMT ALLES - ZAHLT ABER NUR ' + Math.round(EXPORT_SHARE * 100) + '% VOM WERT.', W / 2, 56, { font: FS, align: 'center', color: '#cccccc' });
  const S = bag(), keys = slotsKeys(S, 'j');
  const items = keys.map((k) => {
    const n = slotsCount(S, k), each = Math.round(productValue(k.slice(2)) * EXPORT_SHARE);
    return { label: n + 'X ' + fitText(productName(k.slice(2)), 220) + '  JE ' + each + '€', act: () => exportJuice(k, n) };
  });
  if (keys.length) items.unshift({ label: 'ALLES EXPORTIEREN', act: () => { let sum = 0; for (const k of keys) sum += exportJuice(k, slotsCount(S, k), true); bzMsg(sum ? 'EXPORTIERT: +' + sum + '€' : 'NICHTS DA', !!sum); } });
  else items.push({ label: 'KEINE SÄFTE IN DER TASCHE', disabled: true });
  items.push({ label: 'ZURÜCK', act: () => enterHub() });
  listMenu('export', items, 26, 72, 15, { align: 'left', w: 210, max: 9 });
  bizFooter('ENTER/KLICK = VERKAUFEN   ESC ZURÜCK');
}
function exportJuice(k, n, quiet) {
  const got = slotsTake(bag(), k, n), b = B();
  if (!got) return 0;
  const v = bizEarn(Math.round(productValue(k.slice(2)) * EXPORT_SHARE * got));
  save.money += v; b.sold += got; b.earned += v; addXP(got);
  persist();
  if (!quiet) bzMsg(got + 'X EXPORTIERT: +' + v + '€');
  return v;
}

// ---------- Mixtisch ----------
function mixOptions() {
  const fruits = Object.keys(FRUITS).filter(fruitUnlocked);
  const ings = Object.keys(INGREDIENTS).filter((i) => ingUnlocked(i));
  return { fruits, ings };
}
function cycle(list, cur, d) { const i = list.indexOf(cur); return list[((i < 0 ? 0 : i + d) % list.length + list.length) % list.length]; }
function bizMixer() {
  bizHeader('MIXTISCH');
  const b = B(), M = BZ.mix, site = BZ.site, { fruits, ings } = mixOptions();
  if (!fruits.includes(M.f)) M.f = fruits[0];
  if (!ings.includes(M.a)) M.a = ings[0];
  if (M.b && (!ings.includes(M.b) || M.b === M.a)) M.b = '';
  const bOpts = [''].concat(ings.filter((i) => i !== M.a));
  panel(10, 50, 236, 180, '#ffb52a');
  panel(254, 50, 216, 180, '#ffb52a');
  const n = mixCount(M.f, M.a, M.b, site), id = canonId(M.f, M.a, M.b), rec = RECIPE_BY_ID[id], known = rec && b.known[id];
  const slotVal = (val, cnt) => '< ' + val + (cnt != null ? ' (' + cnt + ')' : '') + ' >';
  const items = [
    { label: 'SAFT', slot: 'f', val: slotVal(FRUITS[M.f].juice, mixHave('j:' + M.f, site)), hint: 'SAFT AUS DER TASCHE ODER DEN REGALEN HIER. < > = WECHSELN' },
    { label: 'ZUTAT 1', slot: 'a', val: slotVal(M.a ? INGREDIENTS[M.a].name : '-', M.a ? mixHave('i:' + M.a, site) : null), hint: 'ZUTATEN AUS TASCHE ODER REGALEN. KAUFEN IM GARTENCENTER.' },
    { label: 'ZUTAT 2', slot: 'b', val: slotVal(M.b ? INGREDIENTS[M.b].name : 'KEINE', M.b ? mixHave('i:' + M.b, site) : null), hint: 'MIT 2 ZUTATEN: MEHR WERT. MANCHE MISCHUNGEN SIND GEHEIMREZEPTE!' },
    { label: '1X MIXEN', disabled: n <= 0, act: () => doMix(1) },
    { label: 'ALLE MIXEN (' + n + ')', disabled: n <= 0, act: () => doMix(999) },
    { label: 'AUTO-REZEPT FÜR DEN MIXER', act: () => {
      if (!b.staff.mixer) { bzMsg('ERST EINEN MIXER EINSTELLEN (PERSONAL, AB RANG 7)', false); return; }
      b.recipe = id; persist(); bzMsg('DER MIXER MIXT JETZT: ' + (rec && !known ? 'DEINE GEHEIMMISCHUNG' : productName(id)));
    } },
    { label: 'REZEPTBUCH (' + RECIPES.filter((r) => b.known[r.id]).length + '/' + RECIPES.length + ')', act: () => { BZ.book = true; } },
    { label: 'ZURÜCK', act: () => enterHub() },
  ];
  for (const it of items) if (it.slot) {
    const list = it.slot === 'f' ? fruits : it.slot === 'a' ? ings : bOpts;
    it.act = () => { M[it.slot] = cycle(list, M[it.slot], 1); };
    it.prev = () => { M[it.slot] = cycle(list, M[it.slot], -1); };
  }
  const sel = listMenu('mixer', items, 30, 62, 20, { align: 'left', w: 105 });
  items.forEach((q, i) => { if (q.val) txt(q.val, 104, 63 + i * 20, { font: FS, color: i === sel ? '#ffe14d' : '#cccccc' }); });
  const it = items[sel];
  if (it && it.slot && uiActive()) {
    if (pressed.ArrowRight || pressed.KeyD) { it.act(); Sound.play('blip', true); }
    if (pressed.ArrowLeft || pressed.KeyA) { it.prev(); Sound.play('blip', true); }
  }
  const cx = 362;
  txt('ERGEBNIS', cx, 58, { font: FS, align: 'center', color: '#aaaaaa' });
  drawBottle(cx, 70, FRUITS[M.f].col, M.a, M.b, !!rec);
  const name = rec && !known ? '??? UNBEKANNTE MISCHUNG' : productName(id);
  wrap(name, 26).forEach((l, i) => txt(l, cx, 112 + i * 11, { align: 'center', color: rec ? (known ? '#ff9ad5' : '#ffe14d') : '#ffffff' }));
  txt('WERT: ' + (rec && !known ? '???' : productValue(id) + '€'), cx, 140, { font: FS, align: 'center', color: '#7dff7a' });
  const boosts = productBoosts(id).map((k) => BOOSTERS[k].name).join(' + ');
  txt('BOOSTER: ' + (rec && !known ? '???' : boosts || '-'), cx, 152, { font: FS, align: 'center', color: '#ffb52a' });
  if (rec && known) wrap('"' + rec.line + '"', 36).forEach((l, i) => txt(l, cx, 168 + i * 10, { font: FS, align: 'center', color: '#cccccc' }));
  else if (rec) txt('MIX ES, UM DAS REZEPT ZU ENTDECKEN!', cx, 168, { font: FS, align: 'center', color: '#ffe14d' });
  else if (M.b) txt('KEIN GEHEIMREZEPT. TROTZDEM LECKER.', cx, 168, { font: FS, align: 'center', color: '#888888' });
  if (b.recipe) txt('AUTO-REZEPT: ' + (RECIPE_BY_ID[b.recipe] && !b.known[b.recipe] ? '???' : productName(b.recipe)), cx, 212, { font: FS, align: 'center', color: b.staff.mixer ? '#7dff7a' : '#666666' });
  bizHint(items, sel, 236);
  bizFooter('W/S AUSWÄHLEN   < > ZUTAT WECHSELN   ENTER MIXEN   ESC ZURÜCK');
}
const ING_COL = ING_COLS;
// Saftflasche: Farbe = Frucht, Streifen = Zutaten, Glitzer = Geheimrezept
function drawBottle(x, y, col, a, b, special) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 7, y + 37, 16, 3);
  ctx.fillStyle = '#e01b3c'; ctx.fillRect(x - 3, y, 6, 4);
  ctx.fillStyle = 'rgba(220,240,255,0.85)'; ctx.fillRect(x - 2, y + 4, 4, 6); ctx.fillRect(x - 8, y + 10, 16, 28);
  ctx.fillStyle = col; ctx.fillRect(x - 7, y + 14, 14, 23);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 6, y + 15, 2, 20);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 8, y + 21, 16, 8);
  if (a) { ctx.fillStyle = ING_COL[a] || '#888'; ctx.fillRect(x - 6, y + 23, b ? 5 : 12, 4); }
  if (b) { ctx.fillStyle = ING_COL[b] || '#888'; ctx.fillRect(x + 1, y + 23, 5, 4); }
  if (special) for (let k = 0; k < 4; k++) { const a2 = T * 2 + k * TAU / 4; ctx.fillStyle = '#ffe14d'; ctx.fillRect(Math.round(x + Math.cos(a2) * 14), Math.round(y + 22 + Math.sin(a2) * 16), 2, 2); }
}
function doMix(max) {
  const M = BZ.mix; let got = '', k = 0;
  while (k < max) { const id = mixOne(M.f, M.a, M.b, BZ.site); if (!id) break; got = id; k++; }
  if (!k) { bzMsg(mixCount(M.f, M.a, M.b, BZ.site) > 0 ? 'TASCHE UND REGALE SIND VOLL!' : 'ES FEHLT SAFT ODER EINE ZUTAT!', false); return; }
  Sound.play('press'); persist();
  BZ.msg = k + 'X ' + productName(got) + ' GEMIXT!'; BZ.msgT = 1.8;
}
function bizRecipes() {
  bizHeader('REZEPTBUCH');
  const b = B();
  panel(10, 50, W - 20, 190, '#ff9ad5');
  RECIPES.forEach((r, i) => {
    const y = 56 + i * 14, known = b.known[r.id];
    const ingOk = ingUnlocked(r.a) && ingUnlocked(r.b) && fruitUnlocked(r.f);
    const parts = FRUITS[r.f].juice + ' + ' + INGREDIENTS[r.a].name + ' + ' + (known ? INGREDIENTS[r.b].name : '???');
    txt(known ? r.name : '???', 22, y, { font: FS, color: known ? '#ff9ad5' : '#777777' });
    txt(fitText(parts, 230), 170, y, { font: FS, color: known ? '#ffffff' : ingOk ? '#cccccc' : '#555555' });
    txt(known ? productValue(r.id) + '€' : ingOk ? '' : 'GESPERRT', W - 22, y, { font: FS, align: 'right', color: known ? '#7dff7a' : '#555555' });
  });
  txt('GEHEIMREZEPTE SIND 30% MEHR WERT UND GEBEN BEIDE BOOSTER FÜR DEN NÄCHSTEN EINSATZ.', W / 2, 232, { font: FS, align: 'center', color: '#cccccc' });
  bizFooter('ESC ZURÜCK ZUM MIXTISCH');
  if (uiActive() && stateT > 0.1 && (pressed.Enter || pressed.Space || mouse.pl)) BZ.book = false;
}

// ---------- Personal ----------
function bizStaff() {
  bizHeader('PERSONAL');
  const b = B();
  panel(10, 50, W - 20, 186, '#ff6fb5');
  const items = [];
  for (const k in STAFF) {
    const s = STAFF[k], ok = b.rank >= s.rank, max = ok ? s.max(b.rank) : 0, n = b.staff[k];
    items.push({ label: !ok ? s.name + ' - AB RANG ' + s.rank : s.name + ' (' + n + '/' + max + ')' + (n >= max ? '  VOLL' : '   ' + s.price + '€'), disabled: !ok || n >= max,
      hint: s.desc, act: () => bzBuy(s.price, () => { b.staff[k]++; }) });
  }
  items.push({ label: 'ZURÜCK', act: () => enterHub() });
  const sel = listMenu('staff', items, 26, 62, 18, { align: 'left', w: 210 });
  const lines = [
    'IN DER KASSE: ' + b.register + '€  (AN DER KASSE ABHOLEN ODER PER HANDY-BANK)',
    'VERKAUFT GESAMT: ' + b.sold + ' SÄFTE  -  VERDIENT: ' + b.earned + '€',
    'DAS PERSONAL ARBEITET MIT DEN REGALEN IN ALLEN DEINEN GRUNDSTÜCKEN.',
    save.beaten ? 'RUSSIAN HACKER BOI IST BESIEGT: KEIN SCHUTZGELD MEHR!' : 'RUSSIAN HACKER BOI KASSIERT 10% SCHUTZGELD (BISHER ' + b.totalCut + '€). BESIEG IHN!',
  ];
  lines.forEach((l, i) => txt(l, 26, 160 + i * 12, { font: FS, color: i === 3 ? '#ff6a6a' : '#ffffff' }));
  bizHint(items, sel, 222);
  bizFooter('ENTER/KLICK = EINSTELLEN   ESC ZURÜCK');
}
