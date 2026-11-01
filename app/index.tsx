import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

export default function HubScreen() {
  const openLumina = useCallback(() => {
    router.push('/(tabs)/home');
  }, []);

  const openMoney = useCallback(() => {
    router.push('/(money)/dashboard');
  }, []);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.container}
      >
        
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>{greeting}</Text>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>What would you like{'\n'}to focus on today?</Text>
        </View>

        {/* ── Quick Stats ── */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#6366F115' }]}>
              <Ionicons name="checkmark-done" size={18} color="#6366F1" />
            </View>
            <View>
              <Text style={styles.quickStatValue}>2</Text>
              <Text style={styles.quickStatLabel}>Modules</Text>
            </View>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="pulse" size={18} color="#10B981" />
            </View>
            <View>
              <Text style={styles.quickStatValue}>Active</Text>
              <Text style={styles.quickStatLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* ── Module Cards ── */}
        <View style={styles.modulesSection}>
          <Text style={styles.sectionTitle}>Your Modules</Text>

          {/* Lumina Card */}
          <TouchableOpacity 
            style={styles.moduleCard}
            onPress={openLumina}
            activeOpacity={0.8}
          >
            <View style={styles.moduleCardInner}>
              <View style={styles.moduleLeft}>
                <View style={[styles.moduleIcon, { backgroundColor: '#6366F1' }]}>
                  <Ionicons name="sparkles" size={26} color="#fff" />
                </View>
              </View>

              <View style={styles.moduleCenter}>
                <View style={styles.moduleTitleRow}>
                  <Text style={styles.moduleTitle}>Lumina</Text>
                  <View style={styles.aiBadge}>
                    <Ionicons name="flash" size={10} color="#6366F1" />
                    <Text style={styles.aiBadgeText}>AI</Text>
                  </View>
                </View>
                <Text style={styles.moduleTagline}>Personal Growth Engine</Text>
                <Text style={styles.moduleDesc}>
                  Track habits, manage tasks, monitor energy levels, and receive personalized insights.
                </Text>

                <View style={styles.moduleFeatures}>
                  <View style={styles.featureTag}>
                    <Text style={styles.featureTagText}>Habits</Text>
                  </View>
                  <View style={styles.featureTag}>
                    <Text style={styles.featureTagText}>Tasks</Text>
                  </View>
                  <View style={styles.featureTag}>
                    <Text style={styles.featureTagText}>Insights</Text>
                  </View>
                  <View style={styles.featureTag}>
                    <Text style={styles.featureTagText}>Energy</Text>
                  </View>
                </View>
              </View>

              <View style={styles.moduleRight}>
                <Ionicons name="chevron-forward" size={22} color={colors.text.tertiary} />
              </View>
            </View>

            <View style={[styles.moduleAccent, { backgroundColor: '#6366F1' }]} />
          </TouchableOpacity>

          {/* Money Tracker Card */}
          <TouchableOpacity 
            style={styles.moduleCard}
            onPress={openMoney}
            activeOpacity={0.8}
          >
            <View style={styles.moduleCardInner}>
              <View style={styles.moduleLeft}>
                <View style={[styles.moduleIcon, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="wallet" size={26} color="#fff" />
                </View>
              </View>

              <View style={styles.moduleCenter}>
                <View style={styles.moduleTitleRow}>
                  <Text style={styles.moduleTitle}>Money Tracker</Text>
                  <View style={[styles.aiBadge, { backgroundColor: '#10B98115' }]}>
                    <Ionicons name="shield-checkmark" size={10} color="#10B981" />
                    <Text style={[styles.aiBadgeText, { color: '#10B981' }]}>Private</Text>
                  </View>
                </View>
                <Text style={styles.moduleTagline}>Financial Command Center</Text>
                <Text style={styles.moduleDesc}>
                  Monitor income and expenses, set budgets, categorize spending — all offline and secure.
                </Text>

                <View style={styles.moduleFeatures}>
                  <View style={styles.featureTag}>
                    <Text style={styles.featureTagText}>Income</Text>
                  </View>
                  <View style={styles.featureTag}>
                    <Text style={styles.featureTagText}>Expenses</Text>
                  </View>
                  <View style={styles.featureTag}>
                    <Text style={styles.featureTagText}>Budgets</Text>
                  </View>
                  <View style={styles.featureTag}>
                    <Text style={styles.featureTagText}>Reports</Text>
                  </View>
                </View>
              </View>

              <View style={styles.moduleRight}>
                <Ionicons name="chevron-forward" size={22} color={colors.text.tertiary} />
              </View>
            </View>

            <View style={[styles.moduleAccent, { backgroundColor: '#10B981' }]} />
          </TouchableOpacity>
        </View>

        {/* ── Inspirational Quote ── */}
        <View style={styles.quoteSection}>
          <View style={styles.quoteCard}>
            <View style={styles.quoteIconWrap}>
              <Ionicons name="bulb" size={22} color="#F59E0B" />
            </View>
            <View style={styles.quoteContent}>
              <Text style={styles.quoteText}>
                "What gets measured gets managed. Track your habits to build the life you want, and monitor your money to build the future you deserve."
              </Text>
              <View style={styles.quoteFooter}>
                <View style={styles.quoteLine} />
                <Text style={styles.quoteAuthor}>The Philosophy of Progress</Text>
              </View>
            </View>
          </View>

          <View style={styles.insightCards}>
            <View style={styles.insightCard}>
              <Ionicons name="trending-up" size={20} color="#6366F1" />
              <Text style={styles.insightTitle}>1% Better Daily</Text>
              <Text style={styles.insightDesc}>Small habits compound into remarkable results over time</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="eye" size={20} color="#10B981" />
              <Text style={styles.insightTitle}>Awareness = Control</Text>
              <Text style={styles.insightDesc}>You can't improve what you don't track</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <View style={styles.footerLogo}>
              <Ionicons name="cube-outline" size={18} color="#6366F1" />
            </View>
            <Text style={styles.footerBrandText}>Lumina Suite</Text>
          </View>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    padding: spacing.md,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    marginBottom: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greeting: {
    color: colors.text.tertiary,
    fontSize: 15,
    fontWeight: '500',
  },
  dateBadge: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: colors.text.primary,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
  },

  /* Quick Stats */
  quickStats: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  quickStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatValue: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  quickStatLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 1,
  },
  quickStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border.dark,
    marginHorizontal: spacing.md,
  },

  /* Modules Section */
  modulesSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },

  /* Module Card */
  moduleCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  moduleCardInner: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingLeft: spacing.md + 4,
  },
  moduleLeft: {
    marginRight: 14,
  },
  moduleIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCenter: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#6366F115',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: '#6366F1',
    fontSize: 10,
    fontWeight: '700',
  },
  moduleTagline: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  moduleDesc: {
    color: colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  moduleFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  featureTag: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  featureTagText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  moduleRight: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  moduleAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },

  /* Quote Section */
  quoteSection: {
    marginBottom: spacing.lg,
  },
  quoteCard: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B10',
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F59E0B25',
    marginBottom: 14,
  },
  quoteIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F59E0B15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  quoteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  quoteLine: {
    width: 20,
    height: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 1,
  },
  quoteAuthor: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Insight Cards */
  insightCards: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  insightTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  insightDesc: {
    color: colors.text.tertiary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLogo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#6366F115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBrandText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  footerVersion: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
  },
});