"use strict";
// =====================================================================
//  PREITEN GAMES – Logik: Logo, Modul-Auswahl, Server-Status, Sounds
// =====================================================================

const COLORS = ["#e0262c", "#ffc800", "#1fa83d", "#1f4fd8"];
const games = (window.PREITEN_CONFIG && window.PREITEN_CONFIG.games) || [];
const status = {}; // id -> "online" | "offline" | "checking" | "locked"
let selected = 0;

// ---------------------------------------------------------------- Sounds
let audio = null;
function blip(freq = 660, dur = 0.07, type = "square") {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.06, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur);
  } catch {
    /* kein Audio – egal */
  }
}
const sfxMove = () => blip(520, 0.05);
const sfxStart = () => { blip(660, 0.08); setTimeout(() => blip(990, 0.12), 80); };
const sfxError = () => blip(160, 0.2, "sawtooth");

// ---------------------------------------------------------------- Logo
document.querySelectorAll(".logo-row").forEach((row, r) => {
  const word = row.dataset.word;
  [...word].forEach((ch, i) => {
    const s = document.createElement("span");
    s.textContent = ch;
    if (!row.classList.contains("gold")) s.style.setProperty("--c", "#f4f1ff");
    s.style.setProperty("--d", `${(i + r * 7) * 0.06}s`);
    row.appendChild(s);
  });
});
document.getElementById("year").textContent = new Date().getFullYear();

// ---------------------------------------------------------------- Pixel-Grafiken
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function drawWars(cv) {
  const W = 64, H = 40;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const rand = rng(7);
  const blobs = Array.from({ length: 7 }, () => ({ x: 8 + rand() * 48, y: 6 + rand() * 28, r: 6 + rand() * 9 }));
  const land = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0;
    for (const b of blobs) v += Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.r * b.r));
    v += (rand() - 0.5) * 0.25;
    land[y * W + x] = v > 0.55;
  }
  const seeds = [
    { x: 14, y: 12, c: "#e0262c" },
    { x: 46, y: 26, c: "#ffc800" },
    { x: 30, y: 30, c: "#9b5de5" },
    { x: 50, y: 10, c: "#3563f2" },
  ];
  const owner = new Int8Array(W * H).fill(-1);
  for (let i = 0; i < W * H; i++) {
    if (!land[i]) continue;
    const x = i % W, y = (i / W) | 0;
    let best = -1, bd = 1e9;
    seeds.forEach((s, k) => {
      const d = (x - s.x) ** 2 + (y - s.y) ** 2;
      if (d < bd) { bd = d; best = k; }
    });
    if (bd < 110) owner[i] = best;
  }
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i / W) | 0;
    let col;
    if (!land[i]) {
      const coast = [i - 1, i + 1, i - W, i + W].some((n) => n >= 0 && n < W * H && land[n]);
      col = coast ? "#6f9cf0" : (x + y) % 7 === 0 ? "#2a63d4" : "#2f6fe4";
    } else if (owner[i] >= 0) {
      const o = owner[i];
      const border = [i - 1, i + 1, i - W, i + W].some((n) => n >= 0 && n < W * H && owner[n] !== o);
      col = border ? shade(seeds[o].c, 0.5) : seeds[o].c;
    } else {
      const coast = [i - 1, i + 1, i - W, i + W].some((n) => n >= 0 && n < W * H && !land[n]);
      col = coast ? "#f4d26b" : rand() < 0.08 ? "#b9a68c" : "#6cc644";
    }
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  }
  // kleines Boot
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, 33, 4, 1);
  ctx.fillStyle = "#e0262c";
  ctx.fillRect(5, 34, 2, 1);
}

function drawQuestion(cv, color) {
  const map = [
    "..#####..",
    ".##...##.",
    ".##...##.",
    "......##.",
    ".....##..",
    "....##...",
    "....##...",
    ".........",
    "....##...",
    "....##...",
  ];
  const W = 32, H = 20;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = shade(color, 0.35);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = shade(color, 0.45);
  for (let y = 0; y < H; y += 2) for (let x = (y / 2) % 2 ? 1 : 0; x < W; x += 2) ctx.fillRect(x, y, 1, 1);
  const ox = 11, oy = 5;
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== "#") return;
    ctx.fillStyle = "#0b0720";
    ctx.fillRect(ox + x + 1, oy + y + 1, 1, 1);
  }));
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== "#") return;
    ctx.fillStyle = "#ffc800";
    ctx.fillRect(ox + x, oy + y, 1, 1);
  }));
}

function drawImage(cv, src, color) {
  // Bild klein rechnen -> wirkt wie eine Pixel-Grafik auf dem Etikett
  const W = 64, H = 40;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = shade(color, 0.45);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = shade(color, 0.55);
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
  const img = new Image();
  img.onload = () => {
    const h = H - 2, w = Math.round((img.width / img.height) * h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, Math.round((W - w) / 2), 2, w, h);
  };
  img.src = src;
}

// ---------------------------------------------------------------- Module bauen
const shelf = document.getElementById("shelf");
const carts = games.map((g, i) => {
  const b = document.createElement("button");
  b.className = "cart" + (g.url === null ? " locked" : "");
  b.type = "button";
  b.setAttribute("role", "option");
  b.style.setProperty("--label", g.label || COLORS[i % COLORS.length]);
  b.innerHTML = `
    <span class="label">
      <canvas aria-hidden="true"></canvas>
      <span class="cart-title"></span>
    </span>
    <span class="n64">PREITEN 64</span>`;
  b.querySelector(".cart-title").textContent = g.title;
  const cv = b.querySelector("canvas");
  if (g.art === "wars") drawWars(cv);
  else if (g.art === "image" && g.image) drawImage(cv, g.image, g.label || "#3b2f72");
  else drawQuestion(cv, g.label || "#3b2f72");
  b.addEventListener("click", () => {
    if (selected === i) play(i);
    else select(i, true);
  });
  shelf.appendChild(b);
  return b;
});

// ---------------------------------------------------------------- Auswahl & Details
const details = document.getElementById("details");
function statusText(id) {
  return { online: "Server online", offline: "Server offline", checking: "Server startet … (bis zu 1 Min)", locked: "Gesperrt" }[status[id]] || "";
}
function renderDetails() {
  const g = games[selected];
  if (!g) { details.hidden = true; return; }
  const st = status[g.id];
  details.innerHTML = `
    <h3></h3>
    <p class="desc"></p>
    <div class="tags"></div>
    <div class="status ${st || ""}">${statusText(g.id)}</div>
    <div class="details-actions">
      <button class="btn ${g.url === null ? "" : "btn-green"} big" id="play-btn" ${g.url === null ? "disabled" : ""}>
        ${g.url === null ? "🔒 Gesperrt" : "▶ Spielen"}
      </button>
    </div>`;
  details.querySelector("h3").textContent = g.title;
  details.querySelector(".desc").textContent = g.description || "";
  const tags = details.querySelector(".tags");
  (g.tags || []).forEach((t) => {
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = t;
    tags.appendChild(s);
  });
  details.querySelector("#play-btn").addEventListener("click", () => play(selected));
}
function select(i, sound) {
  selected = (i + games.length) % games.length;
  carts.forEach((c, k) => c.setAttribute("aria-selected", k === selected ? "true" : "false"));
  carts[selected].focus({ preventScroll: true });
  if (sound) sfxMove();
  renderDetails();
}

// ---------------------------------------------------------------- Server-Status
async function checkServer(g, tries = 0) {
  if (g.url === null) { status[g.id] = "locked"; return; }
  if (!g.url) { status[g.id] = "offline"; return; }
  if (tries === 0) { status[g.id] = "checking"; renderDetails(); }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    // no-cors: Antwort ist nicht lesbar, aber ein Netzwerkfehler heißt "noch nicht da".
    // Ein schlafender Gratis-Server (Render) wird durch diese Anfrage aufgeweckt.
    await fetch(g.url, { mode: "no-cors", cache: "no-store", signal: ctrl.signal });
    status[g.id] = "online";
  } catch {
    // Server wacht gerade auf: bis zu ~3 Minuten weiter probieren
    if (tries < 18) { clearTimeout(timer); setTimeout(() => checkServer(g, tries + 1), 1000); return; }
    status[g.id] = "offline";
  } finally {
    clearTimeout(timer);
  }
  if (games[selected] === g) renderDetails();
}

// ---------------------------------------------------------------- Spielen
const dialog = document.getElementById("dialog");
function showDialog(title, text) {
  document.getElementById("dialog-title").textContent = title;
  document.getElementById("dialog-text").textContent = text;
  dialog.hidden = false;
  document.getElementById("dialog-ok").focus();
}
document.getElementById("dialog-ok").addEventListener("click", () => {
  dialog.hidden = true;
  carts[selected] && carts[selected].focus();
});
function play(i) {
  const g = games[i];
  if (!g) return;
  if (g.url === null) { sfxError(); return showDialog("Gesperrt", "Dieses Spiel ist noch nicht fertig. Bald verfügbar!"); }
  if (!g.url) {
    sfxError();
    return showDialog("Server offline", "Das Spiel ist gerade nicht erreichbar. Versuch es später nochmal!");
  }
  sfxStart();
  setTimeout(() => { window.location.href = g.url; }, 250);
}

// ---------------------------------------------------------------- Tastatur
document.addEventListener("keydown", (e) => {
  if (!dialog.hidden) {
    if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); dialog.hidden = true; }
    return;
  }
  if (!games.length) return;
  if (e.key === "ArrowRight") { e.preventDefault(); select(selected + 1, true); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); select(selected - 1, true); }
  else if (e.key === "Enter" && document.activeElement && document.activeElement.classList.contains("cart")) {
    e.preventDefault();
    play(selected);
  }
});
document.querySelectorAll("[data-sfx]").forEach((el) => el.addEventListener("click", () => sfxMove()));

// ---------------------------------------------------------------- Start
if (games.length) {
  carts.forEach((c, k) => c.setAttribute("aria-selected", k === 0 ? "true" : "false"));
  renderDetails();
  games.forEach((g) => checkServer(g));   // weckt schlafende Server gleich beim Öffnen der Seite
} else {
  details.hidden = true;
}
