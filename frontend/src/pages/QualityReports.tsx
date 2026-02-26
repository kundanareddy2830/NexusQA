import React from 'react';
import { Download, Calendar, TrendingUp } from 'lucide-react';

const QualityReports: React.FC = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Quality Reports</h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Historical trends and exportable compliance documentation.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        <Calendar size={16} /> Last 30 Days
                    </button>
                    <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        <Download size={16} /> Generate Report PDF
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
                {/* Main Chart Area */}
                <div className="white-card" style={{ flex: 2, padding: '32px', display: 'flex', flexDirection: 'column', height: '400px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 24px 0' }}>Health Score Trend</h3>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2%', paddingBottom: '20px', borderBottom: '1px solid var(--border-light)' }}>
                        {/* Mock Chart Bars */}
                        {[65, 68, 70, 69, 74, 76, 80, 81, 79, 82, 84, 84, 86, 88].map((val, i) => (
                            <div key={i} style={{
                                flex: 1, background: val > 80 ? 'var(--accent-teal)' : val > 70 ? 'var(--accent-blue)' : 'var(--status-warning)',
                                height: `${val}%`, borderRadius: '4px 4px 0 0', opacity: 0.8,
                                transition: 'opacity 0.2s, transform 0.2s'
                            }}
                                onMouseOver={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                                onMouseOut={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'translateY(0)' }}
                            ></div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                        <span>Feb 1</span>
                        <span>Feb 15</span>
                        <span>Today</span>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="white-card" style={{ padding: '24px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', borderRadius: '8px' }}>
                                <TrendingUp size={20} />
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Improvements</h3>
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>+12%</div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Overall application health improved significantly over the last 30 days.</p>
                    </div>

                    <div className="white-card" style={{ padding: '24px', flex: 1 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0' }}>Recent Exports</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {['Weekly Compliance (Feb 21)', 'Security Audit Pre-Check', 'Monthly Quality Rollup'].map((doc, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500 }}>
                                    <span>{doc}</span>
                                    <Download size={14} style={{ color: 'var(--accent-blue)', cursor: 'pointer' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default QualityReports;
