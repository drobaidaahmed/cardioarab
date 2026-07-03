/**
 * CardioArab — Service Worker
 * service-worker.js — v1.0
 * تخزين مؤقت خفيف لصفحات الواجهة فقط، بدون تخزين أي طلبات Supabase
 * (حتى تبقى حالة الاشتراك وتسجيل الدخول محدّثة دائماً من الخادم)
 */

const CACHE_NAME = 'cardioarab-shell-v1';

// الصفحات الأساسية التي يتم تخزينها لتحميل أسرع (لا تشمل صفحات الإرشادات الطبية)
const SHELL_URLS = [
  'index.html',
  'login.html',
  'register.html',
  'guidelines.html',
  'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_URLS))
      .catch(() => {}) // لا تفشل التثبيت لو فشل تخزين ملف واحد
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // لا تتدخل أبداً بطلبات Supabase (اشتراكات، تسجيل دخول، بيانات حية)
  if (url.includes('supabase.co')) return;

  // فقط طلبات GET قابلة للتخزين
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
