import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Layers, 
  ShieldAlert, 
  TrendingUp, 
  ChevronRight,
  Filter,
  Flame,
  Globe
} from 'lucide-react';
import { api } from '../services/api';

export default function GeoRiskMapView({ onSelectWork }) {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getMapStates()
      .then((data) => {
        setStates(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          handleSelectState(data[0].state);
        }
      })
      .catch((err) => console.error('Error loading state map data:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectState = (stateName) => {
    setSelectedState(stateName);
    setLoadingDistricts(true);
    api.getMapDistricts(stateName)
      .then((data) => setDistricts(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error loading district map data:', err))
      .finally(() => setLoadingDistricts(false));
  };

  const currentStateObj = states.find((s) => s.state === selectedState) || states[0];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              National Geospatial Vigilance Grid
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
              State & District Level
            </span>
          </div>
          <h2 className="text-lg font-bold text-white font-display">
            Geographic Vulnerability Distribution & Risk Clusters
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pinpoints districts exhibiting abnormal expenditure concentration, missing physical completion proofs, and cartel clustering.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>High Risk Cluster</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Compliant</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* State Ranking Column */}
        <div className="lg:col-span-5 glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              State Risk Ranking
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {states.length} Jurisdictions
            </span>
          </div>

          <div className="overflow-y-auto max-h-[600px] space-y-2 pr-1">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
              ))
            ) : states.map((s, idx) => {
              const isSelected = selectedState === s.state;
              const critCount = Number(s.critical_count || 0);
              const fundsRiskCr = (Number(s.funds_at_risk || 0) / 10000000).toFixed(1);
              
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectState(s.state)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-glow-cyan'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        {s.state}
                        {critCount > 100 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{s.total_works} Audited Works</span>
                        <span>•</span>
                        <span className="text-rose-400 font-medium">{critCount} Critical</span>
                      </div>
                    </div>

                    <div className="text-right font-mono flex-shrink-0">
                      <div className="text-xs font-bold text-amber-400">
                        ₹{fundsRiskCr} Cr
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Score: {s.avg_risk_score}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* District Breakdown for Selected State */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 space-y-5">
          {currentStateObj && (
            <>
              {/* Selected State Overview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    Geospatial Focus
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display">
                    {currentStateObj.state}
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-800">
                    {currentStateObj.critical_pct}% Critical Ratio
                  </span>
                </div>
              </div>

              {/* State Aggregated Figures */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Total Sanctioned</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    ₹{((currentStateObj.total_sanctioned || 0) / 10000000).toFixed(1)} Cr
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Capital at Risk</div>
                  <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
                    ₹{((currentStateObj.funds_at_risk || 0) / 10000000).toFixed(1)} Cr
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Critical Schemes</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                    {currentStateObj.critical_count} Works
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Monopoly Awards</div>
                  <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
                    {currentStateObj.monopoly_works || 0}
                  </div>
                </div>
              </div>

              {/* Districts Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white font-display">
                    District Administrative Authorities Breakdown ({districts.length} Districts)
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Sorted by Critical Schemes
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[420px] rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-mono text-slate-400 border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">District Authority</th>
                        <th className="py-2.5 px-3">Total Works</th>
                        <th className="py-2.5 px-3">Critical Flags</th>
                        <th className="py-2.5 px-3">Sanctioned Outlay</th>
                        <th className="py-2.5 px-3 text-right">Avg Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {loadingDistricts ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td colSpan={5} className="py-3 px-3">
                              <div className="h-4 bg-slate-800/40 rounded w-full" />
                            </td>
                          </tr>
                        ))
                      ) : districts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No district data found.
                          </td>
                        </tr>
                      ) : (
                        districts.map((d, idx) => {
                          const crit = Number(d.critical_count || 0);
                          const amt = Number(d.total_sanctioned || 0);
                          return (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-white">
                                {d.ida || d.district || 'District DA'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">
                                {d.total_works}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {crit > 0 ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                    {crit} Critical
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 text-xs">0 Clean</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-200">
                                ₹{(amt / 10000000).toFixed(2)} Cr
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-400">
                                {d.avg_risk_score}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}
        </div>

      </div>

    </div>
  );
}
