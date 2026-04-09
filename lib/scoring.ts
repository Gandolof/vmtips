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
  
    if (predictedOutcome !== actualOutcome) {
      return 0;
    }
  
    const goalsWrong =
      Math.abs(predictedHome - actualHome) +
      Math.abs(predictedAway - actualAway);
  
    return Math.max(0, 8 - goalsWrong);
  }