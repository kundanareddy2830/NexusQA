import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertOctagon, Target, GitBranch, Layers, Shield, LayoutDashboard, AlertCircle, RotateCcw } from 'lucide-react';

interface RiskReport {
    hygiene_score: number;
    overall_risk_score: number;
    raw_risk: number;
    rci: number;
    intent_ratios: { authentication: number; transactional: number; public: number };
    systemic_weaknesses: { intent: string; type: string; count: number; spread: number; description: string }[];
    cross_layer_nodes: { url: string; layers: string[] }[];
    exploitation_paths: { url: string; incoming_edges: number }[];
}

const getHygieneTheme = (score: number) => {
    if (score < 40) return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Critical Risk',    badge: '#fef2f2' };
    if (score < 75) return { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', label: 'Elevated Concern', badge: '#fff7ed' };
    return               { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  label: 'Healthy Posture', badge: '#f0fdf4' };
};

// Semi-circle gauge using SVG
const RiskGauge: React.FC<{ score: number }> = ({ score }) => {
    const theme = getHygieneTheme(score);
    const W = 240, H = 140;
    const cx = W / 2, cy = H - 10;
    const r = 100;
    // Arc from 180° to 0° (left to right across top)
    const toRad = (d: number) => (d * Math.PI) / 180;
    const angle = 180 - (score / 100) * 180; // degrees from left
    const endX = cx + r * Math.cos(toRad(angle));
    const endY = cy - r * Math.sin(toRad(angle));

    return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
            {/* Track */}
            <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
            {/* Gradient fill */}
            <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
            </defs>
            <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${endX} ${endY}`} fill="none" stroke={`url(#gaugeGrad)`} strokeWidth="14" strokeLinecap="round" style={{ transition: 'all 1.4s ease' }} />
            {/* Needle dot */}
            <circle cx={endX} cy={endY} r="7" fill={theme.color} stroke="white" strokeWidth="3" style={{ transition: 'all 1.4s ease' }} />
            {/* Score text */}
            <text x={cx} y={cy - 20} textAnchor="middle" fontSize="40" fontWeight="800" fill={theme.color} fontFamily="Inter, sans-serif">{Math.round(score)}</text>
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="12" fill="#94a3b8" fontFamily="Inter, sans-serif">/ 100</text>
        </svg>
    );
};

// Horizontal bar for intent ratios
const IntentBar: React.FC<{ label: string; value: number; color: string; warn?: boolean }> = ({ label, value, color, warn }) => (
    <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {warn && <span style={{ color: '#ef4444' }}>⚠️</span>}{label}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color }}>{value}%</span>
        </div>
        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '4px', transition: 'width 1.4s ease' }} />
        </div>
    </div>
);

const AgentStrategist: React.FC = () => {
    const navigate = useNavigate();
    const [report,  setReport]  = useState<RiskReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    const fetchReport = () => {
        setLoading(true); setError('');
        fetch('/api/agent3/start', { method: 'POST' })
            .then(r => { if (!r.ok) throw new Error('No data found. Run Agent 1 + Agent 2 first.'); return r.json(); })
            .then(d => { setReport(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    };

    useEffect(() => { fetchReport(); }, []);

    if (loading) return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #f8fafc 100%)', gap: '20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(139,92,246,0.3)' }}>
                <TrendingUp size={30} color="white" />
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>Running Strategic Risk Analysis…</div>
            <div style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Calculating Risk Concentration Index, exploitation paths, and systemic weaknesses</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
            </div>
            <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #f8fafc 100%)', gap: '16px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertOctagon size={28} color="#ef4444" />
            </div>
            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '1rem' }}>{error}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
                <button onClick={fetchReport}        style={{ padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
            </div>
        </div>
    );

    const r = report!;
    const theme = getHygieneTheme(r.hygiene_score);

    return (
        <div style={{ flex: 1, overflow: 'auto', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #f8fafc 100%)', padding: '40px 48px' }}>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(249,115,22,0.3)', flexShrink: 0 }}>
                    <TrendingUp size={38} color="white" strokeWidth={2} />
                </div>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Executive Risk Report</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '1rem' }}>Agent 3 strategic analysis — topology-aware risk scoring with AI-powered exploitation detection.</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                    <button onClick={fetchReport} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#334155', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}>
                        <RotateCcw size={14} /> Recompute
                    </button>
                    <button onClick={() => navigate('/dashboard/issues')} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #14b8a6)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
                        <LayoutDashboard size={14} /> View Full Dashboard
                    </button>
                </div>
            </div>

            {/* ── ROW 1: Risk Score + Intent Ratios + RCI ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 1fr', gap: '24px', marginBottom: '24px' }}>

                {/* Risk Gauge Card */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: `1px solid ${theme.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'flex-start' }}>System Hygiene Score</div>
                    <RiskGauge score={r.hygiene_score} />
                    <div style={{ padding: '8px 20px', borderRadius: '999px', background: theme.bg, border: `1px solid ${theme.border}` }}>
                        <span style={{ color: theme.color, fontWeight: 700, fontSize: '0.9rem' }}>{theme.label}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                        Raw risk index: <strong style={{ color: '#334155' }}>{r.raw_risk}</strong> (Limit: 100)
                    </div>
                </div>

                {/* Intent Ratios */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
                        <Shield size={16} color="#8b5cf6" />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Attack Surface Distribution</span>
                    </div>
                    <IntentBar label="Authentication" value={r.intent_ratios.authentication} color="#ef4444" warn={r.intent_ratios.authentication > 50} />
                    <IntentBar label="Transactional"  value={r.intent_ratios.transactional}  color="#f97316" />
                    <IntentBar label="Public / Info"  value={r.intent_ratios.public}          color="#3b82f6" />
                    {r.intent_ratios.authentication > 50 && (
                        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>
                            🔴 Auth attack surface is disproportionately exposed. Immediate review required.
                        </div>
                    )}
                </div>

                {/* RCI */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <Target size={16} color="#f97316" />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Risk Concentration Index</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '3.8rem', fontWeight: 800, lineHeight: 1, color: r.rci > 0.6 ? '#ef4444' : '#10b981' }}>{r.rci}</span>
                        <span style={{ color: '#94a3b8', marginBottom: '8px', fontSize: '0.85rem' }}>/ 1.0</span>
                    </div>
                    <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden', marginBottom: '14px' }}>
                        <div style={{ height: '100%', width: `${r.rci * 100}%`, background: r.rci > 0.6 ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, #10b981, #14b8a6)', borderRadius: '5px', transition: 'width 1.4s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.55 }}>
                        {r.rci > 0.6
                            ? `⚠️ ${Math.round(r.rci * 100)}% of total risk is concentrated in the top 20% of endpoints — a high-value cluster for attackers.`
                            : '✅ Risk is evenly distributed. No dangerous concentration detected.'}
                    </div>
                </div>
            </div>

            {/* ── ROW 2: Exploitation Paths + Systemic Weaknesses ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

                {/* Exploitation Paths */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GitBranch size={15} color="#ef4444" />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>High-Value Exploitation Hubs</span>
                        <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: '999px', background: r.exploitation_paths.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', color: r.exploitation_paths.length > 0 ? '#ef4444' : '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                            {r.exploitation_paths.length} found
                        </span>
                    </div>
                    {r.exploitation_paths.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderRadius: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                            <span style={{ fontSize: '1.2rem' }}>✅</span>
                            <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>No high-centrality exploitation paths detected.</span>
                        </div>
                    ) : r.exploitation_paths.map((ep, i) => (
                        <div key={i} style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ padding: '3px 10px', borderRadius: '999px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>🎯 {ep.incoming_edges} incoming routes</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' }}>{ep.url}</div>
                        </div>
                    ))}
                </div>

                {/* Systemic Weaknesses */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertCircle size={15} color="#8b5cf6" />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Systemic Weaknesses</span>
                        <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: '999px', background: r.systemic_weaknesses.length > 0 ? 'rgba(139,92,246,0.08)' : 'rgba(16,185,129,0.08)', color: r.systemic_weaknesses.length > 0 ? '#8b5cf6' : '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                            {r.systemic_weaknesses.length} detected
                        </span>
                    </div>
                    {r.systemic_weaknesses.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderRadius: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                            <span style={{ fontSize: '1.2rem' }}>✅</span>
                            <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>No systemic lateral weaknesses detected.</span>
                        </div>
                    ) : r.systemic_weaknesses.map((sw, i) => (
                        <div key={i} style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.12)', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#6366f1' }}>{sw.type}</span>
                                <span style={{ padding: '2px 9px', borderRadius: '999px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>×{sw.count} across {sw.spread} endpoints</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{sw.intent} — {sw.description?.slice(0, 90)}{sw.description?.length > 90 ? '…' : ''}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── ROW 3: Cross-layer nodes (if any) ── */}
            {r.cross_layer_nodes.length > 0 && (
                <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers size={15} color="#f59e0b" />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Cross-Layer Amplification</span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: 'auto' }}>Issues spanning 3+ layers = compounded compound risk</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                        {r.cross_layer_nodes.map((n, i) => (
                            <div key={i} style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                <div style={{ fontSize: '0.78rem', color: '#334155', fontFamily: 'monospace', marginBottom: '8px', wordBreak: 'break-all' }}>{n.url}</div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {n.layers.map(l => <span key={l} style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700 }}>{l.replace(' Layer', '')}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── FOOTER: Quick nav ── */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => navigate(-1)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>← Back to Inspector</button>
                <button onClick={() => navigate('/dashboard/knowledge-graph')} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#6366f1', fontWeight: 700, cursor: 'pointer' }}>🔗 Knowledge Graph</button>
                <button onClick={() => navigate('/dashboard/issues')} style={{ padding: '10px 22px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #14b8a6)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>📊 Full Issues Log →</button>
            </div>
        </div>
    );
};

export default AgentStrategist;
