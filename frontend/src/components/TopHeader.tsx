import React from 'react';
import { Search, Zap, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopHeaderProps {
    onAnalyze?: (url: string) => void;
    isAnalyzed?: boolean;
}

const TopHeader: React.FC<TopHeaderProps> = ({ onAnalyze, isAnalyzed }) => {
    const [url, setUrl] = React.useState('');
    const navigate = useNavigate();
    return (
        <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 32px',
            margin: '20px',
            marginLeft: '0',
            marginBottom: '0',
            background: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
            backdropFilter: 'blur(12px)', // Glassmorphism blur effect
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            minHeight: '80px' // Keep a consistent height even if empty
        }}>
            {/* Removed the redundant NexusQA Dashboard title as requested */}

            {/* ── Back button (always visible) ── */}
            <button
                onClick={() => navigate(-1)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'none', border: '1px solid var(--border-light)',
                    borderRadius: '8px', padding: '7px 14px',
                    color: 'var(--text-secondary)', fontWeight: 600,
                    fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                }}
            >
                <ChevronLeft size={15} strokeWidth={2.5} />
                Back
            </button>

            {isAnalyzed && (
                <div className="header-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="input-group" style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        width: '400px'
                    }}>
                        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
                        <input
                            type="text"
                            placeholder="Enter Web Application URL"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 42px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-strong)',
                                background: 'white',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--accent-blue)';
                                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--border-strong)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <button
                        className="btn-primary"
                        style={{ padding: '12px 24px', opacity: url ? 1 : 0.5, cursor: url ? 'pointer' : 'not-allowed' }}
                        onClick={() => {
                            if (url && onAnalyze) onAnalyze(url);
                        }}
                        disabled={!url}
                    >
                        <Zap size={18} />
                        Analyze Application
                    </button>
                </div>
            )}
        </header>
    );
};

export default TopHeader;
