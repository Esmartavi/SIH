# 🔮 Future Innovation Blueprint: Multi-Modal Vision Auditor & ELA Forensics
**Status:** Reserved for Future Activation  
**Implementation File:** [`forensics/vision_auditor.py`](file:///c:/Users/shash/OneDrive/Desktop/hack_heritage/forensics/vision_auditor.py)

---

## 1. Why Standard YOLO is Not Used
Standard YOLOv8 (trained on MS COCO) is constrained to 80 generic consumer classes (cats, dogs, chairs, cell phones). It lacks classes for Indian public infrastructure:
- Cement Concrete (CC) Roads vs Unimproved Mud Tracks
- India Mark II Hand Pumps / Tube Wells
- Anganwadi Centres / Community Halls
- Crematorium Sheds & School Boundary Walls

---

## 2. The Preserved Architecture in [`forensics/vision_auditor.py`](file:///c:/Users/shash/OneDrive/Desktop/hack_heritage/forensics/vision_auditor.py)

### Component A: Error Level Analysis (ELA)
- **Technology:** Pure Python (`PIL`, `numpy`).
- **Function:** `generate_ela_heatmap(image_path, output_path)`
- **Mechanism:** Computes pixel-level difference matrices against a 90% recompressed JPEG buffer. Digitally modified regions (Photoshopped signboards, cloned stamps, spliced dates) exhibit elevated error levels and glow brightly.
- **Latency:** <50ms per photograph. Zero cloud dependencies.

### Component B: Open-Vocabulary Multimodal Vision Auditor
- **Technology:** Gemini Flash Vision (`google-genai` SDK with `GEMINI_API_KEY`).
- **Function:** `audit_asset_photo_gemini(image_path, work_title, sanction_amount, category)`
- **Mechanism:** Evaluates uploaded completion photos directly against official government project titles. Evaluates surface curing, concrete leveling, and drainage markers to detect **Ghost Assets** (e.g., claiming a CC Road on an empty mud field).

---

## 3. How to Activate When Ready
When ready to integrate into the live pipeline:
```bash
# Test on any photograph:
venv\Scripts\python forensics/vision_auditor.py --image images/extracted/sample.jpg --work-title "Construction of CC Road"
```
To expose on the frontend:
- Import `generate_ela_heatmap` and `audit_asset_photo_gemini` into [`backend/main.py`](file:///c:/Users/shash/OneDrive/Desktop/hack_heritage/backend/main.py) under `/api/work/{work_id}/vision-audit`.
- Add the `[Forensic ELA Heatmap]` toggle and `[Asset Verification Badge]` to [`frontend/src/components/CaseFileModal.jsx`](file:///c:/Users/shash/OneDrive/Desktop/hack_heritage/frontend/src/components/CaseFileModal.jsx).
