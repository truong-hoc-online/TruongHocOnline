// Coco 🥥 wallet. Today the balance lives in the local save; every change goes through these functions and
// is written to a small ledger, so the same calls can later be moved to the server (Supabase) unchanged.
// Selling coco for real money is NOT enabled: coco is only earned by studying (see CLAUDE.md).

export const EARN_CAP_PER_DAY = 40; // coco earned from play per day (one home visit + school session)
export const EARN = { correct: 1, cleanDay: 5, subjectDone: 5 };
const LEDGER_MAX = 100;

function log(state, delta, reason) {
  state.ledger.push({ t: Date.now(), d: delta, r: reason, b: state.coco });
  if (state.ledger.length > LEDGER_MAX) state.ledger.splice(0, state.ledger.length - LEDGER_MAX);
}

// Earn from play, limited per day. Returns how much was actually added.
export function earn(state, n, reason) {
  const room = Math.max(0, EARN_CAP_PER_DAY - (state.today?.earned ?? 0));
  const add = Math.max(0, Math.min(n, room));
  if (!add) return 0;
  state.coco += add;
  if (state.today) state.today.earned = (state.today.earned ?? 0) + add;
  log(state, add, reason);
  return add;
}

// Spend; false (and nothing changes) when the balance is too low.
export function spend(state, n, reason) {
  if (n < 0 || state.coco < n) return false;
  if (n === 0) return true;
  state.coco -= n;
  log(state, -n, reason);
  return true;
}

// Lose up to n (e.g. taken by bullies). Returns the amount lost.
export function lose(state, n, reason) {
  const l = Math.min(n, state.coco);
  if (l > 0) { state.coco -= l; log(state, -l, reason); }
  return l;
}

// Buy an item from the catalogue into the inventory. Toys add `uses` charges, uniforms add clean sets.
export function buy(state, item) {
  if (!spend(state, item.price, `mua ${item.id}`)) return false;
  if (item.type === 'uniform') state.uniform.clean += item.count;
  else if (item.type === 'toy') state.inv[item.id] = (state.inv[item.id] ?? 0) + item.uses;
  else if (item.type === 'accessory') state.inv[item.id] = 1;
  return true;
}
