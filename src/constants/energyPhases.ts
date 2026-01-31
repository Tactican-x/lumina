import { EnergyPhase } from '@/types';
import { colors } from './theme';

export interface EnergyPhaseConfig {
  id: EnergyPhase;
  name: string;
  description: string;
  icon: string;
  gradient: [string, string];
  taskTypes: string[];
  tips: string[];
  scientificBasis: string;
}

export const energyPhases: Record<EnergyPhase, EnergyPhaseConfig> = {
  peak_cognitive: {
    id: 'peak_cognitive',
    name: 'Peak Cognitive',
    description: 'Your brain is firing on all cylinders. Perfect for complex problem-solving.',
    icon: 'brain',
    gradient: colors.gradients.peakCognitive,
    taskTypes: ['analytical', 'creative', 'learning'],
    tips: [
      'Tackle your most challenging task now',
      'Avoid meetings if possible',
      'Turn off notifications',
    ],
    scientificBasis: 'Prefrontal cortex activity is highest, glucose metabolism is optimal, and cortisol levels support focus.',
  },
  creative_flow: {
    id: 'creative_flow',
    name: 'Creative Flow',
    description: 'Divergent thinking is enhanced. Great for brainstorming and creative work.',
    icon: 'sparkles',
    gradient: colors.gradients.creativeFlow,
    taskTypes: ['creative', 'brainstorming', 'design'],
    tips: [
      'Work on creative projects',
      'Brainstorm new ideas',
      'Explore unconventional solutions',
    ],
    scientificBasis: 'Default mode network is more active, allowing for creative connections between disparate ideas.',
  },
  analytical: {
    id: 'analytical',
    name: 'Analytical Peak',
    description: 'Good for detailed, focused work requiring precision.',
    icon: 'calculator',
    gradient: colors.gradients.analytical,
    taskTypes: ['analytical', 'review', 'planning'],
    tips: [
      'Review documents and data',
      'Do financial planning',
      'Debug code or solve technical problems',
    ],
    scientificBasis: 'Working memory capacity is high, enabling complex multi-step reasoning.',
  },
  recovery: {
    id: 'recovery',
    name: 'Recovery Mode',
    description: 'Energy is lower. Focus on lighter tasks or take a break.',
    icon: 'battery-low',
    gradient: colors.gradients.recovery,
    taskTypes: ['administrative', 'routine', 'rest'],
    tips: [
      'Handle routine emails',
      'Organize your workspace',
      'Take a short walk',
    ],
    scientificBasis: 'Post-lunch dip in alertness due to circadian rhythm and digestion. Light activity helps recovery.',
  },
  social: {
    id: 'social',
    name: 'Social Energy',
    description: 'Good time for collaboration and communication.',
    icon: 'users',
    gradient: colors.gradients.social,
    taskTypes: ['communication', 'meetings', 'collaboration'],
    tips: [
      'Schedule team meetings',
      'Have difficult conversations',
      'Network and connect',
    ],
    scientificBasis: 'Oxytocin and social cognition circuits are more active, enhancing interpersonal skills.',
  },
  rest: {
    id: 'rest',
    name: 'Rest Mode',
    description: 'Your body needs rest. Wind down and prepare for sleep.',
    icon: 'moon',
    gradient: colors.gradients.rest,
    taskTypes: ['rest', 'reflection', 'planning'],
    tips: [
      'Avoid screens if possible',
      'Reflect on the day',
      'Light planning for tomorrow',
    ],
    scientificBasis: 'Melatonin production increases, signaling the body to prepare for restorative sleep.',
  },
};

export const phaseScoreRanges = {
  peak_cognitive: { min: 80, max: 100 },
  creative_flow: { min: 70, max: 90 },
  analytical: { min: 60, max: 80 },
  recovery: { min: 40, max: 60 },
  social: { min: 50, max: 70 },
  rest: { min: 0, max: 40 },
} as const;

export function getPhaseFromScore(score: number): EnergyPhase {
  if (score >= 80) return 'peak_cognitive';
  if (score >= 65) return 'analytical';
  if (score >= 50) return 'social';
  if (score >= 35) return 'recovery';
  return 'rest';
}

export function getPhaseColor(phase: EnergyPhase): string {
  return energyPhases[phase].gradient[0];
}
