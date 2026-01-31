/**
 * Prediction Engine
 * 
 * Generates forecasts for:
 * - Daily performance
 * - Goal completion probability
 * - Burnout risk
 * - Streak vulnerability
 * - Optimal scheduling
 */

import { 
  linearRegression, 
  analyzeTrend, 
  projectValue,
  movingAverage,
  exponentialMovingAverage
} from '../statistics/regression';
import { 
  calculateGoalSuccessProbability,
  calculateStreakSurvivalProbability,
  calculateBurnoutProbability,
  calculateWeightedProbability,
  ProbabilityFactor
} from '../statistics/probability';
import { descriptiveStats } from '../statistics';
import { formatDateKey, daysUntil, getLastNDays } from '@/utils/date';

// ==========================================
// TYPES
// ==========================================

export interface PerformancePrediction {
  date: string;
  predictedScore: number;        // 0-100
  confidence: number;            // 0-100
  range: {
    low: number;
    high: number;
  };
  factors: PredictionFactor[];
  recommendation: string;
}

export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;                // How much this affects prediction
  description: string;
}

export interface GoalPrediction {
  goalId: string;
  successProbability: number;    // 0-100
  projectedCompletionDate: Date | null;
  daysAhead: number;             // Days ahead/behind schedule
  confidence: number;
  momentum: 'accelerating' | 'steady' | 'slowing' | 'stalled';
  factors: PredictionFactor[];
  recommendations: string[];
}

export interface BurnoutPrediction {
  riskLevel: number;             // 0-100
  daysUntilCritical: number | null;
  confidence: number;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  factors: PredictionFactor[];
  preventionSteps: string[];
}

export interface StreakPrediction {
  habitId: string;
  survivalProbability: number;   // 0-100 chance of maintaining streak
  riskLevel: 'low' | 'medium' | 'high';
  vulnerableDays: string[];      // Dates where streak is at risk
  protectionStrategies: string[];
}

export interface HistoricalPerformance {
  date: string;
  score: number;
  habitCompletionRate: number;
  taskCompletionRate: number;
  energyLevel: number;
}

export interface HabitData {
  id: string;
  name: string;
  currentStreak: number;
  completionRate: number;        // 0-1
  lastCompleted: string | null;
}

export interface GoalData {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  targetDate: Date | null;
  createdAt: Date;
  progressHistory: { date: string; value: number }[];
}

// ==========================================
// PERFORMANCE PREDICTION
// ==========================================

/**
 * Predict performance for the next N days
 */
export function predictPerformance(
  historicalData: HistoricalPerformance[],
  daysToPredict: number = 3
): PerformancePrediction[] {
  if (historicalData.length < 7) {
    return generateDefaultPredictions(daysToPredict);
  }

  // Sort by date
  const sorted = [...historicalData].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Extract scores for analysis
  const scores = sorted.map(d => d.score);
  const stats = descriptiveStats(scores);
  
  // Calculate trend
  const trend = analyzeTrend(scores, sorted.length);
  
  // Calculate recent momentum (last 7 days vs previous 7)
  const recent7 = scores.slice(-7);
  const previous7 = scores.slice(-14, -7);
  const recentAvg = recent7.reduce((a, b) => a + b, 0) / recent7.length;
  const previousAvg = previous7.length > 0
    ? previous7.reduce((a, b) => a + b, 0) / previous7.length
    : recentAvg;
  const momentum = (recentAvg - previousAvg) / (previousAvg || 1);

  // Generate predictions
  const predictions: PerformancePrediction[] = [];
  const today = new Date();

  for (let i = 1; i <= daysToPredict; i++) {
    const predictionDate = new Date(today);
    predictionDate.setDate(predictionDate.getDate() + i);
    
    // Project value using regression
    const projected = projectValue(scores, i);
    
    // Adjust for momentum
    const momentumAdjustment = momentum * 10 * i;
    let predictedScore = projected.value + momentumAdjustment;
    
    // Bound to valid range
    predictedScore = Math.max(0, Math.min(100, predictedScore));
    
    // Calculate confidence (decreases with distance)
    const confidence = Math.max(20, projected.confidence - (i * 5));
    
    // Calculate prediction range
    const range = {
      low: Math.max(0, predictedScore - stats.stdDev * (1 + i * 0.2)),
      high: Math.min(100, predictedScore + stats.stdDev * (1 + i * 0.2)),
    };

    // Determine factors
    const factors = generatePredictionFactors(sorted, i, trend);
    
    // Generate recommendation
    const recommendation = generatePerformanceRecommendation(
      predictedScore, 
      factors,
      trend.direction
    );

    predictions.push({
      date: formatDateKey(predictionDate),
      predictedScore: Math.round(predictedScore),
      confidence: Math.round(confidence),
      range: {
        low: Math.round(range.low),
        high: Math.round(range.high),
      },
      factors,
      recommendation,
    });
  }

  return predictions;
}

function generateDefaultPredictions(days: number): PerformancePrediction[] {
  const predictions: PerformancePrediction[] = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    predictions.push({
      date: formatDateKey(date),
      predictedScore: 50,
      confidence: 20,
      range: { low: 30, high: 70 },
      factors: [{
        name: 'Insufficient Data',
        impact: 'neutral',
        weight: 1,
        description: 'Need at least 7 days of history for predictions',
      }],
      recommendation: 'Keep tracking your habits and tasks for personalized predictions!',
    });
  }

  return predictions;
}

function generatePredictionFactors(
  data: HistoricalPerformance[],
  daysAhead: number,
  trend: ReturnType<typeof analyzeTrend>
): PredictionFactor[] {
  const factors: PredictionFactor[] = [];
  const recent = data.slice(-7);
  
  // Factor 1: Recent trend
  factors.push({
    name: 'Performance Trend',
    impact: trend.direction === 'up' ? 'positive' 
      : trend.direction === 'down' ? 'negative' 
      : 'neutral',
    weight: 0.3,
    description: trend.description,
  });

  // Factor 2: Habit completion
  const avgHabitRate = recent.reduce((sum, d) => sum + d.habitCompletionRate, 0) / recent.length;
  factors.push({
    name: 'Habit Consistency',
    impact: avgHabitRate > 0.7 ? 'positive' : avgHabitRate < 0.4 ? 'negative' : 'neutral',
    weight: 0.25,
    description: `${Math.round(avgHabitRate * 100)}% habit completion rate recently`,
  });

  // Factor 3: Energy levels
  const avgEnergy = recent.reduce((sum, d) => sum + d.energyLevel, 0) / recent.length;
  factors.push({
    name: 'Energy Pattern',
    impact: avgEnergy > 65 ? 'positive' : avgEnergy < 40 ? 'negative' : 'neutral',
    weight: 0.25,
    description: `Average energy at ${Math.round(avgEnergy)}%`,
  });

  // Factor 4: Day of week pattern
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  const dayOfWeek = targetDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  factors.push({
    name: 'Day of Week',
    impact: 'neutral',
    weight: 0.2,
    description: isWeekend 
      ? 'Weekend - performance patterns may differ' 
      : 'Weekday - typical structure available',
  });

  return factors;
}

function generatePerformanceRecommendation(
  predictedScore: number,
  factors: PredictionFactor[],
  trend: 'up' | 'down' | 'stable'
): string {
  if (predictedScore >= 75) {
    return 'High performance expected! Schedule your most important work for this day.';
  }
  
  if (predictedScore >= 50) {
    if (trend === 'up') {
      return 'Good day ahead. Momentum is building - keep up your current habits.';
    }
    return 'Average day predicted. Focus on your core habits to maintain stability.';
  }
  
  if (trend === 'down') {
    return 'Consider a lighter schedule. Focus on recovery and essential tasks only.';
  }
  
  return 'Energy may be lower. Prioritize ruthlessly and protect time for rest.';
}

// ==========================================
// GOAL PREDICTION
// ==========================================

/**
 * Predict probability of completing a goal
 */
export function predictGoalSuccess(goal: GoalData): GoalPrediction {
  const now = new Date();
  
  // Calculate current progress
  const progressPercent = goal.targetValue > 0
    ? goal.currentValue / goal.targetValue
    : 0;

  // Calculate days remaining
  const daysRemaining = goal.targetDate 
    ? daysUntil(goal.targetDate)
    : 90; // Default to 90 days if no target

  // Calculate velocity (progress per day)
  const daysSinceStart = Math.max(1, daysUntil(goal.createdAt) * -1);
  const velocity = goal.currentValue / daysSinceStart;

  // Calculate projected progress at target date
  const projectedValue = goal.currentValue + (velocity * Math.max(0, daysRemaining));
  
  // Analyze momentum from progress history
  const momentum = analyzeGoalMomentum(goal.progressHistory);
  
  // Calculate consistency
  const consistency = calculateGoalConsistency(goal.progressHistory);

  // Calculate success probability
  const probability = calculateGoalSuccessProbability({
    currentProgress: progressPercent,
    daysRemaining: Math.max(0, daysRemaining),
    averageVelocity: velocity,
    consistencyScore: consistency,
    historicalSuccessRate: 0.6, // Default, would come from user history
  });

  // Projected completion date
  let projectedCompletionDate: Date | null = null;
  let daysAhead = 0;
  
  if (velocity > 0) {
    const daysToComplete = (goal.targetValue - goal.currentValue) / velocity;
    projectedCompletionDate = new Date(now);
    projectedCompletionDate.setDate(projectedCompletionDate.getDate() + daysToComplete);
    
    if (goal.targetDate) {
      daysAhead = daysUntil(projectedCompletionDate) - daysUntil(goal.targetDate);
    }
  }

  // Generate factors
  const factors: PredictionFactor[] = [
    {
      name: 'Current Progress',
      impact: progressPercent > 0.5 ? 'positive' : progressPercent < 0.25 ? 'negative' : 'neutral',
      weight: 0.25,
      description: `${Math.round(progressPercent * 100)}% complete`,
    },
    {
      name: 'Velocity',
      impact: velocity > (goal.targetValue / 90) ? 'positive' : 'negative',
      weight: 0.35,
      description: `${velocity.toFixed(2)} ${goal.targetValue > 0 ? 'units' : ''}/day`,
    },
    {
      name: 'Momentum',
      impact: momentum === 'accelerating' ? 'positive' 
        : momentum === 'slowing' || momentum === 'stalled' ? 'negative' 
        : 'neutral',
      weight: 0.2,
      description: `Progress is ${momentum}`,
    },
    {
      name: 'Consistency',
      impact: consistency > 0.7 ? 'positive' : consistency < 0.4 ? 'negative' : 'neutral',
      weight: 0.2,
      description: `${Math.round(consistency * 100)}% consistent`,
    },
  ];

  // Generate recommendations
  const recommendations = generateGoalRecommendations(
    progressPercent,
    momentum,
    daysRemaining,
    probability.probability
  );

  return {
    goalId: goal.id,
    successProbability: probability.probability,
    projectedCompletionDate,
    daysAhead,
    confidence: probability.confidence,
    momentum,
    factors,
    recommendations,
  };
}

function analyzeGoalMomentum(
  history: { date: string; value: number }[]
): 'accelerating' | 'steady' | 'slowing' | 'stalled' {
  if (history.length < 4) return 'steady';

  // Sort by date
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  
  // Calculate velocity in first half vs second half
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const firstVelocity = firstHalf.length > 1
    ? (firstHalf[firstHalf.length - 1].value - firstHalf[0].value) / firstHalf.length
    : 0;
  
  const secondVelocity = secondHalf.length > 1
    ? (secondHalf[secondHalf.length - 1].value - secondHalf[0].value) / secondHalf.length
    : 0;

  if (secondVelocity <= 0 && sorted[sorted.length - 1].value === sorted[sorted.length - 2]?.value) {
    return 'stalled';
  }
  
  if (secondVelocity > firstVelocity * 1.2) {
    return 'accelerating';
  }
  
  if (secondVelocity < firstVelocity * 0.8) {
    return 'slowing';
  }
  
  return 'steady';
}

function calculateGoalConsistency(
  history: { date: string; value: number }[]
): number {
  if (history.length < 2) return 0.5;

  // Calculate daily changes
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const changes: number[] = [];
  
  for (let i = 1; i < sorted.length; i++) {
    changes.push(sorted[i].value - sorted[i - 1].value);
  }

  // Count positive changes (progress days)
  const progressDays = changes.filter(c => c > 0).length;
  
  return progressDays / changes.length;
}

function generateGoalRecommendations(
  progress: number,
  momentum: string,
  daysRemaining: number,
  probability: number
): string[] {
  const recommendations: string[] = [];

  if (probability < 50) {
    recommendations.push('Consider adjusting your target date or breaking down into smaller milestones');
  }

  if (momentum === 'stalled') {
    recommendations.push('Progress has stalled. Try a different approach or smaller daily targets');
  } else if (momentum === 'slowing') {
    recommendations.push('Momentum is decreasing. Identify what was working earlier and recommit');
  }

  if (progress < 0.25 && daysRemaining < 30) {
    recommendations.push('Significant effort needed to hit target. Consider pivoting or extending');
  }

  if (momentum === 'accelerating' && probability > 70) {
    recommendations.push('Great momentum! Consider stretching your goal if appropriate');
  }

  if (recommendations.length === 0) {
    recommendations.push('On track. Maintain current pace and stay consistent');
  }

  return recommendations;
}

// ==========================================
// BURNOUT PREDICTION
// ==========================================

/**
 * Predict burnout risk
 */
export function predictBurnout(params: {
  recentPerformance: HistoricalPerformance[];
  currentTaskLoad: number;
  baselineTaskLoad: number;
  restDaysLast2Weeks: number;
  missedHabitsLastWeek: number;
  totalHabitsLastWeek: number;
}): BurnoutPrediction {
  const {
    recentPerformance,
    currentTaskLoad,
    baselineTaskLoad,
    restDaysLast2Weeks,
    missedHabitsLastWeek,
    totalHabitsLastWeek,
  } = params;

  // Calculate performance trend
  const scores = recentPerformance.map(p => p.score);
  const trend = scores.length >= 3 ? analyzeTrend(scores, scores.length) : null;
  const performanceTrend = trend?.direction === 'down' ? -1 
    : trend?.direction === 'up' ? 1 
    : 0;

  // Calculate burnout probability
  const burnout = calculateBurnoutProbability({
    currentLoad: currentTaskLoad / 100,
    baselineLoad: baselineTaskLoad / 100,
    restDaysLast2Weeks,
    sleepQualityTrend: performanceTrend, // Using performance as proxy
    taskCompletionTrend: performanceTrend,
    missedHabitsLastWeek,
    totalHabitsLastWeek,
  });

  // Determine warning level
  let warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  if (burnout.probability >= 80) warningLevel = 'critical';
  else if (burnout.probability >= 60) warningLevel = 'high';
  else if (burnout.probability >= 40) warningLevel = 'medium';
  else if (burnout.probability >= 20) warningLevel = 'low';
  else warningLevel = 'none';

  // Estimate days until critical
  let daysUntilCritical: number | null = null;
  if (trend?.direction === 'down' && burnout.probability < 80) {
    const dailyIncrease = Math.abs(trend.changePercent) / 7;
    const pointsToGo = 80 - burnout.probability;
    daysUntilCritical = dailyIncrease > 0 ? Math.ceil(pointsToGo / dailyIncrease) : null;
  }

  // Generate factors
  const factors: PredictionFactor[] = burnout.factors.map(f => ({
    name: f.name,
    impact: f.impact === 'positive' ? 'positive' : f.impact === 'negative' ? 'negative' : 'neutral',
    weight: f.weight,
    description: f.description,
  }));

  // Prevention steps
  const preventionSteps = generateBurnoutPreventionSteps(warningLevel, factors);

  return {
    riskLevel: burnout.probability,
    daysUntilCritical,
    confidence: burnout.confidence,
    warningLevel,
    factors,
    preventionSteps,
  };
}

function generateBurnoutPreventionSteps(
  level: string,
  factors: PredictionFactor[]
): string[] {
  const steps: string[] = [];

  if (level === 'critical' || level === 'high') {
    steps.push('Schedule a recovery day within the next 48 hours');
    steps.push('Cancel or postpone non-essential commitments');
    steps.push('Reduce habit targets to minimum viable for the next week');
  }

  if (level === 'medium') {
    steps.push('Block 2 hours of unscheduled time each day this week');
    steps.push('Say no to one new commitment');
  }

  // Check specific factors
  const restFactor = factors.find(f => f.name.includes('Rest'));
  if (restFactor && restFactor.impact === 'negative') {
    steps.push('Schedule at least 2 rest days in the next 2 weeks');
  }

  const loadFactor = factors.find(f => f.name.includes('Load') || f.name.includes('Overload'));
  if (loadFactor && loadFactor.impact === 'negative') {
    steps.push('Delegate or defer 25% of your current tasks');
  }

  if (steps.length === 0) {
    steps.push('Maintain current balance - you\'re doing well');
    steps.push('Consider building a buffer with an extra rest day');
  }

  return steps;
}

// ==========================================
// STREAK PREDICTION
// ==========================================

/**
 * Predict streak vulnerability
 */
export function predictStreakVulnerability(
  habit: HabitData,
  recentCompletions: { date: string; completed: boolean }[],
  currentEnergy: number
): StreakPrediction {
  // Calculate completion rate for different days
  const byDayOfWeek: Record<number, { completed: number; total: number }> = {};
  
  for (const c of recentCompletions) {
    const date = new Date(c.date);
    const day = date.getDay();
    if (!byDayOfWeek[day]) {
      byDayOfWeek[day] = { completed: 0, total: 0 };
    }
    byDayOfWeek[day].total++;
    if (c.completed) {
      byDayOfWeek[day].completed++;
    }
  }

  // Find vulnerable days (below 60% completion)
  const vulnerableDays: string[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (const day in byDayOfWeek) {
    const rate = byDayOfWeek[day].completed / byDayOfWeek[day].total;
    if (rate < 0.6 && byDayOfWeek[day].total >= 2) {
      vulnerableDays.push(dayNames[parseInt(day)]);
    }
  }

  // Calculate weekend vs weekday rates
  const weekendData = [0, 6].map(d => byDayOfWeek[d]).filter(Boolean);
  const weekdayData = [1, 2, 3, 4, 5].map(d => byDayOfWeek[d]).filter(Boolean);
  
  const weekendRate = weekendData.length > 0
    ? weekendData.reduce((sum, d) => sum + d.completed, 0) / 
      weekendData.reduce((sum, d) => sum + d.total, 0)
    : habit.completionRate;

  // Did they miss yesterday?
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);
  const missedYesterday = recentCompletions.find(c => c.date === yesterdayKey)?.completed === false;

  // Calculate survival probability
  const survival = calculateStreakSurvivalProbability({
    streakLength: habit.currentStreak,
    averageCompletionRate: habit.completionRate,
    missedYesterday,
    currentEnergyLevel: currentEnergy / 100,
    dayOfWeek: new Date().getDay(),
    weekendCompletionRate: weekendRate,
  });

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (survival.probability >= 70) riskLevel = 'low';
  else if (survival.probability >= 40) riskLevel = 'medium';
  else riskLevel = 'high';

  // Protection strategies
  const strategies: string[] = [];
  
  if (missedYesterday) {
    strategies.push('You missed yesterday - today is critical for your streak');
    strategies.push('Set an extra reminder for this habit');
  }
  
  if (vulnerableDays.length > 0) {
    strategies.push(`Be extra mindful on ${vulnerableDays.join(' and ')}`);
  }
  
  if (habit.currentStreak > 7) {
    strategies.push(`You have a ${habit.currentStreak}-day streak. Protect it!`);
  }
  
  if (currentEnergy < 40) {
    strategies.push('Energy is low - do a minimal version of this habit to maintain streak');
  }

  return {
    habitId: habit.id,
    survivalProbability: survival.probability,
    riskLevel,
    vulnerableDays,
    protectionStrategies: strategies,
  };
}
