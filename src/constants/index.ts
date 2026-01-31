export * from './theme';
export * from './energyPhases';

// Habit categories
export const habitCategories = [
  { id: 'health', name: 'Health', icon: 'heart', color: '#ef4444' },
  { id: 'fitness', name: 'Fitness', icon: 'dumbbell', color: '#f97316' },
  { id: 'mindfulness', name: 'Mindfulness', icon: 'brain', color: '#a855f7' },
  { id: 'productivity', name: 'Productivity', icon: 'target', color: '#3b82f6' },
  { id: 'learning', name: 'Learning', icon: 'book-open', color: '#10b981' },
  { id: 'social', name: 'Social', icon: 'users', color: '#ec4899' },
  { id: 'creativity', name: 'Creativity', icon: 'palette', color: '#f59e0b' },
  { id: 'finance', name: 'Finance', icon: 'wallet', color: '#14b8a6' },
] as const;

// Goal templates
export const goalTemplates = [
  {
    id: 'read_books',
    title: 'Read More Books',
    category: 'learning',
    icon: 'book',
    defaultTarget: 12,
    unit: 'books',
    suggestedMilestones: [3, 6, 9, 12],
  },
  {
    id: 'exercise',
    title: 'Exercise Regularly',
    category: 'health',
    icon: 'dumbbell',
    defaultTarget: 150,
    unit: 'workouts',
    suggestedMilestones: [30, 75, 100, 150],
  },
  {
    id: 'save_money',
    title: 'Save Money',
    category: 'finance',
    icon: 'piggy-bank',
    defaultTarget: 10000,
    unit: 'dollars',
    suggestedMilestones: [2000, 5000, 7500, 10000],
  },
  {
    id: 'meditate',
    title: 'Build Meditation Practice',
    category: 'mindfulness',
    icon: 'flower-2',
    defaultTarget: 100,
    unit: 'sessions',
    suggestedMilestones: [20, 50, 75, 100],
  },
] as const;

// Time-related constants
export const timeBlocks = [
  { id: 'early_morning', label: 'Early Morning', range: '5:00 - 8:00', hours: [5, 6, 7] },
  { id: 'morning', label: 'Morning', range: '8:00 - 12:00', hours: [8, 9, 10, 11] },
  { id: 'afternoon', label: 'Afternoon', range: '12:00 - 17:00', hours: [12, 13, 14, 15, 16] },
  { id: 'evening', label: 'Evening', range: '17:00 - 21:00', hours: [17, 18, 19, 20] },
  { id: 'night', label: 'Night', range: '21:00 - 24:00', hours: [21, 22, 23] },
] as const;

export const daysOfWeek = [
  { id: 0, short: 'Sun', long: 'Sunday' },
  { id: 1, short: 'Mon', long: 'Monday' },
  { id: 2, short: 'Tue', long: 'Tuesday' },
  { id: 3, short: 'Wed', long: 'Wednesday' },
  { id: 4, short: 'Thu', long: 'Thursday' },
  { id: 5, short: 'Fri', long: 'Friday' },
  { id: 6, short: 'Sat', long: 'Saturday' },
] as const;

// Insight type configurations
export const insightTypeConfig = {
  correlation: {
    icon: 'git-branch',
    color: '#3b82f6',
    gradient: ['#3b82f6', '#2563eb'],
    label: 'Pattern Discovery',
  },
  pattern: {
    icon: 'trending-up',
    color: '#10b981',
    gradient: ['#10b981', '#059669'],
    label: 'Behavioral Pattern',
  },
  prediction: {
    icon: 'sparkles',
    color: '#a855f7',
    gradient: ['#a855f7', '#9333ea'],
    label: 'Prediction',
  },
  warning: {
    icon: 'alert-triangle',
    color: '#f59e0b',
    gradient: ['#f59e0b', '#d97706'],
    label: 'Warning',
  },
  optimization: {
    icon: 'zap',
    color: '#06b6d4',
    gradient: ['#06b6d4', '#0891b2'],
    label: 'Optimization',
  },
  achievement: {
    icon: 'trophy',
    color: '#eab308',
    gradient: ['#eab308', '#ca8a04'],
    label: 'Achievement',
  },
} as const;
