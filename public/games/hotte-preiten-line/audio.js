// =====================================================================
//  DIE HOTTE PREITEN LINE - Synth-Sound & Musik (alles live mit WebAudio erzeugt)
// =====================================================================
const Sound = (() => {
  let ac = null, master, musicGain, musicFilter, sfxGain, noiseBuf;
  let muted = false;
  let song = null, songName = '', step = 0, nextTime = 0;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = 0.8; master.connect(comp);
    musicFilter = ac.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 18000;
    musicGain = ac.createGain(); musicGain.gain.value = 0.32;
    musicGain.connect(musicFilter); musicFilter.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(scheduler, 25);
  }

  // ---------- Grundbausteine ----------
  function tone(o) {
    if (!ac) return;
    const t = (o.t || ac.currentTime);
    const dur = o.dur || 0.1;
    const osc = ac.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f || 440, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.slide || dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = ac.createGain();
    const v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) {
      const f = ac.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + dur);
      f.Q.value = o.q || 1;
      osc.connect(f); node = f;
    }
    node.connect(g); g.connect(o.dest || sfxGain);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function noise(o) {
    if (!ac) return;
    const t = (o.t || ac.currentTime);
    const dur = o.dur || 0.1;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    src.playbackRate.value = o.rate || 1;
    const f = ac.createBiquadFilter(); f.type = o.ft || 'lowpass';
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    f.Q.value = o.q || 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(o.vol == null ? 0.3 : o.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxGain);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  // ---------- Soundeffekte ----------
  const S = {
    pistol(v = 1) { noise({ dur: 0.14, f: 3200, f2: 400, vol: 0.55 * v }); tone({ type: 'square', f: 220, f2: 50, dur: 0.09, vol: 0.25 * v }); },
    shotgun(v = 1) { noise({ dur: 0.32, f: 2200, f2: 200, vol: 0.8 * v }); tone({ type: 'sawtooth', f: 140, f2: 35, dur: 0.18, vol: 0.35 * v }); },
    uzi(v = 1) { noise({ dur: 0.07, f: 4500, f2: 900, vol: 0.4 * v }); tone({ type: 'square', f: 300, f2: 90, dur: 0.05, vol: 0.12 * v }); },
    punch() { noise({ dur: 0.07, f: 900, vol: 0.5 }); tone({ type: 'sine', f: 160, f2: 50, dur: 0.1, vol: 0.5 }); },
    bonk() {
      tone({ type: 'triangle', f: 420, f2: 395, dur: 0.45, vol: 0.45 });
      tone({ type: 'square', f: 1270, f2: 1200, dur: 0.18, vol: 0.08 });
      tone({ type: 'sine', f: 120, f2: 60, dur: 0.1, vol: 0.4 });
    },
    squeak() {
      if (!ac) return; const t = ac.currentTime;
      tone({ type: 'square', f: 700, f2: 1600, slide: 0.07, dur: 0.1, vol: 0.18, t });
      tone({ type: 'square', f: 1500, f2: 600, slide: 0.12, dur: 0.14, vol: 0.16, t: t + 0.08 });
    },
    swoosh() { noise({ dur: 0.13, ft: 'bandpass', f: 500, f2: 2600, q: 1.5, vol: 0.3 }); },
    splat() { noise({ dur: 0.25, f: 700, f2: 150, vol: 0.6 }); tone({ type: 'sine', f: 110, f2: 40, dur: 0.15, vol: 0.4 }); },
    glass() {
      noise({ dur: 0.35, ft: 'highpass', f: 2500, vol: 0.4 });
      for (let i = 0; i < 5; i++) tone({ type: 'sine', f: 2000 + Math.random() * 3000, dur: 0.08 + Math.random() * 0.15, vol: 0.06, t: ac && ac.currentTime + Math.random() * 0.12 });
    },
    door() { tone({ type: 'square', f: 90, f2: 40, dur: 0.12, vol: 0.25 }); noise({ dur: 0.12, f: 500, vol: 0.35 }); },
    slam() { tone({ type: 'square', f: 70, f2: 30, dur: 0.2, vol: 0.4 }); noise({ dur: 0.2, f: 800, vol: 0.6 }); },
    pickup() { if (!ac) return; const t = ac.currentTime; tone({ type: 'square', f: 660, dur: 0.05, vol: 0.12, t }); tone({ type: 'square', f: 990, dur: 0.07, vol: 0.12, t: t + 0.05 }); },
    throwIt() { noise({ dur: 0.18, ft: 'bandpass', f: 1500, f2: 400, q: 2, vol: 0.3 }); },
    click() { tone({ type: 'square', f: 1800, dur: 0.025, vol: 0.12 }); },
    peng() {
      if (!ac) return; const t = ac.currentTime;
      tone({ type: 'sawtooth', f: 240, f2: 160, dur: 0.12, vol: 0.25, lp: 1800, t });
      tone({ type: 'sawtooth', f: 180, f2: 90, dur: 0.3, vol: 0.25, lp: 1200, lp2: 300, t: t + 0.1 });
      tone({ type: 'square', f: 1200, f2: 2400, dur: 0.15, vol: 0.06, t });
    },
    bark() { if (!ac) return; const t = ac.currentTime; tone({ type: 'sawtooth', f: 620, f2: 330, dur: 0.08, vol: 0.2, lp: 2000, t }); tone({ type: 'sawtooth', f: 660, f2: 300, dur: 0.09, vol: 0.2, lp: 2000, t: t + 0.12 }); },
    alert() { tone({ type: 'square', f: 1250, dur: 0.05, vol: 0.07 }); },
    boss() { tone({ type: 'sawtooth', f: 90, f2: 45, dur: 0.8, vol: 0.4, lp: 900 }); tone({ type: 'sawtooth', f: 92, f2: 46, dur: 0.8, vol: 0.3, lp: 900, detune: 30 }); },
    wurst() { tone({ type: 'sine', f: 300, f2: 140, dur: 0.12, vol: 0.25 }); noise({ dur: 0.08, f: 600, vol: 0.2 }); },
    combo(n) { if (!ac) return; const t = ac.currentTime; const b = 72 + Math.min(n, 8) * 2; [0, 4, 7].forEach((s, i) => tone({ type: 'square', f: mtof(b + s), dur: 0.08, vol: 0.07, t: t + i * 0.04 })); },
    death() { tone({ type: 'sawtooth', f: 500, f2: 50, slide: 0.9, dur: 1.0, vol: 0.35, lp: 3000, lp2: 200 }); noise({ dur: 0.5, f: 1000, f2: 100, vol: 0.5 }); },
    clear() { if (!ac) return; const t = ac.currentTime; [60, 64, 67, 72, 76].forEach((m, i) => tone({ type: 'square', f: mtof(m), dur: 0.15, vol: 0.1, t: t + i * 0.07 })); },
    blip(hi) { tone({ type: 'square', f: (hi ? 520 : 260) + Math.random() * 80, dur: 0.03, vol: 0.05 }); },
    ring() {
      if (!ac) return; const t = ac.currentTime;
      for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) {
        tone({ type: 'square', f: i % 2 ? 1300 : 1050, dur: 0.05, vol: 0.06, t: t + r * 0.6 + i * 0.05 });
      }
    },
    select() { tone({ type: 'square', f: 880, f2: 1320, dur: 0.06, vol: 0.1 }); },
    hurtBoss() { tone({ type: 'square', f: 200, f2: 120, dur: 0.08, vol: 0.2 }); },
    explode() { noise({ dur: 1.2, f: 1500, f2: 60, vol: 0.9 }); tone({ type: 'sine', f: 80, f2: 25, dur: 0.9, vol: 0.6 }); },
  };

  // Ersatz-Synth, falls keine eigenen Boss-Sounds im Ordner liegen
  S.laser = () => { tone({ type: 'sawtooth', f: 1800, f2: 200, slide: 0.5, dur: 0.55, vol: 0.18, lp: 4000 }); tone({ type: 'square', f: 90, dur: 0.5, vol: 0.12 }); };
  S.zap = () => { tone({ type: 'square', f: 2400, f2: 600, dur: 0.08, vol: 0.08 }); };
  S.glitch = () => { if (!ac) return; const t = ac.currentTime; for (let i = 0; i < 6; i++) tone({ type: 'square', f: 200 + Math.random() * 2000, dur: 0.03, vol: 0.07, t: t + i * 0.035 }); };
  S.cash = () => { if (!ac) return; const t = ac.currentTime; tone({ type: 'square', f: 1568, dur: 0.06, vol: 0.08, t }); tone({ type: 'square', f: 2093, dur: 0.12, vol: 0.08, t: t + 0.06 }); };
  S.coin = () => { tone({ type: 'square', f: 1975, dur: 0.05, vol: 0.05 }); };
  S.armor = () => { tone({ type: 'triangle', f: 600, f2: 200, dur: 0.3, vol: 0.3 }); noise({ dur: 0.15, f: 3000, vol: 0.3 }); };
  S.train = () => { if (!ac) return; const t = ac.currentTime; for (let i = 0; i < 3; i++) { tone({ type: 'sawtooth', f: 330, dur: 0.35, vol: 0.12, lp: 1500, t: t + i * 0.5 }); tone({ type: 'sawtooth', f: 415, dur: 0.35, vol: 0.12, lp: 1500, t: t + i * 0.5 }); } };
  S.rumble = () => { noise({ dur: 1.4, f: 300, vol: 0.5 }); tone({ type: 'sine', f: 50, dur: 1.2, vol: 0.4 }); };
  S.spin = () => { tone({ type: 'square', f: 900 + Math.random() * 300, dur: 0.02, vol: 0.04 }); };
  S.win = () => { if (!ac) return; const t = ac.currentTime; [72, 76, 79, 84, 88].forEach((m, i) => tone({ type: 'square', f: mtof(m), dur: 0.2, vol: 0.1, t: t + i * 0.08 })); };
  S.lose = () => { if (!ac) return; const t = ac.currentTime; [64, 61, 57].forEach((m, i) => tone({ type: 'sawtooth', f: mtof(m), dur: 0.25, vol: 0.08, lp: 1500, t: t + i * 0.15 })); };
  S.heart = () => { if (!ac) return; const t = ac.currentTime; [76, 80, 83, 88].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), dur: 0.15, vol: 0.12, t: t + i * 0.06 })); };
  S.wave = () => { tone({ type: 'sine', f: 120, f2: 30, slide: 0.5, dur: 0.6, vol: 0.6 }); tone({ type: 'sawtooth', f: 500, f2: 60, dur: 0.4, vol: 0.15, lp: 1800 }); noise({ dur: 0.5, f: 900, f2: 120, vol: 0.45 }); };
  S.crossbow = () => { tone({ type: 'triangle', f: 900, f2: 300, dur: 0.12, vol: 0.18 }); noise({ dur: 0.08, ft: 'bandpass', f: 2500, vol: 0.2 }); };
  S.flame = () => { noise({ dur: 0.16, ft: 'bandpass', f: 700, f2: 300, q: 0.7, vol: 0.25 }); };
  S.sms = () => { if (!ac) return; const t = ac.currentTime; tone({ type: 'sine', f: 1318, dur: 0.08, vol: 0.12, t }); tone({ type: 'sine', f: 1760, dur: 0.12, vol: 0.12, t: t + 0.1 }); };
  S.press = () => { noise({ dur: 0.35, f: 500, f2: 200, vol: 0.3 }); tone({ type: 'square', f: 140, f2: 90, dur: 0.3, vol: 0.12 }); };
  S.plant = () => { tone({ type: 'triangle', f: 520, f2: 780, dur: 0.15, vol: 0.15 }); };
  S.levelup = () => { if (!ac) return; const t = ac.currentTime; [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone({ type: 'square', f: mtof(m), dur: 0.14, vol: 0.09, t: t + i * 0.06 })); };
  // Martinshorn: "TATÜ-TATA"
  S.siren = (v = 1) => { if (!ac) return; const t = ac.currentTime; tone({ type: 'square', f: 440, dur: 0.42, vol: 0.045 * v, lp: 1600, t }); tone({ type: 'square', f: 587, dur: 0.42, vol: 0.045 * v, lp: 1600, t: t + 0.46 }); };
  S.whistle = () => { if (!ac) return; const t = ac.currentTime; for (let i = 0; i < 2; i++) tone({ type: 'sine', f: 2300, f2: 2500, dur: 0.22, vol: 0.12, t: t + i * 0.28 }); };
  S.busted = () => { if (!ac) return; const t = ac.currentTime; [67, 63, 60, 55].forEach((m, i) => tone({ type: 'sawtooth', f: mtof(m), dur: 0.3, vol: 0.1, lp: 1400, t: t + i * 0.2 })); noise({ dur: 0.3, f: 600, vol: 0.4, t: t + 0.8 }); };
  S.steal = () => { if (!ac) return; const t = ac.currentTime; tone({ type: 'triangle', f: 880, dur: 0.06, vol: 0.12, t }); tone({ type: 'triangle', f: 1320, dur: 0.1, vol: 0.12, t: t + 0.07 }); S.coin(); };
  S.honk = () => { tone({ type: 'square', f: 330, dur: 0.25, vol: 0.08, lp: 1200 }); tone({ type: 'square', f: 415, dur: 0.25, vol: 0.06, lp: 1200 }); };
  S.boss_intro = () => S.boss();
  S.boss_hit = () => S.hurtBoss();
  S.boss_attack = () => S.glitch();
  S.boss_laser = () => S.laser();
  S.boss_phase = () => { S.explode(); S.glitch(); };
  S.boss_death = () => S.explode();
  S.boss_win = () => S.boss();

  const lastPlay = {};
  function play(name, ...args) {
    if (muted) return;
    const now = performance.now();
    if (name !== 'blip' && lastPlay[name] && now - lastPlay[name] < 30) return;
    lastPlay[name] = now;
    if (Custom.has(name)) { Custom.play(name); return; }
    if (!ac) return;
    const f = S[name]; if (f) f(...args);
  }

  // ---------- Musik ----------
  // Akkorde als MIDI-Noten. Pattern-Strings: 16 Schritte pro Takt.
  const SONGS = {
    title: {
      bpm: 92, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
      kick: 'x.......x.......', snare: '................', hat: '..x...x...x...x.',
      bass: 'x.....x.x.......', arp: 'xxxxxxxxxxxxxxxx', arpType: 'triangle', arpVol: 0.05, pad: true,
      lead: [76, 0, 0, 0, 74, 0, 72, 0, 0, 0, 69, 0, 0, 0, 0, 0, 72, 0, 0, 0, 72, 0, 74, 0, 0, 0, 76, 0, 0, 0, 0, 0,
        76, 0, 0, 0, 79, 0, 76, 0, 0, 0, 74, 0, 72, 0, 0, 0, 74, 0, 0, 0, 0, 0, 0, 0, 71, 0, 0, 0, 0, 0, 0, 0],
      leadType: 'triangle', leadVol: 0.07,
    },
    dialog: {
      bpm: 76, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
      kick: 'x.........x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', snareVol: 0.08, kickVol: 0.3,
      bass: 'x.......x...x...', arp: 'x...x...x...x...', arpType: 'triangle', arpVol: 0.05, pad: true,
    },
    level1: {
      bpm: 120, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52]],
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx',
      bass: 'x.xx.xx.x.xx.xxx', bassType: 'sawtooth', arp: 'x.x.x.x.x.x.x.x.', arpType: 'square', arpVol: 0.035,
      lead: [74, 0, 0, 77, 0, 0, 74, 0, 72, 0, 70, 0, 69, 0, 0, 0, 70, 0, 0, 74, 0, 0, 70, 0, 69, 0, 67, 0, 65, 0, 0, 0,
        72, 0, 0, 76, 0, 0, 72, 0, 71, 0, 72, 0, 74, 0, 0, 0, 72, 0, 0, 0, 69, 0, 0, 0, 64, 0, 65, 0, 67, 0, 69, 0],
      leadType: 'square', leadVol: 0.045,
    },
    level2: {
      bpm: 132, chords: [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 50, 54]],
      kick: 'x..x..x.x..x..x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', hatVol: 0.03,
      bass: 'xxxxxxxxxxxxxxxx', bassType: 'sawtooth', bassOct: 'x.......x.......', arp: 'x.xx.xx.x.xx.xx.', arpType: 'sawtooth', arpVol: 0.03,
      lead: [76, 0, 79, 0, 76, 0, 74, 0, 76, 0, 0, 0, 71, 0, 0, 0, 72, 0, 76, 0, 72, 0, 71, 0, 69, 0, 0, 0, 67, 0, 69, 0,
        74, 0, 78, 0, 74, 0, 72, 0, 74, 0, 0, 0, 69, 0, 0, 0, 71, 0, 0, 0, 74, 0, 0, 0, 78, 0, 0, 0, 0, 0, 0, 0],
      leadType: 'square', leadVol: 0.045,
    },
    boss: {
      bpm: 150, chords: [[48, 51, 55], [44, 48, 51], [46, 50, 53], [43, 47, 50]],
      kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x.xx', hat: 'xxxxxxxxxxxxxxxx', hatVol: 0.035,
      bass: 'xxxxxxxxxxxxxxxx', bassType: 'sawtooth', bassOct: 'x..x..x...x..x..', arp: 'xxxxxxxxxxxxxxxx', arpType: 'square', arpVol: 0.03,
      lead: [72, 0, 0, 75, 0, 0, 79, 0, 78, 0, 75, 0, 72, 0, 0, 0, 68, 0, 0, 72, 0, 0, 75, 0, 74, 0, 72, 0, 68, 0, 0, 0,
        70, 0, 0, 74, 0, 0, 77, 0, 75, 0, 74, 0, 70, 0, 0, 0, 67, 0, 71, 0, 74, 0, 79, 0, 78, 0, 74, 0, 71, 0, 67, 0],
      leadType: 'sawtooth', leadVol: 0.04,
    },
    hub: {
      bpm: 84, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 55, 59]],
      kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', snareVol: 0.12, kickVol: 0.45, hatVol: 0.04,
      bass: 'x.....x...x.....', arp: 'x..x..x...x..x..', arpType: 'triangle', arpVol: 0.05, pad: true,
    },
    disco: {
      bpm: 124, chords: [[50, 53, 57], [55, 59, 62], [52, 55, 59], [57, 61, 64]],
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hatVol: 0.08,
      bass: 'x.xx..x.x.xx..x.', bassType: 'square', bassOct: '..x...x...x...x.', arp: 'x...x...x...x...', arpType: 'sawtooth', arpVol: 0.03, pad: true,
      lead: [74, 0, 74, 0, 72, 0, 74, 0, 0, 0, 69, 0, 0, 0, 0, 0, 71, 0, 71, 0, 69, 0, 71, 0, 0, 0, 67, 0, 0, 0, 0, 0,
        76, 0, 76, 0, 74, 0, 76, 0, 0, 0, 71, 0, 0, 0, 0, 0, 73, 0, 0, 0, 76, 0, 0, 0, 81, 0, 0, 0, 0, 0, 0, 0],
      leadType: 'square', leadVol: 0.04,
    },
    hospital: {
      bpm: 100, chords: [[45, 48, 52], [44, 47, 52], [41, 45, 48], [40, 44, 47]],
      kick: 'x.......x..x....', snare: '........x.......', hat: 'x...x...x...x...', hatVol: 0.05,
      bass: 'x.......x.......', bassType: 'sawtooth', arp: 'x.x.x.x.x.x.x.x.', arpType: 'triangle', arpVol: 0.045, pad: true,
      lead: [69, 0, 0, 0, 0, 0, 0, 0, 68, 0, 0, 0, 0, 0, 0, 0, 65, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0],
      leadType: 'sine', leadVol: 0.06,
    },
    casino: {
      bpm: 128, chords: [[53, 57, 60], [50, 53, 57], [55, 58, 62], [48, 52, 55]],
      kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', hatVol: 0.05,
      bass: 'x..x..x.x..x..x.', bassType: 'square', arp: 'xxxxxxxxxxxxxxxx', arpType: 'square', arpVol: 0.025,
      lead: [77, 0, 76, 0, 77, 0, 81, 0, 0, 0, 77, 0, 0, 0, 0, 0, 74, 0, 72, 0, 74, 0, 77, 0, 0, 0, 74, 0, 0, 0, 0, 0,
        79, 0, 77, 0, 79, 0, 82, 0, 0, 0, 79, 0, 0, 0, 0, 0, 76, 0, 74, 0, 72, 0, 76, 0, 79, 0, 0, 0, 0, 0, 0, 0],
      leadType: 'square', leadVol: 0.04,
    },
    cyber: {
      bpm: 140, chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47]],
      kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', hatVol: 0.035,
      bass: 'x.xxx.xxx.xxx.xx', bassType: 'sawtooth', bassOct: 'x...x...x...x...', arp: 'xxxxxxxxxxxxxxxx', arpType: 'square', arpVol: 0.03,
      lead: [69, 0, 72, 0, 76, 0, 72, 0, 74, 0, 72, 0, 71, 0, 0, 0, 65, 0, 69, 0, 72, 0, 69, 0, 71, 0, 69, 0, 67, 0, 0, 0],
      leadType: 'sawtooth', leadVol: 0.035,
    },
    final: {
      bpm: 162, chords: [[45, 48, 52], [46, 50, 53], [43, 46, 50], [44, 47, 51]],
      kick: 'x.x.x.x.x.x.x.xx', snare: '....x.......x.xx', hat: 'xxxxxxxxxxxxxxxx', hatVol: 0.04,
      bass: 'xxxxxxxxxxxxxxxx', bassType: 'sawtooth', bassOct: 'x.x..x.x..x.x..x', arp: 'xxxxxxxxxxxxxxxx', arpType: 'square', arpVol: 0.035,
      lead: [81, 0, 80, 0, 81, 0, 76, 0, 72, 0, 76, 0, 69, 0, 0, 0, 82, 0, 81, 0, 82, 0, 77, 0, 74, 0, 77, 0, 70, 0, 0, 0,
        79, 0, 77, 0, 79, 0, 74, 0, 70, 0, 74, 0, 67, 0, 0, 0, 80, 0, 79, 0, 80, 0, 75, 0, 71, 0, 75, 0, 68, 0, 71, 0],
      leadType: 'sawtooth', leadVol: 0.04,
    },
    city: {
      bpm: 96, chords: [[52, 55, 59], [48, 52, 55], [50, 53, 57], [47, 50, 55]],
      kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatVol: 0.04, kickVol: 0.5,
      bass: 'x..x....x..x..x.', bassType: 'triangle', arp: 'x.x.x.x.x.x.x.x.', arpType: 'triangle', arpVol: 0.045, pad: true,
      lead: [76, 0, 0, 0, 79, 0, 0, 0, 76, 0, 74, 0, 71, 0, 0, 0, 72, 0, 0, 0, 76, 0, 0, 0, 74, 0, 72, 0, 69, 0, 0, 0],
      leadType: 'triangle', leadVol: 0.05,
    },
    library: {
      bpm: 112, chords: [[50, 53, 57], [48, 51, 55], [46, 50, 53], [45, 49, 52]],
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatVol: 0.04,
      bass: 'x.x.x.x.x.x.x.x.', bassType: 'square', arp: 'x..x..x.x..x..x.', arpType: 'triangle', arpVol: 0.05,
      lead: [74, 0, 0, 72, 0, 0, 70, 0, 69, 0, 0, 0, 70, 0, 72, 0, 74, 0, 0, 77, 0, 0, 74, 0, 72, 0, 0, 0, 69, 0, 0, 0],
      leadType: 'square', leadVol: 0.04,
    },
    mall: {
      bpm: 118, chords: [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]],
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hatVol: 0.06,
      bass: 'x..x..x.x..x..x.', bassType: 'square', arp: 'x.x.x.x.x.x.x.x.', arpType: 'triangle', arpVol: 0.05, pad: true,
      lead: [79, 0, 0, 0, 74, 0, 0, 0, 76, 0, 79, 0, 81, 0, 0, 0, 79, 0, 0, 0, 76, 0, 0, 0, 74, 0, 71, 0, 72, 0, 0, 0],
      leadType: 'square', leadVol: 0.04,
    },
    con: {
      bpm: 150, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],
      kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'x.xxx.xxx.xxx.xx', hatVol: 0.05,
      bass: 'x.xx.xx.x.xx.xxx', bassType: 'square', arp: 'xxxxxxxxxxxxxxxx', arpType: 'square', arpVol: 0.03,
      lead: [81, 0, 79, 0, 76, 0, 79, 0, 81, 0, 84, 0, 83, 0, 0, 0, 79, 0, 77, 0, 74, 0, 77, 0, 79, 0, 81, 0, 76, 0, 0, 0],
      leadType: 'square', leadVol: 0.045,
    },
    prison: {
      bpm: 104, chords: [[45, 48, 52], [46, 49, 53], [44, 47, 51], [43, 46, 50]],
      kick: 'x..x....x..x....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatVol: 0.05,
      bass: 'x..x..x.x..x..x.', bassType: 'sawtooth', arp: 'x...x...x...x...', arpType: 'triangle', arpVol: 0.05,
      lead: [69, 0, 0, 0, 70, 0, 0, 0, 68, 0, 0, 0, 67, 0, 0, 0],
      leadType: 'sawtooth', leadVol: 0.035,
    },
    airport: {
      bpm: 128, chords: [[50, 54, 57], [52, 55, 59], [47, 50, 54], [49, 52, 56]],
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', hatVol: 0.03,
      bass: 'x.x.x.x.x.x.x.x.', bassType: 'sawtooth', bassOct: 'x.......x.......', arp: 'x.xx.xx.x.xx.xx.', arpType: 'square', arpVol: 0.03,
      lead: [74, 0, 0, 78, 0, 0, 81, 0, 0, 0, 78, 0, 76, 0, 0, 0, 71, 0, 0, 74, 0, 0, 78, 0, 0, 0, 76, 0, 73, 0, 0, 0],
      leadType: 'square', leadVol: 0.04,
    },
    arena: {
      bpm: 156, chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]],
      kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', hatVol: 0.04,
      bass: 'xxxxxxxxxxxxxxxx', bassType: 'sawtooth', bassOct: 'x...x...x...x...', arp: 'x.x.x.x.x.x.x.x.', arpType: 'square', arpVol: 0.03,
      lead: [76, 0, 0, 74, 0, 0, 72, 0, 71, 0, 72, 0, 74, 0, 0, 0],
      leadType: 'sawtooth', leadVol: 0.04,
    },
    factory: {
      bpm: 100, chords: [[53, 57, 60], [55, 59, 62], [52, 55, 59], [57, 60, 64]],
      kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatVol: 0.045, kickVol: 0.5,
      bass: 'x..x..x.....x...', bassType: 'triangle', arp: 'x.x.x.x.x.x.x.x.', arpType: 'triangle', arpVol: 0.05, pad: true,
      lead: [72, 0, 74, 0, 76, 0, 0, 0, 79, 0, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0, 69, 0, 0, 0, 71, 0, 72, 0, 74, 0, 0, 0],
      leadType: 'triangle', leadVol: 0.05,
    },
    police: {
      bpm: 146, chords: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [43, 47, 50]],
      kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', hatVol: 0.035,
      bass: 'x.xxx.xxx.xxx.xx', bassType: 'sawtooth', bassOct: 'x.......x.......', arp: 'x.x.x.x.x.x.x.x.', arpType: 'square', arpVol: 0.03,
      lead: [76, 0, 0, 0, 81, 0, 0, 0, 76, 0, 0, 0, 81, 0, 0, 0, 77, 0, 76, 0, 74, 0, 72, 0, 71, 0, 72, 0, 74, 0, 0, 0],
      leadType: 'square', leadVol: 0.04,
    },
    gameover: {
      bpm: 70, chords: [[45, 48, 52], [41, 45, 48], [43, 46, 50], [40, 44, 47]],
      kick: 'x...............', snare: '................', hat: '................',
      bass: 'x.......x.......', arp: 'x...x...x...x...', arpType: 'triangle', arpVol: 0.05, pad: true,
    },
    win: {
      bpm: 110, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
      bass: 'x.x...x.x.x...x.', arp: 'xxxxxxxxxxxxxxxx', arpType: 'square', arpVol: 0.035, pad: true,
    },
  };

  function playSong(name) {
    if (name === 'final' && Custom.has('boss_music')) { song = null; songName = 'final-custom'; Custom.loop('boss_music'); return; }
    Custom.stopLoop();
    if (!ac) { songName = name; return; }
    if (songName === name && song) return;
    songName = name; song = SONGS[name] || null; step = 0; nextTime = ac.currentTime + 0.08;
  }
  function stopSong() { song = null; songName = ''; Custom.stopLoop(); }

  function scheduler() {
    if (!ac) return;
    if (!song && songName && SONGS[songName]) { song = SONGS[songName]; step = 0; nextTime = ac.currentTime + 0.08; }
    if (!song) return;
    if (nextTime < ac.currentTime - 0.3) nextTime = ac.currentTime + 0.05; // Tab war im Hintergrund
    const stepDur = 60 / song.bpm / 4;
    while (nextTime < ac.currentTime + 0.12) {
      scheduleStep(song, step, nextTime, stepDur);
      nextTime += stepDur; step++;
    }
  }

  function scheduleStep(s, st, t, sd) {
    if (muted) return;
    const D = musicGain;
    const bar = Math.floor(st / 16) % s.chords.length;
    const i = st % 16;
    const ch = s.chords[bar];
    if (s.kick[i] === 'x') {
      tone({ type: 'sine', f: 150, f2: 42, slide: 0.12, dur: 0.22, vol: s.kickVol || 0.7, t, dest: D });
    }
    if (s.snare[i] === 'x') {
      noise({ dur: 0.16, ft: 'bandpass', f: 1800, q: 0.6, vol: s.snareVol || 0.3, t, dest: D });
      tone({ type: 'triangle', f: 210, f2: 150, dur: 0.08, vol: 0.12, t, dest: D });
    }
    if (s.hat[i] === 'x') noise({ dur: i % 4 === 2 ? 0.09 : 0.03, ft: 'highpass', f: 7000, vol: s.hatVol || 0.06, t, dest: D });
    if (s.bass[i] === 'x') {
      const oct = s.bassOct ? (s.bassOct[i] === 'x' ? 12 : 0) : (i % 4 === 2 ? 12 : 0);
      tone({ type: s.bassType || 'square', f: mtof(ch[0] - 24 + oct), dur: sd * 0.9, vol: 0.16, lp: 900, lp2: 250, q: 4, t, dest: D });
    }
    if (s.arp && s.arp[i] === 'x') {
      const n = ch[i % 3] + 12 + (Math.floor(i / 3) % 2) * 12;
      tone({ type: s.arpType || 'square', f: mtof(n), dur: sd * 0.8, vol: s.arpVol || 0.04, lp: 3000, lp2: 600, t, dest: D });
    }
    if (s.pad && i === 0) {
      ch.forEach((n) => {
        tone({ type: 'sawtooth', f: mtof(n), dur: sd * 16, attack: 0.3, vol: 0.025, lp: 1200, t, dest: D });
        tone({ type: 'sawtooth', f: mtof(n), detune: 12, dur: sd * 16, attack: 0.3, vol: 0.02, lp: 1200, t, dest: D });
      });
    }
    if (s.lead) {
      const n = s.lead[st % s.lead.length];
      if (n) tone({ type: s.leadType || 'square', f: mtof(n), dur: sd * 2.2, vol: s.leadVol || 0.05, lp: 2600, t, dest: D });
    }
  }

  function muffle(on) {
    if (!ac) return;
    musicFilter.frequency.cancelScheduledValues(ac.currentTime);
    musicFilter.frequency.setTargetAtTime(on ? 500 : 18000, ac.currentTime, 0.25);
    Custom.setMuffle(on);
  }

  function toggleMute() {
    muted = !muted;
    if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.05);
    Custom.setMuted(muted);
    return muted;
  }

  return { init, play, has: (n) => Custom.has(n), playSong, stopSong, muffle, toggleMute, get muted() { return muted; }, get ready() { return !!ac; },
    // Erweiterungen (Staffel 2): eigene Lieder und Soundeffekte
    addSong: (n, def) => { SONGS[n] = def; }, hasSong: (n) => !!SONGS[n],
    addSfx: (n, fn) => { S[n] = (...a) => extCall(fn, ...a); },
    synth: { tone, noise, mtof, now: () => (ac ? ac.currentTime : 0), get ac() { return ac; }, get sfx() { return sfxGain; }, get music() { return musicGain; } },
    get songName() { return songName; } };
})();

// ---------------------------------------------------------------------
//  Eigene Sounds (z. B. für den Endboss): einfach Dateien in den Ordner
//  "sounds" legen. Erlaubte Endungen: .mp3 .ogg .wav .m4a
//  Namen: siehe sounds/LIESMICH.txt
// ---------------------------------------------------------------------
const Custom = (() => {
  const NAMES = ['boss_music', 'boss_intro', 'boss_hit', 'boss_attack', 'boss_laser', 'boss_phase', 'boss_death', 'boss_win'];
  const EXT = ['mp3', 'ogg', 'wav', 'm4a'];
  const found = {};
  let loopEl = null, muted = false, muffled = false;
  function probe(name, i) {
    if (i >= EXT.length) return;
    const a = new Audio();
    a.preload = 'auto';
    a.addEventListener('canplaythrough', () => { found[name] = a.src; }, { once: true });
    a.addEventListener('error', () => probe(name, i + 1), { once: true });
    a.src = 'sounds/' + name + '.' + EXT[i];
  }
  NAMES.forEach((n) => probe(n, 0));
  const vol = () => (muted ? 0 : muffled ? 0.25 : 1);
  let lastHit = 0;
  return {
    has: (n) => !!found[n],
    play(n) {
      if (!found[n] || muted) return;
      if (n === 'boss_hit') { const now = performance.now(); if (now - lastHit < 180) return; lastHit = now; }
      const a = new Audio(found[n]); a.volume = vol() * 0.9; a.play().catch(() => {});
    },
    loop(n) {
      if (loopEl && loopEl.dataset.n === n) return;
      this.stopLoop();
      loopEl = new Audio(found[n]); loopEl.dataset.n = n; loopEl.loop = true; loopEl.volume = vol() * 0.7;
      loopEl.play().catch(() => {});
    },
    stopLoop() { if (loopEl) { loopEl.pause(); loopEl = null; } },
    setMuted(m) { muted = m; if (loopEl) loopEl.volume = vol() * 0.7; },
    setMuffle(m) { muffled = m; if (loopEl) loopEl.volume = vol() * 0.7; },
  };
})();
