// End-to-end test: Edge headless + Chrome DevTools Protocol (Node's built-in WebSocket), against
// http://localhost:8081/?debug served by `python -m http.server 8081` from the repo root.
// Usage: node tests/e2e.mjs <outDir> [width=1280] [height=720] [iphone]
//   iphone → touch emulation + iOS Safari user agent (+ mobile viewport).
// Plays: audio locked until a real tap → mods → shop → wear cap → breakfast with coco → pack toy → 6 periods with pranks → free time →
// feedback mailbox → dirty uniform caught once → quiet zones → end of session → summary → spare uniform / wash →
// 6A1→6A2 → A4→7A1 → game closed >6h → re-enter mid-session → migrate save v1→v3 → SW caches mods → no console errors.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const OUT = path.resolve(process.argv[2] || 'tests/out/e2e');
const W = Number(process.argv[3]) || 1280;
const H = Number(process.argv[4]) || 720;
const IPHONE = process.argv.includes('iphone');
const URL_ = process.env.E2E_URL || 'http://localhost:8081/?debug';
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SAVE_KEY = 'truong-hoc-online-v1';
const label = `${W}x${H}${IPHONE ? '-iphone' : ''}`;
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const results = [];
function check(name, ok, info = '') {
  ok = !!ok;
  if (ok) pass++; else fail++;
  results.push({ name, ok, info });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && info !== '' ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''}`);
}

// ---------------- minimal CDP client ----------------
class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      } else if (msg.method) for (const h of this.handlers) h(msg.method, msg.params);
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
    return new Cdp(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); } }, 120000);
    });
  }
  on(fn) { this.handlers.push(fn); }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

// ---------------- page-side helpers (installed on every document) ----------------
const HELPERS = `
(() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (id) => document.getElementById(id);
  const T = window.__t = {
    sleep,
    modal() {
      const m = $('modal');
      if (!m || m.hidden) return null;
      return { title: $('mTitle').textContent, body: $('mBody').innerText,
        buttons: [...$('mButtons').children].map((b) => ({ label: b.textContent, disabled: b.disabled, cls: b.className })) };
    },
    async waitFor(fn, ms = 6000) {
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        try { const v = fn(); if (v) return v; } catch (e) { /* not ready */ }
        await sleep(40);
      }
      return null;
    },
    // click the first enabled button of the modal whose label contains \`sub\`
    async click(sub, ms = 6000) {
      const m = await T.waitFor(() => { const m = T.modal(); return m && m.buttons.some((b) => b.label.includes(sub) && !b.disabled) && m; }, ms);
      if (!m) throw new Error('no button "' + sub + '" in modal ' + JSON.stringify(T.modal()));
      [...$('mButtons').children].find((b) => b.textContent.includes(sub) && !b.disabled).click();
      await sleep(80);
      return m;
    },
    // stand on a hotspot and press the action button
    async act(id, labelPart = '', nth = 0) {
      const h = __g.W.hotspots.filter((h) => h.id === id)[nth];
      if (!h) throw new Error('no hotspot ' + id);
      return T.actAt(h.x, h.z, labelPart);
    },
    async actAt(x, z, labelPart = '') {
      await T.waitFor(() => !__g.busy && !T.modal(), 8000);
      __g.tp(x, z);
      const lbl = await T.waitFor(() => { const b = $('actBtn'); return !b.hidden && b.textContent.includes(labelPart) && b.textContent; }, 6000);
      if (!lbl) throw new Error('no action "' + labelPart + '" at ' + x + ',' + z + ' (button: ' + ($('actBtn').hidden ? 'hidden' : $('actBtn').textContent) + ')');
      void __g.interact(); // never await: it resolves only after the modal is closed
      await sleep(80);
      return lbl;
    },
    // answer quizzes (correctly unless right=false) and press the first button of any other modal,
    // until no modal has shown up for \`idle\` ms. Returns the titles seen.
    async play({ idle = 2500, right = true, max = 60000 } = {}) {
      const { ui } = await import('/js/ui.js');
      const seen = [];
      const t0 = performance.now();
      let last = performance.now();
      while (performance.now() - last < idle && performance.now() - t0 < max) {
        const m = T.modal();
        const btns = m ? [...$('mButtons').children] : [];
        if (!m || !btns.length || btns.every((b) => b.disabled)) { if (m) last = performance.now(); await sleep(40); continue; }
        if (btns[0].className === 'opt') {
          const ans = ui.lastQ.answer;
          const b = btns.find((b) => (b.textContent === ans) === right);
          seen.push('Q');
          b.click();
        } else {
          seen.push(m.title);
          btns.find((b) => !b.disabled).click();
        }
        await sleep(80);
        last = performance.now();
      }
      return seen;
    },
    toast() { const t = $('toast'); return t.hidden ? '' : t.textContent; },
    async chat(text) {
      $('chatInput').value = text;
      $('chatForm').requestSubmit();
      await sleep(150);
    },
    chatLog() { return $('chatLog').innerText; },
  };
})();
`;

// ---------------- browser ----------------
const profile = mkdtempSync(path.join(tmpdir(), 'tho-e2e-'));
const consoleErrors = [];
let edge = null, cdp = null;

async function launch() {
  if (!existsSync(EDGE)) throw new Error('Edge not found: ' + EDGE);
  edge = spawn(EDGE, [
    '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`,
    // Linux CI (GitHub ubuntu runner, google-chrome): the sandbox needs user namespaces the runner may not allow.
    ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
    'about:blank',
  ], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = 0;
  for (let i = 0; i < 150 && !port; i++) {
    await sleep(100);
    if (existsSync(portFile)) port = Number(readFileSync(portFile, 'utf8').split('\n')[0]);
  }
  if (!port) throw new Error('Edge did not open a DevTools port');
  let page = null;
  for (let i = 0; i < 50 && !page; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not yet */ }
    if (!page) await sleep(100);
  }
  if (!page) throw new Error('no page target');
  cdp = await Cdp.connect(page.webSocketDebuggerUrl);
  cdp.on((method, p) => {
    if (method === 'Runtime.consoleAPICalled' && p.type === 'error') consoleErrors.push('console.error: ' + p.args.map((a) => a.value ?? a.description).join(' '));
    if (method === 'Runtime.exceptionThrown') consoleErrors.push('exception: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text));
    if (method === 'Log.entryAdded' && p.entry.level === 'error') consoleErrors.push('log: ' + p.entry.text + ' ' + (p.entry.url || ''));
    if (method === 'Page.javascriptDialogOpening') cdp.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: IPHONE ? 3 : 1, mobile: IPHONE });
  if (IPHONE) {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: IOS_UA, platform: 'iPhone' });
  }
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HELPERS });
}

async function evaluate(expr, timeout = 90000) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + '\n  in: ' + expr.slice(0, 200));
  return r.result.value;
}
const ev = (fnBody) => evaluate(`(async () => { ${fnBody} })()`);

async function load(url = URL_) {
  const loaded = new Promise((res) => {
    const h = (m) => { if (m === 'Page.loadEventFired') res(); };
    cdp.on(h);
  });
  await cdp.send('Page.navigate', { url });
  await Promise.race([loaded, sleep(15000)]);
  // wait for the game module (window.__g) to be ready
  const ok = await evaluate(`__t.waitFor(() => window.__g && document.getElementById('start'), 15000).then(Boolean)`);
  if (!ok) throw new Error('game did not start (no window.__g)');
}
async function reload() {
  const loaded = new Promise((res) => { cdp.on((m) => { if (m === 'Page.loadEventFired') res(); }); });
  await cdp.send('Page.reload', { ignoreCache: false });
  await Promise.race([loaded, sleep(15000)]);
  await sleep(500);
  const ok = await evaluate(`__t.waitFor(() => window.__g && document.getElementById('start'), 15000).then(Boolean)`);
  if (!ok) throw new Error('game did not start after reload');
}
let shotN = 0;
async function shot(name) {
  try {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path.join(OUT, `${String(++shotN).padStart(2, '0')}-${name}.png`), Buffer.from(r.data, 'base64'));
  } catch (e) { console.log('screenshot failed:', e.message); }
}
const state = (expr) => evaluate(`(() => { const s = __g.state, t = __g.today; return ${expr}; })()`);

// a real user gesture (CDP input, not a JS click): touch on the iPhone run, mouse otherwise
async function realTap(x, y) {
  if (IPHONE) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await sleep(150);
}
const ambienceIs = (name) => evaluate(`__t.waitFor(() => __g.ambience === ${JSON.stringify(name)} && __g.audio.playing === ${JSON.stringify(name)}, 3000).then(() => __g.audio)`);

// close the help / any leftover modal by pressing its first button
const drain = (idle = 1200) => ev(`return __t.play({ idle: ${idle} });`);

// home preparation: dress (clean), scarf, books, breakfast, lunchbox
async function prepHome({ food = 'Cơm trắng', dress = 'Mặc đồng phục sạch' } = {}) {
  if (dress) { await ev(`await __t.act('home-wardrobe', 'Tủ quần áo'); await __t.click(${JSON.stringify(dress)});`); }
  await ev(`await __t.act('home-wardrobe', 'Tủ quần áo'); await __t.click('Đeo khăn quàng');`);
  await ev(`await __t.act('home-bag', 'Cặp sách'); await __t.click('Soạn sách vở');`);
  if (food) await ev(`await __t.act('home-table', 'Bàn ăn'); await __t.click(${JSON.stringify(food)});`);
  await ev(`await __t.act('home-table', 'Bàn ăn'); await __t.click('Cất hộp đồ ăn');`);
}
async function goToSchool() {
  await ev(`await __t.act('home-door', 'Đi học');`);
  await ev(`await __t.waitFor(() => __g.state.phase === 'school' && __g.sub === 'preBell', 8000);`);
  await sleep(300);
}
async function sitInClass() {
  await ev(`const s = __g.W.seats[__g.state.section][9]; await __t.actAt(s.x, s.z, 'Ngồi vào chỗ');`);
}
async function walkHomeFromGate() {
  await ev(`await __t.waitFor(() => __g.state.phase === 'after', 8000); await __t.act('gate', 'Về nhà');`);
  return ev(`return await __t.waitFor(() => { const m = __t.modal(); return m && m.title.includes('Hết ngày') && m; }, 10000);`);
}
// install a save and reload without the game overwriting it on unload
async function installSaveAndReload(saveObj) {
  await evaluate(`(() => {
    localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(saveObj))});
    Storage.prototype.setItem = function () {};
  })()`);
  await reload();
}
// pick a classmate in the yard, park it far from staff and stand next to it
async function standNextToClassmate(name = null) {
  return ev(`
    const g = __g, spot = { x: -15, z: 18 };
    const m = g.npcs.monitor; m.wander = false; m.path = []; m.mesh.position.set(30, 0, 22);
    let n = ${name ? `g.npcs.classmates().find((c) => c.name === ${JSON.stringify(name)})` : `g.npcs.classmates().find((c) => !c.hidden)`};
    n.wander = false; n.path = []; n.onArrive = null; n.mesh.position.set(spot.x, 0, spot.z); n.mesh.userData.sitting = false;
    for (const o of g.npcs.classmates()) if (o !== n && Math.hypot(o.mesh.position.x - spot.x, o.mesh.position.z - spot.z) < 3) { o.path = []; o.wander = false; o.mesh.position.set(o.mesh.position.x + 6, 0, o.mesh.position.z - 6); }
    g.tp(spot.x + 0.7, spot.z);
    const ok = await __t.waitFor(() => g.prankTarget === n && !document.getElementById('actBtn').hidden, 5000);
    return { name: n.name, ok: !!ok, label: document.getElementById('actBtn').textContent };
  `);
}

// ---------------- the test ----------------
async function run() {
  await launch();
  await load();
  const GUN = 'base:sung-nuoc', CAP = 'base:mu-luoi-trai';

  // install guide: only auto-shown on phones
  const sheet = await evaluate(`__t.waitFor(() => !document.getElementById('install').hidden, 2500).then(Boolean)`);
  if (IPHONE) {
    check('iPhone: install guide shows before creating a character', sheet);
    check('iPhone: guide is for Safari on iPhone', await evaluate(`document.getElementById('installTitle').textContent`) === 'Cài trên iPhone');
    await shot('install-sheet');
    await evaluate(`document.getElementById('installLater').click()`);
    check('iPhone: touch layout (body.touch + joystick)', await evaluate(`document.body.classList.contains('touch') && !document.getElementById('joy').hidden`));
  } else {
    check('desktop: install guide not auto-shown', !sheet);
  }

  // audio: nothing may start before the first user gesture (iOS), then the tap unlocks it
  const a0 = await evaluate(`__g.audio`);
  check('audio: no AudioContext before the first tap, default mode on', a0.state === 'none' && a0.mode === 'on', a0);
  await realTap(3, 3); // empty corner of the start screen
  const a1 = await evaluate(`__t.waitFor(() => __g.audio.state === 'running', 3000).then(() => __g.audio)`);
  check('audio: first tap unlocks the AudioContext', a1.state === 'running', a1);

  // mods
  const cat = await evaluate(`__t.waitFor(() => __g.catalog.items.size, 8000).then(() => ({ n: __g.catalog.items.size, packs: __g.catalog.packs.map((p) => p.id), errors: __g.catalog.errors }))`);
  check('mods: base pack loaded with 18 items, no errors', cat.n === 18 && cat.packs.join() === 'base' && cat.errors.length === 0, cat);

  // new character
  await shot('start');
  await evaluate(`(() => { document.getElementById('fName').value = 'Tí E2E'; document.getElementById('newForm').requestSubmit(); })()`);
  const help = await ev(`return await __t.waitFor(() => __t.modal(), 8000);`);
  check('new game: help dialog shown', help && help.title.includes('Cách chơi'), help?.title);
  await ev(`await __t.click('Vào chơi');`);
  check('new game: at home, day 1, class 6A1, 20 coco', await state(`s.phase === 'home' && s.day === 1 && s.grade === 6 && s.section === 1 && s.coco === 20 && s.v === 3`));
  const ambHome = await ambienceIs('home');
  check('ambience: home (calm + melody) playing at home', ambHome.playing === 'home', ambHome);
  const vis = await ev(`
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    const off = await __t.waitFor(() => __g.audio.state === 'suspended', 2000);
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    const on = await __t.waitFor(() => __g.audio.state === 'running', 2000);
    return { off: !!off, on: !!on };
  `);
  check('audio: suspended while the page is hidden, resumed on return', vis.off && vis.on, vis);
  await evaluate(`__g.giveCoco(200)`);

  // shop
  await ev(`await __t.act('home-desk', 'Bàn học'); await __t.click('Cửa hàng');`);
  await ev(`await __t.click('Đồ chơi'); await __t.click('Súng nước');`);
  await ev(`await __t.click('Phụ kiện'); await __t.click('Mũ lưỡi trai');`);
  await ev(`await __t.click('Phụ kiện');`);
  const capBtn = await ev(`return __t.modal().buttons.find((b) => b.label.includes('Mũ lưỡi trai'));`);
  check('shop: owned accessory shows "đã có" and is disabled', capBtn && capBtn.disabled && capBtn.label.includes('đã có'), capBtn);
  await ev(`await __t.click('Quay lại'); await __t.click('Đồng phục'); await __t.click('Đồng phục dự phòng');`);
  await shot('shop');
  await ev(`await __t.click('Đóng');`);
  check('shop: water gun (5 uses), cap, spare uniform bought', await state(`s.inv['${GUN}'] === 5 && s.inv['${CAP}'] === 1 && s.uniform.clean === 2`));
  check('shop: 120 coco spent, 3 ledger lines', await state(`s.coco === 100 && s.ledger.filter((l) => l.r.startsWith('mua ')).length === 3`));

  // wear the cap
  await ev(`await __t.act('home-wardrobe', 'Tủ quần áo'); await __t.click('Phụ kiện'); await __t.click('Mũ lưỡi trai');`);
  check('wardrobe: cap worn', await state(`s.acc === '${CAP}'`));
  // eat hu tieu with coco
  await ev(`await __t.act('home-table', 'Bàn ăn');`);
  const table = await ev(`return await __t.waitFor(() => __t.modal());`);
  check('breakfast: plain rice is free', table.buttons.some((b) => b.label.includes('Cơm trắng') && b.label.includes('miễn phí')), table.buttons);
  await ev(`await __t.click('Hủ tiếu');`);
  check('breakfast: hu tieu bought with 15 coco', await state(`t.breakfast && s.coco === 85 && s.ledger.at(-1).r === 'ăn base:hu-tieu'`));
  // pack the toy, rest of the preparation
  await ev(`await __t.act('home-bag', 'Cặp sách'); await __t.click('Mang');`);
  check('bag: water gun packed', await state(`t.packed.includes('${GUN}')`));
  await prepHome({ food: null });
  check('home: dressed (spare left), scarf, books, lunchbox', await state(`t.dressed && !t.dirty && t.scarf && t.bag && t.lunchbox && s.uniform.clean === 1`));
  check('home: objective says ready', (await evaluate(`document.getElementById('objective').textContent`)).includes('Đủ đồ'));
  await shot('home-ready');

  // school
  const conduct0 = await state('s.stats.conduct');
  await goToSchool();
  check('school: 6-hour session started, pre-bell', await state(`s.phase === 'school' && __g.sub === 'preBell' && Math.abs(s.sessionEnd - s.sessionStart - 6 * 3600e3) < 1000 && t.subjects.length === 6`));
  check('school: gate check passed (conduct +1, no dialog)', await state(`s.stats.conduct === ${conduct0 + 1}`) && !(await evaluate(`__t.modal()`)));
  const ambYard = await ambienceIs('yard');
  check('ambience: yard before the bell', ambYard.playing === 'yard', ambYard);

  // pranks in the yard (pre-bell)
  const p1 = await standNextToClassmate();
  check('prank: button offered next to a classmate in the yard', p1.ok && p1.label.includes('Xịt nước'), p1);
  const mood0 = await state('s.stats.mood');
  await evaluate(`void __g.interact()`);
  await sleep(1300);
  check('prank 1: uses a charge, counted, mood up', await state(`s.inv['${GUN}'] === 4 && t.pranks === 1 && s.prankCount === 1 && s.stats.mood > ${mood0}`));
  await shot('prank');
  const p2 = await standNextToClassmate(p1.name);
  if (p2.ok) {
    const c1 = await state('s.stats.conduct');
    await evaluate(`void __g.interact()`);
    const m = await ev(`return await __t.waitFor(() => __t.modal(), 4000);`);
    check('prank 2 on the same classmate: they tell the teacher (conduct −2)', m && m.title.includes('buồn') && m.body.includes('bắt nạt'), m);
    await ev(`await __t.click('Mình hiểu rồi');`);
    check('prank 2: conduct −2', await state(`s.stats.conduct === ${c1 - 2} && t.victims[${JSON.stringify(p1.name)}] === 2`));
  } else check('prank 2: classmate reachable again', false, p2);
  await evaluate(`__g.npcs.monitor.wander = true`);

  // periods: 6 × 3 questions, breaks after 2 and 4
  const coco0 = await state('s.coco');
  await evaluate(`__g.skip(31)`);
  check('bell: period 1 starts', await evaluate(`__t.waitFor(() => __g.sub === 'class', 5000).then(Boolean)`));
  const ambOut = await ambienceIs('outside');
  check('ambience: quiet yard (outside) while classes are on', ambOut.playing === 'outside', ambOut);
  // no prank inside the classroom
  const inClass = await ev(`
    const n = __g.npcs.classmates().find((c) => c.grade === __g.state.section && !c.hidden);
    await __t.waitFor(() => Math.hypot(n.mesh.position.x - n.seat.x, n.mesh.position.z - n.seat.z) < 0.3, 8000);
    __g.tp(n.mesh.position.x + 0.6, n.mesh.position.z);
    await __t.sleep(400);
    return { target: !!__g.prankTarget, label: document.getElementById('actBtn').hidden ? '' : document.getElementById('actBtn').textContent };
  `);
  check('prank: not possible inside the classroom', !inClass.target && !inClass.label.includes('Xịt'), inClass);
  let periods = 0;
  for (let round = 0; round < 3; round++) {
    await sitInClass();
    if (round === 0) {
      await ev(`await __t.waitFor(() => __t.modal()); `);
      await shot('class-period');
      const ambClass = await ambienceIs('class');
      check('ambience: classroom room tone when seated', ambClass.playing === 'class', { ...ambClass, pos: await evaluate(`__g.pos()`) });
    }
    const seen = await ev(`return await __t.play({ idle: 2500 });`);
    periods = await state('t.done');
    if (round < 2) {
      check(`break after period ${periods}`, periods === (round + 1) * 2 && await evaluate(`__g.sub`) === 'break', { periods, seen });
      if (round === 0) check('break: lunchbox eaten', await state(`!t.lunchbox`));
      await evaluate(`__g.skip(80)`);
      await evaluate(`__t.waitFor(() => __g.sub === 'class', 5000)`);
    }
  }
  check('6 periods done → free time', periods === 6 && await evaluate(`__g.sub`) === 'free');
  check('A1 subjects finished (5/5 each)', await state(`['toan', 'khtn', 'tin'].every((id) => s.progress[id] === 5)`));
  check('coco: 18 correct + 3 subjects = +33 (≤40/day)', await state(`s.coco === ${coco0 + 33} && t.earned === 33`), await state('[s.coco, t.earned]'));

  // feedback mailbox (outbox, no backend)
  await ev(`await __t.act('mailbox', 'Hộp thư góp ý');`);
  const fb = await ev(`return await __t.waitFor(() => __t.modal());`);
  check('mailbox: shows the last question', fb.title.includes('Hộp thư góp ý') && fb.body.includes('Câu vừa gặp'), fb.title);
  await ev(`await __t.click('Câu hỏi sai'); await __t.waitFor(() => document.getElementById('fbText')); document.getElementById('fbText').value = 'Đáp án hình như sai'; await __t.click('Gửi');`);
  const outbox = await evaluate(`JSON.parse(localStorage.getItem('tho-feedback-outbox') || '[]')`);
  const r0 = outbox[0] || {};
  check('mailbox: report queued with question + position', outbox.length === 1 && r0.kind === 'question' && r0.question?.q && r0.question.options.length === 4 && typeof r0.x === 'number' && r0.zone && r0.grade === 6 && r0.section === 1, r0);
  check('mailbox: queued toast', (await evaluate(`__t.toast()`)).includes('đang chờ gửi'));
  await evaluate(`document.getElementById('btnMail').click()`);
  const fb2 = await ev(`return await __t.waitFor(() => __t.modal());`);
  check('HUD 📮 button opens the mailbox', fb2 && fb2.title.includes('Hộp thư góp ý'));
  await ev(`await __t.click('Thôi');`);

  // prank caught by a teacher → confiscated
  const before = await state('s.stats.conduct');
  const caught = await ev(`
    const g = __g, rs = g.npcs.redStar.mesh.position;
    const n = g.npcs.classmates().find((c) => !c.hidden && c.name !== ${JSON.stringify(p1.name)});
    n.wander = false; n.path = []; n.mesh.position.set(rs.x - 3, 0, rs.z - 2);
    g.tp(rs.x - 2.3, rs.z - 2);
    if (!(await __t.waitFor(() => g.prankTarget === n, 4000))) return 'no target';
    const rnd = Math.random; Math.random = () => 0;
    try { void g.interact(); await __t.waitFor(() => __t.modal(), 4000); } finally { Math.random = rnd; }
    const m = __t.modal();
    await __t.click('xin lỗi');
    return m && m.title;
  `);
  check('prank near the red-star student: caught, toy confiscated, conduct −3', String(caught).includes('bắt gặp') && await state(`s.inv['${GUN}'] === 0 && t.caughtPrank && s.stats.conduct === ${before - 3} && !t.packed.length`), caught);

  // dirty uniform caught once
  const c2 = await state('s.stats.conduct');
  const dirty1 = await ev(`
    const g = __g, rs = g.npcs.redStar.mesh.position;
    g.today.dirty = true;
    g.tp(rs.x + 1, rs.z);
    const rnd = Math.random; Math.random = () => 0;
    try { await __t.waitFor(() => __t.modal(), 5000); } finally { Math.random = rnd; }
    const m = __t.modal();
    if (m) await __t.click('giặt');
    return m && m.title;
  `);
  check('dirty uniform: red-star student catches it (conduct −3)', String(dirty1).includes('bắt gặp') && await state(`t.caughtDirty && s.stats.conduct === ${c2 - 3}`), dirty1);
  const dirty2 = await ev(`
    const g = __g, rs = g.npcs.redStar.mesh.position;
    g.tp(rs.x + 6, rs.z - 6); g.skip(20); await __t.sleep(300); g.tp(rs.x + 1, rs.z);
    const rnd = Math.random; Math.random = () => 0;
    try { return !!(await __t.waitFor(() => __t.modal(), 2500)); } finally { Math.random = rnd; }
  `);
  check('dirty uniform: only caught once per session', !dirty2 && await state(`s.stats.conduct === ${c2 - 3}`));
  await evaluate(`__g.today.dirty = false`);

  // quiet zones + chat
  await ev(`__g.tp(-29, -18); await __t.sleep(200); await __t.chat('xin chào cả lớp');`);
  check('quiet zone: no talking in the classroom', (await evaluate(`__t.toast()`)).includes('giữ trật tự') && !(await evaluate(`__t.chatLog()`)).includes('xin chào cả lớp'));
  await ev(`__g.tp(14, -17); await __t.sleep(200); await __t.chat('alo thư viện');`);
  check('quiet zone: no talking in the library', (await evaluate(`__t.toast()`)).includes('Thư viện') && !(await evaluate(`__t.chatLog()`)).includes('alo thư viện'));
  await ev(`__g.tp(-8, 6); await __t.sleep(200); await __t.chat('chào mọi người vcl');`);
  const log = await evaluate(`__t.chatLog()`);
  check('yard: chat works, bad words filtered', log.includes('chào mọi người ***') && !log.includes('vcl'), log);
  await shot('free-time');

  // 🔊 button: on → effects only → off → on, remembered in localStorage
  const ambFree = await ambienceIs('yard');
  check('ambience: yard in free time', ambFree.playing === 'yard', ambFree);
  const modes = await ev(`
    const b = document.getElementById('btnSound'), out = [];
    const snap = () => ({ mode: __g.audio.mode, icon: b.textContent, stored: localStorage.getItem('tho-sound'), playing: __g.audio.playing, state: __g.audio.state });
    b.click(); await __t.waitFor(() => __g.audio.playing === null, 2000); out.push(snap());
    b.click(); await __t.waitFor(() => __g.audio.state === 'suspended', 2000); out.push(snap());
    b.click(); await __t.waitFor(() => __g.audio.state === 'running' && __g.audio.playing === 'yard', 3000); out.push(snap());
    return out;
  `);
  check('sound button: on → effects only (no ambience)', modes[0].mode === 'sfx' && modes[0].icon === '🔉' && modes[0].stored === 'sfx' && modes[0].playing === null && modes[0].state === 'running', modes[0]);
  check('sound button: effects only → off (context suspended)', modes[1].mode === 'off' && modes[1].icon === '🔇' && modes[1].stored === 'off' && modes[1].playing === null && modes[1].state === 'suspended', modes[1]);
  check('sound button: off → on (ambience back)', modes[2].mode === 'on' && modes[2].icon === '🔊' && modes[2].stored === 'on' && modes[2].playing === 'yard' && modes[2].state === 'running', modes[2]);
  await evaluate(`document.getElementById('btnSound').click()`); // leave it on "effects only" to check it survives a reload

  // end of the 6 hours → after school → home → summary
  await evaluate(`__g.endSession()`);
  check('6 hours over: after-school phase', await evaluate(`__t.waitFor(() => __g.state.phase === 'after', 6000).then(Boolean)`));
  const sum1 = await walkHomeFromGate();
  check('summary: day 1 report with coco and move to 6A2', sum1 && sum1.title.includes('Hết ngày 1') && sum1.body.includes('Coco') && sum1.body.includes('Chuyển sang Lớp 6A2'), sum1?.body);
  await shot('summary-day1');
  await ev(`await __t.click('Về nhà nghỉ ngơi'); await __t.play({ idle: 1200 });`);
  check('6A1 → 6A2: section 2, day 2, home', await state(`s.section === 2 && s.day === 2 && s.phase === 'home' && __g.npcs.classTeacher.grade === 2`));
  check('6A2: mum swapped every set to the new colour, all clean', await state(`s.uniform.clean === 2 && s.uniform.dirty === 0 && s.uniform.washing === 0`), await state('s.uniform'));
  check('day 1 not "clean" (caught) → no clean-day bonus', await state(`!s.ledger.some((l) => l.r === 'buổi ngoan')`));

  // day 2: a quick clean session to get a dirty set
  await prepHome();
  await goToSchool();
  await evaluate(`__g.endSession()`);
  const sum2 = await walkHomeFromGate();
  check('day 2: clean session bonus (+5 coco)', sum2 && sum2.body.includes('Một buổi ngoan') && await state(`s.ledger.some((l) => l.r === 'buổi ngoan')`), sum2?.body);
  await ev(`await __t.click('Về nhà nghỉ ngơi'); await __t.play({ idle: 1200 });`);
  check('day 3: one dirty set + one clean spare', await state(`s.day === 3 && s.uniform.dirty === 1 && s.uniform.clean === 1`), await state('s.uniform'));

  // wash + wear the spare
  await ev(`await __t.act('home-wardrobe', 'Tủ quần áo'); await __t.click('Giặt 1 bộ dơ');`);
  check('wash: 1 set in the machine for 15 real minutes', await state(`s.uniform.washing === 1 && s.uniform.dirty === 0 && Math.abs(s.uniform.until - Date.now() - 15 * 60e3) < 5000`));
  check('wardrobe label shows the wash timer', (await ev(`__g.tp(0, 0); await __t.sleep(200); const h = __g.W.hotspots.find((h) => h.id === 'home-wardrobe'); __g.tp(h.x, h.z); return await __t.waitFor(() => { const b = document.getElementById('actBtn'); return !b.hidden && b.textContent; });`)).includes('🧺'));
  await ev(`await __t.act('home-wardrobe', 'Tủ quần áo'); await __t.click('Mặc đồng phục sạch');`);
  check('spare uniform worn while the other is washing', await state(`t.dressed && !t.dirty && s.uniform.clean === 0 && s.uniform.washing === 1`));
  await evaluate(`__g.finishWash()`);
  check('finishWash: washed set back on the clean pile', await evaluate(`__t.waitFor(() => __g.state.uniform.clean === 1 && __g.state.uniform.washing === 0, 4000).then(Boolean)`));
  check('wash done toast', (await evaluate(`__t.waitFor(() => __t.toast().includes('giặt xong'), 3000).then(() => __t.toast())`) || '').includes('giặt xong'));

  // jump to the last class of grade 6 (debug) and finish it → grade 7
  await evaluate(`(() => { const s = __g.state; for (const k of Object.keys(s.progress)) s.progress[k] = 5; s.progress['dia-phuong'] = 4; s.section = 4; })()`);
  await prepHome({ dress: null });
  await goToSchool();
  check('6A4: timetable is the last open subject', await state(`t.subjects.every((id) => id === 'dia-phuong')`));
  await evaluate(`__g.skip(31)`);
  await evaluate(`__t.waitFor(() => __g.sub === 'class', 5000)`);
  await sitInClass();
  await evaluate(`__g.endSession()`); // the session ends right after this period
  await ev(`return await __t.play({ idle: 2500 });`);
  check('6A4: last subject finished', await state(`s.progress['dia-phuong'] === 5`));
  const sum3 = await walkHomeFromGate();
  check('summary day 3 shown', !!sum3);
  await ev(`await __t.click('Về nhà nghỉ ngơi');`);
  const promo = await ev(`return await __t.waitFor(() => { const m = __t.modal(); return m && m.title.includes('Lên lớp') && m; }, 6000);`);
  check('promotion dialog: grade 7', promo && promo.title.includes('Lên lớp 7'), promo);
  await shot('promotion');
  await ev(`await __t.play({ idle: 1200 });`);
  check('7A1: grade 7, section 1, progress reset', await state(`s.grade === 7 && s.section === 1 && Object.values(s.progress).every((v) => v === 0)`));
  check('7A1: classrooms renamed', await evaluate(`__g.W.zones.find((z) => z.id === 'class1').name`) === 'Lớp 7A1');
  check('7A1: uniforms swapped to the new colour (2 clean sets)', await state(`s.uniform.clean === 2 && s.uniform.dirty === 0`), await state('s.uniform'));

  // game closed for more than 6 hours while at school
  await prepHome();
  await goToSchool();
  const day = await state('s.day');
  const closed = await state(`JSON.parse(JSON.stringify(s))`);
  closed.sessionStart -= 7 * 3600e3;
  closed.sessionEnd = Date.now() - 3600e3;
  await installSaveAndReload(closed);
  check('reload: continue box shows the saved student', (await evaluate(`document.getElementById('continueBox').hidden ? '' : document.getElementById('continueInfo').textContent`)).includes('7A1'));
  const keptMode = await evaluate(`({ mode: __g.audio.mode, icon: document.getElementById('btnSound').textContent, state: __g.audio.state })`);
  check('sound mode "effects only" remembered after reload, no audio before a tap', keptMode.mode === 'sfx' && keptMode.icon === '🔉' && keptMode.state === 'none', keptMode);
  await evaluate(`(() => { const b = document.getElementById('btnSound'); b.click(); b.click(); return localStorage.getItem('tho-sound'); })()`); // sfx → off → on
  await evaluate(`document.getElementById('btnContinue').click()`);
  const away = await ev(`return await __t.waitFor(() => { const m = __t.modal(); return m && m.title.includes('Hết ngày') && m; }, 8000);`);
  check('closed >6h: session closed on load, summary shown', away && away.title.includes(`Hết ngày ${day}`), away);
  check('closed >6h: walked home toast', (await evaluate(`__t.toast()`)).includes('vắng mặt'));
  await ev(`await __t.play({ idle: 1200 });`);
  check('closed >6h: home, next day', await state(`s.phase === 'home' && s.day === ${day + 1} && s.sessionEnd === 0`));

  // re-enter in the middle of a session
  await prepHome();
  await goToSchool();
  await evaluate(`__g.skip(31)`);
  await evaluate(`__t.waitFor(() => __g.sub === 'class', 5000)`);
  await sitInClass();
  await ev(`return await __t.play({ idle: 2500 });`);
  check('mid-session: 2 periods done, break', await state(`t.done === 2 && __g.sub === 'break'`));
  await evaluate(`Storage.prototype.setItem = function () {}`); // keep the save written after period 2
  await reload();
  await evaluate(`document.getElementById('btnContinue').click()`);
  check('re-enter: back at school before the next bell', await evaluate(`__t.waitFor(() => __g.state && __g.state.phase === 'school' && __g.sub === 'preBell', 8000).then(Boolean)`));
  check('re-enter: "quay lại trường" message', (await evaluate(`__t.chatLog()`)).includes('quay lại trường'));
  await evaluate(`__g.skip(21)`);
  check('re-enter: continues with period 3', await evaluate(`__t.waitFor(() => __g.sub === 'class' && __g.today.period === 2, 5000).then(Boolean)`));
  await shot('re-enter');

  // migrate a v1 save
  const look = await state('s.look');
  const v1 = {
    v: 1, name: 'Cũ V1', school: 'THCS Sao Mai', look, grade: 6, day: 3, phase: 'school', clock: 600, rot: 2,
    progress: { toan: 5, van: 2, anh: 0, khtn: 5, 'su-dia': 0, gdcd: 1, 'cong-nghe': 0, tin: 5, 'the-duc': 0, 'nghe-thuat': 0, 'trai-nghiem': 0, 'dia-phuong': 0 },
    stats: { conduct: 82, energy: 60, mood: 70, money: 37 }, prepared: { uniform: false },
    answered: 20, correct: 15, lateCount: 0, loiterCount: 0, tags: [], counselSinceTag: 0, graduated: false, today: { breakfast: true },
  };
  await installSaveAndReload(v1);
  check('migrate v1: continue box shows class 6A2', (await evaluate(`document.getElementById('continueInfo').textContent`)).includes('6A2'));
  await evaluate(`document.getElementById('btnContinue').click()`);
  await evaluate(`__t.waitFor(() => __g.state && __g.state.phase === 'home' && __g.today, 8000)`);
  check('migrate v1→v3: v3, money → 37 coco, dirty uniform, ledger/inv', await state(`s.v === 3 && s.coco === 37 && !('money' in s.stats) && s.uniform.dirty === 1 && s.uniform.clean === 0 && Array.isArray(s.ledger) && s.inv && s.prankCount === 0`), await state('s'));
  check('migrate v1→v3: section from progress, starts at home with a new day', await state(`s.section === 2 && s.phase === 'home' && t.earned === 0 && Array.isArray(t.packed) && !('prepared' in s)`));
  await shot('migrated-home');

  // service worker caches the mods
  const sw = await ev(`
    await navigator.serviceWorker.ready;
    const src = await (await fetch('sw.js', { cache: 'no-store' })).text();
    const version = /VERSION = '([^']+)'/.exec(src)[1];
    const c = await caches.open(version);
    const keys = (await c.keys()).map((r) => new URL(r.url).pathname);
    return { version, has: (await caches.keys()).includes(version), mods: keys.filter((k) => k.startsWith('/mods/')), n: keys.length };
  `);
  check('service worker: cache has mods/index.json + base.json', sw.has && sw.mods.includes('/mods/index.json') && sw.mods.includes('/mods/base.json'), sw);

  await sleep(500);
  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 10).join(' | '));
}

let crashed = null;
try {
  await run();
} catch (e) {
  crashed = e;
  check('test run completed without crashing', false, e.stack || String(e));
  try { await shot('crash'); } catch { /* ignore */ }
}
try { await cdp?.send('Browser.close'); } catch { /* ignore */ }
cdp?.close();
await sleep(500);
if (edge && edge.exitCode === null) {
  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* already gone */ }
  } else {
    try { edge.kill('SIGKILL'); } catch { /* already gone */ }
  }
}
await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* Edge may still hold files */ }
writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ label, pass, fail, results, consoleErrors }, null, 2));
console.log(`e2e ${label}: ${pass}/${pass + fail} passed${crashed ? ' (crashed)' : ''} — screenshots in ${OUT}`);
process.exit(fail ? 1 : 0);
