"""
Benford Forensic Master Analysis Runner
=======================================
Runs complete mathematical Benford audit across both Sanction Amounts
and Vendor Disbursements, saving cached summary JSON and generating
an interactive HTML report for live demonstration.
"""

import os
import sys
import time
import json
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure root directory is in sys.path
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from benford.core import BenfordAnalyzer
from benford.procurement_audit import ProcurementAuditEngine
from benford.visualizer import BenfordVisualizer


def run_full_benford_audit(output_dir: str = THIS_DIR) -> Dict[str, Any]:
    print("=" * 75)
    print("  [MPLADS] BENFORD'S LAW FORENSIC FINANCIAL AUDIT PIPELINE")
    print("=" * 75)
    t0 = time.perf_counter()

    engine = ProcurementAuditEngine(data_dir=ROOT_DIR)
    print("[1/5] Ingesting financial transaction datasets...")
    engine.load_data()

    sanctions_count = len(engine.sanctions_df) if engine.sanctions_df is not None else 0
    exp_count = len(engine.expenditure_df) if engine.expenditure_df is not None else 0
    print(f"  • Sanctioned Projects  : {sanctions_count:,} records")
    print(f"  • Vendor Disbursements : {exp_count:,} records")

    # ── 2. Run Benford Tests on Sanction Amounts ─────────────────────────────
    print("\n[2/5] Running Vectorized Benford Tests on Sanction Amounts...")
    sanctions_amt = engine.sanctions_df["sanction_amount"] if engine.sanctions_df is not None else pd.Series([])

    res_sanctions_d1 = BenfordAnalyzer.evaluate(sanctions_amt, "first_digit")
    res_sanctions_d2 = BenfordAnalyzer.evaluate(sanctions_amt, "second_digit")
    res_sanctions_d12 = BenfordAnalyzer.evaluate(sanctions_amt, "first_two_digits")

    print(f"  • 1st Digit MAD   : {res_sanctions_d1.mad:.5f} -> {res_sanctions_d1.conformity_status}")
    print(f"  • 1st Digit χ²    : {res_sanctions_d1.chi_square:,.1f} (p = {res_sanctions_d1.p_value})")
    print(f"  • Critical Digits : {res_sanctions_d1.critical_digits}")

    # ── 3. Run Benford Tests on Vendor Disbursements ─────────────────────────
    print("\n[3/5] Running Vectorized Benford Tests on Vendor Disbursements...")
    exp_amt = engine.expenditure_df["fund_disbursed"] if engine.expenditure_df is not None else pd.Series([])

    res_exp_d1 = BenfordAnalyzer.evaluate(exp_amt, "first_digit")
    res_exp_d2 = BenfordAnalyzer.evaluate(exp_amt, "second_digit")
    res_exp_d12 = BenfordAnalyzer.evaluate(exp_amt, "first_two_digits")

    print(f"  • 1st Digit MAD   : {res_exp_d1.mad:.5f} -> {res_exp_d1.conformity_status}")
    print(f"  • 1st Digit χ²    : {res_exp_d1.chi_square:,.1f} (p = {res_exp_d1.p_value})")
    print(f"  • Critical Digits : {res_exp_d1.critical_digits}")

    # ── 4. Procurement Threshold & Round Number Audit ────────────────────────
    print("\n[4/5] Auditing Tender Threshold Cliffs & Round Number Bias...")
    threshold_reports = engine.audit_procurement_thresholds()
    round_numbers = engine.audit_round_numbers()

    for r in threshold_reports:
        print(f"  • {r['rule_name']}: Danger Zone={r['danger_count']} vs Post={r['post_count']} (Ratio={r['evasion_ratio']}x) -> {r['risk_verdict']}")

    print(f"  • Round Numbers: Multiples of ₹1L = {round_numbers.get('multiples_100k_pct', 0)}% -> {round_numbers.get('verdict', 'N/A')}")

    # ── 5. Entity Drill-Down Rankings ─────────────────────────────────────────
    print("\n[5/5] Computing Entity Non-Conformity Rankings...")
    top_states = engine.entity_drilldown_rankings(group_by="state", top_k=10)
    top_districts = engine.entity_drilldown_rankings(group_by="district", top_k=10)
    top_mps = engine.entity_drilldown_rankings(group_by="mp_name", top_k=10)
    top_vendors = engine.entity_drilldown_rankings(group_by="vendor", top_k=10)

    # Flagged transactions
    flagged_tx = engine.get_flagged_anomalous_transactions(
        critical_digits=res_sanctions_d1.critical_digits or [2, 4, 5],
        limit=50
    )

    t1 = time.perf_counter()
    elapsed = t1 - t0
    print(f"\n[+] Complete Benford Audit executed across {sanctions_count + exp_count:,} records in {elapsed:.2f} seconds!")

    # ── Build Summary Dictionary ─────────────────────────────────────────────
    summary = {
        "metadata": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "execution_time_seconds": round(elapsed, 3),
            "sanctions_sample_size": sanctions_count,
            "expenditures_sample_size": exp_count
        },
        "sanctions_audit": {
            "first_digit": res_sanctions_d1.to_dict(),
            "second_digit": res_sanctions_d2.to_dict(),
            "first_two_digits": res_sanctions_d12.to_dict()
        },
        "expenditures_audit": {
            "first_digit": res_exp_d1.to_dict(),
            "second_digit": res_exp_d2.to_dict(),
            "first_two_digits": res_exp_d12.to_dict()
        },
        "procurement_rules": {
            "threshold_cliffs": threshold_reports,
            "round_numbers": round_numbers
        },
        "drilldowns": {
            "top_states_by_mad": top_states,
            "top_districts_by_mad": top_districts,
            "top_mps_by_mad": top_mps,
            "top_vendors_by_mad": top_vendors
        },
        "flagged_transactions": flagged_tx
    }

    # Save summary JSON
    json_path = os.path.join(output_dir, "benford_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[*] Saved pre-computed intelligence to: {json_path}")

    # Generate Standalone Interactive HTML Report
    html_path = os.path.join(output_dir, "benford_report.html")
    try:
        primary_anomaly = max(res_exp_d1.distributions, key=lambda d: d.z_score) if res_exp_d1.distributions else None
        anomaly_digit = primary_anomaly.digit if primary_anomaly else "N/A"
        anomaly_diff = primary_anomaly.diff_pct if primary_anomaly else 0.0
        anomaly_z = primary_anomaly.z_score if primary_anomaly else 0.0

        # Pre-compute cliff values to keep f-string readable
        cliff_ratio = f"{threshold_reports[0]['evasion_ratio']}x" if threshold_reports else "N/A"
        cliff_danger = f"{threshold_reports[0]['danger_count']:,}" if threshold_reports else "N/A"
        sanct_mad_label = res_sanctions_d1.conformity_status
        exp_mad_val = f"{res_exp_d1.mad:.4f}"
        exp_status = res_exp_d1.conformity_status

        fig_sanctions = BenfordVisualizer.create_distribution_figure(res_sanctions_d1, title="Sanction Amounts: Benford's Law Audit")
        fig_exp = BenfordVisualizer.create_distribution_figure(res_exp_d1, title=f"Vendor Disbursements: Benford's Law Audit (Digit {anomaly_digit} Evasion Spike)")
        fig_z = BenfordVisualizer.create_zscore_figure(res_exp_d1)
        fig_gauge = BenfordVisualizer.create_mad_gauge_figure(res_exp_d1)
        fig_cliff = BenfordVisualizer.create_threshold_cliff_figure(threshold_reports)

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>MPLADS Benford's Law Forensic Intelligence</title>
    <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
    <style>
        body {{
            background-color: #0b0f19;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 24px;
        }}
        .header {{
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }}
        .metric-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }}
        .card {{
            background: #141b2d;
            border: 1px solid #232d45;
            border-radius: 10px;
            padding: 16px;
        }}
        .card-val {{
            font-size: 28px;
            font-weight: 700;
            margin-top: 4px;
        }}
        .crit {{ color: #ef4444; }}
        .warn {{ color: #f59e0b; }}
        .ok {{ color: #10b981; }}
        .chart-box {{
            background: #141b2d;
            border: 1px solid #232d45;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin:0 0 8px 0;">🏛️ MPLADS AI Forensic Audit: Benford's Law & Threshold Evasion</h1>
        <p style="margin:0; color:#94a3b8;">
            Audit of ₹2,500+ Cr public expenditures across 98,649 sanctioned works and 109,125 vendor disbursements.
        </p>
    </div>

    <div class="metric-grid">
        <div class="card">
            <div style="color:#94a3b8; font-size:13px;">Disbursements Sample Size</div>
            <div class="card-val">{exp_count:,}</div>
        </div>
        <div class="card">
            <div style="color:#94a3b8; font-size:13px;">Vendor Benford MAD Score</div>
            <div class="card-val crit">{exp_mad_val}</div>
            <div style="color:#ef4444; font-size:12px;">{exp_status}</div>
        </div>
        <div class="card">
            <div style="color:#94a3b8; font-size:13px;">Primary Anomaly Trigger</div>
            <div class="card-val crit">Digit {anomaly_digit} ({anomaly_diff:+.2f}%)</div>
            <div style="color:#ef4444; font-size:12px;">Z-Score: {anomaly_z:+.1f}</div>
        </div>
        <div class="card">
            <div style="color:#94a3b8; font-size:13px;">Tender Cliff Ratio (&lt; ₹5L)</div>
            <div class="card-val warn">{cliff_ratio}</div>
            <div style="color:#f59e0b; font-size:12px;">{cliff_danger} works right below ₹5L</div>
        </div>
    </div>

    <div class="chart-box">
        {BenfordVisualizer.to_html(fig_exp, full_html=False)}
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:24px;">
        <div class="chart-box" style="margin-bottom:0;">
            {BenfordVisualizer.to_html(fig_z, full_html=False)}
        </div>
        <div class="chart-box" style="margin-bottom:0;">
            {BenfordVisualizer.to_html(fig_cliff, full_html=False)}
        </div>
    </div>

    <div class="chart-box">
        {BenfordVisualizer.to_html(fig_sanctions, full_html=False)}
    </div>
</body>
</html>
"""
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"[*] Generated interactive visual report: {html_path}")
    except Exception as e:
        print(f"Warning generating HTML report: {e}")

    return summary


if __name__ == "__main__":
    run_full_benford_audit()
