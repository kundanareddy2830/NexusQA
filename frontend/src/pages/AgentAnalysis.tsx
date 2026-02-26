import React, { useState } from 'react';
import AgentPage from './AgentPage';
import { MousePointerClick, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const AgentAnalysis: React.FC = () => {
    const taskQueue = [
        'Awaiting structure map from Discovery...',
        'Analyzing component hierarchy...',
        'Running contrast checks...',
        'Evaluating accessibility tree...',
        'Detecting layout shifts...',
        'Testing responsiveness...'
    ];

    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const nodes = [
        { id: 'root', x: 200, y: 50, label: 'index.html', type: 'page', status: 'ok' },
        { id: 'nav', x: 100, y: 150, label: 'navbar', type: 'component', status: 'ok' },
        { id: 'hero', x: 200, y: 150, label: 'hero-section', type: 'component', status: 'ok' },
        { id: 'login', x: 300, y: 150, label: 'login-modal', type: 'component', status: 'error' },
        { id: 'btn', x: 300, y: 250, label: 'submit-btn', type: 'interactive', status: 'warning' },
        { id: 'link', x: 100, y: 250, label: 'pricing-link', type: 'interactive', status: 'ok' },
    ];

    const connections = [
        { from: 'root', to: 'nav' },
        { from: 'root', to: 'hero' },
        { from: 'root', to: 'login' },
        { from: 'login', to: 'btn' },
        { from: 'nav', to: 'link' },
    ];

    const getNodeDetails = (id: string | null) => {
        if (!id) return null;
        const details: Record<string, { title: string, events: string[], issues: string[] }> = {
            'root': { title: 'Main Page', events: ['DOM Loaded in 1.2s', 'First Paint: 1.5s'], issues: [] },
            'login': { title: 'Login Modal Component', events: ['Modal Triggered', 'Focus Trapped'], issues: ['Missing aria-label on close button', 'Form submission bypassed validation'] },
            'btn': { title: 'Submit Button', events: ['Hover detected', 'Click event triggered'], issues: ['Contrast ratio 3.1:1 (Fails WCAG)'] },
            'nav': { title: 'Navigation Bar', events: ['Scrolling sticky behavior verified'], issues: [] },
            'hero': { title: 'Hero Section', events: ['LCP image loaded'], issues: [] },
            'link': { title: 'Pricing Link', events: ['Navigated to /pricing'], issues: [] }
        };
        return details[id];
    };

    const details = getNodeDetails(hoveredNode);

    const CustomRightPanel = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} /> Node Inspection Log
            </h3>

            {!hoveredNode ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
                    Hover over a node in the graph to view AI analysis details and detected events.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>Target Node</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{details?.title}</div>
                    </div>

                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px' }}>Event Log</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {details?.events.map((ev, i) => (
                                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    <div style={{ color: 'var(--accent-blue)', paddingTop: '2px' }}><MousePointerClick size={16} /></div>
                                    <span>{ev}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {details?.issues && details.issues.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px' }}>Detected Anomalies</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {details.issues.map((iss, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '0.9rem', color: 'var(--status-error)' }}>
                                        <div style={{ paddingTop: '2px' }}><AlertTriangle size={16} /></div>
                                        <span>{iss}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {details?.issues && details.issues.length === 0 && (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.9rem', color: 'var(--status-success)', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px' }}>
                            <CheckCircle size={16} /> No issues detected
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <AgentPage
            agentName="Analysis Agent"
            agentRole="Heuristic & Visual Analyzer"
            taskQueue={taskQueue}
            isActive={false}
            customRightPanel={<CustomRightPanel />}
        >
            <div style={{ flex: 1, padding: '24px', background: 'var(--bg-tertiary)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'absolute', top: '16px', left: '16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Application DOM Graph (Neo4j Visualizer)
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="400" height="350" viewBox="0 0 400 350" style={{ overflow: 'visible' }}>
                        {/* Edges */}
                        {connections.map((c, i) => {
                            const fromNode = nodes.find(n => n.id === c.from)!;
                            const toNode = nodes.find(n => n.id === c.to)!;
                            return (
                                <line
                                    key={`line-${i}`}
                                    x1={fromNode.x} y1={fromNode.y}
                                    x2={toNode.x} y2={toNode.y}
                                    stroke="var(--border-strong)"
                                    strokeWidth="2"
                                />
                            );
                        })}
                        {/* Nodes */}
                        {nodes.map(node => {
                            const isHovered = hoveredNode === node.id;
                            const color = node.status === 'error' ? 'var(--status-error)' :
                                node.status === 'warning' ? 'var(--status-warning)' :
                                    'var(--accent-teal)';
                            return (
                                <g
                                    key={node.id}
                                    onMouseEnter={() => setHoveredNode(node.id)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <circle
                                        cx={node.x} cy={node.y}
                                        r={isHovered ? 24 : 18}
                                        fill={color}
                                        opacity={isHovered ? 1 : 0.8}
                                    />
                                    <text
                                        x={node.x} y={node.y + (isHovered ? 40 : 32)}
                                        textAnchor="middle"
                                        fontSize="12"
                                        fontWeight={isHovered ? "bold" : "normal"}
                                        fill="var(--text-primary)"
                                    >
                                        {node.label}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        </AgentPage>
    );
};

export default AgentAnalysis;
