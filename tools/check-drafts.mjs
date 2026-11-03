// Validate draft question sheets (e.g. questions/drafts/*.csv, segment A7) BEFORE sending them to teachers.
//
//   node tools/check-drafts.mjs <file.csv> [more.csv ...] [--source js/subjects.js]
//
// Same rules as the import tool: 4 non-empty distinct options, grade 6–9, known subject; plus no duplicate question
// against the current BANK or inside the files. Rows on an existing BANK ID (fix proposals) are checked with their
// "Sửa …" columns applied. Prints a subject × grade count table. Exit code 1 when something is wrong.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  COLUMNS, SUBJECTS_FILE, fold, cleanText, unprotectExcel, parseCsv, readSubjectsSource, loadSubjectsModule,
  validateQuestion, parseArgs, isMain,
} from './questions-lib.mjs';

const GRADES = [6, 7, 8, 9];

export async function checkDrafts({ files, source = SUBJECTS_FILE, quiet = false }) {
  const { SUBJECTS, __BANK: BANK } = await loadSubjectsModule(readSubjectsSource(source));
  const nameToId = new Map(SUBJECTS.map((s) => [fold(s.name), s.id]));
  SUBJECTS.forEach((s) => nameToId.set(fold(s.id), s.id));
  const bankQ = new Map(); // folded question -> BANK id
  for (const [subj, list] of Object.entries(BANK)) list.forEach((it, i) => bankQ.set(fold(it.q), `${subj}-${String(i + 1).padStart(3, '0')}`));

  const errors = [];
  const warnings = [];
  const seen = new Map(); // folded question -> label
  const counts = {}; // subj -> { g: n }
  let total = 0;
  let fixes = 0;

  for (const file of files) {
    const buf = readFileSync(file);
    const text = buf.toString('utf8');
    if (!(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf)) warnings.push(`${path.basename(file)}: không có BOM UTF-8 (Excel có thể hiện sai dấu)`);
    if (/[^\r]\n/.test(text)) warnings.push(`${path.basename(file)}: có dòng kết thúc bằng LF, nên dùng CRLF như file xuất`);
    const { rows } = parseCsv(text);
    const header = rows[0] || [];
    if (header.length !== COLUMNS.length || header.some((h, i) => h !== COLUMNS[i].title)) {
      errors.push(`${path.basename(file)}: dòng tiêu đề khác định dạng của export-questions.mjs`);
      continue;
    }
    const at = (r, key) => cleanText(unprotectExcel(r[COLUMNS.findIndex((c) => c.key === key)] ?? ''));
    for (let n = 1; n < rows.length; n++) {
      const r = rows[n];
      const id = at(r, 'id');
      const label = `${path.basename(file)} ${id || '(không ID)'} [dòng ${n + 1}]`;
      const subj = nameToId.get(fold(at(r, 'subject')));
      if (!subj) { errors.push(`${label}: môn "${at(r, 'subject')}" không có trong SUBJECTS`); continue; }
      if (subj === 'toan' || subj === 'anh' || !BANK[subj]) { errors.push(`${label}: môn ${subj} không có ngân hàng câu`); continue; }
      if (!/^ai\b/.test(fold(at(r, 'source')))) warnings.push(`${label}: Nguồn "${at(r, 'source')}" không bắt đầu bằng "AI" — cổng duyệt sẽ không chặn dòng này`);
      if (at(r, 'review')) warnings.push(`${label}: cột Duyệt đã có "${at(r, 'review')}" — bản nháp gửi giáo viên nên để trống`);
      const gRaw = at(r, 'grade');
      const g = /^\d+$/.test(gRaw) ? Number(gRaw) : NaN;
      const edit = (k, v) => at(r, k) || v;
      const item = { q: edit('eq', at(r, 'q')), a: ['a0', 'a1', 'a2', 'a3'].map((k, i) => edit('ea' + i, at(r, k))), g };
      const errs = validateQuestion(item);
      if (!gRaw) errs.push('thiếu lớp tối thiểu');
      if (errs.length) { errors.push(`${label}: "${item.q}" — ${errs.join('; ')}`); continue; }

      const m = /^(.+)-(\d+)$/.exec(id);
      const isFix = m && BANK[m[1]] && !/-(?:ai|moi)-\d+$/.test(id);
      const k = fold(item.q);
      if (isFix) {
        const orig = BANK[m[1]][Number(m[2]) - 1];
        if (!orig) { errors.push(`${label}: ID sửa không khớp câu nào trong BANK`); continue; }
        if (fold(at(r, 'q')) !== fold(orig.q)) warnings.push(`${label}: cột "Câu hỏi" khác BANK hiện tại`);
        if (!['eq', 'ea0', 'ea1', 'ea2', 'ea3'].some((c) => at(r, c))) warnings.push(`${label}: dòng đề xuất sửa nhưng không có cột "Sửa …" nào`);
        if (bankQ.has(k) && bankQ.get(k) !== id) errors.push(`${label}: câu sửa trùng ${bankQ.get(k)}`);
        fixes++;
        continue;
      }
      if (bankQ.has(k)) { errors.push(`${label}: trùng câu trong BANK ${bankQ.get(k)}: "${item.q}"`); continue; }
      if (seen.has(k)) { errors.push(`${label}: trùng câu ${seen.get(k)}: "${item.q}"`); continue; }
      seen.set(k, label);
      const words = (s) => ` ${fold(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
      const plain = !/[=<>]/.test(item.a[0]) && words(item.a[0]).trim().length >= 2; // skip formulas / symbols
      if (plain && item.a.slice(1).some((x) => words(x).includes(words(item.a[0])))) {
        warnings.push(`${label}: một đáp án sai chứa nguyên đáp án đúng — xem lại cho chắc chỉ có một đáp án đúng`);
      }
      (counts[subj] ||= {})[g] = (counts[subj][g] || 0) + 1;
      total++;
    }
  }

  if (!quiet) {
    console.log(`Kiểm tra: ${files.map((f) => path.basename(f)).join(', ')}`);
    console.log('\nCâu mới theo môn × lớp tối thiểu (cộng dồn = số câu dùng được ở lớp đó, tính cả BANK hiện tại):');
    console.log('Môn'.padEnd(14) + GRADES.map((g) => `g${g}`.padStart(6)).join('') + '  tổng' + GRADES.map((g) => `  ≤${g}`.padStart(7)).join(''));
    for (const subj of Object.keys(counts)) {
      const c = counts[subj];
      const bank = BANK[subj];
      const cum = GRADES.map((g) => bank.filter((it) => (it.g || 6) <= g).length + GRADES.filter((x) => x <= g).reduce((a, x) => a + (c[x] || 0), 0));
      const sum = GRADES.reduce((a, g) => a + (c[g] || 0), 0);
      console.log(subj.padEnd(14) + GRADES.map((g) => String(c[g] || 0).padStart(6)).join('') + String(sum).padStart(6) + cum.map((n) => String(n).padStart(7)).join(''));
    }
    console.log(`\nTổng câu mới: ${total} · dòng đề xuất sửa: ${fixes} · lỗi: ${errors.length} · cảnh báo: ${warnings.length}`);
    if (errors.length) { console.log('\nLỖI:'); errors.forEach((e) => console.log('  - ' + e)); }
    if (warnings.length) { console.log('\nCảnh báo:'); warnings.forEach((w) => console.log('  - ' + w)); }
  }
  return { errors, warnings, counts, total, fixes };
}

if (isMain(import.meta.url)) {
  const { opts, pos } = parseArgs(process.argv.slice(2));
  if (opts.help || !pos.length) {
    console.log('Cách dùng: node tools/check-drafts.mjs <file.csv> [file2.csv ...] [--source js/subjects.js]');
    process.exit(opts.help ? 0 : 1);
  }
  const { errors } = await checkDrafts({
    files: pos.map((p) => path.resolve(p)),
    source: opts.source ? path.resolve(opts.source) : SUBJECTS_FILE,
  });
  process.exitCode = errors.length ? 1 : 0;
}
