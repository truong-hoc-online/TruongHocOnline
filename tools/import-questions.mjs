// Import a teacher-reviewed CSV back into the BANK of js/subjects.js (segment Q2).
//
//   node tools/import-questions.mjs <reviewed.csv> [--write] [--target js/subjects.js]
//
// Without --write: dry run, prints the report only. With --write: rewrites ONLY the `const BANK = { ... }` literal
// of the target file; everything else in the file is kept byte for byte.
//
// Review marks (column "Duyệt", case/diacritics ignored):
//   Đ / Đúng / OK      keep (edits typed into the "Sửa ..." columns are still applied)
//   Sửa                replace with the non-empty "Sửa ..." columns
//   Xoá / Xóa          remove the question
//   S / Sai / (empty)  keep unchanged, listed in the report as "chưa duyệt / sai cần xem"
// Rows with Nguồn = "Mới" and some content are added (unless marked Xoá). Generated samples are never imported.
//
// SAFETY GATE for AI-drafted content (child-safety rule: AI content must be reviewed by a person first):
// rows whose Nguồn starts with "AI" (e.g. "AI soạn — chờ duyệt", "AI đề xuất sửa — chờ duyệt") or whose ID looks
// like `<subject>-ai-<n>` are applied ONLY when Duyệt is Đ or Sửa. Anything else (empty, S, unknown mark) is skipped
// and listed as "AI chưa duyệt". A new AI question marked Xoá is dropped; an AI fix proposal on an existing BANK
// row marked Xoá removes that question, exactly like a normal row.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  COLUMNS, SOURCE_SAMPLE, SOURCE_NEW, SUBJECTS_FILE, fold, cleanText, unprotectExcel, parseCsv,
  locateBank, bankComments, bankLiteral, canonicalBank, loadSubjectsModule, validateQuestion, parseArgs, isMain,
} from './questions-lib.mjs';

const MARKS = {
  keep: ['d', 'dung', 'ok', 'x', 'v', 'duyet', 'dat', 'giu'],
  wrong: ['s', 'sai', '?', 'xem lai', 'can xem'],
  edit: ['sua', 'sua lai', 'edit'],
  remove: ['xoa', 'xoa bo', 'bo', 'loai', 'delete'],
};

function markOf(raw) {
  const k = fold(raw).replace(/[.!]+$/, '');
  if (!k) return 'empty';
  for (const [m, list] of Object.entries(MARKS)) if (list.includes(k)) return m;
  return 'unknown';
}

function decodeCsvBuffer(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    throw new Error('File CSV không phải UTF-8. Trong Excel hãy lưu bằng "CSV UTF-8 (Comma delimited) (*.csv)"; trong Google Sheets: Tệp → Tải xuống → CSV.');
  }
}

// Map header titles (any order, diacritics-insensitive) to column keys.
function headerMap(header) {
  const byTitle = new Map(COLUMNS.map((c) => [fold(c.title), c.key]));
  const map = {};
  header.forEach((h, i) => {
    const key = byTitle.get(fold(h));
    if (key && map[key] === undefined) map[key] = i;
  });
  const missing = ['id', 'q', 'a0', 'a1', 'a2', 'a3', 'review'].filter((k) => map[k] === undefined);
  if (missing.length) {
    const titles = missing.map((k) => COLUMNS.find((c) => c.key === k).title);
    throw new Error(`CSV thiếu cột: ${titles.join(', ')}. Đừng xoá/đổi tên dòng tiêu đề.`);
  }
  return map;
}

function parseGrade(raw) {
  const s = cleanText(unprotectExcel(raw ?? ''));
  if (!s) return { g: 6, given: false };
  const m = /^(?:lop\s*)?(\d+)$/.exec(fold(s));
  return { g: m ? Number(m[1]) : NaN, given: true, raw: s };
}

// AI-drafted row: Nguồn starts with "AI" (any case) or the ID has the `-ai-<n>` form.
export function isAiRow(source, id) {
  return /^ai\b/.test(fold(source)) || /-ai-\d+$/i.test(String(id ?? '').trim());
}

const same = (x, y) => canonicalBank({ k: [x] }) === canonicalBank({ k: [y] });

export async function importQuestions({ csvFile, target = SUBJECTS_FILE, write = false, quiet = false }) {
  const src = readFileSync(target, 'utf8');
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const mod = await loadSubjectsModule(src);
  const { SUBJECTS, __BANK: BANK } = mod;
  const nameToId = new Map(SUBJECTS.map((s) => [fold(s.name), s.id]));
  SUBJECTS.forEach((s) => nameToId.set(fold(s.id), s.id));

  const { rows, delim } = parseCsv(decodeCsvBuffer(readFileSync(csvFile)));
  if (!rows.length) throw new Error('CSV rỗng');
  const hm = headerMap(rows[0]);
  const cell = (r, key) => (hm[key] === undefined ? '' : unprotectExcel(r[hm[key]] ?? ''));

  const report = { kept: [], edited: [], removed: [], added: [], pending: [], aiSkipped: [], invalid: [], samples: [], notes: [], warnings: [] };
  // Result: per subject, the list of original entries (by index) with their decision, plus new ones.
  const decisions = new Map(); // id -> { action, item }
  const additions = {}; // subjectId -> [item]
  const seenIds = new Set();

  for (let n = 1; n < rows.length; n++) {
    const r = rows[n];
    const line = n + 1;
    const id = cleanText(cell(r, 'id'));
    const source = cleanText(cell(r, 'source'));
    const mark = markOf(cell(r, 'review'));
    const note = cleanText(cell(r, 'note'));
    const label = `${id || '(không ID)'} [dòng ${line}]`;

    const edits = ['eq', 'ea0', 'ea1', 'ea2', 'ea3'].map((k) => cleanText(cell(r, k)));
    const base = {
      q: cleanText(cell(r, 'q')),
      a: ['a0', 'a1', 'a2', 'a3'].map((k) => cleanText(cell(r, k))),
    };
    const grade = parseGrade(cell(r, 'grade'));

    // Generated samples: never imported, but keep the teacher's feedback visible.
    if (fold(source) === fold(SOURCE_SAMPLE) || /-mau-\d/.test(id)) {
      if (mark !== 'empty' || note || edits.some(Boolean)) {
        report.samples.push(`${label}: Duyệt="${cleanText(cell(r, 'review'))}"${note ? `, ghi chú: ${note}` : ''}${edits.some(Boolean) ? ', có sửa (không nhập được — báo người làm bộ sinh câu)' : ''}`);
      }
      continue;
    }
    if (!id && !base.q && !edits.some(Boolean)) continue;
    if (id && seenIds.has(id)) { report.warnings.push(`${label}: ID lặp lại, bỏ qua dòng này`); continue; }
    if (id) seenIds.add(id);
    if (mark === 'unknown') report.warnings.push(`${label}: không hiểu dấu duyệt "${cleanText(cell(r, 'review'))}" — coi như chưa duyệt`);

    const applyEdits = (item) => ({
      q: edits[0] || item.q,
      a: item.a.map((x, i) => edits[i + 1] || x),
      g: grade.g,
    });

    const isAI = isAiRow(source, id);
    const approved = mark === 'keep' || mark === 'edit';

    const isNew = fold(source) === fold(SOURCE_NEW) || /-(?:moi|ai)-\d/.test(id);
    if (isNew) {
      const item = applyEdits(base);
      if (!item.q && !item.a.some(Boolean)) continue; // still blank
      if (mark === 'remove') { report.notes.push(`${label}: dòng mới bị đánh Xoá — bỏ qua`); continue; }
      if (isAI && !approved) {
        report.aiSkipped.push(`${label}: câu AI soạn chưa duyệt (Duyệt="${cleanText(cell(r, 'review'))}") — KHÔNG nhập: ${item.q}`);
        continue;
      }
      const subj = nameToId.get(fold(cell(r, 'subject'))) || nameToId.get(fold(id.replace(/-(?:moi|ai)-\d+$/, '')));
      if (!subj) { report.invalid.push(`${label}: không xác định được môn "${cleanText(cell(r, 'subject'))}"`); continue; }
      if (subj === 'toan' || (subj === 'anh' && !BANK.anh)) {
        report.invalid.push(`${label}: môn ${subj} sinh câu tự động, chưa có ngân hàng để thêm — chuyển cho người lập trình: "${item.q}"`);
        continue;
      }
      if (!BANK[subj]) { report.invalid.push(`${label}: môn "${subj}" không có ngân hàng câu hỏi`); continue; }
      const errs = validateQuestion(item);
      if (grade.given && Number.isNaN(grade.g)) errs.push(`lớp tối thiểu "${grade.raw}" không phải số`);
      if (errs.length) { report.invalid.push(`${label}: câu mới "${item.q}" — ${errs.join('; ')} → KHÔNG thêm`); continue; }
      const known = [...(BANK[subj] || []), ...(additions[subj] || [])];
      if (known.some((x) => fold(x.q) === fold(item.q))) {
        report.invalid.push(`${label}: câu mới "${item.q}" trùng câu đã có trong môn ${subj} → KHÔNG thêm`);
        continue;
      }
      (additions[subj] ||= []).push(item);
      report.added.push(`${label}: ${item.q}${isAI ? ' (AI soạn, đã duyệt)' : ''}`);
      if (mark === 'wrong' || mark === 'empty') report.pending.push(`${label}: câu mới chưa có dấu Đ — vẫn thêm, nên xem lại`);
      continue;
    }

    const m = /^(.+)-(\d+)$/.exec(id);
    const subj = m && BANK[m[1]] ? m[1] : null;
    const orig = subj ? BANK[subj][Number(m[2]) - 1] : null;
    if (!orig) { report.warnings.push(`${label}: ID không khớp câu nào trong BANK — bỏ qua`); continue; }
    if (base.q && fold(base.q) !== fold(orig.q) && !edits[0]) {
      report.warnings.push(`${label}: cột "Câu hỏi" khác ngân hàng hiện tại — có thể file xuất từ bản cũ. Dùng nội dung trong CSV.`);
    }

    if (mark === 'remove') { decisions.set(id, { action: 'remove' }); report.removed.push(`${id}: ${orig.q}`); continue; }
    if (isAI && !approved) {
      decisions.set(id, { action: 'keep', item: orig });
      report.aiSkipped.push(`${id}: đề xuất sửa của AI chưa duyệt (Duyệt="${cleanText(cell(r, 'review'))}") — giữ câu cũ`);
      continue;
    }

    // Teachers sometimes type the fix straight into the original columns: honour that too.
    const fromRow = { q: base.q || orig.q, a: base.a.map((x, i) => x || orig.a[i]) };
    const item = applyEdits(fromRow);
    if (grade.given && Number.isNaN(grade.g)) {
      report.invalid.push(`${id}: lớp tối thiểu "${grade.raw}" không phải số → giữ câu cũ`);
      decisions.set(id, { action: 'keep', item: orig });
      continue;
    }
    const errs = validateQuestion(item);
    if (errs.length) {
      report.invalid.push(`${id}: "${item.q}" — ${errs.join('; ')} → giữ câu cũ`);
      decisions.set(id, { action: 'keep', item: orig });
      continue;
    }
    const changed = !same(item, orig);
    if (mark === 'edit' && !changed) report.warnings.push(`${id}: đánh "Sửa" nhưng không có nội dung sửa — giữ nguyên`);
    if (mark === 'wrong' || mark === 'empty' || mark === 'unknown') {
      report.pending.push(`${id}: ${mark === 'wrong' ? 'đánh SAI cần xem' : 'chưa duyệt'} — ${orig.q}${note ? ` (ghi chú: ${note})` : ''}`);
    }
    if (changed) {
      decisions.set(id, { action: 'edit', item });
      report.edited.push(`${id}: "${orig.q}" → "${item.q}" | ${item.a.join(' / ')}${item.g !== (orig.g || 6) ? ` | lớp ${orig.g || 6}→${item.g}` : ''}`);
    } else {
      decisions.set(id, { action: 'keep', item: orig });
      report.kept.push(id);
    }
    if (note && mark !== 'wrong' && mark !== 'empty') report.notes.push(`${id}: ${note}`);
  }

  // Build the new BANK in the original subject order; questions missing from the CSV are kept.
  const newBank = {};
  const missing = [];
  for (const [subj, list] of Object.entries(BANK)) {
    newBank[subj] = [];
    list.forEach((orig, idx) => {
      const id = `${subj}-${String(idx + 1).padStart(3, '0')}`;
      const d = decisions.get(id);
      if (!d) { missing.push(id); newBank[subj].push(orig); return; }
      if (d.action !== 'remove') newBank[subj].push(d.item);
    });
    newBank[subj].push(...(additions[subj] || []));
  }
  // A partial file (e.g. only new AI drafts or a few fixes) leaves most of the BANK out: one line, not 100.
  if (missing.length > 10) report.warnings.push(`${missing.length} câu của BANK không có trong CSV — giữ nguyên (${missing.slice(0, 3).join(', ')}, …)`);
  else missing.forEach((id) => report.warnings.push(`${id}: không có trong CSV — giữ nguyên`));

  // Duplicate questions inside a subject and empty pools would break the game.
  const blockers = [];
  for (const [subj, list] of Object.entries(newBank)) {
    const seen = new Set();
    for (const it of list) {
      const k = fold(it.q);
      if (seen.has(k)) report.warnings.push(`${subj}: câu hỏi trùng "${it.q}"`);
      seen.add(k);
    }
    for (const g of [6, 7, 8, 9]) {
      const n = list.filter((it) => (it.g || 6) <= g).length;
      if (n === 0) blockers.push(`môn ${subj} không còn câu nào cho lớp ${g} (game sẽ lỗi)`);
      else if (n < 5) report.warnings.push(`môn ${subj} lớp ${g} chỉ có ${n} câu (cần 5 câu đúng để qua môn — sẽ lặp câu)`);
    }
  }

  const [start, end] = locateBank(src);
  const comments = bankComments(src.slice(start, end));
  const newSrc = src.slice(0, start) + bankLiteral(newBank, comments, eol) + src.slice(end);

  // Self-check: the rewritten file must load and contain exactly the new bank.
  const check = await loadSubjectsModule(newSrc);
  if (canonicalBank(check.__BANK) !== canonicalBank(newBank)) blockers.push('lỗi nội bộ: file sinh ra không khớp dữ liệu');

  const unchanged = newSrc === src;
  if (!quiet) printReport(report, { csvFile, target, delim, write, blockers, unchanged });
  if (write && !blockers.length && !unchanged) writeFileSync(target, newSrc, 'utf8');
  return { report, newBank, newSrc, blockers, unchanged, written: write && !blockers.length && !unchanged };
}

function printReport(r, { csvFile, target, delim, write, blockers, unchanged }) {
  const sec = (title, list, max = Infinity) => {
    if (!list.length) return;
    console.log(`\n${title} (${list.length}):`);
    list.slice(0, max).forEach((x) => console.log('  - ' + x));
    if (list.length > max) console.log(`  … và ${list.length - max} dòng nữa`);
  };
  console.log(`Đọc: ${csvFile} (phân cách "${delim === '\t' ? 'tab' : delim}")`);
  console.log(`Đích: ${target}`);
  console.log(`\nGiữ: ${r.kept.length} · Sửa: ${r.edited.length} · Xoá: ${r.removed.length} · Thêm: ${r.added.length} · Không hợp lệ: ${r.invalid.length} · Chưa duyệt / sai cần xem: ${r.pending.length} · AI chưa duyệt (không nhập): ${r.aiSkipped.length}`);
  sec('Đã sửa', r.edited);
  sec('Đã xoá', r.removed);
  sec('Thêm mới', r.added);
  sec('Không hợp lệ (không áp dụng)', r.invalid);
  sec('Chưa duyệt / sai cần xem', r.pending, 40);
  sec('AI chưa duyệt — không nhập (cần giáo viên ghi Đ hoặc Sửa)', r.aiSkipped, 40);
  sec('Góp ý cho câu tự sinh (Toán/Anh)', r.samples);
  sec('Ghi chú của giáo viên', r.notes);
  sec('Cảnh báo', r.warnings, 60);
  if (blockers.length) {
    sec('LỖI — không ghi file', blockers);
    process.exitCode = 1;
  } else if (unchanged) console.log('\nKhông có thay đổi nào cho BANK.');
  else if (write) console.log(`\nĐã ghi BANK mới vào ${target}. Chạy lại fuzz câu hỏi trước khi commit.`);
  else console.log('\nChạy thử (dry run) — chưa ghi gì. Thêm --write để ghi vào file.');
}

if (isMain(import.meta.url)) {
  const { opts, pos } = parseArgs(process.argv.slice(2));
  if (opts.help || !pos[0]) {
    console.log('Cách dùng: node tools/import-questions.mjs <file-da-duyet.csv> [--write] [--target js/subjects.js]');
    process.exit(opts.help ? 0 : 1);
  }
  try {
    await importQuestions({
      csvFile: path.resolve(pos[0]),
      target: opts.target ? path.resolve(opts.target) : SUBJECTS_FILE,
      write: !!opts.write,
    });
  } catch (e) {
    console.error('Lỗi: ' + e.message);
    process.exitCode = 1;
  }
}
