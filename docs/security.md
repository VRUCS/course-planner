# امنیت و حریم خصوصی

## دارایی‌های حساس

- کلید OpenRouter
- توکن دسترسی backend
- سوابق پاس/افتاده و انتخاب‌های دانشجو
- exportهای شخصی سامانه گلستان

## کنترل‌های فعلی

- provider key فقط در environment backend است.
- endpointهای AI به‌طور پیش‌فرض `X-API-Token`، allowlist مدل و rate limit دارند.
- schema درخواست‌ها فیلد اضافه و ورودی بیش از سقف را رد می‌کند.
- CORS به originهای تنظیم‌شده محدود است.
- داده و پاسخ AI پیش از ورود به HTML escape می‌شوند.
- CSP پایه، object و base تزریقی را مسدود می‌کند.
- artifact مربوط به Pages شامل backend، raw data یا exportهای محلی نیست.
- `temp/`، `exports/` و `.env` در Git نادیده گرفته می‌شوند.

## محدودیت‌های آگاهانه

- rate limit فعلی per-process است؛ برای چند instance باید Redis استفاده شود.
- توکن مشترک برای کاربران عمومی مناسب نیست. نسخه عمومی نیازمند login و quota
  per-user در سمت سرور است.
- CSP به‌علت handlerها و styleهای inline فعلی شامل `unsafe-inline` است. مهاجرت
  تدریجی event handlerها به `addEventListener` امکان سخت‌گیری بیشتر را می‌دهد.
- localStorage رمزگذاری نشده است؛ برای داده خیلی حساس مناسب نیست.

## پاسخ به رخداد

در صورت افشای credential:

1. کلید provider و `AI_API_TOKEN` را فوراً rotate کنید.
2. log مصرف و مدل‌های فراخوانی‌شده را بررسی کنید.
3. deployment آلوده را rollback کنید.
4. history گیت را برای secret بررسی و در صورت نیاز پاک‌سازی کنید.

هیچ credential واقعی نباید در issue، screenshot، فایل config عمومی یا Git history
قرار گیرد.
