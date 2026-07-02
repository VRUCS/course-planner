# برنامه درسی مهندسی کامپیوتر
هر بار فقط فایل‌های مربوط به یک نسخه از چارت را پردازش کنید. ابتدا پیش‌نویس
اعتبارسنجی‌شده بسازید:

    uv run --extra ai-extract python ai_extract.py \
      --input raw_data/curriculum/cs/cs-chart-1403-and-later.pdf \
      --field cs --field-name 'علوم کامپیوتر' --cohorts ۱۴۰۳

فایل `temp/curriculum_cs.draft.json` را با منبع مقایسه کنید. فقط پس از بازبینی
انسانی، دقیقاً همان فایل را بدون اجرای دوباره AI تأیید کنید:

    uv run --extra ai-extract python ai_extract.py \
      --approve-draft temp/curriculum_cs.draft.json \
      --faculty 'علوم ریاضی و کامپیوتر' --group 'علوم کامپیوتر'

این کار JSON مرجع، قوانین deterministic و wrapperهای JavaScript را بازسازی می‌کند.
