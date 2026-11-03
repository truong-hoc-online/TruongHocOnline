// Keyboard, joystick, tap-to-move and pinch zoom; moving the player each frame.
import * as THREE from './vendor/three.module.min.js';
import { animateCharacter, faceTowards } from './chars.js';
import { $, ui } from './ui.js'; // audio unlock on the first gesture is registered by ui.js itself
import { clamp, G, TOUCH } from './ctx.js';
import { collide } from './player.js';
import { interact } from './actions.js';
import { camera, renderer, scene } from './stage.js';

const keys = new Set();
const joy = { x: 0, z: 0, id: null };
const chatFocused = () => document.activeElement === $('chatInput');

const canvas = renderer.domElement;
const touches = new Map();
let pinchD0 = 0, pinchCam0 = 0, tapStart = null;
let moveTarget = null;
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const moveMark = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
moveMark.rotation.x = -Math.PI / 2;
moveMark.visible = false;
scene.add(moveMark);
const pinchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
function tapToMove(cx, cy) {
  if (!G.state || !G.player || ui.modalOpen || G.busy || G.sitting) return;
  raycaster.setFromCamera({ x: (cx / innerWidth) * 2 - 1, y: -(cy / innerHeight) * 2 + 1 }, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;
  moveTarget = { x: hit.x, z: hit.z, stuck: 0 };
  moveMark.position.set(hit.x, 0.05, hit.z);
  moveMark.visible = true;
}
export function clearMoveTarget() { moveTarget = null; moveMark.visible = false; }
const joyEl = $('joy'), knob = $('joyKnob');
function moveJoy(e) {
  const r = joyEl.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dz = e.clientY - (r.top + r.height / 2);
  const len = Math.hypot(dx, dz), max = r.width / 2 - 10;
  if (len > max) { dx *= max / len; dz *= max / len; }
  knob.style.transform = `translate(${dx}px, ${dz}px)`;
  joy.x = dx / max;
  joy.z = dz / max;
}

export function initInput() {
  addEventListener('keydown', (e) => {
    if (chatFocused()) {
      if (e.key === 'Escape') $('chatInput').blur();
      return;
    }
    if (e.key === 'Enter' && !ui.modalOpen && G.state) { e.preventDefault(); $('chatInput').focus(); return; }
    keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === 'e' || e.key === ' ') { e.preventDefault(); interact(); }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  renderer.domElement.addEventListener('wheel', (e) => { G.camDist = clamp(G.camDist + Math.sign(e.deltaY) * 1.5, 8, 30); }, { passive: true });

  if (TOUCH) $('joy').hidden = false;

  // ---- touch on the 3D view: tap ground = walk there, two fingers = zoom ----
  canvas.addEventListener('pointerdown', (e) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { pinchD0 = pinchDist(); pinchCam0 = G.camDist; tapStart = null; }
    else if (touches.size === 1) tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2 && pinchD0 > 0) G.camDist = clamp(pinchCam0 * (pinchD0 / pinchDist()), 8, 32);
  });
  const endTouch = (e) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinchD0 = 0;
    if (!tapStart || e.type === 'pointercancel') return;
    const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
    if (moved < 12 && performance.now() - tapStart.t < 350) tapToMove(e.clientX, e.clientY);
    tapStart = null;
  };
  canvas.addEventListener('pointerup', endTouch);
  canvas.addEventListener('pointercancel', endTouch);

  // chat button (touch): opens the input above the keyboard
  $('btnChat').onclick = () => {
    document.body.classList.add('chatting');
    $('chatInput').focus();
  };
  $('chatInput').addEventListener('blur', () => setTimeout(() => document.body.classList.remove('chatting'), 150));
  // tap the school pill to fold the info panel
  document.querySelector('.pill.school').addEventListener('click', () => $('info').classList.toggle('compact'));
  if (TOUCH && innerHeight < 700) $('info').classList.add('compact');
  joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); moveJoy(e); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) moveJoy(e); });
  const endJoy = () => { joy.id = null; joy.x = joy.z = 0; knob.style.transform = ''; };
  joyEl.addEventListener('pointerup', endJoy);
  joyEl.addEventListener('pointercancel', endJoy);
  $('actBtn').addEventListener('click', interact);
}

// movement for one frame: keys/joystick, else walk towards the tapped point
export function moveTick(dt, paused) {
  let mx = 0, mz = 0;
  if (!paused && !G.sitting && !chatFocused() && !G.busy) {
    if (keys.has('w') || keys.has('arrowup')) mz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) mz += 1;
    if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
    if (keys.has('d') || keys.has('arrowright')) mx += 1;
    mx += joy.x;
    mz += joy.z;
  }
  let len = Math.hypot(mx, mz);
  if (len > 0.1) clearMoveTarget(); // manual control wins over tap-to-move
  else if (moveTarget && !paused && !G.sitting && !G.busy) {
    const dx = moveTarget.x - G.player.position.x, dz = moveTarget.z - G.player.position.z, d = Math.hypot(dx, dz);
    if (d < 0.3) clearMoveTarget();
    else { mx = dx / d; mz = dz / d; len = 1; }
  } else if (moveTarget && (G.sitting || G.busy)) clearMoveTarget();
  let moved = 0;
  if (len > 0.1) {
    const sp = (G.state.stats.energy < 20 ? 3 : 4.6) * Math.min(1, len) / len;
    const ox = G.player.position.x, oz = G.player.position.z;
    G.player.position.x += mx * sp * dt;
    G.player.position.z += mz * sp * dt;
    collide(G.player.position);
    moved = Math.hypot(G.player.position.x - ox, G.player.position.z - oz) / dt;
    faceTowards(G.player, mx, mz, dt);
    if (moveTarget) { // blocked by a wall for a moment → give up
      moveTarget.stuck = moved < sp * len * 0.3 ? moveTarget.stuck + dt : 0;
      if (moveTarget.stuck > 0.4) clearMoveTarget();
    }
  }
  animateCharacter(G.player, dt, moved);
}
