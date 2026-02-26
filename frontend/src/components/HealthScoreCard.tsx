import React from 'react';
import { Activity, AlertTriangle } from 'lucide-react';

const HealthScoreCard: React.FC = () => {
    const score = 84;
    const status = 'Needs Attention';

    return (
        <div className="white-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    padding: '8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)'
                }}>
                    <Activity size={24} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Application Health Score</h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                <div className="text-gradient" style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1 }}>
                    {score}
                </div>
                <div style={{ paddingBottom: '12px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 14px', borderRadius: '20px',
                        background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-warning)',
                        fontSize: '0.85rem', fontWeight: 700
                    }}>
                        <AlertTriangle size={14} />
                        {status}
                    </div>
                </div>
            </div>

            <div style={{
                height: '8px', width: '100%', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%', width: `${score}%`,
                    background: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-teal) 100%)',
                    borderRadius: '4px'
                }} />
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                Score is based on structure, broken flows, UI hygiene, and errors detected automatically.
            </p>
        </div>
    );
};

export default HealthScoreCard;
