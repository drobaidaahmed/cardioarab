#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_theme_toggle.py
======================
يضيف زر تبديل الوضع الداكن/الفاتح (🌙 / ☀️) لكل ملفات HTML بالموقع دفعة وحدة.

الفكرة:
- كل ملفات CardioArab (تقريباً) فيها نفس نظام الألوان الأساسي داخل :root{...}
  بنفس المتغيرات: --bg --bg2 --bg3 --border --text --text2 --accent
  (أحياناً مع --monitor لو الملف مبني على التصميم الجديد).
- السكريبت بيدوّر على هالنمط بكل ملف، وإذا لقاه:
    1) بيضيف طبقة ألوان بديلة للوضع الفاتح :root[data-theme="light"]{...}
    2) بيضيف سكريبت صغير بأول <head> يمنع "فلاش" اللون الغلط لحظة الفتح
    3) بيضيف زر دائري ثابت (🌙/☀️) فوق يسار الصفحة
    4) بيضيف الجافاسكريبت يلي بيبدّل الوضع ويحفظه بـ localStorage
      (نفس المفتاح بكل الصفحات: cardioarab-theme، فهيك القارئ لما يبدّل
       بصفحة، وينتقل لصفحة تانية، الوضع بيضل محفوظ تلقائياً)
- الملفات يلي ما فيها هالنمط المعروف من الألوان بينضاف اسمها لتقرير
  (skipped_report.txt) بدون أي تعديل عليها — مراجعة يدوية أسلم من تخمين.
- السكريبت "idempotent": إذا شغّلته مرتين على نفس الملف، ما بيكرر الإضافة.

الاستخدام داخل GitHub Codespaces:
---------------------------------
    python3 apply_theme_toggle.py --root . --dry-run     # فحص بدون تعديل
    python3 apply_theme_toggle.py --root .                # التعديل الفعلي
    git status                                             # شوف شو تغيّر
    git diff -- index.html | head -100                    # عاين ملف كمثال
    git add -A && git commit -m "إضافة زر تبديل الوضع الداكن/الفاتح" && git push

بعد التشغيل، افتح تقرير النتائج المطبوع بالترمينال، وراجع
skipped_report.txt لمعرفة الملفات يلي احتاجت مراجعة يدوية.
"""

import argparse
import re
from pathlib import Path

MARKER = "<!-- ca-theme-toggle:v1 -->"

EXCLUDE_DIRS = {".git", "node_modules", ".github", "dist", "build", ".vscode"}

# نمط الألوان الأساسي المعروف بملفات CardioArab (من التصميم الموحّد)
ROOT_RE = re.compile(
    r"(:root\s*\{[^}]*--bg\s*:[^;]+;[^}]*--bg2\s*:[^;]+;[^}]*--border\s*:[^;]+;"
    r"[^}]*--text\s*:[^;]+;[^}]*--text2\s*:[^;]+;[^}]*--accent\s*:[^;]+;[^}]*\})",
    re.IGNORECASE | re.DOTALL,
)

HEAD_RE = re.compile(r"<head[^>]*>", re.IGNORECASE)
BODY_RE = re.compile(r"<body([^>]*)>", re.IGNORECASE)
BODY_CLOSE_RE = re.compile(r"</body\s*>", re.IGNORECASE)

ANTI_FLASH_SNIPPET = MARKER + """
<script>
(function(){
  try{
    var t = localStorage.getItem('cardioarab-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  }catch(e){}
})();
</script>
"""

LIGHT_VARS_TEMPLATE = (
    ':root[data-theme="light"]{{--bg:#f4f6fb;--bg2:#ffffff;--bg3:#eef1f8;'
    "--border:#e1e6f0;--text:#1b2434;--text2:#5b6577;--accent:{accent};"
    "{monitor}}}"
)

TOGGLE_BUTTON_STYLE = """
<style>
.theme-toggle{position:fixed;top:14px;left:14px;z-index:9999;width:38px;height:38px;
  border-radius:50%;background:var(--bg2);border:1px solid var(--border);color:var(--text);
  font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:.2s;box-shadow:0 4px 10px -4px rgba(0,0,0,.3)}
.theme-toggle:hover{border-color:var(--accent);transform:scale(1.06)}
@media(max-width:600px){.theme-toggle{top:10px;left:10px;width:34px;height:34px;font-size:14px}}
</style>
"""

TOGGLE_BUTTON_HTML = (
    '<button id="themeToggle" class="theme-toggle" title="تبديل المظهر" '
    'aria-label="تبديل الوضع الداكن/الفاتح">☀️</button>\n'
)

TOGGLE_SCRIPT = """
<script>
document.addEventListener('DOMContentLoaded', function(){
  var toggle = document.getElementById('themeToggle');
  if(!toggle) return;
  function updateIcon(){
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    toggle.textContent = current === 'light' ? '\\ud83c\\udf19' : '\\u2600\\ufe0f';
    toggle.title = current === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح';
  }
  updateIcon();
  toggle.addEventListener('click', function(){
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try{ localStorage.setItem('cardioarab-theme', next); }catch(e){}
    updateIcon();
  });
});
</script>
"""


def build_light_vars(root_block: str) -> str:
    accent_match = re.search(r"--accent\s*:\s*([^;]+);", root_block)
    accent_val = accent_match.group(1).strip() if accent_match else "#7c3aed"
    monitor_line = ""
    if re.search(r"--monitor\s*:", root_block):
        monitor_line = "--monitor:#0f9b6e;"
    return LIGHT_VARS_TEMPLATE.format(accent=accent_val, monitor=monitor_line)


def process_file(path: Path, dry_run: bool) -> str:
    text = path.read_text(encoding="utf-8", errors="ignore")

    if MARKER in text:
        return "already_done"

    root_match = ROOT_RE.search(text)
    if not root_match:
        return "skipped_no_match"

    light_vars = build_light_vars(root_match.group(1))
    new_text = text[: root_match.end(1)] + "\n" + light_vars + text[root_match.end(1):]

    head_match = HEAD_RE.search(new_text)
    if not head_match:
        return "skipped_no_head"
    insert_at = head_match.end()
    new_text = (
        new_text[:insert_at]
        + "\n"
        + ANTI_FLASH_SNIPPET
        + TOGGLE_BUTTON_STYLE
        + new_text[insert_at:]
    )

    body_match = BODY_RE.search(new_text)
    if not body_match:
        return "skipped_no_body"
    insert_at = body_match.end()
    new_text = (
        new_text[:insert_at] + "\n" + TOGGLE_BUTTON_HTML + new_text[insert_at:]
    )

    body_close_match = BODY_CLOSE_RE.search(new_text)
    if not body_close_match:
        return "skipped_no_body_close"
    insert_at = body_close_match.start()
    new_text = (
        new_text[:insert_at] + TOGGLE_SCRIPT + "\n" + new_text[insert_at:]
    )

    if not dry_run:
        path.write_text(new_text, encoding="utf-8")
    return "updated"


def main():
    parser = argparse.ArgumentParser(description="حقن زر تبديل الوضع الداكن/الفاتح بكل ملفات HTML")
    parser.add_argument("--root", default=".", help="مجلد المشروع (افتراضي: المجلد الحالي)")
    parser.add_argument("--dry-run", action="store_true", help="فحص فقط بدون تعديل الملفات")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    results = {"updated": [], "already_done": [], "skipped_no_match": [],
               "skipped_no_head": [], "skipped_no_body": [], "skipped_no_body_close": []}

    for html_file in sorted(root.rglob("*.html")):
        if any(part in EXCLUDE_DIRS for part in html_file.parts):
            continue
        outcome = process_file(html_file, args.dry_run)
        results[outcome].append(str(html_file.relative_to(root)))

    total = sum(len(v) for v in results.values())
    print(f"\n=== {'فحص (dry-run)' if args.dry_run else 'تنفيذ فعلي'} — {total} ملف HTML ===\n")
    print(f"✅ تم التحديث:        {len(results['updated'])}")
    print(f"⏭️  محدَّث مسبقاً:      {len(results['already_done'])}")
    skipped_total = total - len(results['updated']) - len(results['already_done'])
    print(f"⚠️  يحتاج مراجعة يدوية: {skipped_total}\n")

    report_path = root / "theme_toggle_report.txt"
    with open(report_path, "w", encoding="utf-8") as f:
        for key, label in [
            ("updated", "تم التحديث"),
            ("already_done", "محدَّث مسبقاً (تم تجاوزه)"),
            ("skipped_no_match", "لا يوجد نمط ألوان معروف (:root غير مطابق)"),
            ("skipped_no_head", "لا يوجد وسم <head>"),
            ("skipped_no_body", "لا يوجد وسم <body>"),
            ("skipped_no_body_close", "لا يوجد وسم </body>"),
        ]:
            f.write(f"\n--- {label} ({len(results[key])}) ---\n")
            for item in results[key]:
                f.write(item + "\n")

    print(f"📄 التقرير الكامل بملف: {report_path.relative_to(root) if report_path.is_relative_to(root) else report_path}")
    if args.dry_run:
        print("\nهاد فحص بس (dry-run) — ولا ملف تغيّر. لما تراجع التقرير، شغّل بدون --dry-run.")


if __name__ == "__main__":
    main()
