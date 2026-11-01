// src/components/home/AutopilotCard.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChevronRight, AlertTriangle } from '@/components/ui/Lucide';
import { ActionSheet, type ActionSheetOption } from '@/components/ui/ActionSheet';

import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAutopilotPlan } from '@/hooks/useAutopilotPlan';
import type { AutopilotBlockId } from '@/lib/coaching/autopilotPlan';

function hourLabel(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function AutopilotCard() {
  const {
    plan,
    nudges,
    overrides,
    isLoading,
    error,
    refresh,
    completePlannedItem,
    dismissNudge,

    skipToday,
    snoozeMinutes,
    moveToBlock,
    makeMinimum,
    clearOverride,

    startSmallTask,
  } = useAutopilotPlan();

  const [sheetOpen, setSheetOpen] = useState(false);

  const nextUp = plan?.nextUp ?? null;
  const nextUpOverride = nextUp ? overrides?.[nextUp.key] : undefined;

  const resetAvailable =
    !!nextUpOverride &&
    !!(
      nextUpOverride.skipped ||
      nextUpOverride.snoozedUntil ||
      nextUpOverride.pinnedBlockId ||
      nextUpOverride.forceMinimum
    );

  const openFocus = (itemKey: string) => {
    router.push({ pathname: '/(modals)/focus', params: { key: itemKey } } as any);
  };

  const options: ActionSheetOption[] = useMemo(() => {
    if (!nextUp) return [];

    const item = nextUp;

    const move = (blockId: AutopilotBlockId) => async () => {
      setSheetOpen(false);
      await moveToBlock(item, blockId);
    };

    const list: ActionSheetOption[] = [];

    // Focus Mode first (premium / world-class feel)
    list.push({
      key: 'focus',
      label: 'Start focus session',
      onPress: async () => {
        setSheetOpen(false);
        openFocus(item.key);
      },
    });

    if (item.kind === 'task' && item.starterSuggestion) {
      list.push({
        key: 'start-small',
        label: item.starterSuggestion.title,
        onPress: async () => {
          setSheetOpen(false);
          await startSmallTask(item);
        },
      });
    }

    list.push(
      {
        key: 'snooze-15',
        label: 'Snooze 15 minutes',
        onPress: async () => {
          setSheetOpen(false);
          await snoozeMinutes(item, 15);
        },
      },
      {
        key: 'snooze-60',
        label: 'Snooze 1 hour',
        onPress: async () => {
          setSheetOpen(false);
          await snoozeMinutes(item, 60);
        },
      },
      { key: 'move-morning', label: 'Move to Morning', onPress: move('morning') },
      { key: 'move-afternoon', label: 'Move to Afternoon', onPress: move('afternoon') },
      { key: 'move-evening', label: 'Move to Evening', onPress: move('evening') }
    );

    if (item.kind === 'habit') {
      list.push({
        key: 'minimum',
        label: 'Use minimum version',
        onPress: async () => {
          setSheetOpen(false);
          await makeMinimum(item);
        },
      });
    }

    list.push({
      key: 'skip',
      label: 'Skip today',
      onPress: async () => {
        setSheetOpen(false);
        await skipToday(item);
      },
    });

    if (resetAvailable) {
      list.push({
        key: 'reset',
        label: 'Reset overrides',
        onPress: async () => {
          setSheetOpen(false);
          await clearOverride(item);
        },
      });
    }

    return list;
  }, [
    nextUp,
    moveToBlock,
    snoozeMinutes,
    makeMinimum,
    skipToday,
    clearOverride,
    startSmallTask,
    resetAvailable,
  ]);

  return (
    <Card variant="default" padding="md">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Autopilot Coach</Text>

        <TouchableOpacity
          onPress={() => router.push('/(modals)/autopilot-plan')}
          style={styles.link}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Full plan</Text>
          <ChevronRight size={16} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.muted}>Building today’s plan…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn’t build Autopilot Plan</Text>
          <Text style={styles.muted}>{error}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <Button title="Retry" onPress={refresh} />
          </View>
        </View>
      ) : !plan || !nextUp ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing queued yet</Text>
          <Text style={styles.muted}>Add a habit or task, then open Autopilot Plan.</Text>

          <View style={styles.actionsRow}>
            <Button title="Add habit" variant="ghost" onPress={() => router.push('/(modals)/add-habit')} />
            <Button title="Add task" variant="ghost" onPress={() => router.push('/(modals)/add-task')} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.nextUp}>
            <Text style={styles.nextUpLabel}>Next up</Text>

            <Text style={styles.nextUpTitle} numberOfLines={2}>
              {nextUp.title}
            </Text>

            <Text style={styles.metaText}>
              {hourLabel(nextUp.scheduledHour)} • ~{nextUp.minutes}m • {nextUp.energyRequired} energy
              {nextUp.kind === 'task' && nextUp.priority ? ` • ${nextUp.priority}` : ''}
            </Text>

            {nextUp.why?.length ? (
              <View style={styles.whyBox}>
                {nextUp.why.slice(0, 2).map((w, idx) => (
                  <Text key={idx} style={styles.whyText}>
                    • {w}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              <Button title={nextUp.kind === 'task' ? 'Complete task' : 'Done'} onPress={() => completePlannedItem(nextUp)} />
              <Button title="Start focus" variant="ghost" onPress={() => openFocus(nextUp.key)} />
              <Button title="Options" variant="ghost" onPress={() => setSheetOpen(true)} />
            </View>
          </View>

          {plan.overdueRescue.length > 0 && (
            <View style={styles.rescueHint}>
              <AlertTriangle size={16} color={colors.warning.light} />
              <Text style={styles.rescueText}>
                Overdue Rescue: {plan.overdueRescue.length} task{plan.overdueRescue.length === 1 ? '' : 's'} surfaced
                (max 3).
              </Text>
            </View>
          )}

          {nudges.length > 0 && (
            <View style={styles.nudges}>
              <Text style={styles.nudgesTitle}>Coach nudges</Text>

              {nudges.slice(0, 3).map((n) => (
                <View key={n.id} style={styles.nudgeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nudgeTitle}>{n.title}</Text>
                    <Text style={styles.nudgeMessage}>{n.message}</Text>
                  </View>

                  <TouchableOpacity onPress={() => dismissNudge(n.id)} style={styles.dismissBtn} activeOpacity={0.7}>
                    <Text style={styles.dismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <ActionSheet
            visible={sheetOpen}
            title="Next Up options"
            subtitle={nextUp.title}
            onClose={() => setSheetOpen(false)}
            options={options}
          />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text.primary },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { color: colors.brand.primary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },

  loading: { paddingVertical: spacing.sm, gap: 8, alignItems: 'center' },
  muted: { color: colors.text.tertiary, fontSize: typography.sizes.sm, lineHeight: 18 },

  errorBox: { gap: 8 },
  errorTitle: { color: colors.text.primary, fontWeight: typography.weights.semibold },

  empty: { gap: spacing.sm },
  emptyTitle: { color: colors.text.primary, fontWeight: typography.weights.semibold },

  nextUp: { gap: 8 },
  nextUpLabel: { color: colors.text.tertiary, fontSize: typography.sizes.sm },
  nextUpTitle: {
    color: colors.text.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    lineHeight: 26,
  },
  metaText: { color: colors.text.secondary, fontSize: typography.sizes.sm },

  whyBox: { backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg, padding: spacing.sm, gap: 2 },
  whyText: { color: colors.text.secondary, fontSize: typography.sizes.sm, lineHeight: 18 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.xs },

  rescueHint: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: `${colors.warning.main}15`,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  rescueText: { color: colors.text.secondary, fontSize: typography.sizes.sm, flex: 1 },

  nudges: { marginTop: spacing.md, gap: spacing.xs },
  nudgesTitle: { color: colors.text.primary, fontWeight: typography.weights.semibold },

  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background.tertiary,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  nudgeTitle: { color: colors.text.primary, fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm },
  nudgeMessage: { color: colors.text.secondary, fontSize: typography.sizes.sm, marginTop: 2 },
  dismissBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  dismissText: { color: colors.text.tertiary, fontSize: typography.sizes.sm },
});