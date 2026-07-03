/**
 * CardioArab — PWA Install Banner
 * pwa-install.js — v1.0
 * يعرض بانر تلقائي يقترح تثبيت التطبيق على الشاشة الرئيسية
 */

(function () {
  'use strict';

  // لا تُظهر البانر إذا كان التطبيق يعمل أصلاً بوضع standalone (مثبّت فعلاً)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (isStandalone) return;

  // لا تُزعج المستخدم لو رفض البانر مؤخراً (إخفاء لمدة 7 أيام)
  const DISMISS_KEY = 'ca_pwa_dismissed_at';
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  if (dismissedAt && (Date.now() - Number(dismissedAt)) < 7 * 86400000) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  let deferredPrompt = null;

  function buildBanner(onInstallClick) {
    const bar = document.createElement('div');
    bar.id = 'ca-install-banner';
    bar.style.cssText = `
      position:fixed;left:0;right:0;bottom:0;z-index:2147483647;
      background:#111827;border-top:1px solid #1e2d45;
      padding:.85rem 1rem;display:flex;align-items:center;gap:.75rem;
      font-family:'IBM Plex Sans Arabic',sans-serif;direction:rtl;
      box-shadow:0 -4px 20px rgba(0,0,0,.35);
    `;
    bar.innerHTML = `
      <div style="font-size:1.6rem;line-height:1">🫀</div>
      <div style="flex:1;color:#e2e8f0;font-size:.85rem;line-height:1.5">
        <div id="ca-install-text" style="font-weight:700;margin-bottom:2px">ثبّت CardioArab على جهازك</div>
        <div style="color:#94a3b8;font-size:.78rem">وصول أسرع، بدون فتح المتصفح في كل مرة</div>
      </div>
      <button id="ca-install-btn" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-family:inherit;font-size:.85rem;font-weight:700;white-space:nowrap;cursor:pointer">تثبيت</button>
      <button id="ca-install-close" style="background:transparent;color:#94a3b8;border:none;font-size:1.2rem;cursor:pointer;padding:0 4px">✕</button>
    `;
    document.body.appendChild(bar);

    document.getElementById('ca-install-close').addEventListener('click', () => {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      bar.remove();
    });

    document.getElementById('ca-install-btn').addEventListener('click', onInstallClick);
    return bar;
  }

  if (isIOS) {
    // آيفون: ما في API تلقائي — نعرض تعليمات يدوية فقط
    const bar = buildBanner(() => {
      alert('لتثبيت التطبيق:\n1️⃣ اضغط زر المشاركة (⬆️) بالأسفل\n2️⃣ اختر "إضافة إلى الشاشة الرئيسية"');
    });
    document.getElementById('ca-install-btn').textContent = 'كيف؟';
  } else {
    // أندرويد/كروم: ننتظر الحدث الحقيقي القابل للتثبيت
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const bar = buildBanner(async () => {
        bar.remove();
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (choice.outcome !== 'accepted') {
          localStorage.setItem(DISMISS_KEY, Date.now().toString());
        }
      });
    });

    window.addEventListener('appinstalled', () => {
      const bar = document.getElementById('ca-install-banner');
      if (bar) bar.remove();
    });
  }

})();
