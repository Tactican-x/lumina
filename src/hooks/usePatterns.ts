/**
 * usePatterns Hook
 * Hook for pattern detection and analysis
 */

import { useCallback, useEffect, useState } from 'react';
import { useHabitStore } from '@/stores';
import * as intelligence from '@/lib/intelligence';
import * as habitRepo from '@/db/repositories/habits';
import { formatDateKey, getLastNDays } from '@/utils/date';

export interface DetectedPattern {
  id: string;
  type: 'time' | 'sequence' | 'correlation' | 'energy';
  name: string;
  description: string;
  strength: number; // 0-100
  confidence: number; // 0-100
  data: Record<string, unknown>;
}

export function usePatterns() {
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const habits = useHabitStore(state => state.habits);

  const analyzePatterns = useCallback(async () => {
    if (habits.length === 0) return;

    setIsAnalyzing(true);
    const detected: DetectedPattern[] = [];

    try {
      // 1. Analyze completion time patterns for each habit
      for (const habit of habits) {
        const times = await habitRepo.getCompletionTimes(habit.id, 30);
        
        if (times.length >= 10) {
          // Find most common completion hour
          const hourCounts: Record<number, number> = {};
          times.forEach(hour => {
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          });

          const sortedHours = Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a);

          if (sortedHours.length > 0) {
            const [peakHour, count] = sortedHours[0];
            const strength = Math.round((count / times.length) * 100);

            if (strength >= 40) {
              detected.push({
                id: `time-${habit.id}`,
                type: 'time',
                name: `${habit.name} Peak Time`,
                description: `You complete "${habit.name}" most often at ${peakHour}:00`,
                strength,
                confidence: Math.min(95, times.length * 3),
                data: {
                  habitId: habit.id,
                  peakHour: parseInt(peakHour),
                  sampleSize: times.length,
                },
              });
            }
          }
        }
      }

      // 2. Find habit sequences (habits often completed together)
      if (habits.length >= 2) {
        const last30Days = getLastNDays(30).map(d => formatDateKey(d));
        
        for (let i = 0; i < habits.length; i++) {
          for (let j = i + 1; j < habits.length; j++) {
            const habit1 = habits[i];
            const habit2 = habits[j];

            // Count days where both were completed
            let bothCompleted = 0;
            let habit1Only = 0;
            let habit2Only = 0;

            for (const date of last30Days) {
              const comp1 = await habitRepo.getCompletionForDate(habit1.id, date);
              const comp2 = await habitRepo.getCompletionForDate(habit2.id, date);

              if (comp1 && comp2) bothCompleted++;
              else if (comp1) habit1Only++;
              else if (comp2) habit2Only++;
            }

            // Check for strong association
            const totalHabit1 = bothCompleted + habit1Only;
            const totalHabit2 = bothCompleted + habit2Only;

            if (totalHabit1 >= 10 && totalHabit2 >= 10) {
              const association = bothCompleted / Math.min(totalHabit1, totalHabit2);

              if (association >= 0.7) {
                detected.push({
                  id: `sequence-${habit1.id}-${habit2.id}`,
                  type: 'sequence',
                  name: 'Habit Pair',
                  description: `"${habit1.name}" and "${habit2.name}" are often completed together`,
                  strength: Math.round(association * 100),
                  confidence: Math.min(90, bothCompleted * 5),
                  data: {
                    habit1Id: habit1.id,
                    habit2Id: habit2.id,
                    coOccurrences: bothCompleted,
                  },
                });
              }
            }
          }
        }
      }

      // 3. Performance patterns (peak days of week)
      const dayOfWeekPerformance: Record<number, { completed: number; total: number }> = {};
      
      for (let day = 0; day < 7; day++) {
        dayOfWeekPerformance[day] = { completed: 0, total: 0 };
      }

      const last30Days = getLastNDays(30);
      for (const date of last30Days) {
        const dayOfWeek = date.getDay();
        const dateKey = formatDateKey(date);

        for (const habit of habits) {
          dayOfWeekPerformance[dayOfWeek].total++;
          const completion = await habitRepo.getCompletionForDate(habit.id, dateKey);
          if (completion) {
            dayOfWeekPerformance[dayOfWeek].completed++;
          }
        }
      }

      // Find best and worst days
      const dayRates = Object.entries(dayOfWeekPerformance)
        .map(([day, { completed, total }]) => ({
          day: parseInt(day),
          rate: total > 0 ? completed / total : 0,
        }))
        .sort((a, b) => b.rate - a.rate);

      if (dayRates[0].rate > 0.6 && dayRates[0].rate - dayRates[dayRates.length - 1].rate > 0.2) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        detected.push({
          id: 'peak-day',
          type: 'time',
          name: 'Best Performance Day',
          description: `You perform best on ${dayNames[dayRates[0].day]}s (${Math.round(dayRates[0].rate * 100)}% completion)`,
          strength: Math.round(dayRates[0].rate * 100),
          confidence: 85,
          data: {
            peakDay: dayRates[0].day,
            peakRate: dayRates[0].rate,
            worstDay: dayRates[dayRates.length - 1].day,
            worstRate: dayRates[dayRates.length - 1].rate,
          },
        });
      }

      setPatterns(detected);
      setLastAnalyzed(new Date());
    } catch (error) {
      console.error('Pattern analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [habits]);

  // Auto-analyze when habits change
  useEffect(() => {
    if (habits.length > 0) {
      analyzePatterns();
    }
  }, [habits.length]);

  return {
    patterns,
    isAnalyzing,
    lastAnalyzed,
    refresh: analyzePatterns,
    getPatternsByType: (type: DetectedPattern['type']) => 
      patterns.filter(p => p.type === type),
  };
}
