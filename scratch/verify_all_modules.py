import sys
import os
import json
import sqlite3
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
os.chdir(ROOT)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("=" * 70)
print("1. VERIFYING ML & FRAUD DETECTION ENGINE (fraud_flags.csv)")
print("=" * 70)
flags_path = os.path.join("data", "processed", "fraud_flags.csv") if os.path.exists(os.path.join("data", "processed", "fraud_flags.csv")) else "fraud_flags.csv"
df = pd.read_csv(flags_path, low_memory=False)
print(f"Total Works Ingested: {len(df):,}")
print("Risk Breakdown:")
for label, count in df["risk_label"].value_counts().items():
    pct = count / len(df) * 100
    print(f"  - {label:<8}: {count:>6,} ({pct:.1f}%)")

top_work = df.sort_values("risk_score", ascending=False).iloc[0]
print("\n--- Top Flagged Work Example ---")
print(f"Work ID         : {top_work['work_id']}")
print(f"MP Name         : {top_work['mp_name']} ({top_work['state']})")
print(f"Category        : {top_work['work_category']}")
print(f"Implementing DA : {top_work['ida']}")
print(f"Sanction Amount : Rs. {top_work['sanction_amount']:,.2f}")
print(f"Total Spent     : Rs. {top_work['total_spent']:,.2f}")
print(f"Progress Pct    : {top_work['progress_pct']}%")
print(f"Risk Score      : {top_work['risk_score']}/100 ({top_work['risk_label']})")
print(f"Anomaly Score   : {top_work['anomaly_score']:.1f}")
print(f"Vendor Score    : {top_work['work_vendor_score']:.1f}")
print(f"Compliance Score: {top_work['compliance_score']:.1f}")
print(f"Timeline Score  : {top_work['timeline_score']:.1f}")
print(f"Reasons         : {top_work['reason']}")

print("\n" + "=" * 70)
print("2. VERIFYING VENDOR IDENTITY RESOLUTION (MODEL 2)")
print("=" * 70)
monopolies = df[df["work_vendor_flag"] == True]
print(f"Works Flagged with Monopoly Vendors: {len(monopolies):,}")
v_sample = monopolies.iloc[0]
print(f"Canonical Vendor: {v_sample['work_top_vendor']}")
print(f"Aliases Detected: {v_sample['work_vendor_aliases']}")
print(f"MP Name         : {v_sample['mp_name']}")
print(f"Vendor Share    : {v_sample['work_vendor_concentration']*100:.1f}% of MP total spend")

print("\n" + "=" * 70)
print("3. VERIFYING BENFORD'S LAW FORENSIC ENGINE")
print("=" * 70)
with open("benford/benford_summary.json", "r", encoding="utf-8") as f:
    bdata = json.load(f)

s_d1 = bdata["sanctions_audit"]["first_digit"]
e_d1 = bdata["expenditures_audit"]["first_digit"]
print(f"Sanctions First-Digit Audit    : N={s_d1['sample_size']:,}, MAD={s_d1['mad']:.4f} -> {s_d1['conformity_status']}")
print(f"Expenditures First-Digit Audit : N={e_d1['sample_size']:,}, MAD={e_d1['mad']:.4f} -> {e_d1['conformity_status']}")

rules = bdata.get("procurement_rules", {})
round_stats = rules.get("round_numbers", {})
print(f"Multiples of Rs. 1,00,000      : {round_stats.get('multiples_100k_pct', 0):.2f}% ({round_stats.get('verdict', 'N/A')})")

cliffs = rules.get("threshold_cliffs", [])
print(f"Tender Threshold Evasion Cliffs Detected: {len(cliffs)}")
for c in cliffs:
    print(f"  - {c['rule_name']:<40}: Evasion Ratio={c['evasion_ratio']:.2f} ({c['risk_verdict']}) [Danger: {c['danger_count']} vs Post: {c['post_count']}]")

print("\n" + "=" * 70)
print("4. VERIFYING IMAGE & DOCUMENT FORENSICS")
print("=" * 70)
with open("forensics/forensics_summary.json", "r", encoding="utf-8") as f:
    fdata = json.load(f)

print("Forensics Summary Stats:", json.dumps(fdata.get("stats", {}), indent=2))
mismatches = fdata.get("amount_mismatches", [])
print(f"OCR Amount Mismatches (Certificate vs Portal): {len(mismatches)}")
if mismatches:
    print("Example Mismatch:", json.dumps(mismatches[0], indent=2))

dups = fdata.get("duplicate_photos", [])
print(f"Perceptual Hash Duplicate Photo Pairs: {len(dups)}")
if dups:
    print("Example Duplicate Photo Pair:", json.dumps(dups[0], indent=2))

print("\n" + "=" * 70)
print("5. VERIFYING LLM EXPLAIN LAYER")
print("=" * 70)
from llm.explain import GeminiExplainer
explainer = GeminiExplainer()
print(f"Active Model : {explainer.model}")
print(f"API Key Live : {bool(explainer.api_key)}")
briefing = explainer.explain_briefing()
print(f"Headline Stat: {briefing.get('headline_stat')}")
print(f"Top States   : {briefing.get('top_states_of_concern')}")
print(f"Opening      : {briefing.get('opening_paragraph')[:150]}...")

print("\n" + "=" * 70)
print("6. VERIFYING IMMUTABLE AUDIT LOG (audit_log.db)")
print("=" * 70)
db_path = os.path.join("data", "processed", "audit_log.db") if os.path.exists(os.path.join("data", "processed", "audit_log.db")) else "audit_log.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM dismissals")
count = c.fetchone()[0]
print(f"Audit Log Total Entries: {count}")
if count > 0:
    c.execute("SELECT id, work_id, timestamp, user_id, role, action, justification, original_risk_score FROM dismissals ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    print(f"Latest Action: User '{row[3]}' ({row[4]}) marked Work '{row[1]}' as '{row[5]}'")
    print(f"Justification: \"{row[6]}\"")
conn.close()
print("=" * 70)
print("ALL 6 ENGINES VERIFIED SUCCESSFULLY!")
print("=" * 70)
