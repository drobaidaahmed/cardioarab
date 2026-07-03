/**
 * CardioArab — Content Protection
 * protection.js — v1.0
 * ضعه في نفس مجلد الملفات واستدعه في كل صفحة:
 * <script src="protection.js"></script>
 */

(function () {
  'use strict';

  // ─── 1. منع الكليك الأيمن ───────────────────────────────────────────────
  document.addEventListener('contextmenu', e => e.preventDefault());

  // ─── 2. منع تحديد النص ──────────────────────────────────────────────────
  document.addEventListener('selectstart', e => e.preventDefault());

  // ─── 3. منع السحب ───────────────────────────────────────────────────────
  document.addEventListener('dragstart', e => e.preventDefault());

  // ─── 4. منع اختصارات لوحة المفاتيح ─────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    const key = e.key.toLowerCase();

    // Ctrl / Cmd مع: C (نسخ) A (تحديد الكل) S (حفظ) P (طباعة) U (مصدر الصفحة) X (قص)
    if ((e.ctrlKey || e.metaKey) && ['c', 'a', 's', 'p', 'u', 'x'].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    // F12 — DevTools
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
    }

    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C — DevTools
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    // PrintScreen — تفريغ الحافظة فوراً
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      try { navigator.clipboard.writeText(''); } catch (_) {}
    }
  });

  // ─── 5. CSS: منع التحديد البصري ─────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    img {
      pointer-events: none !important;
      -webkit-user-drag: none !important;
    }
  `;
  document.head.appendChild(style);

  // ─── 6. منع فتح DevTools (كشف تغير الحجم) ──────────────────────────────
  const devToolsThreshold = 160;
  setInterval(function () {
    if (
      window.outerWidth - window.innerWidth > devToolsThreshold ||
      window.outerHeight - window.innerHeight > devToolsThreshold
    ) {
      // إعادة التوجيه أو إخفاء المحتوى عند فتح DevTools
      document.body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#8b5cf6;font-family:sans-serif;font-size:1.5rem;text-align:center;direction:rtl;padding:2rem">' +
        '🔒 هذا المحتوى محمي<br><small style="font-size:1rem;color:#94a3b8;margin-top:1rem;display:block">أغلق أدوات المطور للمتابعة</small>' +
        '</div>';
    }
  }, 1000);

  // ─── 7. منع طباعة الصفحة ────────────────────────────────────────────────
  window.addEventListener('beforeprint', function (e) {
    e.preventDefault();
    // إخفاء المحتوى عند الطباعة
    const printStyle = document.createElement('style');
    printStyle.setAttribute('id', 'print-block');
    printStyle.setAttribute('media', 'print');
    printStyle.textContent = `
      body * { display: none !important; visibility: hidden !important; }
      body::after {
        content: "🔒 هذا المحتوى محمي ولا يمكن طباعته";
        display: block !important;
        visibility: visible !important;
        font-size: 2rem;
        text-align: center;
        margin-top: 40vh;
        color: #000;
        font-family: sans-serif;
        direction: rtl;
      }
    `;
    document.head.appendChild(printStyle);
  });

  window.addEventListener('afterprint', function () {
    const s = document.getElementById('print-block');
    if (s) s.remove();
  });

  // ─── 8. تعطيل Clipboard API ─────────────────────────────────────────────
  document.addEventListener('copy', e => {
    e.preventDefault();
    if (e.clipboardData) e.clipboardData.setData('text/plain', '');
  });

  document.addEventListener('cut', e => {
    e.preventDefault();
  });

  // ─── 9. Watermark ديناميكي — اسم/بريد المشترك فوق المحتوى ────────────────
  function escapeXml(s) {
    return String(s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
  }

  function addWatermark() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('currentUser')); } catch (_) {}
    if (!user || (!user.name && !user.email)) return;

    const label = escapeXml(`${user.name || ''}   ${user.email || ''}`);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='170'>
      <text x='0' y='90' font-size='13' fill='rgba(255,255,255,0.07)' font-family='sans-serif' transform='rotate(-28 170 85)'>${label}</text>
    </svg>`;
    const bg = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));

    function ensureWatermark() {
      if (document.getElementById('ca-watermark')) return;
      const wm = document.createElement('div');
      wm.id = 'ca-watermark';
      wm.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:2147483000;background-image:url("${bg}");background-repeat:repeat;`;
      document.body.appendChild(wm);
    }

    ensureWatermark();
    // إعادة إدراجه لو تمت إزالته يدوياً من الصفحة
    setInterval(ensureWatermark, 2000);
  }

  if (document.body) addWatermark();
  else document.addEventListener('DOMContentLoaded', addWatermark);

  // ─── 10. مراقبة الجهاز — تسجيل خروج تلقائي لو تم الدخول من جهاز آخر ───────
  (function deviceWatch() {
    const SB_URL = 'https://ikisgwnsxadiujueeava.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraXNnd25zeGFkaXVqdWVlYXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NzU5ODYsImV4cCI6MjA5ODI1MTk4Nn0.Ar45kQJPOgJ9ITqGVv9XeSxpGgyx53s6CTmFCNDBa-g';

    async function checkDevice() {
      let user = null;
      try { user = JSON.parse(localStorage.getItem('currentUser')); } catch (_) {}
      if (!user || !user.id || user.is_admin) return;

      const myDevice = localStorage.getItem('deviceId');
      if (!myDevice) return;

      try {
        const res = await fetch(`${SB_URL}/rest/v1/users?id=eq.${user.id}&select=device_id`, {
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        });
        const rows = await res.json();
        if (rows.length && rows[0].device_id && rows[0].device_id !== myDevice) {
          localStorage.removeItem('currentUser');
          alert('⚠️ تم تسجيل الدخول إلى حسابك من جهاز آخر. تم تسجيل خروجك من هذا الجهاز.');
          location.href = 'login.html';
        }
      } catch (_) {}
    }

    checkDevice();
    setInterval(checkDevice, 60000); // كل دقيقة
  })();

})();
