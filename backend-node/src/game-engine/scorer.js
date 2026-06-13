const { getTeam } = require("./trick");

/**
 * Detect coat: did one team win the first 7 tricks consecutively?
 * @param {Array} trickWinners - array of seat indices in order
 */
function detectCoat(trickWinners) {
  if (trickWinners.length < 7) return null;
  const firstTeam = getTeam(trickWinners[0]);
  if (!firstTeam) return null;
  for (let i = 1; i < 7; i++) {
    if (getTeam(trickWinners[i]) !== firstTeam) return null;
  }
  return firstTeam; // coat winner
}

/**
 * Detect court: did one team win all 13 tricks?
 */
function detectCourt(trickWinners) {
  if (trickWinners.length < 13) return null;
  const firstTeam = getTeam(trickWinners[0]);
  if (!firstTeam) return null;
  if (trickWinners.every((s) => getTeam(s) === firstTeam)) return firstTeam;
  return null;
}

/**
 * Given completed trick winners (13 entries), return hand result.
 * Returns { winningTeam, tricksA, tricksB, isCourt, isCoat, pointsA, pointsB }
 */
function scoreHand(trickWinners) {
  const tricksA = trickWinners.filter((s) => s !== null && s !== undefined && getTeam(s) === "A").length;
  const tricksB = trickWinners.filter((s) => s !== null && s !== undefined && getTeam(s) === "B").length;
  const winningTeam = tricksA >= 7 ? "A" : "B";
  const isCourt = detectCourt(trickWinners) !== null;
  const isCoat = detectCoat(trickWinners) !== null;

  let pointsA = 0;
  let pointsB = 0;

  if (isCourt) {
    if (winningTeam === "A") { pointsA += 2; pointsB -= 2; }
    else { pointsB += 2; pointsA -= 2; }
  } else {
    if (winningTeam === "A") pointsA += 1;
    else pointsB += 1;
  }

  return { winningTeam, tricksA, tricksB, isCourt, isCoat, pointsA, pointsB };
}

/** Check if the match is over (first to 7 points wins) */
function checkMatchOver(scoreA, scoreB, targetScore = 7) {
  if (scoreA >= targetScore) return "A";
  if (scoreB >= targetScore) return "B";
  return null;
}

module.exports = { detectCoat, detectCourt, scoreHand, checkMatchOver };
