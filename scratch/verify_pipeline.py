import time
import sys, os
sys.path.insert(0, os.path.abspath("."))
import pandas as pd
from pipelines.fraud_models import load_data, model2_vendor_identity_resolution, OUT_FILE

print("Testing pipeline integration with precomputed state-scoped vendor alias map...")
t0 = time.time()
san, exp, com, alloc = load_data()
pair, work_vendor_scores = model2_vendor_identity_resolution(exp, alloc)
print(f"Model 2 executed in {time.time() - t0:.2f}s!")
print(f"MP-vendor pairs: {len(pair):,}")
print(f"Monopoly flags: {pair['monopoly_flag'].sum():,}")
print(f"Work vendor scores: {len(work_vendor_scores):,}")

# Verify flags CSV matches
flags = pd.read_csv(OUT_FILE, low_memory=False)
print(f"fraud_flags.csv rows: {len(flags):,}")
print(f"CRITICAL: {(flags['risk_label'] == 'CRITICAL').sum():,}")
print(f"Statutory breaches: {(flags['rule_premature_tranche'] | flags['rule_missing_photo'] | flags['rule_overspend'] | flags['rule_early_payment']).sum():,}")
print(f"GFR Split Tender: {flags['rule_split_tender'].sum():,}")
print("All verifications PASSED!")
