import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

import { monthKeyFromDate, formatCents, parseAmountToCents, formatMonthLabel, getCurrencySymbol, daysInMonth } from '@/lib/money/money';
import { useMoneyDashboard } from '@/hooks/money/useMoneyDashboard';
import { upsertMoneyBudgetForMonth } from '@/db/repositories/moneyBudgets';
import { useCurrencyStore } from '@/stores/currencyStore';
import { useMoneyUiStore } from '@/stores/moneyUiStore';

export default function MoneyBudgets() {
  // ✅ Use shared month selection (Dashboard/Transactions/Budgets all aligned)
  const monthKey = useMoneyUiStore((s) => s.monthKey);
  const prevMonth = useMoneyUiStore((s) => s.prevMonth);
  const nextMonth = useMoneyUiStore((s) => s.nextMonth);
  const resetToCurrentMonth = useMoneyUiStore((s) => s.resetToCurrentMonth);

  const { summary, budget, refresh } = useMoneyDashboard(monthKey);
  const { currencyCode } = useCurrencyStore();

  // ✅ Budget input should update when monthKey/budget changes
  const [budgetText, setBudgetText] = useState('');
  useEffect(() => {
    setBudgetText(budget?.expenseBudgetCents != null ? String((budget.expenseBudgetCents / 100).toFixed(2)) : '');
  }, [monthKey, budget?.expenseBudgetCents]);

  const spent = summary.expenseCents;
  const goal = budget?.expenseBudgetCents ?? 0;
  const remaining = Math.max(0, goal - spent);

  const progress = goal > 0 ? Math.min(spent / goal, 1) : 0;
  const percentage = goal > 0 ? Math.round((spent / goal) * 100) : 0;
  const isOverBudget = spent > goal && goal > 0;
  const isNearLimit = percentage >= 80 && !isOverBudget;

  const progressColor = isOverBudget ? '#EF4444' : isNearLimit ? '#F59E0B' : '#10B981';

  // Daily budget makes sense for CURRENT month only (not historical months)
  const now = new Date();
  const viewingCurrentMonth = monthKeyFromDate(now) === monthKey;

  const dim = daysInMonth(monthKey);
  const day = now.getDate();
  const daysRemaining = viewingCurrentMonth ? Math.max(1, dim - day + 1) : 0;
  const dailyBudget = viewingCurrentMonth && goal > 0 ? Math.round(remaining / daysRemaining) : 0;

  // Quick amounts based on currency
  const quickAmounts = currencyCode === 'KES' ? [5000, 10000, 20000, 50000] : [500, 1000, 1500, 2000];

  const onSave = async () => {
    const cents = parseAmountToCents(budgetText);
    if (cents == null || cents < 0) {
      Alert.alert('Invalid budget', 'Enter a valid amount like 1500.00');
      return;
    }

    await upsertMoneyBudgetForMonth({ monthKey, expenseBudgetCents: cents });
    await refresh();
    Alert.alert('Saved', 'Monthly budget updated.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Budget</Text>
              <Text style={styles.subtitle}>{formatMonthLabel(monthKey)}</Text>
            </View>
          </View>

          {/* "This month" shortcut */}
          <TouchableOpacity onPress={resetToCurrentMonth} style={styles.calendarButton} activeOpacity={0.85}>
            <Ionicons name="today-outline" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Month Navigation ── */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={prevMonth} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
            <Text style={styles.navText}>Prev</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCenter} onPress={resetToCurrentMonth} activeOpacity={0.85}>
            <Text style={styles.navCenterText}>This month</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={nextMonth} activeOpacity={0.85}>
            <Text style={styles.navText}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Main Budget Card ── */}
        <View style={styles.mainCard}>
          <View style={styles.circularContainer}>
            <View style={[styles.circularOuter, { borderColor: `${progressColor}30` }]}>
              <View style={[styles.circularProgress, { borderColor: progressColor }]}>
                <View style={styles.circularInner}>
                  <Text style={[styles.circularPercent, { color: progressColor }]}>
                    {goal > 0 ? `${percentage}%` : '—'}
                  </Text>
                  <Text style={styles.circularLabel}>used</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${progressColor}20` }]}>
            <Ionicons
              name={isOverBudget ? 'warning' : isNearLimit ? 'alert-circle' : 'checkmark-circle'}
              size={16}
              color={progressColor}
            />
            <Text style={[styles.statusText, { color: progressColor }]}>
              {isOverBudget ? 'Over Budget' : isNearLimit ? 'Near Limit' : 'On Track'}
            </Text>
          </View>

          <Text style={styles.spentAmount}>{formatCents(spent)}</Text>
          <Text style={styles.ofBudget}>of {formatCents(goal)} budget</Text>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="arrow-up" size={18} color="#EF4444" />
            </View>
            <Text style={styles.statValue}>{formatCents(spent)}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="wallet-outline" size={18} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{formatCents(remaining)}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#6366F120' }]}>
              <Ionicons name="today-outline" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.statValue, { color: '#6366F1' }]}>
              {viewingCurrentMonth ? formatCents(dailyBudget) : '—'}
            </Text>
            <Text style={styles.statLabel}>Daily Limit</Text>
          </View>
        </View>

        {/* ── Progress Bar Section ── */}
        <Card variant="default" padding="md">
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Spending Progress</Text>
            <Text style={styles.daysLeft}>{viewingCurrentMonth ? `${daysRemaining} days left` : 'Past month'}</Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
              <View style={[styles.milestone, { left: '50%' }]} />
              <View style={[styles.milestone, { left: '80%' }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelText}>{getCurrencySymbol()}0</Text>
              <Text style={styles.progressLabelText}>{formatCents(goal / 2)}</Text>
              <Text style={styles.progressLabelText}>{formatCents(goal)}</Text>
            </View>
          </View>

          {isOverBudget && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={18} color="#EF4444" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Over budget!</Text>
                <Text style={styles.warningSubtitle}>You've exceeded by {formatCents(spent - goal)}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* ── Set Budget Card ── */}
        <Card variant="default" padding="md">
          <View style={styles.setBudgetHeader}>
            <View style={styles.setBudgetIcon}>
              <Ionicons name="create-outline" size={20} color="#6366F1" />
            </View>
            <View>
              <Text style={styles.setBudgetTitle}>Set Monthly Goal</Text>
              <Text style={styles.setBudgetSubtitle}>Define your spending limit</Text>
            </View>
          </View>

          <View style={styles.amountInputContainer}>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Input
                label=""
                value={budgetText}
                onChangeText={setBudgetText}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
          </View>

          <View style={styles.quickAmounts}>
            {quickAmounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAmountBtn}
                onPress={() => setBudgetText(String(amount))}
                activeOpacity={0.85}
              >
                <Text style={styles.quickAmountText}>
                  {getCurrencySymbol()} {amount.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={onSave} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Budget</Text>
          </TouchableOpacity>
        </Card>

        {/* ── Tips Section ── */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Budget Tips</Text>

          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="trending-down-outline" size={18} color="#10B981" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipCardTitle}>Track Daily</Text>
              <Text style={styles.tipCardText}>
                {viewingCurrentMonth ? `With ${formatCents(dailyBudget)}/day, you'll stay on track` : 'Review past months to improve next month.'}
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="pie-chart-outline" size={18} color="#6366F1" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipCardTitle}>Category Budgets</Text>
              <Text style={styles.tipCardText}>Set limits per category — coming soon!</Text>
            </View>
          </View>
        </View>
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
  calendarButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background.secondary, alignItems: 'center', justifyContent: 'center' },

  monthNav: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.background.secondary },
  navText: { color: colors.text.primary, fontWeight: '700', fontSize: 13 },
  navCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.background.secondary },
  navCenterText: { color: colors.text.secondary, fontWeight: '700', fontSize: 13 },

  mainCard: { backgroundColor: '#1E1E1E', borderRadius: 24, padding: 24, alignItems: 'center' },
  circularContainer: { marginBottom: 16 },
  circularOuter: { width: 140, height: 140, borderRadius: 70, borderWidth: 12, alignItems: 'center', justifyContent: 'center' },
  circularProgress: { width: 116, height: 116, borderRadius: 58, borderWidth: 12, borderLeftColor: 'transparent', borderBottomColor: 'transparent', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-45deg' }] },
  circularInner: { alignItems: 'center', transform: [{ rotate: '45deg' }] },
  circularPercent: { fontSize: 28, fontWeight: '800' },
  circularLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  statusText: { fontSize: 13, fontWeight: '700' },
  spentAmount: { color: '#fff', fontSize: 32, fontWeight: '800' },
  ofBudget: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4 },

  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.background.secondary, borderRadius: 16, padding: 14, alignItems: 'center' },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { color: colors.text.primary, fontSize: 15, fontWeight: '800' },
  statLabel: { color: colors.text.tertiary, fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  progressTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  daysLeft: { color: colors.text.tertiary, fontSize: 13, fontWeight: '600' },
  progressBarContainer: { marginBottom: spacing.sm },
  progressTrack: { height: 14, borderRadius: 7, backgroundColor: colors.background.tertiary, overflow: 'hidden', position: 'relative' },
  progressFill: { height: '100%', borderRadius: 7 },
  milestone: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressLabelText: { color: colors.text.tertiary, fontSize: 11 },

  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.md, padding: 14, borderRadius: 12, backgroundColor: '#EF44441A' },
  warningContent: { flex: 1 },
  warningTitle: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  warningSubtitle: { color: '#EF4444', fontSize: 12, opacity: 0.8, marginTop: 2 },

  setBudgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.md },
  setBudgetIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#6366F115', alignItems: 'center', justifyContent: 'center' },
  setBudgetTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  setBudgetSubtitle: { color: colors.text.tertiary, fontSize: 12, marginTop: 1 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  currencyBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.background.tertiary, alignItems: 'center', justifyContent: 'center' },
  currencySymbol: { color: colors.text.secondary, fontSize: 18, fontWeight: '700' },
  inputWrapper: { flex: 1 },

  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  quickAmountBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.background.tertiary, alignItems: 'center' },
  quickAmountText: { color: colors.text.secondary, fontSize: 12, fontWeight: '600' },

  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: '#6366F1' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  tipsSection: { gap: 10 },
  tipsTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.background.secondary, borderRadius: 14, padding: 14 },
  tipIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background.tertiary, alignItems: 'center', justifyContent: 'center' },
  tipContent: { flex: 1 },
  tipCardTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  tipCardText: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
});