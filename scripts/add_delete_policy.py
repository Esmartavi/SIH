import os, psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute("""
        CREATE POLICY "Public Delete raw-mplads-archives"
        ON storage.objects FOR DELETE
        TO public
        USING (bucket_id = 'raw-mplads-archives');
    """)
    print("[OK] Delete policy created!")
except Exception as e:
    print("[!] Policy note:", e)

conn.close()
