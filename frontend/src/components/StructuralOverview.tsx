import React from 'react';
import { Share2, AlertCircle } from 'lucide-react';

const StructuralOverview: React.FC = () => {
    // Simple mocked positions for nodes
    const nodes = [
        { id: '1', label: 'Home', x: 20, y: 50, status: 'healthy' },
        { id: '2', label: 'Login', x: 50, y: 30, status: 'healthy' },
        { id: '3', label: 'Dashboard', x: 50, y: 70, status: 'healthy' },
        { id: '4', label: 'Billing', x: 80, y: 20, status: 'risky' },
        { id: '5', label: 'Settings', x: 80, y: 80, status: 'healthy' },
    ];

    const connections = [
        { from: '1', to: '2' },
        { from: '1', to: '3' },
        { from: '3', to: '4' },
        { from: '3', to: '5' },
    ];

    return (
        <div className="white-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        padding: '8px', borderRadius: '12px', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-teal)'
                    }}>
                        <Share2 size={24} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Structural Overview</h2>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-teal)' }} /> Healthy
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-danger)' }} /> High Risk
                    </span>
                </div>
            </div>

            <div style={{
                position: 'relative', height: '260px', width: '100%',
                background: 'var(--bg-tertiary)', borderRadius: '12px',
                border: '1px solid var(--border-light)', overflow: 'hidden'
            }}>
                {/* SVG for connecting lines */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                    {connections.map((c, i) => {
                        const fromNode = nodes.find(n => n.id === c.from);
                        const toNode = nodes.find(n => n.id === c.to);
                        if (!fromNode || !toNode) return null;

                        const isRisky = toNode.status === 'risky';

                        return (
                            <line
                                key={i}
                                x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                                x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                                stroke={isRisky ? 'var(--status-danger)' : 'var(--border-strong)'}
                                strokeWidth={isRisky ? 2 : 1.5}
                                strokeDasharray={isRisky ? '4 4' : 'none'}
                            />
                        );
                    })}
                </svg>

                {/* HTML Nodes */}
                {nodes.map(node => (
                    <div key={node.id} style={{
                        position: 'absolute',
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2,
                        background: 'white',
                        border: `2px solid ${node.status === 'risky' ? 'var(--status-danger)' : 'var(--accent-teal)'}`,
                        padding: '8px 16px',
                        borderRadius: '24px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: node.status === 'risky' ? 'var(--status-danger)' : 'var(--text-primary)',
                        boxShadow: `0 4px 12px ${node.status === 'risky' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(20, 184, 166, 0.15)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'transform 0.2s ease',
                        cursor: 'default'
                    }}>
                        {node.status === 'risky' && <AlertCircle size={14} />}
                        {node.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StructuralOverview;
