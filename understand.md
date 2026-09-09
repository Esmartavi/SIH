# 🇮🇳 BHARAT-DRISHTI // SIH 2026 DEFINITIVE MASTER BLUEPRINT
### **Problem Statement ID: 26102** | MoSPI — Data Informatics & Innovation Division (DIID)
**Title:** *Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation regd.*  
**Theme:** Smart Automation | **Category:** Software  
**Dataset Reference:** [mplads.mospi.gov.in](https://mplads.mospi.gov.in/digigov/dashboard.html)

---

## 🏛️ PART 1: Real-World Domain Mastery — The MPLADS / eSAKSHI Lifecycle

A strict judge checks domain depth in the first 60 seconds: do you understand how public funds actually move, or are you treating this like a generic Kaggle dataset?

```
                                  THE STATUTORY MPLADS WORKFLOW
  [ Hon'ble MP ]
        │ (Recommends durable community work from annual entitlement)
        ▼
  [ District Authority (DA) / Collector ]
        │ (Feasibility check, technical estimate, administrative sanction)
        ▼
  [ Implementing Agency (IA) ] ── (Gram Panchayat, PWD, Municipal Corporation, DRDA)
        │
        ├── Tranche 1: Advance payment released against Sanction Order
        │
        ├── Execution: Physical civil works execution on the ground
        │
        ├── 75% Utilization Gate: Tranche 2 legally locked until 75% of Tranche 1 is utilized
        │
        ├── Completion: IA uploads site photos & marks work completed on portal
        │
        └── Closure (30-Day Statutory Rule):
             ├── Physical Work Completion Report
             ├── Utilization Certificate (UC) signed by DA
             ├── Audit Certificate by empanelled Chartered Accountant (CA)
             └── Handover of durable asset to User Agency
```

### Statutory Compliance Rules Baked into the Scheme:
1. **Financial Entitlement:** Each MP receives **₹5 Crore per year**, disbursed in installments. Unspent balances do not lapse; they carry forward to subsequent years within the tenure.
2. **75% Installment Gate:** The second installment is released only after the District Authority submits proof of at least **75% utilization of the first installment**.
3. **Mandated SC/ST Area Quotas:**
   - **≥ 15% of annual funds** must be earmarked for works in Scheduled Caste (SC) dominated areas.
   - **≥ 7.5% of annual funds** must be earmarked for works in Scheduled Tribe (ST) dominated areas.
4. **Permissible Capital Assets Only:** Funds can only build durable capital assets (roads, schools, hand pumps, community halls). Non-durable expenditures (purchase of inventory, grants to private trusts, commercial assets) are **strictly prohibited under GFR 2017 Rule 144**.
5. **Single Bank Account Rule:** One dedicated savings account in a nationalized bank per MP with monthly reconciliation.

---

## 🎯 PART 2: What the Problem Statement is Actually Asking

| Official Ask (Verbatim from PS 26102) | Real-World Administrative Meaning | Technical AI/ML Implementation |
|:---|:---|:---|
| *"Trends and anomalies in expenditure patterns"* | Irregular sanction-to-disbursement cadence; fiscal year-end fund dumps (spending 80% in March). | Time-series decomposition, Budget Drain Velocity, robust residual deviation modeling. |
| *"Cost overruns"* | Project cost exceeding original sanctioned engineering estimate without revised approval. | Estimation-vs-actual regression residuals benchmarked against regional civil medians. |
| *"Duplicate works"* | Same road or asset funded twice across different years, schemes, or work IDs. | **Multi-Modal Fusion:** SentenceTransformers text embeddings + Geospatial GPS radius clustering + Visual pHash. |
| *"Delayed projects"* | Works sanctioned years ago sitting at 0% or 10% progress, blocking public capital. | Survival Analysis (Kaplan-Meier / Cox hazard modeling) against milestone trajectories. |
| *"Deviations from established norms"* | Violations of statutory quotas, non-capital spends, or splitting tenders to avoid oversight. | Deterministic Rule Engine checking SC/ST quotas, 75% gates, and ₹50L split-tendering clusters. |

---

## ⚖️ PART 3: The Strict Judge's Lens — How You Get Scored

| Dimension | Scoring Reality | What Eliminates Teams | What Bharat-Drishti Does to Win |
|:---|:---:|:---|:---|
| **Domain Depth** | **High** | Using generic terms like "rows" or "targets." | Fluently citing *Sanction Orders*, *IAs*, *Tranches*, *UCs*, *CA Audits*, and *GFR Rule 144*. |
| **Explainability** | **High** | Black-box single anomaly score (e.g. 0.87). Falsely accusing an MP is a legal liability. | Plain-English statutory reason for every flag + SHAP-style multi-factor attribution. |
| **Data Realism** | **High** | Claiming real data is impossible and relying 100% on toy synthetic data. | **Hybrid Data Strategy:** 98,649 real historical MoSPI records + controlled statutory violation benchmarks. |
| **False-Positive Cost** | **High** | Auto-flagging works without a human recourse mechanism. | Human-in-the-loop Kanban triage queue (`Open` ➔ `Review` ➔ `False Positive` ➔ `Escalated`). |
| **Novelty Beyond Dashboards** | **High** | Generic charts (MoSPI already has a monitoring dashboard). | **300 DPI Document OCR**, **Cross-Scheme Double-Dipping**, **pHash Vault**, and **Treasury Kill-Switch**. |
| **Scale** | **Medium** | Demo runs on 500 rows only. | Production-grade Supabase PostgreSQL relational schema indexing 98,649 works with sub-20ms queries. |

---

## 📊 PART 4: The Data Strategy — Realism Over Fantasy

### The Trap in Other Submissions:
Many teams claim: *"We will do live API integration with the central ministry database."* (MoSPI provides no public live write API; they will be disqualified). Other teams give up and say: *"Real data is restricted, so we only generated fake data with Faker."*

### Bharat-Drishti's Winning Hybrid Strategy:
1. **Real Public Data Ingestion (98,649 Works & 109,125 Expenditures):**
   - Harvested directly from MoSPI's official open CSV export endpoints for both Lok Sabha and Rajya Sabha.
   - Cleaned, schema-aligned, and indexed into a normalized relational database (Supabase AWS `ap-south-1`).
   - Untouched raw weekly CSV snapshots archived in an S3 vault to satisfy statutory **CAG audit provenance**.
2. **Objective Ground-Truth Benchmark (No Supervised Fantasy):**
   - Government data lacks clean `"fraud=1"` labels.
   - We validate detection performance by testing against **objective statutory violations** (Overspend vs sanction, payment before sanction date, SC/ST quota deficit, missing photo on completed works).

---

## ⚙️ PART 5: Exhaustive Feature & Model Matrix (Layer-by-Layer)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BHARAT-DRISHTI FULL PIPELINE ARCHITECTURE                              │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  │
  ├── LAYER A: Data Ingestion & Entity Resolution
  │    ├── Structured Ingestion: MPs, DAs, IAs, Vendors, Sanctions, Payments, Completion Reports, Photos
  │    ├── Entity Resolution: SentenceTransformers string vectorization resolving alias shell names
  │    └── Provenance Vault: Raw weekly MoSPI CSV snapshots sealed with SHA-256 cryptographic hashes
  │
  ├── LAYER B: Anomaly & Fraud Detection Models
  │    ├── Model 1: Isolation Forest (Cost overrun outliers benchmarked against regional medians)
  │    ├── Model 2: Benford's Law Chi-Square (First/second digit invoice manipulation & split-invoicing)
  │    ├── Model 3: Contractor Syndicate Clustering (NLP vendor graph detecting monopoly cartels)
  │    ├── Model 4: Geospatial & Semantic Duplicate Matcher (Overlapping GPS + work category similarity)
  │    ├── Model 5: PyMuPDF 300 DPI + RapidOCR (Portal vs. Paper financial discrepancy & ghost vendors)
  │    ├── Model 6: Cross-Scheme Double-Dipping Engine (Bilingual State MLA vs Central MP funds)
  │    └── Model 7: Perceptual Hashing (pHash) Vault (64-bit fingerprinting detecting recycled site photos)
  │
  ├── LAYER C: Predictive / Early-Warning Analytics
  │    ├── Predictive Stalling Model: Flags works at 0% physical progress >180 days after fund release
  │    ├── Milestone Risk Trajectory: Survival analysis predicting deadline failure months in advance
  │    └── Unspent Balance Forecaster: Predicts non-utilization velocity per constituency
  │
  ├── LAYER D: Deterministic Statutory Rule Engine (Hard Compliance Gates)
  │    ├── SC/ST Quota Tracker: Enforces statutory ≥15% SC and ≥7.5% ST allocation rules
  │    ├── 75% Tranche Gatekeeper: Flags unauthorized Tranche 2 release before 75% utilization
  │    ├── GFR 2017 Rule 144 Checker: Flags non-capital / prohibited asset expenditures
  │    └── Single Bank Account & CA Audit Certificate Compliance Tracker
  │
  ├── LAYER E: Composite Risk Scoring & Explainability
  │    ├── MPLADS Integrity Index (0–100): Weighted composite metric per Work, IA, District, and MP
  │    ├── Risk Tiers: 🔴 CRITICAL (81-100) | 🟠 HIGH (61-80) | 🟡 MEDIUM (41-60) | 🟢 LOW (0-40)
  │    └── Plain-English Statutory Reason: Every flag displays specific legal and mathematical proof
  │
  ├── LAYER F: Role-Based Stakeholder Portals
  │    ├── 1. Ministry (MoSPI) Command Center: National choropleth risk map & macro trends
  │    ├── 2. State Nodal Authority (SNA) Console: Inter-district ranking & escalation queue
  │    ├── 3. District Authority (DA / DM) Console: Ground-level work pipeline & IA scorecards
  │    ├── 4. MP Transparency Ledger: Constituency entitlement tracker & self-monitoring
  │    └── 5. Public Transparency Layer: Read-only non-sensitive stats for citizen accountability
  │
  ├── LAYER G: Human-in-the-Loop Case Management Workflow
  │    ├── Kanban Investigation Board: [Open] ➔ [Under Investigation] ➔ [False Positive] ➔ [Escalated]
  │    ├── Evidence Bundle: Auto-attaches OCR excerpts, payment trails, and photo matches
  │    └── Judicial Recourse: Formal audit trail protecting honest officials from false accusations
  │
  ├── LAYER H: Statutory Legal Enforcement Suite
  │    ├── 📄 1-Click Official CVC / CAG Audit Dossier (PDF Export with statutory exhibits)
  │    ├── ⚖️ Automated GFR 2017 Rule 144 Show-Cause Notice ready for District Magistrate signature
  │    └── 🚨 Automated Treasury Kill-Switch (halting pending tranches via PFMS)
  │
  └── LAYER I: Security & Cryptographic Immutability
       ├── Role-Based Access Control (RBAC) reflecting administrative hierarchy
       └── SHA-256 Merkle Audit Log: Prevents database administrators from altering risk scores
```

---

## 💡 PART 6: The 5 Killer Differentiators (Why This Wins 1st Place)

### 1. The "Portal vs. Paper" Scanned Document OCR (PyMuPDF 300 DPI + RapidOCR)
* **The Scam:** Officials enter compliant figures on the web portal (e.g. ₹10 Lakh disbursed, 100% completed). Inside the physical scanned completion certificate, the Junior Engineer's signed bill shows only ₹7.33 Lakh approved, leaving **₹2.66 Lakh retained or pocketed locally**.
* **Our Solution:** PyMuPDF renders 300 DPI images of uploaded PDFs, and RapidOCR extracts amounts, unmasked private bank accounts, and UTR numbers.

### 2. Cross-Scheme "Double-Dipping" Anomaly Detection
* **The Scam:** Contractors build one single physical asset, but claim payment twice: once from State Government MLA funds (**KLLAD / Vidhayak Nidhi**) and once from Central Government MP funds (**MPLADS Sansad Nidhi**).
* **Our Solution:** Bilingual English/Hindi entity matching flags State Legislative Assembly certificates submitted under Central MPLADS.

### 3. Persistent Visual Fingerprint Vault (pHash)
* **The Scam:** A contractor takes one photo of a completed building and uploads it for multiple projects across different districts or years.
* **Our Solution:** 64-bit perceptual hashes stored in a persistent database vault (`phash_vault.json`). Cross-matches new uploads against historical national hashes with Hamming distance, even if local PDFs are deleted.

### 4. Benford's Law & Split-Invoicing Cluster Radar
* **The Scam:** Corrupt officials split a large contract into ₹49.50L, ₹48.90L, and ₹49.80L tranches to bypass the mandatory **₹50 Lakh open e-tender and technical sanction threshold**.
* **Our Solution:** Chi-Square goodness-of-fit testing on invoice digit distributions surfaces human manipulation and split-tendering clusters.

### 5. Automated CVC / CAG Show-Cause Notice & Treasury Kill-Switch
* **The Actionability:** Solves the judge's #1 complaint (*"AI found fraud, but who acts on it?"*). With one click, generates a legally binding legal notice under **GFR 2017 Rule 144** and **Prevention of Corruption Act Section 13(1)(d)**, and issues an emergency Treasury Kill-Switch to freeze Tranche 2 before money leaves the bank.

---

## 🖥️ PART 7: Complete Module-by-Module Platform Breakdown

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        BHARAT-DRISHTI // NATIONAL MPLADS AI VIGILANCE WAR ROOM                         │
│ [Ingestion: 98,649 Works]  [Threat Level: HIGH]  [CAG Audit Vault: Active]  [Export Dossier]          │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  │
  ├── SCREEN 1: EXECUTIVE WAR ROOM (MoSPI Ministry Command Center)
  │    ├── 4 High-Impact KPI Counter Cards (Total Funds, High Risk Sanctions, Irregularities, Money at Risk)
  │    ├── Interactive Choropleth National Risk Map (State/District risk tier drilldown)
  │    └── Macro Anomaly Velocity & Sanction Distribution Trends
  │
  ├── SCREEN 2: LIVE VIGILANCE FLAGS (The Triage Queue)
  │    ├── Filterable table sorted by Composite Integrity Index (0–100)
  │    ├── Severity Filter Badges: 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 VERIFIED
  │    ├── Tag Filters: [Cost Overrun] [Split Tender] [Duplicate Photo] [Cross-Scheme MLA] [Paper Mismatch]
  │    └── Action: [Inspect Deep Case Dossier]
  │
  ├── SCREEN 3: BENFORD'S LAW FORENSIC INVOICING LAB
  │    ├── First-digit and second-digit histograms vs theoretical Logarithmic Benford curve
  │    ├── District-level Chi-Square distortion p-values
  │    └── Split-Invoicing Cluster Radar (bunching between ₹45L–₹49.99L)
  │
  ├── SCREEN 4: CONTRACTOR SYNDICATE & CARTEL RADAR
  │    ├── Interactive Force-Directed Network Graph (MPs ↔ Agencies ↔ Private Beneficiaries)
  │    ├── Benami Grouping Table (Resolving alias names to unified bank accounts)
  │    └── District Cartel Density Score (% of allocation won by top 3 syndicates)
  │
  ├── SCREEN 5: PHYSICAL EVIDENCE & SCANNED OCR LAB
  │    ├── High-Resolution 300 DPI Certificate Viewer with OCR Bounding Boxes
  │    ├── "Portal vs Paper" Discrepancy Matrix (Portal Disbursed vs Certificate Approved)
  │    ├── Cross-Scheme Double-Dipping Flag (State MLA KLLAD / Vidhayak Nidhi Match)
  │    └── Camera GPS Watermark Extractor (Territorial boundary validation)
  │
  ├── SCREEN 6: PHOTO FORENSICS & PHASH VAULT
  │    ├── Side-by-Side Visual Match Comparison Card
  │    ├── Hamming Distance & Match Percentage Indicator (e.g. 99.4% Match)
  │    ├── Cross-Project Attribution (Work ID A in Bihar vs Work ID B in Jharkhand)
  │    └── Persistent Vault Fingerprint Index (122+ visual fingerprints preserved)
  │
  ├── SCREEN 7: DISTRICT AUTHORITY CONSOLE (District Magistrate / Collector)
  │    ├── Operational view of all sanctioned works in district
  │    ├── SC/ST Quota Compliance Gauges (≥15% SC / ≥7.5% ST target tracking)
  │    └── IA Performance Scorecards (on-time rate, flag history, cost variance)
  │
  ├── SCREEN 8: MP TRANSPARENCY LEDGER
  │    ├── Entitlement remaining & project recommendation tracker
  │    ├── Execution timeline & unspent funds carryover
  │    └── Constructive view to identify underperforming local IAs
  │
  ├── SCREEN 9: PUBLIC TRANSPARENCY & JAN-DRISHTI PORTAL
  │    ├── Read-only aggregate non-sensitive statistics (serving the PS's transparency mandate)
  │    └── Citizen Reality Check: QR-code mobile lookup for village residents to verify completion
  │
  └── MODAL: DEEP CASE FILE INVESTIGATION DOSSIER
       ├── Section A: Financial & Progress Trajectory (Expenditure vs Physical Completion)
       ├── Section B: Contractor & Syndicate Profile (Win rate, alias entities)
       ├── Section C: Scanned Document & Forensic Proof (OCR extraction, pHash duplicates)
       ├── Section D: Gemini 3.6 Secretary AI Briefing (Plain-English executive summary)
       └── Section E: Statutory Enforcement Suite:
            ├── 📄 [Download Official CVC/CAG PDF Audit Dossier]
            ├── ⚖️ [Generate GFR Rule 144 Legal Show-Cause Notice]
            └── 🚨 [Trigger Treasury Kill-Switch (Freeze Tranche 2)]
```

---

## 📋 PART 8: Strict Judge's Self-Assessment Scorecard

Before presenting, evaluate the solution against the exact scoring rubric used by SIH judges:

| Dimension | Weight | Self-Assessment Check | Bharat-Drishti Implementation Status |
|:---|:---:|:---|:---|
| **Problem Understanding** | **High** | Can you explain "sanction," "tranche," "UC," and "IA" without notes? | ✅ Full bureaucratic lifecycle codified in deterministic rules. |
| **Innovation & Novelty** | **High** | Do you have ≥2 features no generic fraud dashboard team thought of? | ✅ **300 DPI Document OCR**, **Cross-Scheme Double-Dipping**, **pHash Vault**, **GFR Legal Notice**. |
| **Technical Feasibility** | **High** | Can you demonstrate a live flag ➔ evidence ➔ human review ➔ resolution? | ✅ End-to-end operational flow in the live dashboard. |
| **Data Strategy Realism** | **High** | Can you defend your data sourcing without dodging? | ✅ **98,649 real MoSPI records** ingested into Supabase; CAG provenance in S3. |
| **Explainability** | **Medium-High** | Does every single flag come with a plain-language "why"? | ✅ Plain-English statutory reasons + Gemini 3.6 Secretary Briefings. |
| **Compliance-Rule Coverage**| **Medium** | Are SC/ST quota, 75% tranche gate, and 1-year deadline explicitly modeled? | ✅ Codified in Layer 2 Deterministic Statutory Rule Engine. |
| **Stakeholder Coverage** | **Medium** | Do Ministry, SNA, DA, MP, and Public get distinct, role-appropriate views? | ✅ 5 distinct stakeholder views defined in navigation architecture. |
| **Scale Story** | **Medium** | Can you answer how this scales to 543+ MPs nationally? | ✅ PostgreSQL B-Tree indexed database with sub-20ms multi-table query performance. |
| **False-Positive Handling** | **Medium** | Is there a visible human-in-the-loop workflow, not just auto-flagging? | ✅ Interactive case management queue with status triage and audit logging. |
| **Presentation Polish** | **Medium** | Does the pitch open with a real fraud scenario walked through live? | ✅ Concrete Gaya Road Case Study demonstrating end-to-end detection. |

---

## 🎤 PART 9: The 5-Minute SIH Winning Live Presentation Script

* **Minute 1: The Domain Problem (45 Seconds):**  
  *"Every year, ₹4,000+ Crore flows into MPLADS across 543 MPs and thousands of local Implementing Agencies. The fatal blind spot is that the central ministry treats uploaded completion PDFs and photos as unread files. Audits are post-mortem—discovering fraud two years after the money is already gone."*
* **Minute 2: Data Reality & Ingestion (45 Seconds):**  
  *"Unlike teams who relied on toy synthetic data, Bharat-Drishti ingested **98,649 real historical works and 109,125 transaction records directly from MoSPI's official portal**, preserved in an S3 vault for CAG audit provenance."*
* **Minute 3: Multi-Layer AI Ensemble (90 Seconds):**  
  *"We deployed a 5-layer multi-modal engine:  
  1. Deterministic Rule Engine for SC/ST quotas and 75% tranche utilization gates.  
  2. Benford's Law for invoice manipulation and ₹49.5L split-tendering.  
  3. NLP Entity Resolution for contractor monopoly syndicates.  
  4. 300 DPI Document OCR for Portal vs. Paper money gaps and State MLA double-dipping.  
  5. Persistent pHash Vault for recycled photo detection."*
* **Minute 4: Live Case Walkthrough (Gaya Road Case) (90 Seconds):**  
  *Open Work #62689 in the War Room. Show the ₹49.5L split tender flag, the contractor syndicate link, the ₹2.66L paper discrepancy, and the Gemini executive briefing.*
* **Minute 5: Actionability & Legal Enforcement (30 Seconds):**  
  *"Answering the judge's question: 'What happens after AI finds fraud?' With one click, the system generates a **legally binding Show-Cause Notice under GFR 2017 Rule 144** ready for the District Magistrate, and executes an automated **Treasury Kill-Switch** to freeze Tranche 2 before the money leaves the bank."*
