/**
 * Insight Lifecycle Manager
 *
 * Handles expiry, cleanup, semantic dedup, and feedback-driven suppression.
 * Called from the daily runner and optionally on app launch.
 */

import { and, eq, lt, sql, inArray, desc, gte } from 'drizzle-orm';
import { db } from '@/db/database';
import { insights } from '@/db/schema';
import { getInsightFeedbackMap, type InsightFeedbackMap } from './insightFeedback';

// ==========================================
// EXPIRY RULES
// ==========================================

/** Default TTL in hours by insight type */
const DEFAULT_TTL: Record<string, number> = {
  prediction: 36,
  optimization: 18,
  warning: 72,
  achievement: 168,
  correlation: 168,
  pattern: 168,
};

const FALLBACK_TTL = 168; // 7 days

/**
 * Calculate expiry timestamp for an insight
 */
export function calculateExpiresAt(type: string, createdAt: Date): Date {
  const ttlHours = DEFAULT_TTL[type] ?? FALLBACK_TTL;
  const expires = new Date(createdAt.getTime());
  expires.setHours(expires.getHours() + ttlHours);
  return expires;
}

// ==========================================
// CLEANUP
// ==========================================

/**
 * Run on app launch and after insight generation.
 * - Auto-dismiss expired insights
 * - Archive old read insights (> 14 days)
 * - Hard-delete dismissed insights older than 30 days
 * - Cap total active insights at maxActive
 */
export async function cleanupInsights(options?: {
  maxActive?: number;
  archiveAfterDays?: number;
  deleteAfterDays?: number;
}): Promise<{ expired: number; archived: number; deleted: number }> {
  const maxActive = options?.maxActive ?? 50;
  const archiveAfterDays = options?.archiveAfterDays ?? 14;
  const deleteAfterDays = options?.deleteAfterDays ?? 30;

  const now = new Date();
  let expired = 0;
  let archived = 0;
  let deleted = 0;

  try {
    // 1. Expire insights past their TTL
    const expiredRows = await db
      .select({ id: insights.id })
      .from(insights)
      .where(
        and(
          eq(insights.isDismissed, false),
          lt(insights.expiresAt, now)
        )
      );

    if (expiredRows.length > 0) {
      await db
        .update(insights)
        .set({ isDismissed: true })
        .where(
          inArray(
            insights.id,
            expiredRows.map(r => r.id)
          )
        );
      expired = expiredRows.length;
    }
  } catch {
    // expiresAt column may be null for old rows — skip gracefully
  }

  try {
    // 2. Auto-dismiss old read insights
    const archiveCutoff = new Date(
      now.getTime() - archiveAfterDays * 24 * 60 * 60 * 1000
    );
    const archivable = await db
      .select({ id: insights.id })
      .from(insights)
      .where(
        and(
          eq(insights.isRead, true),
          eq(insights.isDismissed, false),
          lt(insights.createdAt, archiveCutoff)
        )
      );

    if (archivable.length > 0) {
      await db
        .update(insights)
        .set({ isDismissed: true })
        .where(
          inArray(
            insights.id,
            archivable.map(r => r.id)
          )
        );
      archived = archivable.length;
    }
  } catch {
    // ignore
  }

  try {
    // 3. Hard-delete old dismissed insights
    const deleteCutoff = new Date(
      now.getTime() - deleteAfterDays * 24 * 60 * 60 * 1000
    );
    const deletable = await db
      .select({ id: insights.id })
      .from(insights)
      .where(
        and(
          eq(insights.isDismissed, true),
          lt(insights.createdAt, deleteCutoff)
        )
      );

    if (deletable.length > 0) {
      await db
        .delete(insights)
        .where(
          inArray(
            insights.id,
            deletable.map(r => r.id)
          )
        );
      deleted = deletable.length;
    }
  } catch {
    // ignore
  }

  try {
    // 4. Cap total active insights
    const activeInsights = await db
      .select({ id: insights.id, createdAt: insights.createdAt })
      .from(insights)
      .where(eq(insights.isDismissed, false))
      .orderBy(desc(insights.createdAt));

    if (activeInsights.length > maxActive) {
      const toRemove = activeInsights.slice(maxActive);
      await db
        .update(insights)
        .set({ isDismissed: true })
        .where(
          inArray(
            insights.id,
            toRemove.map(r => r.id)
          )
        );
      archived += toRemove.length;
    }
  } catch {
    // ignore
  }

  return { expired, archived, deleted };
}

// ==========================================
// SEMANTIC DEDUP
// ==========================================

/**
 * Extract a stable "semantic key" from an insight that stays
 * consistent even when the title template rotates.
 *
 * Strategy: type + related habit/goal IDs + core metric
 */
export function semanticKey(insight: {
  type: string;
  relatedHabitIds?: string[] | null;
  relatedGoalIds?: string[] | null;
  correlationValue?: number | null;
  title?: string;
}): string {
  const parts: string[] = [insight.type];

  if (insight.relatedHabitIds?.length) {
    parts.push('h:' + [...insight.relatedHabitIds].sort().join(','));
  }
  if (insight.relatedGoalIds?.length) {
    parts.push('g:' + [...insight.relatedGoalIds].sort().join(','));
  }

  if (insight.correlationValue != null) {
    const bucket = Math.round(insight.correlationValue * 10) / 10;
    parts.push('r:' + bucket.toFixed(1));
  }

  if (!insight.relatedHabitIds?.length && !insight.relatedGoalIds?.length) {
    const firstWord = (insight.title ?? '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase() ?? 'generic';
    parts.push('t:' + firstWord);
  }

  return parts.join('|');
}

/**
 * Check if a semantically similar insight already exists
 * within the given time window.
 */
export async function hasSemanticallySimular(
  insight: {
    type: string;
    relatedHabitIds?: string[] | null;
    relatedGoalIds?: string[] | null;
    correlationValue?: number | null;
    title?: string;
  },
  windowHours: number = 20
): Promise<boolean> {
  const key = semanticKey(insight);
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  try {
    const recent = await db
      .select()
      .from(insights)
      .where(
        and(
          eq(insights.type, insight.type),
          gte(insights.createdAt, cutoff),
          eq(insights.isDismissed, false)
        )
      );

    for (const existing of recent) {
      const existingKey = semanticKey({
        type: existing.type,
        relatedHabitIds: existing.relatedHabitIds as string[] | null,
        relatedGoalIds: existing.relatedGoalIds as string[] | null,
        correlationValue: existing.correlationValue,
        title: existing.title,
      });
      if (existingKey === key) return true;
    }
  } catch {
    // If schema doesn't have these columns yet, fall back to false
  }

  return false;
}

// ==========================================
// FEEDBACK-DRIVEN SUPPRESSION
// ==========================================

export interface SuppressionRules {
  suppressedTypes: Map<string, number>;
  suppressedHabitIds: Set<string>;
}

/**
 * Analyze feedback history to determine what to suppress.
 *
 * Rules:
 * - If 3+ insights of a type are marked "not helpful" → suppress that type
 * - If 2+ insights about a specific habit are "not helpful" → suppress that habit
 */
export async function getSuppressionRules(): Promise<SuppressionRules> {
  const feedbackMap = await getInsightFeedbackMap();

  const feedbackIds = Object.keys(feedbackMap);
  if (feedbackIds.length === 0) {
    return { suppressedTypes: new Map(), suppressedHabitIds: new Set() };
  }

  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentInsights = await db
      .select()
      .from(insights)
      .where(gte(insights.createdAt, cutoff));

    const typeNegCount = new Map<string, number>();
    const habitNegCount = new Map<string, number>();

    for (const ins of recentInsights) {
      const fb = feedbackMap[ins.id];
      if (!fb || fb.helpful !== -1) continue;

      typeNegCount.set(ins.type, (typeNegCount.get(ins.type) ?? 0) + 1);

      const habitIds = ins.relatedHabitIds as string[] | null;
      if (habitIds) {
        for (const hid of habitIds) {
          habitNegCount.set(hid, (habitNegCount.get(hid) ?? 0) + 1);
        }
      }
    }

    const suppressedTypes = new Map<string, number>();
    for (const [type, count] of typeNegCount) {
      if (count >= 3) suppressedTypes.set(type, count);
    }

    const suppressedHabitIds = new Set<string>();
    for (const [hid, count] of habitNegCount) {
      if (count >= 2) suppressedHabitIds.add(hid);
    }

    return { suppressedTypes, suppressedHabitIds };
  } catch {
    return { suppressedTypes: new Map(), suppressedHabitIds: new Set() };
  }
}

/**
 * Filter out insights that the user has repeatedly marked as not helpful.
 */
export function applySuppressionRules(
  insightList: Array<{ type: string; relatedHabitIds?: string[] | null; score: number }>,
  rules: SuppressionRules
): typeof insightList {
  return insightList.filter(ins => {
    if (rules.suppressedTypes.has(ins.type)) {
      ins.score -= 50;
      return ins.score > -20;
    }

    if (ins.relatedHabitIds?.length) {
      const allSuppressed = ins.relatedHabitIds.every(id =>
        rules.suppressedHabitIds.has(id)
      );
      if (allSuppressed) {
        ins.score -= 40;
        return ins.score > -10;
      }
    }

    return true;
  });
}