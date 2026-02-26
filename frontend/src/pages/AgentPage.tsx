import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle, Loader } from 'lucide-react';

interface AgentPageProps {
    agentName: string;
    agentRole: string;
    taskQueue: string[];
    isActive: boolean;
    children?: React.ReactNode;
    customRightPanel?: React.ReactNode;
}

const AgentPage: React.FC<AgentPageProps> = ({ agentName, agentRole, taskQueue, isActive, children, customRightPanel }) => {
    const [completedTasks, setCompletedTasks] = useState<number>(isActive ? 0 : taskQueue.length);

    useEffect(() => {
        if (!isActive) return;

        // Simulate tasks completing one by one if active
        if (completedTasks < taskQueue.length) {
            const timer = setTimeout(() => {
                setCompletedTasks(prev => prev + 1);
            }, 1000 + Math.random() * 800);
            return () => clearTimeout(timer);
        }
    }, [completedTasks, isActive, taskQueue.length]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '16px',
                        background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(20, 184, 166, 0.1)',
                        color: isActive ? 'var(--accent-blue)' : 'var(--accent-teal)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Bot size={28} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{agentName}</h1>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 500 }}>{agentRole}</p>
                    </div>
                </div>
                <div>
                    <span className="pill-badge" style={{ background: isActive ? 'white' : 'white', border: '1px solid var(--border-light)' }}>
                        {isActive ? (
                            <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)', animation: 'pulse 1.5s infinite' }} /> Processing</>
                        ) : (
                            <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-success)' }} /> Idle / Completed</>
                        )}
                    </span>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
                {/* Left Visualization Area */}
                {children && (
                    <div className="white-card" style={{ flex: 2, padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {children}
                    </div>
                )}

                {/* Right Log Area / Info Area */}
                <div className="white-card" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {customRightPanel ? customRightPanel : (
                        <>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Activity Log
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}>
                                {taskQueue.map((task, i) => {
                                    const isComplete = i < completedTasks;
                                    const isCurrent = i === completedTasks && isActive;
                                    const isPending = i > completedTasks || (!isActive && i >= completedTasks);

                                    return (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '16px',
                                            opacity: isPending ? 0.4 : 1, transition: 'opacity 0.3s'
                                        }}>
                                            <div style={{
                                                minWidth: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: isComplete ? 'var(--status-success)' : isCurrent ? 'var(--accent-blue)' : 'var(--text-muted)'
                                            }}>
                                                {isComplete ? <CheckCircle size={20} /> : isCurrent ? <Loader size={20} className="spin" /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: isCurrent ? 600 : 500, color: isCurrent ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                                                    {task}
                                                </div>
                                                {isComplete && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Completed in ~{(1.2 + Math.random()).toFixed(1)}s</div>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

        </div>
    );
};

export default AgentPage;
