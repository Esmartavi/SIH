import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

with open("benford/benford_summary.json", "r", encoding="utf-8") as f:
    d = json.load(f)

print("=" * 85)
print("  LIVE EVIDENCE: BENFORD'S LAW AUDIT ON YOUR ACTUAL MPLADS DATASET")
print("=" * 85)
print(f"Total Sanctioned Works Ingested   : {d['metadata']['sanctions_sample_size']:,} real records")
print(f"Total Vendor Disbursements Ingested: {d['metadata']['expenditures_sample_size']:,} real records")
print(f"Audit Pipeline Execution Time      : {d['metadata']['execution_time_seconds']} seconds")

print("\n" + "-" * 85)
print("1. SANCTIONS DATASET (clean_sanctioned.csv) - 1st DIGIT BENFORD ANALYSIS")
print("-" * 85)
s = d["sanctions_audit"]["first_digit"]
print(f"Mark Nigrini MAD Rating: {s['mad']:.5f} -> {s['conformity_status']}")
print(f"Chi-Square: {s['chi_square']:,.1f} | p-value: {s['p_value']} | Critical Digits: {s['critical_digits']}")
print(f"{'Digit':<6} | {'Actual Count':<13} | {'Observed %':<11} | {'Benford Expected':<16} | {'Deviation':<10} | {'Z-Score':<8} | {'Risk'}")
print("-" * 85)
for row in s["distributions"]:
    print(f"{row['digit']:<6} | {row['observed_count']:<13,d} | {row['observed_pct']:>6.2f}%     | {row['expected_pct']:>6.2f}%         | {row['diff_pct']:>+6.2f}%   | {row['z_score']:>+6.2f} | {row['risk_level']}")

print("\n" + "-" * 85)
print("2. VENDOR EXPENDITURES DATASET (clean_expenditure.csv) - 1st DIGIT ANALYSIS")
print("-" * 85)
e = d["expenditures_audit"]["first_digit"]
print(f"Mark Nigrini MAD Rating: {e['mad']:.5f} -> {e['conformity_status']}")
print(f"Chi-Square: {e['chi_square']:,.1f} | Critical Digits: {e['critical_digits']}")
print(f"{'Digit':<6} | {'Actual Count':<13} | {'Observed %':<11} | {'Benford Expected':<16} | {'Deviation':<10} | {'Z-Score':<8} | {'Risk'}")
print("-" * 85)
for row in e["distributions"]:
    print(f"{row['digit']:<6} | {row['observed_count']:<13,d} | {row['observed_pct']:>6.2f}%     | {row['expected_pct']:>6.2f}%         | {row['diff_pct']:>+6.2f}%   | {row['z_score']:>+6.2f} | {row['risk_level']}")

print("\n" + "-" * 85)
print("3. REAL-WORLD STATUTORY TENDER CLIFFS IN YOUR DATA")
print("-" * 85)
for r in d["procurement_rules"]["threshold_cliffs"]:
    print(f"• {r['rule_name']}")
    print(f"    Zone Just Below Limit ({r['danger_zone_range']}) : {r['danger_count']:,} projects ({r['danger_pct']}%)")
    print(f"    Buffer Just Above Limit ({r['post_zone_range']}) : {r['post_count']:,} projects ({r['post_pct']}%)")
    print(f"    Evasion Ratio: {r['evasion_ratio']}x -> {r['risk_verdict']}")

print("\n" + "-" * 85)
print("4. ESTIMATE INFLATION (ROUND-NUMBER BIAS) IN YOUR SANCTIONS")
print("-" * 85)
rn = d["procurement_rules"]["round_numbers"]
print(f"• Exact Multiples of ₹1,00,000 : {rn['multiples_100k_pct']}% ({rn['multiples_100k_count']:,} works)")
print(f"• Exact Multiples of ₹50,000   : {rn['multiples_50k_pct']}% ({rn['multiples_50k_count']:,} works)")
print(f"• Multiples of ₹5,00,000       : {rn['multiples_500k_pct']}% ({rn['multiples_500k_count']:,} works)")
print(f"• Forensic Verdict: {rn['verdict']}")

print("\n" + "-" * 85)
print("5. TOP 5 ANOMALOUS STATES IN YOUR DATA (Ranked by MAD non-conformity)")
print("-" * 85)
for st in d["drilldowns"]["top_states_by_mad"][:5]:
    print(f"• State: {st['entity']:<25} | Works: {st['records_count']:<6,d} | MAD: {st['mad']:.4f} | Critical: {st['critical_digits']}")

print("\n" + "-" * 85)
print("6. TOP 5 ANOMALOUS MPs IN YOUR DATA (Ranked by MAD non-conformity)")
print("-" * 85)
for mp in d["drilldowns"]["top_mps_by_mad"][:5]:
    print(f"• MP: {mp['entity']:<30} | Works: {mp['records_count']:<4d} | Total: ₹{mp['total_amount']:>12,.2f} | MAD: {mp['mad']:.4f} | Critical: {mp['critical_digits']}")

print("\n" + "-" * 85)
print("7. ACTUAL FLAGGED SUSPICIOUS WORKS FROM YOUR DATASET")
print("-" * 85)
for tx in d["flagged_transactions"][:5]:
    print(f"• Work ID: {tx['work_id']} | MP: {tx['mp_name']} ({tx['state']})")
    print(f"  Sanction Amount: ₹{tx['sanction_amount']:,.2f} (Lead Digit: {tx['lead_digit']}) | Reasons: {', '.join(tx['reasons'])}")
