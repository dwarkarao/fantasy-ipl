// api/match-stats.js — Vercel Serverless Function
// Called from Admin panel as /api/match-stats?matchId=XXX
// Auto-pulls player stats after a match ends

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { matchId } = req.query;
  if (!matchId) return res.status(400).json({ error: 'matchId required' });

  try {
    const apiKey   = process.env.CRICKET_API_KEY;
    const response = await fetch(
      `https://api.cricketdata.org/cricket/v1/match-scorecard?id=${matchId}&apikey=${apiKey}`
    );
    const data = await response.json();

    if (!data?.data) return res.status(200).json({ stats: {} });

    const scorecard = data.data;
    const stats = {};

    // Parse batting innings
    const innings = scorecard.scorecard || [];
    innings.forEach(inning => {
      // Batting
      (inning.batting || []).forEach(b => {
        const name = b.batsmanName || b.name;
        if (!name) return;
        if (!stats[name]) stats[name] = emptyStats();
        stats[name].runs      = (stats[name].runs || 0) + (parseInt(b.r) || 0);
        stats[name].sixes     = (stats[name].sixes || 0) + (parseInt(b['6s']) || parseInt(b.sixes) || 0);
        if (b.dismissal?.toLowerCase() === 'dnb' || b.dismissal?.toLowerCase() === 'absent')
          stats[name].didNotPlay = true;
      });

      // Bowling
      (inning.bowling || []).forEach(b => {
        const name = b.bowlerName || b.name;
        if (!name) return;
        if (!stats[name]) stats[name] = emptyStats();
        stats[name].wickets      = (stats[name].wickets || 0) + (parseInt(b.w) || 0);
        stats[name].runsConceded = (stats[name].runsConceded || 0) + (parseInt(b.r) || 0);
      });

      // Wickets (catches, stumpings, run-outs)
      (inning.batting || []).forEach(b => {
        const dismissal = (b.dismissal || '').toLowerCase();
        const fielder   = b.fielderName || b.fielder;
        if (!fielder) return;
        if (!stats[fielder]) stats[fielder] = emptyStats();
        if (dismissal.includes('caught'))   stats[fielder].catches   = (stats[fielder].catches || 0) + 1;
        if (dismissal.includes('stumped'))  stats[fielder].stumpings = (stats[fielder].stumpings || 0) + 1;
        if (dismissal.includes('run out'))  stats[fielder].runOuts   = (stats[fielder].runOuts || 0) + 1;
      });
    });

    // Man of Match
    const mom = scorecard.matchHeader?.result?.winnerTeamId
      ? null
      : scorecard.matchHeader?.mom?.name || data.data?.mom;
    if (mom && stats[mom]) stats[mom].isManOfMatch = true;

    return res.status(200).json({ stats });
  } catch (err) {
    console.error('Match stats API error:', err);
    return res.status(500).json({ error: err.message, stats: {} });
  }
}

function emptyStats() {
  return {
    runs: 0, wickets: 0, catches: 0, stumpings: 0,
    runOuts: 0, sixes: 0, runsConceded: 0,
    isManOfMatch: false, isHattrick: false, didNotPlay: false,
  };
}
