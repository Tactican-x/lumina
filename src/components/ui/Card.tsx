/**
 * Card Component
 * Reusable card with variants and press handling
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, shadows } from '@/constants/theme';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'gradient';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  gradient?: [string, string];
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'default',
  onPress,
  disabled = false,
  padding = 'md',
  gradient,
  style,
}: CardProps) {
  const containerStyle = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`padding_${padding}`],
    variant === 'elevated' && shadows.md,
    style,
  ];

  if (variant === 'gradient' && gradient) {
    const content = (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, styles[`padding_${padding}`], styles.gradientInner]}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.8}
          style={[styles.gradientOuter, style]}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return <View style={[styles.gradientOuter, style]}>{content}</View>;
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

// Sub-components
Card.Header = function CardHeader({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.header, style]}>{children}</View>;
};

Card.Body = function CardBody({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.body, style]}>{children}</View>;
};

Card.Footer = function CardFooter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.footer, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  gradientOuter: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  gradientInner: {
    borderRadius: 0,
  },

  // Variants
  variant_default: {
    backgroundColor: colors.background.tertiary,
  },
  variant_elevated: {
    backgroundColor: colors.background.secondary,
  },
  variant_outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  variant_gradient: {
    backgroundColor: 'transparent',
  },

  // Padding
  padding_none: { padding: 0 },
  padding_sm: { padding: spacing.sm },
  padding_md: { padding: spacing.md },
  padding_lg: { padding: spacing.lg },

  // Sub-components
  header: { marginBottom: spacing.sm },
  body: { flex: 1 },
  footer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});