import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { GoalProgressRing } from '@/components/goals/ProgressRing';
import { MilestoneItem } from '@/components/goals/MilestoneItem';

import { colors, spacing, typography } from '@/constants/theme';
import { useGoal } from '@/hooks';

export default function GoalDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { goal, milestones, updateProgress, remove } = useGoal(String(id));

  const [value, setValue] = useState('');

  const parsedValue = useMemo(() => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }, [value]);

  if (!goal) {
    return (
      <View style={styles.screen}>
        <Modal visible onClose={() => router.back()} title="Goal">
          <Text style={{ color: colors.text.secondary }}>Goal not found.</Text>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title={goal.title}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="default" padding="md" style={{ marginBottom: spacing.md }}>
            <Text style={styles.meta}>
              {goal.category} • {goal.status}
            </Text>
            <Text style={styles.desc}>{goal.description || 'No description'}</Text>
          </Card>

          {goal.targetValue ? (
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <GoalProgressRing
                currentValue={goal.currentValue}
                targetValue={goal.targetValue}
                unit={goal.unit}
                color={goal.color}
                size={150}
              />
            </View>
          ) : null}

          <Card variant="default" padding="md" style={{ marginBottom: spacing.md }}>
            <Text style={styles.sectionTitle}>Update progress</Text>

            <Input
              label={`Current value ${goal.unit ? `(${goal.unit})` : ''}`}
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
              placeholder={`${goal.currentValue}`}
            />

            <Button
              title="Save progress"
              onPress={async () => {
                if (parsedValue == null) return;
                await updateProgress(parsedValue);
                setValue('');
              }}
            />
          </Card>

          {milestones.length > 0 && (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.sectionTitle}>Milestones</Text>

              {milestones.map((m) => (
                <MilestoneItem
                  key={m.id}
                  milestone={m}
                  goalColor={goal.color}
                  onPress={() => {}}
                />
              ))}
            </View>
          )}

          {/* Edit + Delete buttons */}
          <View style={styles.actionRow}>
            <Button
              title="Edit Goal"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/(modals)/edit-goal',
                  params: { id: goal.id },
                })
              }
              style={styles.actionButton}
            />

            <Button
              title="Delete Goal"
              variant="danger"
              onPress={async () => {
                await remove();
                router.back();
              }}
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  meta: {
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  desc: { color: colors.text.secondary, lineHeight: 20 },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});