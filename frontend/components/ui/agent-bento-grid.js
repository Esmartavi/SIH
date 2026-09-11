/**
 * BHARAT-DRISHTI // UI Components
 * AgentBentoGrid Component
 * 
 * Bento Grid displaying autonomous Sentinel AI agents monitoring national MPLADS funds:
 * - Agent 01: Benford's Law Chi-Square Engine
 * - Agent 02: GFR 144 Tender Splitting Sentinel
 * - Agent 03: Contractor Monopoly & Syndicate Graph
 * - Agent 04: Perceptual Image Forensics (pHash & EXIF)
 * - Agent 05: LLM MoSPI Statutory Auditor & Briefing Generator
 * 
 * Supports:
 * - Import: import { AgentBentoGrid } from "@/components/ui/agent-bento-grid"
 * - Function mount: AgentBentoGrid(container, { className: "my-8" })
 * - Web Component: <agent-bento-grid class="my-8"></agent-bento-grid>
 */

import { StatsCounter } from "./stats-counter.js";

export const AGENT_DATA = [
  {
    id: "agent-01",
    agentNum: "AGENT-01",
    title: "Benford's Law Chi-Square Engine",
    category: "MATHEMATICAL ANOMALY SENTINEL",
    badge: "BENFORD χ²",
    badgeColor: "gold",
    status: "ACTIVE · 99.4% CONFIDENCE",
    description: "Evaluates empirical first and second digit distributions across all sanction outlays against Benford's logarithmic distribution to surface anomalous clustering.",
    statValue: 98649,
    statPrefix: "",
    statSuffix: " Works",
    statLabel: "Sanctions Scanned",
    subMetric: "χ² = 41.82 (P < 0.001 at Digit 1)",
    colSpan: "bento-col-2",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    details: [
      { label: "Spike Detected", val: "Digit 1 (44.2%)" },
      { label: "Expected Norm", val: "30.1% Log10" },
      { label: "Disbursement Risk", val: "₹612 Cr Flagged" }
    ]
  },
  {
    id: "agent-02",
    agentNum: "AGENT-02",
    title: "GFR 144 Split-Tender Sentinel",
    category: "PROCUREMENT INTEGRITY",
    badge: "GFR 144",
    badgeColor: "rose",
    status: "ACTIVE · REALTIME WATCH",
    description: "Detects artificial contract partitioning designed to evade the mandatory ₹25.0 Lakh Central Public Procurement (CPPP) e-tender portal.",
    statValue: 1248,
    statPrefix: "",
    statSuffix: "+",
    statLabel: "Cliffs Flagged",
    subMetric: "Capped at ₹24.85L (99.4% of limit)",
    colSpan: "bento-col-1",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
    details: [
      { label: "Threshold", val: "₹25.00 Lakh" },
      { label: "Cluster Band", val: "₹24.0L - ₹24.9L" }
    ]
  },
  {
    id: "agent-03",
    agentNum: "AGENT-03",
    title: "Contractor Monopoly & Syndicate Graph",
    category: "COLLUSION INTELLIGENCE",
    badge: "CVC MONOPOLY",
    badgeColor: "amber",
    status: "ACTIVE · 18,240 EDGES",
    description: "Constructs multi-nodal graph networks linking MPs, executing agencies, and contractors to detect cartel captures violating the CVC 35% concentration ceiling.",
    statValue: 341,
    statPrefix: "",
    statSuffix: " Cartels",
    statLabel: "Syndicates Isolated",
    subMetric: "Max concentration: 45.3% in single firm",
    colSpan: "bento-col-1",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    details: [
      { label: "CVC Ceiling", val: "≤ 35% Portfolio" },
      { label: "Cartel Works", val: "3,892 Captured" }
    ]
  },
  {
    id: "agent-04",
    agentNum: "AGENT-04",
    title: "Perceptual Image Forensics (pHash & EXIF)",
    category: "VISION AUDIT",
    badge: "IMAGE pHash",
    badgeColor: "teal",
    status: "ACTIVE · HAMMING DIST ≤ 5",
    description: "Computes discrete cosine transform perceptual hashes on completion photos to uncover recycled or stock photographic evidence submitted across multiple works.",
    statValue: 842,
    statPrefix: "",
    statSuffix: " Photos",
    statLabel: "Ghost Works Flagged",
    subMetric: "Delta ≤ 0.02 Hamming distance matches",
    colSpan: "bento-col-2",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    details: [
      { label: "Geotag Verification", val: "99.8% Match" },
      { label: "Cross-MP Re-use", val: "148 Cases" },
      { label: "Resolution", val: "EXIF Verified" }
    ]
  },
  {
    id: "agent-05",
    agentNum: "AGENT-05",
    title: "LLM MoSPI Statutory Auditor & Briefing Generator",
    category: "REGULATORY COMPLIANCE",
    badge: "MoSPI CLAUSE 3.2",
    badgeColor: "indigo",
    status: "ACTIVE · 774 DOSSIERS",
    description: "Monitors statutory fund allocations under Clause 3.2 (≥15% Scheduled Caste, ≥7.5% Scheduled Tribe) and generates automated executive briefing memos for the Ministry.",
    statValue: 774,
    statPrefix: "",
    statSuffix: " MPs",
    statLabel: "Portfolios Audited",
    subMetric: "Clause 3.2 Mandate: 18.2% SC · 8.5% ST Average",
    colSpan: "bento-col-3",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    details: [
      { label: "SC Allocation Target", val: "≥ 15.0% Mandated" },
      { label: "ST Allocation Target", val: "≥ 7.5% Mandated" },
      { label: "Briefing Latency", val: "2.1s Auto-Generated" },
      { label: "SHA-256 Ledger", val: "100% Immutable" }
    ]
  }
];

export function AgentBentoGrid(container, options = {}) {
  const className = options.className || "";

  const html = `
    <div class="agent-bento-wrapper ${className}">
      <div class="agent-bento-header">
        <div class="agent-bento-title-group">
          <div class="agent-bento-pill">
            <span class="sentinel-pulse-dot"></span>
            <span>AUTONOMOUS FORENSIC SENTINELS</span>
          </div>
          <h2 class="agent-bento-title">Multi-Agent AI Surveillance Grid</h2>
          <p class="agent-bento-desc">Five specialized intelligence agents continuously cross-evaluating 98,649 sanctioned works, mathematical digit distributions, and photographic integrity.</p>
        </div>
        <div class="agent-bento-badge-group">
          <span class="bento-status-badge">⚡ 5/5 AGENTS LIVE</span>
          <span class="bento-status-badge">🛡️ 2,491 CHECKS/HR</span>
        </div>
      </div>

      <div class="agent-bento-grid">
        ${AGENT_DATA.map(agent => `
          <div class="agent-bento-card ${agent.colSpan}" id="${agent.id}-card">
            <div class="bento-card-glow"></div>
            <div class="bento-card-top">
              <div class="bento-agent-tag">
                <span class="bento-agent-num">${agent.agentNum}</span>
                <span class="bento-agent-badge badge-${agent.badgeColor}">${agent.badge}</span>
              </div>
              <div class="bento-agent-icon">${agent.icon}</div>
            </div>

            <div class="bento-card-body">
              <div class="bento-category">${agent.category}</div>
              <h3 class="bento-card-title">${agent.title}</h3>
              <p class="bento-card-desc">${agent.description}</p>

              <div class="bento-stat-box">
                <div class="bento-stat-val">
                  <span class="stats-counter" data-target="${agent.statValue}" data-prefix="${agent.statPrefix}" data-suffix="${agent.statSuffix}" id="${agent.id}-counter">0</span>
                </div>
                <div class="bento-stat-label">${agent.statLabel}</div>
                <div class="bento-sub-metric">${agent.subMetric}</div>
              </div>

              <div class="bento-details-row">
                ${agent.details.map(d => `
                  <div class="bento-detail-pill">
                    <span class="bento-d-lbl">${d.label}:</span>
                    <span class="bento-d-val">${d.val}</span>
                  </div>
                `).join("")}
              </div>
            </div>

            <div class="bento-card-footer">
              <span class="bento-footer-status">
                <span class="bento-status-dot"></span>
                <span>${agent.status}</span>
              </span>
              <button class="bento-inspect-btn" data-agent-id="${agent.id}">Inspect Agent ↗</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  if (!container) return html;

  const targetEl = typeof container === "string" ? document.querySelector(container) : container;
  if (!targetEl) return html;

  targetEl.innerHTML = html;
  initBentoInteractions(targetEl);
  return targetEl;
}

export function initBentoInteractions(root = document) {
  // Activate StatsCounter for each bento card with ScrollTrigger
  root.querySelectorAll(".agent-bento-card").forEach(card => {
    const counterEl = card.querySelector(".stats-counter");
    if (!counterEl) return;

    const targetVal = parseFloat(counterEl.dataset.target) || 0;
    const prefix = counterEl.dataset.prefix || "";
    const suffix = counterEl.dataset.suffix || "";

    // StatsCounter with scrollTrigger activates when the user scrolls to it!
    const CounterClass = window.StatsCounter || StatsCounter;
    CounterClass.animate(counterEl, {
      value: targetVal,
      prefix: prefix,
      suffix: suffix,
      duration: 1.6,
      scrollTrigger: true,
      threshold: 0.15
    });
  });

  // Wire Inspect Agent button clicks to relevant views
  root.querySelectorAll(".bento-inspect-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const agentId = btn.dataset.agentId;
      if (typeof window.setView === "function") {
        if (agentId === "agent-01") window.setView("benford");
        else if (agentId === "agent-02") {
          window.setView("alerts");
          setTimeout(() => {
            const chip = document.querySelector('[data-quick-filter="split"]');
            if (chip) chip.click();
          }, 100);
        } else if (agentId === "agent-03") window.setView("vendors");
        else if (agentId === "agent-04") {
          window.setView("alerts");
          setTimeout(() => {
            const chip = document.querySelector('[data-quick-filter="ghost"]');
            if (chip) chip.click();
          }, 100);
        } else if (agentId === "agent-05") window.setView("mp");
      }
    });
  });
}

// React-compatible Demo Export
export function AgentBentoGridDemo() {
  return AgentBentoGrid(null, { className: "my-8" });
}

// Custom Web Component <agent-bento-grid>
if (typeof customElements !== "undefined" && !customElements.get("agent-bento-grid")) {
  class AgentBentoGridElement extends HTMLElement {
    connectedCallback() {
      const cls = this.getAttribute("class") || this.className || "my-8";
      AgentBentoGrid(this, { className: cls });
    }
  }
  customElements.define("agent-bento-grid", AgentBentoGridElement);
}

if (typeof window !== "undefined") {
  window.AgentBentoGrid = AgentBentoGrid;
  window.AgentBentoGridDemo = AgentBentoGridDemo;
}
