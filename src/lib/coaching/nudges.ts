/**
 * Smart Nudge Generation System
 * 
 * Generates context-aware, personalized nudges based on:
 * - Current time and energy phase
 * - User patterns and history
 * - Streak status and risks
 * - Goals progress
 */

import { Habit, Goal, Task, EnergyPhase } from '@/types';
import { getCurrentHour, getTimeOfDayGreeting, formatDuration } from '@/utils/date';
import { formatPercentage, formatStreak } from '@/utils/format';

export type NudgeType = 
  | 'habit_reminder'
  | 'streak_protection'
  | 'energy_optimization'
  | 'goal_check_in'
  | 'burnout_warning'
  | 'celebration'
  | 'insight_highlight'
  | 'task_suggestion';

export type NudgePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Nudge {
  id: string;
  type: NudgeType;
  priority: NudgePriority;
  title: string;
  message: string;
  explanation?: string;  // WHY we're suggesting this
  actionLabel?: string;
  actionType?: 'habit' | 'goal' | 'task' | 'navigate' | 'dismiss';
  actionPayload?: Record<string, unknown>;
  expiresAt?: Date;
  createdAt: Date;
}

export interface NudgeContext {
  currentHour: number;
  currentEnergyScore: number;
  currentPhase: EnergyPhase;
  habits: HabitNudgeData[];
  goals: GoalNudgeData[];
  pendingTasks: Task[];
  burnoutRisk: number;
  dayOfWeek: number;
}

interface HabitNudgeData {
  habit: Habit;
  completedToday: boolean;
  currentStreak: number;
  streakAtRisk: boolean;
  optimalTime: number; // Hour of day
  completionRate: number;
  correlation: number;
}

interface GoalNudgeData {
  goal: Goal;
  progressPercent: number;
  daysRemaining: number;
  isOnTrack: boolean;
  daysSinceUpdate: number;
}

/**
 * Generate all relevant nudges for current context
 */
export function generateNudges(context: NudgeContext): Nudge[] {
  const nudges: Nudge[] = [];

  // 1. Streak protection nudges (highest priority)
  nudges.push(...generateStreakNudges(context));

  // 2. Burnout warning
  if (context.burnoutRisk > 60) {
    nudges.push(generateBurnoutNudge(context.burnoutRisk));
  }

  // 3. Energy optimization
  nudges.push(...generateEnergyNudges(context));

  // 4. Habit reminders
  nudges.push(...generateHabitReminders(context));

  // 5. Goal check-ins
  nudges.push(...generateGoalNudges(context));

  // 6. Task suggestions
  nudges.push(...generateTaskNudges(context));

  // Sort by priority
  const priorityOrder: Record<NudgePriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Generate streak protection nudges
 */
function generateStreakNudges(context: NudgeContext): Nudge[] {
  const nudges: Nudge[] = [];
  const now = new Date();

  for (const habitData of context.habits) {
    if (habitData.streakAtRisk && !habitData.completedToday && habitData.currentStreak > 0) {
      const urgency = context.currentHour >= 20 ? 'critical' : 'high';
      
      nudges.push({
        id: `streak-${habitData.habit.id}-${now.getTime()}`,
        type: 'streak_protection',
        priority: urgency,
        title: `Protect Your ${habitData.currentStreak}-Day Streak! 🔥`,
        message: `Your "${habitData.habit.name}" streak is at risk. Complete it before midnight to keep it going.`,
        explanation: `You've built real momentum over ${habitData.currentStreak} days. Research shows breaking a streak makes it 40% harder to restart.`,
        actionLabel: 'Complete Now',
        actionType: 'habit',
        actionPayload: { habitId: habitData.habit.id },
        expiresAt: new Date(now.setHours(23, 59, 59)),
        createdAt: now,
      });
    }
  }

  return nudges;
}

/**
 * Generate burnout warning nudge
 */
function generateBurnoutNudge(riskLevel: number): Nudge {
  const now = new Date();
  
  let title: string;
  let message: string;
  let priority: NudgePriority;

  if (riskLevel >= 80) {
    title = '⚠️ Burnout Risk Critical';
    message = 'Your cognitive load has been significantly elevated. Consider taking a recovery day.';
    priority = 'critical';
  } else if (riskLevel >= 70) {
    title = '🔶 High Burnout Risk Detected';
    message = 'You\'ve been pushing hard. Schedule some lighter tasks or rest.';
    priority = 'high';
  } else {
    title = '💛 Elevated Stress Noticed';
    message = 'Your load is above baseline. Consider pacing yourself today.';
    priority = 'medium';
  }

  return {
    id: `burnout-${now.getTime()}`,
    type: 'burnout_warning',
    priority,
    title,
    message,
    explanation: 'This is based on your task completion patterns, habit consistency, and historical load compared to your baseline. Your brain needs recovery to perform at its best.',
    actionLabel: 'See Recovery Plan',
    actionType: 'navigate',
    actionPayload: { screen: 'insights', filter: 'burnout' },
    createdAt: now,
  };
}

/**
 * Generate energy optimization nudges
 */
function generateEnergyNudges(context: NudgeContext): Nudge[] {
  const nudges: Nudge[] = [];
  const now = new Date();

  // Peak energy window nudge
  if (context.currentEnergyScore >= 80) {
    const importantTasks = context.pendingTasks.filter(
      t => t.priority === 'high' || t.priority === 'urgent'
    );

    if (importantTasks.length > 0) {
      nudges.push({
        id: `peak-energy-${now.getTime()}`,
        type: 'energy_optimization',
        priority: 'medium',
        title: '⚡ You\'re in Peak Performance',
        message: `Your energy is at ${context.currentEnergyScore}%. Perfect time for important work.`,
        explanation: 'Your circadian rhythm analysis shows this is when your prefrontal cortex is most active. Complex tasks are 30% easier now.',
        actionLabel: `Start "${importantTasks[0].title}"`,
        actionType: 'task',
        actionPayload: { taskId: importantTasks[0].id },
        createdAt: now,
      });
    }
  }

  // Low energy suggestion
  if (context.currentEnergyScore < 40 && context.currentHour < 18) {
    nudges.push({
      id: `low-energy-${now.getTime()}`,
      type: 'energy_optimization',
      priority: 'low',
      title: '🔋 Energy Dip Detected',
      message: 'Consider a short walk or light task. Your energy typically rebounds in 1-2 hours.',
      explanation: 'This is a natural circadian dip. Fighting it is less effective than working with it.',
      actionLabel: 'See Light Tasks',
      actionType: 'navigate',
      actionPayload: { screen: 'tasks', filter: 'low_energy' },
      createdAt: now,
    });
  }

  return nudges;
}

/**
 * Generate habit reminder nudges
 */
function generateHabitReminders(context: NudgeContext): Nudge[] {
  const nudges: Nudge[] = [];
  const now = new Date();

  for (const habitData of context.habits) {
    // Skip if already completed
    if (habitData.completedToday) continue;

    // Skip if not optimal time yet (within 1 hour window)
    const hourDiff = Math.abs(context.currentHour - habitData.optimalTime);
    if (hourDiff > 1) continue;

    // High-impact habits get priority
    const isHighImpact = habitData.correlation > 0.7;
    
    nudges.push({
      id: `reminder-${habitData.habit.id}-${now.getTime()}`,
      type: 'habit_reminder',
      priority: isHighImpact ? 'medium' : 'low',
      title: isHighImpact 
        ? `🎯 High-Impact: ${habitData.habit.name}`
        : `Time for ${habitData.habit.name}`,
      message: isHighImpact
        ? `This habit strongly correlates with your best days (r=${habitData.correlation.toFixed(2)})`
        : `You usually do this around now. ${formatStreak(habitData.currentStreak)} streak.`,
      explanation: isHighImpact
        ? 'Our analysis shows this habit is a key driver of your overall performance.'
        : undefined,
      actionLabel: 'Complete',
      actionType: 'habit',
      actionPayload: { habitId: habitData.habit.id },
      createdAt: now,
    });
  }

  return nudges;
}

/**
 * Generate goal check-in nudges
 */
function generateGoalNudges(context: NudgeContext): Nudge[] {
  const nudges: Nudge[] = [];
  const now = new Date();

  for (const goalData of context.goals) {
    // Stalled goal nudge
    if (goalData.daysSinceUpdate >= 7) {
      nudges.push({
        id: `goal-stalled-${goalData.goal.id}-${now.getTime()}`,
        type: 'goal_check_in',
        priority: 'medium',
        title: `📊 "${goalData.goal.title}" needs attention`,
        message: `No progress logged in ${goalData.daysSinceUpdate} days. Would you like to update it or adjust the goal?`,
        explanation: 'Goals without regular updates are 60% less likely to be completed. A small update keeps momentum.',
        actionLabel: 'Update Progress',
        actionType: 'goal',
        actionPayload: { goalId: goalData.goal.id },
        createdAt: now,
      });
    }

    // Off-track warning
    if (!goalData.isOnTrack && goalData.daysRemaining < 30 && goalData.daysRemaining > 0) {
      nudges.push({
        id: `goal-offtrack-${goalData.goal.id}-${now.getTime()}`,
        type: 'goal_check_in',
        priority: 'high',
        title: `⚠️ "${goalData.goal.title}" may need adjustment`,
        message: `${goalData.daysRemaining} days left, ${formatPercentage(goalData.progressPercent)} complete. Consider revising timeline or scope.`,
        explanation: 'Adjusting goals isn\'t failure—it\'s smart planning. Unrealistic goals cause stress without benefit.',
        actionLabel: 'Review Goal',
        actionType: 'navigate',
        actionPayload: { screen: 'goal-detail', goalId: goalData.goal.id },
        createdAt: now,
      });
    }

    // Celebration for on-track goals
    if (goalData.isOnTrack && goalData.progressPercent >= 75) {
      nudges.push({
        id: `goal-celebrate-${goalData.goal.id}-${now.getTime()}`,
        type: 'celebration',
        priority: 'low',
        title: `🎉 "${goalData.goal.title}" is 75%+ complete!`,
        message: `You're on track to finish with ${goalData.daysRemaining} days to spare. Keep it up!`,
        actionLabel: 'View Progress',
        actionType: 'navigate',
        actionPayload: { screen: 'goal-detail', goalId: goalData.goal.id },
        createdAt: now,
      });
    }
  }

  return nudges;
}

/**
 * Generate task suggestion nudges
 */
function generateTaskNudges(context: NudgeContext): Nudge[] {
  const nudges: Nudge[] = [];
  const now = new Date();

  // Match tasks to current energy
  const matchingTasks = context.pendingTasks.filter(task => {
    if (context.currentEnergyScore >= 70) {
      return task.energyRequired === 'high';
    } else if (context.currentEnergyScore >= 40) {
      return task.energyRequired === 'medium';
    } else {
      return task.energyRequired === 'low';
    }
  });

  if (matchingTasks.length > 0 && context.pendingTasks.length > 3) {
    const suggestedTask = matchingTasks[0];
    
    nudges.push({
      id: `task-suggest-${now.getTime()}`,
      type: 'task_suggestion',
      priority: 'low',
      title: '💡 Task Suggestion',
      message: `"${suggestedTask.title}" matches your current energy level.`,
      explanation: `Based on your ${context.currentEnergyScore}% energy score, this ${suggestedTask.energyRequired}-energy task is a good fit right now.`,
      actionLabel: 'Start Task',
      actionType: 'task',
      actionPayload: { taskId: suggestedTask.id },
      createdAt: now,
    });
  }

  return nudges;
}

/**
 * Generate morning briefing nudge
 */
export function generateMorningBriefing(context: {
  userName?: string;
  habitsToday: number;
  topPriority?: string;
  energyForecast: number;
  streaksAtRisk: number;
}): Nudge {
  const greeting = getTimeOfDayGreeting();
  const name = context.userName ? `, ${context.userName}` : '';
  
  let message = `You have ${context.habitsToday} habits scheduled. `;
  
  if (context.topPriority) {
    message += `Top priority: "${context.topPriority}". `;
  }
  
  message += `Energy forecast: ${context.energyForecast}%.`;

  if (context.streaksAtRisk > 0) {
    message += ` ⚠️ ${context.streaksAtRisk} streak${context.streaksAtRisk > 1 ? 's' : ''} at risk today.`;
  }

  return {
    id: `morning-${Date.now()}`,
    type: 'insight_highlight',
    priority: 'medium',
    title: `${greeting}${name}! ☀️`,
    message,
    actionLabel: 'See Full Briefing',
    actionType: 'navigate',
    actionPayload: { screen: 'home' },
    createdAt: new Date(),
  };
}

/**
 * Generate evening reflection nudge
 */
export function generateEveningReflection(context: {
  habitsCompleted: number;
  habitsTotal: number;
  tasksCompleted: number;
  insightsGenerated: number;
  tomorrowForecast: number;
}): Nudge {
  const completionRate = context.habitsTotal > 0 
    ? Math.round((context.habitsCompleted / context.habitsTotal) * 100)
    : 0;

  let message: string;
  let title: string;

  if (completionRate >= 80) {
    title = '🌟 Great Day!';
    message = `You completed ${context.habitsCompleted}/${context.habitsTotal} habits and ${context.tasksCompleted} tasks. `;
  } else if (completionRate >= 50) {
    title = '👍 Solid Progress';
    message = `You completed ${context.habitsCompleted}/${context.habitsTotal} habits today. `;
  } else {
    title = '💪 Tomorrow is Fresh';
    message = `Tough day? You still showed up. ${context.habitsCompleted} habits completed. `;
  }

  if (context.insightsGenerated > 0) {
    message += `${context.insightsGenerated} new insight${context.insightsGenerated > 1 ? 's' : ''} discovered. `;
  }

  message += `Tomorrow's energy forecast: ${context.tomorrowForecast}%.`;

  return {
    id: `evening-${Date.now()}`,
    type: 'insight_highlight',
    priority: 'low',
    title,
    message,
    actionLabel: 'Review Day',
    actionType: 'navigate',
    actionPayload: { screen: 'insights' },
    createdAt: new Date(),
  };
}
