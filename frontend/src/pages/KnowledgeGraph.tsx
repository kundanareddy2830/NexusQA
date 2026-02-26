import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link2, Layers, AlertTriangle, Shield, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────
interface GraphNode {
    id: string; label: string; url: string; intent: string; status: string;
    x: number; y: number; vx: number; vy: number;
    fx?: number; fy?: number;
}
interface GraphEdge { from: string; to: string; }

// ── Color scheme by status ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { fill: string; glow: string; border: string }> = {
    healthy: { fill: '#10b981', glow: 'rgba(16,185,129,0.35)', border: '#059669' },
    critical: { fill: '#ef4444', glow: 'rgba(239,68,68,0.35)', border: '#dc2626' },
    warning: { fill: '#f59e0b', glow: 'rgba(245,158,11,0.35)', border: '#d97706' },
    risky: { fill: '#f97316', glow: 'rgba(249,115,22,0.35)', border: '#ea580c' },
    default: { fill: '#6366f1', glow: 'rgba(99,102,241,0.35)', border: '#4f46e5' },
};
const R = 22;

function lighter(hex: string) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + 55);
    const g = Math.min(255, ((n >> 8) & 0xff) + 55);
    const b = Math.min(255, (n & 0xff) + 55);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const KnowledgeGraph: React.FC<{ mode?: 'topology' | 'health' }> = ({ mode = 'health' }) => {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<GraphNode[]>([]);
    const edgesRef = useRef<GraphEdge[]>([]);
    const rafRef = useRef<number | undefined>(undefined);
    const dragNode = useRef<GraphNode | null>(null);
    const mousePos = useRef({ x: 0, y: 0 });
    const pan = useRef({ x: 0, y: 0 });
    const zoom = useRef(1);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const panOrigin = useRef({ x: 0, y: 0 });
    // Tracks live canvas pixel size so simulation + node init always have correct center
    const canvasSizeRef = useRef({ w: window.innerWidth - 600, h: window.innerHeight - 60 });

    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const hoveredNodeRef = useRef<GraphNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const selectedNodeRef = useRef<GraphNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [nodeCount, setNodeCount] = useState(0);
    const [edges, setEdges] = useState<GraphEdge[]>([]);

    // Canvas is sized inside the simulation useEffect (runs after loading=false, canvas is mounted)


    // ── Load data ─────────────────────────────────────────────────────────────
    useEffect(() => {
        fetch('/api/graph')
            .then(r => r.json())
            .then(data => {
                // Use the tracked size (avoids canvas being 0×0 before ResizeObserver fires)
                const cx = canvasSizeRef.current.w / 2;
                const cy = canvasSizeRef.current.h / 2;

                const mapped: GraphNode[] = (data.nodes || []).map((n: { id: string; label?: string; url?: string; intent?: string; status?: string }) => ({
                    id: n.id,
                    label: n.label || 'PAGE',
                    url: n.url || '',
                    intent: n.intent || '',
                    status: n.status || 'default',
                    x: cx + (Math.random() - 0.5) * 400,
                    y: cy + (Math.random() - 0.5) * 400,
                    vx: 0, vy: 0,
                }));

                const mappedEdges: GraphEdge[] = (data.connections || []).map((e: { from: string; to: string }) => ({
                    from: e.from, to: e.to,
                }));

                nodesRef.current = mapped;
                edgesRef.current = mappedEdges;
                setEdges(mappedEdges);
                setNodeCount(mapped.length);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // ── Simulation + render loop ───────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || loading) return;
        const ctx = canvas.getContext('2d')!;

        // Size canvas from its parent — defer by one frame so flex layout is complete
        let initDone = false;
        const applySize = (reseed = false) => {
            const p = canvas.parentElement;
            if (!p) return;
            // Walk up to find a parent with real height (handles flex chains)
            let el: HTMLElement | null = p;
            let w = 0, h = 0;
            while (el) {
                w = el.clientWidth; h = el.clientHeight;
                if (w > 0 && h > 0) break;
                el = el.parentElement;
            }
            if (!w) w = 800;
            if (!h) h = 600;

            canvas.width = w;
            canvas.height = h;
            canvasSizeRef.current = { w, h };

            if (reseed || !initDone) {
                initDone = true;
                const cx2 = w / 2, cy2 = h / 2;
                const spread = Math.min(w, h) * 0.55;
                for (const n of nodesRef.current) {
                    if (n.fx !== undefined) continue;
                    n.x = cx2 + (Math.random() - 0.5) * spread;
                    n.y = cy2 + (Math.random() - 0.5) * spread;
                    n.vx = 0; n.vy = 0;
                }
            }
        };
        // Defer first call by one frame so the browser finishes flex layout
        const initRAF = requestAnimationFrame(() => applySize(true));
        window.addEventListener('resize', () => applySize(false));

        const tick = () => {
            const ns = nodesRef.current;
            const es = edgesRef.current;
            const W = canvasSizeRef.current.w || canvas.width || 800;
            const H = canvasSizeRef.current.h || canvas.height || 600;
            const cx = W / 2, cy = H / 2;

            // Center attraction (gentle)
            for (const n of ns) {
                if (n.fx !== undefined) { n.x = n.fx; n.y = n.fy!; continue; }
                n.vx += (cx - n.x) * 0.0012;
                n.vy += (cy - n.y) * 0.0012;
            }
            // Node-node repulsion (capped)
            for (let i = 0; i < ns.length; i++) {
                for (let j = i + 1; j < ns.length; j++) {
                    const a = ns[i], b = ns[j];
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const d2 = dx * dx + dy * dy || 0.01;
                    const d = Math.sqrt(d2);
                    const f = Math.min(1800 / d2, 16);
                    const fx = dx / d * f, fy = dy / d * f;
                    if (a.fx === undefined) { a.vx -= fx; a.vy -= fy; }
                    if (b.fx === undefined) { b.vx += fx; b.vy += fy; }
                }
            }
            // Edge spring (softer)
            for (const e of es) {
                const a = ns.find(n => n.id === e.from);
                const b = ns.find(n => n.id === e.to);
                if (!a || !b) continue;
                const dx = b.x - a.x, dy = b.y - a.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const f = (d - 140) * 0.010;
                const fx = dx / d * f, fy = dy / d * f;
                if (a.fx === undefined) { a.vx += fx; a.vy += fy; }
                if (b.fx === undefined) { b.vx -= fx; b.vy -= fy; }
            }
            // Integrate with stronger damping + velocity clamp
            for (const n of ns) {
                if (n.fx !== undefined) continue;
                n.vx *= 0.82; n.vy *= 0.82;
                const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
                if (spd > 7) { n.vx = n.vx / spd * 7; n.vy = n.vy / spd * 7; }
                n.x += n.vx; n.y += n.vy;
            }

            // ── Draw ──────────────────────────────────────────────────────────
            ctx.clearRect(0, 0, W, H);
            ctx.save();
            ctx.translate(pan.current.x, pan.current.y);
            ctx.scale(zoom.current, zoom.current);

            // Grid
            ctx.save();
            ctx.strokeStyle = 'rgba(100,116,139,0.07)';
            ctx.lineWidth = 1 / zoom.current;
            const gs = 60;
            const ox = ((-pan.current.x / zoom.current) % gs + gs) % gs;
            const oy = ((-pan.current.y / zoom.current) % gs + gs) % gs;
            for (let x = -gs + ox; x < W / zoom.current + gs; x += gs) {
                ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, H * 2); ctx.stroke();
            }
            for (let y = -gs + oy; y < H / zoom.current + gs; y += gs) {
                ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W * 2, y); ctx.stroke();
            }
            // Draw edges
            ctx.lineWidth = 1;
            for (const e of es) {
                const a = ns.find(n => n.id === e.from);
                const b = ns.find(n => n.id === e.to);
                if (!a || !b) continue;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = mode === 'topology' ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.15)';
                ctx.stroke();

                // Arrow
                const dx = b.x - a.x, dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > R + 5) {
                    const ax = b.x - (dx / dist) * R;
                    const ay = b.y - (dy / dist) * R;
                    ctx.beginPath();
                    ctx.moveTo(ax, ay);
                    ctx.lineTo(ax - (dx / dist) * 8 - (dy / dist) * 4, ay - (dy / dist) * 8 + (dx / dist) * 4);
                    ctx.lineTo(ax - (dx / dist) * 8 + (dy / dist) * 4, ay - (dy / dist) * 8 - (dx / dist) * 4);
                    ctx.fillStyle = mode === 'topology' ? 'rgba(99,102,241,0.4)' : 'rgba(148,163,184,0.4)';
                    ctx.fill();
                }
            }

            // Detect hover FIRST
            const mx = (mousePos.current.x - pan.current.x) / zoom.current;
            const my = (mousePos.current.y - pan.current.y) / zoom.current;
            let hovered: GraphNode | null = null;

            for (const n of ns) {
                const dx = n.x - mx, dy = n.y - my;
                if (Math.sqrt(dx * dx + dy * dy) < R + 6) hovered = n;
            }

            // Draw nodes
            for (const n of ns) {
                const isHover = n === hovered;
                const isSel = n === selectedNodeRef.current;

                // In topology mode, everything is the 'default' blue struct style
                const themeKey = mode === 'topology' ? 'default' : (STATUS_COLORS[n.status] ? n.status : 'default');
                const theme = STATUS_COLORS[themeKey];

                const rad = isSel ? R * 1.3 : isHover ? R * 1.1 : R;

                // Glow
                if (isHover || n.fx !== undefined) {
                    ctx.beginPath(); ctx.arc(n.x, n.y, rad + 9, 0, Math.PI * 2);
                    ctx.fillStyle = theme.glow; ctx.fill();
                }
                // Node circle
                ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, Math.PI * 2);
                const g = ctx.createRadialGradient(n.x - 5, n.y - 5, 2, n.x, n.y, rad);
                g.addColorStop(0, lighter(theme.fill)); g.addColorStop(1, theme.fill);
                ctx.fillStyle = g; ctx.fill();
                ctx.strokeStyle = theme.border; ctx.lineWidth = 2; ctx.stroke();

                // Label inside
                const lbl = n.label.length > 5 ? n.label.slice(0, 5) : n.label;
                ctx.fillStyle = 'white';
                ctx.font = `bold ${10}px Inter,sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(lbl, n.x, n.y);

                // URL below
                if (zoom.current > 0.55) {
                    const shortUrl = (n.url.replace(/^https?:\/\/[^/]+/, '') || '/').slice(0, 22);
                    ctx.fillStyle = 'rgba(226,232,240,0.8)';
                    ctx.font = `9px Inter,sans-serif`;
                    ctx.fillText(shortUrl, n.x, n.y + rad + 12);
                }
            }
            ctx.restore();

            // Update hover in React state, but also sync the ref so we don't need it in deps
            if (hovered?.id !== hoveredNodeRef.current?.id) {
                hoveredNodeRef.current = hovered;
                setHoveredNode(hovered);
            }
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            cancelAnimationFrame(initRAF);
        };
    }, [loading, mode]); // Removed hoveredNode and selectedNode from dependencies

    // ── Helpers ───────────────────────────────────────────────────────────────
    const toSim = (ex: number, ey: number) => ({
        x: (ex - pan.current.x) / zoom.current,
        y: (ey - pan.current.y) / zoom.current,
    });
    const getNodeAt = (cssX: number, cssY: number) => {
        // cssX/cssY are already in canvas pixel space because canvas.width === container CSS width
        const { x, y } = toSim(cssX, cssY);
        return nodesRef.current.find(n => Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) < R + 8) ?? null;
    };
    const rect = () => canvasRef.current!.getBoundingClientRect();

    // ── Mouse handlers ────────────────────────────────────────────────────────
    const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const r = rect();
        mousePos.current = { x: e.clientX - r.left, y: e.clientY - r.top };
        if (dragNode.current?.fx !== undefined) {
            const { x, y } = toSim(mousePos.current.x, mousePos.current.y);
            dragNode.current.fx = x; dragNode.current.fy = y;
        } else if (isPanning.current) {
            pan.current.x = panOrigin.current.x + mousePos.current.x - panStart.current.x;
            pan.current.y = panOrigin.current.y + mousePos.current.y - panStart.current.y;
        }
    }, []);

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const r = rect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        const hit = getNodeAt(mx, my);
        if (hit) { hit.fx = hit.x; hit.fy = hit.y; dragNode.current = hit; }
        else {
            isPanning.current = true;
            panStart.current = { x: mx, y: my };
            panOrigin.current = { ...pan.current };
        }
    }, []);

    const onMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (dragNode.current) {
            const r = rect();
            const hit = getNodeAt(e.clientX - r.left, e.clientY - r.top);
            if (hit) {
                if (selectedNodeRef.current?.id === hit.id) {
                    hit.fx = undefined; hit.fy = undefined;
                    selectedNodeRef.current = null;
                    setSelectedNode(null);
                } else {
                    hit.fx = hit.x; hit.fy = hit.y;
                    selectedNodeRef.current = hit;
                    setSelectedNode(hit);
                }
            } else {
                if (dragNode.current!.fx !== undefined) {
                    dragNode.current!.fx = undefined;
                    dragNode.current!.fy = undefined;
                }
            }
            dragNode.current = null;
        }
        isPanning.current = false;
    }, []);

    const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.9;
        const r = rect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        const newZ = Math.max(0.15, Math.min(3, zoom.current * factor));
        pan.current.x = mx - (mx - pan.current.x) * (newZ / zoom.current);
        pan.current.y = my - (my - pan.current.y) * (newZ / zoom.current);
        zoom.current = newZ;
    }, []);

    // ── Panel node ────────────────────────────────────────────────────────────
    const panelNode = selectedNode || hoveredNode;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '20px' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(139,92,246,0.3)' }}>
                        <Globe size={28} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                            {mode === 'topology' ? 'Structural Topology Map' : 'System Knowledge Graph'}
                        </h1>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                            {mode === 'topology' ? 'Visualizing navigational structure and learned application flow.' : 'Real-time topological representation of structural physics & risk boundaries.'}
                        </p>
                    </div>
                </div>

                {/* Legend (Only in Health mode) */}
                {mode === 'health' && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'default', pointerEvents: 'none', display: 'flex', gap: '16px' }}>
                            {[
                                { label: 'Healthy', color: '#10b981' },
                                { label: 'Medium Risk', color: '#f59e0b' },
                                { label: 'High Risk', color: '#f97316' },
                                { label: 'Critical Risk', color: '#ef4444' },
                            ].map(l => (
                                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, boxShadow: `0 0 8px ${l.color}` }}></span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Map Viewer */}
            <div className="white-card" style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', padding: 0, background: '#0a0f1e', border: '1px solid var(--border-light)' }}>
                {/* ── Canvas Side ────────────────────────────────────────────────── */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>

                    {/* Canvas / loading / empty */}
                    {loading ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ width: '36px', height: '36px', border: '3px solid #1e293b', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '0.9rem' }}>Loading knowledge graph…</span>
                        </div>
                    ) : nodeCount === 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', flexDirection: 'column', gap: '12px', padding: '40px' }}>
                            <Globe size={48} strokeWidth={1} color="#1e293b" />
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem', color: '#475569' }}>No graph data yet</p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>Run Discovery Agent first to build the knowledge graph.</p>
                            <button onClick={() => navigate('/dashboard/agent/discovery')} style={{ marginTop: '10px', padding: '9px 22px', background: '#6366f1', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                                Go to Discovery Agent
                            </button>
                        </div>
                    ) : (
                        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                            <canvas
                                ref={canvasRef}
                                style={{ display: 'block', cursor: hoveredNode ? 'pointer' : 'grab', position: 'absolute', inset: 0 }}
                                onMouseMove={onMouseMove}
                                onMouseDown={onMouseDown}
                                onMouseUp={onMouseUp}
                                onMouseLeave={() => { isPanning.current = false; dragNode.current = null; }}
                                onWheel={onWheel}
                            />
                        </div>
                    )}
                </div>

                {/* ── Right Panel ────────────────────────────────────────────────── */}
                <div style={{ width: '310px', flexShrink: 0, background: '#0a0f1e', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {panelNode ? 'Node Inspector' : 'Hover a node to inspect'}
                    </div>

                    {panelNode ? (
                        <div style={{ padding: '18px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Header */}
                            {(() => {
                                const c = STATUS_COLORS[panelNode.status] || STATUS_COLORS.default;
                                return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${c.fill}22`, border: `1px solid ${c.fill}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.fill }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9' }}>{panelNode.label}</div>
                                            <div style={{ fontSize: '0.72rem', color: c.fill, fontWeight: 600, textTransform: 'capitalize' }}>{panelNode.status}</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Properties */}
                            {([
                                { icon: <Globe size={13} />, label: 'URL', value: panelNode.url || '—', mono: true },
                                { icon: <Layers size={13} />, label: 'Type', value: panelNode.label || '—', mono: false },
                                { icon: <AlertTriangle size={13} />, label: 'Status', value: panelNode.status || '—', mono: false },
                                { icon: <Shield size={13} />, label: 'Intent', value: panelNode.intent || '—', mono: false },
                            ] as { icon: React.ReactNode; label: string; value: string; mono: boolean }[]).map((row, i) => (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '11px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                                        {row.icon}{row.label}
                                    </div>
                                    <div style={{ color: '#e2e8f0', fontSize: '0.83rem', fontFamily: row.mono ? 'monospace' : 'inherit', wordBreak: 'break-all', lineHeight: 1.5 }}>{row.value}</div>
                                </div>
                            ))}

                            {/* Connections */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '11px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                    <Link2 size={13} />Connections
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[
                                        { label: 'Outgoing', count: edges.filter(e => e.from === panelNode.id).length, col: '#6366f1' },
                                        { label: 'Incoming', count: edges.filter(e => e.to === panelNode.id).length, col: '#14b8a6' },
                                    ].map((c, i) => (
                                        <div key={i} style={{ flex: 1, textAlign: 'center', background: `${c.col}12`, borderRadius: '8px', padding: '8px 4px' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: c.col }}>{c.count}</div>
                                            <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 600 }}>{c.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedNode?.id === panelNode.id && (
                                <p style={{ fontSize: '0.72rem', color: '#334155', textAlign: 'center', fontStyle: 'italic', margin: 0 }}>
                                    Click node again to unpin it
                                </p>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#1e293b', padding: '28px' }}>
                            <Globe size={36} strokeWidth={1} />
                            <p style={{ textAlign: 'center', margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                                Hover a node to inspect its properties.<br />Click to pin it in place.
                            </p>
                            <div style={{ width: '100%', marginTop: '16px' }}>
                                <div style={{ fontSize: '0.68rem', color: '#1e293b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Controls</div>
                                {[['Hover', 'Show node details'], ['Click', 'Pin / unpin node'], ['Drag node', 'Reposition'], ['Drag canvas', 'Pan view'], ['Scroll', 'Zoom']]
                                    .map(([k, d]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.78rem' }}>
                                            <span style={{ color: '#334155', fontWeight: 600 }}>{k}</span>
                                            <span style={{ color: '#1e293b' }}>{d}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeGraph;
