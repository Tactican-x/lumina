import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useUIStore } from '@/stores/uiStore';
import * as habitRepo from '@/db/repositories/habits';

// Show notifications even when app is foreground
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const { enableSounds } = useUIStore.getState();
    return {
      shouldShowAlert: true,
      shouldPlaySound: !!enableSounds,
      shouldSetBadge: false,
    };
  },
});

const ANDROID_CHANNEL_ID = 'habit-reminders';

function parseHHMM(time: string): { hour: number; minute: number } | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

// channelId belongs on CONTENT for Android
function withAndroidChannel(content: Notifications.NotificationContentInput) {
  if (Platform.OS !== 'android') return content;
  return { ...content, channelId: ANDROID_CHANNEL_ID };
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Instant test notification */
export async function sendTestNotificationNow(): Promise<void> {
  await ensureAndroidChannel();
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: withAndroidChannel({
      title: 'Lumina (Test)',
      body: 'Notifications are working.',
      data: { type: 'test' },
    }),
    trigger: null,
  });
}

/**
 * Sync all reminders from app state + DB.
 * Cancels scheduled notifications and recreates them.
 */
export async function syncAllReminders(): Promise<void> {
  const { enableNotifications, dailyReminderTime } = useUIStore.getState();

  await ensureAndroidChannel();

  // Prevent duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!enableNotifications) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  // 1) Daily digest (DAILY trigger must include type)
  const digestTime = parseHHMM(dailyReminderTime || '20:00');
  if (digestTime) {
    await Notifications.scheduleNotificationAsync({
      content: withAndroidChannel({
        title: 'Lumina',
        body: "Quick check-in: mark your habits for today.",
        data: { type: 'daily_digest' },
      }),
      trigger: {
        type: 'daily',
        hour: digestTime.hour,
        minute: digestTime.minute,
      } as any,
    });
  }

  // 2) Per-habit reminders
  const habits = await habitRepo.getActiveHabits();

  for (const h of habits) {
    const rt = h.reminderTime;
    if (!rt) continue;

    const t = parseHHMM(rt);
    if (!t) continue;

    // Weekly habits: schedule only on target days
    if (h.frequency === 'weekly' && Array.isArray(h.targetDays) && h.targetDays.length > 0) {
      for (const jsDay of h.targetDays) {
        const weekday = jsDay + 1; // JS 0..6 => Expo 1..7

        await Notifications.scheduleNotificationAsync({
          content: withAndroidChannel({
            title: 'Habit reminder',
            body: `Don't forget: ${h.name}`,
            data: { type: 'habit', habitId: h.id },
          }),
          trigger: {
            type: 'weekly',
            weekday,
            hour: t.hour,
            minute: t.minute,
          } as any,
        });
      }
    } else {
      // Daily (or custom treated as daily)
      await Notifications.scheduleNotificationAsync({
        content: withAndroidChannel({
          title: 'Habit reminder',
          body: `Don't forget: ${h.name}`,
          data: { type: 'habit', habitId: h.id },
        }),
        trigger: {
          type: 'daily',
          hour: t.hour,
          minute: t.minute,
        } as any,
      });
    }
  }
}