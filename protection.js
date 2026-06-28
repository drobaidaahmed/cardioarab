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

})();
