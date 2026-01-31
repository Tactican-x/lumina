/**
 * Pattern Recognition Engine
 * 
 * Detects behavioral patterns in user data:
 * - Temporal patterns (best times, days)
 * - Behavioral sequences (habit chains)
 * - Performance correlations
 * - Anomalies and warning signs
 */

import { 
  descriptiveStats, 
  detectOutliers,
  normalize 
} from '../statistics';
import { 
  formatDateKey, 
  getLastNDays,
  getCurrentHour,
  getCurrentDayOfWeek 
} from '@/utils/date';

// ==========================================
// TYPES
// ==========================================

export interface TemporalPattern {
  type: 'hourly' | 'daily' | 'weekly';
  peakHours: number[];           // Best hours (0-23)
  peakDays: number[];            // Best days (0-6, Sunday=0)
  troughHours: number[];         // Worst hours
  troughDays: number[];          // Worst days
  strength: number;              // Pattern strength (0-100)
  confidence: number;            // Confidence in pattern (0-100)
  description: string;
}

export interface HabitChain {
  habitIds: string[];
  chainStrength: number;         // How often they occur together (0-100)
  averageGap: number;            // Average minutes between habits
  description: string;
}

export interface BehavioralPattern {
  id: string;
  name: string;
  type: 'success' | 'risk' | 'opportunity';
  description: string;
  strength: number;              // 0-100
  occurrences: number;
  impact: number;                // Estimated % impact on performance
  recommendations: string[];
  scientificBasis: string;
}

export interface AnomalyDetection {
  isAnomaly: boolean;
  type: 'performance_drop' | 'performance_spike' | 'habit_break' | 'overload';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedAction: string;
}

export interface CompletionData {
  date: string;
  hour: number;
  dayOfWeek: number;
  habitId: string;
  completed: boolean;
  performanceScore?: number;
}

export interface PerformanceData {
  date: string;
  hour: number;
  dayOfWeek: number;
  score: number;               // 0-100
  taskCount: number;
  completedCount: number;
}

// ==========================================
// TEMPORAL PATTERN DETECTION
// ==========================================

/**
 * Detect when user performs best (hours and days)
 */
export function detectTemporalPatterns(
  completionData: CompletionData[],
  performanceData: PerformanceData[]
): TemporalPattern {
  // Group by hour
  const hourlyScores: Record<number, number[]> = {};
  for (let h = 0; h < 24; h++) {
    hourlyScores[h] = [];
  }

  // Group by day
  const dailyScores: Record<number, number[]> = {};
  for (let d = 0; d < 7; d++) {
    dailyScores[d] = [];
  }

  // Calculate completion rates per hour and day
  for (const data of completionData) {
    const score = data.completed ? 100 : 0;
    hourlyScores[data.hour].push(score);
    dailyScores[data.dayOfWeek].push(score);
  }

  // Add performance scores
  for (const data of performanceData) {
    hourlyScores[data.hour].push(data.score);
    dailyScores[data.dayOfWeek].push(data.score);
  }

  // Calculate averages
  const hourlyAverages: { hour: number; avg: number; count: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const scores = hourlyScores[h];
    if (scores.length > 0) {
      hourlyAverages.push({
        hour: h,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      });
    }
  }

  const dailyAverages: { day: number; avg: number; count: number }[] = [];
  for (let d = 0; d < 7; d++) {
    const scores = dailyScores[d];
    if (scores.length > 0) {
      dailyAverages.push({
        day: d,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      });
    }
  }

  // Sort to find peaks and troughs
  const sortedHours = [...hourlyAverages].sort((a, b) => b.avg - a.avg);
  const sortedDays = [...dailyAverages].sort((a, b) => b.avg - a.avg);

  // Get top 3 and bottom 3
  const peakHours = sortedHours.slice(0, 3).map(h => h.hour);
  const troughHours = sortedHours.slice(-3).map(h => h.hour);
  const peakDays = sortedDays.slice(0, 3).map(d => d.day);
  const troughDays = sortedDays.slice(-3).map(d => d.day);

  // Calculate pattern strength (variance in averages)
  const hourAvgs = hourlyAverages.map(h => h.avg);
  const dayAvgs = dailyAverages.map(d => d.avg);
  
  const hourStats = descriptiveStats(hourAvgs);
  const dayStats = descriptiveStats(dayAvgs);

  // Higher variance = stronger pattern
  const hourStrength = Math.min(100, (hourStats.stdDev / (hourStats.mean || 1)) * 200);
  const dayStrength = Math.min(100, (dayStats.stdDev / (dayStats.mean || 1)) * 200);
  const strength = Math.round((hourStrength + dayStrength) / 2);

  // Confidence based on sample size
  const totalSamples = completionData.length + performanceData.length;
  const confidence = Math.min(100, Math.round(Math.log10(totalSamples + 1) * 40));

  // Generate description
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const peakDayNames = peakDays.map(d => dayNames[d]).join(', ');
  const peakHourRange = peakHours.length > 0 
    ? `${peakHours[0]}:00 - ${(peakHours[0] + 2) % 24}:00`
    : 'unknown';

  const description = `You perform best on ${peakDayNames} around ${peakHourRange}. ` +
    `Pattern strength: ${strength}%`;

  return {
    type: 'weekly',
    peakHours,
    peakDays,
    troughHours,
    troughDays,
    strength,
    confidence,
    description,
  };
}

// ==========================================
// HABIT CHAIN DETECTION
// ==========================================

/**
 * Detect habits that are commonly completed together
 */
export function detectHabitChains(
  completionData: CompletionData[]
): HabitChain[] {
  // Group completions by date
  const byDate: Record<string, CompletionData[]> = {};
  
  for (const data of completionData) {
    if (data.completed) {
      if (!byDate[data.date]) {
        byDate[data.date] = [];
      }
      byDate[data.date].push(data);
    }
  }

  // Find pairs that occur together
  const pairCounts: Record<string, number> = {};
  const habitCounts: Record<string, number> = {};
  
  for (const date in byDate) {
    const habits = byDate[date];
    
    // Sort by hour
    habits.sort((a, b) => a.hour - b.hour);
    
    // Count individual habits
    for (const h of habits) {
      habitCounts[h.habitId] = (habitCounts[h.habitId] || 0) + 1;
    }
    
    // Count consecutive pairs
    for (let i = 0; i < habits.length - 1; i++) {
      const pair = `${habits[i].habitId}|${habits[i + 1].habitId}`;
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    }
  }

  // Calculate chain strength
  const chains: HabitChain[] = [];
  const totalDays = Object.keys(byDate).length;

  for (const pair in pairCounts) {
    const [habit1, habit2] = pair.split('|');
    const pairCount = pairCounts[pair];
    
    // Chain strength = how often they occur together vs separately
    const habit1Count = habitCounts[habit1] || 0;
    const habit2Count = habitCounts[habit2] || 0;
    const minCount = Math.min(habit1Count, habit2Count);
    
    if (minCount > 0 && pairCount >= 3) { // At least 3 occurrences
      const chainStrength = Math.round((pairCount / minCount) * 100);
      
      chains.push({
        habitIds: [habit1, habit2],
        chainStrength: Math.min(100, chainStrength),
        averageGap: 60, // Would need timestamps to calculate actual gap
        description: `These habits are commonly done together (${chainStrength}% of the time)`,
      });
    }
  }

  // Sort by strength
  return chains.sort((a, b) => b.chainStrength - a.chainStrength);
}

// ==========================================
// BEHAVIORAL PATTERN ANALYSIS
// ==========================================

/**
 * Identify high-level behavioral patterns
 */
export function analyzeBehavioralPatterns(
  completionData: CompletionData[],
  performanceData: PerformanceData[]
): BehavioralPattern[] {
  const patterns: BehavioralPattern[] = [];
  
  // Pattern 1: Morning Momentum
  const morningCompletions = completionData.filter(
    d => d.completed && d.hour >= 5 && d.hour <= 9
  );
  const totalCompletions = completionData.filter(d => d.completed);
  
  if (morningCompletions.length > 10) {
    const morningRatio = morningCompletions.length / (totalCompletions.length || 1);
    
    if (morningRatio > 0.3) {
      patterns.push({
        id: 'morning_momentum',
        name: 'Morning Momentum',
        type: 'success',
        description: `You complete ${Math.round(morningRatio * 100)}% of your habits before 10 AM`,
        strength: Math.round(morningRatio * 100),
        occurrences: morningCompletions.length,
        impact: 25, // Estimated 25% boost to daily performance
        recommendations: [
          'Keep protecting your morning routine',
          'Consider adding one more high-impact habit to your morning',
        ],
        scientificBasis: 'Morning routines leverage peak cortisol levels and ' +
          'fresh willpower reserves, leading to higher completion rates.',
      });
    }
  }

  // Pattern 2: Weekend Warrior
  const weekendCompletions = completionData.filter(
    d => d.completed && (d.dayOfWeek === 0 || d.dayOfWeek === 6)
  );
  const weekdayCompletions = completionData.filter(
    d => d.completed && d.dayOfWeek >= 1 && d.dayOfWeek <= 5
  );
  
  const weekendRate = weekendCompletions.length / 
    (completionData.filter(d => d.dayOfWeek === 0 || d.dayOfWeek === 6).length || 1);
  const weekdayRate = weekdayCompletions.length / 
    (completionData.filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5).length || 1);
  
  if (weekendRate > weekdayRate * 1.2 && weekendCompletions.length > 5) {
    patterns.push({
      id: 'weekend_warrior',
      name: 'Weekend Warrior',
      type: 'opportunity',
      description: `Your weekend completion rate is ${Math.round((weekendRate / weekdayRate) * 100 - 100)}% higher than weekdays`,
      strength: Math.round(weekendRate * 100),
      occurrences: weekendCompletions.length,
      impact: 15,
      recommendations: [
        'Your weekday routines could use simplification',
        'Consider fewer, higher-impact habits on busy days',
      ],
      scientificBasis: 'Reduced cognitive load on weekends allows for better ' +
        'habit execution. This pattern suggests weekday optimization opportunities.',
    });
  } else if (weekdayRate > weekendRate * 1.2 && weekdayCompletions.length > 10) {
    patterns.push({
      id: 'weekday_warrior',
      name: 'Structured Success',
      type: 'success',
      description: 'You thrive with weekday structure',
      strength: Math.round(weekdayRate * 100),
      occurrences: weekdayCompletions.length,
      impact: 20,
      recommendations: [
        'Create more structure on weekends',
        'Set specific times for weekend habits',
      ],
      scientificBasis: 'External structure (work schedule) provides cues that ' +
        'trigger habit execution. Replicating this structure on weekends can help.',
    });
  }

  // Pattern 3: Consistency King/Queen
  const last30Days = getLastNDays(30);
  const completionsByDate: Record<string, number> = {};
  
  for (const day of last30Days) {
    completionsByDate[formatDateKey(day)] = 0;
  }
  
  for (const data of completionData) {
    if (data.completed && completionsByDate[data.date] !== undefined) {
      completionsByDate[data.date]++;
    }
  }
  
  const dailyCounts = Object.values(completionsByDate);
  const stats = descriptiveStats(dailyCounts);
  const consistency = stats.mean > 0 ? 1 - (stats.stdDev / stats.mean) : 0;
  
  if (consistency > 0.6 && stats.mean > 1) {
    patterns.push({
      id: 'consistency_king',
      name: 'Consistency Champion',
      type: 'success',
      description: `You maintain ${Math.round(consistency * 100)}% consistency in daily habits`,
      strength: Math.round(consistency * 100),
      occurrences: 30,
      impact: 35,
      recommendations: [
        'Your consistency is your superpower',
        'Consider gradually increasing habit difficulty',
      ],
      scientificBasis: 'Consistent behavior builds stronger neural pathways through ' +
        'long-term potentiation, making habits increasingly automatic.',
    });
  }

  // Pattern 4: Context Switching Cost
  const highVariabilityDays = dailyCounts.filter(c => c > stats.mean + stats.stdDev);
  
  if (highVariabilityDays.length >= 5) {
    patterns.push({
      id: 'context_switching',
      name: 'Burst Mode Tendency',
      type: 'opportunity',
      description: 'You tend to batch habits on certain days',
      strength: Math.round((highVariabilityDays.length / 30) * 100),
      occurrences: highVariabilityDays.length,
      impact: -10,
      recommendations: [
        'Spread habits more evenly across days',
        'High-load days may lead to burnout',
      ],
      scientificBasis: 'Context switching carries cognitive costs. Batching too many ' +
        'habits increases mental fatigue and reduces quality of execution.',
    });
  }

  return patterns;
}

// ==========================================
// ANOMALY DETECTION
// ==========================================

/**
 * Detect anomalies in recent behavior
 */
export function detectAnomalies(
  recentData: PerformanceData[],
  historicalData: PerformanceData[]
): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  
  if (recentData.length === 0 || historicalData.length < 7) {
    return anomalies;
  }

  // Calculate historical baseline
  const historicalScores = historicalData.map(d => d.score);
  const stats = descriptiveStats(historicalScores);
  
  // Check recent performance
  const recentScores = recentData.map(d => d.score);
  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

  // Performance drop detection
  if (recentAvg < stats.mean - 1.5 * stats.stdDev) {
    const dropPercent = Math.round(((stats.mean - recentAvg) / stats.mean) * 100);
    
    anomalies.push({
      isAnomaly: true,
      type: 'performance_drop',
      severity: dropPercent > 30 ? 'high' : dropPercent > 15 ? 'medium' : 'low',
      description: `Performance dropped ${dropPercent}% below your baseline`,
      suggestedAction: 'Consider taking a recovery day and reviewing your recent schedule',
    });
  }

  // Performance spike detection (unusually high)
  if (recentAvg > stats.mean + 2 * stats.stdDev) {
    anomalies.push({
      isAnomaly: true,
      type: 'performance_spike',
      severity: 'low',
      description: `You're performing significantly above your baseline!`,
      suggestedAction: 'Analyze what's different - this could reveal optimization opportunities',
    });
  }

  // Overload detection (too many tasks)
  const recentTaskCounts = recentData.map(d => d.taskCount);
  const historicalTaskCounts = historicalData.map(d => d.taskCount);
  const taskStats = descriptiveStats(historicalTaskCounts);
  const recentTaskAvg = recentTaskCounts.reduce((a, b) => a + b, 0) / recentTaskCounts.length;
  
  if (recentTaskAvg > taskStats.mean + 1.5 * taskStats.stdDev) {
    anomalies.push({
      isAnomaly: true,
      type: 'overload',
      severity: 'medium',
      description: `Task load is ${Math.round(((recentTaskAvg - taskStats.mean) / taskStats.mean) * 100)}% above normal`,
      suggestedAction: 'Prioritize ruthlessly and consider delegating or postponing non-essential tasks',
    });
  }

  return anomalies;
}

// ==========================================
// PATTERN SUMMARY
// ==========================================

/**
 * Generate a summary of all detected patterns
 */
export function generatePatternSummary(
  completionData: CompletionData[],
  performanceData: PerformanceData[]
): {
  temporalPattern: TemporalPattern;
  habitChains: HabitChain[];
  behavioralPatterns: BehavioralPattern[];
  anomalies: AnomalyDetection[];
  overallScore: number;
} {
  const temporalPattern = detectTemporalPatterns(completionData, performanceData);
  const habitChains = detectHabitChains(completionData);
  const behavioralPatterns = analyzeBehavioralPatterns(completionData, performanceData);
  
  // Split data for anomaly detection
  const sortedPerformance = [...performanceData].sort(
    (a, b) => a.date.localeCompare(b.date)
  );
  const recentData = sortedPerformance.slice(-7);
  const historicalData = sortedPerformance.slice(0, -7);
  const anomalies = detectAnomalies(recentData, historicalData);

  // Calculate overall pattern health score
  const successPatterns = behavioralPatterns.filter(p => p.type === 'success');
  const riskPatterns = behavioralPatterns.filter(p => p.type === 'risk');
  
  let overallScore = 50; // Start at neutral
  overallScore += successPatterns.reduce((sum, p) => sum + p.strength * 0.2, 0);
  overallScore -= riskPatterns.reduce((sum, p) => sum + p.strength * 0.2, 0);
  overallScore -= anomalies.filter(a => a.severity === 'high').length * 10;
  overallScore = Math.max(0, Math.min(100, Math.round(overallScore)));

  return {
    temporalPattern,
    habitChains,
    behavioralPatterns,
    anomalies,
    overallScore,
  };
}
