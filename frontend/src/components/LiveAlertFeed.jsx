import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  AlertOctagon, 
  FileSearch, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Image as ImageIcon,
  Building2,
  TrendingDown,
  CameraOff,
  Clock
} from 'lucide-react';
import { api } from '../services/api';

export default function LiveAlertFeed({ onSelectWork, initialTier = 'all' }) {
  const [flags, setFlags] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState(initialTier);
  const [stateFilter, setStateFilter] = useState('all');
  const [states, setStates] = useState([]);
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Load States for dropdown
  useEffect(() => {
    api.getStates()
      .then(res => setStates(res.states || []))
      .catch(() => {});
  }, []);

  // Sync tier if parent updates it
  useEffect(() => {
    if (initialTier) {
      setTier(initialTier);
      setPage(1);
    }
  }, [initialTier]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getFlags({
        page,
        pageSize,
        risk_label: tier,
        state: stateFilter,
        search: search.trim() || undefined,
        trigger: triggerFilter !== 'all' ? triggerFilter : undefined,
      });

      let items = res.flags || [];
      
      // Client-side quick filter fallback for specific trigger flags if selected
      if (triggerFilter === 'split_tender') {
        items = items.filter(f => f.rule_split_tender);
      } else if (triggerFilter === 'premature_tranche') {
        items = items.filter(f => f.rule_premature_tranche);
      } else if (triggerFilter === 'stalled') {
        items = items.filter(f => f.rule_stalled_execution);
      } else if (triggerFilter === 'duplicate') {
        items = items.filter(f => f.is_duplicate);
      } else if (triggerFilter === 'missing_photo') {
        items = items.filter(f => f.rule_missing_photo);
      } else if (triggerFilter === 'overspend') {
        items = items.filter(f => f.rule_overspend);
      } else if (triggerFilter === 'vendor') {
        items = items.filter(f => f.work_vendor_flag);
      }

      setFlags(items);
      setTotalCount(res.total || items.length);
    } catch (err) {
      console.error('Error fetching flags:', err);
    } finally {
      setLoading(false);
    }
  }, [page, tier, stateFilter, search, triggerFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const getTierBadge = (riskScore, tierName) => {
    const score = Number(riskScore) || 0;
    if (score >= 0.85 || tierName === 'critical') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse" />
          CRITICAL ({score.toFixed(2)})
        </span>
      );
    }
    if (score >= 0.65 || tierName === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
          HIGH ({score.toFixed(2)})
        </span>
      );
    }
    if (score >= 0.4 || tierName === 'medium') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-sky-500/15 text-sky-400 border border-sky-500/30">
          MED ({score.toFixed(2)})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        LOW ({score.toFixed(2)})
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4">
      
      {/* Search & Filter Command Ribbon */}
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Work ID, Scheme Title, MP Name, District..."
              className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-500"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* State Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Indian States</option>
              {states.map((s, idx) => (
                <option key={idx} value={s} className="bg-slate-900 text-white">{s}</option>
              ))}
            </select>
          </div>

          {/* Reload Button */}
          <button
            onClick={() => loadData()}
            className="px-3 py-2 rounded-xl glass-input hover:bg-slate-800 text-slate-300 transition-colors flex items-center justify-center gap-1 text-xs"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Tier & Trigger Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          {/* Risk Tier Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Risk Tier:</span>
            {[
              { id: 'all', label: 'All Tiers' },
              { id: 'critical', label: 'Critical' },
              { id: 'high', label: 'High Risk' },
              { id: 'medium', label: 'Medium' },
              { id: 'low', label: 'Verified' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTier(t.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  tier === t.id
                    ? t.id === 'critical'
                      ? 'bg-rose-500 text-white shadow-glow-rose font-bold'
                      : t.id === 'high'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-glow-amber'
                      : 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Trigger Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Anomaly Type:</span>
            {[
              { id: 'all', label: 'Any Flag', icon: null },
              { id: 'premature_tranche', label: 'Clause 4.3 Tranche Gate', icon: AlertOctagon },
              { id: 'split_tender', label: 'GFR Split Tender', icon: FileSearch },
              { id: 'stalled', label: 'Stalled Execution (>1y)', icon: Clock },
              { id: 'duplicate', label: 'Duplicate Photo', icon: ImageIcon },
              { id: 'missing_photo', label: 'Missing Photo', icon: CameraOff },
              { id: 'overspend', label: 'Cost Overrun', icon: TrendingDown },
              { id: 'vendor', label: 'Vendor Monopoly', icon: Building2 },
            ].map((trig) => {
              const Icon = trig.icon;
              return (
                <button
                  key={trig.id}
                  onClick={() => {
                    setTriggerFilter(trig.id);
                    setPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all ${
                    triggerFilter === trig.id
                      ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-300 border border-slate-800/60'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {trig.label}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Table Feed / Results Card */}
      <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Scheme Dossier</th>
                <th className="py-3 px-4">Constituency & MP</th>
                <th className="py-3 px-4">Sanction vs Disbursed</th>
                <th className="py-3 px-4">Risk Severity</th>
                <th className="py-3 px-4">Violation Triggers</th>
                <th className="py-3 px-4 text-right">Forensic Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-6 bg-slate-800/40 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : flags.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertOctagon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No schemes match your filter parameters.
                  </td>
                </tr>
              ) : (
                flags.map((work) => {
                  const sanction = Number(work.sanction_amount || 0);
                  const spent = Number(work.total_spent || 0);
                  const overrun = work.cost_overrun_pct || 0;
                  const isCritical = (Number(work.risk_score) || 0) >= 0.85;

                  return (
                    <tr 
                      key={work.work_id} 
                      className={`hover:bg-slate-800/40 transition-colors group ${
                        isCritical ? 'bg-rose-950/5' : ''
                      }`}
                    >
                      {/* Work ID & Title */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-mono text-cyan-400 font-semibold text-xs tracking-tight group-hover:underline cursor-pointer"
                          onClick={() => onSelectWork(work.work_id)}
                        >
                          #{work.work_id}
                        </div>
                        <div className="text-slate-200 text-xs line-clamp-1 font-medium mt-0.5" title={work.work_title}>
                          {work.work_title || 'Public Works Scheme'}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {work.category || 'General Infrastructure'}
                        </div>
                      </td>

                      {/* Constituency & MP */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium">
                          {work.district || 'District N/A'}, {work.state || 'State N/A'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]" title={work.mp_name}>
                          MP: {work.mp_name || 'Constituency Rep'}
                        </div>
                      </td>

                      {/* Sanction vs Disbursed */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-white font-medium">
                          ₹{(sanction / 100000).toFixed(2)} Lakhs
                        </div>
                        <div className={`text-[11px] flex items-center gap-1 ${spent > sanction ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                          <span>Spent: ₹{(spent / 100000).toFixed(2)}L</span>
                          {overrun > 0 && <span>(+{overrun}%)</span>}
                        </div>
                      </td>

                      {/* Risk Score */}
                      <td className="py-3.5 px-4">
                        <div>
                          {getTierBadge(work.risk_score, work.risk_tier)}
                        </div>
                        <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full ${
                              isCritical ? 'bg-rose-500' :
                              (Number(work.risk_score) || 0) >= 0.65 ? 'bg-amber-400' :
                              'bg-cyan-400'
                            }`}
                            style={{ width: `${Math.min(100, (Number(work.risk_score) || 0) * 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Anomaly Triggers Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {work.rule_premature_tranche && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40" title="Clause 4.3: Tranche 2 released <=7 days of Tranche 1 (75% utilization gate bypassed)">
                              ⚖️ Cl. 4.3 Tranche Gate
                            </span>
                          )}
                          {work.rule_split_tender && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40" title="GFR 2017 Rules 149/155: Evasion of ₹5L/₹10L tender threshold">
                              ✂️ GFR Split Tender
                            </span>
                          )}
                          {work.rule_stalled_execution && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40" title="Disbursed public funds but stalled >1 year">
                              ⏳ Stalled (&gt;1y)
                            </span>
                          )}
                          {work.is_duplicate && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
                              📸 Duplicate pHash
                            </span>
                          )}
                          {work.rule_missing_photo && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              ⚠️ Missing Photo
                            </span>
                          )}
                          {work.rule_overspend && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              💸 Overspend
                            </span>
                          )}
                          {work.work_vendor_flag && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              🏢 Monopoly
                            </span>
                          )}
                          {!work.rule_premature_tranche && !work.rule_split_tender && !work.rule_stalled_execution && !work.is_duplicate && !work.rule_missing_photo && !work.rule_overspend && !work.work_vendor_flag && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400">
                              ML Statistical Anomaly
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectWork(work.work_id)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all active:scale-95 shadow-sm"
                        >
                          <FileSearch className="w-3.5 h-3.5" />
                          <span>Case File</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-mono">{flags.length}</span> of{' '}
            <span className="text-white font-mono">{Number(totalCount).toLocaleString('en-IN')}</span> flagged works
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
