// Unit tests for the mod validator (js/items.js) and the coco wallet (js/economy.js).
// Usage: node tests/unit.mjs [repoDir]
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2] || path.join(here, '..'));
const imp = (rel) => import(pathToFileURL(path.join(repo, rel)).href);
const items = await imp('js/items.js');
const eco = await imp('js/economy.js');
const { validatePack, loadCatalog } = items;

let pass = 0, fail = 0;
function check(name, ok, info = '') {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && info ? ' — ' + info : ''}`);
}
const readJson = async (rel) => JSON.parse(await readFile(path.join(repo, rel), 'utf8'));

// ---------------- validatePack: base pack ----------------
const base = await readJson('mods/base.json');
const b = validatePack(base, 'base.json');
check('base.json: no errors', b.errors.length === 0, JSON.stringify(b.errors));
check('base.json: pack id "base"', b.pack?.id === 'base');
check('base.json: all 18 items kept', b.items.length === 18, `got ${b.items.length}`);
const count = (t) => b.items.filter((i) => i.type === t).length;
check('base.json: 9 food, 1 uniform, 4 accessories, 4 toys',
  count('food') === 9 && count('uniform') === 1 && count('accessory') === 4 && count('toy') === 4,
  `${count('food')}/${count('uniform')}/${count('accessory')}/${count('toy')}`);
check('base.json: ids are "<pack>:<id>"', b.items.every((i) => /^base:[a-z0-9-]+$/.test(i.id)));
const gun = b.items.find((i) => i.id === 'base:sung-nuoc');
check('base.json: water gun fields', gun && gun.price === 25 && gun.uses === 5 && gun.catch === 0.5 && gun.fx.kind === 'spray' && gun.lines.length === 3,
  JSON.stringify(gun));
const rice = b.items.find((i) => i.id === 'base:com-trang');
check('base.json: plain rice is free, at home', rice && rice.price === 0 && rice.where === 'home');

// ---------------- validatePack: hostile pack ----------------
const hostile = {
  id: 'evil-pack', name: '<img src=x onerror=alert(1)>Evil', author: 'x'.repeat(200), version: -5, script: 'alert(1)',
  items: [
    { id: 'html', type: 'food', name: '<script>alert(1)</script>', price: -50, energy: 9999, mood: -9999, where: 'moon', onclick: 'steal()', __proto__x: 1 },
    { id: 'html', type: 'food', name: 'Duplicate', price: 1 },
    { id: 'hat', type: 'accessory', kind: 'crown', name: 'Crown', price: 10 },
    { id: 'gun', type: 'toy', name: 'Gun', price: 1e9, uses: 999, catch: 0, fun: -1, fx: { kind: 'explode', color: 'red;background:url(x)' }, lines: ['a'.repeat(200), 5, '', 'ok'] },
    { id: 'bad id!', type: 'food', name: 'Bad id' },
    { id: 'pet', type: 'pet', name: 'Unknown type' },
    { id: 'noname', type: 'food' },
    'not an object',
    null,
    { id: 'uni', type: 'uniform', name: 'Uni', count: 50, price: 'free' },
    { id: 'cap', type: 'accessory', kind: 'cap', name: 'Cap', color: 'javascript:alert(1)', price: 12.6 },
  ],
};
const h = validatePack(hostile, 'evil.json');
const byId = Object.fromEntries(h.items.map((i) => [i.id, i]));
check('hostile: pack accepted, script field dropped', h.pack && h.pack.id === 'evil-pack' && !('script' in h.pack));
check('hostile: version clamped to ≥1, author ≤40 chars', h.pack.version === 1 && h.pack.author.length === 40);
check('hostile: only the 4 valid items kept', h.items.length === 4 && ['evil-pack:html', 'evil-pack:gun', 'evil-pack:uni', 'evil-pack:cap'].every((k) => byId[k]),
  JSON.stringify(Object.keys(byId)));
const food = byId['evil-pack:html'];
check('hostile: negative price → 0, energy/mood clamped', food.price === 0 && food.energy === 60 && food.mood === -20, JSON.stringify(food));
check('hostile: unknown "where" → home, unknown fields dropped', food.where === 'home' && !('onclick' in food) && !('__proto__x' in food));
check('hostile: HTML in name is kept as plain text, ≤30 chars (escaped later by esc())', food.name === '<script>alert(1)</script>'.slice(0, 30));
check('hostile: duplicate id reported', h.errors.some((e) => e.includes('trùng id')), JSON.stringify(h.errors));
check('hostile: unknown accessory kind reported and skipped', h.errors.some((e) => e.includes('"kind"')) && !byId['evil-pack:hat']);
const toy = byId['evil-pack:gun'];
check('hostile: toy numbers clamped (price ≤500, uses ≤10, catch ≥0.1, fun ≥0)', toy.price === 500 && toy.uses === 10 && toy.catch === 0.1 && toy.fun === 0, JSON.stringify(toy));
check('hostile: unknown fx kind → spray, bad colour → #ffffff', toy.fx.kind === 'spray' && toy.fx.color === '#ffffff');
check('hostile: toy lines filtered (strings only, ≤60 chars)', toy.lines.length === 2 && toy.lines[0].length === 60 && toy.lines[1] === 'ok', JSON.stringify(toy.lines));
check('hostile: bad id / unknown type / missing name / non-object reported',
  ['"id" không hợp lệ', '"type" phải là', 'thiếu "name"', 'không phải object'].every((s) => h.errors.some((e) => e.includes(s))), JSON.stringify(h.errors));
check('hostile: uniform count clamped to 3, non-number price → 0', byId['evil-pack:uni'].count === 3 && byId['evil-pack:uni'].price === 0);
check('hostile: bad accessory colour → #888888, price rounded', byId['evil-pack:cap'].color === '#888888' && byId['evil-pack:cap'].price === 13);
check('non-object pack rejected', [null, 42, 'x', undefined].every((v) => validatePack(v).pack === null && validatePack(v).errors.length === 1));
check('pack with bad id rejected', validatePack({ id: 'Bad Id', items: [] }).pack === null);
check('pack without items array reported', validatePack({ id: 'empty' }).errors.some((e) => e.includes('"items"')));

// ---------------- loadCatalog with a stubbed fetch (reads mods/ from disk) ----------------
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  const rel = String(url);
  if (rel === 'mods/index.json') return { json: async () => ({ packs: ['base.json', '../evil.json', 'missing.json'] }) };
  if (rel === 'mods/missing.json') return { json: async () => { throw new Error('404'); } };
  return { json: async () => readJson(rel) };
};
try {
  const cat = await loadCatalog('mods/');
  check('loadCatalog: base loaded, unsafe file name ignored, missing pack reported',
    cat.items.size === 18 && cat.packs.length === 1 && cat.errors.length === 1 && cat.errors[0].startsWith('missing.json'), JSON.stringify(cat.errors));
} finally { globalThis.fetch = realFetch; }

// ---------------- coco wallet ----------------
const wallet = (coco = 0) => ({ coco, ledger: [], inv: {}, uniform: { clean: 1, dirty: 0, washing: 0, until: 0 }, today: { earned: 0 } });
let s = wallet(0);
check('earn: cap constant is 40', eco.EARN_CAP_PER_DAY === 40 && eco.EARN.correct === 1 && eco.EARN.subjectDone === 5 && eco.EARN.cleanDay === 5);
let got = 0;
for (let i = 0; i < 50; i++) got += eco.earn(s, 1, 'test');
check('earn: stops at 40 per day', got === 40 && s.coco === 40 && s.today.earned === 40, `got ${got}, coco ${s.coco}`);
check('earn: partial when near the cap', (() => { const w = wallet(); w.today.earned = 37; return eco.earn(w, 5, 'x') === 3 && w.coco === 3; })());
check('earn: new day resets the room', (() => { s.today = { earned: 0 }; return eco.earn(s, 5, 'x') === 5 && s.coco === 45; })());
check('earn: negative amount adds nothing, no ledger line', (() => { const w = wallet(10); return eco.earn(w, -5, 'x') === 0 && w.coco === 10 && w.ledger.length === 0; })());
check('spend: insufficient funds → false, nothing changes', (() => { const w = wallet(5); return eco.spend(w, 6, 'x') === false && w.coco === 5 && w.ledger.length === 0; })());
check('spend: negative amount refused', (() => { const w = wallet(5); return eco.spend(w, -10, 'x') === false && w.coco === 5; })());
check('spend: exact balance ok, ledger line with balance', (() => { const w = wallet(5); return eco.spend(w, 5, 'ăn') && w.coco === 0 && w.ledger.length === 1 && w.ledger[0].d === -5 && w.ledger[0].b === 0 && w.ledger[0].r === 'ăn'; })());
check('spend: 0 is free and not logged', (() => { const w = wallet(0); return eco.spend(w, 0, 'free') === true && w.ledger.length === 0; })());
check('lose: never below 0', (() => { const w = wallet(7); return eco.lose(w, 10, 'bully') === 7 && w.coco === 0 && w.ledger.length === 1; })());
const cat = Object.fromEntries(b.items.map((i) => [i.id, i]));
check('buy: toy adds uses, accessory owned, uniform adds a clean set', (() => {
  const w = wallet(200);
  return eco.buy(w, cat['base:sung-nuoc']) && eco.buy(w, cat['base:sung-nuoc']) && eco.buy(w, cat['base:mu-luoi-trai']) && eco.buy(w, cat['base:dong-phuc-du-phong'])
    && w.inv['base:sung-nuoc'] === 10 && w.inv['base:mu-luoi-trai'] === 1 && w.uniform.clean === 2 && w.coco === 200 - 25 - 25 - 35 - 60 && w.ledger.length === 4;
})());
check('buy: not enough coco → false, inventory and ledger unchanged', (() => {
  const w = wallet(10);
  return eco.buy(w, cat['base:dong-phuc-du-phong']) === false && w.uniform.clean === 1 && w.coco === 10 && w.ledger.length === 0 && Object.keys(w.inv).length === 0;
})());
check('ledger: keeps the last 100 lines', (() => {
  const w = wallet(1000);
  for (let i = 0; i < 150; i++) eco.spend(w, 1, `n${i}`);
  return w.ledger.length === 100 && w.ledger[0].r === 'n50' && w.ledger[99].r === 'n149' && w.coco === 850;
})());

console.log(`unit: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
