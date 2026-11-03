// The player character, NPC spawning, collisions and room rules, zones.
import { makeCharacter } from './chars.js';
import { CLASS_GROUPS } from './subjects.js';
import { makeLabel, toast } from './ui.js';
import { clamp, G, has, hhmm } from './ctx.js';
import { shirtColor } from './laundry.js';
import { item } from './shop.js';
import { refreshMyTag } from './tags.js';
import { clearMoveTarget } from './input.js';
import { camPos, npcs, scene, W } from './stage.js';

// ---------------- collisions & rules ----------------
const RULES = {
  gate: () => (G.state.phase === 'school' ? `Chưa tan học (còn ${hhmm(G.state.sessionEnd - Date.now())}), bác bảo vệ không cho ra cổng.` : 'Đứng ở cổng và bấm “Về nhà” để ra về.'),
  teacherOnly: () => (has('co-giao') ? null : 'Phòng giáo viên — chỉ dành cho giáo viên.'),
  monitorOnly: () => (has('lop-truong') ? null : 'Phòng Đội — chỉ lớp trưởng mới được vào.'),
  excellentOnly: () => (has('gioi') ? null : 'Phòng học sinh giỏi — cần danh hiệu 🌟 Học sinh giỏi.'),
  hangout: () => (has('ca-biet') ? null : 'Góc của nhóm cá biệt… bạn ngoan quá, chưa vào được.'),
  homeDoor: () => 'Ra cửa bằng nút “Đi học”.',
};
let ruleMsgAt = 0;
const R = 0.35;
export function collide(p) {
  for (const c of W.colliders) {
    let msg = null;
    if (c.rule) { msg = RULES[c.rule](); if (!msg) continue; }
    const qx = clamp(p.x, c.x0, c.x1), qz = clamp(p.z, c.z0, c.z1);
    let dx = p.x - qx, dz = p.z - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      p.x = qx + (dx / d) * R;
      p.z = qz + (dz / d) * R;
    } else {
      const opts = [[c.x0 - R - p.x, 0], [c.x1 + R - p.x, 0], [0, c.z0 - R - p.z], [0, c.z1 + R - p.z]];
      opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
      p.x += opts[0][0];
      p.z += opts[0][1];
    }
    if (msg && performance.now() - ruleMsgAt > 2500) { ruleMsgAt = performance.now(); toast('🚫 ' + msg); }
  }
}
export function zoneAt(p) {
  for (let i = W.zones.length - 1; i >= 0; i--) {
    const z = W.zones[i];
    if (p.x >= z.x0 && p.x <= z.x1 && p.z >= z.z0 && p.z <= z.z1) return z;
  }
  return null;
}

// (Re)build the player's mesh; keeps position so it can be used to change clothes.
export function makePlayer() {
  let pos = null, rot = 0;
  if (G.player) { pos = G.player.position.clone(); rot = G.player.rotation.y; scene.remove(G.player); G.meLabel.el.remove(); }
  const acc = G.state.acc && item(G.state.acc);
  G.player = makeCharacter({ girl: G.state.look.girl, skin: G.state.look.skin, hair: G.state.look.hair, scarf: !!G.state.today?.scarf, shirt: shirtColor(),
    acc: acc ? { kind: acc.kind, color: acc.color } : null });
  if (pos) { G.player.position.copy(pos); G.player.rotation.y = rot; }
  scene.add(G.player);
  G.meLabel = makeLabel(G.state.name, 'me');
  refreshMyTag();
}
export function respawnNpcs() {
  npcs.spawn(G.state.grade, G.state.section, CLASS_GROUPS.map((g) => g.shirt));
  W.setGrade(G.state.grade);
  npcs.showSchool(G.state.phase !== 'home');
}
export function placePlayer(x, z, rotY = Math.PI) {
  G.player.position.set(x, 0, z);
  G.player.rotation.y = rotY;
  clearMoveTarget();
  camPos.set(x, G.camDist * 0.85, z + G.camDist * 0.75);
}
export function setScarf(on) { G.player.userData.scarf.visible = on; }
export const mySeat = () => W.seats[G.state.section][9];
