/**
 * PredictionCard Component
 * Displays AI predictions with confidence levels
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Zap,
} from '@/components/ui/Lucide';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { formatDisplayDate } from '@/utils/date';
import { DayPrediction, BurnoutPrediction } from '@/hooks/usePredictions';

interface PredictionCardProps {
  prediction: DayPrediction;
  onPress?: () => void;
}

export function PredictionCard({ prediction, onPress }: PredictionCardProps) {
  const isToday = prediction.dateKey === new Date().toISOString().split('T')[0];
  const scoreColor = getScoreColor(prediction.productivityScore);

  return (
    <Card variant="default" onPress={onPress} padding="md" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Calendar size={16} color={colors.text.tertiary} />
          <Text style={styles.date}>
            {isToday ? 'Today' : formatDisplayDate(prediction.date)}
          </Text>
        </View>

        <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}20` }]}>
          <Zap size={14} color={scoreColor} />
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {prediction.productivityScore}%
          </Text>
        </View>
      </View>

      {/* Metrics */}
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Energy</Text>
          <ProgressBar
            progress={prediction.energyForecast}
            height={6}
            color={colors.brand.primary}
            style={styles.metricBar}
          />
          <Text style={styles.metricValue}>{prediction.energyForecast}%</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Habit Success</Text>
          <ProgressBar
            progress={prediction.habitSuccessRate}
            height={6}
            color={colors.success.main}
            style={styles.metricBar}
          />
          <Text style={styles.metricValue}>{prediction.habitSuccessRate}%</Text>
        </View>
      </View>

      {/* Risks & Opportunities */}
      <View style={styles.insights}>
        {prediction.risks.length > 0 && (
          <View style={styles.insightGroup}>
            {prediction.risks.map((risk, index) => (
              <View key={index} style={styles.insightItem}>
                <AlertTriangle size={12} color={colors.warning.main} />
                <Text style={styles.insightText}>{risk}</Text>
              </View>
            ))}
          </View>
        )}

        {prediction.opportunities.length > 0 && (
          <View style={styles.insightGroup}>
            {prediction.opportunities.map((opp, index) => (
              <View key={index} style={styles.insightItem}>
                <CheckCircle2 size={12} color={colors.success.main} />
                <Text style={styles.insightText}>{opp}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Confidence */}
      <View style={styles.confidence}>
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <Text style={styles.confidenceValue}>{prediction.confidence}%</Text>
      </View>
    </Card>
  );
}

// 3-day forecast overview
export function ForecastOverview({
  predictions,
  onDayPress,
}: {
  predictions: DayPrediction[];
  onDayPress?: (prediction: DayPrediction) => void;
}) {
  return (
    <View style={styles.forecastContainer}>
      <Text style={styles.forecastTitle}>3-Day Forecast</Text>

      <View style={styles.forecastDays}>
        {predictions.slice(0, 3).map((prediction, index) => {
          const isToday = index === 0;
          const scoreColor = getScoreColor(prediction.productivityScore);
          const dayLabel = isToday
            ? 'Today'
            : index === 1
            ? 'Tomorrow'
            : formatDisplayDate(prediction.date);

          return (
            <Card
              key={prediction.dateKey}
              variant={isToday ? 'elevated' : 'default'}
              onPress={() => onDayPress?.(prediction)}
              padding="sm"
              style={styles.forecastDay}
            >
              <Text style={styles.forecastDayLabel}>{dayLabel}</Text>

              <View style={[styles.forecastScore, { backgroundColor: `${scoreColor}20` }]}>
                <Text style={[styles.forecastScoreText, { color: scoreColor }]}>
                  {prediction.productivityScore}%
                </Text>
              </View>

              <View style={styles.forecastMini}>
                <View style={styles.forecastMiniItem}>
                  <Zap size={10} color={colors.text.tertiary} />
                  <Text style={styles.forecastMiniText}>
                    {prediction.energyForecast}%
                  </Text>
                </View>
              </View>

              {prediction.risks.length > 0 && (
                <AlertTriangle size={12} color={colors.warning.main} style={styles.forecastWarning} />
              )}
            </Card>
          );
        })}
      </View>
    </View>
  );
}

// Burnout risk card
export function BurnoutRiskCard({
  burnout,
  onPress,
}: {
  burnout: BurnoutPrediction;
  onPress?: () => void;
}) {
  const riskColor = getRiskColor(burnout.riskLevel);
  const Icon = burnout.riskLevel >= 60 ? AlertTriangle : CheckCircle2;

  return (
    <Card
      variant="gradient"
      gradient={[`${riskColor}30`, `${riskColor}10`]}
      onPress={onPress}
      padding="md"
      style={styles.burnoutCard}
    >
      <View style={styles.burnoutHeader}>
        <View style={[styles.burnoutIcon, { backgroundColor: `${riskColor}20` }]}>
          <Icon size={24} color={riskColor} />
        </View>

        <View style={styles.burnoutInfo}>
          <Text style={styles.burnoutTitle}>Burnout Risk</Text>
          <Text style={[styles.burnoutLevel, { color: riskColor }]}>
            {burnout.riskLevel >= 80
              ? 'Critical'
              : burnout.riskLevel >= 60
              ? 'High'
              : burnout.riskLevel >= 40
              ? 'Moderate'
              : 'Low'}
          </Text>
        </View>

        <View style={styles.burnoutScore}>
          <Text style={[styles.burnoutScoreText, { color: riskColor }]}>
            {burnout.riskLevel}%
          </Text>
        </View>
      </View>

      <ProgressBar
        progress={burnout.riskLevel}
        height={8}
        color={riskColor}
        style={styles.burnoutProgress}
      />

      {burnout.daysUntilRisk && burnout.riskLevel >= 50 && (
        <Text style={styles.burnoutWarning}>
          ⚠️ Potential burnout in {burnout.daysUntilRisk} day{burnout.daysUntilRisk > 1 ? 's' : ''} if trend continues
        </Text>
      )}

      {/* Factors */}
      <View style={styles.burnoutFactors}>
        {burnout.factors.slice(0, 3).map((factor, index) => (
          <View key={index} style={styles.burnoutFactor}>
            <View style={styles.burnoutFactorHeader}>
              <Text style={styles.burnoutFactorName}>{factor.name}</Text>
              <Text style={styles.burnoutFactorValue}>{factor.contribution}%</Text>
            </View>
            <ProgressBar
              progress={factor.contribution}
              height={4}
              color={colors.text.tertiary}
            />
          </View>
        ))}
      </View>

      {/* Recommendations */}
      {burnout.recommendations.length > 0 && (
        <View style={styles.burnoutRecs}>
          <Text style={styles.burnoutRecsTitle}>Recommendations</Text>
          {burnout.recommendations.slice(0, 2).map((rec, index) => (
            <Text key={index} style={styles.burnoutRec}>
              • {rec}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
}

// Helper functions
function getScoreColor(score: number): string {
  if (score >= 75) return colors.success.main;
  if (score >= 50) return colors.brand.primary;
  if (score >= 25) return colors.warning.main;
  return colors.danger.main;
}

function getRiskColor(risk: number): string {
  if (risk >= 80) return colors.danger.main;
  if (risk >= 60) return colors.warning.main;
  if (risk >= 40) return colors.warning.light;
  return colors.success.main;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  date: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
  },
  scoreText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  metrics: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    width: 90,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  metricBar: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  metricValue: {
    width: 40,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    textAlign: 'right',
  },
  insights: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  insightGroup: {
    gap: 4,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  insightText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  confidence: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  confidenceLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  confidenceValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },

  // Forecast overview
  forecastContainer: {
    marginBottom: spacing.lg,
  },
  forecastTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  forecastDays: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  forecastDay: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  forecastDayLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  forecastScore: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  forecastScoreText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  forecastMini: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  forecastMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  forecastMiniText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  forecastWarning: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },

  // Burnout card
  burnoutCard: {
    marginBottom: spacing.md,
  },
  burnoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  burnoutIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  burnoutInfo: {
    flex: 1,
  },
  burnoutTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  burnoutLevel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  burnoutScore: {},
  burnoutScoreText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  burnoutProgress: {
    marginBottom: spacing.md,
  },
  burnoutWarning: {
    fontSize: typography.sizes.sm,
    color: colors.warning.main,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  burnoutFactors: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  burnoutFactor: {},
  burnoutFactorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  burnoutFactorName: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  burnoutFactorValue: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  burnoutRecs: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  burnoutRecsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  burnoutRec: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 4,
  },
});
