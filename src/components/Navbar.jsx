import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const s = {
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(7,26,15,0.92)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border)',
    padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: '62px',
  },
  logo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '20px',
    fontWeight: 900,
    color: 'var(--gold)',
    letterSpacing: '-0.02em',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  links: { display: 'flex', alignItems: 'center', gap: '4px' },
  right: { display: 'flex', alignItems: 'center', gap: '12px' },
  userLabel: { fontSize: '13px', color: 'var(--muted)' },
};

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkStyle = ({ isActive }) => ({
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: isActive ? 'var(--gold)' : 'var(--cream-dim)',
    background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
    transition: 'all 0.15s',
    border: '1px solid',
    borderColor: isActive ? 'rgba(201,168,76,0.25)' : 'transparent',
  });

  return (
    <nav style={s.nav}>
      <div style={s.logo}>
        🏏 Fantasy IPL
      </div>

      <div style={s.links}>
        <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/leaderboard" style={linkStyle}>Leaderboard</NavLink>
        {isAdmin && <NavLink to="/admin" style={linkStyle}>Admin</NavLink>}
      </div>

      <div style={s.right}>
        <span style={s.userLabel}>{user?.email?.split('@')[0]}</span>
        <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
