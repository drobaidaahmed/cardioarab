#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
auto_light_theme.py
====================
نسخة عامة (generic) من apply_theme_toggle.py لملفات ما إلها نمط ألوان
موحّد بالاسم (أسماء متغيرات مختلفة كل عيلة/كل دفعة ملفات)، بس بتشترك
بنفس الفكرة: متغيرات CSS داكنة بـ :root. السكريبت:
  1) بيستخرج كل متغيرات :root الأولى بالملف (بغض النظر عن الاسم)
  2) بيصنّف كل متغير (نص / خلفية / حدّ / لون دلالي) بالاعتماد على اسمه
     ودرجة إضاءته (luminance)
  3) بيولّد نسخة فاتحة مناسبة تلقائياً لكل متغير
  4) بيضيف نفس زر التبديل + سكريبت منع الفلاش (نفس مفتاح localStorage
     المستخدم بباقي الموقع: cardioarab-theme)
  5) بيحاول يستبدل خلفية body/header لو كانت قيمة ثابتة مطابقة لقيمة
     أحد متغيرات الخلفية (بدل ما تضل خلفية دائمة الظلام)

الاستخدام:
    python3 auto_light_theme.py --root . --dry-run
    python3 auto_light_theme.py --root . --files ch7.html,ch8.html
    python3 auto_light_theme.py --root .
"""
import argparse
import colorsys
import re
from pathlib import Path

MARKER = "<!-- ca-theme-toggle:v1 -->"

TEXT_HINTS = ("text", "muted", "dim", "faint")
BG_HINTS = ("bg", "panel", "card", "elev", "surface")
BORDER_HINTS = ("border",)


def hex_to_rgb(h):
    h = h.strip().lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    if len(h) != 6:
        return None
    try:
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None


def rgb_to_hex(rgb):
    return '#%02x%02x%02x' % tuple(max(0, min(255, round(c))) for c in rgb)


def relative_lightness(rgb):
    r, g, b = [c / 255 for c in rgb]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return l


def classify(name, value):
    rgb = hex_to_rgb(value) if value.startswith('#') else None
    name_l = name.lower()
    if rgb is None:
        return 'other'
    l = relative_lightness(rgb)
    if any(h in name_l for h in TEXT_HINTS):
        return 'text'
    if any(h in name_l for h in BORDER_HINTS):
        return 'border'
    if any(h in name_l for h in BG_HINTS):
        return 'bg'
    # fallback by luminance if name doesn't hint
    if l > 0.75:
        return 'text'
    if l < 0.22:
        return 'bg'
    return 'accent'


# لوحة فاتحة مرتّبة من الأغمق للأفتح - نفس أسلوب نظام الموقع الأساسي
BG_LIGHT_RAMP = ["#f4f6fb", "#ffffff", "#eef1f8", "#e6edf8", "#e1e6f0"]
TEXT_LIGHT_RAMP = ["#1b2434", "#4b5568", "#5b6577", "#6b7385", "#7a8494"]
BORDER_LIGHT = "#e1e6f0"


def build_light_value(name, value, role, bg_rank, text_rank):
    rgb = hex_to_rgb(value) if value.startswith('#') else None
    if role == 'bg':
        idx = min(bg_rank, len(BG_LIGHT_RAMP) - 1)
        return BG_LIGHT_RAMP[idx]
    if role == 'text':
        idx = min(text_rank, len(TEXT_LIGHT_RAMP) - 1)
        return TEXT_LIGHT_RAMP[idx]
    if role == 'border':
        return BORDER_LIGHT
    if role == 'accent' and rgb is not None:
        h, l, s = colorsys.rgb_to_hls(*[c / 255 for c in rgb])
        if l > 0.55:
            l = max(0.32, l - 0.22)
            r2, g2, b2 = colorsys.hls_to_rgb(h, l, min(1.0, s + 0.05))
            return rgb_to_hex((r2 * 255, g2 * 255, b2 * 255))
        return value
    return value


ROOT_FIRST_RE = re.compile(r":root\s*\{([^}]*)\}", re.IGNORECASE | re.DOTALL)
VAR_RE = re.compile(r"(--[a-zA-Z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;?")

HEAD_RE = re.compile(r"<head[^>]*>", re.IGNORECASE)
BODY_RE = re.compile(r"<body([^>]*)>", re.IGNORECASE)
BODY_CLOSE_RE = re.compile(r"</body\s*>", re.IGNORECASE)

TOGGLE_BUTTON_STYLE = """
<style>
.theme-toggle{position:fixed;top:14px;left:14px;z-index:60;width:38px;height:38px;
  border-radius:50%;background:var(--__bg2__);border:1px solid var(--__border__);color:var(--__text__);
  font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:.2s;box-shadow:0 4px 10px -4px rgba(0,0,0,.3)}
.theme-toggle:hover{border-color:var(--__accent__);transform:scale(1.06)}
@media(max-width:600px){.theme-toggle{top:10px;left:10px;width:34px;height:34px;font-size:14px}}
</style>
"""

TOGGLE_BUTTON_HTML = (
    '<button id="themeToggle" class="theme-toggle" title="تبديل المظهر" '
    'aria-label="تبديل الوضع الداكن/الفاتح">☀️</button>\n'
)

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


def process_file(path: Path, dry_run: bool):
    text = path.read_text(encoding="utf-8", errors="ignore")
    if MARKER in text:
        return "already_done", None
    if re.search(r':root\[data-theme=[\'"]light[\'"]\]\s*\{', text):
        return "already_has_light", None

    root_match = ROOT_FIRST_RE.search(text)
    if not root_match:
        return "no_root", None
    root_body = root_match.group(1)

    variables = VAR_RE.findall(root_body)
    if len(variables) < 3:
        return "too_few_vars", None

    roles = {}
    for name, value in variables:
        roles[name] = classify(name, value)

    # رتّب متغيرات الخلفية من الأغمق للأفتح (لنعطي كل وحدة درجة فاتحة مختلفة)
    bg_vars = sorted(
        [(n, v) for n, v in variables if roles[n] == 'bg'],
        key=lambda nv: relative_lightness(hex_to_rgb(nv[1]))
    )
    text_vars = sorted(
        [(n, v) for n, v in variables if roles[n] == 'text'],
        key=lambda nv: -relative_lightness(hex_to_rgb(nv[1]))
    )
    bg_rank = {n: i for i, (n, v) in enumerate(bg_vars)}
    text_rank = {n: i for i, (n, v) in enumerate(text_vars)}

    light_decls = []
    for name, value in variables:
        role = roles[name]
        new_val = build_light_value(name, value, role, bg_rank.get(name, 0), text_rank.get(name, 0))
        light_decls.append(f"{name}:{new_val}")
    light_block = ':root[data-theme="light"]{' + ';'.join(light_decls) + ';}'

    # اختار متغيرات معقولة لتصميم الزر (خلفية مرتفعة شوي، بوردر، نص، أكسنت)
    bg2_name = bg_vars[1][0] if len(bg_vars) > 1 else (bg_vars[0][0] if bg_vars else 'bg')
    border_name = next((n for n, v in variables if roles[n] == 'border'), 'border')
    text_name = text_vars[0][0] if text_vars else 'text'
    accent_name = next((n for n, v in variables if roles[n] == 'accent'), text_name)

    button_style = (TOGGLE_BUTTON_STYLE
                     .replace('__bg2__', bg2_name)
                     .replace('__border__', border_name)
                     .replace('__text__', text_name)
                     .replace('__accent__', accent_name))

    new_text = text[:root_match.end()] + "\n" + light_block + text[root_match.end():]

    head_match = HEAD_RE.search(new_text)
    if not head_match:
        return "no_head", None
    insert_at = head_match.end()
    new_text = new_text[:insert_at] + "\n" + ANTI_FLASH_SNIPPET + button_style + new_text[insert_at:]

    body_match = BODY_RE.search(new_text)
    if not body_match:
        return "no_body", None
    insert_at = body_match.end()
    new_text = new_text[:insert_at] + "\n" + TOGGLE_BUTTON_HTML + new_text[insert_at:]

    body_close_match = BODY_CLOSE_RE.search(new_text)
    if not body_close_match:
        return "no_body_close", None
    insert_at = body_close_match.start()
    new_text = new_text[:insert_at] + TOGGLE_SCRIPT + "\n" + new_text[insert_at:]

    if not dry_run:
        path.write_text(new_text, encoding="utf-8")
    return "updated", {
        "vars": len(variables), "bg_vars": len(bg_vars), "text_vars": len(text_vars),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--files", default=None, help="قائمة أسماء ملفات مفصولة بفاصلة (اختياري)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    if args.files:
        files = [root / f.strip() for f in args.files.split(",")]
    else:
        files = sorted(root.glob("*.html"))

    results = {}
    for f in files:
        if not f.exists():
            continue
        outcome, info = process_file(f, args.dry_run)
        results.setdefault(outcome, []).append((f.name, info))

    total = sum(len(v) for v in results.values())
    print(f"\n=== {'dry-run' if args.dry_run else 'تنفيذ فعلي'} — {total} ملف ===\n")
    for key, items in sorted(results.items(), key=lambda kv: -len(kv[1])):
        print(f"{key}: {len(items)}")
    print()
    if "updated" in results:
        print("ملفات تم تحديثها:")
        for name, info in results["updated"]:
            print(f"  {name}  ({info['vars']} متغير, {info['bg_vars']} خلفية, {info['text_vars']} نص)")
    for key in ("no_root", "too_few_vars", "no_head", "no_body", "no_body_close"):
        if key in results:
            print(f"\n{key}:")
            for name, _ in results[key]:
                print(f"  {name}")


if __name__ == "__main__":
    main()
