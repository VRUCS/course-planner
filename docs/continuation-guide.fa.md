# راهنمای ادامه و توسعهٔ «انتخاب واحد یار»

این سند یک راهنمای فنی تحویل پروژه است. مخاطب آن توسعه‌دهنده‌ای است که باید
پروژه را بعد از نسخهٔ فعلی اجرا، بررسی یا توسعه دهد. README برای معرفی سریع و
نحوهٔ اجرای اولیه است؛ این فایل جزئیات تصمیم‌های معماری، مسیر داده، قراردادهای
مهم و روش تغییر دادن بخش‌های مختلف را توضیح می‌دهد.

این راهنما بر اساس وضعیت فعلی کد نوشته شده است. در صورت تغییر ساختار پوشه‌ها یا
دستورهای CI، مسیرهای این فایل باید همراه همان تغییر به‌روزرسانی شوند.

## ۱. از کجا شروع کنم؟

اگر برای اولین بار پروژه را تحویل می‌گیرید، از ریشهٔ مخزن اجرا کنید:

```bash
npm ci
uv sync --locked
```

برای اجرای کلاینت دانشجو، که به backend نیاز ندارد:

```bash
python3 -m http.server 3000 --directory apps/web
```

سپس `http://127.0.0.1:3000/index.html` را باز کنید. برای بررسی مسیر اصلی،
یک درس را جستجو و انتخاب کنید، تداخل یا سقف واحد را بررسی کنید، نماهای فهرست
و امتحان را باز کنید و در پایان خروجی تقویم یا چاپ را امتحان کنید.

برای ساخت همان artifactای که GitHub Pages منتشر می‌کند:

```bash
uv run python tools/build_static.py
python3 -m http.server 3000 --directory _site
```

این build فقط صفحات عمومی دانشجو و استاد، داده‌های تولیدشده، styleها و
scriptهای لازم را کپی می‌کند. `data/`، API و `data-editor.html` عمداً در
`_site` قرار نمی‌گیرند.

## ۲. پروژه چه چیزی حل می‌کند؟

«انتخاب واحد یار» فهرست ارائه‌های درس را به یک محیط برنامه‌ریزی تبدیل می‌کند.
کاربر می‌تواند درس و گروه را جستجو کند، گروه‌ها را مقایسه کند، برنامهٔ هفتگی
بسازد، تداخل کلاس و امتحان را ببیند، سقف واحد را کنترل کند و پیشرفت خود را در
چارت درسی علامت بزند.

سه بخش از هم جدا هستند:

1. کلاینت استاتیک وب برای جستجو و برنامه‌ریزی؛
2. داده و ابزار pipeline برای آماده‌سازی خروجی درس‌ها و چارت؛
3. API اختیاری برای دستیار هوشمند.

کلاینت برای کارهای اصلی حساب کاربری، database یا API لازم ندارد. برنامه،
پروفایل، پیشرفت چارت، فیلترهای جستجو و چند preference در `localStorage` همان
مرورگر ذخیره می‌شوند. اگر `localStorage` در دسترس نباشد، adapter به حافظهٔ
موقت برمی‌گردد و خود برنامه باید همچنان قابل استفاده بماند.

## ۳. تصمیم‌های اصلی و دلیل آن‌ها

این تصمیم‌ها مسیر توسعهٔ پروژه را مشخص می‌کنند:

| تصمیم | دلیل و نتیجه |
| --- | --- |
| کلاینت بدون build step | اجرای محلی و انتشار روی GitHub Pages ساده می‌ماند؛ فایل‌های HTML مستقیماً scriptها را به ترتیب مشخص بارگذاری می‌کنند. |
| JSON معیار در `data/canonical/` | دادهٔ قابل بازبینی از wrapper جاوااسکریپت جدا می‌ماند و می‌توان خروجی‌های تولیدشده را دوباره ساخت. |
| منطق زمان، امتحان و برنامه در `scripts/domain/` | این منطق به DOM، storage یا شبکه وابسته نیست و با Node قابل تست است. |
| storage و شبکه در adapterها | تغییر محل ذخیره‌سازی یا provider نباید منطق برنامه‌ریزی را آلوده کند. |
| API هوش مصنوعی جدا از سایت | کلید OpenRouter در browser منتشر نمی‌شود و فعال‌سازی AI تحت کنترل سرور می‌ماند. |
| ذخیره‌سازی محلی به‌جای حساب کاربری | برای نسخهٔ فعلی privacy و سادگی مهم‌تر از همگام‌سازی بین دستگاه‌هاست؛ نتیجه این است که backup و sharing هنوز قابلیت‌های بعدی‌اند. |

## ۴. نقشهٔ پوشه‌ها و مسیر اجرای کلاینت

```text
apps/web/
  scripts/domain/       منطق خالص زمان‌بندی، امتحان، برنامه و iCalendar
  scripts/adapters/     localStorage، تنظیمات runtime و ارتباط AI
  scripts/features/      UI مشترک، آیکون‌ها و advisor
  scripts/pages/        کنترلر صفحه و رندر DOM
  generated/            wrapperهای JavaScript تولیدشده از دادهٔ معیار
  styles/               style مشترک
apps/extension/          افزونهٔ استخراج داده از صفحات گلستان
apps/api/               سرویس اختیاری FastAPI
data/sources/            HTMLهای منبع
data/canonical/          JSONهای معیار و قابل بازبینی
tools/data_pipeline/     parser، اعتبارسنجی و generator
tests/                   تست‌های frontend، backend، pipeline و E2E
docs/                    راهنماها و assetهای مستندات
```

`apps/web/index.html` از ES modules استفاده نمی‌کند؛ ترتیب scriptها قرارداد
اجرای آن است:

```text
app-config
  → generated course/curriculum data
  → CourseDomain
  → CalendarExport و PlannerDomain
  → PlannerStorage و UI مشترک
  → AI client و Advisor
  → pages/student-planner.js
```

بنابراین اگر فایل جدیدی در `scripts/pages/` به global دیگری نیاز دارد، باید
script مورد نیاز قبل از آن در HTML قرار گرفته باشد. `professor.html` و
`data-editor.html` نیز ترتیب بارگذاری مستقل خود را دارند؛ تغییر یک page
نباید باعث شود dependency آن فقط به‌صورت اتفاقی از page دیگری بیاید.

## ۵. مالکیت داده و مسیر به‌روزرسانی آن

### ۵.۱ ارائه‌های درس از HTML

مسیر معیار این است:

```text
HTML گلستان
  → data/sources/*.html
  → tools/data_pipeline/course_converter.py
  → data/canonical/courses.json + manifest.json
  → apps/web/generated/course-offerings.generated.js
  → کلاینت وب و داشبورد استاد
```

فایل‌های `data/canonical/` منبع معیار هستند. فایل‌های `apps/web/generated/`
تولیدشده‌اند و نباید دستی ویرایش شوند.

برای افزودن snapshot جدید:

1. فایل HTML عمومی و بدون اطلاعات شخصی را در `data/sources/` قرار دهید.
2. ابتدا فقط بررسی کنید:

   ```bash
   uv run python -m tools.data_pipeline.course_converter --check
   ```

3. خروجی‌ها را بازتولید کنید:

   ```bash
   uv run python -m tools.data_pipeline.course_converter
   ```

4. diff مربوط به `courses.json`، wrapper و `manifest.json` را بازبینی کنید.
5. تست parser و تست سازگاری دادهٔ تولیدشده را اجرا کنید.

Parser فعلی در `course_converter.py` ردیف‌هایی را می‌خواند که حداقل ۱۴ سلول
`td` دارند و از indexهای ثابت جدول گلستان استفاده می‌کند:

| فیلد | index فعلی |
| --- | ---: |
| دانشکده | ۱ |
| گروه | ۳ |
| شناسهٔ ارائه | ۴ |
| نام درس | ۵ |
| واحد | ۶ |
| ظرفیت / ثبت‌نام | ۸ / ۹ |
| جنسیت | ۱۱ |
| استاد | ۱۲ |
| زمان و امتحان | ۱۳ |

`time_html` در واقع متن نرمال‌شده با `<br>` بین خط‌هاست، نه HTML قابل اعتماد
از منبع. `exam_text` نسخهٔ متنی همان سلول است. parser ارائه‌ها را با `id`
یکتا می‌کند و خروجی را بر اساس `id` مرتب می‌سازد؛ به همین دلیل تغییر جزئی در
منبع می‌تواند تعداد رکورد یا hash manifest را تغییر دهد.

قرارداد حداقلی یک ارائه:

```json
{
  "id": "1110002_01",
  "name": "نام درس",
  "faculty": "نام دانشکده",
  "group": "علوم کامپیوتر",
  "units": 2,
  "capacity": 40,
  "enrolled": 12,
  "gender": "مرد",
  "prof": "نام استاد",
  "time_html": "درس(ت): شنبه 13:30-15:30 مکان: ک102<br>امتحان(1405.03.21) ساعت : 10:30-12:30",
  "exam_text": "درس(ت): شنبه 13:30-15:30 مکان: ک102 امتحان(1405.03.21) ساعت : 10:30-12:30"
}
```

پسوند بعد از آخرین `_` شمارهٔ گروه است. `PlannerDomain.getBaseCourseId()` کد
درس را از این suffix جدا می‌کند و `getSectionId()` آن را برای نمایش برمی‌گرداند.
اگر فرمت شناسهٔ گلستان تغییر کرد، این دو تابع و تست‌های مربوط به آن‌ها باید
همراه parser بررسی شوند.

### ۵.۲ افزونهٔ گلستان؛ ابزار استخراج است، نه pipeline کامل

`apps/extension/extractor.js` در frameهای صفحهٔ گلستان جدول ارائه‌ها یا چارت
را تشخیص می‌دهد. `popup.js` می‌تواند:

- ارائه‌ها را به شکل wrapper JavaScript با متغیر `UNIVERSITY_DATA` دانلود کند؛
- چارت رشته را به شکل `golestan_curriculum.json` دانلود کند؛
- JSON ارائه‌ها را برای کپی در clipboard آماده کند.

این خروجی مستقیماً دادهٔ معیار پروژه نیست. تابع
`importGolestanFile()` در کلاینت فقط فایل ارائه‌ها را می‌خواند و پیام راهنما
نشان می‌دهد؛ خودش `courses.json` را تغییر نمی‌دهد. اگر از extension استفاده
شد، خروجی را با منبع رسمی بررسی کنید و آن را به مسیر canonical وارد کنید؛
جایگزین کردن فقط wrapper تولیدشده باعث ناهماهنگی با `courses.json` و تست pipeline
می‌شود.

### ۵.۳ چارت درسی و قوانین تداخل

`data/canonical/curricula.json` چارت درسی را نگه می‌دارد. هر برنامه با کلید
`faculty >> group` ذخیره می‌شود و فیلدهای اصلی آن `courses`، `cohorts`،
`semester`، `prereqs`، `type` و `codes` هستند.

برای وارد کردن چارت، می‌توان از `data-editor.html` یک قطعهٔ JSON ساخت، آن را
پس از بازبینی داخل `programs` قرار داد و سپس generator را اجرا کرد. این editor
ابزار curation محلی است و در سایت عمومی منتشر نمی‌شود؛ import خودکار از JSON
افزونه وجود ندارد.

```bash
uv run python -m tools.data_pipeline.curriculum_pipeline check
uv run python -m tools.data_pipeline.curriculum_pipeline build
```

`build` این خروجی‌ها را تولید می‌کند:

- `data/canonical/conflict_rules.json`؛
- `apps/web/generated/curriculum.generated.js`؛
- `apps/web/generated/conflict-rules.generated.js`.

اعتبارسنجی Pydantic یکتا بودن course id و cohort، فرمت شناسه و کد، وجود داشتن
prerequisiteها، نبودن چرخهٔ پیش‌نیاز و معتبر بودن cohort mapping را بررسی
می‌کند. قوانین تداخل به‌صورت deterministic از چارت و کدهای ارائه‌شده ساخته
می‌شوند: درس‌های الزامی یک ترم در `mustNotConflict` و بعضی فاصله‌های دوترمی
بدون رابطهٔ پیش‌نیازی در `shouldNotConflict` قرار می‌گیرند. درس‌های اختیاری
در تولید این قوانین وارد نمی‌شوند.

اگر منبع چارت PDF، تصویر، TXT یا Markdown است،
`tools/data_pipeline/curriculum_extractor.py` می‌تواند یک draft بسازد. این
مسیر اختیاری به extraهای `ai-extract` و کلید OpenRouter نیاز دارد و نتیجه باید
پیش از approve با منبع اصلی تطبیق داده شود؛ مدل نباید منبع حقیقت داده باشد.

## ۶. منطق کلاینت و قراردادهای مهم

### ۶.۱ تقسیم مسئولیت

```text
DOM و eventها
  → pages/student-planner.js
  → features/ui.js، icons.js، advisor.js
  → adapters/planner-storage.js، ai-client.js
  → domain/course-domain.js، planner-domain.js، calendar-export.js
  → generated data
```

در `scripts/domain/` نباید از `document`، `window.localStorage` یا `fetch`
استفاده شود. `CourseDomain` parsing زمان و امتحان، overlap و سقف واحد را
انجام می‌دهد. `PlannerDomain` جستجو، گروه‌بندی ارائه‌ها، riskهای اضافه‌کردن،
سلامت برنامه، جدول هفتگی و ruleهای چارت را انجام می‌دهد. controller صفحه فقط
state، DOM و interaction را هماهنگ می‌کند.

### ۶.۲ قواعدی که هنگام تغییر نباید شکسته شوند

- `parseSchedule()` اعداد فارسی و شکل‌های مختلف نام روز را نرمال می‌کند و خط
  امتحان را از جلسهٔ کلاس جدا می‌کند.
- تداخل جلسه‌ها با دقیقهٔ شروع و پایان بررسی می‌شود؛ slot جدول فقط برای چیدمان
  بصری است.
- دو امتحان در یک تاریخ، اگر ساعت یکی از آن‌ها نامشخص باشد، با احتیاط تداخل
  محسوب می‌شوند.
- `maxUnitsForGpa()` برای معدل کمتر از ۱۲ سقف ۱۴، برای معدل ۱۷ یا بیشتر سقف
  ۲۴ و در حالت عادی سقف ۲۰ واحد می‌دهد. مقدار نامعتبر یا خالی به سقف عادی
  برمی‌گردد.
- `derivePlanHealth()` تداخل کلاس، تداخل امتحان و عبور از سقف واحد را جداگانه
  گزارش می‌کند؛ هشدارها نباید با حذف داده از کاربر پنهان شوند.
- متن پویا پیش از قرار گرفتن در templateهای HTML باید با `SafeDOM.escape`
  escape شود. برای متن ساده، استفاده از `textContent` ترجیح دارد.
- برنامهٔ ذخیره‌شده فقط برای شناسه‌های موجود پذیرفته می‌شود و پس از ۶۰ روز
  منقضی تلقی می‌شود. دادهٔ خراب یا storage غیرقابل دسترس نباید مانع startup شود.

### ۶.۳ ذخیره‌سازی مرورگر

مرز ذخیره‌سازی در `PlannerStorage.createRepository()` است. کلیدهای فعلی:

| کاربرد | کلید |
| --- | --- |
| برنامهٔ انتخابی | `uni_schedule_v2` |
| پیشرفت چارت | `uni_curriculum_v2` |
| دانشکده و گروه پروفایل | `uni_faculty` و `uni_group` |
| ورودی و معدل | `selectedCohort` و `uni_gpa` |
| فیلترهای جستجو | `uni_search_faculty` و `uni_search_group` |
| onboarding و راهنما | `uni_planner_onboarding_v1` و `uni_planner_help_guide_v1` |
| بازهٔ تقویم | `uni_calendar_start_v1` و `uni_calendar_end_v1` |

اگر schema ذخیره‌سازی تغییر کرد، کلید version جدید یا migration مشخص اضافه
کنید و تست‌های `tests/frontend/planner-storage.test.js` را تغییر دهید. پاک
کردن بی‌سر و صدای اطلاعات قدیمی، تجربهٔ کاربر را خراب می‌کند.

## ۷. دستورالعمل تغییر بخش‌های مختلف

### افزودن یا تغییر رفتار planner

1. اگر رفتار یک قاعدهٔ مستقل است، ابتدا آن را در `CourseDomain` یا
   `PlannerDomain` تعریف کنید.
2. برای حالت‌های عادی، مرزی و دادهٔ ناقص تست Node در
   `tests/frontend/*domain.test.js` بنویسید.
3. controller را برای نمایش نتیجه و اتصال event تغییر دهید.
4. دادهٔ پویا را با `SafeDOM.escape` یا `textContent` وارد کنید.
5. حالت خالی، خطا، موبایل، چاپ و restore پس از reload را بررسی کنید.
6. برای مسیر قابل مشاهدهٔ کاربر تست UI contract و در صورت نیاز Playwright
   اضافه کنید.

### تغییر parser یا دادهٔ درس

1. یک fixture کوچک از ساختار واقعی HTML و سناریوی شکست را به
   `tests/pipelines/test_course_converter.py` اضافه کنید.
2. indexها و normalization را در `course_converter.py` تغییر دهید.
3. `course_converter --check` را اجرا کنید و سپس خروجی‌ها را بازتولید کنید.
4. diff canonical، wrapper و manifest را از نظر حذف، تکرار و جابه‌جایی رکوردها
   بررسی کنید.
5. با چند رکورد واقعی، search، timetable، exams، print و calendar export را
   در مرورگر کنترل کنید.

### افزودن رشته یا اصلاح چارت

1. منبع رسمی و تاریخ بازبینی آن را مشخص کنید.
2. داده را در `curricula.json` با شناسه‌های یکتا، prerequisiteهای واقعی و کد
   بدون suffix گروه وارد کنید.
3. `curriculum_pipeline build` و `check` را اجرا کنید.
4. مقدار `reviewStatus` و `sourceFiles` را بر اساس وضعیت واقعی منبع تنظیم کنید؛
   `legacy-unverified` را بدون بررسی انسانی به `reviewed` تبدیل نکنید.
5. در UI، رشته، cohort، کدهای unmapped، وضعیت prerequisite و پیشنهادهای درس
   را بررسی کنید.

### تغییر UI یا responsive behavior

1. markup و selector معنایی را در page مربوط تغییر دهید.
2. اگر layout چاپ یا موبایل تحت تأثیر است، CSSهای `@media` و بخش print را هم
   بررسی کنید.
3. interaction با keyboard، focus dialog، حالت‌های empty و `aria` را حفظ کنید.
4. تست UI contract و E2E مربوط به مسیر را به‌روزرسانی کنید.

### تغییر API یا AI

1. قرارداد عمومی را در `apps/api/api/schemas/` تغییر دهید.
2. policy و orchestration را در `application/` نگه دارید و route را transport-only
   نگه دارید.
3. provider-specific code فقط در `infrastructure/openrouter.py` باشد.
4. برای feature flag، مدل، محدودیت پیام، پاسخ خراب و rate limit تست اضافه کنید.
5. هیچ secret را در JavaScript، HTML، localStorage، دادهٔ canonical یا commit
   قرار ندهید.

## ۸. API اختیاری دستیار هوشمند

مسیر درخواست چنین است:

```text
HTTP route
  → Pydantic schema
  → require_ai_access و rate limiter
  → AIChatService
  → OpenRouterGateway
```

endpointهای فعلی:

- `GET /health` برای metadata سلامت، بدون نمایش کلید؛
- `POST /api/ai/chat/complete` برای یک پاسخ کامل؛
- `POST /api/ai/chat/stream` برای SSE.

برای اجرای محلی:

```bash
cp apps/api/.env.example apps/api/.env
uv run uvicorn apps.api.main:app --reload --host 127.0.0.1 --port 8000
```

`AI_INTERACTIVE_ENABLED=false` باید حالت پیش‌فرض بماند. backend فقط وقتی
درخواست AI را می‌پذیرد که feature flag روشن و `OPENROUTER_API_KEY` موجود باشد؛
مدل باید در allowlist باشد و تعداد/طول پیام و max tokens محدود می‌شود. limiter
فعلی sliding-window و in-memory است و فقط یک process را پوشش می‌دهد؛ برای
استقرار چندپردازه باید همان boundary با storage مشترک، مثلاً Redis، پیاده شود.

کلاینت در `scripts/adapters/ai-client.js` ابتدا `/health` را بررسی می‌کند.
در اجرای محلی، اگر `backendUrl` خالی باشد به `http://localhost:8000` وصل
می‌شود. آدرس production در `scripts/adapters/app-config.js` قابل تنظیم است،
اما این فایل هرگز نباید شامل secret باشد.

## ۹. تست، CI و انتشار

بررسی‌های اصلی قبل از pull request:

```bash
npm test
npm run lint
uv run python -m pytest -q
uv run ruff check .
uv run python -m tools.data_pipeline.course_converter --check
uv run python -m tools.data_pipeline.curriculum_pipeline check
uv run python -m compileall -q apps/api tools
uv run python tools/build_static.py
```

تست مرورگر به Chromium نیاز دارد:

```bash
npm run test:e2e
```

CI علاوه بر موارد بالا syntax تمام JavaScriptهای web، generated و extension را
با `node --check` بررسی می‌کند و مطمئن می‌شود `data`، API و editor وارد `_site`
نشوند. workflow انتشار در `.github/workflows/pages.yml` فقط `_site` را روی
GitHub Pages منتشر می‌کند.

تست‌ها را بر اساس تغییر انتخاب کنید:

| نوع تغییر | حداقل بررسی |
| --- | --- |
| منطق زمان یا planner | تست domain و `npm test` |
| markup یا interaction | UI contract و `npm run test:e2e` |
| parser یا دادهٔ درس | تست pipeline و دو دستور `course_converter` |
| چارت یا rule | تست pipeline و `curriculum_pipeline check` |
| API یا policy امنیتی | تست backend و `uv run ruff check .` |
| build یا انتشار | `tools/build_static.py` و مرزهای `_site` |

## ۱۰. محدودیت‌های فعلی و کارهای منطقی بعدی

- منبع داده به ساختار جدول گلستان وابسته است و تغییر indexها parser را می‌شکند.
- صحت انتخاب واحد به snapshot رسمی و به‌روز وابسته است؛ خروجی برنامه جایگزین
  ثبت نهایی در گلستان نیست.
- چارت‌ها ممکن است برای بعضی رشته‌ها یا cohortها کد کامل نداشته باشند و وضعیت
  unmapped باید در UI قابل مشاهده بماند.
- ذخیره‌سازی محلی است؛ backup قابل انتقال، sharing و همگام‌سازی بین دستگاه‌ها
  هنوز مرز طراحی‌نشده‌اند.
- API AI برای production به استقرار امن، مدیریت secret، observability و limiter
  مشترک نیاز دارد.
- extension صفحه و frameهای خاص گلستان را با heuristic تشخیص می‌دهد؛ تغییر
  عنوان صفحه یا markup آن باید با fixture و تست دستی بررسی شود.

## ۱۱. چک‌لیست تحویل به توسعه‌دهندهٔ بعدی

- [ ] `npm ci` و `uv sync --locked` اجرا شده است.
- [ ] سایت دانشجو و در صورت نیاز API محلی اجرا شده‌اند.
- [ ] فرق `canonical` و `generated` بررسی شده است.
- [ ] منبع داده، تاریخ بازبینی و وضعیت review چارت مشخص است.
- [ ] هیچ فایل generated به‌صورت دستی اصلاح نشده است.
- [ ] parser یا curriculum pipeline با `--check` / `check` اجرا شده‌اند.
- [ ] تست‌های مربوط به تغییر و سپس تست‌های کامل CI اجرا شده‌اند.
- [ ] حالت‌های empty، موبایل، keyboard، print و reload بررسی شده‌اند.
- [ ] artifact عمومی ساخته و مرز فایل‌های خصوصی بررسی شده است.
- [ ] هیچ secret یا دادهٔ شخصی وارد commit نشده است.

## ۱۲. اسناد مرتبط

- [README فارسی](../README.fa.md) — معرفی و اجرای سریع؛
- [README انگلیسی](../README.md) — معرفی و اجرای سریع؛
- [راهنمای کلاینت وب](../apps/web/README.md)؛
- [راهنمای API](../apps/api/README.md)؛
- [مالکیت داده](../data/README.md)؛
- [راهنمای pipeline داده](../tools/data_pipeline/README.md).

مرجع کد: <https://github.com/VRUCS/course-planner>
