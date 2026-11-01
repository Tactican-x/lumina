import type { Insight } from '@/types';
import type { InsightFeedbackMap, InsightShownMap } from './insightFeedback';

export type InsightPersonalizationContext = {
  now?: number;

  // Energy
  energyScore?: number; // 0..100
  energyPhase?: string;

  // Habits
  dueHabitIds?: string[]; // habits pending today
  streakRiskHabitIds?: string[]; // streak>0 and not completed today

  // Tasks (aggregates + optional ID sets)
  openTaskCount?: number; // pending + in_progress total (best effort)
  todayTaskCount?: number; // open tasks scheduled/for today (from your useTasks.todayTasks)
  overdueTaskCount?: number;

  urgentTaskCount?: number; // priority === 'urgent'
  highTaskCount?: number; // priority === 'high'

  highEnergyOpenTaskCount?: number; // energyRequired === 'high'
  lowEnergyOpenTaskCount?: number; // energyRequired === 'low'

  todayTaskIds?: string[];
  overdueTaskIds?: string[];

  openGoalIds?: string[]; // goals that have open tasks
};

const priorityScore: Record<Insight['priority'], number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function createdAtMs(insight: Insight) {
  const d = insight.createdAt instanceof Date ? insight.createdAt : new Date(insight.createdAt as any);
  const t = d.getTime();
  return Number.isFinite(t) ? t : Date.now();
}

function intersects(a: string[] | undefined, setB: Set<string>) {
  if (!a || a.length === 0 || setB.size === 0) return false;
  for (const id of a) if (setB.has(id)) return true;
  return false;
}

function extractTaskId(payload: Record<string, unknown> | undefined): string | undefined {
  if (!payload) return undefined;
  const v = payload['taskId'];
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return undefined;
}

export function scoreInsight(
  insight: Insight,
  ctx: Required<Pick<InsightPersonalizationContext, 'now'>> & InsightPersonalizationContext,
  feedbackMap: InsightFeedbackMap,
  shownMap: InsightShownMap
) {
  const now = ctx.now;

  const fb = feedbackMap[insight.id];
  const shown = shownMap[insight.id];

  const dueSet = new Set(ctx.dueHabitIds ?? []);
  const riskSet = new Set(ctx.streakRiskHabitIds ?? []);

  const todayTaskSet = new Set(ctx.todayTaskIds ?? []);
  const overdueTaskSet = new Set(ctx.overdueTaskIds ?? []);

  const openGoalSet = new Set(ctx.openGoalIds ?? []);

  const conf01 = clamp01((insight.confidence ?? 0) / 100);

  // --- Base score (priority + confidence + recency + unread) ---
  let score = 0;

  score += 1.4 * priorityScore[insight.priority];
  score += 1.2 * conf01;

  // Recency decay (~7d half-life-ish)
  const ageDays = (now - createdAtMs(insight)) / (1000 * 60 * 60 * 24);
  const recency = Math.exp(-ageDays / 7);
  score += 1.0 * recency;

  if (!insight.isRead) score += 1.15;
  if (insight.isRead) score -= 0.15;

  // Actionability
  if (insight.actionLabel || insight.actionType) score += 0.35;

  // --- Habit relevance (strong) ---
  const relatesToDueHabit = intersects(insight.relatedHabitIds, dueSet);
  const relatesToRiskHabit = intersects(insight.relatedHabitIds, riskSet);
  if (relatesToDueHabit) score += 0.9;
  if (relatesToRiskHabit) score += 1.2;

  // Special-case: if a warning is explicitly â€œstreak_breakâ€, and we have streak risk, boost
  if (insight.type === 'warning') {
    const riskType = (insight as any)?.warning?.riskType as string | undefined;
    if (riskType === 'streak_break' && (ctx.streakRiskHabitIds?.length ?? 0) > 0) score += 1.0;
  }

  // --- Task pressure relevance (overdue/urgent) ---
  const openTaskCount = ctx.openTaskCount ?? 0;
  const todayTaskCount = ctx.todayTaskCount ?? 0;
  const overdueTaskCount = ctx.overdueTaskCount ?? 0;
  const urgentTaskCount = ctx.urgentTaskCount ?? 0;
  const highTaskCount = ctx.highTaskCount ?? 0;

  if (openTaskCount >= 6 && (insight.type === 'warning' || insight.type === 'optimization')) score += 0.35;
  if (todayTaskCount >= 4 && (insight.type === 'optimization' || insight.type === 'warning')) score += 0.35;

  if (overdueTaskCount > 0 && (insight.type === 'warning' || insight.type === 'optimization')) score += 1.1;
  if (urgentTaskCount > 0 && (insight.type === 'warning' || insight.type === 'optimization')) score += 0.9;
  if (highTaskCount > 0 && (insight.type === 'optimization' || insight.type === 'prediction')) score += 0.25;

  // Special-case: if a warning is explicitly â€œoverloadâ€ and you have task pressure
  if (insight.type === 'warning') {
    const riskType = (insight as any)?.warning?.riskType as string | undefined;
    if (riskType === 'overload' && (openTaskCount > 0 || overdueTaskCount > 0)) score += 0.8;
  }

  // If insight is a task action and matches overdue/today task IDs, boost hard
  if (insight.actionType === 'task') {
    const taskId = extractTaskId(insight.actionPayload);
    if (taskId && overdueTaskSet.has(taskId)) score += 1.6;
    else if (taskId && todayTaskSet.has(taskId)) score += 1.0;
    else score += 0.4;
  }

  // Goal linkage: if insight relates to a goal that has open tasks, boost
  if (intersects(insight.relatedGoalIds, openGoalSet)) score += 0.6;

  // --- Energy x tasks mismatch (simple but effective) ---
  const energy = ctx.energyScore ?? 0;
  const highEnergyOpen = ctx.highEnergyOpenTaskCount ?? 0;

  // Low energy + many high-energy tasks => optimization/warning is more relevant
  if (energy > 0 && energy <= 40 && highEnergyOpen > 0) {
    if (insight.type === 'optimization' || insight.type === 'warning') score += 0.7;
  }

  // High energy + urgent/high tasks => prediction/optimization a bit more relevant
  if (energy >= 75 && (urgentTaskCount > 0 || highTaskCount > 0)) {
    if (insight.type === 'optimization' || insight.type === 'prediction') score += 0.25;
  }

  // --- Feedback loop ---
  if (fb?.helpful === 1) score += 0.8;
  if (fb?.helpful === -1) score -= 1.2;

  // --- Anti-repeat ---
  const shownCount = shown?.shownCount7d ?? 0;
  if (shownCount > 0) score -= Math.min(1.0, 0.15 * shownCount);

  if (shown?.lastShownAt) {
    const mins = (now - shown.lastShownAt) / (1000 * 60);
    if (mins < 60) score -= 0.9;
    else if (mins < 6 * 60) score -= 0.4;
  }

  return score;
}

export function rankInsights(
  insights: Insight[],
  ctx: InsightPersonalizationContext,
  feedbackMap: InsightFeedbackMap,
  shownMap: InsightShownMap
) {
  const fullCtx = { now: ctx.now ?? Date.now(), ...ctx };

  return [...insights].sort((a, b) => {
    const sb = scoreInsight(b, fullCtx, feedbackMap, shownMap);
    const sa = scoreInsight(a, fullCtx, feedbackMap, shownMap);
    if (sb !== sa) return sb - sa;

    const p = priorityScore[b.priority] - priorityScore[a.priority];
    if (p !== 0) return p;
    return createdAtMs(b) - createdAtMs(a);
  });
}
