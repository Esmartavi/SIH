import pandas as pd
import os

PROC = os.path.join("data", "processed")

# Check clean_sanctioned.csv
san = pd.read_csv(os.path.join(PROC, "clean_sanctioned.csv"))
print("=== clean_sanctioned.csv ===")
print(f"Rows: {len(san):,}")
print(f"Columns: {list(san.columns)}")
ws_vals = san["work_status"].unique().tolist()
print(f"work_status unique values: {ws_vals}")
pp_vals = sorted(san["progress_pct"].dropna().unique().tolist())
print(f"progress_pct unique values: {pp_vals}")
print(f"Null progress_pct count: {san['progress_pct'].isna().sum()}")
print(f"sanction_amount nulls: {san['sanction_amount'].isna().sum()}")
sample_ids = san["work_id"].dropna().head(3).tolist()
print(f"Sample work_ids: {sample_ids}")
print()

# Check clean_expenditure.csv
exp = pd.read_csv(os.path.join(PROC, "clean_expenditure.csv"))
print("=== clean_expenditure.csv ===")
print(f"Rows: {len(exp):,}")
print(f"Columns: {list(exp.columns)}")
print(f"fund_disbursed nulls: {exp['fund_disbursed'].isna().sum()}")
print(f"expenditure_date nulls: {exp['expenditure_date'].isna().sum()}")
print()

print("=== TRANCHE DERIVATION CHECK ===")
print(f"Has tranche_number column: {'tranche_number' in exp.columns}")
print()

# Check clean_allocated.csv
alloc = pd.read_csv(os.path.join(PROC, "clean_allocated.csv"))
print("=== clean_allocated.csv ===")
print(f"Rows: {len(alloc):,}")
print(f"Columns: {list(alloc.columns)}")
print(f"true_budget present: {'true_budget' in alloc.columns}")
print(f"Sample true_budget values: {alloc['true_budget'].head(5).tolist()}")
print(f"allocated_amount range: min={alloc['allocated_amount'].min():,.0f}, max={alloc['allocated_amount'].max():,.0f}")
print()

print("=== GRAND TOTAL FILTER CHECK ===")
# Check if any Grand Total rows leaked through
for col in ["sr_no", "work_id"]:
    if col in san.columns:
        gt_count = san[col].astype(str).str.contains("Grand Total", case=False, na=False).sum()
        print(f"  'Grand Total' rows in sanctioned[{col}]: {gt_count}")
if "work_id" in exp.columns:
    gt_count = exp["work_id"].astype(str).str.contains("Grand Total", case=False, na=False).sum()
    print(f"  'Grand Total' rows in expenditure[work_id]: {gt_count}")
print()

print("=== INVISIBLE CHAR CHECK ===")
# Check if any xa0 chars remain
xa0_count = san["mp_name"].astype(str).str.contains("\xa0", na=False).sum()
print(f"  Remaining \\xa0 in sanctioned mp_name: {xa0_count}")
print()

print("=== WORK STATUS COVERAGE ===")
vc = san["work_status"].value_counts()
print(vc.to_string())
print()

print("=== PROGRESS_PCT VS PLAN SPEC ===")
# Plan says: Time Estimation=0, Sanction=20, Vendor Identification=40,
#            Physical Inspection=60, Work partially Completed=80, Work Completed=100
# Code uses: Sanction=0, Time Estimation=10, VendorId=20, PhysInsp=50, WPC=75, WC=100
PLAN_MAP = {
    "Time Estimation": 0,
    "Sanction": 20,
    "Vendor Identification": 40,
    "Physical Inspection": 60,
    "Work partially Completed": 80,
    "Work Completed": 100,
}
actual_mapping = dict(san.groupby('work_status')['progress_pct'].first())
print("  Status                      | Plan % | Actual % | Status")
print("  " + "-"*56)
for s, expected in PLAN_MAP.items():
    actual = actual_mapping.get(s, "N/A")
    match = "PASS (MATCH)" if expected == actual else f"FAIL (Got {actual})"
    print(f"  {s:<28}| {str(expected):<7}| {str(actual):<9}| {match}")

# Tranche distribution summary
print("\n=== TRANCHE DISTRIBUTION IN clean_expenditure.csv ===")
t_dist = exp['tranche_number'].value_counts().sort_index().head(5)
for tr, count in t_dist.items():
    print(f"  Tranche {tr}: {count:,} transactions")

