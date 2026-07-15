# CardioArab — ملف مرجعي مختصر للمشروع

> استخدم هذا الملف وحده (مع أي ملف طبي جديد تريد إضافته) بدل رفع المشروع كامل من جديد.
> آخر تحديث: 2026-07-15 — بعد تطبيق توحيد الحماية + ميزة الملاحظات المحلية.

---

## 1. لمحة عامة
- موقع طبي ثابت (Static HTML) لأطباء القلب، بالعربية، RTL.
- 191 صفحة HTML + عدد من ملفات JS مشتركة.
- قاعدة البيانات: Supabase (PostgREST مباشر عبر `fetch`، **بدون** Supabase Auth رسمي).
- الجلسة تُدار يدويًا: `localStorage.currentUser` = `{ id, name, email, is_admin, password, created_at, ... }`.
- ⚠️ كلمات المرور مخزّنة كنص صريح في جدول `users` (ثغرة معروفة، لم تُعالج بعد).
- ⚠️ لأن الموقع لا يستخدم Supabase Auth حقيقي، RLS المبني على `auth.uid()` غير فعّال؛ أي حامل لمفتاح anon key يقدر نظريًا يقرأ/يعدّل صفوف أي مستخدم. هذه ثغرة معمارية معروفة ومؤجلة (تحتاج لاحقًا JWT حقيقي).

## 2. تسمية الملفات (Naming Convention)
كل مرشد/موضوع طبي = مجموعة ملفات بنفس البادئة (prefix):
```
<topic>-index.html      ← صفحة فهرس الموضوع (تحتوي غالبًا TOC + محتوى)
<topic>-part1.html      ← الجزء الأول
<topic>-part2.html      ← الجزء الثاني
... إلخ (لا يوجد سقف لعدد الأجزاء)
```
أمثلة على البادئات الحالية: `achd, acs, af, braunwald, cardio-onco, ccs, cmp, diabetes, dys, endocarditis, hf, hta, mhcvd, mi-definition, ncs, paad, pacing, pe, peri-myo, ph, pregnancy, prevention, revascularization, sports-cv, svt, syncope, vasd, vhd`.

صفحات خاصة (ليست موضوعًا طبيًا، لها معاملة مختلفة — راجع القسم 4):
`index.html, guidelines.html, american-guidelines.html, question-banks.html, board-review-index.html, board-review-part*.html, emergencies.html, login.html, register.html, profile.html, admin.html, subscription.html`

## 3. الملفات المشتركة (لا تُعدَّل عادة، فقط تُستدعى)
| ملف | الوظيفة |
|---|---|
| `supabase.js` | عميل REST بسيط لـ Supabase (`db.select/insert/update/delete`) + `session` helper (`session.get/set/isSubscribed/isAdmin`) + `device` helper. |
| `protection.js` | منع النسخ/الكليك اليمين/التحديد/DevTools/الطباعة + علامة مائية باسم المستخدم + مراقبة تسجيل الدخول من جهاز آخر. **لا تُعدّله** إلا عند الحاجة لتغيير سياسة الحماية نفسها. |
| `notes.js` | ميزة الملاحظات المحلية + تتبع تقدّم القراءة (تفصيل في القسم 5). محلي بالكامل (localStorage)، لا علاقة له بالاشتراك أو الحماية. |
| `pwa-install.js`, `service-worker.js`, `manifest.json` | دعم PWA (تثبيت + عمل أوفلاين جزئي). |

## 4. حماية الاشتراك — النمط القياسي (مُطبَّق الآن على كل صفحات المحتوى)
**كل صفحة محتوى طبي** (أي `topic-index.html` و `topic-partN.html`) يجب أن تحتوي، قرب نهاية `<body>`، هذا الترتيب بالضبط:

```html
<script src="supabase.js"></script>
<script>
(async function(){
  try{
    const u = JSON.parse(localStorage.getItem('currentUser'));
    const isAdmin = u && u.is_admin;
    const isSubscribed = !isAdmin && u ? await session.isSubscribed() : false;
    if(!isAdmin && !isSubscribed){
      location.href = 'subscription.html';
    }
  }catch(e){
    location.href = 'subscription.html';
  }
})();
</script>
<script src="protection.js"></script>
<script src="notes.js"></script>
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(console.warn);
  });
}
</script>
<script src="pwa-install.js"></script>
</body>
</html>
```

**عند إضافة صفحة طبية جديدة**: انسخ هذه الكتلة بالضبط في نهاية الصفحة (بعد آخر سكربتات خاصة بالمحتوى نفسه). هذا يضمن:
1. تحويل أي زائر غير مشترك (حتى لو نسخ الرابط مباشرة وفتحه بمتصفح آخر) إلى `subscription.html`.
2. تفعيل كل حمايات النسخ/التصوير القياسية.
3. تفعيل الملاحظات المحلية وتتبع تقدّم القراءة تلقائيًا لهذه الصفحة (بدون أي إعداد إضافي).

### حدود معروفة لهذا الحل (غير مُغلقة بالكامل، مقبولة كخطوة مرحلية):
- المحتوى HTML ثابت، فهو ينزل فعليًا للمتصفح قبل تنفيذ سكربت التحويل → "View Page Source" أو تعطيل JS يكشف المحتوى.
- الحل الجذري (مؤجل): فصل المحتوى الطبي إلى جدول `protected_content` مقفول بـ RLS + Supabase Edge Function تتحقق من الاشتراك بمفتاح `service_role` من طرف السيرفر قبل تسليم المحتوى، بدل تضمينه مباشرة في HTML. تم تجهيز نموذج تجريبي سابقًا لصفحة برنولد (4 ملفات: schema.sql + edge function + shell page + دليل تنفيذ) لكنه لم يُعمَّم بعد.

### الصفحات المستثناة من "التحويل الإجباري" (Redirect Gate)
هذه صفحات فهرسة/بوابة (Hub/Catalog) تعرض عناوين وروابط فقط، وليست محتوى طبيًا كاملاً، لذلك تستخدم `session.isSubscribed()` فقط لتخصيص الواجهة (إخفاء بطاقات، تغيير الأزرار) دون تحويل إجباري:
`index.html, guidelines.html, american-guidelines.html, question-banks.html, board-review-index.html`

صفحات تدفق الحساب (لا علاقة لها بالاشتراك إطلاقًا): `login.html, register.html, subscription.html`.
`admin.html` له حارس خاص خاص به (`is_admin` فقط، وليس `isSubscribed`). `profile.html` يتطلب تسجيل دخول فقط (`currentUser` موجود) وليس اشتراكًا فعالًا (حتى يقدر غير المشترك يشوف صفحته ويجدد).

## 5. الملاحظات المحلية + تتبع القراءة (`notes.js`)
ميزة **محلية بالكامل** (لا تُخزَّن على Supabase، لا تظهر إذا بدّل المستخدم جهازه):

- `localStorage['ca_notes_v1']` → مصفوفة ملاحظات `{id, pageKey, pageTitle, section, text, createdAt, updatedAt}`.
- `localStorage['ca_reading_progress_v1']` → كائن `{ [pageKey]: {percent, title, updatedAt} }`، يُحدَّث تلقائيًا أثناء التمرير.
- الودجت العائم (📝 زر دائري أسفل يمين الصفحة) يظهر تلقائيًا في أي صفحة تستدعي `notes.js` بدون `CA_NOTES_NO_WIDGET`.
- بانر "تابع من حيث توقفت" (📍 أسفل يسار) يظهر تلقائيًا إذا كان هناك تقدّم محفوظ لهذه الصفحة (5%–96%).
- API متاح عالميًا بعد تحميل الملف: `window.CANotes` (`all/forPage/add/update/remove`) و `window.CAProgress` (`get/set/recent`).
- صفحة `profile.html` تعرض تجميع كل الملاحظات + قائمة "تابع من حيث توقفت" عبر هذه الـ API مباشرة (قسم `#ca-continue` و `#ca-notes`)، وتُحمِّل `notes.js` مع `window.CA_NOTES_NO_WIDGET = true` لإخفاء الزر العائم فيها (لأنها تعرض كل شيء مباشرة في الصفحة).
- **لا تأثير على الحماية أو الاشتراك**: هذه الميزة لا تلمس `protection.js` ولا `session.isSubscribed()` ولا أي جدول Supabase؛ فقط تقرأ/تكتب في `localStorage` الخاص بالمتصفح.

**لإضافتها لصفحة جديدة**: يكفي استدعاء `<script src="notes.js"></script>` بعد `protection.js` (كما في القالب أعلاه) — لا حاجة لأي كود إضافي.
**لإخفاء الودجت العائم في صفحة معيّنة** (مثل صفحات إدارية جديدة): ضع `<script>window.CA_NOTES_NO_WIDGET = true;</script>` قبل استدعاء `notes.js`.

## 6. جداول Supabase ذات الصلة (الأسماء فقط، دون تفاصيل تنفيذية حساسة)
- `users` — id, name, email, password (⚠️ نص صريح), is_admin, device_id, created_at.
- `subscriptions` — id, user_id, active, end_date, created_at.
- `activity_log` — message, email, created_at.
- (مقترَح لاحقًا، غير مُفعَّل بعد) `reading_progress`, `user_notes`, `protected_content` — الحل الحالي (القسم 5) يستخدم `localStorage` بدل هذه الجداول لتفادي أي تعقيد سيرفر إضافي.

## 7. نقاط مفتوحة للمتابعة لاحقًا (لم تُنفَّذ بعد)
- [ ] الانتقال لـ Supabase Auth حقيقي (JWT) بدل `localStorage.currentUser` اليدوي.
- [ ] تفعيل RLS حقيقي على `users` و`subscriptions` بعد اعتماد Auth حقيقي.
- [ ] تعميم حل `protected_content` + Edge Function (فصل المحتوى الطبي عن HTML فعليًا) بدل الاعتماد فقط على redirect بجافاسكريبت.
- [ ] معالجة تخزين كلمات المرور كنص صريح.
- [ ] (اختياري مستقبلًا) نقل الملاحظات/تقدّم القراءة إلى Supabase إن أراد المستخدم مزامنتها بين الأجهزة — يتطلب Auth حقيقي أولاً حتى لا تتكرر ثغرة RLS.
- [ ] تعميم `answers.js` (القسم 9) على بقية بنوك الأسئلة في الموقع (براونولد وغيره) — تم تفعيله الآن فقط على بنك بورد ريفيو (8 أجزاء).
- [ ] إنشاء جدول `feedback` فعليًا على Supabase (القسم 10) — الكود جاهز في `profile.html`/`admin.html` لكنه يحتاج الجدول لينجح.

## 9. بنك بورد ريفيو — الآن 8 أجزاء (بدل 3) + ذاكرة إجابات محلية (`answers.js`)

**التقسيم الجديد** (2026-07-15): كان `board-review-part1.html` (فصول 1-8، 11.2MB) و`board-review-part2.html` (فصول 9-34، 6.5MB) كبيرين جدًا. تم تفكيك محتواهما (1499 سؤال) وإعادة توزيعه على 7 ملفات بحيث يتوازن الحجم قدر الإمكان (بالبايت لا بعدد الأسئلة، لأن بعض الفصول تحوي صورًا كثيرة):

| ملف | الفصول | عدد الأسئلة | الحجم |
|---|---|---|---|
| board-review-part1.html | 1–2 | 111 | ~5.7MB (فصل تخطيط القلب فيه صور كثيرة) |
| board-review-part2.html | 3–5 | 155 | ~3.4MB |
| board-review-part3.html | 6–8 | 131 | ~1.5MB |
| board-review-part4.html | 9–16 | 468 | ~1.6MB |
| board-review-part5.html | 17–19 | 192 | ~1.6MB |
| board-review-part6.html | 20–22 | 142 | ~1.6MB |
| board-review-part7.html | 23–34 | 300 | ~1.1MB |
| board-review-part8.html | (الصناديق والجداول والأشكال، كان اسمه part3 سابقًا) | — | 80KB |

`board-review-index.html` مُحدَّث بـ8 بطاقات بدل 3. **لا ملف آخر في المشروع كان يشير لهذه الأسماء القديمة** (تم التأكد بالبحث)، فلا حاجة لتحديث أي رابط خارجي غير `board-review-index.html` نفسه.

**آلية التقسيم**: كل ملف يحتفظ بنفس محرك العرض (نفس CSS/JS) المستخدم سابقًا في part1/part2 (بحث، شريط فصول، header قابل للتقلّص). فقط بيانات `questionsData`/`chaptersData` هي التي تتغيّر بين الملفات، بالإضافة لعنوان الصفحة والعداد. حقل `num` لكل سؤال (مثل `"9.3"`) بقي كما هو من الكتاب الأصلي ولم يُعَد ترقيمه، وهو **معرّف فريد عبر الكتاب كامله** تعتمد عليه ميزة `answers.js` أدناه.

### `answers.js` — ذاكرة الإجابات المحلية (بنفس مبدأ `notes.js`)
ميزة **محلية بالكامل** (localStorage، لا Supabase، لا علاقة لها بالحماية/الاشتراك):
- `localStorage['ca_answers_v1']` → كائن مفاتيحه `pageKey::qid`، وكل قيمة `{pageKey, pageTitle, qid, chapter, stem, chosenLabel, correctLabel, isCorrect, updatedAt}`.
- API عالمي: `window.CAAnswers` بدوال `save/get/forPage/all/wrongOnly/stats/remove/clearPage/clearAll`.
- **داخل كل جزء من بورد ريفيو**: عند اختيار الطالب لإجابة (أو ضغط "أظهر الجواب")، تُحفظ النتيجة فورًا. عند فتح نفس الصفحة لاحقًا، تُستعاد كل الأسئلة المُجابة سابقًا بنفس شكلها (صح/غلط ملوّن، معطّلة) تلقائيًا دون أي فعل من الطالب.
- **في `profile.html`**: قسم "❌ الأسئلة التي أخطأت فيها" (`#ca-mistakes`) يجمع كل الأسئلة الخاطئة عبر كل أجزاء بورد ريفيو (والبنوك الأخرى إن أُضيفت لها الميزة لاحقًا)، مع رابط للعودة لمكان السؤال (`pageKey#chapter-N`)، وزر "🔄 حذف من القائمة" لإعادة تقييم النفس في سؤال معيّن من الصفر دون التأثير على الحماية أو الاشتراك إطلاقًا.
- **لإضافتها لبنك أسئلة آخر لاحقًا** (مثل براونولد): أضف قبل محرك العرض مباشرة (قبل أول سطر يستخدم بيانات الأسئلة):
  ```html
  <script>window.CA_ANSWERS_PAGE_KEY = "اسم-الملف.html";</script>
  <script src="answers.js"></script>
  ```
  ثم في معالج اختيار الإجابة نادِ `CAAnswers.save({qid, chapter, stem, chosenLabel, correctLabel, isCorrect})`، وعند بناء كل سؤال تحقق من `CAAnswers.get(qid)` لاستعادة حالته. **يجب أن يُحمَّل `answers.js` قبل أي كود يستخدمه** (بعكس `notes.js` الذي يُحمَّل في آخر الصفحة عادة) لأن محرك عرض الأسئلة ينفَّذ فور تحميل DOM قبل وصول السكربتات الموجودة في ذيل الصفحة.

## 10. صندوق الاقتراحات والشكاوي (`feedback`)

زر جديد في `profile.html` (بطاقة "💬 اقتراح أو شكوى") يسمح لأي مستخدم مسجّل بإرسال اقتراح/شكوى/بلاغ مشكلة تقنية مباشرة للمالك. الرسالة تُخزَّن في جدول Supabase جديد اسمه `feedback` (بنفس أسلوب `activity_log` الموجود: `sbPost` مباشر عبر REST، بدون Auth حقيقي — تنطبق نفس تحذيرات RLS الواردة في القسم 1).

**⚠️ يجب إنشاء الجدول يدويًا في Supabase قبل أن تعمل الميزة** (SQL Editor):
```sql
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  name text,
  email text,
  type text default 'اقتراح',
  message text not null,
  status text default 'new',
  created_at timestamptz default now()
);
alter table feedback enable row level security;
create policy "anon full access (مؤقت، بدون Auth حقيقي)" on feedback for all using (true) with check (true);
```
`admin.html` يعرضها في قسم "📥 صندوق الاقتراحات والشكاوي" (شارة بعدد الرسائل غير المقروءة، زر "تمت القراءة"، زر حذف فردي، وزر مسح الكل).

## 8. عند إضافة ملف/مرشد طبي جديد — قائمة تحقق سريعة
1. سمِّ الملفات: `newtopic-index.html`, `newtopic-part1.html`, ...
2. انسخ نفس بنية `<head>` (الخطوط، المتغيرات اللونية `--bg/--accent/...`) من أي صفحة موجودة بنفس الفئة للحفاظ على التناسق البصري.
3. أضف كتلة السكربتات القياسية من القسم 4 بالضبط، بنفس الترتيب، قبل `</body>`.
4. لا تُنشئ نسخة معدَّلة من `protection.js` أو `notes.js` لكل صفحة — استخدم نفس الملفين المشتركين دائمًا.
5. أضف رابط الصفحة الجديدة في `guidelines.html` و/أو `index.html` (صفحات الفهرسة) حسب التصنيف المناسب.
6. لا حاجة لأي تعديل على Supabase لتفعيل الحماية أو الملاحظات — كلاهما يعمل تلقائيًا بمجرد استدعاء السكربتات.
