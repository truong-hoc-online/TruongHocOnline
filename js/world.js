// School + home geometry. Units are metres; +z is south (towards the gate), camera looks from the south.
import * as THREE from './vendor/three.module.min.js';

export const HOME_X = 200; // the home is a separate little map far east of the school

const mats = new Map();
function m(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  return mats.get(key);
}
const unitBox = new THREE.BoxGeometry(1, 1, 1);

function textTexture(text, { bg = '#1f3b57', fg = '#ffffff', w = 512, h = 128, font = 54 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(4, 4, w - 8, h - 8, 24);
  g.fill();
  g.fillStyle = fg;
  g.font = `bold ${font}px system-ui, "Segoe UI", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildWorld(scene) {
  const W = { colliders: [], zones: [], hotspots: [], seats: {}, classDoors: {}, spots: {} };
  const root = new THREE.Group();
  scene.add(root);

  // ---------- helpers ----------
  function box(x0, z0, x1, z1, h, color, o = {}) {
    const mesh = new THREE.Mesh(unitBox, o.opacity ? m(color, { transparent: true, opacity: o.opacity, depthWrite: false }) : m(color));
    mesh.scale.set(x1 - x0, h, z1 - z0);
    mesh.position.set((x0 + x1) / 2, (o.y ?? 0) + h / 2, (z0 + z1) / 2);
    mesh.castShadow = !o.opacity && h > 0.3;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (o.collide !== false) W.colliders.push({ x0, z0, x1, z1, rule: o.rule });
    return mesh;
  }
  function floor(x0, z0, x1, z1, color, y = 0.01) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m(color));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }
  function sign(text, x, y, z, rotY = 0, o = {}) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 2.6, (o.w ?? 2.6) / 4), new THREE.MeshBasicMaterial({ map: textTexture(text, o), transparent: true }));
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    root.add(mesh);
    return mesh;
  }
  // Rectangular room. doors: [{ side: 'n'|'s'|'e'|'w', at, w, rule }]. South wall is see-through.
  function room(x0, z0, x1, z1, { h = 2.4, color = 0xf1e3c6, doors = [], floorColor = 0xd8c3a0 } = {}) {
    const t = 0.25;
    floor(x0, z0, x1, z1, floorColor, 0.02);
    const sides = {
      n: { a: x0, b: x1, fixed: z0, horiz: true },
      s: { a: x0, b: x1, fixed: z1, horiz: true },
      w: { a: z0, b: z1, fixed: x0, horiz: false },
      e: { a: z0, b: z1, fixed: x1, horiz: false },
    };
    for (const [side, s] of Object.entries(sides)) {
      const gaps = doors.filter((d) => d.side === side).map((d) => [d.at - d.w / 2, d.at + d.w / 2, d]).sort((p, q) => p[0] - q[0]);
      let cur = s.a;
      const segs = [];
      for (const [g0, g1] of gaps) { segs.push([cur, g0]); cur = g1; }
      segs.push([cur, s.b]);
      const opacity = side === 's' ? 0.35 : undefined;
      for (const [a, b] of segs) {
        if (b - a < 0.01) continue;
        if (s.horiz) box(a, s.fixed - t / 2, b, s.fixed + t / 2, h, color, { opacity });
        else box(s.fixed - t / 2, a, s.fixed + t / 2, b, h, color, { opacity });
      }
      for (const [g0, g1, d] of gaps) {
        if (!d.rule) continue; // locked door = invisible barrier with a rule
        if (s.horiz) W.colliders.push({ x0: g0, z0: s.fixed - 0.2, x1: g1, z1: s.fixed + 0.2, rule: d.rule });
        else W.colliders.push({ x0: s.fixed - 0.2, z0: g0, x1: s.fixed + 0.2, z1: g1, rule: d.rule });
        // coloured strip on the floor shows the door is restricted
        const strip = s.horiz ? floor(g0, s.fixed - 0.3, g1, s.fixed + 0.3, 0xf2c94c, 0.03) : floor(s.fixed - 0.3, g0, s.fixed + 0.3, g1, 0xf2c94c, 0.03);
        strip.material = m(0xf2c94c);
      }
    }
  }
  function zone(id, name, x0, z0, x1, z1, extra = {}) { W.zones.push({ id, name, x0, z0, x1, z1, ...extra }); }
  function hotspot(id, x, z, r = 1.4) { W.hotspots.push({ id, x, z, r }); }
  function tree(x, z, flowers = true) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 8), m(0x7a5230));
    trunk.position.set(x, 1.1, z);
    trunk.castShadow = true;
    root.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 10), m(flowers ? 0xe2552d : 0x4f9d50));
    crown.scale.y = 0.6;
    crown.position.set(x, 2.9, z);
    crown.castShadow = true;
    root.add(crown);
    W.colliders.push({ x0: x - 0.35, z0: z - 0.35, x1: x + 0.35, z1: z + 0.35 });
  }
  function bench(x, z, rot = 0) {
    if (rot) box(x - 0.3, z - 1, x + 0.3, z + 1, 0.45, 0x8a5a2b);
    else box(x - 1, z - 0.3, x + 1, z + 0.3, 0.45, 0x8a5a2b);
  }

  // ---------- ground ----------
  const grass = floor(-120, -100, 320, 100, 0x8cc56b, 0);
  grass.material = m(0x8cc56b);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(72, 54), new THREE.MeshLambertMaterial({ map: checker() }));
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(0, 0.005, 1);
  yard.receiveShadow = true;
  root.add(yard);
  zone('yard', 'Sân trường', -36, -26, 36, 28);

  // school fence with gate
  const fc = 0xcfd8dc;
  box(-36.3, -26.3, 36.3, -26, 1.2, fc);
  box(-36.3, -26.3, -36, 28.3, 1.2, fc);
  box(36, -26.3, 36.3, 28.3, 1.2, fc);
  box(-36.3, 28, -3, 28.3, 1.2, fc);
  box(3, 28, 36.3, 28.3, 1.2, fc);
  box(-3.6, 27.6, -3, 28.6, 3.2, 0x2f5d8a);
  box(3, 27.6, 3.6, 28.6, 3.2, 0x2f5d8a);
  W.colliders.push({ x0: -3, z0: 28, x1: 3, z1: 28.6, rule: 'gate' });
  W.spots.gateInside = { x: 0, z: 25.5 };
  hotspot('gate', 0, 26.6, 2.2);

  // ---------- classrooms (north row): the 4 classes A1–A4 of the player's grade ----------
  const classSigns = [];
  const classZones = [];
  [1, 2, 3, 4].forEach((g, i) => {
    const x0 = -34 + i * 10, x1 = x0 + 10, z0 = -26, z1 = -14;
    const doorX = x1 - 1.3;
    room(x0, z0, x1, z1, { doors: [{ side: 's', at: doorX, w: 1.8 }], color: 0xf6e7c8, floorColor: 0xe8d9b5 });
    classSigns.push(sign(`Lớp 6A${g}`, (x0 + x1) / 2, 2.9, z1 + 0.2, 0, { bg: '#2e7d32' }));
    box(x0 + 2, z0 + 0.15, x1 - 2, z0 + 0.3, 1.3, 0x2d4a3e, { y: 0.9, collide: false }); // blackboard
    box(x0 + 3.8, z0 + 1.4, x0 + 6.2, z0 + 2.2, 0.8, 0x9b6b3d); // teacher desk
    W.spots[`teacher${g}`] = { x: (x0 + x1) / 2, z: z0 + 2.9 };
    const seats = [];
    const cx = (x0 + x1) / 2;
    [-3, 0, 3].forEach((dx) => {
      [-21.6, -19.6, -17.6, -15.8].forEach((rz) => {
        box(cx + dx - 0.8, rz - 0.35, cx + dx + 0.8, rz + 0.05, 0.75, 0xc9955c);
        seats.push({ x: cx + dx - 0.4, z: rz + 0.55 }, { x: cx + dx + 0.4, z: rz + 0.55 });
      });
    });
    W.seats[g] = seats;
    W.classDoors[g] = { inside: { x: doorX, z: z1 - 1 }, outside: { x: doorX, z: z1 + 1.4 } };
    zone(`class${g}`, `Lớp 6A${g}`, x0, z0, x1, z1, { quiet: true, sec: g });
    classZones.push(W.zones[W.zones.length - 1]);
  });
  // rename the class rooms after a promotion (signs + zone names)
  W.setGrade = (grade) => {
    classSigns.forEach((s, i) => {
      s.material.map.dispose();
      s.material.map = textTexture(`Lớp ${grade}A${i + 1}`, { bg: '#2e7d32' });
      s.material.needsUpdate = true;
    });
    classZones.forEach((z, i) => { z.name = `Lớp ${grade}A${i + 1}`; });
  };
  floor(-34, -14, 22, -12, 0xb0bec5, 0.012); // corridor

  // ---------- library ----------
  room(6, -26, 22, -14, { doors: [{ side: 's', at: 14, w: 2 }], color: 0xe3f2fd, floorColor: 0xcfd8dc });
  sign('Thư viện', 14, 2.9, -13.8, 0, { bg: '#5e35b1' });
  for (let i = 0; i < 6; i++) box(7 + i * 2.5, -25.8, 8.8 + i * 2.5, -25, 2.1, [0x8d6e63, 0x6d4c41][i % 2]);
  box(6.2, -23, 7, -16, 2.1, 0x6d4c41);
  box(10, -20.5, 13, -19.2, 0.75, 0xbcaaa4);
  box(15, -20.5, 18, -19.2, 0.75, 0xbcaaa4);
  hotspot('library-read', 11.5, -18.5, 1.6);
  hotspot('library-read', 16.5, -18.5, 1.6);
  W.spots.librarian = { x: 20, z: -22 };
  zone('library', 'Thư viện', 6, -26, 22, -14, { quiet: true });

  // ---------- east column: tag rooms ----------
  room(26, -24, 36, -16, { doors: [{ side: 'w', at: -20, w: 1.8, rule: 'teacherOnly' }], color: 0xfce4ec });
  sign('Phòng giáo viên', 25.8, 2.9, -20, -Math.PI / 2, { bg: '#ad1457', font: 44 });
  box(28.5, -22, 33.5, -18, 0.75, 0x9b6b3d);
  hotspot('teachers-room', 31, -17.2, 1.5);
  zone('teachers', 'Phòng giáo viên', 26, -24, 36, -16);

  room(26, -12, 36, -4, { doors: [{ side: 'w', at: -8, w: 1.8, rule: 'monitorOnly' }], color: 0xffebee });
  sign('Phòng Đội', 25.8, 2.9, -8, -Math.PI / 2, { bg: '#c62828' });
  box(30, -11.2, 34, -10.4, 0.8, 0x9b6b3d);
  hotspot('team-room', 32, -9.2, 1.6);
  zone('team', 'Phòng Đội (lớp trưởng)', 26, -12, 36, -4);

  room(26, 0, 36, 8, { doors: [{ side: 'w', at: 4, w: 1.8, rule: 'excellentOnly' }], color: 0xfff8e1 });
  sign('Phòng học sinh giỏi', 25.8, 2.9, 4, -Math.PI / 2, { bg: '#f9a825', font: 40 });
  box(30, 3, 34, 5, 0.75, 0xc9955c);
  hotspot('excellent-room', 32, 5.8, 1.6);
  zone('excellent', 'Phòng học sinh giỏi', 26, 0, 36, 8);

  // ---------- west column: counselling, canteen, hangout ----------
  room(-36, -10, -26, -2, { doors: [{ side: 'e', at: -6, w: 1.8 }], color: 0xe0f2f1, floorColor: 0xc8e6c9 });
  sign('Phòng tư vấn', -25.8, 2.9, -6, Math.PI / 2, { bg: '#00897b', font: 46 });
  box(-34, -8, -32, -4, 0.45, 0x80cbc4); // soft sofa
  W.spots.counselor = { x: -30.5, z: -7.5 };
  hotspot('counsel', -30.5, -6.2, 1.8);
  zone('counsel', 'Phòng tư vấn tâm lý', -36, -10, -26, -2);

  room(-36, 2, -26, 14, { doors: [{ side: 'e', at: 8, w: 2.2 }], color: 0xfff3e0, floorColor: 0xffe0b2 });
  sign('Căng tin', -25.8, 2.9, 8, Math.PI / 2, { bg: '#ef6c00' });
  box(-35.6, 4, -34, 12, 1.0, 0xbf8040); // counter
  box(-31, 5, -29, 6.4, 0.75, 0xffffff);
  box(-31, 9, -29, 10.4, 0.75, 0xffffff);
  hotspot('canteen', -33, 8, 1.8);
  zone('canteen', 'Căng tin', -36, 2, -26, 14);

  // hangout corner behind the canteen: hedge with an opening, restricted to "cá biệt"
  const hc = 0x2e7d32;
  box(-36, 17, -26, 17.6, 1.1, hc);
  box(-26.6, 17, -26, 20, 1.1, hc);
  box(-26.6, 22.4, -26, 26, 1.1, hc);
  W.colliders.push({ x0: -26.8, z0: 20, x1: -25.8, z1: 22.4, rule: 'hangout' });
  floor(-26.8, 20, -25.8, 22.4, 0xf2c94c, 0.03);
  sign('Góc sau căng tin', -25.6, 2.2, 21.2, Math.PI / 2, { bg: '#37474f', font: 42 });
  box(-34, 20, -32, 22, 0.5, 0x795548);
  hotspot('hangout', -31, 23, 2);
  zone('hangout', 'Góc sau căng tin', -36, 17.6, -26, 26);

  // ---------- yard features ----------
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 8), m(0xe0e0e0));
  pole.position.set(0, 3.5, 4);
  pole.castShadow = true;
  root.add(pole);
  box(-1.2, 2.8, 1.2, 5.2, 0.3, 0xbdbdbd);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshBasicMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
  flag.position.set(0.95, 6.3, 4);
  root.add(flag);
  W.flag = flag;
  [[-14, 10], [14, 10], [-10, 20], [10, 20], [-20, -4], [20, -4]].forEach(([x, z]) => tree(x, z));
  [[-14, 13], [14, 13], [-10, 23], [10, 23]].forEach(([x, z]) => bench(x, z));
  // shuttlecock court
  floor(12, 14.5, 22, 18, 0x90a4ae, 0.012);
  box(16.9, 14.5, 17.1, 18, 1.5, 0xffffff, { collide: false, opacity: 0.6 });
  hotspot('shuttlecock', 15, 16.2, 2);

  W.spots.yardPoints = [];
  for (let i = 0; i < 40; i++) {
    const x = -22 + Math.random() * 44, z = -8 + Math.random() * 30;
    if (Math.abs(x) < 2 && z > 2 && z < 6) continue;
    W.spots.yardPoints.push({ x, z });
  }
  W.spots.redStar = { x: 2.5, z: 25 };

  // ---------- home ----------
  const hx = HOME_X;
  floor(hx - 14, -12, hx + 14, 12, 0x9ccc65, 0.004);
  room(hx - 6, -6, hx + 6, 6, { doors: [{ side: 's', at: hx, w: 1.8 }], color: 0xffe0b2, floorColor: 0xd7b98e });
  box(hx - 5.7, -5.7, hx - 3.3, -2.3, 0.55, 0x5c6bc0); // bed
  box(hx - 5.7, -5.7, hx - 3.3, -5, 0.9, 0xeeeeee, { collide: false });
  box(hx + 3.5, -5.8, hx + 5.8, -4.9, 2.2, 0x8d6e63); // wardrobe
  box(hx + 3.8, -1.8, hx + 5.8, -0.6, 0.8, 0xa1887f); // study desk
  box(hx + 4.9, 1, hx + 5.6, 1.7, 0.5, 0x1565c0); // school bag
  box(hx - 5, 1.2, hx - 2.6, 2.8, 0.8, 0xbcaaa4); // dining table
  box(hx - 1, -5.8, hx + 1.4, -5, 0.6, 0x7986cb); // sofa
  sign('Nhà mình', hx, 2.9, 6.2, 0, { bg: '#6d4c41' });
  hotspot('home-bed', hx - 4.5, -1.6, 1.4);
  hotspot('home-wardrobe', hx + 4.6, -4.1, 1.3);
  hotspot('home-desk', hx + 3.2, -1.2, 1.2);
  hotspot('home-bag', hx + 4.4, 2.4, 1.1);
  hotspot('home-table', hx - 3.8, 3.5, 1.4);
  hotspot('home-sofa', hx + 0.2, -4.2, 1.3);
  hotspot('home-door', hx, 5.3, 1.3);
  W.spots.homeSpawn = { x: hx, z: 1 };
  zone('home', 'Nhà mình', hx - 6, -6, hx + 6, 6);
  W.colliders.push({ x0: hx - 2, z0: 6, x1: hx + 2, z1: 7, rule: 'homeDoor' });

  return W;
}

function checker() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#dfe3e6';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#c9ced3';
  g.fillRect(0, 0, 64, 64);
  g.fillRect(64, 64, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(36, 27);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 180;
  c.height = 120;
  const g = c.getContext('2d');
  g.fillStyle = '#da251d';
  g.fillRect(0, 0, 180, 120);
  g.fillStyle = '#ffff00';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 15 : 36, a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(90 + r * Math.cos(a), 60 + r * Math.sin(a));
  }
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
