// Round-trip test for the question tools. Never touches the real js/subjects.js: works on temp copies.
//
//   node tools/test-roundtrip.mjs
//
// 1. export → import the unchanged CSV with --write into a temp copy → BANK semantically identical (and the file
//    byte-identical).
// 2. Same CSV re-saved with ";" (Vietnamese-locale Excel) → no change.
// 3. Simulated review (Đ, Sửa, Xoá, S, Mới, invalid edit, grade change) → expected counts and resulting BANK.
// 4. AI safety gate: rows with Nguồn "AI…" are imported only when marked Đ / Sửa.
// 5. Every CSV in questions/drafts/: nothing imported while unreviewed; all rows valid once marked Đ.

import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
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

  console.log('4. Cổng duyệt câu AI soạn (Nguồn bắt đầu bằng "AI" → chỉ nhập khi Duyệt = Đ / Sửa)');
  const header = COLUMNS.map((c) => c.title);
  const mkRow = (o) => COLUMNS.map((c) => o[c.key] ?? '');
  const AI = 'AI soạn — chờ duyệt';
  const aiRow = (id, review, q, extra = {}) => mkRow({ id, subject: 'Ngữ văn', grade: '7', q, a0: 'Đúng ' + id, a1: 'Sai một', a2: 'Sai hai', a3: 'Sai ba', source: AI, review, ...extra });
  const v = origBank.van;
  const aiRows = [
    header,
    aiRow('van-ai-001', 'Đ', 'Câu AI một đã duyệt?'),
    aiRow('van-ai-002', 'Sửa', 'Câu AI hai cần sửa?', { ea3: 'Sai ba đã sửa' }),
    aiRow('van-ai-003', '', 'Câu AI ba chưa duyệt?'),
    aiRow('van-ai-004', 'S', 'Câu AI bốn bị đánh sai?'),
    aiRow('van-ai-005', 'Xoá', 'Câu AI năm bị xoá?'),
    aiRow('van-ai-006', 'Đ', v[0].q), // duplicate of an existing BANK question → not added
    aiRow('khtn-ai-001', 'ok', 'Câu AI khoa học đã duyệt?', { subject: 'Khoa học tự nhiên', source: 'ai soạn' }),
    aiRow('tin-moi-09', '', 'Dòng "Mới" nhưng Nguồn là AI, chưa duyệt?', { subject: 'Tin học' }),
    // AI fix proposals on existing BANK rows
    mkRow({ id: 'su-dia-012', subject: 'Lịch sử và Địa lý', grade: '6', q: origBank['su-dia'][11].q, a0: origBank['su-dia'][11].a[0], a1: origBank['su-dia'][11].a[1], a2: origBank['su-dia'][11].a[2], a3: origBank['su-dia'][11].a[3], source: 'AI đề xuất sửa — chờ duyệt', review: '', ea2: 'Đà Nẵng' }),
    mkRow({ id: 'van-006', subject: 'Ngữ văn', grade: '6', q: v[5].q, a0: v[5].a[0], a1: v[5].a[1], a2: v[5].a[2], a3: v[5].a[3], source: 'AI đề xuất sửa — chờ duyệt', review: 'Sửa', ea3: 'Thơ bốn chữ' }),
  ];
  const aiCsv = path.join(dir, 'ai.csv');
  writeFileSync(aiCsv, toCsv(aiRows));
  const copy4 = path.join(dir, 'subjects-4.js');
  copyFileSync(SUBJECTS_FILE, copy4);
  r = run('import-questions.mjs', [aiCsv, '--write', '--target', copy4]);
  ok(r.code === 0, 'import file AI chạy được');
  ok(/Giữ: 0 · Sửa: 1 · Xoá: 0 · Thêm: 3 · Không hợp lệ: 1 · Chưa duyệt \/ sai cần xem: 0 · AI chưa duyệt \(không nhập\): 4/.test(r.out),
    'báo cáo: thêm 3 (Đ, Sửa, ok), sửa 1, trùng 1, AI chưa duyệt 4');
  const b4 = await bankOf(copy4);
  const qs = (subj) => b4[subj].map((x) => x.q);
  ok(qs('van').includes('Câu AI một đã duyệt?') && qs('khtn').includes('Câu AI khoa học đã duyệt?'), 'câu AI có Đ / ok được thêm');
  ok(b4.van.find((x) => x.q === 'Câu AI hai cần sửa?')?.a[3] === 'Sai ba đã sửa', 'câu AI có Sửa: áp dụng ô sửa');
  ok(!['Câu AI ba chưa duyệt?', 'Câu AI bốn bị đánh sai?', 'Câu AI năm bị xoá?'].some((q) => qs('van').includes(q)), 'câu AI trống / S / Xoá KHÔNG được thêm');
  ok(!qs('tin').some((q) => q.startsWith('Dòng "Mới"')), 'Nguồn "AI…" chặn cả dòng có ID -moi-');
  ok(qs('van').filter((q) => q === v[0].q).length === 1, 'câu AI trùng BANK không được thêm');
  ok(canonicalBank({ x: [b4['su-dia'][11]] }) === canonicalBank({ x: [origBank['su-dia'][11]] }), 'đề xuất sửa của AI chưa duyệt → giữ câu cũ');
  ok(b4.van[5].a[3] === 'Thơ bốn chữ' && b4.van[5].a[0] === v[5].a[0], 'đề xuất sửa của AI có Sửa → áp dụng');
  ok(r.out.includes('van-ai-003') && r.out.includes('su-dia-012: đề xuất sửa của AI chưa duyệt'), 'liệt kê dòng AI chưa duyệt trong báo cáo');

  // Drafts committed in questions/drafts/: never imported as-is, all valid once a teacher approves them.
  const draftsDir = path.join(TOOLS_DIR, '..', 'questions', 'drafts');
  const drafts = existsSync(draftsDir) ? readdirSync(draftsDir).filter((f) => f.endsWith('.csv')) : [];
  if (drafts.length) console.log('5. Bản nháp trong questions/drafts/');
  for (const f of drafts) {
    const file = path.join(draftsDir, f);
    const copy = path.join(dir, 'subjects-' + f + '.js');
    copyFileSync(SUBJECTS_FILE, copy);
    r = run('import-questions.mjs', [file, '--write', '--target', copy]);
    ok(r.code === 0 && readFileSync(copy, 'utf8') === original && /Sửa: 0 · Xoá: 0 · Thêm: 0 · Không hợp lệ: 0/.test(r.out), `${f}: chưa duyệt → không nhập gì`);
    const { rows: dr } = parseCsv(readFileSync(file, 'utf8'));
    dr.slice(1).forEach((x) => { x[col('review')] = 'Đ'; });
    const approved = path.join(dir, 'approved-' + f);
    writeFileSync(approved, toCsv(dr));
    r = run('import-questions.mjs', [approved, '--write', '--target', copy]);
    const n = dr.length - 1;
    const m = /Sửa: (\d+) · Xoá: 0 · Thêm: (\d+) · Không hợp lệ: 0 · Chưa duyệt \/ sai cần xem: 0 · AI chưa duyệt \(không nhập\): 0/.exec(r.out);
    ok(r.code === 0 && m && Number(m[1]) + Number(m[2]) === n, `${f}: ghi Đ cả ${n} dòng → nhập hết, không dòng nào lỗi`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${pass} đạt, ${fail} lỗi`);
process.exitCode = fail ? 1 : 0;
