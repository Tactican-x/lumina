import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { colors, spacing, typography } from '@/constants/theme';

type Slice = {
  label: string;
  value: number;
  color: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArcWedge(cx: number, cy: number, r: number, start: number, end: number) {
  const startPt = polarToCartesian(cx, cy, r, start);
  const endPt = polarToCartesian(cx, cy, r, end);
  const largeArc = end - start > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${startPt.x} ${startPt.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`,
    'Z',
  ].join(' ');
}

export function PieChart({
  data,
  size = 150,
}: {
  data: Slice[];
  size?: number;
}) {
  const total = useMemo(() => data.reduce((s, d) => s + (d.value > 0 ? d.value : 0), 0), [data]);

  const r = size / 2;
  const cx = r;
  const cy = r;

  if (total <= 0) {
    return (
      <View style={styles.wrap}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r - 2} fill={colors.background.tertiary} />
        </Svg>
        <Text style={styles.empty}>No data</Text>
      </View>
    );
  }

  let a = -Math.PI / 2; // start at top

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <G>
          {data
            .filter((d) => d.value > 0)
            .map((d, idx) => {
              const span = (d.value / total) * Math.PI * 2;
              const start = a;
              const end = a + span;
              a = end;

              const path = describeArcWedge(cx, cy, r - 2, start, end);

              // IMPORTANT: label may repeat (e.g., real "Other" category + grouped "Other")
              // so use a stable unique key.
              return <Path key={`${d.label}-${idx}`} d={path} fill={d.color} />;
            })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  empty: {
    marginTop: spacing.sm,
    color: colors.text.tertiary,
    fontSize: typography.sizes.sm,
  },
});