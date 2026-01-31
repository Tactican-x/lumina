/**
 * UI Store
 * Global state for UI elements, modals, and app-wide settings
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'dark' | 'light' | 'system';
export type TabName = 'home' | 'goals' | 'insights' | 'codex';

interface ModalState {
  isOpen: boolean;
  type: string | null;
  data: Record<string, unknown> | null;
}

interface ToastState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Navigation
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;

  // Modal
  modal: ModalState;
  openModal: (type: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Toast
  toast: ToastState;
  showToast: (message: string, type?: ToastState['type'], duration?: number) => void;
  hideToast: () => void;

  // Loading overlay
  isGlobalLoading: boolean;
  globalLoadingMessage: string | null;
  showGlobalLoading: (message?: string) => void;
  hideGlobalLoading: () => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  // App state
  isFirstLaunch: boolean;
  lastActiveDate: string | null;
  setLastActiveDate: (date: string) => void;

  // Feature flags
  showScientificDetails: boolean;
  setShowScientificDetails: (show: boolean) => void;
  enableHaptics: boolean;
  setEnableHaptics: (enable: boolean) => void;
  enableSounds: boolean;
  setEnableSounds: (enable: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // Navigation
      activeTab: 'home',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Modal
      modal: {
        isOpen: false,
        type: null,
        data: null,
      },
      openModal: (type, data = {}) =>
        set({
          modal: {
            isOpen: true,
            type,
            data,
          },
        }),
      closeModal: () =>
        set({
          modal: {
            isOpen: false,
            type: null,
            data: null,
          },
        }),

      // Toast
      toast: {
        isVisible: false,
        message: '',
        type: 'info',
        duration: 3000,
      },
      showToast: (message, type = 'info', duration = 3000) => {
        set({
          toast: {
            isVisible: true,
            message,
            type,
            duration,
          },
        });

        // Auto-hide after duration
        setTimeout(() => {
          get().hideToast();
        }, duration);
      },
      hideToast: () =>
        set(state => ({
          toast: {
            ...state.toast,
            isVisible: false,
          },
        })),

      // Loading overlay
      isGlobalLoading: false,
      globalLoadingMessage: null,
      showGlobalLoading: (message) =>
        set({
          isGlobalLoading: true,
          globalLoadingMessage: message || null,
        }),
      hideGlobalLoading: () =>
        set({
          isGlobalLoading: false,
          globalLoadingMessage: null,
        }),

      // Onboarding
      hasCompletedOnboarding: false,
      completeOnboarding: () => set({ hasCompletedOnboarding: true, isFirstLaunch: false }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, isFirstLaunch: true }),

      // App state
      isFirstLaunch: true,
      lastActiveDate: null,
      setLastActiveDate: (date) => set({ lastActiveDate: date }),

      // Feature flags
      showScientificDetails: true,
      setShowScientificDetails: (show) => set({ showScientificDetails: show }),
      enableHaptics: true,
      setEnableHaptics: (enable) => set({ enableHaptics: enable }),
      enableSounds: false,
      setEnableSounds: (enable) => set({ enableSounds: enable }),
    }),
    {
      name: 'lumina-ui-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        theme: state.theme,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isFirstLaunch: state.isFirstLaunch,
        lastActiveDate: state.lastActiveDate,
        showScientificDetails: state.showScientificDetails,
        enableHaptics: state.enableHaptics,
        enableSounds: state.enableSounds,
      }),
    }
  )
);

// Selectors for common use cases
export const selectTheme = (state: UIState) => state.theme;
export const selectIsLoading = (state: UIState) => state.isGlobalLoading;
export const selectToast = (state: UIState) => state.toast;
export const selectModal = (state: UIState) => state.modal;
