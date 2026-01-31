export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';
export type GoalCategory = 'health' | 'career' | 'finance' | 'relationships' | 'learning' | 'creativity' | 'other';
export type MomentumStatus = 'accelerating' | 'steady' | 'slowing' | 'stalled';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  icon: string;
  color: string;
  targetDate?: Date;
  targetValue?: number;
  currentValue: number;
  unit?: string; // e.g., "kg", "books", "hours"
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  targetValue: number;
  targetDate?: Date;
  isCompleted: boolean;
  completedAt?: Date;
  order: number;
}

export interface GoalProgress {
  goalId: string;
  date: string; // YYYY-MM-DD
  value: number;
  note?: string;
  createdAt: Date;
}

export interface GoalWithStats extends Goal {
  milestones: Milestone[];
  progressPercentage: number;
  momentum: MomentumStatus;
  successProbability: number; // 0-100
  daysRemaining?: number;
  projectedCompletionDate?: Date;
  isOnTrack: boolean;
}

export interface GoalPrediction {
  goalId: string;
  successProbability: number;
  projectedCompletionDate: Date | null;
  confidence: number;
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
  recommendation?: string;
}
