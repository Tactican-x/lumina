/**
 * Daily Insight Runner — v2.1
 *
 * Orchestrates the full insight generation pipeline.
 * Runs at most once per day, triggered after the user completes a few habits.
 *
 * Pipeline:
 *   1.  Gate checks (already ran today? enough completions?)
 *   2.  Lifecycle cleanup (expire, archive, delete old insights)
 *   3.  Load data (habits, completions, tasks, energy)
 *   4.  Build daily aggregates (performance scores, maps)
 *   5.  All-time stats (unbounded queries for accurate milestones)
 *   6.  Streak calculation (unbounded, TZ-safe)
 *   7.  Milestone context (celebrations engine)
 *   8.  Tips & Wins context (contextual coaching + small victories)
 *   9.  Journey stage + cold start detection
 *   10. Suppression rules from feedback history
 *   11. Analysis engines (correlations, patterns, predictions)
 *   12. Generate insights (v2.1 — templates, celebrations, tips, wins)
 *   13. Weekly digest (Sunday/Monday only)
 *   14. Daily momentum (guaranteed insight)
 *   15. Persist with semantic dedup + TTL
 *   16. Finalize (mark run, refresh UI)
 */

import { and, eq, gte, lte, desc, sql } from 'drizzle-orm';

import { db } from '@/db/database';
import {
  habits,
  habitCompletions,
  tasks as tasksTable,
  energyLogs,
} from '@/db/schema';
import * as insightRepo from '@/db/repositories/insights';

import {
  getTodayKey,
  getLastNDays,
  formatDateKey,
  startOfDay,
  endOfDay,
} from '@/utils/date';
import { useUIStore } from '@/stores/uiStore';
import { useInsightStore } from '@/stores/insightStore';

import { calculateAllHabitCorrelations } from '@/lib/intelligence/correlations';
import { generatePatternSummary } from '@/lib/intelligence/patterns';
import { predictPerformance } from '@/lib/intelligence/predictions';
import {
  generateInsights,
  toInsightRecords,
  type MilestoneContext,
  type TipsAndWinsContext,
} from '@/lib/intelligence/insights';
import { detectMilestones } from '@/lib/intelligence/celebrations';
import { generateWeeklyDigest } from '@/lib/intelligence/weeklyDigest';
import {
  cleanupInsights,
  hasSemanticallySimular,
  getSuppressionRules,
  calculateExpiresAt,
} from '@/lib/intelligence/insightLifecycle';
import { pick, daySeed } from '@/lib/intelligence/insightTemplates';

// ==========================================
// STATE
// ==========================================

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

let running = false;

// ==========================================
// MAIN ENTRY
// ==========================================

export async function generateDailyInsightsIfNeeded(options?: {
  daysBack?: number;
  minDistinctHabitsCompletedToday?: number;
}): Promise<{ createdCount: number } | undefined> {
  if (running) return;

  const daysBack = options?.daysBack ?? 30;
  const minDistinct = options?.minDistinctHabitsCompletedToday ?? 3;
  const todayKey = getTodayKey();
  const ui = useUIStore.getState();

  // =========================================
  // 1. GATE CHECKS
  // =========================================
  if (ui.lastInsightRunDate === todayKey) return;

  const todaysCompletions = await db
    .select()
    .from(habitCompletions)
    .where(eq(habitCompletions.date, todayKey));

  const distinctHabitIdsToday = new Set(todaysCompletions.map(c => c.habitId));
  if (distinctHabitIdsToday.size < minDistinct) return;

  running = true;

  try {
    // =========================================
    // 2. LIFECYCLE CLEANUP
    // =========================================
    await cleanupInsights({
      maxActive: 50,
      archiveAfterDays: 14,
      deleteAfterDays: 30,
    });

    // =========================================
    // 3. LOAD DATA
    // =========================================
    const days = getLastNDays(daysBack);
    const startKey = formatDateKey(days[0]);
    const endKey = formatDateKey(days[days.length - 1]);
    const start = startOfDay(days[0]);
    const end = endOfDay(days[days.length - 1]);

    const activeHabits = await db
      .select()
      .from(habits)
      .where(eq(habits.isActive, true))
      .orderBy(habits.order);

    if (activeHabits.length === 0) return;

    const completions = await db
      .select()
      .from(habitCompletions)
      .where(
        and(
          gte(habitCompletions.date, startKey),
          lte(habitCompletions.date, endKey)
        )
      );

    const createdTasks = await db
      .select()
      .from(tasksTable)
      .where(
        and(gte(tasksTable.createdAt, start), lte(tasksTable.createdAt, end))
      );

    const completedTasks = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.status, 'completed'),
          gte(tasksTable.completedAt, start),
          lte(tasksTable.completedAt, end)
        )
      );

    // All open + overdue tasks (not windowed — we need current state)
    const pendingTasks = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.status, 'pending')
        )
      );

    const inProgressTasks = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.status, 'in_progress')
        )
      );

    const energyInRange = await db
      .select()
      .from(energyLogs)
      .where(
        and(
          gte(energyLogs.timestamp, start),
          lte(energyLogs.timestamp, end)
        )
      )
      .orderBy(desc(energyLogs.timestamp));

    // =========================================
    // 4. BUILD DAILY AGGREGATES
    // =========================================
    const completionSet = new Set(
      completions.map(c => `${c.habitId}|${c.date}`)
    );

    const tasksCreatedByDate = new Map<string, number>();
    for (const t of createdTasks) {
      const k = formatDateKey(new Date(t.createdAt));
      tasksCreatedByDate.set(k, (tasksCreatedByDate.get(k) ?? 0) + 1);
    }

    const tasksCompletedByDate = new Map<string, number>();
    for (const t of completedTasks) {
      if (!t.completedAt) continue;
      const k = formatDateKey(new Date(t.completedAt));
      tasksCompletedByDate.set(k, (tasksCompletedByDate.get(k) ?? 0) + 1);
    }

    const energySumByDate = new Map<string, number>();
    const energyCountByDate = new Map<string, number>();
    for (const e of energyInRange) {
      const k = formatDateKey(new Date(e.timestamp));
      energySumByDate.set(k, (energySumByDate.get(k) ?? 0) + e.score);
      energyCountByDate.set(k, (energyCountByDate.get(k) ?? 0) + 1);
    }

    const energyAvgByDate = new Map<string, number>();
    for (const [k, sum] of energySumByDate.entries()) {
      const n = energyCountByDate.get(k) ?? 1;
      energyAvgByDate.set(k, Math.round(sum / n));
    }

    // Daily performance scores
    const dailyPerformance = days.map(d => {
      const dateKey = formatDateKey(d);

      let completedHabits = 0;
      for (const h of activeHabits) {
        if (completionSet.has(`${h.id}|${dateKey}`)) completedHabits++;
      }
      const habitCompletionRatePct = Math.round(
        (completedHabits / activeHabits.length) * 100
      );

      const totalTasks = tasksCreatedByDate.get(dateKey) ?? 0;
      const tasksCompleted = tasksCompletedByDate.get(dateKey) ?? 0;

      const taskCompletionRatePct =
        totalTasks > 0
          ? Math.round(
              (Math.min(tasksCompleted, totalTasks) / totalTasks) * 100
            )
          : 50;

      const energyAvg = energyAvgByDate.get(dateKey) ?? 60;

      const score = Math.round(
        habitCompletionRatePct * 0.45 +
          taskCompletionRatePct * 0.2 +
          energyAvg * 0.35
      );

      return {
        date: dateKey,
        score,
        tasksCompleted,
        totalTasks,
        energyLevel: energyAvg,
        habitCompletionRatePct,
        taskCompletionRatePct,
      };
    });

    // Completion records for correlation engine (includes false rows)
    const completionRecords = [];
    for (const h of activeHabits) {
      for (const d of days) {
        const dateKey = formatDateKey(d);
        completionRecords.push({
          habitId: h.id,
          habitName: h.name,
          date: dateKey,
          completed: completionSet.has(`${h.id}|${dateKey}`),
        });
      }
    }

    // =========================================
    // 5. ALL-TIME STATS
    // =========================================
    const [{ count: allTimeCompletions }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(habitCompletions);

    const [{ count: allTimeDaysTracked }] = await db
      .select({
        count: sql<number>`count(distinct ${habitCompletions.date})`,
      })
      .from(habitCompletions);

    // =========================================
    // 6. STREAK CALCULATION (unbounded, TZ-safe)
    // =========================================
    const allCompletionRows = await db
      .select({
        habitId: habitCompletions.habitId,
        date: habitCompletions.date,
      })
      .from(habitCompletions)
      .orderBy(desc(habitCompletions.date));

    const allDatesByHabit = new Map<string, Set<string>>();
    for (const row of allCompletionRows) {
      if (!allDatesByHabit.has(row.habitId)) {
        allDatesByHabit.set(row.habitId, new Set());
      }
      allDatesByHabit.get(row.habitId)!.add(row.date);
    }

    const habitSnapshots = activeHabits.map(h => {
      const dateSet = allDatesByHabit.get(h.id) ?? new Set();

      let streak = 0;
      let checkDate = todayKey;
      for (let i = 0; i < 400; i++) {
        if (dateSet.has(checkDate)) {
          streak++;
          const d = new Date(checkDate + 'T12:00:00');
          d.setDate(d.getDate() - 1);
          checkDate = formatDateKey(d);
        } else {
          break;
        }
      }

      // Completion rate within the analysis window
      const windowCompletions = completions.filter(
        c => c.habitId === h.id
      ).length;
      const rate = days.length > 0 ? windowCompletions / days.length : 0;

      return {
        id: h.id,
        name: h.name,
        currentStreak: streak,
        completionRate: rate,
        isActiveToday: true,
      };
    });

    // =========================================
    // 7. MILESTONE CONTEXT
    // =========================================
    const dailySnapshots = days.map(d => {
      const dateKey = formatDateKey(d);
      const completedIds = activeHabits
        .filter(h => completionSet.has(`${h.id}|${dateKey}`))
        .map(h => h.id);
      return {
        date: dateKey,
        completedHabitIds: completedIds,
        totalActiveHabits: activeHabits.length,
      };
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);

    const yesterdaySnap = dailySnapshots.find(
      s => s.date === formatDateKey(yesterday)
    );
    const dayBeforeSnap = dailySnapshots.find(
      s => s.date === formatDateKey(dayBefore)
    );

    const milestoneCtx: MilestoneContext = detectMilestones({
      habits: habitSnapshots,
      dailySnapshots,
      totalCompletionsAllTime: allTimeCompletions,
      totalDaysTracked: allTimeDaysTracked,
      previousDayCompleted:
        (yesterdaySnap?.completedHabitIds.length ?? 0) > 0,
      dayBeforePreviousCompleted:
        (dayBeforeSnap?.completedHabitIds.length ?? 0) > 0,
    });

    // =========================================
    // 8. TIPS & WINS CONTEXT
    // =========================================
    const now = new Date();
    const currentHour = now.getHours();
    const currentDayOfWeek = now.getDay();
    const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6;

    // Today's habit state
    const habitsDoneToday = activeHabits
      .filter(h => completionSet.has(`${h.id}|${todayKey}`))
      .map(h => h.name);

    const habitsDueButNotDone = activeHabits
      .filter(h => !completionSet.has(`${h.id}|${todayKey}`))
      .map(h => h.name);

    const habitsCompletedToday = habitsDoneToday.length;
    const habitsRemainingToday = habitsDueButNotDone.length;
    const totalHabitsToday = activeHabits.length;
    const completionPctToday =
      totalHabitsToday > 0
        ? Math.round((habitsCompletedToday / totalHabitsToday) * 100)
        : 0;

    // Streaks
    const activeStreaks = habitSnapshots.filter(h => h.currentStreak > 0);
    const activeStreakCount = activeStreaks.length;
    const longestStreakSnap = habitSnapshots.reduce<typeof habitSnapshots[0] | null>(
      (best, h) => (!best || h.currentStreak > best.currentStreak ? h : best),
      null
    );
    const longestActiveStreak = longestStreakSnap?.currentStreak ?? 0;

    // Last 7 days performance
    const last7Perf = dailyPerformance.slice(-7);
    const prev7Perf = dailyPerformance.slice(-14, -7);

    const last7DayAvgCompletionRate =
      last7Perf.length > 0
        ? Math.round(
            last7Perf.reduce((s, p) => s + p.habitCompletionRatePct, 0) /
              last7Perf.length
          )
        : 0;

    const last7DayAvgEnergy =
      last7Perf.length > 0
        ? Math.round(
            last7Perf.reduce((s, p) => s + p.energyLevel, 0) /
              last7Perf.length
          )
        : 60;

    // Trend: compare last 7 avg to previous 7 avg
    const prev7DayAvgCompletion =
      prev7Perf.length > 0
        ? Math.round(
            prev7Perf.reduce((s, p) => s + p.habitCompletionRatePct, 0) /
              prev7Perf.length
          )
        : last7DayAvgCompletionRate;

    const trendDiff = last7DayAvgCompletionRate - prev7DayAvgCompletion;
    const performanceTrend: 'up' | 'down' | 'stable' =
      trendDiff > 5 ? 'up' : trendDiff < -5 ? 'down' : 'stable';

    // Most/least consistent habit (from the analysis window)
    const habitRates = habitSnapshots
      .map(h => ({
        name: h.name,
        rate: Math.round(h.completionRate * 100),
      }))
      .sort((a, b) => b.rate - a.rate);

    const mostConsistent = habitRates[0];
    const leastConsistent = habitRates[habitRates.length - 1];

    // Task counts
    const allOpenTasks = [...pendingTasks, ...inProgressTasks];
    const pendingTaskCount = allOpenTasks.length;

    const overdueTasks = allOpenTasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due < now;
    });
    const overdueTaskCount = overdueTasks.length;

    const tipsAndWinsCtx: TipsAndWinsContext = {
      habitsCompletedToday,
      habitsRemainingToday,
      totalHabitsToday,
      completionPctToday,

      activeStreakCount,
      longestActiveStreak,
      habitWithLongestStreak: longestStreakSnap?.name,

      last7DayAvgCompletionRate,
      last7DayAvgEnergy,
      performanceTrend,

      habitsDueButNotDone,
      habitsDoneToday,
      mostConsistentHabit: mostConsistent?.name,
      leastConsistentHabit:
        leastConsistent?.name !== mostConsistent?.name
          ? leastConsistent?.name
          : undefined,
      mostConsistentRate: mostConsistent?.rate,
      leastConsistentRate:
        leastConsistent?.name !== mostConsistent?.name
          ? leastConsistent?.rate
          : undefined,

      pendingTaskCount,
      overdueTaskCount,

      currentHour,
      isWeekend,
    };

    // =========================================
    // 9. JOURNEY STAGE + COLD START
    // =========================================
    const isColdStart = allTimeDaysTracked < 7;

    const coldStartInput = isColdStart
      ? {
          daysTracked: allTimeDaysTracked,
          totalCompletionsToday: distinctHabitIdsToday.size,
          totalHabitsActive: activeHabits.length,
          habitNames: activeHabits.map(h => h.name),
          longestCurrentStreak: longestActiveStreak,
          hasEnergyLog: energyInRange.length > 0,
        }
      : undefined;

    const journeyCtx = {
      totalDaysTracked: allTimeDaysTracked,
      totalCompletions: allTimeCompletions,
      recentTrend: 'stable' as 'improving' | 'stable' | 'declining',
    };

    // =========================================
    // 10. SUPPRESSION RULES
    // =========================================
    const suppressionRules = await getSuppressionRules();

    // =========================================
    // 11. RUN ANALYSIS ENGINES
    // =========================================

    // -- Patterns --
    const completionData = completions.map(c => {
      const dt = new Date(c.completedAt);
      return {
        date: c.date,
        hour: dt.getHours(),
        dayOfWeek: dt.getDay(),
        habitId: c.habitId,
        completed: true,
      };
    });

    const performanceData = dailyPerformance.map(p => ({
      date: p.date,
      hour: 12,
      dayOfWeek: new Date(p.date + 'T12:00:00').getDay(),
      score: p.score,
      taskCount: p.totalTasks,
      completedCount: p.tasksCompleted,
    }));

    const patternSummary = generatePatternSummary(
      completionData as any,
      performanceData as any
    );

    // Update journey trend from pattern summary
    journeyCtx.recentTrend =
      patternSummary.overallScore > 60
        ? 'improving'
        : patternSummary.overallScore < 40
        ? 'declining'
        : 'stable';

    // -- Correlations --
    const correlations = calculateAllHabitCorrelations(
      completionRecords as any,
      dailyPerformance as any
    );

    // -- Predictions --
    const historicalForPredictions = dailyPerformance.map(p => ({
      date: p.date,
      score: p.score,
      habitCompletionRate: p.habitCompletionRatePct / 100,
      taskCompletionRate: p.taskCompletionRatePct / 100,
      energyLevel: p.energyLevel,
    }));

    const predictions = predictPerformance(
      historicalForPredictions as any,
      3
    );

    // =========================================
    // 12. GENERATE INSIGHTS (v2.1)
    // =========================================
    const generated = generateInsights({
      correlations,
      patterns: patternSummary.behavioralPatterns,
      anomalies: patternSummary.anomalies,
      predictions,
      milestones: milestoneCtx,
      journey: journeyCtx,
      coldStart: coldStartInput,
      suppressionRules,
      tipsAndWins: tipsAndWinsCtx,
    });

    const records = toInsightRecords(generated);
    let createdCount = 0;

    // =========================================
    // 13. WEEKLY DIGEST (Sunday / Monday only)
    // =========================================
    if (isWeekend || currentDayOfWeek === 1) {
      const weeklyExists = await insightRepo.hasSimilarInsight(
        'pattern',
        'Weekly',
        72
      );

      if (!weeklyExists) {
        const thisWeekCompletions = last7Perf.reduce((sum, p) => {
          const count = activeHabits.filter(h =>
            completionSet.has(`${h.id}|${p.date}`)
          ).length;
          return sum + count;
        }, 0);

        const lastWeekCompletions = prev7Perf.reduce((sum, p) => {
          const count = activeHabits.filter(h =>
            completionSet.has(`${h.id}|${p.date}`)
          ).length;
          return sum + count;
        }, 0);

        const thisWeekRate =
          activeHabits.length > 0 && last7Perf.length > 0
            ? Math.round(
                (thisWeekCompletions /
                  (activeHabits.length * last7Perf.length)) *
                  100
              )
            : 0;

        const lastWeekRate =
          activeHabits.length > 0 && prev7Perf.length > 0
            ? Math.round(
                (lastWeekCompletions /
                  (activeHabits.length * prev7Perf.length)) *
                  100
              )
            : 0;

        const weeklyHabitRates = activeHabits
          .map(h => {
            const completed = last7Perf.filter(p =>
              completionSet.has(`${h.id}|${p.date}`)
            ).length;
            return {
              name: h.name,
              rate: Math.round(
                (completed / Math.max(last7Perf.length, 1)) * 100
              ),
            };
          })
          .sort((a, b) => b.rate - a.rate);

        const perfectDays = last7Perf.filter(p =>
          activeHabits.every(h => completionSet.has(`${h.id}|${p.date}`))
        ).length;

        // Streaks lost: had completions in prev7 but streak is 0 now
        const streaksLostThisWeek = habitSnapshots.filter(h => {
          if (h.currentStreak === 0) {
            const dateSet = allDatesByHabit.get(h.id) ?? new Set();
            for (const p of prev7Perf) {
              if (dateSet.has(p.date)) return true;
            }
          }
          return false;
        }).length;

        const topCorrelation = correlations.find(
          c => c.correlation > 0.3 && c.significance !== 'none'
        );

        const avgEnergyThisWeek =
          last7Perf.length > 0
            ? Math.round(
                last7Perf.reduce((s, p) => s + p.energyLevel, 0) /
                  last7Perf.length
              )
            : 50;

        const avgPerformanceScore =
          last7Perf.length > 0
            ? Math.round(
                last7Perf.reduce((s, p) => s + p.score, 0) /
                  last7Perf.length
              )
            : 50;

        const digest = generateWeeklyDigest({
          thisWeekCompletionRate: thisWeekRate,
          lastWeekCompletionRate: lastWeekRate,
          thisWeekCompletions,
          lastWeekCompletions,
          thisWeekDaysTracked: last7Perf.length,
          bestHabitThisWeek: weeklyHabitRates[0] ?? null,
          worstHabitThisWeek:
            weeklyHabitRates[weeklyHabitRates.length - 1] ?? null,
          perfectDaysThisWeek: perfectDays,
          longestActiveStreak:
            longestStreakSnap && longestStreakSnap.currentStreak > 0
              ? {
                  name: longestStreakSnap.name,
                  days: longestStreakSnap.currentStreak,
                }
              : null,
          streaksLost: streaksLostThisWeek,
          avgEnergyThisWeek,
          avgPerformanceScore,
          topCorrelation,
        });

        if (digest) {
          const { score, ...digestPayload } = digest;
          await insightRepo.createInsight({
            ...digestPayload,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          } as any);
          createdCount++;
        }
      }
    }

    // =========================================
    // 14. DAILY MOMENTUM (guaranteed insight)
    // =========================================
    if (habitsDoneToday.length > 0) {
      const dailyTitle = 'Daily Momentum';
      const dailyExists = await insightRepo.hasSimilarInsight(
        'achievement',
        dailyTitle,
        24
      );

      if (!dailyExists) {
        const count = habitsDoneToday.length;
        const total = totalHabitsToday;
        const pct = Math.round((count / total) * 100);

        const momentumPhrases = [
          `${count} habits down today. That's momentum.`,
          `You've knocked out ${count} habits. Solid day.`,
          `${count} habits complete — every one counts.`,
          `Today's tally: ${count} habits done. Keep rolling.`,
          `${count} habits checked off. You showed up today.`,
          `Another day, another ${count} habits. Consistency wins.`,
          `${count} of ${total} — that's ${pct}% done.`,
        ];

        const seed = daySeed('momentum');
        const summaryText = pick(momentumPhrases, seed);

        const sciencePool = [
          'Completing planned actions triggers dopamine release in the striatum, reinforcing the neural pathway that makes tomorrow\'s habits easier to start.',
          'Each habit completion strengthens the cue-routine-reward loop in the basal ganglia, reducing future willpower cost.',
          'Early wins create a "progress principle" effect — small accomplishments boost motivation disproportionately.',
          'Visible progress activates the brain\'s reward circuitry, creating positive momentum for remaining tasks.',
        ];

        const detailLines = [
          `Completed today:\n${habitsDoneToday.map(n => '✅ ' + n).join('\n')}`,
        ];

        if (habitsRemainingToday > 0) {
          detailLines.push(
            `\nRemaining:\n${habitsDueButNotDone.map(n => '⬜ ' + n).join('\n')}`
          );
          detailLines.push(`\n${habitsRemainingToday} to go — you've got this.`);
        } else {
          detailLines.push('\n🎯 Perfect day! Every habit completed.');
        }

        await insightRepo.createInsight({
          type: 'achievement',
          priority: 'medium',
          title: dailyTitle,
          summary: summaryText,
          detailedAnalysis: detailLines.join('\n'),
          scientificExplanation: pick(sciencePool, seed + ':sci'),
          confidence: 65,
          correlationValue: null,
          pValue: null,
          effectSize: null,
          actionLabel: 'View Habits',
          actionType: 'habit',
          actionPayload: null,
          relatedHabitIds: activeHabits.map(h => h.id),
          relatedGoalIds: null,
          expiresAt: calculateExpiresAt('achievement', new Date()),
        } as any);

        createdCount++;
      }
    }

    // =========================================
    // 15. PERSIST GENERATED INSIGHTS
    // =========================================
    for (const r of records as any[]) {
      const isDuplicate = await hasSemanticallySimular(
        {
          type: r.type,
          relatedHabitIds: r.relatedHabitIds,
          relatedGoalIds: r.relatedGoalIds,
          correlationValue: r.correlationValue,
          title: r.title,
        },
        20
      );

      if (isDuplicate) continue;

      const { isRead, isDismissed, ...payload } = r;

      await insightRepo.createInsight({
        ...payload,
        expiresAt: calculateExpiresAt(payload.type, new Date()),
      });

      createdCount++;
    }

    // =========================================
    // 16. FINALIZE
    // =========================================
    useUIStore.getState().setLastInsightRunDate(todayKey);
    await useInsightStore.getState().fetchInsights();

    if (isDev) {
      const stageLabel =
        allTimeDaysTracked < 7
          ? 'newcomer'
          : allTimeDaysTracked < 30
          ? 'building'
          : allTimeDaysTracked < 90
          ? 'established'
          : 'veteran';

      console.log(
        `[InsightRunner] Generated ${createdCount} insights`,
        isColdStart ? '(cold start)' : '',
        `| stage: ${stageLabel}`,
        `| habits: ${activeHabits.length}`,
        `| streaks: ${activeStreakCount}`,
        `| trend: ${performanceTrend}`,
        `| tips&wins ctx: ✅`,
        `| completion: ${completionPctToday}%`,
        `| milestones: ${milestoneCtx.streaks.filter(s => [7, 14, 21, 30, 50, 66, 100, 150, 200, 365].includes(s.currentStreak)).length}`
      );
    }

    return { createdCount };
  } catch (e) {
    console.error('[InsightRunner] Daily insight generation failed:', e);
    return undefined;
  } finally {
    running = false;
  }
}

// ==========================================
// MANUAL TRIGGER (testing / debugging)
// ==========================================

/**
 * Force-run insight generation, bypassing date and completion gates.
 */
export async function forceGenerateInsights(options?: {
  daysBack?: number;
}): Promise<{ createdCount: number } | undefined> {
  const ui = useUIStore.getState();
  const savedDate = ui.lastInsightRunDate;

  ui.setLastInsightRunDate('');

  const result = await generateDailyInsightsIfNeeded({
    daysBack: options?.daysBack ?? 30,
    minDistinctHabitsCompletedToday: 0,
  });

  if (!result) {
    ui.setLastInsightRunDate(savedDate);
  }

  return result;
}

// ==========================================
// APP LAUNCH HOOK
// ==========================================

/**
 * Call on app launch. Runs lightweight cleanup only — no generation.
 */
export async function onAppLaunchInsightCleanup(): Promise<void> {
  try {
    const { expired, archived, deleted } = await cleanupInsights({
      maxActive: 50,
      archiveAfterDays: 14,
      deleteAfterDays: 30,
    });

    if (isDev && (expired + archived + deleted > 0)) {
      console.log(
        `[InsightRunner] Launch cleanup: ${expired} expired, ${archived} archived, ${deleted} deleted`
      );
    }

    if (expired + archived + deleted > 0) {
      await useInsightStore.getState().fetchInsights(undefined, { silent: true });
    }
  } catch (e) {
    console.error('[InsightRunner] Launch cleanup failed:', e);
  }
}
