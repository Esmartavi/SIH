import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
""")
tables = [r[0] for r in cur.fetchall()]

print(f"Total Tables: {len(tables)}\n")

for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t};")
    cnt = cur.fetchone()[0]
    
    cur.execute(f"""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '{t}' 
        ORDER BY ordinal_position;
    """)
    cols = cur.fetchall()
    
    cur.execute(f"SELECT * FROM {t} LIMIT 1;")
    sample = cur.fetchone()
    
    print("=" * 70)
    print(f"TABLE: {t.upper()} (Total Rows: {cnt:,})")
    print("-" * 70)
    print("COLUMNS & TYPES:")
    col_names = []
    for c, dt in cols:
        col_names.append(c)
        print(f"  • {c:25s} ({dt})")
    print("\nSAMPLE ROW:")
    if sample:
        for c_name, val in zip(col_names, sample):
            val_str = str(val)
            if len(val_str) > 80:
                val_str = val_str[:77] + "..."
            print(f"    {c_name:23s}: {val_str}")
    else:
        print("    [Empty Table]")
    print()

print("=" * 70)
print("1. FOREIGN KEY CONSTRAINTS")
print("-" * 70)
cur.execute("""
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
""")
fks = cur.fetchall()
if not fks:
    print("  [!] NO foreign key constraints found in public schema!")
else:
    for fk in fks:
        print(f"  [FK] {fk[0]}.{fk[1]} -> {fk[2]}.{fk[3]} ({fk[4]})")

print("\n" + "=" * 70)
print("2. INDEXES IN PUBLIC SCHEMA")
print("-" * 70)
cur.execute("""
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
""")
indexes = cur.fetchall()
for tab, iname, idef in indexes:
    print(f"  [{tab}] {iname}:")
    print(f"       {idef}")

print("\n" + "=" * 70)
print("3. STORAGE BUCKETS & RLS POLICIES")
print("-" * 70)
try:
    cur.execute("SELECT id, name, public, created_at FROM storage.buckets;")
    for b in cur.fetchall():
        print(f"  [Bucket] ID: {b[0]} | Name: {b[1]} | Public: {b[2]} | Created: {b[3]}")
except Exception as e:
    print("  [!] Error fetching storage.buckets:", e)

try:
    cur.execute("""
        SELECT policyname, tablename, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'storage';
    """)
    pols = cur.fetchall()
    if not pols:
        print("  [!] No storage policies found.")
    else:
        for p in pols:
            print(f"  [Policy] {p[0]} on storage.{p[1]} (Command: {p[2]})")
except Exception as e:
    print("  [!] Error fetching storage policies:", e)

print("\n" + "=" * 70)
print("4. QUERY PERFORMANCE BENCHMARKS (<20ms SLA Target)")
print("-" * 70)
import time

bench_queries = [
    ("Filter works by risk_tier (B-Tree)", "SELECT count(*) FROM works WHERE risk_tier = 'CRITICAL'"),
    ("Filter works by state (B-Tree)", "SELECT count(*) FROM works WHERE state = 'Bihar'"),
    ("Filter works by state + district", "SELECT count(*) FROM works WHERE state = 'Bihar' AND district = 'GAYA'"),
    ("Work ID Single Point Lookup (PK)", "SELECT work_id, title, risk_score FROM works WHERE work_id = 'WS/MP18371/2024-2025/163349'"),
    ("Expenditures by work_id (B-Tree)", "SELECT count(*), sum(amount) FROM expenditures WHERE work_id = 'WS/MP18218/2025-2026/233777'"),
    ("Evidence photos by phash (B-Tree)", "SELECT count(*) FROM evidence_photos WHERE phash_digest = '80a5875a7f852fb1'")
]

for label, sql in bench_queries:
    # Run twice: first warm cache, second timed
    cur.execute(sql)
    cur.fetchall()
    t0 = time.perf_counter()
    cur.execute(sql)
    rows = cur.fetchall()
    t_ms = (time.perf_counter() - t0) * 1000
    status_tag = "[PASS <20ms]" if t_ms < 20 else f"[WARN {t_ms:.1f}ms]"
    print(f"  {status_tag:15s} {label:35s} -> {t_ms:6.2f} ms")

conn.close()
