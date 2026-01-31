// Habit hooks
export { useHabits, useHabit, useHabitCompletions } from './useHabits';

// Goal hooks
export { useGoals, useGoal, useGoalProgress } from './useGoals';

// Task hooks
export { useTasks, useTask } from './useTasks';

// Insight hooks
export { useInsights, useInsight, useInsightCounts } from './useInsights';

// Energy hooks
export { useEnergy, useEnergyPatterns, useEnergyLogger } from './useEnergy';

// Pattern hooks
export { usePatterns } from './usePatterns';
export type { DetectedPattern } from './usePatterns';

// Prediction hooks
export { usePredictions, useHabitPrediction, useGoalPrediction } from './usePredictions';
export type { DayPrediction, BurnoutPrediction } from './usePredictions';

// Codex hooks (Notes)
export { useNotes } from './useNotes';
export { useNote, useNoteEditor } from './useNote';