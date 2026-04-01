// api/matches.js — Vercel Serverless Function
// Called client-side as /api/matches
// Runs server-side to avoid CORS issues with CricketData.org

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const apiKey   = process.env.CRICKET_API_KEY;
    const response = await fetch(
      `https://api.cricketdata.org/cricket/v1/matches?apikey=${apiKey}&offset=0`
    );
    const data = await response.json();

    if (!data?.data) {
      return res.status(200).json({ matches: [] });
    }

    // Filter for IPL matches
    const iplMatches = data.data.filter(m => {
      const series = (m.series || m.matchType || '').toLowerCase();
      return (
        series.includes('ipl') ||
        series.includes('indian premier') ||
        m.matchType === 'T20'
      );
    });

    // Normalise shape
    const normalised = iplMatches.map(m => ({
      apiMatchId:  m.id,
      teams:       m.teams || [m.t1, m.t2].filter(Boolean),
      teamInfo:    m.teamInfo || [],
      dateTimeGMT: m.dateTimeGMT,
      venue:       m.venue || '',
      status:      m.status || '',
      matchType:   m.matchType || 'T20',
    }));

    return res.status(200).json({ matches: normalised });
  } catch (err) {
    console.error('Matches API error:', err);
    return res.status(500).json({ error: err.message, matches: [] });
  }
}
