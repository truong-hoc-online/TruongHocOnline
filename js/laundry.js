// Uniform sets, washing (15 real minutes), dirty uniforms caught by the red-star student / supervisor.
import * as THREE from './vendor/three.module.min.js';
import { classGroup } from './subjects.js';
import { ask, say } from './ui.js';
import { addStat, G } from './ctx.js';
import { npcs } from './stage.js';

export const WASH_MS = 15 * 60e3;          // washing the uniform takes 15 real minutes
const DIRTY_PENALTY = 3;
const CASUAL_SHIRT = 0xffd180;      // home clothes

let nextPatrol = 0;

// move finished washing to the clean pile; returns the uniform counts
export function laundry() {
  const u = G.state.uniform;
  if (u.washing && Date.now() >= u.until) { u.clean += u.washing; u.washing = 0; u.until = 0; }
  return u;
}
export function shirtColor() {
  const t = G.state.today;
  if (!t?.dressed) return CASUAL_SHIRT;
  const c = new THREE.Color(classGroup(G.state.section).shirt);
  if (t.dirty) c.lerp(new THREE.Color(0x7a6a50), 0.45);
  return c.getHex();
}

// dirty uniform is only punished when the red-star student or the supervisor notices it (once per session)
export function caughtDirty() {
  G.state.today.caughtDirty = true;
  addStat('conduct', -DIRTY_PENALTY);
  return `👕 Đồng phục dơ, chưa giặt — hạnh kiểm −${DIRTY_PENALTY}`;
}
export function patrolTick() {
  const t = G.state.today;
  if (!t.dressed || !t.dirty || t.caughtDirty || G.sitting || G.busy || G.now < nextPatrol) return;
  nextPatrol = G.now + 2;
  for (const n of [npcs.redStar, npcs.monitor]) {
    if (n.hidden || n.mesh.position.distanceTo(G.player.position) > 2.6) continue;
    nextPatrol = G.now + 15; // one roll per encounter
    if (Math.random() > 0.4) return;
    const msg = caughtDirty();
    say(n.label, 'Áo em dơ quá, đứng lại đã!');
    G.busy = true;
    ask(`🚨 ${n.name} (${n.tag}) bắt gặp`, `<p>“Đồng phục phải giặt sạch sẽ mới đi học chứ em!”</p><p class="meta">${msg}</p>`, [{ label: 'Dạ, em sẽ giặt ạ', value: 1 }])
      .finally(() => { G.busy = false; });
    return;
  }
}

// new class colour: mum swaps every set (bought spares included) for clean ones of the new colour
export function newClassUniforms() {
  const u = laundry();
  G.state.uniform = { clean: Math.max(1, u.clean + u.dirty + u.washing), dirty: 0, washing: 0, until: 0 };
}
