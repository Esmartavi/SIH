"""
Benchmark Runner: Downloads first 50 MPLADS completion documents,
runs AI forensics across all of them, and precisely measures the execution time.
"""

import os
import sys
import time
import json
import subprocess

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

VENV_PY  = os.path.join(ROOT_DIR, "venv", "Scripts", "python.exe")
IMG_DIR  = os.path.join(ROOT_DIR, "images")
EXT_DIR  = os.path.join(IMG_DIR, "extracted")

print("=" * 70)
print("  🚀 MPLADS 50-DOCUMENT INGESTION & FORENSICS BENCHMARK")
print("=" * 70)

# ── Step 1: Clean previous extracted cache for a pure benchmark ───────────────
if os.path.exists(EXT_DIR):
    for f in os.listdir(EXT_DIR):
        try:
            os.remove(os.path.join(EXT_DIR, f))
        except Exception:
            pass

# ── Step 2: Bulk Download 50 Works ───────────────────────────────────────────
from forensics.bulk_pdf_downloader import bulk_download

print(f"\n[PHASE 1] Starting Multi-Threaded Bulk Download of First 50 Works...")
t_dl_start = time.perf_counter()

dl_result = bulk_download(limit=50, max_workers=8, output_dir=IMG_DIR)

t_dl_end = time.perf_counter()
dl_elapsed = t_dl_end - t_dl_start

# Compute total downloaded volume
total_bytes = 0
file_count = 0
for f in os.listdir(IMG_DIR):
    fp = os.path.join(IMG_DIR, f)
    if os.path.isfile(fp) and (f.endswith(".pdf") or f.endswith(".jpg") or f.endswith(".png")):
        file_count += 1
        total_bytes += os.path.getsize(fp)

total_mb = total_bytes / (1024 * 1024)

print("\n" + "-" * 70)
print(f"  📥 DOWNLOAD PHASE COMPLETED")
print(f"  • Files Downloaded / Ingested : {file_count} files")
print(f"  • Total Downloaded Data Size : {total_mb:.2f} MB")
print(f"  • Download Elapsed Time      : {dl_elapsed:.2f} seconds ({dl_elapsed/60:.2f} minutes)")
print(f"  • Average Download Speed     : {file_count/dl_elapsed:.2f} files/sec ({total_mb/dl_elapsed:.2f} MB/s)")
print("-" * 70)

# ── Step 3: Run AI Document & Image Forensics ─────────────────────────────────
print(f"\n[PHASE 2] Executing AI Forensics Pipeline (OCR, GPS Watermarks & pHash)...")
t_fc_start = time.perf_counter()

forensics_script = os.path.join(ROOT_DIR, "forensics", "image_forensics.py")
fc_proc = subprocess.run(
    [VENV_PY, forensics_script],
    cwd=ROOT_DIR,
    capture_output=True,
    text=True
)

t_fc_end = time.perf_counter()
fc_elapsed = t_fc_end - t_fc_start

print(fc_proc.stdout)
if fc_proc.stderr:
    print("Stderr:", fc_proc.stderr[-300:])

# ── Step 4: Parse Summary Report ─────────────────────────────────────────────
summary_path = os.path.join(ROOT_DIR, "forensics", "forensics_summary.json")
summary_stats = {}
if os.path.exists(summary_path):
    with open(summary_path, "r", encoding="utf-8") as f:
        summary_data = json.load(f)
        summary_stats = summary_data.get("stats", {})

total_elapsed = dl_elapsed + fc_elapsed

print("\n" + "=" * 70)
print("  🏁 FINAL BENCHMARK PERFORMANCE REPORT")
print("=" * 70)
print(f"  1. DOWNLOAD DURATION   : {dl_elapsed:.2f}s ({dl_elapsed/60:.2f}m) for {file_count} documents ({total_mb:.2f} MB)")
print(f"  2. FORENSICS DURATION  : {fc_elapsed:.2f}s ({fc_elapsed/60:.2f}m)")
print(f"  3. TOTAL PIPELINE TIME : {total_elapsed:.2f}s ({total_elapsed/60:.2f}m)")
print(f"  ------------------------------------------------------------------")
print(f"  📊 FORENSIC AUDIT METRICS:")
print(f"  • Documents Analyzed              : {summary_stats.get('total_documents_scanned', file_count)}")
print(f"  • High-Res Evidence Photos Extracted : {summary_stats.get('total_evidence_photos_extracted', 0)}")
print(f"  • Duplicate / Recycled Photo Pairs   : {summary_stats.get('duplicate_photo_pairs', 0)}")
print(f"  • Cross-Scheme Irregularity Alerts   : {summary_stats.get('cross_scheme_alerts', 0)}")
print(f"  • Verified Geo-Tagged Works          : {summary_stats.get('verified_geotagged_works', 0)}")
print(f"  • Missing Photo Evidence Flagged    : {summary_stats.get('missing_photo_works', 0)}")
print("=" * 70)
