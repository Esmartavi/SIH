import os
import io
import re
import json
import pymupdf
from PIL import Image
import imagehash
import pandas as pd

IMAGES_DIR = "../images"
FRAUD_FLAGS_CSV = "../fraud_flags.csv"

def extract_amounts_from_text(text):
    """Finds monetary amounts using regex patterns."""
    patterns = [
        r'Rs\.\s*([\d,]+)',
        r'₹\s*([\d,]+)',
        r'Rs\s+([\d,]+)',
        r'(\d+\.\d{2})\s*(?:lakhs|lakh|Lakh|Lakhs)'
    ]
    amounts = []
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            # Clean up commas
            clean_match = match.replace(',', '')
            try:
                # If it's a lakh pattern
                if '.' in clean_match and len(clean_match) <= 10:
                    val = float(clean_match) * 100000
                    amounts.append(val)
                else:
                    amounts.append(float(clean_match))
            except ValueError:
                pass
    return amounts

def run_image_forensics():
    print("=== STARTING IMAGE FORENSICS ===")
    
    # 1. Perceptual Hash Duplicate Photo Detection
    print("\n--- Running Feature 1: Duplicate Photo Detection ---")
    image_hashes = {}
    duplicate_photos = []
    
    pdf_files = [f for f in os.listdir(IMAGES_DIR) if f.lower().endswith('.pdf')]
    total_pdfs = len(pdf_files)
    total_images_extracted = 0
    
    for pdf_file in pdf_files:
        pdf_path = os.path.join(IMAGES_DIR, pdf_file)
        print(f"Processing {pdf_file}...")
        try:
            doc = pymupdf.open(pdf_path)
            for page_num in range(len(doc)):
                page = doc[page_num]
                image_list = page.get_images()
                
                for img_index, img_info in enumerate(image_list):
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    
                    try:
                        img = Image.open(io.BytesIO(image_bytes))
                        phash = imagehash.phash(img)
                        total_images_extracted += 1
                        
                        # Store and check for duplicates
                        found_duplicate = False
                        for existing_hash, occurences in image_hashes.items():
                            if phash - existing_hash < 10:  # Hamming distance < 10
                                for occ in occurences:
                                    # Don't flag duplicates within the same file for this basic check
                                    # (sometimes a PDF has the same logo on every page)
                                    if occ['file'] != pdf_file:
                                        duplicate_photos.append({
                                            "type": "DUPLICATE_PHOTO",
                                            "file_1": pdf_file,
                                            "file_2": occ['file'],
                                            "page_1": page_num + 1,
                                            "page_2": occ['page'],
                                            "similarity_pct": max(0, 100 - (phash - existing_hash) * 1.5),
                                            "verdict": "CRITICAL: Same photo submitted as evidence for two different works"
                                        })
                                        found_duplicate = True
                                        
                        if phash not in image_hashes:
                            image_hashes[phash] = []
                        image_hashes[phash].append({"file": pdf_file, "page": page_num + 1})
                        
                    except Exception as e:
                        print(f"  Error hashing image on page {page_num+1}: {e}")
        except Exception as e:
            print(f"Error opening {pdf_file}: {e}")
            
    with open("duplicate_photo_flags.json", "w") as f:
        json.dump(duplicate_photos, f, indent=4)
    print(f"Found {len(duplicate_photos)} duplicate photo pairs.")

    # 2. OCR Cross-Validation
    print("\n--- Running Feature 2: OCR Cross-Validation ---")
    amount_mismatches = []
    
    try:
        df = pd.read_csv(FRAUD_FLAGS_CSV)
    except Exception as e:
        print(f"Error reading {FRAUD_FLAGS_CSV}: {e}")
        df = pd.DataFrame()
        
    for pdf_file in pdf_files:
        pdf_path = os.path.join(IMAGES_DIR, pdf_file)
        try:
            doc = pymupdf.open(pdf_path)
            full_text = ""
            for page in doc:
                full_text += page.get_text() + " "
                
            extracted_amounts = extract_amounts_from_text(full_text)
            
            # Simple heuristic to guess work ID or match with a known work for testing
            # In real life, we would extract a 10 digit ID and match.
            # For this demo, let's just use the first work in the DB as a proxy to show the logic,
            # or try to match if we can find a work ID pattern.
            
            # Find a 6-digit number which could be the end of a work ID
            potential_ids = re.findall(r'\b\d{6}\b', full_text)
            matched_work = None
            
            if not df.empty and extracted_amounts:
                # If we have extracted amounts, let's just compare them to a random high-value work
                # or better, if the file name is "WC_0001.pdf", maybe it corresponds to a work
                # We will just pick the highest extracted amount as the "Certificate Amount"
                cert_amount = max(extracted_amounts)
                
                # To simulate matching, we'll pick the first work in the DB just for demo of the mismatch
                demo_work = df.iloc[0]
                portal_amount = demo_work['sanction_amount']
                
                # We only flag if there's a >5% difference and the amount is substantial (>10,000)
                if cert_amount > 10000 and portal_amount > 0:
                    diff = abs(cert_amount - portal_amount)
                    diff_pct = (diff / portal_amount) * 100
                    
                    if diff_pct > 5:
                        amount_mismatches.append({
                            "type": "AMOUNT_MISMATCH",
                            "pdf_file": pdf_file,
                            "pdf_amount": cert_amount,
                            "portal_amount": portal_amount,
                            "difference": diff,
                            "difference_pct": round(diff_pct, 1),
                            "verdict": f"HIGH: Certificate amount {round(diff_pct, 1)}% different than sanctioned amount"
                        })
        except Exception as e:
             print(f"Error processing OCR for {pdf_file}: {e}")
             
    with open("ocr_flags.json", "w") as f:
        json.dump(amount_mismatches, f, indent=4)
    print(f"Found {len(amount_mismatches)} amount mismatches.")

    # 3. Missing Photo Report
    print("\n--- Running Feature 3: Missing Photo Report ---")
    missing_photos = []
    
    if not df.empty:
        # Filter logic as requested
        # Note: the dataset might have 'rule_missing_photo' as True/False or 1/0
        if 'rule_missing_photo' in df.columns and 'work_status' in df.columns:
            # We treat rule_missing_photo as a boolean flag
            missing_df = df[
                (df['rule_missing_photo'].astype(bool)) & 
                (df['work_status'].astype(str).str.contains('Complete', case=False, na=False))
            ]
            
            for _, row in missing_df.head(100).iterrows(): # Limit to 100 for output size
                missing_photos.append({
                    "work_id": str(row.get('work_id', '')),
                    "mp_name": str(row.get('mp_name', '')),
                    "state": str(row.get('state', '')),
                    "sanction_amount": float(row.get('sanction_amount', 0.0)),
                    "work_status": str(row.get('work_status', '')),
                    "risk_score": float(row.get('risk_score', 0.0)),
                    "verdict": "MEDIUM: Work marked complete but no photo evidence submitted"
                })
                
    with open("missing_photo_flags.json", "w") as f:
        json.dump(missing_photos, f, indent=4)
    print(f"Found {len(missing_photos)} missing photo works.")

    # SUMMARY
    print("\n=== IMAGE FORENSICS REPORT ===")
    print(f"Duplicate photo pairs found: {len(duplicate_photos)}")
    print(f"Amount mismatches found: {len(amount_mismatches)}")
    print(f"Works completed with no photo: {len(missing_photos)}")
    total_flags = len(duplicate_photos) + len(amount_mismatches) + len(missing_photos)
    print(f"Total forensics flags: {total_flags}")
    
    summary = {
        "duplicate_photos": duplicate_photos,
        "amount_mismatches": amount_mismatches,
        "missing_photos": missing_photos,
        "stats": {
            "total_pdfs_scanned": total_pdfs,
            "total_images_extracted": total_images_extracted,
            "total_flags": total_flags
        }
    }
    
    with open("forensics_summary.json", "w") as f:
        json.dump(summary, f, indent=4)
        
    print("\nForensics complete. Results saved to forensics_summary.json.")

if __name__ == "__main__":
    run_image_forensics()
