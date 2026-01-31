/**
 * EnergyPhase Component
 * Current energy phase display with recommendations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Brain,
  Sparkles,
  Calculator,
  Battery,
  Users,
  Moon,
  ChevronRight,
  Zap,
} from '@/components/ui/Lucide';
import { EnergyPhase as EnergyPhaseType } from '@/types';
import { energyPhases, EnergyPhaseConfig } from '@/constants/energyPhases';
import { Card } from '@/components/ui/Card';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface EnergyPhaseProps {
  phase: EnergyPhaseType;
  score: number;
  isEstimated?: boolean;
  onPress?: () => void;
  onLogEnergy?: () => void;
  showTips?: boolean;
}

const phaseIcons: Record<EnergyPhaseType, typeof Brain> = {
  peak_cognitive: Brain,
  creative_flow: Sparkles,
  analytical: Calculator,
  recovery: Battery,
  social: Users,
  rest: Moon,
};

export function EnergyPhaseDisplay({
  phase,
  score,
  isEstimated = false,
  onPress,
  onLogEnergy,
  showTips = true,
}: EnergyPhaseProps) {
  const config = energyPhases[phase];
  const Icon = phaseIcons[phase];

  return (
    <Card variant="default" padding="none" style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
        {/* Gradient header */}
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Icon size={24} color="#fff" />
            </View>

            <View style={styles.phaseInfo}>
              <Text style={styles.phaseName}>{config.name}</Text>
              <Text style={styles.phaseDescription} numberOfLines={1}>
                {config.description}
              </Text>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={styles.score}>{score}%</Text>
              {isEstimated && (
                <Text style={styles.estimated}>estimated</Text>
              )}
            </View>
          </View>

          {/* Energy bar */}
          <View style={styles.energyBarContainer}>
            <View style={[styles.energyBar, { width: `${score}%` }]} />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Tips */}
      {showTips && config.tips.length > 0 && (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>💡 Best for right now:</Text>
          {config.tips.slice(0, 2).map((tip, index) => (
            <Text key={index} style={styles.tip}>
              • {tip}
            </Text>
          ))}
        </View>
      )}

      {/* Log energy button */}
      {isEstimated && onLogEnergy && (
        <TouchableOpacity onPress={onLogEnergy} style={styles.logButton}>
          <Zap size={14} color={config.gradient[0]} />
          <Text style={[styles.logButtonText, { color: config.gradient[0] }]}>
            Log your actual energy
          </Text>
          <ChevronRight size={14} color={config.gradient[0]} />
        </TouchableOpacity>
      )}
    </Card>
  );
}

// Compact energy indicator
export function EnergyIndicator({
  phase,
  score,
  onPress,
}: {
  phase: EnergyPhaseType;
  score: number;
  onPress?: () => void;
}) {
  const config = energyPhases[phase];
  const Icon = phaseIcons[phase];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.indicatorContainer}
    >
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.indicator}
      >
        <Icon size={16} color="#fff" />
        <Text style={styles.indicatorScore}>{score}%</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Phase selector for manual logging
export function PhaseSelector({
  selectedPhase,
  onSelect,
}: {
  selectedPhase: EnergyPhaseType;
  onSelect: (phase: EnergyPhaseType) => void;
}) {
  const phases = Object.entries(energyPhases) as [EnergyPhaseType, EnergyPhaseConfig][];

  return (
    <View style={styles.selectorContainer}>
      {phases.map(([id, config]) => {
        const Icon = phaseIcons[id];
        const isSelected = id === selectedPhase;

        return (
          <TouchableOpacity
            key={id}
            onPress={() => onSelect(id)}
            style={[
              styles.selectorItem,
              isSelected && { backgroundColor: `${config.gradient[0]}20` },
            ]}
          >
            <View
              style={[
                styles.selectorIcon,
                { backgroundColor: isSelected ? config.gradient[0] : colors.background.elevated },
              ]}
            >
              <Icon size={18} color={isSelected ? '#fff' : colors.text.tertiary} />
            </View>
            <Text
              style={[
                styles.selectorLabel,
                isSelected && { color: config.gradient[0] },
              ]}
            >
              {config.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  header: {
    padding: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: '#fff',
    marginBottom: 2,
  },
  phaseDescription: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  estimated: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  energyBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  energyBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: borderRadius.full,
  },
  tips: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  tipsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  tip: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    gap: spacing.xs,
  },
  logButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  // Indicator
  indicatorContainer: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  indicatorScore: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },

  // Selector
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectorItem: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 70,
  },
  selectorIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  selectorLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
