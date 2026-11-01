// src/components/ui/ActionSheet.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

export type ActionSheetOption = {
  key: string;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
};

export function ActionSheet({
  visible,
  title,
  subtitle,
  options,
  onClose,
  cancelLabel = 'Cancel',
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  options: ActionSheetOption[];
  onClose: () => void;
  cancelLabel?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { bottom: insets.bottom + spacing.md }]}>
        {(title || subtitle) && (
          <View style={styles.header}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        )}

        <View style={styles.list}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              disabled={opt.disabled}
              onPress={async () => {
                if (opt.disabled) return;
                await opt.onPress();
              }}
              activeOpacity={0.8}
              style={[styles.row, opt.disabled && styles.rowDisabled]}
            >
              <Text
                style={[
                  styles.rowText,
                  opt.destructive && { color: colors.error?.light ?? '#ff6b6b' },
                  opt.disabled && styles.rowTextDisabled,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={styles.cancel}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.dark,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { gap: 4, paddingBottom: spacing.xs },
  title: { color: colors.text.primary, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  subtitle: { color: colors.text.tertiary, fontSize: typography.sizes.sm, lineHeight: 18 },
  list: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  row: { paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border.dark },
  rowDisabled: { opacity: 0.45 },
  rowText: { color: colors.text.primary, fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  rowTextDisabled: { color: colors.text.tertiary },
  cancel: {
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  cancelText: { color: colors.text.primary, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
});