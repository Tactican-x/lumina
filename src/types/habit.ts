export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  targetDays?: number[]; // 0-6 for Sunday-Saturday
  timeOfDay: TimeOfDay;
  energyRequired: EnergyLevel;
  reminderTime?: string; // HH:MM format
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: Date;
  date: string; // YYYY-MM-DD format for easy grouping
  duration?: number; // minutes spent
  note?: string;
  mood?: number; // 1-5 rating
  energyBefore?: number; // 1-10
  energyAfter?: number; // 1-10
}

export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  totalCompletions: number;
  completionRate: number; // 0-100 percentage
}

export interface HabitWithStats extends Habit {
  streak: HabitStreak;
  completedToday: boolean;
  correlation?: HabitCorrelation;
}

export interface HabitCorrelation {
  habitId: string;
  correlationCoefficient: number; // Pearson's r (-1 to 1)
  pValue: number;
  confidence: number; // 0-100
  significance: 'high' | 'medium' | 'low' | 'none';
  impactDescription: string;
  sampleSize: number;
}
