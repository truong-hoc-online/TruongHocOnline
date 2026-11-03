// Online: leaderboard + move progress to another device.
import { ask, esc, toast } from './ui.js';
import * as cloud from './cloud.js';
import { G } from './ctx.js';
import { load, migrate, save, SAVE_KEY } from './save.js';

export async function rankAndTransfer(scope = 'school') {
  const rows = await cloud.leaderboard(scope === 'school' ? G.state.school : null);
  const list = rows
    ? rows.map((r) => `<div class="rankRow${r.is_me ? ' me' : ''}"><b>${r.rank}</b><span>${esc(r.display_name)}${scope === 'all' ? ` <small>${esc(r.school)}</small>` : ''}</span><span>${r.grade}A${r.section}</span><span>${r.score}</span></div>`).join('') || '<p>Chưa có ai.</p>'
    : '<p>Không kết nối được máy chủ. Thử lại sau nhé.</p>';
  const v = await ask(scope === 'school' ? `🏆 Xếp hạng ${esc(G.state.school)}` : '🏆 Xếp hạng tất cả các trường',
    `<p class="meta">Điểm = mỗi khối đã xong 60 + điểm các môn ở khối đang học.</p><div class="rank">${list}</div>`, [
      { label: scope === 'school' ? '🌏 Tất cả các trường' : `🏫 ${G.state.school}`, value: scope === 'school' ? 'all' : 'school' },
      { label: '📲 Chuyển sang máy khác', value: 'transfer' },
      { label: 'Đóng', value: null, cls: 'ghost' },
    ]);
  if (v === 'all' || v === 'school') return rankAndTransfer(v);
  if (v === 'transfer') return giveTransferCode();
}

async function giveTransferCode() {
  const ok = await ask('📲 Chuyển sang máy khác', `<p>Game sẽ tạo một <b>mã 8 chữ</b>. Nhập mã đó trên máy mới (hoặc trên app vừa cài) để mang theo toàn bộ tiến độ và coco.</p>
    <p class="meta">Sau khi máy mới nhận mã, máy này sẽ bắt đầu lại từ đầu. Đừng đưa mã cho người khác.</p>`, [
    { label: 'Tạo mã', value: true },
    { label: 'Thôi', value: false, cls: 'ghost' },
  ]);
  if (!ok) return;
  save();
  const r = await cloud.createTransferCode(G.state);
  if (r.error) { toast('Không kết nối được máy chủ. Thử lại sau nhé.', 3000); return; }
  await ask('📲 Mã chuyển máy', `<p class="bigCode">${esc(r.code)}</p>
    <p>Trên máy mới: mở game → <b>📲 Nhập mã chuyển máy</b> → nhập mã này. Mã dùng được <b>15 phút</b>, một lần.</p>`, [{ label: 'Xong', value: 1 }]);
}

// Start screen: take over the progress from another device.
export async function claimTransfer() {
  const hasLocal = !!load();
  const go = await ask('📲 Nhập mã chuyển máy', `<p>Trên máy cũ: bấm 🏆 → <b>📲 Chuyển sang máy khác</b> để lấy mã.</p>
    <input id="tCode" maxlength="9" autocomplete="off" autocapitalize="characters" placeholder="VD: ABCD2345">
    ${hasLocal ? '<p class="meta">⚠️ Tiến độ đang có trên máy này sẽ bị thay bằng tiến độ từ máy cũ.</p>' : ''}`, [
    { label: 'Nhận tiến độ', value: true },
    { label: 'Thôi', value: false, cls: 'ghost' },
  ]);
  const code = document.getElementById('tCode')?.value || '';
  if (!go) return;
  const r = await cloud.claimTransferCode(code);
  if (r.error) {
    toast({ invalid: 'Mã không đúng hoặc đã hết hạn.', 'same-device': 'Đây là mã của chính máy này.', 'too-many': 'Thử sai nhiều quá, đợi 1 tiếng nhé.', offline: 'Game chưa kết nối máy chủ.' }[r.error] || 'Không kết nối được máy chủ. Thử lại sau nhé.', 3500);
    return;
  }
  const s = migrate(r.save);
  if (!s) { toast('Tiến độ nhận được bị lỗi.', 3500); return; }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  toast('✅ Đã nhận tiến độ!', 2000);
  setTimeout(() => location.reload(), 1200);
}

// This device's progress was claimed by another device: start over here.
export function onTransferredAway() {
  G.movedAway = true; // stop save() from writing the old progress back
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  ask('📲 Đã chuyển máy', '<p>Tiến độ của bạn đã được chuyển sang máy khác. Máy này sẽ quay về màn hình bắt đầu.</p>', [{ label: 'OK', value: 1 }])
    .then(() => location.reload());
}
