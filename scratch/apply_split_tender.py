import pandas as pd
import numpy as np

csv_path = 'data/processed/fraud_flags.csv'
print(f"Loading {csv_path}...")
df = pd.read_csv(csv_path, low_memory=False)

# Compute Rule 8: GFR 2017 Tender Threshold Evasion (Split Tendering)
df["rule_split_tender"] = (
    (df["sanction_amount"].between(450000, 499999)) |
    (df["sanction_amount"].between(900000, 999999))
)

count_split = df["rule_split_tender"].sum()
print(f"Total works flagged with rule_split_tender: {count_split:,}")

# Update reason text for flagged works
def append_split_reason(row):
    reason = str(row.get("reason", ""))
    if row["rule_split_tender"]:
        split_note = f"[Compliance] GFR 2017 Rule 149/155: Sanction Rs.{row['sanction_amount']:,.0f} clustered just below procurement threshold (Split Tendering)"
        if "Split Tendering" not in reason:
            if reason and reason != "No significant flags":
                return f"{reason} | {split_note}"
            else:
                return split_note
    return reason

df["reason"] = df.apply(append_split_reason, axis=1)

df.to_csv(csv_path, index=False, encoding="utf-8-sig")
print("Saved data/processed/fraud_flags.csv with rule_split_tender!")

# Summary verification
c1 = df["sanction_amount"].between(450000, 499999).sum()
c2 = df["sanction_amount"].between(900000, 999999).sum()
print(f"  - Rs.4.50L to Rs.4.99L (under Rs.5L threshold) : {c1:,}")
print(f"  - Rs.9.00L to Rs.9.99L (under Rs.10L threshold): {c2:,}")
print(f"  - Total GFR Split Tendering Works              : {count_split:,}")
