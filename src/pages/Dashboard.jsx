import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [matches, setMatches]   = useState([]);
  const [picks, setPicks]       = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      // Load matches from Firestore (admin adds them)
      const snap = await getDocs(collection(db, 'matches'));
      const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by date ascending
      all.sort((a, b) => new Date(a.dateTimeGMT) - new Date(b.dateTimeGMT));
      setMatches(all);

      // Load this user's picks
      const picksSnap = await getDocs(collection(db, 'picks', user.uid, 'matches'));
      const picksMap  = {};
      picksSnap.docs.forEach(d => { picksMap[d.id] = d.data(); });
      setPicks(picksMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const now      = new Date();
  const upcoming = matches.filter(m => new Date(m.dateTimeGMT) > now);
  const past     = matches.filter(m => new Date(m.dateTimeGMT) <= now);

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }} className="fade-up">
        <h1 style={{ fontSize: '32px', color: 'var(--gold)', marginBottom: '6px' }}>
          Your Dashboard
        </h1>
        <p style={{ color: 'var(--muted)' }}>Pick your team before each match starts. Sub plays if any main player misses out.</p>
      </div>

      {/* Upcoming Matches */}
      <Section title="Upcoming Matches" icon="🗓️">
        {upcoming.length === 0 ? (
          <EmptyState text="No upcoming matches right now. Check back soon." />
        ) : upcoming.map((m, i) => (
          <MatchCard
            key={m.id}
            match={m}
            pick={picks[m.id]}
            onPick={() => navigate(`/pick/${m.id}`)}
            delay={i * 60}
          />
        ))}
      </Section>

      {/* Past Matches */}
      {past.length > 0 && (
        <Section title="Past Matches" icon="📋" style={{ marginTop: '40px' }}>
          {past.map((m, i) => (
            <MatchCard
              key={m.id}
              match={m}
              pick={picks[m.id]}
              past
              delay={i * 40}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function MatchCard({ match, pick, onPick, past, delay = 0 }) {
  const matchDate  = new Date(match.dateTimeGMT);
  const hasPick    = pick && pick.team1 && pick.team2;
  const isLocked   = matchDate <= new Date();
  const team1      = match.teams?.[0] || match.team1 || 'TBD';
  const team2      = match.teams?.[1] || match.team2 || 'TBD';

  const dateStr = matchDate.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
  const timeStr = matchDate.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });

  return (
    <div
      className="fade-up"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '12px',
        animationDelay: `${delay}ms`,
        flexWrap: 'wrap',
      }}
    >
      {/* Teams */}
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: 700 }}>
            {team1}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600 }}>vs</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: 700 }}>
            {team2}
          </span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
          {dateStr} · {timeStr} IST
          {match.venue && <span> · {match.venue}</span>}
        </div>
      </div>

      {/* Status + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {hasPick ? (
          <span className="badge badge-green">✓ Picked</span>
        ) : isLocked ? (
          <span className="badge badge-red">Missed</span>
        ) : (
          <span className="badge badge-muted">Not picked</span>
        )}

        {!past && !isLocked && (
          <button className="btn btn-gold" onClick={onPick} style={{ padding: '8px 18px' }}>
            {hasPick ? 'Edit picks' : 'Pick team'}
          </button>
        )}
        {!past && isLocked && hasPick && (
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Locked</span>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children, style }) {
  return (
    <div style={style}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--cream-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '40px', textAlign: 'center',
      color: 'var(--muted)',
    }}>
      {text}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
        <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', margin: '0 auto 12px' }} />
        Loading matches…
      </div>
    </div>
  );
}
