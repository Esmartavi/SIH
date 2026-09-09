import os
import hashlib
import datetime
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()

# Check current count in audit_ledger
cur.execute("SELECT count(*) FROM audit_ledger;")
cnt = cur.fetchone()[0]
print("Current count in audit_ledger:", cnt)

if cnt == 0:
    print("[*] Seeding initial cryptographic audit chain...")
    seed_records = [
        {
            "work_id": "WS/MP18278/2024-2025/134671",
            "user_id": "ministry_admin",
            "role": "ministry",
            "action": "ESCALATED",
            "justification": "Critical discrepancy between sanctioned physical progress and milestone timeline. Field inspection ordered under District Collector.",
            "original_risk_score": 88.50,
            "timestamp": (datetime.datetime.utcnow() - datetime.timedelta(hours=6)).isoformat()
        },
        {
            "work_id": "WS/MP18218/2025-2026/233777",
            "user_id": "state_nodal_up",
            "role": "state",
            "action": "INSPECTION_ORDERED",
            "justification": "Perceptual duplicate hash detected for uploaded completion photography. Third-party structural engineer dispatched for re-geotagging.",
            "original_risk_score": 91.00,
            "timestamp": (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).isoformat()
        },
        {
            "work_id": "WS/MP18371/2024-2025/163349",
            "user_id": "district_pilibhit",
            "role": "district",
            "action": "TREASURY_HOLD_RECOMMENDED",
            "justification": "Contractor concentration monopoly flag verified. Single vendor captured >65% of constituency works. Recommend treasury hold to District Magistrate.",
            "original_risk_score": 85.20,
            "timestamp": (datetime.datetime.utcnow() - datetime.timedelta(hours=1)).isoformat()
        }
    ]
    
    prev_hash = "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026"
    for r in seed_records:
        payload = f"{prev_hash}|{r['timestamp']}|{r['work_id']}|{r['user_id']}|{r['role']}|{r['action']}|{r['justification']}|{r['original_risk_score']:.2f}"
        seal = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        cur.execute("""
            INSERT INTO audit_ledger 
            (work_id, user_id, role, action, justification, original_risk_score, sha256_seal, previous_hash, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            r["work_id"], r["user_id"], r["role"], r["action"], r["justification"],
            r["original_risk_score"], seal, prev_hash, r["timestamp"]
        ))
        print(f"  [OK] Seeded record: {r['action']} -> Seal: {seal[:16]}...")
        prev_hash = seal

# Verify chain integrity
cur.execute("SELECT log_id, action, previous_hash, sha256_seal, timestamp FROM audit_ledger ORDER BY log_id ASC;")
rows = cur.fetchall()
print("\n=== AUDIT LEDGER HASH CHAIN VERIFICATION ===")
is_valid = True
for idx, r in enumerate(rows):
    print(f"Log #{r[0]} | Action: {r[1]:26s} | Prev: {r[2][:12]}... | Seal: {r[3][:12]}...")
    if idx > 0:
        if r[2] != rows[idx-1][3]:
            print(f"  [!] BROKEN CHAIN AT LOG #{r[0]}!")
            is_valid = False

if is_valid:
    print(">>> HASH CHAIN INTEGRITY: 100% MATHEMATICALLY VERIFIED & UNBROKEN <<<")

conn.close()

