// api/squads.js — Vercel Serverless Function
// Called client-side as /api/squads?matchId=XXX

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { matchId } = req.query;
  if (!matchId) return res.status(400).json({ error: 'matchId required' });

  try {
    const apiKey   = process.env.CRICKET_API_KEY;
    const response = await fetch(
      `https://api.cricketdata.org/cricket/v1/match-squads?id=${matchId}&apikey=${apiKey}`
    );
    const data = await response.json();

    if (!data?.data) return res.status(200).json({ team1: [], team2: [] });

    const squads = data.data;

    // CricketData.org returns squad per team — normalise
    const normaliseTeam = (players = []) =>
      players.map(p => ({
        name:      p.name || p.playerName || String(p),
        isForeign: p.country ? p.country.toLowerCase() !== 'india' : false,
        role:      p.role || '',
      }));

    const team1Players = normaliseTeam(squads[0]?.players || squads.squad?.team1 || []);
    const team2Players = normaliseTeam(squads[1]?.players || squads.squad?.team2 || []);

    return res.status(200).json({ team1: team1Players, team2: team2Players });
  } catch (err) {
    console.error('Squads API error:', err);
    return res.status(500).json({ error: err.message, team1: [], team2: [] });
  }
}
