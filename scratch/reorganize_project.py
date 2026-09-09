import os
import shutil

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

print(f"Working in: {ROOT}")

# 1. Create target directories
dirs_to_create = [
    os.path.join(ROOT, "docs"),
    os.path.join(ROOT, "data", "raw"),
    os.path.join(ROOT, "data", "processed"),
    os.path.join(ROOT, "pipelines"),
]

for d in dirs_to_create:
    os.makedirs(d, exist_ok=True)
    print(f"[+] Directory created/verified: {os.path.relpath(d, ROOT)}")

# 2. Map of files to move: (src, dst_dir)
moves = [
    # Documentation
    ("a.txt", "docs"),
    ("ps26102_master_plan.md", "docs"),
    ("FRONTEND_API_GUIDE.md", "docs"),
    ("flow.md", "docs"),
    ("decision.md", "docs"),
    ("data_analysis_report.txt", "docs"),
    ("fraud_summary.txt", "docs"),
    
    # Raw data
    ("Allocated Limit for Honble MPs.csv", os.path.join("data", "raw")),
    ("LOK shabha data", os.path.join("data", "raw")),
    ("rajya shabha", os.path.join("data", "raw")),
    
    # Processed data
    ("clean_allocated.csv", os.path.join("data", "processed")),
    ("clean_completed.csv", os.path.join("data", "processed")),
    ("clean_expenditure.csv", os.path.join("data", "processed")),
    ("clean_sanctioned.csv", os.path.join("data", "processed")),
    ("fraud_flags.csv", os.path.join("data", "processed")),
    ("audit_log.db", os.path.join("data", "processed")),
    
    # Pipelines
    ("analyse_data.py", "pipelines"),
    ("clean_data.py", "pipelines"),
    ("fraud_models.py", "pipelines"),
    ("validate.py", "pipelines"),
]

for item, target_dir in moves:
    src_path = os.path.join(ROOT, item)
    dst_dir_path = os.path.join(ROOT, target_dir)
    dst_path = os.path.join(dst_dir_path, item)
    
    if os.path.exists(src_path):
        # If destination already exists, remove it or overwrite
        if os.path.exists(dst_path):
            if os.path.isdir(dst_path):
                shutil.rmtree(dst_path)
            else:
                os.remove(dst_path)
        shutil.move(src_path, dst_dir_path)
        print(f"[✓] Moved: {item} -> {target_dir}/")
    else:
        print(f"[-] Already moved or not found: {item}")

# 3. Clean up root duplicates of forensics JSONs
stale_root_jsons = [
    "duplicate_photo_flags.json",
    "forensics_summary.json",
    "missing_photo_flags.json",
    "ocr_flags.json",
]
for f in stale_root_jsons:
    p = os.path.join(ROOT, f)
    if os.path.isfile(p):
        os.remove(p)
        print(f"[x] Removed redundant root JSON: {f}")

print("\nReorganization script executed successfully!")
