// Item catalog (mods/), breakfast table, wardrobe, desk + online shop, school bag, canteen.
import { classGroup } from './subjects.js';
import { ask, esc, sfx, toast } from './ui.js';
import { loadCatalog } from './items.js';
import * as eco from './economy.js';
import * as cloud from './cloud.js';
import { addStat, cls, G, mmss } from './ctx.js';
import { save } from './save.js';
import { homework, showTimetable } from './session.js';
import { laundry, WASH_MS } from './laundry.js';
import { makePlayer, setScarf } from './player.js';
import { loiter } from './actions.js';

const MAX_PACKED_TOYS = 2;          // toy kinds you can bring to school

// ---------------- items (mods/) ----------------
export let CATALOG = { packs: [], items: new Map(), errors: [] };
export let catalogReady = null;
export function initCatalog() {
  catalogReady = loadCatalog().then((c) => {
    CATALOG = c;
    if (c.errors.length) console.warn('[mods]', c.errors);
    // online: the server price list wins (the admin page can change prices or switch items off)
    cloud.shopPrices().then((prices) => {
      if (!prices) return;
      for (const [id, it] of CATALOG.items) {
        const p = prices.get(id);
        if (p) { it.price = p.price; it.off = !p.enabled; } // off: not sold any more, owned copies still work
      }
    });
  });
}
export const item = (id) => CATALOG.items.get(id);
const itemsOf = (type, where) => [...CATALOG.items.values()].filter((i) => i.type === type && (!where || i.where === where));
const forSale = (type, where) => itemsOf(type, where).filter((i) => !i.off);
export const owned = (id) => (G.state.inv[id] ?? 0) > 0;

const cocoTxt = (n) => (n ? `${n} 🥥` : 'miễn phí');
const effTxt = (f) => [f.energy ? `⚡${f.energy > 0 ? '+' : ''}${f.energy}` : '', f.mood ? `😊${f.mood > 0 ? '+' : ''}${f.mood}` : ''].filter(Boolean).join(' ');

export async function homeTable() {
  const t = G.state.today;
  const foods = forSale('food', 'home').sort((a, b) => a.price - b.price);
  const v = await ask('🍚 Bàn ăn', `<p>${t.breakfast ? 'Bạn đã ăn sáng rồi.' : 'Ăn sáng gì đây? Cơm trắng mẹ nấu thì miễn phí.'}</p><p class="meta">Bạn có ${G.state.coco} 🥥</p>`, [
    ...foods.map((f) => ({ label: `${f.icon} ${f.name} — ${cocoTxt(f.price)} (${effTxt(f)})`, value: f.id, disabled: t.breakfast || G.state.coco < f.price })),
    { label: `🍱 Cất hộp đồ ăn vào cặp${t.lunchbox ? ' — đã lấy' : ''}`, value: 'box', disabled: t.lunchbox },
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'box') { t.lunchbox = true; toast('🍱 Đã mang đồ ăn'); return; }
  const f = v && item(v);
  if (!f || !eco.spend(G.state, f.price, `ăn ${f.id}`, f.id)) return;
  t.breakfast = true;
  addStat('energy', f.energy);
  addStat('mood', f.mood);
  toast(`${f.icon} Ngon quá! ${effTxt(f)}`);
  save();
}

export async function wardrobe() {
  const t = G.state.today, g = classGroup(G.state.section);
  const u = laundry();
  const sets = `Bạn có <b>${u.clean}</b> bộ sạch · <b>${u.dirty}</b> bộ dơ${u.washing ? ` · <b>${u.washing}</b> bộ đang giặt (còn ${mmss(u.until - Date.now())})` : ''}.`;
  const opts = [];
  if (t.dressed) opts.push({ label: t.dirty ? '🧺 Cởi bộ dơ ra' : '👕 Cởi đồng phục', value: 'undress' });
  else {
    if (u.clean) opts.push({ label: `👕 Mặc đồng phục sạch Lớp ${cls()}`, value: 'dress' });
    if (u.dirty) opts.push({ label: '👕 Mặc luôn bộ dơ', value: 'dressDirty' });
  }
  if (u.dirty && !u.washing) opts.push({ label: `🧺 Giặt ${u.dirty} bộ dơ (15 phút thật)`, value: 'wash' });
  opts.push({ label: `🧣 Đeo khăn quàng đỏ${t.scarf ? ' — đã đeo' : ''}`, value: 'scarf', disabled: t.scarf });
  const accs = itemsOf('accessory').filter((a) => owned(a.id));
  if (accs.length) opts.push({ label: '🎀 Phụ kiện…', value: 'acc' });
  opts.push({ label: 'Thôi', value: null, cls: 'ghost' });
  const v = await ask('👕 Tủ quần áo', `<p>Đồng phục Lớp ${cls()} màu <b>${g.colorName}</b>. ${sets}</p>
    <p class="meta">Mặc bộ dơ đi học: nếu sao đỏ hoặc giám thị bắt gặp sẽ bị trừ hạnh kiểm. Mua thêm bộ dự phòng ở 🛒 Cửa hàng (bàn học).</p>`, opts);
  if (v === 'dress') { u.clean--; t.dressed = true; t.dirty = false; toast('👕 Đồng phục gọn gàng!'); }
  if (v === 'dressDirty') { u.dirty--; t.dressed = true; t.dirty = true; toast('👕 Mặc tạm áo dơ… cẩn thận sao đỏ!'); }
  if (v === 'undress') { if (t.dirty) u.dirty++; else u.clean++; t.dressed = t.dirty = false; }
  if (v === 'wash') {
    u.washing = u.dirty;
    u.dirty = 0;
    u.until = Date.now() + WASH_MS;
    G.washNotified = false;
    toast(`🧺 Đã bỏ ${u.washing} bộ vào máy giặt — 15 phút nữa xong`, 3000);
  }
  if (v === 'scarf') { t.scarf = true; setScarf(true); toast('🧣 Đã đeo khăn quàng đỏ'); }
  if (v === 'acc') {
    const a = await ask('🎀 Phụ kiện', '<p>Chọn phụ kiện để đeo (chỉ để đẹp, không ảnh hưởng điểm).</p>', [
      ...accs.map((x) => ({ label: `${x.icon} ${x.name}${G.state.acc === x.id ? ' — đang đeo' : ''}`, value: x.id, disabled: G.state.acc === x.id })),
      ...(G.state.acc ? [{ label: '✖ Tháo phụ kiện', value: 'none' }] : []),
      { label: 'Thôi', value: null, cls: 'ghost' },
    ]);
    if (a) G.state.acc = a === 'none' ? null : a;
  }
  if (v && v !== 'scarf' && v !== 'wash') makePlayer();
  save();
}

export async function desk() {
  const t = G.state.today;
  const v = await ask('📅 Bàn học', `<p>Bạn đang học <b>Lớp ${cls()}</b>.</p>`, [
    { label: '📅 Xem thời khoá biểu', value: 'tt' },
    { label: `📝 Học bài (ôn 2 câu)${t.studied ? ' — đã học' : ''}`, value: 'hw', disabled: t.studied },
    { label: `🛒 Cửa hàng online (${G.state.coco} 🥥)`, value: 'shop' },
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'tt') await showTimetable();
  if (v === 'hw') await homework();
  if (v === 'shop') await shop();
}

// Online shop at home: uniforms, accessories, toys (food is bought where you eat it).
async function shop() {
  const cats = { uniform: '👕 Đồng phục', accessory: '🎀 Phụ kiện', toy: '🧸 Đồ chơi' };
  for (;;) {
    const c = await ask('🛒 Cửa hàng online', `<p>Bạn có <b>${G.state.coco} 🥥</b>. Coco kiếm được khi trả lời đúng (+${eco.EARN.correct}/câu), học xong môn (+${eco.EARN.subjectDone}), một buổi ngoan (+${eco.EARN.cleanDay}) — tối đa ${eco.EARN_CAP_PER_DAY} 🥥 mỗi ngày.</p>`, [
      ...Object.entries(cats).map(([value, label]) => ({ label, value })),
      { label: 'Đóng', value: null, cls: 'ghost' },
    ]);
    if (!c) return;
    const list = forSale(c).sort((a, b) => a.price - b.price);
    const have = (i) => (i.type === 'accessory' ? owned(i.id) : false);
    const desc = (i) => (i.type === 'toy' ? ` · ${i.uses} lần dùng` : i.type === 'uniform' ? ` · +${i.count} bộ` : '');
    const id = await ask(cats[c], `<p>Bạn có <b>${G.state.coco} 🥥</b>.</p>${list.filter((i) => i.desc).map((i) => `<p class="meta">${esc(i.icon)} <b>${esc(i.name)}</b>: ${esc(i.desc)}</p>`).join('')}
      ${c === 'toy' ? '<p class="meta">Đồ chơi chỉ để đùa vui với bạn lúc ra chơi. Bị thầy cô bắt gặp sẽ bị tịch thu và trừ hạnh kiểm; chọc mãi một bạn là bắt nạt đó!</p>' : ''}`, [
      ...list.map((i) => ({ label: `${i.icon} ${i.name} — ${cocoTxt(i.price)}${desc(i)}${have(i) ? ' — đã có' : ''}${i.type === 'toy' && owned(i.id) ? ` (còn ${G.state.inv[i.id]})` : ''}`, value: i.id, disabled: have(i) || G.state.coco < i.price })),
      { label: '‹ Quay lại', value: null, cls: 'ghost' },
    ]);
    if (!id) continue;
    const it = item(id);
    if (eco.buy(G.state, it)) {
      sfx('ok');
      toast(`🛒 Đã mua ${it.icon} ${it.name}! Còn ${G.state.coco} 🥥`, 2600);
      save();
    }
  }
}

export async function bagMenu() {
  const t = G.state.today;
  const toys = itemsOf('toy').filter((i) => owned(i.id));
  const v = await ask('🎒 Cặp sách', `<p>${t.bag ? '✅ Đã soạn sách vở.' : 'Chưa soạn sách vở.'}</p>${toys.length ? `<p class="meta">Đồ chơi mang theo (tối đa ${MAX_PACKED_TOYS} loại): ${esc(t.packed.map((id) => item(id)?.icon).join(' ')) || 'chưa có'}</p>` : ''}`, [
    { label: `📚 Soạn sách vở${t.bag ? ' — xong' : ''}`, value: 'books', disabled: t.bag },
    ...toys.map((i) => {
      const on = t.packed.includes(i.id);
      return { label: `${on ? '✖ Bỏ ra' : '➕ Mang'} ${i.icon} ${i.name} (còn ${G.state.inv[i.id]} lần)`, value: i.id, disabled: !on && t.packed.length >= MAX_PACKED_TOYS };
    }),
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'books') { t.bag = true; toast('🎒 Đã soạn cặp'); }
  else if (v) {
    t.packed = t.packed.includes(v) ? t.packed.filter((x) => x !== v) : [...t.packed, v];
    toast(t.packed.includes(v) ? `${item(v).icon} Đã bỏ vào cặp` : 'Đã lấy ra');
  }
}

export async function canteen() {
  const p = G.state.phase;
  const foods = forSale('food', 'canteen').sort((a, b) => a.price - b.price);
  const v = await ask('🥖 Căng tin', `<p>Bạn có ${G.state.coco} 🥥.</p>`, [
    ...foods.map((f) => ({ label: `${f.icon} ${f.name} — ${cocoTxt(f.price)} (${effTxt(f)})`, value: f.id, disabled: G.state.coco < f.price })),
    ...(p === 'after' ? [{ label: '🍧 Ngồi ăn vặt với bạn — 10 🥥 (lêu lổng)', value: 'snack', disabled: G.state.coco < 10 }] : []),
    { label: 'Thôi', value: null, cls: 'ghost' },
  ]);
  if (v === 'snack') { if (eco.spend(G.state, 10, 'ăn vặt')) await loiter('🍧 Ăn vặt với bạn', 12, 5, 0); return; }
  const f = v && item(v);
  if (!f || !eco.spend(G.state, f.price, `căng tin ${f.id}`, f.id)) return;
  addStat('energy', f.energy);
  addStat('mood', f.mood);
  toast(`${f.icon} ${f.name}: ${effTxt(f)}`);
}
