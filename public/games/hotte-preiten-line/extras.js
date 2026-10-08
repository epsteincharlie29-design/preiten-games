'use strict';
// =====================================================================
//  DIE HOTTE PREITEN LINE - Erfolge (mit Geld-Belohnung) und Stadt-Stimmung
// =====================================================================
const ACHIEVEMENTS = [
  { id: 'job1', name: 'ERSTER AUFTRAG', desc: 'LEVEL 1 GESCHAFFT', pay: 200, ok: () => save.unlocked >= 1 },
  { id: 'half', name: 'HALBZEIT', desc: '8 LEVEL GESCHAFFT', pay: 1500, ok: () => save.unlocked >= 8 },
  { id: 'won', name: 'TEBLEEDD ZURÜCK', desc: 'RUSSIAN HACKER BOI BESIEGT', pay: 10000, ok: () => save.beaten },
  { id: 'kill500', name: 'AUFRÄUMER', desc: '500 GEGNER ERLEDIGT', pay: 1500, ok: () => save.stats.kills >= 500 },
  { id: 'juice10', name: 'SAFTLADEN', desc: '10 SÄFTE VERKAUFT', pay: 300, ok: () => B().sold >= 10 },
  { id: 'juice250', name: 'SAFT-KÖNIG', desc: '250 SÄFTE VERKAUFT', pay: 3000, ok: () => B().sold >= 250 },
  { id: 'recipe3', name: 'GEHEIMNISKRÄMER', desc: '3 GEHEIMREZEPTE ENTDECKT', pay: 800, ok: () => Object.keys(B().known).length >= 3 },
  { id: 'recipeAll', name: 'MEISTERMIXER', desc: 'ALLE GEHEIMREZEPTE', pay: 6000, ok: () => Object.keys(B().known).length >= RECIPES.length },
  { id: 'green', name: 'GRÜNER DAUMEN', desc: 'GEWÄCHSHAUS GEKAUFT', pay: 1000, ok: () => ownsSite('greenhouse') },
  { id: 'street', name: 'STRASSENVERKÄUFER', desc: '20 SÄFTE AUF DER STRASSE', pay: 700, ok: () => (save.stats.street || 0) >= 20 },
  { id: 'thief', name: 'LANGE FINGER', desc: '500€ GEKLAUT', pay: 500, ok: () => (save.stats.stolen || 0) >= 500 },
  { id: 'escape', name: 'ENTKOMMEN', desc: 'DIE POLIZEI ABGEHÄNGT', pay: 300, ok: () => (save.stats.escapes || 0) >= 1 },
  { id: 'sport', name: 'RASER', desc: 'SPORTWAGEN GEKAUFT', pay: 1000, ok: () => !!(save.vehicles && save.vehicles.sport) },
  { id: 'arena10', name: 'ARENA-HELD', desc: 'WELLE 10 IN DER ARENA', pay: 1500, ok: () => (save.arenaBest || 0) >= 10 },
  { id: 'casino', name: 'GLÜCKSPILZ', desc: '5000€ IM CASINO GEWONNEN', pay: 500, ok: () => (save.stats.casinoWon || 0) >= 5000 },
  { id: 'rich', name: 'SAFT-MILLIONÄR', desc: '100.000€ AUF DEM KONTO', pay: 5000, ok: () => save.money >= 100000 },
  { id: 'apt1', name: 'EIGENE BUDE', desc: 'ERSTE WOHNUNG GEKAUFT', pay: 500, ok: () => aptCount() >= 1 },
  { id: 'aptAll', name: 'IMMOBILIEN-HAI', desc: 'ALLE 4 WOHNUNGEN GEKAUFT', pay: 15000, ok: () => aptCount() >= APARTMENTS.length },
  { id: 'bosses', name: 'BOSS-JÄGER', desc: 'ALLE 10 BOSSE VOR DEM FINALE', pay: 8000, ok: () => save.unlocked >= 18 },
  { id: 'rocket', name: 'RAKETENMANN', desc: 'RAKETENWERFER GEKAUFT', pay: 800, ok: () => !!(save.weapons && save.weapons.rocket) },
  { id: 'pet', name: 'BESTER FREUND', desc: 'EIN HAUSTIER GEKAUFT', pay: 500, ok: () => Object.keys(save.pets || {}).length > 0 },
  { id: 'bounty5', name: 'KOPFGELDJÄGER', desc: '5 KOPFGELDER KASSIERT', pay: 2000, ok: () => (save.stats.bounties || 0) >= 5 },
  { id: 'lil10', name: 'ALTER HASE', desc: 'LIL-LEVEL 10 ERREICHT', pay: 3000, ok: () => ((save.lil && save.lil.lv) || 1) >= 10 },
  { id: 'gold25', name: 'GOLDGRÄBER', desc: 'ALLE 25 GOLDENEN ORANGEN', pay: 5000, ok: () => Object.keys(save.gold || {}).length >= 25 },
];
function checkAchievements() {
  if (NET.mode === 'client' && NET.connected) return;   // im Koop zählt der Host
  save.achieved = save.achieved || {};
  for (const a of ACHIEVEMENTS) {
    if (save.achieved[a.id]) continue;
    let ok = false;
    try { ok = a.ok(); } catch (e) { ok = false; }
    if (!ok) continue;
    save.achieved[a.id] = true; save.money += a.pay; persist();
    bizNotify('ERFOLG: ' + a.name + '! +' + a.pay + '€', '#ffd23f');
    Sound.play('levelup');
  }
}
let achPage = 0;   // Seite der Erfolge (24 pro Seite)
function drawAchievements() {
  ctx.fillStyle = 'rgba(10,0,20,0.94)'; ctx.fillRect(0, 0, W, H);
  const got = (a) => save.achieved && save.achieved[a.id];
  const per = 24, pages = Math.max(1, Math.ceil(ACHIEVEMENTS.length / per));
  if (pages > 1 && uiActive()) {
    if (pressed.KeyD || pressed.ArrowRight) { achPage = (achPage + 1) % pages; Sound.play('blip', true); }
    if (pressed.KeyA || pressed.ArrowLeft) { achPage = (achPage + pages - 1) % pages; Sound.play('blip', true); }
  }
  achPage = Math.min(achPage, pages - 1);
  txt('ERFOLGE ' + ACHIEVEMENTS.filter(got).length + '/' + ACHIEVEMENTS.length + (pages > 1 ? '  (' + (achPage + 1) + '/' + pages + ')' : ''), W / 2, 8, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  ACHIEVEMENTS.slice(achPage * per, achPage * per + per).forEach((a, i) => {
    const ok = got(a), x = 16 + (i % 2) * 228, y = 28 + Math.floor(i / 2) * 18;
    panel(x, y, 220, 17, ok ? '#ffd23f' : '#444455');
    txt(a.name + (ok ? ' - GESCHAFFT!' : ''), x + 5, y + 1, { font: FS, color: ok ? '#ffd23f' : '#888888' });
    txt(a.desc + '  (+' + a.pay + '€)', x + 5, y + 9, { font: FS, color: ok ? '#ffffff' : '#666677' });
  });
  txt(pages > 1 ? '[A/D] BLÄTTERN   [ESC] ZURÜCK' : '[ESC] ZURÜCK', W / 2, H - 10, { font: FS, align: 'center', color: '#888888' });
}

// ---------- Tag & Nacht (ein Tag = 8 Minuten) und Regen ----------
const DAY_LEN = 480;
function dayHour() { return (((save.biz && save.biz.clock) || 0) / DAY_LEN * 24 + 8) % 24; }
function nightAmount() { const h = dayHour(); return h >= 21 || h < 5 ? 1 : h >= 19 ? (h - 19) / 2 : h < 7 ? (7 - h) / 2 : 0; }
function cityClock() { const m = Math.floor(dayHour() * 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
function updateWeather(dt) { C.rain = false; }   // Regen gibt es nicht mehr (sah nicht gut aus)
function drawCityAtmosphere() {
  const n = nightAmount();
  if (n > 0) {
    ctx.fillStyle = `rgba(8,10,40,${0.5 * n})`; ctx.fillRect(0, 0, W, H);
    if (CITY.lamps) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y] of CITY.lamps) {
        const sx = x - C.cam.x + W / 2, sy = y - C.cam.y + H / 2;
        if (sx < -50 || sy < -50 || sx > W + 50 || sy > H + 50) continue;
        ctx.fillStyle = `rgba(255,170,80,${0.09 * n})`; ctx.beginPath(); ctx.arc(sx, sy, 42, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,220,140,${0.12 * n})`; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, TAU); ctx.fill();
      }
      if (C.inCar) { const a = C.car.a, cx = C.car.x - C.cam.x + W / 2, cy = C.car.y - C.cam.y + H / 2; ctx.fillStyle = `rgba(255,240,180,${0.18 * n})`; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 110, a - 0.4, a + 0.4); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    gfxNight(n);
  }

}
