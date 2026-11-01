import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { Input, TextArea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import * as energyRepo from '@/db/repositories/energy';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function LogEnergyModal() {
  const [scoreText, setScoreText] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const parsedScore = useMemo(() => {
    const n = Number(scoreText);
    if (!Number.isFinite(n)) return null;
    return clamp(Math.round(n), 0, 100);
  }, [scoreText]);

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Log Energy" variant="fullscreen">
        <Text style={styles.help}>
          Enter your current energy from 0 to 100. This improves your predictions and insights.
        </Text>

        <Input
          label="Energy score (0–100)"
          value={scoreText}
          onChangeText={setScoreText}
          placeholder="e.g. 65"
          keyboardType="numeric"
        />

        <TextArea
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="What’s affecting your energy?"
        />

        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: spacing.md }}>
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button
            title="Save"
            loading={saving}
            disabled={parsedScore == null}
            onPress={async () => {
              if (parsedScore == null) {
                Alert.alert('Missing score', 'Please enter a number from 0 to 100.');
                return;
              }

              setSaving(true);
              try {
                await energyRepo.logEnergy(parsedScore, undefined, note.trim() || undefined);
                router.back();
              } catch (e) {
                console.error('Log energy failed:', e);
                Alert.alert('Error', 'Could not save energy log. Please try again.');
              } finally {
                setSaving(false);
              }
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  help: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
});