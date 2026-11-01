/**
 * Cold Start Insights
 *
 * Generates helpful, encouraging insights for users with < 7 days of data.
 * These fill the insights tab during the critical first week
 * when statistical engines can't produce meaningful results.
 */

import { pick, daySeed, fill } from './insightTemplates';
import type { GeneratedInsight } from './insights';

// ==========================================
// TYPES
// ==========================================

export interface ColdStartInput {
  daysTracked: number;                    // 0-6
  totalCompletionsToday: number;
  totalHabitsActive: number;
  habitNames: string[];
  longestCurrentStreak: number;
  hasEnergyLog: boolean;
}

// ==========================================
// GENERATOR
// ==========================================

export function generateColdStartInsights(input: ColdStartInput): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];
  const seed = daySeed('cold');

  // ---- Day 0-1: Welcome & setup validation ----
  if (input.daysTracked <= 1) {
    out.push({
      type: 'achievement',
      priority: 'high',
      title: pick([
        '🎉 Welcome — You Just Started Something Big',
        '🚀 Day 1: The Hardest Part Is Done',
        '💪 You Showed Up. That\'s Step One.',
      ], seed + ':welcome'),
      summary: pick([
        `You've set up ${input.totalHabitsActive} habits. Most people never get past thinking about it.`,
        `${input.totalHabitsActive} habits tracked. The act of starting puts you ahead of 90% of people.`,
        `Day 1 with ${input.totalHabitsActive} habits. Research says just tracking increases success by 40%.`,
      ], seed + ':welcome:s'),
      detailedAnalysis:
        `You've started tracking ${input.totalHabitsActive} habits: ${input.habitNames.join(', ')}.\n\n` +
        `Here's what happens next:\n\n` +
        `• Days 1-7: The system learns your patterns\n` +
        `• Days 7-14: You'll start seeing correlations and predictions\n` +
        `• Days 14-30: Personalized insights get increasingly accurate\n\n` +
        `For now, just focus on showing up. Consistency beats perfection.`,
      scientificExplanation:
        'The mere act of self-monitoring changes behavior (the "Hawthorne effect"). ' +
        'Studies show that tracking a behavior — even without trying to change it — ' +
        'improves outcomes by 20-40%.',
      confidence: 90,
      actionLabel: 'View Habits',
      actionType: 'habit',
      isRead: false,
      isDismissed: false,
      score: 95,
    });
  }

  // ---- Day 2-3: Early encouragement ----
  if (input.daysTracked >= 2 && input.daysTracked <= 3) {
    out.push({
      type: 'achievement',
      priority: 'medium',
      title: pick([
        `📅 Day ${input.daysTracked} — Momentum Building`,
        `Day ${input.daysTracked}: You Came Back`,
        `${input.daysTracked} Days In. Keep Going.`,
      ], seed + ':early'),
      summary: pick([
        'Returning on day 2-3 is the biggest predictor of long-term success.',
        'Most people quit after day 1. You didn\'t. That matters.',
        'The first 3 days build the foundation. You\'re laying it right now.',
      ], seed + ':early:s'),
      detailedAnalysis:
        `You've tracked habits for ${input.daysTracked} days now.\n\n` +
        `Why this matters: Research from University College London found that ` +
        `the first 3 days of a new behavior are when 60% of people drop off. ` +
        `By day 4, the probability of continuing to day 30 increases significantly.\n\n` +
        `Current stats:\n` +
        `• Active habits: ${input.totalHabitsActive}\n` +
        `• Completions today: ${input.totalCompletionsToday}\n\n` +
        `🔮 In ${7 - input.daysTracked} more days, your first personalized insights will unlock.`,
      scientificExplanation:
        'Habit formation follows a non-linear curve. The first 3-4 days require the most willpower. ' +
        'After that, each repetition requires measurably less prefrontal cortex activation.',
      confidence: 80,
      isRead: false,
      isDismissed: false,
      score: 80,
    });
  }

  // ---- Day 4-6: Countdown to insights ----
  if (input.daysTracked >= 4 && input.daysTracked <= 6) {
    const daysUntilInsights = 7 - input.daysTracked;

    out.push({
      type: 'prediction',
      priority: 'medium',
      title: pick([
        `🔮 ${daysUntilInsights} Day${daysUntilInsights > 1 ? 's' : ''} Until Personalized Insights`,
        `Almost There: Insights Unlock Soon`,
        `Your Data Is Building — ${daysUntilInsights} More Day${daysUntilInsights > 1 ? 's' : ''}`,
      ], seed + ':countdown'),
      summary: pick([
        `After ${daysUntilInsights} more day${daysUntilInsights > 1 ? 's' : ''} of tracking, you'll unlock correlations, predictions, and patterns.`,
        `We need just ${daysUntilInsights} more day${daysUntilInsights > 1 ? 's' : ''} of data to start finding what drives your best days.`,
        `Keep going — in ${daysUntilInsights} day${daysUntilInsights > 1 ? 's' : ''} the intelligence engine has enough data to work with.`,
      ], seed + ':countdown:s'),
      detailedAnalysis:
        `You've been tracking for ${input.daysTracked} days. The analysis engines need 7 days minimum to:\n\n` +
        `• Detect which habits correlate with your best days\n` +
        `• Identify your peak performance hours\n` +
        `• Predict tomorrow's energy levels\n` +
        `• Find hidden patterns in your behavior\n\n` +
        `Every day you track makes the insights more accurate.\n\n` +
        `Current data points collected: ~${input.daysTracked * input.totalHabitsActive}`,
      scientificExplanation:
        'Statistical significance requires minimum sample sizes. ' +
        'With 7+ days of multi-variable data, correlation analysis achieves meaningful confidence levels.',
      confidence: 60,
      isRead: false,
      isDismissed: false,
      score: 70,
    });
  }

  // ---- Tip of the day (all cold-start days) ----
  const tips: Array<{ title: string; summary: string; detail: string; science: string }> = [
    {
      title: '💡 Tip: Start Embarrassingly Small',
      summary: 'The best habit is one you actually do. Scale down until it feels too easy.',
      detail:
        'If you\'re struggling with a habit, make it smaller:\n\n' +
        '• "Meditate 20 min" → "Meditate 2 min"\n' +
        '• "Read 30 pages" → "Read 1 page"\n' +
        '• "Workout 1 hour" → "Do 5 pushups"\n\n' +
        'The goal isn\'t the activity — it\'s building the neural pathway. ' +
        'Intensity can increase later. Consistency first.',
      science:
        'BJ Fogg\'s "Tiny Habits" research at Stanford shows that shrinking the behavior ' +
        'below the motivation threshold eliminates the willpower bottleneck entirely.',
    },
    {
      title: '💡 Tip: Stack Your Habits',
      summary: 'Attach a new habit to one you already do. "After I [existing], I will [new]."',
      detail:
        'Habit stacking uses existing neural pathways as triggers:\n\n' +
        '• "After I pour my coffee, I journal for 2 minutes"\n' +
        '• "After I sit at my desk, I review my 3 priorities"\n' +
        '• "After dinner, I read for 10 minutes"\n\n' +
        'The existing habit acts as an automatic cue, removing the need to remember.',
      science:
        'Implementation intentions ("if-then" plans) increase follow-through by 2-3x ' +
        'compared to motivation alone (Gollwitzer, 1999).',
    },
    {
      title: '💡 Tip: Don\'t Break the Chain',
      summary: 'Track your streaks. The visual chain becomes its own motivation.',
      detail:
        'Jerry Seinfeld\'s productivity secret: mark an X on a calendar for each day you do your habit. ' +
        'After a few days, you have a chain. "Don\'t break the chain" becomes the motivation.\n\n' +
        'This works because:\n' +
        '• Loss aversion is stronger than gain motivation\n' +
        '• Visual progress creates dopamine\n' +
        '• Identity shifts: "I\'m someone who does this daily"',
      science:
        'Loss aversion (Kahneman & Tversky) makes the psychological cost of breaking a streak ' +
        '~2x more motivating than the reward of extending it.',
    },
    {
      title: '💡 Tip: Environment > Willpower',
      summary: 'Design your space so good habits are easy and bad habits are hard.',
      detail:
        'Willpower is a limited resource. Environment design is unlimited:\n\n' +
        '• Want to read more? Put a book on your pillow.\n' +
        '• Want to work out? Sleep in your gym clothes.\n' +
        '• Want to eat better? Don\'t keep junk food in the house.\n\n' +
        'Reduce friction for good habits. Add friction for bad ones.',
      science:
        'Wendy Wood\'s research shows that 43% of daily behaviors are performed in the same location ' +
        'each day. Environmental cues drive behavior more than conscious decisions.',
    },
    {
      title: '💡 Tip: Track Energy, Not Just Completion',
      summary: 'Log your energy levels to discover when you\'re naturally at your best.',
      detail:
        'Completing a habit at 6 AM vs 6 PM can have very different effects on your day.\n\n' +
        'Try logging your energy a few times a day. After a week, the app can tell you:\n' +
        '• Your peak cognitive hours\n' +
        '• When to schedule creative work\n' +
        '• When to rest instead of push\n\n' +
        'This unlocks circadian insights — one of the most powerful features.',
      science:
        'Circadian rhythms create predictable 90-120 minute cycles of alertness (ultradian rhythms). ' +
        'Aligning demanding work with peak cycles improves output by 20-40%.',
    },
    {
      title: '💡 Tip: The Two-Day Rule',
      summary: 'Never miss twice. One day off is rest. Two days off is a new pattern.',
      detail:
        'Missing one day barely affects habit strength. Missing two consecutive days ' +
        'significantly increases the chance of quitting.\n\n' +
        'The rule: Never miss twice in a row.\n\n' +
        '• Missed yesterday? Today is non-negotiable.\n' +
        '• Feeling low? Do the absolute minimum version.\n' +
        '• A 1-minute meditation is infinitely better than no meditation.',
      science:
        'Lally et al. (2010) found that missing a single day did not materially affect habit formation. ' +
        'However, multiple consecutive misses significantly delayed or prevented automaticity.',
    },
    {
      title: '💡 Tip: Celebrate Tiny Wins',
      summary: 'Feel good about completing a habit — even a small one. Emotion cements behavior.',
      detail:
        'After completing a habit, take 2 seconds to feel good about it.\n\n' +
        '• A small fist pump\n' +
        '• Saying "nice" to yourself\n' +
        '• A moment of genuine satisfaction\n\n' +
        'This isn\'t silly — it\'s neuroscience. Positive emotion after a behavior is ' +
        'the single most effective way to make it stick.',
      science:
        'BJ Fogg\'s research shows that immediate positive emotion (not delayed rewards) ' +
        'is what wires habits into the basal ganglia. "Emotions create habits."',
    },
  ];

  const tipIdx = input.daysTracked % tips.length;
  const tip = tips[tipIdx];

  out.push({
    type: 'pattern',
    priority: 'low',
    title: tip.title,
    summary: tip.summary,
    detailedAnalysis: tip.detail,
    scientificExplanation: tip.science,
    confidence: 85,
    isRead: false,
    isDismissed: false,
    score: 50,
  });

  // ---- First streak! ----
  if (input.longestCurrentStreak >= 2 && input.daysTracked <= 6) {
    out.push({
      type: 'achievement',
      priority: 'medium',
      title: `🔥 Your First Streak: ${input.longestCurrentStreak} Days!`,
      summary: 'A streak has begun. Small but real. Protect it.',
      detailedAnalysis:
        `You have a ${input.longestCurrentStreak}-day streak going.\n\n` +
        `In the first week, this is a huge signal. It means the behavior ` +
        `is already starting to wire into your routine.\n\n` +
        `Tip: If today feels hard, do the absolute smallest version of the habit. ` +
        `A 1-minute version counts. The streak is what matters right now.`,
      scientificExplanation:
        'Early streaks are disproportionately important because they establish the ' +
        '"consistency identity" — the self-concept of being someone who follows through.',
      confidence: 75,
      isRead: false,
      isDismissed: false,
      score: 65,
    });
  }

  // ---- Energy log nudge ----
  if (!input.hasEnergyLog && input.daysTracked >= 2) {
    out.push({
      type: 'optimization',
      priority: 'low',
      title: '⚡ Unlock Energy Insights',
      summary: 'Log your energy level to unlock circadian insights and smarter scheduling.',
      detailedAnalysis:
        'The energy tracker lets you log how you feel at different times of day.\n\n' +
        'After a few days, the app will:\n' +
        '• Map your natural energy curve\n' +
        '• Suggest optimal times for different tasks\n' +
        '• Warn you before energy dips\n' +
        '• Identify your chronotype (early bird / night owl)\n\n' +
        'It takes 10 seconds per log. Try it 2-3 times today.',
      scientificExplanation:
        'Self-monitoring of energy states improves metacognitive awareness, ' +
        'allowing proactive scheduling rather than reactive time management.',
      confidence: 70,
      actionLabel: 'Log Energy',
      actionType: 'energy',
      isRead: false,
      isDismissed: false,
      score: 45,
    });
  }

  return out;
}