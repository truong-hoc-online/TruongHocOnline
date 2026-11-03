// Shared helpers for export-questions.mjs / import-questions.mjs / test-roundtrip.mjs.
// No dependencies: Node 24 built-ins only.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_DIR = path.resolve(TOOLS_DIR, '..');
export const SUBJECTS_FILE = path.join(REPO_DIR, 'js', 'subjects.js');

// Column order of the review sheet (Vietnamese headers, shown to teachers).
export const COLUMNS = [
  { key: 'id', title: 'ID' },
  { key: 'subject', title: 'Môn' },
  { key: 'grade', title: 'Lớp tối thiểu' },
  { key: 'q', title: 'Câu hỏi' },
  { key: 'a0', title: 'Đáp án đúng' },
  { key: 'a1', title: 'Sai 1' },
  { key: 'a2', title: 'Sai 2' },
  { key: 'a3', title: 'Sai 3' },
  { key: 'source', title: 'Nguồn' },
  { key: 'review', title: 'Duyệt' },
  { key: 'eq', title: 'Sửa câu hỏi' },
  { key: 'ea0', title: 'Sửa đáp án đúng' },
  { key: 'ea1', title: 'Sửa sai 1' },
  { key: 'ea2', title: 'Sửa sai 2' },
  { key: 'ea3', title: 'Sửa sai 3' },
  { key: 'note', title: 'Ghi chú' },
];

export const SOURCE_BANK = 'ngân hàng';
export const SOURCE_SAMPLE = 'tự sinh — mẫu';
export const SOURCE_NEW = 'Mới';

// Lowercase, strip Vietnamese diacritics (đ → d), collapse spaces. Used to match headers / review marks.
export function fold(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Clean a cell typed by a teacher: NFC, single spaces, no line breaks.
export function cleanText(s) {
  return String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

// ---------- reading js/subjects.js ----------

// Locate the `{ ... }` literal of `const BANK = { ... };` with a small JS-aware scanner
// (skips strings, template literals and comments). Returns [start, end) offsets of the braces.
export function locateBank(src) {
  const m = /const\s+BANK\s*=\s*\{/.exec(src);
  if (!m) throw new Error('Không tìm thấy "const BANK = {" trong subjects.js');
  const start = m.index + m[0].length - 1;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 1; if (i <= 0) break; continue; }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') {
      depth--;
      if (depth === 0) return [start, i + 1];
    }
  }
  throw new Error('BANK trong subjects.js không đóng ngoặc');
}

// Comment lines placed right after `key: [` in the BANK (e.g. the note on dia-phuong) — kept on rewrite.
export function bankComments(bankText) {
  const out = {};
  const lines = bankText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*\[\s*$/.exec(lines[i]);
    if (!m) continue;
    const key = m[1] || m[2] || m[3];
    const cm = [];
    for (let j = i + 1; j < lines.length && /^\s*\/\//.test(lines[j]); j++) cm.push(lines[j].replace(/\s+$/, ''));
    if (cm.length) out[key] = cm;
  }
  return out;
}

// Import a subjects.js source as an ES module (data: URL), exposing the private BANK as __BANK.
let importSeq = 0;
export async function loadSubjectsModule(src) {
  const code = `${src}\nexport { BANK as __BANK };\n// load ${importSeq++}\n`;
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(code));
}

export function readSubjectsSource(file = SUBJECTS_FILE) {
  return readFileSync(file, 'utf8');
}

// ---------- validation ----------

// Returns a list of Vietnamese problem descriptions (empty = valid).
export function validateQuestion(item) {
  const errs = [];
  if (!item.q || !String(item.q).trim()) errs.push('thiếu câu hỏi');
  if (!Array.isArray(item.a) || item.a.length !== 4) errs.push('cần đúng 4 đáp án (1 đúng + 3 sai)');
  else {
    item.a.forEach((x, i) => { if (!String(x ?? '').trim()) errs.push(i === 0 ? 'thiếu đáp án đúng' : `thiếu đáp án sai ${i}`); });
    const seen = new Map();
    item.a.forEach((x, i) => {
      const k = fold(x);
      if (!k) return;
      if (seen.has(k)) errs.push(`đáp án trùng nhau: "${item.a[seen.get(k)]}" và "${x}"`);
      else seen.set(k, i);
    });
  }
  const g = item.g ?? 6;
  if (!Number.isInteger(g) || g < 6 || g > 9) errs.push(`lớp tối thiểu phải là 6–9 (đang là "${item.g}")`);
  return errs;
}

// ---------- writing js/subjects.js ----------

const LS = new RegExp(String.fromCharCode(0x2028), 'g');
const PS = new RegExp(String.fromCharCode(0x2029), 'g');

export function jsString(s) {
  return "'" + String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(LS, '\\u2028')
    .replace(PS, '\\u2029') + "'";
}

const jsKey = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : jsString(k));

// Serialize the BANK object literal in the file's hand-written style (correct answer first; g omitted when 6).
export function bankLiteral(bank, comments = {}, eol = '\n') {
  const lines = ['{'];
  for (const [key, list] of Object.entries(bank)) {
    lines.push(`  ${jsKey(key)}: [`);
    for (const c of comments[key] || []) lines.push(c);
    for (const it of list) {
      const g = it.g && it.g !== 6 ? `, g: ${it.g}` : '';
      lines.push(`    { q: ${jsString(it.q)}, a: [${it.a.map(jsString).join(', ')}]${g} },`);
    }
    lines.push('  ],');
  }
  lines.push('}');
  return lines.join(eol);
}

// Canonical form used to compare two banks semantically.
export function canonicalBank(bank) {
  const out = {};
  for (const [k, list] of Object.entries(bank)) {
    out[k] = list.map((it) => ({ q: it.q, a: [...it.a], g: it.g || 6 }));
  }
  return JSON.stringify(out);
}

// ---------- CSV (RFC 4180) ----------

// Excel turns things like "1/6", "2/9/1945" or "007" into dates/numbers. Wrap them as ="..." so they stay text;
// Excel / Google Sheets show the plain value and save it back as plain text.
const EXCEL_MANGLED = /^(?:[-+−]?\d{1,4}[/.\-]\d{1,4}(?:[/.\-]\d{1,4})?|0\d+|\d{12,}|[-+]?\d+(?:[.,]\d+)?[eE][-+]?\d+)$/;

export function protectForExcel(s) {
  s = String(s ?? '');
  return EXCEL_MANGLED.test(s) ? `="${s}"` : s;
}

export function unprotectExcel(s) {
  const m = /^="(.*)"$/s.exec(s);
  return m ? m[1].replace(/""/g, '"') : s;
}

function csvField(s, delim) {
  s = String(s ?? '');
  return s.includes(delim) || /[",\r\n;]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, delim = ',') {
  return '﻿' + rows.map((r) => r.map((f) => csvField(f, delim)).join(delim)).join('\r\n') + '\r\n';
}

// Guess the delimiter from the first (header) line: comma, semicolon (Vietnamese-locale Excel) or tab.
export function detectDelimiter(text) {
  let line = '';
  let inQ = false;
  for (const c of text) {
    if (c === '"') inQ = !inQ;
    if (!inQ && (c === '\n' || c === '\r')) break;
    if (!inQ) line += c;
  }
  const count = (ch) => line.split(ch).length - 1;
  const cands = [[',', count(',')], [';', count(';')], ['\t', count('\t')]].sort((a, b) => b[1] - a[1]);
  return cands[0][1] > 0 ? cands[0][0] : ',';
}

export function parseCsv(text, delim) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  delim = delim || detectDelimiter(text);
  const rows = [];
  let row = [];
  let f = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false;
      } else f += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); rows.push(row); row = []; f = '';
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return { rows: rows.filter((r) => r.some((x) => x.trim() !== '')), delim };
}

// ---------- deterministic randomness for generated samples ----------

export function withSeededRandom(seed, fn) {
  let s = seed >>> 0;
  const orig = Math.random;
  Math.random = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = orig; }
}

// True when the module at `url` is the script being run with `node <script>`.
export function isMain(url) {
  return !!process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(url).toLowerCase();
}

// Parse "--name value" / "--name=value" / "--flag" options; the rest are positional.
export function parseArgs(argv) {
  const opts = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq > 0) opts[a.slice(2, eq)] = a.slice(eq + 1);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--') && !['write', 'help'].includes(a.slice(2))) opts[a.slice(2)] = argv[++i];
    else opts[a.slice(2)] = true;
  }
  return { opts, pos };
}
