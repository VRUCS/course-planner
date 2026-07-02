# برنامه درسی مهندسی کامپیوتر
هر بار فقط فایل‌های مربوط به یک نسخه از چارت را پردازش کنید. ابتدا پیش‌نویس
اعتبارسنجی‌شده بسازید:

    uv run --extra ai-extract python -m tools.data_pipeline.curriculum_extractor \
      --input data/sources/curriculum/cs/cs-chart-1403-and-later.pdf \
      --field cs --field-name 'علوم کامپیوتر' --cohorts ۱۴۰۳

فایل `temp/curriculum_cs.draft.json` را با منبع مقایسه کنید. فقط پس از بازبینی
انسانی، دقیقاً همان فایل را بدون اجرای دوباره AI تأیید کنید:

    uv run --extra ai-extract python -m tools.data_pipeline.curriculum_extractor \
      --approve-draft temp/curriculum_cs.draft.json \
      --faculty 'علوم ریاضی و کامپیوتر' --group 'علوم کامپیوتر'

این کار JSON مرجع، قوانین deterministic و wrapperهای JavaScript را بازسازی می‌کند.
