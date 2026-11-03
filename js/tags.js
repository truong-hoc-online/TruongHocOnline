// Tags (titles), their evaluation, the special HUD buttons, and the bullying event (handled supportively).
import { $, ask, chatLine, say, setLabelTag, ui } from './ui.js';
import * as eco from './economy.js';
import { accuracy, addStat, G, has, pick } from './ctx.js';
import { save } from './save.js';
import { zoneAt } from './player.js';
import { npcs, W } from './stage.js';

export const TAGS = {
  'gioi': { name: 'Học sinh giỏi', icon: '🌟', how: 'Trả lời đúng từ 80% (ít nhất 15 câu) và hạnh kiểm từ 80.', perk: 'Vào Phòng học sinh giỏi: mỗi ngày một thử thách, đúng được nhân đôi điểm.' },
  'lop-truong': { name: 'Lớp trưởng', icon: '🎗️', how: 'Từ ngày thứ 3, hạnh kiểm từ 85, đúng từ 60%, không cá biệt.', perk: 'Vào Phòng Đội (họp cán sự), nút “Giữ trật tự” cho cả lớp.' },
  'ca-biet': { name: 'Học sinh cá biệt', icon: '😎', how: 'Hạnh kiểm dưới 60, hoặc vào lớp muộn 3 lần, lêu lổng 4 lần, chọc phá bạn 6 lần.', perk: 'Dám nói chuyện trong lớp và thư viện, vào Góc sau căng tin. Hạnh kiểm lên 75 thì hết.' },
  'bi-bat-nat': { name: 'Đang bị bắt nạt', icon: '🛡️', how: 'Gặp chuyện bị bắt nạt ở trường.', perk: 'Nút “Báo cô” luôn hiện, thầy giám thị để ý bảo vệ, cô Thu ở Phòng tư vấn lắng nghe.' },
  'co-giao': { name: 'Cô giáo', icon: '👩‍🏫', how: 'Vai giáo viên — sẽ mở ở bản nhiều người chơi.', perk: 'Vào Phòng giáo viên.' },
};
const PRANKS_FOR_CA_BIET = 6;

export function evaluateTags() {
  const out = [];
  const s = G.state.stats, acc = accuracy();
  const add = (t, msg) => { if (!has(t)) { G.state.tags.push(t); out.push(msg); } };
  const remove = (t, msg) => { if (has(t)) { G.state.tags = G.state.tags.filter((x) => x !== t); out.push(msg); } };
  if (G.state.answered >= 15 && acc >= 0.8 && s.conduct >= 80) add('gioi', '🌟 Bạn được công nhận Học sinh giỏi! Phòng học sinh giỏi đã mở.');
  else if (has('gioi') && (acc < 0.7 || s.conduct < 70)) remove('gioi', 'Bạn mất danh hiệu Học sinh giỏi. Cố lên nhé!');
  if (has('ca-biet')) {
    if (s.conduct >= 75) {
      remove('ca-biet', '👏 Bạn đã tiến bộ, không còn là học sinh cá biệt!');
      G.state.lateCount = 0;
      G.state.loiterCount = 0;
      G.state.prankCount = 0;
    }
  } else if (s.conduct < 60 || G.state.lateCount >= 3 || G.state.loiterCount >= 4 || G.state.prankCount >= PRANKS_FOR_CA_BIET) {
    add('ca-biet', '😎 Bạn bị xếp vào nhóm Học sinh cá biệt. Góc sau căng tin đã mở… nhưng thầy cô để ý bạn hơn.');
  }
  if (!has('ca-biet') && G.state.day >= 3 && s.conduct >= 85 && acc >= 0.6) add('lop-truong', '🎗️ Cô chủ nhiệm chọn bạn làm Lớp trưởng! Phòng Đội đã mở.');
  else if (has('lop-truong') && (s.conduct < 70 || has('ca-biet'))) remove('lop-truong', 'Bạn không còn làm lớp trưởng nữa.');
  refreshMyTag();
  return out;
}

export function refreshMyTag() {
  const t = G.state.tags.filter((x) => x !== 'bi-bat-nat').map((x) => TAGS[x].icon + ' ' + TAGS[x].name)[0] || '';
  setLabelTag(G.meLabel, t);
}

export function renderSpecial() {
  const box = $('special');
  box.innerHTML = '';
  if (!G.state) return;
  if (has('bi-bat-nat')) {
    const b = document.createElement('button');
    b.className = 'safe';
    b.textContent = '🛡️ Báo cô';
    b.onclick = () => { if (!ui.modalOpen) reportTeacher(); };
    box.appendChild(b);
  }
  if (has('lop-truong') && G.state.phase === 'school' && !G.state.today.ordered) {
    const b = document.createElement('button');
    b.className = 'order';
    b.textContent = '📢 Giữ trật tự';
    b.onclick = () => {
      G.state.today.ordered = true;
      npcs.quietUntil = G.now + 40;
      chatLine(`Lớp trưởng ${G.state.name}`, 'Cả lớp trật tự nào!');
      say(G.meLabel, 'Cả lớp trật tự nào!');
      addStat('conduct', 1);
      renderSpecial();
    };
    box.appendChild(b);
  }
}

// ---------------- bullying event (handled supportively) ----------------
export async function bullyEvent() {
  const z = zoneAt(G.player.position);
  if (!z || z.id !== 'yard' || G.sitting) { G.bullyAt = 0; return; }
  G.bullyAt = 0;
  G.bullyActive = true;
  const [a, b] = npcs.bullies;
  npcs.goTo(a, G.player.position.x - 1.1, G.player.position.z - 0.6);
  npcs.goTo(b, G.player.position.x + 1.1, G.player.position.z - 0.6);
  say(a.label, 'Ê nhóc, đứng lại!');
  await new Promise((r) => setTimeout(r, 1800));
  say(b.label, 'Có tiền không, đưa đây!');
  const t = G.state.today;
  t.bullyDone = true;
  const choice = await ask('😟 Bị chặn đường', `<p><b>Tèo Bự</b> và <b>Long Gấu</b> (lớp 9) chặn bạn lại, đòi tiền và trêu chọc.</p><p>Bạn làm gì?</p>`, [
    { label: '🙅 Nói “Không!” rồi đi thẳng tới chỗ thầy giám thị', value: 'refuse' },
    { label: '💸 Đưa tiền cho xong chuyện', value: 'pay' },
    { label: '👊 Đánh lại', value: 'fight' },
  ]);
  if (choice === 'refuse') {
    addStat('mood', -5);
    npcs.goTo(npcs.monitor, G.player.position.x + 0.8, G.player.position.z + 1);
    say(npcs.monitor.label, 'Có thầy đây! Hai em kia về lớp ngay!');
  } else if (choice === 'pay') {
    eco.lose(G.state, 10, 'bị bắt nạt lấy tiền');
    addStat('mood', -15);
    say(a.label, 'Ngoan đấy, mai nhớ mang tiếp nhé.');
  } else {
    addStat('conduct', -10);
    addStat('mood', -5);
    npcs.goTo(npcs.monitor, G.player.position.x + 0.8, G.player.position.z + 1);
    say(npcs.monitor.label, 'Dừng lại! Cả ba em lên phòng giám thị!');
  }
  setTimeout(() => { a.wander = b.wander = true; a.path = [pick(W.spots.yardPoints)]; b.path = [pick(W.spots.yardPoints)]; }, 2500);
  if (!has('bi-bat-nat')) { G.state.tags.push('bi-bat-nat'); G.state.counselSinceTag = 0; }
  G.bullyActive = false;
  await ask('🛡️ Bạn không có lỗi', `<p>Bị bắt nạt <b>không phải lỗi của bạn</b>. Điều quan trọng là kể cho người lớn tin cậy: thầy cô, bố mẹ.</p>
    <p>Từ giờ nút <b>🛡️ Báo cô</b> luôn ở góc màn hình. <b>Phòng tư vấn</b> (dãy bên trái sân) có cô Thu luôn lắng nghe.</p>
    <p class="meta">Ngoài đời: gọi <b>111</b> — Tổng đài quốc gia bảo vệ trẻ em, miễn phí, 24/7.</p>`, [{ label: 'Mình hiểu rồi', value: 1 }]);
  renderSpecial();
  save();
}

async function reportTeacher() {
  const t = G.state.today;
  await ask('🛡️ Báo cô', `<p><b>Cô Hạnh:</b> “Cảm ơn em đã kể với cô. Em làm đúng lắm. Cô sẽ nói chuyện với các bạn đó và báo gia đình. Thầy giám thị sẽ để ý em trong giờ ra chơi.”</p>`, [{ label: 'Em cảm ơn cô', value: 1 }]);
  G.guardUntil = G.now + 60;
  if (!t.reportedTeacher) { t.reportedTeacher = true; addStat('mood', 8); }
  if (G.state.phase === 'school' || G.state.phase === 'after') say(npcs.monitor.label, 'Thầy ở gần đây, có gì gọi thầy nhé.');
}
