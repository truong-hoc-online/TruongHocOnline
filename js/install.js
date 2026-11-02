// "Add to home screen" guide (iPhone / Android) + service worker registration.
import { $ } from './ui.js';

const KEY = 'tho-install';
const ua = navigator.userAgent;
export const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const iosOtherBrowser = /CriOS|EdgiOS|FxiOS|OPiOS/.test(ua);
let deferred = null; // Android/Chrome native install prompt

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;

function getPref() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function setPref(p) { try { localStorage.setItem(KEY, JSON.stringify({ ...getPref(), ...p })); } catch { /* ignore */ } }

export const canOfferInstall = () => !isStandalone() && (isIOS || isAndroid || !!deferred);

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  refreshButton();
});
addEventListener('appinstalled', () => { setPref({ installed: true }); closeSheet(); refreshButton(); });

function refreshButton() {
  const b = $('btnInstall');
  if (b) b.hidden = !canOfferInstall();
}

const STEP = (n, title, extra = '') => `<li><span class="num">${n}</span><div><b>${title}</b>${extra}</div></li>`;
const KEYCAP = (t) => `<span class="keycap">${t}</span>`;
const SHARE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
const host = location.host || 'trường-học';

function iosSafariSteps() {
  return `<ol class="steps">
    ${STEP(1, `Chạm nút ${KEYCAP('•••')} ở thanh dưới của Safari`, `<div class="mockbar"><span class="back">‹</span><span class="url">${host}</span><span class="dots">•••</span></div>`)}
    ${STEP(2, 'Chạm Chia sẻ', `<div class="iconbox">${SHARE}</div>`)}
    ${STEP(3, 'Kéo xuống, chọn Thêm vào MH chính', `<div class="row-mock">Thêm vào MH chính ${PLUS}</div><small>Không thấy? Chạm <b>Sửa tác vụ</b> / <b>Xem thêm</b> ở cuối danh sách.</small>`)}
    ${STEP(4, 'Chạm Thêm ở góc trên bên phải', '<small>Biểu tượng <b>Trường Học</b> sẽ nằm trên màn hình chính.</small>')}
  </ol>
  <p class="info">ⓘ iOS 18 trở về trước: nút Chia sẻ ${SHARE} nằm ngay trên thanh dưới, bỏ qua bước 1.</p>`;
}
function iosOtherSteps() {
  return `<ol class="steps">
    ${STEP(1, `Chạm nút Chia sẻ ${SHARE} ở thanh địa chỉ (góc trên bên phải)`)}
    ${STEP(2, 'Kéo xuống, chọn Thêm vào MH chính', `<div class="row-mock">Thêm vào MH chính ${PLUS}</div>`)}
    ${STEP(3, 'Chạm Thêm ở góc trên bên phải')}
  </ol>
  <p class="info">ⓘ Nếu không thấy mục này, hãy mở trang bằng <b>Safari</b> rồi làm lại.</p>`;
}
function androidSteps() {
  return `<ol class="steps">
    ${STEP(1, `Chạm nút ${KEYCAP('⋮')} ở góc trên bên phải trình duyệt`)}
    ${STEP(2, 'Chọn Thêm vào màn hình chính hoặc Cài đặt ứng dụng', `<div class="row-mock">Thêm vào màn hình chính ${PLUS}</div>`)}
    ${STEP(3, 'Chạm Cài đặt / Thêm', '<small>Biểu tượng <b>Trường Học</b> sẽ nằm trên màn hình chính.</small>')}
  </ol>`;
}

// Native one-tap install. prompt() is only allowed inside a user gesture (tap), never from a timer.
async function nativeInstall() {
  if (!deferred) return;
  const d = deferred;
  deferred = null;
  d.prompt();
  const { outcome } = await d.userChoice;
  if (outcome === 'accepted') { setPref({ installed: true }); closeSheet(); }
  refreshButton();
}

// fromTap: called from a button press (can use the native prompt directly)
export async function showInstall(fromTap = false) {
  if (deferred && fromTap) return nativeInstall();
  const title = isIOS ? 'Cài trên iPhone' : isAndroid ? 'Cài trên Android' : 'Cài lên điện thoại';
  const body = isIOS ? (iosOtherBrowser ? iosOtherSteps() : iosSafariSteps()) : androidSteps();
  $('installTitle').textContent = title;
  $('installBody').innerHTML = (deferred ? '<button class="primary" id="installNative">📲 Cài ngay (1 chạm)</button><p class="info">Hoặc làm theo các bước:</p>' : '') + body +
    (isIOS ? '<p class="warn">⚠️ Tiến độ chơi trong trình duyệt <b>không chuyển sang</b> app đã cài. Nên cài trước rồi mới tạo nhân vật.</p>' : '');
  const nb = $('installNative');
  if (nb) nb.onclick = nativeInstall;
  $('install').hidden = false;
}

function closeSheet() { $('install').hidden = true; }

export function initInstall() {
  $('installDone').onclick = () => { setPref({ installed: true }); closeSheet(); };
  $('installLater').onclick = () => { setPref({ laterAt: Date.now() }); closeSheet(); };
  $('installClose').onclick = () => { setPref({ laterAt: Date.now() }); closeSheet(); };
  $('btnInstall').onclick = () => showInstall(true);
  refreshButton();
  // auto-show once on phones (not again for 3 days after "Để sau")
  const p = getPref();
  const recently = p.laterAt && Date.now() - p.laterAt < 3 * 864e5;
  if ((isIOS || isAndroid) && !isStandalone() && !p.installed && !recently) setTimeout(() => { if (!isStandalone()) showInstall(); }, 900);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache is optional */ });
  }
}
