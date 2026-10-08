'use strict';
// =====================================================================
//  STAFFEL 2 - Einsortierer: die Level-Dateien legen ihre Level unter
//  S2_LEVEL_DEFS[li] = { level, building } ab. Hier werden sie in der
//  richtigen Reihenfolge (Index 19..33) in LEVELS und BUILDINGS eingefügt.
//  Fehlt ein Level, hört die Kette dort auf (nie Lücken in LEVELS).
// =====================================================================
(function s2PushLevels() {
  const defs = globalThis.S2_LEVEL_DEFS || {};
  for (let li = 19; li <= 33; li++) {
    const d = defs[li];
    if (!d || !d.level || LEVELS.length !== li) break;
    LEVELS.push(d.level);
    if (d.building) BUILDINGS.push(Object.assign({}, d.building, { mission: li }));
  }
})();
