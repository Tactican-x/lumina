import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

import {
  formatMonthLabel,
  monthKeyFromDate,
  monthKeyToDate,
  parseAmountToCents,
  formatCents,
  getCurrencySymbol,
} from '@/lib/money/money';
import { useMoneyTransactions } from '@/hooks/money/useMoneyTransactions';
import { useMoneyCategories } from '@/hooks/money/useMoneyCategories';
import { createMoneyTransaction } from '@/db/repositories/moneyTransactions';
import { useMoneyUiStore } from '@/stores/moneyUiStore';

export default function MoneyTransactions() {
  const params = useLocalSearchParams<{ type?: string }>();

  // ✅ shared month state (persisted)
  const monthKey = useMoneyUiStore((s) => s.monthKey);
  const setMonthKey = useMoneyUiStore((s) => s.setMonthKey);
  const prevMonth = useMoneyUiStore((s) => s.prevMonth);
  const nextMonth = useMoneyUiStore((s) => s.nextMonth);
  const resetToCurrentMonth = useMoneyUiStore((s) => s.resetToCurrentMonth);

  const [type, setType] = useState<'expense' | 'income'>(params.type === 'income' ? 'income' : 'expense');
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [showDate, setShowDate] = useState(false);

  // When viewing month changes, keep occurredAt inside that month (good UX for quick adds)
  useEffect(() => {
    const target = monthKeyToDate(monthKey);
    const currentMk = monthKeyFromDate(occurredAt);
    if (currentMk !== monthKey) setOccurredAt(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const { categories } = useMoneyCategories();
  const availableCategories = useMemo(
    () => categories.filter((c) => c.kind === type || c.kind === 'both'),
    [categories, type]
  );

  const [categoryId, setCategoryId] = useState<string | null>(null);
  useEffect(() => {
    if (!categoryId || !availableCategories.some((c) => c.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id ?? null);
    }
  }, [availableCategories, categoryId]);

  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');

  // ✅ transactions now come from the selected month in the store
  const { transactions, remove, refresh } = useMoneyTransactions(monthKey);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const totals = useMemo(() => {
    const expense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amountCents, 0);
    const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amountCents, 0);
    return { expense, income, count: transactions.length };
  }, [transactions]);

  // ✅ Search + Filters (list-only)
  const [searchText, setSearchText] = useState('');
  const [listType, setListType] = useState<'all' | 'expense' | 'income'>('all');
  const [listCategoryId, setListCategoryId] = useState<string>('all');

  const filterCategories = useMemo(() => {
    const kind = listType === 'all' ? null : listType;
    return categories
      .filter((c) => !kind || c.kind === kind || c.kind === 'both')
      .slice(0, 12);
  }, [categories, listType]);

  const filteredTransactions = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return transactions.filter((t: any) => {
      if (listType !== 'all' && t.type !== listType) return false;
      if (listCategoryId !== 'all' && t.categoryId !== listCategoryId) return false;

      if (q) {
        const cat = catById.get(t.categoryId);
        const haystack = `${cat?.name ?? ''} ${cat?.emoji ?? ''} ${t.note ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [transactions, listType, listCategoryId, searchText, catById]);

  const onAdd = async () => {
    const cents = parseAmountToCents(amountText);
    if (cents == null || cents <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount like 12.50');
      return;
    }
    if (!categoryId) {
      Alert.alert('Choose a category', 'Please select a category.');
      return;
    }

    try {
      const targetMonthKey = monthKeyFromDate(occurredAt);

      await createMoneyTransaction({
        type,
        amountCents: cents,
        categoryId,
        note,
        occurredAt,
      });

      // If user picked a date in a different month, switch to that month
      if (targetMonthKey !== monthKey) {
        setMonthKey(targetMonthKey);
      } else {
        await refresh();
      }

      setAmountText('');
      setNote('');
      Alert.alert('Saved', 'Transaction added.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save transaction.');
    }
  };

  const formatShortDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const clearFilters = () => {
    setSearchText('');
    setListType('all');
    setListCategoryId('all');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Transactions</Text>
              <Text style={styles.subtitle}>{formatMonthLabel(monthKey)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(money)/categories')} style={styles.settingsButton}>
            <Ionicons name="options-outline" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Month navigation ── */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={prevMonth} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
            <Text style={styles.navText}>Prev</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCenter} onPress={resetToCurrentMonth} activeOpacity={0.85}>
            <Ionicons name="today-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.navCenterText}>This month</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={nextMonth} activeOpacity={0.85}>
            <Text style={styles.navText}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Month Summary ── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="arrow-up" size={16} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Spent</Text>
              <Text style={styles.summaryValue}>{formatCents(totals.expense)}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="arrow-down" size={16} color="#10B981" />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Earned</Text>
              <Text style={styles.summaryValue}>{formatCents(totals.income)}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: '#6366F120' }]}>
              <Ionicons name="receipt-outline" size={16} color="#6366F1" />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Count</Text>
              <Text style={styles.summaryValue}>{totals.count}</Text>
            </View>
          </View>
        </View>

        {/* ── Add Transaction Card ── */}
        <Card variant="default" padding="md">
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="add-circle" size={20} color="#6366F1" />
            </View>
            <Text style={styles.cardTitle}>New Transaction</Text>
          </View>

          {/* Type Toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              onPress={() => setType('expense')}
              style={[styles.typeOption, type === 'expense' && styles.typeOptionActiveExpense]}
            >
              <Ionicons
                name="arrow-up-circle"
                size={18}
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
                size={18}
                color={type === 'income' ? '#fff' : colors.text.tertiary}
              />
              <Text style={[styles.typeOptionText, type === 'income' && styles.typeOptionTextActive]}>
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input with Currency */}
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

          {/* Note Input */}
          <View style={styles.noteContainer}>
            <Ionicons name="pencil-outline" size={16} color={colors.text.tertiary} style={{ marginTop: 12 }} />
            <View style={{ flex: 1 }}>
              <Input label="" value={note} onChangeText={setNote} placeholder="Add a note (optional)" />
            </View>
          </View>

          {/* Date Picker */}
          <TouchableOpacity onPress={() => setShowDate(true)} style={styles.dateSelector}>
            <View style={styles.dateSelectorLeft}>
              <Ionicons name="calendar-outline" size={18} color="#6366F1" />
              <Text style={styles.dateSelectorText}>{occurredAt.toDateString()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
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

          {/* Category Selection */}
          <Text style={styles.categoryLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {availableCategories.map((c) => {
              const active = c.id === categoryId;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[styles.categoryChip, active && { backgroundColor: `${c.color}25`, borderColor: c.color }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                  <Text style={[styles.categoryName, active && { color: c.color }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Add Button */}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: type === 'expense' ? '#EF4444' : '#10B981' }]}
            onPress={onAdd}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add {type === 'expense' ? 'Expense' : 'Income'}</Text>
          </TouchableOpacity>
        </Card>

        {/* ── Search & Filters ── */}
        <Card variant="default" padding="md">
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Search & Filters</Text>
            <TouchableOpacity onPress={clearFilters} activeOpacity={0.8}>
              <Text style={styles.linkText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <Input label="" value={searchText} onChangeText={setSearchText} placeholder="Search notes or categories…" />
          </View>

          <View style={styles.filterRow}>
            {(['all', 'expense', 'income'] as const).map((t) => {
              const active = listType === t;
              const label = t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income';
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setListType(t);
                    setListCategoryId('all');
                  }}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterCatsRow}>
            <TouchableOpacity
              onPress={() => setListCategoryId('all')}
              style={[styles.catFilterChip, listCategoryId === 'all' && styles.catFilterChipActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.catFilterText, listCategoryId === 'all' && styles.catFilterTextActive]}>
                All categories
              </Text>
            </TouchableOpacity>

            {filterCategories.map((c: any) => {
              const active = listCategoryId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setListCategoryId(c.id)}
                  style={[styles.catFilterChip, active && { borderColor: c.color, backgroundColor: `${c.color}18` }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.catFilterEmoji}>{c.emoji}</Text>
                  <Text style={[styles.catFilterText, active && { color: colors.text.primary }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* ── Transactions List ── */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>History</Text>
          <Text style={styles.listCount}>
            {filteredTransactions.length} / {transactions.length}
          </Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={32} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>Add your first transaction above</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={32} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptySubtitle}>Try a different search or clear filters.</Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((t: any, index: number) => {
              const cat = catById.get(t.categoryId);
              const isExpense = t.type === 'expense';
              const isLast = index === filteredTransactions.length - 1;

              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.transactionItem, !isLast && styles.transactionItemBorder]}
                  onPress={() => router.push(`/(money)/edit-transaction?id=${t.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.transactionLeft}>
                    <View style={[styles.transactionIcon, { backgroundColor: isExpense ? '#EF444415' : '#10B98115' }]}>
                      <Text style={styles.transactionEmoji}>{cat?.emoji ?? '💰'}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionCategory}>{cat?.name ?? 'Category'}</Text>
                      <Text style={styles.transactionMeta}>
                        {formatShortDate(new Date(t.occurredAt as any))}
                        {t.note ? ` • ${t.note}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.transactionRight}>
                    <Text style={[styles.transactionAmount, { color: isExpense ? '#EF4444' : '#10B981' }]}>
                      {isExpense ? '-' : '+'}
                      {formatCents(t.amountCents)}
                    </Text>

                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Delete transaction?', 'This cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              await remove(t.id);
                            },
                          },
                        ]);
                      }}
                      style={styles.deleteButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background.secondary, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.text.tertiary, fontSize: 13, marginTop: 1 },
  settingsButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background.secondary, alignItems: 'center', justifyContent: 'center' },

  monthNav: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.background.secondary },
  navText: { color: colors.text.primary, fontWeight: '700', fontSize: 13 },
  navCenter: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.background.secondary },
  navCenterText: { color: colors.text.secondary, fontWeight: '700', fontSize: 13 },

  summaryRow: { flexDirection: 'row', backgroundColor: colors.background.secondary, borderRadius: 16, padding: spacing.md, alignItems: 'center' },
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { color: colors.text.tertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },
  summaryDivider: { width: 1, height: 28, backgroundColor: colors.border.dark, marginHorizontal: spacing.sm },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  cardHeaderIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#6366F115', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text.primary, fontSize: 17, fontWeight: '700' },

  typeToggle: { flexDirection: 'row', backgroundColor: colors.background.tertiary, borderRadius: 12, padding: 4, marginBottom: spacing.md },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  typeOptionActiveExpense: { backgroundColor: '#EF4444' },
  typeOptionActiveIncome: { backgroundColor: '#10B981' },
  typeOptionText: { color: colors.text.tertiary, fontWeight: '600', fontSize: 14 },
  typeOptionTextActive: { color: '#fff' },

  amountContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  currencyBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.background.tertiary, alignItems: 'center', justifyContent: 'center' },
  currencyText: { color: colors.text.secondary, fontSize: 16, fontWeight: '700' },
  amountInputWrapper: { flex: 1 },

  noteContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.md },

  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background.tertiary, borderRadius: 12, padding: 14, marginBottom: spacing.md },
  dateSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateSelectorText: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },

  categoryLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryScroll: { gap: 8, paddingBottom: spacing.md },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.background.tertiary, borderWidth: 1.5, borderColor: 'transparent' },
  categoryEmoji: { fontSize: 16 },
  categoryName: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },

  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, marginTop: spacing.xs },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '800' },
  linkText: { color: '#6366F1', fontSize: 13, fontWeight: '800' },

  filterRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.background.tertiary, borderWidth: 1, borderColor: colors.border.dark },
  filterChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  filterChipText: { color: colors.text.secondary, fontWeight: '700', fontSize: 12 },
  filterChipTextActive: { color: '#fff' },

  filterCatsRow: { gap: 8, paddingTop: spacing.sm, paddingBottom: 2 },
  catFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.background.tertiary, borderWidth: 1, borderColor: colors.border.dark },
  catFilterChipActive: { backgroundColor: '#6366F115', borderColor: '#6366F1' },
  catFilterEmoji: { fontSize: 14 },
  catFilterText: { color: colors.text.secondary, fontWeight: '700', fontSize: 12 },
  catFilterTextActive: { color: '#6366F1' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  listTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '700' },
  listCount: { color: colors.text.tertiary, fontSize: 13 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.background.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { color: colors.text.tertiary, fontSize: 14 },

  transactionsList: { backgroundColor: colors.background.secondary, borderRadius: 16, overflow: 'hidden' },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  transactionItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.dark },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  transactionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  transactionEmoji: { fontSize: 20 },
  transactionInfo: { flex: 1 },
  transactionCategory: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },
  transactionMeta: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
  transactionRight: { alignItems: 'flex-end', gap: 4 },
  transactionAmount: { fontSize: 16, fontWeight: '800' },
  deleteButton: { padding: 4 },
});