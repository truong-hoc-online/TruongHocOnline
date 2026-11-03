import * as THREE from './vendor/three.module.min.js';
import { ask, esc, say, sfx, toast } from './ui.js';
import { addStat, G, pick } from './ctx.js';
import { save } from './save.js';
import { item, owned } from './shop.js';
import { zoneAt } from './player.js';
import { npcs, scene, W } from './stage.js';

export const PRANK_RANGE = 1.8;            // metres to a classmate
const PRANK_WATCH = 9;              // staff closer than this may catch a prank

// ---------------- pranks (toys from mods/) ----------------
// Light-hearted only: classmates (never teachers, staff or the older bullies), only in free time and outside
// quiet rooms. Staff nearby may confiscate the toy; pranking the same classmate again is called out as bullying.
export function findPrankTarget() {
  const p = G.state.phase, t = G.state.today;
  if (G.sitting || G.busy || !(p === 'after' || (p === 'school' && ['preBell', 'break', 'free'].includes(G.sub)))) return null;
  if (zoneAt(G.player.position)?.quiet) return null;
  if (!t.packed.some(owned)) return null;
  return npcs.nearest(G.player.position, PRANK_RANGE, (n) => n.role === 'student' && !n.bully);
}
export function prankLabel(n) {
  const toys = G.state.today.packed.filter(owned).map(item).filter(Boolean);
  return toys.length === 1 ? `${toys[0].icon} ${toys[0].verb} ${n.name}` : `😜 Chọc ${n.name}…`;
}
export async function prank(n) {
  const t = G.state.today;
  const toys = t.packed.filter(owned).map(item).filter(Boolean);
  let toy = toys[0];
  if (toys.length > 1) {
    const id = await ask(`😜 Chọc ${n.name}`, '<p>Dùng gì đây?</p>', [
      ...toys.map((i) => ({ label: `${i.icon} ${i.verb} (còn ${G.state.inv[i.id]} lần)`, value: i.id })),
      { label: 'Thôi', value: null, cls: 'ghost' },
    ]);
    if (!id) return;
    toy = item(id);
  }
  if (!toy || !owned(toy.id)) return;
  G.state.inv[toy.id]--;
  const np = n.mesh.position;
  G.player.rotation.y = Math.atan2(np.x - G.player.position.x, np.z - G.player.position.z);
  spawnFx(toy.fx, G.player.position, np);
  sfx('pop');
  setTimeout(() => say(n.label, pick(toy.lines)), 380);
  addStat('mood', toy.fun);
  t.pranks++;
  G.state.prankCount++;
  t.victims[n.name] = (t.victims[n.name] ?? 0) + 1;
  setTimeout(() => { n.path = [pick(W.spots.yardPoints)]; n.speed = 4.2; n.wander = true; n.onArrive = null; }, 600);
  const watcher = npcs.list.find((w) => !w.hidden && w.mesh.visible && (w.teacher || w.tag === 'Sao đỏ') && w.role !== 'mom' &&
    w.mesh.position.distanceTo(G.player.position) < PRANK_WATCH);
  await new Promise((r) => setTimeout(r, 700));
  if (watcher && Math.random() < toy.catch) {
    t.caughtPrank = true;
    addStat('conduct', -3);
    G.state.inv[toy.id] = 0;
    if (watcher.tag === 'Sao đỏ') sfx('whistle');
    say(watcher.label, 'Em kia! Đưa đây!');
    await ask(`🚨 ${watcher.name} bắt gặp`, `<p>“Đùa kiểu này làm bạn khó chịu đấy. ${esc(toy.name)} bị tịch thu!”</p><p class="meta">Hạnh kiểm −3 · Mất ${esc(toy.icon)} ${esc(toy.name)}</p>`, [{ label: 'Dạ, em xin lỗi', value: 1 }]);
  } else if (t.victims[n.name] >= 2) {
    addStat('conduct', -2);
    await ask('😢 Bạn ấy buồn rồi', `<p><b>${esc(n.name)}</b> bị bạn chọc ${t.victims[n.name]} lần, đã đi mách cô chủ nhiệm.</p>
      <p>Đùa một lần là vui, nhưng <b>chọc mãi một người là bắt nạt</b>. Rủ bạn ấy chơi cùng thay vì chọc nhé!</p><p class="meta">Hạnh kiểm −2</p>`, [{ label: 'Mình hiểu rồi', value: 1 }]);
  } else if (t.pranks === 3) toast('😅 Hôm nay chọc bạn nhiều rồi đó — coi chừng bị xếp vào nhóm cá biệt!', 3000);
  if (!owned(toy.id)) {
    t.packed = t.packed.filter((x) => x !== toy.id);
    if (!t.caughtPrank) toast(`${toy.icon} ${toy.name} đã dùng hết`);
  }
  save();
}

// small particle effects for pranks
const fxList = [];
const fxGeo = new THREE.SphereGeometry(0.07, 6, 4);
function spawnFx(fx, from, to) {
  const n = fx.kind === 'blob' ? 1 : fx.kind === 'confetti' ? 18 : 10;
  for (let i = 0; i < n; i++) {
    const color = fx.kind === 'confetti' ? new THREE.Color().setHSL(Math.random(), 0.85, 0.6) : new THREE.Color(fx.color);
    const m = new THREE.Mesh(fxGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
    if (fx.kind === 'blob') m.scale.setScalar(2.2);
    const end = new THREE.Vector3(to.x + (Math.random() - 0.5) * 0.5, 1.1 + Math.random() * 0.5, to.z + (Math.random() - 0.5) * 0.5);
    const start = fx.kind === 'confetti' ? end.clone() : new THREE.Vector3(from.x, 1.0, from.z);
    const vel = fx.kind === 'confetti' ? new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3) : null;
    m.position.copy(start);
    scene.add(m);
    fxList.push({ m, start, end, vel, t: -i * 0.03, dur: fx.kind === 'confetti' ? 1.1 : 0.45 });
  }
}
export function fxTick(dt) {
  for (let i = fxList.length - 1; i >= 0; i--) {
    const f = fxList[i];
    f.t += dt;
    if (f.t < 0) continue;
    const k = f.t / f.dur;
    if (f.vel) { f.m.position.addScaledVector(f.vel, dt); f.vel.y -= 5 * dt; }
    else { f.m.position.lerpVectors(f.start, f.end, Math.min(1, k)); f.m.position.y += Math.sin(Math.min(1, k) * Math.PI) * 0.4; }
    f.m.material.opacity = k > 1 ? Math.max(0, 1 - (k - 1) * 3) : 1;
    if (k >= 1.35) { scene.remove(f.m); f.m.material.dispose(); fxList.splice(i, 1); }
  }
}
