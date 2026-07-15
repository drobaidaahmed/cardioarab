/**
 * CardioArab — Local Answer Memory (per-question)
 * answers.js — v1.0
 *
 * ميزة محلية بالكامل (localStorage) — لا تتصل بأي سيرفر ولا تُخزَّن على Supabase،
 * تمامًا بنفس مبدأ notes.js. لا علاقة لها بمنطق الاشتراك/الحماية (protection.js)
 * ولا تعدّله بأي شكل.
 *
 * الوظيفة: تحفظ إجابة الطالب على كل سؤال (صح/غلط + الخيار الذي اختاره) على
 * جهازه، بحيث لو رجع لاحقًا لنفس الصفحة يشوف حالة إجابته تلقائيًا (بدون ما
 * تتصفر)، ويقدر من صفحة profile.html يشوف قائمة بكل الأسئلة التي أخطأ فيها
 * عبر كل بنوك الأسئلة، ليعيد تقييم نفسه فيها.
 *
 * الاستخدام داخل أي صفحة أسئلة (quiz):
 * 1) عرّف قبل استدعاء الملف مفتاحًا ثابتًا للصفحة (يفضّل اسم الملف نفسه):
 *      <script>window.CA_ANSWERS_PAGE_KEY = 'board-review-part1.html';</script>
 *      <script src="answers.js"></script>
 *    إن لم تعرّفه، سيُستخرج تلقائيًا من اسم الملف الحالي (location.pathname).
 * 2) عند بناء كل سؤال، بعد تجهيز الخيارات، نادِ:
 *      const saved = CAAnswers.get(q.num);
 *      لو رجعت قيمة، فعّل حالة "تمت الإجابة" على البطاقة مباشرة (بدون تسجيل جديد).
 * 3) عند اختيار المستخدم لخيار (أو الضغط على "أظهر الجواب")، نادِ:
 *      CAAnswers.save({
 *        qid: q.num, chapter: q.chapter, stem: q.stem,
 *        chosenLabel: opt[0], // أو null إن كان "أظهر الجواب"
 *        correctLabel: q.correct, isCorrect: (opt[0] === q.correct)
 *      });
 *
 * **لا تأثير على الحماية أو الاشتراك إطلاقًا**: هذا الملف يقرأ/يكتب فقط في
 * localStorage الخاص بالمتصفح، بنفس فلسفة notes.js تمامًا.
 */

(function () {
  'use strict';

  const STORE_KEY = 'ca_answers_v1';

  function pageKey() {
    if (window.CA_ANSWERS_PAGE_KEY) return window.CA_ANSWERS_PAGE_KEY;
    return (location.pathname.split('/').pop() || 'index.html');
  }

  function pageTitle() {
    let t = document.title || pageKey();
    t = t.split('—')[0].split('|')[0].trim();
    return t || pageKey();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function stripHtml(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function saveAll(obj) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (_) {}
  }

  function keyOf(pk, qid) { return pk + '::' + qid; }

  const CAAnswers = {
    /**
     * يحفظ/يحدّث إجابة سؤال واحد في الصفحة الحالية.
     * data: {qid, chapter, stem, chosenLabel, correctLabel, isCorrect}
     */
    save(data) {
      const all = loadAll();
      const pk = pageKey();
      const k = keyOf(pk, data.qid);
      all[k] = {
        pageKey: pk,
        pageTitle: pageTitle(),
        qid: data.qid,
        chapter: data.chapter || '',
        stem: stripHtml(data.stem || '').slice(0, 220),
        chosenLabel: data.chosenLabel != null ? data.chosenLabel : null,
        correctLabel: data.correctLabel || '',
        isCorrect: !!data.isCorrect,
        updatedAt: new Date().toISOString()
      };
      saveAll(all);
      return all[k];
    },

    /** يرجع الإجابة المحفوظة لسؤال في الصفحة الحالية، أو null إن لم توجد */
    get(qid) {
      const all = loadAll();
      return all[keyOf(pageKey(), qid)] || null;
    },

    /** كل الإجابات المحفوظة لصفحة معيّنة (افتراضيًا الصفحة الحالية) */
    forPage(pk) {
      const all = loadAll();
      const target = pk || pageKey();
      return Object.values(all).filter(a => a.pageKey === target);
    },

    /** كل الإجابات المحفوظة عبر كل الصفحات */
    all() {
      return Object.values(loadAll());
    },

    /** كل الأسئلة التي أخطأ فيها المستخدم (عبر كل بنوك الأسئلة)، الأحدث أولاً */
    wrongOnly() {
      return this.all()
        .filter(a => a.isCorrect === false)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    /** إحصائية سريعة: عدد الصح/الغلط/الإجمالي */
    stats() {
      const list = this.all();
      const correct = list.filter(a => a.isCorrect).length;
      return { total: list.length, correct, wrong: list.length - correct };
    },

    /** حذف إجابة سؤال واحد (لإعادة تقييم النفس فيه من الصفر) */
    remove(pk, qid) {
      const all = loadAll();
      delete all[keyOf(pk, qid)];
      saveAll(all);
    },

    /** حذف كل إجابات صفحة معيّنة بالكامل (زر "إعادة تصفير هذا الجزء" مثلاً) */
    clearPage(pk) {
      const all = loadAll();
      Object.keys(all).forEach(k => { if (all[k].pageKey === pk) delete all[k]; });
      saveAll(all);
    },

    /** حذف كل شيء (لا يؤثر على الاشتراك أو الحساب، فقط تقدّم الإجابات المحلي) */
    clearAll() {
      saveAll({});
    }
  };

  window.CAAnswers = CAAnswers;
  window.CAAnswersUtils = { escapeHtml, stripHtml, pageKey, pageTitle };
})();
