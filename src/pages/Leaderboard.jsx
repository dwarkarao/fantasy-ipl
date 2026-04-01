import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateMatchPoints } from '../config/scoring';

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows]       = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      // Load all completed matches
      const matchSnap = await getDocs(collection(db, 'matches'));
      const allMatches = matchSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => new Date(m.dateTimeGMT) <= new Date())
        .sort((a, b) => new Date(a.dateTimeGMT) - new Date(b.dateTimeGMT));
      setMatches(allMatches);

      // Load all stats
      const statsMap = {};
      for (const m of allMatches) {
        const statSnap = await getDocs(collection(db, 'stats', m.id, 'players'));
        statsMap[m.id] = {};
        statSnap.docs.forEach(d => { statsMap[m.id][d.id] = d.data(); });
      }

      // Load all users' picks
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers  = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

      // Calculate points per user per match
      const leaderboard = await Promise.all(allUsers.map(async (u) => {
        let totalPoints = 0;
        const matchBreakdown = {};

        for (const m of allMatches) {
          try {
            const pickDoc = await getDocs(collection(db, 'picks', u.uid, 'matches'));
            const pickData = pickDoc.docs.find(d => d.id === m.id)?.data();

            if (pickData) {
              const phase = m.isPlayoff ? 'playoffs' : 'groupMatches';
              const result = calculateMatchPoints(pickData, statsMap[m.id] || {}, phase);
              totalPoints += result.total;
              matchBreakdown[m.id] = result.total;
            }
          } catch {}
        }

        return {
          uid:      u.uid,
          name:     u.name || u.email?.split('@')[0] || u.uid,
          email:    u.email,
          totalPoints,
          matchBreakdown,
        };
      }));

      leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
      setRows(leaderboard);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
      <div className="fade-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', color: 'var(--gold)', marginBottom: '6px' }}>Leaderboard</h1>
        <p style={{ color: 'var(--muted)' }}>Season standings · {matches.length} match{matches.length !== 1 ? 'es' : ''} played</p>
      </div>

      <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(201,168,76,0.08)', borderBottom: '1px solid var(--border)' }}>
              <th style={th}>#</th>
              <th style={{ ...th, textAlign: 'left' }}>Participant</th>
              {matches.map(m => (
                <th key={m.id} style={{ ...th, fontSize: '11px', maxWidth: '60px' }}>
                  {(m.teams?.[0] || 'T1').substring(0, 3)}<br />
                  <span style={{ color: 'var(--muted)', fontSize: '10px' }}>vs</span><br />
                  {(m.teams?.[1] || 'T2').substring(0, 3)}
                </th>
              ))}
              <th style={{ ...th, color: 'var(--gold)', fontSize: '13px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isMe = row.uid === user?.uid;
              return (
                <tr
                  key={row.uid}
                  onClick={() => setExpanded(expanded === row.uid ? null : row.uid)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isMe ? 'rgba(201,168,76,0.04)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isMe ? 'rgba(201,168,76,0.04)' : 'transparent'; }}
                >
                  <td style={{ ...td, width: '48px' }}>
                    <RankBadge rank={idx + 1} />
                  </td>
                  <td style={{ ...td, fontWeight: isMe ? 700 : 400 }}>
                    {row.name}
                    {isMe && <span className="badge badge-gold" style={{ marginLeft: '8px', fontSize: '11px' }}>You</span>}
                  </td>
                  {matches.map(m => (
                    <td key={m.id} style={{ ...td, textAlign: 'center', color: 'var(--cream-dim)', fontSize: '14px' }}>
                      {row.matchBreakdown[m.id] ?? '–'}
                    </td>
                  ))}
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: 'var(--gold)', fontWeight: 700 }}>
                      {row.totalPoints}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          No scores yet. Complete a match to see rankings.
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) return <span style={{ fontSize: '18px' }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: '18px' }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: '18px' }}>🥉</span>;
  return <span style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 600 }}>{rank}</span>;
}

function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%' }} />
    </div>
  );
}

const th = {
  padding: '14px 16px', textAlign: 'center',
  fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em',
  color: 'var(--cream-dim)', textTransform: 'uppercase',
};
const td = { padding: '14px 16px', fontSize: '15px' };
