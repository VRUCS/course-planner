# معماری

## تصمیم اصلی

هسته سامانه یک برنامه استاتیک است. این تصمیم هزینه استقرار را پایین نگه می‌دارد،
GitHub Pages را ممکن می‌کند و مانع وابستگی قابلیت‌های اصلی به سرویس AI می‌شود.

## مرز استقرار

client و server دو واحد استقرار مستقل‌اند:

```text
GitHub Pages / static host                 FastAPI service
┌──────────────────────────┐              ┌───────────────────────────┐
│ HTML + page controllers  │   HTTPS      │ routes + Pydantic schemas │
│ browser adapters         │─────────────>│ application services      │
│ pure planner/domain      │              │ provider gateway          │
│ generated static data    │              │ server-only secrets       │
└──────────────────────────┘              └───────────────────────────┘
```

هسته انتخاب واحد هرگز به server یا AI وابسته نیست. client فقط قراردادهای
`/health` و `/api/ai/*` را می‌شناسد و هیچ credential مربوط به provider را
دریافت یا ذخیره نمی‌کند. server نیز به DOM، localStorage یا ساختار نمایش client
وابسته نیست.

## لایه‌های client

1. **Domain:** `course-domain.js` و `planner-domain.js` شامل policy خالص و قابل تست با Node.
2. **Adapters:** `planner-storage.js` مرز persistence و `ai.js` مرز HTTP است.
3. **Controllers/UI:** فایل‌های `scripts/pages/` فقط event و render را هماهنگ می‌کنند.
4. **Data:** JSON مرجع versionable است؛ فایل‌های JS تولیدی adapter اجرای بدون build هستند.

وابستگی مجاز از controller و adapter به Domain است. Domain نباید به DOM،
storage، network، FastAPI یا AI وابسته شود.

## لایه‌های server

1. **Transport:** routeهای باریک و schemaهای Pydantic.
2. **Application:** `AIChatService` برای policy، limitها و orchestration.
3. **Ports:** پروتکل `ChatProvider` برای وارونگی وابستگی.
4. **Adapters:** gateway مربوط به OpenRouter و rate limiter.
5. **Composition:** application factory، configuration و exception handlerهای مرکزی.

جزئیات بیشتر در [معماری frontend](frontend-architecture.md) و
[معماری backend](../apps/api/README.md) آمده است.

## جریان داده

```text
HTML عمومی گلستان
  → parse + normalize
  → schema validation
  → deduplicate + deterministic sort
  → courses.json
  → course-offerings.generated.js compatibility adapter
```

داده خام دانشجویی وارد این pipeline عمومی نمی‌شود.

## مسیر رشد

در صورت بزرگ‌تر شدن UI، هر feature را به پوشه مستقل منتقل کنید، ولی framework
جدید فقط وقتی ارزش دارد که پیچیدگی تعامل‌ها واقعاً نیازمند component lifecycle
باشد. ماژول‌های domain و schema داده باید مستقل از انتخاب framework باقی بمانند.

برای solver آینده، ماژول‌های پیشنهادی عبارت‌اند از:

```text
domain/
  schedule
  prerequisites
  constraints
  scoring
  solver
```

AI تنها توضیح یا رتبه‌بندی نرم انجام می‌دهد و نباید constraint قطعی را override کند.
