/**
 * TrendLine Component
 * Simple line chart for trends
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TrendingUp, TrendingDown, Minus } from '@/components/ui/Lucide';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface TrendLineProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  showArea?: boolean;
  showDots?: boolean;
  showTrend?: boolean;
  animated?: boolean;
}

export function TrendLine({
  data,
  labels,
  height = 100,
  color = colors.brand.primary,
  showArea = true,
  showDots = false,
  showTrend = true,
}: TrendLineProps) {
  if (data.length === 0) return null;

  const width = Dimensions.get('window').width - spacing.md * 4;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const max = Math.max(...data) * 1.1 || 100;
  const min = Math.min(...data) * 0.9 || 0;
  const range = max - min || 1;

  const xScale = (index: number) =>
    padding.left + (index / (data.length - 1)) * graphWidth;
  const yScale = (value: number) =>
    padding.top + graphHeight - ((value - min) / range) * graphHeight;

  // Generate path
  const linePath = data
    .map((value, index) => {
      const x = xScale(index);
      const y = yScale(value);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Generate area path
  const areaPath = `${linePath} L ${xScale(data.length - 1)} ${padding.top + graphHeight} L ${xScale(0)} ${padding.top + graphHeight} Z`;

  // Calculate trend
  const firstHalf = data.slice(0, Math.ceil(data.length / 2));
  const secondHalf = data.slice(Math.ceil(data.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trendPercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  const trendDirection = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';
  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;
  const trendColor = trendDirection === 'up' ? colors.success.main : trendDirection === 'down' ? colors.danger.main : colors.text.tertiary;

  return (
    <View style={styles.container}>
      {showTrend && (
        <View style={styles.trendBadge}>
          <TrendIcon size={14} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trendPercent > 0 ? '+' : ''}
            {trendPercent.toFixed(1)}%
          </Text>
        </View>
      )}

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {/* Area fill */}
        {showArea && <Path d={areaPath} fill="url(#areaGradient)" />}

        {/* Line */}
        <Path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots &&
          data.map((value, index) => (
            <Circle
              key={index}
              cx={xScale(index)}
              cy={yScale(value)}
              r={4}
              fill={color}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
      </Svg>

      {/* Labels */}
      {labels && labels.length > 0 && (
        <View style={styles.labels}>
          {labels.map((label, index) => (
            <Text key={index} style={styles.label}>
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// Mini trend indicator
export function TrendIndicator({
  current,
  previous,
  label,
  size = 'md',
}: {
  current: number;
  previous: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const direction = change > 2 ? 'up' : change < -2 ? 'down' : 'stable';
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const trendColor = direction === 'up' ? colors.success.main : direction === 'down' ? colors.danger.main : colors.text.tertiary;

  const sizes = {
    sm: { icon: 12, value: 12, label: 10 },
    md: { icon: 16, value: 14, label: 12 },
    lg: { icon: 20, value: 18, label: 14 },
  };

  const s = sizes[size];

  return (
    <View style={styles.indicatorContainer}>
      <View style={[styles.indicatorBadge, { backgroundColor: `${trendColor}20` }]}>
        <Icon size={s.icon} color={trendColor} />
        <Text style={[styles.indicatorValue, { fontSize: s.value, color: trendColor }]}>
          {change > 0 ? '+' : ''}
          {change.toFixed(1)}%
        </Text>
      </View>
      {label && (
        <Text style={[styles.indicatorLabel, { fontSize: s.label }]}>{label}</Text>
      )}
    </View>
  );
}

// Comparison bar
export function ComparisonBar({
  value1,
  value2,
  label1,
  label2,
  maxValue,
  color1 = colors.brand.primary,
  color2 = colors.success.main,
}: {
  value1: number;
  value2: number;
  label1: string;
  label2: string;
  maxValue?: number;
  color1?: string;
  color2?: string;
}) {
  const max = maxValue || Math.max(value1, value2) * 1.1;
  const width1 = (value1 / max) * 100;
  const width2 = (value2 / max) * 100;

  return (
    <View style={styles.comparisonContainer}>
      <View style={styles.comparisonRow}>
        <Text style={styles.comparisonLabel}>{label1}</Text>
        <View style={styles.comparisonBarContainer}>
          <View style={[styles.comparisonBar, { width: `${width1}%`, backgroundColor: color1 }]} />
        </View>
        <Text style={styles.comparisonValue}>{value1}</Text>
      </View>

      <View style={styles.comparisonRow}>
        <Text style={styles.comparisonLabel}>{label2}</Text>
        <View style={styles.comparisonBarContainer}>
          <View style={[styles.comparisonBar, { width: `${width2}%`, backgroundColor: color2 }]} />
        </View>
        <Text style={styles.comparisonValue}>{value2}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  trendBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background.tertiary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    zIndex: 1,
  },
  trendText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },

  // Indicator
  indicatorContainer: {
    alignItems: 'center',
  },
  indicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
  },
  indicatorValue: {
    fontWeight: typography.weights.semibold,
  },
  indicatorLabel: {
    color: colors.text.tertiary,
    marginTop: 4,
  },

  // Comparison
  comparisonContainer: {
    gap: spacing.sm,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonLabel: {
    width: 80,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  comparisonBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  comparisonBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  comparisonValue: {
    width: 40,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    textAlign: 'right',
  },
});
