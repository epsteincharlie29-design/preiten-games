'use strict';
// =====================================================================
//  STAFFEL 2: DER SAFT-KRIEG - Story (Präfix s2s_)
//  Gesprächspartner GUNZER + MR. BITTER (Porträts 102x154, prozedural),
//  Anrufe s2intro1..s2intro15, Finale s2ending + S2_VICTORY,
//  LEVEL_OUTROS 19..33, Anleitungs-Seite "STAFFEL 2".
//  Muss VOR der Level-Datei geladen werden (S2_VICTORY wird dort benutzt).
// =====================================================================

// ---------- Porträts (51x77 gemalt, 2x skaliert) ----------
const s2s_SPR = {};

// GUNZER: Lils bester Freund. Wuschelkopf, Sommersprossen, rotes Shirt voller O-Saft.
function s2s_drawGunzer(g, open) {
  const skin = '#f0c090', skin2 = '#d8a070', hair = '#6a3a18', hair2 = '#8a5228', shirt = '#c41f2a', shirt2 = '#9a1520';
  const juice = '#ff9a1a', juice2 = '#ffc04d';
  // Körper / T-Shirt
  g.fillStyle = shirt; g.fillRect(3, 62, 45, 15); pxEll(g, 25, 63, 23, 6, shirt);
  g.fillStyle = shirt2; g.fillRect(3, 70, 6, 7); g.fillRect(42, 70, 6, 7); g.fillRect(17, 58, 17, 3);
  // Hals
  g.fillStyle = skin2; g.fillRect(20, 52, 11, 8);
  g.fillStyle = shirt2; pxEll(g, 25, 59, 7, 2, shirt2);
  // O-Saft-Flecken (Running Gag) - groß, klein, ein Tropfen
  pxEll(g, 16, 68, 4, 3, juice); pxEll(g, 15, 67, 2, 1, juice2); g.fillStyle = juice; g.fillRect(17, 71, 2, 3);
  pxEll(g, 33, 73, 3, 2, juice); g.fillStyle = juice2; g.fillRect(32, 72, 1, 1);
  g.fillStyle = juice; g.fillRect(27, 65, 2, 2); g.fillRect(40, 66, 1, 1); g.fillRect(9, 74, 2, 1);
  // "GUNZ" auf dem Shirt (winzig)
  g.fillStyle = '#ffffff'; g.fillRect(21, 63, 1, 3); g.fillRect(22, 63, 2, 1); g.fillRect(22, 65, 2, 1); g.fillRect(23, 64, 1, 1);
  g.fillRect(25, 63, 1, 3); g.fillRect(27, 63, 1, 3); g.fillRect(26, 65, 1, 1);
  // Kopf
  pxEll(g, 10, 38, 3, 4, skin2); pxEll(g, 40, 38, 3, 4, skin2);
  pxEll(g, 25, 36, 15, 18, skin);
  g.fillStyle = skin2; g.fillRect(12, 46, 2, 4); g.fillRect(37, 46, 2, 4);
  // Haare: wilder Wuschelkopf mit Wirbel
  pxEll(g, 25, 21, 17, 9, hair);
  g.fillStyle = hair; g.fillRect(9, 20, 4, 14); g.fillRect(38, 20, 4, 14);
  for (let i = 0; i < 9; i++) { const x = 9 + i * 4; g.fillRect(x, 13 - (i % 3) * 2, 3, 4); }
  g.fillRect(26, 6, 2, 5); g.fillRect(28, 4, 2, 3); g.fillRect(30, 3, 2, 2);   // Wirbel
  g.fillStyle = hair2; for (let i = 0; i < 12; i++) g.fillRect(11 + Math.floor(hash(i, 11) * 28), 15 + Math.floor(hash(i, 5) * 9), 2, 1);
  g.fillStyle = hair; g.fillRect(14, 27, 6, 2); g.fillRect(22, 27, 3, 3); g.fillRect(30, 27, 7, 2);   // Pony
  // Augenbrauen (hoch = gut gelaunt)
  g.fillStyle = hair; g.fillRect(15, 31, 7, 2); g.fillRect(29, 31, 7, 2);
  // Augen: groß und fröhlich
  g.fillStyle = '#ffffff'; g.fillRect(15, 34, 7, 5); g.fillRect(29, 34, 7, 5);
  g.fillStyle = '#3a6ad0'; g.fillRect(17, 35, 3, 4); g.fillRect(31, 35, 3, 4);
  g.fillStyle = '#111111'; g.fillRect(18, 36, 2, 2); g.fillRect(32, 36, 2, 2);
  g.fillStyle = '#ffffff'; g.fillRect(17, 35, 1, 1); g.fillRect(31, 35, 1, 1);
  // Nase + Sommersprossen
  g.fillStyle = skin2; g.fillRect(24, 39, 3, 5); g.fillRect(23, 43, 5, 1);
  g.fillStyle = '#c87a50'; for (const [fx, fy] of [[14, 42], [17, 43], [15, 44], [34, 42], [36, 43], [33, 44]]) g.fillRect(fx, fy, 1, 1);
  // Bäckchen
  g.fillStyle = 'rgba(255,90,90,0.35)'; g.fillRect(12, 43, 5, 3); g.fillRect(34, 43, 5, 3);
  // Mund: breites Grinsen bzw. lachend offen
  if (open) {
    pxEll(g, 25, 49, 7, 4, '#5a0a10');
    g.fillStyle = '#ffffff'; g.fillRect(19, 46, 13, 2);
    g.fillStyle = '#ff6a7a'; g.fillRect(22, 51, 7, 2);
  } else {
    g.fillStyle = '#7a2a1a'; g.fillRect(18, 48, 15, 1); g.fillRect(17, 47, 1, 1); g.fillRect(33, 47, 1, 1);
    g.fillStyle = '#ffffff'; g.fillRect(20, 49, 11, 1);
  }
  // O-Saft-Tropfen am Kinn (natürlich)
  g.fillStyle = juice; g.fillRect(31, 51, 2, 2); g.fillRect(32, 53, 1, 2);
  // Saftpäckchen mit Strohhalm in der Hand (unten rechts)
  g.fillStyle = skin; g.fillRect(38, 70, 9, 7);
  g.fillStyle = juice; g.fillRect(39, 58, 8, 12); g.fillStyle = juice2; g.fillRect(40, 59, 2, 10);
  g.fillStyle = '#3aaa4a'; g.fillRect(42, 62, 3, 3);
  g.fillStyle = '#ffffff'; g.fillRect(44, 52, 1, 6); g.fillRect(45, 51, 2, 1);
}

// MR. BITTER: Chef von BITTERLEMON INC. Zitronenkopf, Monokel, verkniffener Sauer-Mund.
function s2s_drawBitter(g, open) {
  const skin = '#e6d58a', skin2 = '#c8b460', suit = '#1c1c26', suit2 = '#2c2c3a', lemon = '#ffe14d', grey = '#a8a8b0';
  // Anzug + Hemd + Zitronen-Krawatte
  g.fillStyle = suit; g.fillRect(2, 62, 47, 15); pxEll(g, 25, 63, 24, 6, suit);
  g.fillStyle = '#f4f4f4'; g.fillRect(19, 57, 13, 20);
  g.fillStyle = suit2; for (let i = 0; i < 8; i++) { g.fillRect(12 + i, 58 + i * 2, 4, 2); g.fillRect(35 - i, 58 + i * 2, 4, 2); }
  g.fillStyle = lemon; g.fillRect(23, 59, 5, 3); g.fillRect(24, 62, 3, 11); g.fillRect(23, 72, 5, 2);
  g.fillStyle = '#c8a800'; g.fillRect(25, 63, 1, 9);
  pxEll(g, 11, 66, 2, 2, lemon); g.fillStyle = '#3aaa4a'; g.fillRect(12, 63, 2, 1);   // Zitronen-Anstecker
  // Hals
  g.fillStyle = skin2; g.fillRect(20, 52, 11, 6);
  // Kopf: Zitronenform (oben und unten spitz)
  pxEll(g, 25, 35, 15, 18, skin);
  g.fillStyle = skin; g.fillRect(23, 14, 5, 4); g.fillRect(24, 12, 3, 2); g.fillRect(23, 53, 5, 2);
  g.fillStyle = '#3aaa4a'; g.fillRect(26, 9, 4, 2); g.fillRect(29, 8, 3, 2);   // Blättchen
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(17, 20, 6, 2); g.fillRect(16, 22, 2, 3);   // Glatze glänzt
  // graue, angeklatschte Seitenhaare
  g.fillStyle = grey; g.fillRect(10, 27, 4, 14); g.fillRect(37, 27, 4, 14); g.fillRect(12, 24, 3, 4); g.fillRect(36, 24, 3, 4);
  // Ohren
  pxEll(g, 9, 37, 2, 4, skin2); pxEll(g, 41, 37, 2, 4, skin2);
  // böse Augenbrauen (schräg nach innen)
  g.fillStyle = '#4a4a52';
  for (let i = 0; i < 7; i++) { g.fillRect(14 + i, 28 + Math.floor(i / 2), 1, 2); g.fillRect(36 - i, 28 + Math.floor(i / 2), 1, 2); }
  // Augen: zusammengekniffen
  g.fillStyle = '#ffffff'; g.fillRect(16, 33, 6, 3); g.fillRect(29, 33, 6, 3);
  g.fillStyle = '#2a6a2a'; g.fillRect(19, 33, 2, 3); g.fillRect(30, 33, 2, 3);
  g.fillStyle = skin2; g.fillRect(16, 32, 6, 1); g.fillRect(29, 32, 6, 1);
  // Monokel (rechtes Auge) + Kette
  g.fillStyle = '#d8b030';
  g.fillRect(27, 30, 10, 1); g.fillRect(27, 39, 10, 1); g.fillRect(27, 31, 1, 8); g.fillRect(36, 31, 1, 8);
  g.fillStyle = 'rgba(200,240,255,0.35)'; g.fillRect(28, 31, 8, 8);
  g.fillStyle = '#ffffff'; g.fillRect(34, 32, 1, 2);
  g.fillStyle = '#d8b030'; for (let i = 0; i < 9; i++) g.fillRect(37 + Math.floor(i / 3), 40 + i * 2, 1, 1);
  // Nase (lang, spitz)
  g.fillStyle = skin2; g.fillRect(24, 36, 3, 8); g.fillRect(23, 43, 5, 1);
  // Falten (sauer!)
  g.fillStyle = skin2; g.fillRect(17, 44, 1, 4); g.fillRect(33, 44, 1, 4); g.fillRect(14, 38, 2, 1); g.fillRect(36, 38, 2, 1);
  // Bleistift-Schnurrbart
  g.fillStyle = '#4a4a52'; g.fillRect(19, 45, 5, 1); g.fillRect(27, 45, 5, 1); g.fillRect(18, 46, 1, 1); g.fillRect(32, 46, 1, 1);
  // Mund: zusammengekniffener Zitronen-Mund bzw. Fletschen
  if (open) {
    g.fillStyle = '#3a0a0a'; g.fillRect(19, 47, 13, 5);
    g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) g.fillRect(20 + i * 2, 47, 1, 2);
    g.fillStyle = '#ffe14d'; g.fillRect(24, 50, 3, 1);   // saurer Spucke-Funke
  } else {
    pxEll(g, 25, 49, 3, 1, '#7a3a2a');
    g.fillStyle = '#7a3a2a'; g.fillRect(22, 48, 1, 1); g.fillRect(28, 48, 1, 1);
    g.fillStyle = skin2; g.fillRect(24, 51, 3, 1);
  }
}

for (const k of ['C', 'O']) {
  let [c, g] = mkCanvas(51, 77); s2s_drawGunzer(g, k === 'O'); s2s_SPR['gunzer' + k] = c;
  s2s_SPR['gunzerDim' + k] = tint(c, 'rgba(30,0,50,0.6)');
  [c, g] = mkCanvas(51, 77); s2s_drawBitter(g, k === 'O'); s2s_SPR['bitter' + k] = c;
  s2s_SPR['bitterDim' + k] = tint(c, 'rgba(30,0,50,0.6)');
}
function s2s_portrait(id) {
  return (g, x, y, open, dim) => g.drawImage(s2s_SPR[id + (dim ? 'Dim' : '') + (open && !dim ? 'O' : 'C')], x, y, 102, 154);
}
SPEAKERS.gunzer = { name: 'GUNZER', col: '#ff9a1a', ring: 'GUNZER RUFT AN... (ER HAT SICH SCHON WIEDER ANGEGUNZT)', draw: s2s_portrait('gunzer') };
SPEAKERS.bitter = { name: 'MR. BITTER', col: '#ffe14d', ring: 'UNTERDRÜCKTE NUMMER... ES RIECHT NACH ZITRONE.', draw: s2s_portrait('bitter') };

// ---------- Anrufe ----------
const s2s_R = (text) => ({ who: 'rhb', text }), s2s_L = (text) => ({ who: 'lil', text }),
  s2s_G = (text) => ({ who: 'gunzer', text }), s2s_B = (text) => ({ who: 'bitter', text }), s2s_E = (text) => ({ who: 'evil', text });

Object.assign(DIALOGS, {
  // S2-1 GUNZERS GEBURTSTAGSPARTY (slippery)
  s2intro1: [
    s2s_R('PRIVET, LIL. ICH BIN ES. NICHT AUFLEGEN!'),
    s2s_L('RUSSIAN HACKER BOI?! ICH HAB DICH DOCH BESIEGT!'),
    s2s_R('JA. DANKE NOCHMAL DAFÜR. ABER JEMAND HAT DAS TEBLEEDD GEKLONT: BITTERLEMON INC.'),
    s2s_R('DIE BAUEN "TEBLEEDD MAX" UND WOLLEN DIE GANZE STADT IN BITTERZITRONENSAFT VERWANDELN.'),
    s2s_R('ICH BIN JETZT DER GUTE. GLAUBE ICH. ALSO HELFE ICH DIR. FÜR NUR 10 PROZENT.'),
    s2s_G('LIL! LIL! BIST DU DA? MEINE GEBURTSTAGSPARTY WIRD GERADE VON ZITRONEN-TYPEN GESTÜRMT!'),
    s2s_L('GUNZER? WIESO BIST DU IN DIESEM ANRUF?'),
    s2s_R('ICH HAB IHN DAZUGESCHALTET. ICH BIN HACKER. DAS IST MEIN DING.'),
    s2s_G('UND ICH HAB VOR SCHRECK DIE GANZE O-SAFT-BOWLE UMGEKIPPT. OIDA, SCHON WIEDER ANGEGUNZT!'),
    s2s_R('TIPP: DER BODEN IST VOLLER SAFTPFÜTZEN. DU RUTSCHST - DIE GEGNER AUCH. LASS SIE HINFALLEN!'),
    s2s_L('ICH KOMME. HEB MIR EIN STÜCK KUCHEN AUF.'),
    s2s_G('DER KUCHEN IST AUCH VOLL SAFT. ABER OK!'),
  ],
  // S2-2 MUSEUM DER ALTEN SÄFTE (alarm, cameras)
  s2intro2: [
    s2s_B('GUTEN ABEND, LIL PREITNER. HIER SPRICHT MR. BITTER. CHEF VON BITTERLEMON INC.'),
    s2s_L('WOHER HABEN ALLE IMMER MEINE NUMMER?!'),
    s2s_B('SIE HABEN MEINE PARTY-ABTEILUNG ZERLEGT. DAS WAR... SÜSS. ICH HASSE SÜSS.'),
    s2s_B('BALD IST DIESE STADT SAUER. BITTER. UND GANZ GELB. GUTE NACHT.'),
    s2s_R('...ER IST WEG. GRUSELIG, ODER? JETZT WEISST DU, WIE DU DICH BEI MIR GEFÜHLT HAST.'),
    s2s_R('AUFTRAG: IM MUSEUM DER ALTEN SÄFTE LIEGT DER BAUPLAN VOM TEBLEEDD MAX. HOL IHN.'),
    s2s_R('ABER LEISE! SIEHT DICH EINER, GEHT DER ALARM LOS. DANN KOMMT VERSTÄRKUNG AUS DEN TÜREN.'),
    s2s_R('UND DIE KAMERAS AN DEN WÄNDEN: NICHT IN DEN KEGEL LAUFEN. ODER KAPUTTHAUEN.'),
    s2s_G('OHNE ALARM GIBT ES BONUS-GELD! DAS STEHT AUF MEINEM SAFTPÄCKCHEN. GLAUB ICH.'),
    s2s_L('SCHLEICHEN. KANN ICH. MANCHMAL.'),
  ],
  // S2-3 RESTAURANT ZUR GOLDENEN PFANNE (fire, Boss koch)
  s2intro3: [
    s2s_R('DER BAUPLAN IST VERSCHLÜSSELT. MIT EINEM REZEPT. IM ERNST.'),
    s2s_R('DAS REZEPT HAT CHEFKOCH GULASCHO. RESTAURANT ZUR GOLDENEN PFANNE. ER KOCHT FÜR BITTER.'),
    s2s_G('DA WAR ICH MAL ESSEN! ICH HAB DIE SUPPE AUF MEIN HEMD GEKIPPT. ER HAT GEWEINT.'),
    s2s_L('WER? DU ODER ER?'),
    s2s_G('BEIDE.'),
    s2s_R('ACHTUNG: IN DER KÜCHE BRENNT ES. DAS FEUER BREITET SICH AUS. O-SAFT LÖSCHT ES!'),
    s2s_R('UND GULASCHO SELBST? SCHALTE SEINE 3 HERDE AUS. DANN RUTSCHT ER AUF SEINEM EIGENEN FETT AUS.'),
    s2s_B('MEIN KOCH IST UNBESIEGBAR. ER HAT EINE PFANNE AUS ZITRONENSTAHL.'),
    s2s_L('ICH AUCH. NUR OHNE ZITRONE.'),
  ],
  // S2-4 AQUARIUM BLUBBERWELT (flood, Boss hai)
  s2intro4: [
    s2s_R('DAS REZEPT HAT EINEN ZWEITEN TEIL. ER IST BEI KAPITÄN HAI. AQUARIUM BLUBBERWELT.'),
    s2s_L('EIN HAI ALS KAPITÄN? WER STELLT DEN EIN?'),
    s2s_R('BITTERLEMON. DIE NEHMEN JEDEN. SOGAR MICH HÄTTEN SIE GENOMMEN. HABEN SIE ABER NICHT. FRECHHEIT.'),
    s2s_R('BITTER HAT DIE BECKEN AUFGEDREHT. DAS WASSER STEIGT. ERST WIRST DU LANGSAM, DANN... BLUBB.'),
    s2s_R('ALSO: BEEIL DICH. NICHT TRÖDELN. NICHT DIE FISCHE STREICHELN.'),
    s2s_G('ICH HAB MEINE SCHWIMMFLÜGEL AN! UND DIE SIND VOLL MIT O-SAFT. FRAG NICHT.'),
    s2s_R('KAPITÄN HAI BEISST NUR. LOCK IHN IN DEN ELEKTROZAUN. DAS MAG ER GAR NICHT.'),
    s2s_B('MEIN HAI HAT 300 ZÄHNE. UND ZAHNSEIDE MIT ZITRONENGESCHMACK.'),
    s2s_L('ICH HAB EINEN ELEKTROZAUN. UND KEINE ANGST.'),
  ],
  // S2-5 BITTERLEMON ABFÜLLWERK (bomb)
  s2intro5: [
    s2s_R('MIT DEM REZEPT KANN ICH DEN BAUPLAN LESEN. ER SAGT: ALLES FÄNGT IM ABFÜLLWERK AN.'),
    s2s_R('DORT FÜLLEN SIE 1 MILLION FLASCHEN BITTERZITRONENSAFT FÜR DIE STADT AB.'),
    s2s_B('UND WENN SIE KOMMEN, LIL PREITNER, GEHT ALLES IN DIE LUFT. ICH HABE BOMBEN EINGEBAUT.'),
    s2s_L('IN DEINE EIGENE FABRIK?!'),
    s2s_B('ICH HABE VIELE FABRIKEN. SIE HABEN NUR EIN LEBEN. NA GUT, MEHRERE. ABER TROTZDEM.'),
    s2s_R('DIE BOMBE HAT EINEN COUNTDOWN. RENN ZUM BOMBEN-TERMINAL UND DRÜCK [E]. ODER ERLEDIGE ALLE.'),
    s2s_R('WENN ES BOOM MACHT, IST DIE ETAGE WEG. UND EIN LEBEN. UND MEINE NERVEN.'),
    s2s_G('ICH WARTE DRAUSSEN. ICH HAB MIR GERADE SAFT INS OHR GEKIPPT. FRAG NICHT WIE.'),
  ],
  // S2-6 HOTEL ZUM GOLDENEN SAFT (elevator, hostage)
  s2intro6: [
    s2s_G('LIL! NOTFALL! ICH WOLLTE IM HOTEL ZUM GOLDENEN SAFT NUR AM BUFFET... DU WEISST SCHON.'),
    s2s_G('UND JETZT HALTEN BITTERS LEUTE ALLE GÄSTE FEST! MICH NICHT. ICH BIN UNTERM TISCH. MIT SAFT.'),
    s2s_R('BITTER BRAUCHT DAS HOTEL ALS TESTGELÄNDE. JEDE DUSCHE SOLL ZITRONENSAFT SPUCKEN.'),
    s2s_R('DIE GEISELN SIND ZIVILISTEN. NICHT DRAUFSCHIESSEN! HINLAUFEN = BEFREIT = BONUS.'),
    s2s_R('UND IM AUFZUG-FLUR MUSST DU 45 SEKUNDEN DURCHHALTEN. DIE TÜREN SPUCKEN WELLE UM WELLE.'),
    s2s_B('ZIMMERSERVICE, LIL PREITNER. HEUTE GIBT ES NUR EINE SPEISE: NIEDERLAGE. MIT ZITRONE.'),
    s2s_L('ICH HÄTTE GERN DIE RECHNUNG.'),
    s2s_G('OIDA, DIE TISCHDECKE HAT JETZT AUCH FLECKEN. SCHON WIEDER ANGEGUNZT!'),
  ],
  // S2-7 SKIHÜTTE APRÈS-SAFT (slippery, blackout)
  s2intro7: [
    s2s_R('IN DEN HOTELAKTEN STEHT: BITTER HAT EINEN SAFT-SERVER IN DER SKIHÜTTE APRÈS-SAFT VERSTECKT.'),
    s2s_L('IN DEN BERGEN? WARUM?'),
    s2s_R('KÜHLUNG. SAFTSERVER WERDEN HEISS. JEDER WEISS DAS.'),
    s2s_R('ACHTUNG: GLATTEIS UND SAFTPFÜTZEN. UND BITTER SCHALTET DEN STROM AB.'),
    s2s_R('IM DUNKELN SIEHST DU NUR MIT DER TASCHENLAMPE. ABER DIE GEGNER SEHEN DICH AUCH SCHLECHTER.'),
    s2s_G('ICH BIN SCHON DA! ICH HAB MEINEN GLÜHWEIN MIT O-SAFT GETAUSCHT. ER IST JETZT IN MEINEM SCHAL.'),
    s2s_B('FRIEREN SIE SCHÖN, LIL PREITNER. ZITRONEN MÖGEN KÄLTE. SIE NICHT.'),
    s2s_L('ICH HAB EINE MÜTZE. UND EINE SCHROTFLINTE.'),
  ],
  // S2-8 RAUMSTATION SAFT-1 (zerog, Boss robo)
  s2intro8: [
    s2s_R('LIL... ICH MUSS DIR WAS SAGEN. DER SAFT-SERVER HAT DATEN INS ALL GESCHICKT.'),
    s2s_R('ZUR RAUMSTATION SAFT-1. UND DORT WARTET... EIN KLON. VON MIR. "RHB-KLON 2.0".'),
    s2s_L('ES GIBT ZWEI VON DIR?! DAS IST DIE SCHLIMMSTE NACHRICHT DES JAHRES.'),
    s2s_R('ER KOPIERT JEDE BEWEGUNG. WIE ICH. NUR OHNE CHARME. ZERSTÖR SEINE KÜHLMODULE!'),
    s2s_R('DORT OBEN GIBT ES KEINE SCHWERKRAFT. DU TREIBST. JEDER SCHUSS GIBT RÜCKSTOSS. GEWÖHN DICH DRAN.'),
    s2s_G('ICH HAB IM SIMULATOR TRAINIERT! DER O-SAFT IST DABEI ALS KUGEL DURCH DIE KAPSEL GESCHWEBT.'),
    s2s_G('UND DANN IN MEIN GESICHT. ICH HAB MICH IN DER SCHWERELOSIGKEIT ANGEGUNZT. WELTREKORD!'),
    s2s_B('MEIN KLON IST BESSER ALS DAS ORIGINAL. WIE ALLES, WAS ICH KOPIERE.'),
    s2s_R('...DAS NEHM ICH PERSÖNLICH. MACH IHN FERTIG, LIL.'),
  ],
  // S2-9 DSCHUNGEL-ZOO (rewind)
  s2intro9: [
    s2s_R('DER KLON IST SCHROTT. ICH FÜHLE MICH... KOMISCH. ABER GUT KOMISCH.'),
    s2s_R('BITTER HAT IM DSCHUNGEL-ZOO EINE ZEITMASCHINE AUFGEBAUT. EINE KLEINE. FÜR SAFT.'),
    s2s_L('EINE ZEITMASCHINE FÜR SAFT?'),
    s2s_R('DAMIT SAFT NIE ABLÄUFT. ABER JETZT HÄNGT DER ZOO IN EINER ZEITSCHLEIFE.'),
    s2s_R('NORMAL ERLEDIGTE GEGNER STEHEN NACH 12 SEKUNDEN WIEDER AUF. MIT GLITCH.'),
    s2s_R('NUR WER PER HINRICHTUNG ([LEERTASTE]) ERLEDIGT WIRD, BLEIBT LIEGEN. MERK DIR DAS!'),
    s2s_G('EIN AFFE HAT MIR MEINEN SAFT GEKLAUT UND ÜBER MICH GEKIPPT. ZWEIMAL. WEGEN ZEITSCHLEIFE.'),
    s2s_B('IN MEINEM ZOO SIND SIE NUR EIN WEITERES TIER, LIL PREITNER. EIN SÜSSES. IGITT.'),
  ],
  // S2-10 DISCO INFERNO 2 (strobe, Boss dj)
  s2intro10: [
    s2s_R('ERINNERST DU DICH AN DEN CLUB BASSBOX? ER HEISST JETZT "DISCO INFERNO 2". BITTER HAT IHN GEKAUFT.'),
    s2s_R('DER DJ DORT HEISST DJ BASSDROP. SEINE MUSIK MACHT LEUTE SAUER. WÖRTLICH.'),
    s2s_R('DAS STROBOSKOP BLINKT IM TAKT. DIE GEGNER SEHEN DICH NUR, WENN ES HELL IST. TANZ IM DUNKELN!'),
    s2s_R('DJ BASSDROP GREIFT IM TAKT AN. STECK SEINE 3 BOXEN AUS, DANN IST ER WEHRLOS.'),
    s2s_G('ICH TANZE SCHON! ICH HAB DABEI MEINEN SAFT... DU AHNST ES.'),
    s2s_L('ANGEGUNZT?'),
    s2s_G('VOLL ANGEGUNZT. ABER IM TAKT!'),
    s2s_B('DROP THE BASS? NEIN. DROP THE LIL.'),
  ],
  // S2-11 SENIORENRESIDENZ ABENDROT (hostage, Boss oma)
  s2intro11: [
    s2s_G('LIL! MEINE OMA WOHNT IN DER SENIORENRESIDENZ ABENDROT. BITTER HAT DORT ALLES BESETZT!'),
    s2s_R('ER TESTET DORT SEIN SAFT-REZEPT. DIE SENIOREN SIND GEISELN. ALSO: NICHT DRAUFSCHIESSEN!'),
    s2s_R('UND DIE ETAGE IST ERST FREI, WENN ALLE GEISELN BEFREIT SIND. HINLAUFEN, ANTIPPEN, FERTIG.'),
    s2s_R('DIE CHEFIN DORT IST OMA TURBO. RASERIN MIT ROLLATOR. 80 SACHEN IM FLUR.'),
    s2s_R('LASS SIE ÜBER SAFTPFÜTZEN RASEN. DANN RUTSCHT SIE AUS UND IST KURZ WEHRLOS.'),
    s2s_G('SAFTPFÜTZEN? DA KANN ICH HELFEN. ICH BIN EINE WANDELNDE SAFTPFÜTZE.'),
    s2s_B('OMA TURBO IST MEINE BESTE MITARBEITERIN. SIE STRICKT SOGAR MIT ZITRONENGARN.'),
    s2s_L('ICH HAB RESPEKT VOR OMAS. ABER NICHT VOR DIESER.'),
  ],
  // S2-12 MR. BITTERS YACHT (flood, escort)
  s2intro12: [
    s2s_R('GUTE NACHRICHT: ICH WEISS, WO DER ZUGANGSCODE ZUM TOWER IST. AUF MR. BITTERS YACHT.'),
    s2s_R('SCHLECHTE NACHRICHT: NUR GUNZER KANN IHN LESEN. ER IST DER EINZIGE MIT ZITRONEN-ALLERGIE-AUSWEIS.'),
    s2s_G('ICH KOMME MIT! ICH HAB SCHON MEINE KAPITÄNSMÜTZE AUF. SIE IST NASS. VON SAFT.'),
    s2s_R('GUNZER FOLGT DIR. MIT [E] SAGST DU "KOMM!" ODER "WARTE!". OHNE IHN GEHT DER AUSGANG NICHT AUF.'),
    s2s_R('UND PASS AUF IHN AUF. WENN IHM WAS PASSIERT, FÄNGT DIE ETAGE VON VORN AN.'),
    s2s_R('BITTER FLUTET DIE UNTEREN DECKS. WASSER MACHT LANGSAM. ZU VIEL WASSER MACHT... BLUBB.'),
    s2s_B('WILLKOMMEN AN BORD. DAS BUFFET IST BITTER, DIE BEDIENUNG IST BEWAFFNET.'),
    s2s_G('OIDA, ICH HAB MICH SCHON AN DER GANGWAY ANGEGUNZT!'),
    s2s_L('BLEIB EINFACH HINTER MIR. UND HALT DEN SAFT GERADE.'),
  ],
  // S2-13 BUNKER 13 (alarm, blackout, cameras)
  s2intro13: [
    s2s_R('MIT DEM CODE KOMMEN WIR IN DEN TOWER. FAST. ERST BRAUCHEN WIR DEN NOTSTROM-SCHLÜSSEL.'),
    s2s_R('DER LIEGT IN BUNKER 13. ALTES MILITÄRZEUG. JETZT BITTERS SAFT-LAGER.'),
    s2s_R('DORT IST ALLES: ALARM, KAMERAS UND STROMAUSFALL. DER STEALTH-ALBTRAUM.'),
    s2s_R('KAMERAS KAPUTTHAUEN, IM DUNKELN BLEIBEN, NIEMAND DARF DICH SEHEN. DANN GIBT ES BONUS.'),
    s2s_L('UND WENN MICH DOCH EINER SIEHT?'),
    s2s_R('DANN RENNST DU. UND ICH TU SO, ALS HÄTTE ICH NIE ANGERUFEN.'),
    s2s_G('ICH HALTE DRAUSSEN WACHE! MIT TASCHENLAMPE! ...WO IST DER SCHALTER? OH. SAFT. ÜBERALL.'),
    s2s_B('BUNKER 13 HAT NOCH NIE JEMAND LEBEND VERLASSEN. NA GUT, DER HAUSMEISTER. ABER DER ZÄHLT NICHT.'),
  ],
  // S2-14 DIE ZENTRIFUGE (rewind, bomb)
  s2intro14: [
    s2s_R('LETZTER SCHRITT VOR DEM TOWER: DIE ZENTRIFUGE. DORT WIRD DER TEBLEEDD-MAX-KERN GESCHLEUDERT.'),
    s2s_R('UND JETZT HALT DICH FEST: ZEITSCHLEIFE UND BOMBE. GLEICHZEITIG.'),
    s2s_L('WER BAUT SOWAS?!'),
    s2s_B('ICH. ICH BAUE SOWAS. ICH HABE ES SOGAR PATENTIERT.'),
    s2s_R('GEGNER STEHEN WIEDER AUF, AUSSER DU RICHTEST SIE HIN. UND DIE UHR TICKT. ALSO: HINRICHTEN ODER TERMINAL.'),
    s2s_R('NICHT JEDEN GEGNER JAGEN. ZUM TERMINAL RENNEN UND [E] DRÜCKEN IST OFT SCHNELLER.'),
    s2s_G('ICH HAB MICH IN DER ZENTRIFUGE ANGEGUNZT. DER SAFT IST JETZT ÜBERALL GLEICHZEITIG.'),
    s2s_E('...ÜBRIGENS, LIL. FALLS DU STIRBST: DARF ICH DEIN AUTO HABEN?'),
    s2s_L('ICH DACHTE, DU BIST JETZT DER GUTE.'),
    s2s_R('ALTE GEWOHNHEIT. ENTSCHULDIGUNG. VIEL GLÜCK!'),
  ],
  // S2-15 BITTERLEMON TOWER (FINALE) (escort, fire, Boss bitter)
  s2intro15: [
    s2s_B('LIL PREITNER. SIE HABEN MEINEN KOCH, MEINEN HAI, MEINEN KLON UND MEINE OMA BESIEGT.'),
    s2s_B('KOMMEN SIE IN DEN TOWER. GANZ NACH OBEN. DORT WARTET TEBLEEDD MAX. UND ICH.'),
    s2s_B('UM MITTERNACHT DRÜCKE ICH DEN KNOPF. DANN IST DIE STADT EIN EINZIGES GLAS BITTERZITRONE.'),
    s2s_R('...ER LEGT IMMER SO DRAMATISCH AUF. ICH MUSS MIR DAS ABSCHAUEN.'),
    s2s_R('ALSO: GUNZER HAT DEN CODE. IN DER ERSTEN ETAGE FOLGT ER DIR. [E] = KOMM! / WARTE!'),
    s2s_R('WEITER OBEN BRENNT ES. BITTER HAT DIE SPRINKLER MIT ZITRONENSAFT GEFÜLLT. DER BRENNT. WARUM AUCH IMMER.'),
    s2s_R('MR. BITTER HAT 3 PHASEN: ANZUG, ZITRONEN-MECH UND DANN DER TEBLEEDD-MAX-KERN. NICHT AUFGEBEN!'),
    s2s_G('LIL... EGAL WAS PASSIERT: DU BIST MEINE BESTE FREUNDIN. AUCH WENN ICH DICH GLEICH ANGUNZE.'),
    s2s_L('GUNZER. HEUTE DARFST DU DICH SO VIEL ANGUNZEN, WIE DU WILLST.'),
    s2s_G('OIDA. DAS IST DAS SCHÖNSTE, WAS JE JEMAND ZU MIR GESAGT HAT.'),
  ],
  // nach dem Finale
  s2ending: [
    s2s_B('NEIN... NEIN! TEBLEEDD MAX, AKTIVIEREN! JETZT! ZITRONEN-MODUS!'),
    s2s_G('OH NEIN, ICH STOLPERE! MEIN GANZER O-SAFT FLIEGT GENAU IN DEN KERN!'),
    s2s_B('NICHT DER O-SAFT! DER IST SÜSS! TEBLEEDD MAX VERTRÄGT KEIN SÜSS! ER... ER...'),
    s2s_R('KURZSCHLUSS! HAHA! GUNZER, DU GENIE! DU HAST DEN TEBLEEDD MAX ANGEGUNZT!'),
    s2s_G('ICH HAB DAS GANZ BESTIMMT ABSICHTLICH GEMACHT. GENAU SO WAR DAS GEPLANT.'),
    s2s_B('DAS... IST... SO... SÜSS. ICH... KÜNDIGE.'),
    s2s_R('DIE STADT IST GERETTET. KEIN BITTERZITRONENSAFT. NUR GUTER, NORMALER O-SAFT.'),
    s2s_R('UND DAS ORIGINAL-TEBLEEDD IST DAS EINZIGE. WIE ES SEIN SOLL. ICH BIN FAST GERÜHRT.'),
    s2s_L('DU HAST DEINE 10 PROZENT VERDIENT, RHB. DIESES MAL.'),
    s2s_R('SPASIBO, LIL. ICH BIN WIRKLICH DER GUTE. GLAUBE ICH. ZU 80 PROZENT.'),
    s2s_G('LIL, KOMM! ICH LAD DICH AUF EINEN SAFT EIN. ICH TRAG IHN AUCH. ODER... AUF MIR.'),
    s2s_L('OIDA, GUNZER. NIE WIEDER OHNE DICH.'),
  ],
});
DIALOGS.s2intro1.ring = 'RUSSIAN HACKER BOI RUFT AN... SCHON WIEDER?!';
DIALOGS.s2intro2.ring = 'UNTERDRÜCKTE NUMMER... ES RIECHT NACH ZITRONE.';
DIALOGS.s2intro6.ring = 'GUNZER RUFT AN... UNTER EINEM TISCH.';
DIALOGS.s2intro11.ring = 'GUNZER RUFT AN... ER KLINGT BESORGT.';
DIALOGS.s2intro15.ring = 'MR. BITTER RUFT AN... DAS FINALE.';
DIALOGS.s2ending.ring = 'DER TEBLEEDD MAX SUMMT... GEFÄHRLICH.';

// Siegbildschirm nach dem Staffel-2-Finale (Level li 33: victory: S2_VICTORY)
const S2_VICTORY = {
  title: 'SAFT-SIEG!',
  lines: ['LIL, GUNZER UND RUSSIAN HACKER BOI HABEN BITTERLEMON INC. BESIEGT', 'DIE STADT BLEIBT SÜSS! (UND GUNZER KLEBRIG)'],
  who: 'gunzer',
};

// ---------- Nach jedem Level (LEVEL_OUTROS[19..33]) ----------
[
  'DIE PARTY IST GERETTET. GUNZER HAT 3 GESCHENKE BEKOMMEN: SAFT, SAFT UND EIN NEUES HEMD.',
  'DER BAUPLAN VOM TEBLEEDD MAX IST VERSCHLÜSSELT. MIT EINEM REZEPT. TYPISCH BITTER.',
  'GULASCHO LIEGT IM FETT. DAS REZEPT, TEIL 1: "MAN NEHME 1000 ZITRONEN UND KEIN HERZ."',
  'KAPITÄN HAI HAT AUSGEBISSEN. REZEPT, TEIL 2: "UND EINE PRISE TEBLEEDD." RHB WIRD BLASS.',
  'DIE BOMBE IST WEG, DIE FLASCHEN SIND KAPUTT. GUNZER BADET DRAUSSEN IN 1000 LITERN SAFT. GLÜCKLICH.',
  'DIE GEISELN SIND FREI. DIE HOTELRECHNUNG ZAHLT BITTERLEMON. DIE MINIBAR AUCH.',
  'DER SAFT-SERVER IST AUS. ER HAT NOCH SCHNELL DATEN INS ALL GEFUNKT. RHB SCHWEIGT VERDÄCHTIG.',
  'RHB-KLON 2.0 IST NUR NOCH SCHROTT. RHB SAGT: "ER HAT MEINE FRISUR. ABER NICHT MEIN HERZ."',
  'DIE ZEITSCHLEIFE IST GEBROCHEN. DER AFFE HAT GUNZERS SAFT TROTZDEM. FÜR IMMER.',
  'DJ BASSDROP IST AUSGESTECKT. DIE DISCO SPIELT WIEDER 8-BIT-BANGER VON RHB. ER WEINT VOR GLÜCK.',
  'OMA TURBO IST AUSGERUTSCHT. GUNZERS OMA SCHENKT DIR EINEN SCHAL. ER RIECHT NACH O-SAFT.',
  'GUNZER HAT DEN TOWER-CODE GELESEN: "ZITRONE123". BITTER IST NICHT SO SCHLAU WIE GEDACHT.',
  'DER NOTSTROM-SCHLÜSSEL GEHÖRT DIR. AUF DEM ANHÄNGER STEHT "BITTER". MIT HERZCHEN. KOMISCH.',
  'DER KERN IST VERLADEN. NÄCHSTE HALTESTELLE: BITTERLEMON TOWER. MR. BITTER WARTET GANZ OBEN.',
  'TEBLEEDD MAX IST ANGEGUNZT. DIE STADT IST SÜSS. GUNZER IST KLEBRIG. ALLES IST GUT.',
].forEach((t, i) => { LEVEL_OUTROS[19 + i] = t; });

// ---------- Anleitung: Staffel 2 ----------
GUIDE.push({ t: 'STAFFEL 2: DER SAFT-KRIEG', l: [
  'GLATT ....... SAFTPFÜTZEN: DU RUTSCHST - GEGNER AUCH (UND FALLEN HIN).',
  'ALARM ....... NICHT GESEHEN WERDEN! KAMERAS KAPUTTHAUEN. OHNE ALARM = BONUS.',
  'FEUER/FLUT .. FEUER BREITET SICH AUS (O-SAFT LÖSCHT). WASSER STEIGT: BEEILEN!',
  'BOMBE ....... COUNTDOWN! ZUM TERMINAL RENNEN UND [E] - ODER ALLE ERLEDIGEN.',
  'GEISELN ..... NICHT TREFFEN! HINLAUFEN = BEFREIT. AUFZUG: 45 SEK DURCHHALTEN.',
  'ZEITSCHLEIFE  GEGNER STEHEN WIEDER AUF - AUSSER NACH HINRICHTUNG [LEERTASTE].',
  'GUNZER ...... FOLGT DIR. [E] = KOMM!/WARTE! OHNE IHN KEIN AUSGANG.',
  'GULASCHO: 3 HERDE AUS. HAI: IN DEN ELEKTROZAUN. KLON: KÜHLMODULE KAPUTT.',
  'DJ BASSDROP: 3 BOXEN AUSSTECKEN. OMA TURBO: ÜBER SAFTPFÜTZEN RASEN LASSEN.',
  'MR. BITTER: 3 PHASEN - ANZUG, ZITRONEN-MECH, TEBLEEDD-MAX-KERN. DURCHHALTEN!',
  'JEDES S2-LEVEL SCHALTET EINE NEUE MASKE FREI. NEUE HÜTE GIBT ES IM KIOSK.'] });
