// src/lib/coaching/autopilotNudges.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateKey } from '@/utils/date';
import type { AutopilotPlan } from '@/lib/coaching/autopilotPlan';
import type { AutopilotPrefs } from '@/lib/coaching/autopilotPrefs';
import { isWithinQuietHours } from '@/lib/coaching/autopilotPrefs';

export type AutopilotNudgeKind = 'next_up' | 'streak_risk' | 'digest' | 'focus_complete';

export interface AutopilotNudge {
  id: string;
  kind: AutopilotNudgeKind;
  title: string;
  message: string;
  createdAt: number; // ms
}

type StoredState = {
  dateKey: string;

  deliveredIds: string[];
  dismissedIds: string[];
  deliveredCount: number;
  lastDeliveredAt: number | null;

  delivered: Record<string, AutopilotNudge>;

  snoozedUntil: number | null;
};

const KEY_PREFIX = 'lumina:autopilot:nudges:v2';

function keyFor(dateKey: string) {
  return `${KEY_PREFIX}:${dateKey}`;
}

function defaultState(dateKey: string): StoredState {
  return {
    dateKey,
    deliveredIds: [],
    dismissedIds: [],
    deliveredCount: 0,
    lastDeliveredAt: null,
    delivered: {},
    snoozedUntil: null,
  };
}

export async function loadNudgeState(now: Date): Promise<StoredState> {
  const dateKey = formatDateKey(now);
  const raw = await AsyncStorage.getItem(keyFor(dateKey));
  if (!raw) return defaultState(dateKey);

  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (!parsed || parsed.dateKey !== dateKey) return defaultState(dateKey);

    const delivered = (parsed.delivered && typeof parsed.delivered === 'object' ? parsed.delivered : {}) as Record<
      string,
      AutopilotNudge
    >;

    return {
      ...defaultState(dateKey),
      ...parsed,
      deliveredIds: Array.isArray(parsed.deliveredIds) ? parsed.deliveredIds : [],
      dismissedIds: Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : [],
      delivered,
      snoozedUntil: typeof parsed.snoozedUntil === 'number' ? parsed.snoozedUntil : null,
      lastDeliveredAt: typeof parsed.lastDeliveredAt === 'number' ? parsed.lastDeliveredAt : null,
      deliveredCount: typeof parsed.deliveredCount === 'number' ? parsed.deliveredCount : 0,
    };
  } catch {
    return defaultState(dateKey);
  }
}

export async function saveNudgeState(state: StoredState): Promise<void> {
  await AsyncStorage.setItem(keyFor(state.dateKey), JSON.stringify(state));
}

export async function dismissNudge(now: Date, nudgeId: string): Promise<void> {
  const state = await loadNudgeState(now);
  if (!state.dismissedIds.includes(nudgeId)) state.dismissedIds.push(nudgeId);
  await saveNudgeState(state);
}

export async function dismissAllNudges(now: Date): Promise<void> {
  const state = await loadNudgeState(now);
  const ids = Object.keys(state.delivered ?? {});
  const dismissed = new Set(state.dismissedIds);
  ids.forEach((id) => dismissed.add(id));
  state.dismissedIds = [...dismissed];
  await saveNudgeState(state);
}

export async function snoozeNudges(now: Date, minutes: number): Promise<void> {
  const state = await loadNudgeState(now);
  state.snoozedUntil = now.getTime() + Math.max(1, minutes) * 60_000;
  await saveNudgeState(state);
}

export async function clearSnooze(now: Date): Promise<void> {
  const state = await loadNudgeState(now);
  state.snoozedUntil = null;
  await saveNudgeState(state);
}

export async function loadInboxNudges(now: Date): Promise<AutopilotNudge[]> {
  const state = await loadNudgeState(now);
  const delivered = Object.values(state.delivered ?? {});
  return delivered
    .filter((n) => !state.dismissedIds.includes(n.id))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** MVP: allow other modules (Focus Mode) to post persistent inbox entries without affecting nudge cap */
export async function postInboxNudge(now: Date, nudge: AutopilotNudge): Promise<void> {
  const state = await loadNudgeState(now);

  state.delivered[nudge.id] = nudge;

  if (!state.deliveredIds.includes(nudge.id)) {
    state.deliveredIds.push(nudge.id);
  }

  // Do NOT increment deliveredCount/lastDeliveredAt (doesn't consume daily nudge budget)
  await saveNudgeState(state);
}

export async function computeAndMaybeDeliverNudges(params: {
  plan: AutopilotPlan | null;
  now: Date;
  streakRiskCount: number;
  prefs?: AutopilotPrefs;
}): Promise<{ nudges: AutopilotNudge[]; deliveredNew: boolean }> {
  const { plan, now, streakRiskCount, prefs } = params;

  const state = await loadNudgeState(now);

  if (state.snoozedUntil != null && state.snoozedUntil <= now.getTime()) {
    state.snoozedUntil = null;
    await saveNudgeState(state);
  }

  const MAX_PER_DAY = 3;
  const COOLDOWN_MS = 3 * 60 * 60 * 1000;

  const quiet = prefs ? isWithinQuietHours(now, prefs) : false;
  const nudgesEnabled = prefs?.nudgesEnabled ?? true;

  const snoozed = state.snoozedUntil != null && state.snoozedUntil > now.getTime();

  const canDeliver =
    nudgesEnabled &&
    !quiet &&
    !snoozed &&
    state.deliveredCount < MAX_PER_DAY &&
    (state.lastDeliveredAt == null || now.getTime() - state.lastDeliveredAt >= COOLDOWN_MS);

  const allowNextUp = prefs?.nudgeTypes?.nextUp ?? true;
  const allowStreak = prefs?.nudgeTypes?.streakRisk ?? true;
  const allowDigest = prefs?.nudgeTypes?.digest ?? true;

  const dateKey = state.dateKey;
  const hour = now.getHours();

  const candidates: AutopilotNudge[] = [];

  if (allowDigest && hour >= 7 && hour <= 9) {
    candidates.push({
      id: `${dateKey}:digest`,
      kind: 'digest',
      title: 'Daily Autopilot',
      message: 'Open your plan and do the smallest next step. Consistency beats intensity.',
      createdAt: now.getTime(),
    });
  }

  if (allowStreak && streakRiskCount > 0 && hour >= 19) {
    candidates.push({
      id: `${dateKey}:streak_risk`,
      kind: 'streak_risk',
      title: 'Streak at risk',
      message: `${streakRiskCount} habit streak${streakRiskCount === 1 ? '' : 's'} could break tonight. Do the minimum version if needed.`,
      createdAt: now.getTime(),
    });
  }

  if (allowNextUp && plan?.nextUp) {
    const withinWindow = Math.abs(hour - plan.nextUp.scheduledHour) <= 1;
    if (withinWindow) {
      candidates.push({
        id: `${dateKey}:next_up`,
        kind: 'next_up',
        title: 'Next up',
        message: `${plan.nextUp.title} (~${plan.nextUp.minutes}m)`,
        createdAt: now.getTime(),
      });
    }
  }

  const priority: AutopilotNudgeKind[] = ['streak_risk', 'next_up', 'digest', 'focus_complete'];
  candidates.sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind));

  let deliveredNew = false;

  if (canDeliver) {
    const next = candidates.find(
      (c) => !state.deliveredIds.includes(c.id) && !state.dismissedIds.includes(c.id)
    );

    if (next) {
      state.deliveredIds.push(next.id);
      state.deliveredCount += 1;
      state.lastDeliveredAt = now.getTime();
      state.delivered[next.id] = next;
      await saveNudgeState(state);
      deliveredNew = true;
    }
  }

  const nudges = Object.values(state.delivered ?? {})
    .filter((n) => !state.dismissedIds.includes(n.id))
    .sort((a, b) => b.createdAt - a.createdAt);

  return { nudges, deliveredNew };
}