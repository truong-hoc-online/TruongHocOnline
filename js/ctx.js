// Shared context for the game modules: mutable game state (G), small helpers that read it.
import { POINTS_TO_PASS, SUBJECTS } from './subjects.js';

// ES module bindings are read-only for importers, so everything that several modules reassign lives in G.

export const TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

export const G = {
  state: null,
  player: null, meLabel: null,
  camDist: 16,           // camera distance
  movedAway: false,      // progress was moved to another device (transfer code)
  busy: false,
  sitting: false,
  sub: '',               // school sub-state: preBell | class | break | free | done
  classStart: 0,         // play-seconds when the current period started
  breakStart: 0,
  preBellUntil: 0,
  bullyAt: 0, bullyActive: false,
  guardUntil: 0,
  washNotified: false,
  now: 0,                // seconds of unpaused play
  prankTarget: null,
  currentAction: null,
};

const rnd = (n) => Math.floor(Math.random() * n);
export const pick = (a) => a[rnd(a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
export const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const hhmm = (ms) => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m} phút`; };

export const has = (tag) => G.state.tags.includes(tag);
export function addStat(k, d) {
  G.state.stats[k] = clamp(G.state.stats[k] + d, 0, 100);
}
export function conductName(c) { return c >= 80 ? 'Tốt' : c >= 65 ? 'Khá' : c >= 50 ? 'Trung bình' : 'Yếu'; }
export const accuracy = () => (G.state.answered ? G.state.correct / G.state.answered : 0);

export const subj = (id) => SUBJECTS.find((s) => s.id === id);
export const cls = () => `${G.state.grade}A${G.state.section}`;
export const isDone = (id) => G.state.progress[id] >= POINTS_TO_PASS;
