export function getOutcome(home: number, away: number) {
    if (home > away) return "HOME";
    if (home < away) return "AWAY";
    return "DRAW";
  }
  
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
) {
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return 10;
  }

  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  const actualOutcome = getOutcome(actualHome, actualAway);
  const homeExact = predictedHome === actualHome;
  const awayExact = predictedAway === actualAway;

  if (predictedOutcome === actualOutcome) {
    const goalsWrong =
      Math.abs(predictedHome - actualHome) +
      Math.abs(predictedAway - actualAway);

    return Math.max(0, 8 - goalsWrong);
  }

  const predictedWinner =
    predictedOutcome === "HOME" || predictedOutcome === "AWAY"
      ? predictedOutcome
      : null;
  const actualWinner =
    actualOutcome === "HOME" || actualOutcome === "AWAY" ? actualOutcome : null;

  if (predictedWinner && actualWinner && predictedWinner !== actualWinner) {
    return 0;
  }

  const goalsWrong =
    Math.abs(predictedHome - actualHome) +
    Math.abs(predictedAway - actualAway);

  return Math.max(0, 5 - goalsWrong);
}
