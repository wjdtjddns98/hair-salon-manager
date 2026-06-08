/* ============================================================
   Service Worker — 오프라인 지원 (앱 셸 캐싱)
   파일을 수정하면 아래 CACHE 버전을 올려주세요 (예: v2 → v3)
   ============================================================ */
const CACHE = "salon-app-v13";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/config.js",
  "./js/lib/supabase.js",
  "./js/cloud.js",
  "./js/db.js",
  "./js/utils.js",
  "./js/icons.js",
  "./js/memberpicker.js",
  "./js/members.js",
  "./js/reservations.js",
  "./js/visits.js",
  "./js/stats.js",
  "./js/dashboard.js",
  "./js/settings.js",
  "./js/lock.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
  "./icons/favicon-32.png",
  "./icons/favicon-64.png",
];

// 설치: 앱 셸 전부 캐시 (브라우저 HTTP 캐시 무시하고 최신본으로)
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((u) =>
        fetch(new Request(u, { cache: "reload" })).then((r) => c.put(u, r)).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

// 활성화: 이전 버전 캐시 정리
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 요청 처리: 네트워크 우선(온라인이면 항상 최신), 실패 시 캐시 (오프라인 지원)
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // 같은 출처 자원만 처리 (Supabase API 등 외부 요청은 건드리지 않음)
  if (!req.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(req, { cache: "no-store" })  // 온라인이면 브라우저 캐시 무시하고 항상 최신
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
