"""
Configure RLS Policies for Supabase Storage
Allows upload and read access for raw-mplads-archives
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()

policies = [
    """
    CREATE POLICY "Public Uploads raw-mplads-archives"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'raw-mplads-archives');
    """,
    """
    CREATE POLICY "Public Select raw-mplads-archives"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'raw-mplads-archives');
    """,
    """
    CREATE POLICY "Public Update raw-mplads-archives"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id = 'raw-mplads-archives')
    WITH CHECK (bucket_id = 'raw-mplads-archives');
    """
]

for sql in policies:
    try:
        cur.execute(sql)
        print("[OK] Policy created successfully.")
    except Exception as e:
        print("[!] Policy note:", e)

conn.close()
print("[OK] Storage policies setup completed.")
