import React from 'react';

interface DummyPageProps {
    title: string;
    icon?: React.ReactNode;
}

const DummyPage: React.FC<DummyPageProps> = ({ title, icon }) => {
    return (
        <div className="white-card" style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 32px',
            textAlign: 'center',
            minHeight: '400px'
        }}>
            {icon && (
                <div style={{
                    width: '64px', height: '64px', borderRadius: '16px',
                    background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '24px'
                }}>
                    {icon}
                </div>
            )}
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                {title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', lineHeight: 1.6 }}>
                This module is currently in development. Check back soon for full AI-powered {title.toLowerCase()} capabilities.
            </p>
        </div>
    );
};

export default DummyPage;
