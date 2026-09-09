"""
BHARAT-DRISHTI // Complete Supabase Cleanup Script
===================================================
Completely wipes:
1. All public tables: works, expenditures, evidence_photos, mps, audit_ledger
2. All storage objects and buckets in Supabase Storage: raw-mplads-archives
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise ValueError("DATABASE_URL not found in .env")

print("[*] Connecting to Supabase PostgreSQL...")
conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

# 1. Drop all application tables in public schema
tables_to_drop = [
    "audit_ledger",
    "evidence_photos",
    "expenditures",
    "works",
    "mps"
]

print("\n[*] Dropping database tables in public schema...")
for table in tables_to_drop:
    try:
        cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
        print(f"  [DELETED] Table '{table}' dropped successfully.")
    except Exception as e:
        print(f"  [!] Note dropping {table}: {e}")

# 2. Delete all storage objects and bucket
print("\n[*] Deleting all storage objects & buckets from Supabase Storage...")
try:
    cur.execute("SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'raw-mplads-archives';")
    obj_count = cur.fetchone()[0]
    cur.execute("DELETE FROM storage.objects WHERE bucket_id = 'raw-mplads-archives';")
    print(f"  [DELETED] Removed {obj_count} storage objects from 'raw-mplads-archives'.")
    
    cur.execute("DELETE FROM storage.buckets WHERE id = 'raw-mplads-archives';")
    print("  [DELETED] Storage bucket 'raw-mplads-archives' deleted successfully.")
except Exception as e:
    print(f"  [!] Note cleaning storage: {e}")

# 3. Verify clean state
print("\n[*] Verifying clean state in Supabase:")
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
""")
remaining_tables = [t[0] for t in cur.fetchall()]
print(f"  * Remaining public tables: {remaining_tables}")

cur.execute("SELECT id, name FROM storage.buckets;")
remaining_buckets = cur.fetchall()
print(f"  * Remaining storage buckets: {remaining_buckets}")

conn.close()
print("\n[SUCCESS] Supabase completely wiped clean!")
