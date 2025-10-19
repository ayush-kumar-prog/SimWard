/**
 * Scoring System for SimWard
 * Phase 6: Calculate performance metrics based on timing, correctness, completeness, and calibration
 */

import type { 
  RunHistoryEntry, 
  Scenario, 
  SimulationState, 
  ScoreBreakdown, 
  RunMetrics,
  ScoringWeights 
} from '../types';

/**
 * Calculate timing score based on how quickly critical actions were performed
 * Score range: 0-40 points
 * 
 * @param history - Array of action history entries
 * @param scenario - Scenario with scoring rules
 * @returns Timing score (0-40)
 */
export function calculateTimingScore(
  history: RunHistoryEntry[], 
  scenario: Scenario
): number {
  const timers = scenario.scoring.timers;
  let totalPoints = 0;
  let maxPossiblePoints = 0;

  // For each action that has timing rules
  Object.entries(timers).forEach(([actionId, buckets]) => {
    // Find when this action was performed
    const actionEntry = history.find(entry => entry.actionId === actionId);
    
    if (!actionEntry) {
      // Action not performed - gets 0 points but still counts toward max
      const maxBucketPoints = Math.max(...Object.values(buckets));
      maxPossiblePoints += maxBucketPoints;
      return;
    }

    const timeTaken = actionEntry.t; // Time in seconds
    let pointsAwarded = 0;

    // Find which bucket the time falls into
    // Buckets are like: {"<=30": 20, "<=60": 15, ">60": 0}
    const sortedBuckets = Object.entries(buckets).sort((a, b) => {
      // Sort by the numeric threshold
      const getThreshold = (key: string) => {
        if (key.startsWith('<=')) return parseInt(key.slice(2));
        if (key.startsWith('>')) return parseInt(key.slice(1));
        return parseInt(key);
      };
      return getThreshold(a[0]) - getThreshold(b[0]);
    });

    for (const [threshold, points] of sortedBuckets) {
      if (threshold.startsWith('<=')) {
        const limit = parseInt(threshold.slice(2));
        if (timeTaken <= limit) {
          pointsAwarded = points;
          break;
        }
      } else if (threshold.startsWith('>')) {
        const limit = parseInt(threshold.slice(1));
        if (timeTaken > limit) {
          pointsAwarded = points;
        }
      }
    }

    totalPoints += pointsAwarded;
    const maxBucketPoints = Math.max(...Object.values(buckets));
    maxPossiblePoints += maxBucketPoints;
  });

  // Normalize to 0-40 scale
  if (maxPossiblePoints === 0) return 0;
  return Math.round((totalPoints / maxPossiblePoints) * 40);
}

/**
 * Calculate correctness score based on whether actions taken were correct
 * Score range: 0-40 points
 * 
 * @param history - Array of action history entries
 * @param scenario - Scenario with scoring rules
 * @returns Correctness score (0-40)
 */
export function calculateCorrectnessScore(
  history: RunHistoryEntry[],
  scenario: Scenario
): number {
  const correctActions = scenario.scoring.correct;
  let correctCount = 0;
  let totalActions = 0;

  // For each action in history
  history.forEach(entry => {
    const nodeId = entry.nodeId;
    const actionId = entry.actionId;

    // Check if this node has correct action definitions
    if (correctActions[nodeId]) {
      totalActions++;
      // Check if the action taken was in the list of correct actions
      if (correctActions[nodeId].includes(actionId)) {
        correctCount++;
      }
    }
  });

  // Normalize to 0-40 scale
  if (totalActions === 0) return 0;
  return Math.round((correctCount / totalActions) * 40);
}

/**
 * Calculate completeness score based on checklist, teach-backs, and hint usage
 * Score range: 0-20 points
 * 
 * @param state - Current simulation state
 * @param scenario - Scenario with scoring rules
 * @returns Completeness score (0-20)
 */
export function calculateCompletenessScore(
  state: SimulationState,
  scenario: Scenario
): number {
  const completenessRules = scenario.scoring.completeness;
  let points = 0;

  // Add points for checklist items
  state.checklist.forEach(itemId => {
    if (completenessRules.checklist[itemId]) {
      points += completenessRules.checklist[itemId];
    }
  });

  // Add points for teach-back passes
  const teachbackPasses = state.history.filter(
    entry => entry.teachback !== undefined
  ).length;
  
  if (teachbackPasses > 0) {
    points += completenessRules.teachback_pass * teachbackPasses;
  }

  // Subtract hint penalty
  if (state.hintsUsed > 0) {
    points -= completenessRules.hint_penalty * state.hintsUsed;
  }

  // Ensure score is within 0-20 range
  return Math.max(0, Math.min(20, Math.round(points)));
}

/**
 * Calculate calibration score using Brier score
 * Measures how well confidence ratings align with actual correctness
 * Score range: 0-100
 * 
 * @param history - Array of action history entries with uncertainty and correct values
 * @returns Calibration score (0-100)
 */
export function calculateCalibrationScore(history: RunHistoryEntry[]): number {
  // Filter entries that have both uncertainty and correctness data
  const calibratableEntries = history.filter(
    entry => entry.uncertainty !== undefined && entry.correct !== undefined
  );

  if (calibratableEntries.length === 0) {
    return 0; // No calibration data available
  }

  // Calculate Brier score: mean((p - y)²)
  // where p = stated probability (uncertainty), y = actual outcome (1 or 0)
  let sumSquaredError = 0;

  calibratableEntries.forEach(entry => {
    const p = entry.uncertainty!; // Confidence as 0-1
    const y = entry.correct ? 1 : 0; // Actual correctness
    sumSquaredError += Math.pow(p - y, 2);
  });

  const brierScore = sumSquaredError / calibratableEntries.length;

  // Convert to calibration score: 100 × (1 - Brier)
  // Perfect calibration (Brier = 0) → score = 100
  // Worst calibration (Brier = 1) → score = 0
  const calibrationScore = 100 * (1 - brierScore);

  return Math.round(calibrationScore);
}

/**
 * Calculate total weighted score
 * 
 * @param scores - Individual score components
 * @param weights - Weights for each component
 * @returns Total weighted score (0-100)
 */
export function calculateTotalScore(
  scores: Omit<ScoreBreakdown, 'total'>,
  weights: ScoringWeights
): number {
  // Normalize timing and correctness from 0-40 to 0-1
  const timingNormalized = scores.timing / 40;
  const correctnessNormalized = scores.correctness / 40;
  
  // Normalize completeness from 0-20 to 0-1
  const completenessNormalized = scores.completeness / 20;
  
  // Calibration is already 0-100, normalize to 0-1
  const calibrationNormalized = scores.calibration / 100;

  // Apply weights (which sum to 100)
  const weightedSum = 
    (timingNormalized * weights.timing) +
    (correctnessNormalized * weights.correctness) +
    (completenessNormalized * weights.completeness) +
    (calibrationNormalized * weights.calibration);

  return Math.round(weightedSum);
}

/**
 * Calculate all scores for a completed run
 * 
 * @param state - Final simulation state
 * @param scenario - Scenario with scoring rules
 * @returns Complete score breakdown
 */
export function calculateAllScores(
  state: SimulationState,
  scenario: Scenario
): ScoreBreakdown {
  const timing = calculateTimingScore(state.history, scenario);
  const correctness = calculateCorrectnessScore(state.history, scenario);
  const completeness = calculateCompletenessScore(state, scenario);
  const calibration = calculateCalibrationScore(state.history);

  const total = calculateTotalScore(
    { timing, correctness, completeness, calibration },
    scenario.scoring.weights
  );

  return {
    total,
    timing,
    correctness,
    completeness,
    calibration
  };
}

/**
 * Calculate run metrics for analytics
 * 
 * @param history - Array of action history entries
 * @param scenario - Scenario definition
 * @param state - Final simulation state
 * @returns Run metrics
 */
export function calculateMetrics(
  history: RunHistoryEntry[],
  scenario: Scenario,
  state: SimulationState
): RunMetrics {
  // Find time to first critical action
  // Critical actions are those with timing rules
  const criticalActionIds = Object.keys(scenario.scoring.timers);
  const firstCriticalAction = history.find(entry => 
    criticalActionIds.includes(entry.actionId)
  );
  const timeToCritical = firstCriticalAction?.t;

  // Determine branch classification
  let branch: 'good' | 'delay' | 'timeout' = 'good';
  
  // Check if any timeouts occurred (look for timeout_next transitions)
  const hasTimeout = history.some(entry => {
    const node = scenario.nodes[entry.nodeId];
    return node?.timeout_next !== undefined;
  });

  if (hasTimeout) {
    branch = 'timeout';
  } else if (timeToCritical !== undefined && timeToCritical > 60) {
    // If critical action took > 60s, classify as delay
    branch = 'delay';
  }

  // Count teach-back passes
  const teachbackEntries = history.filter(entry => entry.teachback !== undefined);
  const teachbackPasses = teachbackEntries.filter(entry => {
    // In a real scenario, we'd check if the teach-back was graded as passing
    // For now, assume presence of teach-back indicates attempt
    return entry.teachback && entry.teachback.length > 0;
  }).length;

  return {
    timeToCritical,
    branch,
    checklistTicks: state.checklist,
    usedHints: state.hintsUsed,
    teachbackPasses,
    totalTeachbacks: teachbackEntries.length
  };
}

/**
 * Mark actions in history as correct/incorrect based on scenario rules
 * This should be called during simulation as actions are taken
 * 
 * @param entry - History entry to evaluate
 * @param scenario - Scenario with correctness rules
 * @returns Updated history entry with correct flag
 */
export function markActionCorrectness(
  entry: RunHistoryEntry,
  scenario: Scenario
): RunHistoryEntry {
  const correctActions = scenario.scoring.correct[entry.nodeId];
  
  if (!correctActions) {
    // No correctness rules for this node
    return entry;
  }

  return {
    ...entry,
    correct: correctActions.includes(entry.actionId)
  };
}
