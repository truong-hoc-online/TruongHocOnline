// Offline cache. BUMP `VERSION` WHENEVER ANY FILE CHANGES, otherwise installed apps keep the old files.
const VERSION = 'tho-v8';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'icon.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'js/game.js', 'js/world.js', 'js/chars.js', 'js/npc.js', 'js/ui.js', 'js/subjects.js', 'js/install.js',
  'js/items.js', 'js/economy.js', 'js/feedback.js', 'js/config.js', 'js/backend.js', 'js/cloud.js',
  'js/ctx.js', 'js/stage.js', 'js/save.js', 'js/session.js', 'js/laundry.js', 'js/shop.js', 'js/prank.js',
  'js/tags.js', 'js/input.js', 'js/player.js', 'js/actions.js', 'js/chat.js', 'js/hud.js', 'js/online.js',
  'mods/index.json', 'mods/base.json',
  'js/vendor/three.module.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)),
  );
});
