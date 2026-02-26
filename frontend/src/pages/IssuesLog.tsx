import React from 'react';
import { AlertTriangle, Filter, Bug, LayoutTemplate, Link2Off, EyeOff } from 'lucide-react';

const IssuesLog: React.FC = () => {
    const issues = [
        { id: 'ISS-001', severity: 'Critical', type: 'Broken Flow', location: '/checkout/payment', title: 'Payment completely unreachable from cart', age: '2 hours ago', icon: <Link2Off size={18} />, color: 'var(--status-danger)' },
        { id: 'ISS-002', severity: 'High', type: 'Console Error', location: '/dashboard', title: 'TypeError: Cannot read properties of undefined (reading "map")', age: '5 hours ago', icon: <Bug size={18} />, color: 'var(--status-danger)' },
        { id: 'ISS-003', severity: 'Medium', type: 'UI Spacing', location: '/settings/profile', title: 'Save button overlaps with input field on mobile viewport', age: '1 day ago', icon: <LayoutTemplate size={18} />, color: 'var(--status-warning)' },
        { id: 'ISS-004', severity: 'Medium', type: 'Dead End', location: '/docs/api-v2', title: 'Documentation link leads to empty 404 block', age: '1 day ago', icon: <EyeOff size={18} />, color: 'var(--status-warning)' },
        { id: 'ISS-005', severity: 'Low', type: 'Accessibility', location: '/login', title: 'Contrast ratio on secondary buttons falls below WCAG AA', age: '2 days ago', icon: <AlertTriangle size={18} />, color: 'var(--accent-blue)' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Issues Log</h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>All discovered anomalies, prioritized by risk.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <input type="text" placeholder="Search issues..." style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-strong)', outline: 'none' }} />
                    </div>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        <Filter size={16} /> Filters
                    </button>
                </div>
            </div>

            {/* Issues List */}
            <div className="white-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px 120px 150px 2fr 1fr 120px', padding: '16px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-tertiary)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div>ID</div>
                    <div>Severity</div>
                    <div>Type</div>
                    <div>Description</div>
                    <div>Location</div>
                    <div style={{ textAlign: 'right' }}>Discovered</div>
                </div>

                {/* Table Body */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {issues.map((issue) => (
                        <div key={issue.id} style={{
                            display: 'grid', gridTemplateColumns: '100px 120px 150px 2fr 1fr 120px',
                            padding: '20px 24px', borderBottom: '1px solid var(--border-light)',
                            alignItems: 'center', transition: 'background 0.2s', cursor: 'pointer'
                        }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseOut={e => e.currentTarget.style.background = 'white'}>
                            <div style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.9rem' }}>{issue.id}</div>
                            <div>
                                <span style={{
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                    background: issue.severity === 'Critical' || issue.severity === 'High' ? 'rgba(239, 68, 68, 0.1)' :
                                        issue.severity === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                    color: issue.color
                                }}>
                                    {issue.severity}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                                <span style={{ color: issue.color }}>{issue.icon}</span> {issue.type}
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', paddingRight: '16px' }}>{issue.title}</div>
                            <div style={{ fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-block', width: 'fit-content' }}>
                                {issue.location}
                            </div>
                            <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{issue.age}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default IssuesLog;
