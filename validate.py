"""
validate.py  -- Part 12 Validation Script (MPLADS Master Plan)

Pulls the top N works by risk_score from fraud_flags.csv and for each
auto-verifies whether it has at least one OBJECTIVE, checkable rule violation.

Reports a real "K / N verified" number so judges see a concrete precision
estimate instead of an unverified claim.

Usage:
    python validate.py              # checks top 20 works
    python validate.py --top 50     # checks top 50 works
    python validate.py --out validation_report.txt
"""

import argparse
import os
import pandas as pd
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))

FLAGS_FILE = os.path.join(BASE, "fraud_flags.csv")
EXP_FILE   = os.path.join(BASE, "clean_expenditure.csv")
SAN_FILE   = os.path.join(BASE, "clean_sanctioned.csv")
COM_FILE   = os.path.join(BASE, "clean_completed.csv")
ALLOC_FILE = os.path.join(BASE, "clean_allocated.csv")


def load_all():
    flags = pd.read_csv(FLAGS_FILE, encoding="utf-8-sig")
    san   = pd.read_csv(SAN_FILE,   encoding="utf-8-sig", parse_dates=["sanction_date"])
    exp   = pd.read_csv(EXP_FILE,   encoding="utf-8-sig", parse_dates=["expenditure_date"])
    com   = pd.read_csv(COM_FILE,   encoding="utf-8-sig")
    alloc = pd.read_csv(ALLOC_FILE, encoding="utf-8-sig")
    return flags, san, exp, com, alloc


def check_objective_violations(work_id, mp_name, sanction_amount, sanction_date,
                                work_status, exp, san_row, com, alloc):
    """
    Runs objective, checkable rule checks on a single work.
    Returns a list of plain-English violation strings (empty = no objective violation found).
    """
    violations = []

    # Check 1: Overspend
    work_exp = exp[exp["work_id"] == work_id]
    if not work_exp.empty:
        total_spent = work_exp["fund_disbursed"].sum()
        if total_spent > sanction_amount and sanction_amount >= 1000:
            violations.append(
                f"Overspend: paid Rs.{total_spent:,.0f} > sanctioned Rs.{sanction_amount:,.0f}"
            )

        # Check 2: Payment before sanction date
        if pd.notna(sanction_date):
            first_payment = work_exp["expenditure_date"].min()
            if pd.notna(first_payment) and first_payment < sanction_date:
                days_early = (sanction_date - first_payment).days
                violations.append(
                    f"Early payment: first payment {days_early} days before sanction date"
                )

    # Check 3: Completed but no photo
    if str(work_status).strip() == "Work Completed":
        if "work_id" in com.columns and "has_image" in com.columns:
            com_row = com[com["work_id"] == work_id]
            if not com_row.empty and com_row.iloc[0].get("has_image") == False:
                violations.append("Missing photo: work completed but no photo evidence uploaded")

    # Check 4: Implausible sanction amount
    if sanction_amount < 1000:
        violations.append(f"Implausible amount: sanction is Rs.{sanction_amount:.2f}")

    # Check 5: MP total expenditure exceeds true_budget
    if "true_budget" in alloc.columns:
        mp_alloc = alloc[alloc["mp_name"] == mp_name]
        if not mp_alloc.empty and pd.notna(mp_alloc.iloc[0].get("true_budget")):
            true_budget = mp_alloc.iloc[0]["true_budget"]
            mp_total = exp[exp["mp_name"] == mp_name]["fund_disbursed"].sum()
            if mp_total > true_budget:
                overrun_pct = (mp_total - true_budget) / true_budget * 100
                violations.append(
                    f"MP over budget: spent Rs.{mp_total:,.0f} vs budget Rs.{true_budget:,.0f} "
                    f"(+{overrun_pct:.1f}%)"
                )

    return violations


def run_validation(top_n: int = 20) -> dict:
    print(f"\n{'='*65}")
    print(f"  MPLADS FRAUD DETECTION -- VALIDATION REPORT (Part 12)")
    print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*65}")

    flags, san, exp, com, alloc = load_all()

    # Sort by risk_score and take top N
    top = flags.sort_values("risk_score", ascending=False).head(top_n).copy()
    print(f"\n  Checking top {len(top)} works by risk_score...")

    results = []
    verified = 0

    for _, row in top.iterrows():
        work_id        = row["work_id"]
        mp_name        = row.get("mp_name", "")
        sanction_amount= row.get("sanction_amount", 0)
        work_status    = row.get("work_status", "")
        risk_score     = row.get("risk_score", 0)
        risk_label     = row.get("risk_label", "")

        # Get sanction_date from san CSV (flags CSV may not have it parsed)
        san_row = san[san["work_id"] == work_id]
        sanction_date = san_row.iloc[0]["sanction_date"] if not san_row.empty else None

        violations = check_objective_violations(
            work_id, mp_name, sanction_amount, sanction_date,
            work_status, exp, san_row, com, alloc
        )

        is_verified = len(violations) > 0
        if is_verified:
            verified += 1

        results.append({
            "work_id"      : work_id,
            "mp_name"      : mp_name,
            "risk_score"   : risk_score,
            "risk_label"   : risk_label,
            "verified"     : is_verified,
            "violations"   : violations,
            "model_reason" : str(row.get("reason", ""))[:120],
        })

    # Print per-work results
    print()
    for i, r in enumerate(results, 1):
        status = "VERIFIED" if r["verified"] else "unverified"
        print(f"  #{i:>2}  [{r['risk_label']:8}] {r['risk_score']:.1f}/100  {status}")
        print(f"       Work ID : {r['work_id']}")
        print(f"       MP      : {r['mp_name']}")
        if r["violations"]:
            for v in r["violations"]:
                print(f"       PASS    : {v}")
        else:
            print(f"       Model   : {r['model_reason']}")
        print()

    # Summary
    precision = verified / len(top) * 100
    print(f"{'='*65}")
    print(f"  PRECISION ESTIMATE: {verified}/{len(top)} top-ranked works have")
    print(f"  at least one objective, independently checkable rule violation.")
    print(f"  Estimated precision @ top-{top_n}: {precision:.1f}%")
    print(f"{'='*65}")

    return {
        "top_n"    : top_n,
        "verified" : verified,
        "precision": precision,
        "results"  : results,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Validate top N fraud flags against objective rule violations"
    )
    parser.add_argument("--top", type=int, default=20,
                        help="Number of top-ranked works to validate (default: 20)")
    parser.add_argument("--out", type=str, default=None,
                        help="Optional output file path for the report")
    args = parser.parse_args()

    result = run_validation(top_n=args.top)

    if args.out:
        import sys
        # Re-run and capture to file
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(f"MPLADS Validation Report\n")
            f.write(f"Top {result['top_n']} works: {result['verified']} verified\n")
            f.write(f"Precision: {result['precision']:.1f}%\n\n")
            for r in result["results"]:
                f.write(f"#{result['results'].index(r)+1} {r['work_id']} [{r['risk_label']}] "
                        f"{r['risk_score']:.1f}/100  {'VERIFIED' if r['verified'] else 'unverified'}\n")
                for v in r["violations"]:
                    f.write(f"  PASS: {v}\n")
                f.write("\n")
        print(f"\n  Report saved to: {args.out}")


if __name__ == "__main__":
    main()
