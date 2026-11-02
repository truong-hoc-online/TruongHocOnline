// DOM helpers: modal dialogs, quiz, chat log, toast, floating labels, bell sound.
export const $ = (id) => document.getElementById(id);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { esc };

export const ui = { modalOpen: false, soundOn: true };

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

// ---------- sound (WebAudio, no files) ----------
let ac = null;
function tone(freq, start, dur, type = 'sine', vol = 0.15) {
  if (!ui.soundOn) return;
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ac.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
// iOS only allows audio after a user gesture: call this from the first touch/click.
export function unlockAudio() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch { /* ignore */ }
}
export function sfx(kind) {
  try {
    if (kind === 'bell') [0, 0.35, 0.7, 1.05, 1.4, 1.75].forEach((s, i) => tone(i % 2 ? 660 : 880, s, 0.3, 'triangle', 0.12));
    else if (kind === 'ok') { tone(660, 0, 0.12); tone(990, 0.1, 0.18); }
    else if (kind === 'bad') tone(200, 0, 0.3, 'square', 0.06);
    else if (kind === 'up') [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.14, 0.3, 'triangle'));
    else if (kind === 'pop') tone(520, 0, 0.08, 'sine', 0.08);
  } catch { /* audio not available */ }
}
