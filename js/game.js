// Main game: renderer, input, camera, the 4-phase school day, tags, promotion, chat.
import * as THREE from './vendor/three.module.min.js';
import { buildWorld } from './world.js';
import { makeCharacter, animateCharacter, faceTowards, SKINS, HAIRS } from './chars.js';
import { Npcs } from './npc.js';
import { SUBJECTS, POINTS_TO_PASS, CLASS_GROUPS, classGroup, makeQuestion } from './subjects.js';
import { $, ui, ask, runQuiz, toast, chatLine, sys, makeLabel, say, setLabelTag, fade, sfx, esc, unlockAudio } from './ui.js';
import { initInstall } from './install.js';
import { loadCatalog } from './items.js';
import * as eco from './economy.js';
import { openFeedback, flushOutbox } from './feedback.js';
import { GAME_VERSION } from './config.js';

const TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
if (TOUCH) document.body.classList.add('touch');
initInstall();

const SAVE_KEY = 'truong-hoc-online-v1'; // storage key kept; the save format version is `state.v`

export const TAGS = {
  'gioi': { name: 'Học sinh giỏi', icon: '🌟', how: 'Trả lời đúng từ 80% (ít nhất 15 câu) và hạnh kiểm từ 80.', perk: 'Vào Phòng học sinh giỏi: mỗi ngày một thử thách, đúng được nhân đôi điểm.' },
  'lop-truong': { name: 'Lớp trưởng', icon: '🎗️', how: 'Từ ngày thứ 3, hạnh kiểm từ 85, đúng từ 60%, không cá biệt.', perk: 'Vào Phòng Đội (họp cán sự), nút “Giữ trật tự” cho cả lớp.' },
  'ca-biet': { name: 'Học sinh cá biệt', icon: '😎', how: 'Hạnh kiểm dưới 60, hoặc vào lớp muộn 3 lần, lêu lổng 4 lần, chọc phá bạn 6 lần.', perk: 'Dám nói chuyện trong lớp và thư viện, vào Góc sau căng tin. Hạnh kiểm lên 75 thì hết.' },
  'bi-bat-nat': { name: 'Đang bị bắt nạt', icon: '🛡️', how: 'Gặp chuyện bị bắt nạt ở trường.', perk: 'Nút “Báo cô” luôn hiện, thầy giám thị để ý bảo vệ, cô Thu ở Phòng tư vấn lắng nghe.' },
  'co-giao': { name: 'Cô giáo', icon: '👩‍🏫', how: 'Vai giáo viên — sẽ mở ở bản nhiều người chơi.', perk: 'Vào Phòng giáo viên.' },
};
const PHASE_NAMES = { home: 'Ở nhà chuẩn bị', school: 'Tại trường', after: 'Tan trường' };
// Real-time rhythm: a school session lasts 6 real hours, then the student goes home to get ready again.
// Periods inside a session run on play time (being offline never counts as skipping class).
const SESSION_MS = 6 * 3600e3;
const WASH_MS = 15 * 60e3;          // washing the uniform takes 15 real minutes
const LOITER_MS = 3 * 60e3;         // after school: mum calls if you hang around this long
const PERIODS_PER_SESSION = 6;      // each of the class's 3 subjects twice
const BREAK_AFTER = new Set([1, 3]); // break after the 2nd and 4th period
const PRE_BELL_SECONDS = 30;
const DIRTY_PENALTY = 3;
const CASUAL_SHIRT = 0xffd180;      // home clothes
const MAX_PACKED_TOYS = 2;          // toy kinds you can bring to school
const PRANK_RANGE = 1.8;            // metres to a classmate
const PRANK_WATCH = 9;              // staff closer than this may catch a prank
const PRANKS_FOR_CA_BIET = 6;
const BREAK_SECONDS = 75;
const CLASS_LATE_SECONDS = 25;
const CLASS_SKIP_SECONDS = 60;
const BAD_WORDS = ['đm', 'đmm', 'dmm', 'vcl', 'vl', 'đéo', 'địt', 'cặc', 'lồn', 'đĩ', 'cmm', 'clgt'];

const LINES = {
  preBell: ['Sắp vào lớp rồi!', 'Bài tập về nhà làm chưa?', 'Hôm nay kiểm tra miệng đó 😨', 'Cho mình chép bài tí 🙏', 'Sáng nay ăn gì đó?'],
  break: ['Ra chơi rồi!!', 'Đá cầu không?', 'Bài Toán khó quá 😵', 'Căng tin có bánh mì mới kìa', 'Ai cho mượn vở Văn với', 'Chiều nay đi học thêm không?', 'Cô Hạnh hôm nay vui ghê', 'Thư viện mới có truyện hay đó', 'Nhảy dây không mọi người?'],
  after: ['Về thôi!', 'Đi ăn chè không?', 'Mai kiểm tra 15 phút đó!', 'Đá cầu thêm ván nữa đi', 'Mẹ đón rồi, bye nha', 'Về nhớ giặt đồ nha'],
  reply: ['Ừ ha 😄', 'Thật hả?', 'Hihi', 'Đúng rồi đó!', 'Để mình nghĩ đã…', 'Chuẩn luôn 👍', 'Haha vui ghê'],
};

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const hhmm = (ms) => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m} phút`; };

// ---------------- state ----------------
let state = null;
let camDist = 16; // camera distance (declared early: resize() uses it)

function newState(name, school, girl) {
  return {
    v: 3, name, school,
    look: { girl, skin: pick(SKINS), hair: pick(HAIRS) },
    grade: 6, section: 1, day: 1, phase: 'home', clock: 360,
    progress: Object.fromEntries(SUBJECTS.map((s) => [s.id, 0])),
    stats: { conduct: 80, energy: 80, mood: 70 },
    coco: 20, ledger: [], inv: {}, acc: null, // coco wallet (economy.js), items owned, worn accessory
    answered: 0, correct: 0, lateCount: 0, loiterCount: 0, prankCount: 0,
    tags: [], counselSinceTag: 0, graduated: false,
    uniform: { clean: 1, dirty: 0, washing: 0, until: 0 }, // sets of the class uniform; until = real ms
    homeAt: Date.now(), sessionStart: 0, sessionEnd: 0,
    today: null,
  };
}
// One "day" = one home visit + the following 6-hour school session.
function newToday() {
  return {
    breakfast: false, lunchbox: false, dressed: false, scarf: false, bag: false, dirty: false,
    subjects: [], period: 0, done: 0, gained: 0, loiter: 0, afterAt: 0,
    bullyDone: false, challenge: false, meeting: false, ordered: false, readBreak: false, playedBreak: false,
    libFree: false, reportedTeacher: false, skipped: 0, lateToClass: 0, caughtDirty: false,
    studied: false, napped: false, tv: false,
    earned: 0, packed: [], pranks: 0, victims: {},
  };
}
// v1 (day of 4 phases, evening at home) → v2 (6-hour real-time sessions, classes A1–A4)
function migrate(s) {
  if (s.v === 1) {
    s.v = 2;
    s.section = firstOpenSection(s.progress);
    s.uniform = { state: s.prepared?.uniform === false ? 'dirty' : 'clean', until: 0 };
    s.phase = 'home';
    s.homeAt = Date.now();
    s.sessionStart = s.sessionEnd = 0;
    s.today = null;
    delete s.prepared;
    delete s.rot;
  }
  // v2 → v3: coco wallet + inventory, uniform as a count of sets
  if (s.v === 2) {
    s.v = 3;
    s.coco = Math.max(0, s.stats?.money ?? 20);
    delete s.stats.money;
    s.ledger = [];
    s.inv = {};
    s.acc = null;
    s.prankCount = 0;
    const u = s.uniform || {};
    s.uniform = { clean: u.state === 'clean' ? 1 : 0, dirty: u.state === 'dirty' ? 1 : 0, washing: u.state === 'washing' ? 1 : 0, until: u.until || 0 };
    if (s.today) Object.assign(s.today, { earned: 0, packed: [], pranks: 0, victims: {} });
  }
  return s.v === 3 ? s : null;
}
function firstOpenSection(progress) {
  const g = CLASS_GROUPS.find((c) => c.subjects.some((id) => (progress[id] ?? 0) < POINTS_TO_PASS));
  return g ? g.sec : 4;
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }
function load() { try { return migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { return null; } }
addEventListener('visibilitychange', () => { if (document.hidden && state) save(); }); // phones close apps without warning

const has = (tag) => state.tags.includes(tag);
function addStat(k, d) {
  state.stats[k] = clamp(state.stats[k] + d, 0, 100);
}
function conductName(c) { return c >= 80 ? 'Tốt' : c >= 65 ? 'Khá' : c >= 50 ? 'Trung bình' : 'Yếu'; }
const accuracy = () => (state.answered ? state.correct / state.answered : 0);

const subj = (id) => SUBJECTS.find((s) => s.id === id);
const cls = () => `${state.grade}A${state.section}`;
const isDone = (id) => state.progress[id] >= POINTS_TO_PASS;
// subjects of the current class still to finish (or all 3 for revision)
function openSubjects() {
  const g = classGroup(state.section).subjects;
  const open = g.filter((id) => !isDone(id));
  return open.length ? open : g;
}
// timetable for a session: cycle through the class's unfinished subjects
function timetable() {
  const pool = openSubjects();
  return Array.from({ length: PERIODS_PER_SESSION }, (_, i) => pool[i % pool.length]);
}
// move finished washing to the clean pile; returns the uniform counts
function laundry() {
  const u = state.uniform;
  if (u.washing && Date.now() >= u.until) { u.clean += u.washing; u.washing = 0; u.until = 0; }
  return u;
}

// ---------------- items (mods/) ----------------
let CATALOG = { packs: [], items: new Map(), errors: [] };
const catalogReady = loadCatalog().then((c) => {
  CATALOG = c;
  if (c.errors.length) console.warn('[mods]', c.errors);
});
const item = (id) => CATALOG.items.get(id);
const itemsOf = (type, where) => [...CATALOG.items.values()].filter((i) => i.type === type && (!where || i.where === where));
const owned = (id) => (state.inv[id] ?? 0) > 0;
function shirtColor() {
  const t = state.today;
  if (!t?.dressed) return CASUAL_SHIRT;
  const c = new THREE.Color(classGroup(state.section).shirt);
  if (t.dirty) c.lerp(new THREE.Color(0x7a6a50), 0.45);
  return c.getHex();
}

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
  gate: () => (state.phase === 'school' ? `Chưa tan học (còn ${hhmm(state.sessionEnd - Date.now())}), bác bảo vệ không cho ra cổng.` : 'Đứng ở cổng và bấm “Về nhà” để ra về.'),
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
// (Re)build the player's mesh; keeps position so it can be used to change clothes.
function makePlayer() {
  let pos = null, rot = 0;
  if (player) { pos = player.position.clone(); rot = player.rotation.y; scene.remove(player); meLabel.el.remove(); }
  const acc = state.acc && item(state.acc);
  player = makeCharacter({ girl: state.look.girl, skin: state.look.skin, hair: state.look.hair, scarf: !!state.today?.scarf, shirt: shirtColor(),
    acc: acc ? { kind: acc.kind, color: acc.color } : null });
  if (pos) { player.position.copy(pos); player.rotation.y = rot; }
  scene.add(player);
  meLabel = makeLabel(state.name, 'me');
  refreshMyTag();
}
function respawnNpcs() {
  npcs.spawn(state.grade, state.section, CLASS_GROUPS.map((g) => g.shirt));
  W.setGrade(state.grade);
  npcs.showSchool(state.phase !== 'home');
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
const mySeat = () => W.seats[state.section][9];

// ---------------- day flow ----------------
// home (get ready, no time limit) → school (6 real hours: 6 periods with breaks, then free time)
// → after (tan trường: go home or loiter) → home of the next day.
let busy = false;
let sub = '';          // school sub-state: preBell | class | break | free | done
let classStart = 0;    // play-seconds when the current period started
let breakStart = 0;
let preBellUntil = 0;
let bullyAt = 0, bullyActive = false;
let guardUntil = 0;
let lastMomLine = 0, lastChatter = 0, breakWarned = false, washNotified = false;
let nextPatrol = 0;
let now = 0;           // seconds of unpaused play

function enterHome() {
  state.phase = 'home';
  sub = '';
  if (!state.homeAt) state.homeAt = Date.now();
  state.clock = 360 + Math.min(59, (Date.now() - state.homeAt) / 60000);
  washNotified = !laundry().washing;
  npcs.showSchool(false);
  makePlayer();
  placePlayer(W.spots.homeSpawn.x - 4.5, -1.1, 0);
  setTeacherLabel(null);
  setObjective();
  save();
}

function homeMissing() {
  const t = state.today, m = [];
  const u = laundry();
  if (!t.dressed) m.push(!u.clean && !u.dirty && u.washing ? 'đợi giặt đồ xong' : 'mặc đồng phục');
  if (!t.scarf) m.push('đeo khăn quàng đỏ');
  if (!t.bag) m.push('soạn cặp');
  if (!t.breakfast) m.push('ăn sáng');
  if (!t.lunchbox) m.push('mang đồ ăn');
  return m;
}

async function leaveHome() {
  const t = state.today;
  const miss = homeMissing();
  if (miss.length) {
    const go = await ask('Đi học ngay?', `<p>Bạn chưa: <b>${miss.join(', ')}</b>.</p>`, [{ label: 'Quay lại chuẩn bị', value: false, cls: 'ghost' }, { label: 'Vẫn đi luôn', value: true }]);
    if (!go) return;
  }
  state.sessionStart = Date.now();
  state.sessionEnd = state.sessionStart + SESSION_MS;
  t.subjects = timetable();
  t.period = t.done = 0;
  await fade(() => enterSchool(true));
}

function enterSchool(fresh) {
  const t = state.today;
  state.phase = 'school';
  npcs.showSchool(true);
  npcs.homeStaff();
  placePlayer(W.spots.gateInside.x, W.spots.gateInside.z, Math.PI);
  setScarf(t.scarf);
  setTeacherLabel(null);
  if (t.done >= t.subjects.length) {
    sub = 'free';
    npcs.scatterYard();
  } else {
    sub = 'preBell';
    preBellUntil = now + (fresh ? PRE_BELL_SECONDS : 20);
    npcs.scatterYard();
  }
  if (fresh) gateCheck();
  else sys(`Bạn quay lại trường. Tan trường sau ${hhmm(state.sessionEnd - Date.now())}.`);
  setObjective();
  save();
}

function gateCheck() {
  const t = state.today, notes = [];
  if (!t.dressed) { addStat('conduct', -5); notes.push('👕 Không mặc đồng phục — hạnh kiểm −5'); }
  else if (t.dirty && Math.random() < 0.5) { notes.push(caughtDirty()); }
  if (!t.scarf) { addStat('conduct', -3); notes.push('🧣 Quên khăn quàng đỏ — hạnh kiểm −3'); }
  if (!t.bag) { addStat('conduct', -2); notes.push('🎒 Quên sách vở — hạnh kiểm −2'); }
  if (!t.breakfast) { addStat('energy', -15); notes.push('🍚 Chưa ăn sáng — năng lượng −15'); }
  if (notes.length) {
    say(npcs.redStar.label, 'Bạn ơi, cho mình ghi tên nha!');
    ask('Sao đỏ ở cổng trường', `<p>${notes.join('<br>')}</p>`, [{ label: 'Dạ, em biết rồi', value: 1 }]);
  } else {
    say(npcs.redStar.label, 'Đủ đồ, gọn gàng. Giỏi quá!');
    addStat('conduct', 1);
    toast('✅ Đến trường gọn gàng, đủ đồ dùng! Hạnh kiểm +1');
  }
}

// dirty uniform is only punished when the red-star student or the supervisor notices it (once per session)
function caughtDirty() {
  state.today.caughtDirty = true;
  addStat('conduct', -DIRTY_PENALTY);
  return `👕 Đồng phục dơ, chưa giặt — hạnh kiểm −${DIRTY_PENALTY}`;
}
function patrolTick() {
  const t = state.today;
  if (!t.dressed || !t.dirty || t.caughtDirty || sitting || busy || now < nextPatrol) return;
  nextPatrol = now + 2;
  for (const n of [npcs.redStar, npcs.monitor]) {
    if (n.hidden || n.mesh.position.distanceTo(player.position) > 2.6) continue;
    nextPatrol = now + 15; // one roll per encounter
    if (Math.random() > 0.4) return;
    const msg = caughtDirty();
    say(n.label, 'Áo em dơ quá, đứng lại đã!');
    busy = true;
    ask(`🚨 ${n.name} (${n.tag}) bắt gặp`, `<p>“Đồng phục phải giặt sạch sẽ mới đi học chứ em!”</p><p class="meta">${msg}</p>`, [{ label: 'Dạ, em sẽ giặt ạ', value: 1 }])
      .finally(() => { busy = false; });
    return;
  }
}

function startClass(period, ring_ = true) {
  const t = state.today;
  t.period = period;
  sub = 'class';
  classStart = now;
  if (ring_) sfx('bell');
  const s = subj(t.subjects[period]);
  setTeacherLabel(s);
  sys(`Tiết ${period + 1}/${t.subjects.length}: ${s.icon} ${s.name}. Vào Lớp ${cls()} ngồi vào chỗ có vòng sáng.`);
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
  if (now - classStart > CLASS_LATE_SECONDS) {
    t.lateToClass++;
    state.lateCount++;
    addStat('conduct', -2);
    await ask('Vào lớp muộn', `<p>${esc(npcs.classTeacher.label.nm.textContent)}: “Em vào lớp muộn rồi đấy. Lần sau chú ý nhé!”</p><p class="meta">Hạnh kiểm −2</p>`, [{ label: 'Dạ, em xin lỗi cô', value: 1 }]);
  }
  while (sub === 'class') {
    await doPeriod(t.period);
    t.done = t.period + 1;
    save();
    if (Date.now() >= state.sessionEnd) { endSchool(); break; }
    if (t.done >= t.subjects.length) { endPeriods(); break; }
    if (BREAK_AFTER.has(t.period)) { startBreak(); break; }
    startClass(t.period + 1);
    classStart = now; // already seated: no lateness
  }
  busy = false;
}

async function doPeriod(i) {
  const t = state.today, s = subj(t.subjects[i]);
  say(npcs.classTeacher.label, `Cả lớp mở sách môn ${s.name} nhé!`);
  const done = isDone(s.id);
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
  const got = eco.earn(state, c * eco.EARN.correct, 'trả lời đúng');
  addStat('energy', -7);
  toast(`${s.icon} ${s.name}: đúng ${c}/3${got ? ` · 🥥 +${got}` : ''}`);
  save();
}

function award(id, pts) {
  const before = state.progress[id];
  state.progress[id] = Math.min(POINTS_TO_PASS, before + pts);
  state.today.gained += state.progress[id] - before;
  if (before < POINTS_TO_PASS && state.progress[id] >= POINTS_TO_PASS) {
    sfx('up');
    sys(`🎉 Hoàn thành môn ${subj(id).name} lớp ${state.grade}!`);
    eco.earn(state, eco.EARN.subjectDone, `xong môn ${id}`);
    toast(`🎉 Hoàn thành môn ${subj(id).name}!`, 3000);
    if (classGroup(state.section).subjects.every(isDone)) {
      sys(state.section < 4
        ? `🎒 Xong cả 3 môn của Lớp ${cls()}! Về nhà xong sẽ chuyển sang Lớp ${state.grade}A${state.section + 1}.`
        : `🎓 Xong Lớp ${cls()} — lớp cuối của khối ${state.grade}! Về nhà sẽ xét lên lớp.`);
    }
  }
}

function standUp() {
  if (!sitting) return;
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
  t.readBreak = t.playedBreak = false;
  sfx('bell');
  npcs.toYard();
  setTeacherLabel(null);
  sys('Ra chơi! Ra sân, căng tin, thư viện… Nghe chuông thì vào lớp.');
  if (t.lunchbox) { t.lunchbox = false; addStat('energy', 20); toast('🍱 Bạn mở hộp đồ ăn mẹ chuẩn bị: năng lượng +20'); }
  else if (state.stats.energy < 40) toast('😣 Bụng đói cồn cào… ra căng tin mua gì ăn đi!');
  if (!has('bi-bat-nat') && !t.bullyDone && state.day >= 2 && Math.random() < 0.35) bullyAt = now + 12 + Math.random() * 25;
  else bullyAt = 0;
  setObjective();
}

function endBreak() {
  npcs.toClass();
  bullyAt = 0;
  startClass(state.today.done);
}

// all periods of this session done: free time at school until the 6 hours are over
function endPeriods() {
  standUp();
  sub = 'free';
  sfx('bell');
  npcs.toYard();
  setTeacherLabel(null);
  sys(`Hết tiết học buổi này! Tự do ở trường, ${hhmm(state.sessionEnd - Date.now())} nữa tan trường. Bạn có thể thoát game, lát quay lại.`);
  setObjective();
  save();
}

function endSchool() {
  standUp();
  sub = 'done';
  state.phase = 'after';
  state.today.afterAt = Date.now();
  sfx('bell');
  npcs.leaveSchool();
  setTeacherLabel(null);
  sys('🔔 Tan trường! Ra cổng để về nhà, hoặc ở lại chơi với bạn (lêu lổng).');
  setObjective();
  save();
}

function skipPeriod() {
  const t = state.today, s = subj(t.subjects[t.period]);
  t.skipped++;
  t.done = t.period + 1;
  addStat('conduct', -6);
  ask('Trốn tiết!', `<p>Bạn không vào lớp tiết ${s.name}. Cô ghi vào sổ đầu bài.</p><p class="meta">Hạnh kiểm −6 · Không được điểm môn này</p>`, [{ label: 'Ừ thì…', value: 1 }]);
  if (t.done >= t.subjects.length) endPeriods();
  else if (BREAK_AFTER.has(t.period)) startBreak();
  else startClass(t.done);
}

// new class colour: mum swaps every set (bought spares included) for clean ones of the new colour
function newClassUniforms() {
  const u = laundry();
  state.uniform = { clean: Math.max(1, u.clean + u.dirty + u.washing), dirty: 0, washing: 0, until: 0 };
}

// Close the school session (when walking home, or on load after being away past the 6 hours).
// Returns the summary to show once the player is home.
function finishSession() {
  const t = state.today;
  addStat('energy', 40);
  addStat('mood', 4);
  const clean = !t.skipped && !t.loiter && !t.lateToClass && t.dressed && t.scarf && !t.caughtDirty && !t.caughtPrank;
  if (clean) { addStat('conduct', 3); eco.earn(state, eco.EARN.cleanDay, 'buổi ngoan'); }
  if (t.dressed) laundry().dirty++; // the set worn all day goes to the dirty pile
  const changes = evaluateTags();
  const lines = [
    `Điểm môn học: +${t.gained}`,
    `🥥 Coco kiếm được: +${t.earned}${t.earned >= eco.EARN_CAP_PER_DAY ? ' (đã đạt tối đa mỗi ngày)' : ''} · đang có ${state.coco}`,
    `Hạnh kiểm: ${conductName(state.stats.conduct)} (${state.stats.conduct})`,
    `Tỉ lệ trả lời đúng: ${Math.round(accuracy() * 100)}%`,
  ];
  if (clean) lines.push('Một buổi ngoan: hạnh kiểm +3');
  if (t.skipped) lines.push(`Trốn ${t.skipped} tiết`);
  if (t.dressed) lines.push('👕 Đồng phục mặc cả buổi đã dơ — nhớ giặt (15 phút)');
  const g = classGroup(state.section);
  if (state.section < 4 && g.subjects.every(isDone)) {
    state.section++;
    newClassUniforms();
    const ng = classGroup(state.section);
    changes.push(`🎒 Chuyển sang Lớp ${cls()}: ${ng.subjects.map((id) => subj(id).name).join(', ')}. Mẹ đã đổi ${state.uniform.clean} bộ đồng phục sang màu ${ng.colorName} (sạch).`);
  }
  const title = `🏠 Hết ngày ${state.day}`;
  state.day++;
  state.today = newToday();
  state.homeAt = Date.now();
  state.sessionStart = state.sessionEnd = 0;
  return { title, html: `<p>${lines.join('<br>')}</p>${changes.length ? `<p><b>${changes.join('<br>')}</b></p>` : ''}` };
}

async function goHome(reason) {
  const sec = state.section, loitered = state.today.loiter; // read before finishSession() resets the day
  const sum = finishSession();
  await fade(() => enterHome());
  if (reason) toast(reason, 3200);
  say(npcs.mom.label, loitered ? 'Sao hôm nay về muộn thế con?' : 'Con về rồi à! Thay đồ đi giặt nhé.');
  await showSessionEnd(sum, sec);
}

async function showSessionEnd(sum, secBefore) {
  busy = true;
  try {
    await ask(sum.title, sum.html, [{ label: 'Về nhà nghỉ ngơi', value: 1 }]);
    const promoted = await checkPromotion();
    if (promoted || state.section !== secBefore) respawnNpcs();
    sys(`Ngày ${state.day} — chuẩn bị đi học: ăn sáng, giặt đồ nếu dơ, mặc đồng phục Lớp ${cls()}, khăn quàng, soạn cặp.`);
  } finally { busy = false; }
  setObjective();
  save();
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
      state.prankCount = 0;
    }
  } else if (s.conduct < 60 || state.lateCount >= 3 || state.loiterCount >= 4 || state.prankCount >= PRANKS_FOR_CA_BIET) {
    add('ca-biet', '😎 Bạn bị xếp vào nhóm Học sinh cá biệt. Góc sau căng tin đã mở… nhưng thầy cô để ý bạn hơn.');
  }
  if (!has('ca-biet') && state.day >= 3 && s.conduct >= 85 && acc >= 0.6) add('lop-truong', '🎗️ Cô chủ nhiệm chọn bạn làm Lớp trưởng! Phòng Đội đã mở.');
  else if (has('lop-truong') && (s.conduct < 70 || has('ca-biet'))) remove('lop-truong', 'Bạn không còn làm lớp trưởng nữa.');
  refreshMyTag();
  return out;
}

// returns true when the grade changed
async function checkPromotion() {
  const allDone = SUBJECTS.every((s) => isDone(s.id));
  if (!allDone || state.graduated) return false;
  if (state.stats.conduct < 50) {
    await ask('Chưa được lên lớp', '<p>Bạn đã học xong 12 môn, nhưng hạnh kiểm đang <b>Yếu</b>. Cần hạnh kiểm Trung bình (50) trở lên để lên lớp.</p>', [{ label: 'Con sẽ cố gắng', value: 1 }]);
    return false;
  }
  sfx('up');
  if (state.grade >= 9) {
    state.graduated = true;
    await ask('🎓 Tốt nghiệp THCS!', `<p>Chúc mừng <b>${esc(state.name)}</b> đã hoàn thành chương trình lớp 6 → 9 tại ${esc(state.school)}!</p><p>Bạn có thể tiếp tục đi học để ôn tập, hoặc chơi lại từ đầu.</p>`, [{ label: 'Tuyệt vời!', value: 1 }]);
    return false;
  }
  state.grade++;
  state.section = 1;
  newClassUniforms();
  state.progress = Object.fromEntries(SUBJECTS.map((s) => [s.id, 0]));
  addStat('conduct', 5);
  await ask(`🎉 Lên lớp ${state.grade}!`, `<p>Bạn đã hoàn thành đủ 12 môn. Từ buổi sau bạn học <b>Lớp ${cls()}</b> (đồng phục màu ${classGroup(1).colorName}).</p><p class="meta">Câu hỏi sẽ khó hơn theo chương trình lớp ${state.grade}.</p>`, [{ label: 'Lên lớp thôi!', value: 1 }]);
  return true;
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
    eco.lose(state, 10, 'bị bắt nạt lấy tiền');
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
function homeOnly(label, run) { return state.phase === 'home' ? { label, run } : null; }

function actionFor(id) {
  const p = state.phase, t = state.today;
  const atSchool = p === 'school' || p === 'after';
  const freeTime = (p === 'school' && (sub === 'break' || sub === 'preBell' || sub === 'free')) || p === 'after';
  switch (id) {
    case 'home-table': return homeOnly('🍚 Bàn ăn', homeTable);
    case 'home-wardrobe': {
      const u = laundry();
      return homeOnly(`👕 Tủ quần áo${u.washing ? ` · 🧺 ${mmss(u.until - Date.now())}` : ''}`, wardrobe);
    }
    case 'home-bag': return homeOnly('🎒 Cặp sách', bagMenu);
    case 'mailbox':
      return atSchool ? { label: '📮 Hộp thư góp ý', run: mailbox } : null;
    case 'prank':
      return prankTarget ? { label: prankLabel(prankTarget), run: () => prank(prankTarget) } : null;
    case 'home-desk': return homeOnly('📅 Bàn học', desk);
    case 'home-bed':
      return p === 'home' && !t.napped ? { label: '😴 Ngủ thêm một chút', run: async () => { t.napped = true; addStat('energy', 15); toast('😴 Ngủ thêm một lát… năng lượng +15'); } } : null;
    case 'home-sofa':
      return p === 'home' && !t.tv ? { label: '📺 Xem tivi', run: async () => { t.tv = true; addStat('mood', 6); toast('📺 Hoạt hình buổi sáng… tâm trạng +6'); } } : null;
    case 'home-door':
      return homeOnly('🚪 Đi học', () => leaveHome());
    case 'gate':
      return p === 'after' ? { label: '🏠 Về nhà', run: () => goHome(t.loiter ? null : '🏠 Về thẳng nhà — ngoan quá!') } : null;
    case 'seat':
      return p === 'school' && sub === 'class' && !sitting ? { label: '🪑 Ngồi vào chỗ', run: sitDown } : null;
    case 'library-read':
      if (p === 'school' && sub === 'break' && !t.readBreak) return { label: '📚 Đọc sách (ôn 2 câu)', run: () => { t.readBreak = true; return practice(2, 'Thư viện'); } };
      if (p === 'school' && sub === 'free' && !t.libFree) return { label: '📚 Ôn bài ở thư viện (3 câu)', run: () => { t.libFree = true; return practice(3, 'Thư viện'); } };
      return null;
    case 'canteen':
      return freeTime ? { label: '🥖 Căng tin', run: canteen } : null;
    case 'shuttlecock':
      if (p === 'school' && (sub === 'break' || sub === 'free') && !t.playedBreak) return { label: '🏸 Đá cầu', run: async () => { t.playedBreak = true; addStat('mood', 8); addStat('energy', -5); toast('🏸 Vui quá! Tâm trạng +8'); } };
      if (p === 'after') return { label: '🏸 Ở lại đá cầu (lêu lổng)', run: () => loiter('🏸 Đá cầu với bạn', 12, -8, 0) };
      return null;
    case 'hangout':
      if (p === 'after') return { label: '😎 Tụ tập chơi game, ăn vặt', run: () => loiter('😎 Tụ tập với hội bạn cá biệt', 15, -5, -5) };
      if (p === 'school' && (sub === 'break' || sub === 'free')) return { label: '😎 Tụ tập ở góc sau', run: async () => { addStat('mood', 8); addStat('conduct', -1); toast('😎 Tâm trạng +8, hạnh kiểm −1'); } };
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

const cocoTxt = (n) => (n ? `${n} 🥥` : 'miễn phí');
const effTxt = (f) => [f.energy ? `⚡${f.energy > 0 ? '+' : ''}${f.energy}` : '', f.mood ? `😊${f.mood > 0 ? '+' : ''}${f.mood}` : ''].filter(Boolean).join(' ');

async function homeTable() {
  const t = state.today;
  const foods = itemsOf('food', 'home').sort((a, b) => a.price - b.price);
  const v = await ask('🍚 Bàn ăn', `<p>${t.breakfast ? 'Bạn đã ăn sáng rồi.' : 'Ăn sáng gì đây? Cơm trắng mẹ nấu thì miễn phí.'}</p><p class="meta">Bạn có ${state.coco} 🥥</p>`, [
    ...foods.map((f) => ({ label: `${f.icon} ${f.name} — ${cocoTxt(f.price)} (${effTxt(f)})`, value: f.id, disabled: t.breakfast || state.coco < f.price })),
    { label: `🍱 Cất hộp đồ ăn vào cặp${t.lunchbox ? ' — đã lấy' : ''}`, value: 'box', disabled: t.lunchbox },
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'box') { t.lunchbox = true; toast('🍱 Đã mang đồ ăn'); return; }
  const f = v && item(v);
  if (!f || !eco.spend(state, f.price, `ăn ${f.id}`)) return;
  t.breakfast = true;
  addStat('energy', f.energy);
  addStat('mood', f.mood);
  toast(`${f.icon} Ngon quá! ${effTxt(f)}`);
  save();
}

async function wardrobe() {
  const t = state.today, g = classGroup(state.section);
  const u = laundry();
  const sets = `Bạn có <b>${u.clean}</b> bộ sạch · <b>${u.dirty}</b> bộ dơ${u.washing ? ` · <b>${u.washing}</b> bộ đang giặt (còn ${mmss(u.until - Date.now())})` : ''}.`;
  const opts = [];
  if (t.dressed) opts.push({ label: t.dirty ? '🧺 Cởi bộ dơ ra' : '👕 Cởi đồng phục', value: 'undress' });
  else {
    if (u.clean) opts.push({ label: `👕 Mặc đồng phục sạch Lớp ${cls()}`, value: 'dress' });
    if (u.dirty) opts.push({ label: '👕 Mặc luôn bộ dơ', value: 'dressDirty' });
  }
  if (u.dirty && !u.washing) opts.push({ label: `🧺 Giặt ${u.dirty} bộ dơ (15 phút thật)`, value: 'wash' });
  opts.push({ label: `🧣 Đeo khăn quàng đỏ${t.scarf ? ' — đã đeo' : ''}`, value: 'scarf', disabled: t.scarf });
  const accs = itemsOf('accessory').filter((a) => owned(a.id));
  if (accs.length) opts.push({ label: '🎀 Phụ kiện…', value: 'acc' });
  opts.push({ label: 'Thôi', value: null, cls: 'ghost' });
  const v = await ask('👕 Tủ quần áo', `<p>Đồng phục Lớp ${cls()} màu <b>${g.colorName}</b>. ${sets}</p>
    <p class="meta">Mặc bộ dơ đi học: nếu sao đỏ hoặc giám thị bắt gặp sẽ bị trừ hạnh kiểm. Mua thêm bộ dự phòng ở 🛒 Cửa hàng (bàn học).</p>`, opts);
  if (v === 'dress') { u.clean--; t.dressed = true; t.dirty = false; toast('👕 Đồng phục gọn gàng!'); }
  if (v === 'dressDirty') { u.dirty--; t.dressed = true; t.dirty = true; toast('👕 Mặc tạm áo dơ… cẩn thận sao đỏ!'); }
  if (v === 'undress') { if (t.dirty) u.dirty++; else u.clean++; t.dressed = t.dirty = false; }
  if (v === 'wash') {
    u.washing = u.dirty;
    u.dirty = 0;
    u.until = Date.now() + WASH_MS;
    washNotified = false;
    toast(`🧺 Đã bỏ ${u.washing} bộ vào máy giặt — 15 phút nữa xong`, 3000);
  }
  if (v === 'scarf') { t.scarf = true; setScarf(true); toast('🧣 Đã đeo khăn quàng đỏ'); }
  if (v === 'acc') {
    const a = await ask('🎀 Phụ kiện', '<p>Chọn phụ kiện để đeo (chỉ để đẹp, không ảnh hưởng điểm).</p>', [
      ...accs.map((x) => ({ label: `${x.icon} ${x.name}${state.acc === x.id ? ' — đang đeo' : ''}`, value: x.id, disabled: state.acc === x.id })),
      ...(state.acc ? [{ label: '✖ Tháo phụ kiện', value: 'none' }] : []),
      { label: 'Thôi', value: null, cls: 'ghost' },
    ]);
    if (a) state.acc = a === 'none' ? null : a;
  }
  if (v && v !== 'scarf' && v !== 'wash') makePlayer();
  save();
}

async function desk() {
  const t = state.today;
  const v = await ask('📅 Bàn học', `<p>Bạn đang học <b>Lớp ${cls()}</b>.</p>`, [
    { label: '📅 Xem thời khoá biểu', value: 'tt' },
    { label: `📝 Học bài (ôn 2 câu)${t.studied ? ' — đã học' : ''}`, value: 'hw', disabled: t.studied },
    { label: `🛒 Cửa hàng online (${state.coco} 🥥)`, value: 'shop' },
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'tt') await showTimetable();
  if (v === 'hw') await homework();
  if (v === 'shop') await shop();
}

// Online shop at home: uniforms, accessories, toys (food is bought where you eat it).
async function shop() {
  const cats = { uniform: '👕 Đồng phục', accessory: '🎀 Phụ kiện', toy: '🧸 Đồ chơi' };
  for (;;) {
    const c = await ask('🛒 Cửa hàng online', `<p>Bạn có <b>${state.coco} 🥥</b>. Coco kiếm được khi trả lời đúng (+${eco.EARN.correct}/câu), học xong môn (+${eco.EARN.subjectDone}), một buổi ngoan (+${eco.EARN.cleanDay}) — tối đa ${eco.EARN_CAP_PER_DAY} 🥥 mỗi ngày.</p>`, [
      ...Object.entries(cats).map(([value, label]) => ({ label, value })),
      { label: 'Đóng', value: null, cls: 'ghost' },
    ]);
    if (!c) return;
    const list = itemsOf(c).sort((a, b) => a.price - b.price);
    const have = (i) => (i.type === 'accessory' ? owned(i.id) : false);
    const desc = (i) => (i.type === 'toy' ? ` · ${i.uses} lần dùng` : i.type === 'uniform' ? ` · +${i.count} bộ` : '');
    const id = await ask(cats[c], `<p>Bạn có <b>${state.coco} 🥥</b>.</p>${list.filter((i) => i.desc).map((i) => `<p class="meta">${esc(i.icon)} <b>${esc(i.name)}</b>: ${esc(i.desc)}</p>`).join('')}
      ${c === 'toy' ? '<p class="meta">Đồ chơi chỉ để đùa vui với bạn lúc ra chơi. Bị thầy cô bắt gặp sẽ bị tịch thu và trừ hạnh kiểm; chọc mãi một bạn là bắt nạt đó!</p>' : ''}`, [
      ...list.map((i) => ({ label: `${i.icon} ${i.name} — ${cocoTxt(i.price)}${desc(i)}${have(i) ? ' — đã có' : ''}${i.type === 'toy' && owned(i.id) ? ` (còn ${state.inv[i.id]})` : ''}`, value: i.id, disabled: have(i) || state.coco < i.price })),
      { label: '‹ Quay lại', value: null, cls: 'ghost' },
    ]);
    if (!id) continue;
    const it = item(id);
    if (eco.buy(state, it)) {
      sfx('ok');
      toast(`🛒 Đã mua ${it.icon} ${it.name}! Còn ${state.coco} 🥥`, 2600);
      save();
    }
  }
}

async function bagMenu() {
  const t = state.today;
  const toys = itemsOf('toy').filter((i) => owned(i.id));
  const v = await ask('🎒 Cặp sách', `<p>${t.bag ? '✅ Đã soạn sách vở.' : 'Chưa soạn sách vở.'}</p>${toys.length ? `<p class="meta">Đồ chơi mang theo (tối đa ${MAX_PACKED_TOYS} loại): ${esc(t.packed.map((id) => item(id)?.icon).join(' ')) || 'chưa có'}</p>` : ''}`, [
    { label: `📚 Soạn sách vở${t.bag ? ' — xong' : ''}`, value: 'books', disabled: t.bag },
    ...toys.map((i) => {
      const on = t.packed.includes(i.id);
      return { label: `${on ? '✖ Bỏ ra' : '➕ Mang'} ${i.icon} ${i.name} (còn ${state.inv[i.id]} lần)`, value: i.id, disabled: !on && t.packed.length >= MAX_PACKED_TOYS };
    }),
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'books') { t.bag = true; toast('🎒 Đã soạn cặp'); }
  else if (v) {
    t.packed = t.packed.includes(v) ? t.packed.filter((x) => x !== v) : [...t.packed, v];
    toast(t.packed.includes(v) ? `${item(v).icon} Đã bỏ vào cặp` : 'Đã lấy ra');
  }
}

// ---------------- pranks (toys from mods/) ----------------
// Light-hearted only: classmates (never teachers, staff or the older bullies), only in free time and outside
// quiet rooms. Staff nearby may confiscate the toy; pranking the same classmate again is called out as bullying.
let prankTarget = null;
function findPrankTarget() {
  const p = state.phase, t = state.today;
  if (sitting || busy || !(p === 'after' || (p === 'school' && ['preBell', 'break', 'free'].includes(sub)))) return null;
  if (zoneAt(player.position)?.quiet) return null;
  if (!t.packed.some(owned)) return null;
  return npcs.nearest(player.position, PRANK_RANGE, (n) => n.role === 'student' && !n.bully);
}
function prankLabel(n) {
  const toys = state.today.packed.filter(owned).map(item).filter(Boolean);
  return toys.length === 1 ? `${toys[0].icon} ${toys[0].verb} ${n.name}` : `😜 Chọc ${n.name}…`;
}
async function prank(n) {
  const t = state.today;
  const toys = t.packed.filter(owned).map(item).filter(Boolean);
  let toy = toys[0];
  if (toys.length > 1) {
    const id = await ask(`😜 Chọc ${n.name}`, '<p>Dùng gì đây?</p>', [
      ...toys.map((i) => ({ label: `${i.icon} ${i.verb} (còn ${state.inv[i.id]} lần)`, value: i.id })),
      { label: 'Thôi', value: null, cls: 'ghost' },
    ]);
    if (!id) return;
    toy = item(id);
  }
  if (!toy || !owned(toy.id)) return;
  state.inv[toy.id]--;
  const np = n.mesh.position;
  player.rotation.y = Math.atan2(np.x - player.position.x, np.z - player.position.z);
  spawnFx(toy.fx, player.position, np);
  sfx('pop');
  setTimeout(() => say(n.label, pick(toy.lines)), 380);
  addStat('mood', toy.fun);
  t.pranks++;
  state.prankCount++;
  t.victims[n.name] = (t.victims[n.name] ?? 0) + 1;
  setTimeout(() => { n.path = [pick(W.spots.yardPoints)]; n.speed = 4.2; n.wander = true; n.onArrive = null; }, 600);
  const watcher = npcs.list.find((w) => !w.hidden && w.mesh.visible && (w.teacher || w.tag === 'Sao đỏ') && w.role !== 'mom' &&
    w.mesh.position.distanceTo(player.position) < PRANK_WATCH);
  await new Promise((r) => setTimeout(r, 700));
  if (watcher && Math.random() < toy.catch) {
    t.caughtPrank = true;
    addStat('conduct', -3);
    state.inv[toy.id] = 0;
    say(watcher.label, 'Em kia! Đưa đây!');
    await ask(`🚨 ${watcher.name} bắt gặp`, `<p>“Đùa kiểu này làm bạn khó chịu đấy. ${esc(toy.name)} bị tịch thu!”</p><p class="meta">Hạnh kiểm −3 · Mất ${esc(toy.icon)} ${esc(toy.name)}</p>`, [{ label: 'Dạ, em xin lỗi', value: 1 }]);
  } else if (t.victims[n.name] >= 2) {
    addStat('conduct', -2);
    await ask('😢 Bạn ấy buồn rồi', `<p><b>${esc(n.name)}</b> bị bạn chọc ${t.victims[n.name]} lần, đã đi mách cô chủ nhiệm.</p>
      <p>Đùa một lần là vui, nhưng <b>chọc mãi một người là bắt nạt</b>. Rủ bạn ấy chơi cùng thay vì chọc nhé!</p><p class="meta">Hạnh kiểm −2</p>`, [{ label: 'Mình hiểu rồi', value: 1 }]);
  } else if (t.pranks === 3) toast('😅 Hôm nay chọc bạn nhiều rồi đó — coi chừng bị xếp vào nhóm cá biệt!', 3000);
  if (!owned(toy.id)) {
    t.packed = t.packed.filter((x) => x !== toy.id);
    if (!t.caughtPrank) toast(`${toy.icon} ${toy.name} đã dùng hết`);
  }
  save();
}

// small particle effects for pranks
const fxList = [];
const fxGeo = new THREE.SphereGeometry(0.07, 6, 4);
function spawnFx(fx, from, to) {
  const n = fx.kind === 'blob' ? 1 : fx.kind === 'confetti' ? 18 : 10;
  for (let i = 0; i < n; i++) {
    const color = fx.kind === 'confetti' ? new THREE.Color().setHSL(Math.random(), 0.85, 0.6) : new THREE.Color(fx.color);
    const m = new THREE.Mesh(fxGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
    if (fx.kind === 'blob') m.scale.setScalar(2.2);
    const end = new THREE.Vector3(to.x + (Math.random() - 0.5) * 0.5, 1.1 + Math.random() * 0.5, to.z + (Math.random() - 0.5) * 0.5);
    const start = fx.kind === 'confetti' ? end.clone() : new THREE.Vector3(from.x, 1.0, from.z);
    const vel = fx.kind === 'confetti' ? new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3) : null;
    m.position.copy(start);
    scene.add(m);
    fxList.push({ m, start, end, vel, t: -i * 0.03, dur: fx.kind === 'confetti' ? 1.1 : 0.45 });
  }
}
function fxTick(dt) {
  for (let i = fxList.length - 1; i >= 0; i--) {
    const f = fxList[i];
    f.t += dt;
    if (f.t < 0) continue;
    const k = f.t / f.dur;
    if (f.vel) { f.m.position.addScaledVector(f.vel, dt); f.vel.y -= 5 * dt; }
    else { f.m.position.lerpVectors(f.start, f.end, Math.min(1, k)); f.m.position.y += Math.sin(Math.min(1, k) * Math.PI) * 0.4; }
    f.m.material.opacity = k > 1 ? Math.max(0, 1 - (k - 1) * 3) : 1;
    if (k >= 1.35) { scene.remove(f.m); f.m.material.dispose(); fxList.splice(i, 1); }
  }
}

async function mailbox() {
  const p = player.position, z = zoneAt(p);
  await openFeedback({
    name: state.name, school: state.school, grade: state.grade, section: state.section, phase: state.phase,
    zone: z ? z.name : 'Đường đi', x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10, lastQ: ui.lastQ,
  }, cleanText);
}

async function showTimetable() {
  const list = timetable().map((id, i) => `Tiết ${i + 1}: ${subj(id).icon} ${subj(id).name}${BREAK_AFTER.has(i) ? '<br><i>— ra chơi —</i>' : ''}`).join('<br>');
  const g = classGroup(state.section);
  await ask(`📅 Thời khoá biểu Lớp ${cls()}`, `<p>${list}</p>
    <p class="meta">Lớp ${cls()} học: ${g.subjects.map((id) => `${subj(id).name} (${Math.min(state.progress[id], POINTS_TO_PASS)}/${POINTS_TO_PASS})`).join(', ')}.
    Xong cả 3 môn thì chuyển lớp. Mỗi buổi ở trường kéo dài 6 tiếng (giờ thật), học xong các tiết thì được tự do.</p>`, [{ label: 'Đã nhớ', value: 1 }]);
}

async function homework() {
  const list = openSubjects().map(subj);
  const id = await ask('📝 Học bài môn nào?', '<p>Ôn 2 câu, mỗi câu đúng được 1 điểm môn.</p>', [
    ...list.map((s) => ({ label: `${s.icon} ${s.name} (${Math.min(state.progress[s.id], POINTS_TO_PASS)}/${POINTS_TO_PASS})`, value: s.id })),
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (!id) return;
  state.today.studied = true;
  await quizFor(id, 2, 'Học bài ở nhà');
  addStat('energy', -5);
}

async function practice(n, where) {
  await quizFor(pick(openSubjects()), n, where);
}

async function quizFor(id, n, where, mult = 1) {
  const s = subj(id), avoid = new Set(), qs = [];
  for (let k = 0; k < n; k++) { const q = makeQuestion(id, state.grade, avoid); avoid.add(q.q); qs.push(q); }
  const c = await runQuiz(`${s.icon} ${s.name}`, where, qs);
  state.answered += n;
  state.correct += c;
  award(id, c * mult);
  const got = eco.earn(state, c * eco.EARN.correct, 'ôn bài');
  toast(`${s.icon} ${s.name}: đúng ${c}/${n}${mult > 1 ? ` (×${mult} điểm)` : ''}${got ? ` · 🥥 +${got}` : ''}`);
  save();
}

async function canteen() {
  const p = state.phase;
  const foods = itemsOf('food', 'canteen').sort((a, b) => a.price - b.price);
  const v = await ask('🥖 Căng tin', `<p>Bạn có ${state.coco} 🥥.</p>`, [
    ...foods.map((f) => ({ label: `${f.icon} ${f.name} — ${cocoTxt(f.price)} (${effTxt(f)})`, value: f.id, disabled: state.coco < f.price })),
    ...(p === 'after' ? [{ label: '🍧 Ngồi ăn vặt với bạn — 10 🥥 (lêu lổng)', value: 'snack', disabled: state.coco < 10 }] : []),
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'snack') { if (eco.spend(state, 10, 'ăn vặt')) await loiter('🍧 Ăn vặt với bạn', 12, 5, 0); return; }
  const f = v && item(v);
  if (!f || !eco.spend(state, f.price, `căng tin ${f.id}`)) return;
  addStat('energy', f.energy);
  addStat('mood', f.mood);
  toast(`${f.icon} ${f.name}: ${effTxt(f)}`);
}

async function loiter(text, mood, energy, cost) {
  const t = state.today;
  t.loiter++;
  state.loiterCount++;
  addStat('mood', mood);
  addStat('energy', energy);
  if (cost < 0) eco.lose(state, -cost, 'lêu lổng');
  addStat('conduct', -2);
  toast(`${text}: tâm trạng +${mood}, hạnh kiểm −2`, 3000);
  if (t.loiter >= 2) await goHome('📞 Mẹ gọi: “Sao giờ này chưa về hả con?”');
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
  const st = npcs.classmates().filter((n) => n.grade === state.section).length;
  await ask('🎗️ Họp cán sự lớp', `<p><b>Sổ đầu bài hôm nay — Lớp ${cls()}</b></p>
    <p>Sĩ số: ${st + 1} · Vào lớp muộn: ${t.lateToClass} lần · Tiết bị trốn: ${t.skipped}</p>
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
  if (state.phase === 'home') {
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
  if (p === 'home') {
    const miss = homeMissing();
    const u = laundry();
    const wash = u.washing ? `🧺 Giặt xong sau ${mmss(u.until - Date.now())} · ` : '';
    s = miss.length ? `${wash}Còn: ${miss.filter((m) => !wash || !m.startsWith('đợi')).join(' · ')}` : '✅ Đủ đồ rồi! Ra cửa đi học';
  } else if (p === 'school') {
    const n = t.subjects.length;
    if (sub === 'preBell') s = `Sắp vào tiết ${t.done + 1}/${n} (${Math.max(0, Math.ceil(preBellUntil - now))}s). Dạo sân, hoặc vào Lớp ${cls()} ngồi trước.`;
    else if (sub === 'class' && !sitting) {
      const left = Math.max(0, Math.ceil(CLASS_SKIP_SECONDS - (now - classStart)));
      s = `🔔 Tiết ${t.period + 1}/${n}: ${subj(t.subjects[t.period]).name} — vào Lớp ${cls()}, ngồi chỗ có vòng sáng (${left}s)`;
    } else if (sub === 'break') s = `Ra chơi — còn ${Math.max(0, Math.ceil(BREAK_SECONDS - (now - breakStart)))}s`;
    else if (sub === 'free') s = `Hết tiết! Tự do ở trường — tan trường sau ${hhmm(state.sessionEnd - Date.now())}. Có thể thoát game, lát quay lại.`;
  } else if (p === 'after') s = 'Tan học! Ra cổng để về nhà, hoặc ở lại chơi (lêu lổng).';
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
  $('classInfo').textContent = `Lớp ${cls()} · Ngày ${state.day}`;
  $('conduct').textContent = `${conductName(s.conduct)} (${s.conduct})`;
  $('energyBar').style.width = s.energy + '%';
  $('moodBar').style.width = s.mood + '%';
  $('money').textContent = state.coco;
  const z = zoneAt(player.position);
  $('zoneName').textContent = z ? z.name + (z.quiet ? ' 🤫' : '') : 'Đường đi';
  $('tagChips').innerHTML = state.tags.map((t) => `<span>${TAGS[t].icon} ${esc(TAGS[t].name)}</span>`).join('');
  const key = state.tags.join() + state.phase + state.today.ordered;
  if (key !== lastSpecialKey) { lastSpecialKey = key; renderSpecial(); }
  setObjective();
}

$('btnSubjects').onclick = () => {
  if (ui.modalOpen) return;
  const rows = CLASS_GROUPS.map((g) => {
    const here = g.sec === state.section;
    const head = `<b style="grid-column:1/-1;margin-top:6px">${here ? '👉 ' : ''}Lớp ${state.grade}A${g.sec} · áo ${g.colorName}${g.subjects.every(isDone) ? ' ✅' : ''}</b>`;
    return head + g.subjects.map(subj).map((s) => {
      const v = Math.min(state.progress[s.id], POINTS_TO_PASS);
      return `<span>${s.icon} ${s.name}</span><span>${v}/${POINTS_TO_PASS}${v >= POINTS_TO_PASS ? ' ✅' : ''}</span><i><em style="width:${(v / POINTS_TO_PASS) * 100}%"></em></i>`;
    }).join('');
  }).join('');
  const done = SUBJECTS.filter((s) => isDone(s.id)).length;
  ask(`📚 Khối ${state.grade} — ${done}/12 môn`, `<p class="meta">Học xong 3 môn của lớp thì chuyển lớp (A1 → A4). Xong A4 (đủ 12 môn, hạnh kiểm từ Trung bình) thì lên lớp.</p><div class="prog">${rows}</div>`, [{ label: 'Đóng', value: 1 }]);
};
$('btnTags').onclick = () => {
  if (ui.modalOpen) return;
  const rows = Object.entries(TAGS).map(([k, t]) => `<div class="tagRow ${has(k) ? 'on' : ''}">${t.icon} ${t.name}${has(k) ? ' — bạn đang có' : ''}<small>Cách có: ${t.how}</small><small>Quyền: ${t.perk}</small></div>`).join('');
  ask('🏷️ Danh hiệu (tag)', rows, [{ label: 'Đóng', value: 1 }]);
};
$('btnMail').onclick = () => { if (!ui.modalOpen && !busy && state) { busy = true; mailbox().finally(() => { busy = false; }); } };
$('btnSound').onclick = () => { ui.soundOn = !ui.soundOn; $('btnSound').textContent = ui.soundOn ? '🔊' : '🔇'; };
$('btnHelp').onclick = () => { if (!ui.modalOpen) showHelp(); };
function showHelp() {
  const controls = TOUCH
    ? '<b>Di chuyển:</b> kéo cần điều khiển (góc trái dưới), hoặc <b>chạm xuống đất</b> để đi tới đó. <b>Tương tác:</b> nút vàng (góc phải dưới). <b>Chat:</b> nút 💬. <b>Zoom:</b> chụm/mở hai ngón. Chạm tên trường để thu gọn bảng thông tin.'
    : '<b>Di chuyển:</b> W A S D / phím mũi tên. <b>Tương tác:</b> phím E / Space hoặc nút vàng. <b>Chat:</b> Enter. Lăn chuột để phóng to/thu nhỏ.';
  return ask('❓ Cách chơi', `<p>${controls}</p>
    <p><b>Game chạy theo giờ thật — mỗi buổi ở trường dài 6 tiếng:</b><br>
    🏠 <b>Ở nhà chuẩn bị</b> — ăn sáng, giặt đồ nếu dơ (<b>15 phút thật</b>, thoát game vẫn giặt), mặc đồng phục, khăn quàng, soạn cặp, mang đồ ăn. Không giới hạn giờ.<br>
    🏫 <b>Tại trường</b> — ${PERIODS_PER_SESSION} tiết học (trả lời câu hỏi để lấy điểm môn), có ra chơi. Học xong thì tự do — bạn có thể thoát game, lát quay lại.<br>
    🔔 <b>Tan trường</b> (sau 6 tiếng) — về thẳng nhà, hoặc ở lại chơi (lêu lổng: vui nhưng mất hạnh kiểm).</p>
    <p>👕 Mặc đồ dơ đi học: nếu sao đỏ hoặc giám thị bắt gặp sẽ bị trừ hạnh kiểm.</p>
    <p>🥥 <b>Coco</b>: kiếm khi trả lời đúng, học xong môn, một buổi ngoan (tối đa ${eco.EARN_CAP_PER_DAY}/ngày). Tiêu vào đồ ăn sáng, căng tin, 🛒 cửa hàng ở bàn học (đồng phục dự phòng, phụ kiện, đồ chơi).</p>
    <p>😜 <b>Đồ chơi</b>: bỏ vào cặp ở nhà, ra chơi lại gần bạn để đùa. Thầy cô bắt gặp là bị tịch thu; chọc mãi một bạn là bắt nạt!</p>
    <p>📮 <b>Góp ý</b>: thấy câu hỏi sai, chỗ bị kẹt, lỗi game → nút 📮 hoặc hộp thư cạnh cổng trường.</p>
    <p class="meta">Phiên bản ${GAME_VERSION}</p>
    <p><b>Lớp & lên lớp:</b> mỗi khối có 4 lớp, mỗi lớp 3 môn và một màu đồng phục (A1 Toán·KHTN·Tin → A2 Văn·Sử Địa·GDCD → A3 Anh·Công nghệ·Trải nghiệm → A4 Thể chất·Nghệ thuật·Địa phương). Mỗi môn cần ${POINTS_TO_PASS} điểm. Xong lớp A4 → lên khối trên, từ lớp 6 đến lớp 9.</p>
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
  fxTick(dt);

  // game clock + phase logic
  if (!paused) phaseTick(dt);

  const npcCount = npcs.update(dt);

  // hotspot prompt
  currentAction = null;
  if (!paused && !busy) {
    let best = null, bd = Infinity;
    const spots = W.hotspots.slice();
    if (state.phase === 'school' && sub === 'class' && !sitting) { const s = mySeat(); spots.push({ id: 'seat', x: s.x, z: s.z, r: 1.3 }); }
    prankTarget = findPrankTarget();
    if (prankTarget) spots.push({ id: 'prank', x: prankTarget.mesh.position.x, z: prankTarget.mesh.position.z, r: PRANK_RANGE + 0.1 });
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
  if (p === 'home') {
    state.clock = 360 + Math.min(59, (Date.now() - state.homeAt) / 60000);
    if (now - lastMomLine > 25) { lastMomLine = now; say(npcs.mom.label, pick(['Nhớ khăn quàng đỏ nhé!', 'Ăn sáng chưa con?', 'Áo dơ thì bỏ vào máy giặt nha con!', 'Soạn cặp chưa đó?'])); }
    if (!washNotified && !laundry().washing) {
      washNotified = true;
      sfx('up');
      toast('🧺 Đồng phục giặt xong rồi, khô thơm tho!', 3000);
    }
  } else if (p === 'school') {
    state.clock = 420 + (Date.now() - state.sessionStart) / 60000; // 7:00 + real minutes at school
    if (Date.now() >= state.sessionEnd && !busy && !sitting) { endSchool(); return; }
    patrolTick();
    if (sub === 'preBell') {
      if (now >= preBellUntil) { npcs.toClass(); startClass(t.done); }
      chatterTick(LINES.preBell);
    } else if (sub === 'class' && !sitting && !busy) {
      if (now - classStart > CLASS_SKIP_SECONDS) skipPeriod();
    } else if (sub === 'free') {
      chatterTick(LINES.break);
    } else if (sub === 'break') {
      const e = now - breakStart;
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
    state.clock = 780 + (Date.now() - t.afterAt) / 60000;
    chatterTick(LINES.after);
    if (Date.now() - t.afterAt > LOITER_MS && !busy) {
      busy = true;
      t.loiter++;
      state.loiterCount++;
      addStat('conduct', -2);
      goHome('📞 Mẹ gọi: “Sao giờ này chưa về hả con?” (hạnh kiểm −2)').finally(() => { busy = false; });
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
  await catalogReady;
  flushOutbox();
  respawnNpcs();
  makePlayer();
  if (fresh) await showHelp();
  sys(`Chào mừng ${state.name} đến ${state.school}!`);
  if (state.phase === 'home') {
    enterHome();
    sys(`Ngày ${state.day} — chuẩn bị đi học Lớp ${cls()}.`);
  } else if (Date.now() >= state.sessionEnd) {
    // the 6 hours ran out while the game was closed: the student walked home
    const sec = state.section;
    const sum = finishSession();
    enterHome();
    toast('🏠 Bạn đã tan trường và về nhà trong lúc vắng mặt.', 3500);
    await showSessionEnd(sum, sec);
  } else if (state.phase === 'after') {
    enterSchool(false);
    endSchool();
  } else enterSchool(false);
}

const saved = load();
if (saved) {
  $('continueBox').hidden = false;
  $('continueInfo').innerHTML = `<b>${esc(saved.name)}</b> · ${esc(saved.school)} · Lớp ${saved.grade}A${saved.section} · Ngày ${saved.day}`;
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
    endSession: () => { state.sessionEnd = Date.now() - 1; },        // pretend the 6 hours are over
    finishWash: () => { if (state.uniform.washing) state.uniform.until = Date.now() - 1; },
    get catalog() { return CATALOG; },
    get prankTarget() { return prankTarget; },
    giveCoco: (n) => { state.coco += n; },
    get today() { return state.today; },
    pos: () => ({ x: player.position.x, z: player.position.z }),
  };
}

requestAnimationFrame(tick);
