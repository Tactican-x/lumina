/**
 * ProgressBar Component
 * Linear and circular progress indicators
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'right' | 'top';
  color?: string;
  gradient?: [string, string];
  animated?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  height = 8,
  showLabel = false,
  labelPosition = 'right',
  color = colors.brand.primary,
  gradient,
  animated = true,
  style,
}: ProgressBarProps) {
  const progressValue = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    if (animated) {
      progressValue.value = withTiming(clampedProgress, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progressValue.value = clampedProgress;
    }
  }, [clampedProgress, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const renderLabel = () => {
    if (!showLabel) return null;
    return (
      <Text
        style={[
          styles.label,
          labelPosition === 'inside' && styles.labelInside,
          labelPosition === 'top' && styles.labelTop,
        ]}
      >
        {Math.round(clampedProgress)}%
      </Text>
    );
  };

  return (
    <View style={style}>
      {labelPosition === 'top' && renderLabel()}

      <View style={styles.container}>
        <View style={[styles.track, { height }]}>
          {gradient ? (
            <Animated.View style={[styles.fillContainer, animatedStyle]}>
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.fill, { height }]}
              />
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.fill,
                { height, backgroundColor: color },
                animatedStyle,
              ]}
            />
          )}

          {labelPosition === 'inside' && height >= 16 && renderLabel()}
        </View>

        {labelPosition === 'right' && renderLabel()}
      </View>
    </View>
  );
}

// Circular progress indicator
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  gradient?: [string, string];
  showLabel?: boolean;
  labelSize?: number;
  animated?: boolean;
  children?: React.ReactNode;
}

export function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 8,
  color = colors.brand.primary,
  showLabel = true,
  labelSize = 18,
  animated = true,
  children,
}: CircularProgressProps) {
  const progressValue = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (animated) {
      progressValue.value = withTiming(clampedProgress, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progressValue.value = clampedProgress;
    }
  }, [clampedProgress, animated]);

  const animatedProps = useAnimatedStyle(() => {
    const strokeDashoffset = circumference * (1 - progressValue.value / 100);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[styles.circularContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.background.tertiary}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={animatedProps}
        />
      </Svg>

      <View style={styles.circularContent}>
        {children || (
          showLabel && (
            <Text style={[styles.circularLabel, { fontSize: labelSize }]}>
              {Math.round(clampedProgress)}%
            </Text>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  fillContainer: {
    height: '100%',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadius.full,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    minWidth: 40,
    textAlign: 'right',
  },
  labelInside: {
    position: 'absolute',
    right: spacing.sm,
    top: '50%',
    transform: [{ translateY: -7 }],
    color: '#fff',
    fontSize: typography.sizes.xs,
  },
  labelTop: {
    marginBottom: spacing.xs,
    textAlign: 'left',
  },

  // Circular
  circularContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularLabel: {
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
});
