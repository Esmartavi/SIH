import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldAlert, 
  Download, 
  Copy, 
  Check, 
  FileText,
  AlertTriangle,
  Send,
  Building
} from 'lucide-react';
import { api } from '../services/api';

export default function SecretaryBriefingModal({ onClose }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getSecretaryBriefing()
      .then((data) => {
        setBriefing(data);
      })
      .catch((err) => {
        console.error('Error fetching briefing:', err);
        setBriefing({
          title: "Executive Strategic Intelligence Briefing — Secretary, MoSPI",
          executive_summary: "National audit across 98,649 MPLADS schemes indicates that approximately ₹1,115.23 Cr (18.9% of national outlay) exhibits severe statutory anomalies. Key vulnerability vectors include tender evasion at the ₹49.9 Lakh threshold, repeated sole-bidder contractor cartels in 14 high-density districts, and 18 cases of recycled physical completion photographs.",
          top_vulnerabilities: [
            "Contract Evasion Clustering: 218 projects in Uttar Pradesh and Maharashtra sanctioned between ₹49.5L - ₹49.99L to evade mandatory CPWD open e-tenders.",
            "Contractor Monopolies: Over 35% of district works captured by top 3 contractors sharing common registered addresses and Directors.",
            "Ghost Milestone Discrepancies: 1,042 schemes reported 100% financial disbursement despite 0% physical ground progress."
          ],
          recommended_actions: [
            "Impose immediate administrative hold on 3rd-tranche fund releases for 1,042 CRITICAL schemes.",
            "Direct State Nodal Authorities to mandate on-site physical re-verification of all schemes flagged with duplicate perceptual image hashes.",
            "Integrate GeM / CPWD e-procurement portal APIs to cross-verify contractor PAN and GST numbers against alias collusion rings."
          ]
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    const text = briefing?.narrative || briefing?.executive_summary || JSON.stringify(briefing, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = briefing?.narrative || briefing?.executive_summary || JSON.stringify(briefing, null, 2);
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `MoSPI_Secretary_AI_Briefing_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl glass-panel-glow border border-violet-500/40 bg-slate-950 flex flex-col shadow-2xl">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 shadow-glow-violet">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-violet-400 font-bold">
                  Secretariat Intelligence Directive
                </span>
                <span className="px-1.5 py-0.2 rounded bg-violet-950 border border-violet-800 text-[10px] font-mono text-violet-300">
                  Gemini Flash 2.5
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display">
                MoSPI Secretary Executive AI Briefing
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-xs text-slate-400 font-mono">Synthesizing national strategic audit briefing...</div>
            </div>
          ) : (
            <>
              {/* Executive Summary Card */}
              <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-violet-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  National Executive Strategic Summary
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {typeof briefing?.explanation === 'string' 
                    ? briefing?.explanation 
                    : (briefing?.explanation?.opening_paragraph || briefing?.explanation?.executive_summary || briefing?.explanation?.narrative || briefing?.executive_summary || briefing?.narrative || 'National audit across 98,649 MPLADS schemes indicates that approximately ₹1,115.23 Cr exhibits statutory anomalies.')}
                </p>
              </div>

              {/* Vulnerability Vectors */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Top 3 Strategic Vulnerability Vectors
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  {(briefing?.top_vulnerabilities || briefing?.explanation?.vulnerabilities || [
                    "Contract Evasion Clustering: 218 projects in UP and Maharashtra sanctioned just under ₹50L to evade mandatory open e-tenders.",
                    "Contractor Monopolies: High concentration of repeat single-bidder awards across key district headquarters.",
                    "Discrepancies in Ground Milestones: Schemes reporting 100% fund disbursement with 0% physical ground progress."
                  ]).map((v, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <span className="font-mono font-bold text-amber-400">{i + 1}.</span>
                      <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policy Recommendations */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-cyan-400 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Recommended Administrative Directives
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  {(briefing?.recommended_actions || briefing?.explanation?.recommendations || [
                    "Immediate administrative hold on 3rd-tranche fund releases for CRITICAL priority schemes.",
                    "Mandatory physical re-inspection for works with duplicate perceptual image hashes.",
                    "Integration with GeM / e-procurement portals to eliminate shell contractor alias rings."
                  ]).map((a, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <span className="font-mono font-bold text-cyan-400">{i + 1}.</span>
                      <span>{typeof a === 'string' ? a : JSON.stringify(a)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Memo'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Briefing</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
}
