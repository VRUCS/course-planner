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

import os
import sys
import json
import argparse
import re
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
        """
    )
    parser.add_argument('--field', default='cs', help='کلید رشته (مثال: cs، electrical)')
    parser.add_argument('--field-name', default='مهندسی کامپیوتر', help='نام فارسی رشته')
    parser.add_argument('--input', default=None, help='پوشه ورودی (پیش‌فرض: raw_data/curriculum/{field})')
    parser.add_argument('--output', default=None, help='فایل خروجی JS (پیش‌فرض: assets/js/curriculum_{field}.js)')
    parser.add_argument('--key', default=None, help='کلید OpenRouter API (پیش‌فرض: متغیر محیطی OPENROUTER_API_KEY)')
    parser.add_argument('--model', default=DEFAULT_MODEL, help=f'مدل OpenRouter (پیش‌فرض: {DEFAULT_MODEL})')
    args = parser.parse_args()

    api_key = args.key or os.environ.get('OPENROUTER_API_KEY')
    if not api_key:
        print("❌ کلید API مشخص نشده.")
        print("   از --key استفاده کنید یا متغیر محیطی OPENROUTER_API_KEY را تنظیم کنید.")
        sys.exit(1)

    input_dir = Path(args.input) if args.input else Path(f'raw_data/curriculum/{args.field}')
    output_path = Path(args.output) if args.output else Path(f'assets/js/curriculum_{args.field}.js')

    if not input_dir.exists():
        print(f"❌ پوشه ورودی وجود ندارد: {input_dir}")
        print(f"   لطفاً پوشه را بسازید و فایل‌های PDF/TXT برنامه درسی را داخل آن بریزید.")
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
