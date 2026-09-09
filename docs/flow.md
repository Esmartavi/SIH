# MPLADS Fraud Detection - Architecture & Data Flow

This document outlines the end-to-end data pipeline and execution flow for the SIH26102 project.

## Phase 1: Data Cleaning & Standardization (`clean_data.py`)
**Goal:** Ingest raw, messy government CSVs and produce clean, reliable datasets with unified schemas and hard primary keys.

**Inputs (12 Raw CSVs):**
- Lok Sabha (LS) and Rajya Sabha (RS) splits for:
  - Expenditure
  - Works Sanctioned
  - Works Completed
  - Allocated Limits
  - Calamity Consent

**Key Processes:**
1. **Sanitization:** Strip ghost characters (`\xa0`), invisible tabs, and clean corrupted date/amount strings.
2. **Entity Resolution:** 
   - Extract `mp_number` from `work_id` to serve as a robust primary key across all files.
   - Clean MP names (strip trailing tenure/session brackets, fix casing).
3. **Derived Features:** 
   - Calculate `true_budget` (Allocated Amount minus Calamity Donations).
   - Map ordinal `progress_pct` from categorical `work_status`.
   - Flag `implausible_amount_flag` (amounts < ₹1,000).

**Outputs (4 Clean CSVs):**
- `clean_expenditure.csv` (109k rows)
- `clean_sanctioned.csv` (98k rows)
- `clean_completed.csv` (44k rows)
- `clean_allocated.csv` (774 rows)

---

## Phase 2: Fraud Modeling & Risk Scoring (`fraud_models.py`)
**Goal:** Process the clean datasets through domain-specific ML models and rules engines to assign a composite risk score to every public work.

**Inputs:** The 4 clean CSVs from Phase 1.

**The Models (Current Design based on feedback):**
1. **Model 1: Isolation Forest (Financial Anomalies)**
   - Unsupervised outlier detection looking at cost overrun ratios, expenditure vs. progress mismatch, and payment timing.
2. **Model 2: Vendor Concentration (Monopoly Detector)**
   - Flags vendors capturing ≥50% of a single MP's total expenditure (with minimum activity guards).
3. **Model 3: Compliance Rules Engine**
   - *Replacing the flawed Cookie-Cutter model.* 
   - Flags hard rule violations (e.g., implausible sanction amounts, spending exceeding `true_budget`).
4. **Model 4: Timeline Early Warning**
   - Flags projects stalled in pre-completion stages beyond 1 year (Warning) and 2 years (Critical).

**Model 5: Weighted Ensemble Scorer**
- Combines scores from Models 1-4 using fixed domain weights:
  - Financial Anomalies: 35%
  - Vendor Monopoly: 30%
  - Rules/Compliance: 20%
  - Timeline Delay: 15%
- Maps final score (0-100) to Risk Labels: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

**Outputs:**
- `fraud_flags.csv`: Every work scored with plain-English reasons for flags.
- `fraud_summary.txt`: High-level statistical summary and top 10 worst offenders.

---

## Phase 3: Presentation & Dashboard (Pending)
**Goal:** Surface the insights from `fraud_flags.csv` into an interactive, visually stunning UI for government auditors.
- View 1: National/State Heatmaps
- View 2: MP/Vendor Network Analysis
- View 3: Project Timeline tracking
- View 4: Risk Alerts Inbox
