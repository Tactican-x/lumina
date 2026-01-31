/**
 * CircularProgress Component
 * Circular progress indicators (exported from ProgressBar but with more options)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  gradientColors?: [string, string];
  showPercentage?: boolean;
  percentageSize?: number;
  label?: string;
  labelSize?: number;
  animated?: boolean;
  duration?: number;
  children?: React.ReactNode;
}

export function CircularProgress({
  progress,
  size = 100,
  strokeWidth = 10,
  color = colors.brand.primary,
  backgroundColor = colors.background.tertiary,
  gradientColors,
  showPercentage = true,
  percentageSize,
  label,
  labelSize = 12,
  animated = true,
  duration = 1000,
  children,
}: CircularProgressProps) {
  const progressValue = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    if (animated) {
      progressValue.value = withTiming(clampedProgress, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progressValue.value = clampedProgress;
    }
  }, [clampedProgress, animated, duration]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progressValue.value / 100);
    return { strokeDashoffset };
  });

  const defaultPercentageSize = size * 0.25;
  const actualPercentageSize = percentageSize || defaultPercentageSize;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {gradientColors && (
          <Defs>
            <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={gradientColors[0]} />
              <Stop offset="100%" stopColor={gradientColors[1]} />
            </LinearGradient>
          </Defs>
        )}

        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <G rotation="-90" origin={`${center}, ${center}`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={gradientColors ? 'url(#progressGradient)' : color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {children || (
          <>
            {showPercentage && (
              <Text style={[styles.percentage, { fontSize: actualPercentageSize }]}>
                {Math.round(clampedProgress)}%
              </Text>
            )}
            {label && (
              <Text style={[styles.label, { fontSize: labelSize }]}>{label}</Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// Multi-ring progress (for multiple metrics)
interface MultiRingProgressProps {
  rings: {
    progress: number;
    color: string;
    label: string;
  }[];
  size?: number;
  strokeWidth?: number;
}

export function MultiRingProgress({
  rings,
  size = 120,
  strokeWidth = 8,
}: MultiRingProgressProps) {
  const gap = 4;
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {rings.map((ring, index) => {
          const radius = center - strokeWidth / 2 - (strokeWidth + gap) * index;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference * (1 - ring.progress / 100);

          return (
            <G key={index}>
              {/* Background */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colors.background.tertiary}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={ring.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
              />
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.multiRingLegend}>
        {rings.map((ring, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ring.color }]} />
            <Text style={styles.legendText}>{ring.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Semi-circular gauge
interface GaugeProps {
  value: number;
  maxValue?: number;
  size?: number;
  color?: string;
  label?: string;
  unit?: string;
}

export function Gauge({
  value,
  maxValue = 100,
  size = 120,
  color = colors.brand.primary,
  label,
  unit,
}: GaugeProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Semi-circle
  const progress = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <View style={[styles.gaugeContainer, { width: size, height: size / 2 + 20 }]}>
      <Svg width={size} height={size / 2 + strokeWidth}>
        {/* Background arc */}
        <Circle
          cx={center}
          cy={size / 2}
          r={radius}
          stroke={colors.background.tertiary}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          transform={`rotate(180 ${center} ${size / 2})`}
        />

        {/* Progress arc */}
        <Circle
          cx={center}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(180 ${center} ${size / 2})`}
        />
      </Svg>

      {/* Value display */}
      <View style={styles.gaugeValue}>
        <Text style={[styles.gaugeValueText, { color }]}>
          {value}
          {unit && <Text style={styles.gaugeUnit}>{unit}</Text>}
        </Text>
        {label && <Text style={styles.gaugeLabel}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  label: {
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Multi-ring
  multiRingLegend: {
    position: 'absolute',
    bottom: -30,
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },

  // Gauge
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  gaugeValue: {
    alignItems: 'center',
    marginTop: -20,
  },
  gaugeValueText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  gaugeUnit: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
  },
  gaugeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
