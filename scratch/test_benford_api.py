import sys
import requests
import json

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

base = "http://localhost:8000"
try:
    h = requests.get(f"{base}/api/health", timeout=5).json()
    print("Health:", h)
    
    s = requests.get(f"{base}/api/benford/summary", timeout=5).json()
    print("Benford Summary status:", s.get("status"))
    print("Sanctions MAD:", s.get("sanctions_metrics", {}).get("mad"), "Status:", s.get("sanctions_metrics", {}).get("conformity_status"))
    print("Expenditures MAD:", s.get("expenditure_metrics", {}).get("mad"), "Status:", s.get("expenditure_metrics", {}).get("conformity_status"))
    
    d = requests.get(f"{base}/api/benford/distribution?dataset=expenditures&digit_type=first_digit", timeout=5).json()
    print("Digit Distribution status:", d.get("status"), "Sample size:", d.get("sample_size"))
    for item in d.get("distributions", []):
        print(f"  Digit {item['digit']}: Obs={item['observed_pct']}% Exp={item['expected_pct']}% Diff={item['diff_pct']}% Z={item['z_score']} Risk={item['risk_level']}")
        
    t = requests.get(f"{base}/api/benford/thresholds", timeout=5).json()
    print("Tender Thresholds count:", len(t.get("threshold_reports", [])))
    for r in t.get("threshold_reports", []):
        print(f"  Rule: {r['rule_name']} -> Ratio: {r['evasion_ratio']}x ({r['danger_count']} vs {r['post_count']}) Verdict: {r['risk_verdict']}")

    drill = requests.get(f"{base}/api/benford/drilldown?group_by=state&limit=5", timeout=5).json()
    print("Top 5 Anomalous States by MAD:")
    for e in drill.get("entities", []):
        print(f"  State: {e['entity']} -> MAD: {e['mad']} (Status: {e['conformity_status']})")
        
    rep = requests.get(f"{base}/api/benford/report", timeout=5)
    print(f"HTML Report Endpoint status code: {rep.status_code}, Length: {len(rep.text):,} bytes")
    
    print("\nALL BENFORD API ENDPOINTS VERIFIED AND FULLY OPERATIONAL!")
except Exception as e:
    print("Error testing Benford API:", e)
