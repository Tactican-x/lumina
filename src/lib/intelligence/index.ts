/**
 * Intelligence Engine
 *
 * Main export file for the Lumina intelligence system.
 * Provides pattern recognition, predictions, insights,
 * celebrations, cold-start onboarding, weekly digests,
 * and full insight lifecycle management.
 */

// ==========================================
// PATTERN RECOGNITION
// ==========================================

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

// ==========================================
// CORRELATION ANALYSIS
// ==========================================

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

// ==========================================
// PREDICTIONS
// ==========================================

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

// ==========================================
// CIRCADIAN ANALYSIS
// ==========================================

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

// ==========================================
// INSIGHT GENERATION (v2)
// ==========================================

export {
  generateInsights,
  toInsightRecords,
  type InsightGeneratorInput,
  type GeneratedInsight,
  type MilestoneContext,
  type JourneyContext,
} from './insights';

// ==========================================
// CELEBRATIONS & MILESTONES
// ==========================================

export {
  detectMilestones,
  isStreakMilestone,
  milestoneLabel,
  type CelebrationInput,
  type HabitSnapshot,
  type DailySnapshot,
} from './celebrations';

// ==========================================
// COLD START (< 7 days)
// ==========================================

export {
  generateColdStartInsights,
  type ColdStartInput,
} from './coldStart';

// ==========================================
// WEEKLY DIGEST
// ==========================================

export {
  generateWeeklyDigest,
  type WeeklyDigestInput,
} from './weeklyDigest';

// ==========================================
// INSIGHT LIFECYCLE
// ==========================================

export {
  cleanupInsights,
  calculateExpiresAt,
  semanticKey,
  hasSemanticallySimular,
  getSuppressionRules,
  applySuppressionRules,
  type SuppressionRules,
} from './insightLifecycle';

// ==========================================
// INSIGHT FEEDBACK
// ==========================================

export {
  getInsightFeedbackMap,
  setInsightFeedback,
  markInsightHelpful,
  markInsightNotHelpful,
  recordInsightShown,
  getInsightShownMap,
  type InsightFeedback,
  type InsightFeedbackMap,
  type InsightShown,
  type InsightShownMap,
} from './insightFeedback';

// ==========================================
// INSIGHT RANKING
// ==========================================

export {
  scoreInsight,
  rankInsights,
  type InsightPersonalizationContext,
} from './insightRanking';

// ==========================================
// TEMPLATES (for testing / extension)
// ==========================================

export {
  pick,
  pickRandom,
  fill,
  daySeed,
  todaySeed,
  pickScience,
} from './insightTemplates';

// ==========================================
// CONVENIENCE FUNCTIONS
// ==========================================

import { generatePatternSummary, type CompletionData, type PerformanceData } from './patterns';
import {
  calculateAllHabitCorrelations,
  type HabitCompletionRecord,
  type DailyPerformance,
} from './correlations';
import {
  predictPerformance,
  predictBurnout,
  type HistoricalPerformance,
} from './predictions';
import {
  buildCircadianProfile,
  getCurrentEnergyState,
  type EnergyDataPoint,
} from './circadian';
import {
  generateInsights,
  type InsightGeneratorInput,
  type MilestoneContext,
  type JourneyContext,
} from './insights';
import { detectMilestones, type HabitSnapshot, type DailySnapshot } from './celebrations';
import { generateColdStartInsights, type ColdStartInput } from './coldStart';
import { generateWeeklyDigest, type WeeklyDigestInput } from './weeklyDigest';
import {
  cleanupInsights,
  getSuppressionRules,
  type SuppressionRules,
} from './insightLifecycle';
import { formatDateKey } from '@/utils/date';

// ==========================================
// FULL ANALYSIS
// ==========================================

/**
 * Run full intelligence analysis on user data.
 * Returns comprehensive insights and predictions.
 *
 * v2: now accepts milestone, journey, and cold-start context
 *     so the output includes celebrations, discoveries,
 *     and newcomer-appropriate messaging.
 */
export async function runFullAnalysis(data: {
  // Required
  habitCompletions: HabitCompletionRecord[];
  dailyPerformance: DailyPerformance[];
  energyLogs: EnergyDataPoint[];

  // Task context
  currentTaskLoad?: number;
  baselineTaskLoad?: number;

  // v2 — milestone & journey (optional, backward compat)
  milestones?: MilestoneContext;
  journey?: JourneyContext;
  coldStart?: ColdStartInput;
  suppressionRules?: SuppressionRules;
}): Promise<{
  patterns: ReturnType<typeof generatePatternSummary>;
  correlations: ReturnType<typeof calculateAllHabitCorrelations>;
  predictions: ReturnType<typeof predictPerformance>;
  circadian: ReturnType<typeof buildCircadianProfile>;
  currentEnergy: ReturnType<typeof getCurrentEnergyState>;
  insights: ReturnType<typeof generateInsights>;
}> {
  // ---- Convert data formats ----
  const completionData: CompletionData[] = data.habitCompletions.map(h => ({
    date: h.date,
    hour: 9,
    dayOfWeek: new Date(h.date + 'T12:00:00').getDay(),
    habitId: h.habitId,
    completed: h.completed,
  }));

  const performanceData: PerformanceData[] = data.dailyPerformance.map(p => ({
    date: p.date,
    hour: 12,
    dayOfWeek: new Date(p.date + 'T12:00:00').getDay(),
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

  // ---- Run analysis engines ----
  const patterns = generatePatternSummary(completionData, performanceData);
  const correlations = calculateAllHabitCorrelations(
    data.habitCompletions,
    data.dailyPerformance
  );
  const predictions = predictPerformance(historicalPerformance, 3);
  const circadian = buildCircadianProfile(data.energyLogs);
  const currentEnergy = getCurrentEnergyState(
    circadian,
    data.energyLogs.map(e => ({ score: e.score, timestamp: e.timestamp }))
  );

  // ---- Burnout ----
  const recentPerf = historicalPerformance.slice(-7);
  const burnout = predictBurnout({
    recentPerformance: recentPerf,
    currentTaskLoad: data.currentTaskLoad ?? 50,
    baselineTaskLoad: data.baselineTaskLoad ?? 50,
    restDaysLast2Weeks: 2,
    missedHabitsLastWeek: 0,
    totalHabitsLastWeek: 21,
  });

  // ---- Suppression rules (async) ----
  const suppressionRules = data.suppressionRules ?? await getSuppressionRules();

  // ---- Generate insights (v2 with all context) ----
  const insightInput: InsightGeneratorInput = {
    correlations,
    patterns: patterns.behavioralPatterns,
    anomalies: patterns.anomalies,
    predictions,
    burnout,
    circadian,
    currentEnergy,
    milestones: data.milestones,
    journey: data.journey,
    coldStart: data.coldStart,
    suppressionRules,
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

// ==========================================
// QUICK STATUS
// ==========================================

/**
 * Get a quick summary of current status.
 * Lightweight — no DB calls, no heavy analysis.
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

  const habitProgress =
    data.todayHabitTotal > 0
      ? Math.round((data.todayHabitCompletions / data.todayHabitTotal) * 100)
      : 0;

  const streakStatus: 'safe' | 'at_risk' | 'broken' =
    data.currentStreak > 0
      ? habitProgress >= 50
        ? 'safe'
        : 'at_risk'
      : 'broken';

  return {
    energyPhase: currentEnergy.phaseConfig.name,
    energyScore: currentEnergy.currentScore,
    habitProgress,
    streakStatus,
    quickTip: currentEnergy.recommendation,
  };
}

// ==========================================
// BUILD MILESTONE CONTEXT (helper)
// ==========================================

/**
 * Helper to build MilestoneContext from raw data.
 * Use this when you have habit/completion data but haven't
 * built the milestone context yet (e.g. from runFullAnalysis
 * or custom pipelines).
 */
export function buildMilestoneContext(data: {
  habits: HabitSnapshot[];
  dailySnapshots: DailySnapshot[];
  totalCompletionsAllTime: number;
  totalDaysTracked: number;
  previousDayCompleted: boolean;
  dayBeforePreviousCompleted: boolean;
}): MilestoneContext {
  return detectMilestones({
    habits: data.habits,
    dailySnapshots: data.dailySnapshots,
    totalCompletionsAllTime: data.totalCompletionsAllTime,
    totalDaysTracked: data.totalDaysTracked,
    previousDayCompleted: data.previousDayCompleted,
    dayBeforePreviousCompleted: data.dayBeforePreviousCompleted,
  });
}

// ==========================================
// BUILD COLD START INPUT (helper)
// ==========================================

/**
 * Helper to build ColdStartInput from common app state.
 * Returns null if the user is past cold-start (≥ 7 days).
 */
export function buildColdStartInput(data: {
  totalDaysTracked: number;
  todayCompletions: number;
  activeHabitCount: number;
  habitNames: string[];
  longestCurrentStreak: number;
  hasEnergyLog: boolean;
}): ColdStartInput | null {
  if (data.totalDaysTracked >= 7) return null;

  return {
    daysTracked: data.totalDaysTracked,
    totalCompletionsToday: data.todayCompletions,
    totalHabitsActive: data.activeHabitCount,
    habitNames: data.habitNames,
    longestCurrentStreak: data.longestCurrentStreak,
    hasEnergyLog: data.hasEnergyLog,
  };
}

// ==========================================
// BUILD JOURNEY CONTEXT (helper)
// ==========================================

/**
 * Helper to build JourneyContext from summary stats.
 */
export function buildJourneyContext(data: {
  totalDaysTracked: number;
  totalCompletions: number;
  recentOverallScore: number; // from patternSummary.overallScore
}): JourneyContext {
  return {
    totalDaysTracked: data.totalDaysTracked,
    totalCompletions: data.totalCompletions,
    recentTrend:
      data.recentOverallScore > 60
        ? 'improving'
        : data.recentOverallScore < 40
        ? 'declining'
        : 'stable',
  };
}

// ==========================================
// BUILD WEEKLY DIGEST INPUT (helper)
// ==========================================

/**
 * Helper to build WeeklyDigestInput from daily performance data.
 * Splits the last 14 days into this-week vs last-week.
 */
export function buildWeeklyDigestInput(data: {
  dailyPerformance: Array<{
    date: string;
    score: number;
    energyLevel: number;
  }>;
  habitRatesThisWeek: Array<{ name: string; rate: number }>; // rate 0-100, sorted desc
  perfectDaysThisWeek: number;
  longestActiveStreak: { name: string; days: number } | null;
  streaksLost: number;
  totalCompletionsThisWeek: number;
  totalCompletionsLastWeek: number;
  activeHabitCount: number;
  topCorrelation?: import('./correlations').HabitCorrelation;
}): WeeklyDigestInput {
  const perf = data.dailyPerformance;
  const last7 = perf.slice(-7);
  const prev7 = perf.slice(-14, -7);

  const thisWeekRate =
    data.activeHabitCount > 0 && last7.length > 0
      ? Math.round(
          (data.totalCompletionsThisWeek /
            (data.activeHabitCount * last7.length)) *
            100
        )
      : 0;

  const lastWeekRate =
    data.activeHabitCount > 0 && prev7.length > 0
      ? Math.round(
          (data.totalCompletionsLastWeek /
            (data.activeHabitCount * prev7.length)) *
            100
        )
      : 0;

  const avgEnergy =
    last7.length > 0
      ? Math.round(last7.reduce((s, p) => s + p.energyLevel, 0) / last7.length)
      : 50;

  const avgPerformance =
    last7.length > 0
      ? Math.round(last7.reduce((s, p) => s + p.score, 0) / last7.length)
      : 50;

  return {
    thisWeekCompletionRate: thisWeekRate,
    lastWeekCompletionRate: lastWeekRate,
    thisWeekCompletions: data.totalCompletionsThisWeek,
    lastWeekCompletions: data.totalCompletionsLastWeek,
    thisWeekDaysTracked: last7.length,
    bestHabitThisWeek: data.habitRatesThisWeek[0] ?? null,
    worstHabitThisWeek:
      data.habitRatesThisWeek[data.habitRatesThisWeek.length - 1] ?? null,
    perfectDaysThisWeek: data.perfectDaysThisWeek,
    longestActiveStreak: data.longestActiveStreak,
    streaksLost: data.streaksLost,
    avgEnergyThisWeek: avgEnergy,
    avgPerformanceScore: avgPerformance,
    topCorrelation: data.topCorrelation,
  };
}

// ==========================================
// LIFECYCLE CONVENIENCE
// ==========================================

/**
 * Run full lifecycle cleanup.
 * Safe to call on every app launch.
 */
export async function runInsightCleanup(options?: {
  maxActive?: number;
  archiveAfterDays?: number;
  deleteAfterDays?: number;
}): Promise<{ expired: number; archived: number; deleted: number }> {
  return cleanupInsights(options);
}