import os, psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute("DELETE FROM storage.buckets WHERE id = 'raw-mplads-archives';")
    print("[OK] Deleted empty bucket 'raw-mplads-archives'.")
except Exception as e:
    print("[!] Bucket delete note:", e)

cur.execute("SELECT id, name FROM storage.buckets;")
print("Remaining Buckets:", cur.fetchall())

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
print("Remaining Public Tables:", cur.fetchall())

conn.close()
