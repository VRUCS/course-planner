"""
ai_extract.py — استخراج درسنامه با هوش مصنوعی از طریق OpenRouter

این اسکریپت متن برنامه درسی را از فایل‌های PDF/TXT می‌خواند،
به OpenRouter API می‌فرستد، و خروجی ساختاریافته به صورت
assets/js/curriculum_{field}.js تولید می‌کند.

نصب پیش‌نیازها:
    pip install openai pymupdf

استفاده:
    python ai_extract.py --field cs --key YOUR_OPENROUTER_KEY
    python ai_extract.py --field cs --key YOUR_KEY --model google/gemini-2.5-pro
    python ai_extract.py --field cs  # از متغیر محیطی OPENROUTER_API_KEY استفاده می‌کند

مدل پیش‌فرض: deepseek/deepseek-chat-v3-0324
مدل‌های پیشنهادی:
    deepseek/deepseek-chat-v3-0324   (پیش‌فرض — ارزان و قوی)
    deepseek/deepseek-r1             (استدلال بهتر، کندتر)
    google/gemini-2.5-pro            (چندزبانه قوی)
    openai/gpt-4o-mini               (سریع و ارزان)
"""

import argparse
import json
import os
import sys
from pathlib import Path


# ─── PDF extraction ───────────────────────────────────────────────────────────
def extract_text_from_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in ('.txt', '.md'):
        return path.read_text(encoding='utf-8', errors='ignore')
    if suffix == '.pdf':
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(str(path))
            return '\n'.join(page.get_text() for page in doc)
        except ImportError:
            print("⚠️  PyMuPDF نصب نیست. برای فایل‌های PDF اجرا کنید: pip install pymupdf")
            return ''
    return ''

def collect_text(input_dir: Path) -> str:
    texts = []
    for f in sorted(input_dir.iterdir()):
        if f.is_file() and f.suffix.lower() in ('.pdf', '.txt', '.md'):
            print(f"  📄 خواندن: {f.name}")
            text = extract_text_from_file(f)
            if text.strip():
                texts.append(f"=== {f.name} ===\n{text}")
    return '\n\n'.join(texts)

DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# ─── OpenRouter API call ───────────────────────────────────────────────────────
SYSTEM_PROMPT = """تو یک دستیار تخصصی در زمینه استخراج اطلاعات برنامه درسی دانشگاهی هستی.
وظیفه‌ات استخراج دقیق اطلاعات درس‌ها از متن فارسی و تبدیل آن به JSON ساختاریافته است.
فقط JSON خروجی بده، بدون هیچ توضیح اضافه."""

USER_PROMPT_TEMPLATE = """متن زیر شامل برنامه درسی رشته {field_name} است.
اطلاعات را استخراج کن و دقیقاً به فرمت JSON زیر برگردان:

{{
  "fieldName": "نام رشته",
  "totalUnits": عدد_کل_واحد,
  "courses": [
    {{
      "id": "شناسه_یکتا_انگلیسی_مثلا_cs_math1",
      "codePattern": "کد_گلستان_بدون_پسوند_یا_null",
      "name": "نام درس",
      "units": عدد_واحد,
      "semester": عدد_ترم_پیشنهادی,
      "prereqs": ["id_پیش_نیاز_1", "id_پیش_نیاز_2"],
      "type": "core|general|elective|lab"
    }}
  ]
}}

قوانین مهم:
- id باید انگلیسی، کوتاه و یکتا باشد (مثال: cs_math1، cs_prog2)
- prereqs شامل id درس‌های دیگر همین JSON است
- اگر codePattern مشخص نبود، null بگذار
- semester از ۱ تا ۸ است
- type باید یکی از core، general، elective، lab باشد

متن برنامه درسی:
---
{curriculum_text}
---

فقط JSON خروجی بده:"""

def call_ai(api_key: str, model: str, field_name: str, curriculum_text: str) -> dict:
    from openai import OpenAI

    client = OpenAI(
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": "https://github.com/entekhab-vahed",
            "X-Title": "سامانه انتخاب واحد هوشمند",
        }
    )

    MAX_CHARS = 30000
    if len(curriculum_text) > MAX_CHARS:
        print(f"⚠️  متن بلند است ({len(curriculum_text)} کاراکتر)، تا {MAX_CHARS} کاراکتر ارسال می‌شود.")
        curriculum_text = curriculum_text[:MAX_CHARS]

    prompt = USER_PROMPT_TEMPLATE.format(
        field_name=field_name,
        curriculum_text=curriculum_text
    )

    print(f"🤖 در حال ارسال به OpenRouter ({model})...")
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=4096,
        response_format={"type": "json_object"}
    )

    raw = response.choices[0].message.content
    print(f"✅ پاسخ دریافت شد ({len(raw)} کاراکتر)")
    return json.loads(raw)

# ─── Output generation ────────────────────────────────────────────────────────
JS_TEMPLATE = '''/**
 * درسنامه رشته {field_name}
 * تولید شده توسط ai_extract.py — مدل: {model}
 * تاریخ تولید: {date}
 *
 * برای به‌روزرسانی:
 *   python ai_extract.py --field {field_key} --key YOUR_KEY
 *   python ai_extract.py --field {field_key} --key YOUR_KEY --model google/gemini-2.5-pro
 */
const CURRICULUM_{FIELD_KEY} = {json_data};
'''

def generate_js(data: dict, field_key: str, model: str, output_path: Path):
    from datetime import datetime
    field_name = data.get('fieldName', field_key)
    json_str = json.dumps(data, ensure_ascii=False, indent=4)
    js = JS_TEMPLATE.format(
        field_name=field_name,
        model=model,
        date=datetime.now().strftime('%Y-%m-%d'),
        field_key=field_key,
        FIELD_KEY=field_key.upper(),
        json_data=json_str
    )
    output_path.write_text(js, encoding='utf-8')
    print(f"✅ فایل ذخیره شد: {output_path}")

# ─── Validation ───────────────────────────────────────────────────────────────
def validate_data(data: dict) -> list[str]:
    warnings = []
    if 'courses' not in data:
        return ["❌ فیلد 'courses' در خروجی نیست"]
    ids = set()
    for i, c in enumerate(data['courses']):
        for field in ('id', 'name', 'units', 'semester'):
            if field not in c:
                warnings.append(f"درس [{i}]: فیلد '{field}' نیست")
        if 'id' in c:
            if c['id'] in ids:
                warnings.append(f"id تکراری: {c['id']}")
            ids.add(c['id'])
        if 'prereqs' in c:
            for pid in c['prereqs']:
                if pid not in ids:
                    warnings.append(f"پیش‌نیاز '{pid}' در درس '{c.get('id', i)}' هنوز تعریف نشده (ممکن است بعداً بیاید)")
    return warnings

# ─── Auto conflict rules generator ───────────────────────────────────────────
CONFLICT_RULES_PROMPT = """چارت درسی زیر را بررسی کن و قوانین تداخل برنامه هفتگی را استخراج کن.

قوانین:
- mustNotConflict: درس‌هایی که در یک ترم مشابه هستند و دانشجو باید هر دو را هم‌زمان بگذراند.
- shouldNotConflict: درس‌هایی از ترم‌های هم‌تراز (هر دو فرد یا هر دو زوج) که دانشجوی عقب‌افتاده ممکن است هم‌زمان بگیرد.

خروجی دقیقاً JSON زیر:
{
  "mustNotConflict": [
    {"a": "کد_پایه_درس_الف", "nameA": "نام درس الف", "b": "کد_پایه_درس_ب", "nameB": "نام درس ب", "reason": "دلیل فارسی"}
  ],
  "shouldNotConflict": [
    {"a": "کد_پایه_درس_الف", "nameA": "نام درس الف", "b": "کد_پایه_درس_ب", "nameB": "نام درس ب", "reason": "دلیل فارسی"}
  ]
}

فقط کدهایی را بگذار که در codes وجود دارند (از codes["*"] یا codes[ورودی] استفاده کن).
"""

def generate_conflict_rules(curriculum_data: dict, api_key: str, model: str) -> dict:
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL,
                    default_headers={'HTTP-Referer': 'https://github.com/entekhab-vahed', 'X-Title': 'Entekhab Vahed'})

    # خلاصه‌سازی درس‌ها برای prompt
    courses_summary = []
    for c in curriculum_data.get('courses', []):
        # پیدا کردن کد واقعی
        codes = c.get('codes', {})
        code = codes.get('*') or next(iter(codes.values()), None)
        if code:
            courses_summary.append({
                'id': c['id'], 'name': c['name'],
                'semester': c.get('semester', '?'),
                'code': code, 'type': c.get('type', 'core')
            })

    prompt = CONFLICT_RULES_PROMPT + f"\n\nدرس‌های چارت:\n{json.dumps(courses_summary, ensure_ascii=False, indent=2)}"

    print("🤖 در حال تولید قوانین تداخل...")
    response = client.chat.completions.create(
        model=model,
        messages=[{'role': 'user', 'content': prompt}],
        temperature=0.2,
        max_tokens=3000,
        response_format={'type': 'json_object'}
    )
    raw = response.choices[0].message.content
    return json.loads(raw)


def append_conflict_rules(rules: dict, field_key: str, output_path: Path):
    """قوانین تولیدشده را به conflict_rules.js اضافه یا به‌روز می‌کند."""
    from datetime import datetime
    js_snippet = f"""
    // تولید خودکار توسط ai_extract.py — {datetime.now().strftime('%Y-%m-%d')}
    "{field_key}": {json.dumps(rules, ensure_ascii=False, indent=8)},"""

    print("\n📋 قوانین تولیدشده:")
    print(f"   mustNotConflict: {len(rules.get('mustNotConflict', []))} قانون")
    print(f"   shouldNotConflict: {len(rules.get('shouldNotConflict', []))} قانون")
    print(f"\n{'='*60}")
    print("کد زیر را در assets/js/conflict_rules.js داخل CONFLICT_RULES اضافه کنید:")
    print('='*60)
    print(js_snippet)
    print('='*60)

    # اگر output path مشخص شده، ذخیره کن
    if output_path:
        output_path.write_text(js_snippet, encoding='utf-8')
        print(f"\n✅ قطعه کد در {output_path} ذخیره شد.")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='استخراج درسنامه با OpenRouter AI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
مدل‌های پیشنهادی OpenRouter:
  {DEFAULT_MODEL}  (پیش‌فرض)
  deepseek/deepseek-r1
  google/gemini-2.5-pro
  openai/gpt-4o-mini

مثال تولید قوانین تداخل:
  python ai_extract.py --generate-rules --field cs --key YOUR_KEY
        """
    )
    parser.add_argument('--field', default='cs', help='کلید رشته (مثال: cs، electrical)')
    parser.add_argument('--field-name', default='مهندسی کامپیوتر', help='نام فارسی رشته')
    parser.add_argument('--input', default=None, help='پوشه ورودی (پیش‌فرض: raw_data/curriculum/{field})')
    parser.add_argument('--output', default=None, help='فایل خروجی JS (پیش‌فرض: assets/js/curriculum_{field}.js)')
    parser.add_argument('--key', default=None, help='کلید OpenRouter API (پیش‌فرض: متغیر محیطی OPENROUTER_API_KEY)')
    parser.add_argument('--model', default=DEFAULT_MODEL, help=f'مدل OpenRouter (پیش‌فرض: {DEFAULT_MODEL})')
    parser.add_argument('--generate-rules', action='store_true',
                        help='به جای استخراج درسنامه، قوانین تداخل تولید کن')
    args = parser.parse_args()

    api_key = args.key or os.environ.get('OPENROUTER_API_KEY')
    if not api_key:
        print("❌ کلید API مشخص نشده.")
        print("   از --key استفاده کنید یا متغیر محیطی OPENROUTER_API_KEY را تنظیم کنید.")
        sys.exit(1)

    input_dir   = Path(args.input)  if args.input  else Path(f'raw_data/curriculum/{args.field}')
    output_path = Path(args.output) if args.output else Path(f'assets/js/curriculum_{args.field}.js')

    # ── حالت تولید قوانین تداخل ──────────────────────────────────────────────
    if args.generate_rules:
        # بارگذاری curriculum_cs.js فعلی
        cur_js = Path(f'assets/js/curriculum_{args.field}.js')
        if not cur_js.exists():
            print(f"❌ فایل {cur_js} یافت نشد. ابتدا درسنامه را استخراج کنید.")
            sys.exit(1)

        # اجرای JS برای خواندن داده (از طریق json)
        import re
        content = cur_js.read_text(encoding='utf-8')
        # استخراج JSON از داخل CURRICULUM_REGISTRY یا CURRICULUM_CS
        match = re.search(r'=\s*(\{[\s\S]+\});?\s*$', content)
        if not match:
            print("❌ ساختار فایل JS قابل parse نیست.")
            sys.exit(1)
        try:
            registry = json.loads(match.group(1))
        except json.JSONDecodeError as e:
            print(f"❌ خطای JSON: {e}")
            sys.exit(1)

        # پیدا کردن curriculum data
        if isinstance(registry, dict) and any('>>' in k for k in registry.keys()):
            # CURRICULUM_REGISTRY
            curriculum_data = next(iter(registry.values()))
            field_key = next(iter(registry.keys()))
        else:
            curriculum_data = registry
            field_key = f"{args.field_name}"

        print(f"\n⚡ تولید قوانین تداخل برای: {field_key}")
        print(f"🤖 مدل: {args.model}")

        rules = generate_conflict_rules(curriculum_data, api_key, args.model)
        rules_output = Path(args.output) if args.output else None
        append_conflict_rules(rules, field_key, rules_output)
        sys.exit(0)

    # ── حالت استخراج درسنامه (پیش‌فرض) ──────────────────────────────────────
    if not input_dir.exists():
        print(f"❌ پوشه ورودی وجود ندارد: {input_dir}")
        print("   لطفاً پوشه را بسازید و فایل‌های PDF/TXT برنامه درسی را داخل آن بریزید.")
        sys.exit(1)

    print(f"\n🎓 استخراج درسنامه رشته: {args.field_name}")
    print(f"🤖 مدل: {args.model}")
    print(f"📁 ورودی: {input_dir}")
    print(f"📝 خروجی: {output_path}\n")

    # جمع‌آوری متن
    print("📚 خواندن فایل‌ها...")
    text = collect_text(input_dir)
    if not text.strip():
        print("❌ هیچ متنی از فایل‌ها استخراج نشد.")
        sys.exit(1)
    print(f"   {len(text)} کاراکتر استخراج شد.\n")

    # فراخوانی API
    try:
        data = call_ai(api_key, args.model, args.field_name, text)
    except Exception as e:
        print(f"❌ خطا در فراخوانی API: {e}")
        sys.exit(1)

    # اعتبارسنجی
    warns = validate_data(data)
    if warns:
        print(f"\n⚠️  {len(warns)} هشدار:")
        for w in warns[:10]:
            print(f"   • {w}")

    # ذخیره خروجی
    output_path.parent.mkdir(parents=True, exist_ok=True)
    generate_js(data, args.field, args.model, output_path)

    n = len(data.get('courses', []))
    print(f"\n✅ {n} درس استخراج و ذخیره شد.")
    print("   صفحه را در مرورگر رفرش کنید.")

if __name__ == '__main__':
    main()
