# معماری

## تصمیم اصلی

هسته سامانه یک برنامه استاتیک است. این تصمیم هزینه استقرار را پایین نگه می‌دارد،
GitHub Pages را ممکن می‌کند و مانع وابستگی قابلیت‌های اصلی به سرویس AI می‌شود.

## لایه‌ها

1. **Domain:** نرمال‌سازی فارسی، parse زمان، تشخیص overlap، مجموع واحد و validation.
   این لایه در `domain.js` خالص و با Node قابل تست است.
2. **Application/UI:** state، localStorage و render صفحه در فایل‌های feature فعلی.
3. **Data:** JSON تولیدی و versionable؛ `data.js` فقط adapter اجرای بدون build است.
4. **Integration:** افزونه گلستان و API اختیاری AI.

وابستگی مجاز از UI به Domain است؛ Domain نباید به DOM، storage، FastAPI یا AI
وابسته شود.

## جریان داده

```text
HTML عمومی گلستان
  → parse + normalize
  → schema validation
  → deduplicate + deterministic sort
  → courses.json
  → data.js compatibility adapter
```

داده خام دانشجویی وارد این pipeline عمومی نمی‌شود.

## مسیر رشد

در صورت بزرگ‌تر شدن UI، هر feature را به پوشه مستقل منتقل کنید، ولی framework
جدید فقط وقتی ارزش دارد که پیچیدگی تعامل‌ها واقعاً نیازمند component lifecycle
باشد. `domain.js` و schema داده باید مستقل از انتخاب framework باقی بمانند.

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
