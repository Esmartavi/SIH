# SIH 2026 — Problem Statement 26102
## AI-Powered Fraud & Anomaly Detection for MPLADS Scheme

> **Organization:** MoSPI — Data Informatics & Innovation Division (DIID)
> **Theme:** Smart Automation | **Category:** Software
> **Dataset:** [mplads.mospi.gov.in](https://mplads.mospi.gov.in/digigov/dashboard.html)
> **Status:** ✅ CHOSEN — Final submission PS

---

## Part 1 — The Real World Problem

Every Member of Parliament (MP) in India receives **₹5 crore per year** under the MPLADS scheme to fund local development works — roads, schools, hand pumps, community halls, street lights — in their constituency.

With **543 MPs**, that is **₹2,500+ crore of taxpayer money every single year** flowing into thousands of local projects across every district of India.

### What Actually Happens Today

An MP recommends a work: *"Build a road in Village X for ₹12 lakh."*
The District Authority approves it. A contractor is hired. Bills are submitted. ₹12 lakh is paid. The road may or may not get built.

Nobody automatically cross-checks:
- Did the same contractor win 47 contracts from the same MP?
- Is "Sharma Constructions" the same person as "S. Constructions" and "Sh. Const. Pvt Ltd"?
- Was this road already built 2 years ago and paid for again now?
- Is a project sitting at 0% completion 3 years after sanction?

MoSPI receives all this data — every sanction, every payment, every completion report — from across India. **They have millions of rows of data with zero tool to automatically detect suspicion.**

That is exactly what we are building.

---

## Part 2 — What We Are Building

An **AI-powered monitoring and analytics platform** for MPLADS — a tireless intelligent auditor that reads every transaction from every MP simultaneously and surfaces fraud, inefficiency, and non-compliance before the money is lost.

### Who Uses This System

| User | Role | What They See |
|------|------|--------------|
| **MoSPI Ministry Officials** | National oversight | Color-coded India map by risk level |
| **State Nodal Authorities** | State oversight | All districts ranked by risk, state trends |
| **District Authorities** | Ground-level monitoring | All works in their district sorted by risk |
| **MPs** | Self-monitoring | Their own works, fund utilization, compliance |

---

## Part 3 — The Data We Work With

> ⚠️ **Important scoping note:** The eSAKSHI geo-tagging portal went live **1 April 2023**. Before this, data was maintained in physical registers. We have **~3 years of clean structured digital data** (2023–present). Pre-2023 records exist in tabular format but lack geo-tagging and vendor-level detail. All claims about historical data are scoped accordingly.

For every MPLADS project, the system ingests:

| Data Field | What It Tells Us |
|-----------|-----------------|
| MP name, state, constituency | Who recommended the work |
| Work type | Road, hand pump, school, community hall, etc. |
| Implementing agency | Gram Panchayat, PWD, Municipality, etc. |
| Sanctioned cost estimate | Original budget at approval |
| Current expenditure | How much has actually been paid |
| Work progress % | Ground-level completion status |
| Sanction / payment / completion dates | Timeline compliance |
| Contractor / vendor name | Who is executing the work |
| GPS coordinates | Where the work is physically located |
| eSAKSHI uploaded photos | Visual evidence of asset creation |
| Utilization certificates | Financial proof documents (often PDFs) |

**Data ingestion:** Periodic bulk download from the MPLADS portal (daily/weekly scheduled refresh). Not framed as a live API sync unless we can confirm the portal exposes one.

---

## Part 4 — The AI Models

Our system uses **five AI/ML models**, each designed to catch a different type of fraud or inefficiency.

---

### Model 1 — Expenditure Anomaly Detector (Isolation Forest)

**What it catches:** Financial patterns that are statistically abnormal compared to similar works nationwide.

Isolation Forest is an **unsupervised** algorithm — it requires **no fraud labels**. It learns what "normal" looks like across thousands of similar works and automatically identifies outliers.

**Signals it analyzes:**
- **Cost overrun ratio** — 5% overrun is normal. 300% on a hand pump is not.
- **Payment timing** — 100% payment released before any work starts = red flag.
- **Expenditure vs progress mismatch** — 90% money spent, 10% work done = flag.
- **Project duration outlier** — Hand pump sanctioned 4 years ago, still "in progress."
- **MP-level fund concentration** — One MP gave 80% of annual allocation to one contractor.

**Output:** Every work gets an **Anomaly Score 0–100** (higher = more abnormal). Works above threshold are flagged.

---

### Model 2 — Contractor Identity Resolution (Sentence Transformers)

**What it catches:** The same contractor hiding behind multiple slightly different company names to fake competitive tendering.

This is also **unsupervised** — no labels needed.

**The fraud pattern:**
- "Sharma Construction" wins 20 contracts
- "S. Constructions Pvt Ltd" wins 15 contracts
- "Sharma Const. & Co." wins 12 contracts

On paper: 3 vendors. Reality: 1 person collecting ₹47 lakh from 1 MP.

**How it works:** Sentence Transformers convert contractor names into mathematical vectors. Similar names cluster together mathematically. The system groups them as "suspected same entity" with a confidence score.

After grouping, it recalculates true concentration — 78% of an MP's allocation to one entity = flagged as contractor monopoly.

**Output:** Vendor Identity Resolution Map with deduplicated contractor groups and concentration scores.

---

### Model 3 — Composite Risk Scorer (Weighted Ensemble)

**What it produces:** A single **Fraud Risk Score 0–100** for every work, combining all signals.

> ⚠️ **Important architecture note:** This is a **weighted ensemble risk scorer**, not a supervised fraud classifier. There are no confirmed fraud labels in MPLADS history — the entire premise of this problem is that systematic auditing doesn't exist yet. Weights are set by domain logic, not learned from labeled outcomes.

**Self-improving design (Active Learning):**
- **Phase 1 (Day 1):** Rule-driven weighted sum — Anomaly Score × 0.35 + Vendor Concentration Score × 0.30 + Rule Violations × 0.20 + Timeline Score × 0.15
- **Phase 2 (after 500+ reviews):** When officials mark alerts "Confirmed" or "False Positive," those become training labels. XGBoost begins learning from real feedback, replacing the fixed weights with data-driven ones.

This is exactly how production fraud systems work at Visa and NPCI — rule-driven on Day 1, genuinely supervised as ground truth accumulates.

**Risk labels:**

| Level | Score | Action |
|-------|:-----:|--------|
| 🟢 Low | 0–40 | No action needed |
| 🟡 Medium | 41–60 | Monitor, verify on next field visit |
| 🟠 High | 61–80 | District Authority review required |
| 🔴 Critical | 81–100 | Immediate escalation to State/Ministry |

All flags show status **"NEEDS REVIEW"** — never "Confirmed Fraud." Confirmation only happens through official human review.

---

### Model 4 — Geospatial Duplicate Work Detector

**What it catches:** The same work sanctioned and paid for twice — same or different years.

**The fraud:** "CC Road, Village Rampur" is completed and paid in 2021. Same road sanctioned again in 2023 under a new work ID. Different contractor paid. No new road built.

**How it works:**
1. Extract GPS coordinates for every work
2. Check: any other work of the **same type** within proximity radius? (50m for hand pump, 200m for road)
3. If match found: cross-check work type + implementing agency + time period
4. Flag as "Suspected Duplicate" with confidence score

> **Scope limitation:** Cross-scheme duplicates (same road funded by both MPLADS and PMGSY) are **outside scope** — that requires data from other scheme portals not available in MPLADS. Stated explicitly as a known limitation and future integration opportunity.

**Output:** List of suspected duplicate pairs with side-by-side map visualization.

---

### Model 5 — Completion Time Predictor (Early Warning)

**What it catches:** Projects headed for failure — **before** the deadline passes.

An alert fires after something goes wrong. An early warning fires when the **trajectory** looks bad, even if nothing technically wrong has happened yet.

**How it works:** A regression model trained on historical completed works. Input: current progress percentage, funds released, implementing agency type, work type, state, months since sanction. Output: predicted probability of on-time completion.

**Example:**
> *Work ID #MP-UP-1247 sanctioned 14 months ago. 15% funds released, 8% completion. Based on 847 similar past works in UP: **91% probability of missing 2-year deadline.** Recommended action: issue implementing agency notice by [date].*

District Authority gets a **10-month window** to intervene rather than discovering failure after the deadline.

**Output:** For every in-progress work — predicted completion probability + predicted final date + recommended intervention date.

---

## Part 5 — Image Forensics Module

**What it catches:** Fake, recycled, or manipulated photos submitted as "proof" of asset creation.

### A — EXIF Metadata Extraction

Every photo contains hidden metadata: date taken, camera model, GPS at time of capture.

The system checks:
- **Date mismatch** — Photo taken in 2021, uploaded in 2023 as "completion proof." Flagged.
- **GPS mismatch** — EXIF GPS coordinates differ from declared work location by >100m. Flagged.
- **Stripped metadata** — All EXIF removed (sign of deliberate editing). Flagged at medium risk.

### B — Perceptual Hashing (Duplicate Photo Detection)

One photo of a hand pump uploaded as completion evidence for 5 different work IDs.

The system computes a **perceptual hash** for every uploaded image. Unlike cryptographic hashes, perceptual hashes remain near-identical for visually similar images regardless of minor edits.

Result: *"Photo for Work #1247 is 99.3% identical to photo for Work #0892 submitted 2 years earlier. Suspected reuse of same photo across multiple works."*

### C — Content Verification (Computer Vision)

A lightweight model (YOLOv8-nano or MobileNetV3) verifies the photo actually shows what it claims to show.

- Work type: "Hand Pump" → Does photo contain a hand pump?
- Work type: "CC Road" → Does photo show a road surface?
- If photo shows an empty field: flagged.

**Output per photo:** ✅ Verified / ⚠️ Suspicious / 🔴 Fraudulent — with specific reason.

---

## Part 6 — Compliance Rules Engine

Beyond ML detection, a separate deterministic rules engine checks every work against official MPLADS regulations:

| Rule | Check |
|------|-------|
| Payment ≤ 75% before completion | Every payment record verified |
| Works completed within 2 years of sanction | All overdue works flagged |
| Single contractor ≤ X% of MP annual allocation | All concentrations checked |
| Completion photo mandatory before final payment | All completed works without photo flagged |
| Work type must match sanctioned category | Category mismatch flagged |

These violations are **rule-based, black and white, legally defensible** — separate from ML suspicion scores. Powerful for formal investigations.

---

## Part 7 — The Dashboard (7 Views)

### View 1 — National Risk Map (Ministry Login)
Interactive choropleth map of India. Every constituency colored green/yellow/orange/red by aggregate risk. Click state → district → see flagged works. Filter by time period, work type, risk level.

*This view has never existed for MPLADS. It is the single most impactful screen in the system.*

### View 2 — State Nodal Authority Dashboard
All districts within the state ranked by aggregate risk score. State-level trend chart. Cross-district comparison of compliance rates. Filter by district, work type, implementing agency.

### View 3 — MP / District Drill Down
- Total funds allocated vs spent
- Work count: Completed / In Progress / Delayed / Flagged
- All works sorted by Risk Score (highest first)
- Timeline chart: fund release vs work progress
- Early warning cards for at-risk in-progress works

### View 4 — Live Alert Feed
Real-time feed of system-generated alerts:

```
🔴 CRITICAL — Work #MP-UP-1247 | CC Road, Fatehpur — NEEDS REVIEW
   • Cost 340% above district average (+38 to score)
   • Payment before geo-tag submission (+29 to score)
   • Contractor linked to 3 alias names, ₹47L total (+22 to score)
   Risk Score: 89/100
   [Mark Confirmed] [Mark False Positive] [Escalate to State]

🟠 HIGH — Work #MP-MH-0892 | Hand Pump, Nashik — NEEDS REVIEW
   • Duplicate photo: 99.3% match with Work #0341 (2021)
   Risk Score: 78/100

🟡 MEDIUM — Work #MP-RJ-2103 | Community Hall, Jaipur — NEEDS REVIEW
   • Early warning: 91% probability of missing deadline
   Risk Score: 61/100
```

Each flag shows: status = NEEDS REVIEW (never "Confirmed Fraud"), top contributing signals in plain language, and action buttons.

### View 5 — Vendor Network Graph
Interactive node graph:
- Each node = contractor (size = total money received)
- Edges = suspected same entity connections
- Color = risk level of associated works
- Click node → all works, total earnings, linked MPs

### View 6 — Trend Analysis
Time-series charts across months and years:
- State-level cost overrun trends (worsening = systemic flag)
- Work category delay rates (which types consistently run late?)
- Seasonal payment anomalies (March year-end spike detection)
- MP fund utilization patterns over time

> **Note on election trends:** Correlating fraud with election cycles requires ECI constituency election date data. This is publicly available and will be integrated as an additional data source.

### View 7 — Asset Verification & Photo Forensics Tab
- % of completed works with verified photo documentation
- Per-work forensics verdict: EXIF status, duplicate check result, content verification result
- List of works marked "Completed" with no photo submitted
- GPS-vs-EXIF mismatch list

---

## Part 8 — Immutable Audit Log (Anti-Tampering)

**The problem:** A corrupt District Authority could log in and dismiss CRITICAL fraud alerts to protect associated contractors.

**The solution — forced accountability at every action:**

1. No HIGH or CRITICAL alert can be dismissed without a **mandatory written justification** (minimum 50 characters, cannot be empty or blank)
2. Every alert action (acknowledged / dismissed / escalated / confirmed / false positive) is written to an **append-only audit log table** — user ID, timestamp, action, justification
3. The Ministry dashboard has a dedicated **"Alert Dismissals"** tab showing all dismissals nationwide
4. If a District Authority dismisses 10+ CRITICAL alerts in 30 days, this pattern itself **auto-flags** to the Ministry: *"DA X dismissed 12 critical alerts without escalation in 30 days."*

**The elegant consequence:** A corrupt official covering up fraud inside our system simultaneously creates irrefutable evidence of their cover-up — visible to their superiors.

---

## Part 9 — Role-Based Access Control (RBAC)

All dashboard views are role-gated:

| Role | Data Visible |
|------|-------------|
| MP | Only their own constituency works |
| District Authority | Only their district's works |
| State Nodal Authority | Only their state's works and districts |
| MoSPI Ministry | Full national visibility, all dismissal logs |

Login is authenticated. Roles assigned by MoSPI administrators. No user can escalate their own access.

---

## Part 10 — OCR Document Pipeline (Supporting Feature)

Utilization certificates are frequently submitted as scanned PDFs. Our supporting document pipeline:

1. PDF received → PyMuPDF + Tesseract OCR extracts all text
2. NLP (regex + lightweight NER) identifies: contractor name, amount, work ID, dates
3. Extracted fields validated against structured portal records for the same work
4. Discrepancies (PDF shows ₹8L, portal shows ₹12L for same work) = flagged

*Core ML models run on structured data. This pipeline extends coverage to unstructured documents.*

---

## Part 11 — System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  DATA INGESTION LAYER                     │
│  MPLADS Portal → Periodic bulk download (CSV/tables)     │
│  eSAKSHI photos → EXIF extraction + perceptual hashing  │
│  PDF documents → OCR pipeline → structured fields        │
│  ECI election data → for trend correlation               │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                 DATA PROCESSING LAYER                     │
│  Clean & normalize: names, costs, GPS, dates             │
│  Derive features: overrun ratio, delay days, etc.        │
│  Deduplicate records across refresh cycles               │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                   AI MODELS LAYER                         │
│  Model 1: Isolation Forest → Anomaly Scores              │
│  Model 2: Sentence Transformers → Vendor Identity Groups │
│  Model 3: Weighted Ensemble → Risk Scores (0–100)        │
│           └─ Phase 2: XGBoost on accumulated labels      │
│  Model 4: Geospatial Engine → Duplicate Work Detection   │
│  Model 5: Regression Model → Completion Time Prediction  │
│  Model 6: CV + Hashing → Photo Forensics                 │
│  Rules Engine: Compliance checks (deterministic)         │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                ALERT GENERATION LAYER                     │
│  Risk Score > threshold → "NEEDS REVIEW" alert created   │
│  Tagged to: Work ID, District, State, Ministry           │
│  Early warnings pushed to District Authorities           │
│  All actions logged to immutable audit table             │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                   DASHBOARD LAYER                         │
│  View 1: National Risk Map (Ministry)                    │
│  View 2: State Nodal Authority Dashboard                 │
│  View 3: MP / District Drill Down                        │
│  View 4: Live Alert Feed (with NEEDS REVIEW status)      │
│  View 5: Vendor Network Graph                            │
│  View 6: Trend Analysis (time-series)                    │
│  View 7: Asset Verification & Photo Forensics            │
│  View 8: Alert Dismissals (Ministry audit trail)         │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                    OUTPUT LAYER                           │
│  PDF Investigation Reports (per work / per MP)           │
│  Monthly Compliance Reports (per district / state)       │
│  National Summary Report (all MPs ranked by risk)        │
│  Audit Log Export (for formal inquiry proceedings)       │
└──────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Tool | Why |
|-------|------|-----|
| Database | PostgreSQL + PostGIS | Structured data + geospatial queries |
| Graph Analysis (demo) | NetworkX (Python) | Zero setup, sufficient for demo scale |
| Graph DB (production) | Neo4j | Real-time traversal across 500K+ contractor nodes |
| ML Models | scikit-learn + XGBoost | Industry standard |
| NLP | sentence-transformers | Best-in-class semantic similarity |
| Image Forensics | Pillow + imagehash + YOLOv8-nano | Lightweight, fast, offline |
| OCR | PyMuPDF + Tesseract | Open source, offline |
| Backend | FastAPI (Python) | Fast, async, automatic docs |
| Frontend | React.js | Component-based |
| Maps | Leaflet.js | Interactive choropleth |
| Charts | Recharts / D3.js | Time-series and network graphs |
| PDF Export | ReportLab (Python) | Programmatic report generation |

---

## Part 12 — Validation Strategy

> **The honest answer to "How do you know it works?"**

Without pre-labeled fraud data, we cannot compute traditional precision/recall. Our validation approach:

1. **Proxy precision metric:** During the hackathon, we hand-review the **top 20 highest-risk works** flagged by the system against the raw MPLADS data. We independently verify whether each has at least one objective rule violation (cost overrun, payment before geo-tag, etc.)
2. **Target:** 16/20 (80%) independently verifiable violations in the top-flagged works
3. **Statement to judges:** *"We treat this as our proxy precision metric pending official audit feedback. Our active learning pipeline will compute true precision as officials confirm or dismiss alerts in production."*

This is honest, credible, and shows scientific thinking rather than false confidence.

---

## Part 13 — Known Limitations (Honest Scoping)

| Limitation | Why | Future Path |
|-----------|-----|------------|
| Cross-scheme duplicates | PMGSY/MNREGA data not in MPLADS portal | Requires central data-sharing agreement |
| Pre-2023 geo-tagged data sparse | eSAKSHI only live from Apr 2023 | Historical tabular data still analyzed for financial patterns |
| No real-time API sync | Portal may not expose live API | Periodic bulk refresh achieves same effect |
| No confirmed fraud labels on Day 1 | MPLADS never systematically audited before | Active learning from official review actions |

---

## Part 14 — The 3 Demo Moments That Win

### Moment 1 — The Corruption Reveal
> *"Here is a real MP's data. Watch what happens."*

Click one MP's constituency on the map → their works list appears → one work flashes red → Risk Score: 89/100.

Click it. Three signals shown in plain language:
- *"Cost 340% above district average for this work type (+38 to score)"*
- *"Payment released before geo-tag submission (+29 to score)"*
- *"Contractor name matches 3 other vendor aliases. Combined: ₹47L from 1 MP (+22 to score)"*

Status: **NEEDS REVIEW** (not "Confirmed Fraud")

Judge reaction: *"This is real data. You found a real pattern."*

### Moment 2 — The Map That Has Never Existed
> *"Nobody has ever seen MPLADS risk like this."*

National map. Every constituency colored. Zoom to a state — 3 districts deep red. Click one district — 8 critical works listed with risk scores.

*"This national AI-driven risk view of all 543 MPs' MPLADS funds has never existed before today."*

### Moment 3 — The Audit Trail Trap
> *"What stops a corrupt official from just dismissing the alert?"*

(The judge WILL ask this.)

Click "Dismiss" on a CRITICAL alert. Mandatory dialog appears: *"You must provide written justification for dismissing a CRITICAL flag. This action is logged and visible to MoSPI Ministry."*

Switch to Ministry → Alert Dismissals tab → the dismissal is there. Permanent. Visible.

*"A corrupt official using our system to cover up fraud simultaneously creates evidence of their cover-up inside our system — visible to their superiors."*

---

## Part 15 — Problem Statement Compliance Checklist

| Requirement from PS | Our Coverage |
|--------------------|:-----------:|
| Anomaly detection in expenditure patterns | ✅ Model 1 — Isolation Forest |
| Fund utilization analysis | ✅ Expenditure vs allocation tracking |
| Cost estimate deviation | ✅ Cost overrun ratio feature |
| Work progress monitoring | ✅ Progress vs payment mismatch |
| Payment analysis | ✅ Payment timing anomaly |
| Asset creation verification | ✅ Photo forensics module |
| Unusual pattern detection | ✅ All 5 models + rules engine |
| Cost overrun identification | ✅ Model 1 + Model 3 |
| Duplicate works detection | ✅ Model 4 — Geospatial |
| Delayed project identification | ✅ Model 5 — Early warning |
| Deviation from norms | ✅ Compliance rules engine |
| Risk-based alerts | ✅ Alert generation layer |
| Predictive insights | ✅ Model 5 — completion probability |
| Decision-support dashboards | ✅ 7 dashboard views |
| MP dashboards | ✅ View 3 — MP drill down |
| State Nodal Authority dashboards | ✅ View 2 — SNA dashboard |
| District Authority dashboards | ✅ View 3 — District drill down |
| Ministry dashboards | ✅ View 1 — National map |
| Automated compliance monitoring | ✅ Rules engine + compliance tab |
| Trend analysis | ✅ View 6 — Trend analysis |
| Early warning mechanisms | ✅ Model 5 + proactive notifications |
| Transparency | ✅ Public risk map + audit log |
| Accountability | ✅ Immutable audit log (anti-tampering) |
| Reduced manual monitoring | ✅ Automated scoring + alert pipeline |

**All 24 requirements from the problem statement: ✅ COVERED**

---

## Part 16 — Why This Is Buildable

Every single component uses existing, proven, open-source tools:

```
✅ MPLADS data ingestion        → Python requests + pandas
✅ Isolation Forest             → scikit-learn (pip install)
✅ Sentence Transformers        → pip install sentence-transformers
✅ Weighted Risk Scorer         → NumPy weighted sum
✅ GPS duplicate detection      → PostGIS + Python geopy
✅ Completion time prediction   → scikit-learn regression
✅ EXIF forensics               → Pillow library
✅ Perceptual hashing           → imagehash library
✅ CV content verification      → YOLOv8-nano (ultralytics)
✅ India map choropleth         → Leaflet.js
✅ Vendor network graph         → NetworkX + D3.js
✅ Immutable audit log          → PostgreSQL append-only table
✅ PDF report export            → ReportLab
✅ RBAC login system            → FastAPI + JWT tokens
```

No training data collection. No custom model training from scratch. No hardware beyond a laptop. Nothing that doesn't exist.

---

## Summary

We are building a web platform where any government official — from a District Collector to a senior MoSPI officer — can log in and immediately see which MPLADS projects across India are at risk of fraud, cost overruns, delays, or contractor manipulation.

Five AI models work together behind the scenes: detecting abnormal spending, resolving contractor identities, scoring combined risk, finding duplicate works geospatially, and predicting project failures before they happen. An image forensics module catches fake and recycled photos. An immutable audit log prevents officials from suppressing alerts without accountability. A compliance engine enforces MPLADS rules automatically.

The front-end shows this as an interactive India map, a live alert feed with explainable signals, a vendor network graph, trend charts, and a forensics tab. Four role-based views serve MPs, District Authorities, State Nodal Authorities, and the Ministry.

**The goal: turn what is currently a manual, reactive audit process into the first-ever automatic, proactive, AI-driven monitoring system for MPLADS — catching fraud before the money is lost, not years after.**

---

*Document Version: Final — Incorporates all team feedback and corrections*
*Problem Statement ID: SIH26102 | Organization: MoSPI*
