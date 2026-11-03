// Fuzz the question generator: every subject × grade 6–9 × N calls of makeQuestion() must give
// exactly 4 distinct, non-empty options with the correct answer among them.
// Usage: node tests/fuzz-questions.mjs [iterations=2000]
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
// js/subjects.js has no imports and no browser dependencies, so it can be loaded straight from the repo.
const { SUBJECTS, CLASS_GROUPS, makeQuestion } = await loadEsm(path.join(repo, 'js', 'subjects.js'));

// Node decides ESM vs CommonJS for .js files from the nearest package.json. The repo root has none, so Node 22+
// detects ESM syntax automatically ("module syntax detection"); fall back to a data: URL if that is unavailable.
async function loadEsm(file) {
  try {
    return await import(pathToFileURL(file).href);
  } catch (e) {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(file, 'utf8');
    return import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
  }
}

const N = Number(process.argv[2]) || 2000;
let checks = 0, fails = 0;
const failures = [];
function fail(msg) { fails++; if (failures.length < 30) failures.push(msg); }

// class groups cover all 12 subjects exactly once
checks++;
const grouped = CLASS_GROUPS.flatMap((g) => g.subjects).sort().join();
const all = SUBJECTS.map((s) => s.id).sort().join();
if (grouped !== all) fail(`CLASS_GROUPS do not cover SUBJECTS exactly: ${grouped} vs ${all}`);

for (const s of SUBJECTS) {
  for (const grade of [6, 7, 8, 9]) {
    const seen = new Set();
    for (let i = 0; i < N; i++) {
      checks++;
      let q;
      try { q = makeQuestion(s.id, grade, new Set()); } catch (e) { fail(`${s.id} g${grade}: threw ${e.message}`); continue; }
      const where = `${s.id} g${grade}: "${q?.q}"`;
      if (!q || typeof q.q !== 'string' || !q.q.trim()) { fail(`${where}: empty question`); continue; }
      if (!Array.isArray(q.options) || q.options.length !== 4) { fail(`${where}: ${q.options?.length} options`); continue; }
      if (q.options.some((o) => typeof o !== 'string' || !o.trim())) { fail(`${where}: empty/non-string option ${JSON.stringify(q.options)}`); continue; }
      if (new Set(q.options).size !== 4) { fail(`${where}: duplicate options ${JSON.stringify(q.options)}`); continue; }
      if (!q.options.includes(q.answer)) { fail(`${where}: answer "${q.answer}" not in options`); continue; }
      seen.add(q.q);
    }
    // the "avoid" set must be honoured while fresh questions remain
    checks++;
    const avoid = new Set();
    const a = makeQuestion(s.id, grade, avoid);
    avoid.add(a.q);
    if (s.id !== 'toan' && s.id !== 'anh' && seen.size > 1) {
      const b = makeQuestion(s.id, grade, avoid);
      if (b.q === a.q) fail(`${s.id} g${grade}: avoid set ignored ("${a.q}" repeated)`);
    }
  }
}

for (const f of failures) console.log('FAIL', f);
console.log(`fuzz-questions: ${checks - fails}/${checks} passed (${SUBJECTS.length} subjects × 4 grades × ${N})`);
process.exit(fails ? 1 : 0);
