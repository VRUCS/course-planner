import os
import re
import json
from bs4 import BeautifulSoup

# تنظیمات
INPUT_FOLDER = 'raw_data'
OUTPUT_FILE = 'assets/js/data.js'

def parse_html_file(filepath):
    courses = []
    with open(filepath, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')
    
    rows = soup.find_all('tr')
    for row in rows:
        cells = row.find_all('td')
        if len(cells) < 13: continue
        
        # بررسی اینکه هدر نباشد (سلول اول عدد باشد)
        first_cell = cells[0].get_text(strip=True)
        if not first_cell.isdigit(): continue

        try:
            # استخراج داده‌ها بر اساس ساختار گلستان
            faculty_name = cells[1].get_text(strip=True)
            group_name = cells[3].get_text(strip=True)
            course_id = cells[4].get_text(strip=True)
            course_name = cells[5].get_text(strip=True)
            gender = cells[11].get_text(strip=True) # ستون جنسیت
            prof = cells[12].get_text(strip=True)
            
            # زمان و امتحان (شامل HTML برای جدا کردن خطوط)
            time_html = str(cells[13]) 
            time_text = cells[13].get_text(" ", strip=True)

            courses.append({
                "id": course_id,
                "name": course_name,
                "faculty": faculty_name,
                "group": group_name,
                "gender": gender,
                "prof": prof,
                "time_html": time_html, # برای پارس دقیق‌تر در JS
                "exam_text": time_text  # برای استخراج امتحان
            })
        except Exception as e:
            print(f"Error parsing row: {e}")
            continue
            
    return courses

def main():
    all_data = []
    
    if not os.path.exists(INPUT_FOLDER):
        os.makedirs(INPUT_FOLDER)
        print(f"Folder '{INPUT_FOLDER}' created. Put HTML files there.")
        return

    print("Scanning files...")
    for filename in os.listdir(INPUT_FOLDER):
        if filename.endswith(".html") or filename.endswith(".htm"):
            path = os.path.join(INPUT_FOLDER, filename)
            print(f"Processing: {filename}")
            all_data.extend(parse_html_file(path))
    
    # حذف تکراری‌ها بر اساس کد درس
    unique_data = {c['id']: c for c in all_data}.values()
    
    # نوشتن فایل JS
    js_content = f"const UNIVERSITY_DATA = {json.dumps(list(unique_data), ensure_ascii=False)};"
    
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"Done! {len(unique_data)} courses saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    # نیاز به نصب beautifulsoup4 دارید: pip install beautifulsoup4
    main()