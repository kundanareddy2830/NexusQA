import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Search, Shield, BarChart2, Link2, Bot, FileText, Network } from 'lucide-react';

const Landing: React.FC = () => {
    const navigate = useNavigate();
    const [showLogin, setShowLogin] = useState(false);

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate('/dashboard');
    };

    return (
        <div style={{ position: 'relative', width: '100%', overflowX: 'hidden' }}>
            {/* Login Modal Overlay */}
            {showLogin && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowLogin(false)}>
                    <div className="white-card" style={{
                        width: '100%', maxWidth: '400px', padding: '40px', background: 'white',
                        display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onClick={() => setShowLogin(false)}
                        >
                            ✕
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '48px', height: '48px', margin: '0 auto 16px', borderRadius: '12px',
                                background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-teal)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Network size={24} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Welcome Back</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Sign in to NexusQA</p>
                        </div>

                        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Email</label>
                                <input type="email" placeholder="name@company.com" required style={{ width: '100%', padding: '12px', border: '1px solid var(--border-strong)', borderRadius: '8px', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Password</label>
                                <input type="password" placeholder="••••••••" required style={{ width: '100%', padding: '12px', border: '1px solid var(--border-strong)', borderRadius: '8px', outline: 'none' }} />
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '14px' }}>Sign In</button>
                        </form>
                    </div>
                </div>
            )}
            {/* Background Mesh Gradient */}
            <div className="bg-gradient-mesh" style={{
                height: '1400px',
                background: 'linear-gradient(to bottom right, #f0fdfa, #e0f2fe, #f8fafc 80%)'
            }} />

            {/* Navbar */}
            <nav style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '24px 64px', maxWidth: '1400px', margin: '0 auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-teal)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold',
                        fontSize: '1.2rem'
                    }}>
                        N
                    </div>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                        Nexus<span style={{ color: 'var(--accent-blue)' }}>QA</span>
                    </span>
                </div>

                {/* Removed How It Works link from navbar */}

                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>

                    <button style={{
                        background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', fontSize: '1rem'
                    }} onClick={() => setShowLogin(true)}>
                        Sign In
                    </button>

                    <button className="btn-primary" onClick={() => setShowLogin(true)} style={{ borderRadius: '24px', padding: '10px 20px' }}>
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main style={{ maxWidth: '1000px', margin: '80px auto 0', textAlign: 'center', padding: '0 24px' }}>
                <div className="pill-badge" style={{ marginBottom: '24px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-success)' }}></span>
                    AI-Powered Quality Analysis
                </div>

                <h1 style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '24px', color: 'var(--text-primary)' }}>
                    Autonomous Web App <br />
                    <span className="text-gradient">Quality Intelligence</span>
                </h1>

                <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto 40px', lineHeight: 1.6 }}>
                    AI that explores, understands, and evaluates your web app — no test scripts needed. Get a complete quality report in minutes.
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '80px' }}>
                    <button className="btn-primary" onClick={() => setShowLogin(true)} style={{ padding: '14px 28px', fontSize: '1.05rem', borderRadius: '8px' }}>
                        Get Started Free <ArrowRight size={18} />
                    </button>
                    <button
                        className="btn-secondary"
                        style={{ padding: '14px 28px', fontSize: '1.05rem', borderRadius: '8px', background: 'white' }}
                        onClick={() => {
                            document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        <Play size={18} /> See How It Works
                    </button>
                </div>
            </main>

            {/* Features Section */}
            <section style={{ maxWidth: '1200px', margin: '0 auto 120px', textAlign: 'center', padding: '0 24px' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>Everything you need to ensure quality</h2>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 60px' }}>
                    Three powerful capabilities that work together to give you complete visibility into your web app's health.
                </p>

                <div style={{ display: 'flex', gap: '24px', textAlign: 'left' }}>
                    <div className="white-card" style={{ flex: 1, padding: '40px 32px', textAlign: 'left' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <Search size={24} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Auto-Discovery</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>AI crawls and maps your entire web app automatically — exposing every page, modal, and user flow.</p>
                    </div>

                    <div className="white-card" style={{ flex: 1, padding: '40px 32px', textAlign: 'left' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <Shield size={24} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Quality Scoring</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Get a 0–100 health score based on real structural analysis, UI hygiene, and silent console errors.</p>
                    </div>

                    <div className="white-card" style={{ flex: 1, padding: '40px 32px', textAlign: 'left' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <BarChart2 size={24} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Smart Insights</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Broken pages, dead flows, and errors — found instantly with clear context so your team can fix them fast.</p>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" style={{ maxWidth: '1200px', margin: '0 auto 120px', textAlign: 'center', padding: '0 24px' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>How it works</h2>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto 60px', lineHeight: 1.6 }}>
                    We deploy a swarm of 3 specialized AI agents that autonomously explore, analyze, and report on your application's quality — zero manual scripting required.
                </p>

                <div style={{ display: 'flex', gap: '32px', position: 'relative', alignItems: 'stretch' }}>
                    {/* Connecting line */}
                    <div style={{ position: 'absolute', top: '90px', left: '150px', right: '150px', height: '1px', background: 'var(--border-strong)', zIndex: 0 }} />

                    {[
                        {
                            step: '01',
                            icon: <Link2 size={28} />,
                            title: 'Discovery Agent',
                            desc: 'Enter your URL and our crawler takes over.',
                            bullets: [
                                'Navigates to your entry URL',
                                'Extracts full DOM layout structures',
                                'Identifies all interactive elements',
                                'Maps the complete routing graph'
                            ]
                        },
                        {
                            step: '02',
                            icon: <Bot size={28} />,
                            title: 'Analysis Agent',
                            desc: 'Deep inspection of discovered pages.',
                            bullets: [
                                'Runs comprehensive accessibility checks',
                                'Detects broken flows & dead ends',
                                'Validates UI responsiveness across devices',
                                'Identifies network & console errors'
                            ]
                        },
                        {
                            step: '03',
                            icon: <FileText size={28} />,
                            title: 'Reporting Agent',
                            desc: 'Final synthesis and prioritization.',
                            bullets: [
                                'Synthesizes findings from all agents',
                                'Prioritizes critical issues by severity',
                                'Calculates an overall Health Score',
                                'Generates actionable, exportable reports'
                            ]
                        }
                    ].map((item, i) => (
                        <div key={i} className="white-card" style={{ flex: 1, padding: '40px 32px', textAlign: 'left', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ color: 'var(--accent-blue)', fontWeight: 700, marginBottom: '16px', fontSize: '0.9rem' }}>{item.step}</div>
                            <div style={{
                                width: '72px', height: '72px', margin: '0 auto 24px',
                                background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)',
                                borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {item.icon}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', textAlign: 'center' }}>{item.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', textAlign: 'center', marginBottom: '32px', minHeight: '48px' }}>{item.desc}</p>

                            <div style={{ marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: 'fit-content', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                                    {item.bullets.map((bullet, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            <div style={{ paddingTop: '5px', flexShrink: 0 }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-teal)' }} />
                                            </div>
                                            <span style={{ lineHeight: 1.4 }}>{bullet}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                background: 'var(--bg-secondary)', padding: '60px 24px', textAlign: 'center',
                borderTop: '1px solid var(--border-light)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{
                        width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-teal)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.75rem'
                    }}>
                        N
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                        Nexus<span style={{ color: 'var(--accent-blue)' }}>QA</span>
                    </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontWeight: 500 }}>
                    Built for the future of quality engineering.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    © 2026 NexusQA. All rights reserved.
                </p>
            </footer>
        </div>
    );
};

export default Landing;
