"""
Delete Supabase Storage Files and Bucket via Storage API
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")
sp = create_client(url, key)

bucket_name = "raw-mplads-archives"
print(f"[*] Cleaning files in bucket '{bucket_name}' via Storage API...")

try:
    # 1. Check folder 2026-09-06
    files_in_folder = sp.storage.from_(bucket_name).list("2026-09-06")
    file_paths = [f"2026-09-06/{f['name']}" for f in files_in_folder]
    
    # 2. Check root files
    root_files = sp.storage.from_(bucket_name).list()
    for f in root_files:
        if f.get("name") and f.get("id"):
            file_paths.append(f["name"])
            
    print(f"[*] Found {len(file_paths)} files to remove.")
    if file_paths:
        res = sp.storage.from_(bucket_name).remove(file_paths)
        print("[OK] Removed files:", res)
except Exception as e:
    print("[!] Note on file removal:", e)

# Also try emptying bucket
try:
    res = sp.storage.empty_bucket(bucket_name)
    print("[OK] Empty bucket response:", res)
except Exception as e:
    print("[!] Note on empty bucket:", e)

# Try deleting bucket
try:
    res = sp.storage.delete_bucket(bucket_name)
    print("[OK] Delete bucket response:", res)
except Exception as e:
    print("[!] Note on delete bucket:", e)

# Verify
try:
    remaining = sp.storage.list_buckets()
    print("[*] Remaining Storage Buckets:", remaining)
except Exception as e:
    print("[!] Note listing buckets:", e)
