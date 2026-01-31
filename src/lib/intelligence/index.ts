/**
 * Intelligence Engine
 * 
 * Main export file for the Lumina intelligence system.
 * Provides pattern recognition, predictions, and insights.
 */

// Pattern Recognition
export {
  detectTemporalPatterns,
  detectHabitChains,
  analyzeBehavioralPatterns,
  detectAnomalies,
  generatePatternSummary,
  type TemporalPattern,
  type HabitChain,
  type BehavioralPattern,
  type AnomalyDetection,
  type CompletionData,
  type PerformanceData,
} from './patterns';

// Correlation Analysis
export {
  calculateHabitPerformanceCorrelation,
  calculateAllHabitCorrelations,
  findHighImpactHabits,
  findNegativeImpactHabits,
  calculateHabitCorrelationMatrix,
  analyzePerformanceFactors,
  getCorrelationInsights,
  type HabitCorrelation,
  type CorrelationMatrix,
  type PerformanceFactors,
  type HabitCompletionRecord,
  type DailyPerformance,
} from './correlations';

// Predictions
export {
  predictPerformance,
  predictGoalSuccess,
  predictBurnout,
  predictStreakVulnerability,
  type PerformancePrediction,
  type PredictionFactor,
  type GoalPrediction,
  type BurnoutPrediction,
  type StreakPrediction,
  type HistoricalPerformance,
  type HabitData,
  type GoalData,
} from './predictions';

// Circadian Analysis
export {
  buildCircadianProfile,
  getCurrentEnergyState,
  getOptimalSchedule,
  suggestTaskTime,
  generateEnergyCurve,
  type EnergyDataPoint,
  type HourlyEnergyProfile,
  type CircadianProfile,
  type RealTimeEnergy,
  type OptimalTimeSlot,
} from './circadian';

// Insight Generation
export {
  generateInsights,
  toInsightRecords,
  type InsightGeneratorInput,
  type GeneratedInsight,
} from './insights';

// ==========================================
// CONVENIENCE FUNCTIONS
// ==========================================

import { generatePatternSummary, CompletionData, PerformanceData } from './patterns';
import { calculateAllHabitCorrelations, HabitCompletionRecord, DailyPerformance } from './correlations';
import { predictPerformance, predictBurnout, HistoricalPerformance } from './predictions';
import { buildCircadianProfile, getCurrentEnergyState, EnergyDataPoint } from './circadian';
import { generateInsights, InsightGeneratorInput } from './insights';

/**
 * Run full intelligence analysis on user data
 * Returns comprehensive insights and predictions
 */
export async function runFullAnalysis(data: {
  habitCompletions: HabitCompletionRecord[];
  dailyPerformance: DailyPerformance[];
  energyLogs: EnergyDataPoint[];
  currentTaskLoad?: number;
  baselineTaskLoad?: number;
}): Promise<{
  patterns: ReturnType<typeof generatePatternSummary>;
  correlations: ReturnType<typeof calculateAllHabitCorrelations>;
  predictions: ReturnType<typeof predictPerformance>;
  circadian: ReturnType<typeof buildCircadianProfile>;
  currentEnergy: ReturnType<typeof getCurrentEnergyState>;
  insights: ReturnType<typeof generateInsights>;
}> {
  // Convert data formats
  const completionData: CompletionData[] = data.habitCompletions.map(h => ({
    date: h.date,
    hour: 9, // Default, would come from actual data
    dayOfWeek: new Date(h.date).getDay(),
    habitId: h.habitId,
    completed: h.completed,
  }));

  const performanceData: PerformanceData[] = data.dailyPerformance.map(p => ({
    date: p.date,
    hour: 12,
    dayOfWeek: new Date(p.date).getDay(),
    score: p.score,
    taskCount: p.totalTasks,
    completedCount: p.tasksCompleted,
  }));

  const historicalPerformance: HistoricalPerformance[] = data.dailyPerformance.map(p => ({
    date: p.date,
    score: p.score,
    habitCompletionRate: p.tasksCompleted / (p.totalTasks || 1),
    taskCompletionRate: p.tasksCompleted / (p.totalTasks || 1),
    energyLevel: p.energyLevel,
  }));

  // Run analyses
  const patterns = generatePatternSummary(completionData, performanceData);
  const correlations = calculateAllHabitCorrelations(data.habitCompletions, data.dailyPerformance);
  const predictions = predictPerformance(historicalPerformance, 3);
  const circadian = buildCircadianProfile(data.energyLogs);
  const currentEnergy = getCurrentEnergyState(circadian, 
    data.energyLogs.map(e => ({ score: e.score, timestamp: e.timestamp }))
  );

  // Calculate burnout
  const recentPerf = historicalPerformance.slice(-7);
  const burnout = predictBurnout({
    recentPerformance: recentPerf,
    currentTaskLoad: data.currentTaskLoad || 50,
    baselineTaskLoad: data.baselineTaskLoad || 50,
    restDaysLast2Weeks: 2,
    missedHabitsLastWeek: 0,
    totalHabitsLastWeek: 21,
  });

  // Generate insights
  const insightInput: InsightGeneratorInput = {
    correlations,
    patterns: patterns.behavioralPatterns,
    anomalies: patterns.anomalies,
    predictions,
    burnout,
    circadian,
    currentEnergy,
  };

  const insights = generateInsights(insightInput);

  return {
    patterns,
    correlations,
    predictions,
    circadian,
    currentEnergy,
    insights,
  };
}

/**
 * Get a quick summary of current status
 */
export function getQuickStatus(data: {
  energyLogs: EnergyDataPoint[];
  todayHabitCompletions: number;
  todayHabitTotal: number;
  currentStreak: number;
}): {
  energyPhase: string;
  energyScore: number;
  habitProgress: number;
  streakStatus: 'safe' | 'at_risk' | 'broken';
  quickTip: string;
} {
  const circadian = buildCircadianProfile(data.energyLogs);
  const currentEnergy = getCurrentEnergyState(circadian);
  
  const habitProgress = data.todayHabitTotal > 0
    ? Math.round((data.todayHabitCompletions / data.todayHabitTotal) * 100)
    : 0;

  const streakStatus = data.currentStreak > 0
    ? habitProgress >= 50 ? 'safe' : 'at_risk'
    : 'broken';

  return {
    energyPhase: currentEnergy.phaseConfig.name,
    energyScore: currentEnergy.currentScore,
    habitProgress,
    streakStatus,
    quickTip: currentEnergy.recommendation,
  };
}
