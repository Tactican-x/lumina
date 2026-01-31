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
} from '@/components/ui/Lucide';

import { Insight, InsightType } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { formatPercentage, formatCorrelation, formatPValue } from '@/utils/format';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
  onAction?: () => void;
  onDismiss?: () => void; // When provided, swipe-to-dismiss is enabled
  expanded?: boolean;
  showDismiss?: boolean; // Enables swipe action
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
  expanded: controlledExpanded,
  showDismiss = true,
}: InsightCardProps) {
  // Support controlled/uncontrolled expansion safely
  const isControlled = controlledExpanded != null;
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(controlledExpanded ?? false);
  const isExpanded = (controlledExpanded ?? uncontrolledExpanded) as boolean;

  const swipeRef = useRef<Swipeable>(null);

  const config = insightConfig[insight.type];
  const Icon = config.icon;

  // Pull optional fields into locals (makes JSX narrowing clean)
  const correlationValue = insight.correlationValue;
  const pValue = insight.pValue;
  const confidence = insight.confidence;

  const toggleExpand = () => {
    if (isControlled) return; // parent controls expanded state
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
              <Text style={styles.label}>{config.label}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {insight.title}
              </Text>
            </View>

            {/* Right side controls (confidence + chevron) */}
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

            {/* IMPORTANT: only render if onAction exists (Button requires onPress) */}
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
        <View style={[styles.unreadDot, { backgroundColor: config.gradient[0] }]} />
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

// Compact insight card for previews (no swipe)
export function InsightCardCompact({
  insight,
  onPress,
}: {
  insight: Insight;
  onPress?: () => void;
}) {
  const config = insightConfig[insight.type];
  const Icon = config.icon;

  const confidence = insight.confidence;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.compactContainer}>
      <LinearGradient colors={config.gradient} style={styles.compactIcon}>
        <Icon size={14} color="#fff" />
      </LinearGradient>

      <View style={styles.compactContent}>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {insight.title}
        </Text>
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

const styles = StyleSheet.create({
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

  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
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
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
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
  actionButton: {
    marginTop: spacing.sm,
  },

  unreadDot: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

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
  compactTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
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