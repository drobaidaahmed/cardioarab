/**
 * CardioArab — Service Worker
 * service-worker.js — v1.1
 * تخزين مؤقت خفيف لصفحات الواجهة الأساسية فقط (SHELL_URLS).
 * لا يُخزَّن أي محتوى طبي (فصول، إرشادات، PCI...) ولا أي طلبات Supabase،
 * حتى تبقى حالة الاشتراك وتسجيل الدخول محدّثة دائماً من الخادم،
 * ولا تبقى نسخة من المحتوى المدفوع على جهاز المستخدم.
 */

const CACHE_NAME = 'cardioarab-shell-v3';

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
  // يحذف كل النسخ القديمة (ومنها أي صفحات محتوى كانت مخزّنة سابقاً)
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // فقط طلبات GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // لا تتدخل أبداً بطلبات Supabase (اشتراكات، تسجيل دخول، بيانات حية)
  if (url.hostname.includes('supabase.co')) return;

  // لا تتدخل بأي طلب من خارج الموقع
  if (url.origin !== self.location.origin) return;

  // لا تخزّن إلا الصفحات الأساسية؛ أي صفحة أخرى (محتوى طبي) تذهب للشبكة مباشرة
  const file = url.pathname.split('/').pop() || 'index.html';
  if (!SHELL_URLS.includes(file)) return;

  // الصفحات الأساسية: الشبكة أولاً، والنسخة المخزّنة عند انقطاع الاتصال
  event.respondWith(
    fetch(req)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return response;
      })
      .catch(() => caches.match(req))
  );
});
