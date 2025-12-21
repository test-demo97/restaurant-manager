/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getSettings, updateSettings } from '../lib/database';

export interface SmacContextType {
  smacEnabled: boolean;
  setSmacEnabled: (enabled: boolean) => Promise<void>;
  loading: boolean;
}

export const SmacContext = createContext<SmacContextType | null>(null);

export function SmacProvider({ children }: { children: ReactNode }) {
  const [smacEnabled, setSmacEnabledState] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSmacSetting();
  }, []);

  async function loadSmacSetting() {
    try {
      const settings = await getSettings();
      // Default to true if not set (backwards compatibility)
      setSmacEnabledState(settings.smac_enabled ?? true);
    } catch (error) {
      console.error('Error loading SMAC setting:', error);
      setSmacEnabledState(true); // Default to enabled on error
    } finally {
      setLoading(false);
    }
  }

  const setSmacEnabled = useCallback(async (enabled: boolean) => {
    try {
      await updateSettings({ smac_enabled: enabled });
      setSmacEnabledState(enabled);
    } catch (error) {
      console.error('Error saving SMAC setting:', error);
      throw error;
    }
  }, []);

  return (
    <SmacContext.Provider value={{ smacEnabled, setSmacEnabled, loading }}>
      {children}
    </SmacContext.Provider>
  );
}

// Re-export useSmac from hooks for backward compatibility
export { useSmac } from '../hooks/useSmac';
