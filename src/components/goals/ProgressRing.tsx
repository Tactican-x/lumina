/**
 * ProgressRing Component
 * Circular progress indicator for goals
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  gradientColors?: [string, string];
  showPercentage?: boolean;
  showLabel?: boolean;
  label?: string;
  centerContent?: React.ReactNode;
  animated?: boolean;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color = colors.brand.primary,
  gradientColors,
  showPercentage = true,
  showLabel = false,
  label,
  centerContent,
  animated = true,
}: ProgressRingProps) {
  const progressValue = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    if (animated) {
      progressValue.value = withTiming(clampedProgress, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progressValue.value = clampedProgress;
    }
  }, [clampedProgress, animated]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progressValue.value / 100);
    return {
      strokeDashoffset,
    };
  });

  const gradientId = `gradient-${size}`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Gradient definition */}
        {gradientColors && (
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
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
          stroke={colors.background.tertiary}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={gradientColors ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          animatedProps={animatedProps}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {centerContent || (
          <View style={styles.defaultCenter}>
            {showPercentage && (
              <Text style={styles.percentage}>
                {Math.round(clampedProgress)}%
              </Text>
            )}
            {showLabel && label && (
              <Text style={styles.label}>{label}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// Goal-specific progress ring with value display
interface GoalProgressRingProps {
  currentValue: number;
  targetValue: number;
  unit?: string;
  color: string;
  size?: number;
}

export function GoalProgressRing({
  currentValue,
  targetValue,
  unit,
  color,
  size = 140,
}: GoalProgressRingProps) {
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

  return (
    <ProgressRing
      progress={progress}
      size={size}
      strokeWidth={12}
      gradientColors={[color, `${color}99`]}
      showPercentage={false}
      centerContent={
        <View style={styles.goalCenter}>
          <Text style={[styles.goalValue, { color }]}>
            {currentValue}
          </Text>
          <Text style={styles.goalTarget}>
            / {targetValue} {unit}
          </Text>
        </View>
      }
    />
  );
}

// Small inline progress ring
interface MiniProgressRingProps {
  progress: number;
  size?: number;
  color?: string;
}

export function MiniProgressRing({
  progress,
  size = 24,
  color = colors.brand.primary,
}: MiniProgressRingProps) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={colors.background.tertiary}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
      />
    </Svg>
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
  defaultCenter: {
    alignItems: 'center',
  },
  percentage: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  goalCenter: {
    alignItems: 'center',
  },
  goalValue: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
  },
  goalTarget: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
});
