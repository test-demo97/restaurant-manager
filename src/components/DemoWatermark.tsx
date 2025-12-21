/**
 * Watermark per la versione DEMO
 *
 * Mostra un banner fisso in alto quando l'app è in modalità demo.
 * Il banner indica che le modifiche non sono consentite.
 */

import { usePlanFeatures } from '../hooks/usePlanFeatures';
import { Eye } from 'lucide-react';

export function DemoWatermark() {
  const { isDemo } = usePlanFeatures();

  if (!isDemo) return null;

  return (
    <div className="fixed top-0 left-14 lg:left-0 right-0 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-1.5 lg:py-2 shadow-lg">
      <div className="flex items-center justify-center gap-1 lg:gap-2">
        <Eye className="w-3 h-3 lg:w-4 lg:h-4" />
        <span className="text-xs lg:text-sm font-semibold">
          <span className="hidden sm:inline">VERSIONE DEMO - Solo visualizzazione, le modifiche non verranno salvate</span>
          <span className="sm:hidden">DEMO - Solo visualizzazione</span>
        </span>
        <Eye className="w-3 h-3 lg:w-4 lg:h-4 hidden sm:block" />
      </div>
    </div>
  );
}
