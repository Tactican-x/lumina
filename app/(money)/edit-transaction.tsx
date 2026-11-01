import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

import { useMoneyCategories } from '@/hooks/money/useMoneyCategories';
import { formatCents, monthKeyFromDate, parseAmountToCents, getCurrencySymbol } from '@/lib/money/money';
import { deleteMoneyTransaction, getMoneyTransactionById, updateMoneyTransaction } from '@/db/repositories/moneyTransactions';
import { useMoneyUiStore } from '@/stores/moneyUiStore';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const setMonthKey = useMoneyUiStore((s) => s.setMonthKey);

  const { categories } = useMoneyCategories();

  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const availableCategories = useMemo(
    () => categories.filter((c) => c.kind === type || c.kind === 'both'),
    [categories, type]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      const tx = await getMoneyTransactionById(String(id));
      if (!mounted) return;

      if (!tx) {
        setLoading(false);
        Alert.alert('Not found', 'Transaction not found.');
        router.back();
        return;
      }

      setType(tx.type as any);
      setAmountText(String(((tx.amountCents ?? 0) / 100).toFixed(2)));
      setNote(tx.note ?? '');
      setOccurredAt(new Date(tx.occurredAt as any));
      setCategoryId(tx.categoryId);
      setLoading(false);
    })().catch(() => {
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!categoryId || !availableCategories.some((c) => c.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id ?? null);
    }
  }, [availableCategories, categoryId]);

  const onSave = async () => {
    const cents = parseAmountToCents(amountText);
    if (cents == null || cents <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount like 12.50');
      return;
    }
    if (!categoryId) {
      Alert.alert('Choose a category', 'Please select a category.');
      return;
    }

    await updateMoneyTransaction(String(id), {
      type,
      amountCents: cents,
      note,
      occurredAt,
      categoryId,
    });

    setMonthKey(monthKeyFromDate(occurredAt));
    router.back();
  };

  const onDelete = async () => {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMoneyTransaction(String(id));
          router.back();
        },
      },
    ]);
  };

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
          <Text style={styles.loadingText}>Loading transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Edit Transaction</Text>
              <Text style={styles.subtitle}>Modify your entry</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onDelete} style={styles.deleteHeaderButton}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* ── Preview Card ── */}
        <View style={styles.previewCard}>
          <View style={[
            styles.previewIcon,
            { backgroundColor: type === 'expense' ? '#EF444420' : '#10B98120' }
          ]}>
            <Text style={styles.previewEmoji}>{selectedCategory?.emoji ?? '💰'}</Text>
          </View>
          <Text style={[
            styles.previewAmount,
            { color: type === 'expense' ? '#EF4444' : '#10B981' }
          ]}>
            {type === 'expense' ? '-' : '+'}{formatCents(parseAmountToCents(amountText) ?? 0)}
          </Text>
          <Text style={styles.previewCategory}>{selectedCategory?.name ?? 'Category'}</Text>
          <Text style={styles.previewDate}>{occurredAt.toDateString()}</Text>
        </View>

        {/* ── Type Selection ── */}
        <Card variant="default" padding="md">
          <View style={styles.cardHeader}>
            <Ionicons name="swap-horizontal" size={18} color={colors.text.secondary} />
            <Text style={styles.cardTitle}>Transaction Type</Text>
          </View>

          <View style={styles.typeToggle}>
            <TouchableOpacity
              onPress={() => setType('expense')}
              style={[styles.typeOption, type === 'expense' && styles.typeOptionActiveExpense]}
            >
              <Ionicons 
                name="arrow-up-circle" 
                size={20} 
                color={type === 'expense' ? '#fff' : colors.text.tertiary} 
              />
              <Text style={[styles.typeOptionText, type === 'expense' && styles.typeOptionTextActive]}>
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setType('income')}
              style={[styles.typeOption, type === 'income' && styles.typeOptionActiveIncome]}
            >
              <Ionicons 
                name="arrow-down-circle" 
                size={20} 
                color={type === 'income' ? '#fff' : colors.text.tertiary} 
              />
              <Text style={[styles.typeOptionText, type === 'income' && styles.typeOptionTextActive]}>
                Income
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Amount & Note ── */}
        <Card variant="default" padding="md">
          <View style={styles.cardHeader}>
            <Ionicons name="calculator-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.cardTitle}>Amount & Details</Text>
          </View>

          <View style={styles.amountContainer}>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyText}>{getCurrencySymbol()}</Text>
            </View>
            <View style={styles.amountInputWrapper}>
              <Input
                label=""
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
          </View>

          <View style={styles.noteContainer}>
            <Ionicons name="pencil-outline" size={16} color={colors.text.tertiary} style={{ marginTop: 12 }} />
            <View style={{ flex: 1 }}>
              <Input 
                label="" 
                value={note} 
                onChangeText={setNote} 
                placeholder="Add a note (optional)" 
              />
            </View>
          </View>
        </Card>

        {/* ── Category Selection ── */}
        <Card variant="default" padding="md">
          <View style={styles.rowBetween}>
            <View style={styles.cardHeader}>
              <Ionicons name="grid-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.cardTitle}>Category</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(money)/categories')}>
              <Text style={styles.linkText}>Manage</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoryScroll}
          >
            {availableCategories.map((c) => {
              const active = c.id === categoryId;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[
                    styles.categoryChip,
                    active && { backgroundColor: `${c.color}25`, borderColor: c.color }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                  <Text style={[styles.categoryName, active && { color: c.color }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* ── Date Selection ── */}
        <Card variant="default" padding="md">
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.cardTitle}>Date</Text>
          </View>

          <TouchableOpacity onPress={() => setShowDate(true)} style={styles.dateSelector}>
            <View style={styles.dateSelectorLeft}>
              <Ionicons name="calendar" size={20} color="#6366F1" />
              <Text style={styles.dateSelectorText}>{occurredAt.toDateString()}</Text>
            </View>
            <View style={styles.changeBadge}>
              <Text style={styles.changeBadgeText}>Change</Text>
            </View>
          </TouchableOpacity>

          {showDate && (
            <DateTimePicker
              value={occurredAt}
              mode="date"
              onChange={(_, selected) => {
                if (Platform.OS === 'android') setShowDate(false);
                if (selected) setOccurredAt(selected);
              }}
            />
          )}
        </Card>

        {/* ── Action Buttons ── */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={onDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={onSave}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tip ── */}
        <View style={styles.tipContainer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.text.tertiary} />
          <Text style={styles.tipText}>
            Changes will update your totals immediately.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: colors.background.primary 
  },
  container: { 
    padding: spacing.md, 
    gap: spacing.md, 
    paddingBottom: 100 
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.tertiary,
    fontSize: 15,
    fontWeight: '500',
  },

  /* Header */
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { 
    color: colors.text.primary, 
    fontSize: 22, 
    fontWeight: '800' 
  },
  subtitle: { 
    color: colors.text.tertiary, 
    fontSize: 13,
    marginTop: 1
  },
  deleteHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EF444415',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Preview Card */
  previewCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  previewEmoji: {
    fontSize: 28,
  },
  previewAmount: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
  },
  previewCategory: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  previewDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 4,
  },

  /* Card Headers */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Type Toggle */
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 14,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  typeOptionActiveExpense: {
    backgroundColor: '#EF4444',
  },
  typeOptionActiveIncome: {
    backgroundColor: '#10B981',
  },
  typeOptionText: {
    color: colors.text.tertiary,
    fontWeight: '600',
    fontSize: 15,
  },
  typeOptionTextActive: {
    color: '#fff',
  },

  /* Amount */
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  currencyBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyText: {
    color: colors.text.secondary,
    fontSize: 18,
    fontWeight: '700',
  },
  amountInputWrapper: {
    flex: 1,
  },

  /* Note */
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  /* Category */
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryName: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Date */
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.tertiary,
    borderRadius: 14,
    padding: 16,
  },
  dateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateSelectorText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  changeBadge: {
    backgroundColor: '#6366F120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeBadgeText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Action Buttons */
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#6366F1',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Tip */
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
  },
  tipText: {
    color: colors.text.tertiary,
    fontSize: 13,
  },
});