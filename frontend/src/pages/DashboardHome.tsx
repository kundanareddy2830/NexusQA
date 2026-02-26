import React from 'react';
import HealthScoreCard from '../components/HealthScoreCard';
import StructuralOverview from '../components/StructuralOverview';
import InsightsSection from '../components/InsightsSection';
import { useOutletContext } from 'react-router-dom';
import { Zap, Search } from 'lucide-react';

const DashboardHome: React.FC = () => {
    const { isAnalyzed, handleAnalyze } = useOutletContext<{ isAnalyzed: boolean, handleAnalyze: (url: string) => void }>();
    const [url, setUrl] = React.useState('');

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
                            if (url && handleAnalyze) handleAnalyze(url);
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

                {/* Secondary content column next to insights */}
                <div className="white-card" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Recent Activity</h3>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>2 hours ago</div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Full scan completed on production environment</div>
                        <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.85rem' }}>Found 3 issues across 42 surveyed paths.</div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yesterday</div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Resolved 2 critical structure issues on billing page</div>
                        <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.85rem' }}>Triggered by manual intervention.</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DashboardHome;
