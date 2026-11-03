// DOM helpers: modal dialogs, quiz, chat log, toast, floating labels, bell sound.
export const $ = (id) => document.getElementById(id);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { esc };

export const ui = { modalOpen: false, soundOn: true, lastQ: null };

// ---------- modal ----------
// buttons: [{ label, value, cls }]. Resolves with the chosen value.
export function ask(title, html, buttons = [{ label: 'OK', value: true }]) {
  return new Promise((resolve) => {
    ui.modalOpen = true;
    $('mTitle').textContent = title;
    $('mBody').innerHTML = html;
    const box = $('mButtons');
    box.innerHTML = '';
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.textContent = b.label;
      if (b.cls) el.className = b.cls;
      if (b.disabled) el.disabled = true;
      el.onclick = () => {
        $('modal').hidden = true;
        ui.modalOpen = false;
        resolve(b.value);
      };
      box.appendChild(el);
    });
    $('modal').hidden = false;
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// questions: [{ q, options, answer }]. Returns number of correct answers.
export async function runQuiz(title, meta, questions) {
  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    const qu = questions[i];
    if (qu.sleep) {
      await ask(title, `<div class="meta">${esc(meta)} · Câu ${i + 1}/${questions.length}</div><p>😴 Bạn mệt quá nên ngủ gật mất câu này…</p>`, [{ label: 'Tỉnh dậy', value: 1 }]);
      continue;
    }
    ui.lastQ = { title, q: qu.q, options: qu.options, answer: qu.answer }; // for the feedback mailbox
    const chosen = await new Promise((resolve) => {
      ui.modalOpen = true;
      $('mTitle').textContent = title;
      $('mBody').innerHTML = `<div class="meta">${esc(meta)} · Câu ${i + 1}/${questions.length}</div><div class="q">${esc(qu.q)}</div>`;
      const box = $('mButtons');
      box.innerHTML = '';
      qu.options.forEach((opt) => {
        const el = document.createElement('button');
        el.className = 'opt';
        el.textContent = opt;
        el.onclick = async () => {
          [...box.children].forEach((c) => {
            c.disabled = true;
            if (c.textContent === qu.answer) c.className = 'right';
          });
          if (opt !== qu.answer) el.className = 'wrong';
          await wait(opt === qu.answer ? 650 : 1500);
          resolve(opt);
        };
        box.appendChild(el);
      });
      $('modal').hidden = false;
    });
    if (chosen === qu.answer) {
      correct++;
      sfx('ok');
    } else sfx('bad');
  }
  $('modal').hidden = true;
  ui.modalOpen = false;
  return correct;
}

// ---------- toast / chat ----------
let toastTimer = 0;
export function toast(text, ms = 2400) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

export function chatLine(name, text, kind = '') {
  const log = $('chatLog');
  const d = document.createElement('div');
  if (kind) d.className = kind;
  d.innerHTML = `<b>${esc(name)}:</b> ${esc(text)}`;
  log.appendChild(d);
  while (log.children.length > 7) log.firstChild.remove();
}
export const sys = (text) => chatLine('Hệ thống', text, 'sys');

// ---------- labels above characters ----------
export function makeLabel(name, cls = '', tag = '') {
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  el.innerHTML = `<div class="bub" hidden></div>${tag ? `<div class="tg">${esc(tag)}</div>` : ''}<div class="nm">${esc(name)}</div>`;
  $('labels').appendChild(el);
  return { el, bub: el.querySelector('.bub'), nm: el.querySelector('.nm'), bubTimer: 0 };
}
export function setLabelTag(label, tag) {
  let tg = label.el.querySelector('.tg');
  if (!tag) { tg?.remove(); return; }
  if (!tg) {
    tg = document.createElement('div');
    tg.className = 'tg';
    label.el.insertBefore(tg, label.nm);
  }
  tg.textContent = tag;
}
export function say(label, text, ms = 3200) {
  label.bub.textContent = text;
  label.bub.hidden = false;
  clearTimeout(label.bubTimer);
  label.bubTimer = setTimeout(() => (label.bub.hidden = true), ms);
}

// ---------- fade ----------
export async function fade(fn) {
  $('fade').classList.add('on');
  await wait(380);
  await fn();
  $('fade').classList.remove('on');
}

// ---------- sound (WebAudio only: no audio files, no libraries) ----------
// Modes: 'on' = effects + ambience + soft music, 'sfx' = effects only, 'off'. Remembered in localStorage.
// The AudioContext is only created inside a user gesture (iOS rule), suspended while the page is hidden.
// Public API: sfx(kind), ambience(name | null), cycleSoundMode(), setSoundMode(), soundIcon(), soundLabel(), audioInfo().
const SOUND_KEY = 'tho-sound';
export const SOUND_MODES = ['on', 'sfx', 'off'];
const SOUND_ICONS = { on: '🔊', sfx: '🔉', off: '🔇' };
const SOUND_LABELS = { on: 'Âm thanh: bật (nhạc nền + hiệu ứng)', sfx: 'Âm thanh: chỉ hiệu ứng', off: 'Âm thanh: tắt' };
const MASTER_VOL = 0.5;  // default is deliberately quiet
const AMB_VOL = 0.6;     // ambience + music, relative to the effects
const HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';

function loadSoundMode() {
  try { const m = localStorage.getItem(SOUND_KEY); if (SOUND_MODES.includes(m)) return m; } catch { /* storage blocked */ }
  return 'on';
}
ui.soundMode = HAS_DOM ? loadSoundMode() : 'on';
ui.soundOn = ui.soundMode !== 'off';

let ac = null, master = null, sfxBus = null, ambBus = null, noiseBuf = null;
// ambience: want = what the scene asks for; playing = the layer actually running
const amb = { want: null, playing: null, layer: null, timer: 0, nextBird: 0, nextNote: 0, step: 0, music: false, birdGap: [4, 9] };

const running = () => !!ac && ac.state === 'running';

function createContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = MASTER_VOL;
  master.connect(ac.destination);
  sfxBus = ac.createGain();
  sfxBus.connect(master);
  ambBus = ac.createGain();
  ambBus.gain.value = AMB_VOL;
  ambBus.connect(master);
  // 2 s of white noise, shared by every noise layer and drum hit
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

// iOS only allows audio after a user gesture: runs from the gesture listeners below (and the 🔊 button).
export function unlockAudio() {
  try {
    if (!ac && !createContext()) return;
    if (ui.soundMode === 'off' || document.hidden) { if (ac.state === 'running') ac.suspend().catch(() => {}); return; }
    if (ac.state !== 'running') ac.resume().then(syncAmbience, () => {});
    else syncAmbience();
  } catch { /* audio not available */ }
}
if (HAS_DOM) {
  // kept for the whole session: iOS can 'interrupt' the context (call, other app) and needs a new gesture
  const onGesture = () => { if (!running() && ui.soundMode !== 'off') unlockAudio(); };
  for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, onGesture, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    try {
      if (document.hidden) ac.suspend().catch(() => {});
      else if (ui.soundMode !== 'off') ac.resume().catch(() => {});
    } catch { /* ignore */ }
  });
}

export function setSoundMode(mode) {
  if (!SOUND_MODES.includes(mode)) mode = 'on';
  ui.soundMode = mode;
  ui.soundOn = mode !== 'off';
  try { localStorage.setItem(SOUND_KEY, mode); } catch { /* storage blocked: only this session */ }
  if (ac) {
    try {
      if (mode === 'off') ac.suspend().catch(() => {});
      else if (!document.hidden) ac.resume().catch(() => {});
    } catch { /* ignore */ }
  } else if (mode !== 'off') unlockAudio(); // the button press is a user gesture
  syncAmbience();
  return mode;
}
export const cycleSoundMode = () => setSoundMode(SOUND_MODES[(SOUND_MODES.indexOf(ui.soundMode) + 1) % SOUND_MODES.length]);
export const soundIcon = () => SOUND_ICONS[ui.soundMode];
export const soundLabel = () => SOUND_LABELS[ui.soundMode];
export const audioInfo = () => ({ mode: ui.soundMode, ambience: amb.want, playing: amb.playing, state: ac ? ac.state : 'none' });

// ---- effects ----
function tone(freq, start, dur, type = 'sine', vol = 0.15, out = sfxBus) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ac.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}
// school drum "tùng": a falling low tone + a second partial (small phone speakers cannot play the
// fundamental) + a short filtered noise slap for the skin
function drumHit(start, vol = 0.55) {
  const t = ac.currentTime + start;
  for (const [f0, f1, v, type] of [[150, 62, vol, 'sine'], [290, 150, vol * 0.35, 'triangle']]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    o.connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + 0.9);
  }
  const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  n.buffer = noiseBuf;
  f.type = 'lowpass';
  f.frequency.value = 1100;
  g.gain.setValueAtTime(vol * 0.6, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  n.connect(f).connect(g).connect(sfxBus);
  n.start(t, Math.random() * 1.5, 0.12);
}
// red-star / supervisor whistle: a trilled high tone
function whistle(start, dur) {
  const t = ac.currentTime + start;
  const o = ac.createOscillator(), lfo = ac.createOscillator(), depth = ac.createGain(), g = ac.createGain();
  o.frequency.value = 2700;
  lfo.frequency.value = 26;
  depth.gain.value = 160;
  lfo.connect(depth).connect(o.frequency);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.02);
  g.gain.setValueAtTime(0.06, t + dur - 0.05);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t); lfo.start(t);
  o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
}

// kinds: ok, bad, up, pop, bell (end of the school session), drum (class starts: tùng tùng tùng),
// drum2 (break starts: tùng tùng), whistle (caught by the red-star student / supervisor)
export function sfx(kind) {
  if (ui.soundMode === 'off' || !running()) return; // never creates the context: iOS needs a gesture first
  try {
    if (kind === 'bell') [0, 0.35, 0.7, 1.05, 1.4, 1.75].forEach((s, i) => tone(i % 2 ? 660 : 880, s, 0.3, 'triangle', 0.12));
    else if (kind === 'ok') { tone(660, 0, 0.12); tone(990, 0.1, 0.18); }
    else if (kind === 'bad') tone(200, 0, 0.3, 'square', 0.06);
    else if (kind === 'up') [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.14, 0.3, 'triangle'));
    else if (kind === 'pop') tone(520, 0, 0.08, 'sine', 0.08);
    else if (kind === 'drum') [0, 0.6, 1.2].forEach((s) => drumHit(s));
    else if (kind === 'drum2') [0, 0.45].forEach((s) => drumHit(s));
    else if (kind === 'whistle') { whistle(0, 0.22); whistle(0.32, 0.5); }
  } catch { /* audio not available */ }
}

// ---- ambience ----
// Each place is 1–3 looping noise sources (sharing one buffer) through a filter, plus timed bird chirps and,
// at home, a very quiet looping melody. Only a few nodes live at a time; nothing is allocated per frame.
const AMBIENCES = {
  // [filter type, frequency, Q, volume, LFO rate Hz, LFO depth]
  yard: { noise: [['bandpass', 650, 0.8, 0.07, 0.11, 0.03], ['bandpass', 1400, 1.4, 0.025, 2.7, 0.018], ['lowpass', 260, 0.7, 0.03, 0.07, 0.015]], birds: [3, 8] },
  outside: { noise: [['lowpass', 300, 0.7, 0.04, 0.08, 0.025]], birds: [3, 7] },  // yard while classes are on: wind + birds
  class: { noise: [['lowpass', 170, 0.7, 0.05, 0, 0], ['bandpass', 900, 1.5, 0.006, 0.05, 0.004]] },  // quiet room tone
  home: { noise: [['lowpass', 320, 0.7, 0.025, 0.05, 0.01]], birds: [9, 18], music: true },
};

function noiseLoop(layer, [type, freq, q, vol, lfoRate, lfoDepth]) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf;
  src.loop = true;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(layer.out);
  src.start(0, Math.random() * 2);
  layer.sources.push(src);
  if (lfoRate) {
    const lfo = ac.createOscillator(), d = ac.createGain();
    lfo.frequency.value = lfoRate;
    d.gain.value = lfoDepth;
    lfo.connect(d).connect(g.gain);
    lfo.start();
    layer.sources.push(lfo);
  }
}

function chirp(out) {
  const base = 2400 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3);
  let t = ac.currentTime + 0.05;
  for (let i = 0; i < n; i++) {
    const o = ac.createOscillator(), g = ac.createGain(), d = 0.06 + Math.random() * 0.05;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.018, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + d + 0.02);
    t += d + 0.04 + Math.random() * 0.06;
  }
}

// home melody: pentatonic, slow, very quiet; 0 = rest
const MELODY = [659, 784, 880, 784, 659, 587, 523, 0, 587, 659, 784, 659, 587, 523, 440, 0,
  523, 587, 659, 784, 880, 1047, 880, 784, 659, 587, 659, 523, 587, 0, 0, 0];
const BASS = [131, 110, 87, 98]; // one note per 8 steps (C3 A2 F2 G2)
const STEP = 0.5;
function scheduleMusic(out) {
  const now = ac.currentTime;
  if (amb.nextNote < now) amb.nextNote = now + 0.1;
  while (amb.nextNote < now + 1.5) {
    const i = amb.step % MELODY.length, t = amb.nextNote - now;
    if (MELODY[i]) tone(MELODY[i], t, STEP * 1.6, 'triangle', 0.035, out);
    if (i % 8 === 0) tone(BASS[(i / 8) % BASS.length], t, STEP * 7, 'sine', 0.03, out);
    amb.step++;
    amb.nextNote += STEP;
  }
}

function ambienceTick() {
  const layer = amb.layer;
  if (!layer || !running()) return;
  const now = ac.currentTime;
  if (amb.birdGap && now >= amb.nextBird) {
    chirp(layer.out);
    amb.nextBird = now + amb.birdGap[0] + Math.random() * (amb.birdGap[1] - amb.birdGap[0]);
  }
  if (amb.music) scheduleMusic(layer.out);
}

function stopLayer() {
  const layer = amb.layer;
  amb.layer = null;
  amb.playing = null;
  clearInterval(amb.timer);
  amb.timer = 0;
  if (!layer) return;
  try {
    const t = ac.currentTime;
    layer.out.gain.cancelScheduledValues(t);
    layer.out.gain.setValueAtTime(layer.out.gain.value, t);
    layer.out.gain.linearRampToValueAtTime(0, t + 0.8);
    for (const s of layer.sources) s.stop(t + 0.9);
    setTimeout(() => { try { layer.out.disconnect(); } catch { /* ignore */ } }, 1500);
  } catch { /* ignore */ }
}

function startLayer(name) {
  const def = AMBIENCES[name];
  if (!def) return;
  const out = ac.createGain(), t = ac.currentTime;
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(1, t + 1.5);
  out.connect(ambBus);
  const layer = { out, sources: [] };
  for (const n of def.noise) noiseLoop(layer, n);
  amb.layer = layer;
  amb.playing = name;
  amb.birdGap = def.birds || null;
  amb.nextBird = t + 1 + Math.random() * 3;
  amb.music = !!def.music;
  amb.nextNote = t + 1;
  amb.step = 0;
  amb.timer = setInterval(ambienceTick, 400);
}

function syncAmbience() {
  try {
    const target = ac && ui.soundMode === 'on' ? amb.want : null;
    if (target === amb.playing) return;
    stopLayer();
    if (target) startLayer(target);
  } catch { /* audio not available */ }
}

// name: 'yard' | 'outside' | 'class' | 'home' | null. Cheap to call often: only acts when the place changes.
export function ambience(name) {
  if (!AMBIENCES[name]) name = null;
  if (name === amb.want) return;
  amb.want = name;
  syncAmbience();
}
