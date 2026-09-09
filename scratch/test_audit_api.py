import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.main import get_audit_log, log_audit_action, DismissalRequest

print("=== 1. TESTING GET_AUDIT_LOG ===")
records = get_audit_log()
print(f"Retrieved {len(records)} records from Supabase audit ledger.")
for r in records[:3]:
    lid = r.get("log_id")
    act = r.get("action")
    seal = str(r.get("sha256_seal", ""))[:16]
    wid = r.get("work_id")
    print(f"Log #{lid} | Action: {act:26s} | Seal: {seal}... | Work: {wid}")

print("\n=== 2. TESTING LOG_AUDIT_ACTION (ADDING NEW EVENT TO CHAIN) ===")
req = DismissalRequest(
    work_id="WS/MP18278/2024-2025/134674",
    action="CONFIRMED",
    justification="Statutory forensic re-verification confirmed split tendering threshold breach. Recommendation submitted to District Magistrate.",
    original_risk_score=89.4
)
user_dummy = {"sub": "cvc_national_auditor", "role": "ministry"}
res = log_audit_action(req, user=user_dummy)
print("Action result:", res)

print("\n=== 3. RETESTING GET_AUDIT_LOG TO VERIFY NEW SEAL IN CHAIN ===")
records_updated = get_audit_log()
print(f"Total records now: {len(records_updated)}")
for r in records_updated[:5]:
    lid = r.get("log_id")
    act = r.get("action")
    prev = str(r.get("previous_hash", ""))[:12]
    seal = str(r.get("sha256_seal", ""))[:12]
    print(f"Log #{lid} | Action: {act:26s} | Prev: {prev}... | Seal: {seal}...")
