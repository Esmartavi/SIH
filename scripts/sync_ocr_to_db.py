"""
BHARAT-DRISHTI // Sync Scanned Document OCR Forensics into Supabase PostgreSQL
=============================================================================
Creates and populates the `document_ocr_audits` table in Supabase PostgreSQL
and updates `works.ai_audit_verdict` with structured neural OCR findings.
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import execute_values, Json
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("[!] DATABASE_URL not found in .env")
    sys.exit(1)

print("[*] Connecting to Supabase PostgreSQL...")
conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

# 1. Create document_ocr_audits table
print("[*] Ensuring `document_ocr_audits` table exists in Supabase...")
cur.execute("""
CREATE TABLE IF NOT EXISTS document_ocr_audits (
    audit_id VARCHAR(100) PRIMARY KEY,
    work_id VARCHAR(100),
    canonical_work_id VARCHAR(100),
    mp_name VARCHAR(150),
    pdf_filename VARCHAR(255) NOT NULL,
    document_classification VARCHAR(100),
    portal_disbursed_amount NUMERIC(15, 2),
    paper_approved_amount NUMERIC(15, 2),
    unaccounted_discrepancy NUMERIC(15, 2),
    extracted_vendor_name VARCHAR(255),
    extracted_vendor_code VARCHAR(50),
    bank_account_no VARCHAR(50),
    bank_utr_number VARCHAR(50),
    paper_location VARCHAR(150),
    portal_location TEXT,
    scheme_type VARCHAR(100),
    has_money_mismatch BOOLEAN DEFAULT FALSE,
    has_cross_scheme_fraud BOOLEAN DEFAULT FALSE,
    has_unreported_vendor BOOLEAN DEFAULT FALSE,
    has_location_mismatch BOOLEAN DEFAULT FALSE,
    findings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ocr_work ON document_ocr_audits(work_id);
CREATE INDEX IF NOT EXISTS idx_ocr_pdf ON document_ocr_audits(pdf_filename);
""")
print("  [OK] Table `document_ocr_audits` verified in Supabase.")

# 2. Read forensics/ocr_flags.json
ocr_file = os.path.join("forensics", "ocr_flags.json")
if not os.path.exists(ocr_file):
    print("[!] forensics/ocr_flags.json not found.")
    sys.exit(1)

with open(ocr_file, "r", encoding="utf-8") as f:
    verdicts = json.load(f)

print(f"[*] Parsing {len(verdicts)} OCR document verdicts...")

rows = []
for idx, v in enumerate(verdicts):
    audit_id = f"OCR_{idx+1:05d}"
    p_rec = v.get("portal_record", {})
    paper = v.get("paper_extracted", {})
    findings = v.get("findings", [])
    
    wid = p_rec.get("work_id") or "UNKNOWN"
    canon_wid = p_rec.get("canonical_work_id") or wid
    mp = p_rec.get("mp_name") or v.get("mp_name") or "Unknown MP"
    pdf = v.get("pdf_file", "")
    doc_class = v.get("document_classification", "Completion Certificate")
    portal_amt = p_rec.get("disbursed_amount") or 0.0
    paper_amt = paper.get("approved_amount")
    
    unaccounted = (portal_amt - paper_amt) if (paper_amt and portal_amt) else 0.0
    v_name = paper.get("vendor_name")
    v_code = paper.get("vendor_code")
    acc_no = paper.get("account_no")
    utr_no = paper.get("utr_number")
    loc_paper = paper.get("location")
    loc_portal = p_rec.get("work_description")
    scheme = paper.get("scheme_type") or v.get("scheme_type") or "MPLADS"
    
    mismatch = any(f.get("code") == "PORTAL_PAPER_AMOUNT_MISMATCH" for f in findings)
    cross_scheme = any(f.get("code") == "CROSS_SCHEME_FRAUD" for f in findings)
    unreported_vendor = any(f.get("code") == "UNREPORTED_VENDOR_DISCREPANCY" for f in findings)
    loc_mismatch = any(f.get("code") == "LOCATION_MISMATCH" for f in findings)
    
    rows.append((
        audit_id,
        wid,
        canon_wid,
        mp,
        pdf,
        doc_class,
        portal_amt,
        paper_amt,
        unaccounted,
        v_name,
        v_code,
        acc_no,
        utr_no,
        loc_paper,
        loc_portal,
        scheme,
        mismatch,
        cross_scheme,
        unreported_vendor,
        loc_mismatch,
        Json(findings)
    ))

execute_values(cur, """
    INSERT INTO document_ocr_audits (
        audit_id, work_id, canonical_work_id, mp_name, pdf_filename,
        document_classification, portal_disbursed_amount, paper_approved_amount,
        unaccounted_discrepancy, extracted_vendor_name, extracted_vendor_code,
        bank_account_no, bank_utr_number, paper_location, portal_location,
        scheme_type, has_money_mismatch, has_cross_scheme_fraud,
        has_unreported_vendor, has_location_mismatch, findings
    ) VALUES %s
    ON CONFLICT (audit_id) DO UPDATE SET
        portal_disbursed_amount = EXCLUDED.portal_disbursed_amount,
        paper_approved_amount = EXCLUDED.paper_approved_amount,
        unaccounted_discrepancy = EXCLUDED.unaccounted_discrepancy,
        extracted_vendor_name = EXCLUDED.extracted_vendor_name,
        extracted_vendor_code = EXCLUDED.extracted_vendor_code,
        bank_account_no = EXCLUDED.bank_account_no,
        bank_utr_number = EXCLUDED.bank_utr_number,
        paper_location = EXCLUDED.paper_location,
        scheme_type = EXCLUDED.scheme_type,
        has_cross_scheme_fraud = EXCLUDED.has_cross_scheme_fraud,
        has_money_mismatch = EXCLUDED.has_money_mismatch,
        has_unreported_vendor = EXCLUDED.has_unreported_vendor,
        has_location_mismatch = EXCLUDED.has_location_mismatch,
        findings = EXCLUDED.findings;
""", rows)

print(f"  [OK] Successfully synced {len(rows)} Scanned Document OCR Audits into Supabase!")

# 3. Update works table ai_audit_verdict & risk_score for matching projects
updated_works = 0
critical_escalations = 0

for r in rows:
    wid = r[1]
    canon_wid = r[2]
    cross_scheme = r[17]
    findings = r[20]
    
    if cross_scheme:
        # Action 3: Adjusts the Scheme Risk Score
        # The work's composite risk_score is immediately driven to 100.0 (CRITICAL).
        # It moves to the very top of the Priority Action Radar for CAG and vigilance inspectors.
        cur.execute("""
            UPDATE works 
            SET risk_score = 100.0,
                risk_tier = 'CRITICAL',
                ai_audit_verdict = %s
            WHERE work_id = %s OR work_id = %s;
        """, (findings, canon_wid, wid))
        if cur.rowcount > 0:
            updated_works += cur.rowcount
            critical_escalations += cur.rowcount
            print(f"  [CRITICAL ACTION 3 TRIGGERED] Driven Work {canon_wid} (#{wid}) risk_score to 100.00 (CRITICAL) due to Cross-Scheme Double-Dipping scam!")
    elif findings:
        cur.execute("""
            UPDATE works 
            SET ai_audit_verdict = %s
            WHERE work_id = %s OR work_id = %s;
        """, (findings, canon_wid, wid))
        if cur.rowcount > 0:
            updated_works += cur.rowcount

print(f"  [OK] Updated {updated_works} rows in `works` table ({critical_escalations} escalated to 100.0 CRITICAL) with live OCR audit verdicts!")

conn.close()
print("[*] Supabase Database sync complete!")
