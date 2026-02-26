import React, { useEffect, useRef, useState } from 'react';
import AgentPage from './AgentPage';
import ScanResultScreen from '../components/ScanResultScreen';
import { Play, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LS_KEY = 'nexusqa_last_scan';

interface LogEntry { level: string; message: string; ts: string; }

const AgentDiscovery: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const urlParam = searchParams.get('url');
    const decodedParam = urlParam ? decodeURIComponent(urlParam) : null;

    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [currentUrl, setCurrentUrl] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const lsData = localStorage.getItem(LS_KEY);
    const initialCompleted = !!lsData;

    const [isCompleted, setIsCompleted] = useState(initialCompleted);
    const [targetUrl, setTargetUrl] = useState(
        decodedParam ?? (lsData ? JSON.parse(lsData).url : 'http://juiceshop:3000/')
    );

    const wsRef = useRef<WebSocket | null>(null);
    const logPanelRef = useRef<HTMLDivElement>(null);
    const lastUrlRef = useRef<string>('');
    const hasAutoStarted = useRef(initialCompleted);

    // ── WebSocket connection ────────────────────────────────────────────────
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${protocol}://localhost:8000/api/ws/agent`);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        ws.onerror = () => setIsConnected(false);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'frame' || data.type === 'screenshot') {
                    const mimeType = data.type === 'frame' ? 'image/jpeg' : 'image/png';
                    setScreenshot(`data:${mimeType};base64,${data.data}`);
                    const newUrl = data.url || '';
                    setCurrentUrl(newUrl);
                    if (newUrl && newUrl !== lastUrlRef.current) {
                        lastUrlRef.current = newUrl;
                        setLogs(prev => [...prev.slice(-199), {
                            level: 'nav', message: `🌐 Browser → ${newUrl}`,
                            ts: new Date().toLocaleTimeString(),
                        }]);
                    }
                } else if (data.type === 'log') {
                    const entry: LogEntry = {
                        level: data.level || 'info', message: data.message,
                        ts: new Date().toLocaleTimeString(),
                    };
                    setLogs(prev => [...prev.slice(-199), entry]);
                    if (data.level === 'success' && data.message.includes('finished')) {
                        setIsRunning(false);
                        setIsCompleted(true);
                        localStorage.setItem(LS_KEY, JSON.stringify({ url: currentUrl || targetUrl, completedAt: new Date().toISOString() }));
                    }
                }
            } catch (e) { console.error('WS parse error', e); }
        };

        return () => ws.close();
    }, []);

    // ── Auto-scroll log panel ───────────────────────────────────────────────
    useEffect(() => {
        if (logPanelRef.current)
            logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }, [logs]);

    // ── Auto-start via ?url= param (only if not already completed) ──
    useEffect(() => {
        if (decodedParam && isConnected && !hasAutoStarted.current && !isRunning && !isCompleted) {
            hasAutoStarted.current = true;
            handleStart(decodedParam);
        }
    }, [isConnected, decodedParam, isCompleted]);

    // ── Start agent ─────────────────────────────────────────────────────────
    const handleStart = async (overrideUrl?: string) => {
        const url = overrideUrl || targetUrl;
        if (!url.trim() || isRunning) return;
        setIsRunning(true);
        setIsCompleted(false);
        setLogs([]);
        setScreenshot(null);
        lastUrlRef.current = '';
        try {
            // Clear Inspector + Strategist completion flags since DB will be wiped on start
            localStorage.removeItem('nexusqa_inspector_done');
            const res = await fetch('/api/agent/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() }),
            });
            if (!res.ok) {
                const err = await res.json();
                setLogs([{ level: 'error', message: `Start failed: ${err.detail}`, ts: new Date().toLocaleTimeString() }]);
                setIsRunning(false);
            }
        } catch (e) {
            setLogs([{ level: 'error', message: `Cannot reach backend: ${e}`, ts: new Date().toLocaleTimeString() }]);
            setIsRunning(false);
        }
    };

    // ── COMPLETED: show premium result screen ──────────────────────────────
    if (isCompleted) {
        return (
            <ScanResultScreen
                targetUrl={targetUrl}
                logLines={logs}
                onScanAgain={() => {
                    setIsCompleted(false);
                    setLogs([]);
                    setScreenshot(null);
                    hasAutoStarted.current = false;
                    localStorage.removeItem(LS_KEY);
                }}
            />
        );
    }

    // ── LOG PANEL (right side) ───────────────────────────────────────────────
    const logPanel = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Back button */}
            <button
                onClick={() => navigate('/dashboard')}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600,
                    padding: '0 0 16px 0', marginBottom: '4px',
                }}
            >
                <ArrowLeft size={14} /> Back to Dashboard
            </button>

            {/* URL Input */}
            <div style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '20px', paddingBottom: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px' }}>Target Application</h3>
                <input
                    type="text"
                    value={targetUrl}
                    onChange={e => setTargetUrl(e.target.value)}
                    placeholder="http://juiceshop:3000/"
                    disabled={isRunning}
                    style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid var(--border-strong)', marginBottom: '10px',
                        fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                        opacity: isRunning ? 0.6 : 1,
                    }}
                />
                <button
                    onClick={() => handleStart()}
                    disabled={isRunning || !isConnected}
                    style={{
                        width: '100%', padding: '10px 0', borderRadius: '8px',
                        background: isRunning ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                        color: isRunning ? 'var(--text-muted)' : 'white',
                        border: 'none', fontWeight: 700, fontSize: '0.9rem',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                >
                    <Play size={16} />
                    {isRunning ? 'Agent Running...' : 'Start Discovery'}
                </button>
            </div>

            {/* Connection Status */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
                fontSize: '0.8rem', color: isConnected ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600
            }}>
                {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isConnected ? 'Connected to Engine' : 'Engine offline — start backend with uvicorn'}
            </div>

            {/* Live Log Output */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px' }}>Live Activity Log</h3>
            <div
                ref={logPanelRef}
                style={{
                    flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
                    background: '#0f172a', borderRadius: '10px', padding: '12px',
                    fontFamily: 'monospace', fontSize: '0.78rem',
                }}
            >
                {logs.length === 0 && (
                    <span style={{ color: '#475569' }}>
                        {isConnected
                            ? 'Waiting for agent to start...'
                            : 'Connecting to engine...'}
                    </span>
                )}
                {logs.map((entry, i) => (
                    <div key={i} style={{
                        color: entry.level === 'error' ? '#f87171'
                            : entry.level === 'success' ? '#34d399'
                                : entry.level === 'nav' ? '#38bdf8'
                                    : '#94a3b8',
                        lineHeight: 1.5,
                        borderBottom: entry.level === 'nav' ? '1px solid #1e293b' : 'none',
                        paddingBottom: entry.level === 'nav' ? '4px' : '0',
                    }}>
                        <span style={{ color: '#475569', marginRight: '8px' }}>{entry.ts}</span>
                        {entry.message}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <AgentPage
            agentName="Discovery Agent"
            agentRole="Autonomous Crawler & Mapper"
            taskQueue={logs.length > 0 ? logs.map(l => l.message) : ['Waiting to start...']}
            isActive={isRunning}
            customRightPanel={logPanel}
        >
            {/* Browser Viewport */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc' }}>
                {/* Browser Chrome Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                    background: '#e2e8f0', borderBottom: '1px solid var(--border-light)', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f87171' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#34d399' }} />
                    </div>
                    <div style={{
                        flex: 1, margin: '0 12px', background: 'white', padding: '5px 12px',
                        borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden',
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>🔒</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentUrl || (isRunning ? 'Navigating...' : targetUrl || 'about:blank')}
                        </span>
                    </div>
                </div>

                {/* Screenshot / Idle area */}
                <div style={{
                    flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', background: '#f1f5f9', position: 'relative',
                }}>
                    {screenshot ? (
                        <img
                            src={screenshot}
                            alt="Live browser view"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                            {isRunning ? (
                                <>
                                    <div style={{
                                        width: '48px', height: '48px', border: '3px solid var(--border-light)',
                                        borderTopColor: 'var(--accent-blue)', borderRadius: '50%',
                                        animation: 'spin 1s linear infinite', margin: '0 auto 16px',
                                    }} />
                                    <p style={{ fontWeight: 600, margin: 0 }}>Waiting for first screenshot...</p>
                                    <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                                        Agent 1 is starting up. The browser will appear shortly.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p style={{ fontWeight: 600, margin: '0 0 8px', fontSize: '1rem' }}>Browser Preview</p>
                                    <p style={{ fontSize: '0.85rem', margin: 0 }}>
                                        The live Playwright browser will appear here once the agent starts.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {isRunning && screenshot && (
                        <div style={{
                            position: 'absolute', top: '12px', right: '12px',
                            background: 'rgba(59,130,246,0.9)', color: 'white',
                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white', animation: 'pulse 1s infinite' }} />
                            LIVE
                        </div>
                    )}
                </div>
            </div>
        </AgentPage>
    );
};

export default AgentDiscovery;
