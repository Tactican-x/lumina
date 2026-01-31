/**
 * Goal Repository
 * CRUD operations and queries for goals, milestones, and progress
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db, generateId } from '../database';
import {
  goals,
  milestones,
  goalProgress,
  Goal,
  NewGoal,
  Milestone,
  NewMilestone,
  GoalProgress,
  NewGoalProgress,
} from '../schema';
import { formatDateKey, daysUntil } from '@/utils/date';

// ==========================================
// GOAL CRUD
// ==========================================

/**
 * Get all goals
 */
export async function getAllGoals(): Promise<Goal[]> {
  return await db.select().from(goals).orderBy(desc(goals.createdAt));
}

/**
 * Get active goals only
 */
export async function getActiveGoals(): Promise<Goal[]> {
  return await db
    .select()
    .from(goals)
    .where(eq(goals.status, 'active'))
    .orderBy(desc(goals.createdAt));
}

/**
 * Get goal by ID
 */
export async function getGoalById(id: string): Promise<Goal | undefined> {
  const result = await db
    .select()
    .from(goals)
    .where(eq(goals.id, id))
    .limit(1);
  return result[0];
}

/**
 * Create a new goal
 */
export async function createGoal(
  data: Omit<NewGoal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Goal> {
  const id = generateId();
  const now = new Date();

  const newGoal: NewGoal = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(goals).values(newGoal);

  const created = await getGoalById(id);
  if (!created) throw new Error('Failed to create goal');
  return created;
}

/**
 * Update a goal
 */
export async function updateGoal(
  id: string,
  data: Partial<Omit<Goal, 'id' | 'createdAt'>>
): Promise<Goal | undefined> {
  await db
    .update(goals)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(goals.id, id));

  return await getGoalById(id);
}

/**
 * Update goal progress value
 */
export async function updateGoalProgress(
  id: string,
  newValue: number,
  note?: string
): Promise<Goal | undefined> {
  const goal = await getGoalById(id);
  if (!goal) return undefined;

  // Update goal current value
  await db
    .update(goals)
    .set({ 
      currentValue: newValue, 
      updatedAt: new Date() 
    })
    .where(eq(goals.id, id));

  // Log progress entry
  await addProgressEntry(id, newValue, note);

  // Check if goal is complete
  if (goal.targetValue && newValue >= goal.targetValue) {
    await db
      .update(goals)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(goals.id, id));
  }

  // Check milestones
  await checkAndCompleteMilestones(id, newValue);

  return await getGoalById(id);
}

/**
 * Delete a goal
 */
export async function deleteGoal(id: string): Promise<void> {
  await db.delete(goals).where(eq(goals.id, id));
}

// ==========================================
// MILESTONES
// ==========================================

/**
 * Get milestones for a goal
 */
export async function getMilestones(goalId: string): Promise<Milestone[]> {
  return await db
    .select()
    .from(milestones)
    .where(eq(milestones.goalId, goalId))
    .orderBy(milestones.order);
}

/**
 * Create a milestone
 */
export async function createMilestone(
  data: Omit<NewMilestone, 'id'>
): Promise<Milestone> {
  const id = generateId();

  const newMilestone: NewMilestone = {
    id,
    ...data,
  };

  await db.insert(milestones).values(newMilestone);

  const result = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, id))
    .limit(1);

  return result[0];
}

/**
 * Update a milestone
 */
export async function updateMilestone(
  id: string,
  data: Partial<Omit<Milestone, 'id' | 'goalId'>>
): Promise<Milestone | undefined> {
  await db
    .update(milestones)
    .set(data)
    .where(eq(milestones.id, id));

  const result = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, id))
    .limit(1);

  return result[0];
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(id: string): Promise<void> {
  await db.delete(milestones).where(eq(milestones.id, id));
}

/**
 * Check and complete milestones based on progress
 */
async function checkAndCompleteMilestones(
  goalId: string,
  currentValue: number
): Promise<void> {
  const goalMilestones = await getMilestones(goalId);

  for (const milestone of goalMilestones) {
    if (!milestone.isCompleted && currentValue >= milestone.targetValue) {
      await db
        .update(milestones)
        .set({ 
          isCompleted: true, 
          completedAt: new Date() 
        })
        .where(eq(milestones.id, milestone.id));
    }
  }
}

/**
 * Auto-generate milestones for a goal
 */
export async function generateMilestones(
  goalId: string,
  targetValue: number,
  count: number = 4
): Promise<Milestone[]> {
  const createdMilestones: Milestone[] = [];
  const increment = targetValue / count;

  for (let i = 1; i <= count; i++) {
    const milestoneValue = Math.round(increment * i);
    const milestone = await createMilestone({
      goalId,
      title: `Reach ${milestoneValue}`,
      targetValue: milestoneValue,
      order: i,
      isCompleted: false,
    });
    createdMilestones.push(milestone);
  }

  return createdMilestones;
}

// ==========================================
// PROGRESS TRACKING
// ==========================================

/**
 * Add a progress entry
 */
export async function addProgressEntry(
  goalId: string,
  value: number,
  note?: string
): Promise<GoalProgress> {
  const id = generateId();
  const now = new Date();

  const entry: NewGoalProgress = {
    id,
    goalId,
    date: formatDateKey(now),
    value,
    note,
    createdAt: now,
  };

  await db.insert(goalProgress).values(entry);

  const result = await db
    .select()
    .from(goalProgress)
    .where(eq(goalProgress.id, id))
    .limit(1);

  return result[0];
}

/**
 * Get progress history for a goal
 */
export async function getProgressHistory(
  goalId: string,
  limit?: number
): Promise<GoalProgress[]> {
  let query = db
    .select()
    .from(goalProgress)
    .where(eq(goalProgress.goalId, goalId))
    .orderBy(desc(goalProgress.createdAt));

  if (limit) {
    query = query.limit(limit) as typeof query;
  }

  return await query;
}

/**
 * Get progress in date range
 */
export async function getProgressInRange(
  goalId: string,
  startDate: string,
  endDate: string
): Promise<GoalProgress[]> {
  return await db
    .select()
    .from(goalProgress)
    .where(
      and(
        eq(goalProgress.goalId, goalId),
        gte(goalProgress.date, startDate),
        lte(goalProgress.date, endDate)
      )
    )
    .orderBy(goalProgress.date);
}

// ==========================================
// ANALYTICS
// ==========================================

/**
 * Calculate goal velocity (progress per day)
 */
export async function calculateVelocity(goalId: string): Promise<number> {
  const progress = await getProgressHistory(goalId);
  
  if (progress.length < 2) return 0;

  const sorted = [...progress].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstEntry = sorted[0];
  const lastEntry = sorted[sorted.length - 1];

  const daysDiff = Math.max(1, 
    (new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()) / 86400000
  );

  const valueDiff = lastEntry.value - firstEntry.value;

  return valueDiff / daysDiff;
}

/**
 * Calculate momentum (is progress accelerating or slowing?)
 */
export async function calculateMomentum(goalId: string): Promise<'accelerating' | 'steady' | 'slowing' | 'stalled'> {
  const progress = await getProgressHistory(goalId, 14);
  
  if (progress.length < 4) return 'steady';

  const recentProgress = progress.slice(0, 7);
  const olderProgress = progress.slice(7, 14);

  if (recentProgress.length < 2 || olderProgress.length < 2) return 'steady';

  const recentVelocity = (recentProgress[0].value - recentProgress[recentProgress.length - 1].value) / recentProgress.length;
  const olderVelocity = (olderProgress[0].value - olderProgress[olderProgress.length - 1].value) / olderProgress.length;

  if (recentVelocity <= 0) return 'stalled';
  
  const ratio = recentVelocity / Math.max(0.01, olderVelocity);

  if (ratio > 1.2) return 'accelerating';
  if (ratio < 0.8) return 'slowing';
  return 'steady';
}

/**
 * Get goal with full statistics
 */
export async function getGoalWithStats(goalId: string): Promise<{
  goal: Goal;
  milestones: Milestone[];
  progressPercent: number;
  velocity: number;
  momentum: 'accelerating' | 'steady' | 'slowing' | 'stalled';
  daysRemaining: number | null;
  isOnTrack: boolean;
} | null> {
  const goal = await getGoalById(goalId);
  if (!goal) return null;

  const [goalMilestones, velocity, momentum] = await Promise.all([
    getMilestones(goalId),
    calculateVelocity(goalId),
    calculateMomentum(goalId),
  ]);

  const progressPercent = goal.targetValue 
    ? Math.round((goal.currentValue / goal.targetValue) * 100)
    : 0;

  const daysRemaining = goal.targetDate ? daysUntil(goal.targetDate) : null;

  // Check if on track
  let isOnTrack = true;
  if (goal.targetValue && daysRemaining !== null && daysRemaining > 0) {
    const remainingProgress = goal.targetValue - goal.currentValue;
    const projectedProgress = velocity * daysRemaining;
    isOnTrack = projectedProgress >= remainingProgress * 0.9; // 90% threshold
  }

  return {
    goal,
    milestones: goalMilestones,
    progressPercent,
    velocity,
    momentum,
    daysRemaining,
    isOnTrack,
  };
}
