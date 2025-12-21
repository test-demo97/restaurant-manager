/* eslint-disable react-refresh/only-export-components */
import { useCurrency } from '../../hooks/useCurrency';

interface PriceProps {
  amount: number;
  className?: string;
}

export function Price({ amount, className = '' }: PriceProps) {
  const { formatPrice } = useCurrency();
  return <span className={className}>{formatPrice(amount)}</span>;
}

// Re-export usePrice from hooks for backward compatibility
export { usePrice } from '../../hooks/usePrice';
