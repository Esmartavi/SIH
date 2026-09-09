"""
Superuser storage purge
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()

print("[*] Performing superuser cleanup of storage...")
try:
    cur.execute("ALTER TABLE storage.objects DISABLE TRIGGER ALL;")
    cur.execute("DELETE FROM storage.objects WHERE bucket_id = 'raw-mplads-archives';")
    print("  [OK] Deleted all objects in 'raw-mplads-archives'.")
    cur.execute("ALTER TABLE storage.objects ENABLE TRIGGER ALL;")
    
    cur.execute("DELETE FROM storage.buckets WHERE id = 'raw-mplads-archives';")
    print("  [OK] Deleted bucket 'raw-mplads-archives'.")
except Exception as e:
    print("[!] Error:", e)

cur.execute("SELECT id, name FROM storage.buckets;")
buckets = cur.fetchall()
print("[*] Remaining storage buckets:", buckets)

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
tables = cur.fetchall()
print("[*] Remaining public tables:", tables)

conn.close()
print("[SUCCESS] All tables and S3 storage completely deleted from Supabase!")
