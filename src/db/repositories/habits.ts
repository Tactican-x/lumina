/**
 * Habit Repository
 * CRUD operations and queries for habits and completions
 */

import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db, generateId } from '../database';
import { 
  habits, 
  habitCompletions, 
  Habit, 
  NewHabit, 
  HabitCompletion, 
  NewHabitCompletion 
} from '../schema';
import { formatDateKey, getTodayKey, getLastNDays } from '@/utils/date';

// ==========================================
// HABIT CRUD
// ==========================================

/**
 * Get all habits
 */
export async function getAllHabits(): Promise<Habit[]> {
  return await db.select().from(habits).orderBy(habits.order);
}

/**
 * Get active habits only
 */
export async function getActiveHabits(): Promise<Habit[]> {
  return await db
    .select()
    .from(habits)
    .where(eq(habits.isActive, true))
    .orderBy(habits.order);
}

/**
 * Get habit by ID
 */
export async function getHabitById(id: string): Promise<Habit | undefined> {
  const result = await db
    .select()
    .from(habits)
    .where(eq(habits.id, id))
    .limit(1);
  return result[0];
}

/**
 * Create a new habit
 */
export async function createHabit(data: Omit<NewHabit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> {
  const id = generateId();
  const now = new Date();

  const newHabit: NewHabit = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(habits).values(newHabit);
  
  const created = await getHabitById(id);
  if (!created) throw new Error('Failed to create habit');
  return created;
}

/**
 * Update a habit
 */
export async function updateHabit(
  id: string, 
  data: Partial<Omit<Habit, 'id' | 'createdAt'>>
): Promise<Habit | undefined> {
  await db
    .update(habits)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(habits.id, id));

  return await getHabitById(id);
}

/**
 * Delete a habit (also deletes completions due to CASCADE)
 */
export async function deleteHabit(id: string): Promise<void> {
  await db.delete(habits).where(eq(habits.id, id));
}

/**
 * Reorder habits
 */
export async function reorderHabits(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(habits)
      .set({ order: i })
      .where(eq(habits.id, orderedIds[i]));
  }
}

// ==========================================
// HABIT COMPLETIONS
// ==========================================

/**
 * Mark habit as complete for today
 */
export async function completeHabit(
  habitId: string,
  data?: Partial<Omit<NewHabitCompletion, 'id' | 'habitId' | 'completedAt' | 'date'>>
): Promise<HabitCompletion> {
  const id = generateId();
  const now = new Date();
  const dateKey = formatDateKey(now);

  // Check if already completed today
  const existing = await getCompletionForDate(habitId, dateKey);
  if (existing) {
    return existing;
  }

  const completion: NewHabitCompletion = {
    id,
    habitId,
    completedAt: now,
    date: dateKey,
    ...data,
  };

  await db.insert(habitCompletions).values(completion);
  
  const result = await db
    .select()
    .from(habitCompletions)
    .where(eq(habitCompletions.id, id))
    .limit(1);
    
  return result[0];
}

/**
 * Uncomplete a habit (remove today's completion)
 */
export async function uncompleteHabit(habitId: string): Promise<void> {
  const dateKey = getTodayKey();
  await db
    .delete(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.date, dateKey)
      )
    );
}

/**
 * Get completion for a specific date
 */
export async function getCompletionForDate(
  habitId: string, 
  date: string
): Promise<HabitCompletion | undefined> {
  const result = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.date, date)
      )
    )
    .limit(1);
  return result[0];
}

/**
 * Get all completions for a habit
 */
export async function getHabitCompletions(
  habitId: string,
  limit?: number
): Promise<HabitCompletion[]> {
  let query = db
    .select()
    .from(habitCompletions)
    .where(eq(habitCompletions.habitId, habitId))
    .orderBy(desc(habitCompletions.completedAt));

  if (limit) {
    query = query.limit(limit) as typeof query;
  }

  return await query;
}

/**
 * Get completions for date range
 */
export async function getCompletionsInRange(
  habitId: string,
  startDate: string,
  endDate: string
): Promise<HabitCompletion[]> {
  return await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        gte(habitCompletions.date, startDate),
        lte(habitCompletions.date, endDate)
      )
    )
    .orderBy(habitCompletions.date);
}

/**
 * Get all completions for today
 */
export async function getTodayCompletions(): Promise<HabitCompletion[]> {
  const today = getTodayKey();
  return await db
    .select()
    .from(habitCompletions)
    .where(eq(habitCompletions.date, today));
}

/**
 * Check if habit was completed today
 */
export async function isHabitCompletedToday(habitId: string): Promise<boolean> {
  const completion = await getCompletionForDate(habitId, getTodayKey());
  return !!completion;
}

// ==========================================
// STREAK CALCULATIONS
// ==========================================

/**
 * Calculate current streak for a habit
 */
export async function calculateStreak(habitId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
}> {
  const completions = await getHabitCompletions(habitId);
  
  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
  }

  // Sort by date descending
  const sortedDates = [...new Set(completions.map(c => c.date))].sort().reverse();
  
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
  }

  const lastCompletedDate = sortedDates[0];
  const today = getTodayKey();
  const yesterday = formatDateKey(new Date(Date.now() - 86400000));

  // Check if streak is still active
  const streakActive = lastCompletedDate === today || lastCompletedDate === yesterday;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate streaks
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const currentDate = new Date(sortedDates[i]);
      const prevDate = new Date(sortedDates[i - 1]);
      const diffDays = Math.floor((prevDate.getTime() - currentDate.getTime()) / 86400000);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        if (i === 1 || (i > 1 && streakActive)) {
          currentStreak = tempStreak;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }

  // Handle final streak
  longestStreak = Math.max(longestStreak, tempStreak);
  if (streakActive && currentStreak === 0) {
    currentStreak = tempStreak;
  }

  return {
    currentStreak: streakActive ? currentStreak || tempStreak : 0,
    longestStreak,
    lastCompletedDate,
  };
}

/**
 * Calculate completion rate for last N days
 */
export async function calculateCompletionRate(
  habitId: string,
  days: number = 30
): Promise<number> {
  const dates = getLastNDays(days).map(d => formatDateKey(d));
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const completions = await getCompletionsInRange(habitId, startDate, endDate);
  const completedDates = new Set(completions.map(c => c.date));

  const habit = await getHabitById(habitId);
  if (!habit) return 0;

  // For daily habits, count all days
  // For weekly habits, only count target days
  let targetDays = days;
  
  if (habit.frequency === 'weekly' && habit.targetDays) {
    const targetDaysSet = new Set(habit.targetDays);
    targetDays = dates.filter(dateStr => {
      const dayOfWeek = new Date(dateStr).getDay();
      return targetDaysSet.has(dayOfWeek);
    }).length;
  }

  if (targetDays === 0) return 100;

  return Math.round((completedDates.size / targetDays) * 100);
}

// ==========================================
// ANALYTICS QUERIES
// ==========================================

/**
 * Get completion times (hour of day) for pattern analysis
 */
export async function getCompletionTimes(
  habitId: string,
  days: number = 30
): Promise<number[]> {
  const startDate = formatDateKey(new Date(Date.now() - days * 86400000));
  
  const completions = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        gte(habitCompletions.date, startDate)
      )
    );

  return completions.map(c => new Date(c.completedAt).getHours());
}

/**
 * Get habits with today's completion status
 */
export async function getHabitsWithTodayStatus(): Promise<(Habit & { completedToday: boolean })[]> {
  const allHabits = await getActiveHabits();
  const todayCompletions = await getTodayCompletions();
  const completedIds = new Set(todayCompletions.map(c => c.habitId));

  return allHabits.map(habit => ({
    ...habit,
    completedToday: completedIds.has(habit.id),
  }));
}

/**
 * Get habit statistics
 */
export async function getHabitStats(habitId: string): Promise<{
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  completionRate30Days: number;
  completionRate7Days: number;
  averageCompletionHour: number | null;
}> {
  const [completions, streak, rate30, rate7, times] = await Promise.all([
    getHabitCompletions(habitId),
    calculateStreak(habitId),
    calculateCompletionRate(habitId, 30),
    calculateCompletionRate(habitId, 7),
    getCompletionTimes(habitId, 30),
  ]);

  const averageCompletionHour = times.length > 0
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : null;

  return {
    totalCompletions: completions.length,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    completionRate30Days: rate30,
    completionRate7Days: rate7,
    averageCompletionHour,
  };
}
