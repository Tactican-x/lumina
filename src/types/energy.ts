export type EnergyPhase = 
  | 'peak_cognitive'    // Best for complex thinking
  | 'creative_flow'     // Best for creative work
  | 'analytical'        // Good for detailed analysis
  | 'recovery'          // Low energy, need rest
  | 'social'            // Good for communication
  | 'rest';             // Should be resting

export interface EnergyLog {
  id: string;
  timestamp: Date;
  score: number; // 0-100
  phase: EnergyPhase;
  factors?: {
    sleep?: number; // hours
    stress?: number; // 1-10
    exercise?: boolean;
    caffeine?: boolean;
    meals?: number; // count
  };
  note?: string;
}

export interface EnergyPattern {
  hourOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  averageScore: number;
  sampleSize: number;
  phase: EnergyPhase;
}

export interface CircadianProfile {
  peakHours: number[]; // Hours where energy is highest
  troughHours: number[]; // Hours where energy is lowest
  optimalWorkWindow: {
    start: number; // Hour
    end: number;
  };
  creativeWindow: {
    start: number;
    end: number;
  };
  recoveryNeeded: boolean;
  averageDailyEnergy: number;
  consistency: number; // 0-100, how consistent is the pattern
}

export interface EnergyForecast {
  date: Date;
  hourlyPredictions: {
    hour: number;
    predictedScore: number;
    confidence: number;
    suggestedPhase: EnergyPhase;
  }[];
  peakWindow: {
    start: number;
    end: number;
    expectedScore: number;
  };
  lowWindow: {
    start: number;
    end: number;
    expectedScore: number;
  };
}

export interface BurnoutRisk {
  riskLevel: number; // 0-100
  daysUntilBurnout: number | null;
  factors: {
    name: string;
    contribution: number; // 0-100
    trend: 'increasing' | 'stable' | 'decreasing';
  }[];
  recommendations: string[];
  currentLoad: number; // Current cognitive load
  baselineLoad: number; // Normal cognitive load
  loadTrend: 'increasing' | 'stable' | 'decreasing';
}
