import os
import json
import re
from bs4 import BeautifulSoup

# تنظیمات
INPUT_FOLDER = 'raw_data'
OUTPUT_FILE = 'assets/js/data.js'

def normalize_text(text):
    if not text: return ""
    # جدول تبدیل: اعداد فارسی به انگلیسی، عربی به فارسی، حذف نیم‌فاصله
    translations = {
        ord('ي'): 'ی', ord('ك'): 'ک', ord('ة'): 'ه',
        ord('۰'): '0', ord('۱'): '1', ord('۲'): '2', ord('۳'): '3', ord('۴'): '4',
        ord('۵'): '5', ord('۶'): '6', ord('۷'): '7', ord('۸'): '8', ord('۹'): '9',
        0x200C: ' ' 
    }
    # جایگزینی فاصله‌های اضافه و خط‌های جدید با یک فاصله
    clean_text = text.translate(translations)
    clean_text = re.sub(r'\s+', ' ', clean_text)
    return clean_text.strip()

def parse_html_file(filepath):
    courses = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')
        
        rows = soup.find_all('tr')
        for row in rows:
            cells = row.find_all('td')
            # چک کردن ساختار جدول گلستان (حداقل 13 ستون)
            if len(cells) < 13: continue
            
            # ستون اول باید عدد باشد
            first_cell = cells[0].get_text(strip=True)
            if not first_cell.isdigit(): continue

            # استخراج داده‌ها
            raw_id = normalize_text(cells[4].get_text()) # شماره و گروه
            
            course = {
                "id": raw_id,
                "name": normalize_text(cells[5].get_text()),
                "faculty": normalize_text(cells[1].get_text()),
                "group": normalize_text(cells[3].get_text()),
                "gender": normalize_text(cells[11].get_text()),
                "prof": normalize_text(cells[12].get_text()),
                # HTML زمان را برای پردازش بعدی نگه می‌داریم (با اصلاح ی/ک)
                "time_html": str(cells[13]).replace('ي', 'ی').replace('ك', 'ک'), 
                # متن کامل را هم برای استخراج امتحان نگه می‌داریم
                "exam_text": normalize_text(cells[13].get_text(" ", strip=True))
            }
            courses.append(course)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
            
    return courses

def main():
    if not os.path.exists(INPUT_FOLDER):
        os.makedirs(INPUT_FOLDER)
        print(f"پوشه '{INPUT_FOLDER}' ساخته شد. فایل‌های HTML را داخل آن بریزید.")
        return

    all_raw_courses = []
    print("در حال اسکن فایل‌ها...")
    
    files = [f for f in os.listdir(INPUT_FOLDER) if f.endswith(".html") or f.endswith(".htm")]
    
    if not files:
        print("هیچ فایل HTMLی در پوشه raw_data پیدا نشد.")
        return

    for filename in files:
        path = os.path.join(INPUT_FOLDER, filename)
        print(f"Processing: {filename}")
        all_raw_courses.extend(parse_html_file(path))
    
    # --- حذف تکراری‌ها ---
    unique_map = {}
    for course in all_raw_courses:
        c_id = course['id']
        if c_id not in unique_map:
            unique_map[c_id] = course

    final_list = list(unique_map.values())
    
    # ساخت فایل JS
    js_content = f"const UNIVERSITY_DATA = {json.dumps(final_list, ensure_ascii=False)};"
    
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"تمام شد! {len(final_list)} درس یکتا در فایل {OUTPUT_FILE} ذخیره شد.")

if __name__ == "__main__":
    main()