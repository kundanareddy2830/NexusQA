import React from 'react';
import HealthScoreCard from '../components/HealthScoreCard';
import StructuralOverview from '../components/StructuralOverview';
import InsightsSection from '../components/InsightsSection';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Zap, Search, Shield } from 'lucide-react';

// Real scan data panel — reads from /api/stats
const RealActivityPanel: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = React.useState<any>(null);
    React.useEffect(() => {
        fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => { });
    }, []);

    const sev = stats?.severity_breakdown;
    const hasData = stats && stats.total_states > 0;

    return (
        <div className="white-card" style={{ flex: 1, padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><Shield size={20} /></div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Scan Intelligence</h3>
            </div>
            {!hasData ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '20px 0' }}>
                    <Zap size={32} color="#cbd5e1" />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', margin: 0 }}>No scan data yet.<br />Run Agent 1 to start.</p>
                    <button onClick={() => {
                        localStorage.removeItem('nexusqa_last_scan');
                        navigate('/dashboard/agent/discovery');
                    }}
                        style={{ marginTop: '4px', padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg,#3b82f6,#14b8a6)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                        Start Discovery →
                    </button>
                </div>
            ) : (
                <>
                    {/* Summary row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{stats.total_states}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>States Mapped</div>
                        </div>
                        <div style={{ padding: '14px', borderRadius: '12px', background: stats.total_issues > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${stats.total_issues > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stats.total_issues > 0 ? '#ef4444' : '#10b981', lineHeight: 1 }}>{stats.total_issues}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Issues Found</div>
                        </div>
                    </div>
                    {/* Severity */}
                    {sev && [
                        { key: 'CRITICAL', color: '#ef4444', icon: '🚨' },
                        { key: 'HIGH', color: '#f97316', icon: '🔴' },
                        { key: 'MEDIUM', color: '#f59e0b', icon: '🟡' },
                        { key: 'LOW', color: '#64748b', icon: '🔵' },
                    ].map(s => sev[s.key] > 0 && (
                        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                            <span style={{ fontSize: '0.9rem' }}>{s.icon}</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: s.color, flex: 1 }}>{s.key}</span>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{sev[s.key]}</span>
                        </div>
                    ))}
                    {/* CTA */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        {stats.total_issues === 0 ? (
                            <button onClick={() => navigate('/dashboard/agent/inspector')}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                🕵️ Run Inspector →
                            </button>
                        ) : (
                            <button onClick={() => navigate('/dashboard/agent/strategist')}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg,#f97316,#8b5cf6)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                📊 View Risk Report →
                            </button>
                        )}
                        <button onClick={() => navigate('/dashboard/issues')}
                            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#334155', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                            Issues Log
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const DashboardHome: React.FC = () => {
    const { isAnalyzed } = useOutletContext<{ isAnalyzed: boolean, handleAnalyze: (url: string) => void }>();
    const [url, setUrl] = React.useState('');
    const navigate = useNavigate();

    if (!isAnalyzed) {
        return (
            <div className="white-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                    <Zap size={36} />
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Awaiting Application URL</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', lineHeight: 1.6, margin: '0 0 32px 0' }}>
                    Enter the URL of the web application you want to analyze below. NexusQA will automatically explore, test, and score it.
                </p>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%', maxWidth: '700px', flexWrap: 'nowrap' }}>
                    <div className="input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 auto', minWidth: '300px' }}>
                        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
                        <input
                            type="text"
                            placeholder="Enter Web Application URL"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 16px 14px 42px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-strong)',
                                background: 'white',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--accent-blue)';
                                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--border-strong)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <button
                        className="btn-primary"
                        style={{ padding: '14px 28px', fontSize: '1rem', opacity: url ? 1 : 0.5, cursor: url ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto', whiteSpace: 'nowrap' }}
                        onClick={() => {
                            if (url) {
                                localStorage.removeItem('nexusqa_last_scan');
                                navigate(`/dashboard/agent/discovery?url=${encodeURIComponent(url)}`);
                            }
                        }}
                        disabled={!url}
                    >
                        <Zap size={18} />
                        Analyze Application
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Top Row: Health Score & Map */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
                <HealthScoreCard />
                <StructuralOverview />
            </div>

            {/* Bottom Row: Insights */}
            <div style={{ display: 'flex', gap: '24px' }}>
                <InsightsSection />
                <RealActivityPanel />
            </div>
        </>
    );
};

export default DashboardHome;
