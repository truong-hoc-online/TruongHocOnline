// Feedback mailbox 📮: players report a wrong question, a place where they got stuck, or any bug.
// Without a backend the reports wait in a local outbox; with Supabase configured (js/config.js) they are
// inserted into the `feedback` table (insert-only for players via RLS) and the outbox is flushed.
import { GAME_VERSION } from './config.js';
import { enabled, rest } from './backend.js';
import { ask, esc, toast } from './ui.js';

const OUTBOX = 'tho-feedback-outbox';
const MAX_OUTBOX = 50;
export const KINDS = {
  question: '❓ Câu hỏi sai / chưa rõ',
  stuck: '🧱 Bị kẹt, không đi được',
  bug: '🐞 Lỗi game khác',
  idea: '💡 Ý tưởng, góp ý',
};

function readOutbox() { try { return JSON.parse(localStorage.getItem(OUTBOX)) || []; } catch { return []; } }
function writeOutbox(list) { try { localStorage.setItem(OUTBOX, JSON.stringify(list.slice(-MAX_OUTBOX))); } catch { /* ignore */ } }
export const pendingCount = () => readOutbox().length;

// Sent as the anonymously signed-in player (the table is insert-only and rate-limited per player).
async function send(report) {
  if (!enabled()) return false;
  const res = await rest('feedback', { method: 'POST', body: report, headers: { Prefer: 'return=minimal' } });
  if (res?.ok) return true;
  // a report the server will never accept (invalid data) is dropped; rate limit / network errors are retried later
  return !!res && res.status >= 400 && res.status < 500 && ![401, 403].includes(res.status) && !/too many/.test(JSON.stringify(res.data));
}

// Try to deliver everything waiting in the outbox (called after each report and on startup).
export async function flushOutbox() {
  const list = readOutbox();
  if (!list.length) return 0;
  const left = [];
  for (const r of list) if (!(await send(r))) left.push(r);
  writeOutbox(left);
  return list.length - left.length;
}

// ctx: { name, school, grade, section, phase, zone, x, z, lastQ } — filled in by the game.
// clean: the game's bad-word filter.
export async function openFeedback(ctx, clean = (s) => s) {
  const q = ctx.lastQ;
  const qBox = q ? `<p class="meta">Câu vừa gặp (${esc(q.title)}): <i>${esc(q.q)}</i><br>Đáp án game cho là đúng: <b>${esc(q.answer)}</b></p>` : '';
  const kind = await ask('📮 Hộp thư góp ý', `<p>Bạn muốn báo điều gì? Game tự ghi kèm lớp, vị trí và câu hỏi vừa gặp để sửa nhanh hơn.</p>${qBox}`, [
    ...Object.entries(KINDS).map(([value, label]) => ({ label, value })),
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (!kind) return false;
  const hint = { question: 'Ví dụ: đáp án đúng phải là …, vì …', stuck: 'Ví dụ: đứng sau căng tin thì không đi ra được', bug: 'Chuyện gì xảy ra? Bạn đang làm gì lúc đó?', idea: 'Bạn muốn game có thêm gì?' }[kind];
  const go = await ask(KINDS[kind], `<p>Viết ngắn gọn (không ghi số điện thoại, địa chỉ, mật khẩu):</p>
    <textarea id="fbText" maxlength="500" rows="4" placeholder="${esc(hint)}"></textarea>
    <p class="meta">Gửi kèm: lớp ${esc(ctx.grade)}A${esc(ctx.section)} · ${esc(ctx.zone)} · vị trí (${ctx.x}, ${ctx.z})${kind === 'question' && q ? ' · câu hỏi vừa gặp' : ''}</p>`, [
    { label: '📮 Gửi', value: true },
    { label: 'Huỷ', value: false, cls: 'ghost' },
  ]);
  const text = clean((document.getElementById('fbText')?.value || '').trim()).slice(0, 500);
  if (!go) return false;
  if (!text && kind !== 'stuck') { toast('Bạn chưa viết nội dung góp ý.'); return false; }
  const report = {
    kind, text, version: GAME_VERSION, created_at: new Date().toISOString(),
    school: ctx.school, grade: ctx.grade, section: ctx.section, phase: ctx.phase, zone: ctx.zone, x: ctx.x, z: ctx.z,
    question: kind === 'question' && q ? { subject: q.title, q: q.q, options: q.options, answer: q.answer } : null,
  };
  writeOutbox([...readOutbox(), report]);
  const sent = await flushOutbox();
  toast(sent ? '📮 Đã gửi góp ý. Cảm ơn bạn!' : `📮 Đã lưu góp ý (${pendingCount()} đang chờ gửi khi có máy chủ). Cảm ơn bạn!`, 3200);
  return true;
}
