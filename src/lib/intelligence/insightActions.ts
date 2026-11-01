/**
 * Insight Action Router
 *
 * Handles navigation when users tap action buttons on insight cards.
 * Maps actionType + actionPayload → expo-router navigation.
 */

import { router } from 'expo-router';
import type { Insight } from '@/types';

export function handleInsightAction(insight: Insight): boolean {
  const { actionType, actionPayload } = insight;
  const payload = actionPayload as Record<string, unknown> | null;

  if (!actionType) return false;

  try {
    switch (actionType) {
      case 'habit': {
        const habitId = payload?.habitId as string | undefined;
        if (habitId) {
          router.push(`/(tabs)/home`);
          // Or if you have a habit detail screen:
          // router.push(`/(modals)/habit/${habitId}`);
        } else {
          router.push('/(tabs)/home');
        }
        return true;
      }

      case 'task': {
        const taskId = payload?.taskId as string | undefined;
        if (taskId) {
          router.push('/(tabs)/tasks');
          // Or: router.push(`/(modals)/task/${taskId}`);
        } else {
          router.push('/(tabs)/tasks');
        }
        return true;
      }

      case 'goal': {
        const goalId = payload?.goalId as string | undefined;
        if (goalId) {
          router.push('/(tabs)/goals');
          // Or: router.push(`/(modals)/goal/${goalId}`);
        } else {
          router.push('/(tabs)/goals');
        }
        return true;
      }

      case 'energy': {
        // Navigate to energy logging
        router.push('/(tabs)/home');
        return true;
      }

      case 'setting': {
        router.push('/(tabs)/profile');
        return true;
      }

      case 'external':
      default:
        // No specific navigation — handled by parent
        return false;
    }
  } catch (e) {
    console.warn('[InsightActions] Navigation failed:', e);
    return false;
  }
}