import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { InsightCard } from '@/components/insights/InsightCard';
import { colors } from '@/constants/theme';
import { useInsight } from '@/hooks';

export default function InsightDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { insight } = useInsight(String(id));

  if (!insight) {
    return (
      <View style={styles.screen}>
        <Modal visible onClose={() => router.back()} title="Insight" variant="fullscreen">
          <Text style={{ color: colors.text.secondary }}>Insight not found.</Text>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Insight" variant="fullscreen">
        {/* IMPORTANT: In detail view we don't need swipe-to-dismiss. */}
        <InsightCard
          insight={insight}
          expanded
          showDismiss={false}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
});