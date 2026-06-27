// UI/UX State Management Agent — theme, language, notification prefs, toasts.
// Persisted preferences are hydrated from AsyncStorage on startup via Zustand
// persist middleware with versioned migrations.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { BOUNTY_CATEGORIES, type BountyCategory } from '@/src/types';

const UI_STORAGE_KEY = 'garap.ui.v1';

export type ThemeMode = 'dark'; // Garap is dark/violet only (OLED-optimized)
export type Language = 'en' | 'id';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type NotificationCategories = Record<BountyCategory, boolean>;

function allCategoriesEnabled(): NotificationCategories {
  return BOUNTY_CATEGORIES.reduce((acc, c) => {
    acc[c] = true;
    return acc;
  }, {} as NotificationCategories);
}

interface UIState {
  theme: ThemeMode;
  language: Language;
  notificationsEnabled: boolean;
  notificationCategories: NotificationCategories;
  onboardingComplete: boolean;
  toasts: ToastMessage[];

  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  toggleNotifications: () => void;
  setNotificationCategory: (category: BountyCategory, enabled: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  showToast: (toast: Omit<ToastMessage, 'id'>, id: string) => void;
  dismissToast: (id: string) => void;
  /** Rehydrate persisted UI preferences from AsyncStorage. Kept for callers. */
  hydrate: () => Promise<void>;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      notificationsEnabled: true,
      notificationCategories: allCategoriesEnabled(),
      onboardingComplete: false,
      toasts: [],

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      toggleNotifications: () =>
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      setNotificationCategory: (category, enabled) =>
        set((state) => ({
          notificationCategories: { ...state.notificationCategories, [category]: enabled },
        })),
      setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
      showToast: (toast, id) =>
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] })),
      dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      // Rehydration is handled automatically by zustand persist middleware;
      // this no-op remains for backward compatibility with existing callers.
      hydrate: async () => {},
    }),
    {
      name: UI_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState, version) => {
        // Merge defaults so new fields don't break old cached prefs.
        const prefs = (persistedState ?? {}) as Partial<UIState>;
        const base = {
          theme: 'dark',
          language: 'en',
          notificationsEnabled: true,
          notificationCategories: allCategoriesEnabled(),
          onboardingComplete: false,
          toasts: [] as ToastMessage[],
        };

        if (version === 0) {
          // Legacy custom-persisted shape used the same fields.
        }

        return {
          ...base,
          theme: prefs.theme ?? base.theme,
          language: prefs.language ?? base.language,
          notificationsEnabled: prefs.notificationsEnabled ?? base.notificationsEnabled,
          notificationCategories: {
            ...base.notificationCategories,
            ...(prefs.notificationCategories ?? {}),
          },
          onboardingComplete: prefs.onboardingComplete ?? base.onboardingComplete,
        } as UIState;
      },
      // Transient toasts should never be persisted.
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        notificationsEnabled: state.notificationsEnabled,
        notificationCategories: state.notificationCategories,
        onboardingComplete: state.onboardingComplete,
      }),
    }
  )
);
