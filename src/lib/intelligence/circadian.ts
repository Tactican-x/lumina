/**
 * Circadian Rhythm Analysis
 * 
 * Tracks and predicts energy patterns throughout the day
 * to optimize task scheduling and habit timing.
 */

import { descriptiveStats } from '../statistics';
import { movingAverage } from '../statistics/regression';
import { EnergyPhase } from '@/types';
import { energyPhases, getPhaseFromScore } from '@/constants/energyPhases';

// ==========================================
// TYPES
// ==========================================

export interface EnergyDataPoint {
  timestamp: Date;
  hour: number;
  dayOfWeek: number;
  score: number;          // 0-100
  phase: EnergyPhase;
}

export interface HourlyEnergyProfile {
  hour: number;
  averageScore: number;
  minScore: number;
  maxScore: number;
  variance: number;
  sampleSize: number;
  dominantPhase: EnergyPhase;
}

export interface CircadianProfile {
  hourlyProfile: HourlyEnergyProfile[];
  peakHours: number[];           // Best hours (0-23)
  troughHours: number[];         // Worst hours
  optimalWorkWindow: {
    start: number;
    end: number;
    averageScore: number;
  };
  creativeWindow: {
    start: number;
    end: number;
    averageScore: number;
  };
  recoveryNeededHours: number[]; // Hours where rest is best
  consistency: number;           // 0-100, pattern reliability
  chronotype: 'early_bird' | 'night_owl' | 'intermediate';
}

export interface RealTimeEnergy {
  currentScore: number;
  currentPhase: EnergyPhase;
  phaseConfig: typeof energyPhases[EnergyPhase];
  percentOfPeak: number;         // Current score vs personal peak
  timeUntilNextPeak: number;     // Minutes until next high-energy window
  recommendation: string;
}

export interface OptimalTimeSlot {
  taskType: 'creative' | 'analytical' | 'administrative' | 'communication' | 'physical';
  optimalHours: number[];
  reason: string;
  expectedPerformance: number;   // 0-100
}

// ==========================================
// CIRCADIAN PROFILE BUILDING
// ==========================================

/**
 * Build a complete circadian profile from energy data
 */
export function buildCircadianProfile(
  energyData: EnergyDataPoint[]
): CircadianProfile {
  if (energyData.length < 24) {
    return getDefaultCircadianProfile();
  }

  // Group by hour
  const hourlyData: Record<number, number[]> = {};
  for (let h = 0; h < 24; h++) {
    hourlyData[h] = [];
  }

  for (const data of energyData) {
    hourlyData[data.hour].push(data.score);
  }

  // Build hourly profile
  const hourlyProfile: HourlyEnergyProfile[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const scores = hourlyData[hour];
    
    if (scores.length === 0) {
      // Interpolate from nearby hours
      hourlyProfile.push({
        hour,
        averageScore: 50,
        minScore: 30,
        maxScore: 70,
        variance: 400,
        sampleSize: 0,
        dominantPhase: 'recovery',
      });
      continue;
    }

    const stats = descriptiveStats(scores);
    const avgScore = stats.mean;
    
    hourlyProfile.push({
      hour,
      averageScore: avgScore,
      minScore: stats.min,
      maxScore: stats.max,
      variance: stats.variance,
      sampleSize: scores.length,
      dominantPhase: getPhaseFromScore(avgScore),
    });
  }

  // Find peak and trough hours
  const sortedByScore = [...hourlyProfile].sort(
    (a, b) => b.averageScore - a.averageScore
  );
  
  const peakHours = sortedByScore.slice(0, 4).map(h => h.hour);
  const troughHours = sortedByScore.slice(-4).map(h => h.hour);
  
  // Find continuous peak window
  const optimalWorkWindow = findBestWindow(hourlyProfile, 3);
  
  // Creative window is often slightly different
  const creativeWindow = findCreativeWindow(hourlyProfile);
  
  // Recovery hours
  const recoveryNeededHours = hourlyProfile
    .filter(h => h.averageScore < 40)
    .map(h => h.hour);

  // Calculate consistency
  const avgVariance = hourlyProfile.reduce((sum, h) => sum + h.variance, 0) / 24;
  const consistency = Math.max(0, Math.min(100, 100 - avgVariance / 10));

  // Determine chronotype
  const morningScore = hourlyProfile
    .filter(h => h.hour >= 6 && h.hour <= 10)
    .reduce((sum, h) => sum + h.averageScore, 0) / 5;
  
  const eveningScore = hourlyProfile
    .filter(h => h.hour >= 20 && h.hour <= 24)
    .reduce((sum, h) => sum + h.averageScore, 0) / 4;

  let chronotype: 'early_bird' | 'night_owl' | 'intermediate';
  if (morningScore > eveningScore + 15) {
    chronotype = 'early_bird';
  } else if (eveningScore > morningScore + 15) {
    chronotype = 'night_owl';
  } else {
    chronotype = 'intermediate';
  }

  return {
    hourlyProfile,
    peakHours,
    troughHours,
    optimalWorkWindow,
    creativeWindow,
    recoveryNeededHours,
    consistency,
    chronotype,
  };
}

function getDefaultCircadianProfile(): CircadianProfile {
  // Typical human circadian pattern
  const defaultScores = [
    30, 25, 20, 20, 25, 35, // 0-5 AM: Night/early morning low
    45, 60, 75, 85, 80, 70, // 6-11 AM: Morning rise to peak
    55, 50, 55, 65, 70, 75, // 12-5 PM: Post-lunch dip, afternoon recovery
    70, 60, 50, 40, 35, 30, // 6-11 PM: Evening decline
  ];

  const hourlyProfile: HourlyEnergyProfile[] = defaultScores.map((score, hour) => ({
    hour,
    averageScore: score,
    minScore: score - 15,
    maxScore: score + 15,
    variance: 225,
    sampleSize: 0,
    dominantPhase: getPhaseFromScore(score),
  }));

  return {
    hourlyProfile,
    peakHours: [9, 10, 11, 17],
    troughHours: [2, 3, 13, 14],
    optimalWorkWindow: { start: 9, end: 12, averageScore: 80 },
    creativeWindow: { start: 10, end: 12, averageScore: 75 },
    recoveryNeededHours: [13, 14, 22, 23, 0, 1, 2, 3],
    consistency: 50,
    chronotype: 'intermediate',
  };
}

function findBestWindow(
  profile: HourlyEnergyProfile[],
  windowSize: number
): { start: number; end: number; averageScore: number } {
  let bestStart = 9;
  let bestAvg = 0;

  // Only search daytime hours (6 AM - 10 PM)
  for (let start = 6; start <= 22 - windowSize; start++) {
    let sum = 0;
    for (let i = 0; i < windowSize; i++) {
      sum += profile[start + i].averageScore;
    }
    const avg = sum / windowSize;
    
    if (avg > bestAvg) {
      bestAvg = avg;
      bestStart = start;
    }
  }

  return {
    start: bestStart,
    end: bestStart + windowSize,
    averageScore: Math.round(bestAvg),
  };
}

function findCreativeWindow(
  profile: HourlyEnergyProfile[]
): { start: number; end: number; averageScore: number } {
  // Creative work often benefits from slightly lower alertness
  // Look for transition periods or morning hours
  
  // Try morning first (8-11 AM range)
  const morningWindow = findBestWindow(
    profile.slice(8, 12).map((p, i) => ({ ...p, hour: i + 8 })),
    2
  );
  
  // Also check late afternoon (4-6 PM)
  const afternoonAvg = (profile[16].averageScore + profile[17].averageScore) / 2;
  
  if (morningWindow.averageScore >= afternoonAvg) {
    return { ...morningWindow, end: morningWindow.start + 2 };
  }
  
  return {
    start: 16,
    end: 18,
    averageScore: Math.round(afternoonAvg),
  };
}

// ==========================================
// REAL-TIME ENERGY DETECTION
// ==========================================

/**
 * Get current energy state and recommendations
 */
export function getCurrentEnergyState(
  profile: CircadianProfile,
  recentEnergyLogs?: { score: number; timestamp: Date }[]
): RealTimeEnergy {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Get expected score from profile
  const hourData = profile.hourlyProfile[currentHour];
  let currentScore = hourData.averageScore;
  
  // Adjust if we have recent actual data
  if (recentEnergyLogs && recentEnergyLogs.length > 0) {
    // Use most recent log if within last 2 hours
    const recentLog = recentEnergyLogs[recentEnergyLogs.length - 1];
    const logAge = (now.getTime() - recentLog.timestamp.getTime()) / (1000 * 60);
    
    if (logAge < 120) {
      // Blend recent actual with predicted
      const weight = Math.max(0.3, 1 - logAge / 120);
      currentScore = recentLog.score * weight + currentScore * (1 - weight);
    }
  }

  const currentPhase = getPhaseFromScore(currentScore);
  const phaseConfig = energyPhases[currentPhase];

  // Calculate percent of personal peak
  const peakScore = Math.max(...profile.hourlyProfile.map(h => h.averageScore));
  const percentOfPeak = Math.round((currentScore / peakScore) * 100);

  // Find next peak hour
  let timeUntilNextPeak = 0;
  for (let offset = 1; offset <= 24; offset++) {
    const checkHour = (currentHour + offset) % 24;
    if (profile.peakHours.includes(checkHour)) {
      timeUntilNextPeak = offset * 60; // Convert to minutes
      break;
    }
  }

  // Generate recommendation
  const recommendation = generateEnergyRecommendation(
    currentPhase,
    currentScore,
    currentHour,
    profile
  );

  return {
    currentScore: Math.round(currentScore),
    currentPhase,
    phaseConfig,
    percentOfPeak,
    timeUntilNextPeak,
    recommendation,
  };
}

function generateEnergyRecommendation(
  phase: EnergyPhase,
  score: number,
  hour: number,
  profile: CircadianProfile
): string {
  if (phase === 'peak_cognitive') {
    return 'You\'re at peak energy. Focus on your most important, challenging work now.';
  }
  
  if (phase === 'creative_flow') {
    return 'Great time for creative work, brainstorming, or problem-solving.';
  }
  
  if (phase === 'analytical') {
    return 'Good for detailed work, data analysis, or code review.';
  }
  
  if (phase === 'recovery') {
    const nextPeak = profile.peakHours.find(h => h > hour);
    if (nextPeak) {
      return `Energy is recovering. Consider a break - your next peak is around ${nextPeak}:00.`;
    }
    return 'Lower energy phase. Handle routine tasks or take a short break.';
  }
  
  if (phase === 'social') {
    return 'Good energy for meetings, collaboration, and communication.';
  }
  
  // Rest
  return 'Time to wind down. Avoid starting new complex tasks.';
}

// ==========================================
// OPTIMAL SCHEDULING
// ==========================================

/**
 * Get optimal hours for different task types
 */
export function getOptimalSchedule(
  profile: CircadianProfile
): OptimalTimeSlot[] {
  const slots: OptimalTimeSlot[] = [];

  // Analytical work - needs peak cognitive
  const analyticalHours = profile.hourlyProfile
    .filter(h => h.averageScore >= 70 && h.hour >= 6 && h.hour <= 20)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 4)
    .map(h => h.hour);

  slots.push({
    taskType: 'analytical',
    optimalHours: analyticalHours,
    reason: 'Highest cognitive performance and focus',
    expectedPerformance: Math.round(
      analyticalHours.reduce((sum, h) => sum + profile.hourlyProfile[h].averageScore, 0) / 
      analyticalHours.length
    ),
  });

  // Creative work - slightly lower alertness can help
  const creativeHours = [
    ...profile.hourlyProfile
      .filter(h => h.averageScore >= 50 && h.averageScore <= 75 && h.hour >= 8 && h.hour <= 20)
      .map(h => h.hour)
      .slice(0, 3),
    profile.creativeWindow.start,
    profile.creativeWindow.start + 1,
  ].filter((h, i, arr) => arr.indexOf(h) === i).slice(0, 4);

  slots.push({
    taskType: 'creative',
    optimalHours: creativeHours,
    reason: 'Slightly reduced alertness allows more divergent thinking',
    expectedPerformance: 70,
  });

  // Administrative - can be done during lower energy
  const adminHours = profile.hourlyProfile
    .filter(h => h.averageScore >= 40 && h.averageScore < 70 && h.hour >= 9 && h.hour <= 18)
    .map(h => h.hour)
    .slice(0, 4);

  slots.push({
    taskType: 'administrative',
    optimalHours: adminHours.length > 0 ? adminHours : [14, 15, 16],
    reason: 'Routine tasks don\'t require peak energy',
    expectedPerformance: 60,
  });

  // Communication/meetings - social energy times
  const socialHours = profile.hourlyProfile
    .filter(h => h.averageScore >= 50 && h.hour >= 10 && h.hour <= 17)
    .map(h => h.hour)
    .slice(0, 4);

  slots.push({
    taskType: 'communication',
    optimalHours: socialHours.length > 0 ? socialHours : [10, 11, 15, 16],
    reason: 'Moderate energy optimal for social interaction',
    expectedPerformance: 65,
  });

  // Physical activity - morning or afternoon
  const physicalHours = profile.chronotype === 'early_bird'
    ? [6, 7, 17, 18]
    : profile.chronotype === 'night_owl'
    ? [10, 11, 18, 19]
    : [7, 8, 17, 18];

  slots.push({
    taskType: 'physical',
    optimalHours: physicalHours,
    reason: 'Body temperature and coordination peak in afternoon',
    expectedPerformance: 75,
  });

  return slots;
}

/**
 * Get best time for a specific task
 */
export function suggestTaskTime(
  taskType: 'creative' | 'analytical' | 'administrative' | 'communication' | 'physical',
  profile: CircadianProfile,
  currentHour: number,
  mustBeToday: boolean = true
): {
  suggestedHour: number;
  expectedPerformance: number;
  reason: string;
} {
  const schedule = getOptimalSchedule(profile);
  const slot = schedule.find(s => s.taskType === taskType);

  if (!slot) {
    return {
      suggestedHour: currentHour + 1,
      expectedPerformance: 50,
      reason: 'No specific recommendation',
    };
  }

  // Find next available optimal hour
  let suggestedHour = slot.optimalHours.find(h => h > currentHour);
  
  if (!suggestedHour && mustBeToday) {
    // Fall back to best remaining hour today
    suggestedHour = slot.optimalHours[0];
  } else if (!suggestedHour) {
    // Tomorrow's optimal time
    suggestedHour = slot.optimalHours[0];
  }

  return {
    suggestedHour: suggestedHour || currentHour + 1,
    expectedPerformance: slot.expectedPerformance,
    reason: slot.reason,
  };
}

// ==========================================
// ENERGY CURVE GENERATION
// ==========================================

/**
 * Generate smooth energy curve data for visualization
 */
export function generateEnergyCurve(
  profile: CircadianProfile,
  pointsPerHour: number = 4
): { time: number; score: number; phase: EnergyPhase }[] {
  const points: { time: number; score: number; phase: EnergyPhase }[] = [];
  const scores = profile.hourlyProfile.map(h => h.averageScore);
  
  // Apply smoothing
  const smoothed = movingAverage([
    scores[23], // Wrap around for smooth curve
    ...scores,
    scores[0],
  ], 3);

  // Generate points
  for (let hour = 0; hour < 24; hour++) {
    for (let i = 0; i < pointsPerHour; i++) {
      const time = hour + i / pointsPerHour;
      
      // Interpolate between smoothed values
      const lowerIndex = hour;
      const upperIndex = (hour + 1) % 24;
      const fraction = i / pointsPerHour;
      
      const score = smoothed[lowerIndex + 1] * (1 - fraction) + 
                   smoothed[upperIndex + 1] * fraction;
      
      points.push({
        time,
        score: Math.round(score),
        phase: getPhaseFromScore(score),
      });
    }
  }

  return points;
}
