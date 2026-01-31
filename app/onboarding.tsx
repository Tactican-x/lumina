import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useUIStore } from '@/stores';

const pages = [
  {
    title: 'Lumina',
    subtitle: 'Your life, clearly seen. Effortlessly lived.',
    body: 'Track habits, goals, energy — then Lumina finds patterns and gives guidance grounded in data.',
  },
  {
    title: 'Local-first by default',
    subtitle: 'You own your data.',
    body: 'Your insights are generated on-device. You’re always in control.',
  },
  {
    title: 'Actionable intelligence',
    subtitle: 'Not just tracking.',
    body: 'Lumina detects your best hours, identifies high-impact habits, and warns you before burnout.',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);
  const completeOnboarding = useUIStore((s) => s.completeOnboarding);

  const page = useMemo(() => pages[index], [index]);
  const isLast = index === pages.length - 1;

  const onNext = () => setIndex((i) => Math.min(pages.length - 1, i + 1));
  const onBack = () => setIndex((i) => Math.max(0, i - 1));

  const onFinish = () => {
    completeOnboarding();
    router.replace('/(tabs)/home');
  };

  return (
    <View
      style={[
        styles.container,
        {
          // This is the key fix for Android nav buttons overlap:
          paddingBottom: spacing.lg + insets.bottom,
        },
      ]}
    >
      <View style={styles.hero}>
        <Text style={styles.appName}>Lumina</Text>
        <Text style={styles.tagline}>Your life, clearly seen.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{page.title}</Text>
        <Text style={styles.subtitle}>{page.subtitle}</Text>
        <Text style={styles.body}>{page.body}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.actions}>
          <Button title="Back" variant="ghost" onPress={onBack} disabled={index === 0} />
          {isLast ? (
            <Button title="Start" onPress={onFinish} gradient />
          ) : (
            <Button title="Next" onPress={onNext} gradient />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
  },
  hero: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
  },
  appName: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  tagline: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  card: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  body: {
    marginTop: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  footer: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.medium,
  },
  dotActive: {
    backgroundColor: colors.brand.primary,
    width: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});