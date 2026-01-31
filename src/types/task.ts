export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskType = 'creative' | 'analytical' | 'administrative' | 'communication' | 'physical' | 'other';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  type: TaskType;
  energyRequired: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
  actualMinutes?: number;
  dueDate?: Date;
  scheduledFor?: Date;
  completedAt?: Date;
  goalId?: string; // Link to a goal
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithScheduling extends Task {
  optimalTimeSlot?: {
    start: string; // HH:MM
    end: string;
    reason: string;
  };
  energyMatch: number; // 0-100, how well task matches current energy
}

export interface ScheduleSuggestion {
  taskId: string;
  suggestedTime: Date;
  reason: string;
  expectedPerformance: number; // 0-100
  alternativeTimes: {
    time: Date;
    performance: number;
  }[];
}
