/**
 * CardioArab — Supabase Client
 * supabase.js — v1.0
 * أضفه في كل صفحة: <script src="supabase.js"></script>
 */

const SUPABASE_URL = 'https://ikisgwnsxadiujueeava.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraXNnd25zeGFkaXVqdWVlYXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NzU5ODYsImV4cCI6MjA5ODI1MTk4Nn0.Ar45kQJPOgJ9ITqGVv9XeSxpGgyx53s6CTmFCNDBa-g';

// ─── Supabase REST API Helper ────────────────────────────────────────────────
const db = {

  // headers مشتركة
  _headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    };
  },

  // SELECT
  async select(table, query = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      headers: { ...this._headers(), 'Prefer': 'return=representation' }
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // INSERT
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...this._headers(), 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // UPDATE
  async update(table, query, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      method: 'PATCH',
      headers: { ...this._headers(), 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // DELETE
  async delete(table, query) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      method: 'DELETE',
      headers: this._headers()
    });
    if (!res.ok) throw await res.json();
    return true;
  }
};

// ─── Session Helper ──────────────────────────────────────────────────────────
const session = {
  get() {
    try { return JSON.parse(localStorage.getItem('currentUser')); }
    catch { return null; }
  },
  set(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('currentUser');
  },
  isLoggedIn() {
    return !!this.get();
  },
  isAdmin() {
    return this.get()?.is_admin === true;
  },
  // فحص انتهاء الاشتراك
  async isSubscribed() {
    const user = this.get();
    if (!user) return false;
    if (user.is_admin) return true;
    try {
      const subs = await db.select('subscriptions', `?user_id=eq.${user.id}&active=eq.true`);
      if (!subs.length) return false;
      const sub = subs[0];
      if (sub.end_date && new Date() > new Date(sub.end_date)) {
        // انتهى الاشتراك — حدّث قاعدة البيانات
        await db.update('subscriptions', `?id=eq.${sub.id}`, { active: false });
        return false;
      }
      return true;
    } catch { return false; }
  }
};

// ─── Device Helper (لتقييد الحساب بجهاز واحد) ──────────────────────────────
const device = {
  // معرف ثابت لهذا الجهاز/المتصفح، يُنشأ مرة واحدة ويُحفظ محلياً
  getId() {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : ('dev-' + Date.now() + '-' + Math.random().toString(36).slice(2)));
      localStorage.setItem('deviceId', id);
    }
    return id;
  }
};

// ─── Supabase Auth (تسجيل الدخول بجوجل / رقم الهاتف) ───────────────────────
// يتطلب تحميل مكتبة supabase-js قبل هذا الملف في أي صفحة تستخدم auth.*:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="supabase.js"></script>
const supabaseAuthClient = (typeof window !== 'undefined' && window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const auth = {
  // تسجيل دخول بجوجل — يحوّل المستخدم لصفحة جوجل ثم يعيده لنفس الصفحة (redirectTo)
  async signInWithGoogle(redirectTo) {
    if (!supabaseAuthClient) throw new Error('مكتبة supabase-js غير محمّلة في هذه الصفحة');
    const { error } = await supabaseAuthClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo || window.location.href }
    });
    if (error) throw error;
  },

  // إرسال رمز تحقق SMS لرقم الهاتف (صيغة دولية، مثال: +9665XXXXXXXX)
  async sendPhoneOtp(phone) {
    if (!supabaseAuthClient) throw new Error('مكتبة supabase-js غير محمّلة في هذه الصفحة');
    const { error } = await supabaseAuthClient.auth.signInWithOtp({ phone });
    if (error) throw error;
  },

  // التحقق من رمز SMS المُدخل — يكمل تسجيل الدخول عند النجاح
  async verifyPhoneOtp(phone, token) {
    if (!supabaseAuthClient) throw new Error('مكتبة supabase-js غير محمّلة في هذه الصفحة');
    const { data, error } = await supabaseAuthClient.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
    return data.user; // مستخدم من auth.users (Supabase Auth)، وليس من جدول users المخصص
  },

  // يقرأ جلسة Supabase Auth الحالية — يُستخدم عند رجوع تحويلة جوجل لنفس الصفحة
  async getAuthUser() {
    if (!supabaseAuthClient) return null;
    const { data } = await supabaseAuthClient.auth.getSession();
    return data.session ? data.session.user : null;
  },

  async signOutAuth() {
    if (supabaseAuthClient) await supabaseAuthClient.auth.signOut();
  }
};

// ─── ربط مستخدم Supabase Auth (جوجل / هاتف) بجدول users المخصص ─────────────
// يبحث عن صف موجود بنفس الإيميل أو الهاتف، وإلا يُنشئ صفاً جديداً تلقائياً
// بنفس شكل صفوف users العادية (device_id / is_admin / blocked...) لتبقى كل
// آليات قفل الجهاز وفحص الاشتراك تعمل بلا أي تعديل إضافي.
async function findOrCreateAppUser(authUser) {
  const email = (authUser.email || '').toLowerCase();
  const phone = authUser.phone || null;

  let existing = [];
  if (email) {
    existing = await db.select('users', `?email=eq.${email}`);
  }
  if (!existing.length && phone) {
    existing = await db.select('users', `?phone=eq.${phone}`);
  }

  if (existing.length) return existing[0];

  const created = await db.insert('users', {
    email: email || null,
    phone: phone,
    password: null, // لا كلمة مرور لحسابات جوجل/الهاتف
    auth_provider: authUser.app_metadata && authUser.app_metadata.provider ? authUser.app_metadata.provider : 'phone',
    is_admin: false,
    blocked: false
  });
  return created[0];
}

// ─── Log Helper ──────────────────────────────────────────────────────────────
async function addLog(message, email = '') {
  try {
    await db.insert('activity_log', { message, email });
  } catch (e) {
    console.warn('Log error:', e);
  }
}
