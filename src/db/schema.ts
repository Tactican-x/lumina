import { sql } from 'drizzle-orm';
import { 
  sqliteTable, 
  text, 
  integer, 
  real 
} from 'drizzle-orm/sqlite-core';

// ==========================================
// USERS TABLE
// ==========================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  timezone: text('timezone').default('UTC'),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false),
  settings: text('settings', { mode: 'json' }).$type<UserSettings>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  notifications: boolean;
  reminderTime: string;
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  showScientificDetails: boolean;
}

// ==========================================
// HABITS TABLE
// ==========================================
export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon').notNull().default('circle'),
  color: text('color').notNull().default('#3b82f6'),
  frequency: text('frequency', { 
    enum: ['daily', 'weekly', 'custom'] 
  }).notNull().default('daily'),
  targetDays: text('target_days', { mode: 'json' }).$type<number[]>(),
  timeOfDay: text('time_of_day', { 
    enum: ['morning', 'afternoon', 'evening', 'anytime'] 
  }).notNull().default('anytime'),
  energyRequired: text('energy_required', { 
    enum: ['low', 'medium', 'high'] 
  }).notNull().default('medium'),
  reminderTime: text('reminder_time'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

// ==========================================
// HABIT COMPLETIONS TABLE
// ==========================================
export const habitCompletions = sqliteTable('habit_completions', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull().references(() => habits.id, { 
    onDelete: 'cascade' 
  }),
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD for easy grouping
  duration: integer('duration'), // minutes
  note: text('note'),
  mood: integer('mood'), // 1-5
  energyBefore: integer('energy_before'), // 1-10
  energyAfter: integer('energy_after'), // 1-10
});

// ==========================================
// GOALS TABLE
// ==========================================
export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category', {
    enum: ['health', 'career', 'finance', 'relationships', 'learning', 'creativity', 'other']
  }).notNull().default('other'),
  icon: text('icon').notNull().default('target'),
  color: text('color').notNull().default('#3b82f6'),
  targetDate: integer('target_date', { mode: 'timestamp' }),
  targetValue: real('target_value'),
  currentValue: real('current_value').notNull().default(0),
  unit: text('unit'),
  status: text('status', {
    enum: ['active', 'completed', 'paused', 'abandoned']
  }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

// ==========================================
// MILESTONES TABLE
// ==========================================
export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id, { 
    onDelete: 'cascade' 
  }),
  title: text('title').notNull(),
  description: text('description'),
  targetValue: real('target_value').notNull(),
  targetDate: integer('target_date', { mode: 'timestamp' }),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  order: integer('order').notNull().default(0),
});

// ==========================================
// GOAL PROGRESS TABLE
// ==========================================
export const goalProgress = sqliteTable('goal_progress', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id, { 
    onDelete: 'cascade' 
  }),
  date: text('date').notNull(), // YYYY-MM-DD
  value: real('value').notNull(),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

// ==========================================
// TASKS TABLE
// ==========================================
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'urgent']
  }).notNull().default('medium'),
  status: text('status', {
    enum: ['pending', 'in_progress', 'completed', 'cancelled']
  }).notNull().default('pending'),
  type: text('type', {
    enum: ['creative', 'analytical', 'administrative', 'communication', 'physical', 'other']
  }).notNull().default('other'),
  energyRequired: text('energy_required', {
    enum: ['low', 'medium', 'high']
  }).notNull().default('medium'),
  estimatedMinutes: integer('estimated_minutes'),
  actualMinutes: integer('actual_minutes'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  scheduledFor: integer('scheduled_for', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  goalId: text('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

// ==========================================
// ENERGY LOGS TABLE
// ==========================================
export const energyLogs = sqliteTable('energy_logs', {
  id: text('id').primaryKey(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  score: integer('score').notNull(), // 0-100
  phase: text('phase', {
    enum: ['peak_cognitive', 'creative_flow', 'analytical', 'recovery', 'social', 'rest']
  }).notNull(),
  factors: text('factors', { mode: 'json' }).$type<EnergyFactors>(),
  note: text('note'),
});

export interface EnergyFactors {
  sleep?: number;
  stress?: number;
  exercise?: boolean;
  caffeine?: boolean;
  meals?: number;
}

// ==========================================
// INSIGHTS TABLE
// ==========================================
export const insights = sqliteTable('insights', {
  id: text('id').primaryKey(),
  type: text('type', {
    enum: ['correlation', 'pattern', 'prediction', 'warning', 'optimization', 'achievement']
  }).notNull(),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull().default('medium'),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  detailedAnalysis: text('detailed_analysis').notNull(),
  scientificExplanation: text('scientific_explanation'),
  
  // Metrics
  confidence: real('confidence').notNull(), // 0-100
  correlationValue: real('correlation_value'), // -1 to 1
  pValue: real('p_value'),
  effectSize: real('effect_size'),
  
  // Action
  actionLabel: text('action_label'),
  actionType: text('action_type', {
    enum: ['habit', 'goal', 'task', 'setting', 'external']
  }),
  actionPayload: text('action_payload', { mode: 'json' }),
  
  // Related entities
  relatedHabitIds: text('related_habit_ids', { mode: 'json' }).$type<string[]>(),
  relatedGoalIds: text('related_goal_ids', { mode: 'json' }).$type<string[]>(),
  
  // Status
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  isDismissed: integer('is_dismissed', { mode: 'boolean' }).notNull().default(false),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

// ==========================================
// PATTERNS TABLE (Cached pattern analysis)
// ==========================================
export const patterns = sqliteTable('patterns', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // e.g., 'peak_performance_time', 'habit_chain'
  name: text('name').notNull(),
  strength: real('strength').notNull(), // 0-100
  data: text('data', { mode: 'json' }).notNull(),
  validUntil: integer('valid_until', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

// ==========================================
// NOTES TABLE (Codex)
// ==========================================
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title'),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  lifeArea: text('life_area', {
    enum: ['health', 'career', 'finance', 'relationships', 'learning', 'creativity', 'personal', 'other']
  }),
  linkedHabitIds: text('linked_habit_ids', { mode: 'json' }).$type<string[]>(),
  linkedGoalIds: text('linked_goal_ids', { mode: 'json' }).$type<string[]>(),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

// ==========================================
// Type exports for use in app
// ==========================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;

export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type NewHabitCompletion = typeof habitCompletions.$inferInsert;

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;

export type GoalProgress = typeof goalProgress.$inferSelect;
export type NewGoalProgress = typeof goalProgress.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type EnergyLog = typeof energyLogs.$inferSelect;
export type NewEnergyLog = typeof energyLogs.$inferInsert;

export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;

export type Pattern = typeof patterns.$inferSelect;
export type NewPattern = typeof patterns.$inferInsert;

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
