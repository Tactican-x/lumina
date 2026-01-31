/**
 * Correlation Analysis Engine
 * 
 * Analyzes relationships between habits and performance outcomes.
 * Uses statistical methods to identify which habits have the most impact.
 */

import { 
  calculatePearsonCorrelation, 
  calculatePointBiserialCorrelation,
  CorrelationResult 
} from '../statistics/pearson';
import { formatDateKey, getLastNDays } from '@/utils/date';

// ==========================================
// TYPES
// ==========================================

export interface HabitCorrelation {
  habitId: string;
  habitName: string;
  correlation: number;           // Pearson's r (-1 to 1)
  pValue: number;
  confidence: number;            // 0-100
  significance: 'high' | 'medium' | 'low' | 'none';
  impact: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  sampleSize: number;
  description: string;
  scientificExplanation: string;
}

export interface CorrelationMatrix {
  habits: string[];
  matrix: number[][];            // correlation between each pair
  strongPairs: {
    habit1: string;
    habit2: string;
    correlation: number;
  }[];
}

export interface PerformanceFactors {
  habitCompletionRate: number;   // Impact of habit completion
  sleepQuality: number;          // Impact of sleep
  taskLoad: number;              // Impact of task count
  streakLength: number;          // Impact of maintaining streaks
  timeOfDay: number;             // Impact of time
}

export interface HabitCompletionRecord {
  habitId: string;
  habitName: string;
  date: string;
  completed: boolean;
}

export interface DailyPerformance {
  date: string;
  score: number;                 // 0-100
  tasksCompleted: number;
  totalTasks: number;
  energyLevel: number;
}

// ==========================================
// HABIT-PERFORMANCE CORRELATION
// ==========================================

/**
 * Calculate correlation between a habit and daily performance
 */
export function calculateHabitPerformanceCorrelation(
  habitId: string,
  habitName: string,
  completions: HabitCompletionRecord[],
  performance: DailyPerformance[]
): HabitCorrelation {
  // Filter to only this habit's data
  const habitData = completions.filter(c => c.habitId === habitId);
  
  // Create lookup for quick access
  const completionByDate: Record<string, boolean> = {};
  for (const c of habitData) {
    completionByDate[c.date] = c.completed;
  }

  // Align data - only use days where we have both habit and performance data
  const alignedData: { completed: boolean; score: number }[] = [];
  
  for (const p of performance) {
    if (completionByDate[p.date] !== undefined) {
      alignedData.push({
        completed: completionByDate[p.date],
        score: p.score,
      });
    }
  }

  // Need minimum sample size
  if (alignedData.length < 7) {
    return {
      habitId,
      habitName,
      correlation: 0,
      pValue: 1,
      confidence: 0,
      significance: 'none',
      impact: 'neutral',
      sampleSize: alignedData.length,
      description: 'Not enough data yet. Keep tracking for more insights!',
      scientificExplanation: 'Need at least 7 days of data for meaningful correlation analysis.',
    };
  }

  // Calculate correlation
  const binaryValues = alignedData.map(d => d.completed);
  const scores = alignedData.map(d => d.score);
  
  const result = calculatePointBiserialCorrelation(binaryValues, scores);

  // Determine significance level
  let significance: 'high' | 'medium' | 'low' | 'none';
  if (result.pValue < 0.01 && Math.abs(result.coefficient) > 0.5) {
    significance = 'high';
  } else if (result.pValue < 0.05 && Math.abs(result.coefficient) > 0.3) {
    significance = 'medium';
  } else if (result.pValue < 0.1 && Math.abs(result.coefficient) > 0.2) {
    significance = 'low';
  } else {
    significance = 'none';
  }

  // Determine impact category
  let impact: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  if (result.coefficient >= 0.6) impact = 'very_positive';
  else if (result.coefficient >= 0.3) impact = 'positive';
  else if (result.coefficient >= -0.3) impact = 'neutral';
  else if (result.coefficient >= -0.6) impact = 'negative';
  else impact = 'very_negative';

  // Generate description
  const description = generateCorrelationDescription(
    habitName, 
    result.coefficient, 
    significance
  );

  // Generate scientific explanation
  const scientificExplanation = generateScientificExplanation(
    habitName,
    result.coefficient,
    impact
  );

  return {
    habitId,
    habitName,
    correlation: result.coefficient,
    pValue: result.pValue,
    confidence: result.confidence,
    significance,
    impact,
    sampleSize: alignedData.length,
    description,
    scientificExplanation,
  };
}

/**
 * Calculate correlations for all habits
 */
export function calculateAllHabitCorrelations(
  completions: HabitCompletionRecord[],
  performance: DailyPerformance[]
): HabitCorrelation[] {
  // Get unique habits
  const habitMap = new Map<string, string>();
  for (const c of completions) {
    habitMap.set(c.habitId, c.habitName);
  }

  // Calculate correlation for each habit
  const correlations: HabitCorrelation[] = [];
  
  for (const [habitId, habitName] of habitMap) {
    const correlation = calculateHabitPerformanceCorrelation(
      habitId,
      habitName,
      completions,
      performance
    );
    correlations.push(correlation);
  }

  // Sort by absolute correlation (most impactful first)
  correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return correlations;
}

/**
 * Find habits with high positive impact (r > 0.5)
 */
export function findHighImpactHabits(
  correlations: HabitCorrelation[]
): HabitCorrelation[] {
  return correlations.filter(
    c => c.correlation > 0.5 && c.significance !== 'none'
  );
}

/**
 * Find habits with negative impact (might need reconsidering)
 */
export function findNegativeImpactHabits(
  correlations: HabitCorrelation[]
): HabitCorrelation[] {
  return correlations.filter(
    c => c.correlation < -0.3 && c.significance !== 'none'
  );
}

// ==========================================
// INTER-HABIT CORRELATIONS
// ==========================================

/**
 * Calculate correlation matrix between habits
 * (Do habits that are done together lead to better outcomes?)
 */
export function calculateHabitCorrelationMatrix(
  completions: HabitCompletionRecord[]
): CorrelationMatrix {
  // Get unique habits
  const habits = [...new Set(completions.map(c => c.habitId))];
  
  if (habits.length < 2) {
    return {
      habits,
      matrix: [[1]],
      strongPairs: [],
    };
  }

  // Build completion matrix by date
  const dates = [...new Set(completions.map(c => c.date))].sort();
  
  const completionsByHabit: Record<string, Record<string, boolean>> = {};
  for (const habit of habits) {
    completionsByHabit[habit] = {};
    for (const date of dates) {
      completionsByHabit[habit][date] = false;
    }
  }

  for (const c of completions) {
    completionsByHabit[c.habitId][c.date] = c.completed;
  }

  // Calculate correlation between each pair
  const matrix: number[][] = [];
  const strongPairs: { habit1: string; habit2: string; correlation: number }[] = [];

  for (let i = 0; i < habits.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < habits.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j < i) {
        // Already calculated
        matrix[i][j] = matrix[j][i];
      } else {
        // Calculate correlation
        const habit1Data = dates.map(d => completionsByHabit[habits[i]][d] ? 1 : 0);
        const habit2Data = dates.map(d => completionsByHabit[habits[j]][d] ? 1 : 0);
        
        const result = calculatePearsonCorrelation(habit1Data, habit2Data);
        matrix[i][j] = result.coefficient;

        // Track strong pairs
        if (Math.abs(result.coefficient) > 0.6 && result.pValue < 0.05) {
          strongPairs.push({
            habit1: habits[i],
            habit2: habits[j],
            correlation: result.coefficient,
          });
        }
      }
    }
  }

  // Sort pairs by correlation strength
  strongPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return {
    habits,
    matrix,
    strongPairs,
  };
}

// ==========================================
// PERFORMANCE FACTOR ANALYSIS
// ==========================================

/**
 * Analyze which factors most impact performance
 */
export function analyzePerformanceFactors(
  completions: HabitCompletionRecord[],
  performance: DailyPerformance[],
  energyLogs?: { date: string; score: number }[]
): PerformanceFactors {
  const performanceScores = performance.map(p => p.score);
  
  // Factor 1: Habit completion rate
  const habitCompletionRates: number[] = [];
  for (const p of performance) {
    const dayCompletions = completions.filter(c => c.date === p.date);
    const completed = dayCompletions.filter(c => c.completed).length;
    const total = dayCompletions.length || 1;
    habitCompletionRates.push((completed / total) * 100);
  }
  
  const habitCorr = habitCompletionRates.length >= 7
    ? calculatePearsonCorrelation(habitCompletionRates, performanceScores)
    : { coefficient: 0 };

  // Factor 2: Task load (inverse - more tasks might hurt performance)
  const taskLoads = performance.map(p => p.totalTasks);
  const taskCorr = taskLoads.length >= 7
    ? calculatePearsonCorrelation(taskLoads, performanceScores)
    : { coefficient: 0 };

  // Factor 3: Task completion ratio
  const taskCompletionRatios = performance.map(p => 
    p.totalTasks > 0 ? (p.tasksCompleted / p.totalTasks) * 100 : 50
  );
  const ratioCorr = taskCompletionRatios.length >= 7
    ? calculatePearsonCorrelation(taskCompletionRatios, performanceScores)
    : { coefficient: 0 };

  // Factor 4: Energy level
  let energyCorr = { coefficient: 0 };
  if (energyLogs && energyLogs.length >= 7) {
    const energyByDate = new Map(energyLogs.map(e => [e.date, e.score]));
    const alignedEnergy: number[] = [];
    const alignedPerf: number[] = [];
    
    for (const p of performance) {
      if (energyByDate.has(p.date)) {
        alignedEnergy.push(energyByDate.get(p.date)!);
        alignedPerf.push(p.score);
      }
    }
    
    if (alignedEnergy.length >= 7) {
      energyCorr = calculatePearsonCorrelation(alignedEnergy, alignedPerf);
    }
  }

  return {
    habitCompletionRate: Math.round(habitCorr.coefficient * 100),
    sleepQuality: 0, // Would need sleep data
    taskLoad: Math.round(taskCorr.coefficient * 100),
    streakLength: Math.round(ratioCorr.coefficient * 100),
    timeOfDay: 0, // Would need more detailed time analysis
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function generateCorrelationDescription(
  habitName: string,
  correlation: number,
  significance: 'high' | 'medium' | 'low' | 'none'
): string {
  const absCorr = Math.abs(correlation);
  const direction = correlation >= 0 ? 'positively' : 'negatively';
  
  if (significance === 'none') {
    return `${habitName} doesn't show a clear pattern with your performance yet.`;
  }

  if (absCorr >= 0.7) {
    return `${habitName} is strongly ${direction} linked to your performance. ` +
      `Days when you ${correlation >= 0 ? 'complete' : 'skip'} this habit tend to be significantly ${correlation >= 0 ? 'better' : 'worse'}.`;
  }
  
  if (absCorr >= 0.4) {
    return `${habitName} has a moderate ${direction} relationship with your performance. ` +
      `This habit ${correlation >= 0 ? 'helps boost' : 'may be interfering with'} your daily output.`;
  }
  
  return `${habitName} shows a slight ${direction} connection to performance, ` +
    `but the relationship isn't strong enough to be certain.`;
}

function generateScientificExplanation(
  habitName: string,
  correlation: number,
  impact: string
): string {
  const lowerName = habitName.toLowerCase();
  
  // Match common habit types to scientific explanations
  if (lowerName.includes('meditat') || lowerName.includes('mindful')) {
    return 'Meditation increases prefrontal cortex activity and reduces amygdala reactivity, ' +
      'improving focus and emotional regulation throughout the day.';
  }
  
  if (lowerName.includes('exercis') || lowerName.includes('workout') || lowerName.includes('gym')) {
    return 'Exercise triggers BDNF (brain-derived neurotrophic factor) release, ' +
      'which enhances neuroplasticity, memory formation, and cognitive function.';
  }
  
  if (lowerName.includes('sleep') || lowerName.includes('bed')) {
    return 'Quality sleep consolidates memories and clears metabolic waste from the brain. ' +
      'Sleep deprivation impairs prefrontal cortex function by up to 40%.';
  }
  
  if (lowerName.includes('read')) {
    return 'Reading activates multiple brain regions simultaneously, ' +
      'improving neural connectivity and cognitive reserve over time.';
  }
  
  if (lowerName.includes('journal') || lowerName.includes('writ')) {
    return 'Expressive writing reduces cognitive load by externalizing thoughts, ' +
      'freeing working memory for other tasks.';
  }
  
  if (lowerName.includes('water') || lowerName.includes('hydrat')) {
    return 'Even mild dehydration (1-2%) impairs cognitive performance. ' +
      'Proper hydration is essential for optimal brain function.';
  }
  
  // Generic explanation based on correlation direction
  if (correlation > 0.3) {
    return 'This habit appears to create positive conditions for high performance. ' +
      'Consistent execution builds momentum and reinforces productive neural pathways.';
  }
  
  if (correlation < -0.3) {
    return 'This habit may be consuming time or energy that could be better allocated. ' +
      'Consider adjusting timing, duration, or whether it still serves your goals.';
  }
  
  return 'The relationship between this habit and performance is not yet clear. ' +
    'Continue tracking for more data.';
}

/**
 * Get top insights from correlation analysis
 */
export function getCorrelationInsights(
  correlations: HabitCorrelation[]
): string[] {
  const insights: string[] = [];
  
  const highImpact = findHighImpactHabits(correlations);
  const negativeImpact = findNegativeImpactHabits(correlations);
  
  if (highImpact.length > 0) {
    const top = highImpact[0];
    insights.push(
      `${top.habitName} has a ${Math.round(top.correlation * 100)}% positive correlation with your performance. Keep it up!`
    );
  }
  
  if (highImpact.length > 1) {
    const names = highImpact.slice(0, 3).map(h => h.habitName).join(', ');
    insights.push(`Your high-impact habits are: ${names}`);
  }
  
  if (negativeImpact.length > 0) {
    const worst = negativeImpact[0];
    insights.push(
      `${worst.habitName} shows a negative correlation. Consider adjusting when or how you do this.`
    );
  }
  
  return insights;
}
