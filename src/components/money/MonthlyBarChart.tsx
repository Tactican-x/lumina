import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { colors, spacing, typography } from '@/constants/theme';
import { monthKeyToDate } from '@/lib/money/money';

export type MonthBarPoint = {
  monthKey: string;
  incomeCents: number;
  expenseCents: number;
};

function monthShort(monthKey: string) {
  const d = monthKeyToDate(monthKey);
  return d.toLocaleDateString('en-US', { month: 'short' });
}

export function MonthlyBarChart({
  series,
  height = 140,
}: {
  series: MonthBarPoint[];
  height?: number;
}) {
  const [w, setW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setW(Math.floor(e.nativeEvent.layout.width));
  };

  const maxVal = useMemo(() => {
    let m = 0;
    for (const p of series) {
      m = Math.max(m, p.incomeCents, p.expenseCents);
    }
    return m;
  }, [series]);

  const chartH = height;
  const padTop = 10;
  const padBottom = 26;
  const padX = 10;
  const usableH = Math.max(10, chartH - padTop - padBottom);

  // Each month group has 2 bars (income+expense)
  const groupCount = Math.max(1, series.length);
  const groupW = w > 0 ? (w - padX * 2) / groupCount : 0;
  const barW = Math.max(6, groupW * 0.28);
  const gap = Math.max(4, groupW * 0.10);

  const scale = (v: number) => {
    if (maxVal <= 0) return 0;
    return (v / maxVal) * usableH;
  };

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      {w <= 0 ? null : (
        <Svg width={w} height={chartH}>
          {/* baseline */}
          <Line
            x1={padX}
            y1={padTop + usableH}
            x2={w - padX}
            y2={padTop + usableH}
            stroke={colors.border.dark}
            strokeWidth={1}
          />

          {series.map((p, idx) => {
            const groupX = padX + idx * groupW;

            const incH = scale(p.incomeCents);
            const expH = scale(p.expenseCents);

            const yBase = padTop + usableH;

            const incX = groupX + groupW / 2 - barW - gap / 2;
            const expX = groupX + groupW / 2 + gap / 2;

            const label = monthShort(p.monthKey);

            return (
              <React.Fragment key={p.monthKey}>
                {/* income */}
                <Rect
                  x={incX}
                  y={yBase - incH}
                  width={barW}
                  height={incH}
                  rx={4}
                  fill={colors.success?.light ?? colors.brand.primary}
                  opacity={0.9}
                />
                {/* expense */}
                <Rect
                  x={expX}
                  y={yBase - expH}
                  width={barW}
                  height={expH}
                  rx={4}
                  fill={colors.danger.main}
                  opacity={0.85}
                />

                <SvgText
                  x={groupX + groupW / 2}
                  y={chartH - 8}
                  fontSize={10}
                  fill={colors.text.tertiary}
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.success?.light ?? colors.brand.primary }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.danger.main }]} />
          <Text style={styles.legendText}>Expenses</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  legend: { flexDirection: 'row', gap: 14, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.text.tertiary, fontSize: typography.sizes.xs },
});