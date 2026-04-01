// ─────────────────────────────────────────────────────────────────────────────
// SCORING RULES — Edit this file to change how points are calculated
// All values here are used everywhere in the app automatically
// ─────────────────────────────────────────────────────────────────────────────

export const SCORING_RULES = {

  // ── BASE POINTS PER ACTION (by player tier and match phase) ──────────────
  groupMatches: {
    tripleStar: {
      runsPerRun: 6,
      pointsPerWicket: 150,
      pointsPerCatch: 20,
      runsConceededPenalty: -2,
    },
    singleStar: {
      runsPerRun: 6,
      pointsPerWicket: 150,
      pointsPerCatch: 20,
      runsConceededPenalty: -2,
    },
    normal: {
      runsPerRun: 1,
      pointsPerWicket: 75,
      pointsPerCatch: 10,
      runsConceededPenalty: -1,
    },
  },

  playoffs: {
    tripleStar: {
      runsPerRun: 8,
      pointsPerWicket: 250,
      pointsPerCatch: 30,
      runsConceededPenalty: -3,
    },
    singleStar: {
      runsPerRun: 6,
      pointsPerWicket: 150,
      pointsPerCatch: 20,
      runsConceededPenalty: -2,
    },
    normal: {
      runsPerRun: 1,
      pointsPerWicket: 75,
      pointsPerCatch: 20,
      runsConceededPenalty: -1,
    },
  },

  // ── SPECIAL BONUSES (only the highest bonus applies per player) ───────────
  specialBonuses: {
    century: 100,           // 100+ runs
    halfCentury: 25,        // 50–99 runs
    fiveWickets: 100,       // 5+ wickets
    threeWickets: 50,       // 3 wickets (only if runs < 50)
    wicketHatrick: 100,     // Hat-trick
    threeCatches: 50,       // 3+ catches/stumpings/run-outs
    maximumSixes: 50,       // 6+ sixes
    manOfMatch: 50,         // Man of the Match (Normal/Single Star)
    manOfMatchStar: 100,    // Man of the Match (Triple Star)
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// calculatePoints — Core scoring function
// playerStats: { runs, wickets, catches, stumpings, runOuts, sixes,
//                runsConceded, isManOfMatch, isHattrick, didNotPlay }
// playerLevel: 'tripleStar' | 'singleStar' | 'normal'
// phase: 'groupMatches' | 'playoffs'
// ─────────────────────────────────────────────────────────────────────────────
export function calculatePoints(playerStats, playerLevel = 'normal', phase = 'groupMatches') {
  if (!playerStats || playerStats.didNotPlay) return 0;

  const rules = SCORING_RULES[phase] || SCORING_RULES.groupMatches;
  const levelRule = rules[playerLevel] || rules.normal;
  const bonuses = SCORING_RULES.specialBonuses;

  // Base scoring
  const runPoints      = (playerStats.runs || 0) * levelRule.runsPerRun;
  const wicketPoints   = (playerStats.wickets || 0) * levelRule.pointsPerWicket;
  const fieldingTotal  = (playerStats.catches || 0) + (playerStats.stumpings || 0) + (playerStats.runOuts || 0);
  const catchPoints    = fieldingTotal * levelRule.pointsPerCatch;
  const concedePenalty = (playerStats.runsConceded || 0) * levelRule.runsConceededPenalty;

  let points = runPoints + wicketPoints + catchPoints + concedePenalty;

  // Special bonuses — only the highest applies
  let highestBonus = 0;

  if ((playerStats.runs || 0) >= 100)      highestBonus = Math.max(highestBonus, bonuses.century);
  else if ((playerStats.runs || 0) >= 50)  highestBonus = Math.max(highestBonus, bonuses.halfCentury);

  if ((playerStats.wickets || 0) >= 5)     highestBonus = Math.max(highestBonus, bonuses.fiveWickets);
  else if ((playerStats.wickets || 0) >= 3 && (playerStats.runs || 0) < 50)
                                           highestBonus = Math.max(highestBonus, bonuses.threeWickets);

  if (playerStats.isHattrick)              highestBonus = Math.max(highestBonus, bonuses.wicketHatrick);
  if (fieldingTotal >= 3)                  highestBonus = Math.max(highestBonus, bonuses.threeCatches);
  if ((playerStats.sixes || 0) >= 6)       highestBonus = Math.max(highestBonus, bonuses.maximumSixes);

  if (playerStats.isManOfMatch) {
    const momBonus = playerLevel === 'tripleStar' ? bonuses.manOfMatchStar : bonuses.manOfMatch;
    highestBonus = Math.max(highestBonus, momBonus);
  }

  points += highestBonus;
  return Math.round(points);
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateMatchPoints — Total points for one user's picks in one match
// picks: { team1: { batsman, bowler, any, sub }, team2: { ... } }
//   each slot: { name, stars, isForeign }
//   stars: 'tripleStar' | 'singleStar' | 'normal'
// stats: { [playerName]: playerStats }
// phase: 'groupMatches' | 'playoffs'
// ─────────────────────────────────────────────────────────────────────────────
export function calculateMatchPoints(picks, stats = {}, phase = 'groupMatches') {
  let total = 0;
  const breakdown = {};

  ['team1', 'team2'].forEach(side => {
    const sidePicks = picks[side] || {};
    ['batsman', 'bowler', 'any', 'sub'].forEach(role => {
      const pick = sidePicks[role];
      if (!pick || !pick.name) return;

      const playerStats = stats[pick.name] || {};
      const mainPlayers = ['batsman', 'bowler', 'any'];

      // Sub only scores if one of the main 3 didn't play
      if (role === 'sub') {
        const anyMainMissed = mainPlayers.some(r => {
          const main = sidePicks[r];
          return main?.name && stats[main.name]?.didNotPlay;
        });
        if (!anyMainMissed) return;
      }

      const pts = calculatePoints(playerStats, pick.stars, phase);
      total += pts;
      breakdown[`${side}_${role}`] = { name: pick.name, stars: pick.stars, points: pts };
    });
  });

  return { total, breakdown };
}
