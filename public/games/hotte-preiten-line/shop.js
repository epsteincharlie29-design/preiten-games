'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Kiosk: Perks, Startwaffen, Werkstatt, Hüte, Möbel
// =====================================================================
const PERKS = [
  { id: 'armor', name: 'KEVLARWESTE', prices: [3500, 12000], desc: ['FÄNGT PRO ETAGE 1 TREFFER AB.', 'STUFE 2: 2 TREFFER.', 'DER BESTE KAUF IM SPIEL.'] },
  { id: 'heartcap', name: 'EXTRA-LEBEN', prices: [3000, 8000, 18000], desc: ['+1 LEBEN AUF JEDER ETAGE.', 'NORMAL 5 LEBEN, BEIM BOSS 7.', 'STUFE 3: 8 LEBEN, BOSS 10.'] },
  { id: 'vexwave', name: 'VEX-WAVE', prices: [7500, 14000, 22000], desc: ['[V] = SCHOCKWELLE: SCHLEUDERT ALLE WEG.', 'WER GEGEN DIE WAND KNALLT, IST ERLEDIGT.', 'PAUSE: 14 S / 9 S / 6 S (STUFE 3 GRÖSSER)'] },
  { id: 'speed', name: 'TURBOSCHUHE', prices: [1000, 3000, 7000], desc: ['+8% LAUFTEMPO PRO STUFE.', 'SCHNELLER ALS KUGELN? NEIN.', 'ABER FAST.'] },
  { id: 'focus', name: 'ZEITLUPE', prices: [4000, 10000], desc: ['[E] = 3 SEKUNDEN ZEITLUPE.', 'STUFE 1: 1X PRO ETAGE', 'STUFE 2: 2X PRO ETAGE.'] },
  { id: 'ammo', name: 'DICKE TASCHEN', prices: [2000], desc: ['+50% MUNITION FÜR ALLE', 'AUFGEHOBENEN SCHUSSWAFFEN.'] },
  { id: 'finger', name: 'FINGERPISTOLE PRO', prices: [2500], desc: ['ABKLINGZEIT 3 STATT 5 SEKUNDEN.', 'GRÖSSERER KEGEL, MEHR REICHWEITE.'] },
  { id: 'ninja', name: 'NINJA-WURF', prices: [4500], desc: ['GEWORFENE WAFFEN SIND TÖDLICH.', 'AUCH DAS GUMMIHUHN.'] },
  { id: 'silencer', name: 'SCHALLDÄMPFER', prices: [2200], desc: ['DEINE SCHÜSSE LOCKEN NUR', 'HALB SO VIELE GEGNER AN.'] },
  { id: 'magnet', name: 'GELDMAGNET', prices: [1800], desc: ['GELD FLIEGT ZU DIR', 'UND IST 25% MEHR WERT.'] },
  { id: 'eagle', name: 'ADLERAUGE', prices: [3000], desc: ['ZEIGT DIE SICHTKEGEL', 'ALLER GEGNER AN.'] },
  { id: 'lucky', name: 'GLÜCKSPILZ', prices: [6000], desc: ['BESSERE CHANCEN IM CASINO.', 'RUSSIAN HACKER BOI HASST DAS.'] },
];
const WEAPON_PRICES = { pistol: 1200, nailgun: 1400, osaft: 1600, shovel: 1800, katana: 2000, crossbow: 2200, uzi: 2500, boomerang: 2600, shotgun: 3500, flamer: 5000, rifle: 6000, minigun: 9000 };
const HEART_PRICE = 500;
let shopTab = 0, shopMsg = '', shopMsgT = 0;

function shopBuy(price, onBuy) {
  if (save.money < price) { Sound.play('click'); shopMsg = 'ZU WENIG GELD! DU BRAUCHST ' + price + '€'; shopMsgT = 2; return; }
  save.money -= price; onBuy(); persist();
  Sound.play('cash'); shopMsg = 'GEKAUFT!'; shopMsgT = 1.5;
}
function screenShop(dt) {
  drawRoomBg();
  txt('KIOSK', W / 2, 6, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  moneyTag(W - 10, 10);
  const tabs = ['PERKS', 'WAFFEN', 'WERKSTATT', 'HÜTE', 'MÖBEL', 'TIERE'], NT = tabs.length;
  tabs.forEach((t, i) => {
    const x = 44 + i * 78, hov = Math.abs(mouse.x - x) < 38 && mouse.y > 26 && mouse.y < 40;
    if (hov && mouse.pl && uiActive()) { shopTab = i; Sound.play('blip', true); }
    txt(t, x, 30, { align: 'center', color: i === shopTab ? '#ffe14d' : '#888888' });
    if (i === shopTab) { ctx.fillStyle = '#ffe14d'; ctx.fillRect(x - 34, 41, 68, 1); }
  });
  if (uiActive()) {
    if (pressed.ArrowRight || pressed.KeyD) { shopTab = (shopTab + 1) % NT; Sound.play('blip', true); }
    if (pressed.ArrowLeft || pressed.KeyA) { shopTab = (shopTab + NT - 1) % NT; Sound.play('blip', true); }
  }
  shopTab = shopTab % NT;
  panel(10, 48, 250, 196, '#ff3fa4');
  panel(268, 48, 202, 196, '#3fd0ff');
  let items = [];
  if (shopTab === 0) {
    items = PERKS.map((pk) => {
      const lv = perk(pk.id), max = pk.prices.length, next = pk.prices[lv];
      return { label: pk.name + ' ' + '|'.repeat(lv) + '.'.repeat(max - lv) + (lv >= max ? '  MAX' : '  ' + next + '€'),
        color: lv >= max ? '#7dff7a' : save.money >= next ? '#ffffff' : '#aa7777',
        act: () => { if (lv >= max) { Sound.play('click'); return; } shopBuy(next, () => { save.perks[pk.id] = lv + 1; }); }, pk };
    });
  } else if (shopTab === 1) {
    save.weapons = save.weapons || {};
    items = Object.keys(WEAPON_PRICES).map((id) => {
      const own = save.weapons[id], eq = save.startWeapon === id;
      return { label: WEAPONS[id].name + (eq ? '  [AUSGERÜSTET]' : own ? '  [GEKAUFT]' : '  ' + WEAPON_PRICES[id] + '€'),
        color: eq ? '#7dff7a' : own ? '#7ff' : save.money >= WEAPON_PRICES[id] ? '#ffffff' : '#aa7777',
        act: () => { if (own) { save.startWeapon = eq ? '' : id; persist(); Sound.play('pickup'); } else shopBuy(WEAPON_PRICES[id], () => { save.weapons[id] = true; save.startWeapon = id; }); }, wid: id };
    });
  } else if (shopTab === 2) items = shopWorkshopItems();
  else if (shopTab === 3) {
    items = Object.keys(HATS).map((id) => {
      const own = save.hats[id], eq = save.hat === id, sp = HATS[id].special;
      return { label: HATS[id].name + (eq ? '  [AUF]' : own ? '  [GEKAUFT]' : sp ? '  (' + (HATS[id].how || 'SCHWER-MODUS') + ')' : '  ' + HATS[id].price + '€'), disabled: sp && !own,
        color: eq ? '#7dff7a' : own ? '#7ff' : save.money >= HATS[id].price ? '#ffffff' : '#aa7777',
        act: () => { if (own) { save.hat = id; persist(); Sound.play('pickup'); } else shopBuy(HATS[id].price, () => { save.hats[id] = true; save.hat = id; }); }, hat: id };
    });
  } else if (shopTab === 4) items = shopFurnitureItems();
  else items = shopPetItems();
  items.push({ label: 'ZURÜCK', act: () => enterHub() });
  const sel = listMenu('shop' + shopTab, items, 34, 58, shopTab === 0 ? 14 : shopTab === 3 ? 20 : 13.5, { align: 'left', w: 110, max: shopTab === 1 || shopTab === 2 ? 13 : 0 });
  const detail = items[sel];
  if (detail && detail.pk) {
    txt(detail.pk.name, 369, 58, { align: 'center', color: '#ffe14d' });
    detail.pk.desc.forEach((l, i) => txt(l, 278, 80 + i * 12, { font: FS, color: '#ffffff' }));
    txt('STUFE ' + perk(detail.pk.id) + '/' + detail.pk.prices.length, 278, 130, { font: FS, color: '#9ab8ff' });
    if (NET.mode === 'client' && NET.connected) txt('PERKS SIND NUR FÜR DICH.', 278, 146, { font: FS, color: '#66aaff' });
  } else if (detail && detail.wid) {
    txt(WEAPONS[detail.wid].name, 369, 58, { align: 'center', color: '#ffe14d' });
    ctx.save(); ctx.translate(369, 100); ctx.scale(3, 3); ctx.drawImage(weapSprite(detail.wid), -16, -8); ctx.restore();
    ['DU STARTEST JEDES LEVEL', 'MIT DIESER WAFFE.', 'GEKAUFT = KLICKEN ZUM', 'AN-/ABLEGEN.'].forEach((l, i) => txt(l, 278, 136 + i * 12, { font: FS, color: '#ffffff' }));
  } else if (detail && detail.gun) {
    txt(WEAPONS[detail.gun].name, 369, 58, { align: 'center', color: '#ffe14d' });
    ctx.save(); ctx.translate(369, 96); ctx.scale(3, 3); ctx.drawImage(weapSprite(detail.gun), -16, -8); ctx.restore();
    detail.mod.desc.forEach((l, i) => txt(l, 278, 132 + i * 12, { font: FS, color: i ? '#ffffff' : '#ffb52a' }));
    const on = MODS.filter((m) => wmod(detail.gun, m.id)).map((m) => m.name).join(', ');
    txt('EINGEBAUT: ' + (on || 'NICHTS'), 278, 176, { font: FS, color: '#7dff7a' });
    txt('GILT FÜR JEDE ' + WEAPONS[detail.gun].name + ', DIE DU HAST.', 278, 192, { font: FS, color: '#888888' });
  } else if (detail && detail.hat) {
    txt(HATS[detail.hat].name, 369, 58, { align: 'center', color: '#ffe14d' });
    ctx.drawImage(SPR.portC, 318, 76, 102, 154);
    drawHat(ctx, detail.hat, 318 + 7, 82, 6.2);
  } else if (detail && detail.pet) {
    const P = PETS[detail.pet];
    txt(P.name, 369, 58, { align: 'center', color: '#ffe14d' });
    ctx.save(); ctx.translate(369, 100); ctx.scale(4, 4); drawPetSprite(ctx, { kind: detail.pet, x: 0, y: 0, a: Math.sin(T) * 0.4, walkT: T * 0.4, biteT: 0, noFly: true }, false); ctx.restore();
    P.desc.forEach((l, i) => txt(l, 278, 130 + i * 12, { font: FS, color: '#ffffff' }));
    txt('HILFT DIR IN JEDEM EINSATZ UND', 278, 186, { font: FS, color: '#7dff7a' }); txt('STÖRT DIE POLIZEI IN DER STADT.', 278, 198, { font: FS, color: '#7dff7a' });
  } else if (detail && detail.furn) {
    txt(detail.furn.name, 369, 58, { align: 'center', color: '#ffe14d' });
    wrap(detail.furn.desc, 30).forEach((l, i) => txt(l, 278, 84 + i * 12, { font: FS, color: '#ffffff' }));
    txt('STEHT DANN BEI DIR ZUHAUSE.', 278, 124, { font: FS, color: '#7dff7a' });
    txt('TROPHÄEN VON BESIEGTEN BOSSEN', 278, 160, { font: FS, color: '#888888' });
    txt('KOMMEN AUTOMATISCH INS REGAL.', 278, 172, { font: FS, color: '#888888' });
  }
  if (shopMsgT > 0) { shopMsgT -= dt; txt(shopMsg, W / 2, H - 16, { align: 'center', color: shopMsg === 'GEKAUFT!' ? '#7dff7a' : '#ff6a6a' }); }
  else txt('<  >  KATEGORIE WECHSELN     ENTER/KLICK  KAUFEN', W / 2, H - 16, { font: FS, align: 'center', color: '#888888' });
  if (uiActive() && pressed.Escape) enterHub();
}
