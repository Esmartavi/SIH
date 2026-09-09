import pandas as pd
import numpy as np
import time
from collections import defaultdict

print("Testing state-scoped vendor clustering...")
exp = pd.read_csv("data/processed/clean_expenditure.csv", low_memory=False)

exp_clean = exp.dropna(subset=["vendor_name", "state"]).copy()
exp_clean["vendor_name"] = exp_clean["vendor_name"].astype(str).str.strip()
exp_clean["state"] = exp_clean["state"].astype(str).str.strip()

all_unique_vendors = sorted(exp_clean["vendor_name"].unique())
n_total = len(all_unique_vendors)
print(f"Total unique vendor strings nationally: {n_total:,}")

t0 = time.time()
try:
    from sentence_transformers import SentenceTransformer
    from sklearn.neighbors import NearestNeighbors
    has_st = True
except ImportError:
    has_st = False

if has_st:
    print("Encoding all unique vendors with all-MiniLM-L6-v2...")
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
    alias_map = {} # (state, vendor_name) -> canonical_vendor
    
    total_aliases = 0
    total_clusters = 0
    
    for st_name, st_vendors in state_groups.items():
        st_vendors = list(st_vendors)
        n_st = len(st_vendors)
        if n_st <= 1:
            for v in st_vendors:
                alias_map[(st_name, v)] = v
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
                alias_map[(st_name, v)] = canonical
                
        total_clusters += len(clusters)
        total_aliases += (n_st - len(clusters))
        
    print(f"Completed in {time.time()-t0:.2f}s!")
    print(f"Total State-Vendor entities: {total_clusters:,}")
    print(f"Total Aliases detected within states: {total_aliases:,}")
    
    # Check that generic names in different states have different (state, v) mappings
    test_v = "SHARMA CONSTRUCTION"
    matches = [k for k in alias_map.keys() if test_v in k[1].upper()]
    print(f"\nSample matches for '{test_v}':")
    for k in matches[:6]:
        print(f"  State: {k[0]:15} | Raw: {k[1]:25} -> Canonical: {alias_map[k]}")
