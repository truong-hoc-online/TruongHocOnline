// Chibi characters built from primitives (no external models).
// Performance (phones): every part that does not move on its own (body, head, hair, eyes, accessory) is baked into
// ONE vertex-coloured mesh per character, and identical looks share that geometry. Only the 4 limbs (animated) and
// the scarf (toggled by game.js through userData.scarf.visible) stay separate meshes.
import * as THREE from './vendor/three.module.min.js';

// Segment counts trimmed a little for phones (~40% fewer triangles per character; same silhouette at game zoom).
const geo = {
  head: new THREE.SphereGeometry(0.4, 18, 13),
  hair: new THREE.SphereGeometry(0.43, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.52),
  bun: new THREE.SphereGeometry(0.16, 10, 7),
  body: new THREE.CylinderGeometry(0.26, 0.32, 0.5, 14),
  skirt: new THREE.CylinderGeometry(0.28, 0.42, 0.32, 14),
  dress: new THREE.CylinderGeometry(0.26, 0.4, 0.95, 14),
  leg: new THREE.CapsuleGeometry(0.09, 0.22, 2, 8),
  arm: new THREE.CapsuleGeometry(0.075, 0.26, 2, 8),
  eye: new THREE.SphereGeometry(0.05, 6, 4),
  scarf: new THREE.ConeGeometry(0.13, 0.26, 3),
  shadow: new THREE.CircleGeometry(0.42, 20),
};

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  return matCache.get(key);
}
// One shared material for every baked (vertex-coloured) character body.
const bakedMat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });

// ---- geometry merging (Three.js r160 ships no BufferGeometryUtils in this repo) ----
const _v = new THREE.Vector3(), _nm = new THREE.Matrix3(), _c = new THREE.Color();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
// Matrix from position / Euler rotation / scale (same order as Object3D: T * R * S).
export function trs(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
// parts: [{ geo, matrix, color }] → one indexed BufferGeometry with position, normal, color (no uv: only for
// untextured parts). Colours are converted exactly like a material colour, so a white vertexColors material looks the same.
export function mergeParts(parts) {
  let nv = 0, ni = 0;
  for (const p of parts) {
    const n = p.geo.attributes.position.count;
    nv += n;
    ni += p.geo.index ? p.geo.index.count : n;
  }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const p of parts) {
    const P = p.geo.attributes.position, N = p.geo.attributes.normal, I = p.geo.index;
    _nm.getNormalMatrix(p.matrix);
    _c.set(p.color);
    for (let i = 0; i < P.count; i++) {
      const k = (vo + i) * 3;
      _v.fromBufferAttribute(P, i).applyMatrix4(p.matrix);
      pos[k] = _v.x; pos[k + 1] = _v.y; pos[k + 2] = _v.z;
      _v.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize();
      nor[k] = _v.x; nor[k + 1] = _v.y; nor[k + 2] = _v.z;
      col[k] = _c.r; col[k + 1] = _c.g; col[k + 2] = _c.b;
    }
    if (I) for (let j = 0; j < I.count; j++) idx[io++] = I.getX(j) + vo;
    else for (let j = 0; j < P.count; j++) idx[io++] = vo + j;
    vo += P.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

export const SKINS = [0xf6d5b8, 0xeec39a, 0xe0ac7e, 0xc68e62];
export const HAIRS = [0x2b1d14, 0x4a2f1d, 0x6b4226, 0x1a1a1a, 0x8a5a2b];

function part(g, m, x, y, z, parent) {
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Baked body geometry, shared by every character with the same look.
const bodyCache = new Map();
function bodyGeometry(opts, skin, hair) {
  const shirt = opts.shirt ?? (opts.teacher ? 0xf3a6c0 : 0xffffff);
  const pants = opts.pants ?? (opts.girl ? 0x1f2f6b : 0x1e3a8a);
  const acc = opts.acc ? `${opts.acc.kind}:${opts.acc.color}` : '';
  const key = [opts.teacher ? 1 : 0, opts.girl ? 1 : 0, shirt, pants, skin, hair, acc].join('|');
  if (bodyCache.has(key)) return bodyCache.get(key);
  const P = [];
  const add = (g, color, m) => P.push({ geo: g, color, matrix: m });
  if (opts.teacher) add(geo.dress, shirt, trs(0, 0.62, 0));
  else {
    if (opts.girl) add(geo.skirt, pants, trs(0, 0.42, 0));
    add(geo.body, shirt, trs(0, 0.72, 0));
  }
  const headY = opts.teacher ? 1.42 : 1.3;
  add(geo.head, skin, trs(0, headY, 0));
  add(geo.hair, hair, trs(0, headY + 0.03, -0.03, -0.25));
  if (opts.girl || opts.teacher) add(geo.bun, hair, trs(0, headY + 0.18, -0.38));
  add(geo.eye, 0x1a1a1a, trs(-0.13, headY + 0.02, 0.36));
  add(geo.eye, 0x1a1a1a, trs(0.13, headY + 0.02, 0.36));
  if (opts.acc) accessoryParts(add, headY, opts.acc);
  const g = mergeParts(P);
  bodyCache.set(key, g);
  return g;
}

// opts: { skin, hair, girl, teacher, shirt, pants, scarf, acc }
export function makeCharacter(opts = {}) {
  const skin = opts.skin ?? SKINS[0];
  const hair = opts.hair ?? HAIRS[0];
  const root = new THREE.Group();
  const bodyG = new THREE.Group();
  root.add(bodyG);

  const sh = new THREE.Mesh(geo.shadow, mat(0x000000, { transparent: true, opacity: 0.18, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  root.add(sh);

  const body = new THREE.Mesh(bodyGeometry(opts, skin, hair), bakedMat);
  body.castShadow = true;
  bodyG.add(body);

  const legs = [];
  if (opts.teacher) {
    legs.push(part(geo.leg, mat(0xffffff), -0.1, 0.12, 0, bodyG), part(geo.leg, mat(0xffffff), 0.1, 0.12, 0, bodyG));
  } else {
    const pants = mat(opts.pants ?? (opts.girl ? 0x1f2f6b : 0x1e3a8a));
    legs.push(part(geo.leg, pants, -0.12, 0.2, 0, bodyG), part(geo.leg, pants, 0.12, 0.2, 0, bodyG));
  }
  const armM = mat(opts.teacher ? (opts.shirt ?? 0xf3a6c0) : (opts.shirt ?? 0xffffff));
  const armY = opts.teacher ? 0.85 : 0.75;
  const arms = [part(geo.arm, armM, -0.36, armY, 0, bodyG), part(geo.arm, armM, 0.36, armY, 0, bodyG)];
  arms[0].rotation.z = -0.25;
  arms[1].rotation.z = 0.25;

  const scarf = part(geo.scarf, mat(0xd62828), 0, 0.82, 0.27, bodyG);
  scarf.rotation.x = Math.PI;
  scarf.scale.set(1, 1, 0.35);
  scarf.visible = !!opts.scarf;

  root.userData = { bodyG, legs, arms, scarf, phase: Math.random() * 6, sitting: false };
  return root;
}

// Accessory shapes are fixed here; mods only choose the kind and colour (see items.js ACC_KINDS).
const accGeo = {
  capTop: new THREE.SphereGeometry(0.45, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
  brim: new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16, 1, false, -Math.PI / 2, Math.PI),
  bowPart: new THREE.ConeGeometry(0.11, 0.2, 4),
  knot: new THREE.SphereGeometry(0.06, 8, 6),
  lens: new THREE.TorusGeometry(0.085, 0.018, 6, 16),
  band: new THREE.TorusGeometry(0.42, 0.035, 6, 24, Math.PI),
};
function accessoryParts(add, headY, { kind, color }) {
  const c = new THREE.Color(color).getHex();
  if (kind === 'cap') {
    add(accGeo.capTop, c, trs(0, headY + 0.05, 0));
    add(accGeo.brim, c, trs(0, headY + 0.14, 0.18, 0, 0, 0, 1, 1, 1.1));
  } else if (kind === 'bow') {
    add(accGeo.bowPart, c, trs(-0.12, headY + 0.4, 0.05, 0, 0, Math.PI / 2));
    add(accGeo.bowPart, c, trs(0.12, headY + 0.4, 0.05, 0, 0, -Math.PI / 2));
    add(accGeo.knot, c, trs(0, headY + 0.4, 0.05));
  } else if (kind === 'glasses') {
    add(accGeo.lens, c, trs(-0.13, headY + 0.02, 0.39));
    add(accGeo.lens, c, trs(0.13, headY + 0.02, 0.39));
  } else if (kind === 'headband') {
    add(accGeo.band, c, trs(0, headY + 0.1, 0, 0, Math.PI / 2, 0));
  }
}

// Call every frame. speed = units/sec actually moved.
export function animateCharacter(ch, dt, speed) {
  const u = ch.userData;
  if (u.sitting) {
    u.bodyG.position.y = 0.25;
    u.legs.forEach((l) => (l.rotation.x = -1.3));
    return;
  }
  u.legs.forEach((l) => (l.rotation.x = 0));
  if (speed > 0.1) {
    u.phase += dt * 12;
    const s = Math.sin(u.phase);
    u.legs[0].rotation.x = s * 0.7;
    u.legs[1].rotation.x = -s * 0.7;
    u.arms[0].rotation.x = -s * 0.6;
    u.arms[1].rotation.x = s * 0.6;
    u.bodyG.position.y = Math.abs(Math.cos(u.phase)) * 0.06;
  } else {
    u.phase += dt * 2;
    u.arms[0].rotation.x = u.arms[1].rotation.x = 0;
    u.bodyG.position.y = Math.sin(u.phase) * 0.015;
  }
}

export function faceTowards(ch, dx, dz, dt, rate = 12) {
  if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
  const target = Math.atan2(dx, dz);
  let d = target - ch.rotation.y;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  ch.rotation.y += d * Math.min(1, dt * rate);
}
