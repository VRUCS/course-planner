# امنیت و حریم خصوصی

## دارایی‌های حساس

- کلید OpenRouter
- سوابق پاس/افتاده و انتخاب‌های دانشجو
- exportهای شخصی سامانه گلستان

## مدل دسترسی AI

هیچ credential یا توکنی در مرورگر وجود ندارد و از کاربر گرفته نمی‌شود.
دسترسی کاملاً سمت سرور تصمیم‌گیری می‌شود: اگر `AI_INTERACTIVE_ENABLED=true`
باشد endpointهای AI برای همه کاربران سایت فعال‌اند و در غیر این صورت همه
درخواست‌ها 503 می‌گیرند. هزینه با rate limit هر IP، allowlist مدل و سقف
توکن هر درخواست کنترل می‌شود.

## کنترل‌های فعلی

- provider key فقط در environment سرویس `apps/api` است.
- endpointهای AI پشت feature flag سرور، allowlist مدل و rate limit هستند.
- schema درخواست‌ها فیلد اضافه و ورودی بیش از سقف را رد می‌کند.
- CORS به originهای تنظیم‌شده محدود است.
- داده و پاسخ AI پیش از ورود به HTML escape می‌شوند.
- CSP پایه، object و base تزریقی را مسدود می‌کند.
- artifact مربوط به Pages شامل API، داده‌های source/canonical یا exportهای محلی نیست.
- `temp/`، `exports/` و `.env` در Git نادیده گرفته می‌شوند.

## محدودیت‌های آگاهانه

- rate limit فعلی per-process است؛ برای چند instance باید Redis استفاده شود.
- دسترسی anonymous یعنی سقف هزینه فقط با rate limit و allowlist کنترل می‌شود؛
  اگر مصرف عمومی زیاد شد، quota per-user با یک identity provider اضافه کنید.
- CSP به‌علت handlerها و styleهای inline فعلی شامل `unsafe-inline` است. مهاجرت
  تدریجی event handlerها به `addEventListener` امکان سخت‌گیری بیشتر را می‌دهد.
- localStorage رمزگذاری نشده است؛ برای داده خیلی حساس مناسب نیست.

## پاسخ به رخداد

در صورت افشای credential:

1. کلید provider را فوراً rotate کنید.
2. log مصرف و مدل‌های فراخوانی‌شده را بررسی کنید.
3. deployment آلوده را rollback کنید.
4. history گیت را برای secret بررسی و در صورت نیاز پاک‌سازی کنید.

هیچ credential واقعی نباید در issue، screenshot، فایل config عمومی یا Git history
قرار گیرد.
