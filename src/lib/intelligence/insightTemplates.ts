/**
 * Insight Template Engine
 *
 * Provides varied, human, coach-like phrasings for every insight type.
 * Uses date-seeded randomness so the same day yields consistent titles
 * (good for dedup) while different days feel fresh.
 */

// ==========================================
// UTILITIES
// ==========================================

/** Deterministic hash for a string (FNV-1a inspired) */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) | 0;
  }
  return h >>> 0; // unsigned
}

/**
 * Pick from an array deterministically based on a seed.
 * Same seed → same pick.  Different seed → different pick.
 */
export function pick<T>(arr: T[], seed: string): T {
  if (arr.length === 0) throw new Error('pick: empty array');
  return arr[hashStr(seed) % arr.length];
}

/** Pick randomly (for non-critical variety) */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Interpolate {{var}} placeholders */
export function fill(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v !== undefined ? String(v) : '';
  });
}

/** Today as YYYY-MM-DD for seeding */
export function todaySeed(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Combine a category key with today to get a unique-per-category-per-day seed */
export function daySeed(category: string): string {
  return `${todaySeed()}:${category}`;
}

// ==========================================
// TYPES
// ==========================================

export interface TemplatePool {
  titles: string[];
  summaries: string[];
}

// ==========================================
// CORRELATION TEMPLATES
// ==========================================

export const correlationSuperpower: TemplatePool = {
  titles: [
    '{{name}} Is Your #1 Habit',
    'The {{name}} Effect Is Real',
    'Your Secret Weapon: {{name}}',
    'Why {{name}} Changes Everything',
    'Found It — {{name}} Drives Your Best Days',
    'The Data Is Clear: {{name}} Works',
    'Double Down on {{name}}',
  ],
  summaries: [
    'Days when you complete {{name}} score {{diff}}% higher on average.',
    'There\'s a {{corr}}% positive link between {{name}} and your peak days.',
    'Your data tells a clear story: {{name}} and great days go hand-in-hand.',
    'Out of all your habits, {{name}} has the strongest pull on performance.',
    'When {{name}} gets done, everything else tends to follow.',
    'Skip this one and you feel it. The numbers confirm what you already sense.',
  ],
};

export const correlationRethink: TemplatePool = {
  titles: [
    'Worth Rethinking: {{name}}',
    'A Surprising Signal About {{name}}',
    'Is {{name}} Helping or Hurting?',
    '{{name}} — Time for a Tweak?',
    'The {{name}} Paradox',
    'Let\'s Talk About {{name}}',
  ],
  summaries: [
    '{{name}} shows a negative link to your performance. It might be timing, not the habit itself.',
    'Your best days tend to be ones where {{name}} was skipped. Worth investigating.',
    'The data suggests {{name}} may be costing more energy than it returns.',
    'This doesn\'t mean {{name}} is bad — but something about how or when you do it isn\'t clicking.',
    'There\'s friction around {{name}}. Small adjustments could flip this.',
  ],
};

export const correlationMultiplier: TemplatePool = {
  titles: [
    'Your Habit Stack Is Powerful',
    'Multiplier Effect Detected',
    'These Habits Amplify Each Other',
    'Your Winning Combination',
    'The Compound Effect in Your Data',
    'Stack Power: {{count}} Habits Working Together',
  ],
  summaries: [
    '{{names}} form a high-impact stack. Together they\'re stronger than alone.',
    'When you complete {{names}} on the same day, performance jumps {{boost}}%.',
    'Your top {{count}} habits create a compounding loop. Protect this stack.',
    'These habits reinforce each other — completing one makes the next easier.',
    'Your data shows a clear multiplier when {{names}} align.',
  ],
};

// ==========================================
// PATTERN TEMPLATES
// ==========================================

export const patternSuccess: TemplatePool = {
  titles: [
    '💡 {{name}}',
    'Pattern Unlocked: {{name}}',
    'This Is Working: {{name}}',
    'Your {{name}} Pattern',
    '{{name}} — And It Shows',
  ],
  summaries: [
    '{{description}}',
    'We spotted something: {{description}}',
    'Your data reveals a pattern — {{description}}',
    'Here\'s a strength you might not realize: {{description}}',
  ],
};

export const patternRisk: TemplatePool = {
  titles: [
    '⚠️ Watch Out: {{name}}',
    'Pattern Alert: {{name}}',
    'Something to Address: {{name}}',
    'Heads Up — {{name}}',
  ],
  summaries: [
    '{{description}}',
    'Your data flagged this: {{description}}',
    'This pattern is worth correcting early — {{description}}',
  ],
};

export const patternOpportunity: TemplatePool = {
  titles: [
    '🔓 Untapped: {{name}}',
    'Opportunity: {{name}}',
    'Room to Grow: {{name}}',
    'What If? {{name}}',
  ],
  summaries: [
    '{{description}}',
    'There\'s upside here — {{description}}',
    'A small shift could unlock this: {{description}}',
  ],
};

// ==========================================
// PREDICTION TEMPLATES
// ==========================================

export const predictionStrong: TemplatePool = {
  titles: [
    '🚀 Tomorrow Looks Strong',
    'High-Performance Day Ahead',
    'Get Ready — Tomorrow\'s Your Day',
    'Momentum Is Building',
    'Conditions Are Right for a Great Day',
    'Stars Align Tomorrow',
  ],
  summaries: [
    'Predicted score: {{score}}%. Schedule your hardest work for tomorrow.',
    'Based on your rhythm, tomorrow could be a {{score}}% day. Make it count.',
    'Everything points to a strong day. Front-load your priorities.',
    'Your patterns say tomorrow is prime time. Don\'t waste it on busy-work.',
    'High-energy day predicted ({{score}}%). Tackle what matters most.',
  ],
};

export const predictionTough: TemplatePool = {
  titles: [
    '📉 Plan for a Lighter Day',
    'Tomorrow Needs Strategy',
    'Navigate Tomorrow Wisely',
    'Energy Dip Expected',
    'Be Gentle With Tomorrow',
  ],
  summaries: [
    'Predicted score: {{score}}%. Lighter schedule recommended.',
    'Tomorrow may be tougher ({{score}}%). Focus on essentials and rest.',
    'Your rhythm suggests lower energy tomorrow. Protect your basics.',
    'Not every day is a peak day — and that\'s fine. Plan accordingly.',
    'Lower energy forecasted. Do fewer things, but do them well.',
  ],
};

// ==========================================
// WARNING TEMPLATES
// ==========================================

export const warningBurnout: TemplatePool = {
  titles: [
    '🔋 Your Battery Is Getting Low',
    'Burnout Radar: Take Notice',
    'Time to Protect Your Energy',
    'Warning: You\'re Running Hot',
    'Slow Down Signal Detected',
    'Your System Needs a Recharge',
  ],
  summaries: [
    'Burnout risk at {{risk}}%. Your recent pace isn\'t sustainable.',
    'Multiple signals suggest you\'re overextended. Prevention is easier than recovery.',
    'Risk level: {{risk}}%. Schedule recovery before your body forces it.',
    'You\'ve been pushing hard. The data says it\'s time to ease off.',
    'Burnout doesn\'t announce itself — these early signals matter.',
  ],
};

export const warningStreak: TemplatePool = {
  titles: [
    '🔥 Your Streak Needs You Today',
    'Don\'t Break the Chain',
    'Streak Alert: Act Now',
    '{{days}}-Day Streak on the Line',
    'Protect What You\'ve Built',
  ],
  summaries: [
    '{{days}}-day streak with {{survival}}% survival odds. Even a minimal effort counts.',
    'Your streak is vulnerable today. A quick check-in can save it.',
    'You\'ve built {{days}} days of momentum. Don\'t let today be the gap.',
    'Low energy? Do the smallest possible version. Streaks survive on consistency, not perfection.',
  ],
};

export const warningAnomaly: TemplatePool = {
  titles: [
    '📊 Unusual Pattern Detected',
    'Something Changed Recently',
    'Your Data Flagged This',
    'Worth a Look: Recent Shift',
  ],
  summaries: [
    '{{description}}',
    'We noticed a shift: {{description}}',
    'This stood out in your recent data: {{description}}',
  ],
};

// ==========================================
// ACHIEVEMENT / CELEBRATION TEMPLATES
// ==========================================

export const celebrationStreak: TemplatePool = {
  titles: [
    '🎯 {{days}}-Day Streak!',
    '{{days}} Days Strong 🔥',
    'Milestone: {{days}} Days Running',
    '{{days}} Days. That\'s Not Luck — That\'s You.',
    'Day {{days}} — Still Going 💪',
  ],
  summaries: [
    '{{days}} consecutive days of {{name}}. You\'ve built something real.',
    'Most people never make it this far. You\'re at {{days}} days and counting.',
    'At {{days}} days, this isn\'t a habit — it\'s part of who you are.',
    '{{days}} days of showing up. That\'s discipline made visible.',
    'You\'ve done {{name}} for {{days}} straight days. The compound effect is kicking in.',
  ],
};

export const celebrationRecord: TemplatePool = {
  titles: [
    '🏆 New Personal Best!',
    'You Just Set a Record',
    'Best Day Ever (So Far)',
    'PR Alert! 🎉',
    'A Day for the Books',
  ],
  summaries: [
    'You completed {{count}} habits today — your all-time best.',
    'Today was your most productive day on record. {{count}} habits ✓.',
    '{{count}} habits done in one day. You\'ve never hit this before!',
    'Personal record shattered: {{count}} completions in a single day.',
  ],
};

export const celebrationConsistency: TemplatePool = {
  titles: [
    '📈 Your Best Week Yet',
    'This Week Was Different',
    'Consistency Level: Unlocked',
    'Week-Over-Week Growth',
    'The Trend Is Unmistakable',
  ],
  summaries: [
    '{{thisWeek}}% completion this week vs {{lastWeek}}% last week. Real progress.',
    'You improved by {{diff}} percentage points week over week. Momentum is building.',
    'This was your most consistent week in a while — {{thisWeek}}% completion rate.',
    'From {{lastWeek}}% to {{thisWeek}}%. Small gains, big trajectory.',
  ],
};

export const celebrationComeback: TemplatePool = {
  titles: [
    '💪 The Comeback Is Real',
    'Back on Track',
    'You Bounced Back',
    'Resilience in Action',
    'Down but Never Out',
  ],
  summaries: [
    'After a rough patch, you\'re climbing back. Today proves it.',
    'You slipped, but you showed up again. That\'s what matters most.',
    'Comebacks are harder than streaks. Respect to you for this one.',
    'Getting back on track after a break is the hardest part. You just did it.',
  ],
};

// ==========================================
// OPTIMIZATION TEMPLATES
// ==========================================

export const optimizationPeakWindow: TemplatePool = {
  titles: [
    '⚡ Peak Window Approaching',
    'Your Golden Hours Are Coming',
    'Time to Lock In',
    'High-Performance Window Ahead',
  ],
  summaries: [
    'Your optimal window is {{start}}:00–{{end}}:00. Avg score: {{score}}%.',
    'In ~{{minutes}} minutes you\'ll hit peak cognitive mode. Prep your hardest task.',
    'Your brain enters its best zone around {{start}}:00. Don\'t waste it.',
    'Historical pattern: you\'re sharpest between {{start}}:00 and {{end}}:00.',
  ],
};

export const optimizationAtPeak: TemplatePool = {
  titles: [
    '🧠 You\'re at Peak Energy Right Now',
    'This Is Your Moment',
    'Peak Mode: Active',
    'Your Brain Is Firing on All Cylinders',
  ],
  summaries: [
    'Current energy: {{score}}% ({{pct}}% of your max). Do your most important work now.',
    'Right now you\'re at {{pct}}% of peak capacity. Deep work will feel easier.',
    'This is your highest-leverage hour. Focus on what truly matters.',
    'You\'re in the zone. Avoid meetings and interruptions if you can.',
  ],
};

// ==========================================
// DISCOVERY / MICRO-INSIGHT TEMPLATES
// ==========================================

export const discoveryComparison: TemplatePool = {
  titles: [
    '📊 This Week vs Last Week',
    'Your 7-Day Snapshot',
    'How This Week Stacked Up',
    'Weekly Check-In',
  ],
  summaries: [
    'Habits: {{thisWeek}}% vs {{lastWeek}}% last week. {{verdict}}',
    'This week you completed {{thisCount}} habits vs {{lastCount}} last week. {{verdict}}',
    '7-day completion rate: {{thisWeek}}%. {{trendWord}} from {{lastWeek}}%.',
  ],
};

export const discoveryFunFact: TemplatePool = {
  titles: [
    '✨ Did You Know?',
    'A Fun One From Your Data',
    'By the Numbers',
    'Data Snack 📊',
    'Your Habit Odometer',
  ],
  summaries: [
    'You\'ve completed habits {{total}} times total. That\'s {{total}} decisions to show up.',
    'Your most reliable habit is {{topHabit}} at {{topRate}}% completion.',
    'You\'ve been tracking for {{days}} days. Consistency builds in weeks, transforms in months.',
    '{{bestDay}} is statistically your strongest day. Make it count.',
    'Your longest streak ever: {{longestStreak}} days of {{streakHabit}}.',
  ],
};

export const discoveryQuestion: TemplatePool = {
  titles: [
    '🤔 Something to Think About',
    'A Question From Your Data',
    'Have You Noticed This?',
    'Worth Reflecting On',
  ],
  summaries: [
    'Your best days almost always include {{topHabit}}. Coincidence?',
    'You complete more habits on {{bestDay}}s. What\'s different about that day?',
    'When you do {{habit1}} and {{habit2}} together, performance spikes. Why might that be?',
    'Your completion rate dips every {{worstDay}}. Is there a scheduling conflict?',
  ],
};

// ==========================================
// SCIENCE EXPLANATION POOLS
// ==========================================

export const scienceByKeyword: Record<string, string[]> = {
  meditat: [
    'Meditation increases prefrontal cortex activity and reduces amygdala reactivity, improving focus and emotional regulation.',
    'Just 10 minutes of daily meditation measurably reduces cortisol and increases gray matter density within 8 weeks.',
    'Mindfulness practice quiets the default mode network — the brain\'s "wandering" circuit — leading to sharper attention.',
    'Regular meditation strengthens the anterior cingulate cortex, which governs self-regulation and adaptive decision-making.',
  ],
  exercis: [
    'Exercise triggers BDNF release, enhancing neuroplasticity, memory formation, and cognitive function.',
    'Just 20 minutes of moderate exercise boosts cognitive performance for up to 2 hours afterward.',
    'Regular exercise increases hippocampal volume by up to 2%, directly improving learning capacity.',
    'Physical activity reduces inflammation markers that impair brain function, creating a clearer mental state.',
  ],
  workout: [
    'Resistance training elevates BDNF and IGF-1, both critical for neural growth and cognitive sharpness.',
    'Post-workout blood flow to the prefrontal cortex peaks for ~90 minutes — ideal for complex thinking.',
  ],
  sleep: [
    'Quality sleep consolidates memories and clears metabolic waste. Missing it impairs prefrontal function by up to 40%.',
    'Deep sleep triggers glymphatic clearance — your brain\'s nightly detox cycle. Skipping it has compounding costs.',
    'Sleep deprivation affects decision-making as much as moderate alcohol intoxication.',
  ],
  read: [
    'Reading activates multiple brain regions simultaneously, strengthening neural connectivity and cognitive reserve.',
    'Regular reading builds vocabulary, pattern recognition, and empathy networks — compound cognitive benefits.',
  ],
  journal: [
    'Expressive writing reduces cognitive load by externalizing worries, freeing working memory for productive thought.',
    'Journaling activates the brain\'s "interpreter" function, transforming vague stress into manageable specifics.',
  ],
  writ: [
    'Writing by hand engages motor cortex pathways that typing doesn\'t, deepening encoding and retention.',
  ],
  water: [
    'Even 1–2% dehydration measurably impairs cognitive performance and mood. Hydration is brain fuel.',
    'The brain is ~75% water. Adequate hydration supports neurotransmitter production and electrical signaling.',
  ],
  walk: [
    'Walking increases cerebral blood flow by ~15%, enhancing creative thinking and problem-solving.',
    'A 20-minute walk generates more novel ideas than sitting, per Stanford research. Movement unlocks thinking.',
  ],
  gratitud: [
    'Gratitude practice increases activity in the medial prefrontal cortex, associated with learning and decision-making.',
    'Regular gratitude rewires the brain\'s negativity bias, measurably increasing baseline happiness within 3 weeks.',
  ],
  stretch: [
    'Stretching reduces cortisol and activates the parasympathetic nervous system, lowering background stress levels.',
  ],
  cold: [
    'Cold exposure triggers norepinephrine release (200-300% increase), dramatically improving focus and mood.',
  ],
  breath: [
    'Controlled breathing activates the vagus nerve, shifting the nervous system from fight-or-flight to rest-and-digest.',
    'Box breathing (4-4-4-4) reduces amygdala activation within 90 seconds — the fastest stress intervention available.',
  ],
};

export const scienceGenericPositive: string[] = [
  'Consistent habits build stronger neural pathways through long-term potentiation, making positive behaviors increasingly automatic.',
  'Habit loops (cue → routine → reward) create self-reinforcing circuits in the basal ganglia, reducing the willpower cost over time.',
  'Completing a planned action triggers a dopamine feedback loop, strengthening the neural pathway for future execution.',
  'Research shows it takes 18–254 days (median 66) for a behavior to become automatic. Consistency matters more than intensity.',
];

export const scienceGenericNegative: string[] = [
  'When a habit consistently correlates with lower performance, it may be consuming willpower or time from higher-impact activities.',
  'Not all habits serve us equally. Periodic review of habit ROI (return on investment of time and energy) is evidence-based practice.',
  'Habit interference occurs when one routine competes for the same temporal or cognitive resources as another. Timing adjustments often help.',
];

export const scienceGenericNeutral: string[] = [
  'The relationship between this habit and performance isn\'t clear yet. Continued tracking will reveal the signal.',
  'Some habits have delayed effects that take weeks to surface in data. Patience and consistency yield clearer patterns.',
];

/**
 * Find the best science explanation for a habit by name
 */
export function pickScience(habitName: string, correlation: number, seed: string): string {
  const lower = habitName.toLowerCase();

  for (const [keyword, explanations] of Object.entries(scienceByKeyword)) {
    if (lower.includes(keyword)) {
      return pick(explanations, seed + ':science');
    }
  }

  if (correlation > 0.3) return pick(scienceGenericPositive, seed + ':science');
  if (correlation < -0.3) return pick(scienceGenericNegative, seed + ':science');
  return pick(scienceGenericNeutral, seed + ':science');
}