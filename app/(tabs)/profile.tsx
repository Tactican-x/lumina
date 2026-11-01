// ==========================================
// FILE: profile.tsx — Journey Screen (FINAL)
// ==========================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { eq } from 'drizzle-orm';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { db } from '@/db/database';
import {
  users,
  habits,
  habitCompletions,
  type User,
  type UserSettings,
} from '@/db/schema';
import { formatDateKey } from '@/utils/date';

// ==========================================
// CONSTANTS
// ==========================================

const LOCAL_USER_ID = 'local-user';
const { width: SW } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.select({ ios: 80, android: 70 }) ?? 80;

// ==========================================
// HAPTICS
// ==========================================

function tapHaptic() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

function successHaptic() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

// ==========================================
// TYPES
// ==========================================

interface JourneyData {
  daysTracked: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number;
  heatmap: HeatmapDay[];
  chapters: Chapter[];
  insight: string;
}

interface HeatmapDay {
  dateKey: string;
  score: number;
  label: string;
  completed: number;
  total: number;
}

interface Chapter {
  id: string;
  emoji: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  achieved: boolean;
}

// ==========================================
// CARD COLOR THEMES
// ==========================================

const CARD_THEMES = {
  insight: { accent: '#818cf8', bg: '#1e1b4b' },
  heatmap: { accent: '#22c55e', bg: '#022c22' },
  numbers: { accent: '#fbbf24', bg: '#1c1917' },
  story:   { accent: '#c084fc', bg: '#1a0533' },
};

// ==========================================
// GLOW CARD
// ==========================================

function GlowCard({
  children,
  accentColor,
  bgColor,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  accentColor: string;
  bgColor?: string;
  delay?: number;
  style?: any;
}) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entranceTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideUp, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    const glowTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: false,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    }, delay + 600);

    return () => {
      clearTimeout(entranceTimer);
      clearTimeout(glowTimer);
    };
  }, [delay]);

  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.4],
  });

  const shadowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 18],
  });

  return (
    <Animated.View
      style={{
        marginBottom: spacing.md,
        borderRadius: 20,
        shadowColor: accentColor,
        shadowOpacity,
        shadowRadius,
        shadowOffset: { width: 0, height: 2 },
        elevation: 6,
      }}
    >
      <Animated.View
        style={[
          glowStyles.card,
          {
            backgroundColor: bgColor || colors.background.elevated,
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          },
          style,
        ]}
      >
        <View
          style={[glowStyles.accentStrip, { backgroundColor: accentColor }]}
        />
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const glowStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  accentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

// ==========================================
// DATE HELPER (includes today)
// ==========================================

function getLast90Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

// ==========================================
// CHAPTER DEFINITIONS
// ==========================================

function buildChapters(
  daysTracked: number,
  longestStreak: number,
  perfectWeeks: number,
  comebacks: number,
): Chapter[] {
  return [
    {
      id: 'first_step',
      emoji: '🌱',
      iconBg: '#10b98120',
      iconColor: '#10b981',
      title: 'First Step',
      subtitle: 'Tracked your first habit',
      achieved: daysTracked >= 1,
    },
    {
      id: 'one_week',
      emoji: '🔥',
      iconBg: '#f59e0b20',
      iconColor: '#f59e0b',
      title: 'One Week',
      subtitle: '7 days of tracking',
      achieved: daysTracked >= 7,
    },
    {
      id: 'habit_former',
      emoji: '💪',
      iconBg: '#8b5cf620',
      iconColor: '#8b5cf6',
      title: 'Habit Former',
      subtitle: '21-day streak — the habit is forming',
      achieved: longestStreak >= 21,
    },
    {
      id: 'perfect_week',
      emoji: '⭐',
      iconBg: '#eab30820',
      iconColor: '#eab308',
      title: 'Perfect Week',
      subtitle: 'All habits completed, 7 days straight',
      achieved: perfectWeeks >= 1,
    },
    {
      id: 'one_month',
      emoji: '📅',
      iconBg: '#3b82f620',
      iconColor: '#3b82f6',
      title: 'One Month',
      subtitle: '30 days of tracking',
      achieved: daysTracked >= 30,
    },
    {
      id: 'committed',
      emoji: '💎',
      iconBg: '#ec489920',
      iconColor: '#ec4899',
      title: 'Committed',
      subtitle: "66-day streak — it's who you are now",
      achieved: longestStreak >= 66,
    },
    {
      id: 'comeback',
      emoji: '❤️‍🔥',
      iconBg: '#ef444420',
      iconColor: '#ef4444',
      title: 'Comeback',
      subtitle: 'Fell off and came back stronger',
      achieved: comebacks >= 1,
    },
    {
      id: 'century',
      emoji: '🏆',
      iconBg: '#f59e0b20',
      iconColor: '#f59e0b',
      title: 'Century',
      subtitle: '100 days of tracking — legendary',
      achieved: daysTracked >= 100,
    },
  ];
}

// ==========================================
// DATA LAYER
// ==========================================

async function loadJourneyData(): Promise<JourneyData | null> {
  const activeHabits = await db
    .select()
    .from(habits)
    .where(eq(habits.isActive, true));

  if (activeHabits.length === 0) return null;

  const allCompletions = await db.select().from(habitCompletions);
  if (allCompletions.length === 0) return null;

  const today = new Date();
  const todayKey = formatDateKey(today);
  const sortedDays = getLast90Days();

  const startKey = formatDateKey(sortedDays[0]);
  const endKey = formatDateKey(sortedDays[sortedDays.length - 1]);

  const completions = allCompletions.filter(
    (c) => c.date >= startKey && c.date <= endKey,
  );

  const completionSet = new Set(
    completions.map((c) => `${c.habitId}|${c.date}`),
  );
  const totalCompletions = completions.length;
  const datesWithActivity = new Set(completions.map((c) => c.date));
  const daysTracked = datesWithActivity.size;

  const totalPossible = daysTracked * activeHabits.length;
  const completionRate =
    totalPossible > 0
      ? Math.round((totalCompletions / totalPossible) * 100)
      : 0;

  // Current streak
  let currentStreak = 0;
  let checkKey = todayKey;
  for (let i = 0; i < 400; i++) {
    if (completions.some((c) => c.date === checkKey)) {
      currentStreak++;
      const d = new Date(checkKey + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      checkKey = formatDateKey(d);
    } else break;
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const sortedDates = Array.from(datesWithActivity).sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1] + 'T12:00:00');
      const curr = new Date(sortedDates[i] + 'T12:00:00');
      const diff = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
      );
      tempStreak = diff === 1 ? tempStreak + 1 : 1;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  }

  // Heatmap
  const heatmap: HeatmapDay[] = sortedDays.map((d) => {
    const dateKey = formatDateKey(d);
    let done = 0;
    for (const h of activeHabits) {
      if (completionSet.has(`${h.id}|${dateKey}`)) done++;
    }
    const score = Math.round((done / activeHabits.length) * 100);
    const label = d.toLocaleDateString('en', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    return { dateKey, score, label, completed: done, total: activeHabits.length };
  });

  // Perfect weeks
  let perfectWeeks = 0;
  for (let i = 0; i <= sortedDays.length - 7; i++) {
    const week = sortedDays.slice(i, i + 7);
    const perfect = week.every((d) => {
      const dk = formatDateKey(d);
      return activeHabits.every((h) => completionSet.has(`${h.id}|${dk}`));
    });
    if (perfect) perfectWeeks++;
  }

  // Comebacks
  let comebacks = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = Math.round(
      (new Date(sortedDates[i] + 'T12:00:00').getTime() -
        new Date(sortedDates[i - 1] + 'T12:00:00').getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diff >= 3) comebacks++;
  }

  const chapters = buildChapters(daysTracked, longestStreak, perfectWeeks, comebacks);

  // Insight
  const recentScores = heatmap.slice(-14).map((d) => d.score);
  const recentAvg =
    recentScores.reduce((s, v) => s + v, 0) / (recentScores.length || 1);
  const prevScores = heatmap.slice(-28, -14).map((d) => d.score);
  const prevAvg =
    prevScores.length > 0
      ? prevScores.reduce((s, v) => s + v, 0) / prevScores.length
      : recentAvg;

  let insight: string;
  if (currentStreak >= 30) {
    insight = `${currentStreak} days without missing. This is no longer a habit — it's who you are.`;
  } else if (currentStreak >= 7 && recentAvg > prevAvg + 5) {
    insight = "Your last 2 weeks are stronger than your previous 2. You're accelerating.";
  } else if (longestStreak >= 21 && currentStreak < 7) {
    insight = `You've proven you can do ${longestStreak} days straight. The streak resets, not the proof.`;
  } else if (comebacks >= 2) {
    insight = `You've come back ${comebacks} times. Resilience is now one of your habits.`;
  } else if (daysTracked >= 30) {
    insight = `${daysTracked} days tracked. Most people quit by day 10. You didn't.`;
  } else if (perfectWeeks >= 1) {
    insight = `You've had ${perfectWeeks} perfect week${perfectWeeks > 1 ? 's' : ''}. You know you can do it.`;
  } else if (currentStreak >= 3) {
    insight = `${currentStreak} days in a row. Small streaks build big lives.`;
  } else {
    insight = "Every entry is a vote for the person you're becoming. Keep voting.";
  }

  return {
    daysTracked,
    currentStreak,
    longestStreak,
    totalCompletions,
    completionRate,
    heatmap,
    chapters,
    insight,
  };
}

// ==========================================
// ANIMATED HERO
// ==========================================

function AnimatedHero({
  displayName,
  initials,
  avatarUri,
  journey,
  onSettingsPress,
}: {
  displayName: string;
  initials: string;
  avatarUri: string | null;
  journey: JourneyData | null;
  onSettingsPress: () => void;
}) {
  const avatarScale = useRef(new Animated.Value(0)).current;
  const avatarRotate = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameSlide = useRef(new Animated.Value(20)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(30)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;
  const heroGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(avatarScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(avatarRotate, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(nameSlide, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(statsSlide, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, {
          toValue: 1.06,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(heroGlow, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(heroGlow, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const avatarSpin = avatarRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  const heroShadowOpacity = heroGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const heroShadowRadius = heroGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 28],
  });

  const streakLevel =
    (journey?.currentStreak ?? 0) >= 30
      ? 'legendary'
      : (journey?.currentStreak ?? 0) >= 7
        ? 'strong'
        : (journey?.currentStreak ?? 0) >= 3
          ? 'building'
          : 'starter';

  const ringColors: Record<string, string> = {
    starter: 'rgba(255,255,255,0.4)',
    building: '#34d399',
    strong: '#f59e0b',
    legendary: '#ef4444',
  };

  const heroGradients: Record<string, [string, string, string]> = {
    starter: [
      colors.brand?.primary ?? '#6366f1',
      colors.brand?.dark ?? '#4f46e5',
      '#3730a3',
    ],
    building: ['#6366f1', '#4f46e5', '#3730a3'],
    strong: ['#7c3aed', '#6d28d9', '#5b21b6'],
    legendary: ['#dc2626', '#b91c1c', '#991b1b'],
  };

  const glowColors: Record<string, string> = {
    starter: colors.brand?.primary ?? '#6366f1',
    building: '#10b981',
    strong: '#f59e0b',
    legendary: '#ef4444',
  };

  return (
    <Animated.View
      style={[
        heroStyles.cardOuter,
        {
          shadowColor: glowColors[streakLevel],
          shadowOpacity: heroShadowOpacity,
          shadowRadius: heroShadowRadius,
          shadowOffset: { width: 0, height: 4 },
          elevation: 12,
        },
      ]}
    >
      <LinearGradient
        colors={heroGradients[streakLevel]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={heroStyles.card}
      >
        <View style={heroStyles.decoCircle1} />
        <View style={heroStyles.decoCircle2} />
        <View style={heroStyles.decoCircle3} />

        <TouchableOpacity
          style={heroStyles.settingsBtn}
          onPress={() => {
            tapHaptic();
            onSettingsPress();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={heroStyles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>

        {journey && journey.currentStreak > 0 && (
          <View style={heroStyles.streakBadge}>
            <Text style={heroStyles.streakBadgeText}>
              🔥 {journey.currentStreak} day streak
            </Text>
          </View>
        )}

        <Animated.View
          style={[
            heroStyles.avatarOuter,
            {
              transform: [
                { scale: Animated.multiply(avatarScale, ringPulse) },
                { rotate: avatarSpin },
              ],
            },
          ]}
        >
          <View
            style={[
              heroStyles.avatarRing,
              { borderColor: ringColors[streakLevel] },
            ]}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={heroStyles.avatarImg} />
            ) : (
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                style={heroStyles.avatarFallback}
              >
                <Text style={heroStyles.avatarInitials}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: nameOpacity,
            transform: [{ translateY: nameSlide }],
            alignItems: 'center',
          }}
        >
          <Text style={heroStyles.name}>{displayName}</Text>
          {journey && (
            <Text style={heroStyles.subtitle}>
              {journey.daysTracked === 0
                ? 'Start your journey today'
                : journey.daysTracked === 1
                  ? 'Day 1 of your journey'
                  : `Day ${journey.daysTracked} of your journey`}
            </Text>
          )}
        </Animated.View>

        {journey && (
          <Animated.View
            style={[
              heroStyles.statsRow,
              {
                opacity: statsOpacity,
                transform: [{ translateY: statsSlide }],
              },
            ]}
          >
            <CounterStat value={journey.currentStreak} label="streak" icon="🔥" delay={0} />
            <View style={heroStyles.statDivider} />
            <CounterStat value={journey.daysTracked} label="tracked" icon="📅" delay={100} />
            <View style={heroStyles.statDivider} />
            <CounterStat
              value={journey.completionRate}
              label="rate"
              icon="📈"
              delay={200}
              suffix="%"
            />
          </Animated.View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

function CounterStat({
  value,
  label,
  icon,
  delay,
  suffix = '',
}: {
  value: number;
  label: string;
  icon: string;
  delay: number;
  suffix?: string;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (value > 0) {
        const steps = 20;
        const stepTime = 40;
        let current = 0;
        const counter = setInterval(() => {
          current++;
          const progress = current / steps;
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(eased * value));
          if (current >= steps) {
            clearInterval(counter);
            setDisplay(value);
          }
        }, stepTime);
        return () => clearInterval(counter);
      }
    }, 600 + delay);

    return () => clearTimeout(timer);
  }, [delay, value]);

  return (
    <Animated.View
      style={[heroStyles.stat, { opacity, transform: [{ scale }] }]}
    >
      <Text style={heroStyles.statIcon}>{icon}</Text>
      <Text style={heroStyles.statValue}>
        {display}
        {suffix}
      </Text>
      <Text style={heroStyles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// ==========================================
// HEATMAP COLOR SCALE
// Red → Orange → Yellow → Green gradient
// 0%   = dark red (missed)
// 1-25 = red-orange (barely tried)
// 26-50 = amber/orange (partial)
// 51-75 = yellow-green (good)
// 76-99 = light green (great)
// 100  = bright green (perfect)
// undefined = neutral dark (no data)
// ==========================================

const HEATMAP_COLORS = {
  noData:    '#1a1a2e',  // neutral dark — no habits that day
  missed:    '#991b1b',  // dark red — missed completely (0%)
  barely:    '#dc4a2c',  // red-orange — barely tried (1-25%)
  partial:   '#e67e22',  // amber/orange — partial effort (26-50%)
  good:      '#a3b836',  // yellow-green — good day (51-75%)
  great:     '#4ade80',  // light green — great day (76-99%)
  perfect:   '#22c55e',  // bright green — perfect day (100%)
};

function cellColor(score: number | undefined): string {
  if (score === undefined) return HEATMAP_COLORS.noData;   // no data
  if (score === 0)         return HEATMAP_COLORS.missed;   // dark red
  if (score <= 25)         return HEATMAP_COLORS.barely;   // red-orange
  if (score <= 50)         return HEATMAP_COLORS.partial;  // amber/orange
  if (score <= 75)         return HEATMAP_COLORS.good;     // yellow-green
  if (score < 100)         return HEATMAP_COLORS.great;    // light green
  return HEATMAP_COLORS.perfect;                           // bright green
}

function verdictColor(score: number): string {
  if (score === 100) return HEATMAP_COLORS.perfect;
  if (score >= 76)   return HEATMAP_COLORS.great;
  if (score >= 51)   return HEATMAP_COLORS.good;
  if (score >= 26)   return HEATMAP_COLORS.partial;
  if (score >= 1)    return HEATMAP_COLORS.barely;
  return HEATMAP_COLORS.missed;
}

function scoreVerdict(score: number): string {
  if (score === 100) return 'Perfect day ✨';
  if (score >= 76)   return 'Great day 💪';
  if (score >= 51)   return 'Good day 👍';
  if (score >= 26)   return 'Partial effort 🌤';
  if (score >= 1)    return 'Barely tried 😅';
  return 'Missed day 🔴';
}

// ==========================================
// HEATMAP
// ==========================================

function InteractiveHeatmap({ data }: { data: HeatmapDay[] }) {
  const [selected, setSelected] = useState<HeatmapDay | null>(null);
  const detailAnim = useRef(new Animated.Value(0)).current;
  const detailSlide = useRef(new Animated.Value(-10)).current;

  const showDetail = useCallback((day: HeatmapDay | null) => {
    if (day) {
      tapHaptic();
      setSelected(day);
      detailAnim.setValue(0);
      detailSlide.setValue(-10);
      Animated.parallel([
        Animated.timing(detailAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(detailSlide, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(detailAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setSelected(null));
    }
  }, []);

  const cellSize = Math.floor((SW - spacing.md * 4 - 12 * 3) / 13);
  const weeks: (HeatmapDay | null)[][] = [];

  const firstDay = new Date(data[0]?.dateKey + 'T12:00:00');
  const dayOfWeek = (firstDay.getDay() + 6) % 7;
  const padded: (HeatmapDay | null)[] = [
    ...Array(dayOfWeek).fill(null),
    ...data,
  ];

  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayKey = formatDateKey(new Date());

  return (
    <View>
      {/* Detail card */}
      {selected ? (
        <Animated.View
          style={[
            heatStyles.detail,
            {
              opacity: detailAnim,
              transform: [{ translateY: detailSlide }],
            },
          ]}
        >
          <View style={heatStyles.detailHeader}>
            <View
              style={[
                heatStyles.detailDot,
                { backgroundColor: cellColor(selected.score) },
              ]}
            />
            <Text style={heatStyles.detailDate}>{selected.label}</Text>
            <TouchableOpacity
              onPress={() => showDetail(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={heatStyles.detailClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={heatStyles.detailBody}>
            <DetailRow
              label="Completed"
              value={`${selected.completed}/${selected.total} habits`}
            />
            <DetailRow label="Score" value={`${selected.score}%`} />
            <DetailRow
              label="Verdict"
              value={scoreVerdict(selected.score)}
              valueColor={verdictColor(selected.score)}
            />
          </View>
          <View style={heatStyles.barTrack}>
            <View
              style={[
                heatStyles.barFill,
                {
                  width: `${selected.score}%` as any,
                  backgroundColor: cellColor(selected.score),
                },
              ]}
            />
          </View>
        </Animated.View>
      ) : (
        <Text style={heatStyles.hint}>Tap any day to see details</Text>
      )}

      {/* Grid */}
      <View style={heatStyles.outer}>
        <View style={heatStyles.dayLabelsCol}>
          {dayLabels.map((d, i) => (
            <View
              key={`label-${i}`}
              style={{ height: cellSize + 3, justifyContent: 'center' }}
            >
              <Text style={heatStyles.dayLabel}>
                {i % 2 === 0 ? d : ''}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={heatStyles.gridRow}>
            {weeks.map((week, wi) => (
              <View key={`week-${wi}`} style={heatStyles.weekCol}>
                {week.map((day, di) => {
                  if (!day) {
                    return (
                      <View
                        key={`empty-${wi}-${di}`}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          margin: 1.5,
                          backgroundColor: HEATMAP_COLORS.noData,
                          borderRadius: 3,
                        }}
                      />
                    );
                  }
                  const isSelected = selected?.dateKey === day.dateKey;
                  const isToday = day.dateKey === todayKey;
                  const isPerfect = day.score === 100;
                  return (
                    <TouchableOpacity
                      key={`day-${day.dateKey}`}
                      onPress={() => showDetail(isSelected ? null : day)}
                      activeOpacity={0.7}
                      style={[
                        heatStyles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: cellColor(day.score),
                        },
                        isPerfect && heatStyles.cellPerfect,
                        isSelected && heatStyles.cellSelected,
                        isToday && !isSelected && heatStyles.cellToday,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Legend — Miss → Perfect */}
      <View style={heatStyles.legend}>
        <Text style={heatStyles.legendLabel}>Missed</Text>
        {[
          HEATMAP_COLORS.missed,   // 0%
          HEATMAP_COLORS.barely,   // 1-25%
          HEATMAP_COLORS.partial,  // 26-50%
          HEATMAP_COLORS.good,     // 51-75%
          HEATMAP_COLORS.great,    // 76-99%
          HEATMAP_COLORS.perfect,  // 100%
        ].map((color, i) => (
          <View
            key={`legend-${i}`}
            style={[heatStyles.legendCell, { backgroundColor: color }]}
          />
        ))}
        <Text style={heatStyles.legendLabel}>Perfect</Text>
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={heatStyles.detailRow}>
      <Text style={heatStyles.detailLabel}>{label}</Text>
      <Text
        style={[
          heatStyles.detailValue,
          valueColor ? { color: valueColor } : undefined,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ==========================================
// CHAPTER TIMELINE
// ==========================================

function ChapterTimeline({ chapters }: { chapters: Chapter[] }) {
  const next = chapters.find((c) => !c.achieved);

  return (
    <View>
      {chapters.map((chapter, i) => {
        const isLast = i === chapters.length - 1;
        const isNext = chapter === next;

        const dotStyle = [
          chapterStyles.dot,
          chapter.achieved
            ? {
                backgroundColor: chapter.iconBg,
                borderColor: chapter.iconColor,
                borderStyle: 'solid' as const,
              }
            : isNext
              ? {
                  borderColor: chapter.iconColor,
                  borderStyle: 'dashed' as const,
                  backgroundColor: `${chapter.iconColor}10`,
                }
              : {
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.15)',
                  borderStyle: 'solid' as const,
                },
        ];

        return (
          <View key={chapter.id} style={chapterStyles.row}>
            <View style={chapterStyles.left}>
              <View style={dotStyle}>
                {chapter.achieved || isNext ? (
                  <Text
                    style={[
                      chapterStyles.dotEmoji,
                      !chapter.achieved && { opacity: 0.4 },
                    ]}
                  >
                    {chapter.emoji}
                  </Text>
                ) : (
                  <View style={chapterStyles.dotEmpty} />
                )}
              </View>
              {!isLast && (
                <View
                  style={[
                    chapterStyles.line,
                    chapter.achieved
                      ? { backgroundColor: chapter.iconColor }
                      : undefined,
                  ]}
                />
              )}
            </View>

            <View
              style={[chapterStyles.content, isLast && { marginBottom: 0 }]}
            >
              <View style={chapterStyles.titleRow}>
                <Text
                  style={[
                    chapterStyles.title,
                    !chapter.achieved && !isNext && chapterStyles.titleLocked,
                  ]}
                >
                  {chapter.title}
                </Text>
                {chapter.achieved && (
                  <View style={chapterStyles.checkBadge}>
                    <Text style={chapterStyles.checkText}>✓</Text>
                  </View>
                )}
                {isNext && (
                  <View style={chapterStyles.nextBadge}>
                    <Text style={chapterStyles.nextText}>NEXT</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  chapterStyles.subtitle,
                  !chapter.achieved && !isNext && chapterStyles.subtitleLocked,
                ]}
              >
                {chapter.subtitle}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ==========================================
// MAIN SCREEN
// ==========================================

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom + TAB_BAR_HEIGHT + spacing.md;

  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, LOCAL_USER_ID))
        .limit(1);

      const u = result[0] ?? null;
      const settings = u?.settings as UserSettings | null;

      setUser(u);
      setAvatarUri(settings?.avatarUri ?? null);

      const data = await loadJourneyData();
      setJourney(data);
    } catch (e) {
      console.error('Journey load failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const settings = user?.settings as UserSettings | null;
  const displayName = settings?.nickname || user?.name || 'You';
  const initials =
    displayName === 'You'
      ? '✦'
      : displayName
          .split(' ')
          .slice(0, 2)
          .map((p: string) => p[0]?.toUpperCase())
          .join('');

  const isEmpty = !loading && !journey;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color={colors.brand?.primary ?? '#6366f1'}
            />
            <Text style={styles.loadingText}>Loading your journey…</Text>
          </View>
        ) : (
          <>
            <AnimatedHero
              displayName={displayName}
              initials={initials}
              avatarUri={avatarUri}
              journey={journey}
              onSettingsPress={() => router.push('/(modals)/settings')}
            />

            {isEmpty ? (
              <EmptyJourney />
            ) : journey ? (
              <View style={styles.body}>
                {/* Insight */}
                <GlowCard
                  accentColor={CARD_THEMES.insight.accent}
                  bgColor={CARD_THEMES.insight.bg}
                  delay={0}
                >
                  <Text style={styles.insightQuote}>"</Text>
                  <Text style={styles.insightText}>{journey.insight}</Text>
                </GlowCard>

                {/* Heatmap */}
                <GlowCard
                  accentColor={CARD_THEMES.heatmap.accent}
                  bgColor={CARD_THEMES.heatmap.bg}
                  delay={150}
                >
                  <Text style={styles.cardTitle}>90-Day Activity</Text>
                  <Text style={styles.cardSubtitle}>
                    Your consistency at a glance
                  </Text>
                  <InteractiveHeatmap data={journey.heatmap} />
                </GlowCard>

                {/* Numbers */}
                <GlowCard
                  accentColor={CARD_THEMES.numbers.accent}
                  bgColor={CARD_THEMES.numbers.bg}
                  delay={300}
                >
                  <Text style={styles.cardTitle}>By the Numbers</Text>
                  <View style={styles.statsRow}>
                    <MiniStat
                      icon="🏆"
                      value={journey.totalCompletions}
                      label="Total wins"
                    />
                    <MiniStat
                      icon="🔥"
                      value={journey.longestStreak}
                      label="Best streak"
                    />
                    <MiniStat
                      icon="📅"
                      value={journey.daysTracked}
                      label="Days active"
                    />
                    <MiniStat
                      icon="📈"
                      value={`${journey.completionRate}%`}
                      label="Success rate"
                    />
                  </View>
                </GlowCard>

                {/* Story */}
                <GlowCard
                  accentColor={CARD_THEMES.story.accent}
                  bgColor={CARD_THEMES.story.bg}
                  delay={450}
                >
                  <Text style={styles.cardTitle}>Your Story</Text>
                  <Text style={styles.cardSubtitle}>
                    {journey.chapters.filter((c) => c.achieved).length} of{' '}
                    {journey.chapters.length} chapters unlocked
                  </Text>
                  <ChapterTimeline chapters={journey.chapters} />
                </GlowCard>

                {/* Settings link */}
                <TouchableOpacity
                  style={styles.settingsLink}
                  onPress={() => {
                    tapHaptic();
                    router.push('/(modals)/settings');
                  }}
                >
                  <Text style={styles.settingsLinkText}>
                    Edit profile & settings →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatIcon}>{icon}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function EmptyJourney() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.emptyBox,
        { opacity: fadeIn, transform: [{ translateY: slideUp }] },
      ]}
    >
      <Text style={styles.emptyEmoji}>🌱</Text>
      <Text style={styles.emptyTitle}>Your journey starts today</Text>
      <Text style={styles.emptySubtitle}>
        Complete your first habit to begin building your story.
      </Text>
    </Animated.View>
  );
}

// ==========================================
// STYLES — Hero
// ==========================================

const heroStyles = StyleSheet.create({
  cardOuter: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: 24,
  },
  card: {
    borderRadius: 24,
    padding: spacing.xl,
    paddingTop: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  decoCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -20,
    left: -30,
  },
  decoCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 40,
    left: 20,
  },
  settingsBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  settingsIcon: { fontSize: 16 },
  streakBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  streakBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  avatarOuter: { marginBottom: spacing.md, marginTop: spacing.sm },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
  name: {
    color: '#fff',
    fontSize: typography.sizes['2xl'],
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.sizes.sm,
    marginTop: 4,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  statIcon: { fontSize: 16, marginBottom: 2 },
  statValue: { color: '#fff', fontSize: typography.sizes.xl, fontWeight: '800' },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

// ==========================================
// STYLES — Main
// ==========================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  screen: { flex: 1 },
  body: { paddingHorizontal: spacing.md },

  loadingBox: {
    paddingVertical: spacing.xl * 3,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
  },

  emptyBox: {
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  cardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: '#fff',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.md,
  },

  insightQuote: {
    fontSize: 40,
    color: CARD_THEMES.insight.accent,
    lineHeight: 40,
    marginBottom: -spacing.sm,
    fontWeight: '800',
  },
  insightText: {
    fontSize: typography.sizes.base,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    fontStyle: 'italic',
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  miniStatIcon: { fontSize: 20, marginBottom: 4 },
  miniStatValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  miniStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    textAlign: 'center',
  },

  settingsLink: { paddingVertical: spacing.lg, alignItems: 'center' },
  settingsLinkText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
});

// ==========================================
// STYLES — Heatmap
// ==========================================

const heatStyles = StyleSheet.create({
  hint: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  detail: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailDot: { width: 12, height: 12, borderRadius: 6 },
  detailDate: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  detailClose: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.5)',
    padding: 4,
  },
  detailBody: { gap: spacing.xs },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.5)',
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: '#fff',
  },
  barTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },

  outer: { flexDirection: 'row', gap: 3 },
  dayLabelsCol: {},
  dayLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    width: 12,
    textAlign: 'right',
  },
  gridRow: { flexDirection: 'row' },
  weekCol: {},
  cell: { borderRadius: 3, margin: 1.5 },
  cellPerfect: {
    shadowColor: HEATMAP_COLORS.perfect,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    justifyContent: 'flex-end',
  },
  legendLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
});

// ==========================================
// STYLES — Chapters
// ==========================================

const chapterStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  left: { alignItems: 'center', width: 40 },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmoji: { fontSize: 18 },
  dotEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 2,
    minHeight: 24,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  titleLocked: { color: 'rgba(255,255,255,0.3)' },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  nextBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(192,132,252,0.2)',
    borderWidth: 1,
    borderColor: '#c084fc',
  },
  nextText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#c084fc',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  subtitleLocked: { color: 'rgba(255,255,255,0.25)' },
});