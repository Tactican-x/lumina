/**
 * useEnergy Hook
 * Hook for energy tracking and phase detection
 */

import { useCallback, useEffect, useState } from 'react';
import { EnergyPhase, EnergyLog } from '@/types';
import * as energyRepo from '@/db/repositories/energy';
import { energyPhases, getPhaseFromScore } from '@/constants/energyPhases';

interface EnergyState {
  currentScore: number;
  currentPhase: EnergyPhase;
  isEstimated: boolean;
  lastLoggedAt: Date | null;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export function useEnergy() {
  const [state, setState] = useState<EnergyState>({
    currentScore: 60,
    currentPhase: 'analytical',
    isEstimated: true,
    lastLoggedAt: null,
    trend: 'stable',
    trendPercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnergy = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [current, trend] = await Promise.all([
        energyRepo.getCurrentEnergy(),
        energyRepo.getEnergyTrend(7),
      ]);

      setState({
        currentScore: current.score,
        currentPhase: current.phase,
        isEstimated: current.isEstimated,
        lastLoggedAt: current.lastLoggedAt,
        trend: trend.direction,
        trendPercent: trend.changePercent,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch energy');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchEnergy();

    // Refresh every 15 minutes
    const interval = setInterval(fetchEnergy, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEnergy]);

  const logEnergy = useCallback(async (
    score: number,
    factors?: EnergyLog['factors'],
    note?: string
  ) => {
    try {
      await energyRepo.logEnergy(score, factors, note);
      await fetchEnergy();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log energy');
      throw err;
    }
  }, [fetchEnergy]);

  const getPhaseInfo = useCallback(() => {
    return energyPhases[state.currentPhase];
  }, [state.currentPhase]);

  return {
    // State
    ...state,
    isLoading,
    error,

    // Actions
    refresh: fetchEnergy,
    logEnergy,

    // Helpers
    phaseInfo: getPhaseInfo(),
    phaseConfig: energyPhases,
  };
}

/**
 * Hook for energy patterns and analytics
 */
export function useEnergyPatterns() {
  const [hourlyPattern, setHourlyPattern] = useState<{
    hour: number;
    avgScore: number;
    sampleSize: number;
  }[]>([]);
  const [peakHours, setPeakHours] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPatterns = async () => {
      setIsLoading(true);

      try {
        const [hourly, peaks] = await Promise.all([
          energyRepo.getEnergyByHour(30),
          energyRepo.getPeakEnergyHours(30),
        ]);

        setHourlyPattern(hourly);
        setPeakHours(peaks);
      } catch (err) {
        console.error('Failed to fetch energy patterns:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatterns();
  }, []);

  return {
    hourlyPattern,
    peakHours,
    isLoading,
    hasPeakNow: peakHours.includes(new Date().getHours()),
  };
}

/**
 * Hook for energy logging modal
 */
export function useEnergyLogger() {
  const [isLogging, setIsLogging] = useState(false);
  const [score, setScore] = useState(60);
  const [factors, setFactors] = useState<EnergyLog['factors']>({});
  const [note, setNote] = useState('');

  const reset = useCallback(() => {
    setScore(60);
    setFactors({});
    setNote('');
  }, []);

  const submit = useCallback(async () => {
    setIsLogging(true);

    try {
      await energyRepo.logEnergy(score, factors, note || undefined);
      reset();
      return true;
    } catch (err) {
      console.error('Failed to log energy:', err);
      return false;
    } finally {
      setIsLogging(false);
    }
  }, [score, factors, note, reset]);

  return {
    score,
    setScore,
    factors,
    setFactors,
    note,
    setNote,
    isLogging,
    submit,
    reset,
  };
}
