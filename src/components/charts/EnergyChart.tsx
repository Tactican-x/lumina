/**
 * EnergyChart Component
 * 24-hour energy curve visualization
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { energyPhases, getPhaseFromScore } from '@/constants/energyPhases';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EnergyDataPoint {
  hour: number;
  score: number;
}

interface EnergyChartProps {
  data: EnergyDataPoint[];
  currentHour?: number;
  height?: number;
  showLabels?: boolean;
  showCurrentIndicator?: boolean;
  showPhases?: boolean;
}

export function EnergyChart({
  data,
  currentHour = new Date().getHours(),
  height = 150,
  showLabels = true,
  showCurrentIndicator = true,
  showPhases = false,
}: EnergyChartProps) {
  const chartWidth = SCREEN_WIDTH - spacing.md * 4;
  const chartHeight = height - 40; // Space for labels

  const padding = { top: 10, right: 10, bottom: 30, left: 30 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Normalize data for full 24 hours
  const fullData: EnergyDataPoint[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const existing = data.find((d) => d.hour === hour);
    fullData.push(existing || { hour, score: 50 });
  }

  // Create path
  const xScale = (hour: number) => padding.left + (hour / 23) * graphWidth;
  const yScale = (score: number) =>
    padding.top + graphHeight - (score / 100) * graphHeight;

  // Generate smooth curve path
  const generatePath = () => {
    if (fullData.length === 0) return '';

    const points = fullData.map((d) => ({
      x: xScale(d.hour),
      y: yScale(d.score),
    }));

    // Catmull-Rom to Bezier conversion for smooth curve
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  };

  // Generate area path (for gradient fill)
  const generateAreaPath = () => {
    const linePath = generatePath();
    const lastPoint = fullData[fullData.length - 1];
    const firstPoint = fullData[0];

    return `${linePath} L ${xScale(lastPoint.hour)} ${padding.top + graphHeight} L ${xScale(firstPoint.hour)} ${padding.top + graphHeight} Z`;
  };

  const currentX = xScale(currentHour);
  const currentY = yScale(fullData[currentHour]?.score || 50);
  const currentScore = fullData[currentHour]?.score || 50;
  const currentPhase = getPhaseFromScore(currentScore);
  const phaseConfig = energyPhases[currentPhase];

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={phaseConfig.gradient[0]} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={phaseConfig.gradient[1]} stopOpacity={0.05} />
          </LinearGradient>
          <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={phaseConfig.gradient[0]} />
            <Stop offset="100%" stopColor={phaseConfig.gradient[1]} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[25, 50, 75].map((level) => (
          <Line
            key={level}
            x1={padding.left}
            y1={yScale(level)}
            x2={chartWidth - padding.right}
            y2={yScale(level)}
            stroke={colors.border.dark}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {/* Area fill */}
        <Path d={generateAreaPath()} fill="url(#areaGradient)" />

        {/* Line */}
        <Path
          d={generatePath()}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current time indicator */}
        {showCurrentIndicator && (
          <>
            <Line
              x1={currentX}
              y1={padding.top}
              x2={currentX}
              y2={padding.top + graphHeight}
              stroke={phaseConfig.gradient[0]}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <Circle
              cx={currentX}
              cy={currentY}
              r={6}
              fill={phaseConfig.gradient[0]}
              stroke="#fff"
              strokeWidth={2}
            />
          </>
        )}

        {/* X-axis labels */}
        {showLabels &&
          [0, 6, 12, 18, 23].map((hour) => (
            <SvgText
              key={hour}
              x={xScale(hour)}
              y={chartHeight - 5}
              fontSize={10}
              fill={colors.text.tertiary}
              textAnchor="middle"
            >
              {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
            </SvgText>
          ))}

        {/* Y-axis labels */}
        {showLabels &&
          [0, 50, 100].map((level) => (
            <SvgText
              key={level}
              x={padding.left - 8}
              y={yScale(level) + 3}
              fontSize={10}
              fill={colors.text.tertiary}
              textAnchor="end"
            >
              {level}
            </SvgText>
          ))}
      </Svg>

      {/* Current phase info */}
      {showPhases && (
        <View style={[styles.phaseInfo, { backgroundColor: `${phaseConfig.gradient[0]}20` }]}>
          <Text style={[styles.phaseName, { color: phaseConfig.gradient[0] }]}>
            {phaseConfig.name}
          </Text>
          <Text style={styles.phaseScore}>{currentScore}%</Text>
        </View>
      )}
    </View>
  );
}

// Mini spark line version
export function EnergySparkLine({
  data,
  width = 80,
  height = 24,
  color = colors.brand.primary,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const xStep = width / (data.length - 1);

  const points = data
    .map((value, index) => {
      const x = index * xStep;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Path
        d={`M ${points.split(' ').map((p, i) => (i === 0 ? p : `L ${p}`)).join(' ')}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  phaseInfo: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  phaseName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  phaseScore: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
});
