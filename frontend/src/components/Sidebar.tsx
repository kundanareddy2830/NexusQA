import React from 'react';
import { LayoutDashboard, Network, AlertCircle, FileText, Bot, Search, PenTool } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC = () => {
    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard', exact: true },
        { icon: <Network size={20} />, label: 'Structure Map', path: '/dashboard/structure' },
        { icon: <AlertCircle size={20} />, label: 'Issues', path: '/dashboard/issues' },
        { icon: <FileText size={20} />, label: 'Reports', path: '/dashboard/reports' },
    ];

    const agentItems = [
        { icon: <Search size={20} />, label: 'Discovery Agent', path: '/dashboard/agent/discovery' },
        { icon: <Bot size={20} />, label: 'Analysis Agent', path: '/dashboard/agent/analysis' },
        { icon: <PenTool size={20} />, label: 'Reporting Agent', path: '/dashboard/agent/reporting' },
    ];

    return (
        <aside className="white-card" style={{
            width: '260px',
            height: 'calc(100vh - 40px)',
            margin: '20px',
            marginRight: '0',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
        }}>
            <div className="brand" style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--accent-teal)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 'bold'
                }}>
                    N
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    Nexus<span style={{ color: 'var(--accent-blue)' }}>QA</span>
                </h2>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', paddingLeft: '16px' }}>
                    Platform
                </div>
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        end={item.exact}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                            background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            fontWeight: isActive ? 600 : 500,
                        })}
                    >
                        {React.cloneElement(item.icon, {
                            color: 'currentColor',
                            className: "nav-icon"
                        })}
                        <span>{item.label}</span>
                    </NavLink>
                ))}

                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '16px', marginBottom: '4px', paddingLeft: '16px' }}>
                    AI Agents
                </div>
                {agentItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)',
                            background: isActive ? 'rgba(20, 184, 166, 0.05)' : 'transparent',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            fontWeight: isActive ? 600 : 500,
                        })}
                    >
                        {React.cloneElement(item.icon, {
                            color: 'currentColor',
                            className: "nav-icon"
                        })}
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="footer-promo" style={{
                marginTop: 'auto',
                padding: '16px',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                border: '1px solid var(--border-light)'
            }}>
                Built for the future of quality engineering.
            </div>
        </aside>
    );
};

export default Sidebar;
