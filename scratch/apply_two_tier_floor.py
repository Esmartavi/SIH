import pandas as pd
import numpy as np

csv_path = 'data/processed/fraud_flags.csv'
print(f"Loading {csv_path}...")
df = pd.read_csv(csv_path, low_memory=False)

has_hard_violation = (
    df['rule_premature_tranche'] | 
    df['rule_missing_photo'] | 
    df['rule_overspend'] | 
    df['rule_early_payment']
)

print(f"Total works with confirmed statutory violations: {has_hard_violation.sum():,}")
print("Previous risk_label distribution of statutory violation works:")
print(df.loc[has_hard_violation, 'risk_label'].value_counts())

# Calculate dynamic ML percentiles BEFORE floor
p_high   = df['risk_score'].quantile(0.90)
p_medium = df['risk_score'].quantile(0.70)
print(f"Thresholds: p_high={p_high:.2f}, p_medium={p_medium:.2f}")

# Apply two-tier floor
df['risk_score'] = np.where(
    has_hard_violation,
    np.maximum(85.0, df['risk_score']),
    df['risk_score']
).round(1)

def risk_label_two_tier(score, is_hard):
    if is_hard or score >= 85.0: return 'CRITICAL'
    if score == 0.0: return 'LOW'
    if score >= p_high:   return 'HIGH'
    elif score >= p_medium: return 'MEDIUM'
    return 'LOW'

df['risk_label'] = [
    risk_label_two_tier(s, h)
    for s, h in zip(df['risk_score'], has_hard_violation)
]

# Sort by risk_score descending
df = df.sort_values('risk_score', ascending=False).reset_index(drop=True)

df.to_csv(csv_path, index=False, encoding='utf-8-sig')
print("Saved updated data/processed/fraud_flags.csv!")

print("\nOverall Risk Label Distribution:")
print(df['risk_label'].value_counts())

print("\nHard violation works distribution after floor:")
print(df.loc[df['rule_premature_tranche'] | df['rule_missing_photo'] | df['rule_overspend'] | df['rule_early_payment'], 'risk_label'].value_counts())
