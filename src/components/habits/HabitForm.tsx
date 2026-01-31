/**
 * HabitForm Component
 * Form for creating/editing habits
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { Habit, TimeOfDay, EnergyLevel, HabitFrequency } from '@/types';
import { validateHabit } from '@/utils/validation';
import { colorPalette } from '@/utils/colors';

interface HabitFormProps {
  initialData?: Partial<Habit>;
  onSubmit: (data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ICONS = [
  { id: 'brain', emoji: '🧠', label: 'Mind' },
  { id: 'dumbbell', emoji: '💪', label: 'Exercise' },
  { id: 'book-open', emoji: '📚', label: 'Reading' },
  { id: 'droplets', emoji: '💧', label: 'Water' },
  { id: 'pen-line', emoji: '✍️', label: 'Writing' },
  { id: 'heart', emoji: '❤️', label: 'Health' },
  { id: 'sun', emoji: '☀️', label: 'Morning' },
  { id: 'moon', emoji: '🌙', label: 'Night' },
  { id: 'coffee', emoji: '☕', label: 'Coffee' },
  { id: 'salad', emoji: '🥗', label: 'Food' },
  { id: 'meditation', emoji: '🧘', label: 'Meditation' },
  { id: 'music', emoji: '🎵', label: 'Music' },
];

const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: '🌅 Morning' },
  { value: 'afternoon', label: '☀️ Afternoon' },
  { value: 'evening', label: '🌆 Evening' },
  { value: 'anytime', label: '⏰ Anytime' },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: colors.success.main },
  { value: 'medium', label: 'Medium', color: colors.warning.main },
  { value: 'high', label: 'High', color: colors.danger.main },
];

const DAYS = [
  { value: 0, label: 'S' },
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
];

export function HabitForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: HabitFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [icon, setIcon] = useState(initialData?.icon || 'brain');
  const [color, setColor] = useState(initialData?.color || colors.brand.primary);
  const [frequency, setFrequency] = useState<HabitFrequency>(
    initialData?.frequency || 'daily'
  );
  const [targetDays, setTargetDays] = useState<number[]>(
    (initialData?.targetDays as number[]) || [1, 2, 3, 4, 5]
  );
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(
    initialData?.timeOfDay || 'anytime'
  );
  const [energyRequired, setEnergyRequired] = useState<EnergyLevel>(
    initialData?.energyRequired || 'medium'
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const validation = validateHabit({ name });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    onSubmit({
      name,
      description: description || undefined,
      icon,
      color,
      frequency,
      targetDays: frequency === 'weekly' ? targetDays : undefined,
      timeOfDay,
      energyRequired,
      isActive: true,
      order: 0,
    });
  };

  const toggleDay = (day: number) => {
    if (targetDays.includes(day)) {
      setTargetDays(targetDays.filter((d) => d !== day));
    } else {
      setTargetDays([...targetDays, day].sort());
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Name */}
      <Input
        label="Habit Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g., Morning Meditation"
        error={errors.name}
        autoFocus
      />

      {/* Description */}
      <Input
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g., 10 minutes of mindfulness"
      />

      {/* Icon */}
      <View style={styles.section}>
        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setIcon(item.id)}
              style={[
                styles.iconOption,
                icon === item.id && styles.iconOptionSelected,
                icon === item.id && { borderColor: color },
              ]}
            >
              <Text style={styles.iconEmoji}>{item.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Color */}
      <View style={styles.section}>
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorGrid}>
          {colorPalette.slice(0, 12).map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorOption,
                { backgroundColor: c },
                color === c && styles.colorOptionSelected,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Time of Day */}
      <View style={styles.section}>
        <Text style={styles.label}>Best Time</Text>
        <View style={styles.optionRow}>
          {TIME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setTimeOfDay(option.value)}
              style={[
                styles.option,
                timeOfDay === option.value && styles.optionSelected,
                timeOfDay === option.value && { borderColor: color },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  timeOfDay === option.value && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Energy Required */}
      <View style={styles.section}>
        <Text style={styles.label}>Energy Required</Text>
        <View style={styles.optionRow}>
          {ENERGY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setEnergyRequired(option.value)}
              style={[
                styles.option,
                styles.energyOption,
                energyRequired === option.value && {
                  backgroundColor: `${option.color}20`,
                  borderColor: option.color,
                },
              ]}
            >
              <View
                style={[
                  styles.energyDot,
                  { backgroundColor: option.color },
                ]}
              />
              <Text
                style={[
                  styles.optionText,
                  energyRequired === option.value && { color: option.color },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Frequency */}
      <View style={styles.section}>
        <Text style={styles.label}>Frequency</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            onPress={() => setFrequency('daily')}
            style={[
              styles.option,
              frequency === 'daily' && styles.optionSelected,
              frequency === 'daily' && { borderColor: color },
            ]}
          >
            <Text
              style={[
                styles.optionText,
                frequency === 'daily' && styles.optionTextSelected,
              ]}
            >
              Every Day
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFrequency('weekly')}
            style={[
              styles.option,
              frequency === 'weekly' && styles.optionSelected,
              frequency === 'weekly' && { borderColor: color },
            ]}
          >
            <Text
              style={[
                styles.optionText,
                frequency === 'weekly' && styles.optionTextSelected,
              ]}
            >
              Specific Days
            </Text>
          </TouchableOpacity>
        </View>

        {frequency === 'weekly' && (
          <View style={styles.daysRow}>
            {DAYS.map((day) => (
              <TouchableOpacity
                key={day.value}
                onPress={() => toggleDay(day.value)}
                style={[
                  styles.dayOption,
                  targetDays.includes(day.value) && {
                    backgroundColor: color,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    targetDays.includes(day.value) && styles.dayTextSelected,
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Cancel"
          variant="ghost"
          onPress={onCancel}
          style={styles.actionButton}
        />
        <Button
          title={initialData ? 'Save Changes' : 'Create Habit'}
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    backgroundColor: colors.background.elevated,
  },
  iconEmoji: {
    fontSize: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#fff',
    transform: [{ scale: 1.1 }],
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: colors.background.elevated,
  },
  optionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  optionTextSelected: {
    color: colors.text.primary,
  },
  energyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  energyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  dayOption: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  dayTextSelected: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionButton: {
    minWidth: 120,
  },
});
