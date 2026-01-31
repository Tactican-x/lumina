/**
 * HeatMap Component
 * Weekly performance heatmap (days x time blocks)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface HeatMapData {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  value: number; // 0-100
  count?: number;
}

interface HeatMapProps {
  data: HeatMapData[];
  onCellPress?: (data: HeatMapData) => void;
  showLabels?: boolean;
  showLegend?: boolean;
  cellSize?: number;
  colorScale?: 'performance' | 'energy' | 'completion';
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_BLOCKS = [
  { start: 6, end: 9, label: '6-9am' },
  { start: 9, end: 12, label: '9-12pm' },
  { start: 12, end: 15, label: '12-3pm' },
  { start: 15, end: 18, label: '3-6pm' },
  { start: 18, end: 21, label: '6-9pm' },
  { start: 21, end: 24, label: '9-12am' },
];

export function HeatMap({
  data,
  onCellPress,
  showLabels = true,
  showLegend = true,
  cellSize = 32,
  colorScale = 'performance',
}: HeatMapProps) {
  // Create matrix: 7 days x 6 time blocks
  const matrix: (HeatMapData | null)[][] = [];

  for (let day = 0; day < 7; day++) {
    matrix[day] = [];
    for (let block = 0; block < TIME_BLOCKS.length; block++) {
      const timeBlock = TIME_BLOCKS[block];
      const cellData = data.find(
        (d) => d.day === day && d.hour >= timeBlock.start && d.hour < timeBlock.end
      );
      matrix[day][block] = cellData || null;
    }
  }

  const getColor = (value: number | null): string => {
    if (value === null) return colors.background.tertiary;

    const scales = {
      performance: [
        { threshold: 80, color: colors.success.main },
        { threshold: 60, color: colors.success.light },
        { threshold: 40, color: colors.warning.main },
        { threshold: 20, color: colors.warning.light },
        { threshold: 0, color: colors.danger.light },
      ],
      energy: [
        { threshold: 80, color: '#10b981' },
        { threshold: 60, color: '#3b82f6' },
        { threshold: 40, color: '#f59e0b' },
        { threshold: 20, color: '#f97316' },
        { threshold: 0, color: '#6b7280' },
      ],
      completion: [
        { threshold: 80, color: colors.success.main },
        { threshold: 50, color: colors.brand.primary },
        { threshold: 20, color: colors.warning.main },
        { threshold: 0, color: colors.background.elevated },
      ],
    };

    const scale = scales[colorScale];
    for (const level of scale) {
      if (value >= level.threshold) {
        return level.color;
      }
    }
    return colors.background.tertiary;
  };

  return (
    <View style={styles.container}>
      {/* Time labels (top) */}
      {showLabels && (
        <View style={styles.timeLabelsContainer}>
          <View style={{ width: 40 }} />
          {TIME_BLOCKS.map((block, index) => (
            <Text
              key={index}
              style={[styles.timeLabel, { width: cellSize }]}
              numberOfLines={1}
            >
              {block.label.split('-')[0]}
            </Text>
          ))}
        </View>
      )}

      {/* Grid */}
      <View style={styles.grid}>
        {matrix.map((row, dayIndex) => (
          <View key={dayIndex} style={styles.row}>
            {/* Day label */}
            {showLabels && (
              <Text style={styles.dayLabel}>{DAY_LABELS[dayIndex]}</Text>
            )}

            {/* Cells */}
            {row.map((cell, blockIndex) => (
              <TouchableOpacity
                key={blockIndex}
                onPress={() => cell && onCellPress?.(cell)}
                activeOpacity={cell ? 0.7 : 1}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: getColor(cell?.value ?? null),
                  },
                ]}
              >
                {cell && cell.count !== undefined && cell.count > 0 && (
                  <Text style={styles.cellCount}>{cell.count}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          <Text style={styles.legendLabel}>Low</Text>
          <View style={styles.legendScale}>
            {[20, 40, 60, 80, 100].map((value) => (
              <View
                key={value}
                style={[
                  styles.legendCell,
                  { backgroundColor: getColor(value) },
                ]}
              />
            ))}
          </View>
          <Text style={styles.legendLabel}>High</Text>
        </View>
      )}
    </View>
  );
}

// Contribution-style heatmap (GitHub style)
interface ContributionData {
  date: string; // YYYY-MM-DD
  value: number; // 0-100 or count
}

export function ContributionHeatMap({
  data,
  weeks = 12,
  cellSize = 12,
  onCellPress,
}: {
  data: ContributionData[];
  weeks?: number;
  cellSize?: number;
  onCellPress?: (data: ContributionData) => void;
}) {
  // Create data map
  const dataMap = new Map(data.map((d) => [d.date, d.value]));

  // Generate dates for last N weeks
  const dates: Date[][] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7 - 1));

  // Align to start of week (Sunday)
  startDate.setDate(startDate.getDate() - startDate.getDay());

  let currentDate = new Date(startDate);
  let weekIndex = 0;
  dates[weekIndex] = [];

  while (currentDate <= today) {
    if (currentDate.getDay() === 0 && dates[weekIndex].length > 0) {
      weekIndex++;
      dates[weekIndex] = [];
    }
    dates[weekIndex].push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const getColor = (value: number | undefined): string => {
    if (value === undefined || value === 0) return colors.background.tertiary;
    if (value >= 80) return colors.success.main;
    if (value >= 60) return colors.success.light;
    if (value >= 40) return colors.brand.primary;
    if (value >= 20) return `${colors.brand.primary}80`;
    return `${colors.brand.primary}40`;
  };

  return (
    <View style={styles.contributionContainer}>
      <View style={styles.contributionGrid}>
        {dates.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.contributionWeek}>
            {week.map((date) => {
              const dateKey = date.toISOString().split('T')[0];
              const value = dataMap.get(dateKey);

              return (
                <TouchableOpacity
                  key={dateKey}
                  onPress={() =>
                    onCellPress?.({ date: dateKey, value: value || 0 })
                  }
                  activeOpacity={0.7}
                  style={[
                    styles.contributionCell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getColor(value),
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  timeLabelsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  timeLabel: {
    fontSize: 8,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  grid: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dayLabel: {
    width: 40,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  cell: {
    borderRadius: borderRadius.sm,
    marginRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCount: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  legendLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  legendScale: {
    flexDirection: 'row',
    gap: 2,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },

  // Contribution heatmap
  contributionContainer: {
    alignItems: 'center',
  },
  contributionGrid: {
    flexDirection: 'row',
  },
  contributionWeek: {
    marginRight: 2,
  },
  contributionCell: {
    borderRadius: 2,
    marginBottom: 2,
  },
});
