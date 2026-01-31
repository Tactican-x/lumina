/**
 * Seed Data
 * Demo data for testing and development
 */

import { generateId } from './database';
import * as habitRepo from './repositories/habits';
import * as goalRepo from './repositories/goals';
import * as taskRepo from './repositories/tasks';
import * as energyRepo from './repositories/energy';
import * as insightRepo from './repositories/insights';
import { formatDateKey } from '@/utils/date';

/**
 * Seed the database with demo data
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Clear existing data (optional - for dev only)
  // await clearAllData();

  // Seed habits
  await seedHabits();

  // Seed goals
  await seedGoals();

  // Seed tasks
  await seedTasks();

  // Seed energy logs
  await seedEnergyLogs();

  // Seed insights
  await seedInsights();

  console.log('✅ Database seeded successfully!');
}

async function seedHabits(): Promise<void> {
  const habits = [
    {
      name: 'Morning Meditation',
      description: '10 minutes of mindfulness',
      icon: 'brain',
      color: '#a855f7',
      frequency: 'daily' as const,
      timeOfDay: 'morning' as const,
      energyRequired: 'low' as const,
      isActive: true,
      order: 0,
    },
    {
      name: 'Exercise',
      description: '30+ minutes of physical activity',
      icon: 'dumbbell',
      color: '#ef4444',
      frequency: 'daily' as const,
      timeOfDay: 'morning' as const,
      energyRequired: 'high' as const,
      isActive: true,
      order: 1,
    },
    {
      name: 'Read',
      description: 'Read for at least 20 minutes',
      icon: 'book-open',
      color: '#10b981',
      frequency: 'daily' as const,
      timeOfDay: 'evening' as const,
      energyRequired: 'low' as const,
      isActive: true,
      order: 2,
    },
    {
      name: 'Drink Water',
      description: '8 glasses of water',
      icon: 'droplets',
      color: '#3b82f6',
      frequency: 'daily' as const,
      timeOfDay: 'anytime' as const,
      energyRequired: 'low' as const,
      isActive: true,
      order: 3,
    },
    {
      name: 'Journal',
      description: 'Reflect on the day',
      icon: 'pen-line',
      color: '#f59e0b',
      frequency: 'daily' as const,
      timeOfDay: 'evening' as const,
      energyRequired: 'medium' as const,
      isActive: true,
      order: 4,
    },
  ];

  for (const habit of habits) {
    const created = await habitRepo.createHabit(habit);

    // Add some historical completions (last 14 days, random)
    for (let i = 14; i >= 0; i--) {
      if (Math.random() > 0.3) { // 70% completion rate
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(Math.floor(Math.random() * 4) + 7); // 7-10 AM

        // Manually insert completion
        await habitRepo.completeHabit(created.id, {
          mood: Math.floor(Math.random() * 3) + 3, // 3-5
          energyBefore: Math.floor(Math.random() * 4) + 5, // 5-8
          energyAfter: Math.floor(Math.random() * 3) + 6, // 6-8
        });
      }
    }
  }

  console.log(`  ✓ Created ${habits.length} habits with historical data`);
}

async function seedGoals(): Promise<void> {
  const goals = [
    {
      title: 'Read 12 Books This Year',
      description: 'Expand knowledge through consistent reading',
      category: 'learning' as const,
      icon: 'book',
      color: '#10b981',
      targetValue: 12,
      currentValue: 4,
      unit: 'books',
      status: 'active' as const,
      targetDate: new Date(new Date().getFullYear(), 11, 31), // End of year
    },
    {
      title: 'Build Meditation Habit',
      description: 'Complete 100 meditation sessions',
      category: 'health' as const,
      icon: 'flower-2',
      color: '#a855f7',
      targetValue: 100,
      currentValue: 35,
      unit: 'sessions',
      status: 'active' as const,
      targetDate: new Date(Date.now() + 120 * 86400000), // 120 days
    },
    {
      title: 'Learn React Native',
      description: 'Build 3 complete mobile apps',
      category: 'career' as const,
      icon: 'code',
      color: '#3b82f6',
      targetValue: 3,
      currentValue: 1,
      unit: 'apps',
      status: 'active' as const,
      targetDate: new Date(Date.now() + 180 * 86400000), // 180 days
    },
  ];

  for (const goal of goals) {
    const created = await goalRepo.createGoal(goal);

    // Generate milestones
    if (goal.targetValue) {
      await goalRepo.generateMilestones(created.id, goal.targetValue, 4);
    }

    // Add some progress history
    const progressPoints = Math.floor(goal.currentValue / 2);
    for (let i = progressPoints; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      await goalRepo.addProgressEntry(
        created.id,
        Math.round(goal.currentValue * (1 - i / (progressPoints + 1))),
        `Progress update ${i}`
      );
    }
  }

  console.log(`  ✓ Created ${goals.length} goals with milestones`);
}

async function seedTasks(): Promise<void> {
  const tasks = [
    {
      title: 'Review project proposal',
      description: 'Go through the Q2 project proposal and provide feedback',
      priority: 'high' as const,
      status: 'pending' as const,
      type: 'analytical' as const,
      energyRequired: 'high' as const,
      estimatedMinutes: 45,
      dueDate: new Date(Date.now() + 2 * 86400000),
    },
    {
      title: 'Weekly team meeting',
      description: 'Sync with team on project progress',
      priority: 'medium' as const,
      status: 'pending' as const,
      type: 'communication' as const,
      energyRequired: 'medium' as const,
      estimatedMinutes: 60,
      scheduledFor: new Date(Date.now() + 86400000),
    },
    {
      title: 'Update documentation',
      description: 'Update API documentation with new endpoints',
      priority: 'low' as const,
      status: 'pending' as const,
      type: 'administrative' as const,
      energyRequired: 'low' as const,
      estimatedMinutes: 30,
    },
    {
      title: 'Brainstorm new features',
      description: 'Creative session for v2 features',
      priority: 'medium' as const,
      status: 'pending' as const,
      type: 'creative' as const,
      energyRequired: 'high' as const,
      estimatedMinutes: 90,
    },
    {
      title: 'Respond to emails',
      description: 'Clear inbox and respond to pending messages',
      priority: 'medium' as const,
      status: 'pending' as const,
      type: 'communication' as const,
      energyRequired: 'low' as const,
      estimatedMinutes: 20,
    },
  ];

  for (const task of tasks) {
    await taskRepo.createTask(task);
  }

  console.log(`  ✓ Created ${tasks.length} tasks`);
}

async function seedEnergyLogs(): Promise<void> {
  // Create energy logs for the past 7 days
  for (let day = 7; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);

    // Morning (8 AM)
    date.setHours(8, 0, 0, 0);
    await energyRepo.logEnergy(
      70 + Math.floor(Math.random() * 20),
      { sleep: 7 + Math.random(), caffeine: true },
      'Morning energy check'
    );

    // Mid-morning (10 AM)
    date.setHours(10, 0, 0, 0);
    await energyRepo.logEnergy(
      80 + Math.floor(Math.random() * 15),
      { caffeine: true },
      'Peak morning'
    );

    // Afternoon (2 PM)
    date.setHours(14, 0, 0, 0);
    await energyRepo.logEnergy(
      50 + Math.floor(Math.random() * 20),
      { meals: 2 },
      'Post-lunch dip'
    );

    // Late afternoon (5 PM)
    date.setHours(17, 0, 0, 0);
    await energyRepo.logEnergy(
      60 + Math.floor(Math.random() * 20),
      { exercise: Math.random() > 0.5 },
      'Afternoon recovery'
    );
  }

  console.log('  ✓ Created energy logs for past 7 days');
}

async function seedInsights(): Promise<void> {
  const insights = [
    {
      type: 'correlation' as const,
      priority: 'high' as const,
      title: 'Morning Meditation Multiplier Effect',
      summary: 'Your morning meditation strongly correlates with productive days',
      detailedAnalysis: 'When you meditate in the morning, your task completion rate increases by 34%. You also report 28% higher energy levels throughout the day.',
      scientificExplanation: 'Morning meditation activates the prefrontal cortex and reduces cortisol levels, creating optimal conditions for focused work.',
      confidence: 87,
      correlationValue: 0.89,
      pValue: 0.001,
      actionLabel: 'View Pattern',
      actionType: 'navigate' as const,
    },
    {
      type: 'pattern' as const,
      priority: 'medium' as const,
      title: 'Peak Performance Window Detected',
      summary: 'You perform best between 9-11 AM on Tuesday through Thursday',
      detailedAnalysis: 'Analysis of 30 days of data shows your task completion rate is 45% higher during this window. Consider scheduling important work here.',
      confidence: 82,
      actionLabel: 'Optimize Schedule',
      actionType: 'navigate' as const,
    },
    {
      type: 'warning' as const,
      priority: 'high' as const,
      title: 'Burnout Risk Elevated',
      summary: 'Your cognitive load has been 23% above baseline for 5 days',
      detailedAnalysis: 'Based on your task volume, completion patterns, and energy logs, you may be approaching burnout. Consider scheduling a recovery day within the next 48 hours.',
      scientificExplanation: 'Sustained high cognitive load depletes prefrontal cortex resources and increases cortisol, leading to reduced performance and eventual burnout.',
      confidence: 78,
      actionLabel: 'See Recovery Plan',
      actionType: 'navigate' as const,
    },
  ];

  for (const insight of insights) {
    await insightRepo.createInsight(insight);
  }

  console.log(`  ✓ Created ${insights.length} insights`);
}

/**
 * Check if database needs seeding
 */
export async function needsSeeding(): Promise<boolean> {
  const habits = await habitRepo.getAllHabits();
  return habits.length === 0;
}

/**
 * Seed if needed
 */
export async function seedIfNeeded(): Promise<void> {
  if (await needsSeeding()) {
    await seedDatabase();
  }
}
