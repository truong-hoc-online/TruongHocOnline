// The day flow: home (get ready) → school (6 real hours: periods, breaks, free time) → after → home.
import { classGroup, makeQuestion, POINTS_TO_PASS, SUBJECTS } from './subjects.js';
import { ask, chatLine, esc, fade, runQuiz, say, setLabelTag, sfx, sys, toast } from './ui.js';
import * as eco from './economy.js';
import { accuracy, addStat, cls, conductName, G, has, hhmm, isDone, pick, subj } from './ctx.js';
import { newToday, save } from './save.js';
import { caughtDirty, laundry, newClassUniforms, patrolTick } from './laundry.js';
import { bullyEvent, evaluateTags } from './tags.js';
import { makePlayer, mySeat, placePlayer, respawnNpcs, setScarf } from './player.js';
import { setObjective } from './hud.js';
import { npcs, ring, W } from './stage.js';

// Real-time rhythm: a school session lasts 6 real hours, then the student goes home to get ready again.
// Periods inside a session run on play time (being offline never counts as skipping class).
const SESSION_MS = 6 * 3600e3;
const LOITER_MS = 3 * 60e3;         // after school: mum calls if you hang around this long
export const PERIODS_PER_SESSION = 6;      // each of the class's 3 subjects twice
const BREAK_AFTER = new Set([1, 3]); // break after the 2nd and 4th period
const PRE_BELL_SECONDS = 30;
export const BREAK_SECONDS = 75;
const CLASS_LATE_SECONDS = 25;
export const CLASS_SKIP_SECONDS = 60;

export const LINES = {
  preBell: ['Sắp vào lớp rồi!', 'Bài tập về nhà làm chưa?', 'Hôm nay kiểm tra miệng đó 😨', 'Cho mình chép bài tí 🙏', 'Sáng nay ăn gì đó?'],
  break: ['Ra chơi rồi!!', 'Đá cầu không?', 'Bài Toán khó quá 😵', 'Căng tin có bánh mì mới kìa', 'Ai cho mượn vở Văn với', 'Chiều nay đi học thêm không?', 'Cô Hạnh hôm nay vui ghê', 'Thư viện mới có truyện hay đó', 'Nhảy dây không mọi người?'],
  after: ['Về thôi!', 'Đi ăn chè không?', 'Mai kiểm tra 15 phút đó!', 'Đá cầu thêm ván nữa đi', 'Mẹ đón rồi, bye nha', 'Về nhớ giặt đồ nha'],
  reply: ['Ừ ha 😄', 'Thật hả?', 'Hihi', 'Đúng rồi đó!', 'Để mình nghĩ đã…', 'Chuẩn luôn 👍', 'Haha vui ghê'],
};

let lastMomLine = 0, lastChatter = 0, breakWarned = false;

// subjects of the current class still to finish (or all 3 for revision)
function openSubjects() {
  const g = classGroup(G.state.section).subjects;
  const open = g.filter((id) => !isDone(id));
  return open.length ? open : g;
}
// timetable for a session: cycle through the class's unfinished subjects
function timetable() {
  const pool = openSubjects();
  return Array.from({ length: PERIODS_PER_SESSION }, (_, i) => pool[i % pool.length]);
}

// ---------------- day flow ----------------
// home (get ready, no time limit) → school (6 real hours: 6 periods with breaks, then free time)
// → after (tan trường: go home or loiter) → home of the next day.

export function enterHome() {
  G.state.phase = 'home';
  G.sub = '';
  if (!G.state.homeAt) G.state.homeAt = Date.now();
  G.state.clock = 360 + Math.min(59, (Date.now() - G.state.homeAt) / 60000);
  G.washNotified = !laundry().washing;
  npcs.showSchool(false);
  makePlayer();
  placePlayer(W.spots.homeSpawn.x - 4.5, -1.1, 0);
  setTeacherLabel(null);
  setObjective();
  save();
}

export function homeMissing() {
  const t = G.state.today, m = [];
  const u = laundry();
  if (!t.dressed) m.push(!u.clean && !u.dirty && u.washing ? 'đợi giặt đồ xong' : 'mặc đồng phục');
  if (!t.scarf) m.push('đeo khăn quàng đỏ');
  if (!t.bag) m.push('soạn cặp');
  if (!t.breakfast) m.push('ăn sáng');
  if (!t.lunchbox) m.push('mang đồ ăn');
  return m;
}

export async function leaveHome() {
  const t = G.state.today;
  const miss = homeMissing();
  if (miss.length) {
    const go = await ask('Đi học ngay?', `<p>Bạn chưa: <b>${miss.join(', ')}</b>.</p>`, [{ label: 'Quay lại chuẩn bị', value: false, cls: 'ghost' }, { label: 'Vẫn đi luôn', value: true }]);
    if (!go) return;
  }
  G.state.sessionStart = Date.now();
  G.state.sessionEnd = G.state.sessionStart + SESSION_MS;
  t.subjects = timetable();
  t.period = t.done = 0;
  await fade(() => enterSchool(true));
}

export function enterSchool(fresh) {
  const t = G.state.today;
  G.state.phase = 'school';
  npcs.showSchool(true);
  npcs.homeStaff();
  placePlayer(W.spots.gateInside.x, W.spots.gateInside.z, Math.PI);
  setScarf(t.scarf);
  setTeacherLabel(null);
  if (t.done >= t.subjects.length) {
    G.sub = 'free';
    npcs.scatterYard();
  } else {
    G.sub = 'preBell';
    G.preBellUntil = G.now + (fresh ? PRE_BELL_SECONDS : 20);
    npcs.scatterYard();
  }
  if (fresh) gateCheck();
  else sys(`Bạn quay lại trường. Tan trường sau ${hhmm(G.state.sessionEnd - Date.now())}.`);
  setObjective();
  save();
}

function gateCheck() {
  const t = G.state.today, notes = [];
  if (!t.dressed) { addStat('conduct', -5); notes.push('👕 Không mặc đồng phục — hạnh kiểm −5'); }
  else if (t.dirty && Math.random() < 0.5) { notes.push(caughtDirty()); }
  if (!t.scarf) { addStat('conduct', -3); notes.push('🧣 Quên khăn quàng đỏ — hạnh kiểm −3'); }
  if (!t.bag) { addStat('conduct', -2); notes.push('🎒 Quên sách vở — hạnh kiểm −2'); }
  if (!t.breakfast) { addStat('energy', -15); notes.push('🍚 Chưa ăn sáng — năng lượng −15'); }
  if (notes.length) {
    sfx('whistle');
    say(npcs.redStar.label, 'Bạn ơi, cho mình ghi tên nha!');
    ask('Sao đỏ ở cổng trường', `<p>${notes.join('<br>')}</p>`, [{ label: 'Dạ, em biết rồi', value: 1 }]);
  } else {
    say(npcs.redStar.label, 'Đủ đồ, gọn gàng. Giỏi quá!');
    addStat('conduct', 1);
    toast('✅ Đến trường gọn gàng, đủ đồ dùng! Hạnh kiểm +1');
  }
}

function startClass(period, ring_ = true) {
  const t = G.state.today;
  t.period = period;
  G.sub = 'class';
  G.classStart = G.now;
  if (ring_) sfx('drum'); // school drum: tùng tùng tùng
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

export async function sitDown() {
  G.busy = true;
  G.sitting = true;
  const seat = mySeat();
  G.player.position.set(seat.x, 0, seat.z);
  G.player.rotation.y = Math.PI;
  G.player.userData.sitting = true;
  ring.visible = false;
  const t = G.state.today;
  if (G.now - G.classStart > CLASS_LATE_SECONDS) {
    t.lateToClass++;
    G.state.lateCount++;
    addStat('conduct', -2);
    await ask('Vào lớp muộn', `<p>${esc(npcs.classTeacher.label.nm.textContent)}: “Em vào lớp muộn rồi đấy. Lần sau chú ý nhé!”</p><p class="meta">Hạnh kiểm −2</p>`, [{ label: 'Dạ, em xin lỗi cô', value: 1 }]);
  }
  while (G.sub === 'class') {
    await doPeriod(t.period);
    t.done = t.period + 1;
    save();
    if (Date.now() >= G.state.sessionEnd) { endSchool(); break; }
    if (t.done >= t.subjects.length) { endPeriods(); break; }
    if (BREAK_AFTER.has(t.period)) { startBreak(); break; }
    startClass(t.period + 1);
    G.classStart = G.now; // already seated: no lateness
  }
  G.busy = false;
}

async function doPeriod(i) {
  const t = G.state.today, s = subj(t.subjects[i]);
  say(npcs.classTeacher.label, `Cả lớp mở sách môn ${s.name} nhé!`);
  const done = isDone(s.id);
  const tired = G.state.stats.energy < 25;
  await ask(`Tiết ${i + 1} · ${s.icon} ${s.name}`,
    `<p>${esc(s.teacher)} vào lớp. Cả lớp đứng dậy chào cô/thầy!</p>
     <p class="meta">Tiến độ môn: ${Math.min(G.state.progress[s.id], POINTS_TO_PASS)}/${POINTS_TO_PASS} điểm${done ? ' — đã hoàn thành, học ôn' : ''}.${tired ? '<br>⚠️ Bạn đang rất mệt, dễ ngủ gật.' : ''}</p>`,
    [{ label: 'Bắt đầu học', value: 1 }]);
  const avoid = new Set();
  const qs = [];
  for (let k = 0; k < 3; k++) {
    if (tired && k === 0) { qs.push({ sleep: true }); continue; }
    const q = makeQuestion(s.id, G.state.grade, avoid);
    avoid.add(q.q);
    qs.push(q);
  }
  const c = await runQuiz(`${s.icon} ${s.name}`, `Tiết ${i + 1} · ${s.teacher}`, qs);
  G.state.answered += qs.filter((q) => !q.sleep).length;
  G.state.correct += c;
  award(s.id, c);
  const got = eco.earn(G.state, c * eco.EARN.correct, 'trả lời đúng');
  addStat('energy', -7);
  toast(`${s.icon} ${s.name}: đúng ${c}/3${got ? ` · 🥥 +${got}` : ''}`);
  save();
}

function award(id, pts) {
  const before = G.state.progress[id];
  G.state.progress[id] = Math.min(POINTS_TO_PASS, before + pts);
  G.state.today.gained += G.state.progress[id] - before;
  if (before < POINTS_TO_PASS && G.state.progress[id] >= POINTS_TO_PASS) {
    sfx('up');
    sys(`🎉 Hoàn thành môn ${subj(id).name} lớp ${G.state.grade}!`);
    eco.earn(G.state, eco.EARN.subjectDone, `xong môn ${id}`);
    toast(`🎉 Hoàn thành môn ${subj(id).name}!`, 3000);
    if (classGroup(G.state.section).subjects.every(isDone)) {
      sys(G.state.section < 4
        ? `🎒 Xong cả 3 môn của Lớp ${cls()}! Về nhà xong sẽ chuyển sang Lớp ${G.state.grade}A${G.state.section + 1}.`
        : `🎓 Xong Lớp ${cls()} — lớp cuối của khối ${G.state.grade}! Về nhà sẽ xét lên lớp.`);
    }
  }
}

function standUp() {
  if (!G.sitting) return;
  G.sitting = false;
  G.player.userData.sitting = false;
  const seat = mySeat();
  G.player.position.set(seat.x, 0, seat.z + 0.45);
}

function startBreak() {
  const t = G.state.today;
  standUp();
  G.sub = 'break';
  G.breakStart = G.now;
  breakWarned = false;
  t.readBreak = t.playedBreak = false;
  sfx('drum2');
  npcs.toYard();
  setTeacherLabel(null);
  sys('Ra chơi! Ra sân, căng tin, thư viện… Nghe chuông thì vào lớp.');
  if (t.lunchbox) { t.lunchbox = false; addStat('energy', 20); toast('🍱 Bạn mở hộp đồ ăn mẹ chuẩn bị: năng lượng +20'); }
  else if (G.state.stats.energy < 40) toast('😣 Bụng đói cồn cào… ra căng tin mua gì ăn đi!');
  if (!has('bi-bat-nat') && !t.bullyDone && G.state.day >= 2 && Math.random() < 0.35) G.bullyAt = G.now + 12 + Math.random() * 25;
  else G.bullyAt = 0;
  setObjective();
}

function endBreak() {
  npcs.toClass();
  G.bullyAt = 0;
  startClass(G.state.today.done);
}

// all periods of this session done: free time at school until the 6 hours are over
function endPeriods() {
  standUp();
  G.sub = 'free';
  sfx('drum2');
  npcs.toYard();
  setTeacherLabel(null);
  sys(`Hết tiết học buổi này! Tự do ở trường, ${hhmm(G.state.sessionEnd - Date.now())} nữa tan trường. Bạn có thể thoát game, lát quay lại.`);
  setObjective();
  save();
}

export function endSchool() {
  standUp();
  G.sub = 'done';
  G.state.phase = 'after';
  G.state.today.afterAt = Date.now();
  sfx('bell');
  npcs.leaveSchool();
  setTeacherLabel(null);
  sys('🔔 Tan trường! Ra cổng để về nhà, hoặc ở lại chơi với bạn (lêu lổng).');
  setObjective();
  save();
}

function skipPeriod() {
  const t = G.state.today, s = subj(t.subjects[t.period]);
  t.skipped++;
  t.done = t.period + 1;
  addStat('conduct', -6);
  ask('Trốn tiết!', `<p>Bạn không vào lớp tiết ${s.name}. Cô ghi vào sổ đầu bài.</p><p class="meta">Hạnh kiểm −6 · Không được điểm môn này</p>`, [{ label: 'Ừ thì…', value: 1 }]);
  if (t.done >= t.subjects.length) endPeriods();
  else if (BREAK_AFTER.has(t.period)) startBreak();
  else startClass(t.done);
}

// Close the school session (when walking home, or on load after being away past the 6 hours).
// Returns the summary to show once the player is home.
export function finishSession() {
  const t = G.state.today;
  addStat('energy', 40);
  addStat('mood', 4);
  const clean = !t.skipped && !t.loiter && !t.lateToClass && t.dressed && t.scarf && !t.caughtDirty && !t.caughtPrank;
  if (clean) { addStat('conduct', 3); eco.earn(G.state, eco.EARN.cleanDay, 'buổi ngoan'); }
  if (t.dressed) laundry().dirty++; // the set worn all day goes to the dirty pile
  const changes = evaluateTags();
  const lines = [
    `Điểm môn học: +${t.gained}`,
    `🥥 Coco kiếm được: +${t.earned}${t.earned >= eco.EARN_CAP_PER_DAY ? ' (đã đạt tối đa mỗi ngày)' : ''} · đang có ${G.state.coco}`,
    `Hạnh kiểm: ${conductName(G.state.stats.conduct)} (${G.state.stats.conduct})`,
    `Tỉ lệ trả lời đúng: ${Math.round(accuracy() * 100)}%`,
  ];
  if (clean) lines.push('Một buổi ngoan: hạnh kiểm +3');
  if (t.skipped) lines.push(`Trốn ${t.skipped} tiết`);
  if (t.dressed) lines.push('👕 Đồng phục mặc cả buổi đã dơ — nhớ giặt (15 phút)');
  const g = classGroup(G.state.section);
  if (G.state.section < 4 && g.subjects.every(isDone)) {
    G.state.section++;
    newClassUniforms();
    const ng = classGroup(G.state.section);
    changes.push(`🎒 Chuyển sang Lớp ${cls()}: ${ng.subjects.map((id) => subj(id).name).join(', ')}. Mẹ đã đổi ${G.state.uniform.clean} bộ đồng phục sang màu ${ng.colorName} (sạch).`);
  }
  const title = `🏠 Hết ngày ${G.state.day}`;
  G.state.day++;
  G.state.today = newToday();
  G.state.homeAt = Date.now();
  G.state.sessionStart = G.state.sessionEnd = 0;
  return { title, html: `<p>${lines.join('<br>')}</p>${changes.length ? `<p><b>${changes.join('<br>')}</b></p>` : ''}` };
}

export async function goHome(reason) {
  const sec = G.state.section, loitered = G.state.today.loiter; // read before finishSession() resets the day
  const sum = finishSession();
  await fade(() => enterHome());
  if (reason) toast(reason, 3200);
  say(npcs.mom.label, loitered ? 'Sao hôm nay về muộn thế con?' : 'Con về rồi à! Thay đồ đi giặt nhé.');
  await showSessionEnd(sum, sec);
}

export async function showSessionEnd(sum, secBefore) {
  G.busy = true;
  try {
    await ask(sum.title, sum.html, [{ label: 'Về nhà nghỉ ngơi', value: 1 }]);
    const promoted = await checkPromotion();
    if (promoted || G.state.section !== secBefore) respawnNpcs();
    sys(`Ngày ${G.state.day} — chuẩn bị đi học: ăn sáng, giặt đồ nếu dơ, mặc đồng phục Lớp ${cls()}, khăn quàng, soạn cặp.`);
  } finally { G.busy = false; }
  setObjective();
  save();
}

// returns true when the grade changed
async function checkPromotion() {
  const allDone = SUBJECTS.every((s) => isDone(s.id));
  if (!allDone || G.state.graduated) return false;
  if (G.state.stats.conduct < 50) {
    await ask('Chưa được lên lớp', '<p>Bạn đã học xong 12 môn, nhưng hạnh kiểm đang <b>Yếu</b>. Cần hạnh kiểm Trung bình (50) trở lên để lên lớp.</p>', [{ label: 'Con sẽ cố gắng', value: 1 }]);
    return false;
  }
  sfx('up');
  if (G.state.grade >= 9) {
    G.state.graduated = true;
    await ask('🎓 Tốt nghiệp THCS!', `<p>Chúc mừng <b>${esc(G.state.name)}</b> đã hoàn thành chương trình lớp 6 → 9 tại ${esc(G.state.school)}!</p><p>Bạn có thể tiếp tục đi học để ôn tập, hoặc chơi lại từ đầu.</p>`, [{ label: 'Tuyệt vời!', value: 1 }]);
    return false;
  }
  G.state.grade++;
  G.state.section = 1;
  newClassUniforms();
  G.state.progress = Object.fromEntries(SUBJECTS.map((s) => [s.id, 0]));
  addStat('conduct', 5);
  await ask(`🎉 Lên lớp ${G.state.grade}!`, `<p>Bạn đã hoàn thành đủ 12 môn. Từ buổi sau bạn học <b>Lớp ${cls()}</b> (đồng phục màu ${classGroup(1).colorName}).</p><p class="meta">Câu hỏi sẽ khó hơn theo chương trình lớp ${G.state.grade}.</p>`, [{ label: 'Lên lớp thôi!', value: 1 }]);
  return true;
}

export async function showTimetable() {
  const list = timetable().map((id, i) => `Tiết ${i + 1}: ${subj(id).icon} ${subj(id).name}${BREAK_AFTER.has(i) ? '<br><i>— ra chơi —</i>' : ''}`).join('<br>');
  const g = classGroup(G.state.section);
  await ask(`📅 Thời khoá biểu Lớp ${cls()}`, `<p>${list}</p>
    <p class="meta">Lớp ${cls()} học: ${g.subjects.map((id) => `${subj(id).name} (${Math.min(G.state.progress[id], POINTS_TO_PASS)}/${POINTS_TO_PASS})`).join(', ')}.
    Xong cả 3 môn thì chuyển lớp. Mỗi buổi ở trường kéo dài 6 tiếng (giờ thật), học xong các tiết thì được tự do.</p>`, [{ label: 'Đã nhớ', value: 1 }]);
}

export async function homework() {
  const list = openSubjects().map(subj);
  const id = await ask('📝 Học bài môn nào?', '<p>Ôn 2 câu, mỗi câu đúng được 1 điểm môn.</p>', [
    ...list.map((s) => ({ label: `${s.icon} ${s.name} (${Math.min(G.state.progress[s.id], POINTS_TO_PASS)}/${POINTS_TO_PASS})`, value: s.id })),
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (!id) return;
  G.state.today.studied = true;
  await quizFor(id, 2, 'Học bài ở nhà');
  addStat('energy', -5);
}

export async function practice(n, where) {
  await quizFor(pick(openSubjects()), n, where);
}

export async function quizFor(id, n, where, mult = 1) {
  const s = subj(id), avoid = new Set(), qs = [];
  for (let k = 0; k < n; k++) { const q = makeQuestion(id, G.state.grade, avoid); avoid.add(q.q); qs.push(q); }
  const c = await runQuiz(`${s.icon} ${s.name}`, where, qs);
  G.state.answered += n;
  G.state.correct += c;
  award(id, c * mult);
  const got = eco.earn(G.state, c * eco.EARN.correct, 'ôn bài');
  toast(`${s.icon} ${s.name}: đúng ${c}/${n}${mult > 1 ? ` (×${mult} điểm)` : ''}${got ? ` · 🥥 +${got}` : ''}`);
  save();
}

export function phaseTick(dt) {
  const p = G.state.phase, t = G.state.today;
  if (p === 'home') {
    G.state.clock = 360 + Math.min(59, (Date.now() - G.state.homeAt) / 60000);
    if (G.now - lastMomLine > 25) { lastMomLine = G.now; say(npcs.mom.label, pick(['Nhớ khăn quàng đỏ nhé!', 'Ăn sáng chưa con?', 'Áo dơ thì bỏ vào máy giặt nha con!', 'Soạn cặp chưa đó?'])); }
    if (!G.washNotified && !laundry().washing) {
      G.washNotified = true;
      sfx('up');
      toast('🧺 Đồng phục giặt xong rồi, khô thơm tho!', 3000);
    }
  } else if (p === 'school') {
    G.state.clock = 420 + (Date.now() - G.state.sessionStart) / 60000; // 7:00 + real minutes at school
    if (Date.now() >= G.state.sessionEnd && !G.busy && !G.sitting) { endSchool(); return; }
    patrolTick();
    if (G.sub === 'preBell') {
      if (G.now >= G.preBellUntil) { npcs.toClass(); startClass(t.done); }
      chatterTick(LINES.preBell);
    } else if (G.sub === 'class' && !G.sitting && !G.busy) {
      if (G.now - G.classStart > CLASS_SKIP_SECONDS) skipPeriod();
    } else if (G.sub === 'free') {
      chatterTick(LINES.break);
    } else if (G.sub === 'break') {
      const e = G.now - G.breakStart;
      chatterTick(LINES.break);
      if (!breakWarned && e > BREAK_SECONDS - 15) { breakWarned = true; toast('🔔 Sắp hết giờ ra chơi, chuẩn bị vào lớp!'); }
      if (G.bullyAt && G.now > G.bullyAt && !G.busy && !G.bullyActive && G.now > G.guardUntil) { G.busy = true; bullyEvent().finally(() => { G.busy = false; }); }
      if (e >= BREAK_SECONDS && !G.busy) endBreak();
    }
    if (G.now < G.guardUntil && !npcs.monitor.path.length) {
      const m = npcs.monitor.mesh.position;
      if (m.distanceTo(G.player.position) > 3) npcs.goTo(npcs.monitor, G.player.position.x + 1.5, G.player.position.z + 1);
    } else if (G.now >= G.guardUntil && !npcs.monitor.wander && !npcs.monitor.path.length) npcs.monitor.wander = true;
  } else if (p === 'after') {
    G.state.clock = 780 + (Date.now() - t.afterAt) / 60000;
    chatterTick(LINES.after);
    if (Date.now() - t.afterAt > LOITER_MS && !G.busy) {
      G.busy = true;
      t.loiter++;
      G.state.loiterCount++;
      addStat('conduct', -2);
      goHome('📞 Mẹ gọi: “Sao giờ này chưa về hả con?” (hạnh kiểm −2)').finally(() => { G.busy = false; });
    }
  }
}

function chatterTick(lines) {
  if (G.now - lastChatter < 4.5) return;
  lastChatter = G.now + Math.random() * 3;
  const c = npcs.chatter(G.player.position, lines, G.now);
  if (c) chatLine(c.name, c.text);
}
