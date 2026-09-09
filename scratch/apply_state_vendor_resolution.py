import os
import sys
import time
import pandas as pd
import numpy as np
from collections import defaultdict
from datetime import datetime

print("=" * 70)
print("  STEP 3: STATE-SCOPED VENDOR IDENTITY RESOLUTION")
print("=" * 70)

EXP_FILE = "data/processed/clean_expenditure.csv"
SAN_FILE = "data/processed/clean_sanctioned.csv"
FLAGS_FILE = "data/processed/fraud_flags.csv"
ALIAS_CACHE_FILE = "data/processed/vendor_alias_map.csv"

exp = pd.read_csv(EXP_FILE, low_memory=False)
san = pd.read_csv(SAN_FILE, low_memory=False)
flags = pd.read_csv(FLAGS_FILE, low_memory=False)

print(f"Loaded {len(exp):,} expenditure rows, {len(flags):,} fraud flags rows.")

# Clean strings
exp_clean = exp.dropna(subset=["vendor_name", "state"]).copy()
exp_clean["vendor_name"] = exp_clean["vendor_name"].astype(str).str.strip()
exp_clean["state"] = exp_clean["state"].astype(str).str.strip()

all_unique_vendors = sorted(exp_clean["vendor_name"].unique())
print(f"Unique vendor strings nationally: {len(all_unique_vendors):,}")

alias_df = None
if os.path.exists(ALIAS_CACHE_FILE):
    print(f"Loading existing alias cache from {ALIAS_CACHE_FILE}...")
    alias_df = pd.read_csv(ALIAS_CACHE_FILE)
    print(f"Loaded {len(alias_df):,} cached vendor mappings.")
else:
    print("Computing state-scoped SentenceTransformer embeddings...")
    from sentence_transformers import SentenceTransformer
    from sklearn.neighbors import NearestNeighbors
    
    t0 = time.time()
    model = SentenceTransformer("all-MiniLM-L6-v2")
    global_embeddings = model.encode(
        all_unique_vendors,
        batch_size=512,
        show_progress_bar=False,
        normalize_embeddings=True
    )
    vendor_idx_map = {v: idx for idx, v in enumerate(all_unique_vendors)}
    
    VENDOR_SIMILARITY_THRESHOLD = 0.82
    euc_threshold = np.sqrt(2.0 * (1.0 - VENDOR_SIMILARITY_THRESHOLD))
    
    state_groups = exp_clean.groupby("state")["vendor_name"].unique()
    alias_rows = []
    total_aliases = 0
    total_clusters = 0
    
    for st_name, st_vendors in state_groups.items():
        st_vendors = list(st_vendors)
        n_st = len(st_vendors)
        if n_st <= 1:
            for v in st_vendors:
                alias_rows.append({"state": st_name, "vendor_name": v, "canonical_vendor": v})
            total_clusters += n_st
            continue
            
        st_indices = [vendor_idx_map[v] for v in st_vendors]
        st_embeds = global_embeddings[st_indices]
        
        k = min(15, n_st - 1)
        nbrs = NearestNeighbors(n_neighbors=k, metric="euclidean", algorithm="ball_tree")
        nbrs.fit(st_embeds)
        distances, indices = nbrs.kneighbors(st_embeds)
        
        # Union find within state
        parent = list(range(n_st))
        rank = [0] * n_st
        
        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x
            
        def union(a, b):
            ra, rb = find(a), find(b)
            if ra == rb: return
            if rank[ra] < rank[rb]:
                ra, rb = rb, ra
            parent[rb] = ra
            if rank[ra] == rank[rb]:
                rank[ra] += 1
                
        for i, (dists, idxs) in enumerate(zip(distances, indices)):
            for d, j in zip(dists, idxs):
                if i != j and d <= euc_threshold:
                    union(i, j)
                    
        clusters = defaultdict(list)
        for idx, vendor in enumerate(st_vendors):
            clusters[find(idx)].append(vendor)
            
        for members in clusters.values():
            canonical = max(members, key=len)
            for v in members:
                alias_rows.append({"state": st_name, "vendor_name": v, "canonical_vendor": canonical})
                
        total_clusters += len(clusters)
        total_aliases += (n_st - len(clusters))
        
    print(f"Clustering complete in {time.time()-t0:.2f}s!")
    print(f"Total state-vendor clusters: {total_clusters:,}, total aliases resolved: {total_aliases:,}")
    alias_df = pd.DataFrame(alias_rows)
    alias_df.to_csv(ALIAS_CACHE_FILE, index=False, encoding="utf-8-sig")
    print(f"Saved cache to {ALIAS_CACHE_FILE}")

# Map canonical vendor to exp
exp_scored = exp.copy()
exp_scored["vendor_name_clean"] = exp_scored["vendor_name"].astype(str).str.strip()
exp_scored["state_clean"] = exp_scored["state"].astype(str).str.strip()

exp_scored = exp_scored.merge(
    alias_df.rename(columns={"state": "state_clean", "vendor_name": "vendor_name_clean"}),
    on=["state_clean", "vendor_name_clean"],
    how="left"
)
exp_scored["canonical_vendor"] = exp_scored["canonical_vendor"].fillna(exp_scored["vendor_name"])

# Known govt agency regex
import re
GOVT_VENDOR_PATTERNS = [
    r'\bzp\b', r'\bzila\s+parishad\b', r'\bgram\s+panchayat\b', r'\bgp\b',
    r'\bpwd\b', r'\bpublic\s+works\b', r'\bcpwd\b', r'\brwd\b',
    r'\bmunicipal\b', r'\bnagar\s+nigam\b', r'\bnagar\s+palika\b', r'\bnagar\s+parishad\b',
    r'\bblock\s+development\b', r'\bbdo\b', r'\bdrda\b',
    r'\bdistrict\s+rural\b', r'\bdistrict\s+magistrate\b', r'\bcollector\b',
    r'\bdeputy\s+commissioner\b', r'\bexecutive\s+engineer\b', r'\bee\b',
    r'\bassistant\s+engineer\b', r'\bae\b', r'\bjunior\s+engineer\b', r'\bje\b',
    r'\bforest\s+department\b', r'\birrigation\b', r'\bwater\s+board\b',
    r'\bjal\s+nigam\b', r'\bjal\s+sansthan\b', r'\bphd\b', r'\bphed\b',
    r'\bdepartment\b', r'\bdept\b', r'\bgovt\b', r'\bgovernment\b',
    r'\bup\s+rajkiya\b', r'\bnirman\s+nigam\b', r'\bbridge\s+corporation\b',
    r'\bhousing\s+board\b', r'\bdevelopment\s+authority\b', r'\bda\b',
    r'\bsociety\b', r'\bsamiti\b', r'\bpanchayat\s+samiti\b',
    r'\bproject\s+director\b', r'\bmission\s+director\b',
    r'\bdivisional\s+forest\b', r'\bdfo\b',
]
def is_govt_vendor(v):
    name = str(v).lower()
    return any(re.search(pat, name) for pat in GOVT_VENDOR_PATTERNS)

# Re-calculate Model 2 metrics
MONOPOLY_THRESHOLD = 0.50
MIN_MONOPOLY_WORKS = 5
MIN_PAIR_SPEND = 500_000

mp_total = exp_scored.groupby("mp_name")["fund_disbursed"].sum().reset_index()
mp_total.columns = ["mp_name", "mp_total_spend"]

mp_counts = exp_scored.groupby("mp_name")["work_id"].nunique().reset_index()
mp_counts.columns = ["mp_name", "mp_work_count"]

pair = exp_scored.groupby(["mp_name", "canonical_vendor"], as_index=False).agg(
    pair_spend=("fund_disbursed", "sum"),
    contract_count=("work_id", "nunique"),
    alias_names=("vendor_name", lambda s: " | ".join(sorted(s.dropna().unique()[:5]))),
)
pair = pair.merge(mp_total, on="mp_name", how="left")
pair = pair.merge(mp_counts, on="mp_name", how="left")

pair["vendor_concentration"] = pair["pair_spend"] / pair["mp_total_spend"].replace(0, np.nan)
mn, mx = pair["vendor_concentration"].min(), pair["vendor_concentration"].max()
pair["vendor_score"] = (pair["vendor_concentration"] - mn) / (mx - mn) * 100 if mx != mn else 0

pair["is_govt_vendor"] = pair["canonical_vendor"].apply(is_govt_vendor)
pair["monopoly_flag"] = (
    (pair["vendor_concentration"] >= MONOPOLY_THRESHOLD) &
    (pair["mp_work_count"] >= MIN_MONOPOLY_WORKS) &
    (pair["pair_spend"] >= MIN_PAIR_SPEND) &
    (~pair["is_govt_vendor"])
)

def build_m2_reason(row):
    if not row["monopoly_flag"]:
        return ""
    aliases = row["alias_names"]
    alias_note = f" [aliases detected: {aliases}]" if " | " in aliases else ""
    return (
        f"Vendor '{row['canonical_vendor']}'{alias_note} received "
        f"{row['vendor_concentration']*100:.1f}% of MP's total spend "
        f"({row['contract_count']} contracts, Rs.{row['pair_spend']:,.0f})"
    )
pair["m2_reason"] = pair.apply(build_m2_reason, axis=1)

print(f"Total MP-Vendor pairs: {len(pair):,}")
print(f"Monopoly flags (private contractors): {pair['monopoly_flag'].sum():,}")

# Join to works
work_vendor_join = exp_scored[["work_id", "mp_name", "canonical_vendor"]].merge(
    pair[["mp_name", "canonical_vendor", "vendor_concentration", "vendor_score", "monopoly_flag", "alias_names", "m2_reason"]],
    on=["mp_name", "canonical_vendor"],
    how="left"
)
top_work_vendor = (
    work_vendor_join.sort_values("vendor_concentration", ascending=False)
    .groupby("work_id", as_index=False)
    .first()
)

print(f"Works mapped with vendor scores: {len(top_work_vendor):,}")
print(f"Works flagged with monopoly vendor: {top_work_vendor['monopoly_flag'].sum():,}")

# Update fraud_flags
v_map = top_work_vendor.set_index("work_id")
for col, target_col in [
    ("canonical_vendor", "work_top_vendor"),
    ("vendor_concentration", "work_vendor_concentration"),
    ("vendor_score", "work_vendor_score"),
    ("monopoly_flag", "work_vendor_flag"),
    ("alias_names", "work_vendor_aliases"),
    ("m2_reason", "m2_reason")
]:
    if target_col in flags.columns:
        flags[target_col] = flags["work_id"].map(v_map[col]).fillna(flags[target_col])

# Recalculate vendor percentile rank
non_zero = flags["work_vendor_score"] > 0
flags["vendor_score_pct"] = 0.0
if non_zero.any():
    flags.loc[non_zero, "vendor_score_pct"] = flags.loc[non_zero, "work_vendor_score"].rank(pct=True) * 100

# Recompute composite score
W_M1, W_M2, W_M3, W_M4 = 0.25, 0.25, 0.35, 0.15
flags["risk_score_ml"] = (
    W_M1 * flags["anomaly_score_pct"].fillna(0) +
    W_M2 * flags["vendor_score_pct"].fillna(0) +
    W_M3 * flags["compliance_score_pct"].fillna(0) +
    W_M4 * flags["timeline_score_pct"].fillna(0)
)

has_hard_violation = (
    flags["rule_premature_tranche"].fillna(False).astype(bool) |
    flags["rule_missing_photo"].fillna(False).astype(bool) |
    flags["rule_overspend"].fillna(False).astype(bool) |
    flags["rule_early_payment"].fillna(False).astype(bool)
)

flags["risk_score"] = np.where(
    has_hard_violation,
    np.maximum(85.0, flags["risk_score_ml"]),
    flags["risk_score_ml"]
).round(1)

# Apply two-tier labels
p_high = np.percentile(flags["risk_score_ml"], 90.0)
p_medium = np.percentile(flags["risk_score_ml"], 70.0)

def assign_label(row):
    if row["has_hard_violation"] or row["risk_score"] >= 85.0:
        return "CRITICAL"
    s = row["risk_score"]
    if s >= p_high:
        return "HIGH"
    elif s >= p_medium:
        return "MEDIUM"
    return "LOW"

flags["has_hard_violation"] = has_hard_violation
flags["risk_label"] = flags.apply(assign_label, axis=1)
flags.drop(columns=["has_hard_violation", "risk_score_ml"], inplace=True)

flags.to_csv(FLAGS_FILE, index=False, encoding="utf-8-sig")
print(f"Successfully saved updated flags to {FLAGS_FILE}!")
print("\nFinal Risk Distribution:")
print(flags["risk_label"].value_counts())
print("\nStatutory Breach Breakdown:")
print(f"Total statutory breaches: {has_hard_violation.sum():,}")
print(f"Statutory breaches labeled CRITICAL: {(flags.loc[has_hard_violation, 'risk_label'] == 'CRITICAL').sum():,} (100.0%)")
print(f"GFR Split Tender flagged: {flags['rule_split_tender'].sum():,}")
