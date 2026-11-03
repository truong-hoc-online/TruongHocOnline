// Main game: wiring of the modules, labels, light by time of day, main loop, start screen.
import * as THREE from './vendor/three.module.min.js';
import { $, esc, sys, toast, ui } from './ui.js';
import { initInstall } from './install.js';
import * as eco from './economy.js';
import { flushOutbox } from './feedback.js';
import * as cloud from './cloud.js';
import { cls, G, TOUCH } from './ctx.js';
import { initSaveHooks, load, newState, newToday, SAVE_KEY } from './save.js';
import { endSchool, enterHome, enterSchool, finishSession, phaseTick, showSessionEnd } from './session.js';
import { CATALOG, catalogReady, initCatalog } from './shop.js';
import { findPrankTarget, fxTick, PRANK_RANGE } from './prank.js';
import { initInput, moveTick } from './input.js';
import { makePlayer, mySeat, respawnNpcs } from './player.js';
import { actionFor, interact } from './actions.js';
import { initChat } from './chat.js';
import { initHud, showHelp, updateHud } from './hud.js';
import { claimTransfer, onTransferredAway } from './online.js';
import { camera, camPos, hemi, npcs, renderer, ring, scene, SKY, sun, W } from './stage.js';

if (TOUCH) document.body.classList.add('touch');
initInstall();

initSaveHooks();
eco.setSink(cloud.queueCoco); // every coco change is replayed on the server wallet when online
cloud.initCloud({ onTransferredAway });
setInterval(() => { if (G.state && !document.hidden && !G.movedAway) cloud.syncCoco(G.state); }, 60_000);
initCatalog();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (w < h) G.camDist = Math.max(G.camDist, 22); // portrait phones see less sideways: pull back
}
addEventListener('resize', resize);
resize();

initInput();
initChat();
initHud();

let hudT = 0;

// ---------------- labels ----------------
const v3 = new THREE.Vector3();
function placeLabel(label, obj, h, visible) {
  if (!visible) { label.el.style.display = 'none'; return; }
  v3.set(obj.position.x, (obj.userData.sitting ? h - 0.35 : h), obj.position.z).project(camera);
  if (v3.z > 1 || v3.x < -1.2 || v3.x > 1.2 || v3.y < -1.2 || v3.y > 1.2) { label.el.style.display = 'none'; return; }
  label.el.style.display = '';
  label.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px, ${(-v3.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
}

// ---------------- light by time of day ----------------
const tmpC = new THREE.Color();
function applyLight() {
  const h = G.state.clock / 60;
  let day;
  if (h < 5 || h >= 20.5) day = 0;
  else if (h < 7) day = (h - 5) / 2;
  else if (h < 17) day = 1;
  else day = Math.max(0, 1 - (h - 17) / 3.5);
  hemi.intensity = 0.55 + 1.15 * day;
  sun.intensity = 0.25 + 2.0 * day;
  if (day >= 1) tmpC.copy(SKY.day);
  else if (h < 12) tmpC.lerpColors(SKY.night, SKY.day, day);
  else if (day > 0.5) tmpC.lerpColors(SKY.dusk, SKY.day, (day - 0.5) * 2);
  else tmpC.lerpColors(SKY.night, SKY.dusk, day * 2);
  scene.background.copy(tmpC);
  scene.fog.color.copy(tmpC);
}

// ---------------- main loop ----------------
const lookAt = new THREE.Vector3();
let last = performance.now();

function tick(t) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (!G.state || !G.player) { renderer.render(scene, camera); return; }
  const paused = ui.modalOpen;
  if (!paused) G.now += dt;

  moveTick(dt, paused);
  fxTick(dt);

  // game clock + phase logic
  if (!paused) phaseTick(dt);

  const npcCount = npcs.update(dt);

  // hotspot prompt
  G.currentAction = null;
  if (!paused && !G.busy) {
    let best = null, bd = Infinity;
    const spots = W.hotspots.slice();
    if (G.state.phase === 'school' && G.sub === 'class' && !G.sitting) { const s = mySeat(); spots.push({ id: 'seat', x: s.x, z: s.z, r: 1.3 }); }
    G.prankTarget = findPrankTarget();
    if (G.prankTarget) spots.push({ id: 'prank', x: G.prankTarget.mesh.position.x, z: G.prankTarget.mesh.position.z, r: PRANK_RANGE + 0.1 });
    for (const h of spots) {
      const d = Math.hypot(h.x - G.player.position.x, h.z - G.player.position.z);
      if (d < h.r && d < bd) {
        const a = actionFor(h.id);
        if (a) { best = a; bd = d; }
      }
    }
    G.currentAction = best;
  }
  const btn = $('actBtn');
  if (G.currentAction) { btn.hidden = false; btn.textContent = G.currentAction.label; } else btn.hidden = true;

  // seat ring
  ring.visible = G.state.phase === 'school' && G.sub === 'class' && !G.sitting;
  if (ring.visible) { const s = mySeat(); ring.position.set(s.x, 0.04, s.z); ring.scale.setScalar(1 + Math.sin(t / 200) * 0.1); }

  // camera
  const target = G.player.position;
  const want = v3.set(target.x, target.y + G.camDist * 0.85, target.z + G.camDist * 0.75);
  camPos.lerp(want, Math.min(1, dt * 6));
  camera.position.copy(camPos);
  lookAt.set(target.x, 1, target.z);
  camera.lookAt(lookAt);
  sun.position.set(target.x + 14, 30, target.z + 10);
  sun.target.position.set(target.x, 0, target.z);
  if (W.flag) W.flag.rotation.y = Math.sin(t / 600) * 0.15;

  // labels
  placeLabel(G.meLabel, G.player, 2.05, true);
  for (const n of npcs.list) placeLabel(n.label, n.mesh, n.teacher ? 2.15 : 2.05, !n.hidden && n.mesh.visible && n.mesh.position.distanceTo(target) < 34);

  hudT -= dt;
  if (hudT <= 0) { hudT = 0.25; updateHud(npcCount); applyLight(); }
  renderer.render(scene, camera);
}

// ---------------- start screen ----------------
async function begin(fresh) {
  $('start').hidden = true;
  $('hud').hidden = false;
  if (!G.state.today) G.state.today = newToday();
  await catalogReady;
  flushOutbox();
  cloud.syncCoco(G.state);
  $('btnRank').hidden = !cloud.enabled();
  respawnNpcs();
  makePlayer();
  if (fresh) await showHelp();
  sys(`Chào mừng ${G.state.name} đến ${G.state.school}!`);
  if (G.state.phase === 'home') {
    enterHome();
    sys(`Ngày ${G.state.day} — chuẩn bị đi học Lớp ${cls()}.`);
  } else if (Date.now() >= G.state.sessionEnd) {
    // the 6 hours ran out while the game was closed: the student walked home
    const sec = G.state.section;
    const sum = finishSession();
    enterHome();
    toast('🏠 Bạn đã tan trường và về nhà trong lúc vắng mặt.', 3500);
    await showSessionEnd(sum, sec);
  } else if (G.state.phase === 'after') {
    enterSchool(false);
    endSchool();
  } else enterSchool(false);
}

const saved = load();
if (saved) {
  $('continueBox').hidden = false;
  $('continueInfo').innerHTML = `<b>${esc(saved.name)}</b> · ${esc(saved.school)} · Lớp ${saved.grade}A${saved.section} · Ngày ${saved.day}`;
}
$('btnContinue').onclick = () => { G.state = saved; begin(false); };
$('btnTransferIn').hidden = !cloud.enabled();
$('btnTransferIn').onclick = () => { if (!ui.modalOpen) claimTransfer(); };
$('btnReset').onclick = async () => {
  if (!confirm('Xoá tiến độ và chơi lại từ đầu?')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  $('continueBox').hidden = true;
};
$('newForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('fName').value.trim().slice(0, 16) || 'Học sinh';
  const girl = document.querySelector('input[name=fGender]:checked').value === 'girl';
  G.state = newState(name, $('fSchool').value, girl);
  G.state.today = newToday();
  begin(true);
});

// test hook, only with ?debug in the URL
if (location.search.includes('debug')) {
  window.__g = {
    get state() { return G.state; }, get sub() { return G.sub; }, get sitting() { return G.sitting; }, get busy() { return G.busy; },
    W, npcs, interact, actionFor,
    tp: (x, z) => G.player.position.set(x, 0, z),
    skip: (sec) => { G.now += sec; },
    endSession: () => { G.state.sessionEnd = Date.now() - 1; },        // pretend the 6 hours are over
    finishWash: () => { if (G.state.uniform.washing) G.state.uniform.until = Date.now() - 1; },
    get catalog() { return CATALOG; },
    get prankTarget() { return G.prankTarget; },
    giveCoco: (n) => { G.state.coco += n; },
    get today() { return G.state.today; },
    pos: () => ({ x: G.player.position.x, z: G.player.position.z }),
  };
}

requestAnimationFrame(tick);
