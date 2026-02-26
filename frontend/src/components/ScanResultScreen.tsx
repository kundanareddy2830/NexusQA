import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Map, AlertTriangle, LayoutDashboard, RotateCcw, Shield, GitBranch, Layers } from 'lucide-react';

interface ScanStats {
    health_score: number;
    total_states: number;
    total_issues: number;
    severity_breakdown: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number };
    total_connections: number;
    page_types: Record<string, number>;
    auth_detected: boolean;
}

interface ScanResultScreenProps {
    targetUrl: string;
    logLines: { level: string; message: string }[];
    onScanAgain: () => void;
}

const ScanResultScreen: React.FC<ScanResultScreenProps> = ({ targetUrl, onScanAgain }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<ScanStats | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/stats').then(r => r.json()).catch(() => ({})),
            fetch('/api/graph').then(r => r.json()).catch(() => ({ nodes: [], connections: [] })),
        ]).then(([statsData, graphData]) => {
            const nodes: any[] = graphData.nodes || [];
            const pageTypes: Record<string, number> = {};
            let authDetected = false;
            nodes.forEach((n: any) => {
                const t = n.label || 'UNKNOWN';
                pageTypes[t] = (pageTypes[t] || 0) + 1;
                // Check label, intent, or URL for auth-related content
                const combined = `${n.label} ${n.intent} ${n.url}`.toLowerCase();
                if (/login|auth|sign.?in|sign.?up|register|logout|password|credential/.test(combined)) {
                    authDetected = true;
                }
            });
            setStats({
                health_score: statsData.health_score ?? 100,
                total_states: statsData.total_states ?? nodes.length,
                total_issues: statsData.total_issues ?? 0,
                severity_breakdown: statsData.severity_breakdown ?? { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
                total_connections: graphData.connections?.length ?? 0,
                page_types: pageTypes,
                auth_detected: authDetected,
            });
        });
    }, []);


    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto',
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #f8fafc 100%)',
            padding: '40px 48px',
        }}>
            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
                    flexShrink: 0,
                }}>
                    <CheckCircle size={38} color="white" strokeWidth={2} />
                </div>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                        Mapping Complete
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '1rem' }}>
                        Scan finished for <strong style={{ color: '#3b82f6' }}>{targetUrl}</strong>
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onScanAgain}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '10px 20px', borderRadius: '8px',
                            border: '1px solid #cbd5e1', background: 'white',
                            color: '#334155', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                        }}
                    >
                        <RotateCcw size={16} /> Scan Again
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '10px 22px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #3b82f6, #14b8a6)',
                            border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
                        }}
                    >
                        <LayoutDashboard size={16} /> View Full Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/dashboard/topology')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '10px 20px', borderRadius: '8px',
                            background: 'rgba(99,102,241,0.12)',
                            border: '1px solid rgba(99,102,241,0.4)',
                            color: '#818cf8', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                        }}
                    >
                        🔗 View Topology Map
                    </button>
                    <button
                        onClick={() => navigate('/dashboard/agent/inspector')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '10px 24px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(139,92,246,0.45)',
                        }}
                    >
                        🕵️ Run Inspector (Agent 2) →
                    </button>
                </div>
            </div>

            {/* ── METRICS ROW ───────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {[
                    { icon: <Layers size={22} />, label: 'States Mapped', value: stats?.total_states ?? '—', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                    { icon: <GitBranch size={22} />, label: 'Links Found', value: stats?.total_connections ?? '—', color: '#14b8a6', bg: 'rgba(20,184,166,0.08)' },
                    { icon: <AlertTriangle size={22} />, label: 'Issues Found', value: stats?.total_issues ?? '—', color: stats?.total_issues ? '#ef4444' : '#10b981', bg: stats?.total_issues ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)' },
                    { icon: <Shield size={22} />, label: 'Critical', value: stats?.severity_breakdown.CRITICAL ?? '—', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                    { icon: <Shield size={22} />, label: 'High', value: stats?.severity_breakdown.HIGH ?? '—', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
                    { icon: <Map size={22} />, label: 'Auth Detected', value: stats?.auth_detected ? 'Yes' : 'No', color: stats?.auth_detected ? '#10b981' : '#8b5cf6', bg: stats?.auth_detected ? 'rgba(16,185,129,0.08)' : 'rgba(139,92,246,0.08)' },
                ].map((m, i) => (
                    <div key={i} style={{
                        background: 'white', borderRadius: '16px', padding: '20px',
                        border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                    }}>
                        <div style={{ color: m.color, background: m.bg, width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {m.icon}
                        </div>
                        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{m.value}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{m.label}</div>
                    </div>
                ))}
            </div>

            {/* ── BOTTOM ROW: Page Type Breakdown + Quick Actions ────────── */}
            <div style={{ display: 'flex', gap: '24px' }}>

                {/* Page Types */}
                <div style={{
                    flex: 2, background: 'white', borderRadius: '20px', padding: '28px',
                    border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px', color: '#0f172a' }}>Page Type Breakdown</h3>
                    {stats && Object.keys(stats.page_types).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Object.entries(stats.page_types)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 8)
                                .map(([type, count]) => {
                                    const pct = stats.total_states > 0 ? Math.round((count / stats.total_states) * 100) : 0;
                                    return (
                                        <div key={type}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{type}</span>
                                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{count} <span style={{ opacity: 0.6 }}>({pct}%)</span></span>
                                            </div>
                                            <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: '4px',
                                                    background: 'linear-gradient(90deg, #3b82f6, #14b8a6)',
                                                    width: `${pct}%`,
                                                    transition: 'width 0.8s ease',
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        <p style={{ color: '#94a3b8', margin: 0 }}>Connect Neo4j to see page type breakdown.</p>
                    )}
                </div>

                {/* Quick Actions */}
                <div style={{
                    flex: 1, background: 'white', borderRadius: '20px', padding: '28px',
                    border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>Explore Results</h3>
                    {[
                        { label: 'Full Dashboard', desc: 'Health overview & insights', path: '/dashboard', color: '#3b82f6' },
                        { label: 'Structure Map', desc: 'Visual graph of all states', path: '/dashboard/structure', color: '#14b8a6' },
                        { label: 'Issues Log', desc: `${stats?.total_issues ?? 0} issues detected`, path: '/dashboard/issues', color: '#ef4444' },
                        { label: 'Quality Reports', desc: 'Detailed QA analysis', path: '/dashboard/reports', color: '#8b5cf6' },
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(action.path)}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                padding: '14px 16px', borderRadius: '12px',
                                border: `1px solid ${action.color}22`,
                                background: `${action.color}08`,
                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${action.color}15`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${action.color}08`; }}
                        >
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: action.color }}>{action.label}</span>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{action.desc}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ScanResultScreen;

