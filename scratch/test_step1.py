import os
import psycopg2
import time
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv(DATABASE_URL))
cur = conn.cursor()

print(=== 1. FOREIGN KEY CONSTRAINTS ===)
cur.execute('''
    SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
''')
fks = cur.fetchall()
if not fks:
    print( [!] NO foreign key constraints found in public schema!)
else:
    for fk in fks:
        print(f [FK] {fk[2]}.{fk[3]} -> {fk[4]}.{fk[5]} ({fk[1]}))

print(\n=== 2. INDEXES IN PUBLIC SCHEMA ===)
cur.execute('''
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
''')
indexes = cur.fetchall()
for tab, iname, idef in indexes:
    print(f [{tab}] {iname}: {idef})

print(\n=== 3. STORAGE BUCKETS & RLS POLICIES ===)
try:
    cur.execute(SELECT id, name, public, created_at FROM storage.buckets;)
    for b in cur.fetchall():
        print(f [Bucket] {b[0]} | Name: {b[1]} | Public: {b[2]})
except Exception as e:
    print( [!] Error fetching storage.buckets:, e)

try:
    cur.execute('''
        SELECT policyname, tablename, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'storage';
    ''')
    for p in cur.fetchall():
        print(f [Policy] {p[0]} on {p[1]} ({p[2]}))
except Exception as e:
    print( [!] Error fetching pg_policies:, e)

print(\n=== 4. QUERY BENCHMARK (<20ms target) ===)
queries = [
    (Filter works by risk_tier, SELECT count(*) FROM works WHERE risk_tier = 'CRITICAL'),
    (Filter works by state, SELECT count(*) FROM works WHERE state = 'Bihar'),
    (Filter works by state+district, SELECT count(*) FROM works WHERE state = 'Bihar' AND district = 'GAYA'),
    (Lookup single work_id, SELECT work_id, title, risk_score FROM works WHERE work_id = 'WS/MP18371/2024-2025/163349'),
    (Join work and expenditures, SELECT w.work_id, count(e.transaction_id) FROM works w JOIN expenditures e ON w.work_id = e.work_id WHERE w.state = 'Uttar Pradesh' GROUP BY w.work_id LIMIT 10)
]

for q_name, sql in queries:
    t0 = time.perf_counter()
    cur.execute(sql)
    res = cur.fetchall()
    dt = (time.perf_counter() - t0) * 1000
    print(f * {q_name}: {dt:.2f} ms (Rows returned: {len(res)}))

conn.close()
