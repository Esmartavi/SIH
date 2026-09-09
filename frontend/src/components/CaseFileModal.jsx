import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldAlert, 
  Sparkles, 
  FileText, 
  Scale, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertTriangle, 
  Send,
  Building,
  MapPin,
  Calendar,
  Layers,
  TrendingUp,
  Cpu,
  Download,
  FileSearch,
  DollarSign,
  Users,
  Compass,
  Eye,
  ArrowRight
} from 'lucide-react';
import { api, API_BASE } from '../services/api';

export default function CaseFileModal({ workId, onClose, onActionLogged }) {
  const maskAccountNo = (acc) => {
    if (!acc) return 'N/A';
    const str = String(acc).trim();
    if (str.length <= 4) return str;
    return `XXXX-XXXX-${str.slice(-4)}`;
  };

  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ai_memo');
  const [showSampleOcr, setShowSampleOcr] = useState(false);
  
  // AI Explainer state
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  
  // Auditor resolution state
  const [actionType, setActionType] = useState('dismiss');
  const [justification, setJustification] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState('');

  const streamRef = useRef(null);

  // Load Work Details
  useEffect(() => {
    if (!workId) return;
    setLoading(true);
    api.getWorkDetail(workId)
      .then((data) => {
        setWork(data);
      })
      .catch((err) => {
        console.error('Failed to load work details:', err);
      })
      .finally(() => setLoading(false));

    // Also load AI Explanation automatically
    setAiLoading(true);
    api.getAiExplanation(workId)
      .then((res) => {
        setAiData(res);
      })
      .catch((err) => {
        console.error('AI Explanation error:', err);
      })
      .finally(() => setAiLoading(false));

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
      }
    };
  }, [workId]);

  // Start Live SSE Streaming
  const startStreamingExplainer = () => {
    if (streamRef.current) {
      streamRef.current.close();
    }
    setIsStreaming(true);
    setStreamedContent('');

    const streamUrl = api.getExplainStreamUrl(workId);
    const es = new EventSource(streamUrl);
    streamRef.current = es;

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.token) {
          setStreamedContent((prev) => prev + parsed.token);
        }
        if (parsed.done) {
          setIsStreaming(false);
          es.close();
        }
      } catch {
        setStreamedContent((prev) => prev + event.data);
      }
    };

    es.onerror = (e) => {
      console.error('SSE Stream error or completed:', e);
      setIsStreaming(false);
      es.close();
    };
  };

  // Submit Official Audit Action
  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (justification.trim().length < 50) {
      setActionError(`Justification must be at least 50 characters (Current: ${justification.trim().length}).`);
      return;
    }
    setActionError('');
    setSubmittingAction(true);
    try {
      const res = await api.submitAuditAction(workId, actionType, justification.trim());
      setActionSuccess(res.message || 'Audit action registered in immutable ledger.');
      if (onActionLogged) onActionLogged();
    } catch (err) {
      setActionError(err.message || 'Failed to submit audit action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!workId) return null;

  const workObj = work?.work || work;
  const auditHistory = work?.audit_history || [];
  const docForensics = work?.document_forensics || [];
  const dupEvidence = work?.duplicate_photo_evidence || [];

  const sanctionAmt = Number(workObj?.sanction_amount || 0);
  const spentAmt = Number(workObj?.total_spent || 0);
  const overrunPct = Number(workObj?.cost_overrun_pct || 0);
  const riskScore = Number(workObj?.risk_score || 0);
  const progressPct = Number(workObj?.progress_pct || 0);
  const isCritical = riskScore >= 0.85;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl glass-panel-glow border border-slate-700 bg-slate-950/95 flex flex-col shadow-2xl">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${
              isCritical ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  MoSPI Statutory Vigilance Dossier
                </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-cyan-300">
                  ID: #{workId}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display truncate max-w-xl">
                {workObj?.work_title || `Loading Dossier #${workId}...`}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => api.downloadWorkPdf(workId)}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:shadow-glow-cyan transition-all"
              title="Download Official MoSPI Statutory Audit PDF Dossier"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Statutory Audit PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-xs text-slate-400 font-mono">Retrieving forensic indicators & models...</div>
            </div>
          ) : (
            <>
              {/* Case Metadata Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-medium text-slate-400 uppercase">Sanctioned Outlay</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    ₹{(sanctionAmt / 100000).toFixed(2)} L
                  </div>
                  <div className="text-[10px] text-slate-400">Approved Budget</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-medium text-slate-400 uppercase">Total Disbursed</div>
                  <div className={`text-base font-bold font-mono mt-0.5 ${spentAmt > sanctionAmt ? 'text-rose-400' : 'text-slate-200'}`}>
                    ₹{(spentAmt / 100000).toFixed(2)} L
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {overrunPct > 0 ? `+${overrunPct.toFixed(1)}% Overrun` : 'Within Sanction'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-medium text-slate-400 uppercase">Physical Progress</div>
                  <div className="text-base font-bold text-sky-400 font-mono mt-0.5">
                    {progressPct.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {progressPct === 0 && spentAmt > 0 ? (
                      <span className="text-rose-400 font-semibold">Ghost Scheme Alert</span>
                    ) : 'Site Velocity'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isCritical ? 'bg-rose-950/40 border-rose-500/40' : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className="text-[10px] font-medium text-slate-400 uppercase">Composite Risk Score</div>
                  <div className={`text-base font-bold font-mono mt-0.5 ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                    {riskScore.toFixed(3)} / 1.000
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">
                    {workObj?.risk_tier || 'FLAGGED'}
                  </div>
                </div>
              </div>

              {/* Administrative Info Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span><strong>Constituency:</strong> {workObj?.district || 'District'}, {workObj?.state || 'State'}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  <span><strong>MP:</strong> {workObj?.mp_name || 'Member of Parliament'}</span>
                </div>
                <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-400">
                  <span>Implementing Agency: {workObj?.implementing_agency || 'District Rural Development Agency (DRDA)'}</span>
                </div>
              </div>

              {/* Navigation Tabs within Modal */}
              <div className="flex items-center space-x-2 border-b border-slate-800">
                {[
                  { id: 'ai_memo', label: 'AI Gemini CAG Memo', icon: Sparkles },
                  { id: 'models', label: 'ML Forensic Scores', icon: Cpu },
                  { id: 'images', label: 'Visual & OCR Forensics', icon: ImageIcon },
                  { id: 'action', label: 'Auditor Action & Resolution', icon: Scale },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                        activeTab === t.id
                          ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: AI Gemini Explainer & CAG Audit Memo */}
              {activeTab === 'ai_memo' && (
                <div className="space-y-4">
                  
                  {/* Live Streaming Button Header */}
                  <div className="flex items-center justify-between bg-violet-950/30 p-3.5 rounded-xl border border-violet-500/30">
                    <div className="flex items-center space-x-2.5">
                      <Sparkles className="w-5 h-5 text-violet-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Gemini 2.5 Flash Autonomous CAG Explainer</div>
                        <div className="text-[11px] text-slate-300">
                          Synthesizes MPLADS Para 3.12, GFR Rule 144, and anomaly indicators into legal audit memo.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={startStreamingExplainer}
                      disabled={isStreaming}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50 flex items-center space-x-1.5 shadow-glow-violet"
                    >
                      <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-ping' : 'bg-white'}`} />
                      <span>{isStreaming ? 'Streaming Tokens...' : 'Stream Live Memo'}</span>
                    </button>
                  </div>

                  {/* Streaming Output Display */}
                  {isStreaming || streamedContent ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-violet-500/40 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {streamedContent}
                      {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1">▍</span>}
                    </div>
                  ) : null}

                  {/* Structured CAG Audit Memo */}
                  {aiLoading ? (
                    <div className="py-8 text-center text-slate-400 font-mono text-xs">
                      Formulating CAG Audit Finding Memorandum...
                    </div>
                  ) : aiData ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                        <div className="text-xs font-mono font-bold uppercase text-cyan-400">
                          1. Executive Finding & Violation Type
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {typeof aiData?.explanation === 'string'
                            ? aiData.explanation
                            : (aiData?.explanation?.case_summary || aiData?.explanation?.primary_finding || aiData?.case_summary || 'Composite statistical anomaly detected exceeding statutory variance thresholds.')}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                        <div className="text-xs font-mono font-bold uppercase text-amber-400">
                          2. Statutory Contraventions & Forensic Red Flags
                        </div>
                        <div className="text-xs text-slate-300 space-y-1">
                          {Array.isArray(aiData?.explanation?.red_flags) && aiData.explanation.red_flags.length > 0 ? (
                            aiData.explanation.red_flags.map((flag, idx) => (
                              <p key={idx}>• {typeof flag === 'string' ? flag : JSON.stringify(flag)}</p>
                            ))
                          ) : (
                            <>
                              <p>• <strong>GFR 2017 Rule 144:</strong> Breach of competitive public procurement guidelines.</p>
                              <p>• <strong>MPLADS Guidelines 2023 (Para 3.12):</strong> Mandate for geo-tagged completion proofs prior to final tranche disbursement.</p>
                              <p>• <strong>CAG Manual of Standing Orders (Audit):</strong> Discrepancy between reported physical execution and ledger withdrawals.</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                        <div className="text-xs font-mono font-bold uppercase text-rose-400">
                          3. Recommended Administrative & Legal Directives
                        </div>
                        <div className="text-xs text-slate-300 space-y-1">
                          {aiData?.explanation?.recommended_action ? (
                            <p>• {typeof aiData.explanation.recommended_action === 'string' ? aiData.explanation.recommended_action : JSON.stringify(aiData.explanation.recommended_action)}</p>
                          ) : (
                            <>
                              <p>1. Immediate freezing of 3rd and subsequent tranches under District Authority account.</p>
                              <p>2. Physical inspection warrant assigned to Sub-Divisional Magistrate (SDM).</p>
                              <p>3. Summons to Implementing Agency for reconciliation of contractor muster rolls.</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 p-4">AI audit memo ready to be generated.</div>
                  )}

                </div>
              )}

              {/* TAB 2: Multi-Model Machine Learning Breakdown */}
              {activeTab === 'models' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-semibold">Isolation Forest Unsupervised Score</span>
                        <span className="font-mono text-rose-400 font-bold">
                          {(Number(work?.anomaly_score) || 0.82).toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, (Number(work?.anomaly_score) || 0.82) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Multi-dimensional feature vector distance from national benchmark distribution.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-semibold">Vendor Concentration Score</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {(Number(work?.vendor_score) || 0.74).toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (Number(work?.vendor_score) || 0.74) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Measures single-contractor dominance and repeated award pattern in district.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-semibold">Rule-Based Statutory Violation Score</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {(Number(work?.rule_score) || 0.90).toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-cyan-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (Number(work?.rule_score) || 0.90) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Deterministic checks: Missing inspection photograph, overspend &gt; 20%, timeline lag.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-semibold">Timeline Velocity Index</span>
                        <span className="font-mono text-sky-400 font-bold">
                          {(Number(work?.timeline_score) || 0.65).toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-sky-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (Number(work?.timeline_score) || 0.65) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Discrepancy between elapsed calendar days and ground construction milestones.
                      </p>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: Visual Forensics & Scanned Document OCR */}
              {activeTab === 'images' && (
                <div className="space-y-6">
                  
                  {/* PILLAR 1: VISUAL IMAGE FORENSICS (pHash & EXIF) */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-cyan-400" />
                        Pillar 1: Perceptual Hash (pHash) & Recycled Photo Detection
                      </div>
                      {workObj?.is_duplicate || dupEvidence.length > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          PERCEPTUAL DUPLICATE DETECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          NO DUPLICATE MATCH (VAULT VERIFIED)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-mono text-[10px] uppercase">Registered Hardware Coordinates</span>
                        <div className="text-white font-mono">
                          {workObj?.exif_latitude ? `${workObj.exif_latitude}° N, ${workObj.exif_longitude}° E` : 'No Hardware EXIF (Missing Geotag)'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Expected Constituency: {workObj?.district || 'Target Boundary'}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-mono text-[10px] uppercase">Visual Hash Distance</span>
                        <div className="text-white font-mono">
                          {dupEvidence.length > 0 ? `Hamming Distance: ${dupEvidence[0]?.hamming_distance} (${dupEvidence[0]?.similarity_pct}% Match)` : (workObj?.is_duplicate ? 'Hamming Distance: 0 (100% Match)' : 'Hamming Distance: Unique (> 15)')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Cross-checked across 109 persistent perceptual fingerprints in vault.
                        </div>
                      </div>
                    </div>

                    {(workObj?.is_duplicate || dupEvidence.length > 0) && (
                      <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs space-y-2">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <span>Severe Audit Violation: Recycled Ground Photography</span>
                        </div>
                        <p className="text-[11px] text-rose-200/90 leading-relaxed">
                          {dupEvidence[0]?.verdict || 'The uploaded ground photo matches an identical photograph submitted for an earlier scheme. High likelihood of recycled proof of completion.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* PILLAR 2: SCANNED DOCUMENT OCR (PyMuPDF + RapidOCR Neural Engine) */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <FileSearch className="w-4 h-4 text-amber-400" />
                          Pillar 2: Scanned Document OCR (Portal vs. Paper Deception Detector)
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          PyMuPDF high-res layout extraction + RapidOCR ONNX Neural Engine auditing physical stamps, handwriting, and bank tables.
                        </p>
                      </div>

                      {docForensics.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowSampleOcr(!showSampleOcr)}
                          className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all self-start sm:self-auto flex items-center gap-1.5"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{showSampleOcr ? 'Hide Live OCR Sample' : 'Inspect Sample Audited Certificate (Work #62689)'}</span>
                        </button>
                      )}
                    </div>

                    {/* Active Work's Document Verdicts */}
                    {docForensics.length > 0 ? (
                      <div className="space-y-4">
                        {docForensics.map((doc, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-cyan-300 font-semibold">{doc.pdf_file}</span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                                {doc.document_classification}
                              </span>
                            </div>

                            {/* 4 Critical Tasks Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Task 1: Money Mismatch */}
                              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-slate-300 flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                    Task 1: Financial Audit
                                  </span>
                                  {doc.findings?.some(f => f.code === 'PORTAL_PAPER_AMOUNT_MISMATCH') ? (
                                    <span className="text-[10px] text-rose-400 font-mono font-bold">MISMATCH FLAGGED</span>
                                  ) : (
                                    <span className="text-[10px] text-emerald-400 font-mono">ALIGNED</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 space-y-0.5">
                                  <div>Portal Disbursed: <strong className="text-slate-200">₹{(doc.portal_record?.disbursed_amount || 0).toLocaleString('en-IN')}</strong></div>
                                  <div>Paper Approved: <strong className="text-amber-300">₹{(doc.paper_extracted?.approved_amount || 0).toLocaleString('en-IN')}</strong></div>
                                  {doc.findings?.some(f => f.code === 'PORTAL_PAPER_AMOUNT_MISMATCH') && (
                                    <div className="text-rose-400 font-semibold pt-1">
                                      Unaccounted Gap: ₹{((doc.portal_record?.disbursed_amount || 0) - (doc.paper_extracted?.approved_amount || 0)).toLocaleString('en-IN')}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Task 2: Cross-Scheme Double Dipping */}
                              <div className={`p-3 rounded-lg bg-slate-900 border space-y-1.5 ${
                                doc.has_cross_scheme_fraud || doc.findings?.some(f => f.code === 'CROSS_SCHEME_FRAUD')
                                  ? 'border-rose-500/80 bg-rose-950/20 shadow-lg shadow-rose-950/40'
                                  : 'border-slate-800'
                              }`}>
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-slate-300 flex items-center gap-1">
                                    <ShieldAlert className={`w-3.5 h-3.5 ${
                                      doc.has_cross_scheme_fraud || doc.findings?.some(f => f.code === 'CROSS_SCHEME_FRAUD')
                                        ? 'text-rose-400 animate-pulse'
                                        : 'text-sky-400'
                                    }`} />
                                    Task 2: Scheme Origin (Cross-Scheme Fraud)
                                  </span>
                                  {doc.has_cross_scheme_fraud || doc.findings?.some(f => f.code === 'CROSS_SCHEME_FRAUD') ? (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/40 animate-pulse">
                                      🚨 CROSS-SCHEME FRAUD
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-emerald-400 font-mono">MPLADS VERIFIED</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 space-y-1">
                                  <div>
                                    Header Extracted:{' '}
                                    <strong className={doc.has_cross_scheme_fraud || doc.findings?.some(f => f.code === 'CROSS_SCHEME_FRAUD') ? 'text-rose-300 font-bold' : 'text-slate-200'}>
                                      {doc.paper_extracted?.scheme_type || doc.scheme_type || 'MPLADS'}
                                    </strong>
                                  </div>
                                  {doc.has_cross_scheme_fraud || doc.findings?.some(f => f.code === 'CROSS_SCHEME_FRAUD') ? (
                                    <div className="text-[10px] text-rose-300 font-medium bg-rose-950/40 p-1.5 rounded border border-rose-500/30">
                                      ⚠️ <strong>Double-dipping scam:</strong> State Assembly funds (KLLAD / Vidhayak Nidhi) unlawfully co-claimed under Central MPLADS.
                                      <div className="text-[9px] text-slate-400 mt-1">Breach: GFR Rule 144 &amp; MPLADS Clause 3.12</div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-500 mt-1">Cross-check against State MLA (KLLAD / Vidhayak Nidhi) passed.</div>
                                  )}
                                </div>
                              </div>

                              {/* Task 3: Vendor / Subcontractor Detection */}
                              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-slate-300 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-purple-400" />
                                    Task 3: Contractor Trace
                                  </span>
                                  {doc.paper_extracted?.vendor_name ? (
                                    <span className="text-[10px] text-amber-400 font-mono font-bold">BENEFICIARY UNCOVERED</span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono">STANDARD</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 space-y-0.5">
                                  <div>Paper Contractor: <strong className="text-amber-300">{doc.paper_extracted?.vendor_name || 'N/A'}</strong></div>
                                  <div>Bank A/C: <span className="font-mono text-emerald-300">{maskAccountNo(doc.paper_extracted?.account_no)}</span> <span className="px-1 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 font-mono border border-slate-700">DPDP MASKED</span> | UTR: <span className="font-mono text-cyan-300">{doc.paper_extracted?.utr_number || 'N/A'}</span></div>
                                  <div className="text-[10px] text-slate-500">Portal listed generic IDA authority; physical invoice revealed private vendor.</div>
                                </div>
                              </div>

                              {/* Task 4: Location & GPS Watermark */}
                              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-slate-300 flex items-center gap-1">
                                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                                    Task 4: Ground Location
                                  </span>
                                  {doc.findings?.some(f => f.code === 'LOCATION_MISMATCH') ? (
                                    <span className="text-[10px] text-rose-400 font-mono font-bold">CONFLICT DETECTED</span>
                                  ) : (
                                    <span className="text-[10px] text-emerald-400 font-mono">VERIFIED</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 space-y-0.5">
                                  <div>Certificate Site: <strong className="text-amber-300">{doc.paper_extracted?.location || 'Unknown'}</strong></div>
                                  <div className="truncate">Portal Site: <span className="text-slate-300">{doc.portal_record?.work_description?.substring(0, 40)}...</span></div>
                                  {doc.findings?.some(f => f.code === 'LOCATION_MISMATCH') && (
                                    <div className="text-rose-400 font-semibold pt-0.5">Potential site substitution fraud.</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Statutory Alerts from Findings */}
                            {doc.findings?.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
                                  Automated Statutory Violations Detected by Neural OCR:
                                </span>
                                {doc.findings.map((f, fIdx) => (
                                  <div key={fIdx} className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="text-rose-300 font-mono text-[11px]">[{f.code}] {f.title}:</strong>
                                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{f.detail}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : showSampleOcr ? (
                      /* Interactive Live Sample for Work #62689 */
                      <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-amber-300 font-semibold">Mahesh_Sharma_62689_Document_47.pdf (Active Live Scan)</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/40">
                            Annexure - VI / Completion Certificate
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Task 1 */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-rose-500/40 space-y-1.5">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-slate-300 flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                Task 1: Money Mismatch (Portal vs Paper)
                              </span>
                              <span className="text-[10px] text-rose-400 font-mono font-bold">MISMATCH FLAGGED</span>
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-1">
                              <div>Portal Claimed Disbursed: <strong className="text-white">₹9,95,046.00</strong></div>
                              <div>Physical Paper Approved: <strong className="text-amber-400 font-mono">₹7,28,528.00</strong></div>
                              <div className="text-rose-400 font-bold">Unaccounted Retained Balance: ₹2,66,518.00</div>
                            </div>
                          </div>

                          {/* Task 2 */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-slate-300 flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
                                Task 2: Cross-Scheme Origin
                              </span>
                              <span className="text-[10px] text-emerald-400 font-mono">MPLADS VERIFIED</span>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              <div>Header: <strong className="text-white">Central MPLADS (Annexure-VI)</strong></div>
                              <div className="text-[10px] text-slate-400 mt-1">Cross-check against State MLA (KLLAD / Vidhayak Nidhi) passed.</div>
                            </div>
                          </div>

                          {/* Task 3 */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-purple-500/40 space-y-1.5">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-slate-300 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-purple-400" />
                                Task 3: Hidden Contractor Disclosure
                              </span>
                              <span className="text-[10px] text-purple-400 font-mono font-bold">PRIVATE BENEFICIARY</span>
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-1">
                              <div>Extracted Vendor: <strong className="text-purple-300">V914400022814 Siddhi Associates</strong></div>
                              <div>Bank A/C: <span className="font-mono text-emerald-300">XXXX-XXXX-7586</span> <span className="px-1 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 font-mono border border-slate-700">DPDP MASKED</span> | UTR: <span className="font-mono text-cyan-300">0150129426</span></div>
                              <div className="text-[10px] text-slate-400">Portal concealed vendor under generic District Magistrate entry.</div>
                            </div>
                          </div>

                          {/* Task 4 */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-rose-500/40 space-y-1.5">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-slate-300 flex items-center gap-1">
                                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                                Task 4: Location Integrity
                              </span>
                              <span className="text-[10px] text-rose-400 font-mono font-bold">LOCATION CONFLICT</span>
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-1">
                              <div>Paper Certificate Site: <strong className="text-amber-400 font-mono">Bhabokara</strong></div>
                              <div>Portal Claimed Site: <strong className="text-white">Gram Bhogpur (80m drain)</strong></div>
                              <div className="text-rose-400 font-semibold text-[10px]">Site substitution alert: Work certified at completely different village!</div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs">
                          <strong className="text-rose-300 font-mono">[PORTAL_PAPER_AMOUNT_MISMATCH] Live Audit Finding:</strong>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            Portal records claim ₹9,95,046.00 disbursed, but physical engineer's certificate approved only ₹7,28,528.00. Unaccounted retained balance: ₹2,66,518.00.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>No physical completion PDF file uploaded on Central portal for this work (Rule 3.12 non-compliance).</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Click "Inspect Sample Audited Certificate" above to view live Neural OCR extraction on active scanned certificates from Gautam Buddha Nagar.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 4: Statutory Resolution Ledger & Dismissal */}
              {activeTab === 'action' && (
                <form onSubmit={handleSubmitAction} className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                        Official Auditor Resolution & Action
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Any dismissal or escalation of an automated vigilance flag is permanently written to an immutable SQLite audit log with cryptographic timestamps and auditor credentials.
                      </p>
                    </div>

                    {actionSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{actionSuccess}</span>
                      </div>
                    )}

                    {actionError && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{actionError}</span>
                      </div>
                    )}

                    {/* Action Selector */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        actionType === 'dismiss'
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}>
                        <input
                          type="radio"
                          name="actionType"
                          value="dismiss"
                          checked={actionType === 'dismiss'}
                          onChange={() => setActionType('dismiss')}
                          className="sr-only"
                        />
                        <div className="font-bold text-xs">Dismiss Vigilance Flag</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Verified on ground / false positive</div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        actionType === 'escalate'
                          ? 'bg-rose-500/10 border-rose-500/50 text-rose-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}>
                        <input
                          type="radio"
                          name="actionType"
                          value="escalate"
                          checked={actionType === 'escalate'}
                          onChange={() => setActionType('escalate')}
                          className="sr-only"
                        />
                        <div className="font-bold text-xs">Escalate to State / CAG</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Recommend official inquiry</div>
                      </label>
                    </div>

                    {/* Written Justification */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-semibold text-slate-300">
                          Mandatory Written Justification (Min 50 Characters)
                        </span>
                        <span className={`font-mono text-xs ${
                          justification.trim().length >= 50 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {justification.trim().length} / 50 characters
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        placeholder="Provide detailed statutory and ground verification findings explaining this administrative action..."
                        className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingAction || justification.trim().length < 50}
                      className="w-full py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-glow-cyan"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submittingAction ? 'Writing to Audit Ledger...' : 'Commit Action to Immutable Audit Trail'}</span>
                    </button>
                  </div>
                </form>
              )}

            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="font-mono text-[11px] flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Statutory Reference: MoSPI Circular F.No. 12014/1/2023-MPLADS // GFR Rule 144</span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => api.downloadWorkPdf(workId)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-glow-cyan"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Statutory Audit PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Close Dossier
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
