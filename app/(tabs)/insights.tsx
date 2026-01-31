import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/constants/theme';
import { InsightList } from '@/components/insights/InsightList';
import { useInsights } from '@/hooks';

export default function InsightsScreen() {
  const { insights, isLoading, refresh, activeFilter, setFilter, dismiss } = useInsights();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Neural</Text>
        </View>

        <InsightList
          insights={insights}
          isLoading={isLoading}
          onRefresh={refresh}
          filter={activeFilter}
          onFilterChange={setFilter}
          showFilters
          onInsightPress={(i) => router.push({ pathname: '/(modals)/insight-detail', params: { id: i.id } })}
          onInsightDismiss={(i) => dismiss(i.id)}
          onInsightAction={(i) => {
            if (i.actionType === 'habit' && i.actionPayload?.habitId) {
              router.push({ pathname: '/(modals)/habit-detail', params: { id: String(i.actionPayload.habitId) } });
            } else if (i.actionType === 'goal' && i.actionPayload?.goalId) {
              router.push({ pathname: '/(modals)/goal-detail', params: { id: String(i.actionPayload.goalId) } });
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { padding: spacing.md },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
});