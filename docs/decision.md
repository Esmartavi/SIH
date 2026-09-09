# MPLADS Fraud Detection - Design Decisions Log

This document records the critical technical, domain, and modeling decisions made during the development of the MPLADS fraud detection system for SIH26102.

## 1. Data Cleaning Decisions
*   **MP Name Cleaning:** Government data appends session/tenure data to names in brackets (e.g., `(18LS)` or `(2022-28)`). We use regex `\s*\(.*?\)\s*$` to strip *only* trailing brackets, preserving legitimate middle names like `(A)`.
*   **Primary Keys:** MP Names are too inconsistent across files. We chose to extract `mp_number` directly from the `work_id` string (e.g., `WS/MP18222/...`) to serve as the unshakeable cross-file join key.
*   **Calamity Donations:** The raw `allocated_amount` does not reflect the MP's actual spendable budget. We explicitly process Calamity Consent files to compute `true_budget = allocated_amount - total_calamity_donated`. Without this, the system would falsely flag MPs for overspending.
*   **Rajya Sabha Structural Differences:** RS data lacks a `Constituency` column but includes `Elected/Nominated`. Our pipeline dynamically preserves these structural differences rather than forcing a rigid, lossy schema.

## 2. Feature Engineering Decisions
*   **Progress Percentage Proxy:** The MPLADS portal provides a categorical `work_status` (e.g., "Vendor Identification", "Physical Inspection"), not a numeric completion percentage. We decided to map these explicitly to an ordinal scale (`0%`, `20%`, `50%`, `75%`, `100%`). This is a documented modeling assumption to enable regression/ratio math.
*   **Implausible Amounts Guard:** Real government data contains entries like `₹2.46` for total sanction amount. We created an `implausible_amount_flag` for amounts `< ₹1,000`. Instead of deleting these rows silently, we keep them to demo our ability to catch data-entry errors, while masking them from ratio calculations to prevent divide-by-zero explosions.

## 3. Modeling & Hyperparameter Decisions
*   **Isolation Forest Contamination (5%):** Without ground-truth fraud labels, we set `contamination=0.05`. This assumes the most extreme 5% of projects are anomalous. This provides a realistic, manageable queue for human auditors to review on Day 1.
*   **Vendor Monopoly Threshold (50%):** If a single vendor captures 50% of an MP's ₹5 Crore budget, it violates competitive tendering principles. 
    *   *Upcoming Fix based on review:* We must add a minimum activity guard (e.g., `n_payments >= 10`) to prevent newly elected MPs with only 1 or 2 payments from triggering a 100% false-positive monopoly flag.
*   **Timeline Thresholds (1 & 2 Years):** Statistical profiling showed 90% of works are sanctioned within 236 days. We set Warnings at 365 days and Critical alerts at 730 days, which perfectly aligns with the official government mandate to finish works in 18-24 months.
*   **Dropping the "Cookie-Cutter" Model:** The initial idea to flag identical repeated amounts (e.g., 5 projects costing exactly ₹40,000) was flawed. Government Schedule of Rates (SOR) dictates fixed unit costs for common items like solar street lights. Flagging repeats catches standard government billing, not fraud (causing a 65% false-positive rate).
    *   *Decision:* Drop Model 3 (Cookie-Cutter) and replace it entirely with the Compliance Rules Engine (Budget breaches, missing images, data-entry errors).
*   **Ensemble Weights:** 
    *   35% Financial Anomalies
    *   30% Vendor Concentration
    *   20% Rules/Compliance Violations (Replaces Cookie-Cutter)
    *   15% Timeline Delays
    *   *Rationale:* This explicitly weights *malice* (theft, monopolies) higher than bureaucratic *incompetence* (delays).
