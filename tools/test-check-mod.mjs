// Test for tools/check-mod.mjs: the broken sample pack must fail with the expected messages, every pack in mods/
// must pass, and a pack reusing another pack's id must fail.
//
//   node tools/test-check-mod.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOLS, '..');
const CHECK = path.join(TOOLS, 'check-mod.mjs');

let pass = 0, fail = 0;
function check(name, ok, info = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || !info ? '' : ' — ' + info}`);
}
const run = (...files) => spawnSync(process.execPath, [CHECK, ...files], { cwd: ROOT, encoding: 'utf8' });

// 1. Broken sample pack.
const bad = run(path.join(TOOLS, 'fixtures', 'bad-pack.json'));
check('bad-pack.json: exit code 1', bad.status === 1, `status ${bad.status}\n${bad.stdout}${bad.stderr}`);
const expect = [
  ['invalid item id', /items\[3\]: "id" không hợp lệ/],
  ['unknown type', /items\[4\]: "type" phải là/],
  ['duplicate item id', /trùng id "kem-que"/],
  ['unknown accessory kind', /items\[6\]: "kind" phải là/],
  ['e-mail', /"author": có địa chỉ e-mail/],
  ['link', /"desc": có đường link/],
  ['phone number', /"lines\[0\]": có dãy số giống số điện thoại/],
  ['banned word', /có từ cấm \(vcl\)/],
  ['price > 500', /giá 9999 > 500/],
  ['id also in base.json (warning)', /CẢNH BÁO: món "hu-tieu" trùng id với đồ gốc/],
  ['not in mods/index.json (warning)', /CẢNH BÁO: "bad-pack.json" chưa có trong mods\/index.json/],
  ['not in sw.js FILES (warning)', /CẢNH BÁO: "mods\/bad-pack.json" chưa có trong FILES của sw.js/],
  ['lists player-visible text', /bạn bị chọc nói: Gọi tui 0912 345 678 nha/],
  ['gen-seed reminder', /node supabase\/gen-seed\.mjs/],
];
for (const [name, re] of expect) check(`bad-pack.json: ${name}`, re.test(bad.stdout), bad.stdout.slice(-1500));
check('bad-pack.json: 9 errors', /KHÔNG ĐẠT: 9 lỗi/.test(bad.stdout));

// 2. Every pack shipped in mods/ passes.
const packs = readdirSync(path.join(ROOT, 'mods')).filter((f) => f.endsWith('.json') && f !== 'index.json');
const good = run(...packs.map((f) => path.join('mods', f)));
check(`mods/*.json (${packs.join(', ')}) pass`, good.status === 0, good.stdout.slice(-1500) + good.stderr);
check('base.json: no warnings, no false positives', !/CẢNH BÁO|LỖI/.test(good.stdout), good.stdout.slice(-1500));

// 3. Pack id already taken + bad file name + broken JSON.
const tmp = mkdtempSync(path.join(tmpdir(), 'tho-checkmod-'));
try {
  writeFileSync(path.join(tmp, 'gia-mao.json'), JSON.stringify({ id: 'base', name: 'Giả', items: [{ id: 'banh-bo', type: 'food', name: 'Bánh bò' }] }));
  const dup = run(path.join(tmp, 'gia-mao.json'));
  check('pack id "base" reused: exit 1', dup.status === 1 && /id pack "base" đã có ở mods\/base\.json/.test(dup.stdout), dup.stdout);

  writeFileSync(path.join(tmp, 'Ten File.json'), JSON.stringify({ id: 'ten-file', items: [{ id: 'banh-bo', type: 'food', name: 'Bánh bò' }] }));
  const name = run(path.join(tmp, 'Ten File.json'));
  check('bad file name: exit 1', name.status === 1 && /tên file "Ten File\.json"/.test(name.stdout), name.stdout);

  writeFileSync(path.join(tmp, 'hong.json'), '{ "id": "hong", ');
  const broken = run(path.join(tmp, 'hong.json'));
  check('broken JSON: exit 1', broken.status === 1 && /không đọc được file JSON/.test(broken.stdout), broken.stdout);

  writeFileSync(path.join(tmp, 'sach.json'), JSON.stringify({ id: 'sach-se', name: 'Sạch sẽ', items: [
    { id: 'banh-bo', type: 'food', name: 'Bánh bò', desc: 'Lớp 6.1 thích ăn, giá 10.000 đồng hồi xưa', price: 6 },
    { id: 'phao', type: 'toy', name: 'Pháo giấy nhỏ', verb: 'Bắn', lines: ['Vui vậy!', 'Hôm nay 20/11 hả?'] },
  ] }));
  const clean = run(path.join(tmp, 'sach.json'));
  check('clean pack with ordinary numbers: exit 0, no errors', clean.status === 0 && !/LỖI/.test(clean.stdout), clean.stdout);

  const none = run();
  check('no argument: usage + exit 2', none.status === 2 && /Cách dùng/.test(none.stdout), none.stdout);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`check-mod: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
