import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToSettings,
  initializeSettings,
  updateSettings,
} from '../services/settingsService';
import { UserSettings, DEFAULT_SETTINGS } from '../types';

interface SettingsContextValue {
  settings: UserSettings;
  updateSetting: (key: keyof UserSettings, value: unknown) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSetting: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const userId = currentUser?.uid;
    if (!userId) {
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    initializeSettings(userId);
    return subscribeToSettings(userId, setSettings);
  }, [currentUser?.uid]);

  // Apply accessibility settings to the DOM whenever they change
  useEffect(() => {
    const root = document.documentElement;

    // Font size: set as a percentage on <html> so all rem/em values scale
    root.style.fontSize = `${settings.fontSize}%`;

    // Reduced motion: data attribute consumed by CSS
    if (settings.reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-reduced-motion');
    }

    // High contrast: data attribute consumed by CSS
    if (settings.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }

    // Screen reader mode: data attribute for enhanced ARIA and simplified layouts
    if (settings.screenReaderMode) {
      root.setAttribute('data-screen-reader', 'true');
    } else {
      root.removeAttribute('data-screen-reader');
    }
  }, [settings.fontSize, settings.reducedMotion, settings.highContrast, settings.screenReaderMode]);

  async function updateSetting(key: keyof UserSettings, value: unknown) {
    const userId = currentUser?.uid;
    if (!userId) return;
    await updateSettings(userId, { [key]: value });
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
