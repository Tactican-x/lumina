/**
 * Insight Generation Engine — v2.1 (Final)
 *
 * World-class insight generator focused on customer delight.
 *
 * Features:
 *  1.  Template-driven variety — 150+ phrases, date-seeded rotation
 *  2.  Celebration engine — milestones, personal records, comebacks
 *  3.  Discovery micro-insights — fun facts, comparisons, reflective questions
 *  4.  Tips & Wins — contextual coaching + small victory recognition
 *  5.  Journey-stage awareness — newcomer → building → established → veteran
 *  6.  Diversity guard — max 2 per category, min 3 categories, cap 10
 *  7.  Feedback suppression — learns from thumbs-down history
 *  8.  Cold start — first-week onboarding insights (< 7 days)
 *  9.  Richer science — rotated explanations per habit keyword
 *  10. Backward-compatible API — all new fields optional
 *
 * Public API (unchanged):
 *   generateInsights(input) → GeneratedInsight[]
 *   toInsightRecords(insights) → Omit<Insight, 'id' | 'createdAt'>[]
 */

// ==========================================
// IMPORTS
// ==========================================

import { Insight, InsightType, InsightPriority } from '@/types';
import { HabitCorrelation } from './correlations';
import { BehavioralPattern, AnomalyDetection } from './patterns';
import {
  PerformancePrediction,
  BurnoutPrediction,
  GoalPrediction,
  StreakPrediction,
} from './predictions';
import { CircadianProfile, RealTimeEnergy } from './circadian';

import {
  pick,
  pickRandom,
  fill,
  daySeed,
  pickScience,
  correlationSuperpower,
  correlationRethink,
  correlationMultiplier,
  patternSuccess,
  patternRisk,
  patternOpportunity,
  predictionStrong,
  predictionTough,
  warningBurnout,
  warningStreak,
  warningAnomaly,
  celebrationStreak,
  celebrationRecord,
  celebrationConsistency,
  celebrationComeback,
  optimizationPeakWindow,
  optimizationAtPeak,
  discoveryComparison,
  discoveryFunFact,
  discoveryQuestion,
  scienceGenericPositive,
} from './insightTemplates';

// v2.1 patches
import { generateColdStartInsights, type ColdStartInput } from './coldStart';
import { applySuppressionRules, type SuppressionRules } from './insightLifecycle';

// ==========================================
// TYPES
// ==========================================

export interface MilestoneContext {
  streaks: { habitId: string; habitName: string; currentStreak: number }[];
  totalCompletions: number;
  totalDaysTracked: number;
  personalBestDay?: { date: string; count: number };
  longestEverStreak?: { habitName: string; days: number };
  currentWeekRate: number;    // 0-100
  lastWeekRate: number;       // 0-100
  isComeback?: boolean;       // resumed after 2+ day gap
  topHabitName?: string;
  topHabitRate?: number;      // 0-100
  bestDayOfWeek?: string;     // e.g. "Tuesday"
  worstDayOfWeek?: string;
}

export interface JourneyContext {
  totalDaysTracked: number;
  totalCompletions: number;
  recentTrend: 'improving' | 'stable' | 'declining';
}

export interface TipsAndWinsContext {
  // Today's state
  habitsCompletedToday: number;
  habitsRemainingToday: number;
  totalHabitsToday: number;
  completionPctToday: number;         // 0-100

  // Streaks
  activeStreakCount: number;           // how many habits have streak > 0
  longestActiveStreak: number;
  habitWithLongestStreak?: string;     // habit name

  // Recent performance
  last7DayAvgCompletionRate: number;   // 0-100
  last7DayAvgEnergy: number;           // 0-100
  performanceTrend: 'up' | 'down' | 'stable';

  // Habit specifics
  habitsDueButNotDone: string[];       // names of habits not yet done today
  habitsDoneToday: string[];           // names of habits completed today
  mostConsistentHabit?: string;        // name
  leastConsistentHabit?: string;       // name
  mostConsistentRate?: number;         // 0-100
  leastConsistentRate?: number;        // 0-100

  // Tasks (optional)
  pendingTaskCount?: number;
  overdueTaskCount?: number;

  // Time of day
  currentHour: number;                 // 0-23
  isWeekend: boolean;
}

export interface InsightGeneratorInput {
  // Original v1 fields
  correlations?: HabitCorrelation[];
  patterns?: BehavioralPattern[];
  anomalies?: AnomalyDetection[];
  predictions?: PerformancePrediction[];
  burnout?: BurnoutPrediction;
  goalPredictions?: GoalPrediction[];
  streakPredictions?: StreakPrediction[];
  circadian?: CircadianProfile;
  currentEnergy?: RealTimeEnergy;

  // v2 extensions (all optional — backward compatible)
  milestones?: MilestoneContext;
  journey?: JourneyContext;

  // v2.1 extensions
  coldStart?: ColdStartInput;
  suppressionRules?: SuppressionRules;
  tipsAndWins?: TipsAndWinsContext;
}

export interface GeneratedInsight extends Omit<Insight, 'id' | 'createdAt'> {
  score: number;
}

// ==========================================
// JOURNEY STAGE DETECTION
// ==========================================

type JourneyStage = 'newcomer' | 'building' | 'established' | 'veteran';

function detectStage(j?: JourneyContext): JourneyStage {
  if (!j) return 'building';
  if (j.totalDaysTracked < 7) return 'newcomer';
  if (j.totalDaysTracked < 30) return 'building';
  if (j.totalDaysTracked < 90) return 'established';
  return 'veteran';
}

// ==========================================
// DIVERSITY GUARD
// ==========================================

const MAX_PER_CATEGORY = 2;
const MIN_CATEGORIES = 3;
const MAX_TOTAL = 10;

function enforceDiversity(insights: GeneratedInsight[]): GeneratedInsight[] {
  const sorted = [...insights].sort((a, b) => b.score - a.score);
  const result: GeneratedInsight[] = [];
  const categoryCounts: Record<string, number> = {};

  // First pass: top insights respecting per-category cap
  for (const ins of sorted) {
    if (result.length >= MAX_TOTAL) break;
    const cat = ins.type;
    const count = categoryCounts[cat] ?? 0;

    // Always allow critical warnings through
    if (ins.priority === 'critical') {
      result.push(ins);
      categoryCounts[cat] = count + 1;
      continue;
    }

    if (count < MAX_PER_CATEGORY) {
      result.push(ins);
      categoryCounts[cat] = count + 1;
    }
  }

  // Second pass: ensure minimum category representation
  const representedCategories = new Set(result.map(r => r.type));
  if (representedCategories.size < MIN_CATEGORIES && result.length < MAX_TOTAL) {
    for (const ins of sorted) {
      if (result.length >= MAX_TOTAL) break;
      if (result.includes(ins)) continue;
      if (!representedCategories.has(ins.type)) {
        result.push(ins);
        representedCategories.add(ins.type);
      }
    }
  }

  return result.sort((a, b) => b.score - a.score);
}

// ==========================================
// MAIN GENERATOR
// ==========================================

export function generateInsights(input: InsightGeneratorInput): GeneratedInsight[] {
  const stage = detectStage(input.journey);
  const all: GeneratedInsight[] = [];

  // ---- Cold start path (< 7 days) ----
  if (stage === 'newcomer' && input.coldStart) {
    const coldInsights = generateColdStartInsights(input.coldStart);

    // Still run celebrations if available (first streak, etc.)
    if (input.milestones) {
      coldInsights.push(...genCelebrations(input.milestones, stage));
    }

    // Still run tips & wins during cold start
    if (input.tipsAndWins) {
      coldInsights.push(...genTipsAndWins(input.tipsAndWins, stage));
    }

    return enforceDiversity(coldInsights);
  }

  // ---- Normal path ----
  if (input.correlations) {
    all.push(...genCorrelation(input.correlations, stage));
  }
  if (input.patterns) {
    all.push(...genPattern(input.patterns, stage));
  }
  if (input.anomalies) {
    all.push(...genAnomaly(input.anomalies));
  }
  if (input.predictions) {
    all.push(...genPrediction(input.predictions, stage));
  }
  if (input.burnout) {
    all.push(...genBurnout(input.burnout));
  }
  if (input.goalPredictions) {
    all.push(...genGoal(input.goalPredictions));
  }
  if (input.streakPredictions) {
    all.push(...genStreak(input.streakPredictions));
  }
  if (input.circadian && input.currentEnergy) {
    all.push(...genCircadian(input.circadian, input.currentEnergy));
  }

  // Celebrations & discoveries
  if (input.milestones) {
    all.push(...genCelebrations(input.milestones, stage));
    all.push(...genDiscoveries(input.milestones, input.correlations, stage));
  }

  // Tips & wins
  if (input.tipsAndWins) {
    all.push(...genTipsAndWins(input.tipsAndWins, stage));
  }

  // ---- Apply feedback suppression ----
  const filtered = input.suppressionRules
    ? applySuppressionRules(all, input.suppressionRules)
    : all;

  return enforceDiversity(filtered as GeneratedInsight[]);
}

// ==========================================
// CORRELATION INSIGHTS
// ==========================================

function genCorrelation(
  correlations: HabitCorrelation[],
  stage: JourneyStage
): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];
  const seed = daySeed('corr');

  // ---- Superpower habit (top positive) ----
  const highImpact = correlations.filter(
    c => c.correlation > 0.5 && c.significance !== 'none'
  );

  if (highImpact.length > 0) {
    const top = highImpact[0];
    const corrPct = Math.round(top.correlation * 100);
    const diff = Math.round(top.correlation * 40);

    const vars = { name: top.habitName, corr: corrPct, diff };
    out.push({
      type: 'correlation',
      priority: 'high',
      title: fill(pick(correlationSuperpower.titles, seed + ':sp'), vars),
      summary: fill(pick(correlationSuperpower.summaries, seed + ':sp:s'), vars),
      detailedAnalysis: buildSuperpowerAnalysis(top, stage),
      scientificExplanation: pickScience(top.habitName, top.correlation, seed),
      confidence: top.confidence,
      correlationValue: top.correlation,
      pValue: top.pValue,
      actionLabel: 'View Habit',
      actionType: 'habit',
      actionPayload: { habitId: top.habitId },
      relatedHabitIds: [top.habitId],
      isRead: false,
      isDismissed: false,
      score: 80 + top.correlation * 20,
    });
  }

  // ---- Negative impact ----
  const negative = correlations.filter(
    c => c.correlation < -0.3 && c.significance !== 'none'
  );

  if (negative.length > 0) {
    const worst = negative[0];
    const vars = { name: worst.habitName };

    out.push({
      type: 'optimization',
      priority: 'medium',
      title: fill(pick(correlationRethink.titles, seed + ':re'), vars),
      summary: fill(pick(correlationRethink.summaries, seed + ':re:s'), vars),
      detailedAnalysis: buildRethinkAnalysis(worst, stage),
      scientificExplanation: pickScience(worst.habitName, worst.correlation, seed),
      confidence: worst.confidence,
      correlationValue: worst.correlation,
      actionLabel: 'Review Habit',
      actionType: 'habit',
      actionPayload: { habitId: worst.habitId },
      relatedHabitIds: [worst.habitId],
      isRead: false,
      isDismissed: false,
      score: 60 + Math.abs(worst.correlation) * 20,
    });
  }

  // ---- Multiplier effect ----
  if (highImpact.length >= 2) {
    const top3 = highImpact.slice(0, 3);
    const names = top3.map(h => h.habitName).join(', ');
    const avgCorr = top3.reduce((s, h) => s + h.correlation, 0) / top3.length;
    const boost = Math.round(avgCorr * 50);
    const vars = { names, count: top3.length, boost };

    out.push({
      type: 'pattern',
      priority: 'medium',
      title: fill(pick(correlationMultiplier.titles, seed + ':mul'), vars),
      summary: fill(pick(correlationMultiplier.summaries, seed + ':mul:s'), vars),
      detailedAnalysis:
        `Your top habits form a reinforcing stack:\n\n` +
        top3
          .map(
            h =>
              `• ${h.habitName} — r = ${h.correlation.toFixed(2)}, confidence ${Math.round(h.confidence)}%`
          )
          .join('\n') +
        `\n\nWhen completed together, performance is estimated to be ~${boost}% higher.` +
        `\n\nProtect this combination. Completing even one of them makes the others easier to start.`,
      scientificExplanation:
        'Habit stacking leverages the brain\'s associative memory. Completing habit A ' +
        'primes the neural circuit for habit B, reducing the activation energy for each subsequent behavior.',
      confidence: Math.round(avgCorr * 100),
      relatedHabitIds: top3.map(h => h.habitId),
      isRead: false,
      isDismissed: false,
      score: 70,
    });
  }

  // ---- Hidden gem (moderate positive, not "superpower" level) ----
  const moderate = correlations.find(
    c => c.correlation >= 0.3 && c.correlation < 0.5 && c.significance !== 'none'
  );

  if (moderate && stage !== 'newcomer') {
    out.push({
      type: 'correlation',
      priority: 'low',
      title: `📡 Quiet Signal: ${moderate.habitName}`,
      summary: `${moderate.habitName} has a moderate positive link (${Math.round(moderate.correlation * 100)}%) to your performance. Worth nurturing.`,
      detailedAnalysis:
        `${moderate.habitName} isn't your strongest habit statistically, but it's trending in the right direction.\n\n` +
        `Correlation: ${moderate.correlation.toFixed(2)} (${moderate.significance} significance)\n` +
        `Sample: ${moderate.sampleSize} days\n\n` +
        `Consistent execution could push this into "high impact" territory over time.`,
      scientificExplanation: pickScience(moderate.habitName, moderate.correlation, seed),
      confidence: moderate.confidence,
      correlationValue: moderate.correlation,
      relatedHabitIds: [moderate.habitId],
      isRead: false,
      isDismissed: false,
      score: 45,
    });
  }

  return out;
}

function buildSuperpowerAnalysis(h: HabitCorrelation, stage: JourneyStage): string {
  const lines: string[] = [];

  if (stage === 'newcomer') {
    lines.push(
      `Early data shows ${h.habitName} is strongly linked to your best days. This is a great sign.`
    );
  } else if (stage === 'veteran') {
    lines.push(
      `Across ${h.sampleSize} days of data, ${h.habitName} consistently predicts higher performance.`
    );
  } else {
    lines.push(
      `${h.habitName} has a strong positive correlation with your daily performance.`
    );
  }

  lines.push('');
  lines.push(`Correlation: ${h.correlation.toFixed(2)} (${h.significance} significance)`);
  lines.push(`Statistical confidence: ${Math.round(h.confidence)}%`);
  lines.push(`Based on: ${h.sampleSize} days of data`);
  lines.push('');

  if (h.correlation > 0.7) {
    lines.push('This is an unusually strong link. Prioritize this habit above all others.');
  } else {
    lines.push('Keep completing this habit consistently. The effect compounds over time.');
  }

  return lines.join('\n');
}

function buildRethinkAnalysis(h: HabitCorrelation, stage: JourneyStage): string {
  const lines: string[] = [];

  lines.push(`${h.habitName} shows a negative correlation with your performance.`);
  lines.push('');
  lines.push(`Correlation: ${h.correlation.toFixed(2)} (${h.significance} significance)`);
  lines.push(`Sample: ${h.sampleSize} days`);
  lines.push('');
  lines.push("This doesn't necessarily mean the habit is harmful. Consider:");
  lines.push('');
  lines.push('• Is the timing wrong? (e.g., doing it when you should be resting)');
  lines.push('• Is it taking too much time or energy?');
  lines.push('• Does it conflict with a higher-impact habit?');
  lines.push('• Has the context changed since you started it?');
  lines.push('');

  if (stage === 'veteran') {
    lines.push(
      'With your data history, this signal is worth taking seriously. Experiment with adjustments.'
    );
  } else {
    lines.push(
      'Try changing the time of day or reducing the scope before dropping it entirely.'
    );
  }

  return lines.join('\n');
}

// ==========================================
// PATTERN INSIGHTS
// ==========================================

function genPattern(
  patterns: BehavioralPattern[],
  stage: JourneyStage
): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];
  const seed = daySeed('pat');
  const minStrength = stage === 'newcomer' ? 30 : 50;

  for (const pattern of patterns) {
    if (pattern.strength < minStrength) continue;

    const pool =
      pattern.type === 'success'
        ? patternSuccess
        : pattern.type === 'risk'
        ? patternRisk
        : patternOpportunity;

    const priority: InsightPriority =
      pattern.type === 'risk'
        ? 'high'
        : pattern.type === 'success'
        ? 'medium'
        : 'low';

    const vars = { name: pattern.name, description: pattern.description };
    const patSeed = seed + ':' + pattern.id;

    out.push({
      type: 'pattern',
      priority,
      title: fill(pick(pool.titles, patSeed), vars),
      summary: fill(pick(pool.summaries, patSeed + ':s'), vars),
      detailedAnalysis:
        `Pattern: ${pattern.name}\n` +
        `Type: ${pattern.type} | Strength: ${pattern.strength}%\n` +
        `Observed ${pattern.occurrences} times\n` +
        `Estimated impact: ${pattern.impact > 0 ? '+' : ''}${pattern.impact}% on performance\n\n` +
        `Recommendations:\n${pattern.recommendations.map(r => '• ' + r).join('\n')}`,
      scientificExplanation: pattern.scientificBasis,
      confidence: pattern.strength,
      effectSize: pattern.impact / 100,
      isRead: false,
      isDismissed: false,
      score:
        pattern.strength +
        (pattern.type === 'success' ? 10 : pattern.type === 'risk' ? 15 : 0),
    });
  }

  return out;
}

// ==========================================
// ANOMALY INSIGHTS
// ==========================================

function genAnomaly(anomalies: AnomalyDetection[]): GeneratedInsight[] {
  const seed = daySeed('anom');

  return anomalies
    .filter(a => a.isAnomaly)
    .map(anomaly => {
      const priority: InsightPriority =
        anomaly.severity === 'high'
          ? 'critical'
          : anomaly.severity === 'medium'
          ? 'high'
          : 'medium';

      let titleOverride: string | undefined;
      if (anomaly.type === 'performance_spike') {
        titleOverride = pick(
          [
            '📈 You\'re on Fire — What Changed?',
            '🌟 Performance Spike Detected',
            '🔍 Something Clicked Recently',
          ],
          seed + ':spike'
        );
      }

      const vars = { description: anomaly.description };

      return {
        type: 'warning' as InsightType,
        priority,
        title:
          titleOverride ??
          fill(pick(warningAnomaly.titles, seed + ':' + anomaly.type), vars),
        summary: fill(
          pick(warningAnomaly.summaries, seed + ':' + anomaly.type + ':s'),
          vars
        ),
        detailedAnalysis:
          `${anomaly.description}\n\n` +
          `Severity: ${anomaly.severity}\n\n` +
          `Suggested action: ${anomaly.suggestedAction}`,
        scientificExplanation:
          anomaly.type === 'performance_spike'
            ? 'Performance spikes often reveal what\'s working. Analyzing the conditions around a spike can surface optimization opportunities.'
            : 'Sudden behavioral shifts often precede performance issues. Early detection enables preventive action rather than reactive recovery.',
        confidence:
          anomaly.severity === 'high'
            ? 85
            : anomaly.severity === 'medium'
            ? 70
            : 55,
        actionLabel:
          anomaly.type === 'performance_spike' ? 'Analyze' : 'Take Action',
        actionType: 'external',
        isRead: false,
        isDismissed: false,
        score:
          anomaly.severity === 'high'
            ? 95
            : anomaly.severity === 'medium'
            ? 75
            : 55,
      };
    });
}

// ==========================================
// PREDICTION INSIGHTS
// ==========================================

function genPrediction(
  predictions: PerformancePrediction[],
  stage: JourneyStage
): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];
  const seed = daySeed('pred');

  if (predictions.length === 0) return out;
  const tomorrow = predictions[0];

  // High performance predicted
  if (tomorrow.predictedScore >= 70) {
    const vars = { score: tomorrow.predictedScore };
    out.push({
      type: 'prediction',
      priority: 'medium',
      title: fill(pick(predictionStrong.titles, seed), vars),
      summary: fill(pick(predictionStrong.summaries, seed + ':s'), vars),
      detailedAnalysis: buildPredictionAnalysis(tomorrow, stage),
      scientificExplanation:
        'Performance predictions combine your historical rhythm, recent trend direction, ' +
        'and cyclical patterns (day of week, energy cycles) into a probabilistic forecast.',
      confidence: tomorrow.confidence,
      actionLabel: 'Plan Tomorrow',
      actionType: 'task',
      isRead: false,
      isDismissed: false,
      score: 65,
    });
  }

  // Low performance predicted
  if (tomorrow.predictedScore < 50) {
    const vars = { score: tomorrow.predictedScore };
    out.push({
      type: 'prediction',
      priority: 'medium',
      title: fill(pick(predictionTough.titles, seed), vars),
      summary: fill(pick(predictionTough.summaries, seed + ':s'), vars),
      detailedAnalysis: buildPredictionAnalysis(tomorrow, stage),
      scientificExplanation:
        'Lower-energy days are normal parts of the human performance cycle. ' +
        'Planning for them (not fighting them) leads to better long-term outcomes.',
      confidence: tomorrow.confidence,
      actionLabel: 'Adjust Schedule',
      actionType: 'task',
      isRead: false,
      isDismissed: false,
      score: 60,
    });
  }

  // Multi-day trend insight (established/veteran only)
  if (
    predictions.length >= 3 &&
    (stage === 'established' || stage === 'veteran')
  ) {
    const avg = Math.round(
      predictions.reduce((s, p) => s + p.predictedScore, 0) / predictions.length
    );
    const trend =
      predictions[predictions.length - 1].predictedScore >
      predictions[0].predictedScore
        ? 'upward'
        : 'downward';

    out.push({
      type: 'prediction',
      priority: 'low',
      title: trend === 'upward' ? '📈 Upward Trend Ahead' : '📉 Dip on the Horizon',
      summary: `Next ${predictions.length} days average: ${avg}%. Trend is ${trend}.`,
      detailedAnalysis:
        predictions
          .map(
            p =>
              `${p.date}: ${p.predictedScore}% (±${Math.round((p.range.high - p.range.low) / 2)})`
          )
          .join('\n') +
        `\n\nOverall trend: ${trend}\nAverage confidence: ${Math.round(
          predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length
        )}%`,
      confidence: Math.round(
        predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length
      ),
      isRead: false,
      isDismissed: false,
      score: 40,
    });
  }

  return out;
}

function buildPredictionAnalysis(
  pred: PerformancePrediction,
  _stage: JourneyStage
): string {
  const lines: string[] = [];

  lines.push(`Predicted score: ${pred.predictedScore}%`);
  lines.push(`Confidence: ${pred.confidence}%`);
  lines.push(`Range: ${pred.range.low}% – ${pred.range.high}%`);
  lines.push('');
  lines.push('Contributing factors:');
  for (const f of pred.factors) {
    const icon =
      f.impact === 'positive' ? '↑' : f.impact === 'negative' ? '↓' : '→';
    lines.push(`${icon} ${f.name}: ${f.description}`);
  }

  if (pred.recommendation) {
    lines.push('');
    lines.push(pred.recommendation);
  }

  return lines.join('\n');
}

// ==========================================
// BURNOUT INSIGHTS
// ==========================================

function genBurnout(burnout: BurnoutPrediction): GeneratedInsight[] {
  if (burnout.warningLevel === 'none' || burnout.warningLevel === 'low') {
    return [];
  }

  const seed = daySeed('burn');
  const vars = { risk: burnout.riskLevel };

  const priority: InsightPriority =
    burnout.warningLevel === 'critical'
      ? 'critical'
      : burnout.warningLevel === 'high'
      ? 'high'
      : 'medium';

  return [
    {
      type: 'warning',
      priority,
      title: fill(pick(warningBurnout.titles, seed), vars),
      summary: fill(pick(warningBurnout.summaries, seed + ':s'), vars),
      detailedAnalysis:
        `Burnout risk: ${burnout.riskLevel}%\n` +
        (burnout.daysUntilCritical
          ? `Estimated ${burnout.daysUntilCritical} days until critical if trend continues\n`
          : '') +
        `\nFactors:\n${burnout.factors
          .map(f => {
            const icon =
              f.impact === 'negative'
                ? '⚠️'
                : f.impact === 'positive'
                ? '✅'
                : '➡️';
            return `${icon} ${f.name}: ${f.description}`;
          })
          .join('\n')}` +
        `\n\nPrevention steps:\n${burnout.preventionSteps.map(s => '• ' + s).join('\n')}`,
      scientificExplanation:
        'Burnout follows a predictable trajectory: sustained demand without adequate recovery depletes ' +
        'prefrontal cortex resources, progressively impairing decision-making, motivation, and emotional regulation. ' +
        'Catching it early (at 40-60% risk) is 3x more effective than recovering from full burnout.',
      confidence: burnout.confidence,
      actionLabel: 'View Recovery Plan',
      actionType: 'external',
      isRead: false,
      isDismissed: false,
      score:
        burnout.warningLevel === 'critical'
          ? 100
          : burnout.warningLevel === 'high'
          ? 90
          : 70,
    },
  ];
}

// ==========================================
// GOAL INSIGHTS
// ==========================================

function genGoal(predictions: GoalPrediction[]): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];

  for (const pred of predictions) {
    // At-risk goals
    if (pred.successProbability < 40 && pred.momentum !== 'accelerating') {
      out.push({
        type: 'warning',
        priority: 'medium',
        title: '🎯 Goal Needs Attention',
        summary: `"${pred.goalId}" — ${pred.successProbability}% success probability, momentum ${pred.momentum}.`,
        detailedAnalysis:
          `Success probability: ${pred.successProbability}%\n` +
          `Momentum: ${pred.momentum}\n` +
          `Confidence: ${pred.confidence}%\n\n` +
          `Recommendations:\n${pred.recommendations.map(r => '• ' + r).join('\n')}`,
        confidence: pred.confidence,
        actionLabel: 'Adjust Goal',
        actionType: 'goal',
        actionPayload: { goalId: pred.goalId },
        relatedGoalIds: [pred.goalId],
        isRead: false,
        isDismissed: false,
        score: 55,
      });
    }

    // Goals doing well
    if (pred.successProbability > 80 && pred.momentum === 'accelerating') {
      out.push({
        type: 'achievement',
        priority: 'low',
        title: '🌟 Goal Momentum Is Accelerating',
        summary: `${pred.successProbability}% success probability and climbing.`,
        detailedAnalysis:
          `You're making excellent progress on this goal.\n\n` +
          `Success probability: ${pred.successProbability}%\n` +
          `Momentum: Accelerating\n` +
          (pred.projectedCompletionDate
            ? `Projected completion: ${pred.projectedCompletionDate.toLocaleDateString()}\n`
            : '') +
          `\nKeep your current pace. You're ahead of where most people would be.`,
        confidence: pred.confidence,
        relatedGoalIds: [pred.goalId],
        isRead: false,
        isDismissed: false,
        score: 40,
      });
    }
  }

  return out;
}

// ==========================================
// STREAK INSIGHTS
// ==========================================

function genStreak(predictions: StreakPrediction[]): GeneratedInsight[] {
  const seed = daySeed('streak');
  const atRisk = predictions.filter(p => p.riskLevel === 'high');
  if (atRisk.length === 0) return [];

  return atRisk.map(pred => {
    const vars: Record<string, string | number> = {
      days: 0,
      survival: pred.survivalProbability,
    };

    // Extract streak length from strategies text
    const streakMatch = pred.protectionStrategies
      .join(' ')
      .match(/(\d+)-day streak/);
    if (streakMatch) vars.days = parseInt(streakMatch[1], 10);

    return {
      type: 'warning' as InsightType,
      priority: 'high' as InsightPriority,
      title: fill(
        pick(warningStreak.titles, seed + ':' + pred.habitId),
        vars
      ),
      summary: fill(
        pick(warningStreak.summaries, seed + ':' + pred.habitId + ':s'),
        vars
      ),
      detailedAnalysis:
        `Survival probability: ${pred.survivalProbability}%\n` +
        `Risk level: ${pred.riskLevel}\n\n` +
        (pred.vulnerableDays.length > 0
          ? `Historically vulnerable on: ${pred.vulnerableDays.join(', ')}\n\n`
          : '') +
        `Protection strategies:\n${pred.protectionStrategies.map(s => '• ' + s).join('\n')}`,
      scientificExplanation:
        'Streaks build habit automaticity through consistent repetition. ' +
        'Each day of a streak strengthens the basal ganglia circuit that makes the behavior effortless. ' +
        "Breaking it doesn't erase progress, but it does reset the psychological momentum.",
      confidence: 100 - pred.survivalProbability,
      actionLabel: 'Protect Streak',
      actionType: 'habit',
      actionPayload: { habitId: pred.habitId },
      relatedHabitIds: [pred.habitId],
      isRead: false,
      isDismissed: false,
      score: 85,
    };
  });
}

// ==========================================
// CIRCADIAN INSIGHTS
// ==========================================

function genCircadian(
  profile: CircadianProfile,
  current: RealTimeEnergy
): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];
  const seed = daySeed('circ');
  const now = new Date();
  const currentHour = now.getHours();

  // Approaching peak window
  if (
    currentHour >= profile.optimalWorkWindow.start - 1 &&
    currentHour < profile.optimalWorkWindow.start
  ) {
    const minutesLeft =
      (profile.optimalWorkWindow.start - currentHour) * 60 - now.getMinutes();
    const vars = {
      start: profile.optimalWorkWindow.start,
      end: profile.optimalWorkWindow.end,
      score: profile.optimalWorkWindow.averageScore,
      minutes: Math.max(0, minutesLeft),
    };

    out.push({
      type: 'optimization',
      priority: 'medium',
      title: fill(pick(optimizationPeakWindow.titles, seed + ':pw'), vars),
      summary: fill(
        pick(optimizationPeakWindow.summaries, seed + ':pw:s'),
        vars
      ),
      detailedAnalysis:
        `Your peak cognitive window: ${vars.start}:00 – ${vars.end}:00\n` +
        `Average performance during this window: ${vars.score}%\n` +
        `Pattern reliability: ${profile.consistency}%\n\n` +
        `Prepare your most demanding task now so you can start immediately when the window opens.`,
      scientificExplanation:
        'Circadian rhythms create predictable peaks in core body temperature, ' +
        'cortisol, and prefrontal cortex activation. Aligning demanding cognitive work ' +
        'with these peaks can improve output by 20-40% compared to trough hours.',
      confidence: profile.consistency,
      isRead: false,
      isDismissed: false,
      score: 55,
    });
  }

  // Currently at peak
  if (current.currentPhase === 'peak_cognitive') {
    const vars = {
      score: current.currentScore,
      pct: current.percentOfPeak,
    };

    out.push({
      type: 'optimization',
      priority: 'high',
      title: fill(pick(optimizationAtPeak.titles, seed + ':ap'), vars),
      summary: fill(
        pick(optimizationAtPeak.summaries, seed + ':ap:s'),
        vars
      ),
      detailedAnalysis:
        `Current energy: ${current.currentScore}% (${current.percentOfPeak}% of your personal peak)\n` +
        `Phase: ${current.phaseConfig.name}\n\n` +
        `${current.phaseConfig.description}\n\n` +
        `Best for: ${current.phaseConfig.taskTypes.join(', ')}\n\n` +
        `⏱️ Next peak in ~${current.timeUntilNextPeak} minutes if you miss this one.`,
      scientificExplanation: current.phaseConfig.scientificBasis,
      confidence: profile.consistency,
      isRead: false,
      isDismissed: false,
      score: 70,
    });
  }

  return out;
}

// ==========================================
// CELEBRATION INSIGHTS
// ==========================================

const STREAK_MILESTONES = [7, 14, 21, 30, 50, 66, 100, 150, 200, 365];

function genCelebrations(
  ctx: MilestoneContext,
  stage: JourneyStage
): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];
  const seed = daySeed('cele');

  // ---- Streak milestones ----
  for (const s of ctx.streaks) {
    if (!STREAK_MILESTONES.includes(s.currentStreak)) continue;

    const vars = { days: s.currentStreak, name: s.habitName };
    const milestone = s.currentStreak;

    let sciNote: string;
    if (milestone === 21) {
      sciNote =
        'The "21-day habit" myth is popular but research shows the real median is 66 days. You\'re well on your way.';
    } else if (milestone === 66) {
      sciNote =
        'Day 66 is the median point where habits become automatic (Lally et al., 2010). This is a major milestone.';
    } else if (milestone >= 100) {
      sciNote =
        'At 100+ days, neural pathways are deeply grooved. This behavior is approaching true automaticity.';
    } else {
      sciNote =
        'Each consecutive day of a streak strengthens the habit circuit in the basal ganglia, making the behavior more effortless.';
    }

    out.push({
      type: 'achievement',
      priority: milestone >= 66 ? 'high' : 'medium',
      title: fill(
        pick(celebrationStreak.titles, seed + ':' + s.habitId),
        vars
      ),
      summary: fill(
        pick(celebrationStreak.summaries, seed + ':' + s.habitId + ':s'),
        vars
      ),
      detailedAnalysis:
        `🎯 ${s.habitName} — ${milestone}-day streak!\n\n` +
        (milestone >= 30
          ? `That puts you in the top ~8% of habit trackers. Most people don't make it past 2 weeks.\n\n`
          : `You've passed the hardest phase. The first 2 weeks are where most people quit.\n\n`) +
        `Keep going. The compound effect is working in your favor.`,
      scientificExplanation: sciNote,
      confidence: 95,
      actionLabel: 'View Streak',
      actionType: 'habit',
      actionPayload: { habitId: s.habitId },
      relatedHabitIds: [s.habitId],
      isRead: false,
      isDismissed: false,
      score: milestone >= 66 ? 88 : milestone >= 30 ? 78 : 68,
    });
  }

  // ---- Personal best day ----
  if (ctx.personalBestDay) {
    const vars = { count: ctx.personalBestDay.count };
    out.push({
      type: 'achievement',
      priority: 'medium',
      title: fill(pick(celebrationRecord.titles, seed + ':pb'), vars),
      summary: fill(
        pick(celebrationRecord.summaries, seed + ':pb:s'),
        vars
      ),
      detailedAnalysis:
        `On ${ctx.personalBestDay.date}, you completed ${ctx.personalBestDay.count} habits — your all-time record.\n\n` +
        `This proves what you're capable of when conditions align. ` +
        `Think about what was different that day: sleep, schedule, mindset?\n\n` +
        `Understanding your peak days helps you engineer more of them.`,
      scientificExplanation:
        'Peak performance days often share common preconditions. Identifying and replicating these conditions ' +
        'is a core principle of deliberate practice and performance psychology.',
      confidence: 90,
      isRead: false,
      isDismissed: false,
      score: 72,
    });
  }

  // ---- Week-over-week improvement ----
  if (ctx.currentWeekRate > ctx.lastWeekRate + 5 && ctx.lastWeekRate > 0) {
    const vars = {
      thisWeek: ctx.currentWeekRate,
      lastWeek: ctx.lastWeekRate,
      diff: ctx.currentWeekRate - ctx.lastWeekRate,
    };

    out.push({
      type: 'achievement',
      priority: 'medium',
      title: fill(
        pick(celebrationConsistency.titles, seed + ':wow'),
        vars
      ),
      summary: fill(
        pick(celebrationConsistency.summaries, seed + ':wow:s'),
        vars
      ),
      detailedAnalysis:
        `This week: ${vars.thisWeek}% completion rate\n` +
        `Last week: ${vars.lastWeek}%\n` +
        `Improvement: +${vars.diff} percentage points\n\n` +
        (vars.diff > 20
          ? `That's a massive jump. You clearly changed something this week — keep that up.`
          : `Steady improvement like this compounds dramatically over months.`),
      scientificExplanation:
        'Week-over-week gains, even small ones (3-5%), compound to transformative change over months. ' +
        'A 5% weekly improvement means doubling performance in ~14 weeks.',
      confidence: 80,
      isRead: false,
      isDismissed: false,
      score: 65,
    });
  }

  // ---- Comeback ----
  if (ctx.isComeback) {
    out.push({
      type: 'achievement',
      priority: 'medium',
      title: pick(celebrationComeback.titles, seed + ':cb'),
      summary: pick(celebrationComeback.summaries, seed + ':cb:s'),
      detailedAnalysis:
        `You had a gap in your tracking, but you came back. That matters more than you think.\n\n` +
        `Research shows that the ability to resume after a lapse is the #1 predictor ` +
        `of long-term habit success — not perfect streaks.\n\n` +
        `Today is Day 1 of your next chapter.`,
      scientificExplanation:
        'The "abstinence violation effect" (Marlatt & Gordon, 1985) describes how a single lapse can trigger ' +
        'total abandonment. Those who treat lapses as data rather than failure are significantly more likely to achieve lasting change.',
      confidence: 85,
      isRead: false,
      isDismissed: false,
      score: 75,
    });
  }

  return out;
}

// ==========================================
// DISCOVERY / MICRO-INSIGHT
// ==========================================

function genDiscoveries(
  ctx: MilestoneContext,
  correlations?: HabitCorrelation[],
  stage?: JourneyStage
): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];
  const seed = daySeed('disc');

  // ---- Weekly comparison ----
  if (ctx.currentWeekRate > 0 && ctx.lastWeekRate > 0) {
    const diff = ctx.currentWeekRate - ctx.lastWeekRate;
    const verdict =
      diff > 10
        ? 'Significant improvement. 💪'
        : diff > 0
        ? 'Slight uptick. Keep building.'
        : diff > -10
        ? 'Small dip — nothing to worry about.'
        : 'Noticeable drop. Worth reflecting on what changed.';
    const trendWord = diff >= 0 ? 'Up' : 'Down';

    const vars = {
      thisWeek: ctx.currentWeekRate,
      lastWeek: ctx.lastWeekRate,
      verdict,
      trendWord,
      thisCount: Math.round(ctx.currentWeekRate),
      lastCount: Math.round(ctx.lastWeekRate),
    };

    out.push({
      type: 'pattern',
      priority: 'low',
      title: fill(pick(discoveryComparison.titles, seed + ':comp'), vars),
      summary: fill(
        pick(discoveryComparison.summaries, seed + ':comp:s'),
        vars
      ),
      detailedAnalysis:
        `This week: ${ctx.currentWeekRate}% completion\n` +
        `Last week: ${ctx.lastWeekRate}%\n` +
        `Change: ${diff > 0 ? '+' : ''}${diff} points\n\n${verdict}`,
      confidence: 70,
      isRead: false,
      isDismissed: false,
      score: 35,
    });
  }

  // ---- Fun fact ----
  if (ctx.totalCompletions > 0 || ctx.totalDaysTracked > 0) {
    const vars: Record<string, string | number> = {
      total: ctx.totalCompletions,
      days: ctx.totalDaysTracked,
      topHabit: ctx.topHabitName ?? 'your top habit',
      topRate: ctx.topHabitRate ?? 0,
      bestDay: ctx.bestDayOfWeek ?? 'Monday',
      longestStreak: ctx.longestEverStreak?.days ?? 0,
      streakHabit: ctx.longestEverStreak?.habitName ?? 'a habit',
    };

    out.push({
      type: 'pattern',
      priority: 'low',
      title: fill(pick(discoveryFunFact.titles, seed + ':fun'), vars),
      summary: fill(
        pick(discoveryFunFact.summaries, seed + ':fun:s'),
        vars
      ),
      detailedAnalysis:
        `Your habit data at a glance:\n\n` +
        `• Total completions: ${ctx.totalCompletions}\n` +
        `• Days tracked: ${ctx.totalDaysTracked}\n` +
        (ctx.topHabitName
          ? `• Most reliable: ${ctx.topHabitName} (${ctx.topHabitRate}%)\n`
          : '') +
        (ctx.bestDayOfWeek ? `• Strongest day: ${ctx.bestDayOfWeek}\n` : '') +
        (ctx.longestEverStreak
          ? `• Longest streak: ${ctx.longestEverStreak.days} days (${ctx.longestEverStreak.habitName})\n`
          : ''),
      confidence: 60,
      isRead: false,
      isDismissed: false,
      score: 30,
    });
  }

  // ---- Thought-provoking question (established/veteran only) ----
  if (
    (stage === 'established' || stage === 'veteran') &&
    correlations &&
    correlations.length >= 2
  ) {
    const top = correlations.find(
      c => c.correlation > 0.3 && c.significance !== 'none'
    );
    const best = ctx.bestDayOfWeek ?? 'Monday';
    const worst = ctx.worstDayOfWeek ?? 'Sunday';

    if (top) {
      const vars = {
        topHabit: top.habitName,
        bestDay: best,
        worstDay: worst,
        habit1: correlations[0]?.habitName ?? '',
        habit2: correlations[1]?.habitName ?? '',
      };

      out.push({
        type: 'pattern',
        priority: 'low',
        title: fill(pick(discoveryQuestion.titles, seed + ':q'), vars),
        summary: fill(
          pick(discoveryQuestion.summaries, seed + ':q:s'),
          vars
        ),
        detailedAnalysis:
          `This insight is based on patterns in your data.\n\n` +
          `Sometimes the most valuable thing isn't an answer — it's the right question.\n\n` +
          `Reflect on this during your next quiet moment.`,
        confidence: 50,
        isRead: false,
        isDismissed: false,
        score: 28,
      });
    }
  }

  return out;
}

// ==========================================
// TIPS & WINS
// ==========================================

function genTipsAndWins(
  ctx: TipsAndWinsContext,
  stage: JourneyStage
): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];
  const seed = daySeed('tw');

  // ------------------------------------------------------------------
  // WINS — recognize small victories that aren't milestone-level
  // ------------------------------------------------------------------

  // Win: All habits done today (not a new record — records handled by celebrations)
  if (
    ctx.habitsCompletedToday === ctx.totalHabitsToday &&
    ctx.totalHabitsToday > 0
  ) {
    out.push({
      type: 'achievement',
      priority: 'medium',
      title: pick(
        [
          '✅ Clean Sweep Today',
          '💯 100% Day',
          '🎯 Every Single One — Done',
          '🏅 Perfect Execution Today',
          '✨ Full Completion Day',
        ],
        seed + ':perfect'
      ),
      summary: pick(
        [
          `All ${ctx.totalHabitsToday} habits completed. That takes real discipline.`,
          `${ctx.totalHabitsToday} for ${ctx.totalHabitsToday}. No exceptions. Well done.`,
          `Perfect day — every habit checked off. You earned this one.`,
          `100% completion. Enjoy this feeling — you built it with effort.`,
        ],
        seed + ':perfect:s'
      ),
      detailedAnalysis:
        `Today's scorecard: ${ctx.totalHabitsToday}/${ctx.totalHabitsToday} habits completed.\n\n` +
        `Completed:\n${ctx.habitsDoneToday.map(n => '✅ ' + n).join('\n')}\n\n` +
        `Perfect days don't happen by accident. The decisions you made today — ` +
        `what you prioritized, what you said no to — made this possible.\n\n` +
        (stage === 'newcomer' || stage === 'building'
          ? `Early perfect days build the identity of "someone who follows through." That identity is more powerful than any single habit.`
          : `You know the drill. Now the question is: can you string together two perfect days in a row?`),
      scientificExplanation:
        'Full completion days create a "mastery experience" — the strongest source of self-efficacy ' +
        '(Bandura, 1997). Each one strengthens your belief that you can follow through, which makes ' +
        'future completion more likely.',
      confidence: 95,
      isRead: false,
      isDismissed: false,
      score: 72,
    });
  }

  // Win: More than half done early in the day
  if (
    ctx.currentHour < 12 &&
    ctx.completionPctToday >= 50 &&
    ctx.habitsRemainingToday > 0
  ) {
    out.push({
      type: 'achievement',
      priority: 'low',
      title: pick(
        [
          '⚡ Half Done Before Noon',
          '🌅 Morning Momentum',
          '☀️ Strong Morning Start',
          '🏃 Ahead of Schedule',
        ],
        seed + ':morning'
      ),
      summary: pick(
        [
          `${ctx.habitsCompletedToday} habits done before noon. ${ctx.habitsRemainingToday} to go — you've got this.`,
          `Over half your habits are done and it's not even lunchtime.`,
          `Front-loading your habits like this frees up your afternoon for deep work or rest.`,
          `${ctx.completionPctToday}% done before midday. That's a power move.`,
        ],
        seed + ':morning:s'
      ),
      detailedAnalysis:
        `Completed so far:\n${ctx.habitsDoneToday.map(n => '✅ ' + n).join('\n')}\n\n` +
        `Remaining:\n${ctx.habitsDueButNotDone.map(n => '⬜ ' + n).join('\n')}\n\n` +
        `Finishing habits early reduces "decision residue" — the mental load of ` +
        `knowing you still have things to do. Your afternoon self will thank you.`,
      scientificExplanation:
        'Morning habit completion leverages peak cortisol levels (cortisol awakening response) ' +
        'and fresh executive function. Willpower depletes through the day — ' +
        'front-loading reduces the chance of evening skip.',
      confidence: 80,
      isRead: false,
      isDismissed: false,
      score: 48,
    });
  }

  // Win: Multi-day streak count growing
  if (ctx.activeStreakCount >= 3) {
    out.push({
      type: 'achievement',
      priority: 'low',
      title: pick(
        [
          `🔥 ${ctx.activeStreakCount} Active Streaks`,
          `${ctx.activeStreakCount} Habits on a Roll`,
          `Multi-Streak Mode: ${ctx.activeStreakCount} and Counting`,
          `🎯 ${ctx.activeStreakCount} Chains Going Strong`,
        ],
        seed + ':multistreak'
      ),
      summary: pick(
        [
          `You have ${ctx.activeStreakCount} habits with active streaks. That's consistency across the board.`,
          `${ctx.activeStreakCount} simultaneous streaks shows system-level discipline, not just individual effort.`,
          `Maintaining ${ctx.activeStreakCount} streaks at once is harder than it looks. Respect.`,
        ],
        seed + ':multistreak:s'
      ),
      detailedAnalysis:
        `Active streaks: ${ctx.activeStreakCount}\n` +
        (ctx.habitWithLongestStreak
          ? `Longest: ${ctx.habitWithLongestStreak} (${ctx.longestActiveStreak} days)\n\n`
          : '\n') +
        `Maintaining multiple streaks simultaneously builds what researchers call ` +
        `"habit clusters" — self-reinforcing groups of behaviors that support each other.\n\n` +
        `The risk: if one breaks, others can follow (domino effect). ` +
        `Protect your anchor habit — the one that makes all others easier.`,
      scientificExplanation:
        'Habit clusters create positive feedback loops in the basal ganglia. ' +
        'Completing one habit primes the reward pathway, reducing activation energy ' +
        'for the next habit in the cluster.',
      confidence: 75,
      isRead: false,
      isDismissed: false,
      score: 42,
    });
  }

  // Win: Improving trend
  if (ctx.performanceTrend === 'up' && ctx.last7DayAvgCompletionRate >= 60) {
    out.push({
      type: 'achievement',
      priority: 'low',
      title: pick(
        [
          '📈 You\'re Trending Up',
          '🌱 Growth Mode',
          '⬆️ Progress Is Visible',
          '📊 The Trend Says It All',
        ],
        seed + ':trending'
      ),
      summary: pick(
        [
          `Your 7-day average is ${ctx.last7DayAvgCompletionRate}% and climbing. Keep feeding this.`,
          `Performance trend: upward. This is what sustained effort looks like in data.`,
          `${ctx.last7DayAvgCompletionRate}% average with an upward trajectory. You're in a good place.`,
        ],
        seed + ':trending:s'
      ),
      detailedAnalysis:
        `7-day completion rate: ${ctx.last7DayAvgCompletionRate}%\n` +
        `7-day energy average: ${ctx.last7DayAvgEnergy}%\n` +
        `Trend: Upward ↑\n\n` +
        `When you're trending up, the most important thing is to NOT change too much. ` +
        `The system is working. Resist the urge to add new habits or increase targets. ` +
        `Let the current momentum compound.\n\n` +
        `The time to level up is after 2+ weeks of sustained performance.`,
      scientificExplanation:
        'Positive momentum creates an "upward spiral" — improved self-efficacy leads to more effort, ' +
        'which leads to better results, which further improves self-efficacy (Fredrickson & Joiner, 2002).',
      confidence: 70,
      isRead: false,
      isDismissed: false,
      score: 44,
    });
  }

  // ------------------------------------------------------------------
  // CONTEXTUAL TIPS — smart, timely, not generic
  // ------------------------------------------------------------------

  // Tip: Haven't started yet and it's getting late
  if (
    ctx.habitsCompletedToday === 0 &&
    ctx.totalHabitsToday > 0 &&
    ctx.currentHour >= 18
  ) {
    out.push({
      type: 'optimization',
      priority: 'medium',
      title: pick(
        [
          '🌙 Day\'s Not Over Yet',
          '⏰ Still Time',
          '🎯 Just Start One',
          '💡 The Minimum Viable Evening',
        ],
        seed + ':latestart'
      ),
      summary: pick(
        [
          `${ctx.totalHabitsToday} habits remaining. Pick the easiest one and do it in 2 minutes.`,
          `It's evening, but doing even 1 habit keeps your streak alive and your identity intact.`,
          `Zero to one is the hardest jump. Just start the smallest habit. Momentum will carry you.`,
          `Don't aim for perfect tonight. Aim for "didn't skip a day."`,
        ],
        seed + ':latestart:s'
      ),
      detailedAnalysis:
        `Remaining today:\n${ctx.habitsDueButNotDone.map(n => '⬜ ' + n).join('\n')}\n\n` +
        `Recommendation: Pick the habit that takes the least time and do it right now.\n\n` +
        `Why this matters: The difference between 0 and 1 completion is bigger than ` +
        `the difference between 3 and 5. Psychologically, a zero-day breaks identity. ` +
        `A one-habit day preserves it.\n\n` +
        `If you're low energy, do the absolute minimum version. ` +
        `1 pushup. 1 page. 1 minute of meditation. It counts.`,
      scientificExplanation:
        'The "Zeigarnik effect" shows unfinished tasks create mental tension. ' +
        'Completing even one habit releases this tension and prevents the "what-the-hell effect" ' +
        'that leads to total abandonment.',
      confidence: 80,
      actionLabel: 'View Habits',
      actionType: 'habit',
      isRead: false,
      isDismissed: false,
      score: 62,
    });
  }

  // Tip: Declining trend detected
  if (
    ctx.performanceTrend === 'down' &&
    ctx.last7DayAvgCompletionRate < 60
  ) {
    out.push({
      type: 'optimization',
      priority: 'medium',
      title: pick(
        [
          '📉 Let\'s Course Correct',
          '🔧 Small Adjustment Needed',
          '💭 Time to Simplify',
          '🧭 Recalibrating',
        ],
        seed + ':declining'
      ),
      summary: pick(
        [
          `${ctx.last7DayAvgCompletionRate}% average with a downward trend. Let's address this before it sticks.`,
          `Completion rate is slipping. The fix is usually simpler than you think.`,
          `Declining performance is normal. What matters is catching it early — which you just did.`,
        ],
        seed + ':declining:s'
      ),
      detailedAnalysis:
        `7-day completion rate: ${ctx.last7DayAvgCompletionRate}%\n` +
        `Trend: Downward ↓\n\n` +
        `Before changing anything, ask yourself:\n\n` +
        `1. Am I trying to do too many habits?\n` +
        `   → Drop your least impactful habit for a week.\n\n` +
        `2. Are any habits too ambitious?\n` +
        `   → Cut them in half. "Read 20 pages" → "Read 5 pages."\n\n` +
        `3. Is something external causing this?\n` +
        `   → Stressful period? Accept a lower bar temporarily.\n\n` +
        `4. Am I bored?\n` +
        `   → Swap one habit for something you're genuinely curious about.\n\n` +
        (ctx.leastConsistentHabit
          ? `Your least consistent habit right now is "${ctx.leastConsistentHabit}" (${ctx.leastConsistentRate}%). Start there.`
          : 'Start with your hardest-to-complete habit. Either simplify it or replace it.'),
      scientificExplanation:
        'Performance declines often result from "habit load" exceeding available willpower. ' +
        'Baumeister\'s ego depletion research suggests reducing demands is more effective than ' +
        'increasing motivation when resources are low.',
      confidence: 75,
      isRead: false,
      isDismissed: false,
      score: 58,
    });
  }

  // Tip: Low energy + many habits remaining
  if (ctx.last7DayAvgEnergy < 40 && ctx.habitsRemainingToday >= 3) {
    out.push({
      type: 'optimization',
      priority: 'medium',
      title: pick(
        [
          '🔋 Low Battery Mode',
          '⚡ Energy Is Low — Adapt',
          '🫠 Running on Fumes? Here\'s What to Do',
          '🧘 Go Gentle Today',
        ],
        seed + ':lowenergy'
      ),
      summary: pick(
        [
          `Energy averaging ${ctx.last7DayAvgEnergy}% with ${ctx.habitsRemainingToday} habits left. Do minimum viable versions.`,
          `Your energy is low. Quality > quantity today. Pick 1-2 key habits only.`,
          `Low energy doesn't mean low value. Do the tiniest version of each habit that still counts.`,
        ],
        seed + ':lowenergy:s'
      ),
      detailedAnalysis:
        `Current state:\n` +
        `• 7-day energy average: ${ctx.last7DayAvgEnergy}%\n` +
        `• Habits remaining: ${ctx.habitsRemainingToday}\n\n` +
        `Low-energy protocol:\n\n` +
        `1. Pick your #1 most important habit and do only that one fully.\n` +
        `2. For the rest, do "minimum viable" versions:\n` +
        `   • 30-min workout → 5-min walk\n` +
        `   • 20 pages → 2 pages\n` +
        `   • Full journal entry → 1 sentence\n\n` +
        `3. Skip anything optional without guilt.\n\n` +
        `The goal on low-energy days isn't progress — it's maintenance. ` +
        `Don't break the chain, but don't burn yourself out either.`,
      scientificExplanation:
        'On low-energy days, the prefrontal cortex (responsible for self-control) operates at reduced capacity. ' +
        'Reducing habit scope preserves the neural habit loop while avoiding the depletion ' +
        'that makes tomorrow even harder.',
      confidence: 70,
      isRead: false,
      isDismissed: false,
      score: 55,
    });
  }

  // Tip: Weekend-specific
  if (ctx.isWeekend && ctx.habitsRemainingToday > 0) {
    out.push({
      type: 'optimization',
      priority: 'low',
      title: pick(
        [
          '🌴 Weekend Habits — Different Rules',
          '📅 Weekend Mode',
          '🧩 Weekend Strategy',
          '☕ Make Weekends Work for You',
        ],
        seed + ':weekend'
      ),
      summary: pick(
        [
          'Weekends lack the structure of workdays. Set a specific time for each habit or they\'ll slip.',
          'Without work-day cues, habits need intentional scheduling on weekends.',
          'Weekends feel free — but unstructured time is where habits go to die. Pick your slots.',
        ],
        seed + ':weekend:s'
      ),
      detailedAnalysis:
        `You have ${ctx.habitsRemainingToday} habits remaining today.\n\n` +
        `Weekend habit tips:\n\n` +
        `• Morning anchor: Do your #1 habit within 30 minutes of waking\n` +
        `• Time blocks: Assign specific times — "meditation at 9 AM, read at 3 PM"\n` +
        `• Pair with weekend pleasures: "After my coffee (cue), I journal (habit)"\n` +
        `• Accept a modified version: Weekend habits can look different than weekday ones\n\n` +
        (ctx.mostConsistentHabit
          ? `Start with "${ctx.mostConsistentHabit}" — it has the most momentum (${ctx.mostConsistentRate}%).`
          : 'Start with the habit that feels easiest right now.'),
      scientificExplanation:
        'Weekday habits benefit from external cues (commute, work schedule, lunch break). ' +
        'Weekends remove these cues, requiring explicit implementation intentions. ' +
        'Research shows that "when-then" plans increase follow-through by 2-3x on unstructured days.',
      confidence: 65,
      isRead: false,
      isDismissed: false,
      score: 35,
    });
  }

  // Tip: Overdue tasks piling up
  if ((ctx.overdueTaskCount ?? 0) >= 3) {
    out.push({
      type: 'optimization',
      priority: 'high',
      title: pick(
        [
          '📋 Task Backlog Alert',
          '⏰ Overdue Tasks Need Attention',
          '🧹 Time for a Task Triage',
          '📌 Clear the Backlog',
        ],
        seed + ':overdue'
      ),
      summary: pick(
        [
          `${ctx.overdueTaskCount} overdue tasks. Pick 1 to finish, 1 to reschedule, and 1 to delete.`,
          `Overdue tasks create invisible stress. Take 10 minutes to triage them.`,
          `${ctx.overdueTaskCount} tasks past due. The weight of undone things drains more energy than doing them.`,
        ],
        seed + ':overdue:s'
      ),
      detailedAnalysis:
        `You have ${ctx.overdueTaskCount} overdue tasks.\n\n` +
        `The triage method:\n\n` +
        `1. DO: Pick the one task with the highest impact. Do it first today.\n` +
        `2. DEFER: Reschedule 1-2 tasks to realistic dates.\n` +
        `3. DELETE: Remove any task that no longer matters. Be ruthless.\n\n` +
        `Why this matters: Uncompleted tasks occupy working memory (the "Zeigarnik effect"), ` +
        `reducing cognitive capacity for everything else — including your habits.\n\n` +
        `Clearing even 2-3 overdue items can feel like a weight lifted.`,
      scientificExplanation:
        'Unfinished tasks create "attention residue" — they occupy background cognitive resources ' +
        'even when you\'re not actively thinking about them (Leroy, 2009). ' +
        'This reduces available working memory by up to 20%.',
      confidence: 80,
      actionLabel: 'View Tasks',
      actionType: 'task',
      isRead: false,
      isDismissed: false,
      score: 60,
    });
  }

  // Tip: Most consistent habit recognition (MVP habit)
  if (
    ctx.mostConsistentHabit &&
    (ctx.mostConsistentRate ?? 0) >= 85 &&
    stage !== 'newcomer'
  ) {
    out.push({
      type: 'achievement',
      priority: 'low',
      title: pick(
        [
          `🏆 MVP Habit: ${ctx.mostConsistentHabit}`,
          `💎 Your Rock: ${ctx.mostConsistentHabit}`,
          `🌟 ${ctx.mostConsistentHabit} — ${ctx.mostConsistentRate}% Consistent`,
          `📌 Anchor Habit: ${ctx.mostConsistentHabit}`,
        ],
        seed + ':mvp'
      ),
      summary: pick(
        [
          `${ctx.mostConsistentHabit} at ${ctx.mostConsistentRate}% is your most reliable habit. It anchors everything else.`,
          `With ${ctx.mostConsistentRate}% consistency, ${ctx.mostConsistentHabit} is practically automatic.`,
          `${ctx.mostConsistentHabit} is your keystone habit. When this one gets done, others follow.`,
        ],
        seed + ':mvp:s'
      ),
      detailedAnalysis:
        `${ctx.mostConsistentHabit}: ${ctx.mostConsistentRate}% completion rate\n\n` +
        `This habit serves as your "keystone habit" — the one that creates a ripple effect ` +
        `across the rest of your routine.\n\n` +
        `Charles Duhigg's research shows that keystone habits don't succeed because of what they are, ` +
        `but because of the chain reactions they start. When you complete ${ctx.mostConsistentHabit}, ` +
        `it signals to your brain that "today is a day I follow through."\n\n` +
        `Protect this habit above all others. If you can only do one thing today, do this one.`,
      scientificExplanation:
        'Keystone habits create "small wins" that trigger other positive behaviors. ' +
        'Research shows that families who eat dinner together (a keystone habit) also exercise more, ' +
        'manage money better, and have higher homework completion rates — not because of dinner itself, ' +
        'but because of the identity and discipline it reinforces.',
      confidence: 85,
      isRead: false,
      isDismissed: false,
      score: 38,
    });
  }

  // Tip: Least consistent habit needs a rethink
  if (
    ctx.leastConsistentHabit &&
    (ctx.leastConsistentRate ?? 0) < 30 &&
    ctx.leastConsistentHabit !== ctx.mostConsistentHabit &&
    stage !== 'newcomer'
  ) {
    out.push({
      type: 'optimization',
      priority: 'low',
      title: pick(
        [
          `🔧 Struggling: ${ctx.leastConsistentHabit}`,
          `💡 "${ctx.leastConsistentHabit}" Needs a Redesign`,
          `🤔 Is "${ctx.leastConsistentHabit}" Working?`,
          `📊 ${ctx.leastConsistentRate}% — Time to Rethink This`,
        ],
        seed + ':struggle'
      ),
      summary: pick(
        [
          `${ctx.leastConsistentHabit} at ${ctx.leastConsistentRate}% — not a motivation problem, it's a design problem.`,
          `When a habit consistently resists completion, the habit needs to change — not you.`,
          `${ctx.leastConsistentRate}% means this habit isn't matching your life right now. Adjust it.`,
        ],
        seed + ':struggle:s'
      ),
      detailedAnalysis:
        `"${ctx.leastConsistentHabit}" — ${ctx.leastConsistentRate}% completion rate\n\n` +
        `When a habit falls below 30%, willpower isn't the issue. The habit design is.\n\n` +
        `Try these fixes (in order):\n\n` +
        `1. SHRINK IT: Make it so small it feels silly to skip.\n` +
        `   "Run 30 min" → "Put on running shoes"\n\n` +
        `2. STACK IT: Attach it to a habit you already do.\n` +
        `   "After I [reliable habit], I [struggling habit]"\n\n` +
        `3. RESCHEDULE IT: Maybe it's at the wrong time of day.\n` +
        `   Try morning if you do it at night, or vice versa.\n\n` +
        `4. REPLACE IT: If you've tried 1-3 and it still doesn't stick,\n` +
        `   this habit may not serve your current goals. That's okay.\n\n` +
        `Not every habit deserves a spot in your routine forever.`,
      scientificExplanation:
        'BJ Fogg\'s Behavior Model (B=MAP) states that behavior happens when Motivation, Ability, ' +
        'and Prompt align. A consistently skipped habit usually has an Ability problem (too hard) ' +
        'or a Prompt problem (wrong cue), not a Motivation problem.',
      confidence: 70,
      isRead: false,
      isDismissed: false,
      score: 40,
    });
  }

  // Tip: Morning power hour
  if (
    ctx.currentHour >= 6 &&
    ctx.currentHour <= 10 &&
    ctx.habitsCompletedToday > 0 &&
    ctx.habitsRemainingToday > 0
  ) {
    out.push({
      type: 'optimization',
      priority: 'low',
      title: pick(
        [
          '☀️ Morning Power Hour',
          '🧠 Your Brain Is Sharpest Now',
          '⚡ Peak Willpower Window',
          '🌅 Morning = Maximum Capacity',
        ],
        seed + ':amtip'
      ),
      summary: pick(
        [
          `You've started strong. Finish your hardest remaining habit in the next hour while willpower is high.`,
          `Morning cortisol peaks in the next 60 min. Tackle your toughest habit now.`,
          `The first 3 hours after waking are your willpower golden zone. Make them count.`,
        ],
        seed + ':amtip:s'
      ),
      detailedAnalysis:
        `You've done ${ctx.habitsCompletedToday} habits so far. ${ctx.habitsRemainingToday} remaining.\n\n` +
        `The neuroscience of mornings:\n\n` +
        `• Cortisol peaks 30-45 min after waking (cortisol awakening response)\n` +
        `• Prefrontal cortex operates at highest capacity\n` +
        `• Willpower hasn't been depleted by decisions yet\n` +
        `• Fewer distractions compete for attention\n\n` +
        `This is why morning routines are so effective — they ride a biological wave ` +
        `that doesn't repeat later in the day.\n\n` +
        `Remaining:\n${ctx.habitsDueButNotDone.map(n => '⬜ ' + n).join('\n')}`,
      scientificExplanation:
        'The cortisol awakening response (CAR) creates a 30-60 minute window of heightened alertness ' +
        'and cognitive flexibility within an hour of waking. Decision fatigue research (Danziger et al., 2011) ' +
        'shows that self-control decreases measurably through the day.',
      confidence: 70,
      isRead: false,
      isDismissed: false,
      score: 36,
    });
  }

  // Tip: High energy but low completions — nudge
  if (
    ctx.last7DayAvgEnergy >= 65 &&
    ctx.last7DayAvgCompletionRate < 50 &&
    stage !== 'newcomer'
  ) {
    out.push({
      type: 'optimization',
      priority: 'medium',
      title: pick(
        [
          '🔍 Energy vs. Action Gap',
          '💡 You Have the Energy — Use It',
          '🤔 High Energy, Low Output?',
          '⚡ Untapped Potential',
        ],
        seed + ':gap'
      ),
      summary: pick(
        [
          `Energy is at ${ctx.last7DayAvgEnergy}% but habits at ${ctx.last7DayAvgCompletionRate}%. The bottleneck isn't energy — it's something else.`,
          `You have the fuel. The question is what's blocking the action.`,
          `High energy + low completion usually means a cue or timing problem, not a motivation one.`,
        ],
        seed + ':gap:s'
      ),
      detailedAnalysis:
        `Your data shows an interesting gap:\n\n` +
        `• Average energy: ${ctx.last7DayAvgEnergy}% (good)\n` +
        `• Completion rate: ${ctx.last7DayAvgCompletionRate}% (below potential)\n\n` +
        `When energy is high but habits aren't getting done, the issue is usually:\n\n` +
        `1. Missing cues: Your habits don't have clear triggers\n` +
        `   Fix: "After I [existing behavior], I will [habit]"\n\n` +
        `2. Wrong timing: Habits are scheduled at inconvenient times\n` +
        `   Fix: Move habits to your natural transition points\n\n` +
        `3. Decision paralysis: Too many habits, unclear priorities\n` +
        `   Fix: Mark your top 2 habits as non-negotiable, rest as optional\n\n` +
        `4. Friction: The habit requires too many steps to start\n` +
        `   Fix: Reduce setup to under 30 seconds`,
      scientificExplanation:
        'The gap between motivation and behavior is called the "intention-action gap" ' +
        '(Sheeran & Webb, 2016). Research shows this gap is best closed not by increasing motivation, ' +
        'but by reducing friction and strengthening cues.',
      confidence: 70,
      isRead: false,
      isDismissed: false,
      score: 52,
    });
  }

  return out;
}

// ==========================================
// CONVERT TO DB RECORDS
// ==========================================

export function toInsightRecords(
  insights: GeneratedInsight[]
): Omit<Insight, 'id' | 'createdAt'>[] {
  return insights.map(({ score, ...rest }) => rest);
}