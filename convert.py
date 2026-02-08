import os
import json
from bs4 import BeautifulSoup

INPUT_FOLDER = 'raw_data'
OUTPUT_FILE = 'assets/js/data.js'

def normalize_text(text):
    if not text: return ""
    # تبدیل کاراکترهای عربی به فارسی و حذف نیم‌فاصله‌های مزاحم
    translations = {
        ord('ي'): 'ی',
        ord('ك'): 'ک',
        ord('ة'): 'ه',
        ord('۰'): '0', ord('۱'): '1', ord('۲'): '2', ord('۳'): '3', ord('۴'): '4',
        ord('۵'): '5', ord('۶'): '6', ord('۷'): '7', ord('۸'): '8', ord('۹'): '9',
        0x200C: ' ' # تبدیل نیم‌فاصله به فاصله معمولی برای تشخیص راحت‌تر
    }
    return text.translate(translations).strip()

def parse_html_file(filepath):
    courses = []
    with open(filepath, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')
    
    rows = soup.find_all('tr')
    for row in rows:
        cells = row.find_all('td')
        if len(cells) < 13: continue
        
        first_cell = cells[0].get_text(strip=True)
        if not first_cell.isdigit(): continue

        try:
            # استخراج و نرمال‌سازی
            course = {
                "id": normalize_text(cells[4].get_text()),
                "name": normalize_text(cells[5].get_text()),
                "faculty": normalize_text(cells[1].get_text()),
                "group": normalize_text(cells[3].get_text()),
                "gender": normalize_text(cells[11].get_text()),
                "prof": normalize_text(cells[12].get_text()),
                # HTML خام را نگه می‌داریم اما متن تمیز شده را هم برای امتحان می‌فرستیم
                "time_html": str(cells[13]).replace('ي', 'ی').replace('ك', 'ک'), 
                "exam_text": normalize_text(cells[13].get_text(" ", strip=True))
            }
            courses.append(course)
        except Exception as e:
            print(f"Error parsing row: {e}")
            continue
            
    return courses

def main():
    if not os.path.exists(INPUT_FOLDER):
        os.makedirs(INPUT_FOLDER)
        print(f"Please create '{INPUT_FOLDER}' and put HTML files in it.")
        return

    all_data = []
    print("Scanning files...")
    for filename in os.listdir(INPUT_FOLDER):
        if filename.endswith(".html") or filename.endswith(".htm"):
            path = os.path.join(INPUT_FOLDER, filename)
            print(f"Processing: {filename}")
            all_data.extend(parse_html_file(path))
    
    # حذف تکراری‌ها
    unique_data = {c['id']: c for c in all_data}.values()
    
    js_content = f"const UNIVERSITY_DATA = {json.dumps(list(unique_data), ensure_ascii=False)};"
    
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"Done! {len(unique_data)} courses saved.")

if __name__ == "__main__":
    main()