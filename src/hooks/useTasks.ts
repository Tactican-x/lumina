/**
 * useTasks Hook
 * Convenient hook for task-related operations
 */

import { useCallback, useEffect, useState } from 'react';
import { Task } from '@/types';
import * as taskRepo from '@/db/repositories/tasks';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [allTasks, today] = await Promise.all([
        taskRepo.getPendingTasks(),
        taskRepo.getTodayTasks(),
      ]);

      setTasks(allTasks);
      setTodayTasks(today);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const task = await taskRepo.createTask(data);
      await fetchTasks();
      return task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    }
  }, [fetchTasks]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    try {
      await taskRepo.updateTask(id, data);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    }
  }, [fetchTasks]);

  const completeTask = useCallback(async (id: string, actualMinutes?: number) => {
    try {
      await taskRepo.completeTask(id, actualMinutes);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
      throw err;
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await taskRepo.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      setTodayTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    }
  }, []);

  const getTasksByEnergy = useCallback((energy: Task['energyRequired']) => {
    return tasks.filter(t => t.energyRequired === energy);
  }, [tasks]);

  const getOverdueTasks = useCallback(async () => {
    return await taskRepo.getOverdueTasks();
  }, []);

  return {
    tasks,
    todayTasks,
    pendingTasks: tasks.filter(t => t.status === 'pending'),
    inProgressTasks: tasks.filter(t => t.status === 'in_progress'),
    isLoading,
    error,
    refresh: fetchTasks,
    create: createTask,
    update: updateTask,
    complete: completeTask,
    remove: deleteTask,
    getByEnergy: getTasksByEnergy,
    getOverdue: getOverdueTasks,
  };
}

/**
 * Hook for a single task
 */
export function useTask(taskId: string) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      setIsLoading(true);
      const result = await taskRepo.getTaskById(taskId);
      setTask(result || null);
      setIsLoading(false);
    };

    fetchTask();
  }, [taskId]);

  const update = useCallback(async (data: Partial<Task>) => {
    const updated = await taskRepo.updateTask(taskId, data);
    if (updated) setTask(updated);
  }, [taskId]);

  const complete = useCallback(async (actualMinutes?: number) => {
    const updated = await taskRepo.completeTask(taskId, actualMinutes);
    if (updated) setTask(updated);
  }, [taskId]);

  return {
    task,
    isLoading,
    update,
    complete,
  };
}
