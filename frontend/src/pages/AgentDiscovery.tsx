import React, { useEffect, useState } from 'react';
import AgentPage from './AgentPage';

const AgentDiscovery: React.FC = () => {
    const taskQueue = [
        'Initializing headless browser connection...',
        'Navigating to entry URL...',
        'Extracting DOM layout structures...',
        'Identifying interactive elements...',
        'Mapping link graph...',
        'Compiling discovery report...'
    ];

    const [scanPosition, setScanPosition] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setScanPosition(prev => (prev + 1) % 5);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <AgentPage
            agentName="Discovery Agent"
            agentRole="Autonomous Crawler & Mapper"
            taskQueue={taskQueue}
            isActive={true}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc' }}>
                {/* Browser Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#e2e8f0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f87171' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#34d399' }} />
                    </div>
                    <div style={{ flex: 1, margin: '0 16px', background: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>🔒</span> https://target-app.internal/dashboard
                    </div>
                </div>

                {/* Browser Body (Mock App) */}
                <div style={{ flex: 1, padding: '24px', position: 'relative', overflow: 'hidden' }}>
                    {/* Scanning overlay */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '100px',
                        background: 'linear-gradient(to bottom, rgba(20, 184, 166, 0), rgba(20, 184, 166, 0.1) 50%, rgba(20, 184, 166, 0.4))',
                        borderBottom: '2px solid var(--accent-teal)',
                        transform: `translateY(${scanPosition * 100}px)`,
                        transition: 'transform 1.5s linear',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }} />

                    {/* Mock Layout Elements */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', opacity: 0.5 }}>
                        {/* Nav */}
                        <div style={{ height: '40px', background: '#cbd5e1', borderRadius: '8px', width: '100%' }} />

                        <div style={{ display: 'flex', gap: '24px' }}>
                            {/* Sidebar */}
                            <div style={{ width: '150px', height: '300px', background: '#cbd5e1', borderRadius: '8px' }} />

                            {/* Content */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Hero */}
                                <div style={{ height: '120px', background: '#cbd5e1', borderRadius: '8px', position: 'relative' }}>
                                    {scanPosition === 1 && (
                                        <div style={{ position: 'absolute', inset: -4, border: '2px dashed var(--accent-blue)', borderRadius: '10px' }} />
                                    )}
                                </div>

                                {/* Grid */}
                                <div style={{ display: 'flex', gap: '24px' }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{ flex: 1, height: '150px', background: '#cbd5e1', borderRadius: '8px', position: 'relative' }}>
                                            {(scanPosition === 2 && i === 0) && <div style={{ position: 'absolute', inset: -4, border: '2px dashed var(--accent-blue)', borderRadius: '10px' }} />}
                                            {(scanPosition === 3 && i === 1) && <div style={{ position: 'absolute', inset: -4, border: '2px dashed var(--accent-blue)', borderRadius: '10px' }} />}
                                            {(scanPosition === 4 && i === 2) && <div style={{ position: 'absolute', inset: -4, border: '2px dashed var(--accent-blue)', borderRadius: '10px' }} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AgentPage>
    );
};

export default AgentDiscovery;
