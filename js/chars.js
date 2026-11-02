// Chibi characters built from primitives (no external models).
import * as THREE from './vendor/three.module.min.js';

const geo = {
  head: new THREE.SphereGeometry(0.4, 20, 16),
  hair: new THREE.SphereGeometry(0.43, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
  bun: new THREE.SphereGeometry(0.16, 12, 10),
  body: new THREE.CylinderGeometry(0.26, 0.32, 0.5, 14),
  skirt: new THREE.CylinderGeometry(0.28, 0.42, 0.32, 14),
  dress: new THREE.CylinderGeometry(0.26, 0.4, 0.95, 14),
  leg: new THREE.CapsuleGeometry(0.09, 0.22, 4, 8),
  arm: new THREE.CapsuleGeometry(0.075, 0.26, 4, 8),
  eye: new THREE.SphereGeometry(0.05, 8, 6),
  scarf: new THREE.ConeGeometry(0.13, 0.26, 3),
  shadow: new THREE.CircleGeometry(0.42, 20),
};

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  return matCache.get(key);
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

// opts: { skin, hair, girl, teacher, shirt, pants, scarf }
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

  const legs = [];
  if (opts.teacher) {
    part(geo.dress, mat(opts.shirt ?? 0xf3a6c0), 0, 0.62, 0, bodyG);
    legs.push(part(geo.leg, mat(0xffffff), -0.1, 0.12, 0, bodyG), part(geo.leg, mat(0xffffff), 0.1, 0.12, 0, bodyG));
  } else {
    const pants = mat(opts.pants ?? (opts.girl ? 0x1f2f6b : 0x1e3a8a));
    legs.push(part(geo.leg, pants, -0.12, 0.2, 0, bodyG), part(geo.leg, pants, 0.12, 0.2, 0, bodyG));
    if (opts.girl) part(geo.skirt, pants, 0, 0.42, 0, bodyG);
    part(geo.body, mat(opts.shirt ?? 0xffffff), 0, 0.72, 0, bodyG);
  }
  const armM = mat(opts.teacher ? (opts.shirt ?? 0xf3a6c0) : (opts.shirt ?? 0xffffff));
  const armY = opts.teacher ? 0.85 : 0.75;
  const arms = [part(geo.arm, armM, -0.36, armY, 0, bodyG), part(geo.arm, armM, 0.36, armY, 0, bodyG)];
  arms[0].rotation.z = -0.25;
  arms[1].rotation.z = 0.25;

  const headY = opts.teacher ? 1.42 : 1.3;
  part(geo.head, mat(skin), 0, headY, 0, bodyG);
  const hairMesh = part(geo.hair, mat(hair), 0, headY + 0.03, -0.03, bodyG);
  hairMesh.rotation.x = -0.25;
  if (opts.girl || opts.teacher) part(geo.bun, mat(hair), 0, headY + 0.18, -0.38, bodyG);
  part(geo.eye, mat(0x1a1a1a), -0.13, headY + 0.02, 0.36, bodyG);
  part(geo.eye, mat(0x1a1a1a), 0.13, headY + 0.02, 0.36, bodyG);

  const scarf = part(geo.scarf, mat(0xd62828), 0, 0.82, 0.27, bodyG);
  scarf.rotation.x = Math.PI;
  scarf.scale.set(1, 1, 0.35);
  scarf.visible = !!opts.scarf;

  if (opts.acc) addAccessory(bodyG, headY, opts.acc);

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
function addAccessory(parent, headY, { kind, color }) {
  const m = mat(new THREE.Color(color).getHex());
  if (kind === 'cap') {
    part(accGeo.capTop, m, 0, headY + 0.05, 0, parent);
    const b = part(accGeo.brim, m, 0, headY + 0.14, 0.18, parent);
    b.scale.set(1, 1, 1.1);
  } else if (kind === 'bow') {
    const l = part(accGeo.bowPart, m, -0.12, headY + 0.4, 0.05, parent);
    const r = part(accGeo.bowPart, m, 0.12, headY + 0.4, 0.05, parent);
    l.rotation.z = Math.PI / 2;
    r.rotation.z = -Math.PI / 2;
    part(accGeo.knot, m, 0, headY + 0.4, 0.05, parent);
  } else if (kind === 'glasses') {
    part(accGeo.lens, m, -0.13, headY + 0.02, 0.39, parent);
    part(accGeo.lens, m, 0.13, headY + 0.02, 0.39, parent);
  } else if (kind === 'headband') {
    const h = part(accGeo.band, m, 0, headY + 0.1, 0, parent);
    h.rotation.y = Math.PI / 2;
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
