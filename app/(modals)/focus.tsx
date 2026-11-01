// app/(modals)/focus.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAutopilotPlan } from '@/hooks/useAutopilotPlan';
import type { AutopilotPlannedItem } from '@/lib/coaching/autopilotPlan';

import {
  loadFocusSession,
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  resetFocusSessionDuration,
  stopFocusSession,
  getRemainingSec,
  type FocusSessionState,
} from '@/lib/coaching/focusSession';

import { postInboxNudge } from '@/lib/coaching/autopilotNudges';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function fmtTime(sec: number) {
  const s = clamp(Math.floor(sec), 0, 24 * 3600);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}
function safeParam(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return null;
}

export default function FocusModal() {
  const { key: keyParam } = useLocalSearchParams();
  const targetKey = safeParam(keyParam);

  const {
    plan,
    isLoading,
    error,
    completePlannedItem,
    snoozeMinutes,
    skipToday,
    makeMinimum,
    clearOverride,
    startSmallTask,
  } = useAutopilotPlan();

  const item: AutopilotPlannedItem | null = useMemo(() => {
    if (!plan) return null;

    const all: AutopilotPlannedItem[] = [
      ...(plan.overdueRescue ?? []),
      ...(plan.blocks?.flatMap((b) => b.items) ?? []),
    ];

    if (targetKey) return all.find((i) => i.key === targetKey) ?? null;
    return plan.nextUp ?? null;
  }, [plan, targetKey]);

  const plannedSeconds = useMemo(() => clamp(Math.round((item?.minutes ?? 25) * 60), 60, 4 * 3600), [item?.minutes]);

  const [session, setSession] = useState<FocusSessionState | null>(null);
  const [remainingSec, setRemainingSec] = useState(plannedSeconds);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadFocusSession().then((s) => setSession(s));
  }, []);

  // keep remaining in sync
  const recomputeRemaining = (s: FocusSessionState | null) => {
    if (!s) {
      setRemainingSec(plannedSeconds);
      return;
    }
    setRemainingSec(getRemainingSec(s, Date.now()));
  };

  useEffect(() => {
    recomputeRemaining(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.endsAt, session?.remainingSec, plannedSeconds]);

  // tick while running
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;

    if (!session?.endsAt) return;

    tickRef.current = setInterval(() => recomputeRemaining(session), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.endsAt]);

  // recompute on resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') recomputeRemaining(session);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.endsAt, session?.remainingSec]);

  // When timer finishes while this screen is open: stop session + post inbox entry
  useEffect(() => {
    if (!session?.endsAt) return;
    if (remainingSec !== 0) return;

    (async () => {
      await postInboxNudge(new Date(), {
        id: `focus_complete:${session.itemKey}:${session.startedAt}`,
        kind: 'focus_complete',
        title: 'Focus complete',
        message: session.title,
        createdAt: Date.now(),
      });

      await stopFocusSession();
      setSession(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec, session?.endsAt]);

  const isRunning = !!session?.endsAt;
  const isPaused = !!session && session.endsAt == null;
  const finished = remainingSec === 0 && !!session;

  const progress = useMemo(() => {
    const dur = session?.durationSec ?? plannedSeconds;
    if (!dur) return 0;
    return clamp((dur - remainingSec) / dur, 0, 1);
  }, [session?.durationSec, plannedSeconds, remainingSec]);

  const canStartSmall = item?.kind === 'task' && !!item.starterSuggestion;
  const canMinimum = item?.kind === 'habit';

  const setPresetMinutes = async (m: number) => {
    const sec = clamp(Math.round(m), 5, 120) * 60;
    if (session) {
      const next = await resetFocusSessionDuration(sec);
      setSession(next);
    } else {
      setRemainingSec(sec);
    }
    Haptics.selectionAsync().catch(() => {});
  };

  const start = async () => {
    if (!item) return;
    const s = await startFocusSession({ itemKey: item.key, title: item.title, durationSec: plannedSeconds });
    setSession(s);
    Haptics.selectionAsync().catch(() => {});
  };

  const pause = async () => {
    const s = await pauseFocusSession();
    setSession(s);
    Haptics.selectionAsync().catch(() => {});
  };

  const resume = async () => {
    const s = await resumeFocusSession();
    setSession(s);
    Haptics.selectionAsync().catch(() => {});
  };

  const stop = async () => {
    await stopFocusSession();
    setSession(null);
    setRemainingSec(plannedSeconds);
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Focus Session" variant="fullscreen">
        <View style={styles.content}>
          {isLoading ? (
            <Text style={styles.muted}>Loading focus session…</Text>
          ) : error ? (
            <Card variant="default" padding="md">
              <Text style={styles.title}>Couldn’t load focus session</Text>
              <Text style={styles.muted}>{error}</Text>
              <View style={{ marginTop: spacing.sm }}>
                <Button title="Back" onPress={() => router.back()} />
              </View>
            </Card>
          ) : !item ? (
            <Card variant="default" padding="md">
              <Text style={styles.title}>Nothing to focus on</Text>
              <Text style={styles.muted}>Open Autopilot Plan and pick an item.</Text>
              <View style={{ marginTop: spacing.sm, flexDirection: 'row', gap: 12 }}>
                <Button title="Open plan" onPress={() => router.push('/(modals)/autopilot-plan')} />
                <Button title="Back" variant="ghost" onPress={() => router.back()} />
              </View>
            </Card>
          ) : (
            <>
              <Card variant="default" padding="md">
                <Text style={styles.headerLabel}>Focusing on</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>

                <Text style={styles.itemMeta}>
                  ~{item.minutes}m • {item.energyRequired} energy
                  {item.kind === 'task' && item.priority ? ` • ${item.priority}` : ''}
                  {item.kind === 'starter' ? ' • starter' : ''}
                </Text>

                {item.why?.length ? (
                  <View style={{ marginTop: spacing.sm, gap: 2 }}>
                    {item.why.slice(0, 2).map((w, idx) => (
                      <Text key={idx} style={styles.why}>
                        • {w}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </Card>

              <Card variant="default" padding="md">
                <View style={styles.timerTop}>
                  <Text style={styles.timer}>{fmtTime(remainingSec)}</Text>
                  <Text style={styles.muted}>
                    {finished ? 'Time’s up — finish or snooze.' : isRunning ? 'In progress' : isPaused ? 'Paused' : 'Ready'}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>

                <View style={styles.presetRow}>
                  <Button title="10m" variant="ghost" onPress={() => setPresetMinutes(10)} />
                  <Button title="25m" variant="ghost" onPress={() => setPresetMinutes(25)} />
                  <Button title="45m" variant="ghost" onPress={() => setPresetMinutes(45)} />
                  <Button title="60m" variant="ghost" onPress={() => setPresetMinutes(60)} />
                  <Button title="Planned" variant="ghost" onPress={() => setPresetMinutes(item.minutes)} />
                </View>

                <View style={styles.controlsRow}>
                  {!session ? (
                    <Button title="Start" onPress={start} />
                  ) : isRunning ? (
                    <Button title="Pause" variant="ghost" onPress={pause} />
                  ) : (
                    <Button title={finished ? 'Restart' : 'Resume'} onPress={resume} />
                  )}

                  <Button title="Stop" variant="ghost" onPress={stop} />
                </View>

                <Text style={[styles.muted, { marginTop: spacing.sm, textAlign: 'center' }]}>
                  You can leave this screen — the timer continues and will notify you when finished.
                </Text>
              </Card>

              <Card variant="default" padding="md">
                <Text style={styles.sectionTitle}>Actions</Text>

                <View style={styles.actionsRow}>
                  <Button
                    title="Done"
                    onPress={async () => {
                      await completePlannedItem(item);
                      await stopFocusSession();
                      router.back();
                    }}
                  />

                  <Button
                    title="Snooze 15m"
                    variant="ghost"
                    onPress={async () => {
                      await snoozeMinutes(item, 15);
                      await stopFocusSession();
                      router.back();
                    }}
                  />

                  <Button
                    title="Snooze 1h"
                    variant="ghost"
                    onPress={async () => {
                      await snoozeMinutes(item, 60);
                      await stopFocusSession();
                      router.back();
                    }}
                  />
                </View>

                <View style={styles.actionsRow}>
                  {canStartSmall ? (
                    <Button
                      title={item.starterSuggestion?.title ?? 'Start small'}
                      variant="ghost"
                      onPress={async () => {
                        await startSmallTask(item);
                      }}
                    />
                  ) : null}

                  {canMinimum ? (
                    <Button
                      title="Minimum"
                      variant="ghost"
                      onPress={async () => {
                        await makeMinimum(item);
                      }}
                    />
                  ) : null}

                  <Button
                    title="Skip today"
                    variant="ghost"
                    onPress={async () => {
                      await skipToday(item);
                      await stopFocusSession();
                      router.back();
                    }}
                  />

                  <Button
                    title="Reset overrides"
                    variant="ghost"
                    onPress={async () => {
                      await clearOverride(item);
                    }}
                  />
                </View>

                <View style={{ marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <Button title="Open plan" variant="ghost" onPress={() => router.push('/(modals)/autopilot-plan')} />
                  <Button title="Coach inbox" variant="ghost" onPress={() => router.push('/(modals)/coach-inbox')} />
                </View>
              </Card>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  content: { gap: spacing.lg },

  headerLabel: { color: colors.text.tertiary, fontSize: typography.sizes.sm },
  title: { color: colors.text.primary, fontWeight: typography.weights.semibold },
  muted: { color: colors.text.tertiary, fontSize: typography.sizes.sm, lineHeight: 18 },

  itemTitle: { marginTop: 6, color: colors.text.primary, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, lineHeight: 26 },
  itemMeta: { color: colors.text.secondary, fontSize: typography.sizes.sm, marginTop: 4 },
  why: { color: colors.text.tertiary, fontSize: typography.sizes.sm, lineHeight: 18 },

  timerTop: { alignItems: 'center', gap: 6 },
  timer: { color: colors.text.primary, fontSize: 56, fontWeight: typography.weights.bold, letterSpacing: -1 },

  progressTrack: {
    marginTop: spacing.md,
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  progressFill: { height: '100%', backgroundColor: colors.brand.primary },

  presetRow: { marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  controlsRow: { marginTop: spacing.md, flexDirection: 'row', gap: 12, justifyContent: 'center' },

  sectionTitle: { color: colors.text.primary, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, marginBottom: spacing.sm },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.sm },
});