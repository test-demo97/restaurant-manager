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
    <>
      {/* Desktop: banner in alto */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-2 shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-semibold">
            VERSIONE DEMO - Solo visualizzazione, le modifiche non verranno salvate
          </span>
          <Eye className="w-4 h-4" />
        </div>
      </div>

      {/* Mobile: badge in basso a destra */}
      <div className="lg:hidden fixed bottom-20 right-3 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full shadow-lg">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          <span className="text-xs font-semibold">DEMO</span>
        </div>
      </div>
    </>
  );
}
