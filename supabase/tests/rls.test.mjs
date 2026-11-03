// RLS + function tests for supabase/migrations, run in PGlite (Postgres in WASM) — no Docker needed.
// Usage: cd supabase/tests && npm install && node rls.test.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const supa = join(here, '..');
const db = new PGlite();

let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : '  → ' + extra}`);
}

// Run SQL as a given user (null = anon). aal2 = signed in with MFA.
async function as(user, sql, params = [], { aal = 'aal1' } = {}) {
  const claims = user ? JSON.stringify({ sub: user, role: 'authenticated', aal }) : '';
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
}
async function fails(user, sql, params, opts) {
  try { await as(user, sql, params, opts); return null; } catch (e) { return e.message; }
}
const rows = async (...a) => (await as(...a)).rows;
const admin = (sql) => db.query(sql);

// ---------- setup
await db.exec(readFileSync(join(here, 'stub.sql'), 'utf8'));
for (const f of readdirSync(join(supa, 'migrations')).sort()) await db.exec(readFileSync(join(supa, 'migrations', f), 'utf8'));
await db.exec(readFileSync(join(supa, 'seed.sql'), 'utf8'));

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const ADM1 = '00000000-0000-4000-8000-0000000000d1';
const ADM2 = '00000000-0000-4000-8000-0000000000d2';
const TEA = '00000000-0000-4000-8000-0000000000e1';
for (const u of [A, B, C, ADM1, ADM2, TEA]) await admin(`insert into auth.users (id) values ('${u}')`);
await admin(`insert into public.staff (user_id, role, display_name) values
  ('${ADM1}', 'admin', 'Admin 1'), ('${ADM2}', 'admin', 'Admin 2'), ('${TEA}', 'teacher', 'Cô Lan')`);

const saveOf = (name, school, grade, progress = {}) => JSON.stringify({ v: 3, name, school, grade, section: 2, progress, stats: { conduct: 90 } });
const opId = () => crypto.randomUUID();

// ---------- saves + profiles
await as(A, `insert into public.saves (user_id, data, v) values ($1, $2, 3)`, [A, saveOf('Minh', 'THCS Lê Lợi', 7, { toan: 5, van: 3 })]);
await as(B, `insert into public.saves (user_id, data, v) values ($1, $2, 3)`, [B, saveOf('Lan', 'thcs lê lợi ', 6, { toan: 2 })]);
check('A reads own save', (await rows(A, 'select * from public.saves')).length === 1);
check('B cannot see A save', (await rows(B, `select * from public.saves where user_id = $1`, [A])).length === 0);
check('B cannot update A save', (await as(B, `update public.saves set v = 9 where user_id = $1`, [A])).affectedRows === 0);
check('B cannot insert save as A', !!(await fails(B, `insert into public.saves (user_id, data, v) values ($1, '{}', 3)`, [A])));
check('B cannot delete A save', (await as(B, `delete from public.saves where user_id = $1`, [A])).affectedRows === 0);
check('anon cannot read saves', !!(await fails(null, 'select * from public.saves')));
check('save size limited', !!(await fails(A, `update public.saves set data = jsonb_build_object('x', repeat('a', 300000)) where user_id = $1`, [A])));
const profA = (await admin(`select * from public.profiles where user_id = '${A}'`)).rows[0];
check('profile derived from save (score = 60 + 8)', profA?.score === 68 && profA.school_key === 'thcs lê lợi', JSON.stringify(profA));
check('player sees only own profile', (await rows(A, 'select * from public.profiles')).length === 1);
check('player cannot unhide/hide profile', (await as(A, `update public.profiles set hidden = true`)).affectedRows === 0);
check('player cannot change score', !!(await fails(A, `update public.profiles set score = 999`)));

// ---------- leaderboard
await as(C, `insert into public.saves (user_id, data, v) values ($1, $2, 3)`, [C, saveOf('vcl haha', 'THCS Lê Lợi', 9)]);
const lb = await rows(null, `select * from public.leaderboard('THCS LÊ LỢI')`);
check('leaderboard groups by school (case/space-insensitive)', lb.length === 2 && lb[0].display_name === 'Minh', JSON.stringify(lb));
check('bad-word name hidden from leaderboard', !lb.some((r) => r.display_name.includes('vcl')));
check('leaderboard marks me', (await rows(B, `select * from public.leaderboard(null)`)).find((r) => r.is_me)?.display_name === 'Lan');
check('leaderboard exposes no user_id', !('user_id' in lb[0]));

// ---------- feedback
const fb = `insert into public.feedback (kind, text, grade, section, zone, x, z) values ($1, $2, 7, 2, 'Sân', 1, 2)`;
check('player can send feedback', !(await fails(A, fb, ['bug', 'Kẹt sau căng tin'])));
await as(B, fb, ['question', 'Đáp án sai']);
check('anon cannot send feedback', !!(await fails(null, fb, ['bug', 'x'])));
check('player cannot read feedback back', (await rows(A, 'select * from public.feedback')).length === 0);
check('player cannot set status on insert', !!(await fails(A, `insert into public.feedback (kind, status) values ('bug', 'fixed')`)));
check('player cannot update feedback', (await as(A, `update public.feedback set status = 'fixed'`)).affectedRows === 0);
check('feedback user_id forced to caller', (await admin(`select user_id from public.feedback where text = 'Kẹt sau căng tin'`)).rows[0].user_id === A);
for (let i = 0; i < 9; i++) await as(A, fb, ['idea', 'ý ' + i]); // A now has 10 in the last hour
check('feedback rate limit (10/hour)', !!(await fails(A, fb, ['idea', 'quá nhiều'])));
check('bad kind rejected', !!(await fails(B, fb, ['hack', 'x'])));

// ---------- staff
check('admin without MFA sees nothing', (await rows(ADM1, 'select * from public.feedback')).length === 0);
check('admin with MFA sees all feedback', (await rows(ADM1, 'select * from public.feedback', [], { aal: 'aal2' })).length === 11);
check('teacher sees only question feedback', (await rows(TEA, 'select kind from public.feedback', [], { aal: 'aal2' })).every((r) => r.kind === 'question'));
const fid = (await admin(`select id from public.feedback where kind = 'bug' limit 1`)).rows[0].id;
await as(ADM1, `update public.feedback set status = 'approved', admin_note = 'sửa va chạm' where id = $1`, [fid], { aal: 'aal2' });
const fr = (await admin(`select status, reviewed_by from public.feedback where id = ${fid}`)).rows[0];
check('admin approves feedback → reviewed_by set', fr.status === 'approved' && fr.reviewed_by === ADM1);
check('review written to audit_log', (await admin(`select count(*)::int c from public.audit_log where action = 'feedback.review'`)).rows[0].c === 1);
check('teacher cannot update bug feedback', (await as(TEA, `update public.feedback set status = 'fixed' where id = $1`, [fid], { aal: 'aal2' })).affectedRows === 0);
check('admin cannot change feedback text', !!(await fails(ADM1, `update public.feedback set text = 'x'`, [], { aal: 'aal2' })));
check('player cannot read audit log', (await rows(A, 'select * from public.audit_log')).length === 0);
check('player cannot make self staff', !!(await fails(A, `insert into public.staff (user_id, role, display_name) values ($1, 'admin', 'x')`, [A])));

// ---------- shop
check('anon reads shop (18 items)', (await rows(null, 'select * from public.shop_items')).length === 18);
check('player cannot change price', (await as(A, `update public.shop_items set price = 0`)).affectedRows === 0);
await as(ADM1, `update public.shop_items set price = 22 where id = 'base:hu-tieu'`, [], { aal: 'aal2' });
check('admin changes price + audit', (await admin(`select price from public.shop_items where id = 'base:hu-tieu'`)).rows[0].price === 22
  && (await admin(`select count(*)::int c from public.audit_log where action = 'shop.update'`)).rows[0].c === 1);

// ---------- coco
const apply = async (u, ops) => (await as(u, 'select public.coco_apply($1::jsonb) r', [JSON.stringify(ops)])).rows[0].r;
let r = await apply(A, [{ op_id: opId(), kind: 'earn', n: 1, reason: 'trả lời đúng' }]);
check('first apply: start 20 + earn 1', r.balance === 21, JSON.stringify(r));
const dup = opId();
await apply(A, [{ op_id: dup, kind: 'earn', n: 5, reason: 'xong môn' }]);
r = await apply(A, [{ op_id: dup, kind: 'earn', n: 5, reason: 'xong môn' }]);
check('same op_id applied once', r.balance === 26 && r.results[0].why === 'duplicate', JSON.stringify(r));
r = await apply(A, [{ op_id: opId(), kind: 'earn', n: 999 }]);
check('earn clamped to 10 per op', r.balance === 36 && r.results[0].applied === 10);
r = await apply(A, Array.from({ length: 5 }, () => ({ op_id: opId(), kind: 'earn', n: 10 })));
check('earn cap 40 per 6 hours', r.balance === 60, JSON.stringify(r));
check('earn over cap reports why=cap', r.results.at(-1).why === 'cap');
r = await apply(A, [{ op_id: opId(), kind: 'spend', n: 15, item_id: 'base:hu-tieu' }]);
check('spend with stale price rejected', r.balance === 60 && r.results[0].why === 'price changed');
r = await apply(A, [{ op_id: opId(), kind: 'spend', n: 22, item_id: 'base:hu-tieu' }]);
check('spend with server price ok', r.balance === 38);
r = await apply(A, [{ op_id: opId(), kind: 'spend', n: 60, item_id: 'base:dong-phuc-du-phong' }]);
check('spend more than balance rejected', r.balance === 38 && r.results[0].why === 'insufficient');
r = await apply(A, [{ op_id: opId(), kind: 'spend', n: 0, item_id: 'base:com-trang' }]);
check('free item ok', r.results[0].ok && r.balance === 38);
r = await apply(A, [{ op_id: opId(), kind: 'spend', n: 50, reason: 'ăn vặt' }]);
check('free-form spend limited to 20', r.results[0].why === 'too large');
r = await apply(A, [{ op_id: opId(), kind: 'lose', n: 100, reason: 'bị bắt nạt' }]);
check('lose clamped to 10', r.balance === 28);
r = await apply(B, [{ op_id: opId(), kind: 'import', n: 5000 }]);
check('import local balance capped at 200', r.balance === 200, JSON.stringify(r));
r = await apply(B, [{ op_id: opId(), kind: 'import', n: 300 }]);
check('import only once', r.balance === 200 && r.results[0].why === 'already imported');
check('player cannot write wallet', !!(await fails(A, `update public.wallets set balance = 9999`)));
check('player cannot insert ledger', !!(await fails(A, `insert into public.coco_ledger (user_id, delta, reason, balance_after) values ($1, 999, 'x', 999)`, [A])));
check('player reads only own ledger', (await rows(B, 'select distinct user_id from public.coco_ledger')).every((x) => x.user_id === B));
check('anon cannot call coco_apply', !!(await fails(null, `select public.coco_apply('[]')`)));
check('ledger balance_after matches wallet', (await admin(`select (select balance from public.wallets where user_id = '${A}') = (select balance_after from public.coco_ledger where user_id = '${A}' order by id desc limit 1) ok`)).rows[0].ok);

// ---------- adjustments (two admins)
check('player cannot request adjustment', !!(await fails(A, `select public.request_adjustment($1, 50, 'hack hack')`, [A])));
const adj = (await as(ADM1, `select public.request_adjustment($1, 50, 'bù lỗi mất coco') id`, [A], { aal: 'aal2' })).rows[0].id;
check('same admin cannot approve own request', !!(await fails(ADM1, `select public.decide_adjustment($1, true)`, [adj], { aal: 'aal2' })));
await as(ADM2, `select public.decide_adjustment($1, true)`, [adj], { aal: 'aal2' });
check('second admin approves → balance +50', (await admin(`select balance from public.wallets where user_id = '${A}'`)).rows[0].balance === 78);
check('cannot decide twice', !!(await fails(ADM2, `select public.decide_adjustment($1, false)`, [adj], { aal: 'aal2' })));

// ---------- transfer code
check('transfer tables not readable', !!(await fails(A, 'select * from public.transfer_codes')));
const code = (await as(A, 'select public.create_transfer_code() c')).rows[0].c;
check('transfer code is 8 chars, no ambiguous letters', /^[A-HJKMNP-Z2-9]{8}$/.test(code), code);
const NEWDEV = '00000000-0000-4000-8000-0000000000f1';
await admin(`insert into auth.users (id) values ('${NEWDEV}')`);
let t = (await as(NEWDEV, 'select public.claim_transfer_code($1) r', ['WRONGCOD'])).rows[0].r;
check('wrong code rejected', t.ok === false);
check('own code cannot be claimed by self', (await as(A, 'select public.claim_transfer_code($1) r', [code])).rows[0].r.reason === 'same-device');
t = (await as(NEWDEV, 'select public.claim_transfer_code($1) r', [code.toLowerCase()])).rows[0].r;
check('claim moves save to new device', t.ok && t.save.name === 'Minh', JSON.stringify(t));
check('coco moved with it', (await rows(NEWDEV, 'select balance from public.wallets'))[0]?.balance === 78);
check('old device has no save left', (await admin(`select count(*)::int c from public.saves where user_id = '${A}'`)).rows[0].c === 0);
check('code is single-use', (await as(B, 'select public.claim_transfer_code($1) r', [code])).rows[0].r.ok === false);
for (let i = 0; i < 9; i++) await as(B, 'select public.claim_transfer_code($1) r', ['ZZZZZZZZ']);
check('claim attempts limited (10/hour)', !!(await fails(B, 'select public.claim_transfer_code($1)', ['ZZZZZZZZ'])));

// ---------- review locks + audit (migration 0001)
const MOD = '00000000-0000-4000-8000-0000000000e2';
await admin(`insert into auth.users (id) values ('${MOD}')`);
await admin(`insert into public.staff (user_id, role, display_name) values ('${MOD}', 'moderator', 'Kiểm duyệt')`);
const mfa = { aal: 'aal2' };
await as(ADM1, `update public.feedback set status = 'fixed' where id = $1`, [fid], mfa);
check('moderator cannot change a fixed report', !!(await fails(MOD, `update public.feedback set status = 'new' where id = $1`, [fid], mfa)));
check('admin can reopen a fixed report', !(await fails(ADM1, `update public.feedback set status = 'new' where id = $1`, [fid], mfa)));
check('moderator can review an open report', (await as(MOD, `update public.feedback set status = 'duplicate' where id = $1`, [fid], mfa)).affectedRows === 1);
await as(MOD, `update public.profiles set hidden = true where display_name = 'Minh'`, [], mfa);
check('hiding a name is audited', (await admin(`select count(*)::int c from public.audit_log where action = 'profile.hide' and actor = '${MOD}'`)).rows[0].c === 1);
await as(MOD, `insert into public.banned_words (word) values ($1)`, [' LAN '], mfa);
check('new banned word stored lower-case + audited', (await admin(`select count(*)::int c from public.audit_log where action = 'banned_word.add' and target = 'lan'`)).rows[0].c === 1);
check('new banned word hides existing names', (await admin(`select hidden from public.profiles where user_id = '${B}'`)).rows[0].hidden === true);
check('player cannot add banned words', !!(await fails(A, `insert into public.banned_words (word) values ('abc')`)) || (await admin(`select count(*)::int c from public.banned_words where word = 'abc'`)).rows[0].c === 0);
await as(MOD, `delete from public.banned_words where word = 'lan'`, [], mfa);
check('removing a banned word is audited', (await admin(`select count(*)::int c from public.audit_log where action = 'banned_word.remove'`)).rows[0].c === 1);

// ---------- grants sanity: every public table has RLS on
const noRls = (await admin(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)).rows;
check('every public table has RLS enabled', noRls.length === 0, JSON.stringify(noRls));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
