// Save format (state.v = 3), migrations, localStorage + online backup.
import { HAIRS, SKINS } from './chars.js';
import { CLASS_GROUPS, POINTS_TO_PASS, SUBJECTS } from './subjects.js';
import * as cloud from './cloud.js';
import { G, pick } from './ctx.js';

export const SAVE_KEY = 'truong-hoc-online-v1'; // storage key kept; the save format version is `state.v`

export function newState(name, school, girl) {
  return {
    v: 3, name, school,
    look: { girl, skin: pick(SKINS), hair: pick(HAIRS) },
    grade: 6, section: 1, day: 1, phase: 'home', clock: 360,
    progress: Object.fromEntries(SUBJECTS.map((s) => [s.id, 0])),
    stats: { conduct: 80, energy: 80, mood: 70 },
    coco: 20, ledger: [], inv: {}, acc: null, // coco wallet (economy.js), items owned, worn accessory
    answered: 0, correct: 0, lateCount: 0, loiterCount: 0, prankCount: 0,
    tags: [], counselSinceTag: 0, graduated: false,
    uniform: { clean: 1, dirty: 0, washing: 0, until: 0 }, // sets of the class uniform; until = real ms
    homeAt: Date.now(), sessionStart: 0, sessionEnd: 0,
    today: null,
  };
}
// One "day" = one home visit + the following 6-hour school session.
export function newToday() {
  return {
    breakfast: false, lunchbox: false, dressed: false, scarf: false, bag: false, dirty: false,
    subjects: [], period: 0, done: 0, gained: 0, loiter: 0, afterAt: 0,
    bullyDone: false, challenge: false, meeting: false, ordered: false, readBreak: false, playedBreak: false,
    libFree: false, reportedTeacher: false, skipped: 0, lateToClass: 0, caughtDirty: false,
    studied: false, napped: false, tv: false,
    earned: 0, packed: [], pranks: 0, victims: {},
  };
}
// v1 (day of 4 phases, evening at home) → v2 (6-hour real-time sessions, classes A1–A4)
export function migrate(s) {
  if (s.v === 1) {
    s.v = 2;
    s.section = firstOpenSection(s.progress);
    s.uniform = { state: s.prepared?.uniform === false ? 'dirty' : 'clean', until: 0 };
    s.phase = 'home';
    s.homeAt = Date.now();
    s.sessionStart = s.sessionEnd = 0;
    s.today = null;
    delete s.prepared;
    delete s.rot;
  }
  // v2 → v3: coco wallet + inventory, uniform as a count of sets
  if (s.v === 2) {
    s.v = 3;
    s.coco = Math.max(0, s.stats?.money ?? 20);
    delete s.stats.money;
    s.ledger = [];
    s.inv = {};
    s.acc = null;
    s.prankCount = 0;
    const u = s.uniform || {};
    s.uniform = { clean: u.state === 'clean' ? 1 : 0, dirty: u.state === 'dirty' ? 1 : 0, washing: u.state === 'washing' ? 1 : 0, until: u.until || 0 };
    if (s.today) Object.assign(s.today, { earned: 0, packed: [], pranks: 0, victims: {} });
  }
  return s.v === 3 ? s : null;
}
function firstOpenSection(progress) {
  const g = CLASS_GROUPS.find((c) => c.subjects.some((id) => (progress[id] ?? 0) < POINTS_TO_PASS));
  return g ? g.sec : 4;
}
export function save() {
  if (G.movedAway) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.state)); } catch { /* storage unavailable */ }
  cloud.scheduleSave(G.state); // online backup (debounced); no-op without a backend
}
export function load() { try { return migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { return null; } }
export function initSaveHooks() {
  addEventListener('visibilitychange', () => { // phones close apps without warning
    if (!document.hidden || !G.state || G.movedAway) return;
    save();
    cloud.scheduleSave(G.state, true);
    cloud.syncCoco(G.state);
  });
}
