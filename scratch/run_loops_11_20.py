import os

target_path = r"c:\Users\shash\OneDrive\Desktop\hack_heritage\remaining.md"

content = r"""
## ⚖️ PART 2: STATUTORY COMPLIANCE & DETERMINISTIC RULE ENGINES (LOOPS 11–20)

---

### 📍 [LOOP 11 / 50] ANALYSIS: Plan 3.2 Rule 1 — SC/ST Mandatory Area Quotas (MPLADS Guidelines 2023, Clause 3.2)

**1. Current Implementation Baseline (What We Have):**
- In `plan.md` Section 3.2, statutory checking flags MPs who allocate less than 15% of their total sanctioned funds to SC-inhabited areas or less than 7.5% to ST-inhabited areas.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **Two-Tier Risk Engine (Step 4):** A breach of Clause 3.2 sets the Tier 1 Hard Rule Floor override, elevating the work or MP risk score immediately to $\ge 85$ (`CRITICAL`).
- **Constituency Transparency Ledger (Screen 7):** Feeds the SC/ST Quota Adherence Gauge. If an MP is falsely flagged due to demographic constraints, it damages the credibility of the automated audit.
- **District Magistrate Workflow:** District Planning Officers use this gate to approve or hold recommended work proposals.

**3. Identified Gaps & Weaknesses:**
- **Census 2011 Demographic Reality Gap:** In certain constituencies (e.g. Lakshadweep has ~95% ST and ~0% SC; conversely, parts of Punjab/UP have <1% ST population), achieving 15% SC or 7.5% ST locally is demographically impossible. The current hardcoded rule creates false-positive non-compliance alerts for MPs representing demographically skewed constituencies without referencing the statutory **Inter-District Transfer Exemption (Clause 3.2.3)**.
- **Micro-Targeting Laundering:** Contractors label projects as `is_sc_area = true` on the portal while executing works in affluent non-SC hamlets.

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Demographically Normalized Quota Engine with Census 2011 Shapefile Cross-Validation:**
  Integrates constituency-level SC/ST census demographics. If local ST population < 7.5%, the system checks whether the MP utilized Clause 3.2.3 to transfer the balance to designated tribal districts in their state. Furthermore, cross-verifies work GPS coordinates against the Ministry of Tribal Affairs (MoTA) Tribal Village Registry to eliminate fraudulent SC/ST self-declarations.

**5. Deep Technical & Architectural Blueprint:**
- **Algorithmic Logic:**
  ```python
  def verify_sc_st_statutory_compliance(mp_id: str, census_data: dict, works_df: pd.DataFrame):
      sc_allocated = works_df[works_df['is_sc_area']]['sanction_amount'].sum()
      st_allocated = works_df[works_df['is_st_area']]['sanction_amount'].sum()
      total_allocated = works_df['sanction_amount'].sum()
      
      sc_ratio = sc_allocated / total_allocated if total_allocated > 0 else 0
      st_ratio = st_allocated / total_allocated if total_allocated > 0 else 0
      
      flags = []
      constituency_st_pop = census_data.get('st_population_pct', 0.0)
      if constituency_st_pop < 0.075 and st_ratio < 0.075:
          has_pool_transfer = check_state_tribal_pool_transfer(mp_id)
          if not has_pool_transfer:
              flags.append({
                  "rule": "CLAUSE_3.2.3_DEFICIT",
                  "detail": "ST population < 7.5% but no compensatory allocation in designated state tribal belt"
              })
      elif st_ratio < 0.075:
          flags.append({"rule": "HARD_ST_QUOTA_BREACH", "deficit_inr": (0.075 - st_ratio) * total_allocated})
          
      return flags
  ```
- **Auditor Dashboard Metric:** Visual progress ring showing "Effective vs Required SC/ST Quota Adherence" with demographic normalizer toggle.

---

### 📍 [LOOP 12 / 50] ANALYSIS: Plan 3.2 Rule 2 — 75% Tranche Utilization Gatekeeper (Clause 4.3)

**1. Current Implementation Baseline (What We Have):**
- Flags works where Tranche 2 is disbursed before Tranche 1 spent reaches at least 75% of Tranche 1 value.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **Database Dependency:** Depends directly on `expenditures.tranche_number` and `works.physical_progress_pct`. If either pipeline has misaligned mappings, the statutory gatekeeper produces false rejections.
- **Treasury Enforcement (Step 6):** When triggered, this flag automatically drives the `[Recommend Treasury Hold]` action button in the Case File Modal, drafting a notice to the District Magistrate to suspend upcoming payments.
- **National Macro Statistics:** In Screen 1, premature tranche releases constitute the single largest category of "At-Risk Public Funds" (₹382 Cr).

**3. Identified Gaps & Weaknesses:**
- **Multi-Tranche Compounding (Tranche 3 & 4 Gaps):** The current plan checks `has_tranche_2 and (tranche_1_spent / tranche_1_amount) < 0.75`. However, large infrastructure projects have 3 or 4 tranches. Under Clause 4.3, Tranche 3 requires **75% of cumulative disbursed funds (Tranches 1 + 2)** plus 100% physical inspection sign-off. The current logic only checks Tranche 1 vs 2, leaving subsequent tranches completely unmonitored.
- **Paper Utilization Certificate (UC) Delay:** Portal disbursement dates often precede the formal upload of the signed Utilization Certificate by the District Executive Engineer.

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Full-Lifecycle Cumulative Tranche Gatekeeper with Utilization Certificate Verification:**
  Enforces recursive compliance across all installments:
  $$\frac{\sum_{i=1}^{k-1} \text{Verified Spent}_i}{\sum_{i=1}^{k-1} \text{Disbursed}_i} \ge 0.75 \quad \forall k \ge 2$$
  Cross-checks whether statutory Form II (Utilization Certificate) was logged in the document repository prior to release of tranche $k$.

**5. Deep Technical & Architectural Blueprint:**
- **Recursive Audit Algorithm:**
  ```python
  def audit_cumulative_tranche_gate(work_id: str, tranches: list[dict]):
      cum_disbursed = 0.0
      cum_spent = 0.0
      violations = []
      
      for t in tranches:
          t_num = t['tranche_number']
          if t_num > 1:
              utilization_rate = (cum_spent / cum_disbursed) if cum_disbursed > 0 else 0
              if utilization_rate < 0.75:
                  violations.append({
                      "violation": f"PREMATURE_TRANCHE_{t_num}_RELEASE",
                      "utilization_rate": round(utilization_rate * 100, 2),
                      "required_rate": 75.0,
                      "unauthorized_release_amount": t['amount'],
                      "disbursed_date": t['disbursed_date']
                  })
          cum_disbursed += t['amount']
          cum_spent += t.get('verified_spent_at_release', 0.0)
          
      return violations
  ```

---

### 📍 [LOOP 13 / 50] ANALYSIS: Plan 3.2 Rule 3 — Milestone Stalling & Abandonment Trajectory (>180 Days @ 0%)

**1. Current Implementation Baseline (What We Have):**
- Flags works with `days_since_sanction > 180` and `physical_progress == 0.0` with active funds disbursed.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **Triage Queue Prioritization (Screen 2):** Stalled works with high disbursed amounts populate the top of the vigilance queue.
- **Isolation Forest Ingestion (Step 4):** Days elapsed without milestone movement is normalized into the payment velocity feature of Model 1.
- **District Performance Scorecard:** Accumulation of stalled works degrades the District Collector's administrative efficiency rating.

**3. Identified Gaps & Weaknesses:**
- **The "Token Progress" Fraud Loophole:** Contractors who wish to evade the 0% flag routinely update the portal status to `Sanction (20%)` or `Vendor Identification (40%)` without lifting a single shovel on the ground, thereby evading the `progress == 0.0` check.
- **Missing Escalation Penalty Calculation:** Inflation during stalled execution causes severe cost overruns. The current system does not quantify the financial damage caused by the delay.

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Dynamic Velocity Decay Engine & "Token Milestone" Fraud Detector:**
  Calculates the **Progress Velocity** ($\Delta \text{Progress} / \Delta \text{Days}$). If a work sits at 20% or 40% for more than 365 days while funds are locked in the implementing agency's account, it computes the **Cost Escalation Penalty** using CPWD Cost Inflation Index (CII) and triggers an `ABANDONMENT_INFLATION_LOSS` alert.

**5. Deep Technical & Architectural Blueprint:**
- **Formulas & Code:**
  ```python
  def evaluate_work_abandonment(work: dict):
      days_stalled = (pd.Timestamp.now() - pd.to_datetime(work['last_status_date'])).days
      if work['physical_progress_pct'] < 100.0 and days_stalled > 180:
          escalation_loss = work['expenditure_amount'] * 0.06 * (days_stalled / 365.0)
          return {
              "status": "CHRONICALLY_STALLED",
              "days_idle": days_stalled,
              "public_fund_decay_risk_inr": round(escalation_loss, 2),
              "statutory_recourse": "Issue Notice under Clause 4.8 for Fund Reversion to Nodal Account"
          }
      return {"status": "NORMAL"}
  ```

---

### 📍 [LOOP 14 / 50] ANALYSIS: Plan 3.2 Rule 4 — Capital Asset & Prohibited Expenditure Filter (Clause 2.3 & 3.12)

**1. Current Implementation Baseline (What We Have):**
- Flags works in `PROHIBITED_CATEGORIES` or identified as private trust grants.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **Two-Tier Risk Architecture:** Sets a Tier 1 Hard Floor $\ge 85$ (`CRITICAL`), locking the work into the immediate administrative review queue.
- **LLM Secretary Briefing (Step 6):** Cites Clause 2.3 & 3.12 in the plain-English executive summary generated for the Ministry Secretary.
- **CVC/CAG Dossier Generator:** Embeds statutory citations into the downloadable official PDF case report.

**3. Identified Gaps & Weaknesses:**
- **NLP Synonym Camouflage:** Corrupt proposals disguise prohibited assets using sanitized public infrastructure names (e.g. naming a private religious temple gate "Community Cultural Gateway" or buying office furniture under "Administrative Infrastructure Development"). Simple substring matching misses synonyms.
- **Consumable Asset Laundering:** MPLADS strictly bans movable consumables (ambulances, computers, generators) unless donated to government institutions with explicit logbooks.

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Zero-Shot Semantic Prohibited-Spend Classifier with Negative List Taxonomy:**
  Leverages a quantized DeBERTa-v3 model fine-tuned on the official MoSPI Negative List (Appendix-I of 2023 Guidelines: 34 prohibited work types, including private clubs, religious places, boundary walls of private schools, commercial societies).

**5. Deep Technical & Architectural Blueprint:**
- **Taxonomy Payload:**
  ```python
  PROHIBITED_NEGATIVE_LIST = [
      "commercial building", "office interior", "furniture", "air conditioner",
      "religious place", "temple", "mosque", "church", "gurudwara", "private trust",
      "society building", "club", "memorial statue", "naming after living person"
  ]

  def audit_prohibited_spend(work_title: str, description: str):
      full_text = f"{work_title} {description}".lower()
      matched = [neg for neg in PROHIBITED_NEGATIVE_LIST if neg in full_text]
      if matched:
          return {
              "violation": "STATUTORY_PROHIBITED_ASSET",
              "matched_keywords": matched,
              "clause": "MPLADS Guidelines 2023 Clause 2.3 & Appendix-I",
              "action": "Immediate Rejection of Administrative Sanction"
          }
      return {"violation": None}
  ```

---

### 📍 [LOOP 15 / 50] ANALYSIS: Single Nationalized Nodal Bank Account Compliance (Clause 3.14 & PFMS SNA)

**1. Current Implementation Baseline (What We Have):**
- Mentions Single Nationalized Bank Rule in plan diagram; basic account PII masking in table schemas.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **Database Vault Security:** Works alongside the DPDP Act 2023 masking layer. Account numbers are stored encrypted and displayed masked (`XXXX-XXXX-1234`).
- **Fraud Ring Identification (Model 3):** Two seemingly unrelated contractors sharing the same bank account number reveals a hidden syndicate shell network.
- **Case File Modal (Screen 5):** The Banking Tab shows verified account numbers vs OCR-extracted counterfoils.

**3. Identified Gaps & Weaknesses:**
- **Private & Cooperative Bank Parking:** Under 2023 Guidelines, all MPLADS funds must flow through a single designated Central Nodal Account (CNA) in a Nationalized Public Sector Bank (e.g. State Bank of India). In practice, funds are frequently parked in local district cooperative banks or private banks to illegally accrue unregulated interest or earn credit favors.
- **Missing IFSC Code Validator:** The current database does not ingest or parse bank IFSC codes from expenditure vouchers.

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **PFMS Nodal Account IFSC Forensic Filter:**
  Validates every disbursement account IFSC against the Reserve Bank of India (RBI) Nationalized Public Sector Bank Registry. If an account routes through a private bank, regional rural bank (RRB), or cooperative credit society, it generates an immediate `UNAUTHORIZED_BANK_PARKING` flag.

**5. Deep Technical & Architectural Blueprint:**
- **Verification Matrix:**
  ```python
  NATIONALIZED_IFSC_PREFIXES = ["SBIN", "PUNB", "BARB", "CBIN", "CNRB", "UBIN", "IOBA", "BKID", "MAHB", "PSIB"]

  def verify_bank_compliance(ifsc_code: str):
      if not ifsc_code or len(ifsc_code) < 4:
          return {"status": "MISSING_IFSC_AUDIT_WARNING"}
      prefix = ifsc_code[:4].upper()
      if prefix not in NATIONALIZED_IFSC_PREFIXES:
          return {
              "violation": "NON_NATIONALIZED_BANK_ROUTING",
              "ifsc": ifsc_code,
              "bank_prefix": prefix,
              "clause": "MPLADS Guidelines 2023 Clause 3.14",
              "risk": "Unauthorized fund diversion outside PFMS Central Nodal Agency oversight"
          }
      return {"status": "COMPLIANT"}
  ```

---

### 📍 [LOOP 16 / 50] ANALYSIS: Inter-State / Multi-District Work Sanction Violations (MP Geographical Rules)

**1. Current Implementation Baseline (What We Have):**
- Tracks MP state and constituency in table `mps`, but does not enforce constitutional jurisdiction rules between Lok Sabha and Rajya Sabha members.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **Constituency GIS War Room:** Cross-checks whether map points fall within the boundary polygon of the MP's constituency.
- **MP Integrity Rating:** Violations directly deduct points from the MP's composite integrity score (0–100 scale).

**3. Identified Gaps & Weaknesses:**
- **Jurisdictional Overreach:**
  - **Lok Sabha MPs** can *only* recommend works in their specific constituency (except up to ₹25 Lakh/yr for natural calamity outside).
  - **Rajya Sabha (Elected) MPs** can recommend works anywhere in their elected State.
  - **Nominated MPs** can recommend works anywhere across India.
  The current engine lacks the logic to detect when a Lok Sabha MP sanctions works in a neighboring MP's constituency!

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Constitutional Jurisdiction Rules Engine (Article 105 & Clause 2.1):**
  Cross-checks MP type (`LOK_SABHA`, `RAJYA_SABHA_ELECTED`, `RAJYA_SABHA_NOMINATED`) against work location. If a Lok Sabha MP sanctions a work outside their constituency border without an active MHA Calamity Earmark, it triggers a `TERRITORIAL_JURISDICTION_BREACH`.

**5. Deep Technical & Architectural Blueprint:**
- **Decision Engine:**
  ```python
  def validate_mp_jurisdiction(mp: dict, work_state: str, work_district: str, work_constituency: str):
      house = mp['house']
      if house == 'Lok Sabha':
          if work_constituency.lower() != mp['constituency'].lower():
              return {
                  "violation": "LOK_SABHA_EXTRATERRITORIAL_RECOMMENDATION",
                  "mp_constituency": mp['constituency'],
                  "work_constituency": work_constituency,
                  "clause": "Clause 2.1 — LS MPs restricted strictly to elected constituency"
              }
      elif house == 'Rajya Sabha' and not mp.get('is_nominated', False):
          if work_state.lower() != mp['state'].lower():
              return {
                  "violation": "RAJYA_SABHA_INTERSTATE_VIOLATION",
                  "mp_state": mp['state'],
                  "work_state": work_state,
                  "clause": "Clause 2.2 — RS MPs restricted strictly to elected state"
              }
      return {"status": "JURISDICTION_VALID"}
  ```

---

### 📍 [LOOP 17 / 50] ANALYSIS: Administrative Expenses & Implementing Agency Centage Limits (Clause 3.10)

**1. Current Implementation Baseline (What We Have):**
- Not currently modeled in `plan.md`.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **District Authority Audits:** Identifies which state implementing agencies (e.g. RWD, CPWD, NBCC) overcharge administrative supervision fees.
- **Financial Ledger Reconciliation:** Agency commission extraction directly depletes the MP's available physical works budget.

**3. Identified Gaps & Weaknesses:**
- **The 2% Centage Extraction Scam:** Under Clause 3.10, implementing agencies (e.g. State PWD, Zila Parishad) are entitled to an administrative charge/supervision fee capped strictly at **2% of the sanctioned cost**. In many districts, agencies siphon off 5% to 10% under vague accounting entries like "Preparation of Detailed Project Report (DPR)" or "Inspection Charges", violating the 2% statutory ceiling.

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Centage & Administrative Overhead Guard (Clause 3.10 Auditor):**
  Identifies and aggregates all non-construction payment vouchers linked to an implementing agency. If cumulative agency fees exceed 2.0% of the project sanction, it flags `EXCESS_CENTAGE_EXTRACTION`.

**5. Deep Technical & Architectural Blueprint:**
- **Formula & Logic:**
  ```python
  def audit_agency_centage(sanction_amount: float, administrative_expenditures: list[dict]):
      total_admin = sum(e['amount'] for e in administrative_expenditures if e.get('is_supervision_charge', False))
      centage_ratio = total_admin / sanction_amount if sanction_amount > 0 else 0
      if centage_ratio > 0.02:
          return {
              "violation": "ILLEGAL_CENTAGE_COMMISSION",
              "actual_pct": round(centage_ratio * 100, 2),
              "excess_amount_inr": round(total_admin - (0.02 * sanction_amount), 2),
              "clause": "MPLADS Guidelines 2023 Clause 3.10 (Strict 2% Cap)"
          }
      return {"status": "COMPLIANT"}
  ```

---

### 📍 [LOOP 18 / 50] ANALYSIS: Unspent Funds Rollover & Interest Accrual Tracking (Clause 4.7)

**1. Current Implementation Baseline (What We Have):**
- Static `unspent_balance` tracked in table `mps`.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **Executive War Room KPIs:** Feeds the "Public Money at Risk" counter card.
- **CVC/CAG Audit Findings:** Failure to remit interest to BharatKosh is routinely cited by the Comptroller and Auditor General as financial non-compliance.

**3. Identified Gaps & Weaknesses:**
- **Interest Siphoning Blindspot:** Under Clause 4.7, interest accrued on unspent MPLADS deposits in district bank accounts must be remitted back to the Consolidated Fund of India (BharatKosh) every financial year. District authorities routinely withhold interest income to fund unauthorized district administrative expenses.

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Accrued Interest vs Remittance Reconciliation Ledger:**
  Estimates minimum statutory savings interest (3.5% per annum on daily average balance) and compares it with remittances recorded on BharatKosh. If interest remittance is zero for over 12 months, it triggers a `TREASURY_INTEREST_RETENTION_FLAG`.

**5. Deep Technical & Architectural Blueprint:**
- **Auditor Calculation:**
  $$\text{Expected Interest} = \text{Average Unspent Balance} \times 0.035$$
  $$\text{Interest Shortfall} = \max(0, \text{Expected Interest} - \text{Remitted To BharatKosh})$$

---

### 📍 [LOOP 19 / 50] ANALYSIS: Plan 4.1 Model 1 — Isolation Forest Residual Cost Overrun Detection

**1. Current Implementation Baseline (What We Have):**
- Unsupervised `IsolationForest` on ratio of expenditure to sanctioned cost, work duration vs regional median, and payment velocity.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **Ensemble Risk Weighting (Step 4):** Feeds 40% of the Tier 2 normalized ML risk score ($80 \times [0.40 \text{Iso} + 0.35 \text{Benford} + 0.25 \text{Vendor}]$).
- **Triage Queue Sorting:** Directly determines ranking for non-statutory medium/high risk works.
- **Active Learning Retraining:** Investigator confirmations adjust the contamination parameter and decision thresholds over time.

**3. Identified Gaps & Weaknesses:**
- **Geographical Topography Bias:** Building a 1km road in hilly terrain (Uttarakhand / Himachal Pradesh) naturally costs 3x more and takes 2x longer than in flat plains (Bihar / UP). Running a single national Isolation Forest produces high false-positive rates for mountain states and false negatives in plain districts.

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Topography-Stratified Residual Isolation Forest:**
  Standardizes input features against regional peer clusters (grouped by State PWD Schedule of Rates (SOR) zones) before anomaly scoring. Anomaly is measured as deviation from the **SOR Regional Cost Index**:
  $$\text{Residual} = \text{Actual Unit Cost} - \text{Regional Category Median}$$

**5. Deep Technical & Architectural Blueprint:**
- **Feature Pipeline:**
  ```python
  from sklearn.ensemble import IsolationForest

  def build_stratified_features(df_works: pd.DataFrame):
      group_cols = ['state', 'work_category']
      df_works['regional_median_cost'] = df_works.groupby(group_cols)['sanction_amount'].transform('median')
      df_works['cost_residual_ratio'] = df_works['sanction_amount'] / (df_works['regional_median_cost'] + 1e-5)
      df_works['velocity_ratio'] = df_works['expenditure_amount'] / (df_works['sanction_amount'] + 1e-5)
      
      X = df_works[['cost_residual_ratio', 'velocity_ratio']].fillna(1.0).values
      iso = IsolationForest(contamination=0.05, random_state=42)
      df_works['iso_raw_score'] = -iso.fit(X).decision_function(X)
      min_s, max_s = df_works['iso_raw_score'].min(), df_works['iso_raw_score'].max()
      df_works['norm_iso_score'] = (df_works['iso_raw_score'] - min_s) / (max_s - min_s + 1e-6)
      return df_works
  ```

---

### 📍 [LOOP 20 / 50] ANALYSIS: Plan 4.2 Model 2 — Benford's Law Chi-Square & Digit Distortion

**1. Current Implementation Baseline (What We Have):**
- Logarithmic first-digit testing ($P(d) = \log_{10}(1 + 1/d)$) with Chi-Square ($\chi^2$) goodness-of-fit on district invoice disbursements.

**2. Holistic Project Impact & Cross-Module Analysis:**
- **Frontend Benford Lab (Screen 3):** Powers the live interactive histogram comparing observed vs logarithmic curves across all 780 districts.
- **Ensemble Contribution:** Feeds 35% of the Tier 2 normalized ML composite score.
- **District Risk Rating:** Districts with severe digit distortion receive elevated vigilance monitoring flags.

**3. Identified Gaps & Weaknesses:**
- **Small-Sample District Noise:** In remote districts with fewer than 50 total works, standard Chi-Square tests suffer from small-sample distortion, generating false panic alerts due to insufficient statistical degrees of freedom ($N < 100$).
- **Second-Digit Blindness:** Sophisticated fraudsters avoid the obvious digit '1' and artificially engineer payments starting with '2' or '4' (e.g. ₹4,95,000).

**4. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Dual-Digit (1st & 2nd Digit) Benford Engine with Monte Carlo Small-Sample Smoothing:**
  Calculates both First-Digit ($d_1$) and Second-Digit ($d_2$) distributions:
  $$P(d_2) = \sum_{k=1}^9 \log_{10}\left(1 + \frac{1}{10k + d_2}\right), \quad d_2 \in \{0, 1, \dots, 9\}$$
  Uses Monte Carlo bootstrapping for districts with $N < 100$ transactions to prevent spurious false alarms.

**5. Deep Technical & Architectural Blueprint:**
- **Mathematical Blueprint:**
  ```python
  def compute_robust_benford(amounts: list[float], min_n=100):
      valid_amts = [a for a in amounts if a >= 1000]
      n = len(valid_amts)
      if n < min_n:
          return {"status": "INSUFFICIENT_SAMPLE_SIZE", "sample_size": n, "confidence": "LOW"}
      
      first_digits = [int(str(int(a))[0]) for a in valid_amts if str(int(a))[0] != '0']
      observed_counts = pd.Series(first_digits).value_counts().reindex(range(1, 10), fill_value=0)
      expected_probs = [np.log10(1 + 1/d) for d in range(1, 10)]
      expected_counts = [p * n for p in expected_probs]
      
      chi_square = sum(((observed_counts[d] - expected_counts[d-1])**2) / expected_counts[d-1] for d in range(1, 10))
      is_anomalous = chi_square > 15.51
      
      return {
          "chi_square_stat": round(chi_square, 2),
          "is_anomalous": is_anomalous,
          "distortion_level": "SEVERE" if chi_square > 25.0 else ("EVIDENT" if is_anomalous else "NATURAL"),
          "sample_size": n
      }
  ```

---
"""

with open(target_path, "a", encoding="utf-8") as f:
    f.write(content)

print("Loops 11 to 20 appended successfully.")
