/**
 * CardioArab — Local Notes & Reading Progress
 * notes.js — v1.0
 *
 * ميزة محلية بالكامل (localStorage) — لا تتصل بأي سيرفر ولا تُخزَّن على Supabase.
 * الملاحظات وتقدّم القراءة يبقيان فقط على جهاز المستخدم/متصفحه.
 * لا علاقة لهذا الملف بمنطق الاشتراك/الحماية (protection.js) ولا يُعدّله بأي شكل.
 *
 * أضفه في كل صفحة محتوى بعد protection.js:
 * <script src="notes.js"></script>
 *
 * لإخفاء الودجت العائم في صفحة معيّنة (مثل صفحات الدخول/التسجيل):
 * <script>window.CA_NOTES_NO_WIDGET = true;</script> قبل استدعاء notes.js
 */

(function () {
  'use strict';

  const NOTES_KEY = 'ca_notes_v1';
  const PROGRESS_KEY = 'ca_reading_progress_v1';

  function pageKey() {
    return (location.pathname.split('/').pop() || 'index.html');
  }

  function pageTitle() {
    let t = document.title || pageKey();
    // إزالة اسم الموقع من نهاية العنوان إن وجد (مثل: "... — CardioArab")
    t = t.split('—')[0].split('|')[0].trim();
    return t || pageKey();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }); }
    catch (_) { return ''; }
  }

  // ───────────────────────── تخزين الملاحظات ─────────────────────────────
  const Notes = {
    all() {
      try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || []; }
      catch (_) { return []; }
    },
    _save(list) {
      try { localStorage.setItem(NOTES_KEY, JSON.stringify(list)); } catch (_) {}
    },
    forPage(key) {
      return this.all().filter(n => n.pageKey === key);
    },
    add(text, section) {
      const list = this.all();
      const note = {
        id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        pageKey: pageKey(),
        pageTitle: pageTitle(),
        section: section || '',
        text: text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(note);
      this._save(list);
      return note;
    },
    update(id, text) {
      const list = this.all();
      const n = list.find(x => x.id === id);
      if (!n) return null;
      n.text = text;
      n.updatedAt = new Date().toISOString();
      this._save(list);
      return n;
    },
    remove(id) {
      this._save(this.all().filter(n => n.id !== id));
    },
    removeAll() {
      this._save([]);
    }
  };

  // ───────────────────────── تخزين تقدّم القراءة ──────────────────────────
  const Progress = {
    all() {
      try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
      catch (_) { return {}; }
    },
    _save(obj) {
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(obj)); } catch (_) {}
    },
    get(key) { return this.all()[key] || null; },
    set(key, percent, title) {
      const obj = this.all();
      obj[key] = { percent: percent, title: title || key, updatedAt: new Date().toISOString() };
      this._save(obj);
    },
    remove(key) {
      const obj = this.all();
      delete obj[key];
      this._save(obj);
    },
    recent(limit) {
      const obj = this.all();
      return Object.keys(obj)
        .map(k => Object.assign({ pageKey: k }, obj[k]))
        .filter(p => p.percent >= 3 && p.percent <= 97)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, limit || 20);
    }
  };

  // إتاحتها لصفحات أخرى (مثل profile.html) دون الحاجة لإعادة كتابتها
  window.CANotes = Notes;
  window.CAProgress = Progress;
  window.CAUtils = { escapeHtml, fmtDate, pageKey, pageTitle };

  // إن كانت هذه صفحة "بروفايل" أو إدارة، لا نعرض الودجت العائم
  if (window.CA_NOTES_NO_WIDGET) return;

  // ───────────────── تحديد العنوان الحالي أثناء التمرير (للسياق) ──────────
  function currentSectionTitle() {
    try {
      const secs = document.querySelectorAll('.section[id], section[id]');
      if (!secs.length) return '';
      let best = null;
      secs.forEach(s => {
        const top = s.getBoundingClientRect().top;
        if (top - 150 <= 0) best = s;
      });
      if (!best) best = secs[0];
      const h = best.querySelector('h1,h2,h3');
      return h ? h.textContent.trim().slice(0, 120) : (best.id || '');
    } catch (_) { return ''; }
  }

  // ───────────────────────── تتبّع تقدّم القراءة ──────────────────────────
  let progressTimer = null;
  function trackProgress() {
    const d = document.documentElement;
    const scrollable = d.scrollHeight - d.clientHeight;
    if (scrollable <= 40) return; // صفحة قصيرة جداً، لا داعي للتتبع
    const percent = Math.min(100, Math.max(0, Math.round((window.scrollY || d.scrollTop) / scrollable * 100)));
    clearTimeout(progressTimer);
    progressTimer = setTimeout(() => Progress.set(pageKey(), percent, pageTitle()), 500);
  }
  window.addEventListener('scroll', trackProgress, { passive: true });
  window.addEventListener('beforeunload', trackProgress);

  // ───────────────────────── بانر "تابع من حيث توقفت" ─────────────────────
  function initResumeBanner() {
    const saved = Progress.get(pageKey());
    if (!saved || saved.percent < 5 || saved.percent > 96) return;

    const banner = document.createElement('div');
    banner.id = 'ca-resume-banner';
    banner.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:2147483000;' +
      'background:#111827;border:1px solid #1e2d45;color:#e2e8f0;padding:.7rem .9rem;' +
      'border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.45);' +
      "font-family:'IBM Plex Sans Arabic',sans-serif;font-size:.82rem;display:flex;" +
      'align-items:center;gap:.6rem;direction:rtl;max-width:90vw;flex-wrap:wrap';
    banner.innerHTML =
      '<span>📍 وصلت هنا سابقاً — ' + saved.percent + '%</span>' +
      '<button id="ca-resume-go" style="background:#8b5cf6;color:#fff;border:none;' +
      'padding:.35rem .8rem;border-radius:8px;font-weight:700;cursor:pointer;' +
      "font-family:inherit;font-size:.78rem\">تابع القراءة</button>" +
      '<button id="ca-resume-close" title="إغلاق" style="background:transparent;border:none;' +
      "color:#94a3b8;cursor:pointer;font-size:1rem;line-height:1;padding:0 .2rem\">✕</button>";
    document.body.appendChild(banner);

    document.getElementById('ca-resume-go').addEventListener('click', () => {
      const d = document.documentElement;
      const target = (saved.percent / 100) * (d.scrollHeight - d.clientHeight);
      window.scrollTo({ top: target, behavior: 'smooth' });
      banner.remove();
    });
    document.getElementById('ca-resume-close').addEventListener('click', () => banner.remove());
  }

  // ───────────────────────── الودجت العائم للملاحظات ──────────────────────
  function initWidget() {
    const fab = document.createElement('button');
    fab.id = 'ca-notes-fab';
    fab.type = 'button';
    fab.title = 'ملاحظاتي في هذه الصفحة';
    fab.textContent = '📝';
    fab.style.cssText = 'position:fixed;bottom:18px;right:18px;z-index:2147483000;' +
      'width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#7c3aed);' +
      'color:#fff;border:none;font-size:1.35rem;cursor:pointer;box-shadow:0 6px 20px rgba(139,92,246,.5)';
    document.body.appendChild(fab);

    const panel = document.createElement('div');
    panel.id = 'ca-notes-panel';
    panel.style.cssText = 'position:fixed;bottom:80px;right:18px;z-index:2147483000;' +
      'width:min(340px,90vw);max-height:70vh;overflow:auto;background:#111827;' +
      'border:1px solid #1e2d45;border-radius:16px;padding:1rem;' +
      "box-shadow:0 12px 32px rgba(0,0,0,.5);direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;" +
      'color:#e2e8f0;display:none';
    panel.innerHTML =
      '<div style="font-weight:700;font-size:.92rem;margin-bottom:.7rem">📝 ملاحظاتك في هذه الصفحة</div>' +
      '<textarea id="ca-note-input" placeholder="اكتب ملاحظة..." style="width:100%;min-height:64px;' +
      'background:#1a2235;border:1px solid #1e2d45;border-radius:8px;color:#e2e8f0;padding:.5rem;' +
      'font-family:inherit;font-size:.83rem;resize:vertical"></textarea>' +
      '<button id="ca-note-add" type="button" style="margin-top:.5rem;width:100%;background:#8b5cf6;' +
      'color:#fff;border:none;padding:.5rem;border-radius:8px;font-weight:700;cursor:pointer;' +
      'font-family:inherit;font-size:.85rem">➕ إضافة ملاحظة</button>' +
      '<div id="ca-note-list" style="margin-top:.9rem;display:flex;flex-direction:column;gap:.55rem"></div>' +
      '<a href="profile.html#ca-notes" style="display:block;text-align:center;margin-top:.7rem;' +
      'font-size:.78rem;color:#8b5cf6;text-decoration:none">عرض كل ملاحظاتي في البروفايل ←</a>';
    document.body.appendChild(panel);

    fab.addEventListener('click', () => {
      const show = panel.style.display === 'none' || !panel.style.display;
      panel.style.display = show ? 'block' : 'none';
      if (show) renderList();
    });

    function renderList() {
      const list = document.getElementById('ca-note-list');
      const notes = Notes.forPage(pageKey()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      if (!notes.length) {
        list.innerHTML = '<div style="color:#94a3b8;font-size:.78rem;text-align:center;padding:.5rem 0">لا توجد ملاحظات بعد</div>';
        return;
      }
      list.innerHTML = notes.map(n =>
        '<div class="ca-note-item" style="background:#1a2235;border:1px solid #1e2d45;border-radius:10px;padding:.6rem" data-id="' + n.id + '">' +
          (n.section ? '<div style="font-size:.7rem;color:#8b5cf6;margin-bottom:.25rem">' + escapeHtml(n.section) + '</div>' : '') +
          '<div class="ca-note-text" style="font-size:.82rem;white-space:pre-wrap;line-height:1.5">' + escapeHtml(n.text) + '</div>' +
          '<div style="display:flex;gap:.5rem;margin-top:.4rem">' +
            '<button class="ca-edit" type="button" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:.72rem">✏️ تعديل</button>' +
            '<button class="ca-del" type="button" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.72rem">🗑️ حذف</button>' +
          '</div>' +
        '</div>'
      ).join('');

      list.querySelectorAll('.ca-del').forEach(btn => {
        btn.addEventListener('click', e => {
          const id = e.target.closest('[data-id]').dataset.id;
          Notes.remove(id);
          renderList();
        });
      });
      list.querySelectorAll('.ca-edit').forEach(btn => {
        btn.addEventListener('click', e => {
          const wrap = e.target.closest('[data-id]');
          const id = wrap.dataset.id;
          const textEl = wrap.querySelector('.ca-note-text');
          if (!textEl) return;
          const current = textEl.textContent;
          const ta = document.createElement('textarea');
          ta.value = current;
          ta.style.cssText = 'width:100%;min-height:56px;background:#0b1220;border:1px solid #1e2d45;' +
            'border-radius:8px;color:#e2e8f0;padding:.4rem;font-family:inherit;font-size:.82rem';
          textEl.replaceWith(ta);
          ta.focus();
          const saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.textContent = '💾 حفظ';
          saveBtn.style.cssText = 'margin-top:.3rem;background:#10b981;color:#fff;border:none;' +
            'padding:.3rem .7rem;border-radius:6px;font-size:.72rem;cursor:pointer';
          ta.insertAdjacentElement('afterend', saveBtn);
          saveBtn.addEventListener('click', () => {
            Notes.update(id, ta.value.trim());
            renderList();
          });
        });
      });
    }

    document.getElementById('ca-note-add').addEventListener('click', () => {
      const ta = document.getElementById('ca-note-input');
      const text = ta.value.trim();
      if (!text) return;
      Notes.add(text, currentSectionTitle());
      ta.value = '';
      renderList();
    });
  }

  function init() {
    try { initWidget(); } catch (_) {}
    try { initResumeBanner(); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
