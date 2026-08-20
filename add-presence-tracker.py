#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add-presence-tracker.py
------------------------------------------------------------------
بيمرّ على كل ملفات .html بمجلد الموقع (وبكل المجلدات الفرعية)
وبيضيف تلقائياً السطر:
    <script src="presence-tracker.js"></script>
قبل </body> بكل ملف - إذا مش موجود فيه أصلاً.

طريقة الاستخدام:
    python3 add-presence-tracker.py /path/to/site-folder

    مثال (لو شغّلته من جوا مجلد الموقع نفسه):
    python3 add-presence-tracker.py .
------------------------------------------------------------------
"""

import sys
import os

TAG_TO_INSERT = '<script src="presence-tracker.js"></script>'

# ملفات ما بدنا نلمسها (مثلاً لأنها مش صفحات عادية، أو مش بدها تتبع)
SKIP_FILES = {
    "presence-tracker.js",  # مش HTML أصلاً بس تحسباً
}


def process_file(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # إذا السطر موجود أصلاً، تجاوز الملف
    if "presence-tracker.js" in content:
        return "skipped-already-has-it"

    # لازم يكون في </body> نقدر نحط قبلها
    if "</body>" not in content:
        return "skipped-no-body-tag"

    # نحط السطر قبل أول </body> نلاقيها
    new_content = content.replace(
        "</body>",
        f"<script src=\"presence-tracker.js\"></script>\n</body>",
        1,
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

    return "updated"


def main():
    if len(sys.argv) < 2:
        print("الاستخدام: python3 add-presence-tracker.py /path/to/site-folder")
        sys.exit(1)

    root_dir = sys.argv[1]

    if not os.path.isdir(root_dir):
        print(f"❌ المجلد مش موجود: {root_dir}")
        sys.exit(1)

    updated, skipped_has_it, skipped_no_body, errors = [], [], [], []

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # تجاهل مجلدات git/node_modules لو موجودة بالمجلد
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules")]

        for fname in filenames:
            if not fname.lower().endswith(".html"):
                continue
            if fname in SKIP_FILES:
                continue

            full_path = os.path.join(dirpath, fname)
            try:
                result = process_file(full_path)
                rel_path = os.path.relpath(full_path, root_dir)
                if result == "updated":
                    updated.append(rel_path)
                elif result == "skipped-already-has-it":
                    skipped_has_it.append(rel_path)
                elif result == "skipped-no-body-tag":
                    skipped_no_body.append(rel_path)
            except Exception as e:
                errors.append(f"{fname}: {e}")

    print("\n========== النتيجة ==========")
    print(f"✅ تم التعديل ({len(updated)} ملف):")
    for f in updated:
        print(f"   + {f}")

    if skipped_has_it:
        print(f"\n⏭️  تم تجاوزها (موجود فيها السطر أصلاً) ({len(skipped_has_it)} ملف):")
        for f in skipped_has_it:
            print(f"   - {f}")

    if skipped_no_body:
        print(f"\n⚠️  تم تجاوزها (ما في تاغ </body>) ({len(skipped_no_body)} ملف):")
        for f in skipped_no_body:
            print(f"   - {f}")

    if errors:
        print(f"\n❌ أخطاء ({len(errors)}):")
        for e in errors:
            print(f"   - {e}")

    print("\n==============================")
    print(f"المجموع: {len(updated)} تم تعديلها بنجاح.")


if __name__ == "__main__":
    main()
