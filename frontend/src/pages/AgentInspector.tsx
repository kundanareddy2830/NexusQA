import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Eye, Cpu, Layers, Activity, CheckCircle, RotateCcw, TrendingUp, AlertTriangle } from 'lucide-react';

interface LogEntry { level: string; message: string; ts: string; }
interface IssueCounts { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number; total: number; }
interface ScanStats { total_states: number; total_issues: number; severity_breakdown: IssueCounts; }

const LAYERS = [
    { name: 'Structural Integrity',     icon: <Layers size={16} />,   color: '#3b82f6', desc: 'Dead-ends, broken forms, auth leakage' },
    { name: 'Functional Behavior',      icon: <Zap size={16} />,      color: '#8b5cf6', desc: 'Missing triggers, blank states' },
    { name: 'Visual & Accessibility',   icon: <Eye size={16} />,      color: '#14b8a6', desc: 'Orphaned inputs, ARIA gaps' },
    { name: 'Performance Intelligence', icon: <Cpu size={16} />,      color: '#f97316', desc: 'DOM bloat, slow APIs, JS crashes' },
    { name: 'Hygiene & UX Health',      icon: <Activity size={16} />, color: '#10b981', desc: 'Link bloat, copy hygiene' },
];

const SEV_CONFIG = {
    CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Critical',  icon: '🚨' },
    HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', label: 'High',     icon: '🔴' },
    MEDIUM:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'Medium',   icon: '🟡' },
    LOW:      { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', label: 'Low',    icon: '🔵' },
};

const AgentInspector: React.FC = () => {
    const navigate = useNavigate();

    const [logs,        setLogs]        = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isRunning,   setIsRunning]   = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [counts,      setCounts]      = useState<IssueCounts>({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 });
    const [currentPage, setCurrentPage] = useState('');
    const [pagesScanned, setPagesScanned] = useState(0);
    const [stats,       setStats]       = useState<ScanStats | null>(null);
    const [topIssues,   setTopIssues]   = useState<any[]>([]);

    const wsRef      = useRef<WebSocket | null>(null);
    const logRef     = useRef<HTMLDivElement>(null);
    const countsRef  = useRef<IssueCounts>({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 });
    const startedRef = useRef(false);

    // Load final stats on completion
    useEffect(() => {
        if (!isCompleted) return;
        fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
        fetch('/api/issues').then(r => r.json()).then(d => setTopIssues(d.slice(0, 6))).catch(() => {});
    }, [isCompleted]);

    // WebSocket
    useEffect(() => {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${proto}://localhost:8000/api/ws/agent`);
        wsRef.current = ws;
        ws.onopen  = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        ws.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.type !== 'log') return;
                const entry: LogEntry = { level: d.level || 'info', message: d.message, ts: new Date().toLocaleTimeString() };
                setLogs(prev => [...prev.slice(-399), entry]);
                if (d.message?.includes('Inspecting:')) {
                    setCurrentPage(d.message.replace('🔎 Inspecting: ', '').trim());
                    setPagesScanned(prev => prev + 1);
                }
                const sev = Object.keys(SEV_CONFIG).find(s => d.message?.includes(`[${s}]`));
                if (sev) {
                    countsRef.current = { ...countsRef.current, [sev]: (countsRef.current as any)[sev] + 1, total: countsRef.current.total + 1 };
                    setCounts({ ...countsRef.current });
                }
                if (d.level === 'success' && d.message?.includes('Agent 2 finished')) {
                    setIsRunning(false);
                    setIsCompleted(true);
                }
            } catch {}
        };
        return () => ws.close();
    }, []);

    useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

    const handleStart = async () => {
        if (isRunning || startedRef.current) return;
        startedRef.current = true;
        setIsRunning(true);
        setLogs([{ level: 'info', message: '🕵️ Connecting to Agent 2 (5-Layer Inspector)...', ts: new Date().toLocaleTimeString() }]);
        try {
            const res = await fetch('/api/agent2/start', { method: 'POST' });
            if (!res.ok) {
                const err = await res.json();
                setLogs(prev => [...prev, { level: 'error', message: `❌ ${err.detail}`, ts: new Date().toLocaleTimeString() }]);
                setIsRunning(false);
                startedRef.current = false;
            }
        } catch (e) {
            setLogs(prev => [...prev, { level: 'error', message: `Cannot reach backend`, ts: new Date().toLocaleTimeString() }]);
            setIsRunning(false);
            startedRef.current = false;
        }
    };

    const handleRescan = () => {
        setIsCompleted(false);
        setLogs([]);
        setPagesScanned(0);
        setCurrentPage('');
        countsRef.current = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };
        setCounts({ ...countsRef.current });
        startedRef.current = false;
    };

    // ── COMPLETION SCREEN ──────────────────────────────────────────────────────
    if (isCompleted) {
        const totalIssues = stats?.total_issues ?? 0;
        const sev = stats?.severity_breakdown;

        return (
            <div style={{ flex: 1, overflow: 'auto', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #f8fafc 100%)', padding: '40px 48px' }}>

                {/* ── HEADER ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(139,92,246,0.35)', flexShrink: 0 }}>
                        <Shield size={38} color="white" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>5-Layer Inspection Complete</h1>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '1rem' }}>
                            Agent 2 mapped <strong style={{ color: '#8b5cf6' }}>{totalIssues} issues</strong> across {stats?.total_states ?? '—'} states using AI-powered vulnerability scanning.
                        </p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                        <button onClick={handleRescan} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                            <RotateCcw size={15} /> Re-inspect
                        </button>
                        <button onClick={() => navigate('/dashboard/agent/strategist')} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(139,92,246,0.4)' }}>
                            <TrendingUp size={15} /> Run Risk Analysis (Agent 3) →
                        </button>
                    </div>
                </div>

                {/* ── SEVERITY STRIP ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {(Object.entries(SEV_CONFIG) as [string, typeof SEV_CONFIG.CRITICAL][]).map(([key, cfg]) => (
                        <div key={key} style={{ background: 'white', borderRadius: '16px', padding: '22px 24px', border: `1px solid ${cfg.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '12px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{cfg.icon}</div>
                            <div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: cfg.color, lineHeight: 1 }}>{(sev as any)?.[key] ?? '—'}</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{cfg.label} Issues</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── MAIN GRID ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>

                    {/* Top issues table */}
                    <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <AlertTriangle size={18} color="#f97316" />
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Top Issues Detected</h3>
                            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Sorted by severity</span>
                        </div>
                        {topIssues.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading issues…</p>
                        ) : topIssues.map((issue, i) => {
                            const cfg = SEV_CONFIG[issue.severity?.toUpperCase() as keyof typeof SEV_CONFIG] || SEV_CONFIG.LOW;
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: i < topIssues.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <span style={{ padding: '3px 9px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color, flexShrink: 0, marginTop: '2px' }}>{cfg.label}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{issue.type}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.location}</div>
                                        {issue.ai_insight && (
                                            <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '4px', fontStyle: 'italic', lineHeight: 1.4 }}>💡 {issue.ai_insight?.replace('AI Insight: ', '')?.slice(0, 120)}{issue.ai_insight?.length > 120 ? '…' : ''}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right sidebar: 5 layers + next actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* 5 layers */}
                        <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>Inspection Layers</h3>
                            {LAYERS.map((l, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < LAYERS.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '8px', background: `${l.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: l.color, flexShrink: 0 }}>{l.icon}</div>
                                    <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>{l.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{l.desc}</div>
                                    </div>
                                    <CheckCircle size={16} color="#10b981" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                                </div>
                            ))}
                        </div>

                        {/* Action buttons */}
                        <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Next Steps</h3>
                            {[
                                { label: '📊 Full Issues Log',     path: '/dashboard/issues',            color: '#ef4444' },
                                { label: '🔗 Knowledge Graph',     path: '/dashboard/knowledge-graph',   color: '#3b82f6' },
                                { label: '🏠 Dashboard',           path: '/dashboard',                   color: '#14b8a6' },
                            ].map((a, i) => (
                                <button key={i} onClick={() => navigate(a.path)}
                                    style={{ width: '100%', marginBottom: i < 2 ? '8px' : 0, padding: '11px 16px', borderRadius: '10px', border: `1px solid ${a.color}25`, background: `${a.color}08`, color: a.color, fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── RUNNING SCREEN ─────────────────────────────────────────────────────────
    const logColor: Record<string, string> = { error: '#ef4444', warning: '#f97316', success: '#10b981', info: '#64748b' };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #f8fafc 100%)', overflow: 'hidden' }}>
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 32px', background: 'white', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>← Back</button>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={18} color="white" />
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Agent 2 — The Inspector</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>5-Layer Vulnerability Analysis + AI Business Insights</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: isConnected ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', display: 'inline-block', boxShadow: isConnected ? '0 0 8px #10b981' : 'none' }} />
                    {isConnected ? 'Connected' : 'Disconnected'}
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '24px', gap: '24px' }}>
                {/* Left: log + start button */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    {/* Current page banner */}
                    {currentPage && (
                        <div style={{ padding: '10px 20px', background: 'linear-gradient(90deg, rgba(139,92,246,0.06), rgba(99,102,241,0.04))', borderBottom: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6', display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#8b5cf6', fontFamily: 'monospace', fontWeight: 600 }}>🔎 {currentPage}</span>
                        </div>
                    )}
                    <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', fontFamily: 'monospace', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {logs.length === 0 && !isRunning ? (
                            <div style={{ margin: 'auto', textAlign: 'center', padding: '40px 20px' }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #eff6ff, #f0fdfa)', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <Shield size={36} color="#8b5cf6" />
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>5-Layer Inspection Engine</h3>
                                <p style={{ color: '#64748b', marginBottom: '28px', lineHeight: 1.6, maxWidth: 420, margin: '0 auto 28px' }}>
                                    Scans every discovered page for structural, functional, accessibility, performance, and hygiene vulnerabilities — then uses <strong>Groq AI</strong> to generate executive business insights.
                                </p>
                                <button onClick={handleStart} disabled={!isConnected}
                                    style={{ padding: '14px 36px', borderRadius: '12px', background: isConnected ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : '#e2e8f0', border: 'none', color: isConnected ? 'white' : '#94a3b8', fontWeight: 700, fontSize: '1rem', cursor: isConnected ? 'pointer' : 'not-allowed', boxShadow: isConnected ? '0 4px 20px rgba(139,92,246,0.4)' : 'none', fontFamily: 'Inter, sans-serif' }}>
                                    {isConnected ? '🕵️ Start 5-Layer Inspection' : 'Waiting for WebSocket…'}
                                </button>
                                {/* Layer legend */}
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '32px' }}>
                                    {LAYERS.map((l, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: `${l.color}0f`, border: `1px solid ${l.color}25` }}>
                                            <span style={{ color: l.color }}>{l.icon}</span>
                                            <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{l.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : logs.map((l, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', padding: '1px 0' }}>
                                <span style={{ color: '#cbd5e1', flexShrink: 0, fontSize: '0.72rem', paddingTop: '1px' }}>{l.ts}</span>
                                <span style={{ color: logColor[l.level] || '#94a3b8' }}>{l.message}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: live counters */}
                <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Pages scanned */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{pagesScanned}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>Pages Inspected</div>
                        {isRunning && <div style={{ width: '100%', height: '3px', background: '#f1f5f9', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '2px', animation: 'slideRight 1.5s ease-in-out infinite', width: '40%' }} />
                        </div>}
                    </div>
                    {/* Severity counters */}
                    {(Object.entries(SEV_CONFIG) as [string, typeof SEV_CONFIG.CRITICAL][]).map(([key, cfg]) => (
                        <div key={key} style={{ background: 'white', borderRadius: '14px', padding: '16px 18px', border: `1px solid ${cfg.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                            </div>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: cfg.color, lineHeight: 1 }}>{(counts as any)[key]}</span>
                        </div>
                    ))}
                    {/* Total */}
                    <div style={{ background: 'linear-gradient(135deg, #8b5cf608, #6366f108)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(139,92,246,0.15)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Total Issues</div>
                        <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>{counts.total}</div>
                    </div>
                    <style>{`@keyframes slideRight { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }`}</style>
                </div>
            </div>
        </div>
    );
};

export default AgentInspector;
