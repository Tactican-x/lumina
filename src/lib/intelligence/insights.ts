/**
 * Insight Generation Engine
 * 
 * Synthesizes data from patterns, correlations, and predictions
 * to generate actionable insights for the user.
 */

import { v4 as generateId } from '@/utils';
import { Insight, InsightType, InsightPriority } from '@/types';
import { HabitCorrelation } from './correlations';
import { BehavioralPattern, AnomalyDetection } from './patterns';
import { PerformancePrediction, BurnoutPrediction, GoalPrediction, StreakPrediction } from './predictions';
import { CircadianProfile, RealTimeEnergy } from './circadian';
import { insightTypeConfig } from '@/constants';

// ==========================================
// TYPES
// ==========================================

export interface InsightGeneratorInput {
  correlations?: HabitCorrelation[];
  patterns?: BehavioralPattern[];
  anomalies?: AnomalyDetection[];
  predictions?: PerformancePrediction[];
  burnout?: BurnoutPrediction;
  goalPredictions?: GoalPrediction[];
  streakPredictions?: StreakPrediction[];
  circadian?: CircadianProfile;
  currentEnergy?: RealTimeEnergy;
}

export interface GeneratedInsight extends Omit<Insight, 'id' | 'createdAt'> {
  score: number; // Priority score for ranking
}

// ==========================================
// MAIN INSIGHT GENERATOR
// ==========================================

/**
 * Generate all insights from available data
 */
export function generateInsights(input: InsightGeneratorInput): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];

  // Generate correlation insights
  if (input.correlations) {
    insights.push(...generateCorrelationInsights(input.correlations));
  }

  // Generate pattern insights
  if (input.patterns) {
    insights.push(...generatePatternInsights(input.patterns));
  }

  // Generate anomaly warnings
  if (input.anomalies) {
    insights.push(...generateAnomalyInsights(input.anomalies));
  }

  // Generate performance predictions
  if (input.predictions) {
    insights.push(...generatePredictionInsights(input.predictions));
  }

  // Generate burnout warnings
  if (input.burnout) {
    insights.push(...generateBurnoutInsights(input.burnout));
  }

  // Generate goal insights
  if (input.goalPredictions) {
    insights.push(...generateGoalInsights(input.goalPredictions));
  }

  // Generate streak warnings
  if (input.streakPredictions) {
    insights.push(...generateStreakInsights(input.streakPredictions));
  }

  // Generate circadian insights
  if (input.circadian && input.currentEnergy) {
    insights.push(...generateCircadianInsights(input.circadian, input.currentEnergy));
  }

  // Sort by priority score (highest first)
  insights.sort((a, b) => b.score - a.score);

  // Limit to top insights to avoid overwhelming
  return insights.slice(0, 10);
}

// ==========================================
// CORRELATION INSIGHTS
// ==========================================

function generateCorrelationInsights(
  correlations: HabitCorrelation[]
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];

  // High impact habits
  const highImpact = correlations.filter(
    c => c.correlation > 0.5 && c.significance !== 'none'
  );

  if (highImpact.length > 0) {
    const top = highImpact[0];
    insights.push({
      type: 'correlation',
      priority: 'high',
      title: `${top.habitName} is Your Superpower`,
      summary: `This habit has a ${Math.round(top.correlation * 100)}% positive correlation with your performance`,
      detailedAnalysis: top.description + '\n\n' + 
        `Statistical confidence: ${Math.round(top.confidence)}%\n` +
        `Sample size: ${top.sampleSize} days analyzed`,
      scientificExplanation: top.scientificExplanation,
      confidence: top.confidence,
      correlationValue: top.correlation,
      pValue: top.pValue,
      actionLabel: 'View Habit Details',
      actionType: 'habit',
      actionPayload: { habitId: top.habitId },
      relatedHabitIds: [top.habitId],
      isRead: false,
      isDismissed: false,
      score: 80 + top.correlation * 20,
    });
  }

  // Negative impact habits
  const negative = correlations.filter(
    c => c.correlation < -0.3 && c.significance !== 'none'
  );

  if (negative.length > 0) {
    const worst = negative[0];
    insights.push({
      type: 'optimization',
      priority: 'medium',
      title: `Rethink: ${worst.habitName}`,
      summary: `This habit shows a negative correlation with your performance`,
      detailedAnalysis: worst.description + '\n\n' +
        'This doesn\'t necessarily mean the habit is bad - consider:\n' +
        '• Is the timing wrong?\n' +
        '• Is it taking too much energy?\n' +
        '• Does it conflict with other priorities?',
      scientificExplanation: worst.scientificExplanation,
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

  // Multiplier effect (multiple high-impact habits)
  if (highImpact.length >= 2) {
    const names = highImpact.slice(0, 3).map(h => h.habitName).join(', ');
    const avgCorrelation = highImpact.reduce((sum, h) => sum + h.correlation, 0) / highImpact.length;
    
    insights.push({
      type: 'pattern',
      priority: 'medium',
      title: 'Multiplier Effect Detected',
      summary: `${highImpact.length} habits are driving your performance`,
      detailedAnalysis: `Your high-impact habits (${names}) work together to boost your performance.\n\n` +
        'When you complete these habits consistently, the combined effect is greater than each individual habit.\n\n' +
        `Average correlation: ${Math.round(avgCorrelation * 100)}%`,
      scientificExplanation: 'Habit stacking creates positive feedback loops in the brain. ' +
        'Completing one positive habit releases dopamine, making the next habit easier to complete.',
      confidence: Math.round(avgCorrelation * 100),
      relatedHabitIds: highImpact.map(h => h.habitId),
      isRead: false,
      isDismissed: false,
      score: 70,
    });
  }

  return insights;
}

// ==========================================
// PATTERN INSIGHTS
// ==========================================

function generatePatternInsights(
  patterns: BehavioralPattern[]
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];

  for (const pattern of patterns) {
    if (pattern.strength < 50) continue; // Skip weak patterns

    const priority: InsightPriority = 
      pattern.type === 'risk' ? 'high' :
      pattern.type === 'success' ? 'medium' : 'low';

    insights.push({
      type: 'pattern',
      priority,
      title: pattern.name,
      summary: pattern.description,
      detailedAnalysis: `Pattern strength: ${pattern.strength}%\n` +
        `Observed ${pattern.occurrences} times\n` +
        `Estimated impact: ${pattern.impact > 0 ? '+' : ''}${pattern.impact}% on performance\n\n` +
        `Recommendations:\n${pattern.recommendations.map(r => '• ' + r).join('\n')}`,
      scientificExplanation: pattern.scientificBasis,
      confidence: pattern.strength,
      effectSize: pattern.impact / 100,
      isRead: false,
      isDismissed: false,
      score: pattern.strength + (pattern.type === 'success' ? 10 : 0),
    });
  }

  return insights;
}

// ==========================================
// ANOMALY INSIGHTS
// ==========================================

function generateAnomalyInsights(
  anomalies: AnomalyDetection[]
): GeneratedInsight[] {
  return anomalies
    .filter(a => a.isAnomaly)
    .map(anomaly => {
      const priority: InsightPriority = 
        anomaly.severity === 'high' ? 'critical' :
        anomaly.severity === 'medium' ? 'high' : 'medium';

      return {
        type: 'warning' as InsightType,
        priority,
        title: anomaly.type === 'performance_drop' 
          ? '⚠️ Performance Drop Detected'
          : anomaly.type === 'overload'
          ? '⚠️ Task Overload Warning'
          : '📊 Unusual Pattern Detected',
        summary: anomaly.description,
        detailedAnalysis: anomaly.description + '\n\n' +
          `Severity: ${anomaly.severity}\n\n` +
          `Suggested action: ${anomaly.suggestedAction}`,
        scientificExplanation: 'Sudden changes in behavioral patterns often precede ' +
          'performance issues. Early detection allows for preventive action.',
        confidence: anomaly.severity === 'high' ? 85 : anomaly.severity === 'medium' ? 70 : 55,
        actionLabel: 'Take Action',
        actionType: 'external',
        isRead: false,
        isDismissed: false,
        score: anomaly.severity === 'high' ? 95 : anomaly.severity === 'medium' ? 75 : 55,
      };
    });
}

// ==========================================
// PREDICTION INSIGHTS
// ==========================================

function generatePredictionInsights(
  predictions: PerformancePrediction[]
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];
  
  if (predictions.length === 0) return insights;

  const tomorrow = predictions[0];
  
  // High performance predicted
  if (tomorrow.predictedScore >= 75) {
    insights.push({
      type: 'prediction',
      priority: 'medium',
      title: '🚀 High Performance Day Ahead',
      summary: `Tomorrow looks great! Predicted score: ${tomorrow.predictedScore}%`,
      detailedAnalysis: `Based on your patterns, tomorrow (${tomorrow.date}) is predicted to be a high-performance day.\n\n` +
        `Predicted score: ${tomorrow.predictedScore}% (${tomorrow.confidence}% confidence)\n` +
        `Range: ${tomorrow.range.low}% - ${tomorrow.range.high}%\n\n` +
        `Contributing factors:\n${tomorrow.factors.map(f => `• ${f.name}: ${f.description}`).join('\n')}`,
      scientificExplanation: 'Performance predictions are based on your historical patterns, ' +
        'recent trends, and cyclical factors like day of week.',
      confidence: tomorrow.confidence,
      actionLabel: 'Plan Important Work',
      actionType: 'task',
      isRead: false,
      isDismissed: false,
      score: 65,
    });
  }

  // Low performance predicted
  if (tomorrow.predictedScore < 50) {
    insights.push({
      type: 'prediction',
      priority: 'medium',
      title: '📉 Lower Energy Day Predicted',
      summary: `Tomorrow may be challenging. Consider a lighter schedule.`,
      detailedAnalysis: `Predicted score: ${tomorrow.predictedScore}%\n\n` +
        tomorrow.recommendation + '\n\n' +
        `Factors:\n${tomorrow.factors.map(f => `• ${f.name}: ${f.description}`).join('\n')}`,
      confidence: tomorrow.confidence,
      actionLabel: 'Adjust Schedule',
      actionType: 'task',
      isRead: false,
      isDismissed: false,
      score: 60,
    });
  }

  return insights;
}

// ==========================================
// BURNOUT INSIGHTS
// ==========================================

function generateBurnoutInsights(
  burnout: BurnoutPrediction
): GeneratedInsight[] {
  if (burnout.warningLevel === 'none' || burnout.warningLevel === 'low') {
    return [];
  }

  const priority: InsightPriority = 
    burnout.warningLevel === 'critical' ? 'critical' :
    burnout.warningLevel === 'high' ? 'high' : 'medium';

  const title = burnout.warningLevel === 'critical'
    ? '🚨 Critical: Burnout Risk Very High'
    : burnout.warningLevel === 'high'
    ? '⚠️ Warning: Elevated Burnout Risk'
    : '📊 Notice: Burnout Risk Increasing';

  return [{
    type: 'warning',
    priority,
    title,
    summary: `Burnout risk at ${burnout.riskLevel}%. Take preventive action.`,
    detailedAnalysis: `Current burnout risk: ${burnout.riskLevel}%\n` +
      (burnout.daysUntilCritical 
        ? `Estimated ${burnout.daysUntilCritical} days until critical if trend continues\n\n`
        : '\n') +
      `Factors:\n${burnout.factors.map(f => `• ${f.name}: ${f.description}`).join('\n')}\n\n` +
      `Prevention steps:\n${burnout.preventionSteps.map(s => '• ' + s).join('\n')}`,
    scientificExplanation: 'Burnout occurs when chronic stress exceeds recovery capacity. ' +
      'Early indicators include declining performance, increased habit skipping, and reduced energy.',
    confidence: burnout.confidence,
    actionLabel: 'View Recovery Plan',
    actionType: 'external',
    isRead: false,
    isDismissed: false,
    score: burnout.warningLevel === 'critical' ? 100 : burnout.warningLevel === 'high' ? 90 : 70,
  }];
}

// ==========================================
// GOAL INSIGHTS
// ==========================================

function generateGoalInsights(
  predictions: GoalPrediction[]
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];

  for (const pred of predictions) {
    // At-risk goals
    if (pred.successProbability < 40 && pred.momentum !== 'accelerating') {
      insights.push({
        type: 'warning',
        priority: 'medium',
        title: '🎯 Goal Needs Attention',
        summary: `"${pred.goalId}" has ${pred.successProbability}% success probability`,
        detailedAnalysis: `Current success probability: ${pred.successProbability}%\n` +
          `Momentum: ${pred.momentum}\n\n` +
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
      insights.push({
        type: 'achievement',
        priority: 'low',
        title: '🌟 Goal On Track!',
        summary: `Great momentum! ${pred.successProbability}% success probability`,
        detailedAnalysis: `You're crushing this goal!\n\n` +
          `Success probability: ${pred.successProbability}%\n` +
          `Momentum: Accelerating\n` +
          (pred.projectedCompletionDate 
            ? `Projected completion: ${pred.projectedCompletionDate.toLocaleDateString()}`
            : ''),
        confidence: pred.confidence,
        relatedGoalIds: [pred.goalId],
        isRead: false,
        isDismissed: false,
        score: 40,
      });
    }
  }

  return insights;
}

// ==========================================
// STREAK INSIGHTS
// ==========================================

function generateStreakInsights(
  predictions: StreakPrediction[]
): GeneratedInsight[] {
  const atRisk = predictions.filter(p => p.riskLevel === 'high');
  
  if (atRisk.length === 0) return [];

  return atRisk.map(pred => ({
    type: 'warning' as InsightType,
    priority: 'high' as InsightPriority,
    title: '🔥 Streak at Risk!',
    summary: `Your streak is vulnerable today (${pred.survivalProbability}% survival)`,
    detailedAnalysis: `Survival probability: ${pred.survivalProbability}%\n\n` +
      `Vulnerable days: ${pred.vulnerableDays.join(', ') || 'None identified'}\n\n` +
      `Protection strategies:\n${pred.protectionStrategies.map(s => '• ' + s).join('\n')}`,
    scientificExplanation: 'Streaks build habit strength through consistent repetition. ' +
      'Breaking a streak resets the psychological momentum, making it harder to restart.',
    confidence: 100 - pred.survivalProbability,
    actionLabel: 'Protect Streak',
    actionType: 'habit',
    actionPayload: { habitId: pred.habitId },
    relatedHabitIds: [pred.habitId],
    isRead: false,
    isDismissed: false,
    score: 85,
  }));
}

// ==========================================
// CIRCADIAN INSIGHTS
// ==========================================

function generateCircadianInsights(
  profile: CircadianProfile,
  current: RealTimeEnergy
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  // Optimal window insight
  if (currentHour >= profile.optimalWorkWindow.start - 1 && 
      currentHour < profile.optimalWorkWindow.start) {
    insights.push({
      type: 'optimization',
      priority: 'medium',
      title: '⚡ Peak Window Approaching',
      summary: `Your optimal work window starts in ~${60 - now.getMinutes()} minutes`,
      detailedAnalysis: `Your peak cognitive window is ${profile.optimalWorkWindow.start}:00 - ${profile.optimalWorkWindow.end}:00.\n\n` +
        `Average performance during this window: ${profile.optimalWorkWindow.averageScore}%\n\n` +
        'Prepare your most important task to tackle during this time.',
      scientificExplanation: 'Circadian rhythms create predictable peaks in cognitive function. ' +
        'Aligning demanding work with these peaks maximizes productivity.',
      confidence: profile.consistency,
      isRead: false,
      isDismissed: false,
      score: 55,
    });
  }

  // Currently in peak
  if (current.currentPhase === 'peak_cognitive') {
    insights.push({
      type: 'optimization',
      priority: 'high',
      title: '🧠 You\'re at Peak Energy!',
      summary: current.recommendation,
      detailedAnalysis: `Current energy: ${current.currentScore}% (${current.percentOfPeak}% of your peak)\n\n` +
        `Current phase: ${current.phaseConfig.name}\n\n` +
        `${current.phaseConfig.description}\n\n` +
        `Best for: ${current.phaseConfig.taskTypes.join(', ')}`,
      scientificExplanation: current.phaseConfig.scientificBasis,
      confidence: profile.consistency,
      isRead: false,
      isDismissed: false,
      score: 70,
    });
  }

  // Chronotype insight (show once)
  const chronotypeDescriptions = {
    early_bird: 'You\'re an early bird! Your best work happens in the morning.',
    night_owl: 'You\'re a night owl! Your energy peaks later in the day.',
    intermediate: 'You have a balanced rhythm with good energy throughout the day.',
  };

  // This would typically check if user has seen this before
  // For now, we'll include it with lower priority

  return insights;
}

// ==========================================
// HELPER: Convert to Database Insight
// ==========================================

/**
 * Convert generated insights to database-ready format
 */
export function toInsightRecords(
  insights: GeneratedInsight[]
): Omit<Insight, 'id' | 'createdAt'>[] {
  return insights.map(insight => {
    const { score, ...rest } = insight;
    return rest;
  });
}
