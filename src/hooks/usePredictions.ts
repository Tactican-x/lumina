/**
 * usePredictions Hook
 * Hook for AI predictions and forecasting
 */

import { useCallback, useEffect, useState } from 'react';
import { useHabitStore, useGoalStore } from '@/stores';
import * as energyRepo from '@/db/repositories/energy';
import * as probability from '@/lib/statistics/probability';
import { formatDateKey } from '@/utils/date';

export interface DayPrediction {
  date: Date;
  dateKey: string;
  energyForecast: number;
  habitSuccessRate: number;
  productivityScore: number;
  risks: string[];
  opportunities: string[];
  confidence: number;
}

export interface BurnoutPrediction {
  riskLevel: number; // 0-100
  daysUntilRisk: number | null;
  trend: 'increasing' | 'stable' | 'decreasing';
  factors: {
    name: string;
    contribution: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }[];
  recommendations: string[];
}

export function usePredictions() {
  const [dailyPredictions, setDailyPredictions] = useState<DayPrediction[]>([]);
  const [burnoutPrediction, setBurnoutPrediction] = useState<BurnoutPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const habits = useHabitStore(state => state.habits);
  const goals = useGoalStore(state => state.goals);

  const generatePredictions = useCallback(async () => {
    setIsLoading(true);

    try {
      // Generate 3-day forecast
      const predictions: DayPrediction[] = [];
      const energyByHour = await energyRepo.getEnergyByHour(30);
      const peakHours = await energyRepo.getPeakEnergyHours(30);

      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayOfWeek = date.getDay();

        // Calculate average energy for this day
        const avgEnergy = energyByHour.length > 0
          ? Math.round(energyByHour.reduce((sum, h) => sum + h.avgScore, 0) / energyByHour.length)
          : 60;

        // Adjust for day of week (weekends slightly different)
        const dayAdjustment = (dayOfWeek === 0 || dayOfWeek === 6) ? -5 : 0;
        const energyForecast = Math.max(20, Math.min(100, avgEnergy + dayAdjustment + (Math.random() * 10 - 5)));

        // Calculate habit success rate based on historical data
        const habitSuccessRates = habits.map(h => h.completionRate);
        const avgHabitSuccess = habitSuccessRates.length > 0
          ? Math.round(habitSuccessRates.reduce((a, b) => a + b, 0) / habitSuccessRates.length)
          : 70;

        // Productivity score (weighted average)
        const productivityScore = Math.round(energyForecast * 0.4 + avgHabitSuccess * 0.6);

        // Identify risks
        const risks: string[] = [];
        if (energyForecast < 50) risks.push('Low energy expected');
        if (habits.filter(h => h.streak.currentStreak > 7 && !h.completedToday).length > 0) {
          risks.push('Long streaks at risk');
        }
        if (dayOfWeek === 1) risks.push('Monday blues possible');

        // Identify opportunities
        const opportunities: string[] = [];
        if (energyForecast >= 75) opportunities.push('High energy day - tackle hard tasks');
        if (peakHours.includes(10) || peakHours.includes(11)) {
          opportunities.push('Strong late morning window');
        }

        // Confidence decreases for future days
        const confidence = Math.max(50, 90 - i * 15);

        predictions.push({
          date,
          dateKey: formatDateKey(date),
          energyForecast,
          habitSuccessRate: avgHabitSuccess,
          productivityScore,
          risks,
          opportunities,
          confidence,
        });
      }

      setDailyPredictions(predictions);

      // Generate burnout prediction
      const trend = await energyRepo.getEnergyTrend(14);
      const streaksAtRisk = habits.filter(
        h => h.streak.currentStreak > 0 && !h.completedToday
      ).length;

      const burnoutResult = probability.calculateBurnoutProbability({
        currentLoad: streaksAtRisk / Math.max(1, habits.length),
        baselineLoad: 0.3,
        restDaysLast2Weeks: 3, // TODO: Calculate from actual data
        sleepQualityTrend: trend.direction === 'up' ? 0.5 : trend.direction === 'down' ? -0.5 : 0,
        taskCompletionTrend: 0,
        missedHabitsLastWeek: habits.filter(h => h.completionRate < 50).length,
        totalHabitsLastWeek: habits.length * 7,
      });

      const burnout: BurnoutPrediction = {
        riskLevel: burnoutResult.probability,
        daysUntilRisk: burnoutResult.probability > 70 ? 3 : burnoutResult.probability > 50 ? 7 : null,
        trend: trend.direction === 'down' ? 'increasing' : trend.direction === 'up' ? 'decreasing' : 'stable',
        factors: burnoutResult.factors.map(f => ({
          name: f.name,
          contribution: Math.round(f.weight * 100),
          trend: f.impact === 'positive' ? 'decreasing' : f.impact === 'negative' ? 'increasing' : 'stable',
        })),
        recommendations: burnoutResult.probability > 60
          ? [
              'Schedule a recovery day within 48 hours',
              'Reduce task load by 20%',
              'Prioritize sleep this week',
            ]
          : burnoutResult.probability > 40
          ? [
              'Consider lighter tasks tomorrow',
              'Take breaks between focused sessions',
            ]
          : [],
      };

      setBurnoutPrediction(burnout);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Prediction generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [habits, goals]);

  // Auto-generate on mount and when data changes
  useEffect(() => {
    generatePredictions();
  }, [habits.length, goals.length]);

  // Get today's prediction
  const getTodayPrediction = useCallback((): DayPrediction | null => {
    const today = formatDateKey(new Date());
    return dailyPredictions.find(p => p.dateKey === today) || null;
  }, [dailyPredictions]);

  // Get tomorrow's prediction
  const getTomorrowPrediction = useCallback((): DayPrediction | null => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = formatDateKey(tomorrow);
    return dailyPredictions.find(p => p.dateKey === tomorrowKey) || null;
  }, [dailyPredictions]);

  return {
    dailyPredictions,
    burnoutPrediction,
    isLoading,
    lastUpdated,
    refresh: generatePredictions,
    getTodayPrediction,
    getTomorrowPrediction,
    isBurnoutRisk: burnoutPrediction ? burnoutPrediction.riskLevel > 60 : false,
  };
}

/**
 * Hook for habit success prediction
 */
export function useHabitPrediction(habitId: string) {
  const habits = useHabitStore(state => state.habits);
  const habit = habits.find(h => h.id === habitId);

  if (!habit) {
    return {
      willCompleteToday: 50,
      streakSurvival: 50,
      confidence: 0,
    };
  }

  // Simple prediction based on historical data
  const willCompleteToday = Math.min(95, habit.completionRate + (habit.completedToday ? 50 : 0));
  
  const streakSurvival = habit.streak.currentStreak > 0
    ? Math.min(95, 60 + habit.streak.currentStreak * 2)
    : habit.completionRate;

  return {
    willCompleteToday,
    streakSurvival,
    confidence: Math.min(90, habit.completionRate),
  };
}

/**
 * Hook for goal success prediction
 */
export function useGoalPrediction(goalId: string) {
  const goals = useGoalStore(state => state.goals);
  const goal = goals.find(g => g.id === goalId);

  if (!goal) {
    return {
      successProbability: 50,
      projectedCompletion: null,
      confidence: 0,
    };
  }

  // Calculate based on current progress and momentum
  let successProbability = 50;
  
  if (goal.momentum === 'accelerating') successProbability += 20;
  else if (goal.momentum === 'slowing') successProbability -= 15;
  else if (goal.momentum === 'stalled') successProbability -= 30;

  if (goal.isOnTrack) successProbability += 15;
  else successProbability -= 20;

  successProbability += (goal.progressPercentage / 5); // Add 1% per 5% progress

  successProbability = Math.max(5, Math.min(95, successProbability));

  // Project completion date
  let projectedCompletion: Date | null = null;
  if (goal.targetValue && goal.progressPercentage < 100) {
    const daysToComplete = Math.ceil(
      (100 - goal.progressPercentage) / Math.max(1, goal.progressPercentage / 30)
    );
    projectedCompletion = new Date();
    projectedCompletion.setDate(projectedCompletion.getDate() + daysToComplete);
  }

  return {
    successProbability,
    projectedCompletion,
    confidence: Math.min(85, goal.progressPercentage + 30),
  };
}
