import React from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { Outlet, useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [isAnalyzed, setIsAnalyzed] = React.useState(false);

    const handleAnalyze = (_url: string) => {
        // Reset state
        setIsAnalyzed(false);

        // 1. Go to Discovery Agent
        navigate('/dashboard/agent/discovery');

        // 2. Go to Analysis Agent after 3s
        setTimeout(() => {
            navigate('/dashboard/agent/analysis');

            // 3. Go to Reporting Agent after 3s
            setTimeout(() => {
                navigate('/dashboard/agent/reporting');

                // 4. Finish and show Dashboard Home after 3s
                setTimeout(() => {
                    setIsAnalyzed(true);
                    navigate('/dashboard');
                }, 4000);
            }, 4000);
        }, 4000);
    };

    return (
        <div className="app-container" style={{ background: 'var(--bg-primary)' }}>
            {/* Decorative background elements */}
            <div className="bg-gradient-mesh" style={{
                position: 'fixed',
                background: 'linear-gradient(to bottom right, #f0fdfa, #eff6ff, #f8fafc 80%)',
            }} />

            <div className="main-content" style={{ position: 'relative', zIndex: 1, paddingRight: '20px' }}>
                <Sidebar />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                    <TopHeader onAnalyze={handleAnalyze} isAnalyzed={isAnalyzed} />

                    <main className="page-content" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                        paddingTop: '24px',
                        paddingBottom: '40px'
                    }}>
                        <Outlet context={{ isAnalyzed, handleAnalyze }} />

                    </main>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
