# 🚀 MPLADS Fraud Detection Platform — Frontend Integration Guide
> **Target Audience:** Frontend Developers (React / Next.js / Vue / Streamlit / HTML+JS)  
> **API Server Base URL:** `http://localhost:8000`  
> **Interactive Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)  
> **OpenAPI Schema (JSON):** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 🔑 1. Authentication & Role-Based Access Control (RBAC)

The system enforces strict Role-Based Access Control (RBAC). Data returned across maps, alerts, and metrics dynamically scopes to the logged-in user's role.

### Demo User Credentials (For Live Judge Demonstrations)

| Role | Username | Password | Access Scope & Capabilities |
| :--- | :--- | :--- | :--- |
| **MoSPI Ministry Official** | `ministry_admin` | `Ministry@2026` | **Full National Visibility**: all 20,000+ works, national choropleth map, full audit ledger, DA auto-flags, can trigger pipeline. |
| **State Nodal Authority** | `state_nodal_up` | `StateUP@2026` | **State Scoped**: filtered strictly to Uttar Pradesh works & districts. Can trigger pipeline. |
| **District Authority** | `district_pilibhit` | `District@2026` | **District Scoped**: filtered strictly to Pilibhit District works. Can review/dismiss alerts with written justification. |
| **Member of Parliament** | `mp_javed` | `MP@2026` | **MP Scoped**: filtered strictly to Shri Javed Ali Khan’s constituency works. Audit log tab is restricted/hidden. |

### Auth Endpoints

#### `POST /api/login`
Authenticates user and returns a signed JWT Bearer token (12-hour expiry).

* **Request Body:**
```json
{
  "username": "ministry_admin",
  "password": "Ministry@2026"
}
```

* **Success Response (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "ministry",
  "name": "MoSPI Ministry Official"
}
```

#### How to Pass Token in Subsequent Requests:
Add the header:
```http
Authorization: Bearer <access_token>
```
*(Note: If no token is provided, endpoints default to the national public view).*

---

## 📊 2. Executive KPIs Overview

#### `GET /api/kpis`
Instant executive statistics (total works, sanctioned amount, funds at critical risk, monopoly flags). Dynamically adapts to the authenticated user's role.

* **Headers:** `Authorization: Bearer <token>` (Optional)
* **Response Sample:**
```json
{
  "total_works": 20145,
  "total_sanctioned_amount": 2548200000.0,
  "total_spent_amount": 1824100000.0,
  "critical_count": 1842,
  "high_count": 4210,
  "medium_count": 8320,
  "low_count": 5773,
  "funds_at_critical_risk": 234100000.0,
  "funds_at_high_risk": 512000000.0,
  "total_funds_at_risk": 746100000.0,
  "monopoly_vendor_works": 312,
  "missing_photo_works": 680,
  "average_risk_score": 54.2
}
```

---

## 🗺️ 3. Geographic / Map Analytics (Views 1 & 2)

#### `GET /api/map/states`
Aggregates risk metrics per State for India Choropleth maps (Leaflet / Mapbox / D3).
* **Response Sample:**
```json
[
  {
    "state": "Uttar Pradesh",
    "total_works": 3410,
    "total_sanctioned": 420000000.0,
    "critical_count": 412,
    "high_count": 890,
    "funds_at_risk": 164000000.0,
    "critical_pct": 12.1,
    "avg_risk_score": 68.4
  }
]
```

#### `GET /api/map/districts?state=Uttar Pradesh`
Returns district rankings within a specific state.
* **Query Parameters:** `state` (optional, string)

---

## 🚨 4. Flagged Works & Live Alert Feed (View 4)

#### `GET /api/flags`
Paginated, sorted, and regex-safe searchable alert feed.

* **Query Parameters:**
  * `page` (int, default: 1)
  * `page_size` (int, default: 50, max: 500)
  * `risk_label` (string: `"CRITICAL"`, `"HIGH"`, `"MEDIUM"`, `"LOW"` or comma-separated `"CRITICAL,HIGH"`)
  * `state` (string, e.g. `"Uttar Pradesh"`)
  * `category` (string, e.g. `"Road"`)
  * `vendor_flag` (boolean: `true` or `false`)
  * `min_score` (float, e.g. `70.0`)
  * `search` (string: searches work_id, MP, vendor, description. **Supports brackets `(`, `[`, `*` safely**)
  * `sort_by` (string, default: `"risk_score"`, options: `"sanction_amount"`, `"total_spent"`, `"risk_score"`)
  * `sort_order` (string: `"desc"` or `"asc"`)

* **Response Structure:**
```json
{
  "total": 1842,
  "page": 1,
  "page_size": 50,
  "total_pages": 37,
  "items": [
    {
      "work_id": "MP-UP-1247",
      "mp_name": "Shri Javed Ali Khan",
      "state": "Uttar Pradesh",
      "work_category": "CC Road",
      "sanction_amount": 4500000.0,
      "total_spent": 4200000.0,
      "progress_pct": 25.0,
      "risk_score": 89.4,
      "risk_label": "CRITICAL",
      "reason": "Cost 340% above district avg; Payment released prior to geo-tagging; Vendor alias clustering detected",
      "work_top_vendor": "Sharma Constructions",
      "work_vendor_flag": true,
      "rule_missing_photo": true
    }
  ]
}
```

#### `GET /api/work/{work_id}`
360° deep dive for a single work, including complete ML signal breakdown and prior audit history.

#### `GET /api/filters`
Returns lists of available filter dropdown options:
```json
{
  "states": ["Andhra Pradesh", "Bihar", "Uttar Pradesh", ...],
  "categories": ["CC Road", "Drinking Water", "Hand Pump", ...],
  "risk_levels": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
  "mp_names": ["Shri Javed Ali Khan", ...]
}
```

---

## 🕸️ 5. Vendor Intelligence & Network Graph (View 5)

#### `GET /api/vendors/leaderboard?limit=50`
Ranks contractors by contract volume, sanctioned amounts, and monopoly flags.

#### `GET /api/vendors/network?top_n=30`
Direct graph data (Nodes & Links) designed specifically for interactive force-directed graph visualizers (`react-force-graph-2d`, `Cytoscape`, `Vis.js`, or `D3.js`).

* **Response Structure:**
```json
{
  "nodes": [
    {
      "id": "vendor_Sharma Constructions",
      "label": "Sharma Constructions",
      "type": "vendor",
      "val": 45000000.0,
      "risk": 82.5,
      "monopoly": true
    },
    {
      "id": "mp_Shri Javed Ali Khan",
      "label": "Shri Javed Ali Khan",
      "type": "mp",
      "val": 45000000.0,
      "risk": 78.0
    }
  ],
  "links": [
    {
      "source": "mp_Shri Javed Ali Khan",
      "target": "vendor_Sharma Constructions",
      "value": 45000000.0,
      "contracts": 14,
      "risk": 82.5
    }
  ]
}
```

#### 🎨 Recommended Visual Styling Rules for the Frontend:
* **Node Color Mapping by Risk:**
  * 🟢 Low Risk (`< 40`): `#10B981` (Emerald)
  * 🟡 Medium Risk (`41 - 60`): `#F59E0B` (Amber)
  * 🟠 High Risk (`61 - 80`): `#F97316` (Orange)
  * 🔴 Critical Risk (`> 80`): `#EF4444` (Crimson)
* **Node Size:** Proportional to `Math.max(4, Math.sqrt(node.val) / 500)` so major contractors visually dominate.
* **Shape / Icon:** 
  * `type === 'mp'`: Blue Star / Diamond (`#3B82F6`)
  * `type === 'vendor'`: Circle (Colored by risk)
* **Edge / Link Width:** Proportional to `Math.min(link.contracts, 8)`
* **On Node Click:** Open a drawer/card showing contractor profile (`/api/vendors/{vendor_name}`) with detected alias clusters and linked MPs!

#### 🏆 How to Present this "Demo Moment" to Judges:
> *"Judges, looking at raw spreadsheets, these appear to be independent contractors winning competitive tenders across different years. But when our AI runs Sentence Transformers for Identity Resolution, watch this network graph: Three distinct registered companies ('Sharma Const.', 'S. Constructions Pvt Ltd', and 'Sharma Builders') cluster into a single node receiving 78% of the MP's annual constituency budget. What was hidden in 20,000 rows of text is immediately exposed as contractor monopoly."*

#### `GET /api/vendors/{vendor_name}`
Detailed vendor profile showing detected alias variations (`["Sharma Const.", "S. Constructions Pvt Ltd"]`) and associated MPs.

---

## 👤 6. MP Specific Drill Down (View 3)

#### `GET /api/mp/{mp_name}`
Returns complete MP constituency drilldown: fund usage, works breakdown (Completed, In Progress, Delayed, Flagged), top contractor concentration, and works list.

---

## 📈 7. Trend Analysis (View 6)

#### `GET /api/trends`
Provides time-series data:
1. `monthly_trends`: Monthly sanctioned amount vs. average risk score (shows March financial year-end spending spikes).
2. `category_trends`: Delay rates, cost overrun rates, and critical alert counts grouped by category.

---

## 🛡️ 8. Anti-Tampering Audit Log (View 8)

#### `POST /api/audit/dismiss` (Enforced Accountability)
Logs an action when an official reviews or dismisses an alert.
* **Headers:** `Authorization: Bearer <token>` (Required)
* **Rule:** If action is dismissed, **written justification must be at least 50 characters** (HTTP 400 if less).
* **Request Body:**
```json
{
  "work_id": "MP-UP-1247",
  "action": "DISMISSED",
  "justification": "Field physical inspection conducted on 05-09-2026 by Executive Engineer. Geo-tag photos re-verified and verified compliant with district norms.",
  "original_risk_score": 89.4
}
```
* **Allowed Actions:** `"DISMISSED"`, `"CONFIRMED"`, `"ESCALATED"`, `"FALSE_POSITIVE"`, `"INSPECTION_ORDERED"`

#### `GET /api/audit`
Full audit ledger view (Restricted to `ministry` and `state` roles).

#### `GET /api/audit/da-flagged`
Returns list of District Authorities who dismissed **10+ CRITICAL alerts in 30 days** without escalation (Ministry View).

---

## 📸 9. Image Forensics & Document OCR (View 7)

#### `GET /api/image-forensics`
Returns forensic summary stats: total PDFs scanned, certificate amount mismatches (PDF vs. Portal), duplicate photos, and missing photo evidence.

#### `POST /api/image-forensics/run`
Triggers background image analysis without blocking the API.

#### `GET /api/image-forensics/status`
Poll status of running forensics: `{"is_running": false, "status": "idle"}`.

---

## 📥 10. Official CSV Export

#### `GET /api/export`
Downloads a filtered CSV report directly. Can pass `risk_label`, `state`, `category` query params.

---

## ⚡ 11. Automated Bulk Document Ingestion (Zero Manual Downloads)

Allows the dashboard to bulk-extract completion certificates and scanned PDFs directly from the official MoSPI MPLADS portal in the background without manual clicks.

#### `POST /api/forensics/bulk-download`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "limit": 20,
  "mp_name": "Mahesh Sharma",
  "state": "Uttar Pradesh",
  "min_amount": 500000,
  "workers": 5,
  "run_forensics_after": true
}
```
- **Response (`200 OK`):**
```json
{
  "status": "started",
  "message": "Bulk document download of up to 20 files queued in background."
}
```

#### `GET /api/forensics/bulk-download/status`
- **Response (`200 OK`):**
```json
{
  "is_running": false,
  "status": "success",
  "result": {
    "files_downloaded": 20,
    "total_indexed_files": 25,
    "output_directory": ".../images",
    "index_file": ".../images/downloaded_docs_index.json"
  }
}
```

---

## 💻 12. Quick Copy-Paste Frontend Snippets

### A. Login & Token Storage (JavaScript / TypeScript)
```javascript
async function loginUser(username, password) {
  const response = await fetch("http://localhost:8000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) throw new Error("Invalid Credentials");
  const data = await response.json();
  localStorage.setItem("mplads_token", data.access_token);
  localStorage.setItem("mplads_role", data.role);
  return data;
}
```

### B. Authenticated API Helper
```javascript
async function apiGet(endpoint, params = {}) {
  const token = localStorage.getItem("mplads_token");
  const url = new URL(`http://localhost:8000${endpoint}`);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
      url.searchParams.append(key, params[key]);
    }
  });

  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return await res.json();
}

// Example: Fetch paginated critical flags
const flags = await apiGet("/api/flags", { risk_label: "CRITICAL", page: 1, page_size: 20 });
```

### C. Submit Alert Action with 50-Char Justification
```javascript
async function submitAlertAction(workId, action, justification, originalRiskScore) {
  if (justification.trim().length < 50) {
    alert("MPLADS regulations require a minimum 50-character written justification.");
    return;
  }
  const token = localStorage.getItem("mplads_token");
  const res = await fetch("http://localhost:8000/api/audit/dismiss", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      work_id: workId,
      action: action,
      justification: justification,
      original_risk_score: originalRiskScore
    })
  });
  return await res.json();
}
```

### D. Rendering the Vendor Network Graph (React Component)
Using `react-force-graph-2d` (run `npm install react-force-graph-2d`):

```jsx
import React, { useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export function VendorNetworkGraph({ onSelectNode }) {
  const [data, setData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    fetch('http://localhost:8000/api/vendors/network?top_n=35')
      .then(res => res.json())
      .then(graph => setData(graph));
  }, []);

  const getNodeColor = node => {
    if (node.type === 'mp') return '#3B82F6'; // Blue for MP
    if (node.risk > 80) return '#EF4444';     // Red: Critical
    if (node.risk > 60) return '#F97316';     // Orange: High
    if (node.risk > 40) return '#F59E0B';     // Amber: Medium
    return '#10B981';                         // Green: Low
  };

  return (
    <div style={{ width: '100%', height: '600px', background: '#0F172A', borderRadius: '12px' }}>
      <ForceGraph2D
        graphData={data}
        nodeLabel={node => `${node.label} (${node.type.toUpperCase()})\nRisk Score: ${node.risk ? node.risk.toFixed(1) : 'N/A'}`}
        nodeColor={getNodeColor}
        nodeVal={node => Math.max(3, Math.sqrt(node.val) / 600)}
        linkColor={() => '#475569'}
        linkWidth={link => Math.min(link.contracts, 6)}
        onNodeClick={node => onSelectNode && onSelectNode(node)}
      />
    </div>
  );
}
```

---

## 🤖 13. AI Forensic Explain Layer (Gemini Flash)

The Explain Layer acts as an automated Senior CAG Forensic Auditor, transforming ML anomaly scores, vendor concentration indices, and Benford's Law findings into authoritative plain-English narratives.

### A. Case File Explanation for a Single Work
#### `GET /api/explain/work/{work_id}`
* **Path Parameter:** `work_id` (e.g. `WS/MP18371/2024-2025/163349` — URL encoded or plain)
* **Response Sample (`200 OK`):**
```json
{
  "status": "success",
  "work_id": "WS/MP18371/2024-2025/163349",
  "explanation": {
    "case_summary": "An audit of Work ID WS/MP18371/2024-2025/163349 (RCC market shed at Leimapokpam Bazar) revealed severe irregularities: ₹39.20 Lakhs (80% of budget) has been disbursed against only 20% physical completion. Additionally, contractor 'MURPHY THUMRAH' captures 86.9% of the MP's spend, and the project has been stalled for 534 days.",
    "red_flags": [
      "Premature Disbursal: 80% budget spent vs 20% physical progress",
      "Vendor Monopolization: Vendor captures 86.9% of MP constituency funds",
      "Timeline Stagnation: Stalled for 534 days under 'Vendor Identification'"
    ],
    "severity_verdict": "CRITICAL — Extreme risk of premature disbursement and vendor collusion",
    "recommended_action": "Order immediate on-site inspection by District Authority and freeze subsequent releases pending Measurement Book verification",
    "confidence_statement": "Validated by concurrent financial mismatch, vendor concentration, and timeline anomaly signals",
    "funds_at_risk_inr": 4900000.0
  }
}
```

### B. Real-Time Token Streaming (Server-Sent Events / SSE)
#### `GET /api/explain/work/{work_id}/stream`
* **Media Type:** `text/event-stream`
* **Format:** `data: <text_chunk>\n\n` ending with `data: [DONE]\n\n`
* **JavaScript / React Usage:**
```javascript
const evtSource = new EventSource(`http://localhost:8000/api/explain/work/${encodeURIComponent(workId)}/stream`);
evtSource.onmessage = (event) => {
  if (event.data === "[DONE]") {
    evtSource.close();
  } else {
    // Append chunk to live streaming narrative display
    setLiveNarrative(prev => prev + event.data);
  }
};
```

### C. MP Portfolio Forensic Intelligence
#### `GET /api/explain/mp?mp_name={name}`
* **Query Parameter:** `mp_name` (e.g. `Angomcha Bimol Akoijam`)
* **Response Sample (`200 OK`):**
```json
{
  "status": "success",
  "mp_name": "Angomcha Bimol Akoijam",
  "explanation": {
    "portfolio_summary": "MP portfolio exhibits acute systemic vendor concentration with ₹3.92 Cr identified at risk across critical projects.",
    "dominant_pattern": "Single contractor monopolization with delayed physical execution",
    "riskiest_works": [ ... ],
    "systemic_vs_isolated": "SYSTEMIC — Disproportionate allocation to top vendor across multiple sanctions",
    "recommended_action": "State Nodal Authority to conduct comprehensive procurement review across the MP's constituency works",
    "total_funds_at_risk_inr": 4900000.0
  }
}
```

### D. Ministry Executive Briefing
#### `GET /api/explain/briefing`
* **Response Sample (`200 OK`):**
```json
{
  "status": "success",
  "explanation": {
    "opening_paragraph": "National audit of 98,649 MPLADS works totaling ₹2,548 Cr reveals ₹746 Cr at risk...",
    "key_findings_paragraph": "Statistical forensics reveal Benford's Law non-conformity (MAD: 0.0251) and 37.1% round-number estimation bias...",
    "action_paragraph": "Recommended immediate directives for the Ministry Secretary...",
    "headline_stat": "₹234 Cr in critical review across 1,842 works",
    "top_states_of_concern": ["Manipur", "Uttar Pradesh", "Karnataka"]
  }
}
```

### E. Configuration & Health
* `GET /api/explain/models`: Returns active model name and supported feature list.
* `GET /api/explain/health`: Returns API key status and cache sizes.

