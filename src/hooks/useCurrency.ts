import { useState, useEffect, useCallback } from 'react';
import { getSettings } from '../lib/database';

interface CurrencyConfig {
  symbol: string;
  position: 'before' | 'after';
  decimals: number;
}

const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  '€': { symbol: '€', position: 'before', decimals: 2 },
  '$': { symbol: '$', position: 'before', decimals: 2 },
  '£': { symbol: '£', position: 'before', decimals: 2 },
};

const DEFAULT_CURRENCY = '€';

export function useCurrency() {
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  const loadCurrency = useCallback(async () => {
    try {
      const settings = await getSettings();
      setCurrency(settings.currency || DEFAULT_CURRENCY);
    } catch (error) {
      console.error('Error loading currency:', error);
      setCurrency(DEFAULT_CURRENCY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrency();

    // Ascolta i cambiamenti delle impostazioni
    const handleSettingsUpdate = (event: CustomEvent) => {
      if (event.detail?.currency) {
        setCurrency(event.detail.currency);
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate as EventListener);
    };
  }, [loadCurrency]);

  const formatPrice = useCallback((amount: number): string => {
    const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS[DEFAULT_CURRENCY];
    const formattedAmount = amount.toFixed(config.decimals);

    if (config.position === 'before') {
      return `${config.symbol}${formattedAmount}`;
    } else {
      return `${formattedAmount}${config.symbol}`;
    }
  }, [currency]);

  const getCurrencySymbol = useCallback((): string => {
    return currency;
  }, [currency]);

  return {
    currency,
    loading,
    formatPrice,
    getCurrencySymbol,
    reload: loadCurrency,
  };
}

// Hook singleton per condividere lo stato tra componenti
let globalCurrency = DEFAULT_CURRENCY;
const listeners: Set<(currency: string) => void> = new Set();

export function getGlobalCurrency(): string {
  return globalCurrency;
}

export function setGlobalCurrency(currency: string) {
  globalCurrency = currency;
  listeners.forEach(listener => listener(currency));
}

// Inizializza la valuta globale all'avvio
getSettings().then(settings => {
  globalCurrency = settings.currency || DEFAULT_CURRENCY;
}).catch(() => {
  globalCurrency = DEFAULT_CURRENCY;
});

// Ascolta i cambiamenti delle impostazioni a livello globale
if (typeof window !== 'undefined') {
  window.addEventListener('settings-updated', ((event: CustomEvent) => {
    if (event.detail?.currency) {
      setGlobalCurrency(event.detail.currency);
    }
  }) as EventListener);
}

// Funzione helper per formattare i prezzi senza hook
export function formatPriceWithCurrency(amount: number, currency?: string): string {
  const curr = currency || globalCurrency;
  const config = CURRENCY_CONFIGS[curr] || CURRENCY_CONFIGS[DEFAULT_CURRENCY];
  const formattedAmount = amount.toFixed(config.decimals);

  if (config.position === 'before') {
    return `${config.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount}${config.symbol}`;
  }
}
