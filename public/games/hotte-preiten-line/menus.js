'use strict';
// =====================================================================
//  LIL PREITNER - Menüs: Titel, Steuerung, Anleitung, Dialoge,
//  Levelkarte, Pause, Levelende, Sieg
// =====================================================================
const MENUSEL = {}, MENUOFF = {};
const uiActive = () => fadeDir !== 1;

// Liste mit Tastatur + Maus. items: {label, act, disabled, color}
// o.max = höchstens so viele Zeilen zeigen (dann wird gescrollt, auch mit dem Mausrad)
function listMenu(id, items, cx, y0, step, o = {}) {
  let sel = MENUSEL[id] || 0;
  if (sel >= items.length) sel = 0;
  const on = uiActive() && !o.inactive;
  if (on) {
    if (pressed.KeyW || pressed.ArrowUp) { sel = (sel + items.length - 1) % items.length; Sound.play('blip', true); }
    if (pressed.KeyS || pressed.ArrowDown) { sel = (sel + 1) % items.length; Sound.play('blip', true); }
  }
  const rows = o.max && items.length > o.max ? o.max : items.length;
  let off = rows < items.length ? MENUOFF[id] || 0 : 0;
  if (rows < items.length) {
    if (on && mouse.wheel) { off += mouse.wheel; off = clamp(off, 0, items.length - rows); sel = clamp(sel, off, off + rows - 1); }
    if (sel < off) off = sel;
    if (sel >= off + rows) off = sel - rows + 1;
    off = clamp(off, 0, items.length - rows);
  }
  let clicked = -1;
  const halfW = o.w || 130;
  for (let r = 0; r < rows; r++) {
    const i = off + r, y = y0 + r * step;
    const hov = mouse.y >= y - step / 2 + 4 && mouse.y < y + step / 2 + 4 && (o.align === 'left' ? mouse.x > cx - 16 && mouse.x < cx + halfW * 2 : Math.abs(mouse.x - cx) < halfW);
    if (hov && on && (mouse.moved || mouse.pl) && sel !== i) { sel = i; Sound.play('blip', true); }
    if (hov && on && mouse.pl) clicked = i;
  }
  if (on && (pressed.Enter || pressed.Space)) clicked = sel;
  MENUSEL[id] = sel; MENUOFF[id] = off;
  for (let r = 0; r < rows; r++) {
    const i = off + r, it = items[i], y = y0 + r * step, s = i === sel;
    const col = it.disabled ? '#666666' : s ? (j) => neon(j) : (it.color || '#ffffff');
    txt(it.label, cx, y, { align: o.align || 'center', size: o.size || 8, font: o.font, color: col, wave: s && !it.disabled ? (o.font ? 1 : 2) : 0 });
    if (s) {
      const w = textWidth(it.label, (o.size || 8) + 'px ' + (o.font || FB));
      const hx = o.align === 'left' ? cx - 14 : cx - w / 2 - 14;
      drawHandPointing(ctx, hx + Math.sin(T * 8) * 2, y + (o.size || 8) / 2, 0, false);
    }
  }
  // Scroll-Pfeile
  if (rows < items.length) {
    const ax = o.align === 'left' ? cx - 22 : cx - halfW;
    ctx.fillStyle = '#ffe14d';
    if (off > 0) { ctx.beginPath(); ctx.moveTo(ax, y0 - 2); ctx.lineTo(ax + 4, y0 - 7); ctx.lineTo(ax + 8, y0 - 2); ctx.fill(); }
    if (off + rows < items.length) { const yb = y0 + (rows - 1) * step + 10; ctx.beginPath(); ctx.moveTo(ax, yb); ctx.lineTo(ax + 4, yb + 5); ctx.lineTo(ax + 8, yb); ctx.fill(); }
  }
  if (clicked >= 0 && on) {
    const it = items[clicked];
    if (it.disabled) Sound.play('click');
    else { Sound.play('select'); if (it.act) it.act(); }
  }
  return sel;
}
// Optionen (Stadt-Menü und Pause im Einsatz)
function optionItems(back) {
  const o = save.opts || (save.opts = { scan: true, shake: true, fx: 2 });
  const flip = (k) => () => { o[k] = !o[k]; persist(); };
  return [
    { label: 'TON: ' + (Sound.muted ? 'AUS' : 'AN'), act: () => Sound.toggleMute() },
    { label: 'RÖHREN-LOOK (SCANLINES): ' + (o.scan ? 'AN' : 'AUS'), act: flip('scan') },
    { label: 'BILDSCHIRM WACKELN: ' + (o.shake ? 'AN' : 'AUS'), act: flip('shake') },
    { label: 'BLUT & EFFEKTE: ' + (o.fx === 1 ? 'WENIG' : 'VIEL'), act: () => { o.fx = o.fx === 1 ? 2 : 1; persist(); } },
    { label: 'GRAFIK: ' + ['NIEDRIG', 'MITTEL', 'HOCH'][o.gfx == null ? 2 : o.gfx], act: () => { o.gfx = ((o.gfx == null ? 2 : o.gfx) + 2) % 3; persist(); } },
    { label: 'ZURÜCK', act: back },
  ];
}
function panel(x, y, w, h, col = '#ff3fa4') {
  ctx.fillStyle = 'rgba(8,0,18,0.86)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function drawSynthwave() {
  const hz = 168;
  const sky = ctx.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#0c0020'); sky.addColorStop(0.6, '#3a0a4a'); sky.addColorStop(1, '#ff3f7f');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + hash(i, 3) * 0.6 * (Math.sin(T * 2 + i) * 0.5 + 0.5)})`; ctx.fillRect(Math.floor(hash(i, 1) * W), Math.floor(hash(i, 2) * 110), 1, 1); }
  const sun = ctx.createLinearGradient(0, hz - 60, 0, hz);
  sun.addColorStop(0, '#ffe14d'); sun.addColorStop(1, '#ff2a7a');
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(W / 2, hz, 54, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#3a0a4a';
  for (let i = 0; i < 6; i++) { const y = hz - 6 - i * 8 + ((T * 6) % 8); ctx.fillRect(W / 2 - 60, Math.round(y), 120, 1 + Math.floor(i / 2)); }
  ctx.fillStyle = '#14001f'; ctx.fillRect(0, hz, W, H - hz);
  ctx.strokeStyle = '#ff3fa4'; ctx.lineWidth = 1;
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 6, hz); ctx.lineTo(W / 2 + i * 60, H); ctx.stroke(); }
  for (let i = 0; i < 8; i++) { const t = ((i + (T * 0.8) % 1) / 8); const y = hz + Math.pow(t, 2.2) * (H - hz); ctx.globalAlpha = t; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function drawRoomBg() {
  ctx.fillStyle = '#140820'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1c0c2c'; for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 12, H);
  ctx.fillStyle = 'rgba(255,63,164,0.06)';
  for (let x = -H + ((T * 10) % 40); x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 14, 0); ctx.lineTo(x + 14 + H, H); ctx.lineTo(x + H, H); ctx.fill(); }
}
function moneyTag(x, y, align = 'right') { txt('KONTO: ' + save.money + '€', x, y, { align, color: '#7dff7a' }); }

// ---------------------------------------------------------------------
//  Titel: nur "SPIEL STARTEN"
// ---------------------------------------------------------------------
function screenTitle() {
  drawSynthwave();
  const talk = Math.floor(T * 4) % 4;
  ctx.drawImage(talk === 1 ? SPR.hbO : SPR.hbC, 14, 112 + Math.round(Math.sin(T * 2) * 3), 102, 154);
  ctx.drawImage(talk === 3 ? SPR.portO : SPR.portC, W - 116, 112 + Math.round(Math.sin(T * 2 + 1) * 3), 102, 154);
  txt('DIE HOTTE', W / 2, 10, { size: 24, align: 'center', color: '#ff3fa4', shadow: '#00e5ff', wave: 2, speed: 3 });
  txt('PREITEN LINE', W / 2, 42, { size: 32, align: 'center', color: (i) => neon(i * 3), shadow: '#2a0040', wave: 3, speed: 4 });
  txt('LIL PREITNER GEGEN RUSSIAN HACKER BOI - ER HAT DAS TEBLEEDD GEKLAUT!', W / 2, 86, { font: FS, align: 'center', color: '#ffe14d' });
  if (state === 'boot') {
    if (Math.floor(T * 2) % 2 === 0) txt('KLICKEN ZUM STARTEN', W / 2, 150, { align: 'center' });
    if (uiActive() && anyConfirm()) { Sound.init(); setState('title'); Sound.playSong('title'); Sound.play('select'); }
    return;
  }
  listMenu('title', [{ label: 'SPIEL STARTEN', act: () => setState('slots') }], W / 2, 140, 18, { size: 16, w: 140 });
  if (save.exists) txt(`SPIELSTAND: LEVEL ${Math.min(save.unlocked + 1, LEVELS.length)}/${LEVELS.length}  -  ${save.money}€`, W / 2, 172, { font: FS, align: 'center', color: '#7ff' });
  txt('[M] TON AN/AUS', W / 2, 252, { font: FS, align: 'center', color: '#888888' });
}

// ---------------------------------------------------------------------
//  Steuerung (kommt immer nach "SPIEL STARTEN")
// ---------------------------------------------------------------------
function screenSlots() {
  drawSynthwave();
  txt('SPIELSTAND WÄHLEN', W / 2, 40, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  if (unameEditor()) return;
  const go = (n) => goto(() => { useSlot(n); if (!save.exists) { save.exists = true; persist(); } setState('controls'); Sound.playSong('hub'); });
  const items = [1, 2, 3].map((n) => ({ label: 'SPIELSTAND ' + n + ': ' + slotInfo(n), color: n === SLOT ? '#7dff7a' : '#ffffff',
    act: () => { if (!unameAsked()) unameAsk(() => go(n), true); else go(n); } }));
  items.push({ label: 'DEIN NAME: ' + (unameGet() || '(KEINER)'), color: '#ffb52a', act: () => unameAsk(null, false) });
  items.push({ label: 'SPIELSTÄNDE SICHERN (DATEI)', act: () => saveExport() });
  items.push({ label: 'SPIELSTÄNDE LADEN (DATEI)', act: () => saveImport() });
  items.push({ label: 'ZURÜCK', act: () => setState('title') });
  listMenu('slots', items, W / 2, 80, 18, { w: 190 });
  txt('IM ONLINE-KOOP SPIELT IHR BEIDE AUF DEM SPIELSTAND VOM HOST (GLEICHES KONTO).', W / 2, 220, { font: FS, align: 'center', color: '#cccccc' });
  if (uiActive() && pressed.Escape) setState('title');
}
// ---------------------------------------------------------------------
//  Benutzername: nur auf diesem PC (localStorage), NICHT im Spielstand.
//  Andere sehen ihn online über dem Kopf, auf der Karte und in der Liste.
// ---------------------------------------------------------------------
const UNAME_KEY = 'hottepreitenline-name', UNAME_ASKED = 'hottepreitenline-name-asked', UNAME_MAX = 14;
const UNAME_FUN = ['SAFTKÖNIG', 'O-SAFT-OLAF', 'TURBO-TOBI', 'ZITRONENZORRO', 'DÖNER-DANI', 'PIXEL-PAUL', 'KLOBÜRSTEN-KAI', 'BLUBBER-BEA', 'MEGA-MANDY', 'SAFTSCHUBSER', 'GUNZ-AZUBI', 'ORANGEN-OSKAR'];
let unameCache = null, unameEd = null;
function unameClean(s) { return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9ÄÖÜ _.!?-]/g, '').replace(/\s+/g, ' ').trim().slice(0, UNAME_MAX); }
function unameGet() {
  if (unameCache === null) { try { unameCache = unameClean(localStorage.getItem(UNAME_KEY) || ''); } catch (e) { unameCache = ''; } }
  return unameCache;
}
// eigener Anzeigename (mit Ersatz, wenn keiner gesetzt ist)
function unameMy(idx) { return unameGet() || 'SPIELER ' + ((idx | 0) + 1); }
function unameAsked() { if (unameGet()) return true; try { return !!localStorage.getItem(UNAME_ASKED); } catch (e) { return true; } }
function unameSet(v) {
  unameCache = unameClean(v);
  try { localStorage.setItem(UNAME_KEY, unameCache); localStorage.setItem(UNAME_ASKED, '1'); } catch (e) { /* egal */ }
}
// Editor öffnen; done() läuft nach OK/Abbrechen. first = erste Frage (Abbrechen = ohne Namen weiter)
function unameAsk(done, first) { unameEd = { buf: unameGet(), done: done || null, first: !!first, at: T }; }
// zeichnet den Editor über allem; true = aktiv (Aufrufer macht dann nichts anderes)
function unameEditor() {
  const E = unameEd;
  if (!E) return false;
  const on = uiActive() && T - E.at > 0.1;
  if (on) {
    if (pressed.KeyM) Sound.toggleMute();   // "M" ist sonst Ton an/aus - beim Tippen rückgängig machen
    for (const ch of typed) { const c = unameClean(ch); if ((c || ch === ' ') && E.buf.length < UNAME_MAX) E.buf += ch === ' ' ? ' ' : c; }
    if (pressed.Backspace) E.buf = E.buf.slice(0, -1);
    if (pressed.Tab) { let n = pick(UNAME_FUN); if (n === E.buf) n = pick(UNAME_FUN); E.buf = n; Sound.play('blip', true); }
  }
  ctx.fillStyle = 'rgba(6,0,16,0.93)'; ctx.fillRect(0, 0, W, H);
  txt(E.first ? 'WIE HEISST DU, CHEF?' : 'DEIN NAME', W / 2, 52, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  txt('DEN SEHEN DEINE FREUNDE ONLINE ÜBER DEINEM KOPF UND AUF DER KARTE.', W / 2, 80, { font: FS, align: 'center', color: '#cccccc' });
  panel(W / 2 - 96, 98, 192, 28, '#ffb52a');
  ctx.strokeStyle = '#ffb52a'; ctx.strokeRect(W / 2 - 95.5, 98.5, 191, 27);
  const shown = E.buf + (Math.floor(T * 2) % 2 && E.buf.length < UNAME_MAX ? '_' : '');
  txt(shown || ' ', W / 2, 106, { size: 16, align: 'center', color: '#ffe14d' });
  txt(E.buf.length + '/' + UNAME_MAX, W / 2 + 92, 128, { font: FS, align: 'right', color: '#777788' });
  txt('[TAB] ZUFALLSNAME  (Z.B. ' + UNAME_FUN[Math.floor(T / 2) % UNAME_FUN.length] + ')', W / 2, 146, { font: FS, align: 'center', color: '#ff9ad5' });
  const okR = { x: W / 2 - 110, y: 166, w: 100, h: 18 }, noR = { x: W / 2 + 10, y: 166, w: 100, h: 18 };
  const hov = (r) => mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h;
  for (const [r, l, c] of [[okR, '[ENTER] OK', '#7dff7a'], [noR, E.first ? '[ESC] SPÄTER' : '[ESC] ABBRUCH', '#ff6a6a']]) {
    panel(r.x, r.y, r.w, r.h, c); ctx.strokeStyle = hov(r) ? '#ffffff' : c; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    txt(l, r.x + r.w / 2, r.y + 5, { font: FS, align: 'center', color: hov(r) ? '#ffffff' : c });
  }
  txt('NUR AUF DIESEM PC GESPEICHERT - NICHT IM SPIELSTAND.', W / 2, 200, { font: FS, align: 'center', color: '#777788' });
  if (!on) return true;
  const ok = pressed.Enter || (mouse.pl && hov(okR)), no = pressed.Escape || (mouse.pl && hov(noR));
  if (ok && (unameClean(E.buf) || E.first)) {
    unameSet(E.buf); unameEd = null; Sound.play('select');
    if (typeof netNameChanged === 'function') netNameChanged();
    if (E.done) E.done();
  } else if (ok) Sound.play('click');
  else if (no) {
    unameEd = null; Sound.play('blip', true);
    if (E.first) { try { localStorage.setItem(UNAME_ASKED, '1'); } catch (e) { /* egal */ } }
    if (E.done && E.first) E.done();
  }
  if (ok || no) { mouse.pl = false; delete pressed.Enter; delete pressed.Escape; }
  return true;
}
// Spielstände als Datei sichern / laden (Backup, oder von Desktop zur Website mitnehmen)
function saveExport() {
  const d = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(lilPreitner|hpl)/.test(k)) d[k] = localStorage.getItem(k); } } catch (e) { /* egal */ }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'hotte-preiten-line', v: 1, data: d })], { type: 'application/json' }));
  a.download = 'hotte-preiten-line-spielstand.json';
  document.body.appendChild(a); a.click(); a.remove();
  Sound.play('select');
}
function saveImport() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    f.text().then((t) => {
      const j = JSON.parse(t);
      if (!j || j.game !== 'hotte-preiten-line' || !j.data) throw new Error('falsche Datei');
      for (const k in j.data) if (/^(lilPreitner|hpl)/.test(k)) localStorage.setItem(k, j.data[k]);
      useSlot(+localStorage.getItem('hpl_slot') || 1);
      Sound.play('win');
    }).catch(() => Sound.play('click'));
  };
  inp.click();
}
function screenControls() {
  drawRoomBg();
  panel(14, 8, W - 28, H - 16, '#3fd0ff');
  txt('STEUERUNG', W / 2, 14, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  const L = [
    ['IN DER STADT', '#ffe14d'],
    ['WASD LAUFEN  SHIFT RENNEN  E BENUTZEN  KLICK SCHLAGEN  F KLAUEN  I INVENTAR', '#ffffff'],
    ['FAHRZEUG: W/S GAS + BREMSE   A/D LENKEN   SHIFT TURBO   R RADIO   E AUSSTEIGEN', '#ffffff'],
    ['H HANDY (NEBENJOBS)   B GEBÄUDE KAUFEN (AM AUFTRAGS-MARKER)', '#ffffff'],
    ['IM EINSATZ', '#ffe14d'],
    ['WASD LAUFEN   MAUS ZIELEN   LINKSKLICK SCHLAGEN / SCHIESSEN / WERFEN', '#ffffff'],
    ['RECHTSKLICK WAFFE AUFHEBEN / WERFEN   LEERTASTE LIEGENDE GEGNER ERLEDIGEN', '#ffffff'],
    ['Q FINGERPISTOLE   V VEX-WAVE (IM KIOSK KAUFEN)   E PC / ZEITLUPE   SHIFT SCHAUEN', '#ffffff'],
    ['R WEITER NACH DEM TOD (KOSTET 1 LEBEN)   ESC PAUSE   M TON', '#ffffff'],
    ['', ''],
    ['SO GEHT\'S', '#ffe14d'],
    ['1. ZUHAUSE KLINGELT DAS TELEFON: RUSSIAN HACKER BOI HAT EINEN NEUEN AUFTRAG.', '#7ff'],
    ['2. INS AUTO UND ZUM BLINKENDEN MARKER FAHREN (DIE HAND ZEIGT DEN WEG).', '#7ff'],
    ['3. ALLE GEGNER ERLEDIGEN, GELD EINSAMMELN, ZUR TREPPE. 5 LEBEN PRO ETAGE!', '#7ff'],
    ['4. GELD: EINSÄTZE, SAFT-IMPERIUM (SAFTFABRIK), WELLEN-ARENA, CASINO, KLAUEN.', '#7ff'],
    ['5. AUSGEBEN: KIOSK (PERKS, WAFFEN, HÜTE), AUTOHAUS, GARTENCENTER.', '#7ff'],
    ['ES WIRD IMMER AUTOMATISCH GESPEICHERT - DU VERLIERST NICHTS!', '#7dff7a'],
  ];
  L.forEach(([l, c], i) => { if (l) txt(l, 26, 40 + i * 12, { font: FS, color: c }); });
  if (Math.floor(T * 2) % 2 === 0) txt('[ENTER] LOS GEHT\'S!', W / 2, H - 22, { align: 'center', color: '#ffe14d' });
  if (uiActive() && stateT > 0.3 && anyConfirm()) goto(() => enterHub());
}

// ---------------------------------------------------------------------
//  Anleitung (zuhause am Brett oder im Pausenmenü)
// ---------------------------------------------------------------------
const GUIDE = [
  { t: 'DIE STADT', l: ['DU WOHNST IN EINER OFFENEN STADT. ALLES ERREICHST DU ZU FUSS ODER MIT DEM AUTO.', '',
    'ZUHAUSE ........ TELEFON (NEUE AUFTRÄGE), BETT (SPEICHERN), KONSOLE (MULTIPLAYER)',
    'MARKER ......... BLINKENDE KREISE VOR GEBÄUDEN. [E] = LEVEL STARTEN',
    '                 GRÜN = GESCHAFFT (NOCHMAL SPIELEN FÜR BESSERE NOTE + GELD)',
    'KIOSK .......... PERKS, VEX-WAVE, STARTWAFFEN, WERKSTATT, HÜTE, MÖBEL, TIERE',
    'CASINO ......... BLACKJACK, GLÜCKSRAD, AUTOMATEN, ROULETTE, HÖHER/TIEFER',
    'SAFTFABRIK ..... DEIN SAFT-IMPERIUM (DAS GARTENCENTER IST GLEICH DARÜBER)',
    'AUTOHAUS ....... FAHRRAD, E-ROLLER, SAFT-MOBIL, SPORTWAGEN',
    'WELLEN-ARENA ... GRINDEN: WELLE UM WELLE GEGNER FÜR GELD',
    'OBEN STEHT IMMER DEIN ZIEL. UNTEN RECHTS IST DIE KARTE.'] },
  { t: 'KAMPF', l: ['EIN TREFFER = TOT. FÜR DICH UND DIE MEISTEN GEGNER!',
    'SCHÜSSE SIND LAUT UND LOCKEN GEGNER AN. NAHKAMPF IST LEISE.',
    'FÄUSTE UND GUMMIHUHN HAUEN NUR UM -> DANN [LEERTASTE] ZUM ERLEDIGEN.',
    'GEWORFENE WAFFEN HAUEN UM. TÜR AUFRENNEN = GEGNER DAHINTER FLIEGT UM.',
    'FINGERPISTOLE [Q]: GEGNER IM KEGEL ERSTARREN KURZ.',
    'GEGNER BRAUCHEN EINEN MOMENT, BIS SIE DICH SEHEN (DAS ? ÜBER IHREM KOPF).', '',
    'TIKITIKILUKAS O-SAFT: WERFEN - EXPLODIERT! NICHT ZU NAH WERFEN.',
    'VEX-WAVE [V]: SCHOCKWELLE, DIE ALLE WEGSCHLEUDERT. ERST IM KIOSK KAUFEN!',
    'WER GEGEN DIE WAND FLIEGT, IST ERLEDIGT. DANACH LÄDT SIE NEU AUF.'] },
  { t: 'BOSSE', l: ['BOSSE SIND MIT NORMALEN WAFFEN NICHT ZU KNACKEN - JEDER HAT EINEN TRICK!',
    'ERST WENN ER WEHRLOS IST (STERNE ÜBERM KOPF), WIRKT DEIN SCHADEN - DOPPELT.',
    'LEVEL 2  - FRAU GRECHI: AUF DIE PAUSENGLOCKEN HAUEN.',
    'LEVEL 4  - GÜNTHER: LASS IHN GEGEN DIE WAND RENNEN.',
    'LEVEL 5  - KUMI: ERST DIE ROUTER ZERSTÖREN, DANN DEN STECKER ZIEHEN.',
    'LEVEL 8  - DER CROUPIER: WIRF WAS NACH IHM (RECHTSKLICK), DANN ZUHAUEN.',
    'LEVEL 11 - BAKA BAKA BAKA: DEM BAUCHPLATSCHER AUSWEICHEN, DANN ZUHAUEN.',
    'LEVEL 14 - ZITRO ZACKZACK: ZUCKERSACK KAPUTTHAUEN - ER RENNT HIN UND FRISST.',
    'LEVEL 15 - CLOWNI CLOWNOWSKI: ALLE SEINE BALLONS ZERSTÖREN.',
    'LEVEL 16 - WATCHDOG 3000: VON HINTEN DEN REBOOT-KNOPF TREFFEN (UM IHN HERUM!).',
    'BENOMMENE BOSSE: [LEERTASTE] FÜR EXTRA-SCHADEN.'] },
  { t: 'MEHR BOSSE & DECKUNG', l: ['LEVEL 17 - DER SCHROTTKÖNIG: UNTER EINEN MAGNET LOCKEN, DANN DEN HEBEL HAUEN.',
    'LEVEL 18 - DER QUIZMASTER: DEN BUZZER MIT DER RICHTIGEN ANTWORT HAUEN.',
    '           FALSCHE ANTWORT ODER ZEIT VORBEI = KONFETTI-ANGRIFF!',
    'LEVEL 19 - RUSSIAN HACKER BOI: SERVER ZERSTÖREN, LASER ÜBERHITZEN LASSEN.', '',
    'IN JEDER BOSS-ARENA STEHEN KISTEN ZUR DECKUNG. ROTE KREISE = GLEICH KNALLT ES!',
    'OBEN IM BOSS-BALKEN STEHT IMMER DIE SCHWACHSTELLE.',
    'PRO SCHWÄCHE-FENSTER GEHT HÖCHSTENS EIN DRITTEL SEINER LEBEN WEG.', '',
    'GEGNER: GANGSTER, SCHLÄGER, DACKEL, BRECHER (3 TREFFER), SCHARFSCHÜTZEN',
    '(ROTER LASER = WEG DA!), GESCHÜTZTÜRME, DROHNEN.'] },
  { t: 'NEUE WAFFEN', l: ['TASER ........... BETÄUBT GEGNER (DANN [LEERTASTE]). SEHR LEISE.',
    'HARPUNE ......... DURCHBOHRT MEHRERE GEGNER, AUCH BRECHER.',
    'RAKETENWERFER ... RIESEN-EXPLOSION, TUT DIR SELBST NICHTS. NUR 3 SCHUSS!',
    'SAFTKANONE ...... VOLLAUTOMATISCHE SAFT-PLATSCHER. TUT DIR NICHTS.',
    'SENSE ........... RIESIGER SCHWUNG FAST RUNDHERUM. TÖDLICH.',
    'GOLFSCHLÄGER .... SCHLEUDERT GEGNER WEG (GEGEN DIE WAND = AUS).', '',
    'GEGNER KÖNNEN DIE NEUEN WAFFEN NICHT BENUTZEN. ALLE GIBT ES IM KIOSK (WAFFEN),',
    'TASER, HARPUNE, SAFTKANONE UND RAKETE AUCH IN DER WERKSTATT ZUM AUFRÜSTEN.',
    'DIE ETAGEN SIND JETZT GRÖSSER: MEHR GEGNER, MEHR WAFFEN, MEHR GELD!'] },
  { t: 'LEBEN & SPEICHERN', l: ['JEDE ETAGE HAT 5 LEBEN, DIE BOSS-ETAGE 7. STIRBST DU, KOSTET DAS 1 LEBEN',
    'UND DU MACHST AUF DERSELBEN ETAGE WEITER - MIT DER WAFFE, DIE DU MITGEBRACHT HAST.',
    'ALLE LEBEN WEG = DAS LEVEL FÄNGT VON VORNE AN. ES GIBT KEIN GAME OVER!',
    'NUR DAS GELD AUS DIESEM VERSUCH IST DANN WEG. DEIN KONTO BLEIBT.', '',
    'BEIM BOSS BEKOMMST DU AUSSERDEM 2 SCHUTZWESTEN (FANGEN 2 TREFFER AB).',
    'MEHR LEBEN: PERK "EXTRA-LEBEN" IM KIOSK ODER SAFT MIT WURST-SALZ (BOOSTER).',
    'DEINE WAFFE NIMMST DU AUF DIE NÄCHSTE ETAGE MIT.', '',
    'ES WIRD NACH JEDEM LEVEL UND IN DER STADT STÄNDIG GESPEICHERT.'] },
  { t: 'GELD, KIOSK & CASINO', l: ['GELD (GRÜNE SCHEINE) FÄLLT VON GEGNERN. HOHE COMBO = MEHR GELD!',
    'TRESORE (GRAUE BOXEN) KAPUTT HAUEN = VIEL GELD.',
    'AM LEVELENDE GIBT ES EINEN BONUS NACH NOTE (A+ BIS D).', '',
    'KIOSK: EXTRA-LEBEN, KEVLARWESTE, TURBOSCHUHE, ZEITLUPE, NINJA-WURF, VEX-WAVE ...',
    'DAZU STARTWAFFEN (VON DER PISTOLE BIS ZUR MINIGUN) UND HÜTE.', '',
    'CASINO: BLACKJACK (21!), GLÜCKSRAD (BIS 8X), AUTOMATEN, ROULETTE, HÖHER/TIEFER.',
    'DAS CASINO GEHÖRT RUSSIAN HACKER BOI. ER GEWINNT MEISTENS.',
    'WELLEN-ARENA: JEDE WELLE GIBT GELD. [E] IN DER PAUSE = AUSZAHLEN. TOT = HÄLFTE.'] },
  { t: 'SAFT-IMPERIUM', l: ['WIE IN SCHEDULE I: DU KAUFST ALLES SELBST UND STELLST ES SELBST AUF.', '',
    '1. GERÄTE IM GARTENCENTER & BAUMARKT KAUFEN (KÜBEL, PRESSE, MIXTISCH, REGALE...).',
    '2. ZAHLENTASTE = GERÄT IN DIE HAND, IN DEINEM GRUNDSTÜCK HINKLICKEN. [R] DREHT.',
    '3. KERNE IN DIE KÜBEL ([E]), ERNTEN, AN DER PRESSE PRESSEN (3 FRÜCHTE = 1+ SAFT).',
    '4. AM MIXTISCH MIT ZUTATEN MISCHEN: VIEL MEHR WERT! GEHEIMREZEPTE ENTDECKEN.',
    '5. VERKAUFEN: SMS-BESTELLUNGEN, PASSANTEN ([E]), PERSONAL ODER EXPORT-RAMPE.', '',
    '[X] AN EINEM LEEREN GERÄT = WIEDER EINPACKEN. DAS PERSONAL NIMMT ALLES AUS DEN REGALEN.',
    'RUSSIAN HACKER BOI KASSIERT 10% SCHUTZGELD - BIS DU IHN BESIEGST.'] },
  { t: 'TASCHE, REGALE & GRUNDSTÜCKE', l: ['DEINE TASCHE HAT 8 PLÄTZE (RUCKSACK-UPGRADE: BIS 14). JEDE SORTE STAPELT SICH:',
    'FRÜCHTE 20, KERNE 30, ZUTATEN 20, SÄFTE 10. UNTEN SIEHST DU DIE SCHNELLLEISTE (1-9).', '',
    'REGALE UND KÜHLSCHRÄNKE AUFSTELLEN = LAGERPLATZ. [E] ÖFFNET SIE: KLICK = GANZER',
    'STAPEL, RECHTSKLICK = 1 STÜCK. JEDES GRUNDSTÜCK HAT EINE LIEFERKISTE.', '',
    'GRUNDSTÜCKE (AN DER TÜR 2X [E]): GARAGE 3.000€, LAGERHALLE 25.000€,',
    'GEWÄCHSHAUS 15.000€ (30% SCHNELLER), SCHEUNE 45.000€ AUF DEM LAND (20% SCHNELLER).',
    'UV-STRAHLER = SCHNELLER WACHSEN, SPRINKLER = PFLANZT NEU, ABFÜLLANLAGE = +25% WERT.'] },
  { t: 'HANDY [H]', l: ['SMS .......... BESTELLUNGEN ANSEHEN, NAVI ZUM KUNDEN    KARTE ... KLICK = NAVI-ZIEL',
    'JOBS ......... NEBENJOBS (KLEINES ZUBROT, MAX. 6 PRO TAG, PAUSE DAZWISCHEN)',
    'KOPFGELD ..... GESUCHTE GANGSTER JAGEN UND ERLEDIGEN = BELOHNUNG + VIEL ERFAHRUNG',
    'LIEFERUNG .... KERNE, ZUTATEN, GERÄTE BESTELLEN (+20%) - KOMMT IN DIE LIEFERKISTE',
    'PREISE ....... DEINEN VERKAUFSPREIS FESTLEGEN (TEURER = WENIGER KÄUFER)',
    'BÖRSE ........ JEDEN TAG SIND ANDERE SÄFTE GEFRAGT (BIS +40% ODER -30%)',
    'BANK ......... KONTO, KASSE ÜBERWEISEN (-5%), TAGESKOSTEN UND TAGESABRECHNUNG',
    'TAXI ......... ÜBERALL HIN    KONTAKTE ... STAMMKUNDEN ANRUFEN = SOFORT BESTELLUNG',
    'ANWALT ....... FAHNDUNG GEGEN GELD LÖSCHEN    AUFGABEN ... 3 TAGESAUFGABEN',
    'PROFIL ....... LIL-LEVEL, SKILLPUNKTE VERTEILEN, STATISTIK',
    'IMPERIUM ..... ALLES AUF EINEN BLICK    MUSIK ... RADIO AUCH ZU FUSS'] },
  { t: 'GRINDEN: LEVEL, SKILLS & SAMMELN', l: ['ALLES GIBT ERFAHRUNG: GEGNER, AUFTRÄGE, SÄFTE, ERNTEN, JOBS, KOPFGELDER.',
    'JEDES LIL-LEVEL = 1 SKILLPUNKT (HANDY: PROFIL). 8 SKILLS, Z.B.:',
    'AUSDAUER (MEHR HERZEN IN DER STADT), VERHANDELN (SÄFTE MEHR WERT),',
    'GRÜNER DAUMEN (SCHNELLER WACHSEN), SCHARFSCHÜTZE, KOPFGELDJÄGER, GLÜCKSKIND ...', '',
    'KOPFGELD: GANGSTER FLIEHEN, DIE SCHWEREN HABEN BEWAFFNETE LEIBWÄCHTER.',
    '25 GOLDENE ORANGEN SIND IN STADT UND LANDKREIS VERSTECKT (+250€ JEDE).',
    'ALLE GEFUNDEN = ORANGEN-KRONE (HUT) UND EIN ERFOLG.', '',
    'HAUSTIERE (KIOSK: TIERE): DACKEL, KATZE, BULLDOGGE ODER DIE AMSEL MICHAEL MERL',
    '(FLIEGT ÜBER WÄNDE, BRINGT GELD) HELFEN IM EINSATZ UND STÖREN DIE POLIZEI.'] },
  { t: 'TAGESKOSTEN & TAGESAUFGABEN', l: ['EIN SPIELTAG DAUERT 8 MINUTEN. AM ENDE JEDES TAGES WIRD ABGERECHNET:',
    'PERSONAL WILL LOHN, GRUNDSTÜCKE UND WOHNUNGEN KOSTEN UNTERHALT.',
    'ZUERST AUS DER KASSE, DANN VOM KONTO. KEIN GELD = JEMAND KÜNDIGT!', '',
    'JEDEN TAG GIBT ES 3 NEUE TAGESAUFGABEN (HANDY: AUFGABEN), Z.B. SÄFTE',
    'VERKAUFEN, BESTELLUNGEN LIEFERN, ERNTEN, GEGNER ERLEDIGEN. BELOHNUNG SOFORT.', '',
    'DIE SAFT-BÖRSE ÄNDERT SICH JEDEN TAG: VERKAUF, WAS GERADE GEFRAGT IST!',
    'PERKS IM KIOSK SIND TEURER GEWORDEN - DAS GELD WILL VERDIENT WERDEN.'] },
  { t: 'LANDKREIS & STADT-KAMPF', l: ['GANZ RECHTS LIEGT DER LANDKREIS. DIE STRASSENSPERRE GEHT AB SAFT-RANG 4 AUF.',
    'DORT: ORANGENHAIN (GRATIS-FRÜCHTE, WACHSEN NACH), SCHEUNE, SEE ZUM ANGELN UND DER',
    'GROSSMARKT (KERNE/ZUTATEN 20% BILLIGER, REGENBOGEN-KERNE) MIT EXPORT-RAMPE.', '',
    'IN DER STADT: [Q] ZIEHT DEINE GEKAUFTEN WAFFEN. LINKSKLICK = ANGRIFF.',
    'WER LIEGT, KANN ERLEDIGT WERDEN. ZEUGEN RUFEN DIE POLIZEI (BIS 4 STERNE).',
    'NACH EINEM MORD ODER AB 3 STERNEN SCHIESST DIE POLIZEI ZURÜCK!',
    'KEINE HERZEN MEHR = AUSGEKNOCKT. DU WACHST IM KRANKENHAUS AUF (KOSTET GELD).',
    'ERLEDIGTE LASSEN GELD FALLEN - EINFACH DRÜBERLAUFEN.'] },
  { t: 'REZEPTE & AUSBAU', l: ['GEHEIMREZEPTE: SAFT + 2 BESTIMMTE ZUTATEN. 30% MEHR WERT UND 2 BOOSTER!',
    'IM REZEPTBUCH AM MIXTISCH STEHEN HINWEISE. AUSPROBIEREN = ENTDECKEN.', '',
    'BOOSTER: GEMIXTEN SAFT IM INVENTAR [I] WÄHLEN UND [B] -> HILFT IM NÄCHSTEN',
    'EINSATZ (ZEITLUPE, TEMPO, WESTE, O-SAFT-START, GELDREGEN, VEX-TURBO ...).', '',
    'BOSSE SCHALTEN SPEZIAL-ZUTATEN FREI (WURST-SALZ, PAKET-PULVER, GOLDSTAUB...).',
    'HÖHERER SAFT-RANG = NEUE FRÜCHTE (MANDARINE, GOLDORANGE, REGENBOGEN), ZUTATEN,',
    'GERÄTE (PROFI-KÜBEL, PROFI-/INDUSTRIE-PRESSE, ABFÜLLANLAGE), PERSONAL, LASTER ...'] },
  { t: 'POLIZEI & KLAUEN', l: ['LEUTE ANFAHREN, KLAUEN ODER POLIZEI RAMMEN = FAHNDUNGSSTERNE (BIS 3).',
    'MIT STERNEN KANNST DU KEINE AUFTRÄGE STARTEN UND NICHTS KAUFEN.', '',
    'ABHÄNGEN: NICHT GESEHEN WERDEN! DANN LÄUFT OBEN EIN BALKEN -> 1 STERN WENIGER.',
    'BEI 1 STERN KANNST DU DICH IN HÄUSERN VERSTECKEN. AB 2 STERNEN KOMMEN SIE REIN.',
    'BÄUME UND HÄUSER VERDECKEN DIE SICHT. DER SPORTWAGEN HÄNGT ALLE AB.',
    'ERWISCHT = STRAFE ZAHLEN UND VOR DER POLIZEIWACHE AUFWACHEN.',
    'TASCHENDIEBSTAHL: VON HINTEN RAN UND [F] DRÜCKEN. DANN 2X [F], WENN DER',
    'ZEIGER IM GRÜNEN IST. DANEBEN = AUFGEFLOGEN! NEBEN POLIZISTEN: RISKANT!',
    'POLIZISTEN HABEN MEHR GELD DABEI... ABER DAS GIBT GLEICH 2 STERNE.',
    'NACHTS SIEHT DIE POLIZEI SCHLECHTER. ERFOLGE (ESC-MENÜ) BRINGEN GELD.'] },
  { t: 'FAHRZEUGE & MULTIPLAYER', l: ['IM AUTOHAUS (RECHTS IN DER STADT) KAUFST UND WECHSELST DU DEIN FAHRZEUG:',
    'FAHRRAD (WENDIG), E-ROLLER, PINKER FLITZER (DEIN AUTO),',
    'SAFT-MOBIL (+25% TRINKGELD BEIM LIEFERN), SPORTWAGEN (SUPERSCHNELL).',
    'ESC -> FAHRZEUG HERHOLEN: DEIN FAHRZEUG KOMMT ZU DIR.', '',
    'MULTIPLAYER (KONSOLE ZUHAUSE ODER ESC-MENÜ): SPIELER 2 AM SELBEN PC.',
    'P2 MIT CONTROLLER ODER TASTATUR: PFEILE LAUFEN, PUNKT ANGRIFF, KOMMA WERFEN,',
    'MINUS ERLEDIGEN, SHIFT-RECHTS FINGERPISTOLE, K VEX-WAVE.',
    'ONLINE BIS 4 SPIELER MIT CODE - KLAPPT AUCH IM SCHUL-WLAN UND MIT VPN.',
    'IHR TEILT KONTO, TASCHE, FABRIK, FAHNDUNG UND ANRUFE (DIALOGE SEHEN ALLE).',
    'PERKS, MASKE, HUT UND LEBEN HAT JEDER SELBST. WER STIRBT, IST NACH 4 S ZURÜCK.'] },
  { t: 'MASKEN & NEUE GEGNER', l: ['JEDER GESCHAFFTE LEVEL SCHALTET EINE MASKE FREI. AUSWAHL AUF DER LEVEL-KARTE (A/D):',
    'HASE (TEMPO)  SPARSCHWEIN (GELD)  PFERD (TÜREN TÖTEN)  ZEBRA (WESTE)',
    'EULE (DURCH WÄNDE)  DISCO-KUGEL (SPÄTER BEMERKT)  ROUTER (MUNITION)',
    'BAKA (FÄUSTE TÖTEN)  BRILLE (ZEITLUPE)  ZITRONE (LANGE KOMBO)  CLOWN (+1 LEBEN)',
    'ROBO-HUND (LEISE)  SCHROTT-KRONE (GELD-MAGNET)  BUZZER (BOSSE LÄNGER WEHRLOS)',
    'TEBLEEDD (ALLES!) GIBT ES ERST NACH DEM FINALE.',
    'NEUE GEGNER IN SPÄTEREN LEVELN:',
    'SCHILD-POLIZIST: VON VORNE KUGELSICHER. VON HINTEN ODER MIT DER TÜR ERWISCHEN!',
    'NINJA: SEHR SCHNELL UND WEICHT KUGELN AUS. LIEBER HAUEN.',
    'O-SAFT-BOMBER: RENNT AUF DICH ZU UND EXPLODIERT. AUS DER FERNE ERLEDIGEN!',
    'KIOSK-WERKSTATT: MAGAZIN, LASERVISIER UND SCHALLDÄMPFER FÜR DEINE WAFFEN.'] },
  { t: 'STADTLEBEN', l: ['H = HANDY MIT APPS (SIEHE SEITE HANDY). NEBENJOBS SIND NUR EIN KLEINES ZUBROT.',
    'R = AUTORADIO (5 SENDER). NACHTS LEUCHTEN DIE LATERNEN, MANCHMAL REGNET ES.',
    'MINISPIELE: ANGELN AM HAFEN, DARTS IM CASINO, KARTBAHN IM PARK (LINKS).', '',
    'IMMOBILIEN: AM MARKER EINES GESCHAFFTEN AUFTRAGS [B] = GEBÄUDE KAUFEN -> MIETE.',
    'STAMMKUNDEN: WER OFT BEI DIR KAUFT, BESTELLT ÖFTER UND ZAHLT MEHR.',
    'SAFT-QUALITÄT C BIS S: DÜNGER, LAMPEN, ABFÜLLANLAGE, GEWÄCHSHAUS = MEHR WERT.',
    'ÜBERFÄLLE: DIE ZITRONIA AG GREIFT DEINE FABRIK AN - 90 S ZEIT ZUM VERTEIDIGEN!', '',
    'MÖBEL IM KIOSK. BOSS-TROPHÄEN KOMMEN VON SELBST INS REGAL ZUHAUSE.',
    'NACH DEM FINALE: SCHWER-MODUS IM ESC-MENÜ (MEHR GELD, GOLDKRONE ALS BELOHNUNG).'] },
  { t: 'WOHNUNGEN & NEUE VIERTEL', l: ['DIE STADT IST JETZT VIEL GRÖSSER: OSTVIERTEL (RECHTS) UND STRAND (GANZ UNTEN).', '',
    'WOHNUNGEN ZUM FREISCHALTEN - AN DER TÜR 2X [E] DRÜCKEN = KAUFEN:',
    'BAUWAGEN 2.000€ (OBEN LINKS IM PARK)      LOFT 15.000€ (OSTVIERTEL)',
    'STRANDVILLA 40.000€ (AM STRAND)           PENTHOUSE 90.000€ (OSTVIERTEL)', '',
    'JEDE WOHNUNG: BETT (SPEICHERN), SCHNELLREISE-TAFEL (REISE ZU DEINEN ORTEN)',
    'UND +5% GELD BEI JEDEM GESCHAFFTEN AUFTRAG (ALLE 4 = +20%).', '',
    'NEUE IMMOBILIEN [B]: ZITRONIA AG, FREIZEITPARK, SCHROTTPLATZ, SAFT-TV STUDIO.',
    'AM STRAND GIBT ES EINEN ZWEITEN ANGELSTEG.'] },
  { t: 'RÄTSEL & GEFAHREN', l: ['WIRESHARK (LEVEL 5): GEH ZUM PC UND DRÜCK [E].',
    'DA PASSIERT VIEL. TIPPE "http" INS FILTERFELD ODER DRÜCK [LEERTASTE]',
    'ZUM PAUSIEREN. KLICK DAS LOGIN-PAKET AN -> PASSWORT -> TÜR GEHT AUF.', '',
    'LASERSCHRANKEN ... NUR WENN ROT = TÖDLICH. ABWARTEN!',
    'U-BAHN ........... GLEISE BLINKEN ROT = ZUG KOMMT!',
    'FLUGHAFEN ........ FÖRDERBÄNDER SCHIEBEN DICH MIT.',
    'DUNKELHEIT ....... DIE TASCHENLAMPE LEUCHTET, WO DU HINZIELST.', '',
    'VIEL GLÜCK, LIL. HOL DIR DAS TEBLEEDD ZURÜCK!'] },
];
let guideReturn = 'title', guidePage = 0;
function openGuide(ret) { guideReturn = ret; guidePage = 0; setState('guide'); }
function guideBack() { if (guideReturn === 'city') enterHub(); else if (guideReturn === 'pause') setState('pause'); else { setState('title'); Sound.playSong('title'); } }
function screenGuide() {
  drawRoomBg();
  panel(14, 22, W - 28, 218, '#3fd0ff');
  const pg = GUIDE[guidePage];
  txt('ANLEITUNG ' + (guidePage + 1) + '/' + GUIDE.length, W / 2, 6, { align: 'center', color: '#3fd0ff' });
  txt(pg.t, W / 2, 30, { size: 16, align: 'center', color: (i) => neon(i), wave: 2 });
  pg.l.forEach((l, i) => txt(l, 24, 54 + i * 17, { font: FS, color: '#ffffff' }));
  if (uiActive()) {
    if (pressed.ArrowRight || pressed.KeyD || pressed.Enter || pressed.Space || (mouse.pl && mouse.x > W / 2)) { if (guidePage < GUIDE.length - 1) { guidePage++; Sound.play('blip', true); } else goto(guideBack); }
    else if (pressed.ArrowLeft || pressed.KeyA || (mouse.pl && mouse.x <= W / 2)) { if (guidePage > 0) { guidePage--; Sound.play('blip', true); } }
    if (pressed.Escape) goto(guideBack);
  }
  txt('< ZURÜCK', 22, H - 22, { font: FS, color: guidePage ? '#ffffff' : '#555555' });
  txt(guidePage < GUIDE.length - 1 ? 'WEITER >' : 'FERTIG >', W - 22, H - 22, { font: FS, align: 'right', color: '#ffe14d' });
}

// ---------------------------------------------------------------------
//  Dialoge (Anruf von Russian Hacker Boi)
// ---------------------------------------------------------------------
let dlg = null;
// eigene Gesprächspartner (who): { name, col, ring, draw(g, x, y, open, dim) } - Porträt 102x154 links
const SPEAKERS = {};
// eigene Bildschirme: state -> screen(dt) (zeichnet und liest Eingaben selbst, wie screenFish)
const SCREENS = {};
// follow = Online-Gast schaut beim Host mit (der Host blättert, net.js)
function startDialog(name, onDone, follow) {
  // Gast im Online-Koop: den Anruf startet der Host - dann sehen ihn alle
  if (!follow && typeof NET !== 'undefined' && NET.mode === 'client' && NET.connected) { netSend({ t: 'dlgreq', name }); return; }
  dlg = { name, lines: DIALOGS[name], i: 0, chars: 0, onDone, ringT: 1.2, done: false, follow: !!follow, hintT: 0 };
  setState('dialog');
  Sound.muffle(false); Sound.playSong('dialog'); Sound.play('ring');
  if (!follow && typeof netDlgStart === 'function') netDlgStart();
}
function dlgFinish() {
  if (!dlg || dlg.done) return;
  dlg.done = true;
  if (typeof netDlgSync === 'function') netDlgSync(true);
  goto(dlg.onDone);
}
// weiter: Zeile fertig zeigen, sonst die nächste (Host oder Einzelspieler)
function dlgNext() {
  if (!dlg || dlg.done) return;
  if (dlg.ringT > 0) dlg.ringT = 0;
  else {
    const line = dlg.lines[dlg.i];
    if (dlg.chars < line.text.length) dlg.chars = line.text.length;
    else { dlg.i++; dlg.chars = 0; if (dlg.i >= dlg.lines.length) { dlg.i = dlg.lines.length - 1; dlg.chars = 999; dlgFinish(); return; } }
  }
  if (typeof netDlgSync === 'function') netDlgSync(false);
}
function screenDialog(dt) {
  ctx.fillStyle = '#04120a'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) txt(hash(i, Math.floor(T * 2)) > 0.5 ? '1' : '0', (i * 37) % W, ((T * 30 + i * 53) % H), { font: FS, color: 'rgba(57,255,122,0.15)', outline: '' });
  const f = dlg.follow;
  dlg.hintT = Math.max(0, (dlg.hintT || 0) - dt);
  const input = () => {   // ESC = überspringen, sonst weiter (ein Gast fragt den Host)
    if (!uiActive() || dlg.done) return;
    if (pressed.Escape) { if (f) dlg.hintT = 2; else dlgFinish(); }
    else if (anyConfirm()) { if (f) netDlgAsk(); else dlgNext(); }
  };
  // Gesprächspartner links = nächste Zeile, die nicht von Lil ist (eigene über SPEAKERS)
  let other = null;
  for (let k = dlg.i; k >= 0 && !other; k--) if (dlg.lines[k].who !== 'lil') other = dlg.lines[k].who;
  for (let k = dlg.i; k < dlg.lines.length && !other; k++) if (dlg.lines[k].who !== 'lil') other = dlg.lines[k].who;
  const sp = SPEAKERS[other] || null;
  if (dlg.ringT > 0) {
    dlg.ringT -= dt;
    if (stateT > 0.2 || pressed.Escape) input();
    txt('*ANRUF*', W / 2 + Math.round(Math.sin(T * 60) * 2), H / 2 - 20, { size: 16, align: 'center', color: (i) => neon(i), wave: 4 });
    txt(dlg.lines.ring || (sp ? sp.ring || sp.name + ' RUFT AN...' : 'RUSSIAN HACKER BOI RUFT AN...'), W / 2, H / 2 + 10, { align: 'center', color: sp ? sp.col : '#39ff7a' });
    return;
  }
  const line = dlg.lines[Math.min(dlg.i, dlg.lines.length - 1)];
  if (!dlg.done) {
    const before = Math.floor(dlg.chars);
    dlg.chars = Math.min(line.text.length, dlg.chars + dt * 42);
    const now = Math.floor(dlg.chars);
    if (now > before && now % 2 === 0 && line.text[now - 1] !== ' ') Sound.play('blip', line.who !== 'lil');
    input();
  }
  const typing = dlg.chars < line.text.length, open = typing && Math.floor(T * 10) % 2 === 0;
  const lil = line.who === 'lil';
  const evil = other === 'evil';
  const hbS = evil ? (open ? SPR.evilO : SPR.evilC) : (open ? SPR.hbO : SPR.hbC), py = 26 + (!lil ? Math.round(Math.sin(T * 8) * 1.5) : 0);
  if (sp && sp.draw) extCall(sp.draw, ctx, 40, py, !lil && open, lil);
  else ctx.drawImage(!lil ? hbS : (evil ? SPR.evilDimC : SPR.hbDimC), 40, py, 102, 154);
  ctx.drawImage(lil ? (open ? SPR.portO : SPR.portC) : SPR.portDimC, W - 142, 26 + (lil ? Math.round(Math.sin(T * 8) * 1.5) : 0), 102, 154);
  if (save.hat !== 'none') { ctx.globalAlpha = lil ? 1 : 0.4; drawHat(ctx, save.hat, W - 142 + 7, 26 + 6, 6.2); ctx.globalAlpha = 1; }
  const nameCol = sp ? sp.col : evil ? '#ff2a3a' : '#39ff7a', otherName = sp ? sp.name : 'RUSSIAN HACKER BOI';
  txt(otherName, 91, 14, { font: FS, align: 'center', color: !lil ? nameCol : '#335533' });
  txt('LIL PREITNER', W - 91, 14, { align: 'center', color: lil ? '#66ffff' : '#335555' });
  ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(16, 186, W - 32, 76);
  ctx.strokeStyle = lil ? '#66ffff' : nameCol; ctx.lineWidth = 1; ctx.strokeRect(16.5, 186.5, W - 33, 75);
  txt(lil ? 'LIL:' : otherName + ':', 26, 194, { color: lil ? '#66ffff' : nameCol });
  let left = Math.floor(dlg.chars);
  wrap(line.text, 50).forEach((l, i) => { if (left <= 0) return; txt(l.slice(0, left), 26, 210 + i * 13, { color: '#ffffff' }); left -= l.length + 1; });
  if (!typing && Math.floor(T * 3) % 2 === 0) txt('[LEERTASTE]', W - 26, 250, { font: FS, align: 'right', color: '#aaaaaa' });
  const coopHost = typeof NET !== 'undefined' && NET.mode === 'host' && NET.connected;
  txt(f ? (dlg.hintT > 0 ? 'NUR DER HOST KANN ÜBERSPRINGEN' : 'KOOP: IHR SEHT DEN ANRUF ZUSAMMEN') : coopHost ? '[ESC] FÜR ALLE ÜBERSPRINGEN' : '[ESC] ÜBERSPRINGEN',
    W / 2, 3, { font: FS, align: 'center', color: f && dlg.hintT > 0 ? '#ffe14d' : '#336644' });
}

// ---------------------------------------------------------------------
//  Levelkarte, Pause, Levelende, Sieg
// ---------------------------------------------------------------------
function screenCard() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const L = levelById(run.li);
  txt(L.final ? 'FINALE' : L.label || 'LEVEL ' + (run.li + 1), W / 2, 44, { size: 32, align: 'center', color: (i) => neon(i * 2), wave: 3, shadow: '#400020' });
  txt(L.chapter, W / 2, 96, { align: 'center', color: '#ffffff' });
  txt(L.name, W / 2, 120, { size: 16, align: 'center', color: '#ffd84a', wave: 2 });
  txt(L.date, W / 2, 152, { font: FS, align: 'center', color: '#aaaaaa' });
  const lv = 5 + perk('heartcap') + (hasBoost('heart') ? 2 : 0);
  txt(L.floors.length + ' ETAGEN   -   ' + lv + ' LEBEN PRO ETAGE (BOSS +2)   -   SCHWIERIGKEIT ' + '*'.repeat(Math.min(10, Math.round(L.diff))), W / 2, 170, { font: FS, align: 'center', color: '#ff9ad5' });
  for (let i = 0; i < lv; i++) drawHeart(ctx, W / 2 - lv * 6 + i * 12, 184, 1, '#ff3b5a');
  if (save.booster) txt('SAFT-BOOSTER: ' + boosterNames() + ' - ' + boosterDescs(), W / 2, 200, { font: FS, align: 'center', color: '#ffb52a' });
  if (coopActive()) txt('KOOP: 2 SPIELER', W / 2, 210, { font: FS, align: 'center', color: '#66aaff' });
  const picking = maskPicker(234);
  if (stateT > 0.6 && Math.floor(T * 2) % 2 === 0) txt(picking ? 'KLICKEN / ENTER ZUM STARTEN' : 'KLICKEN ZUM STARTEN', W / 2, 220, { font: FS, align: 'center', color: '#777777' });
  if (uiActive() && ((!picking && stateT > 4.5) || (stateT > 0.6 && (pressed.Enter || pressed.Space || mouse.pl)))) goto(() => beginFloor(run.fi || 0));
}
function screenPause() {
  renderWorld(); drawHUD();
  ctx.fillStyle = 'rgba(10,0,20,0.72)'; ctx.fillRect(0, 0, W, H);
  txt('PAUSE', W / 2, 50, { size: 24, align: 'center', color: (i) => neon(i), wave: 3 });
  if (pauseOpts) {
    listMenu('pauseopts', optionItems(() => { pauseOpts = false; }), W / 2, 100, 20);
    if (uiActive() && pressed.Escape && stateT > 0.1) pauseOpts = false;
    return;
  }
  listMenu('pause', [
    { label: 'WEITER', act: () => setState('play') },
    { label: 'ETAGE NEU STARTEN (KOSTET 1 LEBEN)', act: () => { if (!G.arena && G.players.every((q) => (run.livesBy[q.idx] || 0) > 1)) { for (const q of G.players) run.livesBy[q.idx]--; respawnFloor(); } }, disabled: !!G.arena || !G.players.every((q) => (run.livesBy[q.idx] || 0) > 1) },
    { label: 'ANLEITUNG', act: () => { guideFromPause = true; openGuide('pause'); } },
    { label: 'AUFGEBEN (ZURÜCK IN DIE STADT)', act: () => goto(() => enterHub()) },
    { label: 'OPTIONEN', act: () => { pauseOpts = true; } },
  ], W / 2, 100, 20);
  txt('AUFGEBEN = DAS GELD AUS DIESEM VERSUCH IST WEG', W / 2, 212, { font: FS, align: 'center', color: '#888888' });
  if (uiActive() && pressed.Escape && stateT > 0.1) setState('play');
}
let guideFromPause = false, pauseOpts = false;
let endInfo = null;
const GRADE_TEXT = { 'A+': 'RUSSIAN HACKER BOI SCHWITZT!', A: 'SAUBERE ARBEIT, LIL!', B: 'GANZ OKAY', C: 'GEHT SO...', D: 'PEINLICH. ABER GESCHAFFT.' };
function screenLevelEnd() {
  drawBackground();
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  const e = endInfo, t = stateT;
  txt(levelLabel(e.li) + ' GESCHAFFT!', W / 2, 12, { size: 16, align: 'center', color: (i) => neon(i), wave: 3 });
  const rows = [
    ['PUNKTE', e.score], ['ERLEDIGT', e.kills], ['MAX COMBO', e.maxCombo + 'X'], ['ZEIT', fmtTime(e.time)], ['TODE', e.deaths],
    ['GELD GESAMMELT', e.cash + '€'], ['NOTEN-BONUS', '+' + e.bonus + '€'], ['AUFS KONTO', '+' + (e.cash + e.bonus) + '€'],
  ];
  rows.forEach((r, i) => {
    if (t < 0.3 + i * 0.25) return;
    const y = 34 + i * 15, hi = i === rows.length - 1;
    txt(r[0], 30, y, { color: hi ? '#7dff7a' : '#ffffff' });
    txt(String(r[1]), 270, y, { align: 'right', color: hi ? '#7dff7a' : '#7ff' });
  });
  if (t > 2.2 && LEVEL_OUTROS[e.li]) {
    panel(16, 158, 290, 30, '#39ff7a');
    wrap(LEVEL_OUTROS[e.li], 52).slice(0, 2).forEach((l, i) => txt(l, 22, 163 + i * 11, { font: FS, color: '#d8ffd8' }));
  }
  if (t > 2.6) {
    const pop = Math.max(1, 3 - (t - 2.6) * 8);
    ctx.save(); ctx.translate(150, 226); ctx.scale(pop, pop);
    txt(e.grade, 0, -16, { size: 32, align: 'center', color: (i) => neon(i * 4), shadow: '#000' });
    ctx.restore();
    txt(GRADE_TEXT[e.grade], 150, 248, { font: FS, align: 'center', color: '#ffffff' });
    if (e.record) txt('NEUER REKORD!', 150, 259, { font: FS, align: 'center', color: Math.floor(T * 4) % 2 ? '#ffd84a' : '#ff3fa4' });
  }
  const bob = Math.round(Math.abs(Math.sin(T * 8)) * -6);
  ctx.drawImage(Math.floor(T * 8) % 2 === 0 ? SPR.portO : SPR.portC, 320, 50 + bob, 102, 154);
  if (save.hat !== 'none') drawHat(ctx, save.hat, 320 + 7, 50 + 6 + bob, 6.2);
  txt('GESPEICHERT!', 371, 214, { font: FS, align: 'center', color: '#7dff7a' });
  if (e.newCall) txt('NEUER ANRUF WARTET ZUHAUSE!', 371, 226, { font: FS, align: 'center', color: '#ffe14d' });
  moneyTag(W - 12, 240);
  if (t > 3 && Math.floor(T * 2) % 2 === 0) txt('[ENTER] ZURÜCK IN DIE STADT', W - 16, H - 12, { font: FS, align: 'right', color: '#ffffff' });
  if (uiActive() && t > 3 && anyConfirm()) goto(() => enterHub());
}
function screenVictory() {
  drawSynthwave();
  const V = G && G.L && G.L.victory, vs = V && V.who && SPEAKERS[V.who];   // eigener Sieg-Text eines Finales (L.victory)
  if (vs && vs.draw) extCall(vs.draw, ctx, 20, 100, false, true);
  else ctx.drawImage(SPR.evilDimC, 20, 100, 102, 154);
  ctx.drawImage(Math.floor(T * 6) % 2 ? SPR.portO : SPR.portC, W - 122, 100, 102, 154);
  if (save.hat !== 'none') drawHat(ctx, save.hat, W - 122 + 7, 106, 6.2);
  txt((V && V.title) || 'GEWONNEN!', W / 2, 16, { size: 32, align: 'center', color: (i) => neon(i * 2), wave: 4, shadow: '#000' });
  if (V && V.lines) V.lines.slice(0, 2).forEach((l, i) => txt(l, W / 2, 60 + i * 12, { font: i ? undefined : FS, align: 'center', color: '#ffd84a' }));
  else {
    txt('LIL PREITNER HAT RUSSIAN HACKER BOI BESIEGT', W / 2, 60, { font: FS, align: 'center', color: '#ffd84a' });
    txt('UND DAS TEBLEEDD ZURÜCKGEHOLT!', W / 2, 72, { align: 'center', color: '#ffd84a' });
  }
  const s = save.stats;
  [['SPIELZEIT', fmtTime(s.time)], ['ERLEDIGT', s.kills], ['TODE', s.deaths], ['GAME OVERS', s.gameOvers], ['KONTO', save.money + '€'], ['CASINO +/-', (s.casinoWon - s.casinoLost) + '€']].forEach((r, i) => {
    txt(r[0], 150, 100 + i * 14, { font: FS, color: '#ffffff' });
    txt(String(r[1]), 330, 100 + i * 14, { font: FS, align: 'right', color: '#7ff' });
  });
  txt('DANKE FÜRS SPIELEN!', W / 2, 196, { align: 'center', color: (i) => neon(i) });
  txt('IN DER STADT KANNST DU WEITER LEVEL FARMEN, ZOCKEN UND HÜTE KAUFEN.', W / 2, 212, { font: FS, align: 'center', color: '#cccccc' });
  if (stateT > 2 && Math.floor(T * 2) % 2 === 0) txt('[ENTER] ZURÜCK IN DIE STADT', W / 2, 240, { font: FS, align: 'center', color: '#aaaaaa' });
  if (uiActive() && stateT > 2 && anyConfirm()) goto(() => enterHub());
}
const fmtTime = (s) => (s >= 3600 ? Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') : Math.floor(s / 60)) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
