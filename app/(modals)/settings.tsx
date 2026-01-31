import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { useUIStore } from '@/stores';

export default function SettingsModal() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const showScientificDetails = useUIStore((s) => s.showScientificDetails);
  const setShowScientificDetails = useUIStore((s) => s.setShowScientificDetails);

  const enableHaptics = useUIStore((s) => s.enableHaptics);
  const setEnableHaptics = useUIStore((s) => s.setEnableHaptics);

  const enableSounds = useUIStore((s) => s.enableSounds);
  const setEnableSounds = useUIStore((s) => s.setEnableSounds);

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Settings" variant="fullscreen">
        <Card variant="default" padding="md" style={{ marginBottom: spacing.md }}>
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

        <Card variant="default" padding="md" style={{ marginBottom: spacing.md }}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button title="Dark" variant={theme === 'dark' ? 'primary' : 'outline'} onPress={() => setTheme('dark')} />
            <Button title="Light" variant={theme === 'light' ? 'primary' : 'outline'} onPress={() => setTheme('light')} />
            <Button title="System" variant={theme === 'system' ? 'primary' : 'outline'} onPress={() => setTheme('system')} />
          </View>
          <Text style={styles.note}>
            Theme switching is wired; applying it app-wide can be done next (color scheme hook + tokens).
          </Text>
        </Card>

        <Button title="Close" onPress={() => router.back()} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  note: {
    marginTop: spacing.sm,
    color: colors.text.tertiary,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
});