import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing } from '@/constants/theme';

import { useMoneyCategories } from '@/hooks/money/useMoneyCategories';

const COLOR_PRESETS = ['#64748b', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

export default function MoneyCategoriesScreen() {
  const { categories, create, update, remove } = useMoneyCategories();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState(COLOR_PRESETS[0]);

  // ✅ Edit modal state (cross-platform)
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editColor, setEditColor] = useState(COLOR_PRESETS[0]);
  const [editBusy, setEditBusy] = useState(false);

  const grouped = useMemo(() => {
    return {
      expense: categories.filter((c) => c.kind === 'expense' || c.kind === 'both'),
      income: categories.filter((c) => c.kind === 'income' || c.kind === 'both'),
    };
  }, [categories]);

  const onAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter a category name.');
      return;
    }
    try {
      await create({ name, emoji, color, kind });
      setName('');
      setEmoji('');
      setColor(COLOR_PRESETS[0]);
    } catch (e: any) {
      Alert.alert('Could not create category', e?.message ?? 'Please try again.');
    }
  };

  const openEdit = (cat: any) => {
    setEditId(cat.id);
    setEditName(cat.name ?? '');
    setEditEmoji(cat.emoji ?? '');
    setEditColor(cat.color ?? COLOR_PRESETS[0]);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editBusy) return;
    setEditOpen(false);
    setEditId(null);
    setEditName('');
    setEditEmoji('');
    setEditColor(COLOR_PRESETS[0]);
  };

  const saveEdit = async () => {
    if (!editId) return;

    const nextName = editName.trim();
    const nextEmoji = (editEmoji ?? '').trim();
    const nextColor = editColor;

    if (!nextName) {
      Alert.alert('Invalid name', 'Category name cannot be empty.');
      return;
    }

    setEditBusy(true);
    try {
      await update(editId, { name: nextName, emoji: nextEmoji, color: nextColor });
      closeEdit();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Please try again.');
    } finally {
      setEditBusy(false);
    }
  };

  const CategoryRow = ({
    c,
    deleteMessage,
    isLast,
  }: {
    c: any;
    deleteMessage: string;
    isLast: boolean;
  }) => {
    return (
      <View key={c.id} style={[styles.categoryItem, !isLast && styles.categoryItemBorder]}>
        <View style={styles.categoryLeft}>
          <View style={[styles.categoryIcon, { backgroundColor: `${c.color}20` }]}>
            <Text style={styles.categoryEmoji}>{c.emoji || '📁'}</Text>
          </View>
          <View>
            <Text style={styles.categoryName}>{c.name}</Text>
            {c.isSystem && (
              <View style={styles.systemBadge}>
                <Text style={styles.systemBadgeText}>System</Text>
              </View>
            )}
          </View>
        </View>

        {!c.isSystem && (
          <View style={styles.categoryActions}>
            <TouchableOpacity
              onPress={() => openEdit(c)}
              style={styles.actionButton}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Alert.alert('Delete category?', deleteMessage, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => remove(c.id),
                  },
                ]);
              }}
              style={styles.actionButton}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Categories</Text>
              <Text style={styles.subtitle}>Manage your spending groups</Text>
            </View>
          </View>
        </View>

        {/* ── Stats Overview ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="arrow-up" size={16} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.statValue}>{grouped.expense.length}</Text>
              <Text style={styles.statLabel}>Expense</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="arrow-down" size={16} color="#10B981" />
            </View>
            <View>
              <Text style={styles.statValue}>{grouped.income.length}</Text>
              <Text style={styles.statLabel}>Income</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#6366F120' }]}>
              <Ionicons name="layers-outline" size={16} color="#6366F1" />
            </View>
            <View>
              <Text style={styles.statValue}>{categories.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* ── Add Category Card ── */}
        <Card variant="default" padding="md">
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="add-circle" size={20} color="#6366F1" />
            </View>
            <Text style={styles.cardTitle}>Create Category</Text>
          </View>

          {/* Kind Toggle */}
          <View style={styles.kindToggle}>
            <TouchableOpacity
              onPress={() => setKind('expense')}
              style={[styles.kindOption, kind === 'expense' && styles.kindOptionActiveExpense]}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-up-circle" size={18} color={kind === 'expense' ? '#fff' : colors.text.tertiary} />
              <Text style={[styles.kindOptionText, kind === 'expense' && styles.kindOptionTextActive]}>Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setKind('income')}
              style={[styles.kindOption, kind === 'income' && styles.kindOptionActiveIncome]}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-down-circle" size={18} color={kind === 'income' ? '#fff' : colors.text.tertiary} />
              <Text style={[styles.kindOptionText, kind === 'income' && styles.kindOptionTextActive]}>Income</Text>
            </TouchableOpacity>
          </View>

          {/* Name & Emoji Inputs */}
          <View style={styles.inputRow}>
            <View style={styles.emojiInputWrapper}>
              <Text style={styles.inputLabel}>Icon</Text>
              <View style={styles.emojiInput}>
                <Text style={styles.emojiPreview}>{emoji || '📁'}</Text>
              </View>
            </View>

            <View style={styles.nameInputWrapper}>
              <Input label="Category Name" value={name} onChangeText={setName} placeholder="e.g. Coffee, Rent" />
            </View>
          </View>

          <View style={{ marginTop: -spacing.sm, marginBottom: spacing.sm }}>
            <Input label="Emoji" value={emoji} onChangeText={setEmoji} placeholder="Enter emoji like ☕" />
          </View>

          {/* Color Selection */}
          <Text style={styles.colorLabel}>Choose Color</Text>
          <View style={styles.colorRow}>
            {COLOR_PRESETS.map((c) => {
              const active = c === color;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }]}
                  activeOpacity={0.7}
                >
                  {active && (
                    <View style={styles.colorDotCheck}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={[styles.previewChip, { backgroundColor: `${color}20`, borderColor: color }]}>
              <Text style={styles.previewEmoji}>{emoji || '📁'}</Text>
              <Text style={[styles.previewName, { color }]}>{name || 'Category'}</Text>
            </View>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: kind === 'expense' ? '#EF4444' : '#10B981' }]}
            onPress={onAdd}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Create Category</Text>
          </TouchableOpacity>
        </Card>

        {/* ── Expense Categories ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="arrow-up" size={16} color="#EF4444" />
            </View>
            <Text style={styles.sectionTitle}>Expense Categories</Text>
          </View>
          <Text style={styles.sectionCount}>{grouped.expense.length}</Text>
        </View>

        <View style={styles.categoryList}>
          {grouped.expense.length === 0 ? (
            <View style={styles.emptyCategory}>
              <Text style={styles.emptyCategoryText}>No expense categories yet</Text>
            </View>
          ) : (
            grouped.expense.map((c, index) =>
              CategoryRow({
                c,
                deleteMessage: 'Transactions will be moved to Other.',
                isLast: index === grouped.expense.length - 1,
              })
            )
          )}
        </View>

        {/* ── Income Categories ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="arrow-down" size={16} color="#10B981" />
            </View>
            <Text style={styles.sectionTitle}>Income Categories</Text>
          </View>
          <Text style={styles.sectionCount}>{grouped.income.length}</Text>
        </View>

        <View style={styles.categoryList}>
          {grouped.income.length === 0 ? (
            <View style={styles.emptyCategory}>
              <Text style={styles.emptyCategoryText}>No income categories yet</Text>
            </View>
          ) : (
            grouped.income.map((c, index) =>
              CategoryRow({
                c,
                deleteMessage: 'Transactions will be moved to Other Income.',
                isLast: index === grouped.income.length - 1,
              })
            )
          )}
        </View>

        {/* ── Tip Footer ── */}
        <View style={styles.tipContainer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.text.tertiary} />
          <Text style={styles.tipText}>
            System categories cannot be deleted. Custom categories can be edited or removed anytime.
          </Text>
        </View>
      </ScrollView>

      {/* ── Edit Modal (Android + iOS) ── */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={closeEdit}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeEdit}>
          <TouchableOpacity activeOpacity={1} style={styles.editModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit category</Text>
              <TouchableOpacity onPress={closeEdit} disabled={editBusy}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Input label="Name" value={editName} onChangeText={setEditName} placeholder="Enter a name" />

            <View style={{ height: spacing.sm }} />

            <Input label="Emoji (optional)" value={editEmoji} onChangeText={setEditEmoji} placeholder="☕" />

            <Text style={styles.colorLabelModal}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((c) => {
                const active = c === editColor;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setEditColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }]}
                    activeOpacity={0.7}
                  >
                    {active && (
                      <View style={styles.colorDotCheck}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={[styles.previewChip, { backgroundColor: `${editColor}20`, borderColor: editColor }]}>
                <Text style={styles.previewEmoji}>{editEmoji.trim() || '📁'}</Text>
                <Text style={[styles.previewName, { color: editColor }]}>{editName.trim() || 'Category'}</Text>
              </View>
            </View>

            <View style={styles.editActions}>
              <Button title="Cancel" variant="ghost" onPress={closeEdit} />
              <Button title={editBusy ? 'Saving…' : 'Save'} onPress={saveEdit} />
            </View>

            <Text style={styles.editHint}>Tip: Names must be unique within the same category type.</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text.primary, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.text.tertiary, fontSize: 13, marginTop: 1 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.text.tertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border.dark, marginHorizontal: spacing.sm },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  cardHeaderIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#6366F115', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text.primary, fontSize: 17, fontWeight: '700' },

  kindToggle: { flexDirection: 'row', backgroundColor: colors.background.tertiary, borderRadius: 12, padding: 4, marginBottom: spacing.md },
  kindOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  kindOptionActiveExpense: { backgroundColor: '#EF4444' },
  kindOptionActiveIncome: { backgroundColor: '#10B981' },
  kindOptionText: { color: colors.text.tertiary, fontWeight: '600', fontSize: 14 },
  kindOptionTextActive: { color: '#fff' },

  inputRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  emojiInputWrapper: { width: 70 },
  inputLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  emojiInput: {
    height: 48,
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  emojiPreview: { fontSize: 24 },
  nameInputWrapper: { flex: 1 },

  colorLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  colorLabelModal: { color: colors.text.secondary, fontSize: 13, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorDotCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },

  previewContainer: { backgroundColor: colors.background.tertiary, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  previewLabel: { color: colors.text.tertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  previewChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5 },
  previewEmoji: { fontSize: 18 },
  previewName: { fontSize: 14, fontWeight: '700' },

  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14 },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  sectionCount: { color: colors.text.tertiary, fontSize: 14, fontWeight: '600' },

  categoryList: { backgroundColor: colors.background.secondary, borderRadius: 16, overflow: 'hidden' },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  categoryItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.dark },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryEmoji: { fontSize: 20 },
  categoryName: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },
  systemBadge: { backgroundColor: colors.background.tertiary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  systemBadgeText: { color: colors.text.tertiary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.background.tertiary, alignItems: 'center', justifyContent: 'center' },

  emptyCategory: { padding: spacing.lg, alignItems: 'center' },
  emptyCategoryText: { color: colors.text.tertiary, fontSize: 14 },

  tipContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  tipText: { flex: 1, color: colors.text.tertiary, fontSize: 13, lineHeight: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  editModal: { width: '100%', maxWidth: 420, backgroundColor: colors.background.secondary, borderRadius: 20, padding: spacing.lg },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  editTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  editHint: { marginTop: spacing.sm, color: colors.text.tertiary, fontSize: 12, lineHeight: 16 },
});