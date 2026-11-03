// Online features on top of the local save (all optional; the game always works offline):
//  - backup of the save to Supabase (`saves`), which also feeds the school leaderboard
//  - transfer code: move progress to another device (iPhone app ↔ Safari do not share storage)
//  - coco wallet sync: every local change is queued as an op and replayed on the server (`coco_apply`),
//    the server balance is authoritative
import * as be from './backend.js';

const META = 'tho-cloud';
const OPS = 'tho-coco-ops';
const MAX_OPS = 500;
const PUSH_DEBOUNCE_MS = 20_000;

function read(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
const meta = () => read(META, {});
const setMeta = (patch) => write(META, { ...meta(), ...patch });

export const enabled = be.enabled;

let hooks = { onTransferredAway: () => {} };
export function initCloud(h) { hooks = { ...hooks, ...h }; }

// ---------------- coco ops queue

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
const readOps = () => read(OPS, []);
// Local balance change not yet confirmed by the server.
const pendingDelta = (ops = readOps()) => ops.reduce((s, o) => s + (o.d ?? 0), 0);

// Called by economy.js for every change: { kind: earn|spend|lose, n, reason, item_id? }, d = signed local delta.
export function queueCoco(op) {
  if (!be.enabled()) return;
  const ops = readOps();
  ops.push({ op_id: newId(), ...op });
  write(OPS, ops.slice(-MAX_OPS));
}

let syncing = false;
// Replay queued ops on the server and adopt the server balance. Returns the new balance or null.
export async function syncCoco(state) {
  if (!be.enabled() || !state || syncing) return null;
  syncing = true;
  try {
    let ops = readOps();
    if (!meta().imported) {
      // first sync on this account: carry over the balance earned before the server existed (once, capped there)
      ops.unshift({ op_id: newId(), kind: 'import', n: Math.max(0, state.coco - pendingDelta(ops)), reason: 'chuyển số dư trên máy', d: 0 });
      write(OPS, ops);
      setMeta({ imported: true });
    }
    if (!ops.length && meta().synced) return null;
    const batch = ops.slice(0, 100);
    const res = await be.rpc('coco_apply', { ops: batch.map(({ d, ...o }) => o) });
    if (!res || typeof res.balance !== 'number') return null;
    const sent = new Set(batch.map((o) => o.op_id));
    const left = readOps().filter((o) => !sent.has(o.op_id)); // ops queued while the request was in flight stay
    write(OPS, left);
    setMeta({ synced: true });
    state.coco = Math.max(0, res.balance + pendingDelta(left));
    if (left.length >= 100) return syncCoco(state);
    return state.coco;
  } finally {
    syncing = false;
  }
}

// Server prices win over mod prices (the admin page can change them); unknown / disabled items are hidden.
export async function shopPrices() {
  if (!be.enabled()) return null;
  const r = await be.rest('shop_items?select=id,price,enabled');
  return r?.ok && Array.isArray(r.data) ? new Map(r.data.map((x) => [x.id, x])) : null;
}

// ---------------- save backup

let pushTimer = 0;
let pushing = false;
export function scheduleSave(state, now = false) {
  if (!be.enabled() || !state) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushSave(state), now ? 0 : PUSH_DEBOUNCE_MS);
}

export async function pushSave(state) {
  if (!be.enabled() || !state || pushing) return false;
  pushing = true;
  try {
    const body = { data: state, v: state.v };
    let r;
    if (meta().pushed) {
      // update only: if the row is gone, this account's progress was moved to another device
      r = await be.rest(`saves?user_id=eq.${be.userId()}&select=user_id`, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } });
      if (r?.ok && Array.isArray(r.data) && r.data.length === 0) {
        transferredAway();
        return false;
      }
    } else {
      r = await be.rest('saves?on_conflict=user_id', { method: 'POST', body: { user_id: be.userId(), ...body }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
      if (r?.ok) setMeta({ pushed: true });
    }
    if (r?.ok) setMeta({ lastPush: Date.now() });
    return !!r?.ok;
  } finally {
    pushing = false;
  }
}

function transferredAway() {
  be.forgetSession();
  write(OPS, []);
  write(META, {});
  hooks.onTransferredAway();
}

// ---------------- transfer between devices

// Make sure the server has the latest save, then get an 8-character code (valid 15 minutes).
export async function createTransferCode(state) {
  if (!be.enabled()) return { error: 'offline' };
  await syncCoco(state);
  if (!(await pushSave(state))) return { error: 'network' };
  const code = await be.rpc('create_transfer_code');
  return typeof code === 'string' ? { code } : { error: 'network' };
}

// Take over the progress of another device. Returns { save } or { error }.
export async function claimTransferCode(code) {
  if (!be.enabled()) return { error: 'offline' };
  const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 8) return { error: 'invalid' };
  const r = await be.rest('rpc/claim_transfer_code', { method: 'POST', body: { p_code: clean } });
  if (!r) return { error: 'network' };
  if (!r.ok) return { error: /too many/.test(JSON.stringify(r.data)) ? 'too-many' : 'network' };
  if (!r.data?.ok) return { error: r.data?.reason === 'same-device' ? 'same-device' : 'invalid' };
  write(OPS, []);
  write(META, { imported: true, pushed: true, synced: false });
  return { save: r.data.save };
}

// ---------------- leaderboard

export async function leaderboard(school) {
  if (!be.enabled()) return null;
  const r = await be.rest('rpc/leaderboard', { method: 'POST', body: { p_school: school ?? null, p_limit: 20 } });
  return r?.ok && Array.isArray(r.data) ? r.data : null;
}
