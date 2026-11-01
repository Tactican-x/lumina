// app/(tabs)/tasks.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Plus, AlertTriangle } from '@/components/ui/Lucide';

import { useTasks } from '@/hooks/useTasks';
import type { Task } from '@/types';
import { formatRelativeTime } from '@/utils/date';

function coerceDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

function pillColorForPriority(priority: Task['priority']) {
  switch (priority) {
    case 'urgent':
      return { bg: `${colors.error.main}20`, fg: colors.error.light };
    case 'high':
      return { bg: `${colors.warning.main}20`, fg: colors.warning.light };
    case 'medium':
      return { bg: `${colors.brand.primary}20`, fg: colors.brand.primary };
    case 'low':
    default:
      return { bg: `${colors.text.tertiary}20`, fg: colors.text.tertiary };
  }
}

function pillColorForEnergy(energy: Task['energyRequired']) {
  switch (energy) {
    case 'high':
      return { bg: `${colors.purple.main}20`, fg: colors.purple.light };
    case 'medium':
      return { bg: `${colors.brand.primary}20`, fg: colors.brand.primary };
    case 'low':
    default:
      return { bg: `${colors.success.main}20`, fg: colors.success.light };
  }
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function TaskRow({
  task,
  onComplete,
  onDelete,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const due = coerceDate(task.dueDate);
  const scheduled = coerceDate(task.scheduledFor);

  const pr = pillColorForPriority(task.priority);
  const en = pillColorForEnergy(task.energyRequired);

  return (
    <View style={styles.taskRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {task.title}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: pr.bg }]}>
            <Text style={[styles.pillText, { color: pr.fg }]}>{task.priority}</Text>
          </View>

          <View style={[styles.pill, { backgroundColor: en.bg }]}>
            <Text style={[styles.pillText, { color: en.fg }]}>{task.energyRequired} energy</Text>
          </View>

          {typeof task.estimatedMinutes === 'number' ? (
            <Text style={styles.metaText}>~{task.estimatedMinutes}m</Text>
          ) : null}

          {scheduled ? (
            <Text style={styles.metaText}>scheduled {formatRelativeTime(scheduled)}</Text>
          ) : null}

          {due ? <Text style={styles.metaText}>due {formatRelativeTime(due)}</Text> : null}
        </View>

        {task.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.rowActions}>
        <TouchableOpacity onPress={onComplete} style={styles.iconBtn} accessibilityLabel="Complete task">
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.success.light} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Alert.alert('Delete task?', task.title, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: onDelete },
            ]);
          }}
          style={styles.iconBtn}
          accessibilityLabel="Delete task"
        >
          <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets();

  const { tasks, todayTasks, todayCompletedTasks, isLoading, error, refresh, complete, remove, getOverdue } =
    useTasks();

  const [overdue, setOverdue] = useState<Task[]>([]);

  const loadOverdue = useCallback(async () => {
    try {
      const o = await getOverdue();
      setOverdue(o);
    } catch {
      setOverdue([]);
    }
  }, [getOverdue]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
      loadOverdue().catch(() => {});
    }, [refresh, loadOverdue])
  );

  const pendingAll = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress'),
    [tasks]
  );

  const summary = useMemo(() => {
    return {
      overdue: overdue.length,
      todayPending: todayTasks.length,
      todayDone: todayCompletedTasks.length,
      pendingAll: pendingAll.length,
    };
  }, [overdue.length, todayTasks.length, todayCompletedTasks.length, pendingAll.length]);

  const onRefresh = useCallback(async () => {
    await refresh();
    await loadOverdue();
  }, [refresh, loadOverdue]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.md,
            // keep space for the tab bar + safe area bottom
            paddingBottom: insets.bottom + 110,
          },
        ]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Tasks</Text>

          <TouchableOpacity onPress={() => router.push('/(modals)/add-task')} style={styles.addBtn}>
            <Plus size={18} color={colors.text.primary} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Card variant="default" padding="md">
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{summary.overdue}</Text>
              <Text style={styles.summaryLabel}>Overdue</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{summary.todayPending}</Text>
              <Text style={styles.summaryLabel}>Today</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{summary.pendingAll}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>

          {error ? <Text style={[styles.muted, { marginTop: spacing.sm }]}>{error}</Text> : null}
        </Card>

        {overdue.length > 0 && (
          <Section title="Overdue" subtitle="Clear these first (Autopilot will only surface 1–3 at a time).">
            <Card variant="default" padding="md">
              <View style={styles.notice}>
                <AlertTriangle size={16} color={colors.warning.light} />
                <Text style={styles.noticeText}>
                  Keep it simple: finish just one overdue task to reduce mental load.
                </Text>
              </View>

              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                {overdue.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onComplete={async () => {
                      await complete(t.id);
                      await onRefresh();
                    }}
                    onDelete={async () => {
                      await remove(t.id);
                      await onRefresh();
                    }}
                  />
                ))}
              </View>
            </Card>
          </Section>
        )}

        <Section title="Today" subtitle={`${todayCompletedTasks.length} completed`}>
          {todayTasks.length === 0 ? (
            <Card variant="default" padding="md">
              <Text style={styles.muted}>No tasks scheduled/due today.</Text>
              <View style={{ marginTop: spacing.sm }}>
                <TouchableOpacity onPress={() => router.push('/(modals)/add-task')} style={styles.quickAdd}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.brand.primary} />
                  <Text style={styles.quickAddText}>Add a task for today</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            <Card variant="default" padding="md">
              <View style={{ gap: spacing.sm }}>
                {todayTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onComplete={async () => {
                      await complete(t.id);
                      await onRefresh();
                    }}
                    onDelete={async () => {
                      await remove(t.id);
                      await onRefresh();
                    }}
                  />
                ))}
              </View>
            </Card>
          )}
        </Section>

        {todayCompletedTasks.length > 0 && (
          <Section title="Completed today">
            <Card variant="default" padding="md">
              <View style={{ gap: spacing.xs }}>
                {todayCompletedTasks.map((t) => (
                  <View key={t.id} style={styles.doneRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success.light} />
                    <Text style={styles.doneText} numberOfLines={1}>
                      {t.title}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </Section>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  addBtnText: {
    color: colors.text.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  muted: { color: colors.text.tertiary, fontSize: typography.sizes.sm, lineHeight: 18 },

  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryNumber: {
    color: colors.text.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  summaryLabel: { color: colors.text.tertiary, fontSize: typography.sizes.sm, marginTop: 2 },
  summaryDivider: { width: 1, height: 28, backgroundColor: colors.border.dark, opacity: 0.8 },

  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  sectionSubtitle: { color: colors.text.tertiary, fontSize: typography.sizes.sm },

  notice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.warning.main}15`,
  },
  noticeText: { color: colors.text.secondary, fontSize: typography.sizes.sm, flex: 1 },

  taskRow: {
    flexDirection: 'row',
    gap: 12,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
  },
  taskTitle: { color: colors.text.primary, fontWeight: typography.weights.semibold },
  taskDesc: { color: colors.text.tertiary, fontSize: typography.sizes.sm, marginTop: 6, lineHeight: 18 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center' },
  metaText: { color: colors.text.secondary, fontSize: typography.sizes.xs },

  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  pillText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },

  rowActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },

  quickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.brand.primary}15`,
    alignSelf: 'flex-start',
  },
  quickAddText: { color: colors.brand.primary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },

  doneRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 6 },
  doneText: { color: colors.text.secondary, fontSize: typography.sizes.sm, flex: 1 },
});