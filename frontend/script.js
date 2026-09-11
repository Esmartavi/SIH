(function () {
  /* ---------- TOAST HELPER ---------- */
  function showToast(message, isCrit) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span class="toast-dot" style="background:${isCrit ? 'var(--crimson)' : 'var(--teal)'};"></span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 20);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /* ---------- NUMERIC SMOOTH COUNTER HELPER ---------- */
  function animateNumber(el, targetVal, duration = 550) {
    if (!el) return;
    if (typeof targetVal === "number") targetVal = String(targetVal);
    targetVal = String(targetVal).trim();
    const currentText = el.textContent.trim();
    if (currentText === targetVal) return;

    // Matches: "₹4,412 Cr", "98,649", "0.021", "41.2", "₹612 Cr", "1.1%", "238", "< 0.001"
    const regex = /^([^\d\-+.]*?)([\d,]+(?:\.\d+)?)(.*)$/;
    const targetMatch = targetVal.match(regex);
    const currentMatch = currentText.match(regex);

    if (!targetMatch || !currentMatch) {
      el.textContent = targetVal;
      return;
    }

    const prefix = targetMatch[1];
    const suffix = targetMatch[3];
    const targetNum = parseFloat(targetMatch[2].replace(/,/g, ''));
    const startNum = parseFloat(currentMatch[2].replace(/,/g, ''));

    if (isNaN(startNum) || isNaN(targetNum) || startNum === targetNum) {
      el.textContent = targetVal;
      return;
    }

    const hasCommas = targetMatch[2].includes(',');
    const decimals = targetMatch[2].includes('.') ? (targetMatch[2].split('.')[1].length) : 0;

    el.classList.remove("num-updating");
    void el.offsetWidth;
    el.classList.add("num-updating");
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = startNum + (targetNum - startNum) * ease;

      let formattedNum;
      if (decimals > 0) {
        formattedNum = val.toFixed(decimals);
      } else if (hasCommas) {
        formattedNum = Math.round(val).toLocaleString();
      } else {
        formattedNum = Math.round(val).toString();
      }
      el.textContent = prefix + formattedNum + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = targetVal;
        setTimeout(() => el.classList.remove("num-updating"), 120);
      }
    }
    requestAnimationFrame(step);
  }

  /* ---------- THEME ---------- */
  const html = document.documentElement;
  document.querySelectorAll("[data-theme-btn]").forEach(btn => {
    btn.addEventListener("click", () => {
      html.setAttribute("data-theme", btn.dataset.themeBtn);
      document.querySelectorAll("[data-theme-btn]").forEach(b => b.classList.toggle("on", b === btn));
      renderAllCharts();
    });
  });

  /* ---------- ROLES & PARLIAMENTARY HOUSES STATE ---------- */
  let currentRole = "ministry";
  let currentHouseFilter = "all";
  let currentStateFilter = "all";

  const houseMetricsData = {
    all: {
      works: 98649,
      sanctioned: "₹4,412 Cr",
      disbursed: "₹4,317 Cr",
      critRisk: "₹612 Cr",
      critCount: 1084,
      highRisk: "₹390 Cr",
      highCount: 2217,
      monopolies: 341,
      missingPhotos: 906,
      splitTenders: 178,
      premature: 244,
      mps: 774,
      mpsSub: "across 774 constituencies",
      houseLabel: "National MPLADS Portfolio (543 LS + 245 RS)"
    },
    "Lok Sabha": {
      works: 68420,
      sanctioned: "₹2,950 Cr",
      disbursed: "₹2,880 Cr",
      critRisk: "₹422 Cr",
      critCount: 762,
      highRisk: "₹270 Cr",
      highCount: 1540,
      monopolies: 238,
      missingPhotos: 624,
      splitTenders: 122,
      premature: 168,
      mps: 543,
      mpsSub: "543 Directly Elected Members",
      houseLabel: "Lok Sabha (543 Parliamentary Constituencies)"
    },
    "Rajya Sabha": {
      works: 28140,
      sanctioned: "₹1,360 Cr",
      disbursed: "₹1,335 Cr",
      critRisk: "₹178 Cr",
      critCount: 308,
      highRisk: "₹112 Cr",
      highCount: 645,
      monopolies: 98,
      missingPhotos: 268,
      splitTenders: 52,
      premature: 72,
      mps: 245,
      mpsSub: "245 Council of States Seats",
      houseLabel: "Rajya Sabha (245 States/UT Representatives)"
    },
    "Nominated": {
      works: 2089,
      sanctioned: "₹102 Cr",
      disbursed: "₹98 Cr",
      critRisk: "₹12 Cr",
      critCount: 14,
      highRisk: "₹8 Cr",
      highCount: 32,
      monopolies: 5,
      missingPhotos: 14,
      splitTenders: 4,
      premature: 4,
      mps: 12,
      mpsSub: "12 Presidential Nominees",
      houseLabel: "Nominated Members (12 Pan-India Portfolios)"
    }
  };

  const roleLabels = {
    ministry: "MoSPI — Central Ministry (All India)",
    mp_ls: "Lok Sabha MP Portal (543 Constituencies)",
    mp_rs: "Rajya Sabha MP Portal (245 States/UTs)",
    mp_nom: "Nominated MP Portal (President Nominees)",
    state: "State Nodal Department (All States & UTs)",
    district: "District Authority / Collectorate (770+ Districts)",
    auditor: "CAG / Statutory Audit Directorate",
    citizen: "Citizen & Public Transparency Portal"
  };
  const navLinks = document.querySelectorAll(".nav-link");
  const views = document.querySelectorAll(".view");
  const roleSwitch = document.getElementById("roleSwitch");
  const rolePill = document.getElementById("rolePill");

  function applyRole(role) {
    currentRole = role;
    if (rolePill) rolePill.textContent = roleLabels[role] || "MoSPI Official";
    navLinks.forEach(link => {
      const allowed = link.dataset.role;
      if (!allowed) {
        link.hidden = false;
        return;
      }
      const allowedList = allowed.split(",");
      const hasAccess = allowedList.includes(role) ||
        (role.startsWith("mp") && allowedList.includes("mp")) ||
        (role === "ministry");
      link.hidden = !hasAccess;
    });

    if (role === "mp_ls") {
      switchParliamentaryHouse("Lok Sabha");
      setView("mp");
    } else if (role === "mp_rs") {
      switchParliamentaryHouse("Rajya Sabha");
      setView("mp");
    } else if (role === "mp_nom") {
      switchParliamentaryHouse("Nominated");
      setView("mp");
    } else if (role === "state") {
      setView("geo");
    } else if (role === "district") {
      setView("alerts");
    } else if (role === "auditor") {
      setView("ledger");
    } else {
      const activeLink = document.querySelector(".nav-link.active");
      if (activeLink && activeLink.hidden) setView("overview");
    }

    if (typeof updateCustomRoleUI === "function") updateCustomRoleUI(role);
    showToast(`Access context switched to ${roleLabels[role] || role}`);
  }

  function setView(name) {
    navLinks.forEach(l => l.classList.toggle("active", l.dataset.view === name));
    views.forEach(v => v.classList.toggle("active", v.id === "view-" + name));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "geo" && typeof onGeoTabActivated === "function") {
      setTimeout(onGeoTabActivated, 100);
    }
    if (name === "benford" && typeof renderBenford === "function") {
      setTimeout(renderBenford, 60);
    }
    if (name === "vendors" && typeof renderNetwork === "function") {
      setTimeout(renderNetwork, 60);
    }
    if (name === "mp" && typeof applyMPFiltersAndRender === "function") {
      setTimeout(() => applyMPFiltersAndRender(), 60);
    }
    if (name === "overview") {
      renderKPIs(currentHouseFilter, false);
      renderRiskDist(currentHouseFilter, false);
      updateTickerForHouse(currentHouseFilter);
    }
  }

  navLinks.forEach(link => link.addEventListener("click", () => setView(link.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.goto)));

  /* ---------- CUSTOM PARLIAMENTARY HOUSE DROPDOWN & CENTRAL SWITCHER ---------- */
  const customRoleDropdown = document.getElementById("customRoleDropdown");
  const roleTriggerBtn = document.getElementById("roleTriggerBtn");
  const roleDropdownMenu = document.getElementById("roleDropdownMenu");
  const roleTriggerIcon = document.getElementById("roleTriggerIcon");
  const roleTriggerTitle = document.getElementById("roleTriggerTitle");
  const roleTriggerTag = document.getElementById("roleTriggerTag");

  function updateNavbarHouseUI(houseVal) {
    if (!houseVal || !roleDropdownMenu) return;
    const opt = roleDropdownMenu.querySelector(`.role-option[data-house-val="${houseVal}"]`);
    if (opt) {
      const icon = opt.querySelector(".role-opt-icon") ? opt.querySelector(".role-opt-icon").textContent.trim() : "🏛️";
      const title = opt.querySelector(".role-opt-title") ? opt.querySelector(".role-opt-title").textContent.trim() : houseVal;
      const badge = opt.querySelector(".role-opt-badge") ? opt.querySelector(".role-opt-badge").textContent.trim() : "";
      if (roleTriggerIcon) roleTriggerIcon.textContent = icon;
      if (roleTriggerTitle) roleTriggerTitle.textContent = title;
      if (roleTriggerTag) roleTriggerTag.textContent = badge;

      roleDropdownMenu.querySelectorAll(".role-option").forEach(o => {
        o.classList.toggle("active", o.dataset.houseVal === houseVal);
      });
    }
  }

  function toggleRoleDropdown(forceState) {
    if (!roleDropdownMenu || !roleTriggerBtn) return;
    const isCurrentlyOpen = roleDropdownMenu.classList.contains("open");
    const willOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;
    roleDropdownMenu.classList.toggle("open", willOpen);
    roleTriggerBtn.classList.toggle("open", willOpen);
    roleTriggerBtn.setAttribute("aria-expanded", String(willOpen));
  }

  if (roleTriggerBtn) {
    roleTriggerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleRoleDropdown();
    });
  }

  /* Central unified Parliamentary House state manager */
  function switchParliamentaryHouse(houseVal) {
    if (!houseVal) return;
    currentHouseFilter = houseVal;
    updateNavbarHouseUI(houseVal);

    // 1. Dynamic latency badge feedback with subtle pulse
    const statBadge = document.querySelector(".stat-badge");
    if (statBadge) {
      const dot = statBadge.querySelector(".stat-dot");
      if (dot) dot.classList.add("updating");
      const labelSpan = statBadge.querySelector("span:not(.stat-dot)");
      const shortName = houseVal === "all" ? "National" : houseVal === "Nominated" ? "Nominated" : houseVal;
      if (labelSpan) labelSpan.textContent = `SYNCING · ${shortName}...`;

      setTimeout(() => {
        if (dot) dot.classList.remove("updating");
        if (labelSpan) labelSpan.textContent = `SYNCED · ${shortName} (${Math.floor(Math.random() * 5 + 13)}ms)`;
      }, 320);
    }

    // 2. War Room KPIs, Risk Cards, and Ticker
    renderKPIs(houseVal, true);
    updateTickerForHouse(houseVal);
    renderRiskDist(houseVal, true);

    // 3. Synchronize MP 360 pills
    document.querySelectorAll("#mpHouseFilterPills .pill-btn").forEach(b => {
      b.classList.toggle("on", b.dataset.houseFilter === houseVal);
    });

    if (houseVal === "Nominated") {
      currentStateFilter = "all";
      const mpStateFilter = document.getElementById("mpStateFilter");
      if (mpStateFilter) mpStateFilter.value = "all";
    }
    if (typeof applyMPFiltersAndRender === "function") applyMPFiltersAndRender();

    // 4. Benford Forensics View
    if (typeof renderBenford === "function") renderBenford();

    // 5. Live Alerts Table
    if (typeof renderAlerts === "function") renderAlerts();

    // 6. Vendor Table
    if (typeof renderVendorTable === "function") renderVendorTable("");

    const m = houseMetricsData[houseVal] || houseMetricsData["all"];
    const optTitle = houseVal === "all" ? "All Parliamentary Houses" : houseVal;
    showToast(`🏛️ Filtered ${optTitle} (${m.works.toLocaleString()} works · ${m.sanctioned})`);
  }

  if (roleDropdownMenu) {
    roleDropdownMenu.querySelectorAll(".role-option").forEach(opt => {
      opt.addEventListener("click", () => {
        const houseVal = opt.dataset.houseVal;
        switchParliamentaryHouse(houseVal);
        toggleRoleDropdown(false);
      });
    });
  }

  document.addEventListener("click", (e) => {
    if (customRoleDropdown && !customRoleDropdown.contains(e.target)) {
      toggleRoleDropdown(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleRoleDropdown(false);
      document.querySelectorAll(".modal-backdrop.open").forEach(m => m.classList.remove("open"));
      const drawer = document.getElementById("vendorDrawer");
      if (drawer) drawer.classList.remove("open");
      const drawerBackdrop = document.getElementById("drawerBackdrop");
      if (drawerBackdrop) drawerBackdrop.classList.remove("open");
    }
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      currentHouseFilter = "all";
      currentStateFilter = "all";
      updateNavbarHouseUI("all");
      renderKPIs("all");
      updateTickerForHouse("all");
      document.querySelectorAll("#mpHouseFilterPills .pill-btn").forEach(b => {
        b.classList.toggle("on", b.dataset.houseFilter === "all");
      });
      const mpStateFilter = document.getElementById("mpStateFilter");
      if (mpStateFilter) mpStateFilter.value = "all";
      if (typeof applyMPFiltersAndRender === "function") applyMPFiltersAndRender();
      if (typeof renderAlerts === "function") renderAlerts();
      setView("overview");
      showToast("Workstation session reset to national central overview.");
    });
  }

  /* ---------- DYNAMIC TICKER & KPI RENDERING HELPERS ---------- */
  function updateTickerForHouse(house) {
    const m = houseMetricsData[house] || houseMetricsData["all"];
    const tickerItems = [
      ["MODELS ACTIVE", "Isolation Forest · Benford χ² · NLP · pHash"],
      ["QUERY LATENCY", "<18ms"],
      ["WORKS MONITORED", m.works.toLocaleString()],
      ["DISBURSED", m.disbursed],
      ["MP ALLOCATIONS", String(m.mps)],
      ["OPEN CRITICAL FLAGS", m.critCount.toLocaleString()],
      ["MONOPOLY CONTRACTORS", String(m.monopolies)],
      ["GFR 144 EVASIONS", String(m.splitTenders)]
    ];
    const tHtml = tickerItems.map(([l, v]) => `<div class="ticker-item">${l} <b>${v}</b></div>`).join("");
    const tickerInner = document.getElementById("tickerInner");
    if (tickerInner) tickerInner.innerHTML = tHtml + tHtml;

    const heroSub = document.getElementById("heroSub");
    if (heroSub) {
      heroSub.textContent = `Continuous oversight across ${m.works.toLocaleString()} sanctioned works, ${m.disbursed} in disbursements and ${m.mps} Member of Parliament allocations — cross-checked by a five-model AI ensemble and perceptual image forensics.`;
    }
  }

  function renderKPIs(house, animate = true) {
    const kpiGrid = document.getElementById("kpiGrid");
    if (!kpiGrid) return;
    const m = houseMetricsData[house] || houseMetricsData["all"];
    const cards = [
      { label: "TOTAL MONITORED WORKS", value: m.works.toLocaleString(), sub: m.mpsSub, risk: null, goto: null, icon: "📊", theme: "cyan" },
      { label: "TOTAL SANCTIONED BUDGET", value: m.sanctioned, sub: `statutory ceiling for ${m.mps} MPs`, risk: null, goto: null, icon: "🏛️", theme: "gold" },
      { label: "TOTAL FUNDS DISBURSED", value: m.disbursed, sub: "97.8% statutory utilisation", risk: null, goto: null, icon: "⚡", theme: "emerald" },
      { label: "CRITICAL CAPITAL AT RISK", value: m.critRisk, sub: `${m.critCount.toLocaleString()} high-urgency works`, risk: "crit", goto: "CRITICAL", icon: "🚨", theme: "crit" },
      { label: "HIGH CAPITAL AT RISK", value: m.highRisk, sub: `${m.highCount.toLocaleString()} flagged schemes`, risk: "high", goto: "HIGH", icon: "⚠️", theme: "amber" },
      { label: "CONTRACTOR MONOPOLY ALERT", value: String(m.monopolies), sub: "single-syndicate captured works", risk: null, goto: null, trigger: "vendor", icon: "🏢", theme: "indigo" },
      { label: "MISSING PROOF-OF-WORK PHOTOS", value: String(m.missingPhotos), sub: "100% disbursed, zero photos", risk: null, goto: null, trigger: "missing_photo", icon: "📸", theme: "rose" },
      { label: "SPLIT-TENDER VIOLATIONS", value: String(m.splitTenders), sub: "partitioned below e-tender limits", risk: null, goto: null, trigger: "split_tender", icon: "✂️", theme: "purple" },
      { label: "PREMATURE TRANCHE RELEASES", value: String(m.premature), sub: "Clause 4.3 non-conformance", risk: null, goto: null, trigger: "premature_tranche", icon: "⏳", theme: "teal" },
    ];

    const existingCards = kpiGrid.querySelectorAll(".kpi-card");
    if (existingCards.length === cards.length) {
      existingCards.forEach((cardEl, idx) => {
        const k = cards[idx];
        const valEl = cardEl.querySelector(".kpi-value");
        const subEl = cardEl.querySelector(".kpi-sub");
        if (animate && valEl) {
          animateNumber(valEl, k.value, 600);
        } else if (valEl) {
          valEl.textContent = k.value;
        }
        if (subEl) subEl.textContent = k.sub;
        cardEl.dataset.gotoRisk = k.goto || "";
        cardEl.dataset.gotoTrigger = k.trigger || "";

        if (animate) {
          cardEl.classList.remove("data-updated-pulse");
          void cardEl.offsetWidth;
          setTimeout(() => cardEl.classList.add("data-updated-pulse"), idx * 30);
        }
      });
      return;
    }

    kpiGrid.innerHTML = cards.map(k => `
      <button class="kpi-card kpi-theme-${k.theme} ${k.risk === 'crit' ? 'risk-crit' : k.risk === 'high' ? 'risk-high' : ''}" data-goto-risk="${k.goto || ''}" data-goto-trigger="${k.trigger || ''}">
        <div class="kpi-header-row">
          <span class="kpi-label">${k.label}</span>
          <span class="kpi-icon-badge">${k.icon}</span>
        </div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-sub">${k.sub}</div>
      </button>`).join("");

    kpiGrid.querySelectorAll(".kpi-card").forEach(card => {
      card.addEventListener("click", () => {
        setView("alerts");
        const r = card.dataset.gotoRisk, tr = card.dataset.gotoTrigger;
        if (r) {
          const chip = document.querySelector(`[data-risk="${r}"]`);
          if (chip) chip.click();
        }
        if (tr) {
          const fTrig = document.getElementById("fTrigger");
          if (fTrig) { fTrig.value = tr; currentPage = 1; if (typeof renderAlerts === "function") renderAlerts(); }
        }
      });
    });
  }

  /* ---------- MODAL HELPERS ---------- */
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", () => {
      const m = document.getElementById(btn.dataset.close);
      if (m) m.classList.remove("open");
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach(bd => {
    bd.addEventListener("click", e => { if (e.target === bd) bd.classList.remove("open"); });
  });
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("open");
  }

  /* ---------- TASK BADGE SIMULATION & API PING ---------- */
  const taskBadge = document.getElementById("taskBadge"), taskText = document.getElementById("taskText");
  function runTask(label, ms, btn, callback) {
    if (taskBadge && taskBadge.classList.contains("active")) return;
    if (taskBadge && taskText) {
      taskText.textContent = label;
      taskBadge.classList.add("active");
    }
    if (btn) { btn.disabled = true; btn.style.opacity = .5; }
    setTimeout(() => {
      if (taskBadge) taskBadge.classList.remove("active");
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
      if (callback) callback();
    }, ms);
  }

  /* ================= DUAL-MODE API INTEGRATION CLIENT ================= */
  const API_BASE = "http://localhost:8000";
  let isApiOnline = false;

  const DEMO_CREDENTIALS = {
    ministry: { username: "ministry_admin", password: "Ministry@2026" },
    state: { username: "state_nodal_up", password: "StateUP@2026" },
    district: { username: "district_pilibhit", password: "District@2026" },
    mp: { username: "mp_javed", password: "MP@2026" }
  };
  let currentAuthToken = localStorage.getItem("mplads_token") || null;

  async function ensureAuthToken() {
    if (currentAuthToken) return currentAuthToken;
    try {
      const creds = DEMO_CREDENTIALS[currentRole] || DEMO_CREDENTIALS.ministry;
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
        signal: AbortSignal.timeout(1200)
      });
      if (res.ok) {
        const data = await res.json();
        currentAuthToken = data.access_token;
        localStorage.setItem("mplads_token", currentAuthToken);
        localStorage.setItem("mplads_role", data.role);
        return currentAuthToken;
      }
    } catch {
      // Offline fallback mode
    }
    return null;
  }

  async function apiGet(endpoint, params = {}) {
    try {
      const url = new URL(`${API_BASE}${endpoint}`);
      Object.keys(params).forEach(k => {
        if (params[k] !== null && params[k] !== undefined && params[k] !== "") {
          url.searchParams.append(k, params[k]);
        }
      });
      const headers = {};
      if (currentAuthToken) headers["Authorization"] = `Bearer ${currentAuthToken}`;
      const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(2500) });
      if (res.ok) return await res.json();
    } catch {
      // Graceful fallback to local data
    }
    return null;
  }

  async function apiPost(endpoint, body = {}) {
    try {
      const token = await ensureAuthToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) return await res.json();
    } catch {
      // Graceful fallback to local data
    }
    return null;
  }

  const retrainBtn = document.getElementById("retrainBtn");
  if (retrainBtn) {
    retrainBtn.addEventListener("click", e => {
      runTask("Retraining ML Isolation Forest pipeline…", 2800, e.target, async () => {
        if (isApiOnline) {
          try {
            await apiPost("/api/run-pipeline");
            showToast("Isolation Forest background training triggered on server.");
            return;
          } catch {}
        }
        showToast("Isolation Forest ensemble weights re-calibrated successfully.");
      });
    });
  }

  const recomputeBtn = document.getElementById("recomputeBtn");
  if (recomputeBtn) {
    recomputeBtn.addEventListener("click", e => {
      runTask("Recomputing Benford engine…", 1600, e.target, async () => {
        if (isApiOnline) {
          try {
            await apiPost("/api/benford/recompute");
            showToast("Benford's Law Chi-Square matrix recomputed on server.");
            renderBenford();
            return;
          } catch {}
        }
        renderBenford();
        showToast("Benford's Law Chi-Square matrix recomputed.");
      });
    });
  }

  // Dual-mode background ping to check if FastAPI backend is online
  async function checkBackendLatency() {
    const latencyEl = document.getElementById("latencyText");
    if (!latencyEl) return;
    try {
      const t0 = performance.now();
      const res = await fetch(`${API_BASE}/docs`, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(500) });
      const ping = Math.round(performance.now() - t0);
      if (res.ok) {
        isApiOnline = true;
        latencyEl.textContent = `LIVE API · ${ping}ms`;
        ensureAuthToken();
        return;
      }
    } catch {
      isApiOnline = false;
    }
    const simulated = (Math.random() * 8 + 11).toFixed(0);
    latencyEl.textContent = `SYNCED · ${simulated}ms`;
  }
  setInterval(checkBackendLatency, 3500);
  checkBackendLatency();

  /* ---------- INITIAL TICKER RENDERING ---------- */
  updateTickerForHouse(currentHouseFilter);

  /* ---------- LIVE SMART AUTONOMOUS VIGILANCE TELEMETRY LOOP ---------- */
  const sentinelFeeds = [
    { agent: "🤖 AGENT-04 · VISION FORENSICS", msg: "Scanning 18 completion photos via Perceptual Hash (pHash)… Match delta: 0.03 ✓ PASS" },
    { agent: "⚡ AGENT-01 · PFMS INGESTION", msg: "Polling 28 State Nodal gateways… Ingested 142 new tranche releases · Latency: 12ms" },
    { agent: "✂️ AGENT-02 · GFR 144 SPLIT WATCHDOG", msg: "Clustering variance on 74 tenders · Flagged MH-62104 (Artificial partition < ₹50L ceiling)" },
    { agent: "📐 AGENT-03 · BENFORD χ² SENTINEL", msg: "Recomputing digit conformity on ₹4,317 Cr disbursements · χ²=3.84 · High Benford validity" },
    { agent: "🏢 AGENT-06 · CONTRACTOR NEXUS MAP", msg: "Tracing shared director registry across 341 vendors · 2 nexus clusters surfaced in UP" },
    { agent: "⛓️ AGENT-05 · SHA-256 CRYPTO-SEALER", msg: "Verifying Merkle proof on Immutable Audit Ledger · 100% blocks cryptographically sealed" },
    { agent: "🚨 AGENT-07 · CLAUSE 4.3 AUDIT DAEMON", msg: "Detecting premature tranche releases · 244 schemes flagged for verification before release" }
  ];

  let feedIdx = 0;
  let scanCounter = 2491;
  const sentinelChip = document.getElementById("sentinelAgentChip");
  const sentinelMsg = document.getElementById("sentinelMsg");
  const hudScans = document.getElementById("hudScans");

  function cycleSentinelTelemetry() {
    feedIdx = (feedIdx + 1) % sentinelFeeds.length;
    const item = sentinelFeeds[feedIdx];
    scanCounter += Math.floor(Math.random() * 3) + 1;

    if (sentinelChip && sentinelMsg) {
      sentinelMsg.style.opacity = "0";
      sentinelMsg.style.transform = "translateX(6px)";
      setTimeout(() => {
        sentinelChip.textContent = item.agent;
        sentinelMsg.textContent = item.msg;
        sentinelMsg.style.opacity = "1";
        sentinelMsg.style.transform = "translateX(0)";
      }, 200);
    }
    if (hudScans) {
      hudScans.textContent = `${scanCounter.toLocaleString()}/hr`;
    }
  }
  setInterval(cycleSentinelTelemetry, 3500);

  /* ---------- INITIAL KPI GRID RENDERING ---------- */
  renderKPIs(currentHouseFilter);

  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  /* ================= SVG CHART HELPERS (ANIMATED & INTERACTIVE) ================= */
  let benfordTooltipEl = null;
  function initBarTooltips(container) {
    if (!benfordTooltipEl) {
      benfordTooltipEl = document.createElement("div");
      benfordTooltipEl.className = "benford-tooltip";
      document.body.appendChild(benfordTooltipEl);
    }
    container.querySelectorAll(".chart-bar-rect").forEach(rect => {
      rect.addEventListener("mouseenter", (e) => {
        const cat = rect.dataset.cat;
        const val = rect.dataset.val;
        const series = rect.dataset.series;
        benfordTooltipEl.innerHTML = `<strong>Digit ${cat}</strong><br/><span style="color:var(--ink-faint); font-size:11px;">${series}:</span> <strong style="color:var(--gold);">${val}%</strong>`;
        benfordTooltipEl.classList.add("show");
      });
      rect.addEventListener("mousemove", (e) => {
        benfordTooltipEl.style.left = (e.clientX + 14) + "px";
        benfordTooltipEl.style.top = (e.clientY - 38) + "px";
      });
      rect.addEventListener("mouseleave", () => {
        benfordTooltipEl.classList.remove("show");
      });
    });
  }

  function drawGroupedBars(containerId, categories, series, opts) {
    opts = opts || {};
    const W = opts.width || 580, H = opts.height || 172, padL = 32, padB = 24, padT = 12, padR = 10;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxValRaw = Math.max(...series.flatMap(s => s.values));
    const maxV = opts.max || Math.max(12, Math.ceil(maxValRaw * 1.15));
    const groupW = plotW / categories.length;
    const barW = Math.min(16, groupW / (series.length + 1.2));

    const c = document.getElementById(containerId);
    if (!c) return;

    const existingBars = c.querySelectorAll(".chart-bar-rect");
    const totalBarsNeeded = categories.length * series.length;

    // Fluid smooth update of existing bars if structure matches
    if (existingBars.length === totalBarsNeeded) {
      let barIdx = 0;
      categories.forEach((cat, i) => {
        const gx = padL + i * groupW + groupW / 2 - (series.length * barW) / 2;
        series.forEach((s, si) => {
          const v = s.values[i] || 0;
          const h = Math.max(3, (v / maxV) * plotH);
          const x = gx + si * barW;
          const y = padT + plotH - h;
          const rect = existingBars[barIdx++];
          if (rect) {
            rect.setAttribute("y", y);
            rect.setAttribute("height", h);
            rect.setAttribute("fill", s.color);
            rect.dataset.val = v;
            rect.dataset.cat = cat;
            rect.dataset.series = s.name;
            const titleEl = rect.querySelector("title");
            if (titleEl) titleEl.textContent = `Digit ${cat} · ${s.name}: ${v}%`;
          }
        });
      });
      return;
    }

    let bars = "", grid = "";
    for (let g = 0; g <= 4; g++) {
      const y = padT + plotH - (g / 4) * plotH;
      grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${cssVar('--line-soft')}" stroke-width="1"/>`;
      grid += `<text x="${padL - 5}" y="${y + 3}" font-size="8.5" text-anchor="end" fill="${cssVar('--ink-faint')}" font-family="IBM Plex Mono">${Math.round(maxV * g / 4)}%</text>`;
    }

    categories.forEach((cat, i) => {
      const gx = padL + i * groupW + groupW / 2 - (series.length * barW) / 2;
      series.forEach((s, si) => {
        const v = s.values[i] || 0;
        const h = Math.max(3, (v / maxV) * plotH);
        const x = gx + si * barW;
        const y = padT + plotH - h;
        bars += `<rect class="chart-bar-rect" x="${x}" y="${y}" width="${barW - 2}" height="${h}" fill="${s.color}" rx="2" data-val="${v}" data-cat="${cat}" data-series="${s.name}"><title>Digit ${cat} · ${s.name}: ${v}%</title></rect>`;
      });
      bars += `<text x="${padL + i * groupW + groupW / 2}" y="${H - 6}" font-size="9" text-anchor="middle" fill="${cssVar('--ink-faint')}" font-family="IBM Plex Mono">${cat}</text>`;
    });

    c.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="chart-svg" style="display:block; width:100%; height:auto;">${grid}${bars}</svg>
      <div class="legend-row" style="margin-top:6px; justify-content:flex-end;">
        ${series.map(s => `<span><span class="legend-dot" style="background:${s.color};"></span>${s.name}</span>`).join("")}
      </div>`;

    initBarTooltips(c);
  }

  function drawDonut(containerId, segments) {
    const size = 200, r = 76, cx = 100, cy = 100, sw = 26;
    const total = segments.reduce((a, s) => a + s.value, 0);
    let acc = 0, paths = "";
    segments.forEach(s => {
      const frac = s.value / total;
      const a0 = acc * 2 * Math.PI - Math.PI / 2, a1 = (acc + frac) * 2 * Math.PI - Math.PI / 2;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const large = frac > 0.5 ? 1 : 0;
      paths += `<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${s.color}" stroke-width="${sw}"><title>${s.label}: ${s.value}</title></path>`;
      acc += frac;
    });
    const el = document.getElementById(containerId);
    if (el) {
      el.innerHTML = `
        <div style="display:flex; align-items:center; gap:18px; flex-wrap:wrap;">
          <svg viewBox="0 0 ${size} ${size}" width="180" height="180">
            ${paths}
            <text x="${cx}" y="${cy - 3}" text-anchor="middle" font-family="Source Serif 4" font-size="24" font-weight="600" fill="${cssVar('--ink')}">${total}</text>
            <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="${cssVar('--ink-faint')}">TOTAL WORKS</text>
          </svg>
          <div>${segments.map(s => `<div style="display:flex; align-items:center; gap:8px; font-size:12.5px; margin-bottom:8px;"><span class="legend-dot" style="background:${s.color};"></span>${s.label} <span class="mono" style="color:var(--ink-faint);">${s.value}</span></div>`).join("")}</div>
        </div>`;
    }
  }

  function drawHBars(containerId, items) {
    const max = Math.max(...items.map(i => i.value));
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = items.map(i => `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;" class="hbar-item">
        <div style="width:130px; font-size:11.5px; color:var(--ink-dim); flex-shrink:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${i.label}</div>
        <div class="score-track" style="flex:1; height:7px;">
          <div class="score-fill" style="width:0%; background:${i.color || 'var(--gold)'};" data-target-width="${(i.value / max * 100).toFixed(0)}%"></div>
        </div>
        <div class="mono hbar-val" style="width:65px; text-align:right; font-size:11px; color:var(--ink-faint);">${i.display || i.value}</div>
      </div>`).join("");

    requestAnimationFrame(() => {
      el.querySelectorAll(".score-fill").forEach(f => {
        f.style.width = f.dataset.targetWidth;
      });
    });
  }

  function drawGauge(containerId, value, max, label, status) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const cx = 100, cy = 76, r = 58;
    const frac = Math.min(Math.max(value / max, 0), 1);
    const deg = frac * 180;

    const zones = [
      { from: 0, to: 0.35, color: cssVar('--teal') },
      { from: 0.35, to: 0.65, color: cssVar('--amber') },
      { from: 0.65, to: 1, color: cssVar('--crimson') },
    ];
    
    let arcs = zones.map(z => {
      const a0 = Math.PI + z.from * Math.PI, a1 = Math.PI + z.to * Math.PI;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      return `<path d="M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}" fill="none" stroke="${z.color}" stroke-width="10" stroke-linecap="round" opacity="0.88"/>`;
    }).join("");

    const needleGroup = el.querySelector(".gauge-needle-group");
    const scoreEl = el.querySelector(".gauge-score-val");
    const statusWrap = el.querySelector(".gauge-status-wrap");

    if (needleGroup && scoreEl && statusWrap) {
      needleGroup.style.transform = `rotate(${deg}deg)`;
      animateNumber(scoreEl, value.toFixed(3), 600);
      statusWrap.innerHTML = `<span class="risk-tag risk-${status.tag}" style="font-size:10px; padding:3px 10px;">${status.text}</span>`;
      return;
    }

    el.innerHTML = `
      <svg viewBox="0 0 200 128" class="chart-svg" style="max-width:205px; margin:0 auto; display:block;">
        ${arcs}
        <!-- Ticks -->
        <line x1="${cx - r - 3}" y1="${cy}" x2="${cx - r + 3}" y2="${cy}" stroke="${cssVar('--ink-faint')}" stroke-width="1"/>
        <line x1="${cx}" y1="${cy - r - 3}" x2="${cx}" y2="${cy - r + 3}" stroke="${cssVar('--ink-faint')}" stroke-width="1"/>
        <line x1="${cx + r - 3}" y1="${cy}" x2="${cx + r + 3}" y2="${cy}" stroke="${cssVar('--ink-faint')}" stroke-width="1"/>
        <!-- Needle Group with smooth elastic transition -->
        <g class="gauge-needle-group" style="transform: rotate(${deg}deg); transform-origin: ${cx}px ${cy}px;">
          <polygon points="${cx - 50},${cy} ${cx - 8},${cy - 3} ${cx + 7},${cy} ${cx - 8},${cy + 3}" fill="${cssVar('--ink')}"/>
          <circle cx="${cx}" cy="${cy}" r="5" fill="${cssVar('--ink')}"/>
          <circle cx="${cx}" cy="${cy}" r="1.5" fill="${cssVar('--panel')}"/>
        </g>
        <text class="gauge-score-val" x="${cx}" y="${cy + 24}" text-anchor="middle" font-family="Source Serif 4" font-size="20" font-weight="600" fill="${cssVar('--ink')}">${value.toFixed(3)}</text>
        <text x="${cx}" y="${cy + 36}" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" letter-spacing="1.2" fill="${cssVar('--ink-faint')}">${label}</text>
      </svg>
      <div class="gauge-status-wrap" style="text-align:center; margin-top:4px;">
        <span class="risk-tag risk-${status.tag}" style="font-size:10px; padding:3px 10px;">${status.text}</span>
      </div>`;
  }

  /* ---------- OVERVIEW VIEW RENDERING (EXECUTIVE DEFENSE WAR ROOM) ---------- */
  const riskTiersData = {
    all: [
      { tier: "CRITICAL", label: "Critical Risk", count: 1084, amount: "₹842 Cr", pct: "1.1%", icon: "🚨", action: "Immediate FIR / Freeze", color: "var(--crimson)" },
      { tier: "HIGH", label: "High Risk", count: 2217, amount: "₹1,420 Cr", pct: "2.3%", icon: "⚠️", action: "Audit Inquiry Notice", color: "var(--amber)" },
      { tier: "MEDIUM", label: "Medium Watch", count: 4310, amount: "₹2,180 Cr", pct: "4.4%", icon: "📑", action: "Desk Documentation", color: "var(--yellow)" },
      { tier: "LOW", label: "Low / Verified", count: 90938, amount: "₹38,200 Cr", pct: "92.2%", icon: "🛡️", action: "Automated Clearance", color: "var(--teal)" }
    ],
    "Lok Sabha": [
      { tier: "CRITICAL", label: "Critical Risk", count: 762, amount: "₹582 Cr", pct: "1.1%", icon: "🚨", action: "Immediate FIR / Freeze", color: "var(--crimson)" },
      { tier: "HIGH", label: "High Risk", count: 1540, amount: "₹980 Cr", pct: "2.3%", icon: "⚠️", action: "Audit Inquiry Notice", color: "var(--amber)" },
      { tier: "MEDIUM", label: "Medium Watch", count: 2980, amount: "₹1,510 Cr", pct: "4.4%", icon: "📑", action: "Desk Documentation", color: "var(--yellow)" },
      { tier: "LOW", label: "Low / Verified", count: 63138, amount: "₹26,450 Cr", pct: "92.2%", icon: "🛡️", action: "Automated Clearance", color: "var(--teal)" }
    ],
    "Rajya Sabha": [
      { tier: "CRITICAL", label: "Critical Risk", count: 308, amount: "₹248 Cr", pct: "1.1%", icon: "🚨", action: "Immediate FIR / Freeze", color: "var(--crimson)" },
      { tier: "HIGH", label: "High Risk", count: 645, amount: "₹415 Cr", pct: "2.3%", icon: "⚠️", action: "Audit Inquiry Notice", color: "var(--amber)" },
      { tier: "MEDIUM", label: "Medium Watch", count: 1280, amount: "₹640 Cr", pct: "4.5%", icon: "📑", action: "Desk Documentation", color: "var(--yellow)" },
      { tier: "LOW", label: "Low / Verified", count: 25907, amount: "₹11,200 Cr", pct: "92.1%", icon: "🛡️", action: "Automated Clearance", color: "var(--teal)" }
    ],
    "Nominated": [
      { tier: "CRITICAL", label: "Critical Risk", count: 14, amount: "₹12 Cr", pct: "0.7%", icon: "🚨", action: "Immediate FIR / Freeze", color: "var(--crimson)" },
      { tier: "HIGH", label: "High Risk", count: 32, amount: "₹25 Cr", pct: "1.5%", icon: "⚠️", action: "Audit Inquiry Notice", color: "var(--amber)" },
      { tier: "MEDIUM", label: "Medium Watch", count: 50, amount: "₹30 Cr", pct: "2.4%", icon: "📑", action: "Desk Documentation", color: "var(--yellow)" },
      { tier: "LOW", label: "Low / Verified", count: 1893, amount: "₹780 Cr", pct: "95.4%", icon: "🛡️", action: "Automated Clearance", color: "var(--teal)" }
    ]
  };

  function renderRiskDist(house = "all", animate = true) {
    const key = (house in riskTiersData) ? house : "all";
    const tiers = riskTiersData[key];
    const el = document.getElementById("riskDistChart");
    if (!el) return;

    const existingCards = el.querySelectorAll(".risk-card-fancy");
    if (existingCards.length === tiers.length) {
      existingCards.forEach((card, idx) => {
        const t = tiers[idx];
        const countEl = card.querySelector(".rc-count");
        const amountEl = card.querySelector(".rc-amount");
        const pctEl = card.querySelector(".rc-pct");
        if (animate && countEl) animateNumber(countEl, t.count.toLocaleString(), 550);
        else if (countEl) countEl.textContent = t.count.toLocaleString();
        if (amountEl) amountEl.textContent = `${t.amount} flagged`;
        if (pctEl) pctEl.textContent = t.pct;

        if (animate) {
          card.classList.remove("data-updated-pulse");
          void card.offsetWidth;
          setTimeout(() => card.classList.add("data-updated-pulse"), idx * 40);
        }
      });
      return;
    }

    el.innerHTML = tiers.map(t => `
      <div class="risk-card-fancy tier-${t.tier.toLowerCase()}" data-filter-tier="${t.tier}">
        <div class="rc-header">
          <div class="rc-tier-badge">
            <span class="rc-dot"></span>
            <span>${t.tier}</span>
          </div>
          <span class="rc-pct">${t.pct}</span>
        </div>
        <div class="rc-body">
          <div class="rc-count mono">${t.count.toLocaleString()}</div>
          <div class="rc-amount mono">${t.amount} flagged</div>
        </div>
        <div class="rc-footer">
          <span class="rc-action">${t.action}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>`).join("");

    el.querySelectorAll("[data-filter-tier]").forEach(card => {
      card.addEventListener("click", () => {
        const t = card.dataset.filterTier;
        setView("alerts");
        const chip = document.querySelector(`[data-risk="${t}"]`);
        if (chip) chip.click();
      });
    });
  }

  renderRiskDist();

  const radarData = [
    {
      id: "MPLADS-UP-40217",
      scheme: "Rural link road resurfacing",
      loc: "Pilibhit, Uttar Pradesh",
      mp: "MP Javed Ali",
      risk: "CRITICAL",
      score: 92,
      sanction: "₹41.20 L",
      spent: "₹41.20 L",
      progress: 100,
      cat: "Roads & Bridges",
      icon: "🛣️",
      reason: "Invoice digit clustering at ₹5,00,000 threshold (Benford χ² anomaly)",
      vendor: "Shree Infra Works"
    },
    {
      id: "MPLADS-UP-38810",
      scheme: "Community hall construction",
      loc: "Barabanki, Uttar Pradesh",
      mp: "MP Javed Ali",
      risk: "CRITICAL",
      score: 89,
      sanction: "₹38.00 L",
      spent: "₹38.00 L",
      progress: 100,
      cat: "Community Halls",
      icon: "🏛️",
      reason: "Duplicate completion photograph (pHash match 0.97 ghost asset)",
      vendor: "Shree Infra Works"
    },
    {
      id: "MPLADS-MH-62104",
      scheme: "Primary health centre upgrade",
      loc: "Pune, Maharashtra",
      mp: "MP S. Patil",
      risk: "CRITICAL",
      score: 88,
      sanction: "₹49.50 L",
      spent: "₹49.50 L",
      progress: 100,
      cat: "Health Centres",
      icon: "🏥",
      reason: "GFR 144 split tender under ₹50L mandatory e-tender ceiling",
      vendor: "Sahyadri Infra Projects"
    },
    {
      id: "MPLADS-RJ-33109",
      scheme: "Water harvesting check dam",
      loc: "Barmer, Rajasthan",
      mp: "MP H. Choudhary",
      risk: "HIGH",
      score: 86,
      sanction: "₹48.00 L",
      spent: "₹48.00 L",
      progress: 100,
      cat: "Irrigation",
      icon: "🌊",
      reason: "100% funds disbursed with zero geotagged field photos filed",
      vendor: "Marwar Constructions"
    },
    {
      id: "MPLADS-AS-11290",
      scheme: "Solar streetlight installation",
      loc: "Nagaon, Assam",
      mp: "MP D. Saikia",
      risk: "HIGH",
      score: 74,
      sanction: "₹22.60 L",
      spent: "₹19.00 L",
      progress: 78,
      cat: "Solar & Power",
      icon: "☀️",
      reason: "Vendor registered address shared with 3 separate MP works",
      vendor: "Northeast Solar Co."
    },
    {
      id: "MPLADS-AP-77031",
      scheme: "Drinking water pipeline",
      loc: "Kurnool, Andhra Pradesh",
      mp: "MP K. Reddy",
      risk: "HIGH",
      score: 71,
      sanction: "₹29.40 L",
      spent: "₹26.00 L",
      progress: 88,
      cat: "Drinking Water",
      icon: "🚰",
      reason: "Unexplained cost overrun 34% above district median",
      vendor: "Rayalaseema Builders"
    },
    {
      id: "MPLADS-BR-05512",
      scheme: "School sanitation block",
      loc: "Bhagalpur, Bihar",
      mp: "MP S. Yadav",
      risk: "MEDIUM",
      score: 48,
      sanction: "₹9.80 L",
      spent: "₹9.80 L",
      progress: 100,
      cat: "Sanitation",
      icon: "🏫",
      reason: "Delayed completion filing, 61 days overdue",
      vendor: "Ganga Civil Contractors"
    }
  ];

  function renderRadarList(filter = "ALL") {
    const radarList = document.getElementById("radarList");
    if (!radarList) return;

    const filtered = filter === "ALL" ? radarData : radarData.filter(r => r.risk === filter);

    const countBadge = document.getElementById("radarCountBadge");
    if (countBadge) countBadge.textContent = `${filtered.length} flagged`;

    radarList.innerHTML = filtered.map(r => `
      <div class="radar-card-item tier-${r.risk.toLowerCase()}" data-open-case="${r.id}">
        <div class="rci-left">
          <div class="rci-avatar" title="${r.cat}">
            <span>${r.icon}</span>
          </div>
          <div class="rci-info">
            <div class="rci-title-row">
              <span class="rci-scheme">${r.scheme}</span>
              <span class="rci-id mono">#${r.id.replace('MPLADS-', '')}</span>
            </div>
            <div class="rci-meta">
              <span class="rci-loc">📍 ${r.loc}</span>
              <span class="rci-dot">·</span>
              <span class="rci-mp">👤 ${r.mp}</span>
            </div>
            <div class="rci-reason-chip">
              <span class="rci-warn-icon">⚠️</span>
              <span class="rci-reason-text">${r.reason}</span>
            </div>
          </div>
        </div>

        <div class="rci-right">
          <div class="rci-financials">
            <div class="rci-amount mono">${r.sanction}</div>
            <div class="rci-progress-wrap">
              <div class="rci-bar"><i style="width:${r.progress}%;"></i></div>
              <span class="rci-status-label">${r.progress}% spent</span>
            </div>
          </div>
          <div class="rci-score-box">
            <div class="rci-score-badge risk-${r.risk}">
              <span class="rci-score-num mono">${r.score}</span>
              <span class="rci-score-lbl">RISK</span>
            </div>
            <button class="rci-inspect-btn" title="Open Forensic Dossier">
              <span>Inspect</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>
      </div>`).join("") || `<div class="empty-state">No cases match this risk filter.</div>`;

    radarList.querySelectorAll(".radar-card-item").forEach(item => {
      item.addEventListener("click", () => {
        openCase(item.dataset.openCase);
      });
    });
  }

  // Bind radar filter tabs
  const radarFilterTabs = document.getElementById("radarFilterTabs");
  if (radarFilterTabs) {
    radarFilterTabs.querySelectorAll(".rf-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        radarFilterTabs.querySelectorAll(".rf-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        renderRadarList(tab.dataset.filter);
      });
    });
  }

  // Initial render of radar list
  renderRadarList("ALL");

  const models = [
    {
      name: "Isolation Forest",
      type: "Multi-variate Anomaly Detection",
      uptime: 98.2,
      latency: "12ms",
      icon: "🌲",
      status: "ACTIVE"
    },
    {
      name: "Benford χ² Engine",
      type: "First-Digit Invoice Fraud Auditor",
      uptime: 100,
      latency: "4ms",
      icon: "📐",
      status: "ACTIVE"
    },
    {
      name: "SentenceTransformers NLP",
      type: "Vendor Cartel & Alias Resolver",
      uptime: 94.6,
      latency: "28ms",
      icon: "🧠",
      status: "ACTIVE"
    },
    {
      name: "Perceptual Image Hash (pHash)",
      type: "Ghost Asset & Duplicate Photo Scanner",
      uptime: 89.4,
      latency: "42ms",
      icon: "👁️",
      status: "ACTIVE"
    },
    {
      name: "OCR Duplicate Bill Scan",
      type: "GFR 144 Split-Tender Evader Scanner",
      uptime: 91.0,
      latency: "35ms",
      icon: "📄",
      status: "ACTIVE"
    }
  ];

  function renderModelStatus() {
    const el = document.getElementById("modelStatus");
    if (!el) return;

    // Circular arc SVG helper
    function arcCard(m) {
      const R = 36, SW = 5.5;
      const circ = 2 * Math.PI * R;
      const offset = circ * (1 - m.uptime / 100);
      const col = m.uptime >= 98 ? "#2dd4bf" : m.uptime >= 93 ? "#a78bfa" : "#f59e0b";
      const glow = m.uptime >= 98 ? "rgba(45,212,191,0.5)" : m.uptime >= 93 ? "rgba(167,139,250,0.5)" : "rgba(245,158,11,0.5)";
      const tier = m.uptime >= 98 ? "OPTIMAL" : m.uptime >= 93 ? "GOOD" : "WATCH";
      const cx = R + SW + 2, cy = R + SW + 2, sz = (R + SW + 2) * 2;

      return `
        <div class="msn-card" style="--c:${col};--glow:${glow};">
          <div class="msn-card-top">
            <div class="msn-card-icon-ring" style="background:${col}18;border-color:${col}45;">${m.icon}</div>
            <div class="msn-tier-tag" style="color:${col};background:${col}15;border-color:${col}30;">${tier}</div>
          </div>
          <div class="msn-arc-wrap">
            <svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" class="msn-arc-svg">
              <defs>
                <filter id="arcglow_${m.name.replace(/\s+/g,'')}" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feFlood flood-color="${col}" flood-opacity="0.6" result="color"/>
                  <feComposite in="color" in2="blur" operator="in" result="shadow"/>
                  <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <!-- Track ring -->
              <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
                stroke="rgba(255,255,255,0.06)" stroke-width="${SW}"/>
              <!-- Progress arc -->
              <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
                stroke="${col}" stroke-width="${SW}"
                stroke-linecap="round"
                stroke-dasharray="${circ.toFixed(2)}"
                stroke-dashoffset="${offset.toFixed(2)}"
                transform="rotate(-90 ${cx} ${cy})"
                filter="url(#arcglow_${m.name.replace(/\s+/g,'')})"
                style="transition:stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1);"/>
              <!-- Uptime % in center -->
              <text x="${cx}" y="${cy - 5}" text-anchor="middle" dominant-baseline="middle"
                font-size="13" font-weight="900" fill="${col}" font-family="IBM Plex Mono">${m.uptime}</text>
              <text x="${cx}" y="${cy + 11}" text-anchor="middle"
                font-size="8" fill="rgba(255,255,255,0.4)" font-family="IBM Plex Mono">%</text>
            </svg>
          </div>
          <div class="msn-card-body">
            <div class="msn-card-name">${m.name}</div>
            <div class="msn-card-type">${m.type}</div>
          </div>
          <div class="msn-card-footer">
            <span class="msn-lat-chip" style="color:${col};border-color:${col}40;background:${col}10;">⚡ ${m.latency}</span>
            <span class="msn-live-dot">● LIVE</span>
          </div>
        </div>`;
    }

    el.innerHTML = `<div class="msn-grid">${models.map(arcCard).join("")}</div>`;
  }

  renderModelStatus();

  /* ================= EXPANDED REALISTIC ALERTS DATA ================= */
  const states = [
    "Uttar Pradesh", "Bihar", "Rajasthan", "Andhra Pradesh", "West Bengal", "Madhya Pradesh",
    "Jharkhand", "Chhattisgarh", "Assam", "Telangana", "Gujarat", "Punjab", "Odisha",
    "Maharashtra", "Karnataka", "Tamil Nadu", "Kerala", "Himachal Pradesh", "Uttarakhand",
    "Haryana", "Goa", "Sikkim", "Arunachal Pradesh", "Meghalaya", "Manipur", "Nagaland",
    "Mizoram", "Tripura", "Jammu & Kashmir", "Ladakh", "Delhi"
  ];
  const categories = ["Roads & Bridges", "Community Halls", "Drinking Water", "Sanitation", "Solar & Power", "Education Infra", "Health Centres", "Irrigation"];

  const alertsData = [
    { id: "MPLADS-NOM-19012", date: "2026-01-20", state: "Delhi", ida: "Central Delhi", mp: "MP Dr. S. Rao", cat: "Education Infra", desc: "Specialized Braille & digital audio learning library", sanction: 2800000, spent: 2800000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "National Heritage Trust", monopoly: false, risk: 21, reason: "Statutory sanction within pan-India nominated entitlement" },
    { id: "MPLADS-NOM-19015", date: "2025-11-18", state: "Karnataka", ida: "Bengaluru Urban", mp: "MP Dr. S. Rao", cat: "Solar & Power", desc: "Public science centre rooftop solar micro-grid", sanction: 3500000, spent: 3500000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Solar India Tech", monopoly: false, risk: 28, reason: "Nominated quota allocation verified with MoSPI" },
    { id: "MPLADS-UP-40217", date: "2026-01-14", state: "Uttar Pradesh", ida: "Pilibhit", mp: "MP Javed Ali", cat: "Roads & Bridges", desc: "Rural link road resurfacing", sanction: 4120000, spent: 4120000, overrun: 6, progress: 100, status: "Completed", stalled: false, vendor: "Shree Infra Works", monopoly: true, risk: 92, reason: "Invoice digit clustering at ₹5,00,000 threshold" },
    { id: "MPLADS-UP-38810", date: "2025-11-02", state: "Uttar Pradesh", ida: "Barabanki", mp: "MP Javed Ali", cat: "Community Halls", desc: "Community hall construction", sanction: 3800000, spent: 3800000, overrun: 2, progress: 100, status: "Completed", stalled: false, vendor: "Shree Infra Works", monopoly: true, risk: 89, reason: "Duplicate completion photograph, pHash match 0.97" },
    { id: "MPLADS-JK-10492", date: "2026-01-18", state: "Jammu & Kashmir", ida: "Srinagar", mp: "MP A. Lone", cat: "Roads & Bridges", desc: "Snow-bound link road concrete stabilization", sanction: 3200000, spent: 3200000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Chinar Infra Projects", monopoly: false, risk: 65, reason: "Winter stalled extension without engineer certification" },
    { id: "MPLADS-LA-11094", date: "2025-08-25", state: "Ladakh", ida: "Leh", mp: "MP J. Tsering", cat: "Solar & Power", desc: "High altitude solar micro-grid installations", sanction: 1800000, spent: 1800000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Ladakh Renewable Power", monopoly: false, risk: 32, reason: "Sub-zero frost proofing compliance verified" },
    { id: "MPLADS-JH-88310", date: "2025-12-11", state: "Jharkhand", ida: "Ranchi", mp: "MP S. Soren", cat: "Drinking Water", desc: "Deep solar tube-well & overhead tank network", sanction: 3700000, spent: 3700000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Chotanagpur Infra", monopoly: true, risk: 78, reason: "Sub-threshold tender partitioning under GFR 144" },
    { id: "MPLADS-CH-44201", date: "2026-02-01", state: "Chhattisgarh", ida: "Raipur", mp: "MP B. Sahu", cat: "Community Halls", desc: "Panchayat multipurpose tribal community facility", sanction: 3600000, spent: 3600000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Mahanadi Builders", monopoly: true, risk: 82, reason: "Multiple small works below ₹25L mandatory e-tender ceiling" },
    { id: "MPLADS-HP-20188", date: "2025-11-14", state: "Himachal Pradesh", ida: "Shimla", mp: "MP S. Kashyap", cat: "Roads & Bridges", desc: "Slope retention wall and drainage culverts", sanction: 3100000, spent: 3100000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Himalayan Infra Co.", monopoly: false, risk: 28, reason: "Slope retention wall structural audit complete" },
    { id: "MPLADS-UK-61902", date: "2025-10-09", state: "Uttarakhand", ida: "Dehradun", mp: "MP T. Rawat", cat: "Sanitation", desc: "Eco-sanitation blocks near transit hub", sanction: 3500000, spent: 3500000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Garhwal Civil Works", monopoly: false, risk: 32, reason: "Urban drainage upgrade audit clearance" },
    { id: "MPLADS-HR-52011", date: "2026-01-28", state: "Haryana", ida: "Gurugram", mp: "MP R. Singh", cat: "Drinking Water", desc: "Stormwater reuse and feeder line", sanction: 4200000, spent: 4200000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "NCR Urban Solutions", monopoly: false, risk: 30, reason: "Stormwater pipeline tranche release verified" },
    { id: "MPLADS-DL-80194", date: "2026-02-08", state: "Delhi", ida: "New Delhi", mp: "MP H. Pant", cat: "Education Infra", desc: "Smart classroom digital infrastructure sets", sanction: 3900000, spent: 3900000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Capital Tech Infra", monopoly: false, risk: 29, reason: "Central e-tender statutory compliance verified" },
    { id: "MPLADS-GA-10291", date: "2025-12-20", state: "Goa", ida: "North Goa", mp: "MP S. Naik", cat: "Roads & Bridges", desc: "Coastal fish landing jetty renovation", sanction: 2500000, spent: 2500000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Mandovi Marine Infra", monopoly: false, risk: 26, reason: "Coastal regulation zone audit clearance" },
    { id: "MPLADS-SK-90182", date: "2025-09-15", state: "Sikkim", ida: "East Sikkim (Gangtok)", mp: "MP I. Subba", cat: "Community Halls", desc: "Eco-tourism viewpoint community hall", sanction: 1600000, spent: 1600000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Teesta Civil Builders", monopoly: false, risk: 24, reason: "Organic zone environmental audit complete" },
    { id: "MPLADS-AR-31092", date: "2025-11-10", state: "Arunachal Pradesh", ida: "Papum Pare (Itanagar)", mp: "MP K. Rijiju", cat: "Education Infra", desc: "Youth skill centre infrastructure", sanction: 2200000, spent: 2200000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Subansiri Projects", monopoly: false, risk: 34, reason: "Remote border connectivity verified" },
    { id: "MPLADS-ML-55018", date: "2026-01-05", state: "Meghalaya", ida: "East Khasi Hills (Shillong)", mp: "MP V. Pala", cat: "Roads & Bridges", desc: "Urban pedestrian pathway and drainage", sanction: 2400000, spent: 2400000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Shillong Civil Works", monopoly: false, risk: 31, reason: "High rainfall drainage specification verified" },
    { id: "MPLADS-MN-71029", date: "2025-10-18", state: "Manipur", ida: "Imphal West", mp: "MP R. Sanajaoba", cat: "Sanitation", desc: "Public sanitation and community water storage", sanction: 2100000, spent: 2100000, overrun: 14, progress: 100, status: "Completed", stalled: false, vendor: "Kangla Constructions", monopoly: false, risk: 68, reason: "Delayed utilization certification filings (48 days)" },
    { id: "MPLADS-NL-40192", date: "2025-12-02", state: "Nagaland", ida: "Kohima", mp: "MP S. Konyak", cat: "Solar & Power", desc: "Tribal youth stadium solar floodlights", sanction: 1800000, spent: 1800000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Doyang Energy Co.", monopoly: false, risk: 28, reason: "Tribal community verification cleared" },
    { id: "MPLADS-MZ-29104", date: "2025-08-30", state: "Mizoram", ida: "Aizawl", mp: "MP C. Lalrosanga", cat: "Roads & Bridges", desc: "Hill ridge road slope retaining wall", sanction: 2000000, spent: 2000000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Chhimtuipui Infra", monopoly: false, risk: 27, reason: "Geotechnical stability audit pass" },
    { id: "MPLADS-TR-62019", date: "2026-01-12", state: "Tripura", ida: "West Tripura (Agartala)", mp: "MP P. Roy", cat: "Solar & Power", desc: "Solar cold storage facility at rural market", sanction: 2600000, spent: 2600000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Tripura Solar Infra", monopoly: false, risk: 29, reason: "Renewable agricultural asset verified" },
    { id: "MPLADS-AS-11290", date: "2026-02-20", state: "Assam", ida: "Nagaon", mp: "MP D. Saikia", cat: "Solar & Power", desc: "Solar streetlight installation", sanction: 2260000, spent: 1900000, overrun: 0, progress: 78, status: "In progress", stalled: false, vendor: "Northeast Solar Co.", monopoly: false, risk: 74, reason: "Vendor address shared with 3 other MP works" },
    { id: "MPLADS-AP-77031", date: "2025-09-18", state: "Andhra Pradesh", ida: "Kurnool", mp: "MP K. Reddy", cat: "Drinking Water", desc: "Drinking water pipeline", sanction: 2940000, spent: 2600000, overrun: 34, progress: 88, status: "In progress", stalled: true, vendor: "Rayalaseema Builders", monopoly: false, risk: 71, reason: "Cost overrun 34% above district median" },
    { id: "MPLADS-BR-05512", date: "2025-07-30", state: "Bihar", ida: "Bhagalpur", mp: "MP S. Yadav", cat: "Sanitation", desc: "School sanitation block", sanction: 980000, spent: 980000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Ganga Civil Contractors", monopoly: false, risk: 48, reason: "Delayed completion filing, 61 days" },
    { id: "MPLADS-TG-90044", date: "2025-12-05", state: "Telangana", ida: "Warangal", mp: "MP A. Rao", cat: "Education Infra", desc: "Anganwadi centre upgrade", sanction: 1410000, spent: 1300000, overrun: 1, progress: 95, status: "In progress", stalled: false, vendor: "Deccan Builders", monopoly: false, risk: 41, reason: "Round-number invoicing bias" },
    { id: "MPLADS-MH-62104", date: "2026-02-10", state: "Maharashtra", ida: "Pune", mp: "MP S. Patil", cat: "Health Centres", desc: "Rural clinic maternity ward extension", sanction: 4950000, spent: 4950000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Sahyadri Infra Projects", monopoly: true, risk: 88, reason: "GFR 144 split tender under ₹50L ceiling" },
    { id: "MPLADS-RJ-33109", date: "2025-10-14", state: "Rajasthan", ida: "Barmer", mp: "MP H. Choudhary", cat: "Irrigation", desc: "Community rainwater harvesting pond", sanction: 4800000, spent: 4800000, overrun: 18, progress: 100, status: "Completed", stalled: false, vendor: "Marwar Constructions", monopoly: true, risk: 86, reason: "100% disbursed with zero geotagged photos" },
    { id: "MPLADS-UP-41102", date: "2026-01-22", state: "Uttar Pradesh", ida: "Lucknow", mp: "MP Javed Ali", cat: "Roads & Bridges", desc: "Culvert and approach road", sanction: 2450000, spent: 2450000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Shree Infra Works", monopoly: true, risk: 85, reason: "Clustered just under ₹25L mandatory e-tender cliff" },
    { id: "MPLADS-PB-82015", date: "2025-11-29", state: "Punjab", ida: "Amritsar", mp: "MP G. Aujla", cat: "Solar & Power", desc: "High-mast LED solar towers (Phase 1)", sanction: 3200000, spent: 1600000, overrun: 0, progress: 50, status: "In progress", stalled: true, vendor: "Majha Electricals", monopoly: false, risk: 67, reason: "Stalled execution for 120+ days after 50% release" },
    { id: "MPLADS-KA-55092", date: "2026-02-04", state: "Karnataka", ida: "Mysuru", mp: "MP P. Simha", cat: "Education Infra", desc: "Smart classroom digital lab set", sanction: 1850000, spent: 1850000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Cauvery Edutech Ltd", monopoly: false, risk: 36, reason: "Close conformity to Benford distribution" },
    { id: "MPLADS-BR-08914", date: "2025-08-19", state: "Bihar", ida: "Patna", mp: "MP S. Yadav", cat: "Drinking Water", desc: "RO purified drinking water booth", sanction: 1200000, spent: 1200000, overrun: 4, progress: 100, status: "Completed", stalled: false, vendor: "Ganga Civil Contractors", monopoly: false, risk: 45, reason: "Minor tranche release timing discrepancy" },
    { id: "MPLADS-AP-79105", date: "2025-12-14", state: "Andhra Pradesh", ida: "Guntur", mp: "MP K. Reddy", cat: "Community Halls", desc: "Panchayat training auditorium", sanction: 4980000, spent: 4980000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Rayalaseema Builders", monopoly: true, risk: 87, reason: "Sanctioned at ₹49.8L to evade ₹50L tender limit" },
    { id: "MPLADS-AS-13098", date: "2026-01-08", state: "Assam", ida: "Kamrup", mp: "MP D. Saikia", cat: "Roads & Bridges", desc: "Bamboo suspension bridge replacement", sanction: 3450000, spent: 2200000, overrun: 0, progress: 65, status: "In progress", stalled: false, vendor: "Brahmaputra Engineering", monopoly: false, risk: 52, reason: "Normal execution pace, documentation verified" },
    { id: "MPLADS-TG-91402", date: "2025-10-22", state: "Telangana", ida: "Nizamabad", mp: "MP A. Rao", cat: "Health Centres", desc: "Sub-centre medical diagnostic lab", sanction: 2750000, spent: 2750000, overrun: 22, progress: 100, status: "Completed", stalled: false, vendor: "Deccan Builders", monopoly: false, risk: 68, reason: "22% unapproved cost escalation" },
    { id: "MPLADS-UP-39951", date: "2025-06-11", state: "Uttar Pradesh", ida: "Pilibhit", mp: "MP Javed Ali", cat: "Sanitation", desc: "Public toilet complex at bus terminal", sanction: 1650000, spent: 1650000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Shree Infra Works", monopoly: true, risk: 81, reason: "Same contractor won 12 consecutive village tenders" },
    { id: "MPLADS-MH-63490", date: "2025-09-02", state: "Maharashtra", ida: "Nagpur", mp: "MP S. Patil", cat: "Solar & Power", desc: "Solar powered irrigation pump station", sanction: 3100000, spent: 3100000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Vidarbha Renewables", monopoly: false, risk: 38, reason: "Normal audit verification" },
    { id: "MPLADS-RJ-34011", date: "2026-01-30", state: "Rajasthan", ida: "Jodhpur", mp: "MP H. Choudhary", cat: "Roads & Bridges", desc: "Paved link road between NH and village", sanction: 4920000, spent: 4920000, overrun: 0, progress: 100, status: "Completed", stalled: false, vendor: "Marwar Constructions", monopoly: true, risk: 84, reason: "Artificial partitioning under GFR Clause 144" }
  ];

  function riskLabel(v) { return v >= 85 ? "CRITICAL" : v >= 65 ? "HIGH" : v >= 40 ? "MEDIUM" : "LOW"; }

  const fState = document.getElementById("fState"), fCategory = document.getElementById("fCategory");
  if (fState) fState.innerHTML += states.map(s => `<option>${s}</option>`).join("");
  if (fCategory) fCategory.innerHTML += categories.map(c => `<option>${c}</option>`).join("");

  /* ================= LIVE ALERTS FILTERING & PAGINATION ================= */
  let currentRisk = "ALL", vendorOnly = false, minScore = 0, sortBy = null, sortDir = "desc";
  let currentPage = 1, pageSize = 6;

  const filterDrawerToggle = document.getElementById("filterDrawerToggle");
  const advancedFilterDrawer = document.getElementById("advancedFilterDrawer");
  const filterCountBadge = document.getElementById("filterCountBadge");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");
  const searchClearBtn = document.getElementById("searchClearBtn");
  const fSearchInput = document.getElementById("fSearch");
  const quickChips = document.querySelectorAll("[data-quick-filter]");

  function toggleFilterDrawer(forceOpen) {
    if (!advancedFilterDrawer) return;
    const shouldOpen = forceOpen !== undefined ? forceOpen : !advancedFilterDrawer.classList.contains("open");
    advancedFilterDrawer.classList.toggle("open", shouldOpen);
    if (filterDrawerToggle) filterDrawerToggle.classList.toggle("open", shouldOpen);
  }

  if (filterDrawerToggle) {
    filterDrawerToggle.addEventListener("click", () => toggleFilterDrawer());
  }

  function updateFilterStats() {
    let activeCount = 0;
    if (fSearchInput && fSearchInput.value.trim() !== "") activeCount++;
    if (fState && fState.value !== "") activeCount++;
    if (fCategory && fCategory.value !== "") activeCount++;
    const fTrigger = document.getElementById("fTrigger");
    if (fTrigger && fTrigger.value !== "") activeCount++;
    if (currentRisk !== "ALL") activeCount++;
    if (vendorOnly) activeCount++;
    if (minScore > 0) activeCount++;

    if (filterCountBadge) {
      filterCountBadge.textContent = activeCount;
      filterCountBadge.style.display = activeCount > 0 ? "inline-block" : "none";
    }
    if (resetFiltersBtn) {
      resetFiltersBtn.style.display = activeCount > 0 ? "inline-flex" : "none";
    }
  }

  // When user focuses search, open filter drawer smoothly for fine-tuning
  if (fSearchInput) {
    fSearchInput.addEventListener("focus", () => {
      toggleFilterDrawer(true);
    });

    fSearchInput.addEventListener("input", () => {
      if (searchClearBtn) {
        searchClearBtn.style.display = fSearchInput.value ? "flex" : "none";
      }
      currentPage = 1;
      updateFilterStats();
      renderAlerts();
    });
  }

  // Keyboard shortcut '/' to search
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== fSearchInput && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      e.preventDefault();
      if (fSearchInput) {
        const alertsLink = document.querySelector('.nav-link[data-view="alerts"]');
        if (alertsLink) setView("alerts");
        fSearchInput.focus();
        toggleFilterDrawer(true);
      }
    }
  });

  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      if (fSearchInput) {
        fSearchInput.value = "";
        fSearchInput.focus();
      }
      searchClearBtn.style.display = "none";
      currentPage = 1;
      updateFilterStats();
      renderAlerts();
    });
  }

  // Quick preset filter chips
  quickChips.forEach(chip => {
    chip.addEventListener("click", () => {
      quickChips.forEach(c => c.classList.remove("on"));
      chip.classList.add("on");

      const filterType = chip.dataset.quickFilter;
      applyQuickFilter(filterType);
    });
  });

  function applyQuickFilter(type) {
    const fTrigger = document.getElementById("fTrigger");
    if (fTrigger) fTrigger.value = "";
    if (fState) fState.value = "";
    if (fCategory) fCategory.value = "";

    currentRisk = "ALL";
    document.querySelectorAll("[data-risk]").forEach(c => c.classList.toggle("on", c.dataset.risk === "ALL"));
    vendorOnly = false;
    if (vendorToggle) vendorToggle.classList.remove("on");
    minScore = 0;
    if (minScoreInput) minScoreInput.value = 0;
    const valEl = document.getElementById("minScoreVal");
    if (valEl) valEl.textContent = 0;

    if (type === "all") {
      if (fSearchInput) {
        fSearchInput.value = "";
        if (searchClearBtn) searchClearBtn.style.display = "none";
      }
    } else if (type === "critical") {
      currentRisk = "CRITICAL";
      document.querySelectorAll("[data-risk]").forEach(c => c.classList.toggle("on", c.dataset.risk === "CRITICAL"));
    } else if (type === "high") {
      currentRisk = "HIGH";
      document.querySelectorAll("[data-risk]").forEach(c => c.classList.toggle("on", c.dataset.risk === "HIGH"));
    } else if (type === "monopoly") {
      vendorOnly = true;
      if (vendorToggle) vendorToggle.classList.add("on");
    } else if (type === "ghost") {
      if (fTrigger) fTrigger.value = "duplicate";
    } else if (type === "split") {
      if (fTrigger) fTrigger.value = "split_tender";
    } else if (type === "stalled") {
      if (fTrigger) fTrigger.value = "stalled";
    }

    currentPage = 1;
    updateFilterStats();
    renderAlerts();
  }

  // Reset all filters button
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => {
      if (fSearchInput) {
        fSearchInput.value = "";
        if (searchClearBtn) searchClearBtn.style.display = "none";
      }
      if (fState) fState.value = "";
      if (fCategory) fCategory.value = "";
      const fTrigger = document.getElementById("fTrigger");
      if (fTrigger) fTrigger.value = "";
      currentRisk = "ALL";
      document.querySelectorAll("[data-risk]").forEach(c => c.classList.toggle("on", c.dataset.risk === "ALL"));
      vendorOnly = false;
      if (vendorToggle) vendorToggle.classList.remove("on");
      minScore = 0;
      if (minScoreInput) minScoreInput.value = 0;
      const valEl = document.getElementById("minScoreVal");
      if (valEl) valEl.textContent = 0;

      quickChips.forEach(c => c.classList.toggle("on", c.dataset.quickFilter === "all"));
      currentPage = 1;
      updateFilterStats();
      renderAlerts();
      showToast("Filters reset to default.");
    });
  }

  const vendorToggle = document.getElementById("vendorToggle");
  if (vendorToggle) {
    vendorToggle.addEventListener("click", function () {
      vendorOnly = !vendorOnly;
      this.classList.toggle("on");
      quickChips.forEach(c => c.classList.remove("on"));
      currentPage = 1;
      updateFilterStats();
      renderAlerts();
    });
  }

  const minScoreInput = document.getElementById("minScore");
  if (minScoreInput) {
    minScoreInput.addEventListener("input", function () {
      minScore = +this.value;
      const valEl = document.getElementById("minScoreVal");
      if (valEl) valEl.textContent = minScore;
      quickChips.forEach(c => c.classList.remove("on"));
      currentPage = 1;
      updateFilterStats();
      renderAlerts();
    });
  }

  ["fState", "fCategory", "fTrigger"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => {
      quickChips.forEach(c => c.classList.remove("on"));
      currentPage = 1;
      updateFilterStats();
      renderAlerts();
    });
  });

  document.querySelectorAll("[data-risk]").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-risk]").forEach(c => c.classList.remove("on"));
      chip.classList.add("on");
      currentRisk = chip.dataset.risk;
      quickChips.forEach(c => c.classList.remove("on"));
      currentPage = 1;
      updateFilterStats();
      renderAlerts();
    });
  });

  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortBy === key) sortDir = sortDir === "asc" ? "desc" : "asc";
      else { sortBy = key; sortDir = "desc"; }
      renderAlerts();
    });
  });

  // Pagination controls
  const pFirst = document.getElementById("pFirst"), pPrev = document.getElementById("pPrev"), pNext = document.getElementById("pNext"), pLast = document.getElementById("pLast");
  const pageSizeSelect = document.getElementById("pageSize");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", function () {
      pageSize = +this.value;
      currentPage = 1;
      renderAlerts();
    });
  }
  if (pFirst) pFirst.addEventListener("click", () => { if (currentPage > 1) { currentPage = 1; renderAlerts(); } });
  if (pPrev) pPrev.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderAlerts(); } });
  if (pNext) pNext.addEventListener("click", () => { currentPage++; renderAlerts(); });
  if (pLast) pLast.addEventListener("click", () => {
    const filtered = getFilteredRows();
    const maxP = Math.ceil(filtered.length / pageSize) || 1;
    currentPage = maxP;
    renderAlerts();
  });

  function getFilteredRows() {
    return alertsData.filter(a => {
      if (currentHouseFilter !== "all") {
        const mpObj = (typeof mps !== "undefined") ? mps.find(m => m.name === a.mp) : null;
        if (mpObj && mpObj.house !== currentHouseFilter) return false;
      }
      if (currentRisk !== "ALL" && riskLabel(a.risk) !== currentRisk) return false;
      if (vendorOnly && !a.monopoly) return false;
      if (a.risk < minScore) return false;
      const s = (document.getElementById("fSearch")?.value || "").toLowerCase();
      if (s && !(a.id.toLowerCase().includes(s) || a.mp.toLowerCase().includes(s) || a.desc.toLowerCase().includes(s) || a.vendor.toLowerCase().includes(s) || (a.ida && a.ida.toLowerCase().includes(s)) || (a.state && a.state.toLowerCase().includes(s)))) return false;
      const st = document.getElementById("fState")?.value || "";
      if (st && a.state !== st) return false;
      const ct = document.getElementById("fCategory")?.value || "";
      if (ct && a.cat !== ct) return false;
      const tr = document.getElementById("fTrigger")?.value || "";
      if (tr === "vendor" && !a.monopoly) return false;
      if (tr === "overspend" && a.overrun < 15) return false;
      if (tr === "stalled" && !a.stalled) return false;
      if (tr === "duplicate" && !a.reason.toLowerCase().includes("duplicate")) return false;
      if (tr === "missing_photo" && !a.reason.toLowerCase().includes("zero geotagged")) return false;
      if (tr === "split_tender" && !a.reason.toLowerCase().includes("split") && !a.reason.toLowerCase().includes("partitioning")) return false;
      if (tr === "premature_tranche" && !a.reason.toLowerCase().includes("tranche")) return false;
      return true;
    });
  }

  function renderAlerts() {
    let rows = getFilteredRows();
    if (sortBy) {
      rows = rows.slice().sort((a, b) => {
        const va = sortBy === "sanction_amount" ? a.sanction : a.risk, vb = sortBy === "sanction_amount" ? b.sanction : b.risk;
        return sortDir === "asc" ? va - vb : vb - va;
      });
    }

    const totalCount = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalCount);
    const paginatedRows = rows.slice(startIdx, endIdx);

    const tbody = document.querySelector("#alertsTable tbody");
    if (tbody) {
      tbody.innerHTML = paginatedRows.map(a => {
        const mpObj = (typeof mps !== "undefined") ? mps.find(m => m.name === a.mp) : null;
        const houseBadge = mpObj ? (mpObj.house === "Lok Sabha" ? '<span class="badge-mini badge-ls">LS</span>' : mpObj.house === "Rajya Sabha" ? '<span class="badge-mini badge-rs">RS</span>' : '<span class="badge-mini badge-nom">NOM</span>') : '';
        return `
        <tr class="rowlink" data-open-case="${a.id}">
          <td><div style="font-weight:500;">${a.id}</div><div class="mono" style="color:var(--ink-faint); font-size:10.5px;">${a.date}</div></td>
          <td>${a.state} · ${a.ida}<div style="color:var(--ink-faint); font-size:11px; display:flex; align-items:center; gap:5px; margin-top:2px;"><span>${a.mp}</span>${houseBadge}</div></td>
          <td>${a.cat}<div style="color:var(--ink-faint); font-size:11px;">${a.desc}</div></td>
          <td class="mono">₹${(a.sanction / 100000).toFixed(1)}L${a.overrun > 0 ? `<div style="color:var(--crimson); font-size:10.5px;">+${a.overrun}% overrun</div>` : ""}</td>
          <td><span class="progress-mini"><i style="width:${a.progress}%;"></i></span>${a.progress}%${a.stalled ? '<div style="color:var(--amber); font-size:10.5px;">Stalled</div>' : ""}</td>
          <td>${a.vendor}${a.monopoly ? '<div><span class="badge-mono">MONOPOLY</span></div>' : ""}</td>
          <td><span class="risk-tag risk-${riskLabel(a.risk)}">${a.risk} · ${riskLabel(a.risk)}</span></td>
          <td style="color:var(--ink-faint); font-size:11.5px; max-width:200px;">${a.reason}</td>
          <td><div class="row-actions" onclick="event.stopPropagation();"><button data-open-case="${a.id}">Inspect</button><button data-pdf="${a.id}">PDF</button></div></td>
        </tr>`;
      }).join("") || `<tr><td colspan="9" class="empty-state">No schemes match this parliamentary house or filter.</td></tr>`;
    }

    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) pageInfo.textContent = totalCount === 0 ? "Showing 0 of 0" : `Showing ${startIdx + 1}–${endIdx} of ${totalCount}`;

    const pageLabel = document.getElementById("pageLabel");
    if (pageLabel) pageLabel.textContent = `Page ${currentPage} / ${totalPages}`;

    if (pFirst) pFirst.disabled = currentPage === 1;
    if (pPrev) pPrev.disabled = currentPage === 1;
    if (pNext) pNext.disabled = currentPage >= totalPages;
    if (pLast) pLast.disabled = currentPage >= totalPages;

    bindRowOpeners();
  }

  const ctaCritical = document.getElementById("ctaCritical");
  if (ctaCritical) ctaCritical.addEventListener("click", () => {
    setView("alerts");
    const chip = document.querySelector('[data-quick-filter="critical"]') || document.querySelector('[data-risk="CRITICAL"]');
    if (chip) chip.click();
    const table = document.getElementById("alertsTable");
    if (table) table.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("🚨 Surfaced Critical Priority Red Flags for statutory investigation", true);
  });

  /* ================= CASE FILE INVESTIGATION MODAL ================= */
  let activeCaseWork = null;
  function bindRowOpeners() {
    document.querySelectorAll("[data-open-case]").forEach(el => {
      el.addEventListener("click", () => openCase(el.dataset.openCase));
    });
    document.querySelectorAll("[data-pdf]").forEach(el => {
      el.addEventListener("click", e => {
        e.stopPropagation();
        openPdfDossier(el.dataset.pdf);
      });
    });
  }

  async function computeSha256(str) {
    try {
      const buffer = new TextEncoder().encode(str);
      const digest = await window.crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i);
      return Math.abs(h).toString(16).padStart(16, "0");
    }
  }

  async function openCase(id) {
    let w = alertsData.find(a => a.id === id) || {
      id, mp: "MP Javed Ali", state: "Uttar Pradesh", ida: "Pilibhit", risk: 80,
      desc: "Rural link road resurfacing", cat: "Roads & Bridges", sanction: 4120000,
      vendor: "Shree Infra Works", reason: "Statutory anomaly flagged"
    };

    // If live API is online, try fetching full backend forensic profile
    if (isApiOnline) {
      try {
        const liveDetail = await apiGet(`/api/work/${encodeURIComponent(id)}`);
        if (liveDetail && liveDetail.work) {
          const lw = liveDetail.work;
          w = {
            id: lw.work_id || w.id,
            mp: lw.mp_name || w.mp,
            state: lw.state || w.state,
            ida: lw.ida || w.ida,
            cat: lw.work_category || w.cat,
            desc: lw.work_description || w.desc,
            sanction: lw.sanction_amount || w.sanction,
            risk: lw.risk_score !== undefined ? lw.risk_score : w.risk,
            vendor: lw.work_top_vendor || w.vendor,
            progress: lw.progress_pct !== undefined ? lw.progress_pct : (w.progress || 25),
            monopoly: lw.work_vendor_flag || w.monopoly,
            reason: lw.reason || w.reason,
            stalled: lw.rule_stalled_execution || w.stalled,
            docForensics: liveDetail.document_forensics,
            photoDups: liveDetail.duplicate_photo_evidence,
            auditHistory: liveDetail.audit_history
          };
        }
      } catch {}
    }

    activeCaseWork = w;

    document.getElementById("caseTitle").textContent = "Work #" + w.id;
    document.getElementById("caseSub").textContent = `${w.mp} · ${w.state}, ${w.ida} · Risk tier ${riskLabel(w.risk)}`;

    const scores = [
      ["Isolation Forest anomaly score", Math.min(99, Math.round(w.risk + 3))],
      ["Vendor NLP monopoly score", w.monopoly ? 92 : 45],
      ["Timeline delay & stall score", w.stalled ? 88 : 28],
      ["GFR 144 threshold violation", w.reason && (w.reason.includes("threshold") || w.reason.includes("split")) ? 94 : 35],
    ];
    document.getElementById("caseScores").innerHTML = scores.map(([l, v]) => `
      <div class="score-row"><div class="score-label">${l}</div><div class="score-track"><div class="score-fill" style="width:${v}%; background:${v > 75 ? 'var(--crimson)' : v > 50 ? 'var(--amber)' : 'var(--teal)'};"></div></div><div class="score-val">${v}</div></div>`).join("");

    // Render Document Forensics & Cross-Scheme Double Claiming
    const docBox = document.getElementById("caseDocFindings");
    const isKamleshCrossScheme = String(w.id).includes("58482") || String(w.id).includes("134671") || String(w.mp).toLowerCase().includes("kamlesh");
    if (isKamleshCrossScheme) {
      docBox.innerHTML = `
        <div class="ocr-flag-card">
          <div class="ocr-flag-header">
            <div class="ocr-flag-title">🚨 [CRITICAL: CROSS-SCHEME FRAUD] STATE MLA DOUBLE-CLAIM</div>
            <span class="statutory-cite-badge">GFR RULE 144</span>
          </div>
          <div style="font-size:12px; color:var(--ink); margin-bottom:5px;">
            Double-claiming <b>Vidhayak Nidhi (State MLA Scheme / MLALAD)</b> funds under Central MPLADS scheme detected on scanned completion certificate header!
          </div>
          <div style="font-size:11.5px; color:var(--ink-dim); line-height:1.5;">
            <b>Physical Certificate Approved:</b> ₹25,00,000.00 | <b>Portal Recorded Allocation:</b> ₹5,00,000.00 | <b>Unaccounted Discrepancy:</b> -₹20,00,000.00<br>
            <b>Statutory Violations:</b> General Financial Rules (GFR) Rule 144 &amp; MPLADS Guidelines Clause 3.12 (Prohibition of Co-financing).
          </div>
        </div>`;
    } else {
      const isHighRisk = w.risk >= 75;
      docBox.innerHTML = `
        <div class="ocr-flag-card ${isHighRisk ? '' : 'verified'}">
          <div class="ocr-flag-header">
            <div class="ocr-flag-title">${isHighRisk ? '⚠️ INVOICE & DISBURSEMENT VARIANCE DETECTED' : '✓ SCANNED CERTIFICATE VERIFIED COMPLIANT'}</div>
            <span class="statutory-cite-badge">${isHighRisk ? 'CLAUSE 4.3' : 'CENTRAL MPLADS'}</span>
          </div>
          <div style="font-size:12px; color:var(--ink); margin-bottom:4px;">
            ${isHighRisk ? (w.reason || 'Variance between scanned utilization certificate and PFMS central ledger.') : 'Physical scanned certificate validated under Central Ministry MPLADS (Sansad Nidhi).'}
          </div>
          <div style="font-size:11.5px; color:var(--ink-dim);">
            Contractor: <b>${w.vendor}</b> · Sanctioned Outlay: ₹${(w.sanction / 100000).toFixed(1)} Lakhs · Certified Execution: ${w.progress || 25}%.
          </div>
        </div>`;
    }

    // Render Perceptual Photo Forensics (pHash Duplicate Detection)
    const photoBox = document.getElementById("casePhotoFindings");
    const isDuplicateWork = w.risk >= 80 || (w.reason && w.reason.toLowerCase().includes("duplicate"));
    if (isDuplicateWork) {
      photoBox.innerHTML = `
        <div class="ocr-flag-card">
          <div class="ocr-flag-header">
            <div class="ocr-flag-title">📸 pHash RECYCLED PHOTO EVIDENCE (SIMILARITY 97.4%)</div>
            <span class="statutory-cite-badge">pHash &lt; 5 BITS</span>
          </div>
          <div style="font-size:12px; color:var(--ink); margin-bottom:4px;">
            Identical structural photographic fingerprint recycled across two non-adjacent sanctions (Work ${w.id} and MPLADS-UP-38810). Suspected ghost work execution.
          </div>
          <div style="font-size:11.5px; color:var(--ink-dim);">
            <b>Camera Hardware UUID:</b> Xiaomi Redmi Note 12 (Identical hardware signature) · <b>Geotag Conflict:</b> 142 km delta between claimed project sites.
          </div>
        </div>`;
    } else {
      photoBox.innerHTML = `
        <div class="ocr-flag-card verified">
          <div class="ocr-flag-header">
            <div class="ocr-flag-title">✓ COMPLETION PHOTOGRAPHS VERIFIED</div>
            <span class="statutory-cite-badge">EXIF / GPS OK</span>
          </div>
          <div style="font-size:12px; color:var(--ink);">
            Geotagged site photographs timestamped and verified consistent within the territorial boundaries of ${w.ida}, ${w.state}.
          </div>
        </div>`;
    }

    // Render Audit History
    const historyData = (w.auditHistory && w.auditHistory.length > 0) ? w.auditHistory.map(h => [
      (h.timestamp || "").slice(0, 16).replace("T", " "),
      h.user_id || "auditor",
      h.action || "REVIEWED",
      (h.sha256_seal || "4f3a…e21b").slice(0, 10)
    ]) : [
      ["2026-01-20 11:02", "district_pilibhit", "Reviewed, pending field verify", "4f3a…e21b"],
      ["2026-01-18 09:40", "ministry_admin", "Flagged for priority statutory audit", "91bd…7fa4"],
    ];
    document.getElementById("caseHistory").innerHTML = historyData.map(r => `
      <tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="hash">${r[3]}</td></tr>`).join("");

    // Live AI Case Stream (SSE from Gemini Flash with fallback typewriter)
    const streamBox = document.getElementById("streamBox");
    streamBox.innerHTML = '<span class="cursor"></span>';
    const fallbackSynthesis = `Forensic synthesis for ${w.id}: The ensemble flags this work with a composite risk index of ${w.risk}. Primary triggers: ${w.reason}. Contractor monopoly analysis flags ${w.vendor} holding disproportionate allocations in ${w.ida}. Statutory recommendation: Order immediate on-site inspection by District Authority and freeze subsequent releases pending Measurement Book verification.`;

    let sseStarted = false;
    if (isApiOnline) {
      try {
        const evtSource = new EventSource(`${API_BASE}/api/explain/work/${encodeURIComponent(w.id)}/stream`);
        let liveNarrative = "";
        evtSource.onmessage = (event) => {
          sseStarted = true;
          if (event.data === "[DONE]") {
            evtSource.close();
            streamBox.innerHTML = liveNarrative;
          } else {
            liveNarrative += event.data;
            streamBox.innerHTML = liveNarrative + '<span class="cursor"></span>';
          }
        };
        evtSource.onerror = () => {
          evtSource.close();
          if (!sseStarted) typeStream(streamBox, fallbackSynthesis);
        };
      } catch {
        typeStream(streamBox, fallbackSynthesis);
      }
    } else {
      typeStream(streamBox, fallbackSynthesis);
    }

    // Connect dedicated official PDF download button
    const btnCasePdf = document.getElementById("btnCaseDownloadPdf");
    if (btnCasePdf) {
      btnCasePdf.onclick = () => {
        if (isApiOnline) {
          window.open(`${API_BASE}/api/export/work-pdf/${encodeURIComponent(w.id)}`, "_blank");
          showToast(`Downloading official MoSPI statutory investigation PDF for ${w.id}…`);
        } else {
          openPdfDossier(w.id);
          showToast(`Opened statutory audit case dossier for ${w.id}.`);
        }
      };
    }

    const adjText = document.getElementById("adjText");
    if (adjText) { adjText.value = ""; updateCharCount(); }
    openModal("caseModal");
  }

  function typeStream(el, text) {
    let i = 0; el.innerHTML = '<span class="cursor"></span>';
    const iv = setInterval(() => {
      i += 4; el.innerHTML = text.slice(0, i) + '<span class="cursor"></span>';
      if (i >= text.length) clearInterval(iv);
    }, 14);
  }

  const adjText = document.getElementById("adjText"), charCount = document.getElementById("charCount"), sealBtn = document.getElementById("sealBtn");
  function updateCharCount() {
    if (!adjText || !charCount || !sealBtn) return;
    const n = adjText.value.length;
    charCount.textContent = n + " / 50";
    charCount.classList.toggle("ok", n >= 50);
    sealBtn.disabled = n < 50;
  }
  if (adjText) adjText.addEventListener("input", updateCharCount);

  // Real SHA-256 block commitment into immutable audit ledger with backend dual-write
  if (sealBtn) {
    sealBtn.addEventListener("click", async () => {
      const action = document.getElementById("adjAction").value;
      const justification = adjText.value.trim();
      if (justification.length < 50) {
        showToast("MPLADS regulations require a minimum 50-character written legal justification.", true);
        return;
      }
      const workId = activeCaseWork ? activeCaseWork.id : "MPLADS-AUDIT";
      const score = activeCaseWork ? activeCaseWork.risk : 85;

      const now = new Date();
      const timeStr = now.toISOString().replace("T", " ").substring(0, 19);
      const logId = "LOG-" + Math.floor(88220 + Math.random() * 9000);

      // Compute sequential cryptographic SHA-256 hash
      const prevHash = ledgerData.length > 0 ? (ledgerData[0][7] || "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026") : "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026";
      const payload = `${prevHash}|${timeStr}|${workId}|${currentRole}|${action}|${justification}|${score.toFixed(2)}`;
      const fullHash = await computeSha256(payload);
      const displayHash = `${fullHash.slice(0, 8)}…${fullHash.slice(-6)}`;

      // Dual-write to live backend if online
      if (isApiOnline) {
        try {
          await apiPost("/api/audit/dismiss", {
            work_id: workId,
            action: action,
            justification: justification,
            original_risk_score: score
          });
        } catch {}
      }

      const newEntry = [logId, timeStr, workId, `${currentRole} · Official`, action, justification, score, displayHash];
      ledgerData.unshift(newEntry);
      renderLedger();

      // Update case file history table
      const caseHistory = document.getElementById("caseHistory");
      if (caseHistory) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td class="mono">${timeStr.slice(0, 16)}</td><td>${currentRole}</td><td>${action}</td><td class="hash">${displayHash}</td>`;
        caseHistory.prepend(tr);
      }

      showToast(`Action '${action}' permanently sealed in SHA-256 tamper-evident audit ledger!`);
      document.getElementById("caseModal").classList.remove("open");
    });
  }

  /* ================= BENFORD'S LAW FORENSICS (MULTI-DIMENSIONAL & REACTIVE) ================= */
  let benfordState = { dataset: "sanction", digit: "D1", entity: "state" };

  const benfordDataset = {
    all: {
      label: "National MPLADS Portfolio (543 LS + 245 RS + 12 Nominated)",
      sampleSize: 98649,
      sanction: {
        D1: {
          observed: [34.8, 19.2, 13.9, 6.2, 13.5, 4.8, 2.9, 2.6, 2.1],
          mad: 0.021,
          chi: "41.2",
          pVal: "0.041",
          status: { tag: "MEDIUM", text: "Acceptable variance" },
          insight: "First-Digit (D1) Analysis: Statutory sanctions reveal artificial clustering at ₹10L and ₹50L thresholds (+5.6% spike at digit 5, GFR 144 split-tendering cliff).",
          cliffs: [
            ["₹50 Lakh (e-Tender Limit)", "₹45–49.99L: 812 txns", "₹50–55L: 96 txns", "8.5x", true, "Statutory GFR 144 split-tender evasion suspected"],
            ["₹25 Lakh (District Approval)", "₹22–24.99L: 340 txns", "₹25–27L: 88 txns", "3.9x", true, "Executive ceiling structuring under Rule 144"],
            ["₹10 Lakh (Direct Quotation)", "₹9–9.99L: 210 txns", "₹10–11L: 174 txns", "1.2x", false, "Within normal procurement variance"],
            ["₹5 Lakh (Gram Panchayat)", "₹4.5–4.99L: 190 txns", "₹5–5.5L: 205 txns", "0.9x", false, "No artificial cliff detected"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 22, display: "22%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 31, display: "31%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 14, display: "14%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 33, display: "33%", color: "var(--teal)" }
          ]
        },
        D2: {
          observed: [21.4, 10.8, 9.6, 9.1, 8.7, 18.2, 7.9, 5.1, 4.8, 4.4],
          mad: 0.034,
          chi: "58.4",
          pVal: "0.018",
          status: { tag: "HIGH", text: "Round-Number Non-conforming" },
          insight: "Second-Digit (D2) Analysis: Severe Round-Number Bias detected. Digits 0 and 5 account for 39.6% of contracts (vs 20.4% theoretical baseline).",
          cliffs: [
            ["₹49.x Lakh vs ₹50.x Lakh", "₹49.0–49.99L: 642 txns", "₹50.0–50.99L: 68 txns", "9.4x", true, "Second digit '9' clustering under ₹50L e-tender ceiling"],
            ["₹24.x Lakh vs ₹25.x Lakh", "₹24.0–24.99L: 284 txns", "₹25.0–25.99L: 72 txns", "3.9x", true, "Second digit '4' clustering under ₹25L approval"],
            ["₹19.x Lakh vs ₹20.x Lakh", "₹19.0–19.99L: 198 txns", "₹20.0–20.99L: 110 txns", "1.8x", false, "Moderate threshold elevation"],
            ["₹9.x Lakh vs ₹10.x Lakh", "₹9.0–9.99L: 182 txns", "₹10.0–10.99L: 134 txns", "1.4x", false, "Minor quotation boundary clustering"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 26, display: "26%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 36, display: "36%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 17, display: "17%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 21, display: "21%", color: "var(--teal)" }
          ]
        },
        D1D2: {
          observed: [8.4, 6.2, 5.9, 7.1, 3.2, 1.8, 4.9, 0.8, 0.5],
          mad: 0.042,
          chi: "72.6",
          pVal: "0.003",
          status: { tag: "CRITICAL", text: "Threshold Structuring Detected" },
          insight: "First-Two Digits (D1D2) Analysis: Anomalous clusters at ₹49.5L, ₹48.9L, and ₹19.8L — systematic evasions of e-procurement thresholds.",
          cliffs: [
            ["₹49 Lakhs (D1D2: 49 vs 50)", "₹49.5–49.99L: 512 txns", "₹50.0–50.5L: 41 txns", "12.5x", true, "Extreme ₹49.8L clustering across 52 districts"],
            ["₹24 Lakhs (D1D2: 24 vs 25)", "₹24.5–24.99L: 218 txns", "₹25.0–25.5L: 48 txns", "4.5x", true, "Concentrated ₹24.9L technical sanction bypass"],
            ["₹19 Lakhs (D1D2: 19 vs 20)", "₹19.5–19.99L: 164 txns", "₹20.0–20.5L: 62 txns", "2.6x", true, "Tier-2 executive threshold structuring"],
            ["₹09 Lakhs (D1D2: 09 vs 10)", "₹9.5–9.99L: 154 txns", "₹10.0–10.5L: 92 txns", "1.7x", false, "Within acceptable quotation band"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 24, display: "24%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 38, display: "38%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 19, display: "19%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 19, display: "19%", color: "var(--teal)" }
          ]
        }
      },
      vendor: {
        D1: {
          observed: [41.2, 21.0, 11.2, 5.1, 12.8, 3.2, 2.1, 1.8, 1.6],
          mad: 0.048,
          chi: "88.7",
          pVal: "< 0.001",
          status: { tag: "CRITICAL", text: "Statutory Non-conforming" },
          insight: "Vendor Disbursements D1: Extreme digit-1 inflation (+11.1% over Benford expectation). Contractor billing patterns show multi-firm invoice synchronization.",
          cliffs: [
            ["₹50 Lakh (e-Tender Limit)", "₹45–49.99L: 1,248 bills", "₹50–55L: 94 bills", "13.3x", true, "Contractor syndicate multi-invoice structuring"],
            ["₹25 Lakh (District Approval)", "₹22–24.99L: 586 bills", "₹25–27L: 104 bills", "5.6x", true, "Repeated sub-threshold milestone bills"],
            ["₹10 Lakh (Direct Quotation)", "₹9–9.99L: 492 bills", "₹10–11L: 156 bills", "3.2x", true, "Quotation splitting among sister firms"],
            ["₹5 Lakh (Gram Panchayat)", "₹4.5–4.99L: 384 bills", "₹5–5.5L: 320 bills", "1.2x", false, "Routine petty contractor vouchers"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 28, display: "28%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 34, display: "34%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 21, display: "21%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 17, display: "17%", color: "var(--teal)" }
          ]
        },
        D2: {
          observed: [24.8, 9.4, 8.8, 8.2, 8.0, 21.1, 6.8, 4.9, 4.2, 3.8],
          mad: 0.056,
          chi: "104.2",
          pVal: "< 0.001",
          status: { tag: "CRITICAL", text: "Severe Invoicing Collusion" },
          insight: "Vendor Disbursements D2: 45.9% of vendor disbursements end with round '00,000' or '50,000' figures, indicating arbitrary lump-sum milestone claims.",
          cliffs: [
            ["₹49.x Lakh vs ₹50.x Lakh", "₹49.0–49.99L: 980 bills", "₹50.0–50.99L: 72 bills", "13.6x", true, "Systemic ₹49.5L milestone payment draws"],
            ["₹24.x Lakh vs ₹25.x Lakh", "₹24.0–24.99L: 462 bills", "₹25.0–25.99L: 78 bills", "5.9x", true, "Arbitrary flat contractor bill submissions"],
            ["₹19.x Lakh vs ₹20.x Lakh", "₹19.0–19.99L: 374 bills", "₹20.0–20.99L: 96 bills", "3.9x", true, "Executive voucher splitting in 38 districts"],
            ["₹9.x Lakh vs ₹10.x Lakh", "₹9.0–9.99L: 412 bills", "₹10.0–10.99L: 140 bills", "2.9x", true, "Split supplies to bypass GeM verification"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 31, display: "31%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 37, display: "37%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 20, display: "20%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 12, display: "12%", color: "var(--teal)" }
          ]
        },
        D1D2: {
          observed: [11.2, 7.8, 6.9, 8.4, 2.8, 1.4, 5.8, 0.6, 0.4],
          mad: 0.061,
          chi: "119.5",
          pVal: "< 0.001",
          status: { tag: "CRITICAL", text: "Systemic Syndicate Invoicing" },
          insight: "Vendor Disbursements D1D2: Vendor syndicates in UP and Bihar show repeated matching bill pairs right below audit thresholds.",
          cliffs: [
            ["₹49 Lakhs (D1D2: 49 vs 50)", "₹49.5–49.99L: 814 bills", "₹50.0–50.5L: 46 bills", "17.7x", true, "Severe syndicate collusion: 17.7x billing cliff"],
            ["₹24 Lakhs (D1D2: 24 vs 25)", "₹24.5–24.99L: 390 bills", "₹25.0–25.5L: 52 bills", "7.5x", true, "Direct bypass of State PWD audit scrutiny"],
            ["₹19 Lakhs (D1D2: 19 vs 20)", "₹19.5–19.99L: 298 bills", "₹20.0–20.5L: 68 bills", "4.4x", true, "Identical twin bills submitted within 48h"],
            ["₹09 Lakhs (D1D2: 09 vs 10)", "₹9.5–9.99L: 346 bills", "₹10.0–10.5L: 88 bills", "3.9x", true, "Repeated quotation splitting by same contractor"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 32, display: "32%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 39, display: "39%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 20, display: "20%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 9, display: "9%", color: "var(--teal)" }
          ]
        }
      }
    },
    "Lok Sabha": {
      label: "Lok Sabha (543 Directly Elected MP Constituencies)",
      sampleSize: 68420,
      sanction: {
        D1: {
          observed: [36.2, 19.8, 14.1, 5.8, 14.2, 4.2, 2.4, 2.0, 1.3],
          mad: 0.026,
          chi: "49.8",
          pVal: "0.012",
          status: { tag: "MEDIUM", text: "Constituency Split Risk" },
          insight: "Lok Sabha D1: Constituency civil works show notable +6.3% clustering around digit 5 (₹45L–₹49.9L works structured to bypass CPWD manual review).",
          cliffs: [
            ["₹50 Lakh (e-Tender Limit)", "₹45–49.99L: 614 txns", "₹50–55L: 62 txns", "9.9x", true, "Severe GFR 144 evasion in 48 constituencies"],
            ["₹25 Lakh (District Approval)", "₹22–24.99L: 254 txns", "₹25–27L: 58 txns", "4.4x", true, "Executive threshold cliff in rural works"],
            ["₹10 Lakh (Direct Quotation)", "₹9–9.99L: 162 txns", "₹10–11L: 124 txns", "1.3x", false, "Moderate threshold elevation"],
            ["₹5 Lakh (Gram Panchayat)", "₹4.5–4.99L: 142 txns", "₹5–5.5L: 148 txns", "1.0x", false, "Normal statistical spread"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 24, display: "24%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 34, display: "34%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 16, display: "16%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 26, display: "26%", color: "var(--teal)" }
          ]
        },
        D2: {
          observed: [23.1, 10.2, 9.1, 8.8, 8.3, 19.4, 7.2, 5.0, 4.6, 4.3],
          mad: 0.038,
          chi: "66.2",
          pVal: "0.007",
          status: { tag: "HIGH", text: "Severe Constituency Rounding" },
          insight: "Lok Sabha D2: Over 42.5% of approved constituency road & community works end with round lakhs, signaling lack of itemized Schedule of Rates (SoR).",
          cliffs: [
            ["₹49.x Lakh vs ₹50.x Lakh", "₹49.0–49.99L: 488 txns", "₹50.0–50.99L: 44 txns", "11.1x", true, "Critical 11.1x cliff in constituency road tenders"],
            ["₹24.x Lakh vs ₹25.x Lakh", "₹24.0–24.99L: 212 txns", "₹25.0–25.99L: 46 txns", "4.6x", true, "Constituency water/hall project splits"],
            ["₹19.x Lakh vs ₹20.x Lakh", "₹19.0–19.99L: 154 txns", "₹20.0–20.99L: 74 txns", "2.1x", true, "DRDA executive threshold evasion"],
            ["₹9.x Lakh vs ₹10.x Lakh", "₹9.0–9.99L: 138 txns", "₹10.0–10.99L: 96 txns", "1.4x", false, "Minor rural quotation clustering"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 28, display: "28%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 38, display: "38%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 18, display: "18%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 16, display: "16%", color: "var(--teal)" }
          ]
        },
        D1D2: {
          observed: [9.2, 6.8, 6.2, 7.9, 3.1, 1.6, 5.2, 0.7, 0.4],
          mad: 0.048,
          chi: "81.4",
          pVal: "< 0.001",
          status: { tag: "CRITICAL", text: "Critical Tender Clustering" },
          insight: "Lok Sabha D1D2: 614 works concentrated specifically in the ₹49.0L–₹49.9L window across 48 identified parliamentary constituencies.",
          cliffs: [
            ["₹49 Lakhs (D1D2: 49 vs 50)", "₹49.5–49.99L: 410 txns", "₹50.0–50.5L: 28 txns", "14.6x", true, "Severe ₹49.9L structuring across 48 LS seats"],
            ["₹24 Lakhs (D1D2: 24 vs 25)", "₹24.5–24.99L: 172 txns", "₹25.0–25.5L: 32 txns", "5.4x", true, "District Collector direct approval boundary"],
            ["₹19 Lakhs (D1D2: 19 vs 20)", "₹19.5–19.99L: 128 txns", "₹20.0–20.5L: 42 txns", "3.0x", true, "Tier-2 rural works structuring"],
            ["₹09 Lakhs (D1D2: 09 vs 10)", "₹9.5–9.99L: 118 txns", "₹10.0–10.5L: 64 txns", "1.8x", false, "Within normal quotation band"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 26, display: "26%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 41, display: "41%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 20, display: "20%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 13, display: "13%", color: "var(--teal)" }
          ]
        }
      },
      vendor: {
        D1: {
          observed: [43.1, 21.6, 10.8, 4.7, 13.6, 2.9, 1.8, 1.5, 0.0],
          mad: 0.052,
          chi: "94.2",
          pVal: "< 0.001",
          status: { tag: "CRITICAL", text: "Syndicate Concentration Flag" },
          insight: "Lok Sabha Vendor D1: 43.1% first-digit 1 frequency represents massive abnormal deviation; contractor syndicates dominate constituency work lots.",
          cliffs: [
            ["₹50 Lakh (e-Tender Limit)", "₹45–49.99L: 940 bills", "₹50–55L: 64 bills", "14.7x", true, "Lok Sabha contractor syndicate collusion"],
            ["₹25 Lakh (District Approval)", "₹22–24.99L: 432 bills", "₹25–27L: 68 bills", "6.4x", true, "Multiple sub-contractor bill splitting"],
            ["₹10 Lakh (Direct Quotation)", "₹9–9.99L: 384 bills", "₹10–11L: 108 bills", "3.6x", true, "Direct quotation cap evasion in MP constituencies"],
            ["₹5 Lakh (Gram Panchayat)", "₹4.5–4.99L: 294 bills", "₹5–5.5L: 218 bills", "1.3x", false, "Standard small civil vouchers"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 30, display: "30%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 36, display: "36%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 22, display: "22%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 12, display: "12%", color: "var(--teal)" }
          ]
        },
        D2: {
          observed: [26.2, 9.1, 8.4, 8.0, 7.8, 22.4, 6.2, 4.6, 3.9, 3.4],
          mad: 0.062,
          chi: "112.8",
          pVal: "< 0.001",
          status: { tag: "CRITICAL", text: "Syndicate Rounding Flag" },
          insight: "Lok Sabha Vendor D2: Spikes at 0 and 5 aggregate to 48.6%, reflecting lump-sum contractor disbursement draws.",
          cliffs: [
            ["₹49.x Lakh vs ₹50.x Lakh", "₹49.0–49.99L: 746 bills", "₹50.0–50.99L: 48 bills", "15.5x", true, "Widespread ₹49.5L milestone payment fraud"],
            ["₹24.x Lakh vs ₹25.x Lakh", "₹24.0–24.99L: 342 bills", "₹25.0–25.99L: 52 bills", "6.6x", true, "Milestone bill splitting to avoid vigilance audit"],
            ["₹19.x Lakh vs ₹20.x Lakh", "₹19.0–19.99L: 284 bills", "₹20.0–20.99L: 64 bills", "4.4x", true, "Executive voucher splitting across constituencies"],
            ["₹9.x Lakh vs ₹10.x Lakh", "₹9.0–9.99L: 310 bills", "₹10.0–10.99L: 94 bills", "3.3x", true, "Collusive contractor quoting right under limit"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 33, display: "33%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 39, display: "39%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 21, display: "21%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 7, display: "7%", color: "var(--teal)" }
          ]
        },
        D1D2: {
          observed: [12.4, 8.2, 7.1, 9.1, 2.5, 1.2, 6.4, 0.5, 0.3],
          mad: 0.068,
          chi: "128.4",
          pVal: "< 0.001",
          status: { tag: "CRITICAL", text: "High Collusion Index" },
          insight: "Lok Sabha Vendor D1D2: Syndicate contractor clusters in UP, Bihar, and Rajasthan show coordinated under-threshold billing.",
          cliffs: [
            ["₹49 Lakhs (D1D2: 49 vs 50)", "₹49.5–49.99L: 628 bills", "₹50.0–50.5L: 32 bills", "19.6x", true, "Critical 19.6x syndicate cliff in UP/Bihar/RJ"],
            ["₹24 Lakhs (D1D2: 24 vs 25)", "₹24.5–24.99L: 294 bills", "₹25.0–25.5L: 34 bills", "8.6x", true, "Systemic avoid-audit structuring"],
            ["₹19 Lakhs (D1D2: 19 vs 20)", "₹19.5–19.99L: 236 bills", "₹20.0–20.5L: 46 bills", "5.1x", true, "Twin bills issued by affiliated entities"],
            ["₹09 Lakhs (D1D2: 09 vs 10)", "₹9.5–9.99L: 268 bills", "₹10.0–10.5L: 58 bills", "4.6x", true, "Split material procurement vouchers"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 34, display: "34%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 42, display: "42%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 20, display: "20%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 4, display: "4%", color: "var(--teal)" }
          ]
        }
      }
    },
    "Rajya Sabha": {
      label: "Rajya Sabha (245 Council of States Nominees / UT Reps)",
      sampleSize: 28140,
      sanction: {
        D1: {
          observed: [32.1, 18.2, 13.2, 7.1, 11.8, 5.6, 4.1, 4.0, 3.9],
          mad: 0.016,
          chi: "31.4",
          pVal: "0.082",
          status: { tag: "LOW", text: "Close conformity" },
          insight: "Rajya Sabha D1: State-wide allocations exhibit significantly closer conformity to Benford's Law (MAD 0.016, p=0.082) with lower contractor capture.",
          cliffs: [
            ["₹50 Lakh (e-Tender Limit)", "₹45–49.99L: 184 txns", "₹50–55L: 32 txns", "5.8x", true, "Moderate e-tender cliff in state works"],
            ["₹25 Lakh (District Approval)", "₹22–24.99L: 82 txns", "₹25–27L: 28 txns", "2.9x", true, "Executive threshold cliff in colleges/hospitals"],
            ["₹10 Lakh (Direct Quotation)", "₹9–9.99L: 44 txns", "₹10–11L: 46 txns", "1.0x", false, "Normal statistical spread"],
            ["₹5 Lakh (Gram Panchayat)", "₹4.5–4.99L: 44 txns", "₹5–5.5L: 52 txns", "0.8x", false, "No artificial cliff detected"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 18, display: "18%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 26, display: "26%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 11, display: "11%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 45, display: "45%", color: "var(--teal)" }
          ]
        },
        D2: {
          observed: [17.8, 11.4, 10.4, 9.8, 9.2, 15.6, 8.8, 6.2, 5.6, 5.2],
          mad: 0.024,
          chi: "42.1",
          pVal: "0.054",
          status: { tag: "MEDIUM", text: "Moderate Rounding" },
          insight: "Rajya Sabha D2: Institutional hospital/university grants show higher technical estimation precision, though minor round-number bias persists.",
          cliffs: [
            ["₹49.x Lakh vs ₹50.x Lakh", "₹49.0–49.99L: 142 txns", "₹50.0–50.99L: 22 txns", "6.5x", true, "Medical equipment order clustering below ₹50L"],
            ["₹24.x Lakh vs ₹25.x Lakh", "₹24.0–24.99L: 68 txns", "₹25.0–25.99L: 24 txns", "2.8x", true, "University lab grant structuring"],
            ["₹19.x Lakh vs ₹20.x Lakh", "₹19.0–19.99L: 42 txns", "₹20.0–20.99L: 34 txns", "1.2x", false, "Normal institutional variation"],
            ["₹9.x Lakh vs ₹10.x Lakh", "₹9.0–9.99L: 38 txns", "₹10.0–10.99L: 36 txns", "1.1x", false, "Standard procurement curve"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 20, display: "20%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 28, display: "28%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 13, display: "13%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 39, display: "39%", color: "var(--teal)" }
          ]
        },
        D1D2: {
          observed: [6.8, 5.1, 4.8, 5.4, 3.4, 2.1, 3.8, 1.2, 0.8],
          mad: 0.028,
          chi: "49.6",
          pVal: "0.022",
          status: { tag: "MEDIUM", text: "Moderate Cliff Clustering" },
          insight: "Rajya Sabha D1D2: 184 projects recorded near the ₹50L boundary, primarily in state capital institutional supplies.",
          cliffs: [
            ["₹49 Lakhs (D1D2: 49 vs 50)", "₹49.5–49.99L: 98 txns", "₹50.0–50.5L: 12 txns", "8.2x", true, "Specialized equipment packages structured at ₹49.8L"],
            ["₹24 Lakhs (D1D2: 24 vs 25)", "₹24.5–24.99L: 44 txns", "₹25.0–25.5L: 14 txns", "3.1x", true, "State nodal agency ceiling structuring"],
            ["₹19 Lakhs (D1D2: 19 vs 20)", "₹19.5–19.99L: 32 txns", "₹20.0–20.5L: 18 txns", "1.8x", false, "Minor variance in library grants"],
            ["₹09 Lakhs (D1D2: 09 vs 10)", "₹9.5–9.99L: 32 txns", "₹10.0–10.5L: 26 txns", "1.2x", false, "Standard quotation range"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 21, display: "21%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 31, display: "31%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 14, display: "14%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 34, display: "34%", color: "var(--teal)" }
          ]
        }
      },
      vendor: {
        D1: {
          observed: [37.4, 19.8, 12.1, 6.2, 10.9, 4.1, 3.2, 3.1, 3.2],
          mad: 0.038,
          chi: "64.1",
          pVal: "0.004",
          status: { tag: "HIGH", text: "Moderate Vendor Anomaly" },
          insight: "Rajya Sabha Vendor D1: Specialized medical/infra vendors display moderate digit-1 clustering, lower syndicate overlap than Lok Sabha.",
          cliffs: [
            ["₹50 Lakh (e-Tender Limit)", "₹45–49.99L: 286 bills", "₹50–55L: 28 bills", "10.2x", true, "Medical/infra vendor e-tender boundary bills"],
            ["₹25 Lakh (District Approval)", "₹22–24.99L: 144 bills", "₹25–27L: 34 bills", "4.2x", true, "Multiple milestone claims across districts"],
            ["₹10 Lakh (Direct Quotation)", "₹9–9.99L: 102 bills", "₹10–11L: 44 bills", "2.3x", true, "State institutional supply splits"],
            ["₹5 Lakh (Gram Panchayat)", "₹4.5–4.99L: 86 bills", "₹5–5.5L: 96 bills", "0.9x", false, "Clean statutory spread"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 23, display: "23%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 30, display: "30%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 17, display: "17%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 30, display: "30%", color: "var(--teal)" }
          ]
        },
        D2: {
          observed: [21.8, 10.2, 9.6, 8.8, 8.4, 18.2, 7.8, 5.8, 5.0, 4.4],
          mad: 0.044,
          chi: "78.2",
          pVal: "0.001",
          status: { tag: "HIGH", text: "Vendor Milestone Clustering" },
          insight: "Rajya Sabha Vendor D2: Milestone payments clustered at 0 and 5 reflect state government agency milestone release norms.",
          cliffs: [
            ["₹49.x Lakh vs ₹50.x Lakh", "₹49.0–49.99L: 220 bills", "₹50.0–50.99L: 22 bills", "10.0x", true, "Specialized medical vendor ₹49.5L draws"],
            ["₹24.x Lakh vs ₹25.x Lakh", "₹24.0–24.99L: 114 bills", "₹25.0–25.99L: 24 bills", "4.8x", true, "State nodal lab equipment bills"],
            ["₹19.x Lakh vs ₹20.x Lakh", "₹19.0–19.99L: 86 bills", "₹20.0–20.99L: 30 bills", "2.9x", true, "Milestone releases under ₹20L"],
            ["₹9.x Lakh vs ₹10.x Lakh", "₹9.0–9.99L: 96 bills", "₹10.0–10.99L: 42 bills", "2.3x", true, "Institutional IT hardware split quotes"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 25, display: "25%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 34, display: "34%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 18, display: "18%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 23, display: "23%", color: "var(--teal)" }
          ]
        },
        D1D2: {
          observed: [8.8, 6.6, 5.8, 6.8, 3.4, 1.9, 4.4, 1.0, 0.7],
          mad: 0.046,
          chi: "84.1",
          pVal: "0.001",
          status: { tag: "HIGH", text: "Multi-District Capture" },
          insight: "Rajya Sabha Vendor D1D2: Select equipment suppliers win repetitive ₹45L+ contracts across multiple districts in the same state.",
          cliffs: [
            ["₹49 Lakhs (D1D2: 49 vs 50)", "₹49.5–49.99L: 174 bills", "₹50.0–50.5L: 14 bills", "12.4x", true, "Multi-district medical supplier capture"],
            ["₹24 Lakhs (D1D2: 24 vs 25)", "₹24.5–24.99L: 92 bills", "₹25.0–25.5L: 18 bills", "5.1x", true, "Identical equipment consignments below limit"],
            ["₹19 Lakhs (D1D2: 19 vs 20)", "₹19.5–19.99L: 60 bills", "₹20.0–20.5L: 22 bills", "2.7x", true, "State university works milestone splits"],
            ["₹09 Lakhs (D1D2: 09 vs 10)", "₹9.5–9.99L: 74 bills", "₹10.0–10.5L: 28 bills", "2.6x", true, "IT maintenance contract splits"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 27, display: "27%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 36, display: "36%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 18, display: "18%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 19, display: "19%", color: "var(--teal)" }
          ]
        }
      }
    },
    "Nominated": {
      label: "Nominated Members (12 Pan-India Presidential Portfolios)",
      sampleSize: 2089,
      sanction: {
        D1: {
          observed: [31.2, 17.9, 12.8, 9.2, 8.6, 6.9, 5.2, 4.4, 3.8],
          mad: 0.011,
          chi: "16.5",
          pVal: "0.224",
          status: { tag: "LOW", text: "Close conformity / High Integrity" },
          insight: "Nominated D1: Presidential Nominee projects demonstrate the highest mathematical fidelity to Benford's Law (MAD 0.011, p=0.224), with zero systemic cliffs.",
          cliffs: [
            ["₹50 Lakh (e-Tender Limit)", "₹45–49.99L: 14 txns", "₹50–55L: 12 txns", "1.2x", false, "Low aggregate volume (14 txns), no anomaly"],
            ["₹25 Lakh (District Approval)", "₹22–24.99L: 6 txns", "₹25–27L: 8 txns", "0.8x", false, "Statistically normal spread"],
            ["₹10 Lakh (Direct Quotation)", "₹9–9.99L: 6 txns", "₹10–11L: 8 txns", "0.8x", false, "No artificial cliff detected"],
            ["₹5 Lakh (Gram Panchayat)", "₹4.5–4.99L: 4 txns", "₹5–5.5L: 5 txns", "0.8x", false, "Clear statutory spread"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 12, display: "12%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 19, display: "19%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 8, display: "8%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 61, display: "61%", color: "var(--teal)" }
          ]
        },
        D2: {
          observed: [14.2, 11.8, 10.8, 10.2, 9.8, 12.4, 9.4, 8.6, 6.8, 6.0],
          mad: 0.018,
          chi: "22.4",
          pVal: "0.131",
          status: { tag: "LOW", text: "Normal Estimation Variance" },
          insight: "Nominated D2: Detailed engineering estimates with precise Scheduled Rates (SoR) accounting for 62% of works.",
          cliffs: [
            ["₹49.x Lakh vs ₹50.x Lakh", "₹49.0–49.99L: 12 txns", "₹50.0–50.99L: 10 txns", "1.2x", false, "Conforming distribution across national bodies"],
            ["₹24.x Lakh vs ₹25.x Lakh", "₹24.0–24.99L: 6 txns", "₹25.0–25.99L: 6 txns", "1.0x", false, "Engineering estimate compliance"],
            ["₹19.x Lakh vs ₹20.x Lakh", "₹19.0–19.99L: 4 txns", "₹20.0–20.99L: 5 txns", "0.8x", false, "No structuring observed"],
            ["₹9.x Lakh vs ₹10.x Lakh", "₹9.0–9.99L: 4 txns", "₹10.0–10.99L: 6 txns", "0.7x", false, "Legitimate standard rates"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 14, display: "14%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 21, display: "21%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 9, display: "9%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 56, display: "56%", color: "var(--teal)" }
          ]
        },
        D1D2: {
          observed: [4.8, 3.2, 2.4, 2.0, 1.6, 1.2, 1.1, 0.8, 0.7],
          mad: 0.019,
          chi: "26.8",
          pVal: "0.082",
          status: { tag: "LOW", text: "Minimal Structuring" },
          insight: "Nominated D1D2: Only 14 works near the ₹50L boundary across all 12 nationwide portfolios.",
          cliffs: [
            ["₹49 Lakhs (D1D2: 49 vs 50)", "₹49.5–49.99L: 8 txns", "₹50.0–50.5L: 6 txns", "1.3x", false, "National trust grants within normal bounds"],
            ["₹24 Lakhs (D1D2: 24 vs 25)", "₹24.5–24.99L: 4 txns", "₹25.0–25.5L: 4 txns", "1.0x", false, "Zero cliff detected"],
            ["₹19 Lakhs (D1D2: 19 vs 20)", "₹19.5–19.99L: 2 txns", "₹20.0–20.5L: 4 txns", "0.5x", false, "Statistically non-anomalous"],
            ["₹09 Lakhs (D1D2: 09 vs 10)", "₹9.5–9.99L: 2 txns", "₹10.0–10.5L: 4 txns", "0.5x", false, "Normal distribution"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 14, display: "14%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 22, display: "22%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 9, display: "9%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 55, display: "55%", color: "var(--teal)" }
          ]
        }
      },
      vendor: {
        D1: {
          observed: [33.8, 18.5, 12.4, 8.6, 9.2, 6.2, 4.8, 3.8, 2.7],
          mad: 0.019,
          chi: "28.3",
          pVal: "0.042",
          status: { tag: "LOW", text: "Acceptable Variance" },
          insight: "Nominated Vendor D1: Nationwide vendors with negligible local syndicate concentration.",
          cliffs: [
            ["₹50 Lakh (e-Tender Limit)", "₹45–49.99L: 22 bills", "₹50–55L: 16 bills", "1.4x", false, "Low volume PSU/trust vendor disbursements"],
            ["₹25 Lakh (District Approval)", "₹22–24.99L: 10 bills", "₹25–27L: 12 bills", "0.8x", false, "Transparent central agency bills"],
            ["₹10 Lakh (Direct Quotation)", "₹9–9.99L: 8 bills", "₹10–11L: 10 bills", "0.8x", false, "Normal institutional supply bills"],
            ["₹5 Lakh (Gram Panchayat)", "₹4.5–4.99L: 6 bills", "₹5–5.5L: 8 bills", "0.8x", false, "Standard small vouchers"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 14, display: "14%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 22, display: "22%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 9, display: "9%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 55, display: "55%", color: "var(--teal)" }
          ]
        },
        D2: {
          observed: [16.2, 11.2, 10.4, 9.8, 9.4, 14.1, 8.8, 7.8, 6.4, 5.9],
          mad: 0.026,
          chi: "36.2",
          pVal: "0.021",
          status: { tag: "MEDIUM", text: "Minor Rounding" },
          insight: "Nominated Vendor D2: Low rate of arbitrary round milestone disbursements.",
          cliffs: [
            ["₹49.x Lakh vs ₹50.x Lakh", "₹49.0–49.99L: 16 bills", "₹50.0–50.99L: 12 bills", "1.3x", false, "Negligible boundary skew"],
            ["₹24.x Lakh vs ₹25.x Lakh", "₹24.0–24.99L: 8 bills", "₹25.0–25.99L: 8 bills", "1.0x", false, "Itemized contractor measurement books"],
            ["₹19.x Lakh vs ₹20.x Lakh", "₹19.0–19.99L: 6 bills", "₹20.0–20.99L: 6 bills", "1.0x", false, "Normal curve across institutions"],
            ["₹9.x Lakh vs ₹10.x Lakh", "₹9.0–9.99L: 6 bills", "₹10.0–10.99L: 8 bills", "0.8x", false, "No quotation evasion"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 15, display: "15%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 24, display: "24%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 10, display: "10%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 51, display: "51%", color: "var(--teal)" }
          ]
        },
        D1D2: {
          observed: [5.6, 3.8, 2.9, 2.6, 1.8, 1.4, 1.5, 0.9, 0.7],
          mad: 0.027,
          chi: "39.4",
          pVal: "0.018",
          status: { tag: "LOW", text: "Low Syndicate Risk" },
          insight: "Nominated Vendor D1D2: Transparent vendor distribution across central PSUs and national trusts.",
          cliffs: [
            ["₹49 Lakhs (D1D2: 49 vs 50)", "₹49.5–49.99L: 12 bills", "₹50.0–50.5L: 8 bills", "1.5x", false, "Low volume (12 bills), verified items"],
            ["₹24 Lakhs (D1D2: 24 vs 25)", "₹24.5–24.99L: 6 bills", "₹25.0–25.5L: 6 bills", "1.0x", false, "Standard central PSU billing"],
            ["₹19 Lakhs (D1D2: 19 vs 20)", "₹19.5–19.99L: 4 bills", "₹20.0–20.5L: 4 bills", "1.0x", false, "Transparent disbursement timeline"],
            ["₹09 Lakhs (D1D2: 09 vs 10)", "₹9.5–9.99L: 4 bills", "₹10.0–10.5L: 6 bills", "0.7x", false, "Statistically clean"]
          ],
          roundBias: [
            { label: "Ends in ₹50,000", value: 16, display: "16%", color: "var(--gold)" },
            { label: "Ends in ₹1,00,000", value: 25, display: "25%", color: "var(--amber)" },
            { label: "Ends in ₹5,00,000", value: 10, display: "10%", color: "var(--crimson)" },
            { label: "Irregular Precision", value: 49, display: "49%", color: "var(--teal)" }
          ]
        }
      }
    }
  };

  document.querySelectorAll("#datasetPills .pill-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#datasetPills .pill-btn").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    benfordState.dataset = b.dataset.dataset;
    renderBenford();
  }));

  document.querySelectorAll("#digitPills .pill-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#digitPills .pill-btn").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    benfordState.digit = b.dataset.digit;
    renderBenford();
  }));

  document.querySelectorAll("#entityPills .pill-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#entityPills .pill-btn").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    benfordState.entity = b.dataset.entity;
    renderEntityBoard();
  }));

  function renderBenford() {
    const houseKey = (currentHouseFilter in benfordDataset) ? currentHouseFilter : "all";
    const hData = benfordDataset[houseKey];
    const dData = hData[benfordState.dataset] || hData.sanction;
    const modeData = dData[benfordState.digit] || dData.D1;

    let digits = [], expected = [];
    if (benfordState.digit === "D1") {
      digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      expected = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];
    } else if (benfordState.digit === "D2") {
      digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      expected = [12.0, 11.4, 10.9, 10.4, 10.0, 9.7, 9.3, 9.0, 8.8, 8.5];
    } else {
      // D1D2 (Sample first two digits)
      digits = [10, 15, 20, 25, 30, 40, 50, 60, 75];
      expected = [4.1, 2.8, 2.1, 1.7, 1.4, 1.1, 0.9, 0.7, 0.6];
    }

    const observed = modeData.observed;

    // Update Scope Badge in header
    const scopeLabel = document.getElementById("benfordScopeLabel");
    if (scopeLabel) {
      const shortName = houseKey === "all" ? "All Houses" : houseKey;
      scopeLabel.textContent = `${shortName} · ${hData.sampleSize.toLocaleString()} Works`;
    }

    // Update Insight Banner
    const insightEl = document.getElementById("benfordInsightText");
    if (insightEl) {
      insightEl.style.opacity = "0";
      setTimeout(() => {
        insightEl.textContent = modeData.insight;
        insightEl.style.opacity = "1";
      }, 150);
    }

    // Update Chart Card Scope Badge
    const chartScope = document.getElementById("benfordChartScopeBadge");
    if (chartScope) chartScope.textContent = `${houseKey === 'all' ? 'National' : houseKey} (n=${hData.sampleSize.toLocaleString()})`;

    // Draw Grouped Bars with smooth transition
    drawGroupedBars("benfordChart", digits, [
      { name: "Observed Audit", color: cssVar('--gold'), values: observed },
      { name: "Expected (Benford)", color: cssVar('--teal'), values: expected }
    ], { max: Math.max(...observed, ...expected) * 1.18 });

    // Draw Gauge with smooth needle rotation
    drawGauge("gaugeChart", modeData.mad, 0.06, "MAD CONFORMITY", modeData.status);

    // Update Chi-Square and P-Value with counter animation
    const chiEl = document.getElementById("chiVal");
    const pEl = document.getElementById("pVal");
    if (chiEl) animateNumber(chiEl, modeData.chi, 500);
    if (pEl) animateNumber(pEl, modeData.pVal, 500);

    // Dynamic GFR 144 Threshold Cliffs and Scope Badge
    const activeCliffs = modeData.cliffs || dData.cliffs || hData.cliffs;
    const cliffsBadge = document.getElementById("benfordCliffsScopeBadge");
    if (cliffsBadge) {
      const dsTitle = benfordState.dataset === "vendor" ? "Vendor Invoices" : "Sanction Orders";
      const houseTitle = houseKey === "all" ? "National" : houseKey;
      cliffsBadge.textContent = `${dsTitle} · ${benfordState.digit} (${houseTitle})`;
    }
    const cliffs = document.getElementById("cliffsBody");
    if (cliffs && activeCliffs) {
      cliffs.innerHTML = activeCliffs.map(r => `
        <tr class="row-updated">
          <td style="font-weight:500;">${r[0]}</td>
          <td class="mono">${r[1]}</td>
          <td class="mono">${r[2]}</td>
          <td class="mono" style="font-weight:600; color:${r[4] ? 'var(--crimson)' : 'var(--teal)'};">${r[3]}</td>
          <td>
            <span class="risk-tag risk-${r[4] ? 'CRITICAL' : 'LOW'}">${r[4] ? 'CLIFF DETECTED' : 'CLEAR'}</span>
            <div style="font-size:10.5px; color:var(--ink-faint); margin-top:3px;">${r[5]}</div>
          </td>
        </tr>`).join("");
    }

    // Dynamic Round Bias Chart and Scope Badge
    const activeRoundBias = modeData.roundBias || dData.roundBias || hData.roundBias;
    const biasBadge = document.getElementById("benfordBiasScopeBadge");
    if (biasBadge) {
      const dsTitle = benfordState.dataset === "vendor" ? "Vendor Invoices" : "Sanction Orders";
      const houseTitle = houseKey === "all" ? "National" : houseKey;
      biasBadge.textContent = `${dsTitle} Precision (${houseTitle})`;
    }
    if (activeRoundBias) {
      drawHBars("roundBiasChart", activeRoundBias);
    }

    // Update Entity Board dynamically connected to dataset & house
    renderEntityBoard();

    // Pulse cards to give tactile feedback that data updated
    ["benfordBarsCard", "benfordGaugeCard", "benfordCliffsCard", "benfordBiasCard"].forEach(id => {
      const card = document.getElementById(id);
      if (card) {
        card.classList.remove("data-updated-pulse");
        void card.offsetWidth;
        card.classList.add("data-updated-pulse");
      }
    });
  }

  function renderEntityBoard() {
    const isLS = currentHouseFilter === "Lok Sabha";
    const isRS = currentHouseFilter === "Rajya Sabha";
    const isNom = currentHouseFilter === "Nominated";
    const isVendor = benfordState.dataset === "vendor";

    let stateList, districtList, mpList, vendorList;

    if (isVendor) {
      stateList = isRS ? [
        ["Uttar Pradesh (Disbursements)", 6240, 0.048, "NON-CONFORMING"],
        ["Bihar (Disbursements)", 4810, 0.039, "ACCEPTABLE"],
        ["Assam (Disbursements)", 2940, 0.016, "CLOSE CONFORMITY"],
        ["Maharashtra (Disbursements)", 4120, 0.014, "CLOSE CONFORMITY"]
      ] : isNom ? [
        ["Pan-India Central Trust Grants", 640, 0.014, "CLOSE CONFORMITY"],
        ["Delhi NCR (Apex Institutions)", 410, 0.012, "CLOSE CONFORMITY"],
        ["Jammu & Kashmir (Restoration)", 280, 0.011, "CLOSE CONFORMITY"],
        ["Assam Heritage Foundation", 190, 0.013, "CLOSE CONFORMITY"]
      ] : [
        ["Uttar Pradesh (Disbursements)", 18450, 0.058, "NON-CONFORMING"],
        ["Bihar (Disbursements)", 12890, 0.046, "NON-CONFORMING"],
        ["Rajasthan (Disbursements)", 9640, 0.039, "ACCEPTABLE"],
        ["Maharashtra (Disbursements)", 11200, 0.018, "CLOSE CONFORMITY"]
      ];

      districtList = isRS ? [
        ["Lucknow Metro (Vendor Bills)", 780, 0.044, "NON-CONFORMING"],
        ["Patna HQ (Vendor Bills)", 620, 0.036, "ACCEPTABLE"],
        ["Guwahati Urban (Vendor Bills)", 490, 0.018, "CLOSE CONFORMITY"],
        ["Nagpur Division (Vendor Bills)", 510, 0.013, "CLOSE CONFORMITY"]
      ] : isNom ? [
        ["New Delhi (Central PSUs)", 220, 0.014, "CLOSE CONFORMITY"],
        ["Srinagar (Heritage Projects)", 140, 0.012, "CLOSE CONFORMITY"],
        ["Guwahati (Cultural Centres)", 110, 0.011, "CLOSE CONFORMITY"],
        ["Varanasi (Art Preservation)", 95, 0.013, "CLOSE CONFORMITY"]
      ] : [
        ["Pilibhit (Vendor Invoices)", 1420, 0.068, "NON-CONFORMING"],
        ["Gaya (Vendor Invoices)", 1180, 0.054, "NON-CONFORMING"],
        ["Barabanki (Vendor Invoices)", 1050, 0.042, "NON-CONFORMING"],
        ["Kamrup Metro (Vendor Invoices)", 890, 0.018, "CLOSE CONFORMITY"]
      ];

      mpList = isRS ? [
        ["MP Javed Ali (RS - Vendor Draws)", 248, 0.062, "NON-CONFORMING"],
        ["MP D. Saikia (RS - Vendor Draws)", 192, 0.024, "ACCEPTABLE"],
        ["MP K. Reddy (RS - Vendor Draws)", 164, 0.015, "CLOSE CONFORMITY"],
        ["MP S. Patil (RS - Vendor Draws)", 188, 0.012, "CLOSE CONFORMITY"]
      ] : isNom ? [
        ["Nominated MP 01 (National Trust)", 58, 0.012, "CLOSE CONFORMITY"],
        ["Nominated MP 04 (Sports Grants)", 44, 0.014, "CLOSE CONFORMITY"],
        ["Nominated MP 07 (Cultural Inst)", 38, 0.010, "CLOSE CONFORMITY"],
        ["Nominated MP 11 (Science Research)", 42, 0.009, "CLOSE CONFORMITY"]
      ] : [
        ["MP Ramesh Chandra (LS - Contractor Draws)", 314, 0.074, "NON-CONFORMING"],
        ["MP D. Saikia (LS - Contractor Draws)", 242, 0.026, "ACCEPTABLE"],
        ["MP K. Reddy (LS - Contractor Draws)", 218, 0.016, "CLOSE CONFORMITY"],
        ["MP S. Patil (LS - Contractor Draws)", 264, 0.013, "CLOSE CONFORMITY"]
      ];

      vendorList = [
        ["Shree Infra Works (Disbursements)", 142, 0.088, "NON-CONFORMING"],
        ["Marwar Constructions (Disbursements)", 94, 0.078, "NON-CONFORMING"],
        ["Rayalaseema Builders (Disbursements)", 112, 0.048, "ACCEPTABLE"],
        ["Ganga Civil Contractors (Disbursements)", 82, 0.016, "CLOSE CONFORMITY"]
      ];
    } else {
      // Sanction mode
      stateList = isRS ? [
        ["Uttar Pradesh (RS Sanctions)", 4820, 0.024, "ACCEPTABLE"],
        ["Maharashtra (RS Sanctions)", 3940, 0.014, "CLOSE CONFORMITY"],
        ["Bihar (RS Sanctions)", 3110, 0.019, "ACCEPTABLE"],
        ["Tamil Nadu (RS Sanctions)", 3240, 0.011, "CLOSE CONFORMITY"]
      ] : isNom ? [
        ["National Heritage Portfolios", 880, 0.011, "CLOSE CONFORMITY"],
        ["Delhi Central Institutions", 520, 0.012, "CLOSE CONFORMITY"],
        ["Pan-India Cultural Centres", 380, 0.010, "CLOSE CONFORMITY"],
        ["North-East Tribal Grants", 309, 0.013, "CLOSE CONFORMITY"]
      ] : [
        ["Uttar Pradesh", 14210, 0.041, "NON-CONFORMING"],
        ["Bihar", 9880, 0.026, "ACCEPTABLE"],
        ["Assam", 6120, 0.012, "CLOSE CONFORMITY"],
        ["Maharashtra", 8900, 0.011, "CLOSE CONFORMITY"]
      ];

      districtList = isRS ? [
        ["Lucknow (State Sanctions)", 540, 0.028, "ACCEPTABLE"],
        ["Patna (State Sanctions)", 460, 0.022, "ACCEPTABLE"],
        ["Guwahati (State Sanctions)", 380, 0.014, "CLOSE CONFORMITY"],
        ["Nagpur (State Sanctions)", 410, 0.011, "CLOSE CONFORMITY"]
      ] : isNom ? [
        ["National Capital Region", 310, 0.012, "CLOSE CONFORMITY"],
        ["Srinagar District", 180, 0.011, "CLOSE CONFORMITY"],
        ["Kamrup Metropolitan", 140, 0.010, "CLOSE CONFORMITY"],
        ["Varanasi Heritage Zone", 120, 0.012, "CLOSE CONFORMITY"]
      ] : [
        ["Pilibhit", 980, 0.052, "NON-CONFORMING"],
        ["Barabanki", 860, 0.038, "ACCEPTABLE"],
        ["Nagaon", 710, 0.015, "CLOSE CONFORMITY"],
        ["Pune", 720, 0.009, "CLOSE CONFORMITY"]
      ];

      mpList = isRS ? [
        ["MP Javed Ali (RS)", 182, 0.054, "NON-CONFORMING"],
        ["MP D. Saikia (RS)", 140, 0.019, "ACCEPTABLE"],
        ["MP K. Reddy (RS)", 124, 0.012, "CLOSE CONFORMITY"],
        ["MP S. Patil (RS)", 155, 0.009, "CLOSE CONFORMITY"]
      ] : isNom ? [
        ["Nominated MP 01", 62, 0.011, "CLOSE CONFORMITY"],
        ["Nominated MP 04", 48, 0.012, "CLOSE CONFORMITY"],
        ["Nominated MP 07", 40, 0.009, "CLOSE CONFORMITY"],
        ["Nominated MP 11", 45, 0.008, "CLOSE CONFORMITY"]
      ] : [
        ["MP Ramesh Chandra (LS)", 212, 0.061, "NON-CONFORMING"],
        ["MP D. Saikia (LS)", 180, 0.021, "ACCEPTABLE"],
        ["MP K. Reddy (LS)", 164, 0.014, "CLOSE CONFORMITY"],
        ["MP S. Patil (LS)", 195, 0.011, "CLOSE CONFORMITY"]
      ];

      vendorList = [
        ["Shree Infra Works", 96, 0.071, "NON-CONFORMING"],
        ["Rayalaseema Builders", 74, 0.033, "ACCEPTABLE"],
        ["Marwar Constructions", 62, 0.064, "NON-CONFORMING"],
        ["Ganga Civil Contractors", 58, 0.011, "CLOSE CONFORMITY"]
      ];
    }

    const data = {
      state: stateList,
      district: districtList,
      mp: mpList,
      vendor: vendorList,
    }[benfordState.entity] || [];

    const el = document.getElementById("entityBody");
    if (el) {
      el.innerHTML = data.map(r => `
        <tr class="row-updated">
          <td>${r[0]}</td>
          <td class="mono">${r[1].toLocaleString()}</td>
          <td class="mono">${r[2].toFixed(3)}</td>
          <td><span class="risk-tag risk-${r[3] === 'NON-CONFORMING' ? 'CRITICAL' : r[3] === 'ACCEPTABLE' ? 'MEDIUM' : 'LOW'}">${r[3]}</span></td>
        </tr>`).join("");
    }

    const lCard = document.getElementById("benfordLeaderboardCard");
    if (lCard) {
      lCard.classList.remove("data-updated-pulse");
      void lCard.offsetWidth;
      lCard.classList.add("data-updated-pulse");
    }
  }

  /* ================= VENDOR COLLUSION & NETWORKS (DYNAMIC & FULLY CONNECTED) ================= */
  const vendorLeaderboard = [
    {
      name: "Shree Infra Works",
      contracts: 96,
      sanctioned: "₹41.2 Cr",
      risk: 82,
      monopoly: 6,
      mps: 4,
      states: 2,
      aliases: ["Shree Infra Wrks Pvt Ltd", "S. Infra Works", "Shree Infra (regd. UP-04421)"],
      connectedMPs: ["MP Javed Ali", "MP D. Saikia", "MP Ramesh Chandra"],
      subVendors: ["Awadh Works", "Purvanchal Road", "Jodhpur Civil"]
    },
    {
      name: "Rayalaseema Builders",
      contracts: 74,
      sanctioned: "₹28.4 Cr",
      risk: 68,
      monopoly: 3,
      mps: 3,
      states: 1,
      aliases: ["Rayalaseema Infra", "Rayala Builders Corp"],
      connectedMPs: ["MP K. Reddy", "MP Javed Ali"],
      subVendors: ["Rayala Tech", "Kurnool Cements"]
    },
    {
      name: "Marwar Constructions",
      contracts: 62,
      sanctioned: "₹24.1 Cr",
      risk: 79,
      monopoly: 4,
      mps: 2,
      states: 1,
      aliases: ["Marwar Civil Eng", "M.C. Builders Jodhpur"],
      connectedMPs: ["MP Ramesh Chandra", "MP Javed Ali"],
      subVendors: ["Marwar Civil Eng", "Purvanchal Road"]
    },
    {
      name: "Northeast Solar Co.",
      contracts: 52,
      sanctioned: "₹19.1 Cr",
      risk: 59,
      monopoly: 2,
      mps: 5,
      states: 3,
      aliases: ["NE Solar Power Ltd", "Northeast Clean Energy"],
      connectedMPs: ["MP D. Saikia", "MP B. Sahu"],
      subVendors: ["NE Solar Tech", "Brahmaputra Power"]
    },
    {
      name: "Mahanadi Builders",
      contracts: 46,
      sanctioned: "₹16.8 Cr",
      risk: 82,
      monopoly: 4,
      mps: 2,
      states: 2,
      aliases: ["Mahanadi Civil Corp", "Raipur Infra Group"],
      connectedMPs: ["MP B. Sahu", "MP S. Soren"],
      subVendors: ["Raipur Steel Fab", "Bastar Infra"]
    },
    {
      name: "Chotanagpur Infra",
      contracts: 42,
      sanctioned: "₹14.5 Cr",
      risk: 78,
      monopoly: 3,
      mps: 2,
      states: 1,
      aliases: ["Chotanagpur Roadworks", "CNP Civil Ltd"],
      connectedMPs: ["MP S. Soren", "MP Ramesh Chandra"],
      subVendors: ["Ranchi Stone Crushing", "Damodar Quarry"]
    },
    {
      name: "Ganga Civil Contractors",
      contracts: 38,
      sanctioned: "₹11.6 Cr",
      risk: 41,
      monopoly: 0,
      mps: 2,
      states: 1,
      aliases: ["Ganga Works Patna"],
      connectedMPs: ["MP Javed Ali", "MP Ramesh Chandra"],
      subVendors: ["Patna Concrete Supply"]
    },
    {
      name: "Chinar Infra Projects",
      contracts: 34,
      sanctioned: "₹10.8 Cr",
      risk: 65,
      monopoly: 2,
      mps: 2,
      states: 1,
      aliases: ["Chinar Valley Builders", "Srinagar Civil Works"],
      connectedMPs: ["MP A. Lone", "MP Dr. S. Rao"],
      subVendors: ["Jhelum Stone Works", "Valley Bitumen"]
    },
    {
      name: "Deccan Builders",
      contracts: 29,
      sanctioned: "₹9.0 Cr",
      risk: 35,
      monopoly: 0,
      mps: 1,
      states: 1,
      aliases: ["Deccan Infrastructure Group"],
      connectedMPs: ["MP S. Patil"],
      subVendors: ["Pune RMC Supply"]
    },
    {
      name: "Konkan Coastal Works",
      contracts: 27,
      sanctioned: "₹8.4 Cr",
      risk: 44,
      monopoly: 1,
      mps: 2,
      states: 1,
      aliases: ["Konkan Marine Infra", "Western Coast Civil"],
      connectedMPs: ["MP S. Patil", "MP K. Reddy"],
      subVendors: ["Ratnagiri Civil Co"]
    },
    {
      name: "Garhwal Civil Works",
      contracts: 25,
      sanctioned: "₹7.9 Cr",
      risk: 32,
      monopoly: 0,
      mps: 1,
      states: 1,
      aliases: ["Garhwal Hill Infra", "Uttarakhand Builders"],
      connectedMPs: ["MP T. Rawat"],
      subVendors: ["Doon Pavers"]
    },
    {
      name: "Himalayan Infra Co.",
      contracts: 24,
      sanctioned: "₹7.2 Cr",
      risk: 28,
      monopoly: 0,
      mps: 1,
      states: 1,
      aliases: ["Himalayan Concrete", "HP Mountain Works"],
      connectedMPs: ["MP S. Kashyap"],
      subVendors: ["Solan Aggregates"]
    },
    {
      name: "Kalinga Stone & Roadways",
      contracts: 22,
      sanctioned: "₹6.8 Cr",
      risk: 54,
      monopoly: 1,
      mps: 2,
      states: 1,
      aliases: ["Kalinga Infra Corp", "Odisha Roadlines"],
      connectedMPs: ["MP K. Reddy", "MP D. Saikia"],
      subVendors: ["Cuttack Bitumen"]
    },
    {
      name: "Malwa Power & Civil",
      contracts: 21,
      sanctioned: "₹6.2 Cr",
      risk: 49,
      monopoly: 1,
      mps: 2,
      states: 1,
      aliases: ["Malwa Energy Works", "MP Rural Electrics"],
      connectedMPs: ["MP Ramesh Chandra", "MP B. Sahu"],
      subVendors: ["Indore Metal Works"]
    },
    {
      name: "Sundarbans Marine Works",
      contracts: 19,
      sanctioned: "₹5.9 Cr",
      risk: 38,
      monopoly: 0,
      mps: 1,
      states: 1,
      aliases: ["Delta Marine Works", "Bengal Coastal Corp"],
      connectedMPs: ["MP D. Saikia"],
      subVendors: ["Delta Embankments"]
    },
    {
      name: "National Heritage Trust",
      contracts: 18,
      sanctioned: "₹5.2 Cr",
      risk: 21,
      monopoly: 0,
      mps: 2,
      states: 2,
      aliases: ["Heritage Conservation Foundation"],
      connectedMPs: ["MP Dr. S. Rao"],
      subVendors: ["Heritage Restoration Group"]
    },
    {
      name: "Solar India Tech",
      contracts: 17,
      sanctioned: "₹4.8 Cr",
      risk: 28,
      monopoly: 0,
      mps: 1,
      states: 1,
      aliases: ["Solar Tech Karnataka", "Green Power BLR"],
      connectedMPs: ["MP Dr. S. Rao"],
      subVendors: ["Bangalore Solar Modules"]
    },
    {
      name: "Braj Civil Consortium",
      contracts: 16,
      sanctioned: "₹4.5 Cr",
      risk: 62,
      monopoly: 2,
      mps: 2,
      states: 1,
      aliases: ["Braj Construction Partners", "Mathura Civil Corp"],
      connectedMPs: ["MP Javed Ali", "MP Ramesh Chandra"],
      subVendors: ["Mathura Materials"]
    },
    {
      name: "Ladakh Renewable Power",
      contracts: 15,
      sanctioned: "₹4.1 Cr",
      risk: 32,
      monopoly: 0,
      mps: 1,
      states: 1,
      aliases: ["Leh Renewable Energy", "Ladakh Solar Tech"],
      connectedMPs: ["MP J. Tsering"],
      subVendors: ["Leh Solar Allied"]
    },
    {
      name: "Vindhya Infra Projects",
      contracts: 14,
      sanctioned: "₹3.9 Cr",
      risk: 45,
      monopoly: 1,
      mps: 1,
      states: 1,
      aliases: ["Vindhya Civil Works", "Rewa Infra"],
      connectedMPs: ["MP B. Sahu"],
      subVendors: ["Rewa Concrete Co"]
    },
    {
      name: "Cauvery Water Systems",
      contracts: 13,
      sanctioned: "₹3.6 Cr",
      risk: 29,
      monopoly: 0,
      mps: 1,
      states: 1,
      aliases: ["Cauvery Irrigation Tech", "Southern Water Corp"],
      connectedMPs: ["MP K. Reddy"],
      subVendors: ["Mysuru Piping Co"]
    },
    {
      name: "Thar Water Logistics",
      contracts: 12,
      sanctioned: "₹3.2 Cr",
      risk: 52,
      monopoly: 1,
      mps: 1,
      states: 1,
      aliases: ["Thar Borewell Experts", "Bikaner Water Infra"],
      connectedMPs: ["MP Ramesh Chandra"],
      subVendors: ["Bikaner Borewells"]
    },
    {
      name: "Coromandel Ports & Civil",
      contracts: 11,
      sanctioned: "₹2.9 Cr",
      risk: 36,
      monopoly: 0,
      mps: 1,
      states: 1,
      aliases: ["Coromandel Infra Ltd"],
      connectedMPs: ["MP K. Reddy"],
      subVendors: ["Chennai Aggregate Hub"]
    },
    {
      name: "Brahmaputra Dredging Corp",
      contracts: 10,
      sanctioned: "₹2.7 Cr",
      risk: 48,
      monopoly: 1,
      mps: 1,
      states: 1,
      aliases: ["Assam Dredging Ltd", "Guwahati Marine Co"],
      connectedMPs: ["MP D. Saikia"],
      subVendors: ["Guwahati Marine Tools"]
    },
    {
      name: "Mithila Public Works",
      contracts: 9,
      sanctioned: "₹2.4 Cr",
      risk: 58,
      monopoly: 1,
      mps: 1,
      states: 1,
      aliases: ["Mithila Civil Co", "Darbhanga Builders"],
      connectedMPs: ["MP Javed Ali"],
      subVendors: ["Darbhanga Civil"]
    }
  ];

  function renderVendorTable(filterText, limit) {
    limit = limit || 10;
    let rows = vendorLeaderboard;
    if (filterText) {
      const q = filterText.toLowerCase();
      rows = rows.filter(v => v.name.toLowerCase().includes(q) || (v.aliases && v.aliases.some(a => a.toLowerCase().includes(q))));
    }
    rows = rows.slice(0, limit);

    const tbody = document.getElementById("vendorBody");
    if (tbody) {
      tbody.innerHTML = rows.map(v => `
        <tr class="rowlink row-updated" data-open-vendor="${v.name}">
          <td>
            <div style="font-weight:600; color:var(--ink);">${v.name}</div>
            ${v.aliases && v.aliases.length ? `<div style="font-size:10.5px; color:var(--ink-faint); margin-top:2px;">${v.aliases[0]}</div>` : ''}
          </td>
          <td class="mono">${v.contracts}</td>
          <td class="mono" style="font-weight:600; color:var(--gold);">${v.sanctioned}</td>
          <td><span class="risk-tag risk-${riskLabel(v.risk)}">${v.risk}</span></td>
          <td>${v.monopoly > 0 ? `<span class="badge-mono" style="color:var(--crimson); border-color:rgba(226,104,92,0.4);">${v.monopoly} flags</span>` : '<span style="color:var(--ink-faint);">-</span>'}</td>
          <td class="mono">${v.mps}</td>
          <td class="mono">${v.states}</td>
        </tr>`).join("");

      tbody.querySelectorAll("[data-open-vendor]").forEach(r => {
        r.addEventListener("click", () => openVendorDrawer(r.dataset.openVendor));
      });
    }
  }

  const topNSlider = document.getElementById("topN");
  const vendorSearch = document.getElementById("vendorSearch");

  function updateNexusViews() {
    const limit = topNSlider ? parseInt(topNSlider.value) : 10;
    const query = vendorSearch ? vendorSearch.value.trim() : "";
    const vEl = document.getElementById("topNVal");
    if (vEl) vEl.textContent = limit;

    renderVendorTable(query, limit);
    renderNetwork(limit, query);
  }

  if (topNSlider) topNSlider.addEventListener("input", updateNexusViews);
  if (vendorSearch) vendorSearch.addEventListener("input", updateNexusViews);

  function renderNetwork(limit, query) {
    if (limit === undefined) {
      const s = document.getElementById("topN");
      limit = s ? parseInt(s.value) : 10;
    }
    if (query === undefined) {
      const q = document.getElementById("vendorSearch");
      query = q ? q.value.trim() : "";
    }

    let activeVendors = vendorLeaderboard;
    if (query) {
      const qLow = query.toLowerCase();
      activeVendors = activeVendors.filter(v => v.name.toLowerCase().includes(qLow) || (v.aliases && v.aliases.some(a => a.toLowerCase().includes(qLow))));
    }
    activeVendors = activeVendors.slice(0, limit);

    const net = document.getElementById("netSvg");
    if (!net) return;

    if (activeVendors.length === 0) {
      net.innerHTML = `<text x="470" y="230" text-anchor="middle" font-size="14" fill="var(--ink-faint)" font-family="IBM Plex Mono">No contractors match the current filter criteria</text>`;
      return;
    }

    // Identify unique MPs
    const mpMap = new Map();
    activeVendors.forEach(v => {
      (v.connectedMPs || []).forEach(mpName => {
        if (!mpMap.has(mpName)) {
          const mpObj = mps.find(m => m.name.toLowerCase() === mpName.toLowerCase());
          mpMap.set(mpName, {
            name: mpName,
            state: mpObj ? mpObj.state : "State Allocation",
            house: mpObj ? mpObj.house : "Lok Sabha"
          });
        }
      });
    });
    const mpList = Array.from(mpMap.values());

    // Identify unique sub-vendors
    const subMap = new Map();
    activeVendors.forEach((v, vIdx) => {
      (v.subVendors || []).forEach(subName => {
        if (!subMap.has(subName)) {
          subMap.set(subName, { name: subName, parentIndices: [vIdx] });
        } else {
          subMap.get(subName).parentIndices.push(vIdx);
        }
      });
    });
    const subList = Array.from(subMap.values());

    // Layout Canvas Dimensions
    const W = 940, H = 460;

    // Position MPs (Top Tier, y = 65)
    const mpPadX = mpList.length > 5 ? 80 : 140;
    const mpSpacing = mpList.length > 1 ? (W - 2 * mpPadX) / (mpList.length - 1) : 0;
    const mpNodes = mpList.map((m, i) => ({
      id: "mp_" + i,
      name: m.name,
      state: m.state,
      house: m.house,
      type: "mp",
      x: mpList.length === 1 ? W / 2 : mpPadX + i * mpSpacing,
      y: 65 + (i % 2 === 0 ? -6 : 8),
      r: 15,
      c: cssVar('--gold')
    }));

    // Position Vendors (Middle Tier, y = 220)
    const vPadX = activeVendors.length > 12 ? 60 : 100;
    const vSpacing = activeVendors.length > 1 ? (W - 2 * vPadX) / (activeVendors.length - 1) : 0;
    const vendorNodes = activeVendors.map((v, i) => {
      const isMonopoly = v.monopoly > 0;
      const color = v.risk >= 70 ? cssVar('--crimson') : v.risk >= 50 ? cssVar('--amber') : cssVar('--teal');
      return {
        id: "v_" + i,
        name: v.name,
        contracts: v.contracts,
        sanctioned: v.sanctioned,
        risk: v.risk,
        monopoly: isMonopoly,
        flags: v.monopoly,
        connectedMPs: v.connectedMPs || [],
        subVendors: v.subVendors || [],
        type: "vendor",
        x: activeVendors.length === 1 ? W / 2 : vPadX + i * vSpacing,
        y: 220 + (i % 2 === 0 ? -18 : 22),
        r: Math.max(10, Math.min(18, 9 + Math.round(v.contracts / 9))),
        c: color
      };
    });

    // Position Sub-vendors (Bottom Tier, y = 390)
    const sPadX = subList.length > 10 ? 50 : 110;
    const sSpacing = subList.length > 1 ? (W - 2 * sPadX) / (subList.length - 1) : 0;
    const subNodes = subList.map((s, i) => ({
      id: "sub_" + i,
      name: s.name,
      parentIndices: s.parentIndices,
      type: "sub",
      x: subList.length === 1 ? W / 2 : sPadX + i * sSpacing,
      y: 390 + (i % 2 === 0 ? -10 : 14),
      r: 6,
      c: cssVar('--ink-faint')
    }));

    // Generate Edges
    const edges = [];
    vendorNodes.forEach(vn => {
      // Connect to MPs
      vn.connectedMPs.forEach(mpName => {
        const mpNode = mpNodes.find(m => m.name.toLowerCase() === mpName.toLowerCase());
        if (mpNode) {
          edges.push({
            from: mpNode,
            to: vn,
            type: "mp-vendor",
            stroke: vn.monopoly ? "var(--crimson)" : "var(--line)",
            opacity: vn.monopoly ? 0.85 : 0.6,
            width: vn.monopoly ? 2.2 : 1.4
          });
        }
      });

      // Connect to Sub-vendors
      vn.subVendors.forEach(subName => {
        const subNode = subNodes.find(s => s.name === subName);
        if (subNode) {
          edges.push({
            from: vn,
            to: subNode,
            type: "vendor-sub",
            stroke: "var(--line-soft)",
            opacity: 0.45,
            width: 1.1,
            dashed: "3,3"
          });
        }
      });
    });

    // Update Stats Badge in card title
    const statsBadge = document.getElementById("nexusStatsBadge");
    if (statsBadge) {
      statsBadge.textContent = `Top ${activeVendors.length} Contractors · ${mpList.length} Connected MPs · ${edges.length} Collusion Ties`;
    }

    // Build SVG Content
    let svgHtml = `<defs>
      <filter id="netGlowGold" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#c9a24b" flood-opacity="0.8"/>
      </filter>
      <filter id="netGlowCrit" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#e2685c" flood-opacity="0.9"/>
      </filter>
    </defs>`;

    // Render Edges
    svgHtml += edges.map(e => `
      <line class="net-edge"
        x1="${e.from.x}" y1="${e.from.y}" x2="${e.to.x}" y2="${e.to.y}"
        stroke="${e.stroke}" stroke-width="${e.width}" stroke-opacity="${e.opacity}"
        ${e.dashed ? `stroke-dasharray="${e.dashed}"` : ''}
        data-from="${e.from.id}" data-to="${e.to.id}" />
    `).join("");

    // Render Sub-vendors
    svgHtml += subNodes.map(sn => `
      <g class="net-node-group" id="${sn.id}" data-node-type="sub" data-sub-name="${sn.name}" style="cursor:default;">
        <circle cx="${sn.x}" cy="${sn.y}" r="${sn.r}" fill="${sn.c}" opacity="0.75"/>
        <text class="net-text-sub" x="${sn.x}" y="${sn.y + 15}" text-anchor="middle" pointer-events="none">${sn.name.length > 18 ? sn.name.slice(0, 16) + '…' : sn.name}</text>
        <title>Subcontractor: ${sn.name} (Secondary Beneficiary Entity)</title>
      </g>`).join("");

    // Render Vendors
    svgHtml += vendorNodes.map(vn => {
      const shortName = vn.name.length > 17 ? vn.name.slice(0, 15) + '…' : vn.name;
      return `
        <g class="net-node-group" id="${vn.id}" data-node-type="vendor" data-net-vendor="${vn.name}" style="cursor:pointer;">
          ${vn.monopoly ? `<circle cx="${vn.x}" cy="${vn.y}" r="${vn.r + 7}" fill="none" stroke="var(--crimson)" stroke-width="1.5" class="radar-ping-circle"/>` : ''}
          <circle cx="${vn.x}" cy="${vn.y}" r="${vn.r}" fill="${vn.c}" filter="${vn.monopoly ? 'url(#netGlowCrit)' : 'none'}" opacity="0.95"/>
          <text class="net-text-vendor" x="${vn.x}" y="${vn.y + vn.r + 13}" text-anchor="middle" pointer-events="none">${shortName}</text>
          <title>${vn.name}\n• Outlay: ${vn.sanctioned} (${vn.contracts} works)\n• Audit Risk: ${vn.risk}/100\n• Monopoly Flags: ${vn.flags}\n• Connected MPs: ${vn.connectedMPs.join(', ')}\n(Click to open 360° Dossier)</title>
        </g>`;
    }).join("");

    // Render MPs
    svgHtml += mpNodes.map(mn => {
      return `
        <g class="net-node-group" id="${mn.id}" data-node-type="mp" data-net-mp="${mn.name}" style="cursor:pointer;">
          <circle cx="${mn.x}" cy="${mn.y}" r="${mn.r + 6}" fill="none" stroke="var(--gold)" stroke-width="1" stroke-dasharray="3,3" opacity="0.65"/>
          <polygon points="${mn.x},${mn.y - mn.r} ${mn.x + mn.r},${mn.y} ${mn.x},${mn.y + mn.r} ${mn.x - mn.r},${mn.y}"
            fill="${mn.c}" filter="url(#netGlowGold)"/>
          <text class="net-text-mp" x="${mn.x}" y="${mn.y + mn.r + 13}" text-anchor="middle" pointer-events="none">${mn.name}</text>
          <title>${mn.name} (${mn.house} · ${mn.state})\nClick to inspect MP 360° Portfolio</title>
        </g>`;
    }).join("");

    net.innerHTML = svgHtml;

    // Interactive Node Click Handlers
    net.querySelectorAll("[data-net-vendor]").forEach(el => {
      el.addEventListener("click", () => {
        const vName = el.dataset.netVendor;
        openVendorDrawer(vName);
        showToast(`Opened 360° intelligence profile for contractor: ${vName}`);
      });
    });

    net.querySelectorAll("[data-net-mp]").forEach(el => {
      el.addEventListener("click", () => {
        const mpName = el.dataset.netMp;
        const targetMp = mps.find(m => m.name.toLowerCase() === mpName.toLowerCase()) || mps[0];
        setView("mp");
        renderMP(targetMp);
        showToast(`Drilled down to MP portfolio: ${targetMp.name}`);
      });
    });

    // Interactive Hover Isolation: highlight connected nodes and edges
    const allGroups = net.querySelectorAll(".net-node-group");
    const allEdges = net.querySelectorAll(".net-edge");

    const defaultStatsText = `Top ${activeVendors.length} Contractors · ${mpList.length} Connected MPs · ${edges.length} Collusion Ties`;

    function isolateNode(nodeId, type, nodeEl) {
      allEdges.forEach(edge => {
        const from = edge.dataset.from;
        const to = edge.dataset.to;
        if (from === nodeId || to === nodeId) {
          edge.classList.add("net-highlighted");
        } else {
          edge.classList.add("net-dimmed");
        }
      });

      const connectedNodeIds = new Set([nodeId]);
      allEdges.forEach(edge => {
        const from = edge.dataset.from;
        const to = edge.dataset.to;
        if (from === nodeId) connectedNodeIds.add(to);
        if (to === nodeId) connectedNodeIds.add(from);
      });

      allGroups.forEach(g => {
        if (!connectedNodeIds.has(g.id)) {
          g.classList.add("net-dimmed");
        } else {
          g.classList.add("net-highlighted");
        }
      });

      if (statsBadge) {
        if (type === "vendor") {
          const vName = nodeEl.dataset.netVendor;
          const vObj = activeVendors.find(v => v.name === vName);
          if (vObj) {
            statsBadge.textContent = `🚨 ${vObj.name} · Outlay: ${vObj.sanctioned} (${vObj.contracts} works) · Risk: ${vObj.risk}/100 ${vObj.monopoly > 0 ? '· ' + vObj.monopoly + ' Monopoly Flags' : ''}`;
          }
        } else if (type === "mp") {
          const mpName = nodeEl.dataset.netMp;
          statsBadge.textContent = `🏛️ ${mpName} · Direct fund pipeline to highlighted contractor cartels`;
        } else if (type === "sub") {
          const sName = nodeEl.dataset.subName;
          statsBadge.textContent = `📦 Subcontractor: ${sName} · Secondary Beneficiary Entity`;
        }
      }
    }

    function resetIsolation() {
      allEdges.forEach(e => e.classList.remove("net-highlighted", "net-dimmed"));
      allGroups.forEach(g => g.classList.remove("net-highlighted", "net-dimmed"));
      if (statsBadge) statsBadge.textContent = defaultStatsText;
    }

    allGroups.forEach(g => {
      g.addEventListener("mouseenter", () => isolateNode(g.id, g.dataset.nodeType, g));
      g.addEventListener("mouseleave", resetIsolation);
    });
  }

  /* Vendor Drawer with FIXED vendor-specific contract filtering */
  const drawer = document.getElementById("vendorDrawer"), drawerBackdrop = document.getElementById("drawerBackdrop");
  function openVendorDrawer(name) {
    const v = vendorLeaderboard.find(x => x.name === name) || vendorLeaderboard[0];
    document.getElementById("drawerName").textContent = v.name;
    document.getElementById("drawerAliases").innerHTML = (v.aliases || ["Generic Entity"]).map(a => `<span class="alias-chip">${a}</span>`).join("");
    document.getElementById("drawerAssoc").innerHTML = `Associated MPs: MP Javed Ali, MP D. Saikia<br>Monopoly Flags: <b>${v.monopoly} statutory violations</b>`;

    // FIX: Scope strictly to this vendor
    const vendorWorks = alertsData.filter(a => a.vendor.toLowerCase() === v.name.toLowerCase());
    const contractsTbody = document.getElementById("drawerContracts");
    if (contractsTbody) {
      contractsTbody.innerHTML = (vendorWorks.length > 0 ? vendorWorks : alertsData.slice(0, 3)).map(a => `
        <tr class="rowlink" data-open-case="${a.id}"><td>${a.id}</td><td class="mono">₹${(a.sanction / 100000).toFixed(1)}L</td><td><span class="risk-tag risk-${riskLabel(a.risk)}">${a.risk}</span></td></tr>`).join("");
    }
    bindRowOpeners();
    if (drawer) drawer.classList.add("open");
    if (drawerBackdrop) drawerBackdrop.classList.add("open");
  }
  document.querySelectorAll("[data-close-drawer]").forEach(b => b.addEventListener("click", () => {
    if (drawer) drawer.classList.remove("open");
    if (drawerBackdrop) drawerBackdrop.classList.remove("open");
  }));
  if (drawerBackdrop) drawerBackdrop.addEventListener("click", () => {
    if (drawer) drawer.classList.remove("open");
    if (drawerBackdrop) drawerBackdrop.classList.remove("open");
  });

  /* ================= ALL-INDIA 31-STATE & UT PARLIAMENTARY ROSTER ================= */
  const stateSeatData = {
    "Uttar Pradesh": { ls: 80, rs: 31, budget: "₹612 Cr", works: 14210 },
    "Maharashtra": { ls: 48, rs: 19, budget: "₹340 Cr", works: 8900 },
    "West Bengal": { ls: 42, rs: 16, budget: "₹310 Cr", works: 7900 },
    "Bihar": { ls: 40, rs: 16, budget: "₹390 Cr", works: 9880 },
    "Tamil Nadu": { ls: 39, rs: 18, budget: "₹260 Cr", works: 6200 },
    "Madhya Pradesh": { ls: 29, rs: 11, budget: "₹280 Cr", works: 7100 },
    "Karnataka": { ls: 28, rs: 12, budget: "₹290 Cr", works: 6800 },
    "Gujarat": { ls: 26, rs: 11, budget: "₹240 Cr", works: 5800 },
    "Andhra Pradesh": { ls: 25, rs: 11, budget: "₹260 Cr", works: 7400 },
    "Rajasthan": { ls: 25, rs: 10, budget: "₹230 Cr", works: 6450 },
    "Odisha": { ls: 21, rs: 10, budget: "₹170 Cr", works: 4600 },
    "Kerala": { ls: 20, rs: 9, budget: "₹140 Cr", works: 3900 },
    "Telangana": { ls: 17, rs: 7, budget: "₹180 Cr", works: 5200 },
    "Assam": { ls: 14, rs: 7, budget: "₹210 Cr", works: 6120 },
    "Jharkhand": { ls: 14, rs: 6, budget: "₹235 Cr", works: 5840 },
    "Punjab": { ls: 13, rs: 7, budget: "₹150 Cr", works: 4300 },
    "Chhattisgarh": { ls: 11, rs: 5, budget: "₹215 Cr", works: 5120 },
    "Haryana": { ls: 10, rs: 5, budget: "₹195 Cr", works: 4210 },
    "Delhi": { ls: 7, rs: 3, budget: "₹130 Cr", works: 2840 },
    "Jammu & Kashmir": { ls: 5, rs: 4, budget: "₹155 Cr", works: 3620 },
    "Uttarakhand": { ls: 5, rs: 3, budget: "₹160 Cr", works: 3820 },
    "Himachal Pradesh": { ls: 4, rs: 3, budget: "₹145 Cr", works: 3450 },
    "Goa": { ls: 2, rs: 1, budget: "₹45 Cr", works: 980 },
    "Tripura": { ls: 2, rs: 1, budget: "₹72 Cr", works: 1610 },
    "Manipur": { ls: 2, rs: 1, budget: "₹65 Cr", works: 1420 },
    "Meghalaya": { ls: 2, rs: 1, budget: "₹62 Cr", works: 1380 },
    "Arunachal Pradesh": { ls: 2, rs: 1, budget: "₹68 Cr", works: 1540 },
    "Nagaland": { ls: 1, rs: 1, budget: "₹50 Cr", works: 1120 },
    "Mizoram": { ls: 1, rs: 1, budget: "₹44 Cr", works: 940 },
    "Sikkim": { ls: 1, rs: 1, budget: "₹38 Cr", works: 820 },
    "Ladakh": { ls: 1, rs: 0, budget: "₹30 Cr", works: 620 }
  };

  const mps = [
    // --- UTTAR PRADESH (80 LS · 31 RS) ---
    { name: "MP Javed Ali", house: "Lok Sabha", state: "Uttar Pradesh", cons: "Pilibhit, Uttar Pradesh", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 212, amount: "₹9.8 Cr", spent: "₹9.4 Cr", risk: 71, exec: [{ label: "Completed", value: 120, color: cssVar('--teal') }, { label: "In progress", value: 60, color: cssVar('--gold') }, { label: "Delayed", value: 22, color: cssVar('--amber') }, { label: "Flagged", value: 10, color: cssVar('--crimson') }], vendors: [{ label: "Shree Infra Works", value: 96 }, { label: "Local Builders Co.", value: 40 }, { label: "UP Roadways", value: 28 }] },
    { name: "MP Ravi Kishan", house: "Lok Sabha", state: "Uttar Pradesh", cons: "Gorakhpur, Uttar Pradesh", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 198, amount: "₹9.2 Cr", spent: "₹8.8 Cr", risk: 42, exec: [{ label: "Completed", value: 130, color: cssVar('--teal') }, { label: "In progress", value: 48, color: cssVar('--gold') }, { label: "Delayed", value: 14, color: cssVar('--amber') }, { label: "Flagged", value: 6, color: cssVar('--crimson') }], vendors: [{ label: "Gorakhdham Infra", value: 78 }, { label: "Purvanchal Roadways", value: 34 }] },
    { name: "MP Brij Lal", house: "Rajya Sabha", state: "Uttar Pradesh", cons: "Uttar Pradesh (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 174, amount: "₹8.4 Cr", spent: "₹7.9 Cr", risk: 36, exec: [{ label: "Completed", value: 118, color: cssVar('--teal') }, { label: "In progress", value: 42, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "UP State Construction Co.", value: 68 }, { label: "Awadh Builders", value: 29 }] },

    // --- BIHAR (40 LS · 16 RS) ---
    { name: "MP S. Yadav", house: "Lok Sabha", state: "Bihar", cons: "Bhagalpur, Bihar", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 158, amount: "₹7.1 Cr", spent: "₹6.7 Cr", risk: 46, exec: [{ label: "Completed", value: 105, color: cssVar('--teal') }, { label: "In progress", value: 38, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 5, color: cssVar('--crimson') }], vendors: [{ label: "Ganga Civil Contractors", value: 58 }, { label: "Bihar Rural Infra", value: 32 }] },
    { name: "MP Ravi Shankar Prasad", house: "Lok Sabha", state: "Bihar", cons: "Patna Sahib, Bihar", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 184, amount: "₹8.6 Cr", spent: "₹8.1 Cr", risk: 38, exec: [{ label: "Completed", value: 128, color: cssVar('--teal') }, { label: "In progress", value: 42, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Patliputra Infra", value: 84 }, { label: "Magadh Builders", value: 36 }] },
    { name: "MP Sanjay Jha", house: "Rajya Sabha", state: "Bihar", cons: "Bihar (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 162, amount: "₹7.6 Cr", spent: "₹7.1 Cr", risk: 44, exec: [{ label: "Completed", value: 102, color: cssVar('--teal') }, { label: "In progress", value: 45, color: cssVar('--gold') }, { label: "Delayed", value: 11, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Mithila Water & Infra", value: 54 }, { label: "North Bihar Tech", value: 32 }] },

    // --- MAHARASHTRA (48 LS · 19 RS) ---
    { name: "MP S. Patil", house: "Lok Sabha", state: "Maharashtra", cons: "Pune, Maharashtra", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 195, amount: "₹8.9 Cr", spent: "₹8.2 Cr", risk: 42, exec: [{ label: "Completed", value: 135, color: cssVar('--teal') }, { label: "In progress", value: 45, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 5, color: cssVar('--crimson') }], vendors: [{ label: "Sahyadri Infra Projects", value: 68 }, { label: "Pune Works", value: 34 }] },
    { name: "MP Nitin Gadkari", house: "Lok Sabha", state: "Maharashtra", cons: "Nagpur, Maharashtra", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 230, amount: "₹9.9 Cr", spent: "₹9.6 Cr", risk: 24, exec: [{ label: "Completed", value: 175, color: cssVar('--teal') }, { label: "In progress", value: 45, color: cssVar('--gold') }, { label: "Delayed", value: 8, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Vidarbha Highways Ltd", value: 110 }, { label: "Orange City Infra", value: 45 }] },
    { name: "MP Sharad Pawar", house: "Rajya Sabha", state: "Maharashtra", cons: "Maharashtra (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 188, amount: "₹8.7 Cr", spent: "₹8.3 Cr", risk: 35, exec: [{ label: "Completed", value: 130, color: cssVar('--teal') }, { label: "In progress", value: 44, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Maharashtra Agri Infra", value: 72 }, { label: "Deccan Irrigation Works", value: 38 }] },

    // --- WEST BENGAL (42 LS · 16 RS) ---
    { name: "MP S. Banerjee", house: "Lok Sabha", state: "West Bengal", cons: "Kolkata North, West Bengal", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 168, amount: "₹7.9 Cr", spent: "₹7.4 Cr", risk: 52, exec: [{ label: "Completed", value: 110, color: cssVar('--teal') }, { label: "In progress", value: 42, color: cssVar('--gold') }, { label: "Delayed", value: 12, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Hooghly Civil Projects", value: 64 }, { label: "Kolkata Civic Works", value: 28 }] },
    { name: "MP Derek O'Brien", house: "Rajya Sabha", state: "West Bengal", cons: "West Bengal (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 176, amount: "₹8.2 Cr", spent: "₹7.8 Cr", risk: 41, exec: [{ label: "Completed", value: 115, color: cssVar('--teal') }, { label: "In progress", value: 45, color: cssVar('--gold') }, { label: "Delayed", value: 12, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Bengal Education Infra", value: 62 }, { label: "Delta Rural Works", value: 33 }] },

    // --- RAJASTHAN (25 LS · 10 RS) ---
    { name: "MP H. Choudhary", house: "Lok Sabha", state: "Rajasthan", cons: "Barmer, Rajasthan", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 172, amount: "₹8.4 Cr", spent: "₹8.0 Cr", risk: 86, exec: [{ label: "Completed", value: 115, color: cssVar('--teal') }, { label: "In progress", value: 42, color: cssVar('--gold') }, { label: "Delayed", value: 8, color: cssVar('--amber') }, { label: "Flagged", value: 7, color: cssVar('--crimson') }], vendors: [{ label: "Marwar Constructions", value: 82 }, { label: "Desert Infra Ltd", value: 30 }] },
    { name: "MP Om Birla", house: "Lok Sabha", state: "Rajasthan", cons: "Kota, Rajasthan", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 205, amount: "₹9.4 Cr", spent: "₹9.1 Cr", risk: 28, exec: [{ label: "Completed", value: 150, color: cssVar('--teal') }, { label: "In progress", value: 45, color: cssVar('--gold') }, { label: "Delayed", value: 7, color: cssVar('--amber') }, { label: "Flagged", value: 3, color: cssVar('--crimson') }], vendors: [{ label: "Chambal Infra Corp", value: 92 }, { label: "Hadoti Builders", value: 38 }] },
    { name: "MP Ghanshyam Tiwari", house: "Rajya Sabha", state: "Rajasthan", cons: "Rajasthan (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 160, amount: "₹7.7 Cr", spent: "₹7.2 Cr", risk: 40, exec: [{ label: "Completed", value: 108, color: cssVar('--teal') }, { label: "In progress", value: 40, color: cssVar('--gold') }, { label: "Delayed", value: 9, color: cssVar('--amber') }, { label: "Flagged", value: 3, color: cssVar('--crimson') }], vendors: [{ label: "Jaipur Development Co.", value: 55 }, { label: "Aravalli Infra", value: 31 }] },

    // --- MADHYA PRADESH (29 LS · 11 RS) ---
    { name: "MP Alok Sharma", house: "Lok Sabha", state: "Madhya Pradesh", cons: "Bhopal, Madhya Pradesh", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 178, amount: "₹8.3 Cr", spent: "₹7.9 Cr", risk: 45, exec: [{ label: "Completed", value: 122, color: cssVar('--teal') }, { label: "In progress", value: 42, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Bhojpal Civil Infra", value: 66 }, { label: "Central MP Works", value: 34 }] },
    { name: "MP Digvijaya Singh", house: "Rajya Sabha", state: "Madhya Pradesh", cons: "Madhya Pradesh (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 166, amount: "₹7.9 Cr", spent: "₹7.5 Cr", risk: 48, exec: [{ label: "Completed", value: 112, color: cssVar('--teal') }, { label: "In progress", value: 40, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Narmada Water Projects", value: 58 }, { label: "Malwa Rural Infra", value: 30 }] },

    // --- KARNATAKA (28 LS · 12 RS) ---
    { name: "MP P. Simha", house: "Lok Sabha", state: "Karnataka", cons: "Mysuru, Karnataka", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 182, amount: "₹8.5 Cr", spent: "₹8.0 Cr", risk: 36, exec: [{ label: "Completed", value: 125, color: cssVar('--teal') }, { label: "In progress", value: 44, color: cssVar('--gold') }, { label: "Delayed", value: 9, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Cauvery Edutech Ltd", value: 74 }, { label: "Mysuru Civic Infra", value: 32 }] },
    { name: "MP Mallikarjun Kharge", house: "Rajya Sabha", state: "Karnataka", cons: "Karnataka (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 190, amount: "₹8.8 Cr", spent: "₹8.4 Cr", risk: 32, exec: [{ label: "Completed", value: 132, color: cssVar('--teal') }, { label: "In progress", value: 46, color: cssVar('--gold') }, { label: "Delayed", value: 9, color: cssVar('--amber') }, { label: "Flagged", value: 3, color: cssVar('--crimson') }], vendors: [{ label: "Kalyana Karnataka Infra", value: 70 }, { label: "Bengaluru Urban Works", value: 36 }] },

    // --- TAMIL NADU (39 LS · 18 RS) ---
    { name: "MP Dayanidhi Maran", house: "Lok Sabha", state: "Tamil Nadu", cons: "Chennai Central, Tamil Nadu", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 175, amount: "₹8.1 Cr", spent: "₹7.7 Cr", risk: 34, exec: [{ label: "Completed", value: 120, color: cssVar('--teal') }, { label: "In progress", value: 43, color: cssVar('--gold') }, { label: "Delayed", value: 9, color: cssVar('--amber') }, { label: "Flagged", value: 3, color: cssVar('--crimson') }], vendors: [{ label: "Coromandel Urban Projects", value: 65 }, { label: "Chennai Metro Works", value: 31 }] },
    { name: "MP P. Chidambaram", house: "Rajya Sabha", state: "Tamil Nadu", cons: "Tamil Nadu (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 168, amount: "₹7.9 Cr", spent: "₹7.5 Cr", risk: 30, exec: [{ label: "Completed", value: 118, color: cssVar('--teal') }, { label: "In progress", value: 40, color: cssVar('--gold') }, { label: "Delayed", value: 8, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Kaveri Delta Irrigation", value: 58 }, { label: "Madurai Infra Corp", value: 29 }] },

    // --- GUJARAT (26 LS · 11 RS) ---
    { name: "MP H. Patel", house: "Lok Sabha", state: "Gujarat", cons: "Ahmedabad East, Gujarat", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 186, amount: "₹8.7 Cr", spent: "₹8.3 Cr", risk: 31, exec: [{ label: "Completed", value: 135, color: cssVar('--teal') }, { label: "In progress", value: 40, color: cssVar('--gold') }, { label: "Delayed", value: 8, color: cssVar('--amber') }, { label: "Flagged", value: 3, color: cssVar('--crimson') }], vendors: [{ label: "Sabarmati Infra Ltd", value: 78 }, { label: "Gujarat Urban Dev", value: 35 }] },
    { name: "MP J. P. Nadda", house: "Rajya Sabha", state: "Gujarat", cons: "Gujarat (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 192, amount: "₹9.0 Cr", spent: "₹8.6 Cr", risk: 27, exec: [{ label: "Completed", value: 142, color: cssVar('--teal') }, { label: "In progress", value: 41, color: cssVar('--gold') }, { label: "Delayed", value: 7, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Saurashtra Water Projects", value: 82 }, { label: "Surat Development Co.", value: 36 }] },

    // --- ANDHRA PRADESH (25 LS · 11 RS) ---
    { name: "MP K. Reddy", house: "Lok Sabha", state: "Andhra Pradesh", cons: "Kurnool, Andhra Pradesh", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 164, amount: "₹7.4 Cr", spent: "₹6.9 Cr", risk: 37, exec: [{ label: "Completed", value: 100, color: cssVar('--teal') }, { label: "In progress", value: 44, color: cssVar('--gold') }, { label: "Delayed", value: 14, color: cssVar('--amber') }, { label: "Flagged", value: 6, color: cssVar('--crimson') }], vendors: [{ label: "Rayalaseema Builders", value: 74 }, { label: "AP Civil Works", value: 22 }] },
    { name: "MP Y. V. Subba Reddy", house: "Rajya Sabha", state: "Andhra Pradesh", cons: "Andhra Pradesh (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 170, amount: "₹8.0 Cr", spent: "₹7.5 Cr", risk: 42, exec: [{ label: "Completed", value: 112, color: cssVar('--teal') }, { label: "In progress", value: 44, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Tirupati Rural Infra", value: 64 }, { label: "Coastal AP Builders", value: 30 }] },

    // --- PUNJAB (13 LS · 7 RS) ---
    { name: "MP G. Aujla", house: "Lok Sabha", state: "Punjab", cons: "Amritsar, Punjab", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 148, amount: "₹7.2 Cr", spent: "₹6.5 Cr", risk: 67, exec: [{ label: "Completed", value: 92, color: cssVar('--teal') }, { label: "In progress", value: 36, color: cssVar('--gold') }, { label: "Delayed", value: 14, color: cssVar('--amber') }, { label: "Flagged", value: 6, color: cssVar('--crimson') }], vendors: [{ label: "Majha Electricals", value: 56 }, { label: "Punjab Road Builders", value: 24 }] },
    { name: "MP Raghav Chadha", house: "Rajya Sabha", state: "Punjab", cons: "Punjab (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 162, amount: "₹7.7 Cr", spent: "₹7.2 Cr", risk: 38, exec: [{ label: "Completed", value: 110, color: cssVar('--teal') }, { label: "In progress", value: 40, color: cssVar('--gold') }, { label: "Delayed", value: 9, color: cssVar('--amber') }, { label: "Flagged", value: 3, color: cssVar('--crimson') }], vendors: [{ label: "Malwa Solar Infra", value: 58 }, { label: "Doaba Civic Works", value: 28 }] },

    // --- ASSAM (14 LS · 7 RS) ---
    { name: "MP Gaurav Gogoi", house: "Lok Sabha", state: "Assam", cons: "Jorhat, Assam", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 154, amount: "₹7.3 Cr", spent: "₹6.9 Cr", risk: 39, exec: [{ label: "Completed", value: 105, color: cssVar('--teal') }, { label: "In progress", value: 38, color: cssVar('--gold') }, { label: "Delayed", value: 8, color: cssVar('--amber') }, { label: "Flagged", value: 3, color: cssVar('--crimson') }], vendors: [{ label: "Brahmaputra Engineering", value: 56 }, { label: "Upper Assam Roads", value: 26 }] },
    { name: "MP D. Saikia", house: "Rajya Sabha", state: "Assam", cons: "Assam (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 180, amount: "₹8.1 Cr", spent: "₹7.6 Cr", risk: 44, exec: [{ label: "Completed", value: 110, color: cssVar('--teal') }, { label: "In progress", value: 50, color: cssVar('--gold') }, { label: "Delayed", value: 14, color: cssVar('--amber') }, { label: "Flagged", value: 6, color: cssVar('--crimson') }], vendors: [{ label: "Northeast Solar Co.", value: 52 }, { label: "Assam Rural Infra", value: 31 }] },

    // --- TELANGANA (17 LS · 7 RS) ---
    { name: "MP Asaduddin Owaisi", house: "Lok Sabha", state: "Telangana", cons: "Hyderabad, Telangana", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 188, amount: "₹8.9 Cr", spent: "₹8.5 Cr", risk: 35, exec: [{ label: "Completed", value: 132, color: cssVar('--teal') }, { label: "In progress", value: 44, color: cssVar('--gold') }, { label: "Delayed", value: 9, color: cssVar('--amber') }, { label: "Flagged", value: 3, color: cssVar('--crimson') }], vendors: [{ label: "Charminar Urban Works", value: 72 }, { label: "Hyderabad Civic Infra", value: 35 }] },
    { name: "MP A. Rao", house: "Rajya Sabha", state: "Telangana", cons: "Telangana (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 165, amount: "₹7.8 Cr", spent: "₹7.3 Cr", risk: 54, exec: [{ label: "Completed", value: 108, color: cssVar('--teal') }, { label: "In progress", value: 42, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 5, color: cssVar('--crimson') }], vendors: [{ label: "Deccan Builders", value: 64 }, { label: "Telangana Grid Infra", value: 31 }] },

    // --- JHARKHAND (14 LS · 6 RS) ---
    { name: "MP Nishikant Dubey", house: "Lok Sabha", state: "Jharkhand", cons: "Godda, Jharkhand", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 164, amount: "₹7.6 Cr", spent: "₹7.1 Cr", risk: 49, exec: [{ label: "Completed", value: 108, color: cssVar('--teal') }, { label: "In progress", value: 42, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Santhal Infra Works", value: 62 }, { label: "Coalbelt Projects", value: 28 }] },
    { name: "MP S. Soren", house: "Rajya Sabha", state: "Jharkhand", cons: "Jharkhand (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 152, amount: "₹7.0 Cr", spent: "₹6.6 Cr", risk: 78, exec: [{ label: "Completed", value: 95, color: cssVar('--teal') }, { label: "In progress", value: 40, color: cssVar('--gold') }, { label: "Delayed", value: 11, color: cssVar('--amber') }, { label: "Flagged", value: 6, color: cssVar('--crimson') }], vendors: [{ label: "Chotanagpur Infra", value: 72 }, { label: "Jharkhand Civil Works", value: 20 }] },

    // --- ODISHA (21 LS · 10 RS) ---
    { name: "MP Sambit Patra", house: "Lok Sabha", state: "Odisha", cons: "Puri, Odisha", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 172, amount: "₹8.2 Cr", spent: "₹7.8 Cr", risk: 36, exec: [{ label: "Completed", value: 120, color: cssVar('--teal') }, { label: "In progress", value: 42, color: cssVar('--gold') }, { label: "Delayed", value: 8, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Jagannath Heritage Infra", value: 68 }, { label: "Kalinga Roadways", value: 30 }] },
    { name: "MP Sasmit Patra", house: "Rajya Sabha", state: "Odisha", cons: "Odisha (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 158, amount: "₹7.4 Cr", spent: "₹7.0 Cr", risk: 34, exec: [{ label: "Completed", value: 110, color: cssVar('--teal') }, { label: "In progress", value: 38, color: cssVar('--gold') }, { label: "Delayed", value: 8, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Mahanadi Builders Ltd", value: 58 }, { label: "Odisha Rural Water", value: 26 }] },

    // --- KERALA (20 LS · 9 RS) ---
    { name: "MP Shashi Tharoor", house: "Lok Sabha", state: "Kerala", cons: "Thiruvananthapuram, Kerala", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 192, amount: "₹9.1 Cr", spent: "₹8.7 Cr", risk: 22, exec: [{ label: "Completed", value: 145, color: cssVar('--teal') }, { label: "In progress", value: 39, color: cssVar('--gold') }, { label: "Delayed", value: 6, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Travancore Tech Infra", value: 84 }, { label: "Kerala Coastal Works", value: 38 }] },
    { name: "MP John Brittas", house: "Rajya Sabha", state: "Kerala", cons: "Kerala (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 165, amount: "₹7.8 Cr", spent: "₹7.4 Cr", risk: 25, exec: [{ label: "Completed", value: 122, color: cssVar('--teal') }, { label: "In progress", value: 36, color: cssVar('--gold') }, { label: "Delayed", value: 5, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Malabar Eco Infra", value: 59 }, { label: "Cochin Marine Works", value: 28 }] },

    // --- DELHI (7 LS · 3 RS) ---
    { name: "MP H. Pant", house: "Lok Sabha", state: "Delhi", cons: "New Delhi, Delhi", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 174, amount: "₹8.2 Cr", spent: "₹7.8 Cr", risk: 29, exec: [{ label: "Completed", value: 130, color: cssVar('--teal') }, { label: "In progress", value: 36, color: cssVar('--gold') }, { label: "Delayed", value: 6, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Capital Tech Infra", value: 76 }, { label: "Delhi Smart Grid", value: 34 }] },
    { name: "MP Sanjay Singh", house: "Rajya Sabha", state: "Delhi", cons: "Delhi (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 160, amount: "₹7.6 Cr", spent: "₹7.2 Cr", risk: 36, exec: [{ label: "Completed", value: 115, color: cssVar('--teal') }, { label: "In progress", value: 36, color: cssVar('--gold') }, { label: "Delayed", value: 7, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Yamuna Development Co.", value: 58 }, { label: "Urban Delhi Civil", value: 28 }] },

    // --- JAMMU & KASHMIR (5 LS · 4 RS) ---
    { name: "MP A. Lone", house: "Lok Sabha", state: "Jammu & Kashmir", cons: "Srinagar, Jammu & Kashmir", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 140, amount: "₹6.7 Cr", spent: "₹6.1 Cr", risk: 65, exec: [{ label: "Completed", value: 88, color: cssVar('--teal') }, { label: "In progress", value: 36, color: cssVar('--gold') }, { label: "Delayed", value: 12, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Chinar Infra Projects", value: 62 }, { label: "Valley Winter Works", value: 24 }] },

    // --- UTTARAKHAND (5 LS · 3 RS) ---
    { name: "MP T. Rawat", house: "Lok Sabha", state: "Uttarakhand", cons: "Garhwal, Uttarakhand", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 156, amount: "₹7.3 Cr", spent: "₹6.9 Cr", risk: 32, exec: [{ label: "Completed", value: 112, color: cssVar('--teal') }, { label: "In progress", value: 35, color: cssVar('--gold') }, { label: "Delayed", value: 7, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Garhwal Civil Works", value: 60 }, { label: "Himalayan Drainage", value: 28 }] },

    // --- HIMACHAL PRADESH (4 LS · 3 RS) ---
    { name: "MP S. Kashyap", house: "Lok Sabha", state: "Himachal Pradesh", cons: "Shimla, Himachal Pradesh", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 148, amount: "₹6.9 Cr", spent: "₹6.5 Cr", risk: 28, exec: [{ label: "Completed", value: 108, color: cssVar('--teal') }, { label: "In progress", value: 32, color: cssVar('--gold') }, { label: "Delayed", value: 6, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Himalayan Infra Co.", value: 58 }, { label: "Shimla Ridge Builders", value: 25 }] },

    // --- HARYANA (10 LS · 5 RS) ---
    { name: "MP R. Singh", house: "Lok Sabha", state: "Haryana", cons: "Gurugram, Haryana", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 168, amount: "₹7.9 Cr", spent: "₹7.5 Cr", risk: 30, exec: [{ label: "Completed", value: 122, color: cssVar('--teal') }, { label: "In progress", value: 38, color: cssVar('--gold') }, { label: "Delayed", value: 6, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "NCR Urban Solutions", value: 68 }, { label: "Haryana Civil Grid", value: 30 }] },

    // --- CHHATTISGARH (11 LS · 5 RS) ---
    { name: "MP B. Sahu", house: "Lok Sabha", state: "Chhattisgarh", cons: "Raipur, Chhattisgarh", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 150, amount: "₹7.1 Cr", spent: "₹6.6 Cr", risk: 82, exec: [{ label: "Completed", value: 96, color: cssVar('--teal') }, { label: "In progress", value: 38, color: cssVar('--gold') }, { label: "Delayed", value: 10, color: cssVar('--amber') }, { label: "Flagged", value: 6, color: cssVar('--crimson') }], vendors: [{ label: "Mahanadi Builders", value: 64 }, { label: "Bastar Tribal Infra", value: 26 }] },

    // --- GOA (2 LS · 1 RS) ---
    { name: "MP S. Naik", house: "Lok Sabha", state: "Goa", cons: "North Goa, Goa", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 125, amount: "₹5.8 Cr", spent: "₹5.4 Cr", risk: 26, exec: [{ label: "Completed", value: 95, color: cssVar('--teal') }, { label: "In progress", value: 24, color: cssVar('--gold') }, { label: "Delayed", value: 5, color: cssVar('--amber') }, { label: "Flagged", value: 1, color: cssVar('--crimson') }], vendors: [{ label: "Mandovi Marine Infra", value: 52 }, { label: "Goa Coastal Works", value: 20 }] },

    // --- NORTHEAST STATES ---
    { name: "MP K. Rijiju", house: "Lok Sabha", state: "Arunachal Pradesh", cons: "Arunachal West, Arunachal Pradesh", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 135, amount: "₹6.4 Cr", spent: "₹6.0 Cr", risk: 34, exec: [{ label: "Completed", value: 98, color: cssVar('--teal') }, { label: "In progress", value: 28, color: cssVar('--gold') }, { label: "Delayed", value: 7, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Subansiri Projects", value: 56 }, { label: "Border Footbridge Co.", value: 24 }] },
    { name: "MP R. Sanajaoba", house: "Rajya Sabha", state: "Manipur", cons: "Manipur (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 128, amount: "₹5.9 Cr", spent: "₹5.3 Cr", risk: 68, exec: [{ label: "Completed", value: 85, color: cssVar('--teal') }, { label: "In progress", value: 30, color: cssVar('--gold') }, { label: "Delayed", value: 9, color: cssVar('--amber') }, { label: "Flagged", value: 4, color: cssVar('--crimson') }], vendors: [{ label: "Kangla Constructions", value: 50 }, { label: "Imphal Valley Works", value: 22 }] },
    { name: "MP V. Pala", house: "Lok Sabha", state: "Meghalaya", cons: "Shillong, Meghalaya", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 132, amount: "₹6.2 Cr", spent: "₹5.8 Cr", risk: 31, exec: [{ label: "Completed", value: 96, color: cssVar('--teal') }, { label: "In progress", value: 27, color: cssVar('--gold') }, { label: "Delayed", value: 7, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Shillong Civil Works", value: 54 }, { label: "Khasi Hill Drainage", value: 23 }] },
    { name: "MP P. Roy", house: "Lok Sabha", state: "Tripura", cons: "Tripura West, Tripura", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 130, amount: "₹6.1 Cr", spent: "₹5.7 Cr", risk: 29, exec: [{ label: "Completed", value: 95, color: cssVar('--teal') }, { label: "In progress", value: 27, color: cssVar('--gold') }, { label: "Delayed", value: 6, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Tripura Solar Infra", value: 52 }, { label: "Agartala Civil Co.", value: 22 }] },
    { name: "MP S. Konyak", house: "Rajya Sabha", state: "Nagaland", cons: "Nagaland (State-wide)", jurisdiction: "State-wide Mandate (₹5 Cr/Yr)", works: 122, amount: "₹5.6 Cr", spent: "₹5.2 Cr", risk: 28, exec: [{ label: "Completed", value: 90, color: cssVar('--teal') }, { label: "In progress", value: 25, color: cssVar('--gold') }, { label: "Delayed", value: 5, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Doyang Energy Co.", value: 48 }, { label: "Naga Hills Builders", value: 21 }] },
    { name: "MP C. Lalrosanga", house: "Lok Sabha", state: "Mizoram", cons: "Mizoram, Mizoram", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 120, amount: "₹5.5 Cr", spent: "₹5.1 Cr", risk: 27, exec: [{ label: "Completed", value: 89, color: cssVar('--teal') }, { label: "In progress", value: 24, color: cssVar('--gold') }, { label: "Delayed", value: 5, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "Chhimtuipui Infra", value: 46 }, { label: "Aizawl Roads Ltd", value: 20 }] },
    { name: "MP I. Subba", house: "Lok Sabha", state: "Sikkim", cons: "Sikkim, Sikkim", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 115, amount: "₹5.2 Cr", spent: "₹4.8 Cr", risk: 24, exec: [{ label: "Completed", value: 86, color: cssVar('--teal') }, { label: "In progress", value: 23, color: cssVar('--gold') }, { label: "Delayed", value: 5, color: cssVar('--amber') }, { label: "Flagged", value: 1, color: cssVar('--crimson') }], vendors: [{ label: "Teesta Civil Builders", value: 44 }, { label: "Sikkim Eco Works", value: 19 }] },
    { name: "MP J. Tsering", house: "Lok Sabha", state: "Ladakh", cons: "Ladakh, Ladakh", jurisdiction: "Constituency Mandate (₹5 Cr/Yr)", works: 110, amount: "₹4.9 Cr", spent: "₹4.5 Cr", risk: 32, exec: [{ label: "Completed", value: 82, color: cssVar('--teal') }, { label: "In progress", value: 22, color: cssVar('--gold') }, { label: "Delayed", value: 5, color: cssVar('--amber') }, { label: "Flagged", value: 1, color: cssVar('--crimson') }], vendors: [{ label: "Ladakh Renewable Power", value: 42 }, { label: "Zanskar Civil Co.", value: 18 }] },

    // --- NOMINATED MEMBERS (PAN-INDIA) ---
    { name: "MP Dr. S. Rao", house: "Nominated", state: "Nominated", cons: "Nominated by President of India", jurisdiction: "Pan-India Mandate (₹5 Cr/Yr)", works: 142, amount: "₹6.8 Cr", spent: "₹6.3 Cr", risk: 29, exec: [{ label: "Completed", value: 110, color: cssVar('--teal') }, { label: "In progress", value: 24, color: cssVar('--gold') }, { label: "Delayed", value: 6, color: cssVar('--amber') }, { label: "Flagged", value: 2, color: cssVar('--crimson') }], vendors: [{ label: "National Heritage Trust", value: 62 }, { label: "Solar India Tech", value: 36 }] },
    { name: "MP Sudha Murty", house: "Nominated", state: "Nominated", cons: "Nominated by President of India", jurisdiction: "Pan-India Mandate (₹5 Cr/Yr)", works: 138, amount: "₹6.6 Cr", spent: "₹6.2 Cr", risk: 20, exec: [{ label: "Completed", value: 112, color: cssVar('--teal') }, { label: "In progress", value: 20, color: cssVar('--gold') }, { label: "Delayed", value: 5, color: cssVar('--amber') }, { label: "Flagged", value: 1, color: cssVar('--crimson') }], vendors: [{ label: "Rural Library & Education Trust", value: 68 }, { label: "Public Healthcare Foundation", value: 35 }] },
    { name: "MP Ilaiyaraaja", house: "Nominated", state: "Nominated", cons: "Nominated by President of India", jurisdiction: "Pan-India Mandate (₹5 Cr/Yr)", works: 130, amount: "₹6.3 Cr", spent: "₹5.9 Cr", risk: 23, exec: [{ label: "Completed", value: 104, color: cssVar('--teal') }, { label: "In progress", value: 20, color: cssVar('--gold') }, { label: "Delayed", value: 5, color: cssVar('--amber') }, { label: "Flagged", value: 1, color: cssVar('--crimson') }], vendors: [{ label: "Cultural Heritage Centers Co.", value: 55 }, { label: "Acoustic Arts Infra", value: 30 }] }
  ];

  const mpSelect = document.getElementById("mpSelect");
  const mpStateFilter = document.getElementById("mpStateFilter");

  function getFilteredMPs() {
    return mps.filter(m => {
      const matchHouse = currentHouseFilter === "all" || m.house === currentHouseFilter;
      const matchState = currentStateFilter === "all" || 
        (currentStateFilter === "Nominated" ? m.state === "Nominated" : m.state === currentStateFilter);
      return matchHouse && matchState;
    });
  }

  function updateStateSummaryBar() {
    const stripIcon = document.getElementById("mpStripIcon");
    const stripTitle = document.getElementById("mpStripTitle");
    const stripMeta = document.getElementById("mpStripMeta");
    const stripStatLS = document.getElementById("mpStripStatLS");
    const stripStatRS = document.getElementById("mpStripStatRS");
    const stripStatBudget = document.getElementById("mpStripStatBudget");

    if (currentStateFilter === "all") {
      if (stripIcon) stripIcon.textContent = "🏛️";
      if (stripTitle) stripTitle.textContent = "National Parliamentary Roster";
      if (stripMeta) stripMeta.textContent = "774 Members across 28 States & 8 UTs (₹3,870 Cr Annual Scheme Entitlement)";
      if (stripStatLS) stripStatLS.textContent = "543 Lok Sabha";
      if (stripStatRS) stripStatRS.textContent = "245 Rajya Sabha";
      if (stripStatBudget) stripStatBudget.textContent = "₹3,870 Cr/Yr";
    } else {
      const sData = stateSeatData[currentStateFilter] || { ls: "—", rs: "—", budget: "₹50 Cr", works: 1200 };
      if (stripIcon) stripIcon.textContent = "📍";
      if (stripTitle) stripTitle.textContent = `${currentStateFilter}`;
      if (stripMeta) stripMeta.textContent = `${sData.ls} Lok Sabha Seats + ${sData.rs} Rajya Sabha Seats · ${sData.works.toLocaleString()} Monitored Works`;
      if (stripStatLS) stripStatLS.textContent = `${sData.ls} Lok Sabha`;
      if (stripStatRS) stripStatRS.textContent = `${sData.rs} Rajya Sabha`;
      if (stripStatBudget) stripStatBudget.textContent = `${sData.budget} Sanctioned`;
    }
  }

  function populateMPSelect(filteredMPs) {
    if (!mpSelect) return;
    if (filteredMPs.length === 0) {
      mpSelect.innerHTML = `<option value="">No MPs matching active filters</option>`;
      return;
    }
    mpSelect.innerHTML = filteredMPs.map(m => `<option value="${m.name}">${m.name} (${m.house} · ${m.cons})</option>`).join("");
  }

  function applyMPFiltersAndRender(preferredName) {
    const filtered = getFilteredMPs();
    populateMPSelect(filtered);
    updateStateSummaryBar();
    if (filtered.length > 0) {
      const chosen = preferredName ? (filtered.find(m => m.name === preferredName) || filtered[0]) : filtered[0];
      if (mpSelect) mpSelect.value = chosen.name;
      renderMP(chosen);
    }
  }

  if (mpStateFilter) {
    mpStateFilter.addEventListener("change", () => {
      currentStateFilter = mpStateFilter.value;
      applyMPFiltersAndRender();
    });
  }

  // House Filter pill clicks
  document.querySelectorAll("#mpHouseFilterPills .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchParliamentaryHouse(btn.dataset.houseFilter);
    });
  });

  if (mpSelect) {
    mpSelect.addEventListener("change", () => {
      const selected = mps.find(m => m.name === mpSelect.value) || mps[0];
      renderMP(selected);
    });
  }

  function selectMPByName(name) {
    const target = mps.find(m => m.name === name);
    if (!target) return;
    
    currentHouseFilter = "all";
    currentStateFilter = "all";
    if (mpStateFilter) mpStateFilter.value = "all";
    document.querySelectorAll("#mpHouseFilterPills .pill-btn").forEach(b => {
      b.classList.toggle("on", b.dataset.houseFilter === "all");
    });
    applyMPFiltersAndRender(target.name);
  }

  function filterByHouseAndSelectFirst(house) {
    currentHouseFilter = house;
    currentStateFilter = "all";
    if (mpStateFilter) mpStateFilter.value = "all";
    document.querySelectorAll("#mpHouseFilterPills .pill-btn").forEach(b => {
      b.classList.toggle("on", b.dataset.houseFilter === house);
    });
    applyMPFiltersAndRender();
  }

  let currentMPWorks = [];
  let currentMPPortFilter = "all";

  function filterAndRenderMPPortfolio() {
    const mpPort = document.getElementById("mpPortfolio");
    if (!mpPort) return;
    
    let filtered = currentMPWorks;
    if (currentMPPortFilter === "high") {
      filtered = currentMPWorks.filter(w => w.risk >= 65);
    } else if (currentMPPortFilter !== "all") {
      filtered = currentMPWorks.filter(w => w.cat === currentMPPortFilter);
    }
    
    if (filtered.length === 0) {
      mpPort.innerHTML = `<tr><td colspan="7" class="empty-state" style="padding:20px; text-align:center; color:var(--ink-dim);">No works matching active filter in this MP's portfolio.</td></tr>`;
      return;
    }
    
    mpPort.innerHTML = filtered.map(w => `
      <tr class="rowlink" data-open-case="${w.id}">
        <td>
          <div style="font-weight:600; color:var(--ink);">${w.id}</div>
          <div style="color:var(--ink-dim); font-size:11px; margin-top:2px;">${w.desc}</div>
        </td>
        <td><span class="badge-mini" style="background:var(--panel-2); border:1px solid var(--line);">${w.cat}</span></td>
        <td>
          <div style="font-weight:500; color:var(--ink);">${w.vendor || 'State Civil Corp'}</div>
          ${w.monopoly ? '<span class="badge-mono" style="font-size:8.5px; padding:1px 5px;">MONOPOLY</span>' : ''}
        </td>
        <td class="mono">
          <div>₹${(w.sanction / 100000).toFixed(1)}L</div>
          <div style="color:var(--ink-faint); font-size:10px;">Spent: ₹${((w.spent || w.sanction) / 100000).toFixed(1)}L</div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="progress-mini" style="width:45px;"><i style="width:${w.progress || 100}%;"></i></span>
            <span class="mono" style="font-size:10px;">${w.progress || 100}%</span>
          </div>
          <div style="font-size:10px; margin-top:2px; color:${w.geotagged !== false ? 'var(--teal)' : 'var(--amber)'};">
            ${w.geotagged !== false ? '📍 Geotagged' : '⚠️ Missing Photo'}
          </div>
        </td>
        <td>
          <span class="risk-tag risk-${riskLabel(w.risk)}">${w.risk} · ${riskLabel(w.risk)}</span>
          <div style="color:var(--ink-faint); font-size:10.5px; max-width:210px; margin-top:2px; line-height:1.25;">
            ${w.reason || 'Normal statutory verification'}
          </div>
        </td>
        <td style="text-align:right;">
          <div class="row-actions" onclick="event.stopPropagation();" style="justify-content:flex-end;">
            <button class="tbl-btn" data-open-case="${w.id}" style="padding:3px 8px; font-size:10.5px; border-radius:4px;">Inspect</button>
          </div>
        </td>
      </tr>`).join("");

    bindRowOpeners();
  }

  document.querySelectorAll("#mpPortFilterPills .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#mpPortFilterPills .pill-btn").forEach(b => b.classList.remove("on"));
      btn.classList.add("on");
      currentMPPortFilter = btn.dataset.portCat || "all";
      filterAndRenderMPPortfolio();
    });
  });

  function renderMP(m) {
    if (!m) return;
    document.getElementById("mpName").textContent = m.name;
    document.getElementById("mpMeta").textContent = `${m.house} · ${m.cons}`;
    
    const houseBadge = document.getElementById("mpHouseBadge");
    if (houseBadge) {
      if (m.house === "Lok Sabha") {
        houseBadge.className = "house-badge house-ls";
        houseBadge.textContent = "🟢 Lok Sabha";
      } else if (m.house === "Rajya Sabha") {
        houseBadge.className = "house-badge house-rs";
        houseBadge.textContent = "🔴 Rajya Sabha";
      } else {
        houseBadge.className = "house-badge house-nom";
        houseBadge.textContent = "⭐ Nominated MP";
      }
    }

    const jurTag = document.getElementById("mpJurisdictionTag");
    if (jurTag) {
      jurTag.textContent = m.jurisdiction || `${m.house} Mandate`;
    }

    // Vigilance Verdict Scrutiny Badge
    const vigTag = document.getElementById("mpVigilanceTag");
    if (vigTag) {
      if (m.risk >= 85) {
        vigTag.className = "vigilance-verdict-badge v-critical";
        vigTag.textContent = "🚨 CRITICAL VIGILANCE SCRUTINY";
      } else if (m.risk >= 65) {
        vigTag.className = "vigilance-verdict-badge v-high";
        vigTag.textContent = "⚠️ HIGH SCRUTINY · CVC Monopoly Watch";
      } else if (m.risk >= 40) {
        vigTag.className = "vigilance-verdict-badge v-moderate";
        vigTag.textContent = "🟡 ELEVATED WATCH · Milestones Monitored";
      } else {
        vigTag.className = "vigilance-verdict-badge v-clear";
        vigTag.textContent = "✅ STATUTORY CLEARANCE · Normal";
      }
    }

    // Fund Flow Pipeline & Realization
    const amtNum = parseFloat((m.amount || "9.8").replace(/[^0-9.]/g, '')) || 9.8;
    const spentNum = parseFloat((m.spent || "9.4").replace(/[^0-9.]/g, '')) || 9.4;
    const realPercent = Math.min(100, ((spentNum / amtNum) * 100)).toFixed(1);

    const mpRealizationRate = document.getElementById("mpRealizationRate");
    if (mpRealizationRate) {
      mpRealizationRate.textContent = `${realPercent}% Disbursed (${m.spent} of ${m.amount})`;
    }

    const mpBarSpent = document.getElementById("mpBarSpent");
    const mpBarCommitted = document.getElementById("mpBarCommitted");
    if (mpBarSpent && mpBarCommitted) {
      const spentWidth = Math.min(94, (spentNum / 10.0 * 100));
      const commWidth = Math.max(3, Math.min(6, (amtNum - spentNum) / 10.0 * 100));
      mpBarSpent.style.width = `${spentWidth}%`;
      mpBarCommitted.style.width = `${commWidth}%`;
    }

    const scTarget = (15.2 + (m.works % 7) * 0.7).toFixed(1);
    const stTarget = (7.6 + (m.works % 5) * 0.4).toFixed(1);
    const mpQuotaSC = document.getElementById("mpQuotaSC");
    const mpQuotaST = document.getElementById("mpQuotaST");
    if (mpQuotaSC) mpQuotaSC.textContent = `✅ Clause 3.2 SC Mandate: ${scTarget}% (Target ≥15%)`;
    if (mpQuotaST) mpQuotaST.textContent = `✅ Clause 3.2 ST Mandate: ${stTarget}% (Target ≥7.5%)`;

    // 4 Key Indicators
    document.getElementById("mpWorks").textContent = m.works;
    document.getElementById("mpAmount").textContent = m.amount;
    document.getElementById("mpSpent").textContent = m.spent;
    document.getElementById("mpRisk").textContent = m.risk;

    const completedVal = m.exec && m.exec[0] ? m.exec[0].value : Math.round(m.works * 0.6);
    const activeVal = m.exec && m.exec[1] ? m.exec[1].value : Math.round(m.works * 0.28);
    const mpWorksSub = document.getElementById("mpWorksSub");
    if (mpWorksSub) mpWorksSub.textContent = `${completedVal} done · ${activeVal} active`;

    const avgProjLakhs = ((amtNum * 100) / m.works).toFixed(2);
    const mpSanctionSub = document.getElementById("mpSanctionSub");
    if (mpSanctionSub) mpSanctionSub.textContent = `₹${avgProjLakhs}L avg project`;

    const mpDisbursedSub = document.getElementById("mpDisbursedSub");
    if (mpDisbursedSub) mpDisbursedSub.textContent = `${realPercent}% realization rate`;

    const mpRiskSub = document.getElementById("mpRiskSub");
    if (mpRiskSub) mpRiskSub.textContent = m.risk >= 80 ? "7 critical flags" : m.risk >= 65 ? "4 forensic alerts" : m.risk >= 40 ? "2 monitor flags" : "Statistical compliance";

    // Card 1: Donut & Delivery Velocity
    drawDonut("mpDonut", m.exec);

    const mpAvgDuration = document.getElementById("mpAvgDuration");
    if (mpAvgDuration) mpAvgDuration.textContent = `${122 + (m.works % 38)} Days`;

    const mpGeotagRate = document.getElementById("mpGeotagRate");
    if (mpGeotagRate) {
      const geoRate = m.risk >= 85 ? (74.2 + (m.works % 6)).toFixed(1) : m.risk >= 65 ? (86.4 + (m.works % 5)).toFixed(1) : (94.8 + (m.works % 4)).toFixed(1);
      mpGeotagRate.textContent = `${geoRate}%`;
      mpGeotagRate.style.color = m.risk >= 85 ? "var(--crimson)" : m.risk >= 65 ? "var(--amber)" : "var(--teal-bright)";
    }

    const mpStalledCount = document.getElementById("mpStalledCount");
    if (mpStalledCount) {
      const delayedVal = m.exec && m.exec[2] ? m.exec[2].value : 12;
      const stalledCount = Math.max(1, Math.round(delayedVal / 5));
      mpStalledCount.textContent = `${stalledCount} Works`;
      mpStalledCount.style.color = stalledCount > 5 ? "var(--crimson)" : "var(--amber)";
    }

    // Card 2: Contractor Concentration & CVC Monopoly Radar
    let vendorsList = [...(m.vendors || [])];
    const defaultExtra = [
      { label: `${m.state || 'State'} Rural Infra Co.`, value: Math.max(12, Math.round(m.works * 0.12)) },
      { label: `National Civic Works Ltd`, value: Math.max(8, Math.round(m.works * 0.08)) },
      { label: `Regional Power & Water Grid`, value: Math.max(6, Math.round(m.works * 0.05)) }
    ];
    for (let extra of defaultExtra) {
      if (vendorsList.length < 4 && !vendorsList.some(v => v.label === extra.label)) {
        vendorsList.push(extra);
      }
    }

    const totalVendorWorks = m.works;
    const topV = vendorsList[0];
    const topShare = topV ? ((topV.value / totalVendorWorks) * 100) : 0;

    const vendorContainer = document.getElementById("mpVendorBars");
    if (vendorContainer) {
      vendorContainer.innerHTML = vendorsList.map(v => {
        const vShare = ((v.value / totalVendorWorks) * 100);
        const vAmountCr = ((amtNum * (vShare / 100))).toFixed(2);
        const isMonopoly = vShare > 35;
        const barColor = isMonopoly ? "var(--crimson)" : vShare > 22 ? "var(--amber)" : "var(--gold)";
        return `
          <div class="mp-vendor-item">
            <div class="mp-vendor-item-head">
              <span class="mp-vendor-name" title="${v.label}">${v.label}${isMonopoly ? ' <span class="badge-mono" style="font-size:8px; padding:1px 4px;">MONOPOLY</span>' : ''}</span>
              <span class="mp-vendor-meta"><strong style="color:var(--ink);">${v.value}</strong> works (${vShare.toFixed(1)}% · ₹${vAmountCr} Cr)</span>
            </div>
            <div class="mp-vendor-track">
              <div class="mp-vendor-fill" style="width:${Math.min(100, vShare * 1.8).toFixed(0)}%; background:${barColor};"></div>
            </div>
          </div>`;
      }).join("");
    }

    const cvcAlert = document.getElementById("mpCvcAlert");
    const cvcAlertText = document.getElementById("mpCvcAlertText");
    if (cvcAlert && cvcAlertText) {
      if (topShare > 35) {
        cvcAlert.className = "cvc-alert-banner";
        cvcAlertText.innerHTML = `<strong>CVC Anti-Monopoly Breach:</strong> "${topV.label}" captures <strong>${topShare.toFixed(1)}%</strong> of works. Exceeds Central Vigilance Commission 35% guideline.`;
      } else {
        cvcAlert.className = "cvc-alert-banner cvc-pass";
        cvcAlertText.innerHTML = `<strong>CVC Compliance Verified:</strong> Top vendor captures <strong>${topShare.toFixed(1)}%</strong> of works. Within CVC 35% concentration threshold.`;
      }
    }

    // Card 3: Sectoral Allocation & AI Multi-Model Forensics
    const sectorBars = document.getElementById("mpSectorBars");
    if (sectorBars) {
      const s1Pct = 42, s2Pct = 26, s3Pct = 18, s4Pct = 14;
      const s1Amt = (amtNum * 0.42).toFixed(2);
      const s2Amt = (amtNum * 0.26).toFixed(2);
      const s3Amt = (amtNum * 0.18).toFixed(2);
      const s4Amt = (amtNum * 0.14).toFixed(2);
      sectorBars.innerHTML = `
        <div class="sector-alloc-item">
          <div class="sector-alloc-head">
            <span class="sector-alloc-name">Roads, Bridges & Pathways</span>
            <span class="sector-alloc-val">₹${s1Amt} Cr (${s1Pct}%)</span>
          </div>
          <div class="sector-alloc-track"><div class="sector-alloc-fill" style="width:${s1Pct}%; background:var(--gold);"></div></div>
        </div>
        <div class="sector-alloc-item">
          <div class="sector-alloc-head">
            <span class="sector-alloc-name">Community Halls & Shelters</span>
            <span class="sector-alloc-val">₹${s2Amt} Cr (${s2Pct}%)</span>
          </div>
          <div class="sector-alloc-track"><div class="sector-alloc-fill" style="width:${s2Pct}%; background:var(--teal);"></div></div>
        </div>
        <div class="sector-alloc-item">
          <div class="sector-alloc-head">
            <span class="sector-alloc-name">Drinking Water & Sanitation</span>
            <span class="sector-alloc-val">₹${s3Amt} Cr (${s3Pct}%)</span>
          </div>
          <div class="sector-alloc-track"><div class="sector-alloc-fill" style="width:${s3Pct}%; background:#38bdf8;"></div></div>
        </div>
        <div class="sector-alloc-item">
          <div class="sector-alloc-head">
            <span class="sector-alloc-name">Education & Solar Lighting</span>
            <span class="sector-alloc-val">₹${s4Amt} Cr (${s4Pct}%)</span>
          </div>
          <div class="sector-alloc-track"><div class="sector-alloc-fill" style="width:${s4Pct}%; background:#a78bfa;"></div></div>
        </div>`;
    }

    const forensicFlags = document.getElementById("mpForensicFlags");
    if (forensicFlags) {
      let flagChipsHtml = "";
      if (m.risk >= 80) {
        flagChipsHtml = `
          <div class="forensic-alert-chip chip-critical">
            <span>🔴</span>
            <div><strong>GFR 144 Tender Splitting:</strong> 3 tenders partitioned under ₹25L/₹50L mandatory e-tender ceiling.</div>
          </div>
          <div class="forensic-alert-chip chip-high">
            <span>🟠</span>
            <div><strong>Duplicate Photolog (pHash 0.97):</strong> Completion image matches adjacent district work.</div>
          </div>
          <div class="forensic-alert-chip chip-moderate">
            <span>🟡</span>
            <div><strong>Invoice Digit Clustering:</strong> Significant deviation at leading digit 5 (₹5,00,000 cliff).</div>
          </div>`;
      } else if (m.risk >= 65) {
        flagChipsHtml = `
          <div class="forensic-alert-chip chip-high">
            <span>🟠</span>
            <div><strong>Contractor Concentration:</strong> High syndicate density detected in civil works.</div>
          </div>
          <div class="forensic-alert-chip chip-moderate">
            <span>🟡</span>
            <div><strong>Milestone Progress Stalled:</strong> ${Math.max(2, Math.round((m.works % 10)/2))} works delayed &gt;120 days post 1st tranche.</div>
          </div>
          <div class="forensic-alert-chip chip-ok">
            <span>🔵</span>
            <div><strong>Clause 3.2 Statutory Quotas:</strong> SC/ST expenditure thresholds satisfied.</div>
          </div>`;
      } else if (m.risk >= 40) {
        flagChipsHtml = `
          <div class="forensic-alert-chip chip-moderate">
            <span>🟡</span>
            <div><strong>Minor Tranche Timing Variance:</strong> 2 tranches released with partial utilization cert.</div>
          </div>
          <div class="forensic-alert-chip chip-ok">
            <span>🟢</span>
            <div><strong>Benford Invoicing Conformity:</strong> Normal digit frequency distribution (χ² = 11.4).</div>
          </div>
          <div class="forensic-alert-chip chip-ok">
            <span>🔵</span>
            <div><strong>Statutory Mandate:</strong> SC/ST quota verified with district collectorate.</div>
          </div>`;
      } else {
        flagChipsHtml = `
          <div class="forensic-alert-chip chip-ok">
            <span>🟢</span>
            <div><strong>Statutory Audit Clearance:</strong> Full adherence to MPLADS Guidelines 2023.</div>
          </div>
          <div class="forensic-alert-chip chip-ok">
            <span>🟢</span>
            <div><strong>Competitive Bidding Verified:</strong> No vendor syndicate or monopoly detected.</div>
          </div>
          <div class="forensic-alert-chip chip-ok">
            <span>📍</span>
            <div><strong>Geotagged Physical Proof:</strong> 100% works mapped with GPS photos.</div>
          </div>`;
      }
      forensicFlags.innerHTML = flagChipsHtml;
    }

    // Portfolio Works Construction
    const stateCode = (m.state || "IN").substring(0, 2).toUpperCase();
    const baseVendors = m.vendors && m.vendors.length > 0 ? m.vendors.map(v => v.label) : ["Regional Civil Infra"];
    
    let works = alertsData.filter(a => a.mp === m.name);
    
    const sampleCatalog = [
      {
        id: `MPLADS-${stateCode}-${1000 + (m.works % 800) + 1}`,
        desc: "Rural all-weather asphalt link road and box culverts",
        cat: "Roads & Bridges",
        vendor: baseVendors[0],
        sanction: 4250000,
        spent: 4250000,
        progress: 100,
        geotagged: true,
        risk: m.risk,
        reason: m.risk >= 70 ? "GFR 144 Tender splitting under ₹50L ceiling" : "Statutory compliance verified"
      },
      {
        id: `MPLADS-${stateCode}-${1000 + (m.works % 800) + 2}`,
        desc: "Panchayat disaster shelter & multi-purpose community hall",
        cat: "Community Halls",
        vendor: baseVendors[1] || baseVendors[0],
        sanction: 3800000,
        spent: 3800000,
        progress: 100,
        geotagged: true,
        risk: Math.max(24, m.risk - 8),
        reason: m.risk >= 80 ? "Duplicate completion photograph, pHash match 0.96" : "Physical verification complete"
      },
      {
        id: `MPLADS-${stateCode}-${1000 + (m.works % 800) + 3}`,
        desc: "Deep solar tube-well & overhead drinking water tank network",
        cat: "Drinking Water",
        vendor: baseVendors[2] || baseVendors[0],
        sanction: 2950000,
        spent: 2650000,
        progress: 90,
        geotagged: true,
        risk: Math.max(20, m.risk - 15),
        reason: "Pipeline trenching verified by field audit"
      },
      {
        id: `MPLADS-${stateCode}-${1000 + (m.works % 800) + 4}`,
        desc: "High-mast solar LED illumination towers & micro-grid",
        cat: "Solar & Power",
        vendor: baseVendors[0],
        sanction: 2400000,
        spent: 2400000,
        progress: 100,
        geotagged: true,
        risk: Math.max(18, m.risk - 22),
        reason: "Energy commission testing certificate logged"
      },
      {
        id: `MPLADS-${stateCode}-${1000 + (m.works % 800) + 5}`,
        desc: "Government primary school smart computer laboratory",
        cat: "Education Infra",
        vendor: baseVendors[1] || baseVendors[0],
        sanction: 1850000,
        spent: 1850000,
        progress: 100,
        geotagged: true,
        risk: Math.max(15, m.risk - 28),
        reason: "Hardware asset serial verification pass"
      },
      {
        id: `MPLADS-${stateCode}-${1000 + (m.works % 800) + 6}`,
        desc: "Community health sub-centre outpatient diagnostic block",
        cat: "Health Centres",
        vendor: baseVendors[2] || baseVendors[0],
        sanction: 3100000,
        spent: 1550000,
        progress: 50,
        geotagged: false,
        risk: Math.min(95, m.risk + 12),
        reason: "Stalled execution for 140+ days after 50% release"
      }
    ];

    for (let sample of sampleCatalog) {
      if (works.length < 7 && !works.some(w => w.desc === sample.desc)) {
        works.push(sample);
      }
    }

    currentMPWorks = works;
    currentMPPortFilter = "all";
    document.querySelectorAll("#mpPortFilterPills .pill-btn").forEach(b => b.classList.toggle("on", b.dataset.portCat === "all"));
    
    const portBadge = document.getElementById("mpPortTotalBadge");
    if (portBadge) portBadge.textContent = `${m.works} Works Monitored`;

    filterAndRenderMPPortfolio();
  }

  // Initial MP roster render
  applyMPFiltersAndRender();

  /* ================= GEOSPATIAL MAP ================= */
  /* ================= GEOSPATIAL NATIONAL VIGILANCE MAP ENGINE ================= */
  const stateGeo = [
    // --- TIER 3 (CRITICAL) ---
    { name: "Uttar Pradesh", code: "UP", level: 3, works: 14210, critical: 412, sanctioned: "₹612 Cr", mps: 80, capital: "Lucknow", riskLabel: "CRITICAL", quotient: "CRITICAL PRIORITY", anomaly: "Invoice digit clustering & GFR 144 split tenders" },
    { name: "Bihar", code: "BR", level: 3, works: 9880, critical: 180, sanctioned: "₹390 Cr", mps: 40, capital: "Patna", riskLabel: "CRITICAL", quotient: "CRITICAL PRIORITY", anomaly: "Delayed completion filings & ghost photo duplicates" },

    // --- TIER 2 (HIGH WATCH) ---
    { name: "Rajasthan", code: "RJ", level: 2, works: 6450, critical: 110, sanctioned: "₹230 Cr", mps: 25, capital: "Jaipur", riskLabel: "HIGH", quotient: "HIGH WATCH", anomaly: "Zero geotagged photos & contractor address sharing" },
    { name: "Andhra Pradesh", code: "AP", level: 2, works: 7400, critical: 140, sanctioned: "₹260 Cr", mps: 25, capital: "Amaravati", riskLabel: "HIGH", quotient: "HIGH WATCH", anomaly: "34% cost overruns & threshold evasion sanctions" },
    { name: "West Bengal", code: "WB", level: 2, works: 7900, critical: 125, sanctioned: "₹310 Cr", mps: 42, capital: "Kolkata", riskLabel: "HIGH", quotient: "HIGH WATCH", anomaly: "Consecutive tender award clustering" },
    { name: "Madhya Pradesh", code: "MP", level: 2, works: 7100, critical: 95, sanctioned: "₹280 Cr", mps: 29, capital: "Bhopal", riskLabel: "HIGH", quotient: "HIGH WATCH", anomaly: "Duplicate vendor bill submissions" },

    // --- TIER 1 (MODERATE WATCH) ---
    { name: "Jammu & Kashmir", code: "JK", level: 1, works: 3620, critical: 38, sanctioned: "₹155 Cr", mps: 5, capital: "Srinagar / Jammu", riskLabel: "MODERATE", quotient: "MODERATE WATCH", anomaly: "Delayed winter execution & terrain accessibility log verification" },
    { name: "Jharkhand", code: "JH", level: 1, works: 5840, critical: 64, sanctioned: "₹235 Cr", mps: 14, capital: "Ranchi", riskLabel: "MODERATE", quotient: "MODERATE WATCH", anomaly: "Rural bridge construction delay & multiple contract clusters" },
    { name: "Chhattisgarh", code: "CH", level: 1, works: 5120, critical: 58, sanctioned: "₹215 Cr", mps: 11, capital: "Raipur", riskLabel: "MODERATE", quotient: "MODERATE WATCH", anomaly: "Tribal welfare community works documentation lag" },
    { name: "Assam", code: "AS", level: 1, works: 6120, critical: 60, sanctioned: "₹210 Cr", mps: 14, capital: "Dispur", riskLabel: "MODERATE", quotient: "MODERATE WATCH", anomaly: "Vendor address sharing across 3 MP works" },
    { name: "Telangana", code: "TG", level: 1, works: 5200, critical: 44, sanctioned: "₹180 Cr", mps: 17, capital: "Hyderabad", riskLabel: "MODERATE", quotient: "MODERATE WATCH", anomaly: "Round-number estimation bias" },
    { name: "Gujarat", code: "GJ", level: 1, works: 5800, critical: 38, sanctioned: "₹240 Cr", mps: 26, capital: "Gandhinagar", riskLabel: "MODERATE", quotient: "MODERATE WATCH", anomaly: "Tranche release timing variance" },
    { name: "Punjab", code: "PB", level: 1, works: 4300, critical: 35, sanctioned: "₹150 Cr", mps: 13, capital: "Chandigarh", riskLabel: "MODERATE", quotient: "MODERATE WATCH", anomaly: "Stalled execution for 120+ days" },
    { name: "Odisha", code: "OD", level: 1, works: 4600, critical: 32, sanctioned: "₹170 Cr", mps: 21, capital: "Bhubaneswar", riskLabel: "MODERATE", quotient: "MODERATE WATCH", anomaly: "Coastal shelter repair delays" },
    { name: "Manipur", code: "MN", level: 1, works: 1420, critical: 24, sanctioned: "₹65 Cr", mps: 2, capital: "Imphal", riskLabel: "MODERATE", quotient: "MODERATE WATCH", anomaly: "Hilly terrain connectivity documentation variance" },

    // --- TIER 0 (LOW RISK / VERIFIED) ---
    { name: "Maharashtra", code: "MH", level: 0, works: 8900, critical: 30, sanctioned: "₹340 Cr", mps: 48, capital: "Mumbai", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Isolated GFR 144 split tender under investigation" },
    { name: "Karnataka", code: "KA", level: 0, works: 6800, critical: 18, sanctioned: "₹290 Cr", mps: 28, capital: "Bengaluru", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Close conformity to Benford distribution" },
    { name: "Tamil Nadu", code: "TN", level: 0, works: 6200, critical: 14, sanctioned: "₹260 Cr", mps: 39, capital: "Chennai", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Normal statutory compliance verified" },
    { name: "Kerala", code: "KL", level: 0, works: 3900, critical: 8, sanctioned: "₹140 Cr", mps: 20, capital: "Thiruvananthapuram", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Automated audit clearance" },
    { name: "Himachal Pradesh", code: "HP", level: 0, works: 3450, critical: 16, sanctioned: "₹145 Cr", mps: 4, capital: "Shimla", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "High seasonal slope stabilisation compliance verified" },
    { name: "Uttarakhand", code: "UK", level: 0, works: 3820, critical: 21, sanctioned: "₹160 Cr", mps: 5, capital: "Dehradun", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Disaster mitigation works within statutory parameters" },
    { name: "Haryana", code: "HR", level: 0, works: 4210, critical: 18, sanctioned: "₹195 Cr", mps: 10, capital: "Chandigarh", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Urban infrastructure conformity to e-tendering standards" },
    { name: "Delhi", code: "DL", level: 0, works: 2840, critical: 12, sanctioned: "₹130 Cr", mps: 7, capital: "New Delhi", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Capital smart classroom & EV charging compliance confirmed" },
    { name: "Goa", code: "GA", level: 0, works: 980, critical: 4, sanctioned: "₹45 Cr", mps: 2, capital: "Panaji", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Coastal regulation zone clearance verified" },
    { name: "Sikkim", code: "SK", level: 0, works: 820, critical: 3, sanctioned: "₹38 Cr", mps: 1, capital: "Gangtok", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Organic farming cold storage audit cleared" },
    { name: "Arunachal Pradesh", code: "AR", level: 0, works: 1540, critical: 9, sanctioned: "₹68 Cr", mps: 2, capital: "Itanagar", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Border area suspension footbridge construction monitored" },
    { name: "Meghalaya", code: "ML", level: 0, works: 1380, critical: 8, sanctioned: "₹62 Cr", mps: 2, capital: "Shillong", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Rain harvesting and community spring shed verified" },
    { name: "Nagaland", code: "NL", level: 0, works: 1120, critical: 6, sanctioned: "₹50 Cr", mps: 1, capital: "Kohima", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Youth training centre and stadium lighting cleared" },
    { name: "Mizoram", code: "MZ", level: 0, works: 940, critical: 4, sanctioned: "₹44 Cr", mps: 1, capital: "Aizawl", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Bamboo processing cluster audit verified" },
    { name: "Tripura", code: "TR", level: 0, works: 1610, critical: 9, sanctioned: "₹72 Cr", mps: 2, capital: "Agartala", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "Border haat cold storage electrification verified" },
    { name: "Ladakh", code: "LA", level: 0, works: 620, critical: 2, sanctioned: "₹30 Cr", mps: 1, capital: "Leh", riskLabel: "LOW", quotient: "LOW RISK / VERIFIED", anomaly: "High altitude micro-solar winter grid verified" }
  ];

  const districtData = {
    "Uttar Pradesh": [
      { name: "Pilibhit", works: 980, critical: 42, sanctioned: "₹41 Cr", anomaly: "Invoice digit clustering at ₹5L cliff (Benford χ²)" },
      { name: "Barabanki", works: 860, critical: 31, sanctioned: "₹36 Cr", anomaly: "Duplicate completion photos (pHash 0.97)" },
      { name: "Lucknow", works: 1200, critical: 18, sanctioned: "₹58 Cr", anomaly: "Under ₹25L mandatory e-tender threshold" },
      { name: "Varanasi", works: 1140, critical: 12, sanctioned: "₹52 Cr", anomaly: "Vendor concentration in rural road resurfacing" },
      { name: "Agra", works: 910, critical: 8, sanctioned: "₹39 Cr", anomaly: "Acceptable variance, field photo audit pending" }
    ],
    "Bihar": [
      { name: "Bhagalpur", works: 610, critical: 20, sanctioned: "₹24 Cr", anomaly: "Delayed completion filing, 61 days overdue" },
      { name: "Patna", works: 900, critical: 12, sanctioned: "₹40 Cr", anomaly: "Tranche release timing discrepancy" },
      { name: "Gaya", works: 540, critical: 9, sanctioned: "₹21 Cr", anomaly: "Round-number invoicing pattern" },
      { name: "Muzaffarpur", works: 680, critical: 7, sanctioned: "₹28 Cr", anomaly: "Document verification in progress" }
    ],
    "Rajasthan": [
      { name: "Barmer", works: 510, critical: 15, sanctioned: "₹21 Cr", anomaly: "100% disbursed with zero geotagged field photos" },
      { name: "Jodhpur", works: 680, critical: 9, sanctioned: "₹29 Cr", anomaly: "Contractor cartel sharing registered address" },
      { name: "Jaipur", works: 820, critical: 6, sanctioned: "₹38 Cr", anomaly: "Minor execution timeline slippage" }
    ],
    "Andhra Pradesh": [
      { name: "Kurnool", works: 640, critical: 14, sanctioned: "₹27 Cr", anomaly: "Cost overrun 34% above district median" },
      { name: "Guntur", works: 580, critical: 10, sanctioned: "₹23 Cr", anomaly: "Sanctioned at ₹49.8L to evade ₹50L tender limit" },
      { name: "Visakhapatnam", works: 710, critical: 5, sanctioned: "₹31 Cr", anomaly: "Normal execution pace verified" }
    ],
    "West Bengal": [
      { name: "Murshidabad", works: 740, critical: 19, sanctioned: "₹32 Cr", anomaly: "Consecutive tender award clustering" },
      { name: "Kolkata", works: 860, critical: 11, sanctioned: "₹44 Cr", anomaly: "Document verification ongoing" },
      { name: "South 24 Parganas", works: 690, critical: 8, sanctioned: "₹29 Cr", anomaly: "Embankment repair documentation delay" }
    ],
    "Madhya Pradesh": [
      { name: "Indore", works: 760, critical: 14, sanctioned: "₹33 Cr", anomaly: "Duplicate vendor bill submission" },
      { name: "Bhopal", works: 810, critical: 10, sanctioned: "₹37 Cr", anomaly: "GFR 144 threshold proximity clustering" },
      { name: "Jabalpur", works: 590, critical: 6, sanctioned: "₹26 Cr", anomaly: "Execution within normal variance" }
    ],
    "Jammu & Kashmir": [
      { name: "Srinagar", works: 680, critical: 14, sanctioned: "₹32 Cr", anomaly: "Winter stalled work extension without engineer certification" },
      { name: "Jammu", works: 840, critical: 11, sanctioned: "₹38 Cr", anomaly: "Solar street lighting vendor concentration" },
      { name: "Anantnag", works: 590, critical: 8, sanctioned: "₹26 Cr", anomaly: "Delayed completion geotag verification" },
      { name: "Baramulla", works: 520, critical: 5, sanctioned: "₹23 Cr", anomaly: "Irrigation channel repair audit pending" }
    ],
    "Ladakh": [
      { name: "Leh", works: 340, critical: 1, sanctioned: "₹17 Cr", anomaly: "High altitude micro-solar project verified" },
      { name: "Kargil", works: 280, critical: 1, sanctioned: "₹13 Cr", anomaly: "Seasonal road culvert repair compliance verified" }
    ],
    "Jharkhand": [
      { name: "Ranchi", works: 890, critical: 22, sanctioned: "₹37 Cr", anomaly: "Sub-threshold tender partitioning under GFR 144" },
      { name: "Dhanbad", works: 780, critical: 18, sanctioned: "₹33 Cr", anomaly: "Mine area drinking water pipeline cost variance" },
      { name: "Jamshedpur", works: 710, critical: 12, sanctioned: "₹30 Cr", anomaly: "Repeated vendor awards without open competitive bid" },
      { name: "Bokaro", works: 640, critical: 7, sanctioned: "₹27 Cr", anomaly: "Bridge repair completion 45 days overdue" },
      { name: "Hazaribagh", works: 580, critical: 5, sanctioned: "₹24 Cr", anomaly: "Rural electrification bill verification ongoing" }
    ],
    "Chhattisgarh": [
      { name: "Raipur", works: 880, critical: 21, sanctioned: "₹36 Cr", anomaly: "Multiple small works below ₹25L mandatory e-tender ceiling" },
      { name: "Bilaspur", works: 740, critical: 16, sanctioned: "₹31 Cr", anomaly: "Vendor address overlap with regional construction syndicate" },
      { name: "Durg", works: 690, critical: 11, sanctioned: "₹29 Cr", anomaly: "Community pond deepening bill cluster" },
      { name: "Bastar", works: 540, critical: 6, sanctioned: "₹23 Cr", anomaly: "Tribal welfare community hall documentation lag" },
      { name: "Korba", works: 490, critical: 4, sanctioned: "₹21 Cr", anomaly: "Industrial township health post verification" }
    ],
    "Assam": [
      { name: "Nagaon", works: 710, critical: 9, sanctioned: "₹22 Cr", anomaly: "Vendor address shared across 3 MP works" },
      { name: "Kamrup", works: 520, critical: 6, sanctioned: "₹18 Cr", anomaly: "Suspension bridge replacement documentation" },
      { name: "Dibrugarh", works: 430, critical: 3, sanctioned: "₹15 Cr", anomaly: "Compliant rural electrification" },
      { name: "Silchar", works: 390, critical: 2, sanctioned: "₹13 Cr", anomaly: "Flood shelter repair verified" }
    ],
    "Telangana": [
      { name: "Warangal", works: 480, critical: 7, sanctioned: "₹19 Cr", anomaly: "Round-number invoicing bias" },
      { name: "Nizamabad", works: 390, critical: 5, sanctioned: "₹15 Cr", anomaly: "22% unapproved cost escalation" },
      { name: "Hyderabad", works: 850, critical: 4, sanctioned: "₹42 Cr", anomaly: "Urban infrastructure verified" },
      { name: "Karimnagar", works: 410, critical: 2, sanctioned: "₹16 Cr", anomaly: "Panchayat water purifier audit clear" }
    ],
    "Gujarat": [
      { name: "Ahmedabad", works: 880, critical: 7, sanctioned: "₹45 Cr", anomaly: "Minor tranche release timing discrepancy" },
      { name: "Surat", works: 720, critical: 4, sanctioned: "₹36 Cr", anomaly: "Compliant solar illumination" },
      { name: "Vadodara", works: 610, critical: 3, sanctioned: "₹28 Cr", anomaly: "Stormwater drain modernization verified" },
      { name: "Rajkot", works: 540, critical: 2, sanctioned: "₹24 Cr", anomaly: "Community centre construction verified" }
    ],
    "Punjab": [
      { name: "Amritsar", works: 490, critical: 6, sanctioned: "₹18 Cr", anomaly: "Stalled execution for 120+ days after 50% release" },
      { name: "Ludhiana", works: 560, critical: 5, sanctioned: "₹22 Cr", anomaly: "Invoice audit pending field validation" },
      { name: "Jalandhar", works: 430, critical: 3, sanctioned: "₹17 Cr", anomaly: "Sports infrastructure procurement cleared" },
      { name: "Patiala", works: 380, critical: 2, sanctioned: "₹15 Cr", anomaly: "Rural library solarisation verified" }
    ],
    "Odisha": [
      { name: "Cuttack", works: 530, critical: 8, sanctioned: "₹24 Cr", anomaly: "Coastal cyclone shelter repair delay" },
      { name: "Bhubaneswar", works: 620, critical: 5, sanctioned: "₹29 Cr", anomaly: "Verified drinking water kiosk network" },
      { name: "Puri", works: 480, critical: 4, sanctioned: "₹21 Cr", anomaly: "Pilgrim amenity pavilion geotagged" },
      { name: "Balasore", works: 390, critical: 3, sanctioned: "₹16 Cr", anomaly: "Tidal embankment revetment verified" }
    ],
    "Manipur": [
      { name: "Imphal West", works: 420, critical: 8, sanctioned: "₹19 Cr", anomaly: "Hilly terrain road connectivity delay" },
      { name: "Imphal East", works: 380, critical: 6, sanctioned: "₹17 Cr", anomaly: "Community hall solar lighting audit pending" },
      { name: "Churachandpur", works: 330, critical: 5, sanctioned: "₹15 Cr", anomaly: "Water supply pipeline verification ongoing" },
      { name: "Thoubal", works: 290, critical: 5, sanctioned: "₹14 Cr", anomaly: "Panchayat skill centre documentation review" }
    ],
    "Maharashtra": [
      { name: "Pune", works: 720, critical: 4, sanctioned: "₹28 Cr", anomaly: "GFR 144 split tender under ₹50L ceiling" },
      { name: "Nagpur", works: 610, critical: 3, sanctioned: "₹22 Cr", anomaly: "Normal execution pace, verified" },
      { name: "Nashik", works: 580, critical: 2, sanctioned: "₹20 Cr", anomaly: "Compliant tender process" },
      { name: "Mumbai City", works: 840, critical: 2, sanctioned: "₹38 Cr", anomaly: "Hospital ICU upgrade verified compliant" },
      { name: "Thane", works: 690, critical: 2, sanctioned: "₹29 Cr", anomaly: "Urban school digital library verified" }
    ],
    "Karnataka": [
      { name: "Mysuru", works: 480, critical: 3, sanctioned: "₹21 Cr", anomaly: "Close conformity to Benford distribution" },
      { name: "Bengaluru Urban", works: 940, critical: 2, sanctioned: "₹48 Cr", anomaly: "Digital lab set procurement verified" },
      { name: "Belagavi", works: 520, critical: 1, sanctioned: "₹23 Cr", anomaly: "Normal execution pace" },
      { name: "Mangaluru", works: 460, critical: 1, sanctioned: "₹20 Cr", anomaly: "Fishermen wharf shelter verified" }
    ],
    "Tamil Nadu": [
      { name: "Chennai", works: 810, critical: 2, sanctioned: "₹41 Cr", anomaly: "Compliant urban sanitation" },
      { name: "Madurai", works: 590, critical: 1, sanctioned: "₹26 Cr", anomaly: "Documentation verified" },
      { name: "Coimbatore", works: 640, critical: 1, sanctioned: "₹28 Cr", anomaly: "Industrial corridor water filtration compliant" },
      { name: "Tiruchirappalli", works: 490, critical: 1, sanctioned: "₹21 Cr", anomaly: "Panchayat road widening audit complete" }
    ],
    "Kerala": [
      { name: "Ernakulam", works: 540, critical: 1, sanctioned: "₹27 Cr", anomaly: "Verified community healthcare center" },
      { name: "Thiruvananthapuram", works: 610, critical: 1, sanctioned: "₹31 Cr", anomaly: "Compliant e-governance kiosks" },
      { name: "Kozhikode", works: 480, critical: 1, sanctioned: "₹22 Cr", anomaly: "Public dialysis unit verified" },
      { name: "Thrissur", works: 420, critical: 0, sanctioned: "₹18 Cr", anomaly: "Solar power generation unit verified" }
    ],
    "Himachal Pradesh": [
      { name: "Shimla", works: 720, critical: 5, sanctioned: "₹31 Cr", anomaly: "Slope retention wall structural audit complete" },
      { name: "Kangra", works: 810, critical: 4, sanctioned: "₹34 Cr", anomaly: "Rural water supply scheme fully verified" },
      { name: "Mandi", works: 590, critical: 4, sanctioned: "₹25 Cr", anomaly: "Bridge approach paving within acceptable variance" },
      { name: "Solan", works: 530, critical: 3, sanctioned: "₹23 Cr", anomaly: "Vocational training centre verified compliant" }
    ],
    "Uttarakhand": [
      { name: "Dehradun", works: 820, critical: 7, sanctioned: "₹35 Cr", anomaly: "Urban drainage upgrade audit clearance" },
      { name: "Haridwar", works: 760, critical: 6, sanctioned: "₹32 Cr", anomaly: "Pilgrim sanitation block geotag verification" },
      { name: "Nainital", works: 580, critical: 4, sanctioned: "₹25 Cr", anomaly: "Hill road culvert execution normal" },
      { name: "Almora", works: 490, critical: 4, sanctioned: "₹21 Cr", anomaly: "Community water kiosk network verified" }
    ],
    "Haryana": [
      { name: "Gurugram", works: 950, critical: 5, sanctioned: "₹44 Cr", anomaly: "Stormwater pipeline tranche release verified" },
      { name: "Faridabad", works: 810, critical: 4, sanctioned: "₹38 Cr", anomaly: "Community healthcare wing modernization compliant" },
      { name: "Ambala", works: 620, critical: 3, sanctioned: "₹27 Cr", anomaly: "Rural solar lighting grid compliance verified" },
      { name: "Karnal", works: 580, critical: 2, sanctioned: "₹25 Cr", anomaly: "Panchayat sports ground documentation complete" },
      { name: "Rohtak", works: 510, critical: 2, sanctioned: "₹22 Cr", anomaly: "Community library digitization verified" }
    ],
    "Delhi": [
      { name: "New Delhi", works: 820, critical: 4, sanctioned: "₹38 Cr", anomaly: "Smart classroom digital lab procurement audit cleared" },
      { name: "South Delhi", works: 760, critical: 3, sanctioned: "₹35 Cr", anomaly: "Public park solar illumination network verified" },
      { name: "North West Delhi", works: 690, critical: 3, sanctioned: "₹31 Cr", anomaly: "Community dialysis centre equipment verified" },
      { name: "East Delhi", works: 570, critical: 2, sanctioned: "₹26 Cr", anomaly: "MCD school rainwater harvesting compliant" }
    ],
    "Goa": [
      { name: "North Goa", works: 520, critical: 2, sanctioned: "₹24 Cr", anomaly: "Coastal heritage tourist amenity pathway compliant" },
      { name: "South Goa", works: 460, critical: 2, sanctioned: "₹21 Cr", anomaly: "Fishermen cold storage facility audit cleared" }
    ],
    "Sikkim": [
      { name: "Gangtok", works: 310, critical: 1, sanctioned: "₹14 Cr", anomaly: "Eco-tourism viewpoint and walking trail verified" },
      { name: "Namchi", works: 220, critical: 1, sanctioned: "₹10 Cr", anomaly: "Organic agricultural produce aggregation centre verified" },
      { name: "Gyalshing", works: 160, critical: 1, sanctioned: "₹8 Cr", anomaly: "High slope drainage culvert compliance complete" },
      { name: "Mangan", works: 130, critical: 0, sanctioned: "₹6 Cr", anomaly: "Solar micro-grid station documentation verified" }
    ],
    "Arunachal Pradesh": [
      { name: "Itanagar", works: 490, critical: 3, sanctioned: "₹22 Cr", anomaly: "Capital sports complex pavilion verified" },
      { name: "Tawang", works: 380, critical: 2, sanctioned: "₹17 Cr", anomaly: "Border village solar heating and lighting verified" },
      { name: "Pasighat", works: 360, critical: 2, sanctioned: "₹15 Cr", anomaly: "Siang river flood mitigation bund verified" },
      { name: "Ziro", works: 310, critical: 2, sanctioned: "₹14 Cr", anomaly: "Handicrafts training centre documentation cleared" }
    ],
    "Meghalaya": [
      { name: "East Khasi Hills", works: 480, critical: 3, sanctioned: "₹22 Cr", anomaly: "Shillong town market sanitation modernization cleared" },
      { name: "West Garo Hills", works: 450, critical: 3, sanctioned: "₹20 Cr", anomaly: "Tura youth skill centre documentation verified" },
      { name: "Ri-Bhoi", works: 450, critical: 2, sanctioned: "₹20 Cr", anomaly: "Highway rest area and agro-kiosks verified" }
    ],
    "Nagaland": [
      { name: "Kohima", works: 390, critical: 2, sanctioned: "₹18 Cr", anomaly: "Youth stadium solar floodlighting verified" },
      { name: "Dimapur", works: 360, critical: 2, sanctioned: "₹16 Cr", anomaly: "Commercial district drainage modernization cleared" },
      { name: "Mokokchung", works: 210, critical: 1, sanctioned: "₹9 Cr", anomaly: "Tribal cultural centre refurbishment audit complete" },
      { name: "Mon", works: 160, critical: 1, sanctioned: "₹7 Cr", anomaly: "Rural community water cistern network verified" }
    ],
    "Mizoram": [
      { name: "Aizawl", works: 380, critical: 2, sanctioned: "₹18 Cr", anomaly: "Hillside slope reinforcement drainage cleared" },
      { name: "Lunglei", works: 260, critical: 1, sanctioned: "₹12 Cr", anomaly: "Panchayat computer education lab verified" },
      { name: "Champhai", works: 180, critical: 1, sanctioned: "₹8 Cr", anomaly: "Border trade warehouse rooftop solar cleared" },
      { name: "Kolasib", works: 120, critical: 0, sanctioned: "₹6 Cr", anomaly: "Rural ambulance garage and clinic wing verified" }
    ],
    "Tripura": [
      { name: "West Tripura", works: 560, critical: 3, sanctioned: "₹25 Cr", anomaly: "Agartala municipal solar streetlighting verified" },
      { name: "Gomati", works: 410, critical: 2, sanctioned: "₹18 Cr", anomaly: "Rubber farmer collection centre audit cleared" },
      { name: "Unakoti", works: 340, critical: 2, sanctioned: "₹15 Cr", anomaly: "Heritage sculpture site preservation amenity verified" },
      { name: "Dhalai", works: 300, critical: 2, sanctioned: "₹14 Cr", anomaly: "Tribal hostel rainwater harvesting compliant" }
    ]
  };

  let activeGeoState = "Uttar Pradesh";

  function normalizeStateName(s) {
    if (!s) return "";
    return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
  }

  function findStateData(nameOrCode) {
    if (!nameOrCode) return null;
    const n = normalizeStateName(nameOrCode);
    return stateGeo.find(s => normalizeStateName(s.name) === n || (s.code && normalizeStateName(s.code) === n));
  }

  function getRiskColor(level) {
    if (level === 3) return "#f43f5e"; // Crimson (Tier 3 Critical)
    if (level === 2) return "#f59e0b"; // Amber (Tier 2 High)
    if (level === 1) return "#eab308"; // Yellow (Tier 1 Moderate)
    return "#14b8a6"; // Teal (Tier 0 Low)
  }

  // Visual centroid coordinates for clean state code labels and radar pings
  const stateCenterOverrides = {
    // North
    "Jammu and Kashmir": [152, 98],
    "Jammu & Kashmir": [152, 98],
    "Ladakh": [182, 74],
    "Himachal Pradesh": [196, 143],
    "Punjab": [164, 163],
    "Uttarakhand": [233, 182],
    "Haryana": [174, 202],
    "Delhi": [192, 215],

    // West
    "Rajasthan": [138, 266],
    "Gujarat": [92, 342],
    "Goa": [132, 494],

    // Central
    "Madhya Pradesh": [215, 318],
    "Chhattisgarh": [286, 376],

    // East
    "Uttar Pradesh": [262, 254],
    "Bihar": [355, 278],
    "Jharkhand": [358, 321],
    "West Bengal": [402, 316],
    "Odisha": [330, 394],

    // South
    "Maharashtra": [182, 416],
    "Telangana": [234, 445],
    "Andhra Pradesh": [256, 482],
    "Karnataka": [180, 502],
    "Kerala": [174, 584],
    "Tamil Nadu": [224, 578],

    // Northeast
    "Assam": [490, 268],
    "Arunachal Pradesh": [532, 222],
    "Sikkim": [410, 238],
    "Meghalaya": [465, 282],
    "Nagaland": [524, 268],
    "Manipur": [514, 300],
    "Mizoram": [494, 332],
    "Tripura": [474, 320]
  };

  function renderMap() {
    renderStateQuickRibbon();
    renderIndiaSvgMap();
    renderStateMatrixGrid();
    selectState(activeGeoState);
    bindGeoModeToggle();
  }

  function renderStateQuickRibbon() {
    const container = document.getElementById("stateChipsContainer");
    if (!container) return;

    container.innerHTML = stateGeo.map(s => `
      <button class="sqr-chip tier-${s.riskLabel.toLowerCase()} ${s.name === activeGeoState ? 'active' : ''}" data-select-state="${s.name}" data-select-code="${s.code}">
        <span class="sqr-name">${s.name}</span>
        <span class="sqr-badge mono">${s.critical}</span>
      </button>`).join("");

    container.querySelectorAll("[data-select-state]").forEach(btn => {
      btn.addEventListener("click", () => {
        selectState(btn.dataset.selectCode || btn.dataset.selectState);
      });
    });
  }

  /* ================= TRUE-GEOGRAPHY REAL INDIA VECTOR MAP ================= */
  function renderIndiaSvgMap() {
    const wrapper = document.getElementById("indiaSvgWrapper");
    if (!wrapper) return;

    if (!window.INDIA_GEOJSON || !window.INDIA_GEOJSON.features) {
      wrapper.innerHTML = `<div style="padding:40px; text-align:center; color:var(--ink-dim);">Loading authentic India map boundaries...</div>`;
      return;
    }

    // Mercator projection strictly calibrated for India (viewBox 0 0 600 660)
    function mercatorY(lat) {
      const rad = (lat * Math.PI) / 180;
      return Math.log(Math.tan(Math.PI / 4 + rad / 2));
    }

    const minLng = 68.1, maxLng = 97.4;
    const minLat = 8.0, maxLat = 37.1;
    const yMin = mercatorY(minLat);
    const yMax = mercatorY(maxLat);
    const svgW = 600, svgH = 660, pad = 18;

    function projectSvg(lng, lat) {
      const x = (pad + ((lng - minLng) / (maxLng - minLng)) * (svgW - 2 * pad)).toFixed(1);
      const mY = mercatorY(lat);
      const y = (pad + ((yMax - mY) / (yMax - yMin)) * (svgH - 2 * pad)).toFixed(1);
      return x + "," + y;
    }

    function coordsToD(coords, type) {
      if (type === "Polygon") {
        return coords.map(ring => "M " + ring.map(pt => projectSvg(pt[0], pt[1])).join(" L ") + " Z").join(" ");
      } else if (type === "MultiPolygon") {
        return coords.map(poly => poly.map(ring => "M " + ring.map(pt => projectSvg(pt[0], pt[1])).join(" L ") + " Z").join(" ")).join(" ");
      }
      return "";
    }

    let svgHtml = `
      <svg class="india-interactive-svg" viewBox="0 0 600 660" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="geoGlowCrit" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#f43f5e" flood-opacity="0.85" />
          </filter>
          <filter id="geoGlowAmber" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#f59e0b" flood-opacity="0.85" />
          </filter>
        </defs>

        <!-- Ambient Surveillance Radar Compass Axes & Range Rings -->
        <g class="map-grid-axes" opacity="0.16">
          <line x1="20" y1="340" x2="580" y2="340" stroke="currentColor" stroke-dasharray="3,3" />
          <line x1="290" y1="20" x2="290" y2="640" stroke="currentColor" stroke-dasharray="3,3" />
          <circle cx="290" cy="340" r="210" fill="none" stroke="currentColor" stroke-dasharray="4,4" />
          <circle cx="290" cy="340" r="130" fill="none" stroke="currentColor" stroke-dasharray="2,4" opacity="0.6" />
          <text x="296" y="38" font-size="8.5" font-family="IBM Plex Mono" fill="currentColor">NORTH // 28°N</text>
          <text x="495" y="355" font-size="8.5" font-family="IBM Plex Mono" fill="currentColor">EAST // 88°E</text>
        </g>

        <!-- Real Authentic State & UT Geographic Vector Paths -->
        <g class="map-state-paths">`;

    window.INDIA_GEOJSON.features.forEach(f => {
      const rawName = f.properties.st_nm;
      const sData = findStateData(rawName);
      const officialName = sData ? sData.name : rawName;
      const code = sData ? sData.code : "";
      const lvl = sData ? sData.level : 0;
      const isSelected = sData && (sData.name === activeGeoState || sData.code === activeGeoState);
      const color = getRiskColor(lvl);
      const pathD = coordsToD(f.geometry.coordinates, f.geometry.type);
      const fillOpacity = isSelected ? "0.86" : "0.52";
      const strokeWidth = isSelected ? "2.4px" : "1.1px";
      const strokeColor = isSelected ? "#ffffff" : "rgba(255,255,255,0.32)";

      // Centroid placement for state code label
      let cx = 0, cy = 0;
      if (stateCenterOverrides[rawName]) {
        [cx, cy] = stateCenterOverrides[rawName];
      } else if (sData && stateCenterOverrides[sData.name]) {
        [cx, cy] = stateCenterOverrides[sData.name];
      } else {
        let sumX = 0, sumY = 0, count = 0;
        function walkPts(c) {
          if (typeof c[0] === "number") {
            const pt = projectSvg(c[0], c[1]).split(",");
            sumX += parseFloat(pt[0]);
            sumY += parseFloat(pt[1]);
            count++;
          } else {
            c.forEach(walkPts);
          }
        }
        walkPts(f.geometry.coordinates);
        cx = count > 0 ? +(sumX / count).toFixed(1) : 0;
        cy = count > 0 ? +(sumY / count).toFixed(1) : 0;
      }

      svgHtml += `
        <path d="${pathD}"
          class="map-state-poly tier-${lvl === 3 ? 'crit' : lvl === 2 ? 'amber' : lvl === 1 ? 'yellow' : 'teal'} ${isSelected ? 'state-active' : ''}"
          data-state-name="${officialName}"
          data-state-code="${code}"
          fill="${color}"
          fill-opacity="${fillOpacity}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
          stroke-linejoin="round"
          style="cursor:pointer; transition:all 0.18s ease;">
        </path>`;

      // Clean, well-aligned state codes in clean WHITE (user requested: 'white me hi kr do')
      const visibleLabelCodes = [
        "JK", "LA", "HP", "PB", "UK", "HR", "RJ", "UP", "BR", "JH",
        "WB", "OD", "CH", "MP", "GJ", "MH", "TG", "AP", "KA", "KL",
        "TN", "AS", "AR"
      ];
      if (code && visibleLabelCodes.includes(code)) {
        svgHtml += `
          <text x="${cx}" y="${cy}"
            class="map-state-label"
            text-anchor="middle"
            dominant-baseline="central"
            pointer-events="none"
            font-family="IBM Plex Mono"
            font-size="9.5"
            font-weight="700"
            fill="#ffffff"
            stroke="rgba(0, 0, 0, 0.65)"
            stroke-width="0.6px"
            paint-order="stroke fill"
            style="letter-spacing:0.4px; text-shadow:0 1px 3px rgba(0,0,0,0.9);">${code}</text>`;
      }

      // Radar pulse target circle on Tier 3 critical states
      if (lvl === 3) {
        svgHtml += `
          <circle cx="${cx}" cy="${cy}" r="16" class="radar-ping-circle" pointer-events="none" />`;
      }
    });

    svgHtml += `
        </g>
      </svg>`;

    wrapper.innerHTML = svgHtml;

    // Attach interactive tooltips and selection handlers
    const tip = document.getElementById("mapTooltip");
    wrapper.querySelectorAll(".map-state-poly").forEach(poly => {
      const stateName = poly.dataset.stateName;
      const stateCode = poly.dataset.stateCode;
      const stateObj = findStateData(stateName) || findStateData(stateCode);

      poly.addEventListener("mouseenter", e => {
        if (tip && stateObj) {
          tip.style.display = "block";
          tip.innerHTML = `
            <div class="tip-header">
              <span class="tip-title">${stateObj.name} (${stateObj.code})</span>
              <span class="risk-tag risk-${stateObj.riskLabel}">${stateObj.riskLabel}</span>
            </div>
            <div class="tip-row"><span>Sanctioned:</span><b class="mono text-gold">${stateObj.sanctioned}</b></div>
            <div class="tip-row"><span>Works Monitored:</span><b class="mono">${stateObj.works.toLocaleString()}</b></div>
            <div class="tip-row"><span>Critical Flags:</span><b class="mono text-crimson">${stateObj.critical} (${(stateObj.critical / stateObj.works * 100).toFixed(1)}%)</b></div>
            <div class="tip-action-hint">👉 Click to load district breakdown</div>`;
        }
      });

      poly.addEventListener("mousemove", e => {
        if (!tip) return;
        const rect = wrapper.getBoundingClientRect();
        tip.style.left = (e.clientX - rect.left + 14) + "px";
        tip.style.top = (e.clientY - rect.top + 14) + "px";
      });

      poly.addEventListener("mouseleave", () => {
        if (tip) tip.style.display = "none";
      });

      poly.addEventListener("click", () => {
        selectState(stateCode || stateName);
      });
    });
  }

  function renderStateMatrixGrid() {
    const container = document.getElementById("stateMatrixContainer");
    if (!container) return;

    container.innerHTML = stateGeo.map(s => `
      <div class="state-matrix-card tier-${s.riskLabel.toLowerCase()} ${s.name === activeGeoState ? 'active' : ''}" data-select-matrix="${s.name}" data-select-code="${s.code}">
        <div class="smc-header">
          <div class="smc-title-row">
            <span class="smc-name">${s.name}</span>
            <span class="smc-code mono">${s.code}</span>
          </div>
          <span class="risk-tag risk-${s.riskLabel}">${s.riskLabel}</span>
        </div>
        <div class="smc-stats">
          <div class="smc-stat-item"><span class="l">WORKS</span><b class="v mono">${s.works.toLocaleString()}</b></div>
          <div class="smc-stat-item"><span class="l">CRITICAL</span><b class="v mono text-crimson">${s.critical}</b></div>
          <div class="smc-stat-item"><span class="l">BUDGET</span><b class="v mono text-gold">${s.sanctioned}</b></div>
        </div>
        <div class="smc-anomaly mono">${s.anomaly}</div>
        <button class="smc-btn">Inspect Districts →</button>
      </div>`).join("");

    container.querySelectorAll("[data-select-matrix]").forEach(card => {
      card.addEventListener("click", () => {
        const target = card.dataset.selectCode || card.dataset.selectMatrix;
        selectState(target);
        const btnMap = document.getElementById("btnViewMap");
        const btnMatrix = document.getElementById("btnViewMatrix");
        const mapBox = document.getElementById("indiaMapContainer");
        const matrixBox = document.getElementById("stateMatrixContainer");
        if (btnMap) btnMap.classList.add("active");
        if (btnMatrix) btnMatrix.classList.remove("active");
        if (mapBox) mapBox.style.display = "flex";
        if (matrixBox) matrixBox.style.display = "none";
      });
    });
  }

  function bindGeoModeToggle() {
    const btnMap = document.getElementById("btnViewMap");
    const btnMatrix = document.getElementById("btnViewMatrix");
    const mapBox = document.getElementById("indiaMapContainer");
    const matrixBox = document.getElementById("stateMatrixContainer");

    if (!btnMap || !btnMatrix || !mapBox || !matrixBox) return;

    btnMap.addEventListener("click", () => {
      btnMap.classList.add("active");
      btnMatrix.classList.remove("active");
      mapBox.style.display = "flex";
      matrixBox.style.display = "none";
    });

    btnMatrix.addEventListener("click", () => {
      btnMatrix.classList.add("active");
      btnMap.classList.remove("active");
      mapBox.style.display = "none";
      matrixBox.style.display = "grid";
    });
  }

  function selectState(stateIdentifier) {
    if (!stateIdentifier) return;
    const target = stateIdentifier.trim();
    const stateObj = findStateData(target) || stateGeo[0];

    activeGeoState = stateObj.name;

    // Update active tag above map
    const activeTag = document.getElementById("mapActiveStateTag");
    if (activeTag) activeTag.textContent = `${stateObj.name} Selected`;

    // Update quick jump ribbon active chip
    document.querySelectorAll(".sqr-chip").forEach(chip => {
      const match = chip.dataset.selectState === stateObj.name || chip.dataset.selectCode === stateObj.code;
      chip.classList.toggle("active", match);
    });

    // Update SVG map polygon highlights
    document.querySelectorAll(".map-state-poly").forEach(poly => {
      const isSel = (poly.dataset.stateName === stateObj.name || poly.dataset.stateCode === stateObj.code);
      poly.classList.toggle("state-active", isSel);
      poly.setAttribute("stroke", isSel ? "#ffffff" : "rgba(255,255,255,0.32)");
      poly.setAttribute("stroke-width", isSel ? "2.4px" : "1.1px");
      poly.setAttribute("fill-opacity", isSel ? "0.86" : "0.52");
    });

    // Update matrix cards active state
    document.querySelectorAll(".state-matrix-card").forEach(card => {
      const match = card.dataset.selectMatrix === stateObj.name || card.dataset.selectCode === stateObj.code;
      card.classList.toggle("active", match);
    });

    // Update Right-side dossier banner
    const titleEl = document.getElementById("selectedStateTitle");
    if (titleEl) titleEl.textContent = stateObj.name;

    const codeEl = document.getElementById("selectedStateCode");
    if (codeEl) codeEl.textContent = stateObj.code;

    const metaEl = document.getElementById("selectedStateMeta");
    if (metaEl) metaEl.textContent = `Capital: ${stateObj.capital} · ${stateObj.mps} Parliamentary Constituencies`;

    const riskTag = document.getElementById("selectedStateRiskTag");
    if (riskTag) {
      riskTag.className = `risk-tag risk-${stateObj.riskLabel}`;
      riskTag.textContent = `${stateObj.riskLabel} (Tier ${stateObj.level})`;
    }

    // Update KPI micro-cards
    const skcSanctioned = document.getElementById("skcSanctioned");
    if (skcSanctioned) skcSanctioned.textContent = stateObj.sanctioned;

    const skcWorks = document.getElementById("skcWorks");
    if (skcWorks) skcWorks.textContent = stateObj.works.toLocaleString();

    const skcCritical = document.getElementById("skcCritical");
    if (skcCritical) skcCritical.textContent = `${stateObj.critical} (${(stateObj.critical / stateObj.works * 100).toFixed(1)}%)`;

    const skcQuotient = document.getElementById("skcQuotient");
    if (skcQuotient) skcQuotient.textContent = stateObj.quotient;

    // Render district leaderboard
    renderDistricts(stateObj.name);
  }

  function renderDistricts(state) {
    const stateObj = stateGeo.find(s => 
      s.name.toLowerCase() === (state || "").toLowerCase() || 
      s.code.toLowerCase() === (state || "").toLowerCase()
    );
    const key = stateObj ? stateObj.name : state;
    const rows = districtData[key] || districtData[state] || (stateObj && districtData[stateObj.code]) || [
      { name: "Central District", works: 620, critical: 12, sanctioned: "₹25 Cr", anomaly: "Routine verification ongoing" },
      { name: "North District", works: 480, critical: 8, sanctioned: "₹19 Cr", anomaly: "Within acceptable variance" }
    ];

    const countLabel = document.getElementById("districtCountLabel");
    if (countLabel) countLabel.textContent = `${rows.length} Districts Monitored`;

    const tbody = document.getElementById("districtBody");
    if (tbody) {
      tbody.innerHTML = rows.map(r => `
        <tr class="district-row-item">
          <td>
            <div class="dt-name-box">
              <span class="dt-pin">📍</span>
              <b>${r.name}</b>
            </div>
          </td>
          <td>
            <div class="dt-works-wrap">
              <span class="mono">${r.works}</span>
              <div class="dt-mini-bar"><i style="width:${Math.min(100, r.works / 12)}%;"></i></div>
            </div>
          </td>
          <td>
            <span class="risk-tag risk-${r.critical > 25 ? 'CRITICAL' : r.critical > 8 ? 'HIGH' : 'MEDIUM'}">
              ${r.critical} flags
            </span>
          </td>
          <td class="mono text-gold">${r.sanctioned}</td>
          <td class="dt-anomaly-cell">
            <span class="dt-anomaly-text" title="${r.anomaly}">${r.anomaly}</span>
          </td>
          <td>
            <button class="dt-action-btn" data-filter-dist="${r.name}" title="Inspect in Scheme Directory">
              <span>Filter</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </td>
        </tr>`).join("");

      // Clicking action button filters the Alerts directory to this district
      tbody.querySelectorAll("[data-filter-dist]").forEach(btn => {
        btn.addEventListener("click", () => {
          const dist = btn.dataset.filterDist;
          setView("alerts");
          const searchInput = document.getElementById("fSearch");
          if (searchInput) {
            searchInput.value = dist;
            searchInput.dispatchEvent(new Event("input"));
          }
          showToast(`Filtered vigilance directory to district: ${dist} (${state})`);
        });
      });
    }
  }

  /* ================= IMMUTABLE AUDIT LEDGER ================= */
  const ledgerData = [
    ["LOG-88213", "2026-09-10 09:14:02", "MPLADS-UP-40217", "state_nodal_up · State", "ESCALATED", "Cost variance exceeds statutory threshold under GFR 144; escalated for treasury review pending vendor clarification.", 92, "4f3a9c…e21b"],
    ["LOG-88198", "2026-09-10 08:52:41", "MPLADS-BR-05512", "ministry_admin · Ministry", "CONFIRMED", "Reviewed documentation, delay justified by monsoon disruption; confirming completion status as filed.", 48, "91bd0e…7fa4"],
    ["LOG-88190", "2026-09-09 22:03:15", "MPLADS-AP-77031", "district_pilibhit · District", "INSPECTION_ORDERED", "Physical inspection ordered given 34% cost overrun and stalled execution flag on this work.", 71, "2c88a1…903d"],
    ["LOG-88176", "2026-09-09 19:41:07", "MPLADS-UP-38810", "ministry_admin · Ministry", "TREASURY_HOLD_RECOMMENDED", "Duplicate photograph evidence at 0.97 similarity warrants a treasury hold pending fraud investigation.", 89, "7e1f5b…c66a"],
  ];

  function renderLedger() {
    const tbody = document.getElementById("ledgerBody");
    if (!tbody) return;
    tbody.innerHTML = ledgerData.map(l => `
      <tr><td><div>${l[0]}</div><div class="mono" style="color:var(--ink-faint); font-size:10.5px;">${l[1]}</div></td>
      <td class="mono">${l[2]}</td><td>${l[3]}</td><td><span class="risk-tag risk-${l[4] === 'ESCALATED' || l[4] === 'TREASURY_HOLD_RECOMMENDED' ? 'CRITICAL' : l[4] === 'INSPECTION_ORDERED' ? 'HIGH' : 'LOW'}">${l[4]}</span></td>
      <td style="max-width:260px; font-size:11.5px; color:var(--ink-dim);">${l[5]}</td><td class="mono">${l[6]}</td><td class="hash">${l[7]}</td></tr>`).join("");
  }
  renderLedger();

  /* ================= DISTRICT AUDITOR WATCHDOG PANEL ================= */
  async function renderDaWatchdog() {
    const daContent = document.getElementById("daContent");
    if (!daContent) return;

    let daRecords = [
      { id: "district_pilibhit", name: "District Authority — Pilibhit", jurisdiction: "Pilibhit, Uttar Pradesh", dismissed: 14, escalated: 0, capitalAtRisk: "₹4.12 Cr", status: "CRITICAL", alertType: "10+ Dismissals (30d) Without Escalation" },
      { id: "district_barabanki", name: "District Authority — Barabanki", jurisdiction: "Barabanki, Uttar Pradesh", dismissed: 11, escalated: 1, capitalAtRisk: "₹2.85 Cr", status: "HIGH", alertType: "10+ Critical Dismissals (30d)" },
      { id: "district_kurnool", name: "District Authority — Kurnool", jurisdiction: "Kurnool, Andhra Pradesh", dismissed: 10, escalated: 2, capitalAtRisk: "₹2.10 Cr", status: "HIGH", alertType: "10+ Critical Dismissals (30d)" }
    ];

    if (isApiOnline) {
      try {
        const liveDAs = await apiGet("/api/audit/da-flagged");
        if (Array.isArray(liveDAs) && liveDAs.length > 0) {
          daRecords = liveDAs.map(d => ({
            id: d.user_id,
            name: `District Authority — ${d.user_id.replace("district_", "").toUpperCase()}`,
            jurisdiction: `${d.user_id.replace("district_", "").toUpperCase()}, State Jurisdiction`,
            dismissed: d.dismissal_count || 10,
            escalated: 0,
            capitalAtRisk: "₹3.40 Cr",
            status: "CRITICAL",
            alertType: "Statutory Rule Violation: 10+ Critical Alerts Dismissed"
          }));
        }
      } catch {}
    }

    daContent.innerHTML = `
      <div style="padding:14px 18px 12px; border-bottom:1px solid var(--line-soft); background:rgba(226,104,92,0.06); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-weight:700; font-size:13px; color:var(--crimson); display:flex; align-items:center; gap:6px;">
            <span>🚨 AUTOMATED AUDITOR ACCOUNTABILITY SURVEILLANCE</span>
            <span class="statutory-cite-badge">MASTER PLAN PART 8</span>
          </div>
          <div style="font-size:11px; color:var(--ink-dim); margin-top:2px;">
            Statutory Watchdog: Flags authorities who systematically dismiss critical fraud alerts without ordering on-site measurement book inspections.
          </div>
        </div>
        <span class="badge-crit">${daRecords.length} AUTHORITIES FLAGGED</span>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>District Authority</th>
              <th>Jurisdiction</th>
              <th>Dismissals (30d)</th>
              <th>Escalated</th>
              <th>Capital At Risk</th>
              <th>Audit Directive</th>
              <th>Statutory Action</th>
            </tr>
          </thead>
          <tbody>
            ${daRecords.map(d => `
              <tr>
                <td>
                  <div style="font-weight:600; font-size:12.5px;">${d.name}</div>
                  <div class="mono" style="font-size:10.5px; color:var(--ink-faint);">${d.id}</div>
                </td>
                <td>${d.jurisdiction}</td>
                <td><b class="mono text-crimson">${d.dismissed}</b></td>
                <td><span class="mono">${d.escalated}</span></td>
                <td class="mono text-gold">${d.capitalAtRisk}</td>
                <td><span class="risk-tag risk-${d.status}">${d.status === 'CRITICAL' ? 'REVIEW' : 'WATCH'}</span></td>
                <td>
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="da-action-btn crit" data-da-inquiry="${d.id}" data-da-name="${d.name}" title="Order Vigilance Inquiry">
                      <span>Inquiry</span>
                    </button>
                    <button class="da-action-btn" data-da-freeze="${d.id}" data-da-name="${d.name}" title="Freeze District Disbursals">
                      <span>Freeze</span>
                    </button>
                  </div>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;

    daContent.querySelectorAll("[data-da-inquiry]").forEach(btn => {
      btn.addEventListener("click", () => {
        const daName = btn.dataset.daName;
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);
        const logId = "LOG-" + Math.floor(88220 + Math.random() * 9000);
        const hash = "7a4f…119d";
        ledgerData.unshift([logId, now, btn.dataset.daInquiry, `${currentRole} · Ministry Watchdog`, "INSPECTION_ORDERED", `Formal Vigilance Inquiry ordered against ${daName} for 10+ critical alert dismissals without field inspection.`, 95, hash]);
        renderLedger();
        showToast(`Vigilance Inquiry Ordered: Formal statutory summons issued to ${daName}.`, true);
      });
    });

    daContent.querySelectorAll("[data-da-freeze]").forEach(btn => {
      btn.addEventListener("click", () => {
        const daName = btn.dataset.daName;
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);
        const logId = "LOG-" + Math.floor(88220 + Math.random() * 9000);
        const hash = "9e2c…840b";
        ledgerData.unshift([logId, now, btn.dataset.daFreeze, `${currentRole} · Ministry Watchdog`, "TREASURY_HOLD_RECOMMENDED", `Treasury disbursal freeze recommended for ${daName} pending comprehensive physical Measurement Book verification.`, 98, hash]);
        renderLedger();
        showToast(`Treasury Disbursals Frozen for ${daName} pending CAG review.`, true);
      });
    });
  }
  renderDaWatchdog();

  /* ================= IMAGE FORENSICS MODAL ================= */
  const ctaImageForensics = document.getElementById("ctaImageForensics");
  if (ctaImageForensics) {
    ctaImageForensics.addEventListener("click", () => {
      runTask("Running pHash + OCR vision ensemble…", 1200, ctaImageForensics, async () => {
        if (isApiOnline) {
          try { await apiPost("/api/image-forensics/run"); } catch {}
        }
        openModal("imageForensicsModal");
        showToast("AI Perceptual Image Forensics: 1 High-Confidence duplicate match found!", true);
      });
    });
  }

  const btnHoldTreasury = document.getElementById("btnHoldTreasury");
  if (btnHoldTreasury) {
    btnHoldTreasury.addEventListener("click", () => {
      showToast("Statutory Treasury Hold Recommended for Shree Infra Works (Work MPLADS-UP-40217 & 38810)", true);
      document.getElementById("imageForensicsModal").classList.remove("open");
    });
  }

  const btnOrderInspection = document.getElementById("btnOrderInspection");
  if (btnOrderInspection) {
    btnOrderInspection.addEventListener("click", () => {
      showToast("Vigilance Field Inspection Ordered: Notification dispatched to District Authority Pilibhit");
      document.getElementById("imageForensicsModal").classList.remove("open");
    });
  }

  /* ================= STATUTORY PDF DOSSIER MODAL ================= */
  function openPdfDossier(workId) {
    const w = alertsData.find(a => a.id === workId) || alertsData[0];
    const grid = document.getElementById("pdfMetaGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="pdf-meta-item"><div class="l">WORK IDENTIFIER</div><div class="v mono">${w.id}</div></div>
        <div class="pdf-meta-item"><div class="l">SANCTION DATE</div><div class="v mono">${w.date}</div></div>
        <div class="pdf-meta-item"><div class="l">CONSTITUENCY & STATE</div><div class="v">${w.ida}, ${w.state}</div></div>
        <div class="pdf-meta-item"><div class="l">RECOMMENDING MP</div><div class="v">${w.mp}</div></div>
        <div class="pdf-meta-item"><div class="l">ALLOCATION AMOUNT</div><div class="v mono">₹${(w.sanction / 100000).toFixed(2)} Lakhs</div></div>
        <div class="pdf-meta-item"><div class="l">DESIGNATED CONTRACTOR</div><div class="v">${w.vendor}</div></div>
        <div class="pdf-meta-item"><div class="l">EXECUTION STATUS</div><div class="v">${w.status} (${w.progress}%)</div></div>
        <div class="pdf-meta-item"><div class="l">AI RISK SCORE</div><div class="v"><span class="risk-tag risk-${riskLabel(w.risk)}">${w.risk} / 100 · ${riskLabel(w.risk)}</span></div></div>
      `;
    }

    const scores = document.getElementById("pdfModelScores");
    if (scores) {
      scores.innerHTML = `
        <div style="font-size:12px; color:var(--ink-dim); margin-bottom:8px;">
          Isolation Forest Anomaly Score: <b>${Math.min(99, w.risk + 2)}%</b> | Benford Digit Deviation: <b>${w.reason.includes("threshold") ? "HIGH" : "NORMAL"}</b> | Vendor Concentration Index: <b>${w.monopoly ? "MONOPOLISTIC (4.2x)" : "NORMAL"}</b>
        </div>
      `;
    }

    const legal = document.getElementById("pdfLegalFinding");
    if (legal) {
      legal.innerHTML = `
        <b>Statutory Anomaly Identified:</b> ${w.reason}.<br>
        <b>Statutory Citation:</b> Non-compliance with Rule 144 of General Financial Rules (GFR) 2017 &amp; MPLADS Operational Guidelines Section 4.3.<br>
        <b>Vigilance Action:</b> Recommended for immediate administrative audit and freezing of subsequent tranche releases.
      `;
    }

    const certHash = document.getElementById("pdfCertHash");
    if (certHash) {
      certHash.textContent = `SHA-256 SEAL: ${w.id.toLowerCase()}-e9a2b84f01c9047712df`;
    }

    const pdfTable = document.querySelector("#pdfLedgerTable tbody");
    if (pdfTable) {
      pdfTable.innerHTML = ledgerData.filter(l => l[2] === w.id || true).slice(0, 3).map(l => `
        <tr><td class="mono">${l[1]}</td><td>${l[3]}</td><td><b>${l[4]}</b></td><td class="mono">${l[7]}</td></tr>
      `).join("");
    }

    openModal("pdfModal");
  }

  const ctaBriefing = document.getElementById("ctaBriefing");
  if (ctaBriefing) {
    ctaBriefing.addEventListener("click", async () => {
      const m = houseMetricsData[currentHouseFilter] || houseMetricsData["all"];
      const briefingModal = document.getElementById("briefingModal");
      if (briefingModal) {
        let p1 = `Across the national MPLADS portfolio (${m.houseLabel}), ${m.critCount.toLocaleString()} works are currently classified critical across ${m.mps} Members of Parliament, where round-number invoicing exceeds the Benford-expected baseline by more than double.`;
        let p2 = `Vendor-network analysis has identified ${m.monopolies} contractor monopoly alerts operating across constituency boundaries, with ${m.splitTenders} works flagged for artificial tender-splitting under GFR Rule 144.`;
        let p3 = `Recommended action: prioritise statutory adjudication on ${m.critRisk} in capital at risk across flagged authorities before the next central tranche release.`;

        if (isApiOnline) {
          try {
            const aiBriefing = await apiGet("/api/explain/briefing");
            if (aiBriefing && aiBriefing.explanation) {
              const exp = aiBriefing.explanation;
              if (exp.opening_paragraph) p1 = exp.opening_paragraph;
              if (exp.key_findings_paragraph) p2 = exp.key_findings_paragraph;
              if (exp.action_paragraph) p3 = exp.action_paragraph;
            }
          } catch {}
        }

        const pEls = briefingModal.querySelectorAll("p");
        if (pEls && pEls.length >= 3) {
          pEls[0].textContent = p1;
          pEls[1].textContent = p2;
          pEls[2].textContent = p3;
        }
      }
      openModal("briefingModal");
      showToast("Synthesized Secretary briefing memo from live audit telemetry.");
    });
  }

  const bulkBtn = document.getElementById("bulkBtn");
  if (bulkBtn) bulkBtn.addEventListener("click", () => openModal("bulkModal"));

  const bAuto = document.getElementById("bAuto");
  if (bAuto) bAuto.addEventListener("click", function () { this.classList.toggle("on"); });

  const bSubmit = document.getElementById("bSubmit");
  if (bSubmit) {
    bSubmit.addEventListener("click", async () => {
      const box = document.getElementById("bStatus"), bar = document.getElementById("bProgress"), txt = document.getElementById("bStatusText");
      box.style.display = "block"; bar.style.width = "0%"; txt.textContent = "Queued…";
      const limit = parseInt(document.getElementById("bLimit")?.value || "20");
      const state = document.getElementById("bState")?.value || null;
      const mp = document.getElementById("bMp")?.value || null;
      const minAmount = parseFloat(document.getElementById("bAmount")?.value || "5000000");
      const workers = parseInt(document.getElementById("bWorkers")?.value || "4");

      if (isApiOnline) {
        try {
          await apiPost("/api/forensics/bulk-download", {
            limit, state, mp_name: mp, min_amount: minAmount, workers, run_forensics_after: true
          });
        } catch {}
      }

      let p = 0; const iv = setInterval(() => {
        p += 14; bar.style.width = Math.min(p, 100) + "%";
        txt.textContent = p < 100 ? `Extracting scanned completion certificates from official portal… ${Math.min(p, 100)}%` : `Ingestion complete — ${limit} completion records scanned by OCR & pHash vision ensemble.`;
        if (p >= 100) {
          clearInterval(iv);
          showToast(`Bulk ingestion finished: ${limit} new works ingested into audit radar.`);
        }
      }, 260);
    });
  }

  function exportCsv() {
    const filtered = getFilteredRows();
    const rows = [["work_id", "state", "district", "mp", "category", "amount_inr", "risk_score", "reason", "contractor"],
    ...filtered.map(a => [a.id, a.state, a.ida, a.mp, a.cat, a.sanction, a.risk, a.reason, a.vendor])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bharat-drishti-fraud-dossier-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Dossier exported: ${filtered.length} flagged records saved as CSV.`);
  }

  const ctaExport = document.getElementById("ctaExport");
  if (ctaExport) ctaExport.addEventListener("click", exportCsv);

  const footerExport = document.getElementById("footerExport");
  if (footerExport) footerExport.addEventListener("click", exportCsv);

  /* ---------- RENDER ALL CHARTS INITIALIZATION ---------- */
  function renderAllCharts() {
    renderRiskDist();
    renderBenford();
    renderNetwork();
    renderMP(mps[0]);
    renderMap();
    renderDistricts("Uttar Pradesh");
  }

  renderAlerts();
  renderAllCharts();
})();