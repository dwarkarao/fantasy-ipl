import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const STAT_FIELDS = [
  { key: 'runs',          label: 'Runs',           type: 'number' },
  { key: 'wickets',       label: 'Wickets',        type: 'number' },
  { key: 'catches',       label: 'Catches',        type: 'number' },
  { key: 'stumpings',     label: 'Stumpings',      type: 'number' },
  { key: 'runOuts',       label: 'Run Outs',       type: 'number' },
  { key: 'sixes',         label: 'Sixes',          type: 'number' },
  { key: 'runsConceded',  label: 'Runs Conceded',  type: 'number' },
  { key: 'isManOfMatch',  label: 'Man of Match',   type: 'bool' },
  { key: 'isHattrick',    label: 'Hat-trick',      type: 'bool' },
  { key: 'didNotPlay',    label: 'Did Not Play',   type: 'bool' },
];

export default function Admin() {
  const [tab, setTab]         = useState('matches');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [stats, setStats]     = useState({});
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  // New match form
  const [newMatch, setNewMatch] = useState({ team1: '', team2: '', dateTimeGMT: '', venue: '', apiMatchId: '', isPlayoff: false });

  useEffect(() => { loadMatches(); }, []);

  const loadMatches = async () => {
    const snap = await getDocs(collection(db, 'matches'));
    const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                         .sort((a, b) => new Date(a.dateTimeGMT) - new Date(b.dateTimeGMT));
    setMatches(all);
    setLoading(false);
  };

  const loadStats = async (matchId, matchData) => {
    setSelectedMatch({ id: matchId, ...matchData });
    const snap = await getDocs(collection(db, 'stats', matchId, 'players'));
    const s = {};
    snap.docs.forEach(d => { s[d.id] = d.data(); });
    // Also pre-populate with players from squads
    const allPlayers = [
      ...(matchData.squad?.team1 || []),
      ...(matchData.squad?.team2 || []),
    ].map(p => typeof p === 'string' ? p : p.name).filter(Boolean);
    allPlayers.forEach(name => {
      if (!s[name]) s[name] = { runs: 0, wickets: 0, catches: 0, stumpings: 0, runOuts: 0, sixes: 0, runsConceded: 0, isManOfMatch: false, isHattrick: false, didNotPlay: false };
    });
    setStats(s);
    setTab('stats');
  };

  const saveStats = async () => {
    if (!selectedMatch) return;
    setSaving(true);
    try {
      for (const [playerName, playerStats] of Object.entries(stats)) {
        await setDoc(doc(db, 'stats', selectedMatch.id, 'players', playerName), {
          ...playerStats,
          updatedAt: serverTimestamp(),
        });
      }
      flash('Stats saved successfully ✓');
    } catch (err) {
      flash('Error saving stats: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addMatch = async () => {
    if (!newMatch.team1 || !newMatch.team2 || !newMatch.dateTimeGMT) {
      flash('Team 1, Team 2, and Date/Time are required.');
      return;
    }
    try {
      await addDoc(collection(db, 'matches'), {
        teams:       [newMatch.team1, newMatch.team2],
        dateTimeGMT: new Date(newMatch.dateTimeGMT).toISOString(),
        venue:       newMatch.venue,
        apiMatchId:  newMatch.apiMatchId,
        isPlayoff:   newMatch.isPlayoff,
        createdAt:   serverTimestamp(),
      });
      flash('Match added ✓');
      setNewMatch({ team1: '', team2: '', dateTimeGMT: '', venue: '', apiMatchId: '', isPlayoff: false });
      loadMatches();
    } catch (err) {
      flash('Error: ' + err.message);
    }
  };

  const fetchStatsFromApi = async () => {
    if (!selectedMatch?.apiMatchId) {
      flash('No API Match ID set for this match. Add it first via Edit Match.');
      return;
    }
    try {
      const res  = await fetch(`/api/match-stats?matchId=${selectedMatch.apiMatchId}`);
      const data = await res.json();
      if (data.stats) {
        setStats(prev => ({ ...prev, ...data.stats }));
        flash('Stats pulled from API. Review and save.');
      } else {
        flash('API returned no stats. Enter manually.');
      }
    } catch {
      flash('API fetch failed. Enter stats manually.');
    }
  };

  const updateStat = (player, key, value) => {
    setStats(prev => ({
      ...prev,
      [player]: { ...prev[player], [key]: value },
    }));
  };

  const addPlayer = (name) => {
    if (!name || stats[name]) return;
    setStats(prev => ({
      ...prev,
      [name]: { runs: 0, wickets: 0, catches: 0, stumpings: 0, runOuts: 0, sixes: 0, runsConceded: 0, isManOfMatch: false, isHattrick: false, didNotPlay: false },
    }));
  };

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  if (loading) return <Loader />;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>
      <div className="fade-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', color: 'var(--gold)' }}>Admin Panel</h1>
        <p style={{ color: 'var(--muted)' }}>Manage matches and enter player stats after each game.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { key: 'matches', label: '📅 Matches' },
          { key: 'add',     label: '➕ Add Match' },
          ...(selectedMatch ? [{ key: 'stats', label: `📊 Stats: ${selectedMatch.teams?.[0] || ''} vs ${selectedMatch.teams?.[1] || ''}` }] : []),
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn ${tab === t.key ? 'btn-gold' : 'btn-outline'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.3)', borderRadius: '8px', padding: '12px 16px', color: 'var(--green)', marginBottom: '16px', fontSize: '14px' }}>
          {msg}
        </div>
      )}

      {/* Matches list */}
      {tab === 'matches' && (
        <div className="fade-up">
          {matches.map(m => {
            const isPast = new Date(m.dateTimeGMT) <= new Date();
            return (
              <div key={m.id} className="card" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                    {m.teams?.[0] || 'TBD'} vs {m.teams?.[1] || 'TBD'}
                    {m.isPlayoff && <span className="badge badge-gold" style={{ marginLeft: '8px' }}>Playoff</span>}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
                    {new Date(m.dateTimeGMT).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                    {m.venue && ` · ${m.venue}`}
                  </div>
                </div>
                {isPast && (
                  <button className="btn btn-outline" onClick={() => loadStats(m.id, m)}>
                    Enter / Edit Stats
                  </button>
                )}
                {!isPast && <span className="badge badge-muted">Upcoming</span>}
              </div>
            );
          })}
          {matches.length === 0 && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>No matches yet. Add one above.</div>}
        </div>
      )}

      {/* Add match */}
      {tab === 'add' && (
        <div className="card fade-up">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Add New Match</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Team 1 Name" value={newMatch.team1} onChange={v => setNewMatch(p => ({ ...p, team1: v }))} placeholder="e.g. Mumbai Indians" />
            <Field label="Team 2 Name" value={newMatch.team2} onChange={v => setNewMatch(p => ({ ...p, team2: v }))} placeholder="e.g. Chennai Super Kings" />
            <Field label="Date & Time (IST)" value={newMatch.dateTimeGMT} onChange={v => setNewMatch(p => ({ ...p, dateTimeGMT: v }))} type="datetime-local" />
            <Field label="Venue" value={newMatch.venue} onChange={v => setNewMatch(p => ({ ...p, venue: v }))} placeholder="e.g. Wankhede Stadium" />
            <Field label="API Match ID (from CricketData.org)" value={newMatch.apiMatchId} onChange={v => setNewMatch(p => ({ ...p, apiMatchId: v }))} placeholder="e.g. abc123" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '24px' }}>
              <input type="checkbox" id="playoff" checked={newMatch.isPlayoff} onChange={e => setNewMatch(p => ({ ...p, isPlayoff: e.target.checked }))} />
              <label htmlFor="playoff" style={{ color: 'var(--cream-dim)' }}>Playoff match (higher scoring rules)</label>
            </div>
          </div>
          <button className="btn btn-gold" onClick={addMatch} style={{ marginTop: '20px' }}>Add Match</button>
        </div>
      )}

      {/* Stats editor */}
      {tab === 'stats' && selectedMatch && (
        <div className="fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '18px' }}>
              {selectedMatch.teams?.[0]} vs {selectedMatch.teams?.[1]}
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" onClick={fetchStatsFromApi}>⬇ Auto-pull from API</button>
              <AddPlayerInline onAdd={addPlayer} />
              <button className="btn btn-gold" onClick={saveStats} disabled={saving}>{saving ? 'Saving…' : 'Save Stats'}</button>
            </div>
          </div>

          {Object.keys(stats).length === 0 ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>
              No players yet. Click "Auto-pull from API" or add players manually.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(201,168,76,0.06)' }}>
                    <th style={{ ...th2, textAlign: 'left' }}>Player</th>
                    {STAT_FIELDS.map(f => <th key={f.key} style={th2}>{f.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats).map(([name, s]) => (
                    <tr key={name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...td2, fontWeight: 500 }}>{name}</td>
                      {STAT_FIELDS.map(f => (
                        <td key={f.key} style={{ ...td2, textAlign: 'center' }}>
                          {f.type === 'bool' ? (
                            <input
                              type="checkbox"
                              checked={!!s[f.key]}
                              onChange={e => updateStat(name, f.key, e.target.checked)}
                              style={{ width: 16, height: 16, cursor: 'pointer' }}
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={s[f.key] || 0}
                              onChange={e => updateStat(name, f.key, parseInt(e.target.value) || 0)}
                              style={{
                                width: '56px', background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border)', borderRadius: '5px',
                                padding: '4px 6px', color: 'var(--cream)', textAlign: 'center',
                                fontSize: '14px',
                              }}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', color: 'var(--cream-dim)', marginBottom: '6px', fontWeight: 500 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '7px', padding: '10px 12px', color: 'var(--cream)', fontSize: '14px', outline: 'none' }}
      />
    </div>
  );
}

function AddPlayerInline({ onAdd }) {
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <input
        placeholder="Add player name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { onAdd(name); setName(''); } }}
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 12px', color: 'var(--cream)', fontSize: '13px', width: '160px' }}
      />
      <button className="btn btn-outline" style={{ padding: '8px 12px' }} onClick={() => { onAdd(name); setName(''); }}>Add</button>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%' }} />
    </div>
  );
}

const th2 = { padding: '12px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--cream-dim)', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'center' };
const td2 = { padding: '10px 10px', fontSize: '14px' };
