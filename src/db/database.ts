import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from './schema';

// Open the database (sync API)
const expoDb = SQLite.openDatabaseSync('lumina.db');

export const db = drizzle(expoDb, { schema });

export async function initializeDatabase() {
  try {
    // execAsync exists on the Database object
    await expoDb.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        timezone TEXT DEFAULT 'UTC',
        onboarding_completed INTEGER DEFAULT 0,
        settings TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT NOT NULL DEFAULT 'circle',
        color TEXT NOT NULL DEFAULT '#3b82f6',
        frequency TEXT NOT NULL DEFAULT 'daily',
        target_days TEXT,
        time_of_day TEXT NOT NULL DEFAULT 'anytime',
        energy_required TEXT NOT NULL DEFAULT 'medium',
        reminder_time TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS habit_completions (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        completed_at INTEGER NOT NULL,
        date TEXT NOT NULL,
        duration INTEGER,
        note TEXT,
        mood INTEGER,
        energy_before INTEGER,
        energy_after INTEGER
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'other',
        icon TEXT NOT NULL DEFAULT 'target',
        color TEXT NOT NULL DEFAULT '#3b82f6',
        target_date INTEGER,
        target_value REAL,
        current_value REAL NOT NULL DEFAULT 0,
        unit TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        target_value REAL NOT NULL,
        target_date INTEGER,
        is_completed INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER,
        "order" INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS goal_progress (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        value REAL NOT NULL,
        note TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        type TEXT NOT NULL DEFAULT 'other',
        energy_required TEXT NOT NULL DEFAULT 'medium',
        estimated_minutes INTEGER,
        actual_minutes INTEGER,
        due_date INTEGER,
        scheduled_for INTEGER,
        completed_at INTEGER,
        goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
        tags TEXT DEFAULT '[]',
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS energy_logs (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        score INTEGER NOT NULL,
        phase TEXT NOT NULL,
        factors TEXT,
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        detailed_analysis TEXT NOT NULL,
        scientific_explanation TEXT,
        confidence REAL NOT NULL,
        correlation_value REAL,
        p_value REAL,
        effect_size REAL,
        action_label TEXT,
        action_type TEXT,
        action_payload TEXT,
        related_habit_ids TEXT,
        related_goal_ids TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        is_dismissed INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        strength REAL NOT NULL,
        data TEXT NOT NULL,
        valid_until INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        life_area TEXT,
        linked_habit_ids TEXT,
        linked_goal_ids TEXT,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
      CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(date);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_energy_logs_timestamp ON energy_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(type);
      CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at);
    `);

    console.log('✅ Database initialized');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default db;