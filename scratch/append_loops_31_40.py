import os

target_path = r"c:\Users\shash\OneDrive\Desktop\hack_heritage\remaining.md"

content = r"""
## 🔬 PART 4: MULTI-MODAL COMPUTER VISION & BACKEND GOVERNANCE (LOOPS 31–40)

---

### 📍 [LOOP 31 / 50] ANALYSIS: Plan 5.4 Task 2 — Cross-Scheme Double-Dipping Engine

**1. Current Implementation Baseline (What We Have):**
- Scans certificate text headers for State MLA lexicons: `MLALAD`, `Vidhayak Nidhi`, `KLLAD`, `Chief Minister Gram Sadak Yojana` (English and Hindi).

**2. Identified Gaps & Weaknesses:**
- **National Scheme Convergence Blindness:** In addition to State MLA schemes, double-dipping frequently occurs with other **Central Sector & Centrally Sponsored Schemes** executed in the same village:
  1. *Pradhan Mantri Gram Sadak Yojana (PMGSY)* (Rural Roads).
  2. *Jal Jeevan Mission (JJM)* (Piped Drinking Water).
  3. *Samagra Shiksha Abhiyan* (School classrooms).
  Contractors routinely execute a road under PMGSY, take full payment from the Ministry of Rural Development, and submit the exact same completion certificate under MPLADS to get paid a second time! The current lexicon only searches for MLA schemes.

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Pan-India Multi-Scheme Cross-Convergence Lexicon & Geo-Overlay Scanner:**
  Expands the detection vocabulary to encompass all major Central Rural Infrastructure schemes (PMGSY, JJM, MGNREGA, PM-AWAS, DMFT). Cross-references project work codes and administrative department letterheads against Central Scheme registries.

**4. Deep Technical & Architectural Specification:**
- **Expanded Convergence Taxonomy:**
  ```python
  CENTRAL_SCHEME_LEXICONS = {
      "PMGSY": ["pradhan mantri gram sadak", "pmgsy", "ग्रामीण सड़क योजना", "ommas"],
      "JAL_JEEVAN": ["jal jeevan mission", "jjm", "har ghar jal", "जल जीवन मिशन"],
      "MGNREGA": ["mgnrega", "nrega", "मनरेगा", "mahatma gandhi national rural"],
      "STATE_MLA": ["mlalad", "vidhayak nidhi", "विधायक निधि", "kllad", "cmgsy"],
      "MINING_CESS": ["district mineral foundation", "dmft", "खनन न्यास"]
  }

  def detect_multi_scheme_double_dipping(ocr_text: str):
      low_text = ocr_text.lower()
      detected_schemes = []
      for scheme, keywords in CENTRAL_SCHEME_LEXICONS.items():
          for kw in keywords:
              if kw in low_text:
                  detected_schemes.append(scheme)
                  break
      if len(detected_schemes) > 0:
          return {
              "violation": "CROSS_SCHEME_DOUBLE_DIPPING_FLAG",
              "conflicting_schemes": list(set(detected_schemes)),
              "risk": "Dual billing across distinct Central/State ministerial funding streams",
              "action": "Demand Project Asset Inscription Board Photographic Proof"
          }
      return {"violation": None}
  ```

---

### 📍 [LOOP 32 / 50] ANALYSIS: Plan 5.5 Persistent Perceptual Hash (pHash) Image Vault

**1. Current Implementation Baseline (What We Have):**
- 64-bit visual structure hashing (`imagehash.phash`) stored in `forensics/phash_vault.json` with Hamming distance $\le 5$ matching.

**2. Identified Gaps & Weaknesses:**
- **Mirroring & Crop Evasion:** Perceptual hashing using standard Discrete Cosine Transform (DCT) is vulnerable to simple image transformations: horizontally flipping the photo (mirror image), cropping 15% of the border, or adjusting color brightness/contrast by 10%. These simple modifications alter the standard 64-bit DCT pHash beyond the Hamming threshold ($\le 5$), causing the system to miss blatant visual duplicates!

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Invariance-Hardened Quad-Hash Ensemble (pHash + dHash + aHash + SIFT Feature Matching):**
  Combines Perceptual Hash (frequency domain), Difference Hash (gradient domain), and Average Hash. When a potential visual match is detected with borderline Hamming distance (6–12), it automatically triggers **SIFT (Scale-Invariant Feature Transform) Keypoint Homography** to confirm structural equivalence regardless of rotation, cropping, or mirroring.

**4. Deep Technical & Architectural Specification:**
- **Robust Multi-Hash Matching:**
  ```python
  import imagehash
  from PIL import Image, ImageOps
  import cv2

  def generate_robust_fingerprint(image_path: str):
      with Image.open(image_path) as img:
          # Normalize orientation
          img = ImageOps.exif_transpose(img).convert('RGB')
          phash = imagehash.phash(img)
          dhash = imagehash.dhash(img)
          # Also compute flipped hash for mirror detection
          phash_flipped = imagehash.phash(img.transpose(Image.FLIP_LEFT_RIGHT))
          return str(phash), str(dhash), str(phash_flipped)

  def verify_sift_keypoint_match(img_path1: str, img_path2: str, min_match_count=25):
      img1 = cv2.imread(img_path1, cv2.IMREAD_GRAYSCALE)
      img2 = cv2.imread(img_path2, cv2.IMREAD_GRAYSCALE)
      
      sift = cv2.SIFT_create()
      kp1, des1 = sift.detectAndCompute(img1, None)
      kp2, des2 = sift.detectAndCompute(img2, None)
      
      if des1 is None or des2 is None:
          return False, 0
          
      flann = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=50))
      matches = flann.knnMatch(des1, des2, k=2)
      
      # Lowe's ratio test
      good_matches = [m for m, n in matches if m.distance < 0.7 * n.distance]
      return len(good_matches) >= min_match_count, len(good_matches)
  ```

---

### 📍 [LOOP 33 / 50] ANALYSIS: EXIF Metadata & Geotag Spoofing Detection

**1. Current Implementation Baseline (What We Have):**
- Stamped GPS coordinates extracted from image watermark text; basic lat/long in database.

**2. Identified Gaps & Weaknesses:**
- **Watermark Stamp Spoofing Apps:** Apps like "GPS Map Camera" available on Android allow users to manually type in *any* latitude, longitude, and address, stamping fake coordinates onto a photograph taken 200 kilometers away. The current system trusts watermark text without verifying internal EXIF header consistency.

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Cross-Layer Dual-Geotag Triangulation (Watermark OCR vs Raw EXIF GPS):**
  Extracts GPS from *both* the raw image binary EXIF tags (`Exif.GPSInfo`) and the printed OCR watermark text. Computes the spatial discrepancy between the two. If EXIF says New Delhi but the printed watermark says Gaya, Bihar, it triggers a `CRITICAL_GEOTAG_FORGERY` alert.

**4. Deep Technical & Architectural Specification:**
- **Verification Logic:**
  ```python
  import exifread

  def extract_exif_coordinates(file_path: str):
      with open(file_path, 'rb') as f:
          tags = exifread.process_file(f, details=False)
          lat_tag = tags.get('GPS GPSLatitude')
          lon_tag = tags.get('GPS GPSLongitude')
          lat_ref = tags.get('GPS GPSLatitudeRef')
          lon_ref = tags.get('GPS GPSLongitudeRef')
          
          if lat_tag and lon_tag:
              # Convert rationals to decimal degrees
              lat = convert_to_degrees(lat_tag.values) * (-1 if lat_ref.values == 'S' else 1)
              lon = convert_to_degrees(lon_tag.values) * (-1 if lon_ref.values == 'W' else 1)
              return lat, lon
      return None, None

  def verify_geotag_authenticity(watermark_lat: float, watermark_lon: float, exif_lat: float, exif_lon: float):
      if exif_lat is None:
          return {"status": "EXIF_METADATA_STRIPPED_WARNING", "risk": "MEDIUM"}
      
      from geopy.distance import geodesic
      delta_km = geodesic((watermark_lat, watermark_lon), (exif_lat, exif_lon)).kilometers
      if delta_km > 0.5: # 500m threshold
          return {
              "violation": "MALICIOUS_GEOTAG_SPOOFING",
              "watermark_location": (watermark_lat, watermark_lon),
              "raw_camera_location": (exif_lat, exif_lon),
              "discrepancy_km": round(delta_km, 2),
              "action": "Immediate Criminal Impound of Contractor Security Deposit"
          }
      return {"status": "AUTHENTIC"}
  ```

---

### 📍 [LOOP 34 / 50] ANALYSIS: Image Manipulation & Splice Forgery Detection (ELA)

**1. Current Implementation Baseline (What We Have):**
- Not currently implemented in `plan.md`.

**2. Identified Gaps & Weaknesses:**
- **Photoshop Inscription Board Forgery:** Fraudulent contractors take a photo of an existing completed school or road from 2018, digitally edit the text on the public inaugural stone plaque in Photoshop to show a new 2024 work ID and MP name, and upload it as proof of completion.

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Error Level Analysis (ELA) & Copy-Move Forgery Detector:**
  Resaves the image at 95% JPEG compression and measures pixel-level compression artifact differences. Digitally pasted text or cloned regions exhibit drastically different compression error rates compared to the authentic optical background.

**4. Deep Technical & Architectural Specification:**
- **ELA Python Engine:**
  ```python
  from PIL import Image, ImageChops, ImageEnhance

  def perform_error_level_analysis(image_path: str, quality=90, scale=15):
      original = Image.open(image_path).convert('RGB')
      temp_path = "scratch/temp_ela.jpg"
      original.save(temp_path, 'JPEG', quality=quality)
      
      resaved = Image.open(temp_path)
      ela_diff = ImageChops.difference(original, resaved)
      
      extrema = ela_diff.getextrema()
      max_diff = max([ex[1] for ex in extrema])
      if max_diff == 0:
          max_diff = 1
      scale_factor = 255.0 / max_diff
      ela_diff = ImageEnhance.Brightness(ela_diff).enhance(scale_factor)
      
      # Detect localized hot spots in text bounding box region
      ela_stat = np.array(ela_diff).mean()
      is_forged = ela_stat > 35.0 # High artifact variance
      return {"is_spliced_forgery": is_forged, "ela_artifact_score": round(ela_stat, 2)}
  ```

---

### 📍 [LOOP 35 / 50] ANALYSIS: Physical Work Progression Temporal Verification

**1. Current Implementation Baseline (What We Have):**
- Tracks stage names (`Sanction`, `Physical Inspection`, `Work Completed`) from portal text.

**2. Identified Gaps & Weaknesses:**
- **Stage Inversion Fraud:** A contractor uploads a photo of a fully finished building for "Stage 1: Sanction", and later uploads a photo of an empty dug foundation for "Stage 4: Work Completed", because photos from different sites were carelessly mixed up. The system currently evaluates photos in isolation without sequential visual coherence.

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Temporal Stage Coherence Classifier (ResNet-50 Milestone Progression):**
  Classifies uploaded images into 3 visual civil engineering phases:
  - *Phase A:* Raw earth / excavation / foundation.
  - *Phase B:* Structural RCC pillar framework / unplastered brickwork.
  - *Phase C:* Plastered, painted, finished building with roof and signboard.
  Verifies that photos uploaded chronologically follow monotonic progression: $\text{Phase A} \to \text{Phase B} \to \text{Phase C}$. Any reverse transition triggers a `PROGRESSION_STAGE_INVERSION_ALERT`.

**4. Deep Technical & Architectural Specification:**
- **Transition State Machine:**
  $$\text{Valid Transitions: } A \to B, B \to C, A \to C$$
  $$\text{Invalid Transitions: } C \to A, C \to B, B \to A \implies \text{CRITICAL FRAUD FLAG}$$

---

### 📍 [LOOP 36 / 50] ANALYSIS: Plan 6.1 FastAPI Core REST Endpoints & In-Memory Caching

**1. Current Implementation Baseline (What We Have):**
- REST endpoints in `backend/main.py`: `GET /api/stats`, `GET /api/works`, `GET /api/benford`, etc.

**2. Identified Gaps & Weaknesses:**
- **Repeated Heavy Aggregations:** Endpoints like `/api/stats` and `/api/benford` run complex `GROUP BY` and $\chi^2$ calculations across 109,127 rows on every page refresh. Under live evaluation with multiple judges clicking tabs simultaneously, database CPU spikes to 100% and latency exceeds 2 seconds.

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Tiered In-Memory LRU Caching with Asynchronous Background Stale-While-Revalidate:**
  Implements an in-memory cached state for national macro metrics with a 60-second TTL. Queries return in **< 4 milliseconds** while background worker threads re-compute heavy aggregations silently.

**4. Deep Technical & Architectural Specification:**
- **FastAPI Cache Decorator:**
  ```python
  from functools import lru_cache
  import time

  class TimedCache:
      def __init__(self, ttl_seconds=60):
          self.ttl = ttl_seconds
          self.cache = {}

      def get(self, key):
          if key in self.cache:
              val, expiry = self.cache[key]
              if time.time() < expiry:
                  return val
          return None

      def set(self, key, val):
          self.cache[key] = (val, time.time() + self.ttl)

  kpi_cache = TimedCache(ttl_seconds=120)
  ```

---

### 📍 [LOOP 37 / 50] ANALYSIS: Plan 6.1 Role-Based Access Control & DPDP Act 2023 Compliance

**1. Current Implementation Baseline (What We Have):**
- Bank account masking (`XXXX-XXXX-1234`) in UI; RBAC mentioned in plan diagram.

**2. Identified Gaps & Weaknesses:**
- **Client-Side Masking Vulnerability:** If the backend sends the raw account number `125002807586` in the JSON API payload and the React frontend masks it with JavaScript, any user opening Chrome DevTools can inspect the network response and steal contractor bank details, violating the **Digital Personal Data Protection (DPDP) Act 2023** and RBI circulars.
- **Missing Fine-Grained JWT Roles:** No distinction between District Collector, CAG Auditor, and Public Citizen.

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Server-Side Zero-Trust Masking & Cryptographic JWT RBAC Enforcement:**
  All PII (Bank Accounts, Aadhaar Numbers, Contractor Mobile Numbers) is masked **at the database query layer** before the JSON leaves the FastAPI server. Full unmasked details are only unsealed if the request carries a digitally signed `CVC_CHIEF_VIGILANCE_OFFICER` JWT with an active statutory inspection warrant.

**4. Deep Technical & Architectural Specification:**
- **FastAPI PII Serializer:**
  ```python
  def mask_financial_account(account_no: str, user_role: str) -> str:
      if not account_no:
          return "N/A"
      if user_role == "CVC_SUPER_ADMIN":
          return account_no
      # Server-side redaction per DPDP Act 2023
      acc_str = str(account_no).strip()
      return f"XXXX-XXXX-{acc_str[-4:]}" if len(acc_str) >= 4 else "XXXX"
  ```

---

### 📍 [LOOP 38 / 50] ANALYSIS: Plan 6.2 Gemini Secretary AI Briefing Generator

**1. Current Implementation Baseline (What We Have):**
- `llm/explain.py` generates 1-minute plain-English executive summaries citing red-flagged entities.

**2. Identified Gaps & Weaknesses:**
- **Hallucination Liability:** In government vigilance investigations, an AI model that hallucinates a non-existent corruption accusation against a sitting Member of Parliament can cause severe legal defamation and disqualify the hackathon team immediately!
- **Missing Statutory Citation Anchors:** Briefings summarize anomalies conversationally without quoting the exact Section, Clause, or Financial Rule broken.

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Strict RAG Statutory Citation Guardrails with Zero-Hallucination JSON Schemas:**
  Forces the LLM to output structured JSON adhering to a strict Pydantic schema with mandatory citations:
  `{"statutory_breach": "Clause 4.3", "exact_rule_text": "...", "factual_evidence": "...", "recommended_due_process": "..."}`. If the model generates a fact not grounded in the SQL database payload, an automated guardrail interceptor rejects the response and falls back to a deterministic template.

**4. Deep Technical & Architectural Specification:**
- **Pydantic Schema:**
  ```python
  from pydantic import BaseModel, Field

  class StatutoryVigilanceBriefing(BaseModel):
      executive_summary: str = Field(description="2-sentence factual overview without editorial opinion")
      violated_clauses: list[str] = Field(description="Exact clauses from MPLADS Guidelines 2023")
      financial_exposure_inr: float = Field(description="Exact amount in rupees under audit query")
      implicated_entities: list[str] = Field(description="Names of agencies/contractors extracted from official records")
      procedural_next_step: str = Field(description="Formal due process step under CVC Manual")
  ```

---

### 📍 [LOOP 39 / 50] ANALYSIS: Plan 6.3 ReportLab CVC/CAG Audit-Ready Forensic Dossier Generator

**1. Current Implementation Baseline (What We Have):**
- `backend/pdf_generator.py` generates PDF dossiers with formal letterhead and evidence exhibits.

**2. Identified Gaps & Weaknesses:**
- **Missing Evidentiary Certificate under Bharatiya Sakshya Adhiniyam (BSA) 2023:** Under Section 63 of the new Indian evidence law (formerly Section 65B of Indian Evidence Act), electronic records submitted to an investigative authority are legally inadmissible unless accompanied by a formal **Electronic Record Authenticity Certificate** signed by the system custodian detailing hash algorithms, server timestamps, and device serials.

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **Section 63 BSA 2023 Digital Certificate of Evidence Auto-Appended to PDF Dossiers:**
  Every generated CVC/CAG dossier automatically generates a formal Schedule II Certificate of Electronic Evidence as Page 4, containing the SHA-256 hash of the database row, the server epoch timestamp, and a cryptographically generated QR verification code.

**4. Deep Technical & Architectural Specification:**
- **ReportLab Template Additions:**
  ```python
  def append_bsa_section63_certificate(story, styles, work_id: str, sha256_hash: str):
      story.append(Paragraph("<b>FORM II: CERTIFICATE UNDER SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023</b>", styles['Heading2']))
      cert_text = (
          f"I, System Custodian, Bharat-Drishti Vigilance Engine, hereby certify that the electronic record for Work ID {work_id} "
          f"bearing cryptographic hash {sha256_hash} was produced by a computer system operating normally during the ordinary course of business. "
          f"The digital contents have remained unaltered in the tamper-evident PostgreSQL audit vault."
      )
      story.append(Paragraph(cert_text, styles['Normal']))
  ```

---

### 📍 [LOOP 40 / 50] ANALYSIS: Plan 6.4 Tamper-Evident SHA-256 Hash Chained Audit Ledger

**1. Current Implementation Baseline (What We Have):**
- Sequential SHA-256 chaining in `audit_events_ledger` linking `current_hash` to `previous_hash`.

**2. Identified Gaps & Weaknesses:**
- **Single-Node Truncation Vulnerability:** If a malicious database administrator with direct access deletes the last 5 rows of `audit_events_ledger`, the remaining chain is still technically valid from Genesis to row $N-5$, and the deletion goes completely undetected unless external anchoring exists!

**3. SIH 2026 Winning Addition (What Best Useful Thing We Can Add):**
- **External Public Anchor Synchronization (RFC 3161 Timestamping & IPFS / GitHub Audit Commit):**
  Every 24 hours, the latest SHA-256 block hash is automatically pushed as an encrypted commit to an immutable external Git branch / RFC 3161 timestamping authority. If a rogue DBA alters or truncates rows in PostgreSQL, the system compares the database chain tip against the external anchor and immediately raises an alarm: `AUDIT_VAULT_TAMPER_DETECTED`.

**4. Deep Technical & Architectural Specification:**
- **Cryptographic Chaining Formula:**
  $$\text{Hash}_i = \text{SHA-256}\left(\text{EventID}_i \,\|\, \text{Timestamp}_i \,\|\, \text{WorkID}_i \,\|\, \text{ActorRole}_i \,\|\, \text{ActionType}_i \,\|\, \text{Justification}_i \,\|\, \text{Hash}_{i-1}\right)$$
- If $\text{Hash}_{i-1} \neq \text{Database}[\text{previous\_hash}_i]$, the entire audit ledger locks down in read-only forensic freeze mode.

---
"""

with open(target_path, "a", encoding="utf-8") as f:
    f.write(content)

print("Loops 31 to 40 appended successfully.")
