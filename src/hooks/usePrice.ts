import { useCurrency } from './useCurrency';

// Versione inline per uso in stringhe template
export function usePrice() {
  const { formatPrice, getCurrencySymbol } = useCurrency();
  return { formatPrice, getCurrencySymbol };
}
