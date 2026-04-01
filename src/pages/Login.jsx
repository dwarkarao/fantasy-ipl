import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 60% 20%, #0d3320 0%, var(--bg) 65%)',
      padding: '24px',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: '600px', height: '600px',
          borderRadius: '50%', top: '-200px', right: '-200px',
          background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', width: '400px', height: '400px',
          borderRadius: '50%', bottom: '-100px', left: '-100px',
          background: 'radial-gradient(circle, rgba(76,175,125,0.05) 0%, transparent 70%)',
        }} />
      </div>

      <div className="card fade-up" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏏</div>
          <h1 style={{ fontSize: '28px', color: 'var(--gold)', marginBottom: '6px' }}>
            Fantasy IPL
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Sign in to manage your team
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--cream-dim)', marginBottom: '6px', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="user1@fantasyipl.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--cream-dim)', marginBottom: '6px', fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(224,85,85,0.1)',
              border: '1px solid rgba(224,85,85,0.3)',
              borderRadius: '8px',
              padding: '12px',
              color: 'var(--red)',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-gold"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px' }}
          >
            {loading ? <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #1a0e00', borderTopColor: 'transparent', borderRadius: '50%' }} /> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
          Default password: <code style={{ color: 'var(--cream-dim)', background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: '4px' }}>demo123</code>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '11px 14px',
  color: 'var(--cream)',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.15s',
};
