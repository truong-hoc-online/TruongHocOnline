// Round-trip test for the question tools. Never touches the real js/subjects.js: works on temp copies.
//
//   node tools/test-roundtrip.mjs
//
// 1. export → import the unchanged CSV with --write into a temp copy → BANK semantically identical (and the file
//    byte-identical).
// 2. Same CSV re-saved with ";" (Vietnamese-locale Excel) → no change.
// 3. Simulated review (Đ, Sửa, Xoá, S, Mới, invalid edit, grade change) → expected counts and resulting BANK.

import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLS_DIR, SUBJECTS_FILE, COLUMNS, parseCsv, toCsv, loadSubjectsModule, canonicalBank } from './questions-lib.mjs';

const dir = mkdtempSync(path.join(tmpdir(), 'tho-questions-'));
let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) { pass++; console.log('  ĐẠT  ' + msg); } else { fail++; console.log('  LỖI  ' + msg); }
};
const run = (script, args) => {
  const r = spawnSync(process.execPath, [path.join(TOOLS_DIR, script), ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const bankOf = async (file) => (await loadSubjectsModule(readFileSync(file, 'utf8'))).__BANK;
const col = (key) => COLUMNS.findIndex((c) => c.key === key);

try {
  const original = readFileSync(SUBJECTS_FILE, 'utf8');
  const origBank = await bankOf(SUBJECTS_FILE);
  const csv = path.join(dir, 'review.csv');

  console.log('1. Xuất → nhập lại không đổi');
  let r = run('export-questions.mjs', [csv]);
  ok(r.code === 0, 'export chạy được');
  const raw = readFileSync(csv);
  ok(raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf, 'CSV có BOM UTF-8');
  ok(raw.toString('utf8').includes('\r\n') && !/[^\r]\n/.test(raw.toString('utf8')), 'CSV dùng CRLF');
  const copy1 = path.join(dir, 'subjects-1.js');
  copyFileSync(SUBJECTS_FILE, copy1);
  r = run('import-questions.mjs', [csv, '--write', '--target', copy1]);
  ok(r.code === 0, 'import --write chạy được');
  ok(canonicalBank(await bankOf(copy1)) === canonicalBank(origBank), 'BANK giống hệt về nội dung (import cả hai mô-đun)');
  ok(readFileSync(copy1, 'utf8') === original, 'file giống hệt từng byte');
  ok(/Giữ: 97 · Sửa: 0 · Xoá: 0 · Thêm: 0 · Không hợp lệ: 0/.test(r.out), 'báo cáo: giữ 97, không sửa/xoá/thêm');

  console.log('2. CSV phân cách bằng ";" (Excel tiếng Việt)');
  const { rows } = parseCsv(raw.toString('utf8'));
  const semi = path.join(dir, 'review-semicolon.csv');
  writeFileSync(semi, toCsv(rows, ';'));
  const copy2 = path.join(dir, 'subjects-2.js');
  copyFileSync(SUBJECTS_FILE, copy2);
  r = run('import-questions.mjs', [semi, '--write', '--target', copy2]);
  ok(r.code === 0 && readFileSync(copy2, 'utf8') === original, 'đọc đúng file ";" — không thay đổi gì');

  console.log('3. Mô phỏng giáo viên duyệt');
  const find = (id) => rows.find((x) => x[0] === id);
  const set = (id, key, v) => { find(id)[col(key)] = v; };
  set('van-001', 'review', 'Đ');
  set('van-002', 'review', 'Sửa');
  set('van-002', 'ea3', 'Nguyễn Bỉnh Khiêm');
  set('van-003', 'review', 'xóa'); // NFC "ó" + lowercase
  set('khtn-001', 'review', 'S');
  set('khtn-001', 'note', 'Nên ghi H2O');
  set('khtn-002', 'review', 'Sửa');
  set('khtn-002', 'ea1', 'Niutơn (N)'); // duplicate of the correct answer → invalid, keep old
  set('gdcd-001', 'grade', '7'); // grade change typed in place
  set('gdcd-001', 'review', 'Đ');
  set('van-moi-01', 'grade', '7');
  set('van-moi-01', 'q', 'Truyện "Bài học đường đời đầu tiên" trích từ tác phẩm nào?');
  ['Dế Mèn phiêu lưu kí', 'Đất rừng phương Nam', 'Tuổi thơ dữ dội', 'Quê nội'].forEach((v, i) => set('van-moi-01', 'a' + i, v));
  set('tin-moi-01', 'q', 'Câu thiếu đáp án');
  set('tin-moi-01', 'a0', 'A');
  set('toan-mau-6-01', 'review', 'S');
  set('toan-mau-6-01', 'note', 'Đáp án sai dấu?');
  const reviewed = path.join(dir, 'reviewed.csv');
  writeFileSync(reviewed, toCsv(rows));
  const copy3 = path.join(dir, 'subjects-3.js');
  copyFileSync(SUBJECTS_FILE, copy3);
  r = run('import-questions.mjs', [reviewed, '--target', copy3]);
  ok(readFileSync(copy3, 'utf8') === original, 'chạy thử (không --write) không ghi file');
  r = run('import-questions.mjs', [reviewed, '--write', '--target', copy3]);
  // 97 = 93 kept + 2 edited + 1 removed + 1 invalid edit (old question kept, counted as invalid).
  ok(/Giữ: 93 · Sửa: 2 · Xoá: 1 · Thêm: 1 · Không hợp lệ: 2/.test(r.out), 'báo cáo: giữ 93, sửa 2, xoá 1, thêm 1, không hợp lệ 2');
  ok(r.out.includes('khtn-001: đánh SAI cần xem'), 'liệt kê câu đánh S');
  ok(r.out.includes('toan-mau-6-01') && r.out.includes('Đáp án sai dấu?'), 'giữ góp ý cho câu tự sinh');
  const b = await bankOf(copy3);
  ok(b.van[1].a[3] === 'Nguyễn Bỉnh Khiêm' && b.van[1].a[0] === 'Hồ Xuân Hương', 'Sửa: thay đúng ô, đáp án đúng vẫn đầu');
  ok(b.van.length === origBank.van.length && !b.van.some((x) => x.q === origBank.van[2].q), 'Xoá: bỏ câu, thêm 1 câu mới cuối môn');
  ok(b.van.at(-1).g === 7 && b.van.at(-1).a[0] === 'Dế Mèn phiêu lưu kí', 'Mới: thêm đúng lớp + đáp án');
  ok(canonicalBank({ x: [b.khtn[1]] }) === canonicalBank({ x: [origBank.khtn[1]] }), 'sửa không hợp lệ → giữ câu cũ');
  ok(b.gdcd[0].g === 7, 'đổi lớp tối thiểu');
  ok(readFileSync(copy3, 'utf8').includes("    // Generic Vietnamese culture"), 'giữ comment trong BANK');
  const after = readFileSync(copy3, 'utf8');
  const [, tail] = original.split(/\nconst EN_WORDS/);
  ok(after.endsWith(tail) && after.startsWith(original.slice(0, original.indexOf('const BANK'))), 'phần ngoài BANK giữ nguyên');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${pass} đạt, ${fail} lỗi`);
process.exitCode = fail ? 1 : 0;
