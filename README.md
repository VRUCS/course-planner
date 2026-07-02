# سامانه انتخاب واحد هوشمند

یک ابزار فارسی و mobile-first برای جست‌وجوی ارائه‌ها، ساخت برنامه هفتگی، پیگیری
چارت درسی و بررسی تداخل‌های آموزشی. هسته سامانه کاملاً استاتیک است و بدون
backend روی GitHub Pages اجرا می‌شود. قابلیت‌های هوش مصنوعی، در صورت نیاز، از
طریق یک API مستقل FastAPI فعال می‌شوند.

## قابلیت‌ها

- جست‌وجو و فیلتر بیش از ۱۵۰۰ ارائه درسی
- ساخت برنامه هفتگی و نمایش تداخل زمانی
- محاسبه واحدها، برنامه امتحانات و ذخیره محلی وضعیت
- نقشه پیش‌نیاز و وضعیت دروس برای ورودی‌های مختلف
- داشبورد بررسی تداخل برای گروه آموزشی
- افزونه مرورگر برای استخراج محلی داده از گلستان
- دستیار، تحلیل بار درسی و توضیح تداخل با backend اختیاری AI

## معماری

```text
GitHub Pages (بدون backend)
  HTML/CSS UI
      ↓
  domain.js (منطق خالص و قابل تست)
      ↓
  courses.json / data.js (داده استاتیک تولیدشده)

AI اختیاری (بدون توکن کاربر)
  Browser ──────────────────> FastAPI ── secret ──> OpenRouter
                 فعال/غیرفعال فقط با AI_INTERACTIVE_ENABLED روی سرور
```

مرزهای مهم پروژه:

- `assets/js/domain.js`: منطق خالص زمان‌بندی و اعتبارسنجی؛ بدون DOM و network
- `assets/js/app.js`: هماهنگی state و رابط اصلی
- `assets/data/courses.json`: داده canonical و قابل استفاده توسط ابزارها
- `assets/js/data.js`: wrapper تولیدی برای اجرای مستقیم و بدون build در Pages
- `backend/`: فقط API اختیاری AI؛ هسته سایت به آن وابسته نیست
- `convert.py`: تبدیل deterministic خروجی عمومی گلستان به dataset امن
- `scripts/build_static.py`: ساخت artifact حداقلی Pages، بدون raw data و backend

جزئیات بیشتر در [مستند معماری](docs/architecture.md) آمده است.

## اجرای محلی سایت

نیازی به npm یا build نیست:

```bash
python -m http.server 3000
```

سپس `http://localhost:3000` را باز کنید. بازکردن مستقیم فایل HTML ممکن است در
بعضی مرورگرها با محدودیت‌های امنیتی همراه باشد، بنابراین server محلی توصیه می‌شود.

## تولید مجدد داده

```bash
uv sync
uv run python convert.py
```

این دستور هر دو فایل زیر را به شکل مرتب و deterministic می‌سازد:

- `assets/data/courses.json`
- `assets/js/data.js`

ورودی‌های محلی حاوی اطلاعات دانشجو را در `temp/` یا `exports/` بگذارید؛ این
پوشه‌ها عمداً توسط Git نادیده گرفته می‌شوند.

## backend اختیاری AI

```bash
cp backend/.env.example backend/.env
# OPENROUTER_API_KEY را تنظیم و AI_INTERACTIVE_ENABLED=true کنید
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

برای اتصال نسخه Pages، `backendUrl` را در `assets/js/config.js` به URL عمومی API
تغییر دهید. **هیچ secret یا توکنی را در این فایل commit نکنید.**

هیچ توکنی از کاربر گرفته نمی‌شود؛ در دسترس بودن AI کاملاً سمت سرور تعیین
می‌شود. وقتی `AI_INTERACTIVE_ENABLED=true` باشد AI برای همه کاربران فعال است
و در غیر این صورت همه endpointها 503 برمی‌گردانند. API به‌صورت پیش‌فرض:

- مدل‌ها را به allowlist محدود می‌کند؛
- اندازه پیام، تعداد پیام و خروجی را محدود می‌کند؛
- برای هر IP rate limit دارد؛
- CORS را تنها برای originهای تنظیم‌شده باز می‌کند.

برای سرویس عمومی پرمصرف، rate limit درون‌حافظه‌ای را با Redis و در صورت نیاز
quota هر کاربر را با یک identity provider اضافه کنید.

## استخراج چارت درسی با AI

AI فقط یک پیش‌نویس ساختاریافته می‌سازد و مستقیماً قوانین اجرایی تولید نمی‌کند:

```bash
export OPENROUTER_API_KEY=...
uv run --extra ai-extract python ai_extract.py \
  --input raw_data/curriculum/cs/cs-chart-1403-and-later.pdf \
  --field cs --field-name 'علوم کامپیوتر' --cohorts ۱۴۰۳
```

PDF به‌صورت متن و تصویر صفحه و فایل‌های JPG/PNG به مدل vision ارسال می‌شوند.
پس از مقایسه `temp/curriculum_cs.draft.json` با منبع، دقیقاً همان فایل بازبینی‌شده
را بدون فراخوانی دوباره AI تأیید کنید:

```bash
uv run --extra ai-extract python ai_extract.py \
  --approve-draft temp/curriculum_cs.draft.json \
  --faculty 'علوم ریاضی و کامپیوتر' --group 'علوم کامپیوتر'
```

تأیید، `assets/data/curricula.json` را به‌روز می‌کند و قوانین تداخل و wrapperهای
JavaScript را به‌شکل deterministic بازسازی می‌کند.

برای اعتبارسنجی داده مرجع و بررسی drift فایل‌های تولیدی:

```bash
uv run python scripts/curriculum_pipeline.py check
```

## تست

```bash
uv sync
uv run python -m pytest -q
node tests/js/domain.test.js
uv run python -m compileall -q backend scripts ai_extract.py convert.py
find assets/js extension -name '*.js' -print0 | xargs -0 -n1 node --check
```

CI همین بررسی‌ها را در هر push و pull request اجرا می‌کند.

## استقرار GitHub Pages

workflow موجود در `.github/workflows/pages.yml` در هر push به `main`:

1. artifact استاتیک را می‌سازد؛
2. فقط HTML و `assets/` را منتشر می‌کند؛
3. `raw_data/`، `temp/`، ابزارها و backend را منتشر نمی‌کند.

در تنظیمات repository، بخش Pages را روی **GitHub Actions** قرار دهید.

## حریم خصوصی و محدودیت‌ها

- اطلاعات انتخاب‌ها و وضعیت دروس در `localStorage` همان مرورگر ذخیره می‌شوند.
- اگر AI فعال باشد، context تحصیلی نمایش‌داده‌شده در رابط به backend و provider
  مدل ارسال می‌شود؛ قبل از فعال‌سازی عمومی باید رضایت کاربر گرفته شود.
- پیشنهاد AI منبع حقیقت نیست. قوانین پیش‌نیاز، سقف واحد و تداخل باید با داده
  قطعی و قابل تست کنترل شوند.
- داده ارائه‌ها snapshot یک نیم‌سال است و باید همراه نسخه/تاریخ انتشار نگه‌داری شود.

جزئیات تهدیدها و کنترل‌ها در [سند امنیت و حریم خصوصی](docs/security.md) است.

## مسیر پیشنهادی پایان‌نامه

برای تبدیل محصول به یک پروژه پژوهشی قوی، هسته deterministic را مبنا قرار دهید:

- مدل‌سازی انتخاب واحد به‌صورت Constraint Satisfaction/Optimization
- تولید چند برنامه معتبر با تابع امتیاز قابل توضیح
- اندازه‌گیری صحت تشخیص تداخل و پیش‌نیاز
- benchmark روی اندازه datasetهای مختلف
- مقایسه پیشنهاد الگوریتمی با برنامه انتخاب‌شده توسط دانشجویان
- سنجش usability و تحلیل خطا/hallucination بخش AI

طرح ارزیابی در [docs/thesis-evaluation.md](docs/thesis-evaluation.md) آمده است.
