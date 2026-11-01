 // app/(modals)/coach-settings.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

import { colors, spacing, typography } from '@/constants/theme';
import { loadAutopilotPrefs, updateAutopilotPrefs, type AutopilotPrefs } from '@/lib/coaching/autopilotPrefs';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isHHMM(v: string) {
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test((v ?? '').trim());
}

function Row({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export default function CoachSettingsModal() {
  const insets = useSafeAreaInsets();

  const [prefs, setPrefs] = useState<AutopilotPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  const [planMainMaxText, setPlanMainMaxText] = useState('7');
  const [starterMaxText, setStarterMaxText] = useState('2');
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  useEffect(() => {
    let mounted = true;
    loadAutopilotPrefs().then((p) => {
      if (!mounted) return;
      setPrefs(p);
      setPlanMainMaxText(String(p.planMainMaxItems));
      setStarterMaxText(String(p.starterMaxItems));
      setQuietStart(p.quietHours.start);
      setQuietEnd(p.quietHours.end);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const planMainMax = useMemo(() => {
    const n = Number(planMainMaxText);
    return Number.isFinite(n) ? clamp(Math.round(n), 5, 12) : null;
  }, [planMainMaxText]);

  const starterMax = useMemo(() => {
    const n = Number(starterMaxText);
    return Number.isFinite(n) ? clamp(Math.round(n), 0, 3) : null;
  }, [starterMaxText]);

  const quietValid = useMemo(() => {
    if (!prefs?.quietHours.enabled) return true;
    return isHHMM(quietStart) && isHHMM(quietEnd);
  }, [prefs?.quietHours.enabled, quietStart, quietEnd]);

  if (!prefs) {
    return (
      <View style={styles.screen}>
        <Modal visible onClose={() => router.back()} title="Coach settings" variant="fullscreen">
          <Text style={styles.muted}>Loading…</Text>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Coach settings" variant="fullscreen">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: insets.bottom + 140,
              gap: spacing.lg,
            }}
          >
            <Card variant="default" padding="md">
              <Text style={styles.sectionTitle}>Plan</Text>

              <Input
                label="Main plan items (5–12)"
                value={planMainMaxText}
                onChangeText={setPlanMainMaxText}
                keyboardType="numeric"
                placeholder="7"
              />

              <Input
                label="Starter items max (0–3)"
                value={starterMaxText}
                onChangeText={setStarterMaxText}
                keyboardType="numeric"
                placeholder="2"
              />

              <Text style={[styles.muted, { marginTop: spacing.sm }]}>
                Keeping the plan small improves follow-through. Starters help you begin big tasks.
              </Text>
            </Card>

            <Card variant="default" padding="md">
              <Text style={styles.sectionTitle}>Nudges</Text>

              <Row
                label="Enable nudges"
                description="In-app nudges are capped (max 3/day) with cooldown."
                value={prefs.nudgesEnabled}
                onValueChange={(v) => setPrefs((p) => (p ? { ...p, nudgesEnabled: v } : p))}
              />

              <View style={styles.divider} />

              <Row
                label="Next up"
                value={prefs.nudgeTypes.nextUp}
                onValueChange={(v) =>
                  setPrefs((p) => (p ? { ...p, nudgeTypes: { ...p.nudgeTypes, nextUp: v } } : p))
                }
              />
              <Row
                label="Streak at risk"
                value={prefs.nudgeTypes.streakRisk}
                onValueChange={(v) =>
                  setPrefs((p) => (p ? { ...p, nudgeTypes: { ...p.nudgeTypes, streakRisk: v } } : p))
                }
              />
              <Row
                label="Daily digest"
                value={prefs.nudgeTypes.digest}
                onValueChange={(v) =>
                  setPrefs((p) => (p ? { ...p, nudgeTypes: { ...p.nudgeTypes, digest: v } } : p))
                }
              />
            </Card>

            <Card variant="default" padding="md">
              <Text style={styles.sectionTitle}>Quiet hours</Text>

              <Row
                label="Enable quiet hours"
                description="No new nudges delivered during quiet hours."
                value={prefs.quietHours.enabled}
                onValueChange={(v) =>
                  setPrefs((p) => (p ? { ...p, quietHours: { ...p.quietHours, enabled: v } } : p))
                }
              />

              <View style={{ height: spacing.sm }} />

              <Input
                label="Quiet start (HH:MM)"
                value={quietStart}
                onChangeText={setQuietStart}
                placeholder="22:00"
              />
              <Input
                label="Quiet end (HH:MM)"
                value={quietEnd}
                onChangeText={setQuietEnd}
                placeholder="07:00"
              />

              {!quietValid ? <Text style={styles.error}>Enter times like 22:00 and 07:00.</Text> : null}
            </Card>

            <View style={styles.footer}>
              <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
              <Button
                title="Save"
                loading={saving}
                disabled={planMainMax == null || starterMax == null || !quietValid}
                onPress={async () => {
                  if (planMainMax == null || starterMax == null) {
                    Alert.alert('Invalid values', 'Please enter valid numbers.');
                    return;
                  }
                  if (!quietValid) {
                    Alert.alert('Invalid quiet hours', 'Please use HH:MM format.');
                    return;
                  }

                  setSaving(true);
                  try {
                    const next = await updateAutopilotPrefs({
                      planMainMaxItems: planMainMax,
                      starterMaxItems: starterMax,
                      nudgesEnabled: prefs.nudgesEnabled,
                      nudgeTypes: prefs.nudgeTypes,
                      quietHours: { ...prefs.quietHours, start: quietStart.trim(), end: quietEnd.trim() },
                    });
                    setPrefs(next);
                    router.back();
                  } catch (e) {
                    console.error('Save coach settings failed:', e);
                    Alert.alert('Error', 'Could not save settings. Please try again.');
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },

  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  muted: { color: colors.text.tertiary, fontSize: typography.sizes.sm, lineHeight: 18 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowLabel: { color: colors.text.primary, fontWeight: typography.weights.semibold },
  rowDesc: { color: colors.text.tertiary, fontSize: typography.sizes.sm, marginTop: 2, lineHeight: 18 },

  divider: { height: 1, backgroundColor: colors.border.dark, marginVertical: spacing.sm, opacity: 0.8 },

  error: { color: colors.error?.light ?? '#ff6b6b', marginTop: spacing.sm },

  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingBottom: spacing.md,
  },
});