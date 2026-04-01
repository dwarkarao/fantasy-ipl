import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const ROLES = ['batsman', 'bowler', 'any', 'sub'];
const ROLE_LABELS = { batsman: '🏏 Batsman', bowler: '🎳 Bowler', any: '⚡ Any', sub: '🔄 Sub' };
const STARS = [
  { value: 'normal',     label: 'Normal', icon: '' },
  { value: 'singleStar', label: '⭐ Star', icon: '⭐' },
  { value: 'tripleStar', label: '⭐⭐⭐ Triple', icon: '⭐⭐⭐' },
];
const MAX_FOREIGN = 2;

const emptyPick = () => ({ batsman: null, bowler: null, any: null, sub: null });

export default function PickTeam() {
  const { matchId }  = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();

  const [match, setMatch]     = useState(null);
  const [squad, setSquad]     = useState({ team1: [], team2: [] });
  const [picks, setPicks]     = useState({ team1: emptyPick(), team2: emptyPick() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);

  useEffect(() => { loadData(); }, [matchId]);

  const loadData = async () => {
    try {
      // Load match
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      if (!matchDoc.exists()) { navigate('/dashboard'); return; }
      const matchData = { id: matchDoc.id, ...matchDoc.data() };
      setMatch(matchData);

      // Check if locked
      if (new Date(matchData.dateTimeGMT) <= new Date()) {
        // Still show picks read-only
      }

      // Load squad from Vercel API function
      try {
        const res   = await fetch(`/api/squads?matchId=${matchData.apiMatchId || matchId}`);
        const data  = await res.json();
        const s1 = data.squad?.team1 || data.team1 || matchData.squad?.team1 || [];
        const s2 = data.squad?.team2 || data.team2 || matchData.squad?.team2 || [];
        setSquad({ team1: normaliseSquad(s1), team2: normaliseSquad(s2) });
      } catch {
        // Fall back to squad stored in Firestore by admin
        setSquad({
          team1: normaliseSquad(matchData.squad?.team1 || []),
          team2: normaliseSquad(matchData.squad?.team2 || []),
        });
      }

      // Load existing picks
      const pickDoc = await getDoc(doc(db, 'picks', user.uid, 'matches', matchId));
      if (pickDoc.exists()) {
        const d = pickDoc.data();
        setPicks({ team1: d.team1 || emptyPick(), team2: d.team2 || emptyPick() });
      }
    } catch (err) {
      setError('Failed to load match data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Count total foreign picks
  const foreignCount = () => {
    let count = 0;
    ['team1', 'team2'].forEach(side => {
      ROLES.forEach(role => {
        if (picks[side][role]?.isForeign) count++;
      });
    });
    return count;
  };

  const setPick = (side, role, playerName) => {
    const squadList = squad[side];
    const player    = squadList.find(p => p.name === playerName);
    if (!player) {
      setPicks(prev => ({ ...prev, [side]: { ...prev[side], [role]: null } }));
      return;
    }
    // Check foreign limit
    const currentPick = picks[side][role];
    const willAdd    = player.isForeign && !currentPick?.isForeign;
    const willRemove = !player.isForeign && currentPick?.isForeign;
    if (willAdd && !willRemove && foreignCount() >= MAX_FOREIGN) {
      setError(`Max ${MAX_FOREIGN} foreign players allowed across all 8 picks.`);
      return;
    }
    setError('');
    setPicks(prev => ({
      ...prev,
      [side]: { ...prev[side], [role]: { ...player, stars: prev[side][role]?.stars || 'normal' } },
    }));
  };

  const setStars = (side, role, stars) => {
    setPicks(prev => ({
      ...prev,
      [side]: {
        ...prev[side],
        [role]: prev[side][role] ? { ...prev[side][role], stars } : null,
      },
    }));
  };

  const validate = () => {
    for (const side of ['team1', 'team2']) {
      for (const role of ROLES) {
        if (!picks[side][role]) return `Please pick a ${ROLE_LABELS[role].replace(/[^\w ]/g, '').trim()} for ${match.teams?.[side === 'team1' ? 0 : 1] || side}.`;
      }
    }
    if (foreignCount() > MAX_FOREIGN) return `Max ${MAX_FOREIGN} foreign players allowed.`;
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, 'picks', user.uid, 'matches', matchId), {
        team1:     picks.team1,
        team2:     picks.team2,
        savedAt:   serverTimestamp(),
        userId:    user.uid,
        matchId,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isLocked = match && new Date(match.dateTimeGMT) <= new Date();

  if (loading) return <Loader />;

  const team1Name = match?.teams?.[0] || 'Team 1';
  const team2Name = match?.teams?.[1] || 'Team 2';
  const fc = foreignCount();

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '28px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '28px', color: 'var(--gold)' }}>
          {team1Name} <span style={{ color: 'var(--muted)', fontSize: '20px' }}>vs</span> {team2Name}
        </h1>
        <div style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
          {match && new Date(match.dateTimeGMT).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
          {isLocked && <span className="badge badge-red" style={{ marginLeft: '10px' }}>Locked</span>}
        </div>
      </div>

      {/* Foreign player counter */}
      <div className="fade-up" style={{
        background: fc >= MAX_FOREIGN ? 'rgba(224,85,85,0.1)' : 'rgba(201,168,76,0.08)',
        border: `1px solid ${fc >= MAX_FOREIGN ? 'rgba(224,85,85,0.3)' : 'rgba(201,168,76,0.2)'}`,
        borderRadius: '10px', padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '24px',
      }}>
        <span style={{ fontSize: '20px' }}>🌍</span>
        <div>
          <strong style={{ color: fc >= MAX_FOREIGN ? 'var(--red)' : 'var(--gold)', fontSize: '15px' }}>
            Foreign players: {fc} / {MAX_FOREIGN}
          </strong>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Max {MAX_FOREIGN} foreign players allowed across all 8 picks
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {Array.from({ length: MAX_FOREIGN }).map((_, i) => (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: i < fc ? 'var(--red)' : 'var(--border)',
              border: '1px solid var(--border-light)',
            }} />
          ))}
        </div>
      </div>

      {/* Two team columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { side: 'team1', name: team1Name, squadList: squad.team1 },
          { side: 'team2', name: team2Name, squadList: squad.team2 },
        ].map(({ side, name, squadList }) => (
          <TeamColumn
            key={side}
            side={side}
            teamName={name}
            squadList={squadList}
            picks={picks[side]}
            onPick={(role, player) => setPick(side, role, player)}
            onStars={(role, stars) => setStars(side, role, stars)}
            locked={isLocked}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)',
          borderRadius: '8px', padding: '12px 16px', color: 'var(--red)', fontSize: '14px',
          marginTop: '20px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Save button */}
      {!isLocked && (
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
          {saved && <span style={{ color: 'var(--green)', fontSize: '14px' }}>✓ Picks saved!</span>}
          <button className="btn btn-gold" onClick={handleSave} disabled={saving} style={{ padding: '12px 32px', fontSize: '15px' }}>
            {saving ? 'Saving…' : 'Save picks'}
          </button>
        </div>
      )}
    </div>
  );
}

function TeamColumn({ side, teamName, squadList, picks, onPick, onStars, locked }) {
  return (
    <div className="card fade-up" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '18px', color: 'var(--cream)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        {teamName}
      </h3>
      {ROLES.map(role => (
        <PickRow
          key={role}
          role={role}
          pick={picks[role]}
          squadList={squadList}
          onPick={player => onPick(role, player)}
          onStars={stars => onStars(role, stars)}
          locked={locked}
        />
      ))}
    </div>
  );
}

function PickRow({ role, pick, squadList, onPick, onStars, locked }) {
  const isSub = role === 'sub';
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {ROLE_LABELS[role]}
        {isSub && <span style={{ color: 'var(--cream-dim)', fontWeight: 400, textTransform: 'none', marginLeft: 4 }}>— plays if a main player misses</span>}
      </div>

      {/* Player dropdown */}
      <select
        value={pick?.name || ''}
        onChange={e => onPick(e.target.value)}
        disabled={locked}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${pick ? 'var(--border-light)' : 'var(--border)'}`,
          borderRadius: '7px', padding: '9px 12px',
          color: pick ? 'var(--cream)' : 'var(--muted)', fontSize: '14px',
          outline: 'none', cursor: locked ? 'not-allowed' : 'pointer',
        }}
      >
        <option value="">— Select player —</option>
        {squadList.map(p => (
          <option key={p.name} value={p.name}>
            {p.name}{p.isForeign ? ' 🌍' : ''}
          </option>
        ))}
      </select>

      {/* Star level selector */}
      {pick && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '7px' }}>
          {STARS.map(s => (
            <button
              key={s.value}
              onClick={() => !locked && onStars(s.value)}
              disabled={locked}
              style={{
                flex: 1, padding: '5px 4px',
                borderRadius: '6px', border: '1px solid',
                fontSize: '12px', fontWeight: 600,
                borderColor: pick.stars === s.value ? 'var(--gold)' : 'var(--border)',
                background: pick.stars === s.value ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: pick.stars === s.value ? 'var(--gold)' : 'var(--muted)',
                cursor: locked ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function normaliseSquad(raw) {
  if (!raw || raw.length === 0) return [];
  return raw.map(p => {
    if (typeof p === 'string') return { name: p, isForeign: false };
    return {
      name:      p.name || p.playerName || p,
      isForeign: p.isForeign || p.isOverseas || false,
      role:      p.role || '',
    };
  });
}

function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%' }} />
    </div>
  );
}
