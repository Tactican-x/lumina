/**
 * Energy Repository
 * CRUD operations for energy logs and patterns
 */

import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { db, generateId } from '../database';
import { energyLogs, patterns, EnergyLog, NewEnergyLog, Pattern, NewPattern } from '../schema';
import { EnergyPhase } from '@/types';
import { getPhaseFromScore } from '@/constants/energyPhases';

// ==========================================
// ENERGY LOG CRUD
// ==========================================

/**
 * Log current energy level
 */
export async function logEnergy(
  score: number,
  factors?: EnergyLog['factors'],
  note?: string
): Promise<EnergyLog> {
  const id = generateId();
  const now = new Date();
  const phase = getPhaseFromScore(score);

  const log: NewEnergyLog = {
    id,
    timestamp: now,
    score,
    phase,
    factors,
    note,
  };

  await db.insert(energyLogs).values(log);

  const result = await db
    .select()
    .from(energyLogs)
    .where(eq(energyLogs.id, id))
    .limit(1);

  return result[0];
}

/**
 * Get recent energy logs
 */
export async function getRecentEnergyLogs(limit: number = 24): Promise<EnergyLog[]> {
  return await db
    .select()
    .from(energyLogs)
    .orderBy(desc(energyLogs.timestamp))
    .limit(limit);
}

/**
 * Get energy logs for date range
 */
export async function getEnergyLogsInRange(
  startDate: Date,
  endDate: Date
): Promise<EnergyLog[]> {
  return await db
    .select()
    .from(energyLogs)
    .where(
      and(
        gte(energyLogs.timestamp, startDate),
        lte(energyLogs.timestamp, endDate)
      )
    )
    .orderBy(energyLogs.timestamp);
}

/**
 * Get latest energy log
 */
export async function getLatestEnergyLog(): Promise<EnergyLog | null> {
  const result = await db
    .select()
    .from(energyLogs)
    .orderBy(desc(energyLogs.timestamp))
    .limit(1);

  return result[0] || null;
}

/**
 * Get current energy score (latest or estimated)
 */
export async function getCurrentEnergy(): Promise<{
  score: number;
  phase: EnergyPhase;
  isEstimated: boolean;
  lastLoggedAt: Date | null;
}> {
  const latest = await getLatestEnergyLog();

  if (latest) {
    const hoursSinceLog = (Date.now() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60);

    // If logged within last 2 hours, use that value
    if (hoursSinceLog < 2) {
      return {
        score: latest.score,
        phase: latest.phase as EnergyPhase,
        isEstimated: false,
        lastLoggedAt: new Date(latest.timestamp),
      };
    }
  }

  // Estimate based on time of day and historical patterns
  const estimatedScore = await estimateCurrentEnergy();
  
  return {
    score: estimatedScore,
    phase: getPhaseFromScore(estimatedScore),
    isEstimated: true,
    lastLoggedAt: latest ? new Date(latest.timestamp) : null,
  };
}

/**
 * Estimate current energy based on patterns
 */
async function estimateCurrentEnergy(): Promise<number> {
  const currentHour = new Date().getHours();
  const dayOfWeek = new Date().getDay();

  // Get historical averages for this hour/day
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const logs = await getEnergyLogsInRange(thirtyDaysAgo, new Date());

  // Filter to same hour and day of week
  const relevantLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate.getHours() === currentHour && logDate.getDay() === dayOfWeek;
  });

  if (relevantLogs.length > 0) {
    const avgScore = relevantLogs.reduce((sum, log) => sum + log.score, 0) / relevantLogs.length;
    return Math.round(avgScore);
  }

  // Fall back to time-based estimate
  if (currentHour >= 9 && currentHour <= 11) return 85;
  if (currentHour >= 14 && currentHour <= 15) return 55;
  if (currentHour >= 16 && currentHour <= 18) return 70;
  if (currentHour >= 21 || currentHour <= 6) return 35;
  return 60;
}

// ==========================================
// ENERGY ANALYTICS
// ==========================================

/**
 * Get average energy by hour of day
 */
export async function getEnergyByHour(days: number = 30): Promise<{
  hour: number;
  avgScore: number;
  sampleSize: number;
}[]> {
  const startDate = new Date(Date.now() - days * 86400000);
  const logs = await getEnergyLogsInRange(startDate, new Date());

  const byHour: Map<number, { total: number; count: number }> = new Map();

  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    const current = byHour.get(hour) || { total: 0, count: 0 };
    byHour.set(hour, {
      total: current.total + log.score,
      count: current.count + 1,
    });
  });

  const result: { hour: number; avgScore: number; sampleSize: number }[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const data = byHour.get(hour);
    result.push({
      hour,
      avgScore: data ? Math.round(data.total / data.count) : 50,
      sampleSize: data?.count || 0,
    });
  }

  return result;
}

/**
 * Get peak energy hours
 */
export async function getPeakEnergyHours(days: number = 30): Promise<number[]> {
  const byHour = await getEnergyByHour(days);
  
  // Find hours with above-average energy
  const avgEnergy = byHour.reduce((sum, h) => sum + h.avgScore, 0) / 24;
  const peakThreshold = avgEnergy * 1.1; // 10% above average

  return byHour
    .filter(h => h.avgScore >= peakThreshold && h.sampleSize >= 3)
    .map(h => h.hour)
    .sort((a, b) => a - b);
}

/**
 * Get energy trend
 */
export async function getEnergyTrend(days: number = 7): Promise<{
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
}> {
  const midPoint = Math.floor(days / 2);
  const now = new Date();
  
  const firstHalf = await getEnergyLogsInRange(
    new Date(Date.now() - days * 86400000),
    new Date(Date.now() - midPoint * 86400000)
  );
  
  const secondHalf = await getEnergyLogsInRange(
    new Date(Date.now() - midPoint * 86400000),
    now
  );

  const avgFirst = firstHalf.length > 0
    ? firstHalf.reduce((sum, l) => sum + l.score, 0) / firstHalf.length
    : 50;
    
  const avgSecond = secondHalf.length > 0
    ? secondHalf.reduce((sum, l) => sum + l.score, 0) / secondHalf.length
    : 50;

  const changePercent = avgFirst > 0
    ? Math.round(((avgSecond - avgFirst) / avgFirst) * 100)
    : 0;

  let direction: 'up' | 'down' | 'stable';
  if (changePercent > 5) direction = 'up';
  else if (changePercent < -5) direction = 'down';
  else direction = 'stable';

  return { direction, changePercent };
}

// ==========================================
// PATTERNS (Cached Analysis Results)
// ==========================================

/**
 * Save a detected pattern
 */
export async function savePattern(
  data: Omit<NewPattern, 'id' | 'createdAt'>
): Promise<Pattern> {
  const id = generateId();
  const now = new Date();

  const pattern: NewPattern = {
    id,
    ...data,
    createdAt: now,
  };

  await db.insert(patterns).values(pattern);

  const result = await db
    .select()
    .from(patterns)
    .where(eq(patterns.id, id))
    .limit(1);

  return result[0];
}

/**
 * Get valid patterns (not expired)
 */
export async function getValidPatterns(): Promise<Pattern[]> {
  const now = new Date();

  return await db
    .select()
    .from(patterns)
    .where(gte(patterns.validUntil, now))
    .orderBy(desc(patterns.strength));
}

/**
 * Get pattern by type
 */
export async function getPatternByType(type: string): Promise<Pattern | null> {
  const now = new Date();

  const result = await db
    .select()
    .from(patterns)
    .where(
      and(
        eq(patterns.type, type),
        gte(patterns.validUntil, now)
      )
    )
    .orderBy(desc(patterns.createdAt))
    .limit(1);

  return result[0] || null;
}

/**
 * Invalidate patterns (force re-analysis)
 */
export async function invalidatePatterns(type?: string): Promise<void> {
  if (type) {
    await db.delete(patterns).where(eq(patterns.type, type));
  } else {
    await db.delete(patterns);
  }
}
