import os

output_file = "project_code.txt"
ignore_dirs = {"venv", "__pycache__", ".git", ".idea", "alembic"}

with open(output_file, "w", encoding="utf-8") as outfile:
    for root, dirs, files in os.walk("."):
        # حذف پوشه‌های اضافی از جستجو
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for file in files:
            if file.endswith(".py"): # فقط فایل‌های پایتون را می‌گیرد
                filepath = os.path.join(root, file)
                outfile.write(f"\n\n{'='*50}\n")
                outfile.write(f"File: {filepath}\n")
                outfile.write(f"{'='*50}\n\n")
                
                with open(filepath, "r", encoding="utf-8") as infile:
                    outfile.write(infile.read())

print("All files exported to project_code.txt")