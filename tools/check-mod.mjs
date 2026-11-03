// Check a mod pack before it goes into mods/ (segment A5). Runs the game's own validatePack() and adds content
// checks for the human reviewer (see MODDING.md "Nội dung được duyệt").
//
//   node tools/check-mod.mjs <pack.json | https://raw.githubusercontent.com/...> [more packs...]
//
// Exit code 1 if any pack has an error (invalid JSON, validatePack error, price > 500, link, e-mail, phone number,
// banned word, pack id already used by another pack). Warnings (exit 0): item id also in base.json, pack not in
// mods/index.json or sw.js FILES. Every player-visible string is printed so a person can review the content.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { validatePack } = await import(pathToFileURL(path.join(ROOT, 'js', 'items.js')).href);

// Copy of BAD_WORDS in js/game.js (chat filter). Keep in sync by hand: game.js is not imported here because it
// needs a browser (DOM, three.js).
const BAD_WORDS = ['đm', 'đmm', 'dmm', 'vcl', 'vl', 'đéo', 'địt', 'cặc', 'lồn', 'đĩ', 'cmm', 'clgt'];
const MAX_PRICE = 500;

const URL_RE = /(https?:\/\/|www\.|\b[\w-]+\.(com|net|org|vn|io|me|gg|ly|co|xyz|info|app|dev|link|site|online|shop|store|tv|tk|ml|ga|cf)\b)/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /(\+?\d[\s.\-]?){9,}/; // 9+ digits, maybe separated by spaces / dots / dashes

// Player-visible text of a raw (not yet validated) pack: [{ where, field, text }]
function visibleStrings(raw) {
  const out = [];
  const add = (where, field, v) => { if (typeof v === 'string' && v.trim()) out.push({ where, field, text: v }); };
  add('pack', 'name', raw.name);
  add('pack', 'author', raw.author);
  (Array.isArray(raw.items) ? raw.items : []).forEach((it, i) => {
    if (!it || typeof it !== 'object') return;
    const where = `items[${i}]${typeof it.id === 'string' ? ' ' + it.id : ''}`;
    for (const f of ['name', 'desc', 'icon', 'verb']) add(where, f, it[f]);
    if (Array.isArray(it.lines)) it.lines.forEach((l, j) => add(where, `lines[${j}]`, l));
  });
  return out;
}

function badWordsIn(text) {
  const tokens = text.normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return [...new Set(tokens.filter((t) => BAD_WORDS.includes(t)))];
}

function contentFlags(raw) {
  const flags = [];
  for (const { where, field, text } of visibleStrings(raw)) {
    const at = `${where} "${field}"`;
    if (EMAIL_RE.test(text)) flags.push(`${at}: có địa chỉ e-mail — không được ghi thông tin cá nhân`);
    else if (URL_RE.test(text)) flags.push(`${at}: có đường link / tên miền — không được quảng cáo, gắn link`);
    if (PHONE_RE.test(text)) flags.push(`${at}: có dãy số giống số điện thoại — không được ghi thông tin cá nhân`);
    const bad = badWordsIn(text);
    if (bad.length) flags.push(`${at}: có từ cấm (${bad.join(', ')})`);
  }
  (Array.isArray(raw.items) ? raw.items : []).forEach((it, i) => {
    if (it && typeof it === 'object' && typeof it.price === 'number' && it.price > MAX_PRICE) {
      flags.push(`items[${i}] ${it.id ?? ''}: giá ${it.price} > ${MAX_PRICE} coco (game sẽ tự hạ về ${MAX_PRICE})`);
    }
  });
  return flags;
}

async function readPack(src) {
  if (/^https?:\/\//i.test(src)) {
    if (!/^https:\/\//i.test(src)) throw new Error('chỉ nhận link https://');
    const res = await fetch(src);
    if (!res.ok) throw new Error(`tải về lỗi HTTP ${res.status}`);
    return { text: await res.text(), file: decodeURIComponent(new URL(src).pathname.split('/').pop() || 'pack.json') };
  }
  return { text: readFileSync(src, 'utf8'), file: path.basename(src) };
}

// Other packs in mods/ (id → file), to catch a pack id that is already taken.
function otherPacks() {
  const map = new Map();
  for (const f of readdirSync(path.join(ROOT, 'mods'))) {
    if (!f.endsWith('.json') || f === 'index.json') continue;
    try {
      const id = JSON.parse(readFileSync(path.join(ROOT, 'mods', f), 'utf8')).id;
      if (typeof id === 'string') map.set(id.trim(), f);
    } catch { /* a broken pack is reported when it is checked itself */ }
  }
  return map;
}

function readIndex() {
  try { return JSON.parse(readFileSync(path.join(ROOT, 'mods', 'index.json'), 'utf8')).packs || []; } catch { return []; }
}

async function checkOne(src) {
  const errors = [];
  const warnings = [];
  console.log(`\n=== ${src}`);
  let raw, file;
  try {
    const r = await readPack(src);
    file = r.file;
    raw = JSON.parse(r.text.replace(/^﻿/, ''));
  } catch (e) {
    errors.push(`không đọc được file JSON: ${e.message}`);
    return report(errors, warnings);
  }

  const { pack, items, errors: vErrors } = validatePack(raw, file);
  errors.push(...vErrors);
  if (!pack) return report(errors, warnings);
  errors.push(...contentFlags(raw));

  const taken = otherPacks().get(pack.id);
  if (taken && taken !== file) errors.push(`id pack "${pack.id}" đã có ở mods/${taken} — chọn id khác`);

  if (pack.id !== 'base') {
    const base = validatePack(JSON.parse(readFileSync(path.join(ROOT, 'mods', 'base.json'), 'utf8')), 'base.json');
    const baseIds = new Set(base.items.map((it) => it.id.split(':')[1]));
    for (const it of items) {
      const iid = it.id.split(':')[1];
      if (baseIds.has(iid)) warnings.push(`món "${iid}" trùng id với đồ gốc (mods/base.json) — dễ nhầm, nên đổi id`);
    }
  }

  // Items as the game will show them (after validatePack: trimmed, clamped).
  console.log(`Pack: ${pack.id} — "${pack.name}"${pack.author ? ` · tác giả: ${pack.author}` : ''} · version ${pack.version} · ${items.length} món`);
  console.log('Chữ người chơi sẽ thấy (người duyệt đọc kỹ theo MODDING.md, mục "Nội dung được duyệt"):');
  for (const it of items) {
    let extra = '';
    if (it.type === 'food') extra = ` · ${it.where === 'home' ? 'ăn sáng ở nhà' : 'căng tin'} · năng lượng ${it.energy} · tâm trạng ${it.mood}`;
    if (it.type === 'uniform') extra = ` · ${it.count} bộ`;
    if (it.type === 'accessory') extra = ` · ${it.kind} ${it.color}`;
    if (it.type === 'toy') extra = ` · ${it.uses} lần · vui ${it.fun} · bị bắt ${it.catch} · ${it.fx.kind} ${it.fx.color}`;
    console.log(`  - ${it.icon} ${it.name}  [${it.id}, ${it.type}] ${it.price} coco${extra}`);
    if (it.desc) console.log(`      mô tả: ${it.desc}`);
    if (it.type === 'toy') {
      console.log(`      nút: ${it.verb}`);
      for (const l of it.lines) console.log(`      bạn bị chọc nói: ${l}`);
    }
  }

  if (!/^[a-z0-9-]+\.json$/.test(file)) {
    errors.push(`tên file "${file}" chỉ được gồm chữ thường, số, gạch ngang và đuôi .json`);
  } else {
    if (!readIndex().includes(file)) warnings.push(`"${file}" chưa có trong mods/index.json — game sẽ không đọc pack này (người quản lý thêm sau khi duyệt)`);
    const sw = readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    if (!sw.includes(`'mods/${file}'`)) warnings.push(`"mods/${file}" chưa có trong FILES của sw.js — app cài trên điện thoại sẽ không có pack này khi offline (thêm vào FILES, chủ dự án tăng VERSION lúc gộp)`);
  }
  return report(errors, warnings);
}

function report(errors, warnings) {
  for (const w of warnings) console.log(`CẢNH BÁO: ${w}`);
  for (const e of errors) console.log(`LỖI: ${e}`);
  console.log(errors.length ? `=> KHÔNG ĐẠT: ${errors.length} lỗi` : `=> ĐẠT kiểm tra tự động${warnings.length ? ` (${warnings.length} cảnh báo)` : ''} — vẫn cần người duyệt nội dung`);
  return errors.length === 0;
}

// process.exitCode, not process.exit(): exiting while fetch() sockets are closing crashes Node on Windows.
const args = process.argv.slice(2);
if (!args.length) {
  console.log('Cách dùng: node tools/check-mod.mjs <pack.json | https://...raw.../pack.json> [pack khác...]');
  process.exitCode = 2;
} else {
  let ok = true;
  for (const a of args) ok = (await checkOne(a)) && ok;
  console.log('\nNhắc: pack được nhận vào mods/ → chạy `node supabase/gen-seed.mjs` để cập nhật cửa hàng trên server (seed.sql).');
  process.exitCode = ok ? 0 : 1;
}
