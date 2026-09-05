"""
Image Forensics Module — MPLADS Fraud Detection System
Detects: duplicate photos, OCR amount mismatches, missing photo evidence
"""

import os
import io
import re
import json
import pymupdf
from PIL import Image
import imagehash
import pandas as pd

# ── Paths (all relative to THIS file's location) ───────────────────────────────
THIS_DIR       = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR       = os.path.dirname(THIS_DIR)
IMAGES_DIR     = os.path.join(ROOT_DIR, "images")
FRAUD_FLAGS_CSV = os.path.join(ROOT_DIR, "fraud_flags.csv")
OUT_DUPLICATES  = os.path.join(THIS_DIR, "duplicate_photo_flags.json")
OUT_OCR         = os.path.join(THIS_DIR, "ocr_flags.json")
OUT_MISSING     = os.path.join(THIS_DIR, "missing_photo_flags.json")
OUT_SUMMARY     = os.path.join(THIS_DIR, "forensics_summary.json")

# ── Work ID pattern used in MPLADS portal ──────────────────────────────────────
WORK_ID_PATTERN = re.compile(r'WS/MP\d+/\d{4}-\d{4}/\d+')

# ── Amount regex patterns ───────────────────────────────────────────────────────
AMOUNT_PATTERNS = [
    re.compile(r'Rs\.\s*([\d,]+)'),
    re.compile(r'₹\s*([\d,]+)'),
    re.compile(r'Rs\s+([\d,]+)'),
    re.compile(r'([\d,]+\.?\d*)\s*(?:lakhs?|Lakhs?)', re.IGNORECASE),
]


def extract_amounts_from_text(text: str) -> list:
    """Extract all monetary amounts from text. Returns list of float values in rupees."""
    amounts = []
    for pattern in AMOUNT_PATTERNS:
        for match in pattern.findall(text):
            clean = match.replace(',', '').strip()
            try:
                val = float(clean)
                # If matched the lakh pattern and value looks like lakhs (< 1000)
                if val < 1000 and 'lakh' in pattern.pattern.lower():
                    val = val * 100_000
                amounts.append(val)
            except ValueError:
                pass
    # Remove tiny values (less than 1000) that are likely page numbers, not amounts
    return [a for a in amounts if a >= 1000]


def extract_work_id_from_text(text: str) -> str | None:
    """Try to find a MPLADS work ID (e.g. WS/MP18230/2025-2026/161482) in PDF text."""
    match = WORK_ID_PATTERN.search(text)
    return match.group(0) if match else None


# ── Feature 1: Duplicate Photo Detection ───────────────────────────────────────
def detect_duplicate_photos(pdf_files: list) -> tuple[list, int]:
    """
    Compute perceptual hash for every embedded image in every PDF.
    Flag pairs with Hamming distance < 10 across DIFFERENT files.
    Returns (list of duplicate flags, total images extracted).
    """
    # Map: imagehash -> list of {"file", "page"} dicts
    hash_index: list[tuple] = []   # list of (phash, file, page)
    duplicate_photos = []
    total_images = 0

    for pdf_file in pdf_files:
        pdf_path = os.path.join(IMAGES_DIR, pdf_file)
        print(f"  Processing {pdf_file}...", end=" ")
        file_images = 0
        try:
            doc = pymupdf.open(pdf_path)
            for page_num in range(len(doc)):
                page = doc[page_num]
                for img_info in page.get_images():
                    xref = img_info[0]
                    try:
                        base_image = doc.extract_image(xref)
                        img = Image.open(io.BytesIO(base_image["image"]))
                        phash = imagehash.phash(img)
                        total_images += 1
                        file_images += 1

                        # Compare against all previously seen hashes
                        for (stored_hash, stored_file, stored_page) in hash_index:
                            distance = phash - stored_hash
                            if distance < 10 and stored_file != pdf_file:
                                similarity = round(max(0, 100 - distance * 1.5625), 1)
                                duplicate_photos.append({
                                    "type": "DUPLICATE_PHOTO",
                                    "file_1": pdf_file,
                                    "file_2": stored_file,
                                    "page_1": page_num + 1,
                                    "page_2": stored_page,
                                    "hamming_distance": int(distance),
                                    "similarity_pct": similarity,
                                    "verdict": (
                                        "CRITICAL: Same photo submitted as evidence "
                                        "for two different works"
                                    )
                                })

                        hash_index.append((phash, pdf_file, page_num + 1))

                    except Exception as e:
                        pass  # Skip unreadable images silently
        except Exception as e:
            print(f"\n  Error opening {pdf_file}: {e}")
            continue
        print(f"found {file_images} images.")

    return duplicate_photos, total_images


# ── Feature 2: OCR Cross-Validation ────────────────────────────────────────────
def ocr_cross_validate(pdf_files: list, df: pd.DataFrame) -> list:
    """
    Extract text from each PDF.
    Try to find a MPLADS work ID in the text.
    If found — look up the sanctioned amount from fraud_flags.csv and compare.
    If the PDF's extracted amount differs by > 5% — flag it.
    """
    amount_mismatches = []

    if df.empty:
        print("  Warning: fraud_flags.csv is empty — skipping OCR cross-validation.")
        return amount_mismatches

    # Build a fast lookup: work_id -> sanction_amount
    work_lookup = {}
    if 'work_id' in df.columns and 'sanction_amount' in df.columns:
        for _, row in df.iterrows():
            wid = str(row.get('work_id', '')).strip()
            amt = row.get('sanction_amount', None)
            if wid and amt and str(amt) not in ('', 'nan'):
                try:
                    work_lookup[wid] = float(amt)
                except ValueError:
                    pass

    for pdf_file in pdf_files:
        pdf_path = os.path.join(IMAGES_DIR, pdf_file)
        try:
            doc = pymupdf.open(pdf_path)
            full_text = " ".join(page.get_text() for page in doc)

            # Step 1: Try to extract a real work ID from the PDF
            work_id = extract_work_id_from_text(full_text)
            portal_amount = work_lookup.get(work_id) if work_id else None

            # Step 2: Extract amounts found in the PDF
            extracted_amounts = extract_amounts_from_text(full_text)
            if not extracted_amounts:
                continue

            cert_amount = max(extracted_amounts)  # Use the largest amount as cert value

            if portal_amount is not None:
                # Real match — compare against actual portal data
                diff = abs(cert_amount - portal_amount)
                diff_pct = (diff / portal_amount) * 100 if portal_amount > 0 else 0
                if diff_pct > 5:
                    amount_mismatches.append({
                        "type": "AMOUNT_MISMATCH",
                        "pdf_file": pdf_file,
                        "work_id_found": work_id,
                        "pdf_amount": cert_amount,
                        "portal_amount": portal_amount,
                        "difference": round(diff, 2),
                        "difference_pct": round(diff_pct, 1),
                        "match_type": "EXACT_WORK_ID",
                        "verdict": (
                            f"HIGH: Certificate amount ₹{cert_amount:,.0f} differs from "
                            f"portal sanctioned amount ₹{portal_amount:,.0f} "
                            f"by {round(diff_pct, 1)}%"
                        )
                    })
            else:
                # No work ID found in PDF — log as "unverifiable"
                # This itself is suspicious for an official completion certificate
                if work_id is None and cert_amount > 0:
                    amount_mismatches.append({
                        "type": "UNVERIFIABLE_CERTIFICATE",
                        "pdf_file": pdf_file,
                        "work_id_found": None,
                        "pdf_amount": cert_amount,
                        "portal_amount": None,
                        "difference": None,
                        "difference_pct": None,
                        "match_type": "NO_WORK_ID",
                        "verdict": (
                            f"MEDIUM: Certificate mentions ₹{cert_amount:,.0f} but "
                            f"no MPLADS Work ID found in document — cannot verify against portal"
                        )
                    })
        except Exception as e:
            print(f"  Error processing OCR for {pdf_file}: {e}")

    return amount_mismatches


# ── Feature 3: Missing Photo Report ────────────────────────────────────────────
def missing_photo_report(df: pd.DataFrame) -> list:
    """
    From fraud_flags.csv, find all works where:
    - rule_missing_photo is True/1, AND
    - work_status contains 'Complete'
    Returns full list — no artificial cap.
    """
    missing_photos = []
    if df.empty:
        return missing_photos

    required_cols = {'rule_missing_photo', 'work_status', 'work_id',
                     'mp_name', 'state', 'sanction_amount', 'risk_score'}
    if not required_cols.issubset(df.columns):
        print("  Warning: Some expected columns missing from fraud_flags.csv")

    missing_df = df[
        (df['rule_missing_photo'].astype(str).isin(['True', '1', 'true', 'TRUE'])) &
        (df['work_status'].astype(str).str.contains('Complet', case=False, na=False))
    ].copy()

    for _, row in missing_df.iterrows():
        try:
            amt = float(row.get('sanction_amount', 0) or 0)
            score = float(row.get('risk_score', 0) or 0)
        except (ValueError, TypeError):
            amt, score = 0.0, 0.0

        missing_photos.append({
            "work_id":        str(row.get('work_id', '')),
            "mp_name":        str(row.get('mp_name', '')),
            "state":          str(row.get('state', '')),
            "sanction_amount": amt,
            "work_status":    str(row.get('work_status', '')),
            "risk_score":     score,
            "verdict":        "MEDIUM: Work marked complete but no photo evidence submitted"
        })

    return missing_photos


# ── Main Entry Point ────────────────────────────────────────────────────────────
def run_image_forensics():
    print("=" * 60)
    print("  IMAGE FORENSICS — MPLADS Fraud Detection System")
    print("=" * 60)

    # Discover PDFs
    if not os.path.isdir(IMAGES_DIR):
        print(f"ERROR: images/ folder not found at {IMAGES_DIR}")
        return

    pdf_files = sorted(f for f in os.listdir(IMAGES_DIR) if f.lower().endswith('.pdf'))
    print(f"\nPDFs found: {len(pdf_files)}")
    for f in pdf_files:
        print(f"  - {f}")

    # Load CSV
    print(f"\nLoading {FRAUD_FLAGS_CSV}...")
    try:
        df = pd.read_csv(FRAUD_FLAGS_CSV, low_memory=False)
        print(f"  Loaded {len(df):,} rows.")
    except Exception as e:
        print(f"  Warning: Could not load CSV — {e}")
        df = pd.DataFrame()

    # Feature 1
    print("\n[1/3] Duplicate Photo Detection")
    duplicate_photos, total_images = detect_duplicate_photos(pdf_files)
    with open(OUT_DUPLICATES, "w") as f:
        json.dump(duplicate_photos, f, indent=2)
    print(f"  -> {len(duplicate_photos)} duplicate photo pair(s) found. "
          f"({total_images} images scanned)")

    # Feature 2
    print("\n[2/3] OCR Cross-Validation")
    amount_mismatches = ocr_cross_validate(pdf_files, df)
    with open(OUT_OCR, "w") as f:
        json.dump(amount_mismatches, f, indent=2)
    print(f"  -> {len(amount_mismatches)} certificate issue(s) found.")

    # Feature 3
    print("\n[3/3] Missing Photo Report")
    missing_photos = missing_photo_report(df)
    with open(OUT_MISSING, "w") as f:
        json.dump(missing_photos, f, indent=2)
    print(f"  -> {len(missing_photos):,} work(s) completed with no photo evidence.")

    # Summary
    total_flags = len(duplicate_photos) + len(amount_mismatches) + len(missing_photos)
    summary = {
        "duplicate_photos":  duplicate_photos,
        "amount_mismatches": amount_mismatches,
        "missing_photos":    missing_photos,
        "stats": {
            "total_pdfs_scanned":      len(pdf_files),
            "total_images_extracted":  total_images,
            "duplicate_photo_pairs":   len(duplicate_photos),
            "ocr_certificate_issues":  len(amount_mismatches),
            "missing_photo_works":     len(missing_photos),
            "total_flags":             total_flags,
        }
    }
    with open(OUT_SUMMARY, "w") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 60)
    print("  IMAGE FORENSICS REPORT")
    print("=" * 60)
    print(f"  PDFs scanned            : {len(pdf_files)}")
    print(f"  Images extracted        : {total_images}")
    print(f"  Duplicate photo pairs   : {len(duplicate_photos)}")
    print(f"  Certificate issues (OCR): {len(amount_mismatches)}")
    print(f"  Missing photo works     : {len(missing_photos):,}")
    print(f"  Total forensics flags   : {total_flags:,}")
    print("=" * 60)
    print(f"\nAll results saved to: {THIS_DIR}")


if __name__ == "__main__":
    run_image_forensics()
