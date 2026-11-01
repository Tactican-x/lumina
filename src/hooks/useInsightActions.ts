import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useInsightStore } from '@/stores/insightStore';
import type { Insight } from '@/types';

/**
 * Hook that wraps all insight interactions with:
 * - Auto mark-as-read on expand
 * - Haptic feedback on actions
 * - Feedback state management
 */
export function useInsightActions() {
  const {
    markAsRead,
    dismissInsight,
    markHelpful,
    markNotHelpful,
    getFeedbackValue,
  } = useInsightStore();

  const haptic = useCallback(
    (type: 'light' | 'medium' | 'success' | 'warning' = 'light') => {
      if (Platform.OS === 'web') return;
      try {
        switch (type) {
          case 'light':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'success':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'warning':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
        }
      } catch {
        // Haptics not available
      }
    },
    []
  );

  const handleExpand = useCallback(
    (insight: Insight) => {
      if (!insight.isRead) {
        markAsRead(insight.id);
      }
      haptic('light');
    },
    [markAsRead, haptic]
  );

  const handleDismiss = useCallback(
    (insight: Insight) => {
      haptic('medium');
      dismissInsight(insight.id);
    },
    [dismissInsight, haptic]
  );

  const handleHelpful = useCallback(
    (insight: Insight) => {
      haptic('success');
      markHelpful(insight.id);
    },
    [markHelpful, haptic]
  );

  const handleNotHelpful = useCallback(
    (insight: Insight) => {
      haptic('warning');
      markNotHelpful(insight.id);
    },
    [markNotHelpful, haptic]
  );

  const handleAction = useCallback(
    (insight: Insight) => {
      haptic('light');
      // Mark read when taking action
      if (!insight.isRead) {
        markAsRead(insight.id);
      }
      // Navigation handled by parent — this just provides feedback
    },
    [markAsRead, haptic]
  );

  return {
    handleExpand,
    handleDismiss,
    handleHelpful,
    handleNotHelpful,
    handleAction,
    getFeedbackValue,
    haptic,
  };
}