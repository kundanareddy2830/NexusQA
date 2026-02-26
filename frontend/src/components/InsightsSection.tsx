import React from 'react';
import { EyeOff, LayoutTemplate, Bug } from 'lucide-react';

const InsightsSection: React.FC = () => {
    const [insights, setInsights] = React.useState<any[]>([]);

    React.useEffect(() => {
        fetch('/api/issues')
            .then(res => res.json())
            .then(data => {
                const topIssues = data.slice(0, 4).map((issue: any) => {
                    let icon = <Bug size={20} />;
                    let color = 'var(--status-danger)';
                    let bg = 'rgba(239, 68, 68, 0.1)';

                    if (issue.type.includes('ACCESSIBILITY')) {
                        icon = <EyeOff size={20} />;
                        color = 'var(--accent-blue)';
                        bg = 'rgba(59, 130, 246, 0.1)';
                    } else if (issue.type.includes('STRUCTURAL') || issue.type.includes('SEMANTICS')) {
                        icon = <LayoutTemplate size={20} />;
                        color = 'var(--status-warning)';
                        bg = 'rgba(245, 158, 11, 0.1)';
                    }

                    return {
                        id: issue.id,
                        title: `${issue.type.replace('_', ' ')} Detected`,
                        description: issue.title,
                        icon, color, bg
                    };
                });
                setInsights(topIssues);
            })
            .catch(console.error);
    }, []);

    return (
        <div className="white-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1.5 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Key Findings & Insights</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '12px' }}>
                {insights.map(insight => (
                    <div key={insight.id} style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '16px',
                        background: 'white',
                        border: '1px solid var(--border-light)',
                        borderRadius: '12px',
                        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-strong)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-light)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: insight.bg, color: insight.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            {insight.icon}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                {insight.title}
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                {insight.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InsightsSection;
