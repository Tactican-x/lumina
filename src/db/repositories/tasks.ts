/**
 * Task Repository
 * CRUD operations and queries for tasks
 */

import { eq, and, gte, lte, desc, asc, or, isNull } from 'drizzle-orm';
import { db, generateId } from '../database';
import { tasks, Task, NewTask } from '../schema';
import { formatDateKey, getTodayKey, startOfDay, endOfDay } from '@/utils/date';

// ==========================================
// TASK CRUD
// ==========================================

/**
 * Get all tasks
 */
export async function getAllTasks(): Promise<Task[]> {
  return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

/**
 * Get tasks by status
 */
export async function getTasksByStatus(status: Task['status']): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, status))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority));
}

/**
 * Get pending tasks
 */
export async function getPendingTasks(): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(
      or(
        eq(tasks.status, 'pending'),
        eq(tasks.status, 'in_progress')
      )
    )
    .orderBy(asc(tasks.dueDate), desc(tasks.priority));
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string): Promise<Task | undefined> {
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);
  return result[0];
}

/**
 * Create a new task
 */
export async function createTask(
  data: Omit<NewTask, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Task> {
  const id = generateId();
  const now = new Date();

  const newTask: NewTask = {
    id,
    ...data,
    tags: data.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(tasks).values(newTask);

  const created = await getTaskById(id);
  if (!created) throw new Error('Failed to create task');
  return created;
}

/**
 * Update a task
 */
export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'createdAt'>>
): Promise<Task | undefined> {
  await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, id));

  return await getTaskById(id);
}

/**
 * Complete a task
 */
export async function completeTask(
  id: string,
  actualMinutes?: number
): Promise<Task | undefined> {
  return await updateTask(id, {
    status: 'completed',
    completedAt: new Date(),
    actualMinutes,
  });
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ==========================================
// TASK QUERIES
// ==========================================

/**
 * Get tasks for today
 */
export async function getTodayTasks(): Promise<Task[]> {
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  return await db
    .select()
    .from(tasks)
    .where(
      and(
        or(
          eq(tasks.status, 'pending'),
          eq(tasks.status, 'in_progress')
        ),
        or(
          and(
            gte(tasks.scheduledFor, start),
            lte(tasks.scheduledFor, end)
          ),
          and(
            gte(tasks.dueDate, start),
            lte(tasks.dueDate, end)
          ),
          isNull(tasks.dueDate)
        )
      )
    )
    .orderBy(desc(tasks.priority), asc(tasks.scheduledFor));
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(): Promise<Task[]> {
  const now = new Date();

  return await db
    .select()
    .from(tasks)
    .where(
      and(
        lte(tasks.dueDate, now),
        or(
          eq(tasks.status, 'pending'),
          eq(tasks.status, 'in_progress')
        )
      )
    )
    .orderBy(asc(tasks.dueDate));
}

/**
 * Get tasks by energy level
 */
export async function getTasksByEnergy(
  energyLevel: Task['energyRequired']
): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.energyRequired, energyLevel),
        or(
          eq(tasks.status, 'pending'),
          eq(tasks.status, 'in_progress')
        )
      )
    )
    .orderBy(desc(tasks.priority));
}

/**
 * Get tasks by goal
 */
export async function getTasksByGoal(goalId: string): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.goalId, goalId))
    .orderBy(desc(tasks.createdAt));
}

/**
 * Get completed tasks in date range
 */
export async function getCompletedTasksInRange(
  startDate: Date,
  endDate: Date
): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, 'completed'),
        gte(tasks.completedAt, startDate),
        lte(tasks.completedAt, endDate)
      )
    )
    .orderBy(desc(tasks.completedAt));
}

// ==========================================
// TASK ANALYTICS
// ==========================================

/**
 * Get task completion stats
 */
export async function getTaskStats(days: number = 7): Promise<{
  totalCompleted: number;
  totalCreated: number;
  completionRate: number;
  averageCompletionTime: number | null;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}> {
  const startDate = new Date(Date.now() - days * 86400000);

  const completedTasks = await getCompletedTasksInRange(startDate, new Date());
  
  const allRecentTasks = await db
    .select()
    .from(tasks)
    .where(gte(tasks.createdAt, startDate));

  // By priority
  const byPriority: Record<string, number> = {};
  completedTasks.forEach(t => {
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  });

  // By type
  const byType: Record<string, number> = {};
  completedTasks.forEach(t => {
    byType[t.type] = (byType[t.type] || 0) + 1;
  });

  // Average completion time
  const tasksWithTime = completedTasks.filter(t => t.actualMinutes != null);
  const averageCompletionTime = tasksWithTime.length > 0
    ? Math.round(
        tasksWithTime.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) / 
        tasksWithTime.length
      )
    : null;

  return {
    totalCompleted: completedTasks.length,
    totalCreated: allRecentTasks.length,
    completionRate: allRecentTasks.length > 0
      ? Math.round((completedTasks.length / allRecentTasks.length) * 100)
      : 0,
    averageCompletionTime,
    byPriority,
    byType,
  };
}

/**
 * Get productivity by hour of day
 */
export async function getProductivityByHour(days: number = 30): Promise<{
  hour: number;
  tasksCompleted: number;
  averageMinutes: number;
}[]> {
  const startDate = new Date(Date.now() - days * 86400000);
  const completedTasks = await getCompletedTasksInRange(startDate, new Date());

  const byHour: Map<number, { count: number; totalMinutes: number }> = new Map();

  completedTasks.forEach(task => {
    if (task.completedAt) {
      const hour = new Date(task.completedAt).getHours();
      const current = byHour.get(hour) || { count: 0, totalMinutes: 0 };
      byHour.set(hour, {
        count: current.count + 1,
        totalMinutes: current.totalMinutes + (task.actualMinutes || 0),
      });
    }
  });

  const result: { hour: number; tasksCompleted: number; averageMinutes: number }[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const data = byHour.get(hour);
    result.push({
      hour,
      tasksCompleted: data?.count || 0,
      averageMinutes: data && data.count > 0
        ? Math.round(data.totalMinutes / data.count)
        : 0,
    });
  }

  return result;
}
