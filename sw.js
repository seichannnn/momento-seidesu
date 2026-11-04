/* MOMENTO 紹介サイト用 Service Worker（静的ページのオフライン表示用）
   ページやアイコンを更新したときは、下の VERSION を変えてください。 */
const VERSION = 'momento-site-v1';
const CORE = ['./', 'index.html', 'privacy.html', 'terms.html', 'contact.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('momento-site-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 別のオリジン（稼働状況API、アプリ本体など）には一切触れない
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // ページは「通信を優先」し、オフラインのときだけ保存済みを表示
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || caches.match('index.html')))
    );
    return;
  }
  // 画像・アイコンなどは保存済みを先に表示し、裏で更新
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })
        .catch(() => cached);
      return cached || net;
    })
  );
});
