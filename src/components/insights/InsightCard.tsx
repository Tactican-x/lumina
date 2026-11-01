/**
 * InsightCard Component
 * Displays AI-generated insights with expandable details + swipe-to-dismiss
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable, RectButton } from 'react-native-gesture-handler';

import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  GitBranch,
  Zap,
  Trophy,
  ExternalLink,
  X,
  Clock,
} from '@/components/ui/Lucide';

import { Insight, InsightType } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { formatPercentage, formatCorrelation, formatPValue } from '@/utils/format';
import { formatInsightDate, formatInsightDateShort } from '@/utils/date';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
  onAction?: () => void;
  onDismiss?: () => void;

  // Feedback
  onHelpful?: () => void;
  onNotHelpful?: () => void;
  feedbackValue?: 1 | -1 | 0;

  expanded?: boolean;
  showDismiss?: boolean;
  showDate?: boolean; // Controls date visibility (default: true)
}

const insightConfig: Record<
  InsightType,
  {
    icon: typeof TrendingUp;
    gradient: [string, string];
    label: string;
  }
> = {
  correlation: { icon: GitBranch, gradient: ['#3b82f6', '#2563eb'], label: 'Pattern Discovery' },
  pattern: { icon: TrendingUp, gradient: ['#10b981', '#059669'], label: 'Behavioral Pattern' },
  prediction: { icon: Sparkles, gradient: ['#a855f7', '#9333ea'], label: 'Prediction' },
  warning: { icon: AlertTriangle, gradient: ['#f59e0b', '#d97706'], label: 'Warning' },
  optimization: { icon: Zap, gradient: ['#06b6d4', '#0891b2'], label: 'Optimization' },
  achievement: { icon: Trophy, gradient: ['#eab308', '#ca8a04'], label: 'Achievement' },
};

export function InsightCard({
  insight,
  onPress,
  onAction,
  onDismiss,

  onHelpful,
  onNotHelpful,
  feedbackValue = 0,

  expanded: controlledExpanded,
  showDismiss = true,
  showDate = true,
}: InsightCardProps) {
  const isControlled = controlledExpanded != null;
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(controlledExpanded ?? false);
  const isExpanded = (controlledExpanded ?? uncontrolledExpanded) as boolean;

  const swipeRef = useRef<Swipeable>(null);

  const config = insightConfig[insight.type];
  const Icon = config.icon;

  const correlationValue = insight.correlationValue;
  const pValue = insight.pValue;
  const confidence = insight.confidence;

  // Format the date for display
  const dateLabel = insight.createdAt ? formatInsightDate(insight.createdAt) : '';

  const toggleExpand = () => {
    if (isControlled) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUncontrolledExpanded((v) => !v);
  };

  const handlePress = () => {
    if (onPress) onPress();
    else toggleExpand();
  };

  const handleDismiss = () => {
    swipeRef.current?.close();
    onDismiss?.();
  };

  const renderRightActions = () => {
    if (!showDismiss || !onDismiss) return null;

    return (
      <View style={styles.rightActions}>
        <RectButton style={styles.dismissAction} onPress={handleDismiss}>
          <X size={18} color="#fff" />
          <Text style={styles.dismissText}>Dismiss</Text>
        </RectButton>
      </View>
    );
  };

  const showFeedback = Boolean(onHelpful || onNotHelpful);

  const cardContent = (
    <Card variant="default" padding="none" style={styles.card}>
      {/* Header with gradient */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Icon size={20} color="#fff" />
            </View>

            <View style={styles.headerText}>
              {/* Label row: type label + date */}
              <View style={styles.labelRow}>
                <Text style={styles.label}>{config.label}</Text>
                {showDate && dateLabel !== '' && (
                  <View style={styles.dateBadge}>
                    <Clock size={9} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.dateText}>{dateLabel}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {insight.title}
              </Text>
            </View>

            {/* Right side controls */}
            <View style={styles.headerRight}>
              {typeof confidence === 'number' && (
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>{Math.round(confidence)}%</Text>
                </View>
              )}

              {isExpanded ? (
                <ChevronUp size={20} color="#fff" />
              ) : (
                <ChevronDown size={20} color="#fff" />
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.summary}>{insight.summary}</Text>

        {/* Metrics row */}
        {(correlationValue != null || pValue != null || typeof confidence === 'number') && (
          <View style={styles.metricsRow}>
            {correlationValue != null && (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Correlation</Text>
                <Text style={[styles.metricValue, { color: config.gradient[0] }]}>
                  {formatCorrelation(correlationValue)}
                </Text>
              </View>
            )}

            {pValue != null && (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Significance</Text>
                <Text style={styles.metricValue}>{formatPValue(pValue)}</Text>
              </View>
            )}

            {typeof confidence === 'number' && (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Confidence</Text>
                <Text style={styles.metricValue}>{formatPercentage(confidence)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Feedback row */}
        {showFeedback && (
          <View style={styles.feedbackRow}>
            <TouchableOpacity
              onPress={onHelpful}
              activeOpacity={0.8}
              style={[
                styles.feedbackChip,
                feedbackValue === 1 && styles.feedbackChipHelpfulActive,
              ]}
            >
              <Text
                style={[styles.feedbackText, feedbackValue === 1 && styles.feedbackTextActive]}
              >
                Helpful
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onNotHelpful}
              activeOpacity={0.8}
              style={[
                styles.feedbackChip,
                feedbackValue === -1 && styles.feedbackChipNotHelpfulActive,
              ]}
            >
              <Text
                style={[styles.feedbackText, feedbackValue === -1 && styles.feedbackTextActive]}
              >
                Not helpful
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Analysis</Text>
              <Text style={styles.sectionText}>{insight.detailedAnalysis}</Text>
            </View>

            {insight.scientificExplanation && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>The Science</Text>
                <Text style={styles.sectionText}>{insight.scientificExplanation}</Text>
              </View>
            )}

            {/* Generated date in expanded view (full timestamp) */}
            {showDate && dateLabel !== '' && (
              <View style={styles.expandedDateRow}>
                <Clock size={12} color={colors.text.tertiary} />
                <Text style={styles.expandedDateText}>
                  Generated {dateLabel}
                </Text>
              </View>
            )}

            {insight.actionLabel && onAction && (
              <Button
                title={insight.actionLabel}
                onPress={onAction}
                variant="primary"
                size="md"
                icon={<ExternalLink size={16} color="#fff" />}
                iconPosition="right"
                style={styles.actionButton}
              />
            )}
          </View>
        )}
      </View>

      {/* Unread indicator */}
      {!insight.isRead && (
        <>
          <View style={[styles.unreadDot, { backgroundColor: config.gradient[0] }]} />
          <View style={[styles.newBadge, { backgroundColor: config.gradient[0] }]}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        </>
      )}
    </Card>
  );

  if (showDismiss && onDismiss) {
    return (
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        rightThreshold={40}
      >
        {cardContent}
      </Swipeable>
    );
  }

  return cardContent;
}

// ==========================================
// COMPACT CARD
// ==========================================

export function InsightCardCompact({
  insight,
  onPress,
  showDate = true,
}: {
  insight: Insight;
  onPress?: () => void;
  showDate?: boolean;
}) {
  const config = insightConfig[insight.type];
  const Icon = config.icon;
  const confidence = insight.confidence;

  // Use short format for compact cards
  const shortDate = insight.createdAt ? formatInsightDateShort(insight.createdAt) : '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.compactContainer}>
      <LinearGradient colors={config.gradient} style={styles.compactIcon}>
        <Icon size={14} color="#fff" />
      </LinearGradient>

      <View style={styles.compactContent}>
        <View style={styles.compactTitleRow}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {insight.title}
          </Text>

          {showDate && shortDate !== '' && (
            <Text style={styles.compactDate}>{shortDate}</Text>
          )}
        </View>

        <Text style={styles.compactSummary} numberOfLines={1}>
          {insight.summary}
        </Text>
      </View>

      {typeof confidence === 'number' && (
        <Text style={[styles.compactConfidence, { color: config.gradient[0] }]}>
          {Math.round(confidence)}%
        </Text>
      )}

      {!insight.isRead && (
        <View style={[styles.compactDot, { backgroundColor: config.gradient[0] }]} />
      )}
    </TouchableOpacity>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  // Swipe dismiss
  rightActions: {
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: spacing.md,
  },
  dismissAction: {
    backgroundColor: colors.danger.main,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    width: 92,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  dismissText: {
    color: '#fff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },

  // Card
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },

  // Header
  header: {
    padding: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: borderRadius.full,
  },
  dateText: {
    fontSize: 9,
    fontWeight: typography.weights.medium,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
  },
  confidenceText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },

  // Body
  body: {
    padding: spacing.md,
  },
  summary: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    gap: spacing.lg,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Feedback
  feedbackRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  feedbackChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  feedbackChipHelpfulActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  feedbackChipNotHelpfulActive: {
    backgroundColor: colors.danger.main,
    borderColor: colors.danger.main,
  },
  feedbackText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  feedbackTextActive: {
    color: '#fff',
  },

  // Expanded content
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  expandedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.dark,
  },
  expandedDateText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  actionButton: {
    marginTop: spacing.sm,
  },

  // Unread dot
  unreadDot: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  newBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.4,
  },

  // Compact card
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  compactIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  compactContent: {
    flex: 1,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  compactTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    flex: 1,
  },
  compactDate: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: typography.weights.regular,
  },
  compactSummary: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  compactConfidence: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: spacing.xs,
  },
});


