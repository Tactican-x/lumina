/**
 * Celebration & Milestone Detection
 *
 * Scans user data for noteworthy events and builds
 * a MilestoneContext that the insight generator uses
 * to produce timely, delightful celebration insights.
 *
 * Designed to be called from dailyInsightsRunner.ts
 * right before generateInsights().
 */

import { formatDateKey, getLastNDays } from '@/utils/date';
import type { MilestoneContext } from './insights';

// ==========================================
// TYPES
// ==========================================

export interface HabitSnapshot {
  id: string;
  name: string;
  currentStreak: number;
  completionRate: number;  // 0-1 over tracked period
  isActiveToday: boolean;
}

export interface DailySnapshot {
  date: string;
  completedHabitIds: string[];
  totalActiveHabits: number;
}

export interface CelebrationInput {
  habits: HabitSnapshot[];
  dailySnapshots: DailySnapshot[];         // last 30+ days, sorted by date
  totalCompletionsAllTime: number;
  totalDaysTracked: number;
  previousDayCompleted: boolean;           // did user complete ≥1 habit yesterday?
  dayBeforePreviousCompleted: boolean;     // 2 days ago
}

// ==========================================
// MAIN DETECTOR
// ==========================================

export function detectMilestones(input: CelebrationInput): MilestoneContext {
  const {
    habits,
    dailySnapshots,
    totalCompletionsAllTime,
    totalDaysTracked,
    previousDayCompleted,
    dayBeforePreviousCompleted,
  } = input;

  const snaps = [...dailySnapshots].sort((a, b) => a.date.localeCompare(b.date));

  // ---- Streaks ----
  const streaks = habits
    .filter(h => h.currentStreak > 0)
    .map(h => ({
      habitId: h.id,
      habitName: h.name,
      currentStreak: h.currentStreak,
    }));

  // ---- Personal best day ----
  let personalBestDay: MilestoneContext['personalBestDay'] = undefined;
  const todayKey = formatDateKey(new Date());
  const todaySnap = snaps.find(s => s.date === todayKey);

  if (todaySnap) {
    const allCounts = snaps.map(s => s.completedHabitIds.length);
    const maxEver = Math.max(...allCounts, 0);

    if (todaySnap.completedHabitIds.length >= maxEver && todaySnap.completedHabitIds.length > 0) {
      // Only flag if today is a NEW record (not a tie with recent days)
      const previousMax = Math.max(...allCounts.slice(0, -1), 0);
      if (todaySnap.completedHabitIds.length > previousMax) {
        personalBestDay = {
          date: todayKey,
          count: todaySnap.completedHabitIds.length,
        };
      }
    }
  }

  // ---- Longest ever streak ----
  let longestEverStreak: MilestoneContext['longestEverStreak'] = undefined;
  const longest = habits.reduce<HabitSnapshot | null>((best, h) => {
    if (!best || h.currentStreak > best.currentStreak) return h;
    return best;
  }, null);

  if (longest && longest.currentStreak >= 7) {
    longestEverStreak = {
      habitName: longest.name,
      days: longest.currentStreak,
    };
  }

  // ---- Week-over-week rates ----
  const last7 = snaps.slice(-7);
  const prev7 = snaps.slice(-14, -7);

  const currentWeekRate = computeWeekRate(last7);
  const lastWeekRate = computeWeekRate(prev7);

  // ---- Comeback detection ----
  // User missed 2+ days then came back today
  const isComeback = !dayBeforePreviousCompleted && !previousDayCompleted && (todaySnap?.completedHabitIds.length ?? 0) > 0;

  // ---- Top habit ----
  const sortedByRate = [...habits].sort((a, b) => b.completionRate - a.completionRate);
  const topHabit = sortedByRate[0];

  // ---- Best/worst day of week ----
  const dayOfWeekRates = computeDayOfWeekRates(snaps);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let bestDayIdx = 0;
  let worstDayIdx = 0;
  for (let d = 0; d < 7; d++) {
    if (dayOfWeekRates[d] > dayOfWeekRates[bestDayIdx]) bestDayIdx = d;
    if (dayOfWeekRates[d] < dayOfWeekRates[worstDayIdx]) worstDayIdx = d;
  }

  return {
    streaks,
    totalCompletions: totalCompletionsAllTime,
    totalDaysTracked,
    personalBestDay,
    longestEverStreak,
    currentWeekRate: Math.round(currentWeekRate),
    lastWeekRate: Math.round(lastWeekRate),
    isComeback,
    topHabitName: topHabit?.name,
    topHabitRate: topHabit ? Math.round(topHabit.completionRate * 100) : undefined,
    bestDayOfWeek: dayNames[bestDayIdx],
    worstDayOfWeek: dayNames[worstDayIdx],
  };
}

// ==========================================
// HELPERS
// ==========================================

function computeWeekRate(snapshots: DailySnapshot[]): number {
  if (snapshots.length === 0) return 0;
  let completed = 0;
  let total = 0;
  for (const s of snapshots) {
    completed += s.completedHabitIds.length;
    total += s.totalActiveHabits;
  }
  return total > 0 ? (completed / total) * 100 : 0;
}

function computeDayOfWeekRates(snapshots: DailySnapshot[]): number[] {
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);

  for (const s of snapshots) {
    const dow = new Date(s.date).getDay();
    const rate = s.totalActiveHabits > 0
      ? s.completedHabitIds.length / s.totalActiveHabits
      : 0;
    sums[dow] += rate;
    counts[dow] += 1;
  }

  return sums.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
}

// ==========================================
// STREAK MILESTONE CHECK (exported utility)
// ==========================================

const MILESTONES = [7, 14, 21, 30, 50, 66, 100, 150, 200, 365];

/** Quick check: does this streak length hit a celebration threshold? */
export function isStreakMilestone(streak: number): boolean {
  return MILESTONES.includes(streak);
}

/** Get a human label for a milestone */
export function milestoneLabel(streak: number): string {
  if (streak >= 365) return '🏆 ONE YEAR';
  if (streak >= 200) return '🏆 200 days';
  if (streak >= 150) return '💎 150 days';
  if (streak >= 100) return '💯 100 days';
  if (streak >= 66) return '🧠 Automaticity (66 days)';
  if (streak >= 50) return '🔥 50 days';
  if (streak >= 30) return '📅 One month';
  if (streak >= 21) return '💪 Three weeks';
  if (streak >= 14) return '✌️ Two weeks';
  if (streak >= 7) return '🌟 One week';
  return `${streak} days`;
}