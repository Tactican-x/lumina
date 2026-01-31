/**
 * Badge Component
 * Status indicators, tags, and labels
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  gradient?: boolean;
  outline?: boolean;
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; gradient: [string, string] }> = {
  default: {
    bg: colors.background.elevated,
    text: colors.text.secondary,
    gradient: [colors.background.elevated, colors.background.tertiary],
  },
  success: {
    bg: `${colors.success.main}20`,
    text: colors.success.main,
    gradient: colors.gradients.success as [string, string],
  },
  warning: {
    bg: `${colors.warning.main}20`,
    text: colors.warning.main,
    gradient: colors.gradients.warning as [string, string],
  },
  danger: {
    bg: `${colors.danger.main}20`,
    text: colors.danger.main,
    gradient: colors.gradients.danger as [string, string],
  },
  info: {
    bg: `${colors.info.main}20`,
    text: colors.info.main,
    gradient: colors.gradients.primary as [string, string],
  },
  purple: {
    bg: `${colors.purple.main}20`,
    text: colors.purple.main,
    gradient: colors.gradients.purple as [string, string],
  },
};

export function Badge({
  label,
  variant = 'default',
  size = 'md',
  icon,
  gradient = false,
  outline = false,
  style,
}: BadgeProps) {
  const variantStyle = variantColors[variant];

  const containerStyle = [
    styles.base,
    styles[`size_${size}`],
    outline
      ? { borderWidth: 1, borderColor: variantStyle.text, backgroundColor: 'transparent' }
      : { backgroundColor: variantStyle.bg },
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${size}`],
    { color: gradient ? '#fff' : variantStyle.text },
  ];

  const content = (
    <>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={textStyle}>{label}</Text>
    </>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={variantStyle.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.base, styles[`size_${size}`], style]}
      >
        {content}
      </LinearGradient>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

// Dot indicator (for notifications, status)
export function StatusDot({
  variant = 'success',
  size = 'md',
  pulse = false,
}: {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}) {
  const dotSizes = { sm: 6, md: 8, lg: 10 };
  const variantStyle = variantColors[variant];

  return (
    <View
      style={[
        styles.dot,
        {
          width: dotSizes[size],
          height: dotSizes[size],
          backgroundColor: variantStyle.text,
        },
      ]}
    />
  );
}

// Counter badge (for notification counts)
export function CountBadge({
  count,
  max = 99,
  variant = 'danger',
}: {
  count: number;
  max?: number;
  variant?: BadgeVariant;
}) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();
  const variantStyle = variantColors[variant];

  return (
    <View style={[styles.countBadge, { backgroundColor: variantStyle.text }]}>
      <Text style={styles.countText}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },

  // Sizes
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  size_md: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 4,
    gap: 6,
  },
  size_lg: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    gap: 8,
  },

  // Text
  text: {
    fontWeight: typography.weights.semibold,
  },
  text_sm: {
    fontSize: 10,
  },
  text_md: {
    fontSize: 12,
  },
  text_lg: {
    fontSize: 14,
  },

  icon: {
    marginRight: 2,
  },

  // Status dot
  dot: {
    borderRadius: 100,
  },

  // Count badge
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
});
