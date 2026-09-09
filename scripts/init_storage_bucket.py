"""
BHARAT-DRISHTI // Initialize Supabase Storage Bucket & Test Connection
======================================================================
Creates the 'raw-mplads-archives' bucket in Supabase Storage.
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise ValueError("DATABASE_URL not found in .env")

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

print("[*] Creating 'raw-mplads-archives' bucket in Supabase Storage...")
cur.execute("""
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('raw-mplads-archives', 'raw-mplads-archives', true)
    ON CONFLICT (id) DO NOTHING;
""")

cur.execute("SELECT id, name, public, created_at FROM storage.buckets;")
buckets = cur.fetchall()
print("[OK] Supabase Storage Buckets:")
for b in buckets:
    print(f"   * Bucket ID: {b[0]} | Name: {b[1]} | Public: {b[2]} | Created: {b[3]}")

conn.close()
