import React from 'react';
import { Maximize2, Filter, Download } from 'lucide-react';
import StructuralOverview from '../components/StructuralOverview';

const StructureMap: React.FC = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Structure Map</h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Full topology of discovered pages and interaction flows.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        <Filter size={16} /> Filter
                    </button>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        <Download size={16} /> Export Map
                    </button>
                </div>
            </div>

            {/* Main Map Viewer */}
            <div className="white-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Toolbar inside map */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-tertiary)' }}>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-teal)' }} /> Healthy Nodes (42)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-warning)' }} /> Warning (5)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-danger)' }} /> Critical (2)
                        </span>
                    </div>
                    <div>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Map Canvas Area - We'll reuse the StructuralOverview component but make it take the full space */}
                <div style={{ flex: 1, position: 'relative', background: '#f8fafc', padding: '24px' }}>
                    {/* The structural overview is a component, we will wrap it to fill space */}
                    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                        <StructuralOverview />
                    </div>
                </div>
            </div>

        </div>
    );
};

export default StructureMap;
