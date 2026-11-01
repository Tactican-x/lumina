// app/(modals)/autopilot-plan.tsx
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, findNodeHandle, UIManager } from 'react-native';
import { router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ActionSheet, type ActionSheetOption } from '@/components/ui/ActionSheet';

import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAutopilotPlan } from '@/hooks/useAutopilotPlan';
import type { AutopilotPlannedItem, AutopilotBlock, AutopilotBlockId } from '@/lib/coaching/autopilotPlan';

function hourLabel(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function overrideSummary(ov?: {
  skipped?: boolean;
  snoozedUntil?: number;
  pinnedBlockId?: AutopilotBlockId;
  forceMinimum?: boolean;
}) {
  if (!ov) return null;

  const parts: string[] = [];
  if (ov.skipped) parts.push('Skipped today');
  if (typeof ov.snoozedUntil === 'number') {
    parts.push(
      `Snoozed until ${new Date(ov.snoozedUntil).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    );
  }
  if (ov.pinnedBlockId) parts.push(`Moved to ${ov.pinnedBlockId}`);
  if (ov.forceMinimum) parts.push('Minimum version');

  return parts.length ? parts.join(' • ') : null;
}

function primaryCtaTitle(item: AutopilotPlannedItem) {
  if (item.kind === 'task') return 'Complete task';
  return 'Done';
}

function ItemRow({
  item,
  overrideText,
  isBusy,
  highlight,

  contentRef,
  onMeasured,

  onComplete,
  onOpenOptions,
}: {
  item: AutopilotPlannedItem;
  overrideText: string | null;
  isBusy: boolean;
  highlight?: boolean;

  contentRef: React.RefObject<View>;
  onMeasured: (key: string, y: number) => void;

  onComplete: () => Promise<void>;
  onOpenOptions: () => void;
}) {
  const rowRef = useRef<View>(null);

  return (
    <View
      ref={rowRef}
      collapsable={false}
      onLayout={() => {
        const rowHandle = rowRef.current ? findNodeHandle(rowRef.current as any) : null;
        const contentHandle = contentRef.current ? findNodeHandle(contentRef.current as any) : null;
        if (!rowHandle || !contentHandle) return;

        UIManager.measureLayout(
          rowHandle,
          contentHandle,
          () => {},
          (_x, y) => onMeasured(item.key, y)
        );
      }}
      style={[styles.itemRow, highlight ? styles.itemRowHighlight : null]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.itemMeta}>
          {hourLabel(item.scheduledHour)} • ~{item.minutes}m • {item.energyRequired} energy
          {item.kind === 'task' && item.priority ? ` • ${item.priority}` : ''}
        </Text>

        {overrideText ? <Text style={styles.overrideText}>{overrideText}</Text> : null}

        {item.why?.length ? (
          <View style={{ marginTop: 6, gap: 2 }}>
            {item.why.slice(0, 2).map((w, idx) => (
              <Text key={idx} style={styles.itemWhy}>
                • {w}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Button title={primaryCtaTitle(item)} disabled={isBusy} onPress={onComplete} />
          <Button title="Options" variant="ghost" disabled={isBusy} onPress={onOpenOptions} />
        </View>
      </View>
    </View>
  );
}

function BlockSection({
  block,
  nextUpKey,
  overridesByKey,
  busyKey,

  contentRef,
  onMeasured,

  onCompleteItem,
  onOpenOptions,
}: {
  block: AutopilotBlock;
  nextUpKey: string | null;
  overridesByKey: Record<string, any>;
  busyKey: string | null;

  contentRef: React.RefObject<View>;
  onMeasured: (key: string, y: number) => void;

  onCompleteItem: (item: AutopilotPlannedItem) => Promise<void>;
  onOpenOptions: (item: AutopilotPlannedItem) => void;
}) {
  if (!block.items.length) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.sectionTitle}>
        {block.label} ({hourLabel(block.startHour)}–{hourLabel(block.endHour - 1)})
      </Text>

      <Card variant="default" padding="md">
        <View style={{ gap: spacing.md }}>
          {block.items.map((item) => {
            const ov = overridesByKey[item.key];
            const ovText = overrideSummary(ov);

            return (
              <ItemRow
                key={item.key}
                item={item}
                highlight={nextUpKey === item.key}
                isBusy={busyKey === item.key}
                overrideText={ovText}
                contentRef={contentRef}
                onMeasured={onMeasured}
                onComplete={() => onCompleteItem(item)}
                onOpenOptions={() => onOpenOptions(item)}
              />
            );
          })}
        </View>
      </Card>
    </View>
  );
}

export default function AutopilotPlanModal() {
  const {
    plan,
    overrides,
    isLoading,
    error,
    refresh,
    completePlannedItem,

    skipToday,
    snoozeMinutes,
    moveToBlock,
    makeMinimum,
    clearOverride,

    startSmallTask,
  } = useAutopilotPlan();

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sheetItem, setSheetItem] = useState<AutopilotPlannedItem | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const itemYByKeyRef = useRef<Record<string, number>>({});

  const nextUpKey = plan?.nextUp?.key ?? null;
  const overridesByKey = useMemo(() => overrides ?? {}, [overrides]);

  const onMeasured = (key: string, y: number) => {
    itemYByKeyRef.current[key] = y;
  };

  async function runItemAction(item: AutopilotPlannedItem, fn: () => Promise<void>) {
    setBusyKey(item.key);
    try {
      await fn();
    } finally {
      setBusyKey(null);
    }
  }

  const jumpToNextUp = () => {
    if (!nextUpKey) return;
    const y = itemYByKeyRef.current[nextUpKey];
    if (typeof y !== 'number') return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };

  const openFocus = (itemKey: string) => {
    router.push({ pathname: '/(modals)/focus', params: { key: itemKey } } as any);
  };

  const sheetOptions: ActionSheetOption[] = useMemo(() => {
    if (!sheetItem) return [];

    const item = sheetItem;
    const ov = overridesByKey[item.key];
    const resetAvailable = !!(ov && (ov.skipped || ov.snoozedUntil || ov.pinnedBlockId || ov.forceMinimum));

    const close = () => setSheetItem(null);
    const opts: ActionSheetOption[] = [];

    // Focus Mode first (premium feel)
    opts.push({
      key: 'focus',
      label: 'Start focus session',
      onPress: async () => {
        close();
        openFocus(item.key);
      },
    });

    // Start small (tasks)
    if (item.kind === 'task' && item.starterSuggestion) {
      opts.push({
        key: 'start-small',
        label: item.starterSuggestion.title,
        onPress: async () => {
          close();
          await runItemAction(item, () => startSmallTask(item));
        },
      });
    }

    // Snooze
    opts.push(
      {
        key: 'snooze-15',
        label: 'Snooze 15 minutes',
        onPress: async () => {
          close();
          await runItemAction(item, () => snoozeMinutes(item, 15));
        },
      },
      {
        key: 'snooze-60',
        label: 'Snooze 1 hour',
        onPress: async () => {
          close();
          await runItemAction(item, () => snoozeMinutes(item, 60));
        },
      }
    );

    // Move block
    opts.push(
      {
        key: 'move-morning',
        label: 'Move to Morning',
        onPress: async () => {
          close();
          await runItemAction(item, () => moveToBlock(item, 'morning'));
        },
      },
      {
        key: 'move-afternoon',
        label: 'Move to Afternoon',
        onPress: async () => {
          close();
          await runItemAction(item, () => moveToBlock(item, 'afternoon'));
        },
      },
      {
        key: 'move-evening',
        label: 'Move to Evening',
        onPress: async () => {
          close();
          await runItemAction(item, () => moveToBlock(item, 'evening'));
        },
      }
    );

    // Minimum (habits)
    if (item.kind === 'habit') {
      opts.push({
        key: 'minimum',
        label: 'Use minimum version',
        onPress: async () => {
          close();
          await runItemAction(item, () => makeMinimum(item));
        },
      });
    }

    // Skip today
    opts.push({
      key: 'skip',
      label: 'Skip today',
      onPress: async () => {
        close();
        await runItemAction(item, () => skipToday(item));
      },
    });

    // Reset overrides
    if (resetAvailable) {
      opts.push({
        key: 'reset',
        label: 'Reset overrides',
        onPress: async () => {
          close();
          await runItemAction(item, () => clearOverride(item));
        },
      });
    }

    return opts;
  }, [
    sheetItem,
    overridesByKey,
    snoozeMinutes,
    moveToBlock,
    makeMinimum,
    skipToday,
    clearOverride,
    startSmallTask,
  ]);

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Autopilot Plan" variant="fullscreen">
        <ScrollView ref={scrollRef}>
          <View ref={contentRef} collapsable={false} style={styles.content}>
            {isLoading ? (
              <Text style={styles.muted}>Building your plan…</Text>
            ) : error ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.sectionTitle}>Couldn’t build plan</Text>
                <Text style={styles.muted}>{error}</Text>
                <Button title="Retry" onPress={refresh} />
              </View>
            ) : !plan ? (
              <Text style={styles.muted}>No plan available.</Text>
            ) : (
              <>
                {/* Top actions */}
                <View style={styles.topActions}>
                  <Button title="Jump to Next Up" variant="ghost" onPress={jumpToNextUp} />
                  <Button title="Coach inbox" variant="ghost" onPress={() => router.push('/(modals)/coach-inbox')} />
                  <Button title="Coach settings" variant="ghost" onPress={() => router.push('/(modals)/coach-settings')} />
                  <Button title="Log energy" variant="ghost" onPress={() => router.push('/(modals)/log-energy')} />
                  <Button title="Add task" variant="ghost" onPress={() => router.push('/(modals)/add-task')} />
                  <Button title="Add habit" variant="ghost" onPress={() => router.push('/(modals)/add-habit')} />
                  <Button title="Refresh" variant="ghost" onPress={refresh} />
                </View>

                {/* Next up */}
                {plan.nextUp && (
                  <Card variant="default" padding="md">
                    <Text style={styles.sectionTitle}>Next up</Text>
                    <Text style={styles.nextTitle}>{plan.nextUp.title}</Text>
                    <Text style={styles.muted}>
                      {hourLabel(plan.nextUp.scheduledHour)} • ~{plan.nextUp.minutes}m • {plan.nextUp.energyRequired}{' '}
                      energy
                    </Text>

                    <View style={{ marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <Button
                        title={primaryCtaTitle(plan.nextUp)}
                        disabled={busyKey === plan.nextUp.key}
                        onPress={() => runItemAction(plan.nextUp!, () => completePlannedItem(plan.nextUp!))}
                      />

                      <Button
                        title="Start focus"
                        variant="ghost"
                        onPress={() => openFocus(plan.nextUp!.key)}
                      />

                      {plan.nextUp.kind === 'task' && plan.nextUp.starterSuggestion ? (
                        <Button
                          title={plan.nextUp.starterSuggestion.title}
                          variant="ghost"
                          disabled={busyKey === plan.nextUp.key}
                          onPress={() => runItemAction(plan.nextUp!, () => startSmallTask(plan.nextUp!))}
                        />
                      ) : null}

                      <Button title="Options" variant="ghost" onPress={() => setSheetItem(plan.nextUp!)} />
                      <Button title="Scroll to it" variant="ghost" onPress={jumpToNextUp} />
                    </View>
                  </Card>
                )}

                {/* Overdue Rescue */}
                {plan.overdueRescue.length > 0 && (
                  <View style={{ gap: spacing.sm }}>
                    <Text style={styles.sectionTitle}>Overdue Rescue (1–3)</Text>
                    <Card variant="default" padding="md">
                      <Text style={styles.muted}>
                        This list is intentionally tiny. Finish one to reduce mental load.
                      </Text>

                      <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
                        {plan.overdueRescue.map((item) => {
                          const ov = overridesByKey[item.key];
                          const ovText = overrideSummary(ov);

                          return (
                            <ItemRow
                              key={item.key}
                              item={item}
                              highlight={nextUpKey === item.key}
                              isBusy={busyKey === item.key}
                              overrideText={ovText}
                              contentRef={contentRef}
                              onMeasured={onMeasured}
                              onComplete={() => runItemAction(item, () => completePlannedItem(item))}
                              onOpenOptions={() => setSheetItem(item)}
                            />
                          );
                        })}
                      </View>
                    </Card>
                  </View>
                )}

                {/* Blocks */}
                {plan.blocks.map((block) => (
                  <BlockSection
                    key={block.id}
                    block={block}
                    nextUpKey={nextUpKey}
                    overridesByKey={overridesByKey}
                    busyKey={busyKey}
                    contentRef={contentRef}
                    onMeasured={onMeasured}
                    onCompleteItem={(item) => runItemAction(item, () => completePlannedItem(item))}
                    onOpenOptions={(item) => setSheetItem(item)}
                  />
                ))}

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.muted}>
                    Plan size: {plan.meta.totalPlannedCount} item{plan.meta.totalPlannedCount === 1 ? '' : 's'}.
                  </Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <ActionSheet
          visible={!!sheetItem}
          title="Item options"
          subtitle={sheetItem?.title}
          onClose={() => setSheetItem(null)}
          options={sheetOptions}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  content: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },

  muted: { color: colors.text.tertiary, fontSize: typography.sizes.sm, lineHeight: 18 },

  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },

  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },

  nextTitle: {
    marginTop: 6,
    color: colors.text.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    lineHeight: 26,
  },

  itemRow: {
    padding: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemRowHighlight: {
    borderColor: `${colors.brand.primary}80`,
    backgroundColor: `${colors.brand.primary}12`,
  },

  itemTitle: { color: colors.text.primary, fontWeight: typography.weights.semibold },
  itemMeta: { color: colors.text.secondary, fontSize: typography.sizes.sm, marginTop: 2 },
  itemWhy: { color: colors.text.tertiary, fontSize: typography.sizes.sm, lineHeight: 18 },

  overrideText: {
    marginTop: 6,
    color: colors.brand.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },

  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.sm,
    alignItems: 'center',
  },

  footer: { alignItems: 'flex-start', gap: 10 },
});