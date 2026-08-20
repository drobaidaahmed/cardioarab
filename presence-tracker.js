/**
 * presence-tracker.js
 * ------------------------------------------------------------------
 * سكريبت تتبع الحضور اللحظي (Online Presence) لموقع CardioArab
 * مستقل تماماً - بينشئ اتصال Supabase خاص فيه (نفس مشروعك)
 * فما بيتعارض مع أي كود Supabase موجود أصلاً بالصفحة.
 *
 * طريقة التركيب: حط هاد السطر بأي مكان بالصفحة (يفضّل قبل </body>):
 *   <script src="presence-tracker.js"></script>
 * ------------------------------------------------------------------
 */

(function () {
  // نفس بيانات المشروع الموجودة أصلاً بصفحاتك (SUPABASE_URL / ANON_KEY)
  const SUPABASE_URL = "https://ikisgwnsxadiujueeava.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_OMWeV5NY4sla53_UNojVmA_obrzCA8_";

  const PRESENCE_CHANNEL_NAME = 'cardioarab-online-users';

  function loadSupabaseSdk(cb) {
    // إذا مكتبة supabase-js محمّلة أصلاً بالصفحة (لأي غرض آخر)، منستخدمها مباشرة
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      return cb();
    }
    const existing = document.querySelector('script[data-ca-presence-sdk]');
    if (existing) {
      existing.addEventListener('load', cb);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.setAttribute('data-ca-presence-sdk', '1');
    s.onload = cb;
    s.onerror = () => console.warn('[presence-tracker] فشل تحميل مكتبة Supabase.');
    document.head.appendChild(s);
  }

  function getGuestOrUserInfo() {
    // 1) مستخدم مسجل عندك بـ localStorage (نفس نمط باقي صفحاتك: currentUser)
    try {
      const u = JSON.parse(localStorage.getItem('currentUser'));
      if (u && u.id) {
        return {
          user_id: String(u.id),
          name: u.name || 'مستخدم مسجل',
          email: u.email || null,
          is_guest: false,
        };
      }
    } catch (e) { /* تجاهل */ }

    // 2) زائر غير مسجل - معرف ثابت بالـ localStorage
    let guestId = localStorage.getItem('ca_guest_id');
    if (!guestId) {
      guestId = 'guest-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('ca_guest_id', guestId);
    }
    return { user_id: guestId, name: 'زائر', email: null, is_guest: true };
  }

  function currentPageLabel() {
    return document.title || (window.location.pathname.split('/').pop() || 'index.html');
  }

  loadSupabaseSdk(function () {
    try {
      const presenceClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: { params: { eventsPerSecond: 5 } },
      });

      const userInfo = getGuestOrUserInfo();

      const channel = presenceClient.channel(PRESENCE_CHANNEL_NAME, {
        config: { presence: { key: userInfo.user_id } },
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userInfo.user_id,
            name: userInfo.name,
            email: userInfo.email,
            is_guest: userInfo.is_guest,
            page: currentPageLabel(),
            online_at: new Date().toISOString(),
          });
        }
      });

      window.addEventListener('beforeunload', () => {
        channel.untrack();
      });
    } catch (e) {
      console.warn('[presence-tracker] تعذّر تفعيل تتبع الحضور:', e);
    }
  });
})();
