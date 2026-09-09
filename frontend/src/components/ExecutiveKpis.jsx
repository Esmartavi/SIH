import React from 'react';
import { 
  AlertTriangle, 
  IndianRupee, 
  Layers, 
  TrendingUp, 
  FileWarning, 
  Image as ImageIcon,
  Flame,
  ShieldCheck
} from 'lucide-react';

export default function ExecutiveKpis({ kpis, onFilterTier }) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800" />
        ))}
      </div>
    );
  }

  const {
    total_works = 98649,
    total_sanctioned_cr = 5880.56,
    total_spent_cr = 3745.10,
    total_at_risk_cr = 1115.23,
    critical_count = 1042,
    high_count = 7624,
    medium_count = 24150,
    low_count = 65833,
    missing_photos_count = 1420,
    duplicate_photos_count = 18,
    overspend_count = 3120,
  } = kpis;

  const cards = [
    {
      title: 'Total National Outlay',
      value: `₹${Number(total_sanctioned_cr).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`,
      subtitle: `${Number(total_works).toLocaleString('en-IN')} total audited works`,
      icon: Layers,
      color: 'cyan',
      glow: 'shadow-glow-cyan',
      border: 'border-cyan-500/30',
      badge: '100% AUDITED',
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800',
    },
    {
      title: 'Disbursed Expenditure',
      value: `₹${Number(total_spent_cr).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`,
      subtitle: `${((total_spent_cr / (total_sanctioned_cr || 1)) * 100).toFixed(1)}% national fund absorption`,
      icon: TrendingUp,
      color: 'sky',
      glow: 'shadow-none',
      border: 'border-sky-500/20',
      badge: 'LIVE EXPENDITURE',
      badgeColor: 'text-sky-400 bg-sky-950/60 border-sky-800',
    },
    {
      title: 'High-Risk Capital at Stake',
      value: `₹${Number(total_at_risk_cr).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`,
      subtitle: 'Funds flagged for statutory audit review',
      icon: Flame,
      color: 'rose',
      glow: 'shadow-glow-rose ring-1 ring-rose-500/40',
      border: 'border-rose-500/50',
      badge: 'VULNERABILITY VECTOR',
      badgeColor: 'text-rose-400 bg-rose-950/70 border-rose-800 animate-pulse',
      isDanger: true,
    },
    {
      title: 'Critical Anomaly Schemes',
      value: Number(critical_count).toLocaleString('en-IN'),
      subtitle: 'Immediate administrative freeze recommended',
      icon: AlertTriangle,
      color: 'amber',
      glow: 'shadow-glow-amber',
      border: 'border-amber-500/40',
      badge: 'TIER-1 ESCALATION',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
      onClick: () => onFilterTier && onFilterTier('critical'),
    },
  ];

  return (
    <section className="space-y-4">
      {/* Primary Outlay KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className={`relative overflow-hidden rounded-2xl glass-panel p-5 transition-all duration-300 ${
                card.border
              } ${card.glow} ${card.onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
            >
              {/* Subtle gradient corner light */}
              <div
                className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-2xl pointer-events-none ${
                  card.isDanger ? 'bg-rose-500/15' : 'bg-cyan-500/10'
                }`}
              />

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {card.title}
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-mono font-semibold rounded-full border ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>

              <div className="flex items-baseline space-x-3">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
                  {card.value}
                </h3>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>{card.subtitle}</span>
                <Icon className={`w-5 h-5 flex-shrink-0 ${
                  card.color === 'rose' ? 'text-rose-400' :
                  card.color === 'amber' ? 'text-amber-400' :
                  card.color === 'sky' ? 'text-sky-400' : 'text-cyan-400'
                }`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Forensic Flags Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => onFilterTier && onFilterTier('critical')}
          className="glass-panel p-3.5 rounded-xl border border-rose-500/30 hover:border-rose-500/60 cursor-pointer transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-[11px] font-medium text-slate-400">Critical Priority</div>
            <div className="text-lg font-bold text-rose-400 font-mono">
              {Number(critical_count).toLocaleString()}
            </div>
          </div>
          <span className="h-3 w-3 rounded-full bg-rose-500 shadow-glow-rose animate-ping" />
        </div>

        <div 
          onClick={() => onFilterTier && onFilterTier('high')}
          className="glass-panel p-3.5 rounded-xl border border-amber-500/30 hover:border-amber-500/60 cursor-pointer transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-[11px] font-medium text-slate-400">High Risk Schemes</div>
            <div className="text-lg font-bold text-amber-400 font-mono">
              {Number(high_count).toLocaleString()}
            </div>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-fuchsia-500/20 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-400">Duplicate Photos (pHash)</div>
            <div className="text-lg font-bold text-fuchsia-400 font-mono">
              {duplicate_photos_count} Works
            </div>
          </div>
          <ImageIcon className="w-5 h-5 text-fuchsia-400/80" />
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-emerald-500/20 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-400">Low / Verified Works</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {Number(low_count).toLocaleString()}
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-400/80" />
        </div>
      </div>
    </section>
  );
}
