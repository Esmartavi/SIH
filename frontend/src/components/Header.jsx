import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  FileText, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

export default function Header({ activeRole, onRoleChange, onOpenSecretaryBriefing, activeTab, setActiveTab }) {
  const [ping, setPing] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    // Health check ping
    const checkStatus = async () => {
      try {
        const { ok, ping: ms } = await api.checkHealth();
        setIsOnline(ok);
        setPing(ms);
      } catch {
        setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.getDemoAccounts()
      .then(res => setDemoAccounts(res.demo_accounts || []))
      .catch(() => {});
  }, []);

  const roles = [
    { id: 'ministry', name: 'MoSPI Ministry Official', subtitle: 'National Oversight & Policy Directorate' },
    { id: 'state', name: 'State Nodal Authority (UP)', subtitle: 'State Level Project Monitoring' },
    { id: 'district', name: 'District Authority (Pilibhit)', subtitle: 'Ground Verification & Sanctions' },
    { id: 'mp', name: 'Shri Javed Ali Khan (MP)', subtitle: 'Parliamentary Constituency Review' }
  ];

  const currentRoleObj = roles.find(r => r.id === activeRole) || roles[0];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-navy-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & National Directorate */}
          <div className="flex items-center space-x-4">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-sky-600/10 border border-cyan-500/30 shadow-glow-cyan">
              <ShieldAlert className="w-7 h-7 text-cyan-400 animate-pulse-slow" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  भारत सरकार // MoSPI Vigilance
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  SIH-26102
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white font-display flex items-center gap-2">
                BHARAT-DRISHTI
                <span className="text-xs font-mono font-normal text-cyan-300/80 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/50">
                  AI Forensic Engine v2.2
                </span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            {[
              { id: 'overview', label: 'War Room' },
              { id: 'alerts', label: 'Live Flags' },
              { id: 'benford', label: "Benford's Law" },
              { id: 'vendors', label: 'Vendor Rings' },
              { id: 'map', label: 'Geo Vigilance' },
              { id: 'audit', label: 'Audit Ledger' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Actions & Role Switcher */}
          <div className="flex items-center space-x-3">
            {/* Live System Status Pill */}
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono">
              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-rose-500'}`} />
              <span className="text-slate-300">{isOnline ? 'CONNECTED' : 'OFFLINE'}</span>
              {ping && <span className="text-cyan-400 text-[10px]">{ping}ms</span>}
            </div>

            {/* AI Secretary Briefing Button */}
            <button
              onClick={onOpenSecretaryBriefing}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600/30 to-fuchsia-600/20 text-violet-200 border border-violet-500/40 hover:border-violet-400 hover:shadow-glow-violet transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-violet-300 animate-spin-slow" />
              <span className="hidden md:inline">Secretary AI Briefing</span>
              <span className="md:hidden">AI Brief</span>
            </button>

            {/* Role Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-left transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold text-xs">
                  {currentRoleObj.name[0]}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-medium text-slate-200 leading-tight">{currentRoleObj.name}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{currentRoleObj.subtitle}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl glass-panel-glow border border-slate-700 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-mono font-semibold text-slate-400 tracking-wider">
                    Role-Based Access Simulation
                  </div>
                  {roles.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onRoleChange(r.id);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                        activeRole === r.id
                          ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-[10px] text-slate-400">{r.subtitle}</div>
                      </div>
                      {activeRole === r.id && <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-800/60 no-scrollbar">
          {[
            { id: 'overview', label: 'War Room' },
            { id: 'alerts', label: 'Live Flags' },
            { id: 'benford', label: "Benford's Law" },
            { id: 'vendors', label: 'Vendors' },
            { id: 'map', label: 'Geo Vigilance' },
            { id: 'audit', label: 'Audit Log' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
