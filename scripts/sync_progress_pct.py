"""
BHARAT-DRISHTI // Synchronize Corrected Progress Percentages
============================================================
Syncs the official milestone progression percentages to both:
1. data/processed/fraud_flags.csv
2. Supabase PostgreSQL table 'works'

Official MoSPI eSAKSHI Milestone Mapping:
- Time Estimation          ->   0%
- Sanction                 ->  20%
- Vendor Identification    ->  40%
- Physical Inspection      ->  60%
- Work partially Completed ->  80%
- Work Completed           -> 100%
"""

import os
import sys
import psycopg2
from psycopg2.extras import execute_batch
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

PROGRESS_MAP = {
    'Time Estimation': 0,
    'Sanction': 20,
    'Vendor Identification': 40,
    'Physical Inspection': 60,
    'Work partially Completed': 80,
    'Work Completed': 100,
}

# 1. Update fraud_flags.csv
flags_path = os.path.join("data", "processed", "fraud_flags.csv")
if os.path.exists(flags_path):
    print(f"[*] Updating progress_pct in {flags_path}...")
    df = pd.read_csv(flags_path, low_memory=False)
    df['progress_pct'] = df['work_status'].map(PROGRESS_MAP).fillna(df['progress_pct'])
    df.to_csv(flags_path, index=False, encoding="utf-8-sig")
    print(f"  [OK] Updated {len(df):,} records in fraud_flags.csv.")
    print("  Value breakdown:")
    print(df.groupby(['work_status', 'progress_pct']).size())

# 2. Update Supabase works table
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("[!] DATABASE_URL not set.")
    sys.exit(1)

san_path = os.path.join("data", "processed", "clean_sanctioned.csv")
if not os.path.exists(san_path):
    print(f"[!] {san_path} not found.")
    sys.exit(1)

print("\n[*] Loading clean_sanctioned.csv for Supabase works update...")
san = pd.read_csv(san_path, usecols=['work_id', 'progress_pct'], low_memory=False)
san = san.dropna(subset=['work_id'])

records = [(float(pct), str(wid)) for wid, pct in zip(san['work_id'], san['progress_pct'])]

print(f"[*] Updating progress_pct for {len(records):,} works in Supabase PostgreSQL...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

# Temporary table approach for maximum speed
cur.execute("CREATE TEMP TABLE temp_progress (progress_pct NUMERIC(5,2), work_id VARCHAR(100));")
execute_batch(cur, "INSERT INTO temp_progress (progress_pct, work_id) VALUES (%s, %s);", records, page_size=10000)

print("  [+] Merging into 'works' table...")
cur.execute("""
    UPDATE works w
    SET progress_pct = tp.progress_pct
    FROM temp_progress tp
    WHERE w.work_id = tp.work_id;
""")

print("  [+] Verifying live distribution in Supabase works table:")
cur.execute("SELECT progress_pct, COUNT(*) FROM works GROUP BY progress_pct ORDER BY progress_pct;")
for row in cur.fetchall():
    print(f"    progress_pct = {row[0]}% : {row[1]:,} works")

cur.close()
conn.close()
print("\n[OK] Progress percentages 100% synchronized across CSVs and Supabase!")
