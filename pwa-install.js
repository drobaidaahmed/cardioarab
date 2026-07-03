/**
 * CardioArab — PWA Install Banner
 * pwa-install.js — v1.0
 * يعرض بانر تلقائي يقترح تثبيت التطبيق على الشاشة الرئيسية
 */

(function () {
  'use strict';

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  // نلتقط حدث التثبيت الأصلي إن توفر (يعمل أحياناً حسب الجهاز/الشبكة)
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; });

  function showInstructions() {
    if (isIOS) {
      alert('١. دوس على زر المشاركة ⬆️ تحت\n٢. دوس "إضافة إلى الشاشة الرئيسية"');
    } else {
      alert('١. دوس على النقاط الثلاث ⋮ فوق\n٢. دوس "إضافة إلى الشاشة الرئيسية"');
    }
  }

  async function handleInstallClick() {
    // إذا كان التثبيت المباشر متاحاً (نادراً ما يفشل)، جربه أولاً — تثبيت بضغطة واحدة بدون تعليمات
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (_) {}
      deferredPrompt = null;
      return;
    }
    // غير متاح (الحالة الشائعة بسبب قيود Play Services إقليمياً) — نعرض التعليمات اليدوية
    showInstructions();
  }

  // إتاحة الدالة لأي زر يدوي بالصفحة (مثلاً زر "ثبّت التطبيق" بالهيدر) — دائماً متاحة بغض النظر عن حالة البانر
  window.caShowInstallInstructions = handleInstallClick;

  // لا تُظهر البانر إذا كان التطبيق يعمل أصلاً بوضع standalone (مثبّت فعلاً)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (isStandalone) return;

  // لا تُزعج المستخدم لو رفض البانر مؤخراً (إخفاء لمدة 7 أيام) — هذا يتحكم بالبانر فقط، وليس بالزر اليدوي
  const DISMISS_KEY = 'ca_pwa_dismissed_at';
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  if (dismissedAt && (Date.now() - Number(dismissedAt)) < 7 * 86400000) return;

  function buildBanner(btnText, onInstallClick) {
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
        <div style="font-weight:700;margin-bottom:2px">ثبّت CardioArab على جهازك</div>
        <div style="color:#94a3b8;font-size:.78rem">وصول أسرع، بدون فتح المتصفح في كل مرة</div>
      </div>
      <button id="ca-install-btn" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-family:inherit;font-size:.85rem;font-weight:700;white-space:nowrap;cursor:pointer">${btnText}</button>
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
    buildBanner('كيف؟', showInstructions);
  } else if (isAndroid) {
    // نجرب التثبيت المباشر إن توفر؛ وإلا نعرض تعليمات يدوية
    buildBanner('تثبيت', handleInstallClick);
  }

})();
