/**
 * Insight Repository
 * CRUD operations for AI-generated insights
 */

import { eq, and, desc, gte, lte, or } from 'drizzle-orm';
import { db, generateId } from '../database';
import { insights, Insight, NewInsight } from '../schema';

// ==========================================
// INSIGHT CRUD
// ==========================================

/**
 * Get all insights
 */
export async function getAllInsights(): Promise<Insight[]> {
  return await db
    .select()
    .from(insights)
    .where(eq(insights.isDismissed, false))
    .orderBy(desc(insights.createdAt));
}

/**
 * Get unread insights
 */
export async function getUnreadInsights(): Promise<Insight[]> {
  return await db
    .select()
    .from(insights)
    .where(
      and(
        eq(insights.isRead, false),
        eq(insights.isDismissed, false)
      )
    )
    .orderBy(desc(insights.priority), desc(insights.createdAt));
}

/**
 * Get insights by type
 */
export async function getInsightsByType(type: Insight['type']): Promise<Insight[]> {
  return await db
    .select()
    .from(insights)
    .where(
      and(
        eq(insights.type, type),
        eq(insights.isDismissed, false)
      )
    )
    .orderBy(desc(insights.createdAt));
}

/**
 * Get insight by ID
 */
export async function getInsightById(id: string): Promise<Insight | undefined> {
  const result = await db
    .select()
    .from(insights)
    .where(eq(insights.id, id))
    .limit(1);
  return result[0];
}

/**
 * Create a new insight
 */
export async function createInsight(
  data: Omit<NewInsight, 'id' | 'createdAt' | 'isRead' | 'isDismissed'>
): Promise<Insight> {
  const id = generateId();
  const now = new Date();

  const newInsight: NewInsight = {
    id,
    ...data,
    isRead: false,
    isDismissed: false,
    createdAt: now,
  };

  await db.insert(insights).values(newInsight);

  const created = await getInsightById(id);
  if (!created) throw new Error('Failed to create insight');
  return created;
}

/**
 * Mark insight as read
 */
export async function markInsightAsRead(id: string): Promise<void> {
  await db
    .update(insights)
    .set({ isRead: true })
    .where(eq(insights.id, id));
}

/**
 * Mark all insights as read
 */
export async function markAllInsightsAsRead(): Promise<void> {
  await db
    .update(insights)
    .set({ isRead: true })
    .where(eq(insights.isRead, false));
}

/**
 * Dismiss an insight
 */
export async function dismissInsight(id: string): Promise<void> {
  await db
    .update(insights)
    .set({ isDismissed: true })
    .where(eq(insights.id, id));
}

/**
 * Delete old insights (cleanup)
 */
export async function deleteOldInsights(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysOld * 86400000);

  const oldInsights = await db
    .select()
    .from(insights)
    .where(
      and(
        lte(insights.createdAt, cutoffDate),
        eq(insights.isRead, true)
      )
    );

  for (const insight of oldInsights) {
    await db.delete(insights).where(eq(insights.id, insight.id));
  }

  return oldInsights.length;
}

// ==========================================
// INSIGHT QUERIES
// ==========================================

/**
 * Get active warnings (high priority, not dismissed)
 */
export async function getActiveWarnings(): Promise<Insight[]> {
  return await db
    .select()
    .from(insights)
    .where(
      and(
        eq(insights.type, 'warning'),
        eq(insights.isDismissed, false),
        or(
          eq(insights.priority, 'critical'),
          eq(insights.priority, 'high')
        )
      )
    )
    .orderBy(desc(insights.priority), desc(insights.createdAt));
}

/**
 * Get insights related to a habit
 */
export async function getInsightsForHabit(habitId: string): Promise<Insight[]> {
  const allInsights = await getAllInsights();
  
  return allInsights.filter(insight => {
    const relatedHabits = insight.relatedHabitIds as string[] | null;
    return relatedHabits?.includes(habitId);
  });
}

/**
 * Get insights related to a goal
 */
export async function getInsightsForGoal(goalId: string): Promise<Insight[]> {
  const allInsights = await getAllInsights();
  
  return allInsights.filter(insight => {
    const relatedGoals = insight.relatedGoalIds as string[] | null;
    return relatedGoals?.includes(goalId);
  });
}

/**
 * Get top insight for today
 */
export async function getTodayTopInsight(): Promise<Insight | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select()
    .from(insights)
    .where(
      and(
        gte(insights.createdAt, today),
        eq(insights.isDismissed, false)
      )
    )
    .orderBy(desc(insights.priority), desc(insights.confidence))
    .limit(1);

  return result[0] || null;
}

/**
 * Get insight statistics
 */
export async function getInsightStats(): Promise<{
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  avgConfidence: number;
}> {
  const allInsights = await getAllInsights();
  const unreadInsights = await getUnreadInsights();

  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let totalConfidence = 0;

  allInsights.forEach(insight => {
    byType[insight.type] = (byType[insight.type] || 0) + 1;
    byPriority[insight.priority] = (byPriority[insight.priority] || 0) + 1;
    totalConfidence += insight.confidence;
  });

  return {
    total: allInsights.length,
    unread: unreadInsights.length,
    byType,
    byPriority,
    avgConfidence: allInsights.length > 0
      ? Math.round(totalConfidence / allInsights.length)
      : 0,
  };
}

/**
 * Check if similar insight exists (to avoid duplicates)
 */
export async function hasSimilarInsight(
  type: Insight['type'],
  title: string,
  hoursBack: number = 24
): Promise<boolean> {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const similar = await db
    .select()
    .from(insights)
    .where(
      and(
        eq(insights.type, type),
        eq(insights.title, title),
        gte(insights.createdAt, cutoff)
      )
    )
    .limit(1);

  return similar.length > 0;
}
