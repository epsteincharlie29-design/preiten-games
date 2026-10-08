'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Gegenstände, Tasche mit Slots, Regale & Lager
//  Schlüssel: 'f:orange' Frucht   's:orange' Kerne   'i:zucker' Zutat
//             'j:orange+zucker' Saft   'e:pot' Gerät zum Aufstellen
//  Ein Slot = { k, n }. Jede Sorte stapelt sich nur bis zu einer Grenze.
// =====================================================================
function itemStack(k) {
  switch (k[0]) {
    case 'f': return 20;
    case 's': return 30;
    case 'i': return 20;
    case 'j': return 10;
    case 'e': { const E = EQUIP[k.slice(2)]; return (E && E.stack) || 1; }
  }
  return 1;
}
function itemName(k) {
  const id = k.slice(2);
  switch (k[0]) {
    case 'f': return FRUITS[id] ? FRUITS[id].name : id;
    case 's': return FRUITS[id] ? FRUITS[id].name + '-KERNE' : id;
    case 'i': return INGREDIENTS[id] ? INGREDIENTS[id].name : id;
    case 'j': return productName(id);
    case 'e': return EQUIP[id] ? EQUIP[id].name : id;
  }
  return k;
}
function itemValue(k) {
  const id = k.slice(2);
  switch (k[0]) {
    case 'j': return productPrice(id);
    case 'f': return Math.round(FRUITS[id].value / 4);
    case 's': return Math.round(FRUITS[id].seed / 2);
    case 'i': return Math.round(INGREDIENTS[id].price / 2);
    case 'e': return Math.round(EQUIP[id].price / 2);
  }
  return 0;
}
function itemDesc(k) {
  const id = k.slice(2);
  switch (k[0]) {
    case 'f': return '3 FRÜCHTE = 1 SAFT AN EINER PRESSE. STAPEL BIS 20.';
    case 's': return 'IN EINEN KÜBEL PFLANZEN ([E] AM KÜBEL). STAPEL BIS 30.';
    case 'i': return 'AM MIXTISCH MIT SAFT MISCHEN: WERT X' + INGREDIENTS[id].mult + '. BOOSTER: ' + BOOSTERS[INGREDIENTS[id].boost].name + '.';
    case 'j': { const bo = productBoosts(id).map((q) => BOOSTERS[q].name).join(' + '); return 'WERT ' + productValue(id) + '€, DEIN PREIS ' + productPrice(id) + '€.' + (bo ? ' BOOSTER: ' + bo + ' (TASTE B).' : ''); }
    case 'e': return EQUIP[id].desc + ' AUSWÄHLEN (ZAHLENTASTE) UND IN DEINEM GRUNDSTÜCK HINKLICKEN.';
  }
  return '';
}
function itemColor(k) {
  const id = k.slice(2);
  if (k[0] === 'f' || k[0] === 's') return FRUITS[id] ? FRUITS[id].col : '#fff';
  if (k[0] === 'i') return ING_COLS[id] || '#fff';
  if (k[0] === 'j') return RECIPE_BY_ID[id] ? '#ff9ad5' : FRUITS[productParts(id)[0]].col;
  return '#cccccc';
}

// ---------- Slot-Behälter ----------
function slotsCount(S, k) { let n = 0; for (const s of S) if (s && s.k === k) n += s.n; return n; }
function slotsRoom(S, k) { const st = itemStack(k); let n = 0; for (const s of S) { if (!s) n += st; else if (s.k === k) n += st - s.n; } return n; }
function slotsAdd(S, k, n) {
  const st = itemStack(k); let left = n;
  for (const s of S) if (left > 0 && s && s.k === k && s.n < st) { const a = Math.min(st - s.n, left); s.n += a; left -= a; }
  for (let i = 0; i < S.length && left > 0; i++) if (!S[i]) { const a = Math.min(st, left); S[i] = { k, n: a }; left -= a; }
  return n - left;
}
function slotsTake(S, k, n) {
  let left = n;
  for (let i = S.length - 1; i >= 0 && left > 0; i--) { const s = S[i]; if (s && s.k === k) { const a = Math.min(s.n, left); s.n -= a; left -= a; if (s.n <= 0) S[i] = null; } }
  return n - left;
}
function slotsKeys(S, t) { const out = []; for (const s of S) if (s && (!t || s.k[0] === t) && !out.includes(s.k)) out.push(s.k); return out; }
const slotsEmpty = (S) => S.every((s) => !s);
const slotsUsed = (S) => S.filter((s) => s).length;
// einen Slot (ganz oder 1 Stück) in einen anderen Behälter schieben
function slotMove(from, i, to, one) {
  const s = from[i];
  if (!s) return 0;
  const n = slotsAdd(to, s.k, one ? 1 : s.n);
  s.n -= n; if (s.n <= 0) from[i] = null;
  return n;
}

// ---------- Tasche ----------
const bag = () => B().inv;
const bagJuiceCount = () => bag().reduce((a, s) => a + (s && s.k[0] === 'j' ? s.n : 0), 0);
const bagHasJuice = () => bagJuiceCount() > 0;

// ---------- Lager: Regale + Lieferkisten deiner Grundstücke ----------
function shelfConts(site) { const out = []; for (const o of B().eq) if (o.slots && ownsSite(o.s) && (!site || o.s === site)) out.push(o.slots); return out; }
function storeConts(site) {
  const out = shelfConts(site), bx = B().boxes || {};
  for (const s in bx) if (ownsSite(s) && (!site || s === site)) out.push(bx[s]);
  return out;
}
function storeCount(k, site) { let n = 0; for (const S of storeConts(site)) n += slotsCount(S, k); return n; }
function storeRoom(k, site) { let n = 0; for (const S of shelfConts(site)) n += slotsRoom(S, k); return n; }
function storeAdd(k, n, site) {
  let left = n;
  if (site) for (const S of shelfConts(site)) { if (left <= 0) break; left -= slotsAdd(S, k, left); }
  for (const S of shelfConts()) { if (left <= 0) break; left -= slotsAdd(S, k, left); }
  return n - left;
}
function storeTake(k, n, site) { let left = n; for (const S of storeConts(site)) { if (left <= 0) break; left -= slotsTake(S, k, left); } return n - left; }
function storeKeys(t, site) { const out = []; for (const S of storeConts(site)) for (const s of S) if (s && s.k[0] === t && !out.includes(s.k)) out.push(s.k); return out; }
function storeJuiceCount(site) { let n = 0; for (const S of storeConts(site)) for (const s of S) if (s && s.k[0] === 'j') n += s.n; return n; }
function storeSlotInfo(site) { let used = 0, total = 0; for (const S of shelfConts(site)) { total += S.length; used += slotsUsed(S); } return { used, total }; }

// ---------- Symbole (12x12) ----------
function drawItemIcon(g, k, x, y) {
  const id = k.slice(2), c = itemColor(k);
  x = Math.round(x); y = Math.round(y);
  switch (k[0]) {
    case 'f':
      pxEll(g, x + 6, y + 7, 5, 5, '#5a2a00'); pxEll(g, x + 6, y + 7, 4, 4, c);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 4, y + 5, 2, 2);
      g.fillStyle = '#3a9a3a'; g.fillRect(x + 6, y + 1, 3, 2); g.fillStyle = '#5a3a1a'; g.fillRect(x + 6, y + 2, 1, 2);
      break;
    case 's':
      g.fillStyle = '#5a3a1a'; g.fillRect(x + 2, y + 2, 9, 10); g.fillStyle = '#c8a070'; g.fillRect(x + 3, y + 3, 7, 8);
      g.fillStyle = '#7a5a30'; g.fillRect(x + 4, y + 1, 5, 2);
      pxEll(g, x + 6, y + 7, 2, 2, c);
      break;
    case 'i':
      g.fillStyle = '#ddeeff'; g.fillRect(x + 3, y + 3, 7, 9); g.fillStyle = c; g.fillRect(x + 4, y + 6, 5, 5);
      g.fillStyle = '#8a5a2a'; g.fillRect(x + 3, y + 1, 7, 2);
      break;
    case 'j': {
      const [f, a, b2] = productParts(id);
      g.fillStyle = 'rgba(220,240,255,0.9)'; g.fillRect(x + 5, y, 3, 3); g.fillRect(x + 3, y + 3, 7, 9);
      g.fillStyle = FRUITS[f].col; g.fillRect(x + 4, y + 5, 5, 6);
      g.fillStyle = '#e01b3c'; g.fillRect(x + 5, y, 3, 1);
      if (a) { g.fillStyle = ING_COLS[a] || '#fff'; g.fillRect(x + 4, y + 7, b2 ? 2 : 5, 2); }
      if (b2) { g.fillStyle = ING_COLS[b2] || '#fff'; g.fillRect(x + 7, y + 7, 2, 2); }
      if (RECIPE_BY_ID[id]) { g.fillStyle = '#ffe14d'; g.fillRect(x + 10, y + 1, 2, 2); g.fillRect(x, y + 9, 2, 2); }
      break;
    }
    case 'e': drawEquipIcon(g, id, x, y); break;
  }
}
// ein Slot-Kästchen mit Symbol + Anzahl
function drawSlot(g, s, x, y, sz, sel, hov) {
  g.fillStyle = sel ? 'rgba(255,225,77,0.25)' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.55)';
  g.fillRect(x, y, sz, sz);
  g.strokeStyle = sel ? '#ffe14d' : hov ? '#ffffff' : '#555566'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, sz - 1, sz - 1);
  if (!s) return;
  drawItemIcon(g, s.k, x + (sz - 12) / 2, y + (sz - 12) / 2 - (sz > 16 ? 2 : 0));
  if (s.n > 1) txt(String(s.n), x + sz - 2, y + sz - 9, { g, font: FS, align: 'right', color: '#ffffff' });
}
// Raster mit Slots; gibt den Slot unter der Maus zurück (-1 = keiner)
function drawSlotGrid(S, x, y, cols, sz, sel) {
  let hov = -1;
  S.forEach((s, i) => {
    const sx = x + (i % cols) * (sz + 2), sy = y + Math.floor(i / cols) * (sz + 2);
    const h = mouse.x >= sx && mouse.x < sx + sz && mouse.y >= sy && mouse.y < sy + sz;
    if (h) hov = i;
    drawSlot(ctx, s, sx, sy, sz, i === sel, h);
  });
  return hov;
}

// ---------- Lager-Ansicht: Tasche <-> Regal / Kühlschrank / Lieferkiste ----------
function openStore(slots, title, extra) {
  C.store = Object.assign({ slots, title, side: 0, i: 0, at: T }, extra || {});
  Sound.play('door');
}
function drawStore() {
  const St = C.store, S = bag(), R = St.slots;
  ctx.fillStyle = 'rgba(6,4,16,0.92)'; ctx.fillRect(0, 0, W, H);
  txt(St.title, W / 2, 8, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  panel(8, 30, 222, 150, '#ff9a1a'); panel(240, 30, 232, 150, '#3fd0ff');
  txt('TASCHE (' + slotsUsed(S) + '/' + S.length + ')', 18, 36, { font: FS, color: '#ffb52a' });
  txt(St.title + ' (' + slotsUsed(R) + '/' + R.length + ')', 250, 36, { font: FS, color: '#7ff' });
  const hb = drawSlotGrid(S, 18, 50, 7, 26, St.side === 0 ? St.i : -1);
  const hr = drawSlotGrid(R, 250, 50, 8, 26, St.side === 1 ? St.i : -1);
  if (hb >= 0 && (mouse.moved || mouse.pl || mouse.pr)) { St.side = 0; St.i = hb; }
  if (hr >= 0 && (mouse.moved || mouse.pl || mouse.pr)) { St.side = 1; St.i = hr; }
  const on = uiActive() && T - St.at > 0.12;
  const cur = St.side === 0 ? S : R, other = St.side === 0 ? R : S, cols = St.side === 0 ? 7 : 8;
  if (on) {
    if (pressed.ArrowRight || pressed.KeyD) { if (St.side === 0 && St.i % 7 === 6) { St.side = 1; St.i = 0; } else St.i = Math.min(cur.length - 1, St.i + 1); }
    if (pressed.ArrowLeft || pressed.KeyA) { if (St.side === 1 && St.i % 8 === 0) { St.side = 0; St.i = 0; } else St.i = Math.max(0, St.i - 1); }
    if (pressed.ArrowDown || pressed.KeyS) St.i = Math.min(cur.length - 1, St.i + cols);
    if (pressed.ArrowUp || pressed.KeyW) St.i = Math.max(0, St.i - cols);
    if (pressed.Tab) { St.side = 1 - St.side; St.i = 0; }
    const clickSlot = (hb >= 0 || hr >= 0);
    if (pressed.Enter || pressed.Space || (mouse.pl && clickSlot)) moveSel(St, cur, other, false);
    if (pressed.KeyR || (mouse.pr && clickSlot)) moveSel(St, cur, other, true);
    if (pressed.KeyB) { const s = cur[St.i]; if (s && s.k[0] === 'j' && takeBooster(s.k.slice(2))) { cityMsg('BOOSTER EINGEPACKT: ' + boosterNames() + '!', 2.5); Sound.play('pickup'); } else Sound.play('click'); }
  }
  // Infos zum gewählten Slot
  const s = (St.side === 0 ? S : R)[St.i];
  panel(8, 186, 464, 42, '#888899');
  if (s) {
    txt(s.n + 'X ' + itemName(s.k), 18, 192, { color: itemColor(s.k) });
    txt(fitText(itemDesc(s.k), 448), 18, 206, { font: FS, color: '#cccccc' });
    txt('WERT: ' + itemValue(s.k) + '€ / STÜCK', 18, 216, { font: FS, color: '#7dff7a' });
  } else txt('LEERER PLATZ', 18, 196, { font: FS, color: '#888888' });
  // Knöpfe
  const items = [
    { label: 'ALLES EINLAGERN', act: () => { let n = 0; for (let i = 0; i < S.length; i++) if (S[i] && S[i].k[0] !== 'e') n += slotMove(S, i, R, false); bzToast(n ? n + ' SACHEN EINGELAGERT' : 'NICHTS PASST REIN'); } },
    { label: 'ALLES NEHMEN', act: () => { let n = 0; for (let i = 0; i < R.length; i++) n += slotMove(R, i, S, false); bzToast(n ? n + ' SACHEN GENOMMEN' : 'TASCHE VOLL ODER LEER'); } },
    { label: 'ZURÜCK', act: () => { C.store = null; persist(); } },
  ];
  const bx = [70, 240, 400];
  items.forEach((it, i) => {
    const w = textWidth(it.label, '8px ' + FB) + 12, x = bx[i] - w / 2, y = 234, hov = mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + 14;
    panel(x, y, w, 14, hov ? '#ffe14d' : '#555566');
    txt(it.label, bx[i], y + 3, { align: 'center', color: hov ? '#ffe14d' : '#ffffff' });
    if (hov && mouse.pl && on) { Sound.play('select'); it.act(); }
  });
  txt(St.toast && T - St.toastAt < 1.6 ? St.toast : 'KLICK = GANZEN STAPEL  RECHTSKLICK/R = 1 STÜCK  B = BOOSTER  ESC = ZU', W / 2, H - 14, { font: FS, align: 'center', color: St.toast && T - St.toastAt < 1.6 ? '#7dff7a' : '#888888' });
  if (on && pressed.Escape) { C.store = null; persist(); }
}
function bzToast(t) { if (C.store) { C.store.toast = t; C.store.toastAt = T; } }
function moveSel(St, cur, other, one) {
  const n = slotMove(cur, St.i, other, one);
  if (n) { Sound.play('pickup'); persist(); } else Sound.play('click');
  if (!n && cur[St.i]) bzToast('KEIN PLATZ MEHR!');
}

// ---------- Inventar (Taste I) ----------
function drawInventory() {
  const b = B(), S = bag();
  ctx.fillStyle = 'rgba(6,4,16,0.92)'; ctx.fillRect(0, 0, W, H);
  txt('INVENTAR', W / 2, 8, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  panel(8, 30, 252, 214, '#ff9a1a');
  txt('TASCHE ' + slotsUsed(S) + '/' + S.length + ' PLÄTZE', 18, 36, { color: slotsUsed(S) >= S.length ? '#ff6a6a' : '#ffe14d' });
  C.invSel = clamp(C.invSel || 0, 0, S.length - 1);
  const hov = drawSlotGrid(S, 18, 52, 7, 30, C.invSel);
  if (hov >= 0 && (mouse.moved || mouse.pl)) C.invSel = hov;
  const on = uiActive() && T - (C.invAt || 0) > 0.1;
  if (on) {
    if (pressed.ArrowRight || pressed.KeyD) C.invSel = Math.min(S.length - 1, C.invSel + 1);
    if (pressed.ArrowLeft || pressed.KeyA) C.invSel = Math.max(0, C.invSel - 1);
    if (pressed.ArrowDown || pressed.KeyS) C.invSel = Math.min(S.length - 1, C.invSel + 7);
    if (pressed.ArrowUp || pressed.KeyW) C.invSel = Math.max(0, C.invSel - 7);
  }
  const s = S[C.invSel];
  if (s) {
    txt(fitText(s.n + 'X ' + itemName(s.k), 232), 18, 124, { color: itemColor(s.k) });
    wrap(itemDesc(s.k), 44).slice(0, 4).forEach((l, i) => txt(l, 18, 138 + i * 10, { font: FS, color: '#cccccc' }));
    txt('WERT: ' + itemValue(s.k) * s.n + '€', 18, 182, { font: FS, color: '#7dff7a' });
    txt('[E] IN DIE HAND NEHMEN' + (s.k[0] === 'j' && productBoosts(s.k.slice(2)).length ? '   [B] BOOSTER' : '') + '   [X] WEGWERFEN', 18, 196, { font: FS, color: '#7ff' });
    if (on && (pressed.KeyE || (mouse.pl && hov === C.invSel && hov >= 0 && C.invClickT && T - C.invClickT < 0.35))) { C.hot = C.invSel; C.inv = false; Sound.play('select'); cityMsg(itemName(s.k) + ' IN DER HAND.' + (s.k[0] === 'e' ? ' JETZT IN DEINEM GRUNDSTÜCK HINKLICKEN!' : ''), 3); }
    if (on && mouse.pl && hov >= 0) C.invClickT = T;
    if (on && pressed.KeyB && s.k[0] === 'j') { if (takeBooster(s.k.slice(2))) { Sound.play('pickup'); cityMsg('BOOSTER EINGEPACKT: ' + boosterNames() + '!', 2.5); } else Sound.play('click'); }
    if (on && pressed.KeyX) {
      if (C.dropAsk === C.invSel && T - C.dropAskT < 2) { S[C.invSel] = null; C.dropAsk = -1; Sound.play('swoosh'); persist(); }
      else { C.dropAsk = C.invSel; C.dropAskT = T; Sound.play('click'); }
    }
    if (C.dropAsk === C.invSel && T - C.dropAskT < 2) txt('NOCHMAL [X] = WIRKLICH WEGWERFEN!', 18, 208, { font: FS, color: '#ff6a6a' });
  } else txt('LEERER PLATZ', 18, 130, { font: FS, color: '#888888' });
  txt('TASCHE VOLL? REGALE AUFSTELLEN (GARTENCENTER: GERÄTE)', 18, 226, { font: FS, color: '#888888' });
  // rechte Seite: Infos über Lil
  panel(268, 30, 204, 214, '#3fd0ff');
  ctx.drawImage(SPR.miniC, 278, 38);
  if (save.hat !== 'none') drawHat(ctx, save.hat, 280, 39.5, 1.6);
  txt('LIL PREITNER', 308, 44, { font: FS, color: '#ffffff' });
  const si = storeSlotInfo();
  const info = [
    ['KONTO', save.money + '€', '#7dff7a'],
    ['AUFTRAG', Math.min(save.unlocked + 1, LEVELS.length) + '/' + LEVELS.length, '#ff9ad5'],
    ['SAFT-RANG', b.rank + ': ' + bizRankName(), '#ffe14d'],
    ['SÄFTE IM LAGER', storeJuiceCount() + ' (REGALE ' + si.used + '/' + si.total + ')', '#cccccc'],
    ['GRUNDSTÜCKE', Object.keys(SITES).filter(ownsSite).length + '/' + Object.keys(SITES).length, '#ffb52a'],
    ['GERÄTE AUFGESTELLT', b.eq.length, '#ffb52a'],
    ['FAHRZEUG', curVehicle().name, '#3fd0ff'],
    ['WAFFE IN DER STADT', C.wpn ? WEAPONS[C.wpn].name : 'FÄUSTE', '#ff6a6a'],
    ['BOOSTER', boosterNames() || '-', '#ffb52a'],
    ['FAHNDUNG', C.wanted ? C.wanted + ' STERNE' : 'KEINE', C.wanted ? '#ff6a6a' : '#7dff7a'],
    ['SAFT-QUALITÄT', gradeText(), '#ff9ad5'],
    ['STAMMKUNDEN', Object.keys(b.regulars || {}).length, '#66ffff'],
    ['IMMOBILIEN', PROPERTIES.filter((q) => ownsProp(q.id)).length + ' (+' + rentPerMin() + '€/MIN)', '#ffd23f'],
  ];
  info.forEach(([k, v, c], i) => { txt(k, 278, 62 + i * 13, { font: FS, color: '#888888' }); txt(fitText(String(v), 104), 464, 62 + i * 13, { font: FS, align: 'right', color: c }); });
  txt('[I] ODER [ESC] SCHLIESSEN', W / 2, H - 14, { font: FS, align: 'center', color: '#888888' });
  if (on && (pressed.KeyI || pressed.Escape)) C.inv = false;
}

// ---------- Schnellleiste unten (Zahlentasten / Mausrad) ----------
const HOT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
function updateHotbar() {
  const S = bag();
  if (C.hot == null) C.hot = -1;
  HOT_KEYS.forEach((k, i) => { if (pressed[k] && i < S.length) { C.hot = C.hot === i ? -1 : i; Sound.play('blip', true); } });
  if (mouse.wheel && !C.inCar) {
    const n = S.length; let i = C.hot < 0 ? (mouse.wheel > 0 ? -1 : 0) : C.hot;
    i = ((i + Math.sign(mouse.wheel)) % n + n) % n;
    C.hot = i; Sound.play('blip', true);
  }
  if (C.hot >= S.length) C.hot = -1;
}
const heldItem = () => (C && C.hot >= 0 ? bag()[C.hot] : null);
function drawHotbar() {
  const S = bag(), sz = 15, n = S.length, w = n * (sz + 1) - 1, x0 = Math.round(W / 2 - w / 2), y0 = H - 19;
  S.forEach((s, i) => drawSlot(ctx, s, x0 + i * (sz + 1), y0, sz, i === C.hot, false));
  for (let i = 0; i < Math.min(n, 10); i++) txt(String((i + 1) % 10), x0 + i * (sz + 1) + 1, y0 - 1, { font: FS, color: 'rgba(255,255,255,0.45)', outline: '' });
  const h = heldItem();
  if (h) txt(fitText(h.n + 'X ' + itemName(h.k) + (h.k[0] === 'e' && !(siteHere() && ownsSite(siteHere())) ? ' - IN DEINEM GRUNDSTÜCK AUFSTELLEN' : ''), 300), W / 2, y0 - 10, { font: FS, align: 'center', color: itemColor(h.k) });
}
