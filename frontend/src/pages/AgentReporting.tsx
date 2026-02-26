import React from 'react';
import AgentPage from './AgentPage';
import { Target, TrendingUp, ShieldAlert, CheckCircle } from 'lucide-react';

const AgentReporting: React.FC = () => {
    const taskQueue = [
        'Awaiting anomaly data from Analysis...',
        'Prioritizing issues by severity...',
        'Generating remediation steps...',
        'Compiling health score metrics...',
        'Formatting final JSON report...'
    ];

    return (
        <AgentPage
            agentName="Reporting Agent"
            agentRole="Data Synthesizer"
            taskQueue={taskQueue}
            isActive={false}
        >
            <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{
                        width: '120px', height: '120px', borderRadius: '50%',
                        background: 'conic-gradient(var(--status-success) 0% 92%, var(--border-light) 92% 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                    }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>92</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 100</span>
                        </div>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Quality Synthesis Complete</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '400px', lineHeight: 1.5 }}>
                            The application exhibits strong structural integrity, with minor accessibility violations in isolated components.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ color: 'var(--accent-blue)' }}><Target size={24} /></div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>42</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nodes Scanned</div>
                    </div>
                    <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ color: 'var(--status-error)' }}><ShieldAlert size={24} /></div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>3</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Critical Issues</div>
                    </div>
                    <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ color: 'var(--status-success)' }}><CheckCircle size={24} /></div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>98%</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Test Pass Rate</div>
                    </div>
                    <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ color: 'var(--accent-teal)' }}><TrendingUp size={24} /></div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>+5%</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Score vs. Last Scan</div>
                    </div>
                </div>
            </div>
        </AgentPage>
    );
};

export default AgentReporting;
