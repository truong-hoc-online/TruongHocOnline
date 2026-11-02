// Main game: renderer, input, camera, the 4-phase school day, tags, promotion, chat.
import * as THREE from './vendor/three.module.min.js';
import { buildWorld } from './world.js';
import { makeCharacter, animateCharacter, faceTowards, SKINS, HAIRS } from './chars.js';
import { Npcs } from './npc.js';
import { SUBJECTS, POINTS_TO_PASS, makeQuestion } from './subjects.js';
import { $, ui, ask, runQuiz, toast, chatLine, sys, makeLabel, say, setLabelTag, fade, sfx, esc, unlockAudio } from './ui.js';
import { initInstall } from './install.js';

const TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
if (TOUCH) document.body.classList.add('touch');
initInstall();

const SAVE_KEY = 'truong-hoc-online-v1';

export const TAGS = {
  'gioi': { name: 'Học sinh giỏi', icon: '🌟', how: 'Trả lời đúng từ 80% (ít nhất 15 câu) và hạnh kiểm từ 80.', perk: 'Vào Phòng học sinh giỏi: mỗi ngày một thử thách, đúng được nhân đôi điểm.' },
  'lop-truong': { name: 'Lớp trưởng', icon: '🎗️', how: 'Từ ngày thứ 3, hạnh kiểm từ 85, đúng từ 60%, không cá biệt.', perk: 'Vào Phòng Đội (họp cán sự), nút “Giữ trật tự” cho cả lớp.' },
  'ca-biet': { name: 'Học sinh cá biệt', icon: '😎', how: 'Hạnh kiểm dưới 60, hoặc đi trễ 3 lần, hoặc lêu lổng 4 lần.', perk: 'Dám nói chuyện trong lớp và thư viện, vào Góc sau căng tin. Hạnh kiểm lên 75 thì hết.' },
  'bi-bat-nat': { name: 'Đang bị bắt nạt', icon: '🛡️', how: 'Gặp chuyện bị bắt nạt ở trường.', perk: 'Nút “Báo cô” luôn hiện, thầy giám thị để ý bảo vệ, cô Thu ở Phòng tư vấn lắng nghe.' },
  'co-giao': { name: 'Cô giáo', icon: '👩‍🏫', how: 'Vai giáo viên — sẽ mở ở bản nhiều người chơi.', perk: 'Vào Phòng giáo viên.' },
};
const PHASE_NAMES = { morning: 'Chuẩn bị đến trường', school: 'Tại trường', after: 'Tan trường', evening: 'Buổi tối ở nhà' };
const PERIOD_START = [420, 470, 540, 590]; // 7:00, 7:50, (break 8:35–9:00), 9:00, 9:50
const BREAK_SECONDS = 75;
const CLASS_LATE_SECONDS = 25;
const CLASS_SKIP_SECONDS = 60;
const BAD_WORDS = ['đm', 'đmm', 'dmm', 'vcl', 'vl', 'đéo', 'địt', 'cặc', 'lồn', 'đĩ', 'cmm', 'clgt'];

const LINES = {
  preBell: ['Sắp vào lớp rồi!', 'Bài tập về nhà làm chưa?', 'Hôm nay kiểm tra miệng đó 😨', 'Cho mình chép bài tí 🙏', 'Sáng nay ăn gì đó?'],
  break: ['Ra chơi rồi!!', 'Đá cầu không?', 'Bài Toán khó quá 😵', 'Căng tin có bánh mì mới kìa', 'Ai cho mượn vở Văn với', 'Chiều nay đi học thêm không?', 'Cô Hạnh hôm nay vui ghê', 'Thư viện mới có truyện hay đó', 'Nhảy dây không mọi người?'],
  after: ['Về thôi!', 'Đi ăn chè không?', 'Mai kiểm tra 15 phút đó!', 'Đá cầu thêm ván nữa đi', 'Mẹ đón rồi, bye nha', 'Tối nay nhớ soạn bài Văn'],
  reply: ['Ừ ha 😄', 'Thật hả?', 'Hihi', 'Đúng rồi đó!', 'Để mình nghĩ đã…', 'Chuẩn luôn 👍', 'Haha vui ghê'],
};

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;

// ---------------- state ----------------
let state = null;
let camDist = 16; // camera distance (declared early: resize() uses it)

function newState(name, school, girl) {
  return {
    v: 1, name, school,
    look: { girl, skin: pick(SKINS), hair: pick(HAIRS) },
    grade: 6, day: 1, phase: 'morning', clock: 360, rot: 0,
    progress: Object.fromEntries(SUBJECTS.map((s) => [s.id, 0])),
    stats: { conduct: 80, energy: 80, mood: 70, money: 20 },
    answered: 0, correct: 0, lateCount: 0, loiterCount: 0,
    tags: [], counselSinceTag: 0, graduated: false,
    prepared: { uniform: true, bag: true }, // mum prepared everything for day 1
    today: null,
  };
}
function newToday() {
  return {
    breakfast: false, lunchbox: false, dressed: false, scarf: false, bag: false, dirty: false,
    subjects: pickSubjects(), period: 0, arrive: 0, slots: 4, loiter: 0, gained: 0,
    bullyDone: false, challenge: false, meeting: false, ordered: false, readBreak: false, playedBreak: false,
    reportedTeacher: false, dinner: false, skipped: 0, lateToClass: 0, notes: [],
  };
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }
function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } }

const has = (tag) => state.tags.includes(tag);
function addStat(k, d) {
  state.stats[k] = k === 'money' ? Math.max(0, state.stats[k] + d) : clamp(state.stats[k] + d, 0, 100);
}
function conductName(c) { return c >= 80 ? 'Tốt' : c >= 65 ? 'Khá' : c >= 50 ? 'Trung bình' : 'Yếu'; }
const accuracy = () => (state.answered ? state.correct / state.answered : 0);

function pickSubjects() {
  const inc = SUBJECTS.filter((s) => state.progress[s.id] < POINTS_TO_PASS);
  const pool = inc.length >= 4 ? inc : [...inc, ...SUBJECTS.filter((s) => !inc.includes(s))];
  const out = [];
  for (let i = 0; i < 4; i++) out.push(pool[(state.rot + i) % pool.length]);
  state.rot += 4;
  return out.map((s) => s.id);
}
const subj = (id) => SUBJECTS.find((s) => s.id === id);

// ---------------- three.js setup ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2)); // phones: fewer pixels = smoother, cooler
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY = { day: new THREE.Color(0xbfe3ff), dusk: new THREE.Color(0xf4b183), night: new THREE.Color(0x1d2b4a) };
scene.background = SKY.day.clone();
scene.fog = new THREE.Fog(0xbfe3ff, 70, 160);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8aa070, 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 90 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

const W = buildWorld(scene);
const npcs = new Npcs(scene, W);

let player = null, meLabel = null;
const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.65, 32), new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.9 }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.04;
ring.visible = false;
scene.add(ring);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (w < h) camDist = Math.max(camDist, 22); // portrait phones see less sideways: pull back
}
addEventListener('resize', resize);
resize();

// ---------------- input ----------------
const keys = new Set();
const joy = { x: 0, z: 0, id: null };
const chatFocused = () => document.activeElement === $('chatInput');

addEventListener('keydown', (e) => {
  if (chatFocused()) {
    if (e.key === 'Escape') $('chatInput').blur();
    return;
  }
  if (e.key === 'Enter' && !ui.modalOpen && state) { e.preventDefault(); $('chatInput').focus(); return; }
  keys.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === 'e' || e.key === ' ') { e.preventDefault(); interact(); }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
renderer.domElement.addEventListener('wheel', (e) => { camDist = clamp(camDist + Math.sign(e.deltaY) * 1.5, 8, 30); }, { passive: true });

if (TOUCH) $('joy').hidden = false;
addEventListener('pointerdown', unlockAudio, { once: true });

// ---- touch on the 3D view: tap ground = walk there, two fingers = zoom ----
const canvas = renderer.domElement;
const touches = new Map();
let pinchD0 = 0, pinchCam0 = 0, tapStart = null;
let moveTarget = null;
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const moveMark = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
moveMark.rotation.x = -Math.PI / 2;
moveMark.visible = false;
scene.add(moveMark);
const pinchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
canvas.addEventListener('pointerdown', (e) => {
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) { pinchD0 = pinchDist(); pinchCam0 = camDist; tapStart = null; }
  else if (touches.size === 1) tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
});
canvas.addEventListener('pointermove', (e) => {
  if (!touches.has(e.pointerId)) return;
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2 && pinchD0 > 0) camDist = clamp(pinchCam0 * (pinchD0 / pinchDist()), 8, 32);
});
const endTouch = (e) => {
  touches.delete(e.pointerId);
  if (touches.size < 2) pinchD0 = 0;
  if (!tapStart || e.type === 'pointercancel') return;
  const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
  if (moved < 12 && performance.now() - tapStart.t < 350) tapToMove(e.clientX, e.clientY);
  tapStart = null;
};
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);
function tapToMove(cx, cy) {
  if (!state || !player || ui.modalOpen || busy || sitting) return;
  raycaster.setFromCamera({ x: (cx / innerWidth) * 2 - 1, y: -(cy / innerHeight) * 2 + 1 }, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;
  moveTarget = { x: hit.x, z: hit.z, stuck: 0 };
  moveMark.position.set(hit.x, 0.05, hit.z);
  moveMark.visible = true;
}
function clearMoveTarget() { moveTarget = null; moveMark.visible = false; }

// chat button (touch): opens the input above the keyboard
$('btnChat').onclick = () => {
  document.body.classList.add('chatting');
  $('chatInput').focus();
};
$('chatInput').addEventListener('blur', () => setTimeout(() => document.body.classList.remove('chatting'), 150));
// tap the school pill to fold the info panel
document.querySelector('.pill.school').addEventListener('click', () => $('info').classList.toggle('compact'));
if (TOUCH && innerHeight < 700) $('info').classList.add('compact');
const joyEl = $('joy'), knob = $('joyKnob');
joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); moveJoy(e); });
joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) moveJoy(e); });
const endJoy = () => { joy.id = null; joy.x = joy.z = 0; knob.style.transform = ''; };
joyEl.addEventListener('pointerup', endJoy);
joyEl.addEventListener('pointercancel', endJoy);
function moveJoy(e) {
  const r = joyEl.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dz = e.clientY - (r.top + r.height / 2);
  const len = Math.hypot(dx, dz), max = r.width / 2 - 10;
  if (len > max) { dx *= max / len; dz *= max / len; }
  knob.style.transform = `translate(${dx}px, ${dz}px)`;
  joy.x = dx / max;
  joy.z = dz / max;
}
$('actBtn').addEventListener('click', interact);

// ---------------- collisions & rules ----------------
const RULES = {
  gate: () => (state.phase === 'school' ? 'Chưa tan học, bác bảo vệ không cho ra cổng.' : 'Đứng ở cổng và bấm “Về nhà” để ra về.'),
  teacherOnly: () => (has('co-giao') ? null : 'Phòng giáo viên — chỉ dành cho giáo viên.'),
  monitorOnly: () => (has('lop-truong') ? null : 'Phòng Đội — chỉ lớp trưởng mới được vào.'),
  excellentOnly: () => (has('gioi') ? null : 'Phòng học sinh giỏi — cần danh hiệu 🌟 Học sinh giỏi.'),
  hangout: () => (has('ca-biet') ? null : 'Góc của nhóm cá biệt… bạn ngoan quá, chưa vào được.'),
  homeDoor: () => 'Ra cửa bằng nút “Đi học”.',
};
let ruleMsgAt = 0;
const R = 0.35;
function collide(p) {
  for (const c of W.colliders) {
    let msg = null;
    if (c.rule) { msg = RULES[c.rule](); if (!msg) continue; }
    const qx = clamp(p.x, c.x0, c.x1), qz = clamp(p.z, c.z0, c.z1);
    let dx = p.x - qx, dz = p.z - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      p.x = qx + (dx / d) * R;
      p.z = qz + (dz / d) * R;
    } else {
      const opts = [[c.x0 - R - p.x, 0], [c.x1 + R - p.x, 0], [0, c.z0 - R - p.z], [0, c.z1 + R - p.z]];
      opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
      p.x += opts[0][0];
      p.z += opts[0][1];
    }
    if (msg && performance.now() - ruleMsgAt > 2500) { ruleMsgAt = performance.now(); toast('🚫 ' + msg); }
  }
}
function zoneAt(p) {
  for (let i = W.zones.length - 1; i >= 0; i--) {
    const z = W.zones[i];
    if (p.x >= z.x0 && p.x <= z.x1 && p.z >= z.z0 && p.z <= z.z1) return z;
  }
  return null;
}

// ---------------- player ----------------
let sitting = false;
function makePlayer() {
  if (player) { scene.remove(player); meLabel.el.remove(); }
  player = makeCharacter({ girl: state.look.girl, skin: state.look.skin, hair: state.look.hair, scarf: false });
  scene.add(player);
  meLabel = makeLabel(state.name, 'me');
  refreshMyTag();
}
function refreshMyTag() {
  const t = state.tags.filter((x) => x !== 'bi-bat-nat').map((x) => TAGS[x].icon + ' ' + TAGS[x].name)[0] || '';
  setLabelTag(meLabel, t);
}
function placePlayer(x, z, rotY = Math.PI) {
  player.position.set(x, 0, z);
  player.rotation.y = rotY;
  clearMoveTarget();
  camPos.set(x, camDist * 0.85, z + camDist * 0.75);
}
function setScarf(on) { player.userData.scarf.visible = on; }
const mySeat = () => W.seats[state.grade][9];

// ---------------- day flow ----------------
let busy = false;
let sub = '';          // school sub-state: preBell | class | break | done
let classStart = 0;    // seconds (game time) when the current period started
let breakStart = 0;
let bullyAt = 0, bullyActive = false;
let guardUntil = 0;
let lastMomLine = 0, lastChatter = 0, breakWarned = false;
let now = 0;           // seconds of unpaused play

async function enterMorning() {
  state.phase = 'morning';
  state.clock = 360;
  sub = '';
  npcs.showSchool(false);
  placePlayer(W.spots.homeSpawn.x - 4.5, -1.1, 0);
  setScarf(false);
  setObjective();
  save();
  say(npcs.mom.label, 'Dậy đi con, 6 giờ rồi!');
  sys(`Ngày ${state.day} — chuẩn bị đi học. Ra khỏi nhà trước 6:45 để không trễ.`);
}

function morningMissing() {
  const t = state.today, m = [];
  if (!t.dressed) m.push('mặc đồng phục');
  if (!t.scarf) m.push('đeo khăn quàng đỏ');
  if (!t.bag && !state.prepared.bag) m.push('soạn cặp');
  if (!t.breakfast) m.push('ăn sáng');
  if (!t.lunchbox) m.push('mang đồ ăn');
  return m;
}

async function leaveHome(forced = false) {
  const t = state.today;
  if (!forced) {
    const miss = morningMissing();
    if (miss.length) {
      const go = await ask('Đi học ngay?', `<p>Bạn chưa: <b>${miss.join(', ')}</b>.</p>`, [{ label: 'Quay lại chuẩn bị', value: false, cls: 'ghost' }, { label: 'Vẫn đi luôn', value: true }]);
      if (!go) return;
    }
  }
  if (state.prepared.bag) t.bag = true;
  state.prepared = { uniform: false, bag: false }; // used up today; prepare again tonight
  const arrive = Math.round(state.clock + 15);
  await fade(() => enterSchool(arrive, true));
}

function enterSchool(arrive, fresh) {
  const t = state.today;
  state.phase = 'school';
  state.clock = arrive;
  t.arrive = arrive;
  npcs.showSchool(true);
  npcs.homeStaff();
  placePlayer(W.spots.gateInside.x, W.spots.gateInside.z, Math.PI);
  setScarf(t.scarf);
  setTeacherLabel(null);
  if (arrive < PERIOD_START[0]) {
    sub = 'preBell';
    npcs.scatterYard();
  } else {
    npcs.seatAll();
    startClass(0, false);
  }
  if (fresh) gateCheck(arrive);
  setObjective();
  save();
}

function gateCheck(arrive) {
  const t = state.today, notes = [];
  if (arrive > PERIOD_START[0]) { addStat('conduct', -5); state.lateCount++; notes.push(`⏰ Đi học muộn (${fmt(arrive)}) — hạnh kiểm −5`); }
  if (!t.dressed) { addStat('conduct', -5); notes.push('👕 Không mặc đồng phục — hạnh kiểm −5'); }
  else if (t.dirty) { addStat('mood', -5); addStat('conduct', -1); notes.push('👕 Áo đồng phục nhàu, bẩn — bạn bè trêu, hạnh kiểm −1'); }
  if (!t.scarf) { addStat('conduct', -3); notes.push('🧣 Quên khăn quàng đỏ — hạnh kiểm −3'); }
  if (!t.bag) { addStat('conduct', -2); notes.push('🎒 Quên sách vở — hạnh kiểm −2'); }
  if (!t.breakfast) { addStat('energy', -15); notes.push('🍚 Chưa ăn sáng — năng lượng −15'); }
  if (notes.length) {
    say(npcs.redStar.label, 'Bạn ơi, cho mình ghi tên nha!');
    ask('Sao đỏ ở cổng trường', `<p>${notes.join('<br>')}</p>`, [{ label: 'Dạ, em biết rồi', value: 1 }]);
  } else {
    say(npcs.redStar.label, 'Đúng giờ, đủ đồ. Giỏi quá!');
    addStat('conduct', 1);
    toast('✅ Đến trường đúng giờ, đủ đồ dùng! Hạnh kiểm +1');
  }
}

function startClass(period, ring_ = true) {
  const t = state.today;
  t.period = period;
  sub = 'class';
  classStart = now;
  state.clock = Math.max(state.clock, PERIOD_START[period]);
  if (ring_) sfx('bell');
  const s = subj(t.subjects[period]);
  setTeacherLabel(s);
  sys(`Tiết ${period + 1}: ${s.icon} ${s.name}. Vào Lớp ${state.grade}A ngồi vào chỗ có vòng sáng.`);
  setObjective();
}

function setTeacherLabel(s) {
  const tch = npcs.classTeacher;
  if (!tch) return;
  tch.label.nm.textContent = s ? s.teacher : 'Cô Hạnh';
  setLabelTag(tch.label, s ? `Dạy ${s.name}` : 'Chủ nhiệm');
}

async function sitDown() {
  busy = true;
  sitting = true;
  const seat = mySeat();
  player.position.set(seat.x, 0, seat.z);
  player.rotation.y = Math.PI;
  player.userData.sitting = true;
  ring.visible = false;
  const t = state.today;
  const alreadyLate = t.period === 0 && t.arrive > PERIOD_START[0]; // punished at the gate already
  if (now - classStart > CLASS_LATE_SECONDS && !alreadyLate) {
    t.lateToClass++;
    addStat('conduct', -2);
    await ask('Vào lớp muộn', `<p>${esc(npcs.classTeacher.label.nm.textContent)}: “Em vào lớp muộn rồi đấy. Lần sau chú ý nhé!”</p><p class="meta">Hạnh kiểm −2</p>`, [{ label: 'Dạ, em xin lỗi cô', value: 1 }]);
  }
  while (sub === 'class') {
    await doPeriod(t.period);
    if (t.period === 1) { startBreak(); break; }
    if (t.period >= 3) { endSchool(); break; }
    startClass(t.period + 1);
    classStart = now; // already seated: no lateness
  }
  busy = false;
}

async function doPeriod(i) {
  const t = state.today, s = subj(t.subjects[i]);
  state.clock = PERIOD_START[i];
  say(npcs.classTeacher.label, `Cả lớp mở sách môn ${s.name} nhé!`);
  const done = state.progress[s.id] >= POINTS_TO_PASS;
  const tired = state.stats.energy < 25;
  await ask(`Tiết ${i + 1} · ${s.icon} ${s.name}`,
    `<p>${esc(s.teacher)} vào lớp. Cả lớp đứng dậy chào cô/thầy!</p>
     <p class="meta">Tiến độ môn: ${Math.min(state.progress[s.id], POINTS_TO_PASS)}/${POINTS_TO_PASS} điểm${done ? ' — đã hoàn thành, học ôn' : ''}.${tired ? '<br>⚠️ Bạn đang rất mệt, dễ ngủ gật.' : ''}</p>`,
    [{ label: 'Bắt đầu học', value: 1 }]);
  const avoid = new Set();
  const qs = [];
  for (let k = 0; k < 3; k++) {
    if (tired && k === 0) { qs.push({ sleep: true }); continue; }
    const q = makeQuestion(s.id, state.grade, avoid);
    avoid.add(q.q);
    qs.push(q);
  }
  const c = await runQuiz(`${s.icon} ${s.name}`, `Tiết ${i + 1} · ${s.teacher}`, qs);
  state.answered += qs.filter((q) => !q.sleep).length;
  state.correct += c;
  award(s.id, c);
  addStat('energy', -7);
  state.clock = PERIOD_START[i] + 45;
  toast(`${s.icon} ${s.name}: đúng ${c}/3`);
  save();
}

function award(id, pts) {
  const before = state.progress[id];
  state.progress[id] = Math.min(POINTS_TO_PASS, before + pts);
  state.today.gained += state.progress[id] - before;
  if (before < POINTS_TO_PASS && state.progress[id] >= POINTS_TO_PASS) {
    sfx('up');
    sys(`🎉 Hoàn thành môn ${subj(id).name} lớp ${state.grade}!`);
    toast(`🎉 Hoàn thành môn ${subj(id).name}!`, 3000);
  }
}

function standUp() {
  sitting = false;
  player.userData.sitting = false;
  const seat = mySeat();
  player.position.set(seat.x, 0, seat.z + 0.45);
}

function startBreak() {
  const t = state.today;
  standUp();
  sub = 'break';
  breakStart = now;
  breakWarned = false;
  state.clock = 515;
  sfx('bell');
  npcs.toYard();
  setTeacherLabel(null);
  sys('Ra chơi 25 phút! Ra sân, căng tin, thư viện… Nghe chuông thì vào lớp.');
  if (t.lunchbox) { addStat('energy', 20); toast('🍱 Bạn mở hộp đồ ăn mẹ chuẩn bị: năng lượng +20'); }
  else if (!t.breakfast) toast('😣 Bụng đói cồn cào… ra căng tin mua gì ăn đi!');
  if (!has('bi-bat-nat') && !t.bullyDone && state.day >= 2 && Math.random() < 0.35) bullyAt = now + 12 + Math.random() * 25;
  else bullyAt = 0;
  setObjective();
}

function endBreak() {
  npcs.toClass();
  bullyAt = 0;
  startClass(2);
}

function endSchool() {
  standUp();
  sub = 'done';
  state.phase = 'after';
  state.clock = 635;
  sfx('bell');
  npcs.leaveSchool();
  setTeacherLabel(null);
  sys('Tan trường! Ra cổng để về nhà, hoặc ở lại chơi với bạn (lêu lổng).');
  setObjective();
  save();
}

function skipPeriod() {
  const t = state.today, s = subj(t.subjects[t.period]);
  t.skipped++;
  addStat('conduct', -6);
  ask('Trốn tiết!', `<p>Bạn không vào lớp tiết ${s.name}. Cô ghi vào sổ đầu bài.</p><p class="meta">Hạnh kiểm −6 · Không được điểm môn này hôm nay</p>`, [{ label: 'Ừ thì…', value: 1 }]);
  if (t.period === 1) startBreak();
  else if (t.period >= 3) endSchool();
  else startClass(t.period + 1);
}

async function goHome(reason) {
  await fade(() => {
    state.phase = 'evening';
    state.clock = Math.max(1080, state.clock + 30); // 18:00
    npcs.showSchool(false);
    placePlayer(W.spots.homeSpawn.x, 4.2, Math.PI);
    setScarf(false);
    setObjective();
    save();
  });
  if (reason) toast(reason, 3200);
  say(npcs.mom.label, state.today.loiter ? 'Sao hôm nay về muộn thế con?' : 'Con về rồi à, đi tắm rồi ăn cơm nhé!');
  sys(`Buổi tối: còn ${state.today.slots} lượt việc. Học bài, giặt đồ, soạn cặp, nghỉ ngơi — rồi đi ngủ.`);
}

function useSlot(minutes = 45) {
  state.today.slots--;
  state.clock += minutes;
}

async function endDay() {
  busy = true;
  const t = state.today;
  const late = state.clock > 1350;
  addStat('energy', 45 + Math.max(0, t.slots) * 5 - (late ? 10 : 0));
  addStat('mood', 4);
  const clean = t.arrive <= PERIOD_START[0] && !t.skipped && !t.loiter && !t.lateToClass && t.dressed && t.scarf;
  if (clean) addStat('conduct', 3);
  const changes = evaluateTags();
  const lines = [
    `Điểm môn học hôm nay: +${t.gained}`,
    `Hạnh kiểm: ${conductName(state.stats.conduct)} (${state.stats.conduct})`,
    `Tỉ lệ trả lời đúng: ${Math.round(accuracy() * 100)}%`,
  ];
  if (clean) lines.push('Một ngày ngoan: hạnh kiểm +3');
  if (t.skipped) lines.push(`Trốn ${t.skipped} tiết`);
  if (late) lines.push('Thức khuya — sáng mai hơi mệt');
  await fade(async () => {});
  await ask(`🌙 Kết thúc ngày ${state.day}`, `<p>${lines.join('<br>')}</p>${changes.length ? `<p><b>${changes.join('<br>')}</b></p>` : ''}`, [{ label: 'Ngủ ngon 😴', value: 1 }]);
  await checkPromotion();
  state.day++;
  state.today = newToday();
  busy = false;
  await enterMorning();
}

function evaluateTags() {
  const out = [];
  const s = state.stats, acc = accuracy();
  const add = (t, msg) => { if (!has(t)) { state.tags.push(t); out.push(msg); } };
  const remove = (t, msg) => { if (has(t)) { state.tags = state.tags.filter((x) => x !== t); out.push(msg); } };
  if (state.answered >= 15 && acc >= 0.8 && s.conduct >= 80) add('gioi', '🌟 Bạn được công nhận Học sinh giỏi! Phòng học sinh giỏi đã mở.');
  else if (has('gioi') && (acc < 0.7 || s.conduct < 70)) remove('gioi', 'Bạn mất danh hiệu Học sinh giỏi. Cố lên nhé!');
  if (has('ca-biet')) {
    if (s.conduct >= 75) {
      remove('ca-biet', '👏 Bạn đã tiến bộ, không còn là học sinh cá biệt!');
      state.lateCount = 0;
      state.loiterCount = 0;
    }
  } else if (s.conduct < 60 || state.lateCount >= 3 || state.loiterCount >= 4) {
    add('ca-biet', '😎 Bạn bị xếp vào nhóm Học sinh cá biệt. Góc sau căng tin đã mở… nhưng thầy cô để ý bạn hơn.');
  }
  if (!has('ca-biet') && state.day >= 3 && s.conduct >= 85 && acc >= 0.6) add('lop-truong', '🎗️ Cô chủ nhiệm chọn bạn làm Lớp trưởng! Phòng Đội đã mở.');
  else if (has('lop-truong') && (s.conduct < 70 || has('ca-biet'))) remove('lop-truong', 'Bạn không còn làm lớp trưởng nữa.');
  refreshMyTag();
  return out;
}

async function checkPromotion() {
  const allDone = SUBJECTS.every((s) => state.progress[s.id] >= POINTS_TO_PASS);
  if (!allDone || state.graduated) return;
  if (state.stats.conduct < 50) {
    await ask('Chưa được lên lớp', '<p>Bạn đã học xong 12 môn, nhưng hạnh kiểm đang <b>Yếu</b>. Cần hạnh kiểm Trung bình (50) trở lên để lên lớp.</p>', [{ label: 'Con sẽ cố gắng', value: 1 }]);
    return;
  }
  sfx('up');
  if (state.grade >= 9) {
    state.graduated = true;
    await ask('🎓 Tốt nghiệp THCS!', `<p>Chúc mừng <b>${esc(state.name)}</b> đã hoàn thành chương trình lớp 6 → 9 tại ${esc(state.school)}!</p><p>Bạn có thể tiếp tục đi học để ôn tập, hoặc chơi lại từ đầu.</p>`, [{ label: 'Tuyệt vời!', value: 1 }]);
    return;
  }
  state.grade++;
  state.progress = Object.fromEntries(SUBJECTS.map((s) => [s.id, 0]));
  addStat('conduct', 5);
  await ask(`🎉 Lên lớp ${state.grade}!`, `<p>Bạn đã hoàn thành đủ 12 môn. Từ mai bạn học <b>Lớp ${state.grade}A</b>.</p><p class="meta">Câu hỏi sẽ khó hơn theo chương trình lớp ${state.grade}.</p>`, [{ label: 'Lên lớp thôi!', value: 1 }]);
  npcs.spawn(state.grade);
}

// ---------------- bullying event (handled supportively) ----------------
async function bullyEvent() {
  const z = zoneAt(player.position);
  if (!z || z.id !== 'yard' || sitting) { bullyAt = 0; return; }
  bullyAt = 0;
  bullyActive = true;
  const [a, b] = npcs.bullies;
  npcs.goTo(a, player.position.x - 1.1, player.position.z - 0.6);
  npcs.goTo(b, player.position.x + 1.1, player.position.z - 0.6);
  say(a.label, 'Ê nhóc, đứng lại!');
  await new Promise((r) => setTimeout(r, 1800));
  say(b.label, 'Có tiền không, đưa đây!');
  const t = state.today;
  t.bullyDone = true;
  const choice = await ask('😟 Bị chặn đường', `<p><b>Tèo Bự</b> và <b>Long Gấu</b> (lớp 9) chặn bạn lại, đòi tiền và trêu chọc.</p><p>Bạn làm gì?</p>`, [
    { label: '🙅 Nói “Không!” rồi đi thẳng tới chỗ thầy giám thị', value: 'refuse' },
    { label: '💸 Đưa tiền cho xong chuyện', value: 'pay' },
    { label: '👊 Đánh lại', value: 'fight' },
  ]);
  if (choice === 'refuse') {
    addStat('mood', -5);
    npcs.goTo(npcs.monitor, player.position.x + 0.8, player.position.z + 1);
    say(npcs.monitor.label, 'Có thầy đây! Hai em kia về lớp ngay!');
  } else if (choice === 'pay') {
    const lost = Math.min(10, state.stats.money);
    addStat('money', -lost);
    addStat('mood', -15);
    say(a.label, 'Ngoan đấy, mai nhớ mang tiếp nhé.');
  } else {
    addStat('conduct', -10);
    addStat('mood', -5);
    npcs.goTo(npcs.monitor, player.position.x + 0.8, player.position.z + 1);
    say(npcs.monitor.label, 'Dừng lại! Cả ba em lên phòng giám thị!');
  }
  setTimeout(() => { a.wander = b.wander = true; a.path = [pick(W.spots.yardPoints)]; b.path = [pick(W.spots.yardPoints)]; }, 2500);
  if (!has('bi-bat-nat')) { state.tags.push('bi-bat-nat'); state.counselSinceTag = 0; }
  bullyActive = false;
  await ask('🛡️ Bạn không có lỗi', `<p>Bị bắt nạt <b>không phải lỗi của bạn</b>. Điều quan trọng là kể cho người lớn tin cậy: thầy cô, bố mẹ.</p>
    <p>Từ giờ nút <b>🛡️ Báo cô</b> luôn ở góc màn hình. <b>Phòng tư vấn</b> (dãy bên trái sân) có cô Thu luôn lắng nghe.</p>
    <p class="meta">Ngoài đời: gọi <b>111</b> — Tổng đài quốc gia bảo vệ trẻ em, miễn phí, 24/7.</p>`, [{ label: 'Mình hiểu rồi', value: 1 }]);
  renderSpecial();
  save();
}

async function reportTeacher() {
  const t = state.today;
  await ask('🛡️ Báo cô', `<p><b>Cô Hạnh:</b> “Cảm ơn em đã kể với cô. Em làm đúng lắm. Cô sẽ nói chuyện với các bạn đó và báo gia đình. Thầy giám thị sẽ để ý em trong giờ ra chơi.”</p>`, [{ label: 'Em cảm ơn cô', value: 1 }]);
  guardUntil = now + 60;
  if (!t.reportedTeacher) { t.reportedTeacher = true; addStat('mood', 8); }
  if (state.phase === 'school' || state.phase === 'after') say(npcs.monitor.label, 'Thầy ở gần đây, có gì gọi thầy nhé.');
}

// ---------------- hotspot actions ----------------
function morningOnly(label, run) { return state.phase === 'morning' ? { label, run } : null; }

function actionFor(id) {
  const p = state.phase, t = state.today;
  const atSchool = p === 'school' || p === 'after';
  const freeTime = (p === 'school' && sub === 'break') || p === 'after' || (p === 'school' && sub === 'preBell');
  switch (id) {
    case 'home-table':
      if (p === 'morning') return { label: '🍚 Bàn ăn', run: morningTable };
      if (p === 'evening' && !t.dinner) return { label: '🍲 Ăn tối cùng gia đình', run: async () => { t.dinner = true; addStat('energy', 15); addStat('mood', 10); say(npcs.mom.label, 'Con ăn nhiều vào nhé!'); toast('🍲 Năng lượng +15, tâm trạng +10'); } };
      return null;
    case 'home-wardrobe':
      if (p === 'morning') return { label: '👕 Tủ quần áo', run: morningWardrobe };
      if (p === 'evening' && !state.prepared.uniform && t.slots > 0) return { label: '🧺 Giặt & ủi đồng phục', run: async () => { state.prepared.uniform = true; useSlot(); toast('🧺 Đồng phục sạch thơm cho ngày mai!'); } };
      return null;
    case 'home-bag':
      if (p === 'morning' && !t.bag && !state.prepared.bag) return { label: '🎒 Soạn cặp (+8 phút)', run: async () => { t.bag = true; state.clock += 8; toast('🎒 Đã soạn cặp'); } };
      if (p === 'evening' && !state.prepared.bag) return { label: '🎒 Soạn cặp cho ngày mai', run: async () => { state.prepared.bag = true; state.clock += 10; toast('🎒 Cặp sách đã sẵn sàng cho ngày mai'); } };
      return null;
    case 'home-desk':
      if (p === 'morning') return { label: '📅 Xem thời khoá biểu', run: showTimetable };
      if (p === 'evening' && t.slots > 0) return { label: '📝 Học bài', run: homework };
      return null;
    case 'home-bed':
      if (p === 'morning') return { label: '😴 Ngủ nướng thêm 15 phút', run: async () => { state.clock += 15; addStat('energy', 8); toast('😴 Thêm 15 phút… năng lượng +8'); say(npcs.mom.label, 'Còn ngủ nữa là trễ đó con!'); } };
      if (p === 'evening') return { label: '🛏️ Giường', run: bedMenu };
      return null;
    case 'home-sofa':
      if (p === 'morning') return { label: '📺 Xem tivi (+10 phút)', run: async () => { state.clock += 10; addStat('mood', 5); toast('📺 Hoạt hình buổi sáng… tâm trạng +5'); } };
      if (p === 'evening' && t.slots > 0) return { label: '🛋️ Nghỉ ngơi xem tivi', run: async () => { useSlot(); addStat('energy', 15); addStat('mood', 10); toast('🛋️ Năng lượng +15, tâm trạng +10'); } };
      return null;
    case 'home-door':
      return morningOnly('🚪 Đi học', () => leaveHome());
    case 'gate':
      return p === 'after' ? { label: '🏠 Về nhà', run: () => goHome(t.loiter ? null : '🏠 Về thẳng nhà — ngoan quá!') } : null;
    case 'seat':
      return p === 'school' && sub === 'class' && !sitting ? { label: '🪑 Ngồi vào chỗ', run: sitDown } : null;
    case 'library-read':
      if (p === 'school' && sub === 'break' && !t.readBreak) return { label: '📚 Đọc sách (ôn 2 câu)', run: () => { t.readBreak = true; return practice(2, 'Thư viện'); } };
      if (p === 'after' && t.slots > 0) return { label: '📚 Ở lại thư viện ôn bài', run: () => { useSlot(); return practice(3, 'Thư viện'); } };
      return null;
    case 'canteen':
      return freeTime ? { label: '🥖 Căng tin', run: canteen } : null;
    case 'shuttlecock':
      if (p === 'school' && sub === 'break' && !t.playedBreak) return { label: '🏸 Đá cầu', run: async () => { t.playedBreak = true; addStat('mood', 8); addStat('energy', -5); toast('🏸 Vui quá! Tâm trạng +8'); } };
      if (p === 'after' && t.slots > 0) return { label: '🏸 Ở lại đá cầu (lêu lổng)', run: () => loiter('🏸 Đá cầu với bạn tới trưa', 12, -8, 0) };
      return null;
    case 'hangout':
      if (p === 'after' && t.slots > 0) return { label: '😎 Tụ tập chơi game, ăn vặt', run: () => loiter('😎 Tụ tập với hội bạn cá biệt', 15, -5, -5) };
      if (p === 'school' && sub === 'break') return { label: '😎 Tụ tập ở góc sau', run: async () => { addStat('mood', 8); addStat('conduct', -1); toast('😎 Tâm trạng +8, hạnh kiểm −1'); } };
      return null;
    case 'counsel':
      return atSchool ? { label: '💬 Nói chuyện với cô Thu', run: counsel } : null;
    case 'excellent-room':
      return atSchool && !t.challenge && !(p === 'school' && sub === 'class') ? { label: '🌟 Thử thách học sinh giỏi', run: challenge } : null;
    case 'team-room':
      return atSchool && !t.meeting ? { label: '🎗️ Họp cán sự lớp', run: meeting } : null;
    case 'teachers-room':
      return atSchool ? { label: '👩‍🏫 Phòng giáo viên', run: async () => toast('Phòng giáo viên sẽ có tính năng ở bản nhiều người chơi.') } : null;
  }
  return null;
}

async function morningTable() {
  const t = state.today;
  const v = await ask('🍚 Bàn ăn', '<p>Mẹ đã nấu bữa sáng và chuẩn bị sẵn hộp đồ ăn.</p>', [
    { label: `🍜 Ăn sáng (+10 phút)${t.breakfast ? ' — đã ăn' : ''}`, value: 'eat', disabled: t.breakfast },
    { label: `🍱 Cất hộp đồ ăn vào cặp (+2 phút)${t.lunchbox ? ' — đã lấy' : ''}`, value: 'box', disabled: t.lunchbox },
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'eat') { t.breakfast = true; state.clock += 10; addStat('energy', 20); toast('🍜 No bụng rồi! Năng lượng +20'); }
  if (v === 'box') { t.lunchbox = true; state.clock += 2; toast('🍱 Đã mang đồ ăn'); }
}

async function morningWardrobe() {
  const t = state.today;
  const v = await ask('👕 Tủ quần áo', `<p>${state.prepared.uniform ? 'Đồng phục đã giặt ủi sạch từ tối qua.' : '⚠️ Tối qua chưa giặt đồ, áo hơi nhàu…'}</p>`, [
    { label: `👕 Mặc đồng phục (+5 phút)${t.dressed ? ' — đã mặc' : ''}`, value: 'dress', disabled: t.dressed },
    { label: `🧣 Đeo khăn quàng đỏ (+1 phút)${t.scarf ? ' — đã đeo' : ''}`, value: 'scarf', disabled: t.scarf },
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'dress') { t.dressed = true; t.dirty = !state.prepared.uniform; state.clock += 5; toast(t.dirty ? '👕 Mặc tạm áo nhàu…' : '👕 Đồng phục gọn gàng!'); }
  if (v === 'scarf') { t.scarf = true; state.clock += 1; setScarf(true); toast('🧣 Đã đeo khăn quàng đỏ'); }
}

async function showTimetable() {
  const list = state.today.subjects.map((id, i) => `Tiết ${i + 1}${i === 2 ? ' (sau ra chơi)' : ''}: ${subj(id).icon} ${subj(id).name}`).join('<br>');
  await ask('📅 Thời khoá biểu hôm nay', `<p>${list}</p><p class="meta">Vào lớp lúc 7:00. Đi bộ đến trường mất 15 phút.</p>`, [{ label: 'Đã nhớ', value: 1 }]);
}

async function homework() {
  const inc = SUBJECTS.filter((s) => state.progress[s.id] < POINTS_TO_PASS);
  const list = (inc.length ? inc : SUBJECTS).slice(0, 6);
  const id = await ask('📝 Học bài môn nào?', '<p>Ôn 2 câu, mỗi câu đúng được 1 điểm môn.</p>', [
    ...list.map((s) => ({ label: `${s.icon} ${s.name} (${Math.min(state.progress[s.id], POINTS_TO_PASS)}/${POINTS_TO_PASS})`, value: s.id })),
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (!id) return;
  useSlot();
  await quizFor(id, 2, 'Học bài ở nhà');
  addStat('energy', -5);
}

async function practice(n, where) {
  const inc = SUBJECTS.filter((s) => state.progress[s.id] < POINTS_TO_PASS);
  const s = pick(inc.length ? inc : SUBJECTS);
  await quizFor(s.id, n, where);
}

async function quizFor(id, n, where, mult = 1) {
  const s = subj(id), avoid = new Set(), qs = [];
  for (let k = 0; k < n; k++) { const q = makeQuestion(id, state.grade, avoid); avoid.add(q.q); qs.push(q); }
  const c = await runQuiz(`${s.icon} ${s.name}`, where, qs);
  state.answered += n;
  state.correct += c;
  award(id, c * mult);
  toast(`${s.icon} ${s.name}: đúng ${c}/${n}${mult > 1 ? ` (×${mult} điểm)` : ''}`);
  save();
}

async function bedMenu() {
  const t = state.today;
  const v = await ask('🛏️ Giường', `<p>Bây giờ là ${fmt(state.clock)}. Còn ${t.slots} lượt việc.</p>
    <p class="meta">Kiểm tra cho ngày mai: ${state.prepared.uniform ? '✅' : '❌'} đồng phục sạch · ${state.prepared.bag ? '✅' : '❌'} cặp sách</p>`, [
    { label: '📱 Lướt điện thoại', value: 'phone', disabled: t.slots <= 0 },
    { label: '😴 Đi ngủ (kết thúc ngày)', value: 'sleep' },
    { label: 'Chưa', value: null, cls: 'ghost' },
  ]);
  if (v === 'phone') { useSlot(60); addStat('mood', 8); addStat('energy', -10); toast('📱 Vui đấy nhưng hơi mỏi mắt. Tâm trạng +8, năng lượng −10'); }
  if (v === 'sleep') await endDay();
}

async function canteen() {
  const t = state.today, p = state.phase;
  const v = await ask('🥖 Căng tin', `<p>Bạn có ${state.stats.money}k.</p>`, [
    { label: '🥖 Bánh mì — 10k (năng lượng +25)', value: 'bread', disabled: state.stats.money < 10 },
    { label: '🥛 Sữa đậu nành — 5k (năng lượng +10)', value: 'milk', disabled: state.stats.money < 5 },
    ...(p === 'after' ? [{ label: '🍧 Ngồi ăn vặt với bạn tới trưa — 10k (lêu lổng)', value: 'snack', disabled: state.stats.money < 10 || t.slots <= 0 }] : []),
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'bread') { addStat('money', -10); addStat('energy', 25); toast('🥖 Năng lượng +25'); }
  if (v === 'milk') { addStat('money', -5); addStat('energy', 10); toast('🥛 Năng lượng +10'); }
  if (v === 'snack') { addStat('money', -10); await loiter('🍧 Ăn vặt với bạn', 12, 5, 0); }
}

async function loiter(text, mood, energy, money) {
  const t = state.today;
  useSlot(60);
  t.loiter++;
  state.loiterCount++;
  addStat('mood', mood);
  addStat('energy', energy);
  addStat('money', money);
  addStat('conduct', -2);
  toast(`${text}: tâm trạng +${mood}, hạnh kiểm −2 · Tối nay bớt 1 lượt việc`, 3000);
  if (state.clock >= 780) await goHome('📞 Mẹ gọi: “Sao giờ này chưa về hả con?”');
}

async function counsel() {
  const opts = [
    { label: '😔 Dạo này em thấy buồn, áp lực', value: 'sad' },
    ...(has('bi-bat-nat') ? [{ label: '🛡️ Em bị bạn bắt nạt', value: 'bully' }] : []),
    { label: '📚 Em lo chuyện học hành', value: 'study' },
    { label: 'Dạ không có gì ạ', value: null, cls: 'ghost' },
  ];
  say(npcs.counselor.label, 'Chào em, ngồi xuống đây nói chuyện với cô nhé.');
  const v = await ask('💬 Phòng tư vấn — cô Thu', '<p>“Ở đây em nói gì cô cũng lắng nghe, không ai chê cười em cả.”</p>', opts);
  if (!v) return;
  const replies = {
    sad: 'Cảm ơn em đã chia sẻ. Buồn là cảm xúc bình thường, em không có lỗi gì cả. Thử hít thở chậm, ngủ đủ, và kể cho một người em tin tưởng nhé. Nếu buồn kéo dài nhiều ngày, mình cùng nói với bố mẹ để tìm cách giúp em.',
    bully: 'Em đã rất dũng cảm khi kể ra. Đây không phải lỗi của em. Cô sẽ phối hợp với cô chủ nhiệm và gia đình. Khi bị chặn đường, em hãy đi về chỗ đông người hoặc chỗ thầy cô. Ngoài đời, em có thể gọi 111 — miễn phí.',
    study: 'Học từng chút một mỗi ngày là đủ. Em thử chia nhỏ bài, ôn môn còn yếu vào buổi tối, và hỏi cô giáo khi chưa hiểu. Ai cũng có môn giỏi, môn chưa giỏi mà.',
  };
  addStat('mood', 10);
  await ask('💬 Cô Thu', `<p>${replies[v]}</p><p class="meta">Tâm trạng +10</p>`, [{ label: 'Em cảm ơn cô', value: 1 }]);
  if (has('bi-bat-nat') && v === 'bully') {
    state.counselSinceTag++;
    if (state.counselSinceTag >= 2) {
      state.tags = state.tags.filter((x) => x !== 'bi-bat-nat');
      await ask('🌱 Bạn đã ổn hơn', '<p>Chuyện bắt nạt đã được thầy cô giải quyết. Nếu có chuyện lặp lại, hãy báo ngay nhé — cô Thu và nút Báo cô luôn sẵn sàng.</p>', [{ label: 'Vâng ạ', value: 1 }]);
      renderSpecial();
    }
  }
  save();
}

async function challenge() {
  const t = state.today;
  t.challenge = true;
  const inc = SUBJECTS.filter((s) => state.progress[s.id] < POINTS_TO_PASS);
  const s = pick(inc.length ? inc : SUBJECTS);
  await quizFor(s.id, 3, 'Thử thách học sinh giỏi', 2);
}

async function meeting() {
  const t = state.today;
  t.meeting = true;
  addStat('conduct', 2);
  addStat('mood', 5);
  const st = npcs.students().filter((n) => n.grade === state.grade).length;
  await ask('🎗️ Họp cán sự lớp', `<p><b>Sổ đầu bài hôm nay — Lớp ${state.grade}A</b></p>
    <p>Sĩ số: ${st + 1} · Bạn đi muộn: ${t.arrive > PERIOD_START[0] ? 'có' : 'không'} · Tiết bị trốn: ${t.skipped}</p>
    <p>Lớp trưởng lên kế hoạch thi đua tuần: giữ trật tự giờ học, giúp bạn học yếu.</p><p class="meta">Hạnh kiểm +2, tâm trạng +5</p>`, [{ label: 'Kết thúc họp', value: 1 }]);
}

async function interact() {
  if (busy || ui.modalOpen || !state) return;
  const a = currentAction;
  if (!a) return;
  busy = true;
  try { await a.run(); } finally { busy = false; }
  setObjective();
}

// ---------------- chat ----------------
function cleanText(s) {
  return s.split(/(\s+)/).map((w) => (BAD_WORDS.includes(w.toLowerCase().replace(/[.,!?]/g, '')) ? '***' : w)).join('');
}
$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = $('chatInput');
  const text = cleanText(inp.value.trim());
  inp.value = '';
  inp.blur();
  if (!text || !state) return;
  const z = zoneAt(player.position);
  if (z?.quiet) {
    if (!has('ca-biet')) {
      toast(`🤫 ${z.name}: giữ trật tự! Không được nói chuyện.`);
      return;
    }
    if (state.phase === 'school' && sub === 'class' && Math.random() < 0.35) {
      addStat('conduct', -1);
      setTimeout(() => sys('Cô giáo nhắc nhở: “Học sinh cá biệt lại nói chuyện riêng!” (hạnh kiểm −1)'), 600);
    }
  }
  chatLine(state.name, text);
  say(meLabel, text);
  if (state.phase === 'morning' || state.phase === 'evening') {
    setTimeout(() => { const r = pick(['Ừ, con nhanh lên nhé.', 'Mẹ nghe rồi.', 'Con ngoan lắm.']); say(npcs.mom.label, r); chatLine('Mẹ', r); }, 900);
    return;
  }
  const n = npcs.nearest(player.position, 7);
  if (n) {
    const greet = /chào|hello|hi\b|xin chào/i.test(text);
    const r = greet ? `Chào ${state.name}!` : text.includes('?') ? pick(['Không biết nữa 😅', 'Hỏi cô đi!', 'Hình như là có đó']) : pick(LINES.reply);
    setTimeout(() => { say(n.label, r); chatLine(n.name, r); }, 900 + Math.random() * 800);
  }
});

// ---------------- HUD ----------------
function setObjective() {
  if (!state) return;
  const p = state.phase, t = state.today;
  let s = '';
  if (p === 'morning') {
    const miss = morningMissing();
    s = state.clock > 405 ? '⏰ Sắp trễ rồi! Ra cửa đi học ngay!' : miss.length ? `Chuẩn bị: ${miss.join(' · ')} → rồi ra cửa đi học` : '✅ Đủ đồ rồi! Ra cửa đi học';
  } else if (p === 'school') {
    if (sub === 'preBell') s = 'Chưa vào giờ (7:00). Dạo sân trường, hoặc vào lớp ngồi trước.';
    else if (sub === 'class' && !sitting) {
      const left = Math.max(0, Math.ceil(CLASS_SKIP_SECONDS - (now - classStart)));
      s = `🔔 Tiết ${t.period + 1}: ${subj(t.subjects[t.period]).name} — vào Lớp ${state.grade}A, ngồi chỗ có vòng sáng (${left}s)`;
    } else if (sub === 'break') s = `Ra chơi — còn ${Math.max(0, Math.ceil(BREAK_SECONDS - (now - breakStart)))}s`;
  } else if (p === 'after') s = 'Tan học! Ra cổng để về nhà, hoặc ở lại chơi (lêu lổng).';
  else if (p === 'evening') s = t.slots > 0 ? `Buổi tối: còn ${t.slots} lượt — học bài, giặt đồ, soạn cặp, nghỉ ngơi… rồi lên giường đi ngủ` : 'Hết lượt việc rồi — lên giường đi ngủ';
  $('objective').textContent = s;
}

function renderSpecial() {
  const box = $('special');
  box.innerHTML = '';
  if (!state) return;
  if (has('bi-bat-nat')) {
    const b = document.createElement('button');
    b.className = 'safe';
    b.textContent = '🛡️ Báo cô';
    b.onclick = () => { if (!ui.modalOpen) reportTeacher(); };
    box.appendChild(b);
  }
  if (has('lop-truong') && state.phase === 'school' && !state.today.ordered) {
    const b = document.createElement('button');
    b.className = 'order';
    b.textContent = '📢 Giữ trật tự';
    b.onclick = () => {
      state.today.ordered = true;
      npcs.quietUntil = now + 40;
      chatLine(`Lớp trưởng ${state.name}`, 'Cả lớp trật tự nào!');
      say(meLabel, 'Cả lớp trật tự nào!');
      addStat('conduct', 1);
      renderSpecial();
    };
    box.appendChild(b);
  }
}

let hudT = 0, lastSpecialKey = '';
function updateHud(npcCount) {
  const s = state.stats;
  $('schoolName').textContent = state.school;
  $('npcCount').textContent = npcCount;
  $('clock').textContent = fmt(state.clock);
  $('phaseName').textContent = PHASE_NAMES[state.phase];
  $('classInfo').textContent = `Lớp ${state.grade}A · Ngày ${state.day}`;
  $('conduct').textContent = `${conductName(s.conduct)} (${s.conduct})`;
  $('energyBar').style.width = s.energy + '%';
  $('moodBar').style.width = s.mood + '%';
  $('money').textContent = s.money;
  const z = zoneAt(player.position);
  $('zoneName').textContent = z ? z.name + (z.quiet ? ' 🤫' : '') : 'Đường đi';
  $('tagChips').innerHTML = state.tags.map((t) => `<span>${TAGS[t].icon} ${esc(TAGS[t].name)}</span>`).join('');
  const key = state.tags.join() + state.phase + state.today.ordered;
  if (key !== lastSpecialKey) { lastSpecialKey = key; renderSpecial(); }
  setObjective();
}

$('btnSubjects').onclick = () => {
  if (ui.modalOpen) return;
  const rows = SUBJECTS.map((s) => {
    const v = Math.min(state.progress[s.id], POINTS_TO_PASS);
    return `<span>${s.icon} ${s.name}</span><span>${v}/${POINTS_TO_PASS}${v >= POINTS_TO_PASS ? ' ✅' : ''}</span><i><em style="width:${(v / POINTS_TO_PASS) * 100}%"></em></i>`;
  }).join('');
  const done = SUBJECTS.filter((s) => state.progress[s.id] >= POINTS_TO_PASS).length;
  ask(`📚 Lớp ${state.grade}A — ${done}/12 môn`, `<p class="meta">Hoàn thành đủ 12 môn (và hạnh kiểm từ Trung bình) để lên lớp.</p><div class="prog">${rows}</div>`, [{ label: 'Đóng', value: 1 }]);
};
$('btnTags').onclick = () => {
  if (ui.modalOpen) return;
  const rows = Object.entries(TAGS).map(([k, t]) => `<div class="tagRow ${has(k) ? 'on' : ''}">${t.icon} ${t.name}${has(k) ? ' — bạn đang có' : ''}<small>Cách có: ${t.how}</small><small>Quyền: ${t.perk}</small></div>`).join('');
  ask('🏷️ Danh hiệu (tag)', rows, [{ label: 'Đóng', value: 1 }]);
};
$('btnSound').onclick = () => { ui.soundOn = !ui.soundOn; $('btnSound').textContent = ui.soundOn ? '🔊' : '🔇'; };
$('btnHelp').onclick = () => { if (!ui.modalOpen) showHelp(); };
function showHelp() {
  const controls = TOUCH
    ? '<b>Di chuyển:</b> kéo cần điều khiển (góc trái dưới), hoặc <b>chạm xuống đất</b> để đi tới đó. <b>Tương tác:</b> nút vàng (góc phải dưới). <b>Chat:</b> nút 💬. <b>Zoom:</b> chụm/mở hai ngón. Chạm tên trường để thu gọn bảng thông tin.'
    : '<b>Di chuyển:</b> W A S D / phím mũi tên. <b>Tương tác:</b> phím E / Space hoặc nút vàng. <b>Chat:</b> Enter. Lăn chuột để phóng to/thu nhỏ.';
  return ask('❓ Cách chơi', `<p>${controls}</p>
    <p><b>Một ngày có 4 giai đoạn:</b><br>
    🌅 <b>Chuẩn bị đến trường</b> — ăn sáng, mặc đồng phục, khăn quàng đỏ, soạn cặp, mang đồ ăn. Ra cửa trước 6:45 để không trễ.<br>
    🏫 <b>Tại trường</b> — 4 tiết học (trả lời câu hỏi để lấy điểm môn), giữa giờ có ra chơi. Nghe chuông thì vào lớp.<br>
    🔔 <b>Tan trường</b> — về thẳng nhà, hoặc ở lại chơi (lêu lổng: vui nhưng mất hạnh kiểm và bớt thời gian buổi tối).<br>
    🌙 <b>Buổi tối</b> — học bài, giặt đồng phục, soạn cặp, nghỉ ngơi, rồi đi ngủ.</p>
    <p><b>Lên lớp:</b> mỗi môn cần ${POINTS_TO_PASS} điểm. Đủ 12 môn → lên lớp, từ lớp 6 đến lớp 9.</p>
    <p>🤫 Lớp học và thư viện không được nói chuyện (trừ học sinh cá biệt). Xem 🏷️ để biết các danh hiệu và khu vực riêng.</p>`, [{ label: 'Vào chơi', value: 1 }]);
}

// ---------------- labels ----------------
const v3 = new THREE.Vector3();
function placeLabel(label, obj, h, visible) {
  if (!visible) { label.el.style.display = 'none'; return; }
  v3.set(obj.position.x, (obj.userData.sitting ? h - 0.35 : h), obj.position.z).project(camera);
  if (v3.z > 1 || v3.x < -1.2 || v3.x > 1.2 || v3.y < -1.2 || v3.y > 1.2) { label.el.style.display = 'none'; return; }
  label.el.style.display = '';
  label.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px, ${(-v3.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
}

// ---------------- light by time of day ----------------
const tmpC = new THREE.Color();
function applyLight() {
  const h = state.clock / 60;
  let day;
  if (h < 5 || h >= 20.5) day = 0;
  else if (h < 7) day = (h - 5) / 2;
  else if (h < 17) day = 1;
  else day = Math.max(0, 1 - (h - 17) / 3.5);
  hemi.intensity = 0.55 + 1.15 * day;
  sun.intensity = 0.25 + 2.0 * day;
  if (day >= 1) tmpC.copy(SKY.day);
  else if (h < 12) tmpC.lerpColors(SKY.night, SKY.day, day);
  else if (day > 0.5) tmpC.lerpColors(SKY.dusk, SKY.day, (day - 0.5) * 2);
  else tmpC.lerpColors(SKY.night, SKY.dusk, day * 2);
  scene.background.copy(tmpC);
  scene.fog.color.copy(tmpC);
}

// ---------------- main loop ----------------
const camPos = new THREE.Vector3(0, 15, 15);
const lookAt = new THREE.Vector3();
let currentAction = null;
let last = performance.now();

function tick(t) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (!state || !player) { renderer.render(scene, camera); return; }
  const paused = ui.modalOpen;
  if (!paused) now += dt;

  // movement
  let mx = 0, mz = 0;
  if (!paused && !sitting && !chatFocused() && !busy) {
    if (keys.has('w') || keys.has('arrowup')) mz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) mz += 1;
    if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
    if (keys.has('d') || keys.has('arrowright')) mx += 1;
    mx += joy.x;
    mz += joy.z;
  }
  let len = Math.hypot(mx, mz);
  if (len > 0.1) clearMoveTarget(); // manual control wins over tap-to-move
  else if (moveTarget && !paused && !sitting && !busy) {
    const dx = moveTarget.x - player.position.x, dz = moveTarget.z - player.position.z, d = Math.hypot(dx, dz);
    if (d < 0.3) clearMoveTarget();
    else { mx = dx / d; mz = dz / d; len = 1; }
  } else if (moveTarget && (sitting || busy)) clearMoveTarget();
  let moved = 0;
  if (len > 0.1) {
    const sp = (state.stats.energy < 20 ? 3 : 4.6) * Math.min(1, len) / len;
    const ox = player.position.x, oz = player.position.z;
    player.position.x += mx * sp * dt;
    player.position.z += mz * sp * dt;
    collide(player.position);
    moved = Math.hypot(player.position.x - ox, player.position.z - oz) / dt;
    faceTowards(player, mx, mz, dt);
    if (moveTarget) { // blocked by a wall for a moment → give up
      moveTarget.stuck = moved < sp * len * 0.3 ? moveTarget.stuck + dt : 0;
      if (moveTarget.stuck > 0.4) clearMoveTarget();
    }
  }
  animateCharacter(player, dt, moved);

  // game clock + phase logic
  if (!paused) phaseTick(dt);

  const npcCount = npcs.update(dt);

  // hotspot prompt
  currentAction = null;
  if (!paused && !busy) {
    let best = null, bd = Infinity;
    const spots = W.hotspots.slice();
    if (state.phase === 'school' && sub === 'class' && !sitting) { const s = mySeat(); spots.push({ id: 'seat', x: s.x, z: s.z, r: 1.3 }); }
    for (const h of spots) {
      const d = Math.hypot(h.x - player.position.x, h.z - player.position.z);
      if (d < h.r && d < bd) {
        const a = actionFor(h.id);
        if (a) { best = a; bd = d; }
      }
    }
    currentAction = best;
  }
  const btn = $('actBtn');
  if (currentAction) { btn.hidden = false; btn.textContent = currentAction.label; } else btn.hidden = true;

  // seat ring
  ring.visible = state.phase === 'school' && sub === 'class' && !sitting;
  if (ring.visible) { const s = mySeat(); ring.position.set(s.x, 0.04, s.z); ring.scale.setScalar(1 + Math.sin(t / 200) * 0.1); }

  // camera
  const target = player.position;
  const want = v3.set(target.x, target.y + camDist * 0.85, target.z + camDist * 0.75);
  camPos.lerp(want, Math.min(1, dt * 6));
  camera.position.copy(camPos);
  lookAt.set(target.x, 1, target.z);
  camera.lookAt(lookAt);
  sun.position.set(target.x + 14, 30, target.z + 10);
  sun.target.position.set(target.x, 0, target.z);
  if (W.flag) W.flag.rotation.y = Math.sin(t / 600) * 0.15;

  // labels
  placeLabel(meLabel, player, 2.05, true);
  for (const n of npcs.list) placeLabel(n.label, n.mesh, n.teacher ? 2.15 : 2.05, !n.hidden && n.mesh.visible && n.mesh.position.distanceTo(target) < 34);

  hudT -= dt;
  if (hudT <= 0) { hudT = 0.25; updateHud(npcCount); applyLight(); }
  renderer.render(scene, camera);
}

function phaseTick(dt) {
  const p = state.phase, t = state.today;
  if (p === 'morning') {
    state.clock += dt / 1.1;
    if (now - lastMomLine > 14 && state.clock > 395) { lastMomLine = now; say(npcs.mom.label, pick(['Nhanh lên con, sắp trễ rồi!', 'Nhớ khăn quàng đỏ nhé!', 'Ăn sáng chưa con?'])); }
    if (state.clock >= 440 && !busy) {
      busy = true;
      ask('📢 Mẹ gọi', '<p>“Trời ơi 7 giờ 20 rồi! Đi học ngay con!”</p>', [{ label: 'Chạy ngay!', value: 1 }]).then(() => leaveHome(true)).finally(() => { busy = false; });
    }
  } else if (p === 'school') {
    if (sub === 'preBell') {
      state.clock += dt;
      if (state.clock >= PERIOD_START[0]) { npcs.toClass(); startClass(0); }
      chatterTick(LINES.preBell);
    } else if (sub === 'class' && !sitting && !busy) {
      if (now - classStart > CLASS_SKIP_SECONDS) skipPeriod();
    } else if (sub === 'break') {
      const e = now - breakStart;
      state.clock = 515 + (e / BREAK_SECONDS) * 25;
      chatterTick(LINES.break);
      if (!breakWarned && e > BREAK_SECONDS - 15) { breakWarned = true; toast('🔔 Sắp hết giờ ra chơi, chuẩn bị vào lớp!'); }
      if (bullyAt && now > bullyAt && !busy && !bullyActive && now > guardUntil) { busy = true; bullyEvent().finally(() => { busy = false; }); }
      if (e >= BREAK_SECONDS && !busy) endBreak();
    }
    if (now < guardUntil && !npcs.monitor.path.length) {
      const m = npcs.monitor.mesh.position;
      if (m.distanceTo(player.position) > 3) npcs.goTo(npcs.monitor, player.position.x + 1.5, player.position.z + 1);
    } else if (now >= guardUntil && !npcs.monitor.wander && !npcs.monitor.path.length) npcs.monitor.wander = true;
  } else if (p === 'after') {
    state.clock += dt / 2;
    chatterTick(LINES.after);
    if (state.clock >= 780 && !busy) {
      busy = true;
      state.today.loiter++;
      state.loiterCount++;
      addStat('conduct', -2);
      goHome('📞 Mẹ gọi: “Sao giờ này chưa về hả con?” (hạnh kiểm −2)').finally(() => { busy = false; });
    }
  } else if (p === 'evening') {
    if (state.clock >= 1380 && !busy) {
      busy = true;
      ask('🌙 Khuya rồi', '<p>Đã 23 giờ. Mẹ tắt đèn bắt đi ngủ.</p>', [{ label: 'Đi ngủ', value: 1 }]).then(endDay).finally(() => { busy = false; });
    }
  }
}

function chatterTick(lines) {
  if (now - lastChatter < 4.5) return;
  lastChatter = now + Math.random() * 3;
  const c = npcs.chatter(player.position, lines, now);
  if (c) chatLine(c.name, c.text);
}

// ---------------- start screen ----------------
async function begin(fresh) {
  $('start').hidden = true;
  $('hud').hidden = false;
  if (!state.today) state.today = newToday();
  npcs.spawn(state.grade);
  makePlayer();
  if (fresh) await showHelp();
  if (state.phase === 'morning') await enterMorning();
  else if (state.phase === 'school') enterSchool(state.today.arrive || 420, false);
  else if (state.phase === 'after') { enterSchool(635, false); endSchool(); }
  else { npcs.showSchool(false); placePlayer(W.spots.homeSpawn.x, 4.2, Math.PI); }
  sys(`Chào mừng ${state.name} đến ${state.school}!`);
}

const saved = load();
if (saved?.v === 1) {
  $('continueBox').hidden = false;
  $('continueInfo').innerHTML = `<b>${esc(saved.name)}</b> · ${esc(saved.school)} · Lớp ${saved.grade}A · Ngày ${saved.day}`;
}
$('btnContinue').onclick = () => { state = saved; begin(false); };
$('btnReset').onclick = async () => {
  if (!confirm('Xoá tiến độ và chơi lại từ đầu?')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  $('continueBox').hidden = true;
};
$('newForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('fName').value.trim().slice(0, 16) || 'Học sinh';
  const girl = document.querySelector('input[name=fGender]:checked').value === 'girl';
  state = newState(name, $('fSchool').value, girl);
  state.today = newToday();
  begin(true);
});

// test hook, only with ?debug in the URL
if (location.search.includes('debug')) {
  window.__g = {
    get state() { return state; }, get sub() { return sub; }, get sitting() { return sitting; }, get busy() { return busy; },
    W, npcs, interact, actionFor,
    tp: (x, z) => player.position.set(x, 0, z),
    skip: (sec) => { now += sec; },
    pos: () => ({ x: player.position.x, z: player.position.z }),
  };
}

requestAnimationFrame(tick);
