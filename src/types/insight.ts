export type InsightType = 
  | 'correlation'      // Habit-performance relationship
  | 'pattern'          // Behavioral pattern detected
  | 'prediction'       // Future forecast
  | 'warning'          // Risk alert (burnout, streak)
  | 'optimization'     // Improvement opportunity
  | 'achievement';     // Milestone reached

export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  summary: string;
  detailedAnalysis: string;
  scientificExplanation?: string;
  
  // Metrics
  confidence: number; // 0-100
  correlationValue?: number; // -1 to 1
  pValue?: number;
  effectSize?: number;
  
  // Action
  actionLabel?: string;
  actionType?: 'habit' | 'goal' | 'task' | 'setting' | 'external';
  actionPayload?: Record<string, unknown>;
  
  // Metadata
  relatedHabitIds?: string[];
  relatedGoalIds?: string[];
  isRead: boolean;
  isDismissed: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface InsightWithMeta extends Insight {
  formattedConfidence: string; // e.g., "87%"
  formattedCorrelation?: string; // e.g., "r = 0.89"
  iconName: string;
  gradientColors: [string, string];
}

export interface PatternInsight extends Insight {
  type: 'pattern';
  pattern: {
    name: string;
    occurrences: number;
    strength: number; // 0-100
    timeRange: {
      start: string; // HH:MM
      end: string;
    };
    days: number[]; // 0-6
  };
}

export interface WarningInsight extends Insight {
  type: 'warning';
  warning: {
    riskType: 'burnout' | 'streak_break' | 'goal_miss' | 'overload';
    riskLevel: number; // 0-100
    daysUntilRisk: number;
    preventionSteps: string[];
  };
}
