// three.js renderer, scene, lights, camera, the world and its NPCs.
import * as THREE from './vendor/three.module.min.js';
import { buildWorld } from './world.js';
import { Npcs } from './npc.js';
import { $ } from './ui.js';
import { TOUCH } from './ctx.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2)); // phones: fewer pixels = smoother, cooler
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);

export const scene = new THREE.Scene();
export const SKY = { day: new THREE.Color(0xbfe3ff), dusk: new THREE.Color(0xf4b183), night: new THREE.Color(0x1d2b4a) };
scene.background = SKY.day.clone();
scene.fog = new THREE.Fog(0xbfe3ff, 70, 160);
export const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
export const hemi = new THREE.HemisphereLight(0xffffff, 0x8aa070, 1.6);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 90 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

export const W = buildWorld(scene);
export const npcs = new Npcs(scene, W);

export const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.65, 32), new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.9 }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.04;
ring.visible = false;
scene.add(ring);

export const camPos = new THREE.Vector3(0, 15, 15);
