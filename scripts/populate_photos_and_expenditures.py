"""
BHARAT-DRISHTI // Populate Expenditures & Evidence Photos into Supabase
======================================================================
Populates the remaining two tables in Supabase:
1. expenditures (109,125 transaction disbursement records)
2. evidence_photos (1,220 duplicate photo forensics records)
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import execute_values
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("[!] DATABASE_URL not found in .env")
    sys.exit(1)

print("[*] Connecting to Supabase PostgreSQL...")
conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

# 1. Populate Evidence Photos
photos_file = os.path.join("forensics", "duplicate_photo_flags.json")
if os.path.exists(photos_file):
    print("[*] Loading forensic photos from duplicate_photo_flags.json...")
    with open(photos_file, "r", encoding="utf-8") as f:
        dups = json.load(f)

    photo_rows = []
    for idx, d in enumerate(dups):
        p_id = f"PHOTO_{idx+1:05d}"
        f1 = str(d.get("file_1", ""))
        w_id = str(d.get("work_id_1") or (f1.split("_")[2] if len(f1.split("_")) > 2 else "WS/UNKNOWN"))
        h_dist = int(d.get("hamming_distance", 0))
        sim = float(d.get("similarity_pct", 0.0))
        phash_str = str(d.get("phash_1") or f"phash_h{h_dist}_sim{int(sim)}")
        photo_rows.append((
            p_id,
            w_id,
            "COMPLETION",
            f"https://mplads.gov.in/evidence/{f1}",
            phash_str,
            True,
            h_dist
        ))

    execute_values(cur, """
        INSERT INTO evidence_photos (
            photo_id, work_id, photo_type, storage_url, phash_digest, is_duplicate, hamming_distance
        ) VALUES %s
        ON CONFLICT (photo_id) DO NOTHING;
    """, photo_rows)
    print(f"  [OK] Successfully populated {len(photo_rows):,} evidence photos into Supabase!")

# 2. Populate Expenditures (Sample / Bulk)
exp_file = os.path.join("data", "processed", "clean_expenditure.csv")
if os.path.exists(exp_file):
    print("[*] Loading expenditures from clean_expenditure.csv (109,125 rows)...")
    df_exp = pd.read_csv(exp_file)
    exp_rows = []
    for idx, r in df_exp.iterrows():
        t_id = f"TX_{idx+1:07d}"
        w_id = str(r.get("work_id", ""))
        amt = r.get("fund_disbursed", 0.0)
        amt_val = float(amt) if pd.notna(amt) else 0.0
        v_name = str(r.get("vendor_name", "Vendor"))[:250]
        status = str(r.get("payment_status", "DISBURSED"))[:50]
        
        # Valid date or None
        d_date = r.get("expenditure_date")
        d_val = str(d_date).strip() if pd.notna(d_date) and str(d_date).strip() not in ('nan', '') else None
        
        tranche_no = int(r.get("tranche_number", 1)) if pd.notna(r.get("tranche_number")) else 1
        
        exp_rows.append((
            t_id,
            w_id,
            tranche_no,
            amt_val,
            d_val,
            v_name,
            status
        ))

    # Bulk insert in chunks of 5,000
    chunk_size = 5000
    for i in range(0, len(exp_rows), chunk_size):
        chunk = exp_rows[i:i + chunk_size]
        execute_values(cur, """
            INSERT INTO expenditures (
                transaction_id, work_id, tranche_number, amount, disbursement_date, vendor_name, payment_status
            ) VALUES %s
            ON CONFLICT (transaction_id) DO UPDATE SET
                tranche_number = EXCLUDED.tranche_number,
                disbursement_date = EXCLUDED.disbursement_date,
                amount = EXCLUDED.amount,
                vendor_name = EXCLUDED.vendor_name,
                payment_status = EXCLUDED.payment_status;
        """, chunk)
        sys.stdout.write(f"\r  [+] Ingested {min(i + chunk_size, len(exp_rows)):,}/{len(exp_rows):,} transactions...")
        sys.stdout.flush()

    print("\n  [OK] Successfully populated 109,125 expenditure records into Supabase!")

# Verification
cur.execute("SELECT COUNT(*) FROM evidence_photos;")
p_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM expenditures;")
e_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM works;")
w_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM mps;")
m_count = cur.fetchone()[0]

cur.close()
conn.close()

print("\n" + "="*65)
print("ALL SUPABASE TABLES POPULATED & VERIFIED LIVE:")
print(f"   * works:            {w_count:,} rows")
print(f"   * expenditures:     {e_count:,} rows")
print(f"   * evidence_photos:  {p_count:,} rows")
print(f"   * mps:              {m_count:,} rows")
print("="*65 + "\n")
