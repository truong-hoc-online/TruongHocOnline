// Item catalogue loaded from data-only packs in mods/ (see MODDING.md).
// Packs never run code: every field is type-checked, clamped and copied; unknown fields are dropped.
// Text is always shown through esc(), so a pack cannot inject HTML.

export const TYPES = ['food', 'uniform', 'accessory', 'toy'];
export const ACC_KINDS = ['cap', 'bow', 'glasses', 'headband'];
export const FX_KINDS = ['spray', 'blob', 'confetti'];
const SLUG = /^[a-z0-9][a-z0-9-]{1,31}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, lo, hi, def) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
const int = (v, lo, hi, def) => Math.round(num(v, lo, hi, def));
const icon = (v) => [...str(v, 16)].slice(0, 2).join('') || '📦';

// Validate one pack object. Returns { pack, items, errors } — invalid items are skipped, not fatal.
export function validatePack(raw, file = '?') {
  const errors = [];
  if (!raw || typeof raw !== 'object') return { pack: null, items: [], errors: [`${file}: không phải JSON object`] };
  const id = str(raw.id, 32);
  if (!SLUG.test(id)) return { pack: null, items: [], errors: [`${file}: "id" phải là chữ thường/số/gạch ngang (2–32 ký tự)`] };
  const pack = { id, name: str(raw.name, 40) || id, author: str(raw.author, 40), version: int(raw.version, 1, 9999, 1) };
  const list = Array.isArray(raw.items) ? raw.items.slice(0, 200) : [];
  if (!Array.isArray(raw.items)) errors.push(`${file}: thiếu mảng "items"`);
  const items = [];
  const seen = new Set();
  list.forEach((it, i) => {
    const where = `${file} items[${i}]`;
    if (!it || typeof it !== 'object') { errors.push(`${where}: không phải object`); return; }
    const iid = str(it.id, 32);
    if (!SLUG.test(iid)) { errors.push(`${where}: "id" không hợp lệ`); return; }
    if (seen.has(iid)) { errors.push(`${where}: trùng id "${iid}"`); return; }
    if (!TYPES.includes(it.type)) { errors.push(`${where}: "type" phải là ${TYPES.join(' | ')}`); return; }
    const name = str(it.name, 30);
    if (!name) { errors.push(`${where}: thiếu "name"`); return; }
    seen.add(iid);
    const base = { id: `${id}:${iid}`, pack: id, type: it.type, name, icon: icon(it.icon), desc: str(it.desc, 160), price: int(it.price, 0, 500, 0) };
    if (it.type === 'food') {
      items.push({ ...base, where: ['home', 'canteen'].includes(it.where) ? it.where : 'home', energy: int(it.energy, -20, 60, 0), mood: int(it.mood, -20, 30, 0) });
    } else if (it.type === 'uniform') {
      items.push({ ...base, count: int(it.count, 1, 3, 1) });
    } else if (it.type === 'accessory') {
      if (!ACC_KINDS.includes(it.kind)) { errors.push(`${where}: "kind" phải là ${ACC_KINDS.join(' | ')}`); return; }
      items.push({ ...base, kind: it.kind, color: COLOR.test(it.color) ? it.color : '#888888' });
    } else if (it.type === 'toy') {
      const fx = it.fx && typeof it.fx === 'object' ? it.fx : {};
      const lines = (Array.isArray(it.lines) ? it.lines : []).map((l) => str(l, 60)).filter(Boolean).slice(0, 5);
      items.push({
        ...base,
        uses: int(it.uses, 1, 10, 3), fun: int(it.fun, 0, 20, 5), catch: num(it.catch, 0.1, 1, 0.5),
        verb: str(it.verb, 20) || 'Chọc', lines: lines.length ? lines : ['Ê!'],
        fx: { kind: FX_KINDS.includes(fx.kind) ? fx.kind : 'spray', color: COLOR.test(fx.color) ? fx.color : '#ffffff' },
      });
    }
  });
  return { pack, items, errors };
}

// Load every pack listed in mods/index.json. Never throws: a broken pack is reported and skipped.
export async function loadCatalog(base = 'mods/') {
  const out = { packs: [], items: new Map(), errors: [] };
  let files = ['base.json'];
  try {
    const idx = await (await fetch(base + 'index.json')).json();
    if (Array.isArray(idx.packs)) files = idx.packs.filter((f) => typeof f === 'string' && /^[a-z0-9-]+\.json$/.test(f));
  } catch (e) { out.errors.push('mods/index.json: ' + e.message); }
  for (const f of files) {
    try {
      const { pack, items, errors } = validatePack(await (await fetch(base + f)).json(), f);
      out.errors.push(...errors);
      if (!pack) continue;
      out.packs.push({ ...pack, count: items.length });
      for (const it of items) if (!out.items.has(it.id)) out.items.set(it.id, it);
    } catch (e) { out.errors.push(`${f}: ${e.message}`); }
  }
  return out;
}
