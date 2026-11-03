// Hotspot actions: what the action button does where the player stands.
import { POINTS_TO_PASS, SUBJECTS } from './subjects.js';
import { ask, say, toast, ui } from './ui.js';
import * as eco from './economy.js';
import { openFeedback } from './feedback.js';
import { addStat, cls, G, has, mmss, pick } from './ctx.js';
import { save } from './save.js';
import { goHome, leaveHome, practice, quizFor, sitDown } from './session.js';
import { laundry } from './laundry.js';
import { bagMenu, canteen, desk, homeTable, wardrobe } from './shop.js';
import { prank, prankLabel } from './prank.js';
import { renderSpecial } from './tags.js';
import { zoneAt } from './player.js';
import { cleanText } from './chat.js';
import { setObjective } from './hud.js';
import { npcs } from './stage.js';

// ---------------- hotspot actions ----------------
function homeOnly(label, run) { return G.state.phase === 'home' ? { label, run } : null; }

export function actionFor(id) {
  const p = G.state.phase, t = G.state.today;
  const atSchool = p === 'school' || p === 'after';
  const freeTime = (p === 'school' && (G.sub === 'break' || G.sub === 'preBell' || G.sub === 'free')) || p === 'after';
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
      return G.prankTarget ? { label: prankLabel(G.prankTarget), run: () => prank(G.prankTarget) } : null;
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
      return p === 'school' && G.sub === 'class' && !G.sitting ? { label: '🪑 Ngồi vào chỗ', run: sitDown } : null;
    case 'library-read':
      if (p === 'school' && G.sub === 'break' && !t.readBreak) return { label: '📚 Đọc sách (ôn 2 câu)', run: () => { t.readBreak = true; return practice(2, 'Thư viện'); } };
      if (p === 'school' && G.sub === 'free' && !t.libFree) return { label: '📚 Ôn bài ở thư viện (3 câu)', run: () => { t.libFree = true; return practice(3, 'Thư viện'); } };
      return null;
    case 'canteen':
      return freeTime ? { label: '🥖 Căng tin', run: canteen } : null;
    case 'shuttlecock':
      if (p === 'school' && (G.sub === 'break' || G.sub === 'free') && !t.playedBreak) return { label: '🏸 Đá cầu', run: async () => { t.playedBreak = true; addStat('mood', 8); addStat('energy', -5); toast('🏸 Vui quá! Tâm trạng +8'); } };
      if (p === 'after') return { label: '🏸 Ở lại đá cầu (lêu lổng)', run: () => loiter('🏸 Đá cầu với bạn', 12, -8, 0) };
      return null;
    case 'hangout':
      if (p === 'after') return { label: '😎 Tụ tập chơi game, ăn vặt', run: () => loiter('😎 Tụ tập với hội bạn cá biệt', 15, -5, -5) };
      if (p === 'school' && (G.sub === 'break' || G.sub === 'free')) return { label: '😎 Tụ tập ở góc sau', run: async () => { addStat('mood', 8); addStat('conduct', -1); toast('😎 Tâm trạng +8, hạnh kiểm −1'); } };
      return null;
    case 'counsel':
      return atSchool ? { label: '💬 Nói chuyện với cô Thu', run: counsel } : null;
    case 'excellent-room':
      return atSchool && !t.challenge && !(p === 'school' && G.sub === 'class') ? { label: '🌟 Thử thách học sinh giỏi', run: challenge } : null;
    case 'team-room':
      return atSchool && !t.meeting ? { label: '🎗️ Họp cán sự lớp', run: meeting } : null;
    case 'teachers-room':
      return atSchool ? { label: '👩‍🏫 Phòng giáo viên', run: async () => toast('Phòng giáo viên sẽ có tính năng ở bản nhiều người chơi.') } : null;
  }
  return null;
}

export async function mailbox() {
  const p = G.player.position, z = zoneAt(p);
  await openFeedback({
    name: G.state.name, school: G.state.school, grade: G.state.grade, section: G.state.section, phase: G.state.phase,
    zone: z ? z.name : 'Đường đi', x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10, lastQ: ui.lastQ,
  }, cleanText);
}

export async function loiter(text, mood, energy, cost) {
  const t = G.state.today;
  t.loiter++;
  G.state.loiterCount++;
  addStat('mood', mood);
  addStat('energy', energy);
  if (cost < 0) eco.lose(G.state, -cost, 'lêu lổng');
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
    G.state.counselSinceTag++;
    if (G.state.counselSinceTag >= 2) {
      G.state.tags = G.state.tags.filter((x) => x !== 'bi-bat-nat');
      await ask('🌱 Bạn đã ổn hơn', '<p>Chuyện bắt nạt đã được thầy cô giải quyết. Nếu có chuyện lặp lại, hãy báo ngay nhé — cô Thu và nút Báo cô luôn sẵn sàng.</p>', [{ label: 'Vâng ạ', value: 1 }]);
      renderSpecial();
    }
  }
  save();
}

async function challenge() {
  const t = G.state.today;
  t.challenge = true;
  const inc = SUBJECTS.filter((s) => G.state.progress[s.id] < POINTS_TO_PASS);
  const s = pick(inc.length ? inc : SUBJECTS);
  await quizFor(s.id, 3, 'Thử thách học sinh giỏi', 2);
}

async function meeting() {
  const t = G.state.today;
  t.meeting = true;
  addStat('conduct', 2);
  addStat('mood', 5);
  const st = npcs.classmates().filter((n) => n.grade === G.state.section).length;
  await ask('🎗️ Họp cán sự lớp', `<p><b>Sổ đầu bài hôm nay — Lớp ${cls()}</b></p>
    <p>Sĩ số: ${st + 1} · Vào lớp muộn: ${t.lateToClass} lần · Tiết bị trốn: ${t.skipped}</p>
    <p>Lớp trưởng lên kế hoạch thi đua tuần: giữ trật tự giờ học, giúp bạn học yếu.</p><p class="meta">Hạnh kiểm +2, tâm trạng +5</p>`, [{ label: 'Kết thúc họp', value: 1 }]);
}

export async function interact() {
  if (G.busy || ui.modalOpen || !G.state) return;
  const a = G.currentAction;
  if (!a) return;
  G.busy = true;
  try { await a.run(); } finally { G.busy = false; }
  setObjective();
}
