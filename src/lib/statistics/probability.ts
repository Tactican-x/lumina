/**
 * Probability and Statistical Inference
 */

export interface ProbabilityResult {
  probability: number;     // 0-100
  confidence: number;      // Confidence in the estimate
  factors: ProbabilityFactor[];
}

export interface ProbabilityFactor {
  name: string;
  weight: number;          // 0-1, how much this factor matters
  currentValue: number;    // Current normalized value (0-1)
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

/**
 * Calculate probability based on weighted factors
 */
export function calculateWeightedProbability(
  factors: ProbabilityFactor[]
): ProbabilityResult {
  if (factors.length === 0) {
    return {
      probability: 50,
      confidence: 0,
      factors: [],
    };
  }

  // Normalize weights to sum to 1
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const normalizedFactors = factors.map(f => ({
    ...f,
    weight: f.weight / totalWeight,
  }));

  // Calculate weighted average
  let weightedSum = 0;
  for (const factor of normalizedFactors) {
    const adjustedValue = factor.impact === 'negative' 
      ? 1 - factor.currentValue 
      : factor.currentValue;
    weightedSum += adjustedValue * factor.weight;
  }

  // Convert to percentage
  const probability = Math.round(weightedSum * 100);

  // Confidence based on factor coverage
  const confidence = Math.round(
    (normalizedFactors.filter(f => f.currentValue > 0).length / normalizedFactors.length) * 100
  );

  return {
    probability,
    confidence,
    factors: normalizedFactors,
  };
}

/**
 * Calculate goal success probability
 */
export function calculateGoalSuccessProbability(params: {
  currentProgress: number;      // 0-1
  daysRemaining: number;
  averageVelocity: number;      // Progress per day
  consistencyScore: number;     // 0-1
  historicalSuccessRate: number; // 0-1
}): ProbabilityResult {
  const {
    currentProgress,
    daysRemaining,
    averageVelocity,
    consistencyScore,
    historicalSuccessRate,
  } = params;

  // Calculate projected completion
  const progressNeeded = 1 - currentProgress;
  const projectedProgress = averageVelocity * daysRemaining;
  const completionRatio = progressNeeded > 0 
    ? Math.min(1, projectedProgress / progressNeeded)
    : 1;

  const factors: ProbabilityFactor[] = [
    {
      name: 'Current Progress',
      weight: 0.25,
      currentValue: currentProgress,
      impact: 'positive',
      description: `${Math.round(currentProgress * 100)}% complete`,
    },
    {
      name: 'Projected Completion',
      weight: 0.35,
      currentValue: completionRatio,
      impact: 'positive',
      description: completionRatio >= 1 
        ? 'On track to complete'
        : `${Math.round(completionRatio * 100)}% of needed progress projected`,
    },
    {
      name: 'Consistency',
      weight: 0.2,
      currentValue: consistencyScore,
      impact: 'positive',
      description: `${Math.round(consistencyScore * 100)}% consistent effort`,
    },
    {
      name: 'Historical Success',
      weight: 0.2,
      currentValue: historicalSuccessRate,
      impact: 'positive',
      description: `${Math.round(historicalSuccessRate * 100)}% past goal completion`,
    },
  ];

  return calculateWeightedProbability(factors);
}

/**
 * Calculate streak survival probability
 */
export function calculateStreakSurvivalProbability(params: {
  streakLength: number;
  averageCompletionRate: number;  // 0-1
  missedYesterday: boolean;
  currentEnergyLevel: number;     // 0-1
  dayOfWeek: number;              // 0-6
  weekendCompletionRate: number;  // 0-1
}): ProbabilityResult {
  const {
    streakLength,
    averageCompletionRate,
    missedYesterday,
    currentEnergyLevel,
    dayOfWeek,
    weekendCompletionRate,
  } = params;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const relevantCompletionRate = isWeekend 
    ? weekendCompletionRate 
    : averageCompletionRate;

  // Streak momentum - longer streaks are harder to break
  const streakMomentum = Math.min(1, streakLength / 21); // Max at 21 days

  const factors: ProbabilityFactor[] = [
    {
      name: 'Historical Completion',
      weight: 0.35,
      currentValue: relevantCompletionRate,
      impact: 'positive',
      description: `${Math.round(relevantCompletionRate * 100)}% completion rate`,
    },
    {
      name: 'Streak Momentum',
      weight: 0.25,
      currentValue: streakMomentum,
      impact: 'positive',
      description: `${streakLength}-day streak momentum`,
    },
    {
      name: 'Current Energy',
      weight: 0.2,
      currentValue: currentEnergyLevel,
      impact: 'positive',
      description: `Energy at ${Math.round(currentEnergyLevel * 100)}%`,
    },
    {
      name: 'Yesterday Status',
      weight: 0.2,
      currentValue: missedYesterday ? 0.3 : 1,
      impact: 'positive',
      description: missedYesterday 
        ? 'Missed yesterday - be extra careful'
        : 'On track from yesterday',
    },
  ];

  return calculateWeightedProbability(factors);
}

/**
 * Calculate burnout probability
 */
export function calculateBurnoutProbability(params: {
  currentLoad: number;          // 0-1 (cognitive load)
  baselineLoad: number;         // 0-1 (normal load)
  restDaysLast2Weeks: number;   // Number of rest days
  sleepQualityTrend: number;    // -1 to 1 (trend direction)
  taskCompletionTrend: number;  // -1 to 1
  missedHabitsLastWeek: number;
  totalHabitsLastWeek: number;
}): ProbabilityResult {
  const {
    currentLoad,
    baselineLoad,
    restDaysLast2Weeks,
    sleepQualityTrend,
    taskCompletionTrend,
    missedHabitsLastWeek,
    totalHabitsLastWeek,
  } = params;

  // Calculate overload ratio
  const overloadRatio = baselineLoad > 0 
    ? Math.max(0, (currentLoad - baselineLoad) / baselineLoad)
    : 0;

  // Rest days factor (ideal is 2-4 per 2 weeks)
  const restFactor = restDaysLast2Weeks >= 2 && restDaysLast2Weeks <= 4
    ? 1
    : restDaysLast2Weeks < 2
    ? restDaysLast2Weeks / 2
    : Math.max(0, 1 - (restDaysLast2Weeks - 4) * 0.1);

  // Habit miss ratio
  const missRatio = totalHabitsLastWeek > 0
    ? missedHabitsLastWeek / totalHabitsLastWeek
    : 0;

  const factors: ProbabilityFactor[] = [
    {
      name: 'Cognitive Overload',
      weight: 0.3,
      currentValue: Math.min(1, overloadRatio),
      impact: 'negative', // Higher overload = higher burnout risk
      description: overloadRatio > 0.5 
        ? `Load ${Math.round(overloadRatio * 100)}% above baseline`
        : 'Load within normal range',
    },
    {
      name: 'Rest & Recovery',
      weight: 0.25,
      currentValue: restFactor,
      impact: 'positive',
      description: `${restDaysLast2Weeks} rest days in last 2 weeks`,
    },
    {
      name: 'Sleep Quality Trend',
      weight: 0.2,
      currentValue: (sleepQualityTrend + 1) / 2, // Convert -1,1 to 0,1
      impact: 'positive',
      description: sleepQualityTrend > 0 
        ? 'Sleep quality improving'
        : sleepQualityTrend < 0
        ? 'Sleep quality declining'
        : 'Sleep quality stable',
    },
    {
      name: 'Habit Consistency',
      weight: 0.25,
      currentValue: 1 - missRatio,
      impact: 'positive',
      description: `${Math.round((1 - missRatio) * 100)}% habits completed`,
    },
  ];

  // For burnout, we want the inverse (high risk = high probability)
  const result = calculateWeightedProbability(factors);

  // Invert for burnout (100% factors = low burnout risk = low probability)
  return {
    ...result,
    probability: 100 - result.probability,
  };
}

/**
 * Standard normal distribution CDF
 * (for calculating probabilities from z-scores)
 */
export function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate z-score
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.sqrt(variance);
}
