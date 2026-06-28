/**
 * CardioArab — Supabase Client
 * supabase.js — v1.0
 * أضفه في كل صفحة: <script src="supabase.js"></script>
 */

const SUPABASE_URL = 'https://ikisgwnsxadiujueeava.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OMWeV5NY4sla53_UNojVmA_obrzCA8_';

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

// ─── Log Helper ──────────────────────────────────────────────────────────────
async function addLog(message, email = '') {
  try {
    await db.insert('activity_log', { message, email });
  } catch (e) {
    console.warn('Log error:', e);
  }
}
