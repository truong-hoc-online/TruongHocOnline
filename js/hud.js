// HUD: objective line, stats, menus (subjects, tags, mail, rank, sound, help).
import { CLASS_GROUPS, POINTS_TO_PASS, SUBJECTS } from './subjects.js';
import { $, ask, esc, ui } from './ui.js';
import * as eco from './economy.js';
import { GAME_VERSION } from './config.js';
import { cls, conductName, fmt, G, has, hhmm, isDone, mmss, subj, TOUCH } from './ctx.js';
import { BREAK_SECONDS, CLASS_SKIP_SECONDS, homeMissing, PERIODS_PER_SESSION } from './session.js';
import { laundry } from './laundry.js';
import { renderSpecial, TAGS } from './tags.js';
import { zoneAt } from './player.js';
import { mailbox } from './actions.js';
import { rankAndTransfer } from './online.js';

const PHASE_NAMES = { home: 'Ở nhà chuẩn bị', school: 'Tại trường', after: 'Tan trường' };
let lastSpecialKey = '';

export function setObjective() {
  if (!G.state) return;
  const p = G.state.phase, t = G.state.today;
  let s = '';
  if (p === 'home') {
    const miss = homeMissing();
    const u = laundry();
    const wash = u.washing ? `🧺 Giặt xong sau ${mmss(u.until - Date.now())} · ` : '';
    s = miss.length ? `${wash}Còn: ${miss.filter((m) => !wash || !m.startsWith('đợi')).join(' · ')}` : '✅ Đủ đồ rồi! Ra cửa đi học';
  } else if (p === 'school') {
    const n = t.subjects.length;
    if (G.sub === 'preBell') s = `Sắp vào tiết ${t.done + 1}/${n} (${Math.max(0, Math.ceil(G.preBellUntil - G.now))}s). Dạo sân, hoặc vào Lớp ${cls()} ngồi trước.`;
    else if (G.sub === 'class' && !G.sitting) {
      const left = Math.max(0, Math.ceil(CLASS_SKIP_SECONDS - (G.now - G.classStart)));
      s = `🔔 Tiết ${t.period + 1}/${n}: ${subj(t.subjects[t.period]).name} — vào Lớp ${cls()}, ngồi chỗ có vòng sáng (${left}s)`;
    } else if (G.sub === 'break') s = `Ra chơi — còn ${Math.max(0, Math.ceil(BREAK_SECONDS - (G.now - G.breakStart)))}s`;
    else if (G.sub === 'free') s = `Hết tiết! Tự do ở trường — tan trường sau ${hhmm(G.state.sessionEnd - Date.now())}. Có thể thoát game, lát quay lại.`;
  } else if (p === 'after') s = 'Tan học! Ra cổng để về nhà, hoặc ở lại chơi (lêu lổng).';
  $('objective').textContent = s;
}

export function updateHud(npcCount) {
  const s = G.state.stats;
  $('schoolName').textContent = G.state.school;
  $('npcCount').textContent = npcCount;
  $('clock').textContent = fmt(G.state.clock);
  $('phaseName').textContent = PHASE_NAMES[G.state.phase];
  $('classInfo').textContent = `Lớp ${cls()} · Ngày ${G.state.day}`;
  $('conduct').textContent = `${conductName(s.conduct)} (${s.conduct})`;
  $('energyBar').style.width = s.energy + '%';
  $('moodBar').style.width = s.mood + '%';
  $('money').textContent = G.state.coco;
  const z = zoneAt(G.player.position);
  $('zoneName').textContent = z ? z.name + (z.quiet ? ' 🤫' : '') : 'Đường đi';
  $('tagChips').innerHTML = G.state.tags.map((t) => `<span>${TAGS[t].icon} ${esc(TAGS[t].name)}</span>`).join('');
  const key = G.state.tags.join() + G.state.phase + G.state.today.ordered;
  if (key !== lastSpecialKey) { lastSpecialKey = key; renderSpecial(); }
  setObjective();
}

export function initHud() {
  $('btnSubjects').onclick = () => {
    if (ui.modalOpen) return;
    const rows = CLASS_GROUPS.map((g) => {
      const here = g.sec === G.state.section;
      const head = `<b style="grid-column:1/-1;margin-top:6px">${here ? '👉 ' : ''}Lớp ${G.state.grade}A${g.sec} · áo ${g.colorName}${g.subjects.every(isDone) ? ' ✅' : ''}</b>`;
      return head + g.subjects.map(subj).map((s) => {
        const v = Math.min(G.state.progress[s.id], POINTS_TO_PASS);
        return `<span>${s.icon} ${s.name}</span><span>${v}/${POINTS_TO_PASS}${v >= POINTS_TO_PASS ? ' ✅' : ''}</span><i><em style="width:${(v / POINTS_TO_PASS) * 100}%"></em></i>`;
      }).join('');
    }).join('');
    const done = SUBJECTS.filter((s) => isDone(s.id)).length;
    ask(`📚 Khối ${G.state.grade} — ${done}/12 môn`, `<p class="meta">Học xong 3 môn của lớp thì chuyển lớp (A1 → A4). Xong A4 (đủ 12 môn, hạnh kiểm từ Trung bình) thì lên lớp.</p><div class="prog">${rows}</div>`, [{ label: 'Đóng', value: 1 }]);
  };
  $('btnTags').onclick = () => {
    if (ui.modalOpen) return;
    const rows = Object.entries(TAGS).map(([k, t]) => `<div class="tagRow ${has(k) ? 'on' : ''}">${t.icon} ${t.name}${has(k) ? ' — bạn đang có' : ''}<small>Cách có: ${t.how}</small><small>Quyền: ${t.perk}</small></div>`).join('');
    ask('🏷️ Danh hiệu (tag)', rows, [{ label: 'Đóng', value: 1 }]);
  };
  $('btnMail').onclick = () => { if (!ui.modalOpen && !G.busy && G.state) { G.busy = true; mailbox().finally(() => { G.busy = false; }); } };
  $('btnRank').onclick = () => { if (!ui.modalOpen && !G.busy && G.state) { G.busy = true; rankAndTransfer().finally(() => { G.busy = false; }); } };
  $('btnSound').onclick = () => { ui.soundOn = !ui.soundOn; $('btnSound').textContent = ui.soundOn ? '🔊' : '🔇'; };
  $('btnHelp').onclick = () => { if (!ui.modalOpen) showHelp(); };
}
export function showHelp() {
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
