/**
 * Hook to track which insights have been shown to the user.
 * Feeds into the ranking anti-repeat system.
 *
 * Usage (simple — in renderItem):
 *   const markShown = useTrackInsightShown();
 *   <FlatList renderItem={({ item }) => { markShown(item.id); return <InsightCard ... />; }} />
 *
 * Usage (precise — viewability tracking):
 *   const { viewabilityConfig, onViewableItemsChanged } = useTrackInsightShownWithViewability();
 *   <FlatList viewabilityConfig={viewabilityConfig} onViewableItemsChanged={onViewableItemsChanged} />
 */

import { useCallback, useRef } from 'react';
import { ViewToken } from 'react-native';
import { recordInsightShown } from '@/lib/intelligence/insightFeedback';
import type { Insight } from '@/types';

/**
 * Simple version: call markShown(id) when rendering each item.
 * Deduplicates within the current session so it only fires once per insight.
 */
export function useTrackInsightShown() {
  const tracked = useRef(new Set<string>());

  const markShown = useCallback(async (insightId: string) => {
    if (!insightId) return;
    if (tracked.current.has(insightId)) return;
    tracked.current.add(insightId);

    try {
      await recordInsightShown(insightId);
    } catch {
      // Non-critical — don't crash the UI
    }
  }, []);

  return markShown;
}

/**
 * Precise version: uses FlatList viewability tracking.
 * Only marks as shown when 50%+ visible for 500ms+.
 * Better for analytics accuracy but slightly more setup.
 */
export function useTrackInsightShownWithViewability() {
  const tracked = useRef(new Set<string>());

  const markShown = useCallback(async (insightId: string) => {
    if (!insightId) return;
    if (tracked.current.has(insightId)) return;
    tracked.current.add(insightId);

    try {
      await recordInsightShown(insightId);
    } catch {
      // Non-critical
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 500,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      for (const viewToken of viewableItems) {
        const item = viewToken.item as Insight | undefined;
        if (item?.id) {
          markShown(item.id);
        }
      }
    },
    [markShown]
  );

  return {
    markShown,
    viewabilityConfig,
    onViewableItemsChanged,
  };
}