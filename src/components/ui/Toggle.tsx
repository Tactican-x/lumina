/**
 * Toggle/Switch Component
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { useUIStore } from '@/stores';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Toggle({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  size = 'md',
  style,
}: ToggleProps) {
  const enableHaptics = useUIStore(state => state.enableHaptics);
  const progress = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      damping: 20,
      stiffness: 300,
    });
  }, [value]);

  const handlePress = () => {
    if (disabled) return;

    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onValueChange(!value);
  };

  const sizes = {
    sm: { width: 44, height: 24, thumbSize: 18, thumbOffset: 3 },
    md: { width: 52, height: 28, thumbSize: 22, thumbOffset: 3 },
  };

  const s = sizes[size];

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.background.elevated, colors.brand.primary]
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: progress.value * (s.width - s.thumbSize - s.thumbOffset * 2),
      },
    ],
  }));

  const toggle = (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.track,
          { width: s.width, height: s.height },
          disabled && styles.disabled,
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: s.thumbSize,
              height: s.thumbSize,
              left: s.thumbOffset,
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );

  if (label || description) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.labelContainer}>
          {label && (
            <Text style={[styles.label, disabled && styles.labelDisabled]}>
              {label}
            </Text>
          )}
          {description && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
        {toggle}
      </View>
    );
  }

  return toggle;
}

// Checkbox variant
interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  style,
}: CheckboxProps) {
  const enableHaptics = useUIStore(state => state.enableHaptics);
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (disabled) return;

    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    scale.value = withSpring(0.9, { damping: 20 }, () => {
      scale.value = withSpring(1);
    });

    onCheckedChange(!checked);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.checkboxContainer, style]}
    >
      <Animated.View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          disabled && styles.disabled,
          animatedStyle,
        ]}
      >
        {checked && (
          <View style={styles.checkmark}>
            <View style={styles.checkmarkShort} />
            <View style={styles.checkmarkLong} />
          </View>
        )}
      </Animated.View>

      {label && (
        <Text style={[styles.checkboxLabel, disabled && styles.labelDisabled]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Toggle
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  labelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  labelDisabled: {
    color: colors.text.tertiary,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  track: {
    borderRadius: borderRadius.full,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },

  // Checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  checkmark: {
    width: 12,
    height: 12,
    position: 'relative',
  },
  checkmarkShort: {
    position: 'absolute',
    width: 2,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
    left: 2,
    top: 4,
  },
  checkmarkLong: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
    left: 6,
    top: 1,
  },
  checkboxLabel: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
});
