/**
 * Weekly Digest Generator
 *
 * Creates a comprehensive weekly summary insight every Sunday/Monday.
 * This is the single most anticipated insight for returning users.
 */

import { pick, fill, daySeed, pickRandom } from './insightTemplates';
import type { GeneratedInsight, MilestoneContext } from './insights';
import type { HabitCorrelation } from './correlations';

// ==========================================
// TYPES
// ==========================================

export interface WeeklyDigestInput {
  // Rates
  thisWeekCompletionRate: number;        // 0-100
  lastWeekCompletionRate: number;        // 0-100

  // Counts
  thisWeekCompletions: number;
  lastWeekCompletions: number;
  thisWeekDaysTracked: number;           // 0-7

  // Habits
  bestHabitThisWeek: { name: string; rate: number } | null;  // rate 0-100
  worstHabitThisWeek: { name: string; rate: number } | null;
  perfectDaysThisWeek: number;           // days where 100% completed

  // Streaks
  longestActiveStreak: { name: string; days: number } | null;
  streaksLost: number;

  // Overall
  avgEnergyThisWeek: number;             // 0-100
  avgPerformanceScore: number;           // 0-100

  // Milestone context (optional, reuse)
  milestones?: MilestoneContext;
  topCorrelation?: HabitCorrelation;
}

// ==========================================
// GENERATOR
// ==========================================

export function generateWeeklyDigest(input: WeeklyDigestInput): GeneratedInsight | null {
  const seed = daySeed('weekly');

  // Don't generate if user barely tracked this week
  if (input.thisWeekDaysTracked < 3) return null;

  const diff = input.thisWeekCompletionRate - input.lastWeekCompletionRate;
  const improving = diff > 3;
  const declining = diff < -3;
  const stable = !improving && !declining;

  // ---- Title ----
  const titlePool = improving
    ? [
        '📈 Weekly Report: Upward Trend',
        '🌟 This Week Was Better Than Last',
        '📊 Your Week in Review — Growth Mode',
        '💪 Stronger Week. Here\'s the Proof.',
      ]
    : declining
    ? [
        '📊 Your Week in Review',
        '📉 This Week Had Some Bumps',
        '📊 Weekly Recap — Room to Grow',
        '🔍 Your Week: Honest Look',
      ]
    : [
        '📊 Your Week in Review — Holding Steady',
        '📈 Weekly Report: Consistent',
        '📊 This Week: Stable & Solid',
      ];

  // ---- Summary ----
  const summaryPool = improving
    ? [
        `${input.thisWeekCompletionRate}% completion rate — up ${diff} points from last week.`,
        `You improved from ${input.lastWeekCompletionRate}% to ${input.thisWeekCompletionRate}%. Nice.`,
        `+${diff} points this week. The trend is your friend.`,
      ]
    : declining
    ? [
        `${input.thisWeekCompletionRate}% this week vs ${input.lastWeekCompletionRate}% last week. Let's look at why.`,
        `Completion dipped to ${input.thisWeekCompletionRate}%. Not bad — but there's room.`,
        `Down ${Math.abs(diff)} points. Every week is a fresh start.`,
      ]
    : [
        `${input.thisWeekCompletionRate}% completion — right in line with last week.`,
        `Steady at ${input.thisWeekCompletionRate}%. Consistency is its own reward.`,
        `Holding at ${input.thisWeekCompletionRate}%. Stable weeks build strong foundations.`,
      ];

  // ---- Detailed analysis ----
  const lines: string[] = [];

  lines.push('═══ WEEKLY SUMMARY ═══');
  lines.push('');
  lines.push(`Completion rate: ${input.thisWeekCompletionRate}% (last week: ${input.lastWeekCompletionRate}%)`);
  lines.push(`Total completions: ${input.thisWeekCompletions}`);
  lines.push(`Days tracked: ${input.thisWeekDaysTracked}/7`);
  lines.push(`Average energy: ${input.avgEnergyThisWeek}%`);
  lines.push(`Performance score: ${input.avgPerformanceScore}%`);
  lines.push('');

  if (input.perfectDaysThisWeek > 0) {
    lines.push(`⭐ Perfect days (100% completion): ${input.perfectDaysThisWeek}`);
    lines.push('');
  }

  // Highlights
  lines.push('─── HIGHLIGHTS ───');
  lines.push('');

  if (input.bestHabitThisWeek) {
    lines.push(`✅ Most consistent: ${input.bestHabitThisWeek.name} (${input.bestHabitThisWeek.rate}%)`);
  }
  if (input.worstHabitThisWeek && input.worstHabitThisWeek.rate < 80) {
    lines.push(`📌 Needs attention: ${input.worstHabitThisWeek.name} (${input.worstHabitThisWeek.rate}%)`);
  }
  if (input.longestActiveStreak) {
    lines.push(`🔥 Longest streak: ${input.longestActiveStreak.name} — ${input.longestActiveStreak.days} days`);
  }
  if (input.streaksLost > 0) {
    lines.push(`💔 Streaks lost: ${input.streaksLost}`);
  }
  lines.push('');

  // Coaching note
  lines.push('─── LOOKING AHEAD ───');
  lines.push('');

  if (improving) {
    lines.push('Momentum is building. Protect it by keeping your hardest habits small and consistent.');
    if (input.topCorrelation) {
      lines.push(`Remember: ${input.topCorrelation.habitName} is your highest-impact habit. Prioritize it.`);
    }
  } else if (declining) {
    lines.push('A dip isn\'t a failure — it\'s information. Ask yourself:');
    lines.push('• Was this week unusually busy or stressful?');
    lines.push('• Are any habits no longer serving you?');
    lines.push('• Would fewer, smaller habits be more sustainable?');
  } else {
    lines.push('Consistency is underrated. You\'re building something durable.');
    lines.push('If you want to level up, try adding one small challenge this week.');
  }

  // ---- Science ----
  const science = improving
    ? 'Positive behavioral momentum creates an upward spiral: each successful day increases self-efficacy, ' +
      'which increases effort, which increases success probability (Bandura, 1997).'
    : declining
    ? 'Performance naturally fluctuates. Research shows that weekly variation of ±15% is normal and expected. ' +
      'The long-term trend matters far more than any single week.'
    : 'Stable performance is a sign of habit maturity. The behavior is becoming automatic, ' +
      'requiring less conscious effort — exactly what you want.';

  return {
    type: 'pattern',
    priority: 'high',
    title: pick(titlePool, seed),
    summary: pick(summaryPool, seed + ':s'),
    detailedAnalysis: lines.join('\n'),
    scientificExplanation: science,
    confidence: 85,
    actionLabel: 'View Details',
    actionType: 'external',
    isRead: false,
    isDismissed: false,
    score: 92, // Weekly digest always ranks high
  };
}