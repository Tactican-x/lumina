/**
 * GoalForm Component
 * Form for creating/editing goals
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

import { Goal, GoalCategory } from '@/types';
import { validateGoal } from '@/utils/validation';
import { colorPalette } from '@/utils/colors';
import { formatDisplayDate } from '@/utils/date';

interface GoalFormProps {
  initialData?: Partial<Goal>;
  onSubmit: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CATEGORIES: { value: GoalCategory; label: string; emoji: string }[] = [
  { value: 'health', label: 'Health', emoji: '❤️' },
  { value: 'career', label: 'Career', emoji: '💼' },
  { value: 'finance', label: 'Finance', emoji: '💰' },
  { value: 'relationships', label: 'Relationships', emoji: '👥' },
  { value: 'learning', label: 'Learning', emoji: '📚' },
  { value: 'creativity', label: 'Creativity', emoji: '🎨' },
  { value: 'other', label: 'Other', emoji: '✨' },
];

export function GoalForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: GoalFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const [category, setCategory] = useState<GoalCategory>(
    initialData?.category || 'other'
  );

  const [color, setColor] = useState(initialData?.color || colors.brand.primary);

  const [targetValueText, setTargetValueText] = useState(
    initialData?.targetValue != null ? String(initialData.targetValue) : ''
  );
  const [unit, setUnit] = useState(initialData?.unit || '');

  const [targetDate, setTargetDate] = useState<Date | undefined>(
    initialData?.targetDate ? new Date(initialData.targetDate) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const parsedTargetValue = useMemo(() => {
    if (!targetValueText.trim()) return undefined;
    const n = Number(targetValueText);
    return Number.isFinite(n) ? n : NaN;
  }, [targetValueText]);

  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    // Android closes automatically; on iOS we also close to keep UX simple
    setShowDatePicker(false);

    if (selected) {
      // Normalize time to noon to avoid timezone edge cases
      const safe = new Date(selected);
      safe.setHours(12, 0, 0, 0);
      setTargetDate(safe);
    }
  };

  const handleSubmit = () => {
    const validation = validateGoal({
      title,
      targetValue: parsedTargetValue,
      targetDate,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // If user typed a non-number
    if (parsedTargetValue !== undefined && Number.isNaN(parsedTargetValue)) {
      setErrors((prev) => ({ ...prev, targetValue: 'Target value must be a number' }));
      return;
    }

    // Clear errors
    setErrors({});

    onSubmit({
      title: title.trim(),
      description: description.trim() ? description.trim() : undefined,

      category,
      icon: 'target',
      color,

      targetValue: parsedTargetValue,
      currentValue: initialData?.currentValue ?? 0,
      unit: unit.trim() ? unit.trim() : undefined,

      targetDate,
      status: initialData?.status ?? 'active',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <Input
        label="Goal Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g., Read 12 books"
        error={errors.title}
        autoFocus
      />

      {/* Description */}
      <Input
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Why does this matter?"
        multiline
      />

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const selected = category === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                activeOpacity={0.8}
                style={[
                  styles.categoryOption,
                  selected && styles.categoryOptionSelected,
                  selected && { borderColor: color },
                ]}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Color */}
      <View style={styles.section}>
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorGrid}>
          {colorPalette.slice(0, 12).map((c) => {
            const selected = color === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                activeOpacity={0.8}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  selected && styles.colorOptionSelected,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Target value + unit */}
      <View style={styles.row}>
        <View style={styles.half}>
          <Input
            label="Target Value (optional)"
            value={targetValueText}
            onChangeText={setTargetValueText}
            placeholder="e.g., 12"
            keyboardType="numeric"
            error={errors.targetValue}
          />
        </View>
        <View style={styles.half}>
          <Input
            label="Unit (optional)"
            value={unit}
            onChangeText={setUnit}
            placeholder="e.g., books"
          />
        </View>
      </View>

      {/* Target date */}
      <View style={styles.section}>
        <Text style={styles.label}>Target Date (optional)</Text>

        <TouchableOpacity onPress={handleOpenDatePicker} activeOpacity={0.8} style={styles.dateButton}>
          <Text style={styles.dateButtonText}>
            {targetDate ? formatDisplayDate(targetDate) : 'Select a date'}
          </Text>
        </TouchableOpacity>

        {targetDate && (
          <TouchableOpacity
            onPress={() => setTargetDate(undefined)}
            activeOpacity={0.8}
            style={styles.clearDate}
          >
            <Text style={styles.clearDateText}>Clear date</Text>
          </TouchableOpacity>
        )}

        {errors.targetDate ? <Text style={styles.error}>{errors.targetDate}</Text> : null}

        {showDatePicker && (
          <DateTimePicker
            value={targetDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Cancel" variant="ghost" onPress={onCancel} style={styles.actionButton} />
        <Button
          title={initialData ? 'Save Changes' : 'Create Goal'}
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.actionButton}
        />
      </View>

      {/* Extra bottom padding for comfort */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingBottom: 40, // important so last button isn't cramped
  },

  section: { marginBottom: spacing.lg },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: { flex: 1 },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryOptionSelected: {
    backgroundColor: colors.background.elevated,
  },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  categoryLabelSelected: {
    color: colors.text.primary,
    fontWeight: typography.weights.semibold,
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
    transform: [{ scale: 1.08 }],
  },

  dateButton: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  dateButtonText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  clearDate: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: typography.sizes.sm,
    color: colors.brand.primary,
    fontWeight: typography.weights.medium,
  },

  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger.main,
    marginTop: spacing.xs,
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