// src/lib/coaching/focusSession.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const KEY = 'lumina:focus-session:v1';
const ANDROID_CHANNEL_ID = 'focus-timer';

export type FocusSessionState = {
  itemKey: string;
  title: string;

  endsAt: number | null; // ms
  remainingSec: number | null;

  startedAt: number; // ms
  durationSec: number;

  notificationId: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function withAndroidChannel(content: Notifications.NotificationContentInput) {
  if (Platform.OS !== 'android') return content;
  return { ...content, channelId: ANDROID_CHANNEL_ID };
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Focus timer',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

async function requestPermissionIfNeeded(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function loadFocusSession(): Promise<FocusSessionState | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as FocusSessionState;
    if (!s || typeof s.itemKey !== 'string') return null;
    return s;
  } catch {
    return null;
  }
}

export async function saveFocusSession(state: FocusSessionState | null): Promise<void> {
  if (!state) {
    await AsyncStorage.removeItem(KEY);
    return;
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

async function cancelNotif(id: string | null) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}

async function scheduleCompletionNotification(params: { title: string; endsAt: number; itemKey: string }) {
  await ensureAndroidChannel();

  const granted = await requestPermissionIfNeeded();
  if (!granted) return null;

  const date = new Date(params.endsAt);

  return await Notifications.scheduleNotificationAsync({
    content: withAndroidChannel({
      title: 'Focus complete',
      body: params.title,
      data: { type: 'focus_complete', key: params.itemKey },
    }),
    trigger: {
      type: 'date',
      date,
    },
  });
}

export async function startFocusSession(params: {
  itemKey: string;
  title: string;
  durationSec: number;
}): Promise<FocusSessionState> {
  const now = Date.now();
  const durationSec = clamp(Math.round(params.durationSec), 60, 4 * 3600);
  const endsAt = now + durationSec * 1000;

  const notificationId = await scheduleCompletionNotification({
    title: params.title,
    endsAt,
    itemKey: params.itemKey,
  });

  const state: FocusSessionState = {
    itemKey: params.itemKey,
    title: params.title,
    endsAt,
    remainingSec: null,
    startedAt: now,
    durationSec,
    notificationId,
  };

  await saveFocusSession(state);
  return state;
}

export async function pauseFocusSession(): Promise<FocusSessionState | null> {
  const s = await loadFocusSession();
  if (!s) return null;

  if (s.endsAt == null) return s;

  const now = Date.now();
  const remainingSec = clamp(Math.ceil((s.endsAt - now) / 1000), 0, 4 * 3600);

  await cancelNotif(s.notificationId);

  const next: FocusSessionState = {
    ...s,
    endsAt: null,
    remainingSec,
    notificationId: null,
  };

  await saveFocusSession(next);
  return next;
}

export async function resumeFocusSession(): Promise<FocusSessionState | null> {
  const s = await loadFocusSession();
  if (!s) return null;

  if (s.endsAt != null) return s;
  if (s.remainingSec == null) return null;

  const now = Date.now();
  const endsAt = now + clamp(s.remainingSec, 0, 4 * 3600) * 1000;

  const notificationId = await scheduleCompletionNotification({
    title: s.title,
    endsAt,
    itemKey: s.itemKey,
  });

  const next: FocusSessionState = {
    ...s,
    endsAt,
    remainingSec: null,
    notificationId,
  };

  await saveFocusSession(next);
  return next;
}

export async function resetFocusSessionDuration(durationSec: number): Promise<FocusSessionState | null> {
  const s = await loadFocusSession();
  if (!s) return null;

  const nextDuration = clamp(Math.round(durationSec), 60, 4 * 3600);

  await cancelNotif(s.notificationId);

  const next: FocusSessionState = {
    ...s,
    durationSec: nextDuration,
    endsAt: null,
    remainingSec: nextDuration,
    notificationId: null,
  };

  await saveFocusSession(next);
  return next;
}

export async function stopFocusSession(): Promise<void> {
  const s = await loadFocusSession();
  if (s) await cancelNotif(s.notificationId);
  await saveFocusSession(null);
}

/** Helper: remaining seconds for a running/paused session */
export function getRemainingSec(s: FocusSessionState, nowMs: number): number {
  if (s.endsAt != null) return clamp(Math.ceil((s.endsAt - nowMs) / 1000), 0, 4 * 3600);
  if (s.remainingSec != null) return clamp(s.remainingSec, 0, 4 * 3600);
  return 0;
}