// Classmates, teachers and staff. They walk along simple waypoint paths (no pathfinding needed:
// paths always go seat -> classroom door -> yard, which are open lines).
import { makeCharacter, animateCharacter, faceTowards, SKINS, HAIRS } from './chars.js';
import { makeLabel, say } from './ui.js';

const BOY = ['Cu Tèo', 'Bin Bông', 'Tũn', 'Bắp', 'Khoai', 'Tôm', 'Sóc', 'Gạo', 'Bơ', 'Đậu', 'Nhím', 'Mít', 'Ốc', 'Su Su', 'Cốm', 'Bi', 'Cua', 'Tin Tin', 'Kẹo', 'Sún'];
const GIRL = ['Na Na', 'Bống', 'Mận', 'Ổi', 'Kem', 'Tí Nị', 'Mơ', 'Thóc', 'Hạt Tiêu', 'Bông', 'Mây', 'Sữa', 'Chíp', 'Dâu', 'Cherry', 'Lê', 'Xoài', 'Mochi', 'Bột', 'Cà Rốt'];
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];

export class Npcs {
  constructor(scene, W) {
    this.scene = scene;
    this.W = W;
    this.list = [];
    this.quietUntil = 0;
  }

  add(name, look, o = {}) {
    const mesh = makeCharacter(look);
    this.scene.add(mesh);
    const label = makeLabel(name, o.teacher ? 'teacher' : '', o.tag || '');
    const n = { name, mesh, label, path: [], speed: 2.2 + Math.random() * 0.8, idle: 0, wander: false, onArrive: null, school: true, ...o };
    mesh.position.set(o.x ?? 0, 0, o.z ?? 0);
    this.list.push(n);
    return n;
  }

  // (Re)create everyone for the player's grade/class. Rooms 1–4 = classes A1–A4 of that grade;
  // `n.grade` holds the room (class section) number. Player sits at seat index 9 of their room.
  spawn(grade, section, shirts) {
    this.list.forEach((n) => { this.scene.remove(n.mesh); n.label.el.remove(); });
    this.list = [];
    const used = new Set();
    const name = (girl) => {
      let s, guard = 0;
      do { s = pick(girl ? GIRL : BOY); } while (used.has(s) && guard++ < 40);
      used.add(s);
      return s;
    };
    const others = ['Cô Lý', 'Thầy Tâm', 'Cô Vân', 'Thầy Bình'];
    for (const g of [1, 2, 3, 4]) {
      const count = g === section ? 15 : 6;
      const seats = this.W.seats[g];
      for (let i = 0, s = 0; i < count && s < seats.length; s++) {
        if (g === section && s === 9) continue;
        const girl = Math.random() < 0.5;
        this.add(name(girl), { girl, skin: pick(SKINS), hair: pick(HAIRS), scarf: Math.random() < 0.85, shirt: shirts[g - 1] },
          { role: 'student', grade: g, seat: seats[s], tag: g === section ? '' : `${grade}A${g}` }); // classmates: told apart by shirt colour
        i++;
      }
      const t = this.W.spots[`teacher${g}`];
      this.add(g === section ? 'Cô Hạnh' : others[g - 1], { teacher: true, skin: SKINS[0], hair: HAIRS[3], shirt: pick([0xf3a6c0, 0x9fc5e8, 0xf9cb9c, 0xb6d7a8]) },
        { role: 'teacher', grade: g, teacher: true, tag: 'Cô giáo', x: t.x, z: t.z, home: t });
    }
    // bullies are older students from grade 9: no seat here, they only show up in the yard
    this.bullies = [
      this.add('Tèo Bự', { skin: SKINS[2], hair: HAIRS[3], scarf: false }, { role: 'student', bully: true, tag: 'Lớp 9' }),
      this.add('Long Gấu', { skin: SKINS[1], hair: HAIRS[0], scarf: false }, { role: 'student', bully: true, tag: 'Lớp 9' }),
    ];
    const S = this.W.spots;
    this.add('Cô Lan', { teacher: true, hair: HAIRS[1], shirt: 0xb4a7d6 }, { role: 'staff', teacher: true, tag: 'Thư viện', x: S.librarian.x, z: S.librarian.z, home: S.librarian });
    this.counselor = this.add('Cô Thu', { teacher: true, hair: HAIRS[4], shirt: 0x8fd1c4 }, { role: 'staff', teacher: true, tag: 'Tư vấn', x: S.counselor.x, z: S.counselor.z, home: S.counselor });
    this.redStar = this.add('Bảo Anh', { girl: true, hair: HAIRS[0], scarf: true }, { role: 'staff', tag: 'Sao đỏ', x: S.redStar.x, z: S.redStar.z, home: S.redStar });
    this.monitor = this.add('Thầy Minh', { skin: SKINS[1], hair: HAIRS[3], shirt: 0x5b7fa6, pants: 0x333333 }, { role: 'roamer', teacher: true, tag: 'Giám thị', x: 0, z: 12 });
    this.mom = this.add('Mẹ', { teacher: true, hair: HAIRS[0], shirt: 0xe06666 }, { role: 'mom', teacher: true, school: false, x: S.homeSpawn.x - 2.5, z: S.homeSpawn.z + 2 });
    this.classTeacher = this.list.find((n) => n.role === 'teacher' && n.grade === section);
    this.monitor.wander = true;
  }

  students() { return this.list.filter((n) => n.role === 'student'); }

  showSchool(on) {
    this.list.forEach((n) => { n.mesh.visible = n.school ? on : !on; n.hidden = !n.mesh.visible; });
  }

  hideBullies() { for (const b of this.bullies) { b.path = []; b.wander = false; b.mesh.visible = false; b.hidden = true; } }
  bulliesToYard() {
    for (const b of this.bullies) {
      const p = pick(this.W.spots.yardPoints);
      b.mesh.position.set(p.x, 0, p.z);
      b.mesh.visible = true;
      b.hidden = false;
      b.path = [];
      b.wander = true;
    }
  }
  classmates() { return this.list.filter((n) => n.role === 'student' && !n.bully); }

  seatAll() {
    this.hideBullies();
    for (const n of this.classmates()) {
      n.path = [];
      n.wander = false;
      n.mesh.visible = true;
      n.hidden = false;
      n.mesh.position.set(n.seat.x, 0, n.seat.z);
      n.mesh.rotation.y = Math.PI;
      n.mesh.userData.sitting = true;
    }
    this.homeStaff();
  }

  homeStaff() {
    for (const n of this.list) {
      if (!n.home) continue;
      n.path = [];
      n.mesh.position.set(n.home.x, 0, n.home.z);
      n.mesh.rotation.y = n.role === 'teacher' ? 0 : n.mesh.rotation.y;
    }
  }

  toYard() {
    this.bulliesToYard();
    for (const n of this.classmates()) {
      const d = this.W.classDoors[n.grade];
      n.mesh.userData.sitting = false;
      n.path = [d.inside, d.outside, pick(this.W.spots.yardPoints)];
      n.wander = true;
      n.onArrive = null;
    }
  }

  // spread students around the yard immediately (used when arriving before the bell)
  scatterYard() {
    this.bulliesToYard();
    for (const n of this.classmates()) {
      const p = pick(this.W.spots.yardPoints);
      n.mesh.position.set(p.x, 0, p.z);
      n.mesh.userData.sitting = false;
      n.mesh.visible = true;
      n.hidden = false;
      n.path = [];
      n.wander = true;
      n.idle = Math.random() * 3;
    }
  }

  toClass() {
    this.hideBullies();
    for (const n of this.classmates()) {
      const d = this.W.classDoors[n.grade];
      n.mesh.userData.sitting = false;
      n.mesh.visible = true;
      n.hidden = false;
      n.path = [d.outside, d.inside, n.seat];
      n.wander = false;
      n.onArrive = 'sit';
      n.speed = 3 + Math.random();
    }
  }

  leaveSchool() {
    this.hideBullies();
    for (const n of this.classmates()) {
      n.mesh.userData.sitting = false;
      const d = this.W.classDoors[n.grade];
      if (Math.random() < 0.55) {
        n.path = [d.inside, d.outside, { x: (Math.random() - 0.5) * 4, z: 27 }];
        n.onArrive = 'hide';
        n.wander = false;
      } else {
        n.path = [d.inside, d.outside, pick(this.W.spots.yardPoints)];
        n.wander = true;
        n.onArrive = null;
      }
    }
  }

  goTo(n, x, z) { n.path = [{ x, z }]; n.wander = false; n.onArrive = null; }

  nearest(pos, maxDist = 6, filter = (n) => n.role === 'student') {
    let best = null, bd = maxDist * maxDist;
    for (const n of this.list) {
      if (n.hidden || !filter(n)) continue;
      const dx = n.mesh.position.x - pos.x, dz = n.mesh.position.z - pos.z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  chatter(pos, lines, now) {
    if (now < this.quietUntil) return null;
    const near = this.list.filter((n) => !n.hidden && n.role === 'student' && !n.bully &&
      Math.hypot(n.mesh.position.x - pos.x, n.mesh.position.z - pos.z) < 16);
    if (!near.length) return null;
    const n = pick(near), text = pick(lines);
    say(n.label, text);
    return { name: n.name, text };
  }

  update(dt) {
    let visible = 0;
    for (const n of this.list) {
      if (n.hidden) continue;
      if (n.role === 'student') visible++;
      const p = n.mesh.position;
      let speed = 0;
      if (n.path.length) {
        const t = n.path[0];
        const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
        if (d < 0.15) {
          n.path.shift();
          if (!n.path.length) {
            if (n.onArrive === 'sit') { n.mesh.userData.sitting = true; n.mesh.rotation.y = Math.PI; }
            else if (n.onArrive === 'hide') { n.mesh.visible = false; n.hidden = true; }
            n.onArrive = null;
            n.idle = 1 + Math.random() * 5;
          }
        } else {
          const step = Math.min(d, n.speed * dt);
          p.x += (dx / d) * step;
          p.z += (dz / d) * step;
          speed = n.speed;
          faceTowards(n.mesh, dx, dz, dt);
        }
      } else if (n.wander) {
        n.idle -= dt;
        if (n.idle <= 0) {
          const pts = this.W.spots.yardPoints;
          n.path = [pick(pts)];
          n.speed = 1.4 + Math.random() * 1.2;
        }
      }
      animateCharacter(n.mesh, dt, speed);
    }
    return visible;
  }
}
