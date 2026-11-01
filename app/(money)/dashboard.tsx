import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/constants/theme';

import { formatMonthLabel, formatCents } from '@/lib/money/money';
import { useMoneyDashboard } from '@/hooks/money/useMoneyDashboard';
import { useCurrencyStore } from '@/stores/currencyStore';
import { useMoneyUiStore } from '@/stores/moneyUiStore';

import { PieChart } from '@/components/money/PieChart';
import { MonthlyBarChart } from '@/components/money/MonthlyBarChart';

export default function MoneyDashboard() {
  const monthKey = useMoneyUiStore((s) => s.monthKey);
  const prevMonth = useMoneyUiStore((s) => s.prevMonth);
  const nextMonth = useMoneyUiStore((s) => s.nextMonth);
  const resetToCurrentMonth = useMoneyUiStore((s) => s.resetToCurrentMonth);

  const { summary, recent, breakdown, categoryById, budget, monthlySeries, isLoading } = useMoneyDashboard(monthKey, {
    monthsBack: 6,
  });

  const { getCurrency } = useCurrencyStore();
  const currency = getCurrency();

  const spent = summary.expenseCents;
  const income = summary.incomeCents;
  const net = summary.netCents;

  const goal = budget?.expenseBudgetCents ?? 0;
  const remaining = goal > 0 ? Math.max(0, goal - spent) : 0;
  const pct = goal > 0 ? Math.min(1, spent / goal) : 0;

  const pieData = useMemo(() => {
    const topN = 5;

    const items = breakdown
      .map((b) => {
        const c = categoryById.get(b.categoryId);
        return {
          label: c?.name ?? 'Category',
          value: b.totalCents ?? 0,
          color: c?.color ?? colors.brand.primary,
          emoji: c?.emoji ?? '•',
        };
      })
      .filter((x) => x.value > 0);

    const top = items.slice(0, topN);
    const rest = items.slice(topN);
    const restSum = rest.reduce((s, x) => s + x.value, 0);

    // Avoid duplicate label "Other" (you already have a real "Other" category)
    const slices =
      restSum > 0
        ? [...top.map(({ label, value, color }) => ({ label, value, color })), { label: 'Other categories', value: restSum, color: colors.text.tertiary }]
        : top.map(({ label, value, color }) => ({ label, value, color }));

    return {
      slices,
      legend: top,
      total: items.reduce((s, x) => s + x.value, 0),
      hasOther: restSum > 0,
    };
  }, [breakdown, categoryById]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Financial Overview</Text>
            <Text style={styles.subtitle}>{formatMonthLabel(monthKey)}</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/(money)/settings')} style={styles.menuButton} activeOpacity={0.85}>
            <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Month Navigation ── */}
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

        {/* ── Main Balance Card ── */}
        <View style={styles.balanceCard}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyFlag}>{currency.flag}</Text>
            <Text style={styles.currencyCode}>{currency.code}</Text>
          </View>

          <Text style={styles.balanceLabel}>Net Balance</Text>
          <Text style={[styles.balanceValue, { color: net >= 0 ? '#10B981' : '#EF4444' }]}>{formatCents(net)}</Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="arrow-down" size={16} color="#10B981" />
              </View>
              <View>
                <Text style={styles.miniLabel}>Income</Text>
                <Text style={styles.miniValue}>{formatCents(income)}</Text>
              </View>
            </View>

            <View style={styles.balanceItem}>
              <View style={[styles.iconCircle, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="arrow-up" size={16} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.miniLabel}>Expenses</Text>
                <Text style={styles.miniValue}>{formatCents(spent)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Monthly Trends ── */}
        <Card variant="default" padding="md">
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Monthly Trends</Text>
            <Text style={styles.chartHint}>Last 6 months</Text>
          </View>

          {isLoading ? (
            <Text style={styles.muted}>Loading trends…</Text>
          ) : monthlySeries.length === 0 ? (
            <Text style={styles.muted}>No history yet.</Text>
          ) : (
            <View style={{ marginTop: spacing.md }}>
              <MonthlyBarChart series={monthlySeries} height={160} />
            </View>
          )}
        </Card>

        {/* ── Budget Tracker ── */}
        <Card variant="default" padding="md">
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Monthly Budget</Text>
            <TouchableOpacity onPress={() => router.push('/(money)/budgets')} activeOpacity={0.85}>
              <Text style={styles.linkText}>{goal > 0 ? 'Edit Goal' : 'Set Goal'}</Text>
            </TouchableOpacity>
          </View>

          {goal > 0 ? (
            <View style={{ marginTop: spacing.sm }}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  <Text style={{ fontWeight: '700', color: colors.text.primary }}>{formatCents(spent)}</Text>
                  <Text style={{ color: colors.text.tertiary }}> of {formatCents(goal)}</Text>
                </Text>
                <Text style={[styles.progressPercent, { color: pct > 0.9 ? '#EF4444' : '#6366F1' }]}>
                  {Math.round(pct * 100)}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct * 100}%`, backgroundColor: pct > 0.9 ? '#EF4444' : '#6366F1' },
                  ]}
                />
              </View>

              <Text style={styles.remainingText}>{formatCents(remaining)} left to spend</Text>
            </View>
          ) : (
            <Text style={styles.muted}>No budget set for this month.</Text>
          )}
        </Card>

        {/* ── Spending Breakdown (Pie) ── */}
        <Card variant="default" padding="md">
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Spending Breakdown</Text>
            <TouchableOpacity onPress={() => router.push('/(money)/categories')} activeOpacity={0.85}>
              <Text style={styles.linkText}>Categories</Text>
            </TouchableOpacity>
          </View>

          {breakdown.length === 0 ? (
            <Text style={styles.muted}>No expenses to show yet.</Text>
          ) : (
            <View style={styles.pieContainer}>
              <View style={styles.pieChartWrapper}>
                <PieChart data={pieData.slices} size={140} />
              </View>

              <View style={styles.pieLegend}>
                {pieData.legend.map((item) => {
                  const percent = pieData.total > 0 ? Math.round((item.value / pieData.total) * 100) : 0;
                  return (
                    <View key={item.label} style={styles.legendItem}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendEmoji}>{item.emoji}</Text>
                        <Text style={styles.legendLabel} numberOfLines={1}>
                          {item.label}
                        </Text>
                      </View>
                      <View style={styles.legendRight}>
                        <Text style={styles.legendPercent}>{percent}%</Text>
                        <Text style={styles.legendAmount}>{formatCents(item.value)}</Text>
                      </View>
                    </View>
                  );
                })}

                {pieData.hasOther ? (
                  <Text style={styles.otherNote}>Small categories grouped as “Other categories”.</Text>
                ) : null}
              </View>
            </View>
          )}
        </Card>

        {/* ── Recent Transactions ── */}
        <Card variant="default" padding="md">
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity onPress={() => router.push('/(money)/transactions')} activeOpacity={0.85}>
              <Text style={styles.linkText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 16, marginTop: spacing.md }}>
            {recent.length === 0 ? (
              <Text style={styles.muted}>No transactions yet.</Text>
            ) : (
              recent.slice(0, 5).map((t: any) => {
                const cat = categoryById.get(t.categoryId);
                const isExpense = t.type === 'expense';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.txRow}
                    onPress={() => router.push(`/(money)/edit-transaction?id=${t.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.txLeftGroup}>
                      <View style={styles.txIcon}>
                        <Text style={{ fontSize: 18 }}>{cat?.emoji ?? '💰'}</Text>
                      </View>
                      <View>
                        <Text style={styles.txName}>{cat?.name ?? 'General'}</Text>
                        <Text style={styles.txDate}>{new Date(t.occurredAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <Text style={[styles.txAmount, { color: isExpense ? '#EF4444' : '#10B981' }]}>
                      {isExpense ? '-' : '+'}
                      {formatCents(t.amountCents)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcome: { color: colors.text.primary, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.text.tertiary, fontSize: 14, fontWeight: '500' },
  menuButton: { padding: 10, backgroundColor: colors.background.secondary, borderRadius: 12 },

  monthNav: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.background.secondary,
  },
  navText: { color: colors.text.primary, fontWeight: '700', fontSize: 13 },
  navCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.background.secondary,
  },
  navCenterText: { color: colors.text.secondary, fontWeight: '700', fontSize: 13 },

  balanceCard: { backgroundColor: '#1E1E1E', borderRadius: 24, padding: 24, alignItems: 'center' },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  currencyFlag: { fontSize: 14 },
  currencyCode: { color: '#fff', fontSize: 12, fontWeight: '600' },

  balanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  balanceValue: { fontSize: 36, fontWeight: '800', marginBottom: 20 },

  balanceRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  balanceItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  miniLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  miniValue: { color: '#fff', fontSize: 15, fontWeight: '700' },

  sectionTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '700' },
  linkText: { color: '#6366F1', fontWeight: '700', fontSize: 14 },
  chartHint: { color: colors.text.tertiary, fontSize: 12, fontWeight: '500' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: colors.text.tertiary, textAlign: 'center', marginTop: 10 },

  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  progressText: { fontSize: 14 },
  progressPercent: { fontSize: 16, fontWeight: '800' },
  progressTrack: { height: 12, backgroundColor: colors.background.tertiary, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  remainingText: { color: colors.text.tertiary, fontSize: 12, marginTop: 8, fontWeight: '600' },

  pieContainer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.md },
  pieChartWrapper: { alignItems: 'center' },
  pieLegend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendEmoji: { fontSize: 14 },
  legendLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '600', flex: 1 },
  legendRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendPercent: { color: colors.text.tertiary, fontSize: 12, fontWeight: '600', minWidth: 30, textAlign: 'right' },
  legendAmount: { color: colors.text.primary, fontSize: 13, fontWeight: '700' },
  otherNote: { color: colors.text.tertiary, fontSize: 11, fontStyle: 'italic', marginTop: 4 },

  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: { width: 44, height: 44, backgroundColor: colors.background.tertiary, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txName: { color: colors.text.primary, fontWeight: '700', fontSize: 15 },
  txDate: { color: colors.text.tertiary, fontSize: 12 },
  txAmount: { fontWeight: '800', fontSize: 16 },
});