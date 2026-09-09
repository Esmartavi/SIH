import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ExecutiveKpis from './components/ExecutiveKpis';
import QuickStatsCharts from './components/QuickStatsCharts';
import LiveAlertFeed from './components/LiveAlertFeed';
import CaseFileModal from './components/CaseFileModal';
import BenfordView from './components/BenfordView';
import VendorNetworkView from './components/VendorNetworkView';
import GeoRiskMapView from './components/GeoRiskMapView';
import AuditLedgerView from './components/AuditLedgerView';
import SecretaryBriefingModal from './components/SecretaryBriefingModal';
import { api } from './services/api';
import { 
  ShieldAlert, 
  Sparkles, 
  Activity, 
  FileText, 
  Layers, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeRole, setActiveRole] = useState('ministry');
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [showSecretaryBriefing, setShowSecretaryBriefing] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [initialTier, setInitialTier] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);

  // Auto authenticate with demo accounts if not logged in
  useEffect(() => {
    // Attempt default login as ministry admin
    api.login('ministry_admin', 'Ministry@2026').catch(() => {});
  }, []);

  const loadKpis = async () => {
    try {
      const data = await api.getKpis();
      setKpis(data);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  useEffect(() => {
    loadKpis();
    const interval = setInterval(loadKpis, 30000);
    return () => clearInterval(interval);
  }, [activeRole]);

  const handleRoleChange = async (newRole) => {
    setActiveRole(newRole);
    const roleCredentials = {
      ministry: ['ministry_admin', 'Ministry@2026'],
      state: ['state_nodal_up', 'StateUP@2026'],
      district: ['district_pilibhit', 'District@2026'],
      mp: ['mp_javed', 'MP@2026'],
    };
    const creds = roleCredentials[newRole];
    if (creds) {
      try {
        await api.login(creds[0], creds[1]);
        showToast(`Switched access context to ${newRole.toUpperCase()} level`);
        loadKpis();
      } catch (err) {
        console.error('Role switch error:', err);
      }
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFilterTier = (tier) => {
    setInitialTier(tier);
    setActiveTab('alerts');
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Ministry Command Header */}
      <Header
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        onOpenSecretaryBriefing={() => setShowSecretaryBriefing(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main War Room Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl glass-panel-glow border border-cyan-500/40 text-xs font-semibold text-cyan-200 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: EXECUTIVE WAR ROOM (OVERVIEW) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Real-time Ticker Banner */}
            <div className="glass-panel px-4 py-2 rounded-xl flex items-center justify-between text-xs border border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-slate-300">
                  NATIONAL AUDIT ACTIVE: <strong>98,649 WORKS MONITORED</strong>
                </span>
              </div>
              <div className="hidden sm:flex items-center space-x-4 text-slate-400 font-mono text-[11px]">
                <span>MODELS: ISOLATION FOREST + BENFORD's LAW + PERCEPTUAL HASH</span>
                <span className="text-cyan-400">FASTAPI v2.2</span>
              </div>
            </div>

            {/* Executive KPIs Grid */}
            <ExecutiveKpis kpis={kpis} onFilterTier={handleFilterTier} />

            {/* Visual Analytics & Breakdown */}
            <QuickStatsCharts kpis={kpis} />

            {/* Live Flagged Feeds Preview Section */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Priority Action Radar (Immediate Ground Review)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Schemes with composite risk score &gt; 0.85 requiring immediate statutory intervention.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('alerts')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Explore All 98,649 Works</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Embedded Mini Feed */}
              <LiveAlertFeed onSelectWork={setSelectedWorkId} initialTier="critical" />
            </div>

          </div>
        )}

        {/* TAB 2: LIVE ALERTS FEED */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white font-display">
                  Live Statutory Vigilance & Flagged Schemes Directory
                </h2>
                <p className="text-xs text-slate-400">
                  Search, filter, and inspect forensic dossiers across all parliamentary constituencies in India.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800">
                SQL Index Sync Active
              </span>
            </div>

            <LiveAlertFeed onSelectWork={setSelectedWorkId} initialTier={initialTier} />
          </div>
        )}

        {/* TAB 3: BENFORD'S LAW FORENSIC MODULE */}
        {activeTab === 'benford' && (
          <BenfordView onSelectWork={setSelectedWorkId} />
        )}

        {/* TAB 4: CONTRACTOR MONOPOLY & NETWORKS */}
        {activeTab === 'vendors' && (
          <VendorNetworkView onSelectWork={setSelectedWorkId} />
        )}

        {/* TAB 5: GEOSPATIAL VIGILANCE */}
        {activeTab === 'map' && (
          <GeoRiskMapView onSelectWork={setSelectedWorkId} />
        )}

        {/* TAB 6: IMMUTABLE AUDIT TRAIL LEDGER */}
        {activeTab === 'audit' && (
          <AuditLedgerView onSelectWork={setSelectedWorkId} />
        )}

      </main>

      {/* Forensic Case File Modal (Deep-Dive Drawer) */}
      {selectedWorkId && (
        <CaseFileModal
          workId={selectedWorkId}
          onClose={() => setSelectedWorkId(null)}
          onActionLogged={() => {
            showToast(`Auditor action for #${selectedWorkId} recorded.`);
            loadKpis();
          }}
        />
      )}

      {/* MoSPI Secretary AI Briefing Modal */}
      {showSecretaryBriefing && (
        <SecretaryBriefingModal
          onClose={() => setShowSecretaryBriefing(false)}
        />
      )}

      {/* Platform Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-navy-950/90 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-glow-cyan animate-pulse" />
            <span>
              <strong>BHARAT-DRISHTI</strong> — National MPLADS AI Vigilance & Anti-Corruption Audit Platform
            </span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-500">
            <span>MoSPI SIH 2026 // PS-26102</span>
            <span>•</span>
            <span>FastAPI + Vite + React 19 + Tailwind v3.4</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
