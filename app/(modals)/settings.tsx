// ==========================================
// FILE: settings.tsx — Settings + Profile (FINAL)
// ==========================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { eq } from 'drizzle-orm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography } from '@/constants/theme';
import { useUIStore } from '@/stores';

import { requestNotificationPermission, syncAllReminders } from '@/lib/notifications/reminders';
import { db } from '@/db/database';
import { users, type User, type UserSettings, type NewUser } from '@/db/schema';

// ==========================================
// CONSTANTS
// ==========================================

const LOCAL_USER_ID = 'local-user';
const TAB_BAR_HEIGHT = Platform.select({ ios: 80, android: 70 }) ?? 80;

const baseDir    = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
const profileDir = `${baseDir}profile/`;

// ==========================================
// HELPERS
// ==========================================

function isValidHHMM(s: string) {
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(s.trim());
}

function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function buildDefaultSettings(): UserSettings {
  return {
    theme: 'system',
    notifications: false,
    reminderTime: '09:00',
    weekStartsOn: 1,
    showScientificDetails: true,
    nickname: null,
    avatarUri: null,
  };
}

async function ensureProfileDir() {
  if (!profileDir) return;
  await FileSystem.makeDirectoryAsync(profileDir, { intermediates: true }).catch(() => {});
}

function isOurProfileFile(uri: string | null | undefined) {
  return !!uri && !!profileDir && uri.startsWith(profileDir);
}

async function safeDeleteProfileFile(uri: string | null | undefined) {
  if (!isOurProfileFile(uri)) return;
  try { await FileSystem.deleteAsync(uri!, { idempotent: true }); } catch {}
}

async function persistPickedAvatar(assetUri: string): Promise<string> {
  if (!profileDir) throw new Error('File system not available');
  await ensureProfileDir();
  const cleanUri = assetUri.split('?')[0];
  const ext      = cleanUri.split('.').pop() || 'jpg';
  const dest     = `${profileDir}avatar-${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: assetUri, to: dest });
  return dest;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SettingsModal() {
  const insets    = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Dynamic bottom padding — safe on every device
  const bottomPadding = Math.max(insets.bottom, spacing.md) + spacing['2xl'] + 200;

  // ── UI store ─────────────────────────────
  const showScientificDetails    = useUIStore((s) => s.showScientificDetails);
  const setShowScientificDetails = useUIStore((s) => s.setShowScientificDetails);
  const enableHaptics            = useUIStore((s) => s.enableHaptics);
  const setEnableHaptics         = useUIStore((s) => s.setEnableHaptics);
  const enableSounds             = useUIStore((s) => s.enableSounds);
  const setEnableSounds          = useUIStore((s) => s.setEnableSounds);
  const enableNotifications      = useUIStore((s) => s.enableNotifications);
  const setEnableNotifications   = useUIStore((s) => s.setEnableNotifications);
  const dailyReminderTime        = useUIStore((s) => s.dailyReminderTime);
  const setDailyReminderTime     = useUIStore((s) => s.setDailyReminderTime);

  // ── Reminder draft ───────────────────────
  const [digestTimeDraft, setDigestTimeDraft] = useState(dailyReminderTime || '20:00');
  const digestTimeIsValid = useMemo(() => isValidHHMM(digestTimeDraft), [digestTimeDraft]);

  // ── Profile state ────────────────────────
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving,  setProfileSaving]  = useState(false);

  const [user,     setUser]     = useState<User | null>(null);
  const [nickname, setNickname] = useState('');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [timezone, setTimezone] = useState('');
  const [avatarUri,         setAvatarUri]         = useState<string | null>(null);
  const [originalAvatarUri, setOriginalAvatarUri] = useState<string | null>(null);

  // ── Load profile ─────────────────────────

  const loadProfile = useCallback(async () => {
    try {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.id, LOCAL_USER_ID))
        .limit(1);

      let u = existing[0];

      if (!u) {
        const now = new Date();
        const newUser: NewUser = {
          id: LOCAL_USER_ID,
          name: 'You',
          email: null,
          timezone: guessTimezone(),
          onboardingCompleted: true,
          settings: buildDefaultSettings(),
          createdAt: now,
          updatedAt: now,
        };
        await db.insert(users).values(newUser);
        const created = await db
          .select()
          .from(users)
          .where(eq(users.id, LOCAL_USER_ID))
          .limit(1);
        u = created[0] ?? null;
      }

      const settings = (u?.settings as UserSettings | null) ?? buildDefaultSettings();

      setUser(u ?? null);
      setName(u?.name ?? '');
      setEmail(u?.email ?? '');
      setTimezone(u?.timezone ?? guessTimezone());
      setNickname(settings.nickname ?? '');
      setAvatarUri(settings.avatarUri ?? null);
      setOriginalAvatarUri(settings.avatarUri ?? null);
    } catch (e) {
      console.error('Profile load failed:', e);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Avatar ───────────────────────────────

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }

    // FIXED: Use new API instead of deprecated MediaTypeOptions
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    try {
      if (avatarUri && avatarUri !== originalAvatarUri) {
        await safeDeleteProfileFile(avatarUri);
      }
      const persisted = await persistPickedAvatar(asset.uri);
      setAvatarUri(persisted);
    } catch (e) {
      console.error('Avatar save failed:', e);
      Alert.alert('Failed', 'Could not save that image.');
    }
  };

  const removeAvatar = async () => {
    if (avatarUri && avatarUri !== originalAvatarUri) {
      await safeDeleteProfileFile(avatarUri);
    }
    setAvatarUri(null);
  };

  // ── Save profile ─────────────────────────

  const onSaveProfile = async () => {
    if (profileSaving) return;

    if (email.trim() && !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setProfileSaving(true);
    try {
      const currentSettings = (user?.settings as UserSettings | null) ?? buildDefaultSettings();
      const nextSettings: UserSettings = {
        ...buildDefaultSettings(),
        ...currentSettings,
        nickname: nickname.trim() || null,
        avatarUri: avatarUri ?? null,
      };

      await db
        .update(users)
        .set({
          name:      name.trim() || null,
          email:     email.trim() || null,
          timezone:  timezone.trim() || 'UTC',
          settings:  nextSettings,
          updatedAt: new Date(),
        })
        .where(eq(users.id, LOCAL_USER_ID));

      if (originalAvatarUri && originalAvatarUri !== avatarUri) {
        await safeDeleteProfileFile(originalAvatarUri);
      }

      const refreshed = await db
        .select()
        .from(users)
        .where(eq(users.id, LOCAL_USER_ID))
        .limit(1);

      setUser(refreshed[0] ?? null);
      setOriginalAvatarUri(avatarUri ?? null);

      Alert.alert('Saved', 'Profile updated.');
    } catch (e) {
      console.error('Profile save failed:', e);
      Alert.alert('Save failed', 'Could not save your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Notifications ────────────────────────

  const applyReminders = async () => {
    if (!digestTimeIsValid) {
      Alert.alert('Invalid time', 'Please enter time in HH:MM format (e.g. 20:00).');
      return;
    }
    setDailyReminderTime(digestTimeDraft.trim());
    await syncAllReminders();
    Alert.alert('Updated', 'Reminders have been updated.');
  };

  const onToggleNotifications = async (v: boolean) => {
    if (!v) {
      setEnableNotifications(false);
      await syncAllReminders();
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        'Permission denied',
        'Notifications are disabled. Enable them from system settings.'
      );
      setEnableNotifications(false);
      return;
    }
    setEnableNotifications(true);
    await syncAllReminders();
  };

  // ── Scroll to focused input ──────────────

  const scrollToInput = useCallback((y: number) => {
    scrollRef.current?.scrollTo({ y: Math.max(y - 120, 0), animated: true });
  }, []);

  // ── Derived ──────────────────────────────

  const displayName = nickname.trim() || name.trim() || 'You';
  const initials    = displayName === 'You'
    ? '✦'
    : displayName.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Settings" variant="fullscreen">
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingBottom: bottomPadding }}
          >

            {/* ═══════════════════════════════
                PROFILE SECTION
            ═══════════════════════════════ */}
            <Card variant="default" padding="md" style={styles.card}>
              <Text style={styles.sectionTitle}>Profile</Text>

              {profileLoading ? (
                <View style={styles.profileLoading}>
                  <ActivityIndicator color={colors.brand?.primary ?? '#6366f1'} />
                </View>
              ) : (
                <>
                  {/* Avatar */}
                  <View style={styles.avatarRow}>
                    <View style={styles.avatarCircle}>
                      {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarInitials}>{initials}</Text>
                      )}
                    </View>
                    <View style={styles.avatarActions}>
                      <Button
                        title="Change Photo"
                        variant="outline"
                        onPress={pickAvatar}
                      />
                      {avatarUri && (
                        <Button
                          title="Remove"
                          variant="ghost"
                          onPress={removeAvatar}
                        />
                      )}
                    </View>
                  </View>

                  {/* Fields */}
                  <Input
                    label="Nickname"
                    value={nickname}
                    onChangeText={setNickname}
                    placeholder="What should we call you?"
                    autoCapitalize="words"
                    onFocus={(e: any) => {
                      e?.target?.measureInWindow?.((_x: number, y: number) => {
                        scrollToInput(y);
                      });
                    }}
                  />

                  <Input
                    label="Full Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    autoCapitalize="words"
                    onFocus={(e: any) => {
                      e?.target?.measureInWindow?.((_x: number, y: number) => {
                        scrollToInput(y);
                      });
                    }}
                  />

                  <Input
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={(e: any) => {
                      e?.target?.measureInWindow?.((_x: number, y: number) => {
                        scrollToInput(y);
                      });
                    }}
                  />

                  <Input
                    label="Timezone"
                    value={timezone}
                    onChangeText={setTimezone}
                    placeholder="e.g. Africa/Nairobi"
                    autoCapitalize="none"
                    hint="Used to calculate streaks correctly"
                    onFocus={(e: any) => {
                      e?.target?.measureInWindow?.((_x: number, y: number) => {
                        scrollToInput(y);
                      });
                    }}
                  />

                  <View style={styles.saveRow}>
                    <Button
                      title={profileSaving ? 'Saving…' : 'Save Profile'}
                      loading={profileSaving}
                      onPress={() =>
                        onSaveProfile().catch((e) =>
                          console.error('Save profile failed', e)
                        )
                      }
                      style={styles.flex}
                    />
                  </View>
                </>
              )}
            </Card>

            {/* ═══════════════════════════════
                PREFERENCES SECTION
            ═══════════════════════════════ */}
            <Card variant="default" padding="md" style={styles.card}>
              <Text style={styles.sectionTitle}>Preferences</Text>

              <Toggle
                label="Scientific details"
                description="Show deeper explanations (p-values, mechanisms, etc.)"
                value={showScientificDetails}
                onValueChange={setShowScientificDetails}
              />

              <Toggle
                label="Haptics"
                description="Subtle vibration feedback"
                value={enableHaptics}
                onValueChange={setEnableHaptics}
              />

              <Toggle
                label="Sounds"
                description="Optional sound effects"
                value={enableSounds}
                onValueChange={setEnableSounds}
              />
            </Card>

            {/* ═══════════════════════════════
                REMINDERS SECTION
            ═══════════════════════════════ */}
            <Card variant="default" padding="md" style={styles.card}>
              <Text style={styles.sectionTitle}>Reminders</Text>

              <Toggle
                label="Notifications"
                description="Daily digest + habit reminders"
                value={enableNotifications}
                onValueChange={(v) => {
                  onToggleNotifications(v).catch((e) =>
                    console.error('Toggle notifications failed', e)
                  );
                }}
              />

              <Input
                label="Daily digest time (HH:MM)"
                value={digestTimeDraft}
                onChangeText={setDigestTimeDraft}
                placeholder="20:00"
                hint="Example: 08:30 or 20:00"
                autoCapitalize="none"
                onFocus={(e: any) => {
                  e?.target?.measureInWindow?.((_x: number, y: number) => {
                    scrollToInput(y);
                  });
                }}
              />

              <Text style={styles.note}>
                Daily digest sends one reminder per day. Per-habit reminders
                use each habit's own reminder time (if set).
              </Text>

              <View style={styles.saveRow}>
                <Button
                  title="Apply Reminders"
                  variant={digestTimeIsValid ? 'primary' : 'outline'}
                  onPress={() =>
                    applyReminders().catch((e) =>
                      console.error('Apply reminders failed', e)
                    )
                  }
                  style={styles.flex}
                />
              </View>
            </Card>

            {/* Close */}
            <Button title="Close" onPress={() => router.back()} />

          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  flex: {
    flex: 1,
  },
  card: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  profileLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand?.primary
      ? `${colors.brand.primary}22`
      : '#6366f122',
    borderWidth: 2,
    borderColor: colors.brand?.primary ?? '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarInitials: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.brand?.primary ?? '#6366f1',
  },
  avatarActions: {
    flex: 1,
    gap: spacing.xs,
  },
  saveRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  note: {
    marginTop: spacing.sm,
    color: colors.text.tertiary,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
});