// Export the question bank of js/subjects.js to a CSV sheet for teacher review (segment A1).
//
//   node tools/export-questions.mjs [out.csv] [--source js/subjects.js] [--delimiter ;] [--samples 10] [--blank 3]
//
// Default output: tools/out/questions-review.csv (+ tools/out/HUONG-DAN-DUYET.md next to it).
// UTF-8 with BOM, RFC 4180 quoting, CRLF line endings.

import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  COLUMNS, SOURCE_BANK, SOURCE_SAMPLE, SOURCE_NEW, TOOLS_DIR, SUBJECTS_FILE,
  readSubjectsSource, loadSubjectsModule, validateQuestion, protectForExcel, toCsv, withSeededRandom, parseArgs, fold, isMain,
} from './questions-lib.mjs';

const GENERATED = ['toan', 'anh'];
const GRADES = [6, 7, 8, 9];

export async function exportQuestions({ out, source = SUBJECTS_FILE, delimiter = ',', samples = 10, blank = 3, quiet = false } = {}) {
  out = path.resolve(out || path.join(TOOLS_DIR, 'out', 'questions-review.csv'));
  const mod = await loadSubjectsModule(readSubjectsSource(source));
  const { SUBJECTS, __BANK: BANK, makeQuestion } = mod;
  const nameOf = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.name]));
  const pad = (n) => String(n).padStart(3, '0');

  const header = COLUMNS.map((c) => c.title);
  const rows = [header];
  const summary = [];
  const warnings = [];
  const seenQ = new Map();

  const row = (o) => COLUMNS.map((c) => (['q', 'a0', 'a1', 'a2', 'a3'].includes(c.key) ? protectForExcel(o[c.key]) : (o[c.key] ?? '')));

  for (const s of SUBJECTS) {
    let bankCount = 0;
    let sampleCount = 0;
    if (GENERATED.includes(s.id)) {
      // A few generated questions per grade, shown as samples only (the generator cannot be edited from the sheet).
      GRADES.forEach((g) => {
        const got = new Map();
        withSeededRandom(1000 * g + s.id.length, () => {
          for (let tries = 0; got.size < samples && tries < samples * 30; tries++) {
            const x = makeQuestion(s.id, g);
            if (!got.has(x.q)) got.set(x.q, [x.answer, ...x.options.filter((o) => o !== x.answer)]);
          }
        });
        let i = 0;
        for (const [q, a] of got) {
          i++;
          rows.push(row({
            id: `${s.id}-mau-${g}-${String(i).padStart(2, '0')}`, subject: s.name, grade: g, q,
            a0: a[0], a1: a[1], a2: a[2], a3: a[3], source: SOURCE_SAMPLE,
            note: i === 1 ? 'Câu tự sinh, chỉ để xem mẫu — sửa ở đây không được nhập lại; ghi góp ý vào Ghi chú.' : '',
          }));
          const errs = validateQuestion({ q, a, g });
          if (errs.length) warnings.push(`${s.id} mẫu lớp ${g}: "${q}" — ${errs.join('; ')}`);
          sampleCount++;
        }
      });
    }
    const list = BANK[s.id] || [];
    list.forEach((it, idx) => {
      const id = `${s.id}-${pad(idx + 1)}`;
      rows.push(row({
        id, subject: s.name, grade: it.g || 6, q: it.q,
        a0: it.a[0], a1: it.a[1], a2: it.a[2], a3: it.a[3], source: SOURCE_BANK,
      }));
      const errs = validateQuestion(it);
      if (errs.length) warnings.push(`${id}: "${it.q}" — ${errs.join('; ')}`);
      const k = fold(it.q);
      if (seenQ.has(k)) warnings.push(`${id}: câu hỏi trùng với ${seenQ.get(k)}`);
      else seenQ.set(k, id);
      bankCount++;
    });
    // Blank rows for teachers to propose new questions (also for generated subjects: Anh grammar / Toán ideas).
    for (let i = 1; i <= blank; i++) {
      rows.push(row({
        id: `${s.id}-moi-${String(i).padStart(2, '0')}`, subject: s.name, grade: '', source: SOURCE_NEW,
        note: i === 1 ? 'Dòng trống để thêm câu mới: ghi Câu hỏi + Đáp án đúng + 3 đáp án sai + Lớp tối thiểu.' : '',
      }));
    }
    summary.push({ id: s.id, name: s.name, bank: bankCount, samples: sampleCount, blank });
  }
  for (const id of Object.keys(BANK)) {
    if (!SUBJECTS.some((s) => s.id === id)) warnings.push(`BANK có môn "${id}" không nằm trong SUBJECTS — không xuất`);
  }

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, toCsv(rows, delimiter), 'utf8');
  const guideSrc = path.join(TOOLS_DIR, 'HUONG-DAN-DUYET.md');
  const guideOut = path.join(path.dirname(out), 'HUONG-DAN-DUYET.md');
  if (existsSync(guideSrc) && path.resolve(guideSrc) !== path.resolve(guideOut)) copyFileSync(guideSrc, guideOut);

  if (!quiet) {
    console.log(`Đã xuất: ${out}`);
    console.log('');
    console.log('Môn'.padEnd(42) + 'Ngân hàng  Mẫu tự sinh  Dòng mới');
    for (const s of summary) {
      console.log(`${(s.name + ` (${s.id})`).padEnd(42)}${String(s.bank).padStart(9)}${String(s.samples).padStart(13)}${String(s.blank).padStart(10)}`);
    }
    const t = summary.reduce((a, s) => ({ bank: a.bank + s.bank, samples: a.samples + s.samples, blank: a.blank + s.blank }), { bank: 0, samples: 0, blank: 0 });
    console.log(`${'TỔNG'.padEnd(42)}${String(t.bank).padStart(9)}${String(t.samples).padStart(13)}${String(t.blank).padStart(10)}`);
    if (warnings.length) {
      console.log('\nCảnh báo dữ liệu:');
      for (const w of warnings) console.log('  - ' + w);
    } else console.log('\nKhông thấy lỗi dữ liệu (4 đáp án khác nhau, lớp 6–9, không trùng câu hỏi).');
  }
  return { out, summary, warnings };
}

if (isMain(import.meta.url)) {
  const { opts, pos } = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log('Cách dùng: node tools/export-questions.mjs [out.csv] [--source js/subjects.js] [--delimiter ;] [--samples 10] [--blank 3]');
    process.exit(0);
  }
  await exportQuestions({
    out: pos[0],
    source: opts.source ? path.resolve(opts.source) : SUBJECTS_FILE,
    delimiter: opts.delimiter === 'tab' ? '\t' : (opts.delimiter || ','),
    samples: opts.samples ? Number(opts.samples) : 10,
    blank: opts.blank ? Number(opts.blank) : 3,
  });
}
