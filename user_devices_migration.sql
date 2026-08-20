-- ═══════════════════════════════════════════════════════════════════
-- CardioArab — ترحيل نظام تقييد الأجهزة من عمود واحد إلى جدول (جهازين كحد أقصى)
-- شغّل هذا السكربت من: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════

-- 1) إنشاء الجدول الجديد
create table if not exists user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_id text not null,
  device_label text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists idx_user_devices_user_id on user_devices(user_id);

-- 2) تفعيل RLS (سياسة تسمح فقط بالوصول عبر anon key المستخدم بباقي الجداول)
alter table user_devices enable row level security;

create policy "allow all via anon key"
  on user_devices
  for all
  using (true)
  with check (true);

-- 3) ترحيل الأجهزة الحالية المسجّلة (كل مستخدم عنده device_id بالعمود القديم
--    بينقل كأول جهاز مرتبط بيه بجدول user_devices، حتى ما ينضطر يسجل دخول جديد)
insert into user_devices (user_id, device_id, device_label, first_seen_at, last_seen_at)
select id, device_id, 'جهاز سابق (تم ترحيله تلقائياً)', coalesce(device_changed_at, now()), coalesce(device_changed_at, now())
from users
where device_id is not null
on conflict (user_id, device_id) do nothing;

-- 4) (اختياري) حذف الأعمدة القديمة من جدول users بعد التأكد إن كل شي شغال تمام
--    لا تشغّل هالسطرين إلا بعد ما تتأكد إن تسجيل الدخول شغال منيح بالنظام الجديد
-- alter table users drop column if exists device_id;
-- alter table users drop column if exists device_changed_at;
