import pandas as pd
import numpy as np

san = pd.read_csv('data/processed/clean_sanctioned.csv', low_memory=False)
exp = pd.read_csv('data/processed/clean_expenditure.csv', low_memory=False)
flags = pd.read_csv('data/processed/fraud_flags.csv', low_memory=False)

print('=== DATA AUDIT FOR STEP 4 ===')
print('Sanctioned rows:', len(san))
print('Categories count:', san['work_category'].nunique())
print('Top categories:', san['work_category'].value_counts().head(5).to_dict())

# Check coordinates
print('Has lat/lon in san:', any('lat' in c.lower() for c in san.columns))

# Check work descriptions
print('Total rows:', len(san))
print('Unique descriptions:', san['work_description'].nunique())
dup_desc = san['work_description'].value_counts()
print('Top repeated descriptions:\n', dup_desc.head(5))

# Check Vendors
unique_v = exp['vendor_name'].dropna().unique()
print('Total unique vendors:', len(unique_v))
common_names = ['SHIV KUMAR', 'RAMESH KUMAR', 'RAMESH CHANDRA', 'AJAY KUMAR', 'M/S']
for cn in common_names:
    matches = exp[exp['vendor_name'].str.upper().str.contains(cn, na=False)]
    states_cnt = matches['state'].nunique() if 'state' in matches.columns else 0
    print(f'Matches for {cn}: {len(matches)} rows across {states_cnt} states')

# Check Benford / Threshold clustering
amounts = san['sanction_amount'].dropna()
below_5l = ((amounts >= 475000) & (amounts < 500000)).sum()
at_5l = (amounts == 500000).sum()
below_10l = ((amounts >= 950000) & (amounts < 1000000)).sum()
at_10l = (amounts == 1000000).sum()
below_25l = ((amounts >= 2400000) & (amounts < 2500000)).sum()
at_25l = (amounts == 2500000).sum()
print(f'Threshold counts: Below 5L: {below_5l}, At exactly 5L: {at_5l}, Below 10L: {below_10l}, At 10L: {at_10l}, Below 25L: {below_25l}, At 25L: {at_25l}')

# Check Two-Tier Risk Distribution
statutory_breaches = flags['rule_premature_tranche'] | flags['rule_missing_photo'] | flags['rule_overspend']
print('Total works with statutory breaches:', statutory_breaches.sum())
breached_works = flags[statutory_breaches]
print('Risk label breakdown of breached works before hard floor:\n', breached_works['risk_label'].value_counts().to_dict())
print('Mean risk score of breached works:', breached_works['risk_score'].mean())
print('Min risk score of breached works:', breached_works['risk_score'].min())
